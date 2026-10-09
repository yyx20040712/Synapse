/**
 * [F-DBCAMP-01 DB-2 U1] 迁移 020 AI 域约束面锁定测试：M4 分类枚举（19=6+7+6
 * 冻结）/多态 anchor/列级枚举/长度/UNIQUE/json_valid + M5 G2 审计 append-only。
 *
 * 真相源=简报 §3 DDL（冻结）+taxonomy-proposal-v1.md（用户 08:51 二轮终态：
 * 三档全采推荐，跨档零同名）+设计报告 §5-裁（裁定④=G2 触发器级）。
 * always-active（不经 guardedDescribe）。
 */
import { describe, expect, it } from 'vitest'
import { openDatabase } from '../../../src/main/db/connection'
import { migrate } from '../../../src/main/db/migrate'

type Db = ReturnType<typeof openDatabase>

/** 三档分类冻结清单（19=6+7+6，跨档零同名） */
const PAPER_CATS = [
  'excerpt_quote',
  'method_note',
  'data_evidence',
  'critique_limit',
  'term_glossary',
  'reading_insight'
] as const
const LINEAGE_CATS = [
  'node_role',
  'relation_note',
  'branch_summary',
  'timeline_milestone',
  'controversy_debate',
  'gap_opportunity',
  'domain_glossary'
] as const
const GLOBAL_CATS = [
  'user_preference',
  'ui_guidance',
  'capability_note',
  'automation_recipe',
  'task_outcome',
  'constraint_limit'
] as const

function openFull(): Db {
  const db = openDatabase(':memory:')
  migrate(db)
  return db
}

function seedPaper(db: Db, id: string): void {
  db.prepare(
    `INSERT INTO papers (id, file_ref, sha256, title, added_at, updated_at)
     VALUES (?, ?, ?, ?, 't', 't')`
  ).run(id, `f/${id}.pdf`, `sha-${id}`, `文献${id}`)
}

function seedCollection(db: Db, id: string, name: string): void {
  db.prepare('INSERT INTO collections (id, name, position) VALUES (?, ?, 0)').run(id, name)
}

function insertMemory(
  db: Db,
  scope: string | null,
  anchor: string | null,
  category: string | null,
  title = '标题'
): void {
  db.prepare(
    `INSERT INTO ai_memory (scope, anchor_id, category, title, content, origin, created_at, updated_at)
     VALUES (?, ?, ?, ?, '内容', 'manual', 't', 't')`
  ).run(scope, anchor, category, title)
}

