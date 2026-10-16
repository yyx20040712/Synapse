// b3: F-VISFB-21
/**
 * [F-VISFB-21 C4] focus-bright —— 聚焦 dim 判定集单源（纯函数）。
 *
 * - bright=focusSet∪**双向一度邻接**（任务书 §5-21 主控裁决 b：edge 的
 *   from/to 任一端∈focusSet 则另一端入 bright——视线反馈：聚焦卡的直接
 *   对话者保持常亮，二度以外才 dim）。
 * - 消费面：卡 dim=非 bright 卡（TimelineYears）；边 dim=两端均非 bright
 *   才 dim（EdgeOverlay——至少一端 bright 保持常亮）。dim 强度 0.3 与
 *   类名（.dim）沿承零改——本件只供判定集，视觉承载驻 CSS。
 * - dim **激活闸**=消费面 dimActive（focus 模式且集非空）——本函数不闸
 *   （空 focus 产出空集，纯数学层）。
 */
import type { LineageEdge } from '@shared/models/lineage'

/** bright 集=focusSet ∪ 双向一度邻接（邻接只取一度——二度不入集） */
export function focusBrightSet(
  edges: ReadonlyArray<Pick<LineageEdge, 'fromNode' | 'toNode'>>,
  focusSet: readonly string[]
): Set<string> {
  // 邻接判定恒对原 focusSet（非增量集）——防遍历序传递闭包（二度混入）
  const focus = new Set(focusSet)
  const bright = new Set(focusSet)
  for (const e of edges) {
    if (focus.has(e.fromNode)) bright.add(e.toNode)
    else if (focus.has(e.toNode)) bright.add(e.fromNode)
  }
  return bright
}

/** 边 dim 判定：两端均非 bright 才 dim（至少一端 bright 保持常亮） */
export function isEdgeDimmed(edge: Pick<LineageEdge, 'fromNode' | 'toNode'>, bright: ReadonlySet<string>): boolean {
  return !bright.has(edge.fromNode) && !bright.has(edge.toNode)
}
