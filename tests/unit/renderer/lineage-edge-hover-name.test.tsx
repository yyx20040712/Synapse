// @vitest-environment jsdom
/**
 * [F-VISFB-23 N2] browse 态线名（B3-23）——首红测试组（TDD）。
 *
 * 票面：browse 态启用边扫描（rAF 节流=每帧至多一次扫描）；hover 命中边→
 * tooltip 显示真实 label（edge.label 数据源——禁假数据）；移出消失（含快速
 * 移出画布）；非 browse 态零扫描零监听开销；tooltip 定位随指针（client 域
 * ——portal 出 .tl-content，fixed 视口基准=EdgeMenuHost R14 先例）。INV-97
 * 义务=命中层/tooltip 零指针截获（CSS 契约锚）。
 * [回炉轮1 B-1] 命中数学=真点到线段投影距离（原包围盒独立 clamp 斜段误命中
 * ——门一 k1 审回）；[主控授权接缝同修] [RR5] focus 扫描同步真投影+负锚；
 * [W-2] EdgeTooltip label 入 deps 复钳。
 * 装配面与 lineage-edge-edit-r2 同构（jsdom 零布局——gBCR spy 定值几何；
 * rAF 桩+手动 flush）。always-active 裸 describe（K3）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub } from '../../utils/api-client-mock'

const stubApi = makeApiStub({
  lineage: { graph: vi.fn() }
})
void stubApi

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { LineageEdge, LineageNode } from '../../../src/shared/models/lineage'
import { LineageTimeline } from '../../../src/renderer/features/lineage/LineageTimeline'
import { EdgeTooltip } from '../../../src/renderer/features/lineage/EdgeTooltip'
import { useLineageViewStore } from '../../../src/renderer/features/lineage/lineage-view.store'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

function node(id: string): LineageNode {
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
    updatedAt: 't'
  }
}

/** manual-override 边（via 在场——d 值几何可预测；label=真实线名数据源） */
function edge(id: string, from: string, to: string, label: string, via: Array<{ x: number; y: number }> = [{ x: 200, y: 66 }]): LineageEdge {
  return { id, fromNode: from, toNode: to, label, dashed: false, color: '#1e3a8a', via, createdAt: 't', updatedAt: 't' }
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
}

/** 卡/锚几何定值（jsdom 零布局——gBCR spy；.tl-content 不桩=零 rect 域，client=内容坐标 @z=1） */
function stubRect(el: Element, x: number, y: number, w = 128, h = 72): void {
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
    left: x, top: y, right: x + w, bottom: y + h, width: w, height: h, x, y,
    toJSON: () => ({})
  } as unknown as DOMRect)
}

/** 布局：A(12,30) B(412,30) 同月框；边 e1（A→B）——store 态同步直置（r2 同构） */
function layout(label = '逻辑线：A 支撑 B', via: Array<{ x: number; y: number }> = [{ x: 200, y: 66 }]): void {
  const nodes = [node('A'), node('B')]
  const edges = [edge('e1', 'A', 'B', label, via)]
  useLineageStore.setState({ nodes, edges, saveStatus: 'clean', queue: [], undoStack: [], redoStack: [] })
  mount(nodes, edges)
  const frame = host!.querySelector('.month-frame') as HTMLElement
  stubRect(frame, 0, 0, 800, 200)
  stubRect(host!.querySelector('.tl-card[data-node-id="A"]') as HTMLElement, 12, 30)
  stubRect(host!.querySelector('.tl-card[data-node-id="B"]') as HTMLElement, 412, 30)
  flushRafs()
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

const hitOf = (edgeId: string): SVGElement => {
  const el = host!.querySelector(`.tl-edge-hit[data-edge-id="${edgeId}"]`)
  if (!(el instanceof SVGElement)) throw new Error('命中层未渲染')
  return el
}

const tooltip = (): HTMLElement | null => {
  // portal 挂 document.body（transform 祖先劫持 fixed 包含块——host 外查询）
  const el = document.querySelector('[data-testid="tl-edge-tooltip"]')
  return el instanceof HTMLElement ? el : null
}

/** d 属性最长段中点（jsdom 零布局——几何由 d 值单源推导；r2 同构） */
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

const edgeMid = (): { x: number; y: number } => longestSegMid(hitOf('e1').getAttribute('d') ?? '')

const docMove = (x: number, y: number): void => {
  act(() => { document.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: x, clientY: y })) })
}

