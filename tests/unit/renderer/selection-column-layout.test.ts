/**
 * [F-VISFB-51] selection-column-layout —— 栏几何纯函数直测（视检反馈战役
 * B2·选区泳道 B1 波次补跑；always-active——新用例恒跑，不经 guardedDescribe）。
 *
 * 用例面=票面 §5 批 B5 段 51 号行全枚举（一形不缺）：左右双栏/反向（DOM 序
 * 与视觉序交错）/中缝不授权/全宽标题带（跨栏行不并入任何栏）/单栏/零盒/
 * 旋转盒（transform 后几何）/DOM 视觉序交错。
 *
 * 几何形状与 0C 双栏 fixture（tests/utils/pdf-factory createTwoColumnPdf）结构
 * 对齐作语义校准：全宽标题带+左右栏+中缝 24pt（[294,318]，左栏起点 x=54/
 * 右栏起点 x=318 同 fixture 常量）——纯函数测试直接构造行盒纯数据，零 fixture
 * 文件依赖（票面主控裁决 d）。行盒引用恒定性（toBe）锁定「输出成员=输入
 * 引用、栏内 DOM 序保持」合同（52 接线消费面）。
 */
import { describe, expect, it } from 'vitest'
import { authorizeColumnSpan, detectColumnLayout, type LineBox } from '../../../src/renderer/features/reader/interact/selection-column-layout'

/** 0C fixture 结构对齐：左右栏各 11 行（哨兵+ROW 01-10 同量） */
const ROWS = 11
/** 全宽标题带（跨缝行——x 覆盖两栏全程，位于栏体之上） */
const TITLE_BOX: LineBox = { x: 54, y: 40, w: 374, h: 16 }
/** 左栏行（x=54 同 fixture LCOL；右缘恰触中缝左界 294——相切不算跨） */
const lrow = (i: number): LineBox => ({ x: 54, y: 80 + i * 16, w: 240, h: 12 })
/** 右栏行（x=318 同 fixture RCOL；左缘恰触中缝右界） */
const rrow = (i: number): LineBox => ({ x: 318, y: 80 + i * 16, w: 110, h: 12 })
/** 左右行集（DOM 序=左先右后） */
const bothColumns = (): LineBox[] => [
  ...Array.from({ length: ROWS }, (_, i) => lrow(i)),
  ...Array.from({ length: ROWS }, (_, i) => rrow(i))
]

