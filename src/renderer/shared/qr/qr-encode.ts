/**
 * [F-DBCAMP-01 DB-3 U2] qr-encode —— QR 编码器（仓内纯 TS 实现——零依赖铁律，
 * 简报③-7：byte mode+ECC M+版本 1-10 自动选择+8 掩码 penalty 自动）。
 *
 * ── 行为层 ──
 * - 输入=UTF-8 字节（TextEncoder——renderer 零 Node API）；输出={size, modules}
 *   （size=17+4v，modules[y][x] 暗模块布尔）。
 * - 版本选择：最小 v∈1..10 使字节数 ≤ byte 容量（v1-9: 数据码字−2；v10:
 *   数据码字−3——count 位 8/16 分界）。超容量显性 throw（中文域错误文案）。
 * - 块结构（ECC M，v1-10；数据码字与容量表对账=全表逐位复算闭合）：
 *   v1 1×16+10ecc / v2 1×28+16 / v3 1×44+26 / v4 2×32+18 / v5 2×43+24 /
 *   v6 4×27+16 / v7 4×31+18 / v8 (2×38+2×39)+22 / v9 (3×36+2×37)+22 /
 *   v10 (4×43+1×44)+26。
 * - RS(255,k) over GF(256)（α=2，本原多项式 0x11d）——ecc=数据多项式×x^n mod
 *   生成子（根 α^0..α^(n-1)——代数性质=码字多项式在生成子全部根处求值≡0）。
 * - 摆放：zigzag 双列条带自右下（跳 timing 列 6/函数模块）；函数面=finder
 *   7×7×3+分隔+timing+alignment（版本位置表）+format×2+version(v≥7)×2+
 *   dark module(4v+9,8)。format=BCH(15,5)（生成子 0x537，掩码 0x5412，
 *   ecl M=00）。version(v≥7)=BCH(18,6)（生成子 0x1F25）。
 * - 掩码：8 函数全枚举+penalty 四规则（N1 连游 3+(len−5)/N2 2×2 同色×3/
 *   N3 1:1:3:1:1 探测子序列×40/N4 暗比例 10×floor(|pct−50|/5)）取最小。
 *
 * ── 接口层 ──
 * - encodeQr(text: string): QrMatrix —— 渲染件消费（SyncKeySection svg 映射）
 * - buildBlocks(text: string): QrBlocks —— 测试/对账面（RS 代数校验消费——
 *   非死代码；矩阵编码内部单源复用）
 *
 * ── 文化层 ──
 * - 纯函数零 DOM/零 Node 依赖（renderer 沙箱合法面）；确定性（INV-D 同族：
 *   同输入恒同矩阵——qr-encode.test.ts 锁）。测试：tests/unit/renderer/qr-encode.test.ts。
 */

export interface QrMatrix {
  size: number
  modules: boolean[][]
}

export interface QrBlock {
  data: number[]
  ecc: number[]
}

export interface QrBlocks {
  version: number
  blocks: QrBlock[]
}

/** ECC M 块结构表（v1-10：数据码字块组+每块 ecc 长度——头注行为层对账源） */
const BLOCK_TABLE: Array<{ groups: Array<{ count: number; data: number }>; ecc: number }> = [
  { groups: [{ count: 1, data: 16 }], ecc: 10 },
  { groups: [{ count: 1, data: 28 }], ecc: 16 },
  { groups: [{ count: 1, data: 44 }], ecc: 26 },
  { groups: [{ count: 2, data: 32 }], ecc: 18 },
  { groups: [{ count: 2, data: 43 }], ecc: 24 },
  { groups: [{ count: 4, data: 27 }], ecc: 16 },
  { groups: [{ count: 4, data: 31 }], ecc: 18 },
  { groups: [
    { count: 2, data: 38 },
    { count: 2, data: 39 }
  ], ecc: 22 },
  { groups: [
    { count: 3, data: 36 },
    { count: 2, data: 37 }
  ], ecc: 22 },
  { groups: [
    { count: 4, data: 43 },
    { count: 1, data: 44 }
  ], ecc: 26 }
]

/** byte 容量（v1-9 count=8 位：数据码字−2；v10 count=16 位：数据码字−3） */
const BYTE_CAPACITY = BLOCK_TABLE.map((t, i) => {
  const dataCw = t.groups.reduce((s, g) => s + g.count * g.data, 0)
  const countBits = i >= 9 ? 16 : 8
  return Math.floor((dataCw * 8 - 4 - countBits) / 8)
})

