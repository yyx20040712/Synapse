// @vitest-environment jsdom
/**
 * [F-LGRAPH-01②U5 回炉轮 2] 手动调线编辑态交互（RR5/RR8/RR10）——
 * lineage-edge-edit-ui 行数红线（≤500）拆件：focus 态线 hover 回升（P-12/
 * P-18——document pointermove 数学命中扫描）+effect deps 收敛/edges 响应式
 * 订阅+hover 回升 inline 单源。主控裁决 RR5/RR8/RR10 测试锚驻此。
 * always-active 裸 describe（K3）。装配面与 ui 件同构（jsdom 零布局——
 * gBCR spy 定值几何）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub } from '../../utils/api-client-mock'

const stubApi = makeApiStub({
  lineage: { graph: vi.fn() }
})
void stubApi

import type { LineageEdge, LineageNode } from '../../../src/shared/models/lineage'
import { LineageTimeline } from '../../../src/renderer/features/lineage/LineageTimeline'
import { edgeVisualOpacity } from '../../../src/renderer/features/lineage/edge-overlay-geom'
import { useLineageViewStore } from '../../../src/renderer/features/lineage/lineage-view.store'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

function node(id: string, patch: Partial<LineageNode> = {}): LineageNode {
  return {
    id,
    paperId: `paper-${id}`,
    title: `节点${id}`,
    year: 2022,
    x: null,
    y: null,
    month: 9,
    slot: null,
    folderId: '__main__',
    createdAt: 't',
    updatedAt: 't',
    ...patch
  }
}

/** manual-override 边（via 在场——正交链） */
function edge(id: string, from: string, to: string, via: Array<{ x: number; y: number }>): LineageEdge {
  return { id, fromNode: from, toNode: to, label: `线${id}`, dashed: false, color: '#3a5bd9', via, createdAt: 't', updatedAt: 't' }
}

let root: Root | null = null
let host: HTMLDivElement | null = null
const rafs: FrameRequestCallback[] = []

function stubRaf(): void {
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback): number => {
    rafs.push(cb)
    return rafs.length
  })
}

const flushRafs = (): void => {
  act(() => {
    rafs.splice(0).forEach((cb) => cb(0))
  })
}

function mount(nodes: LineageNode[], edges: LineageEdge[]): void {
  stubRaf()
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(<LineageTimeline nodes={nodes} edges={edges} />)
  })
  act(() => {
    useLineageViewStore.setState({ mode: 'edit' })
  })
}

/** 卡/锚几何定值（jsdom 零布局——gBCR spy） */
function stubRect(el: Element, x: number, y: number, w = 128, h = 72): void {
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
    left: x, top: y, right: x + w, bottom: y + h, width: w, height: h, x, y,
    toJSON: () => ({})
  } as unknown as DOMRect)
}

const click = (el: Element): void => {
  act(() => { el.dispatchEvent(new MouseEvent('click', { bubbles: true })) })
}
const rc = (el: Element, x = 10, y = 10): void => {
  act(() => {
    el.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: x, clientY: y }))
  })
}

beforeEach(() => {
  useLineageStore.setState({ saveStatus: 'clean', queue: [], undoStack: [], redoStack: [] })
})
afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
  vi.restoreAllMocks()
  useLineageViewStore.setState({ mode: 'browse', focusSet: [], tool: 'select', zoom: 1 })
  useLineageStore.setState({ edges: [], nodes: [], queue: [], undoStack: [], redoStack: [], saveStatus: 'clean' })
})

/** 布局：A(12,30) B(412,30) 同月框；边 e1（A→B）——store 态同步直置 */
function layout(edgeVia?: Array<{ x: number; y: number }>, third = false): void {
  const nodes = third ? [node('A'), node('B'), node('C')] : [node('A'), node('B')]
  const edges = [edgeVia === undefined ? { ...edge('e1', 'A', 'B', []), via: undefined } : edge('e1', 'A', 'B', edgeVia)]
  useLineageStore.setState({ nodes, edges: edges as LineageEdge[], saveStatus: 'clean', queue: [], undoStack: [], redoStack: [] })
  mount(nodes, edges as LineageEdge[])
  const frame = host!.querySelector('.month-frame') as HTMLElement
  stubRect(frame, 0, 0, 800, 200)
  stubRect(host!.querySelector('.tl-card[data-node-id="A"]') as HTMLElement, 12, 30)
  stubRect(host!.querySelector('.tl-card[data-node-id="B"]') as HTMLElement, 412, 30)
  if (third) stubRect(host!.querySelector('.tl-card[data-node-id="C"]') as HTMLElement, 612, 230)
  flushRafs()
}

