/**
 * [B4 L1 / 设计稿 §2.5 #12-#19、§2.6 13a-13d、§5.1、§6.2、§7.2] lineage-history-unit
 * —— renderer 侧 flush-then-unit：一次 undo/redo 先 drain 再经 lineage/history-unit
 * 在 main 单事务内执行反向实体变化集（主控终裁 2）。
 *
 * ── 行为层（任务体由宿主排入每会话串行写链——同对象 history/reconcile busy 时
 *    后续请求按 #13d 排队不并发）──
 * - #13 预 drain：先 drain 普通写（悬浮笔记草稿由宿主在入链前 commit）；
 * - #14 预 flush 失败：不弹栈、不改 redo、不改 U，不执行反向写（错误可见——该失败由写队列
 *   记为 source 'save'）；
 * - #13a/#13b/#13c needsReload=1：drain 后先等和解（图在 history 前落地，#35 自身放行
 *   判据）——和解失败则 history 不执行（#13b：error 可见、可重试）；和解被丢（读到达时
 *   应用判据不成立——位保留）则链在 drain 新 Q 后按当前 epoch 有界续拉，续拉成功才执行
 *   history-unit，续拉仍未应用／续拉前新写失败则不执行、两栈不动（#13c；[回炉 W-B3·R-B7]
 *   lineage-reconcile-tail）；[B5 设计稿 §6.1] 前置与续拉和解失败的来源=发起命令的方向
 *   （history-undo／history-redo——沿 run(direction) → reconcileAtTail → reconcile(source)
 *   显式传递）：history-unit 尚未执行，两栈不动，不显示保存重试；
 * - #15-#17 unit：身份键=folderId+会话代际+unitId（回显去重）；成功才移栈
 *   （undo：undo−1/redo+1；redo 对称；截断≤10）、U 置真、editRevision+1；应用
 *   响应=只增量应用 touched 实体+按 lineageOrder 重排 nodes（不用整图替换），
 *   星标保现值（非撤销维度）；写回显再锚历史项时戳；
 * - #18 失败：两栈不动、U 不改为已定稿；IO error+toast（CONFLICT=图态偏离→
 *   needsReload 置位，下次命令入链先和解）；[B5 设计稿 §6.1] 来源=发起方向
 *   （history-undo／history-redo）——与 message 经原子 patch 同批写入，成功同清；重试入口
 *   =重按原方向命令（无保存重试——saveStatus/message/source 的成组写法=lineage-write-failure）；[回炉 W-B3·R-D1] CONFLICT 且拒因属
 *   history-unit 四种之一（HISTORY_STALE／HISTORY_PAPER_MISSING／HISTORY_FOLDER_
 *   MISSING／HISTORY_GRAPH_INVALID——lineage-history-stale 命名谓词）＝栈顶历史项
 *   过期（后进先出，其下更旧的历史都撤不到）：按历史项 id 写入过期标记
 *   staleHistory，保存错误行据此提供「丢弃这条过期历史」出口（须用户点击并确认，
 *   不静默跳过；系统失败不标记——历史项未失效、可重试）；成功移栈即清标记；
 * - IO 相位（[回炉 W-B2·R-B3] §2.4「有在途必须为 saving」）：history-unit 起步与 inflight
 *   同一写点发布 saving——预 drain 收尾留下的 clean 不跨 history 在途期（原缺陷：整个
 *   history-unit IPC 期间 clean+F=history，ioDirty 漏报、退出与课题切换不等它）；#19 分支
 *   返回前收 F=0 相位（lineage-io-phase.settledIoPhase——只落原会话的 IO，起步写入的 saving
 *   不滞留）。
 * - #19 迟到/身份不符：会话已被替换（恢复载入/切图）→只落定 IO，不写图态不弹栈。
 *   [回炉 W-B1·R-B4] 判据走脉络域唯一准入函数（lineage-writeback-admission：会话仍在 ∧
 *   folderId ∧ generation；alive 未注入=恒存活，单会话夹具）＋响应自身的 folderId/unitId。
 *
 * ── 接口层 ──
 * - export function createHistoryUnit(deps): { run(direction): Promise<boolean> }
 *   （布尔=完整动作成功，非 Promise 兑现——§10.4 LineageHistoryCommands）
 *
 * ── 架构层 ──
 * - 编排件：drain/reconcile/IPC 经 deps 注入（store 装配位）；零直写 store。
 */
