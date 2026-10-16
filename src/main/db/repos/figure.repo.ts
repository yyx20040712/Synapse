/**
 * [F-VISFB-42] figure.repo —— 派生图表资产仓储（figure_jobs+paper_figures，
 * 迁移 023；提取管线蓝本=00B 接手单 20261016-visfbb0/02）。
 *
 * ── 行为层 ──
 * - jobs 状态面：setJob 全行 upsert（pending→ready/failed 终态+excess 截断
 *   记档+failed_count 单图失败计数——failed≠empty：job 行在场即可区分「提取
 *   过零资产」与「从未提取」）；getJob 缺席 null（合法态非错误）。
 * - resetJobsForPapers（快照恢复重提挂点——import-snapshot.service 事务内调）：
 *   在场 paper 重置 pending 零计数+figure 行清空（派生不入快照，恢复后重提取
 *   ——无「ready 但资产缺失」态）；缺席 paper（防复活跳过面）经 INSERT…
 *   SELECT 存在性守卫自然跳过零副作用。
 * - 资产行面：insertFigure（UNIQUE(paper_id,digest)=digest 单键——同篇同
 *   digest 二行违约抛=编程错误显性化，去重读法归 findByDigest 先查）；
 *   fileRefByFigure 协议查表（paperId+figureId 双参校验）。
 * - 级联：paper_id FK CASCADE（迁移 023）——papers 三删除路径（单删/域删/
 *   快照导入直删）自动清派生行，repo 无显式级联删。
 *
 * ── 文化层 ──
 * - 全语句 db.prepare 预编译+参数绑定（禁拼接）；测试：
 *   tests/unit/db/repos/figure.repo.test.ts（真库——always-active）。
 */
import type { SqliteDb } from '../connection'

export type FigureJobStatus = 'pending' | 'ready' | 'failed'

export interface FigureJobRow {
  paperId: string
  status: FigureJobStatus
  excess: number
  failedCount: number
  updatedAt: string
}

export interface FigureInsert {
  figureId: string
  paperId: string
  /** 解码位图 sha256（hex64）——去重单键（00B：禁 ref 做去重键） */
  digest: string
  /** 受管存储相对路径 figures/<paperId>/<digest>.png */
  fileRef: string
  /** 1 基页码（首 draw 页即归属页——00B） */
  page: number
  width: number
  height: number
  /** CTM bbox（PDF 用户空间 pt） */
  ctmX: number
  ctmY: number
  ctmW: number
  ctmH: number
}

export interface FigureRow extends FigureInsert {
  createdAt: string
  updatedAt: string
}

export interface FigureJobPatch {
  status: FigureJobStatus
  excess: number
  failedCount: number
}

export interface FigureRepo {
  /** 全行 upsert（ON CONFLICT(paper_id) DO UPDATE——再写覆写+刷新 updated_at） */
  setJob(paperId: string, patch: FigureJobPatch): void
  getJob(paperId: string): FigureJobRow | null
  /** 资产行插入（digest 单键违约抛——去重先查 findByDigest） */
  insertFigure(row: FigureInsert): void
  findByDigest(paperId: string, digest: string): FigureRow | null
  countByPaper(paperId: string): number
  listByPaper(paperId: string): FigureRow[]
  /** 协议查表：paperId+figureId 双参（错 paperId=null） */
  fileRefByFigure(paperId: string, figureId: string): string | null
  /** 清该篇全部资产行（重提取/恢复重提用；返回删除行数） */
  removeByPaper(paperId: string): number
  /** [F-VISFB-43] pending 单 paperId 集（rowid 序=导入建单序——桥件批序消费） */
  listPendingPaperIds(): string[]
  /** 快照恢复重提：在场 paper 集重置 pending+figure 行清空（存在性守卫在 SQL 面） */
  resetJobsForPapers(paperIds: readonly string[]): void
}

