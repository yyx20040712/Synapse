/**
 * [SR-SET-02] settings.store —— 设置状态（工单：done / weak）
 *
 * ── 行为层 ──
 * - { settings: AppSettings | null; saving: boolean; diag: NetDiagItem[] | null }
 * - load()：api.settings.get({})；带 settings 版本守卫（仅 save 成功落地抬升；
 *   跨通道乱序晚到的旧快照丢弃，失败期间在途 load 照常应用——INV-03 收口）
 * - save(patch)：api.settings.set → 整体替换本地 settings；链式全序（写方向
 *   互斥，INV-03 写方向同族第三变体「同通道写全序」）：并发 save 排队，前一
 *   settle（成功/失败）后才发下一 invoke——落盘序=发出序，终态恒=最后一次
 *   意图；单 save（无并发）直发（invoke 同步即发，行为零变）；链永不断
 *   （中间失败只上抛各自的调用方，不阻塞后继排队者）；
 *   saving=true 的窗口=队列非空（排队等待+在途），inflight 归零才复位
 *   （排队者不闪断——UI 禁点靠 saving 连续）。守卫分层：设置页
 *   runSave/pickScale 的 if(saving) return=第一道门（防常规重复，帧快照有
 *   毫秒窗+两入口互不感知），store 链=第二道（兜毫秒窗+跨入口）
 * - diagnose()：api.settings.diagNetwork({}) → diag
 *
 * ── 接口层 ──
 * - export const useSettingsStore: UseBoundStore<...>
 * - save 签名/错误契约零变：排队只影响 invoke 发出时序，失败仍动作型上抛
 *   各自的调用方（不吞不串）
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

  // save 链式全序（写方向互斥）：ipcMain.handle 对 async handler 不序列化，
  // 并发 save 的 invoke 各自在途，旧全量迟到落盘会整体覆盖新全量（INV-39
  // 「set 必须组装全量」放大此面）→ 档位回跳。链空（null）时直发——单 save
  // 的 invoke 同步即发（锁定用例在 save() 后同步 resolve 桩依赖此形状，行为
  // 零变验收线）；链忙时排队到链尾，前一 settle（成功/失败）后才发下一
  // invoke（落盘序=发出序）。链永不断（run.then 双 noop 吞掉中间失败，错误
  // 由各自调用方 await run 上抛）；inflight 归零才复位 saving 且链清空——
  // save₁ settle 与 save₂ 起跑之间不闪 false（守卫窗）。与 settingsSeq 同层
  // （工厂闭包，单例私有）
  let saveChain: Promise<void> | null = null
  let inflight = 0

  const doSave = async (patch: Partial<AppSettings>): Promise<void> => {
    // 原样透传（锁定测试断言 set 收到的参数恰为 patch）：contactEmail 必填的
    // 前置条件由调用方（设置页）先校验，此处只做类型收窄不做合并
    const saved = await unwrap(
      api.settings.set(patch as Parameters<typeof api.settings.set>[0])
    )
    settingsSeq += 1
    set({ settings: saved })
  }

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
      inflight += 1
      set({ saving: true })
      // 链空直发（单 save 行为零变）；链忙排队（并发互斥的核心）
      const run =
        saveChain === null ? doSave(patch) : saveChain.then(() => doSave(patch))
      saveChain = run.then(() => undefined, () => undefined)
      try {
        await run
      } finally {
        inflight -= 1
        // 归零才复位：排队者存在时 saving 保持 true（不闪断），链同时清空
        if (inflight === 0) {
          saveChain = null
          set({ saving: false })
        }
      }
    },

    async diagnose() {
      const diag = await unwrap(api.settings.diagNetwork({}))
      set({ diag })
    }
  }
})
