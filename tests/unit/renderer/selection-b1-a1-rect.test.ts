// @vitest-environment jsdom
/**
 * [B1-U1] A1 标注矩形拦截红测试（选区正确性战役 A1–A5，先红半场——2026-11-21）。
 *
 * 探针定谳（b1-probe note.md F6/F8/C3/C7-1）：常规模式下标注矩形
 * （DIV[data-testid=annotation-rect]）参与 elementFromPoint 命中（无
 * pointer-events:none）→ 拖选从矩形起=原生 anchor 落矩形槽位（不在
 * textLayer）→ 控制器 onMouseDown 因 closest('.textLayer') 不命中**不启动
 * 也不 preventDefault** → 原生垃圾选区（S7：矩形槽位在 DOM 序位于整个
 * textLayer 之后，docOrder 拉到页尾，toString 3037 字符+46 块灰底；S5：
 * selLen=0/paint=0 静默失败）。「加深不均」=绿标注与灰底叠色（非缺陷）。
 *
 * 修复单元 2（主控终裁）：常规模式下 mousedown 命中标注矩形 → preventDefault
 * （杀原生垃圾选区；click 仍发打开菜单——Chromium preventDefault mousedown
 * 不取消 click）+ 不启动会话。选择模式语义零变（rect pointer-events:none
 * 恒不命中——AnnotationLayer selectionMode 分支既有行为，本件不触）。
 *
 * 本文件在**当前产品代码**上呈红（红断言=preventDefault）；对照用例（页盒
 * 空白不 preventDefault）锁定既有 52 号语义防修复过宽——恒绿。
 */
import { afterEach, describe, expect, it } from 'vitest'
import { stubRectOf } from '../../utils/geometry'
import { createSelectionDragController } from '../../../src/renderer/features/reader/interact/selection-drag-controller'

/** 单页夹具：textLayer 三行正文+一枚盖住 R2 的标注矩形（F6 形态合成等价） */
function makeRectLayer(): {
  page: HTMLElement
  layer: HTMLElement
  rect: HTMLDivElement
  textOf: (id: string) => Text
} {
  const page = document.createElement('div')
  page.setAttribute('data-page-root', '1')
  const layer = document.createElement('div')
  layer.className = 'textLayer'
  stubRectOf(layer, { top: 0, bottom: 120, left: 0, right: 300 })
  const rows: Array<[string, number]> = [['R1', 26], ['R2', 42], ['R3', 58]]
  for (const [id, top] of rows) {
    const s = document.createElement('span')
    s.id = id
    s.textContent = `${id} BODY`
    stubRectOf(s, { top, bottom: top + 10, left: 10, right: 200 })
    layer.append(s)
  }
  // 标注矩形（AnnotationLayer 常规模式形态：absolute+data-testid，无
  // pointer-events:none——盖住 R2 行）
  const rect = document.createElement('div')
  rect.setAttribute('data-testid', 'annotation-rect')
  rect.style.position = 'absolute'
  stubRectOf(rect, { top: 42, bottom: 52, left: 10, right: 200 })
  page.append(layer, rect)
  document.body.append(page)
  return {
    page,
    layer,
    rect,
    textOf: (id) => document.getElementById(id)!.firstChild as Text
  }
}

const down = (ctl: { onMouseDown(e: MouseEvent): void }, target: Element, x: number, y: number): MouseEvent => {
  const ev = new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: x, clientY: y })
  target.dispatchEvent(ev)
  ctl.onMouseDown(ev)
  return ev
}
const sel = (): Selection => window.getSelection()!

afterEach(() => {
  document.body.innerHTML = ''
  sel().removeAllRanges()
})

describe('B1-U1 A1 标注矩形拦截（先红半场——现产品代码呈红，U2 修复单元 2 转绿）', () => {
  it('常规模式 mousedown 命中标注矩形 → preventDefault 杀原生垃圾选区+不启动会话（现不 preventDefault——红）', () => {
    const f = makeRectLayer()
    const ctl = createSelectionDragController({ pageRoot: f.page })
    const e = down(ctl, f.rect, 60, 47)
    // 修复单元 2：命中标注矩形（pageRoot 内非 textLayer 元素）→ preventDefault
    //（杀 S5/S7 原生垃圾选区链）。现 closest('.textLayer') 不命中早退不
    // preventDefault → 红
    expect(e.defaultPrevented).toBe(true)
    // 不启动会话：其后原生垃圾选区（S7 形态：矩形槽位→正文行尾）零改写
    sel().setBaseAndExtent(f.rect, 0, f.textOf('R3'), 3)
    expect(ctl.onSelectionChange()).toBe(false)
    expect(sel().focusNode).toBe(f.textOf('R3'))
    expect(sel().focusOffset).toBe(3)
  })

  it('对照（恒绿）：页盒空白（非矩形非 textLayer 目标）不 preventDefault——52 号零触语义保持', () => {
    const f = makeRectLayer()
    const ctl = createSelectionDragController({ pageRoot: f.page })
    const e = down(ctl, f.page, 250, 110)
    expect(e.defaultPrevented).toBe(false)
  })
})
