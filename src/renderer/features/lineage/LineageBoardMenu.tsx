// b3: P7-H
/**
 * [F-SPLIT-01] LineageBoardMenu —— 节点菜单+连线目标选取提示条（自
 * LineageBoard 拆出 2026-09-05；迁移 LineageBoard 头注节点菜单/加边/改父/
 * 目标选取职责段，JSX 语句零改纯搬运）。
 *
 * ── 行为层（原 LineageBoard 菜单+选取流程面）──
 * - **加边**=源节点菜单「连线到…」目标选取；**改父**=既有子边删除+新边添加
 *   两动作组合（UI 呈现单操作，service 两调用——树约束下改父=换父）；
 *   **删边/删节点**=节点菜单
 * - **树约束 UI 守卫**（INV-27 消费面）：加边 to 已有父/成环/自环三拒绝路径=
 *   动作型 toast 中文 reason（**树守卫宿主=LG-01 service upsertEdge 运行时
 *   守卫**——本件零守卫代码只接 toast 呈现=双保险同 08 按钮禁用语义）
 * - 目标选取模式（源节点菜单发起：「连线到…」/「改父…」）提示条（激活期
 *   ——R2-LG11 浅色板态：白底 accent 描边，行为零变）
 * - 父边/管理入边派生驻本件（edges 经 store 自订阅；[F-LGRAPH-01②U8]
 *   kind 收敛后=首条入边+其余入边拆分）
 * - 状态归属不变：menu/pendingLink 与各对话框开关由宿主 LineageBoard 持有，
 *   本件经 props 收值+set 函数回写；store 写路径仍经 getState 单口
 *
 * ── 接口层 ──
 * - export interface PendingLink / export function LineageBoardMenu(props:
 *   { menu; pendingLink; setMenu; setPendingLink; setManualParentId;
 *   setManualManageId; setIdeaNodeId; setTagNodeId }): JSX.Element
 */
import { useLineageStore } from './lineage.store'
import { LineageNodeMenu } from './LineageNodeMenu'
import type { LineageNode } from '@shared/models/lineage'

/** 目标选取模式（源节点菜单发起：「连线到…」/「改父…」；[F-LGRAPH-01②U8]
 *  ref 参考连接模式随综述边体系退役删除） */
export interface PendingLink {
  source: string
  mode: 'link' | 'reparent'
}

const MODE_HINT: Record<PendingLink['mode'], string> = {
  link: '连线模式：点击目标节点（源 → 目标，目标成为子节点）',
  reparent: '改父模式：点击新父节点'
}

/** 节点菜单锚（node+右键锚点——宿主 menu state 形状） */
export type MenuTarget = { node: LineageNode; anchor: { x: number; y: number } }

export function LineageBoardMenu(props: {
  menu: MenuTarget | null
  pendingLink: PendingLink | null
  setMenu: (v: MenuTarget | null) => void
  setPendingLink: (v: PendingLink | null) => void
  setIdeaNodeId: (v: string | null) => void
  setTagNodeId: (v: string | null) => void
}): JSX.Element {
  const { menu, pendingLink, setMenu, setPendingLink, setIdeaNodeId, setTagNodeId } = props
  const edges = useLineageStore((s) => s.edges)
  const store = useLineageStore.getState

  // 父边=首条入边（[②U5] 人工父双对话框入口退役——边级管理面=线身右键菜单
  // 「命名/线形与颜色/删除连线」承载；父边删除入口沿承）
  const menuInEdges = menu === null ? [] : edges.filter((e) => e.toNode === menu.node.id)
  const menuParentEdge = menuInEdges[0] ?? null

  return (
    <>
      {/* 目标选取模式提示条（连线到…/改父…激活期——R2-LG11 浅色板态：
          白底 accent 描边，行为零变） */}
      {pendingLink !== null && (
        <div
          className="absolute left-1/2 top-2 z-(--z-float) flex -translate-x-1/2 items-center gap-2 rounded border px-3 py-1 text-xs"
          style={{ borderColor: 'var(--accent)', background: 'var(--panel)', color: 'var(--accent)' }}
          data-testid="lineage-pending-link"
        >
          <span>{MODE_HINT[pendingLink.mode]}</span>
          <button type="button" className="underline" onClick={() => setPendingLink(null)}>
            取消
          </button>
        </div>
      )}

      {menu !== null && (
        <LineageNodeMenu
          node={menu.node}
          parentEdge={menuParentEdge}
          anchor={menu.anchor}
          onClose={() => setMenu(null)}
          onLinkTo={(id) => { setPendingLink({ source: id, mode: 'link' }); setMenu(null) }}
          onReparent={(id) => { setPendingLink({ source: id, mode: 'reparent' }); setMenu(null) }}
          onEditIdea={(id) => { setIdeaNodeId(id); setMenu(null) }}
          onAddTag={(id) => { setTagNodeId(id); setMenu(null) }}
          onRemoveParentEdge={(edgeId) => { store().removeEdge(edgeId); setMenu(null) }}
          onRemoveNode={(id) => { store().removeNode(id); setMenu(null) }}
        />
      )}
    </>
  )
}
