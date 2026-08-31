/**
 * [F-A1] annotation-merge —— 标注矩形归并器（归一化域纯函数，单源双挂）
 *
 * ── 行为层（不变量，设计母本 docs/design/2026-08-30_annotation-rect-redesign.md）──
 * - INV-A 同一标注渲染色块两两不相交（multiply 单乘语义——"只给背景上颜色"）：
 *   行内恰一块（自明）+ 行间钳制（top_{i+1} >= bottom_i）构造性保证；
 * - INV-B 每行文字至多一块（行内 x 并集，交叠/重复自然并入）；
 * - INV-C 零宽/近零宽块（w <= W_MIN）不入集合；
 * - INV-D 相邻行块垂直边界钳制（下行顶不低于上行底；正间隙不动，负间隙
 *   推至恰好接触）；
 * - INV-E 持久化兼容：旧 rects（含缺陷态）渲染读时过本归并器（库零迁移，
 *   存量渐净）——挂 B（AnnotationLayer 渲染处）；
 * - 挂 A（annotation-anchor.rectsBetweenPoints 归一化后）：划选保存+重开
 *   重锚+手工路径同口径。
 *
 * 算法（确定性，六步，输入乱序不影响输出）：
 * 滤零宽 → (中心y,x,y) 全序排序 → 聚类成行（与全部既有簇比中心距，取最近
 * 且 |cNew−cRow| <= 容差者；容差=min(hNew, hRowMedian[, lineH, pitch])/2——
 * **F-A4 行高感知**：可选 lineH（PDF 行高归一化值）参与钳制，紧行距下
 * 输入 rect 高被 CSS 回退度量膨胀（可达 PDF 行高 ~1.25 倍）导致中心距
 * ≤膨胀高/2 的相邻行误并成单高块（INV-40 登记边界）；lineH 缺省=旧行为
 * 存档兼容。**F-V1 终裁补门（c 门）**：lineH 在场（挂 A/B 实测量测路径）时
 * 容差追加「输入行距估计 pitch」钳制——CSS 回退行盒膨胀可达行距 ~2 倍
 * （F-A5 真机在档 1.57~1.83×）时 h/lineH 容差仍把相邻行并成单高块（跨行
 * x 并集杂交），实测行距为纲拒绝；lineH 缺省=旧行为存档（受锁 ⑪ 缺省分支）。
 * 高瘦矩形 h 超行高 2 倍+自动免疫——容差被 min 钳在行高一半内，
 * ADR-0002 先例语义保持；比较扩到全部簇=修 mergeLineRects「只与末簇比较」
 * 在档失联限制）→ 行内归并（x 并集 / h 与中心 y 取行内下中位数 / page 取
 * 最小）→ 行间钳制 → 输出按 (y,x) 稳定排序。中位数=排序后下中位（索引
 * floor((n-1)/2)）。
 *
 * ── 接口层 ──
 * - export function mergeRects(rects: AnnotationRect[], lineH?: number): AnnotationRect[]
 *   （lineH=归一化域 PDF 行高；可选缺省兼容——票面 §2 导出签名扩展）
 * - export const W_MIN（滤零宽阈值，归一化域近似 1px@612pt 标准页宽；
 *   页宽 595~612pt 差异 ±3% 内忽略）
 * - 纯函数：零 DOM/React 依赖；单块输入原样返回（deep equal）；已满足
 *   INV-A~D 的输入（如 mergeLineRects 单行产物/自身输出）幂等值不变
 *
 * ── 架构层 ──
 * - annotation-anchor 仍是唯一 DOM 遍历点（本模块零 DOM）；
 *   mergeLineRects（像素域，保存路径前置）与其受锁单测原样保留——两层
 *   口径并存，本归并器（INV-B 每行至多一块）为最终裁决
 *
 * ── 生命周期层 ──
 * - O(n log n)（排序+单层聚类），n≤~30 实测（单页标注数×块数个位数级），
 *   渲染帧内无感
 *
 * ── 文化层 ──
 * - tests/unit/renderer/annotation-merge.test.ts（①~⑩）+
 *   tests/unit/renderer/annotation-layer.test.tsx（挂 B）+
 *   tests/e2e/reader-text.spec.ts 多行划选用例（保存路径/装配级）
 */
import type { AnnotationRect } from '@shared/models/annotation'

/** 滤零宽阈值（INV-C）：归一化域近似 1px@612pt 标准页宽 */
export const W_MIN = 1 / 612

/** 下中位数：排序后取索引 floor((n-1)/2)（偶数个取下侧——确定性） */
function lowerMedian(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor((sorted.length - 1) / 2)]!
}

/** 行簇：成员矩形 + 随入簇维护的 h 中位数与中心 y 中位数（聚类基准） */
interface RowCluster {
  members: AnnotationRect[]
  heights: number[]
  centerYs: number[]
  medianH: number
  medianC: number
}

