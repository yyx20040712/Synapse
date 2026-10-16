/**
 * [F-IMPORTGATE-01] import↔delete 互斥接线（INV-133 TOCTOU 边界清偿）。
 *
 * 覆盖：
 * - gate kind 计数（import/delete 分计）：delete 持有=inFlight+deleteInFlight
 *   而 importInFlight 恒 false；并发双 import 2→1→0 中间态语义保持
 *   （import-gate.test 锁定锚的 kind 化扩展——单计数对称拒会误拒并发双
 *   import/双 delete，分计才两全）。
 * - D-1 双侧 BUSY 对称拒：import in-flight→papers/folders delete 入口
 *   CONFLICT 中文拒（零库副作用）；delete in-flight→import.service 两入口
 *   （importFiles/importFolder）同拒。
 * - TOCTOU 窗闭合×2（papers/folders 各一）：moveToTrash 挂起窗（COUNT 判定后、
 *   移动完成前）内并发 import 应被 BUSY 拒。
 * - 行为零变锚：无 import 时并发双 delete 照常放行（delete 不建行=互删无
 *   TOCTOU 危害面；票面硬条款「非互斥路径行为与现状逐位一致」）。
 * - D-2 finally 配对：域错误上抛路径（removed=false/主图禁删/幽灵夹）与
 *   隔离失败非致命路径后 inFlight() 归零。
 * always-active（不经 guardedDescribe）。
 */
import { describe, expect, it, vi, afterEach } from 'vitest'
import { createImportGate } from '../../../src/main/import-gate'
import type { ImportGate } from '../../../src/main/import-gate'
import { createPapersService } from '../../../src/main/services/library.service'
import { createFoldersService } from '../../../src/main/services/folders.service'
import { createImportService } from '../../../src/main/services/import_/import.service'
import type { FileStore } from '../../../src/main/services/import_/file-store'
import { MAIN_GRAPH_ID } from '../../../src/shared/models/lineage'
import type { Folder } from '../../../src/shared/models/folder'
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

function makePapersRepos(opts: {
  found?: PaperRow | null
  removed?: boolean
  count?: number
}): { repos: Repos; ops: Record<string, ReturnType<typeof vi.fn>> } {
  const ops = {
    findById: vi.fn(() => opts.found ?? paperRow()),
    remove: vi.fn(() => opts.removed ?? true),
    countBySha256: vi.fn(() => opts.count ?? 0)
  }
  const withTransaction = vi.fn(<T>(fn: () => T): T => fn())
  return {
    repos: { papers: ops, withTransaction } as unknown as Repos,
    ops: { ...ops, withTransaction }
  }
}

function makeFoldersRepos(opts: {
  folderExists?: boolean
  paperIds?: string[]
  shas?: Array<{ sha256: string; fileRef: string }>
  count?: (sha: string) => number
}): { repos: Repos; ops: Record<string, ReturnType<typeof vi.fn>> } {
  const f = (id: string): Folder => ({ id, name: '图', position: 0, paperCount: 0 })
  const foldersOps = {
    listWithCounts: vi.fn(() => [f('f-1')]),
    findByName: vi.fn(() => null),
    findById: vi.fn(() => (opts.folderExists === false ? null : f('f-1'))),
    create: vi.fn(),
    rename: vi.fn(),
    remove: vi.fn(() => 1)
  }
  const paperOps = {
    listIdsByFolder: vi.fn(() => opts.paperIds ?? ['p-1']),
    remove: vi.fn(() => true),
    listFileRefsByFolder: vi.fn(() => opts.shas ?? [{ sha256: 'sha-1', fileRef: 'aa/bb/1.pdf' }]),
    countBySha256: vi.fn((sha: string) => opts.count?.(sha) ?? 0)
  }
  return {
    repos: {
      folders: foldersOps,
      papers: paperOps,
      withTransaction: vi.fn(<T>(fn: () => T): T => fn())
    } as unknown as Repos,
    ops: { ...foldersOps, ...paperOps } as unknown as Record<string, ReturnType<typeof vi.fn>>
  }
}

function makePapersService(
  repos: Repos,
  fileStore: { moveToTrash: (f: string) => Promise<void> } | undefined,
  gate: ImportGate
) {
  const sendFoldersChanged = vi.fn()
  const sendLineageChanged = vi.fn()
  const svc = createPapersService({
    repos,
    fileStore,
    sendFoldersChanged,
    sendLineageChanged,
    importGate: gate
  })
  return { svc, sendFoldersChanged, sendLineageChanged }
}

