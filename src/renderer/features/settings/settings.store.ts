/**
 * [SR-SET-02] settings.store —— 设置状态（工单：done / weak）
 *
 * ── 行为层 ──
 * - { settings: AppSettings | null; saving: boolean; diag: NetDiagItem[] | null }
 * - load()：api.settings.get({})；带 settings 版本守卫（仅 save 成功落地抬升；
 *   跨通道乱序晚到的旧快照丢弃，失败期间在途 load 照常应用——INV-03 收口）
 * - save(patch)：api.settings.set → 整体替换本地 settings
 * - diagnose()：api.settings.diagNetwork({}) → diag
 *
 * ── 接口层 ──
 * - export const useSettingsStore: UseBoundStore<...>
 *
 * ── 架构层 ──
 * - 只 import api/client 与 shared 模型；禁止 import 组件
 * - 错误契约（全 store 统一）：load/save/diagnose 均动作型——失败上抛（unwrap 的
 *   ApiClientError），由设置页 catch 后 toast；saving 在 finally 复位（失败不卡死）
 *
 * ── 生命周期层 ── / ── 文化层 ──
 * - 测试：tests/unit/renderer/settings.store.test.ts（已锁定，api 桩）
 */
import { create } from 'zustand'
import type { z } from 'zod'
import { api, unwrap } from '../../api/client'
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

export const useSettingsStore = create<SettingsStore>()((set) => {
  // settings 版本计数（store 闭包，INV-03 settings 侧收口）：ipc/settings 的 get/set
  // 是异步处理器，ipcMain.handle 不保证跨通道回复有序——load 的旧快照可能晚于
  // save 的落地到达。仅在 save 成功落地时抬一次版本：晚于成功点到达的一切在途
  // load 快照作废（跨通道乱序两类窗由此全覆盖）；成功点之前到达的照常应用（瞬态
  // 旧值，save 落地无条件覆盖纠正终态）；save 失败不抬版本——失败期间在途 load
  // 读到的就是持久层（settings.json）真值，应用是真话。diagnose 切片独立不读
  // settings 且页面有 busy 守卫，不参与本计数
  let settingsSeq = 0

  return {
    settings: null,
    saving: false,
    diag: null,

    async load() {
      const seq = settingsSeq
      const settings = await unwrap(api.settings.get({}))
      // 版本已前进（save 已成功落地）：本快照过期，丢弃
      if (seq !== settingsSeq) return
      set({ settings })
    },

    async save(patch) {
      set({ saving: true })
      try {
        // 原样透传（锁定测试断言 set 收到的参数恰为 patch）：contactEmail 必填的
        // 前置条件由调用方（设置页）先校验，此处只做类型收窄不做合并
        const saved = await unwrap(
          api.settings.set(patch as Parameters<typeof api.settings.set>[0])
        )
        settingsSeq += 1
        set({ settings: saved })
      } finally {
        set({ saving: false })
      }
    },

    async diagnose() {
      const diag = await unwrap(api.settings.diagNetwork({}))
      set({ diag })
    }
  }
})
