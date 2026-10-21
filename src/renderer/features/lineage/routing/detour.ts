/**
 * [F-SLOTGRID-01 U2] detour —— 段式近绕专态+网格通道模型（设计 v1.4 §5.3
 * detour 段式七步+§2 纵通道段/边侧通道/候选全序；2026-10-07 用户裁决①③；
 * [RR1 回炉轮 1] B1/B2/B3/W1/W2 处置：上行 strips 行进序源侧起/B2 行集改
 * 框几何容量派生/B3 中段夹缝封闭=组合不可行禁中点/W1 贯通省拐全局承载/
 * W2 DFS 组合访问预算 512）。
 *
 * 网格通道模型（W18 网格基）：纵通道段=行带 r 内列 k−1|k 间竖带 x∈[
 * fx0+12+φ_r+200(k−1)+128, +72)，y 域=该行带——**行集=框几何容量派生**
 * （rows=⌊(框内容高−顶 pad−卡高)/144⌋+1——[RR1 B2] 实卡反推废弃：空行
 * （稀疏帧常态）通道缺席=假阴性降级+越界卡产幻影行；空卡位区=通道域组成
 * 部分非障碍——用户裁决「空卡片可以随意穿」；障碍集恒=实卡∪月标注∪
 * 年份头，见 chain.allObstacles）；列间段 k=1..cap_r−1 恒在；边侧通道（左缘
 * 宽 12+φ_r/右缘宽 W−128−φ_r−200(cap_r−1)——框内缘边界 W17 口径）入候选集
 * （就近性优先）。通道槽位=gap-cells slotPositions 单源（域=通道宽−20/
 * n=clamp(⌊(域−8)/8⌋,0,5)/k/(n+1) 分点——INV-SLOTGRID-02 坐标集封闭）。
 *
 * detour 段式七步：①分段（阻挡带集=主轴竖线 x₀ 与障碍集求交的 y 区间集，
 * 相邻夹缝<28 合并〔桩 20+L_min 8 横移夹缝判据——严格小于〕）②仅被阻段
 * 换列（未受阻段沿 x₀ 直降）③候选枚举=槽位级全序：**贯通解（全带同槽=
 * 最少横移次数）先于一切混合组合**〔RR1 W1——拐弯数主键在组合层的全局
 * 承载；混合组合 DFS 内 chosen[i−1] 同槽候选优先〕再按（|槽位 x−x₀|
 * 升序→槽位 x 升序——门形域拐弯数恒同距离键直接生效）+槽位级空槽判定
 * （ChannelUse——N17）。[RR2 k1-W1′/d1-W1 主控裁定] Phase B 混合 DFS
 * 贪心（prevX 同槽优先+距离序）=主控裁定的设计全序近似：Phase A 已穷尽
 * 严格最优类〔贯通=最少横移恒先试〕，残余偏差限同拐弯数类内次序（设计
 * 全序无比键）；用户裁决原语「形态上尽量少拐弯」=偏好级承载
 * ④净空判定（静态预过滤+全链 polylineClearStubs 复检
 * 沿承，统一含标注矩形）⑤构线（出桩 10→夹缝槽位 y 横移→段内纵降→末段
 * 横移回 x₀→入桩；**[RR1 B3] 中段夹缝封闭〔h<36 无槽〕=该组合不可行——
 * 设计 §2 横移合法域仅桩端水平线/横带槽位 y/框间带槽位 y 三类，禁中点
 * 发明；首/末夹缝封闭=桩端水平线〔合法域①〕**；相邻被阻段同槽=单侧移
 * 贯通（零中段横移）、异槽=中段夹缝槽位 y 处回 x₀ 再移出；**[RR1 B1]
 * strips 恒按行进序自源侧构造（down=aS 降序/up=aS 升序逆扫——目标侧终推
 * ，上行多带夹缝配对系统性修正）**⑥候选枚举尽（含组合访问预算
 * DFS_BUDGET=512 超限〔RR1 W2〕）→null 降 band ⑦观测（state=detour+
 * detourMarks 各被阻段「槽位 x:Δx」）。
 *
 * 确定性红线：无随机/无 Date/无三角函数——并列一律字典序/数值序。纯函数
 * 零 DOM import（capacity.ts 常量只读消费）。chanCache WeakMap 同一性前提
 * =buildSnapshot 每次 routeAll 产新快照对象（单次 pass 内 routeOne 共享同
 * 一引用→pass 级缓存命中；跨 pass 各自入缓存随 GC 回收——edge-overlay-geom
 * 现状满足）。
 */
