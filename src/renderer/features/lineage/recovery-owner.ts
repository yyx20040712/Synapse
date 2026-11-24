/**
 * [B4 L2 / 设计稿 §8.1/§8.2/§8.4、§6.3、§11.2] recovery-owner —— 唯一 recovery 槽的
 * 所有权状态机（recoveryScheduler 的 owner 逻辑外移——调度器只留单槽 pump/token/gen）。
 *
 * ── 行为层（§8.4 迁移表 11 行 + §8.2 全 14 行）──
 * - owner={folderId,generation}|null（生效值——已 saved 回执）与 claim（认领中的
 *   临时值）分置；publish=写回 registry.recoveryOwner（消费面=§8.4 后台删夹等）。
 * - 首次编辑（onEditUnit）：owner=null ∧ claim=null ∧ 槽可认领（无外槽未决）∧
 *   该会话有未落定写→认领（saved 回执后生效=owner）；外会话槽未决→保持 null，
 *   pendingChip 承载（不写槽）。
 * - save 回执（onSaved/onPending/onFailed，live settle 才调用——ghost 迟到 settle
 *   只走物理 token 账本，不改 owner、不清 chip）：onSaved→认领生效/记账；onPending
 *   →槽被换（外槽）：认领作废+chip；onFailed→认领保持（退避重试承载）。
 * - clean 族（onClean，§8.4 行 3/4）：Q/F 落定的会话若非 owner→只可能撤认领；
 *   若为 owner：活动会话→其他会话无需保护才 release→null（行 3「可留 A」：仍有
 *   需保护会话则不动槽）；挂起会话（离场 flush-first 落定/后台删夹清出）→转移
 *   裁决：有下一会话需保护→以本会话 token 写其快照（同槽合法覆写，无「先删后
 *   写」空窗），saved 回执后才改 owner；无→release 置 null。失败→owner 留原会话
 *   +chip（其他图未受保护），pending 保留待下次触发重试。
 * - 离场（onDepart，§8.1）：owner=离场会话 ∧ 有未落定写→置 ownershipTransferPending
 *   （抑制该会话普通 IO-clean release——release 裁决只在 onClean 的转移分支走）。
 * - 恢复 takeOver 成功（adopt）→owner=F（新代际）；pending/overflow→不变（条保留）。
 * - 外槽放弃（onForeignSlotReleased）→可认领；课题切换/reset（resetOwner）→null。
 * - chip（refreshChip，§8.4 行 1/行 2 与末段）：存在需保护会话，它既不是 owner 也不是
 *   认领在途（claim）的会话→「多图未落库，副本仅保护一张」诚实呈现。
 *   [回炉 W-B1·R-B1] 两条不算需保护的路径：①认领在途的会话视同已覆盖——行 1「null→
 *   folder（saved 回执后生效）」窗口内不得显示，只有行 2（外槽未决、不可认领）才为真；
 *   ②被清洁会话不计入自身——onClean 的调用契约是该会话已 IO clean，而
 *   markRecoveryClean 在写链任务体内调用，此刻该会话的 inflight 仍是链的在途标记、
 *   仍被 protectedSessions 列出（owner 释放后的 undo/redo/显式保存若不过滤，恢复条
 *   出现后无触发点再撤）。cleaning 只按 onClean 的调用契约传入（释放/转移回执沿同一
 *   会话）。③[R-remap/R-B1b] chip 只看有未落库写的会话（host 的 unlandedSessions：
 *   Q>0 或在途 write/flush/history，仅和解读在途不算）——chip 的定义是「多个 folder
 *   同时有未落库写」；remap 终态迁移后存活会话的和解读与 owner 的 release 回执并发，
 *   按恢复价值谓词（Q∨F 含 reconcile）判会在回执时刻误判且无触发点再撤。认领/转移/
 *   flush-first 仍读 protectedSessions（§8.1 谓词不变）；未注入=protectedSessions。
 * - 转移/释放回执复核（[回炉 W-B1·R-B6] §8.4「owner 迟到 save：不改变新 owner，不清
 *   chip」）：裁决起步捕获决策序号与来源 owner；回执到达时决策序号已推进（adopt/
 *   resetOwner/另一次裁决）或来源 owner 已不是裁决时的引用=迟到→零动作（不 publish、
 *   不复位 transferPending、不刷新 chip），只留调度器侧的物理 token 账。转移另复核
 *   目标会话代际（lineage-writeback-admission.generationCurrent）——目标已被替换则不发布。
 *   （决策票与账本=[回炉 W-B2] recovery-owner-decision——自本件外移，注释随迁。）
 * - release 回执落地前复核（[回炉 W-B2·R-W4] §8.4 行 3/行 1）：回执在途期该会话来过编辑
 *   触发→不发布 null、owner 留该会话（判据与理由见 recovery-owner-decision 头注）。
 *
 * ── 接口层 ── export function createRecoveryOwner(deps): RecoveryOwner / 类型
 * RecoveryOwnerRef·RecoveryOwnerHostPorts
 *
 * ── 架构层 ── 纯状态机：快照/写槽/release/呈现经 deps 注入（装配=recoveryScheduler
 * 组合 host-ports；host 面=recovery-host-ports 的 registry 读）。
 */
