/**
 * [F-LANEGRID-01 B1] grid —— 车道网格层·车道表生成纯函数（设计稿
 * docs/design/2026-11-19_f-lanegrid01-design.md §2 网格模型+§2.5 手推算例；
 * 裁决记录 docs/design/2026-11-19_lane-grid-rerouting.md 裁决②全图一张随
 * 布局派生/裁决③车道 x 域=月框 border-box 内缘不超框）。车道=坐标常量线
 * （竖道 x 常量/横道 y 常量）配逐段生死区间；五族生成（锚道/间隙道/边侧道
 * /外区带/帧顶底带——帧顶底带=逐帧首行上带/末行下带：月标/年份头在场时
 * 全局外区带锚定首末障碍，帧内首行上方带须由帧内卡顶独立派生〔设计
 * §2.5-⑤〕）统一锚定公式「锚定边±(LANE_INSET+LANE_PITCH·k)」，k≥0 至
 * 对边−LANE_INSET 止；每轴收集→量化→去重→坐标升序全序枚举 id（族来源
 * 不透出，坐标即身份）。死区=障碍三源（实卡∪月标注∪年份头）按 avoid.PAD
 * 膨胀后与车道求交，alive=域内补集（障碍切口端开——收缩 CELL_EPS，与
 * avoid.segHitsRect 边界相触=命中口径一致；内容域端闭；空数组的道仍
 * 保留）。B2 删 gap-cells 时
 * quant/CELL_EPS/QUANT 迁入本件单源（本批再导出锚定迁移面）。确定性红线：
 * 无随机/无 Date/无三角函数、全序枚举。纯函数零 DOM import。
 */
import type { Rect } from './anchors'
import { PAD } from './avoid'
import { CELL_EPS, QUANT, quant } from './gap-cells'
import { FRAME_BORDER } from '../capacity'

/** 车道步长（设计 §2.1：s=6/9 双值统一为 8——间距承诺由分配规则 §3.3 消费） */
export const LANE_PITCH = 8
/** 首道离卡距离（=gap-cells.SLOT_STUB 同值——B2 随 gap-cells 退役在本件收敛单源） */
export const LANE_INSET = 10

/** 网格输入（布局派生面：车道表仅依赖布局，边集变化不重建——裁决②） */
export interface GridInput {
  /** 实卡矩形（own 内容域） */
  cards: ReadonlyArray<Rect>
  /** 月标注胶囊 */
  labels: ReadonlyArray<Rect>
  /** 年份头 */
  yearHeads: ReadonlyArray<Rect>
  /** 月框 border-box 矩形（全帧同宽同 x 位——x 域取全帧 min/max 合并） */
  frames: ReadonlyArray<Rect>
  /** 内容盒高（0/非有限=无效——外区带退化防御） */
  contentH: number
}

/** 闭区间（死区/存活/占用跨距共用载体） */
export interface Interval {
  lo: number
  hi: number
}

/** 车道（id=轴内坐标升序全序枚举；coord=量化 0.1 坐标常量；alive=合并排序的
 *  存活区间=死区补集——障碍切口端开（收缩 CELL_EPS：段端恰落切口端即命中，
 *  与 avoid.segHitsRect 边界相触=命中口径一致）、内容域端闭；空数组=全程
 *  被杀仍保留在表中） */
export interface Lane {
  id: number
  coord: number
  alive: Interval[]
}

/** 车道表（v=竖道·x 常量/h=横道·y 常量；frames 空 → 全表空） */
export interface LaneTable {
  v: Lane[]
  h: Lane[]
}

/** [B2 迁移锚点] 量化步进/相等容差单源=gap-cells（B2 删 gap-cells 时迁入本件——本批不复制常量，再导出承接） */
export { CELL_EPS, QUANT }

/** 锚定公式道位系数（锚道 ¼/½/¾ 位——128 卡=左+32/64/96、72 高=顶+18/36/54 同值） */
const ANCHOR_FRACTIONS = [0.25, 0.5, 0.75] as const

/** 锚定边向上/右车道枚举：anchor+LANE_INSET+LANE_PITCH·k ≤ hi（k≥0，含边界；宽不足 2×LANE_INSET → 无道） */
function lanesUp(anchor: number, hi: number): number[] {
  const out: number[] = []
  for (let k = 0; anchor + LANE_INSET + k * LANE_PITCH <= hi; k++) {
    out.push(quant(anchor + LANE_INSET + k * LANE_PITCH))
  }
  return out
}

/** 锚定边向下/左车道枚举：anchor−LANE_INSET−LANE_PITCH·k ≥ lo（k≥0，含边界） */
function lanesDown(anchor: number, lo: number): number[] {
  const out: number[] = []
  for (let k = 0; anchor - LANE_INSET - k * LANE_PITCH >= lo; k++) {
    out.push(quant(anchor - LANE_INSET - k * LANE_PITCH))
  }
  return out
}

/** 行（卡按量化 y 分组取行顶；h=该行卡最大高度——布局恒 72 不硬编码；cards=x 升序） */
interface Row {
  top: number
  h: number
  cards: Rect[]
}

