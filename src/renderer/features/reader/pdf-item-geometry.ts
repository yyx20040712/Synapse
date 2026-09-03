/**
 * [F-A6-b2] pdf-item-geometry —— 项声明几何域（R-迁移主链纯函数件；依据
 * docs/design/2026-09-03_f-a6-selection-root-fix.md §0 双路线+§5.1+裁决表
 * scripts/audits/f-a6-forensic-verdict.md §4/§5 阶段 3）。
 *
 * ── 行为层 ──
 * - 矩形来源=PDF 项声明几何（PdfTextItem 自带 width/height/transform——pdf.js
 *   定位 span 用的正是这份数据；乙轨 A/B 对照实证：健康页无损 IoU_x 0.9996+、
 *   旋转页 mLR y 盲区免疫），非 Range.getClientRects 量测——按构造无测量噪声
 *   （锯齿/右溢病根族消灭，b1 裁决表 §4）。
 * - 偏移映射：DOM 全文偏移 ↔ 项 str 偏移建立在「剔空串项后逐项文本与 DOM
 *   span 全等」前提（取证 A3：3882/839−829=10、1c2d 502−501=1，剔后
 *   firstMismatch=−1）。本件实现 items 文本拼接的偏移表（空串项零宽跳过——
 *   pdf.js #appendText hasText 门令其不入 DOM），并导出对账函数
 *   reconcileItemsWithDom（管线回退判据 + 单测一致性断言锚）。
 * - 项内部分选中=grapheme 簇比例细分（C2：Intl.Segmenter granularity
 *   'grapheme'，UTF-16 码元计数禁用；dir=RTL 细分方向翻转；styles.vertical
 *   轴互换；任意角四角包围盒——/Rotate 页 angle=±π/2）。
 * - 行级并块=基线分组（取证口径 2——v 轴投影聚类 angle 感知+组内 x 并集/
 *   大间隙断段）：mLR 的 y 聚类对项级盒结构性拆簇（real3882 实证 211 簇 vs
 *   行真值 43）且旋转页 y 盲区（s1rot 并 1 块），基线分组免疫（乙2 43→42=甲）。
 * - bands 同源派生（C5）：bands 由项盒+styles 度量推导，禁 rect 项源×band
 *   DOM 量测混用（matchBand 两口径混用=b 链错绑同构风险）；语义对齐
 *   annotation-resolve.RowBand（top/bottom clamp01、center 用未 clamp 原始值
 *   ——源码 :93-97 口径）。
 * - G2 降级门检测器（selectionHealth）：偏离率=项矩形落 textLayer 盒外计数/
 *   被选项数 + 块右溢 px；阈值 ≥5%/2px（数据分界：健康 0~0.12% vs 病理
 *   25%~62.5%，间隔 ≥200 倍；右溢支=占位阈值——取证全样本右溢 0 无观测
 *   支撑，裁决表 §6）。**「仅新增复现证据时启用」=检测器在位且 active**：
 *   真实健康页 0~0.12% 永不误伤，合成病理页复现时确实拦（票面 C5 条款）。
 *
 * ── 接口层 ──
 * - export function itemRects / rectsForOffsetRange / baselineGroupBlocks /
 *   bandsFromItems / selectionHealth / itemSelectionGeometry（管线装配件）/
 *   buildItemOffsets / reconcileItemsWithDom / viewportTransformFor；
 *   常量 SELECTION_DEV_RATIO_THRESHOLD / SELECTION_RIGHT_OVERFLOW_PX
 * - viewport 通道（C1）：签名经 ItemViewport{scale,rotate,view}——与 b1 的
 *   PdfPageGeometry 同源真值（rotate=page.rotate、view=page.view）；归一化
 *   基准=pixelBoxOf(textLayer)（INV-37 同盒——消费方传入，本件纯函数不读 DOM）
 * - 类型单一真相源：PdfTextItem/PdfTextStyle 消费自 PdfPageCanvas、PixelBox
 *   自 annotation-anchor、RowBand 自 annotation-resolve（跨模块 import 类型
 *   合法——同 feature 内），零类型复写
 *
 * ── 架构层 ──
 * - **零 pdfjs-dist import（INV-16 白名单不扩）**：viewport.transform 与
 *   Util.transform 的合成数学自 pdf.mjs 4.10.38 源码内联（PageViewport 构造
 *   器 pdf.mjs:892-985 getViewport 缺省形态：offsetX/Y=0、dontFlip=false、
 *   userUnit=1 已知边界[真实库全档=1，b1 PdfPageGeometry 注]；Util.transform
 *   pdf.mjs:628-630 六元数乘）。若源码演进（升 pdfjs）须同步重核此数学。
 * - ascent 口径声明：取 styles 声明值（pdf.js TextStyle.ascent）而非 canvas
 *   量测值——乙轨已实证口径（b1 §2 T9 分解：声明 0.718×18=12.92 vs 量测
 *   14.33；项矩形=声明几何，构造不含量测伪迹）；fontName 查 styles 缺席/
 *   ascent 非有限 → 0.8 兜底（pdf.js #appendText 同款缺省）。
 * - 依赖单向：本件→annotation-merge（mergeRects 终裁——INV-A~D 保证，乙2
 *   验证管线同构[diag normB2]）；零环；纯函数零 DOM/React 依赖
 *
 * ── 生命周期层 ──
 * - 缩放不变量：项几何不随 zoom 缓存——消费方每次 evaluate 现读 zoom 现构
 *   viewport（零重算缓存面=R-迁移路线 D2 收益根基）；单页千级项 <10ms
 *   （O(被选项) 而非 O(页)——与 DOM 量测链的页级遍历对比）
 *
 * ── 文化层 ──
 * - tests/unit/renderer/pdf-item-geometry.test.tsx（本票新件，always-active
 *   ——取证 §9-4 数据缺口[RTL/竖排/grapheme 细分运行时触发面零]的单测补）
 */
