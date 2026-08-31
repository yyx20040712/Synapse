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
 *   直接兄弟节点对不论年份层必横向错开 ≥ 前根半宽+间隙+本根半宽（同档=
 *   NODE_W+SIBLING_GAP；根节点占位 rootLo/rootHi 参与兄弟放置下限——非单调
 *   年份树兄弟全不共享层时不退化单列）；共享层轮廓约束语义原样（深层不
 *   共享层子树仍可交错）
 * - **统一卡尺寸（F-LG13，用户令 2026-08-31「方框都一样大小」）**：节点
 *   占位宽/高=nodeWidth/nodeHeight 恒定 NODE_W×NODE_H（240×110——签名
 *   兼容保留，R2-LG10 三档宽/R2-LG11 行数分档高语义删除）；卡片中心点输出
 *   语义不变；单链居中对齐/兄弟错开/紧凑性不变量随统一尺寸自然收窄
 * - **紧凑布局（F-LG13，用户令「中间没有空地」）**：SIBLING_GAP 40→16/
 *   TREE_GAP 80→24/SURVEY_COL_GAP 80→24；LAYER_GAP 140=年份时间轴语义不动
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
 *
 * ── R2-LG11（浅色严谨板·零 schema 单元）──
 * - **nodeHeight 高度单源（INV-38——F-LG13 修订为恒定 110）**：卡高不再随
 *   题名行数分档（64/82/100 删除）——题名溢出由 LineageNodeCard 题名区
 *   overflow-y 滚动承载；三消费（NodeCard rect/Edges 端点经 geom/viewport
 *   fitViewport）全引本函数（签名不变，历史消费面零改）。
 * - **综述右列（决3）**：isSurvey 节点（x/y 均非 null 的覆盖综述除外）
 *   不进 children/parentOf 树——其触及边在净化段有意分流（不计 dropped
 *   不 warn），子提升为根、父边断开不剔除（渲染层照常画）；树布局后单列
 *   于最右（列左缘=max(非右列右缘)+SURVEY_COL_GAP；同层输入序错开≥
 *   半宽和+SIBLING_GAP；y=year 层带）；综述仍计入层带。
 * - **BAND_LEFT/BAND_RIGHT/LAYER_LABEL_DY 单源（B1 清账）**：自
 *   lineage-viewport.ts 迁入导出——fitViewport 左界/Canvas 层带线 x1/x2/
 *   年份标偏移四消费禁各写。
 */
import type { LineageEdge, LineageNode } from '@shared/models/lineage'
import { isSurvey } from './lineage-classify'

// ── 几何常量（F-LG13 统一尺寸+紧凑布局——用户令「方框都一样大小且中间
//    没有空地」，2026-08-31；R2-LG10 三档宽 180/220/260 与 R2-LG11 行数
//    分档高 64/82/100 语义随令删除——方案切换=删旧）──
/** 统一卡宽（全节点恒定——三消费见 nodeWidth 注） */
export const NODE_W = 240
/** 统一卡高（题名区 ~3 行+底行 24px F-LG14 预留——三消费见 nodeHeight 注） */
export const NODE_H = 110
/** 层带中心间距（y 维） */
export const LAYER_GAP = 140
/** 兄弟子树最小间隙（x 维轮廓约束——F-LG13 紧凑化 40→16） */
export const SIBLING_GAP = 16
/** 森林相邻树间隙（F-LG13 紧凑化 80→24） */
export const TREE_GAP = 24
/** 综述右列与树布局区右缘的间隙（R2-LG11 决3——综述列于脉络最右侧；
 *  F-LG13 紧凑化 80→24） */
export const SURVEY_COL_GAP = 24
/** 层带横线左缘（B1 单源化：viewport fitViewport 包围盒左界/Canvas 层带线 x1） */
export const BAND_LEFT = -200
/** 层带横线右缘（贯穿全线——Canvas 层带线 x2 单源） */
export const BAND_RIGHT = 99999
/** 层带年份标 y 偏移（层带级元素不随卡高——固定常量） */
export const LAYER_LABEL_DY = 32

/**
 * 统一卡宽（F-LG13，票面 §1「恒定值」路线）：签名兼容保留（三消费面
 * INV-36 结构不动=最小改面），返回恒 NODE_W——题名长短不再影响占位宽
 * （R2-LG10 三档分档语义删除）；题名过长由 LineageNodeCard 题名区
 * overflow-y 滚动承载。
 * **单源三消费（INV-36 修订）**：本文件 place() 占位/LineageNodeCard 卡面
 * 渲染/fitViewport 包围盒（含 edge-label-layout 节点盒只读）——三处禁各写
 * 卡宽（卡宽变更=三消费面同改）。
 */
export function nodeWidth(_title: string): number {
  return NODE_W
}

