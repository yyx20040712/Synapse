/**
 * [F-DBCAMP-01 DB-2 U2b-1] ai-memory.repo 锁定测试（always-active 真库夹具）。
 *
 * 覆盖：写原语 create（origin/source_task_id 落位）/update（部分字段+updated_at）/
 * delete/pin/unpin/listByAnchor+并集检索三原语（目标锚∪global 命中/他锚隔离负例/
 * global 独立行命中）+隔离谓词回归（既有 PREDICATE 不动=同库断言隔离仍成立）。
 * always-active（不经 guardedDescribe）。
 */
import { describe, expect, it } from 'vitest'
import { createAiMemoryRepo } from '../../../../src/main/db/repos/ai-memory.repo'
import { createTestDb } from '../../../utils/fixtures'

type Db = ReturnType<typeof createTestDb>

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/

/** 直插记忆行（绕过 repo 写面——构造排序/隔离夹具；触发器链照常点火=FTS 同步） */
function seedRow(
  db: Db,
  v: {
    scope: 'paper' | 'lineage' | 'global'
    anchor: string | null
    category: string
    title: string
    content: string
    label?: string | null
    updatedAt?: string
  }
): number {
  const r = db
    .prepare(
      `INSERT INTO ai_memory (scope, anchor_id, category, label, title, content, origin,
         created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'manual', '1970-01-01T00:00:00.000Z', ?)`
    )
    .run(v.scope, v.anchor, v.category, v.label ?? null, v.title, v.content, v.updatedAt ?? '2024-01-01T00:00:00.000Z')
  return Number(r.lastInsertRowid)
}

function countMemory(db: Db): number {
  return (db.prepare('SELECT COUNT(*) c FROM ai_memory').get() as { c: number }).c
}

