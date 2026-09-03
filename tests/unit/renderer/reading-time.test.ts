import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createCompositeProgressFlusher,
  createReadingTime,
  formatReadingTime,
  READING_TICK_MS,
  type ReadingTime,
  type ReadingTimeDeps
} from '../../../src/renderer/features/reader/reading-time'

/**
 * P7E-05：reading-time 时长账本+复合 flusher 锁定测试。
 * 覆盖：态空间跨格序列 R1~R7+R10（ready×visible 计时门/tick 累账/hidden 零
 * 累积/切 tab stop-start/关 tab flush/关应用 flushAll/卸载 dispose 尾账/
 * 未就绪零累积）+零头按实结转+复合 flusher 单通道合并语义+formatReadingTime
 * 边界。时间全注入（now 可控+fake timers 经 deps.timers——禁真 timer，
 * scroll-progress.test 同法）；always-active（不经 guardedDescribe）。
 */

/** 全注入测试台：时钟/可见性/onFlush 可操纵；advance 同步推 now 与 fake timer */
function makeHarness() {
  let nowMs = 0
  let visible = true
  const flushed: Array<{ paperId: string; seconds: number }> = []
  const deps: ReadingTimeDeps = {
    isVisible: () => visible,
    now: () => nowMs,
    timers: {
      setInterval: (fn, ms) => setInterval(fn, ms),
      clearInterval: (h) => clearInterval(h as ReturnType<typeof setInterval>)
    },
    onFlush: (paperId, seconds) => {
      flushed.push({ paperId, seconds })
    }
  }
  const rt: ReadingTime = createReadingTime(deps)
  return {
    rt,
    flushed,
    advance(ms: number): void {
      nowMs += ms
      vi.advanceTimersByTime(ms)
    },
    setVisible(v: boolean): void {
      visible = v
    },
    ledger(pid: string): number {
      return rt.ledgerOf(pid)
    }
  }
}

/** 进度账视图桩（ScrollProgress 结构子集——takePending 取走不落库语义） */
function makeSpView(pending: Record<string, number>) {
  return {
    takePending: (pid: string): number | undefined => {
      const page = pending[pid]
      delete pending[pid]
      return page
    },
    pendingIds: (): string[] => Object.keys(pending)
  }
}

