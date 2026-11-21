/**
 * [B1-U2] pdf-selection-health —— 项声明几何的 G2 降级门检测器（自
 * pdf-item-geometry.ts 拆出——设计稿 docs/design/2026-11-21_selection-
 * correctness-a1-a5.md §6 行数预算：原文件 509 行超 max-lines 500，先拆件
 * 再改；拆件为零行为变更的净迁移）。
 *
 * ── 行为层 ──
 * - selectionHealth：项矩形落 textLayer 盒外比率 ≥5% 或并块右溢 >2px →
 *   unhealthy（阈值常量同源随迁）。盒本地帧口径不变：项盒=viewport.transform
 *   产出，base 只消费宽高（盒原点不参与——第三轮取证 r3a 实证）。
 *
 * ── 接口层 ──
 * - export interface ItemBox（项声明几何产物：rect/vProj/fontH/angle）——
 *   pdf-item-geometry 再导出（受锁 pdf-item-geometry.test 的 type 消费面
 *   零变）。
 * - export const SELECTION_DEV_RATIO_THRESHOLD/SELECTION_RIGHT_OVERFLOW_PX +
 *   export function selectionHealth（pdf-item-geometry 再导出保持公共面）。
 *
 * ── 架构层 ──
 * - 依赖单向：本件→geometry-types（PixelBox 类型单源）；零 DOM/React、纯函数。
 *   消费方=pdf-item-geometry.itemSelectionGeometry +
 *   annotation-resolve-layered（经 pdf-item-geometry 再导出，导入路径零变）。
 *
 * ── 生命周期层 ── / ── 文化层 ──
 * - 无状态 O(项数+块数)；测试经 pdf-item-geometry.test.tsx G2 组（导出面
 *   未移动，用例体零改）。
 */
import type { PixelBox } from './geometry-types'

/** 项声明几何产物：rect=viewport CSS px 域轴对齐包围盒；vProj=基线点在行
 *  分隔轴 v=(−sinA,cosA) 上的投影（angle=0 退化为主导 y）；fontH=字高 px
 *  （容差源）；angle=行进角（弧度，vertical 已折入） */
export interface ItemBox {
  rect: PixelBox
  vProj: number
  fontH: number
  angle: number
}

/** 偏离率阈值：健康页 0~0.12% vs 病理页 25%~62.5%（间隔 ≥200 倍，5% 阈值
 *  >4 倍安全边距）——「仅新增复现证据时启用」的 active 落地常量 */
export const SELECTION_DEV_RATIO_THRESHOLD = 0.05

/** 块右溢阈值（px）：**占位阈值**——取证全样本右溢=0 无观测支撑（裁决表 §6
 *  N1），随真实复现证据联动校准 */
export const SELECTION_RIGHT_OVERFLOW_PX = 2

/** 盒外判定的亚像素容差（px）：canvas CSS 盒 Math.floor 与未取整 viewport
 *  数学的分数 view 差（b1 §10：1c2d 分数页 ~0.5px 右缘——度量精度边界非病理） */
const HEALTH_EPS_PX = 0.5

export interface SelectionHealth {
  unhealthy: boolean
  /** 被选项盒落 textLayer 盒外的比率（A2 形态：outsideCount/被选项数） */
  outsideRatio: number
  /** 并块右缘超出 textLayer 盒右缘的最大 px（>0 即溢出） */
  rightOverflowPx: number
}

/** G2 检测器：偏离率 ≥5% 或任一并块右溢 >2px → unhealthy（消费方挂点=拖选
 *  期抑制渲染+mouseup 时刻 toast 拒绝——门一 W2 口径；真实健康页 0~0.12%
 *  永不误伤）。
 *  **盒本地帧**：项盒=viewport.transform 产出（textLayer 盒本地域），base
 *  只消费宽高（盒原点不参与）——gBCR 视口绝对原点与本地域混用会把全部
 *  项盒误判盒外（第三轮取证 r3a 实证：G2 全抑制=paint 0 块，检测器按设计
 *  拦截了域差错几何——反向验证了门的有效性） */
export function selectionHealth(boxes: ItemBox[], blocks: PixelBox[], base: PixelBox): SelectionHealth {
  let outside = 0
  for (const box of boxes) {
    const r = box.rect
    const out =
      r.x < -HEALTH_EPS_PX ||
      r.y < -HEALTH_EPS_PX ||
      r.x + r.w > base.w + HEALTH_EPS_PX ||
      r.y + r.h > base.h + HEALTH_EPS_PX
    if (out) outside += 1
  }
  const outsideRatio = boxes.length > 0 ? outside / boxes.length : 0
  let overflow = 0
  for (const blk of blocks) {
    overflow = Math.max(overflow, blk.x + blk.w - base.w)
  }
  return {
    unhealthy:
      outsideRatio >= SELECTION_DEV_RATIO_THRESHOLD || overflow > SELECTION_RIGHT_OVERFLOW_PX,
    outsideRatio,
    rightOverflowPx: Math.max(0, overflow)
  }
}