const hitOf = (edgeId: string): SVGElement => {
  const el = host!.querySelector(`.tl-edge-hit[data-edge-id="${edgeId}"]`)
  if (!(el instanceof SVGElement)) throw new Error('命中层未渲染')
  return el
}

describe('U5 [RR5] focus 态线 hover 回升（P-12/P-18——document pointermove 数学命中扫描）', () => {
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

  it('focus dim：线挂 .dim；hover 命中线挂 .hovered（回升类）+移开即撤', () => {
    layout([{ x: 200, y: 66 }])
    act(() => {
      useLineageViewStore.setState({ mode: 'focus', focusSet: ['A'] })
    })
    const vis = host!.querySelector('path.tl-edge[data-edge-id="e1"]') as SVGPathElement
    expect(vis.classList.contains('dim')).toBe(true) // 全部线 dim（P-18）
    expect(host!.querySelector('.tl-edges')?.classList.contains('dimmed-focus')).toBe(true) // 态标记沿承
    const mid = longestSegMid(hitOf('e1').getAttribute('d') ?? '')
    docMove(mid.x, mid.y) // 指针落线身（数学命中——pointer-events 零变更不抢卡点击）
    const hovered = host!.querySelector('path.tl-edge[data-edge-id="e1"]') as SVGPathElement
    expect(hovered.classList.contains('hovered')).toBe(true) // 命中线挂回升类
    expect(hovered.classList.contains('dim')).toBe(true) // dim+hovered 并挂（CSS 0.6 回升承载）
    docMove(700, 500) // 移开
    const cleared = host!.querySelector('path.tl-edge[data-edge-id="e1"]') as SVGPathElement
    expect(cleared.classList.contains('hovered')).toBe(false)
    expect(cleared.classList.contains('dim')).toBe(true)
  })

  it('focus 空集=无 dim 无 hover 挂类（dim 激活闸——hover 扫描不激活）', () => {
    layout([{ x: 200, y: 66 }])
    act(() => {
      useLineageViewStore.setState({ mode: 'focus', focusSet: [] })
    })
    const vis = host!.querySelector('path.tl-edge[data-edge-id="e1"]') as SVGPathElement
    expect(vis.classList.contains('dim')).toBe(false)
    const mid = longestSegMid(hitOf('e1').getAttribute('d') ?? '')
    docMove(mid.x, mid.y)
    const after = host!.querySelector('path.tl-edge[data-edge-id="e1"]') as SVGPathElement
    expect(after.classList.contains('hovered')).toBe(false) // 空集=非 dim 态零 hover 面
  })
})

