// @vitest-environment jsdom
/**
 * [F-SLOTGRID-01 U3] card-drag-session 算术落点接线测试（INV-111 消费面——
 * 先红后绿 always-active；纯函数面=lineage-drag-grid.test.ts 本件不重复）。
 *
 * 锁定面（简报预裁决）：
 * - D1/D3：插入位=insertIndexFromGrid（含源 rowCounts——源卡占位保留语义）；
 * - D2：指针→月框 padding-box 换算（frame gBCR 相对差÷z−computed border——
 *   border 内缘起算，非零框原点+1.6px 边框双锚）；
 * - D4：settle 前双 end（pointerup+pointercancel 同帧）不产生重复 settle；
 * - D6：推挤滞回治理——同坐标重复 pointermove 插入位恒稳（判定面不随占位
 *   槽腾位漂移）。
 * W 注入=frame inline width+全 props 重渲染（U1 奇行用例同法）；卡 rect 不
 * stub（算术落点零 rect 依赖——rect 桩在场反而掩盖接线错误）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { LineageNode } from '../../../src/shared/models/lineage'
import { LineageTimeline } from '../../../src/renderer/features/lineage/LineageTimeline'
import { candidateSlotAt } from '../../../src/renderer/features/lineage/card-drag-grid'
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

/** W 注入（frame inline width→会话/computed 同源读+渲染 partitionRows 双消费） */
const injectW = async (nodes: LineageNode[], w: number): Promise<void> => {
  req('.month-frame').setAttribute('style', `width: ${w}px`)
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
const pUp = (x: number, y: number): void => {
  act(() => {
    document.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX: x, clientY: y }))
  })
}
const fireEnd = (el: Element): void => {
  act(() => {
    el.dispatchEvent(Object.assign(new Event('transitionend'), { propertyName: 'left' }))
  })
}

/** 框 rect 定值（卡不 stub——算术落点零 rect 依赖面） */
function stubFrame(x: number, y: number, w = 600, h = 200): void {
  vi.spyOn(req('.month-frame'), 'getBoundingClientRect').mockReturnValue({
    left: x, top: y, right: x + w, bottom: y + h, width: w, height: h, x, y,
    toJSON: () => ({})
  } as unknown as DOMRect)
}

beforeEach(() => {
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
  vi.restoreAllMocks()
})

