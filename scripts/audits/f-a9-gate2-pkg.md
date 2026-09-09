# F-A9 门二审包（deepseek 终审）

## 0. 门一（Kimi 5W 实效）处置对照

| finding | 处置 |
| --- | --- |
| B2 变异单薄 | M2 水平窗删臂红+M3 垂直窗删臂红（f-a9-mutation2.raw.txt；门一示例形态（>=/<=0）经查无判别力，同面删臂替代+勘误在档） |
| C2 AI 链消费面未证 | 主控核销：AiAnnotationLayer.tsx:70 import matchBand+pool 消费结构=证据成立 |
| C3 域错配防御无测试 | 补「域错配」「盒退化」两用例+M4 变异证判别力（12/12 绿） |
| C4 紧排边界 | 主控裁留观察（真机页行距 10.45px 免疫+申报在案——观察项入收口简报） |
| C5 性能锚 | 主控裁留观察（同上） |

## 1. 工单（四清单+一）

1. 处置核对：上表 vs 随附终态 diff（mutation2 的删臂形态是否真锁两窗算式）。
2. 母本符合度+宪法红线（几何推导表/行数 cal 域件 119 行/UTF-8）。
3. 测试面：12 用例+变异 M1~M4 判别力；回退四路径覆盖（零 span/零宽/盒退化/域错配）。
4. 机器面：全量 159 文件/1498 用例绿（主控 verify 收口统一跑——并发会话 ABI 竞态排队中，本审基于实现者 raw）；locks 297 条（含 audits mjs 顺登记申报）。
5. 成本账本：实现者两轮 10.16M+4.88M subagent tokens/37.6+8.8min；门一 Kimi in=12729/out=5562。

输出 [B|W|N]+一行总评（可否放行收口——verify 由主控统一补）。

## 2. 终态 diff 全文（三改件+两新件）

diff --git a/src/renderer/features/reader/annotation-resolve-layered.ts b/src/renderer/features/reader/annotation-resolve-layered.ts
index d7826145e5..844a576a90 100644
--- a/src/renderer/features/reader/annotation-resolve-layered.ts
+++ b/src/renderer/features/reader/annotation-resolve-layered.ts
@@ -50,6 +50,7 @@ import {
   type ResolvedAnnotation,
   type RowBand
 } from './annotation-resolve'
