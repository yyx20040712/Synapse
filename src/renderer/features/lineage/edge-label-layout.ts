// b3: P7-H
/**
 * [F-L1-C] edge-label-layout —— 边标签防重叠放置器（纯函数单源，零 DOM/React）。
 *
 * 用户保证①「保证布局时脉络标签不重叠遮挡」的算法宿主：逐边（输入序）贪心
 * 放置，候选位从贝塞尔锚点起按确定性偏移序（先竖移——沿边线竖移视觉最自然，
 * 同档 dx 三档）搜第一个自由位。**贪心依赖输入序**：同输入序多次调用输出
 * 一致（④锁）；乱序输入不等价（契约即序稳定性，非交换性）。
 *
 * 口径与容差（票面文化层+主控预裁 3）：
 * - 碰撞盒 w=estimateLabelWidth(label)+gap 4、h=EDGE_LABEL_H+gap 4；节点盒
 *   外扩 6px（判定时加，传入 geom 半宽半高——nodeWidth/nodeHeight 单源
 *   INV-36/38 只读消费）；恰好接触（间距=半和）不算重叠（严格 < 判相交）。
 * - est 宽度偏差（latin 0.5em 近似）由 gap 4px+渲染 FO 恒 130 吸收——碰撞
 *   盒略窄于实际时重叠 ≤ 数 px 的残差，声明容差不修。
 * - dy ∈ 0,+lh,−lh,…±10lh（lh=13=39/3 行行高，±130/20 档）；同档
 *   dx ∈ 0,−(w/2+16),+(w/2+16),−(w/2+16)×2,+(w/2+16)×2。**包络=回炉 1 R1
 *   实测依据**（f-l1c-verify.json）：nodeHeight 100 档半高 50+外扩 6+标签
 *   半高 18.5+gap → 锚在节点中心需 |dy|≥~85 或 dx≥~163，原 ±5lh=61.75/
 *   单档 ±83 双双不足→回退 anchor 仍重叠——扩至 ±10lh+dx 两档倍频后真库
 *   场景可移出（②b/③b 锁）。全序列无自由位→回 anchor（best effort——
 *   极端密集图仍有重叠可能，⑤锁该回退分支：节点盒铺满 ±10lh×dx 两档
 *   包络 x±233/y±144）。
 * - 输出槽位中心；Map 供渲染（LineageEdges）与 fit 包围盒（fitViewport
 *   labelBoxes——Canvas 两消费，被推出的标签不可消失在 fit 视野外）。
 */
/** 标签渲染盒恒宽（渲染 FO 恒上限尺寸——短标签透明空区无视觉影响） */
export const EDGE_LABEL_MAX_W = 130
/** 标签渲染盒恒高（3 行 × 10px × 1.3 行高——P7D-01 批二回炉：字号 9.5→10 耦合族随迁） */
export const EDGE_LABEL_H = 39
/** 放置器档距（先竖移的步长=单行行高） */
const LH = 13
/** 碰撞盒间隙 */
const GAP = 4
/** 节点盒外扩（标签与节点卡之间的呼吸距） */
const NODE_PAD = 6

/**
 * 标签估宽（只用于碰撞盒——渲染 FO 恒 130 宽，窄标签碰撞盒窄=放置更自然）：
 * 码点 >0x2E80 计全宽 10px/字（口径：覆盖 CJK 统表/扩展/全角标点——
 * CJK 部首 0x2E80 起全数计入），其余半宽 5px/字；+左右 padding 合计 4；
 * 钳 ≤130。空串=0（空 label 不渲染，碰撞盒零宽）。
 */
export function estimateLabelWidth(label: string): number {
  // 空 label 不渲染（既有语义）——碰撞盒零宽
  if (label === '') return 0
  let w = 4
  for (const ch of label) {
    w += ch.codePointAt(0)! > 0x2e80 ? 10 : 5
  }
  return Math.min(w, EDGE_LABEL_MAX_W)
}

/** AABB 相交（中心+半宽高；严格 <——恰好接触算分离） */
function hits(
  a: { x: number; y: number; hw: number; hh: number },
  b: { x: number; y: number; hw: number; hh: number }
): boolean {
  return Math.abs(a.x - b.x) < a.hw + b.hw && Math.abs(a.y - b.y) < a.hh + b.hh
}

/**
 * 防重叠放置：逐边（输入序）贪心——候选位 anchor 起，与已放标签碰撞盒或
 * 任一节点盒（外扩 6）相交则按偏移序（dy 11 档×dx 3 档）搜第一个自由位；
 * 全占位回 anchor。输出槽位中心 Map（key=边 id）。
 */
export function placeEdgeLabels(
  items: Array<{ id: string; label: string; anchor: { x: number; y: number } }>,
  nodeBoxes: Array<{ x: number; y: number; hw: number; hh: number }>
): Map<string, { x: number; y: number }> {
  const placed: Array<{ x: number; y: number; hw: number; hh: number }> = []
  const nodes = nodeBoxes.map((b) => ({ x: b.x, y: b.y, hw: b.hw + NODE_PAD, hh: b.hh + NODE_PAD }))
  const out = new Map<string, { x: number; y: number }>()
  for (const it of items) {
    const w = estimateLabelWidth(it.label) + GAP
    const hw = w / 2
    const hh = (EDGE_LABEL_H + GAP) / 2
    // 偏移序（回炉 1 R1 包络）：dy 0,+lh,−lh,…±10lh；同档
    // dx 0,−(w/2+16),+(w/2+16),−(w/2+16)×2,+(w/2+16)×2
    const dxs = [0, -(hw + 16), hw + 16, -(hw + 16) * 2, (hw + 16) * 2]
    let slot: { x: number; y: number } | null = null
    for (let i = 0; i <= 10 && slot === null; i++) {
      for (const dySign of i === 0 ? [1] : [1, -1]) {
        for (const dx of dxs) {
          const cand = { x: it.anchor.x + dx, y: it.anchor.y + dySign * i * LH, hw, hh }
          if (placed.some((p) => hits(p, cand)) || nodes.some((n) => hits(n, cand))) continue
          slot = { x: cand.x, y: cand.y }
          break
        }
        if (slot !== null) break
      }
    }
    // 全序列无自由位→回 anchor（best effort，头注声明）
    const finalSlot = slot ?? { x: it.anchor.x, y: it.anchor.y }
    out.set(it.id, finalSlot)
    placed.push({ x: finalSlot.x, y: finalSlot.y, hw, hh })
  }
  return out
}
