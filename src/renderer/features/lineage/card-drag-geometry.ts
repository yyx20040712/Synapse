// b3: T3-P8
// lnfix2: 跨月联动死码清理（frameAt/frameContains 删——注册链随 registerFrame 退役，
// 零消费 grep 终核 2026-10-03）
/**
 * [F-LGRAPH-01①U2] card-drag-geometry —— 拖拽几何判定域（自 useCardDrag 拆出，
 * 纯函数无 DOM 状态）。[F-SLOTGRID-01 U3] insertIndexFromRects/CardRect 随
 * 算术网格化退役删除（承接=card-drag-grid.ts insertIndexFromGrid）；现存=
 * srcGroupIdsOf 源月组全序。
 */
import type { LineageNode } from '@shared/models/lineage'

/** 源月组全序 id（nodes 过滤序——组内序=nodes 序单源 INV-75；[F-UIRES-03 C3]
 *  groups 派生路随改月链退役收窄为单路（groups 与 nodes 过滤序等价） */
export function srcGroupIdsOf(nodes: readonly LineageNode[], srcKey: string): string[] {
  const [ys, ms] = srcKey.split('|')
  const year = ys === 'null' ? null : Number(ys)
  const month = ms === 'null' ? null : Number(ms)
  return nodes.filter((n) => n.year === year && n.month === month).map((n) => n.id)
}
