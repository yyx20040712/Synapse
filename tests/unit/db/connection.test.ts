import { rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DB_PRAGMAS, openDatabase, readPragma } from '../../../src/main/db/connection'

describe('db/connection —— SQLite 连接与 pragma', () => {
  it('打开内存库不抛错', () => {
    expect(() => openDatabase(':memory:')).not.toThrow()
  })

  it('外键 pragma 生效（foreign_keys = 1）', () => {
    const db = openDatabase(':memory:')
    expect(readPragma(db, 'foreign_keys')).toBe(1)
    db.close()
  })

  it('WAL 生效（临时文件库，内存库 journal 恒为 memory 不适用）', () => {
    const dbPath = join(tmpdir(), `synapse-wal-${process.pid}-${Date.now()}.db`)
    const db = openDatabase(dbPath)
    expect(String(readPragma(db, 'journal_mode')).toLowerCase()).toBe('wal')
    db.close()
    for (const suffix of ['', '-wal', '-shm']) {
      rmSync(dbPath + suffix, { force: true })
    }
  })

  it('DB_PRAGMAS 覆盖关键安全/性能项', () => {
    expect(DB_PRAGMAS).toContain('foreign_keys = ON')
    expect(DB_PRAGMAS).toContain('journal_mode = WAL')
  })
})
