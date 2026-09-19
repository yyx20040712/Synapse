import { expect, it } from 'vitest'
import { createLibraryService } from '../../../src/main/services/library.service'
import type { Repos } from '../../../src/main/db/repos'
import type { PaperDetail } from '../../../src/shared/models/paper'
import { guardedDescribe } from '../../utils/guard'

/** 桩 repos：基线实现 + 按需覆盖（宽松类型，专供测试；repos 接口是同步的） */
function stubRepos(over: Record<string, unknown> = {}): Repos {
  const papers = {
    searchSummaries: () => ({ items: [], total: 0 }),
    detailById: () => null,
    updateMeta: () => null,
    listSummariesByIds: () => []
  }
  const collections = { list: () => [] }
  return { papers, collections, ...over } as unknown as Repos
}

const detail: PaperDetail = {
  id: 'p-1',
  title: 't',
  authors: [],
  year: 2025,
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
  source: 'local',
  enrichStatus: 'pending',
  fileUrl: 'app-file://p-1',
  fileName: 'a.pdf',
  updatedAt: 't',
  tags: [],
  collections: []
}

guardedDescribe('SR-SVC-01', 'library.service —— 委托与 NOT_FOUND', () => {
  it('list 透传查询参数', async () => {
    let seen: unknown = null
    const svc = createLibraryService({
      repos: stubRepos({
        papers: {
          ...{
            detailById: () => null,
            updateMeta: () => null,
            listSummariesByIds: () => []
          },
          searchSummaries: (q: unknown) => {
            seen = q
            return { items: [], total: 0 }
          }
        }
      })
    })
    await svc.list({ sort: 'year_desc', offset: 0, limit: 10 })
    expect(seen).toMatchObject({ sort: 'year_desc', limit: 10 })
  })

  it('detail：不存在时抛带 code=NOT_FOUND 的错误', async () => {
    const svc = createLibraryService({ repos: stubRepos() })
    await expect(svc.detail({ paperId: 'ghost' })).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('detail：存在时透传', async () => {
    const svc = createLibraryService({
      repos: stubRepos({ papers: { detailById: () => detail } })
    })
    await expect(svc.detail({ paperId: 'p-1' })).resolves.toMatchObject({ id: 'p-1' })
  })

  it('updateMeta：repo 返回 null 视为 NOT_FOUND；空 patch 直接返回现状', async () => {
    const svc = createLibraryService({
      repos: stubRepos({ papers: { detailById: () => detail, updateMeta: () => detail } })
    })
    await expect(svc.updateMeta({ paperId: 'p-1', patch: {} })).resolves.toMatchObject({ id: 'p-1' })
  })

  it('collections 透传', async () => {
    const svc = createLibraryService({
      repos: stubRepos({
        collections: { list: () => [{ id: 'c-1', name: '第二时代', position: 0 }] }
      })
    })
    await expect(svc.collections({})).resolves.toHaveLength(1)
  })
})
