import { expect, it, vi } from 'vitest'
import { createEnrichIpc } from '../../../src/main/ipc/enrich'
import { makeIpcDeps } from '../../utils/ipc-deps'
import { guardedDescribe } from '../../utils/guard'

guardedDescribe('SR-IPC-06', 'ipc/enrich —— 手动触发透传', () => {
  it('fetch → services.enrich.enrichPaper(paperId)', async () => {
    const enrich = {
      enrichPaper: vi.fn(async () => ({ id: 'p-1', enrichStatus: 'done' }))
    }
    const ipc = createEnrichIpc(makeIpcDeps({ services: { enrich: enrich as never } }))
    const r = await ipc.fetch({ paperId: 'p-1' })
    expect(enrich.enrichPaper).toHaveBeenCalledWith('p-1')
    expect(r).toMatchObject({ id: 'p-1' })
  })
})
