// b3: T3-P8
// lnfix2: 跨月联动死码清理（frameAt/frameContains 删——注册链随 registerFrame 退役，
// 零消费 grep 终核 2026-10-03）
/**
 * [F-LGRAPH-01①U2] card-drag-geometry —— 拖拽几何判定域（自 useCardDrag 拆出，
 * 行为零变；纯函数无 DOM 状态——直测面=lineage-card-drag.test 纯函数组）。
 */
import type { LineageNode } from '@shared/models/lineage'

/** 卡几何最小面（insertIndexFromRects 输入——纯函数可直测） */
export interface CardRect {
  left: number
  top: number
  width: number
  height: number
}

/**
 * 槽位插入位计算（mockup L960-967 逐式）：同行（指针 y 在卡高 ±0.8h 带内）
 * 判卡左半（px<left+w/2）；跨行判上半（py<top+h/2）；无前置=末位。
 * 纯几何确定性（无 Date/无随机）。
 */
export function insertIndexFromRects(rects: readonly CardRect[], px: number, py: number): number {
  let idx = rects.length
  for (let i = 0; i < rects.length; i++) {
    const r = rects[i]!
    const sameRow = py > r.top - r.height * 0.8 && py < r.top + r.height + r.height * 0.8
    const before = sameRow ? px < r.left + r.width / 2 : py < r.top + r.height / 2
    if (before) {
      idx = i
      break
    }
  }
  return idx
}

/** 源月组全序 id（nodes 过滤序——组内序=nodes 序单源 INV-75；[F-UIRES-03 C3]
 *  groups 派生路随改月链退役收窄为单路（groups 与 nodes 过滤序等价） */
export function srcGroupIdsOf(nodes: readonly LineageNode[], srcKey: string): string[] {
  const [ys, ms] = srcKey.split('|')
  const year = ys === 'null' ? null : Number(ys)
  const month = ms === 'null' ? null : Number(ms)
  return nodes.filter((n) => n.year === year && n.month === month).map((n) => n.id)
}