/**
 * 统一卡高（F-LG13，票面 §1：题名溢出走卡内滚动非增高）：签名兼容保留，
 * 返回恒 NODE_H——卡高=题名区（flex:1 滚动）+底行信息区 24px（F-LG14 填充
 * 锚：含金量/年份/标签，高度含在统一高内——主控裁决 6 避免二次改卡结构）。
 * **单源三消费（INV-38 修订）**：LineageNodeCard rect 高/LineageEdges 端点
 * ±h/2（经 geom 预构建）/lineage-viewport fitViewport 包围盒——三处禁各写
 * 卡高（卡高变更=三消费面同改）。
 */
export function nodeHeight(_title: string): number {
  return NODE_H
}

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

  // 2) 综述右列成员（决3）：isSurvey 且非双覆盖（x/y 均非 null 的覆盖
  //    综述用覆盖值——覆盖优先语义不变，不进列）
  const surveyCol = new Set<string>()
  for (const n of nodes) {
    if (isSurvey(n.title) && !(n.x !== null && n.y !== null)) surveyCol.add(n.id)
  }

  // 3) 净化边（INV-27 防御第二道）：悬空/自环/多父（首条胜出）/成环；
  //    综述触及边（任一端是右列综述）不进树——其子提升为根、父边断开
  //    不剔除（渲染层照常画），不计 dropped（有意分流非破坏）
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
    if (e.kind === 'ref') continue // 参考边不进树/右列计算（R2-LG12——仅渲染消费，不计 dropped）
    if (surveyCol.has(e.fromNode) || surveyCol.has(e.toNode)) continue
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

  // 4) y 先行：层带或覆盖值（右列综述 y 强制层带——决3「y=其 year 层带 y」）
  const positions = new Map<string, { x: number; y: number }>()
  for (const n of nodes) {
    const y = n.y !== null && !surveyCol.has(n.id) ? n.y : layerY.get(n.year)!
    positions.set(n.id, { x: 0, y })
  }

  // 5) 根集合（nodes 输入序；综述不进树）；x 覆盖节点=覆盖值+断链（父侧
  //    移除、其子提升为顶层森林成员照常布局——断点不丢子树）
  const roots: string[] = []
  for (const n of nodes) {
    if (surveyCol.has(n.id)) continue
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

  // 6) RT tidy tree：后序 place（轮廓合并+兄弟间距）→ 前序 assign（绝对 x）
  //    节点宽=nodeWidth 恒定单源（F-LG13 统一尺寸——占位半宽恒 NODE_W/2）
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const wOf = new Map(nodes.map((n) => [n.id, nodeWidth(n.title)]))
  const selfRel = new Map<string, number>() // 节点相对自身子树包围盒原点的中心 x
  const boxOrigin = new Map<string, number>() // 子包围盒原点相对父包围盒原点

  function place(id: string): Frame {
    const kids = children.get(id) ?? []
    const myLayer = layerIdx.get(byId.get(id)!.year)!
    const w = wOf.get(id)!
    if (kids.length === 0) {
      selfRel.set(id, w / 2)
      return {
        spans: new Map([[myLayer, { lo: 0, hi: w }]]),
        width: w,
        rootLo: 0,
        rootHi: w
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
      // 兄弟约束 2=根占位（缺陷 E1）：直接兄弟根节点不论年份层必横向错开
      // ≥ 前根半宽+间隙+本根半宽（统一卡=NODE_W+SIBLING_GAP——F-LG13 统一
      // 尺寸）——非单调树兄弟全不共享层时约束 1 恒 0 → offset
      // 恒 0 → 单列退化（图五）；仅根占位参与（非全轮廓），深层不共享层
      // 子树交错不受此约束推开（紧凑性保持）
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
    // （非单调数据，如父子同年）重叠时右推防护（W1 延伸；占位半宽恒定）
    let x = width / 2
    const mine = merged.get(myLayer)
    if (mine !== undefined && x - w / 2 <= mine.hi + SIBLING_GAP) {
      x = mine.hi + SIBLING_GAP + w / 2
    }
    const plo = x - w / 2
    const phi = x + w / 2
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

  // 7) 综述右列（决3）：列左缘=max(非右列成员右缘)+SURVEY_COL_GAP
  //    （右缘面=树布局自动节点+x 覆盖节点含双覆盖综述）；综述中心 x=
  //    列左缘+自身半宽、y=其 year 层带（步骤 4 已就位）；同层多综述按
  //    nodes 输入序右移错开（相邻中心距 ≥ 半宽和+SIBLING_GAP）
  if (surveyCol.size > 0) {
    let treeRight = -Infinity
    for (const n of nodes) {
      if (surveyCol.has(n.id)) continue
      const p = positions.get(n.id)!
      treeRight = Math.max(treeRight, p.x + nodeWidth(n.title) / 2)
    }
    const colLeft = (treeRight === -Infinity ? 0 : treeRight) + SURVEY_COL_GAP
    const layerCursor = new Map<number, number>()
    for (const n of nodes) {
      if (!surveyCol.has(n.id)) continue
      const half = nodeWidth(n.title) / 2
      const y = layerY.get(n.year)!
      const x = (layerCursor.get(y) ?? colLeft) + half
      positions.set(n.id, { x, y })
      layerCursor.set(y, x + half + SIBLING_GAP)
    }
  }

  return { positions, layers }
}
