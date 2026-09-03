/**
 * F-A6-a 取证页内采集器（f-a6-diag.mjs 的依赖件）——五个 evaluate 函数体，
 * 经 playwright 序列化进渲染进程执行；全部只读 DOM（B 段猴子补丁测后还原）。
 *
 * 页内纪律：所有函数返回纯数据（可 JSON 化）；选区配方=reader-text.spec.ts
 * :783-798 程序化划选同型（range.setStart/setEnd + addRange）。
 */

/** A2 代表页深查：textLayer 盒/--scale-factor/canvas CSS 尺寸/逐 span 明细+盒外计数（判 T1/T5） */
export function evalA2Deep(p) {
  const root = document.querySelector(`[data-page-root="${p}"]`)
  const tl = root === null ? null : root.querySelector('.textLayer')
  const canvas = root === null ? null : root.querySelector('canvas[data-pdf-canvas]')
  if (tl === null || tl === undefined || canvas === null) return { err: 'missing layer/canvas' }
  const box = tl.getBoundingClientRect()
  const cs = getComputedStyle(tl)
  const cb = canvas.getBoundingClientRect()
  const spans = Array.from(tl.querySelectorAll('span')).map((s) => {
    const r = s.getBoundingClientRect()
    const scs = getComputedStyle(s)
    return {
      text: (s.textContent ?? '').slice(0, 40),
      x: r.x, y: r.y, w: r.width, h: r.height,
      fontSize: scs.fontSize, fontFamily: scs.fontFamily.slice(0, 60), dir: s.dir
    }
  })
  const outside = spans.filter(
    (s) =>
      s.x < box.x - 1 || s.y < box.y - 1 ||
      s.x + s.w > box.x + box.width + 1 || s.y + s.h > box.y + box.height + 1
  )
  return {
    pageRoot: p,
    tlBox: { x: box.x, y: box.y, w: box.width, h: box.height },
    canvasCss: { x: cb.x, y: cb.y, w: cb.width, h: cb.height },
    scaleFactor: parseFloat(cs.getPropertyValue('--scale-factor')),
    spanCount: spans.length,
    outsideCount: outside.length,
    outsideSample: outside.slice(0, 8),
    spans
  }
}

/** A3 C3 前置计数探针：items.length vs DOM span 数+逐项文本顺序比对（首个失配位） */
export function evalA3Count(args) {
  const root = document.querySelector(`[data-page-root="${args.p}"]`)
  const tl = root === null ? null : root.querySelector('.textLayer')
  if (tl === null || tl === undefined) return { err: 'missing textLayer' }
  const spans = Array.from(tl.querySelectorAll('span'))
  const domTexts = spans.map((s) => s.textContent ?? '')
  const nodeStrs = args.nodeStrs
  let firstMismatch = -1
  const n = Math.min(nodeStrs.length, domTexts.length)
  for (let i = 0; i < n; i += 1) {
    if (nodeStrs[i] !== domTexts[i]) { firstMismatch = i; break }
  }
  return {
    itemCount: nodeStrs.length,
    spanCount: spans.length,
    brCount: tl.querySelectorAll('br').length,
    emptyStrItems: nodeStrs.filter((s) => s === '').length,
    domEmptySpans: domTexts.filter((s) => s === '').length,
    firstMismatch,
    mismatchDetail:
      firstMismatch >= 0
        ? { i: firstMismatch, node: String(nodeStrs[firstMismatch]).slice(0, 40), dom: String(domTexts[firstMismatch]).slice(0, 40) }
        : null,
    domJoinedLen: domTexts.join('').length,
    nodeJoinedLen: nodeStrs.join('').length
  }
}

/** B tick 时长前测（D2）：程序化划选→settle→模拟拖选 20 轮（每轮末端扩 1 节点
 *  字符+dispatch selectionchange，间隔 50ms——选区真变才产 DOM 变更；恒定选区
 *  下 React diff 无变更=mutations 0 的实证修正），MutationObserver 记
 *  selection-rects 子树变更时间戳+布局读猴子补丁计数（测后还原） */
