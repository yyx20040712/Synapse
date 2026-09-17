// @vitest-environment jsdom
/**
 * [F-L2] lineage-viewport-scale —— 视口量测坐标系归一（锁定合约，always-active，
 * 不经 guardedDescribe——ADR-0017 裁决 3）。
 *
 * 覆盖（票面 5.1 ①~④）：rootToLocalScale 比值口径——zoom 子树模拟/zoom=1
 * 恒等/不可量测防御/嵌套复合（不查 CSS 只看量测比值）；回炉 1 增 ③c
 * 守卫边界四组合补全（门一 N-3）+⑤ rect 可选参路径（门一 W-2——rect
 * 传入则不自读 gBCR；缺省自读路径既有断言零变）。数字 crib
 * f-l2-precheck.json（Electron 真机三档实测）。jsdom 无布局——stub 手法：
 * per-instance Object.defineProperty(clientWidth)+原型 spyOn
 * (getBoundingClientRect)。fit 消费点（M3 型）jsdom 不可达（effect 在零
 * 尺寸下跳过）——由真机探针 f-l2-fix-verify.mjs 场景 A 锁。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { domRect } from '../../utils/geometry'
import { rootToLocalScale } from '../../../src/renderer/features/lineage/lineage-viewport'

/**
 * 量测 stub：per-instance clientWidth + 原型 gBCR.width。
 * clientWidth 只在实例上覆写（jsdom 默认 0）；gBCR 全原型 stub（helper 与
 * 三消费点共用 Element.prototype 路径）。
 */
function stubMeasured(clientWidth: number, gBCRWidth: number): HTMLElement {
  const el = document.createElement('div')
  Object.defineProperty(el, 'clientWidth', { get: () => clientWidth, configurable: true })
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(domRect(0, 0, gBCRWidth, 0))
  return el
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('F-L2 rootToLocalScale —— 根框→svg 本地坐标比值归一', () => {
  it('① zoom 子树模拟（large 档真机数字）：clientWidth 1158 / gBCR.width 1447.5 → ≈0.8', () => {
    const el = stubMeasured(1158, 1447.5)
    expect(rootToLocalScale(el)).toBeCloseTo(0.8, 3)
  })

  it('② zoom=1 恒等（small 档真机数字）：1568 / 1568 → 1', () => {
    const el = stubMeasured(1568, 1568)
    expect(rootToLocalScale(el)).toBe(1)
  })

  it('③ 不可量测防御：gBCR.width=0（未挂载/零尺寸）→ 1（不产生除零）', () => {
    const el = stubMeasured(0, 0)
    expect(rootToLocalScale(el)).toBe(1)
  })

  it('③b 量测退化防御：clientWidth=0 而 gBCR.width>0（CSS 布局不可用——jsdom 桩面）→ 1（退化直通）', () => {
    const el = stubMeasured(0, 800)
    expect(rootToLocalScale(el)).toBe(1)
  })

  it('③c 守卫组合补全：gBCR.width=0 而 clientWidth>0 → 1（真机不可达——gBCR 零宽则布局框不存在；桩面边界四组合补全——门一 N-3）', () => {
    const el = stubMeasured(800, 0)
    expect(rootToLocalScale(el)).toBe(1)
  })

  it('④ 嵌套复合语义：比值本身即复合（0.8×0.8=0.64）——元素零 CSS 参与即可得', () => {
    // 嵌套 zoom（如 .app-content-row 0.8×内层再 0.8）：clientWidth/gBCR 比值
    // =1/复合 zoom=0.64。元素不带任何 zoom 样式即可得到——锁「不查
    // .app-content-row/getComputedStyle，只看量测比值」的口径（SET1 改挂
    // 点/加档不破，票面 §0）
    const el = stubMeasured(1000, 1562.5)
    expect(rootToLocalScale(el)).toBeCloseTo(0.64, 3)
  })

  it('⑤ rect 可选参路径（回炉 1·W-2）：传入已读 rect → 用 rect.width 作根框宽，不自读 gBCR（同帧单读）', () => {
    // 桩 gBCR.width=1447.5 与传入 rect.width=1600 刻意不同：若 helper 忽略
    // rect 自读 gBCR 得 800/1447.5≈0.5526≠0.5 → 红——锁「复用调用方同帧
    // 单读」语义（门一 W-2）
    const el = stubMeasured(800, 1447.5)
    const rect = { width: 1600 } as DOMRect
    expect(rootToLocalScale(el, rect)).toBeCloseTo(0.5, 3)
  })
})
