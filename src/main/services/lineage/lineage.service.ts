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
 *   paperId 拒；T3-P5 month/slot 归一=write-guards 拆件单源）/upsertEdge
 *   （树守卫运行时二道防线——INV-27 守卫宿主，T3-P5 修订版**四 kind**：
 *   自环拒/节点不存在拒/重复边中文收口（UNIQUE 前置，同端点对跨 kind
 *   互斥）/多父拒（tree+inferred 同守——单父集合双向；ref 豁免、manual
 *   豁免且不限条数=用户裁决）/成环拒（全边可达图含 inferred/manual
 *   父链）/sub 引用完整性（存在性+跨基型拒——T3-P5））/removeNode/
 *   removeEdge（透传）/upsertLineTypes（恒四组+id 全图唯一+被引用 sub
 *   不得消失不得变更基型组——图级整体替换，T3-P5）。
 * - graph：全图单读+含金量 join（F-LG14）+nodes=lineageOrder 序（INV-75
 *   读面唯一保证）+lineTypes 恒四组（T3-P5；库空=空数组，合法态非错误）。
 *
 * 分层：service 持 repo+paperExists+withTransaction（注入保可测），
 * 禁 service 直写 SQL；树守卫集中本文件（LG-03 接线不另写守卫——门一 W1 处置）。
 * 测试：tests/unit/services/lineage-import.test.ts（导入+守卫基线）+
 * lineage-v2-service.test.ts（T3-P5 四 kind/sub 守卫/slot 归一/graph 读面）+
 * lineage-manual-edges.test.ts（manual 面）[受锁新增]（always-active）。
 */
import { readFile } from 'node:fs/promises'
import { MAIN_GRAPH_ID, isSurveyTitle, lineageDraftSchema, lineageOrder } from '../../../shared/models/lineage'
import type {
  LineTypeGroup,
  LineageEdge,
  LineageEdgeUpsert,
  LineageNode,
  LineageNodeUpsert
} from '../../../shared/models/lineage'
import { venueToTier, type VenueTier } from '../../../shared/venue-tier'
import type { LineageRepo } from '../../db/repos/lineage.repo'
import { DomainError } from '../shared/domain-error'
import { checkLineTypeGroups, normalizeMonthSlot } from './lineage.write-guards'

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
  /** [T3-P5] 图级线型配置整体替换（单通道原子写）：恒四组校验+subs.id 全图
   *  唯一+被现存边引用的 sub 不得消失（整批拒绝列冲突 id）；成功回显恒四组
   *  （base 枚举序——与 graph 读面同序） */
  upsertLineTypes(groups: LineageGroupInput): LineTypeGroup[]
  /** 全图单读+含金量 join（F-LG14：paperMetrics 键=paperId，主题节点不入表；
   *  批量单语句禁 N+1——主控裁决）。[T3-P5] nodes=lineageOrder 序（INV-75
   *  读面唯一保证——消费方不得重排）+lineTypes 恒四组（meta KV 读出）。
   *  [F-FOLDER-01] folderId 提供=只取该图节点/边子图（W4 改写面——图切换器
   *  数据源；边=双端点均入图才保留）+pubNos（库级派生编号 INV-92——图内
   *  节点号与库号同源单一真相源；主题节点无键） */
  graph(folderId?: string): {
    nodes: LineageNode[]
    edges: LineageEdge[]
    paperMetrics: Record<string, LineagePaperMetrics>
    lineTypes: LineTypeGroup[]
    pubNos: Record<string, number>
  }
}

/** upsertLineTypes 入参（恒四组强校验 schema 派生——models/lineage 单源） */
export type LineageGroupInput = readonly LineTypeGroup[]

