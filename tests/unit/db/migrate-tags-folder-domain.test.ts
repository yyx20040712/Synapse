/**
 * [F-DBCAMP-01 DB-1 U4 / F-TAGS-02] 迁移 019（tags 多域：folder_id 域化+
 * UNIQUE(folder_id,name)+存量归主图+挂接域一致性触发器）锁定测试
 * （真库夹具——migrate-papers-folder-not-null.test.ts 同型）。
 *
 * 真相源=docs/design/2026-10-08_f-dbcamp01-design.md §5.c（019 行）+§12
 * +F-TAGS-02 票面三裁决（[甲] 存量归主图+非主图挂接摘除各夹白手起家/
 * [乙] 表级挂接域一致——标签=工作区资产不随文献走/[丙] 筛选上限本批不动）
 * +2026-10-08 晨用户裁决（完全隔离终确认+域内 20 满禁建+每篇 6 硬禁）
 * +2026-10-08 U4 简报主控裁决③（019 fkOff——tags 是父表 DROP 级联灭挂接
 * =016 同因；CASCADE=012 族域资产先例〔夹删则域资产随灭〕；INSERT 面守卫
 * 触发器 paper_tags_domain_guard）。
 * always-active（不经 guardedDescribe）。
 */
import { describe, expect, it } from 'vitest'
import { openDatabase } from '../../../src/main/db/connection'
import { MIGRATIONS, migrate, readUserVersion } from '../../../src/main/db/migrate'

type Db = ReturnType<typeof openDatabase>

function seedCollection(db: Db, id: string, name: string, position = 0): void {
  db.prepare('INSERT INTO collections (id, name, position) VALUES (?, ?, ?)').run(id, name, position)
}

/** v18 形态直插 papers（folder_id 走 016 DEFAULT '__main__'——缺省合法） */
function seedPaper(db: Db, id: string, folderId = '__main__'): void {
  db.prepare(
    `INSERT INTO papers (id, file_ref, sha256, title, added_at, updated_at, folder_id)
     VALUES (?, ?, ?, ?, 't', 't', ?)`
  ).run(id, `f/${id}.pdf`, `sha-${id}`, `文献${id}`, folderId)
}

/** v18 形态直插 tags（无 folder_id 列——019 前形态） */
function seedTag(db: Db, id: string, name: string, color: string | null = null): void {
  db.prepare('INSERT INTO tags (id, name, color) VALUES (?, ?, ?)').run(id, name, color)
}

function seedPaperTag(db: Db, paperId: string, tagId: string): void {
  db.prepare('INSERT INTO paper_tags (paper_id, tag_id) VALUES (?, ?)').run(paperId, tagId)
}

/** 建到 v18 的库（019 前形态——tags 无 folder_id/全局 UNIQUE(name)） */
function openV18(): Db {
  const db = openDatabase(':memory:')
  migrate(db, MIGRATIONS.filter((m) => m.version <= 18))
  return db
}

/** sqlite_master 对象多重集（type:name 形态——migrate-papers-folder-not-null
 * objectMultiset 同型：index/trigger/view/table 全纳，sqlite_% 排除） */
function objectMultiset(db: Db): string[] {
  return (
    db.prepare(
      "SELECT type || ':' || name AS o FROM sqlite_master WHERE type IN ('index','trigger','view','table') AND name NOT LIKE 'sqlite_%' ORDER BY o"
    ).all() as Array<{ o: string }>
  ).map((r) => r.o)
}

