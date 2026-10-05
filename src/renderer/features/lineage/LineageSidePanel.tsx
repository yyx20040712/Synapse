// b3: P7-H
/**
 * [F-LGRAPH-01②U4/A5] LineageSidePanel —— 右侧常驻详情面板（宽 252；P-16
 * 常驻不收——点空白保持占位）+笔记双击跳阅读器。
 *
 * ── 行为层（②批 A5 收编重整）──
 * - **详情域收编**：完整题名/期刊缩写（venue）/IF（impactFactor）/被引
 *   （citedByCount）/年月/星标态禁用呈现（P-11——title「星标功能即将开放」）
 *   +底部注记「双击卡片跳转阅读器」（A6）。三字段可选省略（缺席整行省略
 *   ——卡 L3 同源 [②U4] metrics 扩字段，无第二数据路径）。
 * - **core 徽章退役**（行 9：core UI 消费面全退役——数据面留 AI 重做域）
 *   +「已绑定文献」域随行 9 收编：主题节点=「主题节点」域标识（无 metrics
 *   面），文献节点=期刊/IF/被引域隐式承载绑定态（不双渲染徽章）。
 * - **空选中态**=「点击卡片查看详情」占位（P-16）；三模式点卡联动（P-13）
 *   编排归 Page（selectedNodeId 单源）。
 * - **AI 笔记/人工笔记域保留**（现侧板面——非退役面）；[A1b
 *   F-CONTRACTA-01 2026-10-04] 标签编辑分节拆件随脉络私有标签域退役
 *   删除——标签唯一源=文献库域（卡面标签行=A1a 伴生 map）。
 * - **笔记双击=跳阅读器**（N3/INV-20 单入口——总线载荷锚三元组传递链与
 *   open-paper-bus/open-paper-anchor 三方头注锚定不变）。
 * - 数据单源：AI 笔记本板直连 window.api.ai_notes/list（quality 跨域互引
 *   红线——reader 域 store 不可引，接缝声明见 ai-notes.store 头注）。
 */
import type { CSSProperties } from 'react'
import type { AiNote } from '@shared/models/ai-note'
import type { LineageNode } from '@shared/models/lineage'
import type { LineagePaperMetrics } from '@shared/ipc/schemas'
import { ICON_CHEVRONS_RIGHT } from '../../shared/icons'
import { LineageSideAiNotes } from './LineageSideAiNotes'
import { LineageSideManualNote } from './LineageSideManualNote'

/** 白玻璃卡（R2-LG11 浅色严谨板——沿承） */
const SIDE_GLASS: CSSProperties = {
  background: 'var(--panel-a92)',
  backdropFilter: 'blur(12px)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  boxShadow: 'var(--shadow-2)'
}

/** 锚存在判定（quote 不足 2 字符且无页码=无锚——locateAnchor 验证阈值同源） */
function hasAnchor(n: AiNote): boolean {
  return n.quoteText.length >= 2 || n.anchorPage !== null
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
    aiNoteId?: string
  } | null): void
  /** [F-FOLDER-01] 骑缝编号（INV-92 pubNo——Page 自 store pubNos 分发） */
  pubNo?: number | null
  /** [T3-P8→②U4 退役] core 徽章消费面已随行 9 退役（prop 删除——数据面留） */
  /** 含金量摘要（[②U4] 扩 venue/impactFactor——卡 L3 同源单路径） */
  metrics?: LineagePaperMetrics | null
  /** [F-UIRES-03 B4③] 头部收起钮回调（Page 态归 useSidebarPane；缺席=零渲染） */
  onCollapse?: () => void
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

  /** AI 条目双击→跳转载荷（构造单点：三元组透传+1 基→0 基；无锚=anchor 缺省） */
  const handleNoteDblClick = (n: AiNote): void => {
    if (node.paperId === null) return
    const anchor = hasAnchor(n)
      ? {
          quoteText: n.quoteText,
          prefixText: n.prefixText,
          suffixText: n.suffixText,
          anchorPage: n.anchorPage === null ? null : n.anchorPage - 1
        }
      : undefined
    props.onJumpToPaper({ paperId: n.paperId, anchor, aiNoteId: n.id })
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
      className="lg-inspector flex h-full flex-col gap-2 overflow-auto p-3.5 text-xs"
      style={{ ...SIDE_GLASS, width: '100%' }}
    >
      <section data-testid="lineage-side-meta" data-binding={node.paperId === null ? 'theme' : 'paper'}>
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
        {node.paperId === null && (
          <p className="m-0" style={{ color: 'var(--text-dim)' }}>
            主题节点（无文献绑定）
          </p>
        )}
      </section>
      {/* [A3 F-CONTRACTA-01 2026-10-04] 核心 idea 区随核心想法域全退役删除
          （「核心想法」语义由全文笔记 notes.contentMd 承接——原
          lineage-side-idea 区/testid 消亡） */}
      {node.paperId === null ? (
        <p className="m-0" style={{ color: 'var(--text-dim)' }}>主题节点无笔记</p>
      ) : (
        <>
          <LineageSideAiNotes paperId={node.paperId} onNoteDblClick={handleNoteDblClick} />
          <LineageSideManualNote paperId={node.paperId} />
          {/* AI 评估后置章占位（B4 范围裁决——不渲染任何假数据） */}
          <div className="sec-cap" data-testid="lineage-side-postpone">
            AI 评 估 笔 记<span className="postpone">后置</span>
          </div>
          <p className="m-0" style={{ color: 'var(--text-dim)' }}>评估功能后置——当前版本不生成 AI 评估内容</p>
        </>
      )}
      {/* [②U4/A5] 底部注记（双击跳阅读器——A6 消费面提示）+编辑操作提要 */}
      <div className="insp-foot">双击卡片跳转阅读器 · 编辑模式：改月 / 调序 / 画线 / 调线</div>
    </div>
  )
}
