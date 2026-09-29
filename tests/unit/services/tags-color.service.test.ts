import { describe, expect, it, vi } from 'vitest'
import { createTagsService } from '../../../src/main/services/tags.service'
import type { Repos } from '../../../src/main/db/repos'

/**
 * [F-TAGS-01] tags.service setColor（always-active）。
 *
 * 校验序：正规化（hex 小写化——IPC 面 zod 已限小写 pattern，service 防御
 * 同口径不双标）→ 格式校验（INVALID_REQUEST）→ 存在性预检（NOT_FOUND——
 * listWithCounts 同 rename/delete 先例）→ repo.setColor 逐参 → 返回更新后
 * Tag（wire 真相=color 必携）。null passthrough=恢复默认路。
 */

function stubRepos(over: Record<string, unknown> = {}): Repos {
  const tags = {
    listWithCounts: vi.fn(() => [{ id: 't-1', name: '甲', paperCount: 1, color: null }]),
    upsertByName: vi.fn((name: string) => ({ id: 't-1', name, color: null })),
    attach: vi.fn(),
    detach: vi.fn(),
    namesByPaper: vi.fn(() => []),
    findByName: vi.fn((): undefined => undefined),
    renameTag: vi.fn(() => true),
    mergeTags: vi.fn(),
    deleteTag: vi.fn(),
    setColor: vi.fn(() => true),
    ...over
  }
  return { tags } as unknown as Repos
}

async function expectDomainError(
  run: () => Promise<unknown>,
  code: string,
  msgPart?: string
): Promise<void> {
  try {
    await run()
    expect.unreachable('应抛域错误')
  } catch (e) {
    expect(e, '域错误是 Error 子类').toBeInstanceOf(Error)
    expect((e as { code?: string }).code, `错误码应为 ${code}`).toBe(code)
    if (msgPart !== undefined) expect((e as Error).message).toContain(msgPart)
  }
}

describe('F-TAGS-01 tags.service —— setColor 校验序', () => {
  it('正规化：hex 小写化后透传 repo，返回 {id,name,color} 更新后 Tag', async () => {
    const repos = stubRepos()
    const svc = createTagsService({ repos })
    const tag = await svc.setColor({ tagId: 't-1', color: '#FFAA00' })
    expect(repos.tags.setColor).toHaveBeenCalledWith('t-1', '#ffaa00')
    expect(tag).toEqual({ id: 't-1', name: '甲', color: '#ffaa00' })
  })

  it('null passthrough：恢复默认路——repo 收 null，返回 color=null', async () => {
    const repos = stubRepos()
    const svc = createTagsService({ repos })
    const tag = await svc.setColor({ tagId: 't-1', color: null })
    expect(repos.tags.setColor).toHaveBeenCalledWith('t-1', null)
    expect(tag).toEqual({ id: 't-1', name: '甲', color: null })
  })

  it('格式非法（service 直调防御路——IPC 面 zod 先拦）：INVALID_REQUEST 且 repo 未调', async () => {
    const repos = stubRepos()
    const svc = createTagsService({ repos })
    await expectDomainError(() => svc.setColor({ tagId: 't-1', color: '#12345' }), 'INVALID_REQUEST')
    expect(repos.tags.setColor).not.toHaveBeenCalled()
  })

  it('tagId 不存在 → NOT_FOUND「标签不存在」且 repo 未调（列表陈旧——rename/delete 同序）', async () => {
    const repos = stubRepos({ listWithCounts: vi.fn(() => []) })
    const svc = createTagsService({ repos })
    await expectDomainError(() => svc.setColor({ tagId: 't-x', color: '#e11d48' }), 'NOT_FOUND', '标签不存在')
    expect(repos.tags.setColor).not.toHaveBeenCalled()
  })
})
