/**
 * [F-DBCAMP-01 DB-3 U2] qr-encode 锁定测试（always-active——纯函数 vitest 直测，
 * 零 DOM）。
 *
 * 测试策略=有效性≠精确性（简报③-7）：任何合法 QR 可扫即达标——
 * ①结构断言族：三 finder 定位（7×7+分隔）位置尺寸/timing 交替/alignment 按
 * 版本表在位/dark module(4v+9,8) 恒黑/format BCH(15,5) 解码回读=ECC M+掩码号。
 * ②RS 独立代数校验：测试内极小 GF(256) 复刻（α=2/本原 0x11d——独立于实现，
 * 不 import 实现的 GF 表），各块完整码字多项式在生成子全部根处求值≡0。
 * ③确定性：同输入两次矩阵全等；1 字节差矩阵不等。
 * ④容量锚：101 字节 bundle→版本 6（size=41）；超容量显性 throw。
 * 容量手算注：101 字节 ≤ v6-M byte 容量 106（余量 5——v6-M 数据码字 108，
 * (108×8−4−8)/8=106.5→106）；v10-M=213（(216×8−4−16)/8=213.5→213）。
 */
import { describe, expect, it } from 'vitest'
import {
  buildBlocks,
  encodeQr,
  interleave,
  type QrMatrix
} from '../../../src/renderer/shared/qr/qr-encode'

const UUID = '3f2b8a04-5c6d-4e1f-9a2b-7c8d9e0f1a2b'
/** 101 字节 bundle=uuid(36)+':'+64-hex（简报⑤ 基线数字） */
const BUNDLE = `${UUID}:${'ab'.repeat(32)}`

/** 阶段一的 7×7 finder 图案判定（含 1 环分隔外的 8×8 边界=浅色由调用方断言） */
function isFinderCell(i: number, j: number): boolean {
  return i === 0 || i === 6 || j === 0 || j === 6 || (i >= 2 && i <= 4 && j >= 2 && j <= 4)
}

function isAlignmentCell(i: number, j: number): boolean {
  return i === 0 || i === 4 || j === 0 || j === 4 || (i === 2 && j === 2)
}

// ── 测试内独立 GF(256)（不 import 实现——代数校验独立性）──
const EXP = new Uint8Array(512)
const LOG = new Uint8Array(256)
for (let i = 0, x = 1; i < 255; i++) {
  EXP[i] = x
  LOG[x] = i
  x <<= 1
  if (x >= 256) x ^= 0x11d
}
for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255]!
function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0
  return EXP[LOG[a]! + LOG[b]!]!
}

/** 多项式（最高次幂在前）在 α^k 处求值（Horner） */
function evalAtRoot(coeffs: number[], k: number): number {
  let acc = 0
  const root = EXP[k]!
  for (const c of coeffs) {
    acc = gfMul(acc, root) ^ c
  }
  return acc
}

