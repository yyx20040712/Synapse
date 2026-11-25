// b3: B5 wave A 纯拆件（2026-11-25——自 LineageToolbar.tsx 拆出；代码与锚
// 注释同迁，行为零变）
/**
 * [B5 设计稿 §3.1/§10.2] LineageEditTools —— 编辑工具组（mockup §3.3：[小手选择]
 * [— 实线(色)][╌ 虚线(色)]；自 LineageToolbar 拆件）。
 *
 * 本波（A 波）只搬不改：工具组仍驻 LineageTimeline、仍仅 edit 模式挂载，宿主
 * .lg-toolbar 的直接子序=保存│选择/线型│撤销重做不变（本件片段返回——不包节点，
 * DOM 结构零变）；testid 全保持。「三模式常驻、browse/focus 只禁用」与迁入页面
 * 顶部单排工具栏属后续波（§2.3/§3.1/§15.1 步骤 4），本波不做。
 *
 * - 线型组 [F-UIRES-03 C1]：每 kind（solid/dashed）=图标钮（描边=该 kind 当前色
 *   per-kind——INV-108）+右独立「展开」chevron 钮；列表=LineTypeMenu 拆件（6 色行+
 *   行内改名=一编辑单元——saveLineTypeNames）。
 * - 工具组锁定面沿承：同会话 saving（任一在途写）=选择/线型交互钮禁用
 *   （INV-94 编辑锁）；保存/撤销/重做钮按各命令可用性（留宿主 LineageToolbar）。
 * - 工具组直连双 store（view 工具态+lineage 会话/色行名——LineageModeBar
 *   直连 view.store 同型）；本件零 props——是否挂载由宿主按 mode 决定
 *   （原「props 面=mode 容器注入沿承」指宿主 LineageToolbar 的 mode prop）。
 *
 * ── 接口层 ── export function LineageEditTools(): JSX.Element
 *
 * ── 架构层 ── 直连 view.store（工具态）+lineage.store（色行名）；写路径全部经
 * store 动作（registry 单一写路径），零直写。
 */
import { useLineageStore } from './lineage.store'
import { useLineageViewStore } from './lineage-view.store'
import { LINE_TYPE_COLORS } from '@shared/models/lineage'
import { ICON_HAND } from '../../shared/icons'
import { ExpandButton, LineTypeMenu } from './LineTypeMenu'

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

export function LineageEditTools(): JSX.Element {
  const lineTypeNames = useLineageStore((s) => s.lineTypeNames)
  const flushing = useLineageStore((s) => s.flushing)
  const tool = useLineageViewStore((s) => s.tool)
  const currentLineColor = useLineageViewStore((s) => s.currentLineColor)
  const paletteFor = useLineageViewStore((s) => s.paletteFor)

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
    <>
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
      {/* [F-UIRES-03 C1] 线型列表：挂 paletteFor 指向 kind 的展开钮锚槽内 */}
    </>
  )
}