describe('U5 [RR8/RR10] effect deps 收敛+edges 响应式订阅+hover 回升 inline（回炉轮 2）', () => {
  it('边消失=selected 失效防御响应化：选中 e1→store.removeEdge→选中态即时撤（手柄消）', () => {
    layout([{ x: 200, y: 66 }])
    click(hitOf('e1'))
    expect(host!.querySelector('[data-testid="edge-handles"]')).not.toBeNull()
    act(() => {
      useLineageStore.getState().removeEdge('e1')
    })
    // [RR8] 原 deps getState().edges 直读=静态 props 挂载下删除不触发（悬挂选中）
    expect(host!.querySelector('[data-testid="edge-handles"]')).toBeNull()
  })

  it('[RR10] hover 回升并入 inline：hover=inline opacity 0.65（原仅 CSS 类承载）+撤 hover 回基线', () => {
    const nodes = [node('A'), node('B')]
    const edges = [edge('e1', 'A', 'B', [{ x: 200, y: 66 }]), edge('e2', 'A', 'B', [{ x: 260, y: 40 }])]
    useLineageStore.setState({ nodes, edges, saveStatus: 'clean', queue: [], undoStack: [], redoStack: [] })
    mount(nodes, edges)
    const frame = host!.querySelector('.month-frame') as HTMLElement
    stubRect(frame, 0, 0, 800, 200)
    stubRect(host!.querySelector('.tl-card[data-node-id="A"]') as HTMLElement, 12, 30)
    stubRect(host!.querySelector('.tl-card[data-node-id="B"]') as HTMLElement, 412, 30)
    flushRafs()
    const before = host!.querySelector('path.tl-edge[data-edge-id="e1"]') as SVGPathElement
    expect(before.style.opacity).toBe('') // 基线=零 inline（CSS 域）
    act(() => {
      hitOf('e1').dispatchEvent(new MouseEvent('pointerover', { bubbles: true }))
    })
    const hovered = host!.querySelector('path.tl-edge[data-edge-id="e1"]') as SVGPathElement
    expect(hovered.classList.contains('hovered')).toBe(true)
    expect(hovered.style.opacity).toBe('0.65') // [RR10] 回升值并入 inline
    act(() => {
      hitOf('e1').dispatchEvent(new MouseEvent('pointerout', { bubbles: true }))
    })
    const restored = host!.querySelector('path.tl-edge[data-edge-id="e1"]') as SVGPathElement
    expect(restored.style.opacity).toBe('') // 撤 hover 回 CSS 基线
  })

  it('[RR10] 错峰×hover 组合单源（纯函数——fade 边 hover 回升不被 inline fade 压制）', () => {
    // inline fade 压 CSS .hovered opacity（原死样式缺陷本体）——组合经纯函数锚定
    expect(edgeVisualOpacity({ fade: 0.85, hovered: true, focusDim: false })).toBe(0.65)
    expect(edgeVisualOpacity({ fade: 0.85, hovered: false, focusDim: false })).toBe(0.85)
    expect(edgeVisualOpacity({ hovered: false, focusDim: false })).toBeUndefined()
    expect(edgeVisualOpacity({ hovered: true, focusDim: false })).toBe(0.65)
    // focus dim 态=undefined（dim/hover 回升由 .dim/.dim.hovered 类承载——RR5）
    expect(edgeVisualOpacity({ fade: 0.85, hovered: true, focusDim: true })).toBeUndefined()
  })

  it('拖拽会话期零 rect 重采集：vertex 拖动三次 move 期间卡 gBCR 零调用（原无 deps 逐渲染采集）', () => {
    layout([{ x: 200, y: 66 }])
    click(hitOf('e1'))
    // 计数包装（不依赖 spy 内部形态——defineProperty 包住既有 stub 值）
    const cardA = host!.querySelector('.tl-card[data-node-id="A"]') as HTMLElement
    const inner = cardA.getBoundingClientRect.bind(cardA)
    let calls = 0
    Object.defineProperty(cardA, 'getBoundingClientRect', {
      configurable: true,
      value: (): DOMRect => {
        calls += 1
        return inner() as DOMRect
      }
    })
    const handle = host!.querySelector('[data-testid="edge-handle-vertex"]') as HTMLElement
    act(() => {
      handle.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 200, clientY: 66 }))
    })
    for (const [x, y] of [[220, 80], [240, 100], [260, 120]] as const) {
      act(() => {
        document.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: x, clientY: y }))
      })
    }
    expect(calls).toBe(0) // 会话期渲染不再重采集（采集键=布局变化）
    act(() => {
      document.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX: 260, clientY: 120 }))
    })
  })
})

