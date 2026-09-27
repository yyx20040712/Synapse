// @vitest-environment jsdom
/**
 * [T3-P7A] EdgeOverlay 结构测试——D-1/D-2/D-18/D-22+回炉 1（W1/W5/W6/W7）。
 * jsdom 无布局（getBoundingClientRect 恒 0）——路径 d 断言=非空形态锁
 * （几何正确性由 lineage-routing.test 经注入 snapshot 直测 routeAll 输出
 * 承载，本件锁结构/属性/样式映射/再触发/CSS 文本）。always-active 裸
 * describe（K3）。
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { LineageEdge, LineageNode, LineTypeGroup } from '../../../src/shared/models/lineage'
import type { TimelineYearGroup } from '../../../src/renderer/features/lineage/lineage-timeline'
import { EdgeOverlay } from '../../../src/renderer/features/lineage/EdgeOverlay'
import { LineageTimeline } from '../../../src/renderer/features/lineage/LineageTimeline'

// act() 环境声明（lineage-timeline.test 同口径）
;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

const css = readFileSync(join(process.cwd(), 'src/renderer/shared/theme-lineage.css'), 'utf8')

function node(id: string): LineageNode {
  return {
    id, paperId: `paper-${id}`, title: `节点${id}`, coreIdea: '', year: 2022,
    x: null, y: null, month: 5, slot: null, createdAt: 't', updatedAt: 't'
  }
}

function edge(id: string, from: string, to: string, kind: LineageEdge['kind'], sub: string | null = null): LineageEdge {
  return { id, fromNode: from, toNode: to, label: '', kind, sub, createdAt: 't', updatedAt: 't' }
}

const LINE_TYPES: LineTypeGroup[] = [
  { base: 'tree', subs: [{ id: 't1', name: '数据驱动', color: '#123456', dash: '5 4', w: 2.5 }] },
  { base: 'inferred', subs: [] },
  { base: 'ref', subs: [] },
  { base: 'manual', subs: [] }
]

let root: Root | null = null
let host: HTMLDivElement | null = null
let rafs: FrameRequestCallback[] = []

function stubRaf(): void {
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback): number => {
    rafs.push(cb)
    return rafs.length
  })
}

/** 挂载+卡 DOM 伴生+rAF 冲洗（createRoot 首渲染清空宿主→卡注入在 render 后，
 *  rAF 队列化使快照采集读到卡 DOM——jsdom 零 rect 下产出退化几何但非空路径） */
function mountOverlay(
  nodes: LineageNode[],
  edges: LineageEdge[],
  lineTypes: LineTypeGroup[] = [],
  routeEpoch = 0
): void {
  stubRaf()
  host = document.createElement('div')
  host.className = 'tl-content'
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(
      <EdgeOverlay
        nodes={nodes}
        edges={edges}
        lineTypes={lineTypes}
        shiftedIds={new Set()}
        groups={[]}
        routeEpoch={routeEpoch}
      />
    )
  })
  for (const n of nodes) {
    const card = document.createElement('div')
    card.className = 'tl-card'
    card.dataset.nodeId = n.id
    host.appendChild(card)
  }
  flushRafs()
}

function flushRafs(): void {
  act(() => {
    rafs.splice(0).forEach((cb) => cb(0))
  })
}

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
  rafs = []
  vi.unstubAllGlobals()
})

