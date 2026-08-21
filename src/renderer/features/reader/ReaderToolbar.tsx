/**
 * [SR-RDR-07] ReaderToolbar —— 阅读器工具栏（工单：open / weak）
 *
 * ── 行为层 ──
 * - 页码显示/跳转、上/下页、缩放 -/100%/+（0.5~3 步进 0.1）、适应宽度
 * - 标注颜色选择（当前色）；内文搜索框（v1：全文检索走文献库 FTS，
 *   页内高亮搜索 v2——工具栏只放占位禁用态并 title 提示）
 *
 * ── 接口层 ──
 * - export function ReaderToolbar(props: { page: number; totalPages: number; zoom: number;
 *     color: AnnotationColor; onNavigate(page: number): void;
 *     onZoom(z: number): void; onColor(c: AnnotationColor): void }): JSX.Element
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - 纯受控组件
 */
import type { AnnotationColor } from '@shared/models/annotation'

export function ReaderToolbar(_props: {
  page: number
  totalPages: number
  zoom: number
  color: AnnotationColor
  onNavigate: (page: number) => void
  onZoom: (z: number) => void
  onColor: (c: AnnotationColor) => void
}): JSX.Element {
  return (
    <div data-ticket="SR-RDR-07" className="p-6 text-sm" style={{ color: 'var(--text-dim)' }}>
      工单未完成：SR-RDR-07（阅读器工具栏）
    </div>
  )
}
