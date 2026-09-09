// b3: P7-H
/**
 * [F-LG14] LineageSideTags —— 侧板标签编辑分节（LineageSidePanel 拆件——
 * 组件行数红线落点）。
 *
 * 行为：既有标签小片渲染（行内 × 移除）+输入添加（Enter/＋按钮）；同名
 * 添加短路（同节点去重第一道 UX 防——第二道=main repo 写边界单源）；
 * 增删即时持久化=整组上抛 onSetTags（Page 编排→lineage.store.setNodeTags
 * →既有 upsert-node 通道）；空串不派发（draft 协议 min(1) 同源口径）。
 */
import { useState } from 'react'
import type { CSSProperties } from 'react'
import type { LineageNode } from '@shared/models/lineage'

/** 标签小片样式（红示意：红字小片——用户图7「红小块」） */
const SIDE_TAG_CHIP: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  borderRadius: 3,
  fontSize: 'var(--fs-caption)',
  color: 'var(--danger)',
  background: 'var(--danger-a08)',
  border: '1px solid var(--danger-a25)'
}

export function LineageSideTags(props: {
  node: LineageNode
  onSetTags(nodeId: string, tags: string[]): void
}): JSX.Element {
  const { node } = props
  const [tagInput, setTagInput] = useState('')
  const tags = node.tags ?? []

  const addTag = (): void => {
    const t = tagInput.trim()
    if (t === '' || tags.includes(t)) return
    props.onSetTags(node.id, [...tags, t])
    setTagInput('')
  }
  const removeTag = (t: string): void => {
    props.onSetTags(node.id, tags.filter((x) => x !== t))
  }

  return (
    <section data-testid="lineage-side-tags">
      <h4 className="m-0 pl-1.5 font-medium" style={{ borderLeft: '3px solid var(--accent)', color: 'var(--text-dim)' }}>
        标签
      </h4>
      <div className="flex flex-wrap items-center gap-1">
        {tags.map((t) => (
          <span key={t} data-testid="lineage-tag-chip" className="gap-0.75 px-1" style={SIDE_TAG_CHIP}>
            {t}
            <button
              type="button"
              data-testid="lineage-tag-remove"
              aria-label={`移除标签 ${t}`}
              className="leading-none"
              style={{ color: 'var(--danger)' }}
              onClick={() => removeTag(t)}
            >
              ×
            </button>
          </span>
        ))}
        <input
          data-testid="lineage-tag-input"
          className="w-24 rounded border px-1.5 py-0.5 text-xs"
          style={{ borderColor: 'var(--border)' }}
          value={tagInput}
          aria-label="新标签名"
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') addTag()
          }}
        />
        <button
          type="button"
          className="rounded border px-1.5 py-0.5 text-xs"
          style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}
          onClick={addTag}
        >
          +
        </button>
      </div>
    </section>
  )
}
