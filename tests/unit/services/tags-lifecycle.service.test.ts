import { describe, expect, it, vi } from 'vitest'
import { createTagsService } from '../../../src/main/services/tags.service'
import type { Repos } from '../../../src/main/db/repos'

/**
 * [P7E-01] tags.service 生命周期三操作校验序全枚举（always-active）。
 *
 * 错误语义归 service（TagsDomainError：Error+code，NotesDomainError 同型）；
 * repo 持数据事实——全部经桩+spy 逐参断言。校验序按票面：rename=
 * trim 空→存在→冲突→幂等；merge=自身→源→目标；delete=存在。
 */

function stubRepos(over: Record<string, unknown> = {}): Repos {
  const tags = {
    listWithCounts: vi.fn(() => [{ id: 't-1', name: '甲', paperCount: 1 }]),
    upsertByName: vi.fn((name: string) => ({ id: 't-1', name })),
    attach: vi.fn(),
    detach: vi.fn(),
    namesByPaper: vi.fn(() => []),
    findByName: vi.fn((): undefined => undefined),
    renameTag: vi.fn(() => true),
    mergeTags: vi.fn(),
    deleteTag: vi.fn(),
    ...over
  }
  return { tags } as unknown as Repos
}

/** async 方法抛错=拒绝promise：捕获后断言 code/message 形状（域错误折叠契约） */
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

describe('P7E-01 tags.service —— rename 校验序', () => {
  it('trim 后空串 → INVALID_REQUEST「标签名不能为空」（zod min(1) 拦不住纯空格）', async () => {
    const repos = stubRepos()
    const svc = createTagsService({ repos })
    await expectDomainError(() => svc.rename({ tagId: 't-1', name: '   ' }), 'INVALID_REQUEST', '标签名不能为空')
    expect(repos.tags.renameTag).not.toHaveBeenCalled()
  })

  it('tagId 不存在 → NOT_FOUND「标签不存在」（校验序先于冲突预检）', async () => {
    const repos = stubRepos({ listWithCounts: vi.fn(() => []) })
    const svc = createTagsService({ repos })
    await expectDomainError(() => svc.rename({ tagId: 't-x', name: '新名' }), 'NOT_FOUND', '标签不存在')
    expect(repos.tags.renameTag).not.toHaveBeenCalled()
  })

  it('与其他标签同名 → CONFLICT「标签名已被占用」（不自动合并——数据语义变更须显式走 merge）', async () => {
    const repos = stubRepos({ findByName: vi.fn(() => ({ id: 't-2', name: '甲' })) })
    const svc = createTagsService({ repos })
    await expectDomainError(() => svc.rename({ tagId: 't-1', name: '甲' }), 'CONFLICT', '标签名已被占用')
    expect(repos.tags.renameTag).not.toHaveBeenCalled()
  })

  it('与自身现名相同 → 幂等成功返回该 Tag（changes=0 亦非错）', async () => {
    const repos = stubRepos({ findByName: vi.fn(() => ({ id: 't-1', name: '甲' })) })
    const svc = createTagsService({ repos })
    await expect(svc.rename({ tagId: 't-1', name: '甲' })).resolves.toEqual({ id: 't-1', name: '甲' })
    expect(repos.tags.renameTag).toHaveBeenCalledWith('t-1', '甲')
  })

  it('成功路径：trim 后透传 repo，返回更新后 Tag', async () => {
    const repos = stubRepos()
    const svc = createTagsService({ repos })
    await expect(svc.rename({ tagId: 't-1', name: '  新名 ' })).resolves.toEqual({ id: 't-1', name: '新名' })
    expect(repos.tags.renameTag).toHaveBeenCalledWith('t-1', '新名')
  })
})

describe('P7E-01 tags.service —— merge 校验序', () => {
  it('sourceId === targetId → INVALID_REQUEST「不能合并到自身」', async () => {
    const repos = stubRepos()
    const svc = createTagsService({ repos })
    await expectDomainError(() => svc.merge({ sourceId: 't-1', targetId: 't-1' }), 'INVALID_REQUEST', '不能合并到自身')
    expect(repos.tags.mergeTags).not.toHaveBeenCalled()
  })

  it('源不存在 → NOT_FOUND 且消息带源 id（先 source 后 target）', async () => {
    const repos = stubRepos({ listWithCounts: vi.fn(() => [{ id: 't-2', name: '乙', paperCount: 0 }]) })
    const svc = createTagsService({ repos })
    await expectDomainError(() => svc.merge({ sourceId: 't-x', targetId: 't-2' }), 'NOT_FOUND', 't-x')
    expect(repos.tags.mergeTags).not.toHaveBeenCalled()
  })

  it('目标不存在 → NOT_FOUND 且消息带目标 id', async () => {
    const repos = stubRepos()
    const svc = createTagsService({ repos })
    await expectDomainError(() => svc.merge({ sourceId: 't-1', targetId: 't-y' }), 'NOT_FOUND', 't-y')
    expect(repos.tags.mergeTags).not.toHaveBeenCalled()
  })

  it('成功 → { ok: true }；mergeTags(source, target) 逐参', async () => {
    const repos = stubRepos({
      listWithCounts: vi.fn(() => [
        { id: 't-1', name: '甲', paperCount: 1 },
        { id: 't-2', name: '乙', paperCount: 2 }
      ])
    })
    const svc = createTagsService({ repos })
    await expect(svc.merge({ sourceId: 't-1', targetId: 't-2' })).resolves.toEqual({ ok: true })
    expect(repos.tags.mergeTags).toHaveBeenCalledWith('t-1', 't-2')
  })
})

describe('P7E-01 tags.service —— delete', () => {
  it('不存在 → NOT_FOUND「标签不存在」（列表陈旧——他处已删）', async () => {
    const repos = stubRepos({ listWithCounts: vi.fn(() => []) })
    const svc = createTagsService({ repos })
    await expectDomainError(() => svc.delete({ tagId: 't-x' }), 'NOT_FOUND', '标签不存在')
    expect(repos.tags.deleteTag).not.toHaveBeenCalled()
  })

  it('成功 → { ok: true }；deleteTag(id) 逐参', async () => {
    const repos = stubRepos()
    const svc = createTagsService({ repos })
    await expect(svc.delete({ tagId: 't-1' })).resolves.toEqual({ ok: true })
    expect(repos.tags.deleteTag).toHaveBeenCalledWith('t-1')
  })
})
