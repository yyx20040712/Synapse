/**
 * F-A8 门 1 取证库（f-a8-gate1-diag.mjs 依赖件）——双链产物对比数学（纯 Node）：
 * 逐块 IoU/聚合面积 IoU/band 逐对差/块配对错位计数（门 1b W1）/entry→viewport
 * 复刻/Annotation 组装。
 *
 * 纪律声明：本件零 DOM/零副作用；真函数（esbuild bundle）不在本件——主脚本
 * 消费 bundle 导出面（resolveAnnotationRectsItem/mergeLineRects/mergeRects/
 * verifyQuoteItem/bandFromMetrics/rectsForOffsetRange/baselineGroupBlocks/
 * selectionHealth），本件只做产物后处理与判据聚合（f-a6-diag-lib 分层先例）。
 */

/** 归一化矩形（AnnotationRect 去页码域） */
export function normRect(r) {
  return { x: r.x, y: r.y, w: r.w, h: r.h }
}

/** 两归一化矩形 2D 面积交 */
function interArea(a, b) {
  const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)
  const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)
  return ox > 0 && oy > 0 ? ox * oy : 0
}

/** 贪心最大交配对聚合 IoU：Σ（每 A 块与未占用 B 块最大交）/Σ并。
 *  对块数失配/旋转形态稳健（逐对最近中心配对器 y 假定的 f-a6 §9-4 盲区免疫
 *  ——配对键改为面积交本身）。并集近似=ΣA+ΣB−Σ已配交（贪心配对下界）。 */
export function areaIou(rectsA, rectsB) {
  const A = rectsA.map(normRect)
  const B = rectsB.map(normRect)
  const area = (r) => r.w * r.h
  const sumA = A.reduce((s, r) => s + area(r), 0)
  const sumB = B.reduce((s, r) => s + area(r), 0)
  // 恒返回对象形（双零面积 iou=null 单侧零面积 iou=0——零高伪迹/空产物面）：
  // 消费面 cmp.area.iou 免分支判
  if (sumA <= 0 && sumB <= 0) return { iou: null, pairedA: 0, countA: A.length, countB: B.length }
  if (sumA <= 0 || sumB <= 0) return { iou: 0, pairedA: 0, countA: A.length, countB: B.length }
  const used = new Set()
  let inter = 0
  const pairs = []
  for (const a of A) {
    let best = -1
    let bestV = 0
    B.forEach((b, i) => {
      if (used.has(i)) return
      const v = interArea(a, b)
      if (v > bestV) { bestV = v; best = i }
    })
    if (best >= 0) {
      used.add(best)
      inter += bestV
      pairs.push(bestV)
    }
  }
  const union = sumA + sumB - inter
  // 恒返回对象形（单侧零面积 iou=0——零高伪迹块面）：消费面 cmp.area.iou 免空判
  return { iou: union > 0 ? Number((inter / union).toFixed(4)) : 0, pairedA: pairs.length, countA: A.length, countB: B.length }
}

/** 1D x 轴 IoU（f-a6 A/B 对照口径——overlapMetric.iouX 的逐锚点聚合形）：
 *  y 门配对（|Δcy|≤(ha+hb)/2+gateNorm）后 Σx 交/Σx 并；旋转竖排形态 y 门结构性
 *  失配（f-a6 §9-4 盲区）→ pairedA/countA 申报。恒对象形。 */
export function iou1D(rectsA, rectsB, gateNorm = 0.01) {
  const A = rectsA.map(normRect)
  const B = rectsB.map(normRect)
  const used = new Set()
  let inter = 0
  let union = 0
  let paired = 0
  for (const a of A) {
    let best = -1
    let bestV = 0
    B.forEach((b, i) => {
      if (used.has(i)) return
      const dcy = Math.abs(b.y + b.h / 2 - (a.y + a.h / 2))
      if (dcy > (a.h + b.h) / 2 + gateNorm) return
      const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)
      if (ox > bestV) { bestV = ox; best = i }
    })
    union += a.w
    if (best >= 0) {
      used.add(best)
      inter += bestV
      union += B[best].w - bestV
      paired += 1
    }
  }
  for (let i = 0; i < B.length; i += 1) {
    if (!used.has(i)) union += B[i].w
  }
  return { iou: union > 0 ? Number((inter / union).toFixed(4)) : null, pairedA: paired, countA: A.length, countB: B.length }
}

/** 逐块配对（最近中心+门）：返回配对块 2D IoU/dx/dy（诊断口径——横排页有效；
 *  旋转形态 N/A 申报同 f-a6 §9-4）。gateNorm=配对门附加量（归一化域，
 *  ≈2px/盒高——f-a6 pairBlocks px 域 +2px 的归一化换算） */
