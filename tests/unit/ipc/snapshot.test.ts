/**
 * [F-DBCAMP-01 DB-3 U2] ipc/snapshot 锁定测试（always-active——export_.test.ts
 * CANCELLED 先例+makeIpcDeps 桩）。[DB-3 U3] +importFromFile 三态（CANCELLED/
 * 读失败 INVALID_REQUEST/成功分发——简报③-6/③-7-5）。
 */
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, it, vi } from 'vitest'
import { createSnapshotIpc } from '../../../src/main/ipc/snapshot'
import { makeIpcDeps } from '../../utils/ipc-deps'

const TABLE_COUNTS = {
  papers: 1,
  collections: 0,
  tags: 0,
  paper_tags: 0,
  notes: 0,
  annotations: 0,
  lineage_nodes: 0,
  lineage_edges: 0,
  lineage_graph_meta: 1
}

function makeSnapshotService(over: Partial<Record<string, unknown>> = {}) {
  return {
    getSyncKeyInfo: vi.fn(async () => ({
      ownerId: '3f2b8a04-5c6d-4e1f-9a2b-7c8d9e0f1a2b',
      syncKey: 'ab'.repeat(32),
      bundle: `3f2b8a04-5c6d-4e1f-9a2b-7c8d9e0f1a2b:${'ab'.repeat(32)}`
    })),
    exportToBuffer: vi.fn(async () => ({ bytes: Buffer.from('synsnap-fixture'), snapshotSeq: 1, tableCounts: { ...TABLE_COUNTS } })),
    commitExport: vi.fn(),
    importPeerKey: vi.fn(async () => ({ ownerId: '4d3c9b15-6e7f-4a2b-8c3d-0f1a2b3c4d5e' })),
    listPeerKeys: vi.fn(async () => []),
    removePeerKey: vi.fn(async () => true),
    ...over
  }
}

function makeImportService(over: Partial<Record<string, unknown>> = {}) {
  return {
    importFromBuffer: vi.fn(async () => ({
      outcome: 'applied',
      ownerId: '4d3c9b15-6e7f-4a2b-8c3d-0f1a2b3c4d5e',
      snapshotSeq: 2,
      stats: { inserted: 1, updated: 0, skippedStale: 0, skippedRevive: 0, deleted: 0, a7Conflicts: 0 }
    })),
    ...over
  }
}

it('exportToFile 成功路径：构建→saveFile（默认名+过滤器形态）→落盘真字节→commit→res 形状', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'synapse-u2-'))
  const target = join(dir, 'synapse-snapshot.synsnap')
  const service = makeSnapshotService()
  const saveFile = vi.fn(async () => target)
  const ipc = createSnapshotIpc(makeIpcDeps({ services: { snapshot: service as never }, dialogs: { saveFile: saveFile as never } }))
  const r = await ipc.exportToFile({})
  expect(r).toEqual({ filePath: target, snapshotSeq: 1, tableCounts: TABLE_COUNTS })
  expect(saveFile).toHaveBeenCalledWith('synapse-snapshot.synsnap', [
    { name: 'Synapse 快照', extensions: ['synsnap'] }
  ])
  expect((await readFile(target, 'utf8'))).toBe('synsnap-fixture')
  expect(service.commitExport).toHaveBeenCalledWith(1)
  await rm(dir, { recursive: true, force: true })
})

it('取消保存：saveFile=null→code=CANCELLED+零落盘+零计数消耗（commitExport 未调）', async () => {
  const service = makeSnapshotService()
  const ipc = createSnapshotIpc(
    makeIpcDeps({ services: { snapshot: service as never }, dialogs: { saveFile: async () => null } })
  )
  await expect(ipc.exportToFile({})).rejects.toMatchObject({ code: 'CANCELLED' })
  expect(service.commitExport).not.toHaveBeenCalled()
})

it('构建失败零弹框：exportToBuffer 抛→saveFile 未调（先构建后弹框——export_.ts 先例）', async () => {
  const service = makeSnapshotService({
    exportToBuffer: vi.fn(async () => {
      throw new Error('构建失败夹具')
    })
  })
  const saveFile = vi.fn(async () => '/tmp/never.synsnap')
  const ipc = createSnapshotIpc(
    makeIpcDeps({ services: { snapshot: service as never }, dialogs: { saveFile: saveFile as never } })
  )
  await expect(ipc.exportToFile({})).rejects.toThrow(/构建失败夹具/)
  expect(saveFile).not.toHaveBeenCalled()
  expect(service.commitExport).not.toHaveBeenCalled()
})

