/**
 * [SR-LIB-03] PaperRow —— 密度列表行（T3-P3 卡片→六列行重制；交互契约不变）
 *
 * ── 行为层 ──
 * - 六路信息列（mockup .row 逐值）：①编号=「#」+三位零填充序号（列表位置序
 *   index+offset+1——P5 catalog_no 落地后升级真编号）②题名（nowrap ellipsis）
 *   +副行期刊斜体（空隐藏）③年月（papers 无 month 字段——v1 年份单值，
 *   null→「—」，P5 升级点备案）④引用=citedByCount（缺→「—」）⑤档次=
 *   venueToTier(venue) 纯映射徽章（T1=accent 底白字/T2=accent 描边/
 *   T3=line 描边 faint/未命中=「—」——src/shared/venue-tier.ts 单源）
 *   ⑥标签=前 3 个 .lib-t-mini+「+N」折叠
 * - 选中态挂 sel 类；双击进入阅读器（onOpen 回调）
 *
 * ── 接口层 ──
 * - export function PaperRow(props: { paper: PaperSummary; ordinal: number;
 *     selected: boolean; onClick(): void; onOpen(): void }): JSX.Element
 * - ordinal=1 起算行序（PaperList 以 index+offset+1 注入）
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - 纯展示；无网络无 store；皮肤=library.css .lib-row 系类（token 单源）
 */
import type { PaperSummary } from '@shared/models/paper'
import { venueToTier } from '@shared/venue-tier'

/** 标签徽标最多展示个数，超出折叠为 +N */
const MAX_TAG_BADGES = 3

export function PaperRow(props: {
  paper: PaperSummary
  ordinal: number
  selected: boolean
  onClick: () => void
  onOpen: () => void
}): JSX.Element {
  const { paper, selected, ordinal } = props
  const title = paper.title.trim() === '' ? '（无标题）' : paper.title
  const venue = paper.venue.trim()
  const tier = venueToTier(venue)
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
      className={`lib-row${selected ? ' sel' : ''}`}
    >
      <span className="lib-r-id">{`#${String(ordinal).padStart(3, '0')}`}</span>
      <span className="lib-r-main">
        <span className="lib-r-title">{title}</span>
        {venue !== '' && (
          <span className="lib-r-sub">
            <span className="lib-r-j">{venue}</span>
          </span>
        )}
      </span>
      <span className="lib-r-year">{paper.year === null ? '—' : paper.year}</span>
      <span className="lib-r-cite">{paper.citedByCount === undefined ? '—' : paper.citedByCount}</span>
      <span className="lib-r-tier">
        {tier === null ? (
          <span className="lib-tier none">—</span>
        ) : (
          <span className={`lib-tier ${tier.toLowerCase()}`}>{tier}</span>
        )}
      </span>
      <span className="lib-r-tags">
        {shownTags.map((name) => (
          <span key={name} className="lib-t-mini">
            {name}
          </span>
        ))}
        {hiddenTagCount > 0 && <span className="lib-t-more">{`+${hiddenTagCount}`}</span>}
      </span>
    </button>
  )
}
