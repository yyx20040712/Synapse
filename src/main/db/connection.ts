/**
 * SQLite 连接 —— 全项目唯一建连处（SR-INFRA-01，已完成）。
 *
 * 职责：打开数据库、设置 pragma；不包含任何业务 SQL。
 * 仓储层（repos/*）与迁移器（migrate.ts）从这里拿连接，禁止自行 new Database。
 *
 * 测试：tests/unit/db/connection.test.ts（内存库 + pragma 生效断言）。
 */
import Database from 'better-sqlite3'

export type SqliteDb = Database.Database

export const DB_PRAGMAS: readonly string[] = [
  'journal_mode = WAL',
  'foreign_keys = ON',
  'synchronous = NORMAL',
  'temp_store = MEMORY'
]

/** 打开数据库并应用 pragma。dbPath 传 ':memory:' 用于单元测试。 */
export function openDatabase(dbPath: string): SqliteDb {
  const db = new Database(dbPath)
  for (const pragma of DB_PRAGMAS) {
    db.pragma(pragma)
  }
  return db
}

/** 供测试与诊断读取当前 pragma 状态 */
export function readPragma(db: SqliteDb, name: string): unknown {
  const row = db.pragma(name, { simple: true })
  return row
}
