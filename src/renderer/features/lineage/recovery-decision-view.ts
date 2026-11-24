/**
 * [B4 L2 / 设计稿 §8/§6.3/§11.2] recovery-decision-view —— 恢复决策确认框与 chip 的
 * 呈现文案单源（纯函数；对话框机制与按钮排布驻 RecoveryRestoreDialog 纯 props 件）。
 * confirmLabel=null=通知型（单「好」钮——预检不可用，终裁②阻断态）。
 * [回炉 B-1] restoreDecisionView 自 feature Dialog 拆件上移（原驻 app/RecoveryBarHost——
 * lineage 状态读取只驻该组合根、展示件纯 props）；[B4 L2 拆件] 再迁本件为纯函数。
 */
import type { RestoreDecision } from './recoveryScheduler'

/** [回炉 W-B3·R-B5 / 设计稿 §2.5 #39] 两处替换确认共用的后果说明行：载入换新目标会话——其撤销/重做历史
 *  与未保存标记随替换清除（落定步只 flush 不 finalize，历史在落定后仍在场） */
const REPLACE_CONSEQUENCE_LINE = '当前图的撤销/重做历史与未保存标记将被清除，这次替换无法撤销。'

export interface DecisionView {
  title: string
  lines: string[]
  confirmLabel: string | null
  danger: boolean
}

/** [回炉 B-1] 决策确认框文案单源（RestoreDecision+落定计数→呈现面；对话框
 *  机制与按钮排布驻 RecoveryRestoreDialog 纯 props 件）。confirmLabel=null=
 *  通知型（单「好」钮——预检不可用，终裁②阻断态）。 */
export function restoreDecisionView(d: RestoreDecision): DecisionView {
  if (d.kind === 'discard') {
    const n = `该副本含待保存动作 ${d.actionCount}${d.draftPresent ? '（含未收口草稿）' : ''}，放弃后不可恢复。`
    return { title: '放弃恢复副本？', lines: [n, '放弃后，新的编辑将重新受副本保护。'], confirmLabel: '放弃副本', danger: true }
  }
  if (d.kind === 'settle-replace') {
    // 终裁⑥复审修正版：先落定后单次替换确认（落定成功才进本框——计数=落定步已收口量）
    const draft = d.savedDraft ? '及一份未收口草稿' : ''
    return {
      title: '恢复副本并替换当前图？',
      lines: [
        `已保存当前 ${d.savedActions} 项修改${draft}。`,
        '恢复将用副本替换当前图；未包含在副本内的修改将被副本内容取代（已落库修改保留在数据库）。',
        REPLACE_CONSEQUENCE_LINE
      ],
      confirmLabel: '继续恢复',
      danger: false
    }
  }
  if (d.kind === 'replace') {
    return {
      title: '用副本替换当前图？',
      lines: [
        '恢复将用副本替换当前图；未包含在副本内的修改将被副本内容取代（已落库修改保留在数据库）。',
        REPLACE_CONSEQUENCE_LINE
      ],
      confirmLabel: '替换并恢复',
      danger: false
    }
  }
  if (d.kind === 'conflicts') {
    const lines = d.conflicts.slice(0, 6).map((c) => c.reason)
    if (d.conflicts.length > 6) lines.push(`……等共 ${d.conflicts.length} 项动作不能原样恢复`)
    if (d.replaceWarning) lines.push('继续恢复将用副本替换当前图。')
    return { title: '部分动作无法原样恢复', lines, confirmLabel: '仍要恢复', danger: false }
  }
  return {
    title: '无法预检恢复副本',
    lines: ['恢复前的冲突预检未能读取当前库态，暂不执行恢复；可稍后重试恢复。'],
    confirmLabel: null,
    danger: false
  }
}

export { RECOVERY_UNPROTECTED_CHIP_TEXT as UNPROTECTED_CHIP_TEXT } from '../../shared/ui-constants'
