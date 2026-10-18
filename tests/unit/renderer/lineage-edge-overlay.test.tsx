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
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { LineageEdge, LineageNode } from '../../../src/shared/models/lineage'
import type { TimelineYearGroup } from '../../../src/renderer/features/lineage/lineage-timeline'
import { EdgeOverlay } from '../../../src/renderer/features/lineage/EdgeOverlay'
import { LineageTimeline } from '../../../src/renderer/features/lineage/LineageTimeline'

// act() 环境声明（lineage-timeline.test 同口径）
;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

const css = readFileSync(join(process.cwd(), 'src/renderer/shared/theme-lineage.css'), 'utf8')

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
 *  [F-VISFB-21 C4] extra=可选 prop 透传（focusDim/brightIds 判定集面） */
function mountOverlay(
  nodes: LineageNode[],
  edges: LineageEdge[],
  routeEpoch = 0,
  contentW = 0,
  rects: Array<[string, number, number, number, number]> = [],
  extra?: { focusDim?: boolean; brightIds?: ReadonlySet<string> }
): void {
  stubRaf()
  host = document.createElement('div')
  host.className = 'tl-content'
  document.body.appendChild(host)
  if (contentW > 0) {
    // [回炉 R3] 车道例需真机向走廊（contentW>0——走廊在卡右侧）：jsdom 零盒
    // 下 contentW=0 使 laneX 落左侧，右锚外法线桩反向→中段回穿原点必落
    // fallback（真机几何恒 contentW>卡 x 无此形态——夹具面补真，非实现缺陷）
    vi.spyOn(host, 'getBoundingClientRect').mockReturnValue({
      x: 0, y: 0, left: 0, top: 0, right: contentW, bottom: 0, width: contentW, height: 0, toJSON: () => ({})
    } as DOMRect)
  }
  root = createRoot(host)
  act(() => {
    root?.render(
      <EdgeOverlay
        nodes={nodes}
        edges={edges}
        shiftedIds={new Set()}
        groups={[]}
        routeEpoch={routeEpoch}
        focusDim={extra?.focusDim}
        brightIds={extra?.brightIds}
      />
    )
  })
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
      [edge('e1', 'A', 'B', true, '#c07a2a'), edge('e2', 'B', 'A')]
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

  it('[F-SLOTGRID-01 U2] data-route 五态域负锚：退化几何全边 overlap 兜底（corridor/fallback DOM 零出现）+零 console.warn', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    // 两卡同位（零 rect）+第三卡 S 拦直连→全边落 overlap 兜底（忽略占用终态
    // ——走廊族退役后无 warn 面：路由降级观测=data-overlap-exempt 属性）
    mountOverlay(
      [node('A'), node('B'), node('S')],
      [edge('e1', 'A', 'B'), edge('e2', 'A', 'S')]
    )
    const routes = Array.from(host?.querySelectorAll('path.tl-edge') ?? []).map(
      (el) => (el as SVGPathElement).dataset.route ?? ''
    )
    expect(routes.every((r) => r !== ''), 'route 非空卫').toBe(true)
    const allowed = new Set(['direct', 'h-slip', 'detour', 'band', 'overlap', 'manual-override'])
    for (const r of routes) {
      expect(allowed.has(r), `route=${r} ∈ 五态域（corridor/fallback 零出现）`).toBe(true)
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
      ]
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

  it('[F-SLOTGRID-01 U2] 观测钩子 DOM 挂线（retain/land 双 direct 边）：retain 边 data-slot+data-overlap-exempt 挂+data-detour 缺省；land 边仅 data-slot', () => {
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
    // e1（½/½ x=164）retain idx2（Δ=0<1 恰中槽）；e2（散开 ¾/¾ x=196）land
    // idx4=200——buildSnapshot 采卡 rect（z=1）→routeAll 同几何（routing ① 同款）
    const e1 = host?.querySelector<SVGPathElement>('path.tl-edge[data-edge-id="e1"]')
    const e2 = host?.querySelector<SVGPathElement>('path.tl-edge[data-edge-id="e2"]')
    expect(e1).not.toBeNull()
    expect(e2).not.toBeNull()
    expect(e1?.getAttribute('data-route')).toBe('direct')
    expect(e2?.getAttribute('data-route')).toBe('direct')
    expect(e1?.getAttribute('data-slot')).toBe('0:2')
    expect(e1?.getAttribute('data-overlap-exempt')).toBe('1')
    expect(e1?.getAttribute('data-slot-fallback')).toBeNull()
    expect(e1?.getAttribute('data-detour')).toBeNull()
    expect(e2?.getAttribute('data-slot')).toBe('0:4')
    expect(e2?.getAttribute('data-overlap-exempt')).toBeNull()
    expect(e2?.getAttribute('data-slot-fallback')).toBeNull()
  })

  it('onEdgeHitClick 接线：命中层点击→(edgeId, 事件) 上抛；缺省不挂不崩', () => {
    stubRaf()
    host = document.createElement('div')
    host.className = 'tl-content'
    document.body.appendChild(host)
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
    for (const n of [node('A'), node('B')]) {
      const card = document.createElement('div')
      card.className = 'tl-card'
      card.dataset.nodeId = n.id
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
    for (const n of [node('A'), node('B')]) {
      const card = document.createElement('div')
      card.className = 'tl-card'
      card.dataset.nodeId = n.id
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

  it('[F-VISFB-21 C4] 聚焦边 dim 判定：两端均非 bright 才 dim（邻接边常亮——focusDim+brightIds 判定集换源）', () => {
    mountOverlay(
      [node('A'), node('B'), node('C'), node('D')],
      [edge('e1', 'A', 'B'), edge('e2', 'C', 'D')],
      0,
      0,
      [],
      { focusDim: true, brightIds: new Set(['A', 'B']) }
    )
    // 根态标记沿承（dimmed-focus——聚焦 dim 态 e2e/单测锚）
    expect(host?.querySelector('svg.tl-edges')?.classList.contains('dimmed-focus')).toBe(true)
    // e1（A→B 两端 bright）常亮——不挂 .dim；e2（C→D 两端均非 bright）dim
    expect(host?.querySelector('path.tl-edge[data-edge-id="e1"]')?.classList.contains('dim')).toBe(false)
    expect(host?.querySelector('path.tl-edge[data-edge-id="e2"]')?.classList.contains('dim')).toBe(true)
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

  it('CSS 锁：svg z=1 低于卡 2+inset/overflow；opacity --dur-tint 过渡（[F-SLOTGRID-01 U1] 测量冻结 opacity:0 规则随瀑布退役删）；命中层 stroke 8 且 P7a 期 pointer-events:none；图例族零残留', () => {
    expect(css).toMatch(/\.tl-edges\s*\{[^}]*position:\s*absolute;[^}]*inset:\s*0;[^}]*overflow:\s*visible;[^}]*z-index:\s*1/)
    expect(css).toMatch(/\.tl-edges\s*\{[^}]*transition:\s*opacity var\(--dur-tint\)/)
    // [F-LGRAPH-01②U8] 四 kind 色 selector 退役负锚（视觉=inline dashed/color）
    expect(css).not.toMatch(/\.tl-edge\[data-kind/)
    expect(css).toMatch(/\.tl-edge-hit\s*\{[^}]*stroke-width:\s*8;[^}]*pointer-events:\s*none/)
    // [F-VISFB-21 N1] 图例族（.tl-legend/.lc）CSS 零残留负锚
    expect(css).not.toMatch(/\.tl-legend/)
    expect(css).not.toMatch(/\.lc[\s.{]/)
  })

  it('CSS 锁 [T3-P7B/U2]：编辑态双闸（CSS 面）+.lg-*/.pop 族+悬停高亮（U2 票面④ v95-6B；[F-VISFB-66] link-src 退役负锚化）', () => {
    // 双闸 CSS 面：view 基线 none（上行既有锁）+edit 态开 stroke（M-pointer-events 变异锚）
    expect(css).toMatch(/\.timeline\.editing \.tl-edge-hit\s*\{[^}]*pointer-events:\s*stroke;[^}]*cursor:\s*pointer/)
    // 悬停高亮：hover 线=宽 1.6→2.6+opacity 0.65（mockup §3.3）。
    // [回炉 R2] 可见层 pointer-events:none 使 :hover 恒不触发（死样式）——
    // 改命中层驱动同键类 .hovered；负锚锁死样式不再回潮。
    // [RR10] opacity 0.65 单源=inline（edgeVisualOpacity——错峰边 inline
    // fade 压 CSS 类使回升死样式）；CSS 仅承宽 2.6（组合锚=纯函数测试）
    expect(css).toMatch(/\.tl-edge\s*\{[^}]*stroke-width:\s*1\.6/)
    expect(css).toMatch(/\.tl-edge\.hovered\s*\{[^}]*stroke-width:\s*2\.6;\s*\}/)
    expect(css).not.toMatch(/\.tl-edge:hover/)
    // [F-LGRAPH-01②U8] linkbtn 退役负锚（「新建连线」按钮删除——画线工具替代）
    expect(css).not.toMatch(/linkbtn/)
    // [F-VISFB-66 W-09r2] 源侧高亮链整删负锚（.link-src 规则+复用面全灭）
    expect(css).not.toMatch(/link-src/)
    // [R6①] 意图值升特异性真正生效（原 .acc-body .pbtn 同特异性被 .pop .pbtn
    // 源序覆盖=死声明）
    expect(css).toMatch(/\.pop \.acc-body \.pbtn\s*\{[^}]*font-size:\s*var\(--fs-tl-hint\);[^}]*padding:\s*4px 0/)
    // [R6②] .pop .schip i 的 border-top-width 恒被组件 inline borderTop 覆盖
    // ——死属性已删（宽度面全权 inline）
    expect(css).toMatch(/\.pop \.schip i\s*\{[^}]*width:\s*26px;[^}]*display:\s*inline-block/)
    expect(css).not.toMatch(/\.pop \.schip i\s*\{[^}]*border-top-width/)
    // 编辑态卡 hover faint（mockup L259-260）
    expect(css).toMatch(/\.timeline\.editing \.tl-card\s*\{[^}]*outline:\s*1px dashed transparent/)
    expect(css).toMatch(/\.timeline\.editing \.tl-card:hover\s*\{[^}]*outline-color:\s*var\(--faint\)/)
    // .lg-toolbar sticky（mockup L204-205 逐值——色值经 color-mix var(--bg) 承载）
    expect(css).toMatch(/\.lg-toolbar\s*\{[^}]*position:\s*sticky;[^}]*top:\s*0;[^}]*z-index:\s*12;[^}]*padding:\s*10px 18px/)
    // .lg-btn 主/ghost（mockup L206-210——阴影=三稿同值 token 承载）
    expect(css).toMatch(
      /\.lg-btn\s*\{[^}]*color:\s*var\(--accent-ink\);[^}]*background:\s*var\(--accent\);[^}]*padding:\s*6px 14px;[^}]*border-radius:\s*8px;[^}]*box-shadow:\s*var\(--shadow-lg-btn\)/
    )
    expect(css).toMatch(
      /\.lg-btn\.ghost\s*\{[^}]*background:\s*var\(--panel\);[^}]*color:\s*var\(--dim\);[^}]*border:\s*1px solid var\(--line\);[^}]*box-shadow:\s*none/
    )
    // drag-hint 双态（[T3-P8] D-P7B-1 兑现——mockup L218 base accent+L219 edit signal）
    expect(css).toMatch(/\.drag-hint\s*\{[^}]*margin-left:\s*auto;[^}]*color:\s*var\(--accent\);[^}]*background:\s*var\(--accent-soft\)/)
    expect(css).toMatch(/\.drag-hint\s*\{[^}]*border:\s*1px dashed var\(--accent\)/)
    expect(css).toMatch(/\.timeline\.editing \.drag-hint\s*\{[^}]*color:\s*var\(--signal\);[^}]*background:\s*var\(--signal-a08\);[^}]*border-color:\s*var\(--signal\)/)
    // .pop 弹层基础面（mockup L287 逐值——fixed 240px 挂视口；[F-UIRES-03 C3]
    // 脉络侧弹层消费面已随改月链退役——基础面留驻供通用弹层族）
    expect(css).toMatch(/\.pop\s*\{[^}]*position:\s*fixed;[^}]*z-index:\s*130;[^}]*width:\s*240px;[^}]*border-radius:\s*10px;[^}]*box-shadow:\s*var\(--shadow-drag\)/)
    expect(css).toMatch(/\.pop h4\s*\{[^}]*letter-spacing:\s*2px;[^}]*color:\s*var\(--faint\)/)
    // .acc 手风琴（mockup L304-310）+schip chip i 预览（L294-296——[R6②]
    // border-top-width 死属性已删，断言迁移至 R6 段）
    expect(css).toMatch(/\.acc\s*\{[^}]*border:\s*1px solid var\(--line\);[^}]*border-radius:\s*8px;[^}]*overflow:\s*hidden/)
    expect(css).toMatch(/\.acc-head\.on\s*\{[^}]*background:\s*var\(--accent-soft\);[^}]*color:\s*var\(--accent\)/)
    expect(css).toMatch(/\.pop \.schip\.on\s*\{[^}]*border-color:\s*var\(--accent\);[^}]*background:\s*var\(--accent-soft\)/)
    // acts 三型（pri/sec/dgr——dgr=三稿同值 token 承载）
    expect(css).toMatch(/\.pop \.pbtn\.pri\s*\{[^}]*background:\s*var\(--accent\);[^}]*color:\s*var\(--accent-ink\)/)
    expect(css).toMatch(/\.pop \.pbtn\.dgr\s*\{[^}]*border:\s*1px solid var\(--pop-danger-a50\);[^}]*color:\s*var\(--pop-danger\)/)
    expect(css).toMatch(/\.pop \.foot-note\s*\{[^}]*color:\s*var\(--faint\)/)
  })
})

