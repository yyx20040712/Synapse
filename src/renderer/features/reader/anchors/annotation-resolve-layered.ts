/**
 * [F-A8 门2] annotation-resolve-layered —— 标注重锚三层编排域（Annotation/
 * AiAnnotationLayer 共形消费；设计书 docs/design/2026-09-04_f-seam-reanchor-design.md
 * §1.1 态空间+主控终裁 CR1/CR3+增补节门 2 放行基准）。
 *
 * ── 行为层（S0~S6 状态机，每页一次编排）──
 * - S0：entry=usePageItemsStore 页项条目（消费方 react 订阅传入——CR1 store
 *   晚于 textLayer 就绪竞态由订阅兜底；CR3 resolve 取数以当前 page prop 为键
 *   pages[page+1]，文档切换=store clear 重填，无旧文档命中）；
 * - S1：reconcileItemsWithDom(items, fullTextOf(textLayer))——textLayer 已在场
 *   时对账；失败 → warn 不静默+S4；
 * - S2/S3a：对账通过 → resolveAnnotationRectsItem（门 0 纯域版）产物标
 *   source='item'（项几何族主链——消 R1 跨族配对）；
 * - S3b：主链条目缺席（verifyQuoteItem 失败/他页/空引文）→ 接线层回退存量
 *   rects+bandsNearRects（消费方现状推导式，语义逐位保持）；
 * - S4：页级回退=resolveAnnotationRectsDom（改名件函数体零改——INV-47 数值
 *   面不动）产物标 source='dom'（仅显示不回写=INV-60）；
 * - S6：S4 产物经 selectionHealth 判定（healthDom 口径——门 1 取证三形态，
 *   scripts/audits/f-a8-gate1-diag.mjs :339）unhealthy → 抑制 DOM 产物显示
 *   （Annotation=缺席回退存量；AI=该段不渲染）+warn 单源（本模块 warn 一处）。
 *   名实声明（门一 W1）：S6 触发=项盒健康代理——blocks 经 clamp01×base 反推
 *   构造恒落盒内，unhealthy 实由 boxes[项几何]越界触发；项盒健康而 DOM 链
 *   独立病理时 S6 不拦（门 3 随回退层去留复核）。
 *
 * ── 接口层 ── / ── 架构层 ── / ── 生命周期层 ──
 * - export function resolveAnnotationRectsLayered（Annotation 版——
 *   AnnotationLayer 消费）/ resolveAiNotesLayered（AI 段版——AiAnnotationLayer
 *   消费，S3b=不渲染语义）/ domProductSuppressed（S6 判定共享单源）；
 * - 依赖单向：本模块→annotation-resolve/anchor-serialize/annotation-anchor/
 *   pdf-item-geometry/page-items.store（零环）；DOM 只读（fullTextOf 文本遍历
 *   仍唯经 annotation-anchor 契约）；
 * - resolve 每次现读现算不缓存（MutationObserver+rAF 合并节奏随宿主——
 *   F-A1 起不变；项几何缩放不变=zoom 随 store 条目 box 反推）。
 *
 * ── 文化层 ──
 * - tests/unit/renderer/annotation-layer.test.tsx F-A8 门2 describe（挂载级
 *   S0/S1/S2/S3b/S6/CR1 竞态 fixture+域标记断言）+ ai-annotation-layer.test.tsx
 *   同构 describe；门 1 取证 G2 分离度=弱式可复现在案（健康 0/20 误伤+病理
 *   2/15 触发——S6 保留+盲区登记，f-a8-gate1-impl.report.md §c）。
 */
import type { AiNote } from '@shared/models/ai-note'
import type { Annotation, AnnotationRect } from '@shared/models/annotation'
import { verifyQuote, verifyQuoteItem } from './anchor-serialize'
import { findRangeAtOffset, fullTextOf, pixelBoxOf } from './annotation-anchor'
import {
  resolveAnnotationRectsDom,
  resolveAnnotationRectsItem,
  itemViewportOf,
  bandsForTextNodes,
  type ResolvedAnnotation,
  type RowBand
} from './annotation-resolve'
import { calibrateBands, spanBoxesOf } from './annotation-band-calibrate'
import {
  itemSelectionGeometry,
  reconcileItemsWithDom,
  rectsForOffsetRange,
  selectionHealth
} from './pdf-item-geometry'
import type { PageItemEntry } from './page-items.store'

