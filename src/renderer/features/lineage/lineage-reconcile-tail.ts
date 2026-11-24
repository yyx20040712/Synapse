/**
 * [回炉 W-B3·R-B7（用户裁决 D-2＝甲）/ 设计稿 §2.6 #10d、#13c、#20c、#34d、#10a]
 * lineage-reconcile-tail —— 和解读被丢后的链尾续拉（纯编排；flush 尾／finalize 前／history 前
 * 三处调用点共用）。
 *
 * ── 行为层 ──
 * - reconcileAtTail({ reconcile?, drain, alive }) → { outcome, followed }：
 *   · 首次和解 applied／failed 即返回（#10b 成功＝权威应用清位／#10c 失败＝error 位保留——
 *     失败不续拉，重试留给下一次命令）；
 *   · 首次和解 'dropped'（不写图态、位保留——来源见本件头注「被丢原因」）→ 有界续拉：先核
 *     会话存活（孤儿会话 alive()===false＝恢复替换／删除／remap 离场：停止，不再发 keyed 读），
 *     drain 新 Q（应用判据 Q0 的前提），再按当前 epoch 重新单飞（经既有和解链任务——在途读
 *     可复用则复用，不并发两读）；
 *   · drain 失败（续拉前新写系统型失败）＝停止：error 态、失败写保留、位保留（调用方按预
 *     flush 失败处置）；
 *   · 连续被丢达上界＝停止、位保留——写链让出，下一次命令入链时再续拉（#10a）；不无限循环。
 * - 无和解端口（reconcile 缺省——未注入 reconcile 的单会话夹具）＝位保留、零调用（既有
 *   「无端口=位保留 no-op」）。
 *
 * ── 被丢原因（'dropped' 的全部来源——续拉能化解的是「读到达时应用判据不成立」）──
 * 应用时刻 Q>0（gate 旁路注入待写——恢复载入／后台事件路径）或存在他任务在途（lineage-
 * session-loader applyKeyed）；读身份不准入（他径已发更新的 keyed 读、会话换代）；epoch 在读
 * 在途期间被推进两次以上（和解任务体自身已按当前 epoch 续读一次）；会话切离；孤儿会话；
 * 无和解端口。
 *
 * ── 上界 ── RECONCILE_TAIL_MAX_ROUNDS（和解轮数，含首次）。取值理由：每次续拉化解一次
 * 「读在途期间发生的交错」（gate 旁路注入一次待写、他径一次更新读、一次事件推进 epoch）；
 * 每轮和解任务体自身已含一次 epoch 续读（lineage-write-conflicts 两轮上限），故单次链尾
 * 至多 3×2＝6 次 keyed 读，全部串行。3＝首次＋两次续拉，覆盖首读与第一次续读在途各发生
 * 一次交错；再多视为持续交错（每次读在途都有新注入或新事件）——停止并让出写链。
 *
 * ── 接口层 ── export const RECONCILE_TAIL_MAX_ROUNDS；export function reconcileAtTail(deps)
 *
 * ── 架构层 ── 纯编排件：和解、drain、存活判据经 deps 注入（零直写 store、零 IPC）；类型只
 * 依赖写队列与和解任务的出参（type-only import——与 lineage-write-queue 无运行时环）。
 */
import type { DrainOutcome } from './lineage-write-queue'
import type { ReconcileOutcome } from './lineage-write-conflicts'

/** 链尾续拉上界（和解轮数，含首次）——取值理由见头注「上界」 */
export const RECONCILE_TAIL_MAX_ROUNDS = 3

export interface ReconcileTailDeps {
  /** 单次和解链任务（宿主=lineage-session-lane runReconcile／write-queue 的 reconcile 端口；缺省=无端口） */
  reconcile?(): Promise<ReconcileOutcome>
  /** 被丢后 drain 新 Q（应用判据 Q0 的前提） */
  drain(): Promise<DrainOutcome>
  /** 会话仍注册（恢复替换／删除／remap 离场后=false——孤儿会话停止续拉） */
  alive(): boolean
}

export interface ReconcileTailResult {
  outcome: ReconcileOutcome
  /** 续拉各轮 drain 的累计结果（null=没有续拉轮）；ok=false=末轮新写系统型失败（error 态、失败写保留） */
  followed: DrainOutcome | null
}

export async function reconcileAtTail(deps: ReconcileTailDeps): Promise<ReconcileTailResult> {
  const reconcile = deps.reconcile
  if (reconcile === undefined) return { outcome: 'dropped', followed: null } // 无和解端口：位保留、零调用
  let outcome = await reconcile()
  const drains: DrainOutcome[] = []
  for (let round = 1; outcome === 'dropped' && round < RECONCILE_TAIL_MAX_ROUNDS; round++) {
    if (!deps.alive()) break // 孤儿会话：不再发 keyed 读（其待写也不派发）
    const d = await deps.drain()
    drains.push(d)
    if (!d.ok) break // 续拉前新写系统型失败：error 态、失败写保留
    outcome = await reconcile() // 按当前 epoch 重新单飞（在途读可复用则复用）
  }
  // 续拉各轮 drain 的累计：ok 取末轮（失败即停），CONFLICT 丢弃与末次拒因消息跨轮累计
  const followed = drains.length === 0 ? null : drains.reduce<DrainOutcome | null>(mergeDrain, null)
  return { outcome, followed }
}

/** 续拉轮 drain 结果的累计（acc=null 为首轮） */
function mergeDrain(acc: DrainOutcome | null, d: DrainOutcome): DrainOutcome {
  return {
    ok: d.ok,
    conflictTouched: (acc?.conflictTouched ?? false) || d.conflictTouched,
    conflictMessage: d.conflictMessage ?? acc?.conflictMessage ?? null
  }
}
