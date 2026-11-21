// @vitest-environment jsdom
/**
 * [B1-U1] A4 槽位解析红测试（选区正确性战役 A1–A5，先红半场——2026-11-21）。
 *
 * 探针定谳（b1-probe note.md F2/F3/F4/C1）：无 span 点（页边空白/中缝/图区/
 * 公式间隙）的原生 caret 落 textLayer 容器**元素槽位**（DIV.textLayer, k），
 * 槽位文本位=「某 span 之前」全局偏移、与视觉无对应 → 原生选区翻转（S1a：
 * anchor=摘要第5行@1982 正确、focus=容器槽位@1875 backward）→ enforce 对
 * itemOf=null 不判违例（selection-drag-controller.ts itemOf 仅当 span 父级
 * 匹配才解析）→ docOrderPair 按 DOM 序忠实定序放大 → 翻转进保存链（S1save
 * 落库 start=1522<down 点 1982）。
 *
 * 本文件三用例在**当前产品代码**上呈红（先红半场契约）；U2 实现修复单元
 * 1（mousedown 合成锚 / enforce 槽位违例投影 / mouseup 链同解析）后转绿：
 *  ① mousedown 从 textLayer 容器空白点（最近块回退授权）启动会话后，原生
 *    anchor 应为几何投影的坍缩光标（现=容器槽位——红）；
 *  ② drag 中 focus=容器槽位时 enforce 应投影回锚块（现不判违例——红；终局
 *    方向应 forward 覆盖拖拽方向内容、不含起点之前内容）；
 *  ③ 保存链（effectiveRangeOf→rangeToAnchor 装配面）：终局 anchor/focus
 *    正确后 quote/start 不含起点之前内容（现 start=槽位文本位——红）。
 *
 * jsdom 量测桩=stubRectOf 逐元素打盒（selection-drag-controller.test 同款
 * 手法）；原生 caret 槽位形态经 setBaseAndExtent 预置（jsdom 无原生解析）。
 */
import { afterEach, describe, expect, it } from 'vitest'
import { stubRectOf } from '../../utils/geometry'
import { createSelectionDragController } from '../../../src/renderer/features/reader/interact/selection-drag-controller'
import { effectiveRangeOf } from '../../../src/renderer/features/reader/interact/selection-effective-range'
import { rangeToAnchor } from '../../../src/renderer/features/reader/anchors/anchor-serialize'

/** 单栏夹具：标题独立带+五行正文块（最近块回退/带内投影判别面）。
 *  TITLE y[10,18]；R1..R5 y[26,36]/[42,52]/[58,68]/[74,84]/[90,100]（行距 16
 *  ×行高 10——连续正文不裂=R 块一枚 flow；TITLE 带净空 8≥0.75×medianH 分裂）。
 *  textLayer 原点 (0,0)=client 坐标同构。 */
const ROW_TEXT: Record<string, string> = {
  TITLE: 'TITLE HEAD',
  R1: 'ROW ONE',
  R2: 'ROW TWO',
  R3: 'ROW THREE',
  R4: 'ROW FOUR',
  R5: 'ROW FIVE'
}
const ROW_BOX: Record<string, { top: number; bottom: number }> = {
  TITLE: { top: 10, bottom: 18 },
  R1: { top: 26, bottom: 36 },
  R2: { top: 42, bottom: 52 },
  R3: { top: 58, bottom: 68 },
  R4: { top: 74, bottom: 84 },
  R5: { top: 90, bottom: 100 }
}
function makeLayer(): {
  page: HTMLElement
  layer: HTMLElement
  spanOf: (id: string) => HTMLSpanElement
  textOf: (id: string) => Text
  childIndexOf: (id: string) => number
  offsetOf: (id: string) => number
} {
  const page = document.createElement('div')
  page.setAttribute('data-page-root', '1')
  const layer = document.createElement('div')
  layer.className = 'textLayer'
  stubRectOf(layer, { top: 0, bottom: 140, left: 0, right: 300 })
  for (const id of ['TITLE', 'R1', 'R2', 'R3', 'R4', 'R5']) {
    const s = document.createElement('span')
    s.id = id
    s.textContent = ROW_TEXT[id]!
    stubRectOf(s, { ...ROW_BOX[id]!, left: 10, right: 200 })
    layer.append(s)
  }
  page.append(layer)
  document.body.append(page)
  const ids = ['TITLE', 'R1', 'R2', 'R3', 'R4', 'R5']
  return {
    page,
    layer,
    spanOf: (id) => document.getElementById(id) as HTMLSpanElement,
    textOf: (id) => document.getElementById(id)!.firstChild as Text,
    childIndexOf: (id) => Array.prototype.indexOf.call(layer.children, document.getElementById(id)),
    offsetOf: (id) => ids.slice(0, ids.indexOf(id)).reduce((n, k) => n + ROW_TEXT[k]!.length, 0)
  }
}

const down = (ctl: { onMouseDown(e: MouseEvent): void }, target: Element, x: number, y: number): MouseEvent => {
  const ev = new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: x, clientY: y })
  target.dispatchEvent(ev)
  ctl.onMouseDown(ev)
  return ev
}
const move = (x: number, y: number): void => {
  document.dispatchEvent(new MouseEvent('mousemove', { clientX: x, clientY: y }))
}
const sel = (): Selection => window.getSelection()!

