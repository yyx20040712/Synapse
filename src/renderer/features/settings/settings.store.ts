/**
 * [SR-SET-02] settings.store —— 设置状态（工单：open / weak）
 *
 * ── 行为层 ──
 * - { settings: AppSettings | null; saving: boolean; diag: NetDiagItem[] | null }
 * - load()：api.settings.get({})；save(patch)：api.settings.set → 更新本地
 * - diagnose()：api.settings.diagNetwork({}) → diag
 *
 * ── 接口层 ──
 * - export const useSettingsStore: UseBoundStore<...>
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - 测试：tests/unit/renderer/settings.store.test.ts（已锁定，api 桩）
 */
import { create } from 'zustand'
import { NotImplementedError } from '@shared/app-error'
import type { AppSettings } from '@shared/ipc/schemas'

export interface SettingsStore {
  settings: AppSettings | null
  saving: boolean
  load(): Promise<void>
  save(patch: Partial<AppSettings>): Promise<void>
}

const notImpl = (method: string): never => {
  throw new NotImplementedError('SR-SET-02', `settings.store.${method}`)
}

export const useSettingsStore = create<SettingsStore>()(() => ({
  settings: null,
  saving: false,
  load: () => notImpl('load'),
  save: (_patch) => notImpl('save')
}))