import type { LineageRecoveryPayload } from '@shared/recovery/schemas'
import { generationCurrent } from './lineage-writeback-admission'
import { createDecisionLedger, releaseVerdict, type DecisionTicket } from './recovery-owner-decision'

export interface RecoveryOwnerRef {
  folderId: string
  generation: number
}

/** host 面（registry 读——recovery-host-ports 装配） */
export interface RecoveryOwnerHostPorts {
  /** 需保护会话键（Q∨F；活动会话居首） */
  protectedSessions(): string[]
  /** 有未落库写的会话键（Q>0 或在途 write/flush/history——仅和解读在途不算）；chip 判据面，缺省=protectedSessions */
  unlandedSessions?(): string[]
  /** 会话代际（会话不在=null——认领/校验用） */
  generationOf(folderId: string): number | null
  /** 某 folder 的可保存快照（无待保护数据=null） */
  sessionSnapshot(folderId: string): LineageRecoveryPayload | null
  /** 活动会话键（转移裁决的「owner 可留」判据） */
  activeFolder(): string
  /** 未受保护 chip 呈现（诚实文案承载） */
  setUnprotectedChip(v: boolean): void
  /** owner 发布（registry.recoveryOwner——§8.4 后台删夹等消费） */
  publish(owner: RecoveryOwnerRef | null): void
}

/** 调度器面（单槽写/release——recoveryScheduler 组合） */
export interface RecoveryOwnerSlotPorts {
  /** 槽可认领（无外槽未决且门开） */
  slotClaimable(): boolean
  /** 以本会话身份写某会话快照（同槽合法覆写——转移用；不接管 epoch 流） */
  writeSnapshot(folderId: string): Promise<'saved' | 'failed'>
  /** release 本会话自有槽（pendingChip 在场由调用方拦截） */
  releaseOwn(reason: 'clean' | 'discard'): Promise<void>
}

export type RecoveryOwnerDeps = RecoveryOwnerHostPorts & RecoveryOwnerSlotPorts

export interface RecoveryOwner {
  current(): RecoveryOwnerRef | null
  transferPending(): boolean
  /** dispatch 快照为空（认领会话已 clean）→撤认领 */
  onSkipped(target: RecoveryOwnerRef): void
  /** 编辑单元触发：认领判定 */
  onEditUnit(folderId?: string): void
  /** 切换离场即时触发（saveNow 前置） */
  onSaveNow(folderId?: string): void
  /** dispatch 目标选择（claim 或 owner；null=无可保护/不可认领） */
  dispatchTarget(): RecoveryOwnerRef | null
  onSaved(target: RecoveryOwnerRef): void
  onPending(target: RecoveryOwnerRef): void
  onFailed(target: RecoveryOwnerRef): void
  /** clean 族挂点（flush 全成功/history 落库/discard 的会话归属裁决） */
  onClean(folderId: string, reason: 'clean' | 'discard'): void
  onDepart(folderId: string, unsettled: boolean): void
  adopt(folderId: string, generation: number): void
  onForeignSlotReleased(): void
  resetOwner(): void
  onFolderRemoved(folderId: string): void
  refreshChip(): void
}

