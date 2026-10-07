/**
 * [F-SLOTGRID-01 U2] detour —— 段式近绕专态+网格通道模型（设计 v1.4 §5.3
 * detour 段式七步+§2 纵通道段/边侧通道/候选全序；2026-10-07 用户裁决①③）。
 *
 * 网格通道模型（W18 网格基）：纵通道段=行带 r 内列 k−1|k 间竖带 x∈[
 * fx0+12+φ_r+200(k−1)+128, +72)，y 域=该行带——**按网格容量虚拟存在与实卡
 * 分布解耦**（空卡位区=通道域组成部分非障碍——用户裁决「空卡片可以随意穿」；
 * 障碍集恒=实卡∪月标注∪年份头，见 chain.allObstacles）；列间段 k=1..cap_r−1
 * 恒在；边侧通道（左缘宽 12+φ_r/右缘宽 W−128−φ_r−200(cap_r−1)——框内缘
 * 边界 W17 口径）入候选集（就近性优先）。通道槽位=gap-cells slotPositions
 * 单源（域=通道宽−20/n=clamp(⌊(域−8)/8⌋,0,5)/k/(n+1) 分点——INV-SLOTGRID-02
 * 坐标集封闭）。
 *
 * detour 段式七步：①分段（阻挡带集=主轴竖线 x₀ 与障碍集求交的 y 区间集，
 * 相邻夹缝<28 合并〔桩 20+L_min 8 横移夹缝判据〕）②仅被阻段换列（未受阻段
 * 沿 x₀ 直降）③候选枚举=槽位级全序（被阻段遍历序〔近源先〕→构线拐弯数
 * 升序→|槽位 x−x₀| 升序→槽位 x 升序——v1.4 用户裁决字典序；门形候选拐弯
 * 数恒同故距离键直接生效）+槽位级空槽判定（ChannelUse——N17）④净空判定
 * （静态预过滤+全链 polylineClearStubs 复检沿承，统一含标注矩形）⑤构线
 * （出桩 10→横带/框间带槽位 y 横移〔带封闭<36 时首/末段=桩端水平线、中段
 * =夹缝中点〕→段内纵降→末段横移回 x₀→入桩；相邻被阻段同槽=单侧移贯通、
 * 异槽=夹缝槽位 y 处回 x₀ 再移出）⑥候选枚举尽→null 降 band ⑦观测
 * （state=detour+detourMarks 各被阻段「槽位 x:Δx」）。
 *
 * 确定性红线：无随机/无 Date/无三角函数——并列一律字典序/数值序。纯函数
 * 零 DOM import（capacity.ts 常量只读消费）。
 */
import { capacities, phaseOfRow, CARD_H, CARD_W, FRAME_PAD_LEFT, FRAME_PAD_TOP, PITCH_X, PITCH_Y } from '../capacity'
import type { PickedAnchor, Pt, Rect, Side } from './anchors'
import { stubEnd } from './anchors'
import { PAD, polylineClearStubs, segHitsAny } from './avoid'
import type { LayoutSnapshot } from './chain'
import { midSlotOf, quant, slotPositions } from './gap-cells'

/** 月框边框宽（.month-frame border 1.6px——快照 border-box 坐标换算用） */
const FRAME_BORDER = 1.6
/** 阻挡带合并阈（相邻夹缝<28 合并=桩 20+L_min 8 横移夹缝判据——设计 §2 阻挡带集） */
export const BLOCK_MERGE_GAP = 28

/** 网格纵通道段（行带内虚拟竖带；slots=通道槽位 x 序列——单源公式） */
export interface GridChannel {
  key: string
  xLo: number
  yLo: number
  yHi: number
  slots: number[]
}

/** 通道槽占用注册表（AnchorUse 同型：仅胜出态落记——失败尝试不占槽无需释放） */
export class ChannelUse {
  private readonly used = new Map<string, Map<number, string>>()

  has(key: string, slotIdx: number): boolean {
    return this.used.get(key)?.has(slotIdx) ?? false
  }

  commit(key: string, slotIdx: number, edgeId: string): void {
    const per = this.used.get(key)
    if (per !== undefined) per.set(slotIdx, edgeId)
    else this.used.set(key, new Map([[slotIdx, edgeId]]))
  }
}

/** 候选全序比较器（设计 §2 Δx/候选全序——v1.4 字典序）：拐弯数升序（x===curX
 *  =0 拐、否则 2 拐——「少拐优先」；detour 门形域内 curX=x₀ 恒异=键退化为距
 * 离，band 下降域内就地候选恒先）→|x−refX| 升序→x 升序。严格数值序无魔数 */
export function byTotalOrder<T extends { x: number }>(refX: number, curX: number): (a: T, b: T) => number {
  return (a, b) => {
    const ta = a.x === curX ? 0 : 2
    const tb = b.x === curX ? 0 : 2
    return ta - tb || Math.abs(a.x - refX) - Math.abs(b.x - refX) || a.x - b.x
  }
}

