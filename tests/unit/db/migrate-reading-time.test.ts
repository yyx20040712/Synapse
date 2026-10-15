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
  it('新库：全量应用到 10（[F-UIRES-03 C1] 015 起=15 终值、[F-DBCAMP-01 U1/U2/U3] 016/017/018 起=18，009 删列终态断言面不变），papers.reading_seconds 列已不存在', () => {
    const db = openDatabase(':memory:')
    const result = migrate(db)
    expect(result.currentVersion).toBe(22)
    expect(readUserVersion(db)).toBe(22)
    expect(papersColumns(db)).not.toContain('reading_seconds')
    db.prepare(
      `INSERT INTO papers (id, file_ref, sha256, added_at, updated_at)
       VALUES ('p1', 'a/b/c.pdf', 'sha-1', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')`
    ).run()
    expect(db.prepare('SELECT COUNT(*) AS n FROM papers').get()).toEqual({ n: 1 })
    db.close()
  })

  it('存量 v8 库（008 已加列）升级：应用 009+010+011+012+013+014+015（[F-FOLDER-01]/[F-LINEAGE-02]/[F-LGRAPH-01②U8]/[F-UIRES-03 C1] 起），列被删除，user_version=15（[F-DBCAMP-01 U1/U2/U3] 016/017/018 起=18 随链）', () => {
    const db = openDatabase(':memory:')
    // 构造存量 v8 库：只应用 1..8（migrations 参数注入=测试合法面，migrate() 契约）
    migrate(db, MIGRATIONS.filter((m) => m.version <= 8))
    expect(papersColumns(db)).toContain('reading_seconds')
    const result = migrate(db)
    expect(result.appliedVersions).toEqual([9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22])
    expect(readUserVersion(db)).toBe(22)
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
    expect(result.appliedVersions).toEqual([8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22])
    expect(readUserVersion(db)).toBe(22)
    expect(papersColumns(db)).not.toContain('reading_seconds')
    // 存量行随双跳无损（其余列原样保留）——[F-DBCAMP-01 U1] 016 起：裸文献
    // （无节点无挂接→012 回填后 folder_id 仍 NULL）随 A6 用户裁决被 016 清理
    // =行不读回（v122 裁决②「未归档域取消」断言 succession）
    const row = db.prepare('SELECT id, last_read_page FROM papers WHERE id = ?').get('legacy-1') as
      | { id: string; last_read_page: number }
      | undefined
    expect(row).toBeUndefined()
    expect(db.prepare('SELECT COUNT(*) c FROM papers').get()).toEqual({ c: 0 })
    db.close()
  })
})
