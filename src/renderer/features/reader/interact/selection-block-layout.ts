/**
 * [F-SELBLK-01] selection-block-layout —— PDF 文本块分割与锚块授权纯函数
 * （用户 2026-11-20 提报「页眉页脚/双栏/不同段块的拖选误卷其他文字块」；
 * 51 号栏几何件之上补水平带与段块级，52 号手势层消费本件块表）。
 *
 * ── 行为层 ──
 * - detectBlockLayout(boxes)：文本行盒纯数据 → 块表+中缝表，三级分割：
 *   L0 旋转分流（h > ROTATED_ASPECT×w——51 号同阈值导出复用）：旋转盒不入
 *     带聚类，全页聚为一枚 rotated 伪块；
 *   L1 全局水平带：平盒走 51 号 rowBands（y 重叠传递链）得行带序，相邻行带
 *     间隙（排序轴空带宽度）按双规则分裂——净空分裂 gap ≥ 0.75×medianH；
 *     字号簇分裂 gap ≥ 0.25×medianH 且两带主导字号不同（|h1−h2| ≥ 0.15×
 *     max(h1,h2)）。medianH=全部平盒高中位数（比值阈值对 zoom 不变）；
 *   L2 带内竖栏：每带独立跑 51 号 detectColumnLayout（带内 fullSpan 与中缝
 *     投票零改复用）；带内 fullSpan 盒按带聚为一枚 full-span 伪块；
 *   L3 栏内块：每栏盒集再走行带聚类+同一双规则（medianH 取该栏中位数），
 *     每段=一枚 flow 块（连续同字号正文不裂、段前距/图注净空/字号变裂）。
 *   输出合同：TextBlock { id, kind, x0,y0,x1,y1, boxes }；块内 boxes=输入
 *   （DOM）序、成员=输入引用恒定（52 号回映合同）；flow 块包络两两无交
 *   （带 y 不交+带内栏 x 不交+栏内段 y 不交），伪块包络可与 flow 相交。
 *   块表 id=表下标，块序=带序→栏左右序→栏内段序（等距回退的阅读序单源）；
 *   伪块在所属带内先于栏块、rotated 伪块居表末。
 * - authorizeBlockPoint(layout, point)：授权判定序（先命中先得）——
 *   ①rotated 成员盒含点 ②full-span 成员盒含点（伪块用盒级精确命中）③flow
 *     包络含点（包络无交=唯一）④y 落某中缝带 y 包络且 x 落缝内开区间 →
 *     不授权 in-gutter（沿 52 号「缝带无指针明确入栏授权」）⑤其余零文本区
 *     （页边距/带间净空/图表区）→ 授权欧氏距离最近的块包络，等距取块表在前
 *     ⑥零块 → 不授权 no-blocks。
 * - 几何域与方向无关：全部判定只依赖排序轴上的间隙与重叠，不依赖坐标
 *   y-up/y-down 语义（fixture 用 PDF 用户空间 y-up，控制器用 DOM 视口 y-down）。
 *
 * ── 接口层 ──
 * - export detectBlockLayout(boxes) → { blocks, gutters }；gutters=各带
 *   detectColumnLayout 的中缝带连同该带 y 包络 {left,right,y0,y1}（授权
 *   in-gutter 判定用）。
 * - export detectGlobalBands(flatBoxes) → 全局水平带（每带=输入序平盒数组）
 *   ——L1 单源，测试与诊断直读。
 * - export authorizeBlockPoint(layout, {x,y}) → {authorized:true,blockId} |
 *   {authorized:false,reason:'in-gutter'|'no-blocks'}。
 * - export TextBlock/BlockGutter/BlockLayout/BlockAuthorization 类型。
 *
 * ── 架构层 ──
 * - 全纯函数零 React/DOM 依赖；依赖单向=本件→selection-column-layout
 *   （51 号 ROTATED_ASPECT/rowBands/detectColumnLayout 导出复用，禁抄第二份）。
 *   消费面=52 号 selection-drag-controller（mousedown 授权+违例投影）。
 *
 * ── 生命周期层 ──
 * - 无状态：每次 mousedown 由调用方重新量测+调用；无缓存、无副作用。
 *
 * ── 文化层 ──
 * - 测试=tests/unit/renderer/selection-block-layout.test.ts（always-active）；
 *   阈值校准与 fixture 几何=设计稿 docs/design/2026-11-21_f-selblk01-design.md
 *   §5/§6。
 */
