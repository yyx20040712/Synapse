/**
 * [F-LINEAGE-02 ①a] rounding —— 甲链公共几何底座·圆角化件（options §1.4/
 * §2-A r=6 统一；design-final §1）。骨架共线顶点剔除（D-L2-14——禁 0°/180°
 * 顶点入圆角化；180° 折返顶点保留由钳 0 承载）+逐顶点半径钳制边界表
 * （W-5：r_i=min(r,入段长/2,出段长/2)；180° 折返=尖角；r_i<2=尖角——
 * D-L2-6 终态）+二次贝塞尔直角圆角（Q 控制点=拐点）+采样链输出（曲化后
 * 采样复检输入——弦-弧偏差闭式 (L/N)²/(8R) 下 ARC_SAMPLES=6 恒密）。
 * 确定性红线：无随机/无 Date/无三角函数。纯函数零 DOM import。
 */
import type { Pt } from './anchors'

/** 每拐圆弧采样数（t=k/6，k=1..5——弧中点恒在采样集） */
const ARC_SAMPLES = 6

/** 数值输出格式（0.1 步进取整——沿承现行 fmt） */
const fmt = (n: number): string => `${Math.round(n * 10) / 10}`

/** 共线顶点剔除（D-L2-14）：同向平行（叉积 0 且点积>0）与零长（b===a，
 *  [回炉 R3] 竖桩端与带中心重合形态——零长入弧钳 r=0 恒尖角）的中间顶点
 *  移除；180° 折返（叉积 0 且点积<0）保留（尖角语义入圆角化钳 0） */
export function stripCollinear(pts: readonly Pt[]): Pt[] {
  if (pts.length < 3) {
    // 两点零长（同点）=空路径面——保留原样（调用方保证锚异点）
    return [...pts]
  }
  const out: Pt[] = [pts[0]!]
  for (let i = 1; i < pts.length - 1; i++) {
    const a = out[out.length - 1]!
    const b = pts[i]!
    const c = pts[i + 1]!
    if (b.x === a.x && b.y === a.y) continue // 零长顶点剔除
    const ux = b.x - a.x
    const uy = b.y - a.y
    const vx = c.x - b.x
    const vy = c.y - b.y
    const cross = ux * vy - uy * vx
    const dot = ux * vx + uy * vy
    if (cross === 0 && dot > 0) continue // 同向共线——剔除
    out.push(b)
  }
  out.push(pts[pts.length - 1]!)
  return out
}

export interface RoundedPath {
  /** SVG path d（M/L/Q 序列） */
  d: string
  /** 最终曲线采样链（首尾=骨架端点；直段端点+弧内采样点——复检输入） */
  samples: Pt[]
}

interface Corner {
  vertex: Pt
  /** 入切点（vertex−u·r） */
  tIn: Pt
  /** 出切点（vertex+v·r） */
  tOut: Pt
  /** 半径（0=尖角——直角通过） */
  r: number
}

/** 二次贝塞尔取点（t∈[0,1]——多项式零三角） */
function quadAt(t: number, p0: Pt, c: Pt, p1: Pt): Pt {
  const u = 1 - t
  return { x: u * u * p0.x + 2 * u * t * c.x + t * t * p1.x, y: u * u * p0.y + 2 * u * t * c.y + t * t * p1.y }
}

/**
 * 圆角化：骨架（已建议先经 stripCollinear——本函数对共线点同样按钳制表
 * 产出零半径直通，但 D-L2-14 要求调用方剔除）→ r 统一入参+逐顶点钳制。
 */
export function buildRoundedPath(pts: readonly Pt[], r: number): RoundedPath {
  const n = pts.length
  if (n < 2) return { d: '', samples: [...pts] }
  if (n === 2) {
    const d = `M ${fmt(pts[0]!.x)} ${fmt(pts[0]!.y)} L ${fmt(pts[1]!.x)} ${fmt(pts[1]!.y)}`
    return { d, samples: [pts[0]!, pts[1]!] }
  }
  const corners: Corner[] = []
  for (let i = 1; i < n - 1; i++) {
    const a = pts[i - 1]!
    const b = pts[i]!
    const c = pts[i + 1]!
    const inLen = Math.abs(b.x - a.x) + Math.abs(b.y - a.y)
    const outLen = Math.abs(c.x - b.x) + Math.abs(c.y - b.y)
    const ux = b.x - a.x
    const uy = b.y - a.y
    const vx = c.x - b.x
    const vy = c.y - b.y
    const cross = ux * vy - uy * vx
    const dot = ux * vx + uy * vy
    // 180° 折返（平行反向）=尖角（W-5）；正交/任意角按段长/2 钳制
    let ri = cross === 0 && dot < 0 ? 0 : Math.min(r, inLen / 2, outLen / 2)
    if (ri < 2) ri = 0
    const inScale = inLen === 0 ? 0 : ri / inLen
    const outScale = outLen === 0 ? 0 : ri / outLen
    corners.push({
      vertex: b,
      tIn: { x: b.x - ux * inScale, y: b.y - uy * inScale },
      tOut: { x: b.x + vx * outScale, y: b.y + vy * outScale },
      r: ri
    })
  }
  const parts: string[] = [`M ${fmt(pts[0]!.x)} ${fmt(pts[0]!.y)}`]
  const samples: Pt[] = [pts[0]!]
  let cursor = pts[0]!
  for (const corner of corners) {
    if (corner.r === 0) {
      // 尖角：直角通过（顶点进采样链）
      if (!(cursor.x === corner.vertex.x && cursor.y === corner.vertex.y)) {
        parts.push(`L ${fmt(corner.vertex.x)} ${fmt(corner.vertex.y)}`)
        samples.push(corner.vertex)
      }
      cursor = corner.vertex
      continue
    }
    if (!(cursor.x === corner.tIn.x && cursor.y === corner.tIn.y)) {
      parts.push(`L ${fmt(corner.tIn.x)} ${fmt(corner.tIn.y)}`)
      samples.push(corner.tIn)
    }
    parts.push(`Q ${fmt(corner.vertex.x)} ${fmt(corner.vertex.y)} ${fmt(corner.tOut.x)} ${fmt(corner.tOut.y)}`)
    for (let k = 1; k < ARC_SAMPLES; k++) {
      samples.push(quadAt(k / ARC_SAMPLES, corner.tIn, corner.vertex, corner.tOut))
    }
    samples.push(corner.tOut)
    cursor = corner.tOut
  }
  const last = pts[n - 1]!
  if (!(cursor.x === last.x && cursor.y === last.y)) {
    parts.push(`L ${fmt(last.x)} ${fmt(last.y)}`)
    samples.push(last)
  }
  return { d: parts.join(' '), samples }
}
