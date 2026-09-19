import { expect, it } from 'vitest'
import { createReaderService } from '../../../src/main/services/reader.service'
import type { Repos } from '../../../src/main/db/repos'
import type { PaperDetail } from '../../../src/shared/models/paper'
import type { Annotation, AnnotationInput } from '../../../src/shared/models/annotation'
import { guardedDescribe } from '../../utils/guard'

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

const ann: Annotation = {
  id: 'a-1',
  paperId: 'p-1',
  page: 0,
  kind: 'highlight',
  color: 'yellow',
  quoteText: 'q',
  prefixText: '',
  suffixText: '',
  startOffset: 0,
  endOffset: 1,
  rects: [],
  comment: '',
  createdAt: 't',
  updatedAt: 't'
}

/** 桩 repos：宽松类型专供测试（repos 接口同步） */
function stubRepos(over: Record<string, unknown> = {}): Repos {
  const papers = {
    detailById: () => null,
    updateReadPage: () => undefined
  }
  const annotations = {
    insert: () => ann,
    update: () => null,
    delete: () => false,
    listByPaper: () => [ann]
  }
  return { papers, annotations, ...over } as unknown as Repos
}

guardedDescribe('SR-SVC-02', 'reader.service —— 打开与标注读写', () => {
  it('open：fileUrl 组装 app-file://<id>，fileName 取 fileRef 末段，页码带回', async () => {
    const svc = createReaderService({ repos: stubRepos({ papers: { detailById: () => detail } }) })
    const r = await svc.open({ paperId: 'p-1' })
    expect(r.fileUrl).toBe('app-file://p-1')
    expect(r.fileName).toBe('论文 v2 final.pdf')
    expect(r.lastReadPage).toBe(3)
  })

  it('open：不存在抛 NOT_FOUND', async () => {
    const svc = createReaderService({ repos: stubRepos() })
    await expect(svc.open({ paperId: 'ghost' })).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('saveAnnotation 转调 insert；update/delete/list 透传', async () => {
    const svc = createReaderService({ repos: stubRepos({ papers: { detailById: () => detail, updateReadPage: () => undefined } }) })
    const input: AnnotationInput = {
      page: 0,
      kind: 'highlight',
      color: 'yellow',
      quoteText: 'q',
      prefixText: '',
      suffixText: '',
      startOffset: 0,
      endOffset: 1,
      rects: [],
      comment: ''
    }
    await expect(svc.saveAnnotation({ paperId: 'p-1', annotation: input })).resolves.toMatchObject({ id: 'a-1' })
    await expect(svc.listAnnotations({ paperId: 'p-1' })).resolves.toHaveLength(1)
    await expect(svc.deleteAnnotation({ annotationId: 'a-1' })).resolves.toEqual({ ok: true })
    await expect(svc.saveProgress({ paperId: 'p-1', page: 5 })).resolves.toEqual({ ok: true })
  })
})

// ── 缺陷②回归（2026-08-27 用户视检，always-active——不经 guardedDescribe）──
// open 响应必须透传 title（PaperDetail.title）：renderer 标签页标题的单次请求
// 数据源（fileName 是 file_ref 内容寻址哈希基名不可读）
it('缺陷②：open 透传 title（detailById 的文献名直达 renderer）', async () => {
  const svc = createReaderService({ repos: stubRepos({ papers: { detailById: () => detail } }) })
  const r = await svc.open({ paperId: 'p-1' })
  expect(r.title).toBe('t')
})
