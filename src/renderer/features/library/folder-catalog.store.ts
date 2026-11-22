/**
 * [B2① 2026-11-22] folder-catalog.store —— library 域共享目录读面
 * （folders.list 收口单点；设计稿 docs/design/2026-11-22_b2-resource-subscription.md §7）
 *
 * ── 行为层 ──
 * - Zustand store：{ folders, loading, error, invalidations, load() }
 * - load() 单飞：inflight promise 复用——同 tick 多消费面挂载（FolderNav/
 *   ImportDropZone/PaperRowMenu 共挂）=一次 folders.list IPC，并发等待者共享
 *   同一窗口结果；写路径收口链（新建/重命名/删除流 reload）同走此口
 * - folders.changed 订阅单点在 store（消费组件不再自订）：invalidate→load；
 *   在途窗内 changed 合并（脏标）——inflight 完成后按脏标再取一次，保证最终
 *   一致且至多两窗；连发同 tick 合并一次
 * - invalidations：失效沿计数（组件层 changed 派生语义的判别源——FolderNav
 *   「首拉/自驱重载不触发 onMutated、仅失效沿落定后回退判别+联动」的 store
 *   侧等价物；组件按计数差判别，本 store 对派生语义零感知）
 * - 错误契约（全 store 统一）：列表型失败不抛、保留旧 folders，写 error 供
 *   内联展示
 * - changed 订阅登记时机=每次开新取数窗时（读活动重挂——生产面旧订阅先退订，
 *   监听器恒一份）；未开窗前无监听=无数据可失效，语义自洽
 *
 * ── 接口层 ──
 * - export const useFolderCatalog: UseBoundStore<StoreApi<FolderCatalogStore>>
 * - export interface FolderCatalogStore（状态与动作如上）
 *
 * ── 架构层 ──
 * - 只 import api/client 与 shared 模型；禁止 import 组件
 * - 只在 library 域内消费（FolderNav/ImportDropZone/PaperRowMenu）；reader/
 *   lineage 零反向依赖（plan §4.1 红线——NavGraphPicker 的 folders.list 自取
 *   属 lineage 域既有形态，本件不收）
 * - 计数载荷单源不变（RR1-2：全部=Σ folders.paperCount，FolderNav 派生）
 *
 * ── 生命周期层 ── / ── 文化层 ──
 * - 测试：tests/unit/renderer/library-b2-folder-catalog.test.tsx（三消费面
 *   共挂单取/changed 单次重取/计数域/targetFolderId 零重取）
 */
import { create } from 'zustand'
import { api, apiEvents, ApiClientError, unwrap } from '../../api/client'
import type { Folder } from '@shared/models/folder'

export interface FolderCatalogStore {
  /** 目录清单（null=未载——首拉前导航渲染空列表、导入条目标名显 '…'） */
  folders: Folder[] | null
  loading: boolean
  error: string | null
  /** folders.changed 失效沿计数（单调不减；组件层以计数差判别失效沿） */
  invalidations: number
  /** 单飞取数（在途共享；返回当前窗完成 promise——在途时并入既有窗） */
  load(): Promise<void>
}

/** 列表加载失败的兜底中文消息（仅捕获到非 ApiClientError 的意外异常时使用） */
const LIST_LOAD_FAILED = '文件夹列表加载失败'

export const useFolderCatalog = create<FolderCatalogStore>()((set, get) => {
  // 模块内闭包（非 store 态）：单飞在途 promise+changed 合并脏标+订阅退订柄
  // +失效沿同栈合并守卫
  let inflight: Promise<void> | null = null
  let dirty = false
  let unsubChanged: (() => void) | null = null
  let invalidating = false

  // folders.changed 失效沿：失效计数自增（组件层判别源）+取数。在途窗内只置
  // 脏标（合并），inflight 完成后统一再取；空闲时先开窗（load 同步段置
  // loading）再计数——两写同栈，组件层首次渲染即 loading 态，不会以旧数据
  // 提前消费失效沿。同栈连发合并一次（§7）：守卫沿续到微任务边界才解除——
  // 一次广播帧内顺序/重入到达的多次回调（含订阅重挂推送的回调被广播迭代
  // 同轮再访）合并为一次失效；跨帧的先后广播各自独立处理
  function invalidate(): void {
    if (invalidating) return
    invalidating = true
    queueMicrotask(() => {
      invalidating = false
    })
    if (inflight !== null) {
      set((s) => ({ invalidations: s.invalidations + 1 }))
      dirty = true
      return
    }
    void get().load()
    set((s) => ({ invalidations: s.invalidations + 1 }))
  }

  return {
    folders: null,
    loading: false,
    error: null,
    invalidations: 0,
    load: async () => {
      if (inflight !== null) return inflight // 单飞：并发等待者并入在途窗
      // 开新窗=重挂 changed 订阅（读活动重挂——头注「登记时机」条；旧订阅先
      // 退订）。通道缺席（jsdom 测试环境无 preload 桩）时静默跳过——净行为=
      // 基线组件直调的「缺通道即无订阅」，只是不升级为进程级 unhandled
      // rejection（生产 preload 恒在场，本分支生产不可达）
      const changed = apiEvents as Partial<{
        onFoldersChanged(cb: () => void): () => void
      }>
      if (typeof changed?.onFoldersChanged === 'function') {
        unsubChanged?.()
        unsubChanged = changed.onFoldersChanged(invalidate)
      }
      const flight = (async () => {
        set({ loading: true, error: null })
        try {
          const folders = await unwrap(api.folders.list({}))
          set({ folders, loading: false })
        } catch (e) {
          set({
            loading: false,
            error: e instanceof ApiClientError ? e.message : LIST_LOAD_FAILED
          })
        } finally {
          inflight = null
          // 在途窗内 changed 合并：完成后再取一次（最终一致；连发同 tick 一窗）
          if (dirty) {
            dirty = false
            void get().load()
          }
        }
      })()
      inflight = flight
      return flight
    }
  }
})
