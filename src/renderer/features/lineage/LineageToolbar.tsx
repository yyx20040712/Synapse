// b3: P7-H
/**
 * [T3-P7B→F-LGRAPH-01②U2] LineageToolbar —— 脉络工具栏。原=编辑工具组（mockup §3.3：[保存●]│[小手
 * 选择][— 实线(色)][╌ 虚线(色)]│[↶撤销][↷重做]——仅 edit 模式可见）；[F-ALIGN-01 2026-10-04] 建点钮随
 * 手动建点路径全退役删除（A11 组成员收窄——节点唯一来源=入库/移动两路，INV-NEW-1）。
 *
 * [B4 L1 / 设计稿 §10.1/§10.4/§11.2] 拆件+状态面：
 * - 保存钮=LineageSaveButton 纯受控件（IO+U 聚合四态；Q0 且 U1 仍可点；finalize/history/reconcile
 *   在途禁用）；
 * - 撤销/重做=LineageHistoryButtons 纯受控件（canUndo/canRedo=#12 no-op 判据；在途仅作 busy 指示——
 *   点击按 #13d 排队）；
 * - 命令状态单源=use-lineage-command-state（HistoryCommandState）——本件调用一次喂保存/历史两组，
 *   Page 不另推导一份可用性；
 * - 工具组锁定面沿承：同会话 saving（任一在途写）=选择/线型交互钮禁用（INV-94 编辑锁）；
 *   Ctrl+Z/Y/Shift+Z/S 快捷键三模式生效面=use-lineage-history-shortcuts（页面接线）。
 * 线型组 [F-UIRES-03 C1]：每 kind（solid/dashed）=图标钮（描边=该 kind 当前色 per-kind——INV-108）+右独立
 * 「展开」chevron 钮；列表=LineTypeMenu 拆件（6 色行+行内改名=一编辑单元——saveLineTypeNames）。
 *
 * [B5 设计稿 §3/§10.2——wave A 纯拆件 2026-11-25，行为零变] 选择/线型/色板=LineageEditTools 拆件。
 *
 * [B5 设计稿 §2.3/§3.1/§3.2/§6.2/§10.2——wave C 2026-11-25 单排工具栏与稳定页面外壳] 本件=父工具栏
 * （只排槽、共壳与组合；保存/编辑/缩放/侧栏/告警分件），自 LineageTimeline 渲染树迁驻页面顶部
 * （LineagePageBody 首子），loading/error/ready 三态常驻：
 * - 最终 DOM 顺序（§3.1 原文）：编辑/浏览/聚焦｜保存 / 撤销 / 重做｜选择 / 实线+色板 / 虚线+色板｜
 *   缩放 − / 百分比复位 / +｜清空聚焦｜图名｜左导航开关 / 右详情开关。testid 沿用
 *   lineage-mode-*／lineage-tool-*／lineage-save-btn／lineage-undo／lineage-redo／zoom-badge。
 * - 三模式常驻：保存/撤销重做/缩放三模式同一判据；编辑工具 browse/focus 只禁用不消失（非 edit 整组
 *   消失与 drag-hint 三态文案随 §3.5 退役）。
 * - 1024×768 横滚=原生横向滚动（§3.2 三层：.lg-toolbar-shell／.lg-toolbar-scroll〔role=toolbar、可键盘
 *   聚焦〕／.lg-toolbar 不折行）；不做第二排/溢出菜单/窗口最小宽度。
 * - 图名=父栏槽位（folders 单源经编排注入，真实图名属保留的数据文案；LineageModeBar 不再承载）。
 * - 写失败告警=LineageWriteErrorAlert，横滚容器的兄弟节点（不占工具控件轨道、不触发 flex-wrap）。
 * - 左右侧栏开关=LineagePaneToggles（受控——页面组合层 use-lineage-pane-controls 同一对象喂开关与宿主）。
 */
import { useLineageStore } from './lineage.store'
import { LineageEditTools } from './LineageEditTools'
import { LineageSaveButton } from './LineageSaveButton'
import { LineageHistoryButtons } from './LineageHistoryButtons'
import { LineageModeBar, LineageFocusClearButton } from './LineageModeBar'
import { LineagePaneToggles } from './LineagePaneToggles'
import { LineageWriteErrorAlert } from './LineageWriteErrorAlert'
import { LineageZoomControls } from './LineageZoomControls'
import { useLineageCommandState } from './use-lineage-command-state'
import type { LineagePaneControls } from './use-lineage-pane-controls'

export function LineageToolbar(props: { graphName: string; panes: LineagePaneControls }): JSX.Element {
  const command = useLineageCommandState()
  const store = useLineageStore.getState
  const panes = props.panes
  return (
    <div className="lg-toolbar-shell" data-testid="lineage-toolbar-shell">
      {/* 滚动容器可键盘聚焦（tabIndex=0）：按钮聚焦时浏览器原生 scroll-into-view 保证可达，零 JS 滚动状态机 */}
      <div className="lg-toolbar-scroll" role="toolbar" aria-label="脉络工具栏" tabIndex={0}>
        <div className="lg-toolbar" data-testid="lineage-toolbar">
          <LineageModeBar />
          <span className="lg-sep" />
          <LineageSaveButton state={command.saveState} canSave={command.canSave} onSave={() => void store().saveActiveFolder()} />
          <LineageHistoryButtons
            canUndo={command.canUndo}
            canRedo={command.canRedo}
            busy={command.busy}
            onUndo={() => void store().undo()}
            onRedo={() => void store().redo()}
          />
          <span className="lg-sep" />
          <LineageEditTools />
          <span className="lg-sep" />
          <LineageZoomControls />
          <span className="lg-sep" />
          {/* 清空聚焦=唯一用户显式清空当前图的入口（§2.2 #12/#13）：由父栏在规定槽位渲染，不为顺序复制 focus 状态 */}
          <LineageFocusClearButton />
          <span className="lg-sep" />
          {/* 图名=folders 单源（真实图名属保留的数据文案） */}
          <span className="lg-graph-name mono" data-testid="lineage-graph-title">
            {props.graphName}
          </span>
          <LineagePaneToggles navCollapsed={panes.navCollapsed} onToggleNav={panes.toggleNav} sidebar={panes.sidebar} />
        </div>
      </div>
      {/* 写失败告警=滚动区外的兄弟节点（§3.2：不占工具控件轨道，工具控件行 top/height 不因告警出现而变） */}
      <LineageWriteErrorAlert />
    </div>
  )
}
