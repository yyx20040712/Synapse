/**
 * [F-DBCAMP-01 DB-2 U2] ai-memory-manual.service —— 记忆手动 CRUD 面（管理面板
 * UI 写/读面；代理路径唯一=任务系统 ai-tasks.handlers——本面 origin 恒 manual）。
 *
 * ── 行为层 ──
 * - listByScope=**W-1 双语义**：query 缺席=列表模式（repo.listByScope：category/
 *   pinnedOnly 过滤+updated_at DESC,id DESC+limit 缺省=MAX_PAGE_SIZE 单源）；query
 *   在席=检索模式（routeQueryByCodePoints 单源路由：empty→[]/1-2 码点→LIKE
 *   （%escapeLike%）/≥3→FTS MATCH（escapeFtsQuery）——检索模式 limit 恒=
 *   MEMORY_SEARCH_TOP_K=8（IPC 面 zod 已互斥 query⊥limit〔r1 R3〕——「忽略」仅
 *   对服务直调面有效，topK 语义单源）；排序沿检索口径）。
 *   〔挂账③〕category 外值（不在该 scope 冻结集）=过滤语义空结果非拒——
 *   SQL WHERE 自然行为（zod 只验非空串，冻结集校验只在 create 面）。
 * - create：锚矩阵+档级类目 zod 已锁（服务不重验）；锚存在性校验（paper/lineage
 *   →anchorExists，NOT_FOUND——防悬挂行）；origin **硬编码 'manual' 盖写**（Req
 *   无 origin 字段）；label 缺省 ''；pinned 载荷兑现（建后置顶——repo 建面恒 0
 *   〔任务系统路径零变〕，手动面 req.pinned===true 时建后即置顶，[r1 R2 方案 a]）。
 * - update：getById 缺席→NOT_FOUND「记忆不存在」；patch.category 在席时按**行
 *   scope 档级校验**（跨档类目→INVALID_REQUEST——zod 只验 19 值并集，档级矩阵
 *   归本层，ai-schemas.ts 接缝注释在案）；**空 patch {}=原样返回零写**（k3-N3
 *   定案：无变更不刷 updated_at——防 listByScope 排序幽灵重排）。
 * - delete/setPinned：repo false→NOT_FOUND；返回 AiMemory 投影行（delete=删除前
 *   行快照回读，setPinned=getById 回读）。
 *
 * ── 架构层 ──
 * - SQL 全在 repo（本文件零 SQL）；行投影（pinned 0|1→boolean+剥 sourceTaskId）
 *   映射点=本层 toView/toListItem 单源；错误语义 AiDomainError 复用既有三码。
 *
 * ── 文化层 ──
 * - 测试：tests/unit/services/ai-memory-manual.service.test.ts（always-active 真库）。
 */
import { escapeFtsQuery } from '../../db/fts'
import type { AiMemoryListRow } from '../../db/repos/ai-memory-scope.repo'
import type { AiMemoryRow } from '../../db/repos/ai-memory.repo'
import type { AiScope } from '../../db/repos/ai-sessions.repo'
import type { Repos } from '../../db/repos'
import { MAX_PAGE_SIZE } from '../../../shared/constants'
import { AI_MEMORY_CATEGORIES } from '../../../shared/models/ai-domain'
import type { AiMemory, AiMemoryListItem } from '../../../shared/models/ai-domain'
import {
  escapeLike,
  MEMORY_SEARCH_TOP_K,
  routeQueryByCodePoints
} from './ai-memory-search.service'
import { AiDomainError } from './ai-sessions.service'

const ANCHOR_MISSING_MSG: Record<'paper' | 'lineage', string> = {
  paper: '锚定文献不存在，无法写入记忆',
  lineage: '锚定脉络图不存在，无法写入记忆'
}

export interface AiMemoryManualService {
  listByScope(req: {
    scope: AiScope
    category?: string
    pinnedOnly?: boolean
    query?: string
    limit?: number
  }): Promise<AiMemoryListItem[]>
  create(req: {
    scope: AiScope
    anchorId: string | null
    category: string
    label?: string
    title: string
    content: string
    pinned?: boolean
  }): Promise<AiMemory>
  update(req: {
    id: number
    patch: { label?: string; title?: string; content?: string; category?: string }
  }): Promise<AiMemory>
  /** 删除前行快照回读（IPC Res=trueAck——投影行由直接消费面用） */
  delete(id: number): Promise<AiMemory>
  setPinned(id: number, pinned: boolean): Promise<AiMemory>
}

