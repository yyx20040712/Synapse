import { expect, it } from 'vitest'
import { createEnrichService } from '../../../src/main/services/enrich/enrich.service'
import type { Repos, PaperRow } from '../../../src/main/db/repos'
import type { PaperDetail } from '../../../src/shared/models/paper'
import type { EnrichedWork, CrossrefProvider } from '../../../src/main/services/enrich/providers/crossref'
import type { OpenalexProvider } from '../../../src/main/services/enrich/providers/openalex'
import type { ArxivProvider } from '../../../src/main/services/enrich/providers/arxiv'
import { guardedDescribe } from '../../utils/guard'

const work: EnrichedWork = {
  title: 'Enriched Title',
  authors: ['Alice', 'Bob'],
  year: 2024,
  venue: 'Water Research',
  doi: '10.1/x',
  abstract: 'Abstract text'
}

function detailRow(over: Partial<PaperRow> = {}): PaperRow {
  return {
    id: 'p-1',
    file_ref: 'a/b/x.pdf',
    sha256: 'sha',
    title: over.title ?? '原始标题',
    authors_json: over.authors_json ?? '[]',
    year: over.year ?? null,
    venue: over.venue ?? '',
    doi: over.doi ?? null,
    arxiv_id: over.arxiv_id ?? null,
    abstract: over.abstract ?? '',
    source: over.source ?? 'local',
    enrich_status: over.enrich_status ?? 'pending',
    added_at: 't',
    updated_at: 't',
    last_read_page: 0
  }
}

const detail: PaperDetail = {
  id: 'p-1',
  title: '最新详情',
  authors: [],
  year: null,
  venue: '',
  doi: null,
  tagNames: [],
  collectionNames: [],
  annotationCount: 0,
  noteCount: 0,
  lastReadPage: 0,
  addedAt: 't',
  abstract: '',
  arxivId: null,
  source: 'crossref',
  enrichStatus: 'done',
  fileUrl: 'app-file://p-1',
  fileName: 'x.pdf',
  updatedAt: 't',
  tags: [],
  collections: []
}

function makeRepos(row: PaperRow | null, over: Partial<Repos['papers']> = {}): Repos {
  return {
    papers: {
      detailById: () => row ? detail : null,
      findById: () => row,
      applyEnrichment: () => row,
      ...over
    } as Repos['papers'],
    annotations: {} as Repos['annotations'],
    notes: {} as Repos['notes'],
    tags: {} as Repos['tags'],
    collections: {} as Repos['collections'],
    // enrich 不涉多表写入：事务桩用直通（接口新增必需成员的适配）
    withTransaction: <T>(fn: () => T): T => fn()
  }
}

function makeProviders(over: {
  crossref?: Partial<CrossrefProvider>
  openalex?: Partial<OpenalexProvider>
  arxiv?: Partial<ArxivProvider>
} = {}): { crossref: CrossrefProvider; openalex: OpenalexProvider; arxiv: ArxivProvider } {
  return {
    crossref: {
      byDoi: async () => null,
      byTitle: async () => null,
      ...over.crossref
    },
    openalex: { byTitle: async () => null, ...over.openalex },
    arxiv: { byId: async () => null, ...over.arxiv }
  }
}

guardedDescribe('SR-SVC-05', 'enrich.service —— 增强编排', () => {
  it('有 DOI 且 CrossRef 命中：source=crossref，enrich_status=done', async () => {
    let applied: unknown = null
    const svc = createEnrichService({
      repos: makeRepos(detailRow({ doi: '10.1/x' }), {
        applyEnrichment: (_id, e) => {
          applied = e
          return detailRow()
        },
        detailById: () => detail
      }),
      providers: makeProviders({ crossref: { byDoi: async () => work } }),
      contactEmail: () => 'a@b.c'
    })
    await expect(svc.enrichPaper('p-1')).resolves.toMatchObject({ enrichStatus: 'done' })
    expect(applied).toMatchObject({ source: 'crossref', enrichStatus: 'done' })
  })

  it('DOI 未命中 → OpenAlex 标题兜底', async () => {
    let applied: unknown = null
    const svc = createEnrichService({
      repos: makeRepos(detailRow({ doi: '10.1/x', title: '原始标题' }), {
        applyEnrichment: (_id, e) => {
          applied = e
          return detailRow()
        },
        detailById: () => detail
      }),
      providers: makeProviders({
        crossref: { byDoi: async () => null },
        openalex: { byTitle: async () => ({ ...work, arxivId: null }) }
      }),
      contactEmail: () => 'a@b.c'
    })
    await svc.enrichPaper('p-1')
    expect(applied).toMatchObject({ source: 'openalex' })
  })

  it('全部未命中：enrich_status=failed，仍返回详情', async () => {
    let applied: unknown = null
    const svc = createEnrichService({
      repos: makeRepos(detailRow(), {
        applyEnrichment: (_id, e) => {
          applied = e
          return detailRow()
        },
        detailById: () => ({ ...detail, enrichStatus: 'failed' })
      }),
      providers: makeProviders(),
      contactEmail: () => 'a@b.c'
    })
    const r = await svc.enrichPaper('p-1')
    expect(r.enrichStatus).toBe('failed')
    expect(applied).toMatchObject({ enrichStatus: 'failed' })
  })

  it('上游抛错（网络）不向上传播：按 failed 回写', async () => {
    let applied: unknown = null
    const svc = createEnrichService({
      repos: makeRepos(detailRow({ doi: '10.1/x' }), {
        applyEnrichment: (_id, e) => {
          applied = e
          return detailRow()
        },
        detailById: () => ({ ...detail, enrichStatus: 'failed' })
      }),
      providers: makeProviders({
        crossref: {
          byDoi: async () => {
            throw new Error('network down')
          }
        }
      }),
      contactEmail: () => 'a@b.c'
    })
    await expect(svc.enrichPaper('p-1')).resolves.toMatchObject({ enrichStatus: 'failed' })
    expect(applied).toMatchObject({ enrichStatus: 'failed' })
  })

  it('文献不存在抛 NOT_FOUND', async () => {
    const svc = createEnrichService({
      repos: makeRepos(null),
      providers: makeProviders(),
      contactEmail: () => 'a@b.c'
    })
    await expect(svc.enrichPaper('ghost')).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})
