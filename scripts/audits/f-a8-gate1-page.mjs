/**
 * F-A8 门 1 取证页内采集器（f-a8-gate1-diag.mjs 依赖件）——页内标注锚点构造
 * 与 DOM 量测采集（evaluate 函数体，经 playwright 序列化进渲染进程执行）。
 *
 * 页内纪律：只读 DOM——零猴子补丁（本票无布局读计数面）、零 window.getSelection
 * 触碰（锚点构造=纯 Range 数学：真码 selectionToAnchor 仅以 Selection 为 Range
 * 载体，probe+CONTEXT_CHARS 切片均只消费 Range——复刻口径申报于裁决表 §2）；
 * 一切函数返回纯 JSON 数据。
 *
 * 复刻锚定（行号锚定=工作树 HEAD 70b6aea5b3）：
 * - collectSpans/fullTextOf：annotation-anchor.ts:77-95 同式（TreeWalker 剔零长）
 * - probeTextLength：anchor-serialize.ts:220-239 同式（Range.toString 长度探测）
 * - offsetToPoint：annotation-anchor.ts:140-148 同式（边界点重建——findRangeAtOffset
 *   同源，rawRects 采集与真链 findRangeAtOffset→clientRectsBetween:432-440 同输入）
 * - CONTEXT_CHARS=32：anchor-serialize.ts:167 同值（prefix/suffix 切片窗）
 * - measureText 字体串：annotation-resolve.ts:148 同式（canvas 字体度量）
 */

/** 页内采集：锚点族构造（页首/页尾/跨行/单行×2，共 5 条/页——票面 ≥5）+每条
 *  锚点的 rawRects/被选 span 明细+页级 span 盒全量（A2 口径 outside 计数源） */
