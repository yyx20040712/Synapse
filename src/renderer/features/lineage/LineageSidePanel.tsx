// b3: P7-H
/**
 * [F-LGRAPH-01②U4/A5] LineageSidePanel —— 右侧常驻详情面板（宽 252；P-16
 * 常驻不收——点空白保持占位）+片段双击跳阅读器。
 *
 * ── 行为层（②批 A5 收编重整；[F-UIRES-03 B2] 三节新序）──
 * - **详情域收编**：完整题名/期刊缩写（venue）/IF（impactFactor）/被引
 *   （citedByCount）/年月/星标态禁用呈现（P-11——title「星标功能即将开放」）
 *   +底部注记「双击卡片跳转阅读器」（A6）。三字段可选省略（缺席整行省略
 *   ——卡 L3 同源 [②U4] metrics 扩字段，无第二数据路径）。
 * - **core 徽章退役**（行 9：core UI 消费面全退役——数据面留 AI 重做域）
 *   +「已绑定文献」域随行 9 收编：主题节点=「主题节点」域标识（无 metrics
 *   面），文献节点=期刊/IF/被引域隐式承载绑定态（不双渲染徽章）。
 * - **空选中态**=「点击卡片查看详情」占位（P-16）；三模式点卡联动（P-13）
 *   编排归 Page（selectedNodeId 单源）。
 * - **[F-UIRES-03 B5① v1.15 第五轮②用户裁决] 头部操作行**：「去文献库/去阅读
 *   器」两钮自卡面迁移至此（卡面 hover-only 键盘不可达挂账随迁移消解）——
 *   位置=标题/编号/徽章行下方一行两钮并排文字钮形（醒目+语义=「针对这篇文献
 *   的操作」）；驻头部区不随内容滚动消失（面板=头部固定+笔记区滚动分区）。
 *   主题节点（paperId null）沿 C3 态：「去阅读器」零渲染+「去文献库」在场
 *   （paperId=null 通道支持——编排层不置选中）；载荷签名沿卡面版。
 * - **笔记三节新序**（B2「四删三立」——node.paperId 非 null 时渲染，DOM 序
 *   即此序）：①全文笔记（LineageSideManualNote——原「人工笔记」更名）→
 *   ②片段笔记（LineageSideFragments——B2 新立）→③AI 评估与建议
 *   （LineageSideAiNotes——原 AI 节更名+双击链退役，纯展示；
 *   后置占位章随真节替代整删——B4 范围裁决终结）；核心想法/标签两节已在
 *   先批退役（A3/A1b）。[A1b F-CONTRACTA-01] 标签唯一源=文献库域沿承。
 * - **片段双击=跳阅读器**（N3/INV-20 单入口——B2 后全应用唯一保留双击链；
 *   AI 条目双击链退役）。跳转载荷构造单点=本组件 handleFragmentDblClick
 *   （anchorPage=Annotation.page 0 基直传——OutlineAside.locateFragment
 *   同口径，禁 ±1 换算；锚三元组与 open-paper-bus/open-paper-anchor 三方
 *   头注锚定不变）。
 * - 数据单源：AI 评估/片段两分节直连 window.api（quality 跨域互引红线
 *   ——reader 域组件/store 不可引；接缝声明见各分节头注）。
 */
import type { CSSProperties } from 'react'
import type { Annotation } from '@shared/models/annotation'
import { MAIN_GRAPH_ID, type LineageNode } from '@shared/models/lineage'
import type { LineagePaperMetrics } from '@shared/ipc/schemas'
import { ICON_CHEVRONS_RIGHT } from '../../shared/icons'
import { LineageSideAiNotes } from './LineageSideAiNotes'
import { LineageSideFragments } from './LineageSideFragments'
import { LineageSideManualNote } from './LineageSideManualNote'

/** 白玻璃卡（R2-LG11 浅色严谨板——沿承） */
const SIDE_GLASS: CSSProperties = {
  background: 'var(--panel-a92)',
  backdropFilter: 'blur(12px)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  boxShadow: 'var(--shadow-2)'
}

