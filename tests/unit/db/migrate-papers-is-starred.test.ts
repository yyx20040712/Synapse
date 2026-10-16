/**
 * [F-DBCAMP-01 DB-1 U2 / F-STAR-01] 迁移 017（papers.is_starred+partial index）
 * 锁定测试（真库夹具——migrate-papers-folder-not-null.test.ts 同型）。
 *
 * 真相源=docs/design/2026-10-08_f-dbcamp01-design.md §5.c（017 行）+§12
 * +2026-10-08 U2 简报主控裁决③（列名 is_starred 单源——票面「starred」为
 * loose 表述；DDL 含 CHECK；partial index=is_starred 单列 WHERE is_starred=1
 * 无 folder 维度）。017 与 016 重建本质不同：ADD COLUMN 静态 DEFAULT 合法、
 * FK 面零牵动——无 fkOff（勿复制重建机械）。
 * always-active（不经 guardedDescribe）。
 */
import { describe, expect, it } from 'vitest'
import { openDatabase } from '../../../src/main/db/connection'
import { MIGRATIONS, migrate, readUserVersion } from '../../../src/main/db/migrate'

type Db = ReturnType<typeof openDatabase>

/** v17 形态直插 papers（folder_id 走 016 DEFAULT '__main__'——缺省合法） */
function seedPaper(db: Db, id: string): void {
  db.prepare(
    `INSERT INTO papers (id, file_ref, sha256, title, added_at, updated_at)
     VALUES (?, ?, ?, ?, 't', 't')`
  ).run(id, `f/${id}.pdf`, `sha-${id}`, `文献${id}`)
}

/** 建到 v16 的库（017 前形态——016 后 papers.folder_id NOT NULL DEFAULT） */
function openV16(): Db {
  const db = openDatabase(':memory:')
  migrate(db, MIGRATIONS.filter((m) => m.version <= 16))
  return db
}

