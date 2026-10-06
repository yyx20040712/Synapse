// @vitest-environment jsdom
/**
 * [F-UIRES-03 C2] P1 静态锚点层+P2 吸附高亮层锁定（设计稿 v1.13 §2 C2；
 * 任务书 P1/P2/P4）：P1=每卡四边中点静态锚（slot ½ 位——直径 8 画布 px；
 * DOM 常驻+显隐 CSS 通道：.drawing 全卡∪hover 卡——显隐可见性断言归 e2e，
 * 本件锁结构面）；P2=吸附高亮演化（dot 直径 12 屏幕 px=画布 r=6/z 随 zoom
 * 补偿+高亮环+.snapped 类；idle 待机经 hint 通道/dragging 经 snap 维——
 * 单渲染点=DrawAnchorHint，DrawPreview 吸附圆点收敛删除）；
 * P4=dragging 高亮锚心=预览线端点同源（内容坐标）。always-active 裸
 * describe（K3）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub } from '../../utils/api-client-mock'

const stubApi = makeApiStub({
  lineage: { graph: vi.fn(), upsertNode: vi.fn(), removeNode: vi.fn(), upsertEdge: vi.fn(), removeEdge: vi.fn(), upsertLineTypes: vi.fn() }
})

import type { LineageNode } from '../../../src/shared/models/lineage'
import { LINE_TYPE_COLORS } from '../../../src/shared/models/lineage'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import { useLineageViewStore } from '../../../src/renderer/features/lineage/lineage-view.store'
import { LineageTimeline } from '../../../src/renderer/features/lineage/LineageTimeline'
import { DrawAnchorHint } from '../../../src/renderer/features/lineage/DrawAnchorHint'
import type { DrawAnchor } from '../../../src/renderer/features/lineage/useDrawLine'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

function node(id: string): LineageNode {
  return {
    id, paperId: `paper-${id}`, title: `节点${id}`, year: 2022,
    x: null, y: null, month: 9, slot: null, folderId: '__main__', createdAt: 't', updatedAt: 't'
  }
}

let root: Root | null = null
let host: HTMLDivElement | null = null

/** 卡 rect mock（内容坐标域——c1-clickchain 同型）：A(100,100) B(100,300) */
function mockGeometry(): void {
  const content = document.querySelector('.tl-content') as HTMLElement | null
  if (content === null) throw new Error('.tl-content 未渲染')
  Object.defineProperty(content, 'getBoundingClientRect', {
    value: () => ({ left: 0, top: 0, right: 1000, bottom: 800, width: 1000, height: 800, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect,
    configurable: true
  })
  const rects: Record<string, { x: number; y: number }> = { A: { x: 100, y: 100 }, B: { x: 100, y: 300 } }
  for (const el of Array.from(content.querySelectorAll('.tl-card[data-node-id]'))) {
    const id = (el as HTMLElement).dataset.nodeId ?? ''
    const base = rects[id] ?? { x: 0, y: 0 }
    Object.defineProperty(el, 'getBoundingClientRect', {
      value: () => ({ left: base.x, top: base.y, right: base.x + 128, bottom: base.y + 72, width: 128, height: 72, x: base.x, y: base.y, toJSON: () => ({}) }) as DOMRect,
      configurable: true
    })
  }
}

function mountTimeline(): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(<LineageTimeline nodes={[node('A'), node('B')]} edges={[]} />)
  })
  mockGeometry()
}

const q = (sel: string): Element | null => host?.querySelector(sel) ?? null
const req = (sel: string): Element => {
  const el = q(sel)
  if (el === null) throw new Error(`元素未渲染：${sel}`)
  return el
}

const pointer = (el: Element, type: string, x: number, y: number): void => {
  act(() => {
    el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 }))
  })
}
const docPointer = (type: 'pointermove' | 'pointerup', x: number, y: number): void => {
  act(() => {
    document.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 }))
  })
}
const docMove = (x: number, y: number): void => docPointer('pointermove', x, y)

beforeEach(() => {
  for (const fn of Object.values(stubApi.lineage)) fn.mockReset()
  stubApi.lineage.graph.mockResolvedValue({
    ok: true, data: { nodes: [], edges: [], lineTypeNames: ['待命名', '待命名', '待命名', '待命名', '待命名', '待命名'] }
  })
  useLineageStore.setState({
    nodes: [node('A'), node('B')], edges: [],
    lineTypeNames: ['主供水线', '待命名', '待命名', '待命名', '待命名', '待命名'],
    status: 'ready', error: null, saveStatus: 'clean', lastWriteError: null,
    queue: [], flushing: false, undoStack: [], redoStack: [], folderId: '__main__'
  })
  useLineageViewStore.setState({
    mode: 'edit', focusSet: [], navCollapsed: false, navWidth: 208,
    tool: 'select', currentLineColor: { solid: LINE_TYPE_COLORS[0], dashed: LINE_TYPE_COLORS[0] }, paletteFor: null,
    anchor: null, // [RR1-2] 锚维重置（c2-esc/c1-clickchain 同型——防跨用例残留）
    zoom: 1
  })
})

afterEach(() => {
  act(() => { root?.unmount() })
  root = null
  host?.remove()
  host = null
})

