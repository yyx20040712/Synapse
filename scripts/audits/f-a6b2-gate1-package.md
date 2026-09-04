# F-A6-b2（阶段 3 主链迁移 R-几何源）·门一审材料包（Kimi 链,零仓库接触）

你是门一对抗审查员。审「划选矩形主链从 DOM 量测迁移到 PDF 项声明几何」的实现:三新件全文+改 5 件 diff+第三轮取证对照。你拿不到仓库,只审本包。

## 0. 上游依据(已双门终审在档,不重审)

F-A6-a 取证:R-迁移为主修+基线分组并块(mLR 对项盒结构性拆簇 211/151 vs 行真值 43/10 实证);真实样本甲乙同净(IoU 0.9996/0.9999)。F-A6-b1:T1/T9 前置修复毕+决策门过(s1rot outside 0/8/块 3=行真值;s2crop 平移消除;健康页逐位不变)。设计书 §5.1:pdf-item-geometry 纯函数件+viewport/styles 下钻通道(C1 承重)+bands 同源(C5 禁 rect 项源×band DOM 量测混用)+DOM 量测降回退+G2 门(偏离率≥5%/右溢 2px 占位,「仅新增复现证据时启用」)。INV-58 前半:快路径与 settle 同几何族(本票=settle 产链切换;快路径 c 票后续)。INV-37 同盒:归一化基准=pixelBoxOf(textLayer) 不变。

## 1. 审查任务

1. **纯函数正确性**(pdf-item-geometry.ts 全文在 §2):viewport transform 内联数学(vs PageViewport 构造器语义);grapheme 细分(RTL 翻转/竖排轴互换/四角包围盒);偏移表(DOM 偏移↔项偏移,空串项跳过)与 reconcile 对账;基线分组(v 轴投影+断段);bandsFromItems 的 C5 同源性(与项矩形同基准,center 未 clamp 口径对齐 annotation-resolve:93-97);G2 selectionHealth。
2. **通道与产链切换**(selection-evaluate.ts+page-items.store.ts 全文在 §3/§4,diff 在 §5):单源注册表约束;evaluate 拆件的行为等价面(四道收敛守卫是否全保留——sel null/跨页/页外 textLayer 缺/零宽盒);rects/bands 切项几何后 save() 落库同源(INV-58 前半);回退三因不静默;G2 active 双时刻(拖选抑制+mouseup/settle toast)与跨页拒绝既有形态的一致性。
3. **T2/T3 回退加固**(diff):mergeLineRects 聚类比较扩到全部簇——先红后绿证据(T3 交错夹具 2 红于旧实现);是否有跨行误并新风险(比较扩全簇的代价)。
4. **实现过程两事故的修复质量**(§6 §11):r3a=项盒域差(viewport.transform 产出 textLayer 盒本地域 vs gBCR 绝对域——减原点修复;G2 全抑制=检测器实战拦截错几何佐证);r3b=mergeRects 终裁无角度门把旋转三行桥接 1 块(补角度门——近水平才终裁;旋转内容跳过终裁=已申报边界)。修复是否引入新边界(角度门的阈值面)?
5. **红线**:范围(5 改+5 新清单外?)/恒真断言/占位/调度器与 TextLayer 与 anchor-serialize 未动(票面禁令)。

## 2. pdf-item-geometry.ts 全文(497 行)

```ts
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

/** G2 检测器：偏离率 ≥5% 或任一并块右溢 >2px → unhealthy（抑制渲染+完整
 *  评估时刻 toast 拒绝——消费方挂点；真实健康页 0~0.12% 永不误伤）。
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
  const normalized = blocks.map((r) => ({
    page: 0,
    x: clamp01(r.x / base.w),
    y: clamp01(r.y / base.h),
    w: clamp01(r.w / base.w),
    h: clamp01(r.h / base.h)
  }))
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

```

## 3. selection-evaluate.ts 全文(183 行)

