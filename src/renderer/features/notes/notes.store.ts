/**
 * [SR-NOTE-02] notes.store —— 笔记编辑状态（工单：done / weak）
 *
 * ── 行为层 ──
 * - { noteByPaper: Record<string, { title: string; contentMd: string; saving: boolean;
 *     savedAt: string | null }> }
 * - load(paperId)：unwrap(api.notes.get) 重建草稿（无笔记 → 空草稿，savedAt=null）；
 *   成功后丢弃此前未保存的编辑
 * - edit(paperId, patch)（同步写草稿）；saveSoon(paperId)（防抖 1.5s，重排重置计时，
 *   只保存最新内容）
 * - 错误契约（全 store 统一）：load 属动作型——失败上抛（unwrap 的 ApiClientError），
 *   由 NotesPanel catch 后 toast；saveSoon 失败时 saving 必须复位且 savedAt 不推进
 *   （= 仍有未保存内容，不静默丢稿），下一次 edit 再次触发 saveSoon 即自然重试
 *
 * ── 接口层 ──
 * - export const useNotesStore: UseBoundStore<...>
 *
 * ── 架构层 ──
 * - 只 import api/client 与 shared 模型；禁止 import 组件
 * - 防抖句柄按 paperId 分键（模块闭包，不进 state）；无笔记/有笔记共用同一草稿槽
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

export const useNotesStore = create<NotesStore>()((set, get) => {
  // 每篇文献一个防抖句柄；换文献互不干扰
  const timers: Record<string, ReturnType<typeof setTimeout>> = {}

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
      const note = await unwrap(api.notes.get({ paperId }))
      setDraft(paperId, {
        title: note?.title ?? '',
        contentMd: note?.contentMd ?? '',
        saving: false,
        savedAt: note?.updatedAt ?? null
      })
    },

    edit(paperId, patch) {
      setDraft(paperId, patch)
    },

    saveSoon(paperId) {
      clearTimer(paperId)
      timers[paperId] = setTimeout(() => {
        delete timers[paperId]
        const draft = get().noteByPaper[paperId]
        if (draft === undefined) {
          return
        }
        setDraft(paperId, { saving: true })
        void unwrap(
          api.notes.save({ paperId, title: draft.title, contentMd: draft.contentMd })
        )
          .then((saved: Note) => {
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
