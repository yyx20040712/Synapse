// @vitest-environment jsdom
/**
 * [F-VISFB-64] quit-flush-bridge 测试（新建，always-active）——busy/orphan/abort
 * epoch 语义+5000ms 有界复位兜底（设计稿 §⑥ renderer 子态表）+ quit-closing-gate
 * 模块单测（α 同步冻结门+origin 豁免域）。
 *
 * 锁链：
 * - 新帧（无 busy/orphan）=同步 closing=true+四步收口；busy∨orphan 期间新帧
 *   立即回执 true（不并发四步）；
 * - ④=false 保持冻结至 destroy/abort/安全复位；④=true/异常=按脏解冻；
 * - abort（epoch 水线=requestId 数值）废止不超过该 id 的活动 epoch；未 settle
 *   旧 epoch 转 orphan-pending（旧 epoch 禁止回 false——settle 零回执）；
 *   迟到/重复 abort 不误伤新 epoch；
 * - abort 丢失=最晚 QUIT_FLUSH_TIMEOUT_MS 解除 closing（B 兜底，值单源
 *   @shared/constants）；orphan 全清后才允许新帧恢复四步；
 * - gate：closing∧非豁免域=写闸；runQuitInternal 豁免域内放行（同步域——
 *   跨 await 收口链在命中闸点的同步调用处就地包裹）。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub, stubApiEvents } from '../../utils/api-client-mock'

const mocks = vi.hoisted(() => ({
  reportQuitFlush: vi.fn(async () => ({ ok: true as const, data: { ok: true } })),
  runQuitFlush: vi.fn()
}))
makeApiStub({ system: { reportQuitFlush: mocks.reportQuitFlush } })
let flushCb: ((e: { requestId: string }) => void) | null = null
let abortCb: ((e: { requestId: string }) => void) | null = null
stubApiEvents({
  onQuitFlush: (cb: (e: { requestId: string }) => void) => {
    flushCb = cb
    return () => {
      flushCb = null
    }
  },
  onQuitFlushAbort: (cb: (e: { requestId: string }) => void) => {
    abortCb = cb
    return () => {
      abortCb = null
    }
  }
})
vi.mock('../../../src/renderer/app/quit-flush', () => ({ runQuitFlush: mocks.runQuitFlush }))

import { installQuitFlushBridge } from '../../../src/renderer/app/quit-flush-bridge'
import {
  quitWriteBlocked,
  runQuitInternal,
  setQuitClosing
} from '../../../src/renderer/app/quit-closing-gate'
import { QUIT_FLUSH_TIMEOUT_MS } from '../../../src/shared/constants'

/** 微任务排空（bridge 回执链 ≤6 跳） */
async function drain(turns = 10): Promise<void> {
  for (let i = 0; i < turns; i++) await Promise.resolve()
}

/** 可控 deferred 的 runQuitFlush 桩（close 前异步写在途形态的驱动面——访问器
 *  形：对象字面量快照会捕到 undefined，须经闭包取现值） */
function seedFlush(): { resolve(v: boolean): void; reject(e: unknown): void } {
  let resolveFn: ((v: boolean) => void) | null = null
  let rejectFn: ((e: unknown) => void) | null = null
  mocks.runQuitFlush.mockImplementationOnce(
    () =>
      new Promise<boolean>((res, rej) => {
        resolveFn = res
        rejectFn = rej
      })
  )
  return {
    resolve: (v: boolean) => resolveFn?.(v),
    reject: (e: unknown) => rejectFn?.(e)
  }
}

function fire(requestId: string): void {
  if (flushCb === null) throw new Error('onQuitFlush 未订阅')
  flushCb({ requestId })
}

function abort(requestId: string): void {
  if (abortCb === null) throw new Error('onQuitFlushAbort 未订阅')
  abortCb({ requestId })
}

let off: (() => void) | null = null

beforeEach(() => {
  vi.clearAllMocks()
  setQuitClosing(false)
  off = installQuitFlushBridge()
})

afterEach(() => {
  off?.()
  off = null
  setQuitClosing(false)
  vi.useRealTimers()
})

