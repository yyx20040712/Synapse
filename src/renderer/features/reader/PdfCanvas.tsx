/**
 * [SR-RDR-02] PdfCanvas —— pdf.js 渲染封装（工单：open / strong，Phase 3 决策门内实现）
 *
 * ── 行为层 ──
 * - pdfjs-dist v4（精确钉版）加载 fileUrl（app-file://），渲染当前页到 canvas
 * - DPR 适配（devicePixelRatio）；缩放 zoom（0.5~3）；页码跳转 props 受控
 * - 渲染队列：快速翻页取消旧任务（renderTask.cancel()）
 * - worker：import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'，
 *   GlobalWorkerOptions.workerSrc = workerSrc（CSP 已放行 worker-src 'self'）
 *
 * ── 接口层 ──
 * - export interface PdfCanvasProps { fileUrl: string; pageNumber: number; zoom: number;
 *     onPageRender(page: number, textContent: TextItem[]): void; onError(msg: string): void }
 * - export function PdfCanvas(props: PdfCanvasProps): JSX.Element
 *
 * ── 架构层 ──
 * - 唯一允许 import pdfjs-dist 的文件；TextLayer/SelectionLayer 依赖它回调的 textContent
 * - 卸载时清理（pdf doc.destroy()）
 *
 * ── 生命周期层 ──
 * - 决策门记录：若 canvas+TextLayer 路线在 Phase 3 spike 失败 → 切官方 viewer iframe
 *   方案，本文件整体替换并记 ADR-002 修订（旧实现删除，教训 E5）
 *
 * ── 文化层 ──
 * - 测试：tests/e2e/reader-text.spec.ts（渲染文本断言）+ anchor 单测配合
 */
export function PdfCanvas(_props: {
  fileUrl: string
  pageNumber: number
  zoom: number
  onPageRender: (page: number, textContent: unknown[]) => void
  onError: (msg: string) => void
}): JSX.Element {
  return (
    <div data-ticket="SR-RDR-02" className="p-6 text-sm" style={{ color: 'var(--text-dim)' }}>
      工单未完成：SR-RDR-02（PDF 渲染，strong）
    </div>
  )
}