export function blockIouPairs(rectsA, rectsB, gateNorm = 0.01) {
  const A = rectsA.map(normRect)
  const B = rectsB.map(normRect)
  const out = []
  for (const a of A) {
    let best = null
    for (const b of B) {
      if (best === null || Math.abs(b.y + b.h / 2 - (a.y + a.h / 2)) < Math.abs(best.y + best.h / 2 - (a.y + a.h / 2))) best = b
    }
    if (best === null) continue
    const dcy = Math.abs(best.y + best.h / 2 - (a.y + a.h / 2))
    if (dcy <= (a.h + best.h) / 2 + gateNorm) {
      const inter = interArea(a, best)
      const union = a.w * a.h + best.w * best.h - inter
      out.push({
        iou: union > 0 ? Number((inter / union).toFixed(4)) : null,
        dx: Number((best.x + best.w / 2 - (a.x + a.w / 2)).toFixed(4)),
        dy: Number((best.y + best.h / 2 - (a.y + a.h / 2)).toFixed(4))
      })
    }
  }
  return out
}

/** band 逐对差（最近中心配对——band 域无行距假定，旋转页同适用） */
export function bandPairs(bandsA, bandsB) {
  const out = []
  for (const a of bandsA) {
    let best = null
    for (const b of bandsB) {
      if (best === null || Math.abs(b.center - a.center) < Math.abs(best.center - a.center)) best = b
    }
    if (best === null) continue
    out.push({
      dTop: Number(Math.abs(best.top - a.top).toFixed(4)),
      dBottom: Number(Math.abs(best.bottom - a.bottom).toFixed(4)),
      dCenter: Number(Math.abs(best.center - a.center).toFixed(4))
    })
  }
  return out
}

/** 块配对错位计数（F-A8 门 1b W1——y 域行膨胀→x 轴 IoU1D 错对因果钉死）：
 *  A/B 各按文档序 (y,x) 排序后逐 A 取最近 y 中心 B（blockIouPairs 同配对器
 *  独立指派）；结构一致时正确配对必同秩（同序同位），秩错位=错对块（错行/
 *  双绑/漏绑统称——y 膨胀行结构分叉后该对的 x 区间对照不可信）。countA≠countB
 *  时分叉点后秩整体位移，全数计错（保守上界——结构分叉=所有配对不可信，
 *  常规页实测 countA=countB）。修复预期=错对锚数 0/错对块数 0。 */
export function mispairBlocks(rectsA, rectsB) {
  const byDoc = (r1, r2) => r1.y - r2.y || r1.x - r2.x
  const A = rectsA.map(normRect).sort(byDoc)
  const B = rectsB.map(normRect).sort(byDoc)
  let mispaired = 0
  for (let i = 0; i < A.length; i += 1) {
    let best = -1
    let bestD = Number.POSITIVE_INFINITY
    for (let j = 0; j < B.length; j += 1) {
      const d = Math.abs(B[j].y + B[j].h / 2 - (A[i].y + A[i].h / 2))
      if (d < bestD) { bestD = d; best = j }
    }
    if (best !== i) mispaired += 1
  }
  return { countA: A.length, countB: B.length, mispairedBlocks: mispaired }
}

/** entry → ItemViewport 复刻（annotation-resolve.ts itemViewportOf:373-382 同式——
 *  私有函数不导出故复刻；scale 自 entry.box 反推=真函数口径） */
export function itemViewportOfReplica(entry) {
  const [x0, y0, x1, y1] = entry.geometry.view
  const rot = ((entry.geometry.rotate % 360) + 360) % 360
  const domWidth = rot === 90 || rot === 270 ? y1 - y0 : x1 - x0
  return {
    scale: domWidth > 0 ? entry.box.w / domWidth : Number.NaN,
    rotate: entry.geometry.rotate,
    view: entry.geometry.view
  }
}

/** 项偏移表（f-a6-diag-lib.baselineRowTruth 的 offsets 形参口径：含空串项零宽条目） */
export function offsetsOfItems(items) {
  const offsets = []
  let acc = 0
  for (const it of items) {
    offsets.push([acc, acc + it.str.length])
    acc += it.str.length
  }
  return offsets
}

/** DOM span 盒 → selectionHealth 输入形（ItemBox 结构最小面——vProj/fontH/angle
 *  不参与 selectionHealth 消费面，占位 0） */
export function spanBoxesAsItemBoxes(boxes) {
  return boxes.map((b) => ({ rect: { x: b.x, y: b.y, w: b.w, h: b.h }, vProj: 0, fontH: 0, angle: 0 }))
}

/** 标注对象组装（Annotation 形状——resolve 双入口消费面；不入库零校验面） */
export function annotationOf(id, paperId, page, anchor, rects) {
  const ts = '2026-09-04T00:00:00.000Z'
  return {
    id, paperId, page,
    kind: 'highlight', color: 'yellow',
    quoteText: anchor.quote, prefixText: anchor.prefix, suffixText: anchor.suffix,
    startOffset: anchor.start, endOffset: anchor.end,
    rects, comment: '', createdAt: ts, updatedAt: ts
  }
}

/** 下中位数（f-a6-diag-lib.lowerMedian 复用面外第 2 处——本件聚口径小拷贝） */
export function medOf(nums) {
  if (nums.length === 0) return null
  const s = [...nums].sort((x, y) => x - y)
  return s[Math.floor((s.length - 1) / 2)]
}
