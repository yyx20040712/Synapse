// @vitest-environment jsdom
/**
 * [F-VISFB-67 U2] 地板化 own/screen 分离回归（jsdom）——scrollLeft 属
 * screen 域滚动状态、W/capacity 输入属 own 域布局读数，两轴正交：
 * 地板三改（min-width 577+flex-shrink:0+overflow-x:auto）引入横向滚动后，
 * 横滚不得成为 W 重读/分行重算/routeEpoch 的新触发源（use-capacity-layout
 * 量测链=RO→rAF→computed width 单源；scroll 事件不在链上——本件锁该契约）。
 * 候选槽（candidateSlotAt）=纯算术 (index,W) 单源——W 不变则槽域不变，
 * 随 W 不变断言面成立（jsdom 无拖拽会话，真机面归 e2e V67-03）。
 * always-active 裸 describe（K3）。W 注入=getComputedStyle 包装 mock
 * （lineage-visfb31-ownscale.test.tsx 同法）。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createRef } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { ReactElement, RefObject } from 'react'
import type { LineageNode } from '../../../src/shared/models/lineage'
import { LineageTimeline } from '../../../src/renderer/features/lineage/LineageTimeline'
import { useCapacityLayout, readFrameContentWidth } from '../../../src/renderer/features/lineage/use-capacity-layout'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

function node(id: string): LineageNode {
  return {
    id,
    paperId: `paper-${id}`,
    title: `节点${id}`,
    year: 2022,
    x: null,
    y: null,
    month: 5,
    slot: null,
    folderId: '__main__',
    createdAt: 't',
    updatedAt: 't'
  }
}

let root: Root | null = null
let host: HTMLDivElement | null = null
let frameReads = 0

/**
 * W 注入（.month-frame 元素 computed 五值——width 577 + 左右 padding 12 +
 * 左右 border 1.6；[R3 裁定] use-capacity-layout 读数归一化为内容盒宽
 * 577−27.2=549.8=capacity 生产真实输入域；其余元素透传原实现）
 */
function injectComputedFrameStyle(): void {
  const orig = window.getComputedStyle
  vi.spyOn(window, 'getComputedStyle').mockImplementation(((el: Element, pseudo?: string | null) => {
    if (el instanceof HTMLElement && el.classList.contains('month-frame')) {
      const style = orig.call(window, el, pseudo)
      frameReads++
      const stub: Record<string, string> = {
        width: '577px',
        paddingLeft: '12px',
        paddingRight: '12px',
        borderLeftWidth: '1.6px',
        borderRightWidth: '1.6px'
      }
      return new Proxy(style, {
        get(target, prop, receiver) {
          if (prop in stub) return stub[prop as string]
          return Reflect.get(target, prop, receiver)
        }
      })
    }
    return orig.call(window, el, pseudo)
  }) as typeof window.getComputedStyle)
}

beforeEach(() => {
  frameReads = 0
  injectComputedFrameStyle()
})

afterEach(() => {
  vi.restoreAllMocks()
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
})