/** 行分组（跨帧全局：行顶去重升序——跨帧相邻行顶对自然生成框间走廊，不按帧分割） */
function rowsOf(cards: readonly Rect[]): Row[] {
  const byTop = new Map<number, Rect[]>()
  for (const c of cards) {
    const t = quant(c.y)
    const arr = byTop.get(t)
    if (arr === undefined) byTop.set(t, [c])
    else arr.push(c)
  }
  return [...byTop.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([top, cs]) => ({
      top,
      h: Math.max(...cs.map((c) => c.h)),
      cards: [...cs].sort((a, b) => a.x - b.x || a.x + a.w - (b.x + b.w))
    }))
}

/** 障碍膨胀（PAD=6——avoid 单源沿承） */
const inflate = (o: Rect): Rect => ({ x: o.x - PAD, y: o.y - PAD, w: o.w + 2 * PAD, h: o.h + 2 * PAD })

/** 死区间收集：车道坐标落膨胀矩形坐标轴投影内（含边界相触——PAD≤ 命中口径沿承）→ 展向轴区间死 */
function deadOf(axis: 'v' | 'h', coord: number, inflated: readonly Rect[]): Interval[] {
  const out: Interval[] = []
  for (const r of inflated) {
    const c0 = axis === 'v' ? r.x : r.y
    const c1 = c0 + (axis === 'v' ? r.w : r.h)
    if (coord >= c0 - CELL_EPS && coord <= c1 + CELL_EPS) {
      const s0 = axis === 'v' ? r.y : r.x
      out.push({ lo: s0, hi: s0 + (axis === 'v' ? r.h : r.w) })
    }
  }
  return out
}

/** 区间合并（升序排序；相触/重叠合一——零测度缝不留） */
function mergeIntervals(ivs: readonly Interval[]): Interval[] {
  const sorted = [...ivs].sort((a, b) => a.lo - b.lo || a.hi - b.hi)
  const out: Interval[] = []
  for (const iv of sorted) {
    const last = out[out.length - 1]
    if (last !== undefined && iv.lo <= last.hi) last.hi = Math.max(last.hi, iv.hi)
    else out.push({ ...iv })
  }
  return out
}

/** 域内补集。口径：障碍切口端开（alive 在切口端收缩 CELL_EPS——avoid.
 *  segHitsRect 边界相触=命中，段端恰落切口端即命中、须让出 ε 才判净空；
 *  含切口恰触域界的等号态——切口性质优先于域界闭）、内容域端闭（域界
 *  非障碍，端点原值可用）；收缩后正长度>CELL_EPS 才留 */
function complementOf(dead: readonly Interval[], lo: number, hi: number): Interval[] {
  const out: Interval[] = []
  let cur = lo
  let curIsCut = false // cur 落点性质：false=域界（闭）/true=障碍切口端（开）
  let hiIsCut = false // hi 落点性质：死区起缘恰触域上界（d.lo===hi）时为切口
  for (const d of dead) {
    if (cur >= hi) break
    if (d.lo >= hi) {
      if (d.lo === hi) hiIsCut = true
      break
    }
    if (d.lo > cur) out.push({ lo: curIsCut ? cur + CELL_EPS : cur, hi: d.lo - CELL_EPS })
    if (d.hi >= cur) {
      // 含等号：死区止缘恰触 cur（如域下界）=切口端（相触即命中）
      cur = Math.max(cur, d.hi)
      curIsCut = true
    }
  }
  if (cur < hi) out.push({ lo: curIsCut ? cur + CELL_EPS : cur, hi: hiIsCut ? hi - CELL_EPS : hi })
  return out.filter((iv) => iv.hi - iv.lo > CELL_EPS)
}

/**
 * 车道表生成（纯函数：同输入恒同输出——裁决②布局派生）。五族候选收集→
 * 量化去重→轴内坐标升序全序枚举；alive=障碍膨胀死区在车道域内补集。
 */
