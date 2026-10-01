// @vitest-environment jsdom
/**
 * [F-LGRAPH-01②U3] 画线子态机锁定合约面——armed（工具态）→pointerdown 近锚
 * (±6)→dragging（预览线+吸附指示）→pointerup 落另一卡近锚=建边（kind=manual
 * +dashed/color=当前工具线型+label=当前色行名快照 P-14）→idle(select)+入撤销
 * 栈；pointerup 空白/同卡=取消（armed 保留）；重复端点对=toast 拒绝（§2.4
 * +mockup §3.3）。always-active 裸 describe（K3）。
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

function mountTimeline(onNodeClick?: (id: string) => void): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(<LineageTimeline nodes={[node('A'), node('B')]} edges={[]} onNodeClick={onNodeClick ? (id) => onNodeClick(id) : undefined} />)
  })
  mockGeometry()
}

const q = (sel: string): Element | null => host?.querySelector(sel) ?? null
const req = (sel: string): Element => {
  const el = q(sel)
  if (el === null) throw new Error(`元素未渲染：${sel}`)
  return el
}

/** 内容坐标 pointer 事件（jsdom 无布局——client=内容坐标同域：content rect 基准 0） */
const pointer = (el: Element, type: 'pointerdown' | 'pointermove' | 'pointerup', x: number, y: number): void => {
  // jsdom 无 PointerEvent 构造器——MouseEvent 携 pointer 型名（card-drag 测试同型）
  act(() => {
    el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 }))
  })
}

