/**
 * [B4-A R2 §11.1/§2.5 #24-#29/§10.2] reader-close-tab —— 关 tab closing 状态机、
 * 预 flush 与二选/失败决策（自 tab-dirty.ts 迁出——IO/U 选择器留驻彼件）。
 *
 * ── 行为层（§2.5 #24-#29）──
 * - requestCloseTab：closing gate 冻结期拒；重入返回表内同一在途 promise（#24
 *   「重入只返回同一关闭 promise，不二次写」——在途表驻 tab-closing-gate，重入
 *   方与首入方同终态）；phase=flushing → 提交该 tab 文本并 flush：
 *   ACTIVE tab 挂载句柄复扫收敛（R1 flushMountedDraftHandles 语义原样迁入：
 *   每轮全量句柄 flush、新句柄/未落定续轮、轮上限 3、每轮活动位守卫）→
 *   notes flushNow → laneDrain → 查态。
 * - 冻结：关闭流程在途期间该 tab 的用户命令入口被 tab-closing-gate 拒绝（文本
 *   输入/保存/undo-redo/新标注操作——#1/#2/#12/#20）；本流程自身的预 flush 经
 *   收口面通行（豁免面清单见 tab-closing-gate 头注）。流程在途期间相位恒为
 *   flushing/confirm/error，终结时回 none（异常路径同——finally）。
 * - flush 失败（#29）：phase=error 携真实失败原因，只提供重试/留下——旧的
 *   「确认放弃未落库修改」路径已删除（§10.2）；重试=重走 flushing；留下=
 *   phase=none 返回 false（U/H/R 原样）。
 * - flush 成功且 U=1（#26）：phase=confirm 显示冻结二选文案
 *   「当前文件未被标记为已保存，是否确认关闭？」——是=关闭并清史（#27，清账
 *   归 reader.store.closeTab 接缝）、否=留下（#28，tab 栈原样）。
 * - flush 成功且 U=0（#25）：直接放行（不弹窗）。
 * - 对话框决策经 chooseCloseTabDecision 注入（CloseTabDialogHost 消费）；
 *   confirm 相 ESC/遮罩关闭=否（Dialog onClose 契约），error 相=留下。
 * - tab IO 查态（tabFlushError/tabNotePending）：flush/finalize 收口后的落库判定
 *   单源（INV-141：不把 Promise fulfilled 等同已落库）——显式保存 drain 后经
 *   同一查态复查（§4.3 #4、§2.5 #23）。
 *
 * ── 接口层 ──
 * - export function requestCloseTab(paperId): Promise<boolean>
 * - export type CloseTabDecision
 * - export function chooseCloseTabDecision(paperId, decision): void
 * - export function tabFlushError(paperId): string | null
 * - export function tabNotePending(paperId): boolean
 *
 * ── 架构层 ──
 * - reader/state 域（reader.store/notes.store 经既有组合白名单消费——
 *   tab-dirty 同型先例）；决策等待=模块级 waiter（不进 store——单值瞬态）。
 * - 被保存协调器（reader-save-coordinator）引用：协调器不得直引 notes.store
 *   （check-quality 跨域红线），IO 查态经本件白名单面取。
 */
import { quitWriteBlocked } from '../../../app/quit-closing-gate'
import { laneDrain } from '../../../shared/tab-write-lane'
import { useNotesStore } from '../../notes/notes.store'
import { allDraftFlushHandles } from '../interact/annotation-draft-registry'
import { useReaderStore } from './reader.store'
import { startTabClosing, tabClosingFlight } from './tab-closing-gate'
import type { TabClosingState } from './tab-state'

/** 对话框决策：confirm 相=是(true)/否(false)；error 相=重试('retry')/留下(false) */
export type CloseTabDecision = boolean | 'retry'

/** 待决对话框的决策 waiter（每 tab 至多一个——在途表单飞保证） */
const decisionWaiters = new Map<string, (d: CloseTabDecision) => void>()

/** 注入决策（对话框按钮/ESC）；无等待者=no-op（迟到决策不误伤下一轮） */
export function chooseCloseTabDecision(paperId: string, decision: CloseTabDecision): void {
  const waiter = decisionWaiters.get(paperId)
  if (waiter === undefined) return
  decisionWaiters.delete(paperId)
  waiter(decision)
}

/** 等待用户决策（flush 失败的重试/留下、U 二选的是/否） */
function awaitDecision(paperId: string): Promise<CloseTabDecision> {
  return new Promise((resolve) => {
    decisionWaiters.set(paperId, resolve)
  })
}

function setClosing(paperId: string, closing: TabClosingState): void {
  useReaderStore.getState().setTabClosing(paperId, closing)
}

/**
 * tab IO 查态（INV-141：不把 Promise fulfilled 等同已落库）——收口后落库判定单源：
 * 标注面失败残留（TabState.dirty）/ 总评保存失败（saveFailed）。返回真实失败
 * 原因（<reason> 进关闭冻结文案）或 null=无 IO 错误。
 */
export function tabFlushError(paperId: string): string | null {
  if (useReaderStore.getState().tabs[paperId]?.dirty === true) return '标注写失败'
  if (useNotesStore.getState().noteByPaper[paperId]?.saveFailed === true) return '笔记保存失败'
  return null
}

