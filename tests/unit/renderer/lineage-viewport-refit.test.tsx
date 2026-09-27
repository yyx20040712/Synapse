// @vitest-environment jsdom
/**
 * [F-L4] lineage-viewport-refit —— 视口尺寸变化（svg 布局盒）auto-fit 重触发
 * 锁定合约（always-active，不经 guardedDescribe——ADR-0017 裁决 3；票面 5.1
 * 场景①~⑦）。
 *
 * jsdom 无 ResizeObserver+无布局——stub 手法 crib lineage-viewport-scale.
 * test.ts:23-40（per-instance Object.defineProperty clientWidth+原型
 * spyOn gBCR）+ vi.stubGlobal('ResizeObserver', 桩类)：桩捕获 constructor
 * callback / observe 目标 / disconnect 调用，测试手动派发 callback 模拟
 * 「布局盒变化」。渲染面 crib lineage-canvas.test.tsx（真实组件挂载——
 * RO 注册面在组件树上断言才有效力）。数值断言 import fitViewport 计算
 * 期望值，不 crib 死数字。
 * 分工：jsdom 不可达断言（RO 真实浏览器派发/CSS zoom 引起的布局盒变化/
 * 真库换档链）由真机探针 f-l4-verify.mjs 场景 A/B 锁（票面 §6）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { stubViewportRect } from '../../utils/geometry'
import type { LineageEdge, LineageNode } from '../../../src/shared/models/lineage'
import { fitViewport } from '../../../src/renderer/features/lineage/lineage-viewport'
import { layoutLineage } from '../../../src/renderer/features/lineage/lineage-layout'
import { LineageCanvas } from '../../../src/renderer/features/lineage/LineageCanvas'

/** RO 桩类：捕获 callback / observe 目标 / disconnect 调用（测试手动派发） */
class ROStub {
  static instances: ROStub[] = []
  callback: ResizeObserverCallback
  observeTargets: Element[] = []
  disconnected = false
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
    ROStub.instances.push(this)
  }
  observe(target: Element): void {
    this.observeTargets.push(target)
  }
  disconnect(): void {
    this.disconnected = true
  }
}

const lastRO = (): ROStub => {
  const ro = ROStub.instances[ROStub.instances.length - 1]
  if (ro === undefined) throw new Error('无 RO 实例（未注册——实现缺失或已 disconnect 清场）')
  return ro
}

/** 手动派发 RO callback（entries 空——实现只消费回调时机不读 entries） */
function fireRO(ro: ROStub): void {
  act(() => {
    ro.callback([], ro as unknown as ResizeObserver)
  })
}

/** per-instance 可变 clientWidth/clientHeight（直取主路径——真机 clientWidth
 *  优先于 gBCR 回退；scale.test.ts:23-40 同族手法）；原型可变 gBCR 桩=
 *  共享 stubViewportRect（geometry.ts，本文件消费 m.spy） */
function stubClientSize(el: Element, width: number, height: number) {
  let w = width
  let h = height
  Object.defineProperty(el, 'clientWidth', { get: () => w, configurable: true })
  Object.defineProperty(el, 'clientHeight', { get: () => h, configurable: true })
  return {
    set: (nw: number, nh: number): void => {
      w = nw
      h = nh
    }
  }
}

function node(
  id: string,
  patch: Partial<Pick<LineageNode, 'year' | 'x' | 'y' | 'paperId' | 'title'>> = {}
): LineageNode {
  return {
    id,
    paperId: patch.paperId !== undefined ? patch.paperId : `paper-${id}`,
    title: patch.title ?? `节点${id}`,
    coreIdea: '',
    year: patch.year ?? null,
    x: patch.x ?? null,
    y: patch.y ?? null,
    month: null,
    slot: null,
    createdAt: 't',
    updatedAt: 't'
  }
}

function edge(from: string, to: string): LineageEdge {
  return { id: `e-${from}-${to}`, fromNode: from, toNode: to, label: '', kind: 'tree', sub: null, createdAt: 't', updatedAt: 't' }
}

/** 三节点链：A(2020)→B(2021)→C(2022)，B 主题节点（canvas.test 同款夹具） */
function chain(): { nodes: LineageNode[]; edges: LineageEdge[] } {
  return {
    nodes: [
      node('A', { year: 2020, title: '扩散模型起点' }),
      node('B', { year: 2021, paperId: null, title: '主题分组' }),
      node('C', { year: 2022, title: '最新进展' })
    ],
    edges: [edge('A', 'B'), edge('B', 'C')]
  }
}

let root: Root | null = null
let host: HTMLDivElement | null = null

function mount(node: JSX.Element): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(node)
  })
}

