/**
 * 测试基建：jsdom 几何量测桩共享单源（F-TESTREF-W1B）。
 *
 * 口径（票内勘误留痕）：票面「22 文件/97 处」为调研期方法名 grep 口径——
 * 其中 e2e 5 spec 的命中全部是真实浏览器测量调用（win.evaluate 内真布局），
 * 非桩、不在收敛面；真桩收敛面=unit 17 文件（A 查表族 7/B 直挂族 3/
 * D 视口族 3/E 实例族 3/F 注入族 1，selection-paint 双方法跨族）。
 *
 * 三族安装对的还原语义（与存量逐字同，迁移零语义变化）：
 * - spyOn 族（stubElementRects/stubViewportRect/stubElementRect）：安装责任
 *   在本件，卸载责任在测试文件 afterEach 的 vi.restoreAllMocks()——存量
 *   selection 系 7 文件均已有该调用，保持不动。
 * - Range 直赋族（stubRangeGBCR/stubRangeClientRects）：jsdom Range 无原生
 *   gBCR/gCR 实现，orig 可能 undefined；disposer.restore() 在 orig===undefined
 *   时跳过还原（与存量 `if (orig !== undefined)` 语义逐字同——vitest 每文件
 *   独立 jsdom，原型态不跨文件）。
 * - defineProperty 族（defineRangeClientRects）：按原 descriptor 显式还原，
 *   原无实现=删属性（门一 N4 教训形态）。
 *
 * 被测代码对桩盒的字段消费面：A 查表族只读 x/y/width/height（桩盒仅此四
 * 字段，存量形态）；domRect/boxRect 全字段（e2e 同形语义保真）。
 *
 * 局部工厂命名规范（宪章 §1.3「94 文件」面的战役规范句）：新建局部工厂
 * 一律 make* 前缀+领域名词；跨 ≥2 文件重复的先入 tests/utils/factories.ts
 * （renderer 域）或 fixtures.ts（node/通用域）再引用，禁第三处手抄。
 *
 * 红线：R1 零 src 变更；C 面零变化由指纹门对拍。受锁文件。
 * [test-refactor][locked-change]
 */
import { vi, type MockInstance } from 'vitest'

/** 桩盒四字段（A 查表族的 Map 值/Range 直赋族的源形状） */
export interface StubBox {
  x: number
  y: number
  width: number
  height: number
}

/** 伪造完整 DOMRect（四边导出+toJSON——真浏览器同形语义） */
export function domRect(x: number, y: number, width: number, height: number): DOMRect {
  return {
    x,
    y,
    width,
    height,
    top: y,
    left: x,
    right: x + width,
    bottom: y + height,
    toJSON: () => ({})
  } as DOMRect
}

/** 四边盒（top/bottom/left/right）转 DOMRect——rectOf 直挂族同构形状 */
export function boxRect(b: { top: number; bottom: number; left: number; right: number }): DOMRect {
  return domRect(b.left, b.top, b.right - b.left, b.bottom - b.top)
}

/** B 族：元素直挂量测桩（anchor-blank-snap/release-affinity/fa12 形——
 *  直挂元素自有属性，不经原型 spyOn，无需还原） */
export function stubRectOf(el: HTMLElement, b: { top: number; bottom: number; left: number; right: number }): void {
  el.getBoundingClientRect = () => boxRect(b)
}

/** A 族：Element.prototype.getBoundingClientRect 查表桩（缺项零盒）——
 *  vi.restoreAllMocks 还原（文件 afterEach 责任，存量语义） */
export function stubElementRects(rects: Map<Element, StubBox>): MockInstance {
  return vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    const r = rects.get(this)
    return { x: r?.x ?? 0, y: r?.y ?? 0, width: r?.width ?? 0, height: r?.height ?? 0 } as DOMRect
  })
}

/** D 族：原型级固定/可变视口盒桩（(0,0,w,h) 全字段）——set 可变（refit 形）；
 *  固定用法忽略 set，vi.restoreAllMocks 还原 */
export function stubViewportRect(
  width: number,
  height: number
): { spy: MockInstance; set: (w: number, h: number) => void } {
  let w = width
  let h = height
  const spy = vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    return domRect(0, 0, w, h)
  })
  return {
    spy,
    set: (nw: number, nh: number): void => {
      w = nw
      h = nh
    }
  }
}

/** E 族：实例级盒桩（scroll-converge/scroll-progress 形）——
 *  vi.restoreAllMocks 还原 */
export function stubElementRect(el: Element, x: number, y: number, width: number, height: number): MockInstance {
  return vi.spyOn(el, 'getBoundingClientRect').mockReturnValue(domRect(x, y, width, height))
}

/** Range.getBoundingClientRect 直赋桩——getter 源可变（selection 系
 *  rangeRect 每用例重赋、桩读当时值的语义）；restore 按 orig 还原 */
export function stubRangeGBCR(getRect: () => StubBox): { restore(): void } {
  const orig = Range.prototype.getBoundingClientRect as (() => DOMRect) | undefined
  Range.prototype.getBoundingClientRect = () => ({ ...getRect() }) as DOMRect
  return {
    restore(): void {
      if (orig !== undefined) Range.prototype.getBoundingClientRect = orig
    }
  }
}

/** Range.getClientRects 直赋桩——getter 源可变（selection-paint clientRects
 *  语义；元素浅拷贝+toJSON 指回源对象，存量形态） */
export function stubRangeClientRects(getRects: () => StubBox[]): { restore(): void } {
  const orig = Range.prototype.getClientRects as (() => DOMRectList) | undefined
  Range.prototype.getClientRects = (() =>
    getRects().map((r) => ({ ...r, toJSON: () => r }))) as unknown as () => DOMRectList
  return {
    restore(): void {
      if (orig !== undefined) Range.prototype.getClientRects = orig
    }
  }
}

/** Range.getClientRects defineProperty 注入（reader-search-ui 形：jsdom 原无
 *  实现，vi.fn 注入+descriptor 语义还原，原无实现=删属性）——mock 暴露供
 *  用例内 mockImplementation 重排（视口几何换值场景） */
export function defineRangeClientRects(fn: () => DOMRectList): {
  mock: ReturnType<typeof vi.fn>
  restore(): void
} {
  const orig = Object.getOwnPropertyDescriptor(Range.prototype, 'getClientRects')
  const mock = vi.fn(fn)
  Object.defineProperty(Range.prototype, 'getClientRects', {
    value: mock,
    configurable: true
  })
  return {
    mock,
    restore(): void {
      if (orig === undefined) {
        delete (Range.prototype as { getClientRects?: unknown }).getClientRects
      } else {
        Object.defineProperty(Range.prototype, 'getClientRects', orig)
      }
    }
  }
}
