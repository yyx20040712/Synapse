/**
 * [F-RECOV-01] recoveryWatchdog —— 常态 save 双阈值看门狗+探针调度+ghost 跟踪
 * （设计书 v2 §4.2/§4.3+终裁 W2/W5/W8/N3/N7+回炉轮1 R1-R5+回炉轮2 F1-F3/F7）。
 * 红线①承载：永不取消 op——T_slow 仅呈现回调、T_stuck/abandonCurrent 仅弃置
 * 标记（op 物理留驻=ghost，迟到 settle 经 onLateSettle 对账）；一切取消语义
 * 不存在于本件。
 *
 * ── 行为面（状态机：flight{watched,slow→stuck|abandoned→ghost}×probe{armed,fired}）──
 * - watch(promise,gen,isProbe)：臂 T_slow=10s（onSlow）与 T_stuck=60s（onStuck
 *   携 dispatch gen——宿主同型 gen 守卫，自 dispatch 起绝对 deadline 含 IPC+排队，
 *   renderer 唯一可观测口径）；settle（含 rejection 防御分支——F3② 视为失败
 *   kind）即清双定时器+出 current（F2：abandonCurrent 不再把已 settle flight
 *   判 abandoned）；弃置后 settle=ghost→onLateSettle（成功分 token／失败分
 *   isProbe+kind——R3：仅 reject|overflow 属失败例外族，stale/pending 不计）。
 * - abandonCurrent（R1 gen++ 面）：主动弃置当前未弃置 flight（标记 ghost+清双
 *   定时器+返 isProbe；零 onStuck 回调——inFlight 清/streak 计数等处置三项归
 *   宿主）；迟到 settle 走 onLateSettle gen 判废仅记账。
 * - 探针调度（回炉轮2 外移入本件——主控示例方向；streak 记账经 countProbeFailure
 *   回调驻 scheduler，N7「streak 驻 scheduler」保持）：armIfEligible=臂条件判定
 *   （degraded∧open∧无在途；snapshot 空→clearDegraded 即刻清 W6①）；probeTick
 *   到点序=自然停（degraded 已清）→frozen 停臂→在途跳过（S12a，不顺延不合流）
 *   →snapshot 空→clearDegraded 即刻清（C1 判定序：先于 ghost 计数——禁假告警
 *   升级，S16c）→**探针 ghost 未 settle=计一次失败观测 F1（不实发——界=1 保持不破；到点
 *   核查 ghost 安息=「重试确认」的观测行为本身，stuck-pending 文案与行为一致；
 *   W8 主路径：永挂下 5+15+30s 三到点→streak 3→unavailable+重启缀可达）**→
 *   ghost 已 settle→实发路径（恢复实发）；实发=dispatchProbe（宿主 pump 单飞）。
 * - probeGhosts 界（R5/C2 口径）：探针 ghost 未 settle 驻界、settle 出界，
 *   **每代**至多 1 具（reset/gen++ 清界——跨代可并发）；全局上界=per-(ws,type)
 *   ≤D_max——main 侧链深 cap（8 队满后新 save 溢出拒）结构性兜底，跨 ws 累计
 *   =N×D_max 有界于工作区数，本件不自设上限。
 * - probePending（W5 独立 flag）：mark/clear/consume 单消费——宿主 pump 以
 *   consume 判 isProbe（任何编辑 dispatch 启动即消费=清待发探针，S12b）。
 * - per-flight 闭包跟踪：新飞行接管后旧 ghost 迟到 settle 仍回调（S2b 前提）
 *   且不清新飞行定时器。
 */
export const T_SLOW_MS = 10_000
export const T_STUCK_MS = 60_000

/** dispatchSave settle 结果（成功携 token；stale/pending/overflow/reject/skipped） */
export type WatchdogOutcome =
  | { kind: 'saved'; token: string }
  | { kind: 'stale'; epoch: number }
  | { kind: 'pending' }
  | { kind: 'overflow' }
  | { kind: 'reject' }
  | { kind: 'skipped' }

/** ghost 迟到失败面（R3：kind 收窄判定源——仅 reject|overflow 属失败例外族） */
export type WatchdogLateFailure = {
  ok: false
  isProbe: boolean
  kind: Exclude<WatchdogOutcome['kind'], 'saved'>
}

