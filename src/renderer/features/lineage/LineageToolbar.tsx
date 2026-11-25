// b3: P7-H
/**
 * [T3-P7B→F-LGRAPH-01②U2] LineageToolbar —— 编辑工具组（mockup §3.3：[保存●]│
 * [小手选择][— 实线(色)][╌ 虚线(色)]│[↶撤销][↷重做]——**仅 edit 模式可见**（browse/
 * focus=仅 drag-hint）。[F-ALIGN-01 2026-10-04] 建点钮随手动建点路径全退役删除
 * （A11 组成员收窄——节点唯一来源=入库/移动两路，INV-NEW-1）。
 *
 * [B4 L1 / 设计稿 §10.1/§10.4/§11.2] 拆件+状态面重整：
 * - 保存钮=LineageSaveButton 纯受控件（IO+U 聚合四态；Q0 且 U1 仍可点；
 *   finalize/history/reconcile 在途禁用）；
 * - 撤销/重做=LineageHistoryButtons 纯受控件（canUndo/canRedo=#12 no-op 判据；
 *   在途仅作 busy 指示——点击按 #13d 排队）；
 * - 命令状态单源=use-lineage-command-state（HistoryCommandState）；
 * - 保存错误行（saveState=failed）内的过期历史出口=LineageStaleHistoryDrop 纯受控件（[回炉
 *   W-B3·R-D1]：撤销/重做被 history-unit 以 CONFLICT 拒绝的栈顶历史项——点击出确认框，确认才丢弃）；
 * - 工具组锁定面沿承：同会话 saving（任一在途写）=选择/线型交互钮禁用
 *   （INV-94 编辑锁）；保存/撤销/重做钮按各命令可用性；
 * - Ctrl+Z/Y/Shift+Z/S 快捷键三模式生效面=use-lineage-history-shortcuts（页面接线）。
 * 线型组 [F-UIRES-03 C1]：每 kind（solid/dashed）=图标钮（描边=该 kind 当前色
 * per-kind——INV-108）+右独立「展开」chevron 钮；列表=LineTypeMenu 拆件（6 色行+
 * 行内改名=一编辑单元——saveLineTypeNames）。
 * - 工具组直连双 store（view 工具态+lineage 会话/色行名——LineageModeBar
 *   直连 view.store 同型；props 面=mode 容器注入沿承）。
 *
 * [B5 设计稿 §3/§10.2——wave A 纯拆件 2026-11-25，行为零变] 本件=编辑工具组宿主
 * （只排槽：保存│编辑工具│撤销重做+drag-hint+保存错误行；工具组仍驻
 * LineageTimeline、仍仅 edit 挂载——迁页面顶部单排工具栏与三模式常驻属后续波，
 * §15.1 步骤 4）：
 * - 选择/线型/色板三钮=LineageEditTools 拆件（线型组与编辑工具锁定面的注释随
 *   代码迁驻该件头注；view 工具态订阅随之迁出——browse/focus 态本件不再订阅
 *   工具态，渲染输出不变）；
 * - 保存/撤销重做/保存错误行=既有分件（LineageSaveButton/LineageHistoryButtons/
 *   LineageStaleHistoryDrop）原位原序零改。
 */
import { useLineageStore } from './lineage.store'
import { RetryButton } from '../../shared/ui/RetryButton'
import { LineageEditTools } from './LineageEditTools'
import { LineageSaveButton } from './LineageSaveButton'
import { LineageHistoryButtons } from './LineageHistoryButtons'
import { LineageStaleHistoryDrop } from './LineageStaleHistoryDrop'
import { useLineageCommandState } from './use-lineage-command-state'

export function LineageToolbar(props: {
  mode: 'edit' | 'browse' | 'focus'
}): JSX.Element {
  const mode = props.mode
  const command = useLineageCommandState()
  const lastWriteError = useLineageStore((s) => s.lastWriteError)

  if (mode !== 'edit') {
    // 非 edit：工具组隐藏——仅 drag-hint（三态文案）；历史快捷键仍三模式生效
    return (
      <div className="lg-toolbar slim">
        <span className="drag-hint" data-testid="drag-hint">
          {mode === 'focus'
            ? '◎ 单击卡片＝聚焦标记（再点取消） · 拖动空白＝平移画布'
            : '✋ 拖动空白＝平移画布 · 滚轮浏览时间线'}
        </span>
      </div>
    )
  }

  const store = useLineageStore.getState

  return (
    // [回炉 W-C·R-D1 呈现修复] 保存错误行在场时挂修饰类 has-save-error（与下方错误行同条件）——
    // 错误行独占工具组下一行；布局规则只挂在该类下（theme-lineage-tools.css），无错误行时布局不变
    <div className={command.saveState === 'failed' ? 'lg-toolbar tools has-save-error' : 'lg-toolbar tools'}>
      {/* [F-UIRES-02 批 B R6] 保存钮去文字（SaveIcon+dirty 角点+saving spinner
          保留——LineageSaveButton 纯受控件） */}
      <LineageSaveButton state={command.saveState} canSave={command.canSave} onSave={() => void store().saveActiveFolder()} />
      <span className="lg-sep" />
      {/* [F-ALIGN-01] 建点钮随手动建点路径退役删除（组=保存│选择/线型│撤销重做）
          ——e2e 断言锚零残留（工单三.5 词表） */}
      {/* [B5 wave A 纯拆件] 选择/线型/色板=LineageEditTools（片段返回——本容器直接
          子序不变；选择钮/锚槽/列表的注释随代码迁驻该件） */}
      <LineageEditTools />
      <span className="lg-sep" />
      {/* [F-UIRES-02 批 B R5] ↶↷ 字符→ICON_UNDO/ICON_REDO（两域复用）；
          补 aria-label（原仅 title）；sr-only 保 textContent/accessible name */}
      <LineageHistoryButtons
        canUndo={command.canUndo}
        canRedo={command.canRedo}
        busy={command.busy}
        onUndo={() => void store().undo()}
        onRedo={() => void store().redo()}
      />
      <span className="drag-hint" data-testid="drag-hint">
        {/* [F-UIRES-03 C1→C2·P6] 终态文案（v1.11① CAD 正名）：画线=从卡边锚点
            拖至目标卡（唯一建边径）；拖动段=C3 月内调序（INV-107 改月单口沿承） */}
        编辑中：拖动＝月内调序 · 画线＝从卡边锚点拖至目标卡
      </span>
      {command.saveState === 'failed' && (
        <span
          className="lg-save-error"
          role="alert"
          data-testid="lineage-save-error"
          style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
        >
          保存失败：{lastWriteError}
          {/* [F-UIRES-02 批 B R2] 文字重试钮→共享 RetryButton（testid 受锁锚透传） */}
          <RetryButton testId="lineage-save-retry" onClick={() => store().retrySave()} />
          {/* [回炉 W-B3·R-D1] 过期历史出口：history-unit 以 CONFLICT 拒绝的栈顶历史项——
              点击出确认框，确认才丢弃（不静默自动跳过） */}
          <LineageStaleHistoryDrop />
        </span>
      )}
    </div>
  )
}
