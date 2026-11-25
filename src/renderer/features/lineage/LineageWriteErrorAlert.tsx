// b3: B5 wave C
/**
 * [B5 设计稿 §2.4/§3.2/§6.1/§6.2/§6.3/§10.3——wave C 2026-11-25] LineageWriteErrorAlert —— 写失败单告警
 * （按失败源分流），挂稳定 Page 外壳：LineageToolbar 内=横滚容器的兄弟节点，edit/browse/focus 三模式可达
 * （R4——取代 B4「只在 edit 可见」的旧限制）。
 *
 * ── 行为层 ──
 * - 一条告警、按源分流：投影单源=lineage-write-failure writeErrorAlert（§2.4 表）——本件零第二错误态、
 *   零 IPC、不另立 source 判别。
 *   · save：`保存失败：{message}`＋保存重试（testid lineage-save-retry→store.retrySave→finalize；
 *     store 的 source guard 是第二道防线）；
 *   · history-undo／history-redo：方向文案＋「历史栈未变化，重按撤销/重做即可重试」——无保存重试
 *     （重试入口=重按原方向命令，不能经 finalize 绕过原命令）；
 *   · 缺源非法态：显示原始真实消息、无任何重试钮（UI fail closed）。
 * - 非 error 相位不渲染（clean/dirty/saving 无告警）。
 * - 过期历史丢弃出口与来源无关（较早的 stale 标记仍合法时，save 与 history 告警都可带；两者含义不同，
 *   不由一个按钮兼任）：出口本体=LineageStaleHistoryDrop 按 staleHistoryAtTop 自判。
 * - graph load error 是另一型告警（LineagePageBody 的 role=alert＋lineage-load-retry），不与本件合并。
 *
 * ── 接口层 ── export function LineageWriteErrorAlert(): JSX.Element | null
 *
 * ── 架构层 ── 受控件：读 store 活动投影三字段；重试经 store 动作（registry 单一写路径）。
 * 受控锚：data-testid=lineage-save-error（沿用——减少数据面 e2e 迁移）、role=alert。
 */
import { RetryButton } from '../../shared/ui/RetryButton'
import { useLineageStore } from './lineage.store'
import { LineageStaleHistoryDrop } from './LineageStaleHistoryDrop'
import { writeErrorAlert } from './lineage-write-failure'

export function LineageWriteErrorAlert(): JSX.Element | null {
  const saveStatus = useLineageStore((s) => s.saveStatus)
  const lastWriteError = useLineageStore((s) => s.lastWriteError)
  const lastWriteErrorSource = useLineageStore((s) => s.lastWriteErrorSource)
  const alert = writeErrorAlert({ saveStatus, lastWriteError, lastWriteErrorSource })
  if (alert.kind !== 'alert') return null
  return (
    <div className="lg-save-error" role="alert" data-testid="lineage-save-error">
      <span className="lg-save-error-text">{alert.text}</span>
      {alert.retrySave && <RetryButton testId="lineage-save-retry" onClick={() => useLineageStore.getState().retrySave()} />}
      {alert.dropStale && <LineageStaleHistoryDrop />}
    </div>
  )
}
