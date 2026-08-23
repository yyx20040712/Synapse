/**
 * [SR-NOTE-02] notes.store —— 笔记编辑状态（工单：done / weak）
 *
 * ── 行为层 ──
 * - { noteByPaper: Record<string, { title: string; contentMd: string; saving: boolean;
 *     savedAt: string | null }> }
 * - load(paperId)：unwrap(api.notes.get) 重建草稿（无笔记 → 空草稿，savedAt=null）；
 *   带请求序号 stale-guard（对齐 library.store）——晚到的旧响应（含旧失败）直接
 *   丢弃。落地不变量：本地存在未保存编辑（模块级 pendingEdit，save 成功清、
 *   失败不清）→ 一律字段级合并——用户碰过的字段保草稿值、未碰过的取服务器、
 *   savedAt 取服务器（无半成品、无整版覆盖，时间先后不参与判定），触碰记录
 *   保留到补存真正落库（save 成功才清），打首载标记并补存挂起编辑；无未保存
 *   编辑 → 整版落地并打首载标记（失败不打——面板禁用无输入，重试成功走合并+补存）
 * - edit(paperId, patch)（同步写草稿；并记模块级编辑时间戳、编辑序号、已触碰
 *   字段与未保存标记）；saveSoon(paperId)（防抖 1.5s，重排重置计时，只保存
 *   最新内容；首载落地前挂起——从未成功载入且草稿含用户编辑时不排程，重开
 *   面板不受影响：既有草稿是完整基线非半成品，正常防抖；save 成功仅在派发
 *   后无新编辑（编辑序号守卫）时清未保存标记与触碰记录）
 * - 错误契约（全 store 统一）：load 属动作型——失败上抛（unwrap 的 ApiClientError），
 *   由 NotesPanel catch 后 toast；saveSoon 失败时 saving 必须复位且 savedAt 不推进
 *   （= 仍有未保存内容，不静默丢稿），下一次 edit 再次触发 saveSoon 即自然重试
 *
 * ── 接口层 ──
 * - export const useNotesStore: UseBoundStore<...>
 *
 * ── 架构层 ──
 * - 只 import api/client 与 shared 模型；禁止 import 组件
 * - 防抖句柄按 paperId 分键（模块闭包，不进 state）；编辑元数据（时间戳/已触碰
 *   字段/首载标记/未保存编辑标记）为模块级 Map/Set——不进 state 亦不入 NoteDraft
 *   导出契约；条目随会话内触碰过的文献线性增长（单用户本地应用为 KB 量级，接受
 *   不驱逐）；无笔记/有笔记共用同一草稿槽
 *
 * ── 生命周期层 ── / ── 文化层 ──
 * - 测试：tests/unit/renderer/notes.store.test.ts（已锁定，api 桩 + fake timers）
 */
import { create } from 'zustand'
import { api, unwrap } from '../../api/client'
import type { Note } from '@shared/models/note'

export interface NoteDraft {
  title: string
  contentMd: string
  saving: boolean
  savedAt: string | null
}

export interface NotesStore {
  noteByPaper: Record<string, NoteDraft>
  load(paperId: string): Promise<void>
  edit(paperId: string, patch: { title?: string; contentMd?: string }): void
  saveSoon(paperId: string): void
}

/** 自动保存防抖窗口（毫秒） */
const SAVE_DEBOUNCE_MS = 1500

const EMPTY_DRAFT: NoteDraft = { title: '', contentMd: '', saving: false, savedAt: null }

/** 每篇文献最近一次 edit 的时刻（Date.now()）——saveSoon 首载门控的判定依据（仅取存在性） */
const lastEditedAt = new Map<string, number>()

/** 每篇文献"用户已触碰字段"（edit 打点；save 成功清/整版落地清，合并路径保留）——字段级合并的依据 */
const touchedFields = new Map<string, { title?: boolean; contentMd?: boolean }>()

/** 已成功落地过服务器基线的文献（load 成功路径打点，失败不打）——首载完成前挂起自动保存的门控 */
const loadedOnce = new Set<string>()

/** 本地存在未保存编辑的文献（edit 打点；save 成功清、失败不清）——load 落地时合并/整版的判定：
 *  不变量——存在未保存编辑一律字段级合并（含"失败→重试成功""防抖窗口内切走切回"等
 *  编辑早于本次 load 的场景），无未保存编辑才整版落地 */
const pendingEdit = new Set<string>()

/** 每篇文献的编辑序号（edit 自增）——save 成功回调比对"派发快照"：派发后又有
 *  新编辑（序号前进）则不清未保存标记，新编辑由重排的防抖保存收尾 */
const editSeq = new Map<string, number>()

