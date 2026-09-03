/**
 * F-A6-a 取证库（f-a6-diag.mjs 的依赖件）——复刻函数 / 乙轨项几何 / 合成
 * PDF 工厂 / A-B 量化判据。
 *
 * 纪律声明：本件只读参照源码复刻，不改 src/tests/任何受锁文件；
 * 一切复刻链终输出须与真函数（esbuild bundle 产物）逐位全等（守卫在主脚本）。
 *
 * 行号锚定（复刻时源码版本=工作树 HEAD，若源码演进须同步重拷）：
 * - 五步复刻：src/renderer/features/reader/annotation-anchor.ts:258-419
 * - band 复刻：src/renderer/features/reader/annotation-resolve.ts:77-98,182-190
 * - 合成 PDF：tests/utils/pdf-factory.ts 的手写对象流配方（只读参照）
 * - 乙轨公式：node_modules/pdfjs-dist/build/pdf.mjs:11060-11133（TextLayer
 *   #appendText——span 定位/尺寸换算的官方形态；乙轨差异=ascent 取 styles
 *   声明值而非 canvas 量测值，申报口径见裁决表 §9）
 */

// ── 小工具 ──

/** 下中位（与 annotation-anchor.ts medianFontSizeBetween 同口径） */
export function lowerMedian(nums) {
  if (nums.length === 0) return undefined
  const s = [...nums].sort((a, b) => a - b)
  return s[Math.floor((s.length - 1) / 2)]
}

export function roundBox(r, digits = 2) {
  const f = (v) => Number(v.toFixed(digits))
  return { x: f(r.x), y: f(r.y), w: f(r.w), h: f(r.h) }
}

// ── 合成 PDF 工厂（S1 旋转 / S2 CropBox / S3 基线；配方照抄 pdf-factory.ts）──

function escPdf(s) {
  return s.replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)')
}

/** 8 行 Helvetica 18pt 单页；opts.rotate=/Rotate 值，opts.crop=CropBox 数组 */
export function buildSyntheticPdf(opts = {}) {
  const rows = []
  for (let i = 1; i <= 8; i += 1) rows.push(`SYN ROW ${i} FORENSIC SAMPLE TEXT AA${i}`)
  const parts = rows.map((line, i) => `BT /F1 18 Tf 72 ${720 - i * 28} Td (${escPdf(line)}) Tj ET`)
  const stream = parts.join('\n')
  const streamBytes = new TextEncoder().encode(stream).length
  let pageDict = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792]`
  if (opts.crop) pageDict += ` /CropBox [${opts.crop.join(' ')}]`
  if (opts.rotate) pageDict += ` /Rotate ${opts.rotate}`
  pageDict += ` /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>`
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    pageDict,
    `<< /Length ${streamBytes} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Title (F-A6 synthetic) /Producer (f-a6-diag) >>'
  ]
  // xref 偏移按 UTF-8 字节累计（pdf-factory.ts 同口径）
  const enc = new TextEncoder()
  const chunks = []
  let byteLen = 0
  const push = (s) => {
    const b = enc.encode(s)
    chunks.push(b)
    byteLen += b.length
  }
  push('%PDF-1.4\n')
  const offsets = []
  objects.forEach((body, i) => {
    offsets.push(byteLen)
    push(`${i + 1} 0 obj\n${body}\nendobj\n`)
  })
  const xrefStart = byteLen
  push(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`)
  for (const off of offsets) push(`${String(off).padStart(10, '0')} 00000 n \n`)
  push(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`)
  const out = new Uint8Array(byteLen)
  let cur = 0
  for (const part of chunks) {
    out.set(part, cur)
    cur += part.length
  }
  return out
}

// ── 五步复刻（annotation-anchor.ts:258-419 逐段拷贝；trace=每步落盘）──

const DEDUP_EPSILON_PX = 0.5 // :258
const HEIGHT_RATIO_MIN = 0.5 // :266
const HEIGHT_RATIO_MAX = 2 // :267
const Y_OVERLAP_RATIO_MIN = 0.25 // :271
const COLUMN_GAP_H_FACTOR = 1.5 // :273
const COLUMN_GAP_PAGE_RATIO = 0.02 // :274
const INTRA_ROW_GAP_PX = 2 // :276

