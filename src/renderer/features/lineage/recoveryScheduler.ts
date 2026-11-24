/**
 * [F-VISFB-65 U5 → F-RECOV-01 → B4 L2 拆件] recoveryScheduler —— 单槽副本调度器薄核心：
 * 只留 token/gen 与组合装配（[B4 L2 §11.2] owner 逻辑外移=recovery-owner；降级/探针/退避/
 * 看门狗=recovery-probe-controller；clean·drain·release·workspace reset=recovery-clean-
 * lifecycle；确认条决策族=recoveryEntry+recovery-restore-flow；宿主装配=recovery-host-ports；
 * [回炉 W-D2b 拆件] 单槽写面 pump=recovery-dispatch；触发面/订阅/状态读面/clean·ws-entry 门面与
 * 装配入参契约=recovery-scheduler-triggers）。
 * [F-VISFB-65 U5 → F-RECOV-01] recoveryScheduler —— 脉络暂存会话恢复副本调度器
 * （写面+门面；ws-entry 屏障/确认条族委托 recoveryEntry——W6 拆件；store-free
 * 模块单例：workspaceId/快照/载入/水化/路由全部注入，与 lineage.store 双向零环）。
 *
 * ── 行为面（状态机=轴1 scheduler{idle,armed,writing,coalescing,clean-released,
 *    degraded}×轴2 gate{open,frozen}×轴3 health{ok,slow,stuck}——跨格不变量见各拆件头注）──
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
 * - [B4 L2 §8] owner 接线：dispatch 目标=owner 状态机（认领/owner 键快照——多 folder
 *   单槽归属）；owner 装配（init.owner）后 markRecoveryClean 按会话归属裁决（非 owner
 *   会话的 clean 不动槽）；切换离场（notifyRecoveryDepart）置 ownershipTransferPending；
 *   takeOver 成功（entry onTakeOver）→owner adopt。
 * - ws-entry 屏障/退出窗/确认条族=recoveryEntry 门面；恢复流程体=recovery-restore-flow。
 * - 未装配（inited=假）：一切入口 no-op、blocked() 恒假（存量单测兼容）。
 */
import { api, unwrap } from '../../api/client'
import { withTimeout } from './recoveryBackoff'
import { createRecoveryEntry, RECOVERY_TYPE, type RecoveryUiState, type SchedulerPorts } from './recoveryEntry'
import { createRecoveryOwner, type RecoveryOwner } from './recovery-owner'
import { createProbeController, type ProbeController } from './recovery-probe-controller'
import { createCleanLifecycle, type CleanLifecycle } from './recovery-clean-lifecycle'
import { createRecoveryDispatch, type RecoveryDispatch } from './recovery-dispatch'
import { createSchedulerTriggers, type RecoverySchedulerInit } from './recovery-scheduler-triggers'

export type {
  RecoveryPhase,
  RecoverySlotKind,
  RecoveryUiState,
  RestoreDecision,
  PreflightOutcome,
  SettleUnsettledResult
} from './recoveryEntry'
export type { PreflightConflict, PreflightView } from './recovery-restore-preflight'
/** [回炉 W-D2b 拆件] 调度器装配入参契约随对外门面迁驻 recovery-scheduler-triggers——此处原名再导出，import 路径不变 */
export type { RecoverySchedulerInit } from './recovery-scheduler-triggers'

// ── 模块单例态 ──────────────────────────────────────────────
let inited = false
let initFns: RecoverySchedulerInit | null = null
const sessionId = crypto.randomUUID()

let gateOpen = true
let epoch = 0
let ownToken: string | null = null
let lastWrittenToken: string | null = null
let generation = 0
let quitChain: Promise<void> = Promise.resolve()

let uiState: RecoveryUiState = {
  phase: 'idle',
  slotKind: null,
  file: null,
  deadFolder: false,
  busy: false,
  pendingChip: false,
  degraded: false,
  kind: null,
  restartHint: false,
  unprotectedChip: false
}
const listeners = new Set<() => void>()

let ownerCtl: RecoveryOwner | null = null

function emit(patch?: Partial<RecoveryUiState>): void {
  if (patch !== undefined) uiState = { ...uiState, ...patch }
  for (const cb of listeners) cb()
}

