// @vitest-environment jsdom
/**
 * [B3 设计先行] F-b 拖拽帧协议红测试（设计稿
 * docs/design/2026-11-22_b3-drag-frame-g-g2-design.md §3/§11——设计稿先于
 * 实现：本件除 L4 布局终局守卫外，用例对当前 src 为红，实现批
 * （plan-v1.md §5 B3 commit B「rAF+translate」）后转绿，测试正文零改）。
 *
 * 口径=DOM 面+全局 rAF stub，不 import 未存在的调度器（设计稿 §11）；
 * 坐标锚（u=1）：卡 rect=(12,18)，down=(60,40)，o=(48,22)，ghost0=(12,18)；
 * move(66,44)→translate=(6,4)，move(100,60)→(40,20)，left/top=激活锚 0。
 * 调度器纯模块直测归实现批。
 *
 * 二轮修订：F3 拆非滚动/真实滚动双 oracle；F4 锁内联 transform 为空；
 * F8 锁 exceeded latch 置位后未 flush 的 cancel；L1-L3 锁布局终局屏障。
 * 三轮修订：F8 指针数学修正为真组末；F6 补出带变量清除；L4/L5 补
 * 拖中出带后的 padding 在途/已终局分流。
 * 终局清场用 fireEndBoth 双 propertyName 派发（现行 left/实现批 translate
 * 各自消费其一，finishOnce 幂等）。routeBump 只包装既有 useCapacityLayout
 * 返回值，用于观测 routeEpoch 的公开 bump 动作，不改几何与状态语义。
 */
import { act } from 'react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { stubLiveFrame } from '../../utils/live-frame'
import type { LineageNode } from '../../../src/shared/models/lineage'
import type * as CapacityLayout from '../../../src/renderer/features/lineage/use-capacity-layout'
import { LineageTimeline } from '../../../src/renderer/features/lineage/LineageTimeline'
import { useLineageViewStore } from '../../../src/renderer/features/lineage/lineage-view.store'

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
const onNodeClick = vi.fn()

function mount(nodes: LineageNode[]): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(
      <LineageTimeline nodes={nodes} edges={[]} onNodeClick={onNodeClick} onReorderMonthSlots={reorder} />
    )
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
/** 双 propertyName 派发（left=现行消费/translate=实现批消费——finishOnce 幂等） */
const fireEndBoth = (el: Element): void => {
  act(() => {
    el.dispatchEvent(Object.assign(new Event('transitionend'), { propertyName: 'left' }))
    el.dispatchEvent(Object.assign(new Event('transitionend'), { propertyName: 'translate' }))
  })
}

/** 几何定值（jsdom 零布局——gBCR spy 单源） */
function stubRect(el: Element, x: number, y: number, w = 128, h = 72): void {
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
    left: x, top: y, right: x + w, bottom: y + h, width: w, height: h, x, y,
    toJSON: () => ({})
  } as unknown as DOMRect)
}

const translateOf = (el: HTMLElement): string => el.style.getPropertyValue('translate')

/** 进带→出带的公共夹具；release 后 flow target=末指针 ghost=(192,158)，up 为零位移。 */
function mountExitedStretch(): { frame: HTMLElement; release: () => void } {
  mount([node('A'), node('B'), node('C')])
  const frame = req('.month-frame') as HTMLElement
  stubLiveFrame(frame, { baseBottom: 200, stretchPad: 120, slotRowGrow: 92, width: 600 })
  const card = cardOf('A')
  let released = false
  vi.spyOn(card, 'getBoundingClientRect').mockImplementation(() => {
    const x = released ? 192 : 12
    const y = released ? 158 : 18
    return { left: x, top: y, right: x + 128, bottom: y + 72, width: 128, height: 72, x, y, toJSON: () => ({}) } as DOMRect
  })
  pDown(card, 60, 40)
  pMove(66, 44)
  flushRaf()
  pMove(240, 250)
  flushRaf()
  expect(frame.classList.contains('stretch')).toBe(true)
  pMove(240, 180) // 回框内：extend true→false，padding 回落从此刻启动
  flushRaf()
  expect(frame.classList.contains('stretch')).toBe(false)
  return { frame, release: () => { released = true } }
}

