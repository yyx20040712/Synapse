/**
 * [B4 L1 / 设计稿 §5.3/§7.4/§7.5] lineage-history.repo —— history-unit 精确恢复
 * 仓储（只供 lineage-history-unit.service 到达；不开放通用 upsert IPC）。
 *
 * ── 行为层 ──
 * - putNodeExact/putEdgeExact/putFloatingNoteExact：按指定 id 写入完整实体。
 *   INSERT 分支=恢复插入：created_at/updated_at 写调用方传入值（恢复点守卫值
 *   ——由 service 计算）；UPDATE 分支=对既有行的反向更新：created_at 不得被
 *   改写（不在 SET 列），updated_at=写点单调守卫值（同一 SQL 标量 max 公式，
 *   updated-at-guard.ts 单源——与三 repo upsert 同式）。
 * - remove*：单行删（缺席=0 changes）；删事件落账由 026/028 触发器承担。
 * - 读行原语 getNode/getEdge/getFloatingNote；readMaxDeletedAt(entity,id)=该 id
 *   在 deletion_events 的 MAX(deleted_at)（append-only 日志只读——供 §7.5
 *   恢复点守卫在同一事务内取既有 tombstone 最大代际）。
 *
 * ── 架构层 ──
 * - 列名=源码固定常量；值全命名参数绑定；表名=源码固定字面量（非用户输入）。
 *   lineage_nodes 死置列（core_idea/tags）不列——INSERT 走 DDL DEFAULT。
 * - 全语句 db.prepare 预编译。测试=tests/unit/services/
 *   lineage-history-unit.service.test.ts（真库）+lineage-write-guard。
 */
import type {
  FloatingNote,
  LineageEdge,
  LineageEdgeUpsert,
  LineageNode,
  LineageNodeUpsert
} from '../../../shared/models/lineage'
import type { SqliteDb } from '../connection'
import {
  LINEAGE_EDGE_COLS,
  LINEAGE_NODE_COLS,
  toEdge,
  toNode,
  type LineageEdgeRow,
  type LineageNodeRow
} from './lineage.repo.rows'
import { monotonicUpdatedAt } from './updated-at-guard'
import { FLOATING_NOTE_COLS } from './floating-notes.repo'

/** 可恢复实体三表（删事件 entity 名=表名） */
export type LineageHistoryEntity = 'lineage_nodes' | 'lineage_edges' | 'floating_notes'

export interface LineageHistoryRepo {
  getNode(id: string): LineageNode | null
  getEdge(id: string): LineageEdge | null
  getFloatingNote(id: string): FloatingNote | null
  putNodeExact(node: LineageNode): LineageNode
  putEdgeExact(edge: LineageEdge): LineageEdge
  putFloatingNoteExact(note: FloatingNote): FloatingNote
  removeNode(id: string): number
  removeEdge(id: string): number
  removeFloatingNote(id: string): number
  /** 该 id 既有 tombstone 的最大 deleted_at（无= null） */
  readMaxDeletedAt(entity: LineageHistoryEntity, id: string): string | null
}

interface FloatingNoteRow {
  id: string
  folder_id: string
  x: number
  y: number
  content: string
  created_at: string
  updated_at: string
}

const toNote = (r: FloatingNoteRow): FloatingNote => ({
  id: r.id,
  folderId: r.folder_id,
  x: r.x,
  y: r.y,
  content: r.content,
  createdAt: r.created_at,
  updatedAt: r.updated_at
})

