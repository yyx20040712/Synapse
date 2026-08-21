/**
 * [SR-RDR-06] AnnotationLayer —— 标注渲染与命中（工单：open / weak，依赖 SR-RDR-01）
 *
 * ── 行为层 ──
 * - 按当前页过滤标注：rects 归一化坐标 → 绝对定位色块（颜色由 kind+color 决定，
 *   透明度 0.35）
 * - 打开文档时对每条标注 verifyQuote 重定位（排版变化自愈；失败则按 rects 显示）
 * - 点击标注：弹批注编辑（comment textarea，保存 api.reader.updateAnnotation）；
 *   删除按钮 → confirm → api.reader.deleteAnnotation
 * - sortKey 生成："页码:页内序号"（补零对齐）
 *
 * ── 接口层 ──
 * - export function AnnotationLayer(props: { annotations: Annotation[];
 *     page: number; pageRoot: HTMLElement | null;
 *     onChanged(): void }): JSX.Element
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - 纯渲染+交互，数据来自 reader.store
 */
import type { Annotation } from '@shared/models/annotation'

export function AnnotationLayer(_props: {
  annotations: Annotation[]
  page: number
  pageRoot: HTMLElement | null
  onChanged: () => void
}): JSX.Element {
  return (
    <div data-ticket="SR-RDR-06" className="p-6 text-sm" style={{ color: 'var(--text-dim)' }}>
      工单未完成：SR-RDR-06（标注层）
    </div>
  )
}
