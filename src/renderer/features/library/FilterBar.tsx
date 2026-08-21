/**
 * [SR-LIB-05] FilterBar —— 搜索与筛选栏（工单：open / weak）
 *
 * ── 行为层 ──
 * - FTS 搜索框（useDebounce 300ms 后回写 store.query.search）
 * - 下拉：集合（api.library.collections）、年份（store 数据推导）、排序三选
 * - TagFilter 组件嵌于此（标签多选）
 *
 * ── 接口层 ──
 * - export function FilterBar(props: { query: LibraryQuery;
 *     onChange(patch: Partial<LibraryQuery>): void }): JSX.Element
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - 受控组件；自身不发请求
 */
import type { LibraryQuery } from '@shared/models/paper'

export function FilterBar(_props: {
  query: LibraryQuery
  onChange: (patch: Partial<LibraryQuery>) => void
}): JSX.Element {
  return (
    <div data-ticket="SR-LIB-05" className="p-6 text-sm" style={{ color: 'var(--text-dim)' }}>
      工单未完成：SR-LIB-05（筛选栏）
    </div>
  )
}