/** warn 单源（S1 对账失败/S6 病理抑制两格——不静默先例，前缀统一可检索） */
function warn(message: string): void {
  console.warn(`[F-A8] ${message}`)
}

/** ResolvedAnnotation 产物统一标域（新对象不改下层函数返回——两下层零改） */
function markSource(
  next: Record<string, ResolvedAnnotation>,
  source: 'item' | 'dom'
): Record<string, ResolvedAnnotation> {
  const out: Record<string, ResolvedAnnotation> = {}
  for (const [id, v] of Object.entries(next)) {
    out[id] = { ...v, source }
  }
  return out
}

/** S6 病理抑制判定（Annotation/AI 两消费方共享单源）：S4 DOM 回退产物经
 *  selectionHealth 检验（healthDom 口径——boxes=项几何 rectsForOffsetRange 该
 *  引文区间项盒，blocks=DOM 产物转 px（归一化域×entry.box 宽高）；base=entry
 *  盒——盒本地帧，只消费宽高）。unhealthy → true+warn（抑制 DOM 产物显示）；
 *  无判定材料（verifyQuoteItem null/项盒空/viewport 退化）→ false（保 S5——
 *  S0 缺席路径本函数不被调）。
 *  已知边界：DOM 产物经 clamp01 归一化（越界截断），反推 px 后右溢支路
 *  ≈恒 0——rightOverflowPx 判定弱化为不可观测（s1rot 右溢 3.2px 形态不拦，
 *  门 1 档在案）；outsideRatio 支路完整有效（s2crop 50~100% 盒外形态拦截）。 */
export function domProductSuppressed(
  entry: PageItemEntry,
  sel: { prefix: string; quote: string; suffix: string; start: number },
  domRects: AnnotationRect[]
): boolean {
  const viewport = itemViewportOf(entry)
  if (!Number.isFinite(viewport.scale) || viewport.scale <= 0) {
    return false
  }
  const at = verifyQuoteItem(entry.text.items, sel)
  if (at === null) {
    return false
  }
  const { boxes } = rectsForOffsetRange(entry.text.items, entry.text.styles, viewport, at, at + sel.quote.length)
  if (boxes.length === 0) {
    return false
  }
  const base = { x: 0, y: 0, w: entry.box.w, h: entry.box.h }
  const blocks = domRects.map((r) => ({ x: r.x * base.w, y: r.y * base.h, w: r.w * base.w, h: r.h * base.h }))
  const health = selectionHealth(boxes, blocks, base)
  if (!health.unhealthy) {
    return false
  }
  warn(
    `S6 病理抑制：DOM 回退产物 selectionHealth unhealthy（outsideRatio=${health.outsideRatio.toFixed(3)}, rightOverflowPx=${health.rightOverflowPx.toFixed(1)}）——抑制显示`
  )
  return true
}

/** 三层编排（Annotation 版——AnnotationLayer resolve 闭包消费）：
 *  产物 Record<id, ResolvedAnnotation>（source 域标记随行）；缺席条目由消费方
 *  回退存量 rects+bandsNearRects（S3b/S6 同路径，现状推导式零改）。 */
export function resolveAnnotationRectsLayered(args: {
  textLayer: HTMLElement
  annotations: Annotation[]
  page: number
  entry: PageItemEntry | null
}): Record<string, ResolvedAnnotation> {
  const { textLayer, annotations, page, entry } = args
  if (entry !== null && reconcileItemsWithDom(entry.text.items, fullTextOf(textLayer))) {
    // [F-A9] 标注带垂直几何渲染时刻校准（方案 A——DOM span 盒实测一次共享逐条
    // 匹配；量测退化/窗不命中=派生 band 原样——underline 低位切字消）
    const base = { x: 0, y: 0, w: entry.box.w, h: entry.box.h }
    const spans = spanBoxesOf(textLayer)
    const item = resolveAnnotationRectsItem(entry, annotations, page)
    const calibrated: Record<string, ResolvedAnnotation> = {}
    for (const [id, v] of Object.entries(item)) {
      calibrated[id] = { ...v, bands: spans === null ? v.bands : calibrateBands(spans, v.bands, base) }
    }
    return markSource(calibrated, 'item')
  }
  if (entry !== null) {
    warn(`第 ${page + 1} 页 items/DOM 文本对账失败——S4 DOM 回退层接管`)
  }
  const domNext = resolveAnnotationRectsDom({ textLayer, annotations, page })
  if (entry === null) {
    return markSource(domNext, 'dom')
  }
  for (const a of annotations) {
    const dom = domNext[a.id]
    if (dom === undefined) {
      continue
    }
    if (
      domProductSuppressed(entry, { prefix: a.prefixText, quote: a.quoteText, suffix: a.suffixText, start: a.startOffset }, dom.rects)
    ) {
      delete domNext[a.id]
    }
  }
  return markSource(domNext, 'dom')
}

