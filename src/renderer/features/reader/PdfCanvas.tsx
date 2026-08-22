/**
 * [SR-RDR-02] PdfCanvas —— pdf.js 渲染封装（工单：done / strong，Phase 3 决策门内实现）
 *
 * ── 行为层 ──
 * - pdfjs-dist v4（精确钉版）加载 fileUrl（app-file://），渲染当前页到 canvas
 * - DPR 适配（devicePixelRatio）；缩放 zoom（0.5~3）；页码跳转 props 受控
 * - 渲染队列：快速翻页取消旧任务（renderTask.cancel()）
 * - worker：import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'，
 *   GlobalWorkerOptions.workerSrc = workerSrc（CSP 已放行 worker-src 'self'）
 *
 * ── 接口层 ──
 * - export interface PdfCanvasProps { fileUrl: string; pageNumber: number; zoom: number;
 *     onPageRender(page: number, textContent: PdfTextItem[]): void; onError(msg: string): void }
 * - export function PdfCanvas(props: PdfCanvasProps): JSX.Element
 * - PdfTextItem 是 pdfjs TextItem 的结构子集（主入口未导出该类型）：消费方
 *   （TextLayer/SelectionLayer/ReaderPage）只从本文件取类型与数据，不 import pdfjs-dist
 *
 * ── 架构层 ──
 * - 唯一允许 import pdfjs-dist 的文件；TextLayer/SelectionLayer 依赖它回调的 textContent
 * - 卸载时清理（pdf doc.destroy()）
 *
 * ── 生命周期层 ──
 * - 决策门记录：若 canvas+TextLayer 路线在 Phase 3 spike 失败 → 切官方 viewer iframe
 *   方案，本文件整体替换并记 ADR-002 修订（旧实现删除，教训 E5）
 * - spike 已通过（ADR-0002，2026-08-22）：v4 page.render({canvasContext, viewport,
 *   transform}) 参数形态、worker ?url 配方、DPR 背衬尺寸 = CSS × dpr 均在真实
 *   Electron 42 上实证；渲染完成后回调 textContent 供 TextLayer 生成可选中文本
 *
 * ── 文化层 ──
 * - 测试：tests/e2e/reader-text.spec.ts（渲染文本断言，随 SR-RDR-04 完成激活）+ anchor 单测配合
 */
import { useEffect, useRef, useState } from 'react'
import {
  GlobalWorkerOptions,
  RenderingCancelledException,
  getDocument,
  type PDFDocumentProxy,
  type RenderTask
} from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

// worker 本地打包（ADR-0002 硬约束：禁 CDN）；?url 在 dev 是 dev-server 地址、
// 构建后是产物内文件 URL，两者都在 CSP worker-src 'self' 范围内（spike 实证）
GlobalWorkerOptions.workerSrc = workerUrl

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

export interface PdfCanvasProps {
  fileUrl: string
  pageNumber: number
  zoom: number
  onPageRender(page: number, textContent: PdfTextItem[]): void
  onError(msg: string): void
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

export function PdfCanvas(props: PdfCanvasProps): JSX.Element {
  const { fileUrl, pageNumber, zoom } = props
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const renderTaskRef = useRef<RenderTask | null>(null)
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null)
  // 回调走 latest-ref：父组件传内联箭头函数不应触发本组件的重渲染队列
  const onPageRenderRef = useRef(props.onPageRender)
  const onErrorRef = useRef(props.onError)
  onPageRenderRef.current = props.onPageRender
  onErrorRef.current = props.onError

  // 文档生命周期：fileUrl 变化 → 弃旧文档（销毁连带 worker 侧资源）→ 异步加载新文档
  useEffect(() => {
    let cancelled = false
    setDoc(null)
    // isEvalSupported: false——CSP 禁 unsafe-eval，显式关掉 pdfjs 的 eval 快路径
    const task = getDocument({ url: fileUrl, isEvalSupported: false })
    task.promise
      .then((loaded) => {
        if (!cancelled) {
          setDoc(loaded)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          onErrorRef.current(`PDF 加载失败：${errorMessage(err)}`)
        }
      })
    return () => {
      cancelled = true
      // loadingTask 拥有 document：destroy 对"加载中"是中止、对"已加载"是销毁
      void task.destroy().catch(() => undefined)
    }
  }, [fileUrl])

  // 渲染队列：doc/pageNumber/zoom 任一变化即重渲；effect 清理取消在途任务，
  // 快速翻页时旧帧的 cancel() 让 await task.promise 以取消异常结束（静默丢弃）
  useEffect(() => {
    if (doc === null) {
      return
    }
    let cancelled = false
    const render = async (): Promise<void> => {
      renderTaskRef.current?.cancel()
      // 防御性收敛：进度记录的 lastReadPage 可能越界（页码 1 基；store 侧亦会夹紧）
      const pageNo = Math.min(Math.max(1, Math.floor(pageNumber)), doc.numPages)
      const scale = Math.min(3, Math.max(0.5, zoom))
      const page = await doc.getPage(pageNo)
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
      const viewport = page.getViewport({ scale })
      // 背衬尺寸 = CSS 尺寸 × DPR（spike 实证配方）；transform 把绘制坐标系缩放回 CSS 系
      canvas.width = Math.floor(viewport.width * dpr)
      canvas.height = Math.floor(viewport.height * dpr)
      canvas.style.width = `${Math.floor(viewport.width)}px`
      canvas.style.height = `${Math.floor(viewport.height)}px`
      const task = page.render({
        canvasContext: ctx,
        viewport,
        transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined
      })
      renderTaskRef.current = task
      await task.promise
      if (cancelled) {
        return
      }
      const textContent = await page.getTextContent()
      if (cancelled) {
        return
      }
      onPageRenderRef.current(
        pageNo,
        // includeMarkedContent 默认关闭，防御性过滤掉无 str 的结构项
        textContent.items.filter((item): item is PdfTextItem => 'str' in item)
      )
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
  }, [doc, pageNumber, zoom])

  return (
    <div className="flex justify-center p-2">
      {/* data-pdf-canvas：ReaderPage 以此度量页面 CSS 尺寸（TextLayer 的
          pageWidth/pageHeight/viewportScale 输入），不另设尺寸回调通道 */}
      <canvas ref={canvasRef} data-pdf-canvas="true" aria-label="PDF 页面渲染" />
    </div>
  )
}
