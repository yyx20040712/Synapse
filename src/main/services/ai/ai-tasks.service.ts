/**
 * [F-DBCAMP-01 DB-2 U2b-1] ai-tasks.service —— 任务系统（§3.D 软件层代理化）：
 * submitTask/runTask/cancelTask/recoverInterruptedTasks/listTasks+9 动作 dispatch。
 * [U2b-2a] 9-handler dispatch 表外移 ai-tasks.handlers.ts（service 物理行禁膨胀
 * 约束〔裁决部 N-1〕——零行为变更；导出面加性带宽（新增 re-export——拆分后
 * 新增 re-export 行），消费方路径零动）+必接三件②③（d1-N3 非 CAP 回写映射+
 * d1-N9 运行期输入闸）。
 *
 * ── 行为层（提交面 §3.b） ──
 * - 三闸序=形态先于存在性（裁③）：①action∈9 白名单→②payload schema
 *   （ai-tasks.actions）→③会话存在性（NOT_FOUND「会话不存在」）→目标围栏。
 * - 运行期输入闸（U2b-2a §3.d③——d1-N9）：idempotencyKey 非 undefined 时必须
 *   非空 string（''/非串→INVALID_REQUEST「幂等键不能为空」——防空串 UNIQUE 语义
 *   漂移）；target.anchorId null/非串/空串→INVALID_REQUEST（防 DDL 原始异常
 *   泄漏——原仅拒 ''）；target.scope 非 paper/lineage 恒拒（if 链承载）。
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
 * - 成功路径拒写分支（N-6）：读动作结果经回写通道写 dispatching session
 *   （assistant 行，计入 50 上限）；遇 SessionCapAllPinnedError→结果转
 *   result_overflow 审计（detail=摘要截断 200 字符）+任务仍迁移 succeeded。
 * - 非 CAP 回写异常统一映射（U2b-2a §3.d②——d1-N3）：回写抛非 CAP 错→
 *   **任务转 failed 终态（回写面失败告知调用方）+mutation 保留**（SAVEPOINT 已
 *   release 随事务 B 提交——handler 变更有效；终态 failed+审计同事务原子）。
 *   原缺陷=throw e→事务 B 整体回滚→mutation 灭失+任务卡 running（事务 A 已提交
 *   running；重启前永久拒执行）。回写通道=deps.insertMessage 注入面（缺省=
 *   repos.aiSessions.insertWithEviction 直传——生产语义零变，先例 deps.now）。
 *   [r1 不采纳 d1-N6·已知残余登记] SAVEPOINT release 后至事务 B 提交间的提交期
 *   异常（SQLITE_BUSY/FULL 等）仍使事务 B 回滚→任务留 running 态——外层 catch
 *   转 failed 同样可能在该窗口失败（提交期异常非 catch 面可消），由启动恢复扫描
 *   （ai-recovery）兜底，best-effort 包装不采纳。
 * - dispatching session 经 runTask({taskId,sessionId}) 显式传入（020 DDL 冻结
 *   无 session 列——会话上下文随执行请求携带；executor 自裁申报在案）。
 *
 * ── 行为层（9 handler §3.e——ai-tasks.handlers.ts 外移件） ──
 * - 通用围栏：memory.* 的 memoryId 目标行必须属任务目标锚（scope+anchor 皆等，
 *   执行期判→failed 终态）；message.* 的 messageId 必须属 dispatching session。
 * - 审计 kind 集（冻结）：submitted/target_resolved/mutated/result_overflow/
 *   succeeded/failed/timeout/cancelled；mutated detail=before/after 摘要各截
 *   200 字符。
 *
 * ── 行为层（代理拉取预算闸 §3.d——U2b-2b P11） ──
 * - 回写文本（agent 信封）超有效上限→JSON.parse→尾部整行舍弃 rows 至 ≤上限或
 *   空→顶层加 truncated:true（保留原字段序）→JSON.stringify 同时用作 result 与
 *   writeback。非解析 JSON/无 rows 数组→原样通过（防御——result/writeback 均不动）。
 * - 有效上限=max(0,min(单发 800,轮 2000−pulledSoFar))；轮=自最近 user 消息起
 *   的代理信封行 ΣestimateTokens（无 user 行=会话全量——user 行重置轮）；信封
 *   识别谓词 isAgentEnvelope 单源在 ai-tail.service（INV-130——禁两处复制）。
 * - 拟合口径：rows 舍弃循环的测量**含 truncated:true 标记**（最终落库文本即预
 *   算面——边界行恰满时标记自身占位优先）。deps.pullCaps 注入=测试面；实施点
 *   =本件回写路径（handlers 零触碰）；审计面零新 kind。
 * - 闸下界〔r1 R-W1〕=骨架信封（rows:[] + truncated:true，≈14-16 tok）——cap=0
 *   时落库骨架属票面「或 rows 空」明文兜底；轮累计可微量越 2000（骨架量级，
 *   ~14 tok/发——既知接受面：骨架携带 count/truncated 使消费方可感知截断态）。
 *
 * ── 行为层（listTasks §3.d——运行期输入闸） ──
 * - status 非 undefined 时∈6 态集（外值→INVALID_REQUEST「任务状态值非法」——防
 *   任意串透传 SQL）；scope 非 undefined 时∈{paper,lineage}（运行时校验——原仅
 *   类型标注）；limit 1-200 既有校验。
 *
 * ── 架构层 ──
 * - SQL 全在 repo（service 零 SQL）；错误语义归 service；AiDomainError 复用
 *   AppErrorCode 既有码（禁新增封闭枚举——shared 零改动）。
 *
 * ── 文化层 ──
 * - 测试：tests/unit/services/ai-tasks-submit.service.test.ts（三闸+幂等+三方
 *   对齐+输入闸）+ai-tasks-run.service.test.ts（状态机+handler+超时+恢复+回写
 *   映射）。
 */
