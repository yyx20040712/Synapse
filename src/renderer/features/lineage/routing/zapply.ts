/**
 * [F-ROUTE-02 U2] zapply —— 走线候选位分配·几何施加层（design §5「几何
 * 施加」；自 slots.ts 拆出——300 行设计上限分件，零逻辑改动）。竖直段
 * Z 形=单元 [yA,yB] 内 x0→x1 位移：j1=yA+PAD+1/j2=yB−PAD−1（水平段对称
 * i1/i2），顶点链 (x0,j1)(x1,j1)(x1,j2)(x0,j2) 两段 jog；可行条件=S2
 * j2−j1≥2（⟺单元行进高 H≥2·PAD+4=12）∧ N-3 [j1,j2]⊆段∩单元行进跨度；
 * PAD 膨胀净空保证 jog 距两卡≥1px。点链重建=分片行进（片电平=落位槽/
 * 残余偏移/原位 base；跨界 jog 对自动成生；残余区间覆盖端点=旧式含端
 * 迁移）；〔回炉轮 1 件①〕主分支方向无关化（cuts 按 t1→t2 实际行进序
 * 构造——反向段一等公民）；〔件②〕回折分支（同带重叠单元病理态 jog 区
 * 互叠）残余 app 按行进序施加+起点端 appAt 电平迁移，组合态由 finish
 * 采样复检兜底（design §5）。确定性红线：无随机/无 Date/无三角函数。
 * 纯函数零 DOM import。
 */
import type { Pt } from './anchors'
import { PAD } from './avoid'
import type { GapCell } from './gap-cells'
import type { ResidualApp } from './residual'
import type { AssignEdge } from './slots'

/** 落位记录（几何施加模板：jog 区=行进轴 [jogLo,jogHi]、slot=槽轴坐标） */
export interface Landed {
  segIdx: number
  axis: 'x' | 'y'
  slot: number
  jogLo: number
  jogHi: number
}

/** Z 形内部链（谓词复检输入+jog 模板）：不可行=null（槽级不可用续扫——
 *  平行穿越段零测度行进跨度结构性恒不可行） */
export function zInterior(
  cell: GapCell,
  ideal: number,
  slot: number,
  p1: Pt,
  p2: Pt
): { chain: Pt[]; jogLo: number; jogHi: number } | null {
  const cLo = cell.axis === 'x' ? cell.rect.y : cell.rect.x
  const cHi = cLo + (cell.axis === 'x' ? cell.rect.h : cell.rect.w)
  const j1 = cLo + PAD + 1
  const j2 = cHi - PAD - 1
  if (j2 - j1 < 2) return null
  const sLo = cell.axis === 'x' ? Math.min(p1.y, p2.y) : Math.min(p1.x, p2.x)
  const sHi = cell.axis === 'x' ? Math.max(p1.y, p2.y) : Math.max(p1.x, p2.x)
  if (!(Math.max(sLo, cLo) <= j1 && j2 <= Math.min(sHi, cHi))) return null
  const chain =
    cell.axis === 'x'
      ? [
          { x: ideal, y: j1 },
          { x: slot, y: j1 },
          { x: slot, y: j2 },
          { x: ideal, y: j2 }
        ]
      : [
          { x: j1, y: ideal },
          { x: j1, y: slot },
          { x: j2, y: slot },
          { x: j2, y: ideal }
        ]
  return { chain, jogLo: j1, jogHi: j2 }
}

