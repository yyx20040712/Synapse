// @vitest-environment jsdom
/**
 * [T3-P8] useCardDrag 拖拽状态机测试（锁定合约，always-active）。
 * 态空间（宪法前置）：drag∈{idle,pending(<5px),dragging,settle}×mode∈{view,edit}
 * ×composer{picker,popover,monthPop}——[F-LGRAPH-01①U5] 拖卡=edit 专属
 * （三模式闸——browse/focus pointerdown 即拒，闸面=lineage-mode-canvas.test）
 * /picker≠idle 禁拖（拾取优先）/popover·
 * monthPop 开禁拖/拖拽无 Esc 取消（松手恒落当前槽）/settle 期再 pointerdown
 * =忽略/阈值未过=单击选中既有链。跨格序列与几何槽位（同行左半/跨行上半/
 * 框外淡化）+纯函数 insertIndexFromRects/frameKeyOf/applyMovePreview 直测。
 * （几何经 getBoundingClientRect spy 定值——jsdom 零布局；transitionend 以
 * Object.assign(new Event) 附 propertyName 派发。）
 * [lnfix2] 下拉扩展（冻结基准）组拆驻 lineage-card-stretch.test.tsx（本件
 * 500 行红线——lnfix1 拆新件先例同族）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { toastStoreSpy } from '../../utils/api-client-mock'
import type { LineageNode } from '../../../src/shared/models/lineage'
import { LineageTimeline } from '../../../src/renderer/features/lineage/LineageTimeline'
import { insertIndexFromRects } from '../../../src/renderer/features/lineage/useCardDrag'
import { applyMovePreview, frameKeyOf, groupTimeline } from '../../../src/renderer/features/lineage/lineage-timeline'
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
  // [F-LGRAPH-01①U5] 拖卡=edit 专属（browse/focus pointerdown 即拒）——本组
  // 既有拖拽用例按新语义统一 edit 态驱动（拖拽行为本体零变）
  enterEdit()
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
function stubRect(el: Element, x: number, y: number, w = 128, h = 72): void {
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
  // [F-LGRAPH-01①U3] 模式态单源复位（P-1 缺省 browse——composer 受控注入面）
  useLineageViewStore.setState({ mode: 'browse', focusSet: [], navCollapsed: false, navWidth: 208 })
})

/** 进编辑模式（三模式栏写路径等价——「编辑脉络」toggle 已随 U3 退役） */
const enterEdit = (): void => {
  act(() => {
    useLineageViewStore.getState().setMode('edit')
  })
}

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
      { left: 0, top: 0, width: 128, height: 72 },
      { left: 148, top: 0, width: 128, height: 72 },
      { left: 296, top: 92, width: 128, height: 72 }
    ]
    // 第二卡右半（x=230 > 148+64=212 中心）→ 其后（含跨入行 2 上半带的卡前）
    expect(insertIndexFromRects(rects, 230, 20)).toBe(2)
    // 首卡左半（x=10 < 0+64）→ 首位
    expect(insertIndexFromRects(rects, 10, 20)).toBe(0)
    // 跨行带（y=140 脱行 0 带 [−57.6,129.6]）：第三卡左半（x=330 < 296+64）→ 其前
    expect(insertIndexFromRects(rects, 330, 140)).toBe(2)
    // 跨行带第三卡右半 → 末位
    expect(insertIndexFromRects(rects, 380, 140)).toBe(3)
    // 空列表 → 0
    expect(insertIndexFromRects([], 140, 140)).toBe(0)
  })
})