export function createLineageHistoryRepo(db: SqliteDb): LineageHistoryRepo {
  const putNodeStmt = db.prepare(
    `INSERT INTO lineage_nodes (id, paper_id, title, year, x, y, month, slot, folder_id, created_at, updated_at)
     VALUES (@id, @paperId, @title, @year, @x, @y, @month, @slot, @folderId, @createdAt, @updatedAt)
     ON CONFLICT(id) DO UPDATE SET
       paper_id = excluded.paper_id, title = excluded.title, year = excluded.year,
       x = excluded.x, y = excluded.y, month = excluded.month, slot = excluded.slot,
       folder_id = excluded.folder_id, updated_at = ${monotonicUpdatedAt('lineage_nodes')}`
  )
  const putEdgeStmt = db.prepare(
    `INSERT INTO lineage_edges (id, from_node, to_node, label, kind, sub, via, from_anchor, to_anchor, dashed, color, created_at, updated_at)
     VALUES (@id, @fromNode, @toNode, @label, 'manual', NULL, @via, @fromAnchor, @toAnchor, @dashed, @color, @createdAt, @updatedAt)
     ON CONFLICT(id) DO UPDATE SET
       from_node = excluded.from_node, to_node = excluded.to_node, label = excluded.label,
       kind = excluded.kind, sub = excluded.sub, via = excluded.via,
       from_anchor = excluded.from_anchor, to_anchor = excluded.to_anchor,
       dashed = excluded.dashed, color = excluded.color,
       updated_at = ${monotonicUpdatedAt('lineage_edges')}`
  )
  const putNoteStmt = db.prepare(
    `INSERT INTO floating_notes (id, folder_id, x, y, content, created_at, updated_at)
     VALUES (@id, @folderId, @x, @y, @content, @createdAt, @updatedAt)
     ON CONFLICT(id) DO UPDATE SET
       folder_id = excluded.folder_id, x = excluded.x, y = excluded.y,
       content = excluded.content, updated_at = ${monotonicUpdatedAt('floating_notes')}`
  )
  const getNodeStmt = db.prepare(`SELECT ${LINEAGE_NODE_COLS} FROM lineage_nodes WHERE id = ?`)
  const getEdgeStmt = db.prepare(`SELECT ${LINEAGE_EDGE_COLS} FROM lineage_edges WHERE id = ?`)
  const getNoteStmt = db.prepare(`SELECT ${FLOATING_NOTE_COLS} FROM floating_notes WHERE id = ?`)
  const removeNodeStmt = db.prepare(`DELETE FROM lineage_nodes WHERE id = ?`)
  const removeEdgeStmt = db.prepare(`DELETE FROM lineage_edges WHERE id = ?`)
  const removeNoteStmt = db.prepare(`DELETE FROM floating_notes WHERE id = ?`)
  const maxDeletedAtStmt = db.prepare(
    `SELECT MAX(deleted_at) AS deleted_at FROM deletion_events WHERE entity = ? AND id = ?`
  )

  /** via/锚序列化口径与 lineage.repo upsertEdge 同构（null/空数组/缺省→NULL） */
  const edgeArgs = (e: LineageEdgeUpsert & { id: string; createdAt: string; updatedAt: string }) => ({
    id: e.id,
    fromNode: e.fromNode,
    toNode: e.toNode,
    label: e.label,
    via: e.via != null && e.via.length > 0 ? JSON.stringify(e.via) : null,
    fromAnchor: e.fromAnchor != null ? JSON.stringify(e.fromAnchor) : null,
    toAnchor: e.toAnchor != null ? JSON.stringify(e.toAnchor) : null,
    dashed: e.dashed === true ? 1 : 0,
    color: e.color,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt
  })

  const nodeArgs = (n: LineageNodeUpsert & { id: string; createdAt: string; updatedAt: string }) => ({
    id: n.id,
    paperId: n.paperId,
    title: n.title,
    year: n.year,
    x: n.x,
    y: n.y,
    month: n.month ?? null,
    slot: n.slot ?? null,
    folderId: n.folderId,
    createdAt: n.createdAt,
    updatedAt: n.updatedAt
  })

  return {
    getNode(id) {
      const r = getNodeStmt.get(id) as LineageNodeRow | undefined
      return r === undefined ? null : toNode(r)
    },
    getEdge(id) {
      const r = getEdgeStmt.get(id) as LineageEdgeRow | undefined
      return r === undefined ? null : toEdge(r)
    },
    getFloatingNote(id) {
      const r = getNoteStmt.get(id) as FloatingNoteRow | undefined
      return r === undefined ? null : toNote(r)
    },
    putNodeExact(node) {
      putNodeStmt.run(nodeArgs(node))
      return toNode(getNodeStmt.get(node.id) as LineageNodeRow)
    },
    putEdgeExact(edge) {
      putEdgeStmt.run(edgeArgs(edge))
      return toEdge(getEdgeStmt.get(edge.id) as LineageEdgeRow)
    },
    putFloatingNoteExact(note) {
      putNoteStmt.run({
        id: note.id,
        folderId: note.folderId,
        x: note.x,
        y: note.y,
        content: note.content,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt
      })
      return toNote(getNoteStmt.get(note.id) as FloatingNoteRow)
    },
    removeNode(id) {
      return removeNodeStmt.run(id).changes
    },
    removeEdge(id) {
      return removeEdgeStmt.run(id).changes
    },
    removeFloatingNote(id) {
      return removeNoteStmt.run(id).changes
    },
    readMaxDeletedAt(entity, id) {
      const r = maxDeletedAtStmt.get(entity, id) as { deleted_at: string | null }
      return r.deleted_at
    }
  }
}