import { ApiClientError } from '../../api/client'
import { showToast } from '../../shared/ui/toast-store'
import { lineageOrder } from '@shared/models/lineage'
import type { FloatingNote, LineageEdge, LineageNode } from '@shared/models/lineage'
import type {
  LineageHistoryDirection,
  LineageHistoryUnitReq,
  LineageHistoryUnitRes
} from '@shared/ipc/lineage-history.schemas'
import type { WriteAction } from '@shared/recovery/schemas'
import { markRecoveryClean } from './recoveryScheduler'
import { admitWriteback, targetOf, type SessionStamp } from './lineage-writeback-admission'
import { settledIoPhase } from './lineage-io-phase'
import { reanchorHistory, type EntityEcho } from './lineage-history-commands'
import { historyConflictReason, type LineageStaleHistory } from './lineage-history-stale'
import { historyWriteErrorSource, writeFailure, writeFailureCleared, type LineageWriteErrorSource } from './lineage-write-failure'
import {
  LINEAGE_HISTORY_DEPTH_MAX,
  type LineageHistoryEntry,
  type LineageInflight
} from './lineage-session-model'
import type { DrainOutcome } from './lineage-write-queue'
import type { ReconcileOutcome } from './lineage-write-conflicts'
import { reconcileAtTail } from './lineage-reconcile-tail'

export interface HistoryUnitHost {
  nodes: LineageNode[]
  edges: LineageEdge[]
  floatingNotes: FloatingNote[]
  lineTypeNames: string[]
  folderId: string
  queue: WriteAction[]
  needsReload: boolean
  saveStatus: 'clean' | 'dirty' | 'saving' | 'error'
  lastWriteError: string | null
  /** [B5 §6.1] 最近一次失败的来源（与 lastWriteError 同批写入或清除——本件恒发起方向／null） */
  lastWriteErrorSource: LineageWriteErrorSource
  inflight: LineageInflight | null
  undoStack: LineageHistoryEntry[]
  redoStack: LineageHistoryEntry[]
  /** [回炉 W-B3·R-D1] 过期历史标记（拒绝分支写入；成功移栈清） */
  staleHistory: LineageStaleHistory | null
  unfinalized: boolean
  editRevision: number
}

export interface HistoryUnitDeps {
  get(): HistoryUnitHost
  set(patch: Partial<HistoryUnitHost> | ((s: HistoryUnitHost) => Partial<HistoryUnitHost>)): void
  /** 会话代际（恢复载入/切图/弃会话递增——迟到响应身份键之一） */
  sessionGeneration(): number
  /** [B4 L2 §2.5 #19] 会话仍注册（恢复替换/删除后=false——本链已成孤儿：迟到回显
   *  不写新会话、命令结果记失败；缺省=恒存活，单会话夹具） */
  alive?(): boolean
  drain(): Promise<DrainOutcome>
  /** [B5 §6.1] 前置／续拉和解：source=发起命令的失败来源（和解失败按它记——history 方向，不写 'save'） */
  reconcile(source: Exclude<LineageWriteErrorSource, null>): Promise<ReconcileOutcome>
  historyUnit(req: LineageHistoryUnitReq): Promise<LineageHistoryUnitRes>
}

export interface HistoryUnit {
  /** 完整动作成功=true；no-op/失败/迟到=false */
  run(direction: LineageHistoryDirection): Promise<boolean>
}

const topOf = (s: HistoryUnitHost, direction: LineageHistoryDirection): LineageHistoryEntry | undefined =>
  direction === 'undo' ? s.undoStack[s.undoStack.length - 1] : s.redoStack[s.redoStack.length - 1]

