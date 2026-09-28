// @vitest-environment jsdom
/**
 * [T3-P8] MonthPop 弹层+改月全链测试（锁定合约，always-active）。
 * 覆盖：弹层结构（h4/ws-item 行月份名+篇数计数/当前月 on 态 dot ok 色/
 * foot-note）/视口钳制（clampPopoverPos 单源接线）/ym 点击 edit 态闸
 * （view 无动作）/选月全流（pop 关+toast 已移至+卡预演入目标框尾+
 * 目标框 .flash+FLIP 过渡+transitionend→onMoveNodeMonth 载荷）/同月
 * no-op 零写/Esc+外点关闭（排除弹层自身与 .c-ym）/改月飞行期禁拖。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { toastStoreSpy } from '../../utils/api-client-mock'
import type { LineageNode } from '../../../src/shared/models/lineage'
import { LineageTimeline } from '../../../src/renderer/features/lineage/LineageTimeline'
import { MonthPop } from '../../../src/renderer/features/lineage/MonthPop'

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
const ymOf = (id: string): HTMLElement => req(`.tl-card[data-node-id="${id}"] .c-ym`) as HTMLElement

const moveMonth = vi.fn()
const reorder = vi.fn()

function mount(nodes: LineageNode[]): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(
      <LineageTimeline
        nodes={nodes}
        edges={[]}
        onMoveNodeMonth={moveMonth}
        onReorderMonthSlots={reorder}
      />
    )
  })
}

/** edit 态下开某卡的改月弹层 */
function openPop(id: string, x = 300, y = 200): void {
  act(() => {
    btn('lineage-edit-toggle').click()
  })
  act(() => {
    ymOf(id).dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: x, clientY: y }))
  })
}

const fireEnd = (el: Element): void => {
  act(() => {
    el.dispatchEvent(Object.assign(new Event('transitionend'), { propertyName: 'left' }))
  })
}

/** 几何定值（飞行分支必需——jsdom 零位移会走「直接落定」无动画捷径） */
function stubRect(el: Element, x: number, y: number, w = 104, h = 52): void {
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
    left: x, top: y, right: x + w, bottom: y + h, width: w, height: h, x, y,
    toJSON: () => ({})
  } as unknown as DOMRect)
}

