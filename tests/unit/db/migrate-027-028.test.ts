/**
 * [B4 L1 / 设计稿 §5.4/§7.5] 迁移 027（lineTypeNames folder 键化）与 028（删事件
 * 写点单调守卫触发器重建）真库测试。
 *
 * - 027：旧共享键 'lineTypeNames' 值复制到每个现存 folder（含主图 __main__）的
 *   keyed 行 `lineTypeNames:<folderId>`，再删旧键；旧键缺席=零复制（读面缺省
 *   6×「待命名」）；既有 keyed 行不被覆盖。
 * - 028：7 个含 updated_at 表的 deletion_log 触发器重建为
 *   `deleted_at = max(now, OLD.updated_at+1ms)`；NO_UPDATED_AT 三表触发器不改；
 *   FK CASCADE 子行删除同样被守卫覆盖（cascade 断言=§7.5 测试序列 7）。
 * always-active（裸 describe）。
 */
import { describe, expect, it } from 'vitest'
import { MIGRATIONS, migrate, readUserVersion } from '../../../src/main/db/migrate'
import { createLineageRepo } from '../../../src/main/db/repos/lineage.repo'
import { openDatabase } from '../../../src/main/db/connection'
import { addMs, ms, seedFolder, seedPaper, tombstonesOf, type Db } from '../../utils/lineage-history-db'

const OLD_NAMES = '["主线","副线","对比","支撑","衍生","否证"]'
const FUTURE = '2999-06-01T12:00:00.000Z'

/** 全新空库（未跑任何迁移） */
function freshDb(): Db {
  return openDatabase(':memory:')
}

/** 现役链终态库（26→28 全量） */
function migratedDb(): Db {
  const db = openDatabase(':memory:')
  migrate(db)
  expect(readUserVersion(db)).toBe(28)
  return db
}

/** v26 终态库（仅基线）——模拟升级前用户库 */
function v26Db(): Db {
  const db = freshDb()
  migrate(db, MIGRATIONS.slice(0, 1))
  expect(readUserVersion(db)).toBe(26)
  return db
}

function metaOf(db: Db): Array<{ key: string; value: string; updated_at: string }> {
  return db.prepare('SELECT key, value, updated_at FROM lineage_graph_meta ORDER BY key').all() as Array<{
    key: string
    value: string
    updated_at: string
  }>
}

function triggerSql(db: Db, name: string): string {
  return (db.prepare('SELECT sql FROM sqlite_master WHERE type = ? AND name = ?').get('trigger', name) as { sql: string }).sql
}

const GUARDED = [
  'annotations',
  'floating_notes',
  'lineage_edges',
  'lineage_graph_meta',
  'lineage_nodes',
  'notes',
  'papers'
] as const