describe('F-DBCAMP-01 DB-2 U2b-1 ai-memory.repo —— 写原语+并集检索', () => {
  it('W1 create 落位：origin=agent+sourceTaskId 落库+FTS 行在场（MATCH 命中）+ISO 时间戳', () => {
    const db = createTestDb()
    const repo = createAiMemoryRepo(db)
    // source_task_id 有 FK（ai_tasks.id）——播种真任务行（INV-128 同锚前提）
    const t = db
      .prepare(
        `INSERT INTO ai_tasks (scope, anchor_id, action, payload, created_at, updated_at)
         VALUES ('paper', 'p-1', 'memory.create', '{}', 't', 't')`
      )
      .run()
    const taskId = Number(t.lastInsertRowid)
    const row = repo.create('paper', 'p-1', {
      category: 'reading_insight',
      title: '反渗透机理洞见',
      content: '膜污染三阶段',
      label: '标签甲',
      origin: 'agent',
      sourceTaskId: taskId
    })
    expect(row.id).toBeGreaterThan(0)
    expect(row.scope).toBe('paper')
    expect(row.anchorId).toBe('p-1')
    expect(row.category).toBe('reading_insight')
    expect(row.label).toBe('标签甲')
    expect(row.origin).toBe('agent')
    expect(row.sourceTaskId).toBe(taskId)
    expect(row.pinned).toBe(0)
    expect(ISO_RE.test(row.createdAt)).toBe(true)
    expect(row.updatedAt).toBe(row.createdAt)
    expect(
      db.prepare(`SELECT rowid FROM ai_memory_fts WHERE ai_memory_fts MATCH '"膜污染三阶段"'`).get()
    ).toBeTruthy()
    db.close()
  })

  it('W2 create 缺省面：label null+sourceTaskId null+origin manual（用户手写面）', () => {
    const db = createTestDb()
    const repo = createAiMemoryRepo(db)
    const row = repo.create('global', null, {
      category: 'user_preference',
      title: '偏好',
      content: '默认深色主题',
      origin: 'manual'
    })
    expect(row.label).toBeNull()
    expect(row.sourceTaskId).toBeNull()
    expect(row.origin).toBe('manual')
    db.close()
  })

  it('W3 getById：在场行映射+缺席 null', () => {
    const db = createTestDb()
    const repo = createAiMemoryRepo(db)
    const id = seedRow(db, { scope: 'paper', anchor: 'p-1', category: 'method_note', title: '方法', content: '内容' })
    expect(repo.getById(id)?.title).toBe('方法')
    expect(repo.getById(9999)).toBeNull()
    db.close()
  })

  it('W4 update 部分字段：仅 title——其余列不动+updated_at 刷新+FTS 旧词清新词命中', () => {
    const db = createTestDb()
    const repo = createAiMemoryRepo(db)
    const id = seedRow(db, {
      scope: 'paper', anchor: 'p-1', category: 'method_note', title: '旧标题甲',
      content: '旧文', label: '旧签', updatedAt: '2024-01-01T00:00:00.000Z'
    })
    const updated = repo.update(id, { title: '新标题乙' })
    expect(updated?.title).toBe('新标题乙')
    expect(updated?.content).toBe('旧文')
    expect(updated?.label).toBe('旧签')
    expect(updated?.category).toBe('method_note')
    expect((updated?.updatedAt ?? '') > '2024-01-01T00:00:00.000Z').toBe(true)
    expect(ISO_RE.test(updated?.updatedAt ?? '')).toBe(true)
    // FTS _au 触发器：旧词清+新词命中（trigram 需 ≥3 码点——标题用三字词）
    expect(
      db.prepare(`SELECT rowid FROM ai_memory_fts WHERE ai_memory_fts MATCH '"旧标题甲"'`).get()
    ).toBeUndefined()
    expect(
      db.prepare(`SELECT rowid FROM ai_memory_fts WHERE ai_memory_fts MATCH '"新标题乙"'`).get()
    ).toBeTruthy()
    db.close()
  })

  it('W5 update 多字段（title+content+label 同刷）+缺席 id → null', () => {
    const db = createTestDb()
    const repo = createAiMemoryRepo(db)
    const id = seedRow(db, { scope: 'lineage', anchor: 'c-1', category: 'node_role', title: '旧', content: '旧文' })
    const updated = repo.update(id, { title: '新', content: '新文', label: '新签' })
    expect(updated?.title).toBe('新')
    expect(updated?.content).toBe('新文')
    expect(updated?.label).toBe('新签')
    expect(repo.update(9999, { title: '无的放矢' })).toBeNull()
    db.close()
  })

  it('W6 delete：行灭+FTS 清（MATCH 归零）+缺席 false', () => {
    const db = createTestDb()
    const repo = createAiMemoryRepo(db)
    const id = seedRow(db, { scope: 'paper', anchor: 'p-1', category: 'term_glossary', title: '术语', content: '术语解释文' })
    expect(repo.delete(9999)).toBe(false)
    expect(repo.delete(id)).toBe(true)
    expect(repo.getById(id)).toBeNull()
    expect(
      db.prepare(`SELECT rowid FROM ai_memory_fts WHERE ai_memory_fts MATCH '"术语解释文"'`).get()
    ).toBeUndefined()
    expect(countMemory(db)).toBe(0)
    db.close()
  })

  it('W7 setPinned 往返：翻转+updated_at 刷新+缺席 false 零行变更', () => {
    const db = createTestDb()
    const repo = createAiMemoryRepo(db)
    const id = seedRow(db, { scope: 'paper', anchor: 'p-1', category: 'term_glossary', title: '术语', content: '文', updatedAt: '2024-01-01T00:00:00.000Z' })
    expect(repo.setPinned(id, true)).toBe(true)
    expect(repo.getById(id)?.pinned).toBe(1)
    expect((repo.getById(id)?.updatedAt ?? '') > '2024-01-01T00:00:00.000Z').toBe(true)
    expect(repo.setPinned(id, false)).toBe(true)
    expect(repo.getById(id)?.pinned).toBe(0)
    expect(repo.setPinned(9999, true)).toBe(false)
    db.close()
  })

  it('W8 listByAnchor：仅本锚行（他锚/global 排除）+序=(updated_at DESC, id DESC)+limit', () => {
    const db = createTestDb()
    const repo = createAiMemoryRepo(db)
    seedRow(db, { scope: 'paper', anchor: 'p-1', category: 'method_note', title: '早', content: 'a', updatedAt: '2024-01-01T00:00:00.000Z' })
    seedRow(db, { scope: 'paper', anchor: 'p-1', category: 'term_glossary', title: '晚', content: 'b', updatedAt: '2024-03-01T00:00:00.000Z' })
    seedRow(db, { scope: 'paper', anchor: 'p-1', category: 'reading_insight', title: '中', content: 'c', updatedAt: '2024-02-01T00:00:00.000Z' })
    seedRow(db, { scope: 'paper', anchor: 'p-2', category: 'method_note', title: '他锚', content: 'd' })
    seedRow(db, { scope: 'global', anchor: null, category: 'user_preference', title: '全局', content: 'e' })
    const rows = repo.listByAnchor('paper', 'p-1', { limit: 50 })
    expect(rows.map((r) => r.title)).toEqual(['晚', '中', '早'])
    expect(repo.listByAnchor('paper', 'p-1', { limit: 2 }).map((r) => r.title)).toEqual(['晚', '中'])
    expect(repo.listByAnchor('paper', 'p-1', { category: 'method_note', limit: 50 }).map((r) => r.title)).toEqual(['早'])
    db.close()
  })

  it('U1 searchByLikeUnion（裁④可见集=目标锚∪global）：本锚+global 命中/他锚隔离', () => {
    const db = createTestDb()
    const repo = createAiMemoryRepo(db)
    seedRow(db, { scope: 'paper', anchor: 'p-1', category: 'method_note', title: '污染防治方法', content: 'x' })
    seedRow(db, { scope: 'paper', anchor: 'p-2', category: 'method_note', title: '污染防治他锚', content: 'x' })
    seedRow(db, { scope: 'global', anchor: null, category: 'capability_note', title: '污染防治能力', content: 'x' })
    seedRow(db, { scope: 'lineage', anchor: 'c-1', category: 'node_role', title: '污染防治脉络', content: 'x' })
    const rows = repo.searchByLikeUnion('paper', 'p-1', '%污染防治%', 50)
    expect(rows.map((r) => r.title).sort()).toEqual(['污染防治方法', '污染防治能力'])
    db.close()
  })

  it('U2 searchByMatchUnion：FTS 路同并集（本锚+global 命中/他锚隔离）', () => {
    const db = createTestDb()
    const repo = createAiMemoryRepo(db)
    seedRow(db, { scope: 'paper', anchor: 'p-1', category: 'method_note', title: 't', content: '跨栅栏技术要义' })
    seedRow(db, { scope: 'paper', anchor: 'p-9', category: 'method_note', title: 't', content: '跨栅栏技术他锚' })
    seedRow(db, { scope: 'global', anchor: null, category: 'automation_recipe', title: 't', content: '跨栅栏技术配方' })
    const rows = repo.searchByMatchUnion('paper', 'p-1', '"跨栅栏技术"', 50)
    expect(rows.map((r) => r.content).sort()).toEqual(['跨栅栏技术要义', '跨栅栏技术配方'])
    db.close()
  })

  it('U3 listUnion：目标锚∪global+category 过滤+limit+他锚隔离', () => {
    const db = createTestDb()
    const repo = createAiMemoryRepo(db)
    seedRow(db, { scope: 'paper', anchor: 'p-1', category: 'method_note', title: '本锚甲', content: 'x', updatedAt: '2024-01-01T00:00:00.000Z' })
    seedRow(db, { scope: 'global', anchor: null, category: 'user_preference', title: '全局乙', content: 'x', updatedAt: '2024-02-01T00:00:00.000Z' })
    seedRow(db, { scope: 'global', anchor: null, category: 'user_preference', title: '全局丙', content: 'x', updatedAt: '2024-03-01T00:00:00.000Z' })
    seedRow(db, { scope: 'paper', anchor: 'p-2', category: 'method_note', title: '他锚丁', content: 'x' })
    const rows = repo.listUnion('paper', 'p-1', null, 50)
    expect(rows.map((r) => r.title)).toEqual(['全局丙', '全局乙', '本锚甲'])
    expect(repo.listUnion('paper', 'p-1', 'method_note', 50).map((r) => r.title)).toEqual(['本锚甲'])
    expect(repo.listUnion('paper', 'p-1', null, 2).map((r) => r.title)).toEqual(['全局丙', '全局乙'])
    db.close()
  })

  it('U4 并集无目标行态：仅 global 命中（目标锚零行不空转错误）', () => {
    const db = createTestDb()
    const repo = createAiMemoryRepo(db)
    seedRow(db, { scope: 'global', anchor: null, category: 'task_outcome', title: '任务产出', content: 'x' })
    expect(repo.searchByLikeUnion('lineage', 'c-empty', '%任务产出%', 50).map((r) => r.title)).toEqual(['任务产出'])
    expect(repo.listUnion('lineage', 'c-empty', null, 50).map((r) => r.title)).toEqual(['任务产出'])
    expect(repo.searchByMatchUnion('lineage', 'c-empty', '"任务产出"', 50).map((r) => r.title)).toEqual(['任务产出'])
    db.close()
  })

  it('U5 并集序=(updated_at DESC, id DESC)（两路检索同口径）', () => {
    const db = createTestDb()
    const repo = createAiMemoryRepo(db)
    seedRow(db, { scope: 'paper', anchor: 'p-1', category: 'method_note', title: '早行', content: '排序语料', updatedAt: '2024-01-01T00:00:00.000Z' })
    seedRow(db, { scope: 'global', anchor: null, category: 'ui_guidance', title: '晚行', content: '排序语料', updatedAt: '2024-05-01T00:00:00.000Z' })
    const like = repo.searchByLikeUnion('paper', 'p-1', '%排序语料%', 50)
    const match = repo.searchByMatchUnion('paper', 'p-1', '"排序语料"', 50)
    expect(like.map((r) => r.title)).toEqual(['晚行', '早行'])
    expect(match.map((r) => r.title)).toEqual(['晚行', '早行'])
    db.close()
  })

  it('I1 隔离谓词回归：既有 searchByLike 仍三档完全隔离（他锚/global 均不可见）', () => {
    const db = createTestDb()
    const repo = createAiMemoryRepo(db)
    seedRow(db, { scope: 'paper', anchor: 'p-1', category: 'method_note', title: '本锚可见', content: 'x' })
    seedRow(db, { scope: 'paper', anchor: 'p-2', category: 'method_note', title: '他锚不可见', content: 'x' })
    seedRow(db, { scope: 'global', anchor: null, category: 'user_preference', title: '全局不可见', content: 'x' })
    const rows = repo.searchByLike('paper', 'p-1', '%可见%', 50)
    expect(rows.map((r) => r.title)).toEqual(['本锚可见'])
    expect(repo.searchByLike('global', null, '%可见%', 50).map((r) => r.title)).toEqual(['全局不可见'])
    db.close()
  })

  it('I2 隔离谓词回归：既有 searchByMatch 同隔离（PREDICATE 不动双路对齐）', () => {
    const db = createTestDb()
    const repo = createAiMemoryRepo(db)
    seedRow(db, { scope: 'lineage', anchor: 'c-1', category: 'node_role', title: 't', content: '隔离语料本图' })
    seedRow(db, { scope: 'lineage', anchor: 'c-2', category: 'node_role', title: 't', content: '隔离语料他图' })
    seedRow(db, { scope: 'global', anchor: null, category: 'capability_note', title: 't', content: '隔离语料全局' })
    const rows = repo.searchByMatch('lineage', 'c-1', '"隔离语料"', 50)
    expect(rows.map((r) => r.content)).toEqual(['隔离语料本图'])
    db.close()
  })
})

