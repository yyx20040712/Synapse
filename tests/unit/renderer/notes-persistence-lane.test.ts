/**
 * [B4-A R1 §2.2/§4.3] notes 写体入 per-tab lane —— store 级（新建，always-active；
 * §12.2 notes.store 行「迁到 persistence 适配」的串行化合约）。
 *
 * 总评写与同 tab 批注文本写/操作层 undo-redo 反向写共用一条 per-tab 串行链：
 * - 在途写即链任务（laneDepth 可见；laneDrain 等待它）；
 * - 同篇并发派发不并发：第二发 API 在第一笔落定后才派发（载荷=各自派发时快照）；
 * - 跨篇写互不阻塞。沿用 resetModules+stubGlobal 桩法（每用例新模块态）。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const saved = (contentMd: string, updatedAt: string) => ({
  ok: true as const,
  data: { id: 'n-1', paperId: 'p-1', contentMd, createdAt: 't', updatedAt }
})

async function loadWorld() {
  vi.resetModules()
  const api = {
    notes: {
      get: vi.fn(async (): Promise<unknown> => saved('', 't0')),
      save: vi.fn() as ReturnType<typeof vi.fn>
    }
  }
  vi.stubGlobal('window', { api })
  const [notesMod, laneMod] = await Promise.all([
    import('../../../src/renderer/features/notes/notes.store'),
    import('../../../src/renderer/shared/tab-write-lane')
  ])
  const useStore = notesMod.useNotesStore
  await useStore.getState().load('p-1')
  return { api, useStore, lane: laneMod }
}

async function laneTick(): Promise<void> {
  await Promise.resolve()
}

async function flush(turns = 12): Promise<void> {
  for (let i = 0; i < turns; i++) await Promise.resolve()
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('B4-A R1 notes 写体经 per-tab lane 串行', () => {
  it('在途写=链任务：laneDepth 可见、laneDrain 等待其落定', async () => {
    const w = await loadWorld()
    let release!: (v: unknown) => void
    w.api.notes.save.mockImplementationOnce(() => new Promise((r) => { release = r }))
    w.useStore.getState().edit('p-1', { contentMd: '在途' })
    void w.useStore.getState().saveNow('p-1')
    await laneTick()
    expect(w.api.notes.save).toHaveBeenCalledTimes(1)
    expect(w.lane.laneDepth('p-1')).toBe(1)
    let drained = false
    const draining = w.lane.laneDrain('p-1').then(() => {
      drained = true
    })
    await flush()
    expect(drained).toBe(false)
    release(saved('在途', 't1'))
    await draining
    expect(drained).toBe(true)
    expect(w.lane.laneDepth('p-1')).toBe(0)
  })

  it('同篇并发派发不并发：第二发 API 在第一笔落定后才派发（各自派发时载荷快照）', async () => {
    const w = await loadWorld()
    let releaseFirst!: (v: unknown) => void
    w.api.notes.save
      .mockImplementationOnce(() => new Promise((r) => { releaseFirst = r }))
      .mockImplementationOnce(async () => saved('第二笔', 't2'))
    w.useStore.getState().edit('p-1', { contentMd: '第一笔' })
    const first = w.useStore.getState().saveNow('p-1')
    await laneTick()
    w.useStore.getState().edit('p-1', { contentMd: '第二笔' })
    const second = w.useStore.getState().saveNow('p-1')
    await flush()
    // 第一笔在途：第二发尚未派发（不并发——旧实现可双发在途）
    expect(w.api.notes.save).toHaveBeenCalledTimes(1)
    expect(w.lane.laneDepth('p-1')).toBe(2)
    releaseFirst(saved('第一笔', 't1'))
    await Promise.all([first, second])
    expect(w.api.notes.save).toHaveBeenCalledTimes(2)
    expect(w.api.notes.save.mock.calls.map((c) => c[0]?.contentMd)).toEqual(['第一笔', '第二笔'])
    expect(w.useStore.getState().noteByPaper['p-1']?.pending).toBe(false)
  })

  it('跨篇写互不阻塞：p-1 在途不阻塞 p-2 的写', async () => {
    const w = await loadWorld()
    w.api.notes.get.mockResolvedValue({ ok: true, data: null })
    await w.useStore.getState().load('p-2')
    let release!: (v: unknown) => void
    w.api.notes.save.mockImplementationOnce(() => new Promise((r) => { release = r }))
    w.api.notes.save.mockImplementationOnce(async () => saved('乙', 't3'))
    w.useStore.getState().edit('p-1', { contentMd: '甲' })
    w.useStore.getState().edit('p-2', { contentMd: '乙' })
    const a = w.useStore.getState().saveNow('p-1')
    await laneTick()
    const b = w.useStore.getState().saveNow('p-2')
    await flush()
    expect(w.api.notes.save).toHaveBeenCalledTimes(2)
    await b
    release(saved('甲', 't2'))
    await a
  })
})