beforeEach(() => {
  toastStoreSpy.mockClear()
  moveMonth.mockClear()
  reorder.mockClear()
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

describe('[T3-P8] MonthPop 弹层结构（mockup L1101-1128 逐值）', () => {
  it('h4/ws-item 行（月份名+篇数计数）/当前月 on 态 dot ok 色/foot-note 文案', () => {
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    act(() => {
      root?.render(
        <MonthPop
          cx={100}
          cy={100}
          current={{ year: 2022, month: 9 }}
          months={[
            { year: 2022, month: 9, count: 2 },
            { year: 2022, month: 10, count: 1 },
            { year: 2022, month: null, count: 3 }
          ]}
          onPick={vi.fn()}
        />
      )
    })
    const pop = req('[data-testid="month-pop"]')
    expect(pop.querySelector('h4')?.textContent).toBe('移 动 到 月 份')
    const items = [...pop.querySelectorAll('.ws-item')]
    expect(items.length).toBe(3)
    expect(items[0]!.classList.contains('on')).toBe(true) // 当前月 on 态
    expect(items[1]!.classList.contains('on')).toBe(false)
    expect(items[0]!.querySelector('.nm')?.textContent).toBe('2022 年 9 月')
    expect(items[1]!.querySelector('.nm')?.textContent).toBe('2022 年 10 月')
    expect(items[2]!.querySelector('.nm')?.textContent).toBe('未定月')
    expect([...pop.querySelectorAll('.ct')].map((e) => e.textContent)).toEqual(['2 篇', '1 篇', '3 篇'])
    expect(items[0]!.querySelector('.dot')?.getAttribute('style')).toContain('var(--ok)')
    expect(items[1]!.querySelector('.dot')?.getAttribute('style')).toContain('var(--line)')
    expect(pop.querySelector('.foot-note')?.textContent).toBe(
      '移动带飞行动画 · 月份是数据字段（非拖拽语义）'
    )
  })

  it('视口钳制（clampPopoverPos 单源接线）：右下角锚不溢出视口', () => {
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    act(() => {
      root?.render(
        <MonthPop
          cx={2000}
          cy={2000}
          current={null}
          months={[]}
          onPick={vi.fn()}
        />
      )
    })
    const pop = req('[data-testid="month-pop"]') as HTMLElement
    expect(Number.parseFloat(pop.style.left)).toBeLessThanOrEqual(window.innerWidth - 250)
    expect(Number.parseFloat(pop.style.top)).toBeLessThanOrEqual(window.innerHeight - 10)
  })
})

describe('[T3-P8] 改月全链（edit 态月标→弹层→选月→飞行→写）', () => {
  it('ym 点击 edit 态开弹层（当前月=本卡月组 on 态）；view 态点击无动作', () => {
    mount([node('A', { month: 9 }), node('C', { month: 10 })])
    // view 态：CSS 显隐面 + handler 双闸
    act(() => {
      ymOf('A').dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 300, clientY: 200 }))
    })
    expect(q('[data-testid="month-pop"]')).toBeNull()
    openPop('A')
    const pop = req('[data-testid="month-pop"]')
    expect([...pop.querySelectorAll('.ws-item')].length).toBe(2)
    expect(pop.querySelector('.ws-item.on .nm')?.textContent).toBe('2022 年 9 月')
  })

  it('选月全流：pop 关+toast 已移至+卡预演入目标框尾+目标框 .flash+FLIP 过渡；transitionend→onMoveNodeMonth 载荷', () => {
    mount([node('A', { month: 9 }), node('B', { month: 9 }), node('C', { month: 10 })])
    stubRect(cardOf('A'), 12, 15) // 起点位定值——FLIP 飞行分支（零位移=直接落定捷径）
    openPop('A')
    const target = req('[data-testid="month-pop"] .ws-item[data-ym="2022|10"]')
    act(() => {
      target.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(q('[data-testid="month-pop"]')).toBeNull() // pop 关
    expect(toastStoreSpy).toHaveBeenCalledWith('已移至 2022 年 10 月', 'success')
    // 预演：A 卡入目标框（第 2 月框=10 月）尾部+框高亮
    const frames = [...host!.querySelectorAll('.month-frame')]
    expect(frames[1]!.contains(cardOf('A'))).toBe(true)
    expect(frames[1]!.classList.contains('flash')).toBe(true)
    expect(frames[0]!.contains(cardOf('B'))).toBe(true)
    const card = cardOf('A')
    expect(card.style.transition).toContain('left .32s cubic-bezier(.22,.9,.26,1)')
    // settle 落定（transitionend）后才排队写（无乐观写）
    expect(moveMonth).not.toHaveBeenCalled()
    fireEnd(card)
    expect(moveMonth).toHaveBeenCalledWith('A', 2022, 10)
  })

  it('同月选择=no-op：pop 关+零写零 toast 飞行', () => {
    mount([node('A', { month: 9 }), node('B', { month: 9 })])
    openPop('A')
    const self = req('[data-testid="month-pop"] .ws-item[data-ym="2022|9"]')
    act(() => {
      self.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(q('[data-testid="month-pop"]')).toBeNull()
    expect(moveMonth).not.toHaveBeenCalled()
    expect(toastStoreSpy).not.toHaveBeenCalled()
    expect(q('.month-frame.flash')).toBeNull()
  })

  it('Esc 关/外点关；点弹层内与点 .c-ym 不关', () => {
    mount([node('A', { month: 9 }), node('B', { month: 9 })])
    openPop('A')
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    })
    expect(q('[data-testid="month-pop"]')).toBeNull()
    // 外点关
    openPop('A')
    act(() => {
      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(q('[data-testid="month-pop"]')).toBeNull()
    // 点弹层内不关
    openPop('A')
    act(() => {
      req('[data-testid="month-pop"] h4').dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(q('[data-testid="month-pop"]')).not.toBeNull()
    // 点 .c-ym（换卡重开语义）不以外点关——handler 面重开
    act(() => {
      ymOf('B').dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 320, clientY: 220 }))
    })
    expect(q('[data-testid="month-pop"]')).not.toBeNull()
  })

  it('改月飞行期禁拖：settle 未清场前 pointerdown 不激活拖拽', () => {
    mount([node('A', { month: 9 }), node('B', { month: 9 }), node('C', { month: 10 })])
    openPop('A')
    act(() => {
      req('[data-testid="month-pop"] .ws-item[data-ym="2022|10"]').dispatchEvent(
        new MouseEvent('click', { bubbles: true })
      )
    })
    // 飞行中：B 卡 pointerdown+移动零激活
    act(() => {
      cardOf('B').dispatchEvent(
        new MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 60, clientY: 40 })
      )
    })
    act(() => {
      document.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 90, clientY: 60 }))
    })
    act(() => {
      document.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX: 90, clientY: 60 }))
    })
    expect(q('.drag-slot')).toBeNull()
    expect(reorder).not.toHaveBeenCalled()
    fireEnd(cardOf('A'))
    expect(moveMonth).toHaveBeenCalledWith('A', 2022, 10)
  })
})