describe('[F-SLOTGRID-01 U3] 算术落点接线（INV-111 消费面——含源语义/padding-box/滞回/双 end）', () => {
  it('S1 同行算术命中：W=570.4 三卡单行——指针 B 中心后（277,40）→插 B 后 C 前（非 rect 追加位）', async () => {
    const nodes = [node('A'), node('B'), node('C')]
    mount(nodes)
    await injectW(nodes, 570.4)
    stubFrame(0, 0)
    pDown(cardOf('A'), 60, 40)
    pMove(66, 44) // 激活
    pMove(277, 40) // 网格 cell1（B）中心 276 右侧 1px → after B → p=2 → insertIdx=1
    const ph = req('.drag-slot:not(.cand)')
    expect(ph.nextElementSibling?.isEqualNode(cardOf('C'))).toBe(true)
    expect(ph.previousElementSibling?.isEqualNode(cardOf('B'))).toBe(true)
    pUp(277, 40)
    fireEnd(cardOf('A'))
    expect(reorder).toHaveBeenCalledTimes(1)
    expect(reorder).toHaveBeenCalledWith(['B', 'A', 'C'])
  })

  it('S2 双占末行（D3 含源 rowCounts）：四卡 rows [3,1]——拖末行 D 落 row0 cell1 前=插 B 后（含源数学非实时腾位）', async () => {
    const nodes = [node('A'), node('B'), node('C'), node('D')]
    mount(nodes)
    await injectW(nodes, 570.4) // partition(4)=[3,1]：D=奇行末行
    stubFrame(0, 0, 600, 400)
    pDown(cardOf('D'), 176, 198) // D 中心（row1 cell0=112..240 中心 176）
    pMove(182, 202) // 激活
    pMove(275, 40) // row0 cell1（B）中心 276 左侧 1px → before B → p=1 → insertIdx=1
    const ph = req('.drag-slot:not(.cand)')
    expect(ph.nextElementSibling?.isEqualNode(cardOf('B'))).toBe(true)
    pUp(275, 40)
    fireEnd(cardOf('D'))
    expect(reorder).toHaveBeenCalledWith(['A', 'D', 'B', 'C'])
    // 源自身槽稳定（含源残行）：指针回 D 原位中心前（175,192）→ insertIdx=3=srcIdx → 序不变零写
    pDown(cardOf('D'), 176, 198)
    pMove(182, 202)
    pMove(175, 192)
    pUp(175, 192)
    fireEnd(cardOf('D'))
    expect(reorder).toHaveBeenCalledTimes(1)
  })

  it('S3 settle 前双 end 同帧（D4）：pointerup+pointercancel 单帧连发（异坐标框外）→单次 settle 不改写落位', () => {
    mount([node('A'), node('B')])
    stubFrame(0, 0)
    pDown(cardOf('A'), 60, 40)
    pMove(66, 44)
    pMove(300, 40) // B 中心 276 右侧 → insertIdx=1
    // 同帧双 end（监听摘除〔settle effect cleanup〕发生前——真机 up/cancel
    // 连发窗口的 jsdom 等价形：单 act 内连发两事件）：首 end 换代会话（null
    // 守卫），次 end（框外坐标——若会话未换代将按回弹 srcIdx 改写落位序=红）
    act(() => {
      document.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX: 300, clientY: 40 }))
      document.dispatchEvent(new MouseEvent('pointercancel', { bubbles: true, clientX: 9999, clientY: 40 }))
    })
    expect(q('.drag-slot')).toBeNull()
    const order = [...req('.month-frame').querySelectorAll('.tl-card')].map(
      (c) => (c as HTMLElement).dataset.nodeId
    )
    expect(order).toEqual(['B', 'A'])
    fireEnd(cardOf('A'))
    fireEnd(cardOf('A')) // 二次 transitionend=幂等面（事件/兜底不双写）
    expect(reorder).toHaveBeenCalledTimes(1)
    expect(reorder).toHaveBeenCalledWith(['B', 'A'])
  })

  it('S4 滞回幂等（D6）：同坐标重复 pointermove 插入位恒稳（占位槽腾位不反噬判定面）', async () => {
    const nodes = [node('A'), node('B'), node('C')]
    mount(nodes)
    await injectW(nodes, 570.4)
    stubFrame(0, 0)
    pDown(cardOf('A'), 60, 40)
    pMove(66, 44)
    pMove(350, 40) // cell1 中心 276 右侧 → insertIdx=1
    let ph = req('.drag-slot:not(.cand)')
    const first = { prev: ph.previousElementSibling, next: ph.nextElementSibling }
    pMove(350, 40) // 同坐标重复（占位槽已腾位——算术判定面恒稳）
    ph = req('.drag-slot:not(.cand)')
    expect(ph.previousElementSibling?.isEqualNode(first.prev ?? null)).toBe(true)
    expect(ph.nextElementSibling?.isEqualNode(first.next ?? null)).toBe(true)
    pUp(350, 40)
    fireEnd(cardOf('A'))
    expect(reorder).toHaveBeenCalledWith(['B', 'A', 'C'])
  })

  it('S5 padding-box 换算（D2）：非零框原点+1.6px 边框——指针=B 中心−0.4+1.6 边差→仍前侧（插 B 前=原位零写）', async () => {
    const nodes = [node('A'), node('B'), node('C')]
    mount(nodes)
    await injectW(nodes, 570.4)
    // 框 origin=(200,100)+边框 1.6（computed border 内缘起算——zoom=1 会话缺省档）
    stubFrame(200, 100)
    const gcs = window.getComputedStyle
    vi.spyOn(window, 'getComputedStyle').mockImplementation(((el: Element, pseudo?: string | null) => {
      const real = gcs(el, pseudo)
      if (el === req('.month-frame')) {
        return {
          width: real.width,
          borderLeftWidth: '1.6px',
          borderTopWidth: '1.6px'
        } as unknown as CSSStyleDeclaration
      }
      return real
    }) as typeof window.getComputedStyle)
    pDown(cardOf('A'), 260, 140)
    pMove(266, 144) // 激活
    // client=(200+276.6,100+40) → padding-box px=276.6−1.6=275=B 中心 276 前侧 1px
    pMove(476.6, 140)
    const ph = req('.drag-slot:not(.cand)')
    expect(ph.nextElementSibling?.isEqualNode(cardOf('B'))).toBe(true)
    pUp(476.6, 140)
    fireEnd(cardOf('A'))
    expect(reorder).not.toHaveBeenCalled() // insertIdx=0=srcIdx → 序不变零写
  })

  it('S6 候选阵列=算术网格（D8/F-DRAGVIS-01）：total-1 槽逐格=candidateSlotAt 同源（insertIdx 格=实态槽在流不重复）', async () => {
    const nodes = [node('A'), node('B'), node('C')]
    mount(nodes)
    await injectW(nodes, 570.4)
    stubFrame(0, 0)
    pDown(cardOf('A'), 60, 40)
    pMove(66, 44)
    pMove(277, 40) // insertIdx=1（B 后）
    const cands = [...host!.querySelectorAll('.drag-slot.cand')] as HTMLElement[]
    expect(cands.length).toBe(2) // total=3 − 实态槽 1
    expect(cands.every((c) => c.classList.contains('faded'))).toBe(true)
    // 逐格断言：cell {0,2}（cell1=insertIdx 实态槽占位）——capacity 同源期望
    const expected = [candidateSlotAt(0, 570.4), candidateSlotAt(2, 570.4)]
    cands.forEach((c) => {
      const hit = expected.find(
        (e) => c.style.left === `${e.x}px` && c.style.top === `${e.y}px`
      )
      expect(hit, `候选槽 (${c.style.left},${c.style.top}) 未命中算术网格 cell 集 ${JSON.stringify(expected)}`).toBeDefined()
    })
    pUp(277, 40)
    fireEnd(cardOf('A'))
    expect(reorder).toHaveBeenCalledWith(['B', 'A', 'C'])
  })

  it('S7 阵列随容量实时重排（D8）：拖中 W 570.4→293（单行→1/1 纵排）候选槽坐标随公式迁移', async () => {
    const nodes = [node('A'), node('B'), node('C')]
    mount(nodes)
    await injectW(nodes, 570.4)
    stubFrame(0, 0, 600, 500)
    pDown(cardOf('A'), 60, 40)
    pMove(66, 44)
    pMove(277, 40) // insertIdx=1
    await injectW(nodes, 293) // 容量变（1/1 纵排）——拖中实时重排
    const cands = [...host!.querySelectorAll('.drag-slot.cand')] as HTMLElement[]
    expect(cands.length).toBe(2)
    const expected = [candidateSlotAt(0, 293), candidateSlotAt(2, 293)]
    const styles = cands.map((c) => `${c.style.left},${c.style.top}`).sort()
    const want = expected.map((e) => `${e.x}px,${e.y}px`).sort()
    expect(styles).toEqual(want)
    pUp(277, 40)
    fireEnd(cardOf('A'))
    expect(reorder).toHaveBeenCalledTimes(1)
  })
})
