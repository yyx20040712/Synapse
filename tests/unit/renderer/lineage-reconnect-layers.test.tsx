// @vitest-environment jsdom
/**
 * [F-VISFB-66 单元二] 换端落点分层表余格（§C.3 终裁修正——本端卡三格细分：
 * 异锚合法/同锚无操作/非锚区静默）+对端卡自环+第三卡非锚 toast+空白静默；
 * zoom≠1 hint/move/finish 锚恒等（W-05r2——own 域一致性）。always-active。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub, toastStoreSpy } from '../../utils/api-client-mock'

const stubApi = makeApiStub({
  lineage: { graph: vi.fn(), patchNode: vi.fn(), removeNode: vi.fn(), upsertEdge: vi.fn(), removeEdge: vi.fn(), upsertLineTypes: vi.fn() }
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

function edge(id: string, from: string, to: string, patch: Partial<LineageEdge> = {}): LineageEdge {
  return { id, fromNode: from, toNode: to, label: '', dashed: false, color: '#1e3a8a', createdAt: 't', updatedAt: 't', ...patch }
}

/** 三卡夹具（内容坐标）：A(100,100) B(100,300) C(400,100)——128×72 */
function mockGeometry(zoom = 1): void {
  const content = document.querySelector('.tl-content') as HTMLElement | null
  if (content === null) throw new Error('.tl-content 未渲染')
  Object.defineProperty(content, 'getBoundingClientRect', {
    value: () => ({ left: 0, top: 0, right: 1000 * zoom, bottom: 800 * zoom, width: 1000 * zoom, height: 800 * zoom, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect,
    configurable: true
  })
  const rects: Record<string, { x: number; y: number }> = { A: { x: 100, y: 100 }, B: { x: 100, y: 300 }, C: { x: 400, y: 100 } }
  for (const el of Array.from(content.querySelectorAll('.tl-card[data-node-id]'))) {
    const id = (el as HTMLElement).dataset.nodeId ?? ''
    const base = rects[id] ?? { x: 0, y: 0 }
    Object.defineProperty(el, 'getBoundingClientRect', {
      value: () => ({
        left: base.x * zoom, top: base.y * zoom, right: (base.x + 128) * zoom, bottom: (base.y + 72) * zoom,
        width: 128 * zoom, height: 72 * zoom, x: base.x * zoom, y: base.y * zoom, toJSON: () => ({})
      }) as DOMRect,
      configurable: true
    })
  }
}

let root: Root | null = null
let host: HTMLDivElement | null = null

/** rAF 桩+排空（routeAll 挂 rAF——edge-edit-r2 stubRaf/flushRafs 同型） */
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

function mount3(zoom = 1): void {
  // 缩放态入 view.store（clientToOwnPt ÷s_eff 单源——cardRects/指针同律）
  useLineageViewStore.setState({ zoom })
  stubRaf()
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(<LineageTimeline nodes={[node('A'), node('B'), node('C')]} edges={[edge('e1', 'A', 'B')]} />)
  })
  mockGeometry(zoom)
  flushRafs()
  flushRafs()
}

const req = (sel: string): Element => {
  const el = host?.querySelector(sel)
  if (el === null || el === undefined) throw new Error(`元素未渲染：${sel}`)
  return el
}

const docMove = (x: number, y: number): void => {
  act(() => {
    document.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, cancelable: true, clientX: x, clientY: y }))
  })
}
const docUp = (x: number, y: number): void => {
  act(() => {
    document.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, cancelable: true, clientX: x, clientY: y }))
  })
}

/** 选中边并拖 to 端柄至 (x,y)（调线域：edit+select 态） */
function dragEndTo(x: number, y: number): void {
  const hit = host?.querySelector('.tl-edge-hit[data-edge-id="e1"]')
  if (!(hit instanceof SVGElement)) throw new Error('命中层未渲染')
  act(() => {
    hit.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
  })
  const end = req('[data-testid="edge-handle-end"][data-end="to"]')
  act(() => {
    end.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true, button: 0 }))
  })
  docMove(x, y)
  docUp(x, y)
}

const state = () => useLineageStore.getState()