/** 框内网格行集（卡中心 y→行号聚整；行带=[fy0+18+144r, +72) border-box 坐标） */
function rowsOfFrame(f: { x: number; y: number; w: number; h: number }, cards: readonly Rect[]): Map<number, { top: number }> {
  const fy0 = f.y + FRAME_BORDER
  const rows = new Map<number, { top: number }>()
  for (const c of cards) {
    const cx = c.x + c.w / 2
    const cy = c.y + c.h / 2
    if (cx < f.x || cx > f.x + f.w || cy < f.y || cy > f.y + f.h) continue
    const r = Math.round((cy - fy0 - FRAME_PAD_TOP - CARD_H / 2) / PITCH_Y)
    if (r < 0) continue
    if (!rows.has(r)) rows.set(r, { top: fy0 + FRAME_PAD_TOP + PITCH_Y * r })
  }
  return rows
}

const chanCache = new WeakMap<LayoutSnapshot, GridChannel[]>()

/** 网格通道全集（逐框逐行：列间段 k=1..cap−1+左右边侧道；快照级 WeakMap 缓存
 *  ——routeAll 逐边复用零重算） */
export function gridChannelsOf(snap: LayoutSnapshot): GridChannel[] {
  const cached = chanCache.get(snap)
  if (cached !== undefined) return cached
  const cards = [...snap.cards.values()]
  const out: GridChannel[] = []
  for (const f of snap.frames) {
    const fx0 = f.x + FRAME_BORDER
    // W=框内容宽（设计 §2 容量行：内容区=[12,12+W)——border-box 换算=减双边框与双 padding）
    const w = f.w - 2 * FRAME_BORDER - 2 * FRAME_PAD_LEFT
    const caps = capacities(w)
    for (const [r, row] of rowsOfFrame(f, cards)) {
      const phi = phaseOfRow(r)
      const cap = r % 2 === 0 ? caps.n : caps.m
      const bands: Array<[number, number]> = []
      for (let k = 1; k < cap; k++) bands.push([FRAME_PAD_LEFT + phi + PITCH_X * (k - 1) + CARD_W, PITCH_X - CARD_W])
      bands.push([0, FRAME_PAD_LEFT + phi]) // 左缘（偶 12 封/奇 112 开）
      bands.push([FRAME_PAD_LEFT + phi + PITCH_X * (cap - 1) + CARD_W, w - CARD_W - phi - PITCH_X * (cap - 1)]) // 右缘（框内缘边界）
      for (const [off, width] of bands) {
        if (width <= 0) continue
        const xLo = quant(fx0 + off)
        const slots = slotPositions('x', { x: xLo, y: row.top, w: quant(width), h: CARD_H })
        if (slots.length < 1) continue // 通道封闭（宽<36⇔n=0）
        out.push({ key: `${xLo}|${quant(row.top)}`, xLo, yLo: row.top, yHi: row.top + CARD_H, slots })
      }
    }
  }
  chanCache.set(snap, out)
  return out
}

/** 阻挡带集（主轴竖线 x₀×障碍集 PAD 膨胀求交→裁剪至桩端域→夹缝<28 合并） */
export function blockingBands(x0: number, y1: number, y2: number, obstacles: readonly Rect[]): Array<[number, number]> {
  const lo = Math.min(y1, y2)
  const hi = Math.max(y1, y2)
  const ivs: Array<[number, number]> = []
  for (const o of obstacles) {
    if (x0 < o.x - PAD || x0 > o.x + o.w + PAD) continue
    const a = Math.max(o.y - PAD, lo)
    const b = Math.min(o.y + o.h + PAD, hi)
    if (b > a) ivs.push([a, b])
  }
  ivs.sort((p, q) => p[0] - q[0] || p[1] - q[1])
  const merged: Array<[number, number]> = []
  for (const [a, b] of ivs) {
    const last = merged[merged.length - 1]
    if (last !== undefined && a - last[1] < BLOCK_MERGE_GAP) last[1] = Math.max(last[1], b)
    else merged.push([a, b])
  }
  return merged
}

/** detour 结果（skel=骨架点链；picks=生效锚；detourMarks=被阻段「x:Δx」逗号串） */
export interface DetourRoute {
  skel: Pt[]
  picks: Array<[string, Side, number]>
  detourMarks: string
}

/** 横移取位（带槽位 y 单源；首/末夹缝封闭<36=桩端水平线〔设计 §2 横移合法域①〕，
 *  中段夹缝封闭=中点——全链复检兜底） */
