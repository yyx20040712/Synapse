import { expect, it, vi } from 'vitest'
import { createReaderIpc } from '../../../src/main/ipc/reader'
import { makeIpcDeps } from '../../utils/ipc-deps'
import { guardedDescribe } from '../../utils/guard'

guardedDescribe('SR-IPC-02', 'ipc/reader —— 纯委托装配', () => {
  it('六方法透传', async () => {
    const reader = {
      open: vi.fn(async () => ({ fileUrl: 'app-file://p', fileName: 'a.pdf', lastReadPage: 0 })),
      saveAnnotation: vi.fn(async () => ({ id: 'a' })) as never,
      updateAnnotation: vi.fn(async () => ({ id: 'a' })) as never,
      deleteAnnotation: vi.fn(async () => ({ ok: true as const })),
      listAnnotations: vi.fn(async () => []),
      saveProgress: vi.fn(async () => ({ ok: true as const }))
    }
    const ipc = createReaderIpc(makeIpcDeps({ services: { reader: reader as never } }))
    await ipc.open({ paperId: 'p' })
    await ipc.listAnnotations({ paperId: 'p' })
    await ipc.saveProgress({ paperId: 'p', page: 2 })
    expect(reader.open).toHaveBeenCalledWith({ paperId: 'p' })
    expect(reader.saveProgress).toHaveBeenCalledWith({ paperId: 'p', page: 2 })
  })
})
