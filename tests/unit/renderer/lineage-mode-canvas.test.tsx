// @vitest-environment jsdom
/**
 * [F-LGRAPH-01①U5] 三模式画布行为闸（mockup §2.1 定案——现行「view/edit
 * 双态无 mode 门槛」退役）：browse/focus 禁卡拖拽（拖卡=edit 专属）/平移
 * 小手（browse/focus 拖空白=滚动跟随+grab/grabbing；edit 不平移）/focus
 * 点卡=toggle focusSet（再点取消+点空白 no-op）+P-8 聚焦视觉=仅被点卡
 * accent 边框（多卡独立）/切图 focusSet 清空（图域隔离）/drag-hint 文案
 * 随三模式/P-13 三模式点卡均联动详情面板（选中并行不冲突）。
 * always-active（不经 guardedDescribe）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { LineageNode } from '../../../src/shared/models/lineage'
import { LineageTimeline } from '../../../src/renderer/features/lineage/LineageTimeline'
import { useLineageViewStore } from '../../../src/renderer/features/lineage/lineage-view.store'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'

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
    folderId: '__main__',
    createdAt: 't',
    updatedAt: 't',
    ...patch
  }
}

let root: Root | null = null
let host: HTMLDivElement | null = null
const onNodeClick = vi.fn()

function mount(nodes: LineageNode[]): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(<LineageTimeline nodes={nodes} edges={[]} onNodeClick={onNodeClick} />)
  })
}

const q = (sel: string): Element | null => host?.querySelector(sel) ?? null
const req = (sel: string): Element => {
  const el = q(sel)
  if (el === null) throw new Error(`元素未渲染：${sel}`)
  return el
}
const cardOf = (id: string): HTMLElement => req(`.tl-card[data-node-id="${id}"]`) as HTMLElement

const setMode = (m: 'edit' | 'browse' | 'focus'): void => {
  act(() => {
    useLineageViewStore.getState().setMode(m)
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
const click = (el: Element): void => {
  act(() => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 10, clientY: 10 }))
  })
}

beforeEach(() => {
  onNodeClick.mockClear()
  useLineageViewStore.setState({
    mode: 'browse',
    focusSet: [],
    navCollapsed: false,
    navWidth: 208,
    navScrollTarget: null,
    activeFrameKey: null
  })
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
})

describe('F-LGRAPH-01①U5 三模式画布行为闸 —— 拖拽闸（拖卡=edit 专属）', () => {
  it('browse（缺省）禁拖：pointerdown+过阈值移动不激活占位槽；click 选中照常', () => {
    mount([node('A'), node('B')])
    pDown(cardOf('A'), 150, 200)
    pMove(170, 220)
    expect(q('.drag-slot')).toBeNull() // 闸拒（现「view 态可拖」退役）
    expect(cardOf('A').classList.contains('dragging')).toBe(false)
    pUp(170, 220)
    click(cardOf('A'))
    expect(onNodeClick).toHaveBeenCalledWith('A', expect.anything()) // P-13 面板联动链保活
  })

  it('focus 禁拖同闸：占位槽不激活', () => {
    mount([node('A'), node('B')])
    setMode('focus')
    pDown(cardOf('A'), 150, 200)
    pMove(170, 220)
    expect(q('.drag-slot')).toBeNull()
    pUp(170, 220)
  })

  it('edit 闸开：过阈值激活占位槽（拖拽专属域）', () => {
    mount([node('A'), node('B')])
    setMode('edit')
    pDown(cardOf('A'), 150, 200)
    pMove(158, 204)
    expect(q('.drag-slot')).not.toBeNull()
    pUp(158, 204)
    act(() => {
      cardOf('A').dispatchEvent(Object.assign(new Event('transitionend'), { propertyName: 'left' }))
    })
  })
})

describe('F-LGRAPH-01①U5 平移小手（browse/focus 拖空白=滚动跟随；edit 不平移）', () => {
  it('browse 拖画布空白：scrollLeft/scrollTop 跟随指针位移（反向——拖内容）', () => {
    mount([node('A')])
    const scroller = req('.timeline') as HTMLElement
    scroller.scrollLeft = 100
    scroller.scrollTop = 50
    pDown(req('.tl-content'), 200, 300) // 空白（非卡/非月标/非工具条）
    pMove(150, 270) // dx=-50 dy=-30 → 滚动+50/+30（内容随手指）
    pUp(150, 270)
    expect(scroller.scrollLeft).toBe(150)
    expect(scroller.scrollTop).toBe(80)
    expect(scroller.classList.contains('panning')).toBe(false) // 松手摘 grabbing
  })

  it('[R12] 平移激活阈值 5px：阈值内微移不滚不进 grabbing（对照 DRAG_THRESHOLD 先例）；过阈值滚动', () => {
    mount([node('A')])
    const scroller = req('.timeline') as HTMLElement
    scroller.scrollLeft = 100
    pDown(req('.tl-content'), 200, 300)
    pMove(197, 302) // 3.6px < 5——阈值内
    expect(scroller.scrollLeft).toBe(100) // 不滚
    expect(scroller.classList.contains('panning')).toBe(false) // 不进 grabbing
    pMove(194, 300) // 6px ≥ 5——激活
    expect(scroller.scrollLeft).toBe(106) // 反向随指（200-194=+6）
    expect(scroller.classList.contains('panning')).toBe(true)
    pUp(194, 300)
  })

  it('edit 拖画布空白不平移（编辑域无小手）', () => {
    mount([node('A')])
    setMode('edit')
    const scroller = req('.timeline') as HTMLElement
    scroller.scrollLeft = 100
    pDown(req('.tl-content'), 200, 300)
    pMove(150, 300)
    pUp(150, 300)
    expect(scroller.scrollLeft).toBe(100) // 零滚动
  })

  it('browse 点卡身不平移（卡=点选/闸面，非空白）', () => {
    mount([node('A')])
    const scroller = req('.timeline') as HTMLElement
    scroller.scrollLeft = 100
    pDown(cardOf('A'), 150, 200)
    pMove(100, 200)
    pUp(100, 200)
    expect(scroller.scrollLeft).toBe(100)
  })
})

describe('F-LGRAPH-01①U5 focus 域 —— toggle/视觉/图域隔离/文案', () => {
  it('focus 点卡=toggle focusSet+P-13 选中并行（详情面板联动不冲突）+P-8 仅被点卡 accent 边框', () => {
    mount([node('A'), node('B'), node('C')])
    setMode('focus')
    click(cardOf('A'))
    expect(useLineageViewStore.getState().focusSet).toEqual(['A'])
    expect(onNodeClick).toHaveBeenCalledWith('A', expect.anything()) // 选中照常转发（P-13）
    expect(cardOf('A').classList.contains('focused')).toBe(true) // P-8 accent 边框
    expect(cardOf('B').classList.contains('focused')).toBe(false)
    click(cardOf('B'))
    expect(useLineageViewStore.getState().focusSet).toEqual(['A', 'B']) // 多卡独立标记
    expect(cardOf('B').classList.contains('focused')).toBe(true)
    click(cardOf('A')) // 再点同卡取消
    expect(useLineageViewStore.getState().focusSet).toEqual(['B'])
    expect(cardOf('A').classList.contains('focused')).toBe(false)
  })

  it('focus 点空白=no-op（不取消聚焦——退出单出口=浏览/编辑按钮）', () => {
    mount([node('A')])
    setMode('focus')
    click(cardOf('A'))
    click(req('.tl-content')) // 画布空白
    expect(useLineageViewStore.getState().focusSet).toEqual(['A'])
  })

  it('切图 focusSet 清空（图域隔离——setFolder 单点）+模式保持 focus（空集合法）', () => {
    mount([node('A')])
    setMode('focus')
    click(cardOf('A'))
    act(() => {
      useLineageStore.getState().setFolder('f-other')
    })
    expect(useLineageViewStore.getState().focusSet).toEqual([])
    expect(useLineageViewStore.getState().mode).toBe('focus') // 模式保持（空集态合法）
  })

  it('drag-hint 文案随三模式（browse 平移/focus 聚焦标记/edit 全句）', () => {
    mount([node('A')])
    const hint = (): string => req('[data-testid="drag-hint"]').textContent ?? ''
    expect(hint()).toBe('✋ 拖动空白＝平移画布 · 滚轮浏览时间线')
    setMode('focus')
    expect(hint()).toBe('◎ 单击卡片＝聚焦标记（再点取消） · 拖动空白＝平移画布')
    setMode('edit')
    expect(hint()).toBe('编辑中：点连线改线型 · 点卡片月标改月 · 拖动＝月内调序')
  })

  it('.timeline 挂模式类（mode-browse/mode-focus/mode-edit——CSS 光标域承载）', () => {
    mount([node('A')])
    expect(req('.timeline').classList.contains('mode-browse')).toBe(true)
    setMode('focus')
    expect(req('.timeline').classList.contains('mode-focus')).toBe(true)
    setMode('edit')
    // [回炉 R13] mode-edit 零消费类清理——edit 态不挂模式类（.editing 承载）
    expect(req('.timeline').classList.contains('mode-edit')).toBe(false)
    expect(req('.timeline').classList.contains('editing')).toBe(true) // 编辑态类同源保活
  })
})