export interface LineageServiceDeps {
  repo: Pick<
    LineageRepo,
    | 'upsertNode'
    | 'removeNode'
    | 'upsertEdge'
    | 'removeEdge'
    | 'listGraph'
    | 'clearGraph'
    | 'getLineTypes'
    | 'setLineTypes'
  >
  /** papers 表存在性查证（幽灵 paperId 拦截——装配层接 repos.papers.findById） */
  paperExists: (paperId: string) => boolean
  /** [F-FOLDER-01·回炉码 1] INV-88 统一规则判别源：文献归属纯读（无副作用；
   *  装配层接 repos.papers.folderIdOf——显式 folderId≠归属拒的前置读） */
  paperFolderOf: (paperId: string) => string | null
  /** [F-FOLDER-01·回炉码 1] INV-88 统一规则落笔：未归档→写主图（入图即归档）
   *  并返回 '__main__'；已归档→原样返回（装配层接 repos.papers.ensureFolderAssigned） */
  ensurePaperFolder: (paperId: string) => string
  /** 事务边界（repos.withTransaction 注入——清面+重灌原子性） */
  withTransaction: <T>(fn: () => T) => T
  /** papers 含金量摘要批量查证（F-LG14——装配层接 repos.papers.listMetricsByIds；
   *  可选缺省=空面（既有单测装配兼容），生产装配恒传真实现） */
  paperMetrics?: (paperIds: string[]) => Array<{
    paperId: string
    venue: string
    citedByCount: number | null
  }>
  /** [F-FOLDER-01] 文件夹存在性查证（幽灵 folderId 拦截——装配层接
   *  repos.folders.findById !== null；可选缺省=恒真（既有单测装配兼容——
   *  paperMetrics 同款先例），生产装配恒传真实现） */
  folderExists?: (folderId: string) => boolean
  /** [F-FOLDER-01] pubNo 批查（INV-92 库级派生——graph 通道 pubNos 装配；
   *  可选缺省=空面，生产装配接 repos.papers.pubNoByIds） */
  pubNos?: (paperIds: string[]) => Array<{ paperId: string; pubNo: number }>
}

/**
 * 域错误（LG-03 接线需要；shared/domain-error 基类一行继承——F-DEDUP-01 单源）：
 * code 经 toAppError 结构化透传（普通 Error 的 message 会被折叠进 detail 埋掉中文
 * reason——「reason 透传 toast」不成立）。CONFLICT=业务规则拒绝（树守卫/
 * 幽灵 paperId），消费方按码分支（丢弃动作+toast，区别于系统型失败保留重试）。
 * message 中文原文不变（LG-01 受锁测试断言子串不受影响）。
 */
class LineageDomainError extends DomainError {}

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

/**
 * [T3-P5] month/slot 归一与 lineTypes 静态校验已拆至 lineage.write-guards.ts
 * （文件 500 行上限拆件——简报二段预裁；运行时图状态相关的第三段守卫
 * 「被现存边引用的 sub 不得消失」仍在本文件 upsertLineTypes）。
 */