import type { AnnotationRect } from '@shared/models/annotation'
import type { PixelBox } from './annotation-anchor'
import { mergeRects, W_MIN } from './annotation-merge'
import type { PdfTextItem, PdfTextStyle } from './PdfPageCanvas'
import type { RowBand } from './annotation-resolve'

/** viewport 通道（C1）：与 canvas 渲染的 page.getViewport({scale}) 同构输入——
 *  rotate/view 来自 PdfPageGeometry（b1 下钻真值），scale=当前 zoom（PdfPageCanvas
 *  同款 [0.5,3] 夹取由消费方做，本件原值直用） */
export interface ItemViewport {
  scale: number
  rotate: number
  view: [number, number, number, number]
}

/** PDF 用户空间 → viewport CSS px 的六元变换（pdf.mjs:892-985 PageViewport
 *  构造器内联——getViewport 缺省形态；userUnit=1 已知边界见头注架构层） */
export function viewportTransformFor(vp: ItemViewport): number[] {
  const [x0, y0, x1, y1] = vp.view
  const centerX = (x1 + x0) / 2
  const centerY = (y1 + y0) / 2
  const rot = ((vp.rotate % 360) + 360) % 360
  let a: number
  let b: number
  let c: number
  let d: number
  if (rot === 180) {
    a = -1; b = 0; c = 0; d = 1
  } else if (rot === 90) {
    a = 0; b = 1; c = 1; d = 0
  } else if (rot === 270) {
    a = 0; b = -1; c = -1; d = 0
  } else if (rot === 0) {
    a = 1; b = 0; c = 0; d = -1
  } else {
    throw new Error(`viewportTransformFor: 非法页旋转角 ${vp.rotate}（须为 90 的倍数）`)
  }
  const s = vp.scale
  // 旋转 90/270（a===0）时画布偏移轴互换（pdf.mjs 构造器同款分支）
  const offsetCanvasX = a === 0 ? Math.abs(centerY - y0) * s : Math.abs(centerX - x0) * s
  const offsetCanvasY = a === 0 ? Math.abs(centerX - x0) * s : Math.abs(centerY - y0) * s
  return [
    a * s,
    b * s,
    c * s,
    d * s,
    offsetCanvasX - a * s * centerX - c * s * centerY,
    offsetCanvasY - b * s * centerX - d * s * centerY
  ]
}

