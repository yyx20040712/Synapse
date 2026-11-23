/**
 * [B4-A R1 §3/§4.1/§11.1] reader-text-history —— 文本值历史注册表（target 级 before/after 值域单源；批注 comment 与总评 contentMd 共用）。
 *
 * ── 行为层 ──
 * - target 身份：{paperId,kind:'annotation-comment',annotationId} 与
 *   {paperId,kind:'paper-note'}（§3）；模块级 Map 跨视图驻留（不随组件卸载焚毁）。
 * - 栈语义：past 存各单元 before 值、future 存被撤单元 after 值，每项带单元身份
 *   id；单元提交恰 push 一个 past 项并清一次 future（真正销毁 redo 的时点=新单元
 *   提交）。undo/redo=peek→反向写成功→settle（失败两栈不动）。
 * - [B4-A R2 审查 5] settle 按条目身份结算（§4.3 链序：history 写 → 后续单元
 *   提交）：history 在途窗内闭合的单元由控制器延后，随 settle 在移栈之后入栈——
 *   首个延后单元 before 重基为反向写已落库值，入栈即清 future（§2.5 #16b/#17b）。
 * - 深度：每 target past/future 各 ≤ HISTORY_DEPTH_MAX（@shared/constants 单源）；
 *   显式保存只清 redo（§3）；关 tab 该篇全部 target 出表。
 * - 操作层代际（generation）：操作层 undo/redo 恢复 annotation 后递增并清旧
 *   past/future（§3 操作层行）；挂载控制器经订阅获知并丢弃在途打开单元。
 * - 读接口（peek/canUndo/canRedo/generation）不创建条目。
 *
 * ── 接口层 ──
 * - 类型 TextTargetKey/TextUndoEntry/TextRedoEntry；函数=各导出
 *   （push/peek/settle/canUndo/canRedo/清账三函数/bumpTextGeneration/
 *   textGeneration/subscribeTextTarget/textTargetSize）
 *
 * ── 架构层 ──
 * - 纯逻辑；无 React/window.api 依赖。订阅通知由挂载控制器消费，本件不持组件态。
 */
import { HISTORY_DEPTH_MAX } from '@shared/constants'

/** 批注 comment 与总评 contentMd 共用 target 身份（§3） */
export type TextTargetKey =
  | { paperId: string; kind: 'annotation-comment'; annotationId: string }
  | { paperId: string; kind: 'paper-note' }

/** target 稳定键（注册表键——含 paperId，供关 tab/定稿按篇清账） */
export function textTargetId(key: TextTargetKey): string {
  return key.kind === 'annotation-comment'
    ? `anno:${key.paperId}:${key.annotationId}`
    : `note:${key.paperId}`
}

/** 双栈深度上限（共享单源再导出——测试锚禁本地字面量副本） */
export const TEXT_HISTORY_DEPTH_MAX = HISTORY_DEPTH_MAX

/** past 项=单元 before 值（undo 目标值）；future 项=被撤单元 after 值（redo 目标值）；id=单元身份（命令 peek 持有到回执） */
export interface TextUndoEntry {
  id: number
  before: string
}

export interface TextRedoEntry {
  id: number
  after: string
}

/** 单元身份序号（注册表内单调——同 target 代际失效后不复用） */
let unitSeq = 0

/** 文本值历史栈（past/future 双向 FIFO 截断） */
class TextStack {
  private past: TextUndoEntry[] = []
  private future: TextRedoEntry[] = []

  constructor(private readonly maxDepth: number = HISTORY_DEPTH_MAX) {}

  private truncatePast(): void {
    if (this.past.length > this.maxDepth) {
      this.past.splice(0, this.past.length - this.maxDepth)
    }
  }

  /** 单元提交：push before、清 future（截断丢最旧） */
  pushValue(before: string): void {
    this.past.push({ id: ++unitSeq, before })
    this.future = []
    this.truncatePast()
  }
  canUndo(): boolean {
    return this.past.length > 0
  }
  canRedo(): boolean {
    return this.future.length > 0
  }