describe('T3-P7A EdgeOverlay 结构渲染（D-1/D-2/D-18/D-22）', () => {
  it('svg.tl-edges 挂载；每边两 path（tl-edge 可见+tl-edge-hit 命中）+data-edge-id/data-kind；d 非空', () => {
    mountOverlay(
      [node('A'), node('B'), node('S')],
      [edge('e1', 'A', 'B', 'tree'), edge('e2', 'S', 'A', 'ref')],
      LINE_TYPES
    )
    const svg = host?.querySelector('svg.tl-edges')
    expect(svg).not.toBeNull()
    expect(svg?.parentElement?.classList.contains('tl-content')).toBe(true)
    const visible = host?.querySelectorAll('path.tl-edge') ?? []
    const hits = host?.querySelectorAll('path.tl-edge-hit') ?? []
    expect(visible.length).toBe(2)
    expect(hits.length).toBe(2)
    const kinds = [...visible].map((p) => p.getAttribute('data-kind'))
    expect(kinds).toEqual(['tree', 'ref'])
    expect(visible[0]?.getAttribute('data-edge-id')).toBe('e1')
    for (const p of visible) expect(p.getAttribute('d')?.length ?? 0).toBeGreaterThan(0)
    // 命中层与可见层同 d（同一 RoutedPath 双 path 承载）
    const dOf = (id: string): string | null =>
      Array.from(visible).find((q) => q.getAttribute('data-edge-id') === id)?.getAttribute('d') ?? null
    for (const p of hits) expect(p.getAttribute('d')).toBe(dOf(p.getAttribute('data-edge-id') ?? ''))
  })

  it('sub 样式覆盖（P5 数据纯消费 D-18）：edge.sub 命中→inline stroke/dash/width；基础边无 inline', () => {
    mountOverlay(
      [node('A'), node('B')],
      [edge('e1', 'A', 'B', 'tree', 't1'), edge('e2', 'B', 'A', 'manual')],
      LINE_TYPES
    )
    const styled = host?.querySelector<SVGPathElement>('path.tl-edge[data-edge-id="e1"]')
    expect(styled?.style.stroke).toBe('#123456')
    expect(styled?.style.strokeDasharray).toBe('5 4')
    expect(styled?.style.strokeWidth).toBe('2.5')
    // 基础型（sub=null）走类样式——零 inline 覆盖
    const base = host?.querySelector<SVGPathElement>('path.tl-edge[data-edge-id="e2"]')
    expect(base?.style.stroke).toBe('')
  })

  it('routeEpoch 再触发（回炉 1 W1/W6）：几何变更后 epoch bump→rAF 内重路由（d 变）；epoch 不变不重算', () => {
    const nodes = [node('A'), node('B')]
    const edges = [edge('e1', 'A', 'B', 'tree')]
    // 稳定引用（inline new Set()/[] 每渲染新引用会使 deps 恒变——掩盖
    // routeEpoch 缺席=变异红证失效；epoch 触发面必须隔离为唯一变量）
    const shifted = new Set<string>()
    const groups: TimelineYearGroup[] = []
    const renderAt = (epoch: number): void => {
      act(() => {
        root?.render(
          <EdgeOverlay
            nodes={nodes}
            edges={edges}
            lineTypes={[]}
            shiftedIds={shifted}
            groups={groups}
            routeEpoch={epoch}
          />
        )
      })
    }
    stubRaf()
    host = document.createElement('div')
    host.className = 'tl-content'
    document.body.appendChild(host)
    root = createRoot(host)
    renderAt(0)
    for (const n of nodes) {
      const card = document.createElement('div')
      card.className = 'tl-card'
      card.dataset.nodeId = n.id
      host.appendChild(card)
    }
    flushRafs()
    const dOf = (): string => host?.querySelector('path.tl-edge')?.getAttribute('d') ?? ''
    const d1 = dOf()
    // 几何变更：A 卡 rect 注入 top=100（buildSnapshot 读 getBoundingClientRect）
    const cardA = host?.querySelector('.tl-card[data-node-id="A"]')
    expect(cardA).not.toBeNull()
    Object.defineProperty(cardA, 'getBoundingClientRect', {
      value: () =>
        ({ left: 0, top: 100, right: 0, bottom: 100, width: 0, height: 0, x: 0, y: 100, toJSON: () => ({}) }) as DOMRect,
      configurable: true
    })
    // epoch bump（其余 props 同引用）→ effect 重跑 → rAF flush → d 变
    renderAt(1)
    flushRafs()
    expect(dOf()).not.toBe(d1)
    // 反证锚：epoch 不变的重渲染不重路由（deps 未动——无新帧）
    const d2 = dOf()
    renderAt(1)
    flushRafs()
    expect(dOf()).toBe(d2)
  })

  it('降级 onWarn=console.warn 直通（回炉 1 W2/k1-N5——生产不静默）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    // 两卡同位（零 rect）+第三卡 S 挡走廊→某边落 fallback 触发 warn
    mountOverlay(
      [node('A'), node('B'), node('S')],
      [edge('e1', 'A', 'B', 'ref'), edge('e2', 'A', 'S', 'ref')],
      []
    )
    expect(warn).toHaveBeenCalled()
    expect(warn.mock.calls.some(([m]) => String(m).includes('lineage-routing'))).toBe(true)
    warn.mockRestore()
  })

  it('图例四项真文本挂滚动容器 .timeline（回炉 1 W7——mockup .lc 族誊录，D-18 四基础型）', () => {
    stubRaf()
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    act(() => {
      root?.render(<LineageTimeline nodes={[node('A'), node('B')]} edges={[edge('e1', 'A', 'B', 'tree')]} />)
    })
    flushRafs()
    const timeline = host?.querySelector('.timeline')
    const legend = timeline?.querySelector('.tl-legend')
    expect(legend).not.toBeNull()
    // 图例=.timeline 直接子元素（与 .tl-content 兄弟——视口级恒可见）
    expect(legend?.parentElement?.classList.contains('timeline')).toBe(true)
    const items = [...(legend?.querySelectorAll('.lc') ?? [])]
    expect(items.map((e) => e.textContent)).toEqual(['继承', '推断', '综述关联', '人工补线'])
    expect(items.every((e) => e.querySelector('i') !== null)).toBe(true)
  })

  it('CSS 锁：svg z=1 低于卡 2+inset/overflow；测量期 opacity:0（--dur-tint 过渡）；四 kind 色/纹映射；命中层 stroke 8 且 P7a 期 pointer-events:none；图例视口级定位', () => {
    expect(css).toMatch(/\.tl-edges\s*\{[^}]*position:\s*absolute;[^}]*inset:\s*0;[^}]*overflow:\s*visible;[^}]*z-index:\s*1/)
    expect(css).toMatch(/\.tl-content\.tl-measure \.tl-edges\s*\{[^}]*opacity:\s*0/)
    expect(css).toMatch(/\.tl-edges\s*\{[^}]*transition:\s*opacity var\(--dur-tint\)/)
    expect(css).toMatch(/\.tl-edge\[data-kind='tree'\]\s*\{[^}]*stroke:\s*var\(--accent\);[^}]*\}/)
    expect(css).toMatch(/\.tl-edge\[data-kind='inferred'\]\s*\{[^}]*stroke:\s*var\(--accent\);[^}]*stroke-dasharray:\s*6 3/)
    expect(css).toMatch(/\.tl-edge\[data-kind='ref'\]\s*\{[^}]*stroke:\s*var\(--faint\);[^}]*stroke-dasharray:\s*2 3/)
    expect(css).toMatch(/\.tl-edge\[data-kind='manual'\]\s*\{[^}]*stroke:\s*var\(--signal\);[^}]*stroke-dasharray:\s*6 3/)
    expect(css).toMatch(/\.tl-edge-hit\s*\{[^}]*stroke-width:\s*8;[^}]*pointer-events:\s*none/)
    // [回炉 1 W7] 图例挂 .timeline 视口级（right/bottom 12 对滚动容器定位）
    expect(css).toMatch(/\.tl-legend\s*\{[^}]*position:\s*absolute;[^}]*right:\s*12px;[^}]*bottom:\s*12px;[^}]*pointer-events:\s*none/)
    // 图例 .lc 族（mockup L212-217 誊录——i 元素 20px 线样预览）
    expect(css).toMatch(/\.lc\s*\{[^}]*display:\s*flex;[^}]*gap:\s*4px/)
    expect(css).toMatch(/\.lc i\s*\{[^}]*width:\s*20px;[^}]*border-top:\s*2px solid var\(--accent\)/)
    expect(css).toMatch(/\.lc\.i3 i\s*\{[^}]*dotted var\(--faint\)/)
  })
})
