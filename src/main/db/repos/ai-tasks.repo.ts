/**
 * [F-DBCAMP-01 DB-2 U2b-1] ai-tasks.repo —— 任务行 CRUD+审计只 INSERT+幂等查询
 * +恢复扫描原语（020 ai_tasks/ai_task_audit）。
 * [r3 拆分注记] 行形状/枚举类型/列常量/行映射外移 ai-tasks.rows.ts+审计原语与
 * TaskExecutionApi 契约外移 ai-task-audit.repo.ts（repo 300 行上限——check-quality
 * 关卡；导出面经本件 re-export 零变——消费方 import 路径不动；审计件=同连接组装，
 * 事务闭包内调用即同事务）。
 *
 * ── 行为层 ──
 * - 状态机（§3.C 6 态）：迁移律=queued→running→{succeeded|failed|timeout}+
 *   queued→cancelled；守卫 UPDATE（WHERE id=? AND status=<期望源态>——changes=0
 *   即拒，非期望源态零行变更零审计）承载全部非法迁移拒绝（25 拒面——服务层
 *   只见 null 分流 CONFLICT）。running 不可取消（v1）。
 * - 审计（append-only 只 INSERT——G2 触发器禁改删，DDL 面锁定）：每迁移一行+
 *   mutated/result_overflow 中间行；seq=MAX(seq)+1（预编译子查询——单连接同步
 *   语义同事务内安全）；跨任务独立（UNIQUE(task_id,seq) 兜底）——原语件=
 *   ai-task-audit.repo（组装消费）。
 * - 事务结构（§3.C 冻结案）：事务 A=transitionToRunning（守卫迁移+target_resolved
 *   审计）；事务 B=runTaskTx 载体（db.transaction）+SAVEPOINT 三原语
 *   （begin/rollback/release——超时零副作用承诺的回滚锚点；预编译无参语句）；
 *   终态回写=finalizeRunning（status/result/error+审计行同事务原子）。
 * - 恢复扫描：recoverInterrupted=running→failed(error='interrupted') 一次性
 *   扫描（逐行守卫 UPDATE+failed 审计行；写的是 ai_tasks 行非审计面——G2 合法）。
 * - listTasks：过滤面（scope/anchorId/status 全可缺省）经 IS NULL OR 固定语句
 *   承载（无动态 SQL 拼接）；序=id DESC；limit 缺省 50 上限 200（服务层钳制面）。
 * - 时间戳=应用层 new Date().toISOString()（U2a 头注先例）。
 *
 * ── 文化层 ──
 * - 全语句 db.prepare 预编译+参数绑定；审计 seq 取 MAX(seq)+1 经预编译子查询。
 * - 测试：tests/unit/db/repos/ai-tasks.repo.test.ts（always-active 真库夹具）。
 */
import type { SqliteDb } from '../connection'
import { createAiTaskAuditRepo, type TaskExecutionApi } from './ai-task-audit.repo'
import {
  TASK_COLS,
  toTaskRow as toTask,
  type AiTaskAction,
  type AiTaskFinalStatus,
  type AiTaskRow,
  type RawTaskRow,
  type TaskAuditRow
} from './ai-tasks.rows'

// 导出面零变（拆分前本件导出的类型经 re-export 承载——消费方路径不动）
export type {
  AiTaskAction,
  AiTaskFinalStatus,
  AiTaskRow,
  AiTaskStatus,
  TaskAuditRow
} from './ai-tasks.rows'
export type { TaskExecutionApi } from './ai-task-audit.repo'

