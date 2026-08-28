// @vitest-environment jsdom
/**
 * [SR2-F-03] scroll-progress —— 滚动进度状态机+回写恢复锁定测试。
 *
 * 覆盖：六态全格（idle/scrolling/pending/writing/restoring/loading——含 W2
 * writing-scroll 新格）+跨格五序列（切 tab 恢复/滚动中关 tab/pending 中关 tab/
 * 程序跳页用户接管/回写竞 tab 切换）+最近页回写边界+落库容错+dispose。
 * 时间全注入（fake timers 经 deps.timers——禁真 timer）；always-active
 * （ADR-0017 裁决 3——新测试不经 guardedDescribe）。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createScrollProgress,
  PROGRESS_DEBOUNCE_MS,
  type ScrollProgress,
  type ScrollProgressDeps
} from '../../../src/renderer/features/reader/scroll-progress'

/** 三页列几何（内容坐标）：页高 800、间隙 12——1 基页盒 [0,800]/[812,1612]/[1624,2424] */
const BOXES = [
  { top: 0, height: 800 },
  { top: 812, height: 800 },
  { top: 1624, height: 800 }
]

/** 全注入测试台：active tab/viewport/落库承诺可操纵；scrollTo=置 scrollTop+派发 scroll 事件 */
function makeHarness() {
  let activeId: string | null = 'p-1'
  let viewport = { scrollTop: 0, clientHeight: 800 }
  const saved: Array<{ paperId: string; page: number }> = []
  const setPage = vi.fn()
  const scrollToPage = vi.fn()
  let settleSave: (() => void) | null = null
  const deps: ScrollProgressDeps = {
    getPaperId: () => activeId,
    getViewport: () => ({ ...viewport }),
    getPageBoxes: () => BOXES,
    scrollToPage,
    setPage,
    saveProgress: (paperId, page) => {
      saved.push({ paperId, page })
      return new Promise<void>((resolve) => {
        settleSave = resolve
      })
    },
    now: () => 0,
    timers: {
      setTimeout: (fn, ms) => setTimeout(fn, ms),
      clearTimeout: (h) => clearTimeout(h as ReturnType<typeof setTimeout>)
    }
  }
  const sp: ScrollProgress = createScrollProgress(deps)
  return {
    sp,
    deps,
    saved,
    setPage,
    scrollToPage,
    /** 模拟滚动到位（更新 viewport 后派发 scroll 事件） */
    scrollTo(top: number): void {
      viewport = { ...viewport, scrollTop: top }
      sp.onScrollEvent()
    },
    set active(v: string | null) {
      activeId = v
    },
    get active(): string | null {
      return activeId
    },
    /** 了结在途落库承诺（writing 档收口） */
    settleSave(): void {
      settleSave?.()
      settleSave = null
    },
    state(pid = 'p-1'): string {
      return sp.stateOf(pid)
    },
    pending(pid = 'p-1'): number | undefined {
      return sp.pendingOf(pid)
    }
  }
}

/** 刷微任务队列到足够深度（落库承诺链 .then 包裹+Promise.all+完成回调≈3 跳） */
async function flushMicro(): Promise<void> {
  for (let i = 0; i < 5; i += 1) await Promise.resolve()
}

