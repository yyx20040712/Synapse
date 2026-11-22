// @vitest-environment jsdom
/**
 * [回炉 W4b/W4c] 布局终局挂起窗守卫的 jsdom 可判锚（B3 独立审查 W4——三机制
 * 无自动判别面补锚之二；飞行七步序锚驻 lineage-card-flight 直测件）。两例现状
 * 绿（守卫已实现）——判别力由备份法变异证红承载（先红后绿=变异红）：
 * - W4b 变异=删 timeline-zoom-hook measure() 顶部挂起守卫→红；
 * - W4c 变异=删 use-lineage-routes run() 顶部挂起守卫→红。
 *
 * 判别原理（挂起窗=dragging 激活起→布局终局止的单一连续窗——设计稿 §3.5）：
 * - W4b zoom measure 守卫锚：挂起窗内 zoom effect 重跑（nodes 克隆=layoutKey
 *   变化）与 RO 回调（ResizeObserver 桩）都不得触发 content 量测（offsetWidth
 *   读零增长）；布局终局（layoutEpoch bump→effect 重跑）后恰一次最终量测。
 *   量测读面=content.offsetWidth（zoom measure 唯一读点——use-capacity-layout
 *   读 computed 五值、buildSnapshot 读 gBCR，均不触 content.offsetWidth）。
 * - W4c routes run 守卫锚：挂起窗内 RO 回调→run 早退（零 buildSnapshot/publish）；
 *   布局终局 routeEpoch bump→effect 重跑恰一次最终重算。buildSnapshot/publish 经
 *   vi.mock 透传包装计数（实现零替换——行为面零变）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { LineageNode } from '../../../src/shared/models/lineage'
import type * as EdgeGeom from '../../../src/renderer/features/lineage/edge-overlay-geom'
import type * as AnchorOccupancy from '../../../src/renderer/features/lineage/anchor-occupancy'
import { LineageTimeline } from '../../../src/renderer/features/lineage/LineageTimeline'
import { useLineageViewStore } from '../../../src/renderer/features/lineage/lineage-view.store'

const buildSnapshotCalls = vi.hoisted(() => vi.fn())
vi.mock('../../../src/renderer/features/lineage/edge-overlay-geom', async () => {
  const actual = await vi.importActual<typeof EdgeGeom>('../../../src/renderer/features/lineage/edge-overlay-geom')
  return {
    ...actual,
    buildSnapshot: (content: HTMLElement): ReturnType<typeof EdgeGeom.buildSnapshot> => {
      // [计数域过滤] buildSnapshot 另有 use-edge-edit 采集消费方（调线域重采集，
      // 非挂起守卫面）——仅统计 use-lineage-routes run 帧内的调用（调用栈判别）
      if (new Error().stack?.includes('use-lineage-routes') === true) buildSnapshotCalls()
      return actual.buildSnapshot(content)
    }
  }
})
const publishCalls = vi.hoisted(() => vi.fn())
vi.mock('../../../src/renderer/features/lineage/anchor-occupancy', async () => {
  const actual = await vi.importActual<typeof AnchorOccupancy>(
    '../../../src/renderer/features/lineage/anchor-occupancy'
  )
  return {
    ...actual,
    publish: (paths: Parameters<typeof actual.publish>[0]): void => {
      publishCalls()
      return actual.publish(paths)
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

function mount(nodes: LineageNode[]): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(<LineageTimeline nodes={nodes} edges={[]} onNodeClick={vi.fn()} onReorderMonthSlots={vi.fn()} />)
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
const fireEndTranslate = (el: Element): void => {
  act(() => {
    el.dispatchEvent(Object.assign(new Event('transitionend'), { propertyName: 'translate' }))
  })
}

function stubRect(el: Element, x: number, y: number, w = 128, h = 72): void {
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
    left: x, top: y, right: x + w, bottom: y + h, width: w, height: h, x, y,
    toJSON: () => ({})
  } as unknown as DOMRect)
}

// ── ResizeObserver 桩（jsdom 无 RO——挂起窗 RO 回调路径由此驱动；记录观察元素）──
interface RoRecord {
  cb: ResizeObserverCallback
  el: Element | null
}
const roRecords: RoRecord[] = []
class ResizeObserverStub {
  private readonly rec: RoRecord
  constructor(cb: ResizeObserverCallback) {
    this.rec = { cb, el: null }
    roRecords.push(this.rec)
  }
  observe(el: Element): void {
    this.rec.el = el
  }
  unobserve(): void {}
  disconnect(): void {}
}
/** 触发观察 el 的 RO 回调（缺省=全部记录）；回调经 rAF 合并——触发后须 flushRaf */
const triggerRO = (el?: Element): void => {
  act(() => {
    for (const rec of roRecords) {
      if (el === undefined || rec.el === el) rec.cb([], rec as unknown as ResizeObserver)
    }
  })
}

