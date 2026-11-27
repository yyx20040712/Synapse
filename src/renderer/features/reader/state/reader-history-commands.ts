/**
 * [B4-A R1 §11.1/§4.2/§4.3] reader-history-commands —— 操作层 undo/redo 执行器
 * （API 执行自 annotation-undo 外迁驻本件；§11.1 预算 ≤340）。
 *
 * ── 行为层（§2.5 #12-#19、§4.2/§4.3）──
 * - 请求序：同 tab 请求排队不并发（#13d——在途期间的新 undo/redo 请求排在其后
 *   逐个执行；不按下标误弹栈）。每步=closing gate → 复合链任务（§4.3 链序；与
 *   autosave/删除互斥；history 在途输入合法，后续任务由写链接管）→ 成功才 settle
 *   移栈+文本 target 代际失效；失败两栈不动（#18）。
 * - [B4-A 回炉三 A] 复合链任务——命令起步即入链占位（与文本层 R5 同构；「history
 *   请求前的 drain」由链位承载，不再 await laneDrain 后才入链——否则等待窗内入链的
 *   同标注新写抢占链位、先落库后被反向写覆盖）。任务体内：①预 flush——命令起步时
 *   经注册表取本 tab 挂载控制器（批注编辑器+总评面板）的裸预 flush体并直调
 *   （TextController.flushPendingRaw：提交打开单元+裸 persist 待写值，值捕获时点=
 *   命令起步；#13/#14：失败即止，不弹栈不反向写）→ ②peek 栈顶（空栈 no-op；预
 *   flush 落库的操作项已在栈）→ ③反向写（裸体直调）。起步后入链的写一律排在
 *   本任务之后（#13/#16b：新值后落库）。
 * - 三类执行（§4.2）：create 的 undo=delete 当前映射 id、redo=saveAnnotation
 *   重建；delete 的 undo=saveAnnotation 重建、redo=delete；comment-edit 的
 *   undo=update before、redo=update after。reader 沿用「重建得新 id」合约：
 *   每次重建成功后双栈全部同旧 id 引用原地 remap（失败零 remap）。
 * - 文本代际：操作层恢复 annotation 后递增该 target 的 contentGeneration 并清旧
 *   文本 past/future（§3 操作层行）；comment-edit 恢复携带已落库值——挂载中的
 *   编辑器据此采用外部值。
 * - 操作层历史命令终止批注编辑合并会话（其后新输入开启新操作项，§4.2）。
 * - 冻结门（undo/redo 逆写=用户动作，冻结期拒绝——入口与排队项起步各查一次，
 *   栈不变零 api）：全局 quit 门 + 目标 tab 关闭在途门（§2.5 #12、§10.1——按
 *   paperId 寻址，他 tab 关闭不冻结本 tab）。busy 含 history 在途（仅作运行中
 *   指示，不禁用命令）。
 * - 执行器不 apply store（store 同步归调用侧 reader.store——单向依赖防环）。
 *
 * ── 接口层 ──
 * - export type OpHistoryOutcome / OpHistoryFailReason
 * - export function undoTabOperations(paperId) / redoTabOperations(paperId)
 * - export function opHistoryInFlight(paperId): boolean
 * - export function invalidateAnnotationText(paperId, annotationId): void
 *
 * ── 架构层 ──
 * - import annotation-undo（纯栈）/reader-text-history/tab-write-lane/
 *   annotation-draft-registry；**不 import reader.store**（防环——apply 由调用侧执行）。
 */
import { api, ApiClientError } from '../../../api/client'
import { quitWriteBlocked } from '../../../app/quit-closing-gate'
import { enqueueTabTask } from '../../../shared/tab-write-lane'
import { tabWriteBlocked } from './tab-closing-gate'
import { notifyReaderCommandState } from './reader-command-state'
import { allDraftRawPreflushes } from '../interact/annotation-draft-registry'
import {
  endCommentEditSession,
  peekRedo,
  peekUndo,
  remapAnnotationIds,
  settleRedo,
  settleUndo,
  toOperationInput,
  type OpApply,
  type ReaderOperationEntry
} from './annotation-undo'
import { bumpTextGeneration, type TextTargetKey } from './reader-text-history'
import type { RawPreflush } from './reader-text-controller'