export interface AiTasksRepo {
  getById(taskId: number): AiTaskRow | null
  findByIdempotencyKey(key: string): AiTaskRow | null
  /** 插入+审计 submitted 行（detail 含 target_resolved 描述符——同事务） */
  insertQueued(input: {
    scope: 'paper' | 'lineage'
    anchor: string
    action: AiTaskAction
    payloadJson: string
    idempotencyKey?: string | null
    submittedDetail: string
  }): AiTaskRow
  /** 事务 A：守卫迁移 queued→running+target_resolved 审计（非 queued → null） */
  transitionToRunning(taskId: number, detail: string): AiTaskRow | null
  /** 守卫迁移 queued→cancelled+cancelled 审计（非 queued → null） */
  cancelQueued(taskId: number, detail: string): AiTaskRow | null
  /** 事务 B 载体：fn 内语句原子（fn 抛错整体回滚——fn 不应抛，终态面经 api 承载） */
  runTaskTx<T>(fn: (api: TaskExecutionApi) => T): T
  /** @internal 服务层经 runTaskTx 内 api 消费，顶层口=测试/恢复扫描消费面——禁新
   *  服务直调（类型收窄挂账 U2b-2） */
  appendAudit(taskId: number, kind: string, detail: string): void
  /** @internal 服务层经 runTaskTx 内 api 消费，顶层口=测试/恢复扫描消费面——禁新
   *  服务直调（类型收窄挂账 U2b-2）——审计中间行直写（独立小事务） */
  finalizeRunning(
    taskId: number,
    status: AiTaskFinalStatus,
    fields: { result?: string | null; error?: string | null },
    audit: { kind: string; detail: string }
  ): AiTaskRow
  /** 恢复扫描：running→failed(interrupted) 计数（逐行审计） */
  recoverInterrupted(detail: string): number
  /** 读面（UI 预备；序 id DESC；limit 缺省 50 上限 200 由服务层钳制） */
  listTasks(filter: {
    scope?: string | null
    anchorId?: string | null
    status?: string | null
    limit?: number
  }): AiTaskRow[]
  /** @internal 服务层经 runTaskTx 内 api 消费，顶层口=测试/审计抽屉读面——禁新
   *  服务直调（类型收窄挂账 U2b-2） */
  listAudit(taskId: number): TaskAuditRow[]
}

