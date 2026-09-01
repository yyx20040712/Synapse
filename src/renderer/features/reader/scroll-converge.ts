// b3: P7-F
/**
 * [F-05] scroll-converge —— 程序滚动单容器收敛（DOM 几何件，缺陷 A 修复）
 *
 * 缺陷（2026-08-28 用户真机验收图一）：PageColumn 段⑤/anchor-locate
 * flashElement 原用 Element.scrollIntoView()——CSSOM 语义=滚**所有**可滚祖先；
 * 实测泄漏面=document viewport（scrollingElement，overflow:hidden 仍可被程序
 * 滚动，e2e 探针 winY 70→130）与 main（溢出时）——TabBar 被顶出视口且无自愈。
 *
 * 本件=INV-34 声明处：程序滚动只滚目标的**最近滚动祖先**（差值法+显式夹取），
 * 更外层滚动面永不被触碰。消费方：PageColumn 段⑤（页盒 'start'）与
 * anchor-locate flashElement（闪烁目标 'center'）——同一不变量同一实现。
 * 纯 DOM 工具（不 import 组件/store），与 page-column-geometry 同层级的
 * 「DOM 几何件」；测试=tests/unit/renderer/scroll-converge.test.ts
 * （always-active）；行为终审=tests/e2e/reader-scroll.spec.ts F-05 test。
 */

/** 对齐语义（原 scrollIntoView block 单容器语义的等价收敛） */
export type ScrollAlign = 'start' | 'center'

/** 最近滚动祖先：自 el.parentElement 向上首个 overflowY∈{auto,scroll} 的祖先
 *  （hidden/visible 不入选——hidden 可被程序滚=泄漏面；到根无→null 不滚） */
export function nearestScrollAncestor(el: HTMLElement): HTMLElement | null {
  let p = el.parentElement
  while (p !== null) {
    const oy = getComputedStyle(p).overflowY
    if (oy === 'auto' || oy === 'scroll') return p
    p = p.parentElement
  }
  return null
}

/** 折算因子单源（F-R2）：自 scroller 至 documentElement 逐层 computed zoom
 *  链乘积（「1 gBCR px=1 scrollTop px」仅 z=1 成立——探针 P1 实证）。
 *  量测口径（回炉 1 定案）：**禁用 gBCR/clientHeight 比值法**——gBCR 含横滚
 *  动条+亚像素小数，真机实测 1.25 档即偏 ε≈0.0005（964.6/772=1.24948），
 *  uiScale=1 档 ε 同型——e2e「划选高亮重开原位」两次复红 3.45px 中 ε 为
 *  实证确定性偏差（量级不足以单独解释 3.45px——完整归因未结案，台账
 *  F-R2e 序列敏感备案）；computed zoom=CSS 声明值直读，零几何污染。
 *  口径边界：只覆盖 scroller **祖先链**的 zoom 层——scroller 与目标之间的
 *  内部 zoom 层不在此量测（当前布局豁免层在祖先侧 .app-content-row，阅读
 *  器内部无 zoom；若未来引入内部 zoom 层需扩本链）。'normal'/空/undefined
 *  （jsdom 不识别 zoom）→NaN→1 跳过；z=1 恒等=零行为变。消费方：本件
 *  scrollIntoNearestScroller + scroll-progress measurePageBoxes（禁两处各写推导）。 */
export function effectiveZoom(scroller: HTMLElement): number {
  let z = 1
  let el: HTMLElement | null = scroller
  while (el !== null) {
    z *= Number(getComputedStyle(el).zoom) || 1
    el = el.parentElement
  }
  return z
}

/**
 * 程序滚动收敛：只滚 el 的最近滚动祖先（更外层零位移）。
 * - 'start'：scrollTop += (elRect.top − scrollerRect.top) / z（盒顶对齐视口顶）
 * - 'center'：scrollTop += (elRect.top+h/2 − scrollerRect.top) / z − clientH/2
 * elRect 侧=gBCR 视觉空间，除 z 折算回本地；clientHeight/scrollTop/clamp
 * 均=本地空间不动（F-R2 量纲修正，INV-34 语义原样）。显式夹取
 * [0, scrollHeight−clientHeight]（浏览器对赋值自动夹取；jsdom 不模拟——
 * 显式=单测可锚，浏览器内幂等）。无滚动祖先→不滚（原 scrollIntoView
 * 对无滚动容器元素同为无操作）。
 */
export function scrollIntoNearestScroller(el: HTMLElement, align: ScrollAlign): void {
  const scroller = nearestScrollAncestor(el)
  if (scroller === null) return
  const elRect = el.getBoundingClientRect()
  const scRect = scroller.getBoundingClientRect()
  const z = effectiveZoom(scroller)
  const raw =
    align === 'start'
      ? scroller.scrollTop + (elRect.top - scRect.top) / z
      : scroller.scrollTop + (elRect.top + elRect.height / 2 - scRect.top) / z - scroller.clientHeight / 2
  scroller.scrollTop = Math.min(Math.max(raw, 0), Math.max(0, scroller.scrollHeight - scroller.clientHeight))
}
