/**
 * [F-SPLIT-01] LineageBoardMenu —— 节点菜单装配（自 LineageBoard 拆出
 * 2026-09-05；[F-VISFB-66 裁定 2/3] 旧右键建边/换父目标选取模式与提示条随
 * 右键链路与换父业务退役整体删除——组件剩余面=MenuTarget 装配+父边派生+删除动作
 * 接线（F8：删后非空不整删；唯一建边径=锚点显式拖拽，旧换父业务=线条编辑换端）。
 *
 * - 父边派生驻本件（edges 经 store 自订阅）；状态归属不变：menu 由宿主
 *   LineageBoard 持有，本件经 props 收值+set 函数回写；store 写路径仍经
 *   getState 单口。
 *
 * ── 接口层 ──
 * - export function LineageBoardMenu(props: { menu; setMenu }): JSX.Element
 */
import { useLineageStore } from './lineage.store'
import { LineageNodeMenu } from './LineageNodeMenu'
import type { LineageNode } from '@shared/models/lineage'

/** 节点菜单锚（node+右键锚点——宿主 menu state 形状） */
export type MenuTarget = { node: LineageNode; anchor: { x: number; y: number } }

export function LineageBoardMenu(props: {
  menu: MenuTarget | null
  setMenu: (v: MenuTarget | null) => void
}): JSX.Element {
  const { menu, setMenu } = props
  const edges = useLineageStore((s) => s.edges)
  const store = useLineageStore.getState

  // 父边=首条入边（[②U5] 人工父双对话框入口退役——边级管理面=线身右键菜单
  // 「命名/线形与颜色/删除连线」承载；父边删除入口沿承）
  const menuInEdges = menu === null ? [] : edges.filter((e) => e.toNode === menu.node.id)
  const menuParentEdge = menuInEdges[0] ?? null

  return (
    <>
      {menu !== null && (
        <LineageNodeMenu
          node={menu.node}
          parentEdge={menuParentEdge}
          anchor={menu.anchor}
          onClose={() => setMenu(null)}
          onRemoveParentEdge={(edgeId) => { store().removeEdge(edgeId); setMenu(null) }}
          onRemoveNode={(id) => { store().removeNode(id); setMenu(null) }}
        />
      )}
    </>
  )
}
