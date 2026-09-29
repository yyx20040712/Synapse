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
 *   互引——本文件不 import reader/lineage 域；唯一受控例外=notes.store：本
 *   函数兼任切课题弃改收口点，A3/INV-35④ 显式防悬置写——check-quality
 *   COMPOSITION_ROOT_ALLOW 白名单在案，workspaces 域其余文件引 notes 仍是
 *   红线）。流程：
 *   幂等（id===currentId 直返）→ dirty 且未确认 → 取消（false，零 IPC）；
 *   确认或无 dirty → discardAllPendingEdits（弃置全部 notes 悬置编辑——
 *   reload 前零 timer 零内存草稿，clean 直达=no-op 幂等）→ api.switch →
 *   window.location.reload()（ADR-0018 裁决：全新 stores 零 stale 态）→ true
 *
 * ── 接口层 ──
 * - export const useWorkspaceStore / selectCurrentName（当前课题名推导 helper）
 * - [F-WS-02] isGuideState / selectDisplayWsName / WS_GUIDE_LABEL（默认课题
 *   引导态判定与显示名推导——INV-87；rail 标签/状态条消费）
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
import { DEFAULT_WS_ID, DEFAULT_WS_NAME } from '@shared/constants'
import { useNotesStore } from '../notes/notes.store'

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

// ── [F-WS-02] 默认课题引导态（INV-87——D2 批语「默认课题显示为待选择」）──
/** 引导态显示名（三条件成立时的课题名显示位取值；管理页卡片显示实名不受
 *  此影响——本页外显示位=rail 标签/状态条） */
export const WS_GUIDE_LABEL = '待选择'

/** 引导态三条件判定（纯推导无独立存储）：当前课题=default ∧ paperCount=0
 *  ∧ name=默认名单源常量（DEFAULT_WS_NAME——shared/constants）。任一打破
 *  即升格实名显示（改名/导入计数/切非 default 三路，升格后可逆回——用户
 *  把 default 改回默认名且 0 篇即回引导态，按三条件字面诚实判定）。 */
export function isGuideState(s: Pick<WorkspaceStore, 'items' | 'currentId'>): boolean {
  const cur = s.items.find((w) => w.id === s.currentId)
  return (
    cur !== undefined &&
    cur.id === DEFAULT_WS_ID &&
    cur.paperCount === 0 &&
    cur.name === DEFAULT_WS_NAME
  )
}

/** 课题名显示位推导（rail 标签/状态条消费）：引导态=待选择，否则当前实名；
 *  无当前课题=空串（调用方各自兜底） */
export function selectDisplayWsName(s: Pick<WorkspaceStore, 'items' | 'currentId'>): string {
  return isGuideState(s) ? WS_GUIDE_LABEL : selectCurrentName(s)
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
      // 弃改收口（A3/INV-35④ 显式防悬置写）：确认通过即弃置全部 notes 悬置
      // 编辑（含清防抖句柄+在途 save 代际守卫打点）——reload 前零 timer 零内存
      // 草稿，切课题悬置写 renderer 面闭（clean 直达=no-op 幂等）
      useNotesStore.getState().discardAllPendingEdits()
      await unwrap(api.workspaces.switch({ id }))
      // ADR-0018：reload 出全新 stores，跨课题零 stale 态
      window.location.reload()
      return true
    }
  }
})