/** 块中心 y（聚类/归并的统一基准） */
function centerY(r: AnnotationRect): number {
  return r.y + r.h / 2
}

/** [F-V1] 归一化域行距估计（与 annotation-anchor.estimateLinePitch 同形——
 *  依赖单向 merge←anchor 禁反向复用，且噪声下限域相关（此处无 2px 绝对下限，
 *  改用「≥2×W_MIN 否则拒绝」防全同行输入的噪声塌缩；Rule of Three 第 2 次保持
 *  重复）。下中位对离群差稳健（同像素域口径）。lineH 缺省时调用方不启用
 *  （旧行为存档）。 */
function estimateNormPitch(ordered: AnnotationRect[]): number | undefined {
  if (ordered.length < 2) {
    return undefined
  }
  const gaps: number[] = []
  for (let i = 1; i < ordered.length; i += 1) {
    const g = centerY(ordered[i]!) - centerY(ordered[i - 1]!)
    if (g > 0) {
      gaps.push(g)
    }
  }
  if (gaps.length === 0) {
    return undefined
  }
  const pitch = [...gaps].sort((a, b) => a - b)[Math.floor((gaps.length - 1) / 2)]!
  return Number.isFinite(pitch) && pitch >= 2 * W_MIN ? pitch : undefined
}

export function mergeRects(rects: AnnotationRect[], lineH?: number): AnnotationRect[] {
  // F-A4 行高感知容差的 lineH 钳制值（非有限正数防御→不收紧=旧行为）
  const lh = lineH !== undefined && Number.isFinite(lineH) && lineH > 0 ? lineH : Number.POSITIVE_INFINITY
  // ① 滤零宽（INV-C）：w <= W_MIN 的块不入集合
  const kept = rects.filter((r) => r.w > W_MIN)
  if (kept.length === 0) {
    return []
  }
  // ② 全序排序：(中心y, x, y)——输入乱序不影响输出
  const ordered = [...kept].sort(
    (a, b) => centerY(a) - centerY(b) || a.x - b.x || a.y - b.y
  )
  // [F-V1 c 门] lineH 在场时行距估计参与容差钳制（缺省=不启用，旧行为存档）
  const pitchN = lh !== Number.POSITIVE_INFINITY ? estimateNormPitch(ordered) : undefined
  // ③ 聚类成行（INV-B 前置）：与全部既有簇比中心距，取最近且满足容差者
  //    （容差 min(hNew, hRowMedian, lineH[, pitch])/2——F-A4/F-V1 钳制）
  const rows: RowCluster[] = []
  for (const r of ordered) {
    const c = centerY(r)
    let nearest: RowCluster | null = null
    let nearestDist = Number.POSITIVE_INFINITY
    for (const row of rows) {
      const dist = Math.abs(c - row.medianC)
      if (
        dist <= nearestDist &&
        dist <= Math.min(r.h, row.medianH, lh, pitchN ?? Number.POSITIVE_INFINITY) / 2
      ) {
        nearest = row
        nearestDist = dist
      }
    }
    if (nearest === null) {
      rows.push({ members: [r], heights: [r.h], centerYs: [c], medianH: r.h, medianC: c })
    } else {
      nearest.members.push(r)
      nearest.heights.push(r.h)
      nearest.centerYs.push(c)
      nearest.medianH = lowerMedian(nearest.heights)
      nearest.medianC = lowerMedian(nearest.centerYs)
    }
  }
  // ④ 行内归并（INV-B）：x 并集；h/中心y 取行内下中位数；page 取最小（防御）
  const merged = rows.map((row): AnnotationRect => {
    const only = row.members[0]!
    if (row.members.length === 1) {
      // 单成员恒等（deep equal——不经中心 y 浮点往返，幂等精度的根基）
      return { page: only.page, x: only.x, y: only.y, w: only.w, h: only.h }
    }
    const left = Math.min(...row.members.map((r) => r.x))
    const right = Math.max(...row.members.map((r) => r.x + r.w))
    const h = lowerMedian(row.heights)
    const c = lowerMedian(row.centerYs)
    return {
      page: Math.min(...row.members.map((r) => r.page)),
      x: left,
      w: right - left,
      h,
      y: c - h / 2
    }
  })
  // ⑤ 行间钳制（INV-D/INV-A）：按 y 升序；下行顶不低于上行底
  merged.sort((a, b) => a.y - b.y || a.x - b.x)
  for (let i = 1; i < merged.length; i += 1) {
    const prevBottom = merged[i - 1]!.y + merged[i - 1]!.h
    if (merged[i]!.y < prevBottom) {
      merged[i] = { ...merged[i]!, y: prevBottom }
    }
  }
  // ⑥ 输出按 (y, x) 稳定排序（钳制只下推不乱序，此步为形状兜底）
  return merged.sort((a, b) => a.y - b.y || a.x - b.x)
}
