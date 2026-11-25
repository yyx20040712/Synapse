// @vitest-environment jsdom
/**
 * [T3-P7A] EdgeOverlay 结构测试——D-1/D-2/D-22+回炉 1（W1/W5/W6/W7）。
 * [F-LGRAPH-01②U8] 视觉字段内联重整：sub 覆盖→dashed/color inline 直渲染
 * （A3）；data-kind DOM 退役（data-dashed 软标记）+悬停高亮 CSS 锁（U2）。
 * jsdom 无布局（getBoundingClientRect 恒 0）——路径 d 断言=非空形态锁
 * （几何正确性由 lineage-routing.test 经注入 snapshot 直测 routeAll 输出
 * 承载，本件锁结构/属性/样式映射/再触发/CSS 文本）。always-active 裸
 * describe（K3）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { LineageEdge, LineageNode } from '../../../src/shared/models/lineage'
import type { TimelineYearGroup } from '../../../src/renderer/features/lineage/lineage-timeline'
import { EdgeOverlay } from '../../../src/renderer/features/lineage/EdgeOverlay'
import { LineageTimeline } from '../../../src/renderer/features/lineage/LineageTimeline'

// act() 环境声明（lineage-timeline.test 同口径）
;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

function node(id: string): LineageNode {
  return {
    id, paperId: `paper-${id}`, title: `节点${id}`, year: 2022,
    x: null, y: null, month: 5, slot: null, folderId: '__main__', createdAt: 't', updatedAt: 't'
  }
}

function edge(
  id: string,
  from: string,
  to: string,
  dashed = false,
  color = '#1e3a8a',
  via?: Array<{ x: number; y: number }>
): LineageEdge {
  return { id, fromNode: from, toNode: to, label: '', dashed, color, ...(via !== undefined ? { via } : {}), createdAt: 't', updatedAt: 't' }
}

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
 *  rAF 队列化使快照采集读到卡 DOM——jsdom 零 rect 下产出退化几何但非空路径）。
 *  [B5 设计稿 §4.1/§4.2/§11.4——wave C 2026-11-25 断言翻转] extra=可选 prop 透传（focusMode——focus 模式
 *  hover 扫描的独立交互信号；原 focusDim/brightIds 判定集面随无 dim 退役） */
/** [F-LANEGRID-01 B2b] 月框伴生（快照 frames 源——车道 x 域；jsdom 零盒下
 *  无框即空车道表→自动边全 blocked）：rect 桩 (0,0,600,400) 覆盖全部夹具卡 */
