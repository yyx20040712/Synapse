/**
 * [SR-TAG-03 / F-DBCAMP-01 DB-4 R1] tags.store —— 标签状态（工单：done /
 * weak + P7E-01 + 域分桶）。
 *
 * ── 行为层 ──
 * - loading 未分桶=惰性面（现行两消费组件均不读；分桶化=出现消费面时随做）
 * - { tagsByFolder: Record<folderId, TagWithCount[]>（[R1] 域分桶——Map 语义
 *   的 Record 承载：FilterBar 域与 detail.folderId 域双挂载两桶并存互不覆写，
 *   原「只认最后一次发起的请求」跨域覆写自认面消除）; loading: boolean;
 *   errorByFolder: Record<folderId, string|null>（分桶 error 面） }
 * - refresh(folderId)：api.tags.list({folderId})——[F-TAGS-02/DB-1 U4] 域参化
 *   （019 起标签按文件夹完全隔离；list Req=folderId 必填）；[R1] 请求序号
 *   分桶化（seqByFolder——迟到的旧响应只可能落自己桶，且不覆写本桶最新）
 * - 命令型三动作（P7E-01）：renameTag/mergeTags/deleteTag——成功→内部 await
 *   refresh(域参)（单一数据源自愈）后返回 { ok: true }；失败→返回
 *   { ok: false, error: AppError }（发起方 toast——不经 errorByFolder 字段）；
 *   NOT_FOUND（列表陈旧——他处已删）失败额外 refresh 自愈，其余错误零
 *   refresh（S6/S7 分流）。[R1] 域参=第三可选参 folderId（发起组件显式传
 *   ——TagDropdown/TagEditor/TagDropdownRow 均有所在域；缺省=最近一次
 *   refresh 的域，旧调用面兼容）
 * - 错误契约（全 store 统一）：refresh 属列表型——失败不抛、保留旧 tags；
 *   失败信息记入该桶 errorByFolder（下次 refresh 发起清空、成功置 null），
 *   由消费方（TagEditor/TagDropdown）按自身域 watch toast——错误可达且
 *   不重复归责（2026-08-23 Q2-A3 落地；[R1] 分桶后他域失败不触发本域 toast）
 *
 * ── 接口层 ──
 * - export const useTagsStore: UseBoundStore<...>
 * - export interface TagsStore；export type TagsMutationResult / TagWithCount
 * - export const EMPTY_TAGS（选择器缺桶稳定空数组——防每次渲染新引用）
 *
 * ── 架构层 ──
 * - 只 import api/client 与 shared 模型；禁止 import 组件
 * - 消费方：TagEditor（下拉建议）/ TagDropdown（筛选下拉+行编辑态改名/取色
 *   [F-UIRES-03 B1——右键链已随 TagRowMenu 退役]）/TagDeleteConfirm（删除链）
 *   ——单一数据源，挂载时 refresh 自身域；busy 态局部在发起组件
 *   （TagEditor setBusy 同型），store 不增持久字段
 *
 * ── 生命周期层 ── / ── 文化层 ──
 * - 测试：tests/unit/renderer/tags.store.test.ts（已锁定，api 桩——[R1] 分桶
 *   断言面随链更新）+ tags-store-domains.test.ts（[R1] 域分桶 always-active）
 *   + tags-lifecycle.store.test.ts（P7E-01，always-active）
 */
import { create } from 'zustand'
import { api, unwrap, ApiClientError } from '../../api/client'
import type { AppError, AppErrorCode } from '@shared/app-error'
import type { Tag } from '@shared/models/tag'
// [R2/回炉轮1] 默认域常量单源（MAIN_GRAPH_ID——FilterBar 同批先例，禁主图 id 字面量对齐）
import { MAIN_GRAPH_ID } from '@shared/models/lineage'

/** 带计数的标签行（listWithCounts 形状——组件消费的单一类型来源） */
export type TagWithCount = Tag & { paperCount: number }

/** 命令型动作返回：发起方据 ok 分支 toast（错误不进 store.error） */
export type TagsMutationResult = { ok: true } | { ok: false; error: AppError }

/** [R1] 选择器缺桶回退的稳定空数组（每次渲染同引用——防无谓重渲染） */
export const EMPTY_TAGS: TagWithCount[] = []

/** 意外异常（非 ApiClientError）时的兜底中文消息（[F-LINT-03] tags 域单源
 *  ——TagEditor 同文案本地声明退役，组件→store import） */
