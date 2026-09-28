// b3: T3-P7B
// b3: T3-P8
/**
 * [T3-P7B] TimelineYears —— 年/月/卡渲染体（LineageTimeline 拆件——组件
 * 250 行红线；纯展示：分组遍历+编号/核徽章/选中/砖砌/拾取源高亮全经 props，
 * 交互回调沿 TimelineCallbacks 透传）。
 * [T3-P8] 槽位拖拽渲染：dragSlot 在场时源月组按「其余卡+拖卡@insertIdx」
 * 渲染——active=拖起（.drag-slot「置 入」占位+拖卡尾挂 .dragging
 * fixed 离流+框外 .faded 淡化）；!active=settle 落位（卡回流@insertIdx，
 * FLIP 飞行由 useCardDrag 命令式接管）。月组框 ref 注册（几何源）+改月
 * 飞行目标框 .flash 高亮。
 */
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react'
import type { LineageNode } from '@shared/models/lineage'
import type { LineagePaperMetrics } from '@shared/ipc/schemas'
import type { TimelineYearGroup } from './lineage-timeline'
import { frameKeyOf } from './lineage-timeline'
import { LineageTimelineCard } from './LineageTimelineCard'
import type { DragSlotPreview } from './useCardDrag'
import type { TimelineCallbacks } from './LineageTimeline'

/** [T3-P7A] 图例四基础型（D-18 映射序：accent 实/accent 虚/faint 点/signal 虚） */
const LEGEND_ITEMS = [
  { cls: 'lc', text: '继承' },
  { cls: 'lc i2', text: '推断' },
  { cls: 'lc i3', text: '综述关联' },
  { cls: 'lc i4', text: '人工补线' }
] as const

/** [T3-P8] 图例挂滚动容器 .timeline（视口级恒可见）——自 Timeline 下沉
 *  （组件 250 行红线拆件同族；纯展示零状态） */
export function TimelineLegend(): JSX.Element {
  return (
    <div className="tl-legend">
      {LEGEND_ITEMS.map((it) => (
        <span className={it.cls} key={it.text}>
          <i />
          {it.text}
        </span>
      ))}
    </div>
  )
}

export function TimelineYears(props: {
  groups: TimelineYearGroup[]
  /** INV-76 编号单源（Timeline useMemo 全图一次） */
  catalogNos: Map<string, number>
  /** 核心档预计算（classify.isCore 单源） */
  coreIds: Map<string, boolean>
  paperMetrics: Record<string, LineagePaperMetrics>
  selectedNodeId: string | null
  shiftedIds: ReadonlySet<string>
  /** [T3-P7B] 拾取源卡高亮（composer target 相位） */
  linkSourceId: string | null
  /** [T3-P8] 拖拽槽位预览（active/settle 两相位——见头注） */
  dragSlot?: DragSlotPreview | null
  /** [T3-P8] 月组框注册（useCardDrag 几何源——框包含/槽位计算） */
  registerFrame?: (key: string, el: HTMLDivElement | null) => void
  /** [T3-P8] 改月飞行目标框高亮（.flash——框高亮动画） */
  flashKey?: string | null
  onCardClick: NonNullable<TimelineCallbacks['onNodeClick']>
  onCardPointerDown?: (nodeId: string, ev: ReactPointerEvent<HTMLElement>) => void
  onYmClick?: (nodeId: string, ev: ReactMouseEvent<HTMLElement>) => void
} & Pick<TimelineCallbacks, 'onNodeContextMenu'>): JSX.Element {
  const { groups, catalogNos, coreIds, paperMetrics } = props
  const slot = props.dragSlot ?? null
  const renderCard = (n: LineageNode, dragging: boolean): JSX.Element => (
    <LineageTimelineCard
      key={n.id}
      node={n}
      no={catalogNos.get(n.id) ?? 0}
      core={coreIds.get(n.id) === true}
      metrics={n.paperId !== null ? (paperMetrics[n.paperId] ?? null) : null}
      selected={props.selectedNodeId === n.id}
      shift={props.shiftedIds.has(n.id)}
      linkSrc={props.linkSourceId === n.id}
      dragging={dragging}
      onNodeClick={props.onCardClick}
      onNodeContextMenu={props.onNodeContextMenu}
      onCardPointerDown={props.onCardPointerDown}
      onYmClick={props.onYmClick}
    />
  )
  return (
    <>
      {groups.map((g) => {
        const yearCount = g.months.reduce((sum, m) => sum + m.nodes.length, 0)
        return (
          <section
            className="tl-year"
            key={g.year === null ? 'null' : String(g.year)}
            data-year={g.year === null ? 'null' : g.year}
          >
            <div className="tl-year-head">
              {/* 年份头数字无「年」字（mockup 纯数字）；null 年=「未知年份」 */}
              <span className="tl-year-num">{g.year === null ? '未知年份' : g.year}</span>
              <span className="tl-year-meta">{yearCount} 篇</span>
            </div>
            {g.months.map((m) => {
              const key = frameKeyOf(g.year, m.month)
              const isSrc = slot !== null && slot.srcKey === key
              let kids: JSX.Element[] = []
              if (isSrc && slot !== null) {
                const others = m.nodes.filter((n) => n.id !== slot.nodeId)
                const dragged = m.nodes.find((n) => n.id === slot.nodeId)
                const i = Math.min(slot.insertIdx, others.length)
                kids = others.slice(0, i).map((n) => renderCard(n, false))
                if (slot.active) {
                  kids.push(
                    <div
                      className={slot.overFrame ? 'drag-slot' : 'drag-slot faded'}
                      key="__drag_ph"
                    >
                      置 入
                    </div>
                  )
                } else if (dragged !== undefined) {
                  kids.push(renderCard(dragged, false))
                }
                kids.push(...others.slice(i).map((n) => renderCard(n, false)))
                if (slot.active && dragged !== undefined) {
                  kids.push(renderCard(dragged, true)) // 拖起=尾挂（.dragging fixed 离流）
                }
              } else {
                kids = m.nodes.map((n) => renderCard(n, false))
              }
              const frameCls = props.flashKey === key ? 'month-frame flash' : 'month-frame'
              return (
                <div
                  className={m.month === null ? 'tl-month unknown' : 'tl-month'}
                  key={m.month === null ? 'null' : String(m.month)}
                >
                  {/* 月标签与月框=兄弟（d1-B1 回炉：框 overflow:hidden 裁悬出段） */}
                  <span className="month-tag">
                    {m.month === null
                      ? `未定月 · ${m.nodes.length} 篇`
                      : `${m.month} 月 · ${m.nodes.length} 篇`}
                  </span>
                  <div
                    className={frameCls}
                    ref={(el) => {
                      props.registerFrame?.(key, el)
                    }}
                  >
                    {kids}
                  </div>
                </div>
              )
            })}
          </section>
        )
      })}
    </>
  )
}
