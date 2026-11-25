/**
 * [B5 设计稿 §6 C1 错误来源单源、§2.4 失败源与告警合法态、§6.1 写点映射；B5-D02=甲]
 * lineage-write-failure —— 写失败的来源元数据、原子 error/clear patch 与告警投影纯件。
 *
 * 背景（B4 遗留缺陷 C1）：普通写与 history 两源共用 saveStatus/lastWriteError 一对字段——错误行
 * 对任何 error 都显示保存重试，而 retrySave 恒调 finalize，history/redo 失败后的通用「重试」会
 * 显式定稿并清 redo/U（保存重试与历史重试混义）。
 *
 * ── 行为层 ──
 * - LineageWriteErrorSource：最近一次失败的来源判别枚举（消息元数据，不是第二份错误消息）——
 *   'save'=普通写队列失败／显式保存与 finalize 链（含其前置与续拉和解）／reconcileNow／普通
 *   flush 的和解失败／finalize 的 CONFLICT 尾；'history-undo'／'history-redo'=history-unit 自身
 *   系统失败或 CONFLICT，以及该方向命令在 needsReload 下的前置与续拉和解失败；null=无失败。
 * - 原子 patch：writeFailure／writeFailureCleared 是 saveStatus·message·source 三者唯一的成组
 *   写法——一切写点只用这两个构造，在同一 registry patch 写入或清除（防某个写点只改 message
 *   忘改 source）。
 * - historyWriteErrorSource(direction)：history 方向→来源。和解失败的来源由**发起命令显式
 *   传入**（history.run(direction) → drain／reconcileAtTail → runReconcile(source)），覆盖初次
 *   前置和解与有界续拉；不得依赖失败收尾时可能已清的 inflight 反推，也不得在 lane 持一个可被
 *   后续命令覆盖的可变 currentSource。
 * - writeErrorAlert(view)：一条告警、按源分流（§2.4 表）——非 error 相位=不显示；
 *   · save：`保存失败：{message}`＋保存重试（retrySave→finalize）；
 *   · history-undo：`撤销失败：{message}。历史栈未变化，重按撤销即可重试。`、history-redo
 *     对称——**无保存重试**（重试入口=重按原方向命令：重新走 drain／needsReload 和解，成功后
 *     才发 history-unit；不能经 finalize 绕过原命令）；
 *   · null（缺源的非法态——运行态不可达）：显示通用真实错误、无任何重试钮（UI 对缺源 fail
 *     closed，避免误定稿）。
 *   过期历史丢弃出口（CONFLICT 四种拒因）与来源无关：较早的 stale 标记仍合法时，save 与
 *   history 告警都可带丢弃出口（两者含义不同，不由一个按钮兼任）——出口本体由
 *   LineageStaleHistoryDrop 按 staleHistoryAtTop 自判。
 * - canRetrySave(source)：retrySave 的守卫判据（store 层第二道防线——只有 save 才 finalize）。
 *
 * ── 接口层 ── 类型 LineageWriteErrorSource／WriteFailureFields／WriteErrorAlertView／
 * WriteErrorAlert；export function writeFailure／writeFailureCleared／historyWriteErrorSource／
 * writeErrorAlert／canRetrySave
 *
 * ── 架构层 ── 纯函数件：只依赖类型（lineage-session-model type-only import——model 反向只
 * type-import 本件的来源类型，零运行时环）。
 */
import type { LineageHistoryDirection } from '@shared/ipc/lineage-history.schemas'
import type { LineageSaveStatus } from './lineage-session-model'

/** [B5 §6.1] 最近一次写失败的来源（与 lastWriteError 同批写入或清除；null=无失败） */
export type LineageWriteErrorSource = 'save' | 'history-undo' | 'history-redo' | null

/** 失败三字段的公共结构（写队列／history-unit／会话面的结构子集——原子 patch 的返回形） */
export interface WriteFailureFields {
  saveStatus: LineageSaveStatus
  lastWriteError: string | null
  lastWriteErrorSource: LineageWriteErrorSource
}

/** 写失败原子 patch：error 相位＋原始 message＋来源（同一 registry patch 写入） */
export function writeFailure(message: string, source: Exclude<LineageWriteErrorSource, null>): WriteFailureFields {
  return { saveStatus: 'error', lastWriteError: message, lastWriteErrorSource: source }
}

/** 写成功／丢弃出口的原子清除 patch：message 与 source 同清；相位由调用方给出（缺省 clean——在途收尾按 Q 取 settledIoPhase） */
export function writeFailureCleared(saveStatus: LineageSaveStatus = 'clean'): WriteFailureFields {
  return { saveStatus, lastWriteError: null, lastWriteErrorSource: null }
}

/** history 方向→失败来源（history-unit 自身失败与该方向命令的前置/续拉和解失败同一来源） */
export function historyWriteErrorSource(direction: LineageHistoryDirection): 'history-undo' | 'history-redo' {
  return direction === 'undo' ? 'history-undo' : 'history-redo'
}

/** retrySave 守卫判据：只有 save 来源才可经 finalize 重试（history／缺源=no-op） */
export function canRetrySave(source: LineageWriteErrorSource): boolean {
  return source === 'save'
}

/** 告警投影的输入（活动会话 IO 失败面的结构子集） */
export interface WriteErrorAlertView {
  saveStatus: LineageSaveStatus
  lastWriteError: string | null
  lastWriteErrorSource: LineageWriteErrorSource
}

/** 一条告警按源分流的投影：none=不显示保存/history 告警；alert=文案＋告警内动作开关 */
export type WriteErrorAlert =
  | { kind: 'none' }
  | { kind: 'alert'; text: string; retrySave: boolean; dropStale: boolean }

/** 告警投影（§2.4 失败源与告警合法态表——UI 只读本投影，不另立错误态） */
export function writeErrorAlert(view: WriteErrorAlertView): WriteErrorAlert {
  if (view.saveStatus !== 'error') return { kind: 'none' }
  const message = view.lastWriteError ?? ''
  switch (view.lastWriteErrorSource) {
    case 'save':
      return { kind: 'alert', text: `保存失败：${message}`, retrySave: true, dropStale: true }
    case 'history-undo':
      return { kind: 'alert', text: `撤销失败：${message}。历史栈未变化，重按撤销即可重试。`, retrySave: false, dropStale: true }
    case 'history-redo':
      return { kind: 'alert', text: `重做失败：${message}。历史栈未变化，重按重做即可重试。`, retrySave: false, dropStale: true }
    default:
      // 缺源非法态（运行态不可达）：显示通用真实错误，不给任何重试入口（fail closed——避免误定稿）
      return { kind: 'alert', text: message, retrySave: false, dropStale: false }
  }
}
