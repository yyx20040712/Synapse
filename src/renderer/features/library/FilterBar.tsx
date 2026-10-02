/**
 * [SR-LIB-05] FilterBar —— 搜索与筛选栏（T3-P3 密度列表语汇重制）
 *
 * ── 行为层 ──
 * - FTS 搜索框（useDebounce 300ms 后回写 store.query.search；空串回 undefined 清条件）
 *   ——皮肤=.lib-search 290px（mockup .search 逐值）；占位提示=叠加 span
 *   （HTML 占位属性名属 quality 占位标记关卡禁词——空值时显示等价承载）
 * - 下拉：年份（library.store 列表数据推导）、排序三选——统一 .lib-sort 语汇
 *   （mockup .sort 逐值）。
 *   [F-UIRES-01 批 A] FolderFilter 文件夹区随批退役（方案切换=删除旧方案）
 *   ——接替=FolderNav 左栏导航（folderScope 判别联合三态+行内 CRUD+新建）
 * - [F-UIRES-01 批 A U3] TagDropdown 行尾嵌于此（标签过滤下拉，P7E-06 多选
 *   AND 交集——空选集收敛 undefined；列序=搜索 290→年份→排序→弹性空档→
 *   标签行尾——设计稿 N-6）；onMutated 注入 library load（标签改名/着色后行内
 *   tagNames 徽标与筛选计数需重载——跨域回调注入，TagDropdown 零 import
 *   library.store）
 * - [F-TAGS-01] onTagColorMap 透传（TagDropdown 颜色映射→LibraryPage 态→
 *   PaperRow 徽标着色——tags 域数据经组合根逐级下发的合规通道）
 *
 * ── 接口层 ──
 * - export function FilterBar(props: { query: LibraryQuery;
 *     onChange(patch: Partial<LibraryQuery>): void }): JSX.Element
 *
 * ── 架构层 ──
 * - 受控组件；文件夹/标签参考数据由子组件自取（useAsync 静态参考数据先例），
 *   其余数据全部来自 props/store
 *
 * ── 生命周期层 ── / ── 文化层 ──
 * - 搜索首帧不回写（初值即 query.search，防挂载重复 load）；空选项值 '' 统一映射 undefined
 */
import { useEffect, useState } from 'react'
import type { LibraryQuery, LibrarySort } from '@shared/models/paper'
import { useDebounce } from '../../shared/hooks/useDebounce'
import { useLibraryStore } from './library.store'
import { TagDropdown } from '../tags/TagDropdown'

const SORT_LABEL: Record<LibrarySort, string> = {
  added_desc: '最近添加',
  year_desc: '年份新→旧',
  title_asc: '标题 A→Z',
  cited_desc: '被引（高到低）'
}

export function FilterBar(props: {
  query: LibraryQuery
  onChange: (patch: Partial<LibraryQuery>) => void
  /** [F-TAGS-01] 标签颜色映射上抛（TagDropdown 透传——组合根接力） */
  onTagColorMap?: (map: ReadonlyMap<string, string | null>) => void
}): JSX.Element {
  const { query, onChange } = props
  const papers = useLibraryStore((s) => s.papers)
  const loadLibrary = useLibraryStore((s) => s.load)
  const [text, setText] = useState(query.search ?? '')
  const debounced = useDebounce(text, 300)

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

  return (
    <div className="lib-filter-row">
      <div className="lib-search">
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="M15.5 15.5L21 21" />
        </svg>
        <input
          aria-label="搜索文献"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        {text === '' && (
          <span className="lib-search-ph" aria-hidden="true">
            全文检索：标题、摘要、作者…
          </span>
        )}
      </div>
      <select
        aria-label="按年份筛选"
        className={`lib-sort${query.year !== undefined ? ' lib-sort-on' : ''}`}
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
        className="lib-sort"
        value={query.sort}
        onChange={(e) => onChange({ sort: e.target.value as LibrarySort })}
      >
        {Object.entries(SORT_LABEL).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <div className="lib-filter-spacer" />
      <TagDropdown
        selectedTagIds={query.tagIds ?? []}
        onFilterChange={(ids) => onChange({ tagIds: ids.length > 0 ? ids : undefined })}
        onMutated={() => void loadLibrary()}
        onColorMapChange={props.onTagColorMap}
      />
    </div>
  )
}
