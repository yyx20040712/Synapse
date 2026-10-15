/**
 * [F-UIRES-04 批 3a] SideBadges —— 详情域徽章行（期刊/IF/被引/年月/T 档）。
 *
 * ── 行为层 ──
 * - [②U4/A5] 可选省略沿承：venue 空串/null、IF/被引 null 缺席零渲染（卡 L3
 *   同源，无第二数据路径）；年月恒在场（null 退化「—」）；T 档仅文献节点
 *   （paperId null=主题节点零渲染）。
 *
 * ── 架构层 ──
 * - [F-UIRES-04 D1] 自 LineageSidePanel 拆出（行为零变搬移——props 传递/
 *   渲染输出/DOM 结构逐位等价；主题节点分支留宿主）。
 */
import type { LineageNode } from '@shared/models/lineage'
import type { LineagePaperMetrics } from '@shared/ipc/schemas'

/** 年月徽章文本（YYYY-MM 补零/null 退化） */
function ymBadge(n: LineageNode): string {
  if (n.year === null) return '—'
  return n.month === null ? String(n.year) : `${n.year}-${String(n.month).padStart(2, '0')}`
}

export function SideBadges(props: {
  node: LineageNode
  /** 含金量摘要（[②U4] 扩 venue/impactFactor——卡 L3 同源单路径） */
  metrics?: LineagePaperMetrics | null
}): JSX.Element {
  const m = props.metrics ?? null
  const venue = m !== null && m.venue != null && m.venue !== '' ? m.venue : null
  const impact = m !== null && m.impactFactor != null ? m.impactFactor : null
  const cited = m !== null && m.citedByCount != null ? m.citedByCount : null
  const tier = props.node.paperId !== null ? (m?.venueTier ?? null) : null
  return (
    <div className="badges">
      {venue !== null && <span className="badge plain">{venue}</span>}
      {impact !== null && <span className="badge plain">{`IF ${impact}`}</span>}
      {cited !== null && <span className="badge plain">{`被引 ${cited}`}</span>}
      <span className="badge plain">{ymBadge(props.node)}</span>
      {tier !== null && <span className="badge plain">{tier}</span>}
    </div>
  )
}
