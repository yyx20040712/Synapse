/**
 * [F-DBCAMP-01 DB-2 U2b-1] ai-tasks.service —— 任务系统（§3.D 软件层代理化）：
 * submitTask/runTask/cancelTask/recoverInterruptedTasks/listTasks+9 动作 dispatch。
 *
 * ── 行为层（提交面 §3.b） ──
 * - 三闸序=形态先于存在性（裁③）：①action∈9 白名单→②payload schema
 *   （ai-tasks.actions）→③会话存在性（NOT_FOUND「会话不存在」）→目标围栏。
 * - 目标围栏（W-2）：缺省 target=继承 dispatching session 的 (scope,anchor)；
 *   global 会话无默认锚→必须显式 target（INVALID_REQUEST）；显式 target：
 *   scope∈('paper','lineage')（global 资源=INVALID_REQUEST「全局资源不可为任务
 *   目标」）+anchorId 非空+anchorExists（NOT_FOUND）；跨锚任务合法（围栏=档级）。
 * - 幂等：idempotencyKey 给定且已有同键任务→返回既有行（不抛不重执行；审计仅
 *   首提交一行 submitted）。
 * - 落库：INSERT（status='queued'）+审计 submitted 行（detail 含 target_resolved
 *   描述符）同事务。
 *
 * ── 行为层（执行面 §3.c——6 态机） ──
 * - 迁移律：queued→running→{succeeded|failed|timeout}；queued→cancelled；其余拒
 *   （守卫 UPDATE changes=0→CONFLICT）。running 不可取消（v1）。
 * - 事务结构（冻结案）：事务 A=迁移+target_resolved 审计；事务 B=SAVEPOINT 包
 *   handler→超时检查点（elapsed>5000，deps.now 可注入——确定性测试路径）→
 *   ROLLBACK TO sp+timeout 终态 / handler 抛错→ROLLBACK TO sp+failed 终态 /
 *   正常→RELEASE sp+结果回写+succeeded 终态（终态+审计同事务原子）。
 * - 成功路径拒写分支（N-6）：读动作结果经 appendMessage 回写 dispatching
 *   session（assistant 行，计入 50 上限）；遇 SessionCapAllPinnedError→结果转
 *   result_overflow 审计（detail=摘要截断 200 字符）+任务仍迁移 succeeded。
 * - dispatching session 经 runTask({taskId,sessionId}) 显式传入（020 DDL 冻结
 *   无 session 列——会话上下文随执行请求携带；executor 自裁申报在案）。
 *
 * ── 行为层（9 handler §3.e） ──
 * - 通用围栏：memory.* 的 memoryId 目标行必须属任务目标锚（scope+anchor 皆等，
 *   执行期判→failed 终态）；message.* 的 messageId 必须属 dispatching session。
 * - memory.create：(scope,anchor)=任务目标+origin='agent'+source_task_id=本任务
 *   （INV-128 同锚不变量）；category∈目标档集（19 值全集过闸②，档集执行期判）。
 * - memory.search/list：码点路由（复用 escapeLike/escapeFtsQuery/
 *   MEMORY_SEARCH_TOP_K 单源——import 禁重写）；可见集=并集谓词（裁④目标锚∪
 *   global——repo 新原语）；result=rows 摘要+assistant 回写。
 * - 审计 kind 集（冻结）：submitted/target_resolved/mutated/result_overflow/
 *   succeeded/failed/timeout/cancelled；mutated detail=before/after 摘要各截
 *   200 字符。
 *
 * ── 架构层 ──
 * - SQL 全在 repo（service 零 SQL）；错误语义归 service；AiDomainError 复用
 *   AppErrorCode 既有码（禁新增封闭枚举——shared 零改动）。
 *
 * ── 文化层 ──
 * - 测试：tests/unit/services/ai-tasks-submit.service.test.ts（三闸+幂等+三方
 *   对齐）+ai-tasks-run.service.test.ts（状态机+handler+超时+恢复——预筹拆分）。
 */
import { escapeFtsQuery } from '../../db/fts'
import type { AiTaskAction, AiTaskFinalStatus, AiTaskRow } from '../../db/repos/ai-tasks.repo'
import type { Repos } from '../../db/repos'
import { SessionCapAllPinnedError } from '../../db/repos/ai-sessions.repo'
import { AiDomainError } from './ai-sessions.service'
import { escapeLike, MEMORY_SEARCH_TOP_K } from './ai-memory-search.service'
import {
  AI_MEMORY_CATEGORIES,
  AI_TASK_ACTIONS,
  MEMORY_LIST_DEFAULT_LIMIT,
  memoryDigest,
  messageOf,
  truncateDetail,
  validatePayload
} from './ai-tasks.actions'

