/**
 * [F-DBCAMP-01 DB-2 U2] ai-memory-manual.service 用例（always-active 真库夹具）。
 * 覆盖简报 §三-戊 1-5：W-1 双语义（列表模式过滤/排序/limit 200 缺省/外值 category
 * 空结果〔挂账③〕+检索模式码点路由/topK=8 上界）+create（origin 恒 manual 盖写/
 * label 缺省 ''/幽灵锚 NOT_FOUND）+update（档级类目校验/空 patch 原样零写〔k3-N3〕/
 * 幽灵 id）+delete/setPinned（生效+幽灵 NOT_FOUND+pinnedOnly 可见性）。
 * always-active（不经 guardedDescribe）。
 */
import { describe, expect, it } from 'vitest'
import { createAiMemoryManualService } from '../../../src/main/services/ai/ai-memory-manual.service'
import { createRepos } from '../../../src/main/db/repos'
import { createTestDb } from '../../utils/fixtures'

type Db = ReturnType<typeof createTestDb>

function seedPaper(db: Db, id: string): void {
  db.prepare(
    `INSERT INTO papers (id, file_ref, sha256, title, added_at, updated_at)
     VALUES (?, ?, ?, ?, 't', 't')`
  ).run(id, `f/${id}.pdf`, `sha-${id}`, `文献${id}`)
}

function seedCollection(db: Db, id: string): void {
  db.prepare('INSERT INTO collections (id, name, position) VALUES (?, ?, 0)').run(id, `图${id}`)
}

/** 直插记忆行（绕过 service 写面——构造受控 updated_at/跨锚夹具；FTS 触发器照常同步） */
function seedRow(
  db: Db,
  v: {
    scope: 'paper' | 'lineage' | 'global'
    anchor: string | null
    category: string
    title: string
    content?: string
    updatedAt?: string
    pinned?: 0 | 1
  }
): number {
  const r = db
    .prepare(
      `INSERT INTO ai_memory (scope, anchor_id, category, label, title, content, pinned, origin,
         created_at, updated_at)
       VALUES (?, ?, ?, NULL, ?, ?, ?, 'manual', '2024-01-01T00:00:00.000Z', ?)`
    )
    .run(v.scope, v.anchor, v.category, v.title, v.content ?? '内容', v.pinned ?? 0, v.updatedAt ?? '2024-01-01T00:00:00.000Z')
  return Number(r.lastInsertRowid)
}

async function expectDomainError(
  run: () => Promise<unknown>,
  code: string,
  ...msgParts: string[]
): Promise<void> {
  try {
    await run()
    expect.unreachable('应抛域错误')
  } catch (e) {
    expect(e, '域错误是 Error 子类').toBeInstanceOf(Error)
    expect((e as { code?: string }).code, `错误码应为 ${code}`).toBe(code)
    for (const part of msgParts) expect((e as Error).message).toContain(part)
  }
}

