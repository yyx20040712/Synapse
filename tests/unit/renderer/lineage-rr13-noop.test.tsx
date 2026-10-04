// @vitest-environment jsdom
/**
 * [F-LGRAPH-01② RR 补批·RR13] no-op 短路对称语义（裁决部 RR13/v107 §4
 * ——R19「重置 no-op 不入栈」先例）：reconnect finish 落点==拖始锚=零编辑
 * 单元（不 beginUnit 不 dirty 不入队）+拖放 commit via 等值短路；manual 线
 * 同锚松手幽灵 +1 点（L 重正交插拐）不复现。always-active 裸 describe（K3）。
 * [RRB2] ④段拖回原位直测（三短路中段拖面唯一无直测——误删 if 套件仍绿的
 * 逃逸口）+no-op 后 redo 栈保留断言（误 beginUnit 必清 redo 的对称锚）。
 * 装配面与 lineage-edge-edit-r2 同构（jsdom 零布局——gBCR spy 定值几何）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub } from '../../utils/api-client-mock'

const stubApi = makeApiStub({
  lineage: { graph: vi.fn() }
})
void stubApi

import type { LineageEdge, LineageNode } from '../../../src/shared/models/lineage'
import { LineageTimeline } from '../../../src/renderer/features/lineage/LineageTimeline'
import { useLineageViewStore } from '../../../src/renderer/features/lineage/lineage-view.store'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

function node(id: string): LineageNode {
  return {
    id,
    paperId: `paper-${id}`,
    title: `节点${id}`,
    year: 2022,
    x: null,
    y: null,
    month: 9,
    slot: null,
    folderId: '__main__',
    createdAt: 't',
    updatedAt: 't'
  }
}

/** manual-override 边（via 在场——正交链） */
function edge(id: string, from: string, to: string, via: Array<{ x: number; y: number }>): LineageEdge {
  return { id, fromNode: from, toNode: to, label: `线${id}`, dashed: false, color: '#3a5bd9', via, createdAt: 't', updatedAt: 't' }
}

let root: Root | null = null
let host: HTMLDivElement | null = null
const rafs: FrameRequestCallback[] = []

function stubRaf(): void {
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback): number => {
    rafs.push(cb)
    return rafs.length
  })
}

const flushRafs = (): void => {
  act(() => {
    rafs.splice(0).forEach((cb) => cb(0))
  })
}

function stubRect(el: Element, x: number, y: number, w = 128, h = 72): void {
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
    left: x, top: y, right: x + w, bottom: y + h, width: w, height: h, x, y,
    toJSON: () => ({})
  } as unknown as DOMRect)
}

const click = (el: Element): void => {
  act(() => { el.dispatchEvent(new MouseEvent('click', { bubbles: true })) })
}

beforeEach(() => {
  useLineageStore.setState({ saveStatus: 'clean', queue: [], undoStack: [], redoStack: [] })
})
afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
  vi.restoreAllMocks()
  useLineageViewStore.setState({ mode: 'browse', focusSet: [], tool: 'select', zoom: 1 })
  useLineageStore.setState({ edges: [], nodes: [], queue: [], undoStack: [], redoStack: [], saveStatus: 'clean' })
})

/** 布局：A(12,30) B(412,30) 同月框；边 e1（A→B）——store 态同步直置。
 *  锚位参考（B 卡 128×72 于 (412,30)：槽位=¼/½/¾）：A 右中=(140,66)；
 *  B 左中=(412,66)/左¼=(412,48)/顶中=(476,30) */
function layout(edgeVia: Array<{ x: number; y: number }>): void {
  const nodes = [node('A'), node('B')]
  const edges = [edge('e1', 'A', 'B', edgeVia)]
  useLineageStore.setState({ nodes, edges, saveStatus: 'clean', queue: [], undoStack: [], redoStack: [] })
  stubRaf()
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(<LineageTimeline nodes={nodes} edges={edges} />)
  })
  act(() => {
    useLineageViewStore.setState({ mode: 'edit' })
  })
  const frame = host.querySelector('.month-frame') as HTMLElement
  stubRect(frame, 0, 0, 800, 200)
  stubRect(host.querySelector('.tl-card[data-node-id="A"]') as HTMLElement, 12, 30)
  stubRect(host.querySelector('.tl-card[data-node-id="B"]') as HTMLElement, 412, 30)
  flushRafs()
}

const hitOf = (edgeId: string): SVGElement => {
  const el = host!.querySelector(`.tl-edge-hit[data-edge-id="${edgeId}"]`)
  if (!(el instanceof SVGElement)) throw new Error('命中层未渲染')
  return el
}

