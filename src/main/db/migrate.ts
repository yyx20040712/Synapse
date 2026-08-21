/**
 * 迁移执行器（SR-INFRA-03，已完成）。
 *
 * 职责：按版本号顺序应用 SQL 迁移；PRAGMA user_version 驱动，幂等可重入。
 * 硬规则（CI 锁强制）：已合入的迁移文件不可修改，只能新增 002_*.sql、003_*.sql…。
 *
 * SQL 通过 Vite ?raw 内联进产物，打包后无需携带 .sql 文件。
 * 测试：tests/unit/db/migrate.test.ts（新库全量/已迁移跳过/部分失败回滚）。
 */
import type { SqliteDb } from './connection'
import initSql from './migrations/001_init.sql?raw'
import indexesSql from './migrations/002_indexes.sql?raw'

export interface Migration {
  version: number
  name: string
  sql: string
}

/** 迁移清单：新增迁移在此追加（文件放 migrations/ 并 import ?raw） */
export const MIGRATIONS: readonly Migration[] = [
  { version: 1, name: 'init', sql: initSql },
  { version: 2, name: 'indexes', sql: indexesSql }
]

export interface MigrateResult {
  appliedVersions: number[]
  currentVersion: number
}

/**
 * 应用迁移。migrations 参数仅供测试注入（构造坏迁移验证回滚）；生产调用留空。
 */
export function migrate(
  db: SqliteDb,
  migrations: readonly Migration[] = MIGRATIONS
): MigrateResult {
  const current = readUserVersion(db)
  const applied: number[] = []

  for (const migration of [...migrations].sort((a, b) => a.version - b.version)) {
    if (migration.version <= current) continue
    // user_version 经字符串插值写入 pragma（pragma 无法参数绑定）——
    // 值只允许整数，杜绝任何拼接来源（AGENTS.md SQL 禁令的自证）
    if (!Number.isInteger(migration.version)) {
      throw new Error(`迁移版本号必须是整数：${String(migration.version)}`)
    }
    const runMigration = db.transaction(() => {
      db.exec(migration.sql)
      db.pragma(`user_version = ${migration.version}`)
    })
    runMigration()
    applied.push(migration.version)
  }

  return { appliedVersions: applied, currentVersion: readUserVersion(db) }
}

export function readUserVersion(db: SqliteDb): number {
  const row = db.prepare('PRAGMA user_version').get() as { user_version: number }
  return row.user_version
}
