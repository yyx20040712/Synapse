import { describe, expect, it } from 'vitest'
import { openDatabase } from '../../../src/main/db/connection'
import { MIGRATIONS, migrate, readUserVersion } from '../../../src/main/db/migrate'

/**
 * P7E-05 R9：008 reading_time 迁移锁定测试（新文件——migrate.test.ts 受锁零改）。
 * 覆盖：新库全量到 8（列在位+DEFAULT 0）+存量 v7 库升级路径（仅应用 008、
 * 存量行补 0、user_version=8）。always-active（不经 guardedDescribe）。
 */
describe('db/migrate —— 008 reading_time（P7E-05 R9）', () => {
  it('新库：全量应用到 8，papers.reading_seconds 列在位且 DEFAULT 0', () => {
    const db = openDatabase(':memory:')
    const result = migrate(db)
    expect(result.currentVersion).toBe(8)
    expect(readUserVersion(db)).toBe(8)
    db.prepare(
      `INSERT INTO papers (id, file_ref, sha256, added_at, updated_at)
       VALUES ('p1', 'a/b/c.pdf', 'sha-1', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')`
    ).run()
    const row = db.prepare('SELECT reading_seconds FROM papers WHERE id = ?').get('p1') as {
      reading_seconds: number
    }
    expect(row.reading_seconds).toBe(0)
    db.close()
  })

  it('存量 v7 库升级：仅应用 008，存量行 reading_seconds 补 0，user_version=8', () => {
    const db = openDatabase(':memory:')
    // 构造存量库：只应用 1..7（migrations 参数注入=测试合法面，migrate() 契约）
    migrate(db, MIGRATIONS.filter((m) => m.version <= 7))
    db.prepare(
      `INSERT INTO papers (id, file_ref, sha256, added_at, updated_at)
       VALUES ('legacy-1', 'x/y.pdf', 'sha-legacy', '2025-06-01T00:00:00Z', '2025-06-01T00:00:00Z')`
    ).run()
    const result = migrate(db)
    expect(result.appliedVersions).toEqual([8])
    expect(readUserVersion(db)).toBe(8)
    const row = db.prepare('SELECT reading_seconds FROM papers WHERE id = ?').get('legacy-1') as {
      reading_seconds: number
    }
    expect(row.reading_seconds).toBe(0)
    db.close()
  })
})
