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

  it('windowControl：四 action 透传注入的 controlWindow，回带 { ok: true, maximized }（R2-SH3 增量）', async () => {
    const seen: string[] = []
    const ipc = createSystemIpc(
      makeIpcDeps({
        controlWindow: (action) => {
          seen.push(action)
          return { maximized: action === 'maximize-toggle' }
        }
      })
    )
    await expect(ipc.windowControl({ action: 'minimize' })).resolves.toEqual({ ok: true, maximized: false })
    await expect(ipc.windowControl({ action: 'maximize-toggle' })).resolves.toEqual({ ok: true, maximized: true })
    await expect(ipc.windowControl({ action: 'close' })).resolves.toEqual({ ok: true, maximized: false })
    await expect(ipc.windowControl({ action: 'get-state' })).resolves.toEqual({ ok: true, maximized: false })
    expect(seen).toEqual(['minimize', 'maximize-toggle', 'close', 'get-state'])
  })
})
