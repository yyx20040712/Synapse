// b3: P7-B
/**
 * [SR2-TABS-01] reader.store —— per-tab 多文献状态（工单：open / strong）
 *
 * ── 行为层 ──
 * - 状态形状：{ tabs: Record<paperId, TabState>; order: paperId[]; activeId: string | null }
 *   TabState = { paperId; fileUrl; fileName; title; page; totalPages; zoom;
 *   color; annotations; status: 'loading' | 'ready' | 'error'; dirty: boolean }
 *   （title=文献名（PaperDetail.title）——标签页可读名单源；fileName 是
 *   file_ref 内容寻址哈希基名不可读，2026-08-27 用户视检缺陷②）
 *   （dirty 建位于本单、恒 false——信号写入路径归 TABS-03（其改动面含本
 *   文件）；undo 栈不进 TabState，归 UNDO-01 模块级自持，plan 门 W2 裁决）
 *   （顶层便捷字段全部下钻 TabState——单一真相源，禁投影双源；消费方经
 *   s.tabs[s.activeId ?? ''] 选择器取）
 * - tab 生命周期状态机（宪法状态机前置；跨格序列为审计重点）。事件×态全表
 *   （closeTab/activateTab 对任意态生效，openPaper 按 tab 现态分支）：
 *   | 事件 | loading | ready | error | absent |
 *   | openPaper(id) 载入成功 | → ready | 幂等激活 | 重试：→loading | →loading（追加+激活） |
 *   | openPaper(id) 载入失败 | → error | —（幂等激活不重载） | 保持 error | → error（占位 tab） |
 *   | activateTab(id) | 激活不变态 | 激活不变态 | 激活不变态 | —（id 必须存在，不存在 no-op） |
 *   | closeTab(id) | → absent（在途响应到达按规则①丢弃） | → absent | → absent | — |
 *   - closeTab 收缩序：关 activeId 时取右邻（无右邻取左邻，全空 → activeId=null
 *     空态提示，不隐式切 App 视图）；order 同步移除
 * - 竞态守卫（INV-03 per-tab 化，模块级 loadSeq 总序号）——迟到响应三规则：
 *   ① 响应到达时 tab 已 absent（被关）→ 丢弃
 *   ② tab 存在但已发起新一轮加载（seq 过期）→ 丢弃
 *   ③ tab 存在且 seq 最新 → 写入该 tab（即使 activeId 已切走——旧 tab 数据照常
 *   落账，绝不覆盖展示中的新 tab）
 *   - 跨格序列（锁定测试锚定）：
 *     S1 换 tab：open(A) ready → open(B) ready（A 保留）→ activate(A) → A 的
 *        page/zoom/annotations 原样恢复（状态未失忆）
 *     S2 关 tab：open(A) open(B) → close(B)（activeId 回 A）→ close(A) →
 *        activeId=null（空态）；order 收缩序正确
 *     S3 加载中切换：open(A) loading → open(B) ready → A 响应迟到 → 只写入
 *        A 的 tab（B 展示不受干扰）；loading 中 close(A) → A 迟到响应丢弃（规则①）
 * - 进度防抖：PROGRESS_DEBOUNCE_MS=2000 单定时器 + pendingProgress 集合
 *   （Record<paperId, page>——多 tab 各自翻页各自落账，换 tab 不误写不丢写）；
 *   closeTab 时该 tab 的 pending 进度立即 flush（尽力而为，catch 吞——进度
 *   非关键数据，规约记录依据）
 * - 旧 setter（setPage/setZoom/setTotalPages/setColor/addAnnotation/
 *   updateAnnotation/removeAnnotation）作用于 active tab；activeId=null 时 no-op
 *
 * ── 接口层 ──
 * - export interface TabState / ReaderStore（形状如上）
 * - export const useReaderStore: UseBoundStore<...>
 * - openPaper(id) 保留动作型错误契约（失败上抛由消费方 toast，tab 置 error）
 *
 * ── 架构层 ──
 * - 只 import api/client 与 shared 模型；禁止 import 组件
 * - 接缝（本工单改动面）：ReaderPage.tsx:49-78 / SelectionLayer.tsx:67-68 选择器
 *   迁移（s.paperId → s.tabs[s.activeId ?? '']?.paperId 等，行为不变）；
 *   AnnotationLayer.tsx:146/176 零改动（方法签名不变）
 *
 * ── 生命周期层 ──
 * - 预留：TabState.dirty 信号写入（TABS-03）；不做：tab 拖拽排序、会话恢复
 *
 * ── 文化层 ──
 * - 测试：tests/unit/renderer/reader.store.test.ts 随本单迁移（受锁
 *   [locked-change]：旧 7 用例断言路径下钻 per-tab（单 tab 场景语义不变）+
 *   新增 per-tab 组：幂等激活/S1/S2/S3 三序列/进度 flush）
 * - docs/invariants.md INV-03 行随本单更新（stale-guard per-tab 变体描述）——
 *   登记册列本单改动面（plan 门 W3 处置）
 * - INV-14 不适用（无 DOM 监听面）
 */
