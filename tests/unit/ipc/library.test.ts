import { expect, it, vi } from 'vitest'
import { createLibraryIpc } from '../../../src/main/ipc/library'
import { makeIpcDeps } from '../../utils/ipc-deps'
import { guardedDescribe } from '../../utils/guard'

guardedDescribe('SR-IPC-01', 'ipc/library —— 纯委托装配', () => {
  it('四个方法逐一透传到 services.library（req 原样传）', async () => {
    const calls: string[] = []
    const library = {
      list: vi.fn(async () => ({ items: [], total: 0 })),
      detail: vi.fn(async () => ({ id: 'p' })) as never,
      updateMeta: vi.fn(async () => ({ id: 'p' })) as never,
      collections: vi.fn(async () => [])
    }
    const ipc = createLibraryIpc(makeIpcDeps({ services: { library: library as never } }))
    await ipc.list({ sort: 'added_desc', offset: 0, limit: 5 })
    await ipc.detail({ paperId: 'p-1' })
    await ipc.updateMeta({ paperId: 'p-1', patch: { title: 'x' } })
    await ipc.collections({})
    calls.push('done')
    expect(library.list).toHaveBeenCalledWith({ sort: 'added_desc', offset: 0, limit: 5 })
    expect(library.detail).toHaveBeenCalledWith({ paperId: 'p-1' })
    expect(library.updateMeta).toHaveBeenCalledWith({ paperId: 'p-1', patch: { title: 'x' } })
    expect(library.collections).toHaveBeenCalledWith({})
    expect(calls).toEqual(['done'])
  })

  it('service 抛错原样上抛（由 register 统一折叠，不在本层吞）', async () => {
    const library = {
      detail: async () => {
        throw new Error('NOT_FOUND:x')
      }
    }
    const ipc = createLibraryIpc(makeIpcDeps({ services: { library: library as never } }))
    await expect(ipc.detail({ paperId: 'ghost' })).rejects.toThrow('NOT_FOUND')
  })
})
