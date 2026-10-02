/**
 * [SR-TAG-03] tags.store —— 标签状态（工单：done / weak + P7E-01）
 *
 * ── 行为层 ──
 * - { tags: Array<Tag & { paperCount: number }>; loading: boolean; error: string | null }
 * - refresh()：api.tags.list
 * - 命令型三动作（P7E-01）：renameTag/mergeTags/deleteTag——
 *   成功→内部 await refresh()（单一数据源自愈）后返回 { ok: true }；
 *   失败→返回 { ok: false, error: AppError }（发起方 toast——不经 store.error
 *   字段，那是列表型 refresh 专用契约）；NOT_FOUND（列表陈旧——他处已删）失败
 *   额外 refresh 自愈，其余错误零 refresh（S6/S7 分流）
 * - 错误契约（全 store 统一）：refresh 属列表型——失败不抛、保留旧 tags；失败信息
 *   记入 error 字段（下次 refresh 发起清空、成功置 null），由消费方（TagEditor/
 *   TagDropdown）watch error toast——错误可达且不重复归责（2026-08-23 Q2-A3 落地）
 *
 * ── 接口层 ──
 * - export const useTagsStore: UseBoundStore<...>
 * - export interface TagsStore；export type TagsMutationResult / TagWithCount
 *
 * ── 架构层 ──
 * - 只 import api/client 与 shared 模型；禁止 import 组件
 * - 消费方：TagEditor（下拉建议）/ TagDropdown（筛选下拉+行右键改名/颜色）——
 *   单一数据源，挂载时 refresh；busy 态局部在发起组件（TagEditor setBusy 同型），
 *   store 不增持久字段
 *
 * ── 生命周期层 ── / ── 文化层 ──
 * - 测试：tests/unit/renderer/tags.store.test.ts（已锁定，api 桩）
 *   + tests/unit/renderer/tags-lifecycle.store.test.ts（P7E-01，always-active）
 */
import { create } from 'zustand'
import { api, unwrap, ApiClientError } from '../../api/client'
import type { AppError, AppErrorCode } from '@shared/app-error'
import type { Tag } from '@shared/models/tag'

/** 带计数的标签行（listWithCounts 形状——组件消费的单一类型来源） */
export type TagWithCount = Tag & { paperCount: number }

/** 命令型动作返回：发起方据 ok 分支 toast（错误不进 store.error） */
export type TagsMutationResult = { ok: true } | { ok: false; error: AppError }

/** 意外异常（非 ApiClientError）时的兜底中文消息（[F-LINT-03] tags 域单源
 *  ——TagEditor 同文案本地声明退役，组件→store import） */
export const TAG_OP_FAILED = '标签操作失败'

export interface TagsStore {
  tags: TagWithCount[]
  loading: boolean
  /** 最近一次 refresh 的失败信息（成功/新发起时清空）——消费方 watch 后 toast */
  error: string | null
  refresh(): Promise<void>
  renameTag(tagId: string, name: string): Promise<TagsMutationResult>
  mergeTags(sourceId: string, targetId: string): Promise<TagsMutationResult>
  deleteTag(tagId: string): Promise<TagsMutationResult>
  /** [F-TAGS-01] 颜色身份（hex|null=恢复默认）——mutate 壳同型 */
  setTagColor(tagId: string, color: string | null): Promise<TagsMutationResult>
}

export const useTagsStore = create<TagsStore>()((set, get) => {
  // 请求序号（store 闭包，对齐 library.store）：TagEditor/TagDropdown 双挂载并发 refresh
  // 时只认最后一次发起的请求——迟到的旧响应（含旧失败）不污染最新 tags/error
  let loadSeq = 0

  /** 命令型动作共用壳：成功链式 refresh；NOT_FOUND 失败自愈 refresh（S7），余零 refresh（S6） */
  async function mutate(run: () => Promise<unknown>): Promise<TagsMutationResult> {
    try {
      await run()
      await get().refresh()
      return { ok: true }
    } catch (e) {
      const error: AppError =
        e instanceof ApiClientError
          ? { code: e.code as AppErrorCode, message: e.message }
          : { code: 'INTERNAL', message: TAG_OP_FAILED }
      // NOT_FOUND=本地列表陈旧（他处已删/已改）——重拉自愈；其余（CONFLICT/
      // INVALID_REQUEST 等）是用户输入问题，零 refresh 保持对话框态（S6）
      if (error.code === 'NOT_FOUND') await get().refresh()
      return { ok: false, error }
    }
  }

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
    },

    renameTag: (tagId, name) => mutate(() => unwrap(api.tags.rename({ tagId, name }))),
    mergeTags: (sourceId, targetId) => mutate(() => unwrap(api.tags.merge({ sourceId, targetId }))),
    deleteTag: (tagId) => mutate(() => unwrap(api.tags.delete({ tagId }))),
    setTagColor: (tagId, color) => mutate(() => unwrap(api.tags.setColor({ tagId, color })))
  }
})
