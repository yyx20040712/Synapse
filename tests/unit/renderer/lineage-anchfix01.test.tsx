// @vitest-environment jsdom
/**
 * [F-ANCHFIX-01 批 1b] 选锚语义统一单测（用户裁决 D=统一为路由规则——预览
 * [F-VISFB-66 改写] 钉定模型（裁决 D 翻案）：两端锚用户钉定不 morph——
 * 松手零跳动；设计书 v1.2 终裁记录+§3.4 3b 行）：
 * - 选锚统一：≥3 布局（竖向/横向近邻/斜向）断言 dragging 态预览线端点=
 *   snap=命中锚本身（预览终点=所按锚；起点恒按下锚 from.pt） */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub } from '../../utils/api-client-mock'

const stubApi = makeApiStub({
  lineage: { graph: vi.fn(), upsertNode: vi.fn(), removeNode: vi.fn(), upsertEdge: vi.fn(), removeEdge: vi.fn(), upsertLineTypes: vi.fn() }
})

import type { LineageEdge, LineageNode } from '../../../src/shared/models/lineage'
import { LINE_TYPE_COLORS } from '../../../src/shared/models/lineage'

import { contentScale } from '../../../src/renderer/features/lineage/timeline-zoom'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import { useLineageViewStore } from '../../../src/renderer/features/lineage/lineage-view.store'
import { LineageTimeline } from '../../../src/renderer/features/lineage/LineageTimeline'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

function node(id: string): LineageNode {
  return {
    id, paperId: `paper-${id}`, title: `节点${id}`, year: 2022,
    x: null, y: null, month: 9, slot: null, folderId: '__main__', createdAt: 't', updatedAt: 't'
  }
}

function edge(id: string, from: string, to: string): LineageEdge {
  return { id, fromNode: from, toNode: to, label: '', dashed: false, color: '#1e3a8a', createdAt: 't', updatedAt: 't' }
}

let root: Root | null = null
let host: HTMLDivElement | null = null

/** 卡 rect mock（内容坐标域——content rect=(0,0) 基准）：rects 按 nodeId 注入
 *  （卡尺寸 128×72 沿承 lineage-drawline 件口径；z=1 基档） */
function mockGeometry(rects: Record<string, { x: number; y: number }>): void {
  const content = document.querySelector('.tl-content') as HTMLElement | null
  if (content === null) throw new Error('.tl-content 未渲染')
  Object.defineProperty(content, 'getBoundingClientRect', {
    value: () => ({ left: 0, top: 0, right: 1000, bottom: 800, width: 1000, height: 800, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect,
    configurable: true
  })
  for (const el of Array.from(content.querySelectorAll('.tl-card[data-node-id]'))) {
    const id = (el as HTMLElement).dataset.nodeId ?? ''
    const base = rects[id] ?? { x: 0, y: 0 }
    Object.defineProperty(el, 'getBoundingClientRect', {
      value: () => ({ left: base.x, top: base.y, right: base.x + 128, bottom: base.y + 72, width: 128, height: 72, x: base.x, y: base.y, toJSON: () => ({}) }) as DOMRect,
      configurable: true
    })
  }
}

function mountTimeline(nodes: LineageNode[], rects: Record<string, { x: number; y: number }>): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(<LineageTimeline nodes={nodes} edges={[]} />)
  })
  mockGeometry(rects)
}

const q = (sel: string): Element | null => host?.querySelector(sel) ?? null
const req = (sel: string): Element => {
  const el = q(sel)
  if (el === null) throw new Error(`元素未渲染：${sel}`)
  return el
}

/** 内容坐标 pointer 事件（jsdom 无 PointerEvent 构造器——MouseEvent 携 pointer 型名） */
const pointer = (el: Element, type: 'pointerdown' | 'pointermove' | 'pointerup', x: number, y: number): void => {
  act(() => {
    el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 }))
  })
}

/** document 级会话事件（拖拽会话监听面） */
const docPointer = (type: 'pointermove' | 'pointerup', x: number, y: number): void => {
  act(() => {
    document.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 }))
  })
}

/** 预览线端点（内容坐标 attribute 直读） */
function previewEnds(): { x1: number; y1: number; x2: number; y2: number } {
  const line = req('[data-testid="draw-preview"] line')
  return {
    x1: Number(line.getAttribute('x1')),
    y1: Number(line.getAttribute('y1')),
    x2: Number(line.getAttribute('x2')),
    y2: Number(line.getAttribute('y2'))
  }
}

