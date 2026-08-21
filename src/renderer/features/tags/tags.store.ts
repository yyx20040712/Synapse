/**
 * [SR-TAG-03] tags.store —— 标签状态（工单：open / weak）
 *
 * ── 行为层 ──
 * - { tags: Array<Tag & { paperCount: number }>; loading: boolean }
 * - refresh()：api.tags.list
 * - 错误契约（全 store 统一）：refresh 属列表型——失败不抛、保留旧 tags，由 toast 层
 *   反馈（锁定测试已按此断言）
 *
 * ── 接口层 ──
 * - export const useTagsStore: UseBoundStore<...>
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - 测试：tests/unit/renderer/tags.store.test.ts（已锁定，api 桩）
 */
import { create } from 'zustand'
import { NotImplementedError } from '@shared/app-error'
import type { Tag } from '@shared/models/tag'

export interface TagsStore {
  tags: Array<Tag & { paperCount: number }>
  loading: boolean
  refresh(): Promise<void>
}

const notImpl = (method: string): never => {
  throw new NotImplementedError('SR-TAG-03', `tags.store.${method}`)
}

export const useTagsStore = create<TagsStore>()(() => ({
  tags: [],
  loading: false,
  refresh: () => notImpl('refresh')
}))