describe('F-DBCAMP-01 DB-3 U2 qr-encode —— byte mode/ECC M/v1-10/掩码自动（纯函数）', () => {
  it('结构族：101 字节 bundle→版本 6（size=41）+三 finder 7×7 图案+分隔环浅色', () => {
    const m = encodeQr(BUNDLE)
    expect(m.size).toBe(41)
    expect(m.modules).toHaveLength(41)
    const corners = [
      [0, 0],
      [0, m.size - 7],
      [m.size - 7, 0]
    ]
    for (const corner of corners) {
      const r0 = corner[0]!
      const c0 = corner[1]!
      for (let i = 0; i < 7; i++) {
        for (let j = 0; j < 7; j++) {
          expect(m.modules[r0 + i]![c0 + j]!, `finder(${r0},${c0}) 单元(${i},${j})`).toBe(isFinderCell(i, j))
        }
      }
    }
    // 分隔环：finder 外一圈 8×8 边界恒浅色（三处）
    for (let j = 0; j <= 7; j++) {
      expect(m.modules[7]![j]).toBe(false)
      expect(m.modules[j]![7]).toBe(false)
      expect(m.modules[7]![m.size - 1 - j]).toBe(false)
      expect(m.modules[j]![m.size - 8]).toBe(false)
      expect(m.modules[m.size - 8]![j]).toBe(false)
      expect(m.modules[m.size - 1 - j]![7]).toBe(false)
    }
  })

  it('结构族：timing 行列交替（暗=偶下标）+dark module(4v+9,8) 恒黑', () => {
    const m = encodeQr(BUNDLE)
    for (let c = 8; c <= m.size - 9; c++) {
      expect(m.modules[6]![c]!, `timing 行列 ${c}`).toBe(c % 2 === 0)
      expect(m.modules[c]![6]!, `timing 列行 ${c}`).toBe(c % 2 === 0)
    }
    expect(m.modules[4 * 6 + 9]![8]).toBe(true)
  })

  it('结构族：alignment 图案按版本表在位（v6=[6,34]→唯一 (34,34) 中心；v10=[6,28,50]）', () => {
    const m6 = encodeQr(BUNDLE)
    expect(m6.size).toBe(41)
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 5; j++) {
        expect(m6.modules[34 - 2 + i]![34 - 2 + j]!, `v6 alignment(${i},${j})`).toBe(isAlignmentCell(i, j))
      }
    }
    const m10 = encodeQr('x'.repeat(213))
    expect(m10.size).toBe(57)
    for (const cell of [
      [28, 28],
      [28, 50],
      [50, 28],
      [50, 50]
    ]) {
      const r = cell[0]!
      const c = cell[1]!
      for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 5; j++) {
          expect(m10.modules[r - 2 + i]![c - 2 + j]!, `v10 alignment(${r},${c})(${i},${j})`).toBe(
            isAlignmentCell(i, j)
          )
        }
      }
    }
  })

  it('结构族：format BCH(15,5) 解码回读=ECC M（ecl 位 00）+掩码号合法+双副本一致', () => {
    const m = encodeQr(BUNDLE)
    const size = m.size
    // 副本 A 位序（MSB→LSB，标准摆放）
    const copyA: Array<[number, number]> = [
      [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
      [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8]
    ]
    const copyB: Array<[number, number]> = [
      [size - 1, 8], [size - 2, 8], [size - 3, 8], [size - 4, 8], [size - 5, 8], [size - 6, 8],
      [size - 7, 8], [8, size - 8], [8, size - 7], [8, size - 6], [8, size - 5], [8, size - 4],
      [8, size - 3], [8, size - 2], [8, size - 1]
    ]
    function readCopy(cells: Array<[number, number]>): number {
      let v = 0
      for (const [r, c] of cells) {
        v = (v << 1) | (m.modules[r]![c]! ? 1 : 0)
      }
      return v
    }
    const fa = readCopy(copyA) ^ 0x5412
    const fb = readCopy(copyB) ^ 0x5412
    // BCH(15,5) 余数校验（生成多项式 0x537——10 位余数应可由高 5 位重算复得）
    function bchRem(d5: number): number {
      let rem = d5 << 10
      for (let i = 14; i >= 10; i--) {
        if (((rem >> i) & 1) === 1) {
          rem ^= 0x537 << (i - 10)
        }
      }
      return rem & 0x3ff
    }
    const dataA = fa >> 10
    const dataB = fb >> 10
    expect(bchRem(dataA)).toBe(fa & 0x3ff)
    expect(bchRem(dataB)).toBe(fb & 0x3ff)
    expect(dataA >> 3).toBe(0)
    expect(dataB >> 3).toBe(0)
    // [F-DBCAMP-01 DB-3 U3] R-B：删 `dataA & 7` 值域两行恒真断言（0≤x≤7 对
    // 任意位运算结果恒真——实质锁由 BCH 回读/双副本一致/RS 回放族承载）
    expect(dataA).toBe(dataB)
  })

  it('RS 代数：v1 与 v6 各块完整码字在生成子全部根处求值≡0（GF(256) 独立复刻）', () => {
    for (const input of ['x', BUNDLE]) {
      const { blocks } = buildBlocks(input)
      for (const block of blocks) {
        const full = [...block.data, ...block.ecc]
        for (let k = 0; k < block.ecc.length; k++) {
          expect(evalAtRoot(full, k), `输入 ${input} 块在 α^${k} 处`).toBe(0)
        }
      }
    }
    // v6 块结构锚：4 块×(27 数据+16 ecc)
    const b6 = buildBlocks(BUNDLE)
    expect(b6.version).toBe(6)
    expect(b6.blocks).toHaveLength(4)
    expect(b6.blocks[0]!.data).toHaveLength(27)
    expect(b6.blocks[0]!.ecc).toHaveLength(16)
  })

  it('确定性：同输入两次矩阵全等；1 字节差矩阵不等', () => {
    const a1 = encodeQr(BUNDLE)
    const a2 = encodeQr(BUNDLE)
    expect(a1.modules).toEqual(a2.modules)
    const b = encodeQr(`${UUID}:${'ab'.repeat(31)}c1`)
    expect(b.modules).not.toEqual(a1.modules)
  })

  it('容量锚：v1=14 字节上限含端；v6=106；v10=213 上限含端；214 字节显性 throw', () => {
    expect(encodeQr('x'.repeat(14)).size).toBe(21)
    expect(encodeQr('x'.repeat(15)).size).toBe(25)
    expect(encodeQr('x'.repeat(106)).size).toBe(41)
    expect(encodeQr('x'.repeat(213)).size).toBe(57)
    expect(() => encodeQr('x'.repeat(214))).toThrow(/QR 载荷超容量/)
    // 中文按 UTF-8 字节计（TextEncoder 编码面）
    expect(encodeQr('智慧水务').size).toBe(21)
  })

  it('RS 代数 v10 锚：213 字节合成输入→v10（5 块 43/43/43/43/44+26ecc）根求值≡0（多块交错同锁）', () => {
    const input = 'x'.repeat(213)
    const b = buildBlocks(input)
    expect(b.version).toBe(10)
    expect(b.blocks).toHaveLength(5)
    expect(b.blocks.map((blk) => blk.data.length)).toEqual([43, 43, 43, 43, 44])
    expect(b.blocks[0]!.ecc).toHaveLength(26)
    for (const block of b.blocks) {
      const full = [...block.data, ...block.ecc]
      for (let k = 0; k < block.ecc.length; k++) {
        expect(evalAtRoot(full, k), `v10 块在 α^${k} 处`).toBe(0)
      }
    }
  })

  // ── [回炉 R1] 回放族：矩阵按标准函数面跳过后 zigzag 读出位流≡interleave 输出
  //（B-1 修复锁——格式位 30 单元未保留时数据位被覆写灭失，回放必现位流断裂）──

  /** 标准掩码函数独立复刻（ISO 18004——y=行/x=列） */
  const TEST_MASKS: Array<(y: number, x: number) => boolean> = [
    (y, x) => (y + x) % 2 === 0,
    (y, _x) => y % 2 === 0,
    (_y, x) => x % 3 === 0,
    (y, x) => (y + x) % 3 === 0,
    (y, x) => (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0,
    (y, x) => ((y * x) % 2) + ((y * x) % 3) === 0,
    (y, x) => (((y * x) % 2) + ((y * x) % 3)) % 2 === 0,
    (y, x) => (((y + x) % 2) + ((y * x) % 3)) % 2 === 0
  ]

  /** 独立重建标准函数面跳过网格（不复用实现 reserved——finder+分隔/timing/
   *  alignment/version/格式 30 单元/dark module） */
  function buildSkip(m: QrMatrix, version: number): boolean[][] {
    const size = m.size
    const skip: boolean[][] = Array.from({ length: size }, () => new Array<boolean>(size).fill(false))
    const mark = (y: number, x: number): void => {
      if (y >= 0 && y < size && x >= 0 && x < size) {
        skip[y]![x] = true
      }
    }
    for (const corner of [
      [0, 0],
      [0, size - 8],
      [size - 8, 0]
    ]) {
      const r0 = corner[0]!
      const c0 = corner[1]!
      for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
          mark(r0 + i, c0 + j)
        }
      }
    }
    for (let i = 0; i < size; i++) {
      mark(6, i)
      mark(i, 6)
    }
    const pos = ALIGN_POS_TEST[version] ?? []
    const n = pos.length - 1
    for (let i = 0; i < pos.length; i++) {
      for (let j = 0; j < pos.length; j++) {
        const isCorner = (i === 0 && j === 0) || (i === 0 && j === n) || (i === n && j === 0)
        if (!isCorner) {
          const cr = pos[i]!
          const cc = pos[j]!
          for (let a = -2; a <= 2; a++) {
            for (let b = -2; b <= 2; b++) {
              mark(cr + a, cc + b)
            }
          }
        }
      }
    }
    if (version >= 7) {
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 6; j++) {
          mark(i, size - 11 + j)
          mark(size - 11 + j, i)
        }
      }
    }
    for (const [y, x] of formatCellsTest(size)) {
      mark(y, x)
    }
    mark(size - 8, 8)
    return skip
  }

  const ALIGN_POS_TEST: Record<number, number[]> = {
    1: [],
    2: [6, 18],
    3: [6, 22],
    4: [6, 26],
    5: [6, 30],
    6: [6, 34],
    7: [6, 22, 38],
    8: [6, 24, 42],
    9: [6, 26, 46],
    10: [6, 28, 50]
  }

  function formatCellsTest(s: number): Array<[number, number]> {
    return [
      [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
      [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
      [s - 1, 8], [s - 2, 8], [s - 3, 8], [s - 4, 8], [s - 5, 8], [s - 6, 8], [s - 7, 8],
      [8, s - 8], [8, s - 7], [8, s - 6], [8, s - 5], [8, s - 4], [8, s - 3], [8, s - 2], [8, s - 1]
    ]
  }

  /** 从 format 副本 A 解码所选掩码号（BCH 已由结构族锁——此处只取 mask 段） */
  function decodeMaskOf(m: QrMatrix): number {
    let v = 0
    for (const [r, c] of formatCellsTest(m.size).slice(0, 15)) {
      v = (v << 1) | (m.modules[r]![c]! ? 1 : 0)
    }
    return (v ^ 0x5412) >> 10 & 7
  }

  /** zigzag 回放位流（跳过函数面+按解码掩码号反掩码） */
  function replayBits(m: QrMatrix, version: number): number[] {
    const size = m.size
    const skip = buildSkip(m, version)
    const mask = TEST_MASKS[decodeMaskOf(m)]!
    const bits: number[] = []
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) {
        right = 5
      }
      for (let vert = 0; vert < size; vert++) {
        for (let j = 0; j < 2; j++) {
          const x = right - j
          const upward = ((right + 1) & 2) === 0
          const y = upward ? size - 1 - vert : vert
          if (!skip[y]![x]) {
            const masked = m.modules[y]![x]!
            bits.push((masked !== mask(y, x) ? 1 : 0))
          }
        }
      }
    }
    return bits
  }

  function expectedBits(text: string): { bits: number[]; version: number } {
    const built = buildBlocks(text)
    const cw = interleave(built.blocks)
    const bits: number[] = []
    for (const b of cw) {
      for (let i = 7; i >= 0; i--) {
        bits.push((b >>> i) & 1)
      }
    }
    return { bits, version: built.version }
  }

  it.each([
    ['v1 短串', 'x'],
    ['101 字节 bundle（v6）', BUNDLE]
  ])('回放：矩阵（标准函数面跳过+掩码反转）zigzag 位流≡interleave 码字流（%s）', (_label, text) => {
    const { version } = expectedBits(text)
    const m = encodeQr(text)
    const replay = replayBits(m, version)
    const expectBits = expectedBits(text).bits
    expect(replay.length).toBeGreaterThanOrEqual(expectBits.length)
    expect(replay.slice(0, expectBits.length), '回放位流与编码码字流逐位对齐').toEqual(expectBits)
  })
})
