/**
 * [F-DBCAMP-01 DB-4 / F1] 迁移 022 幽灵边清理（存量治理——DB-0 设计书 §12
 * A6 用户授权存量测试数据可清理先例）。
 *
 * 覆盖：cross-graph 边（双端点所在 nodes.folder_id 不等）迁移后清除；同图边
 * 保全；**deletion_events 0 行**（guard 直执不落账——快照导出携带假删除会致
 * 对端误删=本批最大红线；U3 探针先例同型）；guard 三态开库断言迁移后仍成立
 * （COUNT=1∧stop=0——迁移事务内置 1→清理→复位 0，崩溃自回滚）；user_version=链尾现值 23（[F-VISFB-42] 023 随链）。
 * always-active（不经 guardedDescribe）。
 */
import { describe, expect, it } from 'vitest'
import { openDatabase } from '../../../src/main/db/connection'
import { MIGRATIONS, migrate, readUserVersion } from '../../../src/main/db/migrate'

/** 造库到 021（注入式部分迁移——migrate-tags-folder-domain 先例） */
function dbAt21(): ReturnType<typeof openDatabase> {
  const db = openDatabase(':memory:')
  migrate(db, MIGRATIONS.filter((m) => m.version <= 21))
  return db
}

interface SeedNode {
  id: string
  folder: string
}
interface SeedEdge {
  id: string
  from: string
  to: string
}

function seed(db: ReturnType<typeof openDatabase>, nodes: SeedNode[], edges: SeedEdge[]): void {
  db.prepare('INSERT INTO collections (id, name, position) VALUES (?, ?, 0)').run('f-a', '图甲')
  db.prepare('INSERT INTO collections (id, name, position) VALUES (?, ?, 1)').run('f-b', '图乙')
  for (const n of nodes) {
    db.prepare(
      `INSERT INTO lineage_nodes (id, paper_id, title, folder_id, year, month, slot, created_at, updated_at)
       VALUES (?, NULL, ?, ?, 2025, 1, 1, 't', 't')`
    ).run(n.id, `节点${n.id}`, n.folder)
  }
  for (const e of edges) {
    db.prepare(
      `INSERT INTO lineage_edges (id, from_node, to_node, label, dashed, color, created_at, updated_at)
       VALUES (?, ?, ?, '', 0, '#1e3a8a', 't', 't')`
    ).run(e.id, e.from, e.to)
  }
}

describe('F-DBCAMP-01 DB-4 F1 迁移 022 幽灵边清理', () => {
  it('cross-graph 边清除+同图边保全+deletion_events 零行+版本 23（[F-VISFB-42] 023 随链）', () => {
    const db = dbAt21()
    seed(
      db,
      [
        { id: 'n-a1', folder: 'f-a' },
        { id: 'n-a2', folder: 'f-a' },
        { id: 'n-b1', folder: 'f-b' }
      ],
      [
        { id: 'e-same', from: 'n-a1', to: 'n-a2' }, // 同图：保全
        { id: 'e-cross1', from: 'n-a1', to: 'n-b1' }, // 跨图：清
        { id: 'e-cross2', from: 'n-b1', to: 'n-a2' } // 跨图（反向）：清
      ]
    )
    const result = migrate(db)
    expect(result.currentVersion).toBe(25)
    expect(readUserVersion(db)).toBe(25)
    const edges = db.prepare('SELECT id FROM lineage_edges').all() as Array<{ id: string }>
    expect(edges.map((e) => e.id)).toEqual(['e-same'])
    // 红线：guard 直执不落账（021 AFTER DELETE 触发器被 stop=1 抑制）
    expect(db.prepare('SELECT COUNT(*) c FROM deletion_events').get()).toEqual({ c: 0 })
    // guard 三态断言数据面：迁移后复位（COUNT=1∧stop=0）
    expect(
      db.prepare('SELECT COUNT(*) n, COALESCE(MAX(stop), 0) s FROM deletion_log_guard').get()
    ).toEqual({ n: 1, s: 0 })
    db.close()
  })

  it('节点零损：清理只动边不动节点（悬挂端点不存在——FK CASCADE 保证）', () => {
    const db = dbAt21()
    seed(
      db,
      [
        { id: 'n-a1', folder: 'f-a' },
        { id: 'n-b1', folder: 'f-b' }
      ],
      [{ id: 'e-x', from: 'n-a1', to: 'n-b1' }]
    )
    migrate(db)
    const nodes = db.prepare('SELECT COUNT(*) c FROM lineage_nodes').get()
    expect(nodes).toEqual({ c: 2 })
    db.close()
  })

  it('新库全量直达 022（空种子——022 空跑幂等面）+deletion_events 零行', () => {
    const db = openDatabase(':memory:')
    const result = migrate(db)
    expect(result.currentVersion).toBe(25)
    expect(db.prepare('SELECT COUNT(*) c FROM deletion_events').get()).toEqual({ c: 0 })
    db.close()
  })
})