export function evalCollectPage(p) {
  const CONTEXT_CHARS = 32
  const root = document.querySelector(`[data-page-root="${p}"]`)
  const tl = root === null ? null : root.querySelector('.textLayer')
  const canvas = root === null ? null : root.querySelector('canvas[data-pdf-canvas]')
  if (tl === null || tl === undefined || canvas === null) return { err: 'missing layer/canvas' }
  const tb = tl.getBoundingClientRect()
  const cb = canvas.getBoundingClientRect()
  const scaleFactor = parseFloat(getComputedStyle(tl).getPropertyValue('--scale-factor'))
  // collectSpans 复刻
  const walker = document.createTreeWalker(tl, NodeFilter.SHOW_TEXT)
  const spans = []
  let cursor = 0
  for (let n = walker.nextNode(); n !== null; n = walker.nextNode()) {
    if (n.data.length > 0) {
      spans.push({ node: n, start: cursor, end: cursor + n.data.length })
      cursor += n.data.length
    }
  }
  if (spans.length === 0) return { err: 'empty textLayer' }
  const text = spans.map((s) => s.node.data).join('')
  // probeTextLength 复刻
  const probe = (container, offset, side) => {
    try {
      const r = document.createRange()
      r.selectNodeContents(tl)
      if (side === 'start') r.setEnd(container, offset)
      else r.setStart(container, offset)
      return r.toString().length
    } catch {
      return null
    }
  }
  // offsetToPoint 复刻
  const pointOf = (global) => {
    for (const s of spans) {
      if (global < s.end) return { node: s.node, offset: global - s.start }
    }
    const last = spans[spans.length - 1]
    return { node: last.node, offset: last.node.data.length }
  }
  // 锚点形态族（确定性公式——n=span 数；单行=单节点内部偏移窗，节点选取
  // 避开短节点（<6 字符）与纯空白窗——退化引文对 verifyQuote/几何对照均无判据面）
  const n = spans.length
  const pickNode = (fromIdx, dir) => {
    let i = Math.min(Math.max(fromIdx, 0), n - 1)
    for (let k = 0; k < n; k += 1) {
      if (spans[i].node.data.length >= 6) return i
      i = Math.min(Math.max(i + dir, 0), n - 1)
    }
    return Math.min(Math.max(fromIdx, 0), n - 1)
  }
  const iS1 = pickNode(Math.floor(n * 0.55), 1)
  const iS2 = pickNode(Math.floor(n * 0.72), -1)
  const specs = [
    { form: 'top', i0: 0, i1: Math.max(0, Math.ceil(n * 0.08) - 1), f0: 0, f1: 1 },
    { form: 'bottom', i0: Math.floor(n * 0.92), i1: n - 1, f0: 0, f1: 1 },
    { form: 'multi', i0: Math.floor(n * 0.3), i1: Math.floor(n * 0.42), f0: 0, f1: 1 },
    { form: 'single', i0: iS1, i1: iS1, f0: 0.25, f1: 0.75 },
    { form: 'single2', i0: iS2, i1: iS2, f0: 0.15, f1: 0.6 }
  ]
  const ctx = document.createElement('canvas').getContext('2d')
  const anchors = []
  for (const sp of specs) {
    const a = spans[Math.min(sp.i0, n - 1)]
    const b = spans[Math.min(Math.max(sp.i1, sp.i0), n - 1)]
    const a0 = Math.floor(a.node.data.length * sp.f0)
    const b0 = Math.ceil(b.node.data.length * sp.f1)
    const lead = probe(a.node, a0, 'start')
    const tail = lead === null ? null : probe(b.node, b0, 'end')
    if (lead === null || tail === null) {
      anchors.push({ form: sp.form, skipped: 'probe null' })
      continue
    }
    const start = lead
    const end = text.length - tail
    const quote = text.slice(start, end)
    if (end <= start || quote.trim().length === 0) {
      anchors.push({ form: sp.form, skipped: `退化区间 start=${start} end=${end}（空/纯空白引文）` })
      continue
    }
    // 边界点重建（findRangeAtOffset 同源）→ rawRects+被选 span 明细
    const pa = pointOf(start)
    const pb = pointOf(end)
    const range = document.createRange()
    range.setStart(pa.node, pa.offset)
    range.setEnd(pb.node, pb.offset)
    const rawRects = Array.from(range.getClientRects()).map((r) => ({
      x: r.x, y: r.y, w: r.width, h: r.height
    }))
    const seen = new Set()
    const selected = []
    const w2 = document.createTreeWalker(tl, NodeFilter.SHOW_TEXT)
    for (let nd = w2.nextNode(); nd !== null; nd = w2.nextNode()) {
      if (!range.intersectsNode(nd)) continue
      const el = nd.parentElement
      if (el === null || seen.has(el)) continue
      seen.add(el)
      const g = el.getBoundingClientRect()
      const cs = getComputedStyle(el)
      let m = null
      try {
        ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
        const mm = ctx.measureText(nd.data.length > 0 ? nd.data : ' ')
        const o = {
          ascent: mm.actualBoundingBoxAscent, descent: mm.actualBoundingBoxDescent,
          fontAscent: mm.fontBoundingBoxAscent, fontDescent: mm.fontBoundingBoxDescent
        }
        m = Object.values(o).every(Number.isFinite) ? o : null
      } catch {
        m = null
      }
      selected.push({
        text: nd.data.slice(0, 40), len: nd.data.length,
        x: g.x, y: g.y, w: g.width, h: g.height,
        fontSize: cs.fontSize, fontFamily: cs.fontFamily.slice(0, 60), dir: el.dir, metrics: m
      })
    }
    anchors.push({
      form: sp.form,
      start, end,
      quote,
      prefix: text.slice(Math.max(0, start - CONTEXT_CHARS), start),
      suffix: text.slice(end, Math.min(text.length, end + CONTEXT_CHARS)),
      rawRects, selected
    })
  }
  // 页级 span 盒全量（A2 口径 outside 计数——f-a6 §1 同形）
  const allSpanBoxes = []
  for (const el of Array.from(tl.querySelectorAll('span'))) {
    const g = el.getBoundingClientRect()
    if (g.width <= 0 && g.height <= 0) continue
    allSpanBoxes.push({ x: g.x, y: g.y, w: g.width, h: g.height })
  }
  return {
    pageRoot: p,
    tlBox: { x: tb.x, y: tb.y, w: tb.width, h: tb.height },
    canvasBox: { x: cb.x, y: cb.y, w: cb.width, h: cb.height },
    scaleFactor,
    spanTotal: spans.length,
    charTotal: text.length,
    domText: text,
    anchors,
    allSpanBoxes
  }
}
