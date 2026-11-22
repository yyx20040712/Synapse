// @vitest-environment jsdom
/**
 * [F-LGRAPH-01①U2] card-drag-flight —— FLIP 飞行/settle 机制拆件直测（自
 * useCardDrag 拆出零变；既有面=lineage-card-drag.test.tsx 断言零改，本件锁
 * 拆件三分支：card=null 防御/零位移立即落定/位移飞行双 rAF+transitionend
 * 清场）。always-active（不经 guardedDescribe）。
 * （几何经 getBoundingClientRect spy 定值——jsdom 零布局。）
 */
import { describe, expect, it, vi } from 'vitest'
import { startFlight, SETTLE_TRANSITION, type FlightJob } from '../../../src/renderer/features/lineage/card-drag-flight'

function stubRect(el: Element, left: number, top: number, width = 128): void {
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
    left, top, right: left + width, bottom: top + 72, width, height: 72, x: left, y: top,
    toJSON: () => ({})
  } as unknown as DOMRect)
}

const jobOf = (over: Partial<FlightJob> = {}): FlightJob => ({
  nodeId: 'A',
  fromX: 10,
  fromY: 10,
  marginLeft0: '82px',
  finish: vi.fn(),
  ...over
})

// [B3 §9 断言迁移] fireEnd 参数 'left'→'translate'（飞行承载键 translate 化——onEnd 只认 translate）
const fireEnd = (el: Element, name = 'translate'): void => {
  el.dispatchEvent(Object.assign(new Event('transitionend'), { propertyName: name }))
}
/** [B3 §5] translate 属性读值（值格式契约='Xpx Ypx' 两值形） */
const translateOf = (el: HTMLElement): string => el.style.getPropertyValue('translate')

describe('F-LGRAPH-01①U2 card-drag-flight（FLIP 飞行拆件）', () => {
  it('card=null 防御：卡已卸载→立即 finish（不抛不断）', () => {
    const job = jobOf()
    startFlight(null, job)
    expect(job.finish).toHaveBeenCalledTimes(1)
  })

  it('零位移分支：target 与起点重合（<0.5px）→不挂 fixed+立即 finish+inline transition 清空（错位恢复在场）', () => {
    const card = document.createElement('div')
    stubRect(card, 10, 10) // target=起点
    card.style.transition = 'none' // 激活期禁断残留
    card.style.translate = '6px 4px' // [B3 §5] 激活期 translate 残留（零位移径同步清）
    card.style.willChange = 'translate' // [B3 §5] 激活期 will-change 残留（零位移径同步清）
    const job = jobOf()
    startFlight(card, job)
    expect(job.finish).toHaveBeenCalledTimes(1)
    expect(card.style.position).toBe('') // 未进飞行分支
    expect(card.style.transition).toBe('') // 禁断就地清空回类值
    expect(card.style.marginLeft).toBe('82px') // 错位恢复（零位移径同样恢复）
    expect(translateOf(card)).toBe('') // [B3 §5] 零位移分支 translate 同步清空（不残留）
    expect(card.style.willChange).toBe('') // [B3 §5] 零位移分支 will-change 同步清空
  })

  it('位移分支：flow 态量测+absolute 锚（[②U7] 内容坐标域）+SETTLE 过渡在场；双 rAF 后目标值；transitionend→finish+inline 全清', async () => {
    const card = document.createElement('div')
    stubRect(card, 200, 160) // target 远离起点（190/150 位移）
    const job = jobOf()
    startFlight(card, job) // contentEl 缺省=视口恒等（z=1 同值）
    expect(card.style.position).toBe('absolute')
    // [B3 §9 断言迁移] 起点 left/top 值断言→锚+translate 双面（§5 Option A：left/top=target 锚、translate=(from−target)）
    expect(card.style.left).toBe('200px') // 锚=target 锚（flow 量取位——§5）
    expect(card.style.top).toBe('160px')
    expect(translateOf(card)).toBe('-190px -150px') // translate=(from−target)=(10−200,10−160)
    expect(card.style.marginLeft).toBe('0px') // fixed 期压 0（双计防线）
    expect(card.style.transition).toBe(SETTLE_TRANSITION)
    expect(job.finish).not.toHaveBeenCalled()
    // 双 rAF 后置目标值（新插元素首样式周期无 before-change style）——translate 归零（渲染位=锚+0=target）
    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())))
    expect(translateOf(card)).toBe('0px 0px')
    fireEnd(card, 'translate')
    expect(job.finish).toHaveBeenCalledTimes(1)
    expect(card.style.position).toBe('')
    expect(card.style.zIndex).toBe('')
    expect(card.style.transition).toBe('')
    expect(card.style.marginLeft).toBe('82px') // 清场恢复错位基线
    expect(translateOf(card)).toBe('') // [B3 §5] 清场含 translate 清除（style 属性回归空）
    expect(card.style.willChange).toBe('') // [B3 §5] 清场含 will-change 清除
  })

  it('transitioncancel 同径清场（外因取消防御面）', async () => {
    const card = document.createElement('div')
    stubRect(card, 200, 160)
    const job = jobOf()
    startFlight(card, job)
    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())))
    card.dispatchEvent(new Event('transitioncancel'))
    expect(job.finish).toHaveBeenCalledTimes(1)
    expect(card.style.position).toBe('')
  })

  it('飞行七步序锚（回炉 W4a）：spy offsetWidth getter 记录读取时刻 transition——强制回流读发生时 transition=\'none\'、其后才赋 SETTLE_TRANSITION（③④⑤ 序；变异=删强制回流即红）', async () => {
    const card = document.createElement('div')
    stubRect(card, 200, 160) // target 远离起点（190/150 位移）——进位移飞行分支
    // ④强制回流判别面：offsetWidth 读取时点记录 card.style.transition（jsdom 无
    // 判别力面——读值序=③④⑤顺序的唯一直接观测点）
    const reads: string[] = []
    const proto = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth')
    Object.defineProperty(card, 'offsetWidth', {
      configurable: true,
      get() {
        reads.push(card.style.transition)
        return proto?.get?.call(card) ?? 0
      }
    })
    const job = jobOf()
    startFlight(card, job)
    // ②flow 量测读（transition 尚空）→④回流读（③已赋 transition:none）——
    // 删④变异=只余 ② 读（''），'none' 不在场即红
    expect(reads, '④回流读时点 transition=none（起点期禁断过渡——③已赋）').toEqual(['', 'none'])
    // ⑤在其后赋值：startFlight 返回时点 transition=SETTLE_TRANSITION
    expect(card.style.transition).toBe(SETTLE_TRANSITION)
    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())))
    fireEnd(card, 'translate') // 收口（不残留 600ms 兜底定时器）
    expect(job.finish).toHaveBeenCalledTimes(1)
  })
})