describe('迁移 027_lineage_meta_folder：lineTypeNames 共享键→folder 键（D2 用户终裁 A）', () => {
  it('链版本：新库 appliedVersions=[26,27,28]、user_version=28；迁移清单三件', () => {
    const db = freshDb()
    const r = migrate(db)
    expect(r.appliedVersions).toEqual([26, 27, 28])
    expect(r.currentVersion).toBe(28)
    expect(MIGRATIONS.map((m) => m.version)).toEqual([26, 27, 28])
    db.close()
  })

  it('旧共享键值复制到每个现存 folder（含主图）的 keyed 行，再删旧键；读面按 folder 取值', () => {
    const db = v26Db()
    seedFolder(db, 'f-a', '夹甲')
    seedFolder(db, 'f-b', '夹乙')
    db.prepare(`INSERT INTO lineage_graph_meta (key, value, updated_at) VALUES ('lineTypeNames', ?, '2026-01-01T00:00:00.000Z')`).run(OLD_NAMES)
    const r = migrate(db)
    expect(r.appliedVersions).toEqual([27, 28])
    const meta = metaOf(db)
    expect(meta.map((m) => m.key).sort()).toEqual(['lineTypeNames:__main__', 'lineTypeNames:f-a', 'lineTypeNames:f-b', 'lineTypes'])
    for (const m of meta.filter((x) => x.key !== 'lineTypes')) {
      expect(m.value).toBe(OLD_NAMES)
      expect(m.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
    }
    const repo = createLineageRepo(db)
    expect(repo.getLineTypeNames('f-a')).toEqual(JSON.parse(OLD_NAMES))
    expect(repo.getLineTypeNames('__main__')).toEqual(JSON.parse(OLD_NAMES))
    db.close()
  })

  it('旧键缺席（从未改名的库）：零复制——读面缺省 6×「待命名」', () => {
    const db = v26Db()
    seedFolder(db, 'f-a', '夹甲')
    migrate(db)
    expect(metaOf(db).map((m) => m.key)).toEqual(['lineTypes'])
    expect(createLineageRepo(db).getLineTypeNames('f-a')).toEqual(Array.from({ length: 6 }, () => '待命名'))
    db.close()
  })

  it('既有 keyed 行在场：旧键值不覆盖（NOT EXISTS 守卫）；旧键仍删除', () => {
    const db = v26Db()
    db.prepare(`INSERT INTO lineage_graph_meta (key, value, updated_at) VALUES ('lineTypeNames', ?, '2026-01-01T00:00:00.000Z')`).run(OLD_NAMES)
    db.prepare(`INSERT INTO lineage_graph_meta (key, value, updated_at) VALUES ('lineTypeNames:__main__', '["自有","","","","",""]', '2026-01-01T00:00:00.000Z')`).run()
    migrate(db)
    const main = metaOf(db).find((m) => m.key === 'lineTypeNames:__main__')
    expect(main!.value).toBe('["自有","","","","",""]')
    expect(metaOf(db).some((m) => m.key === 'lineTypeNames')).toBe(false)
    db.close()
  })

  it('重开零应用（幂等）； keyed 行不重复', () => {
    const db = v26Db()
    db.prepare(`INSERT INTO lineage_graph_meta (key, value, updated_at) VALUES ('lineTypeNames', ?, '2026-01-01T00:00:00.000Z')`).run(OLD_NAMES)
    migrate(db)
    const again = migrate(db)
    expect(again.appliedVersions).toEqual([])
    expect(metaOf(db).filter((m) => m.key === 'lineTypeNames:__main__')).toHaveLength(1)
    db.close()
  })
})

describe('迁移 028_deletion_log_write_guard：删事件写点单调守卫（§7.5）', () => {
  it('7 个含 updated_at 表触发器=max(now, OLD.updated_at+1ms) 形态；NO_UPDATED_AT 三表触发器保持原形态', () => {
    const db = migratedDb()
    for (const table of GUARDED) {
      const sql = triggerSql(db, `${table}_deletion_log_ad`)
      expect(sql).toContain('max(')
      expect(sql).toContain("strftime('%Y-%m-%dT%H:%M:%fZ', OLD.updated_at, '+0.001 seconds')")
      expect(sql).toContain("strftime('%Y-%m-%dT%H:%M:%fZ', 'now')")
      expect(sql).toContain('INSERT OR IGNORE INTO deletion_events')
    }
    for (const table of ['collections', 'tags', 'paper_tags'] as const) {
      const sql = triggerSql(db, `${table}_deletion_log_ad`)
      expect(sql).not.toContain('max(')
      expect(sql).not.toContain('OLD.updated_at')
      expect(sql).toContain("strftime('%Y-%m-%dT%H:%M:%fZ', 'now')")
    }
    // 触发器总数不变（重建非新增）；append-only 两触发器不动
    const triggers = (db.prepare("SELECT name FROM sqlite_master WHERE type='trigger'").all() as Array<{ name: string }>).map((r) => r.name)
    expect(triggers).toHaveLength(59)
    expect(triggers).toContain('deletion_events_no_delete')
    expect(triggers).toContain('deletion_events_no_update')
    db.close()
  })

  it('直删：行 updated_at 在未来毫秒区→tombstone deleted_at=旧行+1ms（时钟回拨域不与既有 tombstone 撞平）', () => {
    const db = migratedDb()
    seedPaper(db, 'p-a')
    db.prepare(`INSERT INTO lineage_nodes (id, paper_id, title, created_at, updated_at) VALUES ('n-1', 'p-a', '甲', '2026-01-01T00:00:00.000Z', ?)`).run(FUTURE)
    db.prepare(`INSERT INTO lineage_graph_meta (key, value, updated_at) VALUES ('lineTypeNames:__main__', '[]', ?)`).run(FUTURE)
    db.prepare(`INSERT INTO floating_notes (id, folder_id, x, y, content, created_at, updated_at) VALUES ('fn-1', '__main__', 1, 2, 'c', '2026-01-01T00:00:00.000Z', ?)`).run(FUTURE)
    db.prepare(`DELETE FROM lineage_nodes WHERE id = 'n-1'`).run()
    db.prepare(`DELETE FROM lineage_graph_meta WHERE key = 'lineTypeNames:__main__'`).run()
    db.prepare(`DELETE FROM floating_notes WHERE id = 'fn-1'`).run()
    expect(tombstonesOf(db, 'lineage_nodes', 'n-1')).toEqual([addMs(FUTURE, 1)])
    expect(tombstonesOf(db, 'lineage_graph_meta', 'lineTypeNames:__main__')).toEqual([addMs(FUTURE, 1)])
    expect(tombstonesOf(db, 'floating_notes', 'fn-1')).toEqual([addMs(FUTURE, 1)])
    db.close()
  })

  it('NULL 安全：非 ISO 的 updated_at（库外手改/对端快照原样写入）行删除仍落 tombstone（=now，不静默丢——INSERT OR IGNORE 不吞 NOT NULL 违约行）', () => {
    const db = migratedDb()
    seedPaper(db, 'p-a')
    db.prepare(`INSERT INTO lineage_nodes (id, paper_id, title, created_at, updated_at) VALUES ('n-bad', 'p-a', '甲', 't', 'not-a-timestamp')`).run()
    const before = Date.now()
    db.prepare(`DELETE FROM lineage_nodes WHERE id = 'n-bad'`).run()
    const tombs = tombstonesOf(db, 'lineage_nodes', 'n-bad')
    expect(tombs).toHaveLength(1)
    expect(ms(tombs[0]!)).toBeGreaterThanOrEqual(before - 5_000)
    db.close()
  })

  it('cascade 断言（§7.5 序列 7）：真实删夹（先删夹内 papers 再删夹）后，五张子表的 tombstone deleted_at 均严格大于其删除前 updated_at', () => {
    const db = migratedDb()
    seedFolder(db, 'f-a', '夹甲')
    seedPaper(db, 'p-a', 'f-a')
    seedPaper(db, 'p-b', 'f-a')
    const past = '2026-01-01T00:00:00.000Z'
    // 子行预置在未来毫秒区（确定性触发守卫 ELSE 分支——同毫秒域进入技术）
    db.prepare(`INSERT INTO lineage_nodes (id, paper_id, title, created_at, updated_at, folder_id) VALUES ('n-a', 'p-a', '甲', ?, ?, 'f-a'), ('n-b', 'p-b', '乙', ?, ?, 'f-a')`).run(past, FUTURE, past, FUTURE)
    db.prepare(`INSERT INTO lineage_edges (id, from_node, to_node, label, created_at, updated_at) VALUES ('e-1', 'n-a', 'n-b', '', ?, ?)`).run(past, FUTURE)
    db.prepare(`INSERT INTO floating_notes (id, folder_id, x, y, content, created_at, updated_at) VALUES ('fn-1', 'f-a', 1, 2, 'c', ?, ?)`).run(past, FUTURE)
    db.prepare(`INSERT INTO annotations (id, paper_id, page, kind, sort_key, created_at, updated_at) VALUES ('an-1', 'p-a', 0, 'highlight', '0:0', ?, ?)`).run(past, FUTURE)
    db.prepare(`INSERT INTO notes (id, paper_id, created_at, updated_at) VALUES ('no-1', 'p-a', ?, ?)`).run(past, FUTURE)
    const expectGuarded = (entity: string, id: string): void => {
      const tombs = tombstonesOf(db, entity, id)
      expect(tombs).toHaveLength(1)
      expect(ms(tombs[0]!)).toBeGreaterThan(ms(FUTURE))
    }
    db.prepare(`UPDATE papers SET updated_at = ? WHERE folder_id = 'f-a'`).run(FUTURE)
    db.prepare(`DELETE FROM papers WHERE folder_id = 'f-a'`).run() // papers→annotations/notes/lineage_nodes→lineage_edges 级联
    db.prepare(`DELETE FROM collections WHERE id = 'f-a'`).run() // collections→floating_notes 级联
    expectGuarded('papers', 'p-a')
    expectGuarded('papers', 'p-b')
    expectGuarded('annotations', 'an-1')
    expectGuarded('notes', 'no-1')
    expectGuarded('lineage_nodes', 'n-a')
    expectGuarded('lineage_nodes', 'n-b')
    expectGuarded('lineage_edges', 'e-1')
    expectGuarded('floating_notes', 'fn-1')
    db.close()
  })
})