  /** undo 目标项（past 顶；栈空 null 不动栈） */
  peekUndo(): TextUndoEntry | null {
    return this.past.length > 0 ? this.past[this.past.length - 1]! : null
  }

  /** undo 结算：条目按 id 出 past、current 进 future 头；其后入栈的在途窗内闭合
   *  单元（before 值，时序）。条目缺席（栈已被代际/定稿清理）不移栈，延后单元仍重基后入栈 */
  settleUndo(entry: TextUndoEntry, current: string, pending: string[]): void {
    const idx = this.past.findIndex((e) => e.id === entry.id)
    if (idx !== -1) {
      this.past.splice(idx, 1)
      this.future = [{ id: entry.id, after: current }, ...this.future].slice(0, this.maxDepth)
    }
    this.pushPending(pending, entry.before)
  }

  /** redo 目标项（future 头；栈空 null 不动栈） */
  peekRedo(): TextRedoEntry | null {
    return this.future.length > 0 ? this.future[0]! : null
  }

  /** redo 结算（条目按 id 出 future、current 进 past 尾；延后单元同 undo） */
  settleRedo(entry: TextRedoEntry, current: string, pending: string[]): void {
    const idx = this.future.findIndex((e) => e.id === entry.id)
    if (idx !== -1) {
      this.future.splice(idx, 1)
      this.past.push({ id: entry.id, before: current })
    }
    this.pushPending(pending, entry.after)
  }
  /** 在途窗内闭合的单元入栈：首单元 before 改指反向写已落库值，其后按序；清 redo */
  private pushPending(pending: string[], baseline: string): void {
    if (pending.length === 0) return
    pending.forEach((before, i) => this.past.push({ id: ++unitSeq, before: i === 0 ? baseline : before }))
    this.future = []
    this.truncatePast()
  }

  clear(): void {
    this.past = []
    this.future = []
  }

  /** 只清 redo（future）——显式保存 finalize 语义（undo 保留） */
  clearRedo(): void {
    this.future = []
  }
}

/** 注册表变更通知：generation 变化=操作层恢复旧文（value=恢复后的已落库值） */
export interface TextTargetEvent {
  generation: number
  value?: string
}

interface TargetEntry {
  stack: TextStack
  generation: number
  listeners: Set<(e: TextTargetEvent) => void>
}

/** 注册表（模块级——跨视图驻留） */
const targets = new Map<string, TargetEntry>()

function entryOf(key: TextTargetKey): TargetEntry {
  const id = textTargetId(key)
  let e = targets.get(id)
  if (e === undefined) {
    e = { stack: new TextStack(HISTORY_DEPTH_MAX), generation: 0, listeners: new Set() }
    targets.set(id, e)
  }
  return e
}

type TextTargetEntryPair = [string, TargetEntry]

/** 该篇全部 target 条目快照：总评键=note:<paperId>、批注键=anno:<paperId>:<annotationId> */
function tabEntries(paperId: string): TextTargetEntryPair[] {
  const out: TextTargetEntryPair[] = []
  const noteId = `note:${paperId}`
  const annoPrefix = `anno:${paperId}:`
  for (const [id, e] of targets) {
    if (id === noteId || id.startsWith(annoPrefix)) out.push([id, e])
  }
  return out
}

function notify(e: TargetEntry, event: TextTargetEvent): void {
  for (const listener of [...e.listeners]) listener(event)
}

/** 单元提交：恰 push 一个 past 项、清一次 future */
export function pushTextCommit(key: TextTargetKey, before: string): void {
  const e = entryOf(key)
  e.stack.pushValue(before)
  notify(e, { generation: e.generation })
}

/** undo 目标项（past 顶；栈空 null） */
export function peekTextUndo(key: TextTargetKey): TextUndoEntry | null {
  return targets.get(textTargetId(key))?.stack.peekUndo() ?? null
}