let rafs: FrameRequestCallback[] = []
beforeEach(() => {
  rafs = []
  roRecords.length = 0
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback): number => {
    rafs.push(cb)
    return rafs.length
  })
  vi.stubGlobal('cancelAnimationFrame', () => undefined)
  vi.stubGlobal('ResizeObserver', ResizeObserverStub)
  buildSnapshotCalls.mockClear()
  publishCalls.mockClear()
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
})
const flushRaf = (): void => {
  act(() => {
    rafs.splice(0).forEach((cb) => {
      cb(performance.now())
    })
  })
}

describe('[回炉 W4b/W4c] 布局终局挂起窗守卫可判锚（现状绿——判别力由变异证红承载）', () => {
  it('W4b zoom measure 挂起守卫锚：挂起窗内 effect 重跑/RO 回调=零 content 量测读；布局终局后恰一次最终量测', async () => {
    mount([node('A'), node('B')])
    flushRaf() // 挂载期 rAF 批（routes 首算等）出队
    stubRect(cardOf('A'), 12, 18)
    stubRect(req('.month-frame'), 0, 0, 600, 200)
    const content = req('.tl-content') as HTMLElement
    let reads = 0
    vi.spyOn(content, 'offsetWidth', 'get').mockImplementation(() => {
      reads += 1
      return 0
    })
    const base = reads
    // 激活→挂起窗开（barrier.begin——dragging 激活起）
    pDown(cardOf('A'), 60, 40)
    pMove(66, 44)
    flushRaf()
    expect(reads, '激活 flush 本身不量测（zoom effect 不随 phase 重跑）').toBe(base)
    // 挂起窗内 effect 重跑：nodes 克隆=layoutKey 变化→zoom effect 重跑→measure 守卫早退
    const nodes2 = [node('A'), node('B')].map((n) => ({ ...n }))
    await act(async () => {
      root?.render(<LineageTimeline nodes={nodes2} edges={[]} onNodeClick={vi.fn()} onReorderMonthSlots={vi.fn()} />)
    })
    expect(reads, '挂起窗内 effect 重跑=零 measure（删守卫变异即红）').toBe(base)
    // 挂起窗内 RO 回调（重跑后新 RO 观察集）→measure 守卫早退
    triggerRO(content)
    flushRaf()
    expect(reads, '挂起窗内 RO 回调=零 measure').toBe(base)
    // 布局终局：flight finish→layoutFinishOnce（先释放挂起再 bump 两 epoch）→
    // layoutEpoch 入 layoutKey→effect 重跑=最终量测恰一次
    pUp(66, 44)
    fireEndTranslate(cardOf('A'))
    flushRaf()
    expect(reads, '布局终局后恰一次最终量测（offsetWidth 每 measure 读一次）').toBe(base + 1)
  })

  it('W4c routes run 挂起守卫锚：挂起窗内 RO 回调=零 buildSnapshot/publish；布局终局后 run 恰一次最终重算', () => {
    mount([node('A'), node('B')])
    flushRaf() // 挂载首算（非挂起）
    stubRect(cardOf('A'), 12, 18)
    stubRect(req('.month-frame'), 0, 0, 600, 200)
    // 基线（routes 域计数——use-edge-edit 采集不混入）；publish=plan 非零才发
    const bSnap = buildSnapshotCalls.mock.calls.length
    const bPub = publishCalls.mock.calls.length
    expect(bSnap, '挂载首算在场（非恒空自证）').toBeGreaterThan(0)
    pDown(cardOf('A'), 60, 40)
    pMove(66, 44)
    flushRaf() // 激活→挂起窗开
    expect(buildSnapshotCalls.mock.calls.length).toBe(bSnap)
    // 挂起窗内 RO 回调×2→run 早退（零 buildSnapshot/publish；删守卫变异即红）
    const content = req('.tl-content')
    triggerRO(content)
    flushRaf()
    triggerRO(content)
    flushRaf()
    expect(buildSnapshotCalls.mock.calls.length, '挂起窗内 RO 回调零 buildSnapshot').toBe(bSnap)
    expect(publishCalls.mock.calls.length, '挂起窗内 RO 回调零 publish').toBe(bPub)
    // 布局终局：routeEpoch bump→routes effect 重跑→run 恰一次（buildSnapshot+1、
    // publish+1——终局 run=布局差分 full 档恰一次发布）
    pUp(66, 44)
    fireEndTranslate(cardOf('A'))
    flushRaf()
    expect(buildSnapshotCalls.mock.calls.length, '布局终局后 run 恰一次最终重算').toBe(bSnap + 1)
    expect(publishCalls.mock.calls.length, '布局终局后恰一次发布').toBe(bPub + 1)
  })
})
