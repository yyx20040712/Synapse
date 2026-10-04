// b3: P7-H
/**
 * LineageBoard —— 脉络图交互编辑+自动保存+退出聚合
 *
 * ── 行为层 ──
 * - 交互编辑面（ADR-0014：手工拖拽位置/加删边/改父+改 core_idea）：
 *   **[T3-P6] 节点拖拽=写 x/y 覆盖已退役**（JSON Canvas 模式随 SVG 画布
 *   方案切换退役——P8 槽位重排接缝；store moveNode 保留待重接）；
 *   **加节点**两型（从文献库添加=搜索选取
 *   paper 建节点（paperId 绑定+title/year 取元数据默认可改）/添加主题节点=
 *   纯手工 title——「阶段分组」语义）+core_idea 编辑=textarea（负面清单
 *   红线——md 只展示不渲染同族）的对话框装配职责归 LineageBoardDialogs.tsx
 *   （[F-SPLIT-01] 自本件拆出 2026-09-05，语句零改）；**加边**=源节点菜单
 *   「连线到…」目标选取；**删边/删节点**=节点菜单；**改父**=既有子边删除+
 *   新边添加两动作组合（UI 呈现单操作，service 两调用——树约束下改父=换父）
 *   的菜单+目标选取提示职责归 LineageBoardMenu.tsx（[F-SPLIT-01] 自本件
 *   拆出 2026-09-05，语句零改）
 * - **树约束 UI 守卫**（INV-27 消费面）：加边 to 已有父/成环/自环三
 *   拒绝路径=动作型 toast 中文 reason（**树守卫宿主=LG-01 service
 *   upsertEdge 运行时守卫**（门一 W1 闭合）——本单零守卫代码只接
 *   toast 呈现=双保险同 08 按钮禁用语义）；拒绝用例消费方级断言
 * - **自动保存**（ADR-0014「保存语义对齐标注/笔记」——**INV-04 同型
 *   不新立号**）：[F-LGRAPH-01②U1] 编辑会话暂存+点保存批量落库（A7——
 *   autosave-first 语义翻转：编辑动作乐观应用入暂存，保存钮触发 flush）；失败不推进 savedAt+脏态投影（lineage.store 保存态三态：
 *   saved/saving/error+重试——notes.store save-status 先例族）；写
 *   面=**LG-01 已交付 service 四写方法（含守卫），本单接线 IPC 四
 *   通道**（lineage/upsert-node 等——[locked-change] 扩 schemas/
 *   api-surface：契约扩展非放宽，十一域穷举不变）
 * - **退出拦截聚合面扩**（ADR-0014 接缝条款：图视图工单自带，**不动
 *   TABS-04 已冻结行为面**）：lineage.store 导出 dirty 布尔（保存态≠
 *   saved 即脏）；App.tsx 退出判定=useTabDirtyAggregate() ||
 *   useLineageDirty()（组合根单点扩——tab-dirty.ts **行为面零触碰**，
 *   仅其头注 :14「（TABS-04 的 dirty 输入）」stale 声明行随单更新为
 *   「tabs∪lineage」——注释级非行为；**接缝双向锚定两文件=lineage.
 *   store.ts+App.tsx（门一 N3 指名）+tab-dirty.ts stale 行三方**）；
 *   **INV-22 行随本单扩面**（renderer 聚合信号构成=tab dirty ∪
 *   lineage dirty——invariants.md 登记行扩写，门一 N2）
 * - **改父部分失败语义（门一 N5）**：改父=删旧边+加新边两 service 调用
 *   非原子——删成功+加失败=节点暂无父（**合法中间态**：森林语义兜底
 *   无数据丢失）；呈现=error 保存态+toast 指明「旧连线已移除，新连线
 *   未建立」+重试按钮重发加边（或用户手动重连）——不静默回滚不假报成功
 * - 状态机（编辑动作×保存态，宪法前置）：edit→saving→saved（正常）/
 *   edit→saving→error（失败：脏保持+toast+重试按钮——**禁本地乐观
 *   覆盖 savedAt**）/error→retry→saving（恢复）；跨格序列：连续编辑
 *   中保存失败→后续编辑不丢（动作排队=最后写胜出，stale-guard 请求
 *   序号 INV-03 同族）——全量迁移表见 lineage.store.ts 头注（写面
 *   单源在此）
 *
 * ── 接口层 ──
 * - export function LineageBoard(props: { onSelectNode(id: string |
 *     null): void; selectedNodeId?: string | null }): JSX.Element
 *   （选择上抛=04 侧板消费面；本实现为 LG-03 交付）
 *
 * ── 架构层 ──
 * - renderer/features/lineage 域内聚（Board 编辑层与渲染宿主
 *   分文件——组件 ≤250 行红线拆分预案：节点菜单/添加节点对话框子
 *   组件化=LineageNodeMenu/LineageAddNodeDialog/LineageEditIdeaDialog
 *   三件+[F-SPLIT-01] 装配分组件 LineageBoardMenu/LineageBoardDialogs
 *   两件；[T3-P6] 渲染宿主=LineageTimeline 时间线（Canvas/layout/
 *   viewport 退役）；依赖 window.api 写四通道+02 交付（store）；
 *   禁直调 ipc/禁 Node API
 *
 * ── 生命周期层 ──
 * - 预留：批量撤销（v1 无 undo——标注 undo 栈 UNDO-01 不同域不混）；
 *   多选批量操作；重置自动布局（清 x/y 按钮动作）
 * - 不做：DAG 多父编辑（v2 升版条件）；协作/云同步（负面清单）；
 *   md 渲染（textarea 级）
 *
 * ── 文化层 ──
 * - 错误：写失败=动作型 toast+error 保存态+重试（INV-02）；树拒绝三
 *   路径=动作型 toast；读面沿用 02 store.error；禁静默吞错
 * - 实现注（LG-03 交付）：写路径/保存态/dirty 全收口 lineage.store
 *   （Board 只编排交互与呈现）；树拒绝 toast 由 store flush 按
 *   CONFLICT 折叠码分支（守卫宿主=service——reason 透传链=
 *   LineageDomainError→toAppError→ApiClientError.code）；[F-BAKRET-01]
 *   导入草稿入口（动作件）随草稿导入链退役删除
 *   （用户裁决 2026-09-30——ADR-0022）
 */
