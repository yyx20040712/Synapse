/**
 * [B4 L1 / 设计稿 §7.3 步骤 4] lineage-history-guards —— 脉络纯图守卫
 * （自 lineage.service upsertEdge 写面抽出复用；零 IO、零 repo 依赖）。
 *
 * ── 行为层 ──
 * - edgeGuardIssue：单边守卫——自环拒/via 不变量/端点锚形状/端点存在/跨图拒
 *   （INV-90）/重复边/成环。判定序与拒绝消息同 upsertEdge 写面逐字同源
 *   （受锁测试断言子串不变）；返回 code+message，由调用方抛域错误。
 * - finalGraphGuardIssue：history-unit 在内存模拟的最终 touched 图结构守卫——
 *   一文献一节点（idx_lineage_paper 唯一）、悬空边（FK CASCADE 不得替 unit
 *   多写）、touched 边过单边守卫（含跨图）、全图无环。folder/paper 存在性
 *   属 service 事务前检查（给出具体 reason），不在本纯图件。
 * - reachable/hasCycle：环守卫可达性（from→to 方向；excludeEdgeId=换端重连
 *   时排除自身旧端点）。
 *
 * ── 接口层 ──
 * - export function edgeGuardIssue(input, graph: () => GuardGraph): GraphGuardIssue | null
 * - export function finalGraphGuardIssue(input): GraphGuardIssue | null
 * - export function reachable(edges, start, target, excludeEdgeId?): boolean
 * - export function hasCycle(nodes, edges): boolean
 *
 * ── 架构层 ──
 * - services/lineage 内部件：只依赖 shared/models/lineage 的纯校验函数。
 */
import {
  validateLineageAnchor,
  validateLineageVia,
  type LineageAnchor,
  type LineageEdge,
  type LineageNode,
  type LineageViaPoint
} from '../../../shared/models/lineage'

/** 守卫拒绝项：code=AppErrorCode 子集；message=面向用户的中文 reason */
export interface GraphGuardIssue {
  code: 'CONFLICT' | 'INVALID_REQUEST'
  message: string
}

export interface GuardGraph {
  nodes: LineageNode[]
  edges: LineageEdge[]
}

/** 受检边（upsertEdge 输入面与完整边读模型共用形状） */
export interface GuardedEdgeInput {
  id?: string
  fromNode: string
  toNode: string
  label: string
  via?: LineageViaPoint[] | null
  fromAnchor?: LineageAnchor | null
  toAnchor?: LineageAnchor | null
}

/** 图上沿 from→to 方向是否可从 start 到达 target（环守卫用） */
export function reachable(
  edges: readonly LineageEdge[],
  start: string,
  target: string,
  excludeEdgeId?: string
): boolean {
  const adj = new Map<string, string[]>()
  for (const e of edges) {
    if (e.id === excludeEdgeId) continue
    adj.set(e.fromNode, [...(adj.get(e.fromNode) ?? []), e.toNode])
  }
  const visited = new Set<string>()
  const stack = [start]
  while (stack.length > 0) {
    const u = stack.pop()!
    if (u === target) return true
    if (visited.has(u)) continue
    visited.add(u)
    stack.push(...(adj.get(u) ?? []))
  }
  return false
}

/** 全图有向环检测（Kahn 拓扑——入度归零法；O(V+E)） */
export function hasCycle(nodes: readonly LineageNode[], edges: readonly LineageEdge[]): boolean {
  const indegree = new Map<string, number>(nodes.map((n) => [n.id, 0]))
  const adj = new Map<string, string[]>()
  for (const e of edges) {
    if (!indegree.has(e.fromNode) || !indegree.has(e.toNode)) continue
    adj.set(e.fromNode, [...(adj.get(e.fromNode) ?? []), e.toNode])
    indegree.set(e.toNode, (indegree.get(e.toNode) ?? 0) + 1)
  }
  const queue = [...indegree].filter(([, d]) => d === 0).map(([id]) => id)
  let visitedCount = 0
  while (queue.length > 0) {
    const u = queue.pop()!
    visitedCount += 1
    for (const v of adj.get(u) ?? []) {
      const next = (indegree.get(v) ?? 0) - 1
      indegree.set(v, next)
      if (next === 0) queue.push(v)
    }
  }
  return visitedCount !== indegree.size
}

/**
 * 单边守卫（upsertEdge 写面与 history-unit 最终图共用）。input.id 在 graph.edges
 * 中在场时=更新语义：重复边查重与成环判定排除自身旧端点。graph 惰性求值——
 * 载荷面校验（自环/via/锚）先于读图（与既有 upsertEdge 判定序一致）。
 */
