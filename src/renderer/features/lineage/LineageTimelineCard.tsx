// b3: T3-P6
/**
 * [T3-P6] LineageTimelineCard —— 时间线文献小卡（[F-LINEAGE-02 ①a] 几何
 * 改版 128×72（原 104×52）；卡内三层 UI 结构归 F-LGRAPH-01 ②——皮肤住
 * theme-lineage.css .tl-card/.c-* 族）。
 *
 * - 三行结构：c-head（骑缝编号 .c-no=「#NNN」三位零填充——catalog_no
 *   INV-76，Timeline 经 lineageCatalogNos 单源传入禁每卡重算+徽章 .mb：
 *   「核」=isCore 预计算传入[accent 底]、「综述」=isSurveyTitle[shared 单源
 *   经 classify re-export，虚线框；主题节点不参与——NodeCard 语义沿承]）/
 *   c-title 题名（title 属性全文 tooltip——HTML 属性值不入 textContent，
 *   e2e getByText strict 单源保持）/c-idea 核心想法（**空串整行不渲染**
 *   无占位——预裁申报）/c-meta 年月+引用两端（7.5px mono）。
 * - 年月呈现：YYYY-MM 补零；month null→年单值字符串；year null→「—」
 *   缺值占位（INV-73 库列同族口径）。
 * - 引用数：paperMetrics[paperId]?.citedByCount（null=从未抓到→「—」）；
 *   主题节点 paperId null→「—」（metrics 形状=LineagePaperMetrics——
 *   Timeline 查表传入，卡内不触 store）。
 * - 交互：onClick 上抛 onNodeClick / onContextMenu 上抛锚点（03 节点菜单）；
 *   sel=inset 1.6px accent 环+hover=accent 边（CSS 面）；瀑布错位=offset
 *   px（Timeline waterfallOffsets 计算传入——inline margin-left 承载）。
 * - data-node-id=e2e/测试结构锚（Canvas g[data-node-id] 同名接缝沿承）。
 */
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react'
import type { LineageNode } from '@shared/models/lineage'
import type { LineagePaperMetrics } from '@shared/ipc/schemas'
import { isSurvey } from './lineage-classify'
import type { TimelineCallbacks } from './LineageTimeline'

/** 年月呈现：YYYY-MM 补零（month null→年单值；year null→「—」缺值占位） */
function yearMonthLabel(n: LineageNode): string {
  if (n.year === null) return '—'
  return n.month === null ? String(n.year) : `${n.year}-${String(n.month).padStart(2, '0')}`
}

export function LineageTimelineCard(props: {
  node: LineageNode
  /** 骑缝编号（INV-76——Timeline 经 lineageCatalogNos 单源全图一次传入） */
  no: number
  /** 核心档（classify.isCore 预计算传入，卡内不自算） */
  core: boolean
  /** 含金量摘要（按 paperId 查表传入；null=主题节点/缺席→引用「—」） */
  metrics: LineagePaperMetrics | null
  selected: boolean
  /** [F-LINEAGE-02] 瀑布错位量 px（0=无错位——waterfallOffsets 传入；P-15：
   *  步 82/节距 148/年内复位——inline margin-left 承载） */
  offset: number
  /** [T3-P7B] 新建连线拾取源高亮（.link-src——composer target 相位） */
  linkSrc: boolean
  /** [T3-P8] 拖起态（.dragging——离文档流随指针+连线层 dimmed 配套视觉） */
  dragging?: boolean
  /** [F-LGRAPH-01①U5] P-8 聚焦视觉：仅被点卡 accent 边框（多卡独立标记） */
  focused?: boolean
  /** [T3-P8] 卡 pointerdown（useCardDrag 拖拽会话入口——5px 阈值内=选中链） */
  onCardPointerDown?: (nodeId: string, ev: ReactPointerEvent<HTMLElement>) => void
  /** [T3-P8] 月标 .c-ym 点击（edit 态改月弹层入口；CSS 显隐+handler 双闸） */
  onYmClick?: (nodeId: string, ev: ReactMouseEvent<HTMLElement>) => void
} & TimelineCallbacks): JSX.Element {
  const n = props.node
  const survey = n.paperId !== null && isSurvey(n.title)
  // data-kind 三值沿承（NodeCard DOM 契约：theme/paper/survey——e2e 与
  // 测试断言面；与 classify 单源判定同式）
  const kind = n.paperId === null ? 'theme' : survey ? 'survey' : 'paper'
  const cited =
    props.metrics !== null && props.metrics.citedByCount !== null
      ? String(props.metrics.citedByCount)
      : '—'
  const cls = [
    'tl-card',
    props.selected ? 'sel' : '',
    props.linkSrc ? 'link-src' : '',
    props.dragging === true ? 'dragging' : '',
    props.focused === true ? 'focused' : ''
  ]
    .filter((c) => c !== '')
    .join(' ')
  // 瀑布错位=按卡 inline（裁决 2 实现自裁：inline style 直传——.rowshift 类退役）
  const style = props.offset > 0 ? { marginLeft: `${props.offset}px` } : undefined
  return (
    <article
      className={cls}
      style={style}
      data-node-id={n.id}
      data-kind={kind}
      onPointerDown={(e) => props.onCardPointerDown?.(n.id, e)}
      onClick={(e) => props.onNodeClick?.(n.id, e)}
      onContextMenu={(e) => {
        e.preventDefault()
        props.onNodeContextMenu?.(n.id, { x: e.clientX, y: e.clientY })
      }}
    >
      <div className="c-head">
        <span className="c-no">#{String(props.no).padStart(3, '0')}</span>
        {props.core && <span className="mb core">核</span>}
        {survey && <span className="mb survey">综述</span>}
      </div>
      <div className="c-title" title={n.title}>
        {n.title}
      </div>
      {n.coreIdea !== '' && <div className="c-idea">{n.coreIdea}</div>}
      <div className="c-meta">
        <span>{yearMonthLabel(n)}</span>
        <span>{cited}</span>
      </div>
      {/* [T3-P8] 月标（mockup L257-258：absolute accent chip——display:none↔
          .editing block；文案「YYYY.M」/未定月形「未 定」；点击=改月弹层） */}
      <span
        className="c-ym"
        data-testid="card-ym"
        title="点击修改所属月份（编辑模式）"
        onClick={(e) => {
          e.stopPropagation()
          props.onYmClick?.(n.id, e)
        }}
      >
        {n.year === null || n.month === null ? '未 定' : `${n.year}.${n.month}`}
      </span>
    </article>
  )
}
