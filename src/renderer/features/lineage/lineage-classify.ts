// b3: P7-H
/**
 * lineage-classify —— 综述/核心档判定（R2-LG12 起为薄 re-export 层）。
 *
 * - **isSurveyTitle 上移 shared/models/lineage（R2-LG12 §2 单源）**：service
 *   ref 边守卫（「from 必须是综述节点」）与 renderer 判定共用一个公式——
 *   R2-LG11 出度修正教训=约束公式单源。本文件保留 isSurvey 出口名
 *   （re-export 别名），消费面 classify.test/visual.test/Canvas/NodeCard
 *   **零改**（import 仍从 lineage-classify 走）。
 * - isCore(node, edges)：决2 D1'——研究性论文（paperId≠null 且非综述）
 *   且出度（edges 中 fromNode===node.id 计数）≥2。**出度=被引/开宗立派
 *   的正确转译**（2026-08-29 真机复评裁决修正：初版入度≥2 在 INV-27
 *   树单父约束下数学恒假——合法图内每节点入度≤1，isCore 永不触发；
 *   「被引用数≥2 的开宗立派论文」语义=≥2 个继承者=出度≥2；用户裁决
 *   原文「被引为主」指被后来者继承，非树入边）。入度不计（树下单父
 *   恒 1 无区分度）。
 */
import type { LineageEdge, LineageNode } from '@shared/models/lineage'
import { isSurveyTitle } from '@shared/models/lineage'

export { isSurveyTitle as isSurvey } from '@shared/models/lineage'

/** 核心档出度阈值（被继承/被引边数 ≥2——决2 D1' 出度口径） */
const CORE_MIN_OUT_DEGREE = 2

export function isCore(node: LineageNode, edges: LineageEdge[]): boolean {
  if (node.paperId === null) return false
  if (isSurveyTitle(node.title)) return false
  let outDegree = 0
  for (const e of edges) {
    if (e.fromNode === node.id) outDegree++
  }
  return outDegree >= CORE_MIN_OUT_DEGREE
}