export type OpHistoryFailReason = 'empty' | 'busy' | 'write-failed' | 'api-failed'

export type OpHistoryOutcome =
  | { done: false; reason: OpHistoryFailReason }
  | { done: true; apply: OpApply }

/** 复合链任务的结果（任务体内：预 flush → peek → 反向写；top=被执条目——回执后按身份结算） */
type OpStep = { kind: OpHistoryFailReason } | { kind: 'done'; top: ReaderOperationEntry; apply: OpApply }

/** per-tab 请求链（在途+排队串行——#13d 排队不并发） */
const opChains = new Map<string, Promise<unknown>>()
/** per-tab 执行中步数（busy 指示——finalize 的重复命令拒绝判据之一） */
const opRunning = new Map<string, number>()

/** 操作层 undo/redo 是否在途（协调器命令状态投影） */
export function opHistoryInFlight(paperId: string): boolean {
  return (opRunning.get(paperId) ?? 0) > 0
}

/** 该操作项涉及的标注文本 target */
function targetOf(entry: ReaderOperationEntry): TextTargetKey {
  const id = entry.kind === 'comment-edit' ? entry.before.id : entry.annotation.id
  const paperId = entry.kind === 'comment-edit' ? entry.before.paperId : entry.annotation.paperId
  return { paperId, kind: 'annotation-comment', annotationId: id }
}

/** 标注被删除：其文本 target 代际失效（旧文本 past/future 不再可撤——§4.2） */
export function invalidateAnnotationText(paperId: string, annotationId: string): void {
  bumpTextGeneration({ paperId, kind: 'annotation-comment', annotationId })
}

/** 逆写执行（undo 方向）。失败返回 null（两栈不动）。 */
async function executeUndo(paperId: string, entry: ReaderOperationEntry): Promise<OpApply | null> {
  if (entry.kind === 'create') {
    const r = await api.reader.deleteAnnotation({ annotationId: entry.annotation.id })
    return r.ok ? { type: 'remove', id: entry.annotation.id } : null
  }
  if (entry.kind === 'delete') {
    const r = await api.reader.saveAnnotation({ paperId, annotation: toOperationInput(entry.annotation) })
    if (!r.ok) return null
    // 重建得新 id：双栈全部同旧 id 引用原地改写（本条目自身亦改指新 id）
    remapAnnotationIds(paperId, entry.annotation.id, r.data.id)
    return { type: 'upsert', annotation: r.data }
  }
  const r = await api.reader.updateAnnotation({ annotation: entry.before })
  return r.ok ? { type: 'upsert', annotation: r.data } : null
}

/** 顺写执行（redo 方向）。失败返回 null（两栈不动）。 */
async function executeRedo(paperId: string, entry: ReaderOperationEntry): Promise<OpApply | null> {
  if (entry.kind === 'create') {
    const r = await api.reader.saveAnnotation({ paperId, annotation: toOperationInput(entry.annotation) })
    if (!r.ok) return null
    remapAnnotationIds(paperId, entry.annotation.id, r.data.id)
    return { type: 'upsert', annotation: r.data }
  }
  if (entry.kind === 'delete') {
    const r = await api.reader.deleteAnnotation({ annotationId: entry.annotation.id })
    return r.ok ? { type: 'remove', id: entry.annotation.id } : null
  }
  const r = await api.reader.updateAnnotation({ annotation: entry.after })
  return r.ok ? { type: 'upsert', annotation: r.data } : null
}