/** estimateLinePitch 复刻（:286-303） */
export function estimateLinePitchReplica(pixels) {
  if (pixels.length < 2) return undefined
  const centers = pixels.map((r) => r.y + r.h / 2).sort((a, b) => a - b)
  const gaps = []
  for (let i = 1; i < centers.length; i += 1) {
    const g = centers[i] - centers[i - 1]
    if (g >= INTRA_ROW_GAP_PX) gaps.push(g)
  }
  if (gaps.length === 0) return undefined
  const pitch = [...gaps].sort((a, b) => a - b)[Math.floor((gaps.length - 1) / 2)]
  return Number.isFinite(pitch) && pitch > 0 ? pitch : undefined
}

function areaOf(r) {
  return r.w * r.h
}

function dominantOf(group) {
  return group.reduce((best, r) => (areaOf(r) > areaOf(best) ? r : best))
}

/** mergeSegment 复刻（:411-418） */
function mergeSegmentReplica(segment, pitch) {
  const dom = dominantOf(segment)
  const left = Math.min(...segment.map((r) => r.x))
  const right = Math.max(...segment.map((r) => r.x + r.w))
  const h = pitch !== undefined && pitch < dom.h && dom.h <= HEIGHT_RATIO_MAX * pitch ? pitch : dom.h
  return { x: left, w: right - left, y: dom.y, h }
}

/** mergeLineRects 复刻（:325-404 五步：unique→sorted→rowGroups→segments→out）。
 *  trace 在场时逐段落盘中间产物（jitter 舍位——判 T2/T3/T4/T7 用）。 */
export function mergeLineRectsReplica(pixels, pageWidth, lineH, trace) {
  const tr = trace ?? { input: pixels.map((r) => roundBox(r)) }
  if (pixels.length <= 1) {
    tr.step5_out = pixels.map((r) => roundBox(r))
    return pixels
  }
  // ① 同形去重（:329-345）
  const unique = []
  for (const r of pixels) {
    const dup = unique.some(
      (u) =>
        Math.abs(u.x - r.x) <= DEDUP_EPSILON_PX &&
        Math.abs(u.y - r.y) <= DEDUP_EPSILON_PX &&
        Math.abs(u.w - r.w) <= DEDUP_EPSILON_PX &&
        Math.abs(u.h - r.h) <= DEDUP_EPSILON_PX
    )
    if (!dup) unique.push(r)
  }
  tr.step1_unique = unique.map((r) => roundBox(r))
  tr.step1_dropped = pixels.length - unique.length
  if (unique.length <= 1) {
    tr.step5_out = unique.map((r) => roundBox(r))
    return unique
  }
  // ② y 区间重叠聚类（:346-381）
  const lh = lineH !== undefined && Number.isFinite(lineH) && lineH > 0 ? lineH : null
  const pitch = estimateLinePitchReplica(unique)
  tr.pitch = pitch
  const sorted = [...unique].sort((a, b) => a.y - b.y || a.x - b.x)
  tr.step2_sorted = sorted.map((r) => roundBox(r))
  const rowGroups = []
  const groupTop = []
  const groupBottom = []
  for (const r of sorted) {
    const gi = rowGroups.length - 1
    if (gi >= 0) {
      const dom = dominantOf(rowGroups[gi])
      const overlapPx = Math.min(groupBottom[gi], r.y + r.h) - Math.max(groupTop[gi], r.y)
      const yOverlap = overlapPx >= Y_OVERLAP_RATIO_MIN * Math.min(r.h, dom.h)
      const centerLimit =
        pitch !== undefined ? Math.min(pitch, dom.h, ...(lh !== null ? [lh] : [])) : lh
      const centerOk = Math.abs(r.y + r.h / 2 - (dom.y + dom.h / 2)) <= (centerLimit ?? 0) / 2
      const hComparable = r.h >= dom.h * HEIGHT_RATIO_MIN && r.h <= dom.h * HEIGHT_RATIO_MAX
      if ((centerLimit !== null ? centerOk : yOverlap) && hComparable) {
        rowGroups[gi].push(r)
        groupTop[gi] = Math.min(groupTop[gi], r.y)
        groupBottom[gi] = Math.max(groupBottom[gi], r.y + r.h)
        continue
      }
    }
    rowGroups.push([r])
    groupTop.push(r.y)
    groupBottom.push(r.y + r.h)
  }
  tr.step3_rowGroups = rowGroups.map((g) => ({ size: g.length, members: g.map((r) => roundBox(r)) }))
  // ③④ 簇内 x 间隙断段与段合并（:383-401）
  const out = []
  const segsPerGroup = []
  for (const group of rowGroups) {
    const dom = dominantOf(group)
    const gapThreshold = Math.max(COLUMN_GAP_H_FACTOR * dom.h, COLUMN_GAP_PAGE_RATIO * pageWidth)
    const byX = [...group].sort((a, b) => a.x - b.x)
    let segment = []
    let segRight = Number.NEGATIVE_INFINITY
    const groupSegs = []
    for (const r of byX) {
      if (segment.length > 0 && r.x - segRight > gapThreshold) {
        groupSegs.push(roundBox(mergeSegmentReplica(segment, pitch)))
        out.push(mergeSegmentReplica(segment, pitch))
        segment = []
      }
      segment.push(r)
      segRight = Math.max(segRight, r.x + r.w)
    }
    if (segment.length > 0) {
      groupSegs.push(roundBox(mergeSegmentReplica(segment, pitch)))
      out.push(mergeSegmentReplica(segment, pitch))
    }
    segsPerGroup.push({ gapThreshold: Number(gapThreshold.toFixed(2)), segments: groupSegs })
  }
  tr.step4_segments = segsPerGroup
  // ⑤ 文档序（:402-403）
  out.sort((a, b) => a.y - b.y || a.x - b.x)
  tr.step5_out = out.map((r) => roundBox(r))
  return out
}

