/**
 * [F-VISFB-42] 迁移 023 派生图表资产合同（figure_jobs+paper_figures 两表）。
 *
 * 覆盖：新库全量直达 23（两表在位+papers 零新列——终裁 B3，列集与 TABLE_SPECS
 * 对账）；CHECK 约束（status 枚举/excess/failed_count 非负/page/几何正值）；
 * UNIQUE(paper_id,digest) 去重键（00B「digest 单键」）；FK 级联（papers 删除
 * →两表派生行同灭）；升级路径 022→023。
 * always-active（不经 guardedDescribe）。
 */
import { describe, expect, it } from 'vitest'
import { openDatabase, type SqliteDb } from '../../../src/main/db/connection'
import { MIGRATIONS, migrate, readUserVersion } from '../../../src/main/db/migrate'
import { TABLE_SPECS } from '../../../src/main/db/repos/snapshot.repo'

/** 造库到 022（注入式部分迁移——migrate-022-ghost-edges 先例） */
function dbAt22(): SqliteDb {
  const db = openDatabase(':memory:')
  migrate(db, MIGRATIONS.filter((m) => m.version <= 22))
  return db
}

function seedPaper(db: SqliteDb, id: string): void {
  db.prepare(
    `INSERT INTO papers (id, file_ref, sha256, title, abstract, authors_json, source, enrich_status,
     added_at, updated_at, folder_id) VALUES (?, ?, ?, ?, '摘要', '[]', 'manual', 'manual', 't0', 't0', '__main__')`
  ).run(id, `f/${id}.pdf`, `sha-${id}`, `题-${id}`)
}

function seedFigureRow(db: SqliteDb, paperId: string, figureId: string, digest: string): void {
  db.prepare(
    `INSERT INTO paper_figures (figure_id, paper_id, digest, file_ref, page, width, height,
     ctm_x, ctm_y, ctm_w, ctm_h, created_at, updated_at)
     VALUES (?, ?, ?, ?, 1, 300, 200, 10, 20, 60, 50, 't0', 't0')`
  ).run(figureId, paperId, digest, `figures/${paperId}/${digest}.png`)
}

