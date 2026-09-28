// b3: P7-H
// b3: T3-P6
/**
 * lineage-timeline —— 脉络时间线纯函数（T3-P6；design-final §2 脉络段 1-3）。
 *
 * - groupTimeline(nodes)：年月分组（year asc null 末→month asc null 末=未定月
 *   收纳框同年末位）。**组内不排序**——组内序=传入序=graph.nodes 的
 *   lineageOrder 全序（INV-75 消费方不得重排）；排序面仅分组键。计数
 *   （年头「N 篇」/月标签「M 月 · N 篇」/「未定月 · N 篇」）自分组结果
 *   派生（消费方=LineageTimeline 渲染面直接取 nodes.length——禁第二实现）。
 * - rowsFromOffsetTops(tops)：砖砌行错位（A2/D2）——offsetTop 相等=同行，
 *   行索引=去重值升序位次；消费方按「0 起奇数索引行」挂 .rowshift
 *   （margin-left 62px=半卡 52+半隙 10——主控裁决口径：mockup 注「行2
 *   右移」1 起第 2 行=0 起索引 1；行 0 恒不 shift）。
 */
import type { LineageNode } from '@shared/models/lineage'

export interface TimelineMonthGroup {
  month: number | null
  nodes: LineageNode[]
}

export interface TimelineYearGroup {
  year: number | null
  months: TimelineMonthGroup[]
}

/** null 组末比较器（年/月共用——null 排最后，数值 asc；lineageOrder 同序语义） */
function nullLast(v: number | null, o: number | null): number {
  if (v === null && o === null) return 0
  if (v === null) return 1
  if (o === null) return -1
  return v - o
}

export function groupTimeline(nodes: readonly LineageNode[]): TimelineYearGroup[] {
  // Map 首见键序+组内 push=传入序保持（组内不排序——INV-75）
  const byYear = new Map<number | null, Map<number | null, LineageNode[]>>()
  for (const n of nodes) {
    let months = byYear.get(n.year)
    if (months === undefined) {
      months = new Map()
      byYear.set(n.year, months)
    }
    const bucket = months.get(n.month)
    if (bucket === undefined) months.set(n.month, [n])
    else bucket.push(n)
  }
  return [...byYear.keys()].sort(nullLast).map((year) => {
    const months = byYear.get(year)!
    return {
      year,
      months: [...months.keys()].sort(nullLast).map((month) => ({ month, nodes: months.get(month)! }))
    }
  })
}

export function rowsFromOffsetTops(tops: readonly number[]): number[] {
  const distinct = [...new Set(tops)].sort((a, b) => a - b)
  const rowIndex = new Map(distinct.map((v, i) => [v, i]))
  return tops.map((v) => rowIndex.get(v)!)
}

/** [T3-P8] 月组框稳定键（year|month——拖拽源框/占位槽/改月目标组/框高亮共用） */
export function frameKeyOf(year: number | null, month: number | null): string {
  return `${String(year)}|${String(month)}`
}

/**
 * [T3-P8] 改月视觉预演：nodeId 自原组移出、落目标 (year,month) 组尾部（纯
 * 函数——真实槽位由服务端 normalizeMonthSlot 组变 max+1 承担；本函数仅
 * settle 飞行期的渲染序，写落定后 store 重排自然接管）。目标组不存在=
 * 原样返回（防御面——月列表自 groups 派生，正常流恒存在）。空组（移出后
 * 零节点）整月收纳框移除（分组自 nodes 派生的同构语义）。
 */
export function applyMovePreview(
  groups: readonly TimelineYearGroup[],
  nodeId: string,
  targetYear: number | null,
  targetMonth: number | null
): TimelineYearGroup[] {
  // 纯 for 循环（非闭包 map 回调）——命中变量窄化在直系作用域内成立
  let hitNode: LineageNode | null = null
  const stripped: TimelineYearGroup[] = []
  for (const g of groups) {
    const months: TimelineMonthGroup[] = []
    for (const m of g.months) {
      const hit = m.nodes.find((n) => n.id === nodeId)
      if (hit === undefined) {
        months.push(m)
        continue
      }
      hitNode = hit
      const rest = m.nodes.filter((n) => n.id !== nodeId)
      if (rest.length > 0) months.push({ month: m.month, nodes: rest })
    }
    stripped.push({ ...g, months })
  }
  if (hitNode === null) return [...groups]
  const moved = hitNode
  const target = frameKeyOf(targetYear, targetMonth)
  let placed = false
  const out: TimelineYearGroup[] = []
  for (const g of stripped) {
    const months: TimelineMonthGroup[] = []
    for (const m of g.months) {
      if (frameKeyOf(g.year, m.month) !== target) {
        months.push(m)
        continue
      }
      placed = true
      months.push({ ...m, nodes: [...m.nodes, moved] })
    }
    out.push({ ...g, months })
  }
  return placed ? out : [...groups]
}
