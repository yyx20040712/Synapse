/**
 * [SR-RDR-04] ReaderPage —— 阅读器页面（工单：open / weak）
 *
 * ── 行为层 ──
 * - 无打开文档：空态引导（"从文献库打开一篇文献"）
 * - 打开：reader.store.openPaper(paperId) → PdfCanvas + TextLayer + SelectionLayer +
 *   AnnotationLayer + ReaderToolbar + OutlinePanel 布局（左右侧栏可折叠）
 * - 定时保存阅读进度（翻页后 2s 防抖 api.reader.saveProgress）
 * - 接收 library 侧"打开文献"事件（简单事件总线：window.dispatchEvent CustomEvent
 *   'synapse:open-paper'，library.store.openPaper 派发；本页监听并切 tab 由 App 层处理）
 *
 * ── 接口层 ──
 * - export function ReaderPage(): JSX.Element
 *
 * ── 架构层 ──
 * - 组合根：阅读器各层在此组装；层间经 reader.store 交互
 *
 * ── 生命周期层 ── / ── 文化层 ──
 * - e2e：tests/e2e/reader-text.spec.ts 断言渲染文本
 */
export function ReaderPage(): JSX.Element {
  return (
    <div data-ticket="SR-RDR-04" className="p-6 text-sm" style={{ color: 'var(--text-dim)' }}>
      工单未完成：SR-RDR-04（阅读器页面）
    </div>
  )
}