// ── band 复刻（annotation-resolve.ts:77-98 bandFromMetrics / :182-190 mergeNear）──

export function bandFromMetricsReplica(span, fs, m, base) {
  if (m === null || base.w <= 0 || base.h <= 0 || !Number.isFinite(fs) || fs <= 0) return null
  const halfLeading = (fs - m.fontAscent - m.fontDescent) / 2
  const baseline = span.y + halfLeading + m.fontAscent
  const top = (baseline - m.ascent - base.y) / base.h
  const bottom = (baseline + m.descent - base.y) / base.h
  if (!Number.isFinite(top) || !Number.isFinite(bottom) || bottom <= top) return null
  // 源码 :93-97：top/bottom 各自 clamp，center 用未 clamp 原始值（双轨校验实证）
  return {
    top: Math.min(1, Math.max(0, top)),
    bottom: Math.min(1, Math.max(0, bottom)),
    center: (top + bottom) / 2
  }
}

export function mergeNearReplica(bands, band) {
  const near = bands.find((b) => Math.abs(b.center - band.center) <= band.bottom - band.top)
  if (near === undefined) {
    bands.push(band)
  } else {
    near.x0 = Math.min(near.x0 ?? band.x0 ?? Number.POSITIVE_INFINITY, band.x0 ?? Number.POSITIVE_INFINITY)
    near.x1 = Math.max(near.x1 ?? band.x1 ?? Number.NEGATIVE_INFINITY, band.x1 ?? Number.NEGATIVE_INFINITY)
  }
}

// ── 乙轨：项声明几何（pdf.mjs:11060-11133 官方公式参照）──

const segmenter = new Intl.Segmenter('zh', { granularity: 'grapheme' })

export function graphemeCount(str) {
  let n = 0
  for (const _ of segmenter.segment(str)) n += 1
  return n
}

/**
 * 被选 items → 像素矩形集（viewport CSS px 域）。
 * itemOffsets[i]=[start,end) 为项 str 在文档序拼接中的字符区间（与 DOM
 * collectSpans 同域——C3 计数探针保证）。selStart/selEnd 为选区全局偏移。
 * 官方公式（pdf.mjs:11070-11097）：盒原点=基线点+ascent×fontH×(sinA,−cosA)；
 * 行进方向 u=(cosA,sinA)（宽 w 沿此）、行高方向 v=(−sinA,cosA)（h 沿此）。
 * 任意角（/Rotate 页 angle=±π/2 等）以盒四角的轴对齐包围盒落地——angle=0 时
 * 与简单式逐位一致（保留行为）。vertical=styles 声明轴互换；RTL 细分方向翻转。
 */
