/**
 * [SR-TAG-02] TagFilter —— 标签筛选器（工单：done / weak）
 *
 * ── 行为层 ──
 * - 多选 chip 列表（数据 tags.store：{id,name,paperCount}）
 * - 选中态变化 → props.onFilterChange(tagId | null)（v1 单选标签过滤，多选 v2）
 *
 * ── 接口层 ──
 * - export function TagFilter(props: { selectedTagId: string | null;
 *     onFilterChange(tagId: string | null): void }): JSX.Element
 *
 * ── 架构层 ──
 * - 数据自取：tags.store（挂载 refresh——行为层的"数据 tags.store"为准，建议/
 *   筛选共享单一数据源）；纯展示交互，自身不发其他请求
 *
 * ── 生命周期层 ── / ── 文化层 ──
 * - 空标签库显示引导文案（先在详情侧栏打标签）
 */
import { useEffect } from 'react'
import { useTagsStore } from './tags.store'

export function TagFilter(props: {
  selectedTagId: string | null
  onFilterChange: (tagId: string | null) => void
}): JSX.Element {
  const { selectedTagId, onFilterChange } = props
  const tags = useTagsStore((s) => s.tags)
  const refresh = useTagsStore((s) => s.refresh)

  useEffect(() => {
    void refresh()
  }, [refresh])

  if (tags.length === 0) {
    return (
      <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
        暂无标签可筛选（在详情侧栏为文献打标签）
      </span>
    )
  }
  return (
    <div className="flex flex-wrap items-center gap-1" role="group" aria-label="标签筛选">
      {tags.map((t) => {
        const active = t.id === selectedTagId
        return (
          <button
            key={t.id}
            type="button"
            aria-pressed={active}
            className="rounded-full border px-2 py-0.5 text-xs"
            style={{
              borderColor: active ? 'var(--accent)' : 'var(--border)',
              background: active ? 'var(--accent-soft)' : 'var(--panel)',
              color: active ? 'var(--accent)' : 'var(--text)'
            }}
            onClick={() => onFilterChange(active ? null : t.id)}
          >
            {t.name}（{t.paperCount}）
          </button>
        )
      })}
    </div>
  )
}
