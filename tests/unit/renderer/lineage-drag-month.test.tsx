// @vitest-environment jsdom
/**
 * [F-LGRAPH-01②U6] 拖拽分屏物理域限本月 —— 首红测试组（TDD）。
 *
 * 设计真相源=mockup §3.5+退役行 7+挂账②③：
 * - 候选占位：拖动中源月框内实时渲染虚线槽——**多候选预览**（每插入空位一
 *   槽；最近空位=实态 accent-soft 底「置入」、其余=faded 0.35——mockup S6②
 *   绝对定位槽族，不占 flex 布局）。
 * - 月框自动下拉：拖到框底缘以下（x 带内）=框高动画下拉（.38s 曲线承载）
 *   腾新行空位+插位=组末。
 * - 限本月=物理域：跨月回弹归 lineage-card-drag.test（本组不重复）；无 toast
 *   零残留（grep 面）。
 * - 挂账③：MonthPop 开层后切出 edit 模式=关闭（下降沿对称化——Esc/外点/切
 *   模式三径统一）。
 * always-active 裸 describe。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
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

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
  vi.restoreAllMocks()
  reorder.mockClear()
  useLineageViewStore.setState({ mode: 'browse', focusSet: [], tool: 'select' })
})

describe('U6 候选占位与月框下拉', () => {
  it('多候选预览：框内拖动=每插入空位一槽（n+1 面）——最近空位=实态「置 入」、其余 faded（绝对定位不占 flex 槽）', () => {
    mount([node('A'), node('B'), node('C')])
    const frame = host!.querySelector('.month-frame') as HTMLElement
    stubRect(frame, 0, 0, 600, 200)
    stubRect(host!.querySelector('.tl-card[data-node-id="A"]') as HTMLElement, 12, 30)
    stubRect(host!.querySelector('.tl-card[data-node-id="B"]') as HTMLElement, 160, 30)
    stubRect(host!.querySelector('.tl-card[data-node-id="C"]') as HTMLElement, 308, 30)
    pDown(host!.querySelector('.tl-card[data-node-id="A"]') as HTMLElement, 60, 60)
    pMove(66, 64) // 激活
    // 候选槽族：实态槽（in-flow .drag-slot）+ 绝对定位 faded 候选（.drag-slot.cand）
    const active = host!.querySelector('.drag-slot:not(.faded)')
    expect(active?.textContent).toBe('置 入')
    const cands = [...host!.querySelectorAll('.drag-slot.cand')]
    // 3 卡组（拖卡除外 2 卡）→ 插入空位 0..2 共 3 面；实态占 1 面 → faded 2 面
    expect(cands.length).toBe(2)
    expect(cands.every((c) => c.classList.contains('faded'))).toBe(true)
    // faded 候选=绝对定位（不占 flex 布局——mockup S6② 槽族形态）
    expect(cands[0]!.classList.contains('cand')).toBe(true)
  })

  it('月框自动下拉：拖到框底缘以下（x 带内）=框挂 .stretch（.38s 曲线下拉腾新行）+插位=组末', () => {
    mount([node('A'), node('B')])
    const frame = host!.querySelector('.month-frame') as HTMLElement
    stubRect(frame, 0, 0, 600, 200)
    stubRect(host!.querySelector('.tl-card[data-node-id="A"]') as HTMLElement, 12, 30)
    stubRect(host!.querySelector('.tl-card[data-node-id="B"]') as HTMLElement, 160, 30)
    pDown(host!.querySelector('.tl-card[data-node-id="A"]') as HTMLElement, 60, 60)
    pMove(66, 64)
    expect(frame.classList.contains('stretch')).toBe(false)
    pMove(100, 240) // 框底缘以下（y=240 > 200，x 带内）
    expect(frame.classList.contains('stretch')).toBe(true)
    // 插位=组末（新行空位——槽位=B 之后=其余卡尾）
    const active = host!.querySelector('.drag-slot:not(.faded)')
    expect(active?.previousElementSibling?.isEqualNode(host!.querySelector('.tl-card[data-node-id="B"]'))).toBe(true)
    pUp(100, 240)
    const end = host!.querySelector('.tl-card[data-node-id="A"]') as HTMLElement
    act(() => { end.dispatchEvent(Object.assign(new Event('transitionend'), { propertyName: 'left' })) })
    expect(reorder).toHaveBeenCalledWith(['B', 'A'])
    // 松手清场=stretch 摘（框高回落）
    expect(frame.classList.contains('stretch')).toBe(false)
  })

  it('挂账③：MonthPop 开层后切出 edit 模式=关闭（下降沿对称化——Esc/外点/切模式统一关闭路径）', () => {
    mount([node('A')])
    const card = host!.querySelector('.tl-card[data-node-id="A"]') as HTMLElement
    const ym = card.querySelector('[data-testid="card-ym"]') as HTMLElement
    act(() => { ym.dispatchEvent(new MouseEvent('click', { bubbles: true })) })
    expect(host!.querySelector('[data-testid="month-pop"]')).not.toBeNull()
    act(() => { useLineageViewStore.getState().setMode('browse') })
    expect(host!.querySelector('[data-testid="month-pop"]')).toBeNull()
  })
})
