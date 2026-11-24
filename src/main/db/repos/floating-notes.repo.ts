/**
 * [F-VISFB-61] floating-notes.repo —— 悬浮笔记数据仓储（B6-61；迁移 024：
 * floating_notes 表——无 paper_id 纯画布节点 §0-5 裁决）。
 *
 * ── 行为层 ──
 * - upsert：id 缺省=randomUUID 新建 / 提供=更新（在场行 created_at 首插保留
 *   +updated_at 刷新）或插入（未知 id——ON CONFLICT(id) DO UPDATE 的 INSERT
 *   分支，upsertEdge 家族同型〔回炉 R3 语义如实表述〕）；x/y 直写（画布 own 域坐标——62 号
 *   消费面按 effective-scale 换算，本层只存取）；域归属存在性守卫在 service
 *   （幽灵 folder 拒——upsertEdge 节点存在性守卫同族）。
 * - remove：单行删（缺席=0 changes 幂等）；deletion_events 落账由 024 触发器
 *   承担（guard=0 用户路径——防复活数据源 INV-132 兑现面）。
 * - 域删级联：folder_id FK ON DELETE CASCADE（DDL 承担——012/019 族域资产
 *   先例；级联点火触发器落账=021 头注实测超集口径）。
 * - 读面：listByFolder（graph 域读——folderId 隔离）+listAll（undefined
 *   并集——graph 无 folderId 历史兼容形态）；created_at,rowid 确定性序
 *   （lineage_nodes 同哲学——id=随机 uuid 不作平局决胜键）。
 *
 * ── 文化层 ──
 * - 全语句 db.prepare 预编译+参数绑定。测试：
 *   tests/unit/db/repos/floating-notes.repo.test.ts。
 */
import { randomUUID } from 'node:crypto'
import type { FloatingNote, FloatingNoteUpsert } from '../../../shared/models/lineage'
import type { SqliteDb } from '../connection'
import { monotonicUpdatedAt } from './updated-at-guard'

/** 行形状（列名蛇形——DB 原样） */
interface FloatingNoteRow {
  id: string
  folder_id: string
  x: number
  y: number
  content: string
  created_at: string
  updated_at: string
}

/** 读面显式列清单（与 FloatingNoteRow 字段集一一对应——[db-C3] SELECT *
 *  收口：防后续迁移加列致行形状漂移；papers.repo SELECT_COLS 先例同型） */
/** 读面显式列清单——导出供 lineage-history.repo（history-unit 精确恢复读行）复用：
 *  同值双常量禁分文件各写一份（quality 第 7 段） */
export const FLOATING_NOTE_COLS = 'id, folder_id, x, y, content, created_at, updated_at'

const toNote = (r: FloatingNoteRow): FloatingNote => ({
  id: r.id,
  folderId: r.folder_id,
  x: r.x,
  y: r.y,
  content: r.content,
  createdAt: r.created_at,
  updatedAt: r.updated_at
})

export interface FloatingNotesRepo {
  /** 新建（id 缺省 randomUUID）或更新/插入（提供 id：在场更新 created_at 保留，
   *  未知 id 插入——ON CONFLICT upsert 语义） */
  upsert(input: FloatingNoteUpsert): FloatingNote
  /** 删行；返回删行数（缺席=0 幂等） */
  remove(id: string): number
  /** 域读（graph 通道装配源——folderId 隔离） */
  listByFolder(folderId: string): FloatingNote[]
  /** 全量读（folderId undefined 并集形态——graph 无参历史兼容） */
  listAll(): FloatingNote[]
}

export function createFloatingNotesRepo(db: SqliteDb): FloatingNotesRepo {
  // [B4 L1 §7.5 普通写点守卫] UPDATE 分支 updated_at=写点单调守卫值（公式单源=
  // updated-at-guard.ts；INSERT 分支原样写调用方 now）
  const upsertStmt = db.prepare(
    `INSERT INTO floating_notes (id, folder_id, x, y, content, created_at, updated_at)
     VALUES (@id, @folderId, @x, @y, @content, @now, @now)
     ON CONFLICT(id) DO UPDATE SET
       folder_id = excluded.folder_id, x = excluded.x, y = excluded.y,
       content = excluded.content, updated_at = ${monotonicUpdatedAt('floating_notes')}`
  )
  const byIdStmt = db.prepare(`SELECT ${FLOATING_NOTE_COLS} FROM floating_notes WHERE id = ?`)
  const removeStmt = db.prepare(`DELETE FROM floating_notes WHERE id = ?`)
  const byFolderStmt = db.prepare(
    `SELECT ${FLOATING_NOTE_COLS} FROM floating_notes WHERE folder_id = ? ORDER BY created_at, rowid`
  )
  const allStmt = db.prepare(
    `SELECT ${FLOATING_NOTE_COLS} FROM floating_notes ORDER BY created_at, rowid`
  )

  return {
    upsert(input: FloatingNoteUpsert): FloatingNote {
      const id = input.id ?? randomUUID()
      upsertStmt.run({
        id,
        folderId: input.folderId,
        x: input.x,
        y: input.y,
        content: input.content,
        now: new Date().toISOString()
      })
      return toNote(byIdStmt.get(id) as FloatingNoteRow)
    },

    remove(id: string): number {
      return removeStmt.run(id).changes
    },

    listByFolder(folderId: string): FloatingNote[] {
      return (byFolderStmt.all(folderId) as FloatingNoteRow[]).map(toNote)
    },

    listAll(): FloatingNote[] {
      return (allStmt.all() as FloatingNoteRow[]).map(toNote)
    }
  }
}
