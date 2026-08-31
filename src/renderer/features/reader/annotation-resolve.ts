/**
 * [F-A4] annotation-resolve —— 标注渲染重锚与行盒自适应域（自 AnnotationLayer
 * 拆出——组件 ≤250 行红线预裁；票面 §3 拆件结构）。
 *
 * ── 行为层 ──
 * - resolveAnnotationRects：verifyQuote 校正偏移（自愈排版漂移）→
 *   findRangeAtOffset 重算 rects——逐条等价自 AnnotationLayer 原 resolve
 *   闭包迁出（行为零变：失败回退存量，仅显示层不回写库）；
 * - [F-A4 b②] 行盒自适应字形带：重锚 range.textNodes 的 span 实测盒
 *   （gBCR）+canvas 字体度量（measureText 的 actualBoundingBox Ascent/
 *   Descent=墨带实界+fontBoundingBox=回退字体布局带）→ 推算字形带
 *   [字形顶, 基线+descender 尾]（归一化域）——rectStyle band 消费（顶贴
 *   字形顶缘底贴底缘）。无 canvas 2d/度量缺字段（jsdom）→ 空 bands，
 *   渲染回退 F-11 分数路径（缺省兼容）。
 * - normalizedLineHeight：textLayer span 的 computed font-size 中位数/
 *   textLayer 盒高（挂 B mergeRects 行高感知 lineH——存量 rects 读时归并
 *   同口径；量测退化→undefined 旧行为）。
 * - matchBand：渲染块→最近中心带（|band.center−rect.center| ≤ rect.h 才
 *   匹配——跨行带不误配）。
 *
 * ── 接口层 ── / ── 架构层 ── / ── 生命周期层 ──
 * - 依赖单向：本模块→anchor-serialize/annotation-anchor（零环）；DOM 访问
 *   只读（gBCR/getComputedStyle/canvas 量测），文本遍历仍唯经
 *   annotation-anchor（F-ARCH4 契约保持）；纯几何 bandFromMetrics/
 *   matchBand 单测直测。
 * - 性能：每标注一次 canvas 量测（span 去重后），MutationObserver+rAF
 *   合并节奏随宿主（F-A1 起不变）。
 *
 * ── 文化层 ──
 * - tests/unit/renderer/selection-paint.test.tsx（bandFromMetrics 纯几何+
 *   AnnotationLayer 挂 B 接线）。
 */
import type { Annotation, AnnotationRect } from '@shared/models/annotation'
import { verifyQuote } from './anchor-serialize'
import { findRangeAtOffset, pixelBoxOf, type PixelBox } from './annotation-anchor'

/** 行簇字形带（归一化域；center=带中心——渲染块匹配键） */
export interface RowBand {
  top: number
  bottom: number
  center: number
}

/** 重锚结果（id → { rects, bands }；缺项回退存量 rects 由消费方兜底） */
export interface ResolvedAnnotation {
  rects: AnnotationRect[]
  bands: RowBand[]
}

/** span 字体度量（canvas measureText 产物——墨带实界+回退字体布局带） */
export interface SpanMetrics {
  ascent: number
  descent: number
  fontAscent: number
  fontDescent: number
}

/** 纯几何：span 盒+字号+字体度量+归一化基准 → 字形带。
 *  基线=盒顶+半前导+回退 ascent（半前导=(行盒高 fs−布局带高)/2，**负值合法
 *  不钳 0**——line-height:1 下回退字体内容区（asc+desc）溢出行盒，CSS 把
 *  溢出按负前导对称分布，基线随之下沉；钳 0 会使带整体下偏 ~|半前导|px，
 *  真机 diag-20260831 实锤 +4~5px）；字形带=[基线−墨带 ascent, 基线+墨带
 *  descent]。带高 ≤0/非有限/base 退化 → null。 */
export function bandFromMetrics(
  span: PixelBox,
  fs: number,
  m: SpanMetrics | null,
  base: PixelBox
): RowBand | null {
  if (m === null || base.w <= 0 || base.h <= 0 || !Number.isFinite(fs) || fs <= 0) {
    return null
  }
  const halfLeading = (fs - m.fontAscent - m.fontDescent) / 2
  const baseline = span.y + halfLeading + m.fontAscent
  const top = (baseline - m.ascent - base.y) / base.h
  const bottom = (baseline + m.descent - base.y) / base.h
  if (!Number.isFinite(top) || !Number.isFinite(bottom) || bottom <= top) {
    return null
  }
  return {
    top: Math.min(1, Math.max(0, top)),
    bottom: Math.min(1, Math.max(0, bottom)),
    center: (top + bottom) / 2
  }
}

