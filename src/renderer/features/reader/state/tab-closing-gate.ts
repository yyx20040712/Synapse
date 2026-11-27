/**
 * [B4-A R2 §2.5 #1/#2/#12/#20/#24-#29、§9.2、§10.1] tab-closing-gate —— 关 tab
 * 冻结门与关闭流程在途表（quit-closing-gate 同型：模块级同步单例，禁 React
 * state）。
 *
 * ── 行为层 ──
 * - 在途表：每个 tab 至多一条在途关闭流程（requestCloseTab 入表、流程 settle
 *   出表）。重入直接取表内 promise——#24「重入只返回同一关闭 promise，不二次
 *   写」的单源；表内 promise 身份即调用方拿到的身份。
 * - 冻结事实=该 tab 有在途关闭流程，等价于 TabState.closing 相位 ∈ {flushing,
 *   confirm, error}（相位投影供 Dialog 渲染，由 reader-close-tab 与本表同点写；
 *   冻结判定读本表，不读投影——文本控制器与操作层执行器不引 reader.store）。
 *   流程终结（相位回 none）后同步释放：表项随 promise settle 的最先登记回调出表，
 *   早于任何调用方的 then 回调。
 * - 冻结期该 tab 的用户命令入口一律拒绝：文本输入（#1）、显式保存（#20）、
 *   undo/redo（#12，入口与排队项起步各查一次）、新标注操作与批注手动保存（#2
 *   「命令通过 gate」）。按 paperId 寻址——他 tab 的关闭不冻结本 tab（§9.2「非
 *   关闭 tab 可继续自己的写」）。
 * - 冻结前已入链的写不受影响：其在途结果照常落库与回显（属关闭预 flush 的收口
 *   范围，#24「提交该 tab 文本并 flush」）。
 *
 * ── 豁免面（关闭流程自身的内部 flush 不受冻结）──
 * 闸点只设在用户命令入口。关闭流程的预 flush 全部经收口面，收口面不设闸，因此
 * 不需要、也不提供运行期豁免域（无调用方的豁免函数=死代码）：
 * - 挂载句柄 flush（TextController.flush：闭合打开单元→派发写→等终态）；
 * - 该单元提交入栈（reader-text-history.pushTextCommit）与其落库写体
 *   （annotation-popups-actions.autosaveComment / notes.store.persistNow）；
 * - 总评立存（notes.store.flushNow→notes.persistence 收口链）；
 * - 写链 drain（tab-write-lane.laneDrain）与失败查态（markTabDirty）。
 * 新增闸点时须保持该划分：闸点加在收口面上会使关闭预 flush 自锁。
 *
 * ── 接口层 ──
 * - export function tabClosingFlight(paperId): Promise<boolean> | undefined
 * - export function startTabClosing(paperId, flight): Promise<boolean>
 * - export function tabWriteBlocked(paperId): boolean
 *
 * ── 架构层 ──
 * - reader/state 域叶子件（零 import）：文本控制器、操作层执行器、保存协调器、
 *   关闭状态机共用；不进 store（Promise 不入响应式快照）。
 */

/** 关闭流程在途表：paperId → 该次关闭流程的 promise */
const flights = new Map<string, Promise<boolean>>()
import { notifyReaderCommandState } from './reader-command-state'

/** 该 tab 在途的关闭流程 promise（无在途=undefined）——重入方原样返回同一对象 */
export function tabClosingFlight(paperId: string): Promise<boolean> | undefined {
  return flights.get(paperId)
}

/**
 * 登记在途关闭流程（调用方先查 tabClosingFlight 确认无在途）。流程 settle（兑现
 * 或拒绝）后出表；返回入参同一 promise。
 */
export function startTabClosing(paperId: string, flight: Promise<boolean>): Promise<boolean> {
  flights.set(paperId, flight)
  notifyReaderCommandState(paperId)
  const forget = (): void => {
    if (flights.get(paperId) === flight) flights.delete(paperId)
  }
  void flight.then(forget, forget)
  const observeSettle = (): void => {
    notifyReaderCommandState(paperId)
  }
  void flight.then(observeSettle, observeSettle)
  return flight
}

/** 用户命令闸：该 tab 关闭流程在途=true（写源入口在改值/入链/改栈之前同步检查） */
export function tabWriteBlocked(paperId: string): boolean {
  return flights.has(paperId)
}