describe('U5 端点重连统一（回炉 R11——空 via 归一/物化/L 重正交/换选）', () => {
  const endHandle = (end: 'from' | 'to'): SVGElement => {
    const el = host!.querySelector(`[data-testid="edge-handle-end"][data-end="${end}"]`)
    if (!(el instanceof SVGElement)) throw new Error('端点柄未渲染')
    return el
  }
  const docMove = (x: number, y: number): void => {
    act(() => { document.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: x, clientY: y })) })
  }
  const docUp = (x: number, y: number): void => {
    act(() => { document.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX: x, clientY: y })) })
  }
  const dragEndTo = (end: 'from' | 'to', x: number, y: number): void => {
    act(() => { endHandle(end).dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0 })) })
    docMove(x, y)
    docUp(x, y)
  }

  it('R11③ 选中态左键点另一线=换选；同边点击=no-op 保持', () => {
    const nodes = [node('A'), node('B')]
    const edges = [edge('e1', 'A', 'B', [{ x: 200, y: 66 }]), edge('e2', 'A', 'B', [{ x: 260, y: 40 }])]
    useLineageStore.setState({ nodes, edges, saveStatus: 'clean', queue: [], undoStack: [], redoStack: [] })
    mount(nodes, edges)
    const frame = host!.querySelector('.month-frame') as HTMLElement
    stubRect(frame, 0, 0, 800, 200)
    stubRect(host!.querySelector('.tl-card[data-node-id="A"]') as HTMLElement, 12, 30)
    stubRect(host!.querySelector('.tl-card[data-node-id="B"]') as HTMLElement, 412, 30)
    flushRafs()
    click(hitOf('e1'))
    expect(host!.querySelector('path.tl-edge.selected')?.getAttribute('data-edge-id')).toBe('e1')
    // 选中态点另一线=换选（原 phase!==idle return 缺陷——R11③）
    click(hitOf('e2'))
    expect(host!.querySelector('path.tl-edge.selected')?.getAttribute('data-edge-id')).toBe('e2')
    // 同边再点=no-op 保持
    click(hitOf('e2'))
    expect(host!.querySelector('path.tl-edge.selected')?.getAttribute('data-edge-id')).toBe('e2')
  })

  it('[RR7] 瞬选菜单关闭保既有选中：先左键选中 e1→右键 e2 开 transient 菜单→Esc 关闭=e1 选中恢复（非撤空）', () => {
    const nodes = [node('A'), node('B')]
    const edges = [edge('e1', 'A', 'B', [{ x: 200, y: 66 }]), edge('e2', 'A', 'B', [{ x: 260, y: 40 }])]
    useLineageStore.setState({ nodes, edges, saveStatus: 'clean', queue: [], undoStack: [], redoStack: [] })
    mount(nodes, edges)
    const frame = host!.querySelector('.month-frame') as HTMLElement
    stubRect(frame, 0, 0, 800, 200)
    stubRect(host!.querySelector('.tl-card[data-node-id="A"]') as HTMLElement, 12, 30)
    stubRect(host!.querySelector('.tl-card[data-node-id="B"]') as HTMLElement, 412, 30)
    flushRafs()
    click(hitOf('e1'))
    expect(host!.querySelector('[data-testid="edge-handles"]')).not.toBeNull() // e1 先在选中
    rc(hitOf('e2'), 30, 30) // 右键 e2=瞬选+transient 菜单
    expect(document.querySelector('[data-testid="edge-menu"]')).not.toBeNull()
    expect(host!.querySelector('path.tl-edge.selected')?.getAttribute('data-edge-id')).toBe('e2') // 瞬态高亮=e2
    act(() => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })) })
    expect(document.querySelector('[data-testid="edge-menu"]')).toBeNull()
    // 关闭撤瞬态高亮但保先在选中（原实现撤为 idle=既有选中被清）
    expect(host!.querySelector('path.tl-edge.selected')?.getAttribute('data-edge-id')).toBe('e1')
    expect(host!.querySelector('[data-testid="edge-handles"]')).not.toBeNull()
  })

  it('[RR7] 菜单开着左键点另一线=换选：transient 菜单外点 e2→e2 选中+菜单关（不被 closeMenu 撤空）', () => {
    const nodes = [node('A'), node('B')]
    const edges = [edge('e1', 'A', 'B', [{ x: 200, y: 66 }]), edge('e2', 'A', 'B', [{ x: 260, y: 40 }])]
    useLineageStore.setState({ nodes, edges, saveStatus: 'clean', queue: [], undoStack: [], redoStack: [] })
    mount(nodes, edges)
    const frame = host!.querySelector('.month-frame') as HTMLElement
    stubRect(frame, 0, 0, 800, 200)
    stubRect(host!.querySelector('.tl-card[data-node-id="A"]') as HTMLElement, 12, 30)
    stubRect(host!.querySelector('.tl-card[data-node-id="B"]') as HTMLElement, 412, 30)
    flushRafs()
    rc(hitOf('e1'), 30, 30) // 右键 e1=瞬选（prior=null）+菜单开
    expect(document.querySelector('[data-testid="edge-menu"]')).not.toBeNull()
    click(hitOf('e2')) // 菜单开着左键点另一线=换选
    expect(document.querySelector('[data-testid="edge-menu"]')).toBeNull() // 菜单随外点关闭
    expect(host!.querySelector('path.tl-edge.selected')?.getAttribute('data-edge-id')).toBe('e2') // 换选落定（原 closeMenu 撤为 idle）
    expect(host!.querySelector('[data-testid="edge-handles"]')).not.toBeNull()
  })

  it('R11② manual 线跨卡换端：reconnectEdge+L 重正交（新拐点落地）', () => {
    layout([{ x: 200, y: 66 }], true)
    click(hitOf('e1'))
    const before = useLineageStore.getState().undoStack.length
    dragEndTo('to', 612, 266) // C 左中锚（C 于下一行——L 形）
    const s = useLineageStore.getState()
    const e = s.edges.find((x) => x.id === 'e1')!
    expect(e.toNode).toBe('C') // 跨卡换端
    expect(e.via).toBeDefined()
    // L 重正交：末拐=(原末 via.x, 新锚.y)=(200,266) 追加（A(140,66)→(200,66)→(200,266)→C(612,266)）
    expect(e.via).toEqual([
      { x: 200, y: 66 },
      { x: 200, y: 266 }
    ])
    expect(s.undoStack.length).toBe(before + 1) // 一重连=一编辑单元
  })

  it('R11② 自动线（空 via）跨卡换端：物化种子走 reconnectEnd（不整体跳过）+空 via 不穿透 IPC', () => {
    layout(undefined, true)
    click(hitOf('e1'))
    // 前置：自动线直连（0 方柄）——空 via 分支在场
    expect(host!.querySelectorAll('[data-testid="edge-handle-vertex"]').length).toBe(0)
    const before = useLineageStore.getState().undoStack.length
    dragEndTo('to', 612, 266) // →C 左中锚
    const e = useLineageStore.getState().edges.find((x) => x.id === 'e1')!
    expect(e.toNode).toBe('C')
    expect(e.via).toBeDefined()
    expect(e.via!.length).toBeGreaterThan(0) // 物化（种子=被拖端原锚位→L 拐）
    expect(useLineageStore.getState().undoStack.length).toBe(before + 1)
    // 空数组禁穿透：换端载荷 via 恒非空（或键缺省）
    expect(e.via === undefined || e.via.length > 0).toBe(true)
  })

  it('R11①② 自动线（空 via）同卡换锚：物化 via 承载新锚位（空 via 归一不落 []）', () => {
    layout(undefined)
    click(hitOf('e1'))
    const before = useLineageStore.getState().undoStack.length
    dragEndTo('to', 476, 30) // B 顶中锚（同卡）
    const e = useLineageStore.getState().edges.find((x) => x.id === 'e1')!
    expect(e.fromNode).toBe('A')
    expect(e.toNode).toBe('B') // 同卡=不换端
    expect(e.via).toBeDefined() // 物化（非 [] 穿透——R11①）
    expect(e.via!.length).toBeGreaterThan(0)
    expect(useLineageStore.getState().undoStack.length).toBe(before + 1)
  })

  it('R11④ reconnect 中断=回锚：blur abort 零写入（端点/undo 栈不动）', () => {
    layout([{ x: 200, y: 66 }], true)
    click(hitOf('e1'))
    act(() => { endHandle('to').dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0 })) })
    docMove(612, 266) // 拖至 C 锚（预览态）
    act(() => { window.dispatchEvent(new Event('blur')) }) // 中断
    const e = useLineageStore.getState().edges.find((x) => x.id === 'e1')!
    expect(e.toNode).toBe('B') // 回锚——零写入
    expect(e.via).toEqual([{ x: 200, y: 66 }])
    expect(useLineageStore.getState().undoStack.length).toBe(0)
    expect(useLineageStore.getState().queue).toHaveLength(0)
  })

  it('[RR2] 拖顶点 pointercancel=abort：via 回拖前定态+零写零入栈（§2.5 中断=不成立）', () => {
    layout([{ x: 200, y: 66 }])
    click(hitOf('e1'))
    const handle = host!.querySelector('[data-testid="edge-handle-vertex"]') as HTMLElement
    act(() => {
      handle.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 200, clientY: 66 }))
    })
    act(() => {
      document.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 260, clientY: 120 }))
    })
    // pointercancel=中断（原接 up=提交——workVia 落库缺陷）
    act(() => {
      document.dispatchEvent(new MouseEvent('pointercancel', { bubbles: true }))
    })
    const s = useLineageStore.getState()
    expect(s.edges[0]?.via).toEqual([{ x: 200, y: 66 }]) // via 回拖前定态
    expect(s.undoStack).toHaveLength(0) // 不入撤销栈
    expect(s.queue).toHaveLength(0)
    expect(s.saveStatus).toBe('clean')
    expect(host!.querySelector('[data-testid="edge-handles"]')).toBeNull() // abort=idle 收尾
  })

  it('[RR2] reconnect pointercancel=abort：端点回原锚零写入（不提交换端）', () => {
    layout([{ x: 200, y: 66 }], true)
    click(hitOf('e1'))
    act(() => { endHandle('to').dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0 })) })
    docMove(612, 266) // 拖至 C 锚（预览态）
    act(() => {
      document.dispatchEvent(new MouseEvent('pointercancel', { bubbles: true }))
    })
    const e = useLineageStore.getState().edges.find((x) => x.id === 'e1')!
    expect(e.toNode).toBe('B') // 端点回原锚
    expect(e.via).toEqual([{ x: 200, y: 66 }])
    expect(useLineageStore.getState().undoStack.length).toBe(0)
    expect(useLineageStore.getState().queue).toHaveLength(0)
  })
})