/** 渲染块 → 最近中心带（|Δcenter| ≤ rect.h 才匹配；bands 空→undefined） */
export function matchBand(bands: RowBand[] | undefined, r: AnnotationRect): { top: number; bottom: number } | undefined {
  if (bands === undefined || bands.length === 0) {
    return undefined
  }
  const c = r.y + r.h / 2
  let best: RowBand | null = null
  for (const b of bands) {
    if (best === null || Math.abs(b.center - c) < Math.abs(best.center - c)) {
      best = b
    }
  }
  return best !== null && Math.abs(best.center - c) <= r.h
    ? { top: best.top, bottom: best.bottom }
    : undefined
}

/** canvas 2d 量测上下文（模块级缓存；无 canvas 环境→null） */
let ctxCache: CanvasRenderingContext2D | null | undefined

function measureContext(): CanvasRenderingContext2D | null {
  if (ctxCache === undefined) {
    try {
      ctxCache = document.createElement('canvas').getContext('2d')
    } catch {
      ctxCache = null
    }
  }
  return ctxCache
}

/** span 元素的字体度量（computed font 简写 → canvas measureText）；度量
 *  字段缺/非有限（旧引擎/空文本退化）→ null */
function metricsOf(ctx: CanvasRenderingContext2D, el: Element, text: string): SpanMetrics | null {
  const cs = getComputedStyle(el)
  try {
    ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
    const m = ctx.measureText(text.length > 0 ? text : ' ')
    const out = {
      ascent: m.actualBoundingBoxAscent,
      descent: m.actualBoundingBoxDescent,
      fontAscent: m.fontBoundingBoxAscent,
      fontDescent: m.fontBoundingBoxDescent
    }
    for (const v of Object.values(out)) {
      if (!Number.isFinite(v)) {
        return null
      }
    }
    return out
  } catch {
    return null
  }
}

/** span 字号（computed fontSize px；不可解析→盒高代理——「以行簇 span 实测
 *  盒为基准」的兜底口径） */
function fontSizeOf(el: Element, box: PixelBox): number {
  const px = parseFloat(getComputedStyle(el).fontSize)
  return Number.isFinite(px) && px > 0 ? px : box.h
}

/** 重锚 textNodes → 行簇字形带（span 去重+同带合并；无 canvas/量测退化→[]） */
function bandsForNodes(nodes: Text[], base: PixelBox): RowBand[] {
  const ctx = measureContext()
  if (ctx === null) {
    return []
  }
  const bands: RowBand[] = []
  const seen = new Set<Element>()
  for (const n of nodes) {
    const el = n.parentElement
    if (el === null || seen.has(el)) {
      continue
    }
    seen.add(el)
    const box = pixelBoxOf(el)
    if (box.h <= 1) {
      continue // 无布局量测（jsdom 桩面 h 兜 1）——渲染回退分数路径
    }
    const band = bandFromMetrics(box, fontSizeOf(el, box), metricsOf(ctx, el, n.data), base)
    if (band === null) {
      continue
    }
    // 同行多 span：中心距在带高内并为一带（行簇单带）
    const near = bands.find((b) => Math.abs(b.center - band.center) <= band.bottom - band.top)
    if (near === undefined) {
      bands.push(band)
    }
  }
  return bands
}

/** 重锚+行盒自适应（AnnotationLayer 挂 B 宿主调用；逐条等价迁出+band 增量） */
export function resolveAnnotationRects(args: {
  textLayer: HTMLElement
  annotations: Annotation[]
  page: number
}): Record<string, ResolvedAnnotation> {
  const { textLayer, annotations, page } = args
  const next: Record<string, ResolvedAnnotation> = {}
  const base = pixelBoxOf(textLayer)
  for (const a of annotations) {
    if (a.page !== page || a.quoteText.length === 0) {
      continue
    }
    const at = verifyQuote(textLayer, {
      prefix: a.prefixText,
      quote: a.quoteText,
      suffix: a.suffixText,
      start: a.startOffset
    })
    if (at === null) {
      continue
    }
    const range = findRangeAtOffset(textLayer, at, at + a.quoteText.length)
    if (range !== null && range.rects.length > 0) {
      next[a.id] = {
        rects: range.rects,
        bands: bandsForNodes(range.textNodes.map((t) => t.node), base)
      }
    }
  }
  return next
}

/** textLayer 行高（归一化域——挂 B mergeRects lineH；span 字号中位数/盒高）。
 *  量测退化（盒高兜 1 的 jsdom 桩面）→undefined 旧行为。 */
export function normalizedLineHeight(textLayer: HTMLElement): number | undefined {
  const base = pixelBoxOf(textLayer)
  if (base.h <= 1) {
    return undefined
  }
  const sizes: number[] = []
  for (const span of Array.from(textLayer.querySelectorAll('span'))) {
    const px = parseFloat(getComputedStyle(span).fontSize)
    if (Number.isFinite(px) && px > 0) {
      sizes.push(px)
    }
  }
  if (sizes.length === 0) {
    return undefined
  }
  sizes.sort((x, y) => x - y)
  return sizes[Math.floor((sizes.length - 1) / 2)]! / base.h
}