describe('quit-flush-bridge —— busy/orphan/abort/有界复位（F-VISFB-64）', () => {
  it('新帧（无 busy/orphan）：同步 closing=true+四步启动（runQuitFlush 恰一次）', async () => {
    const flight = seedFlush()
    fire('quit-flush-1')
    expect(quitWriteBlocked()).toBe(true)
    expect(mocks.runQuitFlush).toHaveBeenCalledTimes(1)
    flight.resolve(false)
    await drain()
  })

  it('busy 期间新帧：立即回执 true（不并发四步——runQuitFlush 仍恰一次）', async () => {
    const flight = seedFlush()
    fire('quit-flush-1')
    fire('quit-flush-2')
    await drain()
    expect(mocks.runQuitFlush).toHaveBeenCalledTimes(1)
    expect(mocks.reportQuitFlush).toHaveBeenCalledWith({
      requestId: 'quit-flush-2',
      stillDirty: true
    })
    flight.resolve(true)
    await drain()
  })

  it('④=false：回执 false 且保持冻结（destroy/abort/复位前不解冻）', async () => {
    const flight = seedFlush()
    fire('quit-flush-1')
    flight.resolve(false)
    await drain()
    expect(mocks.reportQuitFlush).toHaveBeenCalledWith({
      requestId: 'quit-flush-1',
      stillDirty: false
    })
    expect(quitWriteBlocked()).toBe(true)
  })

  it('④=true：回执 true 且解冻（按脏处理，无 clean 自动销毁面）', async () => {
    const flight = seedFlush()
    fire('quit-flush-1')
    flight.resolve(true)
    await drain()
    expect(mocks.reportQuitFlush).toHaveBeenCalledWith({
      requestId: 'quit-flush-1',
      stillDirty: true
    })
    expect(quitWriteBlocked()).toBe(false)
  })

  it('runQuitFlush 异常：按脏 true+解冻（不静默、不挂死）', async () => {
    const flight = seedFlush()
    fire('quit-flush-1')
    flight.reject(new Error('save boom'))
    await drain()
    expect(mocks.reportQuitFlush).toHaveBeenCalledWith({
      requestId: 'quit-flush-1',
      stillDirty: true
    })
    expect(quitWriteBlocked()).toBe(false)
  })

  it('abort 当前 epoch：解冻+busy 转 orphan；旧 epoch settle 零回执（禁 false）', async () => {
    const flight = seedFlush()
    fire('quit-flush-1')
    abort('quit-flush-1')
    expect(quitWriteBlocked()).toBe(false)
    expect(mocks.reportQuitFlush).not.toHaveBeenCalled()
    flight.resolve(false)
    await drain()
    expect(mocks.reportQuitFlush).not.toHaveBeenCalled()
  })

  it('orphan 期间新帧：立即回执 true（不并发四步）', async () => {
    const flight = seedFlush()
    fire('quit-flush-1')
    abort('quit-flush-1')
    fire('quit-flush-2')
    await drain()
    expect(mocks.runQuitFlush).toHaveBeenCalledTimes(1)
    expect(mocks.reportQuitFlush).toHaveBeenCalledWith({
      requestId: 'quit-flush-2',
      stillDirty: true
    })
    flight.resolve(true)
    await drain()
  })

  it('orphan settle 后新帧：恢复四步（不立即 true——orphan 全清才放行新 flush）', async () => {
    const flight = seedFlush()
    fire('quit-flush-1')
    abort('quit-flush-1')
    flight.resolve(true)
    await drain()
    const second = seedFlush()
    fire('quit-flush-2')
    expect(mocks.runQuitFlush).toHaveBeenCalledTimes(2)
    second.resolve(true)
    await drain()
    expect(mocks.reportQuitFlush).toHaveBeenCalledWith({
      requestId: 'quit-flush-2',
      stillDirty: true
    })
  })

  it('迟到/重复 abort（epoch≤水线）：不误伤新 busy epoch（仍冻结、不转 orphan）', async () => {
    const first = seedFlush()
    fire('quit-flush-1')
    abort('quit-flush-1')
    first.resolve(true)
    await drain()
    const second = seedFlush()
    fire('quit-flush-2')
    expect(quitWriteBlocked()).toBe(true)
    abort('quit-flush-1')
    expect(quitWriteBlocked()).toBe(true)
    second.resolve(false)
    await drain()
    expect(mocks.reportQuitFlush).toHaveBeenCalledWith({
      requestId: 'quit-flush-2',
      stillDirty: false
    })
  })

  it('B 兜底：flush 挂起→最晚 5000ms 解冻+epoch 转 orphan（新帧立即 true）', async () => {
    vi.useFakeTimers()
    seedFlush()
    fire('quit-flush-1')
    expect(quitWriteBlocked()).toBe(true)
    await vi.advanceTimersByTimeAsync(QUIT_FLUSH_TIMEOUT_MS - 1)
    expect(quitWriteBlocked()).toBe(true)
    await vi.advanceTimersByTimeAsync(1)
    expect(quitWriteBlocked()).toBe(false)
    fire('quit-flush-2')
    await vi.advanceTimersByTimeAsync(0)
    expect(mocks.runQuitFlush).toHaveBeenCalledTimes(1)
    expect(mocks.reportQuitFlush).toHaveBeenCalledWith({
      requestId: 'quit-flush-2',
      stillDirty: true
    })
  })

  it('B 兜底（clean 回执后 destroy 未达）：fallback 到期解除冻结', async () => {
    vi.useFakeTimers()
    const flight = seedFlush()
    fire('quit-flush-1')
    flight.resolve(false)
    await vi.advanceTimersByTimeAsync(0)
    expect(mocks.reportQuitFlush).toHaveBeenCalledWith({
      requestId: 'quit-flush-1',
      stillDirty: false
    })
    expect(quitWriteBlocked()).toBe(true)
    await vi.advanceTimersByTimeAsync(QUIT_FLUSH_TIMEOUT_MS)
    expect(quitWriteBlocked()).toBe(false)
  })

  it('[回炉 N1] 旧 abort（epoch<busy epoch）整体忽略：不解冻不 orphan——busy epoch 回执链不受扰', async () => {
    const flight = seedFlush()
    fire('quit-flush-5')
    abort('quit-flush-3')
    // 跨通道乱序旧 abort：新 flush（epoch 5）冻结保持——不解冻、不 orphan
    expect(quitWriteBlocked()).toBe(true)
    flight.resolve(false)
    await drain()
    // busy epoch 的 clean 回执链不受旧取消干扰（未被废止）
    expect(mocks.reportQuitFlush).toHaveBeenCalledWith({
      requestId: 'quit-flush-5',
      stillDirty: false
    })
  })

  it('[轮2 B-r1-02] latest-epoch 对称防线：clean settle 冻结后迟到旧 abort（帧已前进）不解冻', async () => {
    // id1 dirty settle（按脏解冻）→ id2 clean settle（保持冻结）→ 乱序迟到
    // abort1（FIFO 不可达——防御对称面）：lastFrameEpoch=2 已前进，整体忽略
    const f1 = seedFlush()
    fire('quit-flush-1')
    f1.resolve(true)
    await drain()
    const f2 = seedFlush()
    fire('quit-flush-2')
    f2.resolve(false)
    await drain()
    expect(mocks.reportQuitFlush).toHaveBeenCalledWith({
      requestId: 'quit-flush-2',
      stillDirty: false
    })
    expect(quitWriteBlocked()).toBe(true)
    abort('quit-flush-1')
    expect(quitWriteBlocked()).toBe(true)
  })

  it('退订：off 后帧/abort 零作用（进程级单订阅语义——退订面回归）', () => {
    off?.()
    off = null
    expect(() => fire('quit-flush-9')).toThrow('onQuitFlush 未订阅')
  })
})