/** 六元矩阵乘（pdf.mjs:628-630 Util.transform 内联——viewport 变换合成项变换） */
function matMul(m1: number[], m2: number[]): number[] {
  return [
    m1[0]! * m2[0]! + m1[2]! * m2[1]!,
    m1[1]! * m2[0]! + m1[3]! * m2[1]!,
    m1[0]! * m2[2]! + m1[2]! * m2[3]!,
    m1[1]! * m2[2]! + m1[3]! * m2[3]!,
    m1[0]! * m2[4]! + m1[2]! * m2[5]! + m1[4]!,
    m1[1]! * m2[4]! + m1[3]! * m2[5]! + m1[5]!
  ]
}

// ── grapheme 细分（C2：UTF-16 码元计数禁用——代理对/组合字符按感知字符恰分）──

let graphemeSegmenter: Intl.Segmenter | null = null

function graphemeCount(str: string): number {
  if (graphemeSegmenter === null) {
    graphemeSegmenter = new Intl.Segmenter('zh', { granularity: 'grapheme' })
  }
  let n = 0
  for (const _ of graphemeSegmenter.segment(str)) n += 1
  return n
}

// ── 偏移表（DOM 全文偏移 ↔ 项 str 偏移互转的基石）──

/** 非空串项在文档序拼接中的跨度（半开区间，DOM 全文偏移域——与 collectSpans
 *  同域；index=项数组下标，空串项零宽不入 DOM 故无条目） */
export interface ItemSpan {
  index: number
  start: number
  end: number
}

/** 项文本拼接偏移表：剔空串项（取证 A3 前提）逐项累计 str.length */
export function buildItemOffsets(items: PdfTextItem[]): { spans: ItemSpan[]; total: number } {
  const spans: ItemSpan[] = []
  let cursor = 0
  items.forEach((item, index) => {
    if (item.str.length === 0) return
    spans.push({ index, start: cursor, end: cursor + item.str.length })
    cursor += item.str.length
  })
  return { spans, total: cursor }
}

/** items 文本拼接（剔空串项——与 buildItemOffsets 同拼接口径） */
function itemsTextOf(items: PdfTextItem[]): string {
  return items.map((it) => it.str).filter((s) => s.length > 0).join('')
}

/** 偏移对账：剔空串项拼接 === DOM 全文（fullTextOf(textLayer) 产物）——管线
 *  回退判据（失败=项数据与 DOM 失配，DOM 量测链兜底）+ 单测一致性断言锚 */
export function reconcileItemsWithDom(items: PdfTextItem[], domText: string): boolean {
  return itemsTextOf(items) === domText
}

// ── 项盒（ItemBox=像素矩形+基线 v 轴投影+字高——基线分组的聚类输入）──

/** 项声明几何产物：rect=viewport CSS px 域轴对齐包围盒；vProj=基线点在行分隔
 *  轴 v=(−sinA,cosA) 上的投影（angle=0 退化为主导 y；/Rotate 90 为 −tx4——
 *  行分隔随旋转轴换，取证 baselineRowTruth 同式）；fontH=字高 px（容差源）；
 *  angle=行进角（弧度，vertical 已折入——mergeRects 终裁的角度门输入） */
export interface ItemBox {
  rect: PixelBox
  vProj: number
  fontH: number
  angle: number
}

/** 单项盒（官方公式 pdf.mjs #appendText 同构：盒原点=基线点+ascent×fontH×
 *  (sinA,−cosA)；行进 u=(cosA,sinA) 宽 w 沿此；v=(−sinA,cosA) 高 h 沿此；
 *  任意角以四角轴对齐包围盒落地）。selStart/selEnd 与 span 同偏移域；非有限
 *  几何（畸形项数据）→ null 由调用方跳过（回退判据之一） */
