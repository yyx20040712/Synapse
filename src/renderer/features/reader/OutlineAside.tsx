/**
 * OutlineAside —— 阅读器左侧栏容器（SplitPane 的 pane 内容，纯展示）。
 *
 * 标题条（目录/缩略图 + 收起按钮）与 OutlinePanel 的宿主；宽度控制与拖拽由
 * SplitPane 持有（SplitPane 接线时自 ReaderPage 拆出——组件 ≤250 行纪律）。
 * pdfDoc 为 pdfjs 文档句柄（unknown：运行时 duck-typed，见 TextLayer.tsx 先例）。
 */
import { OutlinePanel } from './OutlinePanel'

export function OutlineAside(props: {
  pdfDoc: unknown
  currentPage: number
  onNavigate(page: number): void
  onCollapse(): void
}): JSX.Element {
  const { pdfDoc, currentPage, onNavigate, onCollapse } = props
  return (
    <aside
      className="flex h-full flex-col border-r"
      style={{ borderColor: 'var(--border)', background: 'var(--panel)' }}
    >
      <div
        className="flex items-center justify-between border-b px-2 py-1 text-xs"
        style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}
      >
        <span>目录 / 缩略图</span>
        <button type="button" className="rounded px-1" onClick={onCollapse}>
          收起
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <OutlinePanel pdfDoc={pdfDoc} currentPage={currentPage} onNavigate={onNavigate} />
      </div>
    </aside>
  )
}