import { useState } from 'react'
import { useLineageStore } from './lineage.store'
import { LineageTimeline } from './LineageTimeline'
import { LineageBoardMenu, type MenuTarget, type PendingLink } from './LineageBoardMenu'
import { LineageBoardDialogs } from './LineageBoardDialogs'

export function LineageBoard(props: {
  onSelectNode(id: string | null): void
  selectedNodeId?: string | null
  /** [F-LGRAPH-01②U4/A6] 卡双击=跳阅读器（Page 编排→OPEN_PAPER_EVENT 总线） */
  onNodeDblClick?: (nodeId: string) => void
}): JSX.Element {
  const nodes = useLineageStore((s) => s.nodes)
  const edges = useLineageStore((s) => s.edges)
  const paperMetrics = useLineageStore((s) => s.paperMetrics)
  // [F-FOLDER-01] pubNo 表下发（节点号=库级同源——Timeline 经此单源传入）
  const pubNos = useLineageStore((s) => s.pubNos)
  // [A1a] 文献库标签名组表下发（卡标签行换源——Timeline 经此单源传入）
  const tagNames = useLineageStore((s) => s.tagNames)
  const store = useLineageStore.getState

  const [menu, setMenu] = useState<MenuTarget | null>(null)
  const [pendingLink, setPendingLink] = useState<PendingLink | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [ideaNodeId, setIdeaNodeId] = useState<string | null>(null)
  const [tagNodeId, setTagNodeId] = useState<string | null>(null)

  const handleNodeClick = (nodeId: string): void => {
    if (pendingLink !== null) {
      if (pendingLink.mode === 'link') store().linkNodes(pendingLink.source, nodeId)
      else store().reparentNode(pendingLink.source, nodeId)
      setPendingLink(null)
      return
    }
    props.onSelectNode(nodeId)
  }

  return (
    <div className="relative h-full">
      {/* [T3-P7B] 工具条移入 LineageTimeline 渲染树（.lg-toolbar sticky 挂
          .timeline 内——D-P7B-1 换装）；既有回调+保存态经 props 下传零变 */}

      {/* [T3-P6] 换宿主：LineageCanvas[SVG 画布] 退役→LineageTimeline[年+月
          时间线滚动容器]；onNodeDrag 接线随 x/y 自由拖拽退役拆除（store
          moveNode 保留——P8 槽位重排重接，主控裁决 e） */}
      <LineageTimeline
        nodes={nodes}
        edges={edges}
        paperMetrics={paperMetrics}
        pubNos={pubNos}
        tagNames={tagNames}
        selectedNodeId={props.selectedNodeId ?? null}
        contextNodeId={menu?.node.id ?? null}
        toolbar={{ onAddNode: () => setAddOpen(true) }}
        onNodeClick={handleNodeClick}
        onNodeDblClick={props.onNodeDblClick}
        onNodeContextMenu={(id, anchor) => {
          const node = nodes.find((n) => n.id === id)
          if (node !== undefined) setMenu({ node, anchor })
        }}
        onReorderMonthSlots={(ids) => store().reorderMonthSlots(ids)}
        onMoveNodeMonth={(id, year, month) => store().moveNodeMonth(id, year, month)}
      />

      {/* 节点菜单+目标选取提示条（[F-SPLIT-01] 拆件——menu/pendingLink 与各
          对话框开关 state 归本件，经 set 函数回写；DOM 序=canvas 后（提示条
          absolute top-2 z-float、菜单 fixed 锚点——视觉位不受兄弟序影响） */}
      <LineageBoardMenu menu={menu} pendingLink={pendingLink} setMenu={setMenu} setPendingLink={setPendingLink}
        setIdeaNodeId={setIdeaNodeId} setTagNodeId={setTagNodeId} />

      {/* 节点编辑对话框组（[F-SPLIT-01] 拆件——加节点两型/core_idea/标签三
          对话框装配；[②U5] 人工父双对话框退役） */}
      <LineageBoardDialogs nodes={nodes} addOpen={addOpen} setAddOpen={setAddOpen}
        ideaNodeId={ideaNodeId} setIdeaNodeId={setIdeaNodeId} tagNodeId={tagNodeId} setTagNodeId={setTagNodeId} />
    </div>
  )
}