describe('F-VISFB-51 selection-column-layout —— 栏几何纯函数', () => {
  it('左右双栏+全宽标题带+中缝 24pt（0C fixture 结构对齐）：双栏划分/中缝量测/标题入全宽不带栏', () => {
    const input = [TITLE_BOX, ...bothColumns()]
    const layout = detectColumnLayout(input)
    expect(layout.kind).toBe('two-column')
    expect(layout.gutter).toEqual({ left: 294, right: 318 })
    expect(layout.gutter === null ? 0 : layout.gutter.right - layout.gutter.left).toBe(24)
    expect(layout.columns).toHaveLength(2)
    expect(layout.columns[0]?.id).toBe('left')
    expect(layout.columns[0]?.boxes).toHaveLength(ROWS)
    expect(layout.columns[0]?.x0).toBe(54)
    expect(layout.columns[0]?.x1).toBe(294)
    expect(layout.columns[1]?.id).toBe('right')
    expect(layout.columns[1]?.boxes).toHaveLength(ROWS)
    expect(layout.columns[1]?.x0).toBe(318)
    expect(layout.columns[1]?.x1).toBe(428)
    expect(layout.fullSpan).toHaveLength(1)
    expect(layout.fullSpan[0]).toBe(TITLE_BOX)
    expect(layout.rotated).toHaveLength(0)
    // 引用恒定：输出成员=输入引用（TITLE_BOX=DOM 首位 → 全宽带首位）
    expect(layout.columns[0]?.boxes[0]).toBe(input[1])
    expect(layout.columns[1]?.boxes[0]).toBe(input[ROWS + 1])
  })

  it('反向（DOM 序=右先左后+标题末位）：输出视觉左右序不变，栏内 DOM 序保持', () => {
    const rights = Array.from({ length: ROWS }, (_, i) => rrow(ROWS - 1 - i))
    const lefts = Array.from({ length: ROWS }, (_, i) => lrow(ROWS - 1 - i))
    const input = [...rights, ...lefts, TITLE_BOX]
    const layout = detectColumnLayout(input)
    expect(layout.kind).toBe('two-column')
    expect(layout.gutter).toEqual({ left: 294, right: 318 })
    // 视觉序：columns[0] 恒左栏（按 x 排序，非 DOM 序）
    expect(layout.columns[0]?.id).toBe('left')
    expect(layout.columns[0]?.boxes).toHaveLength(ROWS)
    expect(layout.columns[1]?.id).toBe('right')
    expect(layout.columns[1]?.boxes).toHaveLength(ROWS)
    // 栏内 DOM 序保持：右栏首成员=输入首位（反向输入的末行 rrow(10)）
    expect(layout.columns[1]?.boxes[0]).toBe(input[0])
    expect(layout.fullSpan).toHaveLength(1)
    expect(layout.fullSpan[0]).toBe(TITLE_BOX)
  })

  it('DOM 视觉序交错（L0,R0,L1,R1…）：按几何归栏不按输入邻接', () => {
    const input: LineBox[] = [TITLE_BOX]
    for (let i = 0; i < ROWS; i += 1) {
      input.push(lrow(i), rrow(i))
    }
    const layout = detectColumnLayout(input)
    expect(layout.kind).toBe('two-column')
    expect(layout.gutter).toEqual({ left: 294, right: 318 })
    expect(layout.columns[0]?.boxes).toHaveLength(ROWS)
    expect(layout.columns[1]?.boxes).toHaveLength(ROWS)
    // 交错输入下两栏仍完整拆分（邻接交错不并栏）
    expect(layout.columns[0]?.boxes[0]).toBe(input[1])
    expect(layout.columns[1]?.boxes[0]).toBe(input[2])
    expect(layout.columns[0]?.boxes[ROWS - 1]).toBe(input[2 * ROWS - 1])
    expect(layout.fullSpan).toEqual([TITLE_BOX])
  })

  it('中缝不授权（INV-142 几何判定面）：跨中缝选区=未授权态；贴边相切授权；传入序无关', () => {
    const layout = detectColumnLayout([TITLE_BOX, ...bothColumns()])
    expect(authorizeColumnSpan(layout, { x0: 100, x1: 200 })).toEqual({ authorized: true, columnId: 'left' })
    expect(authorizeColumnSpan(layout, { x0: 330, x1: 420 })).toEqual({ authorized: true, columnId: 'right' })
    // 跨缝（两端分列中缝两侧）→ 未授权
    expect(authorizeColumnSpan(layout, { x0: 200, x1: 400 })).toEqual({ authorized: false, reason: 'cross-gutter' })
    // 整段含于中缝内部（指针落于缝带）→ 未授权
    expect(authorizeColumnSpan(layout, { x0: 300, x1: 310 })).toEqual({ authorized: false, reason: 'cross-gutter' })
    // 指针形零宽 span（52 鼠标位置语义）落缝中点 → 未授权
    expect(authorizeColumnSpan(layout, { x0: 306, x1: 306 })).toEqual({ authorized: false, reason: 'cross-gutter' })
    // 传入序倒挂（anchor/focus 无向）→ 归一后同判
    expect(authorizeColumnSpan(layout, { x0: 400, x1: 200 })).toEqual({ authorized: false, reason: 'cross-gutter' })
    // 贴边相切（缝为开区间语义）不构成跨缝 → 授权所在侧
    expect(authorizeColumnSpan(layout, { x0: 200, x1: 294 })).toEqual({ authorized: true, columnId: 'left' })
    expect(authorizeColumnSpan(layout, { x0: 318, x1: 400 })).toEqual({ authorized: true, columnId: 'right' })
  })

  it('全宽标题带=跨缝行不并入任何栏（x 跨缝为信号，y 位置无关——栏体带内横幅同判）', () => {
    const banner: LineBox = { x: 100, y: 148, w: 250, h: 12 }
    const layout = detectColumnLayout([...bothColumns(), banner])
    expect(layout.kind).toBe('two-column')
    expect(layout.fullSpan).toHaveLength(1)
    expect(layout.fullSpan[0]).toBe(banner)
    // 横幅不并入任何栏（两栏仍各 ROWS 行，无栏吃进跨缝行）
    expect(layout.columns[0]?.boxes).toHaveLength(ROWS)
    expect(layout.columns[1]?.boxes).toHaveLength(ROWS)
    // 覆盖横幅的选区跨缝 → 未授权
    expect(authorizeColumnSpan(layout, { x0: 100, x1: 350 })).toEqual({ authorized: false, reason: 'cross-gutter' })
  })

  it('单栏：无中缝恒授权 single；单带两段（词隙级候选）不立缝（法定带数 ≥2）', () => {
    const rows = Array.from({ length: 8 }, (_, i): LineBox => ({ x: 54, y: 80 + i * 16, w: 374, h: 12 }))
    const layout = detectColumnLayout(rows)
    expect(layout.kind).toBe('single')
    expect(layout.columns).toHaveLength(1)
    expect(layout.columns[0]?.id).toBe('single')
    expect(layout.columns[0]?.boxes).toHaveLength(8)
    expect(layout.columns[0]?.x0).toBe(54)
    expect(layout.columns[0]?.x1).toBe(428)
    expect(layout.gutter).toBeNull()
    expect(layout.fullSpan).toHaveLength(0)
    // 单栏无歧义：任意 span（含超出行盒包络者）恒授权唯一栏
    expect(authorizeColumnSpan(layout, { x0: 0, x1: 612 })).toEqual({ authorized: true, columnId: 'single' })
    // 法定带数：仅一条行带含两段（隙=缝宽）+ 其余单盒行 → 仍单栏（不立缝）
    const stray = [...rows, { x: 54, y: 400, w: 240, h: 12 }, { x: 318, y: 400, w: 110, h: 12 }]
    const quorum = detectColumnLayout(stray)
    expect(quorum.kind).toBe('single')
    expect(quorum.columns[0]?.boxes).toHaveLength(10)
    expect(quorum.gutter).toBeNull()
  })

  it('零盒（空输入边界）：无栏态+授权恒 no-columns', () => {
    const layout = detectColumnLayout([])
    expect(layout.kind).toBe('none')
    expect(layout.columns).toHaveLength(0)
    expect(layout.fullSpan).toHaveLength(0)
    expect(layout.rotated).toHaveLength(0)
    expect(layout.gutter).toBeNull()
    expect(authorizeColumnSpan(layout, { x0: 100, x1: 200 })).toEqual({ authorized: false, reason: 'no-columns' })
  })

  it('旋转盒（transform 后几何）：竖排形态分流不扰栏检测；全竖排=无栏态；单字形窄行不误伤', () => {
    // 竖排 run（h=200 > 3×w=36）落栏体带+中缝 x 域——若未先剔除会跨行链拉通行带
    const vertical: LineBox = { x: 300, y: 100, w: 12, h: 200 }
    const mixed = detectColumnLayout([...bothColumns(), vertical])
    expect(mixed.rotated).toHaveLength(1)
    expect(mixed.rotated[0]).toBe(vertical)
    // 剔除在带聚类前：双栏+中缝检测不受竖排盒污染
    expect(mixed.kind).toBe('two-column')
    expect(mixed.gutter).toEqual({ left: 294, right: 318 })
    expect(mixed.columns[0]?.boxes).toHaveLength(ROWS)
    expect(mixed.columns[1]?.boxes).toHaveLength(ROWS)
    // 全竖排页：无栏态+授权 no-columns
    const allVertical = [
      { x: 54, y: 40, w: 12, h: 240 },
      { x: 300, y: 40, w: 12, h: 240 },
      { x: 400, y: 40, w: 12, h: 100 }
    ]
    const rotatedOnly = detectColumnLayout(allVertical)
    expect(rotatedOnly.kind).toBe('none')
    expect(rotatedOnly.rotated).toHaveLength(3)
    expect(authorizeColumnSpan(rotatedOnly, { x0: 0, x1: 612 })).toEqual({ authorized: false, reason: 'no-columns' })
    // 单字形行（bullet 形 4×10，比值 2.5<3）不判旋转——保留栏成员资格
    const bullet: LineBox = { x: 54, y: 80, w: 4, h: 10 }
    const withBullet = detectColumnLayout([bullet, ...Array.from({ length: 4 }, (_, i): LineBox => ({ x: 60, y: 80 + (i + 1) * 16, w: 300, h: 12 }))])
    expect(withBullet.kind).toBe('single')
    expect(withBullet.rotated).toHaveLength(0)
    expect(withBullet.columns[0]?.boxes).toContain(bullet)
  })
})
