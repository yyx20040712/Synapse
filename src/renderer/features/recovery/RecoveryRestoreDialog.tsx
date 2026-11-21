/**
 * [F-RECOV-04] RecoveryRestoreDialog —— 恢复决策确认框（纯展示件——props 驱动；
 * 文案与计数单源驻 app 组合层 RecoveryBarHost 的 restoreDecisionView——本件
 * 零 feature 域依赖、零 store 读取，跨 feature 分层由 quality 强制〔回炉 B-1〕）。
 * 复用 shared/ui/Dialog——不重写模态机制。
 *
 * ── props 契约 ──
 * - title/lines/danger：宿主装配的呈现文案（行动数/草稿注记/冲突清单已在宿主
 *   展开，本件逐行直渲）。
 * - confirmLabel=null：通知型（单「好」钮——预检读取失败通知，终裁②阻断态）。
 * - danger=true：确认钮 danger 形（放弃不可逆）。
 * - onSettle(true)=确认钮；onSettle(false)=取消/X/ESC/遮罩。
 */
import { Dialog } from '../../shared/ui/Dialog'
import { Button } from '../../shared/ui/Button'

export interface RecoveryRestoreDialogProps {
  title: string
  lines: string[]
  /** null=通知型（单「好」钮） */
  confirmLabel: string | null
  danger: boolean
  onSettle(v: boolean): void
}

export function RecoveryRestoreDialog(props: RecoveryRestoreDialogProps): JSX.Element {
  return (
    <Dialog
      open
      title={props.title}
      onClose={() => props.onSettle(false)}
      actions={
        props.confirmLabel === null ? (
          <Button variant="secondary" size="sm" onClick={() => props.onSettle(false)}>
            好
          </Button>
        ) : (
          <>
            <Button variant="ghost" size="sm" onClick={() => props.onSettle(false)}>
              取消
            </Button>
            <Button
              variant={props.danger ? 'danger' : 'primary'}
              size="sm"
              onClick={() => props.onSettle(true)}
            >
              {props.confirmLabel}
            </Button>
          </>
        )
      }
    >
      <div className="flex flex-col gap-1 text-xs leading-6" style={{ color: 'var(--text)' }}>
        {props.lines.map((line, i) => (
          <p key={i}>{line}</p>
        ))}
      </div>
    </Dialog>
  )
}
