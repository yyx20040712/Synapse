/**
 * [R1-WS2] workspace.store —— 课题域状态（ADR-0018 库级分目录）。
 *
 * ── 行为层（状态机前置）──
 * - { items: WorkspaceItem[]; currentId: string; loading: boolean; error: string | null }
 * - load()：list 驻留 items+currentId（列表型：失败不抛、写 error——App 组合根挂载
 *   即调，受锁 App 级测试 stubApi 无 workspaces 域靠本契约兜住不炸）；带请求
 *   序号 stale-guard（StrictMode 双挂载/library.store 同型）
 * - create(name)：透传 IPC 返回新 id，成功后自动 load 刷新清单（「创建即切」
 *   若被 dirty 取消，新课题仍须出现在侧栏/设置面列表）
 * - rename(id, name)：成功后 items 内即时改名（侧栏与设置面同源生效）
 * - switchTo(id, { dirty })：dirty 聚合值由 App 经 props/回调注入（禁跨域 store
 *   互引——本文件不 import reader/lineage 域）。流程：
 *   幂等（id===currentId 直返）→ dirty 且未确认 → 取消（false，零 IPC）；
 *   确认或无 dirty → api.switch → window.location.reload()（ADR-0018 裁决：
 *   全新 stores 零 stale 态）→ true
 *
 * ── 接口层 ──
 * - export const useWorkspaceStore / selectCurrentName（当前课题名推导 helper）
 *
 * ── 架构层 ──
 * - 只 import api/client 与 shared 模型；禁止 import 组件
 * - 错误契约（全 store 统一）：load 列表型失败不抛写 error；create/rename/
 *   switchTo 动作型失败上抛（unwrap 的 ApiClientError），由调用组件 catch toast
 *
 * ── 生命周期层 ──
 * - 不做：切换动画/课题色标/快捷键（票面 P5）；删除课题（ADR-0018 v1 边界）
 *
 * ── 文化层 ──
 * - 测试：tests/unit/renderer/workspace.store.test.ts（always-active，api 桩）
 */
import { create } from 'zustand'
import { api, ApiClientError, unwrap } from '../../api/client'
import type { WorkspaceItem } from '@shared/ipc/schemas'

/** dirty 确认文案（沿用 main-window 退出守卫「说明+确认？」风格） */
export const SWITCH_DIRTY_TEXT = '切换课题将丢弃未保存的标注/脉络修改。确认切换？'

/** 列表加载失败的兜底中文消息（仅捕获到非 ApiClientError 的意外异常时使用） */
const WS_LIST_FAILED = '课题列表加载失败'

export interface WorkspaceStore {
  items: WorkspaceItem[]
  currentId: string
  loading: boolean
  error: string | null
  load(): Promise<void>
  /** 动作型：失败上抛；返回新课题 id */
  create(name: string): Promise<string>
  /** 动作型：失败上抛；成功后 items 即时改名 */
  rename(id: string, name: string): Promise<void>
  /**
   * 动作型：失败上抛。返回 true=已切换（reload 已触发）；false=幂等或用户
   * 在 dirty 确认中取消（零副作用）。
   */
  switchTo(id: string, opts: { dirty: boolean }): Promise<boolean>
}

export function createWorkspaceStoreInitialState() {
  return { items: [] as WorkspaceItem[], currentId: '', loading: false, error: null as string | null }
}

/** 当前课题名（items+currentId 推导——L0 态 list 合成 default 亦走同一路径） */
export function selectCurrentName(s: Pick<WorkspaceStore, 'items' | 'currentId'>): string {
  return s.items.find((w) => w.id === s.currentId)?.name ?? ''
}

export const useWorkspaceStore = create<WorkspaceStore>()((set, get) => {
  // 请求序号（模块内闭包）：只认最后一次发起的 load（stale-guard）
  let loadSeq = 0
  return {
    ...createWorkspaceStoreInitialState(),
    // 列表型错误契约：失败不抛、保留旧 items，写 error 供内联展示
    load: async () => {
      const seq = ++loadSeq
      set({ loading: true, error: null })
      try {
        const { items, currentId } = await unwrap(api.workspaces.list({}))
        if (seq !== loadSeq) return
        set({ items, currentId, loading: false })
      } catch (e) {
        if (seq !== loadSeq) return
        set({
          loading: false,
          error: e instanceof ApiClientError ? e.message : WS_LIST_FAILED
        })
      }
    },
    create: async (name) => {
      const { id } = await unwrap(api.workspaces.create({ name }))
      // 刷新清单（load 列表型内部自吞错——刷新失败不遮蔽 create 的成功返回）
      await get().load()
      return id
    },
    rename: async (id, name) => {
      await unwrap(api.workspaces.rename({ id, name }))
      set({ items: get().items.map((w) => (w.id === id ? { ...w, name } : w)) })
    },
    switchTo: async (id, { dirty }) => {
      if (id === get().currentId) return false
      if (dirty && !window.confirm(SWITCH_DIRTY_TEXT)) return false
      await unwrap(api.workspaces.switch({ id }))
      // ADR-0018：reload 出全新 stores，跨课题零 stale 态
      window.location.reload()
      return true
    }
  }
})
