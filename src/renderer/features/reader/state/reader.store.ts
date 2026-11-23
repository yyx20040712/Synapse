// b3: P7-B
/**
 * [SR2-TABS-01] reader.store —— per-tab 多文献状态（[B4-A R1] store 薄壳；装载机
 * 驻 reader-store-load、操作层执行驻 reader-history-commands）。tab 生命周期
 * 状态机与竞态守卫（INV-03 三规则在 load 件）；closeOne 接缝清理=进度账+操作
 * 双栈+文本历史+写链+装载账（§3 关闭 tab 行）；undo/redo=await 协调链→本件增量
 * apply（await 后重读现态——并发编辑不覆盖）→失败 toast；PDF 未 ready 为 no-op
 * （§2.5 #12）。测试=reader.store.test（受锁）+undo-race 回归锁。
 */
import { create } from 'zustand'
import type { Annotation, AnnotationColor } from '@shared/models/annotation'
import { clearStack, type OpApply } from './annotation-undo'
import { redoTabOperations, undoTabOperations, type OpHistoryOutcome } from './reader-history-commands'
import { showToast } from '../../../shared/ui/toast-store'
import type { TabState } from './tab-state'
import { createReaderLoad } from './reader-store-load'
import { clearAllTextHistory, clearTabTextHistory } from './reader-text-history'
import { laneClearTab } from '../../../shared/tab-write-lane'
import type { TabClosingState } from './tab-state'

// [B1 批] TabState/makeLoadingTab 拆驻 tab-state.ts（store 增研究面板字段
// 前置瘦身）；再导出保持既有 import 面（factories/useActiveTab 等）零迁移
export type { TabState } from './tab-state'

export interface ProgressFlusher {
  flush(paperId: string): void
  flushAll(): void
}

export interface ReaderStore {
  tabs: Record<string, TabState>
  order: string[]
  activeId: string | null
  progressFlusher: ProgressFlusher | null
  registerProgressFlusher(f: ProgressFlusher | null): void
  /** 程序跳页滚动信号（F-01 双源/INV-29；'none'=回写不 bump 防回弹） */
  scrollRequest: { paperId: string; page: number; seq: number } | null
  /** 标注单击反向同步信号（C-05）：seq 递增触发消费方 effect */
  noteHighlight: { annotationId: string; seq: number } | null
  researchOpen: boolean
  setResearchOpen(open: boolean): void
  setResearchTab(tab: 'ai' | 'notes'): void
  saveResearchScroll(paperId: string, tab: 'ai' | 'notes', scrollTop: number): void
  openPaper(id: string): Promise<void>
  activateTab(id: string): void
  closeTab(id: string): void
  close(): void
  setPage(page: number, opts?: { scroll?: 'to' | 'none' }): void
  setZoom(zoom: number): void
  setTotalPages(total: number): void
  setColor(color: AnnotationColor): void
  setSelectionMode(mode: boolean): void
  setPageLayout(layout: 'single' | 'double'): void
  /** 标注追加（F-SL）：per-paperId 寻址不读 activeId（幽灵标注守卫） */
  addAnnotation(paperId: string, a: Annotation): void
  /** [B4-A R2 §2.5 #19] 迟到回显改/删写标注归属的原 tab（不读 activeId）：update
   *  按回显携带的 paperId 寻址；remove 按标注 id 定位归属 tab（addAnnotation 同族） */
  updateAnnotation(a: Annotation): void
  removeAnnotation(id: string): void
  markTabDirty(paperId: string): void
  clearTabDirty(paperId: string): void
  /** [B4-A R2 §2.5 #1-#2/#16-#17] 未定稿轴置位+editRevision 递增（新编辑/undo/
   *  redo/操作单元提交的统一写点——灰点/rail 阅读器角标单源） */
  markTabUnfinalized(paperId: string): void
  /** [B4-A R2 §2.5 #21-#22] finalize 成功回执的清账：atRevision=finalize 入口捕获
   *  的 editRevision；期间有新编辑（revision 前进）不清——旧保存回执不得误清
   *  新编辑灰点 */
  finalizeTabUnfinalized(paperId: string, atRevision: number): void
  /** [B4-A R2 §2.5 #24-#29] 关闭子态写点（reader-close-tab 状态机单写方） */
  setTabClosing(paperId: string, closing: TabClosingState): void
  markTabError(paperId: string): void
  notifyNoteHighlight(annotationId: string): void
  /** 操作层 undo/redo（await 协调链→本件增量 apply）；返回完整动作成功；PDF 未 ready 即拒（§2.5 #12） */
  undo(): Promise<boolean>
  redo(): Promise<boolean>
}

