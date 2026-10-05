/**
 * [F-UIRES-03 C1] 迁移 015（lineage_edges 存量旧蓝→深蓝 #1e3a8a——设计稿
 * v1.9 §2 C1+§3 呈裁①用户亲裁值）锁定测试（真库夹具——migrate-folders-
 * graphs.test.ts 同型）。LOWER 命中边界（大写变体）+非目标色不动+幂等+
 * count 对账（⑤i 存量假设实测：单测夹具含大写 '#3A5BD9' 变体行+非目标色行）。
 * always-active（不经 guardedDescribe）。
 */
import { describe, expect, it } from 'vitest'
import { openDatabase } from '../../../src/main/db/connection'
import { MIGRATIONS, migrate, readUserVersion } from '../../../src/main/db/migrate'

/** 建到 v14 的库（015 前形态——dashed/color 列在场） */
function openV14(): ReturnType<typeof openDatabase> {
  const db = openDatabase(':memory:')
  migrate(db, MIGRATIONS.filter((m) => m.version <= 14))
  return db
}

/** 直插节点（v14 形状——month/slot/folder_id 可空回填态） */
function seedNode(
  db: ReturnType<typeof openDatabase>,
  id: string
): void {
  db.prepare(
    `INSERT INTO lineage_nodes (id, paper_id, title, core_idea, year, x, y, created_at, updated_at)
     VALUES (?, NULL, ?, '', 2024, NULL, NULL, 't', 't')`
  ).run(id, `节点${id}`)
}

/** 直插边（v14 形状——显式 color；dashed 缺省 0） */
function seedEdge(
  db: ReturnType<typeof openDatabase>,
  id: string,
  from: string,
  to: string,
  color: string
): void {
  db.prepare(
    `INSERT INTO lineage_edges (id, from_node, to_node, label, kind, created_at, updated_at, dashed, color)
     VALUES (?, ?, ?, '', 'manual', 't', 't', 0, ?)`
  ).run(id, from, to, color)
}

/** 色分布对账（color→行数——迁移前后 count 对账输出） */
function colorCounts(db: ReturnType<typeof openDatabase>): Record<string, number> {
  const rows = db.prepare('SELECT color, COUNT(*) c FROM lineage_edges GROUP BY color ORDER BY color').all() as Array<{
    color: string
    c: number
  }>
  return Object.fromEntries(rows.map((r) => [r.color, r.c]))
}

describe('db/migrate —— 015 存量边旧蓝换深蓝（#3a5bd9→#1e3a8a）', () => {
  it('新库：全量应用到 15（015 起=15 终值）', () => {
    const db = openDatabase(':memory:')
    const result = migrate(db)
    expect(result.appliedVersions).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])
    expect(result.currentVersion).toBe(15)
    expect(readUserVersion(db)).toBe(15)
    db.close()
  })

  it('SQL 文本锚：LOWER 双侧命中子句在场（大小写变体契约——设计口径锁）', () => {
    const m15 = MIGRATIONS.find((m) => m.version === 15)
    expect(m15?.name).toBe('lineage_edge_blue_recolor')
    expect(m15?.sql).toContain("UPDATE lineage_edges SET color='#1e3a8a' WHERE LOWER(color)=LOWER('#3a5bd9')")
  })

  it('存量混合：旧蓝规范形×2+大写变体 #3A5BD9×1 命中换新；非目标色/已新蓝不动（count 对账）', () => {
    const db = openV14()
    for (const id of ['n-a', 'n-b', 'n-c']) seedNode(db, id)
    seedEdge(db, 'e-old-1', 'n-a', 'n-b', '#3a5bd9')
    seedEdge(db, 'e-old-2', 'n-b', 'n-c', '#3a5bd9')
    seedEdge(db, 'e-upper', 'n-a', 'n-c', '#3A5BD9')
    seedEdge(db, 'e-other', 'n-b', 'n-a', '#c07a2a')
    seedEdge(db, 'e-new', 'n-c', 'n-a', '#1e3a8a')
    const before = colorCounts(db)
    expect(before).toEqual({ '#3a5bd9': 2, '#3A5BD9': 1, '#c07a2a': 1, '#1e3a8a': 1 })
    migrate(db)
    const after = colorCounts(db)
    expect(after).toEqual({ '#1e3a8a': 4, '#c07a2a': 1 })
    expect(readUserVersion(db)).toBe(15)
    db.close()
  })

  it('空表/全非目标：迁移零行改动（UPDATE 无命中不炸）', () => {
    const db = openV14()
    for (const id of ['n-a', 'n-b']) seedNode(db, id)
    seedEdge(db, 'e-keep', 'n-a', 'n-b', '#0f8a6d')
    migrate(db)
    expect(colorCounts(db)).toEqual({ '#0f8a6d': 1 })
    expect(readUserVersion(db)).toBe(15)
    db.close()
  })

  it('幂等：015 后再跑 migrate=appliedVersions 空+色分布不变', () => {
    const db = openV14()
    for (const id of ['n-a', 'n-b']) seedNode(db, id)
    seedEdge(db, 'e-old', 'n-a', 'n-b', '#3a5bd9')
    migrate(db)
    const again = migrate(db)
    expect(again.appliedVersions).toEqual([])
    expect(colorCounts(db)).toEqual({ '#1e3a8a': 1 })
    db.close()
  })
})