beforeEach(() => {
  for (const fn of Object.values(stubApi.lineage)) fn.mockReset()
  stubApi.lineage.graph.mockResolvedValue({
    ok: true, data: { nodes: [], edges: [], lineTypeNames: ['待命名', '待命名', '待命名', '待命名', '待命名', '待命名'] }
  })
  stubApi.lineage.upsertEdge.mockImplementation(async (req: { id?: string; from: string; to: string }) =>
    ({ ok: true, data: edge(req.id ?? `e-${req.from}-${req.to}`, req.from, req.to) })
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

describe('F-LGRAPH-01②U3 画线子态机（§2.4——armed/近锚/down/up）', () => {
  it('全流：armed→pointerdown 近锚（A 右中 ±6）→dragging 预览线→pointerup 落 B 近锚→建边+入撤销栈+tool 回 select', async () => {
    mountTimeline()
    act(() => {
      useLineageViewStore.getState().toggleLineTool('solid') // armed
    })
    const content = req('.tl-content')
    // A 卡右中锚=(228,136)；近锚容差 ±6（取 (230,137)）
    pointer(content, 'pointerdown', 230, 137)
    // dragging 预览线渲染（svg[data-testid=draw-preview]）
    expect(q('[data-testid="draw-preview"]')).not.toBeNull()
    pointer(content, 'pointermove', 120, 330)
    pointer(content, 'pointerup', 100, 336) // B 左中锚=(100,336) 精确命中
    // 建边：store 暂存+撤销栈 1+tool 回 select
    expect(useLineageStore.getState().edges).toHaveLength(1)
    const e = useLineageStore.getState().edges[0]!
    expect(e.fromNode).toBe('A')
    expect(e.toNode).toBe('B')
    expect(e.dashed).toBe(false) // solid 工具
    expect(e.color).toBe(LINE_TYPE_COLORS[0])
    expect(e.label).toBe('主供水线') // P-14：当前色行名快照
    expect(useLineageStore.getState().undoStack).toHaveLength(1) // 一单元=一撤销步
    expect(useLineageViewStore.getState().tool).toBe('select') // 建边后回 select
    expect(q('[data-testid="draw-preview"]')).toBeNull() // 预览线清
    expect(stubApi.lineage.upsertEdge).not.toHaveBeenCalled() // 不发 IPC（A7 暂存）
  })

  it('虚线工具：dashed=true+当前色行名快照随行', async () => {
    mountTimeline()
    act(() => {
      useLineageStore.setState({ lineTypeNames: ['主供水线', '对比线', '待命名', '待命名', '待命名', '待命名'] })
      useLineageViewStore.setState({ currentLineColor: LINE_TYPE_COLORS[1]! })
      act(() => {
        useLineageViewStore.getState().toggleLineTool('dashed')
      })
    })
    const content = req('.tl-content')
    pointer(content, 'pointerdown', 228, 136) // A 右中锚
    pointer(content, 'pointerup', 100, 336) // B 左中锚
    const e = useLineageStore.getState().edges[0]!
    expect(e.dashed).toBe(true)
    expect(e.color).toBe(LINE_TYPE_COLORS[1])
    expect(e.label).toBe('对比线')
  })

  it('取消径①：pointerup 空白=无边+armed 保留（§2.4）', async () => {
    mountTimeline()
    act(() => {
      useLineageViewStore.getState().toggleLineTool('solid')
    })
    const content = req('.tl-content')
    pointer(content, 'pointerdown', 228, 136)
    pointer(content, 'pointerup', 800, 700) // 空白（无近锚）
    expect(useLineageStore.getState().edges).toHaveLength(0)
    expect(useLineageViewStore.getState().tool).toBe('draw-solid') // armed 保留
    expect(q('[data-testid="draw-preview"]')).toBeNull()
  })

  it('取消径②：pointerup 同卡=静默取消（excludeNodeId 排除同卡锚=无目标——实现=静默取消合理，回炉 R18 改题）', async () => {
    mountTimeline()
    act(() => {
      useLineageViewStore.getState().toggleLineTool('solid')
    })
    const content = req('.tl-content')
    pointer(content, 'pointerdown', 228, 136) // A 右中
    pointer(content, 'pointerup', 164, 172) // A 底中锚近旁
    expect(useLineageStore.getState().edges).toHaveLength(0)
    expect(useLineageViewStore.getState().tool).toBe('draw-solid') // armed 保留
  })

  it('重复端点对（无向）=toast 拒绝不建边；armed 保留（现行语义沿承）', async () => {
    mountTimeline()
    useLineageStore.setState({ edges: [edge('e-old', 'B', 'A')] })
    act(() => {
      useLineageViewStore.getState().toggleLineTool('solid')
    })
    const content = req('.tl-content')
    pointer(content, 'pointerdown', 228, 136) // A
    pointer(content, 'pointerup', 100, 336) // B（已有 B→A 无向同对）
    expect(useLineageStore.getState().edges).toHaveLength(1) // 未新增
    expect(useLineageViewStore.getState().tool).toBe('draw-solid')
  })

  it('非近锚 pointerdown（卡中心）=不进入 dragging（近锚=卡边 ±6 域）', async () => {
    mountTimeline()
    act(() => {
      useLineageViewStore.getState().toggleLineTool('solid')
    })
    const content = req('.tl-content')
    pointer(content, 'pointerdown', 164, 136) // A 卡中心（x=100+64；距右中锚 64>6）
    expect(q('[data-testid="draw-preview"]')).toBeNull()
    pointer(content, 'pointerup', 100, 336)
    expect(useLineageStore.getState().edges).toHaveLength(0)
  })

  it('draw 态卡 pointerdown 不激活拖拽（画线优先——调序闸）', async () => {
    mountTimeline()
    act(() => {
      useLineageViewStore.getState().toggleLineTool('solid')
    })
    const cardA = req('.tl-card[data-node-id="A"]')
    pointer(cardA, 'pointerdown', 228, 136)
    pointer(cardA, 'pointermove', 240, 200)
    expect(q('.drag-slot')).toBeNull() // 拖拽槽未激活（画线态禁拖）
    pointer(q('.tl-content')!, 'pointerup', 240, 200)
  })
})

describe('F-LGRAPH-01②U3 画线中断收尾（回炉 R1/R13/R15——document 会话+下降沿+源卡高亮）', () => {
  /** document 级指针事件（会话监听面——指针离画布仍可达） */
  const docPointer = (type: 'pointermove' | 'pointerup', x: number, y: number): void => {
    act(() => {
      document.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 }))
    })
  }

  it('R1① document 级拖拽会话：pointermove/up 在 document 派发仍驱动（离画布跟随）→建边', async () => {
    mountTimeline()
    act(() => {
      useLineageViewStore.getState().toggleLineTool('solid')
    })
    const content = req('.tl-content')
    pointer(content, 'pointerdown', 228, 136)
    docPointer('pointermove', 120, 330) // document 面 move（非 .tl-content）
    expect(q('[data-testid="draw-preview"]')).not.toBeNull() // 会话仍跟随
    docPointer('pointerup', 100, 336) // document 面 up→B 左中锚建边
    expect(useLineageStore.getState().edges).toHaveLength(1)
    expect(useLineageStore.getState().edges[0]!.toNode).toBe('B')
    expect(q('[data-testid="draw-preview"]')).toBeNull() // 收尾无残留
  })

  it('R1④ blur 中断=取消无残留：预览清+迟到的 pointerup（回画布）不误建边', async () => {
    mountTimeline()
    act(() => {
      useLineageViewStore.getState().toggleLineTool('solid')
    })
    const content = req('.tl-content')
    pointer(content, 'pointerdown', 228, 136)
    expect(q('[data-testid="draw-preview"]')).not.toBeNull()
    act(() => {
      window.dispatchEvent(new Event('blur')) // 窗口失焦=中断
    })
    expect(q('[data-testid="draw-preview"]')).toBeNull() // 取消=零残留
    docPointer('pointerup', 100, 336) // 中断后的迟到 up（落 B 锚）不建边
    expect(useLineageStore.getState().edges).toHaveLength(0)
  })

  it('R1④ pointercancel 同型：取消无残留+迟到 up 不建边', async () => {
    mountTimeline()
    act(() => {
      useLineageViewStore.getState().toggleLineTool('solid')
    })
    const content = req('.tl-content')
    pointer(content, 'pointerdown', 228, 136)
    act(() => {
      document.dispatchEvent(new MouseEvent('pointercancel', { bubbles: true }))
    })
    expect(q('[data-testid="draw-preview"]')).toBeNull()
    docPointer('pointerup', 100, 336)
    expect(useLineageStore.getState().edges).toHaveLength(0)
  })

  it('R1② 切模式下降沿中止：mid-drag setMode→预览清+document up 落目标锚不建边', async () => {
    mountTimeline()
    act(() => {
      useLineageViewStore.getState().toggleLineTool('solid')
    })
    const content = req('.tl-content')
    pointer(content, 'pointerdown', 228, 136)
    act(() => {
      useLineageViewStore.getState().setMode('browse') // 切模式=中止
    })
    expect(q('[data-testid="draw-preview"]')).toBeNull()
    docPointer('pointerup', 100, 336)
    expect(useLineageStore.getState().edges).toHaveLength(0)
  })

  it('R1② 切 select 下降沿中止：mid-drag resetTool→取消无残留（回画布 up 不建边）', async () => {
    mountTimeline()
    act(() => {
      useLineageViewStore.getState().toggleLineTool('solid')
    })
    const content = req('.tl-content')
    pointer(content, 'pointerdown', 228, 136)
    act(() => {
      useLineageViewStore.getState().resetTool() // 切 select=中止
    })
    expect(q('[data-testid="draw-preview"]')).toBeNull()
    docPointer('pointerup', 100, 336)
    expect(useLineageStore.getState().edges).toHaveLength(0)
  })

  it('R1② 切图下降沿中止：mid-drag setFolder→取消（up 不建边）', async () => {
    stubApi.lineage.graph.mockResolvedValueOnce({
      ok: true,
      data: { nodes: [node('A'), node('B')], edges: [], lineTypeNames: ['待命名', '待命名', '待命名', '待命名', '待命名', '待命名'] }
    })
    mountTimeline()
    act(() => {
      useLineageViewStore.getState().toggleLineTool('solid')
    })
    const content = req('.tl-content')
    pointer(content, 'pointerdown', 228, 136)
    act(() => {
      useLineageStore.getState().setFolder('folder-2') // 切图=中止（resetTool 联动）
    })
    expect(q('[data-testid="draw-preview"]')).toBeNull()
    docPointer('pointerup', 100, 336)
    expect(useLineageStore.getState().edges).toHaveLength(0)
  })

  it('R13 消费即止泡：近锚 pointerdown 不达 document（防 pan 并行激活）；非近锚照常冒泡', async () => {
    mountTimeline()
    act(() => {
      useLineageViewStore.getState().toggleLineTool('solid')
    })
    const content = req('.tl-content')
    const spy = vi.fn()
    document.addEventListener('pointerdown', spy)
    try {
      pointer(content, 'pointerdown', 228, 136) // 近锚=消费→止泡
      expect(spy).not.toHaveBeenCalled()
      docPointer('pointerup', 800, 700) // 收尾（取消——空白）
      pointer(content, 'pointerdown', 600, 500) // 非近锚=不消费→冒泡到 document
      expect(spy).toHaveBeenCalled()
      docPointer('pointerup', 600, 500)
    } finally {
      document.removeEventListener('pointerdown', spy)
    }
  })

  it('R15 源卡高亮：dragging 期源卡挂 .link-src（T3-P7B 语义沿承）；收尾撤', async () => {
    mountTimeline()
    act(() => {
      useLineageViewStore.getState().toggleLineTool('solid')
    })
    const content = req('.tl-content')
    const cardA = req('.tl-card[data-node-id="A"]')
    expect(cardA.classList.contains('link-src')).toBe(false) // 基线无
    pointer(content, 'pointerdown', 228, 136)
    expect(cardA.classList.contains('link-src')).toBe(true) // 源卡高亮复活
    docPointer('pointerup', 800, 700) // 取消收尾
    expect(req('.tl-card[data-node-id="A"]').classList.contains('link-src')).toBe(false)
  })
})

