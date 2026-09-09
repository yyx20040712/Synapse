# F-A9 门一审包（对抗深审——Kimi 链）

## 0. 票面（registry F-A9）

标注带垂直几何缺陷（2026-09-09 F-A8 门 3 真机测试暴露）:①划选预览带下移半行（img1）②underline 标注渲染为低位色带切字（img3）;诊断先行票:根因候选=预览链与渲染链的矩形 y/高算式;含 G3A② rect 收集窗一并核;验收=夹具单测几何断言+真机 DOM rect 断言+e2e 渲染真实文本+img1/img3 形态复测消

## 1. 主控诊断（真机库副本探针 6 轮）

- 真机复现：underline 条落文字盒 37% 处（应≈底缘，band.bottom 偏高~3px）；预览带偏移 2.5px（6.375px 字号行）——偏差为字号比例函数，夹具 18px 大字不复现（稀释）。
- 标注主文献=《Towards a smart water city》a9390ef7 第 1 页（underline 8 行+quote 前导空格指纹）。
- 实现者根因升级实锤：pdf.js span 定位用 #getAscent 量测 ratio（pdf.mjs:11079）而项盒用 styles 声明 ascent——两套 ascent 口径。

## 2. 实现摘要（报告全文见 scripts/audits/f-a9-impl.report.md）

方案 A（渲染时 DOM 校准）：新域件 annotation-band-calibrate.ts（span 盒 gBCR 实测校准 calTop/calBottom）+RowBand cal 域+matchBand 单点替换+selection-evaluate/layered 两链四点接线。TDD 6 红→10/10+renderer 1028 绿→变异 5 红还原 diff 空。真机复测双缺陷消（underline 16/16 行贴 span 底−2px、预览带 2.5px→0.0125px）。全量 159 文件/1496 用例绿。

## 3. 工单（A~E）

A 母本符合度：票面两形态+G3A② 核（报告申报不交？核实）+四验收面（e2e 留主控）。
B 宪法红线：状态机/几何推导表前置？行数？UTF-8？
C 代码与测试质量：calibrate 域件设计（cal 域单点替换——向后兼容 cal 缺席路径？）真机探针的 0.0125px 复测可信度？夹具断言语义非恒真？
D 报告诚实性：自裁 7 项对 diff；疑虑 4 项属实？（其中「预存 lint 红 2 处属并发面」——主控核）
E 接缝：与 annotation-style rectStyle（underline band.bottom−2px 消费）/SelectionPaint bandVertical/jest jsdom 无 gBCR 环境的回退语义。

输出 [B|W|N] 逐条+file:line+一行总评。

## 4. diff 与新文件全文

```diff
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

```

## 5. 实现者报告全文

# F-A9 实现者报告——标注带垂直几何（渲染时 DOM span 校准=方案 A）

## 1. 实现摘要

根因确认（简报 §0 起步+pdf.mjs 源码核实）：项盒（itemBoxOf）盒顶=基线−
**styles 声明 ascent**（pdf-item-geometry.ts:219-225）×fontH、盒高=item.height×
scale；而 pdf.js textLayer span 定位=基线−**#getAscent 量测 ratio**
（pdf.mjs:11079——measureText("") fontBoundingBox 像素量测回退字体，与声明值
不同源）×fontH、盒高=fontH（line-height:1，pdf.mjs:11098 fontSize=fontHeight）。
小字号（7~8px）下两系统差=带整体偏移 ~2.5~3px（缺陷①②共同的公共上游偏差源）。

修复=主控预裁方案 A「渲染时 DOM 校准」：项几何派生 bands 在渲染时刻经
textLayer span 盒（gBCR）实测校准——校准值落 RowBand 新域 calTop/calBottom，
matchBand 返回时替换 top/bottom（**匹配键仍派生 center——错绑零风险**），
rects 派生域与落库链零变。两条消费链同修（预览=selection-evaluate 两路径；
标注=annotation-resolve-layered 两个 item 分支含 AI 段）。

### 几何推导表（校准窗口径）