```ts
/**
 * [F-A6-b2] selection-evaluate —— 划选评估域件（自 SelectionLayer 拆出——组件
 * ≤250 行红线触发[票面预判条款：通道接线使其超行则拆本件]；设计书 §5.1 本有
 * 此件=F-A6-c 快/慢路径宿主，本票提前拆出=evaluate 函数域净迁移+项几何链
 * 切换，行为面经 selection-layer/selection-item-chain 测试锁）。
 *
 * ── 行为层 ──
 * - evaluate(fromMouseUp, visualOnly)：四道收敛守卫（选区空/跨页/页外不可锚定/
 *   零宽盒→setPaint(null)）→ 锚定（selectionToAnchor 三元组）→ [F-A6-b2] rects
 *   产链双路（项几何主链+DOM 量测回退，见下）→ setPaint → 非 visualOnly 时
 *   工具条落点（toolbarMountPos）+setPending
 * - visualOnly=[B1 回炉] 拖选期节流路径——只更新自绘层不动 pending（弹出语义
 *   独属防抖/mouseup 全量评估，零变）
 * - **F-A6-b2 rects 产链切换（R-迁移主链+DOM 量测回退双路结构）**：主链=
 *   pdf-item-geometry.itemSelectionGeometry（基线分组并块+归一化
 *   pixelBoxOf(textLayer) 同盒 INV-37+mergeRects 终裁；bands 同步切
 *   bandsFromItems——C5 禁 rect 项源×band DOM 量测混用）；锚定三元组仍产自
 *   selectionToAnchor（偏移/quote/prefix/suffix 零变，rects 字段切换来源——
 *   pending.anchor.rects 与 paint 同源=保存链与视觉同一来源，INV-58 前半）。
 *   **回退路径**（页项缺失/偏移对账失败/计算异常三因，触发面收敛）：现行 DOM
 *   量测链原样兜底（rects=anchor.rects[mLR 链]+bands=bandsForTextNodes 节点
 *   口径）——回退不静默（console.warn+paint 层照渲零功能损失）
 * - **G2 降级门挂点**（active：真实健康页偏离率 0~0.12% 永不误伤，合成病理页
 *   复现时确实拦——「仅新增复现证据时启用」的落地形态）：拖选期抑制渲染
 *   （setPaint(null)）+mouseup/settle 完整评估时刻 toast 拒绝（INV-02 禁静默）
 * - **通道**：页项 {items,styles,geometry} 经 page-items.store（PagesOverlay
 *   写/本域 evaluate 时刻 getState 直读——zoom 现读、viewport 现构，项几何
 *   不随 zoom 缓存=缩放不变零重算）
 *
 * ── 接口层 ── / ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - export function createEvaluate(ctx)：工厂返回 evaluate 闭包（ctx=组件
 *   状态写口+挂载盒+文献 id——纯函数域件零 React 依赖）；PaintSelection/
 *   PendingSelection 类型随迁（SelectionLayer 消费）
 * - 依赖单向：本件→anchor-serialize/annotation-anchor/annotation-resolve/
 *   pdf-item-geometry/page-items.store/reader.store/selection-geometry（零环）
 * - F-A6-c 增量预告：evaluateVisual/evaluateFull 双路径拆分宿主在此
 * - tests/unit/renderer/selection-layer.test.tsx（既有行为面）+
 *   selection-item-chain.test.tsx（F-A6-b2 接线面六用例）
 */
import type { AnnotationRect } from '@shared/models/annotation'
import { showToast } from '../../shared/ui/Toast'
import { selectionToAnchor, type SelectionAnchor } from './anchor-serialize'
import { findRangeAtOffset, fullTextOf, pixelBoxOf } from './annotation-anchor'
import { bandsForTextNodes, type RowBand } from './annotation-resolve'
import { itemSelectionGeometry, reconcileItemsWithDom } from './pdf-item-geometry'
import type { ItemSelectionGeometry } from './pdf-item-geometry'
import { usePageItemsStore } from './page-items.store'
import { useReaderStore } from './reader.store'
import { closestPageRoot, pageIndexOf, toolbarMountPos } from './selection-geometry'

/** 跨页/跨出页盒选区的拒绝提示（F-02 主控裁决：INV-02 可见，禁静默） */
const CROSS_PAGE_HINT = '选区跨页，不支持创建标注'

/** [F-A6-b2] G2 降级门拒绝提示（偏离率 ≥5%/右溢 >2px——异常 PDF 文本层几何；
 *  真实健康页 0~0.12% 永不触发，INV-02 禁静默） */
const GEOMETRY_REJECT_HINT = '选区几何异常，无法创建标注'

/** [F-A4 a 面] 自绘并集层状态（页盒+归并 rects+F-A5 行簇字形带；清除=层卸载） */
export interface PaintSelection {
  root: HTMLElement
  rects: AnnotationRect[]
  bands: RowBand[]
}

/** 待确认的划选（锚定结果+选区所在页 0 基+工具条挂载盒本地落点） */
export interface PendingSelection {
  anchor: SelectionAnchor
  pageNo: number
  x: number
  y: number
}

/** evaluate 的组件状态写口（工厂 ctx——SelectionLayer 挂载 effect 在 pageRoot
 *  非空守卫后传入，故挂载盒类型收窄为非空） */
export interface EvaluateContext {
  pageRoot: HTMLElement
  paperId: string
  setPaint(p: PaintSelection | null): void
  setPending(p: PendingSelection | null): void
}

/** [F-A6-b2] 项几何链（R-迁移主链）：页项注册表按选区所在页动态取（evaluate
 *  时刻 getState 直读——zoom 现读/viewport 现构，项几何不随 zoom 缓存）。
 *  回退触发面（收敛后三因）：页项缺失/偏移对账失败/计算异常——null=回退
 *  DOM 量测链；回退不静默（console.warn——真实装配中 textLayer 在场蕴含
 *  注册表条目在场[同源]，warn 只在异常态出现） */
function itemChainFor(pageNo: number, paperId: string, start: number, end: number, textLayer: HTMLElement): ItemSelectionGeometry | null {
  const entry = usePageItemsStore.getState().pages[pageNo + 1]
  if (entry === undefined) {
    console.warn('[SelectionLayer] 项几何链回退：页项数据缺失（page-items 注册表无该页条目）')
    return null
  }
  if (!reconcileItemsWithDom(entry.text.items, fullTextOf(textLayer))) {
    console.warn('[SelectionLayer] 项几何链回退：偏移对账失败（items 拼接≠DOM 全文）')
    return null
  }
  try {
    const zoom = useReaderStore.getState().tabs[paperId]?.zoom ?? 1
    return itemSelectionGeometry({
      items: entry.text.items,
      styles: entry.text.styles,
      viewport: {
        scale: Math.min(3, Math.max(0.5, zoom)),
        rotate: entry.geometry.rotate,
        view: entry.geometry.view
      },
      start,
      end,
      base: pixelBoxOf(textLayer)
    })
  } catch (e) {
    console.warn('[SelectionLayer] 项几何链回退：计算异常', e)
    return null
  }
}

/** evaluate 工厂：评估选区（动态锚定根）——四守卫+产链双路+G2 门+工具条落点 */
export function createEvaluate(ctx: EvaluateContext): (fromMouseUp: boolean, visualOnly: boolean) => void {
  const { pageRoot, paperId, setPaint, setPending } = ctx
  return (fromMouseUp: boolean, visualOnly: boolean): void => {
    const sel = window.getSelection()
    if (sel === null || sel.rangeCount === 0 || sel.isCollapsed) {
      if (!visualOnly) setPending(null)
      setPaint(null)
      return
    }
    const anchorRoot = closestPageRoot(sel.anchorNode)
    const focusRoot = closestPageRoot(sel.focusNode)
    if (anchorRoot !== focusRoot) {
      // 跨页/跨出页盒：不创建+toast（INV-02 禁静默——仅挂 mouseup 时刻，
      // 防抖路径静默防拖选中途刷屏）
      if (fromMouseUp) showToast(CROSS_PAGE_HINT, 'info')
      if (!visualOnly) setPending(null)
      setPaint(null)
      return
    }
    // 两边界同盒（同为 null=页外选区——静默收起，与页列无关）
    const pageNo = anchorRoot === null ? null : pageIndexOf(anchorRoot)
    const textLayer = anchorRoot?.querySelector('.textLayer') as HTMLElement | null
    const anchor = pageNo === null || textLayer === null ? null : selectionToAnchor(textLayer, sel)
    // textLayer 非空由 anchor 非空蕴含——并列检查保留防御语义
    if (anchor === null || textLayer === null) {
      if (!visualOnly) setPending(null)
      setPaint(null)
      return
    }
    const box = sel.getRangeAt(0).getBoundingClientRect()
    if (box.width === 0 && box.height === 0) {
      if (!visualOnly) setPending(null)
      setPaint(null)
      return
    }
    // [F-A6-b2] rects 产链切换：项几何链为主（R-迁移）——rects/bands 同由项
    // 声明几何+styles 派生（C5）；失败（null）回退现行 DOM 量测链原样
    // （rects=anchor.rects[mLR 链]、bands=[F-A5 a/b] 节点口径——选区自身
    // textNodes，免疫 CSS 行盒整体偏移错绑上一行；退化空数组=行盒原样回退）
    const item = itemChainFor(pageNo!, paperId, anchor.start, anchor.end, textLayer)
    if (item !== null && item.health.unhealthy) {
      // G2 降级门（active——头注声明）：拖选期抑制渲染+完整评估时刻
      // （mouseup/settle）toast 拒绝（INV-02 禁静默；参照跨页拒绝形态）
      setPaint(null)
      if (!visualOnly) {
        setPending(null)
        showToast(GEOMETRY_REJECT_HINT, 'info')
      }
      return
    }
    if (item !== null) {
      setPaint({ root: anchorRoot!, rects: item.rects, bands: item.bands })
    } else {
      const range = findRangeAtOffset(textLayer, anchor.start, anchor.end)
      setPaint({ root: anchorRoot!, rects: anchor.rects, bands: range !== null ? bandsForTextNodes(range.textNodes.map((t) => t.node), pixelBoxOf(textLayer)) : [] })
    }
    if (visualOnly) {
      return
    }
    // [F-A4 c 面] 工具条挂载盒本地落点（翻转+夹取+÷有效 zoom——geometry 域）；
    // [F-A6-b2] pending.anchor.rects 切项几何链产物=保存链与视觉同一来源
    // （save() 落库 rects 即 pending.anchor.rects——INV-58 前半）
    const { x, y } = toolbarMountPos(pageRoot, { x: box.x, y: box.y, width: box.width, height: box.height })
    setPending({ anchor: item !== null ? { ...anchor, rects: item.rects } : anchor, pageNo: pageNo!, x, y })
  }
}

```