function addFrameRect(parent: HTMLElement): void {
  const frameEl = document.createElement('div')
  frameEl.className = 'month-frame'
  frameEl.dataset.frameKey = 'k'
  parent.appendChild(frameEl)
  Object.defineProperty(frameEl, 'getBoundingClientRect', {
    value: () => ({ left: 0, top: 0, right: 600, bottom: 400, width: 600, height: 400, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect,
    configurable: true
  })
}

function mountOverlay(
  nodes: LineageNode[],
  edges: LineageEdge[],
  routeEpoch = 0,
  contentW = 0,
  rects: Array<[string, number, number, number, number]> = [],
  extra?: { focusMode?: boolean }
): void {
  stubRaf()
  host = document.createElement('div')
  host.className = 'tl-content'
  document.body.appendChild(host)
  // [F-LANEGRID-01 B2b] host rect 恒桩（contentH=车道 y 域上界；width=contentW
  // 供 contentW 采集——旧零盒下 0 使横道族退化）
  vi.spyOn(host, 'getBoundingClientRect').mockReturnValue({
    x: 0, y: 0, left: 0, top: 0, right: contentW || 600, bottom: 400, width: contentW || 600, height: 400, toJSON: () => ({})
  } as DOMRect)
  root = createRoot(host)
  act(() => {
    root?.render(
      <EdgeOverlay
        nodes={nodes}
        edges={edges}
        shiftedIds={new Set()}
        groups={[]}
        routeEpoch={routeEpoch}
        focusMode={extra?.focusMode}
      />
    )
  })
  addFrameRect(host) // render 后注入（createRoot 首渲染清空宿主）
  for (const n of nodes) {
    const card = document.createElement('div')
    card.className = 'tl-card'
    card.dataset.nodeId = n.id
    host.appendChild(card)
  }
  // [F-SLOTGRID-01 U2] 可选卡 rect 桩（首帧 flush 前注入——真机非零 rect 口径）
  for (const [id, x, y, w, h] of rects) {
    const card = host.querySelector(`.tl-card[data-node-id="${id}"]`)
    if (card === null) continue
    Object.defineProperty(card, 'getBoundingClientRect', {
      value: () =>
        ({ left: x, top: y, right: x + w, bottom: y + h, width: w, height: h, x, y, toJSON: () => ({}) }) as DOMRect,
      configurable: true
    })
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

/** [B5 §4.1] d 属性最长段中点（jsdom 零布局——几何由 d 值单源推导；hover 扫描命中点） */
function longestSegMid(d: string): { x: number; y: number } {
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

describe('T3-P7A EdgeOverlay 结构渲染（D-1/D-2/D-22；U8 视觉内联）', () => {
  it('svg.tl-edges 挂载；每边两 path（tl-edge 可见+tl-edge-hit 命中）+data-edge-id/data-dashed；d 非空', () => {
    // [F-SLOTGRID-01 U2] 卡 rect 桩（零 rect 退化几何下 overlap 零长路径=d 空，
    // 与「d 非空」形态锁冲突——真机卡恒非零 rect）：A/B 同列竖叠+S 远侧
    // （e1=direct/e2=h-slip——结构断言与态无关）
    mountOverlay(
      [node('A'), node('B'), node('S')],
      [edge('e1', 'A', 'B'), edge('e2', 'S', 'A', true, '#c07a2a')],
      0,
      0,
      [
        ['A', 0, 0, 10, 10],
        ['B', 0, 100, 10, 10],
        ['S', 200, 0, 10, 10]
      ]
    )
    const svg = host?.querySelector('svg.tl-edges')
    expect(svg).not.toBeNull()
    expect(svg?.parentElement?.classList.contains('tl-content')).toBe(true)
    const visible = host?.querySelectorAll('path.tl-edge') ?? []
    const hits = host?.querySelectorAll('path.tl-edge-hit') ?? []
    expect(visible.length).toBe(2)
    expect(hits.length).toBe(2)
    const dashed = [...visible].map((p) => p.getAttribute('data-dashed'))
    expect(dashed).toEqual(['0', '1'])
    expect(visible[0]?.getAttribute('data-edge-id')).toBe('e1')
    for (const p of visible) expect(p.getAttribute('d')?.length ?? 0).toBeGreaterThan(0)
    // 命中层与可见层同 d（同一 RoutedPath 双 path 承载）
    const dOf = (id: string): string | null =>
      Array.from(visible).find((q) => q.getAttribute('data-edge-id') === id)?.getAttribute('d') ?? null
    for (const p of hits) expect(p.getAttribute('d')).toBe(dOf(p.getAttribute('data-edge-id') ?? ''))
  })

  it('[F-LGRAPH-01②U8] 视觉字段内联（A3）：dashed/color inline 直渲染（stroke/strokeDasharray）', () => {
    mountOverlay(
      [node('A'), node('B')],
      [edge('e1', 'A', 'B', true, '#c07a2a'), edge('e2', 'B', 'A')],
      0, 0, [['A', 0, 0, 10, 10], ['B', 0, 100, 10, 10]]
    )
    const dashedPath = host?.querySelector<SVGPathElement>('path.tl-edge[data-edge-id="e1"]')
    expect(dashedPath?.style.stroke).toBe('#c07a2a')
    expect(dashedPath?.style.strokeDasharray).toBe('6 3')
    const solid = host?.querySelector<SVGPathElement>('path.tl-edge[data-edge-id="e2"]')
    expect(solid?.style.stroke).toBe('#1e3a8a')
    expect(solid?.style.strokeDasharray).toBe('none')
  })

  it('routeEpoch 再触发（回炉 1 W1/W6）：几何变更后 epoch bump→rAF 内重路由（d 变）；epoch 不变不重算', () => {
    const nodes = [node('A'), node('B')]
    const edges = [edge('e1', 'A', 'B')]
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
    Object.defineProperty(host, 'getBoundingClientRect', {
      value: () => ({ left: 0, top: 0, right: 600, bottom: 400, width: 600, height: 400, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect,
      configurable: true
    })
    root = createRoot(host)
    renderAt(0)
    addFrameRect(host)
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

  it('[F-LANEGRID-01 B2b] data-route 二值域正锚：自动边（直连/L 形）均读出 grid（六态枚举退役零出现）+零 console.warn', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    // 非零卡矩形避免 blocked 安全网撤销全部 path，确保路由域断言读取真实节点。
    mountOverlay(
      [node('A'), node('B'), node('S')],
      [edge('e1', 'A', 'B'), edge('e2', 'A', 'S')],
      0, 0, [['A', 0, 0, 10, 10], ['B', 0, 100, 10, 10], ['S', 200, 0, 10, 10]]
    )
    const routes = Array.from(host?.querySelectorAll('path.tl-edge') ?? []).map(
      (el) => (el as SVGPathElement).dataset.route ?? ''
    )
    expect(routes).toHaveLength(2)
    expect(routes).toEqual(['grid', 'grid'])
    expect(routes.every((r) => r !== ''), 'route 非空卫').toBe(true)
    const allowed = new Set(['grid', 'manual-override'])
    for (const r of routes) {
      expect(allowed.has(r), `route=${r} ∈ 二值域（六态枚举零出现）`).toBe(true)
    }
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it('[F-LINEAGE-02] manual-override：via 在场→path 在场+DOM 末位（自动边保序在前——W-4 命中优先级）', () => {
    mountOverlay(
      [node('A'), node('B')],
      [
        edge('e0', 'A', 'B'),
        edge('e1', 'A', 'B', false, '#1e3a8a', [{ x: 40, y: 30 }, { x: 40, y: 60 }]),
        edge('e2', 'B', 'A')
      ],
      0, 0, [['A', 0, 0, 10, 10], ['B', 0, 100, 10, 10]]
    )
    const visible = [...(host?.querySelectorAll('path.tl-edge') ?? [])]
    expect(visible.length).toBe(3)
    expect(visible.map((p) => p.getAttribute('data-edge-id'))).toEqual(['e0', 'e2', 'e1'])
    const manualPath = visible[2]!
    expect(manualPath.getAttribute('d')?.length ?? 0).toBeGreaterThan(0)
    // 命中层同序（manual 的 hit 层亦末位——命中恒最上）
    const hits = [...(host?.querySelectorAll('path.tl-edge-hit') ?? [])]
    expect(hits.map((p) => p.getAttribute('data-edge-id'))).toEqual(['e0', 'e2', 'e1'])
    // [F-SLOTGRID-01 U2] 错峰 inline opacity 源随 lane 退役删除——manual 边无 opacity 覆盖
    expect((manualPath as SVGPathElement).style.opacity).toBe('')
  })

  it('[F-LANEGRID-01 B2b] 观测钩子 DOM 挂线（同对双直连边）：e1 data-lane=v164/e2 散开后 v196（互异道）+data-slot 族零残留', () => {
    stubRaf()
    host = document.createElement('div')
    host.className = 'tl-content'
    document.body.appendChild(host)
    // 卡 rect 桩（routeEpoch 例同型）：A/B 同列 128×72 真几何（z=1）——行隙
    // 单元 [100,228]×[172,300] 槽位 128/146/164/182/200（域=宽−20 公式）
    Object.defineProperty(host, 'getBoundingClientRect', {
      value: () =>
        ({ left: 0, top: 0, right: 1000, bottom: 500, width: 1000, height: 500, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect,
      configurable: true
    })
    root = createRoot(host)
    act(() => {
      root?.render(
        <EdgeOverlay
          nodes={[node('A'), node('B')]}
          edges={[edge('e1', 'A', 'B'), edge('e2', 'A', 'B')]}
          shiftedIds={new Set()}
          groups={[]}
          routeEpoch={0}
        />
      )
    })
    addFrameRect(host)
    const rects: Array<[string, number, number, number, number]> = [
      ['A', 100, 100, 128, 72],
      ['B', 100, 300, 128, 72]
    ]
    for (const [id, x, y, w, h] of rects) {
      const card = document.createElement('div')
      card.className = 'tl-card'
      card.dataset.nodeId = id
      Object.defineProperty(card, 'getBoundingClientRect', {
        value: () =>
          ({ left: x, top: y, right: x + w, bottom: y + h, width: w, height: h, x, y, toJSON: () => ({}) }) as DOMRect,
        configurable: true
      })
      host.appendChild(card)
    }
    flushRafs()
    // e1（½/½ 锚 b1/t1）同道 v164 直连；e2（散开 ¾/¾ 锚 b2/t2）同道 v196
    // 直连——互异道 |Δ|=32≥8 无冲突（buildSnapshot 采卡 rect（z=1）→routeAll
    // 同几何，routing 同列双直连同款）
    const e1 = host?.querySelector<SVGPathElement>('path.tl-edge[data-edge-id="e1"]')
    const e2 = host?.querySelector<SVGPathElement>('path.tl-edge[data-edge-id="e2"]')
    expect(e1).not.toBeNull()
    expect(e2).not.toBeNull()
    expect(e1?.getAttribute('data-route')).toBe('grid')
    expect(e2?.getAttribute('data-route')).toBe('grid')
    expect(e1?.getAttribute('data-lane')).toBe('v164:172-300')
    expect(e2?.getAttribute('data-lane')).toBe('v196:172-300')
    expect(e1?.getAttribute('data-overlap-exempt')).toBeNull()
    // [B2b] 旧观测面零残留负锚（slot 族 DOM 属性随六态退役）
    expect(e1?.getAttribute('data-slot')).toBeNull()
    expect(e1?.getAttribute('data-slot-fallback')).toBeNull()
    expect(e1?.getAttribute('data-detour')).toBeNull()
    expect(e2?.getAttribute('data-slot')).toBeNull()
    expect(e2?.getAttribute('data-overlap-exempt')).toBeNull()
    expect(e2?.getAttribute('data-slot-fallback')).toBeNull()
  })

  it('onEdgeHitClick 接线：命中层点击→(edgeId, 事件) 上抛；缺省不挂不崩', () => {
    stubRaf()
    host = document.createElement('div')
    host.className = 'tl-content'
    document.body.appendChild(host)
    Object.defineProperty(host, 'getBoundingClientRect', {
      value: () => ({ left: 0, top: 0, right: 600, bottom: 400, width: 600, height: 400, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect,
      configurable: true
    })
    root = createRoot(host)
    const onHit = vi.fn()
    act(() => {
      root?.render(
        <EdgeOverlay
          nodes={[node('A'), node('B')]}
          edges={[edge('e1', 'A', 'B')]}
          shiftedIds={new Set()}
          groups={[]}
          routeEpoch={0}
          onEdgeHitClick={onHit}
        />
      )
    })
    addFrameRect(host)
    for (const n of [node('A'), node('B')]) {
      const card = document.createElement('div')
      card.className = 'tl-card'
      card.dataset.nodeId = n.id
      const y = n.id === 'A' ? 0 : 100
      Object.defineProperty(card, 'getBoundingClientRect', { value: () => ({ left: 0, top: y, right: 10, bottom: y + 10, width: 10, height: 10, x: 0, y, toJSON: () => ({}) }) as DOMRect, configurable: true })
      host.appendChild(card)
    }
    flushRafs()
    const hit = host?.querySelector<SVGPathElement>('path.tl-edge-hit')
    expect(hit).not.toBeNull()
    act(() => {
      hit?.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 33, clientY: 44 }))
    })
    expect(onHit).toHaveBeenCalledWith('e1', expect.objectContaining({ clientX: 33, clientY: 44 }))
  })

  it('[回炉 R2] 悬停高亮=命中层驱动同键类：pointerover 命中层→可见层挂 .hovered；pointerout 撤；非 edit 不挂', () => {
    // 交互面：.tl-edge pointer-events:none 恒不可 hover——由命中层
    // .tl-edge-hit 的 pointerover/out 联动可见层同键类（edit 态）
    stubRaf()
    host = document.createElement('div')
    host.className = 'tl-content'
    document.body.appendChild(host)
    Object.defineProperty(host, 'getBoundingClientRect', {
      value: () => ({ left: 0, top: 0, right: 600, bottom: 400, width: 600, height: 400, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect,
      configurable: true
    })
    root = createRoot(host)
    const renderAt = (edit: boolean): void => {
      act(() => {
        root?.render(
          <EdgeOverlay
            nodes={[node('A'), node('B')]}
            edges={[edge('e1', 'A', 'B'), edge('e2', 'B', 'A')]}
            shiftedIds={new Set()}
            groups={[]}
            routeEpoch={0}
            editEnabled={edit}
          />
        )
      })
    }
    renderAt(true)
    addFrameRect(host)
    for (const n of [node('A'), node('B')]) {
      const card = document.createElement('div')
      card.className = 'tl-card'
      card.dataset.nodeId = n.id
      const y = n.id === 'A' ? 0 : 100
      Object.defineProperty(card, 'getBoundingClientRect', { value: () => ({ left: 0, top: y, right: 10, bottom: y + 10, width: 10, height: 10, x: 0, y, toJSON: () => ({}) }) as DOMRect, configurable: true })
      host.appendChild(card)
    }
    flushRafs()
    const hit = host?.querySelector<SVGElement>('path.tl-edge-hit[data-edge-id="e1"]')
    const vis = host?.querySelector<SVGElement>('path.tl-edge[data-edge-id="e1"]')
    expect(hit).not.toBeNull()
    expect(vis?.classList.contains('hovered')).toBe(false) // 基线无类
    act(() => {
      hit?.dispatchEvent(new MouseEvent('pointerover', { bubbles: true }))
    })
    expect(vis?.classList.contains('hovered')).toBe(true) // 可见层联动挂类
    act(() => {
      hit?.dispatchEvent(new MouseEvent('pointerout', { bubbles: true }))
    })
    expect(vis?.classList.contains('hovered')).toBe(false) // 移出撤类
    // 非 edit：命中层零交互（hover 面不挂）
    renderAt(false)
    flushRafs()
    const hit2 = host?.querySelector<SVGElement>('path.tl-edge-hit[data-edge-id="e1"]')
    act(() => {
      hit2?.dispatchEvent(new MouseEvent('pointerover', { bubbles: true }))
    })
    const vis2 = host?.querySelector<SVGElement>('path.tl-edge[data-edge-id="e1"]')
    expect(vis2?.classList.contains('hovered')).toBe(false)
  })

  it('[B5 §4.1/§4.2 第 3 条/§11.4 断言翻转] 无 dim：focusMode=true 时根不挂 .dimmed-focus、逐径无 .dim、零 inline opacity；hover 扫描由独立 focusMode 信号驱动（hovered 挂/移开撤）', () => {
    mountOverlay(
      [node('A'), node('B'), node('C'), node('D')],
      [edge('e1', 'A', 'B'), edge('e2', 'C', 'D')],
      0, 0, [['A', 0, 0, 10, 10], ['B', 0, 100, 10, 10], ['C', 200, 0, 10, 10], ['D', 200, 100, 10, 10]],
      { focusMode: true }
    )
    // 原「两端均非 bright 才 dim、根挂 dimmed-focus」翻转：所有边一律全亮
    expect(host?.querySelector('svg.tl-edges')?.classList.contains('dimmed-focus')).toBe(false)
    for (const id of ['e1', 'e2']) {
      const vis = host?.querySelector<SVGPathElement>(`path.tl-edge[data-edge-id="${id}"]`)
      expect(vis, `${id} 可见径在场`).not.toBeNull()
      expect(vis?.classList.contains('dim'), `${id} 无 dim 类`).toBe(false)
      expect(vis?.style.opacity, `${id} 基态零 inline opacity`).toBe('')
    }
    expect(host?.querySelector('path.tl-edge.dim')).toBeNull()
    // hover 扫描：focusMode 驱动（document pointermove 数学命中）——挂 .hovered、移开即撤
    const hit = host?.querySelector<SVGElement>('path.tl-edge-hit[data-edge-id="e1"]')
    expect(hit, '命中层在场').not.toBeNull()
    const mid = longestSegMid(hit?.getAttribute('d') ?? '')
    docMove(mid.x, mid.y)
    expect(host?.querySelector('path.tl-edge[data-edge-id="e1"]')?.classList.contains('hovered'), 'focusMode：hover 挂类').toBe(true)
    docMove(900, 900)
    expect(host?.querySelector('path.tl-edge[data-edge-id="e1"]')?.classList.contains('hovered'), '移开撤类').toBe(false)
  })

  it('[B5 §4.1] focusMode 缺省=false：hover 扫描不激活（对照——非 focus 模式零 .hovered）', () => {
    mountOverlay(
      [node('A'), node('B')],
      [edge('e1', 'A', 'B')],
      0, 0, [['A', 0, 0, 10, 10], ['B', 0, 100, 10, 10]]
    )
    const hit = host?.querySelector<SVGElement>('path.tl-edge-hit[data-edge-id="e1"]')
    const mid = longestSegMid(hit?.getAttribute('d') ?? '')
    docMove(mid.x, mid.y)
    expect(host?.querySelector('path.tl-edge[data-edge-id="e1"]')?.classList.contains('hovered')).toBe(false)
  })

  it('[F-VISFB-21 N1] 图例零残留：渲染树无 .tl-legend/.lc 节点（死指示删除）', () => {
    stubRaf()
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    act(() => {
      root?.render(<LineageTimeline nodes={[node('A'), node('B')]} edges={[edge('e1', 'A', 'B')]} />)
    })
    flushRafs()
    expect(host?.querySelector('.timeline .tl-legend')).toBeNull()
    expect(host?.querySelector('.lc')).toBeNull()
  })
})