/** 复合 flusher 测试台：saved 记录单通道 invoke 三元组 */
function makeFlusher(
  pending: Record<string, number>,
  rt: ReadingTime,
  currentPage = 9
): {
  flush(paperId: string): void
  flushAll(): void
  saved: Array<{ paperId: string; page: number; secondsDelta: number }>
} {
  const saved: Array<{ paperId: string; page: number; secondsDelta: number }> = []
  const flusher = createCompositeProgressFlusher(makeSpView(pending), rt, {
    saveProgress: (paperId, page, secondsDelta) => {
      saved.push({ paperId, page, secondsDelta })
    },
    currentPageOf: () => currentPage
  })
  return { ...flusher, saved }
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('reading-time 态空间跨格序列（R1~R7+R10）', () => {
  it('R1：ready+visible tick 3 次→ledger=45s；无 invoke（防抖归进度管线）', () => {
    const h = makeHarness()
    h.rt.start('p-1')
    h.advance(READING_TICK_MS)
    h.advance(READING_TICK_MS)
    h.advance(READING_TICK_MS)
    expect(h.ledger('p-1')).toBe(45)
    expect(h.flushed).toHaveLength(0)
  })

  it('R2：R1 后复合 flush(pid)→单次 saveProgress(pendingPage, 45)；ledger 清零', () => {
    const h = makeHarness()
    const pending: Record<string, number> = { 'p-1': 3 }
    const f = makeFlusher(pending, h.rt)
    h.rt.start('p-1')
    h.advance(45_000)
    f.flush('p-1')
    expect(f.saved).toEqual([{ paperId: 'p-1', page: 3, secondsDelta: 45 }])
    expect(h.ledger('p-1')).toBe(0)
  })

  it('R3：visible→hidden→visible——hidden 段零累积（门关）；恢复后续算', () => {
    const h = makeHarness()
    h.rt.start('p-1')
    h.advance(READING_TICK_MS)
    h.setVisible(false)
    h.rt.onVisibilityChange()
    h.advance(60_000)
    h.setVisible(true)
    h.rt.onVisibilityChange()
    h.advance(READING_TICK_MS)
    expect(h.ledger('p-1')).toBe(30)
  })

  it('R4：切 tab（A→B）A stop 账留存+B start；离开段不计任何账', () => {
    const h = makeHarness()
    h.rt.start('A')
    h.advance(30_000)
    h.rt.stop()
    h.advance(15_000)
    h.rt.start('B')
    h.advance(15_000)
    h.rt.stop()
    h.rt.start('A')
    h.advance(15_000)
    expect(h.ledger('A')).toBe(45)
    expect(h.ledger('B')).toBe(15)
  })

  it('R5：关 tab flush(pid) 消费 sp 账——随后 flushAll 对该 pid 零二次 invoke（不双写）', () => {
    const h = makeHarness()
    const pending: Record<string, number> = { 'p-1': 2 }
    const f = makeFlusher(pending, h.rt)
    h.rt.start('p-1')
    h.advance(15_000)
    f.flush('p-1')
    f.flushAll()
    expect(f.saved).toEqual([{ paperId: 'p-1', page: 2, secondsDelta: 15 }])
  })

  it('R6：flushAll 遍历全 ledger——纯时长/纯页码/双账三形（page 缺席取当前页）', () => {
    const h = makeHarness()
    const pending: Record<string, number> = { 'p-page': 4 }
    const f = makeFlusher(pending, h.rt, 9)
    h.rt.start('p-sec')
    h.advance(30_000)
    h.rt.stop()
    h.rt.start('p-both')
    h.advance(15_000)
    h.rt.stop()
    f.flushAll()
    expect(f.saved).toContainEqual({ paperId: 'p-sec', page: 9, secondsDelta: 30 })
    expect(f.saved).toContainEqual({ paperId: 'p-page', page: 4, secondsDelta: 0 })
    expect(f.saved).toContainEqual({ paperId: 'p-both', page: 9, secondsDelta: 15 })
    expect(f.saved).toHaveLength(3)
  })

  it('R7：dispose 尾账 flush（onFlush 上抛装配面——卸载/切视图收尾）', () => {
    const h = makeHarness()
    h.rt.start('p-1')
    h.advance(30_000)
    h.rt.dispose()
    expect(h.flushed).toEqual([{ paperId: 'p-1', seconds: 30 }])
    h.advance(60_000)
    expect(h.flushed).toHaveLength(1)
  })

  it('R10：tab 未就绪（loading/error——start 缺席）零累积', () => {
    const h = makeHarness()
    h.advance(60_000)
    expect(h.ledger('p-1')).toBe(0)
  })

  it('R3×R6 跨格：hidden 中 force 结算零吸收——collectAllAndZero/collectAndZero 仅含 visible 段', () => {
    const h = makeHarness()
    h.rt.start('p-1')
    h.advance(30_000)
    h.setVisible(false)
    h.rt.onVisibilityChange()
    h.advance(60_000)
    expect(h.rt.collectAllAndZero()).toEqual({ 'p-1': 30 })
    expect(h.ledger('p-1')).toBe(0)
    h.setVisible(true)
    h.rt.onVisibilityChange()
    h.advance(15_000)
    h.setVisible(false)
    h.rt.onVisibilityChange()
    h.advance(30_000)
    expect(h.rt.collectAndZero('p-1')).toBe(15)
  })

  it('R2 分片（门一 BLOCKING）：账 4000s→flush→两次 invoke（3600+400）+账清零', () => {
    const h = makeHarness()
    const pending: Record<string, number> = { 'p-1': 3 }
    const f = makeFlusher(pending, h.rt)
    h.rt.start('p-1')
    h.advance(4_000_000)
    f.flush('p-1')
    expect(f.saved).toEqual([
      { paperId: 'p-1', page: 3, secondsDelta: 3_600 },
      { paperId: 'p-1', page: 3, secondsDelta: 400 }
    ])
    expect(h.ledger('p-1')).toBe(0)
  })

  it('R7 分片（门二 BLOCKING）：账 4000s→dispose→onFlush 两次（3600+400）', () => {
    const h = makeHarness()
    h.rt.start('p-1')
    h.advance(4_000_000)
    h.rt.dispose()
    expect(h.flushed).toEqual([
      { paperId: 'p-1', seconds: 3_600 },
      { paperId: 'p-1', seconds: 400 }
    ])
  })

  it('零头结转（门二 WARN 解耦）：可见 5s 零头→hidden→collectAndZero 返回含 5s', () => {
    const h = makeHarness()
    h.rt.start('p-1')
    h.advance(15_000)
    h.advance(5_000)
    h.setVisible(false)
    h.rt.onVisibilityChange()
    expect(h.rt.collectAndZero('p-1')).toBe(20)
    expect(h.ledger('p-1')).toBe(0)
  })

  it('NIT1（门二修订语义）：hidden 中 stop 结转可见零头入 A 账（零头不丢）', () => {
    const h = makeHarness()
    h.rt.start('A')
    h.advance(15_000)
    h.advance(5_000)
    h.setVisible(false)
    h.rt.onVisibilityChange()
    h.rt.stop()
    h.setVisible(true)
    h.rt.start('B')
    h.advance(15_000)
    expect(h.ledger('A')).toBe(20)
    expect(h.ledger('B')).toBe(15)
  })

  it('零头按实结转：不足 tick 的零头随 flush 结转（now 差值计，floor 秒）', () => {
    const h = makeHarness()
    const pending: Record<string, number> = {}
    const f = makeFlusher(pending, h.rt)
    h.rt.start('p-1')
    h.advance(READING_TICK_MS)
    h.advance(7_000)
    f.flush('p-1')
    expect(f.saved).toEqual([{ paperId: 'p-1', page: 9, secondsDelta: 22 }])
  })

  it('tick 常量=15s（票面：READING_TICK_MS）', () => {
    expect(READING_TICK_MS).toBe(15_000)
  })
})

describe('reading-time formatReadingTime 边界（纯函数）', () => {
  it('<60min 按分钟取整：0/59/60/61/125', () => {
    expect(formatReadingTime(0)).toBe('0 分钟')
    expect(formatReadingTime(59)).toBe('0 分钟')
    expect(formatReadingTime(60)).toBe('1 分钟')
    expect(formatReadingTime(61)).toBe('1 分钟')
    expect(formatReadingTime(125)).toBe('2 分钟')
  })

  it('≥60min：N 小时 M 分', () => {
    expect(formatReadingTime(3_600)).toBe('1 小时 0 分')
    expect(formatReadingTime(3_661)).toBe('1 小时 1 分')
    expect(formatReadingTime(4_525)).toBe('1 小时 15 分')
  })
})
