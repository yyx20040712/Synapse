// @vitest-environment jsdom
/**
 * [B5 设计稿 §4 无 dim 的聚焦视觉规格/§4.2 第 6 条/§4.3/§11.2/§13.1 INV-145——wave C 2026-11-25]
 * 本件自 lineage-zoom-dim.test.tsx 更名并重写（旧文件名与全部 dim 合同退役——不是只删红例）：
 * - 翻案：原「聚焦 dim（非聚焦卡/全部线 opacity 0.3；bright=focus∪双向一度邻接常亮）」退役。
 *   所有模式、空/非空聚焦集，卡与边一律全亮（不挂 .dim、根不挂 .dimmed-focus、边无 inline
 *   opacity、无 bright 邻接计算）；仅 focus 模式给 focusSet 本集卡 .focused（accent 描边）；
 *   edit/browse 保留 focusSet 数据但不显示描边，回 focus 恢复。
 * - focus 模式边 hover 扫描由独立 focusMode 信号驱动（空集也可 hover；browse 不走该扫描）。
 * - 「缩放后不变」：zoom 改变不引入任何 dim/聚焦视觉变化。
 * - 无 dim CSS：皮肤件零 .dim/.dimmed-focus 规则；accent 描边在场；拖拽 .tl-edges.dimmed 保留
 *   （拖拽 dimmed 是独立视觉态，不属于被删的 focus dim——不得误删）。
 * - 原「A1 挂载 reset」「U7 画布缩放」非 dim 用例原样迁入（缩放角标用例随 ZoomBadge 退役，
 *   百分比复位钮断言迁 lineage-toolbar-session 缩放控件）。
 * always-active 裸 describe。
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { LineageEdge, LineageNode } from '../../../src/shared/models/lineage'
import { LineageTimeline } from '../../../src/renderer/features/lineage/LineageTimeline'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import { useLineageViewStore } from '../../../src/renderer/features/lineage/lineage-view.store'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

const LINEAGE_DIR = join(process.cwd(), 'src/renderer/features/lineage')
const lineageCss = readFileSync(join(process.cwd(), 'src/renderer/shared/theme-lineage.css'), 'utf8')
const navCss = readFileSync(join(process.cwd(), 'src/renderer/shared/theme-lineage-nav.css'), 'utf8')
const dragCss = readFileSync(join(process.cwd(), 'src/renderer/shared/theme-lineage-drag.css'), 'utf8')

function node(id: string, patch: Partial<LineageNode> = {}): LineageNode {
  return {
    id,
    paperId: `paper-${id}`,
    title: `节点${id}`,
    year: 2022,
    x: null,
    y: null,
    month: null,
    slot: null,
    folderId: '__main__',
    createdAt: 't',
    updatedAt: 't',
    ...patch
  }
}

function edge(id: string, from: string, to: string): LineageEdge {
  return { id, fromNode: from, toNode: to, label: '', dashed: false, color: '#1e3a8a', createdAt: 't', updatedAt: 't' }
}

let root: Root | null = null
let host: HTMLDivElement | null = null

function mount(element: JSX.Element): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(element)
  })
}

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
  vi.unstubAllGlobals()
  useLineageStore.setState({ nodes: [], edges: [], queue: [], undoStack: [], redoStack: [], saveStatus: 'clean' })
  useLineageViewStore.setState({ mode: 'browse', focusSet: [], tool: 'select', zoom: 1 })
})

function cardOf(id: string): HTMLElement {
  const el = host?.querySelector(`.tl-card[data-node-id="${id}"]`)
  if (!(el instanceof HTMLElement)) throw new Error(`小卡未渲染：${id}`)
  return el
}
const setView = (patch: Partial<ReturnType<typeof useLineageViewStore.getState>>): void => {
  act(() => {
    useLineageViewStore.setState(patch)
  })
}
const CHAIN = (): { nodes: LineageNode[]; edges: LineageEdge[] } => ({
  nodes: [node('A', { month: 9 }), node('B', { month: 9 }), node('C', { month: 10 })],
  edges: [edge('e-ab', 'A', 'B')]
})

describe('[B5 §4.1] 无 dim 聚焦视觉——全亮', () => {
  it('focus 集非空：所有卡不挂 .dim（含非邻接卡）；连线层根不挂 .dimmed-focus、逐径无 .dim、无 inline opacity（原 bright∪邻接判定退役）', () => {
    setView({ mode: 'focus', focusSet: ['A'] })
    const g = CHAIN()
    mount(<LineageTimeline nodes={g.nodes} edges={g.edges} />)
    // 原 C4 判定：B（A 的一度邻接）常亮、C（非邻接）dim——现一律全亮
    expect(cardOf('A').classList.contains('dim')).toBe(false)
    expect(cardOf('B').classList.contains('dim')).toBe(false)
    expect(cardOf('C').classList.contains('dim')).toBe(false)
    expect(host?.querySelector('.tl-card.dim')).toBeNull()
    const svg = host?.querySelector('svg.tl-edges')
    expect(svg?.classList.contains('dimmed-focus')).toBe(false)
    expect(host?.querySelector('path.tl-edge.dim')).toBeNull()
    for (const path of host?.querySelectorAll('path.tl-edge') ?? []) {
      expect((path as SVGPathElement).style.opacity, '基态=零 inline opacity（无 dim）').toBe('')
    }
  })

  it('focus 集空：无 .dim、无 .dimmed-focus、无 .focused（空集合法——与集非空同为全亮）', () => {
    setView({ mode: 'focus', focusSet: [] })
    const g = CHAIN()
    mount(<LineageTimeline nodes={g.nodes} edges={g.edges} />)
    for (const id of ['A', 'B', 'C']) {
      expect(cardOf(id).classList.contains('dim'), `${id} 全亮`).toBe(false)
      expect(cardOf(id).classList.contains('focused'), `${id} 空集无描边`).toBe(false)
    }
    expect(host?.querySelector('svg.tl-edges')?.classList.contains('dimmed-focus')).toBe(false)
  })

  it('browse/edit 集非空同样全亮（focusSet 数据跨模式保留但零 dim）', () => {
    for (const mode of ['browse', 'edit'] as const) {
      setView({ mode, focusSet: ['A'] })
      const g = CHAIN()
      mount(<LineageTimeline nodes={g.nodes} edges={g.edges} />)
      for (const id of ['A', 'B', 'C']) expect(cardOf(id).classList.contains('dim'), `${mode}：${id}`).toBe(false)
      expect(host?.querySelector('svg.tl-edges')?.classList.contains('dimmed-focus')).toBe(false)
      act(() => {
        root?.unmount()
      })
      root = null
      host?.remove()
    }
  })
})

describe('[B5 §4.1] accent 描边——仅 focus 模式给 focusSet 本集卡 .focused', () => {
  it('focus 集非空：本集卡挂 .focused，非本集卡不挂', () => {
    setView({ mode: 'focus', focusSet: ['A', 'C'] })
    const g = CHAIN()
    mount(<LineageTimeline nodes={g.nodes} edges={g.edges} />)
    expect(cardOf('A').classList.contains('focused')).toBe(true)
    expect(cardOf('C').classList.contains('focused')).toBe(true)
    expect(cardOf('B').classList.contains('focused'), '邻接卡不入集（无邻接加亮）').toBe(false)
    expect(host?.querySelectorAll('.tl-card.focused')).toHaveLength(2)
  })

  it('edit/browse 保留 focusSet 数据但不显示聚焦描边；回 focus 恢复描边（模式切换不清集合）', () => {
    setView({ mode: 'focus', focusSet: ['A'] })
    const g = CHAIN()
    mount(<LineageTimeline nodes={g.nodes} edges={g.edges} />)
    expect(cardOf('A').classList.contains('focused')).toBe(true)
    act(() => {
      useLineageViewStore.getState().setMode('browse')
    })
    expect(useLineageViewStore.getState().focusSet, '集合保留').toEqual(['A'])
    expect(host?.querySelectorAll('.tl-card.focused'), 'browse：零描边').toHaveLength(0)
    act(() => {
      useLineageViewStore.getState().setMode('edit')
    })
    expect(useLineageViewStore.getState().focusSet).toEqual(['A'])
    expect(host?.querySelectorAll('.tl-card.focused'), 'edit：零描边').toHaveLength(0)
    act(() => {
      useLineageViewStore.getState().setMode('focus')
    })
    expect(cardOf('A').classList.contains('focused'), '回 focus：描边恢复').toBe(true)
    expect(host?.querySelectorAll('.tl-card.focused')).toHaveLength(1)
  })

  it('选中 .sel 与聚焦描边可组合（不能用 dim 代替选中环）', () => {
    setView({ mode: 'focus', focusSet: ['A'] })
    const g = CHAIN()
    mount(<LineageTimeline nodes={g.nodes} edges={g.edges} selectedNodeId="A" />)
    expect(cardOf('A').classList.contains('sel')).toBe(true)
    expect(cardOf('A').classList.contains('focused')).toBe(true)
    expect(cardOf('A').classList.contains('dim')).toBe(false)
  })
})

describe('[B5 §4.1/§4.2 第 3 条] focus 模式边 hover——独立 focusMode 信号（与聚焦集是否为空无关）', () => {
  const rafs: FrameRequestCallback[] = []
  const stubRaf = (): void => {
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback): number => {
      rafs.push(cb)
      return rafs.length
    })
    vi.stubGlobal('cancelAnimationFrame', () => undefined)
  }
  const flushRafs = (): void => {
    act(() => {
      rafs.splice(0).forEach((cb) => cb(0))
    })
  }
  const stubRect = (el: Element, x: number, y: number, w = 128, h = 72): void => {
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
      left: x, top: y, right: x + w, bottom: y + h, width: w, height: h, x, y,
      toJSON: () => ({})
    } as unknown as DOMRect)
  }
  /** d 属性最长段中点（jsdom 零布局——几何由 d 值单源推导） */
  const longestSegMid = (d: string): { x: number; y: number } => {
    const nums = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number)
    const pts: Array<{ x: number; y: number }> = []
    for (let i = 0; i + 1 < nums.length; i += 2) pts.push({ x: nums[i]!, y: nums[i + 1]! })
    let best = { x: 0, y: 0 }
    let bestLen = -1
    for (let i = 0; i + 1 < pts.length; i++) {
      const len = Math.hypot(pts[i + 1]!.x - pts[i]!.x, pts[i + 1]!.y - pts[i]!.y)
      if (len > bestLen) {
        bestLen = len
        best = { x: (pts[i]!.x + pts[i + 1]!.x) / 2, y: (pts[i]!.y + pts[i + 1]!.y) / 2 }
      }
    }
    return best
  }
  const docMove = (x: number, y: number): void => {
    act(() => { document.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: x, clientY: y })) })
  }
  const visEdge = (id: string): SVGPathElement => host!.querySelector(`path.tl-edge[data-edge-id="${id}"]`) as SVGPathElement
  const hitEdge = (id: string): SVGElement => {
    const el = host!.querySelector(`.tl-edge-hit[data-edge-id="${id}"]`)
    if (!(el instanceof SVGElement)) throw new Error('命中层未渲染')
    return el
  }
  /** 布局：A(12,30) B(412,30) 同月框；边 e1（A→B） */
  const layout = (): void => {
    stubRaf()
    const nodes = [node('A'), node('B')]
    const edges = [edge('e1', 'A', 'B')]
    useLineageStore.setState({ nodes, edges, saveStatus: 'clean', queue: [], undoStack: [], redoStack: [] })
    mount(<LineageTimeline nodes={nodes} edges={edges} />)
    stubRect(host!.querySelector('.month-frame') as HTMLElement, 0, 0, 800, 200)
    stubRect(host!.querySelector('.tl-content') as HTMLElement, 0, 0, 800, 400)
    stubRect(host!.querySelector('.tl-card[data-node-id="A"]') as HTMLElement, 12, 30)
    stubRect(host!.querySelector('.tl-card[data-node-id="B"]') as HTMLElement, 412, 30)
    flushRafs()
  }

  it('focus 空集：hover 扫描激活——指针落线身挂 .hovered、移开即撤；线不挂 .dim（原「空集=零 hover 面」翻转）', () => {
    setView({ mode: 'focus', focusSet: [] })
    layout()
    const before = visEdge('e1')
    expect(before.classList.contains('dim')).toBe(false)
    const mid = longestSegMid(hitEdge('e1').getAttribute('d') ?? '')
    docMove(mid.x, mid.y)
    expect(visEdge('e1').classList.contains('hovered'), '空集也可 hover（focusMode 驱动）').toBe(true)
    expect(visEdge('e1').classList.contains('dim')).toBe(false)
    docMove(700, 500)
    expect(visEdge('e1').classList.contains('hovered')).toBe(false)
  })

  it('focus 集非空：hover 命中线挂 .hovered 且不挂 .dim（原「dim+hovered 并挂」翻转）', () => {
    setView({ mode: 'focus', focusSet: ['C'] })
    layout()
    const mid = longestSegMid(hitEdge('e1').getAttribute('d') ?? '')
    docMove(mid.x, mid.y)
    expect(visEdge('e1').classList.contains('hovered')).toBe(true)
    expect(visEdge('e1').classList.contains('dim')).toBe(false)
    expect(host!.querySelector('svg.tl-edges')?.classList.contains('dimmed-focus')).toBe(false)
  })

  it('browse 不走 focus hover 扫描（对照：browseScan=线名 tooltip 域，不挂 .hovered）', () => {
    setView({ mode: 'browse', focusSet: [] })
    layout()
    const mid = longestSegMid(hitEdge('e1').getAttribute('d') ?? '')
    docMove(mid.x, mid.y)
    expect(visEdge('e1').classList.contains('hovered')).toBe(false)
  })
})