/** touched=entry.changes 内全部该类 id（含被移除者——响应不含已删行） */
function touchedIds(entry: LineageHistoryEntry, kind: 'node' | 'edge' | 'floating-note'): Set<string> {
  return new Set(entry.changes.flatMap((d) => (d.kind === kind ? [d.id] : [])))
}

/** 增量合并：touched 行以服务器行为准（在场原位替换、缺席追加、被移除者剔除） */
function mergeById<T extends { id: string }>(existing: T[], touched: Set<string>, incoming: T[]): T[] {
  const byId = new Map(incoming.map((x) => [x.id, x]))
  const kept = existing.flatMap((x) => {
    if (!touched.has(x.id)) return [x]
    const next = byId.get(x.id)
    if (next === undefined) return [] // 已删除（目标态 null）
    byId.delete(x.id)
    return [next]
  })
  return [...kept, ...byId.values()]
}

export function createHistoryUnit(deps: HistoryUnitDeps): HistoryUnit {
  const { get, set } = deps
  /** 星标现值记忆（星标=非撤销维度——派生键不入 delta；[回炉 r2-R16] 被 undo 移出
   *  图的节点经 redo 回归时取其离场前现值；图内在场节点每次应用前按现网刷新） */
  const starSeen = new Map<string, boolean | undefined>()
  const rememberStars = (nodes: LineageNode[]): void => {
    for (const n of nodes) {
      if (n.isStarred !== undefined) starSeen.set(n.id, n.isStarred)
      else starSeen.delete(n.id)
    }
  }

  /** #16/#17 成功：应用回显+移栈+U 置真（不用整图替换现图） */
  const applyResponse = (res: LineageHistoryUnitRes, entry: LineageHistoryEntry, direction: LineageHistoryDirection): void => {
    set((s) => {
      rememberStars(s.nodes)
      const nodes = res.nodes.map((n) => (starSeen.has(n.id) ? { ...n, isStarred: starSeen.get(n.id) } : n))
      const popped = direction === 'undo' ? s.undoStack[s.undoStack.length - 1] : s.redoStack[s.redoStack.length - 1]
      const moved: LineageHistoryEntry[] = popped === undefined ? [] : [popped]
      let stacks =
        direction === 'undo'
          ? { undoStack: s.undoStack.slice(0, -1), redoStack: [...s.redoStack, ...moved] }
          : { undoStack: [...s.undoStack, ...moved], redoStack: s.redoStack.slice(0, -1) }
      stacks = {
        undoStack: stacks.undoStack.slice(-LINEAGE_HISTORY_DEPTH_MAX),
        redoStack: stacks.redoStack.slice(-LINEAGE_HISTORY_DEPTH_MAX)
      }
      const echoes: EntityEcho[] = [
        ...res.nodes.map((n): EntityEcho => ({ kind: 'node', id: n.id, server: n })),
        ...res.edges.map((e): EntityEcho => ({ kind: 'edge', id: e.id, server: e })),
        ...res.floatingNotes.map((n): EntityEcho => ({ kind: 'floating-note', id: n.id, server: n }))
      ]
      if (entry.changes.some((d) => d.kind === 'line-type-names')) {
        echoes.push({ kind: 'line-type-names', names: res.lineTypeNames })
      }
      for (const e of echoes) stacks = reanchorHistory(stacks, e)
      return {
        nodes: lineageOrder(mergeById(s.nodes, touchedIds(entry, 'node'), nodes)),
        edges: mergeById(s.edges, touchedIds(entry, 'edge'), res.edges),
        floatingNotes: mergeById(s.floatingNotes, touchedIds(entry, 'floating-note'), res.floatingNotes),
        ...(entry.changes.some((d) => d.kind === 'line-type-names') ? { lineTypeNames: [...res.lineTypeNames] } : {}),
        ...stacks,
        staleHistory: null, // [回炉 W-B3·R-D1] 成功移栈：原标记项必不再位于其方向栈顶（同向被弹／异向被压）——清标记
        unfinalized: true,
        editRevision: s.editRevision + 1,
        // history 已落库：F=0 相位 clean（链 finally 清 F——同会话 saving 锁保证 Q0）；[B5 §6.1] message 与 source 同清
        ...writeFailureCleared()
      }
    })
    markRecoveryClean('clean', res.folderId) // history 已落库且 IO clean（Q0——同会话 saving 锁保证）
  }

  const run = async (direction: LineageHistoryDirection): Promise<boolean> => {
    const entry = topOf(get(), direction)
    if (entry === undefined) return false // #12 栈空=no-op
    const generation = deps.sessionGeneration()
    const folderId = get().folderId
    const stamp: SessionStamp = { folderId, generation }
    /** 身份键准入：发起时的 folderId＋generation 对回写时刻的会话现态（HistoryUnitHost 无 loadSeq/epoch 面——不校验） */
    const stale = (): boolean =>
      !admitWriteback(
        targetOf(
          { folderId: get().folderId, sessionGeneration: deps.sessionGeneration(), loadSeq: 0, invalidationEpoch: 0 },
          deps.alive?.() ?? true
        ),
        stamp
      )
    const drained = await deps.drain() // #13 预 drain
    if (!drained.ok) return false // #14 预 flush 失败：不弹栈不反向写
    if (get().needsReload) {
      // #13a-#13c 先等和解；[回炉 W-B3·R-B7] 和解被丢→链在 drain 新 Q 后按当前 epoch 有界续拉——续拉成功才执行
      // history-unit；续拉仍未应用（或续拉前新写失败——#14 同型）＝不执行（不在未和解的图上执行反向写）
      // [B5 §6.1] 和解失败按发起方向记来源（初次前置与有界续拉同一来源）
      const tail = await reconcileAtTail({
        reconcile: () => deps.reconcile(historyWriteErrorSource(direction)),
        drain: deps.drain,
        alive: () => deps.alive?.() ?? true
      })
      if (tail.outcome !== 'applied') return false
    }
    if (stale() || topOf(get(), direction)?.id !== entry.id) return false // 会话已替换/栈顶已变
    const unitId = entry.id
    // #15 saving/F=history——与 inflight 同一写点发布 saving（[回炉 W-B2·R-B3] §2.4「有在途必须为 saving」）
    set({ inflight: { kind: 'history', unitId, direction }, saveStatus: 'saving' })
    try {
      const res = await deps.historyUnit({ folderId, unitId, direction, changes: entry.changes })
      if (stale() || res.folderId !== folderId || res.unitId !== unitId) {
        // #19 身份不符：只落定原会话的 IO——起步写入的 saving 随链清 F 后不得滞留（§2.4「无在途不得停留在 saving」）
        set((s) => ({ saveStatus: settledIoPhase(s) }))
        return false
      }
      applyResponse(res, entry, direction)
      return true
    } catch (e) {
      // #18 失败：两栈不动、U 不改为已定稿
      const message = e instanceof Error ? e.message : String(e)
      const conflict = e instanceof ApiClientError && e.code === 'CONFLICT' ? e : null
      // [回炉 W-B3·R-D1] history-unit 以 CONFLICT 拒绝（四种拒因）＝栈顶历史项过期：按历史项 id 写入过期标记
      // （错误行出口据此提供丢弃；须用户点击并确认）。系统失败不标记——历史项未失效、可重试
      const reason = conflict !== null ? historyConflictReason(conflict.reason) : null
      set({
        ...writeFailure(message, historyWriteErrorSource(direction)), // [B5 §6.1] 来源=发起方向（与 message 同批）
        ...(conflict !== null ? { needsReload: true } : {}),
        ...(reason !== null ? { staleHistory: { direction, entryId: entry.id, reason, message } } : {})
      })
      showToast(message, 'error')
      return false
    }
  }

  return { run }
}
