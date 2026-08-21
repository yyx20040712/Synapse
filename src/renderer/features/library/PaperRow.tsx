/**
 * [SR-LIB-03] PaperRow —— 文献行（工单：open / weak）
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
export function PaperRow(_props: {
  paper: { id: string; title: string }
  selected: boolean
  onClick: () => void
  onOpen: () => void
}): JSX.Element {
  return (
    <div data-ticket="SR-LIB-03" className="p-6 text-sm" style={{ color: 'var(--text-dim)' }}>
      工单未完成：SR-LIB-03（文献行）
    </div>
  )
}
