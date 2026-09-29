/**
 * [T3-P5] 迁移 010（lineage v2：month/slot/sub 列+lineage_graph_meta KV+slot
 * 窗口回填）锁定测试（真库夹具——migrate-reading-time.test.ts 同型）。
 *
 * 覆盖：新库全量到 10/存量 v9 库升级（仅应用 010、user_version=10）/
 * 存量行 month NULL 合法/存量行 UPDATE month 越界拒（CHECK 对后续写生效）/
 * 新 INSERT month=13 拒、1..12 过/slot 窗口回填序正确（同 year+month 组内
 * created_at,id 序 1..k；跨组分段）/meta 表 seed 'lineTypes'='[]'。
 * 真相源=docs/design/2026-09-27_t3p5-lineage-data-layer-design-final.md §2。
 * always-active（不经 guardedDescribe）。
 */
import { describe, expect, it } from 'vitest'
import { openDatabase } from '../../../src/main/db/connection'
import { MIGRATIONS, migrate, readUserVersion } from '../../../src/main/db/migrate'

/** 直插一行 lineage_nodes（v9 形状——不带 month/slot 列） */
function seedV9Node(
  db: ReturnType<typeof openDatabase>,
  id: string,
  year: number | null,
  createdAt: string
): void {
  db.prepare(
    `INSERT INTO lineage_nodes (id, paper_id, title, core_idea, year, x, y, created_at, updated_at)
     VALUES (?, NULL, ?, '', ?, NULL, NULL, ?, ?)`
  ).run(id, `节点${id}`, year, createdAt, createdAt)
}

describe('db/migrate —— 010 lineage v2（month/slot/sub+meta KV+slot 回填）', () => {
  it('新库：全量应用到 10（011 起=11 终值，010 断言面不变），lineage_nodes 含 month/slot 列、lineage_edges 含 sub 列', () => {
    const db = openDatabase(':memory:')
    const result = migrate(db)
    expect(result.currentVersion).toBe(11)
    const nodeCols = (db.prepare('PRAGMA table_info(lineage_nodes)').all() as Array<{ name: string }>).map(
      (c) => c.name
    )
    expect(nodeCols).toContain('month')
    expect(nodeCols).toContain('slot')
    const edgeCols = (db.prepare('PRAGMA table_info(lineage_edges)').all() as Array<{ name: string }>).map(
      (c) => c.name
    )
    expect(edgeCols).toContain('sub')
    db.close()
  })

  it('存量 v9 库升级：应用 010+011（F-TAGS-01 起），user_version=11；存量行 month NULL 合法（不回溯校验）', () => {
    const db = openDatabase(':memory:')
    migrate(db, MIGRATIONS.filter((m) => m.version <= 9))
    seedV9Node(db, 'legacy-1', 2019, '2026-01-01T00:00:00.000Z')
    const result = migrate(db)
    expect(result.appliedVersions).toEqual([10, 11])
    expect(readUserVersion(db)).toBe(11)
    const row = db.prepare('SELECT month, slot FROM lineage_nodes WHERE id = ?').get('legacy-1') as {
      month: number | null
      slot: number | null
    }
    expect(row.month).toBeNull()
    expect(row.slot).toBe(1) // 单行组回填=1（ROW_NUMBER 1 基）
    db.close()
  })

  it('CHECK 对后续写生效：存量行 UPDATE month=13 拒、month=12 过；新 INSERT month=0 拒', () => {
    const db = openDatabase(':memory:')
    migrate(db, MIGRATIONS.filter((m) => m.version <= 9))
    seedV9Node(db, 'legacy-1', 2019, '2026-01-01T00:00:00.000Z')
    migrate(db)
    expect(() => db.prepare('UPDATE lineage_nodes SET month = 13 WHERE id = ?').run('legacy-1')).toThrow()
    expect(() => db.prepare('UPDATE lineage_nodes SET month = 12 WHERE id = ?').run('legacy-1')).not.toThrow()
    expect(() =>
      db.prepare(
        `INSERT INTO lineage_nodes (id, paper_id, title, core_idea, year, x, y, month, created_at, updated_at)
         VALUES ('new-1', NULL, '新行', '', 2024, NULL, NULL, 0, 't', 't')`
      ).run()
    ).toThrow()
    expect(() =>
      db.prepare(
        `INSERT INTO lineage_nodes (id, paper_id, title, core_idea, year, x, y, month, created_at, updated_at)
         VALUES ('new-2', NULL, '新行', '', 2024, NULL, NULL, 6, 't', 't')`
      ).run()
    ).not.toThrow()
    db.close()
  })

  it('slot 窗口回填序：同 (year,month) 组内 created_at,id 序 1..k；跨年组分段；null year 独立组', () => {
    const db = openDatabase(':memory:')
    migrate(db, MIGRATIONS.filter((m) => m.version <= 9))
    const t = '2026-01-01T00:00:00.000Z'
    // 组一（year=2020，存量 month 恒 NULL）：created_at 同值 → id 升序决胜
    seedV9Node(db, 'z-20', 2020, t)
    seedV9Node(db, 'a-20', 2020, t)
    // 组二（year=2021）：created_at 先后分明
    seedV9Node(db, 'late-21', 2021, '2026-01-03T00:00:00.000Z')
    seedV9Node(db, 'early-21', 2021, '2026-01-02T00:00:00.000Z')
    // 组三（year=null）：双行同组 → created_at,id 序 1..2（门二 P2-6b 补样本）
    seedV9Node(db, 'ny-2', null, t)
    seedV9Node(db, 'ny-1', null, t)
    migrate(db)
    const slotOf = (id: string): number => {
      const r = db.prepare('SELECT slot FROM lineage_nodes WHERE id = ?').get(id) as { slot: number }
      return r.slot
    }
    expect([slotOf('a-20'), slotOf('z-20')]).toEqual([1, 2])
    expect([slotOf('early-21'), slotOf('late-21')]).toEqual([1, 2])
    expect([slotOf('ny-1'), slotOf('ny-2')]).toEqual([1, 2])
    db.close()
  })

  it('lineage_graph_meta 表在场+seed lineTypes 空数组串；updated_at 列可应用层写 ISO', () => {
    const db = openDatabase(':memory:')
    migrate(db)
    const row = db
      .prepare('SELECT value, updated_at FROM lineage_graph_meta WHERE key = ?')
      .get('lineTypes') as { value: string; updated_at: string }
    expect(row.value).toBe('[]')
    db.prepare('UPDATE lineage_graph_meta SET value = ?, updated_at = ? WHERE key = ?').run(
      '[{"base":"tree","subs":[]}]',
      '2026-09-27T00:00:00.000Z',
      'lineTypes'
    )
    const after = db.prepare('SELECT updated_at FROM lineage_graph_meta WHERE key = ?').get('lineTypes') as {
      updated_at: string
    }
    expect(after.updated_at).toBe('2026-09-27T00:00:00.000Z')
    db.close()
  })
})