describe('db/migrate —— 017 papers.is_starred+partial index（ADD COLUMN——零 FK 牵动）', () => {
  it('v16→17 加列：存量行静态 DEFAULT 0 一次到位（零回填）+缺省插入也 0+列级非空/默认标记在档', () => {
    const db = openV16()
    seedPaper(db, 'p-old-1')
    seedPaper(db, 'p-old-2')
    migrate(db)
    // 判别器：17 确已应用（否则列不存在→下方查询 SQL 报错红）
    // [F-DBCAMP-01 U3] 018 随链；[F-DBCAMP-01 DB-2 U1] 020 随链；[F-DBCAMP-01 DB-3 U1] 021 随链：链尾延 21（v16 库经全链 migrate 至 21）
    expect(readUserVersion(db)).toBe(23)
    expect(db.prepare('SELECT COUNT(*) c FROM papers WHERE is_starred = 0').get()).toEqual({ c: 2 })
    expect(db.prepare("SELECT is_starred FROM papers WHERE id = 'p-old-1'").get()).toEqual({
      is_starred: 0
    })
    // 新行缺省插入同样落 0
    seedPaper(db, 'p-new')
    expect(db.prepare("SELECT is_starred FROM papers WHERE id = 'p-new'").get()).toEqual({
      is_starred: 0
    })
    // 列级标记在档（notnull=1+DEFAULT '0'——016 NOT NULL 契约用例同型）
    const col = (
      db.prepare('PRAGMA table_info(papers)').all() as Array<{
        name: string
        notnull: number
        dflt_value: string | null
      }>
    ).find((c) => c.name === 'is_starred')
    expect(col?.notnull).toBe(1)
    expect(col?.dflt_value).toBe('0')
    db.close()
  })

  it('CHECK 值域契约：0/1 双向写过；2（INSERT）与 99（UPDATE）双面拒+拒后行值不动', () => {
    const db = openDatabase(':memory:')
    migrate(db)
    seedPaper(db, 'p-1')
    db.prepare("UPDATE papers SET is_starred = 1 WHERE id = 'p-1'").run()
    expect(db.prepare("SELECT is_starred FROM papers WHERE id = 'p-1'").get()).toEqual({ is_starred: 1 })
    db.prepare("UPDATE papers SET is_starred = 0 WHERE id = 'p-1'").run()
    expect(db.prepare("SELECT is_starred FROM papers WHERE id = 'p-1'").get()).toEqual({ is_starred: 0 })
    expect(() =>
      db.prepare(
        `INSERT INTO papers (id, file_ref, sha256, title, added_at, updated_at, is_starred)
         VALUES ('p-bad', 'f/b.pdf', 'sha-b', 't', 't', 't', 2)`
      ).run()
    ).toThrow(/CHECK constraint failed/)
    expect(() => db.prepare("UPDATE papers SET is_starred = 99 WHERE id = 'p-1'").run()).toThrow(
      /CHECK constraint failed/
    )
    // 拒后行值不动（0——fail-closed 非降级）
    expect(db.prepare("SELECT is_starred FROM papers WHERE id = 'p-1'").get()).toEqual({ is_starred: 0 })
    db.close()
  })

  it('partial index 存在性与选择性：idx_papers_starred 在档（sql 含 WHERE is_starred = 1 且无 folder 维度）；=1 查询走该索引、=0 不走（部分索引只覆盖星标集）', () => {
    const db = openV16()
    migrate(db)
    const idx = db
      .prepare("SELECT name, sql FROM sqlite_master WHERE type='index' AND name='idx_papers_starred'")
      .get() as { name: string; sql: string } | undefined
    expect(idx?.name).toBe('idx_papers_starred')
    // 判别器：partial 谓词原文在档+无 folder 维度（主控裁决③.2——星标无筛选面）
    expect(idx?.sql).toContain('WHERE is_starred = 1')
    expect(idx?.sql).not.toContain('folder_id')
    const planStarred = db.prepare('EXPLAIN QUERY PLAN SELECT id FROM papers WHERE is_starred = 1')
      .all() as Array<{ detail: string }>
    expect(planStarred.map((r) => r.detail).join(' | ')).toContain('idx_papers_starred')
    // =0 面：部分索引不含未标行——引擎不选它
    const planUnstarred = db.prepare('EXPLAIN QUERY PLAN SELECT id FROM papers WHERE is_starred = 0')
      .all() as Array<{ detail: string }>
    expect(planUnstarred.map((r) => r.detail).join(' | ')).not.toContain('idx_papers_starred')
    db.close()
  })

  it('v15→17 跨链一次到位：016 重建后表形态上执行 017（applied=[16,17]）+行数据保全+is_starred=0（[F-DBCAMP-01 U3] 018 随链=applied 增 18）', () => {
    const db = openDatabase(':memory:')
    migrate(db, MIGRATIONS.filter((m) => m.version <= 15))
    // v15 期显式归档（folder_id 可空列——016 的 A6 清理只灭 NULL 行）
    db.prepare(
      `INSERT INTO papers (id, file_ref, sha256, title, added_at, updated_at, folder_id)
       VALUES ('p-a', 'f/a.pdf', 'sha-a', '文献甲', 't', 't', '__main__')`
    ).run()
    const result = migrate(db)
    expect(result.appliedVersions).toEqual([16, 17, 18, 19, 20, 21, 22, 23])
    expect(readUserVersion(db)).toBe(23)
    expect(db.prepare("SELECT title, is_starred FROM papers WHERE id = 'p-a'").get()).toEqual({
      title: '文献甲',
      is_starred: 0
    })
    db.close()
  })

  it('新库全链：user_version=17+应用清单 [1..17]+幂等重入（再跑 applied=[]）（[F-DBCAMP-01 U3] 018 随链=18/[1..18]）', () => {
    const db = openDatabase(':memory:')
    const result = migrate(db)
    expect(result.currentVersion).toBe(23)
    expect(result.appliedVersions).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23
    ])
    expect(readUserVersion(db)).toBe(23)
    const again = migrate(db)
    expect(again.appliedVersions).toEqual([])
    db.close()
  })
})
