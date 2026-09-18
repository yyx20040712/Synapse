// b3: P7-F
/**
 * [F-SPLIT-01] PageColumnView —— 页列 ready 态渲染件（自 PageColumn 拆出
 * 2026-09-05；迁移 PageColumn 头注段②占位盒布局+F-R1 行渲染分支职责段，
 * JSX 零改纯搬运）。
 *
 * ── 行为层（原 PageColumn 段②+ready JSX）──
 * - 段②占位盒布局：高=pageSizes[no]×zoom；宽=列宽（最宽页×zoom 居中；双页=
 *   各自页宽，行内左顶对齐）；未渲染盒空白。容器 data-page-column="ready"
 *   （rootRef/width 由宿主传入——段③IO 与段⑤程序滚动按 [data-page-box]
 *   页号消费，data-page-row 行盒口径不变）。
 * - F-R1 双页行：两页盒并排 flex 左顶对齐；行内 gap-3 与 PAGE_GAP_PX 同源
 *   （rowWidth 口径）；末行单页右缺席不渲染空盒——列宽已排除孤页行，
 *   行宽恒=左盒宽无跳变（S3 自裁，视觉验收归真机探针场景 E）。
 * - 页盒 JSX=PageBox（单双页共用，F-R1 拆件——函数形态原样，不加
 *   useCallback/useMemo）。
 *
 * ── 接口层 ──
 * - export function PageColumnView(props: { rootRef; pageSizes; zoom; layout;
 *   width; rendered; doc; renderPage(no); onPageRender(no, payload, geometry);
 *   onError(msg) }): JSX.Element（width=宿主 columnWidthFor 单源计算传入）
 */
import type { MutableRefObject } from 'react'
import type { PDFDocumentProxy } from '../state/PdfDocProvider'
import type { PdfPageGeometry, PdfTextContent } from './PdfPageCanvas'
import { PageBox } from './PageBox'
import { layoutRows, pageBoxWidth, type PageBoxSize, type PageLayout } from './page-column-geometry'

export function PageColumnView(props: {
  /** 宿主列根 ref（IO/段⑤程序滚动的 [data-page-box] 查询根——useRef 实返型） */
  rootRef: MutableRefObject<HTMLDivElement | null>
  pageSizes: PageBoxSize[]
  zoom: number
  layout: PageLayout
  /** 列宽（宿主 columnWidthFor 计算单源——容器 style 与页盒共用） */
  width: number
  /** 渲染窗口成员集（宿主 usePageLazyWindow rendered） */
  rendered: Set<number>
  doc: PDFDocumentProxy | null
  renderPage(no: number): JSX.Element
  onPageRender(no: number, payload: PdfTextContent, geometry: PdfPageGeometry): void
  onError(msg: string): void
}): JSX.Element {
  const { pageSizes, zoom, layout, width, rendered, doc } = props
  return (
    <div
      ref={props.rootRef}
      data-page-column="ready"
      className="mx-auto flex flex-col items-center gap-3"
      style={{ width }}
    >
      {layout === 'double'
        ? layoutRows(pageSizes).map((row) => (
          // F-R1 双页行：两页盒并排 flex 左顶对齐；行内 gap-3 与 PAGE_GAP_PX 同源
          // （rowWidth 口径）；末行单页右缺席不渲染空盒——列宽已排除孤页行，
          // 行宽恒=左盒宽无跳变（S3 自裁，视觉验收归真机探针场景 E）
          <div key={row.leftNo} data-page-row={row.leftNo} className="flex shrink-0 items-start gap-3">
            <PageBox no={row.leftNo} size={row.left} zoom={zoom} boxWidth={pageBoxWidth(row.left, zoom)} rendered={rendered.has(row.leftNo)}
              doc={doc} renderPage={props.renderPage} onPageRender={props.onPageRender} onError={props.onError} />
            {row.right !== undefined && row.rightNo !== undefined ? (
              <PageBox no={row.rightNo} size={row.right} zoom={zoom} boxWidth={pageBoxWidth(row.right, zoom)} rendered={rendered.has(row.rightNo)}
                doc={doc} renderPage={props.renderPage} onPageRender={props.onPageRender} onError={props.onError} />
            ) : null}
          </div>
        ))
        : pageSizes.map((size, i) => (
          <PageBox key={i + 1} no={i + 1} size={size} zoom={zoom} boxWidth={width} rendered={rendered.has(i + 1)}
            doc={doc} renderPage={props.renderPage} onPageRender={props.onPageRender} onError={props.onError} />
        ))}
    </div>
  )
}
