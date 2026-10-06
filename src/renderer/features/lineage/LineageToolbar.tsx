// b3: P7-H
/**
 * [T3-P7B→F-LGRAPH-01②U2] LineageToolbar —— 编辑工具组重做（mockup §3.3：
 * [保存●]│[小手选择][— 实线(色)][╌ 虚线(色)]│[↶撤销][↷重做]——**仅 edit
 * 模式可见**（browse/focus=仅 drag-hint）。[F-ALIGN-01 2026-10-04] 建点
 * 钮随手动建点路径全退役删除（A11 组成员收窄——节点唯一来源=入库/移动
 * 两路，INV-NEW-1）。
 *
 * - 保存钮（软盘图标）四态：dirty=亮可点/clean=灰暗禁用/saving=spinner+
 *   工具组锁定/error=行内错误+重试钮（§2.2——退役行 4：保存 chip 零残留，
 *   testid=lineage-save-btn/lineage-save-error/lineage-save-retry）。
 * - 线型组 [F-UIRES-03 C1]：每 kind（solid/dashed）=图标钮（描边=该 kind
 *   当前色 per-kind——INV-108）+右独立「展开」chevron 钮（aria-expanded+
 *   aria-label「展开色板」——testid lineage-tool-{kind}-expand；paletteFor
 *   归属维渲染锚槽）。点图标本体=进/切 draw-X 且收板；draw-X 再点同图标=
 *   no-op〔N9〕；点外部=收板（点击不吞）。线型列表=LineTypeMenu 拆件
 *   （6 色行+行内改名=一编辑单元——saveLineTypeNames 暂存；改名功能保留）。
 * - 撤销/重做钮+Ctrl+Z/Y=U1 会话栈（栈空灰暗；键盘接线=LineagePage——
 *   Esc 分层退出接线同页）。
 * - 工具组直连双 store（view 工具态+lineage 会话/色行名——LineageModeBar
 *   直连 view.store 同型；props 面=mode 容器注入沿承）。
 */
import { useLineageStore } from './lineage.store'
import { useLineageViewStore } from './lineage-view.store'
import { LINE_TYPE_COLORS } from '@shared/models/lineage'
import { ICON_HAND, ICON_REDO, ICON_UNDO } from '../../shared/icons'
import { RetryButton } from '../../shared/ui/RetryButton'
import { ExpandButton, LineTypeMenu } from './LineTypeMenu'

/** 线型图标（13×9 线样——实/虚两态；描边载体=SVG **表现属性** stroke={color}
 *  非 inline style（[RR1 d1-N2] 口径勘正——全仓无 CSS stroke 竞争者；边界
 *  声明：表现属性可被未来 CSS `line { stroke }` 类选择器静默压制，新增
 *  stroke 相关 CSS 须排查本钮）；色=该 kind 当前色 [F-UIRES-03 C1 per-kind]） */
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

/** 软盘保存图标（dirty=角点标记） */
function SaveIcon({ marked }: { marked: boolean }): JSX.Element {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" aria-hidden="true">
      <path d="M1.5 1.5h8.5L11.5 3v8.5h-10z" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <path d="M3.5 1.5v3.5h5V1.5" fill="none" stroke="currentColor" strokeWidth="1" />
      <rect x="3.5" y="7" width="6" height="4.5" fill="none" stroke="currentColor" strokeWidth="1" />
      {marked && <circle cx="10" cy="10" r="1.6" fill="currentColor" />}
    </svg>
  )
}

