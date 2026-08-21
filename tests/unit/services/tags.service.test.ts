import { expect, it, vi } from 'vitest'
import { createTagsService } from '../../../src/main/services/tags.service'
import type { Repos } from '../../../src/main/db/repos'
import { guardedDescribe } from '../../utils/guard'

/** 桩 repos（接口同步；用 vi.fn 便于断言调用） */
function stubRepos(over: Record<string, unknown> = {}): Repos {
  const tags = {
    listWithCounts: vi.fn(() => []),
    upsertByName: vi.fn((name: string) => ({ id: 't-1', name })),
    attach: vi.fn(),
    detach: vi.fn(),
    ...over
  }
  return { tags } as unknown as Repos
}

guardedDescribe('SR-SVC-09', 'tags.service —— 薄透传', () => {
  it('list 透传 listWithCounts', async () => {
    const repos = stubRepos({ listWithCounts: () => [{ id: 't', name: '必读', paperCount: 2 }] })
    const svc = createTagsService({ repos })
    await expect(svc.list({})).resolves.toEqual([{ id: 't', name: '必读', paperCount: 2 }])
  })

  it('upsert 去空格后转调 repo', async () => {
    const repos = stubRepos()
    const svc = createTagsService({ repos })
    const tag = await svc.upsert({ name: '  必读 ' })
    expect(tag.name).toBe('必读')
    expect(repos.tags.upsertByName).toHaveBeenCalledWith('必读')
  })

  it('attach/detach 返回 { ok: true }', async () => {
    const svc = createTagsService({ repos: stubRepos() })
    await expect(svc.attach({ paperId: 'p', tagId: 't' })).resolves.toEqual({ ok: true })
    await expect(svc.detach({ paperId: 'p', tagId: 't' })).resolves.toEqual({ ok: true })
  })
})