/** 拖至目标锚近旁（armed→down 源锚→move 目标位）——返回预览端点 */
function dragTo(srcAnchor: { x: number; y: number }, moveTo: { x: number; y: number }): void {
  act(() => {
    useLineageViewStore.getState().toggleLineTool('solid')
  })
  const content = req('.tl-content')
  pointer(content, 'pointerdown', srcAnchor.x, srcAnchor.y)
  docPointer('pointermove', moveTo.x, moveTo.y)
}

beforeEach(() => {
  for (const fn of Object.values(stubApi.lineage)) fn.mockReset()
  stubApi.lineage.graph.mockResolvedValue({
    ok: true, data: { nodes: [], edges: [], lineTypeNames: ['待命名', '待命名', '待命名', '待命名', '待命名', '待命名'] }
  })
  stubApi.lineage.upsertEdge.mockImplementation(async (r: { id?: string; from: string; to: string }) =>
    ({ ok: true, data: edge(r.id ?? `e-${r.from}-${r.to}`, r.from, r.to) })
  )
  useLineageStore.setState({
    nodes: [node('A'), node('B')], edges: [], lineTypeNames: ['主供水线', '待命名', '待命名', '待命名', '待命名', '待命名'],
    status: 'ready', error: null, saveStatus: 'clean', lastWriteError: null,
    queue: [], flushing: false, undoStack: [], redoStack: [], folderId: '__main__'
  })
  useLineageViewStore.setState({
    mode: 'edit', focusSet: [], navCollapsed: false, navWidth: 208,
    tool: 'select',
    currentLineColor: { solid: LINE_TYPE_COLORS[0], dashed: LINE_TYPE_COLORS[0] },
    paletteFor: null
  })
})

afterEach(() => {
  act(() => { root?.unmount() })
  root = null
  host?.remove()
  host = null
  vi.restoreAllMocks()
})

describe('F-VISFB-66 钉定模型（预览端点=按下锚/命中锚——裁决 D 翻案：两端钉定不 morph）', () => {
  it('竖向布局：snap 端=所按 B 左 ¼ 锚本身（非 selectAnchor 规则锚）+起点恒 from.pt（按下锚）', () => {
    mountTimeline([node('A'), node('B')], { A: { x: 100, y: 100 }, B: { x: 100, y: 300 } })
    // 起拖=A 右中锚 (228,136)；move 落 B 左 ¼ 锚 (100,318)——钉定模型下 snap=命中锚
    dragTo({ x: 228, y: 136 }, { x: 100, y: 318 })
    const ends = previewEnds()
    expect(ends.x2).toBeCloseTo(100, 6) // 命中锚=左 ¼（旧模型=规则锚 bottom ½ (164,372)——判别位）
    expect(ends.y2).toBeCloseTo(318, 6)
    expect(ends.x1).toBeCloseTo(228, 6) // 起点恒按下锚（fromEff morph 已删）
    expect(ends.y1).toBeCloseTo(136, 6)
    // DrawAnchorHint（snap 维）跟随命中锚（DrawLayers 零触面行为跟随）
    const hintDot = req('[data-testid="draw-anchor-hint"] circle.snapped')
    expect(Number(hintDot.getAttribute('cx'))).toBeCloseTo(100, 6)
    expect(Number(hintDot.getAttribute('cy'))).toBeCloseTo(318, 6)
    docPointer('pointerup', 100, 318)
    // 落边双锚载荷=按下锚/命中锚（right 1/left 0——身份直证）
    const e = useLineageStore.getState().edges[0]!
    expect(e.fromAnchor).toEqual({ side: 'right', slot: 1 })
    expect(e.toAnchor).toEqual({ side: 'left', slot: 0 })
  })

  it('横向近邻布局：snap=命中顶 ½ 锚本身（非规则锚 left ¼——判别位）+起点恒按下锚', () => {
    mountTimeline([node('A'), node('B')], { A: { x: 100, y: 100 }, B: { x: 400, y: 120 } })
    // move 落 B 顶 ½ 锚 (464,120) 近旁
    dragTo({ x: 228, y: 136 }, { x: 464, y: 124 })
    const ends = previewEnds()
    expect(ends.x2).toBeCloseTo(464, 6)
    expect(ends.y2).toBeCloseTo(120, 6)
    expect(ends.x1).toBeCloseTo(228, 6)
    expect(ends.y1).toBeCloseTo(136, 6)
    docPointer('pointerup', 800, 700)
  })

  it('斜向布局：snap=命中右 ½ 锚本身（非规则锚 left ¼——判别位）', () => {
    mountTimeline([node('A'), node('B')], { A: { x: 100, y: 100 }, B: { x: 320, y: 260 } })
    // move 落 B 右 ½ 锚 (448,296) 近旁
    dragTo({ x: 228, y: 136 }, { x: 448, y: 290 })
    const ends = previewEnds()
    expect(ends.x2).toBeCloseTo(448, 6)
    expect(ends.y2).toBeCloseTo(296, 6)
    expect(ends.x1).toBeCloseTo(228, 6)
    expect(ends.y1).toBeCloseTo(136, 6)
    docPointer('pointerup', 800, 700)
  })

  it('未命中目标：snap=null+预览端点=cursor（起点恒 from.pt 起拖锚）', () => {
    mountTimeline([node('A'), node('B')], { A: { x: 100, y: 100 }, B: { x: 100, y: 300 } })
    // move 空白位（距一切锚 >12——A/B 全域外）
    dragTo({ x: 228, y: 136 }, { x: 700, y: 600 })
    const ends = previewEnds()
    expect(ends.x1).toBeCloseTo(228, 6) // 起点恒按下锚
    expect(ends.y1).toBeCloseTo(136, 6)
    expect(ends.x2).toBeCloseTo(700, 6) // snap=null→cursor 跟随沿承
    expect(ends.y2).toBeCloseTo(600, 6)
    // snap 维 hint 不在场（dragging 态 DrawAnchorHint anchor=snap=null）
    expect(q('[data-testid="draw-anchor-hint"]')).toBeNull()
    docPointer('pointerup', 700, 600) // 收尾（空白取消）
    expect(useLineageStore.getState().edges).toHaveLength(0)
  })

  it('from 恒定跨 move：掠过他卡锚再折返——起点全程=按下锚（无 fromEff 重算面）', () => {
    mountTimeline([node('A'), node('B')], { A: { x: 100, y: 100 }, B: { x: 100, y: 300 } })
    dragTo({ x: 228, y: 136 }, { x: 100, y: 318 })
    let ends = previewEnds()
    expect(ends.x1).toBeCloseTo(228, 6)
    act(() => {
      window.dispatchEvent(new Event('blur')) // 中断=取消复位
    })
    expect(q('[data-testid="draw-preview"]')).toBeNull()
    // 重拖第二会话：同几何同值（证明会话态干净——起点=新按下锚非残留）
    dragTo({ x: 228, y: 136 }, { x: 100, y: 318 })
    ends = previewEnds()
    expect(ends.x1).toBeCloseTo(228, 6)
    expect(ends.y1).toBeCloseTo(136, 6)
    docPointer('pointerup', 800, 700)
  })
})

