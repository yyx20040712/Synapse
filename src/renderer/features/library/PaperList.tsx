/**
 * [SR-LIB-02] PaperList —— 文献列表（工单：done / weak）
 *
 * ── 行为层 ──
 * - 渲染 PaperSummary 列表（上游 store 已按 query.limit 分页取数，本组件全量渲染当前页，v1 不引入虚拟滚动库）
 * - 选中行高亮并通知 onSelect(id)（由上层接 store.selectPaper；高亮样式委托 PaperRow 的 selected）
 * - 键盘可达：容器为可聚焦 listbox，↑/↓ 移动选中、Home/End 跳首/末行、Enter/Space 在无选中时选中首行
 * - 选中变化后自动把选中行滚入可视区，保证键盘导航不脱离视野
 * - 空态：papers 为空时展示中文引导；loading/error 态由 LibraryPage 经 store 负责，非本组件职责
 *
 * ── 接口层 ──
 * - export function PaperList(props: { papers: PaperSummary[]; selectedId: string | null;
 *     onSelect(id: string): void; onOpen?: (id: string) => void }): JSX.Element
 * - onOpen（阅读器接线时加入，可选）：双击打开阅读器；未传时降级为确认选中
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
  selectedId: string | null
  onSelect: (id: string) => void
  onOpen?: (id: string) => void
}): JSX.Element {
  const { papers, selectedId, onSelect, onOpen } = props
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
      className="lib-grid h-full overflow-y-auto"
      onKeyDown={handleKeyDown}
    >
      {papers.map((paper) => {
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
              selected={selected}
              onClick={handleActivate}
              // 双击打开：上层传入 onOpen 时接通阅读器，否则降级为确认选中
              onOpen={onOpen === undefined ? handleActivate : () => onOpen(paper.id)}
            />
          </div>
        )
      })}
    </div>
  )
}