describe('F-DBCAMP-01 DB-2 U2 ai-memory.repo —— scope 级三原语+update category 载荷', () => {
  function seedPaper(db: Db, id: string): void {
    db.prepare(
      `INSERT INTO papers (id, file_ref, sha256, title, added_at, updated_at)
       VALUES (?, ?, ?, ?, 't', 't')`
    ).run(id, `f/${id}.pdf`, `sha-${id}`, `文献${id}`)
  }

  it('V1 listByScope：scope 单条件跨锚+category/pinnedOnly 过滤+序+anchorTitle 投影', () => {
    const db = createTestDb()
    const repo = createAiMemoryRepo(db)
    seedPaper(db, 'p-1')
    seedPaper(db, 'p-2')
    seedRow(db, { scope: 'paper', anchor: 'p-1', category: 'method_note', title: '早', content: 'a', updatedAt: '2024-01-01T00:00:00.000Z' })
    seedRow(db, { scope: 'paper', anchor: 'p-1', category: 'term_glossary', title: '中', content: 'b', updatedAt: '2024-02-01T00:00:00.000Z' })
    seedRow(db, { scope: 'paper', anchor: 'p-2', category: 'method_note', title: '晚', content: 'c', updatedAt: '2024-03-01T00:00:00.000Z' })
    seedRow(db, { scope: 'global', anchor: null, category: 'user_preference', title: '全', content: 'd' })
    db.prepare('UPDATE ai_memory SET pinned=1 WHERE title=?').run('中')
    const all = repo.listByScope('paper', { limit: 50 })
    expect(all.map((r) => r.title)).toEqual(['晚', '中', '早'])
    expect(all.map((r) => r.anchorTitle)).toEqual(['文献p-2', '文献p-1', '文献p-1'])
    expect(repo.listByScope('paper', { category: 'method_note', limit: 50 }).map((r) => r.title)).toEqual(['晚', '早'])
    expect(repo.listByScope('paper', { pinnedOnly: true, limit: 50 }).map((r) => r.title)).toEqual(['中'])
    expect(repo.listByScope('paper', { limit: 2 }).map((r) => r.title)).toEqual(['晚', '中'])
    const globalRows = repo.listByScope('global', { limit: 50 })
    expect(globalRows.map((r) => r.title)).toEqual(['全'])
    expect(globalRows[0]!.anchorTitle).toBeNull()
    db.close()
  })

  it('V2 searchByLikeScope/searchByMatchScope：跨锚命中（scope 级单条件）+anchorTitle 随行', () => {
    const db = createTestDb()
    const repo = createAiMemoryRepo(db)
    seedPaper(db, 'p-1')
    seedPaper(db, 'p-2')
    seedRow(db, { scope: 'paper', anchor: 'p-1', category: 'method_note', title: '共享词甲', content: 'x', updatedAt: '2024-02-01T00:00:00.000Z' })
    seedRow(db, { scope: 'paper', anchor: 'p-2', category: 'method_note', title: '共享词乙', content: 'y', updatedAt: '2024-03-01T00:00:00.000Z' })
    seedRow(db, { scope: 'lineage', anchor: 'c-1', category: 'node_role', title: '共享词丙', content: 'z' })
    const like = repo.searchByLikeScope('paper', '%共享词%', 50)
    expect(like.map((r) => r.title)).toEqual(['共享词乙', '共享词甲'])
    expect(like.map((r) => r.anchorTitle)).toEqual(['文献p-2', '文献p-1'])
    const match = repo.searchByMatchScope('paper', '"共享词"', 50)
    expect(match.map((r) => r.title)).toEqual(['共享词乙', '共享词甲'])
    db.close()
  })

  it('V3 update category 载荷：在席改（同档合法值）+缺席保持原值', () => {
    const db = createTestDb()
    const repo = createAiMemoryRepo(db)
    const id = seedRow(db, { scope: 'paper', anchor: 'p-1', category: 'method_note', title: '题', content: 'w' })
    const changed = repo.update(id, { category: 'term_glossary' })
    expect(changed?.category).toBe('term_glossary')
    expect(changed?.title).toBe('题')
    const kept = repo.update(id, { title: '只改题' })
    expect(kept?.category).toBe('term_glossary')
    expect(kept?.title).toBe('只改题')
    db.close()
  })

  it('V4 [r1 R5] listByScope lineage 标题路锚：anchorTitle=collections.name 值断言（k3-N8——三路 CASE 的 lineage 支补锚）', () => {
    const db = createTestDb()
    const repo = createAiMemoryRepo(db)
    db.prepare(`INSERT INTO collections (id, name, position) VALUES ('c-1', '图丙', 0)`).run()
    seedRow(db, { scope: 'lineage', anchor: 'c-1', category: 'node_role', title: '节点', content: 'x' })
    const rows = repo.listByScope('lineage', { limit: 50 })
    expect(rows).toHaveLength(1)
    expect(rows[0]!.anchorTitle).toBe('图丙')
    db.close()
  })
})
