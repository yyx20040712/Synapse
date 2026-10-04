// b3: P7-H
/**
 * [F-SPLIT-01] LineageBoardDialogs —— 节点编辑对话框组装配（自 LineageBoard
 * 拆出 2026-09-05；[F-ALIGN-01 2026-10-04] 建点对话框随手动建点路径
 * 全退役删除——节点唯一来源=入库 import/移动 moveFolder 两路，INV-NEW-1）：
 * 本件现装配 core_idea/标签两对话框（对话框本体 LineageEditIdeaDialog/
 * LineageTagDialog 均为既有拆件；EditIdea=A3 批退役面、Tag=A1b 批退役面
 * ——各批只删各自挂点）。
 *
 * ── 行为层（原 LineageBoard 对话框面）──
 * - core_idea 编辑=textarea（负面清单红线——md 只展示不渲染同族）；
 *   ideaNode/tagNode 派生随迁本件（nodes 由宿主传入）
 * - F-LG14 添加标签对话框（key 重挂载重置输入——EditIdeaDialog 同型）；
 *   保存=既有 tags 合并新标签整组写（去重双保险：面板侧 includes 短路+
 *   main repo 写边界单源）
 * - 状态归属不变：各对话框开关 id 由宿主 LineageBoard 持有，本件经 props
 *   收值+set 函数回写；store 写路径仍经 getState 单口
 *
 * ── 接口层 ──
 * - export function LineageBoardDialogs(props: { nodes; ideaNodeId;
 *   setIdeaNodeId; tagNodeId; setTagNodeId }): JSX.Element
 */
import { useLineageStore } from './lineage.store'
import { LineageEditIdeaDialog } from './LineageEditIdeaDialog'
import { LineageTagDialog } from './LineageTagDialog'
import type { LineageNode } from '@shared/models/lineage'

export function LineageBoardDialogs(props: {
  nodes: LineageNode[]
  ideaNodeId: string | null
  setIdeaNodeId: (v: string | null) => void
  tagNodeId: string | null
  setTagNodeId: (v: string | null) => void
}): JSX.Element {
  const { nodes, ideaNodeId, setIdeaNodeId, tagNodeId, setTagNodeId } = props
  const store = useLineageStore.getState
  const ideaNode = ideaNodeId === null ? null : nodes.find((n) => n.id === ideaNodeId) ?? null
  const tagNode = tagNodeId === null ? null : nodes.find((n) => n.id === tagNodeId) ?? null

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

      {/* F-LG14 添加标签对话框（key 重挂载重置输入——EditIdeaDialog 同型）；
          保存=既有 tags 合并新标签整组写（去重双保险：面板侧 includes 短路+
          main repo 写边界单源） */}
      {tagNode !== null && (
        <LineageTagDialog
          key={tagNode.id}
          open
          node={tagNode}
          onClose={() => setTagNodeId(null)}
          onSave={(id, tag) => {
            const current = tagNode.tags ?? []
            if (!current.includes(tag)) store().setNodeTags(id, [...current, tag])
          }}
        />
      )}
    </>
  )
}
