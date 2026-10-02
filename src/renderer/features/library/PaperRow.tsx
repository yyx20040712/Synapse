/**
 * [SR-LIB-03→F-UIRES-01 批 A U4] PaperRow —— 密度列表行（T3-P3 重制；
 * F-UIRES-01 增量：行首星标占位列[P-9 静态禁用——aria-hidden 淡色零交互，
 * F-STAR-01 点亮即激活]+行拖拽源[dragstart 设自定义 MIME+源行 faded]+右键
 * 菜单命中高亮[.hit 按下即高亮]）。
 *
 * ── 行为层 ──
 * - 列序：★ 占位/编号/题名（nowrap ellipsis）+副行期刊/年月/引用/标签（前 3
 *   +「+N」折叠）——五列既有语义零变（INV-73）；星标无 props 开关（PaperRow
 *   消费面=PaperList 单点——直加列，布局锚稳定）
 * - 选中态挂 sel 类；双击进入阅读器（onOpen 回调）；右键→onContextMenu 上抛
 * - 拖拽（§2.3）：busy 拒启（preventDefault）；dragstart 设
 *   application/x-synapse-paper（载荷=paperId）+dnd.start；源行挂 .dragging
 *   （faded 0.3）；dragend→dnd.end
 *
 * ── 接口层 ──
 * - export function PaperRow(props: { paper; ordinal; selected; hit?; onClick;
 *     onOpen; onContextMenu?; tagColorByName? }): JSX.Element
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - 纯展示（dnd store 读为渲染态——同域 store 消费先例）；皮肤=library.css
 */
import type { DragEvent, MouseEvent } from 'react'
import type { PaperSummary } from '@shared/models/paper'
import { tagColorStyle } from '../../shared/ui-constants'
import { useImportBusyStore } from '../../shared/import-busy.store'
import { PAPER_DRAG_MIME, useLibraryDnd } from './library-dnd.store'

/** 标签徽标最多展示个数，超出折叠为 +N */
const MAX_TAG_BADGES = 3

/** [RR1-6/k2-W3] 原生 drag image 抑制（透明 1×1 GIF——单源缓存；自定义 ghost=
 *  LibraryDragGhost 跟随面，双影根除。真机 canvas 快照路径与 jsdom 桩差异经
 *  可选调用吸收：dataTransfer.setDragImage 缺席环境零调用零崩） */
const DRAG_IMAGE_SUPPRESSOR = (() => {
  const img = new Image()
  img.src =
    'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
  return img
})()

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
  /** [F-UIRES-01] 右键命中高亮（菜单开=按下即高亮） */
  hit?: boolean
  onClick: () => void
  onOpen: () => void
  /** [F-UIRES-01] 右键菜单上抛（宿主挂 PaperRowMenu） */
  onContextMenu?: (paper: PaperSummary, pos: { x: number; y: number }) => void
  /** [F-TAGS-01] name→color 映射（缺省/未命中=默认态徽标，INV-86 三面之三） */
  tagColorByName?: ReadonlyMap<string, string | null>
}): JSX.Element {
  const { paper, selected } = props
  const importBusy = useImportBusyStore((s) => s.busy)
  const dragging = useLibraryDnd((s) => s.drag?.paperId === paper.id)
  const li = paper.lineage
  // [F-FOLDER-01] 序号=pubNo（INV-92 库级派生）；无窗口语境行回落位置序 ordinal
  const ordinal = paper.pubNo ?? props.ordinal
  const title = paper.title.trim() === '' ? '（无标题）' : paper.title
  const venue = paper.venue.trim()
  // 过滤空白标签名后截前 N 个；剩余数量折叠为 +N 徽标
  const tagNames = paper.tagNames.filter((name) => name.trim() !== '')
  const shownTags = tagNames.slice(0, MAX_TAG_BADGES)
  const hiddenTagCount = tagNames.length - shownTags.length

  function handleDragStart(e: DragEvent<HTMLButtonElement>): void {
    // busy 拒启（§2.5：dragstart 校验——导入中禁拖）
    if (importBusy) {
      e.preventDefault()
      return
    }
    e.dataTransfer.setData(PAPER_DRAG_MIME, paper.id)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setDragImage?.(DRAG_IMAGE_SUPPRESSOR, 0, 0)
    useLibraryDnd.getState().start({ paperId: paper.id, title })
  }

  function handleContextMenu(e: MouseEvent<HTMLButtonElement>): void {
    if (props.onContextMenu === undefined) return
    e.preventDefault()
    props.onContextMenu(paper, { x: e.clientX, y: e.clientY })
  }

  const cls = [
    'lib-row',
    selected ? 'sel' : '',
    props.hit === true ? 'hit' : '',
    dragging ? 'dragging' : ''
  ]
    .filter((c) => c !== '')
    .join(' ')

  return (
    <button
      type="button"
      draggable
      onDragStart={handleDragStart}
      onDragEnd={() => useLibraryDnd.getState().end()}
      aria-current={selected ? 'true' : undefined}
      title={title}
      onClick={props.onClick}
      onDoubleClick={props.onOpen}
      onContextMenu={handleContextMenu}
      className={cls}
    >
      {/* [P-9] 星标占位（批 A 静态禁用——淡色字形/aria-hidden/零交互；F-STAR-01 点亮即激活） */}
      <span className="lib-r-star" aria-hidden="true">
        ★
      </span>
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
            // [F-TAGS-01] 徽标着色：映射命中→背景/边框（tagColorStyle 单源）
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
