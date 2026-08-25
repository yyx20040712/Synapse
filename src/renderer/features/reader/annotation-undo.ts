// b3: P7-B
/**
 * [SR2-UNDO-01] annotation-undo —— 标注操作级撤销栈（工单：done / strong）
 *
 * ── 行为层 ──
 * - 操作级 undo（非全文 undo 树）：三类操作的逆操作
 *   | 原操作 | 逆操作（undo） |
 *   | create（SelectionLayer 保存） | delete（api.deleteAnnotation + apply remove） |
 *   | delete（菜单删除） | re-create（api.saveAnnotation——**repo.insert 不接受显式 id**
 *     （annotations.repo.ts:167 内部 randomUUID），re-create 得新 id；同 id 引用残留
 *     清点：当前无其他表/组件长期持有 annotation id，安全） |
 *   | comment-edit（AnnotationEditor 保存） | update 回旧 comment（before 全量快照） |
 * - 栈 per-tab、模块级自持（Record<paperId, entry[]>——不进 TabState，避免
 *   reader.store↔本模块循环依赖，plan 门 W2 裁决），随 closeTab 清理
 *   （reader.store.closeOne 调 clearStack(paperId)——接缝一行）；深度上限
 *   UNDO_DEPTH_MAX=50（FIFO 截断丢最旧）
 * - undo 执行：api 返回 !ok 或抛异常 → **不弹栈**（深度不变，可重试）+
 *   返回 {done:false, reason:'api-failed'}；成功 → 弹栈 + 返回 apply 指令
 *   （store 同步由调用侧 reader.store.undo() 执行，本模块不 import reader.store
 *   也不 import Toast——失败 toast 在 store 消费边界发，INV-02）
 * - **id remap**（deepseek r2 BLOCKING 修复）：delete 逆重建分配新 id 后，全栈
 *   改写该标注旧 id 引用（create/delete/comment-edit 三类条目）——否则连撤
 *   两次时第二次按旧 id 落空，重建标注永久残留
 * - **in-flight 互斥**（deepseek r2 BLOCKING 修复）：撤销进行中再触发 →
 *   {done:false, reason:'busy'}（消费方静默合并——连按 ctrl+z 等价一次撤销）
 * - 撤销会话状态机（宪法前置表——deepseek r6 W2 补）：
 *   | 态（per-paper） | pushUndo | undo 触发 | api 成功 | api !ok/异常 |
 *   | empty | →ready(1) | no-op→empty | — | — |
 *   | ready | →ready(+1；≥50 时 FIFO 头部截断) | →in-flight | →ready（按身份移除被撤条目） | →ready（栈不变，可重试） |
 *   | in-flight | →ready(+1；新条目在下标上顶替，移除按身份不受影响) | busy 拒绝 | 同上 | 同上 |
 *   跨篇：in-flight 互不阻塞（Set 互斥）；closeTab/clearStack：任意态→empty（栈随 tab 丢弃）
 * - redo 不做（用户需求只有撤销；全文 undo 依赖 textarea 原生——B1 §7-3 对策）
 * - 触发：ctrl+z 经 keymap 注册（editable 避让自动生效——textarea 内是原生
 *   undo，本栈不接管编辑场景）；栈空时 no-op（不触 api）
 *
 * ── 接口层 ──
 * - export type UndoEntry（三类逆操作载荷的判别联合）
 * - export type UndoApply = { type:'remove'; id } | { type:'upsert'; annotation }
 *   （re-create 新 id → upsert 追加；comment-edit 同 id → upsert 替换）
 * - export type UndoOutcome = { done:false; reason:'empty'|'api-failed' } |
 *   { done:true; apply: UndoApply }
 * - export function pushUndo(paperId, entry): void / undo(paperId): Promise<UndoOutcome>
 *   / clearStack(paperId): void / stackDepth(paperId): number（测试锚）/
 *   UNDO_DEPTH_MAX（常量锚）
 *
 * ── 架构层 ──
 * - 纯逻辑+api 调用收口；接缝（本工单改动面）：SelectionLayer.save 成功路径
 *   push create、AnnotationLayer.saveComment/deleteAnnotation 成功路径 push
 *   comment-edit（before=预编辑快照）/delete、ReaderShortcuts 键位表加 ctrl+z、
 *   reader.store closeOne 清理一行+undo() 动作（api 调用与 store 同步收口单点，
 *   组件不直接执行 undo）
 *
 * ── 生命周期层 ──
 * - 预留：redo（P8+）；不做：跨 tab 撤销（栈随 closeTab 丢弃）
 *
 * ── 文化层 ──
 * - 测试：tests/unit/renderer/annotation-undo.test.ts（新建，受锁）：三逆操作
 *   正确性（含 input 去 id 断言）、LIFO、深度截断、api 失败不弹栈+重试、空栈
 *   no-op、per-tab 隔离+clearStack
 */
import { api, ApiClientError } from '../../api/client'
import type { Annotation, AnnotationInput } from '@shared/models/annotation'

/** 三类逆操作载荷（判别联合——kind 即原操作名） */
export type UndoEntry =
  | { kind: 'create'; annotation: Annotation }
  | { kind: 'delete'; annotation: Annotation }
  | { kind: 'comment-edit'; before: Annotation }