describe('db/ai-domain-constraints —— M4 分类/多态/枚举/长度/UNIQUE/json_valid+M5 G2 append-only', () => {
  it('M4 19 类合法插入逐档过（paper 6→papers.id 锚/lineage 7→collections.id 锚/global 6→NULL 锚）', () => {
    const db = openFull()
    seedPaper(db, 'p-cat')
    seedCollection(db, 'c-cat', '分类图')
    for (const c of PAPER_CATS) {
      expect(() => insertMemory(db, 'paper', 'p-cat', c), `paper:${c}`).not.toThrow()
    }
    for (const c of LINEAGE_CATS) {
      expect(() => insertMemory(db, 'lineage', 'c-cat', c), `lineage:${c}`).not.toThrow()
    }
    for (const c of GLOBAL_CATS) {
      expect(() => insertMemory(db, 'global', null, c), `global:${c}`).not.toThrow()
    }
    expect(db.prepare('SELECT COUNT(*) c FROM ai_memory').get()).toEqual({ c: 19 })
    db.close()
  })

  it('M4 非法类逐档拒≥3 样本（paper 类入 lineage 档/global 类入 paper 档/杜撰类），taxonomy CHECK 文案承载', () => {
    const db = openFull()
    seedPaper(db, 'p-cat')
    seedCollection(db, 'c-cat', '分类图')
    expect(() => insertMemory(db, 'lineage', 'c-cat', 'term_glossary')).toThrow(
      /CHECK constraint failed:[\s\S]*category IN/
    )
    expect(() => insertMemory(db, 'paper', 'p-cat', 'user_preference')).toThrow(
      /CHECK constraint failed:[\s\S]*category IN/
    )
    expect(() => insertMemory(db, 'global', null, 'misc_note')).toThrow(
      /CHECK constraint failed:[\s\S]*category IN/
    )
    db.close()
  })

  it('M4 多态 anchor：global+NULL 过、global+非 NULL 拒、paper+NULL 拒、lineage+NULL 拒（poly CHECK 文案承载）', () => {
    const db = openFull()
    seedPaper(db, 'p-cat')
    expect(() => insertMemory(db, 'global', null, 'user_preference')).not.toThrow()
    expect(() => insertMemory(db, 'global', 'p-cat', 'user_preference')).toThrow(
      /CHECK constraint failed:[\s\S]*anchor_id IS NULL/
    )
    expect(() => insertMemory(db, 'paper', null, 'reading_insight')).toThrow(
      /CHECK constraint failed:[\s\S]*anchor_id IS NOT NULL/
    )
    // [k3-N4] lineage 档同款 NULL 拒（poly CHECK 三档全覆盖）
    expect(() => insertMemory(db, 'lineage', null, 'node_role')).toThrow(
      /CHECK constraint failed:[\s\S]*anchor_id IS NOT NULL/
    )
    db.close()
  })

  it('M4 跨档互斥穷举：他档值对本档全拒（paper 拒 lineage∪global 13 值/lineage 拒 12 值/global 拒 13 值=38 动态拒）', () => {
    const db = openFull()
    const crossScope: Array<{ scope: 'paper' | 'lineage' | 'global'; anchor: string | null; others: string[] }> = [
      { scope: 'paper', anchor: 'p-x', others: [...LINEAGE_CATS, ...GLOBAL_CATS] },
      { scope: 'lineage', anchor: 'c-x', others: [...PAPER_CATS, ...GLOBAL_CATS] },
      { scope: 'global', anchor: null, others: [...PAPER_CATS, ...LINEAGE_CATS] }
    ]
    let rejects = 0
    for (const { scope, anchor, others } of crossScope) {
      for (const c of others) {
        expect(() => insertMemory(db, scope, anchor, c), `${scope} 档拒他档值 ${c}`).toThrow(
          /CHECK constraint failed:[\s\S]*category IN/
        )
        rejects += 1
      }
    }
    expect(rejects).toBe(38)
    expect(db.prepare('SELECT COUNT(*) c FROM ai_memory').get()).toEqual({ c: 0 })
    db.close()
  })

  it('M4 scope=NULL 拒+category=NULL 拒（NOT NULL 文案含表.列）', () => {
    const db = openFull()
    seedPaper(db, 'p-cat')
    expect(() => insertMemory(db, null, 'p-cat', 'reading_insight')).toThrow(
      /NOT NULL constraint failed: ai_memory\.scope/
    )
    expect(() => insertMemory(db, 'paper', 'p-cat', null)).toThrow(
      /NOT NULL constraint failed: ai_memory\.category/
    )
    db.close()
  })

  it('M4 ai_sessions 枚举与多态：scope 非法拒/global+anchor 拒/paper+NULL 拒/global+NULL 过', () => {
    const db = openFull()
    seedPaper(db, 'p-cat')
    const insertSession = (scope: string | null, anchor: string | null): void => {
      db.prepare(
        `INSERT INTO ai_sessions (scope, anchor_id, created_at, updated_at) VALUES (?, ?, 't', 't')`
      ).run(scope, anchor)
    }
    expect(() => insertSession('workspace', 'p-cat')).toThrow(
      /CHECK constraint failed: scope IN \('paper','lineage','global'\)/
    )
    expect(() => insertSession('global', 'p-cat')).toThrow(
      /CHECK constraint failed:[\s\S]*anchor_id IS NULL/
    )
    expect(() => insertSession('paper', null)).toThrow(
      /CHECK constraint failed:[\s\S]*anchor_id IS NOT NULL/
    )
    expect(() => insertSession('global', null)).not.toThrow()
    db.close()
  })

  it('M4 role/pinned/origin/status/action 枚举各拒一非法值', () => {
    const db = openFull()
    seedPaper(db, 'p-cat')
    const sid = Number(
      db
        .prepare(`INSERT INTO ai_sessions (scope, anchor_id, created_at, updated_at) VALUES ('paper','p-cat','t','t')`)
        .run().lastInsertRowid
    )
    expect(() =>
      db.prepare(
        `INSERT INTO ai_messages (session_id, role, content, created_at, updated_at)
         VALUES (?, 'system', '问', 't', 't')`
      ).run(sid)
    ).toThrow(/CHECK constraint failed: role IN/)
    expect(() =>
      db.prepare(
        `INSERT INTO ai_messages (session_id, role, content, pinned, created_at, updated_at)
         VALUES (?, 'user', '问', 2, 't', 't')`
      ).run(sid)
    ).toThrow(/CHECK constraint failed: pinned/)
    // [k3-N4] ai_memory.pinned 非法值（2）同款拒（与 ai_messages.pinned 各自独立 CHECK）
    expect(() =>
      db.prepare(
        `INSERT INTO ai_memory (scope, anchor_id, category, title, content, pinned, origin, created_at, updated_at)
         VALUES ('paper', 'p-cat', 'reading_insight', '题', '内容', 2, 'manual', 't', 't')`
      ).run()
    ).toThrow(/CHECK constraint failed: pinned/)
    expect(() => insertMemory(db, 'paper', 'p-cat', 'reading_insight')).not.toThrow()
    expect(() =>
      db.prepare(`UPDATE ai_memory SET origin='bot' WHERE anchor_id='p-cat'`).run()
    ).toThrow(/CHECK constraint failed: origin/)
    expect(() =>
      db.prepare(
        `INSERT INTO ai_tasks (scope, anchor_id, action, payload, status, created_at, updated_at)
         VALUES ('paper', 'p-cat', 'memory.create', '{}', 'paused', 't', 't')`
      ).run()
    ).toThrow(/CHECK constraint failed: status/)
    expect(() =>
      db.prepare(
        `INSERT INTO ai_tasks (scope, anchor_id, action, payload, created_at, updated_at)
         VALUES ('paper', 'p-cat', 'paper.delete', '{}', 't', 't')`
      ).run()
    ).toThrow(/CHECK constraint failed: action/)
    db.close()
  })

  it('M4 title 长度契约：0/121 拒、1/120 过（length(title) CHECK 文案承载）', () => {
    const db = openFull()
    seedPaper(db, 'p-cat')
    expect(() => insertMemory(db, 'paper', 'p-cat', 'reading_insight', '')).toThrow(
      /CHECK constraint failed: length\(title\)/
    )
    expect(() => insertMemory(db, 'paper', 'p-cat', 'reading_insight', 'x'.repeat(121))).toThrow(
      /CHECK constraint failed: length\(title\)/
    )
    expect(() => insertMemory(db, 'paper', 'p-cat', 'reading_insight', 'x')).not.toThrow()
    expect(() => insertMemory(db, 'paper', 'p-cat', 'reading_insight', 'x'.repeat(120))).not.toThrow()
    expect(db.prepare('SELECT COUNT(*) c FROM ai_memory').get()).toEqual({ c: 2 })
    db.close()
  })

  it('M4 idempotency_key UNIQUE：同键二任务拒（UNIQUE 文案含表.列）', () => {
    const db = openFull()
    seedPaper(db, 'p-cat')
    const ins = (): void => {
      db.prepare(
        `INSERT INTO ai_tasks (idempotency_key, scope, anchor_id, action, payload, created_at, updated_at)
         VALUES ('idem-1', 'paper', 'p-cat', 'memory.create', '{}', 't', 't')`
      ).run()
    }
    expect(ins).not.toThrow()
    expect(ins).toThrow(/UNIQUE constraint failed: ai_tasks\.idempotency_key/)
    expect(db.prepare('SELECT COUNT(*) c FROM ai_tasks').get()).toEqual({ c: 1 })
    db.close()
  })

  it('M4 payload 非 JSON 拒（json_valid CHECK 文案承载）', () => {
    const db = openFull()
    seedPaper(db, 'p-cat')
    expect(() =>
      db.prepare(
        `INSERT INTO ai_tasks (scope, anchor_id, action, payload, created_at, updated_at)
         VALUES ('paper', 'p-cat', 'memory.create', 'not-json', 't', 't')`
      ).run()
    ).toThrow(/CHECK constraint failed: json_valid/)
    db.close()
  })

  it('M4 ai_tasks scope=global 拒（围栏：任务目标仅 paper/lineage——W-2 目标规则 DDL 面）', () => {
    const db = openFull()
    expect(() =>
      db.prepare(
        `INSERT INTO ai_tasks (scope, anchor_id, action, payload, created_at, updated_at)
         VALUES ('global', 'p-cat', 'memory.create', '{}', 't', 't')`
      ).run()
    ).toThrow(/CHECK constraint failed: scope IN \('paper','lineage'\)/)
    db.close()
  })

  it('M5 G2 append-only：INSERT 过（UNIQUE(task_id,seq) 同 seq 拒）+UPDATE 拒+DELETE 拒（RAISE 文案承载）', () => {
    const db = openFull()
    seedPaper(db, 'p-cat')
    const tid = Number(
      db
        .prepare(
          `INSERT INTO ai_tasks (scope, anchor_id, action, payload, created_at, updated_at)
           VALUES ('paper', 'p-cat', 'memory.create', '{}', 't', 't')`
        )
        .run().lastInsertRowid
    )
    const insertAudit = (seq: number): void => {
      db.prepare(
        `INSERT INTO ai_task_audit (task_id, seq, kind, created_at) VALUES (?, ?, 'created', 't')`
      ).run(tid, seq)
    }
    expect(() => insertAudit(1)).not.toThrow()
    expect(() => insertAudit(2)).not.toThrow()
    expect(() => insertAudit(2)).toThrow(/UNIQUE constraint failed: ai_task_audit\.task_id, ai_task_audit\.seq/)
    expect(db.prepare('SELECT COUNT(*) c FROM ai_task_audit').get()).toEqual({ c: 2 })
    expect(() => db.prepare(`UPDATE ai_task_audit SET detail='篡改' WHERE task_id=?`).run(tid)).toThrow(
      /ai_task_audit 为 G2 append-only 审计面：禁止修改/
    )
    expect(() => db.prepare(`DELETE FROM ai_task_audit WHERE task_id=?`).run(tid)).toThrow(
      /ai_task_audit 为 G2 append-only 审计面：禁止删除/
    )
    expect(db.prepare('SELECT COUNT(*) c FROM ai_task_audit').get()).toEqual({ c: 2 })
    db.close()
  })
})
