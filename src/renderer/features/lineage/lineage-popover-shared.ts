// b3: T3-P7B
/**
 * [T3-P7B] lineage-popover-shared —— 线型弹层共享纯逻辑（EdgeTypePopover/
 * EdgeNewSubForm 消费；拆件动因=组件 250 行红线）。
 *
 * - BASE_NAMES：四基础组呈现名（D-18 图例序同源——.tl-legend 真文本族）。
 * - clampPopoverPos：弹层视口钳制（mockup L1031-1034 语义——
 *   left=clamp(6,cx−125,vw−258)/top=clamp(6,cy+14,vh−h−10)，h=实测弹层高）。
 * - nextSubId：确定性序号 id `${base}-s${组内同前缀最大 N+1}`（D-P7B-4——
 *   无 Date/uuid 依赖；删除后序号复用=接受备案）。
 * - dashStyleOf/linePreviewStyle/baseDashOf：chip/预览线纹呈现（mockup
 *   L1042 同判：''=实线/'2 3'=点线[点线族 D-18]/其余=虚线）。
 */
import type { CSSProperties } from 'react'
import type { LineageEdgeKind } from '@shared/models/lineage'

/** 组呈现名（D-18 图例序同源——.tl-legend 真文本族） */
export const BASE_NAMES: Record<LineageEdgeKind, string> = {
  tree: '继承',
  inferred: '推断',
  ref: '综述关联',
  manual: '人工补线'
}

/** 弹层视口钳制（mockup L1031-1034 语义——纯函数可直测） */
export function clampPopoverPos(
  cx: number,
  cy: number,
  vw: number,
  vh: number,
  h: number
): { left: number; top: number } {
  const left = Math.max(6, Math.min(cx - 125, vw - 258))
  const top = Math.max(6, Math.min(cy + 14, vh - h - 10))
  return { left, top }
}

/** 确定性序号 id：`${base}-s${组内同前缀最大 N+1}`（无则 1；无 Date/uuid） */
export function nextSubId(base: string, subs: readonly { id: string }[]): string {
  const prefix = `${base}-s`
  let max = 0
  for (const s of subs) {
    if (s.id.startsWith(prefix)) {
      const n = Number(s.id.slice(prefix.length))
      if (Number.isInteger(n) && n > max) max = n
    }
  }
  return `${prefix}${max + 1}`
}

/** dash 呈现线型：''=实线/'2 3'=点线（D-18 点线族）/其余=虚线（mockup L1042 同判） */
export function dashStyleOf(dash: string): 'solid' | 'dotted' | 'dashed' {
  if (dash === '') return 'solid'
  if (dash === '2 3') return 'dotted'
  return 'dashed'
}

/** chip/预览线样式（mockup schip i：border-top w px style color） */
export function linePreviewStyle(w: number, dash: string, color: string): CSSProperties {
  return { borderTop: `${w}px ${dashStyleOf(dash)} ${color}` }
}

/** 基础型 chip 预览线纹（D-18 四 kind 基础型映射——与 .tl-edge[data-kind] 同族） */
export function baseDashOf(base: LineageEdgeKind): string {
  if (base === 'inferred' || base === 'manual') return '6 3'
  if (base === 'ref') return '2 3'
  return ''
}
