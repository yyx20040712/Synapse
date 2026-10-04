// b3: T3-P7B
// b3: T3-P8
/**
 * [T3-P7B] TimelineYears —— 年/月/卡渲染体（LineageTimeline 拆件——组件
 * 250 行红线；纯展示：分组遍历+编号/核徽章/选中/瀑布错位/拾取源高亮全经
 *  props，交互回调沿 TimelineCallbacks 透传）。
 * [T3-P8] 槽位拖拽渲染：dragSlot 在场时源月组按「其余卡+拖卡@insertIdx」
 * 渲染——active=拖起（.drag-slot「置 入」占位+拖卡尾挂 .dragging
 * fixed 离流+框外 .faded 淡化）；!active=settle 落位（卡回流@insertIdx，
 * FLIP 飞行由 useCardDrag 命令式接管）。改月飞行目标框 .flash 高亮。
 * [lnfix2] 月组框 ref 注册链退役（跨月联动死码）；data-frame-key 属性保留
 * （DragCandidates 查询源——drag-slot-candidates.tsx）。
 */
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react'
import type { LineageNode } from '@shared/models/lineage'
import type { LineagePaperMetrics } from '@shared/ipc/schemas'
import type { TimelineYearGroup } from './lineage-timeline'
import { frameKeyOf } from './lineage-timeline'
import { LineageTimelineCard } from './LineageTimelineCard'
import { DragCandidates } from './drag-slot-candidates'
import type { DragSlotPreview } from './useCardDrag'
import type { TimelineCallbacks } from './LineageTimeline'

/** [F-LGRAPH-01②U8] 图例两型（kind 四值体系退役——线型=实线/虚线两态，
 *  色随边内联 color；图例呈示形态语义非数据分类） */
const LEGEND_ITEMS = [
  { cls: 'lc', text: '实线' },
  { cls: 'lc i2', text: '虚线' }
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
  /** [F-FOLDER-01] 节点号单源（Timeline useMemo 一次——值=该文献 pubNo，
  *  INV-92 库级同源；主题节点=0） */
  pubNos: Map<string, number>
  paperMetrics: Record<string, LineagePaperMetrics>
  /** [A1a] 文献库标签名组表（键=paperId——卡标签行数据源[换源]；缺省=空表） */
  tagNames?: Record<string, string[]>
  selectedNodeId: string | null
  /** [②U5] 右键反馈：节点菜单目标卡 accent 描边（.ctx-hlt——菜单关即撤） */
  ctxNodeId?: string | null
  /** [F-LINEAGE-02] 瀑布错位表（nodeId→margin-left px；缺席=无错位） */
  offsets: ReadonlyMap<string, number>
  /** [T3-P7B] 拾取源卡高亮（composer target 相位） */
  linkSourceId: string | null
  /** [T3-P8] 拖拽槽位预览（active/settle 两相位——见头注） */
  dragSlot?: DragSlotPreview | null
  /** [T3-P8] 改月飞行目标框高亮（.flash——框高亮动画） */
  flashKey?: string | null
  /** [F-LGRAPH-01①U5] P-8 聚焦集（仅被点卡 accent 边框） */
  focusIds?: ReadonlySet<string>
  /** [②U7/P-18] 聚焦 dim 激活（集非空）——非聚焦卡挂 .dim（0.3/hover 0.6） */
  dimUnfocused?: boolean
  onCardClick: NonNullable<TimelineCallbacks['onNodeClick']>
  /** [F-LGRAPH-01②U4] 星标区点击（宿主模式分派——edit=选中/browse+focus=no-op） */
  onCardStarClick?: (nodeId: string, ev: ReactMouseEvent<HTMLElement>) => void
  /** [F-LGRAPH-01②U4/A6] 双击卡跳阅读器 */
  onCardDblClick?: (nodeId: string) => void
  onCardPointerDown?: (nodeId: string, ev: ReactPointerEvent<HTMLElement>) => void
  onYmClick?: (nodeId: string, ev: ReactMouseEvent<HTMLElement>) => void
} & Pick<TimelineCallbacks, 'onNodeContextMenu'>): JSX.Element {
  const { groups, pubNos, paperMetrics } = props
  const tagNames = props.tagNames ?? {}
  const slot = props.dragSlot ?? null
  const renderCard = (n: LineageNode, dragging: boolean): JSX.Element => (
    <LineageTimelineCard
      key={n.id}
      node={n}
      no={pubNos.get(n.id) ?? 0}
      metrics={n.paperId !== null ? (paperMetrics[n.paperId] ?? null) : null}
      tagNames={tagNames}
      selected={props.selectedNodeId === n.id}
      ctx={props.ctxNodeId === n.id}
      focused={props.focusIds?.has(n.id) === true}
      dim={props.dimUnfocused === true && props.focusIds?.has(n.id) !== true}
      offset={props.offsets.get(n.id) ?? 0}
      linkSrc={props.linkSourceId === n.id}
      dragging={dragging}
      onNodeClick={props.onCardClick}
      onNodeDblClick={props.onCardDblClick}
      onNodeContextMenu={props.onNodeContextMenu}
      onStarClick={props.onCardStarClick}
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
              // [②U6] 框底缘下拉态（拖过底缘=stretch 框高动画腾新行——.38s 曲线
              // CSS 承载）；候选槽族（faded 多预览）挂源框内
              const stretching = isSrc && slot !== null && slot.active && slot.extend === true
              const frameCls = [
                'month-frame',
                props.flashKey === key ? 'flash' : '',
                stretching ? 'stretch' : ''
              ].filter((c) => c !== '').join(' ')
              return (
                <div
                  className={m.month === null ? 'tl-month unknown' : 'tl-month'}
                  key={m.month === null ? 'null' : String(m.month)}
                >
                  {/* [F-LINEAGE-02 裁决 7/D-L2-2] 月标注入框内首位（框外悬浮
                      堵死框间通道——absolute 不占 flex 槽，顶 padding 18 承载；
                      标签整体在框内=overflow:hidden 无裁切面） */}
                  <div
                    className={frameCls}
                    data-frame-key={key}
                  >
                    <span className="month-tag">
                      {m.month === null
                        ? `未定月 · ${m.nodes.length} 篇`
                        : `${m.month} 月 · ${m.nodes.length} 篇`}
                    </span>
                    {kids}
                    {isSrc && slot !== null && slot.active && (
                      <DragCandidates
                        frameKey={key}
                        nodeId={slot.nodeId}
                        insertIdx={slot.insertIdx}
                        active={slot.active}
                      />
                    )}
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
