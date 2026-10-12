/**
 * [F-DBCAMP-01 DB-2 UI U3] AI 域种子包装（e2e-env.ts 同型——子进程跑
 * seed-ai-domain.mjs；设计 §5.0 七函数全集一次落齐：本批 E1 仅消费
 * seedCollectionRow，其余函数=U4-U6 承接面）。
 *
 * 函数签名=020 DDL 实照（设计 §5.0 字面与 §3.3-补 接缝：task 无 sessionId、
 * 行级平铺 scope+anchorId、字段名 status/result；audit=detail 单字段——
 * before/after 内嵌 detail 文本由 U4 消费侧组装）。锚对象行复用既有
 * seedPaperRow/seedCollectionRow（本件 seedCollectionRow=collections 新行，
 * uuid 由脚本 crypto.randomUUID() 生成回传——不经调用侧）。
 * 禁 test-only IPC（Q4 裁——e2e-env 直写 DB 先例族）。
 */
import { spawn } from 'node:child_process'
import { join } from 'node:path'

export type AiSeedScope = 'paper' | 'lineage' | 'global'
export type AiSeedOrigin = 'manual' | 'agent'

/** 单次脚本执行结果按序回传（collection→{id} 等——脚本 stdout JSON 数组） */
async function runAiSeed<T>(userData: string, ops: unknown[]): Promise<T[]> {
  return await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [join(process.cwd(), 'tests', 'e2e', 'seed-ai-domain.mjs')], {
      env: {
        ...process.env,
        SEED_DB: join(userData, 'synapse.db'),
        SEED_AI_JSON: JSON.stringify(ops)
      } as NodeJS.ProcessEnv,
      stdio: ['ignore', 'pipe', 'inherit']
    })
    let out = ''
    child.stdout.on('data', (c: Buffer) => {
      out += c.toString('utf8')
    })
    child.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`seed-ai-domain.mjs 退出码 ${code ?? 'null'}`))
        return
      }
      try {
        resolve(JSON.parse(out) as T[])
      } catch (e) {
        reject(e instanceof Error ? e : new Error(String(e)))
      }
    })
    child.on('error', reject)
  })
}

/** 首结果守卫（脚本按序回传与 ops 等长数组——缺项=协议破裂即响亮失败） */
function first<T>(rows: T[]): T {
  const r = rows[0]
  if (r === undefined) {
    throw new Error('seed-ai-domain: 回传结果缺失（stdout 非法）')
  }
  return r
}

/** collections 新行（不触碰 '__main__'）→回传生成的 id（uuid） */
export async function seedCollectionRow(userData: string, name: string): Promise<string> {
  const r = first(await runAiSeed<{ id: string }>(userData, [{ op: 'collection', name }]))
  return r.id
}

/** ai_sessions 行 → id（scope/anchorId 满足 020 条件 CHECK 矩阵由调用侧保证） */
export async function seedAiSession(
  userData: string,
  scope: AiSeedScope,
  anchorId: string | null
): Promise<number> {
  const r = first(await runAiSeed<{ id: number }>(userData, [{ op: 'session', scope, anchorId }]))
  return r.id
}

export interface AiMessageSeed {
  role: 'user' | 'assistant'
  content: string
  pinned?: boolean
}

/** ai_messages 行（挂 sessionId）→ id */
export async function seedAiMessage(userData: string, sessionId: number, row: AiMessageSeed): Promise<number> {
  const r = first(
    await runAiSeed<{ id: number }>(userData, [
      { op: 'message', sessionId, role: row.role, content: row.content, pinned: row.pinned === true }
    ])
  )
  return r.id
}

export interface AiTaskSeed {
  action: string
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'timeout' | 'cancelled'
  result?: string | null
  error?: string | null
}

/** ai_tasks 行（行级平铺 scope+anchorId——020 无 session_id 列）→ id */
export async function seedAiTask(
  userData: string,
  scope: 'paper' | 'lineage',
  anchorId: string,
  row: AiTaskSeed
): Promise<number> {
  const r = first(
    await runAiSeed<{ id: number }>(userData, [
      { op: 'task', scope, anchorId, action: row.action, status: row.status, result: row.result ?? null, error: row.error ?? null }
    ])
  )
  return r.id
}

/** ai_task_audit 行（detail 单字段——kind 值域=服务层冻结 8 值由调用侧保证） */
export async function seedAiAuditRow(
  userData: string,
  taskId: number,
  seq: number,
  kind: string,
  detail?: string | null
): Promise<void> {
  await runAiSeed(userData, [{ op: 'audit', taskId, seq, kind, detail: detail ?? null }])
}

export interface AiMemorySeed {
  scope: AiSeedScope
  anchorId: string | null
  category: string
  title: string
  content: string
  pinned?: boolean
  origin?: AiSeedOrigin
  label?: string | null
}

/** ai_memory 行（category 档级值域由调用侧保证——020 条件 CHECK）→ id */
export async function seedAiMemory(userData: string, row: AiMemorySeed): Promise<number> {
  const r = first(
    await runAiSeed<{ id: number }>(userData, [
      {
        op: 'memory',
        scope: row.scope,
        anchorId: row.anchorId,
        category: row.category,
        title: row.title,
        content: row.content,
        pinned: row.pinned === true,
        origin: row.origin ?? 'manual',
        label: row.label ?? null
      }
    ])
  )
  return r.id
}

/** 该任务审计行计数（E5 级联后「审计恒存」断言面） */
export async function readAiAuditCount(userData: string, taskId: number): Promise<number> {
  const r = first(await runAiSeed<{ count: number }>(userData, [{ op: 'auditCount', taskId }]))
  return r.count
}
