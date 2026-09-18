// b3: P7-F
/**
 * PdfPageCanvas —— 每页渲染单元（F-01：由 PdfCanvas.tsx 拆出，旧文件已删——
 * 方案切换=删除旧方案红线）。
 *
 * ── 行为层 ──
 * - 单页渲染：doc.getPage(pageNo)→render({canvasContext,viewport,transform})；
 *   渲染完成回调该页 textContent（items+styles+lang 完整载荷）
 * - DPR 适配（背衬尺寸=CSS×dpr，spike 实证配方）；缩放=zoom 夹取 [0.5,3]
 * - 渲染队列：props 变化/卸载取消在途任务（renderTask.cancel()——快速滚动中
 *   滚出窗口的页由本配方回收其渲染任务）
 *
 * ── 接口层 ──
 * - export function PdfPageCanvas(props: { doc: PDFDocumentProxy; pageNo: number;
 *     zoom: number; onPageRender(page, textContent: PdfTextContent,
 *     geometry: PdfPageGeometry): void; onError(msg: string): void }): JSX.Element
 * - pageNo 固定（页码 1 基；页列模型：页码由 PageColumn 分配，不再跳变）
 * - PdfTextItem/PdfTextStyle/PdfTextContent/PdfPageGeometry 类型真源=
 *   geometry-types（pdfjs TextItem/TextStyle 的结构子集+页几何通道——消费方
 *   TextLayer/PagesOverlay 不 import pdfjs-dist）；本件 type 再导出保受锁
 *   测试旧路径（ai-annotation-layer.test:25 等——F-GEOM-01-G1 M0 切环）
 *
 * ── 架构层 ──
 * - pdfjs-dist import 白名单文件（INV-16：PdfDocProvider/PdfPageCanvas/TextLayer/
 *   CorpusExtractor）；doc 句柄经 props（生命周期归 PdfDocProvider，本组件不销毁）
 *
 * ── 生命周期层 ── / ── 文化层 ──
 * - e2e tests/e2e/reader-text.spec.ts（渲染文本断言+canvas 计数上界归 F-04 收官）
 */
import { useEffect, useRef } from 'react'
import { RenderingCancelledException, type PDFDocumentProxy, type RenderTask } from 'pdfjs-dist'
import { PAGE_LAYER_Z } from './state/page-layer-z'
import { clampScale } from './pdf-item-geometry'
import type { PdfPageGeometry, PdfTextContent, PdfTextItem } from './geometry-types'

// 类型再导出（真源=geometry-types——F-GEOM-01-G1 M0 切环）：受锁测试旧路径
// import 本件零触（ai-annotation-layer.test:25/pdf-item-geometry.test:18 等
// 十处 tests/**/*.tsx）
export type { PdfTextItem, PdfTextStyle, PdfTextContent, PdfPageGeometry } from './geometry-types'

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

export function PdfPageCanvas(props: {
  doc: PDFDocumentProxy
  pageNo: number
  zoom: number
  onPageRender(page: number, textContent: PdfTextContent, geometry: PdfPageGeometry): void
  onError(msg: string): void
}): JSX.Element {
  const { doc, pageNo, zoom } = props
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const renderTaskRef = useRef<RenderTask | null>(null)
  // 回调走 latest-ref：父组件传内联箭头函数不应触发本组件的重渲染队列
  const onPageRenderRef = useRef(props.onPageRender)
  const onErrorRef = useRef(props.onError)
  onPageRenderRef.current = props.onPageRender
  onErrorRef.current = props.onError

  // 渲染队列（原 PdfCanvas 配方原样）：doc/pageNo/zoom 任一变化即重渲；effect
  // 清理取消在途任务，快速滚动时旧帧的 cancel() 让 await task.promise 以取消
  // 异常结束（静默丢弃）
  useEffect(() => {
    let cancelled = false
    const render = async (): Promise<void> => {
      renderTaskRef.current?.cancel()
      // 防御性收敛（页码 1 基；页列分配的 pageNo 天然有效，此处兜底）
      const page = Math.min(Math.max(1, Math.floor(pageNo)), doc.numPages)
      const scale = clampScale(zoom)
      const pdfPage = await doc.getPage(page)
      if (cancelled) {
        return
      }
      const canvas = canvasRef.current
      if (canvas === null) {
        return
      }
      const ctx = canvas.getContext('2d')
      if (ctx === null) {
        onErrorRef.current('PDF 渲染失败：无法获取 2D 绘图上下文')
        return
      }
      const dpr = window.devicePixelRatio || 1
      const viewport = pdfPage.getViewport({ scale })
      // 背衬尺寸 = CSS 尺寸 × DPR（spike 实证配方）；transform 把绘制坐标系缩放回 CSS 系
      canvas.width = Math.floor(viewport.width * dpr)
      canvas.height = Math.floor(viewport.height * dpr)
      canvas.style.width = `${Math.floor(viewport.width)}px`
      canvas.style.height = `${Math.floor(viewport.height)}px`
      // [F-A5 c/ADR-0019 R2] 透明底渲染：pdfjs 缺省 #ffffff 填充会把垫底的
      // 标注/AI 色块整页遮死——透明底令墨带外透出下层色块（背景板语义），
      // 墨带（含文字）恒在色块之上=文字纯黑不被染（用户令 2026-08-31）
      const task = pdfPage.render({
        canvasContext: ctx,
        viewport,
        transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined,
        background: 'transparent'
      })
      renderTaskRef.current = task
      await task.promise
      if (cancelled) {
        return
      }
      const textContent = await pdfPage.getTextContent()
      if (cancelled) {
        return
      }
      onPageRenderRef.current(page, {
        // includeMarkedContent 默认关闭，防御性过滤掉无 str 的结构项
        items: textContent.items.filter((item): item is PdfTextItem => 'str' in item),
        styles: textContent.styles,
        lang: textContent.lang
      }, {
        // F-A6-b1 T1/T9 通道：与 viewport 同源的页几何（rotate/view）下钻——
        // TextLayer duckViewport 的真值输入（view 数组断言四元组由结构保证）
        rotate: pdfPage.rotate,
        view: pdfPage.view as [number, number, number, number]
      })
    }
    render().catch((err: unknown) => {
      if (cancelled || err instanceof RenderingCancelledException) {
        return
      }
      onErrorRef.current(`PDF 渲染失败：${errorMessage(err)}`)
    })
    return () => {
      cancelled = true
      renderTaskRef.current?.cancel()
    }
  }, [doc, pageNo, zoom])

  // data-pdf-canvas：ReaderPage 以此度量该页 canvas CSS 尺寸（每页自量——
  // TextLayer 的 pageWidth/pageHeight 输入）；本组件无 padding/边饰——覆盖层
  // （TextLayer/标注层）按紧邻父容器绝对定位，加了会错位
  // [F-A5 c] z=层序常量（墨带在色块上/自绘层下）+pointer-events:none（明纸
  //  穿透——标注 rect 点击/文本层划选手势零回归；canvas 本身无交互面）
  return (
    <canvas
      ref={canvasRef}
      data-pdf-canvas="true"
      aria-label={`PDF 第 ${pageNo} 页渲染`}
      style={{ position: 'relative', zIndex: PAGE_LAYER_Z.canvas, pointerEvents: 'none' }}
    />
  )
}
