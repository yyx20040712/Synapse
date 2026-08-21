import { expect, it, vi } from 'vitest'
import { createNotesIpc } from '../../../src/main/ipc/notes'
import { makeIpcDeps } from '../../utils/ipc-deps'
import { guardedDescribe } from '../../utils/guard'

guardedDescribe('SR-IPC-03', 'ipc/notes —— 纯委托装配', () => {
  it('get/save/remove 透传', async () => {
    const notes = {
      get: vi.fn(async () => null),
      save: vi.fn(async () => ({ id: 'n' })) as never,
      remove: vi.fn(async () => ({ ok: true as const }))
    }
    const ipc = createNotesIpc(makeIpcDeps({ services: { notes: notes as never } }))
    await ipc.get({ paperId: 'p' })
    await ipc.save({ paperId: 'p', title: 't', contentMd: 'c' })
    await ipc.remove({ noteId: 'n' })
    expect(notes.get).toHaveBeenCalledWith({ paperId: 'p' })
    expect(notes.save).toHaveBeenCalledWith({ paperId: 'p', title: 't', contentMd: 'c' })
    expect(notes.remove).toHaveBeenCalledWith({ noteId: 'n' })
  })
})