import { create } from 'zustand'
import { api, unwrap } from '../../api/client'
import type { Annotation, AnnotationColor } from '@shared/models/annotation'
import { clearStack, undo as runUndo, type UndoOutcome } from './annotation-undo'
import { showToast } from '../../shared/ui/toast-store'

export interface TabState {
  paperId: string
  fileUrl: string
  fileName: string
  /** 文献名（PaperDetail.title）——标签页可读名单源（缺陷②）；空串=未知，
   *  展示层兜底 fileName 去扩展名（防御位） */
  title: string
  page: number
  totalPages: number
  zoom: number
  color: AnnotationColor
  annotations: Annotation[]
  status: 'loading' | 'ready' | 'error'
  /** 灰点信号位（TABS-03 写入；本单恒 false） */
  dirty: boolean
}

export interface ReaderStore {
  tabs: Record<string, TabState>
  order: string[]
  activeId: string | null
  /** 标注单击反向同步信号（C-05 N1 方案a）：seq 递增触发消费方 effect */
  noteHighlight: { annotationId: string; seq: number } | null
  /** AI 段单击反向同步信号（AI-09，C-05 同型）：OutlineAside 消费（切笔记
   *  tab+highlightAiNoteId 分发 08 面板滚动高亮） */
  aiNoteHighlight: { aiNoteId: string; seq: number } | null
  openPaper(id: string): Promise<void>
  activateTab(id: string): void
  closeTab(id: string): void
  close(): void
  setPage(page: number): void
  setZoom(zoom: number): void
  setTotalPages(total: number): void
  setColor(color: AnnotationColor): void
  addAnnotation(a: Annotation): void
  updateAnnotation(a: Annotation): void
  removeAnnotation(id: string): void
  /** annotations 面灰点信号（TABS-03）：保存失败置位/重试成功清除（参数化
   *  paperId——异步失败可能迟到于 tab 切换） */
  markTabDirty(paperId: string): void
  clearTabDirty(paperId: string): void
  /** pdf 加载/渲染失败置 tab error（open IPC 失败类的补全——INV-15 装配级 e2e
   *  实证缺口：缺失文件走此路径，失败必须在 tab 级可见可关可重试） */
  markTabError(paperId: string): void
  /** 标注单击→侧栏同步高亮信号（C-05）：OutlineAside 消费（切笔记 tab+滚动） */
  notifyNoteHighlight(annotationId: string): void
  /** AI 段单击→侧栏同步高亮信号（AI-09，C-05 同型）：AiAnnotationLayer 点击上抛 */
  notifyAiNoteHighlight(aiNoteId: string): void
  /** 撤销栈顶逆操作（UNDO-01）：作用于 active tab；api 调用与 store 同步收口单点 */
  undo(): Promise<void>
}

export function createReaderStoreInitialState() {
  return {
    tabs: {} as Record<string, TabState>,
    order: [] as string[],
    activeId: null as string | null,
    noteHighlight: null as { annotationId: string; seq: number } | null,
    aiNoteHighlight: null as { aiNoteId: string; seq: number } | null
  }
}

/** 进度防抖窗口：翻页后静置 2s 才落库（与 ReaderPage 规约一致） */
const PROGRESS_DEBOUNCE_MS = 2000

/** 新建 loading 态 tab（error 重试时沿用既有显示字段，status 归 loading） */
function makeLoadingTab(paperId: string, prev: TabState | undefined): TabState {
  if (prev !== undefined) {
    return { ...prev, status: 'loading' }
  }
  return {
    paperId,
    fileUrl: '',
    fileName: '',
    title: '',
    page: 0,
    totalPages: 0,
    zoom: 1,
    color: 'yellow',
    annotations: [],
    status: 'loading',
    dirty: false
  }
}