function itemBoxOf(
  item: PdfTextItem,
  style: PdfTextStyle | undefined,
  vpTransform: number[],
  scale: number,
  selStart: number,
  selEnd: number,
  span: ItemSpan
): ItemBox | null {
  const tx = matMul(vpTransform, item.transform)
  let angle = Math.atan2(tx[1]!, tx[0]!)
  const vertical = style?.vertical === true
  if (vertical) angle += Math.PI / 2
  const fontH = Math.hypot(tx[2]!, tx[3]!)
  const ascent = style !== undefined && Number.isFinite(style.ascent) ? style.ascent : 0.8
  const sinA = Math.sin(angle)
  const cosA = Math.cos(angle)
  const ox = tx[4]! + ascent * fontH * sinA
  const oy = tx[5]! - ascent * fontH * cosA
  const w = (vertical ? item.height : item.width) * scale
  const h = (vertical ? item.width : item.height) * scale
  // 项内选中区间（grapheme 比例细分）：a/b=项内 UTF-16 偏移界（夹到项宽），
  // g0/g1=对应 grapheme 序数；全选（g0=0 且 g1=n）恒走 f0=0/f1=1 整盒
  const a = Math.max(0, selStart - span.start)
  const b = Math.min(span.end - span.start, selEnd - span.start)
  const n = graphemeCount(item.str)
  let f0 = 0
  let f1 = 1
  if (n > 0 && (a > 0 || b < span.end - span.start)) {
    const g0 = graphemeCount(item.str.slice(0, a))
    const g1 = graphemeCount(item.str.slice(0, b))
    // RTL 项文字从右端排起——细分区间按比例镜像翻转（C2）
    f0 = item.dir === 'rtl' ? 1 - g1 / n : g0 / n
    f1 = item.dir === 'rtl' ? 1 - g0 / n : g1 / n
  }
  const q0x = ox + f0 * w * cosA
  const q0y = oy + f0 * w * sinA
  const q1x = ox + f1 * w * cosA
  const q1y = oy + f1 * w * sinA
  const xs = [q0x, q1x, q0x + h * -sinA, q1x + h * -sinA]
  const ys = [q0y, q1y, q0y + h * cosA, q1y + h * cosA]
  const rect: PixelBox = {
    x: Math.min(...xs),
    y: Math.min(...ys),
    w: Math.max(...xs) - Math.min(...xs),
    h: Math.max(...ys) - Math.min(...ys)
  }
  if (![rect.x, rect.y, rect.w, rect.h, vProjOf(tx, sinA, cosA), fontH].every(Number.isFinite)) {
    return null
  }
  return { rect, vProj: vProjOf(tx, sinA, cosA), fontH, angle }
}

/** 基线点 v 轴投影（行分隔轴——angle 感知） */
function vProjOf(tx: number[], sinA: number, cosA: number): number {
  return -tx[4]! * sinA + tx[5]! * cosA
}

/** 下中位（排序后取 floor((n-1)/2)——annotation-merge 同口径，src 域第 2 次
 *  重复按 Rule of Three 保持） */
function lowerMedian(values: number[]): number | undefined {
  if (values.length === 0) return undefined
  const sorted = [...values].sort((x, y) => x - y)
  return sorted[Math.floor((sorted.length - 1) / 2)]!
}

/** 基线分组容差（取证乙2 口径）：max(2, 0.5×主导行字高下中位——loose 行真值
 *  同容差，块数=行真值按构造成立) */
function baselineTolPx(fontHs: number[]): number {
  const lineH = lowerMedian(fontHs.filter((v) => v > 0))
  return Math.max(2, 0.5 * (lineH ?? 12))
}

/** 偏移区间 → 项盒集（含项内 grapheme 细分）；tolPx=基线分组容差（随产物
 *  返回——消费方无需二次推导） */
export function rectsForOffsetRange(
  items: PdfTextItem[],
  styles: Record<string, PdfTextStyle>,
  viewport: ItemViewport,
  start: number,
  end: number
): { boxes: ItemBox[]; tolPx: number } {
  const vpTransform = viewportTransformFor(viewport)
  const { spans } = buildItemOffsets(items)
  const boxes: ItemBox[] = []
  for (const span of spans) {
    if (span.end <= start || span.start >= end) continue
    const item = items[span.index]!
    const box = itemBoxOf(item, styles[item.fontName], vpTransform, viewport.scale, start, end, span)
    if (box !== null) boxes.push(box)
  }
  return { boxes, tolPx: baselineTolPx(boxes.map((b) => b.fontH)) }
}

