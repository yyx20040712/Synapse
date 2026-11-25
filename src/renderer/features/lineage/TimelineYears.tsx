// b3: T3-P7B/T3-P8
// b3: B3 commit A 纯拆件（2026-11-22）：月框件=TimelineMonthFrame.tsx（月标+extend 类+foster row 编排
// +DragCandidates 接线）、卡行件=TimelineCardRow.tsx（行渲染+odd 相位类+dragTail 挂载）——行为零变。
// b3: B3 commit B 子波 2（§8）：renderCard useCallback 稳定+slot 只传源月框（isSrc 判定前移宿主——非源框 props 恒定=memo 跳过）。
/**
 * [T3-P7B] TimelineYears —— 年/月/卡渲染编排（LineageTimeline 拆件——组件
 * 250 行红线；纯展示：分组遍历+编号/选中/拾取源高亮全经 props，交互回调沿
 * TimelineCallbacks 透传；本件=年段 map+月 map 编排+props 透传，月框渲染体
 * 见 TimelineMonthFrame）。
 * [F-SLOTGRID-01 U1] 月框行容器化：.month-frame 内平铺卡改 .tl-row 网格分行
 * （capacity.ts partitionRows 单源；W=宿主 frameW prop——unmeasured〔0〕降级
 * 全部卡入首行单行，DOM 序不变）；瀑布错位 offsets prop 链随瀑布退役删除。
 * [F-UIRES-03 C3] 改月飞行 flash 高亮+月标点击回调随改月链退役删除
 * （INV-107）；[F 项搭车] 头注「fixed 离流」陈旧句改写（absolute 含块=.month-frame——session 头注）。
 * [B5 设计稿 §4.1/§4.2 第 3 条/§11.2——wave C 2026-11-25 断言翻转] 聚焦无 dim：删 bright 邻接集入参与 dim 激活
 *   两个 props 与卡的 dim 入参（原「非 bright 卡挂 dim 类」退役）；focusIds 保留=调用方按模式门控后的 accent 集。
 *   空图（零分组）照常渲染=零年段节点（不为空图另造文案——LineageTimeline 头注）。
 */
import { useCallback } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { LineageNode } from '@shared/models/lineage'
import type { LineagePaperMetrics } from '@shared/ipc/schemas'
import { frameKeyOf, type TimelineYearGroup } from './lineage-timeline'
import { LineageTimelineCard } from './LineageTimelineCard'
import { TimelineMonthFrame } from './TimelineMonthFrame'
import type { DragSlotPreview } from './useCardDrag'
import type { TimelineCallbacks } from './timeline-interactions'

// [B3 §8] 缺省空表=模块级常量（引用稳定——renderCard deps 每渲染新对象会击穿 memo）
const EMPTY_TAGS: Record<string, string[]> = {}

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
  /** [F-SLOTGRID-01 U1] 月框内容宽（use-capacity-layout 量测；0=unmeasured
   *  降级=全部卡入首行单行——jsdom/空图同态） */
  frameW: number
  /** [T3-P8] 拖拽槽位预览（active/settle 两相位——见 TimelineMonthFrame 头注） */
  dragSlot?: DragSlotPreview | null
  /** [F-LGRAPH-01①U5] P-8 聚焦集（仅被点卡 accent 边框——本集沿承不扩邻接） */
  focusIds?: ReadonlySet<string>
  onCardClick: NonNullable<TimelineCallbacks['onNodeClick']>
  /** [F-STAR-01 A3 点亮] 星标区点击（三模式均 toggle——宿主 toggleNodeStar） */
  onCardStarClick?: (nodeId: string) => void
  onCardPointerDown?: (nodeId: string, ev: ReactPointerEvent<HTMLElement>) => void
  /** [F-UIRES-03 B5①] 卡面两钮传 props 随迁移退役删除（消费面=SidePanel 操作行） */
} & Pick<TimelineCallbacks, 'onNodeContextMenu'>): JSX.Element {
  const { groups, pubNos, paperMetrics } = props
  const tagNames = props.tagNames ?? EMPTY_TAGS
  const slot = props.dragSlot ?? null
  // [B3 §8] 卡面构造稳定化（useCallback——引用跨渲染恒定=TimelineMonthFrame
  // memo 判定面；deps=构造闭包读的全部 props）
  const renderCard = useCallback(
    (n: LineageNode, dragging: boolean): JSX.Element => (
      <LineageTimelineCard
        key={n.id}
        node={n}
        no={pubNos.get(n.id) ?? 0}
        metrics={n.paperId !== null ? (paperMetrics[n.paperId] ?? null) : null}
        tagNames={tagNames}
        selected={props.selectedNodeId === n.id}
        ctx={props.ctxNodeId === n.id}
        focused={props.focusIds?.has(n.id) === true}

        dragging={dragging}
        onNodeClick={props.onCardClick}
        onNodeContextMenu={props.onNodeContextMenu}
        onStarClick={props.onCardStarClick}
        onCardPointerDown={props.onCardPointerDown}
      />
    ),
    [pubNos, paperMetrics, tagNames, props.selectedNodeId, props.ctxNodeId, props.focusIds, props.onCardClick, props.onCardStarClick, props.onCardPointerDown, props.onNodeContextMenu]
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
              // [B3 §8] isSrc 判定前移宿主：slot 只传源月框（非源框恒 null——
              // slot 瞬态变化只重渲染源月框子树，memo shallow 比较即跳过其余框）
              const monthKey = frameKeyOf(g.year, m.month)
              return (
                <TimelineMonthFrame
                  key={m.month === null ? 'null' : String(m.month)}
                  year={g.year}
                  month={m.month}
                  nodes={m.nodes}
                  slot={slot !== null && slot.srcKey === monthKey ? slot : null}
                  frameW={props.frameW}
                  renderCard={renderCard}
                />
              )
            })}
          </section>
        )
      })}
    </>
  )
}