describe('F-ANCHFIX-01 批 1b 防御单测（zoom 单源一致性——1a 残余防回潮）', () => {
  it('contentStyle inline transform 与 contentScale() 读数恒等（mock getComputedStyle 从 inline style 派生）', () => {
    mountTimeline([node('A'), node('B')], { A: { x: 100, y: 100 }, B: { x: 100, y: 300 } })
    const content = req('.tl-content') as HTMLElement
    // mock：computed transform 从 inline style 派生（浏览器 computed=inline 派生语义）
    const orig = window.getComputedStyle.bind(window)
    vi.spyOn(window, 'getComputedStyle').mockImplementation((elt, pseudo) => {
      const decl = orig(elt as Element, pseudo)
      const inline = (elt as HTMLElement).style?.transform ?? ''
      if (inline !== '') {
        Object.defineProperty(decl, 'transform', { value: inline, configurable: true })
      }
      return decl
    })
    for (const z of [0.5, 0.8, 1.0, 1.2, 1.5, 2.0]) {
      act(() => {
        useLineageViewStore.setState({ zoom: z })
      })
      const inline = content.style.transform
      const computed = getComputedStyle(content).transform
      // 双源恒等：inline（useTimelineZoom contentStyle）≡ computed（派生）≡ contentScale()（store 读数）
      expect(computed, `z=${z}：computed transform 从 inline 派生恒等`).toBe(inline)
      const m = inline === '' ? null : /scale\(([\d.]+)\)/.exec(inline)
      const zCss = m === null ? 1 : Number(m[1])
      expect(zCss, `z=${z}：contentStyle scale 与 contentScale() 读数恒等`).toBe(contentScale())
      expect(contentScale(), `z=${z}：store 读数即档位`).toBe(z)
    }
    act(() => {
      useLineageViewStore.setState({ zoom: 1 })
    })
  })
})
