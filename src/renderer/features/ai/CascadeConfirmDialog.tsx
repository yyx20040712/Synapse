/**
 * [F-DBCAMP-01 DB-2 UI U6] CascadeConfirmDialog —— 级联删除第二确认窗
 * （设计 §1.6/§4.1：纯展示+回调件——不自取 preview、不执行删除）。
 *
 * ── 行为层 ──
 * - 文案（§1.6 逐字）：「将同时删除：会话 {a} 个/消息 {b} 条/记忆 {c} 条/
 *   任务 {d} 个；审计记录将保留」——counts 经 props 传入（预览提示值）。
 * - 按钮：「确认删除」（danger——busy=confirming 在途）/「取消」。
 * - confirming=true：确认钮 loading+取消/遮罩关闭禁用（删除在途不可中止）。
 *
 * ── 接口层 ──
 * - export function CascadeConfirmDialog(props): JSX.Element
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - 零 IPC 零状态（计数在途/失败面=宿主 useCascadeGuard 承载——禁双源）；
 *   测试：tests/unit/renderer/cascade-guard.test.tsx；e2e E5=ai-cascade-delete.spec.ts
 */
import { Button } from '../../shared/ui/Button'
import { Dialog } from '../../shared/ui/Dialog'
import type { AiCascadeCounts } from '@shared/models/ai-domain'

export function CascadeConfirmDialog(props: {
  counts: AiCascadeCounts
  /** 删除在途（确认钮 loading+取消禁用） */
  confirming: boolean
  onConfirm(): void
  onCancel(): void
}): JSX.Element {
  const { counts } = props
  return (
    <Dialog
      open
      title="确认删除 AI 会话资源？"
      onClose={() => {
        if (!props.confirming) props.onCancel()
      }}
      actions={
        <>
          <Button variant="ghost" size="sm" disabled={props.confirming} onClick={props.onCancel}>
            取消
          </Button>
          <Button
            variant="danger"
            size="sm"
            loading={props.confirming}
            onClick={props.onConfirm}
          >
            确认删除
          </Button>
        </>
      }
    >
      <p className="text-xs leading-6" style={{ color: 'var(--text)' }}>
        {`将同时删除：会话 ${counts.sessions} 个/消息 ${counts.messages} 条/记忆 ${counts.memories} 条/任务 ${counts.tasks} 个；审计记录将保留`}
      </p>
    </Dialog>
  )
}