import type { AiTaskAction, AiTaskFinalStatus, AiTaskRow, AiTaskStatus } from '../../db/repos/ai-tasks.repo'
import type { AiMessageRow } from '../../db/repos/ai-sessions.repo'
import type { Repos } from '../../db/repos'
import { SessionCapAllPinnedError } from '../../db/repos/ai-sessions.repo'
import { estimateTokens } from './ai-estimate'
import { isAgentEnvelope } from './ai-tail.service'
import { AiDomainError } from './ai-sessions.service'
import { AI_TASK_ACTIONS, messageOf, truncateDetail, validatePayload } from './ai-tasks.actions'
import {
  TASK_HANDLER_ACTIONS,
  TASK_HANDLER_TABLE,
  type HandlerContext,
  type HandlerOutcome,
  type TaskHandler,
  type TaskHandlerFactory
} from './ai-tasks.handlers'

// 外移件导出面加性带宽（新增 re-export——消费方路径零动；r1 k3-N1+d1-N9 措辞）
export type {
  HandlerContext,
  HandlerOutcome,
  TaskHandler,
  TaskHandlerFactory
} from './ai-tasks.handlers'
export { TASK_HANDLER_ACTIONS, TASK_HANDLER_TABLE } from './ai-tasks.handlers'

/** 超时阈值（§3.c 默认 5000——deps.now 注入可测） */
export const AI_TASK_TIMEOUT_MS = 5000

/** listTasks limit 档（§3.d 预裁：默认 50 上限 200） */
export const AI_TASK_LIST_DEFAULT_LIMIT = 50
export const AI_TASK_LIST_MAX_LIMIT = 200

/** 代理拉取单发上限（§3.d P11——单任务回写信封预算；deps.pullCaps 注入可测） */
export const AGENT_PULL_SINGLE_CAP = 800

/** 代理拉取轮上限（§3.d P11——自最近 user 消息起的轮内累计预算） */
export const AGENT_PULL_ROUND_CAP = 2000

/** listTasks status 合法集（DDL CHECK 同源——运行期闸防任意串透传 SQL；
 *  导出面=R29 sqlite_master 对账断言消费〔r1 k3-N3+d1-N7〕） */
export const TASK_STATUSES: readonly AiTaskStatus[] = [
  'queued',
  'running',
  'succeeded',
  'failed',
  'timeout',
  'cancelled'
]

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
  /** 回写通道注入面（U2b-2a §3.d②——d1-N3 可测性；缺省=insertWithEviction
   *  直传，生产语义零变——先例 deps.now）。
   *  [r1 d1-W3 销+契约注] 失败不得留半写：上游 insertWithEviction=db.transaction
   *  三步单事务（计数→汰旧→插入——嵌套进本层事务 B 时 SAVEPOINT 化，任一步抛
   *  即整体回滚零半写残留）；注入实现须承同一契约（主控亲验销在案） */
  insertMessage?: (sessionId: number, role: 'user' | 'assistant', content: string) => AiMessageRow
  /** 拉取预算闸注入面（U2b-2b §3.d——P11 可测性；缺省=冻结常量 800/2000） */
  pullCaps?: { single: number; round: number }
}

/** 轮内已拉取量（§3.d P11）：自最近 user 消息起（新到旧扫至首条 user 行）代理
 *  信封行 ΣestimateTokens；无 user 行=会话全量。信封识别=isAgentEnvelope 单源
 *  复用（INV-130——禁两处复制）。 */
function sumAgentPulled(messages: AiMessageRow[]): number {
  let sum = 0
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]!
    if (m.role === 'user') break
    if (m.role === 'assistant' && isAgentEnvelope(m.content)) sum += estimateTokens(m.content)
  }
  return sum
}

