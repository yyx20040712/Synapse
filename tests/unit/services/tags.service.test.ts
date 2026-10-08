import { expect, it, vi } from 'vitest'
import { createTagsService } from '../../../src/main/services/tags.service'
import type { Repos } from '../../../src/main/db/repos'
import { guardedDescribe } from '../../utils/guard'

/** 桩 repos（接口同步；用 vi.fn 便于断言调用） */
function stubRepos(over: Record<string, unknown> = {}): Repos {
  const tags = {
    listWithCounts: vi.fn(() => []),
    upsertByName: vi.fn((folderId: string, name: string) => ({ id: 't-1', name })),
    attach: vi.fn(),
    detach: vi.fn(),
    namesByPaper: vi.fn(() => []),
    findByName: vi.fn((): undefined => undefined),
    // [F-TAGS-02/DB-1 U4] attach 存在性预检源（默认缺席——命中场景按需覆写）
    findById: vi.fn((): undefined => undefined),
    // [R1/回炉轮1] attach 幂等判据=id 键（默认未挂）
    isAttached: vi.fn(() => false),
    ...over
  }
  return { tags } as unknown as Repos
}

guardedDescribe('SR-SVC-09', 'tags.service —— 薄透传', () => {
  it('list 透传 listWithCounts（[F-TAGS-02/DB-1 U4] 域参——folderId 透传）', async () => {
    const repos = stubRepos({
      listWithCounts: vi.fn(() => [{ id: 't', name: '必读', paperCount: 2, color: null }])
    })
    const svc = createTagsService({ repos })
    await expect(svc.list({ folderId: '__main__' })).resolves.toEqual([
      { id: 't', name: '必读', paperCount: 2, color: null }
    ])
    expect(repos.tags.listWithCounts).toHaveBeenCalledWith('__main__')
  })

  it('upsert 去空格后转调 repo（域参逐参——[F-TAGS-02/DB-1 U4] folderId 前置）', async () => {
    const repos = stubRepos()
    const svc = createTagsService({ repos })
    const tag = await svc.upsert({ folderId: '__main__', name: '  必读 ' })
    expect(tag.name).toBe('必读')
    expect(repos.tags.upsertByName).toHaveBeenCalledWith('__main__', '必读')
  })

  it('attach/detach 返回 { ok: true }（attach 预检经 findById——[F-TAGS-02/DB-1 U4]）', async () => {
    const svc = createTagsService({
      repos: stubRepos({
        findById: vi.fn(() => ({ id: 't', name: 'n', color: null, folderId: '__main__' }))
      })
    })
    await expect(svc.attach({ paperId: 'p', tagId: 't' })).resolves.toEqual({ ok: true })
    await expect(svc.detach({ paperId: 'p', tagId: 't' })).resolves.toEqual({ ok: true })
  })
})
