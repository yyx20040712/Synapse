/**
 * [F-DBCAMP-01 DB-2 U1 / F-DBCAMP-01] 迁移 020（AI 域数据面：change_epochs
 * epoch 基建+AI 域 5 新表+ai_memory FTS+G2 审计触发器+随锚级联触发器）锁定测试
 * （真库夹具——migrate-tags-folder-domain.test.ts 同型）。
 *
 * 真相源=docs/design/2026-10-09_f-dbcamp01-db2-ai-domain-report.md（§5-裁
 * 用户裁定链①②④⑥+三轮指令）+主控终裁 T1-T5+仓外 db2-ai-final-addendum.md
 * +taxonomy-proposal-v1.md（分类 19=6+7+6 冻结）。
 *
 * 实照修正（自裁申报在案）：简报 T3 前提「触发器体内语句不点火他表触发器」
 * 与 SQLite 实测相反——recursive_triggers=OFF 只禁同表自递归，跨表链式照常
 * 点火（仓外 probe-isolate.mjs D1/D2 实证；主控复测 pragma=0：probe-rt-fk
 * 在档）；§3 原案级联体「显式 FTS 删先行
 * +memory 后删」=FTS 双删（先行 DELETE 直清索引+链式 ai_memory_fts_ad 再补
 * 'delete' 指令）→ "database disk image is malformed"（probe-cascade.mjs 实
 * 证，整条 DELETE papers 回滚）。终案级联体=memory 先删（链式 _ad 清 FTS）
 * +sessions+tasks+显式 epoch bump（probe-isolate.mjs C1-C10 全景通过：
 * integrity-check 过/他锚零扰/audit 恒存/epoch 前进）。epoch 算术=链式
 * ai_memory_epoch_ad +1 与显式 bump +1 合计 +2（锚下单行场景；0 行=+1、
 * N 行=N+1；+2 以 source_task_id 同锚为前提，跨锚引用面=U2 服务层写入约束；
 * FK 级联灭失行在本栈实测点火各表 epoch_ad——probe-rt-fk+M6 断言锁定；
 * 二段级联链〔edges/挂接 CASCADE 面，probe-fk2 实照〕按同机制推定，断言锁
 * =U2 注入面批补〔门一 d1-N2 挂账〕）。显式 bump 保留=递进下限与触发器链
 * 语义解耦的确定性保证。
 *
 * always-active（不经 guardedDescribe）。
 */
import { describe, expect, it } from 'vitest'
import { openDatabase } from '../../../src/main/db/connection'
import { MIGRATIONS, migrate, readUserVersion } from '../../../src/main/db/migrate'

type Db = ReturnType<typeof openDatabase>

function seedPaper(db: Db, id: string): void {
  db.prepare(
    `INSERT INTO papers (id, file_ref, sha256, title, added_at, updated_at)
     VALUES (?, ?, ?, ?, 't', 't')`
  ).run(id, `f/${id}.pdf`, `sha-${id}`, `文献${id}`)
}

function seedCollection(db: Db, id: string, name: string): void {
  db.prepare('INSERT INTO collections (id, name, position) VALUES (?, ?, 0)').run(id, name)
}

function seedSession(db: Db, scope: 'paper' | 'lineage', anchor: string): number {
  const r = db
    .prepare(
      `INSERT INTO ai_sessions (scope, anchor_id, created_at, updated_at) VALUES (?, ?, 't', 't')`
    )
    .run(scope, anchor)
  return Number(r.lastInsertRowid)
}

function seedMessage(db: Db, sessionId: number, content: string, pinned: number): void {
  db.prepare(
    `INSERT INTO ai_messages (session_id, role, content, pinned, created_at, updated_at)
     VALUES (?, 'user', ?, ?, 't', 't')`
  ).run(sessionId, content, pinned)
}

function seedMemory(db: Db, scope: 'paper' | 'lineage', anchor: string, category: string, title: string, content: string): void {
  db.prepare(
    `INSERT INTO ai_memory (scope, anchor_id, category, title, content, origin, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'agent', 't', 't')`
  ).run(scope, anchor, category, title, content)
}