import {
  ROTATED_ASPECT,
  detectColumnLayout,
  rowBands,
  type LineBox
} from './selection-column-layout'

/** 净空分裂阈值：行带间隙 ≥ 0.75×medianH 即切水平带（行距级间隙不误裂） */
const BAND_CLEARANCE_RATIO = 0.75
/** 字号簇分裂的最小净空：间隙 ≥ 0.25×medianH 且两带主导字号簇不同即切 */
const BAND_FONT_GAP_RATIO = 0.25
/** 字号簇等价容差：|h1−h2| ≥ 0.15×max(h1,h2) 即视为不同簇 */
const FONT_CLUSTER_TOL = 0.15

/** 文本块（kind 三态：flow 段落块/full-span 跨缝伪块/rotated 竖排伪块） */
export interface TextBlock {
  /** 块表下标（会话锚块标识；equiv 于 blocks 数组位置） */
  id: number
  kind: 'flow' | 'full-span' | 'rotated'
  x0: number
  y0: number
  x1: number
  y1: number
  /** 成员=输入（DOM）序、引用恒定（52 号回映合同） */
  boxes: LineBox[]
}

/** 中缝带+所属全局带 y 包络（授权 in-gutter 判定用） */
export interface BlockGutter {
  left: number
  right: number
  y0: number
  y1: number
}

/** 块布局：块表+中缝表 */
export interface BlockLayout {
  blocks: TextBlock[]
  gutters: BlockGutter[]
}

/** 授权判定结果（未授权态携带 reason） */
export type BlockAuthorization =
  | { authorized: true; blockId: number }
  | { authorized: false; reason: 'in-gutter' | 'no-blocks' }

/** 排序轴包络（y0=最小 y，y1=最大 y+h；方向无关） */
interface Extent {
  y0: number
  y1: number
}

function extentOf(boxes: readonly LineBox[]): Extent {
  let y0 = Infinity
  let y1 = -Infinity
  for (const b of boxes) {
    y0 = Math.min(y0, b.y)
    y1 = Math.max(y1, b.y + b.h)
  }
  return { y0, y1 }
}

/** 中位数（偶数取中间两值均值；空集 0） */
function medianOf(values: readonly number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = sorted.length >> 1
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!
}

/** 字号同簇：差值小于容差×较大者 */
function sameFontCluster(a: number, b: number): boolean {
  return Math.abs(a - b) < FONT_CLUSTER_TOL * Math.max(a, b)
}

/** 相邻行带是否分裂（L1/L3 共用双规则；gap<0=重叠不裂） */
function shouldSplit(prev: readonly LineBox[], next: readonly LineBox[], medianH: number): boolean {
  const scale = medianH > 0 ? medianH : 1
  const gap = extentOf(next).y0 - extentOf(prev).y1
  if (gap >= BAND_CLEARANCE_RATIO * scale) return true
  if (gap < BAND_FONT_GAP_RATIO * scale) return false
  return !sameFontCluster(medianOf(prev.map((b) => b.h)), medianOf(next.map((b) => b.h)))
}

/** 行带序 → 水平带组（按双规则切分相邻行带；组内保持行带序） */
function groupRowBands(rows: readonly LineBox[][], medianH: number): LineBox[][][] {
  const groups: LineBox[][][] = []
  let cur: LineBox[][] = []
  for (const row of rows) {
    if (cur.length === 0) {
      cur = [row]
      continue
    }
    if (shouldSplit(cur[cur.length - 1]!, row, medianH)) {
      groups.push(cur)
      cur = [row]
    } else {
      cur.push(row)
    }
  }
  if (cur.length > 0) groups.push(cur)
  return groups
}

/** 成员集合保持调用方输入序（DOM 序合同） */
function pickMembers(order: readonly LineBox[], members: readonly LineBox[]): LineBox[] {
  const set = new Set(members)
  return order.filter((b) => set.has(b))
}

/**
 * 全局水平带（L1 单源）：平盒 → 行带聚类 → 双规则切分。
 * 旋转盒在此处剔除（L0 分流由 detectBlockLayout 持有，调用方传入平盒亦可）。
 */
export function detectGlobalBands(flatBoxes: readonly LineBox[]): LineBox[][] {
  const flat = flatBoxes.filter((b) => !(b.h > b.w * ROTATED_ASPECT))
  if (flat.length === 0) return []
  const medianH = medianOf(flat.map((b) => b.h))
  return groupRowBands(rowBands([...flat]), medianH).map((group) =>
    pickMembers(flat, group.flat())
  )
}

