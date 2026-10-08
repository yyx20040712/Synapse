/**
 * [F-DBCAMP-01 DB-1 U1] 迁移 016（papers.folder_id NOT NULL 重建——FK-OFF
 * 官方 12 步序）+ 迁移执行器 FK-OFF 模式锁定测试（真库夹具——
 * migrate-folders-graphs.test.ts 同型）。
 *
 * 真相源=docs/design/2026-10-08_f-dbcamp01-design.md §5.c/§12（016 规格+
 * A6 存量清理授权+folder↔graph 一一对应）+2026-10-08 U1 简报主控裁决③
 * （候选 B 实证路线：探针结论=候选 A 的 legacy_alter_table 换名舞步不可行
 * ——SQLite 3.53.4 子表 FK 子句改写 ⟺ FK ON 或 legacy OFF，legacy 单开不抑制；
 * 官方 12 步序=旧表只 DROP 不 RENAME+新表 RENAME 到位零改写。探针证据=
 * 仓外 scripts-audits/20261008-dbcamp-db1/u1-probe-*.raw.txt）。
 * 裁决②语义依据=v122「未归档域取消——所有文献必须在文件夹里」。
 * always-active（不经 guardedDescribe）。
 */
import { describe, expect, it } from 'vitest'
import { openDatabase } from '../../../src/main/db/connection'
import { MIGRATIONS, migrate, readUserVersion } from '../../../src/main/db/migrate'

type Db = ReturnType<typeof openDatabase>

/** v15 形态直插 papers（20 列；folderId 缺省 NULL=待清理孤儿形态） */
function seedPaper(
  db: Db,
  id: string,
  opts: {
    folderId?: string | null
    title?: string
    citedBy?: number
    impact?: number
    addedAt?: string
  } = {}
): void {
  db.prepare(
    `INSERT INTO papers (id, file_ref, sha256, title, authors_json, year, venue, doi, arxiv_id,
       abstract, source, enrich_status, added_at, updated_at, last_read_page,
       cited_by_count, cited_by_fetched_at, cited_by_count_source, folder_id, impact_factor)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'local', 'pending', ?, ?, 0, ?, ?, ?, ?, ?)`
  ).run(
    id, `f/${id}.pdf`, `sha-${id}`, opts.title ?? `文献${id}`, '["张三"]', 2024, 'V', null, null,
    '', opts.addedAt ?? '2026-01-01T00:00:00.000Z', opts.addedAt ?? '2026-01-01T00:00:00.000Z',
    opts.citedBy ?? null, opts.citedBy !== undefined ? '2026-02-02' : null,
    opts.citedBy !== undefined ? 'openalex' : null, opts.folderId ?? null, opts.impact ?? null
  )
}

function seedCollection(db: Db, id: string, name: string, position: number): void {
  db.prepare('INSERT INTO collections (id, name, position) VALUES (?, ?, ?)').run(id, name, position)
}

function seedAnnotation(db: Db, id: string, paperId: string): void {
  db.prepare(
    `INSERT INTO annotations (id, paper_id, page, kind, sort_key, created_at, updated_at)
     VALUES (?, ?, 0, 'highlight', '0000:01', 't', 't')`
  ).run(id, paperId)
}

function seedNote(db: Db, id: string, paperId: string): void {
  db.prepare('INSERT INTO notes (id, paper_id, created_at, updated_at) VALUES (?, ?, ?, ?)').run(
    id, paperId, 't', 't'
  )
}

function seedPaperTag(db: Db, paperId: string, tagId: string): void {
  db.prepare('INSERT INTO paper_tags (paper_id, tag_id) VALUES (?, ?)').run(paperId, tagId)
}

function seedAiNote(db: Db, id: string, paperId: string): void {
  db.prepare(
    `INSERT INTO ai_notes (id, paper_id, role, question, model, content_md, created_at, updated_at)
     VALUES (?, ?, 'first-read', 'Q1', 'm', 'x', 't', 't')`
  ).run(id, paperId)
}