export function itemPixelRects(items, styles, viewport, selStart, selEnd, itemOffsets, Util) {
  const scale = viewport.scale
  const rects = []
  const perItem = []
  items.forEach((item, i) => {
    const [s, e] = itemOffsets[i]
    if (e <= selStart || s >= selEnd) return
    const tx = Util.transform(viewport.transform, item.transform)
    let angle = Math.atan2(tx[1], tx[0])
    const style = styles[item.fontName] ?? {}
    if (style.vertical) angle += Math.PI / 2
    const fontH = Math.hypot(tx[2], tx[3])
    const ascent = Number.isFinite(style.ascent) ? style.ascent : 0.8
    const sinA = Math.sin(angle)
    const cosA = Math.cos(angle)
    const ox = tx[4] + ascent * fontH * sinA
    const oy = tx[5] - ascent * fontH * cosA
    const wPdf = style.vertical ? item.height : item.width
    const hPdf = style.vertical ? item.width : item.height
    const w = wPdf * scale
    const h = hPdf * scale
    // 项内选中区间（grapheme 比例，C2：禁 UTF-16 码元计数）
    const a = Math.max(0, selStart - s)
    const b = Math.min(e - s, selEnd - s)
    const n = graphemeCount(item.str)
    const g0 = graphemeCount(item.str.slice(0, a))
    const g1 = graphemeCount(item.str.slice(0, b))
    let f0 = 0
    let f1 = 1
    const partial = n > 0 && (g0 > 0 || g1 < n)
    if (partial) {
      f0 = item.dir === 'rtl' ? 1 - g1 / n : g0 / n
      f1 = item.dir === 'rtl' ? 1 - g0 / n : g1 / n
    }
    const q0x = ox + f0 * w * cosA
    const q0y = oy + f0 * w * sinA
    const q1x = ox + f1 * w * cosA
    const q1y = oy + f1 * w * sinA
    const xs = [q0x, q1x, q0x + h * -sinA, q1x + h * -sinA]
    const ys = [q0y, q1y, q0y + h * cosA, q1y + h * cosA]
    rects.push({
      x: Math.min(...xs), y: Math.min(...ys),
      w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys)
    })
    perItem.push({
      i, mode: partial ? 'partial' : 'full',
      fontH: round2(fontH), tx5: round2(tx[5]),
      angleDeg: Math.round((angle * 180) / Math.PI),
      vProj: round2(-tx[4] * sinA + tx[5] * cosA),
      dir: item.dir, vertical: !!style.vertical
    })
  })
  return { rects, perItem }
}

/** 乙轨第二口径并块（迁移路线正式形态——设计书 §5.1 pdf-item-geometry「行级
 *  并块（基线分组）」）：按基线 v 轴投影聚类分行，每行块=行内项盒轴对齐并集。
 *  与 mergeLineRects（y 聚类——DOM 噪声清洗器）互补：旋转页 y 盲区免疫
 *  （s1rot 实证 mergeLineRects 把旋转三行并 1 块）、密集页项级 y 微差免疫
 *  （real3882 实证 mergeLineRects 对项盒拆 211 簇）。聚类=排序+相邻差>tol 断簇
 *  （与 baselineRowTruth 同语义同容差——块数=行真值按构造成立，判据重心在
 *  右溢/位置/重叠）。 */
export function baselineGroupBlocks(rects, perItem, tolPx) {
  const entries = []
  rects.forEach((box, k) => {
    const d = perItem[k]
    if (d !== undefined) entries.push({ v: d.vProj, box })
  })
  entries.sort((a, b) => a.v - b.v)
  const rows = []
  for (const e of entries) {
    const last = rows[rows.length - 1]
    if (last === undefined || e.v - last.vTail > tolPx) rows.push({ vTail: e.v, boxes: [e.box] })
    else { last.vTail = e.v; last.boxes.push(e.box) }
  }
  return rows.map((r) => {
    const x0 = Math.min(...r.boxes.map((b) => b.x))
    const y0 = Math.min(...r.boxes.map((b) => b.y))
    const x1 = Math.max(...r.boxes.map((b) => b.x + b.w))
    const y1 = Math.max(...r.boxes.map((b) => b.y + b.h))
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
  })
}

function round2(v) {
  return Number(v.toFixed(2))
}

/** 行数真值：被选 items 基线点在行分隔轴 v=(−sinA,cosA) 上的投影，容差聚类
 *  唯一值数（angle=0 退化为 tx[5]；/Rotate 90 为 −tx[4]——行分隔随旋转轴换） */