| 域 | 算式 | 备注 |
| --- | --- | --- |
| 派生 band px 顶 | topPx = band.top×base.h + spans.base.y | band 归一域→gBCR 视口域 |
| 命中窗（垂直） | span 中心 cy∈[topPx, bottomPx] | 中心归属语义——受锁 selection-item-chain 夹具（span 与项链刻意错开 116px/zoom2 错开 12px）按窗不命中=项链产物零变（既有测试零改保护） |
| 命中窗（水平） | span.right>x0Px 且 span.left<x1Px | band x0/x1 缺席→不校准（防邻列误收） |
| calTop/calBottom | (min(span tops)−base.y)/base.h、(max(span bottoms)−base.y)/base.h | 命中集盒并集=带 y=行盒顶/高=行盒高（票面验收口径） |
| 回退（零变） | 零有效 span/零宽零高 span/textLayer 盒退化/base 宽高差>1px/窗不命中 → cal 域缺席 → 消费回退派生值 | jsdom 无布局夹具（annotation-layer.test F-A8 门2/ai 同款）天然走此路=受锁面零扰 |
| underline 条 | top=calc(calBottom%−2px)、height=2px | rectStyle 既有式零改——条=span 行盒底内侧 2px（≈基线下 descent 区细线） |

## 2. 文件清单

新增：
- `src/renderer/features/reader/annotation-band-calibrate.ts`（校准域件：
  spanBoxesOf 一次量测/calibrateBands 纯匹配核/calibrateBandsWithSpans 组合形）
- `tests/unit/renderer/band-calibration.test.tsx`（always-active 新测试 10 用例：
  纯几何窗 4+matchBand 替换 2+标注链挂载 3+预览链挂载 1）
- `scripts/audits/f-a9-verify-real.mjs`（真机复测探针——新文件非改旧件）

修改（3 文件，band 计算与消费接线面）：
- `src/renderer/features/reader/annotation-resolve.ts`：RowBand 增
  calTop?/calBottom? 域+matchBand 返回替换（匹配仍派生 center）
- `src/renderer/features/reader/selection-evaluate.ts`：visual 快路径与
  evaluateCore item 分支两处 setPaint 前 bands 校准（快慢同款=INV-58 快慢等价保持）
- `src/renderer/features/reader/annotation-resolve-layered.ts`：
  resolveAnnotationRectsLayered 与 resolveAiNotesLayered 的 item 分支——spanBoxesOf
  每页/每 resolve 一次量测共享逐条 calibrateBands

未触碰：AnnotationEditor.tsx/AnnotationPopups.tsx（F-A11 并发面）、tests/e2e/、
既有测试文件、tickets/registry.ts、locks。

## 3. 红证/绿证/变异证（三屋 TDD）

- **红**（scripts/audits/f-a9-red.raw.txt）：两层——①import 级（新域件不存在
  →vite import-analysis 红）；②断言级（最小骨架[类型域+空壳函数]下 6 failed：
  纯几何命中 1+matchBand 替换 1+标注链挂载 3+预览链挂载 1——几何断言对修前
  实现有判别力）。
- **绿**（f-a9-green.raw.txt）：定向 10/10；renderer 全量 85 文件/1028 用例
  （既有回归面零回退：selection-item-chain/selection-evaluate/annotation-layer/
  ai-annotation-layer/selection-paint 全绿——受锁「span 与项链判别性错开」
  夹具经校准窗天然不命中）。
- **变异红证**（f-a9-mutation.raw.txt）：M1=matchBand 删 cal 替换
  （`calTop ?? top`→`top`）→5 failed（matchBand 替换+3 挂载+预览链接线面）；
  cp 备份法还原（diff 确认空+备份即删，非 git checkout）。
- 实现中途一次自查修复：jsdom gBCR 桩面只有 x/y/width/height（无 top/left
  ——mock 形态与 bandsNearRects 消费面同款）——校准量测取 g.x/g.y（轴对齐盒
  上 x/y≡left/top），非测试文件改动。

## 4. 真机复测对照（f-a9-verify-real.raw.txt；白名单用户库副本+a9390ef7 文献
第 1 页——与简报 f-a9-real6 同场景同探针口径）

| 场景 | 修前（f-a9-real6） | 修后 | 判据（容差 0.75px） |
| --- | --- | --- | --- |
| 缺陷②underline 第 1 行条 top | 514.34（span [511.43,519.40] 37% 处，img3 低位切字） | 517.400（期望 517.400） | **16/16 行全 ok**（逐行配对各自 span 底−2px） |
| 缺陷①预览带 paint [top,bottom] | [177.05,183.43]（整体上移 2.5px，img1 灰带偏移） | [179.5375,185.900] vs span [179.550,185.925] | **ok**（偏差 0.0125/0.025px） |

