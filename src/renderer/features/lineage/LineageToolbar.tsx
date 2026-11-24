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
 */
import { useLineageStore } from './lineage.store'
import { useLineageViewStore } from './lineage-view.store'
import { LINE_TYPE_COLORS } from '@shared/models/lineage'
import { ICON_HAND } from '../../shared/icons'
import { RetryButton } from '../../shared/ui/RetryButton'
import { ExpandButton, LineTypeMenu } from './LineTypeMenu'
import { LineageSaveButton } from './LineageSaveButton'
import { LineageHistoryButtons } from './LineageHistoryButtons'
import { LineageStaleHistoryDrop } from './LineageStaleHistoryDrop'
import { useLineageCommandState } from './use-lineage-command-state'

/** 线型图标（13×9 线样——实/虚两态；描边载体=SVG **表现属性** stroke={color}
 *  非 inline style（[RR1 d1-N2] 口径勘正——全仓无 CSS stroke 竞争者；边界声明：
 *  表现属性可被未来 CSS `line { stroke }` 类选择器静默压制，新增 stroke 相关
 *  CSS 须排查本钮）；色=该 kind 当前色 [F-UIRES-03 C1 per-kind]） */
function LineToolIcon({ kind, color }: { kind: 'solid' | 'dashed'; color: string }): JSX.Element {
  return (
    <svg width="26" height="12" viewBox="0 0 26 12" aria-hidden="true">
      <line
        x1="2"
        y1="6"
        x2="24"
        y2="6"
        stroke={color}
        strokeWidth="2.2"
        strokeDasharray={kind === 'dashed' ? '5 3' : undefined}
      />
    </svg>
  )
}

export function LineageToolbar(props: {
  mode: 'edit' | 'browse' | 'focus'
}): JSX.Element {
  const mode = props.mode
  const command = useLineageCommandState()
  const lastWriteError = useLineageStore((s) => s.lastWriteError)
  const lineTypeNames = useLineageStore((s) => s.lineTypeNames)
  const flushing = useLineageStore((s) => s.flushing)
  const tool = useLineageViewStore((s) => s.tool)
  const currentLineColor = useLineageViewStore((s) => s.currentLineColor)
  const paletteFor = useLineageViewStore((s) => s.paletteFor)

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
  const view = useLineageViewStore.getState
  // 工具组锁定面：同会话 saving=选择/线型交互钮禁用（§2.2）
  const lock = flushing
  const listOpen = paletteFor !== null
  const dashed = paletteFor === 'dashed'
  // [回炉 R6] 列表单例（渲染进当前展开钮的锚槽内——[F-UIRES-03 C1] paletteFor
  // 归属维；per-kind 选色行写）
  const linetypeMenu = listOpen ? (
    <LineTypeMenu
      names={lineTypeNames}
      currentColor={currentLineColor[dashed ? 'dashed' : 'solid']}
      anchorKind={dashed ? 'dashed' : 'solid'}
      onPick={(color) => view().pickLineColor(dashed ? 'dashed' : 'solid', color)}
      onRename={(index, name) => {
        // 行内改名=一编辑单元：整批写（恰 6——index 定位色行；属当前 folder 会话）
        const next = LINE_TYPE_COLORS.map((_, i) => lineTypeNames[i] ?? '')
        next[index] = name
        store().saveLineTypeNames(next)
      }}
      onOutside={() => view().closePalette()}
    />
  ) : null

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
      {/* [F-UIRES-02 批 B R6] ✋ 字符→手掌 SVG（title 保活+sr-only 保 accessible
          name「选择」） */}
      <button
        type="button"
        className={tool === 'select' ? 'lg-btn ghost on syn-icon-btn' : 'lg-btn ghost syn-icon-btn'}
        data-testid="lineage-tool-select"
        disabled={lock}
        title="小手选择（点选卡/线）"
        onClick={() => view().resetTool()}
      >
        {ICON_HAND}
        <span className="sr-only">选择</span>
      </button>
      {/* [F-UIRES-03 C1] 线型组锚槽（relative）：图标钮（描边=该 kind 当前色
          per-kind）+右独立「展开」chevron 钮——列表挂 paletteFor 指向 kind 的锚槽
          （[回炉 R6] 槽位方案沿承；delta-W5 错位态根除） */}
      <span className="lg-tool-anchor" data-testid="lineage-tool-anchor-solid">
        <button
          type="button"
          className={tool === 'draw-solid' ? 'lg-btn ghost on' : 'lg-btn ghost'}
          data-testid="lineage-tool-solid"
          disabled={lock}
          title="画实线（从卡边锚点拖至目标卡）"
          onClick={() => view().toggleLineTool('solid')}
        >
          <LineToolIcon kind="solid" color={currentLineColor.solid} />
        </button>
        <ExpandButton kind="solid" open={paletteFor === 'solid'} lock={lock} onToggle={view().togglePalette} />
        {listOpen && paletteFor === 'solid' && linetypeMenu}
      </span>
      <span className="lg-tool-anchor" data-testid="lineage-tool-anchor-dashed">
        <button
          type="button"
          className={tool === 'draw-dashed' ? 'lg-btn ghost on' : 'lg-btn ghost'}
          data-testid="lineage-tool-dashed"
          disabled={lock}
          title="画虚线（从卡边锚点拖至目标卡）"
          onClick={() => view().toggleLineTool('dashed')}
        >
          <LineToolIcon kind="dashed" color={currentLineColor.dashed} />
        </button>
        <ExpandButton kind="dashed" open={paletteFor === 'dashed'} lock={lock} onToggle={view().togglePalette} />
        {listOpen && paletteFor === 'dashed' && linetypeMenu}
      </span>
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
      {/* [F-UIRES-03 C1] 线型列表：挂 paletteFor 指向 kind 的展开钮锚槽内 */}
    </div>
  )
}
