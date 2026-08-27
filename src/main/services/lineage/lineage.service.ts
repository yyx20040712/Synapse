/**
 * lineage.service —— 脉络图写面与草稿导入器（LG-01 交付面）。
 *
 * 职责（票面行为层）：
 * - validateDraft：导入校验纯函数（单独导出可测）——三段：①zod 行级
 *   （中文 reason 含字段路径，schema 单源=shared/models/lineage.ts）
 *   ②幽灵 paperId（papers 表存在性注入）③树约束（多父/环/自环+悬空边/
 *   重复节点/重复边——图结构级）。zod 不过即返回（结构未知，后续段无意义）。
 * - importDraft：全有或全无——errors 非空→库不动原样返回；全过→
 *   withTransaction 包裹「clearGraph 清面+整套重灌」（整批替换语义；
 *   事务=清面成功但重插失败时整体回滚，无半写残留）。
 * - importFromFile：读文件+JSON.parse（损坏→动作型中文上抛，消费方
 *   toast INV-02——非校验 errors 面）→importDraft。
 * - 四写方法（本单全建全测，IPC 注册归 LG-03）：upsertNode（幽灵
 *   paperId 拒）/upsertEdge（树守卫运行时二道防线——INV-27 守卫宿主：
 *   自环拒/节点不存在拒/重复边中文收口（UNIQUE 前置）/多父拒/成环拒）/
 *   removeNode/removeEdge（透传）。
 * - graph：listGraph 全图单读透传（库空=空数组，合法态非错误）。
 *
 * 分层：service 持 repo+paperExists+withTransaction（注入保可测），
 * 禁 service 直写 SQL；树守卫集中本文件（LG-03 接线不另写守卫——门一 W1 处置）。
 * 测试：tests/unit/services/lineage-import.test.ts [受锁新增]（always-active）。
 */
import { readFile } from 'node:fs/promises'
import { lineageDraftSchema } from '../../../shared/models/lineage'
import type {
  LineageEdge,
  LineageEdgeUpsert,
  LineageNode,
  LineageNodeUpsert
} from '../../../shared/models/lineage'
import type { LineageRepo } from '../../db/repos/lineage.repo'

/** 行级校验错误（path=字段路径如 nodes.0.title / edges.1.to_paper_id） */
export interface DraftIssue {
  path: string
  reason: string
}

/** 导入 Result：判别联合（全有或全无——两态互斥） */
export type LineageImportResult =
  | { ok: true; nodeCount: number; edgeCount: number }
  | { ok: false; errors: DraftIssue[] }

export interface LineageService {
  importDraft(raw: unknown): LineageImportResult
  importFromFile(path: string): Promise<LineageImportResult>
  upsertNode(input: LineageNodeUpsert): LineageNode
  removeNode(id: string): number
  upsertEdge(input: LineageEdgeUpsert): LineageEdge
  removeEdge(id: string): number
  graph(): { nodes: LineageNode[]; edges: LineageEdge[] }
}

export interface LineageServiceDeps {
  repo: Pick<
    LineageRepo,
    'upsertNode' | 'removeNode' | 'upsertEdge' | 'removeEdge' | 'listGraph' | 'clearGraph'
  >
  /** papers 表存在性查证（幽灵 paperId 拦截——装配层接 repos.papers.findById） */
  paperExists: (paperId: string) => boolean
  /** 事务边界（repos.withTransaction 注入——清面+重灌原子性） */
  withTransaction: <T>(fn: () => T) => T
}

/**
 * 草稿三段校验（纯函数：同输入同输出）。
 * 段序：zod 形态 → 幽灵/重复节点 → 树结构（悬空/自环/重复边/多父/环）。
 * 全过返回 []；任一失败返回行级 errors 清单（不抛异常）。
 */