describe('F-DBCAMP-01 DB-2 U2 ai-memory-manual.service —— 记忆手动 CRUD 面', () => {
  it('M1 列表模式：category/pinnedOnly 过滤（含组合）+序=(updated_at DESC,id DESC)+limit 200 缺省+外值 category 空结果（挂账③）', async () => {
    const db = createTestDb()
    const svc = createAiMemoryManualService({ repos: createRepos(db) })
    seedPaper(db, 'p-1')
    seedPaper(db, 'p-2')
    seedRow(db, { scope: 'paper', anchor: 'p-1', category: 'method_note', title: '甲', updatedAt: '2024-01-01T00:00:00.000Z' })
    seedRow(db, { scope: 'paper', anchor: 'p-1', category: 'term_glossary', title: '乙', updatedAt: '2024-01-01T00:00:00.000Z' })
    seedRow(db, { scope: 'paper', anchor: 'p-2', category: 'method_note', title: '丙', updatedAt: '2024-03-01T00:00:00.000Z' })
    seedRow(db, { scope: 'paper', anchor: 'p-1', category: 'method_note', title: '丁', updatedAt: '2024-02-01T00:00:00.000Z', pinned: 1 })
    const all = await svc.listByScope({ scope: 'paper' })
    expect(all.map((r) => r.title)).toEqual(['丙', '丁', '乙', '甲'])
    expect(all.map((r) => r.anchorTitle)).toEqual(['文献p-2', '文献p-1', '文献p-1', '文献p-1'])
    expect((await svc.listByScope({ scope: 'paper', category: 'method_note' })).map((r) => r.title)).toEqual(['丙', '丁', '甲'])
    expect((await svc.listByScope({ scope: 'paper', pinnedOnly: true })).map((r) => r.title)).toEqual(['丁'])
    expect((await svc.listByScope({ scope: 'paper', category: 'method_note', pinnedOnly: true })).map((r) => r.title)).toEqual(['丁'])
    // 挂账③：category 外值（不在该 scope 冻结集）=过滤语义空结果非拒
    expect(await svc.listByScope({ scope: 'paper', category: 'node_role' })).toEqual([])
    // limit 缺省 200：201 行同 scope → 恰 200（上界=IPC 面 zod 单源，服务层只承载缺省）
    const bulk = db.prepare(
      `INSERT INTO ai_memory (scope, anchor_id, category, label, title, content, origin, created_at, updated_at)
       VALUES ('paper', 'p-1', 'method_note', NULL, ?, 'x', 'manual', 't', 't')`
    )
    for (let i = 1; i <= 201; i++) bulk.run(`批量${i}`)
    expect(await svc.listByScope({ scope: 'paper', category: 'method_note' })).toHaveLength(200)
    db.close()
  })

  it('M2 检索模式（W-1）：1 码点 LIKE 路/≥3 码点 FTS 路/topK=8 上界/跨锚命中/空白 query 空 rows', async () => {
    const db = createTestDb()
    const svc = createAiMemoryManualService({ repos: createRepos(db) })
    seedPaper(db, 'p-1')
    seedPaper(db, 'p-2')
    for (let i = 1; i <= 10; i++) {
      seedRow(db, { scope: 'paper', anchor: i <= 5 ? 'p-1' : 'p-2', category: 'method_note', title: `预算语料${i}` })
    }
    seedRow(db, { scope: 'paper', anchor: 'p-1', category: 'method_note', title: '无关行' })
    // 1 码点 → LIKE 路（trigram 结构性不可命中 <3 码点——命中即证 LIKE 路生效）
    const like = await svc.listByScope({ scope: 'paper', query: '预' })
    expect(like).toHaveLength(8) // topK=8 上界（10 命中行 → 8）
    expect(like.every((r) => r.title.startsWith('预算语料'))).toBe(true)
    expect([...new Set(like.map((r) => r.anchorId))].sort()).toEqual(['p-1', 'p-2']) // 跨锚（scope 级单条件）
    // ≥3 码点 → FTS MATCH 路（escapeFtsQuery 短语形）
    const match = await svc.listByScope({ scope: 'paper', query: '预算语料' })
    expect(match).toHaveLength(8)
    // anchorTitle 随行解析
    expect(match.every((r) => r.anchorTitle === `文献${r.anchorId}`)).toBe(true)
    // 空白 query（zod min(1) 放行 '  '）→ trim 空 → 空 rows
    expect(await svc.listByScope({ scope: 'paper', query: '   ' })).toEqual([])
    db.close()
  })

  it('M3 create：origin 恒 manual 盖写+label 缺省空串+幽灵锚 NOT_FOUND（paper/lineage 两形）+行断言', async () => {
    const db = createTestDb()
    const svc = createAiMemoryManualService({ repos: createRepos(db) })
    seedPaper(db, 'p-1')
    seedCollection(db, 'c-1')
    const created = await svc.create({
      scope: 'paper',
      anchorId: 'p-1',
      category: 'reading_insight',
      title: '机理洞见',
      content: '膜污染三阶段'
    })
    expect(created).toMatchObject({
      scope: 'paper',
      anchorId: 'p-1',
      category: 'reading_insight',
      label: '',
      title: '机理洞见',
      content: '膜污染三阶段',
      pinned: false,
      origin: 'manual'
    })
    const labeled = await svc.create({
      scope: 'global',
      anchorId: null,
      category: 'user_preference',
      label: '偏好签',
      title: '界面偏好',
      content: '深色主题'
    })
    expect(labeled.label).toBe('偏好签')
    expect(labeled.origin).toBe('manual')
    await expectDomainError(
      () => svc.create({ scope: 'paper', anchorId: 'p-ghost', category: 'method_note', title: 't', content: 'c' }),
      'NOT_FOUND',
      '锚'
    )
    await expectDomainError(
      () => svc.create({ scope: 'lineage', anchorId: 'c-ghost', category: 'node_role', title: 't', content: 'c' }),
      'NOT_FOUND',
      '锚'
    )
    // [r1 R2] pinned 载荷兑现（方案 a——建后置顶）：true→行 pinned===true；缺省→false
    const pinnedOnCreate = await svc.create({
      scope: 'paper',
      anchorId: 'p-1',
      category: 'reading_insight',
      title: '建后即置顶',
      content: '内容',
      pinned: true
    })
    expect(pinnedOnCreate.pinned).toBe(true)
    expect(db.prepare('SELECT pinned FROM ai_memory WHERE id = ?').get(pinnedOnCreate.id)).toEqual({ pinned: 1 })
    const pinnedDefault = await svc.create({
      scope: 'paper',
      anchorId: 'p-1',
      category: 'method_note',
      title: '缺省不置顶',
      content: '内容'
    })
    expect(pinnedDefault.pinned).toBe(false)
    db.close()
  })

  it('M4 update：档级类目校验（跨档→INVALID_REQUEST）+合法 patch 生效+空 patch 原样零写（updated_at 不刷）+幽灵 id NOT_FOUND', async () => {
    const db = createTestDb()
    const svc = createAiMemoryManualService({ repos: createRepos(db) })
    seedCollection(db, 'c-1')
    const id = seedRow(db, { scope: 'lineage', anchor: 'c-1', category: 'node_role', title: '旧题', updatedAt: '2024-01-01T00:00:00.000Z' })
    // zod 只验 19 值并集——档级矩阵归服务层：lineage 行 patch paper 档类目 → 拒
    await expectDomainError(
      () => svc.update({ id, patch: { category: 'method_note' } }),
      'INVALID_REQUEST',
      '类目'
    )
    // 合法 patch：同档换类目+改题（updated_at 刷新）
    const updated = await svc.update({ id, patch: { category: 'relation_note', title: '新题' } })
    expect(updated).toMatchObject({ category: 'relation_note', title: '新题' })
    expect((updated.updatedAt ?? '') > '2024-01-01T00:00:00.000Z').toBe(true)
    // 空 patch {}=原样返回零写（k3-N3：无变更不刷 updated_at——防 listByScope 排序幽灵重排）
    db.prepare(`UPDATE ai_memory SET updated_at='2024-01-01T00:00:00.000Z' WHERE id=?`).run(id)
    const untouched = await svc.update({ id, patch: {} })
    expect(untouched).toMatchObject({ title: '新题', category: 'relation_note', updatedAt: '2024-01-01T00:00:00.000Z' })
    expect((await svc.update({ id, patch: {} })).updatedAt).toBe('2024-01-01T00:00:00.000Z')
    const touched = await svc.update({ id, patch: { content: '新文' } })
    expect((touched.updatedAt ?? '') > '2024-01-01T00:00:00.000Z').toBe(true)
    await expectDomainError(() => svc.update({ id: 9999, patch: { title: '幽灵' } }), 'NOT_FOUND', '记忆不存在')
    db.close()
  })

  it('M5 delete/setPinned：生效（返回投影行）+幽灵 NOT_FOUND+翻转后 pinnedOnly 可见性', async () => {
    const db = createTestDb()
    const svc = createAiMemoryManualService({ repos: createRepos(db) })
    seedPaper(db, 'p-1')
    const id = seedRow(db, { scope: 'paper', anchor: 'p-1', category: 'method_note', title: '待删' })
    const pinnedRow = await svc.setPinned(id, true)
    expect(pinnedRow.pinned).toBe(true)
    expect((await svc.listByScope({ scope: 'paper', pinnedOnly: true })).map((r) => r.title)).toEqual(['待删'])
    const deleted = await svc.delete(id)
    expect(deleted).toMatchObject({ id, title: '待删' })
    expect(db.prepare('SELECT COUNT(*) c FROM ai_memory').get()).toEqual({ c: 0 })
    await expectDomainError(() => svc.delete(9999), 'NOT_FOUND', '记忆不存在')
    await expectDomainError(() => svc.setPinned(9999, true), 'NOT_FOUND', '记忆不存在')
    db.close()
  })
})
