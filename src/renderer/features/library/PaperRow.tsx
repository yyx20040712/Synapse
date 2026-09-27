/**
 * [SR-LIB-03] PaperRow —— 密度列表行（T3-P3 卡片→六列行重制；交互契约不变）
 *
 * ── 行为层 ──
 * - 六路信息列（mockup .row 逐值）：①编号=入脉络（paper.lineage 存在）→
 *   「#」+三位零填充 catalogNo（T3-P5 C5-a 呈现序——编号随全序漂移=特性；
 *   视觉前缀区分最小兑现=cat 类 accent 色，形态细节收口轮细调备案）/未入脉络
 *   →「#」+三位零填充位置序 ordinal=index+offset+1 兜底②题名（nowrap
 *   ellipsis）+副行期刊斜体（空隐藏）③年月（T3-P5 D-I-2 级联：lineage 命中
 *   且 node.year/month 齐→YYYY-MM 补零；任一 null→paper.year 单值，null→
 *   「—」）④引用=citedByCount（缺→「—」）⑤档次=venueToTier(venue) 纯映射
 *   徽章（T1=accent 底白字/T2=accent 描边/T3=line 描边 faint/未命中=「—」
 *   ——src/shared/venue-tier.ts 单源）⑥标签=前 3 个 .lib-t-mini+「+N」折叠
 * - 选中态挂 sel 类；双击进入阅读器（onOpen 回调）
 *
 * ── 接口层 ──
 * - export function PaperRow(props: { paper: PaperSummary; ordinal: number;
 *     selected: boolean; onClick(): void; onOpen(): void }): JSX.Element
 * - ordinal=1 起算行序（PaperList 以 index+offset+1 注入——仅未入脉络行消费）
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - 纯展示；无网络无 store；皮肤=library.css .lib-row 系类（token 单源）
 */
import type { PaperSummary } from '@shared/models/paper'
import { venueToTier } from '@shared/venue-tier'

/** 标签徽标最多展示个数，超出折叠为 +N */
const MAX_TAG_BADGES = 3

/** 年月列值（T3-P5 D-I-2 级联）：lineage 年月齐→YYYY-MM 补零；否则单值兜底 */
function yearMonthText(paper: PaperSummary): string {
  const l = paper.lineage
  if (l !== undefined && l.year !== null && l.month !== null) {
    return `${l.year}-${String(l.month).padStart(2, '0')}`
  }
  return paper.year === null ? '—' : String(paper.year)
}

export function PaperRow(props: {
  paper: PaperSummary
  ordinal: number
  selected: boolean
  onClick: () => void
  onOpen: () => void
}): JSX.Element {
  const { paper, selected } = props
  // 序号=入脉络 catalogNo（P5 呈现序）；未入脉络=位置序 ordinal 兜底。
  // 视觉前缀区分最小兑现（W-4/P2-5）：入脉络行挂 cat 类=accent 色与位置序
  // faint 色区分（design §6「视觉前缀区分」——形态细节收口轮细调备案）
  const li = paper.lineage
  const ordinal = li !== undefined ? li.catalogNo : props.ordinal
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
      <span className={`lib-r-id${li !== undefined ? ' cat' : ''}`}>{`#${String(ordinal).padStart(3, '0')}`}</span>
      <span className="lib-r-main">
        <span className="lib-r-title">{title}</span>
        {venue !== '' && (
          <span className="lib-r-sub">
            <span className="lib-r-j">{venue}</span>
          </span>
        )}
      </span>
      <span className="lib-r-year">{yearMonthText(paper)}</span>
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