export interface RecoveryWatchdogPorts {
  /** T_slow 到点（在途>10s 无失败观测）——置呈现 kind=slow+health=slow */
  onSlow(): void
  /** T_stuck 到点（逻辑弃置）——gen=dispatch 时捕获（宿主同型 gen 守卫）；
   *  isProbe=被弃飞行是探针（hung 计 probeFailStreak——W8/S11c） */
  onStuck(gen: number, isProbe: boolean): void
  /** ghost（弃置后迟到 settle）：成功分 token（token 双账本记账面）；失败分
   *  isProbe+kind（gen 判废与 R3 收窄在宿主）；gen=watch 时捕获 */
  onLateSettle(gen: number, settle: { ok: true; token: string } | WatchdogLateFailure): void
  /** degraded 仍生效（探针到点自然停判定） */
  degradedActive(): boolean
  // ── 探针调度判定面（回炉轮2 自 scheduler 外移；streak 记账经回调驻 scheduler）──
  gateOpen(): boolean
  inFlight(): boolean
  snapshotPresent(): boolean
  /** F1：计一次探针失败观测（streak++ 与 kind 呈现驻 scheduler——N7 单源） */
  countProbeFailure(): void
  /** 实发探针（immediateResend 语义经宿主 pump——pump 消费 probePending=isProbe 记账） */
  dispatchProbe(): void
  /** W6①：degraded∧snapshot 空 即刻清（禁假告警） */
  clearDegraded(): void
  /** 下一探针间隔（probeDelayMs(probeFailStreak)——streak 单源驻 scheduler） */
  nextProbeDelay(): number
}

interface TrackedFlight {
  abandoned: boolean
  isProbe: boolean
  gen: number
  p: Promise<WatchdogOutcome>
}

type Timer = ReturnType<typeof setTimeout>

export interface RecoveryWatchdog {
  watch(p: Promise<WatchdogOutcome>, gen: number, isProbe: boolean): void
  /** R1：主动弃置当前未弃置 flight（gen++ 面）——返 {abandoned, isProbe} */
  abandonCurrent(): { abandoned: boolean; isProbe: boolean }
  /** R5：探针 ghost 未 settle 在界（每代至多 1 具）——测试专用（生产面走内部 probeGhosts.size） */
  hasProbeGhost(): boolean
  /** 探针臂条件判定+臂起（degraded∧open∧无在途；snapshot 空→即刻清）——关键状态迁移点调用 */
  armIfEligible(): void
  stopProbe(): void
  reset(): void
  markProbePending(): void
  clearProbePending(): void
  consumeProbePending(): boolean
}

