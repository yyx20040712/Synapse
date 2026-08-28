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
 *     zoom: number; onPageRender(page: number, textContent: PdfTextContent): void;
 *     onError(msg: string): void }): JSX.Element
 * - pageNo 固定（页列模型：页码由 PageColumn 分配，不再跳变）
 * - PdfTextItem/PdfTextStyle/PdfTextContent 类型单源驻本文件（pdfjs TextItem
 *  /TextStyle 的结构子集——消费方 TextLayer/ReaderPage 不 import pdfjs-dist）
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

/**
 * 对外文本项类型：pdfjs TextItem 的结构子集（str/几何/变换，含行尾标记）。
 * 主入口未再导出 TextItem 类型，且边界上本文件应自持契约——消费方不 import pdfjs-dist
 */
export interface PdfTextItem {
  str: string
  dir: string
  width: number
  height: number
  transform: number[]
  fontName: string
  hasEOL: boolean
}

/**
 * 字体样式（pdfjs TextStyle 结构子集）：TextLayer 排版（ascent/descent）与
 * 文本朝向（vertical）计算必需，按 items 里的 fontName 索引
 */
export interface PdfTextStyle {
  fontFamily: string
  ascent: number
  descent: number
  vertical: boolean
}

/**
 * 页文本内容：TextLayer 生成可选中文本层的完整输入。styles 缺省会令其按
 * fontName 的样式查找拿到 undefined 而崩——集成期实证，不再是可省字段
 */
export interface PdfTextContent {
  items: PdfTextItem[]
  styles: Record<string, PdfTextStyle>
  lang: string | null
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

export function PdfPageCanvas(props: {
  doc: PDFDocumentProxy
  pageNo: number
  zoom: number
  onPageRender(page: number, textContent: PdfTextContent): void
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
      const scale = Math.min(3, Math.max(0.5, zoom))
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
      const task = pdfPage.render({
        canvasContext: ctx,
        viewport,
        transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined
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
  return <canvas ref={canvasRef} data-pdf-canvas="true" aria-label={`PDF 第 ${pageNo} 页渲染`} />
}