import { capacities, phaseOfRow, CARD_H, CARD_W, FRAME_PAD_LEFT, FRAME_PAD_TOP, PITCH_X, PITCH_Y } from '../capacity'
import type { PickedAnchor, Pt, Rect, Side } from './anchors'
import { stubEnd } from './anchors'
import { PAD, polylineClearStubs, segHitsAny } from './avoid'
import type { LayoutSnapshot } from './chain'
import { midSlotOf, quant, slotPositions } from './gap-cells'

/** 月框边框宽（.month-frame border 1.6px——[F-DETOURW-01 起] 仅高度/坐标侧
 *  消费（fx0 换算/innerH 派生）；宽度侧容量输入已归一=snap.contentW 单源
 *  （readFrameContentWidth——INV-169②），本常量不再参与容量宽度派生 */
const FRAME_BORDER = 1.6
/** 月框底 padding（.month-frame padding-bottom 12px——capacity.ts 未导出底
 *  值，本件镜像常量；capacity 属 U1 产出件本票只读） */
const FRAME_PAD_BOTTOM = 12
/** 边框亚像素渲染容差：border 1.6px 声明在 Linux Chromium（DPR=1）used value 落定 1px
 *  （Windows 保 1.6px）——双侧至多亏 1.2px 使 innerH 低于 CARD_H 假封闭（F-PLATFORM-01
 *  探针实证：注入 border 2px 后 route 由 overlap 翻 band；实测 Linux innerH=70.8、
 *  救援阈 70.7 余量 0.1px——样式微调 border/padding 前先对账本带）。容差可及处仅幻影行，
 *  其通道经净空门（真实障碍矩形判定）无害——同头注既有口径。 */
const BORDER_SUBPIX_TOL = 1.3
/** 阻挡带合并阈（相邻夹缝<28 合并=桩 20+L_min 8 横移夹缝判据——设计 §2 阻挡带集） */
export const BLOCK_MERGE_GAP = 28
/** [RR1 W2·RR2 d1-W2/k1-N2] DFS 组合访问预算（确定性常量）：候选组合理论
 *  上界≈20³（段×候选），预算 512=**确定性的枚举提前截断**——超限返 null
 *  降 band（设计 §5.3-⑥「候选枚举尽→降 band」的预算化形态）；病态场景
 *  放弃 detour 序内解换 band 通用态承接=设计内取舍 */
export const DFS_BUDGET = 512

/** 网格纵通道段（行带内虚拟竖带；slots=通道槽位 x 序列——单源公式） */
export interface GridChannel {
  key: string
  xLo: number
  yLo: number
  yHi: number
  slots: number[]
}

/** 通道槽占用注册表（AnchorUse 同型：仅胜出态落记——失败尝试不占槽无需释放；
 *  [RR1 W3] detour/band 两态共用同一实例跨态共享——routeAll 级单源） */
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

/** [RR1 B2] 框内网格行集=框几何容量派生（与实卡分布解耦）：rows=⌊(框内容高
 *  −顶 pad−卡高)/144⌋+1，钳 ≥0——空行通道恒在（稀疏帧）、越界卡零幻影行
 *  （行数上界=框高；stretch 拖拽带期 padding-bottom 94 可能多派生末行——
 *  空域通道经净空门无害，见 gridChannelsOf 头注前提） */
