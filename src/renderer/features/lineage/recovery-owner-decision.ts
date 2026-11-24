/**
 * [B4 L2 / 设计稿 §8.4「owner 迟到 save：不改变新 owner，不清 chip」、§11.2] recovery-owner-decision
 * —— recoveryOwner 转移/释放裁决的回执准入凭据（决策票）与 release 回执落定裁决（[回炉 W-B2] 自
 * recovery-owner 外移：该件行数贴预算上限 280，决策票逻辑连同注释随迁；R-W4 的回执裁决函数
 * 同件）。
 *
 * ── 行为层 ──
 * - DecisionTicket（[回炉 W-B1·R-B6]）：裁决起步时捕获决策序号与来源 owner。
 * - 决策账本：open(owner)=裁决起步——推进决策序号并捕获来源 owner；bump()=owner 发布时推进
 *   决策序号（在途裁决的回执由此判迟到）；current(ticket, owner)=回执准入——序号未推进 ∧ 来源
 *   owner 仍是裁决时的引用。任一不成立=迟到回执（恢复接管 adopt/课题切换 resetOwner/另一次
 *   裁决已改 owner）→调用方零动作（不 publish、不复位 transferPending、不刷新 chip），只留调度
 *   器侧的物理 token 账。
 * - release 在途窗与回执落定裁决（[回炉 W-B2·R-W4] §8.4 行 3「idle/显式 flush 全成功→
 *   folder→null（release 后）」与行 1「owner 在 saved 回执后生效」）：release 起步记在途 release
 *   的会话（openRelease）；回执在途期（releaseOwn 含在途 flight 有界 drain+release IPC）该会话
 *   的编辑触发到达（noteWrite——新未落库写一律经 notifyRecoveryEditUnit/notifyRecoverySaveNow
 *   触达 owner）即标记；回执落定时 takeRelease 返回该标记，releaseVerdict 据此裁决：
 *   'keep-owner'=不发布 null——owner 留该会话（认领保持），其快照写由那次编辑的触发面（trailing）
 *   派发；否则 'publish-null'。原缺陷：同会话的新编辑不推进决策序号（onEditUnit→tryClaim 在
 *   owner 非空时不改 owner/claim），迟到的回执照常 publish(null)——owner 归 null 而该会话 Q>0，
 *   窗口内该会话的恢复副本不受保护，单会话被 chip 判为未受保护，直到下一次编辑才重新认领。
 *   判据取「回执在途期来过编辑触发」而不取「回执落定时查需保护清单」：清单里的该会话可能只是
 *   调用方写链的在途标记（markRecoveryClean 在写链任务体内调用——[回炉 W-B1·R-B1] 既有合约
 *   「清单因调用方写链在途标记仍列出该会话→release→null」），不能据此判定有新写。
 *
 * ── 接口层 ── export interface DecisionTicket·DecisionLedger；export function
 * createDecisionLedger/sameOwnerRef/releaseVerdict；类型 ReleaseVerdict
 *
 * ── 架构层 ── 纯逻辑件：只依赖类型（recovery-owner 单向依赖本件；类型反向 import 为
 * type-only，零运行时环）。
 */
import type { RecoveryOwnerRef } from './recovery-owner'

/** 转移/释放裁决的回执准入凭据（起步时捕获） */
export interface DecisionTicket {
  seq: number
  from: RecoveryOwnerRef | null
}

export interface DecisionLedger {
  /** 裁决起步：推进决策序号并捕获来源 owner */
  open(owner: RecoveryOwnerRef | null): DecisionTicket
  /** owner 发布：推进决策序号（此前起步的在途裁决，其回执由此判迟到） */
  bump(): void
  /** 回执准入：序号未推进 ∧ 来源 owner 仍是裁决时的引用 */
  current(ticket: DecisionTicket, owner: RecoveryOwnerRef | null): boolean
  /** [回炉 W-B2·R-W4] release 起步：记在途 release 的会话与其裁决票 */
  openRelease(folderId: string, ticket: DecisionTicket): void
  /** [回炉 W-B2·R-W4] 编辑触发到达：命中在途 release 的会话→标记「回执在途期该会话又有未落库写」 */
  noteWrite(folderId: string | undefined): void
  /** [回炉 W-B2·R-W4] release 回执落定：清本票的在途标记（迟到回执同样清），返回回执在途期该会话是否来过写 */
  takeRelease(ticket: DecisionTicket): boolean
}

export function sameOwnerRef(a: RecoveryOwnerRef | null, b: RecoveryOwnerRef | null): boolean {
  return a !== null && b !== null && a.folderId === b.folderId && a.generation === b.generation
}

export function createDecisionLedger(): DecisionLedger {
  /** 决策序号：每次 owner 发布、每次转移/释放裁决起步各推进一次 */
  let seq = 0
  /** 在途 release（[回炉 W-B2·R-W4]）：会话、其裁决票、回执在途期是否来过该会话的编辑触发 */
  let releasing: { folderId: string; ticket: DecisionTicket; rewritten: boolean } | null = null
  return {
    open: (owner) => ({ seq: ++seq, from: owner }),
    bump: () => {
      seq += 1
    },
    current: (ticket, owner) => ticket.seq === seq && sameOwnerRef(owner, ticket.from),
    openRelease: (folderId, ticket) => {
      releasing = { folderId, ticket, rewritten: false }
    },
    noteWrite: (folderId) => {
      if (releasing !== null && folderId === releasing.folderId) releasing.rewritten = true
    },
    takeRelease: (ticket) => {
      const rewritten = releasing !== null && releasing.ticket === ticket && releasing.rewritten
      if (releasing !== null && releasing.ticket === ticket) releasing = null
      return rewritten
    }
  }
}

export type ReleaseVerdict = 'publish-null' | 'keep-owner'

/** release 回执落定裁决（[回炉 W-B2·R-W4]——见头注）：回执在途期该会话来过编辑触发=owner 不归 null */
export function releaseVerdict(editedDuringRelease: boolean): ReleaseVerdict {
  return editedDuringRelease ? 'keep-owner' : 'publish-null'
}
