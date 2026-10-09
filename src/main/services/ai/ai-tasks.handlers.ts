/**
 * [F-DBCAMP-01 DB-2 U2b-1→U2b-2a] ai-tasks.handlers —— 9 动作 dispatch 表+围栏/
 * 检索工具件（自 ai-tasks.service 外移：service 物理行禁膨胀约束〔裁决部 N-1〕
 * ——沿 r3 rows/audit 外移先例；**零行为变更**：纯移动+import 重排，工厂签名零变，
 * 导出面经 ai-tasks.service re-export 保持消费方 import 路径不动）。
 * 行为语义注记见 ai-tasks.service 头注（§3.e 段）——本件零承载。
 *
 * ── 文化层 ──
 * - 既有测试全绿（ai-tasks-run 29 用例等零改动）=外移正确性证据。
 */
import { escapeFtsQuery } from '../../db/fts'
import type { AiTaskAction, AiTaskRow } from '../../db/repos/ai-tasks.repo'
import type { Repos } from '../../db/repos'
import { AiDomainError } from './ai-sessions.service'
import { escapeLike, MEMORY_SEARCH_TOP_K } from './ai-memory-search.service'
import {
  AI_MEMORY_CATEGORIES,
  MEMORY_LIST_DEFAULT_LIMIT,
  memoryDigest
} from './ai-tasks.actions'

export interface HandlerOutcome {
  /** result 字段 JSON（null=无结果面） */
  result: string | null
  /** 读动作回写文本（assistant 行 content；undefined=无回写） */
  writeback?: string
}

export interface HandlerContext {
  task: AiTaskRow
  target: { scope: 'paper' | 'lineage'; anchor: string }
  sessionId: number
  /** 审计中间行（mutated——SAVEPOINT 内，随失败回滚） */
  audit(kind: string, detail: string): void
}

export type TaskHandler = (
  ctx: HandlerContext,
  payload: Record<string, unknown>
) => HandlerOutcome
export type TaskHandlerFactory = (repos: Repos) => TaskHandler

/** memory.* 通用围栏：目标行必须属任务目标锚（scope+anchor 皆等——§3.e） */
function fencedMemory(repos: Repos, ctx: HandlerContext, memoryId: number) {
  const row = repos.aiMemory.getById(memoryId)
  if (row === null) {
    throw new AiDomainError('NOT_FOUND', '记忆不存在')
  }
  if (row.scope !== ctx.target.scope || row.anchorId !== ctx.target.anchor) {
    throw new AiDomainError('INVALID_REQUEST', '记忆不属于任务目标锚')
  }
  return row
}

/** message.* 通用围栏：消息必须属 dispatching session */
function fencedMessage(repos: Repos, ctx: HandlerContext, messageId: number) {
  const row = repos.aiSessions.getMessageById(messageId)
  if (row === null) {
    throw new AiDomainError('NOT_FOUND', '消息不存在')
  }
  if (row.sessionId !== ctx.sessionId) {
    throw new AiDomainError('INVALID_REQUEST', '消息不属于本任务会话')
  }
  return row
}

/** 码点路由检索（§3.e：复用 escapeLike/escapeFtsQuery/TOP_K 单源；可见集=并集裁④） */
function searchUnionRows(
  repos: Repos,
  ctx: HandlerContext,
  query: string
): { route: 'empty' | 'like' | 'match'; rows: ReturnType<Repos['aiMemory']['listUnion']> } {
  const q = query.trim()
  const codePoints = [...q].length
  if (codePoints === 0) return { route: 'empty', rows: [] }
  if (codePoints <= 2) {
    return {
      route: 'like',
      rows: repos.aiMemory.searchByLikeUnion(
        ctx.target.scope,
        ctx.target.anchor,
        `%${escapeLike(q)}%`,
        MEMORY_SEARCH_TOP_K
      )
    }
  }
  return {
    route: 'match',
    rows: repos.aiMemory.searchByMatchUnion(
      ctx.target.scope,
      ctx.target.anchor,
      escapeFtsQuery(q),
      MEMORY_SEARCH_TOP_K
    )
  }
}

