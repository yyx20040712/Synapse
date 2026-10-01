/**
 * [F-FOLDER-01] 迁移 012（folders×graphs：papers.folder_id/impact_factor+
 * lineage_nodes.folder_id DEFAULT 主图+坑 a 部分唯一索引+回填+paper_collections
 * 退役）锁定测试（真库夹具——migrate-lineage-v2.test.ts 同型）。
 *
 * 真相源=docs/design/2026-09-30_ffolder01-design-final.md §1（修正稿基准+回炉
 * 修订二：先退让后插入/lineage_nodes.folder_id=可空列+迁移回填+repo 写边界
 * 兜底[SQLite ADD COLUMN 静态禁 REFERENCES+非空 DEFAULT]/禁自带 BEGIN-COMMIT/
 * 存量同 paper_id 去重[回炉码 5]/部分唯一索引 WHERE paper_id IS NOT NULL/回填
 * 序含 tie-break c.id ASC/DROP 殿后）+§1.4 用例面。
 * always-active（不经 guardedDescribe）。
 */
import { describe, expect, it } from 'vitest'
import { openDatabase } from '../../../src/main/db/connection'
import { MIGRATIONS, migrate, readUserVersion } from '../../../src/main/db/migrate'

/** 直插一行 papers（v11 形状——不带 folder_id/impact_factor 列） */
function seedPaper(
  db: ReturnType<typeof openDatabase>,
  id: string,
  addedAt = '2026-01-01T00:00:00.000Z'
): void {
  db.prepare(
    `INSERT INTO papers (id, file_ref, sha256, title, added_at, updated_at)
     VALUES (?, 'f/${id}.pdf', 'sha-${id}', '文献${id}', ?, ?)`
  ).run(id, addedAt, addedAt)
}

/** 直插一行 lineage_nodes（v11 形状——不带 folder_id 列）；paperId null=主题节点 */
function seedNode(
  db: ReturnType<typeof openDatabase>,
  id: string,
  paperId: string | null,
  createdAt = '2026-01-02T00:00:00.000Z'
): void {
  db.prepare(
    `INSERT INTO lineage_nodes (id, paper_id, title, core_idea, year, x, y, created_at, updated_at)
     VALUES (?, ?, ?, '', 2024, NULL, NULL, ?, ?)`
  ).run(id, paperId, `节点${id}`, createdAt, createdAt)
}

/** 直插 collections 行（显式 id/position） */
function seedCollection(
  db: ReturnType<typeof openDatabase>,
  id: string,
  name: string,
  position: number
): void {
  db.prepare('INSERT INTO collections (id, name, position) VALUES (?, ?, ?)').run(id, name, position)
}

/** 直插 paper_collections 挂接（v11 时代 M2M） */
function seedAttach(db: ReturnType<typeof openDatabase>, paperId: string, collectionId: string): void {
  db.prepare('INSERT INTO paper_collections (paper_id, collection_id) VALUES (?, ?)').run(
    paperId,
    collectionId
  )
}

/** 建到 v11 的库（012 前形态） */
function openV11(): ReturnType<typeof openDatabase> {
  const db = openDatabase(':memory:')
  migrate(db, MIGRATIONS.filter((m) => m.version <= 11))
  return db
}

