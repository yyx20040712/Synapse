/**
 * [SR-LIB-02] PaperList —— 文献虚拟列表（工单：open / weak）
 *
 * ── 行为层 ──
 * - 渲染 PaperSummary 列表（大数据量用简单分页/窗口化即可，v1 不引入虚拟滚动库）
 * - 选中行高亮并通知 store.selectPaper(id)
 *
 * ── 接口层 ──
 * - export function PaperList(props: { papers: PaperSummary[]; selectedId: string | null;
 *     onSelect(id: string): void }): JSX.Element
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - 纯展示组件（无 store 依赖）；行内容渲染委托 PaperRow
 */
export function PaperList(_props: {
  papers: Array<{ id: string }>
  selectedId: string | null
  onSelect: (id: string) => void
}): JSX.Element {
  return (
    <div data-ticket="SR-LIB-02" className="p-6 text-sm" style={{ color: 'var(--text-dim)' }}>
      工单未完成：SR-LIB-02（文献列表）
    </div>
  )
}
