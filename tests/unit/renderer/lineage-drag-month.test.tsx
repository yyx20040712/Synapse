// @vitest-environment jsdom
/**
 * [F-LGRAPH-01②U6] 拖拽分屏物理域限本月 —— 首红测试组（TDD）。
 *
 * 设计真相源=mockup §3.5+退役行 7+挂账②③（B3 §6 occupancy mask 起候选面
 * 改述）：
 * - 候选占位：拖动中源月框内实时渲染空槽——**occupancy mask**（B3 §6：候选
 *   =candidateCells 末行未占 cell 全画=物理追加位提示；被占格零 faded；实态
 *   槽=accent-soft 底「置 入」in-flow，候选=faded 绝对定位槽族不占 flex
 *   布局——mockup S6② 槽族形态沿承）。
 * - 月框自动下拉：拖到框底缘以下（x 带内）=框高动画下拉（.38s 曲线承载）
 *   腾新行空位+插位=组末。
 * - 限本月=物理域：跨月回弹归 lineage-card-drag.test（本组不重复）；无 toast
 *   零残留（grep 面）。
 * - [F-UIRES-03 C3] 挂账③例（改月弹层切出 edit 关闭）随改月链退役删除
 *   （INV-107）；本件收窄=保留面（候选槽/下拉带）两例。
 * always-active 裸 describe。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { LineageNode } from '../../../src/shared/models/lineage'
import { LineageTimeline } from '../../../src/renderer/features/lineage/LineageTimeline'
import { useLineageViewStore } from '../../../src/renderer/features/lineage/lineage-view.store'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

function node(id: string, patch: Partial<LineageNode> = {}): LineageNode {
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
    updatedAt: 't',
    ...patch
  }
}

let root: Root | null = null
let host: HTMLDivElement | null = null
const reorder = vi.fn()

function mount(nodes: LineageNode[]): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(<LineageTimeline nodes={nodes} edges={[]} onReorderMonthSlots={reorder} />)
  })
  act(() => {
    useLineageViewStore.setState({ mode: 'edit' })
  })
}

/** W 注入（lineage-drag-session-grid 同法：frame inline width→挂载帧同步首
 *  读；[B3 §9] mask 面单测须 injectW——unmeasured（jsdom 缺省）候选=∅） */
const injectW = async (nodes: LineageNode[], w: number): Promise<void> => {
  ;(host!.querySelector('.month-frame') as HTMLElement).setAttribute(
    'style',
    `width: ${w}px; padding-left: 12px; padding-right: 12px; border-left-width: 0px; border-right-width: 0px`
  )
  await act(async () => {
    root?.render(<LineageTimeline nodes={nodes.map((n) => ({ ...n }))} edges={[]} onReorderMonthSlots={reorder} />)
  })
}

function stubRect(el: Element, x: number, y: number, w = 128, h = 72): void {
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
    left: x, top: y, right: x + w, bottom: y + h, width: w, height: h, x, y,
    toJSON: () => ({})
  } as unknown as DOMRect)
}

const pDown = (el: Element, x: number, y: number): void => {
  act(() => { el.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: x, clientY: y })) })
}
const pMove = (x: number, y: number): void => {
  act(() => { document.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: x, clientY: y })) })
}
const pUp = (x: number, y: number): void => {
  act(() => { document.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX: x, clientY: y })) })
}

let rafs: FrameRequestCallback[] = []
beforeEach(() => {
  // [B3 §9 新增行] rAF 捕获队列（b3 守卫同族）：pMove 后即时断言先 flushRaf（两态兼容冲洗）
  rafs = []
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback): number => {
    rafs.push(cb)
    return rafs.length
  })
  vi.stubGlobal('cancelAnimationFrame', () => undefined)
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  reorder.mockClear()
  useLineageViewStore.setState({ mode: 'browse', focusSet: [], tool: 'select' })
})

const flushRaf = (): void => {
  act(() => {
    rafs.splice(0).forEach((cb) => {
      cb(performance.now())
    })
  })
}

