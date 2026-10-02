/**
 * [SR-LIB-02] PaperList —— 密度列表（T3-P3 卡片网格→列式密度行；五列=F-LIBUI-01 ④ 档次列退役；行为面零变）
 *
 * ── 行为层 ──
 * - 渲染 PaperSummary 列表（上游 store 已按 query.limit 分页取数，本组件全量渲染当前页，v1 不引入虚拟滚动库）
 * - 六格表头（.lib-cols：★占位/编号/题名 · 期刊/年月/引用/标签——列宽与行
 *   内对齐（INV-73 列宽同步扩）；★=P-9 星标静态占位列（F-STAR-01 点亮即激活），
 *   INV-73 结构锁；F-LIBUI-01 档次列退役；驻 .lib-list 顶部 sticky——与行
 *   共享滚动容器内容盒，滚动条出现/窄窗收缩两态表头行恒同位）+滚动列表体
 *   （.lib-list）；
 *   行序号=index+offset+1（PaperRow 以 ordinal 消费——P5 catalog_no 落地后升级）
 * - 选中行高亮并通知 onSelect(id)（由上层接 store.selectPaper；高亮样式委托 PaperRow 的 selected）
 * - 键盘可达：容器为可聚焦 listbox，↑/↓ 移动选中、Home/End 跳首/末行、Enter/Space 在无选中时选中首行
 * - 选中变化后自动把选中行滚入可视区，保证键盘导航不脱离视野
 * - 空态：papers 为空时展示中文引导（表头随之隐去——空态即整区引导）；
 *   emptyScope='unfiled'=S6 未归档专属空态（F-UIRES-01 U5）；loading/error 态由 LibraryPage 经 store 负责，非本组件职责
 *
 * ── 接口层 ──
 * - export function PaperList(props: { papers: PaperSummary[]; offset?: number;
 *     selectedId: string | null; onSelect(id: string): void;
 *     onOpen?: (id: string) => void }): JSX.Element
 * - offset=分页偏移（序号续页连续——缺省 0）；onOpen（可选）：双击打开阅读器；
 *   未传时降级为确认选中
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - 纯展示组件（无 store 依赖）；行内容渲染委托 PaperRow
 */
import { useEffect, useRef, type KeyboardEvent } from 'react'
import type { PaperSummary } from '@shared/models/paper'
import { PaperRow } from './PaperRow'

/** 计算键盘导航的目标下标；返回 null 表示该按键不属于列表导航，交回默认行为 */
function nextIndexForKey(key: string, currentIndex: number, lastIndex: number): number | null {
  switch (key) {
    case 'ArrowDown':
      // 无选中时 ↓ 从首行开始；否则下移一格，到底不再移动
      return currentIndex < 0 ? 0 : Math.min(currentIndex + 1, lastIndex)
    case 'ArrowUp':
      // 无选中时 ↑ 落在首行；否则上移一格，到顶不再移动
      return currentIndex < 0 ? 0 : Math.max(currentIndex - 1, 0)
    case 'Home':
      return 0
    case 'End':
      return lastIndex
    case 'Enter':
    case ' ':
      // 无选中时确认首行；已有选中则保持（选中即高亮，无需二次确认）
      return currentIndex < 0 ? 0 : currentIndex
    default:
      return null
  }
}

export function PaperList(props: {
  papers: PaperSummary[]
  offset?: number
  selectedId: string | null
  onSelect: (id: string) => void
  onOpen?: (id: string) => void
  /** [F-TAGS-01] name→color 映射（LibraryPage 注入——PaperRow 徽标着色） */
  tagColorByName?: ReadonlyMap<string, string | null>
  /** [F-UIRES-01 U4] 右键命中行 id（菜单开=按下即高亮） */
  hitPaperId?: string | null
  /** [F-UIRES-01 U4] 行右键上抛（宿主挂 PaperRowMenu） */
  onRowContextMenu?: (paper: PaperSummary, pos: { x: number; y: number }) => void
  /** [F-UIRES-01 U5/R14] 空态 scope 感知：unfiled=未归档专属空态引导（S6）；
   *  缺省=现行「暂无文献」通用引导（LibraryPage 按 folderScope 注入） */
  emptyScope?: 'unfiled'
}): JSX.Element {
  const { papers, selectedId, onSelect, onOpen } = props
  const offset = props.offset ?? 0
  const selectedRowRef = useRef<HTMLDivElement | null>(null)

  // 选中变化（含键盘移动）后把选中行滚进可视区；block:'nearest' 已在视野内时不产生滚动
  useEffect(() => {
    selectedRowRef.current?.scrollIntoView({ block: 'nearest' })
  }, [selectedId])

  /** 列表级键盘导航：统一在容器上处理，不依赖 PaperRow 内部实现 */
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (papers.length === 0) return
    const currentIndex = papers.findIndex((paper) => paper.id === selectedId)
    const target = nextIndexForKey(event.key, currentIndex, papers.length - 1)
    if (target === null) return
    event.preventDefault()
    const next = papers[target]
    if (next !== undefined && next.id !== selectedId) onSelect(next.id)
  }

  if (papers.length === 0) {
    // [F-UIRES-01 U5] S6 未归档空态（R14：图标+双通道归档提示——§3.9 锚逐字）
    if (props.emptyScope === 'unfiled') {
      return (
        <div
          className="lib-empty-unfiled flex h-full flex-col items-center justify-center gap-2 p-8 text-center"
          style={{ color: 'var(--text-dim)' }}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="M4 6c0-1 1-2 2-2h4l2 2h6c1 0 2 1 2 2v9c0 1-1 2-2 2H6c-1 0-2-1-2-2z" />
            <path d="M9 14h6M12 11v6" />
          </svg>
          <p className="text-sm">未归档文献将出现在这里</p>
          <p className="text-xs">归档方式：拖拽文献行至左侧文件夹，或右键文献行『移动到文件夹』</p>
        </div>
      )
    }
    return (
      <div
        className="flex h-full flex-col items-center justify-center gap-1 p-8 text-center text-sm"
        style={{ color: 'var(--text-dim)' }}
      >
        <p>暂无文献</p>
        <p className="text-xs">可拖入 PDF 导入，或调整筛选条件</p>
      </div>
    )
  }

  return (
    <div
      role="listbox"
      aria-label="文献列表"
      tabIndex={0}
      className="lib-listbox"
      onKeyDown={handleKeyDown}
    >
      <div className="lib-list">
        <div className="lib-cols" aria-hidden="true">
          <span className="lib-c-star" aria-hidden="true">★</span>
          <span className="lib-c-id">编号</span>
          <span className="lib-c-title">题名 · 期刊</span>
          <span className="lib-c-year">年月</span>
          <span className="lib-c-cite">引用</span>
          <span className="lib-c-tags">标签</span>
        </div>
        {papers.map((paper, index) => {
          const selected = paper.id === selectedId
          const handleActivate = () => onSelect(paper.id)
          return (
            <div
              key={paper.id}
              ref={selected ? selectedRowRef : undefined}
              role="option"
              aria-selected={selected}
            >
              <PaperRow
                paper={paper}
                ordinal={index + offset + 1}
                selected={selected}
                hit={props.hitPaperId === paper.id}
                onClick={handleActivate}
                // 双击打开：上层传入 onOpen 时接通阅读器，否则降级为确认选中
                onOpen={onOpen === undefined ? handleActivate : () => onOpen(paper.id)}
                onContextMenu={props.onRowContextMenu}
                tagColorByName={props.tagColorByName}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
