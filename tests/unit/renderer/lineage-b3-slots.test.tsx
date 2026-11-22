// @vitest-environment jsdom
/**
 * [B3 设计先行] G 空槽 occupancy mask 红测试（设计稿
 * docs/design/2026-11-22_b3-drag-frame-g-g2-design.md §6——设计稿先于实现：
 * 本件全部用例对当前 src 为红，实现批（plan-v1.md §5 B3 commit C
 * 「G/G2 视觉」）后转绿，测试正文零改）。
 *
 * ── 语义基线（plan-v1 §5.2 + summary §11 终裁 5「物理空位+有限网格」）──
 * 候选 faded 槽=**末行未占 cell 全画**；被预览卡占用的 cell **零 faded**；
 * 当前插入占位槽=**唯一加深槽**（新类 `target`）；occupancy/目标位置/松手
 * 落点同源（partitionRows/positionOf/candidateSlotAt/insertIndexFromGrid
 * ——card-drag-grid.ts/capacity.ts 数学零改，仅消费面换 mask）。
 * 现行方案（drag-slot-candidates.tsx:27-41「全 cell 0..total−1 除 insertIdx
 * 逐格画、多数被卡覆盖+提层 z3 兜可见」）整体退役=本件红因。
 *
 * 几何定值：injectW 752→归一化 W=728→N=4/M=3（capacity 四锚同系）。
 * cell k 坐标=candidateSlotAt(k,728)（FRAME_PAD_LEFT 12/FRAME_PAD_TOP 38/
 * PITCH_X 200/奇行相位 100）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { LineageNode } from '../../../src/shared/models/lineage'
import { LineageTimeline } from '../../../src/renderer/features/lineage/LineageTimeline'
import { candidateSlotAt } from '../../../src/renderer/features/lineage/card-drag-grid'
import { useLineageViewStore } from '../../../src/renderer/features/lineage/lineage-view.store'

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

let root: Root | null = null
let host: HTMLDivElement | null = null
const q = (sel: string): Element | null => host?.querySelector(sel) ?? null
const req = (sel: string): Element => {
  const el = q(sel)
  if (el === null) throw new Error(`元素未渲染：${sel}`)
  return el
}
const cardOf = (id: string): HTMLElement => req(`.tl-card[data-node-id="${id}"]`) as HTMLElement

const reorder = vi.fn()
const onNodeClick = vi.fn()

function mount(nodes: LineageNode[]): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(
      <LineageTimeline nodes={nodes} edges={[]} onNodeClick={onNodeClick} onReorderMonthSlots={reorder} />
    )
  })
  act(() => {
    useLineageViewStore.getState().setMode('edit')
  })
}

/** W 注入（lineage-drag-session-grid 同法：frame inline width→挂载帧同步首读；
 *  752−pad24=归一化 728→N=4/M=3） */
const injectW = async (nodes: LineageNode[], w: number): Promise<void> => {
  req('.month-frame').setAttribute('style', `width: ${w}px; padding-left: 12px; padding-right: 12px; border-left-width: 0px; border-right-width: 0px`)
  await act(async () => {
    root?.render(
      <LineageTimeline nodes={nodes.map((n) => ({ ...n }))} edges={[]} onNodeClick={onNodeClick} onReorderMonthSlots={reorder} />
    )
  })
}

const pDown = (el: Element, x: number, y: number): void => {
  act(() => {
    el.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: x, clientY: y }))
  })
}
const pMove = (x: number, y: number): void => {
  act(() => {
    document.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: x, clientY: y }))
  })
}

function stubFrame(x: number, y: number, w = 600, h = 200): void {
  vi.spyOn(req('.month-frame'), 'getBoundingClientRect').mockReturnValue({
    left: x, top: y, right: x + w, bottom: y + h, width: w, height: h, x, y,
    toJSON: () => ({})
  } as unknown as DOMRect)
}

