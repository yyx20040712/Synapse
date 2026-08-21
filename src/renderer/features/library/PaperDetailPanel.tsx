/**
 * [SR-LIB-04] PaperDetailPanel —— 文献详情侧栏（工单：open / weak）
 *
 * ── 行为层 ──
 * - 展示 PaperDetail 全量元数据（标题/作者/年份/期刊/DOI/摘要/来源/增强状态）
 * - 操作区：编辑元数据（Dialog 表单，保存走 api.library.updateMeta）、
 *   添加/移除标签（TagEditor）、打开笔记（NotesPanel）、增强按钮（api.enrich.fetch）、
 *   导出本篇报告（api.export_.report）、DOI 外链（api.system.openExternal）
 * - 增强中禁用按钮并显示 spinner 态文案
 *
 * ── 接口层 ──
 * - export function PaperDetailPanel(props: { paperId: string | null }): JSX.Element
 *
 * ── 架构层 ──
 * - 数据自取：useAsync(() => unwrap(api.library.detail({ paperId })))
 * - 标签/笔记组件从各自 features import——例外：由本文件作为组合根引用子组件
 *   （组合发生在页面层，store 不跨域）
 *
 * ── 生命周期层 ── / ── 文化层 ──
 * - 错误统一 ApiClientError → toast
 */
export function PaperDetailPanel(_props: { paperId: string | null }): JSX.Element {
  return (
    <div data-ticket="SR-LIB-04" className="p-6 text-sm" style={{ color: 'var(--text-dim)' }}>
      工单未完成：SR-LIB-04（文献详情）
    </div>
  )
}
