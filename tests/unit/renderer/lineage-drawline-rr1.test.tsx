// @vitest-environment jsdom
/**
 * [lnfix1-RR1] 画线链回炉一轮锁定面（门一双审 W 一致+W-d1）：源卡排除分支
 * 守护+hint 节流 trailing 补发+finish 收尾补算。helper 与 lineage-drawline /
 * lineage-rr17 件同型（第 3 份复制——抽共享涉 tests/utils 受锁扩面，留主控
 * 裁决）。always-active 裸 describe（K3）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub, toastStoreSpy } from '../../utils/api-client-mock'

const stubApi = makeApiStub({
  lineage: { graph: vi.fn(), upsertNode: vi.fn(), removeNode: vi.fn(), upsertEdge: vi.fn(), removeEdge: vi.fn(), upsertLineTypes: vi.fn() }
})

import type { LineageEdge, LineageNode } from '../../../src/shared/models/lineage'
import { LINE_TYPE_COLORS } from '../../../src/shared/models/lineage'
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

const pointer = (el: Element, type: 'pointerdown' | 'pointermove' | 'pointerup', x: number, y: number): void => {
  act(() => {
    el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 }))
  })
}

/** document 级 pointermove（hint 待机扫描面） */
const docMove = (x: number, y: number): void => {
  act(() => {
    document.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, cancelable: true, clientX: x, clientY: y }))
  })
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
    tool: 'select', currentLineColor: LINE_TYPE_COLORS[0], linetypeListOpenFor: null
  })
  toastStoreSpy.mockClear()
})

afterEach(() => {
  act(() => { root?.unmount() })
  root = null
  host?.remove()
  host = null
})

describe('lnfix1-RR1 源卡排除守护+hint trailing 补发+finish 收尾补算', () => {
  it('RR1-1 落点=源卡卡身（非锚）→无 toast+无边+armed 保留（源卡排除守护）', async () => {
    mountTimeline()
    act(() => {
      useLineageViewStore.getState().toggleLineTool('solid')
    })
    const content = req('.tl-content')
    pointer(content, 'pointerdown', 228, 136)
    pointer(content, 'pointerup', 164, 136)
    expect(toastStoreSpy).not.toHaveBeenCalled()
    expect(useLineageStore.getState().edges).toHaveLength(0)
    expect(useLineageViewStore.getState().tool).toBe('draw-solid')
  })

  it('RR1-2a trailing 补发：同窗第二 move 被丢→窗尾补算=第二位置（窗口续期）', async () => {
    vi.useFakeTimers()
    try {
      mountTimeline()
      act(() => {
        vi.advanceTimersByTime(100)
      })
      act(() => {
        useLineageViewStore.getState().toggleLineTool('solid')
      })
      docMove(226, 136)
      expect(req('[data-testid="draw-anchor-hint"] circle').getAttribute('cx')).toBe('228')
      docMove(110, 336)
      expect(req('[data-testid="draw-anchor-hint"] circle').getAttribute('cx')).toBe('228')
      act(() => {
        vi.advanceTimersByTime(50)
      })
      const c2 = req('[data-testid="draw-anchor-hint"] circle')
      expect(c2.getAttribute('cx')).toBe('100')
      expect(c2.getAttribute('cy')).toBe('336')
    } finally {
      vi.useRealTimers()
    }
  })

  it('RR1-2b 收尾补算：up 同卡锚=取消→hint 立即恢复（源卡锚位）；up 他卡锚建边→hint 清除', async () => {
    mountTimeline()
    act(() => {
      useLineageViewStore.getState().toggleLineTool('solid')
    })
    const content = req('.tl-content')
    pointer(content, 'pointerdown', 228, 136)
    pointer(content, 'pointerup', 100, 136)
    expect(req('[data-testid="draw-anchor-hint"] circle').getAttribute('cx')).toBe('100')
    expect(req('[data-testid="draw-anchor-hint"] circle').getAttribute('cy')).toBe('136')
    pointer(content, 'pointerdown', 228, 136)
    pointer(content, 'pointerup', 100, 336)
    expect(q('[data-testid="draw-anchor-hint"]')).toBeNull()
  })
})
