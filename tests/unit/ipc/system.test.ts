import { expect, it } from 'vitest'
import { createSystemIpc } from '../../../src/main/ipc/system'
import { makeIpcDeps } from '../../utils/ipc-deps'
import { guardedDescribe } from '../../utils/guard'

guardedDescribe('SR-IPC-09', 'ipc/system —— 外链经守卫打开', () => {
  it('合法 https 链接：调用 shell 并返回 { ok: true }', async () => {
    const opened: string[] = []
    const ipc = createSystemIpc(
      makeIpcDeps({ shell: { openExternal: async (u) => void opened.push(u) } })
    )
    await expect(ipc.openExternal({ url: 'https://arxiv.org/abs/2401.00001' })).resolves.toEqual({ ok: true })
    expect(opened).toEqual(['https://arxiv.org/abs/2401.00001'])
  })

  it('危险 URL：拒绝且不触达 shell（拒绝即错，不静默）', async () => {
    const opened: string[] = []
    const ipc = createSystemIpc(
      makeIpcDeps({ shell: { openExternal: async (u) => void opened.push(u) } })
    )
    for (const evil of ['https://127.0.0.1/x', 'http://a.com', 'javascript:alert(1)', 'not a url']) {
      await expect(ipc.openExternal({ url: evil })).rejects.toMatchObject({ code: 'INVALID_REQUEST' })
    }
    expect(opened).toEqual([])
  })
})
