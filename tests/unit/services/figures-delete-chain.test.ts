/**
 * [F-VISFB-42] 派生图表资产删除链+恢复重提（INV-133 扩面：硬删语义挂点）。
 *
 * 覆盖：papers.delete 挂点（资产清理被调/stub 抛错非致命照常 ok/缺席依赖旧装配
 * 兼容）；folders.delete 域删级联挂点（夹内 N 篇逐篇清/失败非致命）；快照恢复
 * 重提（双库 X 导出→Y 导入：payload papers 全集 jobs 重置 pending+figure 行清空
 * ——恢复无「ready 但资产缺失」；payload 外 paper 不受扰）。
 * always-active（不经 guardedDescribe）。
 */
import { createHash } from 'node:crypto'
import { mkdtemp, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import type { SqliteDb } from '../../../src/main/db/connection'
import { createRepos } from '../../../src/main/db/repos'
import { createFigureRepo } from '../../../src/main/db/repos/figure.repo'
import { createPapersService } from '../../../src/main/services/library.service'
import { createFoldersService } from '../../../src/main/services/folders.service'
import { createFigureStoreService } from '../../../src/main/services/figure-store.service'
import { createImportSnapshotService } from '../../../src/main/services/snapshot/import-snapshot.service'
import { createExportSnapshotService } from '../../../src/main/services/snapshot/export-snapshot.service'
import { createFileStore } from '../../../src/main/services/import_/file-store'
import { createTestDb } from '../../utils/fixtures'
import { APP_META_KEYS } from '../../../src/shared/models/app-meta'

function seedFolder(db: SqliteDb, id: string): void {
  db.prepare('INSERT INTO collections (id, name, position) VALUES (?, ?, 99)').run(id, `夹-${id}`)
}

function seedPaper(db: SqliteDb, id: string, folderId: string): void {
  db.prepare(
    `INSERT INTO papers (id, file_ref, sha256, title, abstract, authors_json, source, enrich_status,
     added_at, updated_at, folder_id) VALUES (?, ?, ?, ?, '摘要', '[]', 'manual', 'manual', 't0', 't0', ?)`
  ).run(id, `f/${id}.pdf`, `sha-${id}`, `题-${id}`, folderId)
}

/** ready+两行 figure 的「已提取」态播种（真 repo——非 mock；figure_id 全局
 *  主键=按篇加后缀防撞） */
function seedExtracted(db: SqliteDb, paperId: string): void {
  const repo = createFigureRepo(db)
  repo.setJob(paperId, { status: 'ready', excess: 0, failedCount: 0 })
  for (const s of ['a', 'b']) {
    repo.insertFigure({
      figureId: `fig-${paperId}-${s}`,
      paperId,
      digest: `digest-${s}`,
      fileRef: `figures/${paperId}/digest-${s}.png`,
      page: 1,
      width: 300,
      height: 200,
      ctmX: 0,
      ctmY: 0,
      ctmW: 70,
      ctmH: 60
    })
  }
}

function spyAssets(fail: boolean): { removePaperAssets: (id: string) => Promise<void>; calls: string[] } {
  const calls: string[] = []
  return {
    calls,
    removePaperAssets: async (id: string) => {
      calls.push(id)
      if (fail) throw new Error('图盘 IO 失败（测试注入）')
    }
  }
}

describe('F-VISFB-42 papers.delete 挂点', () => {
  it('删除成功→removePaperAssets 以 paperId 被调', async () => {
    const db = createTestDb()
    seedPaper(db, 'p-1', '__main__')
    const assets = spyAssets(false)
    const svc = createPapersService({ repos: createRepos(db), figureAssets: assets })
    const res = await svc.delete({ paperId: 'p-1' })
    expect(res.ok).toBe(true)
    expect(assets.calls).toEqual(['p-1'])
    db.close()
  })

  it('资产清理失败非致命：删除照常 ok（INV-133 同构 warn+照常）', async () => {
    const db = createTestDb()
    seedPaper(db, 'p-1', '__main__')
    const assets = spyAssets(true)
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const svc = createPapersService({ repos: createRepos(db), figureAssets: assets })
    const res = await svc.delete({ paperId: 'p-1' })
    warnSpy.mockRestore()
    expect(res.ok).toBe(true)
    expect(assets.calls).toEqual(['p-1'])
    db.close()
  })

  it('figureAssets 缺席：删除照常（旧单测装配兼容）', async () => {
    const db = createTestDb()
    seedPaper(db, 'p-1', '__main__')
    const svc = createPapersService({ repos: createRepos(db) })
    const res = await svc.delete({ paperId: 'p-1' })
    expect(res.ok).toBe(true)
    db.close()
  })

  it('真链路：figure-store 服务注入→磁盘目录硬删', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'chain-'))
    const db = createTestDb()
    seedPaper(db, 'p-1', '__main__')
    const repos = createRepos(db)
    const fileStore = createFileStore(tmp)
    const figureStore = createFigureStoreService({ repos, fileStore })
    const svc = createPapersService({ repos, figureAssets: figureStore })
    figureStore.beginExtraction('p-1')
    // PNG 魔数前缀字节（回炉①B-1 PNG-only 守卫——合法路径夹具）
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x78])
    await figureStore.storeFigure('p-1', {
      digest: createHash('sha256').update(bytes).digest('hex'),
      bytes,
      page: 1,
      width: 100,
      height: 100,
      ctmX: 0,
      ctmY: 0,
      ctmW: 61,
      ctmH: 61
    })
    const res = await svc.delete({ paperId: 'p-1' })
    expect(res.ok).toBe(true)
    await expect(stat(join(tmp, 'figures', 'p-1'))).rejects.toThrow()
    await rm(tmp, { recursive: true, force: true })
    db.close()
  })
})

