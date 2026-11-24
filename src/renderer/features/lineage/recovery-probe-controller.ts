/**
 * [B4 L2 / 设计稿 §11.2、F-RECOV-01/W4-W8/N1/N7] recovery-probe-controller —— 降级/探针
 * 编排（recoveryScheduler 的 health·streak·退避·看门狗段外移；watchdog/backoff 既有件复用）。
 *
 * ── 行为层 ──
 * - 状态驻本件（N7 单源）：health{ok,slow,stuck}、failStreak、probeFailStreak、
 *   backoffTimer、watchdog 实例。呈现分档与优先级沿承：unavailable（锁存，成功才清）
 *   > stuck-pending > slow；pendingChip 在场时 slow/stuck-pending 让位（unavailable 并列）。
 * - settle 呈现（live settle 分支的调度器委托）：saved→clearDegradedAll（①②全清：
 *   双 streak 清零+停探针+清 chip）；slow 归 ok（仅在途期——unavailable/stuck 不降级）；
 *   stale→采纳 epoch+重臂 trailing（自愈单环）；pending→pendingChip（不入任一 streak）；
 *   overflow/reject→探针失败计数或退避（1s/2s/4s；第 4 败→unavailable+臂探针）。
 * - 看门狗端口（watchdog 件承载计时与 ghost 跟踪）：onSlow=slow 呈现（高档在不降级
 *   ——现值读 currentKind 口）；onStuck=逻辑弃置（清在途+呈现+重臂）+hung 探针失败
 *   观测；onLateSettle=token 双账本（物理账本无条件记账——gen 判废/记账+清+补发在
 *   调度器端口承载；R3：仅 reject|overflow 计探针失败例外族，stale/pending 不计）。
 * - gen++ 两形态：reset（全量复位——clean 族：双 streak/health 清）；resetForGenBump
 *   （ws-entry：chip/health 呈现保留——watchdog.reset 停臂+ghost 留驻按 gen 判废）。
 * - 探针臂条件=degraded∧open∧无在途；snapshot 空→即刻清（W6① 禁假告警）；间隔
 *   5/15/30/60s 封顶循环（probeFailStreak 索引）；≥3 加缀「重启应用可恢复」。
 *
 * ── 接口层 ── export function createProbeController(ports): ProbeController
 *
 * ── 架构层 ── 纯编排件：emit/在途/epoch 采纳/补发经 ports 注入（scheduler 组合）；
 * 不 import scheduler。
 */
import { backoffDelayMs, backoffExhausted, probeDelayMs, probeRestartHint } from './recoveryBackoff'
import { createRecoveryWatchdog } from './recoveryWatchdog'
import type { RecoveryUiState } from './recoveryEntry'

export interface ProbePorts {
  emit(patch?: Partial<RecoveryUiState>): void
  gateOpen(): boolean
  degradedActive(): boolean
  inFlight(): boolean
  snapshotPresent(): boolean
  /** 呈现现值窄读（高档判定——unavailable/stuck-pending 在不降级） */
  currentKind(): RecoveryUiState['kind']
  /** 在途逻辑弃置（T_stuck——清 inFlight） */
  clearInFlight(): void
  armTrailing(): void
  /** 探针/退避重试实发（调度器 pump——immediateResend 语义） */
  dispatchRetry(): void
  /** ghost 迟到成功：物理账本记账（gen 不符也记） */
  onLateSavedToken(token: string): void
  /** ghost 迟到成功：gen 判废+ownToken 记账+清+补发检查（③记账+清+补发——调度器单源） */
  onLateSavedOwn(gen: number, token: string): void
  /** stale 采纳（epoch 写回） */
  adoptEpoch(epoch: number): void
  /** gen 判废（ghost 失败分支 R2 守卫——stale gen 零簿记） */
  isCurrentGen(gen: number): boolean
}

type Health = 'ok' | 'slow' | 'stuck'
type Timer = ReturnType<typeof setTimeout>

export interface ProbeController {
  failStreak(): number
  /** dispatch 启动时消费待发探针标（S12b——pump 单源消费） */
  consumeProbePending(): boolean
  /** 新 dispatch 起飞即臂看门狗（slow/stuck 双阈值+ghost 跟踪） */
  watch(p: Promise<unknown>, gen: number, isProbe: boolean): void
  /** gen++ 面：主动弃置当前未弃置 flight（返 {abandoned,isProbe}——watchdog 承载） */
  abandonCurrentInFlight(): { abandoned: boolean; isProbe: boolean }
  armIfEligible(): void
  stopProbe(): void
  reset(): void
  resetForGenBump(): void
  clearDegradedAll(): void
  settleSaved(): void
  settlePendingChip(): void
  settleStale(epoch: number): void
  settleFailure(isProbe: boolean): void
  countProbeFailure(): void
  /** R1 gen++ 弃置在途时的探针计数（hung 探针=失败观测） */
  abandonProbeAccounting(isProbe: boolean): void
}

