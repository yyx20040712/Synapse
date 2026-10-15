/**
 * [F-DBCAMP-01 DB-4 / 设计 §5.d②] library.service papers/delete 文件清理钩子
 * （repos 桩——folders.service.test 同型）。
 *
 * 覆盖：最后引用方删除→moveToTrash（fileRef 取删除前行）；共引存在（同 sha
 * 他行在场）→不动；moveToTrash 失败→删除仍成功非致命（console.warn 记录，
 * 广播照发）；fileStore 缺席（旧装配兼容）→零炸零调用。
 * always-active（不经 guardedDescribe）。
 */
import { describe, expect, it, vi, afterEach } from 'vitest'
import { createPapersService } from '../../../src/main/services/library.service'
import type { PaperRow } from '../../../src/main/db/repos/papers.repo'
import type { Repos } from '../../../src/main/db/repos'

function paperRow(over: Partial<PaperRow> = {}): PaperRow {
  return {
    id: over.id ?? 'p-1',
    file_ref: over.file_ref ?? 'ab/cd/aaa.pdf',
    sha256: over.sha256 ?? 'sha-aaa',
    title: '题',
    authors_json: '[]',
    year: 2025,
    venue: '刊',
    doi: null,
    arxiv_id: null,
    abstract: '',
    source: 'local',
    enrich_status: 'pending',
    added_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    last_read_page: 0
  }
}

function makeRepos(opts: { removed: boolean; count: number }): {
  repos: Repos
  ops: Record<string, ReturnType<typeof vi.fn>>
} {
  const ops = {
    findById: vi.fn(() => paperRow()),
    remove: vi.fn(() => opts.removed),
    countBySha256: vi.fn(() => opts.count)
  }
  const withTransaction = vi.fn((fn: () => boolean) => fn())
  return { repos: { papers: ops, withTransaction } as unknown as Repos, ops: { ...ops, withTransaction } }
}

function makeService(repos: Repos, fileStore?: { moveToTrash: (f: string) => Promise<void> }) {
  const sendFoldersChanged = vi.fn()
  const sendLineageChanged = vi.fn()
  const svc = createPapersService({
    repos,
    fileStore,
    sendFoldersChanged,
    sendLineageChanged
  })
  return { svc, sendFoldersChanged, sendLineageChanged }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('F-DBCAMP-01 DB-4 papers/delete 文件清理钩子', () => {
  it('最后引用方：removed 成功且 countBySha256=0 → moveToTrash（fileRef=删除前行）', async () => {
    const { repos, ops } = makeRepos({ removed: true, count: 0 })
    const moveToTrash = vi.fn(async () => undefined)
    const { svc } = makeService(repos, { moveToTrash })
    const r = await svc.delete({ paperId: 'p-1' })
    expect(r.ok).toBe(true)
    expect(moveToTrash).toHaveBeenCalledTimes(1)
    expect(moveToTrash).toHaveBeenCalledWith('ab/cd/aaa.pdf')
    expect(ops.countBySha256).toHaveBeenCalledWith('sha-aaa')
  })

  it('共引存在：countBySha256>0 → 不隔离', async () => {
    const { repos } = makeRepos({ removed: true, count: 2 })
    const moveToTrash = vi.fn(async () => undefined)
    const { svc } = makeService(repos, { moveToTrash })
    await svc.delete({ paperId: 'p-1' })
    expect(moveToTrash).not.toHaveBeenCalled()
  })

  it('隔离失败非致命：删除仍成功+双播照发+console.warn 记录', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const { repos } = makeRepos({ removed: true, count: 0 })
    const moveToTrash = vi.fn(async () => {
      throw new Error('磁盘只读')
    })
    const { svc, sendFoldersChanged, sendLineageChanged } = makeService(repos, { moveToTrash })
    const r = await svc.delete({ paperId: 'p-1' })
    expect(r.ok).toBe(true)
    expect(sendFoldersChanged).toHaveBeenCalledTimes(1)
    expect(sendLineageChanged).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toContain('ab/cd/aaa.pdf')
  })

  it('fileStore 缺席（旧装配兼容）：零炸零调用', async () => {
    const { repos } = makeRepos({ removed: true, count: 0 })
    const { svc } = makeService(repos, undefined)
    const r = await svc.delete({ paperId: 'p-1' })
    expect(r.ok).toBe(true)
  })

  it('幽灵 id：NOT_FOUND 且零事务零隔离', async () => {
    const ops = {
      findById: vi.fn(() => null),
      remove: vi.fn(() => true),
      countBySha256: vi.fn(() => 0)
    }
    const withTransaction = vi.fn((fn: () => boolean) => fn())
    const repos = { papers: ops, withTransaction } as unknown as Repos
    const moveToTrash = vi.fn(async () => undefined)
    const { svc } = makeService(repos, { moveToTrash })
    await expect(svc.delete({ paperId: 'ghost' })).rejects.toThrow('文献不存在')
    expect(moveToTrash).not.toHaveBeenCalled()
    expect(withTransaction).not.toHaveBeenCalled()
  })
})
