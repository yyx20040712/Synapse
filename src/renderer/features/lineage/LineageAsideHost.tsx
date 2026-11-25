// b3: F-DBCAMP-01 U3
/**
 * [F-UIRES-03 B4③ + F-DBCAMP-01 DB-2 UI U3] LineageAsideHost —— 脉络右侧
 * aside 宿主（自 LineagePage 拆件迁驻；页签行「详情｜AI 会话」）。
 *
 * ── 行为层 ──
 * - 页签态驻本组件本地 useState（缺省='details'——lineage-sidebar.spec 的
 *   lineage-side-panel 断言锚零触碰：进页即详情面板可见，AI 页签不抢占）。
 *   本件恒挂载（PageBody 无条件渲染），收起只是返回 null——页签选择跨收起/展开保留。
 * - 'details'=LineageSidePanel 整组件原样挂载（去文献库/去阅读器链全保活）；'ai'=
 *   LineageAiPanel（锚=lineage.store folderId——主图/文件夹图同构，不特判）。
 * - resizer 机制原语义原样迁驻（testid 全保持：
 *   lineage-sidebar/lineage-side-panel/lineage-sidebar-resizer）。
 *
 * [B5 设计稿 §3.4/§10.2/§11.4——wave C 2026-11-25 侧栏单态与开关迁移]
 * - 受控 SidebarPane 注入：本件不再内部调用 useSidebarPane——Page（LineagePageBody）经
 *   use-lineage-pane-controls 调用后把同一对象传给工具栏 LineagePaneToggles 与本件；拖宽、键盘
 *   separator、200–480 clamp 和 localStorage 持久化仍在原 hook。
 * - 收起态=返回 null（原 48px 窄条 rail 与 rail 内重复展开钮、LineageSidePanel 的 onCollapse
 *   收起链退役）：收起后对应 pane 不再占空 rail；开关=工具栏 lineage-sidebar-collapse／
 *   lineage-sidebar-expand 动态按钮；从工具栏恢复时读回原宽。
 *
 * ── 接口层 ── export function LineageAsideHost(props: LineageAsideHostProps): JSX.Element | null
 *
 * ── 架构层 ── 编排态（selectedNode/pubNos/selMetrics/handleJumpToPaper/
 * handleCardGotoLibrary/handleCardGotoReader）仍驻 LineagePage（本件纯 props
 * 透传——Page 行数预算拆件动机）。
 *
 * ── 生命周期层 ── ── 文化层 ──
 * - 测试：e2e lineage-sidebar.spec（resizer/收起/宽度锚——工具栏开合端到端面）+
 *   ai-sessions-panel.spec E1②（AI 会话页签）。
 */
import { useState } from 'react'
import type { LineageNode } from '@shared/models/lineage'
import type { LineagePaperMetrics } from '@shared/ipc/schemas'
import { LineageAiPanel } from '../ai/LineageAiPanel'
import { LineageSidePanel } from './LineageSidePanel'
import { SIDEBAR_MAX_WIDTH, SIDEBAR_MIN_WIDTH, type SidebarPane } from './use-sidebar-pane'

type AsidePaneTab = 'details' | 'ai'

const PANE_LABELS: Record<AsidePaneTab, string> = { details: '详情', ai: 'AI 会话' }

export interface LineageAsideHostProps {
  node: LineageNode | null
  /** [B5 §3.4] 受控右栏面（Page 组合层 use-lineage-pane-controls 注入——与工具栏开关共用同一实例） */
  sidebar: SidebarPane
  onJumpToPaper(payload: {
    paperId: string
    anchor?: {
      quoteText: string
      prefixText: string
      suffixText: string
      anchorPage: number | null
      annotationId?: string
    }
  }): void
  /** [F-FOLDER-01] 骑缝编号（INV-92 pubNo——Page 自 store pubNos 分发） */
  pubNo: number | null
  /** 含金量摘要（②U4 扩 venue/impactFactor——卡 L3 同源单路径） */
  metrics: LineagePaperMetrics | null
  onGotoLibrary(paperId: string | null, folderId: string): void
  onGotoReader(paperId: string): void
  /** [F-DBCAMP-01 DB-4 / F-STAR-01 A4] 星标切换（SidePanel 星标域→Page 编排
   *  lineage.store toggleNodeStar） */
  onToggleStar?(node: { id: string; paperId: string; isStarred?: boolean }): void
}

export function LineageAsideHost(props: LineageAsideHostProps): JSX.Element | null {
  const sidebar = props.sidebar
  const [tab, setTab] = useState<AsidePaneTab>('details')

  // [B5 §3.4] 收起=零 DOM（不占空 rail；页签态随恒挂载的组件实例保留）
  if (sidebar.collapsed) return null

  return (
    // R2-LG11：白玻璃底/描边/圆角归 LineageSidePanel 根——aside 只留尺寸直通
    //（+U3 页签行/内容分区=flex 列）
    <aside
      data-testid="lineage-sidebar"
      className="relative flex shrink-0 flex-col overflow-hidden"
      style={{ width: `${sidebar.width}px` }}
    >
      {/* [U3] 页签行（详情缺省——spec 锚零触碰）；样式语汇沿 reader 侧栏
          页签（active=accent 文字+accent 底缘 hairline） */}
      <div
        className="flex shrink-0 items-stretch border-b"
        role="tablist"
        aria-label="脉络侧栏面板"
        style={{ borderColor: 'var(--border)', background: 'var(--panel)' }}
      >
        {(Object.keys(PANE_LABELS) as AsidePaneTab[]).map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className="flex flex-1 items-center justify-center px-2 py-1 text-xs"
            style={
              tab === id
                ? { color: 'var(--accent)', fontWeight: 500, borderBottom: '2px solid var(--accent)' }
                : { color: 'var(--text-dim)' }
            }
            onClick={() => setTab(id)}
          >
            {PANE_LABELS[id]}
          </button>
        ))}
      </div>
      <div className="relative min-h-0 flex-1">
        {tab === 'details' ? (
          <LineageSidePanel
            node={props.node}
            onJumpToPaper={props.onJumpToPaper}
            onGotoLibrary={props.onGotoLibrary}
            onGotoReader={props.onGotoReader}
            onToggleStar={props.onToggleStar}
            pubNo={props.pubNo}
            metrics={props.metrics}
          />
        ) : (
          <LineageAiPanel />
        )}
      </div>
      {/* [F-UIRES-03 B5②] 手柄键盘可达（APG separator）：tabIndex+onKeyDown
          四键调宽单源=useSidebarPane；title 提示双通道 */}
      <div
        data-testid="lineage-sidebar-resizer"
        role="separator"
        aria-orientation="vertical"
        aria-label="详情栏宽度"
        aria-valuemin={SIDEBAR_MIN_WIDTH}
        aria-valuemax={SIDEBAR_MAX_WIDTH}
        aria-valuenow={sidebar.width}
        tabIndex={0}
        title="拖拽或左右键调宽"
        className="lg-side-resizer"
        onPointerDown={sidebar.onResizeStart}
        onKeyDown={sidebar.onResizeKey}
      />
    </aside>
  )
}
