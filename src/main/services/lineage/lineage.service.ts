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
import type { AppErrorCode } from '../../../shared/app-error'
import { isSurveyTitle, lineageDraftSchema } from '../../../shared/models/lineage'
import type {
  LineageEdge,
  LineageEdgeUpsert,
  LineageNode,
  LineageNodeUpsert
} from '../../../shared/models/lineage'
import { venueToTier, type VenueTier } from '../../../shared/venue-tier'
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

/** F-LG14 含金量摘要（graph 通道逐文献节点载荷；venueTier 映射单源=
 *  shared/venue-tier.ts venueToTier——受锁常量零改，未映射=null=「未定」；
 *  citedByCount null=从未抓到=「引 —」，0=已抓到且为 0（值非缺）） */
export interface LineagePaperMetrics {
  citedByCount: number | null
  venueTier: VenueTier | null
}

export interface LineageService {
  importDraft(raw: unknown): LineageImportResult
  importFromFile(path: string): Promise<LineageImportResult>
  upsertNode(input: LineageNodeUpsert): LineageNode
  removeNode(id: string): number
  upsertEdge(input: LineageEdgeUpsert): LineageEdge
  removeEdge(id: string): number
  /** 全图单读+含金量 join（F-LG14：paperMetrics 键=paperId，主题节点不入表；
   *  批量单语句禁 N+1——主控裁决） */
  graph(): { nodes: LineageNode[]; edges: LineageEdge[]; paperMetrics: Record<string, LineagePaperMetrics> }
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
  /** papers 含金量摘要批量查证（F-LG14——装配层接 repos.papers.listMetricsByIds；
   *  可选缺省=空面（既有单测装配兼容），生产装配恒传真实现） */
  paperMetrics?: (paperIds: string[]) => Array<{
    paperId: string
    venue: string
    citedByCount: number | null
  }>
}

/**
 * 域错误（reader.service ReaderDomainError 同型，LG-03 接线需要）：code 经
 * toAppError 结构化透传（普通 Error 的 message 会被折叠进 detail 埋掉中文
 * reason——「reason 透传 toast」不成立）。CONFLICT=业务规则拒绝（树守卫/
 * 幽灵 paperId），消费方按码分支（丢弃动作+toast，区别于系统型失败保留重试）。
 * message 中文原文不变（LG-01 受锁测试断言子串不受影响）。
 */
class LineageDomainError extends Error {
  readonly code: AppErrorCode

  constructor(code: AppErrorCode, message: string) {
    super(message)
    this.name = 'LineageDomainError'
    this.code = code
  }
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
            y: null,
            tags: n.tags ?? null // F-LG14：草稿带为主（可选缺省=无标签）
          })
          paperToNode.set(n.paper_id, node.id)
          nodeCount++
        }
        let edgeCount = 0
        for (const e of draft.edges) {
          deps.repo.upsertEdge({
            fromNode: paperToNode.get(e.from_paper_id)!,
            toNode: paperToNode.get(e.to_paper_id)!,
            label: e.label,
            kind: 'tree' // draft 协议=树语义（R2-LG12：ref 边仅应用内手工创建）——写路径显式填
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
        throw new LineageDomainError('CONFLICT', `文献不存在（幽灵 paperId）：${input.paperId}`)
      }
      return deps.repo.upsertNode(input)
    },

    removeNode(id: string): number {
      return deps.repo.removeNode(id)
    },

    upsertEdge(input: LineageEdgeUpsert): LineageEdge {
      // INV-27 运行时守卫（修订版——R2-LG12：tree 原语义；ref 豁免单父仍拒环）
      const kind = input.kind ?? 'tree' // 写路径显式缺省（预裁 5——不赖 DB DEFAULT）
      if (input.fromNode === input.toNode) {
        throw new LineageDomainError('CONFLICT', '自环边不允许（from 与 to 为同一节点）')
      }
      const graph = deps.repo.listGraph()
      const nodeIds = new Set(graph.nodes.map((n) => n.id))
      if (!nodeIds.has(input.fromNode)) {
        throw new LineageDomainError('CONFLICT', `来源节点不存在：${input.fromNode}`)
      }
      if (!nodeIds.has(input.toNode)) {
        throw new LineageDomainError('CONFLICT', `目标节点不存在：${input.toNode}`)
      }
      // ref 限定（R2-LG12 §1）：from 必须是综述文献节点（菜单项级限定+service
      // 双守——isSurveyTitle 单源 shared/models；paperId null 主题节点同拒）
      if (kind === 'ref') {
        const from = graph.nodes.find((n) => n.id === input.fromNode)!
        if (from.paperId === null || !isSurveyTitle(from.title)) {
          throw new LineageDomainError('CONFLICT', '参考边只能由综述节点发出')
        }
      }
      // 重复边收口（同端点对不区分 kind——tree/ref 互斥，预裁 2：同端点对只
      // 允许一种 kind，语义清晰防重线；kind 相异时 reason 附互斥说明）
      const dup = graph.edges.find(
        (e) =>
          e.id !== input.id && e.fromNode === input.fromNode && e.toNode === input.toNode
      )
      if (dup !== undefined) {
        throw new LineageDomainError(
          'CONFLICT',
          `该逻辑线已存在（${input.fromNode}→${input.toNode}），重复边被拒绝` +
            (dup.kind !== kind ? '（参考边与树边同端点对互斥）' : '')
        )
      }
      // 多父守卫（仅 tree 边——ref 豁免：to 可已有 tree 父/多条 ref 入边；
      // ref 入边不算 tree 父）；更新场景（input.id 已存在）：改端点=改父，
      // 按新端点重估守卫
      if (kind === 'tree') {
        const existingParent = graph.edges.find(
          (e) => e.toNode === input.toNode && e.id !== input.id && e.kind === 'tree'
        )
        if (existingParent !== undefined) {
          throw new LineageDomainError(
            'CONFLICT',
            `多父边拒绝：节点 ${input.toNode} 已有父节点 ${existingParent.fromNode}（树至多一父）`
          )
        }
      }
      // 加 from→to 后成环 ⇔ 现图中 to 可达 from（排除自身边的旧端点）；环检测
      // 图=全部边含 ref（综述自己也可能在某树内——tree+ref 混合环真实可达）
      if (reachable(graph.edges, input.toNode, input.fromNode, input.id)) {
        throw new LineageDomainError(
          'CONFLICT',
          '成环拒绝：该边将使脉络图出现环路（树边与参考边均不得成环）'
        )
      }
      return deps.repo.upsertEdge({ ...input, kind })
    },

    removeEdge(id: string): number {
      return deps.repo.removeEdge(id)
    },

    graph(): { nodes: LineageNode[]; edges: LineageEdge[]; paperMetrics: Record<string, LineagePaperMetrics> } {
      const g = deps.repo.listGraph()
      // F-LG14 含金量 join：文献节点 paperId 一次收集→批量单语句查证（禁 N+1
      // 逐节点调用——主控裁决）→venueTier 映射（venueToTier 单源）收口在此。
      // 主题节点（paperId null）无含金量面不入表。
      const paperIds = g.nodes.flatMap((n) => (n.paperId !== null ? [n.paperId] : []))
      const rows = deps.paperMetrics?.(paperIds) ?? []
      const paperMetrics: Record<string, LineagePaperMetrics> = {}
      for (const r of rows) {
        paperMetrics[r.paperId] = {
          citedByCount: r.citedByCount,
          venueTier: venueToTier(r.venue)
        }
      }
      return { nodes: g.nodes, edges: g.edges, paperMetrics }
    }
  }
}