/** 栏内段块（L3）：栏盒集 → 行带聚类 → 同双规则切分 → 输入序成员 */
function splitColumn(boxes: readonly LineBox[]): LineBox[][] {
  if (boxes.length === 0) return []
  const medianH = medianOf(boxes.map((b) => b.h))
  return groupRowBands(rowBands([...boxes]), medianH).map((group) =>
    pickMembers(boxes, group.flat())
  )
}

/** 块包络（x/y 四向） */
function envelopeOf(members: readonly LineBox[]): { x0: number; y0: number; x1: number; y1: number } {
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (const b of members) {
    x0 = Math.min(x0, b.x)
    y0 = Math.min(y0, b.y)
    x1 = Math.max(x1, b.x + b.w)
    y1 = Math.max(y1, b.y + b.h)
  }
  return { x0, y0, x1, y1 }
}

/** 块布局：L0 旋转分流 → L1 全局带 → L2 带内竖栏 → L3 栏内段块+伪块 */
export function detectBlockLayout(boxes: readonly LineBox[]): BlockLayout {
  const rotated: LineBox[] = []
  const flat: LineBox[] = []
  for (const b of boxes) {
    if (b.h > b.w * ROTATED_ASPECT) rotated.push(b)
    else flat.push(b)
  }
  const blocks: TextBlock[] = []
  const gutters: BlockGutter[] = []
  const pushBlock = (kind: TextBlock['kind'], members: LineBox[]): void => {
    if (members.length === 0) return
    const env = envelopeOf(members)
    blocks.push({ id: blocks.length, kind, ...env, boxes: members })
  }
  for (const group of detectGlobalBands(flat)) {
    const layout = detectColumnLayout(group)
    const ext = extentOf(group)
    if (layout.gutter !== null) {
      gutters.push({ left: layout.gutter.left, right: layout.gutter.right, y0: ext.y0, y1: ext.y1 })
    }
    if (layout.kind === 'two-column') {
      // 带内 fullSpan 盒按带聚为一枚伪块（盒级精确命中可锚定）
      pushBlock('full-span', pickMembers(group, layout.fullSpan))
      for (const col of layout.columns) {
        for (const segment of splitColumn(col.boxes)) pushBlock('flow', segment)
      }
    } else if (layout.kind === 'single') {
      for (const segment of splitColumn(layout.columns[0]!.boxes)) pushBlock('flow', segment)
    }
  }
  // 全页旋转盒一枚伪块（表末——等距回退时常规文本优先）
  pushBlock('rotated', rotated)
  return { blocks, gutters }
}

/**
 * 授权判定（判定序见头注行为层）：rotated→full-span→flow 包络→in-gutter→
 * 最近块回退→no-blocks。指针形零宽点=调用方传 {x,y}。
 */
export function authorizeBlockPoint(
  layout: BlockLayout,
  point: { x: number; y: number }
): BlockAuthorization {
  if (layout.blocks.length === 0) return { authorized: false, reason: 'no-blocks' }
  const { x, y } = point
  const contains = (b: LineBox): boolean => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h
  for (const kind of ['rotated', 'full-span'] as const) {
    for (const block of layout.blocks) {
      if (block.kind === kind && block.boxes.some(contains)) {
        return { authorized: true, blockId: block.id }
      }
    }
  }
  for (const block of layout.blocks) {
    if (block.kind === 'flow' && x >= block.x0 && x <= block.x1 && y >= block.y0 && y <= block.y1) {
      return { authorized: true, blockId: block.id }
    }
  }
  for (const g of layout.gutters) {
    if (y >= g.y0 && y <= g.y1 && x > g.left && x < g.right) {
      return { authorized: false, reason: 'in-gutter' }
    }
  }
  // 最近块回退：矩形包络欧氏距离（平方保序），等距取块表在前
  let bestId = 0
  let bestDist = Infinity
  for (const block of layout.blocks) {
    const dx = Math.max(block.x0 - x, 0, x - block.x1)
    const dy = Math.max(block.y0 - y, 0, y - block.y1)
    const dist = dx * dx + dy * dy
    if (dist < bestDist) {
      bestDist = dist
      bestId = block.id
    }
  }
  return { authorized: true, blockId: bestId }
}
