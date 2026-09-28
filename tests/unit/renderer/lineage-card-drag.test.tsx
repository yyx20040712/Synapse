// @vitest-environment jsdom
/**
 * [T3-P8] useCardDrag 拖拽状态机测试（锁定合约，always-active）。
 * 态空间（宪法前置）：drag∈{idle,pending(<5px),dragging,settle}×mode∈{view,edit}
 * ×composer{picker,popover,monthPop}——picker≠idle 禁拖（拾取优先）/popover·
 * monthPop 开禁拖/拖拽无 Esc 取消（松手恒落当前槽）/settle 期再 pointerdown
 * =忽略/阈值未过=单击选中既有链。跨格序列与几何槽位（同行左半/跨行上半/
 * 框外淡化）+纯函数 insertIndexFromRects/frameKeyOf/applyMovePreview 直测。
 * （几何经 getBoundingClientRect spy 定值——jsdom 零布局；transitionend 以
 * Object.assign(new Event) 附 propertyName 派发。）
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { toastStoreSpy } from '../../utils/api-client-mock'
import type { LineageNode } from '../../../src/shared/models/lineage'
import { LineageTimeline } from '../../../src/renderer/features/lineage/LineageTimeline'
import { insertIndexFromRects } from '../../../src/renderer/features/lineage/useCardDrag'
import { applyMovePreview, frameKeyOf, groupTimeline } from '../../../src/renderer/features/lineage/lineage-timeline'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

function node(id: string, patch: Partial<LineageNode> = {}): LineageNode {
  return {
    id,
    paperId: `paper-${id}`,
    title: `节点${id}`,
    coreIdea: '',
    year: 2022,
    x: null,
    y: null,
    month: 9,
    slot: null,
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
const btn = (testid: string): HTMLButtonElement => req(`[data-testid="${testid}"]`) as HTMLButtonElement

const reorder = vi.fn()
const moveMonth = vi.fn()
const onNodeClick = vi.fn()

function mount(nodes: LineageNode[]): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(
      <LineageTimeline
        nodes={nodes}
        edges={[]}
        onNodeClick={onNodeClick}
        onReorderMonthSlots={reorder}
        onMoveNodeMonth={moveMonth}
      />
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
const click = (el: Element): void => {
  act(() => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

/** 几何定值（jsdom 零布局——getBoundingClientRect spy 单源） */
function stubRect(el: Element, x: number, y: number, w = 104, h = 52): void {
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
    left: x, top: y, right: x + w, bottom: y + h, width: w, height: h, x, y,
    toJSON: () => ({})
  } as unknown as DOMRect)
}

