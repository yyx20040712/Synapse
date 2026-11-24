/**
 * [F-RECOV-04 / 设计稿 §11.2（recoveryEntry 行数预算拆件）、回炉 W-D2b] recovery-entry-model
 * —— recoveryEntry 的三个边界契约类型（自 recoveryEntry 迁出：W-B3 增替换守卫钩子后该件仍超
 * §11.2 预算 250 行，纯类型块随迁本件；recoveryEntry 原名再导出，既有 import 路径与类型身份不变）。
 *
 * ── 行为层 ──
 * - RecoveryPhase／RecoverySlotKind／RecoveryUiState：确认条呈现态（调度器 uiState 的形状——
 *   entry 经 ports.emit／getState 写读；呈现件 RecoveryBar 自持结构兼容窄形）。
 * - SchedulerPorts：entry→调度器端口（peek／read／save／release、gen++ 与 epoch 采纳、门写、
 *   状态读、开门补存与开门收口钩、外槽放弃与 takeOver 回调）。
 * - RecoveryEntryHost：entry→宿主回调（载入／水化／路由／弃置清态四项必选，F-RECOV-04 四项
 *   可选钩子，[回炉 W-B3·R-B5] 替换守卫）。
 *
 * ── 接口层 ── export type RecoveryPhase／RecoverySlotKind；export interface RecoveryUiState／
 * SchedulerPorts／RecoveryEntryHost
 *
 * ── 架构层 ── 纯契约类型件：零运行时导出（type-only）；只依赖 @shared/recovery/schemas 与
 * recovery-restore-contract，不 import recoveryEntry（类型身份经 recoveryEntry 再导出，无双写）。
 */
import type {
  LineageRecoveryPayload,
  RecoveryPeekRes,
  RecoveryReadRes,
  RecoveryReleaseRes,
  RecoverySaveRes,
  RecoverySlotFile
} from '@shared/recovery/schemas'
import type { PreflightOutcome, RestoreDecision, SettleUnsettledResult } from './recovery-restore-contract'

export type RecoveryPhase = 'idle' | 'checking' | 'await-decision' | 'open'
export type RecoverySlotKind = 'available' | 'invalid' | 'foreign-version' | null

export interface RecoveryUiState {
  phase: RecoveryPhase
  slotKind: RecoverySlotKind
  file: RecoverySlotFile | null
  /** 恢复校验 folder 不在（死文件夹——恢复禁用+放弃/稍后处理） */
  deadFolder: boolean
  busy: boolean
  /** 稍后处理/pending 拒写 chip（W-07） */
  pendingChip: boolean
  degraded: boolean
  /** [F-RECOV-01] degraded 呈现分档（INV-166 扩展）：slow=写入缓慢／stuck-pending=
   *  弃置待确认／unavailable=已观测失败或溢出（锁存——成功才清） */
  kind: 'slow' | 'stuck-pending' | 'unavailable' | null
  /** kind=unavailable 且探针连败≥3：加缀「重启应用可恢复」（W8 终态承载） */
  restartHint: boolean
  /** [B4 L2 §8.4 末行] 多图未落库诚实 chip：只有 owner 有崩溃副本（单槽限制外显） */
  unprotectedChip: boolean
}

export interface SchedulerPorts {
  /** peek（1500ms 硬超时+unwrap 已包——确认条动作面） */
  peek(): Promise<RecoveryPeekRes>
  read(token: string): Promise<RecoveryReadRes>
  /** save（takeOver 形态=takeOverToken 携带；token 双账本记账在端口承接） */
  save(payload: unknown, takeOverToken?: string): Promise<RecoverySaveRes>
  release(token: string, reason: 'clean' | 'discard'): Promise<RecoveryReleaseRes>
  /** gen++（ws-entry 形态：chip/health/双 streak 保留——W5①；返回新代际） */
  bumpGen(): number
  getGen(): number
  adoptEpoch(epoch: number): void
  /** [R7] peek 成功后清 token 双账本（基线行为回移——enter 判定槽归属前重置会话凭据） */
  resetTokens(): void
  emit(patch: Partial<RecoveryUiState>): void
  setGateOpen(open: boolean): void
  getState(): RecoveryUiState
  /** 开门补存（视同编辑事件——trailing；W1 同型语义修订见头注） */
  requestPendingResend(): void
  /** 决策开门收口钩（W6② 条件重臂／W6① 即刻清——宿主判定） */
  onGateReopened(): void
  /** [B4 L2 §8.4 行 9] 外槽放弃成功→owner 可认领 */
  onForeignSlotReleased(): void
  /** [B4 L2 §8.4 行 7] takeOver 成功（owner adopt 承载） */
  onTakeOver(payload: LineageRecoveryPayload): void
}

/** 恢复流程宿主回调（scheduler 装配时转发——store 载入/水化/路由/弃置清态；
 *  F-RECOV-04 四项可选钩子未注入=旧语义，见头注缺省表） */
export interface RecoveryEntryHost {
  loadPayload(payload: unknown): void
  onRestored(payload: unknown): void
  openLineageView(): void
  discardLoadedSession(): void
  /** 未落定写谓词（queue 非空∨草稿在∨flushing——宿主装配 store+草稿观测） */
  hasUnsettledWrites?(): boolean
  /** 恢复决策询问（确认框承载） */
  askRestoreDecision?(decision: RestoreDecision): Promise<boolean>
  /** 落定当前会话写（草稿经既有 commit 入口转队列+flush+四条件核验；false=落定
   *  失败——停条可重试不自动续；对象形=核验结果+已收口计数） */
  settleUnsettledWrites?(): Promise<SettleUnsettledResult>
  /** 恢复预检（graph/folders 读面装配→纯数据清单） */
  runRestorePreflight?(payload: LineageRecoveryPayload): Promise<PreflightOutcome>
  /** [回炉 W-B3·R-B5 / 用户裁决 R2 / 设计稿 §6.3] 替换守卫谓词：副本目标会话（folderId
   *  ——read 之后才可知，故带参）有 Q/F/draft、unfinalized 或 undo/redo 非空＝真（只看
   *  目标会话），载入前必须替换确认（落定步已确认过则不二问）。缺省=不确认（旧夹具零适配） */
  hasReplaceableSession?(folderId: string): boolean
}