## 4. page-items.store.ts 全文(68 行)

```ts
/**
 * [F-A6-b2] page-items.store —— 页项注册表（R-迁移下钻通道 C1 的单源宿主）。
 *
 * **通道设计理由（票面 §1-C 头注声明义务）**：选区所在页的
 * {items,styles,geometry,box} 需到达 SelectionLayer 的 evaluate，而两者挂载位
 * 不同构（PagesOverlay=PdfDocProvider 内页列装配；SelectionLayer=ReaderPage
 * 内容级稳定包装盒 N4——滚动中锚定页切换不重挂）。三约束：①单源（不得出现
 * 两份页项注册表）——本模块=唯一注册表，PagesOverlay 的 pageTexts useState
 * **整体迁入**（TextLayer 挂载渲染与 SelectionLayer 读数共用一表，写入点仍
 * 唯一=PagesOverlay handlePageRender）；②SelectionLayer 按选区所在页动态取
 * （evaluate 时刻 getState() 非订阅——zoom 现读、viewport 每次现构，项几何
 * 不随 zoom 缓存=缩放不变零重算）；③不破坏既有挂载语义（PagesOverlay 七件
 * 行为/SelectionLayer N4 稳定盒均零变——本通道只替存储位不改组件拓扑）。
 * 备选方案否决记录：reader.store 加域（页项是 per-文档渲染域，混入 per-tab
 * 状态形状域不亲和）；装配根经 props 回传（PagesOverlay props 面变化会拖动
 * 受锁 pages-overlay.test 的九 props 透传锚，且 drop/clear 双向通知面冗余）。
 *
 * ── 行为层 ──
 * - 形状：pages: Record<页号(1 基), PageItemEntry>；setEntry/drop/clear 三写口
 *  （写者唯 PagesOverlay：回报写入/卸载哨同删/换文献清空——三语义与原
 *  pageTexts useState 完全同构，纯存储位迁移零行为变）
 * - 生命周期对齐原 useState：条目只随渲染页存在（PageFrame 回收哨同删——
 *  INV-30）；换文献（fileUrl 效应）整表清空
 *
 * ── 接口层 ── / ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - export const usePageItemsStore（zustand——react 订阅渲染 + getState()
 *   事件时刻直读双形态单模块）；PageItemEntry 类型单源（原 PagesOverlay
 *  PageText 迁入，字段零变）
 * - 只 import 类型（PdfPageCanvas——INV-16 白名单不扩）；零 DOM/React 组件
 *   依赖；zustand 既有依赖零新增
 * - 单阅读器单实例前提（App 至多一个 PagesOverlay 挂载——多 tab 切换走
 *  fileUrl 清空重填，与原 useState 生命周期等价）
 * - tests/unit/renderer/pages-overlay.test.tsx（注册表行为锁——迁库后语义
 *  零变应全绿）+ selection-item-chain.test.tsx（通道接线面）
 */
import { create } from 'zustand'
import type { PdfPageGeometry, PdfTextContent } from './PdfPageCanvas'

/** 页项条目（原 PagesOverlay.PageText 迁入——成对更新契约字段零变：
 *  页号 1 基 + 文本载荷 + 页几何 + 该页 canvas CSS 盒） */
export interface PageItemEntry {
  page: number
  text: PdfTextContent
  /** F-A6-b1 T1/T9 通道：渲染回报的页几何（rotate/view）——TextLayer 与
   *  项几何 viewport 同源真值 */
  geometry: PdfPageGeometry
  box: { w: number; h: number }
}

interface PageItemsStore {
  pages: Record<number, PageItemEntry>
  setEntry(entry: PageItemEntry): void
  drop(no: number): void
  clear(): void
}

export const usePageItemsStore = create<PageItemsStore>()((set) => ({
  pages: {},
  setEntry: (entry) => set((s) => ({ pages: { ...s.pages, [entry.page]: entry } })),
  drop: (no) =>
    set((s) => {
      if (s.pages[no] === undefined) return s
      const next = { ...s.pages }
      delete next[no]
      return { pages: next }
    }),
  clear: () => set({ pages: {} })
}))

```

