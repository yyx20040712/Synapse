/**
 * [F-VISFB-66 单元一] 迁移 025（lineage_edges 锚列 from_anchor/to_anchor）
 * smoke 两格：空库全量/存量 v24 库增列 NULL（设计书 v1.2 §D.3；N-03r2）。
 * migrate-edge-blue-recolor.test.ts 同型。always-active。
 */
import { describe, expect, it } from 'vitest'
import { openDatabase } from '../../../src/main/db/connection'
import { MIGRATIONS, migrate, readUserVersion } from '../../../src/main/db/migrate'

type Db = ReturnType<typeof openDatabase>

function seedNode(db: Db, id: string): void {
  db.prepare(
    `INSERT INTO lineage_nodes (id, paper_id, title, core_idea, year, x, y, created_at, updated_at)
     VALUES (?, NULL, ?, '', 2024, NULL, NULL, 't', 't')`
  ).run(id, `节点${id}`)
}

function seedEdgeV24(db: Db, id: string, from: string, to: string): void {
  db.prepare(
    `INSERT INTO lineage_edges (id, from_node, to_node, label, kind, dashed, color, created_at, updated_at)
     VALUES (?, ?, ?, '', 'manual', 0, '#1e3a8a', 't', 't')`
  ).run(id, from, to)
}

describe('db/migrate —— 025 边锚列（from_anchor/to_anchor TEXT 可空）', () => {
  it('空库：全量应用到 25，两列在场且可空', () => {
    const db = openDatabase(':memory:')
    const result = migrate(db)
    expect(result.appliedVersions).toContain(25)
    expect(result.currentVersion).toBe(25)
    expect(readUserVersion(db)).toBe(25)
    const cols = db.prepare(`PRAGMA table_info(lineage_edges)`).all() as Array<{
      name: string
      notnull: number
    }>
    const fa = cols.find((c) => c.name === 'from_anchor')
    const ta = cols.find((c) => c.name === 'to_anchor')
    expect(fa).toBeDefined()
    expect(ta).toBeDefined()
    expect(fa!.notnull).toBe(0)
    expect(ta!.notnull).toBe(0)
    db.close()
  })

  it('存量库（v24 形态含边行）：应用 025 后存量行两列=NULL、无 UPDATE 回填', () => {
    const db = openDatabase(':memory:')
    migrate(db, MIGRATIONS.filter((m) => m.version <= 24))
    seedNode(db, 'n1')
    seedNode(db, 'n2')
    seedEdgeV24(db, 'e1', 'n1', 'n2')
    const r25 = migrate(db)
    expect(r25.appliedVersions).toEqual([25])
    const row = db
      .prepare(`SELECT from_anchor, to_anchor FROM lineage_edges WHERE id = 'e1'`)
      .get() as { from_anchor: string | null; to_anchor: string | null }
    expect(row.from_anchor).toBeNull()
    expect(row.to_anchor).toBeNull()
    db.close()
  })
})