afterEach(() => {
  document.body.innerHTML = ''
  sel().removeAllRanges()
})

describe('B1-U1 A4 槽位解析（先红半场——现产品代码呈红，U2 修复单元 1 转绿）', () => {
  it('① mousedown 从容器空白点启动（最近块回退授权）后原生 anchor 应为几何投影坍缩光标（现=容器槽位——红）', () => {
    const f = makeLayer()
    const ctl = createSelectionDragController({ pageRoot: f.page })
    // 原生零 span 点 caret 落容器槽位（探针 F2 abs-below-right/gutter 形态合成等价）
    sel().setBaseAndExtent(f.layer, 3, f.layer, 3)
    const e = down(ctl, f.layer, 2, 60)
    // 最近块回退授权（既有 [F-SELBLK-01] 语义）：不 preventDefault
    expect(e.defaultPrevented).toBe(false)
    // 修复单元 1-①：mousedown 时刻程序化置为几何投影的坍缩光标——y=60 落 R3
    // 带 [58,68]、x=2 在块左缘外 → 投影位=(R3 文本,0)。现仍为 (layer,3) 槽位 → 红
    expect(sel().anchorNode).toBe(f.textOf('R3'))
    expect(sel().anchorOffset).toBe(0)
    expect(sel().isCollapsed).toBe(true)
    expect(sel().focusNode).toBe(f.textOf('R3'))
  })

  it('①b 图区零文本点（块底以下空白，S1c 形态）：投影=视觉末带行尾（现=容器槽位——红）', () => {
    const f = makeLayer()
    const ctl = createSelectionDragController({ pageRoot: f.page })
    sel().setBaseAndExtent(f.layer, 1, f.layer, 1)
    const e = down(ctl, f.layer, 250, 115)
    expect(e.defaultPrevented).toBe(false)
    // y=115 越末带底（100）→ 视觉末带 R5；x=250 在块右缘外 → 行尾（ROW FIVE=8 字符）
    expect(sel().anchorNode).toBe(f.textOf('R5'))
    expect(sel().anchorOffset).toBe(ROW_TEXT.R5!.length)
    expect(sel().isCollapsed).toBe(true)
  })

  it('② drag 中 focus=容器槽位：enforce 应投影回锚块，终局 forward 覆盖拖拽内容（现不判违例——红）', () => {
    const f = makeLayer()
    const ctl = createSelectionDragController({ pageRoot: f.page })
    down(ctl, f.spanOf('R1'), 20, 31)
    move(250, 44)
    // 原生翻转态（S1a：anchor=down 点正确、focus=容器槽位——槽位文本位在
    // anchor 之前=backward；child 0=TITLE 之前的槽位）
    sel().setBaseAndExtent(f.textOf('R1'), 0, f.layer, 0)
    expect(ctl.onSelectionChange()).toBe(false)
    // 修复单元 1-②：focus 槽位=itemOf null 且 node 在 textLayer 内 → 违例，
    // 按 session.pointer（y=44 落 R2 带、px=250≥块 x1）投影 (R2 文本,7)
    expect(sel().focusNode).toBe(f.textOf('R2'))
    expect(sel().focusOffset).toBe(ROW_TEXT.R2!.length)
    expect(sel().anchorNode).toBe(f.textOf('R1'))
    expect(sel().anchorOffset).toBe(0)
    // 终局方向 forward：覆盖拖拽方向内容、不含起点之前内容（S1a 判别面）
    expect(sel().toString()).toContain('ROW ONE')
    expect(sel().toString()).toContain('ROW TWO')
    expect(sel().toString()).not.toContain('TITLE HEAD')
  })

  it('③ 保存链（effectiveRangeOf→rangeToAnchor）：quote/start 不含 down 点之前内容（装配经控制器=复刻 S1save 真链——主控裁决 1(b)）', () => {
    const f = makeLayer()
    const ctl = createSelectionDragController({ pageRoot: f.page })
    const downOffset = f.offsetOf('R5') + 3
    // 真链装配（探针 note.md F3/F4/S1save）：mousedown 落 R5 行内（原生 anchor
    // =down 点正确）→ 12 步拖至块底以下 → 原生 focus=容器槽位（R4 之前的槽位
    // =翻转态）→ selectionchange/mouseup enforce 投影。jsdom 无原生选区扩展，
    // 槽位形态经 setBaseAndExtent 预置（控制器链与真机同源）。
    // 注：无会话槽位形态在单元 1+2 后生产不可达（未授权 mousedown 被
    // preventDefault、授权 mousedown 必有会话），本装配=复刻活性会话真链。
    down(ctl, f.spanOf('R5'), 20, 95)
    move(250, 115)
    sel().setBaseAndExtent(f.textOf('R5'), 3, f.layer, f.childIndexOf('R4'))
    expect(ctl.onSelectionChange()).toBe(false)
    // mouseup 链（selection-events onMouseUp 的 enforce×2——幂等）
    ctl.enforce()
    ctl.enforce()
    expect(sel().focusNode).toBe(f.textOf('R5'))
    const eff = effectiveRangeOf(sel())
    const anchor = rangeToAnchor(f.layer, eff)
    expect(anchor).not.toBeNull()
    // 终局边界正确后：start=down 点偏移（quote 自 down 点起）
    expect(anchor!.start).toBe(downOffset)
    expect(anchor!.quote).not.toContain('ROW FOUR')
  })
})