/** undo 成功后调用侧的 store 同步指令 */
export type UndoApply =
  | { type: 'remove'; id: string }
  | { type: 'upsert'; annotation: Annotation }

export type UndoOutcome =
  | { done: false; reason: 'empty' | 'api-failed' | 'busy' }
  | { done: true; apply: UndoApply }

/** 深度上限（FIFO 截断丢最旧） */
export const UNDO_DEPTH_MAX = 50

/** per-tab 栈（模块级自持——不进 TabState） */
const stacks: Record<string, UndoEntry[]> = {}

/** 栈深（测试与调试锚） */
export function stackDepth(paperId: string): number {
  return stacks[paperId]?.length ?? 0
}

export function pushUndo(paperId: string, entry: UndoEntry): void {
  const s = stacks[paperId] ?? (stacks[paperId] = [])
  s.push(entry)
  if (s.length > UNDO_DEPTH_MAX) {
    s.splice(0, s.length - UNDO_DEPTH_MAX)
  }
}

/** closeTab 清理接缝（reader.store.closeOne 调用） */
export function clearStack(paperId: string): void {
  delete stacks[paperId]
}

/** re-create 载荷：剥离 id/paperId/时间戳（repo 生成）——input 口径与
 *  annotationInputSchema 对齐（omit 同源） */
function toInput(a: Annotation): AnnotationInput {
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

/** re-create 后全栈改写旧 id 引用（deepseek BLOCKING 修复：重建分配新 id，
 *  栈内更早的 create/delete/comment-edit 条目若仍引旧 id，后续按序撤销会
 *  deleteAnnotation/updateAnnotation 落空——同一标注的操作链必须整体改指新 id）。
 *  skip=正被撤销的条目（**按对象身份**跳过：await 期间同篇可能已入栈，下标
 *  会漂移；保持其对象身份稳定供成功后按身份移除——deepseek r6 B） */
function remapStackIds(s: UndoEntry[], oldId: string, newId: string, skip: UndoEntry): void {
  for (let i = 0; i < s.length; i++) {
    const e = s[i]!
    if (e === skip) continue
    if (e.kind === 'comment-edit') {
      if (e.before.id === oldId) {
        s[i] = { kind: 'comment-edit', before: { ...e.before, id: newId } }
      }
    } else if (e.annotation.id === oldId) {
      s[i] = { kind: e.kind, annotation: { ...e.annotation, id: newId } }
    }
  }
}

/** in-flight 互斥（deepseek r2 BLOCKING 修复；r4 BLOCKING 修正为 **Set**）：
 *  per-paper 互斥集合——同篇撤销进行中再触发返回 busy（消费方静默合并），
 *  他篇互不阻塞（单槽变量会被并发篇覆盖导致互斥失效，Set 各篇独立） */
const undoInFlightPapers = new Set<string>()

/** 执行栈顶逆操作：成功后精确移除正被撤销的条目并返回 apply；api 失败/异常
 *  不弹栈可重试；空栈 no-op；同篇撤销进行中 busy 拒绝 */
export async function undo(paperId: string): Promise<UndoOutcome> {
  if (undoInFlightPapers.has(paperId)) {
    return { done: false, reason: 'busy' }
  }
  const s = stacks[paperId]
  if (s === undefined || s.length === 0) {
    return { done: false, reason: 'empty' }
  }
  undoInFlightPapers.add(paperId)
  const top = s[s.length - 1]!
  let apply: UndoApply
  try {
    if (top.kind === 'create') {
      const r = await api.reader.deleteAnnotation({ annotationId: top.annotation.id })
      if (!r.ok) {
        return { done: false, reason: 'api-failed' }
      }
      apply = { type: 'remove', id: top.annotation.id }
    } else if (top.kind === 'delete') {
      const r = await api.reader.saveAnnotation({ paperId, annotation: toInput(top.annotation) })
      if (!r.ok) {
        return { done: false, reason: 'api-failed' }
      }
      // 重建得新 id：全栈改写该标注旧 id 引用（按身份跳过本条）
      remapStackIds(s, top.annotation.id, r.data.id, top)
      apply = { type: 'upsert', annotation: r.data }
    } else {
      const r = await api.reader.updateAnnotation({ annotation: top.before })
      if (!r.ok) {
        return { done: false, reason: 'api-failed' }
      }
      apply = { type: 'upsert', annotation: r.data }
    }
    // 按身份移除（非下标——await 期间同篇入栈触发 FIFO 截断会使下标左移甚至
    // 把本条挤出栈；身份不在则自然跳过；互斥保证无并发撤销写栈。deepseek r5b）
    const idx = s.indexOf(top)
    if (idx !== -1) {
      s.splice(idx, 1)
    }
    return { done: true, apply }
  } catch (e) {
    // 非 API 层异常打到控制台（编程错误不静默——deepseek NIT 处置）；结果仍按
    // 可重试失败返回（下次 dirty/undo 沿自愈）
    if (!(e instanceof ApiClientError)) {
      console.error('[annotation-undo] 撤销异常', e)
    }
    return { done: false, reason: 'api-failed' }
  } finally {
    undoInFlightPapers.delete(paperId)
  }
}
