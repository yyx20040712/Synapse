/**
 * [F-UIRES-03 B1 2026-10-05] TagDeleteConfirm —— 标签批量删除确认窗
 * （TagDropdown 拆件：组件 250 行红线；Dialog 底座）。票面：点删除钮→确认窗
 * （列出将被删除的标签名清单）→确认→逐个 tags/delete（顺序执行；paper_tags
 * 级联在 main 面）→成功后 refresh+INV-53 死 id 顺序（被删 id 从筛选集剔除
 * 先于 onMutated）；失败 toast+确认窗保持开（S6 同型），已删部分照常剔除
 * （死 id 零滞留窗），重试只删剩余（清单随 store 链式 refresh 自愈）。
 *
 * ── 接口层 ──
 * - export function TagDeleteConfirm(props: { targets: TagWithCount[];
 *     selectedTagIds: string[]; onFilterChange(ids: string[]): void;
 *     onMutated?(): void; onClose(): void }): JSX.Element
 */
import { Dialog } from '../../shared/ui/Dialog'
import { showToast } from '../../shared/ui/Toast'
import { useTagsStore, type TagWithCount } from './tags.store'
import { useBusyGuard } from './TagLifecycle'

export function TagDeleteConfirm(props: {
  /** 现存待删清单（TagDropdown 侧由 tags ∩ confirming 派生——自愈面） */
  targets: TagWithCount[]
  selectedTagIds: string[]
  onFilterChange: (ids: string[]) => void
  onMutated?: () => void
  /** 收口关闭（取消/全删成功——busy 飞行中经 requestClose 守卫禁关） */
  onClose(): void
}): JSX.Element {
  const guard = useBusyGuard()
  const deleteTag = useTagsStore((s) => s.deleteTag)
  // N1：busy 飞行中禁关——Dialog 的 Esc/遮罩/✕ 全关闭路径经此包装
  const requestClose = (): void => guard.requestClose(props.onClose)

  async function doDelete(): Promise<void> {
    if (!guard.begin()) return
    const deleted: string[] = []
    for (const t of props.targets) {
      const r = await deleteTag(t.id)
      if (r.ok) {
        deleted.push(t.id)
      } else {
        showToast(r.error.message, 'error')
        break
      }
    }
    guard.end()
    // INV-53：已删 id 从筛选集剔除先于 onMutated（部分失败亦然——死 id 零滞留）
    if (deleted.length > 0) {
      const remaining = props.selectedTagIds.filter((id) => !deleted.includes(id))
      if (remaining.length !== props.selectedTagIds.length) props.onFilterChange(remaining)
      props.onMutated?.()
    }
    // 全删成功才收口关窗；部分失败=窗保持开（S6 同型，清单已自愈为剩余面）
    if (deleted.length === props.targets.length) props.onClose()
  }

  return (
    <Dialog open title="删除标签" onClose={requestClose}>
      <p className="lib-dd-del-p">将删除以下标签（与文献的关联一并移除，不可恢复）：</p>
      <ul className="lib-dd-del-list">
        {props.targets.map((t) => (
          <li key={t.id}>{t.name}</li>
        ))}
      </ul>
      <div className="lib-dd-del-actions">
        <button
          type="button"
          className="lib-dd-del-cancel"
          disabled={guard.busy}
          onClick={requestClose}
        >
          取消
        </button>
        <button
          type="button"
          className="lib-dd-del-ok"
          disabled={guard.busy}
          onClick={() => void doDelete()}
        >
          删除
        </button>
      </div>
    </Dialog>
  )
}