export function buildLaneTable(inp: GridInput): LaneTable {
  // frames 空 → 全表空（x 域不存在，车道域无从定义）
  if (inp.frames.length === 0) return { v: [], h: [] }
  // 车道 x 域=全帧 border 内缘合并（裁决③不超框左右界；FRAME_BORDER=capacity
  // 单源）；域界量化对齐 0.1 格（与车道坐标同格——frame 浮点坐标经 ±FRAME_BORDER
  // 的 IEEE 漂移〔如 −1.6+453.2−1.6→449.999…94〕不蚀掉恰落域界的道）
  const xLo = quant(Math.min(...inp.frames.map((f) => f.x)) + FRAME_BORDER)
  const xHi = quant(Math.max(...inp.frames.map((f) => f.x + f.w)) - FRAME_BORDER)
  // y 域=[0, contentH]（域界同量化对齐）；contentH 无效（0/非有限）→ y 域空
  // （外区带另见族 4 退化防御）
  const yHi =
    Number.isFinite(inp.contentH) && inp.contentH > 0 ? quant(inp.contentH) : 0
  const obstacles = [...inp.cards, ...inp.labels, ...inp.yearHeads]
  const vCand: number[] = []
  const hCand: number[] = []
  /** 候选落域入列（量化+CELL_EPS 容差域判） */
  const push = (arr: number[], c: number, lo: number, hi: number): void => {
    const q = quant(c)
    if (q >= lo - CELL_EPS && q <= hi + CELL_EPS) arr.push(q)
  }
  // ── 族 1 锚道：每卡 ¼/½/¾ 位（竖=x 位/横=y 位），承载桩与 0 拐直连 ──
  for (const c of inp.cards) {
    for (const f of ANCHOR_FRACTIONS) {
      push(vCand, c.x + c.w * f, xLo, xHi)
      push(hCand, c.y + c.h * f, 0, yHi)
    }
  }
  // ── 族 2 间隙道：行隙=相邻行顶对走廊 [t_k+rowH_k, t_{k+1}]（跨帧统一）；
  //    列隙=行内 x 升序相邻卡对走廊 [右卡右缘, 右邻左缘]（按行分组·按相位） ──
  const rows = rowsOf(inp.cards)
  for (let i = 1; i < rows.length; i++) {
    const corridorStart = rows[i - 1]!.top + rows[i - 1]!.h
    for (const y of lanesUp(corridorStart, rows[i]!.top - LANE_INSET)) push(hCand, y, 0, yHi)
  }
  for (const row of rows) {
    for (let i = 1; i < row.cards.length; i++) {
      const a = row.cards[i - 1]!
      const b = row.cards[i]!
      for (const x of lanesUp(a.x + a.w, b.x - LANE_INSET)) push(vCand, x, xLo, xHi)
    }
  }
  // ── 族 3 边侧道（竖道专属）：全局最左/最右卡外法线带至 x 域界；无卡 → 无
  //    （跨相位额外空带不生成——设计决策已备案）──
  if (inp.cards.length > 0) {
    const minLeft = Math.min(...inp.cards.map((c) => c.x))
    const maxRight = Math.max(...inp.cards.map((c) => c.x + c.w))
    for (const x of lanesDown(minLeft, xLo)) push(vCand, x, xLo, xHi)
    for (const x of lanesUp(maxRight, xHi)) push(vCand, x, xLo, xHi)
  }
  // ── 族 4 外区带（横道专属）：障碍三源并集最上/最下缘外法线带（上≥0 止/
  //    下≤contentH−LANE_INSET 止）；障碍空或 contentH 非有限/≤0 → 空集
  //    （退化防御——空图不产生无锚定边外区）──
  if (obstacles.length > 0 && Number.isFinite(inp.contentH) && inp.contentH > 0) {
    const minTop = Math.min(...obstacles.map((o) => o.y))
    const maxBottom = Math.max(...obstacles.map((o) => o.y + o.h))
    for (const y of lanesDown(minTop, 0)) push(hCand, y, 0, yHi)
    for (const y of lanesUp(maxBottom, yHi - LANE_INSET)) push(hCand, y, 0, yHi)
  }
  // ── 族 5 帧顶底带（横道专属）：逐帧首行上带 y=firstRowTop−LANE_INSET−
  //    PITCH·k（≥0 止）/末行下带 y=lastRowBottom+LANE_INSET+PITCH·k（≤
  //    contentH−LANE_INSET 止）——设计 §2.5-⑤：月标/年份头在场时全局外区带
  //    锚定最上障碍，帧内首行上方带须由帧内卡顶独立派生；卡按中心点落帧
  //    rect 归属、无卡帧跳过；与全局外区带同管道去重吸收（首末帧重合场景）；
  //    contentH 无效同外区带退化防御 → 空（y 域已退化，不产帧带）──
  if (Number.isFinite(inp.contentH) && inp.contentH > 0) {
    for (const f of inp.frames) {
      const inFrame = inp.cards.filter(
        (c) =>
          c.x + c.w / 2 >= f.x &&
          c.x + c.w / 2 <= f.x + f.w &&
          c.y + c.h / 2 >= f.y &&
          c.y + c.h / 2 <= f.y + f.h
      )
      if (inFrame.length === 0) continue
      const firstRowTop = Math.min(...inFrame.map((c) => c.y))
      const lastRowBottom = Math.max(...inFrame.map((c) => c.y + c.h))
      for (const y of lanesDown(firstRowTop, 0)) push(hCand, y, 0, yHi)
      for (const y of lanesUp(lastRowBottom, yHi - LANE_INSET)) push(hCand, y, 0, yHi)
    }
  }
  // ── 成表：坐标即身份（族来源不透出）——去重升序枚举 id+死区补集 ──
  const inflated = obstacles.map(inflate)
  const finalize = (cands: number[], axis: 'v' | 'h'): Lane[] => {
    const spanLo = axis === 'v' ? 0 : xLo
    const spanHi = axis === 'v' ? yHi : xHi
    return [...new Set(cands)]
      .sort((a, b) => a - b)
      .map((coord, id) => ({
        id,
        coord,
        alive: complementOf(mergeIntervals(deadOf(axis, coord, inflated)), spanLo, spanHi)
      }))
  }
  return { v: finalize(vCand, 'v'), h: finalize(hCand, 'h') }
}
