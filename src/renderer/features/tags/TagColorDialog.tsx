// b3: F-TAGS-01
/**
 * [F-TAGS-01] TagColorDialog —— 标签颜色对话框（TagFilter 子组件，TagLifecycle
 * 三对话框同构：useBusyGuard busy 守卫/N1 busy 飞行中禁关/S6 失败 toast+保持开；
 * 写路径收口 tags.store.setTagColor——mutate 壳链式 refresh 单一数据源自愈）。
 *
 * 控件面：预设 8 swatch（shared TAG_COLOR_PRESETS——数据域用户身份色）+
 * 原生 input[type=color]（零新依赖，任意 hex）+「恢复默认」（null 路=accent）。
 * 选择态=本地 selected（hex|null），「确定」才落库；取消/关闭零写。
 * 成功经 props.onMutated(null) 上抛（id 稳定——rename 同型，筛选不动）。
 */
import { useState } from 'react'
import { TAG_COLOR_PRESETS, TAG_COLOR_NONE_DISPLAY } from '@shared/constants'
import { Dialog } from '../../shared/ui/Dialog'
import { showToast } from '../../shared/ui/Toast'
import { tagColorStyle } from '../../shared/ui-constants'
import { useTagsStore, type TagWithCount } from './tags.store'
import { type MutatedPayload, useBusyGuard } from './TagLifecycle'

export function TagColorDialog(props: {
  tag: TagWithCount
  onClose(): void
  onMutated: MutatedPayload
}): JSX.Element {
  const [selected, setSelected] = useState<string | null>(props.tag.color)
  const guard = useBusyGuard()
  const setTagColor = useTagsStore((s) => s.setTagColor)
  // N1：busy 飞行中禁关——Dialog 的 Esc/遮罩/✕ 全关闭路径经此包装
  const requestClose = (): void => guard.requestClose(props.onClose)

  async function save(): Promise<void> {
    if (!guard.begin()) return
    const r = await setTagColor(props.tag.id, selected)
    if (r.ok) {
      // 颜色变更 id 稳定→筛选不动（rename 同型），disappearedId=null
      props.onMutated(null)
      props.onClose()
    } else {
      // S6：toast+保持开（选择保留），发起方 toast 契约
      showToast(r.error.message, 'error')
      guard.end()
    }
  }

  return (
    <Dialog open title={`标签颜色：${props.tag.name}`} onClose={requestClose}>
      <div className="flex flex-wrap items-center gap-1.5" aria-label="预设颜色">
        {TAG_COLOR_PRESETS.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`预设颜色 ${c}`}
            aria-pressed={selected === c}
            className="h-5 w-5 rounded-full border disabled:opacity-50"
            style={{
              background: c,
              borderColor: selected === c ? 'var(--accent)' : 'var(--border)'
            }}
            disabled={guard.busy}
            onClick={() => setSelected(c)}
          />
        ))}
        <button
          type="button"
          aria-label="恢复默认"
          aria-pressed={selected === null}
          className="rounded-full border px-2 py-0.5 text-xs disabled:opacity-50"
          style={{
            borderColor: selected === null ? 'var(--accent)' : 'var(--border)',
            color: 'var(--text-dim)'
          }}
          disabled={guard.busy}
          onClick={() => setSelected(null)}
        >
          恢复默认
        </button>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <input
          type="color"
          aria-label="自定义颜色"
          className="h-6 w-10 cursor-pointer rounded border disabled:opacity-50"
          style={{ borderColor: 'var(--border)' }}
          // 默认态展示值仅载体（真实语义 null 由「恢复默认」承载）
          value={selected ?? TAG_COLOR_NONE_DISPLAY}
          disabled={guard.busy}
          onChange={(e) => setSelected(e.target.value.toLowerCase())}
        />
        <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
          自定义颜色（当前：{selected ?? '默认'}）
        </span>
      </div>
      <div className="mt-3 flex items-center justify-end gap-2">
        <span
          className="mr-auto inline-flex items-center rounded-full px-2 py-0.5 text-xs"
          style={
            tagColorStyle(selected) ?? { background: 'var(--accent-soft)' }
          }
        >
          {props.tag.name}
        </span>
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
          disabled={guard.busy}
          onClick={() => void save()}
        >
          确定
        </button>
      </div>
    </Dialog>
  )
}
