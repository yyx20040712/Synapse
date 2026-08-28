// @vitest-environment jsdom
/**
 * [LG-02] LineageCanvas / LineagePage —— 只读画布+脉络视图组件测试（锁定合约）。
 *
 * 覆盖：节点文本真实渲染（「渲染出真实文本」红线）/主题节点样式区分/空图空态
 * 文案/zoom 滚轮缩放+钳制 [0.25,4]/pan 空白拖拽平移（节点上不 pan）/INV-14
 * listener 成对注册成对清理（同 type 同函数引用配对）/Page 三态（loading/
 * ready/error+重试）/store 数据缓存（卸载后驻留）。
 * always-active（ADR-0017 裁决 3——不经 guardedDescribe）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { LineageEdge, LineageNode } from '../../../src/shared/models/lineage'
import type * as clientModule from '../../../src/renderer/api/client'

const { stubApi } = vi.hoisted(() => ({
  stubApi: { lineage: { graph: vi.fn() } }
}))

vi.mock('../../../src/renderer/api/client', async (importOriginal) => {
  const real = await importOriginal<typeof clientModule>()
  return { ...real, api: stubApi as unknown as typeof clientModule.api }
})

import { LineageCanvas } from '../../../src/renderer/features/lineage/LineageCanvas'
import { LineagePage } from '../../../src/renderer/features/lineage/LineagePage'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'

function node(
  id: string,
  patch: Partial<Pick<LineageNode, 'year' | 'x' | 'y' | 'paperId' | 'title'>> = {}
): LineageNode {
  return {
    id,
    // 显式 null（主题节点）不可被默认值吞掉——?? 对 null 同样走右侧
    paperId: patch.paperId !== undefined ? patch.paperId : `paper-${id}`,
    title: patch.title ?? `节点${id}`,
    coreIdea: '',
    year: patch.year ?? null,
    x: patch.x ?? null,
    y: patch.y ?? null,
    createdAt: 't',
    updatedAt: 't'
  }
}

function edge(from: string, to: string): LineageEdge {
  return { id: `e-${from}-${to}`, fromNode: from, toNode: to, label: '', createdAt: 't', updatedAt: 't' }
}

/** 三节点链：A(2020)→B(2021)→C(2022)，B 为主题节点（paperId null） */
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

const flush = async (): Promise<void> => {
  await act(async () => {
    await Promise.resolve()
  })
}

const viewportTransform = (): string =>
  host?.querySelector('[data-viewport]')?.getAttribute('transform') ?? ''

/** 解析 data-viewport transform 串（translate(x, y) scale(k)——与 e2e 同式解析） */
function parseViewport(s: string): { tx: number; ty: number; k: number } | null {
  const m = s.match(/^translate\((-?[\d.]+), (-?[\d.]+)\) scale\(([\d.]+)\)$/)
  return m ? { tx: Number(m[1]), ty: Number(m[2]), k: Number(m[3]) } : null
}

/** 桩量测（jsdom 无布局）：Element.prototype.getBoundingClientRect 固定返回
 *  视口盒（selection-layer.test 同族——app 级 mock 配方先例） */
function stubViewportRect(width: number, height: number) {
  return vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    return { x: 0, y: 0, top: 0, left: 0, right: width, bottom: height, width, height, toJSON: () => ({}) } as DOMRect
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  stubApi.lineage.graph.mockResolvedValue({ ok: true, data: { nodes: [], edges: [] } })
  useLineageStore.setState({ nodes: [], edges: [], status: 'loading', error: null })
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
})