export const useNotesStore = create<NotesStore>()((set, get) => {
  // 每篇文献一个防抖句柄；换文献互不干扰
  const timers: Record<string, ReturnType<typeof setTimeout>> = {}

  // 请求序号（store 闭包）：只认最后一次发起的 load（对齐 library.store 的 stale-guard）
  let loadSeq = 0

  const clearTimer = (paperId: string): void => {
    const t = timers[paperId]
    if (t !== undefined) {
      clearTimeout(t)
      delete timers[paperId]
    }
  }

  const draftOf = (paperId: string): NoteDraft => get().noteByPaper[paperId] ?? EMPTY_DRAFT

  const setDraft = (paperId: string, patch: Partial<NoteDraft>): void => {
    set({
      noteByPaper: {
        ...get().noteByPaper,
        [paperId]: { ...draftOf(paperId), ...patch }
      }
    })
  }

  return {
    noteByPaper: {},

    async load(paperId) {
      // 动作型：失败上抛由组件 toast；null 笔记合法（空草稿起步）
      const seq = ++loadSeq
      try {
        const note = await unwrap(api.notes.get({ paperId }))
        // 旧响应晚到（load 已被再次发起）：丢弃，不覆盖新结果/编辑中的草稿
        if (seq !== loadSeq) return
        const serverTitle = note?.title ?? ''
        const serverContent = note?.contentMd ?? ''
        const serverSavedAt = note?.updatedAt ?? null
        // 不变量：本地存在未保存编辑（pendingEdit，含保存失败）→ 一律字段级合并：
        // 碰过的字段保用户输入，未碰过的取服务器，savedAt 取服务器（无半成品、
        // 无整版覆盖）——时间先后不参与判定
        if (pendingEdit.has(paperId)) {
          const draft = get().noteByPaper[paperId] ?? EMPTY_DRAFT
          const touched = touchedFields.get(paperId)
          setDraft(paperId, {
            title: touched?.title ? draft.title : serverTitle,
            contentMd: touched?.contentMd ? draft.contentMd : serverContent,
            saving: false,
            savedAt: serverSavedAt
          })
          // 触碰记录不清：合并后的草稿仍是未落库的用户内容（补存失败或挂起时，
          // 下次合并须继续按 touched 保用户字段）；作废点在 save 成功回调（与
          // 未保存标记同点同条件）
          loadedOnce.add(paperId)
          // 把挂起的用户编辑落库（首载门控吞掉的防抖在此补上；须在 loadedOnce
          // 打点之后调，否则被 saveSoon 门控再次吞掉）
          get().saveSoon(paperId)
          return
        }
        // 整版落地：清"已触碰字段"（无未保存编辑，触碰值已落库/被覆盖，回到同步态语义）
        touchedFields.delete(paperId)
        setDraft(paperId, {
          title: serverTitle,
          contentMd: serverContent,
          saving: false,
          savedAt: serverSavedAt
        })
        loadedOnce.add(paperId)
      } catch (e) {
        // 旧请求的失败同样按迟到丢弃（面板已发起更新的 load），仅最新请求失败上抛
        if (seq !== loadSeq) return
        throw e
      }
    },

    edit(paperId, patch) {
      // 编辑元数据打点（模块级，不入 NoteDraft 契约）：lastEditedAt 供 saveSoon
      // 首载门控，touched 供字段级合并，pendingEdit 标记"本地存在未保存编辑"，
      // editSeq 供保存成功回调判定"派发后是否又有新编辑"
      lastEditedAt.set(paperId, Date.now())
      pendingEdit.add(paperId)
      editSeq.set(paperId, (editSeq.get(paperId) ?? 0) + 1)
      const touched = touchedFields.get(paperId) ?? {}
      if (patch.title !== undefined) touched.title = true
      if (patch.contentMd !== undefined) touched.contentMd = true
      touchedFields.set(paperId, touched)
      setDraft(paperId, patch)
    },

    saveSoon(paperId) {
      // 首载完成前挂起保存：从未成功载入且草稿已含用户编辑（服务器基线未知，
      // 可能半成品——如正文有输入而标题仍空）时不排程自动保存。用户输入由
      // load 的字段级合并保护、落地后补存；load 失败不打卡（面板禁用无输入，
      // 重试成功走合并+补存）。重开面板不受影响：loadedOnce 已打卡，正常防抖
      if (!loadedOnce.has(paperId) && lastEditedAt.has(paperId)) return
      clearTimer(paperId)
      timers[paperId] = setTimeout(() => {
        delete timers[paperId]
        const draft = get().noteByPaper[paperId]
        if (draft === undefined) {
          return
        }
        // 派发快照：本次保存对应的编辑序号（派发后若又有 edit，序号前进）
        const seqAtDispatch = editSeq.get(paperId) ?? 0
        setDraft(paperId, { saving: true })
        void unwrap(
          api.notes.save({ paperId, title: draft.title, contentMd: draft.contentMd })
        )
          .then((saved: Note) => {
            // 编辑已落库：清"未保存编辑"标记与触碰记录（草稿自此等于服务器基线）
            // ——仅当派发后无新编辑（编辑序号未前进）；有新编辑则不清（新编辑仍
            // 受合并保护，由重排的防抖保存收尾）。失败路径不清——仍是未保存，
            // load 继续合并保护
            if ((editSeq.get(paperId) ?? 0) === seqAtDispatch) {
              pendingEdit.delete(paperId)
              touchedFields.delete(paperId)
            }
            setDraft(paperId, { saving: false, savedAt: saved.updatedAt })
          })
          .catch(() => {
            // 失败不推进 savedAt（未保存态延续）；saving 复位后下次 edit→saveSoon 重试
            setDraft(paperId, { saving: false })
          })
      }, SAVE_DEBOUNCE_MS)
    }
  }
})

export type { Note }
