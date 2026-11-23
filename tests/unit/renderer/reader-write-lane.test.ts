/**
 * [B4-A R1 §2.2/§4.3] tab-write-lane —— per-tab 串行写命令链（新建，always-active）。
 *
 * 锁设计稿 §4.3 的链序与互斥面（批注文本写/总评写/标注增删改/操作层与文本层
 * undo-redo 反向写共用一条链）：
 * - 同 tab 任务按入链顺序逐个执行——前一 settle 后下一任务才起步（不并发）；
 * - 不同 tab 的链互不阻塞；
 * - drain 等待该 tab 全部已入链任务 settle（含排在在途之后的）；任务 rejection
 *   不阻断链——结果由各任务返回的 promise 承载（drain 兑现≠落库成功）；
 * - 关 tab 清理只删空闲链；在途链保留至自然完结（同 paperId 立即重开不并发）。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  enqueueTabTask,
  laneClearTab,
  laneDepth,
  laneDrain,
  resetTabLanes
} from '../../../src/renderer/shared/tab-write-lane'

function deferred<T>(): { promise: Promise<T>; resolve: (v: T) => void; reject: (e: unknown) => void } {
  let resolve!: (v: T) => void
  let reject!: (e: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

/** 冲微任务到链起步 */
async function flush(): Promise<void> {
  for (let i = 0; i < 8; i++) await Promise.resolve()
}

afterEach(() => {
  resetTabLanes()
})

describe('B4-A R1 tab-write-lane —— per-tab 串行写链', () => {
  it('串行序：同 tab 任务按入链顺序执行，前一个 settle 后下一个才起步', async () => {
    const order: string[] = []
    const first = deferred<string>()
    const p1 = enqueueTabTask('p-1', async () => {
      order.push('1:start')
      const v = await first.promise
      order.push('1:end')
      return v
    })
    const p2 = enqueueTabTask('p-1', async () => {
      order.push('2:start')
      return 'two'
    })
    await flush()
    // 第一任务在途——第二任务未起步（不并发）
    expect(order).toEqual(['1:start'])
    expect(laneDepth('p-1')).toBe(2)
    first.resolve('one')
    await expect(p1).resolves.toBe('one')
    await expect(p2).resolves.toBe('two')
    expect(order).toEqual(['1:start', '1:end', '2:start'])
    expect(laneDepth('p-1')).toBe(0)
  })

  it('跨 tab 独立：p-1 在途不阻塞 p-2 的任务', async () => {
    const gate = deferred<void>()
    void enqueueTabTask('p-1', () => gate.promise)
    const ran: string[] = []
    const p2 = enqueueTabTask('p-2', async () => {
      ran.push('p-2')
    })
    await flush()
    expect(ran).toEqual(['p-2'])
    await p2
    gate.resolve()
  })

  it('drain：等待该 tab 全部已入链任务（含排在在途之后的）settle', async () => {
    const gate = deferred<void>()
    void enqueueTabTask('p-1', () => gate.promise)
    let secondDone = false
    void enqueueTabTask('p-1', async () => {
      secondDone = true
    })
    await flush()
    let drained = false
    const draining = laneDrain('p-1').then(() => {
      drained = true
    })
    await flush()
    expect(drained).toBe(false)
    expect(secondDone).toBe(false)
    gate.resolve()
    await draining
    expect(drained).toBe(true)
    expect(secondDone).toBe(true)
  })

  it('失败不阻断链：rejection 上抛给该任务调用方，后续任务照常执行；drain 仍兑现', async () => {
    const boom = new Error('写失败')
    const failed = enqueueTabTask('p-1', async () => {
      throw boom
    })
    const next = enqueueTabTask('p-1', async () => 'after-failure')
    await expect(failed).rejects.toBe(boom)
    await expect(next).resolves.toBe('after-failure')
    // drain 兑现≠落库成功（§4.3 #4）：失败链上 drain 照样 resolve
    await expect(laneDrain('p-1')).resolves.toBeUndefined()
    expect(laneDepth('p-1')).toBe(0)
  })

  it('未知 tab：drain 立即兑现、depth=0（无链不建条目）', async () => {
    expect(laneDepth('p-none')).toBe(0)
    await expect(laneDrain('p-none')).resolves.toBeUndefined()
  })

  it('关 tab 清理：空闲链删除；在途链保留——同 paperId 重开的新任务仍排在原链之后', async () => {
    const gate = deferred<void>()
    void enqueueTabTask('p-1', () => gate.promise)
    await flush()
    // 在途：不删除（depth>0）
    laneClearTab('p-1')
    expect(laneDepth('p-1')).toBe(1)
    const order: string[] = []
    void enqueueTabTask('p-1', async () => {
      order.push('reopened')
    })
    await flush()
    expect(order).toEqual([])
    gate.resolve()
    await flush()
    expect(order).toEqual(['reopened'])
    // 空闲：删除（条目不驻留）
    laneClearTab('p-1')
    expect(laneDepth('p-1')).toBe(0)
    const spy = vi.fn(async () => 'fresh')
    await expect(enqueueTabTask('p-1', spy)).resolves.toBe('fresh')
  })
})
