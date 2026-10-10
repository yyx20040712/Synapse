/**
 * [F-DBCAMP-01 DB-2 U2b-1] ai-task-audit.repo —— ai_task_audit 审计原语+事务 B
 * 执行载体契约（自 ai-tasks.repo 拆出：repo 文件 300 行上限拆件，check-quality
 * 关卡强制——本批 quality 门超限拆分〔收口 DoD r3〕；主控预授权第二步「审计原语
 * 独立工厂 createAiTaskAuditRepo，ai-tasks.repo 组装消费」）。
 *
 * ── 行为层（继承 ai-tasks.repo 头注相关段） ──
 * - 审计（append-only 只 INSERT——G2 触发器禁改删，DDL 面锁定）：每迁移一行+
 *   mutated/result_overflow 中间行；seq=MAX(seq)+1（预编译子查询——单连接同步
 *   语义同事务内安全）；跨任务独立（UNIQUE(task_id,seq) 兜底）。
 * - TaskExecutionApi=事务 B 执行载体契约（savepoint 三原语+审计+终态回写——
 *   service 零 SQL；实现体〔runTaskTx/sp 语句/finalizeRunning〕在 ai-tasks.repo
 *   主件事务结构内，经本契约面消费）。
 * - 同连接组装：createAiTasksRepo 内构造本工厂，语句预编译于同一 db——事务
 *   A/B 闭包内调用即加入同事务（单连接同步语义）。
 *
 * ── 文化层 ──
 * - 全语句 db.prepare 预编译+参数绑定；测试面=tests/unit/db/repos/ai-tasks.repo.test.ts
 *   （经 AiTasksRepo 组装面承载——本件无独立测试文件）。
 */
import type { SqliteDb } from '../connection'
import type { AiTaskFinalStatus, AiTaskRow, RawAuditRow, TaskAuditRow } from './ai-tasks.rows'
import { toAuditRow } from './ai-tasks.rows'

/** 事务 B 执行载体 API（service 零 SQL——savepoint/终态/审计原语在 repo 层） */
export interface TaskExecutionApi {
  /** SAVEPOINT 开点（handler 变异回滚锚点） */
  savepointBegin(): void
  /** ROLLBACK TO SAVEPOINT（超时/失败路径——handler 变异灭失） */
  savepointRollback(): void
  /** RELEASE SAVEPOINT（成功路径——变异保留入事务 B） */
  savepointRelease(): void
  /** 审计中间行（mutated/result_overflow——savepoint 外调用） */
  appendAudit(taskId: number, kind: string, detail: string): void
  /** 终态回写+审计行（同事务原子；守卫 status='running'） */
  finalizeRunning(
    taskId: number,
    status: AiTaskFinalStatus,
    fields: { result?: string | null; error?: string | null },
    audit: { kind: string; detail: string }
  ): AiTaskRow
}

/** 审计原语面（append-only 只 INSERT+读面——组装消费=ai-tasks.repo） */
export interface AiTaskAuditRepo {
  /** @internal 服务层经 runTaskTx 内 api 消费，顶层口=测试/恢复扫描消费面——禁新
   *  服务直调（类型收窄挂账 U2b-2） */
  appendAudit(taskId: number, kind: string, detail: string): void
  /** @internal 服务层经 runTaskTx 内 api 消费，顶层口=测试/审计抽屉读面——禁新
   *  服务直调（类型收窄挂账 U2b-2） */
  listAudit(taskId: number): TaskAuditRow[]
  /** [F-DBCAMP-01 DB-2 U2] 游标翻页读（seq>afterSeq 升序+limit——UI 审计抽屉面；
   *  幽灵 taskId=空 rows〔append-only 读面不设存在性前置——服务层注释声明〕） */
  listAuditPage(taskId: number, afterSeq: number, limit: number): TaskAuditRow[]
}

export function createAiTaskAuditRepo(db: SqliteDb): AiTaskAuditRepo {
  // 审计 seq=MAX(seq)+1 经预编译子查询（单连接同步语义——同事务内安全）
  const appendAuditStmt = db.prepare(
    `INSERT INTO ai_task_audit (task_id, seq, kind, detail, created_at)
     VALUES (?, (SELECT COALESCE(MAX(seq), 0) + 1 FROM ai_task_audit WHERE task_id = ?), ?, ?, ?)`
  )
  const listAuditStmt = db.prepare(
    `SELECT id, task_id, seq, kind, detail, created_at FROM ai_task_audit
     WHERE task_id = ? ORDER BY seq ASC`
  )
  const listAuditPageStmt = db.prepare(
    `SELECT id, task_id, seq, kind, detail, created_at FROM ai_task_audit
     WHERE task_id = ? AND seq > ? ORDER BY seq ASC LIMIT ?`
  )

  return {
    appendAudit(taskId, kind, detail) {
      appendAuditStmt.run(taskId, taskId, kind, detail, new Date().toISOString())
    },

    listAudit(taskId) {
      return (listAuditStmt.all(taskId) as RawAuditRow[]).map(toAuditRow)
    },

    listAuditPage(taskId, afterSeq, limit) {
      return (listAuditPageStmt.all(taskId, afterSeq, limit) as RawAuditRow[]).map(toAuditRow)
    }
  }
}
