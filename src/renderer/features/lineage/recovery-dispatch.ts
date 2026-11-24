/**
 * [B4 L2 / 设计稿 §11.2（recoveryScheduler 行数预算拆件）、F-RECOV-01、回炉 R1-R4] recovery-dispatch
 * —— 单槽写面派发（recoveryScheduler 的单槽 pump/trailing/单飞/合流段外移；token/gen/epoch/
 * owner/降级编排仍驻调度器与各拆件，经 core 注入）。
 *
 * ── 行为层 ──
 * - 单槽状态驻本件（全族唯一一份）：trailingTimer、inFlight、needsResend、immediateResend。
 * - 写频=300ms trailing 节流+单飞行+最新快照合流；出队 saveNow 不节流即时发。
 * - pump：在途或未装配即返（单飞互斥）→消费待发探针标→取最新快照实发→live settle 裁决
 *   （applyLiveSettle：token 簿记不受 gen 判废；呈现/owner 归 probe/owner）→飞行窗内新触发
 *   （即时类立即补发、节流类重臂 300ms）；ghost 续体（已被 T_stuck/gen++ 弃置）尾段不消费标记。
 * - [F-RECOV-01] 常态写无硬超时（红线①慢盘不误判丢稿——永不取消 op、永不因超时判失败）。
 * - ownerWriteSnapshot：owner 装配后的转移写（同槽合法覆写——不走 pump）。
 * - 补发判定面：snapshotPresentSafe（[C4] 三消费点共用）、resendAfterRecovery（ghost 成功③清后补发
 *   检查）、restorePendingResend（开门补存）；abandonInFlightAtGenBump（[R1] gen++ 弃置在途）。
 *
 * ── 接口层 ── export function createRecoveryDispatch(core: DispatchCore): RecoveryDispatch
 *
 * ── 架构层 ── 纯编排件：宿主快照/owner/token/gen/epoch/probe 经 core 注入（scheduler 组合）；
 * 不 import scheduler（运行时方向 scheduler→dispatch 单向）。
 */
import { api, unwrap } from '../../api/client'
import { RECOVERY_TYPE } from './recoveryEntry'
import type { RecoveryOwner, RecoveryOwnerRef } from './recovery-owner'
import type { ProbeController } from './recovery-probe-controller'
import type { RecoverySchedulerInit } from './recovery-scheduler-triggers'
import type { LineageRecoveryPayload } from '@shared/recovery/schemas'

const TRAILING_MS = 300

type Timer = ReturnType<typeof setTimeout>
interface DispatchOutcome {
  kind: 'saved' | 'stale' | 'pending' | 'overflow' | 'reject' | 'skipped'
  token?: string
  epoch?: number
  target: RecoveryOwnerRef | null
}

/** 调度器内核（token/gen/epoch/owner/probe 单源驻调度器——模块求值期注入） */
export interface DispatchCore {
  /** 装配态（未装配=一切入口 no-op——存量单测兼容） */
  inited(): boolean
  /** 宿主（未装配=null） */
  host(): RecoverySchedulerInit | null
  /** owner 状态机（未装配=null——legacy 单会话） */
  ownerCtl(): RecoveryOwner | null
  /** 当前 epoch（save 请求携带——stale 采纳后每轮重读） */
  epoch(): number
  /** 本渲染进程会话 id */
  sessionId(): string
  /** epoch 采纳（stale 回执——本会话续用） */
  adoptEpoch(epoch: number): void
  /** 当前代际（ghost 判废轴——dispatch 起飞时捕获） */
  generation(): number
  /** ownToken 写（gen 符的本会话槽凭据） */
  setOwnToken(token: string | null): void
  /** lastWrittenToken 写（物理账本无条件记账） */
  setLastWrittenToken(token: string): void
  /** 降级/探针编排件（scheduler 组合） */
  probe(): ProbeController
}

