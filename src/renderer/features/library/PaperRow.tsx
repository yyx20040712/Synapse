/**
 * [SR-LIB-03] PaperRow —— 密度列表行（T3-P3 卡片→密度行重制；交互契约不变）
 *
 * ── 行为层 ──
 * - 五路信息列（mockup .row 逐值；F-LIBUI-01 档次列退役+序号 # 前缀删）：
 *   ①编号=pubNo 库级派生（[F-FOLDER-01] INV-92——catalogNo 退役；T3-P5 C5-a
 *   呈现序——编号随全序漂移=特性；视觉前缀区分最小兑现=cat 类 accent 色，
 *   形态细节收口轮细调备案；pubNo 派生重排=F-FOLDER-01 票）/未入脉络→
 *   三位零填充位置序 ordinal=index+offset+1 兜底②题名（nowrap
 *   ellipsis）+副行期刊斜体（空隐藏）③年月（T3-P5 D-I-2 级联：lineage 命中
 *   且 node.year/month 齐→YYYY-MM 补零；任一 null→paper.year 单值，null→
 *   「—」）④引用=citedByCount（缺→「—」）⑤标签=前 3 个 .lib-t-mini+「+N」
 *   折叠。（档次=venueToTier(venue) 徽章已随列退役——venue-tier.ts 单源库
 *   保留，lineage 含金量 join 与 corpus manifest 两消费点不触）
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
import { tagColorStyle } from '../../shared/ui-constants'

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
  /** [F-TAGS-01] name→color 映射（缺省/未命中=默认态徽标，INV-86 三面之三） */
  tagColorByName?: ReadonlyMap<string, string | null>
}): JSX.Element {
  const { paper, selected } = props
  // 序号=入脉络 catalogNo（P5 呈现序）；未入脉络=位置序 ordinal 兜底。
  // 视觉前缀区分最小兑现（W-4/P2-5）：入脉络行挂 cat 类=accent 色与位置序
  // faint 色区分（design §6「视觉前缀区分」——形态细节收口轮细调备案）
  const li = paper.lineage
  // [F-FOLDER-01] 序号=pubNo（INV-92 库级派生——catalogNo 退役同源接替）；
  // 无窗口语境行（导入结果）回落位置序 ordinal 兜底
  const ordinal = paper.pubNo ?? props.ordinal
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
      className={`lib-row${selected ? ' sel' : ''}`}
    >
      <span className={`lib-r-id${li !== undefined ? ' cat' : ''}`}>{String(ordinal).padStart(3, '0')}</span>
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
      <span className="lib-r-tags">
        {shownTags.map((name) => (
          <span
            key={name}
            className="lib-t-mini"
            // [F-TAGS-01] 徽标着色：映射命中→背景/边框（tagColorStyle 单源）；
            // 未命中/缺省=现状类皮肤零变（纯展示查表——数据经 props 注入）
            style={tagColorStyle(props.tagColorByName?.get(name) ?? null)}
          >
            {name}
          </span>
        ))}
        {hiddenTagCount > 0 && <span className="lib-t-more">{`+${hiddenTagCount}`}</span>}
      </span>
    </button>
  )
}
