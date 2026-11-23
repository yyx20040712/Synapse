/**
 * [B4-A R1 §11.1/§4.1/§10.4] reader-save-coordinator —— per-tab 协调命令层
 * （逻辑统一、物理分层的协调面：统一 finalize、操作层 undo/redo 命令入口；
 * 纯协调不持历史——值栈驻 reader-text-history、操作栈驻 annotation-undo、
 * 写链驻 tab-write-lane）。
 *
 * ── 行为层 ──
 * - finalizeTab（显式保存 Ctrl+S / §3 显式保存行、§2.5 #20-#23）：提交该 tab
 *   全部打开单元（挂载控制器——批注编辑器+总评面板，恒属活动篇；句柄=闭合单元
 *   +派发写+等待终态）→ 任一句柄终态 failed 即本次保存失败（不清账可重试）
 *   → drain 该 tab 写链 → 复查该 tab 最新 IO（§4.3 #4：drain 兑现≠落库成功——
 *   IO 错误或无新编辑时的待写残留均=保存失败）→ 成功清该 tab 所有文本 redo 与
 *   操作 redo（undo 均保留）+ 结束批注编辑合并会话。重复命令拒绝：同对象已有
 *   finalize 或 history 在途（#20——普通写 saving 不排斥）。保存期间的新编辑按
 *   revision 保持未定稿（unfinalized 轴与灰点清账归 R2——INV-187）。
 *   冻结门两道：全局 quit 门 + 目标 tab 关闭在途（§10.1「closing 令保存禁用」）。
 * - undoActiveTab/redoActiveTab（§10.4 ReaderHistoryCommands）：操作层命令
 *   （非 editable 焦点入口——textarea 内为文本层接管，不经本口）；布尔结果=
 *   完整动作成功（非 promise 兑现）。执行+store 同步收口单点=reader.store。
 *
 * ── 接口层 ──
 * - export function finalizeTab(paperId): Promise<boolean>
 * - export function finalizeActiveTab(): Promise<boolean>
 * - export function undoActiveTab(): Promise<boolean>
 * - export function redoActiveTab(): Promise<boolean>
 *
 * ── 架构层 ──
 * - reader/state 域内组装（注册表句柄/lane/双栈/reader.store 全同域）；总评
 *   经注册表句柄与 per-tab lane 接入，本件不新增跨域 import——IO 查态（含总评
 *   pending/saveFailed）经 reader-close-tab 的 notes 白名单面取。
 */
import { allDraftFlushHandles } from '../interact/annotation-draft-registry'
import { quitWriteBlocked } from '../../../app/quit-closing-gate'
import { laneDrain } from '../../../shared/tab-write-lane'
import { clearRedo, endCommentEditSession } from './annotation-undo'
import { tabFlushError, tabNotePending } from './reader-close-tab'
import { opHistoryInFlight } from './reader-history-commands'
import { useReaderStore } from './reader.store'
import { clearTabTextRedo } from './reader-text-history'
import { tabWriteBlocked } from './tab-closing-gate'

/** finalize 在途的 tab（#20 重复命令拒绝判据） */
const finalizing = new Set<string>()

/** [B4-A R2 §10.4] finalize 是否在途（HistoryCommandState.busy 投影输入之一） */
export function finalizeInFlight(paperId: string): boolean {
  return finalizing.has(paperId)
}

/** 句柄收口（同步 throw/异步 rejection 归 'failed'——tab-dirty 复扫先例；返回值=句柄终态） */
function runHandle(handle: () => Promise<unknown>): Promise<unknown> {
  return Promise.resolve()
    .then(handle)
    .catch(() => 'failed')
}

/**
 * 显式保存（tab 级 finalize）：提交该 tab 全部打开单元 → 等待写终态 → drain →
 * 复查 IO → 成功清该 tab 文本 redo+操作 redo。返回完整动作成功（布尔≠promise 兑现）。
 */
export async function finalizeTab(paperId: string): Promise<boolean> {
  // closing gate：显式保存=用户命令，冻结期拒绝（全局 quit 门 + 目标 tab 关闭在途）
  if (quitWriteBlocked() || tabWriteBlocked(paperId)) return false
  // #20：同对象已有 finalize 或 history 在途时拒绝重复命令
  if (finalizing.has(paperId) || opHistoryInFlight(paperId)) return false
  finalizing.add(paperId)
  try {
    // [B4-A R2 §2.5 #20] 捕获 finalizeRevision（保存期间有新编辑的判据——#22）
    const revAtStart = useReaderStore.getState().tabs[paperId]?.editRevision ?? 0
    // 1. 提交该 tab 全部打开单元（挂载控制器恒属活动篇——非活动篇无挂载句柄，
    //    只 drain 其写链；clean 控制器零写）
    const handles = useReaderStore.getState().activeId === paperId ? allDraftFlushHandles() : []
    const states = await Promise.all(handles.map(runHandle))
    // #23：预 flush 失败——redo/undo/U 全保留，可重试（真实写失败由写路径呈现）
    if (states.some((s) => s === 'failed')) return false
    // 2. drain 该 tab 写链（排队任务全部落定）
    await laneDrain(paperId)
    // [B4-A R2 §2.5 #20/#23] drain 后复查该 tab 最新 IO（§4.3 #4：drain 兑现≠
    //    落库成功）——IO 错误（标注写失败残留/总评保存失败）即保存失败；总评待写
    //    残留在保存期间无新编辑时同为未落库（revision 已前进=新编辑的待写，归
    //    #22 后续调度，不作本次失败）。失败路径 redo/undo/U 全保留
    const newerEdits = (useReaderStore.getState().tabs[paperId]?.editRevision ?? 0) > revAtStart
    if (tabFlushError(paperId) !== null) return false
    if (!newerEdits && tabNotePending(paperId)) return false
    // 3. 成功清该 tab 所有文本 redo 与操作 redo；undo 均保留（§3 显式保存行）；
    //    显式保存结束批注编辑合并会话（定稿后的新输入开启新操作项，§4.2）
    endCommentEditSession(paperId)
    clearRedo(paperId)
    clearTabTextRedo(paperId)
    // [B4-A R2 §2.5 #21-#22] 定稿清 U：仅保存期间无新编辑（revision 未前进）；
    // 期间的新编辑灰点不得被旧保存回执误清
    useReaderStore.getState().finalizeTabUnfinalized(paperId, revAtStart)
    return true
  } finally {
    finalizing.delete(paperId)
  }
}

/** 活动 tab 显式保存（Ctrl+S 单源入口——页面非 editable 与 textarea 内共用） */
export function finalizeActiveTab(): Promise<boolean> {
  const paperId = useReaderStore.getState().activeId
  if (paperId === null) return Promise.resolve(false)
  return finalizeTab(paperId)
}

/** 操作层 undo 命令（§10.4；执行+store 同步收口单点=reader.store.undo） */
export async function undoActiveTab(): Promise<boolean> {
  const store = useReaderStore.getState()
  if (store.activeId === null) return false
  return store.undo()
}

/** 操作层 redo 命令（§10.4） */
export async function redoActiveTab(): Promise<boolean> {
  const store = useReaderStore.getState()
  if (store.activeId === null) return false
  return store.redo()
}
