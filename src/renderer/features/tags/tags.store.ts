/**
 * [SR-TAG-03] tags.store —— 标签状态（工单：done / weak）
 *
 * ── 行为层 ──
 * - { tags: Array<Tag & { paperCount: number }>; loading: boolean; error: string | null }
 * - refresh()：api.tags.list
 * - 错误契约（全 store 统一）：refresh 属列表型——失败不抛、保留旧 tags；失败信息
 *   记入 error 字段（下次 refresh 发起清空、成功置 null），由消费方（TagEditor/
 *   TagFilter）watch error toast——错误可达且不重复归责（2026-08-23 Q2-A3 落地）
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
  /** 最近一次 refresh 的失败信息（成功/新发起时清空）——消费方 watch 后 toast */
  error: string | null
  refresh(): Promise<void>
}

export const useTagsStore = create<TagsStore>()((set) => {
  // 请求序号（store 闭包，对齐 library.store）：TagEditor/TagFilter 双挂载并发 refresh
  // 时只认最后一次发起的请求——迟到的旧响应（含旧失败）不污染最新 tags/error
  let loadSeq = 0
  return {
    tags: [],
    loading: false,
    error: null,

    refresh: async () => {
      const seq = ++loadSeq
      set({ loading: true, error: null })
      try {
        const tags = await unwrap(api.tags.list({}))
        if (seq !== loadSeq) return
        set({ tags, loading: false, error: null })
      } catch (e) {
        if (seq !== loadSeq) return
        // 列表型错误契约：不抛、保留旧 tags（loading 复位），失败信息经 error 字段
        // 暴露——消费方 watch toast（store 不 import UI 模块，分层单向）
        set({
          loading: false,
          error: e instanceof Error && e.message !== '' ? e.message : '标签列表刷新失败'
        })
      }
    }
  }
})
