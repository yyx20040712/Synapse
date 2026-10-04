/**
 * lineage.service —— 脉络图写面（LG-01 交付面）。
 *
 * [F-BAKRET-01] 草稿导入链（草稿三段校验纯函数+整批替换导入+文件读入三面）
 * 已退役删除（用户裁决 2026-09-30：老版草稿导入=废弃设计，备份需求归未来
 * 服务端多实体导出——ADR-0022）。保留面：四写方法+graph 读面+树守卫，
 * 零语义变化。
 *
 * [F-ALIGN-01 D1/D2 2026-10-04] upsertNode→patchNode（通道拆分）：
 * - 新建分支（文献节点 INV-88 统一规则/无归属行 ensurePaperFolder 归档写）
 *   +主题分支（paperId null 落图）+重复预检全部随 IPC 新建形态消亡删除
 *   （通道不再携带新建载荷——节点唯一来源=入库 import.service 挂接/移动
 *   moveFolder 两路 repo 直调，INV-NEW-1；INV-88 判别/落笔宿主仍在
 *   papers.repo+两调用方，本 service 不再消费）。
 * - 保留 update 形态=patchNode(id, patch)：幽灵 id 拒（CONFLICT 中文）+
 *   {...existing, ...patch} 合并（未携带字段保留——防半更新清字段）+
 *   month/slot 归一沿承（patch 触发组变=目标组 max+1，显式 slot 主权透写）
 *   ——单写无归档伴随，不包事务（原 withTransaction 面随新建分支消亡，
 *   update 单写原子性由 SQLite 单语句承担，如实处置注记）。
 * - 主题节点（paperId null）应用层全域退役：DDL 列可空性窗口期防御见
 *   graph() paperIds 直收集过滤（D 批收紧）。
 *
 * 职责（票面行为层）：
 * - 写方法（IPC 注册归 LG-03）：patchNode（幽灵 id 拒；month/slot 归一=
 *   write-guards 拆件单源）/upsertEdge
 *   （守卫运行时防线——[F-LGRAPH-01②U8] kind 四值体系退役后重整面：自环拒/
 *   节点不存在拒/重复边中文收口（UNIQUE 前置）/跨图拒（INV-90）/成环拒
 *   （全边可达图）/via 不变量校验（F-LINEAGE-02）；ref 综述限定+多父守卫+
 *   sub 引用完整性随四 kind 体系退役）/removeNode/removeEdge（透传）/
 *   upsertLineTypeNames（恰 6 行+空名归一——图级整体替换，②U8）。
 * - graph：全图单读+含金量 join（F-LG14）+nodes=lineageOrder 序（INV-75
 *   读面唯一保证）+lineTypeNames 恰 6（meta KV 读出）。
 *
 * 分层：service 持 repo（注入保可测），禁 service 直写 SQL；树守卫集中本
 * 文件（LG-03 接线不另写守卫——门一 W1 处置）。
 * 测试：tests/unit/services/（repo+守卫基线件）+
 * lineage-v2-service.test.ts（T3-P5 slot 归一+F-ALIGN-01 patchNode 三态/
 * graph 读面）+lineage-manual-edges.test.ts（manual 面）[受锁新增]
 * （always-active）。
 */
import {
  LINE_TYPE_DEFAULT_NAME,
  lineageOrder,
  lineTypeNamesSchema,
  validateLineageVia
} from '../../../shared/models/lineage'
import type {
  LineTypeNames,
  LineageEdge,
  LineageEdgeUpsert,
  LineageNode,
  LineageNodeUpsert
} from '../../../shared/models/lineage'
import { venueToTier, type VenueTier } from '../../../shared/venue-tier'
import type { LineageRepo } from '../../db/repos/lineage.repo'
import { DomainError } from '../shared/domain-error'
import { normalizeMonthSlot } from './lineage.write-guards'

/** F-LG14 含金量摘要（graph 通道逐文献节点载荷；venueTier 映射单源=
 *  shared/venue-tier.ts venueToTier——受锁常量零改，未映射=null=「未定」；
 *  citedByCount null=从未抓到，0=已抓到且为 0（值非缺））。
 *  [F-LGRAPH-01②U4] +venue/+impactFactor（卡 L3/详情面板同源——papers 既有
 *  列透传[venue 001/impact_factor 迁移 012]零新 DB 面；可选缺席=渲染省略语义） */
export interface LineagePaperMetrics {
  citedByCount: number | null
  venueTier: VenueTier | null
  venue?: string | null
  impactFactor?: number | null
}

/** [F-ALIGN-01] patch-node 编辑 patch 白名单（=IPC lineagePatchNodeReqSchema
 *  去 id 面——核心想法字段已随 [A3 F-CONTRACTA-01 2026-10-04] 核心想法域
 *  全退役删除（「核心想法」语义由全文笔记 notes.contentMd 承接）；tags 已随 [A1b
 *  F-CONTRACTA-01 2026-10-04] 标签域退役删除（标签唯一源=文献库域）；
 *  folderId/paperId/created/updated 不可 patch） */
