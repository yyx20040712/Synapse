/**
 * [F-VISFB-64] quit-close-policy —— 关闭入口无条件握手状态机（纯 TS、零
 * Electron import；态表/清理表/事件源所有权单源=docs/design/2026-10-18_f-visfb64-design.md §⑥⑦，此处只摘迁移语义）。
 *
 * 态 I/WC/WD/C/D × 八类事件（close/dirty-push/receipt/timer-fired/send-failed/
 * renderer-gone/window-destroyed/confirm-resolved）：
 * - close 仅 I 态起握（无条件 preventDefault 由装配层承载）：新 id
 *   `quit-flush-N`（进程内单调序跨取消唯一）+首快照分级（dirty-push 维持的
 *   自持快照单一状态源，reducer 不反向读 main-window）：clean→WC 等 grace
 *   ／dirty→WD 等 timeout；
 * - WC 内 dirty push（dirty 且未到期）升级 WD：clear 旧臂后换臂至 t0+5000，
 *   id 不变；WD 不降级；C/I 态 push 仅更新快照；
 * - receipt 仅「id 当前∧态 WC/WD∧now<deadline」有效：false=唯一 clean 销毁面
 *   （destroy 恰一次，清臂先于除名）／true=入 C；过期回执按超时同构入 C；
 * - send-failed/renderer-gone/timer-fired→清 timer+除名→C（超时只确认不静默
 *   销毁）；旧 generation timer 回调无效；迟到/已除名回执一律丢弃；
 * - confirm-resolved 经 token 适配：confirm→D+destroy 恰一次／reject→I+
 *   unfreeze-renderer（abort 帧载荷=被废请求 id；迟到确认失效）；
 * - 任意非 D 态 window-destroyed→D（C 态额外 closeConfirm）+dispose 幂等（死面）。
 */
import { QUIT_CLEAN_GRACE_MS, QUIT_FLUSH_TIMEOUT_MS } from '../../shared/constants'

export type QuitCloseState = 'I' | 'WC' | 'WD' | 'C' | 'D'

/** 副作用端口（订阅所有权/退订=装配层 main-window——设计 §⑦ 所有权表） */
export interface QuitPolicyEffects {
  sendQuitFlush(requestId: string): void
  armTimer(deadline: number, generation: number): void
  clearTimer(deadline: number, generation: number): void
  /** 除名观测钩（policy 内部已除名——待答关联自持，无外部待答表） */
  retireRequest(requestId: string): void
  showConfirm(token: number): void
  closeConfirm(): void
  unfreezeRenderer(requestId: string): void
  destroyWindow(): void
  disposePolicy(): void
}

export interface QuitClosePolicy {
  state(): QuitCloseState
  /** dirty-push 维持的自持快照（分级判定源，非放行依据） */
  snapshotDirty(): boolean
  close(): void
  dirtyPush(dirty: boolean): void
  receipt(requestId: string, stillDirty: boolean): void
  timerFired(generation: number): void
  sendFailed(): void
  rendererGone(): void
  windowDestroyed(): void
  confirmResolved(token: number, confirmed: boolean): void
  dispose(): void
}

export function createQuitClosePolicy(now: () => number, effects: QuitPolicyEffects): QuitClosePolicy {
  let state: QuitCloseState = 'I'
  let seq = 0
  let requestId: string | null = null
  let requestT0 = 0
  let deadline = 0
  let generation = 0
  let tokenSeq = 0
  let confirmToken = 0
  let abortId: string | null = null
  let dirtySnapshot = false
  let destroyed = false
  let disposed = false

  const clearCurrent = (): void => {
    if (requestId !== null) effects.clearTimer(deadline, generation)
  }

  /** 入 C：清当前臂+除名（abort 载荷记被废 id）+单实例确认框（不叠） */
  const enterConfirm = (): void => {
    clearCurrent()
    if (requestId !== null) {
      effects.retireRequest(requestId)
      abortId = requestId
      requestId = null
    }
    state = 'C'
    tokenSeq += 1
    confirmToken = tokenSeq
    effects.showConfirm(confirmToken)
  }

  const toDestroyed = (emitDestroy: boolean): void => {
    if (destroyed) return
    destroyed = true
    clearCurrent()
    state = 'D'
    requestId = null
    if (emitDestroy) effects.destroyWindow()
  }

  const disposeOnce = (): void => {
    if (disposed) return
    disposed = true
    effects.disposePolicy()
  }

  return {
    state: () => state,
    snapshotDirty: () => dirtySnapshot,
    close() {
      if (state !== 'I' || destroyed) return
      seq += 1
      requestId = `quit-flush-${seq}`
      requestT0 = now()
      deadline = requestT0 + (dirtySnapshot ? QUIT_FLUSH_TIMEOUT_MS : QUIT_CLEAN_GRACE_MS)
      generation += 1
      // arm 先于 send：send 同步抛错→装配层回灌 sendFailed 时当前臂已可清
      effects.armTimer(deadline, generation)
      state = dirtySnapshot ? 'WD' : 'WC'
      effects.sendQuitFlush(requestId)
    },
    dirtyPush(dirty) {
      if (state === 'D') return
      dirtySnapshot = dirty
      if (state === 'WC' && dirty && now() < deadline) {
        effects.clearTimer(deadline, generation)
        deadline = requestT0 + QUIT_FLUSH_TIMEOUT_MS
        generation += 1
        effects.armTimer(deadline, generation)
        state = 'WD'
      }
    },
    receipt(id, stillDirty) {
      if (state !== 'WC' && state !== 'WD') return
      if (id !== requestId) return
      if (now() >= deadline || stillDirty) {
        enterConfirm()
        return
      }
      // [回炉 W3] 清臂先于除名置空（toDestroyed 内 clearCurrent 因 id 已空不发）
      clearCurrent()
      if (requestId !== null) effects.retireRequest(requestId)
      requestId = null
      toDestroyed(true)
    },
    timerFired(gen) {
      if (gen !== generation) return
      if (state !== 'WC' && state !== 'WD') return
      enterConfirm()
    },
    sendFailed() {
      if (state !== 'WC' && state !== 'WD') return
      enterConfirm()
    },
    rendererGone() {
      if (state !== 'WC' && state !== 'WD') return
      enterConfirm()
    },
    windowDestroyed() {
      if (state === 'C') effects.closeConfirm()
      if (state === 'D') {
        disposeOnce()
        return
      }
      toDestroyed(false)
      disposeOnce()
    },
    confirmResolved(token, confirmed) {
      if (state !== 'C' || token !== confirmToken) return
      confirmToken = 0
      if (confirmed) {
        toDestroyed(true)
        return
      }
      state = 'I'
      const id = abortId
      abortId = null
      if (id !== null) effects.unfreezeRenderer(id)
    },
    dispose() {
      state = 'D'
      requestId = null
      disposeOnce()
    }
  }
}