function seedNode(db: Db, id: string, paperId: string | null, folderId: string | null): void {
  db.prepare(
    `INSERT INTO lineage_nodes (id, paper_id, title, core_idea, year, x, y, created_at, updated_at, folder_id)
     VALUES (?, ?, ?, '', 2024, NULL, NULL, 't', 't', ?)`
  ).run(id, paperId, `节点${id}`, folderId)
}

function seedEdge(db: Db, id: string, fromNode: string, toNode: string): void {
  db.prepare(
    `INSERT INTO lineage_edges (id, from_node, to_node, label, kind, created_at, updated_at)
     VALUES (?, ?, ?, '', 'manual', 't', 't')`
  ).run(id, fromNode, toNode)
}

/** 建到 v15 的库（016 前形态） */
function openV15(): Db {
  const db = openDatabase(':memory:')
  migrate(db, MIGRATIONS.filter((m) => m.version <= 15))
  return db
}

/** sqlite_master 对象多重集（W1：索引/触发器/视图——016 前后须相等） */
function objectMultiset(db: Db): string[] {
  return (
    db.prepare(
      "SELECT type || ':' || name AS o FROM sqlite_master WHERE type IN ('index','trigger','view') AND name NOT LIKE 'sqlite_%' ORDER BY o"
    ).all() as Array<{ o: string }>
  ).map((r) => r.o)
}

/** 全表集（迁移前后一致锚——016 零新表） */
function tableSet(db: Db): string[] {
  return (
    db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all() as Array<{
      name: string
    }>
  ).map((r) => r.name)
}

