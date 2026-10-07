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
 * - [F-SLOTGRID-01 U1] 瀑布族（rowsFromOffsetTops/WATERFALL_STEP/
 *   WATERFALL_PITCH/collectWaterfallFrameRows/waterfallOffsets）随瀑布布局
 *   退役删除——分行数学移驻 capacity.ts（partitionRows 数组序贪心单源）。
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

/** [T3-P8] 月组框稳定键（year|month——拖拽源框/占位槽/框查询共用） */
export function frameKeyOf(year: number | null, month: number | null): string {
  return `${String(year)}|${String(month)}`
}