describe('F-LGRAPH-01②U3 画线收尾 click 抑制（[RR4] suppress 旗同手势消费）', () => {
  /** document 级 pointer 事件（收尾会话监听面）与 click（capture 消费面） */
  const docPointer = (type: 'pointermove' | 'pointerup', x: number, y: number): void => {
    act(() => {
      document.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 }))
    })
  }
  const docClick = (target: Element): void => {
    act(() => {
      target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    })
  }

  it('RR4 收尾（空白取消）后：先点空白（旗就地消费）→下一次卡点击不被吞', async () => {
    const onNodeClick = vi.fn()
    mountTimeline(onNodeClick)
    act(() => {
      useLineageViewStore.getState().toggleLineTool('solid')
    })
    const content = req('.tl-content')
    pointer(content, 'pointerdown', 228, 136)
    docPointer('pointerup', 800, 700) // 空白取消收尾（旗置位——原实现仅在卡点击点消费）
    docClick(content) // 后续 click 落非卡面（空白）=旗残留场景（RR4 缺陷本体）
    docClick(req('.tl-card[data-node-id="A"]')) // 下一次卡点击
    expect(onNodeClick).toHaveBeenCalled() // 不被吞（原实现：残留旗吞此点击）
  })

  it('RR4 画布内首 click 抑制语义沿承：收尾（建边）后紧邻卡点击仍被吞（防误选卡）', async () => {
    const onNodeClick = vi.fn()
    mountTimeline(onNodeClick)
    act(() => {
      useLineageViewStore.getState().toggleLineTool('solid')
    })
    const content = req('.tl-content')
    pointer(content, 'pointerdown', 228, 136) // A 右中锚
    docPointer('pointerup', 100, 336) // B 左中锚建边（收尾旗置位）
    docClick(req('.tl-card[data-node-id="B"]')) // 紧邻卡 click（画布内）
    expect(onNodeClick).not.toHaveBeenCalled() // 抑制沿承（防建边误选卡）
    docClick(req('.tl-card[data-node-id="B"]')) // 第二次卡点击=新手势放行
    expect(onNodeClick).toHaveBeenCalledTimes(1)
  })
})