export type LineageNodePatch = Partial<
  Pick<LineageNodeUpsert, 'title' | 'year' | 'month' | 'slot' | 'x' | 'y'>
>

export interface LineageService {
  /** [F-ALIGN-01] 既有节点编辑 patch（合并语义）：幽灵 id CONFLICT 拒（中文
   *  reason）；{...existing, ...patch} 合并（未携带字段保留）→month/slot
   *  归一（patch 触发组变=目标组 max+1/显式 slot 主权透写——D-I-1 沿承）
   *  →repo.upsertNode 落笔 */
  patchNode(id: string, patch: LineageNodePatch): LineageNode
  removeNode(id: string): number
  upsertEdge(input: LineageEdgeUpsert): LineageEdge
  removeEdge(id: string): number
  /** [F-LGRAPH-01②U8] 图级色行名配置整批替换（单通道原子写）：恰 6 行校验
   *  （schema 面拦 INVALID_REQUEST）+空名 trim 后归一「待命名」（写边界
   *  单源）；成功回显归一后值 */
  upsertLineTypeNames(names: LineTypeNames): LineTypeNames
  /** 全图单读+含金量 join（F-LG14：paperMetrics 键=paperId，主题节点不入表；
   *   批量单语句禁 N+1——主控裁决）。[T3-P5] nodes=lineageOrder 序（INV-75
   *   读面唯一保证——消费方不得重排）+lineTypeNames 恰 6（meta KV 读出）。
   *   [F-FOLDER-01] folderId 提供=只取该图节点/边子图（W4 改写面——图切换器
   *   数据源；边=双端点均入图才保留）+pubNos（库级派生编号 INV-92——图内
   *   节点号与库号同源单一真相源；主题节点无键）。
   *   [A1a] +tagNames（文献库标签伴生 map——键=paperId 值=名序标签名组；
   *   主题节点/无标签文献无键；卡标签行换源读链） */
  graph(folderId?: string): {
    nodes: LineageNode[]
    edges: LineageEdge[]
    paperMetrics: Record<string, LineagePaperMetrics>
    lineTypeNames: LineTypeNames
    pubNos: Record<string, number>
    tagNames: Record<string, string[]>
  }
}

export interface LineageServiceDeps {
  repo: Pick<
    LineageRepo,
    | 'upsertNode'
    | 'removeNode'
    | 'upsertEdge'
    | 'removeEdge'
    | 'listGraph'
    | 'getLineTypeNames'
    | 'setLineTypeNames'
  >
  /** papers 含金量摘要批量查证（F-LG14——装配层接 repos.papers.listMetricsByIds；
   *  可选缺省=空面（既有单测装配兼容），生产装配恒传真实现） */
  paperMetrics?: (paperIds: string[]) => Array<{
    paperId: string
    venue: string
    citedByCount: number | null
    impactFactor?: number | null
  }>
  /** [F-FOLDER-01] pubNo 批查（INV-92 库级派生——graph 通道 pubNos 装配；
   *  可选缺省=空面，生产装配接 repos.papers.pubNoByIds） */
  pubNos?: (paperIds: string[]) => Array<{ paperId: string; pubNo: number }>
  /** [A1a] 文献库标签批量名查（graph 通道 tagNames 伴生 map 装配——卡标签行
   *  换源读链；可选缺省=空面（既有单测装配兼容），生产装配接
   *  repos.tags.tagNamesByIds） */
  tagNames?: (paperIds: string[]) => Array<{ paperId: string; name: string }>
}

