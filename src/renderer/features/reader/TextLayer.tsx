/**
 * [SR-RDR-03] TextLayer —— 官方文本层接线（工单：done / strong，Phase 3）
 *
 * ── 行为层 ──
 * - 用 pdf.js v4 的 TextLayer 类（renderTextLayer 的新形态：构造
 *   { textContentSource, container, viewport } → render()）生成可选中文本层
 * - 引入官方 pdf_viewer.css 的文本层样式（含 --scale-factor 变量设置——
 *   v4/v5 的已知坑：span 字号是 calc(var(--scale-factor)*Npx)，不设变量文字
 *   不可选/错位，教训里 Synapse 踩过）；本仓库以 text-layer.css 承载提取版
 * - 容器绝对定位于 canvas 之上，pointer-events 仅文本命中（span cursor:text
 *   承担文本命中，透明非文本区不参与视觉——官方 CSS 语义）
 *
 * ── 接口层 ──
 * - export interface TextLayerProps { textContent: PdfTextContent; viewportScale: number;
 *     pageWidth: number; pageHeight: number }
 * - export function TextLayer(props: TextLayerProps): JSX.Element
 * - textContent 为 PdfCanvas 回调的完整载荷（items + styles + lang）：TextLayer 按
 *   fontName 查 styles 无回退，styles 必须真实传自 getTextContent（集成期实证）
 *
 * ── 架构层 ──
 * - 唯一允许 import pdfjs-dist 文本层 API 与官方 CSS 的文件
 *
 * ── 生命周期层 ── / ── 文化层 ──
 * - 与 PdfCanvas 同批实现；e2e 断言"文字可选中"（tests/e2e/reader-text.spec.ts，
 *   随阅读器页面组装完成激活）
 */
import { useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import { TextLayer as PdfJsTextLayer, type PageViewport } from 'pdfjs-dist'
import type { PdfTextContent } from './PdfCanvas'
import './text-layer.css'

export interface TextLayerProps {
  textContent: PdfTextContent
  viewportScale: number
  pageWidth: number
  pageHeight: number
}

/**
 * v4 的 TextLayer 类要求 PageViewport 实例，但 PageViewport 类不从主入口导出
 * （运行时实测 undefined；d.ts 仅导出类型）。类内部只读取 scale / rotation /
 * rawDims 三个成员（4.10.38 源码核对），props 已含等价信息，按 PDF 用户空间
 * 尺寸重建：pageWidth/pageHeight 是缩放后的 CSS 尺寸，除以 scale 还原原始页尺寸。
 * 局限：页旋转（/Rotate 90/180/270）v1 不支持——props 契约无 rotation 通道
 * （canvas 渲染不受影响，仅文本层对齐失效）；需要时扩展点在此函数的 rotation 字段。
 */
function duckViewport(scale: number, pageWidth: number, pageHeight: number): PageViewport {
  return {
    scale,
    rotation: 0,
    rawDims: {
      pageWidth: pageWidth / scale,
      pageHeight: pageHeight / scale,
      pageX: 0,
      pageY: 0
    }
  } as unknown as PageViewport
}

export function TextLayer(props: TextLayerProps): JSX.Element {
  const { textContent, viewportScale, pageWidth, pageHeight } = props
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (container === null) {
      return
    }
    // 清掉上一次渲染的 span（cancel 不回滚已入 DOM 的节点；StrictMode 双挂载亦靠此去重；
    // 空文本（纯图页）同样要清——否则上一页文字残留可选中）
    container.replaceChildren()
    if (textContent.items.length === 0) {
      return
    }
    const layer = new PdfJsTextLayer({
      // 完整载荷直传（items+styles+lang）：按 fontName 查 styles 无回退，
      // 自造空 styles 会让首个文本项崩——集成期实证
      textContentSource: textContent,
      container,
      viewport: duckViewport(viewportScale, pageWidth, pageHeight)
    })
    // props 变化/卸载 → cancel() 令 render() 拒绝属正常控制流；其余失败仅损失
    // 文本选择能力（canvas 阅读不受影响），本组件 props 契约无错误通道——
    // 降级但留 console 供排查（曾因缺 styles 全静默，靠 e2e 20s 超时才发现）
    void layer.render().catch((err: unknown) => {
      console.error('[TextLayer] 渲染失败：', err)
    })
    return () => layer.cancel()
  }, [textContent, viewportScale, pageWidth, pageHeight])

  // --scale-factor 供官方 CSS 的 span 字号 calc 使用；宽高与 PdfCanvas 的 canvas
  // CSS 尺寸一致（inset:0 之上再显式给定，确保与页面盒对齐）
  const style = {
    width: `${pageWidth}px`,
    height: `${pageHeight}px`,
    '--scale-factor': String(viewportScale)
  } as CSSProperties

  return <div ref={containerRef} className="textLayer" style={style} />
}