## 5. 改 5 件 diff(PagesOverlay/SelectionLayer/annotation-anchor/annotation-anchor.test/manifest)

```diff
diff --git a/src/renderer/features/reader/PagesOverlay.tsx b/src/renderer/features/reader/PagesOverlay.tsx
index 6094477f60..ccc5e5708d 100644
--- a/src/renderer/features/reader/PagesOverlay.tsx
+++ b/src/renderer/features/reader/PagesOverlay.tsx
@@ -4,9 +4,11 @@
  * ── 行为层 ──
  * - 七件自 ReaderPage 原样迁入（本组件为页面缓存注册表宿主——F-01 头注声明
  *   「ReaderPage 只装配」的漂移收口，纯重构行为零变）：
- *   ① PageText（页号+文本载荷+canvas CSS 盒，成对更新契约）；
+ *   ① PageText（页号+文本载荷+canvas CSS 盒，成对更新契约——[F-A6-b2] 存储
+ *     位迁 page-items.store.PageItemEntry，字段零变）；
  *   ② PageFrame（渲染窗口内页的卸载哨，onRecycle 回收）；
- *   ③ pageTexts/pageRoots 两个 useState（缓存注册表）；
+ *   ③ pageTexts/pageRoots 两个缓存注册表（[F-A6-b2] pageTexts=usePageItemsStore
+ *     订阅——R-迁移下钻通道单源宿主，写者仍唯本组件；pageRoots 保持 useState）；
  *   ④ 换文献清缓存 effect（键 fileUrl，只清两表——setPdfDoc(null) 留 ReaderPage，
  *     pdfDoc 是 OutlinePanel 数据源=布局职责）；
  *   ⑤ handlePageRender（PdfPageCanvas 渲染回报→页根域内量测 canvas CSS 盒→
@@ -49,17 +51,9 @@ import { SearchHighlightLayer } from './SearchHighlightLayer'
 import type { PDFDocumentProxy } from './PdfDocProvider'
 import type { PdfPageGeometry, PdfTextContent } from './PdfPageCanvas'
 import type { PageLayout } from './page-column-geometry'
+import { usePageItemsStore } from './page-items.store'
 import { TextLayer } from './TextLayer'
 
-/** 当前页文本与几何（成对更新：页号 + 文本载荷 + 页几何 + 该页 canvas CSS 盒） */
-interface PageText {
-  page: number
-  text: PdfTextContent
-  /** F-A6-b1 T1/T9 通道：渲染回报的页几何（rotate/view），透传 TextLayer */
-  geometry: PdfPageGeometry
-  box: { w: number; h: number }
-}
-
 /** 渲染窗口内页的卸载哨（F-01 回收同删 pageTexts+pageRoots 条目——W3） */
 function PageFrame(props: { no: number; onRecycle(no: number): void; children: ReactNode }): JSX.Element {
   const { no, onRecycle, children } = props
@@ -81,12 +75,14 @@ export function PagesOverlay(props: {
   layout?: PageLayout
 }): JSX.Element {
   const { doc, fileUrl, totalPages, zoom, annotations, scrollContainerRef, scrollRequest, onReady, onError } = props
-  const [pageTexts, setPageTexts] = useState<Record<number, PageText>>({})
+  // [F-A6-b2] pageTexts 存储位迁 page-items.store（R-迁移下钻通道单源——写者仍唯
+  // 本组件三写口，读方=TextLayer 挂载渲染+SelectionLayer evaluate 时刻直读）
+  const pageTexts = usePageItemsStore((s) => s.pages)
   const [pageRoots, setPageRoots] = useState<Record<number, HTMLElement>>({})
 
   // 换文献：丢弃旧页文本/页根（防陈旧文本层——TextLayer 以页对齐才渲染）
   useEffect(() => {
-    setPageTexts({})
+    usePageItemsStore.getState().clear()
     setPageRoots({})
   }, [fileUrl])
 
@@ -98,7 +94,7 @@ export function PagesOverlay(props: {
     const canvas = pageRoot?.querySelector('canvas[data-pdf-canvas]') ?? null
     if (canvas === null) return
     const rect = canvas.getBoundingClientRect()
-    setPageTexts((prev) => ({ ...prev, [no]: { page: no, text, geometry, box: { w: Math.round(rect.width), h: Math.round(rect.height) } } }))
+    usePageItemsStore.getState().setEntry({ page: no, text, geometry, box: { w: Math.round(rect.width), h: Math.round(rect.height) } })
     if (pageRoot !== null) setPageRoots((prev) => (prev[no] === pageRoot ? prev : { ...prev, [no]: pageRoot }))
   }
 
@@ -108,7 +104,8 @@ export function PagesOverlay(props: {
       if (prev[no] === undefined) return prev
       const next = { ...prev }; delete next[no]; return next
     }
-    setPageTexts(del); setPageRoots(del)
+    usePageItemsStore.getState().drop(no)
+    setPageRoots(del)
   }, [])
 
   /** 段④层实例化：每渲染页一套覆盖层（props 不变；标注层自同步 store 父级无动作）。
diff --git a/src/renderer/features/reader/SelectionLayer.tsx b/src/renderer/features/reader/SelectionLayer.tsx
index c639088780..dc10515bd5 100644
--- a/src/renderer/features/reader/SelectionLayer.tsx
+++ b/src/renderer/features/reader/SelectionLayer.tsx
@@ -22,6 +22,17 @@
  * 滚动容器可视区夹取+选区近顶下翻转（selection-geometry 纯函数——修
  * ui-scale≠1 双重放大+偏远缺陷）。层叠序完整推演见 selection-paint.tsx 头注。
  *
+ * **F-A6-b2 rects 产链切换（R-迁移主链+DOM 量测回退双路结构）**：evaluate
+ * 域整体拆 selection-evaluate.ts（组件 ≤250 行红线触发——票面预判条款；
+ * 设计书 §5.1 本有此件=F-A6-c 快/慢路径宿主，本票提前拆出）：项几何链为主
+ * （pdf-item-geometry——基线分组并块+归一化 pixelBoxOf(textLayer) 同盒
+ * INV-37+mergeRects 终裁；bands 同源派生 C5；通道=page-items.store 单源
+ * 注册表、zoom 现读/viewport 现构）；回退三因（页项缺失/偏移对账失败/计算
+ * 异常）走现行 DOM 量测链原样兜底+console.warn 不静默；G2 降级门 active
+ * （拖选期抑制渲染+mouseup/settle 完整评估时刻 toast 拒绝，INV-02）。
+ * pending.anchor.rects 与 paint 同源=保存链与视觉同一来源（INV-58 前半）。
+ * 详见 selection-evaluate.ts 头注。
+ *
  * ── 接口层 ── / ── 架构层 ──
  * - props 形状不变=挂载位契约零改；closestPageRoot/pageIndexOf 经本文件再
  *   导出（实现在 selection-geometry——F-A4 拆件，导出面零变）。锚定根=
@@ -30,19 +41,18 @@
  *
  * ── 生命周期层 ── / ── 文化层 ──
  * - mouseup 即时、防抖兜底（程序化选选不触发 mouseup）；翻页/换文献/卸载
- *   收起退订。测试：selection-layer/selection-paint.test（F-A4 三面）
+ *   收起退订。测试：selection-layer/selection-paint.test（F-A4 三面）+
+ *   selection-item-chain.test（F-A6-b2 接线面）
  */
 import { useEffect, useRef, useState } from 'react'
-import type { Annotation, AnnotationInput, AnnotationKind, AnnotationRect } from '@shared/models/annotation'
+import type { Annotation, AnnotationInput, AnnotationKind } from '@shared/models/annotation'
 import { api, unwrap, ApiClientError } from '../../api/client'
 import { showToast } from '../../shared/ui/Toast'
-import { selectionToAnchor, type SelectionAnchor } from './anchor-serialize'
-import { findRangeAtOffset, pixelBoxOf } from './annotation-anchor'
-import { bandsForTextNodes, type RowBand } from './annotation-resolve'
 import { pushUndo } from './annotation-undo'
+import { createEvaluate, type PaintSelection, type PendingSelection } from './selection-evaluate'
 import { SelectionToolbar } from './SelectionToolbar'
 import { SelectionPaint } from './selection-paint'
-import { closestPageRoot, pageIndexOf, toolbarMountPos, createVisualScheduler } from './selection-geometry'
+import { createVisualScheduler } from './selection-geometry'
 import { useReaderStore } from './reader.store'
 
 // 纯函数页盒遍历（F-02）在 selection-geometry.ts——F-A4 拆件，导出面经本文件再导出（票面 §2）
@@ -51,31 +61,13 @@ export { closestPageRoot, pageIndexOf } from './selection-geometry'
 /** 意外异常（非 ApiClientError）时的兜底中文消息 */
 const SAVE_FAILED = '标注保存失败'
 
-/** 跨页/跨出页盒选区的拒绝提示（F-02 主控裁决：INV-02 可见，禁静默） */
-const CROSS_PAGE_HINT = '选区跨页，不支持创建标注'
-
 /** selectionchange 窗口（毫秒）：自绘层节流与工具条防抖同值两路（B1） */
 const SELECTION_DEBOUNCE_MS = 200
 
 /** F-12 工具条误触发阈值（px）：位移小于此值=单击/双击（含选词）不出条
- *  （用户令「一点就出选项条」；无 mousedown 记录的程序化/键盘选区不设限） */
+ * （用户令「一点就出选项条」；无 mousedown 记录的程序化/键盘选区不设限） */
 const DRAG_SELECT_THRESHOLD_PX = 3
 
-/** 待确认的划选（锚定结果+选区所在页 0 基+工具条挂载盒本地落点） */
-interface PendingSelection {
-  anchor: SelectionAnchor
-  pageNo: number
-  x: number
-  y: number
-}
-
-/** [F-A4 a 面] 自绘并集层状态（页盒+归并 rects+F-A5 行簇字形带；清除=层卸载） */
-interface PaintSelection {
-  root: HTMLElement
-  rects: AnnotationRect[]
-  bands: RowBand[]
-}
-
 export function SelectionLayer(props: {
   pageRoot: HTMLElement | null
   paperId: string
@@ -94,54 +86,9 @@ export function SelectionLayer(props: {
   useEffect(() => {
     if (pageRoot === null) return
 
-    /** 评估选区（动态锚定根）：页内锚定；跨页拒绝（mouseup 提示）；页外/不可锚定/零宽静默收（层随清）。
-     *  visualOnly=[B1 回炉] 拖选期节流路径——只更新自绘层（视觉反馈），不动
-     *  pending（工具条弹出语义独属防抖/mouseup 全量评估，零变） */
-    const evaluate = (fromMouseUp: boolean, visualOnly: boolean): void => {
-      const sel = window.getSelection()
-      if (sel === null || sel.rangeCount === 0 || sel.isCollapsed) {
-        if (!visualOnly) setPending(null)
-        setPaint(null)
-        return
-      }
-      const anchorRoot = closestPageRoot(sel.anchorNode)
-      const focusRoot = closestPageRoot(sel.focusNode)
-      if (anchorRoot !== focusRoot) {
-        // 跨页/跨出页盒：不创建+toast（INV-02 禁静默——仅挂 mouseup 时刻，
-        // 防抖路径静默防拖选中途刷屏）
-        if (fromMouseUp) showToast(CROSS_PAGE_HINT, 'info')
-        if (!visualOnly) setPending(null)
-        setPaint(null)
-        return
-      }
-      // 两边界同盒（同为 null=页外选区——静默收起，与页列无关）
-      const pageNo = anchorRoot === null ? null : pageIndexOf(anchorRoot)
-      const textLayer = anchorRoot?.querySelector('.textLayer') as HTMLElement | null
-      const anchor = pageNo === null || textLayer === null ? null : selectionToAnchor(textLayer, sel)
-      // textLayer 非空由 anchor 非空蕴含——并列检查保留防御语义
-      if (anchor === null || textLayer === null) {
-        if (!visualOnly) setPending(null)
-        setPaint(null)
-        return
-      }
-      const box = sel.getRangeAt(0).getBoundingClientRect()
-      if (box.width === 0 && box.height === 0) {
-        if (!visualOnly) setPending(null)
-        setPaint(null)
-        return
-      }
-      // [F-A4 a] 自绘并集层=保存 rects 同源；[F-A5 a/b] bands=行簇字形带
-      // **节点口径**（选区自身 textNodes——免疫 CSS 行盒整体偏移错绑上一行，
-      // 真机实锤小字号紧排文档行盒偏上 ~9px）；退化空数组=行盒原样回退
-      const range = findRangeAtOffset(textLayer, anchor.start, anchor.end)
-      setPaint({ root: anchorRoot!, rects: anchor.rects, bands: range !== null ? bandsForTextNodes(range.textNodes.map((t) => t.node), pixelBoxOf(textLayer)) : [] })
-      if (visualOnly) {
-        return
-      }
-      // [F-A4 c 面] 工具条挂载盒本地落点（翻转+夹取+÷有效 zoom——geometry 域）
-      const { x, y } = toolbarMountPos(pageRoot, { x: box.x, y: box.y, width: box.width, height: box.height })
-      setPending({ anchor, pageNo: pageNo!, x, y })
-    }
+    // [F-A6-b2] evaluate 域件（selection-evaluate.ts——四守卫+项几何主链/DOM
+    // 量测回退双路+G2 门+工具条落点；本组件只供状态写口）
+    const evaluate = createEvaluate({ pageRoot, paperId, setPaint, setPending })
 
     // [B1 回炉] selectionchange 双路调度（selection-geometry 域工厂）：自绘层
     // =leading+trailing 节流（拖选期持续触发下纯防抖永不落地=历史删自绘轮
diff --git a/src/renderer/features/reader/annotation-anchor.ts b/src/renderer/features/reader/annotation-anchor.ts
index 57680c1f31..09e7bb7519 100644
--- a/src/renderer/features/reader/annotation-anchor.ts
+++ b/src/renderer/features/reader/annotation-anchor.ts
@@ -258,11 +258,10 @@ function medianFontSizeBetween(a: DomPoint, b: DomPoint): number | undefined {
 const DEDUP_EPSILON_PX = 0.5
 /** 高度可比带：矩形高在簇主导矩形高的 [0.5,2] 倍内视为同行字号变体（上标/公式），
  *  超出按旋转/竖排文本独立成簇（高瘦矩形并入行簇会 corrupt y/h 与并集）。贪心
- *  比对当前主导：行内高度方差 ≥2.2× 时主导切换可拆行；且聚类只与末簇比较——
- *  高瘦矩形恰排在同一行两碎片之间（y 序插队）时，后碎片与真行簇"失联"另起簇。
- *  两场景后果同为同行拆两矩形（multiply 下无叠深、几何各自正确），属 ADR-0002
- *  复杂排版近似边界——修法应是把比较扩到全部簇，而非放宽可比带/重叠率（会引入
- *  跨行误并，损失大于所得） */
+ *  比对当前主导：行内高度方差 ≥2.2× 时主导切换可拆行。[F-A6-b2 T3] 聚类已扩到
+ *  全部簇（就近并入）——高瘦矩形排在同一行两碎片之间（y 序插队）时后碎片不再
+ *  与真行簇"失联"（旧「只与末簇比较」局限的修复，修法在档=扩簇比较而非放宽
+ *  可比带/重叠率——放宽会引入跨行误并，损失大于所得） */
 const HEIGHT_RATIO_MIN = 0.5
 const HEIGHT_RATIO_MAX = 2
 /** y 重叠率门槛：重叠像素须 ≥ 较小高度（新矩形高 vs 主导高取小）的 25% 才算同行
@@ -343,11 +342,15 @@ export function mergeLineRects(pixels: PixelBox[], pageWidth: number, lineH?: nu
   if (unique.length <= 1) {
     return unique
   }
-  // ② y 区间重叠聚类（组内 y 区间为成员并集；排序保证同簇连续）——
+  // ② y 区间重叠聚类（组内 y 区间为成员并集）——
   //    [F-A4] lineH 在场改中心距判据（头注行高感知；高度可比带两种判据通用）；
   //    [F-V1] pitch（≥2 视觉行可估）在场时中心距阈值取 min(lineH, 行距, 主导高)/2
   //    ——紧凑行距（盒高>行距）下盒高/y 重叠率/膨胀 lineH 均会把相邻视觉行聚进
   //    同簇（跨行杂交并集+丢行，真机 f-v1-diag 实证），实测行距为纲。
+  //    [F-A6-b2 T3] 聚类比较扩到全部簇（annotation-merge.ts:26-28 先例语义——
+  //    修「只与末簇比较」的 y 序交错失联：同行后段被相邻行高瘦段隔在末簇之外
+  //    时另起簇=同行双块锯齿形态，取证 real3882 step3 sizes 序列交错在档）：
+  //    在全部既有簇中取满足判据且中心距最近者并入，无满足者新建簇。
   const lh = lineH !== undefined && Number.isFinite(lineH) && lineH > 0 ? lineH : null
   const pitch = estimateLinePitch(unique)
   const sorted = [...unique].sort((a, b) => a.y - b.y || a.x - b.x)
@@ -355,8 +358,9 @@ export function mergeLineRects(pixels: PixelBox[], pageWidth: number, lineH?: nu
   const groupTop: number[] = []
   const groupBottom: number[] = []
   for (const r of sorted) {
-    const gi = rowGroups.length - 1
-    if (gi >= 0) {
+    let best = -1
+    let bestDist = Number.POSITIVE_INFINITY
+    for (let gi = 0; gi < rowGroups.length; gi += 1) {
       const dom = dominantOf(rowGroups[gi]!)
       const overlapPx = Math.min(groupBottom[gi]!, r.y + r.h) - Math.max(groupTop[gi]!, r.y)
       const yOverlap =
@@ -369,15 +373,22 @@ export function mergeLineRects(pixels: PixelBox[], pageWidth: number, lineH?: nu
         Math.abs(r.y + r.h / 2 - (dom.y + dom.h / 2)) <= (centerLimit ?? 0) / 2
       const hComparable = r.h >= dom.h * HEIGHT_RATIO_MIN && r.h <= dom.h * HEIGHT_RATIO_MAX
       if ((centerLimit !== null ? centerOk : yOverlap) && hComparable) {
-        rowGroups[gi]!.push(r)
-        groupTop[gi] = Math.min(groupTop[gi]!, r.y)
-        groupBottom[gi] = Math.max(groupBottom[gi]!, r.y + r.h)
-        continue
+        const dist = Math.abs(r.y + r.h / 2 - (dom.y + dom.h / 2))
+        if (dist <= bestDist) {
+          best = gi
+          bestDist = dist
+        }
       }
     }
-    rowGroups.push([r])
-    groupTop.push(r.y)
-    groupBottom.push(r.y + r.h)
+    if (best >= 0) {
+      rowGroups[best]!.push(r)
+      groupTop[best] = Math.min(groupTop[best]!, r.y)
+      groupBottom[best] = Math.max(groupBottom[best]!, r.y + r.h)
+    } else {
+      rowGroups.push([r])
+      groupTop.push(r.y)
+      groupBottom.push(r.y + r.h)
+    }
   }
   // ③④ 簇内 x 间隙断段与段合并
   const out: PixelBox[] = []
diff --git a/tests/unit/renderer/annotation-anchor.test.ts b/tests/unit/renderer/annotation-anchor.test.ts
index 5dc1c13988..47bcf1b4ad 100644
--- a/tests/unit/renderer/annotation-anchor.test.ts
+++ b/tests/unit/renderer/annotation-anchor.test.ts
@@ -309,3 +309,33 @@ describe('F-V1 mergeLineRects —— 紧凑行距（盒高>行距）行簇错联
     expect(out[0]!.y).toBe(100)
   })
 })
+
+// always-active（F-A6-b2 T3——取证 real3882 step3 sizes 序列交错拆簇在档；先红后绿）
+describe('F-A6-b2 mergeLineRects —— y 序交错失联修复（聚类比较扩到全部簇，annotation-merge.ts:26-28 先例语义）', () => {
+  it('T3-a 交错夹具：行 1 后段（y=102）被行 2 高瘦段（y=101，h=26 超高度可比带）隔在末簇之后——旧实现（只与末簇比较）拆 3 簇=同行双块锯齿形态，全簇比较后行 1 两段并簇', () => {
+    const a1 = px(10, 100, 50, 12) // 行 1 段 1（中心 106）
+    const b1 = px(10, 101, 20, 26) // 行 2 高瘦段（中心 114；h=26 > 2×12=24 不可比，独立成簇）
+    const a2 = px(70, 102, 40, 10) // 行 1 段 2（中心 107）——y 序排在 b1 后，与末簇（b1）高度不可比
+    const out = mergeLineRects([a1, b1, a2], 600)
+    expect(out.length).toBe(2)
+    // 行 1 两段并簇：x 并集 10..110（锯齿修复面——旧实现行 1 拆 10..60 与 70..110 两块）
+    const row1 = out.find((r) => r.h <= 12)!
+    expect(row1.x).toBe(10)
+    expect(row1.x + row1.w).toBeCloseTo(110, 5)
+  })
+
+  it('T3-b 双行交替夹具：行 1/行 2 片段按 y 序交错（a1,b1,b2,a2——行 1 后段殿后），行 2 两段为高度不可比的 tall 变体——全簇比较下 2 块（各行 x 并集），旧实现拆 3 簇（行 1 双块=锯齿）', () => {
+    const a1 = px(10, 100, 30, 12) // 行 1 段 1
+    const b1 = px(200, 101, 30, 26) // 行 2 tall 段 1
+    const a2 = px(50, 102, 30, 10) // 行 1 段 2（y 序殿后——与末簇（行 2）高度不可比）
+    const b2 = px(240, 101, 30, 26) // 行 2 tall 段 2（与 b1 同基线——y 序在 a2 前）
+    const out = mergeLineRects([a1, b1, a2, b2], 600)
+    expect(out.length).toBe(2)
+    const row1 = out.find((r) => r.h <= 12)!
+    const row2 = out.find((r) => r.h > 12)!
+    expect(row1.x).toBe(10)
+    expect(row1.x + row1.w).toBeCloseTo(80, 5) // a1∪a2 = 10..80
+    expect(row2.x).toBe(200)
+    expect(row2.x + row2.w).toBeCloseTo(270, 5) // b1∪b2 = 200..270
+  })
+})

```

