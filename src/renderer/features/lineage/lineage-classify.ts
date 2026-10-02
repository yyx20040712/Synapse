// b3: P7-H
/**
 * lineage-classify —— 核心档判定（薄层）。
 *
 * - [F-LGRAPH-01②U8] isSurveyTitle/isSurvey 综述判定随 ref 边体系全链退役
 *   （mockup §3.8 行 6：service ref 守卫/卡 data-kind='survey' DOM 值/菜单
 *   入口同步删除）；本文件仅存 isCore。
 * - isCore(node, edges)：决2 D1'——研究性论文（paperId≠null）且出度（edges
 *   中 fromNode===node.id 计数）≥2。**出度=被引/开宗立派的正确转译**
 *   （2026-08-29 真机复评裁决修正：初版入度≥2 在树单父约束下数学恒假；
 *   「被引用数≥2 的开宗立派论文」语义=≥2 个继承者=出度≥2）。core 的 UI
 *   消费面归②批轮 2 详情面板退役（数据面留待 AI 重做域评估——W-r2-2 挂靠）。
 */
import type { LineageEdge, LineageNode } from '@shared/models/lineage'

/** 核心档出度阈值（被继承/被引边数 ≥2——决2 D1' 出度口径） */
const CORE_MIN_OUT_DEGREE = 2

export function isCore(node: LineageNode, edges: LineageEdge[]): boolean {
  if (node.paperId === null) return false
  let outDegree = 0
  for (const e of edges) {
    if (e.fromNode === node.id) outDegree++
  }
  return outDegree >= CORE_MIN_OUT_DEGREE
}
