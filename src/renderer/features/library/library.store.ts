/**
 * [SR-LIB-07] library.store —— 文献库状态（工单：open / weak）
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
 *
 * ── 生命周期层 ── / ── 文化层 ──
 * - 测试：tests/unit/renderer/library.store.test.ts（已锁定，api 桩）
 */
import { create } from 'zustand'
import type { LibraryQuery, PaperSummary } from '@shared/models/paper'
import { NotImplementedError } from '@shared/app-error'

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

const notImpl = (method: string): never => {
  throw new NotImplementedError('SR-LIB-07', `library.store.${method}`)
}

export const useLibraryStore = create<LibraryStore>()(() => ({
  ...createLibraryStoreInitialState(),
  load: () => notImpl('load'),
  setQuery: (_patch) => notImpl('setQuery'),
  selectPaper: (_id) => notImpl('selectPaper')
}))