beforeEach(() => {
  for (const fn of Object.values(stubApi.lineage)) fn.mockReset()
  stubApi.lineage.graph.mockResolvedValue({ ok: true, data: { nodes: [], edges: [] } })
  useLineageStore.setState({
    nodes: [node('A'), node('B'), node('C')],
    edges: [edge('e1', 'A', 'B')],
    lineTypeNames: ['待命名', '待命名', '待命名', '待命名', '待命名', '待命名'],
    status: 'ready', error: null, saveStatus: 'clean', lastWriteError: null,
    queue: [], flushing: false, undoStack: [], redoStack: [], folderId: '__main__'
  })
  useLineageViewStore.setState({
    mode: 'edit', focusSet: [], navCollapsed: false, navWidth: 208,
    tool: 'select', currentLineColor: { solid: LINE_TYPE_COLORS[0], dashed: LINE_TYPE_COLORS[0] },
    paletteFor: null, zoom: 1
  })
  toastStoreSpy.mockClear()
})

afterEach(() => {
  act(() => { root?.unmount() })
  root = null
  host?.remove()
  host = null
  // [回炉 R22] rAF 桩/全局 stub 清理（跨用例零残留）
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('F-VISFB-66·换端落点分层表余格（§C.3 终裁修正版）', () => {
  it('本端卡同锚=无操作取消：零编辑单元零 dirty（via/锚全不动）', () => {
    mount3()
    // to 端原锚=B 顶中 (164,300)——落回原位
    dragEndTo(164, 300)
    expect(state().queue).toHaveLength(0)
    expect(state().undoStack).toHaveLength(0)
    expect(state().saveStatus).toBe('clean')
    expect(state().edges[0]!.via).toBeUndefined()
    expect(state().edges[0]!.toAnchor).toBeUndefined()
  })

  it('对端卡任意落点（锚命中）=自环静默取消：零写入零 toast（store 兜底不达）', () => {
    mount3()
    // to 端拖至 A（from 卡）右中锚 (228,136)
    dragEndTo(228, 136)
    expect(state().queue).toHaveLength(0)
    expect(state().edges[0]!.toNode).toBe('B')
    expect(toastStoreSpy).not.toHaveBeenCalled()
  })

  it('第三卡非锚区=toast「落点未在连接点上」+取消（边不变）', () => {
    mount3()
    dragEndTo(464, 136) // C 卡身中心（膨胀圈内非锚）
    expect(toastStoreSpy).toHaveBeenCalledWith('落点未在连接点上，未创建连线', 'error')
    expect(state().queue).toHaveLength(0)
    expect(state().edges[0]!.toNode).toBe('B')
  })

  it('空白=静默取消（无 toast 零写入）', () => {
    mount3()
    dragEndTo(800, 640)
    expect(toastStoreSpy).not.toHaveBeenCalled()
    expect(state().queue).toHaveLength(0)
    expect(state().edges[0]!.toNode).toBe('B')
  })

  it('第三卡锚=合法换端（duplicate 分层由 store 结果承载——本格换端成功径）', () => {
    mount3()
    dragEndTo(400, 136) // C 左中锚
    expect(state().edges[0]!.toNode).toBe('C')
    expect(state().edges[0]!.toAnchor).toEqual({ side: 'left', slot: 1 })
    expect(state().edges[0]!.via).toBeUndefined()
    expect(state().queue).toHaveLength(1)
  })

  it('[R10] 本端卡非锚区=静默取消（卡身膨胀圈内未命中锚——不 toast 零写入）', () => {
    mount3()
    // to 端原锚=B 顶中 (164,300)；落 B 卡右中锚近旁非锚带？非锚区=卡身锚间空白：
    // 落 (190, 336)——B 左中 (100,336) 与右中 (228,336) 均距 >12=未命中
    dragEndTo(190, 336)
    expect(toastStoreSpy).not.toHaveBeenCalled()
    expect(state().queue).toHaveLength(0)
    expect(state().edges[0]!.toNode).toBe('B')
  })

  it('[R10] 第三卡锚但同端点对已存在→duplicate toast+边不变（取消分支）', () => {
    useLineageStore.setState({
      nodes: [node('A'), node('B'), node('C')],
      edges: [edge('e1', 'A', 'B'), edge('e2', 'A', 'C')]
    })
    mount3()
    dragEndTo(400, 136) // C 左中锚——pair(A,C) 已存在（e2）
    expect(toastStoreSpy).toHaveBeenCalledWith('两节点间已存在连线', 'error')
    expect(state().edges.find((x) => x.id === 'e1')!.toNode).toBe('B') // 边不变
    expect(state().queue).toHaveLength(0)
  })

  it('[R10/R3] 固定端已钉定→保持（换 from 端——to 端钉定现值沿承）', () => {
    useLineageStore.setState({
      nodes: [node('A'), node('B'), node('C')],
      edges: [edge('e1', 'A', 'B', { toAnchor: { side: 'left', slot: 1 } })]
    })
    mount3()
    // 拖 from 端（A 侧）至 C 左中锚
    const hit = host?.querySelector('.tl-edge-hit[data-edge-id="e1"]')
    if (!(hit instanceof SVGElement)) throw new Error('命中层未渲染')
    act(() => {
      hit.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    })
    const end = req('[data-testid="edge-handle-end"][data-end="from"]')
    act(() => {
      end.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true, button: 0 }))
    })
    docMove(401, 135)
    docUp(400, 136)
    const e = state().edges.find((x) => x.id === 'e1')!
    expect(e.fromNode).toBe('C') // 换端
    expect(e.fromAnchor).toEqual({ side: 'left', slot: 1 }) // 被抓端新锚
    expect(e.toAnchor).toEqual({ side: 'left', slot: 1 }) // 固定端钉定保持（R3）
    expect(e.via).toBeUndefined() // 清 via
  })

  it('[R28] 选钉定 manual 边→端柄=钉定锚（polylineOf 钉定优先——手柄位置直证）', () => {
    useLineageStore.setState({
      nodes: [node('A'), node('B'), node('C')],
      edges: [
        edge('e1', 'A', 'B', {
          via: [{ x: 164, y: 200 }, { x: 164, y: 300 }],
          fromAnchor: { side: 'right', slot: 1 }
        })
      ]
    })
    mount3()
    const hit = host?.querySelector('.tl-edge-hit[data-edge-id="e1"]')
    if (!(hit instanceof SVGElement)) throw new Error('命中层未渲染')
    act(() => {
      hit.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    })
    const fromHandle = req('[data-testid="edge-handle-end"][data-end="from"]') as SVGCircleElement
    // 钉定锚=A right/1=(228,136)（selectAnchor 派生=bottom/1=(164,172)——判别位）
    expect(Number(fromHandle.getAttribute('cx'))).toBe(228)
    expect(Number(fromHandle.getAttribute('cy'))).toBe(136)
  })
})

