// b3: P7-H
/**
 * [SR2-LG-02] lineage-layout —— 布局纯函数+只读画布+脉络视图（工单：open / strong）
 *
 * ── 行为层 ──
 * - **布局纯函数**（ADR-0014 E3 字面）：y=年份分层（year 升序层带——
 *   year null 节点归「未知年份」末层）；x=**Reingold-Tilford tidy tree
 *   零依赖手写**（线性时间两趟扫描：后序遍历子树轮廓+兄弟间距+前序
 *   定 x——rescope-verification §4 算法调研母本；**D3 禁引**零新依赖
 *   红线）；**森林语义**（多根=多棵树并排——INV-27 单父无环前提下
 *   边集构成森林；孤立节点=单节点树）
 * - **兄弟根占位分离（缺陷 E1 修，2026-08-28 验收）**：layoutLineage 性质——
 *   直接兄弟节点对不论年份层必横向错开 ≥ NODE_W+SIBLING_GAP（根节点
 *   占位 rootLo/rootHi 参与兄弟放置下限——非单调年份树兄弟全不共享层
 *   时不退化单列）；共享层轮廓约束语义原样（深层不共享层子树仍可交错）
 * - **手工位置覆盖优先**（JSON Canvas 模式）：节点 x/y 非 null → 用
 *   覆盖值不参与自动布局（覆盖节点与其余自动节点可重叠——v1 不做
 *   碰撞避让，票面声明）；null → 布局产出
 * - **同输入同输出**（纯函数性质单测锚定——排序稳定性：同层节点按
 *   树序非 id 字典序）
 * - **只读画布 LineageCanvas.tsx**：SVG 渲染（节点=卡片 rect+标题+
 *   年份；边=父子连线贝塞尔；主题节点样式区分文献节点）；pan/zoom
 *   （滚轮缩放+空白拖拽平移——**INV-14 成对注册/成对清理**既有
 *   不变量扩面，卸载清 listener 用例）
 * - **新顶层视图「脉络」**（E4）：App 导航第四项（NAV+ViewId 扩
 *   'lineage'——App.tsx infra 无工单挂载面）；LineagePage.tsx 视图
 *   宿主（经 lineage/graph 通道取数→**lineage.store 新建数据单源**
 *   （AI-08 ai-notes.store 同型新数据新域）——03/04 禁双取，接缝
 *   双向锚定声明两文件头注）
 *
 * ── 接口层 ──
 * - export function layoutLineage(nodes: LineageNode[], edges:
 *   LineageEdge[]): LayoutResult（{ positions: Map<id,{x,y}>,
 *   layerYears: number[]（含 NaN 哨兵=未知层? 以 year|null 序列化——
 *   形状实现定，票面不锁） }——输出坐标系=布局原点系，画布 viewport
 *   变换归组件）
 * - 交付面：lineage-layout.ts+LineageCanvas.tsx+LineagePage.tsx+
 *   lineage.store.ts+App.tsx 挂载（NAV/ViewId/路由三行族）+
 *   window.api 类型面（lineage 域 01 已立——消费零改动）
 *
 * ── 架构层 ──
 * - renderer/features/lineage 新域；依赖 window.api（lineage/graph）
 *   +shared/models/lineage（01 交付）+SVG 零第三方（React 内建）；
 *   **禁引 d3/任何布局库**（ESLint 无白名单新条目——零依赖红线）
 * - 分层不破：布局纯函数禁 DOM/window（可测性=纯数据进出）
 *
 * ── 生命周期层 ──
 * - 预留：节点显隐过滤（按年份带折叠——v2）；碰撞避让（覆盖节点
 *   重叠提示）；缩放范围钳制参数化
 * - 不做：交互编辑（03）；侧板/跳转（04）；DAG 布局（v2 升版条件=
 *   真实多父编辑诉求——ADR-0014）
 *
 * ── 文化层 ──
 * - 错误：graph 取数失败=列表型瞬态（store.error 消费方呈现+重试——
 *   INV-02 两型分清）；读面状态枚举（门一 N6）：loading/ready/error
 *   三态（无用户输入写面——状态机前置纪律不适用结论维持，pan/zoom
 *   =视口瞬态不入 store）；布局输入含 INV-27 破坏（多父/环）=防御性剔除
 *   非崩溃（理论不可达——service 层已守；剔除计数 console.warn 供
 *   调试，不 toast 不静默吞）
 * - 测试：tests/unit/renderer/lineage-layout.test.ts [受锁新增]——
 *   单链 x 序单调/兄弟不重叠（轮廓间距断言）/年份分层 y 单调+未知层
 *   末位/森林多根并排不重叠/覆盖优先（x/y 非 null 节点不移动）/空图
 *   空结果/纯函数性质（两次调用深相等）；LineageCanvas 组件测试
 *   [受锁新增]——节点文本真实渲染（「渲染出真实文本」红线）/pan
 *   listener 成对清理（INV-14）/zoom 钳制；**always-active**
 * - 新增受锁测试随实现 locks:generate+apply+[locked-change] 尾注
 * - 完成后：删除 STUB → npm run verify 绿 → 人工审查 git diff → 翻 registry
 *
 * ── 实现注（票面规约原文之上叠加，形状自定面=主控裁决 1/2）──
 * - 输出形状：LayoutResult { positions, layers }——positions 键=节点 id，
 *   值=**卡片中心点**（组件按中心减半宽高绘制）；layers=层带序列
 *   （year 升序+null 末位，y=层带中心=i×LAYER_GAP），覆盖节点仍计入
 *   层带（归属按 year 不变），但位置用覆盖值（y 覆盖不吸附层带）。
 * - 边方向=from 父（继承来源）→to 子（继承者），service 契约同向。
 * - 防御剔除（INV-27 第二道，service 已守）：悬空边/自环/多父（首条
 *   胜出）/成环（to 是 from 祖先链上的点）——剔除计数一次汇总
 *   console.warn；**不丢节点**（环上节点断边后照常成根布局）。
 * - x 覆盖节点与其父断链（其子树自成根照常布局）；y 覆盖仅替换 y。
 * - RT 两趟：place() 后序合并子树轮廓，兄弟放置=max over（共享层前树右
 *   缘+间隙）∪（前树根占位右缘+间隙−本树根占位左缘——缺陷 E1 修）；
 *   assign() 前序按 boxOrigin 累积绝对化。树序=边输入序
 *   （稳定性锚点）。**轮廓帧按年份层序索引（非树深度——回炉 1 轮 W1）**：
 *   y=年份层带打破经典 RT「深度=行」不变量后，深度索引只在同深度分离，
 *   叔侄同年（异深同年带）无约束即重叠（门一实测 70px）——层索引保证
 *   **同年层内任意两节点 x 区间分离**（全树性质）；父占位并入自身层，
 *   与子孙同层（非单调数据）时右推防护。
 */