function makeFoldersService(
  repos: Repos,
  fileStore: { moveToTrash: (f: string) => Promise<void> } | undefined,
  gate: ImportGate
) {
  const sendFoldersChanged = vi.fn()
  const sendLineageChanged = vi.fn()
  const svc = createFoldersService({
    repos,
    lineagePending: () => false,
    sendFoldersChanged,
    sendLineageChanged,
    fileStore,
    importGate: gate
  })
  return { svc, sendFoldersChanged, sendLineageChanged }
}

/** 挂起式隔离桩：moveToTrash 调用即挂起（TOCTOU 窗=COUNT 判定后、移动完成前），
 *  release 才放行——挂起窗内可注入并发方 */
function hangingMoveToTrash(): {
  moveToTrash: (fileRef: string) => Promise<void> & ReturnType<typeof vi.fn>
  release: () => void
} {
  let release!: () => void
  const p = new Promise<void>((resolve) => {
    release = resolve
  })
  const moveToTrash = vi.fn(() => p)
  return { moveToTrash: moveToTrash as unknown as (fileRef: string) => Promise<void> & ReturnType<typeof vi.fn>, release }
}

/** import.service 装配（入口拒绝面专用——拒路径零触达，桩兜底抛错=若实现
 *  越过拒绝面即测试红） */