export interface RecoveryDispatch {
  armTrailing(): void
  clearTrailing(): void
  /** [C4] 宿主快照源安全取值（三消费点共用——本件两项+调度器探针接线一项） */
  snapshotPresentSafe(): boolean
  /** 开门补存（entry 端口 requestPendingResend 的实现） */
  restorePendingResend(): void
  /** 在途有无（看门狗/探针臂条件判定面） */
  inFlight(): boolean
  /** 当前在途 flight（gen++ 弃置前的有界 drain 沿用该 promise；无=null） */
  currentFlight(): Promise<DispatchOutcome> | null
  /** 清在途占位（单飞不再永占——S13a/S13b） */
  clearInFlight(): void
  /** 清补发标记（gen++/重装配：本 tick 内挂起的补发意向全作废） */
  clearResendFlags(): void
  /** [R1] gen++ 面：同步逻辑弃置在途未弃置 flight */
  abandonInFlightAtGenBump(): void
  dispatchImmediateSave(): void
  resendAfterRecovery(): void
  pump(): Promise<void>
  /** owner 装配后的转移写（不走 pump——单飞/节流面之外） */
  ownerWriteSnapshot(folderId: string): Promise<'saved' | 'failed'>
}

export function createRecoveryDispatch(core: DispatchCore): RecoveryDispatch {
  // ── 写面（节流/单飞/合流——单槽 pump）──────────────────────────
  let trailingTimer: Timer | null = null
  let inFlight: Promise<DispatchOutcome> | null = null
  let needsResend = false
  let immediateResend = false

  function clearTrailing(): void {
    if (trailingTimer !== null) {
      clearTimeout(trailingTimer)
      trailingTimer = null
    }
  }

  /** [C4] 宿主快照源安全取值：异常=无待保护数据面（禁假告警/零补发——三消费点共用） */
  function snapshotPresentSafe(): boolean {
    const fns = core.host()
    if (fns === null) return false
    try {
      return fns.snapshot() !== null
    } catch {
      return false
    }
  }

  /** ghost 成功③清后补发检查：滞留快照经 pump 补发；snapshot null=自然空转仅清不补（S8） */
  function resendAfterRecovery(): void {
    if (inFlight !== null || !snapshotPresentSafe()) return // [C4] 异常=no-op
    dispatchImmediateSave()
  }

  /** 开门补存（W9：peek 收束沿脏快照 armed——视同编辑事件 trailing） */
  function restorePendingResend(): void {
    if (snapshotPresentSafe()) armTrailing() // [C4] 异常=no-op
  }

  function armTrailing(): void {
    if (!core.inited()) return
    if (inFlight !== null || trailingTimer !== null) {
      needsResend = true
      return
    }
    trailingTimer = setTimeout(() => {
      trailingTimer = null
      void pump()
    }, TRAILING_MS)
  }

  /** owner 装配后的转移写：以本会话身份写某会话快照（同槽合法覆写——§8.4 行 4
   *  「复用本会话合法覆写；无先删后写空窗」；不走 pump〔单飞/节流面〕） */
  async function ownerWriteSnapshot(folderId: string): Promise<'saved' | 'failed'> {
    const fns = core.host()
    if (fns === null || fns.owner === undefined) return 'failed'
    let payload: LineageRecoveryPayload | null = null
    try {
      payload = fns.owner.sessionSnapshot(folderId)
    } catch {
      return 'failed'
    }
    if (payload === null) return 'failed'
    for (let i = 0; i < 3; i += 1) {
      try {
        const res = await unwrap(
          api.recovery.save({ workspaceId: fns.workspaceId(), type: RECOVERY_TYPE, epoch: core.epoch(), session: core.sessionId(), payload })
        )
        if (res.status === 'saved') {
          core.setOwnToken(res.token)
          core.setLastWrittenToken(res.token)
          return 'saved'
        }
        if (res.status === 'stale') {
          core.adoptEpoch(res.epoch) // 采纳后重试
          continue
        }
        return 'failed' // pending（槽被换——不可覆写他槽）|queue-overflow
      } catch {
        return 'failed'
      }
    }
    return 'failed'
  }

  async function dispatchSave(): Promise<DispatchOutcome> {
    const fns = core.host()
    const ownerCtl = core.ownerCtl()
    if (fns === null) return { kind: 'skipped', target: null }
    const target = ownerCtl?.dispatchTarget() ?? null
    try {
      // [F3①] snapshot 取值入 try——宿主快照源异常走 reject 收束（p 恒不 reject，不永占不外溢）
      const payload = ownerCtl !== null && target !== null ? fns.owner!.sessionSnapshot(target.folderId) : fns.snapshot()
      if (payload === null) {
        if (ownerCtl !== null && target !== null) ownerCtl.onSkipped(target) // 认领会话已 clean→撤认领
        return { kind: 'skipped', target }
      }
      // [回炉 W3/F-RECOV-01] 常态写无硬超时（1500ms 界只属确认条动作与退出窗——慢盘不作败；红线①）
      const res = await unwrap(
        api.recovery.save({
          workspaceId: fns.workspaceId(),
          type: RECOVERY_TYPE,
          epoch: core.epoch(),
          session: core.sessionId(),
          payload
        })
      )
      if (res.status === 'saved') return { kind: 'saved', token: res.token, target }
      if (res.status === 'stale') return { kind: 'stale', epoch: res.epoch, target }
      if (res.status === 'queue-overflow') return { kind: 'overflow', target } // [F-RECOV-01 N8] 链深满拒
      return { kind: 'pending', target }
    } catch {
      return { kind: 'reject', target }
    }
  }

  /** 非 ghost settle 裁决（live 分支：token 簿记不受 gen 判废；呈现/owner 归 probe/owner） */
  function applyLiveSettle(outcome: DispatchOutcome, gen: number, isProbe: boolean): void {
    const probe = core.probe()
    const ownerCtl = core.ownerCtl()
    if (outcome.kind === 'saved' && outcome.token !== undefined) core.setLastWrittenToken(outcome.token)
    if (gen !== core.generation()) return
    const target = outcome.target
    switch (outcome.kind) {
      case 'saved':
        core.setOwnToken(outcome.token ?? null)
        if (target !== null && ownerCtl !== null) ownerCtl.onSaved(target)
        probe.settleSaved() // ①②：清 chip+health ok+双 streak 清零（W4 行1）
        return
      case 'stale':
        probe.settleStale(outcome.epoch!) // 采纳新 epoch 后按节流重发（自愈单环）
        return
      case 'pending':
        probe.settlePendingChip() // 不入任一 streak（既有语义保持）
        if (target !== null && ownerCtl !== null) ownerCtl.onPending(target) // 槽被换：认领作废
        return
      case 'overflow':
      case 'reject':
        if (target !== null && ownerCtl !== null) ownerCtl.onFailed(target)
        probe.settleFailure(isProbe) // 溢出同 reject 退避路径（§4.5）
        return
      case 'skipped':
        return
    }
  }

  async function pump(): Promise<void> {
    if (inFlight !== null || !core.inited()) return
    const gen = core.generation()
    const probe = core.probe()
    const isProbe = probe.consumeProbePending() // S12b：任何 dispatch 启动清待发探针标
    // 本次发送即取最新快照——先消费挂起标记（防自触发循环）
    needsResend = false
    immediateResend = false
    const p = dispatchSave()
    inFlight = p
    probe.watch(p, gen, isProbe)
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
    if (!core.inited()) return
    needsResend = true
    immediateResend = true
    if (inFlight !== null) return
    clearTrailing()
    void pump()
  }

  /** [R1] gen++ 同步逻辑弃置在途未弃置 flight（转 ghost——迟到 settle 按 gen 判废仅记账；
   *  处置三项=标记 abandoned（watchdog）+清 inFlight+isProbe 计 probeFailStreak（onStuck 同型语义） */
  function abandonInFlightAtGenBump(): void {
    const probe = core.probe()
    const r = probe.abandonCurrentInFlight()
    if (!r.abandoned) return
    inFlight = null // 单飞不再永占（S13a/S13b）；drain 捕获 null 不永等
    if (r.isProbe) probe.abandonProbeAccounting(true) // hung 探针=失败观测（W8 同判）
  }

  return {
    armTrailing,
    clearTrailing,
    snapshotPresentSafe,
    restorePendingResend,
    inFlight: () => inFlight !== null,
    currentFlight: () => inFlight,
    clearInFlight: () => {
      inFlight = null
    },
    clearResendFlags: () => {
      needsResend = false
      immediateResend = false
    },
    abandonInFlightAtGenBump,
    dispatchImmediateSave,
    resendAfterRecovery,
    pump,
    ownerWriteSnapshot
  }
}
