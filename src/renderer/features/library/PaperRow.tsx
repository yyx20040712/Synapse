/**
 * [SR-LIB-03] PaperRow —— 文献卡（R3-LIB 行→卡重制；交互/文案契约不变）
 *
 * ── 行为层 ──
 * - 一卡显示：衬线年份 + 题名（两行截断 min-height）/ 期刊斜体（空隐藏）/
 *   标签胶囊（前 3 个）/ meta 行（作者 · 标注 · 笔记，tabular-nums）
 * - 选中态样式；双击进入阅读器（onOpen 回调）
 * - L 角饰为纯装饰（aria-hidden，hover 金显形——样式在 library.css）
 *
 * ── 接口层 ──
 * - export function PaperRow(props: { paper: PaperSummary; selected: boolean;
 *     onClick(): void; onOpen(): void }): JSX.Element
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - 纯展示；无网络无 store；皮肤=library.css .lib-card 系类（token 单源）
 */
import type { PaperSummary } from '@shared/models/paper'

/** 标签徽标最多展示个数，超出折叠为 +N */
const MAX_TAG_BADGES = 3

/** 作者摘要：首个作者 + et al.；无作者回退为「佚名」 */
function formatAuthors(authors: readonly string[]): string {
  const first = authors[0]?.trim() ?? ''
  if (first === '') return '佚名'
  return authors.length > 1 ? `${first} et al.` : first
}

export function PaperRow(props: {
  paper: PaperSummary
  selected: boolean
  onClick: () => void
  onOpen: () => void
}): JSX.Element {
  const { paper, selected } = props
  const title = paper.title.trim() === '' ? '（无标题）' : paper.title
  const venue = paper.venue.trim()
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
      className={`lib-card block w-full select-none text-left${selected ? ' lib-card-selected' : ''}`}
    >
      <span className="lib-corner lib-corner-tl" aria-hidden="true" />
      <span className="lib-corner lib-corner-br" aria-hidden="true" />
      <span className="lib-card-row1">
        <span className="lib-card-year">
          {paper.year === null ? (
            <span className="lib-card-year-gem" aria-hidden="true" />
          ) : (
            paper.year
          )}
        </span>
        <span className="lib-card-title" style={{ color: 'var(--text)' }}>
          {title}
        </span>
      </span>
      {venue !== '' && <span className="lib-card-venue">{venue}</span>}
      {shownTags.length > 0 && (
        <span className="lib-card-tags">
          {shownTags.map((name) => (
            <span key={name} className="lib-tag">
              {name}
            </span>
          ))}
          {hiddenTagCount > 0 && <span className="lib-card-tagmore">+{hiddenTagCount}</span>}
        </span>
      )}
      <span className="lib-card-meta">
        <span>{formatAuthors(paper.authors)}</span>
        <span>{`标注 ${paper.annotationCount}`}</span>
        <span>{`笔记 ${paper.noteCount}`}</span>
      </span>
    </button>
  )
}
