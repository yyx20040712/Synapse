/**
 * [F-LINEAGE-02 ①a] anchors —— 甲链公共几何底座·锚点件（options §1.3；
 * design-final §1 零修改转入）。每卡 12 连接点（每边 ¼/½/¾ 位）+锚点 id
 * `cardId:side+序`（t/b/l/r×3）+自动选择规则=主向定边（|dx|≥|dy| 取横，
 * 并列取横）+侧内投影最近定序（并列取小序）+短桩 s0=10（外法线）。
 * 确定性红线（§1.5）：无随机/无 Date/无三角函数——并列选择一律字典序/
 * 几何序。纯函数零 DOM import。
 */

export interface Pt {
  x: number
  y: number
}

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export type Side = 'top' | 'bottom' | 'left' | 'right'

/** 短桩长度（外法线 s0=10——options §1.4；同锚 12 全满错峰 s0+i·9 承载） */
export const STUB_S0 = 10

type Slot = number

/** 边内三序分数（¼/½/¾——slot 0/1/2） */
const SLOT_FRACTIONS = [0.25, 0.5, 0.75] as const

const slotFraction = (slot: number): number => SLOT_FRACTIONS[slot] ?? SLOT_FRACTIONS[0]!

/** 12 锚点取点：side 内 slot 序位置的几何点 */
export function anchorPoint(r: Rect, side: Side, slot: Slot): Pt {
  const f = slotFraction(slot)
  if (side === 'top') return { x: r.x + r.w * f, y: r.y }
  if (side === 'bottom') return { x: r.x + r.w * f, y: r.y + r.h }
  if (side === 'left') return { x: r.x, y: r.y + r.h * f }
  return { x: r.x + r.w, y: r.y + r.h * f }
}

/** 锚点 id：`cardId:side+序`（side 字母 t/b/l/r——编辑拖拽吸附产出/路由消费） */
export function anchorId(cardId: string, side: Side, slot: Slot): string {
  const letter = side === 'top' ? 't' : side === 'bottom' ? 'b' : side === 'left' ? 'l' : 'r'
  return `${cardId}:${letter}${slot}`
}

export interface SelectedAnchor {
  side: Side
  slot: Slot
  pt: Pt
}

/**
 * 自动选择锚点（主向定边+投影最近定序）：
 * - 主向=r 中心→toward 的向量（|dx|≥|dy| 取横边，并列取横——§1.3 原文）；
 * - 边=横 dx≥0→right 否则 left；竖 dy≥0→bottom 否则 top；
 * - 侧内序=toward 在该边轴上投影距 ¼/½/¾ 最近者（并列取小序）。
 */
export function selectAnchor(r: Rect, toward: Pt): SelectedAnchor {
  const dx = toward.x - (r.x + r.w / 2)
  const dy = toward.y - (r.y + r.h / 2)
  const horizontal = Math.abs(dx) >= Math.abs(dy)
  let side: Side
  if (horizontal) side = dx >= 0 ? 'right' : 'left'
  else side = dy >= 0 ? 'bottom' : 'top'
  const pos = horizontal ? toward.y - r.y : toward.x - r.x
  const span = horizontal ? r.h : r.w
  let best: Slot = 0
  let bestDist = Math.abs(pos - span * SLOT_FRACTIONS[0]!)
  for (let s = 1; s <= 2; s++) {
    const d = Math.abs(pos - span * SLOT_FRACTIONS[s]!)
    // 并列取小序：严格小于才替换
    if (d < bestDist) {
      best = s
      bestDist = d
    }
  }
  return { side, slot: best, pt: anchorPoint(r, side, best) }
}

/** 外法线单位向量（短桩方向） */
export function outwardNormal(side: Side): Pt {
  if (side === 'top') return { x: 0, y: -1 }
  if (side === 'bottom') return { x: 0, y: 1 }
  if (side === 'left') return { x: -1, y: 0 }
  return { x: 1, y: 0 }
}

/** 短桩端点：锚点沿外法线伸 s0（错峰调用方传 s0+i·9） */
export function stubEnd(a: Pt, side: Side, s0: number = STUB_S0): Pt {
  const n = outwardNormal(side)
  return { x: a.x + n.x * s0, y: a.y + n.y * s0 }
}

/** 定边锚（side 强制）：侧内投影最近定序（并列取小序——与 selectAnchor 同轴算法） */
export function sideAnchor(r: Rect, side: Side, toward: Pt): SelectedAnchor {
  const vertical = side === 'top' || side === 'bottom'
  const pos = vertical ? toward.x - r.x : toward.y - r.y
  const span = vertical ? r.w : r.h
  let best = 0
  let bestDist = Math.abs(pos - span * 0.25)
  const fr = [0.25, 0.5, 0.75] as const
  for (let k = 1; k < 3; k++) {
    const d = Math.abs(pos - span * fr[k]!)
    if (d < bestDist) {
      best = k
      bestDist = d
    }
  }
  return { side, slot: best, pt: anchorPoint(r, side, best) }
}

/** 同锚散开注册表（cardId|side|slot——仅胜出态落记：失败态尝试不占锚，
 *  否则注册表污染使后续边锚位漂移[routeAll 3 边实测 e1 落 fallback]） */
export class AnchorUse {
  private readonly used = new Set<string>()

  private readonly key = (cardId: string, side: Side, slot: number): string => `${cardId}|${side}|${slot}`

  /** 纯查（不落记）：返回散开后的 (side,slot)——同侧下一空闲→邻边→对边 */
  pick(cardId: string, side: Side, preferred: number): { side: Side; slot: number } {
    const order = [preferred, (preferred + 1) % 3, (preferred + 2) % 3]
    const same = order.find((k) => !this.used.has(this.key(cardId, side, k)))
    if (same !== undefined) return { side, slot: same }
    const vertical = side === 'top' || side === 'bottom'
    const adjacent: Side[] = vertical ? ['right', 'left'] : ['bottom', 'top']
    const opposite: Side = vertical ? (side === 'top' ? 'bottom' : 'top') : side === 'left' ? 'right' : 'left'
    for (const s of [...adjacent, opposite]) {
      const k = ([1, 0, 2] as const).find((slot) => !this.used.has(this.key(cardId, s, slot)))
      if (k !== undefined) return { side: s, slot: k }
    }
    return { side, slot: preferred } // 12 锚全满=共享原锚
  }

  commit(cardId: string, side: Side, slot: number): void {
    this.used.add(this.key(cardId, side, slot))
  }
}

/** pick 结果：生效锚几何点+身份（side/slot——[回炉 R2] commit 必须落记
 *  生效锚：只回传 Pt 时调用方录原锚 → 实占槽漏记+未用槽虚占，后边重取
 *  同槽相撞（3 平行边 e1/e2 同落 r0 实证） */
export interface PickedAnchor {
  pt: Pt
  side: Side
  slot: number
}

/** pick+取点（不落记）——胜出后由调用方 commit 生效锚（this.side/slot） */
export const anchorPick = (
  cardId: string,
  r: Rect,
  side: Side,
  preferred: number,
  use: AnchorUse | undefined
): PickedAnchor => {
  if (use === undefined) {
    return { pt: anchorPoint(r, side, preferred), side, slot: preferred }
  }
  const p = use.pick(cardId, side, preferred)
  return { pt: anchorPoint(r, p.side, p.slot), side: p.side, slot: p.slot }
}