describe('db/migrate —— 012 folders×graphs（folder 归属+图绑定+M2M 退役）', () => {
  it('新库：全量应用到 12（[F-LINEAGE-02] 013 起=13 终值）；三列+部分唯一索引在场；paper_collections 不存在；sqlite_master 零 paper_collections 残留（N3）', () => {
    const db = openDatabase(':memory:')
    const result = migrate(db)
    expect(result.appliedVersions).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13])
    expect(result.currentVersion).toBe(13)
    const paperCols = (db.prepare('PRAGMA table_info(papers)').all() as Array<{ name: string }>).map(
      (c) => c.name
    )
    expect(paperCols).toContain('folder_id')
    expect(paperCols).toContain('impact_factor')
    const nodeCols = (db.prepare('PRAGMA table_info(lineage_nodes)').all() as Array<{
      name: string
    }>).map((c) => c.name)
    expect(nodeCols).toContain('folder_id')
    const indexes = (
      db.prepare("SELECT name FROM sqlite_master WHERE type='index'").all() as Array<{ name: string }>
    ).map((r) => r.name)
    expect(indexes).toContain('idx_lineage_paper')
    // 部分唯一索引结构锚（变异 M3）：WHERE paper_id IS NOT NULL 子句在场——
    // 行为面 NULL 互异两态等价（SQLite UNIQUE NULLs distinct），结构即契约
    const idxSql = db
      .prepare("SELECT sql FROM sqlite_master WHERE name='idx_lineage_paper'")
      .get() as { sql: string }
    expect(idxSql.sql).toContain('WHERE paper_id IS NOT NULL')
    const tables = (
      db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as Array<{ name: string }>
    ).map((r) => r.name)
    expect(tables).not.toContain('paper_collections')
    // N3：视图/触发器/索引对 paper_collections 的引用零残留（DROP 连带索引；
    // 本仓无视图/触发器引用面——断言兜底）
    const residues = db
      .prepare("SELECT name, type FROM sqlite_master WHERE sql LIKE '%paper_collections%'")
      .all()
    expect(residues).toEqual([])
    db.close()
  })

  it('存量形态 A（有脉络文献）：paper.folder_id=__main__ 且节点同；INV-88 成立（节点 folder=文献 folder）', () => {
    const db = openV11()
    seedPaper(db, 'p-a')
    seedNode(db, 'n-a', 'p-a')
    migrate(db)
    const paper = db.prepare('SELECT folder_id FROM papers WHERE id = ?').get('p-a') as {
      folder_id: string | null
    }
    const node = db.prepare('SELECT folder_id FROM lineage_nodes WHERE id = ?').get('n-a') as {
      folder_id: string
    }
    expect(paper.folder_id).toBe('__main__')
    expect(node.folder_id).toBe('__main__')
    // [主控追认补强②]回填后零 NULL 行断言：全部存量节点 folder_id 非空且='__main__'
    expect(
      db
        .prepare("SELECT COUNT(*) c FROM lineage_nodes WHERE folder_id IS NULL OR folder_id <> '__main__'")
        .get()
    ).toEqual({ c: 0 })
    db.close()
  })

  it('存量形态 B（仅 paper_collections 挂接）：folder_id=position 最小 collection（tie-break c.id ASC——W1）', () => {
    const db = openV11()
    seedPaper(db, 'p-b')
    seedCollection(db, 'c-z', '后位', 1)
    // 并列 position=0 插入序与 id 升序相逆（c-m 先插）——tie-break c.id ASC
    // 删则按插入序取 c-m（变异 M4 锚）
    seedCollection(db, 'c-m', '同位', 0)
    seedCollection(db, 'c-a', '前位', 0)
    seedAttach(db, 'p-b', 'c-z')
    seedAttach(db, 'p-b', 'c-m')
    seedAttach(db, 'p-b', 'c-a')
    migrate(db)
    const paper = db.prepare('SELECT folder_id FROM papers WHERE id = ?').get('p-b') as {
      folder_id: string | null
    }
    expect(paper.folder_id).toBe('c-a')
    // 结构锚（变异 M4）：tie-break 子句在 012 SQL 文本在场——行为面在当前
    // schema 下与无 tie-break 可证等价（pc 主键索引恒按 collection_id 升序供
    // 行——probe-tiebreak.cjs），契约文本=design-final §1 修正稿逐字基准锁
    const m12 = MIGRATIONS.find((m) => m.version === 12)
    expect(m12?.sql).toContain('ORDER BY c.position ASC, c.id ASC LIMIT 1')
    db.close()
  })

  it('存量形态 C（裸文献）：folder_id IS NULL=「未归档」（与「未加入脉络」正交）', () => {
    const db = openV11()
    seedPaper(db, 'p-c')
    migrate(db)
    const paper = db.prepare('SELECT folder_id FROM papers WHERE id = ?').get('p-c') as {
      folder_id: string | null
    }
    expect(paper.folder_id).toBeNull()
    db.close()
  })

  it('存量主题节点（paper_id NULL）：folder_id=__main__（Q2 终裁=全部节点归主图）', () => {
    const db = openV11()
    seedNode(db, 'n-theme', null)
    migrate(db)
    const node = db.prepare('SELECT folder_id FROM lineage_nodes WHERE id = ?').get('n-theme') as {
      folder_id: string
    }
    expect(node.folder_id).toBe('__main__')
    // [主控追认补强②]同上：主题节点面零 NULL 断言
    expect(db.prepare('SELECT COUNT(*) c FROM lineage_nodes WHERE folder_id IS NULL').get()).toEqual({
      c: 0
    })
    db.close()
  })

  it('坑 a 回归：同 paper_id 双节点 INSERT → UNIQUE 违例（部分索引 WHERE paper_id IS NOT NULL）；主题节点不受限', () => {
    const db = openDatabase(':memory:')
    migrate(db)
    seedPaper(db, 'p-x')
    seedNode(db, 'n-1', 'p-x')
    expect(() => seedNode(db, 'n-2', 'p-x')).toThrow()
    // 主题节点（paper_id NULL）不占唯一域——双主题节点合法
    expect(() => seedNode(db, 'n-t1', null)).not.toThrow()
    expect(() => seedNode(db, 'n-t2', null)).not.toThrow()
    db.close()
  })

  it('双跳 011→012：tags.color 与 folder_id 共存；回填结果与单跳一致', () => {
    const db = openV11()
    // v11 面：tags.color 在场
    db.prepare("INSERT INTO tags (id, name, color) VALUES ('t-1', '必读', '#112233')").run()
    seedPaper(db, 'p-d')
    seedNode(db, 'n-d', 'p-d')
    migrate(db)
    expect(readUserVersion(db)).toBe(13)
    const tag = db.prepare('SELECT color FROM tags WHERE id = ?').get('t-1') as { color: string | null }
    expect(tag.color).toBe('#112233')
    const paper = db.prepare('SELECT folder_id FROM papers WHERE id = ?').get('p-d') as {
      folder_id: string | null
    }
    const node = db.prepare('SELECT folder_id FROM lineage_nodes WHERE id = ?').get('n-d') as {
      folder_id: string
    }
    expect(paper.folder_id).toBe('__main__')
    expect(node.folder_id).toBe('__main__')
    // 双跳后再跑幂等（已应用跳过）
    const again = migrate(db)
    expect(again.appliedVersions).toEqual([])
    db.close()
  })

  it('回填冲突：预置 name=主图 的 collection → 退让改名不撞 UNIQUE；__main__ 行在场且 name=主图（B2 终裁断言）', () => {
    const db = openV11()
    seedCollection(db, 'c-legacy', '主图', 0)
    seedPaper(db, 'p-e')
    migrate(db)
    const retreated = db.prepare('SELECT name FROM collections WHERE id = ?').get('c-legacy') as {
      name: string
    }
    expect(retreated.name).toBe('主图 (主图)')
    const mainRow = db.prepare("SELECT name FROM collections WHERE id = '__main__'").get() as {
      name: string
    }
    expect(mainRow.name).toBe('主图')
    // B1 语义：012 后 collections.name UNIQUE 仍由 DDL 承担（001 既有）
    expect(() => seedCollection(db, 'c-dup', '主图', 5)).toThrow()
    db.close()
  })

  it('[F-MIGR-01 A·双冲突形态] 预置 主图+主图 (主图) 双行 → 迁移不炸；退让名=主图 (主图) 2；__main__ 名=主图；版本 13（[F-LINEAGE-02] 013 起）', () => {
    const db = openV11()
    seedCollection(db, 'c-legacy', '主图', 0)
    seedCollection(db, 'c-squatter', '主图 (主图)', 1)
    seedPaper(db, 'p-g')
    // 修复前：直拼退让产出第二个「主图 (主图)」撞 collections.name UNIQUE → 迁移炸
    expect(() => migrate(db)).not.toThrow()
    const retreated = db.prepare('SELECT name FROM collections WHERE id = ?').get('c-legacy') as {
      name: string
    }
    expect(retreated.name).toBe('主图 (主图) 2')
    // 占位行不动（只退让同名行，squatter 原名保留）
    const squatter = db.prepare('SELECT name FROM collections WHERE id = ?').get('c-squatter') as {
      name: string
    }
    expect(squatter.name).toBe('主图 (主图)')
    const mainRow = db.prepare("SELECT name FROM collections WHERE id = '__main__'").get() as {
      name: string
    }
    expect(mainRow.name).toBe('主图')
    expect(readUserVersion(db)).toBe(13)
    db.close()
  })

  it('[F-MIGR-01 B·三重冲突形态] 预置 主图+主图 (主图)+主图 (主图) 2 → 退让名=主图 (主图) 3（递进锚）', () => {
    const db = openV11()
    seedCollection(db, 'c-legacy', '主图', 0)
    seedCollection(db, 'c-squatter-1', '主图 (主图)', 1)
    seedCollection(db, 'c-squatter-2', '主图 (主图) 2', 2)
    seedPaper(db, 'p-h')
    expect(() => migrate(db)).not.toThrow()
    const retreated = db.prepare('SELECT name FROM collections WHERE id = ?').get('c-legacy') as {
      name: string
    }
    expect(retreated.name).toBe('主图 (主图) 3')
    // [R1·d1-N3/k1-N1] 两占位行不动（退让只动同名行——「不误动他行」性质在本形态显式锚）
    for (const [sid, sname] of [
      ['c-squatter-1', '主图 (主图)'],
      ['c-squatter-2', '主图 (主图) 2'],
    ] as const) {
      const row = db.prepare('SELECT name FROM collections WHERE id = ?').get(sid) as { name: string }
      expect(row.name).toBe(sname)
    }
    expect(readUserVersion(db)).toBe(13)
    db.close()
  })

  it('[F-MIGR-01 C·__main__ 残留占名] 预置 id=__main__ 且 name=主图 (主图) + legacy 主图 → 退让避开首选名得 主图 (主图) 2；__main__ 残留行 DO NOTHING 原样', () => {
    const db = openV11()
    seedCollection(db, 'c-legacy', '主图', 0)
    // 幂等锚形态变体：残留 __main__ 行恰好占用首选退让名（探测须覆盖全部在场行，含 id=__main__）
    seedCollection(db, '__main__', '主图 (主图)', 1)
    seedPaper(db, 'p-i')
    expect(() => migrate(db)).not.toThrow()
    const retreated = db.prepare('SELECT name FROM collections WHERE id = ?').get('c-legacy') as {
      name: string
    }
    expect(retreated.name).toBe('主图 (主图) 2')
    // __main__ 残留行原样保留（INSERT ON CONFLICT DO NOTHING 不覆盖名）
    const residue = db.prepare("SELECT name FROM collections WHERE id = '__main__'").get() as {
      name: string
    }
    expect(residue.name).toBe('主图 (主图)')
    expect(readUserVersion(db)).toBe(13)
    db.close()
  })

  it('[F-MIGR-01 D·999 全占 fail-closed 终态] 候选域 999 名全被蹲占 → 迁移炸（NOT NULL 违例）且事务整体回滚（user_version 停 11、退让行原名不动）', () => {
    const db = openV11()
    const seedAll = db.transaction(() => {
      seedCollection(db, 'c-legacy', '主图', 0)
      // 蹲占全部 999 个候选名（n=1 无后缀 + n≥2 带序号——与 012 cand 域字面同构）
      seedCollection(db, 'c-sq-1', '主图 (主图)', 1)
      for (let n = 2; n <= 999; n++) {
        db.prepare('INSERT INTO collections (id, name, position) VALUES (?, ?, ?)').run(
          `c-sq-${n}`,
          `主图 (主图) ${n}`,
          n
        )
      }
      seedPaper(db, 'p-j')
    })
    seedAll()
    // fail-closed：pick 空 → SET NULL → NOT NULL 违例（非静默错数据；与修复前 UNIQUE 回滚同构终态）
    expect(() => migrate(db)).toThrow(/NOT NULL constraint failed/)
    // 事务整体回滚=零部分状态：版本停在 11，退让行原名未变
    expect(readUserVersion(db)).toBe(11)
    const retreated = db.prepare('SELECT name FROM collections WHERE id = ?').get('c-legacy') as {
      name: string
    }
    expect(retreated.name).toBe('主图')
    db.close()
  })

  it('[回炉码 5] 存量同 paper_id 重复节点去重：保最新一行（rowid 最大=插入序最新），余删——部分唯一索引前置', () => {
    const db = openV11()
    seedPaper(db, 'p-dup')
    // 坑 a 存量形态：同 paper_id 双节点（先旧后新——title 可辨）
    seedNode(db, 'n-old', 'p-dup', '2026-01-01T00:00:00.000Z')
    seedNode(db, 'n-new', 'p-dup', '2026-01-02T00:00:00.000Z')
    // 主题节点不受去重影响（paper_id NULL 不占唯一域）
    seedNode(db, 'n-t1', null)
    seedNode(db, 'n-t2', null)
    migrate(db)
    const rows = db
      .prepare('SELECT id FROM lineage_nodes WHERE paper_id = ?')
      .all('p-dup') as Array<{ id: string }>
    expect(rows).toEqual([{ id: 'n-new' }]) // 唯一+保最新
    const dupTitle = db.prepare("SELECT title FROM lineage_nodes WHERE id='n-new'").get() as { title: string }
    expect(dupTitle.title).toBe('节点n-new')
    const themes = db
      .prepare('SELECT COUNT(*) c FROM lineage_nodes WHERE paper_id IS NULL')
      .get() as { c: number }
    expect(themes.c).toBe(2) // 双主题节点共存
    db.close()
  })

  it('[R2·d1-W3/k1-N4] 去重边级联：被删旧行挂有的边随 FK CASCADE 同删（保留行不继承旧连线——去重固有权衡锚）', () => {
    const db = openV11()
    seedPaper(db, 'p-dup')
    seedPaper(db, 'p-keep')
    seedNode(db, 'n-old', 'p-dup', '2026-01-01T00:00:00.000Z')
    seedNode(db, 'n-new', 'p-dup', '2026-01-02T00:00:00.000Z')
    seedNode(db, 'n-keep', 'p-keep', '2026-01-01T00:00:00.000Z')
    const insEdge = db.prepare(
      'INSERT INTO lineage_edges (id, from_node, to_node, label, kind, created_at, updated_at) VALUES (?,?,?,?,?,?,?)'
    )
    insEdge.run('e-old-keep', 'n-old', 'n-keep', '', 'manual', 't', 't') // 旧行独有连线
    insEdge.run('e-new-keep', 'n-new', 'n-keep', '', 'manual', 't', 't') // 保留行连线
    migrate(db)
    const edges = db
      .prepare('SELECT id FROM lineage_edges ORDER BY id')
      .all() as Array<{ id: string }>
    expect(edges).toEqual([{ id: 'e-new-keep' }]) // 旧行随删→其边级联灭；保留行边在场
    db.close()
  })

  it('幂等锚（变异 M2）：预置 id=__main__ 行（v11 库异常残留）→ ON CONFLICT(id) DO NOTHING 保既有行不炸迁移', () => {
    const db = openV11()
    seedCollection(db, '__main__', '既有主图行', 7)
    seedPaper(db, 'p-f')
    migrate(db)
    // DO NOTHING：既有行原样保留（不覆盖名）；迁移整体不炸（无守卫则 UNIQUE 违例炸迁移）
    const row = db.prepare("SELECT name FROM collections WHERE id = '__main__'").get() as {
      name: string
    }
    expect(row.name).toBe('既有主图行')
    expect(readUserVersion(db)).toBe(13)
    db.close()
  })
})
