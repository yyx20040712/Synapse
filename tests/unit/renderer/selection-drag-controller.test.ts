// @vitest-environment jsdom
/**
 * [F-VISFB-52] selection-drag-controller 直测（指针授权手势——态空间+跨格序列，
 * always-active 不经 guardedDescribe）。
 *
 * jsdom 量测桩=stubRectOf 逐元素打盒（release-affinity/fa12 同款手法）；jsdom
 * 不派发原生 selectionchange——事件一律 onSelectionChange 直调；「browser 已
 * 解析」选区经 setBaseAndExtent 预置（fa12 presetDescended 同款）。
 *
 * 覆盖面（态空间表+跨格序列）：
 *  授权三分支（左/右启动+非 textLayer 目标零触）/中缝+零栏不启动（preventDefault）/
 *  违例拖选钳制（focus 投影回锚栏行尾——§0-4 跨双栏需指针明确入栏授权）/
 *  mousemove 只写 ref（零选区写，pointer 供投影消费）/echo 精确抑制（canonical
 *  signature 相等——探针 E1/E2 逐字回声）/有界振荡退出（CAP=3+mousemove 重开
 *  写窗——B4 加严）/mouseup 会话终局后外部选区不吞（B4-3 S5 窗语义）/
 *  shift+click 锚侧违例投影/栏顶之上=栏首+栏底之下=栏尾/中缝悬停元素槽位形态
 *  （探针 E9——focus=(span,0) 元素形）。
 */
import { afterEach, describe, expect, it } from 'vitest'
import { stubRectOf } from '../../utils/geometry'
import { createSelectionDragController } from '../../../src/renderer/features/reader/interact/selection-drag-controller'

/**
 * 双栏夹具（结构对齐 0C fixture 形态：左右栏+中缝+行带）：
 * 左栏 L1..L3 x[10,90]、右栏 R1..R3 x[210,290]、中缝 [90,210]、
 * 行带 y：[10,20]/[34,44]/[58,68]；textLayer 原点 (0,0)=client 坐标同构。
 */
function makeTwoColLayer(): {
  page: HTMLElement
  layer: HTMLElement
  spanOf: (id: string) => HTMLSpanElement
  textOf: (id: string) => Text
} {
  const page = document.createElement('div')
  page.setAttribute('data-page-root', '1')
  const layer = document.createElement('div')
  layer.className = 'textLayer'
  stubRectOf(layer, { top: 0, bottom: 120, left: 0, right: 300 })
  const mk = (id: string, text: string, b: { top: number; bottom: number; left: number; right: number }): HTMLSpanElement => {
    const s = document.createElement('span')
    s.id = id
    s.textContent = text
    stubRectOf(s, b)
    layer.append(s)
    return s
  }
  mk('L1', 'LEFT ONE', { top: 10, bottom: 20, left: 10, right: 90 })
  mk('L2', 'LEFT TWO', { top: 34, bottom: 44, left: 10, right: 90 })
  mk('L3', 'LEFT THREE', { top: 58, bottom: 68, left: 10, right: 90 })
  mk('R1', 'RIGHT ONE', { top: 10, bottom: 20, left: 210, right: 290 })
  mk('R2', 'RIGHT TWO', { top: 34, bottom: 44, left: 210, right: 290 })
  mk('R3', 'RIGHT THREE', { top: 58, bottom: 68, left: 210, right: 290 })
  page.append(layer)
  document.body.append(page)
  return {
    page,
    layer,
    spanOf: (id) => document.getElementById(id) as HTMLSpanElement,
    textOf: (id) => document.getElementById(id)!.firstChild as Text
  }
}

/** mousedown 直调（控制器不自带 mousedown 监听——SelectionLayer 接线驱动；
 *  dispatch 保 e.target=真实元素形态，再直调句柄） */
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