## 6. 实现者声明摘要

- 22 用例单测(六组:项矩形/细分[含取证 §9-4 缺口补:CJK+emoji/RTL/竖排/旋转 v 投影]/偏移表/基线分组/bands 同源/G2)+变异红证 5 组(M1 RTL 删/M2 基线容差×100/M3 G2 阈值 0.5/M4 grapheme→UTF-16/M6 角度门摘除);接线测试 6 用例+M5 通道断链 6/6 红。
- verify 152 文件/1314 用例/locks 275 亲验 exit 0(主控复核亦 exit 0)。
- 第三轮取证(r3c):健康页 paint 42/10/3 逐位不变+右溢 0+outside 不增;IoU_x 全升(0.9996→0.9999/0.9982→1/0.9998→1);s1rot 零高伪迹块构造性消除;s2crop 项几何侧 G2 零触发+IoU 1(outside 1/8=D O M span 域伪迹,A2 计数器域——本票不动 TextLayer);tick gBCR 709→18/gCS 2734→685(通道生效);调度未动间隔 ~200ms。
- 超票面申报:selection-item-chain.test.tsx 新件(接线面红证锚);baselineGroupBlocks 补 x 断段(票面「并集/断段」文字);mergeRects 角度门(r3b 事故修复);两事故档目录 f-a6-diag-out-r3a/-r3b 留档。

