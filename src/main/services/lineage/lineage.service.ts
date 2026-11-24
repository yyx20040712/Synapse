/**
 * lineage.service —— 脉络图写面（LG-01 交付面）。
 *
 * [F-BAKRET-01] 草稿导入链已退役删除（用户裁决 2026-09-30——ADR-0022）。
 *
 * [F-ALIGN-01 D1/D2 2026-10-04] upsertNode→patchNode（通道拆分）：
 * - 新建分支+主题分支+重复预检随 IPC 新建形态消亡删除（节点唯一来源=入库
 *   import.service 挂接/移动 moveFolder 两路 repo 直调，INV-NEW-1）。
 * - 保留 update 形态=patchNode(id, patch)：幽灵 id 拒（CONFLICT 中文）+
 *   {...existing, ...patch} 合并（未携带字段保留——防半更新清字段）+
 *   month/slot 归一沿承（patch 触发组变=目标组 max+1，显式 slot 主权透写）
 *   ——单写无归档伴随，不包事务（update 单写原子性由 SQLite 单语句承担）。
 * - 主题节点（paperId null）应用层全域退役：DDL 列可空性窗口期防御见
 *   graph() paperIds 直收集过滤。
 *
 * [B4 L1 2026-11-23] 拆件：graph 读面装配迁 lineage-graph-read.service（含
 * [D2] 按 folder 键读色行名）；边守卫（自环/via/锚/悬空/跨图/重复/成环）迁
 * lineage-history-guards（history-unit 最终图守卫复用同一函数——拒绝消息逐字
 * 同源）；本件保留四写方法+薄接线。色行名 upsertLineTypeNames(folderId, names)
 * 按 folder 键 `lineTypeNames:<folderId>` 整批替换（§5.4 签名链第 5 段）。
 *
 * 职责（票面行为层）：
 * - 写方法：patchNode（幽灵 id 拒；month/slot 归一=lineage.write-guards）/
 *   upsertEdge（守卫运行时防线）/removeNode/removeEdge（透传）/
 *   upsertLineTypeNames（恰 6 行+空名归一）。
 * - graph：readLineageGraph（子图+派生 join+lineageOrder 序+keyed 色行名）。
 *
 * 分层：service 持 repo（注入保可测），禁 service 直写 SQL。
 * 测试：tests/unit/services/lineage-v2-service.test.ts、lineage-manual-edges.test.ts、
 * lineage-u8-linetype.test.ts、lineage-assemble.test.ts（主图键契约）。
 */
import {
  LINE_TYPE_DEFAULT_NAME,
  lineTypeNamesSchema,
  type LineTypeNames,
  type LineageEdge,
  type LineageEdgeUpsert,
  type LineageNode
} from '../../../shared/models/lineage'
import type { LineageNodeUpsert } from '../../../shared/models/lineage'
import type { LineageRepo } from '../../db/repos/lineage.repo'
import { DomainError } from '../shared/domain-error'
import { edgeGuardIssue, type GuardedEdgeInput } from './lineage-history-guards'
import { readLineageGraph, type LineageGraphPayload, type LineageGraphReadDeps } from './lineage-graph-read.service'
import { normalizeMonthSlot } from './lineage.write-guards'

export type { LineageGraphPayload, LineagePaperMetrics } from './lineage-graph-read.service'

/** [F-ALIGN-01] patch-node 编辑 patch 白名单（=IPC lineagePatchNodeReqSchema 去 id 面；
 *  folderId/paperId/created/updated 不可 patch） */
export type LineageNodePatch = Partial<
  Pick<LineageNodeUpsert, 'title' | 'year' | 'month' | 'slot' | 'x' | 'y'>
>

