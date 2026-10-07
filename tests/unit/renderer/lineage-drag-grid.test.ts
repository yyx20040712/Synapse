/**
 * [F-SLOTGRID-01 U3] card-drag-grid 纯函数直测（INV-111 消费面算术——设计书
 * v1.4 §5.5/§8-U3+简报 D1/D3/D8/D9；先红后绿 always-active）。
 *
 * 算术域两函数（capacity.ts 只读消费——D1：插入语义归消费面新件）：
 * - insertIndexFromGrid(px,py,w,total,srcIdx)：含源布局（rowCounts 含源卡——
 *   D3 保守语义）网格命中 → others 序插入位；推挤滞回结构性消除=判定面不随
 *   占位槽腾位漂移（含源网格拖拽全程恒稳）。
 * - candidateSlotAt(k,w)：候选槽阵列 cell k 坐标（F-DRAGVIS-01/D8——与松手
 *   落点同源：settle 落 cell insertIdx）。
 *
 * 期望值全公式化（capacity 常量同源拼装，禁硬编码坐标字面值——D10 同款纪律）。
 * W 锚：558.4=1280 视口实测（N=3/M=2）；293=1000 视口（1/1 纵排——D6）；
 * 0=unmeasured（容量 ∞ 单行——capacity.ts W 状态机）。
 */
import { describe, expect, it } from 'vitest'
import {
  CARD_W,
  FRAME_PAD_LEFT,
  FRAME_PAD_TOP,
  OFFSET_O,
  PITCH_X,
  PITCH_Y,
  capacities,
  partitionRows
} from '../../../src/renderer/features/lineage/capacity'
import {
  candidateSlotAt,
  insertIndexFromGrid
} from '../../../src/renderer/features/lineage/card-drag-grid'

/** 卡中心 x（行 r 列 k——§5.5 INV-111 算式同源拼装） */
const centerX = (r: number, k: number): number =>
  FRAME_PAD_LEFT + (r % 2 === 1 ? OFFSET_O : 0) + PITCH_X * k + CARD_W / 2
/** 行 r 顶 y（§5.2 卡几何） */
const topY = (r: number): number => FRAME_PAD_TOP + PITCH_Y * r

const W1280 = 558.4
const W1000 = 293

/** 独立 oracle：partitionRows 逐行步进推导 cell 坐标（与 positionOf 异路——双源对账） */
const cellByWalk = (idx: number, w: number): { x: number; y: number } => {
  const rows = partitionRows(idx + 1, w)
  let seen = 0
  for (let r = 0; r < rows.length; r++) {
    if (idx < seen + rows[r]!.length) {
      const col = idx - seen
      return { x: FRAME_PAD_LEFT + (r % 2 === 1 ? OFFSET_O : 0) + PITCH_X * col, y: topY(r) }
    }
    seen += rows[r]!.length
  }
  throw new Error(`cellByWalk 不可达：idx=${idx}`)
}

