/**
 * [SR-LIB-03→F-UIRES-01 批 A U4→F-DBCAMP-01 DB-4] PaperRow —— 密度列表行
 * （T3-P3 重制；F-UIRES-01 增量：行首星标列[F-STAR-01 A1 点亮=交互钮——
 * 乐观本地态+键盘 Enter/Space+**双击链隔离**（回炉 r1-R1：星标域 onDoubleClick
 * stopPropagation——双击星标不冒泡触发行双击=onOpen，星标双写/误开阅读器双
 * 缺陷面由此封堵）]+行拖拽源[dragstart 设自定义 MIME+源行 faded]+右键菜单
 * 命中高亮[.hit 按下即高亮]+[F-TAGS-02⑥ B] 标签拖放落点[types 判别+域预检
 * +tag-over 高亮+busy 拒收]）。
 *
 * ── 行为层 ──
 * - 列序：★ 星标/编号/题名（nowrap ellipsis）+副行期刊/年月/引用/标签（前 3
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
import type { DragEvent, KeyboardEvent, MouseEvent } from 'react'
import { useState } from 'react'
import type { PaperSummary } from '@shared/models/paper'
import { tagColorStyle } from '../../shared/ui-constants'
import { useImportBusyStore } from '../../shared/import-busy.store'
import { PAPER_DRAG_MIME, useLibraryDnd } from './library-dnd.store'
import { togglePaperStar } from './paper-star'
import { dropTagOnPaper } from './tag-drop'
import { TAG_DRAG_MIME } from '../../shared/tag-dnd'

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
  // [F-TAGS-02 ⑥ B] 标签拖放目标高亮（dragover 进入/dragleave+drop 清除）
  const [tagOver, setTagOver] = useState(false)
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

  // [F-STAR-01 A1] 星标切换（乐观本地态——paper-star.ts 收口；stopPropagation
  // 星标域优先：不触发行选中/双击链——卡面星标域同款隔离口径）
  function handleStarClick(): void {
    void togglePaperStar(paper.id, !paper.isStarred)
  }
  function handleStarKeyDown(e: KeyboardEvent<HTMLSpanElement>): void {
    if (e.key !== 'Enter' && e.key !== ' ') return
    e.preventDefault()
    e.stopPropagation()
    handleStarClick()
  }

  const cls = [
    'lib-row',
    selected ? 'sel' : '',
    props.hit === true ? 'hit' : '',
    dragging ? 'dragging' : '',
    tagOver ? 'tag-over' : ''
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
      onDragOver={(e) => {
        // [F-TAGS-02 ⑥ B] 标签拖放目标面：仅响应 TAG MIME（与 PAPER_DRAG_MIME/
        // OS Files 族互斥——useFolderDrop types 判别仿体）
        if (!e.dataTransfer.types.includes(TAG_DRAG_MIME)) return
        e.preventDefault()
        e.dataTransfer.dropEffect = 'link'
        setTagOver(true)
      }}
      onDragLeave={(e) => {
        const to = e.relatedTarget
        if (to instanceof Node && e.currentTarget.contains(to)) return
        setTagOver(false)
      }}
      onDrop={(e) => {
        if (!e.dataTransfer.types.includes(TAG_DRAG_MIME)) return
        e.preventDefault()
        e.stopPropagation()
        setTagOver(false)
        if (useImportBusyStore.getState().busy) return
        void dropTagOnPaper(paper, e)
      }}
    >
      {/* [F-STAR-01 A1→DB-4 点亮] 行首星标（P-9 退出条件）：span role=button
          （row 本体 button 内嵌 role=button span——HTML 内容模型不合规的妥协
          承载〔tabIndex 元素=interactive content，button 禁交互后代〕；结构性
          改写〔行去 button 化〕挂账后续票——回炉 r1-R4 如实口径）+title 星标/
          取消星标+aria-pressed+starred 态 .on 高亮；本地态更新（无广播口径
          ——U2 简报裁决⑧）；click/keydown/dblclick 三路 stopPropagation 不触发
          行选中与行双击（双击链隔离=回炉 r1-R1：双击星标不冒泡 onOpen——
          星标双写+误开阅读器双缺陷面封堵） */}
      <span
        className={`lib-r-star${paper.isStarred ? ' on' : ''}`}
        role="button"
        tabIndex={0}
        aria-pressed={paper.isStarred}
        title={paper.isStarred ? '取消星标' : '星标'}
        data-testid="lib-row-star"
        onClick={(e) => {
          e.stopPropagation()
          handleStarClick()
        }}
        onKeyDown={handleStarKeyDown}
        onDoubleClick={(e) => e.stopPropagation()}
      >
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
