/**
 * [F-VISFB-65 U5 → F-RECOV-01] recoveryScheduler —— 脉络暂存会话恢复副本调度器
 * （写面+门面；ws-entry 屏障/确认条族委托 recoveryEntry——W6 拆件；store-free
 * 模块单例：workspaceId/快照/载入/水化/路由全部注入，与 lineage.store 双向零环）。
 *
 * ── 行为面（状态机=轴1 scheduler{idle,armed,writing,coalescing,clean-released,
 *    degraded}×轴2 gate{open,frozen}×轴3 health{ok,slow,stuck}——跨格不变量逐条）──
 * - 触发面：编辑单元（enqueue 后）/草稿内容变更/出队 saveNow/恢复 takeOver。
 *   写频=300ms trailing 节流+单飞行+最新快照合流；出队 saveNow 不节流即时发。
 * - [F-RECOV-01] 常态写无硬超时（红线①慢盘不误判丢稿——永不取消 op、永不因
 *   超时判失败）：双阈值看门狗（recoveryWatchdog）T_slow=10s 仅呈现（chip
 *   kind=slow）／T_stuck=60s 逻辑弃置（在途占位解除+kind=stuck-pending；op
 *   物理留驻=ghost，迟到 settle 对账=token 双账本——lastWrittenToken 一切成功
 *   记账（含 gen 不符）、ownToken 仅 gen 符；清除面仅 gen 符∧无新在途（五行
 *   表③④⑤）；ghost reject 零簿记——探针 ghost 例外计 probeFailStreak，W2/W8）。
 * - degraded 期探针自愈（C 面）：probePending 独立 flag（W5）经 pump 单飞实发；
 *   臂条件=degraded∧open∧无在途；在途跳过（S12a）／编辑 dispatch 清待发
 *   （S12b）／snapshot null 即刻清（W6① 禁假告警）／frozen 停臂+决策开门条件
 *   重臂（W6②）；间隔 5/15/30/60s 封顶循环（probeFailStreak 索引），≥3 加缀
 *   「重启应用可恢复」（W8）。
 * - kind 三档呈现（W9 红线①对齐——三档均不因超时判败）：unavailable（锁存，
 *   成功才清）>stuck-pending>slow；queue-overflow 溢出拒=失败观测（编辑走
 *   退避/探针计 probeFailStreak——§4.5 溢出同 reject 路径）。
 * - 代际（INV-161）：clean 四源 bumpGen 全量复位（chip/health/双 streak 清零
 *   ——W4 gen++ 行：残留会假触发重启缀）；ws-entry bumpGen 保留面（frozen 保留
 *   chip——W5①）；两形 gen++ 均同步逻辑弃置在途未弃置 flight（R1——转 ghost
 *   迟到 settle 按 gen 判废仅记账）；clean 收口 drain 有界 1500ms（QUIT_TIMEOUT_MS
 *   同族封顶——及时 settle 经物理账本供 release token，永挂不永等）；再 release
 *   （ownToken/lastWrittenToken 清空）。
 * - save 失败退避 3 次（1s/2s/4s）→degraded（INV-166 chip 常驻不 toast 轰炸）；
 *   成功清除；stale 采纳按节流重发（自愈单环）；pending 拒写→chip「待处理」。
 * - ws-entry 屏障（B-04/W-11）：进入即 frozen→peek→empty=开门／有槽=确认条
 *   冻结直到决策；peek 失败=fail-open 开门+degraded（详见 recoveryEntry 头注）。
 * - 退出窗（§4）：强退=最后 saveNow 尽力不 release；clean 收口链
 *   awaitRecoveryQuitSettled（release 自带 1500ms 界 fail-open）。
 * - 未装配（inited=假）：一切入口 no-op、blocked() 恒假（存量单测兼容）。
 */
