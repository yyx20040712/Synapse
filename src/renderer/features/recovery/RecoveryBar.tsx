/**
 * [F-VISFB-65 U7] RecoveryBar —— 恢复副本确认条（纯展示件——props 驱动，
 * 跨域接线在 app/RecoveryBarHost 组合层；设计书 §6）。
 *
 * 行为面（状态×呈现全表）：
 * - available：「脉络图暂存会话·<writtenAt 本地时间>·待保存动作 N（含未收口
 *   草稿）」+〔恢复〕〔放弃〕
 * - invalid/foreign-version：「无法读取的副本」+〔放弃〕（仅——INV-160 用户
 *   release 唯一删除径）
 * - 死文件夹（deadFolder）：「原文件夹已删除，副本无法恢复」+〔放弃〕（主）
 *   +〔稍后处理〕（收起条开门可编辑——W-07）
 * - busy（恢复/放弃在途）：行按钮禁用
 * - 收起后 chip（pendingChip）：「恢复副本待处理，当前编辑未受保护」常驻
 *   +〔查看〕重开条（再冻结直到决策）
 * - degraded chip：「恢复副本不可用——当前编辑未受保护」常驻（INV-166——
 *   不 toast 轰炸、不阻断编辑）
 */
/** 确认条状态面（结构兼容消费调度器 RecoveryUiState——跨域禁 import 故
 *  本件自持窄形：字段为调度器状态的结构子集，赋值方向恒兼容） */
export interface RecoveryBarState {
  phase: 'idle' | 'checking' | 'await-decision' | 'open'
  slotKind: 'available' | 'invalid' | 'foreign-version' | null
  file: { writtenAt: string; actionCount: number; draftPresent: boolean } | null
  deadFolder: boolean
  busy: boolean
  pendingChip: boolean
  degraded: boolean
}

export interface RecoveryBarProps {
  state: RecoveryBarState
  onRestore(): void
  onDiscard(): void
  onDefer(): void
  onReopen(): void
}

/** available 行时间呈现（本地时间；空/非法串=省略段） */
function localTime(iso: string): string {
  if (iso === '') return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : `·${d.toLocaleString()}`
}

export function RecoveryBar(props: RecoveryBarProps): JSX.Element | null {
  const { state } = props
  if (state.phase === 'await-decision' && state.file !== null) {
    const isAvailable = state.slotKind === 'available'
    const summary = isAvailable
      ? `脉络图暂存会话${localTime(state.file.writtenAt)}·待保存动作 ${state.file.actionCount}${
          state.file.draftPresent ? '（含未收口草稿）' : ''
        }`
      : '无法读取的副本'
    const title = state.deadFolder ? '原文件夹已删除，副本无法恢复' : summary
    return (
      <div className="recovery-bar" role="region" aria-label="恢复副本确认条" data-testid="recovery-bar">
        <span className="recovery-bar-text">{title}</span>
        <span className="recovery-bar-actions">
          {isAvailable && !state.deadFolder && (
            <button type="button" disabled={state.busy} onClick={props.onRestore} data-testid="recovery-restore">
              恢复
            </button>
          )}
          <button
            type="button"
            className={state.deadFolder ? 'recovery-primary' : undefined}
            disabled={state.busy}
            onClick={props.onDiscard}
            data-testid="recovery-discard"
          >
            放弃
          </button>
          {state.deadFolder && (
            <button type="button" disabled={state.busy} onClick={props.onDefer} data-testid="recovery-defer">
              稍后处理
            </button>
          )}
        </span>
      </div>
    )
  }
  // 收起态：chip 族（pendingChip/degraded 可叠加）
  if (state.phase !== 'open') return null
  if (!state.pendingChip && !state.degraded) return null
  return (
    <div className="recovery-bar recovery-bar-chips" role="region" aria-label="恢复副本状态" data-testid="recovery-chips">
      {state.pendingChip && (
        <span className="recovery-chip">
          恢复副本待处理，当前编辑未受保护
          <button type="button" onClick={props.onReopen} data-testid="recovery-reopen">
            查看
          </button>
        </span>
      )}
      {state.degraded && <span className="recovery-chip">恢复副本不可用，当前编辑未受保护</span>}
    </div>
  )
}
