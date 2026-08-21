import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, expect, it } from 'vitest'
import { createSettingsIpc } from '../../../src/main/ipc/settings'
import { makeIpcDeps } from '../../utils/ipc-deps'
import { guardedDescribe } from '../../utils/guard'
import { ALLOWED_REMOTE_HOSTS } from '../../../src/shared/constants'

const dirs: string[] = []
afterAll(async () => {
  for (const d of dirs) await rm(d, { recursive: true, force: true })
})

async function freshDeps(ping?: (host: string) => Promise<{ ok: boolean; latencyMs: number }>) {
  const dir = await mkdtemp(join(tmpdir(), 'settings-'))
  dirs.push(dir)
  return makeIpcDeps({ userDataDir: dir, ping })
}

guardedDescribe('SR-IPC-08', 'ipc/settings —— JSON 读写与网络诊断', () => {
  it('get：无文件返回默认值（contactEmail 合法 email，theme=system）', async () => {
    const ipc = createSettingsIpc(await freshDeps())
    const s = await ipc.get({})
    expect(s.theme).toBe('system')
    expect(s.contactEmail).toContain('@')
  })

  it('set→get 往返一致；损坏文件回退默认', async () => {
    const deps = await freshDeps()
    const ipc = createSettingsIpc(deps)
    const saved = await ipc.set({ contactEmail: 'me@example.com', theme: 'dark' })
    expect(saved.contactEmail).toBe('me@example.com')
    const reread = await ipc.get({})
    expect(reread).toEqual({ contactEmail: 'me@example.com', theme: 'dark' })

    await import('node:fs/promises').then((fs) =>
      fs.writeFile(join(deps.userDataDir, 'settings.json'), '{broken', 'utf-8')
    )
    const fallback = await ipc.get({})
    expect(fallback.theme).toBe('system')
  })

  it('写入文件为 UTF-8（中文主题值无乱码——原子写 tmp+rename）', async () => {
    const deps = await freshDeps()
    const ipc = createSettingsIpc(deps)
    await ipc.set({ contactEmail: 'a@b.c', theme: 'light' })
    const raw = await readFile(join(deps.userDataDir, 'settings.json'), 'utf-8')
    expect(JSON.parse(raw)).toMatchObject({ contactEmail: 'a@b.c' })
    expect(raw).not.toMatch(/[\uFFFD]/)
  })

  it('diagNetwork：对全部白名单 host 并发 ping', async () => {
    const pinged: string[] = []
    const ipc = createSettingsIpc(
      await freshDeps(async (host) => {
        pinged.push(host)
        return host === 'api.crossref.org' ? { ok: true, latencyMs: 42 } : { ok: false, latencyMs: -1 }
      })
    )
    const diag = await ipc.diagNetwork({})
    expect(pinged.sort()).toEqual([...ALLOWED_REMOTE_HOSTS].sort())
    expect(diag).toHaveLength(ALLOWED_REMOTE_HOSTS.length)
    const cr = diag.find((d) => d.host === 'api.crossref.org')
    expect(cr).toEqual({ host: 'api.crossref.org', ok: true, latencyMs: 42 })
    expect(diag.filter((d) => !d.ok).every((d) => d.latencyMs === -1)).toBe(true)
  })
})