export function createRecoveryWatchdog(ports: RecoveryWatchdogPorts): RecoveryWatchdog {
  let slowTimer: Timer | null = null
  let stuckTimer: Timer | null = null
  let stuckDueAt: number | null = null
  let current: TrackedFlight | null = null
  let probeTimer: Timer | null = null
  let probePending = false
  /** R5：探针 ghost 界（弃置入界/settle 出界——至多 1 具在途） */
  const probeGhosts = new Set<Promise<WatchdogOutcome>>()

  function clearWatchTimers(): void {
    if (slowTimer !== null) {
      clearTimeout(slowTimer)
      slowTimer = null
    }
    if (stuckTimer !== null) {
      clearTimeout(stuckTimer)
      stuckTimer = null
    }
    stuckDueAt = null
  }

  function fireStuckOf(flight: TrackedFlight): void {
    if (current !== flight || flight.abandoned) return
    flight.abandoned = true
    if (flight.isProbe) probeGhosts.add(flight.p)
    clearWatchTimers()
    ports.onStuck(flight.gen, flight.isProbe)
  }

  /** N3 同刻 tie-break：探针到点时若 T_stuck 已到期未处理，先弃置后探针 */
  function fireStuckIfDue(): void {
    if (stuckDueAt === null || current === null || current.abandoned) return
    if (Date.now() >= stuckDueAt) fireStuckOf(current)
  }

  function watch(p: Promise<WatchdogOutcome>, gen: number, isProbe: boolean): void {
    clearWatchTimers()
    const flight: TrackedFlight = { abandoned: false, isProbe, gen, p }
    current = flight
    slowTimer = setTimeout(() => {
      if (current === flight) ports.onSlow()
    }, T_SLOW_MS)
    stuckDueAt = Date.now() + T_STUCK_MS
    stuckTimer = setTimeout(() => fireStuckOf(flight), T_STUCK_MS)
    const settle = (outcome: WatchdogOutcome): void => {
      if (current === flight) {
        clearWatchTimers()
        current = null // F2：settle 即出 current——abandonCurrent 不再把已 settle flight 判 abandoned（幻影计数消除）
      }
      probeGhosts.delete(p)
      if (!flight.abandoned) return // 正常收束——裁决归宿主 pump
      ports.onLateSettle(
        gen,
        outcome.kind === 'saved' ? { ok: true, token: outcome.token } : { ok: false, isProbe, kind: outcome.kind }
      )
    }
    // F3②：rejection 分支（防御性——dispatchSave 恒不 reject，视为失败 kind 同构对账）
    void p.then(settle, () => settle({ kind: 'reject' }))
  }

  function abandonCurrent(): { abandoned: boolean; isProbe: boolean } {
    if (current === null || current.abandoned) return { abandoned: false, isProbe: false }
    current.abandoned = true
    if (current.isProbe) probeGhosts.add(current.p)
    const isProbe = current.isProbe
    clearWatchTimers()
    return { abandoned: true, isProbe }
  }

  function armProbe(delayMs: number): void {
    if (probeTimer !== null) clearTimeout(probeTimer)
    probeTimer = setTimeout(probeTick, delayMs)
  }

  function probeTick(): void {
    probeTimer = null
    if (!ports.degradedActive()) return // degraded 已清=自然停面
    if (!ports.gateOpen()) return // frozen 停臂（W5①）——不续臂
    fireStuckIfDue() // N3 同刻 tie-break：T_stuck 先于同刻探针
    probePending = true // 待发探针（W5 独立 flag——不合流 needsResend）
    if (ports.inFlight()) {
      probePending = false // S12a 跳过本轮（不顺延不合流——下一间隔自然再试）
      armProbe(ports.nextProbeDelay())
      return
    }
    if (!ports.snapshotPresent()) {
      // [C1] 判定序前置：空快照=无待保护数据——「未受保护」陈述为假，先于 ghost 计数
      // 即刻清（禁假告警升级路径——ghost 安息观测不升 streak，S16c）
      probePending = false
      ports.clearDegraded()
      return
    }
    if (probeGhosts.size > 0) {
      // F1：到点核查 ghost 安息=「重试确认」的观测行为本身——计一次失败观测
      // （不实发新请求——探针 ghost 界=1 保持不破；W8 主路径：永挂下三到点
      // 5+15+30s→streak 3→unavailable+「重启应用可恢复」缀可达；stuck-pending
      // 文案与该观测行为一致）
      probePending = false
      ports.countProbeFailure()
      armProbe(ports.nextProbeDelay())
      return
    }
    ports.dispatchProbe()
    armProbe(ports.nextProbeDelay()) // 封顶循环续臂
  }

  function armIfEligible(): void {
    if (!ports.degradedActive() || !ports.gateOpen() || ports.inFlight()) return
    if (!ports.snapshotPresent()) {
      ports.clearDegraded() // W6①
      return
    }
    armProbe(ports.nextProbeDelay())
  }

  function stopProbe(): void {
    if (probeTimer !== null) {
      clearTimeout(probeTimer)
      probeTimer = null
    }
    probePending = false
  }

  function reset(): void {
    clearWatchTimers()
    current = null
    stopProbe()
    probeGhosts.clear() // gen++/重装配面：探针 ghost 界随代际清（迟 settle 对账走 flight 闭包不受影响）
  }

  return {
    watch,
    abandonCurrent,
    hasProbeGhost: () => probeGhosts.size > 0,
    armIfEligible,
    stopProbe,
    reset,
    markProbePending() {
      // 测试专用（生产路径经 probeTick 内部赋值）——保留供测
      probePending = true
    },
    clearProbePending() {
      // 测试专用（生产路径经 probeTick 内部赋值）——保留供测
      probePending = false
    },
    consumeProbePending() {
      const v = probePending
      probePending = false
      return v
    }
  }
}
