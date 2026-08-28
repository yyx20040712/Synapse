// b3: P7-F
/**
 * [SR2-F-03] scroll-progress —— 滚动进度回写恢复与键位迁移（工单：open / strong）
 *
 * ── 行为层 ──
 * - 滚动位置状态机（六态，per-tab 内部 Record<paperId,State>——B3）：
 *   | 态 | 迁移 | 断言 |
 *   | --- | --- | --- |
 *   | idle | 用户滚动→scrolling | — |
 *   | scrolling | 静置>2000ms（沿用）→pending | 防抖窗内不回写 |
 *   | pending | 定时到→writing（决定档：tab 校验+setPage 在本档执行） | 失配丢弃 |
 *   | writing | 回写 setPage(page,{scroll:'none'})→idle；writing 中用户又滚→直接回 scrolling（W2 新格） | 'none' 不触发程序滚动（B1/INV-29） |
 *   | restoring | 程序滚动（恢复/跳页/locate）中；用户接管=非 scroll 的用户输入信号（wheel/keydown/pointerdown 三类——程序自发 scroll 不算，W-B）→取消程序目标转 scrolling；到位（scroll 中心页=目标）→idle | 用户接管 |
 *   | loading | 页列未就绪（F-01 onReady 前）；onColumnReady→restoring（执行恢复 scrollToPage） | 就绪信号驱动 |
 * - 跨格序列：滚动→切 tab→回（恢复记忆页）/滚动中关 tab（flushPending）/pending
 *   中关 tab（立即 flush）/程序跳页与用户滚动竞态（用户接管=三类信号）/回写竞
 *   tab 切换（writing 前校验 getPaperId 失配丢弃 setPage——per-tab 记账照落）。
 * - 滚动→页回写：视口中心最近页（PageColumn.nearestPage 单源）纯函数；粒度=
 *   整数页（v1 零迁移——页内偏移留实锤）；pendingProgress Record<paperId,page>
 *   语义保持（B3，账本随防抖链自 reader.store 拆入本模块）。
 * - 恢复：openPaper→loading→就绪（就绪时夹取=W-A，由 scrollToPage 消费面
 *   PageColumn 段⑤ clamp 承载）→scrollToPage(lastReadPage)。
 * - 程序跳页（工具栏/目录/locate/恢复）记账：beginProgramScroll 入账+arm——
 *   拆链对齐（旧 store 一切 setPage 来源均入 pendingProgress）。
 *
 * ── 接口层 ──
 * - createScrollProgress(deps:{getPaperId,getViewport,getPageBoxes,scrollToPage,
 *   setPage,saveProgress,now,timers})——时间全注入（禁真 timer）；
 * - createReaderScrollProgress(scrollArea)——装配工厂（store/api 直连，闭包
 *   scrollAreaRef 量测页盒几何）；useScrollProgressWiring——装配效应集
 *   （flusher 注册成对/keydown 接管/换文献 loading/程序滚动信号→restoring）。
 *
 * ── 架构层 ──
 * - IPC/repo 零改动（saveProgress 沿用）；reader.store 不 import 本模块（依赖
 *   单向：本模块→store/api；装配面 ReaderPage 注册 flusher 回调入 store）。
 * - 不变量登记（docs/invariants.md）：INV-31 进度回写=视口中心最近页；
 *   INV-32 程序滚动用户接管（RESTORING 取消）。
 *
 * ── 生命周期层 ──
 * - 不做：页内偏移存储/云端/进度历史。
 *
 * ── 文化层 ──
 * - 测试：scroll-progress.test（六态全格+跨格五序列+几何边界，时间注入）；
 *   reader-shortcuts/reader.store 受锁扩；e2e 批 3=reader-text.spec tab 序列段。
 */
import { useEffect } from 'react'
import type { RefObject } from 'react'
import { nearestPage } from './PageColumn'
import { api } from '../../api/client'
import { useReaderStore } from './reader.store'

/** 滚动位置状态机六态（票面字面） */
export type ScrollStateName = 'idle' | 'scrolling' | 'pending' | 'writing' | 'restoring' | 'loading'

/** 注入定时器（禁真 timer——测试经 fake timers 驱动） */
export interface ScrollProgressTimers {
  setTimeout(fn: () => void, ms: number): unknown
  clearTimeout(handle: unknown): void
}

export interface ScrollProgressDeps {
  getPaperId(): string | null
  getViewport(): { scrollTop: number; clientHeight: number } | null
  getPageBoxes(): ReadonlyArray<{ top: number; height: number }>
  /** 程序滚动单口（装配注入 setPage 默认 'to'→INV-29 信号→PageColumn 段⑤） */
  scrollToPage(page: number): void
  /** 回写单口（{scroll:'none'} 只落账不 bump——防回弹） */
  setPage(page: number, opts: { scroll: 'none' }): void
  saveProgress(paperId: string, page: number): void | Promise<void>
  now(): number
  timers: ScrollProgressTimers
}