describe('N2 browse 态线名（F-VISFB-23——rAF 节流扫描+真实 label tooltip）', () => {
  it('browse hover 命中边→tooltip 显示真实 label 文本+随指针 client 域定位', () => {
    layout('逻辑线：A 支撑 B')
    const mid = edgeMid()
    docMove(mid.x, mid.y)
    flushRafs()
    const tip = tooltip()
    // 真实 label（edge.label 数据源——禁假数据）
    expect(tip).not.toBeNull()
    expect(tip!.textContent).toBe('逻辑线：A 支撑 B')
    // 随指针定位（+14=指针偏移常量；client 域=视口基准 fixed）
    expect(tip!.style.left).toBe(`${mid.x + 14}px`)
    expect(tip!.style.top).toBe(`${mid.y + 14}px`)
  })

  it('移出边（画布内离线）→tooltip 消失', () => {
    layout()
    const mid = edgeMid()
    docMove(mid.x, mid.y)
    flushRafs()
    expect(tooltip()).not.toBeNull()
    docMove(700, 500)
    flushRafs()
    expect(tooltip()).toBeNull()
  })

  it('快速移出画布（document pointerleave）→tooltip 消失', () => {
    layout()
    const mid = edgeMid()
    docMove(mid.x, mid.y)
    flushRafs()
    expect(tooltip()).not.toBeNull()
    act(() => { document.dispatchEvent(new MouseEvent('pointerleave', { bubbles: true })) })
    expect(tooltip()).toBeNull()
  })

  it('rAF 节流：同帧三次指针移动合并为一次扫描（挂起 rAF 恰一）+最新位置胜出', () => {
    layout()
    const mid = edgeMid()
    rafs.length = 0
    docMove(mid.x, mid.y)
    docMove(mid.x + 4, mid.y)
    docMove(mid.x + 8, mid.y)
    // 三次事件=一次挂起扫描（每帧至多一次——合并语义）
    expect(rafs.length).toBe(1)
    flushRafs()
    const tip = tooltip()
    expect(tip).not.toBeNull()
    // 最新位置胜出（末事件坐标消费）
    expect(tip!.style.left).toBe(`${mid.x + 8 + 14}px`)
  })

  it('非 browse 零扫描：edit(select)/edit(draw-solid armed) 移过边+冲帧→零 tooltip', () => {
    layout()
    const mid = edgeMid()
    docMove(mid.x, mid.y)
    flushRafs()
    // 正支先证（browse 面在场——实现前本行先红，负锚非空转）
    expect(tooltip()).not.toBeNull()
    act(() => { useLineageViewStore.setState({ mode: 'edit', tool: 'select' }) })
    docMove(mid.x, mid.y)
    flushRafs()
    expect(tooltip()).toBeNull()
    act(() => { useLineageViewStore.setState({ mode: 'edit', tool: 'draw-solid' }) })
    docMove(mid.x, mid.y)
    flushRafs()
    expect(tooltip()).toBeNull()
  })

  it('悬停中切模式（browse→edit）→tooltip 即时消失（效应清理）', () => {
    layout()
    const mid = edgeMid()
    docMove(mid.x, mid.y)
    flushRafs()
    expect(tooltip()).not.toBeNull()
    act(() => { useLineageViewStore.setState({ mode: 'edit' }) })
    expect(tooltip()).toBeNull()
  })

  it('缩放坐标换算：zoom=2 指针 client 域=2×内容域仍命中+tooltip 保持 client 域定位', () => {
    layout()
    const mid = edgeMid()
    act(() => { useLineageViewStore.setState({ zoom: 2 }) })
    docMove(mid.x * 2, mid.y * 2)
    flushRafs()
    const tip = tooltip()
    // (client−0)/2=内容点——命中证明换算正确（未换算则 hypot 距离加倍出带）
    expect(tip).not.toBeNull()
    expect(tip!.textContent).toBe('逻辑线：A 支撑 B')
    // tooltip 随指针 client 域（不随内容域——缩放下不漂移）
    expect(tip!.style.left).toBe(`${mid.x * 2 + 14}px`)
  })

  it('空 label 边：hover 命中→零 tooltip（空线名无展示面——自裁口径）；对照非空边同坐标有 tooltip', () => {
    layout('')
    const mid = edgeMid()
    docMove(mid.x, mid.y)
    flushRafs()
    expect(tooltip()).toBeNull()
    // 对照正支：同几何换非空 label——同坐标有 tooltip（实现前本段先红）
    const nodes = [node('A'), node('B')]
    const edges = [edge('e1', 'A', 'B', '有名线')]
    useLineageStore.setState({ nodes, edges, saveStatus: 'clean', queue: [], undoStack: [], redoStack: [] })
    act(() => {
      root?.render(<LineageTimeline nodes={nodes} edges={edges} />)
    })
    const frame = host!.querySelector('.month-frame') as HTMLElement
    stubRect(frame, 0, 0, 800, 200)
    stubRect(host!.querySelector('.tl-card[data-node-id="A"]') as HTMLElement, 12, 30)
    stubRect(host!.querySelector('.tl-card[data-node-id="B"]') as HTMLElement, 412, 30)
    flushRafs()
    const mid2 = edgeMid()
    docMove(mid2.x, mid2.y)
    flushRafs()
    expect(tooltip()).not.toBeNull()
    expect(tooltip()!.textContent).toBe('有名线')
  })

  it('CSS 契约：.tl-edge-tooltip fixed+pointer-events:none+z 弹层 token（INV-97 零指针截获义务）', () => {
    const css = readFileSync(join(process.cwd(), 'src/renderer/shared/theme-lineage.css'), 'utf8')
    expect(css).toMatch(/\.tl-edge-tooltip\s*\{[^}]*position:\s*fixed/)
    expect(css).toMatch(/\.tl-edge-tooltip\s*\{[^}]*pointer-events:\s*none/)
    expect(css).toMatch(/\.tl-edge-tooltip\s*\{[^}]*z-index:\s*var\(--z-pop\)/)
  })
})