it('[回炉 R11b] 落盘失败→零 commitExport（seq 完整性路径——写失败不耗卷号）', async () => {
  const service = makeSnapshotService()
  // 不存在目录下的目标路径：writeFile ENOENT（atomicWriteFile 无 ensureDir——
  // 真写盘路径，非 mock 写口）
  const bad = '/synapse-u2-nonexistent-dir/x.synsnap'
  const ipc = createSnapshotIpc(
    makeIpcDeps({ services: { snapshot: service as never }, dialogs: { saveFile: async () => bad } })
  )
  await expect(ipc.exportToFile({})).rejects.toThrow()
  expect(service.commitExport).not.toHaveBeenCalled()
})

it('薄分发三通道：getSyncKey/importPeerKey/listPeerKeys 直通 service', async () => {
  const service = makeSnapshotService()
  const ipc = createSnapshotIpc(makeIpcDeps({ services: { snapshot: service as never } }))
  const info = await ipc.getSyncKey({})
  expect(info.bundle).toHaveLength(101)
  const imported = await ipc.importPeerKey({ bundle: 'x' })
  expect(imported.ownerId).toBe('4d3c9b15-6e7f-4a2b-8c3d-0f1a2b3c4d5e')
  expect(service.importPeerKey).toHaveBeenCalledWith('x')
  const listed = await ipc.listPeerKeys({})
  expect(listed).toEqual({ peers: [] })
  const removed = await ipc.removePeerKey({ ownerId: '4d3c9b15-6e7f-4a2b-8c3d-0f1a2b3c4d5e' })
  expect(removed).toEqual({ removed: true })
})

// [F-DBCAMP-01 DB-3 U3] importFromFile 三态（简报③-6：openFile→null=CANCELLED；
// 读失败=INVALID_REQUEST 中文消息；成功=真读文件字节→service.importFromBuffer）

it('importFromFile 成功：openFile（过滤器形态）→真读文件字节→importFromBuffer 收同字节→Res 直通', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'synapse-u3-'))
  const target = join(dir, 'peer.synsnap')
  await writeFile(target, Buffer.from('u3-envelope-bytes'))
  const importer = makeImportService()
  const openFile = vi.fn(async () => target)
  const ipc = createSnapshotIpc(
    makeIpcDeps({
      services: { snapshotImport: importer as never },
      dialogs: { openFile: openFile as never }
    })
  )
  const r = await ipc.importFromFile({})
  expect(r.outcome).toBe('applied')
  expect(openFile).toHaveBeenCalledWith([{ name: 'Synapse 快照', extensions: ['synsnap'] }])
  expect(importer.importFromBuffer).toHaveBeenCalledWith(Buffer.from('u3-envelope-bytes'))
  await rm(dir, { recursive: true, force: true })
})

it('importFromFile 取消：openFile=null→code=CANCELLED+importFromBuffer 未调', async () => {
  const importer = makeImportService()
  const ipc = createSnapshotIpc(
    makeIpcDeps({
      services: { snapshotImport: importer as never },
      dialogs: { openFile: async () => null }
    })
  )
  await expect(ipc.importFromFile({})).rejects.toMatchObject({ code: 'CANCELLED' })
  expect(importer.importFromBuffer).not.toHaveBeenCalled()
})

it('importFromFile 读失败：不存在路径→INVALID_REQUEST 中文消息+importFromBuffer 未调', async () => {
  const importer = makeImportService()
  const ipc = createSnapshotIpc(
    makeIpcDeps({
      services: { snapshotImport: importer as never },
      dialogs: { openFile: async () => '/synapse-u3-nonexistent-dir/x.synsnap' }
    })
  )
  await expect(ipc.importFromFile({})).rejects.toMatchObject({ code: 'INVALID_REQUEST' })
  expect(importer.importFromBuffer).not.toHaveBeenCalled()
})