describe('[B5 §4.1] 缩放后不变', () => {
  it('zoom 1→1.5→0.6：无 dim、本集卡 .focused 不变、边无 inline opacity', () => {
    setView({ mode: 'focus', focusSet: ['A'] })
    const g = CHAIN()
    mount(<LineageTimeline nodes={g.nodes} edges={g.edges} />)
    for (const zoom of [1.5, 0.6, 1]) {
      setView({ zoom })
      for (const id of ['A', 'B', 'C']) expect(cardOf(id).classList.contains('dim'), `zoom=${zoom}：${id}`).toBe(false)
      expect(cardOf('A').classList.contains('focused'), `zoom=${zoom}：本集卡描边不变`).toBe(true)
      expect(host?.querySelector('svg.tl-edges')?.classList.contains('dimmed-focus')).toBe(false)
      for (const path of host?.querySelectorAll('path.tl-edge') ?? []) {
        expect((path as SVGPathElement).style.opacity).toBe('')
      }
    }
  })
})

describe('[B5 §4.2 第 1/4/5 条] 无 dim CSS 与旧链零残留', () => {
  it('皮肤件零 .tl-card.dim/.tl-edge.dim/.dimmed-focus 规则；accent 描边=2px accent outline、offset 1px', () => {
    const skins = lineageCss + navCss
    expect(skins).not.toMatch(/\.tl-card\.dim\b/)
    expect(skins).not.toMatch(/\.tl-edge\.dim\b/)
    expect(skins).not.toContain('dimmed-focus')
    expect(navCss).toMatch(/\.tl-card\.focused\s*\{[^}]*outline:\s*2px solid var\(--accent\);[^}]*outline-offset:\s*1px/)
  })

  it('拖拽 dimmed（独立视觉态）保留——不得随 focus dim 误删；普通 hover 回升规则保留', () => {
    expect(dragCss).toMatch(/\.tl-edges\.dimmed\s*\{\s*opacity:\s*\.18;/)
    expect(lineageCss).toMatch(/\.tl-edge\.hovered\s*\{\s*stroke-width:\s*2\.6;/)
    expect(lineageCss).not.toMatch(/\.tl-edge\.hovered[^{]*\{[^}]*opacity/) // 回升值=inline 单源（RR10）
  })

  it('源码级零残留：focus-bright.ts/ZoomBadge.tsx 已删；timeline-interactions 不再 import 判定集、不产出 bright/dim', () => {
    expect(existsSync(join(LINEAGE_DIR, 'focus-bright.ts')), 'focus-bright.ts 不得回填').toBe(false)
    expect(existsSync(join(LINEAGE_DIR, 'ZoomBadge.tsx')), 'ZoomBadge.tsx 不得回填').toBe(false)
    const interactions = readFileSync(join(LINEAGE_DIR, 'timeline-interactions.ts'), 'utf8')
    expect(interactions).not.toContain('focus-bright')
    expect(interactions).not.toContain('brightIds')
    expect(interactions).not.toContain('dimActive')
    const geom = readFileSync(join(LINEAGE_DIR, 'edge-overlay-geom.ts'), 'utf8')
    expect(geom).not.toMatch(/export function edgeVisualOpacity\(args:\s*\{[^}]*focusDim/)
  })
})

describe('A1 挂载 reset（P-1「进页缺省」直读——与数据暂存 P-2 正交）', () => {
  it('[B4 L2 断言翻转] resetForMount：工具态归位；focusSet 不随挂载清（§2.5 #30 页面切换保留 focusSet）；[B5 设计稿 §2.2 #5 断言翻转] mode 保持原值（原 P-1「进页缺省 browse」退役）；navWidth 记忆不重置（P-17）', () => {
    useLineageViewStore.setState({ mode: 'focus', focusSet: ['A', 'B'], tool: 'draw-solid', paletteFor: 'solid', navWidth: 260 })
    useLineageViewStore.getState().resetForMount()
    const v = useLineageViewStore.getState()
    expect(v.mode).toBe('focus') // resetForMount 只收 tool/paletteFor——不读写 mode（INV-177 新语义；原断言：'browse'）
    expect(v.focusSet).toEqual(['A', 'B']) // 活动图聚焦集驻留（退出聚焦的显式清空不在此径）
    expect(v.tool).toBe('select')
    expect(v.paletteFor).toBeNull()
    expect(v.navWidth).toBe(260) // P-17 记忆不随挂载重置
  })
})

describe('U7 画布缩放（P-4/T9）', () => {
  it('zoom 态：步进 10%+钳 50%–200%；resetZoom 复位 1', () => {
    const v = useLineageViewStore.getState()
    v.zoomStep(1) // 1.0→1.1
    expect(useLineageViewStore.getState().zoom).toBeCloseTo(1.1)
    for (let i = 0; i < 20; i++) v.zoomStep(1)
    expect(useLineageViewStore.getState().zoom).toBe(2) // 钳上限 200%
    for (let i = 0; i < 60; i++) v.zoomStep(-1)
    expect(useLineageViewStore.getState().zoom).toBe(0.5) // 钳下限 50%
    useLineageViewStore.getState().resetZoom()
    expect(useLineageViewStore.getState().zoom).toBe(1)
  })

  it('ctrl+滚轮=缩放（三模式均生效）；非 ctrl 滚轮不缩放', () => {
    useLineageViewStore.setState({ mode: 'browse' })
    mount(
      <LineageTimeline nodes={[node('A', { year: 2022, month: 9 })]} edges={[]} />
    )
    const tl = host?.querySelector('.timeline') as HTMLElement
    act(() => {
      tl.dispatchEvent(new WheelEvent('wheel', { ctrlKey: true, deltaY: -100, bubbles: true, cancelable: true }))
    })
    expect(useLineageViewStore.getState().zoom).toBeCloseTo(1.1)
    act(() => {
      tl.dispatchEvent(new WheelEvent('wheel', { ctrlKey: false, deltaY: -100, bubbles: true, cancelable: true }))
    })
    expect(useLineageViewStore.getState().zoom).toBeCloseTo(1.1) // 非 ctrl 不缩放
  })

  it('内容层 transform scale 随 zoom（100%=无变换；缩放控件在工具栏——lineage-toolbar-session）', () => {
    mount(
      <LineageTimeline nodes={[node('A', { year: 2022, month: 9 })]} edges={[]} />
    )
    const content = host?.querySelector('.tl-content') as HTMLElement
    expect(content.style.transform).toBe('') // 100%=无变换（内容坐标域基线）
    act(() => {
      useLineageViewStore.setState({ zoom: 1.1 })
    })
    expect((host?.querySelector('.tl-content') as HTMLElement).style.transform).toBe('scale(1.1)')
    // [B5 §4.2] 右下角 ZoomBadge 退役——时间线渲染树内零角标节点
    expect(host?.querySelector('[data-testid="zoom-badge"]')).toBeNull()
    expect(host?.querySelector('.zoom-badge')).toBeNull()
  })

  it('[RR8] 量测 effect deps 收敛：zoom-only 再渲染零重测（offsetWidth 零读——原无 deps 逐渲染量测+RO 重建）', () => {
    mount(
      <LineageTimeline nodes={[node('A', { year: 2022, month: 9 })]} edges={[]} />
    )
    const content = host?.querySelector('.tl-content') as HTMLElement
    let reads = 0
    Object.defineProperty(content, 'offsetWidth', {
      configurable: true,
      get: () => {
        reads += 1
        return 500
      }
    })
    act(() => {
      useLineageViewStore.setState({ zoom: 1.2 })
    })
    expect(reads).toBe(0) // 非布局键渲染不重量测（自然尺寸缩放不变——RO/重算键承载）
  })
})
