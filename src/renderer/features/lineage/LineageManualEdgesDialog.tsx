// b3: P7-H
/**
 * [F-LG15] LineageManualEdgesDialog —— 人工连线管理对话框（Board 子组件）：
 * label 后编辑+删除双入口（票面 §1「label 可后编辑：侧板/菜单；删除入口同
 * 菜单」——菜单路径承载）。
 *
 * 行为：列出该节点的全部 manual 入边（不限条数=用户裁决，逐行呈现）——
 * 每行=来自节点标题+label 输入（初值=现值）+保存（更新语义：id+端点+kind
 * 保持——store.editManualEdgeLabel）+删除（既有 remove-edge 通道）。
 * 动作全上抛——写路径收口 Board→store。
 */
import { useState } from 'react'
import { Dialog } from '../../shared/ui/Dialog'
import type { LineageEdge, LineageNode } from '@shared/models/lineage'

/** 单条 manual 入边行（label 受控输入独立 state——初值锚定挂载） */
function ManualEdgeRow(props: {
  edge: LineageEdge
  fromTitle: string
  onEditLabel(edgeId: string, label: string): void
  onRemove(edgeId: string): void
}): JSX.Element {
  const [value, setValue] = useState(props.edge.label)
  return (
    <div data-testid="manual-edge-row" className="flex items-center gap-2">
      <span className="shrink-0 text-xs" style={{ color: 'var(--text)' }}>
        来自 {props.fromTitle}
      </span>
      <input
        data-testid="manual-edge-label"
        aria-label={`逻辑线说明：来自 ${props.fromTitle}`}
        className="min-w-0 flex-1 rounded border px-2 py-1 text-xs"
        style={{ borderColor: 'var(--border)' }}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button
        type="button"
        className="shrink-0 rounded px-2 py-1 text-xs text-white"
        style={{ background: 'var(--accent)' }}
        onClick={() => props.onEditLabel(props.edge.id, value.trim())}
      >
        保存
      </button>
      <button
        type="button"
        data-testid="manual-edge-remove"
        className="shrink-0 rounded border px-2 py-1 text-xs"
        style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
        onClick={() => props.onRemove(props.edge.id)}
      >
        删除
      </button>
    </div>
  )
}

export function LineageManualEdgesDialog(props: {
  node: LineageNode
  /** 该节点的 manual 入边（Board 预过滤 kind=manual 且 toNode=node.id） */
  manualEdges: LineageEdge[]
  /** 图中全部节点（from 标题查表） */
  nodes: LineageNode[]
  onClose(): void
  onEditLabel(edgeId: string, label: string): void
  onRemove(edgeId: string): void
}): JSX.Element {
  const titleOf = (id: string): string => props.nodes.find((n) => n.id === id)?.title ?? id
  return (
    <Dialog open title={`管理人工连线：${props.node.title}`} onClose={props.onClose}>
      <div className="flex flex-col gap-2">
        {props.manualEdges.map((e) => (
          <ManualEdgeRow
            key={e.id}
            edge={e}
            fromTitle={titleOf(e.fromNode)}
            onEditLabel={props.onEditLabel}
            onRemove={props.onRemove}
          />
        ))}
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button type="button" className="rounded border px-3 py-1 text-xs" style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }} onClick={props.onClose}>
          关闭
        </button>
      </div>
    </Dialog>
  )
}