/** AI 段编排产物（rects/bands 按原消费方缓存形分键+source 域标记随行） */
export interface LayeredAiResolve {
  rects: Record<string, AnnotationRect[]>
  bands: Record<string, RowBand[]>
  source: Record<string, 'item' | 'dom'>
}

/** 三层编排（AI 段版——AiAnnotationLayer resolve 闭包消费；与 Annotation 版
 *  共形）：S1 通过 → 项几何主链（verifyQuoteItem start:0 漂移重定位——AI 行
 *  无 startOffset；S3b=该段不渲染，AI 无存量可回退）；S1 失败/entry 缺席 →
 *  S4 DOM 链（verifyQuote→findRangeAtOffset+bandsForTextNodes——原组件循环
 *  迁入零改）+S6 抑制（同判定单源，抑制=不渲染）。 */
export function resolveAiNotesLayered(args: {
  textLayer: HTMLElement
  notes: AiNote[]
  page: number
  entry: PageItemEntry | null
}): LayeredAiResolve {
  const { textLayer, notes, page, entry } = args
  const out: LayeredAiResolve = { rects: {}, bands: {}, source: {} }
  // viewport 退化案由与对账失败分案（门一 N1：对账已通过但 scale≤0 落 DOM 链
  // ≠对账失败——AI 无存量可回退故降 DOM 链兜底；Annotation 版同因落 S3b）
  let viewportDegraded = false
  if (entry !== null && reconcileItemsWithDom(entry.text.items, fullTextOf(textLayer))) {
    const viewport = itemViewportOf(entry)
    if (Number.isFinite(viewport.scale) && viewport.scale > 0) {
      const base = { x: 0, y: 0, w: entry.box.w, h: entry.box.h }
      // [F-A9] AI 段带渲染时刻校准材料（DOM span 盒一次量测——逐段共享）
      const spans = spanBoxesOf(textLayer)
      for (const n of notes) {
        if (n.quoteText.length === 0) {
          continue
        }
        const at = verifyQuoteItem(entry.text.items, {
          prefix: n.prefixText,
          quote: n.quoteText,
          suffix: n.suffixText,
          start: 0
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
            end: at + n.quoteText.length,
            base
          })
          if (geo !== null) {
            out.rects[n.id] = geo.rects
            out.bands[n.id] = spans === null ? geo.bands : calibrateBands(spans, geo.bands, base)
            out.source[n.id] = 'item'
          }
        } catch {
          // 畸形 rotate 等计算异常——该段缺席（selection 快路径 itemChainFor 同款 try 先例）
        }
      }
      return out
    }
    viewportDegraded = true
  }
  if (entry !== null) {
    warn(
      viewportDegraded
        ? `第 ${page + 1} 页 viewport 退化（scale≤0）——S4 DOM 回退层接管（AI 段）`
        : `第 ${page + 1} 页 items/DOM 文本对账失败——S4 DOM 回退层接管（AI 段）`
    )
  }
  const base = pixelBoxOf(textLayer)
  for (const n of notes) {
    const at = verifyQuote(textLayer, { prefix: n.prefixText, quote: n.quoteText, suffix: n.suffixText, start: 0 })
    if (at === null) {
      continue
    }
    const range = findRangeAtOffset(textLayer, at, at + n.quoteText.length)
    if (range === null || range.rects.length === 0) {
      continue
    }
    if (entry !== null && domProductSuppressed(entry, { prefix: n.prefixText, quote: n.quoteText, suffix: n.suffixText, start: 0 }, range.rects)) {
      continue
    }
    // [F-A5 b] 节点口径带：引文自身 textNodes→bandsForTextNodes（绑定不经几何
    // 匹配——免疫 CSS 行盒整体偏移错绑上一行）
    out.rects[n.id] = range.rects
    out.bands[n.id] = bandsForTextNodes(range.textNodes.map((t) => t.node), base)
    out.source[n.id] = 'dom'
  }
  return out
}