/** DB 行→IPC 投影（pinned 0|1→boolean+剥 sourceTaskId——映射点单源在本层） */
function toView(r: AiMemoryRow): AiMemory {
  return {
    id: r.id,
    scope: r.scope,
    anchorId: r.anchorId,
    category: r.category,
    label: r.label,
    title: r.title,
    content: r.content,
    pinned: r.pinned === 1,
    origin: r.origin,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt
  }
}

function toListItem(r: AiMemoryListRow): AiMemoryListItem {
  return { ...toView(r), anchorTitle: r.anchorTitle }
}

export function createAiMemoryManualService(deps: { repos: Repos }): AiMemoryManualService {
  const { aiMemory, aiSessions } = deps.repos

  function assertAnchorExists(scope: AiScope, anchorId: string | null): void {
    if (scope !== 'global' && !aiSessions.anchorExists(scope, anchorId)) {
      throw new AiDomainError('NOT_FOUND', ANCHOR_MISSING_MSG[scope])
    }
  }

  return {
    async listByScope(req) {
      if (req.query !== undefined) {
        // 检索模式（W-1）：码点路由单源；limit 恒=topK（MEMORY_SEARCH_TOP_K=8）
        const q = req.query.trim()
        const route = routeQueryByCodePoints(q)
        if (route === 'empty') return []
        if (route === 'like') {
          return aiMemory
            .searchByLikeScope(req.scope, `%${escapeLike(q)}%`, MEMORY_SEARCH_TOP_K)
            .map(toListItem)
        }
        return aiMemory
          .searchByMatchScope(req.scope, escapeFtsQuery(q), MEMORY_SEARCH_TOP_K)
          .map(toListItem)
      }
      // 列表模式：limit 缺省=MAX_PAGE_SIZE 单源（上界=IPC 面 zod 锁定）
      return aiMemory
        .listByScope(req.scope, {
          category: req.category,
          pinnedOnly: req.pinnedOnly,
          limit: req.limit ?? MAX_PAGE_SIZE
        })
        .map(toListItem)
    },

    async create(req) {
      assertAnchorExists(req.scope, req.anchorId)
      // origin 硬编码 manual 盖写（Req 无 origin 字段——代理路径唯一=任务系统）；
      // pinned 载荷兑现（建后置顶——repo 建面恒 0，true 时建后即置顶再回读）。
      // 建行+置顶两语句未走 withTransaction：同表顺序写+同步单进程，半写残留=
      // 行建而未置顶（语义无害，失败分支理论不可达）——d1-N1 一致性豁免注记
      const row = aiMemory.create(req.scope, req.anchorId, {
        category: req.category,
        title: req.title,
        content: req.content,
        label: req.label ?? '',
        origin: 'manual'
      })
      if (req.pinned === true) {
        if (!aiMemory.setPinned(row.id, true)) {
          throw new AiDomainError('NOT_FOUND', '记忆不存在')
        }
        const pinnedRow = aiMemory.getById(row.id)
        if (pinnedRow === null) {
          throw new AiDomainError('NOT_FOUND', '记忆不存在')
        }
        return toView(pinnedRow)
      }
      return toView(row)
    },

    async update(req) {
      const row = aiMemory.getById(req.id)
      if (row === null) {
        throw new AiDomainError('NOT_FOUND', '记忆不存在')
      }
      // 档级类目校验（按行 scope——zod 只验 19 值并集，档级矩阵归本层）
      if (
        req.patch.category !== undefined &&
        !AI_MEMORY_CATEGORIES[row.scope].includes(req.patch.category)
      ) {
        throw new AiDomainError('INVALID_REQUEST', '类目不属于该记忆行的档级冻结集（19 类 6+7+6 跨档隔离）')
      }
      // 空 patch=原样返回零写（k3-N3：无变更不刷 updated_at——防排序幽灵重排）
      if (Object.keys(req.patch).length === 0) return toView(row)
      const updated = aiMemory.update(req.id, req.patch)
      if (updated === null) {
        throw new AiDomainError('NOT_FOUND', '记忆不存在')
      }
      return toView(updated)
    },

    async delete(id) {
      const row = aiMemory.getById(id)
      if (row === null) {
        throw new AiDomainError('NOT_FOUND', '记忆不存在')
      }
      if (!aiMemory.delete(id)) {
        throw new AiDomainError('NOT_FOUND', '记忆不存在')
      }
      return toView(row)
    },

    async setPinned(id, pinned) {
      if (!aiMemory.setPinned(id, pinned)) {
        throw new AiDomainError('NOT_FOUND', '记忆不存在')
      }
      const row = aiMemory.getById(id)
      if (row === null) {
        throw new AiDomainError('NOT_FOUND', '记忆不存在')
      }
      return toView(row)
    }
  }
}
