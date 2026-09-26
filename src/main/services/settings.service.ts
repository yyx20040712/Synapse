/**
 * [F-LAYER-01] settings service——业务自 ipc/settings.ts 下沉（零行为迁移，
 * 2026-09-19；裁决 6 域归位战役群梯队四首票）。
 *
 * ── 行为层 ──
 * - settings.json 读写 + 网络诊断（文件域+网络诊断域，无 repos 依赖）
 * - get：读 {userDataDir}/settings.json；不存在/损坏/不合 schema → 返回默认
 *   { contactEmail: DEFAULT_CONTACT_EMAIL, theme: 'light', uiScale: 'small' }
 *   （尽力写回文件）
 * - T3-P1 读侧平滑迁移：JSON.parse 成功后、safeParse 前，raw.theme==='system'
 *   改写为 'light'（'system' 枚举退役——A6 不跟随系统；存量 settings.json
 *   兼容，contactEmail/uiScale 零丢失，仅 theme 单字段替换）
 * - set：原子写（单源=services/shared/atomic-write，F-DEDUP-01——先写 .tmp
 *   再 rename；req 已由 register 过 appSettingsSchema 校验）
 * - diagNetwork：对 shared/constants 的 ALLOWED_REMOTE_HOSTS 并发 deps.ping(host)，
 *   返回 [{host, ok, latencyMs}]
 *
 * ── 接口层 ──
 * - export function createSettingsService(deps: { userDataDir: string;
 *   ping: PingFn }): Pick<ApiHandlers['settings'], 'get' | 'set' | 'diagNetwork'>
 * - 方案 B（主控侦察裁定）：不挂 ServiceBundle（settings 无 repos 依赖，
 *   挂桶需改受锁桩工厂=超票面）——构造点=ipc 工厂 createSettingsIpc 内，
 *   注入面=IpcDeps.userDataDir/ping 现成字段
 *
 * ── 架构层 ──
 * - 可 import：node:fs/promises、node:path、shared/constants、
 *   shared/ipc/schemas、services/shared/atomic-write、
 *   shared/ipc/api-surface（type）
 * - 禁依赖 electron（L1 红线——core 可抽包，eslint services 块 group 强制）；
 *   禁上探 ipc 层（check-quality 按解析路径强制）
 * - 读写一律 UTF-8（教训 C4：中文乱码防线）；写回失败不阻断 get（默认值照常返回）
 *
 * ── 生命周期层 ──
 * - 无状态服务：每次 createSettingsService 构造独立闭包（路径随 deps 注入）；
 *   不做主题热切换（renderer 读 theme 自行处理）
 *
 * ── 文化层 ──
 * - 裁决书：docs/design/2026-09-18_complexity-governance-ruling.md
 *   裁决 6/§3 梯队四/§4 L1
 * - 测试：tests/unit/ipc/settings.test.ts（受锁零改——6 用例经 ipc 薄分发
 *   透传锁住本件全部公开行为）
 */
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { appSettingsSchema, type AppSettings } from '../../shared/ipc/schemas'
import { ALLOWED_REMOTE_HOSTS, DEFAULT_CONTACT_EMAIL, SETTINGS_FILE_NAME } from '../../shared/constants'
import { atomicWriteFile } from './shared/atomic-write'
import type { ApiHandlers } from '../../shared/ipc/api-surface'

/** 网络诊断探活签名（与 IpcDeps.ping 同形——注入面即现成字段） */
type PingFn = (host: string) => Promise<{ ok: boolean; latencyMs: number }>

const DEFAULTS: AppSettings = { contactEmail: DEFAULT_CONTACT_EMAIL, theme: 'light', uiScale: 'small' }

export function createSettingsService(deps: {
  userDataDir: string
  ping: PingFn
}): Pick<ApiHandlers['settings'], 'get' | 'set' | 'diagNetwork'> {
  const settingsPath = join(deps.userDataDir, SETTINGS_FILE_NAME)

  /** 读文件 → zod 校验；任一环节失败返回默认（损坏文件交由写回覆盖） */
  async function readSettings(): Promise<AppSettings> {
    try {
      const raw = await readFile(settingsPath, 'utf-8')
      const parsedJson: unknown = JSON.parse(raw)
      // T3-P1 读侧平滑迁移：'system' 已退役（A6）——单字段替换后再过 schema，
      // 其余字段（contactEmail/uiScale）原样透传零丢失
      if (
        typeof parsedJson === 'object' &&
        parsedJson !== null &&
        (parsedJson as { theme?: unknown }).theme === 'system'
      ) {
        ;(parsedJson as { theme?: unknown }).theme = 'light'
      }
      const parsed = appSettingsSchema.safeParse(parsedJson)
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
          await atomicWriteFile(settingsPath, `${JSON.stringify(settings, null, 2)}\n`)
        } catch {
          // 目录只读等环境问题：默认值照常返回
        }
      }
      return settings
    },

    async set(req) {
      await atomicWriteFile(settingsPath, `${JSON.stringify(req, null, 2)}\n`)
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
