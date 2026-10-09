/**
 * [F-DBCAMP-01 DB-2 U2b-1] ai-tasks.rows —— ai_tasks/ai_task_audit 行形状+枚举
 * 类型+列常量+行映射（自 ai-tasks.repo 拆出：repo 文件 300 行上限拆件，
 * check-quality 关卡强制——本批 quality 门超限拆分〔收口 DoD r3〕；沿
 * lineage.repo.rows.ts 先例，本件=纯映射/形状零 SQL，语句族与事务结构仍在
 * ai-tasks.repo 主件）。
 * 行为语义注记见 ai-tasks.repo 头注（状态机/审计/事务结构——本件零承载）。
 */

/** 9 动作白名单类型面（DDL CHECK 同源枚举——常量 AI_TASK_ACTIONS 在服务层） */
export type AiTaskAction =
  | 'memory.create'
  | 'memory.update'
  | 'memory.delete'
  | 'memory.pin'
  | 'memory.unpin'
  | 'memory.search'
  | 'memory.list'
  | 'message.pin'
  | 'message.unpin'

/** 6 态（020 CHECK 同源） */
export type AiTaskStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'timeout' | 'cancelled'

/** 任务终态集（事务 B 回写面） */
export type AiTaskFinalStatus = 'succeeded' | 'failed' | 'timeout'

export interface AiTaskRow {
  id: number
  idempotencyKey: string | null
  scope: 'paper' | 'lineage'
  anchorId: string
  action: AiTaskAction
  payload: string
  status: AiTaskStatus
  result: string | null
  error: string | null
  createdAt: string
  updatedAt: string
}

export interface TaskAuditRow {
  id: number
  taskId: number
  seq: number
  kind: string
  detail: string | null
  createdAt: string
}

export interface RawTaskRow {
  id: number
  idempotency_key: string | null
  scope: 'paper' | 'lineage'
  anchor_id: string
  action: AiTaskAction
  payload: string
  status: AiTaskStatus
  result: string | null
  error: string | null
  created_at: string
  updated_at: string
}

export interface RawAuditRow {
  id: number
  task_id: number
  seq: number
  kind: string
  detail: string | null
  created_at: string
}

export const TASK_COLS = `id, idempotency_key, scope, anchor_id, action, payload, status, result, error, created_at, updated_at`

/** 蛇形→驼峰任务行映射（单源——CRUD/守卫迁移/终态回写/listTasks 共用） */
export function toTaskRow(r: RawTaskRow): AiTaskRow {
  return {
    id: r.id,
    idempotencyKey: r.idempotency_key,
    scope: r.scope,
    anchorId: r.anchor_id,
    action: r.action,
    payload: r.payload,
    status: r.status,
    result: r.result,
    error: r.error,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  }
}

/** 蛇形→驼峰审计行映射（单源——listAudit 读面） */
export function toAuditRow(r: RawAuditRow): TaskAuditRow {
  return {
    id: r.id,
    taskId: r.task_id,
    seq: r.seq,
    kind: r.kind,
    detail: r.detail,
    createdAt: r.created_at
  }
}
