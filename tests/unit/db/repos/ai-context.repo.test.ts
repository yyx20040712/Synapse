/**
 * [F-DBCAMP-01 DB-2 U2b-2a] ai-context.repo 用例（always-active 真库夹具——
 * ai-sessions.repo.test 同型）。覆盖简报 §3.b：epoch 向量（固定 10 表序+缺行 0
 * 兜底）/annotationsForContext A 型序/tagNamesForContext B 型 id 序/
 * lineageGraphByFolder 锚过滤+边两端正交/memoryCategoryIndex 聚合（计数+置顶
 * top3+最近 3）/folderNameOf/collectionName。
 * always-active（不经 guardedDescribe）。
 */
import { describe, expect, it } from 'vitest'
import { createAiContextRepo } from '../../../../src/main/db/repos/ai-context.repo'
import { createTestDb } from '../../../utils/fixtures'

type Db = ReturnType<typeof createTestDb>

function seedPaper(db: Db, id: string, folderId = '__main__'): void {
  db.prepare(
    `INSERT INTO papers (id, file_ref, sha256, title, folder_id, added_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 't', 't')`
  ).run(id, `f/${id}.pdf`, `sha-${id}`, `文献${id}`, folderId)
}

function seedCollection(db: Db, id: string, name?: string): void {
  db.prepare('INSERT INTO collections (id, name, position) VALUES (?, ?, 0)').run(id, name ?? `图${id}`)
}

function seedNote(db: Db, paperId: string, content: string): void {
  db.prepare(
    `INSERT INTO notes (id, paper_id, content_md, created_at, updated_at)
     VALUES (?, ?, ?, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z')`
  ).run(`n-${paperId}`, paperId, content)
}

function seedAnnotation(
  db: Db,
  id: string,
  paperId: string,
  updatedAt: string,
  quote = ''
): void {
  db.prepare(
    `INSERT INTO annotations (id, paper_id, page, kind, quote_text, comment, sort_key,
       created_at, updated_at)
     VALUES (?, ?, 1, 'highlight', ?, '评', '1:00000000', ?, ?)`
  ).run(id, paperId, quote, updatedAt, updatedAt)
}

function seedNode(db: Db, id: string, folderId: string, createdAt: string): void {
  db.prepare(
    `INSERT INTO lineage_nodes (id, title, year, x, y, folder_id, created_at, updated_at)
     VALUES (?, ?, 2020, NULL, NULL, ?, ?, ?)`
  ).run(id, `节点${id}`, folderId, createdAt, createdAt)
}

function seedEdge(db: Db, id: string, from: string, to: string): void {
  db.prepare(
    `INSERT INTO lineage_edges (id, from_node, to_node, label, created_at, updated_at)
     VALUES (?, ?, ?, '连线', 't1', 't1')`
  ).run(id, from, to)
}

function seedMemory(
  db: Db,
  id: number,
  scope: 'paper' | 'lineage' | 'global',
  anchor: string | null,
  category: string,
  title: string,
  updatedAt: string,
  pinned: 0 | 1
): void {
  db.prepare(
    `INSERT INTO ai_memory (id, scope, anchor_id, category, title, content, pinned, origin,
       created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, '内容', ?, 'manual', '2024-01-01T00:00:00.000Z', ?)`
  ).run(id, scope, anchor, category, title, pinned, updatedAt)
}

const FRESH_VECTOR =
  'papers=0;collections=0;tags=0;paper_tags=0;notes=0;annotations=0;' +
  'lineage_graph_meta=0;lineage_nodes=0;lineage_edges=0;ai_memory=0'

