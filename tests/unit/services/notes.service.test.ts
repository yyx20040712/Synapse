import { expect, it } from 'vitest'
import { createNotesService } from '../../../src/main/services/notes.service'
import type { Repos } from '../../../src/main/db/repos'
import type { Note } from '../../../src/shared/models/note'
import { guardedDescribe } from '../../utils/guard'

const note: Note = {
  id: 'n-1',
  paperId: 'p-1',
  title: '标题',
  contentMd: '内容',
  createdAt: 't',
  updatedAt: 't'
}

/** 桩 repos（repos 接口同步；service 层是 async） */
function stubRepos(over: Record<string, Record<string, unknown>> = {}): Repos {
  const notes = {
    findByPaper: () => null,
    upsert: () => note,
    delete: () => true,
    ...(over.notes ?? {})
  }
  const papers = {
    findById: () => ({ id: 'p-1' }),
    ...(over.papers ?? {})
  }
  return { notes, papers } as unknown as Repos
}

guardedDescribe('SR-SVC-10', 'notes.service —— get/save/remove', () => {
  it('get：无笔记返回 null（合法态）', async () => {
    const svc = createNotesService({ repos: stubRepos() })
    await expect(svc.get({ paperId: 'p-1' })).resolves.toBeNull()
  })

  it('save：文献不存在抛 NOT_FOUND；存在则 upsert', async () => {
    const repos = stubRepos({ papers: { findById: () => null } })
    const svc = createNotesService({ repos })
    await expect(svc.save({ paperId: 'ghost', title: '', contentMd: '' })).rejects.toMatchObject({
      code: 'NOT_FOUND'
    })

    const okSvc = createNotesService({ repos: stubRepos() })
    await expect(okSvc.save({ paperId: 'p-1', title: '标题', contentMd: '内容' })).resolves.toMatchObject({
      id: 'n-1'
    })
  })

  it('remove：repo 删除失败抛 NOT_FOUND', async () => {
    const svc = createNotesService({ repos: stubRepos({ notes: { delete: () => false } }) })
    await expect(svc.remove({ noteId: 'ghost' })).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})