describe('[T3-P8] 拖拽状态机（[F-LGRAPH-01①U5] 拖卡=edit 专属——三模式闸后既有用例 edit 态驱动）', () => {
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

  it('月内槽位实时移位（同行判卡左半）+框外槽淡化 .35', () => {
    mount([node('A'), node('B'), node('C')])
    const f = req('.month-frame')
    stubRect(f, 0, 0, 600, 200)
    stubRect(cardOf('A'), 12, 18)
    stubRect(cardOf('B'), 160, 18)
    stubRect(cardOf('C'), 308, 18)
    pDown(cardOf('A'), 60, 40)
    pMove(66, 44)
    let ph = req('.drag-slot')
    expect(ph.classList.contains('faded')).toBe(false) // 框内不淡化
    // 指针落 B 右半（x=240 > 160+64=224 中心）→ 插位=B 后 C 前
    pMove(240, 40)
    ph = req('.drag-slot')
    expect(ph.nextElementSibling?.isEqualNode(cardOf('C'))).toBe(true)
    expect(ph.previousElementSibling?.isEqualNode(cardOf('B'))).toBe(true)
    // 指针出框（x=999）→ 淡化+插位保持（框外不更新槽位）
    pMove(999, 40)
    ph = req('.drag-slot')
    expect(ph.classList.contains('faded')).toBe(true)
    // [②U6/退役行 7] 框外松手=物理域回弹原位：无 toast+零重排写（回弹=no-op
    // 不入编辑会话栈——呈报确认口径）
    pUp(999, 40)
    fireEnd(cardOf('A'))
    expect(reorder).not.toHaveBeenCalled()
    // 回框内松手=落当前候选槽（B 右半→[B,A,C]）
    pDown(cardOf('A'), 60, 40)
    pMove(240, 40)
    pUp(240, 40)
    fireEnd(cardOf('A'))
    expect(reorder).toHaveBeenCalledWith(['B', 'A', 'C'])
  })

  it('跨行判上半：第二行卡上半指针→插其前（mockup L955-964 同式）', () => {
    mount([node('A'), node('B'), node('C')])
    const f = req('.month-frame')
    stubRect(f, 0, 0, 600, 200)
    stubRect(cardOf('A'), 12, 18)
    stubRect(cardOf('B'), 12, 110)
    stubRect(cardOf('C'), 160, 110)
    pDown(cardOf('A'), 60, 40)
    pMove(150, 130) // 跨行带（y=130 脱行 0 带 [−39.6,147.6]）：C 左半（150 < 160+64）→ 插 C 前
    const ph = req('.drag-slot')
    expect(ph.nextElementSibling?.isEqualNode(cardOf('C'))).toBe(true)
    pUp(150, 100)
    fireEnd(cardOf('A'))
    expect(reorder).toHaveBeenCalledWith(['B', 'A', 'C'])
  })

  it('松手 settle：占位槽撤+DOM 序=新序+.32s left/top 过渡在场；transitionend→清场+重排写+dimmed 摘', () => {
    mount([node('A'), node('B'), node('C')])
    stubRect(req('.month-frame'), 0, 0, 600, 200)
    stubRect(cardOf('A'), 12, 18)
    stubRect(cardOf('B'), 160, 18)
    stubRect(cardOf('C'), 308, 18)
    pDown(cardOf('A'), 60, 40)
    pMove(66, 44)
    pMove(460, 40) // 末位（460 > 308+128=436 → C 后=组末）
    pUp(460, 40)
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
    stubRect(cardOf('A'), 12, 18)
    stubRect(cardOf('B'), 160, 18)
    pDown(cardOf('A'), 60, 40)
    pMove(66, 44)
    pMove(240, 40) // B 右半 → 末位
    pUp(240, 40)
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
    stubRect(cardOf('A'), 12, 18)
    stubRect(cardOf('B'), 160, 18)
    pDown(cardOf('A'), 60, 40)
    pMove(66, 44)
    pMove(10, 40) // 插回首位（B 左半）
    pUp(10, 40)
    fireEnd(cardOf('A'))
    expect(reorder).not.toHaveBeenCalled()
  })

  it('[②U6/退役行 7] 跨月=物理域回弹：无 toast（INV-83 子句退役）+回弹原位零写', () => {
    mount([node('A', { month: 9 }), node('B', { month: 9 }), node('X', { month: 10 })])
    const frames = [...host!.querySelectorAll('.month-frame')]
    stubRect(frames[0]!, 0, 0, 600, 200)
    stubRect(frames[1]!, 0, 300, 600, 200)
    stubRect(cardOf('A'), 12, 18)
    stubRect(cardOf('B'), 160, 18)
    pDown(cardOf('A'), 60, 40)
    pMove(66, 44)
    pMove(240, 40) // 框内变序：B 右半 → [B,A]
    pMove(300, 400) // 落他月框（跨月面——限本月物理域）
    pUp(300, 400)
    // 无 toast（跨月拒绝 toast 子句退役——代码面零残留）；回弹原位零写
    expect(toastStoreSpy).not.toHaveBeenCalled()
    expect(q('.drag-slot')).toBeNull()
    fireEnd(cardOf('A'))
    expect(reorder).not.toHaveBeenCalled() // 回弹原位=序不变=no-op 不入会话栈
  })

  it('拖后 click 抑制（一次性）：拖拽松手后的 click 不转发选中；此后正常 click 恢复', () => {
    mount([node('A'), node('B')])
    stubRect(req('.month-frame'), 0, 0, 600, 200)
    stubRect(cardOf('A'), 12, 18)
    stubRect(cardOf('B'), 160, 18)
    pDown(cardOf('A'), 60, 40)
    pMove(66, 44)
    pMove(240, 40)
    pUp(240, 40)
    click(cardOf('A'))
    expect(onNodeClick).not.toHaveBeenCalled()
    fireEnd(cardOf('A'))
    click(cardOf('B'))
    expect(onNodeClick).toHaveBeenCalledWith('B', expect.anything())
  })

  it('拖拽无 Esc 取消：mid-drag Esc 零动作，松手恒落当前槽', () => {
    mount([node('A'), node('B')])
    stubRect(req('.month-frame'), 0, 0, 600, 200)
    stubRect(cardOf('A'), 12, 18)
    stubRect(cardOf('B'), 160, 18)
    pDown(cardOf('A'), 60, 40)
    pMove(66, 44)
    pMove(240, 40)
    pUp(240, 40)
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

  it('R2 dragging 期测量冻结跳过：fixed 拖卡视口系 offsetTop 不入量测（误挂瀑布错位即红——主控探针 t=0 实证形态）', () => {
    mount([node('A'), node('B'), node('C')])
    stubRect(req('.month-frame'), 0, 0, 600, 200)
    stubRect(cardOf('A'), 12, 18)
    stubRect(cardOf('B'), 160, 18)
    stubRect(cardOf('C'), 308, 18)
    pDown(cardOf('A'), 60, 40)
    // 拖卡 fixed 后视口系 offsetTop=999（异行）——dragging 帧若量测必挂错位 inline
    const spyTop = vi.spyOn(cardOf('A'), 'offsetTop', 'get')
    spyTop.mockReturnValue(999)
    pMove(66, 44)
    expect(cardOf('A').classList.contains('dragging')).toBe(true)
    expect(cardOf('A').style.marginLeft).toBe('0px') // 误挂即红（错位=inline margin-left；[回炉 R1] dragging 期恒压 0px）
    expect(req('.tl-content').classList.contains('tl-measure')).toBe(false)
    spyTop.mockRestore()
    pMove(460, 40) // 组末（>308+128=436）
    pUp(460, 40)
    fireEnd(cardOf('A'))
    expect(reorder).toHaveBeenCalledWith(['B', 'C', 'A'])
  })

  it('R4 transitionend 兜底：定时器 ~600ms 同径 finish（无事件也落定清场+写）', () => {
    vi.useFakeTimers()
    try {
      mount([node('A'), node('B')])
      stubRect(req('.month-frame'), 0, 0, 600, 200)
      stubRect(cardOf('A'), 12, 18)
      stubRect(cardOf('B'), 160, 18)
      pDown(cardOf('A'), 60, 40)
      pMove(66, 44)
      pMove(240, 40)
      pUp(240, 40)
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
    stubRect(cardOf('A'), 12, 18)
    stubRect(cardOf('B'), 160, 18)
    pDown(cardOf('A'), 60, 40)
    pMove(66, 44)
    pMove(240, 40)
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
    stubRect(cardOf('A'), 12, 18)
    stubRect(cardOf('B'), 160, 18)
    pDown(cardOf('A'), 60, 40)
    pMove(66, 44)
    pMove(240, 40)
    pUp(240, 40)
    // 拖后 click 未落在卡上（suppress 残留 true）——不派发 click
    fireEnd(cardOf('A'))
    // 新会话（B 未拖松手）清残留 → 随后真单击 B 转发选中
    pDown(cardOf('B'), 190, 40)
    pMove(193, 41) // <5px 未激活
    pUp(193, 41)
    click(cardOf('B'))
    expect(onNodeClick).toHaveBeenCalledWith('B', expect.anything())
  })

  it('[回炉 R1] 瀑布错位卡拖拽无双计：dragging 期 marginLeft 压 0（fixed 盒 left=视觉位）+settle 清场恢复 82px', async () => {
    const nodes = [node('A'), node('B'), node('C')]
    mount(nodes)
    // 注入分行（C=次行 72）→瀑布错位 C=82px（inline margin-left）
    const tops: Array<[string, number]> = [['A', 0], ['B', 0], ['C', 72]]
    for (const [id, top] of tops) {
      Object.defineProperty(cardOf(id), 'offsetTop', { get: () => top, configurable: true })
    }
    await act(async () => {
      root?.render(<LineageTimeline nodes={nodes.map((n) => ({ ...n }))} edges={[]} />)
    })
    expect(cardOf('C').style.marginLeft).toBe('82px')
    stubRect(req('.month-frame'), 0, 0, 600, 200)
    stubRect(cardOf('A'), 12, 18)
    stubRect(cardOf('B'), 160, 18)
    stubRect(cardOf('C'), 94, 110)
    // [回炉 R9-W1+d1-r2-W2] 测量恢复记录仪：C 卡 gBCR 调用时刻的 inline
    // marginLeft 采样。判别面=pUp 后切片——激活读 rect 样本（'82px'，压 0
    // 前自然序列）不锁测量恢复；settle 测量 gBCR 时刻采样才是锁点：
    // 测量前恢复被撤回则 pUp 后切片恒 '0px' 即红
    const marginAtRect: string[] = []
    const cRect = cardOf('C').getBoundingClientRect
    vi.spyOn(cardOf('C'), 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      marginAtRect.push(this.style.marginLeft)
      return cRect.call(this)
    })
    pDown(cardOf('C'), 140, 140)
    pMove(146, 144)
    // 切片起点取激活块 gBCR 之后（激活读 rect 在 pointerMove 阈值判定内
    // ——pDown 时零采样；起点取早则激活样本 '82px' 混入切片恒真）
    const settleSamplesStart = marginAtRect.length
    // dragging：[②U7] absolute 驻内容层+内容坐标（transform 祖先劫持 fixed 包含
    // 块）；border box=left（marginLeft 压 0px——无双计）。
    // left=指针派生 ghost：ox=140−94=46 → 146−46=100；双计形态=同 left 而
    // margin 恒 82px（border box 再偏 +82 → 视觉落 182）
    expect(cardOf('C').style.position).toBe('absolute')
    expect(cardOf('C').style.marginLeft).toBe('0px')
    expect(cardOf('C').style.left).toBe('100px')
    // [回炉 R8/d1-B1] 激活同步禁断：基类 margin-left .25s 过渡在场则压 0
    // 即启 +82px 滑移——inline transition='none' 先于类过渡接管（settle 段
    // SETTLE_TRANSITION 只含 left/top）
    expect(cardOf('C').style.transition).toBe('none')
    pUp(146, 144)
    // settle 期：re-fix 压 0（R9-W1~321 面）+飞行过渡=SETTLE_TRANSITION
    //（不含 margin-left——margin 恢复/压 0 天然无过渡）
    expect(cardOf('C').style.marginLeft).toBe('0px')
    expect(cardOf('C').style.transition).toBe('left .32s cubic-bezier(.22,.9,.26,1), top .32s cubic-bezier(.22,.9,.26,1)')
    // settle 测量前恢复被记录仪捕获（R9-W1 面）——pUp 后切片判别（d1-r2-W2）
    expect(marginAtRect.slice(settleSamplesStart)).toContain('82px')
    fireEnd(cardOf('C'))
    // settle 清场：React inline offset 恢复（82px）——错位终态不丢；inline
    // transition 清空回类值（错位变化重排平滑动画不永冻——第六键面）
    expect(cardOf('C').style.marginLeft).toBe('82px')
    expect(cardOf('C').style.position).toBe('')
    expect(cardOf('C').style.transition).toBe('')
  })

})
