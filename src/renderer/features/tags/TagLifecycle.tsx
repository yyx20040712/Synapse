// b3: P7-E
/**
 * [P7E-01] TagLifecycle —— 标签生命周期三对话框（TagFilter 子组件，组件≤250
 * 拆件；菜单在 TagLifecycleMenu.tsx）。Dialog 底座，LineageTagDialog 同型。
 * 写路径收口 tags.store 命令型动作；busy 守卫用 ref（同步检查——同批多次
 * click 在 React 重渲染前也只放行一次，S8）；失败 toast+对话框保持开（S6）；
 * busy 飞行中禁关（N1 回炉：取消按钮 disabled+Dialog onClose 包装 no-op——
 * 防「对话框已关、变更随后生效」语义错位，与保存按钮 disabled 态对齐）；
 * 成功经 props.onMutated(disappearedId) 上抛——死 id 筛选清空顺序归 TagFilter。
 */
import { useRef, useState } from 'react'
import { Dialog } from '../../shared/ui/Dialog'
import { showToast } from '../../shared/ui/Toast'
import type { Tag } from '@shared/models/tag'
import { useTagsStore, type TagWithCount } from './tags.store'

/**
 * busy 守卫（ref 同步检查防同批双击——S8；setBusy 只管按钮禁用态渲染）。
 * requestClose=关闭守卫（N1）：mutation 飞行中 no-op——取消/遮罩/✕/Esc 全
 * 关闭路径统一过此门（Dialog 的 onClose 收包装后的回调）。
 * [F-TAGS-01] 导出供 TagColorDialog 同构复用（域内单源）。
 */
export function useBusyGuard(): {
  busy: boolean
  begin(): boolean
  end(): void
  requestClose(onClose: () => void): void
} {
  const pending = useRef(false)
  const [busy, setBusy] = useState(false)
  return {
    busy,
    begin(): boolean {
      if (pending.current) return false
      pending.current = true
      setBusy(true)
      return true
    },
    end(): void {
      pending.current = false
      setBusy(false)
    },
    requestClose(onClose: () => void): void {
      if (!pending.current) onClose()
    }
  }
}

/** onMutated 载荷：消失的标签 id（rename=null——id 稳定；merge=源 id；delete=自身 id） */
export type MutatedPayload = (disappearedId: string | null) => void

export function TagRenameDialog(props: {
  tag: Tag
  onClose(): void
  onMutated: MutatedPayload
}): JSX.Element {
  const [value, setValue] = useState(props.tag.name)
  const guard = useBusyGuard()
  const renameTag = useTagsStore((s) => s.renameTag)
  const trimmed = value.trim()
  // N1：busy 飞行中禁关——Dialog 的 Esc/遮罩/✕ 全关闭路径经此包装
  const requestClose = (): void => guard.requestClose(props.onClose)

  async function save(): Promise<void> {
    if (trimmed === '' || !guard.begin()) return
    const r = await renameTag(props.tag.id, trimmed)
    if (r.ok) {
      // rename：id 稳定→筛选不动（S5），disappearedId=null
      props.onMutated(null)
      props.onClose()
    } else {
      // S6：toast+保持开（输入保留），发起方 toast 契约
      showToast(r.error.message, 'error')
      guard.end()
    }
  }

  return (
    <Dialog open title={`重命名标签：${props.tag.name}`} onClose={requestClose}>
      <input
        aria-label="新标签名"
        className="w-full rounded border px-2 py-1 text-xs"
        style={{ borderColor: 'var(--border)' }}
        value={value}
        disabled={guard.busy}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          // [F-TAGS-01 R6] IME 组词确认回车不提交（TagEditor 三路提交同守卫
          // ——同类面排查承接，只加守卫不扩散三路化）
          if (e.nativeEvent.isComposing) return
          if (e.key === 'Enter') void save()
        }}
      />
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          className="rounded border px-3 py-1 text-xs disabled:opacity-50"
          style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}
          disabled={guard.busy}
          onClick={requestClose}
        >
          取消
        </button>
        <button
          type="button"
          className="rounded px-3 py-1 text-xs text-white disabled:opacity-50"
          style={{ background: 'var(--accent)' }}
          disabled={trimmed === '' || guard.busy}
          onClick={() => void save()}
        >
          保存
        </button>
      </div>
    </Dialog>
  )
}