describe('U6 候选占位与月框下拉', () => {
  it('候选 mask（B3 §6/[B3 §9 injectW 取式申报]）：末行未占 cell 全画——3 卡 W 注入 752（归一化 728 cap4）候选=[cell3] faded 绝对定位；实态槽=「置 入」', async () => {
    const nodes = [node('A'), node('B'), node('C')]
    mount(nodes)
    await injectW(nodes, 752)
    const frame = host!.querySelector('.month-frame') as HTMLElement
    stubRect(frame, 0, 0, 600, 200)
    stubRect(host!.querySelector('.tl-card[data-node-id="A"]') as HTMLElement, 12, 30)
    stubRect(host!.querySelector('.tl-card[data-node-id="B"]') as HTMLElement, 160, 30)
    stubRect(host!.querySelector('.tl-card[data-node-id="C"]') as HTMLElement, 308, 30)
    pDown(host!.querySelector('.tl-card[data-node-id="A"]') as HTMLElement, 60, 60)
    pMove(66, 64) // 激活
    flushRaf() // [B3 §9] 帧批激活
    // 候选槽族：实态槽（in-flow .drag-slot.target——overFrame=true）+ 绝对
    // 定位 faded 候选（.drag-slot.cand）
    const active = host!.querySelector('.drag-slot:not(.faded)')
    expect(active?.textContent).toBe('置 入')
    const cands = [...host!.querySelectorAll('.drag-slot.cand')] as HTMLElement[]
    // [B3 §9 断言迁移授权] mask 值（取式=injectW 注入——unmeasured W 下
    // mask=∅ 为降级面，注入保留 faded 候选渲染形态判别力）：预览行集合=
    // partitionRows(3,728)=[3]、末行 cap4 空 1 格→候选=[3]（旧 n+1 面=2 退役）
    expect(cands.length).toBe(1)
    expect(cands.every((c) => c.classList.contains('faded'))).toBe(true)
    // faded 候选=绝对定位（不占 flex 布局——mockup S6② 槽族形态）
    expect(cands[0]!.classList.contains('cand')).toBe(true)
    expect(cands[0]!.style.position).toBe('absolute')
  })

  it('月框自动下拉：拖到框底缘以下（x 带内）=框挂 .stretch（.38s 曲线下拉腾新行）+插位=组末', () => {
    mount([node('A'), node('B')])
    const frame = host!.querySelector('.month-frame') as HTMLElement
    stubRect(frame, 0, 0, 600, 200)
    stubRect(host!.querySelector('.tl-card[data-node-id="A"]') as HTMLElement, 12, 30)
    stubRect(host!.querySelector('.tl-card[data-node-id="B"]') as HTMLElement, 160, 30)
    pDown(host!.querySelector('.tl-card[data-node-id="A"]') as HTMLElement, 60, 60)
    pMove(66, 64)
    flushRaf() // [B3 §9] 帧批激活
    expect(frame.classList.contains('stretch')).toBe(false)
    pMove(100, 240) // 框底缘以下（y=240 > 200，x 带内）
    flushRaf() // [B3 §9] 指针批（入带+组末插位）
    expect(frame.classList.contains('stretch')).toBe(true)
    // 插位=组末（新行空位——槽位=B 之后=其余卡尾）
    const active = host!.querySelector('.drag-slot:not(.faded)')
    expect(active?.previousElementSibling?.isEqualNode(host!.querySelector('.tl-card[data-node-id="B"]'))).toBe(true)
    pUp(100, 240)
    const end = host!.querySelector('.tl-card[data-node-id="A"]') as HTMLElement
    // [B3 §9 断言迁移] propertyName 'left'→'translate'（飞行承载键 translate 化）
    act(() => { end.dispatchEvent(Object.assign(new Event('transitionend'), { propertyName: 'translate' })) })
    expect(reorder).toHaveBeenCalledWith(['B', 'A'])
    // 松手清场=stretch 摘（框高回落）
    expect(frame.classList.contains('stretch')).toBe(false)
  })
})
