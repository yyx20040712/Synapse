/**
 * [F-DBCAMP-01 DB-2 UI U3] AI 域种子落库子进程脚本——由 tests/e2e/ai-seed.ts
 * 拉起（seed-paper.mjs / seed-lineage.mjs 同型：独立进程避 Windows 原生模块
 * 文件锁，载荷经 SEED_AI_JSON 环境变量传入不经 shell，SQL 一律 prepare 预编译
 * +参数绑定；better-sqlite3 13 N-API 单绑定跨 ABI——子进程直连即可）。
 *
 * 载荷（SEED_AI_JSON）=op 数组，逐项执行；结果按序打印 JSON 数组到 stdout
 * （collection→{id}=crypto.randomUUID 回传；session/message/task/memory→
 * {id}=lastInsertRowid；auditCount→{count}）。字段面=020 DDL 实照（设计 §5.0
 * 字面与 §3.3-补 实照的接缝：task 无 sessionId 列〔S2〕行级平铺 scope+
 * anchor_id〔S3〕字段名 status/result〔S4〕；audit=detail 单字段〔S6〕）。
 *
 * 不变式：不触碰 collections '__main__' 行（只 INSERT 新行——票面 §5.0）；
 * foreign_keys=ON fail-fast（幽灵外键种子在 INSERT 即报错）。
 */
import { randomUUID } from 'node:crypto'
import Database from 'better-sqlite3'

const db = new Database(process.env.SEED_DB)
db.pragma('foreign_keys = ON')
try {
  const ops = JSON.parse(process.env.SEED_AI_JSON ?? '[]')
  const results = []
  // 固定时间戳序列（2026-01-01 基准逐秒递增）——消息/任务时序断言可复现
  const base = Date.parse('2026-01-01T00:00:00.000Z')
  let seq = 0
  const stamp = () => new Date(base + seq * 1000).toISOString()

  for (const op of ops) {
    seq += 1
    switch (op.op) {
      case 'collection': {
        const id = randomUUID()
        const pos = db.prepare('SELECT COALESCE(MAX(position), -1) + 1 AS p FROM collections').get().p
        db.prepare('INSERT INTO collections (id, name, position) VALUES (?, ?, ?)').run(id, op.name, pos)
        results.push({ id })
        break
      }
      case 'session': {
        const t = stamp()
        const r = db
          .prepare('INSERT INTO ai_sessions (scope, anchor_id, created_at, updated_at) VALUES (?, ?, ?, ?)')
          .run(op.scope, op.anchorId, t, t)
        results.push({ id: Number(r.lastInsertRowid) })
        break
      }
      case 'message': {
        const t = stamp()
        const r = db
          .prepare(
            'INSERT INTO ai_messages (session_id, role, content, pinned, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
          )
          .run(op.sessionId, op.role, op.content, op.pinned === true ? 1 : 0, t, t)
        results.push({ id: Number(r.lastInsertRowid) })
        break
      }
      case 'task': {
        const t = stamp()
        const r = db
          .prepare(
            `INSERT INTO ai_tasks (scope, anchor_id, action, payload, status, result, error, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(op.scope, op.anchorId, op.action, op.payload ?? '{}', op.status, op.result ?? null, op.error ?? null, t, t)
        results.push({ id: Number(r.lastInsertRowid) })
        break
      }
      case 'audit': {
        const t = stamp()
        db.prepare('INSERT INTO ai_task_audit (task_id, seq, kind, detail, created_at) VALUES (?, ?, ?, ?, ?)').run(
          op.taskId,
          op.seq,
          op.kind,
          op.detail ?? null,
          t
        )
        results.push({})
        break
      }
      case 'memory': {
        const t = stamp()
        const r = db
          .prepare(
            `INSERT INTO ai_memory (scope, anchor_id, category, label, title, content, pinned, origin, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            op.scope,
            op.anchorId,
            op.category,
            op.label ?? null,
            op.title,
            op.content,
            op.pinned === true ? 1 : 0,
            op.origin ?? 'manual',
            t,
            t
          )
        results.push({ id: Number(r.lastInsertRowid) })
        break
      }
      case 'auditCount': {
        const row = db.prepare('SELECT COUNT(*) AS c FROM ai_task_audit WHERE task_id = ?').get(op.taskId)
        results.push({ count: row.c })
        break
      }
      default:
        throw new Error(`seed-ai-domain: 未知 op ${JSON.stringify(op.op)}`)
    }
  }
  process.stdout.write(JSON.stringify(results))
} finally {
  db.close()
}
