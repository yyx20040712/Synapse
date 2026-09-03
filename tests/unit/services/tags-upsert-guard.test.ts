import { describe, expect, it, vi } from 'vitest'
import { createTagsService } from '../../../src/main/services/tags.service'
import type { Repos } from '../../../src/main/db/repos'

/**
 * [B7] tags.service upsert 纯空格名空判守卫（AUDIT-B W1 修票，always-active）。
 *
 * 探针实锤（scripts/audits/auditb-b7.js 真库 IPC）：upsert('   ') → ok 应答+
 * DB name='' 行入库+list 浮出。守卫对齐同文件 rename 面先例（trim 空 →
 * INVALID_REQUEST「标签名不能为空」）。
 */

function stubRepos(): Repos {
  return {
    tags: {
      listWithCounts: vi.fn(() => []),
      upsertByName: vi.fn((name: string) => ({ id: 't-1', name })),
      attach: vi.fn(),
      detach: vi.fn(),
      namesByPaper: vi.fn(() => []),
      findByName: vi.fn((): undefined => undefined),
      renameTag: vi.fn(() => true),
      mergeTags: vi.fn(),
      deleteTag: vi.fn()
    }
  } as unknown as Repos
}

describe('B7 tags.service upsert —— 纯空格名空判守卫', () => {
  it('纯空格名 → INVALID_REQUEST「标签名不能为空」（repo 零调用）', async () => {
    const repos = stubRepos()
    const svc = createTagsService({ repos })
    await expect(svc.upsert({ name: '   ' })).rejects.toMatchObject({
      code: 'INVALID_REQUEST',
      message: '标签名不能为空'
    })
    expect(repos.tags.upsertByName).not.toHaveBeenCalled()
  })

  it('正常名透传 upsertByName（trim 后）', async () => {
    const repos = stubRepos()
    const svc = createTagsService({ repos })
    await expect(svc.upsert({ name: ' 必读 ' })).resolves.toEqual({ id: 't-1', name: '必读' })
    expect(repos.tags.upsertByName).toHaveBeenCalledWith('必读')
  })

  it('制表符混空白名同样拒绝（trim 覆盖 \t\n）', async () => {
    const repos = stubRepos()
    const svc = createTagsService({ repos })
    await expect(svc.upsert({ name: '\t\n ' })).rejects.toMatchObject({
      code: 'INVALID_REQUEST'
    })
    expect(repos.tags.upsertByName).not.toHaveBeenCalled()
  })
})