describe('db/migrate —— 016 papers.folder_id NOT NULL 重建（FK-OFF 官方 12 步序）', () => {
  it('v15→16：NULL 归属存量清理=手工级联（直系五子表+二级两处：边随节点灭/锚定标注降级置 NULL——FK OFF 下 DDL 动作失效面全复刻），孤儿与其子行全灭、他行零损失', () => {
    const db = openV15()
    db.prepare("INSERT INTO tags (id, name) VALUES ('tg-1', '必读')").run()
    seedPaper(db, 'p-orphan')
    seedPaper(db, 'p-ok', { folderId: '__main__' })
    seedAnnotation(db, 'an-orphan', 'p-orphan')
    seedAnnotation(db, 'an-ok', 'p-ok')
    seedNote(db, 'nt-orphan', 'p-orphan')
    seedNote(db, 'nt-ok', 'p-ok')
    seedPaperTag(db, 'p-orphan', 'tg-1')
    seedPaperTag(db, 'p-ok', 'tg-1')
    seedAiNote(db, 'ai-orphan', 'p-orphan')
    seedAiNote(db, 'ai-ok', 'p-ok')
    // 幸存语料挂孤儿文献的标注（annotation_id SET NULL 降级面——FK OFF 手工复刻）
    db.prepare(
      `INSERT INTO ai_notes (id, paper_id, annotation_id, role, question, model, content_md, created_at, updated_at)
       VALUES ('ai-anchor', 'p-ok', 'an-orphan', 'first-read', 'Q1', 'm', 'x', 't', 't')`
    ).run()
    seedNode(db, 'n-orphan', 'p-orphan', '__main__')
    seedNode(db, 'n-ok', 'p-ok', '__main__')
    seedEdge(db, 'e-orphan-ok', 'n-orphan', 'n-ok')
    seedEdge(db, 'e-ok-ok', 'n-ok', 'n-ok')
    migrate(db)
    expect(db.prepare('SELECT COUNT(*) c FROM papers WHERE folder_id IS NULL').get()).toEqual({ c: 0 })
    expect(db.prepare("SELECT COUNT(*) c FROM papers WHERE id='p-orphan'").get()).toEqual({ c: 0 })
    // 五子表逐表：孤儿行随灭
    expect(db.prepare("SELECT COUNT(*) c FROM annotations WHERE paper_id='p-orphan'").get()).toEqual({ c: 0 })
    expect(db.prepare("SELECT COUNT(*) c FROM notes WHERE paper_id='p-orphan'").get()).toEqual({ c: 0 })
    expect(db.prepare("SELECT COUNT(*) c FROM paper_tags WHERE paper_id='p-orphan'").get()).toEqual({ c: 0 })
    expect(db.prepare("SELECT COUNT(*) c FROM ai_notes WHERE paper_id='p-orphan'").get()).toEqual({ c: 0 })
    expect(db.prepare("SELECT COUNT(*) c FROM lineage_nodes WHERE paper_id='p-orphan'").get()).toEqual({ c: 0 })
    // 二级级联：孤儿节点为端点的边随灭；两端健全的边保留
    expect(db.prepare("SELECT COUNT(*) c FROM lineage_edges WHERE id='e-orphan-ok'").get()).toEqual({ c: 0 })
    expect(db.prepare("SELECT COUNT(*) c FROM lineage_edges WHERE id='e-ok-ok'").get()).toEqual({ c: 1 })
    // 二级 SET NULL：幸存语料的 annotation_id 降级为 NULL（行保留）
    expect(
      db.prepare("SELECT annotation_id FROM ai_notes WHERE id='ai-anchor'").get()
    ).toEqual({ annotation_id: null })
    // 他行零损失
    expect(db.prepare("SELECT COUNT(*) c FROM papers WHERE id='p-ok'").get()).toEqual({ c: 1 })
    expect(db.prepare("SELECT COUNT(*) c FROM annotations WHERE id='an-ok'").get()).toEqual({ c: 1 })
    expect(db.prepare("SELECT COUNT(*) c FROM notes WHERE id='nt-ok'").get()).toEqual({ c: 1 })
    expect(db.prepare("SELECT COUNT(*) c FROM paper_tags WHERE paper_id='p-ok'").get()).toEqual({ c: 1 })
    expect(db.prepare("SELECT COUNT(*) c FROM ai_notes WHERE id='ai-ok'").get()).toEqual({ c: 1 })
    expect(db.prepare("SELECT COUNT(*) c FROM lineage_nodes WHERE paper_id='p-ok'").get()).toEqual({ c: 1 })
    db.close()
  })

  it('v15→16：重建数据保全——20 列逐列相等（含 cited_by 三列/folder_id/impact_factor）+rowid 相对序保全+空洞闭合（重建发生的硬证据）', () => {
    const db = openV15()
    seedCollection(db, 'c-x', '子图', 5)
    seedPaper(db, 'p-a', { folderId: '__main__', addedAt: '2026-01-01T00:00:00.000Z' })
    seedPaper(db, 'p-del', { folderId: '__main__', addedAt: '2026-01-02T00:00:00.000Z' })
    seedPaper(db, 'p-b', { folderId: 'c-x', citedBy: 7, impact: 3.5, addedAt: '2026-01-03T00:00:00.000Z' })
    seedPaper(db, 'p-c', { folderId: '__main__', addedAt: '2026-01-04T00:00:00.000Z' })
    db.prepare("DELETE FROM papers WHERE id='p-del'").run()
    migrate(db)
    const row = db.prepare('SELECT * FROM papers WHERE id = ?').get('p-b') as Record<string, unknown>
    expect(row['file_ref']).toBe('f/p-b.pdf')
    expect(row['sha256']).toBe('sha-p-b')
    expect(row['title']).toBe('文献p-b')
    expect(row['authors_json']).toBe('["张三"]')
    expect(row['year']).toBe(2024)
    expect(row['venue']).toBe('V')
    expect(row['abstract']).toBe('')
    expect(row['source']).toBe('local')
    expect(row['enrich_status']).toBe('pending')
    expect(row['added_at']).toBe('2026-01-03T00:00:00.000Z')
    expect(row['last_read_page']).toBe(0)
    expect(row['cited_by_count']).toBe(7)
    expect(row['cited_by_fetched_at']).toBe('2026-02-02')
    expect(row['cited_by_count_source']).toBe('openalex')
    expect(row['folder_id']).toBe('c-x')
    expect(row['impact_factor']).toBe(3.5)
    // rowid 相对序（重建重排号但不改相对序——FTS 重映射/决胜键语义锚）
    const order = db
      .prepare('SELECT id FROM papers ORDER BY rowid')
      .all() as Array<{ id: string }>
    expect(order.map((r) => r.id)).toEqual(['p-a', 'p-b', 'p-c'])
    // 空洞闭合：v15 有删除史=空洞 rowid 集；重建后 1..N 连续（重建确已发生的硬判别）
    const rowids = order.map((_, i) => i + 1)
    expect(
      (db.prepare('SELECT rowid FROM papers ORDER BY rowid').all() as Array<{ rowid: number }>).map(
        (r) => r.rowid
      )
    ).toEqual(rowids)
    db.close()
  })

  it('v15→16：前后对象多重集相等（索引/触发器/视图）+表集一致+papers_old/papers_new 零残留（W1/N3）', () => {
    const db = openV15()
    seedPaper(db, 'p-1', { folderId: '__main__' })
    const objectsBefore = objectMultiset(db)
    const tablesBefore = tableSet(db)
    const result = migrate(db)
    // 判别器：16 确已应用（否则下方多重集断言=无迁移恒真）
    expect(result.appliedVersions).toEqual([16])
    expect(objectMultiset(db)).toEqual(objectsBefore)
    expect(tableSet(db)).toEqual(tablesBefore)
    const residue = db
      .prepare("SELECT name FROM sqlite_master WHERE name LIKE 'papers_old%' OR name='papers_new' OR sql LIKE '%papers_old%'")
      .all()
    expect(residue).toEqual([])
    db.close()
  })

  it('v15→16：FTS 双扫重建后 MATCH 恢复+已清孤儿不残留+三触发器在新表 I/U/D 三路活性', () => {
    const db = openV15()
    seedPaper(db, 'p-ftsa', { folderId: '__main__', title: '智慧水务综述' })
    seedPaper(db, 'p-orphan', { title: '未归档遗孤文献' })
    migrate(db)
    const hit = db.prepare(`SELECT rowid FROM papers_fts WHERE papers_fts MATCH '"水务综述"'`).get()
    expect(hit).toBeTruthy()
    expect(
      db.prepare(`SELECT rowid FROM papers_fts WHERE papers_fts MATCH '"未归档遗孤"'`).get()
    ).toBeUndefined()
    // INSERT 路
    db.prepare(
      `INSERT INTO papers (id, file_ref, sha256, title, added_at, updated_at, folder_id)
       VALUES ('p-n', 'f/n.pdf', 'sha-n', '触发器活证新篇', 't', 't', '__main__')`
    ).run()
    expect(
      db.prepare(`SELECT rowid FROM papers_fts WHERE papers_fts MATCH '"触发器活证"'`).get()
    ).toBeTruthy()
    // UPDATE 路（旧灭新生）
    db.prepare(`UPDATE papers SET title='改名后的标题' WHERE id='p-n'`).run()
    expect(
      db.prepare(`SELECT rowid FROM papers_fts WHERE papers_fts MATCH '"触发器活证"'`).get()
    ).toBeUndefined()
    expect(
      db.prepare(`SELECT rowid FROM papers_fts WHERE papers_fts MATCH '"改名后的标题"'`).get()
    ).toBeTruthy()
    // DELETE 路
    db.prepare(`DELETE FROM papers WHERE id='p-n'`).run()
    expect(
      db.prepare(`SELECT rowid FROM papers_fts WHERE papers_fts MATCH '"改名后的标题"'`).get()
    ).toBeUndefined()
    db.close()
  })

  it('v15→16：foreign_key_check=0+FK 复位 ON+级联活性恢复（新表与子表 FK 关系真接上）', () => {
    const db = openV15()
    seedPaper(db, 'p-1', { folderId: '__main__' })
    seedAnnotation(db, 'an-1', 'p-1')
    seedNote(db, 'nt-1', 'p-1')
    migrate(db)
    // 判别器：16 确已应用（否则 FK 从未被关断=复位断言恒真）
    expect(readUserVersion(db)).toBe(16)
    expect(db.pragma('foreign_key_check')).toEqual([])
    expect(db.pragma('foreign_keys', { simple: true })).toBe(1)
    db.prepare(`DELETE FROM papers WHERE id='p-1'`).run()
    expect(db.prepare('SELECT COUNT(*) c FROM annotations').get()).toEqual({ c: 0 })
    expect(db.prepare('SELECT COUNT(*) c FROM notes').get()).toEqual({ c: 0 })
    db.close()
  })

  it('投影再对齐保险丝：错位节点（folder≠文献归属）与 NULL 归属节点回正为文献归属；主题节点不碰（folder↔graph 一一对应——2026-10-08 裁决①）', () => {
    const db = openV15()
    seedCollection(db, 'c-other', '他图', 3)
    seedPaper(db, 'p-1', { folderId: '__main__' })
    seedPaper(db, 'p-2', { folderId: 'c-other' })
    seedNode(db, 'n-mis', 'p-1', 'c-other')
    seedNode(db, 'n-null', 'p-2', null)
    seedNode(db, 'n-theme', null, 'c-other')
    migrate(db)
    expect(
      db.prepare("SELECT folder_id FROM lineage_nodes WHERE id='n-mis'").get()
    ).toEqual({ folder_id: '__main__' })
    expect(
      db.prepare("SELECT folder_id FROM lineage_nodes WHERE id='n-null'").get()
    ).toEqual({ folder_id: 'c-other' })
    // 主题节点（paper_id NULL）不在投影域——归属不动
    expect(
      db.prepare("SELECT folder_id FROM lineage_nodes WHERE id='n-theme'").get()
    ).toEqual({ folder_id: 'c-other' })
    db.close()
  })

  it('新库全链：user_version=16+应用清单 [1..16]+幂等重入（再跑 applied=[]）', () => {
    const db = openDatabase(':memory:')
    const result = migrate(db)
    expect(result.currentVersion).toBe(16)
    expect(result.appliedVersions).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16])
    expect(readUserVersion(db)).toBe(16)
    const again = migrate(db)
    expect(again.appliedVersions).toEqual([])
    db.close()
  })

  it('[回炉轮1 R1] FTS 清旧扫判别锚：rowid 空洞形态（幸存者 rowid=1,3）——逐文献 MATCH 恰一行且 rowid=新表实读值（排他：残留/错位即多行或错号）', () => {
    const db = openV15()
    seedPaper(db, 'p-a', { folderId: '__main__', title: '智慧水务综述' })
    seedPaper(db, 'p-mid', { folderId: '__main__', title: '中间行水文模型' })
    seedPaper(db, 'p-c', { folderId: '__main__', title: '管网漏损检测' })
    // v15 期删中行（触发器自动清其 FTS 条目→已删行词条在迁移前已不在索引——
    // 无需也无从断言其迁移后缺席）→幸存者 rowid=1,3 空洞形态锚〔d1-新N1 处置：
    // 删恒真子断言〕
    db.prepare("DELETE FROM papers WHERE id='p-mid'").run()
    const preRowids = (
      db.prepare('SELECT rowid FROM papers ORDER BY rowid').all() as Array<{ rowid: number }>
    ).map((r) => r.rowid)
    expect(preRowids).toEqual([1, 3])
    migrate(db)
    // 新表实读 rowid（重建空洞闭合——断言吃实读值，禁硬编码漂移）
    const ra = db.prepare("SELECT rowid FROM papers WHERE id='p-a'").get() as { rowid: number }
    const rc = db.prepare("SELECT rowid FROM papers WHERE id='p-c'").get() as { rowid: number }
    const ma = db
      .prepare(`SELECT rowid FROM papers_fts WHERE papers_fts MATCH '"水务综述"'`)
      .all() as Array<{ rowid: number }>
    expect(ma).toEqual([{ rowid: ra.rowid }])
    const mc = db
      .prepare(`SELECT rowid FROM papers_fts WHERE papers_fts MATCH '"漏损检测"'`)
      .all() as Array<{ rowid: number }>
    expect(mc).toEqual([{ rowid: rc.rowid }])
    db.close()
  })

  it('NOT NULL 契约：folder_id=NULL 写拒（UPDATE/显式 NULL INSERT 双面）+列级非空标记在档', () => {
    const db = openDatabase(':memory:')
    migrate(db)
    db.prepare(
      `INSERT INTO papers (id, file_ref, sha256, title, added_at, updated_at, folder_id)
       VALUES ('p-1', 'f/1.pdf', 'sha-1', 't', 't', 't', '__main__')`
    ).run()
    expect(() => db.prepare(`UPDATE papers SET folder_id=NULL WHERE id='p-1'`).run()).toThrow(
      /NOT NULL constraint failed/
    )
    expect(() =>
      db.prepare(
        `INSERT INTO papers (id, file_ref, sha256, title, added_at, updated_at, folder_id)
         VALUES ('p-2', 'f/2.pdf', 'sha-2', 't', 't', 't', NULL)`
      ).run()
    ).toThrow(/NOT NULL constraint failed/)
    const col = (
      db.prepare('PRAGMA table_info(papers)').all() as Array<{
        name: string
        notnull: number
        dflt_value: string | null
      }>
    ).find((c) => c.name === 'folder_id')
    expect(col?.notnull).toBe(1)
    expect(col?.dflt_value).toContain('__main__')
    db.close()
  })
})