describe('F-VISFB-66·zoom≠1 锚恒等（W-05r2——own 域一致性：hint/move/finish 同函数同参）', () => {
  const docHover = (x: number, y: number): void => {
    act(() => {
      document.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, cancelable: true, clientX: x, clientY: y }))
    })
  }

  it('zoom=1.5：hint 命中/起拖命中/落边双锚三面恒等（同锚身份）', () => {
    mount3(1.5)
    act(() => {
      useLineageViewStore.getState().toggleLineTool('solid')
    })
    // 屏幕域=own×1.5：B 右中 own(228,336)→屏幕(342,504)
    docHover(341, 504)
    const hint = req('[data-testid="draw-anchor-hint"] circle.snapped')
    expect(Number(hint.getAttribute('cx'))).toBe(228) // own 域（÷s_eff 换算后）
    expect(Number(hint.getAttribute('cy'))).toBe(336)
    // 起拖 B 右中+落 C 左中 own(400,136)→屏幕(600,204)（B→C 非在场对——查重不拦）
    const content = req('.tl-content')
    act(() => {
      content.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true, clientX: 342, clientY: 504, button: 0 }))
    })
    docMove(601, 203)
    docUp(600, 204)
    const e = state().edges.find((x) => x.fromNode === 'B' && x.toNode === 'C')
    expect(e).toBeDefined()
    expect(e!.fromAnchor).toEqual({ side: 'right', slot: 1 }) // 与 zoom=1 同锚身份
    expect(e!.toAnchor).toEqual({ side: 'left', slot: 1 })
  })
})
describe('F-VISFB-66·[回炉 S2] 光标真跟随方向性（中带按下→移入触发区→滚→移回中带→停）', () => {
  /** jsdom rAF 桩+时间推进（驱动 managed 泵帧） */
  function stubClock(): { advance(ms: number): void } {
    let rafCb: (() => void) | null = null
    vi.stubGlobal('requestAnimationFrame', (cb: () => void): number => {
      rafCb = cb
      return 1
    })
    return {
      advance(ms: number): void {
        for (let i = 0; i < Math.ceil(ms / 16); i++) {
          const cb = rafCb
          rafCb = null
          cb?.()
        }
      }
    }
  }

  it('调线换端会话（managed 泵）：中带按下（无滚）→move 入容器下带（tick 滚动推进）→move 回中带（停）', async () => {
    mount3()
    const clock = stubClock() // mount 后覆盖 rAF 桩（泵启动时注册到时钟桩）
    const hit = host?.querySelector('.tl-edge-hit[data-edge-id="e1"]')
    if (!(hit instanceof SVGElement)) throw new Error('命中层未渲染')
    act(() => {
      hit.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    })
    // 容器 scrollTop 模型（可滚面）
    let top = 0
    const tlEl = host?.closest('.timeline') ?? document.querySelector('.timeline')
    void tlEl
    const timeline = host?.querySelector('.timeline') as HTMLElement & { scrollTop: number }
    Object.defineProperty(timeline, 'clientHeight', { value: 600, configurable: true })
    Object.defineProperty(timeline, 'getBoundingClientRect', {
      value: () => ({ top: 0, bottom: 600, left: 0, right: 800, width: 800, height: 600, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect,
      configurable: true
    })
    Object.defineProperty(timeline, 'scrollTop', {
      get: () => top,
      set: (v: number) => {
        top = Math.max(0, Math.min(1000, v))
      },
      configurable: true
    })
    const end = req('[data-testid="edge-handle-end"][data-end="from"]')
    const endBox = end.getBoundingClientRect()
    // ① 中带按下（clientY=300——中带）：数帧零滚
    act(() => {
      end.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true, button: 0, clientX: endBox.x + 2, clientY: 300 }))
    })
    clock.advance(200)
    expect(top).toBe(0) // 中带=不滚（S2 方向性起点）
    // ② move 入下带（clientY=580）：泵滚动推进
    docMove(100, 580)
    clock.advance(200)
    expect(top).toBeGreaterThan(0) // 触发区=滚（真跟随——lastClient 更新驱动）
    // ③ move 回中带（clientY=300）：停止（不再增长）
    const topAtMid = top
    docMove(100, 300)
    clock.advance(200)
    expect(top).toBe(topAtMid) // 中带=停
    docUp(100, 300)
  })

  it('笔记柄拖会话（managed 泵）：同方向性三分段', async () => {
    mount3()
    const clock = stubClock()
    const content = req('.tl-content')
    const cb = content.getBoundingClientRect()
    act(() => {
      content.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: cb.x + 500, clientY: cb.y + 200 }))
    })
    // 简化：直接经 store 建笔记再取柄
    act(() => {
      useLineageStore.getState().addFloatingNote(500, 200, 'S2 笔记')
    })
    const timeline = host?.querySelector('.timeline') as HTMLElement & { scrollTop: number }
    let top = 0
    Object.defineProperty(timeline, 'clientHeight', { value: 600, configurable: true })
    Object.defineProperty(timeline, 'getBoundingClientRect', {
      value: () => ({ top: 0, bottom: 600, left: 0, right: 800, width: 800, height: 600, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect,
      configurable: true
    })
    Object.defineProperty(timeline, 'scrollTop', {
      get: () => top,
      set: (v: number) => {
        top = Math.max(0, Math.min(1000, v))
      },
      configurable: true
    })
    const grip = host?.querySelector('.tl-note-grip') as HTMLElement | null
    if (grip === null) throw new Error('笔记柄未渲染')
    const gb = grip.getBoundingClientRect()
    if (useLineageStore.getState().floatingNotes[0] === undefined) throw new Error('笔记不在场')
    act(() => {
      grip.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true, button: 0, clientX: gb.x + 2, clientY: 300 }))
    })
    // ① 中带按下：零滚
    clock.advance(200)
    expect(top).toBe(0)
    // ② move 入下带：滚
    docMove(200, 580)
    clock.advance(200)
    expect(top).toBeGreaterThan(0)
    // ③ 回中带：停
    const topAtMid = top
    docMove(200, 300)
    clock.advance(200)
    expect(top).toBe(topAtMid)
    docUp(200, 300)
  })
})

describe('F-VISFB-66·[定点修] flushing 窗换端 busy 补格（d1 W-r3-07——edge-edit 收尾面）', () => {
  it('saving/flushing 窗换端=business busy 静默：零 toast+边不变+零入队', () => {
    mount3()
    useLineageStore.setState({ flushing: true })
    dragEndTo(400, 136) // C 左中锚（非 flushing 态=合法换端格——本格须静默吞）
    expect(toastStoreSpy, 'busy=静默（非 duplicate 误报）').not.toHaveBeenCalled()
    expect(state().edges[0]!.toNode).toBe('B')
    expect(state().queue).toHaveLength(0)
  })
})