跑前 `node scripts/sqlite-abi.mjs use electron` 已执行（build 内含）；npm run
test 的 pre 步骤已自愈回 node 绑定。

## 5. 状态迁移表（校准域引入的态空间）

| 输入态 | cal 域 | 消费端渲染 |
| --- | --- | --- |
| 项几何 bands+量测材料在+窗命中 | calTop/calBottom 在场 | band 值（校准后） |
| 量测退化（jsdom/空层/零宽 span 全滤） | 缺席 | 派生 band 值（=修前行为） |
| 窗不命中（span 中心域外/水平域外/x0x1 缺席/base 域错配>1px） | 缺席 | 派生 band 值（=修前行为） |
| DOM 回退链 bands（S4/存量——bandsForTextNodes/bandsNearRects） | 不经校准（未接线） | 原样（票面「回退语义零变」） |

## 6. 自裁申报（超票面决定）

1. **matchBand 返回替换**形态：预裁给的两个候选（「bandFromItems 产 band 后
   夹取修正」或「underline 直接用 span 盒底」）落第三变体——校准值放 RowBand
   独立域+matchBand 单点替换：三消费点（SelectionPaint/AnnotationLayer/
   AiAnnotationLayer）零改自动获益；匹配键保持派生 center=错绑零风险（校准
   位移不参与行归属判定）。
2. **校准窗**=span 中心∈band 派生垂直域+水平重叠（预裁未定窗形——自裁依据：
   受锁 item-chain/selection-evaluate 夹具「span 与项链刻意错开」形态按中心
   窗天然不命中=既有测试零改通过；真机两形态（偏 2.5px/底差 3.06px）均命中）。
3. **AI 段链顺带覆盖**（resolveAiNotesLayered item 分支同校准）：票面两条链
   =预览/标注；AI 段走同一 matchBand 消费——同族接线一致性（不校准则 AI 段带
   与标注带在同类页上几何口径分裂）。
4. **域一致防御**（spans.base 与 base 宽高差 >1px 不校准）+**量测取 g.x/g.y**
   （jsdom 桩面兼容——bandsNearRects 同款取法）。
5. **INV-58 C5 张力**：「禁项源 rect×DOM 量测 band 混用」字面与方案 A 的关系
   ——派生域不变（rects 与 bands 仍同由项几何+styles 派生、同链产出），calTop/
   calBottom=派生后的显示域校准（主控预裁方案 A 授权在案 f-a9-brief §1）；
   混用错绑风险由「匹配键=派生 center」消解；落库 rects 零变（预览链挂载级
   it 断言 y=派生域）。
6. **G3A 开放项②**（f-a8-gate1-lib.mjs 的 bottom 锚 rect 收集窗定义）与本次
   改动面不交（校准只加显示域，不碰 rect 收集/取证窗）——不动（票面预裁「不
   交则不动并申报」）。
7. **e2e 渲染真实文本**（受锁 tests/e2e/）留主控（票面简报 §2 明示）。

## 7. 疑虑

1. **性能面无实测锚**：拖选快路径每帧全页 span gBCR（现量零缓存——zoom 变更
   即真值；布局稳定时缓读）。真机探针拖选随动正常；若门审要求可补帧耗时锚。
2. **紧排边界**：行距<半行高时相邻行 span 中心可能同落 band 垂直域→带扩张为
   两行并集（罕见形态——真库 43 行取证页行距 10.45px/行高 7.97px 免疫；同族
   偏差量级下不劣于修前）。未加最近行聚类防护（过度设计判断——申报留门审定）。
3. **预存 lint 红 2 处非本票面**：scripts/audits/f-a9-diag.mjs:43（主控诊断件
   xrefStart 未用）+tests/e2e/reader-text.spec.ts:297（userData 未用——并发/
   主控面残留）。禁令禁改——主控收口 verify 前须清。
4. **基线数字**：全量 159 文件/1496 用例（票面基线 157/1482 + 本票 1 文件/10
   用例 + F-A11 并发 +1 文件/+4 用例——git status 并发残留可解释，非本票虚报）。
