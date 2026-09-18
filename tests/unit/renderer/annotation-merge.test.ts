/**
 * [F-A1] annotation-merge —— 标注矩形归并器单测（受锁，[locked-change] 授权面）。
 *
 * 覆盖票面文化层 ①~⑩：T3 零宽滤除 / T2 同行交叠 x 并集 / T5 同位重复并入 /
 * T4 负间隙钳制 / INV-A 混合族两两分离 / 单块恒等+空数组透传 / 幂等 /
 * 高瘦免疫+紧行距不误并 / 排序确定性 / 混排字号中位数。
 * [F-A4 改向] ⑪⑫：INV-40 紧行距边界修复（聚类容差行高感知——可选 lineH
 * 参与容差 min(hNew,hRowMedian,lineH)/2 钳制，缺省旧行为存档）+lineH
 * 恒等/幂等（过大 lineH 不收紧）。修订依据=F-A4 票面 §0b①。
 * 夹具数值参照取证基线 scripts/audits/audit0-out/audit0-p1b.json（像素域实锤
 * 折算归一化域）。中位数=排序后下中位（索引 floor((n-1)/2)，票面主控预裁）。
 * always-active（ADR-0017 裁决 3 新测试不经 guardedDescribe）。
 */
import { describe, expect, it } from 'vitest'
import { mergeRects, W_MIN } from '../../../src/renderer/features/reader/anchors/annotation-merge'
import type { AnnotationRect } from '@shared/models/annotation'

/** 归一化域矩形夹具（0..1，zod strict 五字段） */
function rect(x: number, y: number, w: number, h: number, page = 0): AnnotationRect {
  return { page, x, y, w, h }
}

/** 两矩形相交面积（正间隙/恰好接触 → 0） */
function overlapArea(a: AnnotationRect, b: AnnotationRect): number {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)
  return w > 0 && h > 0 ? w * h : 0
}

/** 全对两两相交面积恒 0（INV-A 断言共用） */
function expectPairwiseDisjoint(rects: AnnotationRect[]): void {
  for (let i = 0; i < rects.length; i += 1) {
    for (let j = i + 1; j < rects.length; j += 1) {
      expect(overlapArea(rects[i]!, rects[j]!)).toBe(0)
    }
  }
}

