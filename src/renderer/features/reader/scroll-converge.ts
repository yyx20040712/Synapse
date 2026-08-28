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

/**
 * 程序滚动收敛：只滚 el 的最近滚动祖先（更外层零位移）。
 * - 'start'：scrollTop += elRect.top − scrollerRect.top（盒顶对齐视口顶）
 * - 'center'：scrollTop += (elRect.top+h/2) − (scrollerRect.top+clientH/2)
 * 显式夹取 [0, scrollHeight−clientHeight]（浏览器对赋值自动夹取；jsdom 不
 * 模拟——显式=单测可锚，浏览器内幂等）。无滚动祖先→不滚（原 scrollIntoView
 * 对无滚动容器元素同为无操作）。
 */
export function scrollIntoNearestScroller(el: HTMLElement, align: ScrollAlign): void {
  const scroller = nearestScrollAncestor(el)
  if (scroller === null) return
  const elRect = el.getBoundingClientRect()
  const scRect = scroller.getBoundingClientRect()
  const raw =
    align === 'start'
      ? scroller.scrollTop + (elRect.top - scRect.top)
      : scroller.scrollTop + (elRect.top + elRect.height / 2) - (scRect.top + scroller.clientHeight / 2)
  scroller.scrollTop = Math.min(Math.max(raw, 0), Math.max(0, scroller.scrollHeight - scroller.clientHeight))
}