export function LineageToolbar(props: {
  mode: 'edit' | 'browse' | 'focus'
}): JSX.Element {
  const mode = props.mode
  const saveStatus = useLineageStore((s) => s.saveStatus)
  const lastWriteError = useLineageStore((s) => s.lastWriteError)
  const lineTypeNames = useLineageStore((s) => s.lineTypeNames)
  // 会话栈深（撤销/重做钮灰暗判定——响应式订阅）
  const undoDepth = useLineageStore((s) => s.undoStack.length)
  const redoDepth = useLineageStore((s) => s.redoStack.length)
  const tool = useLineageViewStore((s) => s.tool)
  const currentLineColor = useLineageViewStore((s) => s.currentLineColor)
  const paletteFor = useLineageViewStore((s) => s.paletteFor)

  if (mode !== 'edit') {
    // 非 edit：工具组隐藏——仅 drag-hint（三态文案）
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
  const saving = saveStatus === 'saving'
  // 工具组锁定面：saving=全部交互钮禁用（§2.2）；保存钮 clean 禁用（灰暗）
  const lock = saving
  const undoDisabled = lock || undoDepth === 0
  const redoDisabled = lock || redoDepth === 0
  const listOpen = paletteFor !== null
  // [回炉 R6] 列表单例（渲染进当前展开钮的锚槽内——[F-UIRES-03 C1] paletteFor
  // 归属维；per-kind 选色行写）
  const linetypeMenu = listOpen ? (
    <LineTypeMenu
      names={lineTypeNames}
      currentColor={currentLineColor[paletteFor === 'dashed' ? 'dashed' : 'solid']}
      anchorKind={paletteFor === 'dashed' ? 'dashed' : 'solid'}
      onPick={(color) => view().pickLineColor(paletteFor === 'dashed' ? 'dashed' : 'solid', color)}
      onRename={(index, name) => {
        // 行内改名=一编辑单元：整批写（恰 6——index 定位色行）
        const next = LINE_TYPE_COLORS.map((_, i) => lineTypeNames[i] ?? '')
        next[index] = name
        store().saveLineTypeNames(next)
      }}
      onOutside={() => view().closePalette()}
    />
  ) : null

  return (
    <div className="lg-toolbar tools">
      {/* [F-UIRES-02 批 B R6] 保存钮去文字（用户票面点名例）：SaveIcon+dirty
          角点+saving spinner 保留；title/aria-label 随态同源；sr-only 保
          textContent 恰=「保存」 */}
      <button
        type="button"
        className="lg-btn save"
        data-testid="lineage-save-btn"
        disabled={saveStatus === 'clean' || saving}
        title={saveStatus === 'error' ? '重试保存' : '保存全部修改（Ctrl+S 语义=会话批量落库）'}
        aria-label={saveStatus === 'error' ? '重试保存' : '保存全部修改（Ctrl+S 语义=会话批量落库）'}
        onClick={() => store().save()}
      >
        {saving ? (
          <span className="spinner" aria-label="保存中" />
        ) : (
          <SaveIcon marked={saveStatus === 'dirty'} />
        )}
        <span className="sr-only">保存</span>
      </button>
      <span className="lg-sep" />
      {/* [F-ALIGN-01] 建点钮随手动建点路径退役删除（组=保存│选择/线型│
          撤销重做）——e2e 断言锚零残留（工单三.5 词表） */}
      {/* [F-UIRES-02 批 B R6] ✋ 字符→手掌 SVG（title 保活+sr-only 保
          accessible name「选择」） */}
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
          per-kind）+右独立「展开」chevron 钮——列表挂 paletteFor 指向 kind 的
          锚槽（[回炉 R6] 槽位方案沿承；delta-W5 错位态根除） */}
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
      {/* [F-UIRES-02 批 B R5] ↶↷ 字符→ICON_UNDO/ICON_REDO（两域复用）；补
          aria-label（原仅 title）；sr-only 保 textContent/accessible name */}
      <button
        type="button"
        className="lg-btn ghost syn-icon-btn"
        data-testid="lineage-undo"
        disabled={undoDisabled}
        title="撤销（Ctrl+Z）"
        aria-label="撤销（Ctrl+Z）"
        onClick={() => store().undo()}
      >
        {ICON_UNDO}
        <span className="sr-only">撤销</span>
      </button>
      <button
        type="button"
        className="lg-btn ghost syn-icon-btn"
        data-testid="lineage-redo"
        disabled={redoDisabled}
        title="重做（Ctrl+Y）"
        aria-label="重做（Ctrl+Y）"
        onClick={() => store().redo()}
      >
        {ICON_REDO}
        <span className="sr-only">重做</span>
      </button>
      <span className="drag-hint" data-testid="drag-hint">
        {/* [F-UIRES-03 C1→C2·P6] 终态文案（v1.11① CAD 正名）：画线=从卡边锚点
            拖至目标卡（点两卡径=用户确认保留的隐藏等效径）；拖动段=C3 月内
            调序（INV-107 改月单口沿承） */}
        编辑中：拖动＝月内调序 · 画线＝从卡边锚点拖至目标卡
      </span>
      {saveStatus === 'error' && (
        <span
          className="lg-save-error"
          role="alert"
          data-testid="lineage-save-error"
          style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
        >
          保存失败：{lastWriteError}
          {/* [F-UIRES-02 批 B R2] 文字重试钮→共享 RetryButton（testid 受锁锚透传） */}
          <RetryButton testId="lineage-save-retry" onClick={() => store().retrySave()} />
        </span>
      )}
      {/* [F-UIRES-03 C1] 线型列表：挂 paletteFor 指向 kind 的展开钮锚槽内
          （[回炉 R6] 锚槽渲染已上移至两锚槽内） */}
    </div>
  )
}