export async function evalBTick(p) {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  const root = document.querySelector(`[data-page-root="${p}"]`)
  const tl = root === null ? null : root.querySelector('.textLayer')
  if (tl === null || tl === undefined) return { err: 'missing textLayer' }
  const walker = document.createTreeWalker(tl, NodeFilter.SHOW_TEXT)
  const nodes = []
  for (let n = walker.nextNode(); n !== null; n = walker.nextNode()) {
    if (n.data.length > 0) nodes.push(n)
  }
  const ia = Math.floor(nodes.length * 0.3)
  const ib = Math.floor(nodes.length * 0.4)
  const a = nodes[ia]
  if (a === undefined || nodes[ib] === undefined) return { err: 'text nodes missing' }
  // 拖选推进游标：从 (ib,0) 起每轮 +1 字符（跨节点进位）
  let curNode = nodes[ib]
  let curOff = 0
  const advance = () => {
    if (curOff < curNode.data.length - 1) { curOff += 1; return }
    const ni = nodes.indexOf(curNode) + 1
    if (ni < nodes.length) { curNode = nodes[ni]; curOff = 0 }
  }
  const range = document.createRange()
  range.setStart(a, 0)
  range.setEnd(curNode, curOff)
  const sel = window.getSelection()
  sel.removeAllRanges()
  sel.addRange(range)
  await sleep(700)
  const host = document.querySelector('[data-testid="selection-rects"]')
  if (host === null) return { err: 'selection-rects missing after settle' }
  const mutations = []
  const obs = new MutationObserver((list) => {
    mutations.push({ t: performance.now(), n: list.length })
  })
  obs.observe(host, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] })
  const counts = { gBCR: 0, clientRects: 0, rangeGBCR: 0, gCS: 0 }
  const oE = Element.prototype.getBoundingClientRect
  const oR = Range.prototype.getClientRects
  const oRG = Range.prototype.getBoundingClientRect
  const oGCS = window.getComputedStyle
  Element.prototype.getBoundingClientRect = function (...xs) { counts.gBCR += 1; return oE.apply(this, xs) }
  Range.prototype.getClientRects = function (...xs) { counts.clientRects += 1; return oR.apply(this, xs) }
  Range.prototype.getBoundingClientRect = function (...xs) { counts.rangeGBCR += 1; return oRG.apply(this, xs) }
  window.getComputedStyle = function (...xs) { counts.gCS += 1; return oGCS.apply(this, xs) }
  const dispatches = []
  try {
    for (let i = 0; i < 20; i += 1) {
      advance()
      range.setEnd(curNode, curOff)
      dispatches.push(performance.now())
      document.dispatchEvent(new Event('selectionchange'))
      await sleep(50)
    }
    await sleep(600)
  } finally {
    Element.prototype.getBoundingClientRect = oE
    Range.prototype.getClientRects = oR
    Range.prototype.getBoundingClientRect = oRG
    window.getComputedStyle = oGCS
    obs.disconnect()
  }
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
  sel.removeAllRanges()
  await sleep(250)
  return {
    dispatches,
    mutations,
    counts,
    spanTotal: nodes.length,
    charTotal: tl.textContent.length,
    selEndChars: 20
  }
}

/** C1 原始 clientRects 采集：跨多行选区（30%→60% 文本节点）→ raw rects+被选 span
 *  明细（gBCR/fontSize/fontFamily/canvas metrics）+全局偏移+lineH（fontSize 下中位） */
