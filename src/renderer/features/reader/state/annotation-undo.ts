// b3: P7-B
/**
 * [SR2-UNDO-01] annotation-undo —— 标注操作级 undo/redo 纯栈（[B4-A R1] 两层历史
 * （§11.1 拆件：纯操作 undo/redo 栈、id remap；API 执行外移
 * reader-history-commands.ts，本件零 api import）。
 *
 * ── 行为层（设计稿 §4.2）──
 * - 操作项形状：{id, kind:'create'|'delete'} 与 {id, kind:'comment-edit',
 *   before+after 完整项}；id 由 pushUndo 盖章（调用方只给操作载荷）。
 * - 栈 per-tab、模块级自持（Record<paperId, {past, future}>——不进 TabState），
 *   随 closeTab 清理；深度上限 HISTORY_DEPTH_MAX=10（@shared/constants 单源，
 *   双向 FIFO 截断）。
 * - 新操作提交（pushUndo）：push past + 清 redo（§2.5 #2「成功提交一个操作单元：
 *   undo≤10、redo 清」——redo 的真正销毁时点=新操作提交）。
 * - undo/redo：执行器 peek 取顶（失败不弹栈可重试）→ 经 per-tab lane 完成反向/
 *   顺向写 → 成功才 settle 移栈（按条目对象身份——await 期间入栈/截断不错弹）。
 * - **id remap**（§4.2：重建得新 id 后，undo/redo 两栈内全部同旧 id 引用做同一
 *   remap）：条目字段原地改写——对象身份不变（在途命令的 settle 仍按身份命中；
 *   被撤销/重做的条目自身也改指新 id，redo→undo 往返不落空）。
 * - **批注编辑合并会话**（§4.2：一个批注编辑会话只在操作层建立一条 comment-edit，
 *   后续 1.5s 文本单元更新它的 after）：recordCommentEdit 首写建条目并记为会话，
 *   同会话后续写只推进 after；会话随 blur/切目标/显式保存/操作层历史命令终止
 *   （endCommentEditSession）。文本反向写（undo/redo）不新建操作项，只推进该标注
 *   最近一条 comment-edit 的 after（touchCommentEditAfter）。
 * - clearRedo（显式保存 finalize——只清 redo、undo 保留）。
 *
 * ── 接口层 ──
 * - export type ReaderOperationEntry / ReaderOperationInput / OpApply
 * - pushUndo/recordCommentEdit/touchCommentEditAfter/endCommentEditSession/
 *   peekUndo/settleUndo/peekRedo/settleRedo/stackDepth/redoDepth/clearStack/
 *   clearRedo/remapAnnotationIds/toOperationInput
 * - export const OP_DEPTH_MAX（共享单源再导出——测试锚）
 *
 * ── 架构层 ──
 * - 纯栈逻辑+类型；api 调用/lane 编排/文本代际失效在 reader-history-commands.ts。
 * - 测试：tests/unit/renderer/annotation-undo.test.ts（受锁）。
 */
import type { Annotation, AnnotationInput } from '@shared/models/annotation'
import { HISTORY_DEPTH_MAX } from '@shared/constants'

/** 深度上限（共享单源再导出——本地 50 旧常量退役） */
export const OP_DEPTH_MAX = HISTORY_DEPTH_MAX

/** 三类操作项（判别联合——kind 即原操作名；comment-edit 携 before/after 完整项） */
export type ReaderOperationEntry =
  | { id: string; kind: 'create'; annotation: Annotation }
  | { id: string; kind: 'delete'; annotation: Annotation }
  | { id: string; kind: 'comment-edit'; before: Annotation; after: Annotation }

type WithoutId<T> = T extends unknown ? { [K in Exclude<keyof T, 'id'>]: T[K] } : never

/** pushUndo 入参（操作载荷——id 由栈盖章） */
export type ReaderOperationInput = WithoutId<ReaderOperationEntry>

/** undo/redo 成功后调用侧的 store 同步指令 */
export type OpApply =
  | { type: 'remove'; id: string }
  | { type: 'upsert'; annotation: Annotation }

interface OpStacks {
  past: ReaderOperationEntry[]
  future: ReaderOperationEntry[]
  /** 打开中的批注编辑合并会话条目（同会话后续文本写只推进其 after） */
  session: ReaderOperationEntry | null
}

/** per-tab 双栈（模块级自持——不进 TabState） */
const stacks: Record<string, OpStacks> = {}

/** 条目 id 序号（会话内唯一——调试归属与条目身份） */
let opSeq = 0

function stacksOf(paperId: string): OpStacks {
  return stacks[paperId] ?? (stacks[paperId] = { past: [], future: [], session: null })
}

/** undo 深度（测试与调试锚） */
export function stackDepth(paperId: string): number {
  return stacks[paperId]?.past.length ?? 0
}

/** redo 深度（测试与调试锚） */
export function redoDepth(paperId: string): number {
  return stacks[paperId]?.future.length ?? 0
}