export function baselineRowTruth(items, styles, viewport, selStart, selEnd, itemOffsets, Util, tolPx) {
  const pos = []
  items.forEach((item, i) => {
    const [s, e] = itemOffsets[i]
    if (e <= selStart || s >= selEnd) return
    const tx = Util.transform(viewport.transform, item.transform)
    let angle = Math.atan2(tx[1], tx[0])
    if ((styles[item.fontName] ?? {}).vertical) angle += Math.PI / 2
    pos.push(-tx[4] * Math.sin(angle) + tx[5] * Math.cos(angle))
  })
  pos.sort((a, b) => a - b)
  const clusters = []
  for (const y of pos) {
    if (clusters.length === 0 || y - clusters[clusters.length - 1] > tolPx) clusters.push(y)
  }
  return { rows: clusters.length, baselines: clusters.map(round2), axisNote: 'v-axis projection (angle-aware)' }
}

// ── A/B 量化判据（C4；可复算定义写入裁决表 §4）──

/** 右溢 px：块右缘最大值 − 盒宽（>0 即溢出） */
export function rightOverflowPx(blocks, boxW) {
  if (blocks.length === 0) return 0
  return Number(Math.max(...blocks.map((r) => r.x + r.w)) - boxW > 0
    ? (Math.max(...blocks.map((r) => r.x + r.w)) - boxW).toFixed(2)
    : 0)
}

/** 同行配对：a 在 B 中找 y 中心最近块；|Δcy| ≤ (ha+hb)/2+2 且 x 相交>0 为配对。
 *  返回 {paired, coverage, iouXs, dxs, dys}——coverage=配对成功数/|A|；
 *  dxs/dys=配对块中心差（T9 整体平移错位的量化证据） */
function pairBlocks(A, B) {
  let paired = 0
  const iouXs = []
  const dxs = []
  const dys = []
  for (const a of A) {
    let best = null
    for (const b of B) {
      if (best === null || Math.abs(b.y + b.h / 2 - (a.y + a.h / 2)) < Math.abs(best.y + best.h / 2 - (a.y + a.h / 2))) best = b
    }
    if (best === null) continue
    const dcy = Math.abs(best.y + best.h / 2 - (a.y + a.h / 2))
    if (dcy <= (a.h + best.h) / 2 + 2) {
      const ox = Math.min(a.x + a.w, best.x + best.w) - Math.max(a.x, best.x)
      if (ox > 0) {
        paired += 1
        const union = Math.max(a.x + a.w, best.x + best.w) - Math.min(a.x, best.x)
        iouXs.push(Number((ox / Math.max(union, 1e-9)).toFixed(4)))
        dxs.push(Number(((best.x + best.w / 2 - (a.x + a.w / 2))).toFixed(2)))
        dys.push(Number(((best.y + best.h / 2 - (a.y + a.h / 2))).toFixed(2)))
      }
    }
  }
  return {
    paired, coverage: A.length > 0 ? Number((paired / A.length).toFixed(4)) : null,
    iouXs, dxs, dys
  }
}

/** 双向重叠率：甲↔乙 同行配对覆盖率（各自方向）+ IoU_x 中位+配对中心位移中位 */
export function overlapMetric(blocksA, blocksB) {
  const ab = pairBlocks(blocksA, blocksB)
  const ba = pairBlocks(blocksB, blocksA)
  return {
    aToB: ab.coverage,
    bToA: ba.coverage,
    iouXMedianA: lowerMedian(ab.iouXs) ?? null,
    iouXMedianB: lowerMedian(ba.iouXs) ?? null,
    shiftMedian: { dx: lowerMedian(ab.dxs) ?? null, dy: lowerMedian(ab.dys) ?? null }
  }
}

/** 每视觉行块数（块按 y 聚成视觉行后的块计数/行数——块多的行=拆簇形态） */
export function blocksPerRow(blocks, tolPx = 5) {
  if (blocks.length === 0) return { rows: 0, perRow: [], maxPerRow: 0 }
  const sorted = [...blocks].sort((a, b) => a.y - b.y)
  const rows = []
  for (const r of sorted) {
    const last = rows[rows.length - 1]
    if (last === undefined || Math.abs(r.y + r.h / 2 - last.cy) > tolPx) {
      rows.push({ cy: r.y + r.h / 2, count: 1 })
    } else {
      last.count += 1
      last.cy = (last.cy * (last.count - 1) + (r.y + r.h / 2)) / last.count
    }
  }
  return { rows: rows.length, perRow: rows.map((x) => x.count), maxPerRow: Math.max(...rows.map((x) => x.count)) }
}
