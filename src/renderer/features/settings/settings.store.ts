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
import type { z } from 'zod'
import { NotImplementedError } from '@shared/app-error'
import type { netDiagItemSchema, AppSettings } from '@shared/ipc/schemas'

/** 诊断条目类型从 schema 推导（单一真相源，不手写第二份） */
export type NetDiagItem = z.infer<typeof netDiagItemSchema>

export interface SettingsStore {
  settings: AppSettings | null
  saving: boolean
  diag: NetDiagItem[] | null
  load(): Promise<void>
  save(patch: Partial<AppSettings>): Promise<void>
  /** 动作型：失败上抛（unwrap 的 ApiClientError），由设置页 catch 后 toast */
  diagnose(): Promise<void>
}

const notImpl = (method: string): never => {
  throw new NotImplementedError('SR-SET-02', `settings.store.${method}`)
}

export const useSettingsStore = create<SettingsStore>()(() => ({
  settings: null,
  saving: false,
  diag: null,
  load: () => notImpl('load'),
  save: (_patch) => notImpl('save'),
  diagnose: () => notImpl('diagnose')
}))