export function createRecoveryOwner(deps: RecoveryOwnerDeps): RecoveryOwner {
  let owner: RecoveryOwnerRef | null = null
  let claim: RecoveryOwnerRef | null = null
  let transferPending = false
  const decisions = createDecisionLedger() // 决策账本（R-B6 裁决票·R-W4 release 在途窗——recovery-owner-decision）

  const publish = (next: RecoveryOwnerRef | null, cleaning?: string): void => {
    owner = next
    decisions.bump()
    deps.publish(owner)
    refreshChip(cleaning)
  }
  const claimable = (folderId: string): boolean => {
    const generation = deps.generationOf(folderId)
    return generation !== null && deps.slotClaimable()
  }
  const refreshChip = (cleaning?: string): void => {
    const list = (deps.unlandedSessions?.() ?? deps.protectedSessions()).filter((f) => f !== cleaning) // 被清洁会话自身不计入需保护
    const covered = (f: string): boolean => f === owner?.folderId || f === claim?.folderId // 认领在途视同已覆盖
    deps.setUnprotectedChip(list.length > 0 && list.some((f) => !covered(f)))
  }
  const tryClaim = (folderId: string | undefined): boolean => {
    decisions.noteWrite(folderId) // [回炉 W-B2·R-W4] 编辑/落库触发到达——命中在途 release 的会话即标记
    if (owner !== null || claim !== null) return owner !== null || claim !== null
    const target = folderId ?? deps.protectedSessions()[0]
    if (target === undefined) return false
    if (!deps.protectedSessions().includes(target)) return false
    if (!claimable(target)) return false
    let hasData = false
    try {
      hasData = deps.sessionSnapshot(target) !== null // 会话确有待保护数据（防认领已 clean 会话→空转 claim/skip 环）
    } catch {
      hasData = false
    }
    if (!hasData) return false
    claim = { folderId: target, generation: deps.generationOf(target)! }
    return true
  }
  /** release 回执落定（[回炉 W-B2·R-W4] §8.4 行 3/行 1）：迟到回执零动作；回执在途期本会话来过编辑触发→不发布 null */
  const settleRelease = (ticket: DecisionTicket, fromFolderId: string): void => {
    const edited = decisions.takeRelease(ticket)
    if (!decisions.current(ticket, owner)) return
    if (releaseVerdict(edited) === 'keep-owner') {
      refreshChip() // owner 留该会话（认领保持——其快照写由那次编辑的触发面派发）
      return
    }
    publish(null, fromFolderId)
  }
  /** 转移裁决（§8.1 末段）：有下一会话需保护→同槽合法覆写其快照（saved 回执后改
   *  owner——无「先删后写」空窗）；无→release 置 null。失败→owner 留原会话+chip+
   *  transferPending 复置（下次触发重试）。回执一律经决策账本 current 复核（R-B6——凭据与账本驻
   *  recovery-owner-decision）；release 分支另经 settleRelease 复核回执在途期的编辑触发（R-W4）。 */
  const transferDecision = (fromFolderId: string, reason: 'clean' | 'discard'): void => {
    transferPending = false
    const next = deps.protectedSessions().find((f) => f !== fromFolderId)
    const generation = next === undefined ? null : deps.generationOf(next)
    const ticket = decisions.open(owner)
    if (next === undefined || generation === null) {
      decisions.openRelease(fromFolderId, ticket)
      void deps.releaseOwn(reason).then(() => settleRelease(ticket, fromFolderId))
      return
    }
    const target: RecoveryOwnerRef = { folderId: next, generation }
    void deps
      .writeSnapshot(next)
      .then((outcome) => {
        if (!decisions.current(ticket, owner)) return // 迟到回执（恢复接管/课题切换已改 owner）：零动作
        if (outcome !== 'saved') {
          transferPending = true // 失败：owner 留原会话+chip（下次触发重试）
          refreshChip()
          return
        }
        if (!generationCurrent(deps.generationOf(next), target)) return // 目标会话已被替换：不发布
        claim = null
        publish(target, fromFolderId)
      })
      .catch(() => undefined)
  }

  return {
    current: () => owner,
    transferPending: () => transferPending,
    onEditUnit(folderId) {
      tryClaim(folderId)
      refreshChip()
    },
    onSaveNow(folderId) {
      // 切换离场的即时保护请求：owner/claim 即写；不可认领=chip（不覆槽）
      tryClaim(folderId)
      refreshChip()
    },
    dispatchTarget() {
      if (claim !== null) return claim
      if (owner !== null) return owner
      return tryClaim(undefined) ? claim : null
    },
    onSkipped(target) {
      if (claim !== null && claim.folderId === target.folderId) claim = null // 认领会话已 clean→撤认领
      if (owner !== null && owner.folderId === target.folderId && deps.protectedSessions().some((f) => f !== target.folderId)) {
        // owner 快照已空（会话已落定）而有他会话需保护：即行转移裁决——不自陷「owner=空会话」
        transferDecision(target.folderId, 'clean')
        return
      }
      refreshChip()
    },
    onSaved(target) {
      if (claim !== null && claim.folderId === target.folderId && claim.generation === target.generation) {
        claim = null
        publish(target) // 认领生效（§8.4 行 1：null→folder，saved 回执后）
        return
      }
      if (owner !== null && owner.folderId === target.folderId) refreshChip()
    },
    onPending(target) {
      // 槽被换（外槽）：认领作废（行 2：保持 null，pendingChip 承载）
      if (claim !== null && claim.folderId === target.folderId) claim = null
      refreshChip()
    },
    onFailed() {
      // 认领保持（退避重试承载）；owner 不变
      refreshChip()
    },
    onClean(folderId, reason) {
      if (claim !== null && claim.folderId === folderId && !deps.protectedSessions().includes(folderId)) claim = null
      if (owner === null || owner.folderId !== folderId) {
        refreshChip(folderId) // 调用契约=该会话已 IO clean（其 inflight 是调用方写链的在途标记）
        return
      }
      if (deps.activeFolder() === folderId) {
        transferPending = false
        if (deps.protectedSessions().every((f) => f === folderId)) {
          // 行 3：无他需保护→release；迟到回执不改 owner（回执在途期本会话又有未落库写→不归 null，R-W4）
          const ticket = decisions.open(owner)
          decisions.openRelease(folderId, ticket)
          void deps.releaseOwn(reason).then(() => settleRelease(ticket, folderId))
        }
        return // 行 9「可留 A」：活动会话不转移（行 12：下次调度再转移/释放）
      }
      // 挂起会话 clean（离场 flush-first 落定/后台删夹）：转移裁决（§8.1 末段）
      transferDecision(folderId, reason)
    },
    onDepart(folderId, unsettled) {
      if (owner !== null && owner.folderId === folderId && unsettled) transferPending = true // §8.1：抑制普通 release
      refreshChip()
    },
    adopt(folderId, generation) {
      claim = null
      transferPending = false
      publish({ folderId, generation })
    },
    onForeignSlotReleased() {
      refreshChip()
    },
    resetOwner() {
      claim = null
      transferPending = false
      publish(null)
    },
    onFolderRemoved(folderId) {
      // §8.4 行 11（调用方保证 IO clean）：按算法转移或 null
      if (owner === null || owner.folderId !== folderId) return
      transferDecision(folderId, 'discard')
    },
    refreshChip
  }
}
