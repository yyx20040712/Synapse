/**
 * [F-DBCAMP-01 DB-4 / 设计 §5.d②] folders.service delete 文件清理钩子
 * （repos 桩——folders.service.test 同型）。
 *
 * 覆盖：域删级联后逐 sha 隔离（tx 内收集、tx 提交后执行）；同 sha 去重单次；
 * 跨夹共引（countBySha256>0）不隔离；隔离失败非致命（删除成功+双播）；空夹
 * →零隔离调用。
 * always-active（不经 guardedDescribe）。
 */
import { describe, expect, it, vi, afterEach } from 'vitest'
import { createFoldersService } from '../../../src/main/services/folders.service'
import type { Folder } from '../../../src/shared/models/folder'
import type { Repos } from '../../../src/main/db/repos'

function makeRepos(opts: {
  paperIds: string[]
  shas: Array<{ sha256: string; fileRef: string }>
  count: (sha: string) => number
}): { repos: Repos; ops: Record<string, ReturnType<typeof vi.fn>> } {
  const f = (id: string): Folder => ({ id, name: '图', position: 0, paperCount: 0 })
  const ops = {
    listWithCounts: vi.fn(() => [f('f-1')]),
    findByName: vi.fn(() => null),
    findById: vi.fn(() => f('f-1')),
    create: vi.fn(),
    rename: vi.fn(),
    remove: vi.fn(() => 1)
  }
  const paperOps = {
    listIdsByFolder: vi.fn(() => opts.paperIds),
    remove: vi.fn(() => true),
    listFileRefsByFolder: vi.fn(() => opts.shas),
    countBySha256: vi.fn((sha: string) => opts.count(sha))
  }
  return {
    repos: {
      folders: ops,
      papers: paperOps,
      withTransaction: vi.fn(<T>(fn: () => T): T => fn())
    } as unknown as Repos,
    ops: { ...ops, ...paperOps } as unknown as Record<string, ReturnType<typeof vi.fn>>
  }
}

function makeService(repos: Repos, fileStore?: { moveToTrash: (f: string) => Promise<void> }) {
  const sendFoldersChanged = vi.fn()
  const sendLineageChanged = vi.fn()
  const svc = createFoldersService({
    repos,
    lineagePending: () => false,
    sendFoldersChanged,
    sendLineageChanged,
    fileStore
  })
  return { svc, sendFoldersChanged, sendLineageChanged }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('F-DBCAMP-01 DB-4 folders/delete 文件清理钩子', () => {
  it('域删：tx 提交后逐 sha 隔离（fileRef 来自域读法）', async () => {
    const { repos } = makeRepos({
      paperIds: ['p-1', 'p-2'],
      shas: [
        { sha256: 'sha-1', fileRef: 'aa/bb/1.pdf' },
        { sha256: 'sha-2', fileRef: 'cc/dd/2.pdf' }
      ],
      count: () => 0
    })
    const moveToTrash = vi.fn(async (_fileRef: string) => undefined)
    const { svc } = makeService(repos, { moveToTrash })
    const r = await svc.delete({ id: 'f-1' })
    expect(r.ok).toBe(true)
    expect(moveToTrash.mock.calls.map((c) => c[0]).sort()).toEqual(['aa/bb/1.pdf', 'cc/dd/2.pdf'])
  })

  it('同 sha 两篇：去重单次隔离', async () => {
    const { repos } = makeRepos({
      paperIds: ['p-1', 'p-2'],
      shas: [
        { sha256: 'sha-x', fileRef: 'aa/bb/x.pdf' },
        { sha256: 'sha-x', fileRef: 'aa/bb/x.pdf' }
      ],
      count: () => 0
    })
    const moveToTrash = vi.fn(async (_fileRef: string) => undefined)
    const { svc } = makeService(repos, { moveToTrash })
    await svc.delete({ id: 'f-1' })
    expect(moveToTrash).toHaveBeenCalledTimes(1)
  })

  it('跨夹共引：countBySha256>0 不隔离（夹 B 行仍在）', async () => {
    const { repos, ops } = makeRepos({
      paperIds: ['p-1'],
      shas: [{ sha256: 'sha-x', fileRef: 'aa/bb/x.pdf' }],
      count: (sha) => (sha === 'sha-x' ? 1 : 0)
    })
    const moveToTrash = vi.fn(async (_fileRef: string) => undefined)
    const { svc } = makeService(repos, { moveToTrash })
    await svc.delete({ id: 'f-1' })
    expect(ops.countBySha256).toHaveBeenCalledWith('sha-x')
    expect(moveToTrash).not.toHaveBeenCalled()
  })

  it('隔离失败非致命：删除成功+双播照发+console.warn', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const { repos } = makeRepos({
      paperIds: ['p-1'],
      shas: [{ sha256: 'sha-1', fileRef: 'aa/bb/1.pdf' }],
      count: () => 0
    })
    const moveToTrash = vi.fn(async (_fileRef: string) => {
      throw new Error('IO')
    })
    const { svc, sendFoldersChanged, sendLineageChanged } = makeService(repos, { moveToTrash })
    const r = await svc.delete({ id: 'f-1' })
    expect(r.ok).toBe(true)
    expect(sendFoldersChanged).toHaveBeenCalledTimes(1)
    expect(sendLineageChanged).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalled()
  })

  it('空夹：零隔离调用', async () => {
    const { repos } = makeRepos({ paperIds: [], shas: [], count: () => 0 })
    const moveToTrash = vi.fn(async (_fileRef: string) => undefined)
    const { svc } = makeService(repos, { moveToTrash })
    await svc.delete({ id: 'f-1' })
    expect(moveToTrash).not.toHaveBeenCalled()
  })
})