describe('quit-closing-gate —— α 冻结门+origin 豁免（F-VISFB-64）', () => {
  afterEach(() => {
    setQuitClosing(false)
  })

  it('非 closing：写闸恒 false（默认态零影响）', () => {
    expect(quitWriteBlocked()).toBe(false)
  })

  it('closing=true：用户写闸同步生效（模块级单例，非 React state）', () => {
    setQuitClosing(true)
    expect(quitWriteBlocked()).toBe(true)
  })

  it('origin 豁免域=同步域：sync fn 域内放行（含嵌套）；出域即恢复拦截', () => {
    setQuitClosing(true)
    expect(runQuitInternal(() => quitWriteBlocked())).toBe(false)
    expect(runQuitInternal(() => runQuitInternal(() => quitWriteBlocked()))).toBe(false)
    expect(quitWriteBlocked()).toBe(true)
  })

  it('[回炉 B1] 同步域不跨 await：async fn 首个 await 后即域外——flush 在途窗用户写被拒', async () => {
    setQuitClosing(true)
    let before: boolean | undefined
    let after: boolean | undefined
    await runQuitInternal(async () => {
      before = quitWriteBlocked()
      await Promise.resolve()
      after = quitWriteBlocked()
    })
    expect(before).toBe(false)
    expect(after).toBe(true)
  })
})