describe('db/migrate —— FK-OFF 迁移模式执行器（016 配套——简报裁决③候选 B 授权面）', () => {
  it('fkOff 迁移违约：事务内 foreign_key_check 拦截→抛+整体回滚（半成品表不残留）+FK 复位 ON', () => {
    const db = openDatabase(':memory:')
    const bad = [
      {
        version: 1,
        name: 'fkoff_bad',
        sql: `CREATE TABLE probe_parent (id TEXT PRIMARY KEY);
              CREATE TABLE probe_child (id TEXT PRIMARY KEY, pid TEXT NOT NULL REFERENCES probe_parent(id));
              INSERT INTO probe_child VALUES ('c1', 'ghost');`,
        fkOff: true
      }
    ]
    expect(() => migrate(db, bad)).toThrow(/foreign_key_check/)
    expect(readUserVersion(db)).toBe(0)
    const leftover = db
      .prepare("SELECT name FROM sqlite_master WHERE name LIKE 'probe_%'")
      .all()
    expect(leftover).toEqual([])
    expect(db.pragma('foreign_keys', { simple: true })).toBe(1)
    db.close()
  })

  it('fkOff 迁移正常应用：user_version 前进+FK 复位 ON+FK OFF 期可观察（NO ACTION 子行在场 DROP 父表——FK ON 下必炸）+后续常规迁移不受染', () => {
    const db = openDatabase(':memory:')
    const list = [
      {
        version: 1,
        name: 'fkoff_ok',
        sql: `CREATE TABLE probe_ok (x TEXT);
              CREATE TABLE probe_fk_parent (id TEXT PRIMARY KEY);
              CREATE TABLE probe_fk_child (id TEXT PRIMARY KEY, pid TEXT NOT NULL REFERENCES probe_fk_parent(id));
              INSERT INTO probe_fk_parent VALUES ('p');
              INSERT INTO probe_fk_child VALUES ('c', 'p');
              DROP TABLE probe_fk_parent;
              DELETE FROM probe_fk_child;`,
        fkOff: true
      },
      { version: 2, name: 'normal_after', sql: 'CREATE TABLE probe_after (y TEXT);' }
    ]
    const result = migrate(db, list)
    expect(result.appliedVersions).toEqual([1, 2])
    expect(readUserVersion(db)).toBe(2)
    expect(db.pragma('foreign_keys', { simple: true })).toBe(1)
    expect(db.pragma('foreign_key_check')).toEqual([])
    // [回炉轮1 R8] 显式期望清单：三表在场+probe_fk_parent 已随 FK OFF 窗口内
    // DROP 消失（原 NOT IN 写法与 IN 集合无交集=恒真无效断言，勘正）
    const survivors = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE name IN ('probe_ok','probe_after','probe_fk_child','probe_fk_parent')"
      )
      .all() as Array<{ name: string }>
    expect(survivors.map((r) => r.name).sort()).toEqual(['probe_after', 'probe_fk_child', 'probe_ok'])
    db.close()
  })
})