beforeEach(() => {
  toastStoreSpy.mockClear()
  reorder.mockClear()
  moveMonth.mockClear()
  onNodeClick.mockClear()
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

describe('[T3-P8] 纯函数直测（frameKeyOf/applyMovePreview/insertIndexFromRects）', () => {
  it('frameKeyOf：year|month 序列化含 null 形', () => {
    expect(frameKeyOf(2022, 9)).toBe('2022|9')
    expect(frameKeyOf(null, null)).toBe('null|null')
  })

  it('applyMovePreview：移出原组+落目标组尾部；空组收纳框移除', () => {
    const groups = groupTimeline([
      node('A', { year: 2022, month: 9 }),
      node('B', { year: 2022, month: 9 }),
      node('C', { year: 2022, month: 10 })
    ])
    const out = applyMovePreview(groups, 'A', 2022, 10)
    const oct = out[0]!.months.find((m) => m.month === 10)!
    const sep = out[0]!.months.find((m) => m.month === 9)
    expect(oct.nodes.map((n) => n.id)).toEqual(['C', 'A']) // 尾插
    expect(sep?.nodes.map((n) => n.id)).toEqual(['B'])
    // 移出后空组（单节点月）：该月收纳框整组移除
    const solo = groupTimeline([node('A', { year: 2022, month: 9 }), node('C', { year: 2022, month: 10 })])
    const out2 = applyMovePreview(solo, 'A', 2022, 10)
    expect(out2[0]!.months.map((m) => m.month)).toEqual([10])
    expect(out2[0]!.months[0]!.nodes.map((n) => n.id)).toEqual(['C', 'A'])
  })

  it('applyMovePreview：目标组不存在=原样返回（防御面）；nodeId 缺席=原样', () => {
    const groups = groupTimeline([node('A', { year: 2022, month: 9 })])
    expect(applyMovePreview(groups, 'A', 2030, 1)).toEqual(groups)
    expect(applyMovePreview(groups, 'Z', 2022, 9)).toEqual(groups)
  })

  it('insertIndexFromRects：同行判卡左半/跨行判上半；无前置=末位', () => {
    const rects = [
      { left: 0, top: 0, width: 104, height: 52 },
      { left: 124, top: 0, width: 104, height: 52 },
      { left: 248, top: 72, width: 104, height: 52 }
    ]
    // 第二卡右半（x=190 > 124+52=176 中心）→ 其后（含跨入行 2 上半带的卡前）
    expect(insertIndexFromRects(rects, 190, 20)).toBe(2)
    // 首卡左半（x=10 < 0+52）→ 首位
    expect(insertIndexFromRects(rects, 10, 20)).toBe(0)
    // 跨行带（y=100 脱行 0 带 [−41.6,93.6]）：第三卡左半（x=260 < 248+52）→ 其前
    expect(insertIndexFromRects(rects, 260, 100)).toBe(2)
    // 跨行带第三卡右半 → 末位
    expect(insertIndexFromRects(rects, 310, 100)).toBe(3)
    // 空列表 → 0
    expect(insertIndexFromRects([], 100, 100)).toBe(0)
  })
})

describe('[T3-P8] 拖拽状态机（view+edit 双态无 mode 门槛）', () => {
  it('阈值未过=单击选中既有链：pointerdown+3px 移动+up→无占位槽无重排；click 照常选中', () => {
    mount([node('A'), node('B')])
    pDown(cardOf('A'), 150, 200)
    pMove(152, 201)
    pUp(152, 201)
    expect(q('.drag-slot')).toBeNull()
    expect(reorder).not.toHaveBeenCalled()
    click(cardOf('A'))
    expect(onNodeClick).toHaveBeenCalledWith('A', expect.anything())
  })

  it('过 5px 阈值激活：占位槽「置 入」在场+拖卡 .dragging+连线层 dimmed（view 态可拖）', () => {
    mount([node('A'), node('B')])
    pDown(cardOf('A'), 150, 200)
    pMove(158, 204)
    const ph = req('.drag-slot')
    expect(ph.textContent).toBe('置 入')
    expect(cardOf('A').classList.contains('dragging')).toBe(true)
    expect(req('.tl-edges').classList.contains('dimmed')).toBe(true)
  })

  it('拾取互斥（picker≠idle 禁拖——拾取优先）：linkbtn 拾取中 pointerdown 不激活拖拽', () => {
    mount([node('A'), node('B')])
    act(() => {
      btn('lineage-edit-toggle').click()
    })
    act(() => {
      btn('lineage-link-btn').click()
    })
    pDown(cardOf('A'), 150, 200)
    pMove(170, 220)
    expect(q('.drag-slot')).toBeNull()
    pUp(170, 220)
    expect(reorder).not.toHaveBeenCalled()
  })

  it('popover 开禁拖：线型弹层开时 pointerdown 不激活', () => {
    mount([node('A'), node('B')])
    act(() => {
      btn('lineage-edit-toggle').click()
    })
    act(() => {
      btn('lineage-link-btn').click()
    })
    click(cardOf('A'))
    click(cardOf('B'))
    expect(q('[data-testid="edge-pop"]')).not.toBeNull()
    pDown(cardOf('A'), 150, 200)
    pMove(170, 220)
    expect(q('.drag-slot')).toBeNull()
    pUp(170, 220)
    expect(reorder).not.toHaveBeenCalled()
  })

  it('月内槽位实时移位（同行判卡左半）+框外槽淡化 .35', () => {
    mount([node('A'), node('B'), node('C')])
    const f = req('.month-frame')
    stubRect(f, 0, 0, 600, 200)
    stubRect(cardOf('A'), 12, 15)
    stubRect(cardOf('B'), 136, 15)
    stubRect(cardOf('C'), 260, 15)
    pDown(cardOf('A'), 60, 40)
    pMove(66, 44)
    let ph = req('.drag-slot')
    expect(ph.classList.contains('faded')).toBe(false) // 框内不淡化
    // 指针落 B 右半（x=200 > 136+52=188 中心）→ 插位=B 后 C 前
    pMove(200, 40)
    ph = req('.drag-slot')
    expect(ph.nextElementSibling?.isEqualNode(cardOf('C'))).toBe(true)
    expect(ph.previousElementSibling?.isEqualNode(cardOf('B'))).toBe(true)
    // 指针出框（x=999）→ 淡化+插位保持（框外不更新槽位）
    pMove(999, 40)
    ph = req('.drag-slot')
    expect(ph.classList.contains('faded')).toBe(true)
    pUp(999, 40)
    fireEnd(cardOf('A'))
    expect(reorder).toHaveBeenCalledWith(['B', 'A', 'C'])
  })

  it('跨行判上半：第二行卡上半指针→插其前（mockup L955-964 同式）', () => {
    mount([node('A'), node('B'), node('C')])
    const f = req('.month-frame')
    stubRect(f, 0, 0, 600, 200)
    stubRect(cardOf('A'), 12, 15)
    stubRect(cardOf('B'), 12, 87)
    stubRect(cardOf('C'), 136, 87)
    pDown(cardOf('A'), 60, 40)
    pMove(150, 100) // 跨行带（y=100 脱行 0 带）：C 左半（150 < 136+52）→ 插 C 前
    const ph = req('.drag-slot')
    expect(ph.nextElementSibling?.isEqualNode(cardOf('C'))).toBe(true)
    pUp(150, 100)
    fireEnd(cardOf('A'))
    expect(reorder).toHaveBeenCalledWith(['B', 'A', 'C'])
  })

  it('松手 settle：占位槽撤+DOM 序=新序+.32s left/top 过渡在场；transitionend→清场+重排写+dimmed 摘', () => {
    mount([node('A'), node('B'), node('C')])
    stubRect(req('.month-frame'), 0, 0, 600, 200)
    stubRect(cardOf('A'), 12, 15)
    stubRect(cardOf('B'), 136, 15)
    stubRect(cardOf('C'), 260, 15)
    pDown(cardOf('A'), 60, 40)
    pMove(66, 44)
    pMove(350, 40) // 末位（350 > 260+52=312 → C 后=组末）
    pUp(350, 40)
    expect(q('.drag-slot')).toBeNull()
    const order = [...req('.month-frame').querySelectorAll('.tl-card')].map((c) => (c as HTMLElement).dataset.nodeId)
    expect(order).toEqual(['B', 'C', 'A'])
    const card = cardOf('A')
    expect(card.style.transition).toContain('left .32s cubic-bezier(.22,.9,.26,1)')
    expect(card.style.transition).toContain('top .32s cubic-bezier(.22,.9,.26,1)')
    expect(req('.tl-edges').classList.contains('dimmed')).toBe(false) // 拖起摘除（settle 期无 dimmed）
    expect(reorder).not.toHaveBeenCalled() // settle 落定（transitionend）后才排队
    fireEnd(card)
    expect(reorder).toHaveBeenCalledWith(['B', 'C', 'A'])
    expect(card.style.position).toBe('') // 清场（inline 全清）
    expect(card.classList.contains('dragging')).toBe(false)
  })

  it('settle 期再 pointerdown=忽略（不二次激活）', () => {
    mount([node('A'), node('B')])
    stubRect(req('.month-frame'), 0, 0, 600, 200)
    stubRect(cardOf('A'), 12, 15)
    stubRect(cardOf('B'), 136, 15)
    pDown(cardOf('A'), 60, 40)
    pMove(66, 44)
    pMove(200, 40) // B 右半 → 末位
    pUp(200, 40)
    // settle 飞行中（transitionend 未派发）：新 pointerdown+move 零动作
    pDown(cardOf('B'), 150, 200)
    pMove(170, 220)
    pUp(170, 220)
    expect(q('.drag-slot')).toBeNull()
    fireEnd(cardOf('A'))
    expect(reorder).toHaveBeenCalledTimes(1)
    expect(reorder).toHaveBeenCalledWith(['B', 'A'])
  })

  it('序未变松手=零写（拖回原位不产生空写批）', () => {
    mount([node('A'), node('B')])
    stubRect(req('.month-frame'), 0, 0, 600, 200)
    stubRect(cardOf('A'), 12, 15)
    stubRect(cardOf('B'), 136, 15)
    pDown(cardOf('A'), 60, 40)
    pMove(66, 44)
    pMove(10, 40) // 插回首位（B 左半）
    pUp(10, 40)
    fireEnd(cardOf('A'))
    expect(reorder).not.toHaveBeenCalled()
  })

  it('跨月拒绝：落点他月框=toast 文案+落当前槽（源月序写不受染）', () => {
    mount([node('A', { month: 9 }), node('B', { month: 9 }), node('X', { month: 10 })])
    const frames = [...host!.querySelectorAll('.month-frame')]
    stubRect(frames[0]!, 0, 0, 600, 200)
    stubRect(frames[1]!, 0, 300, 600, 200)
    stubRect(cardOf('A'), 12, 15)
    stubRect(cardOf('B'), 136, 15)
    pDown(cardOf('A'), 60, 40)
    pMove(66, 44)
    pMove(200, 40) // 框内变序：B 右半 → [B,A]
    pMove(300, 400) // 落他月框（跨月拒绝面）
    pUp(300, 400)
    expect(toastStoreSpy).toHaveBeenCalledWith('不能跨月拖动——请进入编辑模式，点卡片月标修改月份', 'error')
    expect(q('.drag-slot')).toBeNull()
    fireEnd(cardOf('A'))
    // 落当前候选槽（源月框内最后插位）→ 源月全序照写
    expect(reorder).toHaveBeenCalledWith(['B', 'A'])
  })

  it('拖后 click 抑制（一次性）：拖拽松手后的 click 不转发选中；此后正常 click 恢复', () => {
    mount([node('A'), node('B')])
    stubRect(req('.month-frame'), 0, 0, 600, 200)
    stubRect(cardOf('A'), 12, 15)
    stubRect(cardOf('B'), 136, 15)
    pDown(cardOf('A'), 60, 40)
    pMove(66, 44)
    pMove(200, 40)
    pUp(200, 40)
    click(cardOf('A'))
    expect(onNodeClick).not.toHaveBeenCalled()
    fireEnd(cardOf('A'))
    click(cardOf('B'))
    expect(onNodeClick).toHaveBeenCalledWith('B', expect.anything())
  })

  it('拖拽无 Esc 取消：mid-drag Esc 零动作，松手恒落当前槽', () => {
    mount([node('A'), node('B')])
    stubRect(req('.month-frame'), 0, 0, 600, 200)
    stubRect(cardOf('A'), 12, 15)
    stubRect(cardOf('B'), 136, 15)
    pDown(cardOf('A'), 60, 40)
    pMove(66, 44)
    pMove(200, 40)
    pUp(200, 40)
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    })
    expect(q('.drag-slot')).toBeNull() // settle 已启动（Esc 不中断飞行）
    fireEnd(cardOf('A'))
    expect(reorder).toHaveBeenCalledWith(['B', 'A'])
  })
})