export function edgeGuardIssue(input: GuardedEdgeInput, graph: () => GuardGraph): GraphGuardIssue | null {
  if (input.fromNode === input.toNode) {
    return { code: 'CONFLICT', message: '自环边不允许（from 与 to 为同一节点）' }
  }
  // [F-LINEAGE-02 ①a] via 不变量 ①②③序列化校验（违者 INVALID_REQUEST 请求面拒绝）
  if (input.via !== undefined && input.via !== null) {
    const viaReason = validateLineageVia(input.via)
    if (viaReason !== null) {
      return { code: 'INVALID_REQUEST', message: `边 via 路点非法：${viaReason}` }
    }
  }
  // [F-VISFB-66] 端点锚校验（null=清除意图仅属载荷层，validate 层不吃 null）
  for (const [key, anchor] of [
    ['fromAnchor', input.fromAnchor],
    ['toAnchor', input.toAnchor]
  ] as const) {
    if (anchor === undefined || anchor === null) continue
    const check = validateLineageAnchor(anchor)
    if (!check.ok) {
      return {
        code: 'INVALID_REQUEST',
        message: `边锚点非法（${key} ${check.reason} 域违例）——side 须为 top/bottom/left/right，slot 须为 0/1/2`
      }
    }
  }
  const { nodes, edges } = graph()
  const fromNode = nodes.find((n) => n.id === input.fromNode)
  if (fromNode === undefined) {
    return { code: 'CONFLICT', message: `来源节点不存在：${input.fromNode}` }
  }
  const toNode = nodes.find((n) => n.id === input.toNode)
  if (toNode === undefined) {
    return { code: 'CONFLICT', message: `目标节点不存在：${input.toNode}` }
  }
  // [F-FOLDER-01 INV-90] 跨图边守卫（边属图=端点所在图派生——服务层护栏）
  if (fromNode.folderId !== toNode.folderId) {
    return {
      code: 'CONFLICT',
      message: `跨图边拒绝（ERR_CROSS_GRAPH_EDGE）：两端节点分属不同文件夹的脉络图（${fromNode.folderId} / ${toNode.folderId}）——请先移动文献到同一文件夹`
    }
  }
  // 重复边收口（同端点对唯一——UNIQUE(from,to) 应用层前置）
  const dup = edges.find(
    (e) => e.id !== input.id && e.fromNode === input.fromNode && e.toNode === input.toNode
  )
  if (dup !== undefined) {
    return {
      code: 'CONFLICT',
      message: `该逻辑线已存在（${input.fromNode}→${input.toNode}），重复边被拒绝`
    }
  }
  // 成环守卫：加 from→to 后成环 ⇔ 现图中 to 可达 from（排除自身边旧端点）
  if (reachable(edges, input.toNode, input.fromNode, input.id)) {
    return {
      code: 'CONFLICT',
      message: '成环拒绝：该边将使脉络图出现环路（连线不得成环）'
    }
  }
  return null
}

export interface FinalGraphGuardInput {
  /** 最终 touched 图（内存模拟——全部 delta 目标态已应用） */
  nodes: LineageNode[]
  edges: LineageEdge[]
  /** 目标态非 null 的受影响实体（恢复/反向更新集） */
  touchedNodes: readonly LineageNode[]
  touchedEdges: readonly LineageEdge[]
}

const graphInvalid = (message: string): GraphGuardIssue => ({ code: 'CONFLICT', message })

/**
 * history-unit 最终图结构守卫（§7.3 步骤 4）。判定序：一文献一节点→悬空边→
 * touched 边单边守卫→全图无环。
 */
export function finalGraphGuardIssue(input: FinalGraphGuardInput): GraphGuardIssue | null {
  for (const n of input.touchedNodes) {
    if (n.paperId !== null && input.nodes.some((o) => o.id !== n.id && o.paperId === n.paperId)) {
      return graphInvalid(`该文献已有节点：${n.paperId}`)
    }
  }
  const nodeIds = new Set(input.nodes.map((n) => n.id))
  const dangling = input.edges.find((e) => !nodeIds.has(e.fromNode) || !nodeIds.has(e.toNode))
  if (dangling !== undefined) return graphInvalid(`存在悬空边（端点节点缺失）：${dangling.id}`)
  for (const e of input.touchedEdges) {
    const issue = edgeGuardIssue(e, () => ({ nodes: input.nodes, edges: input.edges }))
    if (issue !== null) return issue
  }
  if (hasCycle(input.nodes, input.edges)) {
    return graphInvalid('成环拒绝：恢复后的脉络图出现环路（连线不得成环）')
  }
  return null
}
