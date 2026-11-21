/**
 * [F-RECOV-04] recovery-clean-gate —— pendingChip 在场时阻断普通 clean 化的 release
 * （纯判定件：输入=调度器呈现态窄形，输出=是否拦截；设计稿 §3.3+主控终裁 ③④）。
 *
 * ── 行为面 ──
 * - pendingChip=true（「恢复副本待处理」=用户尚未决策旧槽）→ 普通 clean 化四源
 *   （flush 全成功/undo·redo 回基线/discardSession/退出 clean）不得 release 旧槽：
 *   gen++/写面复位照旧，账本 token 保留（终裁③——账本至多持本会话新写 token，
 *   后续工作区切换/放弃确认仍可收口 own 槽；旧会话槽 token 在 peek 成功时已经
 *   resetTokens 清出账本，从未入账）。
 * - 豁免面：工作区切换域级 release（prepareRecoveryWorkspaceSwitch 直连
 *   markCleanAwaitable）不经本 gate——域级弃置后副本由下次启动屏障承接（INV-167
 *   无害族）。副本留驻≠丢稿：下次进入该工作区时确认条决策面重现。
 */
export interface RecoveryCleanGateView {
  /** 稍后处理/pending 拒写 chip（true=恢复副本待处理——旧槽未决策） */
  pendingChip: boolean
}

/**
 * true=拦截 release（调用方跳过 release 调用与账本 token 清空；gen++/写面复位
 * 不受影响——INV-161 复位语义保持）。
 */
export function cleanReleaseBlocked(state: RecoveryCleanGateView): boolean {
  return state.pendingChip === true
}
