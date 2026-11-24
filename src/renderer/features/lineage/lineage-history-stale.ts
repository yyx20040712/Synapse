/**
 * [回炉 W-B3·R-D1 / 用户裁决 D-1＝甲、适用面补充裁决＝乙（处置单 §1）；设计稿 §2.5 #18 的补充行]
 * lineage-history-stale —— 过期历史项：拒因集合、标记类型、适用性判据与丢弃（纯函数）。
 *
 * 背景：history-unit 写前核对实体当前状态与预期端态的语义指纹，不符即以 CONFLICT 拒绝、两栈不动。
 * 撤销是后进先出——栈顶历史项被拒后其下更旧的历史都撤不到；原实现没有任何路径丢弃该过期项，
 * 唯一出口是重启应用。
 *
 * ── 行为层 ──
 * - 拒因集合 HISTORY_UNIT_CONFLICT_REASONS：history-unit 以 CONFLICT 拒绝的四种拒因（AppError.reason
 *   受控串；[用户裁决 R12 / 回炉 W-D2c] 单源＝src/shared/ipc/lineage-history.schemas，本件再导出；
 *   发射点＝main lineage-history-unit.service 的 REASON 表——按该集合类型约束）。四种拒因都使
 *   栈顶历史项永久不可达：实体被别的路径改过、恢复目标的文献或文件夹已删、最终图结构或归属
 *   守卫拒绝（「文献移出该图」把文献移回也不解卡）。
 * - historyConflictReason(reason)：命名谓词——CONFLICT 的 reason 属上述集合才返回该拒因，否则 null。
 *   系统失败与非 history-unit 的 CONFLICT 不给出口：那类失败可重试，历史项未失效。
 * - 标记 LineageStaleHistory＝{ direction, entryId, reason, message }：按历史项 id 记「哪个方向的
 *   栈顶项被哪次拒绝判定过期」；message＝main 返回的具体拒因消息（确认框原文显示）。标记只描述
 *   一个方向的一个历史项——另一方向栈不受它影响；两个方向栈顶先后过期时只留最近一次（另一
 *   方向重试即重新标记）。
 * - staleHistoryAtTop(view)：适用性判据——标记非空 ∧ 标记项仍是其方向栈的栈顶项（按 id 相等）。
 *   标记项不再位于栈顶（新编辑入栈、异向移栈压住、显式保存清 redo）＝标记失效：出口不出现、
 *   丢弃不适用。读点（错误行出口）与写点（丢弃）共用本判据——不依赖各栈写点逐一清标记。
 * - dropStaleHistory(view)：丢弃——只移除该方向栈的栈顶项并清标记；项已不在栈顶＝null（调用方
 *   零副作用）。纯内存操作，不产生任何写动作；不自动执行更旧项（丢弃≠撤销）。
 *
 * ── 接口层 ── export const HISTORY_UNIT_CONFLICT_REASONS；类型 LineageHistoryConflictReason／
 * LineageStaleHistory／StaleHistoryView；export function historyConflictReason／staleHistoryAtTop／
 * dropStaleHistory
 *
 * ── 架构层 ── 纯函数件：依赖 shared 历史方向类型与拒因集合单源（R12 后含一个值 import）＋本域模型类型。
 */
import {
  HISTORY_UNIT_CONFLICT_REASONS,
  type LineageHistoryConflictReason,
  type LineageHistoryDirection
} from '@shared/ipc/lineage-history.schemas'
import type { LineageHistoryEntry } from './lineage-session-model'

/** history-unit 以 CONFLICT 拒绝的四种拒因（AppError.reason 受控串）——出口的适用面（用户补充裁决乙）。
 *  [用户裁决 R12 / 回炉 W-D2c] 单源＝src/shared/ipc/lineage-history.schemas（main 的 REASON 表按同
 *  一集合类型约束）；本处再导出保既有导入面 */
export { HISTORY_UNIT_CONFLICT_REASONS }
export type { LineageHistoryConflictReason }

/** 过期历史标记（会话字段 staleHistory；按历史项 id） */
export interface LineageStaleHistory {
  /** 被拒的方向：标记项是该方向栈的栈顶项 */
  direction: LineageHistoryDirection
  /** 过期历史项的 id（＝history-unit 请求的 unitId） */
  entryId: string
  reason: LineageHistoryConflictReason
  /** main 返回的具体拒因消息（确认框原文显示） */
  message: string
}

/** 适用性判据的输入（会话面或测试夹具的结构子集） */
export interface StaleHistoryView {
  undoStack: readonly LineageHistoryEntry[]
  redoStack: readonly LineageHistoryEntry[]
  staleHistory: LineageStaleHistory | null | undefined
}

/** 命名谓词：CONFLICT 的 reason 是否 history-unit 的四种拒因之一 */
export function historyConflictReason(reason: string | undefined): LineageHistoryConflictReason | null {
  return reason !== undefined && (HISTORY_UNIT_CONFLICT_REASONS as readonly string[]).includes(reason)
    ? (reason as LineageHistoryConflictReason)
    : null
}

/** 标记项仍位于其方向栈顶＝返回该过期标记；否则 null（无标记，或标记项已不在栈顶） */
export function staleHistoryAtTop(view: StaleHistoryView): LineageStaleHistory | null {
  const mark = view.staleHistory
  if (mark === null || mark === undefined) return null
  const stack = mark.direction === 'undo' ? view.undoStack : view.redoStack
  return stack[stack.length - 1]?.id === mark.entryId ? mark : null
}

export interface StaleHistoryDropped {
  undoStack: LineageHistoryEntry[]
  redoStack: LineageHistoryEntry[]
  staleHistory: null
}

/** 丢弃过期历史项：只移除其方向栈的栈顶项并清标记；项已不在栈顶＝null（动作不适用） */
export function dropStaleHistory(view: StaleHistoryView): StaleHistoryDropped | null {
  const mark = staleHistoryAtTop(view)
  if (mark === null) return null
  if (mark.direction === 'undo') return { undoStack: view.undoStack.slice(0, -1), redoStack: [...view.redoStack], staleHistory: null }
  return { undoStack: [...view.undoStack], redoStack: view.redoStack.slice(0, -1), staleHistory: null }
}
