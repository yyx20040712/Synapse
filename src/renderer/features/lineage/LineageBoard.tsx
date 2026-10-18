// b3: P7-H
/**
 * LineageBoard —— 脉络图交互编辑+自动保存+退出聚合
 *
 * ── 行为层 ──
 * - 交互编辑面（ADR-0014：手工拖拽位置/加删边）：
 *   **[T3-P6] 节点拖拽=写 x/y 覆盖已退役**（JSON Canvas 模式随 SVG 画布
 *   方案切换退役——P8 槽位重排接缝；store moveNode 保留待重接）；
 *   **[F-ALIGN-01 2026-10-04] 加节点两型对话框随手动建点路径全退役
 *   删除**（节点唯一来源=入库/移动两路——INV-NEW-1；主题节点应用层同步
 *   退役）；**[A3 F-CONTRACTA-01 2026-10-04] 核心想法编辑对话框随
 *   核心想法域全退役删除**（「核心想法」语义由全文笔记 notes.contentMd 承接
 *   ——对话框组装配件随挂点消亡整件退役）；
 *   **加边**=源节点菜单
 *   **删边/删节点**=节点菜单（[F-VISFB-66 裁定 2/3] 旧右键建边目标选取与
 *   换父组合动作整体退役——换父业务由线条编辑换端承载）；菜单装配职责归
 *   LineageBoardMenu.tsx（[F-SPLIT-01] 自本件拆出 2026-09-05）
 * - **树约束 UI 守卫**（INV-27 消费面）：加边 to 已有父/成环/自环三
 *   拒绝路径=动作型 toast 中文 reason（**树守卫宿主=LG-01 service
 *   upsertEdge 运行时守卫**（门一 W1 闭合）——本单零守卫代码只接
 *   toast 呈现=双保险同 08 按钮禁用语义）；拒绝用例消费方级断言
 * - **自动保存**（ADR-0014「保存语义对齐标注/笔记」——**INV-04 同型
 *   不新立号**）：[F-LGRAPH-01②U1] 编辑会话暂存+点保存批量落库（A7——
 *   autosave-first 语义翻转：编辑动作乐观应用入暂存，保存钮触发 flush）；失败不推进 savedAt+脏态投影（lineage.store 保存态三态：
 *   saved/saving/error+重试——notes.store save-status 先例族）；写
 *   面=**LG-01 已交付 service 四写方法（含守卫），本单接线 IPC 四
 *   通道**（[F-ALIGN-01] 节点写通道=lineage/patch-node——既有节点编辑
 *   patch；[locked-change] 扩 schemas/api-surface：契约扩展非放宽，
 *   十一域穷举不变）
 * - **退出拦截聚合面扩**（ADR-0014 接缝条款：图视图工单自带，**不动
 *   TABS-04 已冻结行为面**）：lineage.store 导出 dirty 布尔（保存态≠
 *   saved 即脏）；App.tsx 退出判定=useTabDirtyAggregate() ||
 *   useLineageDirty()（组合根单点扩——tab-dirty.ts **行为面零触碰**，
 *   仅其头注 :14「（TABS-04 的 dirty 输入）」stale 声明行随单更新为
 *   「tabs∪lineage」——注释级非行为；**接缝双向锚定两文件=lineage.
 *   store.ts+App.tsx（门一 N3 指名）+tab-dirty.ts stale 行三方**）；
 *   **INV-22 行随本单扩面**（renderer 聚合信号构成=tab dirty ∪
 *   lineage dirty——invariants.md 登记行扩写，门一 N2）
 * - [F-VISFB-66 裁定 3] 旧换父两调用组合的非原子部分失败语义（门一 N5）随
 *   业务退役删除——换端=reconnectEdge 单动作（原子性由单语句承担）
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
 *   分文件——组件 ≤250 行红线拆分预案：节点菜单子
 *   组件化=LineageNodeMenu+[F-SPLIT-01]
 *   装配分组件 LineageBoardMenu
 *   （[F-ALIGN-01] 建点对话框件随手动建点路径退役删除；[A1b
 *   F-CONTRACTA-01] 脉络侧标签对话框件随私有标签域退役删除；[A3
 *   F-CONTRACTA-01] 核心想法编辑对话框件+对话框组装配件随
 *   核心想法域全退役整件删除——对话框组面清零）；
 *   [T3-P6] 渲染宿主=LineageTimeline 时间线（Canvas/layout/
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
import { LineageBoardMenu, type MenuTarget } from './LineageBoardMenu'

export function LineageBoard(props: {
  onSelectNode(id: string | null): void
  selectedNodeId?: string | null
  /** [F-UIRES-03 B5①] 卡面两钮上抛 props 随迁移退役删除（消费面=SidePanel
   *  操作行经 Page 直连；[F-LGRAPH-01②U4/A6] onNodeDblClick 卡双击链 v1.7 已删） */
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

  // [F-VISFB-66 裁定 2/3] 旧右键目标选取模式与其互斥闸/消费段整体退役删除
  // ——唯一建边径=锚点显式拖拽（drawEdge 单径）；旧换父业务由线条编辑换端
  // 承载（reconnectEdge）
  const handleNodeClick = (nodeId: string): void => {
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
        onNodeClick={handleNodeClick}
        onNodeContextMenu={(id, anchor) => {
          const node = nodes.find((n) => n.id === id)
          if (node !== undefined) setMenu({ node, anchor })
        }}
        onReorderMonthSlots={(ids) => store().reorderMonthSlots(ids)}
      />

      {/* 节点菜单（[F-SPLIT-01] 拆件——menu state 归本件，经 set 函数回写；
          [F-VISFB-66] 目标选取提示条随右键链路退役删除） */}
      <LineageBoardMenu menu={menu} setMenu={setMenu} />
    </div>
  )
}