describe('F-A1 mergeRects —— 归一化域归并器', () => {
  it('① T3 零宽滤除：w=0 与 w<W_MIN 的幽灵块消失，正常块保留（INV-C）', () => {
    // 取证实锤：w:0 h:16.8 幽灵块（audit0-p1b 高亮首末块）
    const ghost = rect(0, 0.2, 0, 0.021)
    const nearZero = rect(0, 0.2, 0.0005, 0.021)
    const solid = rect(0.1, 0.2, 0.3, 0.021)
    const out = mergeRects([ghost, nearZero, solid])
    expect(out.length).toBe(1)
    // W_MIN=1/612≈0.00163：0.0005 在阈值内被滤
    expect(W_MIN).toBeGreaterThan(0.0005)
    // 正常块单块恒等透传
    expect(out[0]).toEqual(solid)
  })

  it('② T2 同行两块水平交叠 → 1 块 x 并集（INV-B）', () => {
    // 取证实锤：同行 x=1016/1028 两块交叠 237px（归一化域等价夹具）
    const left = rect(0.1, 0.2, 0.3, 0.02)
    const right = rect(0.35, 0.2, 0.2, 0.02)
    const out = mergeRects([left, right])
    expect(out.length).toBe(1)
    expect(out[0]!.x).toBeCloseTo(0.1, 10)
    expect(out[0]!.w).toBeCloseTo(0.45, 10)
    expect(out[0]!.h).toBeCloseTo(0.02, 10)
    expect(out[0]!.y).toBeCloseTo(0.2, 10)
  })

  it('③ T5 同位重复（y 亚像素差、同 x 同宽）→ 并入 1 块', () => {
    // 取证实锤：下划线 y=-1058.2/-1058.7（差 0.5px，792pt 页高折算 ≈0.00063）
    const first = rect(0.2, 0.3, 0.3, 0.02)
    const dup = rect(0.2, 0.3006, 0.3, 0.02)
    const out = mergeRects([first, dup])
    expect(out.length).toBe(1)
    expect(out[0]!.x).toBeCloseTo(0.2, 10)
    expect(out[0]!.w).toBeCloseTo(0.3, 10)
    // 中心 y 中位数取下中位（0.31）→ y = 0.31 - 0.01
    expect(out[0]!.y).toBeCloseTo(0.3, 10)
  })

  it('④ T4 相邻行负间隙 → 钳制后上行底 ≤ 下行顶+1e-9，相交面积 0（INV-D/A）', () => {
    // 取证实锤：行间 gap -1.5/-2/-5.5（792pt 页高折算 2px 级 ≈0.0025）
    const upper = rect(0.1, 0.3, 0.4, 0.02)
    const lower = rect(0.1, 0.318, 0.4, 0.02)
    const out = mergeRects([upper, lower])
    expect(out.length).toBe(2)
    expect(out[0]!.y + out[0]!.h).toBeLessThanOrEqual(out[1]!.y + 1e-9)
    expect(overlapArea(out[0]!, out[1]!)).toBe(0)
  })

  it('⑤ INV-A 混合族：6 块乱序（幽灵+交叠+重复）→ 两两相交面积全 0 且全 w>W_MIN', () => {
    const mixed = [
      rect(0.5, 0.302, 0.2, 0.02),
      rect(0, 0.2, 0, 0.021),
      rect(0.35, 0.2, 0.2, 0.02),
      rect(0.05, 0.249, 0.3, 0.02),
      rect(0.1, 0.2, 0.3, 0.02),
      rect(0.12, 0.2006, 0.28, 0.02)
    ]
    const out = mergeRects(mixed)
    // 幽灵滤除+每行一块：行1（三块并一）+行2+行3 = 3
    expect(out.length).toBe(3)
    for (const r of out) {
      expect(r.w).toBeGreaterThan(W_MIN)
    }
    expectPairwiseDisjoint(out)
  })

  it('⑥ 单块恒等（deep equal）+ 空数组透传', () => {
    expect(mergeRects([])).toEqual([])
    const only = rect(0.12, 0.34, 0.3, 0.02)
    const out = mergeRects([only])
    expect(out).toEqual([only])
  })

  it('⑦ 幂等：mergeRects∘mergeRects == mergeRects（混合族上）', () => {
    const mixed = [
      rect(0.5, 0.302, 0.2, 0.02),
      rect(0, 0.2, 0, 0.021),
      rect(0.35, 0.2, 0.2, 0.02),
      rect(0.05, 0.249, 0.3, 0.02),
      rect(0.1, 0.2, 0.3, 0.02),
      rect(0.12, 0.2006, 0.28, 0.02)
    ]
    const once = mergeRects(mixed)
    const twice = mergeRects(once)
    expect(twice).toEqual(once)
  })

  it('⑧a 高瘦矩形（h=行高 6 倍级）不并入行簇：独立输出且几何保持', () => {
    // ADR-0002 先例语义：高瘦（旋转/竖排）并入会 corrupt 行 y/h——
    // min(hNew, hRowMedian)/2 容差下高瘦免疫（中心距 0.03 > min/2≈0.0095）
    const tall = rect(0.49, 0.1055, 0.016, 0.128)
    const line = rect(0.016, 0.19, 0.145, 0.019)
    const out = mergeRects([tall, line])
    expect(out.length).toBe(2)
    const tallOut = out.find((r) => r.h === 0.128)
    expect(tallOut).toBeDefined()
    expect(tallOut!.y).toBeCloseTo(0.1055, 10)
  })

  it('⑧b 紧行距相邻行（中心距≈行高）不误并：两块输出，负间隙钳到恰好接触', () => {
    const upper = rect(0.1, 0.2, 0.4, 0.02)
    const lower = rect(0.1, 0.219, 0.35, 0.02)
    const out = mergeRects([upper, lower])
    expect(out.length).toBe(2)
    // 中心距 0.019 ≈ 行高 0.02 > min/2=0.01 → 不并；负间隙 0.001 钳制后 y=0.22
    expect(out[1]!.y).toBeCloseTo(0.22, 10)
  })

  it('⑨ 排序确定性：乱序输入 → 输出按 (y,x) 升序，输入序不影响输出', () => {
    const ordered = [
      rect(0.2, 0.1, 0.3, 0.02),
      rect(0.2, 0.3, 0.3, 0.02),
      rect(0.2, 0.4, 0.3, 0.02)
    ]
    const shuffled = [ordered[2]!, ordered[0]!, ordered[1]!]
    const out = mergeRects(shuffled)
    expect(out.length).toBe(3)
    expect(out.map((r) => r.y)).toEqual([0.1, 0.3, 0.4])
    // 同输入不同序 → 输出 deep equal（全序排序的确定性）
    expect(mergeRects(ordered)).toEqual(out)
  })

  it('⑩ 混排字号同行（矮块 h=0.008 vs 行 h=0.012）并簇且 h 取下中位数', () => {
    // 主控预裁 4：行 y/h 取中位数（非主导矩形）——矮块入簇后 h 取下中位 0.008
    const big = rect(0.1, 0.2, 0.12, 0.012)
    const small = rect(0.24, 0.204, 0.016, 0.008)
    const out = mergeRects([big, small])
    expect(out.length).toBe(1)
    expect(out[0]!.x).toBeCloseTo(0.1, 10)
    expect(out[0]!.w).toBeCloseTo(0.156, 10)
    expect(out[0]!.h).toBeCloseTo(0.008, 10)
    // 中心 y 下中位 0.206 → y = 0.206 - 0.004
    expect(out[0]!.y).toBeCloseTo(0.202, 10)
  })

  it('⑪ INV-40 边界修复（F-A4 行高感知）：紧行距中心距 ≤ 输入块高/2（旧路径误并）但 > PDF 行高/2 → lineH 传入不并簇；缺省旧行为存档', () => {
    // 紧行距形态：输入 rect 高=CSS 回退行盒（可膨胀至 PDF 行高 ~1.25 倍），
    // 相邻行中心距 0.009——旧行为 min(h)/2=0.01 容差下跨行并簇成单高块
    //（INV-40 登记册边界）；行高感知容差 min(h,h,lineH)/2=0.008 < 0.009 → 分行
    const upper = rect(0.1, 0.2, 0.4, 0.02)
    const lower = rect(0.1, 0.209, 0.4, 0.02)
    // 缺省（无行高数据——旧库/不可量测环境）：边界行为原样存档（1 块）
    expect(mergeRects([upper, lower]).length).toBe(1)
    // lineH=PDF 行高 0.016（< 输入 h 0.02——回退度量膨胀差）：不并簇
    const out = mergeRects([upper, lower], 0.016)
    expect(out.length).toBe(2)
    // INV-D 钳制仍生效：负间隙（0.229 底 > 0.209 顶）推至恰好接触
    expect(out[1]!.y).toBeCloseTo(out[0]!.y + out[0]!.h, 10)
    expectPairwiseDisjoint(out)
  })

  it('⑫ lineH 恒等钳制（过大不收紧）+行高感知幂等：已归并输入值不变', () => {
    const mixed = [
      rect(0.5, 0.302, 0.2, 0.02),
      rect(0, 0.2, 0, 0.021),
      rect(0.35, 0.2, 0.2, 0.02),
      rect(0.05, 0.249, 0.3, 0.02),
      rect(0.1, 0.2, 0.3, 0.02),
      rect(0.12, 0.2006, 0.28, 0.02)
    ]
    // lineH 远超块高（min 钳制恒等——不可量测环境的防御方向）
    expect(mergeRects(mixed, 10)).toEqual(mergeRects(mixed))
    // 行高感知幂等（F-A4：合法 lineH<h 下已归并产物再入不动）
    const once = mergeRects(mixed, 0.016)
    const twice = mergeRects(once, 0.016)
    expect(twice).toEqual(once)
  })
})