describe('F-VISFB-52 selection-drag-controller —— 指针授权手势', () => {
  it('① 授权 mousedown（左/右栏）启动会话；非 textLayer 目标零触', () => {
    const f = makeTwoColLayer()
    const ctl = createSelectionDragController({ pageRoot: f.page })
    // 左栏授权：不 preventDefault，后续违例被钳制（会话在场的唯一行为证据）
    const eL = down(ctl, f.spanOf('L1'), 20, 15)
    expect(eL.defaultPrevented).toBe(false)
    move(250, 39)
    sel().setBaseAndExtent(f.textOf('L1'), 0, f.textOf('R2'), 4)
    expect(ctl.onSelectionChange()).toBe(false)
    expect(sel().focusNode).toBe(f.textOf('L2'))
    expect(sel().focusOffset).toBe(8)
    // 右栏授权：违例 focus 在左栏 → 投影右栏行首
    const eR = down(ctl, f.spanOf('R1'), 250, 15)
    expect(eR.defaultPrevented).toBe(false)
    move(20, 39)
    sel().setBaseAndExtent(f.textOf('R1'), 0, f.textOf('L2'), 4)
    ctl.onSelectionChange()
    expect(sel().focusNode).toBe(f.textOf('R2'))
    expect(sel().focusOffset).toBe(0)
    // 非 textLayer 目标（页盒空白区）：零触不 preventDefault
    const eOut = down(ctl, f.page, 150, 110)
    expect(eOut.defaultPrevented).toBe(false)
  })

  it('② 中缝/零栏不启动：preventDefault+无会话（后续违例选区原样转发不被改写）', () => {
    const f = makeTwoColLayer()
    const ctl = createSelectionDragController({ pageRoot: f.page })
    // 指针落中缝 [90,210]（§0-4 跨双栏需指针明确入栏授权）
    const eG = down(ctl, f.layer, 150, 39)
    expect(eG.defaultPrevented).toBe(true)
    sel().setBaseAndExtent(f.textOf('L1'), 0, f.textOf('R2'), 4)
    expect(ctl.onSelectionChange()).toBe(false)
    expect(sel().focusNode).toBe(f.textOf('R2'))
    expect(sel().focusOffset).toBe(4)
    // 零栏（空 textLayer——在控制器 pageRoot 含域内）不启动
    const emptyPage = document.createElement('div')
    emptyPage.setAttribute('data-page-root', '2')
    const emptyLayer = document.createElement('div')
    emptyLayer.className = 'textLayer'
    stubRectOf(emptyLayer, { top: 0, bottom: 100, left: 0, right: 300 })
    emptyPage.append(emptyLayer)
    f.page.append(emptyPage)
    const eEmpty = down(ctl, emptyLayer, 50, 50)
    expect(eEmpty.defaultPrevented).toBe(true)
  })

  it('③ 违例拖选钳制：focus 投影回锚栏行尾（visual-full-mouseup 共用源）；栏内非违例零写', () => {
    const f = makeTwoColLayer()
    const ctl = createSelectionDragController({ pageRoot: f.page })
    down(ctl, f.spanOf('L1'), 20, 15)
    move(250, 39)
    // browser 已解析的跨栏选区（探针 E8 形态：anchor 留锚栏/focus 落对侧栏）
    sel().setBaseAndExtent(f.textOf('L1'), 0, f.textOf('R2'), 4)
    expect(ctl.onSelectionChange()).toBe(false)
    expect(sel().anchorNode).toBe(f.textOf('L1'))
    expect(sel().anchorOffset).toBe(0)
    expect(sel().focusNode).toBe(f.textOf('L2'))
    expect(sel().focusOffset).toBe(8)
    // 栏内选区（非违例）：零写原样
    sel().setBaseAndExtent(f.textOf('L1'), 0, f.textOf('L3'), 4)
    ctl.onSelectionChange()
    expect(sel().focusNode).toBe(f.textOf('L3'))
    expect(sel().focusOffset).toBe(4)
  })

  it('④ mousemove 只写 ref：拖选 move 风暴零选区写，pointer 供其后投影消费', () => {
    const f = makeTwoColLayer()
    const ctl = createSelectionDragController({ pageRoot: f.page })
    // 预置违例选区（browser 已解析态在场），mousedown 后 move 风暴不写选区
    sel().setBaseAndExtent(f.textOf('L1'), 0, f.textOf('R2'), 4)
    down(ctl, f.spanOf('L1'), 20, 15)
    for (let i = 0; i < 5; i += 1) {
      move(120 + i * 30, 20 + i * 8)
    }
    expect(sel().focusNode).toBe(f.textOf('R2'))
    expect(sel().focusOffset).toBe(4)
    // selectionchange 时刻以「最后一 move」的 pointer 投影：y=52 → L2/L3 行带间隙下沿
    // 取下带 L3（阅读序下行）；px=240 ≥ 锚栏 x1 → 行尾
    ctl.onSelectionChange()
    expect(sel().focusNode).toBe(f.textOf('L3'))
    expect(sel().focusOffset).toBe(10)
  })

  it('⑤ echo 精确抑制：自写签名相等的事件被抑制不转发，异形态不抑制', () => {
    const f = makeTwoColLayer()
    const ctl = createSelectionDragController({ pageRoot: f.page })
    down(ctl, f.spanOf('L1'), 20, 15)
    move(250, 39)
    sel().setBaseAndExtent(f.textOf('L1'), 0, f.textOf('R2'), 4)
    ctl.onSelectionChange()
    // 探针 E1：自写逐字回声——canonical signature 相等 → 抑制（true）
    expect(ctl.onSelectionChange()).toBe(true)
    expect(sel().focusNode).toBe(f.textOf('L2'))
    // 异形态（外部/归一化态）：不抑制（false 转发）
    sel().setBaseAndExtent(f.textOf('L1'), 0, f.textOf('R2'), 5)
    expect(ctl.onSelectionChange()).toBe(false)
  })

  it('⑥ 归一化振荡有界退出：无 move 窗内连续自写 ≤3，超出接受终态；move 重开写窗', () => {
    const f = makeTwoColLayer()
    const ctl = createSelectionDragController({ pageRoot: f.page })
    down(ctl, f.spanOf('L1'), 20, 15)
    move(250, 39)
    let clamps = 0
    for (let i = 0; i < 8; i += 1) {
      // 模拟浏览器反复归一化：每轮把选区重置为异形态违例态再派发
      sel().setBaseAndExtent(f.textOf('L1'), 0, f.textOf('R2'), 4)
      ctl.onSelectionChange()
      if (sel().focusNode === f.textOf('L2')) clamps += 1
    }
    expect(clamps).toBe(3)
    // 终态接受语义：其后违例事件不再改写（浏览器终态保留）
    expect(sel().focusNode).toBe(f.textOf('R2'))
    // mousemove（用户输入）重开写窗：下一轮恢复钳制
    move(250, 39)
    sel().setBaseAndExtent(f.textOf('L1'), 0, f.textOf('R2'), 4)
    ctl.onSelectionChange()
    expect(sel().focusNode).toBe(f.textOf('L2'))
  })

  it('⑦ mouseup 会话终局：enforce 终局核查+endSession 后外部选区不被拦截/清除（B4-3）', () => {
    const f = makeTwoColLayer()
    const ctl = createSelectionDragController({ pageRoot: f.page })
    down(ctl, f.spanOf('L1'), 20, 15)
    // 终局时仍违例（最后一次 native 变更未经事件处理）→ enforce 同步钳制
    move(250, 39)
    sel().setBaseAndExtent(f.textOf('L1'), 0, f.textOf('R2'), 4)
    ctl.enforce()
    expect(sel().focusNode).toBe(f.textOf('L2'))
    // 幂等：已钳制态再核零写
    ctl.enforce()
    expect(sel().focusNode).toBe(f.textOf('L2'))
    ctl.endSession()
    // 会话终局后外部（非本控制器发起）选区：转发不吞、不改写不清除
    sel().setBaseAndExtent(f.textOf('L1'), 0, f.textOf('R2'), 6)
    expect(ctl.onSelectionChange()).toBe(false)
    expect(sel().focusNode).toBe(f.textOf('R2'))
    expect(sel().focusOffset).toBe(6)
  })

  it('⑧ shift+click 锚侧违例：anchor（旧栏）投影锚栏行首，focus 原样', () => {
    const f = makeTwoColLayer()
    const ctl = createSelectionDragController({ pageRoot: f.page })
    // 旧锚=左栏 L2 首，shift+click 落右栏 R1（pointer 授权栏=right）
    sel().setBaseAndExtent(f.textOf('L2'), 0, f.textOf('R1'), 3)
    down(ctl, f.spanOf('R1'), 250, 15)
    ctl.onSelectionChange()
    // anchor 投影：按锚盒自身 y（L2 行带 [34,44]）→ R2 行；锚盒在目标栏左侧 → 行首
    expect(sel().anchorNode).toBe(f.textOf('R2'))
    expect(sel().anchorOffset).toBe(0)
    expect(sel().focusNode).toBe(f.textOf('R1'))
    expect(sel().focusOffset).toBe(3)
  })

  it('⑨ 指针越出栏带：低于栏底=栏尾（DOM 序末项文本尾）、高于栏顶=栏首（首项 offset 0）', () => {
    const f = makeTwoColLayer()
    const ctl = createSelectionDragController({ pageRoot: f.page })
    down(ctl, f.spanOf('L1'), 20, 15)
    move(250, 200)
    sel().setBaseAndExtent(f.textOf('L1'), 0, f.textOf('R3'), 2)
    ctl.onSelectionChange()
    expect(sel().focusNode).toBe(f.textOf('L3'))
    expect(sel().focusOffset).toBe(10)
    move(250, 5)
    sel().setBaseAndExtent(f.textOf('L1'), 0, f.textOf('R3'), 2)
    ctl.onSelectionChange()
    expect(sel().focusNode).toBe(f.textOf('L1'))
    expect(sel().focusOffset).toBe(0)
  })

  it('⑩ 中缝悬停元素槽位形态（探针 E9）：focus=(span,0) 元素形按 span 归属判栏', () => {
    const f = makeTwoColLayer()
    const ctl = createSelectionDragController({ pageRoot: f.page })
    down(ctl, f.spanOf('L1'), 20, 15)
    move(150, 39)
    // 元素槽位形落锚栏 span（E9：中缝悬停解析为邻行 span 槽位）→ 非违例零写
    sel().setBaseAndExtent(f.textOf('L1'), 0, f.spanOf('L2'), 0)
    ctl.onSelectionChange()
    expect(sel().focusNode).toBe(f.spanOf('L2'))
    expect(sel().focusOffset).toBe(0)
    // 元素槽位形落对侧栏 span → 违例钳制（px=150 ≥ 锚栏 x1=90 → 行尾）
    sel().setBaseAndExtent(f.textOf('L1'), 0, f.spanOf('R2'), 0)
    ctl.onSelectionChange()
    expect(sel().focusNode).toBe(f.textOf('L2'))
    expect(sel().focusOffset).toBe(8)
  })

  it('⑪ 回声签名一次性消费+会话边界清零（回炉 B-1）：endSession 后外部 T 与旧自写态 S 均不得抑制', () => {
    const f = makeTwoColLayer()
    const ctl = createSelectionDragController({ pageRoot: f.page })
    down(ctl, f.spanOf('L1'), 20, 15)
    move(250, 39)
    sel().setBaseAndExtent(f.textOf('L1'), 0, f.textOf('R2'), 4)
    ctl.onSelectionChange()
    // 自写 S=（L1,0,L2,8）在场
    expect(sel().focusNode).toBe(f.textOf('L2'))
    ctl.endSession()
    // 外部 T（异形态）：不得抑制（false=转发）
    sel().setBaseAndExtent(f.textOf('L2'), 0, f.textOf('R3'), 5)
    expect(ctl.onSelectionChange()).toBe(false)
    expect(sel().focusNode).toBe(f.textOf('R3'))
    // 外部再选旧自写态 S（与残留签名精确匹配）：不得抑制——终局选区对调度器可见
    sel().setBaseAndExtent(f.textOf('L1'), 0, f.textOf('L2'), 8)
    expect(ctl.onSelectionChange()).toBe(false)
    expect(sel().focusNode).toBe(f.textOf('L2'))
  })

  it('⑫ 相邻 drag epoch 签名域隔离（回炉 B-1）：第二纪授权 mousedown 后外部到达旧纪自写态 S 不得抑制', () => {
    const f = makeTwoColLayer()
    const ctl = createSelectionDragController({ pageRoot: f.page })
    down(ctl, f.spanOf('L1'), 20, 15)
    move(250, 39)
    sel().setBaseAndExtent(f.textOf('L1'), 0, f.textOf('R2'), 4)
    ctl.onSelectionChange()
    ctl.endSession()
    // 第二纪：授权 mousedown（新 drag epoch=新签名域，未自写）
    down(ctl, f.spanOf('L1'), 20, 15)
    sel().setBaseAndExtent(f.textOf('L1'), 0, f.textOf('L2'), 8)
    expect(ctl.onSelectionChange()).toBe(false)
    // S 本就合规（锚栏内）→ 不被改写
    expect(sel().focusNode).toBe(f.textOf('L2'))
    expect(sel().focusOffset).toBe(8)
  })

  it('⑬ 写窗交错（回炉 W-1）：写→mousemove→写…8 轮各重开窗，每窗恰 1 写、全程 8 写>CAP（epoch 随真实移动无界=设计语义）', () => {
    const f = makeTwoColLayer()
    const ctl = createSelectionDragController({ pageRoot: f.page })
    down(ctl, f.spanOf('L1'), 20, 15)
    move(250, 39)
    for (let i = 0; i < 8; i += 1) {
      sel().setBaseAndExtent(f.textOf('L1'), 0, f.textOf('R2'), 4)
      ctl.onSelectionChange()
      expect(sel().focusNode).toBe(f.textOf('L2'))
      move(250, 39)
    }
  })
})