/** 全项像素矩形（票面导出面 1：完整项集无细分——rectsForOffsetRange 的
 *  [0,+∞) 全覆盖形态） */
export function itemRects(
  items: PdfTextItem[],
  styles: Record<string, PdfTextStyle>,
  viewport: ItemViewport
): { boxes: ItemBox[]; tolPx: number } {
  return rectsForOffsetRange(items, styles, viewport, 0, Number.MAX_SAFE_INTEGER)
}

// ── 基线分组并块（取证口径 2——f-a6-diag-lib baselineGroupBlocks 移植+组内
//    x 大间隙断段[票面 §1-3「并集/断段」——镜像 mergeLineRects COLUMN_GAP 语义]）──

/** 簇内 x 大间隙断段阈值（与 annotation-anchor 私有常量同值——跨件私有常量，
 *  值域契约由两处测试锚定；Rule of Three 第 2 次保持重复） */
const COLUMN_GAP_H_FACTOR = 1.5
const COLUMN_GAP_PAGE_RATIO = 0.02

/** v 轴投影聚类（排序+相邻差>tol 断簇——与取证 baselineRowTruth 同语义同容差） */
function groupByBaseline(boxes: ItemBox[], tolPx: number): ItemBox[][] {
  const sorted = [...boxes].sort((a, b) => a.vProj - b.vProj)
  const rows: Array<{ vTail: number; members: ItemBox[] }> = []
  for (const box of sorted) {
    const last = rows[rows.length - 1]
    if (last === undefined || box.vProj - last.vTail > tolPx) {
      rows.push({ vTail: box.vProj, members: [box] })
    } else {
      last.vTail = box.vProj
      last.members.push(box)
    }
  }
  return rows.map((r) => r.members)
}

function unionOf(members: ItemBox[]): PixelBox {
  const x = Math.min(...members.map((m) => m.rect.x))
  const y = Math.min(...members.map((m) => m.rect.y))
  const right = Math.max(...members.map((m) => m.rect.x + m.rect.w))
  const bottom = Math.max(...members.map((m) => m.rect.y + m.rect.h))
  return { x, y, w: right - x, h: bottom - y }
}

/** 基线分组并块：每行块=行内项盒轴对齐并集（大 gap 断段——防多栏桥接），
 *  输出按 (y,x) 文档序。旋转页 y 盲区免疫（s1rot 实证 mLR 并 1 块、基线分
 *  组 3 块=行真值） */
export function baselineGroupBlocks(boxes: ItemBox[], tolPx: number, pageWidthPx: number): PixelBox[] {
  const out: PixelBox[] = []
  for (const row of groupByBaseline(boxes, tolPx)) {
    const dom = unionOf(row)
    const gapThreshold = Math.max(COLUMN_GAP_H_FACTOR * dom.h, COLUMN_GAP_PAGE_RATIO * pageWidthPx)
    const byX = [...row].sort((a, b) => a.rect.x - b.rect.x)
    let segment: ItemBox[] = []
    let segRight = Number.NEGATIVE_INFINITY
    for (const box of byX) {
      if (segment.length > 0 && box.rect.x - segRight > gapThreshold) {
        out.push(unionOf(segment))
        segment = []
      }
      segment.push(box)
      segRight = Math.max(segRight, box.rect.x + box.rect.w)
    }
    if (segment.length > 0) out.push(unionOf(segment))
  }
  return out.sort((a, b) => a.y - b.y || a.x - b.x)
}

/** bands 同源派生（C5）：每基线行一带——top/bottom=行内项盒纵向并集（声明
 *  几何），x0/x1=行内项盒水平端点；归一化基准=消费方传入的 textLayer 盒
 *  （**盒本地帧**——见 itemSelectionGeometry 头注：viewport.transform 产出=
 *  盒本地域，gBCR 基准盒只消费宽高，盒原点不参与=平移不变；第三轮取证
 *  f-a6-diag-out-r3a 实证减原点域差会令全部项盒判盒外触发 G2 全抑制）。
 *  center 用未 clamp 原始值（annotation-resolve bandFromMetrics :93-97 口径） */