export function validateDraft(
  raw: unknown,
  paperExists: (paperId: string) => boolean
): DraftIssue[] {
  const errors: DraftIssue[] = []
  const parsed = lineageDraftSchema.safeParse(raw)
  if (!parsed.success) {
    for (const iss of parsed.error.issues) {
      errors.push({ path: iss.path.join('.'), reason: iss.message })
    }
    return errors // 结构未知，后续段无意义
  }
  const { nodes, edges } = parsed.data

  // ②幽灵 paperId + 重复节点（同篇两次入草稿会使 paper→node 映射歧义）
  const seenPapers = new Set<string>()
  nodes.forEach((n, i) => {
    if (seenPapers.has(n.paper_id)) {
      errors.push({
        path: `nodes.${i}.paper_id`,
        reason: `重复节点：文献 ${n.paper_id} 在草稿中出现多次`
      })
      return
    }
    seenPapers.add(n.paper_id)
    if (!paperExists(n.paper_id)) {
      errors.push({
        path: `nodes.${i}.paper_id`,
        reason: `文献不存在（幽灵 paperId）：${n.paper_id}`
      })
    }
  })

  // ③树结构：悬空边/自环/重复边/多父（边方向=from 继承来源（父）→to 继承者（子））
  const parentOf = new Map<string, string[]>() // to_paper_id -> from_paper_id[]
  const adjacency = new Map<string, string[]>() // from_paper_id -> to_paper_id[]（环检测用）
  const seenEdges = new Set<string>()
  edges.forEach((e, i) => {
    const p = `edges.${i}`
    if (!seenPapers.has(e.from_paper_id)) {
      errors.push({
        path: `${p}.from_paper_id`,
        reason: `边引用的文献不在节点清单中：${e.from_paper_id}`
      })
      return
    }
    if (!seenPapers.has(e.to_paper_id)) {
      errors.push({
        path: `${p}.to_paper_id`,
        reason: `边引用的文献不在节点清单中：${e.to_paper_id}`
      })
      return
    }
    if (e.from_paper_id === e.to_paper_id) {
      errors.push({ path: p, reason: '自环边不允许（from 与 to 为同一文献）' })
      return
    }
    const key = `${e.from_paper_id}->${e.to_paper_id}`
    if (seenEdges.has(key)) {
      errors.push({ path: p, reason: `重复边：${key} 在草稿中出现多次` })
      return
    }
    seenEdges.add(key)
    const froms = [...(parentOf.get(e.to_paper_id) ?? []), e.from_paper_id]
    parentOf.set(e.to_paper_id, froms)
    adjacency.set(e.from_paper_id, [...(adjacency.get(e.from_paper_id) ?? []), e.to_paper_id])
    if (froms.length > 1) {
      errors.push({
        path: `${p}.to_paper_id`,
        reason: `多父边：文献 ${e.to_paper_id} 已有父节点 ${froms[0]}（树至多一父）`
      })
    }
  })

  // 环检测：DFS 沿 from→to 方向找回边（单链 A→B→C→A 不经多父面，须独立检出）
  const WHITE = 0
  const GRAY = 1
  const BLACK = 2
  const color = new Map<string, number>()
  for (const n of nodes) color.set(n.paper_id, WHITE)
  const dfs = (u: string): boolean => {
    color.set(u, GRAY)
    for (const v of adjacency.get(u) ?? []) {
      const c = color.get(v)
      if (c === GRAY) return true
      if (c === WHITE && dfs(v)) return true
    }
    color.set(u, BLACK)
    return false
  }
  for (const n of nodes) {
    if (color.get(n.paper_id) === WHITE && dfs(n.paper_id)) {
      errors.push({
        path: 'edges',
        reason: `草稿边构成环路（涉及文献 ${n.paper_id}）——脉络图 v1 为树，不允许环`
      })
      break
    }
  }
  return errors
}