describe('[T3-P8 回炉] R1/R2/R4/R5/R6——FLIP 清场序/冻结互斥/兜底/取消径/抑制残留', () => {
  it('R1 零位移分支干净：settle 量测前清 inline 四键（flow 态量 target）→松手即终态无残留（序不变=零写）', () => {
    mount([node('A'), node('B')])
    stubRect(req('.month-frame'), 0, 0, 600, 200)
    stubRect(cardOf('A'), 6, 4)
    stubRect(cardOf('B'), 300, 0) // B 远右——指针落 A 位=插位首位（序不变）
    pDown(cardOf('A'), 56, 29) // ox=50 oy=25
    pMove(62, 33) // 激活（≥5px）；ghost=(12,8)
    stubRect(cardOf('A'), 12, 8) // settle 期 target=ghost 位（零位移）
    pUp(62, 33)
    // 零位移分支：量测前 inline 已清 → finish 直落，卡无任何 inline 残留
    expect(cardOf('A').getAttribute('style') === null || cardOf('A').getAttribute('style') === '').toBe(true)
    expect(q('.drag-slot')).toBeNull()
    expect(reorder).not.toHaveBeenCalled()
    expect(onNodeClick).not.toHaveBeenCalled()
  })

  it('R2 dragging 期测量冻结跳过：fixed 拖卡视口系 offsetTop 不入量测（误挂 rowshift 即红——主控探针 t=0 实证形态）', () => {
    mount([node('A'), node('B'), node('C')])
    stubRect(req('.month-frame'), 0, 0, 600, 200)
    stubRect(cardOf('A'), 12, 15)
    stubRect(cardOf('B'), 136, 15)
    stubRect(cardOf('C'), 260, 15)
    pDown(cardOf('A'), 60, 40)
    // 拖卡 fixed 后视口系 offsetTop=999（异行）——dragging 帧若量测必挂 rowshift
    const spyTop = vi.spyOn(cardOf('A'), 'offsetTop', 'get')
    spyTop.mockReturnValue(999)
    pMove(66, 44)
    expect(cardOf('A').classList.contains('dragging')).toBe(true)
    expect(cardOf('A').classList.contains('rowshift')).toBe(false) // 误挂即红
    expect(req('.tl-content').classList.contains('tl-measure')).toBe(false)
    spyTop.mockRestore()
    pMove(350, 40) // 组末（>260+52=312）
    pUp(350, 40)
    fireEnd(cardOf('A'))
    expect(reorder).toHaveBeenCalledWith(['B', 'C', 'A'])
  })

  it('R4 transitionend 兜底：定时器 ~600ms 同径 finish（无事件也落定清场+写）', () => {
    vi.useFakeTimers()
    try {
      mount([node('A'), node('B')])
      stubRect(req('.month-frame'), 0, 0, 600, 200)
      stubRect(cardOf('A'), 12, 15)
      stubRect(cardOf('B'), 136, 15)
      pDown(cardOf('A'), 60, 40)
      pMove(66, 44)
      pMove(200, 40)
      pUp(200, 40)
      expect(reorder).not.toHaveBeenCalled() // settle 落定（事件/兜底）后才写
      act(() => {
        vi.advanceTimersByTime(650)
      })
      expect(reorder).toHaveBeenCalledTimes(1)
      expect(reorder).toHaveBeenCalledWith(['B', 'A'])
      expect(cardOf('A').getAttribute('style') === null || cardOf('A').getAttribute('style') === '').toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })

  it('R5 pointercancel 同径：系统取消=落当前候选槽（与松手同式清场）', () => {
    mount([node('A'), node('B')])
    stubRect(req('.month-frame'), 0, 0, 600, 200)
    stubRect(cardOf('A'), 12, 15)
    stubRect(cardOf('B'), 136, 15)
    pDown(cardOf('A'), 60, 40)
    pMove(66, 44)
    pMove(200, 40)
    act(() => {
      document.dispatchEvent(new MouseEvent('pointercancel', { bubbles: true, clientX: 200, clientY: 40 }))
    })
    expect(q('.drag-slot')).toBeNull()
    expect(reorder).not.toHaveBeenCalled()
    fireEnd(cardOf('A'))
    expect(reorder).toHaveBeenCalledWith(['B', 'A'])
  })

  it('R6 click 抑制无残留：拖后未消费的抑制随新会话清零（下一真单击恢复转发）', () => {
    mount([node('A'), node('B')])
    stubRect(req('.month-frame'), 0, 0, 600, 200)
    stubRect(cardOf('A'), 12, 15)
    stubRect(cardOf('B'), 136, 15)
    pDown(cardOf('A'), 60, 40)
    pMove(66, 44)
    pMove(200, 40)
    pUp(200, 40)
    // 拖后 click 未落在卡上（suppress 残留 true）——不派发 click
    fireEnd(cardOf('A'))
    // 新会话（B 未拖松手）清残留 → 随后真单击 B 转发选中
    pDown(cardOf('B'), 190, 40)
    pMove(193, 41) // <5px 未激活
    pUp(193, 41)
    click(cardOf('B'))
    expect(onNodeClick).toHaveBeenCalledWith('B', expect.anything())
  })

  it('R7 月标互斥：拾取中（picker≠idle）点 .c-ym 不开改月弹层', () => {
    mount([node('A'), node('B')])
    act(() => {
      btn('lineage-edit-toggle').click()
    })
    act(() => {
      btn('lineage-link-btn').click()
    })
    act(() => {
      req('.tl-card[data-node-id="A"] .c-ym').dispatchEvent(
        new MouseEvent('click', { bubbles: true, clientX: 300, clientY: 200 })
      )
    })
    expect(q('[data-testid="month-pop"]')).toBeNull()
  })
})
