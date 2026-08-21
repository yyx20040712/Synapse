/**
 * [SR-TAG-02] TagFilter —— 标签筛选器（工单：open / weak）
 *
 * ── 行为层 ──
 * - 多选 chip 列表（数据 tags.store：{id,name,paperCount}）
 * - 选中态变化 → props.onFilterChange(tagId | null)（v1 单选标签过滤，多选 v2）
 *
 * ── 接口层 ──
 * - export function TagFilter(props: { selectedTagId: string | null;
 *     onFilterChange(tagId: string | null): void }): JSX.Element
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - 数据自取（useAsync api.tags.list）；纯展示交互
 */
export function TagFilter(_props: {
  selectedTagId: string | null
  onFilterChange: (tagId: string | null) => void
}): JSX.Element {
  return (
    <div data-ticket="SR-TAG-02" className="p-6 text-sm" style={{ color: 'var(--text-dim)' }}>
      工单未完成：SR-TAG-02（标签筛选器）
    </div>
  )
}
