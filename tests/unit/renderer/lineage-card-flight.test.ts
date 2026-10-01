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

const fireEnd = (el: Element, name = 'left'): void => {
  el.dispatchEvent(Object.assign(new Event('transitionend'), { propertyName: name }))
}

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
    const job = jobOf()
    startFlight(card, job)
    expect(job.finish).toHaveBeenCalledTimes(1)
    expect(card.style.position).toBe('') // 未进飞行分支
    expect(card.style.transition).toBe('') // 禁断就地清空回类值
    expect(card.style.marginLeft).toBe('82px') // 错位恢复（零位移径同样恢复）
  })

  it('位移分支：flow 态量测+fixed 起点+SETTLE 过渡在场；双 rAF 后目标值；transitionend→finish+inline 全清', async () => {
    const card = document.createElement('div')
    stubRect(card, 200, 160) // target 远离起点（190/150 位移）
    const job = jobOf()
    startFlight(card, job)
    expect(card.style.position).toBe('fixed')
    expect(card.style.left).toBe('10px') // 起点=fromX/fromY
    expect(card.style.marginLeft).toBe('0px') // fixed 期压 0（双计防线）
    expect(card.style.transition).toBe(SETTLE_TRANSITION)
    expect(job.finish).not.toHaveBeenCalled()
    // 双 rAF 后置目标值（新插元素首样式周期无 before-change style）
    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())))
    expect(card.style.left).toBe('200px')
    expect(card.style.top).toBe('160px')
    fireEnd(card, 'left')
    expect(job.finish).toHaveBeenCalledTimes(1)
    expect(card.style.position).toBe('')
    expect(card.style.zIndex).toBe('')
    expect(card.style.transition).toBe('')
    expect(card.style.marginLeft).toBe('82px') // 清场恢复错位基线
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
})
