import { expect, it, vi } from 'vitest'
import { createTagsIpc } from '../../../src/main/ipc/tags'
import { makeIpcDeps } from '../../utils/ipc-deps'
import { guardedDescribe } from '../../utils/guard'

guardedDescribe('SR-IPC-04', 'ipc/tags —— 纯委托装配', () => {
  it('list/upsert/attach/detach 透传', async () => {
    const tags = {
      list: vi.fn(async () => []),
      upsert: vi.fn(async () => ({ id: 't', name: 'n' })),
      attach: vi.fn(async () => ({ ok: true as const })),
      detach: vi.fn(async () => ({ ok: true as const }))
    }
    const ipc = createTagsIpc(makeIpcDeps({ services: { tags: tags as never } }))
    await ipc.list({})
    await ipc.upsert({ name: '必读' })
    await ipc.attach({ paperId: 'p', tagId: 't' })
    await ipc.detach({ paperId: 'p', tagId: 't' })
    expect(tags.upsert).toHaveBeenCalledWith({ name: '必读' })
    expect(tags.attach).toHaveBeenCalledWith({ paperId: 'p', tagId: 't' })
  })
})