function rowsFromFrame(f: { x: number; y: number; w: number; h: number }): Array<{ r: number; top: number }> {
  const fy0 = f.y + FRAME_BORDER
  const innerH = f.h - 2 * FRAME_BORDER - FRAME_PAD_TOP - FRAME_PAD_BOTTOM
  const rows = Math.max(0, Math.floor((innerH + BORDER_SUBPIX_TOL - CARD_H) / PITCH_Y) + 1)
  const out: Array<{ r: number; top: number }> = []
  for (let r = 0; r < rows; r++) out.push({ r, top: fy0 + FRAME_PAD_TOP + PITCH_Y * r })
  return out
}

const chanCache = new WeakMap<LayoutSnapshot, GridChannel[]>()

/** 网格通道全集（逐框逐行：列间段 k=1..cap−1+左右边侧道；快照级 WeakMap 缓存
 *  ——routeAll 逐边复用零重算。行集=框几何派生〔RR1 B2〕。[F-DETOURW-01] 容量
 *  输入 W=snap.contentW 快照级单值（readFrameContentWidth 归一化单源——布局/
 *  拖拽/走线三域合流 INV-169②；全月框同宽=CSS 地板结构事实 INV-169①——
 *  旧逐框 f.w−2×FRAME_BORDER−2×FRAME_PAD_LEFT 声明口径派生与布局 used 口径在
 *  帧宽 [200N−46,200N−44.8) 1.2px 窗分叉，随本票退役）；W≤0=unmeasured 零通道
 *  早退（capacities(0)=∞ 入 k 循环即死循环——jsdom/空图态真实可达；零通道→
 *  无障碍通道派生→各边直降/band 承接，与 useCapacityLayout unmeasured 降级
 *  同族，非新降级发明）） */