/** 复位视口到页列顶部（模拟重开/切回后全新页列，防就位快径误触） */
function resetViewport(h: ReturnType<typeof makeHarness>): void {
  h.deps.getViewport = () => ({ scrollTop: 0, clientHeight: 800 })
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('scroll-progress 六态全格', () => {
  it('idle→scrolling：用户滚动事件即入 scrolling（记账最近页+arm 防抖）', () => {
    const h = makeHarness()
    expect(h.state()).toBe('idle')
    h.scrollTo(500) // 中心 900 → 第 2 页（0 基 1）
    expect(h.state()).toBe('scrolling')
    expect(h.pending()).toBe(1)
  })

  it('scrolling：防抖窗内不回写——窗内零写、窗到即写（沿用 2000ms）', () => {
    const h = makeHarness()
    h.scrollTo(500)
    vi.advanceTimersByTime(1999)
    expect(h.setPage).not.toHaveBeenCalled()
    expect(h.saved).toHaveLength(0)
    vi.advanceTimersByTime(1)
    expect(h.setPage).toHaveBeenCalledTimes(1)
    expect(h.saved).toEqual([{ paperId: 'p-1', page: 1 }])
  })

  it('pending 档：setPage 调用时机器处于 pending（定时到→writing 之间的决定档）', () => {
    const h = makeHarness()
    const seen: string[] = []
    h.setPage.mockImplementation(() => {
      seen.push(h.state())
    })
    h.scrollTo(500)
    vi.advanceTimersByTime(2000)
    expect(seen).toEqual(['pending'])
  })

  it('writing→idle：落库 settle 后回 idle；回写用 {scroll:"none"} 不触发程序滚动（B1）', async () => {
    const h = makeHarness()
    h.scrollTo(500)
    vi.advanceTimersByTime(2000)
    expect(h.setPage).toHaveBeenCalledWith(1, { scroll: 'none' })
    expect(h.state()).toBe('writing')
    h.settleSave()
    await flushMicro()
    expect(h.state()).toBe('idle')
  })

  it('writing→scrolling（W2 新格）：writing 中用户又滚直接回 scrolling，迟到完成不回落 idle', async () => {
    const h = makeHarness()
    h.scrollTo(500)
    vi.advanceTimersByTime(2000)
    expect(h.state()).toBe('writing')
    h.scrollTo(1300) // 中心 1700 → 第 3 页（0 基 2）
    expect(h.state()).toBe('scrolling')
    expect(h.pending()).toBe(2)
    h.settleSave()
    await flushMicro()
    expect(h.state()).toBe('scrolling') // 迟到完成不得覆盖用户接管
    vi.advanceTimersByTime(2000)
    expect(h.setPage).toHaveBeenLastCalledWith(2, { scroll: 'none' })
  })

  it('restoring→scrolling：用户接管（wheel/keydown/pointerdown 三类非 scroll 信号）取消程序目标', () => {
    const h = makeHarness()
    h.sp.beginProgramScroll(2)
    expect(h.state()).toBe('restoring')
    h.sp.onUserTakeover()
    expect(h.state()).toBe('scrolling')
    h.scrollTo(500)
    expect(h.pending()).toBe(1) // 接管后的 scroll 事件=用户滚动，正常记账
  })

  it('restoring→idle：程序滚动到位（scroll 事件中心页=目标页）即收口', () => {
    const h = makeHarness()
    h.sp.beginProgramScroll(1)
    expect(h.state()).toBe('restoring')
    h.scrollTo(500) // 中心 900 → 第 2 页 = 目标（0 基 1）
    expect(h.state()).toBe('idle')
  })

  it('restoring 中 scroll 事件=程序自发（W-B）：未达目标不记账不覆盖程序目标', () => {
    const h = makeHarness()
    h.sp.beginProgramScroll(2)
    h.scrollTo(500) // 途经第 2 页（非目标）
    expect(h.state()).toBe('restoring')
    expect(h.pending()).toBe(2) // 仍是程序跳页的账，未被途经滚动覆盖
  })

  it('loading→restoring：onColumnReady 执行恢复（scrollToPage）；loading 中 scroll 忽略', () => {
    const h = makeHarness()
    h.sp.beginLoading('p-1')
    expect(h.state()).toBe('loading')
    h.scrollTo(500)
    expect(h.state()).toBe('loading') // 页列未就绪：不记账
    resetViewport(h) // 模拟就绪时的全新页列（顶部起）
    h.sp.onColumnReady(1)
    expect(h.state()).toBe('restoring')
    expect(h.scrollToPage).toHaveBeenCalledWith(1)
  })

  it('idle→restoring：程序跳页（工具栏/目录/locate）入 restoring 并记账（拆链对齐：一切 setPage 来源均入账）', () => {
    const h = makeHarness()
    h.sp.beginProgramScroll(2)
    expect(h.state()).toBe('restoring')
    expect(h.pending()).toBe(2)
  })

  it('restoring 就位快径：已在目标页的程序请求直达 idle（免程序滚）', () => {
    const h = makeHarness()
    h.scrollTo(500)
    vi.advanceTimersByTime(2000)
    h.settleSave()
    h.sp.beginProgramScroll(1) // 当前中心页已是第 2 页（0 基 1）
    expect(h.state()).toBe('idle')
    expect(h.pending()).toBe(1)
  })
})

describe('scroll-progress 跨格五序列', () => {
  it('S1 滚动→切 tab→回：恢复记忆页（scrollToPage）；失配档丢弃回写', () => {
    const h = makeHarness()
    h.scrollTo(500)
    h.active = 'p-2'
    vi.advanceTimersByTime(2000)
    expect(h.saved).toEqual([{ paperId: 'p-1', page: 1 }]) // per-tab 记账照落
    expect(h.setPage).not.toHaveBeenCalled() // 失配丢弃：不把 p-1 的页写进 p-2 的 tab
    h.active = 'p-1'
    h.sp.beginLoading('p-1')
    resetViewport(h) // 切回后全新页列（顶部起——真实装配形态）
    h.sp.onColumnReady(1)
    expect(h.scrollToPage).toHaveBeenCalledWith(1) // 恢复记忆页（0 基 1）
  })

  it('S2 滚动中关 tab：flushPending 立即落库（不等防抖窗），到点不双写', () => {
    const h = makeHarness()
    h.scrollTo(500)
    h.sp.flushPending('p-1')
    expect(h.saved).toEqual([{ paperId: 'p-1', page: 1 }])
    vi.advanceTimersByTime(3000)
    expect(h.saved).toHaveLength(1)
  })

  it('S3 pending 中关 tab：防抖窗内关 tab 立即 flush（清账后到点静默）', () => {
    const h = makeHarness()
    h.scrollTo(500)
    vi.advanceTimersByTime(1000) // 窗内
    h.sp.flushPending('p-1')
    expect(h.saved).toHaveLength(1)
    vi.advanceTimersByTime(1000)
    expect(h.saved).toHaveLength(1)
  })

  it('S4 程序跳页与用户滚动竞态：接管后回写用户实际页（非程序目标页）', () => {
    const h = makeHarness()
    h.sp.beginProgramScroll(2)
    h.sp.onUserTakeover()
    h.scrollTo(500)
    vi.advanceTimersByTime(2000)
    expect(h.setPage).toHaveBeenCalledWith(1, { scroll: 'none' })
  })

  it('S5 回写竞 tab 切换：失配只丢 setPage（active-tab 落账），saveProgress 按 per-tab 账照落', () => {
    const h = makeHarness()
    h.scrollTo(500)
    h.active = 'p-2'
    vi.advanceTimersByTime(2000)
    expect(h.saved).toEqual([{ paperId: 'p-1', page: 1 }])
    expect(h.setPage).not.toHaveBeenCalled()
  })
})

describe('scroll-progress 回写几何与容错', () => {
  it('视口中心最近页边界：首页/末页/页内/中缝（取前页）', () => {
    const h = makeHarness()
    h.scrollTo(0) // 中心 400 → 第 1 页
    vi.advanceTimersByTime(2000)
    expect(h.setPage).toHaveBeenNthCalledWith(1, 0, { scroll: 'none' })
    h.settleSave()
    h.scrollTo(1300) // 中心 1700 → 第 3 页
    vi.advanceTimersByTime(2000)
    expect(h.setPage).toHaveBeenNthCalledWith(2, 2, { scroll: 'none' })
    h.settleSave()
    h.scrollTo(1206) // 中心 1606 仍在第 2 页盒内（页底 1612）
    vi.advanceTimersByTime(2000)
    expect(h.setPage).toHaveBeenNthCalledWith(3, 1, { scroll: 'none' })
    h.settleSave()
    h.scrollTo(406) // 中心 806：两页等距中缝 → 取前页
    vi.advanceTimersByTime(2000)
    expect(h.setPage).toHaveBeenNthCalledWith(4, 0, { scroll: 'none' })
  })

  it('视口/页列缺席：不记账不炸（防御位）', () => {
    const h = makeHarness()
    h.deps.getViewport = () => null
    h.scrollTo(500)
    expect(h.state()).toBe('idle')
    h.deps.getViewport = () => ({ scrollTop: 0, clientHeight: 800 })
    h.deps.getPageBoxes = () => []
    h.scrollTo(500)
    expect(h.state()).toBe('idle')
  })

  it('落库拒绝（IPC 失败）：吞错不炸，状态照常收口（进度=尽力而为）', async () => {
    const h = makeHarness()
    h.deps.saveProgress = () => Promise.reject(new Error('ipc down'))
    h.scrollTo(500)
    vi.advanceTimersByTime(2000)
    await flushMicro()
    expect(h.state()).toBe('idle')
  })

  it('dispose：清定时器+尾账 flush（卸载/切视图收尾）', () => {
    const h = makeHarness()
    h.scrollTo(500)
    h.sp.dispose()
    expect(h.saved).toEqual([{ paperId: 'p-1', page: 1 }])
    vi.advanceTimersByTime(3000)
    expect(h.saved).toHaveLength(1)
  })

  it('flushAll：多 tab 账一次收（B3 per-tab 语义）', () => {
    const h = makeHarness()
    h.scrollTo(500)
    h.active = 'p-2'
    h.sp.beginProgramScroll(1)
    h.sp.flushAll()
    expect(h.saved).toContainEqual({ paperId: 'p-1', page: 1 })
    expect(h.saved).toContainEqual({ paperId: 'p-2', page: 1 })
  })

  it('防抖常量沿用 2000ms（票面：静置>2000ms 沿用）', () => {
    expect(PROGRESS_DEBOUNCE_MS).toBe(2000)
  })
})
