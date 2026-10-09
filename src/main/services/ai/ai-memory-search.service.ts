/**
 * [F-DBCAMP-01 DB-2 U2a] ai-memory-search.service —— 记忆检索路由（§3.B/§3.C）。
 *
 * ── 行为层 ──
 * - searchMemory({scope, anchorId, query}) → {route:'empty'|'like'|'match', rows}：
 *   输入 trim 后按**码点计数**（[...q].length）前置路由（两路互斥——单查询恒走
 *   一路；<3 码点 FTS MATCH 静默零命中实测→回退实现用长度前置判断，无需 try/catch）：
 *   0→empty（直接空召回标注，不触 SQL）；1-2→LIKE 路（escapeLike 转义 \ % _ 三字符
 *   +%q% 包装→三列 OR，SQL 侧 ESCAPE '\'）；≥3→MATCH 路（escapeFtsQuery 复用
 *   src/main/db/fts.ts——禁重写）。空命中=合法态返回空 rows。
 * - 隔离=完全隔离无并集（裁定①——§3.C 逐字；谓词单源在 ai-memory.repo）。
 * - 排序两路同口径 (updated_at DESC, id DESC)；topK=8（MEMORY_SEARCH_TOP_K 单源）。
 * - ASCII 大小写折叠偏差=INV-127（两路同折叠——已知偏差非缺陷，行为锁测试承载）。
 *
 * ── 文化层 ──
 * - SQL 全在 repo（本文件只构造参数值：pattern/ftsQuery 均为绑定参数非 SQL 文本）。
 * - 测试：tests/unit/services/ai-memory-search.service.test.ts（always-active 真库）。
 */
import { escapeFtsQuery } from '../../db/fts'
import type { AiMemoryRow } from '../../db/repos/ai-memory.repo'
import type { Repos } from '../../db/repos'
import type { AiScope } from '../../db/repos/ai-sessions.repo'
import { AiDomainError, AI_SCOPES } from './ai-sessions.service'

/** 召回上限（§3.B topK=8——导出常量，测试同源） */
export const MEMORY_SEARCH_TOP_K = 8

export interface MemorySearchRequest {
  scope: AiScope
  anchorId: string | null
  query: string
}

export interface MemorySearchResult {
  route: 'empty' | 'like' | 'match'
  rows: AiMemoryRow[]
}

/** LIKE 通配符转义（\ % _ 三字符前置反斜杠；SQL 侧恒配 ESCAPE '\'） */
export function escapeLike(q: string): string {
  return q.replace(/[\\%_]/g, (ch) => `\\${ch}`)
}

export interface AiMemorySearchService {
  searchMemory(req: MemorySearchRequest): Promise<MemorySearchResult>
}

export function createAiMemorySearchService(deps: { repos: Repos }): AiMemorySearchService {
  const { aiMemory } = deps.repos

  /** scope/anchor 形态校验（§3.E——与 openSession 同规则；Rule of Three 第 2 次保持重复） */
  function assertScopeShape(scope: AiScope, anchorId: string | null): void {
    if (!AI_SCOPES.includes(scope)) {
      throw new AiDomainError('INVALID_REQUEST', '非法检索范围（仅 paper/lineage/global）')
    }
    if (scope === 'global') {
      if (anchorId !== null) {
        throw new AiDomainError('INVALID_REQUEST', '全局检索不接受锚')
      }
    } else if (anchorId === null || anchorId === '') {
      throw new AiDomainError('INVALID_REQUEST', '该检索范围必须指定锚')
    }
  }

  return {
    async searchMemory(req) {
      assertScopeShape(req.scope, req.anchorId)
      const q = req.query.trim()
      const codePoints = [...q].length
      if (codePoints === 0) {
        return { route: 'empty', rows: [] }
      }
      if (codePoints <= 2) {
        const pattern = `%${escapeLike(q)}%`
        return {
          route: 'like',
          rows: aiMemory.searchByLike(req.scope, req.anchorId, pattern, MEMORY_SEARCH_TOP_K)
        }
      }
      return {
        route: 'match',
        rows: aiMemory.searchByMatch(req.scope, req.anchorId, escapeFtsQuery(q), MEMORY_SEARCH_TOP_K)
      }
    }
  }
}