import { api, unwrap } from '../../api/client'
import {
  createRecoveryEntry,
  RECOVERY_TYPE,
  type RecoveryUiState,
  type SchedulerPorts
} from './recoveryEntry'
import { backoffDelayMs, backoffExhausted, probeDelayMs, probeRestartHint } from './recoveryBackoff'
import { createRecoveryWatchdog, type WatchdogOutcome } from './recoveryWatchdog'
import type { LineageRecoveryPayload } from '@shared/recovery/schemas'

export type { RecoveryPhase, RecoverySlotKind, RecoveryUiState } from './recoveryEntry'

const TRAILING_MS = 300
const QUIT_TIMEOUT_MS = 1500

export interface RecoverySchedulerInit {
  workspaceId(): string
  /** 当前可保存快照（clean 会话返 null——未编辑会话零恢复面写） */
  snapshot(): LineageRecoveryPayload | null
  /** 恢复载入 store（置 dirty+两栈清——宿主=lineage.store.applyRecoverySession） */
  loadPayload(payload: LineageRecoveryPayload): void
  /** 载入+接管完成后回调（草稿再水化计划驻宿主） */
  onRestored(payload: LineageRecoveryPayload): void
  openLineageView(): void
  /** [回炉 W5] 放弃分支清恢复态 store（宿主=lineage.store.discardSession——
   *  再保存不复活已弃会话；仅恢复流程内调用，defer 后不再清） */
  discardLoadedSession(): void
}

type RecoveryHealth = 'ok' | 'slow' | 'stuck'
type Timer = ReturnType<typeof setTimeout>

// ── 模块单例态 ──────────────────────────────────────────────
let inited = false
let initFns: RecoverySchedulerInit | null = null
const sessionId = crypto.randomUUID()

let gateOpen = true
let epoch = 0
let ownToken: string | null = null
let lastWrittenToken: string | null = null
let generation = 0
let trailingTimer: Timer | null = null
let backoffTimer: Timer | null = null
let inFlight: Promise<WatchdogOutcome> | null = null
let needsResend = false
let immediateResend = false
let failStreak = 0
let quitChain: Promise<void> = Promise.resolve()
// [F-RECOV-01] 轴3 health+探针分账（N7：streak 状态驻本件，纯决策在 backoff 件）
let health: RecoveryHealth = 'ok'
let probeFailStreak = 0

let uiState: RecoveryUiState = {
  phase: 'idle',
  slotKind: null,
  file: null,
  deadFolder: false,
  busy: false,
  pendingChip: false,
  degraded: false,
  kind: null,
  restartHint: false
}
const listeners = new Set<() => void>()

function emit(patch?: Partial<RecoveryUiState>): void {
  if (patch !== undefined) uiState = { ...uiState, ...patch }
  for (const cb of listeners) cb()
}

function clearTimers(): void {
  if (trailingTimer !== null) {
    clearTimeout(trailingTimer)
    trailingTimer = null
  }
  if (backoffTimer !== null) {
    clearTimeout(backoffTimer)
    backoffTimer = null
  }
}

/** 1500ms 硬超时 fail-open（§4：仅确认条动作与退出窗——常态 save 无界，红线①） */
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('恢复副本操作超时')), ms)
    p.then(
      (v) => {
        clearTimeout(t)
        resolve(v)
      },
      (e) => {
        clearTimeout(t)
        reject(e)
      }
    )
  })
}

// ── 呈现/复位 helper（W4 复位表单源）───────────────────────

/** degraded/health/双 streak 全清（成功①②③／gen++／W6① 共用复位面） */
function clearDegradedAll(): void {
  health = 'ok'
  failStreak = 0
  probeFailStreak = 0
  watchdog.stopProbe()
  emit({ degraded: false, kind: null, restartHint: false })
}

/** slow 仅在途期（W1 轴3）：settle 即归 ok——slow chip 随清（unavailable 锁存/stuck 持久不在此列） */
function settleResetsSlow(): void {
  if (health !== 'slow') return
  health = 'ok'
  if (uiState.kind === 'slow') emit({ degraded: false, kind: null, restartHint: false })
}

