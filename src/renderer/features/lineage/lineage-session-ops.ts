// b3: P7-H
/**
 * [B4 L1 / 设计稿 §5.2/§2.5 #3/#4] lineage-session-ops —— 同步编辑单元 recorder
 * （自「快照撤销/重做域件」改写：SessionSnapshot 整体退役——历史项=受影响实体
 * 的可逆命令对，changes=lineage-history-commands 单源构造）。
 * [F-VISFB-61 拆件] 自 lineage.store 拆出 2026-10-17——store 493 行险位〔v210 §5 挂账「下次触及
 * 先拆件」〕；先例=AnnotationPopups 拆 annotation-popups-actions。
 *
 * ── 行为层（同步单元边界 beginUnit→登记→enqueue…→commitUnit）──
 * - runUnit(command, body)：进入即捕获回滚基线（图态四面+queue 引用）；body 内
 *   经 EditUnit 登记受影响实体（登记时点读 before——须先于该实体的乐观应用）
 *   并 enqueue 动作；body 返回=提交：
 *   · changes 由登记项+现值构造（语义 no-op/退化项剔除）；零变化=不入栈、
 *     不清 redo（no-op 不是编辑单元——RR13「误走 beginUnit 必清 redo」对称锚）；
 *   · 有变化=历史项入 undo 栈（一单元=一撤销步——与 mockup §2.2 编辑单元定义同构；
 *     深度 LINEAGE_HISTORY_DEPTH_MAX=10，超深丢最旧）
 *     +redo 栈清+unfinalized 置真+editRevision+1（U 轴单写点之一——§2.5 #3）
 *     +过期历史标记清（[用户裁决 R11；回炉 W-D2a]：新单元必然让标记项离开其方向栈
 *     顶——undo 方向被新单元压住、redo 方向随 redo 清空——标记失效，入栈时显式置空；
 *     语义 no-op 不入栈，标记不动）。
 * - body 抛错=回滚本单元：图态四面与 queue 还原到进入前引用后上抛——不留半项、
 *   零半成品历史（§2.5 #4）。
 * - gate（quit/recovery/conflict 冻结、同会话 saving 编辑锁）不在本件：由宿主
 *   在调用前判定（本件只管单元边界）。
 *
 * ── 接口层 ──
 * - export function createSessionRecorder(deps): { runUnit(command, body) }
 * - export interface EditUnit（watchNode/watchEdge/watchNote/watchLineTypeNames）
 *
 * ── 架构层 ──
 * - set/get 结构注入（宿主=满足 RecorderHost 的 zustand store 状态面）。
 */
import type { LineageEditCommandKind } from '@shared/ipc/lineage-history.schemas'
import type { FloatingNote, LineageEdge, LineageNode } from '@shared/models/lineage'
import type { WriteAction } from '@shared/recovery/schemas'
import {
  buildChanges,
  historyEntryOf,
  pushHistory,
  type HistoryEntity,
  type WatchSpec,
  type WatchedEntity
} from './lineage-history-commands'
import type { LineageHistoryEntry } from './lineage-session-model'
import type { LineageStaleHistory } from './lineage-history-stale'

/** 编辑单元内的登记面（须在该实体的乐观应用前调用） */
export interface EditUnit {
  watchNode(id: string): void
  watchEdge(id: string): void
  watchNote(id: string): void
  watchLineTypeNames(): void
}

export interface RecorderHost {
  nodes: LineageNode[]
  edges: LineageEdge[]
  floatingNotes: FloatingNote[]
  lineTypeNames: string[]
  queue: WriteAction[]
  folderId: string
  undoStack: LineageHistoryEntry[]
  redoStack: LineageHistoryEntry[]
  unfinalized: boolean
  editRevision: number
  /** 过期历史标记（会话面有该字段；不含历史出口的宿主夹具可缺省） */
  staleHistory?: LineageStaleHistory | null
}

export interface SessionRecorderDeps {
  get(): RecorderHost
  set(patch: Partial<RecorderHost>): void
}

export interface SessionRecorder {
  /** 同步编辑单元边界（见头注行为层）；gate 由调用方先行判定 */
  runUnit(command: LineageEditCommandKind, body: (unit: EditUnit) => void): void
}

function readOf(s: RecorderHost, spec: WatchSpec): HistoryEntity | string[] | undefined {
  if (spec.kind === 'line-type-names') return s.lineTypeNames
  if (spec.kind === 'node') return s.nodes.find((n) => n.id === spec.id)
  if (spec.kind === 'edge') return s.edges.find((e) => e.id === spec.id)
  return s.floatingNotes.find((n) => n.id === spec.id)
}

export function createSessionRecorder(deps: SessionRecorderDeps): SessionRecorder {
  const runUnit = (command: LineageEditCommandKind, body: (unit: EditUnit) => void): void => {
    const s = deps.get()
    const baseline = {
      nodes: s.nodes,
      edges: s.edges,
      floatingNotes: s.floatingNotes,
      lineTypeNames: s.lineTypeNames,
      queue: s.queue
    }
    const watched: WatchedEntity[] = []
    const watch = (spec: WatchSpec): void => {
      watched.push({ spec, before: readOf(deps.get(), spec) ?? null })
    }
    const unit: EditUnit = {
      watchNode: (id) => watch({ kind: 'node', id }),
      watchEdge: (id) => watch({ kind: 'edge', id }),
      watchNote: (id) => watch({ kind: 'floating-note', id }),
      watchLineTypeNames: () => watch({ kind: 'line-type-names' })
    }
    try {
      body(unit)
    } catch (e) {
      deps.set(baseline) // 回滚本单元：图态+queue 还原（不留半项）
      throw e
    }
    const changes = buildChanges(watched, (spec) => readOf(deps.get(), spec))
    if (changes.length === 0) return // 语义 no-op：不入栈不清 redo
    const after = deps.get()
    deps.set({
      undoStack: pushHistory(after.undoStack, historyEntryOf(after.folderId, command, changes)),
      redoStack: [],
      unfinalized: true,
      editRevision: after.editRevision + 1,
      staleHistory: null // [用户裁决 R11；回炉 W-D2a] 新单元入栈清过期历史标记（见头注）
    })
  }
  return { runUnit }
}