/** 施加后点链重建：无事件段=原样；事件段（落位 jog 区/残余区间）=分片行进 */
export function rebuildPts(edge: AssignEdge, landed: readonly Landed[], apps: ReadonlyArray<ResidualApp>): Pt[] {
  const src = edge.pts
  if (src.length < 2) return [...src]
  const out: Pt[] = []
  const push = (p: Pt): void => {
    const last = out[out.length - 1]
    if (last === undefined || last.x !== p.x || last.y !== p.y) out.push(p)
  }
  for (let s = 0; s + 1 < src.length; s++) {
    const p1 = src[s]!
    const p2 = src[s + 1]!
    const zs = landed.filter((l) => l.segIdx === s).sort((a, b) => a.jogLo - b.jogLo || a.jogHi - b.jogHi)
    const segApps = apps.filter((a) => a.segIdx === s)
    if (zs.length === 0 && segApps.length === 0) {
      if (out.length === 0) push(p1)
      push(p2)
      continue
    }
    const walkY = zs.length > 0 && zs[0]!.axis === 'x' // 落位垂直段行进 y/其余（y 槽位/残余跑段）行进 x
    const t = (p: Pt): number => (walkY ? p.y : p.x)
    const mk = (walk: number, level: number): Pt => (walkY ? { x: level, y: walk } : { x: walk, y: level })
    const base = walkY ? p1.x : p1.y
    const t1 = t(p1)
    const t2 = t(p2)
    const fwd = t2 >= t1
    const appAt = (x: number): number | undefined => {
      for (const a of segApps) if (x >= a.xFrom && x <= a.xTo) return a.y
      return undefined
    }
    if (zs.slice(1).some((z, i) => z.jogLo < zs[i]!.jogHi)) {
      // 病理顺序复合（⑦ 型）：重叠 jog 区回折链——apps 与 z 区结构性不相交
      // （残余域=消费区间补集），按行进序施加进 seq；组合态由 finish 采样复检兜底
      const startA = appAt(t1)
      const endA = appAt(t2)
      const chain: Pt[] = [startA === undefined ? p1 : mk(t1, startA)]
      const evs = [
        ...zs.map((z) => ({ lo: z.jogLo, hi: z.jogHi, lv: z.slot, zone: true })),
        ...segApps.map((a) => ({ lo: a.xFrom, hi: a.xTo, lv: a.y, zone: false }))
      ].sort((a, b) => {
        const fa = fwd ? a.lo : a.hi
        const fb = fwd ? b.lo : b.hi
        return fwd ? fa - fb : fb - fa
      })
      let cursor = t1
      for (const ev of evs) {
        const ea = fwd ? ev.lo : ev.hi
        const eb = fwd ? ev.hi : ev.lo
        if (ea !== cursor) {
          chain.push(mk(cursor, base), mk(ea, base))
          cursor = ea
        }
        if (!ev.zone && ea === t1) {
          chain.push(mk(eb, ev.lv)) // 起点端 app 迁移：起点已处偏移电平（无 base 入口 jog）
        } else {
          chain.push(mk(ea, base), mk(ea, ev.lv), mk(eb, ev.lv))
        }
        if (ev.zone || eb !== t2) chain.push(mk(eb, base)) // app 达终点=含端迁移不回 base
        cursor = eb
      }
      if (cursor !== t2) {
        chain.push(mk(cursor, base))
        chain.push(endA === undefined ? p2 : mk(t2, endA))
      } else if (endA === undefined) {
        chain.push(p2)
      }
      emitChain(out, chain, p1)
      continue
    }
    const cuts = new Set<number>([t1, t2])
    for (const z of zs) {
      cuts.add(z.jogLo)
      cuts.add(z.jogHi)
    }
    for (const a of segApps) {
      cuts.add(a.xFrom)
      cuts.add(a.xTo)
    }
    const xs = [...cuts].sort((a, b) => (fwd ? a - b : b - a)) // 行进序（方向无关）
    const levelAt = (x: number): number => {
      for (const z of zs) if (x >= z.jogLo && x <= z.jogHi) return z.slot
      for (const a of segApps) if (x >= a.xFrom && x <= a.xTo) return a.y
      return base
    }
    // 端点电平：残余区间覆盖端点→旧式含端迁移；jog 区结构性不触端（j1>行进小端+5）
    const startLv = appAt(t1)
    const endLv = appAt(t2)
    const chain: Pt[] = [startLv === undefined ? p1 : mk(t1, startLv)]
    for (let i = 0; i + 1 < xs.length; i++) {
      const lv = levelAt((xs[i]! + xs[i + 1]!) / 2)
      chain.push(mk(xs[i]!, lv), mk(xs[i + 1]!, lv))
    }
    chain.push(endLv === undefined ? p2 : mk(t2, endLv))
    emitChain(out, chain, p1)
  }
  return out
}

/** 段点链接入（含共享顶点随区间迁移：前段终点=本段 p1 原位且本段首点已移动
 *  →替换防回折尖刺——两分支共用） */
function emitChain(out: Pt[], chain: Pt[], p1: Pt): void {
  const first = chain[0]!
  const last = out[out.length - 1]
  if (last !== undefined && last.x === p1.x && last.y === p1.y && (first.x !== last.x || first.y !== last.y)) {
    out[out.length - 1] = first
    chain.shift()
  }
  for (const p of chain) {
    const tail = out[out.length - 1]
    if (tail === undefined || tail.x !== p.x || tail.y !== p.y) out.push(p)
  }
}