// ── rAF 捕获队列（lineage-b3-frame 同族）：flushRaf=冲洗一帧（实现批后
//    move 批次化——现行同步路径下 flush 为无害冲洗，两态共用） ──
let rafs: FrameRequestCallback[] = []
beforeEach(() => {
  rafs = []
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback): number => {
    rafs.push(cb)
    return rafs.length
  })
  vi.stubGlobal('cancelAnimationFrame', () => undefined)
  reorder.mockClear()
  onNodeClick.mockClear()
  useLineageViewStore.setState({ mode: 'browse', focusSet: [], navCollapsed: false, navWidth: 208 })
})
afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const flushRaf = (): void => {
  act(() => {
    rafs.splice(0).forEach((cb) => {
      cb(performance.now())
    })
  })
}

describe('[B3 红测试] G 空槽 occupancy mask（对当前 src 全红）', () => {
  it('M1 被占格零 faded+末行未占全画：3 卡 W=728（cap4/3）插位 1——候选恰=cell3（612,38）；红因=现行占用格 {0,2} 在画', async () => {
    const nodes = [node('A'), node('B'), node('C')]
    mount(nodes)
    await injectW(nodes, 752)
    stubFrame(0, 0)
    pDown(cardOf('A'), 60, 40)
    pMove(66, 44)
    flushRaf() // 激活
    pMove(277, 40) // B（cell1）中心 276 右 1px → insertIdx=1
    flushRaf()
    // 预览布局：kids=[B, 占位@1, C]→cells {0,1,2} 全占；末行（row0 cap4）未占=cell3
    const cands = [...host!.querySelectorAll('.drag-slot.cand')] as HTMLElement[]
    // 红：现行全 cell 画（k∈{0,2}——两格均被 B/C 占用）
    expect(cands.length).toBe(1)
    const want = candidateSlotAt(3, 728)
    expect(cands[0]?.style.left).toBe(`${want.x}px`)
    expect(cands[0]?.style.top).toBe(`${want.y}px`)
  })

  it('M2 唯一加深槽：当前插入占位槽挂 target 类且唯一、候选零 target（红因=现行无加深类——文案「置 入」锚沿承）', async () => {
    const nodes = [node('A'), node('B'), node('C')]
    mount(nodes)
    await injectW(nodes, 752)
    stubFrame(0, 0)
    pDown(cardOf('A'), 60, 40)
    pMove(66, 44)
    flushRaf()
    pMove(277, 40)
    flushRaf()
    const ph = req('.drag-slot:not(.cand)')
    // 红：现行占位槽类面={drag-slot}（无加深）
    expect(ph.classList.contains('target')).toBe(true)
    expect(host!.querySelectorAll('.drag-slot.target').length).toBe(1)
    const cands = [...host!.querySelectorAll('.drag-slot.cand')]
    expect(cands.some((c) => c.classList.contains('target'))).toBe(false)
    expect(ph.textContent).toBe('置 入')
  })

  it('M5 下拉带有限网格：4 卡 W=728 行满（[4]）——band 插位 3 时预览 cell 全占、候选=0（红因=现行 3 个占用格 faded 在画）', async () => {
    const nodes = [node('A'), node('B'), node('C'), node('D')]
    mount(nodes)
    await injectW(nodes, 752)
    stubFrame(0, 0, 600, 400)
    pDown(cardOf('A'), 60, 40)
    pMove(66, 44)
    flushRaf()
    pMove(240, 440) // 底缘下拉带（冻结 bottom0=400；y=440∈(400,482]）→ extend 组末
    flushRaf()
    // 下拉带触发语义沿承（现状绿面——守卫）
    expect(req('.month-frame').classList.contains('stretch')).toBe(true)
    const ph = req('.drag-slot:not(.cand)')
    expect(ph.previousElementSibling?.isEqualNode(cardOf('D'))).toBe(true) // 组末（现状绿面）
    // 预览布局：kids=[B,C,D,占位@3]→partition(4,728)=[4] 行满——cells 0..3 全占
    // 红：现行全 cell 画（k∈{0,1,2}——B/C/D 占用格全部在画）
    expect(host!.querySelectorAll('.drag-slot.cand').length).toBe(0)
  })
})
