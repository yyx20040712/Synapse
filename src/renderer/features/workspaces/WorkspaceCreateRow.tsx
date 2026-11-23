/**
 * [B4-A R2 §11.1] WorkspaceCreateRow —— 新建课题行纯拆件（自 WorkspacesPage
 * 拆出；纯受控输入+提交/取消键面）。
 *
 * ── 行为层 ──
 * - 名称输入+「创建并切换」（submitCreate 既有校验链在父件）；空名/纯空白=
 *   父件 no-op 提示；[F-UIRES-02 R3] Enter=创建并切换/Esc=清空（常驻输入取消
 *   语义=清空非卸载）/isComposing 守卫（shared/inline-keys 键面单源）
 *
 * ── 接口层 ──
 * - export function WorkspaceCreateRow(props: { name; onNameChange;
 *     onSubmit; onClear; busy })
 */
import { WORKSPACE_NAME_MAX } from '@shared/ipc/schemas'
import { inlineKeyDown } from '../../shared/inline-keys'

export function WorkspaceCreateRow(props: {
  name: string
  onNameChange(v: string): void
  onSubmit(): void
  onClear(): void
}): JSX.Element {
  const { name, onNameChange, onSubmit, onClear } = props
  return (
    <div className="ws-new-row">
      <input
        aria-label="新课题名称"
        maxLength={WORKSPACE_NAME_MAX}
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        // [F-UIRES-02 R3] Enter=创建并切换（submitCreate 既有校验链）；
        // Esc=清空（常驻输入取消语义=清空非卸载，无失焦提交面无 skip 语义）
        onKeyDown={(e) =>
          inlineKeyDown(
            e,
            () => onSubmit(),
            () => onClear(),
            () => undefined
          )
        }
      />
      <button type="button" className="ws-create" onClick={() => onSubmit()}>
        创建并切换
      </button>
    </div>
  )
}
