import { beforeEach, describe, expect, it } from 'vitest'
import { createPapersRepo, type PaperRow } from '../../../../src/main/db/repos/papers.repo'
import type { SqliteDb } from '../../../../src/main/db/connection'
import { createTestDb } from '../../../utils/fixtures'
import { guardedDescribe } from '../../../utils/guard'

function row(over: Partial<PaperRow> = {}): PaperRow {
  return {
    id: over.id ?? 'p-1',
    file_ref: over.file_ref ?? 'ab/cd/aaa.pdf',
    sha256: over.sha256 ?? 'sha-aaa',
    title: over.title ?? '智慧水务综述',
    authors_json: over.authors_json ?? '["张三","李四"]',
    year: over.year ?? 2025,
    venue: over.venue ?? '水利学报',
    doi: over.doi ?? '10.1000/demo',
    arxiv_id: over.arxiv_id ?? null,
    abstract: over.abstract ?? '智慧城市背景下的水务管理进展',
    source: over.source ?? 'local',
    enrich_status: over.enrich_status ?? 'pending',
    added_at: over.added_at ?? '2026-01-01T00:00:00Z',
    updated_at: over.updated_at ?? '2026-01-01T00:00:00Z',
    last_read_page: over.last_read_page ?? 0
  }
}

guardedDescribe(
  'SR-DB-01',
  'papers.repo —— CRUD 与列表查询',
  () => {
    let db: SqliteDb
    let repo: ReturnType<typeof createPapersRepo>

    beforeEach(() => {
      db = createTestDb()
      repo = createPapersRepo(db)
    })

    it('insert → findById 往返一致', () => {
      repo.insert(row())
      const found = repo.findById('p-1')
      expect(found).not.toBeNull()
      expect(found?.title).toBe('智慧水务综述')
      expect(found?.file_ref).toBe('ab/cd/aaa.pdf')
    })

    it('findBySha256 命中/未命中', () => {
      repo.insert(row())
      expect(repo.findBySha256('sha-aaa')?.id).toBe('p-1')
      expect(repo.findBySha256('nope')).toBeNull()
    })

    it('fileRefById：协议层窄查询', () => {
      repo.insert(row())
      expect(repo.fileRefById('p-1')).toBe('ab/cd/aaa.pdf')
      expect(repo.fileRefById('ghost')).toBeNull()
    })

    it('updateMeta：只改给定字段且 updated_at 前进', () => {
      repo.insert(row({ updated_at: '2026-01-01T00:00:00Z' }))
      const updated = repo.updateMeta('p-1', { title: '新标题', year: null })
      expect(updated?.title).toBe('新标题')
      expect(updated?.year).toBeNull()
      expect(updated?.doi).toBe('10.1000/demo') // 未提供的字段保持
      expect(updated && updated.updated_at > '2026-01-01T00:00:00Z').toBe(true)
      expect(repo.updateMeta('ghost', { title: 'x' })).toBeNull()
    })

    it('applyEnrichment：回写 source/enrich_status/字段', () => {
      repo.insert(row())
      const r = repo.applyEnrichment('p-1', {
        source: 'crossref',
        enrichStatus: 'done',
        patch: { venue: 'Water Research', abstract: '新摘要' }
      })
      expect(r?.source).toBe('crossref')
      expect(r?.enrich_status).toBe('done')
      expect(r?.venue).toBe('Water Research')
    })

    it('updateReadPage 生效', () => {
      repo.insert(row())
      repo.updateReadPage('p-1', 7)
      expect(repo.findById('p-1')?.last_read_page).toBe(7)
    })

    describe('searchSummaries —— 搜索/筛选/排序/分页', () => {
      beforeEach(() => {
        repo.insert(row({ id: 'p-1', title: '智慧水务综述', year: 2025, added_at: '2026-01-01T00:00:00Z' }))
        repo.insert(
          row({
            id: 'p-2',
            sha256: 'sha-bbb',
            title: 'Water Quality Model',
            authors_json: '["Wang"]',
            year: 2023,
            abstract: 'quality modeling',
            added_at: '2026-01-02T00:00:00Z'
          })
        )
        repo.insert(
          row({
            id: 'p-3',
            sha256: 'sha-ccc',
            title: '管网漏损控制',
            year: 2025,
            added_at: '2026-01-03T00:00:00Z'
          })
        )
      })

      it('无过滤：默认 added_desc 排序，total 正确', () => {
        const r = repo.searchSummaries({ sort: 'added_desc', offset: 0, limit: 50 })
        expect(r.total).toBe(3)
        expect(r.items.map((i) => i.id)).toEqual(['p-3', 'p-2', 'p-1'])
      })

      it('FTS 中文命中：搜索"水务"只返回含该词的文献', () => {
        const r = repo.searchSummaries({ search: '水务', sort: 'added_desc', offset: 0, limit: 50 })
        expect(r.items.map((i) => i.id)).toEqual(['p-1'])
      })

      it('FTS 英文词干命中（unicode61 分词）', () => {
        const r = repo.searchSummaries({ search: 'quality', sort: 'added_desc', offset: 0, limit: 50 })
        expect(r.items.map((i) => i.id)).toEqual(['p-2'])
      })

      it('FTS 注入向量被当字面短语处理，不报 SQL 错', () => {
        expect(() =>
          repo.searchSummaries({ search: '" OR 1=1 --', sort: 'added_desc', offset: 0, limit: 50 })
        ).not.toThrow()
      })

      it('year 过滤 + 分页 offset/limit', () => {
        const r = repo.searchSummaries({ year: 2025, sort: 'added_desc', offset: 0, limit: 1 })
        expect(r.total).toBe(2)
        expect(r.items).toHaveLength(1)
      })

      it('sort=year_desc / title_asc', () => {
        expect(
          repo.searchSummaries({ sort: 'year_desc', offset: 0, limit: 50 }).items.map((i) => i.year)
        ).toEqual([2025, 2025, 2023])
        expect(
          repo.searchSummaries({ sort: 'title_asc', offset: 0, limit: 50 }).items[0]?.title
        ).toBe('Water Quality Model')
      })

      it('汇总字段：tagNames/collectionNames/annotationCount/noteCount 聚合', () => {
        db.prepare(`INSERT INTO tags (id, name) VALUES ('t-1','必读')`).run()
        db.prepare(`INSERT INTO paper_tags (paper_id, tag_id) VALUES ('p-1','t-1')`).run()
        db.prepare(`INSERT INTO collections (id, name, position) VALUES ('c-1','第二时代',0)`).run()
        db.prepare(`INSERT INTO paper_collections (paper_id, collection_id) VALUES ('p-1','c-1')`).run()
        db.prepare(
          `INSERT INTO annotations (id, paper_id, page, kind, sort_key, created_at, updated_at)
           VALUES ('a-1','p-1',0,'highlight','0000:01','t','t')`
        ).run()
        db.prepare(
          `INSERT INTO notes (id, paper_id, title, content_md, created_at, updated_at)
           VALUES ('n-1','p-1','笔记','','t','t')`
        ).run()
        const r = repo.searchSummaries({ sort: 'added_desc', offset: 0, limit: 50 })
        const p1 = r.items.find((i) => i.id === 'p-1')
        expect(p1?.tagNames).toEqual(['必读'])
        expect(p1?.collectionNames).toEqual(['第二时代'])
        expect(p1?.annotationCount).toBe(1)
        expect(p1?.noteCount).toBe(1)
      })

      it('tagId 过滤命中挂接文献', () => {
        db.prepare(`INSERT INTO tags (id, name) VALUES ('t-1','必读')`).run()
        db.prepare(`INSERT INTO paper_tags (paper_id, tag_id) VALUES ('p-2','t-1')`).run()
        const r = repo.searchSummaries({ tagId: 't-1', sort: 'added_desc', offset: 0, limit: 50 })
        expect(r.items.map((i) => i.id)).toEqual(['p-2'])
      })
    })

    it('listSummariesByIds：保持入参顺序', () => {
      repo.insert(row())
      repo.insert(row({ id: 'p-2', sha256: 'sha-bbb' }))
      const r = repo.listSummariesByIds(['p-2', 'p-1', 'ghost'])
      expect(r.map((i) => i.id)).toEqual(['p-2', 'p-1'])
    })

    it('detailById：聚合 tags/collections 明细与阅读字段', () => {
      repo.insert(row())
      db.prepare(`INSERT INTO tags (id, name) VALUES ('t-1','必读')`).run()
      db.prepare(`INSERT INTO paper_tags (paper_id, tag_id) VALUES ('p-1','t-1')`).run()
      const d = repo.detailById('p-1')
      expect(d?.tags).toEqual([{ id: 't-1', name: '必读' }])
      expect(d?.fileUrl).toBe('app-file://p-1')
      expect(d?.fileName).toBe('aaa.pdf')
      expect(d?.source).toBe('local')
      expect(repo.detailById('ghost')).toBeNull()
    })
  }
)