/** 图上沿 from→to 方向是否可从 start 到达 target（环守卫用） */
function reachable(
  edges: LineageEdge[],
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

export function createLineageService(deps: LineageServiceDeps): LineageService {
  return {
    importDraft(raw: unknown): LineageImportResult {
      const errors = validateDraft(raw, deps.paperExists)
      if (errors.length > 0) return { ok: false, errors }
      const draft = lineageDraftSchema.parse(raw) // 已验过必成功；取窄类型
      return deps.withTransaction(() => {
        deps.repo.clearGraph() // 整批替换语义（清面重灌）
        const paperToNode = new Map<string, string>()
        let nodeCount = 0
        for (const n of draft.nodes) {
          const node = deps.repo.upsertNode({
            paperId: n.paper_id,
            title: n.title,
            coreIdea: n.core_idea,
            year: n.year,
            x: null, // 导入面无手工位置——自动布局（LG-02 消费 null）
            y: null
          })
          paperToNode.set(n.paper_id, node.id)
          nodeCount++
        }
        let edgeCount = 0
        for (const e of draft.edges) {
          deps.repo.upsertEdge({
            fromNode: paperToNode.get(e.from_paper_id)!,
            toNode: paperToNode.get(e.to_paper_id)!,
            label: e.label
          })
          edgeCount++
        }
        return { ok: true, nodeCount, edgeCount }
      })
    },

    async importFromFile(path: string): Promise<LineageImportResult> {
      let text: string
      try {
        text = await readFile(path, 'utf8')
      } catch (e) {
        throw new Error(
          `读取草稿文件失败：${path}（${e instanceof Error ? e.message : String(e)}）`
        )
      }
      let raw: unknown
      try {
        raw = JSON.parse(text)
      } catch (e) {
        throw new Error(
          `草稿 JSON 损坏：${path}（${e instanceof Error ? e.message : String(e)}）`
        )
      }
      return this.importDraft(raw)
    },

    upsertNode(input: LineageNodeUpsert): LineageNode {
      if (input.paperId !== null && !deps.paperExists(input.paperId)) {
        throw new Error(`文献不存在（幽灵 paperId）：${input.paperId}`)
      }
      return deps.repo.upsertNode(input)
    },

    removeNode(id: string): number {
      return deps.repo.removeNode(id)
    },

    upsertEdge(input: LineageEdgeUpsert): LineageEdge {
      // INV-27 运行时守卫（与导入校验同源树约束——导入外的增量编辑入口）
      if (input.fromNode === input.toNode) {
        throw new Error('自环边不允许（from 与 to 为同一节点）')
      }
      const graph = deps.repo.listGraph()
      const nodeIds = new Set(graph.nodes.map((n) => n.id))
      if (!nodeIds.has(input.fromNode)) {
        throw new Error(`来源节点不存在：${input.fromNode}`)
      }
      if (!nodeIds.has(input.toNode)) {
        throw new Error(`目标节点不存在：${input.toNode}`)
      }
      const dup = graph.edges.find(
        (e) =>
          e.id !== input.id && e.fromNode === input.fromNode && e.toNode === input.toNode
      )
      if (dup !== undefined) {
        throw new Error(`该逻辑线已存在（${input.fromNode}→${input.toNode}），重复边被拒绝`)
      }
      // 更新场景（input.id 已存在）：改端点=改父，按新端点重估守卫
      const existingParent = graph.edges.find((e) => e.toNode === input.toNode && e.id !== input.id)
      if (existingParent !== undefined) {
        throw new Error(
          `多父边拒绝：节点 ${input.toNode} 已有父节点 ${existingParent.fromNode}（树至多一父）`
        )
      }
      // 加 from→to 后成环 ⇔ 现图中 to 可达 from（排除自身边的旧端点）
      if (reachable(graph.edges, input.toNode, input.fromNode, input.id)) {
        throw new Error('成环拒绝：该边将使脉络图出现环路（v1 为树）')
      }
      return deps.repo.upsertEdge(input)
    },

    removeEdge(id: string): number {
      return deps.repo.removeEdge(id)
    },

    graph(): { nodes: LineageNode[]; edges: LineageEdge[] } {
      return deps.repo.listGraph()
    }
  }
}