export function createProbeController(ports: ProbePorts): ProbeController {
  let health: Health = 'ok'
  let failStreak = 0
  let probeFailStreak = 0
  let backoffTimer: Timer | null = null

  const clearBackoff = (): void => {
    if (backoffTimer !== null) {
      clearTimeout(backoffTimer)
      backoffTimer = null
    }
  }
  /** degraded/health/双 streak 全清（成功①②③／gen++ 全量复位／W6① 共用复位面） */
  const clearDegradedAll = (): void => {
    health = 'ok'
    failStreak = 0
    probeFailStreak = 0
    watchdog.stopProbe()
    ports.emit({ degraded: false, kind: null, restartHint: false })
  }
  /** slow 仅在途期（W1 轴3）：settle 即归 ok——slow chip 随清（unavailable 锁存/stuck 持久不在此列） */
  const settleResetsSlow = (): void => {
    if (health !== 'slow') return
    health = 'ok'
    if (ports.currentKind() === 'slow') ports.emit({ degraded: false, kind: null, restartHint: false })
  }
  /** F1/onStuck 共用：探针失败观测（W8：≥3→unavailable+重启缀；否则维持重试确认档） */
  const countProbeFailure = (): void => {
    probeFailStreak += 1
    const hint = probeRestartHint(probeFailStreak)
    ports.emit(hint ? { degraded: true, kind: 'unavailable', restartHint: true } : { degraded: true, kind: 'stuck-pending', restartHint: false })
  }
  const scheduleBackoff = (): void => {
    failStreak += 1
    if (backoffExhausted(failStreak)) {
      // 退避终点（N1：第 4 败）→unavailable 锁存+探针臂起（S4 自愈环）
      ports.emit({ degraded: true, kind: 'unavailable', restartHint: probeRestartHint(probeFailStreak) })
      watchdog.armIfEligible()
      return
    }
    backoffTimer = setTimeout(() => {
      backoffTimer = null
      void ports.dispatchRetry()
    }, backoffDelayMs(failStreak))
  }

  const watchdog = createRecoveryWatchdog({
    onSlow() {
      if (!ports.inFlight()) return
      health = 'slow'
      // 呈现优先级（§4.4）：unavailable 锁存>stuck-pending>slow——高档在不降级
      if (ports.currentKind() === 'unavailable' || ports.currentKind() === 'stuck-pending') return
      ports.emit({ degraded: true, kind: 'slow', restartHint: false })
    },
    onStuck(gen, isProbe) {
      void gen // gen 判废=watchdog 件内已做（定时器路径防御）
      ports.clearInFlight() // 逻辑弃置（红线①永不取消）：ghost 物理留驻，迟到 settle 对账
      health = 'stuck'
      if (isProbe) {
        // [F4] 同一探针「hung 弃置计数+迟到 reject/overflow 计数」=两次独立失败
        // 观测（保守升级方向——迟到失败在弃置后仍是新观测，不因已计而豁免）
        countProbeFailure() // W8：hung 探针=失败观测（「重试确认」未达成）
      } else {
        ports.emit({ degraded: true, kind: 'stuck-pending', restartHint: false })
      }
      watchdog.armIfEligible()
    },
    onLateSettle(gen, settle) {
      if (settle.ok) {
        ports.onLateSavedToken(settle.token) // 物理账本无条件记账（含 gen 不符——token 双账本）
        ports.onLateSavedOwn(gen, settle.token)
        return
      }
      if (!ports.isCurrentGen(gen)) return // R2：失败分支同 gen 判废（探针 ghost reject 不复活已切代表面 streak）
      if (settle.isProbe && (settle.kind === 'reject' || settle.kind === 'overflow')) {
        // R3 收窄：仅 reject|overflow 属失败例外族（stale/pending 不计；F8 负锚）
        probeFailStreak += 1 // [F4] 双计语义见 onStuck 注——迟到失败=独立观测
        ports.emit({ restartHint: probeRestartHint(probeFailStreak) })
      }
      // 其余 ghost 失败：零簿记（弃置时 degraded 已承载失败语义——重复计费即风暴）
    },
    degradedActive: ports.degradedActive,
    gateOpen: ports.gateOpen,
    inFlight: ports.inFlight,
    snapshotPresent: ports.snapshotPresent,
    countProbeFailure, // F1：到点核查 ghost 安息计数（streak/呈现驻本件——N7 单源）
    dispatchProbe: ports.dispatchRetry,
    clearDegraded: clearDegradedAll, // W6①
    nextProbeDelay: () => probeDelayMs(probeFailStreak)
  })

  return {
    failStreak: () => failStreak,
    consumeProbePending: () => watchdog.consumeProbePending(),
    watch: (p, gen, isProbe) => watchdog.watch(p as Promise<never>, gen, isProbe),
    abandonCurrentInFlight: () => watchdog.abandonCurrent(),
    armIfEligible: () => watchdog.armIfEligible(),
    stopProbe: () => watchdog.stopProbe(),
    reset() {
      clearBackoff()
      watchdog.reset()
      health = 'ok'
      failStreak = 0
      probeFailStreak = 0 // 残留会假触发重启缀（W4 注；R1 探针弃置计数随全量复位归零）
    },
    resetForGenBump() {
      // ws-entry 形态（W5①/W4 frozen 行）：呈现保留——仅停臂+清退避（ghost 按/gen 判废留驻）
      clearBackoff()
      watchdog.reset()
    },
    clearDegradedAll,
    settleSaved: clearDegradedAll,
    settlePendingChip() {
      settleResetsSlow()
      ports.emit({ pendingChip: true }) // 不入任一 streak（既有语义保持）
    },
    settleStale(epoch) {
      settleResetsSlow()
      ports.adoptEpoch(epoch)
      ports.armTrailing() // 采纳新 epoch 后按节流重发（自愈单环）
    },
    settleFailure(isProbe) {
      if (isProbe) {
        // 探针失败（W4 行3）：probeFailStreak++、kind=unavailable、health/failStreak 维持
        probeFailStreak += 1
        ports.emit({ degraded: true, kind: 'unavailable', restartHint: probeRestartHint(probeFailStreak) })
        watchdog.armIfEligible()
        return
      }
      settleResetsSlow()
      scheduleBackoff() // 溢出同 reject 退避路径（§4.5）
    },
    countProbeFailure,
    abandonProbeAccounting(isProbe) {
      if (isProbe) probeFailStreak += 1 // hung 探针弃置=失败观测（W8 同判）
    }
  }
}