describe('LineageCanvas —— 只读渲染', () => {
  it('节点文本真实渲染（标题与年份可见——「渲染出真实文本」红线）', () => {
    const g = chain()
    mount(<LineageCanvas nodes={g.nodes} edges={g.edges} />)
    expect(host?.textContent).toContain('扩散模型起点')
    expect(host?.textContent).toContain('主题分组')
    expect(host?.textContent).toContain('最新进展')
    expect(host?.textContent).toContain('2020')
    // 边端点查找不崩溃：两条边都在图内
    expect(host?.querySelectorAll('[data-edge-id]').length).toBe(2)
  })

  it('主题节点样式区分：paperId null 标记 data-kind=theme，文献节点 paper', () => {
    const g = chain()
    mount(<LineageCanvas nodes={g.nodes} edges={g.edges} />)
    expect(host?.querySelector('[data-node-id="B"]')?.getAttribute('data-kind')).toBe('theme')
    expect(host?.querySelector('[data-node-id="A"]')?.getAttribute('data-kind')).toBe('paper')
  })

  it('空图空态文案（导入/添加入口归 LG-03——本单仅文案不留死按钮）', () => {
    mount(<LineageCanvas nodes={[]} edges={[]} />)
    expect(host?.textContent).toContain('暂无脉络图——导入草稿或添加节点')
    expect(host?.querySelectorAll('button').length).toBe(0)
  })

  it('W2 回归：空→非空转场后 pan/zoom 可用（listener 不因空态首挂载失绑）', () => {
    // 门一 W2：空态早退不渲染 svg → 首挂载 effect 空跑 → 转场出 svg 后
    // effect 依赖 [] 不重跑 → pan/zoom 永久失灵（03 添加首节点必经路径）
    mount(<LineageCanvas nodes={[]} edges={[]} />)
    expect(host?.textContent).toContain('暂无脉络图')
    const g = chain()
    act(() => {
      root?.render(<LineageCanvas nodes={g.nodes} edges={g.edges} />)
    })
    expect(host?.textContent).toContain('扩散模型起点')
    // pan：空白拖拽仍生效
    const bg = host?.querySelector('[data-panbg]') as Element
    act(() => {
      bg.dispatchEvent(new MouseEvent('pointerdown', { clientX: 100, clientY: 100, bubbles: true }))
    })
    act(() => {
      window.dispatchEvent(new MouseEvent('pointermove', { clientX: 140, clientY: 110 }))
    })
    act(() => {
      window.dispatchEvent(new MouseEvent('pointerup', { clientX: 140, clientY: 110 }))
    })
    expect(viewportTransform()).toContain('translate(40, 10)')
    // zoom：滚轮仍生效（pan 后缩放，translate 值随锚点变仅断 scale）
    const svg = host?.querySelector('svg') as SVGSVGElement
    act(() => {
      svg.dispatchEvent(new WheelEvent('wheel', { deltaY: -240, clientX: 300, clientY: 200, cancelable: true }))
    })
    expect(viewportTransform()).toMatch(/scale\([1-9]/)
  })

  it('覆盖节点用覆盖位置渲染（不参与自动布局）', () => {
    const nodes = [node('O', { year: 2020, x: 777, y: 999, title: '覆盖位' })]
    mount(<LineageCanvas nodes={nodes} edges={[]} />)
    const g = host?.querySelector('[data-node-id="O"]')
    expect(g?.getAttribute('transform')).toContain('777')
    expect(g?.getAttribute('transform')).toContain('999')
  })

  it('SR2-LG-07 边 label：沿贝塞尔中点渲染真实文本；空 label 边不渲染 text', () => {
    const nodes = [
      node('A', { year: 2020, title: '源头' }),
      node('B', { year: 2021, title: '承接' }),
      node('C', { year: 2021, title: '旁支' })
    ]
    const labeled: LineageEdge = { ...edge('A', 'B'), label: '方法继承链' }
    const edges = [labeled, edge('A', 'C')]
    mount(<LineageCanvas nodes={nodes} edges={edges} />)
    // 带 label 边：真实文本渲染（「渲染出真实文本」红线）+测试钩子
    expect(host?.querySelector('[data-edge-label="e-A-B"]')?.textContent).toBe('方法继承链')
    expect(host?.textContent).toContain('方法继承链')
    // 空 label 边：不产生 text 节点（无钩子无空壳）；边 path 本身不受影响
    expect(host?.querySelector('[data-edge-label="e-A-C"]')).toBeNull()
    expect(host?.querySelectorAll('[data-edge-id]').length).toBe(2)
  })
})

describe('LineageCanvas —— pan/zoom（INV-14）', () => {
  it('zoom：滚轮上滚放大（scale>1）', () => {
    mount(<LineageCanvas nodes={chain().nodes} edges={chain().edges} />)
    const svg = host?.querySelector('svg') as SVGSVGElement
    expect(viewportTransform()).toContain('scale(1)')
    act(() => {
      svg.dispatchEvent(new WheelEvent('wheel', { deltaY: -240, clientX: 300, clientY: 200, cancelable: true }))
    })
    expect(viewportTransform()).not.toContain('scale(1)')
    expect(viewportTransform()).toMatch(/scale\([1-9]/)
  })

  it('zoom 钳制：连续放大不超 4，连续缩小不低 0.25', () => {
    mount(<LineageCanvas nodes={chain().nodes} edges={chain().edges} />)
    const svg = host?.querySelector('svg') as SVGSVGElement
    for (let i = 0; i < 30; i++) {
      act(() => {
        svg.dispatchEvent(new WheelEvent('wheel', { deltaY: -5000, clientX: 300, clientY: 200, cancelable: true }))
      })
    }
    expect(viewportTransform()).toContain('scale(4)')
    for (let i = 0; i < 60; i++) {
      act(() => {
        svg.dispatchEvent(new WheelEvent('wheel', { deltaY: 5000, clientX: 300, clientY: 200, cancelable: true }))
      })
    }
    expect(viewportTransform()).toContain('scale(0.25)')
  })

  it('pan：空白处拖拽平移（translate 变化）；节点上按下不平移', () => {
    mount(<LineageCanvas nodes={chain().nodes} edges={chain().edges} />)
    const bg = host?.querySelector('[data-panbg]') as Element
    const before = viewportTransform()
    act(() => {
      bg.dispatchEvent(new MouseEvent('pointerdown', { clientX: 100, clientY: 100, bubbles: true }))
    })
    act(() => {
      window.dispatchEvent(new MouseEvent('pointermove', { clientX: 180, clientY: 140 }))
    })
    act(() => {
      window.dispatchEvent(new MouseEvent('pointerup', { clientX: 180, clientY: 140 }))
    })
    const after = viewportTransform()
    expect(after).not.toBe(before)
    expect(after).toContain('translate(80, 40)')
    // 节点上按下（非空白）不进入拖拽
    const card = host?.querySelector('[data-node-id="A"]') as Element
    const fixed = after
    act(() => {
      card.dispatchEvent(new MouseEvent('pointerdown', { clientX: 50, clientY: 50, bubbles: true }))
    })
    act(() => {
      window.dispatchEvent(new MouseEvent('pointermove', { clientX: 150, clientY: 150 }))
    })
    act(() => {
      window.dispatchEvent(new MouseEvent('pointerup', { clientX: 150, clientY: 150 }))
    })
    expect(viewportTransform()).toBe(fixed)
  })

  it('INV-14 成对清理：unmount 后 svg/window 上注册的 listener 同 type 同引用全移除', () => {
    const added: Array<{ target: string; type: string; fn: EventListener }> = []
    const removed: Array<{ target: string; type: string; fn: EventListener }> = []
    const origWinAdd = window.addEventListener.bind(window)
    const origWinRemove = window.removeEventListener.bind(window)
    // 原函数不 bind（bind 会把 this 固定在 prototype 上，jsdom 拒绝非元素 this）
    const origSvgAdd = SVGSVGElement.prototype.addEventListener
    const origSvgRemove = SVGSVGElement.prototype.removeEventListener
    const winAdd = vi.spyOn(window, 'addEventListener').mockImplementation(((type: string, fn: EventListener) => {
      added.push({ target: 'window', type, fn })
      return origWinAdd(type, fn)
    }) as typeof window.addEventListener)
    const winRemove = vi.spyOn(window, 'removeEventListener').mockImplementation(((type: string, fn: EventListener) => {
      removed.push({ target: 'window', type, fn })
      return origWinRemove(type, fn)
    }) as typeof window.removeEventListener)
    const svgAdd = vi
      .spyOn(SVGSVGElement.prototype, 'addEventListener')
      .mockImplementation((function (this: SVGSVGElement, type: string, fn: EventListener) {
        added.push({ target: this.dataset.testid ?? 'svg', type, fn })
        return origSvgAdd.call(this, type, fn)
      }) as typeof SVGSVGElement.prototype.addEventListener)
    const svgRemove = vi
      .spyOn(SVGSVGElement.prototype, 'removeEventListener')
      .mockImplementation((function (this: SVGSVGElement, type: string, fn: EventListener) {
        removed.push({ target: this.dataset.testid ?? 'svg', type, fn })
        return origSvgRemove.call(this, type, fn)
      }) as typeof SVGSVGElement.prototype.removeEventListener)

    try {
      mount(<LineageCanvas nodes={chain().nodes} edges={chain().edges} />)
      expect(added.filter((a) => a.type === 'wheel').length).toBeGreaterThanOrEqual(1)
      act(() => {
        root?.unmount()
      })
      root = null
      // 每一笔注册（本组件挂载期）都有同 target+type+同函数引用 的移除与之配对
      for (const a of added) {
        const match = removed.find((r) => r.target === a.target && r.type === a.type && r.fn === a.fn)
        expect(match, `未配对移除：${a.target} ${a.type}`).toBeDefined()
      }
    } finally {
      winAdd.mockRestore()
      winRemove.mockRestore()
      svgAdd.mockRestore()
      svgRemove.mockRestore()
    }
  })
})

describe('R2-LG9 星象板视觉（夜幕宿主/渐变 defs/角饰/层带刻度/边辉）', () => {
  it('夜幕宿主：画布 svg 被夜幕容器包裹+星空装饰层存在（aria-hidden 装饰纪律）', () => {
    const g = chain()
    mount(<LineageCanvas nodes={g.nodes} edges={g.edges} />)
    const svg = host?.querySelector('[data-testid="lineage-canvas"]')
    expect(svg?.parentElement?.classList.contains('lineage-night')).toBe(true)
    // 装饰层 ≥3（两层星空平铺+✦ 四芒星组）且全部 aria-hidden（不参与可访问树）
    const decor = host?.querySelectorAll('.lineage-night [data-night-decor]')
    expect(decor?.length ?? 0).toBeGreaterThanOrEqual(3)
    for (const d of decor ?? []) {
      expect(d.getAttribute('aria-hidden')).toBe('true')
    }
  })

  it('节点渐变 defs：lg-node-face linearGradient 三档 stop+金辉 filter lg-edge-glow 存在', () => {
    const g = chain()
    mount(<LineageCanvas nodes={g.nodes} edges={g.edges} />)
    expect(host?.querySelector('svg defs #lg-node-face')).not.toBeNull()
    expect(host?.querySelectorAll('svg defs #lg-node-face stop').length).toBe(3)
    expect(host?.querySelector('svg defs #lg-edge-glow feGaussianBlur')).not.toBeNull()
  })

  it('节点金角饰：每个节点 g 内两枚 L 形角饰 path（data-corner 钩）', () => {
    const g = chain()
    mount(<LineageCanvas nodes={g.nodes} edges={g.edges} />)
    expect(host?.querySelectorAll('[data-node-id] path[data-corner]').length).toBe(6)
  })

  it('层带金微光+菱形刻度：每层带 rect[data-band-tick] rotate45；线为实线（无 dasharray）', () => {
    const g = chain()
    mount(<LineageCanvas nodes={g.nodes} edges={g.edges} />)
    // chain：2020/2021(null 无)/2020,2021,2022 → 3 层
    const ticks = host?.querySelectorAll('[data-layer-year] rect[data-band-tick]')
    expect(ticks?.length).toBe(3)
    for (const t of ticks ?? []) {
      expect(t.getAttribute('transform')).toContain('rotate(45)')
    }
    const lines = host?.querySelectorAll('[data-layer-year] line')
    expect(lines?.length).toBe(3)
    for (const l of lines ?? []) {
      expect(l.getAttribute('stroke-dasharray')).toBeNull()
    }
    // 层带年份标「YYYY 年」文案逐字保留（e2e getByText 断言面）
    expect(host?.textContent).toContain('2020 年')
  })

  it('边辉（合法边）：实链金描边+glow；推断边虚线银（无 glow）', () => {
    const nodes = [
      node('A', { year: 2020, title: '源头' }),
      node('B', { year: 2021, title: '承接' }),
      node('C', { year: 2022, title: '流变' })
    ]
    const inferred: LineageEdge = { ...edge('A', 'B'), label: '谱系推断' }
    const solid: LineageEdge = { ...edge('B', 'C'), label: '实链·继承' }
    mount(<LineageCanvas nodes={nodes} edges={[inferred, solid]} />)
    const p1 = host?.querySelector('[data-edge-id="e-A-B"]')
    expect(p1?.getAttribute('stroke-dasharray')).toBe('5 4')
    expect(p1?.getAttribute('filter')).toBeNull()
    const p2 = host?.querySelector('[data-edge-id="e-B-C"]')
    expect(p2?.getAttribute('stroke')).toBe('var(--gold-night)')
    expect(p2?.getAttribute('filter')).toBe('url(#lg-edge-glow)')
    expect(p2?.getAttribute('stroke-dasharray')).toBeNull()
  })
})

describe('R2-LG10 auto-fit 视口自适应（票面 P1）', () => {
  it('首载 fit：全图+层带标签入视口（transform 离开初始 {0,0,1}；k=容纳比取小）', () => {
    const spy = stubViewportRect(800, 600)
    try {
      const g = chain()
      mount(<LineageCanvas nodes={g.nodes} edges={g.edges} />)
      const v = parseViewport(viewportTransform())
      expect(v).not.toBeNull()
      // 手算（chain 全短档题名 NODE_W=180）：链 3 层 y∈[-32,312]（H=344）、
      // x∈[-200,180]（左缘含层带标签 BAND_LEFT=-200，W=380）；边距上下 80/
      // 左右 120 → k=min(560/380, 440/344)=440/344≈1.2791
      expect(v!.k).toBeCloseTo(440 / 344, 6)
      expect(v!.tx).toBeCloseTo(120 + 200 * (440 / 344), 6)
      expect(v!.ty).toBeCloseTo(80 + 32 * (440 / 344), 6)
      // LG9 N5：层带年份标（布局 x=-190 初始视口外）fit 后必入视口（screen x>0）
      expect(v!.tx - 190 * v!.k).toBeGreaterThan(0)
    } finally {
      spy.mockRestore()
    }
  })

  it('不抢用户视口：pan 置 userInteracted 后 nodes 引用变化不重置视口', () => {
    const spy = stubViewportRect(800, 600)
    try {
      const g = chain()
      mount(<LineageCanvas nodes={g.nodes} edges={g.edges} />)
      const fitted = parseViewport(viewportTransform())
      expect(fitted!.k).not.toBe(1) // fit 已生效前提锚
      // 用户 pan（panbg pointerdown=交互置位）
      const bg = host?.querySelector('[data-panbg]') as Element
      act(() => {
        bg.dispatchEvent(new MouseEvent('pointerdown', { clientX: 100, clientY: 100, bubbles: true }))
      })
      act(() => {
        window.dispatchEvent(new MouseEvent('pointermove', { clientX: 140, clientY: 110 }))
      })
      act(() => {
        window.dispatchEvent(new MouseEvent('pointerup', { clientX: 140, clientY: 110 }))
      })
      const panned = parseViewport(viewportTransform())
      expect(panned!.tx).toBeCloseTo(fitted!.tx + 40, 6)
      expect(panned!.ty).toBeCloseTo(fitted!.ty + 10, 6)
      // nodes/edges 引用变化（导入替换/写回填同型）——视口不被 fit 重置
      act(() => {
        root?.render(
          <LineageCanvas nodes={g.nodes.map((n) => ({ ...n }))} edges={g.edges.map((e) => ({ ...e }))} />
        )
      })
      const after = parseViewport(viewportTransform())
      expect(after!.tx).toBeCloseTo(panned!.tx, 6)
      expect(after!.ty).toBeCloseTo(panned!.ty, 6)
      expect(after!.k).toBe(panned!.k)
    } finally {
      spy.mockRestore()
    }
  })

  it('「适应视图」按钮：pan 抢占后显式复位重触发 fit（回到 fitted 值）', () => {
    const spy = stubViewportRect(800, 600)
    try {
      const g = chain()
      mount(<LineageCanvas nodes={g.nodes} edges={g.edges} />)
      const fitted = parseViewport(viewportTransform())
      const bg = host?.querySelector('[data-panbg]') as Element
      act(() => {
        bg.dispatchEvent(new MouseEvent('pointerdown', { clientX: 100, clientY: 100, bubbles: true }))
      })
      act(() => {
        window.dispatchEvent(new MouseEvent('pointermove', { clientX: 150, clientY: 130 }))
      })
      act(() => {
        window.dispatchEvent(new MouseEvent('pointerup', { clientX: 150, clientY: 130 }))
      })
      expect(parseViewport(viewportTransform())!.tx).not.toBeCloseTo(fitted!.tx, 6)
      const btn = host?.querySelector('[data-testid="lineage-fit-view"]') as HTMLButtonElement | null
      expect(btn).not.toBeNull()
      act(() => {
        btn?.click()
      })
      const v = parseViewport(viewportTransform())
      expect(v!.tx).toBeCloseTo(fitted!.tx, 6)
      expect(v!.ty).toBeCloseTo(fitted!.ty, 6)
      expect(v!.k).toBeCloseTo(fitted!.k, 6)
    } finally {
      spy.mockRestore()
    }
  })

  it('R2-LG10 题名分档宽：长题名卡 rect 宽 260/短题名 180（nodeWidth 单源消费）', () => {
    const nodes = [
      node('S', { year: 2020, title: '短题名' }),
      node('L', { year: 2021, title: '长'.repeat(29) })
    ]
    mount(<LineageCanvas nodes={nodes} edges={[]} />)
    expect(host?.querySelector('[data-node-id="S"] rect')?.getAttribute('width')).toBe('180')
    expect(host?.querySelector('[data-node-id="L"] rect')?.getAttribute('width')).toBe('260')
  })
})

describe('LineagePage —— 取数三态（lineage.store 数据单源）', () => {
  it('loading：挂载期呈加载文案，graph 取数一次', async () => {
    stubApi.lineage.graph.mockReturnValue(new Promise(() => undefined))
    mount(<LineagePage />)
    expect(host?.textContent).toContain('正在加载脉络图')
    expect(stubApi.lineage.graph).toHaveBeenCalledTimes(1)
    expect(stubApi.lineage.graph).toHaveBeenCalledWith({})
  })

  it('ready：取数成功渲染节点真实文本（经 store 分发，画布消费）', async () => {
    const g = chain()
    stubApi.lineage.graph.mockResolvedValue({ ok: true, data: g })
    mount(<LineagePage />)
    await flush()
    expect(host?.textContent).toContain('扩散模型起点')
    expect(useLineageStore.getState().status).toBe('ready')
  })

  it('ready 空图：空态文案（列表型空非错误）', async () => {
    stubApi.lineage.graph.mockResolvedValue({ ok: true, data: { nodes: [], edges: [] } })
    mount(<LineagePage />)
    await flush()
    expect(host?.textContent).toContain('暂无脉络图——导入草稿或添加节点')
  })

  it('error：取数失败呈错误条+重试按钮；重试再取数成功恢复', async () => {
    stubApi.lineage.graph.mockRejectedValueOnce(new Error('db locked'))
    mount(<LineagePage />)
    await flush()
    expect(host?.querySelector('[role="alert"]')?.textContent).toContain('脉络图加载失败')
    const retry = host?.querySelector('button') as HTMLButtonElement
    expect(retry.textContent).toBe('重试')
    stubApi.lineage.graph.mockResolvedValue({ ok: true, data: chain() })
    await act(async () => {
      retry.click()
    })
    await flush()
    expect(host?.textContent).toContain('扩散模型起点')
    expect(stubApi.lineage.graph).toHaveBeenCalledTimes(2)
  })

  it('store 数据缓存：Page 卸载后 nodes/edges 驻留（03/04 消费面免二次取数）', async () => {
    const g = chain()
    stubApi.lineage.graph.mockResolvedValue({ ok: true, data: g })
    mount(<LineagePage />)
    await flush()
    act(() => {
      root?.unmount()
    })
    root = null
    expect(useLineageStore.getState().nodes.length).toBe(3)
    expect(useLineageStore.getState().status).toBe('ready')
  })
})