describe('[F-VISFB-67] 地板三改消费面（own/screen 分离——scrollLeft 不触 W/分行/routeEpoch）', () => {
  it('W=577 measured 分行 [3,2]+scrollLeft 变更+scroll 事件后：行形态不变+W 读数次数不变（无新触发源）', () => {
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    const nodes = [node('A'), node('B'), node('C'), node('D'), node('E')]
    act(() => {
      root?.render(
        <LineageTimeline nodes={nodes} edges={[]} onNodeClick={() => undefined} onReorderMonthSlots={() => undefined} />
      )
    })
    // [R3 裁定] measured W=内容盒宽 549.8（computed 577−24 padding−3.2 border
    // 归一化——capacity 生产真实输入域）→ partitionRows(5,549.8)=[3,2]（n=3/m=2
    // 与 577 域同段——地板参考形不变）；挂载帧同步首读=唯一一次 W 读
    const frame = host.querySelector('.month-frame')
    expect(frame).not.toBeNull()
    const rowsBefore = Array.from(frame?.children ?? [])
      .filter((el) => el.classList.contains('tl-row'))
      .map((r) => r.querySelectorAll('.tl-card').length)
    expect(rowsBefore).toEqual([3, 2])
    const readsAfterMount = frameReads
    expect(readsAfterMount).toBeGreaterThan(0)
    // screen 域扰动：scrollLeft 赋值+scroll 事件派发（横向滚动状态变更全模拟）
    const timeline = host.querySelector('.timeline') as HTMLElement
    timeline.scrollLeft = 233
    timeline.dispatchEvent(new Event('scroll', { bubbles: true }))
    // own 域不变量：行形态零变化+W 零重读（scroll 不在量测链上——epoch 直断
    // 归独立用例 [轮 3 W6] 承载）
    const rowsAfter = Array.from(frame?.children ?? [])
      .filter((el) => el.classList.contains('tl-row'))
      .map((r) => r.querySelectorAll('.tl-card').length)
    expect(rowsAfter).toEqual([3, 2])
    expect(frameReads, 'scrollLeft/scroll 后 W 读数次数不变（无重读=无 bump 源）').toBe(readsAfterMount)
  })

  it('[轮 3 W6] routeEpoch 直断：scrollLeft/scroll 扰动前后 epoch 相等（Probe 暴露 hook 返回值——无新触发源的直证非间接面）', () => {
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    /** 探针 B：frameW/routeEpoch 双暴露（data-w/data-epoch） */
    function EpochProbe({ contentRef }: { contentRef: RefObject<HTMLDivElement | null> }): ReactElement {
      const { frameW, routeEpoch } = useCapacityLayout({ contentRef, recomputeKey: 0 })
      return (
        <div
          ref={(el) => {
            ;(contentRef as { current: HTMLDivElement | null }).current = el
          }}
        >
          <div className="month-frame" data-w={frameW} data-epoch={routeEpoch} />
        </div>
      )
    }
    const ref: RefObject<HTMLDivElement | null> = createRef()
    act(() => {
      root?.render(<EpochProbe contentRef={ref} />)
    })
    const frame = host.querySelector('.month-frame')
    expect(frame).not.toBeNull()
    const epochBefore = Number(frame?.getAttribute('data-epoch'))
    // 滚动容器=contentRef 容器（探针结构不含 .timeline 类——滚动扰动面同构）
    const scroller = ref.current
    expect(scroller, '滚动容器缺席').not.toBeNull()
    const sc = scroller as HTMLDivElement
    sc.scrollLeft = 400
    sc.dispatchEvent(new Event('scroll', { bubbles: true }))
    expect(Number(frame?.getAttribute('data-epoch')), 'scroll 扰动后 routeEpoch 不变').toBe(epochBefore)
  })

  it('[轮 3 N1] 空图复位 unmeasured：月框移除→frameW 归 0（残留末次 measured 值即红——头注「空图=unmeasured 保持」语义兑现）', () => {
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    const ref: RefObject<HTMLDivElement | null> = createRef()
    /** 探针 C：withFrame 开关（true=渲染 .month-frame/false=空图） */
    function EmptyProbe({ contentRef, withFrame }: { contentRef: RefObject<HTMLDivElement | null>; withFrame: boolean }): ReactElement {
      const { frameW } = useCapacityLayout({ contentRef, recomputeKey: withFrame })
      return (
        <div
          ref={(el) => {
            ;(contentRef as { current: HTMLDivElement | null }).current = el
          }}
        >
          {withFrame ? <div className="month-frame" data-w={frameW} /> : <div data-w={frameW} />}
        </div>
      )
    }
    act(() => {
      root?.render(<EmptyProbe contentRef={ref} withFrame />)
    })
    const w1 = Number(host.querySelector('[data-w]')?.getAttribute('data-w'))
    expect(w1).toBeCloseTo(549.8, 6)
    // 空图（无月框）→ read 复位 unmeasured（recomputeKey 变化驱动 effect 重读）
    act(() => {
      root?.render(<EmptyProbe contentRef={ref} withFrame={false} />)
    })
    const w2 = Number(host.querySelector('[data-w]')?.getAttribute('data-w'))
    expect(w2, '空图 frameW 归 0（unmeasured 复位——残留 549.8 即红）').toBe(0)
  })

  it('[轮 3 B1·轮 4 N-3] readFrameContentWidth 导出单源：与 hook 读数同式（577−27.2=549.8；raw computed width 直读=577 分叉即红）+1px used border 变体（551 同段）', () => {
    host = document.createElement('div')
    document.body.appendChild(host)
    const frame = document.createElement('div')
    frame.className = 'month-frame'
    host.appendChild(frame)
    expect(readFrameContentWidth(frame)).toBeCloseTo(549.8, 6)
    // [轮 4 N-3] used border 变体：Linux DPR1 真机 used 1px/侧（声明 1.6 落定
    // 1）→ 577−24−2=551（值驱动非声明驱动）；551 仍 n=3/m=2 同段（地板形不随
    // 口径差漂移——528 段界安全距>2px）
    vi.restoreAllMocks()
    const orig = window.getComputedStyle
    vi.spyOn(window, 'getComputedStyle').mockImplementation(((el: Element, pseudo?: string | null) => {
      const real = orig.call(window, el, pseudo)
      if (el instanceof HTMLElement && el.classList.contains('month-frame')) {
        const stub: Record<string, string> = {
          width: '577px',
          paddingLeft: '12px',
          paddingRight: '12px',
          borderLeftWidth: '1px',
          borderRightWidth: '1px'
        }
        return new Proxy(real, {
          get(target, prop, receiver) {
            if (prop in stub) return stub[prop as string]
            return Reflect.get(target, prop, receiver)
          }
        })
      }
      return real
    }) as typeof window.getComputedStyle)
    expect(readFrameContentWidth(frame)).toBeCloseTo(551, 6)
  })

  it('[R3 裁定] 归一化读数：frameW=computed width−padL−padR−borderL−borderR（577−12−12−1.6−1.6=549.8 内容盒宽——capacity 契约「月框内容坐标」对齐；改前直读 577=存量契约错位即红）', () => {
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    /** hook 探针：frameW 透传到 data-w（jsdom 直测读数——不经行形态间接判别） */
    function WProbe({ contentRef }: { contentRef: RefObject<HTMLDivElement | null> }) {
      const { frameW } = useCapacityLayout({ contentRef, recomputeKey: 0 })
      return (
        <div
          ref={(el) => {
            // RefObject.current 类型只读——经可写视图装载（hook 消费同对象）
            ;(contentRef as { current: HTMLDivElement | null }).current = el
          }}
        >
          <div className="month-frame" data-w={frameW} />
        </div>
      )
    }
    const probeRef = createRef<HTMLDivElement>()
    act(() => {
      root?.render(<WProbe contentRef={probeRef} />)
    })
    const frame = host.querySelector('.month-frame')
    expect(frame).not.toBeNull()
    const frameW = Number(frame?.getAttribute('data-w'))
    expect(frameW).toBeCloseTo(549.8, 6)
  })
})