export function createReaderStoreInitialState() {
  return {
    tabs: {} as Record<string, TabState>,
    order: [] as string[],
    activeId: null as string | null,
    progressFlusher: null as ProgressFlusher | null,
    scrollRequest: null as { paperId: string; page: number; seq: number } | null,
    noteHighlight: null as { annotationId: string; seq: number } | null,
    researchOpen: true // [B1 批] 会话级视图态——切视图不清
  }
}

export const useReaderStore = create<ReaderStore>()((set, get) => {
  // [B4-A R1 §11.1 拆件] 加载机迁驻 reader-store-load.ts（行为零变）
  const loader = createReaderLoad(set, get)

  // tab 寻址写：updateActiveTab=作用于 active tab（activeId=null no-op）；
  // updateTabById=显式 paperId 寻址（tab 缺席 no-op——F-SL/TABS-03 写方向同族）
  const updateActiveTab = (fn: (tab: TabState) => TabState): void => {
    updateTabById(get().activeId, fn)
  }
  const updateTabById = (id: string | null, fn: (tab: TabState) => TabState): void => {
    if (id === null) return
    const { tabs } = get()
    const tab = tabs[id]
    if (tab === undefined) return
    set({ tabs: { ...tabs, [id]: fn(tab) } })
  }

  /** 关单个 tab：进度账 flush；操作双栈/文本历史/写链/装载账同接缝清理（§3 关闭 tab 行） */
  const closeOne = (id: string): void => {
    get().progressFlusher?.flush(id)
    loader.forget(id)
    clearStack(id)
    clearTabTextHistory(id)
    laneClearTab(id)
    const { tabs, order, activeId, scrollRequest, noteHighlight } = get()
    const nextTabs = { ...tabs }
    delete nextTabs[id]
    const nextOrder = order.filter((x) => x !== id)
    let nextActive = activeId
    if (activeId === id) {
      const idx = order.indexOf(id)
      nextActive = nextOrder[idx] ?? nextOrder[idx - 1] ?? null
    }
    set({
      tabs: nextTabs,
      order: nextOrder,
      activeId: nextActive,
      // F-ARCH1：瞬态信号随 tab 关闭失效——scrollRequest 有 paperId 维度仅清
      // 属被关 tab 的；noteHighlight 无归属维度仅关激活 tab 时清（门一 W-1，
      // 残留会被新 tab 生命周期消费）；[F-UIRES-03 B2] AI 信号清理随退役删除
      ...(scrollRequest?.paperId === id ? { scrollRequest: null } : {}),
      ...(activeId === id && noteHighlight !== null ? { noteHighlight: null } : {})
    })
  }

  // 关闭全部（App 切视图/全关语义）：全部进度账落账后整体复位
  const closeAll = (): void => {
    get().progressFlusher?.flushAll()
    loader.forgetAll()
    for (const id of get().order) {
      clearStack(id)
      laneClearTab(id)
    }
    clearAllTextHistory()
    set(createReaderStoreInitialState())
  }

  return {
    ...createReaderStoreInitialState(),

    openPaper(id) {
      return loader.openPaper(id)
    },

    activateTab(id) {
      if (get().tabs[id] === undefined) return
      set({ activeId: id })
    },

    registerProgressFlusher(f) {
      set({ progressFlusher: f })
    },

    closeTab(id) {
      closeOne(id)
    },

    close() {
      closeAll()
    },

    setPage(page, opts) {
      // 0 基页码夹取；totalPages=0 不夹上界（INV-118 早到页码不吞）
      const { activeId } = get()
      if (activeId === null) return
      const tab = get().tabs[activeId]
      if (tab === undefined) return
      const clamped =
        tab.totalPages > 0
          ? Math.max(0, Math.min(Math.floor(page), tab.totalPages - 1))
          : Math.max(0, Math.floor(page))
      set((s) => ({
        tabs: { ...s.tabs, [activeId]: { ...tab, page: clamped } },
        ...(opts?.scroll !== 'none'
          ? { scrollRequest: { paperId: activeId, page: clamped, seq: (s.scrollRequest?.seq ?? 0) + 1 } }
          : {})
      }))
      // 进度记账/防抖已拆至 scroll-progress（F-03）
    },

    setZoom(zoom) {
      updateActiveTab((tab) => ({ ...tab, zoom: Math.min(3, Math.max(0.5, zoom)) }))
    },

    setTotalPages(total) {
      // totalPages 落定=页码侧收敛点（INV-118）：landed>0 夹回驻留超界页码；
      // landed=0 page 不动（守卫窗口语义——未就绪 0 与真 0 不可区分，格 e）；
      // scrollRequest 不 bump（滚动侧 clampPageToColumn 自夹——格 d）
      const landed = Math.max(0, Math.floor(total))
      updateActiveTab((tab) => ({
        ...tab,
        totalPages: landed,
        page: landed > 0 ? Math.max(0, Math.min(tab.page, landed - 1)) : tab.page
      }))
    },

    setColor(color) {
      updateActiveTab((tab) => ({ ...tab, color }))
    },

    setSelectionMode(mode) {
      updateActiveTab((tab) => ({ ...tab, selectionMode: mode }))
    },

    setPageLayout(layout) {
      updateActiveTab((tab) => ({ ...tab, pageLayout: layout }))
    },

    addAnnotation(paperId, a) {
      updateTabById(paperId, (t) => ({ ...t, annotations: [...t.annotations, a] })) // F-SL 寻址守卫
    },

    updateAnnotation(a) {
      updateTabById(a.paperId, (tab) => ({
        ...tab,
        annotations: tab.annotations.map((x) => (x.id === a.id ? a : x))
      }))
    },

    removeAnnotation(id) {
      for (const [paperId, tab] of Object.entries(get().tabs)) {
        if (!tab.annotations.some((x) => x.id === id)) continue
        updateTabById(paperId, (t) => ({
          ...t,
          annotations: t.annotations.filter((x) => x.id !== id)
        }))
        return
      }
    },

    markTabDirty(paperId) {
      updateTabById(paperId, (t) => ({ ...t, dirty: true }))
    },

    clearTabDirty(paperId) {
      updateTabById(paperId, (t) => ({ ...t, dirty: false }))
    },

    markTabUnfinalized(paperId) {
      updateTabById(paperId, (t) => ({
        ...t,
        unfinalized: true,
        editRevision: (t.editRevision ?? 0) + 1
      }))
    },

    finalizeTabUnfinalized(paperId, atRevision) {
      updateTabById(paperId, (t) =>
        (t.editRevision ?? 0) === atRevision ? { ...t, unfinalized: false } : t
      )
    },

    setTabClosing(paperId, closing) {
      updateTabById(paperId, (t) => ({ ...t, closing }))
    },

    markTabError(paperId) {
      updateTabById(paperId, (t) => (t.status === 'error' ? t : { ...t, status: 'error' }))
    },

    notifyNoteHighlight(annotationId) {
      const prev = get().noteHighlight
      set({ noteHighlight: { annotationId, seq: (prev?.seq ?? 0) + 1 } })
    },

    setResearchOpen(open) {
      set({ researchOpen: open })
    },

    setResearchTab(tab) {
      updateActiveTab((t) => ({ ...t, researchTab: tab }))
    },

    saveResearchScroll(paperId, tab, scrollTop) {
      updateTabById(paperId, (t) => ({ ...t, researchScroll: { ...t.researchScroll, [tab]: Math.max(0, scrollTop) } }))
    },

    undo() {
      return applyOpHistory('undo')
    },

    redo() {
      return applyOpHistory('redo')
    }
  }

  // 操作层 undo/redo 共用收口（paperId await 前捕获——期间切 tab 不误落）：
  // 执行（起步入链复合任务〔裸预 flush→反向写〕+settle+代际失效在 commands）→ store 同步 →
  // 失败 toast；返回完整动作成功
  async function applyOpHistory(direction: 'undo' | 'redo'): Promise<boolean> {
    const before = get()
    const paperId = before.activeId
    // §2.5 #12 no-op 判据：PDF 未 ready（tab 缺席/loading/error）不触历史命令
    if (paperId === null || before.tabs[paperId]?.status !== 'ready') return false
    let outcome: OpHistoryOutcome
    try {
      outcome = direction === 'undo' ? await undoTabOperations(paperId) : await redoTabOperations(paperId)
    } catch (e) {
      // 模块层已捕获 api 面；此处兜底模块自身的意外编程错误
      console.error('[reader.store] 操作历史异常', e)
      showToast('撤销失败，请重试', 'error')
      return false
    }
    if (!outcome.done) {
      // 预 flush 失败（write-failed）的真实写失败已由写路径 toast——不叠发
      if (outcome.reason === 'api-failed') {
        showToast(direction === 'undo' ? '撤销失败，请重试' : '重做失败，请重试', 'error')
      }
      return false
    }
    const { tabs } = get()
    const tab = tabs[paperId]
    // 期间 tab 被关：DB 已撤销/重做，列表随重开对齐，不追写已删 TabState
    if (tab === undefined) return true
    const act: OpApply = outcome.apply
    const next =
      act.type === 'remove'
        ? tab.annotations.filter((x) => x.id !== act.id)
        : tab.annotations.some((x) => x.id === act.annotation.id)
          ? tab.annotations.map((x) => x.id === act.annotation.id ? act.annotation : x)
          : [...tab.annotations, act.annotation]
    // [B4-A R2 §2.5 #16/#17] undo/redo 成功=新编辑事件：U=1、revision++
    set({
      tabs: {
        ...tabs,
        [paperId]: { ...tab, annotations: next, unfinalized: true, editRevision: (tab.editRevision ?? 0) + 1 }
      }
    })
    return true
  }
})
