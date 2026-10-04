import { expect, it, vi } from 'vitest'
import { createImportIpc } from '../../../src/main/ipc/import_'
import { makeIpcDeps } from '../../utils/ipc-deps'
import { guardedDescribe } from '../../utils/guard'

const emptyResult = { imported: [], duplicates: [], failed: [] }

guardedDescribe('SR-IPC-05', 'ipc/import_ —— 对话框胶水', () => {
  it('fromDialog：选中文件 → importFiles(paths, targetFolderId)（[F-ALIGN-01 D3] 落点透传）；取消 → 空结果不报错', async () => {
    const importService = {
      importFiles: vi.fn(async () => ({ imported: [{ id: 'p' }], duplicates: [], failed: [] })),
      importFolder: vi.fn(async () => emptyResult)
    }
    const ipc = createImportIpc(
      makeIpcDeps({
        services: { import_: importService as never },
        dialogs: { pickPdfFiles: async () => ['E:/a.pdf', 'E:/b.pdf'] }
      })
    )
    const r = await ipc.fromDialog({ targetFolderId: 'f-tgt' })
    expect(importService.importFiles).toHaveBeenCalledWith(['E:/a.pdf', 'E:/b.pdf'], 'f-tgt')
    expect(r.imported).toHaveLength(1)

    const cancelled = createImportIpc(
      makeIpcDeps({
        services: { import_: importService as never },
        dialogs: { pickPdfFiles: async () => null }
      })
    )
    await expect(cancelled.fromDialog({ targetFolderId: 'f-tgt' })).resolves.toEqual(emptyResult)
    expect(importService.importFiles).toHaveBeenCalledTimes(1)
  })

  it('fromFolder：目录 → importFolder(folder, targetFolderId)（[F-ALIGN-01 D3] 落点透传）；取消 → 空结果', async () => {
    const importService = {
      importFiles: vi.fn(async () => emptyResult),
      importFolder: vi.fn(async () => emptyResult)
    }
    const ipc = createImportIpc(
      makeIpcDeps({
        services: { import_: importService as never },
        dialogs: { pickFolder: async () => 'E:/论文' }
      })
    )
    await ipc.fromFolder({ targetFolderId: '__main__' })
    expect(importService.importFolder).toHaveBeenCalledWith('E:/论文', '__main__')

    const cancelled = createImportIpc(
      makeIpcDeps({
        services: { import_: importService as never },
        dialogs: { pickFolder: async () => null }
      })
    )
    await expect(cancelled.fromFolder({ targetFolderId: '__main__' })).resolves.toEqual(emptyResult)
  })
})
