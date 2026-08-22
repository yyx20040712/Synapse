/**
 * [SR-RDR-05] SelectionLayer —— 文本选择→定位器（工单：open / weak，依赖 annotation-anchor 模块）
 *
 * ── 行为层 ──
 * - 监听文本层 selectionchange/mouseup：window.getSelection() 非空时弹出标注工具条
 *   （5 色 + 高亮/下划线/备注三种）
 * - 确认后经 annotation-anchor 生成 { start, end, quote/prefix/suffix, rects }
 *   → api.reader.saveAnnotation → 刷新 AnnotationLayer
 * - 选区跨页/跨视口时提示"仅支持单页内标注"（v1 约束）
 *
 * ── 接口层 ──
 * - export function SelectionLayer(props: { pageRoot: HTMLElement | null;
 *     paperId: string; page: number; onSaved(a: Annotation): void }): JSX.Element
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - e2e：选中→高亮→重开仍在原位（tests/e2e/reader-text.spec.ts 后半）
 */
export function SelectionLayer(_props: {
  pageRoot: HTMLElement | null
  paperId: string
  page: number
  onSaved: (a: { id: string }) => void
}): JSX.Element {
  return (
    <div data-ticket="SR-RDR-05" className="p-6 text-sm" style={{ color: 'var(--text-dim)' }}>
      工单未完成：SR-RDR-05（选择层）
    </div>
  )
}
