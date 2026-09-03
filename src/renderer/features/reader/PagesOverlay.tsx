/**
 * [F-ARCH3] PagesOverlay —— 页面缓存注册表+覆盖层装配（工单：LOOP F-ARCH3 / strong）
 *
 * ── 行为层 ──
 * - 七件自 ReaderPage 原样迁入（本组件为页面缓存注册表宿主——F-01 头注声明
 *   「ReaderPage 只装配」的漂移收口，纯重构行为零变）：
 *   ① PageText（页号+文本载荷+canvas CSS 盒，成对更新契约）；
 *   ② PageFrame（渲染窗口内页的卸载哨，onRecycle 回收）；
 *   ③ pageTexts/pageRoots 两个 useState（缓存注册表）；
 *   ④ 换文献清缓存 effect（键 fileUrl，只清两表——setPdfDoc(null) 留 ReaderPage，
 *     pdfDoc 是 OutlinePanel 数据源=布局职责）；
 *   ⑤ handlePageRender（PdfPageCanvas 渲染回报→页根域内量测 canvas CSS 盒→
 *     Math.round 写 pageTexts；pageRoots 引用相等不重写；回报第三参页几何
 *     rotate/view 随条目存储——F-A6-b1 T1/T9 通道）；
 *   ⑥ dropPageState（W3：两表同删）；
 *   ⑦ renderPageLayers 覆盖层工厂（TextLayer 挂载条件 pt!==undefined /
 *     AnnotationLayer 挂载条件 pr!==undefined / ReaderAiLayer 恒挂
 *     pageRoot=pr??null；page 传 no−1；viewportScale=zoom；geometry 下钻透传）。
 * - 内装 PageColumn（十 props 全透传——F-R1 增 layout）：onPageRender（写
 *   注册表）与 renderPage（读注册表）读写同源必须同居一组件——这是本组件
 *   包 PageColumn 而非只提供工厂的原因（F-ARCH3 票面行为层）。
 * ── 接口层 ──
 * - export function PagesOverlay(props: { doc: PDFDocumentProxy; fileUrl: string;
 *     totalPages: number; zoom: number; annotations: Annotation[];
 *     scrollContainerRef: RefObject<HTMLDivElement | null>;
 *     scrollRequest: PageScrollRequest | null;
 *     onReady(basisWidth: number): void; onError(msg: string): void;
 *     layout?: PageLayout }): JSX.Element
 * - 类型再导出纪律（INV-16）：PDFDocumentProxy 经 PdfDocProvider、PdfTextContent
 *   经 PdfPageCanvas、PageScrollRequest 经 PageColumn、Annotation 经 shared 模型。
 * ── 架构层 ──
 * - 分层不动（renderer 特性内重组）；零新依赖；函数形态原样迁（不加
 *   useCallback/useMemo——纯重构零行为变纪律）
 * ── 生命周期层 ──
 * - PageFrame 卸载哨宿主随迁（INV-30/W3——canvas 生命周期=渲染窗口绑定的
 *   注册表侧对口）；渲染链多一层组件，reconcile 代价无感（票面生命周期层）
 *
 * ── 文化层 ──
 * - tests/unit/renderer/pages-overlay.test.tsx（注册表行为锁，always-active）；
 *   e2e reader-text/reader-scroll 为最终裁判
 */
import { useCallback, useEffect, useState } from 'react'
import type { ReactNode, RefObject } from 'react'
import type { Annotation } from '@shared/models/annotation'
import { AnnotationLayer } from './AnnotationLayer'
import { ReaderAiLayer } from './AiAnnotationLayer'
import { PageColumn, type PageScrollRequest } from './PageColumn'
import { SearchHighlightLayer } from './SearchHighlightLayer'
import type { PDFDocumentProxy } from './PdfDocProvider'
import type { PdfPageGeometry, PdfTextContent } from './PdfPageCanvas'
import type { PageLayout } from './page-column-geometry'
import { TextLayer } from './TextLayer'

/** 当前页文本与几何（成对更新：页号 + 文本载荷 + 页几何 + 该页 canvas CSS 盒） */
interface PageText {
  page: number
  text: PdfTextContent
  /** F-A6-b1 T1/T9 通道：渲染回报的页几何（rotate/view），透传 TextLayer */
  geometry: PdfPageGeometry
  box: { w: number; h: number }
}