export function evalCRaw(p) {
  const root = document.querySelector(`[data-page-root="${p}"]`)
  const tl = root === null ? null : root.querySelector('.textLayer')
  if (tl === null || tl === undefined) return { err: 'missing textLayer' }
  const walker = document.createTreeWalker(tl, NodeFilter.SHOW_TEXT)
  const spans = []
  let cursor = 0
  for (let n = walker.nextNode(); n !== null; n = walker.nextNode()) {
    if (n.data.length > 0) {
      spans.push({ node: n, start: cursor, end: cursor + n.data.length })
      cursor += n.data.length
    }
  }
  const ia = Math.floor(spans.length * 0.3)
  const ib = Math.floor(spans.length * 0.6)
  const a = spans[ia]
  const b = spans[ib]
  if (a === undefined || b === undefined) return { err: 'text nodes missing' }
  const range = document.createRange()
  range.setStart(a.node, 0)
  range.setEnd(b.node, b.node.data.length)
  const sel = window.getSelection()
  sel.removeAllRanges()
  sel.addRange(range)
  const rects = Array.from(range.getClientRects()).map((r) => ({ x: r.x, y: r.y, w: r.width, h: r.height }))
  const rg = range.getBoundingClientRect()
  const tb = tl.getBoundingClientRect()
  const ctx = document.createElement('canvas').getContext('2d')
  const selected = []
  const seen = new Set()
  const w2 = document.createTreeWalker(tl, NodeFilter.SHOW_TEXT)
  for (let n = w2.nextNode(); n !== null; n = w2.nextNode()) {
    if (!range.intersectsNode(n)) continue
    const el = n.parentElement
    if (el === null || seen.has(el)) continue
    seen.add(el)
    const g = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    let m = null
    try {
      ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
      const mm = ctx.measureText(n.data.length > 0 ? n.data : ' ')
      const o = {
        ascent: mm.actualBoundingBoxAscent, descent: mm.actualBoundingBoxDescent,
        fontAscent: mm.fontBoundingBoxAscent, fontDescent: mm.fontBoundingBoxDescent
      }
      m = Object.values(o).every(Number.isFinite) ? o : null
    } catch { m = null }
    selected.push({
      text: n.data.slice(0, 40), len: n.data.length,
      x: g.x, y: g.y, w: g.width, h: g.height,
      fontSize: cs.fontSize, fontFamily: cs.fontFamily.slice(0, 60), dir: el.dir, metrics: m
    })
  }
  const sizes = selected
    .map((s) => parseFloat(s.fontSize))
    .filter((v) => Number.isFinite(v) && v > 0)
    .sort((x, y) => x - y)
  return {
    selStart: a.start, selEnd: b.end, ia, ib,
    rawRects: rects,
    rangeGBCR: { x: rg.x, y: rg.y, w: rg.width, h: rg.height },
    tlBox: { x: tb.x, y: tb.y, w: tb.width, h: tb.height },
    selected,
    lineH: sizes.length > 0 ? sizes[Math.floor((sizes.length - 1) / 2)] : undefined,
    spanTotal: spans.length, charTotal: cursor
  }
}

/** C2 甲轨落地形态：settle 后读 [data-testid=selection-rect] gBCR（现行管线渲染产物） */
export function evalCPaint() {
  const els = Array.from(document.querySelectorAll('[data-testid="selection-rect"]'))
  const hostBox = document.querySelector('[data-testid="selection-rects"]')?.getBoundingClientRect()
  return {
    blocks: els.map((el) => {
      const r = el.getBoundingClientRect()
      return { x: r.x, y: r.y, w: r.width, h: r.height }
    }),
    hostBox: hostBox === undefined ? null : { x: hostBox.x, y: hostBox.y, w: hostBox.width, h: hostBox.height }
  }
}

/** E bands 复刻采集：被选 textNodes → bandsForTextNodes 复刻链（annotation-resolve.ts
 *  :138-218 逐段）+逐 span metrics 明细+bandFromMetrics 双轨校验样本（3 份） */
