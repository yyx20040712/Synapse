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
 * - 线型图标（实线/虚线）线样颜色=当前线型色（选色后变色——inline stroke）；
 *   A12 交互（select 点=armed+列表展开/armed 再点=取消回 select/点另一图标=
 *   切换+列表随迁/点外部=收起 armed 保持/选行=收起+变色+✓）——工具态驻
 *   lineage-view.store（申报）。线型列表=LineTypeMenu 拆件（6 色行+行内改名
 *   =一编辑单元——saveLineTypeNames 暂存）。
 * - 撤销/重做钮+Ctrl+Z/Y=U1 会话栈（栈空灰暗；键盘接线=LineagePage）。
 * - 工具组直连双 store（view 工具态+lineage 会话/色行名——LineageModeBar
 *   直连 view.store 同型；props 面=mode 容器注入沿承）。
 */
import { useLineageStore } from './lineage.store'
import { useLineageViewStore } from './lineage-view.store'
import { LINE_TYPE_COLORS } from '@shared/models/lineage'
import { ICON_HAND, ICON_REDO, ICON_UNDO } from '../../shared/icons'
import { RetryButton } from '../../shared/ui/RetryButton'
import { LineTypeMenu } from './LineTypeMenu'

/** 线型图标（13×9 线样——实/虚两态；stroke=当前线型色） */
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
  const linetypeListOpenFor = useLineageViewStore((s) => s.linetypeListOpenFor)

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
  const listOpen = linetypeListOpenFor !== null
  // [回炉 R6] 列表单例（渲染进当前展开图标的锚槽内——随迁）
  const linetypeMenu = listOpen ? (
    <LineTypeMenu
      names={lineTypeNames}
      currentColor={currentLineColor}
      anchorKind={linetypeListOpenFor === 'dashed' ? 'dashed' : 'solid'}
      onPick={(color) => view().pickLineColor(color)}
      onRename={(index, name) => {
        // 行内改名=一编辑单元：整批写（恰 6——index 定位色行）
        const next = LINE_TYPE_COLORS.map((_, i) => lineTypeNames[i] ?? '')
        next[index] = name
        store().saveLineTypeNames(next)
      }}
      onOutside={() => view().closeLinetypeList()}
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
      {/* [回炉 R6] 线型图标锚槽（relative）：列表挂**当前展开图标**正下方
          （solid/dashed 随迁——ref 槽位方案：列表渲染进 open 锚内） */}
      <span className="lg-tool-anchor" data-testid="lineage-tool-anchor-solid">
        <button
          type="button"
          className={tool === 'draw-solid' ? 'lg-btn ghost on' : 'lg-btn ghost'}
          data-testid="lineage-tool-solid"
          disabled={lock}
          title="画实线（点击卡片锚点拖到目标）"
          onClick={() => view().toggleLineTool('solid')}
        >
          <LineToolIcon kind="solid" color={currentLineColor} />
        </button>
        {listOpen && linetypeListOpenFor === 'solid' && linetypeMenu}
      </span>
      <span className="lg-tool-anchor" data-testid="lineage-tool-anchor-dashed">
        <button
          type="button"
          className={tool === 'draw-dashed' ? 'lg-btn ghost on' : 'lg-btn ghost'}
          data-testid="lineage-tool-dashed"
          disabled={lock}
          title="画虚线（点击卡片锚点拖到目标）"
          onClick={() => view().toggleLineTool('dashed')}
        >
          <LineToolIcon kind="dashed" color={currentLineColor} />
        </button>
        {listOpen && linetypeListOpenFor === 'dashed' && linetypeMenu}
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
        编辑中：点卡片月标改月 · 拖动＝月内调序 · 画线＝点线型工具后从卡边拖出
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
      {/* A12 线型列表：挂当前 armed/交互图标正下方（随迁——[回炉 R6] 锚槽
          渲染已上移至两图标锚槽内） */}
    </div>
  )
}
