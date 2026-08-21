/**
 * [SR-RDR-08] OutlinePanel —— 目录/缩略图侧栏（工单：open / weak）
 *
 * ── 行为层 ──
 * - Tab1 目录：pdf.getOutline() 树形列表；点击跳页（resolve 目的地页码）；
 *   无目录显示"本文档无书签目录"
 * - Tab2 缩略图：当前页 ±10 页的 canvas 小图（scale 0.2，懒渲染 IntersectionObserver）
 *
 * ── 接口层 ──
 * - export function OutlinePanel(props: { pdfDoc: unknown;
 *     currentPage: number; onNavigate(page: number): void }): JSX.Element
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - pdfDoc 以 getDocument 句柄传入（类型 unknown，内部窄化为 pdfjs 类型）
 */
export function OutlinePanel(_props: {
  pdfDoc: unknown
  currentPage: number
  onNavigate: (page: number) => void
}): JSX.Element {
  return (
    <div data-ticket="SR-RDR-08" className="p-6 text-sm" style={{ color: 'var(--text-dim)' }}>
      工单未完成：SR-RDR-08（目录/缩略图）
    </div>
  )
}
