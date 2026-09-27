import { describe, expect, it } from 'vitest'
import { openDatabase } from '../../../src/main/db/connection'
import { MIGRATIONS, migrate, readUserVersion } from '../../../src/main/db/migrate'

/**
 * P7E-05 R9/[F-TIME-02]：008 加列→009 删列双跳链锁定测试（新文件——
 * migrate.test.ts 受锁面同批随版本上探）。覆盖：新库全量到 9（009 后
 * reading_seconds 列不存在）+存量 v8 库升级路径（仅应用 009、user_version=9）+
 * 存量 v7 库双跳路径（008 加列→009 删列，终态列不存在）。always-active
 * （不经 guardedDescribe）。[F-TIME-02] 2026-09-19 用户裁决移除阅读时长。
 */
/** papers 表列名清单（PRAGMA table_info） */
function papersColumns(db: ReturnType<typeof openDatabase>): string[] {
  return (db.prepare('PRAGMA table_info(papers)').all() as Array<{ name: string }>).map((c) => c.name)
}

describe('db/migrate —— 008→009 reading_time 双跳链（P7E-05→F-TIME-02）', () => {
  it('新库：全量应用到 10（009 删列终态+010 后续），papers.reading_seconds 列已不存在', () => {
    const db = openDatabase(':memory:')
    const result = migrate(db)
    expect(result.currentVersion).toBe(10)
    expect(readUserVersion(db)).toBe(10)
    expect(papersColumns(db)).not.toContain('reading_seconds')
    db.prepare(
      `INSERT INTO papers (id, file_ref, sha256, added_at, updated_at)
       VALUES ('p1', 'a/b/c.pdf', 'sha-1', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')`
    ).run()
    expect(db.prepare('SELECT COUNT(*) AS n FROM papers').get()).toEqual({ n: 1 })
    db.close()
  })

  it('存量 v8 库（008 已加列）升级：仅应用 009 与 010，列被删除，user_version=10', () => {
    const db = openDatabase(':memory:')
    // 构造存量 v8 库：只应用 1..8（migrations 参数注入=测试合法面，migrate() 契约）
    migrate(db, MIGRATIONS.filter((m) => m.version <= 8))
    expect(papersColumns(db)).toContain('reading_seconds')
    const result = migrate(db)
    expect(result.appliedVersions).toEqual([9, 10])
    expect(readUserVersion(db)).toBe(10)
    expect(papersColumns(db)).not.toContain('reading_seconds')
    db.close()
  })

  it('存量 v7 库双跳：008 加列→009 删列一次 migrate 到位，终态列不存在', () => {
    const db = openDatabase(':memory:')
    migrate(db, MIGRATIONS.filter((m) => m.version <= 7))
    db.prepare(
      `INSERT INTO papers (id, file_ref, sha256, added_at, updated_at)
       VALUES ('legacy-1', 'x/y.pdf', 'sha-legacy', '2025-06-01T00:00:00Z', '2025-06-01T00:00:00Z')`
    ).run()
    const result = migrate(db)
    expect(result.appliedVersions).toEqual([8, 9, 10])
    expect(readUserVersion(db)).toBe(10)
    expect(papersColumns(db)).not.toContain('reading_seconds')
    // 存量行随双跳无损（其余列原样保留）
    const row = db.prepare('SELECT id, last_read_page FROM papers WHERE id = ?').get('legacy-1') as {
      id: string
      last_read_page: number
    }
    expect(row).toEqual({ id: 'legacy-1', last_read_page: 0 })
    db.close()
  })
})