/** 新操作提交：盖章+push past+清 redo（§2.5 #2）+FIFO 截断；返回入栈条目 */
export function pushUndo(paperId: string, input: ReaderOperationInput): ReaderOperationEntry {
  const s = stacksOf(paperId)
  const entry: ReaderOperationEntry = { id: `op-${++opSeq}`, ...input }
  s.past.push(entry)
  s.future = []
  if (s.past.length > OP_DEPTH_MAX) {
    s.past.splice(0, s.past.length - OP_DEPTH_MAX)
  }
  return entry
}

/**
 * 批注文本写成功后的操作层记账（§4.2 合并会话）：同标注会话已开→只推进 after；
 * 否则新建 comment-edit（before=本次写前的标注现值）并记为会话。
 * 返回会话条目。
 */
export function recordCommentEdit(paperId: string, before: Annotation, after: Annotation): ReaderOperationEntry {
  const s = stacksOf(paperId)
  const open = s.session
  if (open !== null && open.kind === 'comment-edit' && open.before.id === before.id) {
    open.after = after
    return open
  }
  const entry = pushUndo(paperId, { kind: 'comment-edit', before, after })
  s.session = entry
  return entry
}

/** 文本反向写（undo/redo）成功后：推进该标注最近一条 comment-edit 的 after
 *  （redo 顺写值与库一致）；不新建操作项。 */
export function touchCommentEditAfter(paperId: string, annotationId: string, after: Annotation): void {
  const s = stacks[paperId]
  if (s === undefined) return
  for (let i = s.past.length - 1; i >= 0; i--) {
    const e = s.past[i]!
    if (e.kind === 'comment-edit' && e.after.id === annotationId) {
      e.after = after
      return
    }
  }
}

/** 终止批注编辑合并会话（blur/切目标/显式保存/操作层历史命令后新输入开新条目） */
export function endCommentEditSession(paperId: string): void {
  const s = stacks[paperId]
  if (s !== undefined) s.session = null
}

/** undo 顶（不弹——失败不弹栈语义；空栈 null） */
export function peekUndo(paperId: string): ReaderOperationEntry | null {
  const s = stacks[paperId]
  if (s === undefined || s.past.length === 0) return null
  return s.past[s.past.length - 1]!
}

/** undo 成功结算：past 按身份移除 + future 头插（截断≤10） */
export function settleUndo(paperId: string, entry: ReaderOperationEntry): void {
  const s = stacks[paperId]
  if (s === undefined) return
  const idx = s.past.indexOf(entry)
  if (idx !== -1) {
    s.past.splice(idx, 1)
  }
  s.future.unshift(entry)
  if (s.future.length > OP_DEPTH_MAX) {
    s.future.length = OP_DEPTH_MAX
  }
}

/** redo 顶（不弹；空栈 null） */
export function peekRedo(paperId: string): ReaderOperationEntry | null {
  const s = stacks[paperId]
  if (s === undefined || s.future.length === 0) return null
  return s.future[0]!
}

/** redo 成功结算：future 按身份移除 + past 尾插（截断≤10） */
export function settleRedo(paperId: string, entry: ReaderOperationEntry): void {
  const s = stacks[paperId]
  if (s === undefined) return
  const idx = s.future.indexOf(entry)
  if (idx !== -1) {
    s.future.splice(idx, 1)
  }
  s.past.push(entry)
  if (s.past.length > OP_DEPTH_MAX) {
    s.past.splice(0, s.past.length - OP_DEPTH_MAX)
  }
}

/** closeTab 清理接缝（双栈与合并会话随 tab 关闭丢弃） */
export function clearStack(paperId: string): void {
  delete stacks[paperId]
}

/** 显式保存 finalize：只清 redo、undo 保留（§3 显式保存行） */
export function clearRedo(paperId: string): void {
  const s = stacks[paperId]
  if (s !== undefined) {
    s.future = []
  }
}

/** re-create 载荷：剥离 id/paperId/时间戳（repo 生成）——input 口径与
 *  annotationInputSchema 对齐（omit 同源；执行器消费） */
export function toOperationInput(a: Annotation): AnnotationInput {
  return {
    page: a.page,
    kind: a.kind,
    color: a.color,
    quoteText: a.quoteText,
    prefixText: a.prefixText,
    suffixText: a.suffixText,
    startOffset: a.startOffset,
    endOffset: a.endOffset,
    rects: a.rects,
    comment: a.comment
  }
}

/** 重建（新 id）后双栈全部旧 id 引用原地改写（create/delete/comment-edit 三类；
 *  条目对象身份不变——在途命令 settle 按身份命中，被重建条目自身亦改指新 id）。
 *  目标换 id=旧编辑目标消亡，合并会话终止。 */
export function remapAnnotationIds(paperId: string, oldId: string, newId: string): void {
  const s = stacks[paperId]
  if (s === undefined) return
  const remap = (e: ReaderOperationEntry): void => {
    if (e.kind === 'comment-edit') {
      if (e.before.id === oldId) {
        e.before = { ...e.before, id: newId }
        e.after = { ...e.after, id: newId }
      }
      return
    }
    if (e.annotation.id === oldId) {
      e.annotation = { ...e.annotation, id: newId }
    }
  }
  for (const e of s.past) remap(e)
  for (const e of s.future) remap(e)
}
