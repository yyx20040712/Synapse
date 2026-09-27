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