function moveYOf(strip: readonly [number, number], stubLine: 'first' | 'last' | 'none'): number {
  const slot = midSlotOf('y', { x: 0, y: strip[0], w: 0, h: strip[1] - strip[0] })
  if (slot !== null) return slot
  if (stubLine === 'first') return strip[0]
  if (stubLine === 'last') return strip[1]
  return (strip[0] + strip[1]) / 2
}

/** 段内静态净空预过滤（候选槽 x×被阻段 y 域±2 采样窗 vs 障碍集 PAD 膨胀） */
const slotClearInBand = (x: number, band: readonly [number, number], obstacles: readonly Rect[]): boolean =>
  !segHitsAny({ x, y: band[0] - 2 }, { x, y: band[1] + 2 }, obstacles)

interface SlotCand {
  key: string
  idx: number
  x: number
}

/** detour 骨架（前置=pa/pb 竖侧锚 x 全等=x₀ 且阻挡带集非空——chain ③ 态调用；
 *  候选枚举尽→null 降 band。逐被阻段近源先 DFS×段内候选全序，首个全链
 *  polylineClearStubs 过检组合胜出=字典序取优；胜出即 commit 通道槽占用） */
export function detourSkeleton(
  srcId: string,
  tgtId: string,
  pa: PickedAnchor,
  pb: PickedAnchor,
  snap: LayoutSnapshot,
  obstacles: readonly Rect[],
  ends: readonly Rect[],
  chanUse: ChannelUse,
  edgeId: string
): DetourRoute | null {
  const x0 = pa.pt.x
  const aS = stubEnd(pa.pt, pa.side)
  const bS = stubEnd(pb.pt, pb.side)
  const down = bS.y > aS.y
  const bands = down ? blockingBands(x0, aS.y, bS.y, obstacles) : blockingBands(x0, bS.y, aS.y, obstacles).reverse()
  if (bands.length < 1) return null
  const channels = gridChannelsOf(snap)
  // 段内候选（通道 y 域与被阻段正相交；全序=距离|x−x₀|→x——门形拐弯数恒同键退化；
  // 占用剔除〔N17〕+段内静态净空预过滤）
  const order = byTotalOrder<SlotCand>(x0, x0)
  const candsPerBand: SlotCand[][] = bands.map((band) =>
    channels
      .filter((ch) => ch.yLo < band[1] && ch.yHi > band[0])
      .flatMap((ch) => ch.slots.map((x, idx) => ({ key: ch.key, idx, x })))
      .filter((c) => !chanUse.has(c.key, c.idx) && slotClearInBand(c.x, band, obstacles))
      .sort(order)
  )
  if (candsPerBand.some((c) => c.length < 1)) return null
  // 夹缝（被阻段间/首末桩端——行进序）：横移 y 取位域
  const strips: Array<[number, number]> = []
  let cursor = down ? aS.y : bS.y
  for (const band of bands) {
    strips.push([cursor, band[0]])
    cursor = band[1]
  }
  strips.push([cursor, down ? bS.y : aS.y])
  const chosen: SlotCand[] = []
  const tryBuild = (): DetourRoute | null => {
    // 构线：x₀ 直降→夹缝槽位 y 横移至槽 x→段内纵降；相邻被阻段同槽贯通/异槽回 x₀
    const wps: Pt[] = []
    let curX = x0
    for (let i = 0; i < bands.length; i++) {
      const xi = chosen[i]!.x
      const yIn = moveYOf(strips[i]!, i === 0 ? 'first' : 'none')
      wps.push({ x: curX, y: yIn }, { x: xi, y: yIn })
      const yOut = moveYOf(strips[i + 1]!, i === bands.length - 1 ? 'last' : 'none')
      wps.push({ x: xi, y: yOut })
      const next = chosen[i + 1]
      if (next === undefined || next.x !== xi) wps.push({ x: x0, y: yOut })
      curX = next !== undefined && next.x === xi ? xi : x0
    }
    wps.push({ x: x0, y: down ? bS.y : aS.y })
    const skel: Pt[] = down ? [pa.pt, aS, ...wps, pb.pt] : [pa.pt, aS, ...[...wps].reverse(), pb.pt]
    if (!polylineClearStubs(skel, ends, obstacles)) return null
    for (const c of chosen) chanUse.commit(c.key, c.idx, edgeId)
    const detourMarks = chosen.map((c) => `${quant(c.x)}:${quant(Math.abs(c.x - x0))}`).join(',')
    return {
      skel,
      picks: [
        [srcId, pa.side, pa.slot],
        [tgtId, pb.side, pb.slot]
      ],
      detourMarks
    }
  }
  const dfs = (i: number): DetourRoute | null => {
    if (i === bands.length) return tryBuild()
    for (const c of candsPerBand[i]!) {
      chosen[i] = c
      const r = dfs(i + 1)
      if (r !== null) return r
    }
    return null
  }
  return dfs(0)
}
