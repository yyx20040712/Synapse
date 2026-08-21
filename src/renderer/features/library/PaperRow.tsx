/**
 * [SR-LIB-03] PaperRow —— 文献行（已实现）
 *
 * ── 行为层 ──
 * - 一行显示：标题（截断）/ 首作者 et al. / 年份 / 期刊 / 标签徽标（前 3 个）
 * - 选中态样式；双击进入阅读器（onOpen 回调）
 *
 * ── 接口层 ──
 * - export function PaperRow(props: { paper: PaperSummary; selected: boolean;
 *     onClick(): void; onOpen(): void }): JSX.Element
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - 纯展示；无网络无 store
 */
import type { CSSProperties } from 'react'
import type { PaperSummary } from '@shared/models/paper'

/** 标签徽标最多展示个数，超出折叠为 +N */
const MAX_TAG_BADGES = 3

/** 普通行：面板底 + 常规描边（取色于 theme.css 主题变量） */
const ROW_STYLE: CSSProperties = {
  background: 'var(--panel)',
  borderColor: 'var(--border)'
}

/** 选中行：强调浅底 + 强调描边 */
const ROW_SELECTED_STYLE: CSSProperties = {
  background: 'var(--accent-soft)',
  borderColor: 'var(--accent)'
}

/** 标签徽标：弱化展示，在选中行的浅底上仍可分辨 */
const TAG_BADGE_STYLE: CSSProperties = {
  background: 'var(--panel)',
  borderColor: 'var(--border)',
  color: 'var(--text-dim)'
}

/** 作者摘要：首个作者 + et al.；无作者回退为「佚名」 */
function formatAuthors(authors: readonly string[]): string {
  const first = authors[0]?.trim() ?? ''
  if (first === '') return '佚名'
  return authors.length > 1 ? `${first} et al.` : first
}

/** 元信息行：作者 · 年份 · 期刊；空值项直接跳过（年份可空、期刊可空串） */
function formatMetaLine(paper: PaperSummary): string {
  const parts = [formatAuthors(paper.authors)]
  if (paper.year !== null) parts.push(String(paper.year))
  const venue = paper.venue.trim()
  if (venue !== '') parts.push(venue)
  return parts.join(' · ')
}

export function PaperRow(props: {
  paper: PaperSummary
  selected: boolean
  onClick: () => void
  onOpen: () => void
}): JSX.Element {
  const { paper, selected } = props
  const title = paper.title.trim() === '' ? '（无标题）' : paper.title
  // 过滤空白标签名后截前 N 个；剩余数量折叠为 +N 徽标
  const tagNames = paper.tagNames.filter((name) => name.trim() !== '')
  const shownTags = tagNames.slice(0, MAX_TAG_BADGES)
  const hiddenTagCount = tagNames.length - shownTags.length

  return (
    <button
      type="button"
      aria-current={selected ? 'true' : undefined}
      title={title}
      onClick={props.onClick}
      onDoubleClick={props.onOpen}
      className="block w-full select-none rounded border px-3 py-2 text-left transition-colors"
      style={selected ? ROW_SELECTED_STYLE : ROW_STYLE}
    >
      <span className="block truncate text-sm font-medium" style={{ color: 'var(--text)' }}>
        {title}
      </span>
      <span className="mt-0.5 block truncate text-xs" style={{ color: 'var(--text-dim)' }}>
        {formatMetaLine(paper)}
      </span>
      {shownTags.length > 0 && (
        <span className="mt-1.5 flex flex-wrap gap-1">
          {shownTags.map((name) => (
            <span
              key={name}
              className="rounded border px-1.5 py-0.5 text-xs leading-none"
              style={TAG_BADGE_STYLE}
            >
              {name}
            </span>
          ))}
          {hiddenTagCount > 0 && (
            <span className="self-center text-xs leading-none" style={{ color: 'var(--text-dim)' }}>
              +{hiddenTagCount}
            </span>
          )}
        </span>
      )}
    </button>
  )
}