describe('F-VISFB-42 迁移 023 派生图表资产合同', () => {
  it('新库全量直达 23：两表在位+papers 零新列', () => {
    const db = openDatabase(':memory:')
    const result = migrate(db)
    expect(result.currentVersion).toBe(23)
    expect(readUserVersion(db)).toBe(23)
    const tables = db
      .prepare(
        `SELECT name FROM sqlite_master WHERE type = 'table'
         AND name IN ('figure_jobs', 'paper_figures') ORDER BY name`
      )
      .all() as Array<{ name: string }>
    expect(tables.map((t) => t.name)).toEqual(['figure_jobs', 'paper_figures'])
    // papers 零新列（终裁 B3）：列集与快照导出面 TABLE_SPECS 单源对账
    const spec = TABLE_SPECS.find((s) => s.table === 'papers')
    const cols = (db.prepare('PRAGMA table_info(papers)').all() as Array<{ name: string }>).map(
      (c) => c.name
    )
    expect([...cols].sort()).toEqual([...(spec?.columns ?? [])].sort())
    db.close()
  })

  it('升级路径：022 存量库 migrate 后直达 23（零数据面扰动）', () => {
    const db = dbAt22()
    seedPaper(db, 'p-1')
    const result = migrate(db)
    expect(result.currentVersion).toBe(23)
    expect(
      (db.prepare('SELECT COUNT(*) c FROM papers').get() as { c: number }).c
    ).toBe(1)
    db.close()
  })

  it('figure_jobs CHECK 约束：status 枚举外拒+负计数拒+合法三态全过', () => {
    const db = openDatabase(':memory:')
    migrate(db)
    seedPaper(db, 'p-1')
    expect(() => {
      db.prepare(
        `INSERT INTO figure_jobs (paper_id, status, updated_at) VALUES ('p-1', 'weird', 't0')`
      ).run()
    }).toThrow()
    expect(() => {
      db.prepare(
        `INSERT INTO figure_jobs (paper_id, status, excess, updated_at) VALUES ('p-1', 'pending', -1, 't0')`
      ).run()
    }).toThrow()
    expect(() => {
      db.prepare(
        `INSERT INTO figure_jobs (paper_id, status, failed_count, updated_at) VALUES ('p-1', 'ready', -1, 't0')`
      ).run()
    }).toThrow()
    for (const status of ['pending', 'ready', 'failed']) {
      db.prepare(
        `INSERT INTO figure_jobs (paper_id, status, updated_at) VALUES ('p-1', ?, 't0')
         ON CONFLICT(paper_id) DO UPDATE SET status = excluded.status`
      ).run(status)
    }
    const row = db
      .prepare(`SELECT status FROM figure_jobs WHERE paper_id = 'p-1'`)
      .get() as { status: string }
    expect(row.status).toBe('failed')
    db.close()
  })

  it('paper_figures CHECK 约束：page/几何正值族全拒', () => {
    const db = openDatabase(':memory:')
    migrate(db)
    seedPaper(db, 'p-1')
    const base = { page: 1, width: 100, height: 100, ctm_x: 0, ctm_y: 0, ctm_w: 60, ctm_h: 60 }
    const badCases = [
      { ...base, page: 0 },
      { ...base, width: 0 },
      { ...base, height: -1 },
      { ...base, ctm_w: 0 },
      { ...base, ctm_h: -5 }
    ]
    for (const [i, bad] of badCases.entries()) {
      expect(() => {
        db.prepare(
          `INSERT INTO paper_figures (figure_id, paper_id, digest, file_ref, page, width, height,
           ctm_x, ctm_y, ctm_w, ctm_h, created_at, updated_at)
           VALUES (?, 'p-1', ?, ?, ?, ?, ?, ?, ?, ?, ?, 't0', 't0')`
        ).run(`fig-${i}`, `d${i}`, `figures/p-1/d${i}.png`, bad.page, bad.width, bad.height, bad.ctm_x, bad.ctm_y, bad.ctm_w, bad.ctm_h)
      }).toThrow()
    }
    db.close()
  })

  it('UNIQUE(paper_id,digest)：同篇同 digest 二行拒（00B digest 单键去重）', () => {
    const db = openDatabase(':memory:')
    migrate(db)
    seedPaper(db, 'p-1')
    seedFigureRow(db, 'p-1', 'fig-a', 'd-1')
    expect(() => seedFigureRow(db, 'p-1', 'fig-b', 'd-1')).toThrow()
    const count = db.prepare('SELECT COUNT(*) c FROM paper_figures').get() as { c: number }
    expect(count.c).toBe(1)
    db.close()
  })

  it('FK 级联：papers 删除→figure_jobs/paper_figures 派生行同灭', () => {
    const db = openDatabase(':memory:')
    migrate(db)
    seedPaper(db, 'p-1')
    seedPaper(db, 'p-2')
    seedFigureRow(db, 'p-1', 'fig-1', 'd-1')
    seedFigureRow(db, 'p-2', 'fig-2', 'd-2')
    db.prepare(`INSERT INTO figure_jobs (paper_id, status, updated_at) VALUES ('p-1', 'ready', 't0')`).run()
    db.prepare(`INSERT INTO figure_jobs (paper_id, status, updated_at) VALUES ('p-2', 'ready', 't0')`).run()
    db.prepare(`DELETE FROM papers WHERE id = 'p-1'`).run()
    const jobs = db.prepare('SELECT paper_id FROM figure_jobs ORDER BY paper_id').all() as Array<{
      paper_id: string
    }>
    const figures = db.prepare('SELECT paper_id FROM paper_figures').all() as Array<{
      paper_id: string
    }>
    expect(jobs.map((j) => j.paper_id)).toEqual(['p-2'])
    expect(figures.map((f) => f.paper_id)).toEqual(['p-2'])
    db.close()
  })

  it('快照导出面零增：TABLE_SPECS 不含两派生表（派生不入快照）', () => {
    const tables = TABLE_SPECS.map((s) => s.table)
    expect(tables).not.toContain('figure_jobs')
    expect(tables).not.toContain('paper_figures')
  })
})
