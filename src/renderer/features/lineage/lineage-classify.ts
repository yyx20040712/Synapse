// b3: P7-H
/**
 * lineage-classify —— 综述/核心档判定纯函数（R2-LG11 渲染+布局双消费，
 * 决2/决3 落点；禁 DOM/window——架构层红线）。
 *
 * - isSurvey(title)：决3 v1 关键词启发（综述|survey|review|概述|评述
 *   子串匹配，大小写不敏感）——零 schema；误判人工修正通道=后续 D2 式
 *   字段增强票（票面声明不在本单）。
 * - isCore(node, edges)：决2 D1'——研究性论文（paperId≠null 且非综述）
 *   且出度（edges 中 fromNode===node.id 计数）≥2。**出度=被引/开宗立派
 *   的正确转译**（2026-08-29 真机复评裁决修正：初版入度≥2 在 INV-27
 *   树单父约束下数学恒假——合法图内每节点入度≤1，isCore 永不触发；
 *   「被引用数≥2 的开宗立派论文」语义=≥2 个继承者=出度≥2；用户裁决
 *   原文「被引为主」指被后来者继承，非树入边）。入度不计（树下单父
 *   恒 1 无区分度）。
 */
import type { LineageEdge, LineageNode } from '@shared/models/lineage'

/** 综述关键词（小写比对——大小写不敏感） */
const SURVEY_KEYWORDS = ['综述', 'survey', 'review', '概述', '评述']

/** 核心档出度阈值（被继承/被引边数 ≥2——决2 D1' 出度口径） */
const CORE_MIN_OUT_DEGREE = 2

export function isSurvey(title: string): boolean {
  const lower = title.toLowerCase()
  return SURVEY_KEYWORDS.some((kw) => lower.includes(kw))
}

export function isCore(node: LineageNode, edges: LineageEdge[]): boolean {
  if (node.paperId === null) return false
  if (isSurvey(node.title)) return false
  let outDegree = 0
  for (const e of edges) {
    if (e.fromNode === node.id) outDegree++
  }
  return outDegree >= CORE_MIN_OUT_DEGREE
}
