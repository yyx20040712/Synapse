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
 * - rowsFromOffsetTops(tops)：框内分行——offsetTop 相等=同行，行索引=去重
 *   值升序位次；消费方=waterfallOffsets（[F-LINEAGE-02 裁决 2] 瀑布错位：
 *   年内跨月框接续行号 R→(R×82) mod 148 inline margin-left——.rowshift
 *   62px 交替类已随布局改版退役）。
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

// ── [F-LINEAGE-02 裁决 2/P-15] 瀑布错位（行内等距+行间递增+年内复位） ──
/** 步长=卡高 72+半隙 10（F-LGRAPH-01 P-15 定案） */
export const WATERFALL_STEP = 82
/** 节距=卡宽 128+行内间距 20（mod 域——保缝隙不对齐且不出框） */
export const WATERFALL_PITCH = 148

/** 月框行采集单元（year=所属年；rows=(nodeId, 框内行索引)——DOM 序） */
export interface WaterfallFrameRows {
  year: number | null
  rows: ReadonlyArray<readonly [string, number]>
}

/**
 * 瀑布错位纯函数：年内跨月框连续累计行号 R（同年各框行接续计数；新年/
 * 未定年框从 0 起）→ offset(R)=(R×82) mod 148。仅错位量>0 的卡入表
 * （R=0 与 R≡0 mod 74 的对齐行不挂——消费方按表缺失=无 inline）。
 */
/** DOM 采集：.tl-year(data-year) 逐 .month-frame 收集 (nodeId, 框内行索引)
 *  ——行=rowsFromOffsetTops(offsetTop)；Timeline 不动点迭代 effect 单点消费 */
export function collectWaterfallFrameRows(content: HTMLElement): WaterfallFrameRows[] {
  const frameRows: WaterfallFrameRows[] = []
  for (const section of Array.from(content.querySelectorAll<HTMLElement>('.tl-year'))) {
    const raw = section.getAttribute('data-year') ?? 'null'
    const year = raw === 'null' ? null : Number(raw)
    for (const frame of Array.from(section.querySelectorAll('.month-frame'))) {
      const cards = Array.from(frame.querySelectorAll<HTMLElement>('[data-node-id]'))
      const rows = rowsFromOffsetTops(cards.map((c) => c.offsetTop))
      frameRows.push({
        year,
        rows: cards.map((card, i) => [card.dataset.nodeId ?? '', rows[i]!] as const)
      })
    }
  }
  return frameRows
}

export function waterfallOffsets(frames: readonly WaterfallFrameRows[]): Map<string, number> {
  const out = new Map<string, number>()
  let prevYear: number | null | undefined
  let base = 0
  for (const f of frames) {
    if (f.year !== prevYear) {
      base = 0
      prevYear = f.year
    }
    let maxRow = 0
    for (const [id, row] of f.rows) {
      const offset = ((base + row) * WATERFALL_STEP) % WATERFALL_PITCH
      if (offset > 0) out.set(id, offset)
      if (row > maxRow) maxRow = row
    }
    base += maxRow + 1
  }
  return out
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