/** ghost 成功③清后补发检查：滞留快照经 pump 补发；snapshot null=自然空转仅清不补（S8） */
function resendAfterRecovery(): void {
  if (inFlight !== null || !snapshotPresentSafe()) return // [C4] 异常=no-op
  dispatchImmediateSave()
}

/** [C4] 宿主快照源安全取值：异常=无待保护数据面（禁假告警/零补发——三消费点共用） */
function snapshotPresentSafe(): boolean {
  const fns = initFns
  if (fns === null) return false
  try {
    return fns.snapshot() !== null
  } catch {
    return false
  }
}

/** [F1/onStuck 共用] 探针失败观测记账面（W8：≥3→unavailable+重启缀；否则维持重试确认档） */
function countProbeFailure(): void {
  probeFailStreak += 1
  if (probeRestartHint(probeFailStreak)) {
    emit({ degraded: true, kind: 'unavailable', restartHint: true })
  } else if (uiState.kind !== 'unavailable') {
    emit({ degraded: true, kind: 'stuck-pending', restartHint: false })
  }
}

// ── 看门狗 ports（双阈值/ghost/探针调度——计时与调度判定驻 watchdog 件；回炉轮2
//    探针调度段外移入 watchdog，本面只余裁决/记账/实发回调——streak 驻本件 N7 单源）──

const watchdog = createRecoveryWatchdog({
  onSlow() {
    if (inFlight === null) return
    health = 'slow'
    // 呈现优先级（§4.4）：unavailable 锁存>stuck-pending>slow——高档在不降级
    if (uiState.kind === 'unavailable' || uiState.kind === 'stuck-pending') return
    emit({ degraded: true, kind: 'slow', restartHint: false })
  },
  onStuck(gen, isProbe) {
    if (gen !== generation) return // R2 同型 gen 守卫（定时器路径防御——gen++ 必杀定时器）
    // 逻辑弃置（红线①永不取消）：占位解除（新 dispatch 立即可行）；ghost 物理留驻
    inFlight = null
    health = 'stuck'
    if (isProbe) {
      // W8：hung 探针=失败观测（「重试确认」未达成）；×3→unavailable+重启缀。
      // [F4] 同一探针「hung 弃置计数+迟到 reject/overflow 计数」=两次独立失败
      // 观测（保守升级方向——迟到失败在弃置后仍是新观测，不因已计而豁免）
      countProbeFailure()
    } else if (uiState.kind !== 'unavailable') {
      emit({ degraded: true, kind: 'stuck-pending', restartHint: false })
    }
    watchdog.armIfEligible()
  },
  onLateSettle(gen, settle) {
    if (settle.ok) {
      lastWrittenToken = settle.token // 物理账本无条件记账（含 gen 不符——token 双账本）
      if (gen !== generation) return // ⑤ gen 不符仅记账
      ownToken = settle.token
      if (inFlight !== null) return // ④ 有新在途仅记账（S2b——新在途 settle 后裁决）
      health = 'ok' // ③ 记账+清+补发检查
      failStreak = 0
      probeFailStreak = 0
      watchdog.stopProbe()
      emit({ degraded: false, kind: null, restartHint: false })
      resendAfterRecovery()
      return
    }
    if (gen !== generation) return // R2：失败分支同 gen 判废（探针 ghost reject 不复活已切代表面 streak）
    if (settle.isProbe && (settle.kind === 'reject' || settle.kind === 'overflow')) {
      // R3 收窄：仅 reject|overflow 属失败例外族（W2 reject 例外字面——stale/pending 不计；F8 负锚）
      probeFailStreak += 1 // [F4] 双计语义见 onStuck 注——迟到失败=独立观测
      if (uiState.degraded && uiState.kind === 'unavailable') {
        emit({ restartHint: probeRestartHint(probeFailStreak) })
      }
    }
    // 其余 ghost 失败：零簿记（弃置时 degraded 已承载失败语义——重复计费即风暴）
  },
  degradedActive: () => uiState.degraded,
  gateOpen: () => gateOpen,
  inFlight: () => inFlight !== null,
  snapshotPresent: snapshotPresentSafe, // [C4] 异常归 false
  countProbeFailure, // F1：到点核查 ghost 安息计数（streak/呈现驻本件——N7 单源）
  dispatchProbe() {
    needsResend = true // immediateResend 语义经 pump 实发（pump 消费 probePending=isProbe 记账）
    immediateResend = true
    void pump()
  },
  clearDegraded: clearDegradedAll, // W6①
  nextProbeDelay: () => probeDelayMs(probeFailStreak)
})

