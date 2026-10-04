// b3: P7-H
/**
 * [F-LGRAPH-01②U5] EdgeMenuHost —— 调线菜单宿主（EdgeOverlay 拆件——组件
 * 250 行红线）：线/顶点两态菜单渲染+动作收口（store 单口——一动作=一
 * 编辑单元沿 store 各方法；删点分治=edge-edit 代数单源）。
 * [回炉 R14] 菜单 portal 出 .tl-content（transform 祖先劫持 fixed 包含块
 * ——缩放态错位根治；fixed 定位恢复视口基准）。
 * [F-ALIGN-01] 画布空白菜单态随「建点入口…」唯一菜单项退役删除——本件
 * 收窄为线/顶点两态（selEdge 恒非空——宿主闸保证，动作经 null 守卫防御）。
 */
import { createPortal } from 'react-dom'
import type { LineageEdge, LineageViaPoint } from '@shared/models/lineage'
import type { EditPolyline } from './edge-edit'
import { deleteVertex as deleteVertexAlgebra } from './edge-edit'
import { EdgeMenu, type EdgeMenuTarget } from './EdgeMenu'
import { useLineageStore } from './lineage.store'

export function EdgeMenuHost(props: {
  target: EdgeMenuTarget
  selEdge: LineageEdge | null
  handlesPl: EditPolyline | null
  onClose(): void
}): JSX.Element {
  const { selEdge } = props
  return createPortal(
    <EdgeMenu
      target={props.target}
      dashed={selEdge?.dashed ?? false}
      color={selEdge?.color ?? ''}
      onRename={(label) => {
        if (selEdge !== null && label !== '') useLineageStore.getState().editManualEdgeLabel(selEdge.id, label)
      }}
      onLineStyle={(dashed, color) => {
        if (selEdge !== null) useLineageStore.getState().applyEdgeLineStyle(selEdge.id, dashed, color)
      }}
      onReset={() => {
        // [回炉 R19] 自动线（via 已空）重置=no-op（零写零单元——重置目标缺席）
        if (selEdge === null || selEdge.via === undefined) return
        useLineageStore.getState().setEdgeVia(selEdge.id, undefined)
      }}
      onDelete={() => {
        if (selEdge !== null) useLineageStore.getState().removeEdge(selEdge.id)
      }}
      onDeleteVertex={() => {
        const menu = props.target
        if (selEdge === null || menu.kind !== 'vertex' || props.handlesPl === null) return
        const out: { via: LineageViaPoint[] | undefined } = deleteVertexAlgebra(props.handlesPl, menu.idx)
        useLineageStore.getState().setEdgeVia(selEdge.id, out.via)
      }}
      onClose={props.onClose}
    />,
    document.body
  )
}