export function bandsFromItems(boxes: ItemBox[], base: PixelBox, tolPx: number): RowBand[] {
  if (base.w <= 0 || base.h <= 0 || boxes.length === 0) return []
  const bands: RowBand[] = []
  for (const row of groupByBaseline(boxes, tolPx)) {
    const top = Math.min(...row.map((m) => m.rect.y))
    const bottom = Math.max(...row.map((m) => m.rect.y + m.rect.h))
    const x0 = Math.min(...row.map((m) => m.rect.x))
    const x1 = Math.max(...row.map((m) => m.rect.x + m.rect.w))
    const rawTop = top / base.h
    const rawBottom = bottom / base.h
    if (!(rawBottom > rawTop)) continue
    bands.push({
      top: clamp01(rawTop),
      bottom: clamp01(rawBottom),
      center: (rawTop + rawBottom) / 2,
      x0: x0 / base.w,
      x1: x1 / base.w
    })
  }
  return bands
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v))
}

// ── G2 降级门检测器（裁决表 §6：R-迁移路线口径——项矩形 vs textLayer 盒）──

/** 偏离率阈值：健康页 0~0.12% vs 病理页 25%~62.5%（间隔 ≥200 倍，5% 阈值
 *  >4 倍安全边距）——「仅新增复现证据时启用」的 active 落地常量 */
export const SELECTION_DEV_RATIO_THRESHOLD = 0.05

/** 块右溢阈值（px）：**占位阈值**——取证全样本右溢=0 无观测支撑（裁决表 §6
 *  N1），随真实复现证据联动校准 */
export const SELECTION_RIGHT_OVERFLOW_PX = 2

/** 盒外判定的亚像素容差（px）：canvas CSS 盒 Math.floor 与未取整 viewport
 *  数学的分数 view 差（b1 §10：1c2d 分数页 ~0.5px 右缘——度量精度边界非病理） */
const HEALTH_EPS_PX = 0.5

export interface SelectionHealth {
  unhealthy: boolean
  /** 被选项盒落 textLayer 盒外的比率（A2 形态：outsideCount/被选项数） */
  outsideRatio: number
  /** 并块右缘超出 textLayer 盒右缘的最大 px（>0 即溢出） */
  rightOverflowPx: number
}

/** G2 检测器：偏离率 ≥5% 或任一并块右溢 >2px → unhealthy（消费方挂点=拖选
 *  期抑制渲染+mouseup 时刻 toast 拒绝——门一 W2 口径；真实健康页 0~0.12%
 *  永不误伤）。
 *  **盒本地帧**：项盒=viewport.transform 产出（textLayer 盒本地域），base
 *  只消费宽高（盒原点不参与）——gBCR 视口绝对原点与本地域混用会把全部
 *  项盒误判盒外（第三轮取证 r3a 实证：G2 全抑制=paint 0 块，检测器按设计
 *  拦截了域差错几何——反向验证了门的有效性） */
export function selectionHealth(boxes: ItemBox[], blocks: PixelBox[], base: PixelBox): SelectionHealth {
  let outside = 0
  for (const box of boxes) {
    const r = box.rect
    const out =
      r.x < -HEALTH_EPS_PX ||
      r.y < -HEALTH_EPS_PX ||
      r.x + r.w > base.w + HEALTH_EPS_PX ||
      r.y + r.h > base.h + HEALTH_EPS_PX
    if (out) outside += 1
  }
  const outsideRatio = boxes.length > 0 ? outside / boxes.length : 0
  let overflow = 0
  for (const blk of blocks) {
    overflow = Math.max(overflow, blk.x + blk.w - base.w)
  }
  return {
    unhealthy:
      outsideRatio >= SELECTION_DEV_RATIO_THRESHOLD || overflow > SELECTION_RIGHT_OVERFLOW_PX,
    outsideRatio,
    rightOverflowPx: Math.max(0, overflow)
  }
}