export function evalEBands(p) {
  const root = document.querySelector(`[data-page-root="${p}"]`)
  const tl = root === null ? null : root.querySelector('.textLayer')
  if (tl === null || tl === undefined) return { err: 'missing textLayer' }
  const sel = window.getSelection()
  if (sel === null || sel.rangeCount === 0 || sel.isCollapsed) return { err: 'no selection' }
  const range = sel.getRangeAt(0)
  const tb = tl.getBoundingClientRect()
  const baseBox = { x: tb.x, y: tb.y, w: tb.width, h: tb.height }
  const ctx = document.createElement('canvas').getContext('2d')
  // —— 复刻链（源码行号锚定 annotation-resolve.ts）——
  const metricsOfReplica = (el, text) => {
    const cs = getComputedStyle(el)
    try {
      ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
      const mm = ctx.measureText(text.length > 0 ? text : ' ')
      const o = {
        ascent: mm.actualBoundingBoxAscent, descent: mm.actualBoundingBoxDescent,
        fontAscent: mm.fontBoundingBoxAscent, fontDescent: mm.fontBoundingBoxDescent
      }
      return Object.values(o).every(Number.isFinite) ? o : null
    } catch { return null }
  }
  const fontSizeOfReplica = (el, boxH) => {
    const px = parseFloat(getComputedStyle(el).fontSize)
    return Number.isFinite(px) && px > 0 ? px : boxH
  }
  const bandFromMetricsReplica = (span, fs, m, base) => {
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
  const mergeNearReplica = (bands, band) => {
    const near = bands.find((b) => Math.abs(b.center - band.center) <= band.bottom - band.top)
    if (near === undefined) {
      bands.push(band)
    } else {
      near.x0 = Math.min(near.x0 ?? band.x0 ?? Number.POSITIVE_INFINITY, band.x0 ?? Number.POSITIVE_INFINITY)
      near.x1 = Math.max(near.x1 ?? band.x1 ?? Number.NEGATIVE_INFINITY, band.x1 ?? Number.NEGATIVE_INFINITY)
    }
  }
  const bands = []
  const seen = new Set()
  const nodesDetail = []
  const w2 = document.createTreeWalker(tl, NodeFilter.SHOW_TEXT)
  for (let n = w2.nextNode(); n !== null; n = w2.nextNode()) {
    if (!range.intersectsNode(n)) continue
    const el = n.parentElement
    if (el === null || seen.has(el)) continue
    seen.add(el)
    const g = el.getBoundingClientRect()
    if (g.height <= 1) continue
    const m = metricsOfReplica(el, n.data)
    const fs = fontSizeOfReplica(el, g.height)
    const band = bandFromMetricsReplica({ x: g.x, y: g.y }, fs, m, baseBox)
    nodesDetail.push({
      text: n.data.slice(0, 20), box: { x: g.x, y: g.y, w: g.width, h: g.height }, fs, m
    })
    if (band === null) continue
    mergeNearReplica(bands, {
      ...band,
      x0: (g.x - baseBox.x) / baseBox.w,
      x1: (g.x + g.width - baseBox.x) / baseBox.w
    })
  }
  const samples = nodesDetail.slice(0, 3).map((d) => ({
    span: { x: d.box.x, y: d.box.y }, fs: d.fs, m: d.m, base: baseBox,
    expect: bandFromMetricsReplica({ x: d.box.x, y: d.box.y }, d.fs, d.m, baseBox)
  }))
  return { bands, nodesDetail, baseBox, samples }
}

/** 清理：Escape+清选区（React 正常卸载——f1-forensics 同配方） */
export function evalClear() {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
  getSelection().removeAllRanges()
  return true
}

/** 滚到代表页（e2e reader-scroll.spec.ts:161-167 同配方：直接设滚动容器 scrollTop
 *  ——scrollIntoView 在该容器结构下被拦不动，实测） */
export function evalScrollPage(p) {
  const scroller = document.querySelector('[data-page-column="ready"]')?.closest('.overflow-auto')
  const box =
    scroller?.querySelector(`[data-page-box="${p}"]`) ??
    scroller?.querySelector(`[data-page-root="${p}"]`)
  if (scroller !== null && scroller !== undefined && box !== null && box !== undefined) {
    const boxTop = box.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop
    scroller.scrollTop = Math.max(0, boxTop + 80 - scroller.clientHeight / 2)
    return { scrolled: true, top: scroller.scrollTop }
  }
  return { scrolled: false }
}
