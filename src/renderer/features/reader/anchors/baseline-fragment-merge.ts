/**
 * [B1-U3 单元 5a 拆件] baseline-fragment-merge —— 基线行碎片并入判别（自
 * pdf-item-geometry 拆出——设计稿 docs/design/2026-11-21_selection-correctness-
 * a1-a5.md §6 行数预算「先拆后改」政策）。
 *
 * - 碎片行=行内**全**成员 fontH < 全局行主导字高（全体成员 fontH 最大值）×
 *   FRAGMENT_HEIGHT_RATIO 的基线簇（probe2 实测碎片比值簇 0.70/0.70/0.8125；
 *   正文行恒含主导字高成员，结构性不满足判据——主导字高所在行必为正文行）。
 * - 并入目标=y 包络重叠 >0 的正文行中 x 净空最小者（A5a sup 与正文同 x 域
 *   gap 1.5px、G5f 链行碎片与邻行 x 交叠，两形态同判）；无 y 重叠候选 → 该行
 *   保持独立（合法 caption/图注小字行与正文行 y 不重叠=天然豁免）。
 * - 输出行序=输入行序（groupByBaseline 按 vProj 升序传入）；被并入碎片行消失，
 *   成员追加到目标正文行（行内成员序不影响下游——并块/分带均为 min/max 聚合）。
 * - 接口层：FRAGMENT_HEIGHT_RATIO + mergeFragmentRows（唯一消费=
 *   pdf-item-geometry.groupByBaseline——rects 与 bands 同产物同步变，INV-58
 *   同源保持）。架构层：本件→pdf-selection-health（ItemBox 类型）；纯函数零
 *   DOM 零环。文化层：判别面=selection-b1-u3-{chain,affil}-paint 红转绿+
 *   pdf-item-geometry.test（既有夹具零触发回归锚）。
 */
import type { ItemBox } from './pdf-selection-health'

/** 碎片行比值阈值：取值区间 (0.8125, 1.0)——下界=实测最大碎片比值 0.8125
 *  ×1.046 余量；上界 1.0=正文行结构性排除，合法小字行零误伤由「无 y 重叠
 *  候选不入并」承担而非本阈值（设计稿 §5 单元 5a） */
export const FRAGMENT_HEIGHT_RATIO = 0.85

/** 行包络（成员矩形轴对齐并集的界） */
interface RowEnvelope { x0: number; x1: number; top: number; bottom: number }

function envelopeOf(row: readonly ItemBox[]): RowEnvelope {
  return {
    x0: Math.min(...row.map((m) => m.rect.x)),
    x1: Math.max(...row.map((m) => m.rect.x + m.rect.w)),
    top: Math.min(...row.map((m) => m.rect.y)),
    bottom: Math.max(...row.map((m) => m.rect.y + m.rect.h))
  }
}

/** x 净空（两 x 区间的水平间隙：不相交=正间隙，交叠=0） */
function xClearance(a: RowEnvelope, b: RowEnvelope): number {
  return Math.max(0, Math.max(a.x0, b.x0) - Math.min(a.x1, b.x1))
}

/** 碎片行并入正文行：y 包络重叠 >0 的候选中取 x 净空最小（平局取 vProj 靠前
 *  行=输入序先者）；无候选 → 保持独立 */
export function mergeFragmentRows(rows: readonly ItemBox[][]): ItemBox[][] {
  const dominant = Math.max(...rows.flat().map((m) => m.fontH))
  const isFragment = rows.map((row) => row.every((m) => m.fontH < dominant * FRAGMENT_HEIGHT_RATIO))
  const envelopes = rows.map(envelopeOf)
  const target = new Map<number, number>()
  for (let i = 0; i < rows.length; i += 1) {
    if (!isFragment[i]) continue
    const env = envelopes[i]!
    let best = -1
    let bestGap = Number.POSITIVE_INFINITY
    for (let j = 0; j < rows.length; j += 1) {
      if (isFragment[j]) continue
      const body = envelopes[j]!
      if (Math.min(env.bottom, body.bottom) - Math.max(env.top, body.top) <= 0) continue
      const gap = xClearance(env, body)
      if (gap < bestGap) {
        best = j
        bestGap = gap
      }
    }
    if (best >= 0) target.set(i, best)
  }
  const out: ItemBox[][] = []
  for (let i = 0; i < rows.length; i += 1) {
    if (target.has(i)) continue
    const row = [...rows[i]!]
    for (const [fi, ti] of target) {
      if (ti === i) row.push(...rows[fi]!)
    }
    out.push(row)
  }
  return out
}