export function TagMergeDialog(props: {
  source: TagWithCount
  /** 其他标签（排除源——点选即确认，TagEditor suggestions 同型 chip 列表） */
  targets: TagWithCount[]
  onClose(): void
  onMutated: MutatedPayload
}): JSX.Element {
  const guard = useBusyGuard()
  const mergeTags = useTagsStore((s) => s.mergeTags)
  // N1：busy 飞行中禁关（Dialog Esc/遮罩/✕ 全路径包装）
  const requestClose = (): void => guard.requestClose(props.onClose)

  async function pick(targetId: string): Promise<void> {
    if (!guard.begin()) return
    const r = await mergeTags(props.source.id, targetId)
    if (r.ok) {
      props.onMutated(props.source.id) // 源 id 已消失（S3）
      props.onClose()
    } else {
      showToast(r.error.message, 'error')
      guard.end()
    }
  }

  return (
    <Dialog open title={`合并标签：${props.source.name}`} onClose={requestClose}>
      <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
        将「{props.source.name}」的文献挂接全部并入目标标签（双挂文献自动去重），随后删除该标签。
      </p>
      <div className="mt-2 flex flex-wrap gap-1" aria-label="合并目标列表">
        {props.targets.map((t) => (
          <button
            key={t.id}
            type="button"
            className="rounded-full border px-2 py-0.5 text-xs disabled:opacity-50"
            style={{ borderColor: 'var(--border)' }}
            disabled={guard.busy}
            onClick={() => void pick(t.id)}
          >
            {t.name}{' '}
            <span className="lib-chip-n">{`×${t.paperCount}`}</span>
          </button>
        ))}
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          className="rounded border px-3 py-1 text-xs disabled:opacity-50"
          style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}
          disabled={guard.busy}
          onClick={requestClose}
        >
          取消
        </button>
      </div>
    </Dialog>
  )
}

export function TagDeleteDialog(props: {
  tag: TagWithCount
  onClose(): void
  onMutated: MutatedPayload
}): JSX.Element {
  const guard = useBusyGuard()
  const deleteTag = useTagsStore((s) => s.deleteTag)
  // N1：busy 飞行中禁关（Dialog Esc/遮罩/✕ 全路径包装）
  const requestClose = (): void => guard.requestClose(props.onClose)

  async function confirm(): Promise<void> {
    if (!guard.begin()) return
    const r = await deleteTag(props.tag.id)
    if (r.ok) {
      props.onMutated(props.tag.id) // 该 id 已消失（S2）
      props.onClose()
    } else {
      showToast(r.error.message, 'error')
      guard.end()
    }
  }

  return (
    <Dialog open title={`删除标签：${props.tag.name}`} onClose={requestClose}>
      <p className="text-xs">
        {props.tag.paperCount > 0
          ? `将删除标签「${props.tag.name}」及其在 ${props.tag.paperCount} 篇文献上的挂接`
          : `将删除标签「${props.tag.name}」——尚无文献挂接`}
      </p>
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          className="rounded border px-3 py-1 text-xs disabled:opacity-50"
          style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}
          disabled={guard.busy}
          onClick={requestClose}
        >
          取消
        </button>
        <button
          type="button"
          className="rounded px-3 py-1 text-xs text-white disabled:opacity-50"
          style={{ background: 'var(--danger)' }}
          disabled={guard.busy}
          onClick={() => void confirm()}
        >
          确认删除
        </button>
      </div>
    </Dialog>
  )
}