export function createAiTasksRepo(db: SqliteDb): AiTasksRepo {
  // 审计原语件（同连接组装——事务闭包内调用即加入同事务）
  const audit = createAiTaskAuditRepo(db)
  const appendAudit = audit.appendAudit

  const byIdStmt = db.prepare(`SELECT ${TASK_COLS} FROM ai_tasks WHERE id = ?`)
  const byKeyStmt = db.prepare(`SELECT ${TASK_COLS} FROM ai_tasks WHERE idempotency_key = ?`)
  const insertStmt = db.prepare(
    `INSERT INTO ai_tasks (idempotency_key, scope, anchor_id, action, payload, status,
       created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'queued', ?, ?)`
  )
  const toRunningStmt = db.prepare(
    `UPDATE ai_tasks SET status = 'running', updated_at = ? WHERE id = ? AND status = 'queued'`
  )
  const toCancelledStmt = db.prepare(
    `UPDATE ai_tasks SET status = 'cancelled', updated_at = ? WHERE id = ? AND status = 'queued'`
  )
  const finalizeStmt = db.prepare(
    `UPDATE ai_tasks SET status = ?, result = ?, error = ?, updated_at = ?
     WHERE id = ? AND status = 'running'`
  )
  // 过滤面=固定语句（IS NULL OR 承载缺省——无动态 SQL 拼接）
  const listStmt = db.prepare(
    `SELECT ${TASK_COLS} FROM ai_tasks
     WHERE (? IS NULL OR scope = ?) AND (? IS NULL OR anchor_id = ?)
       AND (? IS NULL OR status = ?)
     ORDER BY id DESC LIMIT ?`
  )
  const spBeginStmt = db.prepare(`SAVEPOINT ai_task_handler_sp`)
  const spRollbackStmt = db.prepare(`ROLLBACK TO ai_task_handler_sp`)
  const spReleaseStmt = db.prepare(`RELEASE ai_task_handler_sp`)
  const runningIdsStmt = db.prepare(`SELECT id FROM ai_tasks WHERE status = 'running' ORDER BY id`)

  function fresh(taskId: number): AiTaskRow {
    return toTask(byIdStmt.get(taskId) as RawTaskRow)
  }

  // 事务 A：守卫迁移+审计（changes=0 → null 零审计）
  const transitionTx = db.transaction(
    (stmt: typeof toRunningStmt | typeof toCancelledStmt, taskId: number, kind: string, detail: string) => {
      const info = stmt.run(new Date().toISOString(), taskId)
      if (info.changes === 0) return null
      appendAudit(taskId, kind, detail)
      return fresh(taskId)
    }
  )

  // 终态回写（守卫 running）+审计——runTaskTx 内经 api 复用（同事务），
  // 顶层暴露面=独立小事务（审计/终态原子）
  function finalizeRunning(
    taskId: number,
    status: AiTaskFinalStatus,
    fields: { result?: string | null; error?: string | null },
    auditRow: { kind: string; detail: string }
  ): AiTaskRow {
    const info = finalizeStmt.run(
      status,
      fields.result ?? null,
      fields.error ?? null,
      new Date().toISOString(),
      taskId
    )
    if (info.changes === 0) {
      throw new Error(`任务终态回写失败（非 running 态）：task=${taskId}`)
    }
    appendAudit(taskId, auditRow.kind, auditRow.detail)
    return fresh(taskId)
  }

  const finalizeTx = db.transaction(
    (
      taskId: number,
      status: AiTaskFinalStatus,
      fields: { result?: string | null; error?: string | null },
      auditRow: { kind: string; detail: string }
    ) => finalizeRunning(taskId, status, fields, auditRow)
  )

  // 事务 B 载体（fn 抛错=整体回滚；终态/审计经 api 原语承载）——
  // better-sqlite3 Transaction<> 类型面泛型擦除，经 unknown 载体+类型化壳承载
  const runTaskTxRaw = db.transaction((fn: (api: TaskExecutionApi) => unknown): unknown => {
    const api: TaskExecutionApi = {
      savepointBegin: () => spBeginStmt.run(),
      savepointRollback: () => spRollbackStmt.run(),
      savepointRelease: () => spReleaseStmt.run(),
      appendAudit,
      finalizeRunning
    }
    return fn(api)
  })
  const runTaskTx = <T>(fn: (api: TaskExecutionApi) => T): T => runTaskTxRaw(fn) as T

  // 恢复扫描：逐行守卫迁移+failed 审计（ai_tasks 写面——G2 审计触发器不受触）
  const recoverTx = db.transaction((detail: string): number => {
    const ids = (runningIdsStmt.all() as Array<{ id: number }>).map((r) => r.id)
    for (const id of ids) {
      const info = finalizeStmt.run(
        'failed',
        null,
        'interrupted',
        new Date().toISOString(),
        id
      )
      if (info.changes > 0) appendAudit(id, 'failed', detail)
    }
    return ids.length
  })

  // 插入+submitted 审计（同事务）
  const insertTx = db.transaction(
    (input: {
      scope: 'paper' | 'lineage'
      anchor: string
      action: AiTaskAction
      payloadJson: string
      idempotencyKey?: string | null
      submittedDetail: string
    }): AiTaskRow => {
      const now = new Date().toISOString()
      const info = insertStmt.run(
        input.idempotencyKey ?? null,
        input.scope,
        input.anchor,
        input.action,
        input.payloadJson,
        now,
        now
      )
      const taskId = Number(info.lastInsertRowid)
      appendAudit(taskId, 'submitted', input.submittedDetail)
      return fresh(taskId)
    }
  )

  return {
    getById(taskId) {
      const row = byIdStmt.get(taskId) as RawTaskRow | undefined
      return row === undefined ? null : toTask(row)
    },

    findByIdempotencyKey(key) {
      const row = byKeyStmt.get(key) as RawTaskRow | undefined
      return row === undefined ? null : toTask(row)
    },

    insertQueued: insertTx,

    transitionToRunning(taskId, detail) {
      return transitionTx(toRunningStmt, taskId, 'target_resolved', detail)
    },

    cancelQueued(taskId, detail) {
      return transitionTx(toCancelledStmt, taskId, 'cancelled', detail)
    },

    runTaskTx,

    appendAudit,

    finalizeRunning: finalizeTx,

    recoverInterrupted: recoverTx,

    listTasks(filter) {
      const limit = filter.limit ?? 50
      const params = [
        filter.scope ?? null,
        filter.scope ?? null,
        filter.anchorId ?? null,
        filter.anchorId ?? null,
        filter.status ?? null,
        filter.status ?? null,
        limit
      ]
      return (listStmt.all(...params) as RawTaskRow[]).map(toTask)
    },

    listAudit: audit.listAudit
  }
}