export function createLineageService(deps: LineageServiceDeps): LineageService {
  /** [R2——k1'-W3] upsertNode 原体（withTransaction 内执行——见 upsertNode 注） */
  function upsertNodeInner(input: LineageNodeUpsert): LineageNode {
    if (input.paperId !== null && !deps.paperExists(input.paperId)) {
      throw new LineageDomainError('CONFLICT', `文献不存在（幽灵 paperId）：${input.paperId}`)
    }
    const nodes = deps.repo.listGraph().nodes
    const existing = input.id !== undefined ? nodes.find((n) => n.id === input.id) : undefined
    // [F-FOLDER-01·回炉码 1] INV-88 统一规则（文献节点两分支全覆盖）：节点
    // folder=该文献 papers.folder_id；未归档→先写主图（入图即归档——矩阵
    // 「导入→当前文件夹」同族语义）。显式 folderId≠归属拒（回炉码 3——不
    // 隐式移动；CONFLICT 拒绝型，队列按 INV-84 丢弃）。主题节点（paperId
    // null）无文献归属面：缺省=保持现图/新建落主图+显式值存在性校验。
    let folderId: string
    if (input.paperId !== null) {
      const current = deps.paperFolderOf(input.paperId)
      const effective = current ?? MAIN_GRAPH_ID
      if (input.folderId !== undefined && input.folderId !== effective) {
        throw new LineageDomainError(
          'CONFLICT',
          `文献不在该文件夹——用移动文献操作（文献现属 ${effective}，请求落 ${input.folderId}）`
        )
      }
      if (current === null) deps.ensurePaperFolder(input.paperId)
      folderId = effective
    } else {
      folderId = input.folderId ?? existing?.folderId ?? MAIN_GRAPH_ID
      if (
        input.folderId !== undefined &&
        deps.folderExists !== undefined &&
        !deps.folderExists(folderId)
      ) {
        throw new LineageDomainError('CONFLICT', `文件夹不存在（幽灵 folderId）：${folderId}`)
      }
    }
    // T3-P5 month/slot 归一（D-I-1）——全图读一次算组内 max（单用户本地图量级）
    const { month, slot } = normalizeMonthSlot({ ...input, folderId }, nodes)
    return deps.repo.upsertNode({ ...input, folderId, month, slot })
  }

  return {
    importDraft(raw: unknown): LineageImportResult {
      const errors = validateDraft(raw, deps.paperExists)
      if (errors.length > 0) return { ok: false, errors }
      const draft = lineageDraftSchema.parse(raw) // 已验过必成功；取窄类型
      return deps.withTransaction(() => {
        deps.repo.clearGraph() // 整批替换语义（清面重灌）
        const paperToNode = new Map<string, string>()
        // T3-P5 slot 逐节点归一（clearGraph 后组内 max 只来自本循环已写节点——
        // 内存计数等价 D-I-1 新建分支，省逐节点全图重读）
        const nextSlot = new Map<string, number>()
        let nodeCount = 0
        for (const n of draft.nodes) {
          const month = n.month ?? null
          const key = `${String(n.year)}|${String(month)}`
          const slot = (nextSlot.get(key) ?? 0) + 1
          nextSlot.set(key, slot)
          const node = deps.repo.upsertNode({
            paperId: n.paper_id,
            title: n.title,
            coreIdea: n.core_idea,
            year: n.year,
            x: null, // 导入面无手工位置——自动布局（LG-02 消费 null）
            y: null,
            tags: n.tags ?? null, // F-LG14：草稿带为主（可选缺省=无标签）
            month,
            slot,
            // [F-FOLDER-01·回炉码 1] INV-88 统一规则：节点 folder=该文献归属
            // （ensurePaperFolder 逐文献解析——未归档先写主图=入图即归档）；
            // 禁写死主图（回炉禁令）
            folderId: deps.ensurePaperFolder(n.paper_id)
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
            kind: 'tree', // draft 协议=树语义（R2-LG12：ref 边仅应用内手工创建；
            // T3-P5：draft 不收 inferred/manual——写路径显式填）——sub 缺省=null
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
      // [R2——k1'-W3] ensurePaperFolder（归档写）与节点 upsert 包 withTransaction
      // 原子：裸 INSERT 抛（如坑 a 索引 UNIQUE 违例）时无「已归档未建节点」残留
      // ——与 import/moveFolder 两路事务对称（ensurePaperFolder 单源驻 papers.repo）
      return deps.withTransaction(() => upsertNodeInner(input))
    },

    removeNode(id: string): number {
      return deps.repo.removeNode(id)
    },

    upsertEdge(input: LineageEdgeUpsert): LineageEdge {
      // INV-27 运行时守卫（T3-P5 修订版——四 kind 全景：tree/inferred 同守
      // 单父+拒环（inferred=P7 编辑器/AI 域入口，枚举+守卫先行防退化）；ref
      // 豁免单父仍拒环；manual 豁免单父**不限条数**（用户裁决）仍拒环）
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
      // [F-FOLDER-01 INV-90] 跨图边守卫（边属图=端点所在图派生——零冗余零漂移
      // 面的代价=服务层护栏；ERR_CROSS_GRAPH_EDGE 以 CONFLICT 码+中文 reason
      // 承载：AppErrorCode 封闭枚举纪律（新增码需 ADR+[locked-change]）+
      // INV-84 拒绝型语义（renderer 队列按 CONFLICT 丢弃动作——重试永不成功型）
      const fromNode = graph.nodes.find((n) => n.id === input.fromNode)!
      const toNode = graph.nodes.find((n) => n.id === input.toNode)!
      if (fromNode.folderId !== toNode.folderId) {
        throw new LineageDomainError(
          'CONFLICT',
          `跨图边拒绝（ERR_CROSS_GRAPH_EDGE）：两端节点分属不同文件夹的脉络图（${fromNode.folderId} / ${toNode.folderId}）——请先移动文献到同一文件夹`
        )
      }
      // ref 限定（R2-LG12 §1）：from 必须是综述文献节点（菜单项级限定+service
      // 双守——isSurveyTitle 单源 shared/models；paperId null 主题节点同拒）。
      // manual 无 from 限定（F-LG15 守卫票面清单：豁免单父/拒环/同端点对互斥/
      // draft 不收——「仅允许人工」由 UI 入口+draft 拒收承载，非 from 属性限定）
      if (kind === 'ref') {
        if (fromNode.paperId === null || !isSurveyTitle(fromNode.title)) {
          throw new LineageDomainError('CONFLICT', '参考边只能由综述节点发出')
        }
      }
      // 重复边收口（同端点对不区分 kind——tree/ref/manual 三方互斥，预裁 2：
      // 同端点对只允许一种 kind，语义清晰防重线；kind 相异时 reason 附互斥说明）
      const dup = graph.edges.find(
        (e) =>
          e.id !== input.id && e.fromNode === input.fromNode && e.toNode === input.toNode
      )
      if (dup !== undefined) {
        throw new LineageDomainError(
          'CONFLICT',
          `该逻辑线已存在（${input.fromNode}→${input.toNode}），重复边被拒绝` +
            (dup.kind !== kind ? `（${dup.kind} 与 ${kind} 同端点对互斥）` : '')
        )
      }
      // 多父守卫（tree 原语义；T3-P5 INV-27 修订：inferred 同 tree——单父集合
      // ={tree,inferred} 双向：to 已有 tree 父或 inferred 父均拒；ref/manual
      // 豁免：to 可已有 tree/inferred 父或多条 ref、manual 入边（manual 不限
      // 条数=用户裁决 F-LG15）；更新场景（input.id 已存在）：改端点=改父，按
      // 新端点重估守卫
      if (kind === 'tree' || kind === 'inferred') {
        const existingParent = graph.edges.find(
          (e) =>
            e.toNode === input.toNode &&
            e.id !== input.id &&
            (e.kind === 'tree' || e.kind === 'inferred')
        )
        if (existingParent !== undefined) {
          throw new LineageDomainError(
            'CONFLICT',
            `多父边拒绝：节点 ${input.toNode} 已有父节点 ${existingParent.fromNode}（树至多一父）`
          )
        }
      }
      // 加 from→to 后成环 ⇔ 现图中 to 可达 from（排除自身边的旧端点）；环检测
      // 图=全部边含 ref/manual（综述/人工父链与 tree 混合成环真实可达——F-LG15
      // 「tree 父链+manual 父链双向」由全边可达图天然承载）
      if (reachable(graph.edges, input.toNode, input.fromNode, input.id)) {
        throw new LineageDomainError(
          'CONFLICT',
          '成环拒绝：该边将使脉络图出现环路（树边、参考边与人工边均不得成环）'
        )
      }
      // 成环守卫（全边可达图）之后接 T3-P5 sub 引用完整性守卫（样式层写面）：
      // sub≠null ⇒ 存在于 lineTypes 且 group.base==edge.kind（跨基型拒绝）；
      // sub=null/缺省=基础型默认样式不查证
      if (input.sub !== undefined && input.sub !== null) {
        const groups = deps.repo.getLineTypes()
        const owner = groups.flatMap((g) =>
          g.subs.filter((s) => s.id === input.sub).map(() => g.base)
        )[0]
        if (owner === undefined) {
          throw new LineageDomainError(
            'CONFLICT',
            `子线型不存在：${input.sub}（先在线型配置中定义再引用）`
          )
        }
        if (owner !== kind) {
          throw new LineageDomainError(
            'CONFLICT',
            `子线型跨基型拒绝：${input.sub} 属 ${owner} 组，与 ${kind} 边不符`
          )
        }
      }
      return deps.repo.upsertEdge({ ...input, kind, sub: input.sub ?? null })
    },

    removeEdge(id: string): number {
      return deps.repo.removeEdge(id)
    },

    upsertLineTypes(groups: LineageGroupInput): LineTypeGroup[] {
      // ①恒四组（D-I-4）+②subs.id 全图唯一——静态校验拆件单源
      // （lineage.write-guards；schema 面同规则在 lineTypeGroupsSchema）
      const check = checkLineTypeGroups(groups)
      if (!check.ok) {
        throw new LineageDomainError('CONFLICT', check.reason)
      }
      // ③被现存边引用的 sub 不得消失（整批拒绝列冲突 id——弃级联置 null=
      // 静默丢样式）**且不得变更基型组**（门一 W-3/门二 P2-2：跨组移动会击穿
      // upsertEdge 写面建立的 group.base==edge.kind 不变量，导出 line_types
      // 与 edges.line_type 联接语义破裂——同列冲突 id 整批拒）；引用面=现存
      // 边 sub 非 null 全集；动态图状态守卫留宿主本件
      const baseOf = new Map(groups.flatMap((g) => g.subs.map((s) => [s.id, g.base] as const)))
      const conflictIds: string[] = []
      const movedIds: string[] = []
      for (const e of deps.repo.listGraph().edges) {
        if (e.sub === null || e.sub === undefined) continue
        const newBase = baseOf.get(e.sub)
        if (newBase === undefined) {
          conflictIds.push(e.sub) // 消失
        } else if (newBase !== e.kind) {
          movedIds.push(e.sub) // 跨组移动（基型变更）
        }
      }
      if (conflictIds.length > 0) {
        throw new LineageDomainError(
          'CONFLICT',
          `子线型被现存边引用不得删除：${[...new Set(conflictIds)].join('、')}`
        )
      }
      if (movedIds.length > 0) {
        throw new LineageDomainError(
          'CONFLICT',
          `子线型被现存边引用不得变更基型组：${[...new Set(movedIds)].join('、')}`
        )
      }
      deps.repo.setLineTypes([...groups])
      return deps.repo.getLineTypes() // 校验后回显（恒四组 base 枚举序——与 graph 同序）
    },

    graph(folderId?: string): {
      nodes: LineageNode[]
      edges: LineageEdge[]
      paperMetrics: Record<string, LineagePaperMetrics>
      lineTypes: LineTypeGroup[]
      pubNos: Record<string, number>
    } {
      const g = deps.repo.listGraph()
      // [F-FOLDER-01] 子图过滤（W4）：folderId 提供=节点按图归属过滤+边=双端点
      // 均入图才保留（跨图边本不该存在——INV-90 服务层护栏；过滤语义=该图子图）
      const scopedNodes =
        folderId === undefined ? g.nodes : g.nodes.filter((n) => n.folderId === folderId)
      const scopedNodeIds = new Set(scopedNodes.map((n) => n.id))
      const scopedEdges =
        folderId === undefined
          ? g.edges
          : g.edges.filter((e) => scopedNodeIds.has(e.fromNode) && scopedNodeIds.has(e.toNode))
      // F-LG14 含金量 join：文献节点 paperId 一次收集→批量单语句查证（禁 N+1
      // 逐节点调用——主控裁决）→venueTier 映射（venueToTier 单源）收口在此。
      // 主题节点（paperId null）无含金量面不入表。
      const paperIds = scopedNodes.flatMap((n) => (n.paperId !== null ? [n.paperId] : []))
      const rows = deps.paperMetrics?.(paperIds) ?? []
      const paperMetrics: Record<string, LineagePaperMetrics> = {}
      for (const r of rows) {
        paperMetrics[r.paperId] = {
          citedByCount: r.citedByCount,
          venueTier: venueToTier(r.venue)
        }
      }
      // [F-FOLDER-01] pubNos 装配（INV-92 库级窗口单源=pubNoByIds——与 LIST_SQL
      // 同序同值；主题节点无键）
      const pubNoRows = deps.pubNos?.(paperIds) ?? []
      const pubNos: Record<string, number> = {}
      for (const r of pubNoRows) {
        pubNos[r.paperId] = r.pubNo
      }
      // T3-P5 INV-75：nodes=排序契约序（唯一纯函数 lineageOrder 单源——消费方
      // 不得重排）；lineTypes=恒四组（repo 补齐+枚举序）
      return {
        nodes: lineageOrder(scopedNodes),
        edges: scopedEdges,
        paperMetrics,
        lineTypes: deps.repo.getLineTypes(),
        pubNos
      }
    }
  }
}
