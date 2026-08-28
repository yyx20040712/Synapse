/**
 * [排序雷清扫回归锁] lineage 列表序确定性 —— 同 created_at 平局按插入序（rowid）决胜。
 * 背景（同型雷清单=docs/reports/2026-08-27_visual-check-findings.md 发现 3）：
 * listNodes/listEdges 曾 `ORDER BY created_at, id`——id=随机 uuid 作平局决胜
 * 键 → 顺序=uuid 彩票（同毫秒打戳平局在写入面为常态）。
 * 合约：`ORDER BY created_at, rowid`——rowid=SQLite 插入序（表非 WITHOUT
 * ROWID、TEXT 主键非 rowid 别名、零 VACUUM——先例单元三门已核），同库同序
 * 确定化；「确定性兜底非业务序」语义维持（业务布局序归布局层不变）。
 *
 * 夹具法：db.prepare 直插（绕过 repo 的 id/时间戳生成——平局夹具单源），
 * created_at 刻意同值、id 刻意与插入序字典序相反（先插 'z-*' 后插 'a-*'）
 * ——对 id 决胜的旧实现必红（BINARY 字典序），对 rowid 决胜必绿。
 *
 * 激活方式（ADR-0017）：always-active 裸 describe，不经 guardedDescribe——
 * 缺陷回归锁恒开（恒绿和随机绿一样危险）。
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { createLineageRepo } from '../../../../src/main/db/repos/lineage.repo'
import type { SqliteDb } from '../../../../src/main/db/connection'
import { createTestDb } from '../../../utils/fixtures'

describe('lineage.repo 列表序确定性（排序雷清扫：同 created_at 平局=rowid 插入序决胜）', () => {
  let db: SqliteDb
  let repo: ReturnType<typeof createLineageRepo>

  /** 直插一行 lineage_nodes（paper_id 可空=纯主题节点——无需 papers 夹具） */
  const seedNode = (id: string, createdAt: string): void => {
    db.prepare(
      `INSERT INTO lineage_nodes (id, paper_id, title, core_idea, year, x, y, created_at, updated_at)
       VALUES (?, NULL, ?, '', NULL, NULL, NULL, ?, ?)`
    ).run(id, `节点-${id}`, createdAt, createdAt)
  }

  /** 直插一行 lineage_edges（端点互异避 UNIQUE(from_node,to_node) 冲突） */
  const seedEdge = (id: string, from: string, to: string, createdAt: string): void => {
    db.prepare(
      `INSERT INTO lineage_edges (id, from_node, to_node, label, created_at, updated_at)
       VALUES (?, ?, ?, '', ?, ?)`
    ).run(id, from, to, createdAt, createdAt)
  }

  beforeEach(() => {
    db = createTestDb()
    repo = createLineageRepo(db)
    const t = '2026-08-27T00:00:00.000Z'
    // 插入序：z-first → a-second → n-1 → n-2；全部同 created_at，id 字典序与
    // 插入序刻意相反（探针对 z-first/a-second）
    seedNode('z-first', t)
    seedNode('a-second', t)
    seedNode('n-1', t)
    seedNode('n-2', t)
    // 边探针对：z-edge 先插、a-edge 后插（同 created_at、id 反字典序）
    seedEdge('z-edge', 'n-1', 'n-2', t)
    seedEdge('a-edge', 'n-2', 'n-1', t)
  })

  it('listGraph().nodes：同 created_at 平局按插入序决胜（非 id 字典序）', () => {
    const { nodes } = repo.listGraph()
    expect(nodes.map((n) => n.id)).toEqual(['z-first', 'a-second', 'n-1', 'n-2'])
  })

  it('listGraph().edges：同 created_at 平局按插入序决胜（非 id 字典序）', () => {
    const { edges } = repo.listGraph()
    expect(edges.map((e) => e.id)).toEqual(['z-edge', 'a-edge'])
  })
})
