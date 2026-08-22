/**
 * [SR-TAG-03] tags.store —— 标签状态（工单：done / weak）
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
 * ── 架构层 ──
 * - 只 import api/client 与 shared 模型；禁止 import 组件
 * - 消费方：TagEditor（下拉建议）/ TagFilter（筛选 chip）——单一数据源，挂载时 refresh
 *
 * ── 生命周期层 ── / ── 文化层 ──
 * - 测试：tests/unit/renderer/tags.store.test.ts（已锁定，api 桩）
 */
import { create } from 'zustand'
import { api, unwrap } from '../../api/client'
import type { Tag } from '@shared/models/tag'

export interface TagsStore {
  tags: Array<Tag & { paperCount: number }>
  loading: boolean
  refresh(): Promise<void>
}

export const useTagsStore = create<TagsStore>()((set) => ({
  tags: [],
  loading: false,

  refresh: async () => {
    set({ loading: true })
    try {
      const tags = await unwrap(api.tags.list({}))
      set({ tags, loading: false })
    } catch {
      // 列表型错误契约：不抛、保留旧 tags（loading 复位），失败反馈归 toast 层
      set({ loading: false })
    }
  }
}))
