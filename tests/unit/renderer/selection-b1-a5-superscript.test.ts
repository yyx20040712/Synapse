// @vitest-environment jsdom
/**
 * [B1-U1] A5 角标回归锚（选区正确性战役 A1–A5，先红半场批次——本件为
 * **回归锚**：探针定谳角标未破坏阅读序（b1-probe note.md F11/C6：上标 a–f
 * 各成单 span 独立块+与正文列间 1.5px 微缝=设计语义；DOM 序=流序），故本
 * 件在当前产品代码上预期**绿**——如实记录（红测试清单第 7 条「现应绿或红
 * 均可如实记录——设计用」）；U2 修复单元 1/2 落地后必须保持绿（角标形态
 * 不得引入方向翻转）。
 *
 * 断言面（拖选方向不被角标翻转）：
 *  - 正向拖选（anchor=行1正文@k → focus=行2正文@m）：eff 边界文档序定序
 *    start=anchor 侧、区间端点=期望偏移（不翻转到起点之前内容）；
 *  - 反向拖选（anchor=行2 → focus=行1）：同一区间（文档序定序对称）；
 *  - focus 落上标 span：区间按文档序推进（上标项在名字前/后按 DOM 序计入，
 *    不跳变、不含 down 点之前内容）。
 *
 * 夹具=角标页合成等价（上标单字 span fs5+正文列 fs8、列间 1.5px 微缝——
 * createSuperscriptAffilPdf 同几何）。
 */
import { afterEach, describe, expect, it } from 'vitest'
import { stubRectOf } from '../../utils/geometry'
import { effectiveRangeOf, normalizedOffsetsOf } from '../../../src/renderer/features/reader/interact/selection-effective-range'
import { fullTextOf } from '../../../src/renderer/features/reader/anchors/annotation-anchor'

/** 角标行表：上标单字（fs5 盒 h5）+正文列（fs8 盒 h8，同带基线）——微缝 1.5px */
interface Affil {
  id: string
  text: string
  box: { top: number; bottom: number; left: number; right: number }
}
function affilRows(): Affil[] {
  const out: Affil[] = []
  const sups = ['a', 'b', 'c']
  const bodies = ['AFFIL LINE ZERO', 'AFFIL LINE ONE', 'AFFIL LINE TWO']
  for (let i = 0; i < 3; i += 1) {
    const top = 100 + i * 20
    out.push({ id: `SUP${i}`, text: sups[i]!, box: { top, bottom: top + 5, left: 40, right: 43 } })
    out.push({ id: `B${i}`, text: bodies[i]!, box: { top: top - 2, bottom: top + 6, left: 44.5, right: 150 } })
  }
  return out
}

function makeAffilLayer(): {
  page: HTMLElement
  layer: HTMLElement
  textOf: (id: string) => Text
  offsetOf: (id: string) => number
} {
  const page = document.createElement('div')
  page.setAttribute('data-page-root', '1')
  const layer = document.createElement('div')
  layer.className = 'textLayer'
  stubRectOf(layer, { top: 0, bottom: 180, left: 0, right: 300 })
  const rows = affilRows()
  for (const r of rows) {
    const s = document.createElement('span')
    s.id = r.id
    s.textContent = r.text
    stubRectOf(s, r.box)
    layer.append(s)
  }
  page.append(layer)
  document.body.append(page)
  return {
    page,
    layer,
    textOf: (id) => document.getElementById(id)!.firstChild as Text,
    offsetOf: (id) => rows.slice(0, rows.findIndex((r) => r.id === id)).reduce((n, r) => n + r.text.length, 0)
  }
}

const sel = (): Selection => window.getSelection()!

afterEach(() => {
  document.body.innerHTML = ''
  sel().removeAllRanges()
})

describe('B1-U1 A5 角标方向回归锚（探针定谳=绿；U2 修复后须保持绿）', () => {
  it('正向拖选（B1@6→B2@4）：eff 文档序 start=anchor 侧、区间端点=期望偏移（不含 down 点之前内容）', () => {
    const f = makeAffilLayer()
    sel().setBaseAndExtent(f.textOf('B0'), 6, f.textOf('B1'), 4)
    const eff = effectiveRangeOf(sel())
    // 方向不翻：start=anchor 侧（B0 文本@6——DOM 序在前）
    expect(eff.startContainer).toBe(f.textOf('B0'))
    expect(eff.startOffset).toBe(6)
    const offs = normalizedOffsetsOf(f.layer, eff, fullTextOf(f.layer))
    const wantStart = f.offsetOf('B0') + 6
    const wantEnd = f.offsetOf('B1') + 4
    expect(offs).toEqual({ start: wantStart, end: wantEnd })
    expect(wantStart).toBe(f.offsetOf('B0') + 6)
  })

  it('反向拖选（B2@4→B1@6）：文档序定序对称——同一区间（anchor/focus 无向语义）', () => {
    const f = makeAffilLayer()
    sel().setBaseAndExtent(f.textOf('B1'), 4, f.textOf('B0'), 6)
    const eff = effectiveRangeOf(sel())
    expect(eff.startContainer).toBe(f.textOf('B0'))
    expect(eff.startOffset).toBe(6)
    const offs = normalizedOffsetsOf(f.layer, eff, fullTextOf(f.layer))
    expect(offs).toEqual({ start: f.offsetOf('B0') + 6, end: f.offsetOf('B1') + 4 })
  })

  it('focus 落上标 span（B0@6→SUP1@1）：区间按文档序推进到上标位（不跳变/不含 down 点之前内容）', () => {
    const f = makeAffilLayer()
    sel().setBaseAndExtent(f.textOf('B0'), 6, f.textOf('SUP1'), 1)
    const eff = effectiveRangeOf(sel())
    expect(eff.startContainer).toBe(f.textOf('B0'))
    const offs = normalizedOffsetsOf(f.layer, eff, fullTextOf(f.layer))
    // SUP1 在 DOM 序位于 B0 之后（a+B0+b+B1…）→ 区间=[B0@6, b 之后]
    expect(offs).toEqual({ start: f.offsetOf('B0') + 6, end: f.offsetOf('SUP1') + 1 })
  })
})