// ── rAF 捕获队列（lineage-card-stretch stub 同族）：flushRaf=冲洗一帧 ──
let rafs: FrameRequestCallback[] = []
beforeEach(() => {
  rafs = []
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback): number => {
    rafs.push(cb)
    return rafs.length
  })
  vi.stubGlobal('cancelAnimationFrame', () => undefined)
  reorder.mockClear()
  onNodeClick.mockClear()
  routeBump.mockClear()
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
  vi.useRealTimers()
})
const flushRaf = (): void => {
  act(() => {
    rafs.splice(0).forEach((cb) => {
      cb(performance.now())
    })
  })
}
describe('[B3 红测试] 帧协议（rAF 合帧+读写批次+translate 化——L4 守卫外对当前 src 全红）', () => {
  it('F1 帧批激活门：过阈 move 不经 rAF flush 不激活（红因=现行逐事件激活）；flush 一帧后激活+占位槽在场', () => {
    mount([node('A'), node('B')])
    stubRect(cardOf('A'), 12, 18)
    stubRect(req('.month-frame'), 0, 0, 600, 200)
    pDown(cardOf('A'), 60, 40)
    pMove(66, 44) // 过阈（hypot(6,4)≈7.2≥5）
    // 红：现行 onMove 同步激活（card-drag-session.ts:309-310）——占位槽/拖拽类已在场
    expect(q('.drag-slot')).toBeNull()
    expect(cardOf('A').classList.contains('dragging')).toBe(false)
    flushRaf()
    // flush 一帧后激活（实现批绿面：激活判定在调度帧内）
    expect(req('.drag-slot').textContent).toBe('置 入')
    expect(cardOf('A').classList.contains('dragging')).toBe(true)
  })
  it('F2 move 风暴单写批：风暴期拖影不跟手（红因=现行逐事件写 left/top）；一次 flush 落最新指针单批值', () => {
    mount([node('A'), node('B')])
    stubRect(cardOf('A'), 12, 18)
    stubRect(req('.month-frame'), 0, 0, 600, 200)
    pDown(cardOf('A'), 60, 40)
    pMove(66, 44)
    flushRaf() // 激活帧：ghost0=(12,18)，激活 move translate=(6,4)
    const card = cardOf('A')
    // 红：现行不写 translate（=''）；实现批=激活帧写批 translate='6px 4px'
    expect(translateOf(card)).toBe('6px 4px')
    for (let i = 1; i <= 8; i++) pMove(100 + i * 10, 60) // 风暴（不 flush）——末点 (180,60)
    // 红：现行风暴期逐事件跟手（left/top 即时漂移）——translate 应保持激活帧值
    expect(translateOf(card)).toBe('6px 4px')
    flushRaf()
    // 单批落值：ghost=(180−48,60−22)=(132,38)→translate=(120,20)
    expect(translateOf(card)).toBe('120px 20px')
    // translate 化后 left/top=激活锚（流内原位=offsetLeft/Top=0px）非逐帧跟随
    expect(card.style.left).toBe('0px')
    expect(card.style.top).toBe('0px')
  })
  it('F3a 非滚动帧读写批次序：flush 帧窗内=先全部读（rect/computed）后写（红因=现行 move 事件内 读→写→读 交错+帧窗零写）', () => {
    mount([node('A'), node('B')])
    const log: string[] = []
    // 读侧记录：content（jsdom 全零 passthrough）、frame（定值+记录）、computed
    vi.spyOn(req('.tl-content'), 'getBoundingClientRect').mockImplementation(() => {
      log.push('read:content')
      return {
        left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0,
        toJSON: () => ({})
      } as unknown as DOMRect
    })
    const frameEl = req('.month-frame') as HTMLElement
    stubRect(frameEl, 0, 0, 600, 200)
    const origFrame = frameEl.getBoundingClientRect.bind(frameEl)
    vi.spyOn(frameEl, 'getBoundingClientRect').mockImplementation(() => {
      log.push('read:frame')
      return origFrame()
    })
    const realGcs = window.getComputedStyle.bind(window)
    vi.spyOn(window, 'getComputedStyle').mockImplementation(((el: Element, pseudo?: string | null) => {
      log.push('read:computed')
      return realGcs(el, pseudo)
    }) as typeof window.getComputedStyle)
    // 写侧记录：card 直接赋值面（style accessor 包裹）+ setProperty 面
    const card = cardOf('A')
    stubRect(card, 12, 18)
    const st = card.style
    const proto = Object.getPrototypeOf(st) as unknown as Record<string, PropertyDescriptor>
    for (const p of ['left', 'top', 'translate', 'transition', 'width', 'position', 'marginLeft']) {
      const d = Object.getOwnPropertyDescriptor(proto, p)
      if (d === undefined || d.set === undefined) continue
      Object.defineProperty(st, p, {
        configurable: true,
        get() { return d.get!.call(st) },
        set(v: string) { log.push(`write:card.${p}`); d.set!.call(st, v) }
      })
    }
    const origSet = st.setProperty.bind(st)
    st.setProperty = (n: string, v: string, prio?: string): void => {
      log.push(`write:style.${n}`)
      origSet(n, v, prio)
    }
    pDown(cardOf('A'), 60, 40)
    pMove(66, 44)
    flushRaf() // 激活
    log.length = 0
    pMove(100, 60)
    flushRaf()
    const reads = log.filter((x) => x.startsWith('read:'))
    const writes = log.filter((x) => x.startsWith('write:'))
    expect(reads.length).toBeGreaterThan(0)
    // 红：现行 flush 帧窗零写（写在事件时点——rAF 帧批缺失的直证）
    expect(writes.length).toBeGreaterThan(0)
    const firstWrite = log.findIndex((x) => x.startsWith('write:'))
    let lastRead = -1
    log.forEach((x, i) => {
      if (x.startsWith('read:')) lastRead = i
    })
    // 实现批绿面：帧内先读后写（读写不交错）
    expect(firstWrite).toBeGreaterThan(lastRead)
  })
  it('F3b 真实滚动帧 oracle：tick 施滚后仅一次滚动后读算写，容器 rect/scrollTop 入 spy，lastClient 不被段1重复消费', () => {
    mount([node('A'), node('B')])
    const timeline = req('.timeline') as HTMLElement
    const frame = req('.month-frame') as HTMLElement
    const content = req('.tl-content')
    const card = cardOf('A')
    const log: string[] = []
    stubRect(timeline, 0, 0, 600, 600)
    vi.spyOn(timeline, 'getBoundingClientRect').mockImplementation(() => {
      log.push('read:container.rect')
      return { left: 0, top: 0, right: 600, bottom: 600, width: 600, height: 600, x: 0, y: 0, toJSON: () => ({}) } as DOMRect
    })
    Object.defineProperties(timeline, {
      clientHeight: { configurable: true, value: 600 },
      clientWidth: { configurable: true, value: 600 }
    })
    let scrollTop = 0
    Object.defineProperty(timeline, 'scrollTop', {
      configurable: true,
      get: () => {
        log.push('read:scrollTop')
        return scrollTop
      },
      set: (v: number) => {
        log.push('write:scrollTop')
        scrollTop = v
      }
    })
    vi.spyOn(content, 'getBoundingClientRect').mockImplementation(() => {
      log.push('read:content')
      return { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0, toJSON: () => ({}) } as DOMRect
    })
    stubRect(frame, 0, 0, 600, 200)
    vi.spyOn(frame, 'getBoundingClientRect').mockImplementation(() => {
      log.push('read:frame')
      return { left: 0, top: 0, right: 600, bottom: 200, width: 600, height: 200, x: 0, y: 0, toJSON: () => ({}) } as DOMRect
    })
    stubRect(card, 12, 18)
    const proto = Object.getPrototypeOf(card.style) as Record<string, PropertyDescriptor>
    for (const p of ['left', 'top', 'translate']) {
      const d = Object.getOwnPropertyDescriptor(proto, p)
      if (d?.set === undefined) continue
      Object.defineProperty(card.style, p, {
        configurable: true,
        get() { return d.get!.call(card.style) },
        set(v: string) { log.push(`write:card.${p}`); d.set!.call(card.style, v) }
      })
    }
    pDown(card, 60, 40)
    pMove(66, 44)
    flushRaf()
    pMove(100, 590) // 容器底部触发区；实现批仅记 lastClient，现行事件写不计入帧窗
    log.length = 0
    flushRaf()
    expect(scrollTop).toBeGreaterThan(0)
    expect(log).toContain('read:container.rect')
    expect(log).toContain('read:scrollTop')
    const lastScrollWrite = log.map((x, i) => x === 'write:scrollTop' ? i : -1).reduce((a, b) => Math.max(a, b), -1)
    const geometry = log.map((x, i) => /^read:(content|frame)/.test(x) ? i : -1).filter((i) => i >= 0)
    const writes = log.map((x, i) => x.startsWith('write:card.') ? i : -1).filter((i) => i >= 0)
    expect(geometry.length).toBeGreaterThan(0)
    expect(writes.length).toBeGreaterThan(0)
    expect(geometry[0]!, '段0=施滚后才重测').toBeGreaterThan(lastScrollWrite)
    expect(writes[0]!, '段0 子批内=全部几何读先于拖影写').toBeGreaterThan(geometry[geometry.length - 1]!)
    expect(log.filter((x) => x === 'read:content')).toHaveLength(1) // lastClient 单次消费
  })
  it('F4 拖影 translate 化：定位键=inline translate（grab 帧 own 域差精确值 40px 20px），left/top=激活锚 0px；.dragging rotate/scale 类规则不被内联覆盖', () => {
    mount([node('A'), node('B')])
    stubRect(cardOf('A'), 12, 18)
    stubRect(req('.month-frame'), 0, 0, 600, 200)
    pDown(cardOf('A'), 60, 40)
    pMove(66, 44)
    flushRaf()
    pMove(100, 60)
    flushRaf()
    const card = cardOf('A')
    // 红：现行写 left/top（40px/20px）不写 translate（''）
    expect(translateOf(card)).toBe('40px 20px')
    expect(card.style.left).toBe('0px')
    expect(card.style.top).toBe('0px')
    expect(card.style.transform, '拖拽期不得写内联 transform 覆盖 .dragging 类规则').toBe('')
    expect(card.classList.contains('dragging')).toBe(true)
    // CSS 守卫（现状绿——commit B 不得动此规则）：.dragging 视觉变换保留。
    // [B3] 读面=双文件拼读（.tl-card.dragging 族拆出 theme-lineage-drag.css——commit A 机械迁移，断言本体零改）。
    // 读法=process.cwd 拼读（实现批偏差申报：jsdom env 下 new URL(...,import.meta.url) 被 vite asset transform
    // 改写致误读本测试文件——探针实测；lineage-edge-overlay-css.test 同约定；断言本体零改）
    const css = ['theme-lineage.css', 'theme-lineage-drag.css']
      .map((f) => readFileSync(join(process.cwd(), `src/renderer/shared/${f}`), 'utf8'))
      .join('')
    expect(css).toMatch(/\.tl-card\.dragging \{[^}]*transform: rotate\(2deg\) scale\(1\.05\);/s)
  })
  it('F5 settle 飞行 translate 化：transition 承载 translate（红因=现行 left/top .32s）；双 rAF 后 translate=0px 0px；终局清场零残留', () => {
    mount([node('A'), node('B'), node('C')])
    stubRect(req('.month-frame'), 0, 0, 600, 200)
    stubRect(cardOf('A'), 12, 18)
    pDown(cardOf('A'), 60, 40)
    pMove(66, 44)
    flushRaf()
    pMove(500, 40) // 组末（unmeasured 单行：C 中心 476 右侧）
    flushRaf()
    pUp(500, 40)
    const card = cardOf('A')
    // 红：现行 SETTLE_TRANSITION=left/top .32s（card-drag-flight.ts:29-30）
    expect(card.style.transition).toContain('translate .32s')
    // 红：现行飞行写 left=fromX−hostOffset（ghost 452−frameOrigin 12=440）不写 translate
    expect(translateOf(card)).toBe('440px 0px')
    flushRaf()
    flushRaf()
    // 双 rAF 后目标：target=(12,18)（stub 定值）→translate=(0,0)
    expect(translateOf(card)).toBe('0px 0px')
    fireEndTranslate(card)
    expect(reorder).toHaveBeenCalledWith(['B', 'C', 'A'], expect.objectContaining({ folderId: '__main__' }))
    expect(card.getAttribute('style') === null || card.getAttribute('style') === '').toBe(true)
  })
  it('F6 pullPx 帧批：越缘 move 不 flush 不写 --lg-pull 不挂 stretch（红因=现行逐事件写+React 提交）；一次 flush=单帧跟随值', () => {
    mount([node('A'), node('B'), node('C')])
    const frame = req('.month-frame') as HTMLElement
    stubLiveFrame(frame, { baseBottom: 200, stretchPad: 120, slotRowGrow: 92, width: 600 })
    stubRect(cardOf('A'), 12, 18)
    stubRect(cardOf('B'), 160, 18)
    stubRect(cardOf('C'), 308, 18)
    pDown(cardOf('A'), 60, 40)
    pMove(66, 44)
    flushRaf() // 激活+校准（冻结基准 bottom0=200）
    pMove(240, 250) // 越缘 +50（不 flush）
    // 红：现行逐事件挂 .stretch（React setSlot 同步提交）+逐事件写 --lg-pull
    expect(frame.classList.contains('stretch')).toBe(false)
    expect(frame.style.getPropertyValue('--lg-pull')).toBe('')
    flushRaf()
    expect(frame.classList.contains('stretch')).toBe(true)
    expect(frame.style.getPropertyValue('--lg-pull')).toBe('50px')
    pMove(240, 290) // 深移 +90→封顶 82（不 flush）
    // 红：现行已即时跟手（'82px'）
    expect(frame.style.getPropertyValue('--lg-pull')).toBe('50px')
    flushRaf()
    expect(frame.style.getPropertyValue('--lg-pull')).toBe('82px')
    pMove(240, 180) // 出带回框：extend true→false；非 extend 帧不得写 0px 残留
    flushRaf()
    expect(frame.classList.contains('stretch')).toBe(false)
    expect(frame.style.getPropertyValue('--lg-pull')).toBe('')
  })
  it('F7 pointercancel 坐标 0/0 按 lastClient 落当前候选槽（W3——红因=现行用事件坐标判 overSourceFrame(0,0)=false 误回弹 srcIdx 零写）', () => {
    mount([node('A'), node('B'), node('C')])
    stubRect(req('.month-frame'), 200, 100, 600, 200) // 非零框原点——cancel (0,0) 判框外
    stubRect(cardOf('A'), 212, 118)
    pDown(cardOf('A'), 220, 120)
    pMove(226, 124)
    flushRaf() // 激活（现行同步激活；实现批=帧批）
    pMove(500, 140) // 框内 (500,140)：fp=(300,40)→cell1 中心右侧→insertIdx=1
    flushRaf()
    act(() => {
      // 系统取消事件坐标常 0/0（R5 意图=落当前候选槽——实现批终局批改按
      // session.lastClient 判定；现行用事件坐标=overSourceFrame(0,0)=false）
      document.dispatchEvent(new MouseEvent('pointercancel', { bubbles: true, clientX: 0, clientY: 0 }))
    })
    // 红：现行 settleIdx=srcIdx=0→finalIds=[A,B,C] 序不变零写（reorder 不调用）
    // 绿（实现批）：lastClient=(500,140) 框内→落当前候选槽 insertIdx=1
    fireEndBoth(cardOf('A'))
    expect(reorder).toHaveBeenCalledTimes(1)
    expect(reorder).toHaveBeenCalledWith(['B', 'A', 'C'], expect.objectContaining({ folderId: '__main__' }))
  })
  it('F8 exceeded latch 置位后未 flush 直接 cancel（0/0）=按 lastClient 激活并 settle 到组末（红因=现行 cancel 事件坐标误回弹）', () => {
    mount([node('A'), node('B'), node('C')])
    stubRect(req('.month-frame'), 200, 100, 600, 200)
    stubRect(cardOf('A'), 212, 118)
    pDown(cardOf('A'), 220, 120)
    // fp=(700−200,140−100)=(500,40)；W=0 单行末卡 C 中心=12+2×200+64=476。
    // 500>476→hit.index=2、p=3；srcIdx=0 剔除源后 insertIdx=p−1=2（真组末）。
    pMove(700, 140) // 过阈且跨槽；故意不 flush
    act(() => {
      document.dispatchEvent(new MouseEvent('pointercancel', { bubbles: true, clientX: 0, clientY: 0 }))
    })
    fireEndBoth(cardOf('A'))
    expect(reorder).toHaveBeenCalledTimes(1)
    expect(reorder).toHaveBeenCalledWith(['B', 'C', 'A'], expect.objectContaining({ folderId: '__main__' }))
  })
  it('L1 布局终局屏障：非零位移 flight 先完成时数据写保持原时点，routeEpoch 等 padding-bottom 终局恰一次 bump', () => {
    mount([node('A'), node('B'), node('C')])
    const frame = req('.month-frame') as HTMLElement
    stubLiveFrame(frame, { baseBottom: 200, stretchPad: 120, slotRowGrow: 92, width: 600 })
    stubRect(cardOf('A'), 12, 18)
    pDown(cardOf('A'), 60, 40)
    pMove(66, 44)
    flushRaf()
    pMove(240, 250) // 非零位移且 stretch 曾激活
    flushRaf()
    expect(frame.classList.contains('stretch')).toBe(true)
    routeBump.mockClear()
    pUp(240, 250)
    fireEndBoth(cardOf('A')) // .32s flight finish；.38s padding 回落尚未终局
    expect(reorder).toHaveBeenCalledWith(['B', 'C', 'A'], expect.objectContaining({ folderId: '__main__' }))
    expect(routeBump, '布局回落中不得提前 bump').not.toHaveBeenCalled()
    act(() => {
      frame.dispatchEvent(Object.assign(new Event('transitionend'), { propertyName: 'padding-bottom' }))
      frame.dispatchEvent(Object.assign(new Event('transitionend'), { propertyName: 'padding-bottom' }))
    })
    expect(routeBump).toHaveBeenCalledTimes(1)
  })
  it('L2 布局终局屏障：零位移但本次 stretch 曾激活=无 flight 也等 padding 终局后恰一次 bump', () => {
    mount([node('A'), node('B'), node('C')])
    const frame = req('.month-frame') as HTMLElement
    stubLiveFrame(frame, { baseBottom: 200, stretchPad: 120, slotRowGrow: 92, width: 600 })
    const card = cardOf('A')
    let released = false
    vi.spyOn(card, 'getBoundingClientRect').mockImplementation(() => {
      const x = released ? 192 : 12
      const y = released ? 228 : 18
      return { left: x, top: y, right: x + 128, bottom: y + 72, width: 128, height: 72, x, y, toJSON: () => ({}) } as DOMRect
    })
    pDown(card, 60, 40)
    pMove(66, 44)
    flushRaf()
    pMove(240, 250) // stretch 曾置位；ghost=(192,228)，松手 flow target 同值=零位移
    flushRaf()
    expect(frame.classList.contains('stretch')).toBe(true)
    routeBump.mockClear()
    released = true
    pUp(240, 250)
    expect(reorder).toHaveBeenCalledWith(['B', 'C', 'A'], expect.objectContaining({ folderId: '__main__' })) // 零位移 flight finish 仍即时数据写
    expect(routeBump).not.toHaveBeenCalled()
    act(() => {
      frame.dispatchEvent(Object.assign(new Event('transitionend'), { propertyName: 'padding-bottom' }))
    })
    expect(routeBump).toHaveBeenCalledTimes(1)
  })
  it('L3 布局终局屏障：padding transitioncancel 与 600ms 兜底/飞行重复 end 合流仍恰一次 bump', () => {
    vi.useFakeTimers()
    mount([node('A'), node('B'), node('C')])
    const frame = req('.month-frame') as HTMLElement
    stubLiveFrame(frame, { baseBottom: 200, stretchPad: 120, slotRowGrow: 92, width: 600 })
    stubRect(cardOf('A'), 12, 18)
    pDown(cardOf('A'), 60, 40)
    pMove(66, 44)
    flushRaf()
    pMove(240, 250) // 非零位移且 stretch 曾激活
    flushRaf()
    expect(frame.classList.contains('stretch')).toBe(true)
    routeBump.mockClear()
    pUp(240, 250)
    fireEndBoth(cardOf('A'))
    expect(routeBump).not.toHaveBeenCalled()
    act(() => {
      frame.dispatchEvent(Object.assign(new Event('transitioncancel'), { propertyName: 'padding-bottom' }))
      frame.dispatchEvent(Object.assign(new Event('transitionend'), { propertyName: 'padding-bottom' }))
      fireEndBoth(cardOf('A'))
      vi.advanceTimersByTime(600)
    })
    expect(routeBump).toHaveBeenCalledTimes(1)
  })
  it('L4 拖中出带且 padding 回落已完成：up 的零位移 flight finish 即布局终局，不另等 600ms 兜底（守卫）', () => {
    const { frame, release } = mountExitedStretch()
    act(() => {
      frame.dispatchEvent(Object.assign(new Event('transitionend'), { propertyName: 'padding-bottom' }))
    })
    routeBump.mockClear()
    release()
    pUp(240, 180)
    expect(routeBump, 'paddingFinished=true 时不得为已完成的回落再等兜底').toHaveBeenCalledTimes(1)
  })
  it('L5 拖中出带后立即 up：padding 回落仍在途，零位移 flight finish 不得提前布局终局', () => {
    const { frame, release } = mountExitedStretch()
    routeBump.mockClear()
    release()
    pUp(240, 180)
    expect(routeBump, '出带已启动回落但未 end/cancel，须保持布局屏障').not.toHaveBeenCalled()
    act(() => {
      frame.dispatchEvent(Object.assign(new Event('transitionend'), { propertyName: 'padding-bottom' }))
    })
    expect(routeBump).toHaveBeenCalledTimes(1)
  })
})
