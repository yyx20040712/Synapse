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