describe('F-DBCAMP-01 DB-2 U2b-2a ai-context.repo —— 装配读面聚合', () => {
  it('C1 epoch 向量：固定 10 表序拼接（新库全 0）+写表后对应位前进', () => {
    const db = createTestDb()
    const repo = createAiContextRepo(db)
    expect(repo.getEpochVector()).toBe(FRESH_VECTOR)
    seedPaper(db, 'p-1')
    const after = repo.getEpochVector()
    expect(after).toBe(FRESH_VECTOR.replace('papers=0', 'papers=1'))
    // ai_memory 写→ai_memory 位前进（epoch 触发链）
    seedMemory(db, 1, 'paper', 'p-1', 'method_note', '题', '2024-01-01T00:00:00.000Z', 0)
    expect(repo.getEpochVector()).toBe(
      FRESH_VECTOR.replace('papers=0', 'papers=1').replace('ai_memory=0', 'ai_memory=1')
    )
    db.close()
  })

  it('C2 epoch 缺行=0 兜底（DELETE change_epochs 行构造——防御分支：UPSERT 自愈下结构性不触达）', () => {
    const db = createTestDb()
    const repo = createAiContextRepo(db)
    db.prepare("DELETE FROM change_epochs WHERE table_name = 'tags'").run()
    seedPaper(db, 'p-1')
    const v = repo.getEpochVector()
    expect(v).toContain('tags=0;')
    expect(v).toContain('papers=1;')
    // 格式仍为 10 段（缺行不缩段）
    expect(v.split(';')).toHaveLength(10)
    db.close()
  })

  it('C3 annotationsForContext：A 型序 (updated_at DESC, id DESC)+limit', () => {
    const db = createTestDb()
    const repo = createAiContextRepo(db)
    seedPaper(db, 'p-1')
    // 平局同 updated_at → id 决胜（DESC）
    const t = '2024-05-01T00:00:00.000Z'
    seedAnnotation(db, 'a-1', 'p-1', t, '旧时')
    seedAnnotation(db, 'a-2', 'p-1', t)
    seedAnnotation(db, 'a-3', 'p-1', t)
    // 更新时间更新的行置顶
    seedAnnotation(db, 'a-0', 'p-1', '2024-06-01T00:00:00.000Z')
    let rows = repo.annotationsForContext('p-1', 10)
    // a-0 最新置顶；平局组 id DESC=a-3,a-2,a-1（a-1 携「旧时」探针殿后）
    expect(rows.map((r) => (r as { quoteText?: string }).quoteText ?? '')).toEqual(['', '', '', '旧时'])
    seedPaper(db, 'p-2')
    seedAnnotation(db, 'b-1', 'p-2', t)
    rows = repo.annotationsForContext('p-1', 10)
    expect(rows.every((r) => r !== undefined)).toBe(true)
    expect(repo.annotationsForContext('p-1', 2)).toHaveLength(2)
    expect(repo.annotationsForContext('p-2', 10)).toHaveLength(1)
    expect(repo.annotationsForContext('p-ghost', 10)).toHaveLength(0)
    db.close()
  })

  it('C4 tagNamesForContext：B 型序 tags.id ASC+锚过滤+limit', () => {
    const db = createTestDb()
    const repo = createAiContextRepo(db)
    seedCollection(db, 'c-1')
    seedPaper(db, 'p-1', 'c-1')
    seedPaper(db, 'p-2', 'c-1')
    const tag = db.prepare(
      `INSERT INTO tags (id, name, folder_id) VALUES (?, ?, 'c-1')`
    )
    tag.run('t-3', '丙')
    tag.run('t-1', '甲')
    tag.run('t-2', '乙')
    const attach = db.prepare('INSERT INTO paper_tags (paper_id, tag_id) VALUES (?, ?)')
    attach.run('p-1', 't-3')
    attach.run('p-1', 't-1')
    attach.run('p-1', 't-2')
    attach.run('p-2', 't-1')
    expect(repo.tagNamesForContext('p-1', 10)).toEqual(['甲', '乙', '丙'])
    expect(repo.tagNamesForContext('p-1', 2)).toEqual(['甲', '乙'])
    expect(repo.tagNamesForContext('p-2', 10)).toEqual(['甲'])
    expect(repo.tagNamesForContext('p-ghost', 10)).toEqual([])
    db.close()
  })

  it('C5 lineageGraphByFolder：锚图节点过滤+边两端正交（跨图边不入）+基础序 created_at', () => {
    const db = createTestDb()
    const repo = createAiContextRepo(db)
    seedCollection(db, 'c-1')
    seedCollection(db, 'c-2')
    seedNode(db, 'n-1', 'c-1', '2024-01-01T00:00:00.000Z')
    seedNode(db, 'n-2', 'c-1', '2024-02-01T00:00:00.000Z')
    seedNode(db, 'm-1', 'c-2', '2024-03-01T00:00:00.000Z')
    seedEdge(db, 'e-1', 'n-1', 'n-2') // 锚内边
    seedEdge(db, 'e-2', 'n-1', 'm-1') // 跨图边——to 端不在锚图→不入
    seedEdge(db, 'e-3', 'm-1', 'm-1') // 他图边
    const g1 = repo.lineageGraphByFolder('c-1')
    expect(g1.nodes.map((n) => n.id)).toEqual(['n-1', 'n-2']) // created_at 序
    expect(g1.edges.map((e) => e.id)).toEqual(['e-1'])
    const g2 = repo.lineageGraphByFolder('c-2')
    expect(g2.nodes.map((n) => n.id)).toEqual(['m-1'])
    expect(g2.edges.map((e) => e.id)).toEqual(['e-3'])
    expect(repo.lineageGraphByFolder('c-ghost').nodes).toEqual([])
    db.close()
  })

  it('C6 memoryCategoryIndex：分类计数+置顶 top3（updated_at DESC,id DESC）+最近 3（与置顶可重叠）', () => {
    const db = createTestDb()
    const repo = createAiContextRepo(db)
    seedPaper(db, 'p-1')
    seedPaper(db, 'p-2')
    // method_note：5 置顶（时间递增 id 递增）+2 非置顶
    seedMemory(db, 11, 'paper', 'p-1', 'method_note', '置1', '2024-01-01T00:00:00.000Z', 1)
    seedMemory(db, 12, 'paper', 'p-1', 'method_note', '置2', '2024-01-02T00:00:00.000Z', 1)
    seedMemory(db, 13, 'paper', 'p-1', 'method_note', '置3', '2024-01-03T00:00:00.000Z', 1)
    seedMemory(db, 14, 'paper', 'p-1', 'method_note', '置4', '2024-01-04T00:00:00.000Z', 1)
    seedMemory(db, 15, 'paper', 'p-1', 'method_note', '置5', '2024-01-05T00:00:00.000Z', 1)
    seedMemory(db, 16, 'paper', 'p-1', 'method_note', '非置旧', '2023-12-01T00:00:00.000Z', 0)
    // excerpt_quote：1 行（他锚隔离验证同场）
    seedMemory(db, 21, 'paper', 'p-2', 'excerpt_quote', '他锚', '2024-01-06T00:00:00.000Z', 0)
    const idx = repo.memoryCategoryIndex('paper', 'p-1')
    const method = idx.find((e) => e.category === 'method_note')!
    expect(method.count).toBe(6)
    expect(method.pinnedTop3.map((t) => t.title)).toEqual(['置5', '置4', '置3'])
    // 最近 3=全集序前 3（全置顶时段——与置顶集重叠合法）
    expect(method.recent3.map((t) => t.title)).toEqual(['置5', '置4', '置3'])
    expect(idx.find((e) => e.category === 'excerpt_quote')).toBeUndefined()
    // global 面：scope 单条件（anchorId 恒 null）
    seedMemory(db, 31, 'global', null, 'user_preference', '全局偏好', '2024-01-07T00:00:00.000Z', 0)
    const g = repo.memoryCategoryIndex('global', null)
    expect(g.find((e) => e.category === 'user_preference')!.count).toBe(1)
    db.close()
  })

  it('C7 folderNameOf：papers.folder_id 一跳→collections.name；行缺席→null', () => {
    const db = createTestDb()
    const repo = createAiContextRepo(db)
    seedCollection(db, 'c-1', '文件夹甲')
    seedPaper(db, 'p-1', 'c-1')
    expect(repo.folderNameOf('p-1')).toBe('文件夹甲')
    // 016 后 folder_id NOT NULL+FK——「一跳落空/行缺席」仅剩 ghost paper 形态
    expect(repo.folderNameOf('p-ghost')).toBeNull()
    db.close()
  })

  it('C8 collectionName：锚 collections 行名；缺席 null+memoryTop1ByCategory 各类 top-1', () => {
    const db = createTestDb()
    const repo = createAiContextRepo(db)
    seedCollection(db, 'c-1', '领域图')
    expect(repo.collectionName('c-1')).toBe('领域图')
    expect(repo.collectionName('c-ghost')).toBeNull()
    // top-1：每类取 (updated_at DESC,id DESC) 首行（行扫序首见）
    seedPaper(db, 'p-1')
    seedMemory(db, 41, 'paper', 'p-1', 'method_note', '旧', '2024-01-01T00:00:00.000Z', 0)
    seedMemory(db, 42, 'paper', 'p-1', 'method_note', '新', '2024-02-01T00:00:00.000Z', 0)
    const top1 = repo.memoryTop1ByCategory('paper', 'p-1')
    expect(top1).toHaveLength(1)
    expect(top1[0]!).toMatchObject({ category: 'method_note', title: '新', content: '内容' })
    db.close()
  })

  it('C9 L1 lineage 伴生读面：starredIdsInFolder/tagNamesByFolder/notesTitlesByFolder（域过滤确定性序）', () => {
    const db = createTestDb()
    const repo = createAiContextRepo(db)
    seedCollection(db, 'c-1')
    seedPaper(db, 'p-1', 'c-1')
    seedPaper(db, 'p-2', 'c-1')
    seedPaper(db, 'p-3', 'c-1')
    db.prepare('UPDATE papers SET is_starred = 1 WHERE id IN (?, ?)').run('p-1', 'p-3')
    seedNote(db, 'p-1', '笔记一')
    seedNote(db, 'p-3', '笔记三')
    const tag = db.prepare(`INSERT INTO tags (id, name, folder_id) VALUES (?, ?, 'c-1')`)
    tag.run('t-2', '乙')
    tag.run('t-1', '甲')
    expect([...repo.starredIdsInFolder('c-1')].sort()).toEqual(['p-1', 'p-3'])
    expect(repo.tagNamesByFolder('c-1')).toEqual(['甲', '乙']) // B 型 id ASC
    expect(repo.notesTitlesByFolder('c-1')).toEqual(['文献p-1', '文献p-3']) // title ASC,id ASC
    db.close()
  })

  it('C10 notesOf：A 型序 (updated_at DESC, id DESC)——绕 repo 手工双行（单笔记前提独立性 d1-W1）', () => {
    const db = createTestDb()
    const repo = createAiContextRepo(db)
    seedPaper(db, 'p-1')
    // 同 updated_at 平局 → id DESC 决胜（'zz-2'>'aa-1'）；播种序=aa 先 zz 后——
    // 无 ORDER BY 时物理序返回 'aa-1'（红证形态），A 型语句取 'zz-2'
    const ins = db.prepare(
      `INSERT INTO notes (id, paper_id, content_md, created_at, updated_at)
       VALUES (?, ?, ?, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z')`
    )
    ins.run('aa-1', 'p-1', '低 id 行')
    ins.run('zz-2', 'p-1', '高 id 行')
    const note = repo.notesOf('p-1')
    expect(note).not.toBeNull()
    expect(note!.contentMd).toBe('高 id 行')
    db.close()
  })
})