const viewportTransform = (): string =>
  host?.querySelector('[data-viewport]')?.getAttribute('transform') ?? ''

/** 解析 data-viewport transform 串（translate(x, y) scale(k)——与 e2e 同式解析） */
function parseViewport(s: string): { tx: number; ty: number; k: number } | null {
  const m = s.match(/^translate\((-?[\d.]+), (-?[\d.]+)\) scale\(([\d.]+)\)$/)
  return m ? { tx: Number(m[1]), ty: Number(m[2]), k: Number(m[3]) } : null
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', ROStub)
  ROStub.instances.length = 0
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('F-L4 视口尺寸变化 refit（ResizeObserver 方案——票面 5.1 ①~⑦）', () => {
  it('① 注册面：挂载非空图→桩 observe 收到 svg 元素（data-testid lineage-canvas）', () => {
    const m = stubViewportRect(800, 600)
    try {
      const g = chain()
      mount(<LineageCanvas nodes={g.nodes} edges={g.edges} />)
      expect(ROStub.instances.length).toBe(1)
      const svg = host?.querySelector('[data-testid="lineage-canvas"]')
      expect(lastRO().observeTargets).toEqual([svg])
    } finally {
      m.spy.mockRestore()
    }
  })

  it('② 尺寸变化 refit：挂载（W1 gBCR 回退口径）fit 后改 clientWidth=W2→派发 callback→transform=fitViewport(nodes, layout, W2, H)', () => {
    // W1=700×600/W2=500×600 选型（x 维紧约束）：fitViewport k=min(x 比, y 比)，
    // W2 变化必须实际改变输出——若 y 维恒紧（如 800×600→1200×600 同 y）宽
    // 变化不改变 fit 值，「量测恒等」型变异（M5）不可判别（首轮变异红证实证）。
    // x 紧（700:460/380=1.21 < 440/344=1.28；500:260/380=0.68 < 1.28）下 W2
    // 直取主路径可判。（F-LG13 后卡恒 240×110——x/y 比随新包围盒变化，
    // 前提锚 k≠1 仍成立：460/440=1.045≠1，W2 仍可判别。）
    const m = stubViewportRect(700, 600)
    try {
      const g = chain()
      const layout = layoutLineage(g.nodes, g.edges)
      mount(<LineageCanvas nodes={g.nodes} edges={g.edges} />)
      const fitted = parseViewport(viewportTransform())
      expect(fitted).not.toBeNull()
      expect(fitted!.k).not.toBe(1) // 挂载 fit 已生效前提锚（W1 口径 k≈1.21）
      const svg = host?.querySelector('[data-testid="lineage-canvas"]') as Element
      stubClientSize(svg, 500, 600) // 直取主路径：clientWidth 优先于 gBCR 回退
      fireRO(lastRO())
      const expected = fitViewport(g.nodes, layout, 500, 600)
      const v = parseViewport(viewportTransform())
      expect(v!.k).toBeCloseTo(expected.k, 6)
      expect(v!.tx).toBeCloseTo(expected.tx, 6)
      expect(v!.ty).toBeCloseTo(expected.ty, 6)
    } finally {
      m.spy.mockRestore()
    }
  })

  it('③ 门语义（userInteracted 不抢视口）：wheel 置门→派发 RO callback→视口保持 wheel 后值（数值断言）', () => {
    const m = stubViewportRect(800, 600)
    try {
      const g = chain()
      mount(<LineageCanvas nodes={g.nodes} edges={g.edges} />)
      const fitted = parseViewport(viewportTransform())
      const svg = host?.querySelector('[data-testid="lineage-canvas"]') as SVGSVGElement
      act(() => {
        svg.dispatchEvent(new WheelEvent('wheel', { deltaY: -240, clientX: 300, clientY: 200, cancelable: true }))
      })
      const wheeled = parseViewport(viewportTransform())
      expect(wheeled!.k).not.toBe(fitted!.k) // wheel 确实改了视口（前提锚）
      stubClientSize(svg, 500, 600) // 布局盒变化（量测也变——与② 同口径）
      fireRO(lastRO())
      const v = parseViewport(viewportTransform())
      expect(v!.tx).toBeCloseTo(wheeled!.tx, 6)
      expect(v!.ty).toBeCloseTo(wheeled!.ty, 6)
      expect(v!.k).toBeCloseTo(wheeled!.k, 6)
    } finally {
      m.spy.mockRestore()
    }
  })

  it('④ 空图（nodes=0）：派发 callback→不 fit（量测未发生——早退在量测前，锁链序）且视口停初始', () => {
    const m = stubViewportRect(800, 600)
    try {
      mount(<LineageCanvas nodes={[]} edges={[]} />)
      expect(ROStub.instances.length).toBe(1) // svg 常驻（W2 先例）——空图同注册
      const before = m.spy.mock.calls.length
      fireRO(lastRO())
      expect(m.spy.mock.calls.length).toBe(before) // fit 早退先于 gBCR 读取（nodes.length===0 在量测前）
      expect(host?.querySelector('[data-viewport]')).toBeNull() // 空态 g 未渲染——视口停 {0,0,1}
    } finally {
      m.spy.mockRestore()
    }
  })

  it('⑤ 成对清理（INV-14 同型）：unmount→桩 disconnect 被调', () => {
    const m = stubViewportRect(800, 600)
    try {
      const g = chain()
      mount(<LineageCanvas nodes={g.nodes} edges={g.edges} />)
      const ro = lastRO()
      expect(ro.disconnected).toBe(false)
      act(() => {
        root?.unmount()
      })
      root = null
      expect(ro.disconnected).toBe(true)
    } finally {
      m.spy.mockRestore()
    }
  })

  it('⑥ 量测守卫：clientWidth=0 桩面（jsdom 布局不可量测）→callback→视口不变（不产生退化 fit）', () => {
    const m = stubViewportRect(0, 0)
    try {
      const g = chain()
      mount(<LineageCanvas nodes={g.nodes} edges={g.edges} />)
      expect(viewportTransform()).toBe('translate(0, 0) scale(1)') // 挂载 fit 早退（量测 0）
      fireRO(lastRO())
      expect(viewportTransform()).toBe('translate(0, 0) scale(1)') // RO 回调同守卫
    } finally {
      m.spy.mockRestore()
    }
  })

  it('⑦ 无自激励（S5）：callback 内 setViewport 新值重渲染→无新 RO 注册/disconnect/重复 observe', () => {
    // [回炉 1 W4] 非平凡化：先改量测（699≠挂载 700——x 维紧约束下 fit 输出
    // 实际变化）→fireRO→setViewport 新值→重渲染必然发生（前提锚：transform
    // 串变化）——在此真重渲染后再断言 RO 无重注册（原版量测未变=fit 同值
    // React bail 不重渲染，「instances 不变」是平凡真——门一 W4 裁决）。
    const m = stubViewportRect(700, 600)
    try {
      const g = chain()
      mount(<LineageCanvas nodes={g.nodes} edges={g.edges} />)
      const ro = lastRO()
      const instancesBefore = ROStub.instances.length
      const observesBefore = ro.observeTargets.length
      const before = viewportTransform()
      const client = stubClientSize(host?.querySelector('[data-testid="lineage-canvas"]') as Element, 699, 600)
      fireRO(lastRO())
      expect(viewportTransform()).not.toBe(before) // setViewport 新值+重渲染真发生（前提锚——699 口径 fit 输出变化）
      client.set(698, 600)
      fireRO(lastRO())
      expect(viewportTransform()).not.toBe(before) // 连续两档新值均重渲染（重渲染常态下的不变量才有效力）
      expect(ROStub.instances.length).toBe(instancesBefore) // setViewport 只改 <g> transform——不触发 RO 重注册（S5 不变量）
      expect(ro.disconnected).toBe(false)
      expect(ro.observeTargets.length).toBe(observesBefore)
    } finally {
      m.spy.mockRestore()
    }
  })

  it('⑧ 初始回调幂等（回炉 1 W3）：挂载非空图（fit effect 已跑）→手动派发一次桩 callback（模拟 observe 后规范要求的初始通知）→transform 与挂载 fit 结果相等', () => {
    // 真实浏览器挂载路径=fit effect+RO 初始回调双 doFit——幂等性显式锁
    // （同量测同输入同输出；fireRO 前 doFitRef 已就位=useLayoutEffect 同步
    // 赋值先于浏览器任何派发帧——W1 竞态消除的可测面）。
    const m = stubViewportRect(700, 600)
    try {
      const g = chain()
      const layout = layoutLineage(g.nodes, g.edges)
      mount(<LineageCanvas nodes={g.nodes} edges={g.edges} />)
      const fitted = viewportTransform()
      expect(fitted).not.toBe('translate(0, 0) scale(1)') // 挂载 fit 已生效前提锚
      fireRO(lastRO()) // 模拟 RO 规范初始通知（observe 后异步派发一次）
      const v = parseViewport(viewportTransform())
      const expected = fitViewport(g.nodes, layout, 700, 600)
      expect(v).not.toBeNull()
      expect(v!.k).toBeCloseTo(expected.k, 6)
      expect(v!.tx).toBeCloseTo(expected.tx, 6)
      expect(v!.ty).toBeCloseTo(expected.ty, 6)
    } finally {
      m.spy.mockRestore()
    }
  })
})