describe('[F-SLOTGRID-01 U3] insertIndexFromGrid（含源网格插入位算术）', () => {
  it('容量前提布防：W1280→N3/M2 分行 [3,2]；W1000→1/1 纵排；0→unmeasured 单行', () => {
    expect(capacities(W1280)).toEqual({ n: 3, m: 2 })
    expect(partitionRows(5, W1280).map((r) => r.length)).toEqual([3, 2])
    expect(capacities(W1000)).toEqual({ n: 1, m: 1 })
    expect(partitionRows(3, W1000).map((r) => r.length)).toEqual([1, 1, 1])
    expect(partitionRows(3, 0).map((r) => r.length)).toEqual([3])
  })

  it('同行中心边界（±1px 异侧）：row0 源在末行（srcIdx=4）——idx1 中心前=插其前/后=插其后', () => {
    // 含源 [c0,c1,c2|c3,c4]，源=c4（srcIdx=4）；指针落 row0 idx1 中心两侧
    expect(insertIndexFromGrid(centerX(0, 1) - 1, topY(0) + 10, W1280, 5, 4)).toBe(1)
    expect(insertIndexFromGrid(centerX(0, 1) + 1, topY(0) + 10, W1280, 5, 4)).toBe(2)
  })

  it('跨行带命中（奇行 φ=100 相位）：row1 idx3 中心前后分插 idx3/源原位', () => {
    expect(insertIndexFromGrid(centerX(1, 0) - 1, topY(1) + 30, W1280, 5, 4)).toBe(3)
    expect(insertIndexFromGrid(centerX(1, 0) + 1, topY(1) + 30, W1280, 5, 4)).toBe(4)
  })

  it('源卡自身槽稳定（滞回锚——D3/D6）：源槽中心±1 双侧同值=无双稳带', () => {
    // 源=c4（row1 col1 中心 376）：前侧 p=4/后侧 p=5 → 映射后同归 4（原位 no-op）
    expect(insertIndexFromGrid(centerX(1, 1) - 1, topY(1) + 30, W1280, 5, 4)).toBe(4)
    expect(insertIndexFromGrid(centerX(1, 1) + 1, topY(1) + 30, W1280, 5, 4)).toBe(4)
    // 纵排（W1000）源=首卡：自身槽前后同归 0
    expect(insertIndexFromGrid(centerX(0, 0) - 1, topY(0) + 5, W1000, 3, 0)).toBe(0)
    expect(insertIndexFromGrid(centerX(0, 0) + 1, topY(0) + 5, W1000, 3, 0)).toBe(0)
  })

  it('行钳上下界：py<0→row0；py 超末行带→末行（含源 rows−1）', () => {
    // py=−50 → row0 idx0 前 → p=0；py=9999 → row1（末行）col 按 px 钳
    expect(insertIndexFromGrid(centerX(0, 0) - 1, -50, W1280, 5, 4)).toBe(0)
    // 末行带 py=9999：px 落 row1 idx4 中心后 → p=5 → 映射 4（源原位）
    expect(insertIndexFromGrid(centerX(1, 1) + 1, 9999, W1280, 5, 4)).toBe(4)
  })

  it('残行钳（末行实有数）：total=4→rows [3,1]，row1 右侧远点钳回唯一卡', () => {
    // 含源 [c0,c1,c2|c3]，源=c0：row1 残行 1 卡（idx3 中心 176）；px=176+300 远右
    // → col 钳 0 → 命中 idx3 → 后侧 → p=4 → insertIdx=3（组末）
    expect(insertIndexFromGrid(centerX(1, 0) + 300, topY(1) + 30, W1280, 4, 0)).toBe(3)
  })

  it('unmeasured（w=0）单行语义：py 不参与分行，px 中心序定插入位', () => {
    // 单行 [c0,c1,c2]，源=c0：idx2 中心后 → p=3 → insertIdx=2（组末）
    expect(insertIndexFromGrid(centerX(0, 2) + 1, 999, 0, 3, 0)).toBe(2)
  })

  it('值域防御扫掠：全域 (W×total×srcIdx×px×py) 组合恒落 [0,total-1]', () => {
    const pySweep = [-50, 10, 161, 200, 400, 800]
    for (const w of [W1280, W1000, 0, 228, 1327.9]) {
      for (let total = 1; total <= 8; total++) {
        for (let srcIdx = 0; srcIdx < total; srcIdx++) {
          for (let px = -100; px <= w + 300; px += 61) {
            for (const py of pySweep) {
              const i = insertIndexFromGrid(px, py, w, total, srcIdx)
              expect(Number.isInteger(i)).toBe(true)
              expect(i).toBeGreaterThanOrEqual(0)
              expect(i).toBeLessThanOrEqual(total - 1)
            }
          }
        }
      }
    }
  })

  it('settle 落位格坐标恒等（INV-SLOTGRID-01 U3 补强形态）：candidateSlotAt=cellByWalk(k) 独立 oracle 逐格对账（行为闭环由 S1/S2/S7+γ1 承载）', () => {
    for (const w of [W1280, W1000, 428]) {
      for (let k = 0; k < 6; k++) {
        const cell = candidateSlotAt(k, w)
        const oracle = cellByWalk(k, w)
        expect(cell.x, `W=${w} k=${k} x`).toBe(oracle.x)
        expect(cell.y, `W=${w} k=${k} y`).toBe(oracle.y)
      }
    }
  })
})

describe('[F-SLOTGRID-01 U3] candidateSlotAt（F-DRAGVIS-01 候选阵列算术）', () => {
  it('相位 φ_r：偶行 x=12 起/奇行 x=12+100 起；y=18+144r（capacity 常量拼装）', () => {
    const c0 = candidateSlotAt(0, W1280)
    expect(c0).toEqual({ x: FRAME_PAD_LEFT, y: FRAME_PAD_TOP })
    const c3 = candidateSlotAt(3, W1280) // total≥4 → row1 col0
    expect(c3).toEqual({ x: FRAME_PAD_LEFT + OFFSET_O, y: FRAME_PAD_TOP + PITCH_Y })
  })

  it('阵列全域=含源网格 cell 集（0..total-1 与 partitionRows 排布逐格对齐——独立 oracle 对账）', () => {
    for (const w of [W1280, W1000, 0, 1127.9]) {
      for (let total = 1; total <= 7; total++) {
        for (let k = 0; k < total; k++) {
          const cell = candidateSlotAt(k, w)
          const oracle = cellByWalk(k, w)
          expect([cell.x, cell.y], `W=${w} total=${total} k=${k}`).toEqual([oracle.x, oracle.y])
        }
      }
    }
  })

  it('随容量实时重排锚（D8）：同 total 下 W 变→cell 随容量公式迁移（1280 六卡两行/1000 六卡纵排）', () => {
    // total=6：W1280 rows [3,2,1] → k=4 落 row1 col1；W1000 rows [1×6] → k=4 落 row4 col0
    expect(candidateSlotAt(4, W1280)).toEqual({
      x: FRAME_PAD_LEFT + OFFSET_O + PITCH_X,
      y: FRAME_PAD_TOP + PITCH_Y
    })
    expect(candidateSlotAt(4, W1000)).toEqual({
      x: FRAME_PAD_LEFT,
      y: FRAME_PAD_TOP + PITCH_Y * 4
    })
  })
})
