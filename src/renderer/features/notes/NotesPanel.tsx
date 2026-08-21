/**
 * [SR-NOTE-01] NotesPanel —— 笔记面板（工单：open / weak）
 *
 * ── 行为层 ──
 * - 每篇文献一篇 Markdown 笔记：标题输入 + textarea 正文（等宽字体）
 * - 载入 api.notes.get({ paperId })；自动保存防抖 1.5s（内容变化后）→ api.notes.save
 * - 保存状态指示（已保存/保存中…/失败重试按钮）
 *
 * ── 接口层 ──
 * - export function NotesPanel(props: { paperId: string }): JSX.Element
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - v1 纯 textarea（不引入 Markdown 预览/编辑器库——依赖预算）
 */
export function NotesPanel(_props: { paperId: string }): JSX.Element {
  return (
    <div data-ticket="SR-NOTE-01" className="p-6 text-sm" style={{ color: 'var(--text-dim)' }}>
      工单未完成：SR-NOTE-01（笔记面板）
    </div>
  )
}