/** 测试侧真投影 oracle（夹具构造用——与实现独立推导）：点到线段最近距离 */
function segDist(p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }): number {
  const abx = b.x - a.x
  const aby = b.y - a.y
  const lenSq = abx * abx + aby * aby
  const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * abx + (p.y - a.y) * aby) / lenSq))
  return Math.hypot(p.x - (a.x + abx * t), p.y - (a.y + aby * t))
}

/** d 骨架 M/L 端点集（Q 圆角参数跳过——探针定谳 d=M..L..Q..L 形） */
const mlPoints = (d: string): Array<{ x: number; y: number }> =>
  (d.match(/[ML]\s*-?\d+(?:\.\d+)?\s+-?\d+(?:\.\d+)?/g) ?? []).map((m) => {
    const [x, y] = (m.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number)
    return { x: x!, y: y! }
  })

/**
 * [回炉1 B-1] 斜段夹具派生（via {300,200}——骨架=锚(140,84)+via+锚(412,84) 探针
 * 定谳）：取首斜段（dx/dy 均非零）返回 {onMid=段上命中点, farCorner=bbox 内距
 * 线段本体最远的对角点}——真投影下 farCorner 出带（≥20px=4px 判定带 5 倍余量）、
 * 包围盒法下 d=0 必中（缺陷签名点）。
 */
function diagFixture(): { onMid: { x: number; y: number }; farCorner: { x: number; y: number } } {
  const pts = mlPoints(hitOf('e1').getAttribute('d') ?? '')
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i]!
    const b = pts[i + 1]!
    if (a.x === b.x || a.y === b.y) continue
    const c1 = { x: Math.min(a.x, b.x), y: Math.max(a.y, b.y) }
    const c2 = { x: Math.max(a.x, b.x), y: Math.min(a.y, b.y) }
    const far = segDist(c1, a, b) >= segDist(c2, a, b) ? c1 : c2
    if (segDist(far, a, b) >= 20) {
      return { onMid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, farCorner: far }
    }
  }
  throw new Error('夹具无远角斜段')
}

describe('回炉轮1 B-1/W-2（F-VISFB-23——真段投影判别+tooltip 复钳）', () => {
  it('B-1⒜ browse 斜段负例：指针在段包围盒内但距线段本体 ≥扫描半径 → 零 tooltip（真投影判别）', () => {
    layout('斜段线', [{ x: 300, y: 200 }])
    const { farCorner } = diagFixture()
    docMove(farCorner.x, farCorner.y)
    flushRafs()
    expect(tooltip()).toBeNull()
  })

  it('B-1⒞ browse 斜段悬停迁移：段上命中→移到同包围盒内远离线段处 → tooltip 消失', () => {
    layout('斜段线', [{ x: 300, y: 200 }])
    const { onMid, farCorner } = diagFixture()
    docMove(onMid.x, onMid.y)
    flushRafs()
    expect(tooltip()).not.toBeNull()
    docMove(farCorner.x, farCorner.y)
    flushRafs()
    expect(tooltip()).toBeNull()
  })

  it('B-1 接缝同修 [RR5] focus 态同判别：斜段上 .hovered 挂/同 bbox 远角不挂（hoverScan 真投影）', () => {
    layout('斜段线', [{ x: 300, y: 200 }])
    act(() => { useLineageViewStore.setState({ mode: 'focus', focusSet: ['A'] }) })
    const vis = () => host!.querySelector('path.tl-edge[data-edge-id="e1"]') as SVGPathElement
    const { onMid, farCorner } = diagFixture()
    docMove(onMid.x, onMid.y)
    expect(vis().classList.contains('hovered')).toBe(true)
    docMove(farCorner.x, farCorner.y)
    expect(vis().classList.contains('hovered')).toBe(false)
  })

  it('W-2 EdgeTooltip 复钳：同 x/y 换长 label → left 按新实测宽被视口右缘钳制（label 入 deps）', () => {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(320)
    const local = document.createElement('div')
    document.body.appendChild(local)
    const rt = createRoot(local)
    act(() => {
      rt.render(<EdgeTooltip label="短" x={100} y={50} />)
    })
    const tip = document.querySelector('[data-testid="tl-edge-tooltip"]') as HTMLElement
    // 初钳（jsdom 实测宽 0）：left=min(114, 320-0-6)=114
    expect(tip.style.left).toBe('114px')
    Object.defineProperty(tip, 'offsetWidth', { configurable: true, get: () => 300 })
    act(() => {
      rt.render(<EdgeTooltip label="很长很长很长很长很长很长的线名" x={100} y={50} />)
    })
    // label 变更入 deps → 复钳按新实测宽：left=min(114, 320-300-6)=14
    expect(tip.style.left).toBe('14px')
    act(() => {
      rt.unmount()
    })
    local.remove()
  })
})
