// b3: P7-H
/**
 * [F-LG15] LineageManualParentDialog —— 连接父文献目标选择对话框（Board
 * 子组件，LineageAddNodeDialog 形态 crib）。
 *
 * 行为：为子节点（props.node）选一个人工父——候选=图中既有节点（自身与
 * 已有同端点对边端点过滤防呆——service 互斥守卫前置 UX 面）；搜索框本地
 * 过滤（title 子串）；逻辑线说明 label 可选输入（创建即填——后编辑走
 * 「管理人工连线…」）；未选目标禁用确认。确认动作上抛 {parentId,label}
 * ——写路径收口 Board→store.linkManualParent（kind='manual'，不限条数=
 * 用户裁决——重复连接不同父均通过，同端点对由 service 互斥守卫拒）。
 */
import { useState } from 'react'
import { Dialog } from '../../shared/ui/Dialog'
import type { LineageEdge, LineageNode } from '@shared/models/lineage'

export function LineageManualParentDialog(props: {
  node: LineageNode
  /** 图中全部节点（候选源——Board 自 store 分发传入） */
  nodes: LineageNode[]
  /** 图中全部边（同端点对防呆过滤——已连端点对不再列候选） */
  edges: LineageEdge[]
  onClose(): void
  onConfirm(parentId: string, label: string): void
}): JSX.Element {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<LineageNode | null>(null)
  const [label, setLabel] = useState('')

  // 候选过滤：自身排除+同端点对已有边（任一 kind——三方互斥防呆）的 from 排除
  const candidates = props.nodes.filter((n) => {
    if (n.id === props.node.id) return false
    return !props.edges.some((e) => e.fromNode === n.id && e.toNode === props.node.id)
  })
  const keyword = search.trim()
  const visible = keyword === '' ? candidates : candidates.filter((n) => n.title.includes(keyword))

  const confirm = (): void => {
    if (selected === null) return
    props.onConfirm(selected.id, label.trim())
    props.onClose()
  }

  return (
    <Dialog open title={`连接父文献：${props.node.title}`} onClose={props.onClose}>
      <div className="flex flex-col gap-2">
        <input
          data-testid="manual-parent-search"
          aria-label="搜索候选父节点（标题）"
          className="rounded border px-2 py-1 text-xs"
          style={{ borderColor: 'var(--border)' }}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setSelected(null) }}
        />
        {visible.length === 0 ? (
          <p className="m-0 text-xs" style={{ color: 'var(--text-dim)' }}>
            无候选父节点（或该端点对已连线）
          </p>
        ) : (
          <ul className="m-0 flex max-h-56 list-none flex-col gap-1 overflow-auto p-0">
            {visible.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  data-testid="manual-parent-item"
                  className="w-full rounded border px-2 py-1 text-left text-xs"
                  style={
                    selected?.id === n.id
                      ? { borderColor: 'var(--accent)', background: 'var(--accent-soft)' }
                      : { borderColor: 'var(--border)' }
                  }
                  onClick={() => setSelected(n)}
                >
                  {n.title}（{n.year === null ? '未知年份' : n.year}）
                </button>
              </li>
            ))}
          </ul>
        )}
        <input
          data-testid="manual-parent-label"
          aria-label="逻辑线说明（可选——人工父连线的依据）"
          className="rounded border px-2 py-1 text-xs"
          style={{ borderColor: 'var(--border)' }}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button type="button" className="rounded border px-3 py-1 text-xs" style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }} onClick={props.onClose}>
          取消
        </button>
        <button
          type="button"
          disabled={selected === null}
          className="rounded px-3 py-1 text-xs text-white"
          style={{ background: selected === null ? 'var(--border)' : 'var(--accent)' }}
          onClick={confirm}
        >
          连接
        </button>
      </div>
    </Dialog>
  )
}