/** alignment 位置表（v1 无——仅 finder 角） */
const ALIGNMENT_POS: Record<number, number[]> = {
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

// ── GF(256)（α=2，本原多项式 0x11d）──
const GF_EXP = new Uint8Array(512)
const GF_LOG = new Uint8Array(256)
for (let i = 0, x = 1; i < 255; i++) {
  GF_EXP[i] = x
  GF_LOG[x] = i
  x <<= 1
  if (x >= 256) {
    x ^= 0x11d
  }
}
for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255]!

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0
  return GF_EXP[GF_LOG[a]! + GF_LOG[b]!]!
}

/** RS 生成子多项式（度=n，系数最高次幂在前——根 α^0..α^(n-1)） */
function rsGenerator(n: number): number[] {
  let poly = [1]
  for (let i = 0; i < n; i++) {
    const next = new Array<number>(poly.length + 1).fill(0)
    for (let j = 0; j < poly.length; j++) {
      next[j] = (next[j] ?? 0) ^ gfMul(poly[j]!, 1)
      next[j + 1] = (next[j + 1] ?? 0) ^ gfMul(poly[j]!, GF_EXP[i]!)
    }
    poly = next
  }
  return poly
}

/** ecc=数据多项式×x^n mod 生成子（长除法——返回 n 字节余数） */
function rsEncode(data: number[], eccLen: number): number[] {
  const gen = rsGenerator(eccLen)
  const rem = new Array<number>(eccLen).fill(0)
  for (const b of data) {
    const factor = b ^ (rem.shift() ?? 0)
    rem.push(0)
    if (factor !== 0) {
      for (let i = 0; i < eccLen; i++) {
        rem[i]! ^= gfMul(gen[i + 1]!, factor)
      }
    }
  }
  return rem
}

function pickVersion(byteLen: number): number {
  for (let v = 0; v < BYTE_CAPACITY.length; v++) {
    if (byteLen <= BYTE_CAPACITY[v]!) {
      return v + 1
    }
  }
  throw new Error(
    `QR 载荷超容量：${byteLen} 字节超出 v10-M byte 模式容量 ${BYTE_CAPACITY[9]!} 字节（同步密钥 bundle 恒 101 字节，正常路径不可达）`
  )
}

/** 数据码字流：mode0100+count+数据+终止符+字节对齐+0xEC/0x11 交替补齐 */
function dataCodewords(bytes: Uint8Array, version: number): number[] {
  const spec = BLOCK_TABLE[version - 1]!
  const dataCwTotal = spec.groups.reduce((s, g) => s + g.count * g.data, 0)
  const countBits = version >= 10 ? 16 : 8
  const bits: number[] = []
  const push = (val: number, n: number): void => {
    for (let i = n - 1; i >= 0; i--) {
      bits.push((val >>> i) & 1)
    }
  }
  push(0b0100, 4)
  push(bytes.length, countBits)
  for (const b of bytes) {
    push(b, 8)
  }
  const capacityBits = dataCwTotal * 8
  const termLen = Math.min(4, capacityBits - bits.length)
  push(0, termLen)
  while (bits.length % 8 !== 0) {
    bits.push(0)
  }
  const cw: number[] = []
  for (let i = 0; i < bits.length; i += 8) {
    let v = 0
    for (let j = 0; j < 8; j++) {
      v = (v << 1) | bits[i + j]!
    }
    cw.push(v)
  }
  for (let pad = 0; cw.length < dataCwTotal; pad++) {
    cw.push(pad % 2 === 0 ? 0xec : 0x11)
  }
  return cw
}

/** 块切分+RS：测试/对账面（矩阵编码内部单源复用） */
export function buildBlocks(text: string): QrBlocks {
  const bytes = new TextEncoder().encode(text)
  const version = pickVersion(bytes.length)
  const spec = BLOCK_TABLE[version - 1]!
  const cw = dataCodewords(bytes, version)
  const blocks: QrBlock[] = []
  let off = 0
  for (const g of spec.groups) {
    for (let i = 0; i < g.count; i++) {
      const data = cw.slice(off, off + g.data)
      off += g.data
      blocks.push({ data, ecc: rsEncode(data, spec.ecc) })
    }
  }
  return { version, blocks }
}

/** 交错：数据列优先（块序）→ecc 列优先（余位 0 比特由摆放面补——v1=0 位、
 *  v2-6=7 位、v7-13=0 位；回放测试消费（码字流对账单源）） */
export function interleave(blocks: QrBlock[]): number[] {
  const out: number[] = []
  const maxData = Math.max(...blocks.map((b) => b.data.length))
  for (let i = 0; i < maxData; i++) {
    for (const b of blocks) {
      if (i < b.data.length) {
        out.push(b.data[i]!)
      }
    }
  }
  for (let i = 0; i < blocks[0]!.ecc.length; i++) {
    for (const b of blocks) {
      out.push(b.ecc[i]!)
    }
  }
  return out
}

// ── 矩阵面 ──

