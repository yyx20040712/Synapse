/**
 * [F-A4] annotation-resolve —— 标注渲染重锚与行盒自适应域（自 AnnotationLayer
 * 拆出——组件 ≤250 行红线预裁；票面 §3 拆件结构）。
 *
 * ── 行为层 ──
 * - resolveAnnotationRectsDom [F-A8 门2 改名]：verifyQuote 校正偏移（自愈排版
 *   漂移）→ findRangeAtOffset 重算 rects——原 resolveAnnotationRects 整体改名
 *   降为 S4 页级回退层（**函数体零改**=INV-47 数值面不动，受锁断言锚）；
 *   三层编排（项几何主链→本 DOM 回退→存量兜底）见 annotation-resolve-layered；
 * - resolveAnnotationRectsItem [F-A8 门0]：重锚纯域版（项几何族）——
 *   entry（page-items.store 页项）+annotations → verifyQuoteItem 逐条对账
 *   校偏 → itemSelectionGeometry 产 {rects,bands}；entry null→{}、失败条目
 *   缺席（S3b 语义=接线层回退存量，纯函数只缺席）。门 2 接线前零消费方
 *   （门 0=纯函数域前置票）；
 * - [F-A4 b②] 行盒自适应字形带：重锚 range.textNodes 的 span 实测盒
 *   （gBCR）+canvas 字体度量（measureText 的 actualBoundingBox Ascent/
 *   Descent=墨带实界+fontBoundingBox=回退字体布局带）→ 推算字形带
 *   [字形顶, 基线+descender 尾]（归一化域）——rectStyle band 消费（顶贴
 *   字形顶缘底贴底缘）。无 canvas 2d/度量缺字段（jsdom）→ 空 bands，
 *   渲染回退 F-11 分数路径（缺省兼容）。
 * - [F-A5 a/b] band 单源三消费点：①自绘选区（SelectionLayer evaluate→
 *   SelectionPaint）②标注存量回退（AnnotationLayer 重锚失败路径）③AI 段
 *   （AiAnnotationLayer）经 **bandsNearRects**（rect 集→重叠 span 行簇带）
 *   消费同一 span→带核心（bandFromMetrics+同行近并）——与重锚路径同基准
 *   （票面 §1「行簇字形带推导单源」）。其中自绘选区/AI 段走**节点口径**
 *   bandsForTextNodes（选区/引文自身的 textNodes——免疫 CSS 行盒整体偏移，
 *   真机实锤：小字号紧排文档行盒偏上 ~9px 使几何匹配错绑上一行）；存量
 *   rects 回退（重锚失败无节点可依）走几何口径 bandsNearRects 尽力而为。
 *   RowBand 增 x0/x1（行簇 span 实际端点——a 面自绘块水平界夹取源）。
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
 * - 性能：量测只发生在与输入 rects 重叠的 span 上（gBCR 预筛——拖选节流
 *   200ms 周期内 ~页级行簇量级）；MutationObserver+rAF 合并节奏随宿主
 *   （F-A1 起不变）。
 *
 * ── 文化层 ──
 * - tests/unit/renderer/selection-paint.test.tsx（bandFromMetrics 纯几何+
 *   AnnotationLayer 挂 B 接线）+ F-A5 段（bandsNearRects 三消费点）。
 */
import type { Annotation, AnnotationRect } from '@shared/models/annotation'
import { verifyQuote, verifyQuoteItem } from './anchor-serialize'
import { findRangeAtOffset, pixelBoxOf, type PixelBox } from './annotation-anchor'
import { itemSelectionGeometry, type ItemViewport } from './pdf-item-geometry'
import type { PageItemEntry } from './page-items.store'

/** 行簇字形带（归一化域；center=带中心——渲染块匹配键；x0/x1=行簇 span
 *  实际端点——F-A5 a 面自绘块水平界夹取源，缺省=该带无端点量测；
 *  calTop/calBottom [F-A9]=渲染时刻 textLayer span 盒实测校准值（方案 A
 *  ——annotation-band-calibrate 注入；缺省=无校准材料回退派生值） */
export interface RowBand {
  top: number
  bottom: number
  center: number
  x0?: number
  x1?: number
  calTop?: number
  calBottom?: number
}

/** 重锚结果（id → { rects, bands, source }；缺项回退存量 rects 由消费方兜底）。
 *  source [F-A8 门2]=产物域标记（'item'=项几何主链 / 'dom'=S4 DOM 回退层）——
 *  INV-60 显示覆盖语义锚：运行时调试面+单测断言面，不入库（渲染样式零差）。 */
