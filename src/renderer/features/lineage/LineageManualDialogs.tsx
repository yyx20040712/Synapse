// b3: P7-H
/**
 * [F-LG15] LineageManualDialogs —— 人工父双对话框宿主（Board 拆件——组件
 * ≤250 行红线，LineageToolbar 拆件先例同型）：连接目标选择
 * （LineageManualParentDialog）与管理（LineageManualEdgesDialog——label 后
 * 编辑+删除）两件按 state 择一挂载；节点/边查找收口在本件——写路径仍经
 * 上抛回调收口 Board→store（linkManualParent/editManualEdgeLabel/removeEdge）。
 * key={nodeId} 重挂载重置输入（TagDialog 同型）。
 */
import type { LineageEdge, LineageNode } from '@shared/models/lineage'
import { LineageManualParentDialog } from './LineageManualParentDialog'
import { LineageManualEdgesDialog } from './LineageManualEdgesDialog'

export function LineageManualDialogs(props: {
  nodes: LineageNode[]
  edges: LineageEdge[]
  /** 连接父文献目标子节点 id（null=对话框关） */
  manualParentId: string | null
  /** 管理人工连线节点 id（null=对话框关） */
  manualManageId: string | null
  onCloseParent(): void
  onCloseManage(): void
  onLinkManualParent(childId: string, parentId: string, label: string): void
  onEditEdgeLabel(edgeId: string, label: string): void
  onRemoveEdge(edgeId: string): void
}): JSX.Element | null {
  const parentNode =
    props.manualParentId === null
      ? null
      : props.nodes.find((n) => n.id === props.manualParentId) ?? null
  const manageNode =
    props.manualManageId === null
      ? null
      : props.nodes.find((n) => n.id === props.manualManageId) ?? null
  const manageEdges =
    props.manualManageId === null
      ? []
      : props.edges.filter((e) => e.toNode === props.manualManageId && e.kind === 'manual')

  if (parentNode !== null) {
    return (
      <LineageManualParentDialog
        key={parentNode.id}
        node={parentNode}
        nodes={props.nodes}
        edges={props.edges}
        onClose={props.onCloseParent}
        onConfirm={(parentId, label) => props.onLinkManualParent(parentNode.id, parentId, label)}
      />
    )
  }
  if (manageNode !== null && manageEdges.length > 0) {
    return (
      <LineageManualEdgesDialog
        key={manageNode.id}
        node={manageNode}
        manualEdges={manageEdges}
        nodes={props.nodes}
        onClose={props.onCloseManage}
        onEditLabel={props.onEditEdgeLabel}
        onRemove={props.onRemoveEdge}
      />
    )
  }
  return null
}
