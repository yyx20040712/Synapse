/**
 * [F-RECOV-04 / 设计稿 §11.2] recovery-restore-contract —— 恢复决策流的结果与决策契约类型
 * （自 recoveryEntry 迁出：[回炉 W-B3·R-B5] recoveryEntry 增替换守卫钩子，而该件已超行数预算——
 * 纯类型块随迁本件，recoveryEntry 原名再导出，既有 import 路径与类型身份不变）。
 *
 * ── 行为层 ──
 * - SettleUnsettledResult：落定步结果（boolean=旧夹具兼容形；对象形=四条件核验+已收口计数）。
 * - RestoreDecision：恢复流程向宿主发出的决策询问（确认框承载——resolve(true)=继续/false=取消）：
 *   settle-replace=落定后的单次替换确认；replace=defer 过或替换守卫为真时的替换确认（不携带
 *   其他字段）；conflicts=预检冲突清单（携替换警示）；discard=放弃副本的不可逆确认；
 *   preflight-unavailable=预检读取失败的通知型。
 * - PreflightOutcome：预检结果（ran=清单；read-failed=阻断可重试——终裁②）。
 *
 * ── 接口层 ── export type SettleUnsettledResult／RestoreDecision／PreflightOutcome
 *
 * ── 架构层 ── 纯契约类型件：零运行时导出（type-only，零环）；消费面经 recoveryEntry／
 * recoveryScheduler 的再导出引用。
 */
import type { PreflightConflict } from './recovery-restore-preflight'

/** [回炉 B-2] 落定步结果：boolean=成败（旧夹具兼容形）；对象形=四条件核验+计数 */
export type SettleUnsettledResult = boolean | { ok: boolean; savedActions: number; savedDraft: boolean }

/** [F-RECOV-04] 恢复决策询问类型（宿主承载确认框——resolve(true)=继续/false=取消） */
export type RestoreDecision =
  | { kind: 'settle-replace'; savedActions: number; savedDraft: boolean }
  | { kind: 'replace' }
  | { kind: 'conflicts'; conflicts: PreflightConflict[]; replaceWarning: boolean }
  | { kind: 'discard'; actionCount: number; draftPresent: boolean }
  | { kind: 'preflight-unavailable' }

/** 预检结果（宿主装配读面→纯数据清单；read-failed=阻断可重试——终裁②） */
export type PreflightOutcome = { kind: 'ran'; conflicts: PreflightConflict[] } | { kind: 'read-failed' }
