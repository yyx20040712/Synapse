// @vitest-environment jsdom
/**
 * [B3 §8 B6/§13 commit B 门] render-count 探针 + 无输入帧零几何读直测
 * （实现批新增——设计稿 §13 commit B 验证门点名面，先红后绿随批申报）。
 *
 * - render-count 探针：slot 瞬态变化只重渲染源月框子树——非源月框组件渲染
 *   计数=0 增量。计数载体=TimelineMonthFrame 模块 mock 包装（memo 保形：
 *   包装件与本体内体同 shallow 比较+父件 isSrc 门控同形，计数值=真实 render
 *   函数执行数）。红因=现行 TimelineMonthFrame 无 memo 且 TimelineYears 向
 *   全部月框传 slot 瞬态对象+renderCard 每渲染重建——slot 瞬态整树月框重渲染。
 * - 无输入帧零拖拽几何读（§3.1 O2/AS-02 泵续跑面）：激活后连续冲洗无指针帧
 *   ——帧循环自续泵空转，content/frame/card gBCR 读零增长（autoscroll 泵自耗
 *   〔容器 rect/scrollTop〕另计——不在 spy 面）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { LineageNode } from '../../../src/shared/models/lineage'
import type * as MonthFrameModule from '../../../src/renderer/features/lineage/TimelineMonthFrame'
import type * as ReactModule from 'react'
import type { TimelineMonthFrameProps } from '../../../src/renderer/features/lineage/TimelineMonthFrame'
import { LineageTimeline } from '../../../src/renderer/features/lineage/LineageTimeline'
import { useLineageViewStore } from '../../../src/renderer/features/lineage/lineage-view.store'

const frameRenders = vi.hoisted(() => ({ byMonth: new Map<string, number>() }))
vi.mock('../../../src/renderer/features/lineage/TimelineMonthFrame', async () => {
  const [actual, react] = await Promise.all([
    vi.importActual('../../../src/renderer/features/lineage/TimelineMonthFrame') as Promise<typeof MonthFrameModule>,
    vi.importActual('react') as Promise<typeof ReactModule>
  ])
  const Real = actual.TimelineMonthFrame
  // [回炉 W3] 仪器化保留生产件 memo 真实状态：不得无条件 react.memo(Probe)——
  // 删生产 TimelineMonthFrame memo 后探针仍绿=遮蔽被测面（memo 配套语义失效
  // 不可见）。判据=React memo exotic 组件标记（生产件在册→计数包装件同形 memo；
  // 生产件裸函数→包装件同样裸挂——计数值=该形态下真实 render 执行数）
  const realMemoized =
    typeof Real === 'object' &&
    Real !== null &&
    (Real as { $$typeof?: unknown }).$$typeof === Symbol.for('react.memo')
  // 计数包装件（memo 保形——包装件与本体内体同 shallow 比较：计数值=本体 render 执行数）
  const Probe = (props: TimelineMonthFrameProps): JSX.Element => {
    const key = `${String(props.year)}-${props.month === null ? 'null' : String(props.month)}`
    frameRenders.byMonth.set(key, (frameRenders.byMonth.get(key) ?? 0) + 1)
    const Real2 = Real as unknown as (p: TimelineMonthFrameProps) => JSX.Element
    return <Real2 {...props} />
  }
  return { TimelineMonthFrame: realMemoized ? react.memo(Probe) : Probe }
})

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

function stubRect(el: Element, x: number, y: number, w = 128, h = 72): { count: () => number } {
  let n = 0
  vi.spyOn(el, 'getBoundingClientRect').mockImplementation(() => {
    n += 1
    return { left: x, top: y, right: x + w, bottom: y + h, width: w, height: h, x, y, toJSON: () => ({}) } as unknown as DOMRect
  })
  return { count: () => n }
}

let rafs: FrameRequestCallback[] = []
beforeEach(() => {
  rafs = []
  frameRenders.byMonth.clear()
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback): number => {
    rafs.push(cb)
    return rafs.length
  })
  vi.stubGlobal('cancelAnimationFrame', () => undefined)
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
const rendersOf = (month: number): number => frameRenders.byMonth.get(`2022-${month}`) ?? 0

describe('[B3 §8/§13 B 门] render-count 探针（先红后绿——实现批新增申报）', () => {
  it('slot 瞬态变化只重渲染源月框子树：非源月框组件渲染计数=0 增量', () => {
    mount([node('A'), node('B'), node('C'), node('D', { month: 8 })])
    const before9 = rendersOf(9)
    const before8 = rendersOf(8)
    pDown(cardOf('A'), 60, 40)
    pMove(66, 44)
    flushRaf() // 激活提交（源月框=2022-9 渲染）
    expect(rendersOf(9), '源月框随激活提交渲染').toBeGreaterThan(before9)
    expect(rendersOf(8), '非源月框=0 增量（红因=现行无 memo+全帧 slot 透传+renderCard 每渲染重建）').toBe(before8)
    pMove(480, 40) // 跨槽瞬态（insertIdx 变化）
    flushRaf()
    pMove(300, 400) // overFrame 翻转瞬态（框外淡化）
    flushRaf()
    pMove(480, 40) // 回框瞬态
    flushRaf()
    expect(rendersOf(9)).toBeGreaterThan(before9)
    expect(rendersOf(8), 'slot 瞬态（insertIdx/overFrame 翻转）不得触碰非源月框').toBe(before8)
  })

  it('无输入帧=泵空转零拖拽几何读：激活后连续冲洗无指针帧——content/frame/card gBCR 读零增长（O2/泵自耗另计）', () => {
    mount([node('A'), node('B')])
    const content = stubRect(req('.tl-content'), 0, 0, 0, 0)
    const frame = stubRect(req('.month-frame'), 0, 0, 600, 200)
    const card = stubRect(cardOf('A'), 12, 18)
    pDown(cardOf('A'), 60, 40)
    pMove(66, 44)
    flushRaf() // 激活帧（读批；挂载期 routes/nav 读一并冲洗）——计数器在位守卫
    const base = { content: content.count(), frame: frame.count(), card: card.count() }
    expect(base.content).toBeGreaterThan(0)
    flushRaf()
    flushRaf()
    flushRaf() // 无输入帧×3——帧循环自续泵空转
    expect(content.count(), '无指针帧零 content 读').toBe(base.content)
    expect(frame.count(), '无指针帧零 frame 读').toBe(base.frame)
    expect(card.count(), '无指针帧零 card 读').toBe(base.card)
  })
})
