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
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { stubViewportRect } from '../../utils/geometry'
import type { LineageEdge, LineageNode } from '../../../src/shared/models/lineage'
import { makeApiStub } from '../../utils/api-client-mock'

const stubApi = makeApiStub({ lineage: { graph: vi.fn() } })

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
    month: null,
    slot: null,
    createdAt: 't',
    updatedAt: 't'
  }
}

function edge(from: string, to: string): LineageEdge {
  return { id: `e-${from}-${to}`, fromNode: from, toNode: to, label: '', kind: 'tree', sub: null, createdAt: 't', updatedAt: 't' }
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

describe('R2-LG10 auto-fit 视口自适应（票面 P1）', () => {
  it('首载 fit：全图+层带标签入视口（transform 离开初始 {0,0,1}；k=容纳比取小）', () => {
    const { spy } = stubViewportRect(800, 600)
    try {
      const g = chain()
      mount(<LineageCanvas nodes={g.nodes} edges={g.edges} />)
      const v = parseViewport(viewportTransform())
      expect(v).not.toBeNull()
      // 手算（F-LG13 统一卡 240×110）：链 3 层 y∈[-55,335]（H=390）、
      // x∈[-200,240]（左缘含层带标签 BAND_LEFT=-200，W=440）；边距上下 80/
      // 左右 120 → k=min(560/440, 440/390)=440/390≈1.1282
      expect(v!.k).toBeCloseTo(440 / 390, 6)
      expect(v!.tx).toBeCloseTo(120 + 200 * (440 / 390), 6)
      expect(v!.ty).toBeCloseTo(80 + 55 * (440 / 390), 6)
      // LG9 N5：层带年份标（布局 x=-190 初始视口外）fit 后必入视口（screen x>0）
      expect(v!.tx - 190 * v!.k).toBeGreaterThan(0)
    } finally {
      spy.mockRestore()
    }
  })

  it('不抢用户视口：pan 置 userInteracted 后 nodes 引用变化不重置视口', () => {
    const { spy } = stubViewportRect(800, 600)
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
    const { spy } = stubViewportRect(800, 600)
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

  it('F-LG13 统一卡尺寸：短/长题名卡 rect 同 240×110（nodeWidth/nodeHeight 恒定单源消费）', () => {
    const nodes = [
      node('S', { year: 2020, title: '短题名' }),
      node('L', { year: 2021, title: '长'.repeat(29) })
    ]
    mount(<LineageCanvas nodes={nodes} edges={[]} />)
    expect(host?.querySelector('[data-node-id="S"] rect')?.getAttribute('width')).toBe('240')
    expect(host?.querySelector('[data-node-id="S"] rect')?.getAttribute('height')).toBe('110')
    expect(host?.querySelector('[data-node-id="L"] rect')?.getAttribute('width')).toBe('240')
    expect(host?.querySelector('[data-node-id="L"] rect')?.getAttribute('height')).toBe('110')
  })
})

describe('F-LG13 题名滚轮归属（卡面 g 根原生 wheel 委托——题名溢出归滚动/未溢出归 zoom）', () => {
  it('题名溢出节点上滚轮→题名 scrollTop 恰增 deltaY+画布 zoom 被阻断；未溢出→zoom 正常', () => {
    const nodes = [
      node('L', { year: 2020, title: '长'.repeat(80) }),
      node('S', { year: 2021, title: '短' })
    ]
    mount(<LineageCanvas nodes={nodes} edges={[]} />)
    // jsdom 无布局（scrollHeight/clientHeight 恒 0）——defineProperty 定溢出态
    // （⑨边标签 wheel 同族配方）
    const titleDiv = host?.querySelector('[data-node-id="L"] foreignObject div div') as Element
    expect(titleDiv).toBeTruthy()
    Object.defineProperty(titleDiv, 'scrollHeight', { get: () => 300, configurable: true })
    Object.defineProperty(titleDiv, 'clientHeight', { get: () => 80, configurable: true })
    const before = viewportTransform()
    act(() => {
      titleDiv.dispatchEvent(
        new WheelEvent('wheel', { deltaY: 240, clientX: 300, clientY: 200, bubbles: true, cancelable: true })
      )
    })
    // 滚轮归题名：scrollTop 恰增 deltaY（钳 [0, 300-80]=220）+zoom 不触发
    expect(titleDiv.scrollTop).toBe(220)
    expect(viewportTransform()).toBe(before)
    // 未溢出节点（短题名 scrollHeight=clientHeight=0）→滚轮归画布 zoom
    const shortTitle = host?.querySelector('[data-node-id="S"] foreignObject div div') as Element
    act(() => {
      shortTitle.dispatchEvent(
        new WheelEvent('wheel', { deltaY: -240, clientX: 300, clientY: 200, bubbles: true, cancelable: true })
      )
    })
    expect(viewportTransform()).not.toBe(before)
    expect(shortTitle.scrollTop).toBe(0)
  })
})

describe('F-L1-C 边标签（变体 C 换行+防重叠放置+悬停滚动）', () => {
  /** ⑦⑧⑨ 共用夹具：A(y=0)→B(y=400 覆盖) 树边 + B→A 反向 ref 边——两锚同点
   *  (90,200)（中点公式对称），节点盒外扩后不遮候选区（放置器可自由错开） */
  function widePair(): { nodes: LineageNode[]; edges: LineageEdge[] } {
    const long = '谱'.repeat(40)
    const nodes = [node('A', { year: 2020, y: 0, title: '源头' }), node('B', { year: 2021, y: 400, title: '承接' })]
    const e1: LineageEdge = { ...edge('A', 'B'), label: long }
    const e2: LineageEdge = { ...edge('B', 'A'), label: long, kind: 'ref' }
    return { nodes, edges: [e1, e2] }
  }

  it('⑦标签渲染形态：foreignObject 内 HTML div（class lineage-edge-label）+FO 恒 130×39+title 全文 tooltip', () => {
    const g = widePair()
    mount(<LineageCanvas nodes={g.nodes} edges={g.edges} />)
    const label = host?.querySelector('[data-edge-label]')
    expect(label?.tagName).toBe('DIV')
    expect(label?.classList.contains('lineage-edge-label')).toBe(true)
    // FO 恒上限尺寸（主控预裁 1：短标签透明空区免 est 偏差裁字）
    const fo = label?.closest('foreignObject')
    expect(fo?.getAttribute('width')).toBe('130')
    expect(fo?.getAttribute('height')).toBe('39')
    expect(label?.getAttribute('title')).toBe('谱'.repeat(40))
  })

  it('⑧slots 传递：同锚两条长标签经放置器错开（两 FO 位置不等——回炉 1 R1 后首自由位=dx 第二档 166）', () => {
    const g = widePair()
    mount(<LineageCanvas nodes={g.nodes} edges={g.edges} />)
    const fos = [...(host?.querySelectorAll('[data-edge-label]') ?? [])].map((el) => {
      const fo = el.closest('foreignObject')
      return { x: Number(fo?.getAttribute('x')), y: Number(fo?.getAttribute('y')) }
    })
    expect(fos.length).toBe(2)
    // e1 落锚；e2 首自由位：dy=0 档 dx 第二档 −166（dxs 序负档先于正档；
    // 回炉 1 R1 扩容——原单档 ±83 恒相交必竖移升档，扩容后横移档先分离）
    expect(fos[1]!.x - fos[0]!.x).toBeCloseTo(-166, 6)
    expect(fos[1]!.y).toBe(fos[0]!.y)
  })

  it('⑨wheel 主动滚动（回炉 1 R2）：截断标签上滚轮→scrollTop 恰增 deltaY+zoom 不触发；未截断→zoom 正常', () => {
    const g = widePair()
    mount(<LineageCanvas nodes={g.nodes} edges={g.edges} />)
    const labels = host?.querySelectorAll('[data-edge-label]')
    // jsdom 无布局（scrollHeight/clientHeight 恒 0）——defineProperty 定截断态
    Object.defineProperty(labels?.[0], 'scrollHeight', { get: () => 999, configurable: true })
    Object.defineProperty(labels?.[0], 'clientHeight', { get: () => 30, configurable: true })
    const before = viewportTransform()
    act(() => {
      labels?.[0]?.dispatchEvent(
        new WheelEvent('wheel', { deltaY: 240, clientX: 300, clientY: 200, bubbles: true, cancelable: true })
      )
    })
    // 主动滚动：scrollTop 恰增 deltaY（钳 [0, scrollHeight-clientHeight]=969）
    expect(labels?.[0]?.scrollTop).toBe(240)
    // 阻断画布 zoom（stopPropagation 在标签层先行——transform 不变）
    expect(viewportTransform()).toBe(before)
    act(() => {
      labels?.[0]?.dispatchEvent(
        new WheelEvent('wheel', { deltaY: 100, clientX: 300, clientY: 200, bubbles: true, cancelable: true })
      )
    })
    // 累计滚动（程序化可测，不依赖布局）
    expect(labels?.[0]?.scrollTop).toBe(340)
    act(() => {
      labels?.[1]?.dispatchEvent(
        new WheelEvent('wheel', { deltaY: -240, clientX: 300, clientY: 200, bubbles: true, cancelable: true })
      )
    })
    // 反向锚：未截断不吞 zoom（主控预裁 4）+不主动滚动
    expect(viewportTransform()).not.toBe(before)
    expect(labels?.[1]?.scrollTop).toBe(0)
  })

  it('⑩CSS 文本锁：theme-lineage.css 含 .lineage-edge-label 声明形态（break-word/max-height/overflow hidden）+:hover 段 overflow-y auto', () => {
    // [F-CSS-01] 拆件再锚：边标签皮肤随脉络域迁 theme-lineage.css
    const css = readFileSync(join(process.cwd(), 'src/renderer/shared/theme-lineage.css'), 'utf8')
    // 正则锚定声明形态（[^}]* 不跨段——防注释字样救活，SET1 变异③先例）
    expect(css).toMatch(/\.lineage-edge-label\s*\{[^}]*overflow-wrap:\s*break-word[^}]*\}/)
    expect(css).toMatch(/\.lineage-edge-label\s*\{[^}]*max-height[^}]*\}/)
    expect(css).toMatch(/\.lineage-edge-label\s*\{[^}]*overflow:\s*hidden[^}]*\}/)
    // 悬停滚动（用户保证②）——:hover 段承载交互态（B1 教训禁内联）
    expect(css).toMatch(/\.lineage-edge-label:hover\s*\{[^}]*overflow-y:\s*auto[^}]*\}/)
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
