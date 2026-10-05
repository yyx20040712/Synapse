// @vitest-environment jsdom
/**
 * [F-UIRES-03 C1] 线型交互链状态机锁定（设计稿 v1.9 §2 C1——三维正交
 * tool×paletteFor×anchor；anchor（picked nodeId）驻留 useDrawLine 现域不
 * 迁 view.store——状态表归属注记，组件面用例见 lineage-c1-clickchain）。
 * 本件=前两维（view.store 单源）迁移矩阵逐格〔N8〕+per-kind 独立（INV-108
 * 线色双值）+localStorage 双键钳制（B4 裁定冒号键形）。always-active 裸
 * describe（K3）。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { LINE_TYPE_COLORS } from '../../../src/shared/models/lineage'
import { useLineageViewStore } from '../../../src/renderer/features/lineage/lineage-view.store'

const SOLID_KEY = 'synapse:linetype:color:solid'
const DASHED_KEY = 'synapse:linetype:color:dashed'

beforeEach(() => {
  localStorage.clear()
  useLineageViewStore.setState({
    mode: 'edit',
    focusSet: [],
    navCollapsed: false,
    navWidth: 208,
    tool: 'select',
    currentLineColor: { solid: LINE_TYPE_COLORS[0], dashed: LINE_TYPE_COLORS[0] },
    paletteFor: null
  })
})

afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('F-UIRES-03 C1 状态机·tool 维迁移矩阵（N8 逐格）', () => {
  it('select+点 solid 图标→draw-solid 且 paletteFor 归 null（切模式即收板——delta-W5）', () => {
    useLineageViewStore.getState().togglePalette('solid')
    useLineageViewStore.getState().toggleLineTool('solid')
    const v = useLineageViewStore.getState()
    expect(v.tool).toBe('draw-solid')
    expect(v.paletteFor).toBeNull()
  })

  it('select+点 dashed 图标→draw-dashed 且 paletteFor 归 null', () => {
    // [RR1 k1-W3] 补 paletteFor 前置（对称 solid 孪生）——使「归 null」断言
    // 可判别（无前置=初始恒 null 假绿面封死）
    useLineageViewStore.getState().togglePalette('dashed')
    useLineageViewStore.getState().toggleLineTool('dashed')
    const v = useLineageViewStore.getState()
    expect(v.tool).toBe('draw-dashed')
    expect(v.paletteFor).toBeNull()
  })

  it('draw-solid+点另一 kind 图标→draw-dashed 且 paletteFor 归 null（delta-W5）', () => {
    useLineageViewStore.setState({ tool: 'draw-solid', paletteFor: 'solid' })
    useLineageViewStore.getState().toggleLineTool('dashed')
    const v = useLineageViewStore.getState()
    expect(v.tool).toBe('draw-dashed')
    expect(v.paletteFor).toBeNull()
  })

  it('draw-dashed+点另一 kind 图标→draw-solid 且 paletteFor 归 null', () => {
    useLineageViewStore.setState({ tool: 'draw-dashed', paletteFor: 'dashed' })
    useLineageViewStore.getState().toggleLineTool('solid')
    const v = useLineageViewStore.getState()
    expect(v.tool).toBe('draw-solid')
    expect(v.paletteFor).toBeNull()
  })

  it('draw-X+再点同图标=无操作（N9：非双击退出——tool/paletteFor 均不动）', () => {
    useLineageViewStore.setState({ tool: 'draw-solid', paletteFor: null })
    useLineageViewStore.getState().toggleLineTool('solid')
    const v = useLineageViewStore.getState()
    expect(v.tool).toBe('draw-solid')
    expect(v.paletteFor).toBeNull()
  })
})

describe('F-UIRES-03 C1 状态机·paletteFor 维（展开钮 toggle）', () => {
  it('select 态点 solid 展开钮→paletteFor=solid；再点同钮→null（toggle）', () => {
    useLineageViewStore.getState().togglePalette('solid')
    expect(useLineageViewStore.getState().paletteFor).toBe('solid')
    useLineageViewStore.getState().togglePalette('solid')
    expect(useLineageViewStore.getState().paletteFor).toBeNull()
  })

  it('任意 tool 点 kind K 展开钮→paletteFor=K（draw 态也可开板——选下一根边色）', () => {
    useLineageViewStore.setState({ tool: 'draw-solid', paletteFor: null })
    useLineageViewStore.getState().togglePalette('dashed')
    expect(useLineageViewStore.getState().paletteFor).toBe('dashed')
  })

  it('paletteFor=solid+点 dashed 展开钮→paletteFor=dashed（单例随迁）', () => {
    useLineageViewStore.getState().togglePalette('solid')
    useLineageViewStore.getState().togglePalette('dashed')
    expect(useLineageViewStore.getState().paletteFor).toBe('dashed')
  })

  it('closePalette：paletteFor→null（点外部收板语义——tool 不动）', () => {
    useLineageViewStore.setState({ tool: 'draw-solid', paletteFor: 'solid' })
    useLineageViewStore.getState().closePalette()
    const v = useLineageViewStore.getState()
    expect(v.paletteFor).toBeNull()
    expect(v.tool).toBe('draw-solid')
  })
})

describe('F-UIRES-03 C1 状态机·选色行（per-kind 写+INV-108 线色双值）', () => {
  it('paletteFor=K+点色行→paletteFor=null+写 currentLineColor[K]（另一 kind 不变）', () => {
    useLineageViewStore.setState({ tool: 'draw-solid', paletteFor: 'solid' })
    useLineageViewStore.getState().pickLineColor('solid', LINE_TYPE_COLORS[2]!)
    const v = useLineageViewStore.getState()
    expect(v.paletteFor).toBeNull()
    expect(v.currentLineColor.solid).toBe(LINE_TYPE_COLORS[2])
    expect(v.currentLineColor.dashed).toBe(LINE_TYPE_COLORS[0])
  })

  it('INV-108 线色双值：设 dashed 不动 solid（per-kind 独立互不影响）', () => {
    useLineageViewStore.getState().pickLineColor('dashed', LINE_TYPE_COLORS[3]!)
    const v = useLineageViewStore.getState()
    expect(v.currentLineColor.dashed).toBe(LINE_TYPE_COLORS[3])
    expect(v.currentLineColor.solid).toBe(LINE_TYPE_COLORS[0])
  })

  it('选色行持久化 localStorage 双键（B4 冒号键形）', () => {
    useLineageViewStore.getState().pickLineColor('solid', LINE_TYPE_COLORS[1]!)
    useLineageViewStore.getState().pickLineColor('dashed', LINE_TYPE_COLORS[4]!)
    expect(localStorage.getItem(SOLID_KEY)).toBe(LINE_TYPE_COLORS[1])
    expect(localStorage.getItem(DASHED_KEY)).toBe(LINE_TYPE_COLORS[4])
  })
})

describe('F-UIRES-03 C1 状态机·Esc 分层退出（delta-W3a）', () => {
  it('paletteFor≠null 时 Esc 只关板（tool 保持画线态）', () => {
    useLineageViewStore.setState({ tool: 'draw-solid', paletteFor: 'solid' })
    useLineageViewStore.getState().escapeStep()
    const v = useLineageViewStore.getState()
    expect(v.paletteFor).toBeNull()
    expect(v.tool).toBe('draw-solid')
  })

  it('paletteFor=null 时 Esc=退画线（→select）', () => {
    useLineageViewStore.setState({ tool: 'draw-dashed', paletteFor: null })
    useLineageViewStore.getState().escapeStep()
    const v = useLineageViewStore.getState()
    expect(v.tool).toBe('select')
    expect(v.paletteFor).toBeNull()
  })

  it('select+paletteFor=null 时 Esc=no-op', () => {
    useLineageViewStore.getState().escapeStep()
    const v = useLineageViewStore.getState()
    expect(v.tool).toBe('select')
    expect(v.paletteFor).toBeNull()
  })
})

describe('F-UIRES-03 C1 状态机·中止复位面', () => {
  it('resetTool：tool→select+paletteFor→null', () => {
    useLineageViewStore.setState({ tool: 'draw-solid', paletteFor: 'solid' })
    useLineageViewStore.getState().resetTool()
    const v = useLineageViewStore.getState()
    expect(v.tool).toBe('select')
    expect(v.paletteFor).toBeNull()
  })

  it('setMode：模式切换=工具态中止（paletteFor 一并收）', () => {
    useLineageViewStore.setState({ tool: 'draw-solid', paletteFor: 'solid' })
    useLineageViewStore.getState().setMode('browse')
    const v = useLineageViewStore.getState()
    expect(v.tool).toBe('select')
    expect(v.paletteFor).toBeNull()
  })

  it('resetForMount：paletteFor 归 null+色值不重置（per-kind 色跨挂载驻留）', () => {
    useLineageViewStore.setState({
      tool: 'draw-solid',
      paletteFor: 'dashed',
      currentLineColor: { solid: LINE_TYPE_COLORS[1]!, dashed: LINE_TYPE_COLORS[2]! }
    })
    useLineageViewStore.getState().resetForMount()
    const v = useLineageViewStore.getState()
    expect(v.tool).toBe('select')
    expect(v.paletteFor).toBeNull()
    expect(v.currentLineColor.solid).toBe(LINE_TYPE_COLORS[1])
    expect(v.currentLineColor.dashed).toBe(LINE_TYPE_COLORS[2])
  })
})

describe('F-UIRES-03 C1 localStorage 读面钳制（读写时钳回色板值域）', () => {
  it('合法存量：双键各自恢复（per-kind 独立）', async () => {
    localStorage.setItem(SOLID_KEY, LINE_TYPE_COLORS[2]!)
    localStorage.setItem(DASHED_KEY, LINE_TYPE_COLORS[5]!)
    vi.resetModules()
    const fresh = await import('../../../src/renderer/features/lineage/lineage-view.store')
    const v = fresh.useLineageViewStore.getState()
    expect(v.currentLineColor.solid).toBe(LINE_TYPE_COLORS[2])
    expect(v.currentLineColor.dashed).toBe(LINE_TYPE_COLORS[5])
  })

  it('非法/缺省：回落 LINE_TYPE_COLORS[0]（同 kind 缺省）', async () => {
    localStorage.setItem(SOLID_KEY, '#ff0000')
    // dashed 键缺省
    vi.resetModules()
    const fresh = await import('../../../src/renderer/features/lineage/lineage-view.store')
    const v = fresh.useLineageViewStore.getState()
    expect(v.currentLineColor.solid).toBe(LINE_TYPE_COLORS[0])
    expect(v.currentLineColor.dashed).toBe(LINE_TYPE_COLORS[0])
  })
})