describe('F-UIRES-03 C2·P7 buildSnapshot 采集（yearHeads 障碍源——快照面）', () => {
  /** rect 桩（jsdom 零布局——三例共用，Rule of Three 上提） */
  const mockRect = (el: Element, x: number, y: number, w: number, h: number): void => {
    Object.defineProperty(el, 'getBoundingClientRect', {
      value: () => ({ left: x, top: y, right: x + w, bottom: y + h, width: w, height: h, x, y, toJSON: () => ({}) }) as DOMRect,
      configurable: true
    })
  }
  const mountContent = (): HTMLElement => {
    const content = document.createElement('div')
    content.className = 'tl-content'
    mockRect(content, 0, 0, 1000, 800)
    return content
  }

  it('.tl-year-num rects 采入 yearHeads（内容坐标 ÷z——与 cards/labels 同源同变换）', async () => {
    const { buildSnapshot } = await import('../../../src/renderer/features/lineage/edge-overlay-geom')
    const content = mountContent()
    const num = document.createElement('div')
    num.className = 'tl-year-num'
    mockRect(num, 28, 60, 400, 20)
    content.appendChild(num)
    document.body.appendChild(content)
    try {
      const snap = buildSnapshot(content)
      expect(snap.yearHeads).toEqual([{ x: 28, y: 60, w: 400, h: 20 }])
    } finally {
      content.remove()
    }
  })

  it('[N5 校准提前落地] .tl-year-num 与 .tl-year-meta 双 rect 分立采入 yearHeads（两 rect 入数组，非并集盒）', async () => {
    const { buildSnapshot } = await import('../../../src/renderer/features/lineage/edge-overlay-geom')
    const content = mountContent()
    const num = document.createElement('div')
    num.className = 'tl-year-num'
    mockRect(num, 20, 60, 58, 35)
    const meta = document.createElement('div')
    meta.className = 'tl-year-meta'
    mockRect(meta, 660, 62, 72, 14)
    content.appendChild(num)
    content.appendChild(meta)
    document.body.appendChild(content)
    try {
      const snap = buildSnapshot(content)
      expect(snap.yearHeads).toEqual([
        { x: 20, y: 60, w: 58, h: 35 },
        { x: 660, y: 62, w: 72, h: 14 }
      ])
    } finally {
      content.remove()
    }
  })

  it('[N5 校准提前落地·负锚] .tl-year-head 容器自身不再采入（全宽容器 rect 挡死 band 跨年终落=CI 红 T-P1b 根因——防回归）', async () => {
    const { buildSnapshot } = await import('../../../src/renderer/features/lineage/edge-overlay-geom')
    const content = mountContent()
    const head = document.createElement('div')
    head.className = 'tl-year-head'
    mockRect(head, 20, 60, 684, 34)
    const num = document.createElement('div')
    num.className = 'tl-year-num'
    mockRect(num, 20, 60, 58, 34)
    head.appendChild(num)
    content.appendChild(head)
    document.body.appendChild(content)
    try {
      const snap = buildSnapshot(content)
      // 嵌套形态同真实 DOM：仅数字区入集，容器全宽 rect 不在采集集
      expect(snap.yearHeads).toEqual([{ x: 20, y: 60, w: 58, h: 34 }])
      expect(snap.yearHeads.some((b) => b.w > 100)).toBe(false)
    } finally {
      content.remove()
    }
  })
})
