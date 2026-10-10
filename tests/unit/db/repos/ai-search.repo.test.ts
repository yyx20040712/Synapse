/**
 * [F-DBCAMP-01 DB-2 U2b-2b] ai-search.repo 用例（always-active 真库夹具——
 * ai-context.repo.test 同型）。覆盖简报 §4-1：match papers/notes 腿命中、跨腿去重、
 * 图内过滤（文件夹内论文但非图节点→排除）、paper_id NULL 节点排除、top-5、
 * rank 序确定性、papers 腿序在前、like title/content 命中+\ % _ 转义、幽灵
 * folder 空。pattern/ftsQuery 由测试侧构造（P9——生产由 service 构造，repo 收
 * 绑定参数；escapeLike 单源 import 对齐）。
 */
import { describe, expect, it } from 'vitest'
import { createAiSearchRepo } from '../../../../src/main/db/repos/ai-search.repo'
import { escapeLike } from '../../../../src/main/services/ai/ai-memory-search.service'
import { createTestDb } from '../../../utils/fixtures'

type Db = ReturnType<typeof createTestDb>
type Repo = ReturnType<typeof createAiSearchRepo>

function seedPaper(
  db: Db,
  id: string,
  v: { title?: string; abstract?: string; year?: number | null; folderId?: string } = {}
): void {
  db.prepare(
    `INSERT INTO papers (id, file_ref, sha256, title, authors_json, year, venue, doi,
       arxiv_id, abstract, folder_id, added_at, updated_at)
     VALUES (?, ?, ?, ?, '[]', ?, '期刊甲', NULL, NULL, ?, ?, 't', 't')`
  ).run(
    id,
    `f/${id}.pdf`,
    `sha-${id}`,
    v.title ?? `文献${id}`,
    v.year === undefined ? 2020 : v.year,
    v.abstract ?? '摘要内容',
    v.folderId ?? '__main__'
  )
}

/** 图节点播种（paperId null=纯主题节点——S7 排除面） */
function seedNode(db: Db, id: string, folderId: string, paperId: string | null): void {
  db.prepare(
    `INSERT INTO lineage_nodes (id, title, year, x, y, folder_id, created_at, updated_at)
     VALUES (?, ?, 2020, NULL, NULL, ?, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z')`
  ).run(id, `节点${id}`, folderId)
  if (paperId !== null) {
    db.prepare('UPDATE lineage_nodes SET paper_id = ? WHERE id = ?').run(paperId, id)
  }
}

function seedNote(db: Db, paperId: string, content: string, title = ''): void {
  db.prepare(
    `INSERT INTO notes (id, paper_id, title, content_md, created_at, updated_at)
     VALUES (?, ?, ?, ?, 't', 't')`
  ).run(`n-${paperId}`, paperId, title, content)
}

/** LIKE 路 pattern 构造（与 service 同式：%escapeLike(q)% 单源对齐） */
function likePattern(q: string): string {
  return `%${escapeLike(q)}%`
}

function makeRepo(db: Db): Repo {
  return createAiSearchRepo(db)
}

/** 标准夹具：图 c-1 内两文献节点+一篇匹配笔记（多数用例共用底座） */
function seedBaseGraph(db: Db): void {
  db.prepare('INSERT INTO collections (id, name, position) VALUES (?, ?, 0)').run('c-1', '给水管网图')
  seedPaper(db, 'p-1', { title: '管网漏损检测方法', abstract: '摘要甲', folderId: 'c-1' })
  seedPaper(db, 'p-2', { title: '普通乙论文', abstract: '摘要乙', folderId: 'c-1' })
  seedNode(db, 'n-1', 'c-1', 'p-1')
  seedNode(db, 'n-2', 'c-1', 'p-2')
}