function seedTask(db: Db, scope: 'paper' | 'lineage', anchor: string): number {
  const r = db
    .prepare(
      `INSERT INTO ai_tasks (scope, anchor_id, action, payload, created_at, updated_at)
       VALUES (?, ?, 'memory.create', '{}', 't', 't')`
    )
    .run(scope, anchor)
  return Number(r.lastInsertRowid)
}

function seedAudit(db: Db, taskId: number, seq: number): void {
  db.prepare(
    `INSERT INTO ai_task_audit (task_id, seq, kind, created_at) VALUES (?, ?, 'created', 't')`
  ).run(taskId, seq)
}

/** 建到 v19 的库（020 前形态——无 change_epochs/AI 域表族） */
function openV19(): Db {
  const db = openDatabase(':memory:')
  migrate(db, MIGRATIONS.filter((m) => m.version <= 19))
  return db
}

/** sqlite_master 对象多重集（type:name 形态——migrate-tags-folder-domain
 * objectMultiset 同型：index/trigger/view/table 全纳，sqlite_% 排除） */
function objectMultiset(db: Db): string[] {
  return (
    db.prepare(
      "SELECT type || ':' || name AS o FROM sqlite_master WHERE type IN ('index','trigger','view','table') AND name NOT LIKE 'sqlite_%' ORDER BY o"
    ).all() as Array<{ o: string }>
  ).map((r) => r.o)
}

function autoindexCount(db: Db): number {
  const r = db
    .prepare("SELECT COUNT(*) c FROM sqlite_master WHERE type='index' AND name LIKE 'sqlite_autoindex%'")
    .get() as { c: number }
  return r.c
}

function epochOf(db: Db, table: string): number {
  const r = db.prepare('SELECT epoch FROM change_epochs WHERE table_name = ?').get(table) as
    | { epoch: number }
    | undefined
  return r?.epoch ?? -1
}

/** epoch 集合 10 表（§3.F 实照物理名） */
const EPOCH_TABLES = [
  'papers',
  'collections',
  'tags',
  'paper_tags',
  'notes',
  'annotations',
  'lineage_graph_meta',
  'lineage_nodes',
  'lineage_edges',
  'ai_memory'
] as const

/** 020 对象增量全集（53 件=表 11〔6 实+FTS1+影子4〕+显式索引 5+触发器 37） */
function expected020Objects(): string[] {
  const epochTriggers = EPOCH_TABLES.flatMap((t) => [
    `trigger:${t}_epoch_ai`,
    `trigger:${t}_epoch_au`,
    `trigger:${t}_epoch_ad`
  ])
  return [
    'table:change_epochs',
    'table:ai_sessions',
    'table:ai_messages',
    'table:ai_tasks',
    'table:ai_memory',
    'table:ai_task_audit',
    'table:ai_memory_fts',
    // FTS5 影子表（external content 形态——papers_fts 同款 4 枚）
    'table:ai_memory_fts_config',
    'table:ai_memory_fts_data',
    'table:ai_memory_fts_docsize',
    'table:ai_memory_fts_idx',
    'index:idx_ai_sessions_scope_anchor',
    'index:idx_ai_messages_session_pin',
    'index:idx_ai_tasks_target',
    'index:idx_ai_memory_scope_anchor',
    'index:idx_ai_task_audit_task',
    ...epochTriggers,
    'trigger:ai_memory_fts_ai',
    'trigger:ai_memory_fts_ad',
    'trigger:ai_memory_fts_au',
    'trigger:ai_task_audit_g2_no_update',
    'trigger:ai_task_audit_g2_no_delete',
    'trigger:papers_ai_anchor_cascade',
    'trigger:collections_ai_anchor_cascade'
  ].sort()
}