export interface ScrollProgress {
  /** 滚动容器 onScroll 接线（restoring 中=程序自发 scroll，仅做到达判定） */
  onScrollEvent(): void
  /** 用户接管信号（wheel/keydown/pointerdown 三类非 scroll 信号，W-B） */
  onUserTakeover(): void
  /** openPaper/换文献：页列未就绪 → loading */
  beginLoading(paperId: string): void
  /** 页列就绪（F-01 onReady）：loading→restoring，执行恢复 scrollToPage(page) */
  onColumnReady(restorePage: number): void
  /** 程序跳页（scrollRequest 消费面：工具栏/目录/locate/恢复链）→restoring+记账 */
  beginProgramScroll(page: number): void
  /** 关 tab：该 tab 的 pending 立即落库（store.closeTab 经 flusher 接线调用） */
  flushPending(paperId: string): void
  /** 全关/卸载：整账本一次收 */
  flushAll(): void
  stateOf(paperId: string): ScrollStateName
  pendingOf(paperId: string): number | undefined
  /** 清定时器+尾账 flush（卸载/切视图收尾；实例此后仍可用） */
  dispose(): void
}

/** 进度防抖窗口：静置 2s 才落库（拆链自 reader.store，语义沿用） */
export const PROGRESS_DEBOUNCE_MS = 2000

interface PaperScrollState {
  state: ScrollStateName
  /** restoring 的程序目标页（0 基；非 restoring 态无意义） */
  target: number | null
}

export function createScrollProgress(deps: ScrollProgressDeps): ScrollProgress {
  /** per-tab 状态机（B3）：paperId → 态 */
  const papers = new Map<string, PaperScrollState>()
  /** 待落库进度账本：paperId → 最近页（0 基）——旧 pendingProgress 语义保持 */
  let pending: Record<string, number> = {}
  let timer: unknown = null
  /** writing 在途完成序号（W2：用户接管后的迟到完成不得回落 idle） */
  let writeSeq = 0

  const paper = (pid: string): PaperScrollState => {
    let s = papers.get(pid)
    if (s === undefined) {
      s = { state: 'idle', target: null }
      papers.set(pid, s)
    }
    return s
  }

  /** 视口中心最近页（0 基；INV-31 纯函数消费——PageColumn.nearestPage 单源） */
  const centerPage = (): number | null => {
    const vp = deps.getViewport()
    if (vp === null) return null
    const boxes = deps.getPageBoxes()
    if (boxes.length === 0) return null
    return nearestPage(vp.scrollTop + vp.clientHeight / 2, boxes) - 1
  }

  /** 落库（尽力而为：进度非关键数据，同步抛错/拒绝均吞——沿用 store 规约） */
  const saveOne = (pid: string, page: number): Promise<void> => {
    try {
      return Promise.resolve(deps.saveProgress(pid, page)).then(
        () => undefined,
        () => undefined
      )
    } catch {
      return Promise.resolve()
    }
  }

  /** 整账本批量落库（沿用 flushAllPending 语义——多 tab 各自记账） */
  const flushLedger = (): Array<Promise<void>> => {
    const waits: Array<Promise<void>> = []
    for (const [pid, page] of Object.entries(pending)) waits.push(saveOne(pid, page))
    pending = {}
    return waits
  }

  const arm = (): void => {
    if (timer !== null) deps.timers.clearTimeout(timer)
    timer = deps.timers.setTimeout(fire, PROGRESS_DEBOUNCE_MS)
  }

  /** 定时到：账本批量落库 + active tab 回写（pending 决定档→writing） */
  const fire = (): void => {
    timer = null
    const pid = deps.getPaperId()
    const activePage = pid !== null ? pending[pid] : undefined
    const waits = flushLedger()
    if (pid === null || activePage === undefined) return // 失配丢弃：只丢 setPage，per-tab 账已在上面照落
    const ps = paper(pid)
    if (ps.state !== 'scrolling' && ps.state !== 'idle') return // restoring/loading 中不回写页码
    ps.state = 'pending'
    deps.setPage(activePage, { scroll: 'none' })
    ps.state = 'writing'
    const seq = ++writeSeq
    void Promise.all(waits).then(() => {
      if (seq === writeSeq && ps.state === 'writing') ps.state = 'idle'
    })
  }

  return {
    onScrollEvent() {
      const pid = deps.getPaperId()
      if (pid === null) return
      const ps = paper(pid)
      if (ps.state === 'loading') return // 页列未就绪：不记账
      if (ps.state === 'restoring') {
        // W-B：restoring 中的 scroll 事件=程序滚动自发，非用户——只做到达判定
        const cur = centerPage()
        if (cur !== null && cur === ps.target) {
          ps.target = null
          ps.state = 'idle'
        }
        return
      }
      // idle/scrolling/writing（W2 新格：writing 中用户又滚→直接回 scrolling）
      const cur = centerPage()
      if (cur === null) return
      ps.state = 'scrolling'
      pending[pid] = cur
      arm()
    },

    onUserTakeover() {
      const pid = deps.getPaperId()
      if (pid === null) return
      const ps = paper(pid)
      if (ps.state !== 'restoring') return
      ps.target = null // 取消程序目标（INV-32）
      ps.state = 'scrolling' // 后续 scroll 事件=用户的，正常记账
    },

    beginLoading(pid) {
      const ps = paper(pid)
      ps.state = 'loading'
      ps.target = null
    },

    onColumnReady(restorePage) {
      const pid = deps.getPaperId()
      if (pid === null) return
      const ps = paper(pid)
      const cur = centerPage()
      if (cur === restorePage) {
        // 已在记忆页（首读开篇/重开归位）：免程序滚直达 idle
        ps.state = 'idle'
        ps.target = null
        return
      }
      ps.state = 'restoring'
      ps.target = restorePage
      deps.scrollToPage(restorePage)
    },

    beginProgramScroll(page) {
      const pid = deps.getPaperId()
      if (pid === null) return
      const ps = paper(pid)
      const cur = centerPage()
      if (cur === page) {
        ps.state = 'idle' // 就位快径：已在目标页（夹取后同页）免程序滚
        ps.target = null
      } else {
        ps.state = 'restoring'
        ps.target = page
      }
      pending[pid] = page // 拆链对齐：程序跳页同旧 setPage 一切来源入账
      arm()
    },

    flushPending(pid) {
      const page = pending[pid]
      if (page === undefined) return
      delete pending[pid]
      void saveOne(pid, page)
    },

    flushAll() {
      flushLedger()
    },

    stateOf(pid) {
      return paper(pid).state
    },

    pendingOf(pid) {
      return pending[pid]
    },

    dispose() {
      if (timer !== null) {
        deps.timers.clearTimeout(timer)
        timer = null
      }
      flushLedger() // 尾账收口（卸载/切视图——进度尽力而为不丢）
    }
  }
}

