/**
 * [F-VISFB-51] selection-column-layout —— 栏几何纯函数（视检反馈战役 B2·选区
 * 泳道 B1 波次补跑；§0-4 裁决「选区语义=鼠标位置+栏布局判定；跨双栏需指针
 * 明确入栏授权」的几何判定基元——52 指针授权手势票接线消费，本票零改现有件）。
 *
 * ── 行为层 ──
 * - detectColumnLayout(boxes)：文本行盒纯数据 → 栏划分（视觉左右序）+中缝
 *   量测+跨栏行/旋转盒分流，三段式：
 *   ①旋转盒分流：h > 3×w 判竖排形态（transform 后几何）→入 rotated、不参与
 *     行带聚类（若混入，跨行 y 链会把整页拉通成一条行带毁掉栏检测）。阈值 3
 *     校准：单字形行（bullet「•」形 4w×10h，比值 2.5）不误伤，真竖排行（行高
 *     12×行长 ≥36，比值 >3——恰 3 不锁、严格大于）锁住。
 *   ②行带聚类+中缝投票：y 重叠传递链聚行带（相切不算重叠）→每条多盒行带内
 *     最宽正宽间隙=该带中缝候选；候选交集（left 取 max/right 取 min）且法定
 *     带数 ≥2（MIN_GUTTER_BANDS——单带两段=词隙级偶发不立缝）成立即双栏态，
 *     否则单栏态。投票带各贡献缝两侧 ≥1 盒（最宽间隙左右邻盒，x1 ≤ 各带候选
 *     left ≤ 缝 left / x0 ≥ 候选 right ≥ 缝 right），故双栏态左右栏恒非空。
 *   ③x 区间归栏：跨中缝开区间的行=全宽带（不并入任何栏——票面「跨栏行不
 *     并入任何栏」；x1 恰触缝左界相切不算跨）；缝左侧整体落左栏、右侧落右栏。
 *     栏按 x0 视觉左右序输出；栏内 boxes 保持输入（DOM）序、成员=输入引用
 *     恒定（52 消费合同）。
 * - authorizeColumnSpan(layout, span)：授权判定——零栏态=no-columns 不授权；
 *   单栏态=无歧义恒授权 single；双栏态=span（内部归一，anchor/focus 传入序
 *   无关）跨中缝开区间 → 不授权 cross-gutter（票面「中缝不授权」——INV-142
 *   几何判定面：锚定/选区跨中缝时不产生栏授权，为 52 的 effective selection
 *   判定预埋，本票只锁纯函数合同），其余按缝两侧定栏（贴边相切授权所在侧
 *   ——缝=开区间语义）。
 * - 语义校准：与 0C 双栏 fixture（tests/utils/pdf-factory createTwoColumnPdf）
 *   结构对齐——全宽标题带+左右栏（左 x=54/右 x=318）+中缝 24pt（[294,318]）
 *   形态；纯函数零 fixture 文件依赖（测试直构行盒）。全宽带判定=x 跨缝信号、
 *   y 隔离不参与（纯几何域无「标题」语义；0C fixture 实际标题行 x1 未跨缝者
 *   按侧归栏——52 持最终语义裁量）。
 *
 * ── 接口层 ── / ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - 全纯函数零 React/DOM 依赖（输入=行盒纯数据 {x,y,w,h}——selection-geometry
 *   同域先例：几何域函数导出直测）。测试=tests/unit/renderer/
 *   selection-column-layout.test.ts（always-active，不经 guardedDescribe）。
 * - 消费面=52（selection-evaluate 接线）；本票不触 SelectionLayer/
 *   selection-evaluate/release-affinity/selection-paint。
 */
/** 竖排形态阈值：h > 3×w 判旋转盒（transform 后几何——行高主导的竖排 run） */
const ROTATED_ASPECT = 3
/** 中缝法定带数：≥2 条多盒行带候选交集才立缝（单带两段=词隙级偶发） */
const MIN_GUTTER_BANDS = 2

/** 文本行盒（纯数据——调用方自 DOM/项几何量测后传入；坐标域由调用方定） */
export interface LineBox {
  x: number
  y: number
  w: number
  h: number
}

/** 栏标识（视觉序：left/right=双栏两栏；single=单栏唯一栏） */
export type ColumnId = 'left' | 'right' | 'single'

/** 中缝带（开区间语义：跨缝=lo < right && hi > left，贴边相切不算跨） */
export interface GutterBand {
  left: number
  right: number
}

/** 栏带：x0/x1=成员行盒水平包络；boxes=输入（DOM）序成员、成员=输入引用 */
export interface ColumnBand {
  id: ColumnId
  x0: number
  x1: number
  boxes: LineBox[]
}

/** 栏划分形态：none=零盒/全竖排；single=无中缝；two-column=中缝成立 */
export type ColumnLayoutKind = 'none' | 'single' | 'two-column'