describe('F-DBCAMP-01 DB-2 U2b-2b ai-search.repo —— 文献域检索读面（两腿+图内过滤）', () => {
  it('S1 match papers 腿 title 命中（trigram 短语+图内节点行——noteContentMd 无笔记=null）', () => {
    const db = createTestDb()
    seedBaseGraph(db)
    const hits = makeRepo(db).searchLiterature('c-1', '"管网漏损检测"', 'match')
    expect(hits.map((h) => h.paperId)).toEqual(['p-1'])
    expect(hits[0]!.title).toBe('管网漏损检测方法')
    expect(hits[0]!.year).toBe(2020)
    expect(hits[0]!.abstract).toBe('摘要甲')
    expect(hits[0]!.noteContentMd).toBeNull()
    db.close()
  })

  it('S2 match papers 腿 abstract 列命中（三列检索域=title+abstract）', () => {
    const db = createTestDb()
    seedBaseGraph(db)
    seedPaper(db, 'p-3', { title: '题丙', abstract: '管网漏损检测的实测研究', folderId: 'c-1' })
    seedNode(db, 'n-3', 'c-1', 'p-3')
    const hits = makeRepo(db).searchLiterature('c-1', '"管网漏损检测"', 'match')
    expect(hits.map((h) => h.paperId)).toContain('p-3')
    db.close()
  })

  it('S3 match notes 腿命中（noteContentMd=命中行 content_md）', () => {
    const db = createTestDb()
    seedBaseGraph(db)
    seedNote(db, 'p-2', '实验记录：夜间流量法与声学检测联用方案')
    const hits = makeRepo(db).searchLiterature('c-1', '"夜间流量法与声学检测"', 'match')
    expect(hits.map((h) => h.paperId)).toEqual(['p-2'])
    expect(hits[0]!.noteContentMd).toBe('实验记录：夜间流量法与声学检测联用方案')
    db.close()
  })

  it('S4 跨腿去重：同 paperId 双腿命中→合并单条（papers 腿形态保留——note 随行）', () => {
    const db = createTestDb()
    seedBaseGraph(db)
    seedNote(db, 'p-1', '笔记也提到管网漏损检测')
    const hits = makeRepo(db).searchLiterature('c-1', '"管网漏损检测"', 'match')
    expect(hits.map((h) => h.paperId)).toEqual(['p-1'])
    expect(hits[0]!.noteContentMd).toBe('笔记也提到管网漏损检测')
    db.close()
  })

  it('S5 papers 腿序在前：title 命中行先于 notes 腿命中行（合并序行为锁）', () => {
    const db = createTestDb()
    db.prepare('INSERT INTO collections (id, name, position) VALUES (?, ?, 0)').run('c-1', '图')
    seedPaper(db, 'p-9', { title: '管网易位论文', abstract: '别的摘要', folderId: 'c-1' })
    seedPaper(db, 'p-1', { title: '首篇', abstract: '别的摘要一', folderId: 'c-1' })
    seedPaper(db, 'p-2', { title: '次篇', abstract: '别的摘要二', folderId: 'c-1' })
    seedNode(db, 'n-1', 'c-1', 'p-1')
    seedNode(db, 'n-2', 'c-1', 'p-2')
    seedNode(db, 'n-9', 'c-1', 'p-9')
    seedNote(db, 'p-1', '笔记提到管网易位一词')
    seedNote(db, 'p-2', '笔记也提到管网易位一词')
    const hits = makeRepo(db).searchLiterature('c-1', '"管网易位"', 'match')
    // papers 腿（p-9 title）在前；notes 腿（p-1/p-2）接续按腿内序
    expect(hits.map((h) => h.paperId)).toEqual(['p-9', 'p-1', 'p-2'])
    db.close()
  })

  it('S6 图内过滤：文件夹内论文但非图节点→排除（无 lineage_nodes 行的 p-ghost 不入）', () => {
    const db = createTestDb()
    seedBaseGraph(db)
    seedPaper(db, 'p-ghost', { title: '管网漏损检测幽灵', abstract: 'x', folderId: 'c-1' })
    const hits = makeRepo(db).searchLiterature('c-1', '"管网漏损检测"', 'match')
    expect(hits.map((h) => h.paperId)).toEqual(['p-1'])
    expect(hits.some((h) => h.paperId === 'p-ghost')).toBe(false)
    db.close()
  })

  it('S7 paper_id NULL 节点排除：纯主题节点不 Whitelist 任何论文（IS NOT NULL 子句）', () => {
    const db = createTestDb()
    db.prepare('INSERT INTO collections (id, name, position) VALUES (?, ?, 0)').run('c-1', '图')
    seedPaper(db, 'p-1', { title: '管网漏损检测甲', abstract: 'x', folderId: 'c-1' })
    seedNode(db, 'n-theme', 'c-1', null)
    const hits = makeRepo(db).searchLiterature('c-1', '"管网漏损检测"', 'match')
    expect(hits).toEqual([])
    db.close()
  })

  it('S8 top-5：7 篇图内命中→恰 5（LIMIT 截断）', () => {
    const db = createTestDb()
    db.prepare('INSERT INTO collections (id, name, position) VALUES (?, ?, 0)').run('c-1', '图')
    for (let i = 1; i <= 7; i++) {
      const id = `p-${i}`
      seedPaper(db, id, { title: `管网漏损检测${i}号`, abstract: 'x', folderId: 'c-1' })
      seedNode(db, `n-${i}`, 'c-1', id)
    }
    const hits = makeRepo(db).searchLiterature('c-1', '"管网漏损检测"', 'match')
    expect(hits).toHaveLength(5)
    db.close()
  })

  it('S9 rank 序确定性：同参两次调用 deep-equal+字段全等（无 Date/random 参与）', () => {
    const db = createTestDb()
    seedBaseGraph(db)
    seedNote(db, 'p-2', '笔记提到管网漏损检测')
    const repo = makeRepo(db)
    const a = repo.searchLiterature('c-1', '"管网漏损检测"', 'match')
    const b = repo.searchLiterature('c-1', '"管网漏损检测"', 'match')
    expect(a).toEqual(b)
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
    db.close()
  })

  it('S10 like title 命中（pattern 由调用方构造——repo 收绑定参数）', () => {
    const db = createTestDb()
    seedBaseGraph(db)
    const hits = makeRepo(db).searchLiterature('c-1', likePattern('管网'), 'like')
    expect(hits.map((h) => h.paperId)).toEqual(['p-1'])
    db.close()
  })

  it('S11 like notes content 命中+\\ % _ 转义（通配符字面匹配——负对照不含 _ 变体）', () => {
    const db = createTestDb()
    db.prepare('INSERT INTO collections (id, name, position) VALUES (?, ?, 0)').run('c-1', '图')
    seedPaper(db, 'p-1', { title: '精度研究', abstract: 'x', folderId: 'c-1' })
    seedPaper(db, 'p-2', { title: '精度对照', abstract: 'x', folderId: 'c-1' })
    seedNode(db, 'n-1', 'c-1', 'p-1')
    seedNode(db, 'n-2', 'c-1', 'p-2')
    seedNote(db, 'p-1', '实验精度达 100% 合格线_a')
    seedNote(db, 'p-2', '实验精度达 100% 合格线Xa')
    const repo = makeRepo(db)
    // % 与 _ 均转义为字面字符：'\%' 匹配百分号本体、'\_' 匹配下划线本体
    const hits = repo.searchLiterature('c-1', likePattern('100% 合格线_a'), 'like')
    expect(hits.map((h) => h.paperId)).toEqual(['p-1'])
    db.close()
  })

  it('S12 幽灵 folder：空结果（图内过滤天然空集）', () => {
    const db = createTestDb()
    seedBaseGraph(db)
    const repo = makeRepo(db)
    expect(repo.searchLiterature('c-ghost', '"管网漏损检测"', 'match')).toEqual([])
    expect(repo.searchLiterature('c-ghost', likePattern('管网'), 'like')).toEqual([])
    db.close()
  })

  it('S13 [r1 R-B1] match papers 腿列过滤：authors-only 命中行排除（检索域三列声明强制面）', () => {
    const db = createTestDb()
    db.prepare('INSERT INTO collections (id, name, position) VALUES (?, ?, 0)').run('c-1', '图')
    seedPaper(db, 'p-1', { title: '水质研究', abstract: '常规摘要', folderId: 'c-1' })
    db.prepare('UPDATE papers SET authors_json = ? WHERE id = ?').run('["Quantum Lei"]', 'p-1')
    seedNode(db, 'n-1', 'c-1', 'p-1')
    const repo = makeRepo(db)
    // 裸 MATCH 会命中 authors-only 行（FTS5 全列检索）——列过滤前缀修复后应零命中
    expect(repo.searchLiterature('c-1', '"quantum"', 'match')).toEqual([])
    // 对照组：title 含词仍命中（列过滤不误伤检索域内列）
    expect(repo.searchLiterature('c-1', '"水质研究"', 'match')).toHaveLength(1)
    db.close()
  })

  it('S14 [r1 R-N2] like 路 abstract 列分支：abstract 含词 title 不含→命中', () => {
    const db = createTestDb()
    db.prepare('INSERT INTO collections (id, name, position) VALUES (?, ?, 0)').run('c-1', '图')
    seedPaper(db, 'p-1', { title: '题名无关', abstract: '涉及管网沉积物冲刷的摘要', folderId: 'c-1' })
    seedPaper(db, 'p-2', { title: '另一篇', abstract: '普通摘要', folderId: 'c-1' })
    seedNode(db, 'n-1', 'c-1', 'p-1')
    seedNode(db, 'n-2', 'c-1', 'p-2')
    const hits = makeRepo(db).searchLiterature('c-1', likePattern('沉积物冲刷'), 'like')
    expect(hits.map((h) => h.paperId)).toEqual(['p-1'])
    db.close()
  })

  it('S15 [r1 R-N1] notes 腿 like 第二决胜键：P13 破（同论文双笔记行）→nt.rowid ASC 可重复序', () => {
    const db = createTestDb()
    db.prepare('INSERT INTO collections (id, name, position) VALUES (?, ?, 0)').run('c-1', '图')
    seedPaper(db, 'p-1', { title: '题甲', abstract: 'x', folderId: 'c-1' })
    seedNode(db, 'n-1', 'c-1', 'p-1')
    // 手工双笔记行（破单笔记不变量——防御面夹具）：rowid 小者=先插
    seedNote(db, 'p-1', '先插笔记含沉积物语料')
    db.prepare(
      `INSERT INTO notes (id, paper_id, title, content_md, created_at, updated_at)
       VALUES ('n-p-1-b', 'p-1', '', '后插笔记含沉积物语料', 't', 't')`
    ).run()
    const hits = makeRepo(db).searchLiterature('c-1', likePattern('沉积物'), 'like')
    expect(hits).toHaveLength(1)
    expect(hits[0]!.noteContentMd).toBe('先插笔记含沉积物语料')
    db.close()
  })
})
