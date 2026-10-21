/**
 * [F-LGRAPH-01②U5] edge-overlay-geom —— EdgeOverlay 几何/样式拆件（组件 250
 * 行红线）：布局快照采集（唯一不纯点——[②U7] 视口 rect 逆变换；
 * [F-VISFB-31] ÷s_eff=own 域——路由 px 常量族/CSS 写入系同域，旧 ÷z B 域
 * 对 C 域常量混算=u≠1 档乱图〔00A 接缝③〕）+边视觉样式（dashed/color
 * 内联——A3）。
 */
import type { CSSProperties } from 'react'
import { validateLineageAnchor, type LineageAnchor, type LineageEdge } from '@shared/models/lineage'
import type { LayoutSnapshot } from './lineage-routing'
import { effectiveScale } from './timeline-zoom'
import { readFrameContentWidth } from './use-capacity-layout'

/**
 * [F-VISFB-66] 装配自检（renderer 读侧——设计书 §D.5 N-02r2）：锚载荷形状
 * 校验，失败=按未钉定处理+console warn（读侧降级不阻断渲染——repo 读面
 * 容错解析已拦库内损坏，本层防御=store 直写/测试夹具旁路面）。null=清除
 * 仅属载荷层——读模型 undefined/null 同归未钉定零 warn。
 */
/**
 * [回炉 S14] 非法锚 warn once 集（**按指纹去重**=reason+序列化载荷——同一
 * 非法锚跨渲染帧不重复告警；不同载荷各自一警）。
 */
const warnedAnchorFingerprints = new Set<string>()

export function pinOf(anchor: LineageAnchor | null | undefined): LineageAnchor | undefined {
  if (anchor === null || anchor === undefined) return undefined
  const check = validateLineageAnchor(anchor)
  if (!check.ok) {
    const fp = `${check.reason}|${JSON.stringify(anchor)}`
    // [定点修 N-r3-05] 指纹集上界（长会话防无界——非法锚域有限，超界重臂）
    if (warnedAnchorFingerprints.size > 128) warnedAnchorFingerprints.clear()
    if (!warnedAnchorFingerprints.has(fp)) {
      warnedAnchorFingerprints.add(fp)
      console.warn(`lineage-routing：边锚点载荷非法（${check.reason} 域违例），按未钉定处理——同一非法锚仅警一次`, anchor)
    }
    return undefined
  }
  return check.value
}

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
  // [F-DETOURW-01] contentW 语义改造=首月框内容盒宽归一化值（readFrameContentWidth
  // 单源——与 useCapacityLayout 布局量测/card-drag-session 拖拽容量输入同函数同
  // 选择器同帧同步读=同值，INV-169② 三域合流；computed 五值天然布局 px，zoom
  // 不影响 computed——不除 sEff，与快照 own 域同系）。无月框（空图）/无效读数
  // →0（unmeasured——走线零通道守卫/布局单行降级同族）。原 corridor 时代残留
  // （base.width/sEff=content 容器宽）全仓消费侧零命中随本票退役
  const firstFrame = content.querySelector('.month-frame')
  const contentW = firstFrame instanceof HTMLElement ? readFrameContentWidth(firstFrame) : 0
  return { cards, labels, frames, yearHeads, contentW }
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