/** 年月徽章文本（YYYY-MM 补零/null 退化） */
function ymBadge(n: LineageNode): string {
  if (n.year === null) return '—'
  return n.month === null ? String(n.year) : `${n.year}-${String(n.month).padStart(2, '0')}`
}

/** [②U4] 星标态禁用图标（书页线框——卡面 StarGlyph 同形静态版） */
function PanelStarGlyph(): JSX.Element {
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

export function LineageSidePanel(props: {
  node: LineageNode | null
  onJumpToPaper(payload: {
    paperId: string
    anchor?: {
      quoteText: string
      prefixText: string
      suffixText: string
      anchorPage: number | null
    }
  } | null): void
  /** [F-FOLDER-01] 骑缝编号（INV-92 pubNo——Page 自 store pubNos 分发） */
  pubNo?: number | null
  /** [T3-P8→②U4 退役] core 徽章消费面已随行 9 退役（prop 删除——数据面留） */
  /** 含金量摘要（[②U4] 扩 venue/impactFactor——卡 L3 同源单路径） */
  metrics?: LineagePaperMetrics | null
  /** [F-UIRES-03 B4③] 头部收起钮回调（Page 态归 useSidebarPane；缺席=零渲染） */
  onCollapse?: () => void
  /** [F-UIRES-03 B5①] 操作行「去文献库」钮（卡面版签名沿承——编排归 Page：
   *  library.store 预置+requestOpenLibrary；folderId=node.folderId 单源） */
  onGotoLibrary?: (paperId: string | null, folderId: string) => void
  /** [F-UIRES-03 B5①] 操作行「去阅读器」钮（paperId 在场才渲染——主题节点零渲染；
   *  编排归 Page：requestOpenPaper 单字段开篇语义） */
  onGotoReader?: (paperId: string) => void
}): JSX.Element {
  const { node } = props
  if (node === null) {
    return (
      <div
        data-testid="lineage-side-panel"
        className="lg-inspector flex h-full items-center justify-center p-4 text-center text-xs"
        style={{ ...SIDE_GLASS, width: '100%', color: 'var(--text-dim)' }}
      >
        点击卡片查看详情
      </div>
    )
  }

  /** [B5①] 操作行「去阅读器」钮的 paperId 捕获（const 局部——条件窄化可跨
   *  回调闭包传播；JSX 属性访问窄化不跨闭包 TS2345——卡面版先例沿承） */
  const readerPid = node.paperId

  /** 片段条目双击→跳转载荷（构造单点：锚三元组透传+anchorPage 0 基直传——
   *  Annotation.page 已 0 基，禁任何 ±1 换算；OutlineAside.locateFragment 同口径） */
  const handleFragmentDblClick = (a: Annotation): void => {
    if (node.paperId === null) return
    props.onJumpToPaper({
      paperId: a.paperId,
      anchor: {
        quoteText: a.quoteText,
        prefixText: a.prefixText,
        suffixText: a.suffixText,
        anchorPage: a.page
      }
    })
  }

  // [②U4] 详情域徽章：期刊/IF/被引/年月/T 档（可选省略——缺席零渲染）
  const m = props.metrics ?? null
  const venue = m !== null && m.venue != null && m.venue !== '' ? m.venue : null
  const impact = m !== null && m.impactFactor != null ? m.impactFactor : null
  const cited = m !== null && m.citedByCount != null ? m.citedByCount : null
  const tier = node.paperId !== null ? (m?.venueTier ?? null) : null

  return (
    <div
      data-testid="lineage-side-panel"
      className="lg-inspector flex h-full flex-col gap-2 p-3.5 text-xs"
      style={{ ...SIDE_GLASS, width: '100%' }}
    >
      {/* [B5①] 头部区（shrink-0 驻留——操作行不随内容滚动消失） */}
      <section
        className="shrink-0"
        data-testid="lineage-side-meta"
        data-binding={node.paperId === null ? 'theme' : 'paper'}
      >
        <div className="insp-cap">
          <span>节点详情</span>
          <span className="flex items-center gap-2">
            {/* [F-UIRES-03 B4①] 骑缝号前缀 #→·（U+00B7 MIDDLE DOT） */}
            {props.pubNo != null && <span>{`·${String(props.pubNo).padStart(3, '0')}`}</span>}
            {/* 星标态禁用呈现（P-11——静态样式；F-STAR-01 DB 窗口后启用） */}
            <span className="panel-star" data-testid="panel-star" title="星标功能即将开放">
              <PanelStarGlyph />
              星标
            </span>
            {/* [F-UIRES-03 B4③] 头部收起钮（回调缺席零渲染——既有消费面零污染；
                宽度直通 width:100%=aside 行内宽覆盖 CSS 252 回退值） */}
            {props.onCollapse !== undefined && (
              <button
                type="button"
                className="side-collapse-btn syn-icon-btn"
                data-testid="lineage-sidebar-collapse"
                title="收起详情面板"
                aria-label="收起详情面板"
                onClick={props.onCollapse}
              >
                {ICON_CHEVRONS_RIGHT}
              </button>
            )}
          </span>
        </div>
        <div className="insp-title">{node.title}</div>
        <div className="badges">
          {venue !== null && <span className="badge plain">{venue}</span>}
          {impact !== null && <span className="badge plain">{`IF ${impact}`}</span>}
          {cited !== null && <span className="badge plain">{`被引 ${cited}`}</span>}
          <span className="badge plain">{ymBadge(node)}</span>
          {tier !== null && <span className="badge plain">{tier}</span>}
        </div>
        {/* [F-UIRES-03 B5① v1.15 第五轮②] 头部操作行（两钮自卡面迁移——徽章行
            下两钮并排文字钮形；常驻非 hover；testid 沿卡面版不改名=迁移面 e2e
            改写最小。哨兵单源：title 判=MAIN_GRAPH_ID 常量——与 LineagePage
            编排分支同源〔RR1-A 先例沿承〕） */}
        <div className="side-jumps">
          <button
            type="button"
            className="s-jump"
            data-testid="card-goto-library"
            title={node.folderId === MAIN_GRAPH_ID ? '在文献库打开（未归文件夹——全库视图）' : '在文献库打开所在文件夹并定位'}
            onClick={() => {
              props.onGotoLibrary?.(node.paperId, node.folderId)
            }}
          >
            去文献库
          </button>
          {readerPid !== null && (
            <button
              type="button"
              className="s-jump"
              data-testid="card-goto-reader"
              title="在阅读器打开（开篇）"
              onClick={() => {
                props.onGotoReader?.(readerPid)
              }}
            >
              去阅读器
            </button>
          )}
        </div>
        {node.paperId === null && (
          <p className="m-0" style={{ color: 'var(--text-dim)' }}>
            主题节点（无文献绑定）
          </p>
        )}
      </section>
      {/* [B5①] 笔记区滚动层（头部固定+内容滚动的分区承载——操作行不随滚走） */}
      <div className="insp-scroll flex min-h-0 flex-1 flex-col gap-2 overflow-auto">
        {/* [A3 F-CONTRACTA-01 2026-10-04] 核心 idea 区随核心想法域全退役删除
            （「核心想法」语义由全文笔记 notes.contentMd 承接——原
            lineage-side-idea 区/testid 消亡） */}
        {node.paperId === null ? (
          <p className="m-0" style={{ color: 'var(--text-dim)' }}>主题节点无笔记</p>
        ) : (
          <>
            {/* [F-UIRES-03 B2] 三节新序（DOM 序即此序）：全文笔记→片段笔记→
                AI 评估与建议；后置占位章随③真节替代整删（B4 裁决终结） */}
            <LineageSideManualNote paperId={node.paperId} />
            <LineageSideFragments paperId={node.paperId} onFragmentDblClick={handleFragmentDblClick} />
            <LineageSideAiNotes paperId={node.paperId} />
          </>
        )}
        {/* [②U4/A5] 底部注记。[F-UIRES-03 C3 第一段] 「改月」子句随改月链退役删
            （INV-107）；[C3 第二段·v1.7] 「双击卡片跳转阅读器」子句随卡双击退役
            删（全应用唯一保留双击=片段条目——B2 终态）；[B5①] 跳转入口=头部操
            作行「去阅读器」钮（常驻） */}
        <div className="insp-foot">编辑模式：调序 / 画线 / 调线</div>
      </div>
    </div>
  )
}