function alignmentCenters(version: number): Array<[number, number]> {
  const pos = ALIGNMENT_POS[version]
  if (pos === undefined) return []
  const out: Array<[number, number]> = []
  const n = pos.length - 1
  for (let i = 0; i < pos.length; i++) {
    for (let j = 0; j < pos.length; j++) {
      // 排除三 finder 角：(首,首)/(首,尾)/(尾,首)——右下 (尾,尾) 保留（v≥2 在位）
      const isFinderCorner =
        (i === 0 && j === 0) || (i === 0 && j === n) || (i === n && j === 0)
      if (!isFinderCorner) {
        out.push([pos[i]!, pos[j]!])
      }
    }
  }
  return out
}

function formatBits(mask: number): number {
  const data = (0b00 << 3) | mask
  let rem = data << 10
  for (let i = 14; i >= 10; i--) {
    if (((rem >> i) & 1) === 1) {
      rem ^= 0x537 << (i - 10)
    }
  }
  return ((data << 10) | (rem & 0x3ff)) ^ 0x5412
}

function versionBits(version: number): number {
  let rem = version
  for (let i = 0; i < 12; i++) {
    rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25)
  }
  return (version << 12) | (rem & 0xfff)
}

/** 掩码函数（标准式——y=行/x=列，ISO 18004 掩码条件） */
const MASK_FNS: Array<(y: number, x: number) => boolean> = [
  (y, x) => (y + x) % 2 === 0,
  (y, _x) => y % 2 === 0,
  (_y, x) => x % 3 === 0,
  (y, x) => (y + x) % 3 === 0,
  (y, x) => (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0,
  (y, x) => ((y * x) % 2) + ((y * x) % 3) === 0,
  (y, x) => (((y * x) % 2) + ((y * x) % 3)) % 2 === 0,
  (y, x) => (((y + x) % 2) + ((y * x) % 3)) % 2 === 0
]

function maskBit(mask: number, y: number, x: number): boolean {
  return MASK_FNS[mask]!(y, x)
}

function penalty(modules: boolean[][]): number {
  const size = modules.length
  let score = 0
  // N1 连游（横+纵）
  for (const line of [
    ...modules,
    ...Array.from({ length: size }, (_, c) => Array.from({ length: size }, (_, r) => modules[r]![c]!))
  ]) {
    let run = 1
    for (let i = 1; i <= line.length; i++) {
      if (i < line.length && line[i] === line[i - 1]) {
        run++
      } else {
        if (run >= 5) {
          score += 3 + (run - 5)
        }
        run = 1
      }
    }
  }
  // N2 2×2 同色
  for (let y = 0; y < size - 1; y++) {
    for (let x = 0; x < size - 1; x++) {
      const v = modules[y]![x]!
      if (v === modules[y]![x + 1]! && v === modules[y + 1]![x]! && v === modules[y + 1]![x + 1]!) {
        score += 3
      }
    }
  }
  // N3 探测子序列（ISO 18004：暗位体系 1011101 且前 4 或后 4 位浅色陪跑——
  // 暗模块布尔体系下 SEQ=[1,0,1,1,1,0,1]；陪跑=图案前一格起 4 格全浅或后一
  // 格起 4 格全浅（越界=不满足该侧））
  const SEQ = [true, false, true, true, true, false, true]
  const lightRun4 = (get: (i: number) => boolean, end: number): boolean => {
    for (let i = end; i < end + 4; i++) {
      if (i < 0 || i >= size || get(i)) {
        return false
      }
    }
    return true
  }
  for (let y = 0; y < size; y++) {
    for (let x = 0; x <= size - 7; x++) {
      let hitH = true
      let hitV = true
      for (let k = 0; k < 7; k++) {
        if (modules[y]![x + k]! !== SEQ[k]) {
          hitH = false
        }
        if (modules[x + k]![y]! !== SEQ[k]) {
          hitV = false
        }
      }
      if (hitH && (lightRun4((i) => modules[y]![i]!, x - 4) || lightRun4((i) => modules[y]![i]!, x + 7))) {
        score += 40
      }
      if (hitV && (lightRun4((i) => modules[i]![y]!, x - 4) || lightRun4((i) => modules[i]![y]!, x + 7))) {
        score += 40
      }
    }
  }
  // N4 暗比例
  let dark = 0
  for (const row of modules) {
    for (const cell of row) {
      if (cell) {
        dark++
      }
    }
  }
  const pct = (dark * 100) / (size * size)
  score += Math.floor(Math.abs(pct - 50) / 5) * 10
  return score
}

/** 编码主入口：纯函数（同输入恒同矩阵） */
export function encodeQr(text: string): QrMatrix {
  const { version, blocks } = buildBlocks(text)
  const codewords = interleave(blocks)
  const size = 17 + 4 * version
  // 函数面标记+基图（格式信息后按掩码画）
  const reserved: boolean[][] = Array.from({ length: size }, () => new Array<boolean>(size).fill(false))
  const base: boolean[][] = Array.from({ length: size }, () => new Array<boolean>(size).fill(false))
  const setFn = (y: number, x: number, dark: boolean): void => {
    base[y]![x] = dark
    reserved[y]![x] = true
  }
  // finder 7×7+分隔（8×8 边界浅色）
  for (const corner of [
    [0, 0],
    [0, size - 7],
    [size - 7, 0]
  ]) {
    const r0 = corner[0]!
    const c0 = corner[1]!
    for (let i = -1; i <= 7; i++) {
      for (let j = -1; j <= 7; j++) {
        const y = r0 + i
        const x = c0 + j
        if (y < 0 || y >= size || x < 0 || x >= size) {
          continue
        }
        const inFinder = i >= 0 && i <= 6 && j >= 0 && j <= 6
        setFn(y, x, inFinder && (i === 0 || i === 6 || j === 0 || j === 6 || (i >= 2 && i <= 4 && j >= 2 && j <= 4)))
      }
    }
  }
  // timing 行列 6（暗=偶坐标——从 8 起画，finder 区已保留）
  for (let i = 8; i < size - 8; i++) {
    setFn(6, i, i % 2 === 0)
    setFn(i, 6, i % 2 === 0)
  }
  // alignment（5×5 环+中心）
  for (const [cr, cc] of alignmentCenters(version)) {
    for (let i = -2; i <= 2; i++) {
      for (let j = -2; j <= 2; j++) {
        const edge = i === -2 || i === 2 || j === -2 || j === 2
        setFn(cr + i, cc + j, edge || (i === 0 && j === 0))
      }
    }
  }
  // 版本信息（v≥7 双块 3×6）
  if (version >= 7) {
    const bits = versionBits(version)
    for (let i = 0; i < 18; i++) {
      const bit = ((bits >>> i) & 1) === 1
      const a = size - 11 + (i % 3)
      const b = Math.floor(i / 3)
      setFn(b, a, bit)
      setFn(a, b, bit)
    }
  }
  // dark module（恒暗，格式区一部分但独立于掩码/格式值）
  setFn(size - 8, 8, true)
  // 格式位序（两副本——MSB 先）
  const FORMAT_CELLS = (s: number): Array<[number, number]> => [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
    [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
    [s - 1, 8], [s - 2, 8], [s - 3, 8], [s - 4, 8], [s - 5, 8], [s - 6, 8], [s - 7, 8],
    [8, s - 8], [8, s - 7], [8, s - 6], [8, s - 5], [8, s - 4], [8, s - 3], [8, s - 2], [8, s - 1]
  ]
  // [回炉 R1/B-1] 格式位 30 单元先保留（占位值任意——数据摆放跳过；掩码循环
  // 只 XOR dataCells 不触格式单元，定稿格式值后写=语义保持）。未保留时数据
  // 位流入格式单元再遭覆写→30 位灭失，回放测试（码字流对账）必红。
  for (const [y, x] of FORMAT_CELLS(size)) {
    setFn(y, x, false)
  }
  // 数据摆放（zigzag 双列条带自右下）
  const dataCells: Array<[number, number]> = []
  let bitIdx = 0
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) {
      right = 5
    }
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j
        const upward = ((right + 1) & 2) === 0
        const y = upward ? size - 1 - vert : vert
        if (!reserved[y]![x]) {
          const bit =
            bitIdx < codewords.length * 8
              ? ((codewords[(bitIdx / 8) | 0]! >>> (7 - (bitIdx % 8))) & 1) === 1
              : false
          dataCells.push([y, x])
          base[y]![x] = bit
          bitIdx++
        }
      }
    }
  }
  // 掩码选择：8 函数全枚举+penalty 最小
  let best: QrMatrix | null = null
  let bestScore = Number.POSITIVE_INFINITY
  for (let mask = 0; mask < 8; mask++) {
    const m = base.map((row) => [...row])
    for (const [y, x] of dataCells) {
      if (maskBit(mask, y, x)) {
        m[y]![x] = !m[y]![x]
      }
    }
    const fb = formatBits(mask)
    const cells = FORMAT_CELLS(size)
    for (let i = 0; i < 15; i++) {
      const bit = ((fb >>> (14 - i)) & 1) === 1
      const [y1, x1] = cells[i]!
      m[y1]![x1] = bit
      const [y2, x2] = cells[15 + i]!
      m[y2]![x2] = bit
    }
    const score = penalty(m)
    if (score < bestScore) {
      bestScore = score
      best = { size, modules: m }
    }
  }
  return best as QrMatrix
}
