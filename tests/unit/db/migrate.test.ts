import { describe, expect, it } from 'vitest'
import { openDatabase } from '../../../src/main/db/connection'
import { MIGRATIONS, migrate, readUserVersion } from '../../../src/main/db/migrate'
import { createTestDb } from '../../utils/fixtures'

describe('db/migrate —— 迁移执行器', () => {
  it('新库：全量应用，user_version = 最新版本', () => {
    const db = openDatabase(':memory:')
    const result = migrate(db)
    expect(result.appliedVersions).toEqual([1, 2, 3, 4])
    expect(result.currentVersion).toBe(Math.max(...MIGRATIONS.map((m) => m.version)))
    expect(readUserVersion(db)).toBe(result.currentVersion)
    db.close()
  })

  it('迁移失败整体回滚：user_version 不变、半成品表不残留（注入坏迁移验证）', () => {
    const db = openDatabase(':memory:')
    const bad = [
      {
        version: 9,
        name: 'bad',
        sql: 'CREATE TABLE rollback_probe_a (x); CREATE TABLE rollback_probe_b (y;'
      }
    ]
    expect(() => migrate(db, bad)).toThrow()
    expect(readUserVersion(db)).toBe(0)
    const leftover = db
      .prepare("SELECT name FROM sqlite_master WHERE name LIKE 'rollback_probe_%'")
      .all() as Array<{ name: string }>
    expect(leftover).toEqual([])
    db.close()
  })

  it('002 索引在位：按集合过滤与 added_at 排序不再全表扫', () => {
    const db = createTestDb()
    const indexes = (
      db.prepare("SELECT name FROM sqlite_master WHERE type='index'").all() as Array<{ name: string }>
    ).map((r) => r.name)
    expect(indexes).toContain('idx_paper_collections_collection')
    expect(indexes).toContain('idx_papers_added_at')
    db.close()
  })

  it('重复执行幂等（已应用版本跳过）', () => {
    const db = openDatabase(':memory:')
    migrate(db)
    const again = migrate(db)
    expect(again.appliedVersions).toEqual([])
    db.close()
  })

  it('迁移产物包含全部核心表与 FTS 表（schema golden）', () => {
    const db = createTestDb()
    const tables = (
      db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all() as Array<{ name: string }>
    ).map((r) => r.name)
    for (const expected of [
      'annotations',
      'annotations_fts',
      'collections',
      'notes',
      'notes_fts',
      'paper_collections',
      'paper_tags',
      'papers',
      'papers_fts',
      'tags'
    ]) {
      expect(tables, `缺表：${expected}`).toContain(expected)
    }
    db.close()
  })

  it('FTS 触发器在位：插入 papers 后 papers_fts 可搜（trigram 支持中文子串）', () => {
    const db = createTestDb()
    db.prepare(
      `INSERT INTO papers (id, file_ref, sha256, title, abstract, added_at, updated_at)
       VALUES ('p1', 'a/b/c.pdf', 'sha-1', '智慧水务综述', '智慧城市下的水务管理', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')`
    ).run()
    // trigram 需 ≥3 字符的查询串
    const hit = db.prepare(`SELECT rowid FROM papers_fts WHERE papers_fts MATCH '"水务管理"'`).get()
    expect(hit).toBeTruthy()
    // 更新同步
    db.prepare(`UPDATE papers SET title = '水文模型' WHERE id = 'p1'`).run()
    const oldHit = db.prepare(`SELECT rowid FROM papers_fts WHERE papers_fts MATCH '"智慧水务综述"'`).get()
    expect(oldHit).toBeUndefined()
    const newHit = db.prepare(`SELECT rowid FROM papers_fts WHERE papers_fts MATCH '"水文模型"'`).get()
    expect(newHit).toBeTruthy()
    db.close()
  })

  it('外键级联：删 paper 连带删 annotation', () => {
    const db = createTestDb()
    db.prepare(
      `INSERT INTO papers (id, file_ref, sha256, added_at, updated_at) VALUES ('p1','a.pdf','s1','t','t')`
    ).run()
    db.prepare(
      `INSERT INTO annotations (id, paper_id, page, kind, sort_key, created_at, updated_at)
       VALUES ('a1','p1',0,'highlight','0000:01','t','t')`
    ).run()
    db.prepare(`DELETE FROM papers WHERE id='p1'`).run()
    expect(db.prepare(`SELECT COUNT(*) c FROM annotations`).get()).toEqual({ c: 0 })
    db.close()
  })
})