export interface ResolvedAnnotation {
  rects: AnnotationRect[]
  bands: RowBand[]
  source?: 'item' | 'dom'
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

/** 渲染块 → 最近中心带（|Δcenter| ≤ rect.h 才匹配；bands 空→undefined；
 *  返回含 x0/x1（在场时）——F-A5 a 面自绘块水平界夹取源。
 *  [F-A9] cal 域在场 → 返回 top/bottom 替换为校准值（渲染时刻 DOM span 校准
 *  ——annotation-band-calibrate 注入；**匹配仍按派生 center**——校准位移不
 *  参与行归属判定=错绑零风险；cal 缺席 → 派生值原样=回退语义零变） */
export function matchBand(bands: RowBand[] | undefined, r: AnnotationRect): { top: number; bottom: number; x0?: number; x1?: number } | undefined {
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
    ? { top: best.calTop ?? best.top, bottom: best.calBottom ?? best.bottom, x0: best.x0, x1: best.x1 }
    : undefined
}

/** canvas 2d 量测上下文（模块级缓存——只缓存成功获取：jsdom 未 mock 面
 *  返回 null 不入缓存，量测环境就绪（测试 mock 挂上）后下次调用重试） */
let ctxCache: CanvasRenderingContext2D | null | undefined

function measureContext(): CanvasRenderingContext2D | null {
  if (ctxCache === undefined) {
    try {
      const c = document.createElement('canvas').getContext('2d')
      if (c !== null) {
        ctxCache = c
      }
    } catch {
      // 无 canvas 环境——不缓存失败（重试廉价：纯查询）
    }
  }
  return ctxCache ?? null
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

/** span → 行簇带（F-A5 单源核心：实测盒+canvas 字体度量→字形带+span 端点；
 *  无量测（jsdom 桩面盒高兜 1）/退化 → null） */
function spanBandOf(ctx: CanvasRenderingContext2D, el: Element, text: string, base: PixelBox): RowBand | null {
  const box = pixelBoxOf(el)
  if (box.h <= 1) {
    return null // 无布局量测（jsdom 桩面 h 兜 1）——渲染回退分数路径
  }
  const band = bandFromMetrics(box, fontSizeOf(el, box), metricsOf(ctx, el, text), base)
  if (band === null) {
    return null
  }
  return { ...band, x0: (box.x - base.x) / base.w, x1: (box.x + box.w - base.x) / base.w }
}

/** 同行近并：中心距在带高内并为一带（行簇单带；x0/x1 取并集端点——F-A5） */
function mergeNear(bands: RowBand[], band: RowBand): void {
  const near = bands.find((b) => Math.abs(b.center - band.center) <= band.bottom - band.top)
  if (near === undefined) {
    bands.push(band)
  } else {
    near.x0 = Math.min(near.x0 ?? band.x0 ?? Number.POSITIVE_INFINITY, band.x0 ?? Number.POSITIVE_INFINITY)
    near.x1 = Math.max(near.x1 ?? band.x1 ?? Number.NEGATIVE_INFINITY, band.x1 ?? Number.NEGATIVE_INFINITY)
  }
}

/** [F-A5 b 定向修] textNodes → 行簇字形带（**节点口径**——带绑定不经几何
 *  匹配，免疫 CSS 行盒整体偏移：真机实锤小字号紧排文档上 Range 行盒比
 *  pdf.js span 盒整体高 ~9px，几何最近中心会把带绑到上一行=图2 下偏根因。
 *  消费方：标注重锚（resolveAnnotationRects）+自绘选区（SelectionLayer
 *  evaluate）+AI 段（AiAnnotationLayer resolve）；span 去重+同带合并；
 *  无 canvas/量测退化（jsdom）→ []） */
export function bandsForTextNodes(nodes: Text[], base: PixelBox): RowBand[] {
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
    const band = spanBandOf(ctx, el, n.data, base)
    if (band === null) {
      continue
    }
    mergeNear(bands, band)
  }
  return bands
}

/** [F-A5] rect 集 → 行簇字形带（三消费点公共面：自绘选区/标注存量回退/AI 段）。
 *  只量测与任一 rect（归一化域→px 域）双向重叠的 span（gBCR 预筛——拖选节流
 *  周期内成本=选区行簇量级）；基准=textLayer 盒（rects 归一化同源）。
 *  无 canvas/无量测 span（jsdom）→ []（消费方回退原样/F-11 分数）。 */
export function bandsNearRects(textLayer: HTMLElement, rects: AnnotationRect[]): RowBand[] {
  if (rects.length === 0) {
    return []
  }
  const ctx = measureContext()
  if (ctx === null) {
    return []
  }
  const base = pixelBoxOf(textLayer)
  if (base.h <= 1) {
    return []
  }
  const pxRects = rects.map((r) => ({
    x: r.x * base.w + base.x,
    y: r.y * base.h + base.y,
    w: r.w * base.w,
    h: r.h * base.h
  }))
  const bands: RowBand[] = []
  for (const span of Array.from(textLayer.querySelectorAll('span'))) {
    const g = span.getBoundingClientRect()
    if (g.height <= 1 || g.width <= 1) {
      continue
    }
    const overlaps = pxRects.some(
      (p) => g.y + g.height > p.y && g.y < p.y + p.h && g.x + g.width > p.x && g.x < p.x + p.w
    )
    if (!overlaps) {
      continue
    }
    const band = spanBandOf(ctx, span, span.textContent ?? '', base)
    if (band === null) {
      continue
    }
    mergeNear(bands, band)
  }
  return bands
}

/** 重锚+行盒自适应（S4 DOM 回退层——F-A8 门2 前为重锚主链；函数体零改） */
export function resolveAnnotationRectsDom(args: {
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
        bands: bandsForTextNodes(range.textNodes.map((t) => t.node), base)
      }
    }
  }
  return next
}

