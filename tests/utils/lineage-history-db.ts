/**
 * 测试基建：lineage history-unit/写点守卫/快照三段闭环真库夹具单源
 * （B4 L1；消费=tests/unit/services/lineage-history-unit.service.test.ts、
 * tests/unit/db/repos/lineage-write-guard.test.ts、import-snapshot 两件序列）。
 *
 * 边界：真库（内存库+完整迁移链）——不动用户库；行种子走 repo 公开面或
 * 预编译 SQL 直插（测试预置条件，非运行时写点）。
 */
import { createRepos } from '../../src/main/db/repos'
import { createTestDb } from './fixtures'
import type { SqliteDb } from '../../src/main/db/connection'

export type Db = SqliteDb
export type Repos = ReturnType<typeof createRepos>
export type GuardedTable = 'lineage_nodes' | 'lineage_edges' | 'floating_notes'

export function makeLineageDb(): { db: Db; repos: Repos } {
  const db = createTestDb()
  return { db, repos: createRepos(db) }
}

/** 文献行（papers 最小必填列——FK 父） */
export function seedPaper(db: Db, id: string, folderId = '__main__'): void {
  db.prepare(
    `INSERT INTO papers (id, file_ref, sha256, title, added_at, updated_at, folder_id)
     VALUES (?, ?, ?, ?, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z', ?)`
  ).run(id, `f/${id}.pdf`, `sha-${id}`, `文献${id}`, folderId)
}

export function seedFolder(db: Db, id: string, name: string): void {
  db.prepare('INSERT INTO collections (id, name, position) VALUES (?, ?, 0)').run(id, name)
}

/** 预置行 updated_at（模拟「恢复值行/时钟域」——测试预置条件） */
export function setUpdatedAt(db: Db, table: GuardedTable, id: string, iso: string): void {
  db.prepare(`UPDATE ${table} SET updated_at = ? WHERE id = ?`).run(iso, id)
}

export interface GuardedRow {
  id: string
  created_at: string
  updated_at: string
}

export function rowOf(db: Db, table: GuardedTable, id: string): GuardedRow | null {
  const row = db.prepare(`SELECT id, created_at, updated_at FROM ${table} WHERE id = ?`).get(id) as
    | GuardedRow
    | undefined
  return row === undefined ? null : row
}

/** 该 id 的全部删事件 deleted_at（按 seq 序——append-only 日志的代际序） */
export function tombstonesOf(db: Db, entity: string, id: string): string[] {
  return (
    db
      .prepare('SELECT deleted_at FROM deletion_events WHERE entity = ? AND id = ? ORDER BY seq')
      .all(entity, id) as Array<{ deleted_at: string }>
  ).map((r) => r.deleted_at)
}

/** 直插删事件（预置远未来 tombstone——进入未来毫秒区的同技术，§7.5 序列 4/8） */
export function presetTombstone(db: Db, entity: string, id: string, deletedAt: string): void {
  db.prepare('INSERT INTO deletion_events (entity, id, deleted_at) VALUES (?, ?, ?)').run(entity, id, deletedAt)
}

export const iso = (ms: number): string => new Date(ms).toISOString()
export const addMs = (isoText: string, n: number): string => iso(Date.parse(isoText) + n)
export const ms = (isoText: string): number => Date.parse(isoText)
