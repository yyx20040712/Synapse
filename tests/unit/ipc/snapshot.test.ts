/**
 * [F-DBCAMP-01 DB-3 U2] ipc/snapshot 锁定测试（always-active——export_.test.ts
 * CANCELLED 先例+makeIpcDeps 桩）。
 *
 * 覆盖（简报③-5/③-8.6）：CANCELLED（saveFile=null→code=CANCELLED+零计数消耗
 * ——commitExport 未调）；成功路径（temp 目录真落盘+commit 调用+res 形状）；
 * 构建失败零弹框（service 构建抛→dialogs.saveFile 未调——export_.ts「先构建
 * 后弹框」先例）；默认文件名/过滤器形态。
 */
import { mkdtemp, readFile, rm } from 'node:fs/promises'
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
