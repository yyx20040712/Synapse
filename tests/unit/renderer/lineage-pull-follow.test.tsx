// @vitest-environment jsdom
/**
 * [F-VISFB-22 C6] 框底连续跟随锁定合约面（视检反馈「框底跟随一小段」；
 * always-active 裸 describe——K3）。态空间：dragging 期 extend/pullPx ∈
 * {未越缘(0), 越缘跟随段(0,82], 超上限封顶(=82)}——未拉伸底缘（冻结基准
 * frameBottom0）起连续跟随，PULL_BAND_PX 封顶（去旧 +82 掉出缺陷：超上限
 * 再拖 extend 保持+框底单调不回落）；触发带语义保留（overSourceFrame 实时
 * 域 INV-98 零改）。rect mock=连续随动模型（stretch 增量=inline --lg-pull
 * 变量派生——真机 padding 12+pull 语义；实态槽组末腾行 +92 沿
 * stubLiveFrame 模型语义，tests/utils/live-frame.ts 同族范式）。
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

/** 几何定值（jsdom 零布局——卡 rect spy 单源） */
function stubRect(el: Element, x: number, y: number, w = 128, h = 72): void {
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
    left: x, top: y, right: x + w, bottom: y + h, width: w, height: h, x, y,
    toJSON: () => ({})
  } as unknown as DOMRect)
}

beforeEach(() => {
  toastStoreSpy.mockClear()
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

describe('[F-VISFB-22 C6] 框底连续跟随（未拉伸底缘起 pullPx 跟随+超 82 封顶保持）', () => {
  // rAF 捕获队列（lineage-card-stretch.test stubRaf 同族）：激活后的冻结基准
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

  /** 连续随动模型（真机 padding 12+pull 语义——增量=inline --lg-pull 派生；
   *  实态槽组末 →腾新行 +92）。baseBottom=拖前稳态底缘（下拉带 x=[0,600]） */
  const stubFollowFrame = (frame: HTMLElement, baseBottom: number): void => {
    vi.spyOn(frame, 'getBoundingClientRect').mockImplementation(() => {
      const pull = Number.parseFloat(frame.style.getPropertyValue('--lg-pull')) || 0
      let bottom = baseBottom + pull
      const ph = frame.querySelector('.drag-slot:not(.cand)')
      const cards: Element[] = []
      frame.querySelectorAll('.tl-card:not(.dragging)').forEach((c) => {
        cards.push(c)
      })
      const last = cards[cards.length - 1]
      if (
        ph !== null &&
        last !== undefined &&
        (last.compareDocumentPosition(ph) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
      ) {
        bottom += 92
      }
      return {
        left: 0, top: 0, right: 600, bottom, width: 600, height: bottom, x: 0, y: 0,
        toJSON: () => ({})
      } as unknown as DOMRect
    })
  }

  /** 三卡同月挂载+连续随动框模型（bottom0=200，x 带 [0,600]） */
  const setup = (): HTMLElement => {
    mount()
    const frame = req('.month-frame') as HTMLElement
    stubFollowFrame(frame, 200)
    stubRect(cardOf('A'), 12, 18)
    stubRect(cardOf('B'), 160, 18)
    stubRect(cardOf('C'), 308, 18)
    return frame
  }

  const pullOf = (frame: HTMLElement): number =>
    Number.parseFloat(frame.style.getPropertyValue('--lg-pull')) || 0

  const beginDrag = (frame: HTMLElement): void => {
    pDown(cardOf('A'), 60, 40)
    pMove(66, 44)
    flushRaf()
    expect(frame.classList.contains('stretch')).toBe(false)
  }

  it('[C6①] 连续跟随：越缘 +10/+50 逐段跟随（--lg-pull=越过量，框底随之增长）', () => {
    const frame = setup()
    beginDrag(frame)
    pMove(240, 210)
    expect(frame.classList.contains('stretch')).toBe(true)
    expect(pullOf(frame)).toBe(10)
    pMove(240, 250)
    expect(frame.classList.contains('stretch')).toBe(true)
    expect(pullOf(frame)).toBe(50)
  })

  it('[C6②] 超 +82 再拖两段 extend 保持且框底单调（验收面——旧 +82 上限掉出缺陷修面）', () => {
    const frame = setup()
    beginDrag(frame)
    const bottoms: number[] = []
    const bottomNow = (): number => frame.getBoundingClientRect().bottom
    pMove(240, 240)
    expect(frame.classList.contains('stretch')).toBe(true)
    bottoms.push(bottomNow())
    pMove(240, 290)
    expect(frame.classList.contains('stretch'), '超 +82（+90）extend 保持').toBe(true)
    expect(pullOf(frame)).toBe(82)
    bottoms.push(bottomNow())
    pMove(240, 320)
    expect(frame.classList.contains('stretch'), '再拖一段（+120）extend 保持').toBe(true)
    expect(pullOf(frame)).toBe(82)
    bottoms.push(bottomNow())
    pMove(240, 350)
    expect(frame.classList.contains('stretch'), '再拖二段（+150）extend 保持').toBe(true)
    expect(pullOf(frame)).toBe(82)
    bottoms.push(bottomNow())
    for (let i = 1; i < bottoms.length; i++) {
      expect(bottoms[i], `框底单调不回落（第 ${i + 1} 段）`).toBeGreaterThanOrEqual(bottoms[i - 1]!)
    }
  })

  it('[C6③] 超 +82 段候选不淡化（撑高框内语义沿承——次帧实时框自校正）+回框即撤销', () => {
    const frame = setup()
    beginDrag(frame)
    pMove(240, 290)
    pMove(240, 292)
    const ph = req('.drag-slot:not(.cand)')
    expect(ph.classList.contains('faded')).toBe(false)
    pMove(240, 90)
    expect(frame.classList.contains('stretch')).toBe(false)
    expect(pullOf(frame)).toBe(0)
  })

  it('[C6④] 超 +82 松手 settle：落位组末+写路径载荷正确（撑高框内松手语义）', () => {
    const frame = setup()
    beginDrag(frame)
    pMove(240, 290)
    pUp(240, 290)
    expect(q('.month-frame.stretch')).toBeNull()
    const order = [...req('.month-frame').querySelectorAll('.tl-card')].map((c) => (c as HTMLElement).dataset.nodeId)
    expect(order).toEqual(['B', 'C', 'A'])
    expect(reorder).not.toHaveBeenCalled()
    fireEnd(cardOf('A'))
    expect(reorder).toHaveBeenCalledTimes(1)
    expect(reorder).toHaveBeenCalledWith(['B', 'C', 'A'])
  })

  it('[INV-98 锚] x 带外越缘不触发（触发带语义保留——带外 stretch 恒无）', () => {
    const frame = setup()
    beginDrag(frame)
    pMove(650, 250)
    expect(frame.classList.contains('stretch')).toBe(false)
    const ph = q('.drag-slot:not(.cand)')
    expect(ph?.classList.contains('faded')).toBe(true)
  })
})
