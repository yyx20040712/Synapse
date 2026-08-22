/**
 * [SR-LIB-05] FilterBar —— 搜索与筛选栏（工单：done / weak）
 *
 * ── 行为层 ──
 * - FTS 搜索框（useDebounce 300ms 后回写 store.query.search；空串回 undefined 清条件）
 * - 下拉：集合（api.library.collections）、年份（library.store 列表数据推导）、排序三选
 * - TagFilter 组件嵌于此（标签过滤，v1 单选）
 *
 * ── 接口层 ──
 * - export function FilterBar(props: { query: LibraryQuery;
 *     onChange(patch: Partial<LibraryQuery>): void }): JSX.Element
 *
 * ── 架构层 ──
 * - 受控组件；集合列表属静态参考数据故自取（useAsync），其余数据全部来自 props/store
 *
 * ── 生命周期层 ── / ── 文化层 ──
 * - 搜索首帧不回写（初值即 query.search，防挂载重复 load）；空选项值 '' 统一映射 undefined
 */
import { useEffect, useState } from 'react'
import type { LibraryQuery, LibrarySort } from '@shared/models/paper'
import { api, unwrap } from '../../api/client'
import { useAsync } from '../../shared/hooks/useAsync'
import { useDebounce } from '../../shared/hooks/useDebounce'
import { useLibraryStore } from './library.store'
import { TagFilter } from '../tags/TagFilter'

const SORT_LABEL: Record<LibrarySort, string> = {
  added_desc: '最近添加',
  year_desc: '年份新→旧',
  title_asc: '标题 A→Z'
}

export function FilterBar(props: {
  query: LibraryQuery
  onChange: (patch: Partial<LibraryQuery>) => void
}): JSX.Element {
  const { query, onChange } = props
  const papers = useLibraryStore((s) => s.papers)
  const [text, setText] = useState(query.search ?? '')
  const debounced = useDebounce(text, 300)
  const { data: collections, run: loadCollections } = useAsync(
    () => unwrap(api.library.collections({})),
    []
  )
  useEffect(() => {
    void loadCollections()
  }, [loadCollections])

  // 防抖搜索回写：初值即 query.search（首帧相等不回写，防挂载重复 load）
  useEffect(() => {
    const next = debounced === '' ? undefined : debounced
    if (next !== query.search) onChange({ search: next })
    // query.search 只会因本回写而变，入 deps 会在父重渲染后再比对一次（幂等）
  }, [debounced])

  // 年份选项：当前列表数据推导（非空年份去重降序）
  const years = Array.from(new Set(papers.map((p) => p.year).filter((y): y is number => y !== null))).sort(
    (a, b) => b - a
  )
  const selectStyle = { borderColor: 'var(--border)', background: 'var(--panel)' }

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-2" style={{ borderColor: 'var(--border)' }}>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <input
          aria-label="搜索文献"
          className="w-56 rounded border px-2 py-1"
          style={selectStyle}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <select
          aria-label="按集合筛选"
          className="rounded border px-1 py-1"
          style={selectStyle}
          value={query.collectionId ?? ''}
          onChange={(e) => onChange({ collectionId: e.target.value === '' ? undefined : e.target.value })}
        >
          <option value="">全部分类</option>
          {(collections ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          aria-label="按年份筛选"
          className="rounded border px-1 py-1"
          style={selectStyle}
          value={query.year ?? ''}
          onChange={(e) => onChange({ year: e.target.value === '' ? undefined : Number(e.target.value) })}
        >
          <option value="">全部年份</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <select
          aria-label="排序方式"
          className="rounded border px-1 py-1"
          style={selectStyle}
          value={query.sort}
          onChange={(e) => onChange({ sort: e.target.value as LibrarySort })}
        >
          {Object.entries(SORT_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <TagFilter
        selectedTagId={query.tagId ?? null}
        onFilterChange={(tagId) => onChange({ tagId: tagId ?? undefined })}
      />
    </div>
  )
}