## 7. 裁决表 §11 第三轮对照全文

## 11 阶段 3 迁移后第三轮对照（F-A6-b2，2026-09-04）

**迁移落地面**：pdf-item-geometry.ts（项声明几何纯函数件——viewport transform/Util.transform 数学自 pdf.mjs 4.10.38 内联[零 INV-16 面]+偏移表[剔空串项]+grapheme 细分[RTL 翻转/竖排轴互换]+基线分组并块[口径2+bands 同源 C5]+G2 检测器[阈值 5%/2px 常量导出]）；下钻通道=page-items.store（zustand 单源注册表——PagesOverlay pageTexts useState 整体迁入[写者唯三口同构]，SelectionLayer evaluate 时刻 getState 直读[zoom 现读/viewport 现构]）；SelectionLayer evaluate 域拆 selection-evaluate.ts（组件 ≤250 红线触发——票面预判条款）+产链切换（项几何主链+DOM 量测回退双路，回退三因[页项缺失/偏移对账失败/计算异常]不静默 warn）+保存链 rects 同源（INV-58 前半）；G2 挂点 active（拖选期 setPaint(null)+mouseup/settle toast 拒绝）；T2/T3 回退加固（mergeLineRects 聚类比较扩到全部簇——annotation-merge 先例语义）。