/** 装配工厂：真实 deps（store/api 直连 + scrollAreaRef 量测页盒几何） */
export function createReaderScrollProgress(
  scrollArea: RefObject<HTMLDivElement | null>
): ScrollProgress {
  return createScrollProgress({
    getPaperId: () => useReaderStore.getState().activeId,
    getViewport: () => {
      const el = scrollArea.current
      return el === null ? null : { scrollTop: el.scrollTop, clientHeight: el.clientHeight }
    },
    getPageBoxes: () => {
      const el = scrollArea.current
      if (el === null) return []
      const base = el.getBoundingClientRect()
      return Array.from(el.querySelectorAll<HTMLElement>('[data-page-box]')).map((box) => {
        const r = box.getBoundingClientRect()
        return { top: r.top - base.top + el.scrollTop, height: r.height }
      })
    },
    // 程序滚动单口=store setPage 默认 'to'（INV-29 信号→PageColumn 段⑤执行）
    scrollToPage: (page) => useReaderStore.getState().setPage(page),
    setPage: (page, opts) => useReaderStore.getState().setPage(page, opts),
    saveProgress: (paperId, page) => api.reader.saveProgress({ paperId, page }).then(() => undefined),
    now: () => Date.now(),
    timers: {
      setTimeout: (fn, ms) => setTimeout(fn, ms),
      clearTimeout: (h) => clearTimeout(h as ReturnType<typeof setTimeout>)
    }
  })
}

/**
 * 装配效应集（ReaderPage 组合根消费；wheel/pointerdown 接管经 JSX 内联 prop，
 * keydown 因 keymap 全局而挂 document）：
 * - flusher 注册/注销成对（store.closeTab/close 经回调立即收账——拆链接线）；
 * - 换文献 beginLoading；scrollRequest（程序跳页/恢复）→beginProgramScroll。
 */
export function useScrollProgressWiring(
  sp: ScrollProgress,
  fileUrl: string | null,
  paperId: string | null,
  columnScroll: { page: number } | null
): void {
  const register = useReaderStore((s) => s.registerProgressFlusher)
  useEffect(() => {
    register({ flush: (pid) => sp.flushPending(pid), flushAll: () => sp.flushAll() })
    return () => {
      register(null)
      sp.dispose()
    }
  }, [register, sp])
  useEffect(() => {
    // 换文献/首开：丢弃旧页文本后进入 loading（页列就绪前 scroll 不记账）
    if (paperId !== null) sp.beginLoading(paperId)
  }, [fileUrl, paperId, sp])
  useEffect(() => {
    // 程序滚动信号（INV-29 'to' bump）：restoring 跟踪+程序跳页记账
    if (columnScroll !== null) sp.beginProgramScroll(columnScroll.page)
  }, [columnScroll, sp])
  useEffect(() => {
    // 用户接管三类信号之 keydown（wheel/pointerdown 在滚动容器 JSX prop 上）；
    // passive 观察，不拦截默认行为
    const onKey = (): void => sp.onUserTakeover()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [sp])
}