describe('F-UIRES-03 C2 P1 静态锚点层（四边中点锚——DOM 常驻+CSS 显隐通道）', () => {
  it('armed 态：每卡 .card-anchors 在场+恰 4 锚点+data-anchor-side 四值齐（top/bottom/left/right）', () => {
    mountTimeline()
    act(() => {
      useLineageViewStore.getState().toggleLineTool('solid')
    })
    for (const id of ['A', 'B']) {
      const layer = req(`.tl-card[data-node-id="${id}"] .card-anchors`)
      const dots = Array.from(layer.querySelectorAll('.card-anchor-dot'))
      expect(dots).toHaveLength(4)
      const sides = dots.map((d) => d.getAttribute('data-anchor-side')).sort()
      expect(sides).toEqual(['bottom', 'left', 'right', 'top'])
    }
  })

  it('[RR1-1] 结构面：.card-anchors 直接子元素恰 4 个 .card-anchor-dot+四值齐（嵌套层级判定——多子/包层即红）', () => {
    mountTimeline()
    act(() => {
      useLineageViewStore.getState().toggleLineTool('solid')
    })
    const layer = req('.tl-card[data-node-id="A"] .card-anchors')
    const kids = Array.from(layer.children)
    expect(kids).toHaveLength(4) // 直接子恰 4（querySelectorAll 后代查询盖不住包层漂移）
    for (const kid of kids) expect(kid.classList.contains('card-anchor-dot')).toBe(true)
    expect(kids.map((k) => k.getAttribute('data-anchor-side')).sort()).toEqual(['bottom', 'left', 'right', 'top'])
    // pointer-events:none 契约面=CSS 单源（.card-anchors 规则）——有效断言驻
    // e2e C2a computed-style（jsdom 不解析 CSS，本件锁结构）
  })

  it('非 armed（select）：锚 DOM 常驻不卸载（显隐=CSS display 通道——无 JS 条件渲染抖动）', () => {
    mountTimeline()
    expect(q('.tl-card[data-node-id="A"] .card-anchors')).not.toBeNull()
    expect(q('.tl-card[data-node-id="A"] .card-anchors .card-anchor-dot')).not.toBeNull()
  })
})

describe('F-UIRES-03 C2 P2 吸附高亮层（DrawAnchorHint 演化——12 屏幕 px+zoom 补偿+高亮环）', () => {
  /** 组件直挂（zoom 补偿数学直测——几何纯面） */
  const mountHint = (anchor: DrawAnchor | null, zoom: number): void => {
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    act(() => {
      root?.render(<DrawAnchorHint anchor={anchor} zoom={zoom} />)
    })
  }
  const a: DrawAnchor = { nodeId: 'A', pt: { x: 228, y: 136 } }

  it('zoom 补偿数学：dot r=6/z（屏幕域直径恒 12）+ring r=9/z——三档 {0.8,1,1.5} 逐一核', () => {
    for (const [z, r] of [
      [0.8, 7.5],
      [1, 6],
      [1.5, 4]
    ] as const) {
      mountHint(a, z)
      const dot = req('[data-testid="draw-anchor-hint"] circle.snapped')
      expect(Number(dot.getAttribute('r'))).toBeCloseTo(r, 6)
      const ring = req('[data-testid="draw-anchor-hint"] circle.snapped-ring')
      expect(Number(ring.getAttribute('r'))).toBeCloseTo((6 + 3) / z, 6)
      act(() => { root?.unmount() })
      host?.remove()
      host = null
    }
  })

  it('出域（anchor=null）：hint 零渲染（类撤=DOM 卸载——e2e 断言③同源）', () => {
    mountHint(null, 1)
    expect(q('[data-testid="draw-anchor-hint"]')).toBeNull()
  })

  it('armed 待机近锚（hint 通道）：circle.snapped 在场+cx/cy=最近锚内容坐标（A 右中 228,136）', () => {
    mountTimeline()
    act(() => {
      useLineageViewStore.getState().toggleLineTool('solid')
    })
    docMove(226, 136)
    const dot = req('[data-testid="draw-anchor-hint"] circle.snapped')
    expect(dot.getAttribute('cx')).toBe('228')
    expect(dot.getAttribute('cy')).toBe('136')
  })

  it('dragging 近目标锚（snap 维）：circle.snapped=目标锚（B 左中 100,336）——预览端点同源（P4）', () => {
    mountTimeline()
    act(() => {
      useLineageViewStore.getState().toggleLineTool('solid')
    })
    pointer(req('.tl-content'), 'pointerdown', 228, 136) // A 右中锚起拖
    docPointer('pointermove', 102, 336) // B 左中锚近旁→snap
    const dot = req('[data-testid="draw-anchor-hint"] circle.snapped')
    expect(dot.getAttribute('cx')).toBe('100')
    expect(dot.getAttribute('cy')).toBe('336')
    docPointer('pointerup', 100, 336)
  })

  it('DrawPreview 吸附圆点收敛删除（单渲染点=DrawAnchorHint）：dragging+snap 态 draw-preview 内 circle 零', () => {
    mountTimeline()
    act(() => {
      useLineageViewStore.getState().toggleLineTool('solid')
    })
    pointer(req('.tl-content'), 'pointerdown', 228, 136)
    docPointer('pointermove', 102, 336)
    expect(q('[data-testid="draw-preview"] circle')).toBeNull() // 收敛负锚（在场即红）
    docPointer('pointerup', 100, 336)
  })
})
