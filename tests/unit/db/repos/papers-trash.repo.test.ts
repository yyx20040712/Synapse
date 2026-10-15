/**
 * [F-DBCAMP-01 DB-4 / F-DBCAMP-01 设计 §5.d②] papers.repo 删除清理读法
 * （countBySha256+listFileRefsByFolder——真库）。
 *
 * 覆盖：countBySha256 引用计数三分支（0/1/2——共引判定源）；listFileRefsByFolder
 * 域内 sha+file_ref 清单（域删级联隔离遍历源）；空夹=空数组。
 * always-active（不经 guardedDescribe）。
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { createPapersRepo, type PaperRow } from '../../../../src/main/db/repos/papers.repo'
import type { SqliteDb } from '../../../../src/main/db/connection'
import { createTestDb } from '../../../utils/fixtures'

function row(over: Partial<PaperRow> = {}): PaperRow {
  return {
    id: over.id ?? 'p-1',
    file_ref: over.file_ref ?? 'ab/cd/aaa.pdf',
    sha256: over.sha256 ?? 'sha-aaa',
    title: over.title ?? '智慧水务综述',
    authors_json: over.authors_json ?? '["张三"]',
    year: over.year ?? 2025,
    venue: over.venue ?? '水利学报',
    doi: over.doi ?? null,
    arxiv_id: over.arxiv_id ?? null,
    abstract: over.abstract ?? '摘要',
    source: over.source ?? 'local',
    enrich_status: over.enrich_status ?? 'pending',
    added_at: over.added_at ?? '2026-01-01T00:00:00Z',
    updated_at: over.updated_at ?? '2026-01-01T00:00:00Z',
    last_read_page: over.last_read_page ?? 0
  }
}

/** 归属直写（insert 列族不含 folder_id——锁定测试同型 UPDATE 面，参数绑定；
 *  FK 目标行先建） */
function seedFolder(db: SqliteDb, id: string): void {
  db.prepare('INSERT INTO collections (id, name) VALUES (?, ?)').run(id, `夹-${id}`)
}
function setFolder(db: SqliteDb, id: string, folderId: string): void {
  db.prepare('UPDATE papers SET folder_id = ? WHERE id = ?').run(folderId, id)
}

describe('F-DBCAMP-01 DB-4 papers.repo 删除清理读法', () => {
  let db: SqliteDb
  let repo: ReturnType<typeof createPapersRepo>

  beforeEach(() => {
    db = createTestDb()
    repo = createPapersRepo(db)
  })

  it('countBySha256：0/1 引用计数（最后引用方判定源——papers.sha256 UNIQUE 下共引行不可达，>1 分支=防御面由 service 桩测覆盖）', () => {
    expect(repo.countBySha256('sha-x')).toBe(0)
    repo.insert(row({ id: 'p-1', sha256: 'sha-x' }))
    expect(repo.countBySha256('sha-x')).toBe(1)
    repo.insert(row({ id: 'p-2', sha256: 'sha-y', file_ref: 'ab/cd/y.pdf' }))
    expect(repo.countBySha256('sha-x')).toBe(1)
    repo.remove('p-1')
    expect(repo.countBySha256('sha-x')).toBe(0)
  })

  it('listFileRefsByFolder：域内 sha+file_ref 清单（隔离遍历源）', () => {
    repo.insert(row({ id: 'p-1', sha256: 'sha-1', file_ref: 'aa/bb/1.pdf' }))
    repo.insert(row({ id: 'p-2', sha256: 'sha-2', file_ref: 'cc/dd/2.pdf' }))
    repo.insert(row({ id: 'p-3', sha256: 'sha-3', file_ref: 'ee/ff/3.pdf' }))
    seedFolder(db, 'f-a')
    seedFolder(db, 'f-b')
    setFolder(db, 'p-1', 'f-a')
    setFolder(db, 'p-2', 'f-a')
    setFolder(db, 'p-3', 'f-b')
    expect(repo.listFileRefsByFolder('f-a')).toEqual([
      { sha256: 'sha-1', fileRef: 'aa/bb/1.pdf' },
      { sha256: 'sha-2', fileRef: 'cc/dd/2.pdf' }
    ])
    expect(repo.listFileRefsByFolder('f-empty')).toEqual([])
  })
})
