/**
 * [SR-LIB-07] library.store —— 文献库状态（工单：done / weak）
 *
 * ── 行为层 ──
 * - Zustand store：{ papers: PaperSummary[]; total: number; query: LibraryQuery;
 *     selectedId: string | null; loading: boolean; error: string | null }
 * - load()：unwrap(api.library.list(query))；setQuery(patch) 合并后自动 load
 * - selectPaper(id)；openPaper(id)：切 reader tab（经 ui 事件，见 ReaderPage 规约）
 *
 * ── 接口层 ──
 * - export const useLibraryStore: UseBoundStore<StoreApi<LibraryStore>>
 * - export interface LibraryStore（动作与状态如上）
 *
 * ── 架构层 ──
 * - 只 import api/client 与 shared 模型；禁止 import 组件
 * - 错误契约（全 store 统一）：列表型动作（load 等，持续展示型）失败不抛、保留旧数据，
 *   写 error 字段供内联展示；动作型动作（openPaper/save/diagnose 等，单次触发型）
 *   失败上抛（unwrap 的 ApiClientError），由调用组件 catch 后 toast
 *
 * ── 生命周期层 ── / ── 文化层 ──
 * - 测试：tests/unit/renderer/library.store.test.ts（已锁定，api 桩）
 */
import { create } from 'zustand'
import { api, ApiClientError, unwrap } from '../../api/client'
import type { LibraryQuery, PaperSummary } from '@shared/models/paper'

export interface LibraryStore {
  papers: PaperSummary[]
  total: number
  query: LibraryQuery
  selectedId: string | null
  loading: boolean
  error: string | null
  load(): Promise<void>
  setQuery(patch: Partial<LibraryQuery>): void
  selectPaper(id: string | null): void
}

export function createLibraryStoreInitialState() {
  return {
    papers: [] as PaperSummary[],
    total: 0,
    query: { sort: 'added_desc', offset: 0, limit: 50 } as LibraryQuery,
    selectedId: null as string | null,
    loading: false,
    error: null as string | null
  }
}

/** 列表加载失败的兜底中文消息（仅捕获到非 ApiClientError 的意外异常时使用） */
const LIST_LOAD_FAILED = '文献列表加载失败'

export const useLibraryStore = create<LibraryStore>()((set, get) => ({
  ...createLibraryStoreInitialState(),
  // 列表型错误契约：失败不抛、保留旧 papers/total，写 error 供内联展示
  load: async () => {
    set({ loading: true, error: null })
    try {
      const { items, total } = await unwrap(api.library.list(get().query))
      set({ papers: items, total, loading: false })
    } catch (e) {
      set({
        loading: false,
        error: e instanceof ApiClientError ? e.message : LIST_LOAD_FAILED
      })
    }
  },
  // 合并筛选条件并回到第一页（offset 归零），随后用新查询自动重载
  setQuery: (patch) => {
    set({ query: { ...get().query, ...patch, offset: 0 } })
    void get().load()
  },
  selectPaper: (id) => {
    set({ selectedId: id })
  }
}))