export interface LineageService {
  /** 既有节点编辑 patch（合并语义）：幽灵 id CONFLICT 拒（中文 reason）；
   *  {...existing, ...patch} 合并→month/slot 归一→repo.upsertNode 落笔 */
  patchNode(id: string, patch: LineageNodePatch): LineageNode
  removeNode(id: string): number
  upsertEdge(input: LineageEdgeUpsert): LineageEdge
  removeEdge(id: string): number
  /** [B4 L1 D2] 色行名配置整批替换（按 folder 键）：恰 6 行校验（schema 面拦
   *  INVALID_REQUEST）+空名 trim 后归一「待命名」；成功回显归一后值 */
  upsertLineTypeNames(folderId: string, names: LineTypeNames): LineTypeNames
  /** 全图单读+含金量 join（装配=lineage-graph-read.service） */
  graph(folderId?: string): LineageGraphPayload
}

export type LineageServiceDeps = LineageGraphReadDeps & {
  repo: Pick<
    LineageRepo,
    'upsertNode' | 'removeNode' | 'upsertEdge' | 'removeEdge' | 'listGraph' | 'getLineTypeNames' | 'setLineTypeNames'
  >
}

/**
 * 域错误（LG-03 接线需要）：code 经 toAppError 结构化透传。CONFLICT=业务规则
 * 拒绝（树守卫/幽灵 id），消费方按码分支（丢弃动作+toast，区别于系统型失败
 * 保留重试）。message 中文原文（受锁测试断言子串）。
 */
class LineageDomainError extends DomainError {}

export function createLineageService(deps: LineageServiceDeps): LineageService {
  return {
    patchNode(id: string, patch: LineageNodePatch): LineageNode {
      const nodes = deps.repo.listGraph().nodes
      const existing = nodes.find((n) => n.id === id)
      if (existing === undefined) {
        // update 形态幽灵 id 拒沿承（INV-84 拒绝型——write-queue 按 CONFLICT 丢弃动作）
        throw new LineageDomainError('CONFLICT', `节点不存在（幽灵 id）：${id}`)
      }
      // 合并语义：未携带字段保留；身份/图归属/时间戳不在 patch 白名单
      const merged: LineageNodeUpsert = { ...existing, ...patch }
      // T3-P5 month/slot 归一（D-I-1）沿承：全图读一次算组内 max
      const { month, slot } = normalizeMonthSlot(merged, nodes)
      return deps.repo.upsertNode({ ...merged, month, slot })
    },

    removeNode(id: string): number {
      return deps.repo.removeNode(id)
    },

    upsertEdge(input: LineageEdgeUpsert): LineageEdge {
      // [F-LGRAPH-01②U8] 守卫重整（manual 单基型——ref 综述限定/多父/sub 引用
      // 完整性随四 kind 体系退役）：自环/悬空/跨图/重复边/成环/via 不变量——
      // 守卫函数与 history-unit 最终图共用（lineage-history-guards），判定序
      // 与消息逐字沿承
      const issue = edgeGuardIssue(input as GuardedEdgeInput, () => deps.repo.listGraph())
      if (issue !== null) throw new LineageDomainError(issue.code, issue.message)
      return deps.repo.upsertEdge({ ...input, via: input.via })
    },

    removeEdge(id: string): number {
      return deps.repo.removeEdge(id)
    },

    upsertLineTypeNames(folderId: string, names: LineTypeNames): LineTypeNames {
      // 恰 6 行校验（lineTypeNamesSchema 单源——IPC 面同规则先拦，service 面
      // 直调路径同守）；空名 trim 后归一「待命名」（写边界单源）
      const check = lineTypeNamesSchema.safeParse(names)
      if (!check.success) {
        throw new LineageDomainError('INVALID_REQUEST', '线型色行名必须恰为 6 行')
      }
      const normalized = check.data.map((n) => {
        const t = n.trim()
        return t === '' ? LINE_TYPE_DEFAULT_NAME : t
      })
      deps.repo.setLineTypeNames(folderId, normalized)
      return deps.repo.getLineTypeNames(folderId)
    },

    graph(folderId?: string): LineageGraphPayload {
      return readLineageGraph(deps, folderId)
    }
  }
}
