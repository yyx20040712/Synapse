/**
 * [F-UIRES-01 批 A U4] library-dnd.store —— 文献行拖拽会话态（§2.3/R13）。
 *
 * ── 行为层 ──
 * - { drag: {paperId,title}|null, over: 目标|null, ghostPos: {x,y}|null }
 * - start：dragstart 置位（busy 拒启在 PaperRow 侧）；moveGhost：document
 *   dragover 跟随（ghost 渲染消费）；setOver：左栏行 dragover/dragleave 候选
 *   高亮数据源；end：dragend/drop/busy 上升沿全清
 * - 单选模型（多选拖拽非本票面——载荷恒单 paperId）
 *
 * ── 接口层 ──
 * - export const useLibraryDnd: UseBoundStore<...>
 * - export const PAPER_DRAG_MIME = 'application/x-synapse-paper'（§2.5 DnD
 *   两域判别谓词：左栏行仅响应该 MIME；OS 文件拖入 types 含 Files 不响应）
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - 驻 library feature（消费方=PaperRow/FolderNav/LibraryPage 全本域）；
 *   交互反馈=原生 DnD 事件+CSS 态（≤100ms 预算——禁 JS 节流链）
 */
import { create } from 'zustand'

/** 内部行拖拽自定义 MIME（dragstart 载荷=paperId） */
export const PAPER_DRAG_MIME = 'application/x-synapse-paper'

/** 拖放目标（folder 行/未归档行——「全部文献」=非目标） */
export type DndTarget = { kind: 'folder'; folderId: string; name: string } | { kind: 'unfiled' }

export interface LibraryDndStore {
  drag: { paperId: string; title: string } | null
  over: DndTarget | null
  ghostPos: { x: number; y: number } | null
  start(paper: { paperId: string; title: string }): void
  moveGhost(x: number, y: number): void
  setOver(target: DndTarget | null): void
  end(): void
}

export const useLibraryDnd = create<LibraryDndStore>()((set) => ({
  drag: null,
  over: null,
  ghostPos: null,
  start: (paper) => set({ drag: paper, over: null, ghostPos: null }),
  moveGhost: (x, y) => set({ ghostPos: { x, y } }),
  setOver: (target) => set({ over: target }),
  end: () => set({ drag: null, over: null, ghostPos: null })
}))
