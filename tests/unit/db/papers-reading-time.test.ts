import { beforeEach, describe, expect, it } from 'vitest'
import { createPapersRepo, type PaperRow } from '../../../src/main/db/repos/papers.repo'
import type { SqliteDb } from '../../../src/main/db/connection'
import { createTestDb } from '../../utils/fixtures'

/**
 * P7E-05：papers.repo reading_seconds 读写锁定测试（新文件——papers.repo.test
 * 受锁零改）。覆盖：updateReadPage 第三参原子累加（两次 +30+45=75，非覆盖）+
 * R8 缺省第三参=0（旧调用方兼容锚——reading_seconds 不变）+detailById 回读
 * readingSeconds。always-active（不经 guardedDescribe）。
 */
function row(over: Partial<PaperRow> = {}): PaperRow {
  return {
    id: over.id ?? 'p-1',
    file_ref: over.file_ref ?? 'ab/cd/aaa.pdf',
    sha256: over.sha256 ?? 'sha-aaa',
    title: over.title ?? '阅读时长测试文献',
    authors_json: over.authors_json ?? '["张三"]',
    year: over.year ?? 2025,
    venue: over.venue ?? '水利学报',
    doi: over.doi ?? null,
    arxiv_id: over.arxiv_id ?? null,
    abstract: over.abstract ?? '',
    source: over.source ?? 'local',
    enrich_status: over.enrich_status ?? 'pending',
    added_at: over.added_at ?? '2026-01-01T00:00:00Z',
    updated_at: over.updated_at ?? '2026-01-01T00:00:00Z',
    last_read_page: over.last_read_page ?? 0
  }
}

describe('papers.repo —— reading_seconds（P7E-05）', () => {
  let db: SqliteDb
  let repo: ReturnType<typeof createPapersRepo>

  beforeEach(() => {
    db = createTestDb()
    repo = createPapersRepo(db)
  })

  it('updateReadPage 第三参原子累加：两次 +30+45=75（非覆盖）', () => {
    repo.insert(row())
    repo.updateReadPage('p-1', 3, 30)
    repo.updateReadPage('p-1', 5, 45)
    const r = db.prepare('SELECT last_read_page, reading_seconds FROM papers WHERE id = ?').get('p-1') as {
      last_read_page: number
      reading_seconds: number
    }
    expect(r.last_read_page).toBe(5)
    expect(r.reading_seconds).toBe(75)
  })

  it('R8：第三参缺省=0——reading_seconds 不变（旧调用方兼容锚）', () => {
    repo.insert(row())
    repo.updateReadPage('p-1', 3, 30)
    repo.updateReadPage('p-1', 7)
    const r = db.prepare('SELECT reading_seconds FROM papers WHERE id = ?').get('p-1') as {
      reading_seconds: number
    }
    expect(r.reading_seconds).toBe(30)
  })

  it('detailById 回读 readingSeconds（008 迁移列→PaperDetail 必填字段）', () => {
    repo.insert(row())
    expect(repo.detailById('p-1')?.readingSeconds).toBe(0)
    repo.updateReadPage('p-1', 3, 30)
    expect(repo.detailById('p-1')?.readingSeconds).toBe(30)
  })
})