// ── 单槽写面（recovery-dispatch——单飞/trailing/合流；状态驻该件）──────────
const dispatch: RecoveryDispatch = createRecoveryDispatch({
  inited: () => inited,
  host: () => initFns,
  ownerCtl: () => ownerCtl,
  epoch: () => epoch,
  sessionId: () => sessionId,
  adoptEpoch: (e) => {
    epoch = e
  },
  generation: () => generation,
  setOwnToken: (token) => {
    ownToken = token
  },
  setLastWrittenToken: (token) => {
    lastWrittenToken = token
  },
  probe: () => probe
})

// ── 降级/探针/退避/看门狗（recovery-probe-controller）──────────────────────
const probe: ProbeController = createProbeController({
  emit,
  gateOpen: () => gateOpen,
  degradedActive: () => uiState.degraded,
  inFlight: dispatch.inFlight,
  snapshotPresent: dispatch.snapshotPresentSafe, // [C4] 异常归 false
  currentKind: () => uiState.kind ?? null,
  clearInFlight: dispatch.clearInFlight, // 单飞不再永占（S13a/S13b）
  armTrailing: dispatch.armTrailing,
  dispatchRetry: () => void dispatch.pump(),
  onLateSavedToken: (token) => {
    lastWrittenToken = token // 物理账本无条件记账（含 gen 不符——token 双账本）
  },
  onLateSavedOwn: (gen, token) => {
    if (gen !== generation) return // ⑤ gen 不符仅记账
    ownToken = token
    if (dispatch.inFlight()) return // ④ 有新在途仅记账（S2b——新在途 settle 后裁决）
    probe.clearDegradedAll() // ③ 记账+清+补发检查
    dispatch.resendAfterRecovery()
  },
  adoptEpoch: (e) => {
    epoch = e
  },
  isCurrentGen: (gen) => gen === generation
})

// ── clean·drain·release·workspace reset（recovery-clean-lifecycle）──────────
const lifecycle: CleanLifecycle = createCleanLifecycle({
  inited: () => inited,
  host: () => initFns,
  owner: () => ownerCtl,
  uiState: () => uiState,
  activeFolder: () => initFns?.owner?.activeFolder() ?? '',
  currentFlight: dispatch.currentFlight,
  bumpGenFullReset,
  tokensForRelease: () => lastWrittenToken ?? ownToken,
  clearTokens: () => {
    ownToken = null
    lastWrittenToken = null
  },
  setQuitChain: (p) => {
    quitChain = p
  },
  quitChain: () => quitChain,
  dispatchImmediateSave: dispatch.dispatchImmediateSave
})

// ── gen++ 族（clean 收口同步先行——INV-161）────────────────────────

function bumpGenFullReset(): number {
  generation += 1 // 同步先行：本 tick 内 pending/trailing 全作废
  dispatch.abandonInFlightAtGenBump()
  dispatch.clearResendFlags()
  dispatch.clearTrailing()
  probe.reset() // 双 streak/health/退避/看门狗全量复位
  emit({ degraded: false, kind: null, restartHint: false })
  return generation
}

/** ws-entry 形态 gen++（W5①/W4 frozen 行：chip/health/双 streak 保留——仅作废在途+清定时器） */
function bumpGenPreserve(): number {
  generation += 1
  dispatch.abandonInFlightAtGenBump()
  dispatch.clearResendFlags()
  dispatch.clearTrailing()
  probe.resetForGenBump() // 停臂+清退避（ghost 跟踪留驻——settle 按 gen 判废仅记账）
  return generation
}

// ── ws-entry 门面（族驻 recoveryEntry——W6 拆件；公共 API 不变）──
// 恢复流程体=recovery-restore-flow