// [F-V1] 紧凑行距终裁补门（c 门）：CSS 回退行盒膨胀（可达行距 ~2 倍——F-A5
// 真机在档 1.57~1.83×）时 min(h, hMed, lineH)/2 容差把相邻行并成单高块
// （跨行 x 并集杂交）；lineH 在场（挂 A/B 实测量测路径）时聚类容差追加
// 「输入行距估计」钳制。夹具数值=像素域实测折算（h 0.038 / 行距 0.019 /
// lineH 量测同膨胀 0.04）。always-active（ADR-0017 裁决 3）。
describe('F-V1 mergeRects —— 紧凑行距终裁补门', () => {
  const inflatedUpper = rect(0.1, 0.2, 0.4, 0.038)
  const inflatedLower = rect(0.1, 0.2185, 0.35, 0.038) // 中心距 0.0185 ≤ 旧容差 0.019

  it('f: lineH 在场时容差追加行距估计——修前相邻行并入单高块（跨行并集）；修后两行各自成块且钳制后不相交', () => {
    const out = mergeRects([inflatedUpper, inflatedLower], 0.04)
    expect(out.length).toBe(2)
    // INV-D 钳制语义保持：负间隙推至恰好接触，两两相交面积 0
    expect(out[0]!.y + out[0]!.h).toBeLessThanOrEqual(out[1]!.y + 1e-9)
    expectPairwiseDisjoint(out)
  })

  it('g: lineH 缺省=旧行为存档（⑪ 缺省分支同型语义在紧凑域的声明）；补门下幂等', () => {
    // 无行高数据（旧库/不可量测）：h/2 容差并入一块——缺省兼容面存档
    expect(mergeRects([inflatedUpper, inflatedLower]).length).toBe(1)
    const once = mergeRects([inflatedUpper, inflatedLower], 0.04)
    expect(mergeRects(once, 0.04)).toEqual(once)
  })
})
