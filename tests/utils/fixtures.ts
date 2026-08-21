/**
 * 测试基建：通用夹具（受锁文件）。
 * - createTestDb()：内存库 + 完整迁移，repo 测试直接用
 * - fixedNow()/isoAt()：时间冻结，断言时间戳确定性
 * - deepClone：夹具对象复制的标准方式（结构化克隆，无函数）
 */
import { openDatabase, type SqliteDb } from '../../src/main/db/connection'
import { migrate } from '../../src/main/db/migrate'

export function createTestDb(): SqliteDb {
  const db = openDatabase(':memory:')
  migrate(db)
  return db
}

export function isoAt(ms: number): string {
  return new Date(ms).toISOString()
}

export const FIXED_NOW = 1_760_000_000_000

export function fixedIso(): string {
  return new Date(FIXED_NOW).toISOString()
}

export function deepClone<T>(value: T): T {
  return structuredClone(value)
}