// ── 写面（节流/单飞/合流/退避+看门狗接线）──────────────────

async function dispatchSave(): Promise<WatchdogOutcome> {
  const fns = initFns
  if (fns === null) return { kind: 'skipped' }
  try {
    // [F3①] snapshot 取值入 try——宿主快照源异常走 reject 收束（p 恒不 reject，不永占不外溢）
    const payload = fns.snapshot()
    if (payload === null) return { kind: 'skipped' }
    // [回炉 W3/F-RECOV-01] 常态写无硬超时（1500ms 界只属确认条动作与退出窗——慢盘不作败）
    const res = await unwrap(
      api.recovery.save({
        workspaceId: fns.workspaceId(),
        type: RECOVERY_TYPE,
        epoch,
        session: sessionId,
        payload
      })
    )
    if (res.status === 'saved') return { kind: 'saved', token: res.token }
    if (res.status === 'stale') return { kind: 'stale', epoch: res.epoch }
    if (res.status === 'queue-overflow') return { kind: 'overflow' } // [F-RECOV-01 N8] 链深满拒
    return { kind: 'pending' }
  } catch {
    return { kind: 'reject' }
  }
}

/** 非 ghost settle 裁决（五行表①②+既有 stale/pending/退避；gen 判废=仅物理账本记账） */
function applyLiveSettle(outcome: WatchdogOutcome, gen: number, isProbe: boolean): void {
  if (outcome.kind === 'saved') lastWrittenToken = outcome.token // token 簿记不受 gen 判废（clean 收口取最新）
  if (gen !== generation) return
  switch (outcome.kind) {
    case 'saved':
      ownToken = outcome.token
      health = 'ok' // ①②：清 chip+health ok+双 streak 清零（W4 行1）
      failStreak = 0
      probeFailStreak = 0
      watchdog.stopProbe()
      emit({ degraded: false, kind: null, restartHint: false })
      return
    case 'stale':
      settleResetsSlow()
      epoch = outcome.epoch
      armTrailing() // 采纳新 epoch 后按节流重发（自愈单环）
      return
    case 'pending':
      settleResetsSlow()
      emit({ pendingChip: true }) // 不入任一 streak（既有语义保持）
      return
    case 'overflow':
    case 'reject':
      if (isProbe) {
        // 探针失败（W4 行3）：probeFailStreak++、kind=unavailable、health/failStreak 维持
        probeFailStreak += 1
        emit({ degraded: true, kind: 'unavailable', restartHint: probeRestartHint(probeFailStreak) })
        watchdog.armIfEligible()
        return
      }
      settleResetsSlow()
      scheduleBackoff() // 溢出同 reject 退避路径（§4.5）
      return
    case 'skipped':
      return
  }
}

function scheduleBackoff(): void {
  failStreak += 1
  if (backoffExhausted(failStreak)) {
    // 退避终点（N1：第 4 败）→unavailable 锁存+探针臂起（S4 自愈环）
    emit({ degraded: true, kind: 'unavailable', restartHint: probeRestartHint(probeFailStreak) })
    watchdog.armIfEligible()
    return
  }
  backoffTimer = setTimeout(() => {
    backoffTimer = null
    void pump()
  }, backoffDelayMs(failStreak))
}