describe('F-VISFB-42 folders.delete 域删级联挂点', () => {
  function makeFoldersSvc(db: SqliteDb, assets: { removePaperAssets: (id: string) => Promise<void> }) {
    return createFoldersService({
      repos: createRepos(db),
      lineagePending: () => false,
      sendFoldersChanged: () => undefined,
      sendLineageChanged: () => undefined,
      figureAssets: assets
    })
  }

  it('域删：夹内两篇逐篇清资产（每 paperId 各一次）', async () => {
    const db = createTestDb()
    seedFolder(db, 'f-1')
    seedPaper(db, 'p-1', 'f-1')
    seedPaper(db, 'p-2', 'f-1')
    const assets = spyAssets(false)
    const svc = makeFoldersSvc(db, assets)
    const res = await svc.delete({ id: 'f-1' })
    expect(res.ok).toBe(true)
    expect([...assets.calls].sort()).toEqual(['p-1', 'p-2'])
    db.close()
  })

  it('资产清理失败非致命：域删照常 ok', async () => {
    const db = createTestDb()
    seedFolder(db, 'f-1')
    seedPaper(db, 'p-1', 'f-1')
    const assets = spyAssets(true)
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const svc = makeFoldersSvc(db, assets)
    const res = await svc.delete({ id: 'f-1' })
    warnSpy.mockRestore()
    expect(res.ok).toBe(true)
    db.close()
  })

  it('figureAssets 缺席：域删照常（旧装配兼容）', async () => {
    const db = createTestDb()
    seedFolder(db, 'f-1')
    seedPaper(db, 'p-1', 'f-1')
    const svc = createFoldersService({
      repos: createRepos(db),
      lineagePending: () => false,
      sendFoldersChanged: () => undefined,
      sendLineageChanged: () => undefined
    })
    const res = await svc.delete({ id: 'f-1' })
    expect(res.ok).toBe(true)
    db.close()
  })
})

describe('F-VISFB-42 快照恢复重提（派生不入快照→jobs 重置 pending）', () => {
  type Side = {
    owner: string
    db: SqliteDb
    repos: ReturnType<typeof createRepos>
    exporter: ReturnType<typeof createExportSnapshotService>
    importer: ReturnType<typeof createImportSnapshotService>
  }

  function makeSide(owner: string): Side {
    const db = createTestDb()
    const repos = createRepos(db)
    repos.appMeta.ensureIdentity()
    repos.snapshot.ensureSyncKey()
    db.prepare('UPDATE app_meta SET value = ? WHERE key = ?').run(owner, APP_META_KEYS.ownerId)
    const makeNonce = () => Buffer.from('0123456789ab', 'utf8')
    return {
      owner,
      db,
      repos,
      exporter: createExportSnapshotService({ repos, makeNonce }),
      importer: createImportSnapshotService({ repos })
    }
  }

  it('导入后 payload papers 全集 jobs 重置 pending+figure 行清空；payload 外不受扰', () => {
    const x = makeSide('3f2b8a04-5c6d-4e1f-9a2b-7c8d9e0f1a2b')
    const y = makeSide('4d3c9b15-6e7f-4a2b-8c3d-0f1a2b3c4d5e')
    seedPaper(x.db, 'p-in-payload', '__main__')
    const built = x.exporter.exportToBuffer()
    x.exporter.commitExport(built.snapshotSeq)
    seedPaper(y.db, 'p-in-payload', '__main__')
    seedPaper(y.db, 'p-local-only', '__main__')
    seedExtracted(y.db, 'p-in-payload')
    seedExtracted(y.db, 'p-local-only')
    y.repos.snapshot.setPeerKey(
      x.owner,
      (
        x.db.prepare('SELECT value FROM app_meta WHERE key = ?').get(APP_META_KEYS.syncKey) as {
          value: string
        }
      ).value
    )
    const res = y.importer.importFromBuffer(built.bytes)
    expect(res.outcome).toBe('applied')
    const figures = createFigureRepo(y.db)
    const reset = figures.getJob('p-in-payload')
    expect(reset?.status).toBe('pending')
    expect(figures.listByPaper('p-in-payload')).toEqual([])
    const untouched = figures.getJob('p-local-only')
    expect(untouched?.status).toBe('ready')
    expect(figures.listByPaper('p-local-only')).toHaveLength(2)
    x.db.close()
    y.db.close()
  })
})
