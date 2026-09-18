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
 *     pageWidth: number; pageHeight: number; geometry: PdfPageGeometry }
 * - export function TextLayer(props: TextLayerProps): JSX.Element
 * - export function duckViewport(scale, rotate, view): PageViewport（纯函数导出供直测）
 * - export function rotatedContainerBox(rotate, pageWidth, pageHeight): ContainerBox（同上）
 * - textContent 为 PdfCanvas 回调的完整载荷（items + styles + lang）：TextLayer 按
 *   fontName 查 styles 无回退，styles 必须真实传自 getTextContent（集成期实证）
 * - geometry 必填（F-A6-b1：缺省即 bug 面——rotation/rawDims 无回退默认值）
 *
 * ── 架构层 ──
 * - pdfjs-dist import 白名单三文件之一（INV-16：PdfCanvas/TextLayer/CorpusExtractor）
 *   ——文本层 API 与官方 CSS 的消费点
 *
 * ── 生命周期层 ── / ── 文化层 ──
 * - 与 PdfCanvas 同批实现；e2e 断言"文字可选中"（tests/e2e/reader-text.spec.ts，
 *   随阅读器页面组装完成激活）
 */
import { useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import { TextLayer as PdfJsTextLayer, type PageViewport } from 'pdfjs-dist'
import type { PdfPageGeometry, PdfTextContent } from './PdfPageCanvas'
import './text-layer.css'
import { PAGE_LAYER_Z } from '../state/page-layer-z'

export interface TextLayerProps {
  textContent: PdfTextContent
  viewportScale: number
  pageWidth: number
  pageHeight: number
  /** F-A6-b1 T1/T9：页几何（rotate/view）——duckViewport rotation/rawDims 真值源 */
  geometry: PdfPageGeometry
}

/**
 * v4 的 TextLayer 类要求 PageViewport 实例，但 PageViewport 类不从主入口导出
 * （运行时实测 undefined；d.ts 仅导出类型）。类内部只读取 scale / rotation /
 * rawDims 三个成员（4.10.38 源码核对，F-A6-b1 复核仍成立：构造器 #scale=scale×
 * devicePixelRatio、#rotation=rotation（update 重排+setLayerDimensions 写容器
 * data-main-rotation）、rawDims→#transform=[1,0,0,-1,-pageX,pageY+pageHeight]+
 * span 位置百分比分母；PageViewport.rawDims getter 语义=view 跨度×userUnit——
 * 本仓 userUnit=1 全档成立，见 PdfPageGeometry 已知边界注）。
 *
 * F-A6-b1（T1/T9 前置修复，依据 f-a6-forensic-verdict §2/§5 阶段 1）：
 * - rotation=geometry.rotate 真值（原硬编码 0——/Rotate≠0 页文本层与 canvas 墨带
 *   错位，合成 S1 实证 outside 5/8 span 落盒外）；
 * - rawDims=geometry.view 真值（原硬编码 pageX:0/pageY:0——CropBox 原点≠0 页整体
 *   平移 x+36.01/y−37.40px，合成 S2 实证）。原「页旋转 v1 不支持」局限解除。
 * 纯函数（数学域）导出供单测直测（tests/unit/renderer/text-layer.test.tsx）。
 */
export function duckViewport(scale: number, rotate: number, view: [number, number, number, number]): PageViewport {
  return {
    scale,
    rotation: rotate,
    rawDims: {
      pageWidth: view[2] - view[0],
      pageHeight: view[3] - view[1],
      pageX: view[0],
      pageY: view[1]
    }
  } as unknown as PageViewport
}

/** rotatedContainerBox 产物：容器 CSS 盒（90/270 带变换） */
export interface ContainerBox {
  width: number
  height: number
  transform?: string
}

/**
 * 旋转页容器盒（F-A6-b1 T1）：pdf.js TextLayer 的 span 位置恒为【未旋转用户空间】
 * 百分比（#appendText 数学不含页旋转），页旋转由容器 CSS 变换承担——官方
 * pdf_viewer.css:3104-3112 通用规则 [data-main-rotation="90"]{transform:
 * rotate(90deg) translateY(-100%)} 等（setLayerDimensions 已把 data-main-rotation
 * 写上容器，但 repo 的 text-layer.css 只提取了 .textLayer 系规则、该通用属性
 * 选择器规则无消费者——故在此内联等价变换，不动受锁 CSS 提取面）。
 * pageWidth/pageHeight=旋转后 canvas CSS 盒（挂载方量测）：90/270 交换还原未旋转
 * 盒（旋转后恰覆盖 canvas 盒——与 PageViewport 构造器旋转分支的宽高互换一致）；
 * 0 零行为变（46 页真实库形态）。纯函数导出供单测直测。
 */
export function rotatedContainerBox(rotate: number, pageWidth: number, pageHeight: number): ContainerBox {
  const rot = ((rotate % 360) + 360) % 360
  if (rot === 90) {
    return { width: pageHeight, height: pageWidth, transform: 'rotate(90deg) translateY(-100%)' }
  }
  if (rot === 180) {
    return { width: pageWidth, height: pageHeight, transform: 'rotate(180deg) translate(-100%, -100%)' }
  }
  if (rot === 270) {
    return { width: pageHeight, height: pageWidth, transform: 'rotate(270deg) translateX(-100%)' }
  }
  return { width: pageWidth, height: pageHeight }
}

export function TextLayer(props: TextLayerProps): JSX.Element {
  const { textContent, viewportScale, pageWidth, pageHeight, geometry } = props
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
      // 自造空 styles 会让首个文本项崩——集成期实证（载荷不含 geometry——
      // textContentSource 不得加非 TextContent 字段，防 pdf.js 兼容面）
      textContentSource: textContent,
      container,
      viewport: duckViewport(viewportScale, geometry.rotate, geometry.view)
    })
    // props 变化/卸载 → cancel() 令 render() 拒绝属正常控制流；其余失败仅损失
    // 文本选择能力（canvas 阅读不受影响），本组件 props 契约无错误通道——
    // 降级但留 console 供排查（曾因缺 styles 全静默，靠 e2e 20s 超时才发现）
    void layer.render().catch((err: unknown) => {
      console.error('[TextLayer] 渲染失败：', err)
    })
    return () => layer.cancel()
  }, [textContent, viewportScale, pageWidth, pageHeight, geometry])

  // --scale-factor 供官方 CSS 的 span 字号 calc 使用（动态注入——C-4c 白名单
  // DYNAMIC_TOKENS 登记 scripts/check-quality.mjs）；宽高=canvas CSS 盒同源量测
  // （inset:0 之上再显式给定，确保与页面盒对齐）；旋转页（90/270）由
  // rotatedContainerBox 交换为未旋转盒并施加官方等价变换（T1——span 百分比
  // 数学在未旋转空间，容器变换负责与旋转后 canvas 对齐）
  // zIndex=层序常量单源显式化（与官方 css z0 同值——序防漂移，F-A5 c）
  const box = rotatedContainerBox(geometry.rotate, pageWidth, pageHeight)
  const style = {
    width: `${box.width}px`,
    height: `${box.height}px`,
    zIndex: PAGE_LAYER_Z.text,
    '--scale-factor': String(viewportScale),
    ...(box.transform !== undefined ? { transform: box.transform } : {})
  } as CSSProperties

  return <div ref={containerRef} className="textLayer" style={style} />
}
