// b3: P7-H
/**
 * [F-LG14] LineageNodeMeta —— 节点卡底行信息区填充件（LineageNodeCard 拆件——
 * 组件行数红线预案落点；F-LG13 底行 24px 锚的宿主改此件，卡几何常量零改）。
 *
 * 三段结构（用户图7 期望层次，颜色示意层次为准）：
 * - 含金量（文献节点独有）：「引 {citedByCount} · {venueTier}档」并列原始值
 *   （口径字面=主控裁决 6——不合成单一分数）；citedByCount null/undefined
 *   =「引 —」；venueTier 未映射=「未定」；0=值非缺（判别 === null）。
 *   metrics 缺席（无数据）=「引 — · 未定」占位仍渲染段（结构稳定锚）。
 * - 标签组：外框容器（data-card-tags，橘黄示意=浅琥珀描边）+内联小块
 *   （data-card-tag，红示意=红字小片）；无标签（null/[]）不渲染容器；
 *   超宽横向滚动（自裁：24px 高恒单行，wrap 不可行；overflowX auto+
 *   scrollbarWidth none——shift+滚轮/触摸板横向手势可达，滚轮纵向归属
 *   画布 zoom 不受扰）。
 * - 年份：既有承载（data-card-year；null=未知年份文案不变——e2e 断言面）。
 * 主题节点（paperId null）=仅年份+标签（无含金量段——票面 §1）。
 */
import type { LineageNode } from '@shared/models/lineage'
import type { LineagePaperMetrics } from '@shared/ipc/schemas'

/** 含金量文本（口径字面单源；metrics null/undefined=占位段） */
export function formatMetricsText(m: LineagePaperMetrics | null | undefined): string {
  const cited = m?.citedByCount ?? '—'
  const tier = m?.venueTier != null ? `${m.venueTier}档` : '未定'
  return `引 ${cited} · ${tier}`
}

/** 标签小块样式（红示意：红字小片——用户图7「红小块」） */
const TAG_CHIP_STYLE = {
  flexShrink: 0,
  fontSize: 'var(--fs-micro)',
  lineHeight: '16px',
  borderRadius: 3,
  color: 'var(--danger)',
  background: 'var(--danger-a08)',
  whiteSpace: 'nowrap'
} as const

/** 标签组容器样式（橘黄示意：浅琥珀描边外框——用户图7「橘黄框」） */
const TAG_BOX_STYLE = {
  minWidth: 0,
  height: 18,
  display: 'flex',
  alignItems: 'center',
  border: '1px solid var(--node-meta-border)',
  borderRadius: 4,
  overflowX: 'auto',
  overflowY: 'hidden',
  scrollbarWidth: 'none'
} as const

export function LineageNodeMeta(props: {
  node: LineageNode
  /** 含金量摘要（Canvas 按 paperId 从 store paperMetrics 查表传入；null/缺席=占位） */
  metrics: LineagePaperMetrics | null | undefined
}): JSX.Element {
  const { node: n, metrics } = props
  const theme = n.paperId === null
  const tags = n.tags ?? []
  return (
    <>
      {!theme && (
        <span data-card-metrics style={{ flexShrink: 0, color: 'var(--text)' }}>
          {formatMetricsText(metrics)}
        </span>
      )}
      {tags.length > 0 && (
        <div data-card-tags className="gap-0.75 px-0.75" style={{ ...TAG_BOX_STYLE, flex: '0 1 auto' }}>
          {tags.map((t) => (
            <span key={t} data-card-tag className="px-1" style={TAG_CHIP_STYLE}>
              {t}
            </span>
          ))}
        </div>
      )}
      <span
        data-card-year
        className="pl-1"
        style={{ flexShrink: 0, marginLeft: 'auto', whiteSpace: 'nowrap' }}
      >
        {n.year === null ? '未知年份' : String(n.year)}
      </span>
    </>
  )
}