/** 信封收缩（§3.d P11）：尾部整行舍弃 rows 至 ≤cap 或空→顶层加 truncated:true
 *  （保留原字段序——rows 键位不动、truncated 追加）→JSON.stringify。测量含
 *  truncated 标记（最终落库文本即预算面）。非解析 JSON/非对象/无 rows 数组→
 *  null=原样通过（防御）。
 *  〔r1 R-N6〕count 截断语义：count 保留**原始命中数**（不随 rows 舍弃回写）——
 *  截断后实际行数=rows.length；truncated 消费方按 rows.length 取数（count=
 *  「曾命中多少」的审计语义，非「本信封含多少」）。 */
function shrinkEnvelopeToCap(text: string, cap: number): string | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return null
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return null
  const obj = parsed as Record<string, unknown>
  if (!Array.isArray(obj.rows)) return null
  const rows = obj.rows as unknown[]
  let keep = rows.length
  obj.rows = rows.slice(0, keep)
  obj.truncated = true
  let out = JSON.stringify(obj)
  while (keep > 0 && estimateTokens(out) > cap) {
    keep -= 1
    obj.rows = rows.slice(0, keep)
    out = JSON.stringify(obj)
  }
  return out
}

export function createAiTasksService(deps: AiTasksServiceDeps): AiTasksService {
  const { repos } = deps
  const now = deps.now ?? Date.now
  const insertMessage =
    deps.insertMessage ??
    ((sessionId: number, role: 'user' | 'assistant', content: string) =>
      repos.aiSessions.insertWithEviction(sessionId, role, content))
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
      // 运行期输入闸（d1-N9）：幂等键非 undefined 必须非空 string。
      // [r2 位序定档] 本闸位于闸③（会话存在性）后——与目标围栏同构（附加校验面
      // 非三闸前移）；「形态先于存在性」全序约束的三闸本体序不变。
      if (req.idempotencyKey !== undefined) {
        if (typeof req.idempotencyKey !== 'string' || req.idempotencyKey === '') {
          throw new AiDomainError('INVALID_REQUEST', '幂等键不能为空')
        }
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
        // 输入闸（r1 d1-N8）：target null/非对象原会透传本分支读 null.scope=
        // TypeError——前置形态闸收口为域错误（防裸异常泄漏）
        if (req.target === null || typeof req.target !== 'object') {
          throw new AiDomainError('INVALID_REQUEST', '任务目标非法')
        }
        if (req.target.scope !== 'paper' && req.target.scope !== 'lineage') {
          throw new AiDomainError('INVALID_REQUEST', '全局资源不可为任务目标')
        }
        // 输入闸（d1-N9）：anchorId null/非串/空串→INVALID_REQUEST（防 DDL 泄漏）
        if (
          req.target.anchorId === null ||
          typeof req.target.anchorId !== 'string' ||
          req.target.anchorId === ''
        ) {
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
        // 成功路径：读动作回写（U2b-2b §3.d 先过代理拉取预算闸；CAP→result_overflow
        // 审计+仍 succeeded——N-6；非 CAP→failed 终态+mutation 保留——d1-N3 统一映射）
        let result = outcome!.result
        let writeback = outcome!.writeback
        if (writeback !== undefined) {
          const singleCap = deps.pullCaps?.single ?? AGENT_PULL_SINGLE_CAP
          const roundCap = deps.pullCaps?.round ?? AGENT_PULL_ROUND_CAP
          const pulledSoFar = sumAgentPulled(aiSessions.listMessages(req.sessionId))
          const effectiveCap = Math.max(0, Math.min(singleCap, roundCap - pulledSoFar))
          if (estimateTokens(writeback) > effectiveCap) {
            const shrunk = shrinkEnvelopeToCap(writeback, effectiveCap)
            if (shrunk !== null) {
              writeback = shrunk
              result = shrunk
            }
          }
          try {
            insertMessage(req.sessionId, 'assistant', writeback)
          } catch (e) {
            if (e instanceof SessionCapAllPinnedError) {
              api.appendAudit(task.id, 'result_overflow', truncateDetail(writeback))
              result = null
            } else {
              // 非 CAP 回写失败：handler 变更有效（SAVEPOINT 已 release 随事务
              // 提交），任务转 failed 终态（回写面失败告知调用方）——d1-N3
              const failMsg = `结果回写失败: ${messageOf(e)}`
              return api.finalizeRunning(
                task.id,
                'failed',
                { error: failMsg },
                { kind: 'failed', detail: truncateDetail(failMsg) }
              )
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
      // 运行期输入闸（d1-N9）：status∈6 态集/scope∈两值集（防任意串透传 SQL）
      if (req.status !== undefined && !TASK_STATUSES.includes(req.status)) {
        throw new AiDomainError('INVALID_REQUEST', '任务状态值非法')
      }
      if (req.scope !== undefined && req.scope !== 'paper' && req.scope !== 'lineage') {
        throw new AiDomainError('INVALID_REQUEST', '任务范围值非法（仅 paper/lineage）')
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
