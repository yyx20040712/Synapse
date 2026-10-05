// @vitest-environment jsdom
/**
 * [F-UIRES-03 C1] 点两卡连边链锁定（设计稿 v1.9 §2 C1——anchor 维〔picked
 * nodeId〕驻 useDrawLine 现域，组件面经 LineageTimeline 可测——lineage-drawline
 * 先例同型）：draw-X+点卡 A→anchor=picked(A)（禁开详情——裁决 11a）→点卡
 * B≠A→建边（dashed/color=提交时 per-kind 读——delta-W4 latch）→anchor=none
 * 且保持 draw-X 连画；picked(A)+点 A→anchor=none。always-active 裸 describe
 * （K3）。
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
  return { id, fromNode: from, toNode: to, label: '', dashed: false, color: '#1e3a8a', createdAt: 't', updatedAt: 't' }
}

let root: Root | null = null
let host: HTMLDivElement | null = null

/** 卡 rect mock（内容坐标域）：A(100,100) B(100,300) C(400,100) D(400,300) */
function mockGeometry(): void {
  const content = document.querySelector('.tl-content') as HTMLElement | null
  if (content === null) throw new Error('.tl-content 未渲染')
  Object.defineProperty(content, 'getBoundingClientRect', {
    value: () => ({ left: 0, top: 0, right: 1000, bottom: 800, width: 1000, height: 800, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect,
    configurable: true
  })
  const rects: Record<string, { x: number; y: number }> = {
    A: { x: 100, y: 100 }, B: { x: 100, y: 300 }, C: { x: 400, y: 100 }, D: { x: 400, y: 300 }
  }
  for (const el of Array.from(content.querySelectorAll('.tl-card[data-node-id]'))) {
    const id = (el as HTMLElement).dataset.nodeId ?? ''
    const base = rects[id] ?? { x: 0, y: 0 }
    Object.defineProperty(el, 'getBoundingClientRect', {
      value: () => ({ left: base.x, top: base.y, right: base.x + 128, bottom: base.y + 72, width: 128, height: 72, x: base.x, y: base.y, toJSON: () => ({}) }) as DOMRect,
      configurable: true
    })
  }
}

function mountTimeline(onNodeClick?: (id: string) => void): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(
      <LineageTimeline
        nodes={[node('A'), node('B'), node('C'), node('D')]}
        edges={[]}
        onNodeClick={onNodeClick ? (id) => onNodeClick(id) : undefined}
      />
    )
  })
  mockGeometry()
}

const q = (sel: string): Element | null => host?.querySelector(sel) ?? null
const req = (sel: string): Element => {
  const el = q(sel)
  if (el === null) throw new Error(`元素未渲染：${sel}`)
  return el
}

/** 卡身 click（bubbles——卡 article onClick 面；中心坐标=非近锚不起拖） */
const cardClick = (id: string): void => {
  act(() => {
    req(`.tl-card[data-node-id="${id}"]`).dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true, clientX: 10, clientY: 10 })
    )
  })
}

const linkSrc = (id: string): boolean => req(`.tl-card[data-node-id="${id}"]`).classList.contains('link-src')

beforeEach(() => {
  for (const fn of Object.values(stubApi.lineage)) fn.mockReset()
  stubApi.lineage.graph.mockResolvedValue({
    ok: true, data: { nodes: [], edges: [], lineTypeNames: ['待命名', '待命名', '待命名', '待命名', '待命名', '待命名'] }
  })
  stubApi.lineage.upsertEdge.mockImplementation(async (r: { id?: string; from: string; to: string }) =>
    ({ ok: true, data: edge(r.id ?? `e-${r.from}-${r.to}`, r.from, r.to) })
  )
  useLineageStore.setState({
    nodes: [node('A'), node('B'), node('C'), node('D')], edges: [],
    lineTypeNames: ['主供水线', '对比线', '待命名', '待命名', '待命名', '待命名'],
    status: 'ready', error: null, saveStatus: 'clean', lastWriteError: null,
    queue: [], flushing: false, undoStack: [], redoStack: [], folderId: '__main__'
  })
  useLineageViewStore.setState({
    mode: 'edit', focusSet: [], navCollapsed: false, navWidth: 208,
    tool: 'select', currentLineColor: { solid: LINE_TYPE_COLORS[0], dashed: LINE_TYPE_COLORS[0] }, paletteFor: null
  })
  toastStoreSpy.mockClear()
})