/** 超时阈值（§3.c 默认 5000——deps.now 注入可测） */
export const AI_TASK_TIMEOUT_MS = 5000

/** listTasks limit 档（§3.d 预裁：默认 50 上限 200） */
export const AI_TASK_LIST_DEFAULT_LIMIT = 50
export const AI_TASK_LIST_MAX_LIMIT = 200

export interface SubmitTaskRequest {
  sessionId: number
  action: AiTaskAction
  payload: unknown
  target?: { scope: 'paper' | 'lineage'; anchorId: string }
  idempotencyKey?: string
}

export interface RunTaskRequest {
  taskId: number
  /** dispatching session（回写面+message.* 围栏锚——DDL 无 session 列随请求携带） */
  sessionId: number
}

export interface ListTasksRequest {
  scope?: 'paper' | 'lineage'
  anchorId?: string
  status?: AiTaskRow['status']
  limit?: number
}

interface HandlerOutcome {
  /** result 字段 JSON（null=无结果面） */
  result: string | null
  /** 读动作回写文本（assistant 行 content；undefined=无回写） */
  writeback?: string
}

interface HandlerContext {
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
const TASK_HANDLER_TABLE: Record<AiTaskAction, TaskHandlerFactory> = {
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

export interface AiTasksService {
  submitTask(req: SubmitTaskRequest): Promise<AiTaskRow>
  runTask(req: RunTaskRequest): Promise<AiTaskRow>
  cancelTask(taskId: number): Promise<AiTaskRow>
  recoverInterruptedTasks(): Promise<number>
  listTasks(req: ListTasksRequest): Promise<AiTaskRow[]>
}

export interface AiTasksServiceDeps {
  repos: Repos
  now?: () => number
  /** handler 表覆盖（简报 §3.c 预留面——测试注入写后炸点/行为替换用；
   *  生产装配缺省=全 dispatch 表） */
  handlerOverrides?: Partial<Record<AiTaskAction, TaskHandlerFactory>>
}

export function createAiTasksService(deps: AiTasksServiceDeps): AiTasksService {
  const { repos } = deps
  const now = deps.now ?? Date.now
  const { aiTasks, aiSessions } = repos
  const handlers = TASK_HANDLER_ACTIONS.reduce(
    (acc, action) => {
      acc[action] = TASK_HANDLER_TABLE[action](repos)
      return acc
    },
    {} as Record<AiTaskAction, TaskHandler>
  )
  // 覆盖注入：键面经白名单守卫 fail-fast（r2 d1-delta-W1+k3-N3——构造期配置错即抛
  // 普通 Error，非 AiDomainError〔INVALID_REQUEST=请求域语义，装配期配置错不属之〕）；
  // 表外键运行时真兜底=submitTask 闸① includes 校验（类型收窄仅编译期约束）
  const overrides = (deps.handlerOverrides ?? {}) as Record<string, TaskHandlerFactory>
  for (const key of Object.keys(overrides)) {
    if (!AI_TASK_ACTIONS.includes(key as AiTaskAction)) {
      throw new Error(`handlerOverrides 非法动作键：${key}（白名单外）`)
    }
    handlers[key as AiTaskAction] = overrides[key]!(repos)
  }

  return {
    async submitTask(req) {
      // 闸① action 枚举（形态先于存在性——裁③）
      if (!AI_TASK_ACTIONS.includes(req.action)) {
        throw new AiDomainError('INVALID_REQUEST', '动作不在白名单（9 动作）')
      }
      // 闸② payload schema
      const payload = validatePayload(req.action, req.payload)
      // 闸③ 会话存在性
      const session = aiSessions.getSessionById(req.sessionId)
      if (session === null) {
        throw new AiDomainError('NOT_FOUND', '会话不存在')
      }
      // 幂等：同键已有任务→返回既有行（不抛不重执行）
      if (req.idempotencyKey !== undefined) {
        const existing = aiTasks.findByIdempotencyKey(req.idempotencyKey)
        if (existing !== null) return existing
      }
      // 目标围栏（W-2）
      let scope: 'paper' | 'lineage'
      let anchor: string
      if (req.target === undefined) {
        if (session.scope === 'global') {
          throw new AiDomainError('INVALID_REQUEST', '全局会话的任务必须显式声明目标')
        }
        scope = session.scope
        anchor = session.anchorId as string
      } else {
        if (req.target.scope !== 'paper' && req.target.scope !== 'lineage') {
          throw new AiDomainError('INVALID_REQUEST', '全局资源不可为任务目标')
        }
        if (req.target.anchorId === '') {
          throw new AiDomainError('INVALID_REQUEST', '任务目标锚不能为空')
        }
        scope = req.target.scope
        anchor = req.target.anchorId
        if (!aiSessions.anchorExists(scope, anchor)) {
          throw new AiDomainError('NOT_FOUND', '任务目标锚不存在')
        }
      }
      return aiTasks.insertQueued({
        scope,
        anchor,
        action: req.action,
        payloadJson: JSON.stringify(payload),
        idempotencyKey: req.idempotencyKey ?? null,
        submittedDetail: `target_resolved=(scope=${scope},anchor=${anchor}) action=${req.action}`
      })
    },

    async runTask(req) {
      const task = aiTasks.getById(req.taskId)
      if (task === null) {
        throw new AiDomainError('NOT_FOUND', '任务不存在')
      }
      if (!aiSessions.sessionExists(req.sessionId)) {
        throw new AiDomainError('NOT_FOUND', '会话不存在')
      }
      // 事务 A：守卫迁移+target_resolved 审计
      const running = aiTasks.transitionToRunning(
        task.id,
        `target_resolved=(scope=${task.scope},anchor=${task.anchorId})`
      )
      if (running === null) {
        throw new AiDomainError('CONFLICT', '任务不在可执行状态')
      }
      // 事务 B：SAVEPOINT→handler→检查点→终态（同事务原子）
      return aiTasks.runTaskTx((api) => {
        const start = now()
        api.savepointBegin()
        const ctx: HandlerContext = {
          task: running,
          target: { scope: running.scope, anchor: running.anchorId },
          sessionId: req.sessionId,
          audit: (kind, detail) => api.appendAudit(task.id, kind, detail)
        }
        let outcome: HandlerOutcome | null = null
        let handlerError: unknown = null
        try {
          outcome = handlers[task.action](
            ctx,
            JSON.parse(task.payload) as Record<string, unknown>
          )
        } catch (e) {
          handlerError = e
        }
        const finish: AiTaskFinalStatus =
          handlerError !== null
            ? 'failed'
            : now() - start > AI_TASK_TIMEOUT_MS
              ? 'timeout'
              : 'succeeded'
        if (finish !== 'succeeded') {
          api.savepointRollback()
          api.savepointRelease()
          if (finish === 'timeout') {
            const elapsed = now() - start
            return api.finalizeRunning(
              task.id,
              'timeout',
              { error: '任务超时' },
              { kind: 'timeout', detail: `耗时 ${elapsed}ms 超过 ${AI_TASK_TIMEOUT_MS}ms` }
            )
          }
          const msg = messageOf(handlerError)
          return api.finalizeRunning(
            task.id,
            'failed',
            { error: msg },
            { kind: 'failed', detail: truncateDetail(msg) }
          )
        }
        api.savepointRelease()
        // 成功路径：读动作回写（CAP→result_overflow 审计+仍 succeeded——N-6）
        let result = outcome!.result
        if (outcome!.writeback !== undefined) {
          try {
            aiSessions.insertWithEviction(req.sessionId, 'assistant', outcome!.writeback)
          } catch (e) {
            if (e instanceof SessionCapAllPinnedError) {
              api.appendAudit(task.id, 'result_overflow', truncateDetail(outcome!.writeback))
              result = null
            } else {
              throw e
            }
          }
        }
        return api.finalizeRunning(
          task.id,
          'succeeded',
          { result },
          { kind: 'succeeded', detail: `action=${task.action} 完成` }
        )
      })
    },

    async cancelTask(taskId) {
      const task = aiTasks.getById(taskId)
      if (task === null) {
        throw new AiDomainError('NOT_FOUND', '任务不存在')
      }
      const cancelled = aiTasks.cancelQueued(taskId, '用户取消')
      if (cancelled === null) {
        throw new AiDomainError('CONFLICT', '任务不在可取消状态')
      }
      return cancelled
    },

    async recoverInterruptedTasks() {
      return aiTasks.recoverInterrupted('interrupted')
    },

    async listTasks(req) {
      let limit = AI_TASK_LIST_DEFAULT_LIMIT
      if (req.limit !== undefined) {
        if (!Number.isInteger(req.limit) || req.limit < 1 || req.limit > AI_TASK_LIST_MAX_LIMIT) {
          throw new AiDomainError('INVALID_REQUEST', `limit 须 1-${AI_TASK_LIST_MAX_LIMIT} 整数`)
        }
        limit = req.limit
      }
      return aiTasks.listTasks({
        scope: req.scope ?? null,
        anchorId: req.anchorId ?? null,
        status: req.status ?? null,
        limit
      })
    }
  }
}
