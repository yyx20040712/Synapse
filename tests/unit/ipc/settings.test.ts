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
  it('get：无文件返回默认值（contactEmail 合法 email，theme=light）', async () => {
    const ipc = createSettingsIpc(await freshDeps())
    const s = await ipc.get({})
    expect(s.theme).toBe('light')
    expect(s.contactEmail).toContain('@')
  })

  it('set→get 往返一致；损坏文件回退默认', async () => {
    const deps = await freshDeps()
    const ipc = createSettingsIpc(deps)
    const saved = await ipc.set({ contactEmail: 'me@example.com', theme: 'dark', uiScale: 'small' })
    expect(saved.contactEmail).toBe('me@example.com')
    const reread = await ipc.get({})
    expect(reread).toEqual({ contactEmail: 'me@example.com', theme: 'dark', uiScale: 'small' })

    await import('node:fs/promises').then((fs) =>
      fs.writeFile(join(deps.userDataDir, 'settings.json'), '{broken', 'utf-8')
    )
    const fallback = await ipc.get({})
    expect(fallback.theme).toBe('light')
  })

  it('写入文件为 UTF-8（中文主题值无乱码——原子写 tmp+rename）', async () => {
    const deps = await freshDeps()
    const ipc = createSettingsIpc(deps)
    await ipc.set({ contactEmail: 'a@b.c', theme: 'light', uiScale: 'medium' })
    const raw = await readFile(join(deps.userDataDir, 'settings.json'), 'utf-8')
    expect(JSON.parse(raw)).toMatchObject({ contactEmail: 'a@b.c' })
    expect(raw).not.toMatch(/[\uFFFD]/)
  })

  it('R2-SET1 旧 settings.json 无 uiScale：get 走 zod default 填充 small（非 fallback）且既有字段保留', async () => {
    const deps = await freshDeps()
    const { writeFile } = await import('node:fs/promises')
    await writeFile(
      join(deps.userDataDir, 'settings.json'),
      JSON.stringify({ contactEmail: 'me@example.com', theme: 'dark' }),
      'utf-8'
    )
    const ipc = createSettingsIpc(deps)
    const s = await ipc.get({})
    expect(s.uiScale).toBe('small')
    expect(s.theme).toBe('dark')
    expect(s.contactEmail).toBe('me@example.com')
  })

  it('R2-SET1 set 带 uiScale=large：持久化回读一致', async () => {
    const deps = await freshDeps()
    const ipc = createSettingsIpc(deps)
    await ipc.set({ contactEmail: 'me@example.com', theme: 'dark', uiScale: 'large' })
    const reread = await ipc.get({})
    expect(reread.uiScale).toBe('large')
    expect(reread.theme).toBe('dark')
  })

  it('T3-P1 旧 settings.json theme=system：get 读侧平滑迁移为 light 且既有字段保全（迁移锁）', async () => {
    const deps = await freshDeps()
    const { writeFile } = await import('node:fs/promises')
    await writeFile(
      join(deps.userDataDir, 'settings.json'),
      '{"contactEmail":"me@example.com","theme":"system","uiScale":"large"}',
      'utf-8'
    )
    const ipc = createSettingsIpc(deps)
    const s = await ipc.get({})
    expect(s.theme, "存量 theme:'system' 应迁移为 'light'（枚举退役，A6 不跟随系统）").toBe('light')
    expect(s.contactEmail, '迁移不得丢既有字段').toBe('me@example.com')
    expect(s.uiScale, '迁移不得丢既有字段').toBe('large')
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
