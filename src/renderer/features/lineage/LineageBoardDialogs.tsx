// b3: P7-H
/**
 * [F-SPLIT-01] LineageBoardDialogs —— 节点编辑对话框组装配（自 LineageBoard
 * 拆出 2026-09-05；迁移添加节点/改 core_idea/标签/人工父对话框装配职责段，
 * JSX 语句零改纯搬运——对话框本体 LineageAddNodeDialog/LineageEditIdeaDialog/
 * LineageTagDialog/LineageManualDialogs 均为既有拆件）。
 *
 * ── 行为层（原 LineageBoard 对话框面）──
 * - **加节点**两型（从文献库添加=搜索选取 paper 建节点（paperId 绑定+title/
 *   year 取元数据默认可改）/添加主题节点=纯手工 title——「阶段分组」语义）
 * - core_idea 编辑=textarea（负面清单红线——md 只展示不渲染同族）；
 *   ideaNode/tagNode 派生随迁本件（nodes 由宿主传入）
 * - F-LG14 添加标签对话框（key 重挂载重置输入——EditIdeaDialog 同型）；
 *   保存=既有 tags 合并新标签整组写（去重双保险：面板侧 includes 短路+
 *   main repo 写边界单源）
 * - [F-LGRAPH-01②U5] F-LG15 人工父双对话框退役删除（mockup §3.8/轮 1 呈报：
 *   画线工具+线身右键菜单「命名/线形与颜色/删除连线」替代其功能面——方案
 *   切换=删旧）；改父入口=节点菜单「改父…」目标点选流（非对话框）沿承保留
 * - 状态归属不变：各对话框开关 id 由宿主 LineageBoard 持有，本件经 props
 *   收值+set 函数回写；store 写路径仍经 getState 单口
 *
 * ── 接口层 ──
 * - export function LineageBoardDialogs(props: { nodes; addOpen; setAddOpen;
 *   ideaNodeId; setIdeaNodeId; tagNodeId; setTagNodeId }): JSX.Element
 */
import { useLineageStore } from './lineage.store'
import { LineageAddNodeDialog } from './LineageAddNodeDialog'
import { LineageEditIdeaDialog } from './LineageEditIdeaDialog'
import { LineageTagDialog } from './LineageTagDialog'
import type { LineageNode } from '@shared/models/lineage'

export function LineageBoardDialogs(props: {
  nodes: LineageNode[]
  addOpen: boolean
  setAddOpen: (v: boolean) => void
  ideaNodeId: string | null
  setIdeaNodeId: (v: string | null) => void
  tagNodeId: string | null
  setTagNodeId: (v: string | null) => void
}): JSX.Element {
  const { nodes, addOpen, setAddOpen, ideaNodeId, setIdeaNodeId, tagNodeId, setTagNodeId } = props
  const store = useLineageStore.getState
  const ideaNode = ideaNodeId === null ? null : nodes.find((n) => n.id === ideaNodeId) ?? null
  const tagNode = tagNodeId === null ? null : nodes.find((n) => n.id === tagNodeId) ?? null

  return (
    <>
      <LineageAddNodeDialog
        open={addOpen}
        existingPaperIds={nodes.map((n) => n.paperId).filter((p): p is string => p !== null)}
        onClose={() => setAddOpen(false)}
        onAddPaper={(p) => store().addPaperNode(p)}
        onAddTheme={(t) => store().addThemeNode(t)}
      />

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
