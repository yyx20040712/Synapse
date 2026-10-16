/**
 * [F-VISFB-43] figure-ctm —— op 流 CTM 栈跟踪+图表阈值过滤（纯核，pdfjs-free）。
 * 蓝本=00B 接手单（20261016-visfbb0/02 §一）：getOperatorList 枚举
 * paintImageXObject（op 码经注入——本件零 pdfjs 依赖，Node probe 可直驱）；
 * transform/save/restore/paintFormXObjectBegin(End) 维护 ctm 栈；绘制时
 * w=‖(a,b)‖、h=‖(c,d)‖、原点=(e,f)（PDF 用户空间 y-up）。
 * ── 行为层 ──
 * - mulMat=后乘累积（new = op × base——00B spike 同式）；
 * - form 深度：Begin 压栈+乘 form 矩阵、End 弹回，formDepth 标注嵌套层数
 *   （00B：op 流天然展平 Form——纳入不排除）；
 * - isQualifyingFigure=三阈值复合（00B §三：ctmArea≥3600pt² ∧ pxArea≥60000
 *   ∧ pxMinEdge≥96——常量单源 shared/constants.ts FIGURE_*，禁内联魔数；
 *   负向锚=方标/横幅/规则线三装饰族）。
 * ── 文化层 ── 测试：tests/unit/renderer/figure-ctm.test.ts（always-active）。
 */
import {
  FIGURE_MIN_CTM_AREA_PT2,
  FIGURE_MIN_PX_AREA,
  FIGURE_MIN_PX_EDGE
} from '@shared/constants'

/** PDF 变换矩阵六元 [a b c d e f] */
export type Matrix = readonly [number, number, number, number, number, number]

/** 后乘矩阵积（op 流 transform 语义：new = m × base） */
export function mulMat(m: Matrix, base: Matrix): Matrix {
  return [
    m[0] * base[0] + m[1] * base[2],
    m[0] * base[1] + m[1] * base[3],
    m[2] * base[0] + m[3] * base[2],
    m[2] * base[1] + m[3] * base[3],
    m[4] * base[0] + m[5] * base[2] + base[4],
    m[4] * base[1] + m[5] * base[3] + base[5]
  ]
}

/** 分派用 op 码集（注入 pdfjs OPS 数值——本件不 import pdfjs-dist） */
export interface CtmOpCodes {
  save: number
  restore: number
  transform: number
  formBegin: number
  formEnd: number
  paintImageXObject: number
}

/** paintImageXObject 绘制记录（args[0]=objId；几何量已按 CTM 归算） */
export interface ImageDrawRecord {
  objId: string
  page: number
  formDepth: number
  /** ‖(a,b)‖——绘制宽（pt） */
  ctmW: number
  /** ‖(c,d)‖——绘制高（pt） */
  ctmH: number
  /** 原点 x（pt） */
  ctmX: number
  /** 原点 y（pt） */
  ctmY: number
}

function isMatrix(v: unknown): v is Matrix {
  return (
    Array.isArray(v) &&
    v.length === 6 &&
    v.every((n) => typeof n === 'number' && Number.isFinite(n))
  )
}

/**
 * 单页 op 流扫描：跟踪 ctm 栈，产出全部 paintImageXObject 绘制记录（按流序）。
 * 未识别 op 零动作；restore/End 空栈=维持现值（防御——畸形流不抛）。
 */
export function collectImageDraws(
  fnArray: readonly number[],
  argsArray: readonly (readonly unknown[])[],
  page: number,
  codes: CtmOpCodes
): ImageDrawRecord[] {
  let ctm: Matrix = [1, 0, 0, 1, 0, 0]
  const stack: Matrix[] = []
  let formDepth = 0
  const draws: ImageDrawRecord[] = []
  for (let i = 0; i < fnArray.length; i += 1) {
    const fn = fnArray[i]
    const args = argsArray[i] ?? []
    if (fn === codes.save) {
      stack.push(ctm)
    } else if (fn === codes.restore) {
      const popped = stack.pop()
      if (popped !== undefined) ctm = popped
    } else if (fn === codes.transform) {
      const m = args[0] !== undefined && isMatrix(args) ? (args as unknown as Matrix) : null
      if (m !== null) ctm = mulMat(m, ctm)
    } else if (fn === codes.formBegin) {
      formDepth += 1
      stack.push(ctm)
      const fm = args[0]
      if (isMatrix(fm)) ctm = mulMat(fm, ctm)
    } else if (fn === codes.formEnd) {
      formDepth = Math.max(0, formDepth - 1)
      const popped = stack.pop()
      if (popped !== undefined) ctm = popped
    } else if (fn === codes.paintImageXObject) {
      const objId = args[0]
      if (typeof objId === 'string' && objId !== '') {
        draws.push({
          objId,
          page,
          formDepth,
          ctmW: Math.hypot(ctm[0], ctm[1]),
          ctmH: Math.hypot(ctm[2], ctm[3]),
          ctmX: ctm[4],
          ctmY: ctm[5]
        })
      }
    }
  }
  return draws
}

/** 三阈值复合过滤入局判定（CTM 面积∧像素面积∧像素最短边） */
export function isQualifyingFigure(d: {
  ctmW: number
  ctmH: number
  width: number
  height: number
}): boolean {
  return (
    d.ctmW * d.ctmH >= FIGURE_MIN_CTM_AREA_PT2 &&
    d.width * d.height >= FIGURE_MIN_PX_AREA &&
    Math.min(d.width, d.height) >= FIGURE_MIN_PX_EDGE
  )
}