+import { calibrateBands, spanBoxesOf } from './annotation-band-calibrate'
 import {
   itemSelectionGeometry,
   reconcileItemsWithDom,
@@ -124,7 +125,16 @@ export function resolveAnnotationRectsLayered(args: {
 }): Record<string, ResolvedAnnotation> {
   const { textLayer, annotations, page, entry } = args
   if (entry !== null && reconcileItemsWithDom(entry.text.items, fullTextOf(textLayer))) {
-    return markSource(resolveAnnotationRectsItem(entry, annotations, page), 'item')
+    // [F-A9] 标注带垂直几何渲染时刻校准（方案 A——DOM span 盒实测一次共享逐条
+    // 匹配；量测退化/窗不命中=派生 band 原样——underline 低位切字消）
+    const base = { x: 0, y: 0, w: entry.box.w, h: entry.box.h }
+    const spans = spanBoxesOf(textLayer)
+    const item = resolveAnnotationRectsItem(entry, annotations, page)
+    const calibrated: Record<string, ResolvedAnnotation> = {}
+    for (const [id, v] of Object.entries(item)) {
+      calibrated[id] = { ...v, bands: spans === null ? v.bands : calibrateBands(spans, v.bands, base) }
+    }
+    return markSource(calibrated, 'item')
   }
   if (entry !== null) {
     warn(`第 ${page + 1} 页 items/DOM 文本对账失败——S4 DOM 回退层接管`)
@@ -174,6 +184,8 @@ export function resolveAiNotesLayered(args: {
     const viewport = itemViewportOf(entry)
     if (Number.isFinite(viewport.scale) && viewport.scale > 0) {
       const base = { x: 0, y: 0, w: entry.box.w, h: entry.box.h }
+      // [F-A9] AI 段带渲染时刻校准材料（DOM span 盒一次量测——逐段共享）
+      const spans = spanBoxesOf(textLayer)
       for (const n of notes) {
         if (n.quoteText.length === 0) {
           continue
@@ -198,7 +210,7 @@ export function resolveAiNotesLayered(args: {
           })
           if (geo !== null) {
             out.rects[n.id] = geo.rects
-            out.bands[n.id] = geo.bands
+            out.bands[n.id] = spans === null ? geo.bands : calibrateBands(spans, geo.bands, base)
             out.source[n.id] = 'item'
           }
         } catch {
diff --git a/src/renderer/features/reader/annotation-resolve.ts b/src/renderer/features/reader/annotation-resolve.ts
index d56fbe9d92..6113703a48 100644
--- a/src/renderer/features/reader/annotation-resolve.ts
+++ b/src/renderer/features/reader/annotation-resolve.ts
@@ -53,13 +53,17 @@ import { itemSelectionGeometry, type ItemViewport } from './pdf-item-geometry'
 import type { PageItemEntry } from './page-items.store'
 
 /** 行簇字形带（归一化域；center=带中心——渲染块匹配键；x0/x1=行簇 span
- *  实际端点——F-A5 a 面自绘块水平界夹取源，缺省=该带无端点量测） */
+ *  实际端点——F-A5 a 面自绘块水平界夹取源，缺省=该带无端点量测；
+ *  calTop/calBottom [F-A9]=渲染时刻 textLayer span 盒实测校准值（方案 A
+ *  ——annotation-band-calibrate 注入；缺省=无校准材料回退派生值） */
 export interface RowBand {
   top: number
   bottom: number
   center: number
   x0?: number
   x1?: number
+  calTop?: number
+  calBottom?: number
 }
 
 /** 重锚结果（id → { rects, bands, source }；缺项回退存量 rects 由消费方兜底）。
@@ -109,7 +113,10 @@ export function bandFromMetrics(
 }
 
 /** 渲染块 → 最近中心带（|Δcenter| ≤ rect.h 才匹配；bands 空→undefined；
- *  返回含 x0/x1（在场时）——F-A5 a 面自绘块水平界夹取源） */
+ *  返回含 x0/x1（在场时）——F-A5 a 面自绘块水平界夹取源。
+ *  [F-A9] cal 域在场 → 返回 top/bottom 替换为校准值（渲染时刻 DOM span 校准
+ *  ——annotation-band-calibrate 注入；**匹配仍按派生 center**——校准位移不
+ *  参与行归属判定=错绑零风险；cal 缺席 → 派生值原样=回退语义零变） */
 export function matchBand(bands: RowBand[] | undefined, r: AnnotationRect): { top: number; bottom: number; x0?: number; x1?: number } | undefined {
   if (bands === undefined || bands.length === 0) {
     return undefined
@@ -122,7 +129,7 @@ export function matchBand(bands: RowBand[] | undefined, r: AnnotationRect): { to
     }
   }
   return best !== null && Math.abs(best.center - c) <= r.h
-    ? { top: best.top, bottom: best.bottom, x0: best.x0, x1: best.x1 }
+    ? { top: best.calTop ?? best.top, bottom: best.calBottom ?? best.bottom, x0: best.x0, x1: best.x1 }
     : undefined
 }
 
diff --git a/src/renderer/features/reader/selection-evaluate.ts b/src/renderer/features/reader/selection-evaluate.ts
index b88db7748a..b5f1447973 100644
--- a/src/renderer/features/reader/selection-evaluate.ts
+++ b/src/renderer/features/reader/selection-evaluate.ts
@@ -72,6 +72,7 @@ import { showToast } from '../../shared/ui/Toast'
 import { selectionToAnchor, type SelectionAnchor } from './anchor-serialize'
 import { findRangeAtOffset, fullTextOf, pixelBoxOf } from './annotation-anchor'
 import { bandsForTextNodes, type RowBand } from './annotation-resolve'
+import { calibrateBandsWithSpans } from './annotation-band-calibrate'
 import { clampScale, itemSelectionGeometry, reconcileItemsWithDom } from './pdf-item-geometry'
 import type { ItemSelectionGeometry } from './pdf-item-geometry'
 import { usePageItemsStore } from './page-items.store'
@@ -246,7 +247,9 @@ export function createEvaluate(ctx: EvaluateContext): EvaluateHandle {
       setPaint(null)
       return
     }
-    setPaint({ root: anchorRoot!, rects: item.rects, bands: item.bands })
+    // [F-A9] 预览带垂直几何渲染时刻校准（方案 A——DOM span 盒实测；量测退化/
+    // 窗不命中=派生 band 原样，img1 灰带偏移消）
+    setPaint({ root: anchorRoot!, rects: item.rects, bands: calibrateBandsWithSpans(textLayer, item.bands, pixelBoxOf(textLayer)) })
   }
 
   /** 全量（settle/mouseup 路——现行逻辑零变，visualOnly 仅剩快路径回退一个活调用方） */
@@ -302,7 +305,8 @@ export function createEvaluate(ctx: EvaluateContext): EvaluateHandle {
       return
     }
     if (item !== null) {
-      setPaint({ root: anchorRoot!, rects: item.rects, bands: item.bands })
+      // [F-A9] 同 visual 快路径——预览带渲染时刻校准（快慢两路同款=INV-58 快慢等价保持）
+      setPaint({ root: anchorRoot!, rects: item.rects, bands: calibrateBandsWithSpans(textLayer, item.bands, pixelBoxOf(textLayer)) })
     } else {
       const range = findRangeAtOffset(textLayer, anchor.start, anchor.end)
       setPaint({ root: anchorRoot!, rects: anchor.rects, bands: range !== null ? bandsForTextNodes(range.textNodes.map((t) => t.node), pixelBoxOf(textLayer)) : [] })

===NEW FILE: annotation-band-calibrate.ts===
/**
 * [F-A9] annotation-band-calibrate —— 标注带垂直几何 DOM span 校准域（方案 A
 * 「渲染时 DOM 校准」，主控预裁 scripts/audits/f-a9-brief.md §1；诊断数据
 * f-a9-real6/f-a9-diag.raw.txt）。
 *
 * ── 行为层 ──
 * - 根因背景：项盒（itemBoxOf）盒顶=基线−**styles 声明 ascent**×fontH、盒高=
 *   item.height×scale（PDF 声明）；而 pdf.js textLayer span 定位=基线−
 *   **#getAscent 量测 ratio**（pdf.mjs:11079 measureText 像素量测回退字体——
 *   与声明值不同源）×fontH、盒高=fontH（line-height:1）。小字号（7~8px）下
 *   两系统差=带整体偏移 ~2.5~3px（img1 灰带/img3 underline 低位切字——字号
 *   比例函数）。本域按预裁用量测侧单点校准：span 位置由 pdf.js 按 transform
 *   定位，与 canvas 字形对齐度高于声明几何推导。
 * - 校准窗口径（错绑防护）：span **中心** ∈ band 派生垂直域 [top,bottom]×base.h
 *   且 span 与 band 水平区间（x0/x1）重叠>0 才计入；命中集的盒并集
 *   [min top, max bottom] 即 calTop/calBottom（带 y=行盒顶/高=行盒高——票面
 *   验收口径）。中心域外/水平域外/零量测 → cal 域缺席（消费方回退派生值
 *   ——**回退语义零变**；受锁 selection-item-chain 夹具「span 与项链刻意
 *   错开 116px」形态按窗天然不命中=项链产物零变）。
 * - 校准只动显示带：rects 派生域零变（落库/保存链不受影响——INV-58 前半）；
 *   matchBand 匹配键仍派生 center（消费方 annotation-resolve——错绑零风险）。
 *
 * ── 接口层 ──
 * - export function spanBoxesOf（textLayer → 一次量测产物——多条 band 组共享
 *   量测：layered 编排每页一次）/ calibrateBands（量测产物+派生 bands+归一基准
 *   → 校准 bands 纯匹配核）/ calibrateBandsWithSpans（组合便捷形——selection
 *   链 evaluate 每帧一次量测+匹配）
 * - base=消费方传（selection 链 pixelBoxOf(textLayer)/layered 链 entry.box——
 *   INV-37 同盒：textLayer 盒与 canvas CSS 盒 inset:0 同尺寸）；域一致防御：
 *   量测盒与 base 宽高差 >1px → 不校准（域错配=回退非错校）
 *
 * ── 架构层 ──
 * - 依赖单向：本件→annotation-anchor（pixelBoxOf）/annotation-resolve（RowBand
 *   类型）；DOM 只读 gBCR（bandsNearRects 同先例）；零环
 * - 量测成本：textLayer 全量 span gBCR（布局稳定时缓读——拖选 rAF 帧率下页
 *   级行簇量级，bandsNearRects 先例同域）；**零缓存**（zoom 变更→canvas 重渲
 *   →span 盒变——现量即真值，缩放不变性随消费方每次调用成立）
 *
 * ── 生命周期层 ── / ── 文化层 ──
 * - tests/unit/renderer/band-calibration.test.tsx（本票新件 always-active：
 *   纯几何窗+matchBand 替换+两链挂载级）
 */
import { pixelBoxOf, type PixelBox } from './annotation-anchor'
import type { RowBand } from './annotation-resolve'

/** 量测产物：textLayer 全量有效 span 盒（gBCR 视口域）+textLayer 视口盒 */
export interface SpanBoxes {
  base: PixelBox
  boxes: Array<{ top: number; bottom: number; left: number; right: number }>
}

/** textLayer → span 盒一次量测（零宽/零高 span 跳过——jsdom 无布局/空层形态；
 *  textLayer 盒退化（h/w≤1）或零有效 span → null=无校准材料） */
export function spanBoxesOf(textLayer: HTMLElement): SpanBoxes | null {
  const base = pixelBoxOf(textLayer)
  if (base.w <= 1 || base.h <= 1) {
    return null
  }
  const boxes: SpanBoxes['boxes'] = []
  for (const span of Array.from(textLayer.querySelectorAll('span'))) {
    // gBCR 轴对齐盒：x/y≡left/top（span 的 scaleX/rotate transform 不改 bbox 观测）
    const g = span.getBoundingClientRect()
    if (g.width <= 1 || g.height <= 1) {
      continue
    }
    boxes.push({ top: g.y, bottom: g.y + g.height, left: g.x, right: g.x + g.width })
  }
  return boxes.length > 0 ? { base, boxes } : null
}

/** 域一致防御容差（px）：量测盒与归一基准盒宽高差超此值=域错配（非同盒） */
const BASE_MISMATCH_PX = 1

/** 量测产物+派生 bands+归一基准 → 校准 bands（纯匹配核——不改输入对象；
 *  命中窗：span 中心∈band 垂直域 且 水平区间重叠>0（x0/x1 缺席=无水平域
 *  材料→不校准，防邻列误收）；零命中 → 原 band 引用透传） */
export function calibrateBands(spans: SpanBoxes, bands: RowBand[], base: PixelBox): RowBand[] {
  if (bands.length === 0 || base.w <= 0 || base.h <= 0) {
    return bands
  }
  if (Math.abs(spans.base.w - base.w) > BASE_MISMATCH_PX || Math.abs(spans.base.h - base.h) > BASE_MISMATCH_PX) {
    return bands
  }
  return bands.map((b) => {
    if (b.x0 === undefined || b.x1 === undefined || b.x1 <= b.x0) {
      return b
    }
    const topPx = b.top * base.h + spans.base.y
    const bottomPx = b.bottom * base.h + spans.base.y
    const x0Px = b.x0 * base.w + spans.base.x
    const x1Px = b.x1 * base.w + spans.base.x
    let calTop = Number.POSITIVE_INFINITY
    let calBottom = Number.NEGATIVE_INFINITY
    let hit = false
    for (const g of spans.boxes) {
      const cy = (g.top + g.bottom) / 2
      if (cy < topPx || cy > bottomPx) {
        continue
      }
      if (!(g.right > x0Px && g.left < x1Px)) {
        continue
      }
      hit = true
      calTop = Math.min(calTop, g.top)
      calBottom = Math.max(calBottom, g.bottom)
    }
    if (!hit) {
      return b
    }
    return { ...b, calTop: (calTop - spans.base.y) / base.h, calBottom: (calBottom - spans.base.y) / base.h }
  })
}

/** 组合便捷形（selection 链 evaluate 消费——每帧一次量测+匹配；
 *  量测退化 → bands 原样） */
export function calibrateBandsWithSpans(textLayer: HTMLElement, bands: RowBand[], base: PixelBox): RowBand[] {
  const spans = spanBoxesOf(textLayer)
  return spans === null ? bands : calibrateBands(spans, bands, base)
}

===NEW FILE: band-calibration.test.tsx===
// @vitest-environment jsdom
/**
 * [F-A9] band-calibration —— 标注带垂直几何 DOM span 校准（渲染时刻方案 A）
 * ——always-active，诞生即锁（ADR-2017 裁决 3 同款不经 guardedDescribe）。
 *
 * 覆盖四面：
 * - 纯几何：calibrateBandsWithSpans（项几何派生 band → 同基线行 textLayer span
 *   盒实测校准 calTop/calBottom）+ 窗口语义（span 中心∈band 垂直域+水平重叠
 *   才命中——受锁 item-chain 夹具的「span 与项链刻意错开 116px」形态不命中=
 *   项链产物零变）+ 回退零变（零 span/零宽 span/jsdom 无布局 → cal 域缺席）；
 * - matchBand 替换：cal 域在场 → 返回 top/bottom=校准值（匹配仍按派生 center
 *   ——错绑零风险）；cal 缺席 → 派生值原样（存量回退语义零变）；
 * - 标注链挂载（AnnotationLayer）：真机 β 形态夹具（fontH 8/声明高 4.9/ascent
 *   0.75——band 顶≈span 顶而 band 高<行盒高=underline 低位切字缺陷形态，
 *   f-a9-real6「A systematic literature review」7.97px 行在档）→ highlight 带
 *   y=行盒顶/高=行盒高、underline=底缘下 2px；大字号（18px，f-a9-diag 形态）
 *   校准后=span 行盒值不回退；
 * - 预览链挂载（SelectionLayer）：paint 块 top/height=校准值（img1 灰带偏移
 *   消）+落库 rects 不受校准（INV-58 前半——校准只动显示带不动 rects 派生域）。
 *
 * 夹具口径 crib selection-item-chain.test.tsx（textLayer 盒视口绝对位 (500,300)
 * 域锁；span gBCR 按预设表桩注）。期望值手算见各 it 注。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AnnotationLayer } from '../../../src/renderer/features/reader/AnnotationLayer'
import { SelectionLayer } from '../../../src/renderer/features/reader/SelectionLayer'
import { calibrateBandsWithSpans } from '../../../src/renderer/features/reader/annotation-band-calibrate'
import { matchBand, type RowBand } from '../../../src/renderer/features/reader/annotation-resolve'
import { usePageItemsStore, type PageItemEntry } from '../../../src/renderer/features/reader/page-items.store'
import { createReaderStoreInitialState, useReaderStore } from '../../../src/renderer/features/reader/reader.store'
import type { PdfTextContent, PdfTextItem, PdfTextStyle } from '../../../src/renderer/features/reader/PdfPageCanvas'
import type { Annotation } from '@shared/models/annotation'

const { toastSpy, saveMock } = vi.hoisted(() => ({ toastSpy: vi.fn(), saveMock: vi.fn() }))
vi.mock('../../../src/renderer/shared/ui/Toast', () => ({ showToast: toastSpy }))
vi.mock('../../../src/renderer/api/client', () => ({
  api: { reader: { saveAnnotation: saveMock } },
  unwrap: async (p: Promise<{ ok: boolean; data: unknown }>): Promise<unknown> => {
    const r = await p
    return r.data
  },
  ApiClientError: class extends Error {}
}))

/** jsdom 无布局：元素 rect 按预设表返回 */
const rects = new Map<Element, { x: number; y: number; width: number; height: number }>()
let origRangeGBCR: (() => DOMRect) | undefined
const rangeRect = { x: 10, y: 900, width: 200, height: 20 }

/** [F-A9 β 形态] 字体样式：ascent 0.75 声明（≠pdf.js span 定位的回退字体量测
 *  ratio——两口径系统差即缺陷根源，pdf.mjs #getAscent 在档） */
const A9_STYLE: PdfTextStyle = { fontFamily: 'serif', ascent: 0.75, descent: -0.25, vertical: false }

/** 三段文本（S1 对账前提：DOM span 文本=剔空串项拼接同串） */
const A9_PARAS = ['前文第一段', '中段正文内容', '后文第三段']

/** [F-A9 β 形态] 造项：字号 8（fontH）、宽 100、**声明高 4.9**（≠fontH——
 *  band 高 4.9<行盒高 8=真机 7.97px 行 item.height 形态）；中段基线 PDF y=672
 *  →css 基线 120、oy=120−0.75×8=114、派生 band 本地 [114,118.9] */
function a9Item(str: string, y: number): PdfTextItem {
  return { str, dir: 'ltr', width: 100, height: 4.9, transform: [8, 0, 0, 8, 72, y], fontName: 'g1', hasEOL: false }
}

function a9Items(): PdfTextItem[] {
  // 三段基线 PDF y=700/672/644（quote '正文' 落中段）
  return A9_PARAS.map((str, i) => a9Item(str, 700 - i * 28))
}

function a9Entry(items: PdfTextItem[], style: PdfTextStyle = A9_STYLE): PageItemEntry {
  return {
    page: 1,
    text: { items, styles: { g1: style }, lang: null } as PdfTextContent,
    geometry: { rotate: 0, view: [0, 0, 612, 792] },
    box: { w: 612, h: 792 }
  }
}

/** 页根+textLayer 单 span（文本=items 拼接——对账前提）。textLayer 盒视口
 *  (500,300,612,792)（gBCR 原点≠0 域锁——校准须以 textLayer 盒做视口→盒本地
 *  换算）；span 盒=β 形态：本地 [114.2,122.2]（行盒高 8=fontH、顶=派生 band 顶
 *  +0.2px——span 中心 118.2∈派生 band 垂直域 [114,118.9] 命中校准窗） */
function mountPage(itemsText: string, spanBox?: { x: number; y: number; width: number; height: number }): { page: HTMLElement; textLayer: HTMLElement; span: HTMLElement } {
  const page = document.createElement('div')
  page.setAttribute('data-page-root', '1')
  const textLayer = document.createElement('div')
  textLayer.className = 'textLayer'
  const span = document.createElement('span')
  span.textContent = itemsText
  textLayer.appendChild(span)
  page.appendChild(textLayer)
  document.body.appendChild(page)
  rects.set(page, { x: 500, y: 300, width: 612, height: 792 })
  rects.set(textLayer, { x: 500, y: 300, width: 612, height: 792 })
  if (spanBox !== undefined) {
    rects.set(span, spanBox)
  }
  return { page, textLayer, span }
}

/** β 形态 span 桩·中段行（本地 [114.2,122.2]→视口 y=300+114.2；水平本地
 *  [72,172] 与 band x0/x1 同区间——水平重叠窗命中） */
const BETA_SPAN_MID = { x: 572, y: 414.2, width: 100, height: 8 }

/** β 形态 span 桩·首行（单 item 'AB' 基线 700→css 92/oy=86：本地 [86.2,94.2]
 *  ——span 中心 90.2∈派生 band 垂直域 [86,90.9] 命中） */
const BETA_SPAN_TOP = { x: 572, y: 386.2, width: 100, height: 8 }

let root: Root | null = null
let host: HTMLDivElement | null = null

async function mountAnnotation(ann: Annotation, pageRoot: HTMLElement): Promise<void> {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root?.render(<AnnotationLayer annotations={[ann]} page={0} pageRoot={pageRoot} onChanged={() => undefined} />)
  })
}

async function mountSelection(pageRoot: HTMLElement): Promise<void> {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root?.render(<SelectionLayer pageRoot={pageRoot} paperId="p-1" page={0} onSaved={() => undefined} />)
  })
}

function a9Annotation(kind: 'highlight' | 'underline'): Annotation {
  return {
    id: 'a-a9',
    paperId: 'p-1',
    page: 0,
    kind,
    color: 'yellow',
    quoteText: '正文',
    prefixText: '中段',
    suffixText: '内容',
    startOffset: 7,
    endOffset: 9,
    rects: [{ page: 0, x: 0.05, y: 0.25, w: 0.5, h: 0.02 }],
    comment: '',
    createdAt: '2026-09-09T00:00:00Z',
    updatedAt: '2026-09-09T00:00:00Z'
  }
}

const pct = (el: Element, prop: 'top' | 'height' | 'left' | 'width'): number => parseFloat((el as HTMLElement).style[prop])

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  rects.clear()
  usePageItemsStore.getState().clear()
  useReaderStore.setState(createReaderStoreInitialState())
  ;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    const r = rects.get(this)
    return { x: r?.x ?? 0, y: r?.y ?? 0, width: r?.width ?? 0, height: r?.height ?? 0 } as DOMRect
  })
  origRangeGBCR = Range.prototype.getBoundingClientRect as () => DOMRect
  Range.prototype.getBoundingClientRect = () => ({ ...rangeRect }) as DOMRect
  window.getSelection()?.removeAllRanges()
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
  if (origRangeGBCR !== undefined) Range.prototype.getBoundingClientRect = origRangeGBCR
  document.body.innerHTML = ''
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('F-A9 纯几何 —— calibrateBandsWithSpans（窗口+回退零变）', () => {
  /** 中段行派生 band（bandsFromItems 口径手算：top=114/792、bottom=118.9/792） */
  const derived: RowBand[] = [
    { top: 114 / 792, bottom: 118.9 / 792, center: 116.45 / 792, x0: 72 / 612, x1: 172 / 612 }
  ]

  it('β 形态命中：span 中心∈band 垂直域+水平重叠 → calTop/calBottom=span 行盒顶/底（带 y=行盒顶/高=行盒高）', () => {
    const { textLayer } = mountPage(A9_PARAS.join(''), BETA_SPAN_MID)
    const out = calibrateBandsWithSpans(textLayer, derived, { x: 0, y: 0, w: 612, h: 792 })
    expect(out.length).toBe(1)
    expect(out[0]!.calTop).toBeCloseTo(114.2 / 792, 6)
    expect(out[0]!.calBottom).toBeCloseTo(122.2 / 792, 6)
  })

  it('窗口不命中（span 中心域外——受锁 item-chain 夹具形态）→ cal 域缺席（项链产物零变）', () => {
    const { textLayer } = mountPage(A9_PARAS.join(''), { x: 572, y: 500, width: 100, height: 10 })
    const out = calibrateBandsWithSpans(textLayer, derived, { x: 0, y: 0, w: 612, h: 792 })
    expect(out.length).toBe(1)
    expect(out[0]!.calTop).toBeUndefined()
    expect(out[0]!.calBottom).toBeUndefined()
  })

  it('水平不重叠（span 在 band 水平域外）→ cal 缺席', () => {
    const { textLayer } = mountPage(A9_PARAS.join(''), { x: 900, y: 414.2, width: 100, height: 8 })
    const out = calibrateBandsWithSpans(textLayer, derived, { x: 0, y: 0, w: 612, h: 792 })
    expect(out[0]!.calTop).toBeUndefined()
  })

  it('回退零变：零量测 span（零宽/零高——jsdom 无布局形态）与无 span → 原样返回（含派生域全等）', () => {
    const zero = mountPage(A9_PARAS.join(''), { x: 572, y: 414.2, width: 0, height: 0 })
    expect(calibrateBandsWithSpans(zero.textLayer, derived, { x: 0, y: 0, w: 612, h: 792 })).toEqual(derived)
  })

  it('[C3] 域错配回退：量测盒宽与渲染 base 差 >1px（620 vs 612）→不校准（cal 缺席原样——域错配=回退非错校）', () => {
    const { textLayer } = mountPage(A9_PARAS.join(''), BETA_SPAN_MID)
    // textLayer 盒宽桩 620（span 池 base.w=620）——渲染 base 612 差 8px>1：
    // 若无域一致防御，span 仍垂直/水平命中窗 → cal 域在场（本断言红=防御判别力）
    rects.set(textLayer, { x: 500, y: 300, width: 620, height: 792 })
    expect(calibrateBandsWithSpans(textLayer, derived, { x: 0, y: 0, w: 612, h: 792 })).toEqual(derived)
  })

  it('[C3] 盒退化回退：textLayer 盒高 ≤1（jsdom 无布局/空层形态）→不校准原样', () => {
    const { textLayer } = mountPage(A9_PARAS.join(''), BETA_SPAN_MID)
    rects.set(textLayer, { x: 500, y: 300, width: 612, height: 1 })
    expect(calibrateBandsWithSpans(textLayer, derived, { x: 0, y: 0, w: 612, h: 792 })).toEqual(derived)
  })
})

describe('F-A9 matchBand —— cal 域替换（匹配键仍派生 center）', () => {
  it('cal 在场：返回 top/bottom=校准值；匹配按派生 center（rect 绑正确行不受校准位移干扰）', () => {
    const bands: RowBand[] = [
      { top: 114 / 792, bottom: 118.9 / 792, center: 116.45 / 792, x0: 0.1, x1: 0.4, calTop: 114.2 / 792, calBottom: 122.2 / 792 },
      { top: 142 / 792, bottom: 146.9 / 792, center: 144.45 / 792, x0: 0.1, x1: 0.4, calTop: 142.2 / 792, calBottom: 150.2 / 792 }
    ]
    // rect=第二行几何（center 匹配第二派生带——校准后值随该带）
    const r = { page: 0, x: 0.1, y: 142 / 792, w: 0.3, h: 4.9 / 792 }
    const m = matchBand(bands, r)
    expect(m).not.toBeNull()
    expect(m!.top).toBeCloseTo(142.2 / 792, 6)
    expect(m!.bottom).toBeCloseTo(150.2 / 792, 6)
  })

  it('cal 缺席：派生 top/bottom 原样（存量回退语义零变）', () => {
    const bands: RowBand[] = [{ top: 0.2, bottom: 0.25, center: 0.225, x0: 0.1, x1: 0.4 }]
    const m = matchBand(bands, { page: 0, x: 0.1, y: 0.2, w: 0.3, h: 0.05 })
    expect(m!.top).toBeCloseTo(0.2, 6)
    expect(m!.bottom).toBeCloseTo(0.25, 6)
  })
})

describe('F-A9 标注链挂载 —— AnnotationLayer（underline 低位切字/灰带偏移消）', () => {
  it('小字号 β 形态：highlight 带 y=行盒顶/高=行盒高（calTop=114.2/792=14.4192%、高 8/792=1.0101%）', async () => {
    const { page } = mountPage(A9_PARAS.join(''), BETA_SPAN_MID)
    usePageItemsStore.getState().setEntry(a9Entry(a9Items()))
    await mountAnnotation(a9Annotation('highlight'), page)
    const block = host!.querySelector<HTMLElement>('[data-testid="annotation-rect"]')
    expect(block).not.toBeNull()
    expect(block!.getAttribute('data-source')).toBe('item')
    // 修前=派生带 top 14.1414%/高 0.6187%（f-a9-img3 低位切字形态）——判别性差
    expect(pct(block!, 'top')).toBeCloseTo((114.2 / 792) * 100, 3)
    expect(pct(block!, 'height')).toBeCloseTo((8 / 792) * 100, 3)
  })

  it('小字号 β 形态：underline=底缘下 2px 细条（top=calc(15.4293% − 2px)=span 行盒底上 2px）', async () => {
    const { page } = mountPage(A9_PARAS.join(''), BETA_SPAN_MID)
    usePageItemsStore.getState().setEntry(a9Entry(a9Items()))
    await mountAnnotation(a9Annotation('underline'), page)
    const block = host!.querySelector<HTMLElement>('[data-testid="annotation-rect"]')
    expect(block).not.toBeNull()
    // 修前=calc(15.0126% - 2px)（band.bottom=118.9/792——真机 img3 实测条落在行盒
    // 37% 处=本缺陷形态）；修后=span 行盒底 122.2/792=15.4293%
    expect(block!.style.top).toBe('calc(15.4293% - 2px)')
    expect(block!.style.height).toBe('2px')
  })

  it('大字号（18px，f-a9-diag 形态）不回退：校准=span 行盒值（top 13.1566%——非派生 13.3333%）', async () => {
    // 18px/声明高 18/ascent 0.8：中段基线 PDF y=672→css 120、oy=120−14.4=105.6、
    // 派生 band [105.6,123.6]；span 本地 [104.2,122.2]（diag 真机：span 顶在带
    // 顶上方 1.4px、同高 18——中心 113.2∈带垂直域命中）
    const style: PdfTextStyle = { fontFamily: 'serif', ascent: 0.8, descent: -0.2, vertical: false }
    const items: PdfTextItem[] = A9_PARAS.map((str, i) => ({ str, dir: 'ltr', width: 220, height: 18, transform: [18, 0, 0, 18, 72, 700 - i * 28], fontName: 'g1', hasEOL: false }))
    const { page } = mountPage(A9_PARAS.join(''), { x: 572, y: 300 + 104.2, width: 220, height: 18 })
    usePageItemsStore.getState().setEntry(a9Entry(items, style))
    await mountAnnotation(a9Annotation('highlight'), page)
    const block = host!.querySelector<HTMLElement>('[data-testid="annotation-rect"]')
    expect(block).not.toBeNull()
    expect(pct(block!, 'top')).toBeCloseTo((104.2 / 792) * 100, 3)
    expect(pct(block!, 'height')).toBeCloseTo((18 / 792) * 100, 3)
  })
})

describe('F-A9 预览链挂载 —— SelectionLayer（img1 灰预览带偏移消）', () => {
  it('paint 块垂直=校准行盒（top 10.8880%/height 1.0101%）；落库 rects=派生域零变（INV-58 前半）', async () => {
    const { page, span } = mountPage('AB', BETA_SPAN_TOP)
    usePageItemsStore.getState().setEntry(a9Entry([a9Item('AB', 700)]))
    await mountSelection(page)
    const sel = window.getSelection()
    const range = document.createRange()
    range.setStart(span.firstChild!, 0)
    range.setEnd(span.firstChild!, 2)
    sel?.removeAllRanges()
    sel?.addRange(range)
    document.dispatchEvent(new Event('selectionchange'))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200)
    })
    const rect = document.querySelector<HTMLElement>('[data-testid="selection-rect"]')
    expect(rect).not.toBeNull()
    // 修前=派生带 top 10.8586%（oy=86=700 基线行）/高 0.6187%——img1 灰带偏移形态
    expect(pct(rect!, 'top')).toBeCloseTo((86.2 / 792) * 100, 3)
    expect(pct(rect!, 'height')).toBeCloseTo((8 / 792) * 100, 3)
    // 落库 rects 不受校准：y=oy/792=86/792（项几何派生域——校准只动显示带）
    const saved: Annotation = {
      id: 'a-1', paperId: 'p-1', page: 0, kind: 'highlight', color: 'yellow',
      quoteText: 'AB', prefixText: '', suffixText: '', startOffset: 0, endOffset: 2,
      rects: [], comment: '', createdAt: '2026-09-09T00:00:00Z', updatedAt: '2026-09-09T00:00:00Z'
    }
    saveMock.mockResolvedValue({ ok: true, data: saved })
    const bar = host!.querySelector<HTMLElement>('[data-testid="selection-toolbar"]')
    expect(bar).not.toBeNull()
    await act(async () => {
      const highlight = Array.from(bar!.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent === '高亮')!
      highlight.click()
      await vi.advanceTimersByTimeAsync(0)
    })
    const arg = saveMock.mock.calls[0]![0] as { annotation: { rects: Array<{ y: number }> } }
    expect(arg.annotation.rects[0]!.y).toBeCloseTo(86 / 792, 4)
  })
})