function makeImportService(gate: ImportGate) {
  return createImportService({
    repos: { papers: {}, withTransaction: () => undefined } as unknown as Repos,
    fileStore: {} as unknown as FileStore,
    extractMeta: async () => {
      throw new Error('拒绝路径不应触达元数据抽取')
    },
    gate
  })
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('F-IMPORTGATE-01 import↔delete 互斥（INV-133 TOCTOU 窗闭合）', () => {
  describe('gate kind 计数（import/delete 分计）', () => {
    it('delete 持有：inFlight+deleteInFlight 为真、importInFlight 恒 false；exit 归零', () => {
      const gate = createImportGate()
      gate.enter('delete')
      expect(gate.inFlight()).toBe(true)
      expect(gate.deleteInFlight()).toBe(true)
      expect(gate.importInFlight()).toBe(false)
      gate.exit('delete')
      expect(gate.inFlight()).toBe(false)
      expect(gate.deleteInFlight()).toBe(false)
    })

    it('并发双 import 语义保持：enter()×2 → 2→1→0 中间态不误释（锁定锚 kind 化零变）', () => {
      const gate = createImportGate()
      gate.enter()
      gate.enter()
      expect(gate.importInFlight()).toBe(true)
      expect(gate.deleteInFlight()).toBe(false)
      expect(gate.inFlight()).toBe(true)
      gate.exit()
      expect(gate.importInFlight()).toBe(true) // 2→1：次个未完不误释
      gate.exit()
      expect(gate.importInFlight()).toBe(false)
      expect(gate.inFlight()).toBe(false)
    })
  })

  describe('D-1 双侧 BUSY 对称拒', () => {
    it('import in-flight：papers.delete 入口 CONFLICT 中文拒+零库副作用+不占 delete 计数', async () => {
      const gate = createImportGate()
      const { repos, ops } = makePapersRepos({})
      const { svc } = makePapersService(repos, { moveToTrash: vi.fn(async () => undefined) }, gate)
      gate.enter()
      const err = await svc.delete({ paperId: 'p-1' }).then(
        () => {
          throw new Error('应被拒绝')
        },
        (e: unknown) => e as { code?: string; message?: string }
      )
      expect(err.code).toBe('CONFLICT')
      expect(err.message).toBe('导入进行中，请稍后再删除')
      expect(ops.findById).not.toHaveBeenCalled()
      expect(ops.remove).not.toHaveBeenCalled()
      expect(ops.withTransaction).not.toHaveBeenCalled()
      expect(gate.deleteInFlight()).toBe(false) // 拒路径未 enter
      gate.exit()
    })

    it('import in-flight：folders.delete 入口同拒（CONFLICT+零库副作用）', async () => {
      const gate = createImportGate()
      const { repos, ops } = makeFoldersRepos({})
      const { svc } = makeFoldersService(repos, { moveToTrash: vi.fn(async () => undefined) }, gate)
      gate.enter()
      const err = await svc.delete({ id: 'f-1' }).then(
        () => {
          throw new Error('应被拒绝')
        },
        (e: unknown) => e as { code?: string; message?: string }
      )
      expect(err.code).toBe('CONFLICT')
      expect(err.message).toBe('导入进行中，请稍后再删除')
      expect(ops.findById).not.toHaveBeenCalled()
      expect(ops.remove).not.toHaveBeenCalled()
      expect(gate.deleteInFlight()).toBe(false)
      gate.exit()
    })

    it('优先序锁（r1-2 主控裁决）：import in-flight 期 folders.delete(MAIN_GRAPH_ID) → BUSY「导入进行中」先于主图禁删（互斥闸先于永久性域检查——workspace.service 入口第一闸先例同序）', async () => {
      const gate = createImportGate()
      const { repos } = makeFoldersRepos({})
      const { svc } = makeFoldersService(repos, undefined, gate)
      gate.enter()
      await expect(svc.delete({ id: MAIN_GRAPH_ID })).rejects.toThrow(/导入进行中/)
      gate.exit()
    })
  })

  describe('TOCTOU 窗闭合（moveToTrash 挂起窗=COUNT 判定后、移动完成前）', () => {
    it('papers.delete：挂起窗内并发 importFiles 被 BUSY 拒（窗闭合）', async () => {
      const gate = createImportGate()
      const { moveToTrash, release } = hangingMoveToTrash()
      const { repos } = makePapersRepos({ count: 0 })
      const { svc } = makePapersService(repos, { moveToTrash }, gate)
      const importSvc = makeImportService(gate)
      const del = svc.delete({ paperId: 'p-1' })
      expect(moveToTrash).toHaveBeenCalledTimes(1) // 已同步跑到首个 await=挂起窗内
      const concurrent = importSvc.importFiles(['/x.pdf'], 'f-1')
      await expect(concurrent).rejects.toThrow('删除进行中，请稍后再导入')
      release()
      await expect(del).resolves.toEqual({ ok: true })
      expect(gate.inFlight()).toBe(false)
    })

    it('folders.delete：逐 sha 隔离循环挂起窗内并发 importFiles 被 BUSY 拒（窗闭合）', async () => {
      const gate = createImportGate()
      const { moveToTrash, release } = hangingMoveToTrash()
      const { repos } = makeFoldersRepos({
        shas: [
          { sha256: 'sha-1', fileRef: 'aa/bb/1.pdf' },
          { sha256: 'sha-2', fileRef: 'cc/dd/2.pdf' }
        ]
      })
      const { svc } = makeFoldersService(repos, { moveToTrash }, gate)
      const importSvc = makeImportService(gate)
      const del = svc.delete({ id: 'f-1' })
      expect(moveToTrash).toHaveBeenCalledTimes(1) // 首个 sha 挂起=循环窗内
      await expect(importSvc.importFiles(['/x.pdf'], 'f-1')).rejects.toThrow(
        '删除进行中，请稍后再导入'
      )
      release()
      await expect(del).resolves.toEqual({ ok: true })
      expect(gate.inFlight()).toBe(false)
    })

    it('delete in-flight：import.service importFolder 入口同拒（第二入口对称）', async () => {
      const gate = createImportGate()
      const { moveToTrash, release } = hangingMoveToTrash()
      const { repos } = makePapersRepos({ count: 0 })
      const { svc } = makePapersService(repos, { moveToTrash }, gate)
      const importSvc = makeImportService(gate)
      const del = svc.delete({ paperId: 'p-1' })
      await expect(importSvc.importFolder('/dir', 'f-1')).rejects.toThrow(
        '删除进行中，请稍后再导入'
      )
      release()
      await expect(del).resolves.toEqual({ ok: true })
    })
  })

  describe('行为零变锚（无 import 并发时两 delete 与现状逐位一致）', () => {
    it('并发双 delete 放行：papers.delete 挂起窗内 folders.delete 照常完成（delete 不建行=无 TOCTOU 危害面）', async () => {
      const gate = createImportGate()
      const { moveToTrash, release } = hangingMoveToTrash()
      const papersFix = makePapersRepos({})
      const { svc: papersSvc } = makePapersService(papersFix.repos, { moveToTrash }, gate)
      const foldersFix = makeFoldersRepos({})
      const { svc: foldersSvc } = makeFoldersService(
        foldersFix.repos,
        { moveToTrash: vi.fn(async () => undefined) },
        gate
      )
      const del = papersSvc.delete({ paperId: 'p-1' })
      await expect(foldersSvc.delete({ id: 'f-2' })).resolves.toEqual({ ok: true })
      release()
      await expect(del).resolves.toEqual({ ok: true })
      expect(gate.inFlight()).toBe(false)
    })

    it('并发双 import 放行（service 层零变锚，r1-M4 红证面）：importFiles 挂起窗内第二个 importFiles 照常进行（gate 分计不误拒——误查合计即互拒）', async () => {
      const gate = createImportGate()
      let releaseStore!: () => void
      const hang = new Promise<void>((resolve) => {
        releaseStore = resolve
      })
      const storedRow = { sha256: 'sha-i', fileRef: 'ab/cd/i.pdf', fileName: 'i.pdf' }
      const fileStore = {
        // 首个文件挂起在 copying（=import in-flight 窗内）；次个立即返回（同 sha → duplicate 折叠零写库）
        storePdfFromPath: vi.fn((p: string) =>
          p === '/a.pdf' ? hang.then(() => storedRow) : Promise.resolve(storedRow)
        ),
        readFileBytes: vi.fn(async () => new Uint8Array())
      } as unknown as FileStore
      const repos = {
        papers: { findBySha256: vi.fn(() => paperRow({ sha256: 'sha-i' })) },
        withTransaction: vi.fn(<T>(fn: () => T): T => fn())
      } as unknown as Repos
      const importSvc = createImportService({
        repos,
        fileStore,
        extractMeta: async () => {
          throw new Error('duplicate 路径不触达抽取')
        },
        gate
      })
      const first = importSvc.importFiles(['/a.pdf'], 'f-1')
      expect(fileStore.storePdfFromPath).toHaveBeenCalledTimes(1) // 首个已挂起=import kind 持有中
      const second = importSvc.importFiles(['/b.pdf'], 'f-1')
      await expect(second).resolves.toMatchObject({ duplicates: ['b.pdf'] }) // 不被互斥拒
      releaseStore()
      await expect(first).resolves.toMatchObject({ duplicates: ['a.pdf'] })
      expect(gate.importInFlight()).toBe(false)
      expect(gate.inFlight()).toBe(false)
    })
  })

  describe('D-2 finally 配对（域错误上抛/非致命路径后 gate 必释）', () => {
    it('papers.delete removed===false（并发窗口防御面）：NOT_FOUND 上抛后 inFlight 归零', async () => {
      const gate = createImportGate()
      const { repos } = makePapersRepos({ removed: false })
      const { svc } = makePapersService(repos, { moveToTrash: vi.fn(async () => undefined) }, gate)
      await expect(svc.delete({ paperId: 'p-1' })).rejects.toThrow('文献不存在')
      expect(gate.inFlight()).toBe(false)
      expect(gate.deleteInFlight()).toBe(false)
    })

    it('papers.delete 隔离失败非致命：成功返回后 inFlight 归零（finally 覆盖 catch 路径）', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      void warn
      const gate = createImportGate()
      const { repos } = makePapersRepos({ count: 0 })
      const { svc } = makePapersService(
        repos,
        {
          moveToTrash: vi.fn(async () => {
            throw new Error('IO')
          })
        },
        gate
      )
      await expect(svc.delete({ paperId: 'p-1' })).resolves.toEqual({ ok: true })
      expect(gate.inFlight()).toBe(false)
    })

    it('folders.delete 主图禁删：CONFLICT 上抛后 inFlight 归零（enter 前拒绝不漏计数）', async () => {
      const gate = createImportGate()
      const { repos } = makeFoldersRepos({})
      const { svc } = makeFoldersService(repos, undefined, gate)
      await expect(svc.delete({ id: MAIN_GRAPH_ID })).rejects.toThrow('主图不可删除')
      expect(gate.inFlight()).toBe(false)
      expect(gate.deleteInFlight()).toBe(false)
    })

    it('folders.delete 幽灵夹：NOT_FOUND 上抛后 inFlight 归零', async () => {
      const gate = createImportGate()
      const { repos } = makeFoldersRepos({ folderExists: false })
      const { svc } = makeFoldersService(repos, undefined, gate)
      await expect(svc.delete({ id: 'ghost' })).rejects.toThrow('文件夹不存在')
      expect(gate.inFlight()).toBe(false)
      expect(gate.deleteInFlight()).toBe(false)
    })
  })
})