describe('db/migrate —— 020 AI 域数据面（epoch 基建+5 新表+FTS+G2+随锚级联）', () => {
  it('M1 新库全链：user_version=20+应用清单 [1..20]+幂等重入（再跑 applied=[]）', () => {
    const db = openDatabase(':memory:')
    const result = migrate(db)
    expect(result.currentVersion).toBe(20)
    expect(result.appliedVersions).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20
    ])
    expect(readUserVersion(db)).toBe(20)
    const again = migrate(db)
    expect(again.appliedVersions).toEqual([])
    db.close()
  })

  it('M1 019 基线库→应用 020：applied=[20]+终值 20（升级链增量恰一跳）', () => {
    const db = openV19()
    const result = migrate(db)
    expect(result.appliedVersions).toEqual([20])
    expect(readUserVersion(db)).toBe(20)
    db.close()
  })

  it('M1 v19→20 对象多重集增量=恰本批 53 件（表 11+显式索引 5+触发器 37；多增/丢失均红）+autoindex 增 3', () => {
    const db = openV19()
    const before = objectMultiset(db)
    const autoBefore = autoindexCount(db)
    const result = migrate(db)
    expect(result.appliedVersions).toEqual([20])
    expect(objectMultiset(db)).toEqual([...before, ...expected020Objects()].sort())
    // autoindex 实测 +3：change_epochs TEXT PRIMARY KEY+ai_tasks.idempotency_key
    // UNIQUE+ai_task_audit UNIQUE(task_id,seq)（简报基线记 2——实测 3，报告 C3 表在案）
    expect(autoindexCount(db) - autoBefore).toBe(3)
    db.close()
  })

  it('M6 paper 锚级联：删 paper→sessions/messages（含置顶）/memory（FTS 净）/tasks 全灭；audit 恒存；epoch 前进；他锚零扰动', () => {
    const db = openDatabase(':memory:')
    migrate(db)
    seedPaper(db, 'p-a1')
    seedPaper(db, 'p-a2')
    const s1 = seedSession(db, 'paper', 'p-a1')
    seedMessage(db, s1, '问题甲', 0)
    seedMessage(db, s1, '置顶回答甲', 1)
    const s2 = seedSession(db, 'paper', 'p-a2')
    seedMessage(db, s2, '问题乙', 0)
    seedMemory(db, 'paper', 'p-a1', 'excerpt_quote', '甲摘录', '锚级联内容甲')
    seedMemory(db, 'paper', 'p-a2', 'method_note', '乙方法', '锚级联内容乙')
    const t1 = seedTask(db, 'paper', 'p-a1')
    const t2 = seedTask(db, 'paper', 'p-a2')
    seedAudit(db, t1, 1)
    seedAudit(db, t1, 2)
    seedAudit(db, t2, 1)
    // [d1-W2] FK 级联面播种：note+annotation+paper_tag+标签挂接（均挂 p-a1）——
    // paper 删经 FK CASCADE 灭失行（主控探针 probe-rt-fk 在档：本栈 FK 级联
    // 灭失行点火各表 epoch_ad）
    db.prepare(
      `INSERT INTO notes (id, paper_id, title, content_md, created_at, updated_at)
       VALUES ('n-a1', 'p-a1', '甲笔记', '级联笔记内容', 't', 't')`
    ).run()
    db.prepare(
      `INSERT INTO annotations (id, paper_id, page, kind, sort_key, created_at, updated_at)
       VALUES ('an-a1', 'p-a1', 0, 'highlight', '0000:01', 't', 't')`
    ).run()
    db.prepare(`INSERT INTO tags (id, name) VALUES ('t-a1', '级联标签甲')`).run()
    db.prepare(`INSERT INTO paper_tags (paper_id, tag_id) VALUES ('p-a1', 't-a1')`).run()
    const papersEpochBefore = epochOf(db, 'papers')
    const memoryEpochBefore = epochOf(db, 'ai_memory')
    const notesEpochBefore = epochOf(db, 'notes')
    const annotationsEpochBefore = epochOf(db, 'annotations')
    const paperTagsEpochBefore = epochOf(db, 'paper_tags')
    const tagsEpochBefore = epochOf(db, 'tags')
    expect(() => db.prepare(`DELETE FROM papers WHERE id='p-a1'`).run()).not.toThrow()
    // sessions/messages（FK CASCADE 随灭——含置顶消息）
    expect(db.prepare(`SELECT COUNT(*) c FROM ai_sessions WHERE anchor_id='p-a1'`).get()).toEqual({ c: 0 })
    expect(db.prepare(`SELECT COUNT(*) c FROM ai_messages`).get()).toEqual({ c: 1 })
    expect(db.prepare(`SELECT COUNT(*) c FROM ai_messages WHERE content='置顶回答甲'`).get()).toEqual({ c: 0 })
    // memory 行灭+FTS 净（T3 现实下链式 _ad 显式清理实证）+索引完整性
    expect(db.prepare(`SELECT COUNT(*) c FROM ai_memory WHERE anchor_id='p-a1'`).get()).toEqual({ c: 0 })
    expect(
      db.prepare(`SELECT rowid FROM ai_memory_fts WHERE ai_memory_fts MATCH '"锚级联内容甲"'`).get()
    ).toBeUndefined()
    db.prepare(`INSERT INTO ai_memory_fts(ai_memory_fts) VALUES('integrity-check')`).run()
    // tasks 灭+audit 恒存（G2 append-only：task_id 悬挂为接受面）
    expect(db.prepare(`SELECT COUNT(*) c FROM ai_tasks WHERE anchor_id='p-a1'`).get()).toEqual({ c: 0 })
    expect(db.prepare(`SELECT COUNT(*) c FROM ai_task_audit WHERE task_id=?`).get(t1)).toEqual({ c: 2 })
    expect(db.prepare(`SELECT COUNT(*) c FROM ai_task_audit WHERE task_id=?`).get(t2)).toEqual({ c: 1 })
    // epoch：papers +1（_ad 直发）；ai_memory +2（链式 _ad+级联体显式 bump）
    expect(epochOf(db, 'papers')).toBe(papersEpochBefore + 1)
    expect(epochOf(db, 'ai_memory')).toBe(memoryEpochBefore + 2)
    // [d1-W2] FK 级联灭失行点火 epoch_ad（本栈实测语义——probe-rt-fk 在档）：
    // notes/annotations/paper_tags 各 +1（随 paper CASCADE 灭失行）；tags 不前进
    // （tags 的 CASCADE 面在 collections 侧——020 头注 T3 口径；标签行本体随
    // paper_tags 挂接摘除存活，域属 __main__）
    expect(epochOf(db, 'notes')).toBe(notesEpochBefore + 1)
    expect(epochOf(db, 'annotations')).toBe(annotationsEpochBefore + 1)
    expect(epochOf(db, 'paper_tags')).toBe(paperTagsEpochBefore + 1)
    expect(epochOf(db, 'tags')).toBe(tagsEpochBefore)
    expect(db.prepare(`SELECT COUNT(*) c FROM notes`).get()).toEqual({ c: 0 })
    expect(db.prepare(`SELECT COUNT(*) c FROM annotations`).get()).toEqual({ c: 0 })
    expect(db.prepare(`SELECT COUNT(*) c FROM paper_tags`).get()).toEqual({ c: 0 })
    expect(db.prepare(`SELECT COUNT(*) c FROM tags`).get()).toEqual({ c: 1 })
    // 他锚零扰动（会话/记忆/FTS/任务全在）
    expect(db.prepare(`SELECT COUNT(*) c FROM ai_sessions WHERE anchor_id='p-a2'`).get()).toEqual({ c: 1 })
    expect(db.prepare(`SELECT COUNT(*) c FROM ai_memory WHERE anchor_id='p-a2'`).get()).toEqual({ c: 1 })
    expect(db.prepare(`SELECT rowid FROM ai_memory_fts WHERE ai_memory_fts MATCH '"锚级联内容乙"'`).get()).toBeTruthy()
    expect(db.prepare(`SELECT COUNT(*) c FROM ai_tasks WHERE anchor_id='p-a2'`).get()).toEqual({ c: 1 })
    db.close()
  })

  it('M6 lineage 锚级联（collections_ai_anchor_cascade，scope=lineage）：同款全灭/恒存/前进/零扰+FK 级联面（tags/lineage_nodes 随夹灭）', () => {
    const db = openDatabase(':memory:')
    migrate(db)
    seedCollection(db, 'c-g1', '级联图一')
    seedCollection(db, 'c-g2', '级联图二')
    const s1 = seedSession(db, 'lineage', 'c-g1')
    seedMessage(db, s1, '图域问题一', 0)
    const s2 = seedSession(db, 'lineage', 'c-g2')
    seedMessage(db, s2, '图域问题二', 0)
    seedMemory(db, 'lineage', 'c-g1', 'node_role', '节点定位', '图域级联内容一')
    seedMemory(db, 'lineage', 'c-g2', 'relation_note', '关系注记', '图域级联内容二')
    // [d1-W2] collections 侧 FK 级联面播种：域标签（folder_id=c-g1）+图节点
    // （folder_id=c-g1）——夹删经 CASCADE 灭失行（probe-rt-fk 在档面）
    db.prepare(`INSERT INTO tags (id, name, folder_id) VALUES ('t-g1', '图一域标签', 'c-g1')`).run()
    db.prepare(
      `INSERT INTO lineage_nodes (id, title, folder_id, created_at, updated_at)
       VALUES ('ln-g1', '图一节点', 'c-g1', 't', 't')`
    ).run()
    const t1 = seedTask(db, 'lineage', 'c-g1')
    const t2 = seedTask(db, 'lineage', 'c-g2')
    seedAudit(db, t1, 1)
    seedAudit(db, t2, 1)
    const collectionsEpochBefore = epochOf(db, 'collections')
    const memoryEpochBefore = epochOf(db, 'ai_memory')
    const tagsEpochBefore = epochOf(db, 'tags')
    const nodesEpochBefore = epochOf(db, 'lineage_nodes')
    expect(() => db.prepare(`DELETE FROM collections WHERE id='c-g1'`).run()).not.toThrow()
    expect(db.prepare(`SELECT COUNT(*) c FROM ai_sessions WHERE anchor_id='c-g1'`).get()).toEqual({ c: 0 })
    expect(db.prepare(`SELECT COUNT(*) c FROM ai_messages`).get()).toEqual({ c: 1 })
    expect(db.prepare(`SELECT COUNT(*) c FROM ai_memory WHERE anchor_id='c-g1'`).get()).toEqual({ c: 0 })
    expect(
      db.prepare(`SELECT rowid FROM ai_memory_fts WHERE ai_memory_fts MATCH '"图域级联内容一"'`).get()
    ).toBeUndefined()
    expect(db.prepare(`SELECT COUNT(*) c FROM ai_tasks WHERE anchor_id='c-g1'`).get()).toEqual({ c: 0 })
    expect(db.prepare(`SELECT COUNT(*) c FROM ai_task_audit WHERE task_id=?`).get(t1)).toEqual({ c: 1 })
    expect(epochOf(db, 'collections')).toBe(collectionsEpochBefore + 1)
    expect(epochOf(db, 'ai_memory')).toBe(memoryEpochBefore + 2)
    // [d1-W2] collections 侧 FK 级联灭失行点火 epoch_ad（tags.folder_id/
    // lineage_nodes.folder_id CASCADE 面——probe-rt-fk 在档+头注 T3 口径）
    expect(epochOf(db, 'tags')).toBe(tagsEpochBefore + 1)
    expect(epochOf(db, 'lineage_nodes')).toBe(nodesEpochBefore + 1)
    expect(db.prepare(`SELECT COUNT(*) c FROM tags WHERE id='t-g1'`).get()).toEqual({ c: 0 })
    expect(db.prepare(`SELECT COUNT(*) c FROM lineage_nodes WHERE id='ln-g1'`).get()).toEqual({ c: 0 })
    expect(db.prepare(`SELECT COUNT(*) c FROM ai_sessions WHERE anchor_id='c-g2'`).get()).toEqual({ c: 1 })
    expect(db.prepare(`SELECT rowid FROM ai_memory_fts WHERE ai_memory_fts MATCH '"图域级联内容二"'`).get()).toBeTruthy()
    expect(db.prepare(`SELECT COUNT(*) c FROM ai_tasks WHERE anchor_id='c-g2'`).get()).toEqual({ c: 1 })
    db.close()
  })
})
