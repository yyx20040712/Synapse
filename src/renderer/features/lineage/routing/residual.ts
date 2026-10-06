/**
 * [F-ROUTE-02 U2] residual —— 走线候选位分配·残余分离子 pass（design §5
 * 「残余分离子 pass」；旧 chain.ts applyBandLanes 语义原样承袭——U3 接入时
 * 旧函数体退役迁此）。域=band 态边水平跑段（y===bandY 精确等）×未被槽消费
 * 的 x 区间：U1 半开语义下零测度跑段恒不消费 x 单元（开阔域共道分离零丢失
 * ——W-4 等价由构造成立），y 单元垂直穿越的槽消费区间（单元 x 跨度∩跑段）
 * 按单元粒度退出残余域、closed 单元不消费恒留域。分组=同 bandY 成员投影
 * 重叠链（旧 xLo/xHi 判定原样：xLo 升序排序、簇内互达=下一成员 xLo≤当前簇
 * xHi；tie=edgeId 字典序）；偏移式全沿旧：s=bandS（∈{9,6}）∧cap=bandCap
 * （⌊(带宽−2·PAD)/s⌋）∧maxOff=((cap−1)/2)·s∧成员按 edgeId 字典序
 * (i−(k−1)/2)·s 钳 ±maxOff∧off=0 跳过（无 rec）。应用=区间点链电平替换
 * （跑段边界顶点随所属区间移动=旧式含端点语义；分片行进/jog 组装驻
 * slots.ts rebuild）。单成员簇跳过（旧 cluster.length<2 同型）。确定性
 * 红线：无随机/无 Date/无三角函数。纯函数零 DOM import。
 */
import type { AssignEdge, AssignRec } from './slots'

/** 残余区间施加（段级 x 区间→偏移后 y 电平） */
export interface ResidualApp {
  segIdx: number
  xFrom: number
  xTo: number
  y: number
}

export interface ResidualOutcome {
  apps: ResidualApp[][]
  recs: AssignRec[][]
}

/** 残余成员（跑段残余区间载体；xLo/xHi=残余区间 x 投影） */
interface Member {
  edgeIdx: number
  segIdx: number
  edgeId: string
  xLo: number
  xHi: number
  bandY: number
  bandS: number
  bandCap: number
}

/** 消费区间合并（升序；相接/重叠并簇——残余域扣除前规整） */
function mergeSpans(spans: ReadonlyArray<readonly [number, number]>): Array<[number, number]> {
  const sorted = [...spans].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const out: Array<[number, number]> = []
  for (const [lo, hi] of sorted) {
    const last = out[out.length - 1]
    if (last !== undefined && lo <= last[1]) last[1] = Math.max(last[1], hi)
    else out.push([lo, hi])
  }
  return out
}

/** 残余子 pass：域计算（bandY 跑段减消费区间）→同 bandY 分组→互达簇→旧式偏移 */
export function runResidualPass(
  edges: readonly AssignEdge[],
  consumed: ReadonlyArray<ReadonlyArray<ReadonlyArray<readonly [number, number]>>>
): ResidualOutcome {
  const apps: ResidualApp[][] = edges.map(() => [])
  const recs: AssignRec[][] = edges.map(() => [])
  const members: Member[] = []
  for (let i = 0; i < edges.length; i++) {
    const e = edges[i]!
    const bandY = e.bandY
    if (e.route !== 'band' || bandY === undefined) continue
    for (let s = 0; s + 1 < e.pts.length; s++) {
      const p1 = e.pts[s]!
      const p2 = e.pts[s + 1]!
      if (!(p1.y === bandY && p2.y === bandY)) continue // 跑段=精确 y 等（旧式）
      const lo = Math.min(p1.x, p2.x)
      const hi = Math.max(p1.x, p2.x)
      if (hi - lo <= 0) continue
      const cons = mergeSpans((consumed[i]?.[s] ?? []).filter(([a, b]) => b > a))
      const push = (xLo: number, xHi: number): void => {
        if (xHi - xLo <= 0) return
        members.push({
          edgeIdx: i,
          segIdx: s,
          edgeId: e.edgeId,
          xLo,
          xHi,
          bandY,
          bandS: e.bandS ?? 6,
          bandCap: e.bandCap ?? 1
        })
      }
      let cur = lo
      for (const [a, b] of cons) {
        if (a > cur) push(cur, Math.min(a, hi))
        if (b > cur) cur = b
      }
      push(cur, hi)
    }
  }
  const byBand = new Map<number, Member[]>()
  for (const m of members) {
    const list = byBand.get(m.bandY) ?? []
    list.push(m)
    byBand.set(m.bandY, list)
  }
  for (const list of byBand.values()) {
    if (list.length < 2) continue // 旧 list.length<2 同型
    list.sort((a, b) => a.xLo - b.xLo || (a.edgeId < b.edgeId ? -1 : a.edgeId > b.edgeId ? 1 : a.edgeIdx - b.edgeIdx))
    let cluster: Member[] = []
    let clusterHi = -Infinity
    const flush = (): void => {
      if (cluster.length >= 2) {
        const s = cluster[0]!.bandS
        const cap = cluster[0]!.bandCap
        const maxOff = ((cap - 1) / 2) * s
        const ordered = [...cluster].sort((a, b) =>
          a.edgeId < b.edgeId ? -1 : a.edgeId > b.edgeId ? 1 : a.edgeIdx - b.edgeIdx
        )
        ordered.forEach((m, k) => {
          const off = Math.max(-maxOff, Math.min(maxOff, (k - (ordered.length - 1) / 2) * s))
          if (off === 0) return // 旧式跳过（无位移无 rec）
          apps[m.edgeIdx]!.push({ segIdx: m.segIdx, xFrom: m.xLo, xTo: m.xHi, y: m.bandY + off })
          recs[m.edgeIdx]!.push({
            edgeId: m.edgeId,
            segIdx: m.segIdx,
            cellId: -1,
            axis: 'y',
            ideal: m.bandY,
            overlapExempt: false,
            residual: true
          })
        })
      }
      cluster = []
    }
    for (const m of list) {
      if (cluster.length > 0 && m.xLo > clusterHi) flush()
      cluster.push(m)
      clusterHi = Math.max(clusterHi, m.xHi)
    }
    flush()
  }
  return { apps, recs }
}
