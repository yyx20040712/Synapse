/**
 * [B4 L2 / 设计稿 §11.2（recoveryScheduler 行数预算拆件）、回炉 W-D2b 拆件] recovery-scheduler-triggers
 * —— 调度器触发面与对外门面（recoveryScheduler 的 notify 族、订阅/状态读面、clean 族与 ws-entry
 * 族转调、装配入参契约外移；状态与装配仍驻调度器，经 core 注入）。
 *
 * ── 行为层 ──
 * - 触发面（owner 判定归属）：编辑单元/草稿内容变更→armTrailing（300ms trailing）；出队 saveNow→
 *   owner 判定后即时发（不可覆槽=chip 承载不派发）；会话离场/外槽放弃/后台删夹→owner 状态机通知。
 * - 订阅/状态门面：getRecoveryState/subscribeRecoveryState/patchRecoveryUi（呈现读面与窄写口）、
 *   recoveryBlocked（写面门——未装配恒假）、getRecoveryOwner（owner 镜像读面）。
 * - clean 族门面：markRecoveryClean/awaitRecoveryQuitSettled/strongQuitRecoveryBestEffort/
 *   prepareRecoveryWorkspaceSwitch（转调 recovery-clean-lifecycle）。
 * - ws-entry 门面：enter/restore/discard/defer/reopen（转调 recoveryEntry；未装配 no-op）。
 * - RecoverySchedulerInit：宿主装配入参契约（生产装配=recovery-host-ports；未注入的可选钩子=旧语义）。
 *
 * ── 接口层 ── export interface RecoverySchedulerInit；export function createSchedulerTriggers(core):
 * SchedulerTriggers
 *
 * ── 架构层 ── 纯门面件：零自有状态，全部转调经 core 注入的调度器内核/拆件；不 import scheduler
 * （运行时方向 scheduler→triggers 单向；recoveryScheduler 原名再导出全部触发面 API）。
 */
import {
  type PreflightOutcome,
  type RecoveryEntry,
  type RecoveryUiState,
  type RestoreDecision,
  type SettleUnsettledResult
} from './recoveryEntry'
import type { RecoveryOwner, RecoveryOwnerHostPorts, RecoveryOwnerRef } from './recovery-owner'
import type { CleanLifecycle } from './recovery-clean-lifecycle'
import type { LineageRecoveryPayload } from '@shared/recovery/schemas'

export interface RecoverySchedulerInit {
  workspaceId(): string
  /** 当前可保存快照（clean 会话返 null——未编辑会话零恢复面写；legacy 单会话源） */
  snapshot(): LineageRecoveryPayload | null
  /** 恢复载入 store（置 dirty+两栈清——宿主=lineage.store.applyRecoverySession） */
  loadPayload(payload: LineageRecoveryPayload): void
  /** 载入+接管完成后回调（草稿再水化计划驻宿主） */
  onRestored(payload: LineageRecoveryPayload): void
  openLineageView(): void
  /** [回炉 W5] 放弃分支清恢复态 store（宿主=lineage.store.discardSession——
   *  再保存不复活已弃会话；仅恢复流程内调用，defer 后不再清） */
  discardLoadedSession(): void
  /** [F-RECOV-04] 未落定写谓词（覆盖守卫判定源——queue 非空∨草稿在∨flushing；
   *  缺省=fail-open 无未落定写，旧测试夹具兼容） */
  hasUnsettledWrites?(): boolean
  /** [F-RECOV-04] 恢复决策询问（确认框承载；缺省行为见 recoveryEntry 头注缺省表） */
  askRestoreDecision?(decision: RestoreDecision): Promise<boolean>
  /** [回炉 B-2] 落定当前会话写（草稿经既有 commit 入口转队列+flush+落定四条件
   *  核验；false=落定失败停条可重试不自动续；对象形=核验结果+已收口计数） */
  settleUnsettledWrites?(): Promise<SettleUnsettledResult>
  /** [F-RECOV-04] 恢复预检（graph/folders 读面装配→纯数据清单；缺省=跳过预检） */
  runRestorePreflight?(payload: LineageRecoveryPayload): Promise<PreflightOutcome>
  /** [回炉 W-B3·R-B5 / 设计稿 §6.3] 替换守卫谓词（副本目标会话 folderId 或活动会话有 Q/F/
   *  draft、unfinalized 或 undo/redo 非空＝真→载入前必须替换确认；缺省=不确认） */
  hasReplaceableSession?(folderId: string): boolean
  /** [B4 L2 §8] owner 宿主面（registry 读——recovery-host-ports 装配；缺省=legacy
   *  单会话：snapshot() 即唯一快照源、clean 四源直走 release） */
  owner?: RecoveryOwnerHostPorts
}

/** 调度器内核（状态/装配单源驻调度器——模块求值期注入） */
export interface SchedulerTriggerCore {
  inited(): boolean
  gateOpen(): boolean
  ownerCtl(): RecoveryOwner | null
  uiState(): RecoveryUiState
  listeners: Set<() => void>
  emit(patch?: Partial<RecoveryUiState>): void
  lifecycle: CleanLifecycle
  entry: RecoveryEntry
  armTrailing(): void
  dispatchImmediateSave(): void
}

