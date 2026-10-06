// b3: T3-P6
/**
 * [F-LGRAPH-01②U4] LineageTimelineCard —— 时间线文献小卡三层结构
 * （[F-LINEAGE-02 ①a] 几何 128×72；卡内 UI=mockup §3.4 二轮定案）。
 *
 * - **L1（高 18）**：星标占位（[P-11/A4] 书页图标线框——静态禁用态：browse/
 *   focus 点击=no-op+title「星标功能即将开放」（F-STAR-01 DB 窗口后启用）；
 *   edit 点星标区=选中卡——onStarClick 上抛宿主按模式分派；命中区 14×14，
 *   T2×T3 仲裁：focus 点星标=仅星标域 no-op 不触发卡身聚焦 toggle——stopProp
 *   隔离两域）→标签紧随（最多 2+溢出「+N」——[A1a 换源] 数据源=tagNames
 *   伴生 map[文献库标签域，键=paperId]；node.tags 脉络私有域退役接替面[卡
 *   渲染零消费——A1b 退役前账]）→骑缝号 ·NNN（INV-92 pubNo——右缘；[F-UIRES-03 B4①] #→·）。
 *   **核 chip 删**（退役行 9：core UI 消费面全退役——数据面留 AI 重做域；
 *   isCore 预计算传卡链随拆）。
 * - **L2**：文献名 2 行 9.3px 截断（line-clamp 2——title 属性全文 tooltip）。
 * - **L3（高 12）**：期刊缩写（venue——faint）+IF（impactFactor——mono
 *   accent）+被引（citedByCount——mono dim「被引 N」）；**三字段全部可选
 *   省略语义**（数据缺席整字段省略渲染，无「—」占位——[②U4] metrics 扩字段
 *   venue/impactFactor 透传，缺席键/''/null 同缺）。
 * - 交互：onClick 上抛 onNodeClick /onContextMenu 上抛锚点；星标 onStarClick。
 *   [F-UIRES-03 C3·v1.7] 卡双击链（onNodeDblClick→跳阅读器）随双击退役删除
 *   （全应用唯一保留双击=详情面板片段条目——B2 终态兑现）；接替=卡面两钮
 *   「去文献库」「去阅读器」（排列整齐——按钮行 hover 呈现/编辑态收钮避让：
 *   拖拽画线交互期按钮区隐藏防误触，机制=CSS .card-jumps 显隐族，自裁申报）。
 *   主题节点（paperId null）：「去阅读器」零渲染（无阅读器面——自裁：零渲染
 *   优于禁用态）；「去文献库」在场（folderId 恒有值=所在文件夹语义）。
 * - 皮肤住 theme-lineage.css .c-l1/.c-l2/.c-l3 族（旧 .c-head/.c-idea/.c-meta
 *   随三层重整退役——退役行 8）。
 * - data-node-id=e2e/测试结构锚；瀑布错位=offset px inline margin-left 承载。
 */
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react'
import { MAIN_GRAPH_ID, type LineageNode } from '@shared/models/lineage'
import type { LineagePaperMetrics } from '@shared/ipc/schemas'
import { CardAnchorDots } from './CardAnchorDots'
import type { TimelineCallbacks } from './LineageTimeline'

/** L1 标签呈现上限（溢出「+N」——mockup §3.4 最多 2） */
const TAG_LIMIT = 2

