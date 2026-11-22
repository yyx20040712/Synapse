// b3: B3 commit B 子波 1（2026-11-22）——drag-frame-scheduler 纯模块注入直测
//（设计稿 §11 策略 2/§13 commit B 门：调度序/排空语义/至多一帧/自续泵/onFrame 内
// 重入 schedule 不双 rAF/无输入帧=泵空转，注入 raf 后可单测判别——INV-100 帧时序
// 面「不可下沉」据此收窄；easing/真帧距不可下沉归 CSS 声明锁+真机验收）。
// 新增用例申报：设计稿 §11/§13 commit B 门点名面——实现批新增（先红后绿核对：
// 本件对 commit A 源亦可绿——调度器语义 commit A 已就位，本件锁其契约不回退）。
import { describe, expect, it, vi } from 'vitest'
import { createFrameScheduler } from '../../../src/renderer/features/lineage/drag-frame-scheduler'

/** 注入式 rAF 捕获队列：flush=冲洗一帧；caf=真摘队（对齐真机 cancelAnimationFrame 语义——
 *  lineage-b3-frame stub 同族冲洗式，另补可摘除形供 cancel 契约面判别） */
function makeRaf(): {
  raf: (cb: (t: number) => void) => number
  caf: (id: number) => void
  flush: (now?: number) => void
  queued: number
} {
  const q = new Map<number, (t: number) => void>()
  let seq = 0
  return {
    raf: (cb) => {
      q.set(++seq, cb)
      return seq
    },
    caf: (id) => {
      q.delete(id)
    },
    queued: {
      valueOf: () => q.size,
      toString: () => String(q.size)
    } as unknown as number,
    flush: (now = 0) => {
      const batch = [...q.values()]
      q.clear()
      batch.forEach((cb) => cb(now))
    }
  }
}

describe('[B3 §3.1] drag-frame-scheduler 注入直测（至多一帧/排空/重入合流/自续泵）', () => {
  it('schedule 幂等：同帧多次 schedule 至多一个 rAF 在飞；flush 排空一次 onFrame', () => {
    const r = makeRaf()
    const onFrame = vi.fn()
    const s = createFrameScheduler({ onFrame, raf: r.raf, caf: r.caf })
    s.schedule()
    s.schedule()
    s.schedule()
    expect(Number(r.queued)).toBe(1) // 幂等——至多一帧在飞
    r.flush(1)
    expect(onFrame).toHaveBeenCalledTimes(1)
    expect(onFrame).toHaveBeenCalledWith(1)
    expect(Number(r.queued)).toBe(0) // 排空后无自续（调用方未再 schedule）
  })

  it('onFrame 内重入 schedule 只置 pendingInput 不双排 rAF；帧尾合流排恰一帧下一帧（W12 两层语义）', () => {
    const r = makeRaf()
    let frames = 0
    const s = createFrameScheduler({
      onFrame: () => {
        frames += 1
        s.schedule() // 重入（含滚动泵重入同形）——不得在此直接排第二个 rAF
      },
      raf: r.raf,
      caf: r.caf
    })
    s.schedule()
    expect(Number(r.queued)).toBe(1)
    r.flush(1)
    expect(frames).toBe(1)
    expect(Number(r.queued), '帧尾按 pendingInput 合流排恰一个下一帧').toBe(1)
    r.flush(2)
    expect(frames).toBe(2)
  })

  it('会话期自续泵：onFrame 帧末 schedule → 无外部输入连续多帧空转（W12/AS-02 静止光标泵续跑面）', () => {
    const r = makeRaf()
    let frames = 0
    const s = createFrameScheduler({
      onFrame: () => {
        frames += 1
        if (frames < 5) s.schedule() // 泵自续 5 帧后停止重排
      },
      raf: r.raf,
      caf: r.caf
    })
    s.schedule()
    for (let i = 0; i < 10; i++) r.flush(i)
    expect(frames).toBe(5) // 自续至 5 帧——泵停后不再排帧
    expect(Number(r.queued)).toBe(0)
  })

  it('cancel 摘在飞 rAF：cancel 后 flush 不执行 onFrame；重复 cancel 幂等', () => {
    const r = makeRaf()
    const caf = vi.fn((id: number) => r.caf(id)) // spy 委派真摘队（对齐真机 cancelAnimationFrame）
    const onFrame = vi.fn()
    const s = createFrameScheduler({ onFrame, raf: r.raf, caf })
    s.schedule()
    s.cancel()
    expect(caf).toHaveBeenCalledTimes(1)
    r.flush(1)
    expect(onFrame).not.toHaveBeenCalled()
    s.cancel() // 幂等（rafId 已清不再 caf）
    expect(caf).toHaveBeenCalledTimes(1)
  })

  it('cancel 清 pendingInput：onFrame 内 schedule 后 cancel 不再排下一帧', () => {
    const r = makeRaf()
    const s = createFrameScheduler({
      onFrame: () => s.schedule(),
      raf: r.raf,
      caf: r.caf
    })
    s.schedule()
    r.flush(1)
    expect(Number(r.queued)).toBe(1) // 帧尾自续排队
    s.cancel()
    expect(Number(r.queued)).toBe(0)
    r.flush(2) // 残帧=no-op（会话清理路径）
    expect(Number(r.queued)).toBe(0)
  })
})