afterEach(() => {
  act(() => { root?.unmount() })
  root = null
  host?.remove()
  host = null
})

describe('F-UIRES-03 C1 点两卡连边链（anchor 维——useDrawLine 现域）', () => {
  it('draw-X+点卡 A→anchor=picked(A)（.link-src 锚高亮）且详情未开（裁决 11a 禁开详情）', () => {
    const onNodeClick = vi.fn()
    mountTimeline(onNodeClick)
    act(() => {
      useLineageViewStore.getState().toggleLineTool('solid')
    })
    expect(linkSrc('A')).toBe(false) // 基线无
    cardClick('A')
    expect(linkSrc('A')).toBe(true) // 锚高亮（picked）
    expect(onNodeClick).not.toHaveBeenCalled() // 禁开详情
    expect(useLineageStore.getState().edges).toHaveLength(0)
  })

  it('picked(A)+点卡 B≠A→建边（dashed=false+color=solid 当前色+label=色行名快照）→anchor=none+保持 draw-X 连画', () => {
    const onNodeClick = vi.fn()
    mountTimeline(onNodeClick)
    act(() => {
      useLineageViewStore.getState().toggleLineTool('solid')
    })
    cardClick('A')
    cardClick('B')
    expect(useLineageStore.getState().edges).toHaveLength(1)
    const e = useLineageStore.getState().edges[0]!
    expect(e.fromNode).toBe('A')
    expect(e.toNode).toBe('B')
    expect(e.dashed).toBe(false)
    expect(e.color).toBe(LINE_TYPE_COLORS[0])
    expect(e.label).toBe('主供水线') // P-14 色行名快照沿承
    expect(linkSrc('A')).toBe(false) // anchor=none（高亮撤）
    expect(useLineageViewStore.getState().tool).toBe('draw-solid') // 连画（拟稿推荐③）
    expect(useLineageStore.getState().undoStack).toHaveLength(1) // 一单元=一撤销步
    expect(onNodeClick).not.toHaveBeenCalled()
  })

  it('连画第二边：A→B 后再点 C→D 边二落（anchor 复用同链）', () => {
    mountTimeline()
    act(() => {
      useLineageViewStore.getState().toggleLineTool('solid')
    })
    cardClick('A')
    cardClick('B')
    cardClick('C')
    expect(linkSrc('C')).toBe(true)
    cardClick('D')
    expect(useLineageStore.getState().edges).toHaveLength(2)
    const e2 = useLineageStore.getState().edges[1]!
    expect(e2.fromNode).toBe('C')
    expect(e2.toNode).toBe('D')
    expect(useLineageViewStore.getState().tool).toBe('draw-solid')
  })

  it('picked(A)+点 A→anchor=none（再点重选——无边）', () => {
    mountTimeline()
    act(() => {
      useLineageViewStore.getState().toggleLineTool('solid')
    })
    cardClick('A')
    expect(linkSrc('A')).toBe(true) // [RR1 d1-W3] 锚前置步——无锚可设的恒绿形态封死（取消径须先有锚）
    cardClick('A')
    expect(linkSrc('A')).toBe(false)
    expect(useLineageStore.getState().edges).toHaveLength(0)
    expect(useLineageViewStore.getState().tool).toBe('draw-solid') // armed 保持
  })

  it('[RR1 d1-W3] 板开+点卡=同帧关板∧锚选（delta-W3b 点外部不吞——关板为伴随效果，事件正常路由）', () => {
    mountTimeline()
    act(() => {
      useLineageViewStore.getState().toggleLineTool('solid')
      useLineageViewStore.getState().togglePalette('solid')
    })
    expect(useLineageViewStore.getState().paletteFor).toBe('solid')
    cardClick('A')
    expect(useLineageViewStore.getState().paletteFor).toBeNull() // 伴随关板（document click 不吞只收板）
    expect(linkSrc('A')).toBe(true) // 锚选（click 正常路由进锚链）
    expect(useLineageStore.getState().edges).toHaveLength(0)
  })

  it('[RR1 d1-N5②] anchor 跨 kind 切换保留（draw-X→draw-Y 仍画线域不清锚；提交按新 kind）', () => {
    mountTimeline()
    act(() => {
      useLineageViewStore.getState().toggleLineTool('solid')
    })
    cardClick('A')
    expect(linkSrc('A')).toBe(true)
    act(() => {
      useLineageViewStore.getState().toggleLineTool('dashed') // kind 切换（delta-W5 收板径）
    })
    expect(linkSrc('A')).toBe(true) // 锚保留（useDrawLine 下降沿守卫：仍 armed）
    cardClick('B')
    const e = useLineageStore.getState().edges[0]!
    expect(e.dashed).toBe(true) // 提交按切换后 kind（dashed 色/型）
    expect(linkSrc('A')).toBe(false)
  })

  it('dashed 工具链：dashed=true+color=dashed 当前色（per-kind 提交读）', () => {
    mountTimeline()
    act(() => {
      useLineageViewStore.setState({ currentLineColor: { solid: LINE_TYPE_COLORS[0], dashed: LINE_TYPE_COLORS[1]! } })
      useLineageViewStore.getState().toggleLineTool('dashed')
    })
    cardClick('A')
    cardClick('B')
    const e = useLineageStore.getState().edges[0]!
    expect(e.dashed).toBe(true)
    expect(e.color).toBe(LINE_TYPE_COLORS[1])
    expect(e.label).toBe('对比线')
  })

  it('latch（delta-W4）：draw-X 中改 X 色→落边=提交时新值（在途取色跟随当前）', () => {
    mountTimeline()
    act(() => {
      useLineageViewStore.getState().toggleLineTool('solid')
    })
    cardClick('A')
    // picked(A) 后、点 B 前改 solid 当前色——commit 读提交时值
    act(() => {
      useLineageViewStore.getState().pickLineColor('solid', LINE_TYPE_COLORS[3]!)
    })
    cardClick('B')
    const e = useLineageStore.getState().edges[0]!
    expect(e.color).toBe(LINE_TYPE_COLORS[3])
    expect(e.label).toBe('待命名') // 色行名快照随新色行
  })

  it('重复端点对（无向）=toast 拒绝不建边；anchor 保持（换目标可续）', () => {
    mountTimeline()
    useLineageStore.setState({ edges: [edge('e-old', 'B', 'A')] })
    act(() => {
      useLineageViewStore.getState().toggleLineTool('solid')
    })
    cardClick('A')
    cardClick('B')
    expect(toastStoreSpy).toHaveBeenCalledWith('两节点间已存在连线', 'error')
    expect(useLineageStore.getState().edges).toHaveLength(1) // 未新增
    expect(linkSrc('A')).toBe(true) // anchor 保持
    expect(useLineageViewStore.getState().tool).toBe('draw-solid')
  })

  it('退画线清锚：anchor picked 后 resetTool→.link-src 撤（无残留）', () => {
    mountTimeline()
    act(() => {
      useLineageViewStore.getState().toggleLineTool('solid')
    })
    cardClick('A')
    expect(linkSrc('A')).toBe(true)
    act(() => {
      useLineageViewStore.getState().resetTool()
    })
    expect(linkSrc('A')).toBe(false)
  })

  it('select 态点卡=详情正常开（画线路由不劫持——负锚）', () => {
    const onNodeClick = vi.fn()
    mountTimeline(onNodeClick)
    cardClick('A')
    expect(onNodeClick).toHaveBeenCalledTimes(1)
    expect(useLineageStore.getState().edges).toHaveLength(0)
  })

  it('draw 态点星标区=零详情（卡内子域同守「禁开详情」）', () => {
    const onNodeClick = vi.fn()
    mountTimeline(onNodeClick)
    act(() => {
      useLineageViewStore.getState().toggleLineTool('solid')
    })
    act(() => {
      req('.tl-card[data-node-id="A"] [data-testid="card-star"]').dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true })
      )
    })
    expect(onNodeClick).not.toHaveBeenCalled()
    expect(useLineageStore.getState().edges).toHaveLength(0)
  })
})
