/**
 * [SR-RDR-03] TextLayer —— 官方文本层接线（工单：open / strong，Phase 3）
 *
 * ── 行为层 ──
 * - 用 pdf.js renderTextLayer({ textContentSource, container, viewport }) 生成可选中文本层
 * - 引入官方 pdf_viewer.css 的文本层样式（含 --scale-factor 变量设置——
 *   v4/v5 的已知坑：不设变量文字不可选/错位，教训里 Synapse 踩过）
 * - 容器绝对定位于 canvas 之上，pointer-events 仅文本命中
 *
 * ── 接口层 ──
 * - export interface TextLayerProps { textContent: unknown[]; viewportScale: number;
 *     pageWidth: number; pageHeight: number }
 * - export function TextLayer(props: TextLayerProps): JSX.Element
 *
 * ── 架构层 ──
 * - 唯一允许 import pdfjs-dist 文本层 API 与官方 CSS 的文件
 *
 * ── 生命周期层 ── / ── 文化层 ──
 * - 与 PdfCanvas 同批实现；e2e 断言"文字可选中"
 */
export function TextLayer(_props: {
  textContent: unknown[]
  viewportScale: number
  pageWidth: number
  pageHeight: number
}): JSX.Element {
  return (
    <div data-ticket="SR-RDR-03" className="p-6 text-sm" style={{ color: 'var(--text-dim)' }}>
      工单未完成：SR-RDR-03（文本层，strong）
    </div>
  )
}
