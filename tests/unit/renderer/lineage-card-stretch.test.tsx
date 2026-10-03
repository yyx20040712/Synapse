// @vitest-environment jsdom
/**
 * [lnfix2] 月框下拉扩展锁定合约面（always-active 裸 describe——K3；自
 * lineage-card-drag.test 拆件=该件 500 行红线，lnfix1 拆新件先例同族）。
 * 态空间：dragging 期 extend ∈ {false, 冻结基准下拉带命中}——基准=pointerdown
 * grab 帧同步取值（拖前稳态底缘 bottom0/x 带）+激活后 rAF 校准（未入带时），
 * 判定读冻结值（实时 rect 被占位槽腾行 +92/stretch padding +94 推高——k1
 * 断点 A/B：下拉带几何不可达+挂载即振荡）；松手面沿实时（撑高框内=组末
 * 落位）。rect mock=真机布局随动模型（stretch 挂载→+94；实态槽组末→+92）
 * 使断点形态在 jsdom 可判别。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { toastStoreSpy } from '../../utils/api-client-mock'
import type { LineageNode } from '../../../src/shared/models/lineage'
import { LineageTimeline } from '../../../src/renderer/features/lineage/LineageTimeline'
import { useLineageViewStore } from '../../../src/renderer/features/lineage/lineage-view.store'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

function node(id: string): LineageNode {
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
const moveMonth = vi.fn()
const onNodeClick = vi.fn()

function mount(): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(
      <LineageTimeline
        nodes={[node('A'), node('B'), node('C')]}
        edges={[]}
        onNodeClick={onNodeClick}
        onReorderMonthSlots={reorder}
        onMoveNodeMonth={moveMonth}
      />
    )
  })
  // 拖卡=edit 专属闸（browse/focus pointerdown 即拒）——edit 态驱动
  act(() => {
    useLineageViewStore.getState().setMode('edit')
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

describe('[lnfix2] 月框下拉扩展（冻结基准贯通——stretch 稳定挂载+组末插位+settle）', () => {
  // rAF 捕获队列（lineage-edge-overlay.test stubRaf 同族）：激活后的冻结基准
  // 快照回调手动冲洗——jsdom 同步测试面确定性
  let rafs: FrameRequestCallback[] = []
  beforeEach(() => {
    rafs = []
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback): number => {
      rafs.push(cb)
      return rafs.length
    })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const flushRaf = (): void => {
    act(() => {
      rafs.splice(0).forEach((cb) => {
        cb(performance.now())
      })
    })
  }

  /** 真机布局随动模型（k1 断点 A/B 复现源）：stretch 挂载→padding-bottom
   *  +94；实态槽组末（其后无任何非拖卡）→腾新行 +92——判定读实时 rect 的
   *  实现形态下下拉带被撑高框吞噬（几何不可达/挂载即振荡），本模型使其在
   *  jsdom 可判别（静态 rect mock 下现行代码也能瞬时 extend，真机不能） */
  const stubLiveFrame = (frame: HTMLElement): void => {
    vi.spyOn(frame, 'getBoundingClientRect').mockImplementation(() => {
      let bottom = 200
      if (frame.classList.contains('stretch')) bottom += 94
      const ph = frame.querySelector('.drag-slot:not(.cand)')
      const cards = [...frame.querySelectorAll('.tl-card:not(.dragging)')]
      const last = cards[cards.length - 1]
      if (ph !== null && last !== undefined && (last.compareDocumentPosition(ph) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0) {
        bottom += 92
      }
      return {
        left: 0, top: 0, right: 600, bottom, width: 600, height: bottom, x: 0, y: 0,
        toJSON: () => ({})
      } as unknown as DOMRect
    })
  }

  /** 三卡同月挂载+框随动模型（bottom0=200，下拉带=(200,282]） */
  const setup = (): HTMLElement => {
    mount()
    const frame = req('.month-frame') as HTMLElement
    stubLiveFrame(frame)
    stubRect(cardOf('A'), 12, 18)
    stubRect(cardOf('B'), 160, 18)
    stubRect(cardOf('C'), 308, 18)
    return frame
  }

  it('[lnfix2①] 下拉带（bottom0+40）命中：.month-frame.stretch 在场+实态槽组末+槽不淡化', () => {
    const frame = setup()
    pDown(cardOf('A'), 60, 40) // grab 帧冻结基准（bottom0=200——拖前稳态底缘）
    pMove(66, 44)
    flushRaf() // 激活后 rAF 校准冲洗（未入带——校准读占位槽首帧稳态值同 200）
    pMove(240, 240) // x 带 [0,600] 内 ∧ y=bottom0+40 ∈ (200,282]
    expect(frame.classList.contains('stretch')).toBe(true)
    const ph = req('.drag-slot:not(.cand)')
    expect(ph.classList.contains('faded')).toBe(false)
    const cards = [...frame.querySelectorAll('.tl-card:not(.dragging)')]
    expect(cards.every((c) => (c.compareDocumentPosition(ph) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0)).toBe(true)
  })

  it('[lnfix2②] 消振荡锚：stretch 在场期指针微动（+50→+60）class 稳定——实时底缘已被撑至 ~386 不反噬判定；回框（y<bottom0）即摘除', () => {
    const frame = setup()
    pDown(cardOf('A'), 60, 40)
    pMove(66, 44)
    flushRaf()
    pMove(240, 250) // bottom0+50：首次入带——stretch 挂载+实态槽组末（实时底缘→386）
    expect(frame.classList.contains('stretch')).toBe(true)
    pMove(240, 260) // bottom0+60：读实时 rect 必落回撑高框内（extend 必失=振荡）——冻结基准稳定
    expect(frame.classList.contains('stretch')).toBe(true)
    pMove(240, 90) // 回框内（y<bottom0）→ 下拉态撤销
    expect(frame.classList.contains('stretch')).toBe(false)
  })

  it('[lnfix2③] 下拉带松手 settle：DOM 序=拖卡组末+onReorderMonthSlots 载荷正确（extend 路径写=框内末位同值）', () => {
    setup()
    pDown(cardOf('A'), 60, 40)
    pMove(66, 44)
    flushRaf()
    pMove(240, 240)
    pUp(240, 240) // 框已撑高（实时框内）——松手落位组末（松手面沿实时单源）
    expect(q('.month-frame.stretch')).toBeNull()
    const order = [...req('.month-frame').querySelectorAll('.tl-card')].map((c) => (c as HTMLElement).dataset.nodeId)
    expect(order).toEqual(['B', 'C', 'A'])
    expect(reorder).not.toHaveBeenCalled()
    fireEnd(cardOf('A'))
    expect(reorder).toHaveBeenCalledTimes(1)
    expect(reorder).toHaveBeenCalledWith(['B', 'C', 'A'])
  })
})
