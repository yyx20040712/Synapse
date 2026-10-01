// b3: T3-P8
/**
 * [F-LGRAPH-01①U2] card-drag-geometry —— 拖拽几何判定域（自 useCardDrag 拆出，
 * 行为零变；纯函数无 DOM 状态——直测面=lineage-card-drag.test 纯函数组）。
 */
import type { LineageNode } from '@shared/models/lineage'
import type { TimelineYearGroup } from './lineage-timeline'

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

/** 框包含判定（rect 几何——elementFromPoint 的确定性替身） */
export function frameContains(el: HTMLDivElement, px: number, py: number): boolean {
  const r = el.getBoundingClientRect()
  return px >= r.left && px <= r.right && py >= r.top && py <= r.bottom
}

/** 指针命中的月组框（注册面遍历——纯几何，无 elementFromPoint） */
export function frameAt(
  frames: ReadonlyMap<string, HTMLDivElement>,
  px: number,
  py: number
): HTMLDivElement | null {
  for (const el of frames.values()) {
    if (frameContains(el, px, py)) return el
  }
  return null
}

/** 源月组全序 id（groups 派生——渲染序单源；组缺省防御=nodes 过滤序） */
export function srcGroupIdsOf(
  groups: readonly TimelineYearGroup[],
  nodes: readonly LineageNode[],
  srcKey: string
): string[] {
  const [ys, ms] = srcKey.split('|')
  const g = groups.find(
    (gr) => String(gr.year) === ys && gr.months.some((m) => String(m.month) === ms)
  )
  const monthGroup = g?.months.find((m) => String(m.month) === ms)
  if (monthGroup !== undefined) return monthGroup.nodes.map((n) => n.id)
  const year = ys === 'null' ? null : Number(ys)
  const month = ms === 'null' ? null : Number(ms)
  return nodes.filter((n) => n.year === year && n.month === month).map((n) => n.id)
}
