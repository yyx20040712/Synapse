// b3: P7-H
/**
 * [LG-03] LineageEditIdeaDialog —— core_idea 编辑对话框（Board 子组件）。
 *
 * 行为：textarea 受控（初值=node.coreIdea；空串合法——core_idea 可清）。
 * 负面清单红线同族：纯 textarea 不做 md 渲染/富文本。保存动作上抛——
 * 写路径（全字段 upsert 防清 x/y）收口 Board→store。
 * 初值锚定：Board 以 key={nodeId} 挂载（换节点=重挂载重置初值）。
 */
import { useState } from 'react'
import { Dialog } from '../../shared/ui/Dialog'
import type { LineageNode } from '@shared/models/lineage'

export function LineageEditIdeaDialog(props: {
  open: boolean
  node: LineageNode
  onClose(): void
  onSave(nodeId: string, coreIdea: string): void
}): JSX.Element | null {
  const [value, setValue] = useState(props.node.coreIdea)

  const save = (): void => {
    props.onSave(props.node.id, value)
    props.onClose()
  }

  return (
    <Dialog open={props.open} title={`编辑核心想法：${props.node.title}`} onClose={props.onClose}>
      <textarea
        data-testid="core-idea-input"
        className="h-40 w-full resize-none rounded border p-2 text-xs"
        style={{ borderColor: 'var(--border)' }}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <div className="mt-3 flex justify-end gap-2">
        <button type="button" className="rounded border px-3 py-1 text-xs" style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }} onClick={props.onClose}>
          取消
        </button>
        <button type="button" className="rounded px-3 py-1 text-xs text-white" style={{ background: 'var(--accent)' }} onClick={save}>
          保存
        </button>
      </div>
    </Dialog>
  )
}