describe('db/migrate —— 019 tags 多域（folder_id 域化+UNIQUE(folder_id,name)+域守卫触发器）', () => {
  it('v18→19 [甲] 存量归主图：既有 tags 行全落 __main__+color 保真；非主图文献挂接摘除+主图挂接保留（各夹白手起家）', () => {
    const db = openV18()
    seedCollection(db, 'c-a', '图甲')
    seedPaper(db, 'p-main')
    seedPaper(db, 'p-a', 'c-a')
    seedTag(db, 't-1', '必读')
    seedTag(db, 't-2', '核心', '#e11d48')
    seedPaperTag(db, 'p-main', 't-1') // 主图挂接——保留
    seedPaperTag(db, 'p-a', 't-1') // 非主图挂接——摘除
    seedPaperTag(db, 'p-a', 't-2') // 非主图挂接——摘除
    migrate(db)
    // 存量归主图（[甲]——全局 UNIQUE(name) 保证存量名互异=归并零撞名）
    expect(db.prepare("SELECT folder_id FROM tags WHERE id='t-1'").get()).toEqual({ folder_id: '__main__' })
    expect(db.prepare("SELECT folder_id FROM tags WHERE id='t-2'").get()).toEqual({ folder_id: '__main__' })
    // color 保真（重建显式全列 4 列——011 颜色身份不丢）
    expect(db.prepare("SELECT name, color FROM tags WHERE id='t-2'").get()).toEqual({
      name: '核心',
      color: '#e11d48'
    })
    // 主图挂接保留；非主图挂接全摘（置于重建前旧表形态下执行——纯 DELETE）
    expect(db.prepare('SELECT COUNT(*) c FROM paper_tags').get()).toEqual({ c: 1 })
    expect(db.prepare("SELECT COUNT(*) c FROM paper_tags WHERE paper_id='p-main' AND tag_id='t-1'").get()).toEqual({ c: 1 })
    // 标签行本体不动（摘的是挂接非定义行）
    expect(db.prepare('SELECT COUNT(*) c FROM tags').get()).toEqual({ c: 2 })
    db.close()
  })

  it('v18→19 UNIQUE(folder_id,name)：同域同名拒+异域同名过（全局 UNIQUE(name) 退役证）', () => {
    const db = openV18()
    seedCollection(db, 'c-a', '图甲')
    seedTag(db, 't-1', '必读')
    migrate(db)
    // 同域同名（__main__ 已有「必读」）→ UNIQUE 拒
    expect(() =>
      db.prepare("INSERT INTO tags (id, name, folder_id) VALUES ('t-x', '必读', '__main__')").run()
    ).toThrow(/UNIQUE constraint failed/)
    // 异域同名（c-a 无「必读」）→ 放行（域间完全隔离——2026-10-08 晨用户裁决）
    expect(() =>
      db.prepare("INSERT INTO tags (id, name, folder_id) VALUES ('t-y', '必读', 'c-a')").run()
    ).not.toThrow()
    expect(db.prepare("SELECT COUNT(*) c FROM tags WHERE name='必读'").get()).toEqual({ c: 2 })
    db.close()
  })

  it('v18→19 列级契约：folder_id NOT NULL（显式 NULL 写拒）+DEFAULT 含 __main__（pragma table_info）', () => {
    const db = openV18()
    seedTag(db, 't-1', '必读')
    migrate(db)
    const col = (
      db.prepare('PRAGMA table_info(tags)').all() as Array<{
        name: string
        notnull: number
        dflt_value: string | null
      }>
    ).find((c) => c.name === 'folder_id')
    expect(col?.notnull).toBe(1)
    expect(col?.dflt_value).toContain('__main__')
    // 缺省插入落 __main__（DEFAULT 承载——直写夹具兼容面）
    db.prepare("INSERT INTO tags (id, name) VALUES ('t-d', '缺省域')").run()
    expect(db.prepare("SELECT folder_id FROM tags WHERE id='t-d'").get()).toEqual({ folder_id: '__main__' })
    // 显式 NULL 拒
    expect(() =>
      db.prepare("INSERT INTO tags (id, name, folder_id) VALUES ('t-n', '空域', NULL)").run()
    ).toThrow(/NOT NULL constraint failed/)
    db.close()
  })

  it('域守卫触发器四面：存在+域不一致挂接 ABORT（RAISE 文案承载）+域一致过+缺席父行走 FK（不触发 RAISE）', () => {
    const db = openV18()
    seedCollection(db, 'c-a', '图甲')
    seedPaper(db, 'p-main')
    seedPaper(db, 'p-a', 'c-a')
    seedTag(db, 't-main', '主图标签')
    migrate(db)
    // 面①存在（sqlite_master 在档+BEFORE INSERT）
    const trig = db
      .prepare("SELECT name, sql FROM sqlite_master WHERE type='trigger' AND name='paper_tags_domain_guard'")
      .get() as { name: string; sql: string }
    expect(trig?.name).toBe('paper_tags_domain_guard')
    expect(trig?.sql).toContain('BEFORE INSERT ON paper_tags')
    // 019 后异域标签可建（c-a 域）
    db.prepare("INSERT INTO tags (id, name, folder_id) VALUES ('t-a', '甲域标签', 'c-a')").run()
    // 面②域不一致 ABORT：p-a（c-a 域）挂 t-main（__main__ 域）→ 触发器拒
    expect(() => seedPaperTag(db, 'p-a', 't-main')).toThrow(/挂接域违约/)
    // 面③域一致过：p-a 挂 t-a（双方 c-a）→ 放行
    expect(() => seedPaperTag(db, 'p-a', 't-a')).not.toThrow()
    // 面④缺席父行走 FK：幽灵 paper（NULL<>x 三值逻辑不触发 RAISE——FK 兜底）
    expect(() => seedPaperTag(db, 'p-ghost', 't-a')).toThrow(/FOREIGN KEY constraint failed/)
    // 拒后零残留
    expect(db.prepare('SELECT COUNT(*) c FROM paper_tags').get()).toEqual({ c: 1 })
    db.close()
  })

  it('INSERT OR IGNORE 与触发器交互：幂等重挂（同域已挂）被 OR IGNORE 吞（幂等路径不受染）；域违约仍抛（RAISE(ABORT) 非约束冲突——简报③.2 探针面）', () => {
    const db = openV18()
    seedCollection(db, 'c-a', '图甲')
    seedPaper(db, 'p-a', 'c-a')
    seedTag(db, 't-1', '必读')
    migrate(db)
    db.prepare("INSERT INTO tags (id, name, folder_id) VALUES ('t-a', '甲标签', 'c-a')").run()
    db.prepare('INSERT OR IGNORE INTO paper_tags (paper_id, tag_id) VALUES (?, ?)').run('p-a', 't-a')
    // 同域重复挂接（复合主键冲突）→ OR IGNORE 吞=幂等
    expect(() =>
      db.prepare('INSERT OR IGNORE INTO paper_tags (paper_id, tag_id) VALUES (?, ?)').run('p-a', 't-a')
    ).not.toThrow()
    // 跨域（OR IGNORE 语句面上）→ RAISE(ABORT) 不被吞仍抛
    expect(() =>
      db.prepare('INSERT OR IGNORE INTO paper_tags (paper_id, tag_id) VALUES (?, ?)').run('p-a', 't-1')
    ).toThrow(/挂接域违约/)
    db.close()
  })

  it('CASCADE 域资产（012 族先例：夹删则域资产随灭）：删夹→该域 tags 行级联灭+他域不动', () => {
    const db = openV18()
    seedCollection(db, 'c-a', '图甲')
    seedCollection(db, 'c-b', '图乙')
    migrate(db)
    db.prepare("INSERT INTO tags (id, name, folder_id) VALUES ('t-a', '甲标签', 'c-a')").run()
    db.prepare("INSERT INTO tags (id, name, folder_id) VALUES ('t-b', '乙标签', 'c-b')").run()
    db.prepare("DELETE FROM collections WHERE id='c-a'").run()
    expect(db.prepare("SELECT COUNT(*) c FROM tags WHERE id='t-a'").get()).toEqual({ c: 0 })
    expect(db.prepare("SELECT COUNT(*) c FROM tags WHERE id='t-b'").get()).toEqual({ c: 1 })
    db.close()
  })

  it('v18→19 前后对象多重集：增量恰一件=trigger:paper_tags_domain_guard（autoindex 两枚〔id PK+UNIQUE 二列〕重建前后同名同数=净零——U1 S2 判据延链；多增/丢失均红）+tags_new 零残留', () => {
    const db = openV18()
    seedCollection(db, 'c-a', '图甲')
    seedTag(db, 't-1', '必读')
    const before = objectMultiset(db)
    // [F-DBCAMP-01 DB-2 U1] 020 起本用例钉 19：020 纯新增面（53 对象）不纳入
    // 增量判据——020 增量由 migrate-ai-domain 专属用例锁定
    const result = migrate(db, MIGRATIONS.filter((m) => m.version <= 19))
    // 判别器：19 确已应用（否则多重集断言=无迁移恒真）
    expect(result.appliedVersions).toEqual([19])
    expect(objectMultiset(db)).toEqual([...before, 'trigger:paper_tags_domain_guard'].sort())
    const residue = db
      .prepare("SELECT name FROM sqlite_master WHERE name LIKE 'tags_old%' OR name='tags_new'")
      .all()
    expect(residue).toEqual([])
    db.close()
  })

  it('新库全链：user_version=19+应用清单 [1..19]+幂等重入（再跑 applied=[]）', () => {
    const db = openDatabase(':memory:')
    const result = migrate(db)
    expect(result.currentVersion).toBe(22)
    expect(result.appliedVersions).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22
    ])
    expect(readUserVersion(db)).toBe(22)
    const again = migrate(db)
    expect(again.appliedVersions).toEqual([])
    db.close()
  })

  it('v15→19 跨链一次到位：016 重建后链上执行 019（applied=[16,17,18,19]）+行数据保全+触发器活性', () => {
    const db = openDatabase(':memory:')
    migrate(db, MIGRATIONS.filter((m) => m.version <= 15))
    // v15 期显式归档（folder_id 可空列——016 的 A6 清理只灭 NULL 行）
    db.prepare(
      `INSERT INTO papers (id, file_ref, sha256, title, added_at, updated_at, folder_id)
       VALUES ('p-a', 'f/a.pdf', 'sha-a', '文献甲', 't', 't', '__main__')`
    ).run()
    db.prepare("INSERT INTO tags (id, name, color) VALUES ('t-1', '必读', '#0ea5e9')").run()
    db.prepare("INSERT INTO paper_tags (paper_id, tag_id) VALUES ('p-a', 't-1')").run()
    const result = migrate(db)
    expect(result.appliedVersions).toEqual([16, 17, 18, 19, 20, 21, 22])
    expect(readUserVersion(db)).toBe(22)
    expect(db.prepare("SELECT name, color, folder_id FROM tags WHERE id='t-1'").get()).toEqual({
      name: '必读',
      color: '#0ea5e9',
      folder_id: '__main__'
    })
    expect(db.prepare('SELECT COUNT(*) c FROM paper_tags').get()).toEqual({ c: 1 })
    db.close()
  })

  it('fkOff 迁移违约守卫延链：019 后 foreign_key_check=0+FK 复位 ON（摘除步+重建零违约遗留）', () => {
    const db = openV18()
    seedCollection(db, 'c-a', '图甲')
    seedPaper(db, 'p-a', 'c-a')
    seedTag(db, 't-1', '必读')
    seedPaperTag(db, 'p-a', 't-1')
    migrate(db)
    expect(readUserVersion(db)).toBe(22)
    expect(db.pragma('foreign_key_check')).toEqual([])
    expect(db.pragma('foreign_keys', { simple: true })).toBe(1)
    db.close()
  })
})
