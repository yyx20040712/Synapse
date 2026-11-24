/**
 * [B4 L2 / 设计稿 §6.3「恢复谓词拆分」/§8.1 恢复价值谓词/§8.4 clean 族/§2.5 #38、§11.2]
 * recovery-clean-lifecycle —— 恢复/收口谓词（纯函数）+ clean·drain·release·workspace
 * reset 生命周期（recoveryScheduler 的 clean 族外移；装配=scheduler 模块求值期注入 core）。
 *
 * ── 谓词（纯函数，零依赖）──
 * - hasUnsettledWrites(S) = Q（queue 非空）∨ F（在途写）∨ 草稿（未收口文本/悬浮
 *   笔记草稿）。**不含 unfinalized、undo、redo、历史**——已落库历史不是待写，
 *   不产生崩溃副本价值，也不阻 owner release（§8.1：该谓词与 flush 守卫同源单义）。
 * - hasReplaceableSession(S) = Q/F/draft ∨ unfinalized ∨ undo/redo 非空：决定恢复
 *   载入前是否必须确认替换。有历史但 IO clean 时无需为了恢复先清 redo/灰点——
 *   只确认替换，成功载入后才清目标会话历史。
 *
 * ── 生命周期 ──
 * - markCleanAwaitable：gen++ 同步先行（INV-161 全量复位）+在途 flight 有界 drain
 *   （1500ms——被弃置 flight 迟到 settle 经物理账本供给 release token，永挂不永等）
 *   +release 自有槽（token=物理账本最新；失败吞接=副本留驻下次屏障兜底 INV-167）。
 * - markClean：clean 四源挂点（flush 全成功/undo·redo 落库/discardSession/退出
 *   clean）。[B4 L2] owner 装配后按会话归属裁决（recovery-owner onClean：release/
 *   转移——非 owner 会话的 clean 不动槽）；未装配=legacy 单会话（clean-gate 判定
 *   后 release）。fire-and-forget。
 * - awaitQuitSettled：退出窗收口等待（quit-flush ③ 后消费）。
 * - strongQuitBestEffort：强退=最后 saveNow 尽力**不 release**（副本承载未落库状态）。
 * - prepareWorkspaceSwitch：课题切换（确认弃置后）：代际先行+弃置 release（reload
 *   竞窗留驻=无害；1500ms 封顶——在途 save 永不 settle 时切换不永久 busy）。
 */

/** 谓词输入（会话视图窄形——registry 会话或测试夹具均可直接传入） */
export interface UnsettledView {
  queue: readonly unknown[]
  /** 当前在途写（null=无——F=0） */
  inflight: unknown
}

export interface ReplaceableView extends UnsettledView {
  unfinalized: boolean
  undoStack: readonly unknown[]
  redoStack: readonly unknown[]
}

/** §8.1 恢复价值谓词=§6.3 flush 守卫（同源单义）：Q ∨ F ∨ 草稿 */
export function hasUnsettledWrites(view: UnsettledView, draftOpen: boolean): boolean {
  return view.queue.length > 0 || view.inflight !== null || draftOpen
}

/** §6.3 替换守卫：Q/F/draft 或 unfinalized 或 undo/redo 非空 */
export function hasReplaceableSession(view: ReplaceableView, draftOpen: boolean): boolean {
  return hasUnsettledWrites(view, draftOpen) || view.unfinalized || view.undoStack.length > 0 || view.redoStack.length > 0
}

// ── 生命周期（core=scheduler 注入——token/gen/在途/owner 单源驻调度器）────────

import { api, unwrap } from '../../api/client'
import { withTimeout } from './recoveryBackoff'
import { cleanReleaseBlocked, type RecoveryCleanGateView } from './recovery-clean-gate'
import type { RecoveryOwner } from './recovery-owner'
import type { RecoverySchedulerInit } from './recoveryScheduler'
import { RECOVERY_TYPE } from './recoveryEntry'

const QUIT_TIMEOUT_MS = 1500