/** 渲染窗口内页的卸载哨（F-01 回收同删 pageTexts+pageRoots 条目——W3） */
function PageFrame(props: { no: number; onRecycle(no: number): void; children: ReactNode }): JSX.Element {
  const { no, onRecycle, children } = props
  useEffect(() => () => onRecycle(no), [no, onRecycle])
  return <>{children}</>
}

export function PagesOverlay(props: {
  doc: PDFDocumentProxy
  fileUrl: string
  totalPages: number
  zoom: number
  annotations: Annotation[]
  scrollContainerRef: RefObject<HTMLDivElement | null>
  scrollRequest: PageScrollRequest | null
  onReady(basisWidth: number): void
  onError(msg: string): void
  /** F-R1 页布局（缺省 single——PageColumn 同语义透传） */
  layout?: PageLayout
}): JSX.Element {
  const { doc, fileUrl, totalPages, zoom, annotations, scrollContainerRef, scrollRequest, onReady, onError } = props
  const [pageTexts, setPageTexts] = useState<Record<number, PageText>>({})
  const [pageRoots, setPageRoots] = useState<Record<number, HTMLElement>>({})

  // 换文献：丢弃旧页文本/页根（防陈旧文本层——TextLayer 以页对齐才渲染）
  useEffect(() => {
    setPageTexts({})
    setPageRoots({})
  }, [fileUrl])

  /** PdfPageCanvas 渲染完成回报：每页自量（按页号查该页盒内 canvas CSS 盒）。
      第三参 geometry=F-A6-b1 T1/T9 页几何通道（rotate/view 原值入注册表，
      透传 TextLayer——duckViewport rotation/rawDims 真值化） */
  const handlePageRender = (no: number, text: PdfTextContent, geometry: PdfPageGeometry): void => {
    const pageRoot = document.querySelector<HTMLElement>(`[data-page-root="${no}"]`)
    const canvas = pageRoot?.querySelector('canvas[data-pdf-canvas]') ?? null
    if (canvas === null) return
    const rect = canvas.getBoundingClientRect()
    setPageTexts((prev) => ({ ...prev, [no]: { page: no, text, geometry, box: { w: Math.round(rect.width), h: Math.round(rect.height) } } }))
    if (pageRoot !== null) setPageRoots((prev) => (prev[no] === pageRoot ? prev : { ...prev, [no]: pageRoot }))
  }

  /** 渲染窗口内页的回收删条目（W3：pageTexts/pageRoots 同删——防 stale 根残留） */
  const dropPageState = useCallback((no: number): void => {
    const del = <T,>(prev: Record<number, T>): Record<number, T> => {
      if (prev[no] === undefined) return prev
      const next = { ...prev }; delete next[no]; return next
    }
    setPageTexts(del); setPageRoots(del)
  }, [])

  /** 段④层实例化：每渲染页一套覆盖层（props 不变；标注层自同步 store 父级无动作）。
      P7E-03：SearchHighlightLayer 挂 ReaderAiLayer 后（DOM 序在 AnnotationLayer
      后=叠于标注块之上——搜索瞬态视觉合理；内部订阅 reader-search.store） */
  const renderPageLayers = (no: number): JSX.Element => {
    const pt = pageTexts[no]
    const pr = pageRoots[no]
    return (
      <PageFrame no={no} onRecycle={dropPageState}>
        {pt !== undefined ? <TextLayer textContent={pt.text} viewportScale={zoom} pageWidth={pt.box.w} pageHeight={pt.box.h} geometry={pt.geometry} /> : null}
        {pr !== undefined ? <AnnotationLayer annotations={annotations} page={no - 1} pageRoot={pr} onChanged={() => undefined} /> : null}
        <ReaderAiLayer page={no - 1} pageRoot={pr ?? null} />
        <SearchHighlightLayer page={no - 1} pageRoot={pr ?? null} />
      </PageFrame>
    )
  }

  return (
    <PageColumn doc={doc} totalPages={totalPages} zoom={zoom} layout={props.layout} scrollContainerRef={scrollContainerRef}
      onPageRender={handlePageRender} onError={onError}
      renderPage={renderPageLayers} onReady={onReady} scrollRequest={scrollRequest} />
  )
}
