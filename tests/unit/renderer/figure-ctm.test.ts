/**
 * [F-VISFB-43 U1] figure-ctm 纯核单测（op 流 CTM 栈跟踪+三阈值过滤）。
 * 蓝本=00B 接手单 20261016-visfbb0/02（mul 后乘式/ctm 栈/formDepth 标注/
 * w=‖(a,b)‖ h=‖(c,d)‖/三阈值负锚=方标·横幅·规则线三装饰族）。
 * always-active（不经 guardedDescribe——K3 沿承）。
 */
import { describe, expect, it } from 'vitest'
import {
  collectImageDraws,
  isQualifyingFigure,
  mulMat,
  type Matrix
} from '../../../src/renderer/shared/figures/figure-ctm'

/** 测试用 op 码（与 pdfjs OPS 数值无关——跟踪器只按注入码分派） */
const CODES = {
  save: 1,
  restore: 2,
  transform: 3,
  formBegin: 4,
  formEnd: 5,
  paintImageXObject: 6
} as const

const IDENT: Matrix = [1, 0, 0, 1, 0, 0]

describe('[F-VISFB-43 U1] figure-ctm 纯核', () => {
  it('mulMat：单位阵后乘=恒等', () => {
    const m: Matrix = [2, 0, 0, 3, 1, 1]
    expect(mulMat(m, IDENT)).toEqual([2, 0, 0, 3, 1, 1])
  })

  it('mulMat：op 后乘（PDF 语义——stream 后到的 translate 落在被缩放坐标系，平移量被先置 scale 吸收）', () => {
    const scale: Matrix = [2, 0, 0, 2, 0, 0]
    const translate: Matrix = [1, 0, 0, 1, 10, 20]
    expect(mulMat(translate, scale)).toEqual([2, 0, 0, 2, 20, 40])
  })

  it('save/restore 往返：restore 弹出保存点（嵌套两层）', () => {
    const fns = [CODES.transform, CODES.save, CODES.transform, CODES.save, CODES.transform, CODES.restore, CODES.paintImageXObject]
    const args: (readonly unknown[])[] = [
      [2, 0, 0, 2, 0, 0],
      [],
      [1, 0, 0, 1, 10, 20],
      [3, 0, 0, 3, 0, 0],
      [],
      [],
      ['img_1']
    ]
    const draws = collectImageDraws(fns, args, 1, CODES)
    expect(draws).toHaveLength(1)
    expect(draws[0]?.ctmW).toBe(2)
    expect(draws[0]?.ctmX).toBe(20)
  })

  it('form 深度：paintFormXObjectBegin 压栈+乘 form 矩阵，End 弹回；formDepth 标注嵌套层数', () => {
    const fns = [
      CODES.formBegin,
      CODES.paintImageXObject,
      CODES.formBegin,
      CODES.paintImageXObject,
      CODES.formEnd,
      CODES.paintImageXObject,
      CODES.formEnd
    ]
    const args: (readonly unknown[])[] = [
      [[1, 0, 0, 1, 100, 200]],
      ['img_a'],
      [[2, 0, 0, 2, 0, 0]],
      ['img_b'],
      [],
      ['img_c'],
      []
    ]
    const draws = collectImageDraws(fns, args, 3, CODES)
    expect(draws[0]).toMatchObject({ objId: 'img_a', formDepth: 1, ctmX: 100, ctmY: 200 })
    expect(draws[1]).toMatchObject({ objId: 'img_b', formDepth: 2, ctmW: 2, ctmX: 100 })
    expect(draws[2]).toMatchObject({ objId: 'img_c', formDepth: 1, ctmX: 100 })
  })

  it('旋转矩阵：w=‖(a,b)‖ h=‖(c,d)‖ 原点=(e,f)', () => {
    const fns = [CODES.transform, CODES.paintImageXObject]
    const args: (readonly unknown[])[] = [[0, 2, -1, 0, 5, 5], ['img_r']]
    const draws = collectImageDraws(fns, args, 1, CODES)
    expect(draws[0]?.ctmW).toBe(2)
    expect(draws[0]?.ctmH).toBe(1)
    expect(draws[0]?.ctmX).toBe(5)
    expect(draws[0]?.ctmY).toBe(5)
  })

  it('页序与 objId 透传：记录挂页码+恒等 CTM 六元组', () => {
    const draws = collectImageDraws([CODES.paintImageXObject], [['img_p2']], 2, CODES)
    expect(draws).toEqual([{ objId: 'img_p2', page: 2, formDepth: 0, ctmW: 1, ctmH: 1, ctmX: 0, ctmY: 0 }])
  })

  it('阈值①负例：方标 11×10pt（ctmArea=110<3600）出局', () => {
    expect(isQualifyingFigure({ ctmW: 11, ctmH: 10, width: 46, height: 40 })).toBe(false)
  })

  it('阈值①边界：ctmArea=3600 恰入局（59.99×60.01 不作边界锚——用整数 60×60）', () => {
    expect(isQualifyingFigure({ ctmW: 60, ctmH: 60, width: 308, height: 209 })).toBe(true)
  })

  it('阈值②负例：横幅 115×29pt·481×122px（pxArea=58682<60000）出局', () => {
    expect(isQualifyingFigure({ ctmW: 115, ctmH: 29, width: 481, height: 122 })).toBe(false)
  })

  it('阈值③负例：规则线 132×11pt·1100×90px（pxMinEdge=90<96）出局', () => {
    expect(isQualifyingFigure({ ctmW: 132, ctmH: 11, width: 1100, height: 90 })).toBe(false)
  })

  it('阈值复合正例：真图最小面板 74×50pt·308×209px 入局（00B 语料下界）', () => {
    expect(isQualifyingFigure({ ctmW: 74, ctmH: 50, width: 308, height: 209 })).toBe(true)
  })

  it('阈值下界精确三点：3599 拒/3600 收；59999 拒/60000 收；95 拒/96 收', () => {
    expect(isQualifyingFigure({ ctmW: 3599 / 60, ctmH: 60, width: 308, height: 209 })).toBe(false)
    expect(isQualifyingFigure({ ctmW: 3600 / 60, ctmH: 60, width: 308, height: 209 })).toBe(true)
    expect(isQualifyingFigure({ ctmW: 200, ctmH: 300, width: 300, height: 59999 / 300 })).toBe(false)
    expect(isQualifyingFigure({ ctmW: 200, ctmH: 300, width: 300, height: 60000 / 300 })).toBe(true)
    expect(isQualifyingFigure({ ctmW: 200, ctmH: 300, width: 96 * 30, height: 95 })).toBe(false)
    expect(isQualifyingFigure({ ctmW: 200, ctmH: 300, width: 96 * 30, height: 96 })).toBe(true)
  })
})