async function runOpHistory(paperId: string, direction: 'undo' | 'redo'): Promise<OpHistoryOutcome> {
  // 排队项起步时冻结期已到：拒绝（栈不变零 api）
  if (quitWriteBlocked() || tabWriteBlocked(paperId)) return { done: false, reason: 'busy' }
  opRunning.set(paperId, (opRunning.get(paperId) ?? 0) + 1)
  notifyReaderCommandState(paperId)
  let preflushes: RawPreflush[] = []
  try {
    // 命令起步（同一同步段内入链占位）：提交本 tab 挂载控制器的打开单元并捕获待写值
    preflushes = allDraftRawPreflushes(paperId).map((h) => h.prepare())
    // [B4-A 回炉三 A] 复合链任务——起步时已在链的任务先落库，起步后入链的写排在本任务
    // 之后。任务体内只调裸写体（单层入链契约——tab-write-lane 头注）
    const step = await enqueueTabTask(paperId, async (): Promise<OpStep> => {
      // ① 预 flush（#13/#14）：任一失败即止——不弹栈不反向写（真实写失败由写路径 toast 呈现）
      for (const pre of preflushes) {
        if (!(await pre.run())) return { kind: 'write-failed' }
      }
      // ② peek 栈顶：预 flush 落库的操作项已入栈（空栈 no-op）
      const top = direction === 'undo' ? peekUndo(paperId) : peekRedo(paperId)
      if (top === null) return { kind: 'empty' }
      // 历史命令改写栈——合并会话终止（其后新输入开新操作项）
      endCommentEditSession(paperId)
      try {
        // ③ 反向写（裸体直调）
        const flight = await (direction === 'undo' ? executeUndo(paperId, top) : executeRedo(paperId, top))
        return flight === null ? { kind: 'api-failed' } : { kind: 'done', top, apply: flight } // 失败两栈不动
      } catch (e) {
        // 非 API 层异常打到控制台（编程错误不静默）；结果仍按可重试失败返回
        if (!(e instanceof ApiClientError)) {
          console.error('[reader-history-commands] 操作历史异常', e)
        }
        return { kind: 'api-failed' }
      }
    })
    if (step.kind !== 'done') return { done: false, reason: step.kind }
    // 成功才移栈（按条目身份——await 期间入栈/截断不错弹）
    if (direction === 'undo') settleUndo(paperId, step.top)
    else settleRedo(paperId, step.top)
    // 操作层恢复使对应文本 target 的旧 past/future 失效（§3 操作层行）
    bumpTextGeneration(targetOf(step.top), step.apply.type === 'upsert' ? step.apply.annotation.comment : undefined)
    return { done: true, apply: step.apply }
  } finally {
    // 命令终结（成功/失败/中止同）：解除各控制器的等值普通写抑制
    for (const pre of preflushes) pre.release()
    const rest = (opRunning.get(paperId) ?? 1) - 1
    if (rest <= 0) opRunning.delete(paperId)
    else opRunning.set(paperId, rest)
    notifyReaderCommandState(paperId)
  }
}

function chainOp(paperId: string, direction: 'undo' | 'redo'): Promise<OpHistoryOutcome> {
  // 冻结门：用户命令入口即拒（不排队）
  if (quitWriteBlocked() || tabWriteBlocked(paperId)) {
    return Promise.resolve({ done: false, reason: 'busy' })
  }
  const run = (): Promise<OpHistoryOutcome> => runOpHistory(paperId, direction)
  const next = (opChains.get(paperId) ?? Promise.resolve()).then(run, run)
  const guarded = next.catch(() => undefined)
  opChains.set(paperId, guarded)
  // 链空即清（tab 关闭后不留条目）
  void guarded.then(() => {
    if (opChains.get(paperId) === guarded) opChains.delete(paperId)
  })
  return next
}

/** 操作层 undo（批注 create/delete/comment-edit 三类逆操作） */
export function undoTabOperations(paperId: string): Promise<OpHistoryOutcome> {
  return chainOp(paperId, 'undo')
}

/** 操作层 redo（三类顺操作） */
export function redoTabOperations(paperId: string): Promise<OpHistoryOutcome> {
  return chainOp(paperId, 'redo')
}