function armTrailing(): void {
  if (!inited) return
  if (inFlight !== null || trailingTimer !== null) {
    needsResend = true
    return
  }
  trailingTimer = setTimeout(() => {
    trailingTimer = null
    void pump()
  }, TRAILING_MS)
}

async function pump(): Promise<void> {
  if (inFlight !== null || !inited) return
  const gen = generation
  const isProbe = watchdog.consumeProbePending() // S12b：任何 dispatch 启动清待发探针标（探针驱动置位）
  // 本次发送即取最新快照——先消费挂起标记（防自触发循环）
  needsResend = false
  immediateResend = false
  const p = dispatchSave()
  inFlight = p
  watchdog.watch(p, gen, isProbe)
  const outcome = await p
  if (inFlight !== p) {
    // R4：ghost 续体（T_stuck/gen++ 已弃置）——簿记由 watchdog.onLateSettle 承载，
    // 尾段不消费新在途的 needsResend/immediateResend 标记（S2c——新在途 settle 后自裁决）
    return
  }
  inFlight = null
  applyLiveSettle(outcome, gen, isProbe)
  // 飞行窗内新触发：即时类立即补发（单飞合流），节流类重臂 300ms
  if (needsResend) {
    needsResend = false
    if (immediateResend) {
      immediateResend = false
      void pump()
    } else {
      armTrailing()
    }
  }
}

/** 即时发（saveNow/强退/ghost③ 补发共用——不节流即时发） */
function dispatchImmediateSave(): void {
  if (!inited) return
  needsResend = true
  immediateResend = true
  if (inFlight !== null) return
  if (trailingTimer !== null) {
    clearTimeout(trailingTimer)
    trailingTimer = null
  }
  void pump()
}

/** 编辑单元触发（enqueue 后）——300ms trailing */
export function notifyRecoveryEditUnit(): void {
  armTrailing()
}

/** 草稿内容变更触发（B-02——与编辑单元同节流面） */
export function notifyRecoveryDraftChange(): void {
  armTrailing()
}

/** 出队 saveNow（flush 每动作成功出队后——fire-and-forget 不节流即时发） */
export function notifyRecoverySaveNow(): void {
  dispatchImmediateSave()
}

// ── clean 族（generation 同步先行——INV-161+W4 gen++ 行全量复位）────────────────

/** [R1] gen++ 同步逻辑弃置在途未弃置 flight（转 ghost——迟到 settle 按 gen 判废仅记账；
 *  处置三项=标记 abandoned（watchdog）+清 inFlight+isProbe 计 probeFailStreak（onStuck 同型语义） */
function abandonInFlightAtGenBump(): void {
  const r = watchdog.abandonCurrent()
  if (!r.abandoned) return
  inFlight = null // 单飞不再永占（S13a/S13b）；drain 捕获 null 不永等
  if (r.isProbe) probeFailStreak += 1 // hung 探针=失败观测（W8 同判）
}

function bumpGenFullReset(): number {
  generation += 1 // 同步先行：本 tick 内 pending/trailing 全作废
  abandonInFlightAtGenBump() // R1：gen++ 语义=同 tick 清一切定时器+弃置在途（INV-161）
  needsResend = false
  immediateResend = false
  clearTimers()
  health = 'ok'
  failStreak = 0
  probeFailStreak = 0 // 残留会假触发重启缀（W4 注；R1 探针弃置计数随全量复位归零）
  watchdog.reset()
  emit({ degraded: false, kind: null, restartHint: false })
  return generation
}

