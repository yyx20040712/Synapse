// @vitest-environment jsdom
/**
 * [审查回炉批 2026-11-22] B3 独立审查 FAIL 处置单新增锚单文件（既有 B3 族
 * 文件 max-lines 顶格——回炉锚集中驻本件，申报见设计稿 §14 回炉注记）。
 * 先红后绿记录：R1 两例/F9/F10/G13 对缺陷实现红、修复后绿（G13 驻
 * lineage-b3-guard）；L6/F11/本件其余=守卫锚（现状绿）。
 *
 * - R1 u=1.25 与 z=1.25 两档「首次 flush 后立即断言 translate」（探针 16px 8px
 *   口径——激活帧 ghost=pointerdown 时点卡位 toOwn+client 域指针差 ÷s_eff，
 *   grab 偏移冻结语义+精确 own 差值；旧式 client 域偏移直减=4px 0.8px 红）。
 *   既有 own-scale 用例只断言第二次 move（写回已生效），捕获不了本缺陷。
 * - F9（回炉 R2）：pending scrollDirty 不吞待激活指针——过阈 move→FRAME_EVENT→
 *   首次 flush=同帧激活批入 dragging。
 * - F10（回炉 W2）：卸载残帧代次失效——卸载后冲洗已捕获 rAF 两次=零重排零自续。
 * - L6（回炉 W5）：padding 回落纯 600ms 兜底释放独立例（完全无 end/cancel）。
 * - F11（回炉 W5）：pointermove 事件域零布局读取——原型级完整读 spy
 *   （gBCR/computed/offset 族/scrollTop），读只发生在 flush 帧批。
 *   已知边界（登记）：原型级 spy 不统计元素自有 spy 覆盖的读取
 *   （stubRect 逐元素 mock 的 gBCR 不入 log）——判别面以原型族为准。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { LineageNode } from '../../../src/shared/models/lineage'
import type * as CapacityLayout from '../../../src/renderer/features/lineage/use-capacity-layout'
import { LineageTimeline } from '../../../src/renderer/features/lineage/LineageTimeline'
import { useLineageViewStore } from '../../../src/renderer/features/lineage/lineage-view.store'
import { stubLiveFrame } from '../../utils/live-frame'

const routeBump = vi.hoisted(() => vi.fn())
vi.mock('../../../src/renderer/features/lineage/use-capacity-layout', async () => {
  const path = '../../../src/renderer/features/lineage/use-capacity-layout'
  const actual = await vi.importActual<typeof CapacityLayout>(path)
  return {
    ...actual,
    useCapacityLayout: (args: Parameters<typeof actual.useCapacityLayout>[0]) => {
      const layout = actual.useCapacityLayout(args)
      return {
        ...layout,
        bumpRoute: () => {
          routeBump()
          layout.bumpRoute()
        }
      }
    }
  }
})
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

function mount(nodes: LineageNode[]): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(<LineageTimeline nodes={nodes} edges={[]} onReorderMonthSlots={reorder} />)
  })
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
const fireEndBoth = (el: Element): void => {
  act(() => {
    el.dispatchEvent(Object.assign(new Event('transitionend'), { propertyName: 'left' }))
    el.dispatchEvent(Object.assign(new Event('transitionend'), { propertyName: 'translate' }))
  })
}

function stubRect(el: Element, x: number, y: number, w = 128, h = 72): void {
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
    left: x, top: y, right: x + w, bottom: y + h, width: w, height: h, x, y,
    toJSON: () => ({})
  } as unknown as DOMRect)
}

/** uiScale 注入（App.tsx 同法——documentElement 单点写） */
const setU = (v: string): void => {
  document.documentElement.style.setProperty('--ui-scale', v)
}

