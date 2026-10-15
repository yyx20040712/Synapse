/**
 * [F-DBCAMP-01 DB-4 / R3] tags.service attach 触发器域违约错误映射
 * （repos 桩——tags.service.test 同型）。
 *
 * 覆盖：019 paper_tags_domain_guard 触发器 ABORT（Error.message 含
 * 「paper_tags 挂接域违约」）→结构化 TagsDomainError（code=CONFLICT、message=
 * 「标签与文献不在同一文件夹域——无法挂接」）；其他 SqliteError 透传不折叠
 * （非域违约面=IO/约束类错误保留原样上抛）；映射后 APP_ERROR_CODES 词表零
 * 新增（CONFLICT 既有码复用——封闭枚举不动）。
 * always-active（不经 guardedDescribe）。
 */
import { describe, expect, it, vi } from 'vitest'
import { createTagsService } from '../../../src/main/services/tags.service'
import type { Repos } from '../../../src/main/db/repos'

/** 触发器原生错误（better-sqlite3 SqliteError 形态——message 携带 RAISE 文本） */
class FakeSqliteError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SqliteError'
  }
}

function makeRepos(attachImpl: () => void): { repos: Repos; ops: Record<string, ReturnType<typeof vi.fn>> } {
  const ops = {
    findById: vi.fn(() => ({ id: 't-1', name: '甲', color: null, folderId: 'f-a' })),
    listWithCounts: vi.fn(() => []),
    findByName: vi.fn(() => undefined),
    upsertByName: vi.fn(() => ({ id: 't-1', name: '甲', color: null, folderId: 'f-a' })),
    isAttached: vi.fn(() => false),
    namesByPaper: vi.fn(() => []),
    attach: vi.fn(attachImpl)
  }
  return { repos: { tags: ops } as unknown as Repos, ops: ops as unknown as Record<string, ReturnType<typeof vi.fn>> }
}

describe('F-DBCAMP-01 DB-4 / R3 tags.service attach 触发器域违约映射', () => {
  it('019 触发器 ABORT（message 含「paper_tags 挂接域违约」）→CONFLICT 结构化域错误', async () => {
    const { repos, ops } = makeRepos(() => {
      throw new FakeSqliteError(
        'insert into paper_tags — SQLITE_ERROR: paper_tags 挂接域违约：paper 与 tag 的 folder 不一致'
      )
    })
    const svc = createTagsService({ repos })
    await expect(svc.attach({ paperId: 'p-1', tagId: 't-1' })).rejects.toMatchObject({
      code: 'CONFLICT',
      message: '标签与文献不在同一文件夹域——无法挂接'
    })
    expect(ops.attach).toHaveBeenCalledTimes(1)
  })

  it('非域违约 SqliteError：透传原样（不折叠不吞——IO/其他约束面保留）', async () => {
    const raw = new FakeSqliteError('SQLITE_CONSTRAINT: UNIQUE constraint failed: paper_tags.tag_id')
    const { repos } = makeRepos(() => {
      throw raw
    })
    const svc = createTagsService({ repos })
    const err = await svc.attach({ paperId: 'p-1', tagId: 't-1' }).catch((e: unknown) => e)
    expect(err).toBe(raw)
  })

  it('正常路径零映射介入：attach 直落 ok（回归面）', async () => {
    const { repos } = makeRepos(() => undefined)
    const svc = createTagsService({ repos })
    await expect(svc.attach({ paperId: 'p-1', tagId: 't-1' })).resolves.toEqual({ ok: true })
  })
})