// ── 管线装配件（SelectionLayer evaluate 消费——乙2 验证管线同构：
//    项盒→基线分组→归一化→mergeRects 终裁[lineH=字高下中位/盒高]+bands+G2；
//    mergeRects 终裁带角度门——见 itemSelectionGeometry 头注）──

/** mergeRects 终裁的角度门阈值：|sin(angle)| < 0.35（≈行进向偏离水平 ±20.5°
 *  内）视为近水平。旋转/竖排内容的视觉行共享 y 中心——mergeRects 的中心 y
 *  聚类会把不同基线行桥接成单块（第三轮取证 r3b 实证 s1rot 3 行并 1 块，
 *  mLR y 盲区经终裁还魂），故该形态跳过终裁（基线分组块归一化直出+滤零宽；
 *  INV-D 行间钳制不适用=已申报边界，真实库 rotate=0 全档零触发） */
const NEAR_HORIZONTAL_SIN = 0.35

/** 项几何链产物（rects 归一化域=保存/视觉同源；bands C5 同源；health=G2 判定） */
export interface ItemSelectionGeometry {
  rects: AnnotationRect[]
  bands: RowBand[]
  health: SelectionHealth
}

/** 偏移区间 → 归一化并块+bands+G2 健康（无被选项/非法区间 → null=回退判据）。
 *  归一化基准 base=pixelBoxOf(textLayer)（INV-37 同盒——与 DOM 量测链渲染
 *  宿主严格同盒零换算）。**盒本地帧（域声明）**：viewport.transform 产出=
 *  textLayer 盒本地 CSS px（inset:0 与 canvas 同盒、原点重合），而 gBCR 基
 *  准盒为视口绝对域——故归一化只消费盒宽高、盒原点不参与（平移不变；
 *  与取证乙轨 normPxR 同式。第三轮取证 r3a 曾实证减原点的域差：全部项盒
 *  判盒外 → G2 全抑制 → paint 0 块） */
export function itemSelectionGeometry(args: {
  items: PdfTextItem[]
  styles: Record<string, PdfTextStyle>
  viewport: ItemViewport
  start: number
  end: number
  base: PixelBox
}): ItemSelectionGeometry | null {
  const { items, styles, viewport, start, end, base } = args
  if (base.w <= 0 || base.h <= 0 || !Number.isInteger(start) || !Number.isInteger(end) || end <= start) {
    return null
  }
  const { boxes, tolPx } = rectsForOffsetRange(items, styles, viewport, start, end)
  if (boxes.length === 0) {
    return null
  }
  const blocks = baselineGroupBlocks(boxes, tolPx, base.w)
  const lineHpx = lowerMedian(boxes.map((b) => b.fontH).filter((v) => v > 0))
  // 越界夹取=端点式（门一 N1）：两轴各取左/右（顶/底）端点独立 clamp01 后求
  // 差——独立夹取 w（负 x 夹 0 而 w 不联动）会令 x+w>1/右缘漂移，落库矩形
  // 不自洽；端点式保证 x+w≤1 且右缘恰为 clamp 后端点差
  const normalized = blocks.map((r) => {
    const left = clamp01(r.x / base.w)
    const right = clamp01((r.x + r.w) / base.w)
    const top = clamp01(r.y / base.h)
    const bottom = clamp01((r.y + r.h) / base.h)
    return { page: 0, x: left, y: top, w: right - left, h: bottom - top }
  })
  // 角度门（r3b 回归修复）：近水平=乙2 验证管线（mergeRects 终裁——INV-A~D
  // 收口+零宽滤除）；旋转/竖排=跳过终裁防跨行桥接，W_MIN 滤零宽自持
  const nearHorizontal = boxes.every((b) => Math.abs(Math.sin(b.angle)) < NEAR_HORIZONTAL_SIN)
  const rects = nearHorizontal
    ? mergeRects(normalized, lineHpx !== undefined ? lineHpx / base.h : undefined)
    : normalized.filter((r) => r.w > W_MIN)
  return {
    rects,
    bands: bandsFromItems(boxes, base, tolPx),
    health: selectionHealth(boxes, blocks, base)
  }
}