function markCleanAwaitable(reason: 'clean' | 'discard'): Promise<void> {
  const flight = inFlight // 先捕获（bumpGen R1 弃置将清位——bounded drain 沿用该 promise）
  bumpGenFullReset()
  const ws = initFns?.workspaceId() ?? ''
  const chain = (async () => {
    if (flight !== null) {
      // [R1/S13b] drain 有界封顶 1500ms（QUIT_TIMEOUT_MS 同族）：被弃置 flight 迟到
      // settle 经物理账本供给 release token（token 簿记保留）；永挂 flight 不再永等。
      // [F5] flight 先胜（或先败）时 clearTimeout 界定时器（不留空触发残 timer）
      await new Promise<void>((resolve) => {
        const cap = setTimeout(resolve, QUIT_TIMEOUT_MS)
        void flight.then(
          () => {
            clearTimeout(cap)
            resolve()
          },
          () => {
            clearTimeout(cap)
            resolve() // reject 同收束——drain 不因 reject 永挂
          }
        )
      })
    }
    const token = lastWrittenToken ?? ownToken
    ownToken = null
    lastWrittenToken = null
    if (token === null || ws === '' || !inited) return
    try {
      await withTimeout(
        unwrap(
          api.recovery.release({
            workspaceId: ws,
            type: RECOVERY_TYPE,
            token,
            reason
          })
        ),
        QUIT_TIMEOUT_MS
      )
    } catch {
      // 失败吞接：副本留驻=下次启动屏障兜底（无害恢复族——INV-167）
    }
  })()
  quitChain = chain
  return chain
}

/** clean 四源挂点（flush 全成功/undo 回基线/discardSession/退出 clean）——fire-and-forget */
export function markRecoveryClean(reason: 'clean' | 'discard'): void {
  if (!inited) return
  void markCleanAwaitable(reason)
}

/** 退出窗收口等待（quit-flush ③ 后消费；release 自带 1500ms 界） */
export async function awaitRecoveryQuitSettled(): Promise<void> {
  await quitChain
}

/** 强退尽力：最后 saveNow（不 release——副本承载未落库状态） */
export function strongQuitRecoveryBestEffort(): void {
  dispatchImmediateSave()
}

/** 工作区切换（确认弃置后）：代际先行+弃置 release（reload 竞窗留驻=无害） */
export function prepareRecoveryWorkspaceSwitch(): Promise<void> {
  if (!inited) return Promise.resolve()
  // [d1-N2 主控亲笔] drain 等待 1500ms 封顶：在途 save 永不 settle 时切换不
  // 永久 busy；迟到 release=INV-167 无害族（副本留驻下次屏障承接）
  return Promise.race([
    markCleanAwaitable('discard'),
    new Promise<void>((resolve) => {
      setTimeout(resolve, 1500)
    })
  ])
}

// ── ws-entry 门面（族驻 recoveryEntry——W6 拆件；公共 API 不变）──

/** ws-entry 形态 gen++（W5①/W4 frozen 行：chip/health/双 streak 保留——仅作废在途+清定时器） */
function bumpGenPreserve(): number {
  generation += 1
  abandonInFlightAtGenBump() // R1：同型弃置在途（ghost 跟踪留驻——settle 按 gen 判废仅记账）
  needsResend = false
  immediateResend = false
  clearTimers()
  watchdog.reset() // 探针停臂（ghost 跟踪留驻——settle 按 gen 判废仅记账）
  return generation
}

/** 开门补存（W9：peek 收束沿脏快照 armed——视同编辑事件 trailing） */
function restorePendingResend(): void {
  if (snapshotPresentSafe()) armTrailing() // [C4] 异常=no-op
}