/** 9 动作 dispatch 表（唯一执行信道——键集=AI_TASK_ACTIONS=DDL CHECK 三方对齐） */
export const TASK_HANDLER_TABLE: Record<AiTaskAction, TaskHandlerFactory> = {
  'memory.create':
    repos =>
    (ctx, p) => {
      const scope = ctx.target.scope
      const category = p.category as string
      if (!AI_MEMORY_CATEGORIES[scope].includes(category)) {
        throw new AiDomainError('INVALID_REQUEST', `分类不属于${scope} 档分类集`)
      }
      const row = repos.aiMemory.create(scope, ctx.target.anchor, {
        category,
        title: p.title as string,
        content: p.content as string,
        label: p.label as string | undefined,
        origin: 'agent',
        sourceTaskId: ctx.task.id
      })
      ctx.audit('mutated', `before=(null) after=${memoryDigest(row)}`)
      return { result: JSON.stringify({ memoryId: row.id }) }
    },

  'memory.update':
    repos =>
    (ctx, p) => {
      const memoryId = p.memoryId as number
      const before = fencedMemory(repos, ctx, memoryId)
      const after = repos.aiMemory.update(memoryId, {
        title: p.title as string | undefined,
        content: p.content as string | undefined,
        label: p.label as string | undefined
      })
      ctx.audit('mutated', `before=${memoryDigest(before)} after=${memoryDigest(after!)}`)
      return { result: JSON.stringify({ memoryId }) }
    },

  'memory.delete':
    repos =>
    (ctx, p) => {
      const memoryId = p.memoryId as number
      const before = fencedMemory(repos, ctx, memoryId)
      repos.aiMemory.delete(memoryId)
      ctx.audit('mutated', `before=${memoryDigest(before)} after=(deleted)`)
      return { result: JSON.stringify({ memoryId }) }
    },

  'memory.pin':
    repos =>
    (ctx, p) => {
      const memoryId = p.memoryId as number
      const before = fencedMemory(repos, ctx, memoryId)
      repos.aiMemory.setPinned(memoryId, true)
      ctx.audit(
        'mutated',
        `before=${memoryDigest(before)} after=${memoryDigest(repos.aiMemory.getById(memoryId)!)}`
      )
      return { result: JSON.stringify({ memoryId }) }
    },

  'memory.unpin':
    repos =>
    (ctx, p) => {
      const memoryId = p.memoryId as number
      const before = fencedMemory(repos, ctx, memoryId)
      repos.aiMemory.setPinned(memoryId, false)
      ctx.audit(
        'mutated',
        `before=${memoryDigest(before)} after=${memoryDigest(repos.aiMemory.getById(memoryId)!)}`
      )
      return { result: JSON.stringify({ memoryId }) }
    },

  'memory.search':
    repos =>
    (ctx, p) => {
      const { route, rows } = searchUnionRows(repos, ctx, p.query as string)
      const summary = rows.map((r) => ({ id: r.id, category: r.category, title: r.title }))
      const text = JSON.stringify({ action: 'memory.search', route, rows: summary })
      return { result: text, writeback: text }
    },

  'memory.list':
    repos =>
    (ctx, p) => {
      const rows = repos.aiMemory.listUnion(
        ctx.target.scope,
        ctx.target.anchor,
        (p.category as string | undefined) ?? null,
        (p.limit as number | undefined) ?? MEMORY_LIST_DEFAULT_LIMIT
      )
      const summary = rows.map((r) => ({ id: r.id, category: r.category, title: r.title }))
      const text = JSON.stringify({ action: 'memory.list', count: rows.length, rows: summary })
      return { result: text, writeback: text }
    },

  'message.pin':
    repos =>
    (ctx, p) => {
      const messageId = p.messageId as number
      fencedMessage(repos, ctx, messageId)
      if (!repos.aiSessions.setPinned(messageId, true)) {
        throw new AiDomainError('NOT_FOUND', '消息不存在')
      }
      ctx.audit('mutated', `message=${messageId} pinned=1`)
      return { result: JSON.stringify({ messageId }) }
    },

  'message.unpin':
    repos =>
    (ctx, p) => {
      const messageId = p.messageId as number
      fencedMessage(repos, ctx, messageId)
      if (!repos.aiSessions.setPinned(messageId, false)) {
        throw new AiDomainError('NOT_FOUND', '消息不存在')
      }
      ctx.audit('mutated', `message=${messageId} pinned=0`)
      return { result: JSON.stringify({ messageId }) }
    }
}

/** dispatch 键集（三方对齐断言面：DDL==AI_TASK_ACTIONS==本表键集——测试消费） */
export const TASK_HANDLER_ACTIONS: readonly AiTaskAction[] = Object.keys(
  TASK_HANDLER_TABLE
) as AiTaskAction[]
