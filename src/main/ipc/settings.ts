/**
 * [SR-IPC-08] ipc/settings —— 设置域（工单：done / weak）
 *
 * ── 行为层 ──
 * - 自包含域（无独立 service）：settings.json 读写 + 网络诊断
 * - get：读 {userDataDir}/settings.json；不存在/损坏/不合 schema → 返回默认
 *   { contactEmail: DEFAULT_CONTACT_EMAIL, theme: 'system' }（尽力写回文件）
 * - set：原子写（先写 .tmp 再 rename；req 已由 register 过 appSettingsSchema 校验）
 * - diagNetwork：对 shared/constants 的 ALLOWED_REMOTE_HOSTS 并发 deps.ping(host)，
 *   返回 [{host, ok, latencyMs}]
 *
 * ── 接口层 ──
 * - export function createSettingsIpc(deps: IpcDeps): ApiHandlers['settings']
 *
 * ── 架构层 ──
 * - 可 import：node:fs/promises、node:path、shared/constants、zod（appSettingsSchema）
 * - 读写一律 UTF-8（教训 C4：中文乱码防线）；写回失败不阻断 get（默认值照常返回）
 *
 * ── 生命周期层 ──
 * - 不做：主题热切换（renderer 读 theme 自行处理）
 *
 * ── 文化层 ──
 * - 测试：tests/unit/ipc/ipc/settings.test.ts（已锁定，deps.userDataDir 用临时目录）
 */
import { readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { appSettingsSchema, type AppSettings } from '../../shared/ipc/schemas'
import { ALLOWED_REMOTE_HOSTS, DEFAULT_CONTACT_EMAIL, SETTINGS_FILE_NAME } from '../../shared/constants'
import type { ApiHandlers } from '../../shared/ipc/api-surface'
import type { IpcDeps } from './index'

const DEFAULTS: AppSettings = { contactEmail: DEFAULT_CONTACT_EMAIL, theme: 'system' }

/** 原子写：.tmp 落盘后 rename，避免半截文件被读到 */
async function atomicWrite(path: string, content: string): Promise<void> {
  const tmp = `${path}.tmp`
  await writeFile(tmp, content, 'utf-8')
  await rename(tmp, path)
}

export function createSettingsIpc(deps: IpcDeps): ApiHandlers['settings'] {
  const settingsPath = join(deps.userDataDir, SETTINGS_FILE_NAME)

  /** 读文件 → zod 校验；任一环节失败返回默认（损坏文件交由写回覆盖） */
  async function readSettings(): Promise<AppSettings> {
    try {
      const raw = await readFile(settingsPath, 'utf-8')
      const parsed = appSettingsSchema.safeParse(JSON.parse(raw))
      if (parsed.success) {
        return parsed.data
      }
    } catch {
      // 不存在/损坏：走默认
    }
    return DEFAULTS
  }

  return {
    async get(_req) {
      const settings = await readSettings()
      if (settings === DEFAULTS) {
        // 尽力写回默认（失败不阻断返回；下次 get 仍一致）
        try {
          await atomicWrite(settingsPath, `${JSON.stringify(settings, null, 2)}\n`)
        } catch {
          // 目录只读等环境问题：默认值照常返回
        }
      }
      return settings
    },

    async set(req) {
      await atomicWrite(settingsPath, `${JSON.stringify(req, null, 2)}\n`)
      return req
    },

    async diagNetwork(_req) {
      const items = await Promise.all(
        ALLOWED_REMOTE_HOSTS.map(async (host) => {
          const r = await deps.ping(host)
          return { host, ok: r.ok, latencyMs: r.latencyMs }
        })
      )
      return items
    }
  }
}