**复跑口径**：b1 轮产物移档 `f-a6-diag-out-b1/`；修复代码 build 后经 out/renderer 生效；第三轮=`f-a6-diag-out/`。**过程两事故档（保留为 `f-a6-diag-out-r3a/`、`f-a6-diag-out-r3b/`）**：
- **r3a 项盒域差**：首版归一化减 gBCR 盒原点——viewport.transform 产出=textLayer 盒**本地**域 vs pixelBoxOf 视口绝对域，混用令全部项盒判盒外（偏离率 1）→ **G2 门全抑制（全样本 paint=0 块）**。检测器按设计拦截了错几何（「所见错即拒绝所存」的反向实战验证）；修复=盒本地帧（只消费盒宽高，取证乙轨 normPxR 同式），补域锁单测（基准盒平移 (500,300) 归一化不变+接线夹具 gBCR 非零原点）。
- **r3b 终裁桥接**：产线把 mergeRects 终裁无差别套上——旋转页视觉行（竖排段）共享 y 中心，中心 y 聚类把三行桥接成单块（s1rot paint 3→1，mLR y 盲区经终裁还魂；B2 口径 blockCountB2 数的是 mergeRects **前**基线分组块，本表 §10 该列因此未暴露）。修复=角度门（|sin(行进角)|<0.35 近水平才过 mergeRects；旋转/竖排跳过终裁=已申报边界：INV-D 行间钳制不适用，真实库 rotate=0 全档零触发），补旋转回归单测+M6 变异红证。

