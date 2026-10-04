// b3: P7-H
/**
 * [F-SPLIT-01] LineageBoardDialogs —— 节点编辑对话框组装配（自 LineageBoard
 * 拆出 2026-09-05；[F-ALIGN-01 2026-10-04] 建点对话框随手动建点路径
 * 全退役删除——节点唯一来源=入库 import/移动 moveFolder 两路，INV-NEW-1）：
 * 本件现装配 core_idea 单对话框（对话框本体 LineageEditIdeaDialog 为既有
 * 拆件；EditIdea=A3 批退役面——该批删本件挂点后本件随消亡）。
 * [A1b F-CONTRACTA-01 2026-10-04] 添加标签对话框件随脉络私有标签域退役
 * 删除——标签唯一源=文献库域（标签对话框挂点+store 写链同删）。
 *
 * ── 行为层（原 LineageBoard 对话框面）──
 * - core_idea 编辑=textarea（负面清单红线——md 只展示不渲染同族）；
 *   ideaNode 派生随迁本件（nodes 由宿主传入）
 * - 状态归属不变：对话框开关 id 由宿主 LineageBoard 持有，本件经 props
 *   收值+set 函数回写；store 写路径仍经 getState 单口
 *
 * ── 接口层 ──
 * - export function LineageBoardDialogs(props: { nodes; ideaNodeId;
 *   setIdeaNodeId }): JSX.Element
 */
import { useLineageStore } from './lineage.store'
import { LineageEditIdeaDialog } from './LineageEditIdeaDialog'
import type { LineageNode } from '@shared/models/lineage'

export function LineageBoardDialogs(props: {
  nodes: LineageNode[]
  ideaNodeId: string | null
  setIdeaNodeId: (v: string | null) => void
}): JSX.Element {
  const { nodes, ideaNodeId, setIdeaNodeId } = props
  const store = useLineageStore.getState
  const ideaNode = ideaNodeId === null ? null : nodes.find((n) => n.id === ideaNodeId) ?? null

  return (
    <>
      {ideaNode !== null && (
        <LineageEditIdeaDialog
          key={ideaNode.id}
          open
          node={ideaNode}
          onClose={() => setIdeaNodeId(null)}
          onSave={(id, idea) => store().editCoreIdea(id, idea)}
        />
      )}
    </>
  )
}
