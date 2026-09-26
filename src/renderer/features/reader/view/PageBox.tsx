/**
 * [F-R1] PageBox —— 页盒渲染件（单双页共用；自 PageColumn 拆出——组件
 * ≤250 行红线预裁，票面 §3 拆件结构）。
 *
 * ── 行为层 ──
 * - 单一职责=一个页盒：占位态（空白但几何确定：宽=boxWidth/高=页高×zoom）
 *   与渲染态（渲染窗口内：PdfPageCanvas+renderPage(no) 覆盖层装配）；
 *   F-06 页盒视觉（页纸底+页影，渲染/占位同底）；[T3-P4] 页纸底=--paper
 *   随族（三态单源 token）。
 * - data-page-box=data-page-root 挂载位不变（IO/懒渲染回收/scroll-progress
 *   回写/SelectionLayer 锚定全按页号消费——F-R1 矩阵「零改」格的实现前提）。
 * - 单页列：boxWidth=列宽（最宽页×zoom，全列等宽）；双页行：boxWidth=自身
 *   页宽×zoom（pageBoxWidth——行内左顶对齐的几何前提）。宽度语义由宿主
 *   PageColumn 决定，本组件只消费。
 *
 * ── 接口层 ──
 * - export function PageBox(props: { no; size; zoom; boxWidth; rendered;
 *     doc: PDFDocumentProxy | null; renderPage(no); onPageRender(no, payload,
 *     geometry: PdfPageGeometry); onError(msg) }): JSX.Element
 *   （geometry 第三参=F-A6-b1 T1/T9 页几何通道透传——类型与 PdfPageCanvas 同源）
 *
 * ── 架构层 ── / ── 生命周期层 ──
 * - F-ARCH3 拆件纪律：函数形态原样迁（不加 useCallback/useMemo）；渲染窗口
 *   判定（rendered）由宿主传入，canvas 生命周期=渲染窗口绑定（INV-30）不变。
 */
import type { PDFDocumentProxy } from '../state/PdfDocProvider'
import { PdfPageCanvas } from './PdfPageCanvas'
import type { PdfPageGeometry, PdfTextContent } from './PdfPageCanvas'
import { pageBoxHeight, type PageBoxSize } from './page-column-geometry'

export function PageBox(props: {
  no: number
  size: PageBoxSize
  zoom: number
  /** 盒宽（single=列宽等宽；double=自身页宽×zoom——语义归宿主） */
  boxWidth: number
  /** 渲染窗口内标志（宿主 rendered set 成员） */
  rendered: boolean
  doc: PDFDocumentProxy | null
  renderPage(no: number): JSX.Element
  onPageRender(no: number, payload: PdfTextContent, geometry: PdfPageGeometry): void
  onError(msg: string): void
}): JSX.Element {
  const { no, size, zoom, boxWidth, rendered, doc } = props
  return (
    <div
      data-page-box={no}
      className="relative shrink-0"
      // [F-06] 页盒底+页影（缺陷 B）；渲染/占位同底消色差跳动。[T3-P4] 页纸底
      // =--paper 随族（light=var(--panel) 桥接白不变/dark=#242830/sepia=#f7efdc）
      style={{ width: boxWidth, height: pageBoxHeight(size, zoom), background: 'var(--paper)', boxShadow: 'var(--shadow-page)' }}
    >
      {rendered ? (
        <div data-page-root={no} className="absolute inset-0 flex justify-center">
          {/* [F-A5 c/ADR-0019 R2] 纸面承底层（canvas 透明底的承纸面——页纸底
              =--paper 随族：夜间暗纸+canvas filter 反色墨带成白字=案 A 两半边；
              T3-P4 语义演进）+isolation（层序比较域封闭单页内，跨页互扰不可能
              ——页内层序见 page-layer-z 单源） */}
          <div className="relative h-fit" style={{ background: 'var(--paper)', isolation: 'isolate' }}>
            <PdfPageCanvas doc={doc!} pageNo={no} zoom={zoom} onPageRender={props.onPageRender} onError={props.onError} />
            {props.renderPage(no)}
          </div>
        </div>
      ) : null}
    </div>
  )
}
