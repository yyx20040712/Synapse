/**
 * [F-LGRAPH-01②U5] edge-overlay-geom —— EdgeOverlay 几何/样式拆件（组件 250
 * 行红线）：布局快照采集（唯一不纯点——[②U7] 视口 rect 逆变换；
 * [F-VISFB-31] ÷s_eff=own 域——路由 px 常量族/CSS 写入系同域，旧 ÷z B 域
 * 对 C 域常量混算=u≠1 档乱图〔00A 接缝③〕）+边视觉样式（dashed/color
 * 内联——A3）。
 */
import type { CSSProperties } from 'react'
import type { LineageEdge } from '@shared/models/lineage'
import type { LayoutSnapshot } from './lineage-routing'
import { effectiveScale } from './timeline-zoom'

interface Box {
  x: number
  y: number
  w: number
  h: number
}

/** 布局快照采集（EdgeOverlay 唯一不纯点驻此；跨年判定=closest('[data-year]')；
 *  [②U7→F-VISFB-31] rect÷s_eff=own 域（SVG 驻内容层——用户单位=内容布局
 *  own px，z transform 与 u zoom 均在渲染侧叠加） */
export function buildSnapshot(content: HTMLElement): LayoutSnapshot {
  const base = content.getBoundingClientRect()
  const sEff = effectiveScale()
  const toBox = (el: Element): Box => {
    const r = el.getBoundingClientRect()
    return { x: (r.left - base.left) / sEff, y: (r.top - base.top) / sEff, w: r.width / sEff, h: r.height / sEff }
  }
  const cards = new Map<string, Box>()
  for (const el of Array.from(content.querySelectorAll<HTMLElement>('.tl-card[data-node-id]'))) {
    cards.set(el.dataset.nodeId ?? '', toBox(el))
  }
  const labels = Array.from(content.querySelectorAll('.month-tag')).map(toBox)
  const frames = Array.from(content.querySelectorAll('.month-frame')).map((el) => {
    const raw = el.closest('[data-year]')?.getAttribute('data-year') ?? 'null'
    return { ...toBox(el), year: raw === 'null' ? null : Number(raw) }
  })
  // [F-UIRES-03 C2·P7 / N5 校准提前落地] 年份头障碍采集收窄=数字+「N 篇」meta
  // 两文本区（.tl-year-num/.tl-year-meta）——原 .tl-year-head 容器为 flex+
  // ::after{flex:1} 横线横贯内容全宽，全宽 rect 挡死 band 跨年终落=CI 红
  // T-P1b（设计稿 v1.16 随批回写）；1px 装饰横线为伪元素天然采不到，不视为障碍
  const yearHeads = Array.from(content.querySelectorAll('.tl-year-num, .tl-year-meta')).map(toBox)
  // [F-SLOTGRID-01 U2] contentW 沿承透出（边侧通道右缘界=框内缘非内容缘——
  // 通道派生驻 routing/detour.ts gridChannelsOf；corridor 字段随走廊退役删除；
  // [F-VISFB-31] ÷s_eff=own 域宽——与 128/200 常量族同系）
  return { cards, labels, frames, yearHeads, contentW: base.width / sEff }
}

/** [F-LGRAPH-01②U8] 边视觉样式（dashed/color 内联——A3；虚线纹固定 6 3） */
export function edgeVisualStyle(edge: LineageEdge): CSSProperties {
  return { stroke: edge.color, strokeDasharray: edge.dashed ? '6 3' : 'none' }
}

/** [RR10] 边 inline opacity 单源（错峰 fade ×hover 回升 ×focus dim）：
 *  hovered 回升 0.65 并入 inline 计算（原仅 CSS .hovered 承载——错峰边
 *  inline fade 压 CSS 类=hover 可见回升死样式）；focus dim 态恒 undefined
 *  （dim/回升由 .dim/.dim.hovered 逐径类承载——RR5，fade 让位） */
export function edgeVisualOpacity(args: { fade?: number; hovered: boolean; focusDim: boolean }): number | undefined {
  if (args.focusDim) return undefined
  if (args.hovered) return 0.65
  return args.fade
}