/** 星标占位图标（书页线框——静态禁用态 P-11；SVG 9×10 内嵌于 14×14 命中区） */
function StarGlyph(): JSX.Element {
  return (
    <svg viewBox="0 0 9 10" width="9" height="10" aria-hidden="true">
      <path
        d="M1 1.2h7v7.6l-3.5-2-3.5 2z"
        fill="none"
        stroke="var(--faint)"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function LineageTimelineCard(props: {
  node: LineageNode
  /** 骑缝编号（INV-92——Timeline 经 nodePubNoMap 单源全图一次传入） */
  no: number
  /** 含金量摘要（按 paperId 查表传入；null=主题节点/metrics 缺席→L3 全省略） */
  metrics: LineagePaperMetrics | null
  /** [A1a] 文献库标签名组表（键=paperId——L1 标签行数据源[换源]；无键=
   *  零标签行；paperId null 短路不查表——[F-ALIGN-01] 语义=DDL 窗口期防御
   *  〔paper_id 列可空镜像；主题节点应用层已无产生路径，NOT NULL 收紧归
   *  D 批〕） */
  tagNames?: Record<string, string[]>
  selected: boolean
  /** [F-LINEAGE-02] 瀑布错位量 px（P-15：步 82/节距 148/年内复位） */
  offset: number
  /** [T3-P7B] 拾取源高亮（.link-src） */
  linkSrc: boolean
  /** [T3-P8] 拖起态（.dragging——离文档流随指针+连线层 dimmed 配套视觉） */
  dragging?: boolean
  /** [F-LGRAPH-01①U5] P-8 聚焦视觉：仅被点卡 accent 边框 */
  focused?: boolean
  /** [②U7/P-18] 聚焦 dim（非聚焦卡 0.3——hover 回升 0.6 CSS 承载） */
  dim?: boolean
  /** [②U5] 右键反馈：节点菜单目标卡 accent 描边（.ctx-hlt——菜单关即撤） */
  ctx?: boolean
  /** [F-LGRAPH-01②U4] 星标区点击（stopProp 已隔离卡身——宿主按模式分派：
   *  edit=选中卡/browse+focus=no-op[P-11 静态禁用]） */
  onStarClick?: (nodeId: string, ev: ReactMouseEvent<HTMLElement>) => void
  /** [T3-P8] 卡 pointerdown（useCardDrag 拖拽会话入口——5px 阈值内=选中链）。
   *  [F-UIRES-03 C3] 月标 .c-ym 点击面（onYmClick）随改月链退役删除（INV-107） */
  onCardPointerDown?: (nodeId: string, ev: ReactPointerEvent<HTMLElement>) => void
  /** [F-UIRES-03 C3·v1.7] 「去文献库」钮（编排归 Page——library.store 预置+
   *  requestOpenLibrary；folderId=node.folderId 所在文件夹单源） */
  onGotoLibrary?: (paperId: string | null, folderId: string) => void
  /** [F-UIRES-03 C3·v1.7] 「去阅读器」钮（paperId 在场才渲染——主题节点零渲染） */
  onGotoReader?: (paperId: string) => void
} & Pick<TimelineCallbacks, 'onNodeClick' | 'onNodeContextMenu'>): JSX.Element {
  const n = props.node
  // data-kind 两值（[F-LGRAPH-01②U8] survey 值随综述体系退役——theme/paper）
  const kind = n.paperId === null ? 'theme' : 'paper'
  const m = props.metrics
  const cls = [
    'tl-card',
    props.selected ? 'sel' : '',
    props.linkSrc ? 'link-src' : '',
    props.dragging === true ? 'dragging' : '',
    props.focused === true ? 'focused' : '',
    props.dim === true ? 'dim' : '',
    props.ctx === true ? 'ctx-hlt' : ''
  ]
    .filter((c) => c !== '')
    .join(' ')
  // 瀑布错位=按卡 inline（.rowshift 类退役先例——inline style 直传）
  const style = props.offset > 0 ? { marginLeft: `${props.offset}px` } : undefined
  // L1 标签列：最多 2+溢出 +N（无标签=零渲染）——[A1a 换源] 文献库标签域
  // 伴生 map（键=paperId；paperId null 直接短路 []——不造 '' 哨兵键。
  // [F-ALIGN-01·执行修正] 短路保留=DDL 窗口期防御：paper_id 列可空类型镜像，
  // 主题节点应用层已无产生路径〔NOT NULL 收紧归 D 批〕）
  const tags = n.paperId === null ? [] : (props.tagNames?.[n.paperId] ?? [])
  // [C3·v1.7] 阅读器入口钮的 paperId 捕获（const 局部——条件窄化可跨回调闭包
  // 传播；JSX 属性访问窄化不跨闭包 TS2345）
  const readerPid = n.paperId
  const shownTags = tags.slice(0, TAG_LIMIT)
  const overflow = tags.length - shownTags.length
  // L3 三字段可选省略（null/''/缺席=整字段省略——「被引 N」真文本）
  const venue = m !== null && m.venue != null && m.venue !== '' ? m.venue : null
  const impact = m !== null && m.impactFactor != null ? m.impactFactor : null
  const cited = m !== null && m.citedByCount != null ? m.citedByCount : null
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
      <div className="c-l1">
        <span
          className="c-star"
          data-testid="card-star"
          title="星标功能即将开放"
          onClick={(e) => {
            e.stopPropagation() // T2×T3：星标域优先——不触发卡身 click（聚焦/选中）
            props.onStarClick?.(n.id, e)
          }}
        >
          <StarGlyph />
        </span>
        {shownTags.map((t) => (
          <span className="c-tag" key={t}>
            {t}
          </span>
        ))}
        {overflow > 0 && <span className="c-tag-more">+{overflow}</span>}
        {/* [F-UIRES-03 B4①] 骑缝号前缀 #→·（U+00B7 MIDDLE DOT） */}
        <span className="c-no">·{String(props.no).padStart(3, '0')}</span>
      </div>
      <div className="c-title" title={n.title}>
        {n.title}
      </div>
      <div className="c-l3">
        {venue !== null && <span className="c-venue">{venue}</span>}
        {impact !== null && <span className="c-if">{`IF ${impact}`}</span>}
        {cited !== null && <span className="c-cited">{`被引 ${cited}`}</span>}
      </div>
      {/* [F-UIRES-03 C2·P1] 四边中点静态锚（直径 8 画布 px——DOM 常驻，
          显隐 CSS 通道：.drawing 全卡∪hover 卡；pointer-events:none） */}
      <CardAnchorDots />
      {/* [F-UIRES-03 C3·v1.7] 卡面两钮（双击链退役的显式入口——hover 呈现/
          编辑态收钮避让=CSS .card-jumps 族；stopPropagation 隔离卡身 click） */}
      <span className="card-jumps">
        {/* [RR1-A] 哨兵单源：title 判用 MAIN_GRAPH_ID 常量（字面量双源消除
            ——与 LineagePage 编排分支同源） */}
        <button
          type="button"
          className="c-jump"
          data-testid="card-goto-library"
          title={n.folderId === MAIN_GRAPH_ID ? '在文献库打开（未归文件夹——全库视图）' : '在文献库打开所在文件夹并定位'}
          onClick={(e) => {
            e.stopPropagation()
            props.onGotoLibrary?.(n.paperId, n.folderId)
          }}
        >
          去文献库
        </button>
        {readerPid !== null && (
          <button
            type="button"
            className="c-jump"
            data-testid="card-goto-reader"
            title="在阅读器打开（开篇）"
            onClick={(e) => {
              e.stopPropagation()
              props.onGotoReader?.(readerPid)
            }}
          >
            去阅读器
          </button>
        )}
      </span>
    </article>
  )
}