export function createFigureRepo(db: SqliteDb): FigureRepo {
  const setJobStmt = db.prepare(
    `INSERT INTO figure_jobs (paper_id, status, excess, failed_count, updated_at)
     VALUES (@paperId, @status, @excess, @failedCount, @now)
     ON CONFLICT(paper_id) DO UPDATE SET
       status = excluded.status, excess = excluded.excess,
       failed_count = excluded.failed_count, updated_at = excluded.updated_at`
  )
  const getJobStmt = db.prepare(
    `SELECT paper_id, status, excess, failed_count, updated_at
     FROM figure_jobs WHERE paper_id = ?`
  )
  const insertStmt = db.prepare(
    `INSERT INTO paper_figures
       (figure_id, paper_id, digest, file_ref, page, width, height,
        ctm_x, ctm_y, ctm_w, ctm_h, created_at, updated_at)
     VALUES
       (@figureId, @paperId, @digest, @fileRef, @page, @width, @height,
        @ctmX, @ctmY, @ctmW, @ctmH, @now, @now)`
  )
  const findByDigestStmt = db.prepare(
    `SELECT figure_id, paper_id, digest, file_ref, page, width, height,
            ctm_x, ctm_y, ctm_w, ctm_h, created_at, updated_at
     FROM paper_figures WHERE paper_id = ? AND digest = ?`
  )
  const listStmt = db.prepare(
    `SELECT figure_id, paper_id, digest, file_ref, page, width, height,
            ctm_x, ctm_y, ctm_w, ctm_h, created_at, updated_at
     FROM paper_figures WHERE paper_id = ? ORDER BY page, rowid`
  )
  const countStmt = db.prepare('SELECT COUNT(*) AS c FROM paper_figures WHERE paper_id = ?')
  const fileRefStmt = db.prepare(
    'SELECT file_ref FROM paper_figures WHERE paper_id = ? AND figure_id = ?'
  )
  const removeStmt = db.prepare('DELETE FROM paper_figures WHERE paper_id = ?')
  // [F-VISFB-43] pending 集读（rowid 序=导入建单序）
  const listPendingStmt = db.prepare(
    'SELECT paper_id FROM figure_jobs WHERE status = \'pending\' ORDER BY rowid'
  )
  // 存在性守卫：SELECT 无行=零插入（防复活跳过的 paper 本地已删——FK 违约面
  // 结构性避开）；在场行经 ON CONFLICT 重置（不双写不抛）
  const resetJobStmt = db.prepare(
    `INSERT INTO figure_jobs (paper_id, status, excess, failed_count, updated_at)
     SELECT @id, 'pending', 0, 0, @now FROM papers WHERE id = @id
     ON CONFLICT(paper_id) DO UPDATE SET
       status = 'pending', excess = 0, failed_count = 0, updated_at = excluded.updated_at`
  )

  interface FigureDbRow {
    figure_id: string
    paper_id: string
    digest: string
    file_ref: string
    page: number
    width: number
    height: number
    ctm_x: number
    ctm_y: number
    ctm_w: number
    ctm_h: number
    created_at: string
    updated_at: string
  }

  function toRow(r: FigureDbRow): FigureRow {
    return {
      figureId: r.figure_id,
      paperId: r.paper_id,
      digest: r.digest,
      fileRef: r.file_ref,
      page: r.page,
      width: r.width,
      height: r.height,
      ctmX: r.ctm_x,
      ctmY: r.ctm_y,
      ctmW: r.ctm_w,
      ctmH: r.ctm_h,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }
  }

  function getJob(paperId: string): FigureJobRow | null {
    const row = getJobStmt.get(paperId) as
      | { paper_id: string; status: FigureJobStatus; excess: number; failed_count: number; updated_at: string }
      | undefined
    if (row === undefined) return null
    return {
      paperId: row.paper_id,
      status: row.status,
      excess: row.excess,
      failedCount: row.failed_count,
      updatedAt: row.updated_at
    }
  }

  return {
    setJob(paperId, patch): void {
      setJobStmt.run({ paperId, ...patch, now: new Date().toISOString() })
    },

    getJob,

    insertFigure(row): void {
      insertStmt.run({ ...row, now: new Date().toISOString() })
    },

    findByDigest(paperId, digest): FigureRow | null {
      const row = findByDigestStmt.get(paperId, digest) as FigureDbRow | undefined
      return row === undefined ? null : toRow(row)
    },

    countByPaper(paperId): number {
      return (countStmt.get(paperId) as { c: number }).c
    },

    listByPaper(paperId): FigureRow[] {
      return (listStmt.all(paperId) as FigureDbRow[]).map(toRow)
    },

    fileRefByFigure(paperId, figureId): string | null {
      const row = fileRefStmt.get(paperId, figureId) as { file_ref: string } | undefined
      return row === undefined ? null : row.file_ref
    },

    removeByPaper(paperId): number {
      return removeStmt.run(paperId).changes
    },

    listPendingPaperIds(): string[] {
      return (listPendingStmt.all() as { paper_id: string }[]).map((r) => r.paper_id)
    },

    resetJobsForPapers(paperIds): void {
      const now = new Date().toISOString()
      for (const id of paperIds) {
        resetJobStmt.run({ id, now })
        removeStmt.run(id)
      }
    }
  }
}
