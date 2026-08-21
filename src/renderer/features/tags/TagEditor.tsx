/**
 * [SR-TAG-01] TagEditor —— 标签编辑器（工单：open / weak）
 *
 * ── 行为层 ──
 * - 展示某文献已有标签（chip，点 × 移除 → api.tags.detach）
 * - 输入回车新建并挂接（api.tags.upsert + attach）；已存在标签名提示复用
 * - 下拉建议：tags.store.list 里已有标签（前缀匹配前 5 个）
 *
 * ── 接口层 ──
 * - export function TagEditor(props: { paperId: string;
 *     tags: Array<{ id: string; name: string }> }): JSX.Element
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - 操作后回调 onChanged() 让父组件刷新
 */
export function TagEditor(_props: {
  paperId: string
  tags: Array<{ id: string; name: string }>
  onChanged: () => void
}): JSX.Element {
  return (
    <div data-ticket="SR-TAG-01" className="p-6 text-sm" style={{ color: 'var(--text-dim)' }}>
      工单未完成：SR-TAG-01（标签编辑器）
    </div>
  )
}
