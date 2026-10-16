/**
 * [F-VISFB-42] figure.repo —— 派生图表资产仓储（figure_jobs+paper_figures）。
 *
 * 覆盖：jobs 状态面（setJob upsert 覆写/getJob 缺席 null/resetJobsForPapers
 * 恢复重提——在场重置 pending+figure 行清空+缺席零副作用）；资产行面
 * （insertFigure+findByDigest 去重键/listByPaper/countByPaper/fileRefByFigure
 * 错 paperId 拒/removeByPaper）。真库（createTestDb 全量迁移——snapshot.repo.test
 * 形态先例）。always-active（不经 guardedDescribe）。
 */
import { beforeEach, describe, expect, it } from 'vitest'
import type { SqliteDb } from '../../../../src/main/db/connection'
import { createFigureRepo, type FigureInsert } from '../../../../src/main/db/repos/figure.repo'
import { createTestDb } from '../../../utils/fixtures'

function seedPaper(db: SqliteDb, id: string): void {
  db.prepare(
    `INSERT INTO papers (id, file_ref, sha256, title, abstract, authors_json, source, enrich_status,
     added_at, updated_at, folder_id) VALUES (?, ?, ?, ?, '摘要', '[]', 'manual', 'manual', 't0', 't0', '__main__')`
  ).run(id, `f/${id}.pdf`, `sha-${id}`, `题-${id}`)
}

function fig(paperId: string, suffix: string): FigureInsert {
  return {
    figureId: `fig-${suffix}`,
    paperId,
    digest: `digest-${suffix}`,
    fileRef: `figures/${paperId}/digest-${suffix}.png`,
    page: 2,
    width: 320,
    height: 210,
    ctmX: 10,
    ctmY: 20,
    ctmW: 61,
    ctmH: 52
  }
}

describe('F-VISFB-42 figure.repo jobs 状态面', () => {
  let db: SqliteDb
  let repo: ReturnType<typeof createFigureRepo>

  beforeEach(() => {
    db = createTestDb()
    repo = createFigureRepo(db)
  })

  it('setJob 新建 pending 零计数；getJob 缺席 null', () => {
    seedPaper(db, 'p-1')
    expect(repo.getJob('p-1')).toBeNull()
    repo.setJob('p-1', { status: 'pending', excess: 0, failedCount: 0 })
    const job = repo.getJob('p-1')
    expect(job).not.toBeNull()
    expect(job?.status).toBe('pending')
    expect(job?.excess).toBe(0)
    expect(job?.failedCount).toBe(0)
  })

  it('setJob upsert 覆写：ready+excess+failedCount 落账（failed≠empty 计数面）', () => {
    seedPaper(db, 'p-1')
    repo.setJob('p-1', { status: 'pending', excess: 0, failedCount: 0 })
    repo.setJob('p-1', { status: 'ready', excess: 3, failedCount: 2 })
    const job = repo.getJob('p-1')
    expect(job?.status).toBe('ready')
    expect(job?.excess).toBe(3)
    expect(job?.failedCount).toBe(2)
  })

  it('resetJobsForPapers：在场 paper 重置 pending+figure 行清空；无 job 行新建 pending', () => {
    seedPaper(db, 'p-1')
    seedPaper(db, 'p-2')
    repo.setJob('p-1', { status: 'ready', excess: 1, failedCount: 0 })
    repo.insertFigure(fig('p-1', 'a'))
    repo.insertFigure(fig('p-1', 'b'))
    repo.resetJobsForPapers(['p-1', 'p-2'])
    const job1 = repo.getJob('p-1')
    expect(job1?.status).toBe('pending')
    expect(job1?.excess).toBe(0)
    expect(job1?.failedCount).toBe(0)
    expect(repo.listByPaper('p-1')).toEqual([])
    const job2 = repo.getJob('p-2')
    expect(job2?.status).toBe('pending')
  })

  it('resetJobsForPapers：缺席 paper（防复活跳过面）零副作用不抛', () => {
    seedPaper(db, 'p-1')
    expect(() => repo.resetJobsForPapers(['ghost-id'])).not.toThrow()
    expect(repo.getJob('ghost-id')).toBeNull()
    const before = db.prepare('SELECT COUNT(*) c FROM figure_jobs').get() as { c: number }
    repo.resetJobsForPapers(['ghost-id'])
    const after = db.prepare('SELECT COUNT(*) c FROM figure_jobs').get() as { c: number }
    expect(after.c).toBe(before.c)
  })

  it('removeByPaper：清行并返回计数', () => {
    seedPaper(db, 'p-1')
    repo.insertFigure(fig('p-1', 'a'))
    repo.insertFigure(fig('p-1', 'b'))
    expect(repo.removeByPaper('p-1')).toBe(2)
    expect(repo.removeByPaper('p-1')).toBe(0)
  })
})

describe('F-VISFB-42 figure.repo 资产行面', () => {
  let db: SqliteDb
  let repo: ReturnType<typeof createFigureRepo>

  beforeEach(() => {
    db = createTestDb()
    repo = createFigureRepo(db)
  })

  it('insertFigure+findByDigest：命中回行/缺席 null（digest 单键去重读法）', () => {
    seedPaper(db, 'p-1')
    repo.insertFigure(fig('p-1', 'a'))
    const hit = repo.findByDigest('p-1', 'digest-a')
    expect(hit?.figureId).toBe('fig-a')
    expect(hit?.fileRef).toBe('figures/p-1/digest-a.png')
    expect(hit?.page).toBe(2)
    expect(hit?.width).toBe(320)
    expect(hit?.height).toBe(210)
    expect(hit?.ctmX).toBe(10)
    expect(hit?.ctmY).toBe(20)
    expect(hit?.ctmW).toBe(61)
    expect(hit?.ctmH).toBe(52)
    expect(repo.findByDigest('p-1', 'digest-x')).toBeNull()
    expect(repo.findByDigest('p-other', 'digest-a')).toBeNull()
  })

  it('countByPaper/listByPaper：计数与全行清单', () => {
    seedPaper(db, 'p-1')
    repo.insertFigure(fig('p-1', 'a'))
    repo.insertFigure(fig('p-1', 'b'))
    expect(repo.countByPaper('p-1')).toBe(2)
    expect(repo.listByPaper('p-1').map((r) => r.figureId).sort()).toEqual(['fig-a', 'fig-b'])
    expect(repo.listByPaper('p-none')).toEqual([])
  })

  it('fileRefByFigure：命中回 file_ref；错 paperId/缺席均 null', () => {
    seedPaper(db, 'p-1')
    seedPaper(db, 'p-2')
    repo.insertFigure(fig('p-1', 'a'))
    expect(repo.fileRefByFigure('p-1', 'fig-a')).toBe('figures/p-1/digest-a.png')
    expect(repo.fileRefByFigure('p-2', 'fig-a')).toBeNull()
    expect(repo.fileRefByFigure('p-1', 'fig-none')).toBeNull()
  })

  it('FK 级联 repo 面：papers 直删→figure 行灭（DDL 承担，repo 零显式删）', () => {
    seedPaper(db, 'p-1')
    repo.insertFigure(fig('p-1', 'a'))
    repo.setJob('p-1', { status: 'ready', excess: 0, failedCount: 0 })
    db.prepare(`DELETE FROM papers WHERE id = 'p-1'`).run()
    expect(repo.getJob('p-1')).toBeNull()
    expect(repo.listByPaper('p-1')).toEqual([])
  })
})