export function gridChannelsOf(snap: LayoutSnapshot): GridChannel[] {
  const cached = chanCache.get(snap)
  if (cached !== undefined) return cached
  // [F-DETOURW-01] W=快照 contentW（快照级单值——循环外提取，见头注）
  const w = snap.contentW
  if (!(w > 0)) {
    // unmeasured 守卫（必置）：capacities(≤0)=∞——入 k=1..cap−1 循环即死循环
    chanCache.set(snap, [])
    return []
  }
  const out: GridChannel[] = []
  for (const f of snap.frames) {
    const fx0 = f.x + FRAME_BORDER
    const caps = capacities(w)
    for (const { r, top } of rowsFromFrame(f)) {
      const row = { top }
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

/** 横移取位（带槽位 y 单源；[RR1 B3] stubY 在场=夹缝封闭时桩端水平线回退
 *  〔合法域①——仅首/末夹缝〕；中段夹缝 stubY=null：封闭即 null=组合不可行
 *  ——禁中点发明，坐标集封闭 INV-SLOTGRID-02） */
function moveYOf(strip: readonly [number, number], stubY: number | null): number | null {
  const slot = midSlotOf('y', { x: 0, y: strip[0], w: 0, h: strip[1] - strip[0] })
  if (slot !== null) return slot
  return stubY
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
 *  候选枚举尽/预算超限→null 降 band。**[RR1 W1] 贯通解（全带同槽）先于混合
 *  组合**（拐弯数主键全局承载——横移次数最少者胜）；混合 DFS 段内迭代
 *  chosen[i−1] 同槽候选优先（增量 0 拐）再按距离序。胜出即 commit 通道槽
 *  占用（ChannelUse——detour/band 跨态共享） */
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
  const order = byTotalOrder<SlotCand>(x0, x0)
  const candsPerBand: SlotCand[][] = bands.map((band) =>
    channels
      .filter((ch) => ch.yLo < band[1] && ch.yHi > band[0])
      .flatMap((ch) => ch.slots.map((x, idx) => ({ key: ch.key, idx, x })))
      .filter((c) => !chanUse.has(c.key, c.idx) && slotClearInBand(c.x, band, obstacles))
      .sort(order)
  )
  if (candsPerBand.some((c) => c.length < 1)) return null
  // [RR1 B1] 夹缝恒按行进序自源侧构造：down=[aS,band0]→…→[bandN,bS]；
  // up=[band0.hi,aS]→…→[bS,bandN.lo]（源侧起逆扫——目标侧终推）
  const strips: Array<[number, number]> = []
  let cursor = aS.y
  for (const band of bands) {
    strips.push(down ? [cursor, band[0]] : [band[1], cursor])
    cursor = down ? band[1] : band[0]
  }
  strips.push(down ? [cursor, bS.y] : [bS.y, cursor])
  const chosen: SlotCand[] = []
  let budget = DFS_BUDGET
  const tryBuild = (): DetourRoute | null => {
    // 构线（行进序 wps——up/down 同构零反卷）：入移（curX≠xi 时·夹缝槽位 y）
    // →段内纵降；异槽中段=夹缝槽位 y 回 x₀ 再移出（封闭=null 组合不可行）；
    // 同槽贯通=零中段横移；末段=目标侧夹缝回 x₀（封闭=桩端水平线）→入桩
    const wps: Pt[] = []
    let curX = x0
    for (let i = 0; i < bands.length; i++) {
      const xi = chosen[i]!.x
      if (curX !== xi) {
        const yIn = moveYOf(strips[i]!, i === 0 ? aS.y : null)
        if (yIn === null) return null
        wps.push({ x: curX, y: yIn }, { x: xi, y: yIn })
      }
      const next = chosen[i + 1]
      if (next === undefined) {
        const yOut = moveYOf(strips[i + 1]!, bS.y)
        if (yOut === null) return null
        if (xi !== x0) wps.push({ x: xi, y: yOut }, { x: x0, y: yOut })
      } else if (next.x !== xi) {
        const yOut = moveYOf(strips[i + 1]!, null)
        if (yOut === null) return null
        wps.push({ x: xi, y: yOut }, { x: x0, y: yOut }, { x: next.x, y: yOut })
        curX = next.x
        continue
      }
      curX = next !== undefined && next.x === xi ? xi : x0
    }
    wps.push({ x: x0, y: bS.y })
    const skel: Pt[] = [pa.pt, aS, ...wps, pb.pt]
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
  // Phase A：贯通解（全带同槽 x）——拐弯数主键全局承载（横移 2 次=最少；
  // 同 x 跨行通道异 key——贯通判定取几何 x 基，占用落记各带自身通道槽）；
  // 起始槽按带0 候选距离序（次键）
  for (const c of candsPerBand[0]!) {
    if (--budget < 0) return null
    if (!candsPerBand.every((list, i) => i === 0 || list.some((q) => q.x === c.x))) continue
    for (let i = 1; i < bands.length; i++) chosen[i] = candsPerBand[i]!.find((q) => q.x === c.x)!
    chosen[0] = c
    const r = tryBuild()
    if (r !== null) return r
  }
  // Phase B：混合组合 DFS——段内迭代 chosen[i−1] 同槽优先（增量 0 拐）再距离序
  const dfs = (i: number): DetourRoute | null => {
    if (i === bands.length) return tryBuild()
    const prevX = i > 0 ? chosen[i - 1]!.x : undefined
    const list = candsPerBand[i]!
    const iter =
      prevX === undefined || list.some((c) => c.x === prevX)
        ? [...list].sort((a, b) => (a.x === prevX ? 0 : 1) - (b.x === prevX ? 0 : 1))
        : list
    for (const c of iter) {
      if (--budget < 0) return null
      chosen[i] = c
      const r = dfs(i + 1)
      if (r !== null) return r
    }
    return null
  }
  return dfs(0)
}
