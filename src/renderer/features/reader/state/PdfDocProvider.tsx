// b3: P7-F
/**
 * PdfDocProvider —— pdf.js 文档生命周期宿主（F-01：由 PdfCanvas.tsx 拆出，
 * 旧文件已删——方案切换=删除旧方案红线）。
 *
 * ── 行为层 ──
 * - worker 本地打包（ADR-0002：禁 CDN）+ getDocument({url,isEvalSupported:false})
 *   加载 fileUrl（app-file://）；loadingTask.destroy() 对"加载中"是中止、对
 *   "已加载"是销毁（换文档/卸载即销毁，句柄生命周期归本组件）
 * - doc 就绪经 children render-prop 下发（每 tab 一份——挂 ReaderPage 主区）；
 *   未就绪渲染空占位（tab 级 loading/error 态由 ReaderPage 空态分支承载）
 *
 * ── 接口层 ──
 * - export function PdfDocProvider(props: { fileUrl: string;
 *     onDocInfo?(info: { numPages: number }): void;
 *     onDocReady?(doc: PDFDocumentProxy): void;
 *     onError(msg: string): void;
 *     children: (doc: PDFDocumentProxy) => JSX.Element }): JSX.Element
 * - pdfjs 类型再导出单点（INV-16：白名单外消费方不 import pdfjs-dist，含
 *   import type——OutlinePanel/OutlineThumb 自此取 PDFDocumentProxy/RenderTask）
 *
 * ── 架构层 ──
 * - pdfjs-dist import 白名单文件（INV-16：PdfDocProvider/PdfPageCanvas/TextLayer/
 *   CorpusExtractor/PaperImageExtractor 五件——ESLint no-restricted-imports 机器锚，
 *   白名单变更=[locked-change]；PaperImageExtractor=F-UIRES-04 批 3a 扩容第五件）
 * - [F-UIRES-04 批 3a] pdfDoc 句柄注册表接线（INV-135 句柄三则——生命周期归本
 *   组件：加载成功注册/清理注销至 shared/PaperImageExtractor，提取件仅可销毁自建句柄）
 * - worker ?url 配方（dev=dev-server 地址、构建后=产物内文件 URL，均在 CSP
 *   worker-src 'self' 内——spike 实证）；与 CorpusExtractor 的 worker 配置同值幂等
 *
 * ── 生命周期层 ── / ── 文化层 ──
 * - e2e tests/e2e/reader-text.spec.ts（渲染文本断言——阅读器渲染链）
 */
import { useEffect, useRef, useState } from 'react'
import { GlobalWorkerOptions, getDocument, type PDFDocumentProxy } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { paperIdFromFileUrl, registerPaperDoc, unregisterPaperDoc } from '../../../shared/PaperImageExtractor'

// worker 本地打包（ADR-0002 硬约束：禁 CDN）；?url 在 dev 是 dev-server 地址、
// 构建后是产物内文件 URL，两者都在 CSP worker-src 'self' 范围内（spike 实证）
GlobalWorkerOptions.workerSrc = workerUrl

/** pdfjs 类型再导出（INV-16：白名单外文件的类型消费统一经本文件——消费方
 *  不 import pdfjs-dist，含 import type；RenderTask 供 OutlineThumb 等取消渲染） */
export type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist'

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

export function PdfDocProvider(props: {
  fileUrl: string
  /** 文档加载完成时上报页数（totalPages 的数据生产者，先于 children 下发） */
  onDocInfo?(info: { numPages: number }): void
  /** 文档句柄上报（目录/缩略图侧栏的数据源；换文档即弃，消费方按 unknown 收窄） */
  onDocReady?(doc: PDFDocumentProxy): void
  onError(msg: string): void
  children: (doc: PDFDocumentProxy) => JSX.Element
}): JSX.Element {
  const { fileUrl } = props
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null)
  // 回调走 latest-ref：父组件传内联箭头函数不应触发文档重载
  const onDocInfoRef = useRef(props.onDocInfo)
  const onDocReadyRef = useRef(props.onDocReady)
  const onErrorRef = useRef(props.onError)
  onDocInfoRef.current = props.onDocInfo
  onDocReadyRef.current = props.onDocReady
  onErrorRef.current = props.onError

  // 文档生命周期（原 PdfCanvas 配方原样）：fileUrl 变化 → 弃旧文档（销毁连带
  // worker 侧资源）→ 异步加载新文档
  useEffect(() => {
    let cancelled = false
    // [F-UIRES-04 批 3a] 注册表键=app-file://<paperId> 派生；同句柄守卫注销
    const paperId = paperIdFromFileUrl(fileUrl)
    let registered: PDFDocumentProxy | null = null
    setDoc(null)
    // isEvalSupported: false——CSP 禁 unsafe-eval，显式关掉 pdfjs 的 eval 快路径
    const task = getDocument({ url: fileUrl, isEvalSupported: false })
    task.promise
      .then((loaded) => {
        if (!cancelled) {
          // 页数随文档就绪上报（先于 setDoc，父组件可同步置 totalPages 供首帧渲染）
          onDocInfoRef.current?.({ numPages: loaded.numPages })
          onDocReadyRef.current?.(loaded)
          registerPaperDoc(paperId, loaded); registered = loaded
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
      if (registered !== null) unregisterPaperDoc(paperId, registered)
      // loadingTask 拥有 document：destroy 对"加载中"是中止、对"已加载"是销毁
      void task.destroy().catch(() => undefined)
    }
  }, [fileUrl])

  if (doc === null) {
    return <div data-pdf-loading="true" />
  }
  return props.children(doc)
}
