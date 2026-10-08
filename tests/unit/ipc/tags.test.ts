import { expect, it, vi } from 'vitest'
import { createTagsIpc } from '../../../src/main/ipc/tags'
import { makeIpcDeps } from '../../utils/ipc-deps'
import { guardedDescribe } from '../../utils/guard'

guardedDescribe('SR-IPC-04', 'ipc/tags —— 纯委托装配', () => {
  it('list/upsert/attach/detach 透传（[F-TAGS-02/DB-1 U4] Req 域参随链——纯委托零改动）', async () => {
    const tags = {
      list: vi.fn(async () => []),
      upsert: vi.fn(async () => ({ id: 't', name: 'n' })),
      attach: vi.fn(async () => ({ ok: true as const })),
      detach: vi.fn(async () => ({ ok: true as const }))
    }
    const ipc = createTagsIpc(makeIpcDeps({ services: { tags: tags as never } }))
    await ipc.list({ folderId: '__main__' })
    await ipc.upsert({ folderId: '__main__', name: '必读' })
    await ipc.attach({ paperId: 'p', tagId: 't' })
    await ipc.detach({ paperId: 'p', tagId: 't' })
    expect(tags.list).toHaveBeenCalledWith({ folderId: '__main__' })
    expect(tags.upsert).toHaveBeenCalledWith({ folderId: '__main__', name: '必读' })
    expect(tags.attach).toHaveBeenCalledWith({ paperId: 'p', tagId: 't' })
  })
})