**第三轮对照表（判据=票面 D-2：块数不劣化+右溢 0+健康 outside 不增；IoU_x/shift=甲 paint↔乙2[mergeRects 前]对照）**：

| 判据 | b1 轮 | 第三轮（r3c） | 达标 |
|---|---|---|---|
| 健康页 A_paint 块数（行真值 s/l） | 3882=42(43/42) / 1c2d=10(10) / s3base=3(3) | **42 / 10 / 3** | ✅ 逐位不劣化 |
| 健康页右溢 甲/乙2 | 0/0 ×3 | 0/0 ×3 | ✅ |
| 健康页 outside（A2 DOM span 口径） | 1/829 / 0/501 / 0/8 | 1/829 / 0/501 / 0/8 | ✅ 不增（A2 计数域=DOM span，非项盒——见下「s2crop 注」） |
| s1rot A_paint（行真值 3） | 3（含 2 零高伪迹块） | **3（无零高块——项几何链构造性消除 §10 预测兑现）** | ✅ |
| s2crop A_paint（行真值 3） | 3 | 3 | ✅ |
| IoU_x（甲↔乙2 配对中位） | 0.9996 / 0.9982 / — / 0.9998 / 0.9998 | **0.9999 / 1 / 0.9987 / 1 / 1** | ✅ 全样本提升（1c2d 分数 view 页 0.9982→1：甲乙同入未取整 viewport 域） |
| shift dx/dy 中位（px） | 0.02/1.79 · 0.27/0.17 · — · 0.03/−0.1 · 0.03/−0.06 | **≤0.01 全样本**（甲=乙2 同链产物按构造） | ✅ |
| tick mutation 间隔中位（ms） | 200.1 / 200.1 / 1000.8(2m) / 200 / 200.1 | **200.4 / 202 / 201(6m) / 200.5 / 200.1** | ✅ ~200ms 保持（调度未动） |
| tick 布局读 gBCR/gCS（3882） | 709 / 2734 | **18 / 685** | ✅ 大幅降=通道生效（bands 量测链+findRangeAtOffset 消失；残余 gCS=selectionToAnchor 链[红线不动]） |
| outcome2（乙2 口径三结局） | — | **全样本「同净」** | ✅ |

**s2crop outside 1/8 注（票面问项的落定）**：A2 计数器量的是 DOM span 盒（TextLayer 侧，b1 §10 归因的 span ascent 越界——本票不动 TextLayer 数学，1/8 保持）；**项几何侧**该伪迹不存在（声明几何构造不含量测伪迹）：paint 3 块+IoU 1.0+G2 零触发（被选行项盒全部在盒内——合成配方 ROW 基线 692 起，非顶缘行）。

**已知边界与归因**：①real3882 covAB2 0.881（aToB 配对覆盖率）：甲 paint 过 mergeRects 终裁（INV-D 钳制微移 y 中心）vs 乙2=mergeRects 前块，紧行 y 中心门 |Δcy|≤(ha+hb)/2+2px 拒 5/42 对——covB2A=1+配对 IoU 0.9999+同净，非几何劣化（配对器为诊断件非判据）；②s1rot covB2A 0.3333=配对器横排 y 假定对竖排形态的 §9-4 既有盲区（b1 表已 N/A 同款）；③旋转/竖排内容跳过 mergeRects 终裁（r3b 修复面）——行间钳制不适用已申报，真实库零触发；④grapheme 细分/RTL/竖排运行时触发面仍零（单测已补——§9-4 缺口闭合于 tests，运行时数据缺口仍在）。

**结论：阶段 3 主链迁移（R-迁移）落地达标**——健康页零回归（块数/outside/tick 间隔逐位持平）+病理页保持修复态（s1rot 3=行真值、s2crop 平移 0）+甲乙同链（shift≤0.01）+D2 布局读面兑现（gBCR −97%/gCS −75%）。G2 门在 r3a 事故中实证拦截错几何（active 形态有效性佐证）。