export interface CleanLifecycleCore {
  inited(): boolean
  host(): RecoverySchedulerInit | null
  /** owner 状态机（未装配=null——legacy 单会话行为） */
  owner(): RecoveryOwner | null
  /** 呈现现值（clean-gate 判定源） */
  uiState(): RecoveryCleanGateView
  /** 活动会话键（owner 未携 folderId 的挂点归属） */
  activeFolder(): string
  /** 捕获当前在途 flight（bump 前取——有界 drain 沿用该 promise） */
  currentFlight(): Promise<unknown> | null
  /** gen++ 全量复位（弃置在途+清定时器+复位呈现——含 gen 递增） */
  bumpGenFullReset(): void
  tokensForRelease(): string | null
  clearTokens(): void
  setQuitChain(p: Promise<void>): void
  quitChain(): Promise<void>
  /** 强退即时写（saveNow——不节流） */
  dispatchImmediateSave(): void
}

export interface CleanLifecycle {
  markCleanAwaitable(reason: 'clean' | 'discard', releaseAllowed: boolean): Promise<void>
  markClean(reason: 'clean' | 'discard', folderId?: string): void
  awaitQuitSettled(): Promise<void>
  strongQuitBestEffort(): void
  prepareWorkspaceSwitch(): Promise<void>
}

export function createCleanLifecycle(core: CleanLifecycleCore): CleanLifecycle {
  const markCleanAwaitable = (reason: 'clean' | 'discard', releaseAllowed: boolean): Promise<void> => {
    const flight = core.currentFlight() // 先捕获（bump 弃置将清位——有界 drain 沿用该 promise）
    core.bumpGenFullReset()
    const ws = core.host()?.workspaceId() ?? ''
    const chain = (async () => {
      if (flight !== null) {
        // [R1/S13b] drain 有界封顶 1500ms（QUIT_TIMEOUT_MS 同族）：被弃置 flight 迟到
        // settle 经物理账本供给 release token；永挂 flight 不再永等；reject 同收束
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
              resolve()
            }
          )
        })
      }
      // [F-RECOV-04 clean-gate] pendingChip 在场=旧槽未决策：release 不发+账本保留
      // （主控终裁③——本会话新写 token 留驻，后续工作区切换/放弃确认仍可收口 own 槽）
      if (!releaseAllowed) return
      const token = core.tokensForRelease()
      core.clearTokens()
      if (token === null || ws === '' || !core.inited()) return
      try {
        await withTimeout(
          unwrap(api.recovery.release({ workspaceId: ws, type: RECOVERY_TYPE, token, reason })),
          QUIT_TIMEOUT_MS
        )
      } catch {
        // 失败吞接：副本留驻=下次启动屏障兜底（无害恢复族——INV-167）
      }
    })()
    core.setQuitChain(chain)
    return chain
  }

  return {
    markCleanAwaitable,
    markClean(reason, folderId) {
      if (!core.inited()) return
      const owner = core.owner()
      if (owner !== null) {
        void owner.onClean(folderId ?? core.activeFolder(), reason) // [B4 L2] 按会话归属裁决
        return
      }
      void markCleanAwaitable(reason, !cleanReleaseBlocked(core.uiState())) // legacy 单会话
    },
    awaitQuitSettled: () => core.quitChain(),
    strongQuitBestEffort: () => core.dispatchImmediateSave(),
    prepareWorkspaceSwitch() {
      if (!core.inited()) return Promise.resolve()
      // [d1-N2 主控亲笔] drain 等待 1500ms 封顶：在途 save 永不 settle 时切换不永久
      // busy；迟到 release=INV-167 无害族（副本留驻下次屏障承接）
      // [B4 L2 §8.4 行 10] 域级 release 豁免 clean-gate（B7 先例）；owner 归 null 由
      // 调度器在调用前置（release 用旧 ws id 时 main 侧未切=guardWorkspace 放行）
      return Promise.race([
        markCleanAwaitable('discard', true),
        new Promise<void>((resolve) => {
          setTimeout(resolve, QUIT_TIMEOUT_MS)
        })
      ])
    }
  }
}
