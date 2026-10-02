// b3: P7-H
/**
 * [F-LG14] LineageTagDialog —— 添加标签对话框（Board 子组件，LineageEditIdeaDialog
 * 同型）。行为：单行输入受控；空串禁用提交（空标签无语义不入库——draft 协议
 * min(1) 同源口径）；保存动作上抛——写路径（全字段 upsert 防清 x/y/tags）
 * 收口 Board→store.addNodeTag 语义（setNodeTags 合并数组）。初值锚定：
 * Board 以 key={nodeId} 挂载（换节点=重挂载重置输入）。
 */
import { useState } from 'react'
import { Dialog } from '../../shared/ui/Dialog'
import type { LineageNode } from '@shared/models/lineage'
import { TAG_NAME_MAX } from '@shared/models/tag'

export function LineageTagDialog(props: {
  open: boolean
  node: LineageNode
  onClose(): void
  onSave(nodeId: string, tag: string): void
}): JSX.Element | null {
  const [value, setValue] = useState('')
  const trimmed = value.trim()

  const save = (): void => {
    if (trimmed === '') return // 空标签不派发（提交短路）
    props.onSave(props.node.id, trimmed)
    props.onClose()
  }

  return (
    <Dialog open={props.open} title={`添加标签：${props.node.title}`} onClose={props.onClose}>
      <input
        data-testid="lineage-tag-input"
        maxLength={TAG_NAME_MAX}
        className="w-full rounded border px-2 py-1 text-xs"
        style={{ borderColor: 'var(--border)' }}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          // [F-TAGS-01 R6] IME 组词确认回车不提交（TagEditor 三路提交同守卫
          // ——同类面排查承接，只加守卫不扩散三路化）
          if (e.nativeEvent.isComposing) return
          if (e.key === 'Enter') save()
        }}
        aria-label="标签名（同节点同名自动去重）"
      />
      <div className="mt-3 flex justify-end gap-2">
        <button type="button" className="rounded border px-3 py-1 text-xs" style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }} onClick={props.onClose}>
          取消
        </button>
        <button
          type="button"
          className="rounded px-3 py-1 text-xs text-white"
          style={{ background: 'var(--accent)', opacity: trimmed === '' ? 0.5 : 1 }}
          disabled={trimmed === ''}
          onClick={save}
        >
          添加
        </button>
      </div>
    </Dialog>
  )
}
