/**
 * [SR-NOTE-02] notes.store —— 笔记编辑状态（工单：open / weak）
 *
 * ── 行为层 ──
 * - { noteByPaper: Record<string, { title: string; contentMd: string; saving: boolean;
 *     savedAt: string | null }> }
 * - load(paperId)、edit(paperId, patch)（标记 dirty）、saveSoon(paperId)（防抖 1.5s）
 *
 * ── 接口层 ──
 * - export const useNotesStore: UseBoundStore<...>
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - 测试：tests/unit/renderer/notes.store.test.ts（已锁定，api 桩 + fake timers）
 */
import { create } from 'zustand'
import { NotImplementedError } from '@shared/app-error'
import type { Note } from '@shared/models/note'

export interface NotesStore {
  noteByPaper: Record<string, { title: string; contentMd: string; saving: boolean; savedAt: string | null }>
  load(paperId: string): Promise<void>
  edit(paperId: string, patch: { title?: string; contentMd?: string }): void
  saveSoon(paperId: string): void
}

const notImpl = (method: string): never => {
  throw new NotImplementedError('SR-NOTE-02', `notes.store.${method}`)
}

export const useNotesStore = create<NotesStore>()(() => ({
  noteByPaper: {},
  load: (_id) => notImpl('load'),
  edit: (_id, _patch) => notImpl('edit'),
  saveSoon: (_id) => notImpl('saveSoon')
}))

export type { Note }