export interface SchedulerTriggers {
  notifyRecoveryEditUnit(folderId?: string): void
  notifyRecoveryDraftChange(folderId?: string): void
  notifyRecoverySaveNow(folderId?: string): void
  notifyRecoveryDepart(folderId: string, unsettled: boolean): void
  notifyForeignSlotReleased(): void
  notifyRecoveryFolderRemoved(folderId: string): void
  getRecoveryOwner(): RecoveryOwnerRef | null
  patchRecoveryUi(patch: Partial<RecoveryUiState>): void
  recoveryBlocked(): boolean
  getRecoveryState(): RecoveryUiState
  subscribeRecoveryState(cb: () => void): () => void
  markRecoveryClean(reason: 'clean' | 'discard', folderId?: string): void
  awaitRecoveryQuitSettled(): Promise<void>
  strongQuitRecoveryBestEffort(): void
  prepareRecoveryWorkspaceSwitch(): Promise<void>
  enterWorkspaceRecovery(): Promise<void>
  restoreRecoverySlot(): Promise<void>
  discardRecoverySlot(): Promise<void>
  deferRecoverySlot(): void
  reopenRecoveryBar(): void
}

export function createSchedulerTriggers(core: SchedulerTriggerCore): SchedulerTriggers {
  const lifecycle = core.lifecycle
  const entry = core.entry
  const listeners = core.listeners
  return {
    // ── 触发面（owner 判定归属）─────────────────────────────────

    /** 编辑单元触发（enqueue 后）——300ms trailing；[B4 L2] folderId=触发会话（owner 认领） */
    notifyRecoveryEditUnit(folderId) {
      core.ownerCtl()?.onEditUnit(folderId)
      core.armTrailing()
    },

    /** 草稿内容变更触发（B-02——与编辑单元同节流面）。草稿属活动图：触发不携归属
     *  （owner 判定面=快照源），签名保留 folderId 供调用点对称。 */
    notifyRecoveryDraftChange(folderId) {
      void folderId
      core.armTrailing()
    },

    /** 出队 saveNow（flush 每动作成功出队后——fire-and-forget 不节流即时发）；
     *  [B4 L2 §8.1 步 2] 切换离场即写：owner/claim 即发；不可覆槽（owner 为他会话且不可
     *  认领）=chip 承载不派发 */
    notifyRecoverySaveNow(folderId) {
      const ownerCtl = core.ownerCtl()
      if (ownerCtl !== null) {
        ownerCtl.onSaveNow(folderId)
        const target = ownerCtl.dispatchTarget()
        if (target === null || (folderId !== undefined && target.folderId !== folderId)) return
      }
      core.dispatchImmediateSave()
    },

    /** [B4 L2 §8.1] 会话离场通知：owner=离场会话且有未落定写→置 ownershipTransferPending
     *  （抑制普通 IO-clean release——转移裁决在 onClean 的挂起会话分支） */
    notifyRecoveryDepart(folderId, unsettled) {
      core.ownerCtl()?.onDepart(folderId, unsettled)
    },

    /** 当前 owner（registry.recoveryOwner 的镜像读面） */
    getRecoveryOwner() {
      return core.ownerCtl()?.current() ?? null
    },

    /** 呈现窄写口（host-ports 的 chip 装配） */
    patchRecoveryUi(patch) {
      core.emit(patch)
    },

    // ── clean 族门面（recovery-clean-lifecycle）─────────────────────────

    /** clean 四源挂点（flush 全成功/undo·redo 落库/discardSession/退出 clean）——fire-and-forget */
    markRecoveryClean(reason, folderId) {
      lifecycle.markClean(reason, folderId)
    },

    /** 退出窗收口等待（quit-flush ③ 后消费；release 自带 1500ms 界） */
    async awaitRecoveryQuitSettled() {
      await lifecycle.awaitQuitSettled()
    },

    /** 强退尽力：最后 saveNow（不 release——副本承载未落库状态） */
    strongQuitRecoveryBestEffort() {
      lifecycle.strongQuitBestEffort()
    },

    /** 工作区切换（确认弃置后）：代际先行+弃置 release（[B4 L2 §8.4 行 10] owner 先归 null） */
    prepareRecoveryWorkspaceSwitch() {
      core.ownerCtl()?.resetOwner()
      return lifecycle.prepareWorkspaceSwitch()
    },

    // ── ws-entry 门面（族驻 recoveryEntry——W6 拆件；公共 API 不变）──
    // 恢复流程体=recovery-restore-flow

    async enterWorkspaceRecovery() {
      if (!core.inited()) return
      await entry.enterWorkspaceRecovery()
    },

    async restoreRecoverySlot() {
      if (!core.inited()) return
      await entry.restoreRecoverySlot()
    },

    async discardRecoverySlot() {
      if (!core.inited()) return
      await entry.discardRecoverySlot()
    },

    deferRecoverySlot() {
      if (!core.inited()) return
      entry.deferRecoverySlot()
    },

    /** chip 重开确认条（再冻结直到决策）。[回炉轮2 Z7] slotKind=null 时=重新 peek（死按钮修复） */
    reopenRecoveryBar() {
      if (!core.inited()) return
      entry.reopenRecoveryBar()
    },

    /** 外槽放弃成功→owner 可认领（§8.4 行 9） */
    notifyForeignSlotReleased() {
      core.ownerCtl()?.onForeignSlotReleased()
    },

    /** [B4 L2 §8.4 行 11] 后台删夹（会话清出前——调用方保证 IO clean）：owner 转移或 null */
    notifyRecoveryFolderRemoved(folderId) {
      core.ownerCtl()?.onFolderRemoved(folderId)
    },

    // ── 门/状态读面 ───────────────────────────────────────

    /** 写面门（beginUnitGated 消费——quitWriteBlocked 同型；未装配恒假） */
    recoveryBlocked() {
      return core.inited() && !core.gateOpen()
    },

    getRecoveryState() {
      return core.uiState()
    },

    subscribeRecoveryState(cb) {
      listeners.add(cb)
      return () => {
        listeners.delete(cb)
      }
    }
  }
}
