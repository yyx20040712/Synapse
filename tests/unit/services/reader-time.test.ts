import { expect, it } from 'vitest'
import { createReaderService } from '../../../src/main/services/reader.service'
import type { Repos } from '../../../src/main/db/repos'
import type { PaperDetail } from '../../../src/shared/models/paper'

/**
 * P7E-05：reader.service saveProgress secondsDelta 透传锁定测试（新文件——
 * reader.service.test 受锁零改）。覆盖：透传第三参到 updateReadPage+R8 缺省 0。
 * always-active（不经 guardedDescribe）。
 */
const detail: PaperDetail = {
  id: 'p-1',
  title: 't',
  authors: [],
  year: null,
  venue: '',
  doi: null,
  tagNames: [],
  collectionNames: [],
  annotationCount: 0,
  noteCount: 0,
  lastReadPage: 3,
  readingSeconds: 0,
  addedAt: 't',
  abstract: '',
  arxivId: null,
  source: 'local',
  enrichStatus: 'pending',
  fileUrl: 'app-file://p-1',
  fileName: '论文 v2 final.pdf',
  updatedAt: 't',
  tags: [],
  collections: []
}

/** 桩 repos：宽松类型专供测试（repos 接口同步；updateReadPage 记参） */
function stubRepos(calls: Array<[string, number, number]>): Repos {
  const papers = {
    detailById: () => detail,
    updateReadPage: (id: string, page: number, secondsDelta: number): void => {
      calls.push([id, page, secondsDelta])
    }
  }
  return { papers, annotations: {} } as unknown as Repos
}

it('saveProgress 透传 secondsDelta 第三参到 updateReadPage（时长搭车单通道）', async () => {
  const calls: Array<[string, number, number]> = []
  const svc = createReaderService({ repos: stubRepos(calls) })
  await expect(
    svc.saveProgress({ paperId: 'p-1', page: 5, secondsDelta: 45 })
  ).resolves.toEqual({ ok: true })
  expect(calls).toEqual([['p-1', 5, 45]])
})

it('R8：secondsDelta 缺省→第三参 0（旧调用方零破坏）', async () => {
  const calls: Array<[string, number, number]> = []
  const svc = createReaderService({ repos: stubRepos(calls) })
  await expect(svc.saveProgress({ paperId: 'p-1', page: 2 })).resolves.toEqual({ ok: true })
  expect(calls).toEqual([['p-1', 2, 0]])
})