describe('RR13 no-op 短路（R19 对称——同锚/等值松手零编辑单元）', () => {
  const endHandle = (end: 'from' | 'to'): SVGElement => {
    const el = host!.querySelector(`[data-testid="edge-handle-end"][data-end="${end}"]`)
    if (!(el instanceof SVGElement)) throw new Error('端点柄未渲染')
    return el
  }
  const docMove = (x: number, y: number): void => {
    act(() => { document.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: x, clientY: y })) })
  }
  const docUp = (x: number, y: number): void => {
    act(() => { document.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX: x, clientY: y })) })
  }

  it('①同锚松手=零编辑单元：reconnect 拖 to 端回 B 左中原锚——undo 栈深不变+clean 保持+via 原样', () => {
    layout([{ x: 200, y: 66 }])
    click(hitOf('e1'))
    const undoBefore = useLineageStore.getState().undoStack.length // 0
    act(() => { endHandle('to').dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0 })) })
    docMove(412, 66) // 拖至原锚位（B 左中——拖始锚）
    docUp(412, 66)
    const s = useLineageStore.getState()
    expect(s.undoStack).toHaveLength(undoBefore) // 零编辑单元（原实现=1）
    expect(s.queue).toHaveLength(0) // 不入队
    expect(s.saveStatus).toBe('clean') // 不 dirty
    expect(s.edges[0]?.via).toEqual([{ x: 200, y: 66 }]) // via 原样
    expect(host!.querySelector('[data-testid="edge-handles"]')).not.toBeNull() // 回 selected（选中保持）
  })

  it('③manual 线幽灵 +1 点不复现：拐点错轴边（via 末点 y≠锚轴）同锚松手——via 长度不变（原实现插 L corner +1）', () => {
    // via 末点 (300,36)：selectAnchor(B,·) 命 B 左¼锚 (412,48)——同锚松手时
    // reconnectEnd 会插 corner (300,48)（y 错轴不齐）=幽灵 +1
    layout([
      { x: 200, y: 66 },
      { x: 300, y: 36 }
    ])
    click(hitOf('e1'))
    act(() => { endHandle('to').dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0 })) })
    docMove(412, 48) // 拖回拖始锚位（B 左¼）
    docUp(412, 48)
    const s = useLineageStore.getState()
    expect(s.edges[0]?.via).toEqual([
      { x: 200, y: 66 },
      { x: 300, y: 36 }
    ]) // 长度 2 不变——无幽灵 +1（原实现=[(200,66),(300,36),(300,48)]）
    expect(s.undoStack).toHaveLength(0)
    expect(s.saveStatus).toBe('clean')
  })

  it('②顶点拖放回原位=via 等值短路：拖开再拖回原点松手——零 dirty 零单元', () => {
    layout([{ x: 200, y: 66 }])
    click(hitOf('e1'))
    const handle = host!.querySelector('[data-testid="edge-handle-vertex"]') as HTMLElement
    act(() => {
      handle.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 200, clientY: 66 }))
    })
    docMove(260, 120) // 拖开（workVia 变）
    docMove(200, 66) // 拖回原位（workVia==startVia）
    docUp(200, 66)
    const s = useLineageStore.getState()
    expect(s.saveStatus).toBe('clean') // 零 dirty（原实现=dirty）
    expect(s.undoStack).toHaveLength(0)
    expect(s.queue).toHaveLength(0)
    expect(s.edges[0]?.via).toEqual([{ x: 200, y: 66 }])
  })

  it('④[RRB2] 段拖回原位直测=via 等值短路：拖开再拖回松手——零单元零 dirty+redo 栈保留', () => {
    // via 两点成水平段（y=66：v0(200,66)→v1(300,66)——段=via 内点对 0）；
    // 全链 (140,66)→(200,66)→(300,66)→(412,66)（A 右中/B 左中锚）
    layout([
      { x: 200, y: 66 },
      { x: 300, y: 66 }
    ])
    // 预置 redo 栈（真编辑→undo）：no-op 若误走 beginUnit 必清 redo（对称锚）
    act(() => {
      useLineageStore.getState().setEdgeVia('e1', [
        { x: 200, y: 66 },
        { x: 300, y: 96 }
      ])
    })
    act(() => {
      useLineageStore.getState().undo()
    })
    expect(useLineageStore.getState().redoStack).toHaveLength(1) // redo 在场锚
    click(hitOf('e1')) // selected（段拖入口：命中层 pointerdown）
    act(() => {
      hitOf('e1').dispatchEvent(
        new MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 250, clientY: 66 })
      )
    })
    docMove(250, 46) // 拖开（水平段法向 dy=-20——workVia 变）
    docMove(250, 66) // 拖回原位（dx=dy=0——workVia==startVia）
    docUp(250, 66)
    const s = useLineageStore.getState()
    expect(s.saveStatus).toBe('clean') // 零 dirty（短路失效=dirty）
    expect(s.undoStack).toHaveLength(0) // 零编辑单元（短路失效=1）
    expect(s.queue).toHaveLength(0) // 不入队
    expect(s.redoStack).toHaveLength(1) // no-op 后 redo 栈保留（误 beginUnit 必清）
    expect(s.edges[0]?.via).toEqual([
      { x: 200, y: 66 },
      { x: 300, y: 66 }
    ]) // via 原样
    expect(host!.querySelector('[data-testid="edge-handles"]')).not.toBeNull() // 回 selected
  })

  it('负锚（短路不过火）：同卡换锚（B 左中→B 顶中）仍写入=L 重正交+一编辑单元', () => {
    layout([{ x: 200, y: 66 }])
    click(hitOf('e1'))
    act(() => { endHandle('to').dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0 })) })
    docMove(476, 30) // B 顶中锚（≠拖始锚 B 左中）
    docUp(476, 30)
    const s = useLineageStore.getState()
    expect(s.edges[0]?.toNode).toBe('B') // 同卡不换端
    expect(s.edges[0]?.via).toEqual([
      { x: 200, y: 66 },
      { x: 476, y: 66 }
    ]) // L 重正交：末拐=(新锚.x, 原末拐.y)=(476,66) 追加
    expect(s.undoStack).toHaveLength(1) // 一编辑单元（真编辑不吞）
    expect(s.saveStatus).toBe('dirty')
  })
})