/**
 * [F-A8 门0] 重锚纯域版（项几何族——S0–S3b 状态机的纯函数核，设计书
 * docs/design/2026-09-04_f-seam-reanchor-design.md §1.1/§3）：
 * - S0：entry null → {}（页项缺席——接线层走 DOM 回退链，纯函数不编排回退）；
 * - S1 DOM 对账=门 2 接线面（接线时有 textLayer DOM 可对账），本域 entry
 *   信任=store 写者唯一性（PagesOverlay handlePageRender 回报——写者契约在
 *   page-items.store 头注）；
 * - S2：逐条 verifyQuoteItem 校正偏移（textQuote 自愈——与 DOM 版同核
 *   locateQuote 单源）→ itemSelectionGeometry 产 {rects,bands}（归一化数学
 *   直复用 selection 链管线导出面，禁第二份归一化实现）；
 * - S3b：对账失败/空串引文/他页条目 → 该条缺席（接线层回退存量，纯函数只
 *   缺席）；计算异常（畸形 rotate/几何非有限）逐条 try 缺席（selection 快
 *   路径 itemChainFor 同款 try 先例）。
 * viewport 现构=selection 快路径同款数学（rotate/view 来自 entry.geometry，
 * 调用即构不缓存——缩放不变）；scale 自 entry.box 反推（box=PdfPageCanvas
 * clampScale(zoom) 渲染的 canvas CSS 盒回报——PagesOverlay 写者契约，反推值
 * =夹取后真值；水平轴 scale/base 严格约除消取整差；垂直轴依赖 box 宽高比
 * ≈view 跨度比，有界 ~1px 级相对残差=同族精度带内[门一 W3 口径]）。base
 * 盒本地帧（itemSelectionGeometry 头注：归一化只消费盒宽高，原点不参与）。
 */
export function resolveAnnotationRectsItem(
  entry: PageItemEntry | null,
  annotations: Annotation[],
  page: number
): Record<string, ResolvedAnnotation> {
  if (entry === null) {
    return {}
  }
  const viewport = itemViewportOf(entry)
  if (!Number.isFinite(viewport.scale) || viewport.scale <= 0) {
    return {}
  }
  const base: PixelBox = { x: 0, y: 0, w: entry.box.w, h: entry.box.h }
  const next: Record<string, ResolvedAnnotation> = {}
  for (const a of annotations) {
    if (a.page !== page || a.quoteText.length === 0) {
      continue
    }
    const at = verifyQuoteItem(entry.text.items, {
      prefix: a.prefixText,
      quote: a.quoteText,
      suffix: a.suffixText,
      start: a.startOffset
    })
    if (at === null) {
      continue
    }
    try {
      const geo = itemSelectionGeometry({
        items: entry.text.items,
        styles: entry.text.styles,
        viewport,
        start: at,
        end: at + a.quoteText.length,
        base
      })
      if (geo !== null) {
        next[a.id] = { rects: geo.rects, bands: geo.bands }
      }
    } catch {
      // 畸形 rotate 等计算异常——该条缺席（S3b 同判据，快路径 try 先例）
    }
  }
  return next
}

/** 页项条目 → viewport（rotate=90/270 时 canvas 宽对应 view 高——宽高互换；
 *  box 反推 scale=Math.round 后 CSS 盒/跨度，与 clampScale(zoom) 真值差 <1px
 *  取整粒度——水平轴（宽）scale/base 严格约除消取整差；垂直轴依赖 box 宽高
 *  比≈view 跨度比，有界 ~1px 级相对残差=同族精度带内[门一 W3 口径]）。
 *  [F-A8 门2] 导出：AI 段编排（annotation-resolve-layered）同源消费 */
export function itemViewportOf(entry: PageItemEntry): ItemViewport {
  const [x0, y0, x1, y1] = entry.geometry.view
  const rot = ((entry.geometry.rotate % 360) + 360) % 360
  const domWidth = rot === 90 || rot === 270 ? y1 - y0 : x1 - x0
  return {
    scale: domWidth > 0 ? entry.box.w / domWidth : Number.NaN,
    rotate: entry.geometry.rotate,
    view: entry.geometry.view
  }
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