/** undo 结算（按条目身份）：current=命令起步时该单元的已提交值；pending=在途窗
 *  内闭合单元的 before 值（时序）。target 历史已被清（tab 已关）则零动作 */
export function settleTextUndo(key: TextTargetKey, entry: TextUndoEntry, current: string, pending: string[]): void {
  const e = targets.get(textTargetId(key))
  if (e === undefined) return
  e.stack.settleUndo(entry, current, pending)
  notify(e, { generation: e.generation })
}

/** redo 目标项（future 头；栈空 null） */
export function peekTextRedo(key: TextTargetKey): TextRedoEntry | null {
  return targets.get(textTargetId(key))?.stack.peekRedo() ?? null
}

/** redo 结算（按条目身份——current 进 past；pending 同 undo） */
export function settleTextRedo(key: TextTargetKey, entry: TextRedoEntry, current: string, pending: string[]): void {
  const e = targets.get(textTargetId(key))
  if (e === undefined) return
  e.stack.settleRedo(entry, current, pending)
  notify(e, { generation: e.generation })
}

/** 延后单元照常入栈（history 命令未执行/失败路径——原 before 值）；target 历史已清则丢弃 */
export function pushTextCommits(key: TextTargetKey, befores: string[]): void {
  const e = targets.get(textTargetId(key))
  if (e === undefined || befores.length === 0) return
  for (const before of befores) e.stack.pushValue(before)
  notify(e, { generation: e.generation })
}

export function canUndoText(key: TextTargetKey): boolean {
  return targets.get(textTargetId(key))?.stack.canUndo() ?? false
}
export function canRedoText(key: TextTargetKey): boolean {
  return targets.get(textTargetId(key))?.stack.canRedo() ?? false
}

/** 显式保存（tab 面）：清该篇全部 target 的文本 redo、undo 保留 */
export function clearTabTextRedo(paperId: string): void {
  for (const [, e] of tabEntries(paperId)) {
    e.stack.clearRedo()
    notify(e, { generation: e.generation })
  }
}

/** 关 tab 清理：该篇全部 target 的文本历史出表（含已删批注残留 target） */
export function clearTabTextHistory(paperId: string): void {
  for (const [id] of tabEntries(paperId)) {
    const e = targets.get(id)
    targets.delete(id)
    if (e !== undefined) notify(e, { generation: e.generation })
  }
}

/** 全清（closeAll 语义） */
export function clearAllTextHistory(): void {
  const all = [...targets.values()]
  targets.clear()
  for (const e of all) notify(e, { generation: e.generation })
}

/** 操作层代际失效：generation++ 并清旧文本 past/future（§3 操作层行）。value=
 *  操作层恢复后的已落库值（comment-edit 恢复旧文时给出；create/delete 不给值） */
export function bumpTextGeneration(key: TextTargetKey, value?: string): void {
  // 无条目=该 target 无历史无挂载控制器，无可失效面（不创建条目）
  const e = targets.get(textTargetId(key))
  if (e === undefined) return
  e.generation += 1
  e.stack.clear()
  notify(e, { generation: e.generation, value })
}

/** 当前代际（只读——无条目=0） */
export function textGeneration(key: TextTargetKey): number {
  return targets.get(textTargetId(key))?.generation ?? 0
}
/** 订阅 target 变更（提交/结算/清账/代际）；返回退订函数 */
export function subscribeTextTarget(key: TextTargetKey, listener: (e: TextTargetEvent) => void): () => void {
  const id = textTargetId(key)
  const e = entryOf(key)
  e.listeners.add(listener)
  return () => {
    e.listeners.delete(listener)
    // 末位订阅者退订且无历史：条目出表（打开过编辑器但从未提交的 target 不驻留）
    if (e.listeners.size === 0 && !e.stack.canUndo() && !e.stack.canRedo() && targets.get(id) === e) {
      targets.delete(id)
    }
  }
}

/** 注册表条目数（测试锚——关 tab 清理/条目不泄漏断言） */
export function textTargetSize(): number {
  return targets.size
}
