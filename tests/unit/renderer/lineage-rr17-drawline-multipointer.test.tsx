// @vitest-environment jsdom
/**
 * [F-LGRAPH-01② RR 补批·RR17] useDrawLine 多指针重入 phase 闸（裁决部
 * RR17/v107 §4——触屏/笔可达面）：dragging 中第二 pointerdown 忽略（不覆盖
 * 会话）+document 会话事件 pointerId 绑定（第二指 move/up/pointercancel 不
 * 收尾本会话）——首指 up 正常收尾。[RRB3] 首指 pid=1 显式注入全链（真机
 * pid 恒数字形态——原全套件走 undefined 兜底分支，删 id===pid 分支不可见）。
 * always-active 裸 describe（K3）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub } from '../../utils/api-client-mock'

const stubApi = makeApiStub({
  lineage: { graph: vi.fn(), upsertEdge: vi.fn() }
})

import type { LineageEdge, LineageNode } from '../../../src/shared/models/lineage'
import { LINE_TYPE_COLORS } from '../../../src/shared/models/lineage'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import { useLineageViewStore } from '../../../src/renderer/features/lineage/lineage-view.store'
import { LineageTimeline } from '../../../src/renderer/features/lineage/LineageTimeline'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

function node(id: string): LineageNode {
  return {
    id, paperId: `paper-${id}`, title: `节点${id}`, coreIdea: '', year: 2022,
    x: null, y: null, month: 9, slot: null, folderId: '__main__', createdAt: 't', updatedAt: 't'
  }
}

function edge(id: string, from: string, to: string): LineageEdge {
  return { id, fromNode: from, toNode: to, label: '', dashed: false, color: '#3a5bd9', createdAt: 't', updatedAt: 't' }
}

let root: Root | null = null
let host: HTMLDivElement | null = null

/** 卡 rect mock（内容坐标域——content rect=(0,0) 基准）：A(100,100) B(100,300) */
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

/** 内容坐标 pointer 事件（jsdom 无 PointerEvent 构造器——MouseEvent 携
 *  pointer 型名；pid 透传=多指模拟（undefined=鼠标型会话主指） */
const pointerOn = (el: Element, type: 'pointerdown' | 'pointermove' | 'pointerup', x: number, y: number, pid?: number): void => {
  const ev = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 })
  if (pid !== undefined) Object.defineProperty(ev, 'pointerId', { value: pid })
  act(() => {
    el.dispatchEvent(ev)
  })
}

/** document 级会话事件（move/up——指针离画布仍可达面） */
const docPointer = (type: 'pointermove' | 'pointerup', x: number, y: number, pid?: number): void => {
  pointerOn(document.documentElement, type, x, y, pid)
}

beforeEach(() => {
  for (const fn of Object.values(stubApi.lineage)) fn.mockReset()
  stubApi.lineage.graph.mockResolvedValue({
    ok: true, data: { nodes: [], edges: [], lineTypeNames: ['待命名', '待命名', '待命名', '待命名', '待命名', '待命名'] }
  })
  stubApi.lineage.upsertEdge.mockImplementation(async (reqIn: { id?: string; from: string; to: string }) =>
    ({ ok: true, data: edge(reqIn.id ?? `e-${reqIn.from}-${reqIn.to}`, reqIn.from, reqIn.to) })
  )
  useLineageStore.setState({
    nodes: [node('A'), node('B')], edges: [], lineTypeNames: ['主供水线', '待命名', '待命名', '待命名', '待命名', '待命名'],
    status: 'ready', error: null, saveStatus: 'clean', lastWriteError: null,
    queue: [], flushing: false, undoStack: [], redoStack: [], folderId: '__main__'
  })
  useLineageViewStore.setState({
    mode: 'edit', focusSet: [], navCollapsed: false, navWidth: 208,
    tool: 'select', currentLineColor: LINE_TYPE_COLORS[0], linetypeListOpenFor: null
  })
})

afterEach(() => {
  act(() => { root?.unmount() })
  root = null
  host?.remove()
  host = null
})

