// @vitest-environment jsdom
/**
 * [B1-U3] R3 中缝远端投影红测试（选区正确性战役单元 6，先红半场——2026-11-21）。
 *
 * 探针定谳（b1-probe2 note.md §1 注+§8）：G5（左栏 span 起→中缝终，用户原始
 * 手势形状）在页 4 巨块（F1 已知边界：blocks=5/gutters=[]——detectGutter 塌陷）
 * 上，enforce 槽位投影 projectCaretTo（带内最近盒按 x 距离）把 focus 吸到右栏
 * 远端（"MAE"，选区 3582 字符）——违反 plan §3.2-A4「选区只能向拖拽方向覆盖
 * 目标段」中缝条款。机制：巨块 blockItems 含左右两栏行盒 → 释放点 x 落缝带
 * （不命中任何盒）→ 带内最近盒判据把 focus 送向右栏近缘盒。
 *
 * 修复单元 6（同域约束）：指针未命中带内任何盒（缝带/栏外悬停形态）且 down 点
 * 命中盒在场 → 候选集收窄为与 down 命中盒 x 域重叠 >0 的盒（收窄集空=降级现状
 * 全带最近盒）；指针命中盒内（明确入栏）→ 现行为零变——与 F-VISFB-52「跨双栏
 * 需指针明确入栏授权」相容：授权层防线=in-gutter 不授权（INV-178④），巨块形态
 * 块表失守（gutters=[]）时授权层无防线，投影层以 down 同域约束承接 A4 中缝条款
 * ——指针未明确进入对栏（x 未落入任何对栏盒）时 focus 不得越过缝带。
 *
 * 装配面经 createSelectionDragController（参照 selection-b1-a4-slot.test 手法：
 * stubRectOf 逐元素打盒、槽位形态经 setBaseAndExtent 预置）。
 * 夹具=巨块形态合成：全宽行 F0/F2+双栏行 LA1/RA1（行距 16×行高 10——净空
 * 6<0.75×medianH 不裂；单条多盒行带 → MIN_GUTTER_BANDS=2 不立缝 → 单栏态
 * → 整面一枚 flow 巨块、gutters=[]，与页 4 blocks=5/gutters=[] 形态同构）。
 */
import { afterEach, describe, expect, it } from 'vitest'
import { stubRectOf } from '../../utils/geometry'
import { createSelectionDragController } from '../../../src/renderer/features/reader/interact/selection-drag-controller'
import { detectBlockLayout } from '../../../src/renderer/features/reader/interact/selection-block-layout'
import type { LineBox } from '../../../src/renderer/features/reader/interact/selection-column-layout'

const ROW_TEXT: Record<string, string> = {
  F0: 'FULL WIDTH HEAD LINE',
  LA1: 'LEFT COL ROW ONE',
  RA1: 'RIGHT COL ROW ONE',
  F2: 'FULL WIDTH TAIL LINE'
}
/** 行盒（textLayer 本地 600 宽）：F0/F2 全宽（单盒行带不参与中缝投票），
 *  LA1/RA1 同带双盒（缝候选 [280,320] 仅 1 条 < 法定带数 2 → 巨块） */
const BOX: Record<string, { x: number; w: number; top: number; bottom: number }> = {
  F0: { x: 20, w: 560, top: 26, bottom: 36 },
  LA1: { x: 20, w: 260, top: 42, bottom: 52 },
  RA1: { x: 320, w: 260, top: 42, bottom: 52 },
  F2: { x: 20, w: 560, top: 58, bottom: 68 }
}

function makeLayer(): {
  page: HTMLElement
  layer: HTMLElement
  textOf: (id: string) => Text
  spanOf: (id: string) => HTMLSpanElement
  boxes: LineBox[]
} {
  const page = document.createElement('div')
  page.setAttribute('data-page-root', '1')
  const layer = document.createElement('div')
  layer.className = 'textLayer'
  stubRectOf(layer, { top: 0, bottom: 140, left: 0, right: 600 })
  for (const id of ['F0', 'LA1', 'RA1', 'F2']) {
    const s = document.createElement('span')
    s.id = id
    s.textContent = ROW_TEXT[id]!
    stubRectOf(s, { ...BOX[id]!, left: BOX[id]!.x, right: BOX[id]!.x + BOX[id]!.w })
    layer.append(s)
  }
  page.append(layer)
  document.body.append(page)
  const ids = ['F0', 'LA1', 'RA1', 'F2']
  return {
    page,
    layer,
    spanOf: (id) => document.getElementById(id) as HTMLSpanElement,
    textOf: (id) => document.getElementById(id)!.firstChild as Text,
    boxes: ids.map((id) => ({ x: BOX[id]!.x, y: BOX[id]!.top, w: BOX[id]!.w, h: BOX[id]!.bottom - BOX[id]!.top }))
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

describe('B1-U3 R3 巨块中缝远端投影（先红半场——现产品代码呈红，单元 6 转绿）', () => {
  it('夹具自证：巨块形态（detectBlockLayout 单枚 flow 块跨两栏、gutters=[]——页 4 块表失守形态同构）', () => {
    const f = makeLayer()
    const layout = detectBlockLayout(f.boxes)
    expect(layout.blocks).toHaveLength(1)
    expect(layout.blocks[0]!.kind).toBe('flow')
    expect(layout.blocks[0]!.boxes).toHaveLength(4)
    expect(layout.gutters).toHaveLength(0)
    // 巨块包络跨缝（左栏右缘 280 < 缝中线 300 < 右栏左缘 320）
    expect(layout.blocks[0]!.x0).toBeLessThanOrEqual(20)
    expect(layout.blocks[0]!.x1).toBeGreaterThanOrEqual(580)
  })

  it('中缝带释放：focus 仍在 down 点同栏（现树被带内最近盒吸到右栏——红）', () => {
    const f = makeLayer()
    const ctl = createSelectionDragController({ pageRoot: f.page })
    // down 落左栏行内（授权巨块）；拖至缝带 x=310（LA1 右缘 280/RA1 左缘 320 之间）
    down(ctl, f.spanOf('LA1'), 100, 47)
    move(310, 47)
    // 原生形态（探针 G5f：anchor=down 点正确、focus=容器槽位）——jsdom 预置
    sel().setBaseAndExtent(f.textOf('LA1'), 0, f.layer, 0)
    expect(ctl.onSelectionChange()).toBe(false)
    // 修复单元 6：指针未命中带内任何盒（缝带悬停）→ 候选收窄 down 命中盒 x 域
    // → focus=LA1（左栏）。现树=带内最近盒判据 → RA1（右栏近缘）——红
    const focusEl = sel().focusNode!.parentElement as HTMLElement
    expect(focusEl.id.startsWith('L')).toBe(true)
  })

  it('对照（现绿——修复后必须保持）：指针明确落入右栏盒内 → focus 合法投影右栏（F-VISFB-52 入栏授权语义不收紧）', () => {
    const f = makeLayer()
    const ctl = createSelectionDragController({ pageRoot: f.page })
    down(ctl, f.spanOf('LA1'), 100, 47)
    move(400, 47) // x=400 ∈ RA1 [320,580]——指针命中盒=明确入栏
    sel().setBaseAndExtent(f.textOf('LA1'), 0, f.layer, 0)
    expect(ctl.onSelectionChange()).toBe(false)
    expect(sel().focusNode).toBe(f.textOf('RA1'))
    expect(sel().anchorNode).toBe(f.textOf('LA1'))
  })
})