const entryPorts: SchedulerPorts = {
  peek: () => withTimeout(unwrap(api.recovery.peek({ workspaceId: initFns?.workspaceId() ?? '' })), 1500),
  read: (token) => withTimeout(unwrap(api.recovery.read({ workspaceId: initFns?.workspaceId() ?? '', type: RECOVERY_TYPE, token })), 1500),
  save: async (payload, takeOverToken) => {
    const res = await unwrap(
      api.recovery.save({
        workspaceId: initFns?.workspaceId() ?? '',
        type: RECOVERY_TYPE,
        epoch,
        session: sessionId,
        payload,
        ...(takeOverToken !== undefined ? { takeOverToken } : {})
      })
    )
    if (res.status === 'saved') {
      // [k1-N2 随批登记] 此处簿记无 gen 守卫=基线同形（takeOver=确认条动作窗内 gen
      // 稳定——bumpGen 已弃置在途；迟到写留驻=INV-167 无害族方向正确：多留副本≠丢稿）
      ownToken = res.token
      lastWrittenToken = res.token
    }
    return res
  },
  resetTokens: () => {
    ownToken = null
    lastWrittenToken = null
  }, // [R7] peek 成功后清 token 双账本（会话凭据重置）
  release: (token, reason) => withTimeout(unwrap(api.recovery.release({ workspaceId: initFns?.workspaceId() ?? '', type: RECOVERY_TYPE, token, reason })), 1500),
  bumpGen: bumpGenPreserve,
  getGen: () => generation,
  adoptEpoch: (e) => {
    epoch = e
  },
  emit,
  setGateOpen: (open) => {
    gateOpen = open
  },
  getState: () => uiState,
  requestPendingResend: dispatch.restorePendingResend,
  onGateReopened: () => probe.armIfEligible(), // W6②：决策开门条件重臂／W6① 即刻清
  onForeignSlotReleased: () => {
    ownerCtl?.onForeignSlotReleased()
  }, // [B4 L2 §8.4 行 9]
  /** [B4 L2 §8.4 行 7] takeOver 成功→owner adopt（F 的当前代际） */
  onTakeOver: (payload) => {
    const gen = initFns?.owner?.generationOf(payload.folderId)
    if (gen !== null && gen !== undefined) ownerCtl?.adopt(payload.folderId, gen)
  }
}

const entry = createRecoveryEntry(entryPorts)

// ── 触发面/订阅/状态门面与 clean·ws-entry 门面（recovery-scheduler-triggers）──────
export const {
  notifyRecoveryEditUnit,
  notifyRecoveryDraftChange,
  notifyRecoverySaveNow,
  notifyRecoveryDepart,
  notifyForeignSlotReleased,
  notifyRecoveryFolderRemoved,
  getRecoveryOwner,
  patchRecoveryUi,
  recoveryBlocked,
  getRecoveryState,
  subscribeRecoveryState,
  markRecoveryClean,
  awaitRecoveryQuitSettled,
  strongQuitRecoveryBestEffort,
  prepareRecoveryWorkspaceSwitch,
  enterWorkspaceRecovery,
  restoreRecoverySlot,
  discardRecoverySlot,
  deferRecoverySlot,
  reopenRecoveryBar
} = createSchedulerTriggers({
  inited: () => inited,
  gateOpen: () => gateOpen,
  ownerCtl: () => ownerCtl,
  uiState: () => uiState,
  listeners,
  emit,
  lifecycle,
  entry,
  armTrailing: dispatch.armTrailing,
  dispatchImmediateSave: dispatch.dispatchImmediateSave
})

// ── 门/状态/生命周期 ───────────────────────────────────────

export function initRecoveryScheduler(init: RecoverySchedulerInit): void {
  initFns = init
  inited = true
  ownerCtl =
    init.owner !== undefined
      ? createRecoveryOwner({
          ...init.owner,
          slotClaimable: () => gateOpen && uiState.phase === 'open' && !uiState.pendingChip,
          writeSnapshot: dispatch.ownerWriteSnapshot,
          releaseOwn: (reason) => lifecycle.markCleanAwaitable(reason, true)
        })
      : null
  // [回炉 W9/d1-W04] 装配即冻结：清单加载窗（workspaceId 空）编辑不可达——
  // 开门权唯一归 enterWorkspaceRecovery 决策（peek 空/fail-open/确认条决策）
  gateOpen = false
  entry.attach(() => initFns)
}

/** 复位（测试/重装配；幂等） */
export function resetRecoveryScheduler(): void {
  dispatch.clearTrailing()
  probe.reset()
  entry.reset()
  inited = false
  initFns = null
  ownerCtl = null
  gateOpen = true
  epoch = 0
  ownToken = null
  lastWrittenToken = null
  dispatch.clearInFlight()
  dispatch.clearResendFlags()
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
    restartHint: false,
    unprotectedChip: false
  }
}