/** 该篇总评草稿是否仍有未落库编辑（notes pending 镜像——Q 面） */
export function tabNotePending(paperId: string): boolean {
  return useNotesStore.getState().noteByPaper[paperId]?.pending === true
}

/**
 * [B6 返工 4] finalize 的总评结算白名单面：复用 notes.flushNow 的在途收敛、
 * 失败重试与 clean no-op 语义；协调器不直引 notes.store。
 */
export async function flushNotesForTab(paperId: string): Promise<void> {
  try {
    await useNotesStore.getState().flushNow(paperId)
  } catch {
    // flushNow rejection=收口失败——按后续 IO 查态呈现，禁未处理 rejection。
  }
}

/** 关闭预 flush 查态：IO 错误或总评待写残留（首载门控篇零写派发等）均为未落库 */
function closeFlushError(paperId: string): string | null {
  return tabFlushError(paperId) ?? (tabNotePending(paperId) ? '笔记尚未落库' : null)
}

/**
 * ACTIVE tab 挂载句柄复扫收敛（R1 语义原样迁入）：每轮快照全量句柄 flush
 * （clean=no-op 零写；全 {saved,clean} 且无新句柄=稳定止）；failed/达顶未收敛
 * →markTabDirty（IO 失败残留——错误面原因单源）；每轮顶部+达顶前活动位守卫
 * （关 A 在途窗内切走即停——close 不越权消费新活动篇句柄）。
 * 返回 null=收敛；字符串=失败原因（IO 面）。
 */
async function flushMountedDraftHandles(paperId: string): Promise<string | null> {
  const seen = new Set<unknown>()
  for (let round = 0; round < 3; round++) {
    if (useReaderStore.getState().activeId !== paperId) {
      return null
    }
    const handles = allDraftFlushHandles()
    for (const h of handles) {
      seen.add(h)
    }
    const states = await Promise.all(
      handles.map((flush) => Promise.resolve().then(() => flush()).then((s) => s, () => 'failed'))
    )
    if (states.some((s) => s === 'failed')) {
      useReaderStore.getState().markTabDirty(paperId)
      return '标注写失败'
    }
    const unsettled = states.some((s) => s === 'dirty' || s === 'saving')
    const fresh = allDraftFlushHandles().some((h) => !seen.has(h))
    if (!unsettled && !fresh) {
      return null
    }
  }
  if (useReaderStore.getState().activeId !== paperId) {
    return null
  }
  useReaderStore.getState().markTabDirty(paperId)
  return '标注写未收敛'
}

/** 预 flush 一步（#24）：句柄+notes+laneDrain；返回失败原因或 null */
async function closeFlushPhase(paperId: string): Promise<string | null> {
  if (useReaderStore.getState().activeId === paperId) {
    const handleError = await flushMountedDraftHandles(paperId)
    if (handleError !== null) return handleError
  }
  try {
    await useNotesStore.getState().flushNow(paperId)
  } catch {
    // flushNow rejection=收口失败——按查态面呈现（禁未处理 rejection）
  }
  await laneDrain(paperId)
  return closeFlushError(paperId)
}

/**
 * 关 tab 请求（关闭叉/Delete 键两入口共用）：返回 true=应关闭（调用方执行
 * closeTab——清史接缝在 store）；false=留下/冻结。
 * 重入（该 tab 关闭流程在途）：返回首入的同一 promise——不二次 flush、同终态。
 */
export function requestCloseTab(paperId: string): Promise<boolean> {
  // [F-VISFB-64] closing gate：冻结期关 tab 命令整体拒绝（不触发 flush 写面）
  if (quitWriteBlocked()) return Promise.resolve(false)
  // #24 重入：同一在途关闭 promise（不二次写）
  const inFlight = tabClosingFlight(paperId)
  if (inFlight !== undefined) return inFlight
  // 流程本体的同步前段（相位=flushing、句柄快照）不让出控制权，登记与起步同在
  // 本同步段内完成——其后的任何重入都命中在途表
  const flight = closeTabFlow(paperId)
  return startTabClosing(paperId, flight)
}

/** 关闭流程本体（#24-#29）：在途登记与重入由 requestCloseTab 承担 */
async function closeTabFlow(paperId: string): Promise<boolean> {
  try {
    setClosing(paperId, { phase: 'flushing', error: null })
    let error = await closeFlushPhase(paperId)
    // #29 失败：真实错误+重试/留下（无「放弃未落库修改」径）
    while (error !== null) {
      setClosing(paperId, { phase: 'error', error })
      const decision = await awaitDecision(paperId)
      if (decision !== 'retry') {
        return false
      }
      setClosing(paperId, { phase: 'flushing', error: null })
      error = await closeFlushPhase(paperId)
    }
    // #25/#26：成功后按 U 分流（灰点=unfinalized 单源——§10.1）
    if (useReaderStore.getState().tabs[paperId]?.unfinalized === true) {
      setClosing(paperId, { phase: 'confirm', error: null })
      // #27/#28：是=关闭并清史；否=留下（tab 栈原样）
      return (await awaitDecision(paperId)) === true
    }
    return true
  } finally {
    // 流程终结：相位回 none（各出口与异常路径同）；在途表随 promise settle 出表
    setClosing(paperId, { phase: 'none', error: null })
    decisionWaiters.delete(paperId)
  }
}
