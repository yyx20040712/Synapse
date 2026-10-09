/**
 * [F-DBCAMP-01 DB-2 U2a] ai-sessions.service —— 会话生命周期+消息 50 上限语义。
 *
 * ── 行为层 ──
 * - openSession（§3.F 多态锚存在性校验——无 FK 防悬挂会话行）：
 *   ①scope∈三值封闭集（外→INVALID_REQUEST）；②global 带 anchor 拒/
 *   paper·lineage 缺 anchor 拒（形态非法先于存在性——§3.E）；③锚缺席→NOT_FOUND
 *   （paper→papers.id/lineage→collections.id）。DDL CHECK 面经服务层前置校验
 *   全覆盖（兜底捕获分支不可经本层触达，不设死分支）。
 * - appendMessage（§3.A/§3.E）：role∈{user,assistant}（system 拒——DDL CHECK
 *   同口径）；content trim 后空拒；insertWithEviction 抛 SessionCapAllPinnedError
 *   →映射 AiDomainError('CONFLICT')——**复用 CONFLICT 预裁**（tags U4 限额同型
 *   先例；禁新增 AppErrorCode——封闭枚举需 ADR+[locked-change]，本批不动 shared）。
 * - pinMessage/unpinMessage：repo setPinned false（缺 id 零行变更）→NOT_FOUND
 *   消息不存在；置顶操作本身无上限（§3.A 单一规则）。
 * - listMessages：透传 repo 稳定序（id ASC）。
 *
 * ── 架构层 ──
 * - SQL 全在 repo（service 零 SQL）；错误语义归 service、数据事实归 repo
 *   （tags.service 先例）。本批零 IPC 零 renderer（装配桶挂接=引用满足面）。
 * - AiDomainError：DomainError 基类一行继承（F-DEDUP-01 单源；本文件定义、
 *   ai-memory-search.service 同域复用——AI 域错误载体单一真相源）。
 *
 * ── 文化层 ──
 * - 测试：tests/unit/services/ai-sessions.service.test.ts（always-active 真库）。
 */
import {
  AI_SESSION_MESSAGE_CAP,
  SessionCapAllPinnedError,
  type AiMessageRow,
  type AiScope
} from '../../db/repos/ai-sessions.repo'
import type { Repos } from '../../db/repos'
import { DomainError } from '../shared/domain-error'

/** AI 域错误载体（§3.E 映射单源；ai-memory-search.service 同域消费） */
export class AiDomainError extends DomainError {}

/** AI 域三档封闭集（020 CHECK 同源；两服务共用） */
export const AI_SCOPES: readonly AiScope[] = ['paper', 'lineage', 'global']

export interface AiSessionsService {
  openSession(req: { scope: AiScope; anchorId: string | null }): Promise<{ sessionId: number }>
  appendMessage(req: {
    sessionId: number
    role: 'user' | 'assistant'
    content: string
  }): Promise<AiMessageRow>
  pinMessage(messageId: number): Promise<{ ok: true }>
  unpinMessage(messageId: number): Promise<{ ok: true }>
  listMessages(sessionId: number): Promise<AiMessageRow[]>
}

const ANCHOR_MISSING_MSG: Record<'paper' | 'lineage', string> = {
  paper: '锚定文献不存在，无法建立会话',
  lineage: '锚定脉络图不存在，无法建立会话'
}

export function createAiSessionsService(deps: { repos: Repos }): AiSessionsService {
  const { aiSessions } = deps.repos

  /** scope/anchor 形态校验（§3.E：非法 scope 值/global 带 anchor → INVALID_REQUEST） */
  function assertScopeShape(scope: AiScope, anchorId: string | null): void {
    if (!AI_SCOPES.includes(scope)) {
      throw new AiDomainError('INVALID_REQUEST', '非法会话范围（仅 paper/lineage/global）')
    }
    if (scope === 'global') {
      if (anchorId !== null) {
        throw new AiDomainError('INVALID_REQUEST', '全局会话不接受锚')
      }
    } else if (anchorId === null || anchorId === '') {
      throw new AiDomainError('INVALID_REQUEST', '该会话范围必须指定锚')
    }
  }

  return {
    async openSession(req) {
      assertScopeShape(req.scope, req.anchorId)
      if (
        req.scope !== 'global' &&
        !aiSessions.anchorExists(req.scope, req.anchorId)
      ) {
        throw new AiDomainError('NOT_FOUND', ANCHOR_MISSING_MSG[req.scope])
      }
      return { sessionId: aiSessions.createSession(req.scope, req.anchorId).id }
    },

    async appendMessage(req) {
      if (req.role !== 'user' && req.role !== 'assistant') {
        throw new AiDomainError('INVALID_REQUEST', '消息角色非法（仅 user/assistant）')
      }
      if (req.content.trim() === '') {
        throw new AiDomainError('INVALID_REQUEST', '消息内容不能为空')
      }
      try {
        return aiSessions.insertWithEviction(req.sessionId, req.role, req.content)
      } catch (e) {
        if (e instanceof SessionCapAllPinnedError) {
          throw new AiDomainError(
            'CONFLICT',
            `会话消息已达 ${AI_SESSION_MESSAGE_CAP} 条上限且全部置顶` +
              `（置顶 ${e.pinnedCount} 条），请先在管理面板取消置顶`
          )
        }
        throw e
      }
    },

    async pinMessage(messageId) {
      if (!aiSessions.setPinned(messageId, true)) {
        throw new AiDomainError('NOT_FOUND', '消息不存在')
      }
      return { ok: true as const }
    },

    async unpinMessage(messageId) {
      if (!aiSessions.setPinned(messageId, false)) {
        throw new AiDomainError('NOT_FOUND', '消息不存在')
      }
      return { ok: true as const }
    },

    async listMessages(sessionId) {
      return aiSessions.listMessages(sessionId)
    }
  }
}