/**
 * 域错误（LG-03 接线需要；shared/domain-error 基类一行继承——F-DEDUP-01 单源）：
 * code 经 toAppError 结构化透传（普通 Error 的 message 会被折叠进 detail 埋掉中文
 * reason——「reason 透传 toast」不成立）。CONFLICT=业务规则拒绝（树守卫/
 * 幽灵 id），消费方按码分支（丢弃动作+toast，区别于系统型失败保留重试）。
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
  return {
    patchNode(id: string, patch: LineageNodePatch): LineageNode {
      const nodes = deps.repo.listGraph().nodes
      const existing = nodes.find((n) => n.id === id)
      if (existing === undefined) {
        // update 形态幽灵 id 拒沿承（INV-84 拒绝型——write-queue 按 CONFLICT
        // 丢弃动作，不卡队头）
        throw new LineageDomainError('CONFLICT', `节点不存在（幽灵 id）：${id}`)
      }
      // 合并语义：未携带字段保留（非整行替换——防半更新清字段）；身份/图
      // 归属/时间戳不在 patch 白名单（schema 面先拦，existing 行值恒沿用）
      const merged: LineageNodeUpsert = { ...existing, ...patch }
      // T3-P5 month/slot 归一（D-I-1）沿承：patch 触发组变=目标组 max+1/
      // 同组显式 slot 主权透写/同组缺省保留——全图读一次算组内 max（单用户
      // 本地图量级）。folderId 恒=existing 现图（patch 不可携带，无跨图面）
      const { month, slot } = normalizeMonthSlot(merged, nodes)
      return deps.repo.upsertNode({ ...merged, month, slot })
    },

    removeNode(id: string): number {
      return deps.repo.removeNode(id)
    },

    upsertEdge(input: LineageEdgeUpsert): LineageEdge {
      // [F-LGRAPH-01②U8] 守卫重整：kind 四值体系退役（manual 单基型）——
      // ref 综述限定/多父守卫/sub 引用完整性随体系退役（manual 不限条数=
      // 用户裁决恒立）；保留面=自环/悬空/跨图/重复边/成环/via 不变量
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
      // 重复边收口（同端点对唯一——UNIQUE(from,to) 应用层前置）
      const dup = graph.edges.find(
        (e) =>
          e.id !== input.id && e.fromNode === input.fromNode && e.toNode === input.toNode
      )
      if (dup !== undefined) {
        throw new LineageDomainError(
          'CONFLICT',
          `该逻辑线已存在（${input.fromNode}→${input.toNode}），重复边被拒绝`
        )
      }
      // 成环守卫：加 from→to 后成环 ⇔ 现图中 to 可达 from（排除自身边旧端点）
      if (reachable(graph.edges, input.toNode, input.fromNode, input.id)) {
        throw new LineageDomainError(
          'CONFLICT',
          '成环拒绝：该边将使脉络图出现环路（连线不得成环）'
        )
      }
      return deps.repo.upsertEdge({ ...input, via: input.via })
    },

    removeEdge(id: string): number {
      return deps.repo.removeEdge(id)
    },

    upsertLineTypeNames(names: LineTypeNames): LineTypeNames {
      // 恰 6 行校验（lineTypeNamesSchema 单源——IPC 面同规则先拦，service 面
      // 直调路径同守）；空名 trim 后归一「待命名」（写边界单源——消费面零
      // 兜底逻辑）
      const check = lineTypeNamesSchema.safeParse(names)
      if (!check.success) {
        throw new LineageDomainError('INVALID_REQUEST', '线型色行名必须恰为 6 行')
      }
      const normalized = check.data.map((n) => {
        const t = n.trim()
        return t === '' ? LINE_TYPE_DEFAULT_NAME : t
      })
      deps.repo.setLineTypeNames(normalized)
      return deps.repo.getLineTypeNames()
    },

    graph(folderId?: string): {
      nodes: LineageNode[]
      edges: LineageEdge[]
      paperMetrics: Record<string, LineagePaperMetrics>
      lineTypeNames: LineTypeNames
      pubNos: Record<string, number>
      tagNames: Record<string, string[]>
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
      // [F-ALIGN-01·执行修正] paperId null 过滤保留=DDL 窗口期防御
      // （LineageNode.paperId 类型 string|null 是 DDL 列镜像——主题节点应用层
      // 已无产生路径〔F-ALIGN-01 退役〕，直收集 TS 红；paper_id NOT NULL
      // 收紧归 D 批，届时过滤随类型收紧删除）。
      const paperIds = scopedNodes.flatMap((n) => (n.paperId !== null ? [n.paperId] : []))
      const rows = deps.paperMetrics?.(paperIds) ?? []
      const paperMetrics: Record<string, LineagePaperMetrics> = {}
      for (const r of rows) {
        paperMetrics[r.paperId] = {
          citedByCount: r.citedByCount,
          venueTier: venueToTier(r.venue),
          // [②U4] 期刊/IF 透传（venue 空串=缺席省略语义同 null）
          venue: r.venue === '' ? null : r.venue,
          impactFactor: r.impactFactor ?? null
        }
      }
      // [F-FOLDER-01] pubNos 装配（INV-92 库级窗口单源=pubNoByIds——与 LIST_SQL
      // 同序同值；主题节点无键）
      const pubNoRows = deps.pubNos?.(paperIds) ?? []
      const pubNos: Record<string, number> = {}
      for (const r of pubNoRows) {
        pubNos[r.paperId] = r.pubNo
      }
      // [A1a] tagNames 装配（文献库标签伴生 map——repo 行序 ORDER BY
      // paper_id, t.name ASC，按 paperId 分组即名序；主题节点/无标签无键）
      const tagNameRows = deps.tagNames?.(paperIds) ?? []
      const tagNames: Record<string, string[]> = {}
      for (const r of tagNameRows) {
        const list = tagNames[r.paperId]
        if (list === undefined) tagNames[r.paperId] = [r.name]
        else list.push(r.name)
      }
      // T3-P5 INV-75：nodes=排序契约序（唯一纯函数 lineageOrder 单源——消费方
      // 不得重排）；lineTypes=恒四组（repo 补齐+枚举序）
      return {
        nodes: lineageOrder(scopedNodes),
        edges: scopedEdges,
        paperMetrics,
        lineTypeNames: deps.repo.getLineTypeNames(),
        pubNos,
        tagNames
      }
    }
  }
}
