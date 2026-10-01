/**
 * lineage.service —— 脉络图写面（LG-01 交付面）。
 *
 * [F-BAKRET-01] 草稿导入链（草稿三段校验纯函数+整批替换导入+文件读入三面）
 * 已退役删除（用户裁决 2026-09-30：老版草稿导入=废弃设计，备份需求归未来
 * 服务端多实体导出——ADR-0022）。保留面：四写方法+graph 读面+树守卫，
 * 零语义变化。
 *
 * 职责（票面行为层）：
 * - 四写方法（IPC 注册归 LG-03）：upsertNode（幽灵
 *   paperId 拒；T3-P5 month/slot 归一=write-guards 拆件单源）/upsertEdge
 *   （树守卫运行时防线——INV-27 守卫宿主，T3-P5 修订版**四 kind**：
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
 * 测试：tests/unit/services/（repo+守卫基线件）+
 * lineage-v2-service.test.ts（T3-P5 四 kind/sub 守卫/slot 归一/graph 读面）+
 * lineage-manual-edges.test.ts（manual 面）[受锁新增]（always-active）。
 */
import { MAIN_GRAPH_ID, isSurveyTitle, lineageOrder, validateLineageVia } from '../../../shared/models/lineage'
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

/** F-LG14 含金量摘要（graph 通道逐文献节点载荷；venueTier 映射单源=
 *  shared/venue-tier.ts venueToTier——受锁常量零改，未映射=null=「未定」；
 *  citedByCount null=从未抓到=「引 —」，0=已抓到且为 0（值非缺）） */
export interface LineagePaperMetrics {
  citedByCount: number | null
  venueTier: VenueTier | null
}

export interface LineageService {
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
  /** 事务边界（repos.withTransaction 注入——upsertNode 归档写+节点落库原子性） */
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
    // null）无文献归属面：新建=input.folderId 落当前图（显式值存在性校验）
    // +缺省落主图；[F-LGCLN-01] 更新场景**禁搬图**——existing 在场恒现图
    // （显式 folderId 被忽略，优先级反转：existing ?? input ?? 主图）。显式
    // 跨图移动语义已随交互不可构成面退役（用户裁决 2026-09-30：选图时对
    // 论文卡片已失焦=冗余逻辑）；节点跨图唯一合法路径=papers.moveFolder
    // （INV-88 主句——文献随迁触发，见 library.service moveFolder）。
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
      // [F-LGCLN-01] existing 优先（在场恒现图=禁搬图）；新建=input.folderId
      // ?? 主图（IPC folderId 唯一合法语义=主题节点新建落图值）。幽灵
      // folderExists 校验保留（新建落图值存在性——本件 folderExists 桩侧）
      folderId = existing?.folderId ?? input.folderId ?? MAIN_GRAPH_ID
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
    upsertNode(input: LineageNodeUpsert): LineageNode {
      // [R2——k1'-W3] ensurePaperFolder（归档写）与节点 upsert 包 withTransaction
      // 原子：裸 INSERT 抛（如坑 a 索引 UNIQUE 违例）时无「已归档未建节点」残留
      // ——与 moveFolder 事务对称（ensurePaperFolder 单源驻 papers.repo）
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
      // [F-LINEAGE-02 ①a] via 不变量 ①②③序列化校验（design-final §2.1——
      // validateLineageVia 单源驻 shared；违者 INVALID_REQUEST 请求面拒绝
      // （语义=载荷非法非业务规则）。store 面按系统型保留重试（flush 仅
      // CONFLICT 丢弃——INVALID_REQUEST 走 error 队首保留；d1-W5 勘正：
      // 理论上该载荷重试永不成功，F-LGRAPH-01 ②编辑器接入时兑现校验前置
      // 再评估是否扩丢弃码集——不扩面留档）
      if (input.via !== undefined) {
        const viaReason = validateLineageVia(input.via)
        if (viaReason !== null) {
          throw new LineageDomainError('INVALID_REQUEST', `边 via 路点非法：${viaReason}`)
        }
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
      // 「仅允许人工」由 UI 入口承载（[F-BAKRET-01] 草稿导入链退役），非 from 属性限定）
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
      return deps.repo.upsertEdge({ ...input, kind, sub: input.sub ?? null, via: input.via })
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