/** 栏划分结果（fullSpan=跨缝行、rotated=竖排行——均不并入任何栏） */
export interface ColumnLayout {
  kind: ColumnLayoutKind
  columns: ColumnBand[]
  fullSpan: LineBox[]
  rotated: LineBox[]
  gutter: GutterBand | null
}

/** 授权判定结果（未授权态携带 reason；「中缝不授权」=cross-gutter 态） */
export type ColumnAuthorization =
  | { authorized: true; columnId: ColumnId }
  | { authorized: false; reason: 'no-columns' | 'cross-gutter' }

/** 栏划分：旋转分流 → 行带聚类+中缝投票 → x 区间归栏（头注行为层三段式） */
export function detectColumnLayout(boxes: readonly LineBox[]): ColumnLayout {
  const rotated: LineBox[] = []
  const flat: LineBox[] = []
  for (const b of boxes) {
    if (b.h > b.w * ROTATED_ASPECT) {
      rotated.push(b)
    } else {
      flat.push(b)
    }
  }
  if (flat.length === 0) {
    return { kind: 'none', columns: [], fullSpan: [], rotated, gutter: null }
  }
  const gutter = detectGutter(rowBands(flat))
  if (gutter === null) {
    return { kind: 'single', columns: [bandOf('single', flat)], fullSpan: [], rotated, gutter: null }
  }
  const left: LineBox[] = []
  const right: LineBox[] = []
  const fullSpan: LineBox[] = []
  for (const b of flat) {
    if (b.x < gutter.right && b.x + b.w > gutter.left) {
      fullSpan.push(b)
    } else if (b.x + b.w <= gutter.left) {
      left.push(b)
    } else {
      right.push(b)
    }
  }
  const columns = [bandOf('left', left), bandOf('right', right)]
  return { kind: 'two-column', columns, fullSpan, rotated, gutter }
}

/** 行带聚类：y 重叠传递链（按 y 排序逐盒对照带内 maxY；相切不算重叠） */
function rowBands(boxes: LineBox[]): LineBox[][] {
  const sorted = [...boxes].sort((a, b) => a.y - b.y || a.x - b.x)
  const bands: LineBox[][] = []
  let cur: LineBox[] | null = null
  let curMaxY = 0
  for (const b of sorted) {
    if (cur !== null && b.y < curMaxY) {
      cur.push(b)
      curMaxY = Math.max(curMaxY, b.y + b.h)
    } else {
      cur = [b]
      curMaxY = b.y + b.h
      bands.push(cur)
    }
  }
  return bands
}

/** 中缝投票：多盒行带各取最宽正宽间隙为候选（同宽取先到=最左），交集立缝 */
function detectGutter(bands: LineBox[][]): GutterBand | null {
  const cands: GutterBand[] = []
  for (const band of bands) {
    if (band.length < 2) {
      continue
    }
    let best: GutterBand | null = null
    let prev: LineBox | null = null
    for (const b of [...band].sort((p, q) => p.x - q.x)) {
      if (prev !== null) {
        const gapLeft = prev.x + prev.w
        const gapRight = b.x
        if (gapRight > gapLeft && (best === null || gapRight - gapLeft > best.right - best.left)) {
          best = { left: gapLeft, right: gapRight }
        }
      }
      prev = b
    }
    if (best !== null) {
      cands.push(best)
    }
  }
  if (cands.length < MIN_GUTTER_BANDS) {
    return null
  }
  const left = Math.max(...cands.map((c) => c.left))
  const right = Math.min(...cands.map((c) => c.right))
  return right - left > 0 ? { left, right } : null
}

/** 栏带装配：水平包络+输入序成员（引用恒定——52 消费合同） */
function bandOf(id: ColumnId, boxes: LineBox[]): ColumnBand {
  return {
    id,
    x0: Math.min(...boxes.map((b) => b.x)),
    x1: Math.max(...boxes.map((b) => b.x + b.w)),
    boxes
  }
}

/** 授权判定（头注行为层：零栏不授权/单栏恒授权/双栏跨缝不授权+两侧定栏） */
export function authorizeColumnSpan(
  layout: ColumnLayout,
  span: { x0: number; x1: number }
): ColumnAuthorization {
  if (layout.columns.length === 0) {
    return { authorized: false, reason: 'no-columns' }
  }
  const gutter = layout.gutter
  if (gutter === null) {
    return { authorized: true, columnId: 'single' }
  }
  const lo = Math.min(span.x0, span.x1)
  const hi = Math.max(span.x0, span.x1)
  if (lo < gutter.right && hi > gutter.left) {
    return { authorized: false, reason: 'cross-gutter' }
  }
  return { authorized: true, columnId: hi <= gutter.left ? 'left' : 'right' }
}