describe('RR17 多指针重入 phase 闸（dragging 中第二指忽略——首指 up 正常收尾）', () => {
  it('dragging 中第二 pointerdown（触屏二指落 B 锚）不覆盖会话：第二指 up 不收尾+首指 up 建边 A→B', () => {
    mountTimeline()
    act(() => {
      useLineageViewStore.getState().toggleLineTool('solid') // armed
    })
    const content = req('.tl-content')
    pointerOn(content, 'pointerdown', 228, 136) // 第一指（鼠标型 pid=undefined）落 A 右中锚
    expect(q('[data-testid="draw-preview"]')).not.toBeNull() // dragging 在场
    // 第二指（pid=2）落 B 左中锚 (100,336)——原实现=覆盖会话（from 重置为 B）
    pointerOn(content, 'pointerdown', 100, 336, 2)
    docPointer('pointermove', 800, 700, 2) // 第二指 move 不驱动本会话
    docPointer('pointerup', 100, 336, 2) // 第二指 up=不收尾（会话保持）
    expect(q('[data-testid="draw-preview"]')).not.toBeNull() // 会话仍 dragging（未被他指收尾）
    expect(useLineageStore.getState().edges).toHaveLength(0)
    // 首指 up 落 B 左中锚=正常收尾：源锚 A 保持（未被二指覆盖）→建边 A→B
    docPointer('pointerup', 100, 336)
    expect(q('[data-testid="draw-preview"]')).toBeNull() // 收尾清预览
    const s = useLineageStore.getState()
    expect(s.edges).toHaveLength(1)
    expect(s.edges[0]!.fromNode).toBe('A') // 会话源锚未被第二指覆盖
    expect(s.edges[0]!.toNode).toBe('B')
    expect(s.undoStack).toHaveLength(1) // 一单元=一撤销步
    expect(useLineageViewStore.getState().tool).toBe('select') // 建边后回 select
  })

  it('第二指 pointercancel 不取消本会话：首指继续拖+up 正常建边', () => {
    mountTimeline()
    act(() => {
      useLineageViewStore.getState().toggleLineTool('solid')
    })
    const content = req('.tl-content')
    pointerOn(content, 'pointerdown', 228, 136) // 首指起会话
    // 第二指 down+cancel（触屏系统手势吞指）——本会话不受扰
    pointerOn(content, 'pointerdown', 100, 336, 2)
    const cancelEv = new MouseEvent('pointercancel', { bubbles: true })
    Object.defineProperty(cancelEv, 'pointerId', { value: 2 })
    act(() => {
      document.dispatchEvent(cancelEv)
    })
    expect(q('[data-testid="draw-preview"]')).not.toBeNull() // 会话存活
    docPointer('pointerup', 100, 336) // 首指 up 正常收尾
    const s = useLineageStore.getState()
    expect(s.edges).toHaveLength(1)
    expect(s.edges[0]!.fromNode).toBe('A')
    expect(s.edges[0]!.toNode).toBe('B')
  })

  it('[RRB3] 首指 pointerId=1 显式注入全链（真机 pid 恒数字形态）：down/move/up 皆 pid=1 建边 A→B——id===pid 绑定分支直测', () => {
    mountTimeline()
    act(() => {
      useLineageViewStore.getState().toggleLineTool('solid')
    })
    const content = req('.tl-content')
    pointerOn(content, 'pointerdown', 228, 136, 1) // 首指 pid=1 落 A 右中锚
    expect(q('[data-testid="draw-preview"]')).not.toBeNull() // dragging 在场
    docPointer('pointermove', 400, 336, 1) // pid=1 move 驱动会话（游标推进）
    docPointer('pointerup', 100, 336, 1) // pid=1 up 收尾（删 id===pid 分支=此链断）
    expect(q('[data-testid="draw-preview"]')).toBeNull() // 收尾清预览
    const s = useLineageStore.getState()
    expect(s.edges).toHaveLength(1)
    expect(s.edges[0]!.fromNode).toBe('A')
    expect(s.edges[0]!.toNode).toBe('B')
    expect(s.undoStack).toHaveLength(1) // 一单元=一撤销步
  })
})