import type { LineageEdge, LineageNode } from '@shared/models/lineage'

// ── 几何常量（卡片等宽——票面「节点宽度统一常量」）──────────────────
export const NODE_W = 180
export const NODE_H = 64
/** 层带中心间距（y 维） */
export const LAYER_GAP = 140
/** 兄弟子树最小间隙（x 维轮廓约束） */
export const SIBLING_GAP = 40
/** 森林相邻树间隙 */
export const TREE_GAP = 80

export interface LayoutResult {
  /** 节点 id → 卡片中心点（覆盖节点=覆盖值原样） */
  positions: Map<string, { x: number; y: number }>
  /** 年份层带（升序+null 末位；含覆盖节点的 year） */
  layers: Array<{ year: number | null; y: number }>
}

/** 子树轮廓（相对子树包围盒原点）：年份层序 → 该层占位 [lo, hi] */
interface Frame {
  spans: Map<number, { lo: number; hi: number }>
  width: number
  /** 根节点占位（相对同一原点）：叶子=[0,NODE_W]，内部节点=[x−NODE_W/2, x+NODE_W/2] */
  rootLo: number
  rootHi: number
}

export function layoutLineage(nodes: LineageNode[], edges: LineageEdge[]): LayoutResult {
  // 1) 层带：全部节点（含覆盖）的 year 去重——升序、null 末位
  const yearSet = new Set<number | null>()
  for (const n of nodes) yearSet.add(n.year)
  const years = [...yearSet].sort((a, b) => {
    if (a === null) return b === null ? 0 : 1
    if (b === null) return -1
    return a - b
  })
  const layers = years.map((year, i) => ({ year, y: i * LAYER_GAP }))
  const layerY = new Map<number | null, number>(years.map((y, i) => [y, i * LAYER_GAP]))
  /** year → 年份层序（W1：轮廓帧索引=层序非树深度） */
  const layerIdx = new Map<number | null, number>(years.map((y, i) => [y, i]))

  // 2) 净化边（INV-27 防御第二道）：悬空/自环/多父（首条胜出）/成环
  const nodeIds = new Set(nodes.map((n) => n.id))
  const parentOf = new Map<string, string>()
  const children = new Map<string, string[]>()
  /** to 是否在 from 的祖先链上（加边即成环）——沿父链上溯 */
  const isAncestorOf = (ancestor: string, from: string): boolean => {
    let cur: string | undefined = from
    while (cur !== undefined) {
      if (cur === ancestor) return true
      cur = parentOf.get(cur)
    }
    return false
  }
  let dropped = 0
  for (const e of edges) {
    const broken =
      e.fromNode === e.toNode ||
      !nodeIds.has(e.fromNode) ||
      !nodeIds.has(e.toNode) ||
      parentOf.has(e.toNode) ||
      isAncestorOf(e.toNode, e.fromNode)
    if (broken) {
      dropped++
      continue
    }
    parentOf.set(e.toNode, e.fromNode)
    children.set(e.fromNode, [...(children.get(e.fromNode) ?? []), e.toNode])
  }
  if (dropped > 0) {
    console.warn(
      `[lineage-layout] 剔除 ${dropped} 条破坏树约束的边（多父/环/自环/悬空——` +
        'INV-27 service 层已守，此为布局防御第二道，不丢节点）'
    )
  }

  // 3) y 先行：层带或覆盖值
  const positions = new Map<string, { x: number; y: number }>()
  for (const n of nodes) {
    positions.set(n.id, { x: 0, y: n.y !== null ? n.y : layerY.get(n.year)! })
  }

  // 4) 根集合（nodes 输入序）；x 覆盖节点=覆盖值+断链（父侧移除、其子
  //    提升为顶层森林成员照常布局——断点不丢子树）
  const roots: string[] = []
  for (const n of nodes) {
    if (n.x !== null) {
      positions.get(n.id)!.x = n.x
      const parent = parentOf.get(n.id)
      if (parent !== undefined) {
        children.set(
          parent,
          (children.get(parent) ?? []).filter((c) => c !== n.id)
        )
      }
      for (const kid of children.get(n.id) ?? []) roots.push(kid)
      continue
    }
    if (parentOf.get(n.id) === undefined) roots.push(n.id)
  }

  // 5) RT tidy tree：后序 place（轮廓合并+兄弟间距）→ 前序 assign（绝对 x）
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const selfRel = new Map<string, number>() // 节点相对自身子树包围盒原点的中心 x
  const boxOrigin = new Map<string, number>() // 子包围盒原点相对父包围盒原点

  function place(id: string): Frame {
    const kids = children.get(id) ?? []
    const myLayer = layerIdx.get(byId.get(id)!.year)!
    if (kids.length === 0) {
      selfRel.set(id, NODE_W / 2)
      return {
        spans: new Map([[myLayer, { lo: 0, hi: NODE_W }]]),
        width: NODE_W,
        rootLo: 0,
        rootHi: NODE_W
      }
    }
    const merged = new Map<number, { lo: number; hi: number }>()
    const offsets: number[] = []
    let mergedRootHi: number | null = null // 已合并兄弟根占位 max 右缘（null=首个兄弟无下限）
    for (const kid of kids) {
      const f = place(kid)
      // 兄弟约束 1=共享层（原样保留）：所有共享层上（前树该层右缘+间隙-本
      // 树该层左缘）的最大值——不共享层的子树可交错（轮廓紧凑性）；共享层
      // 含异深同年（W1 核心）
      let need = 0
      for (const [layer, span] of f.spans) {
        const prev = merged.get(layer)
        if (prev !== undefined) {
          need = Math.max(need, prev.hi + SIBLING_GAP - span.lo)
        }
      }
      // 兄弟约束 2=根占位（缺陷 E1）：直接兄弟根节点不论年份层
      // 必错开 ≥ NODE_W+SIBLING_GAP——非单调树兄弟全不共享层时约束 1 恒 0
      // → offset 恒 0 → 单列退化（图五）；仅根占位参与（非全轮廓），深层
      // 不共享层子树交错不受此约束推开（紧凑性保持）
      if (mergedRootHi !== null) {
        need = Math.max(need, mergedRootHi + SIBLING_GAP - f.rootLo)
      }
      const offset = Math.max(0, need)
      offsets.push(offset)
      mergedRootHi = Math.max(mergedRootHi ?? -Infinity, offset + f.rootHi)
      for (const [layer, span] of f.spans) {
        const lo = offset + span.lo
        const hi = offset + span.hi
        const prev = merged.get(layer)
        merged.set(layer, prev === undefined ? { lo, hi } : { lo: Math.min(prev.lo, lo), hi: Math.max(prev.hi, hi) })
      }
    }
    // 归一化：包围盒左缘到 0
    const minL = Math.min(...[...merged.values()].map((s) => s.lo))
    const width = Math.max(...[...merged.values()].map((s) => s.hi)) - minL
    for (let i = 0; i < kids.length; i++) {
      boxOrigin.set(kids[i]!, offsets[i]! - minL)
    }
    for (const [layer, s] of merged) {
      merged.set(layer, { lo: s.lo - minL, hi: s.hi - minL })
    }
    // 父居中于子块（RT 经典视觉）；父占位并入自身年份层——与子孙同层
    // （非单调数据，如父子同年）重叠时右推防护（W1 延伸）
    let x = width / 2
    const mine = merged.get(myLayer)
    if (mine !== undefined && x - NODE_W / 2 <= mine.hi + SIBLING_GAP) {
      x = mine.hi + SIBLING_GAP + NODE_W / 2
    }
    const plo = x - NODE_W / 2
    const phi = x + NODE_W / 2
    merged.set(
      myLayer,
      mine === undefined
        ? { lo: plo, hi: phi }
        : { lo: Math.min(mine.lo, plo), hi: Math.max(mine.hi, phi) }
    )
    const finalMin = Math.min(...[...merged.values()].map((s) => s.lo))
    const finalWidth = Math.max(...[...merged.values()].map((s) => s.hi)) - finalMin
    selfRel.set(id, x)
    return { spans: merged, width: finalWidth, rootLo: plo, rootHi: phi }
  }

  function assign(id: string, originAbs: number): void {
    const p = positions.get(id)!
    p.x = originAbs + selfRel.get(id)!
    for (const kid of children.get(id) ?? []) {
      assign(kid, originAbs + boxOrigin.get(kid)!)
    }
  }

  let forestX = 0
  for (const r of roots) {
    const f = place(r)
    assign(r, forestX)
    forestX += f.width + TREE_GAP
  }

  return { positions, layers }
}
