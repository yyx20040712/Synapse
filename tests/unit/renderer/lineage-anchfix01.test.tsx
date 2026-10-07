// @vitest-environment jsdom
/**
 * [F-ANCHFIX-01 批 1b] 选锚语义统一单测（用户裁决 D=统一为路由规则——预览
 * 吸附改 selectAnchor 同函数同参于 routeOne direct 态选锚，所见即所得：
 * 松手零跳动；设计书 v1.2 终裁记录+§3.4 3b 行）：
 * - 选锚统一：≥3 布局（竖向/横向近邻/斜向）断言 dragging 态预览线端点=
 *   selectAnchor 规则锚（snap 端=snap.pt=selectAnchor(目标 rect, 源卡 rect
 *   中心).pt；起点=fromEff.pt=selectAnchor(源卡 rect, 目标卡 rect 中心).pt
 *   ——经 DrawPreview line x1/y1/x2/y2 黑盒观测）+DrawAnchorHint（snap 维）
 *   自动跟随规则锚（DrawLayers 零触面行为跟随锁）；
 * - 未命中目标：snap=null+fromEff=null+预览端点=cursor（x1/y1 回落 from.pt）；
 * - 防御单测（设计 §3.4 1a 残余防回潮）：zoom 单源一致性——useTimelineZoom
 *   contentStyle（inline transform）与 contentScale() 读数恒等（mock
 *   getComputedStyle 从 inline style 派生——双源恒等断言）。
 * 目标卡识别面沿承 nearestAnchor（12 锚域 DRAW_SNAP_R 内识别目标卡——识别
 * 面不变，仅吸附锚改规则锚）：用例 move 点刻意落「目标卡最近锚≠规则锚」位
 * （判别性——若实现仍用 nearestAnchor 锚位即红）。
 * helper 沿承 lineage-drawline 件 mockGeometry 模式（第 4 份复制——抽共享
 * 涉 tests/utils 受锁扩面，留主控裁决——rr1 件头注同款申报）。
 * always-active 裸 describe（K3）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub } from '../../utils/api-client-mock'

const stubApi = makeApiStub({
  lineage: { graph: vi.fn(), upsertNode: vi.fn(), removeNode: vi.fn(), upsertEdge: vi.fn(), removeEdge: vi.fn(), upsertLineTypes: vi.fn() }
})

import type { LineageEdge, LineageNode } from '../../../src/shared/models/lineage'
import { LINE_TYPE_COLORS } from '../../../src/shared/models/lineage'
import { selectAnchor, type Rect } from '../../../src/renderer/features/lineage/routing/anchors'
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

describe('F-ANCHFIX-01 批 1b 选锚统一（预览吸附=selectAnchor 路由规则——裁决 D）', () => {
  it('竖向布局：dragging 预览端点=selectAnchor 规则锚（snap 端=selectAnchor(目标 rect, 源中心)，起点=fromEff=selectAnchor(源 rect, 目标中心)）', () => {
    mountTimeline([node('A'), node('B')], { A: { x: 100, y: 100 }, B: { x: 100, y: 300 } })
    const src: Rect = { x: 100, y: 100, w: 128, h: 72 }
    const tgt: Rect = { x: 100, y: 300, w: 128, h: 72 }
    // 起拖=A 右中锚；move 落 B 左 ¼ 锚 (100,318)（目标卡最近锚≠规则锚——判别位）
    dragTo({ x: 228, y: 136 }, { x: 100, y: 318 })
    const expSnap = selectAnchor(tgt, { x: src.x + src.w / 2, y: src.y + src.h / 2 }).pt
    const expFrom = selectAnchor(src, { x: tgt.x + tgt.w / 2, y: tgt.y + tgt.h / 2 }).pt
    const ends = previewEnds()
    expect(ends.x2).toBeCloseTo(expSnap.x, 6)
    expect(ends.y2).toBeCloseTo(expSnap.y, 6)
    expect(ends.x1).toBeCloseTo(expFrom.x, 6)
    expect(ends.y1).toBeCloseTo(expFrom.y, 6)
    // DrawAnchorHint（snap 维）自动跟随规则锚（DrawLayers 零触面行为跟随）
    const hintDot = req('[data-testid="draw-anchor-hint"] circle.snapped')
    expect(Number(hintDot.getAttribute('cx'))).toBeCloseTo(expSnap.x, 6)
    expect(Number(hintDot.getAttribute('cy'))).toBeCloseTo(expSnap.y, 6)
  })

  it('横向近邻布局：同断言（规则锚=主向横边+侧内投影——move 落顶中锚判别位）', () => {
    mountTimeline([node('A'), node('B')], { A: { x: 100, y: 100 }, B: { x: 400, y: 120 } })
    const src: Rect = { x: 100, y: 100, w: 128, h: 72 }
    const tgt: Rect = { x: 400, y: 120, w: 128, h: 72 }
    // move 落 B 顶 ½ 锚 (464,120) 近旁（≠规则锚 left ¼=(400,138)——判别位）
    dragTo({ x: 228, y: 136 }, { x: 464, y: 124 })
    const expSnap = selectAnchor(tgt, { x: src.x + src.w / 2, y: src.y + src.h / 2 }).pt
    const expFrom = selectAnchor(src, { x: tgt.x + tgt.w / 2, y: tgt.y + tgt.h / 2 }).pt
    const ends = previewEnds()
    expect(ends.x2).toBeCloseTo(expSnap.x, 6)
    expect(ends.y2).toBeCloseTo(expSnap.y, 6)
    expect(ends.x1).toBeCloseTo(expFrom.x, 6)
    expect(ends.y1).toBeCloseTo(expFrom.y, 6)
  })

  it('斜向布局：同断言（投影越界取最近槽——move 落右中锚判别位）', () => {
    mountTimeline([node('A'), node('B')], { A: { x: 100, y: 100 }, B: { x: 320, y: 260 } })
    const src: Rect = { x: 100, y: 100, w: 128, h: 72 }
    const tgt: Rect = { x: 320, y: 260, w: 128, h: 72 }
    // move 落 B 右 ½ 锚 (448,296) 近旁（≠规则锚 left ¼=(320,278)——判别位）
    dragTo({ x: 228, y: 136 }, { x: 448, y: 290 })
    const expSnap = selectAnchor(tgt, { x: src.x + src.w / 2, y: src.y + src.h / 2 }).pt
    const expFrom = selectAnchor(src, { x: tgt.x + tgt.w / 2, y: tgt.y + tgt.h / 2 }).pt
    const ends = previewEnds()
    expect(ends.x2).toBeCloseTo(expSnap.x, 6)
    expect(ends.y2).toBeCloseTo(expSnap.y, 6)
    expect(ends.x1).toBeCloseTo(expFrom.x, 6)
    expect(ends.y1).toBeCloseTo(expFrom.y, 6)
  })

  it('未命中目标：snap=null+fromEff=null+预览端点=cursor（x1/y1 回落 from.pt 起拖锚）', () => {
    mountTimeline([node('A'), node('B')], { A: { x: 100, y: 100 }, B: { x: 100, y: 300 } })
    // move 空白位（距一切锚 >12——A/B 全域外）
    dragTo({ x: 228, y: 136 }, { x: 700, y: 600 })
    const ends = previewEnds()
    expect(ends.x1).toBeCloseTo(228, 6) // fromEff=null→回落起拖锚 from.pt
    expect(ends.y1).toBeCloseTo(136, 6)
    expect(ends.x2).toBeCloseTo(700, 6) // snap=null→cursor 跟随沿承
    expect(ends.y2).toBeCloseTo(600, 6)
    // snap 维 hint 不在场（dragging 态 DrawAnchorHint anchor=snap=null）
    expect(q('[data-testid="draw-anchor-hint"]')).toBeNull()
    docPointer('pointerup', 700, 600) // 收尾（空白取消）
    expect(useLineageStore.getState().edges).toHaveLength(0)
  })

  it('取消径 fromEff 复位：mid-drag blur 中断→重拖 fromEff 重算（无残留跨会话）', () => {
    mountTimeline([node('A'), node('B')], { A: { x: 100, y: 100 }, B: { x: 100, y: 300 } })
    const src: Rect = { x: 100, y: 100, w: 128, h: 72 }
    const tgt: Rect = { x: 100, y: 300, w: 128, h: 72 }
    dragTo({ x: 228, y: 136 }, { x: 100, y: 318 })
    let ends = previewEnds()
    expect(ends.x1).toBeCloseTo(164, 6) // fromEff 生效（bottom ½）
    act(() => {
      window.dispatchEvent(new Event('blur')) // 中断=取消复位（fromEff 清）
    })
    expect(q('[data-testid="draw-preview"]')).toBeNull()
    // 重拖第二会话：fromEff 按新会话重算（同几何=同值——证明复位后重算非残留）
    dragTo({ x: 228, y: 136 }, { x: 100, y: 318 })
    const expFrom = selectAnchor(src, { x: tgt.x + tgt.w / 2, y: tgt.y + tgt.h / 2 }).pt
    ends = previewEnds()
    expect(ends.x1).toBeCloseTo(expFrom.x, 6)
    expect(ends.y1).toBeCloseTo(expFrom.y, 6)
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