const entryPorts: SchedulerPorts = {
  peek: () =>
    withTimeout(unwrap(api.recovery.peek({ workspaceId: initFns?.workspaceId() ?? '' })), QUIT_TIMEOUT_MS),
  read: (token) =>
    withTimeout(unwrap(api.recovery.read({ workspaceId: initFns?.workspaceId() ?? '', type: RECOVERY_TYPE, token })), QUIT_TIMEOUT_MS),
  save: async (payload, takeOverToken) => {
    const res = await withTimeout(
      unwrap(
        api.recovery.save({
          workspaceId: initFns?.workspaceId() ?? '',
          type: RECOVERY_TYPE,
          epoch,
          session: sessionId,
          payload,
          ...(takeOverToken !== undefined ? { takeOverToken } : {})
        })
      ),
      QUIT_TIMEOUT_MS
    )
    if (res.status === 'saved') {
      // [k1-N2 随批登记] 此处簿记无 gen 守卫=基线同形（takeOver=确认条动作窗内 gen
      // 稳定——bumpGen 已弃置在途；迟到写留驻=INV-167 无害族方向正确：多留副本≠丢稿）
      ownToken = res.token
      lastWrittenToken = res.token
    }
    return res
  },
  resetTokens: () => { ownToken = null; lastWrittenToken = null }, // [R7] 单行形
  release: (token, reason) =>
    withTimeout(
      unwrap(api.recovery.release({ workspaceId: initFns?.workspaceId() ?? '', type: RECOVERY_TYPE, token, reason })),
      QUIT_TIMEOUT_MS
    ),  bumpGen: bumpGenPreserve,
  getGen: () => generation,
  adoptEpoch: (e) => { epoch = e },
  emit,
  setGateOpen: (open) => { gateOpen = open },
  getState: () => uiState,
  requestPendingResend: restorePendingResend,
  onGateReopened: () => watchdog.armIfEligible() // W6②：决策开门条件重臂／W6① 即刻清
}

const entry = createRecoveryEntry(entryPorts)

export async function enterWorkspaceRecovery(): Promise<void> {
  if (!inited) return
  await entry.enterWorkspaceRecovery()
}

export async function restoreRecoverySlot(): Promise<void> {
  if (!inited) return
  await entry.restoreRecoverySlot()
}

export async function discardRecoverySlot(): Promise<void> {
  if (!inited) return
  await entry.discardRecoverySlot()
}

export function deferRecoverySlot(): void {
  if (!inited) return
  entry.deferRecoverySlot()
}

/** chip 重开确认条（再冻结直到决策）。[回炉轮2 Z7] slotKind=null 时=重新 peek（死按钮修复） */
export function reopenRecoveryBar(): void {
  if (!inited) return
  entry.reopenRecoveryBar()
}

// ── 门/状态/生命周期 ────────────────────────────────────────

/** 写面门（beginUnitGated 消费——quitWriteBlocked 同型；未装配恒假） */
export function recoveryBlocked(): boolean {
  return inited && !gateOpen
}

export function getRecoveryState(): RecoveryUiState {
  return uiState
}

export function subscribeRecoveryState(cb: () => void): () => void {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

export function initRecoveryScheduler(init: RecoverySchedulerInit): void {
  initFns = init
  inited = true
  // [回炉 W9/d1-W04] 装配即冻结：清单加载窗（workspaceId 空）编辑不可达——
  // 开门权唯一归 enterWorkspaceRecovery 决策（peek 空/fail-open/确认条决策）
  gateOpen = false
  entry.attach(() => initFns)
}

/** 复位（测试/重装配；幂等） */
export function resetRecoveryScheduler(): void {
  clearTimers()
  watchdog.reset()
  entry.reset()
  inited = false
  initFns = null
  gateOpen = true
  epoch = 0
  ownToken = null
  lastWrittenToken = null
  inFlight = null
  needsResend = false
  immediateResend = false
  failStreak = 0
  health = 'ok'
  probeFailStreak = 0
  quitChain = Promise.resolve()
  uiState = {
    phase: 'idle',
    slotKind: null,
    file: null,
    deadFolder: false,
    busy: false,
    pendingChip: false,
    degraded: false,
    kind: null,
    restartHint: false
  }
}