export const TAG_OP_FAILED = '标签操作失败'

export interface TagsStore {
  /** [R1] 域分桶：键=folderId（标签域——019 完全隔离），值=该域标签列表 */
  tagsByFolder: Record<string, TagWithCount[]>
  loading: boolean
  /** [R1] 分桶 refresh 失败信息（成功/新发起时清空该桶）——消费方按自身域 watch toast */
  errorByFolder: Record<string, string | null>
  /** [F-TAGS-02/DB-1 U4] 域参化：刷新该文件夹的标签域（默认域=主图——
   *  未选文件夹时标签默认域=主图，门一 N1 口径） */
  refresh(folderId: string): Promise<void>
  renameTag(tagId: string, name: string, folderId?: string): Promise<TagsMutationResult>
  mergeTags(sourceId: string, targetId: string, folderId?: string): Promise<TagsMutationResult>
  deleteTag(tagId: string, folderId?: string): Promise<TagsMutationResult>
  /** [F-TAGS-01] 颜色身份（hex|null=恢复默认）——mutate 壳同型 */
  setTagColor(tagId: string, color: string | null, folderId?: string): Promise<TagsMutationResult>
}

export const useTagsStore = create<TagsStore>()((set, get) => {
  // [R1] 请求序号分桶化（store 闭包，对齐 library.store stale-guard 语义——
  // 按桶计数）：同桶并发 refresh 只认最后一次发起；他桶响应零关涉
  const seqByFolder = new Map<string, number>()
  // [F-TAGS-02/DB-1 U4] 最近一次 refresh 的域（mutate 链式 refresh 缺省域参——
  // 命令型动作是 id 类操作；默认=主图；[R1] 发起组件显式传域参时以此兜底不再依赖）
  let lastFolderId = MAIN_GRAPH_ID

  /** 命令型动作共用壳：成功链式 refresh（显式域参或缺省最近域）；NOT_FOUND
   *  失败自愈 refresh（S7），余零 refresh（S6） */
  async function mutate(
    run: () => Promise<unknown>,
    folderId: string | undefined
  ): Promise<TagsMutationResult> {
    const target = folderId ?? lastFolderId
    try {
      await run()
      await get().refresh(target)
      return { ok: true }
    } catch (e) {
      const error: AppError =
        e instanceof ApiClientError
          ? { code: e.code as AppErrorCode, message: e.message }
          : { code: 'INTERNAL', message: TAG_OP_FAILED }
      // NOT_FOUND=本地列表陈旧（他处已删/已改）——重拉自愈；其余（CONFLICT/
      // INVALID_REQUEST 等）是用户输入问题，零 refresh 保持对话框态（S6）
      if (error.code === 'NOT_FOUND') await get().refresh(target)
      return { ok: false, error }
    }
  }

  return {
    tagsByFolder: {},
    loading: false,
    errorByFolder: {},

    refresh: async (folderId: string) => {
      const seq = (seqByFolder.get(folderId) ?? 0) + 1
      seqByFolder.set(folderId, seq)
      lastFolderId = folderId
      set({ loading: true, errorByFolder: { ...get().errorByFolder, [folderId]: null } })
      try {
        const tags = await unwrap(api.tags.list({ folderId }))
        if (seq !== (seqByFolder.get(folderId) ?? 0)) return
        set({ tagsByFolder: { ...get().tagsByFolder, [folderId]: tags }, loading: false })
      } catch (e) {
        if (seq !== (seqByFolder.get(folderId) ?? 0)) return
        // 列表型错误契约：不抛、保留旧 tags（loading 复位），失败信息经分桶
        // error 暴露——消费方按自身域 watch toast（store 不 import UI 模块）
        set({
          loading: false,
          errorByFolder: {
            ...get().errorByFolder,
            [folderId]:
              e instanceof Error && e.message !== '' ? e.message : '标签列表刷新失败'
          }
        })
      }
    },

    renameTag: (tagId, name, folderId) =>
      mutate(() => unwrap(api.tags.rename({ tagId, name })), folderId),
    mergeTags: (sourceId, targetId, folderId) =>
      mutate(() => unwrap(api.tags.merge({ sourceId, targetId })), folderId),
    deleteTag: (tagId, folderId) => mutate(() => unwrap(api.tags.delete({ tagId })), folderId),
    setTagColor: (tagId, color, folderId) =>
      mutate(() => unwrap(api.tags.setColor({ tagId, color })), folderId)
  }
})