let rafs: FrameRequestCallback[] = []
beforeEach(() => {
  rafs = []
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback): number => {
    rafs.push(cb)
    return rafs.length
  })
  vi.stubGlobal('cancelAnimationFrame', () => undefined)
  reorder.mockClear()
  routeBump.mockClear()
  useLineageViewStore.setState({ mode: 'browse', focusSet: [], navCollapsed: false, navWidth: 208, zoom: 1, tool: 'select' })
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
  vi.useRealTimers()
  document.documentElement.style.removeProperty('--ui-scale')
})
const flushRaf = (): void => {
  act(() => {
    rafs.splice(0).forEach((cb) => {
      cb(performance.now())
    })
  })
}

describe('[审查回炉批] B3 独立审查新增锚（R1/F9/F10/L6/F11）', () => {
  it('R1 激活帧首 flush translate=grab 冻结基准 own 域位移精确值（u=1.25 档）：探针 16px 8px 口径（旧式 client 域偏移直减=4px 0.8px 红）', () => {
    // 既有 own-scale 用例只断言第二次 move（写回已生效）——本例锁「首次 flush 后
    // 立即」的激活帧坐标域（审查探针同坐标：card=(250,130,160×90)、down=(310,166)、
    // move=(330,176)→own 差值=(20,10)/1.25=(16,8)）
    mount([node('A'), node('B'), node('C')])
    setU('1.25')
    stubRect(cardOf('A'), 250, 130, 160, 90)
    stubRect(req('.month-frame'), 0, 0, 600, 200)
    pDown(cardOf('A'), 310, 166)
    pMove(330, 176)
    flushRaf() // 激活帧批
    expect(cardOf('A').style.translate, 'INV-96/144 渲染位恒等式——激活帧即 own 域差值').toBe('16px 8px')
    pUp(330, 176)
    fireEndBoth(cardOf('A'))
  })

  it('R1 激活帧首 flush translate=grab 冻结基准 own 域位移精确值（z=1.25 档，u=1）：zoom 与 uiScale 双因子正交同律', () => {
    mount([node('A'), node('B'), node('C')])
    act(() => {
      useLineageViewStore.setState({ zoom: 1.25 })
    })
    stubRect(cardOf('A'), 250, 130, 160, 90)
    stubRect(req('.month-frame'), 0, 0, 600, 200)
    pDown(cardOf('A'), 310, 166)
    pMove(330, 176)
    flushRaf() // 激活帧批（s_eff=z×u=1.25×1）
    expect(cardOf('A').style.translate, 's_eff=1.25：own 差值=(16,8)——与 u 档同口径').toBe('16px 8px')
    pUp(330, 176)
    fireEndBoth(cardOf('A'))
  })

  it('F9 pending scrollDirty 不吞待激活指针（回炉 R2）：过阈 move→FRAME_EVENT→首次 flush=同帧激活批入 dragging（红因=滚动子批未激活不跑指针批且无条件清 pointerDirty）', () => {
    mount([node('A'), node('B')])
    stubRect(cardOf('A'), 12, 18)
    stubRect(req('.month-frame'), 0, 0, 600, 200)
    pDown(cardOf('A'), 60, 40)
    pMove(66, 44) // 过阈 latch 置位+pointerDirty+schedule（故意不 flush）
    act(() => {
      req('.timeline').dispatchEvent(new CustomEvent('synapse-autoscroll-frame')) // 只标 scrollDirty
    })
    flushRaf() // 帧批：滚动子批须同帧执行激活批（读施滚后 rect）
    expect(cardOf('A').classList.contains('dragging')).toBe(true)
    pUp(66, 44)
    fireEndBoth(cardOf('A'))
  })

  it('F10 卸载残帧代次失效（回炉 W2）：卸载后冲洗已捕获 rAF 两次=零重排零自续（红因=gen 仅在下一 effect 建立时递增+sessionRef 未清）', () => {
    mount([node('A'), node('B')])
    stubRect(cardOf('A'), 12, 18)
    stubRect(req('.month-frame'), 0, 0, 600, 200)
    pDown(cardOf('A'), 60, 40)
    pMove(66, 44)
    flushRaf() // 激活→自续泵排下一帧（rafs 在飞 1）
    act(() => {
      root?.unmount()
    })
    root = null
    flushRaf()
    flushRaf()
    expect(rafs, '残帧凭代次过期+会话清空双守卫 no-op——不得重排自续').toHaveLength(0)
  })

  it('L6 padding 回落纯 600ms 兜底释放（回炉 W5——完全无 end/cancel）：兜底到点=恰一次布局终局，重复推进幂等（守卫）', () => {
    vi.useFakeTimers()
    mount([node('A'), node('B'), node('C')])
    const frame = req('.month-frame') as HTMLElement
    stubLiveFrame(frame, { baseBottom: 200, stretchPad: 120, slotRowGrow: 92, width: 600 })
    stubRect(cardOf('A'), 12, 18)
    pDown(cardOf('A'), 60, 40)
    pMove(66, 44)
    flushRaf()
    pMove(240, 250) // 入带→.stretch 挂载（已提交）
    flushRaf()
    expect(frame.classList.contains('stretch')).toBe(true)
    routeBump.mockClear()
    pUp(240, 250) // settle 提交摘 .stretch=回落跟踪启动（无任何过渡事件派发）
    fireEndBoth(cardOf('A')) // flight 完成——布局不得提前终局
    expect(routeBump).not.toHaveBeenCalled()
    act(() => {
      vi.advanceTimersByTime(600) // 兜底到点（唯一释放源）
    })
    expect(routeBump, '纯兜底释放=恰一次布局终局').toHaveBeenCalledTimes(1)
    act(() => {
      vi.advanceTimersByTime(1200)
    })
    expect(routeBump, '兜底幂等（不二次终局）').toHaveBeenCalledTimes(1)
  })

  it('F11 pointermove 事件域零布局读取（回炉 W5——原型级完整读 spy）：pending/dragging 两态 move 派发零 gBCR/computed/offset/scroll 读；读只发生在 flush 帧批', () => {
    mount([node('A'), node('B')])
    stubRect(cardOf('A'), 12, 18)
    stubRect(req('.month-frame'), 0, 0, 600, 200)
    pDown(cardOf('A'), 60, 40) // pointerdown 允许读（grab 基准）——spy 随后安装
    const log: string[] = []
    const zeroRect = { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0, toJSON: () => ({}) } as DOMRect
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      log.push(`gBCR:${this.className || this.tagName}`)
      return zeroRect
    })
    const realGcs = window.getComputedStyle.bind(window)
    vi.spyOn(window, 'getComputedStyle').mockImplementation(((el: Element, pseudo?: string | null) => {
      log.push('read:computed')
      return realGcs(el, pseudo)
    }) as typeof window.getComputedStyle)
    for (const key of ['offsetWidth', 'offsetHeight', 'offsetLeft', 'offsetTop'] as const) {
      vi.spyOn(HTMLElement.prototype, key, 'get').mockImplementation(function (this: HTMLElement) {
        log.push(`read:${key}`)
        return 0
      })
    }
    for (const key of ['scrollTop', 'scrollLeft'] as const) {
      vi.spyOn(Element.prototype, key, 'get').mockImplementation(function (this: Element) {
        log.push(`read:${key}`)
        return 0
      })
    }
    expect(log).toHaveLength(0)
    pMove(62, 41) // 未过阈 pending move（仅记 lastClient）
    expect(log, 'pending 未过阈 move 事件域零布局读取').toHaveLength(0)
    pMove(100, 60) // 过阈 latch+schedule（零读零写零提交——迁移 3/4/7）
    expect(log, 'pending 过阈 move 事件域零布局读取').toHaveLength(0)
    flushRaf() // 帧批=读的合法时点（spy 非恒空自证）
    expect(log.length, 'flush 帧批读批在场').toBeGreaterThan(0)
    log.length = 0
    pMove(120, 70) // dragging 期事件域
    expect(log, 'dragging move 事件域零布局读取').toHaveLength(0)
    flushRaf()
    expect(log.length, 'dragging 帧批读批在场').toBeGreaterThan(0)
    pUp(120, 70)
    fireEndBoth(cardOf('A'))
  })
})
