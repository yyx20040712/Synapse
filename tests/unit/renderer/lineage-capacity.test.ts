/**
 * [F-SLOTGRID-01 U1] capacity 纯函数族单测——砖砌卡槽网格布局数学单源
 * （设计书 docs/design/2026-10-07_f-slotgrid01-design.md v1.4 §2/§5.1/§5.2；
 * INV-SLOTGRID-01 强制面）。容量锚点=主控首动作探针实测（仓外
 * scripts-audits/20261007-slotgrid-open/wprobe-output.log）：margin 右 46 后
 * 1280 窗 W=570.4/1920 窗 W=1204.8；现状 margin 58 复核锚 558.4/1192.8。
 *
 * 断言形态=每 it 单根 expect（恒真断言禁令——期望值逐字面量内联，翻转任一
 * 字面量即该 it 红；红证留档仓外 scripts-audits/20261008-slotgrid-u1/）。
 * always-active 裸 describe（K3 威胁结构性缺位——新测试不经 guardedDescribe）。
 */
import { describe, expect, it } from 'vitest'
import {
  capacities,
  capacityOfRow,
  phaseOfRow,
  partitionRows,
  positionOf,
  indexOf,
  hitTest,
  CARD_W,
  CARD_H,
  GAP,
  PITCH_X,
  PITCH_Y,
  OFFSET_O,
  FRAME_PAD_LEFT,
  FRAME_PAD_TOP
} from '../../../src/renderer/features/lineage/capacity'