export const useReaderStore = create<ReaderStore>()((set, get) => {
  // 加载总序号：每次 openPaper 发起自增；tabLoadSeq 记录每 tab 最新发起的序号
  // （迟到响应三规则的判定输入）；inflightOpen 让 loading 态重入尾随在途加载
  // （不提前 resolve——重入方 await 到的是同一加载的完成信号，失败由首调方报告）
  let loadSeq = 0
  const tabLoadSeq = new Map<string, number>()
  const inflightOpen = new Map<string, Promise<void>>()
  let progressTimer: ReturnType<typeof setTimeout> | null = null
  /** 待落库进度集合：paperId → 最近翻到的页（多 tab 各自记账，到点批量落库） */
  let pendingProgress: Record<string, number> = {}

  /** 本次响应是否仍是该 tab 的最新加载（规则①②判定：tab 已关或已被新一轮顶替即过期） */
  const isCurrentLoad = (paperId: string, seq: number): boolean => {
    return get().tabs[paperId] !== undefined && tabLoadSeq.get(paperId) === seq
  }

  const flushProgress = (paperId: string, page: number): void => {
    // 防抖落库失败不上抛：进度属尽力而为，不打断阅读（下次翻页会再试）
    void api.reader.saveProgress({ paperId, page }).catch(() => undefined)
  }

  const flushAllPending = (): void => {
    for (const [pid, page] of Object.entries(pendingProgress)) {
      flushProgress(pid, page)
    }
    pendingProgress = {}
  }

  const clearProgressTimer = (): void => {
    if (progressTimer !== null) {
      clearTimeout(progressTimer)
      progressTimer = null
    }
  }

  const scheduleProgress = (): void => {
    clearProgressTimer()
    progressTimer = setTimeout(() => {
      progressTimer = null
      flushAllPending()
    }, PROGRESS_DEBOUNCE_MS)
  }

  /** 作用于 active tab 的统一入口（activeId=null 时 no-op——空态规约） */
  const updateActiveTab = (fn: (tab: TabState) => TabState): void => {
    const { activeId, tabs } = get()
    if (activeId === null) return
    const tab = tabs[activeId]
    if (tab === undefined) return
    set({ tabs: { ...tabs, [activeId]: fn(tab) } })
  }

  /** 关单个 tab：pending 进度立即 flush；关 active 时收缩到右邻（无右邻左邻，全空 null） */
  const closeOne = (id: string): void => {
    // 该 tab 的 pending 进度立即落库（关 tab 后无人再等防抖窗口）
    const pending = pendingProgress[id]
    if (pending !== undefined) {
      flushProgress(id, pending)
      delete pendingProgress[id]
    }
    tabLoadSeq.delete(id)
    inflightOpen.delete(id)
    // 撤销栈随 tab 关闭丢弃（UNDO-01 接缝：栈随 closeTab 清理，不做跨 tab 撤销）
    clearStack(id)
    const { tabs, order, activeId } = get()
    const nextTabs = { ...tabs }
    delete nextTabs[id]
    const nextOrder = order.filter((x) => x !== id)
    let nextActive = activeId
    if (activeId === id) {
      const idx = order.indexOf(id)
      nextActive = nextOrder[idx] ?? nextOrder[idx - 1] ?? null
    }
    set({ tabs: nextTabs, order: nextOrder, activeId: nextActive })
  }

  /** 关闭全部（App 切视图/全关语义）：全部 pending 进度落账后整体复位 */
  const closeAll = (): void => {
    flushAllPending()
    tabLoadSeq.clear()
    inflightOpen.clear()
    clearProgressTimer()
    set(createReaderStoreInitialState())
  }

  return {
    ...createReaderStoreInitialState(),

    async openPaper(id) {
      const existing = get().tabs[id]
      if (existing !== undefined && (existing.status === 'ready' || existing.status === 'loading')) {
        set({ activeId: id })
        // loading 重入：尾随在途加载（吞 rejection——失败 toast 由首调方报告，不双弹）
        const inflight = inflightOpen.get(id)
        if (existing.status === 'loading' && inflight !== undefined) {
          await inflight.catch(() => undefined)
        }
        return
      }
      // absent（新建）或 error（重试）→ loading
      const seq = ++loadSeq
      tabLoadSeq.set(id, seq)
      set((s) => ({
        tabs: { ...s.tabs, [id]: makeLoadingTab(id, existing) },
        order: s.order.includes(id) ? s.order : [...s.order, id],
        activeId: id
      }))
      let load: Promise<void> | null = null
      const p = (async (): Promise<void> => {
        try {
          const d = await unwrap(api.reader.open({ paperId: id }))
          if (!isCurrentLoad(id, seq)) return
          const anns = await unwrap(api.reader.listAnnotations({ paperId: id }))
          if (!isCurrentLoad(id, seq)) return
          set((s) => ({
            tabs: {
              ...s.tabs,
              [id]: {
                ...(s.tabs[id] ?? makeLoadingTab(id, undefined)),
                fileUrl: d.fileUrl,
                fileName: d.fileName,
                title: d.title,
                page: d.lastReadPage,
                annotations: anns,
                status: 'ready'
              }
            }
          }))
        } catch (e) {
          if (!isCurrentLoad(id, seq)) return
          // 最新加载的失败才可见（旧一轮失败已被重试顶替，静默）；tab 置 error
          // 占位（tab 栏可显示，重入即重试），错误仍上抛消费方 toast
          set((s) => ({
            tabs: s.tabs[id] === undefined ? s.tabs : { ...s.tabs, [id]: { ...s.tabs[id]!, status: 'error' } }
          }))
          throw e
        } finally {
          // 身份校验：仅当 Map 记录仍是本加载才删（closeTab 后立即重开同 id 时，
          // Map 里已是新加载的记录，旧 finally 不得误删——deepseek r2 BLOCKING 修复）
          if (load !== null && inflightOpen.get(id) === load) {
            inflightOpen.delete(id)
          }
        }
      })()
      load = p
      inflightOpen.set(id, load)
      return load
    },

    activateTab(id) {
      if (get().tabs[id] === undefined) return
      set({ activeId: id })
    },

    closeTab(id) {
      closeOne(id)
    },

    close() {
      closeAll()
    },

    setPage(page) {
      // 0 基页码夹取到 [0, totalPages-1]；totalPages 未知（0）时由 PdfCanvas 侧兜底
      const { activeId } = get()
      if (activeId === null) return
      updateActiveTab((tab) => ({
        ...tab,
        page: Math.max(0, Math.min(Math.floor(page), tab.totalPages - 1))
      }))
      const tab = get().tabs[activeId]
      if (tab !== undefined) {
        pendingProgress[activeId] = tab.page
        scheduleProgress()
      }
    },

    setZoom(zoom) {
      updateActiveTab((tab) => ({ ...tab, zoom: Math.min(3, Math.max(0.5, zoom)) }))
    },

    setTotalPages(total) {
      updateActiveTab((tab) => ({ ...tab, totalPages: Math.max(0, Math.floor(total)) }))
    },

    setColor(color) {
      updateActiveTab((tab) => ({ ...tab, color }))
    },

    addAnnotation(a) {
      updateActiveTab((tab) => ({ ...tab, annotations: [...tab.annotations, a] }))
    },

    updateAnnotation(a) {
      updateActiveTab((tab) => ({
        ...tab,
        annotations: tab.annotations.map((x) => (x.id === a.id ? a : x))
      }))
    },

    removeAnnotation(id) {
      updateActiveTab((tab) => ({
        ...tab,
        annotations: tab.annotations.filter((x) => x.id !== id)
      }))
    },

    markTabDirty(paperId) {
      const { tabs } = get()
      if (tabs[paperId] === undefined) return
      set({ tabs: { ...tabs, [paperId]: { ...tabs[paperId]!, dirty: true } } })
    },

    clearTabDirty(paperId) {
      const { tabs } = get()
      if (tabs[paperId] === undefined) return
      set({ tabs: { ...tabs, [paperId]: { ...tabs[paperId]!, dirty: false } } })
    },

    markTabError(paperId) {
      const { tabs } = get()
      const tab = tabs[paperId]
      if (tab === undefined || tab.status === 'error') return
      set({ tabs: { ...tabs, [paperId]: { ...tab, status: 'error' } } })
    },

    notifyNoteHighlight(annotationId) {
      const prev = get().noteHighlight
      set({ noteHighlight: { annotationId, seq: (prev?.seq ?? 0) + 1 } })
    },

    notifyAiNoteHighlight(aiNoteId) {
      const prev = get().aiNoteHighlight
      set({ aiNoteHighlight: { aiNoteId, seq: (prev?.seq ?? 0) + 1 } })
    },

    async undo() {
      // paperId 在 await 前捕获——undo 期间切换 tab 不得把同步落到别的 tab（INV-03 同族）
      const paperId = get().activeId
      if (paperId === null) return
      let outcome: UndoOutcome
      try {
        outcome = await runUndo(paperId)
      } catch (e) {
        // 模块层已捕获 api 面；此处兜底模块自身的意外编程错误（deepseek r3 W2）
        console.error('[reader.store] undo 异常', e)
        showToast('撤销失败，请重试', 'error')
        return
      }
      if (!outcome.done) {
        if (outcome.reason === 'api-failed') {
          showToast('撤销失败，请重试', 'error')
        }
        return
      }
      const { tabs } = get()
      const tab = tabs[paperId]
      // undo 期间 tab 被关：DB 已撤销，列表随重开对齐，不追写已删 TabState
      if (tab === undefined) return
      const act = outcome.apply
      const next =
        act.type === 'remove'
          ? tab.annotations.filter((x) => x.id !== act.id)
          : tab.annotations.some((x) => x.id === act.annotation.id)
            ? tab.annotations.map((x) => (x.id === act.annotation.id ? act.annotation : x))
            : [...tab.annotations, act.annotation]
      set({ tabs: { ...tabs, [paperId]: { ...tab, annotations: next } } })
    }
  }
})
