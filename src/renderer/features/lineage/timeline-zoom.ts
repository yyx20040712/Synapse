/**
 * [F-LGRAPH-01②U7] timeline-zoom —— 缩放坐标域换算单源（P-4/W-3 坐标口径；
 * [F-VISFB-31] 三域律扩容——00A 接手单批档 20261016-visfbb0/01）。
 *
 * 三域律（00A §一实测锚定）：
 * - client 域=事件 clientX/clientY、getBoundingClientRect（含 zoom 与
 *   transform 双缩放的渲染读数）；
 * - C 域（own-space）=offsetLeft/offsetWidth/computed width/CSS px 常量/
 *   模型数学（布局盒读数——zoom/transform 均正交）；
 * - **client = origin + C × s_eff，s_eff ≡ z × uiScale（唯一公式）**；
 *   旧 B 域=(client−origin)/z=C×u 仅为导出中间量——凡与 C 域值（常量/
 *   offset 族/computed）直接运算处误差恰=u 倍（C1 乱图根因），脉络域消费面
 *   已整体迁 C 域（B↔B 自洽对随之成 C↔C——域内自消律不变），旧 ÷z 族
 *   toContentPt/toContentRect 随迁移退役删除。
 *
 * 缩放载体：z=transform scale 作用于 .tl-content（transformOrigin 0 0——
 * 内容坐标不变）；u=--ui-scale CSS zoom 挂 .app-content-row（INV-39——App
 * effect 单点写 documentElement）。本件零订阅纯读（判定时点取值）；zoom 态
 * 源=view.store 单源、uiScale 因子单点读 documentElement 内联变量（41 号
 * P1-1 接缝核对=use-lib-pane-widths 同 documentElement 单点读源，两票同源）。
 */
import type { Pt, Rect } from './routing/anchors'
import { useLineageViewStore } from './lineage-view.store'

/** 当前内容层缩放系数（z——1=无变换；判定时点读，zoom 态源=view.store 单源） */
export function contentScale(): number {
  return useLineageViewStore.getState().zoom
}

/**
 * [F-VISFB-31] uiScale 因子单点读（documentElement 内联 --ui-scale——
 * App.tsx effect 单点写；缺失/非法/非正值回退 1=small 档缺省形）。
 */
export function uiScaleFactor(): number {
  const v = Number.parseFloat(document.documentElement.style.getPropertyValue('--ui-scale'))
  return Number.isFinite(v) && v > 0 ? v : 1
}

/** [F-VISFB-31] s_eff=z×uiScale（client↔own-space 唯一公式——00A §一） */
export function effectiveScale(): number {
  return contentScale() * uiScaleFactor()
}

/**
 * [F-VISFB-31] 视口点→own 域（÷s_eff——z/u 参数化即三档×z 矩阵单测面；
 * 缺省=判定时点取值，与 contentScale 消费先例同法）。
 */
export function clientToOwnPt(
  contentRect: { left: number; top: number },
  clientX: number,
  clientY: number,
  z: number = contentScale(),
  u: number = uiScaleFactor()
): Pt {
  const s = z * u
  return { x: (clientX - contentRect.left) / s, y: (clientY - contentRect.top) / s }
}

/** [F-VISFB-31] 视口 rect→own 域 rect（宽高同 ÷s_eff——元素 rect 含双缩放） */
export function clientToOwnRect(
  r: { left: number; top: number; width: number; height: number },
  base: { left: number; top: number },
  z: number = contentScale(),
  u: number = uiScaleFactor()
): Rect {
  const s = z * u
  return {
    x: (r.left - base.left) / s,
    y: (r.top - base.top) / s,
    w: r.width / s,
    h: r.height / s
  }
}
