/**
 * [F-RECOV-01] recoveryWatchdog —— 双阈值看门狗/ghost 跟踪/探针定时器单元锁
 * （设计书 v2 §4.2/§4.3+终裁 W2/W5/W8/N3/N7+回炉轮1 R1/R2/R3/R5/R9；ports 注入
 * 桩测计时编排面；常态 save 永不取消——T_stuck 仅弃置标记，op 物理留驻）。
 * always-active。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createRecoveryWatchdog,
  type RecoveryWatchdogPorts,
  type WatchdogOutcome
} from '../../../src/renderer/features/lineage/recoveryWatchdog'

type LateSettle = Parameters<RecoveryWatchdogPorts['onLateSettle']>[1]

function deferredFlight(): { promise: Promise<WatchdogOutcome>; resolve(o: WatchdogOutcome): void } {
  let r!: (o: WatchdogOutcome) => void
  const promise = new Promise<WatchdogOutcome>((res) => {
    r = res
  })
  return { promise, resolve: r }
}

const calls: string[] = []
let degradedActive = true
let gateOpen = true
let inFlightActive = false
let snapshotThere = true
let probeDelay = 5000
const ports: RecoveryWatchdogPorts = {
  onSlow: () => calls.push('slow'),
  onStuck: (gen: number, isProbe: boolean) => calls.push(`stuck:${gen}:${isProbe ? 'probe' : 'edit'}`),
  onLateSettle: (gen: number, s: LateSettle) =>
    calls.push(`late:${gen}:${s.ok ? `ok:${s.token}` : `fail:${s.isProbe ? 'probe' : 'edit'}:${s.kind}`}`),
  degradedActive: () => degradedActive,
  gateOpen: () => gateOpen,
  inFlight: () => inFlightActive,
  snapshotPresent: () => snapshotThere,
  countProbeFailure: () => calls.push('count-failure'),
  dispatchProbe: () => calls.push('probe-due'),
  clearDegraded: () => calls.push('clear-degraded'),
  nextProbeDelay: () => probeDelay
}
let wd: ReturnType<typeof createRecoveryWatchdog>

beforeEach(() => {
  calls.length = 0
  degradedActive = true
  gateOpen = true
  inFlightActive = false
  snapshotThere = true
  probeDelay = 5000
  vi.useFakeTimers()
  wd = createRecoveryWatchdog(ports)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('F-RECOV-01 recoveryWatchdog —— T_slow/T_stuck/ghost（§4.2）', () => {
  it('R9 T_slow=10s 内 settle 零回调（5s 处 resolve——正常收束归宿主，双定时器清）', async () => {
    const f = deferredFlight()
    wd.watch(f.promise, 1, false)
    await vi.advanceTimersByTimeAsync(5000)
    f.resolve({ kind: 'saved', token: 'tok-1' })
    await vi.advanceTimersByTimeAsync(60000) // 跨过 T_slow/T_stuck 时点
    expect(calls).toEqual([])
  })

  it('T_stuck=60s 弃置（isProbe 透传+dispatch gen 捕获）；ghost 迟到成功→onLateSettle(token)；迟到失败→isProbe+kind 标', async () => {
    const f = deferredFlight()
    wd.watch(f.promise, 3, false)
    await vi.advanceTimersByTimeAsync(59999)
    expect(calls).toEqual(['slow'])
    await vi.advanceTimersByTimeAsync(1)
    expect(calls).toEqual(['slow', 'stuck:3:edit'])
    f.resolve({ kind: 'saved', token: 'tok-g' })
    await vi.advanceTimersByTimeAsync(0)
    expect(calls).toEqual(['slow', 'stuck:3:edit', 'late:3:ok:tok-g'])
    // 探针 ghost 失败形态（isProbe+kind 透传——R3 收窄判定源）
    const p = deferredFlight()
    wd.watch(p.promise, 4, true)
    await vi.advanceTimersByTimeAsync(60000)
    p.resolve({ kind: 'reject' })
    await vi.advanceTimersByTimeAsync(0)
    expect(calls[calls.length - 2]).toBe('stuck:4:probe')
    expect(calls[calls.length - 1]).toBe('late:4:fail:probe:reject')
  })

  it('settle 早于 T_stuck：无 onLateSettle（非 ghost——正常收束归 pump 裁决）', async () => {
    const f = deferredFlight()
    wd.watch(f.promise, 1, false)
    await vi.advanceTimersByTimeAsync(10000)
    f.resolve({ kind: 'saved', token: 'tok-1' })
    await vi.advanceTimersByTimeAsync(60000)
    expect(calls).toEqual(['slow']) // settle 后双定时器清——零 stuck/零 late
  })

  it('reset() 清双定时器（gen++ 面）；已弃置 ghost 的迟到 settle 仍回调（gen 捕获判废在宿主）', async () => {
    const f = deferredFlight()
    wd.watch(f.promise, 2, false)
    await vi.advanceTimersByTimeAsync(60000)
    expect(calls).toEqual(['slow', 'stuck:2:edit'])
    wd.reset()
    const g = deferredFlight()
    wd.watch(g.promise, 3, false) // 新飞行接管（reset 后 watch 正常臂）
    await vi.advanceTimersByTimeAsync(20000)
    expect(calls).toEqual(['slow', 'stuck:2:edit', 'slow']) // 新飞行 T_slow——旧 deadline 不误触
    f.resolve({ kind: 'overflow' })
    await vi.advanceTimersByTimeAsync(0)
    expect(calls[calls.length - 1]).toBe('late:2:fail:edit:overflow') // 旧 ghost 迟到仍对账（gen=2 捕获）
  })

  it('弃置后新飞行接管：旧 ghost settle 不清新飞行定时器（S2b 前提）', async () => {
    const f1 = deferredFlight()
    wd.watch(f1.promise, 1, false)
    await vi.advanceTimersByTimeAsync(60000)
    const f2 = deferredFlight()
    wd.watch(f2.promise, 1, false)
    await vi.advanceTimersByTimeAsync(10000) // f2 T_slow（旧 deadline 已随接管作废）
    expect(calls[calls.length - 1]).toBe('slow')
    f1.resolve({ kind: 'saved', token: 'tok-1' })
    await vi.advanceTimersByTimeAsync(0)
    expect(calls[calls.length - 1]).toBe('late:1:ok:tok-1')
    await vi.advanceTimersByTimeAsync(50000) // f2 未 settle——其 T_stuck 仍在
    expect(calls).toEqual(['slow', 'stuck:1:edit', 'slow', 'late:1:ok:tok-1', 'stuck:1:edit'])
  })
})

describe('F-RECOV-01 recoveryWatchdog —— R1/R5 主动弃置与探针 ghost 界', () => {
  it('R1 abandonCurrent（gen++ 面）：标记 ghost+清双定时器+isProbe 透传；零 onStuck 回调（处置三项归宿主）；迟到 settle 仍对账', async () => {
    const f = deferredFlight()
    wd.watch(f.promise, 7, false)
    await vi.advanceTimersByTimeAsync(5000)
    expect(wd.abandonCurrent()).toEqual({ abandoned: true, isProbe: false })
    expect(wd.abandonCurrent()).toEqual({ abandoned: false, isProbe: false }) // 幂等
    await vi.advanceTimersByTimeAsync(60000)
    expect(calls).toEqual([]) // 定时器已清且不触发 onStuck（R1=宿主三项处置）
    f.resolve({ kind: 'reject' })
    await vi.advanceTimersByTimeAsync(0)
    expect(calls).toEqual(['late:7:fail:edit:reject'])
  })

  it('R5 probeGhosts 界：探针弃置入界、settle 出界；非探针弃置不入界', async () => {
    const p = deferredFlight()
    wd.watch(p.promise, 8, true)
    wd.abandonCurrent()
    expect(wd.hasProbeGhost()).toBe(true)
    p.resolve({ kind: 'saved', token: 't' })
    await vi.advanceTimersByTimeAsync(0)
    expect(wd.hasProbeGhost()).toBe(false) // settle 出界
    const f = deferredFlight()
    wd.watch(f.promise, 9, false)
    wd.abandonCurrent()
    expect(wd.hasProbeGhost()).toBe(false) // 编辑 ghost 不占探针界
    f.resolve({ kind: 'reject' })
    await vi.advanceTimersByTimeAsync(0)
  })
})

describe('F-RECOV-01 recoveryWatchdog —— 探针定时器+probePending（§4.3/W5+回炉轮2 调度外移）', () => {
  it('armIfEligible：条件满足臂起→到点 dispatchProbe；stopProbe 杀循环；degraded 已清到点自杀', async () => {
    wd.armIfEligible()
    await vi.advanceTimersByTimeAsync(4999)
    expect(calls).toEqual([])
    await vi.advanceTimersByTimeAsync(1)
    expect(calls).toEqual(['probe-due'])
    wd.armIfEligible()
    wd.stopProbe()
    await vi.advanceTimersByTimeAsync(10000)
    expect(calls).toEqual(['probe-due'])
    degradedActive = false
    wd.armIfEligible() // degraded 已清——不臂
    await vi.advanceTimersByTimeAsync(10000)
    expect(calls).toEqual(['probe-due'])
    degradedActive = true
    gateOpen = false // frozen 停臂
    wd.armIfEligible()
    await vi.advanceTimersByTimeAsync(10000)
    expect(calls).toEqual(['probe-due'])
    gateOpen = true
    snapshotThere = false // W6①：臂点查 snapshot 空→即刻清不臂
    wd.armIfEligible()
    expect(calls).toEqual(['probe-due', 'clear-degraded'])
    snapshotThere = true
    inFlightActive = true // 在途不臂
    wd.armIfEligible()
    await vi.advanceTimersByTimeAsync(10000)
    expect(calls).toEqual(['probe-due', 'clear-degraded'])
  })

  it('probeTick 到点序：在途跳过零请求；探针 ghost 未 settle=计失败不实发（F1）；frozen 到点停', async () => {
    wd.armIfEligible()
    inFlightActive = true
    await vi.advanceTimersByTimeAsync(5000) // 到点——在途跳过（S12a）
    expect(calls).toEqual([]) // 零请求零计数
    inFlightActive = false
    await vi.advanceTimersByTimeAsync(5000) // 下一间隔——条件恢复→实发
    expect(calls).toEqual(['probe-due'])
  })

  it('probePending：mark→consume 单次真；再 consume 假；clear 后假（W5 独立 flag）', () => {
    expect(wd.consumeProbePending()).toBe(false)
    wd.markProbePending()
    expect(wd.consumeProbePending()).toBe(true)
    expect(wd.consumeProbePending()).toBe(false)
    wd.markProbePending()
    wd.clearProbePending()
    expect(wd.consumeProbePending()).toBe(false)
  })

  it('N3 同刻 tie-break：T_stuck 先于同刻探针触发（探针定时器先插场景——fireStuckIfDue）', async () => {
    const f = deferredFlight()
    probeDelay = 60000
    wd.armIfEligible() // 探针定时器先插入（同刻 60000）
    wd.watch(f.promise, 1, false) // stuck 定时器后插入
    await vi.advanceTimersByTimeAsync(60000)
    expect(calls[0]).toBe('slow')
    expect(calls[1]).toBe('stuck:1:edit') // T_stuck 先于 probe-due（N3 终裁）
    expect(calls[2]).toBe('probe-due')
  })
})