describe('F-SLOTGRID-01 capacity 纯函数族（砖砌网格数学——INV-SLOTGRID-01）', () => {
  it('常量锚：卡 128×72/行隙=列隙 72/节距 200×144/错位 o=100/框内容左 12 顶 18（设计 §5.1 实测锚定）', () => {
    expect([CARD_W, CARD_H, GAP, PITCH_X, PITCH_Y, OFFSET_O, FRAME_PAD_LEFT, FRAME_PAD_TOP]).toEqual([
      128, 72, 72, 200, 144, 100, 12, 18
    ])
  })

  it('容量公式 N=⌊(W+72)/200⌋/M=⌊(W+72−100)/200⌋ 四实测锚点：558.4→3/2、570.4→3/2、1192.8→6/5、1204.8→6/5', () => {
    expect([capacities(558.4), capacities(570.4), capacities(1192.8), capacities(1204.8)]).toEqual([
      { n: 3, m: 2 },
      { n: 3, m: 2 },
      { n: 6, m: 5 },
      { n: 6, m: 5 }
    ])
  })

  it('bond 判据：r=(W+72) mod 200<100 ⟺ N−M=1（含 W=728/928 整除边界与 W=1228 r=100 去 bond 临界面）', () => {
    const ws = [320, 428, 570.4, 620, 728, 928, 1128, 1204.8, 1227.9, 1228, 1228.1, 1328]
    expect(
      ws.map((w) => {
        const c = capacities(w)
        return [(w + GAP) % PITCH_X < OFFSET_O, c.n - c.m]
      })
    ).toEqual([
      [false, 0], [false, 0], [true, 1], [true, 1], [true, 1], [true, 1],
      [true, 1], [true, 1], [true, 1], [false, 0], [false, 0], [true, 1]
    ])
  })

  it('capacityOfRow：偶行 N/奇行 M（W=570.4→3,2,3,2,3,2）', () => {
    expect([0, 1, 2, 3, 4, 5].map((r) => capacityOfRow(r, 570.4))).toEqual([3, 2, 3, 2, 3, 2])
  })

  it('相位 φ_r：r 偶 0/r 奇 100（o=100 呈裁点 1 定值——奇行卡 x=12+100+200k）', () => {
    expect([0, 1, 2, 3, 4, 5, 6].map((r) => phaseOfRow(r))).toEqual([0, 100, 0, 100, 0, 100, 0])
  })

  it('partitionRows 数组序贪心分行：W=570.4 七卡→[3,2,2 残]（末行残行合法形态）', () => {
    expect(partitionRows(7, 570.4)).toEqual([[0, 1, 2], [3, 4], [5, 6]])
  })

  it('partitionRows 单卡/零卡：[[0]]/[]', () => {
    expect([partitionRows(1, 570.4), partitionRows(0, 570.4)]).toEqual([[[0]], []])
  })

  it('partitionRows 巨量千卡不死循环+总量守恒+全域数组序保持+行容量序列 [3,2,3,2,3]', () => {
    const rows = partitionRows(1000, 570.4)
    expect([rows.flat().length, rows.flat().every((v, i) => v === i), rows.map((r) => r.length).slice(0, 5)]).toEqual([
      1000, true, [3, 2, 3, 2, 3]
    ])
  })

  it('partitionRows unmeasured 降级（W=0）：全部卡入首行单行+数组序不变（防御性死循环锁——降级态零特判崩溃）', () => {
    expect(partitionRows(9, 0)).toEqual([[0, 1, 2, 3, 4, 5, 6, 7, 8]])
  })

  it('partitionRows 退化实测窗（0<W<228 容量不足 1 钳 1）：W=200/W=50 五卡→五行各 1（W>0 恒 measured 每行至少 1 卡）', () => {
    expect([partitionRows(5, 200), partitionRows(5, 50)]).toEqual([
      [[0], [1], [2], [3], [4]],
      [[0], [1], [2], [3], [4]]
    ])
  })

  it('W 非有限/负值态：capacities(NaN/−1/+∞) 全→∞∞（unmeasured 降级——jsdom/空图同态）', () => {
    expect([capacities(Number.NaN), capacities(-1), capacities(Number.POSITIVE_INFINITY)]).toEqual([
      { n: Number.POSITIVE_INFINITY, m: Number.POSITIVE_INFINITY },
      { n: Number.POSITIVE_INFINITY, m: Number.POSITIVE_INFINITY },
      { n: Number.POSITIVE_INFINITY, m: Number.POSITIVE_INFINITY }
    ])
  })

  it('双射往返恒等 index→positionOf→indexOf 全域（六档 W×前六行容量全域枚举——逐 index 恒等）', () => {
    const ws = [558.4, 570.4, 1192.8, 1204.8, 720, 1000]
    const out: boolean[] = []
    for (const w of ws) {
      let total = 0
      for (let r = 0; r < 6; r++) total += capacityOfRow(r, w)
      for (let i = 0; i < total; i++) {
        const p = positionOf(i, w)
        out.push(indexOf(p.row, p.col, w) === i)
      }
    }
    expect(out.length).toBeGreaterThan(50) // 枚举域非空卫（六档×≥10 卡）
    expect(out.every((x) => x === true)).toBe(true)
  })

  it('双射与 partitionRows 一致：positionOf(i) 落 partition 对应 (row,col) 格（W=570.4×14 卡全格）', () => {
    const rows = partitionRows(14, 570.4)
    expect(
      rows.flatMap((row, r) => row.map((i, k) => {
        const p = positionOf(i, 570.4)
        return p.row === r && p.col === k
      }))
    ).toEqual(rows.flatMap((row) => row.map(() => true)))
  })

  it('hitTest 卡中心命中：px=12+φ_r+200k+64/py=18+144r+36 → (r,k) 且 index=Σ前行容量+col（W=570.4 前三行全格）', () => {
    const w = 570.4
    const rowCounts = [3, 2, 3] // partitionRows(8, 570.4) 各行长度（满行态）
    const res: boolean[] = []
    for (let r = 0; r < 3; r++) {
      for (let k = 0; k < rowCounts[r]!; k++) {
        const h = hitTest(FRAME_PAD_LEFT + phaseOfRow(r) + PITCH_X * k + CARD_W / 2, FRAME_PAD_TOP + PITCH_Y * r + CARD_H / 2, w, rowCounts)
        res.push(h.row === r && h.col === k && h.index === indexOf(r, k, w))
      }
    }
    expect(res).toEqual(res.map(() => true))
  })

  it('hitTest 行 clamp 上下界：py=−500→0/py=99999→2/py=18→0/py=行2 末 0.1px→2（rowCounts=[3,2,3]）', () => {
    expect([
      hitTest(76, -500, 570.4, [3, 2, 3]).row,
      hitTest(76, 99999, 570.4, [3, 2, 3]).row,
      hitTest(76, 18, 570.4, [3, 2, 3]).row,
      hitTest(76, 18 + 144 * 2 + 71.9, 570.4, [3, 2, 3]).row
    ]).toEqual([0, 2, 0, 2])
  })

  it('hitTest 列 clamp 两侧+index 合成：px=−999/99999 偶行钳 [0,2]、奇行钳 [0,1]（cap_r 奇偶界）', () => {
    expect([
      hitTest(-999, 40, 570.4, [3, 2, 3]),
      hitTest(99999, 40, 570.4, [3, 2, 3]),
      hitTest(-999, 18 + 144 + 40, 570.4, [3, 2, 3]),
      hitTest(99999, 18 + 144 + 40, 570.4, [3, 2, 3])
    ]).toEqual([
      { row: 0, col: 0, index: 0 },
      { row: 0, col: 2, index: 2 },
      { row: 1, col: 0, index: 3 },
      { row: 1, col: 1, index: 4 }
    ])
  })

  it('hitTest o=100 相位生效：同 px=376 奇行命中 col1（x 阶 100）/偶行命中 col2（px−12−φ−64 差 100）', () => {
    expect([hitTest(376, 18 + 144 + 36, 570.4, [3, 2, 3]), hitTest(376, 18 + 36, 570.4, [3, 2, 3])]).toEqual([
      { row: 1, col: 1, index: 4 },
      { row: 0, col: 2, index: 2 }
    ])
  })

  it('[回炉 r1 d1-W1] 残行 col 钳：末残行命中钳实有卡数−1（W=558.4/rowCounts=[3,2,1]——px 越界与 col2 位皆钳 col0/index=5，不再返回不存在的 index 7）', () => {
    expect([hitTest(9999, 342, 558.4, [3, 2, 1]), hitTest(276, 342, 558.4, [3, 2, 1])]).toEqual([
      { row: 2, col: 0, index: 5 },
      { row: 2, col: 0, index: 5 }
    ])
  })

  it('[回炉 r1 d1-W1] 空 rowCounts 守卫+零卡行钳：[] → 零位形不崩；[0] 行越界 px → col/index 钳 0（不返回不存在位）', () => {
    expect([hitTest(76, 40, 570.4, []), hitTest(9999, 40, 570.4, [0])]).toEqual([
      { row: 0, col: 0, index: 0 },
      { row: 0, col: 0, index: 0 }
    ])
  })

  it('[门一增量复审 d1-N1/k1-N2] px/py 非有限守卫（垃圾入有界出——col 不漏 NaN）：NaN/±∞ 入参 → 全零位形', () => {
    expect([
      hitTest(Number.NaN, 40, 570.4, [3, 2, 3]),
      hitTest(76, Number.NaN, 570.4, [3, 2, 3]),
      hitTest(Number.POSITIVE_INFINITY, 40, 570.4, [3, 2, 3])
    ]).toEqual([
      { row: 0, col: 0, index: 0 },
      { row: 0, col: 0, index: 0 },
      { row: 0, col: 0, index: 0 }
    ])
  })

  it('[回炉 r1 N1] indexOf 负/非有限入参防御（镜像 positionOf）：row/col 任一负或非有限 → 0', () => {
    expect([
      indexOf(-1, 0, 570.4),
      indexOf(0, -2, 570.4),
      indexOf(Number.NaN, 1, 570.4),
      indexOf(1, Number.POSITIVE_INFINITY, 570.4)
    ]).toEqual([0, 0, 0, 0])
  })
})
