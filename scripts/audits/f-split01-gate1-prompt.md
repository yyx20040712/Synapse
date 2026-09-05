你是 F-SPLIT-01 工单的门一对抗深审员。只读审计——你只看到本审计包（票面+验证摘要+自裁申报+完整 diff），禁接触仓库/禁跑命令/禁臆测包外事实。不确定的明确说不确定。

铁律：只读+唯一可写审计档+禁 npm/test。每条 finding 给 [B|W|N] 分级+file:line 证据或 diff 摘录。中文输出。

工单：A 母本符合度（票面条款逐条 vs diff——纯结构零行为差/头注职责随迁禁删减/AnnotationLayer 编排语义零改/≥80 行余量/五件终态）；B 宪法红线（分层单向/行数/UTF-8/死代码/新文件被引用/禁新依赖）；C 代码与测试质量（**本票附加强制审项=纯搬运逐块核对**：抽 3 个以上搬移块与原语义对照——重点：①usePageLazyWindow 的 IO effect deps 与回收调度语句序 ②usePageColumnScroll 段⑤INV-29 单口+段⑥镜像 ③AnnotationPopups 动作函数（api 写路径迁子件）与 busy/setMenu/setEditing 回写链 ④reader-shortcut-handlers useMemo 工厂 deps ⑤挂载/事件消费类附加=事件时间线逐帧推演（useEffect 消费闩锁/监听器注册顺序——尤其 ReaderPage 留守效应与拆出 hook 的挂载序）；另 LineageBoard 提示条 DOM 兄弟序变化（canvas 前→后）已由探针 PNG 逐字节 PASS——你可挑战该结论但推翻需更强依据）；D 报告诚实性（自裁申报 7 项逐条对 diff 核实——尤其自裁 3 轮询守卫移除的零行为差论证/自裁 6 类型注解适配/自裁 2 api 写路径迁子件是否超纯搬运边界）；E 接缝与后续单（拆出件被消费面 import 完整性/PageScrollRequest 再导出/头注指针双向一致性/对 F-CSS-01 与 P7D-01 批二的接缝影响）。

输出：[B|W|N] 逐条+证据+统计（各级计数）+总评（PASS/PASS_WITH_WARNINGS/BLOCKED）。回复精简全文在档。

=== 审计包正文 ===
# F-SPLIT-01 门一审计包（主控预生成 2026-09-05）

## 票面（registry F-SPLIT-01）
组件贴线拆件合票（Kimi 体检 v2 P1-1 终裁立案）：五件纯结构拆件零行为差=子组件抽取+头注职责随代码迁移（注释完整性=票面条款，头注即架构文档禁删减）；AnnotationLayer=F-A8 门 2 三层编排消费面——纯搬运禁触编排语义（S0~S6/CR1 订阅域标记零改）；零视觉差验收=探针 baseline 重采+COMPARE PASS；拆件目标余量 ≥80 行/件；每件拆毕 verify 全链+终态 5 件复核。

## 验证摘要（主控亲验）
- verify exit=0：156 文件/1422 用例/locks 286/lint/typecheck/build 全绿（实现者跑+主控复核 diff 范围 5M+10新）
- 探针 COMPARE PASS：八态 PNG 逐字节相同（sha256）+sweeps 全部态 windowSize/trans/zi 逐键相同+11 token 计算值硬断言过（主控位亲跑）
- 行数终态：PageColumn 164（View71/LazyWindow82/Scroll65）/AnnotationLayer 151（Popups147）/AiNotesSection 107（Status158/phase37）/LineageBoard 155（Menu106/Dialogs103）/ReaderPage 163（View157/shortcuts42）——五件全部 ≤169（≥80 余量达标），新拆件全部 ≤250 红线

## 实现者自裁申报七项（报告 §4 摘要）
## 4. 自裁申报（超票面决定+切分点选择理由）

1. **PageColumn 切分超「或」建议为三件**（建议为「懒渲染窗口 hook **或** 行块
   组件」二选一）：单抽任一项净减 15~37 行，距 ≤169 缺口 ≥40 行，物理不可达；
   现场核块边界后扩为「懒渲染窗口 hook+滚动接线 hook（段⑤+段⑥镜像）+ready
   JSX 件」三件。禁动项全部留守：就绪管线效应（deps [doc,totalPages] 字面未动）
   、段⑥缩放锚 useLayoutEffect（整块原位未触）、F-ARCH3（未新增任何
   useCallback/useMemo）。
2. **AnnotationLayer 动作函数随弹层 JSX 迁出**（建议面仅点名「四选项 menu+
   AnnotationEditor 编辑 JSX」）：JSX-only 拆法净减 ~15 行不可达 ≤169；弹层
   动作（saveComment/copyQuote/deleteAnnotation）与弹层 JSX 同体消费 busy/
   setMenu/setEditing，随迁后状态归属不变（票面「禁改状态归属（弹层可无本地
   状态）」满足——子件零本地状态）。头注「api 调用+store 三方法同步在本层」
   随迁改写为指向 AnnotationPopups（信息量保全）。
3. **AiNotesSection 拆出状态件+纯函数件两件**：derivePhase「随迁或留原处」为
   票面明示裁量——选择**独立 .ts 单源**（AiNotesStatus 呈现+AiNotesSection
   分节可见性双消费，避免值导入环）。**轮询效应内 `if (paperId === null)
   return` 守卫随 props 契约消解**（子件 paperId: string，宿主渲染前已守非空
   ——该语句在子件内成为 string===null 不可达比较，TS2367 必红，移除为零行为
   差：原守卫从未在子件渲染态下触发过）。
4. **LineageBoard 拆两件+DOM 兄弟序变化申报**：提示条（lineage-pending-link）
   原位于 canvas 之前、现随菜单件位于 canvas 之后——该条 `absolute top-2
   left-1/2 z-(--z-float)` 定位全由 CSS 决定，菜单为 fixed 锚点定位，兄弟序
   不影响视觉位与层叠（z 显式）；探针 COMPARE（PNG 逐字节）预期零差，请主控
   after 跑时重点核 lineage 场景。menu/pendingLink/四对话框开关 state 归属
   LineageBoard 不变（set 函数回写）。
5. **ReaderPage 拆「全 JSX 视件+快捷键 hook」两件**（建议为「空态引导块**或**
   装配 JSX 分组」）：小块拆法受 props 胶水抵消（工具栏块拆出净得 0~2 行），
   唯物理可达路径=整 JSX 面出件（27 props，全部为原值/原 setter/原 handler
   透传）+快捷键块下沉 .ts。fitWidth/handleColumnReady/handlePdfError/
   sr2-lg-08 效应/换文献效应/全部 wiring 留守原文件。`tab?.status` 空态原料
   经 `tabStatus` prop 透传，子件条件语句逐字保持（`paperId === null` 等条件
   全部原样）。
6. **类型注解适配（tsc 首拦后探针实证）**：本项目 @types/react 18.3.31 口径下
   `RefObject<HTMLDivElement | null>` 不可直接作 div 的 ref（TS variance 怪癖
   ——四形态探针实测：RefObject<T|null> 红 / MutableRefObject<T|null> 绿 /
   RefObject<T> 绿 / 本地 useRef 绿），故 PageColumnView.rootRef、
   ReaderPageView.scrollAreaRef、usePageColumnScroll.liveScrollTop 标注
   MutableRefObject（=useRef 实返型）；PageScrollRequest 在 PageColumn 补
   type-import（再导出不入作用域，TS2304）。此为注解层适配，运行时类型实为
   同一对象，零行为差。
7. **头注迁移执行口径**：每件按「迁移段+一句 [F-SPLIT-01] 自 <原文件> 拆出
   2026-09-05；原文件改写为一句指针」执行；两文件头注合计覆盖原头注全部架构
   信息（六段/状态机表/INV 引用/历史增补段逐段核过归属）。历史增补段归属：
   [F-R1 增补]行渲染部分→PageColumnView、[F-A8]编排段→留守（编排留守）、
   六态表→ai-notes-phase。

## 5. 疑虑（供门审重点关注）

## 完整 diff（git diff 含 add -N 新件）
diff --git a/src/renderer/features/lineage/LineageBoard.tsx b/src/renderer/features/lineage/LineageBoard.tsx
index 7311943249..ace8fd8ead 100644
--- a/src/renderer/features/lineage/LineageBoard.tsx
+++ b/src/renderer/features/lineage/LineageBoard.tsx
@@ -5,13 +5,15 @@
  * ── 行为层 ──
  * - 交互编辑面（ADR-0014：手工拖拽位置/加删边/改父+改 core_idea）：
  *   **节点拖拽**=写 x/y 覆盖（JSON Canvas 模式——拖拽落点存库，重置
- *   自动布局=清空 x/y 的按钮动作）；**加节点**两型（从文献库添加=
- *   搜索选取 paper 建节点（paperId 绑定+title/year 取元数据默认可改）/
- *   添加主题节点=纯手工 title——「阶段分组」语义）；**加边**=源节点
- *   菜单「连线到…」目标选取；**删边/删节点**=节点菜单；**改父**=既有
- *   子边删除+新边添加两动作组合（UI 呈现单操作，service 两调用——
- *   树约束下改父=换父）；core_idea 编辑=textarea（负面清单红线——
- *   md 只展示不渲染同族）
+ *   自动布局=清空 x/y 的按钮动作）；**加节点**两型（从文献库添加=搜索选取
+ *   paper 建节点（paperId 绑定+title/year 取元数据默认可改）/添加主题节点=
+ *   纯手工 title——「阶段分组」语义）+core_idea 编辑=textarea（负面清单
+ *   红线——md 只展示不渲染同族）的对话框装配职责归 LineageBoardDialogs.tsx
+ *   （[F-SPLIT-01] 自本件拆出 2026-09-05，语句零改）；**加边**=源节点菜单
+ *   「连线到…」目标选取；**删边/删节点**=节点菜单；**改父**=既有子边删除+
+ *   新边添加两动作组合（UI 呈现单操作，service 两调用——树约束下改父=换父）
+ *   的菜单+目标选取提示职责归 LineageBoardMenu.tsx（[F-SPLIT-01] 自本件
+ *   拆出 2026-09-05，语句零改）
  * - **树约束 UI 守卫**（INV-27 消费面）：加边 to 已有父/成环/自环三
  *   拒绝路径=动作型 toast 中文 reason（**树守卫宿主=LG-01 service
  *   upsertEdge 运行时守卫**（门一 W1 闭合）——本单零守卫代码只接
@@ -52,7 +54,8 @@
  * - renderer/features/lineage 域内聚（Board 编辑层与 Canvas 渲染层
  *   分文件——组件 ≤250 行红线拆分预案：节点菜单/添加节点对话框子
  *   组件化=LineageNodeMenu/LineageAddNodeDialog/LineageEditIdeaDialog
- *   三件）；依赖 window.api 写四通道+02 交付（layout/canvas/store）；
+ *   三件+[F-SPLIT-01] 装配分组件 LineageBoardMenu/LineageBoardDialogs
+ *   两件）；依赖 window.api 写四通道+02 交付（layout/canvas/store）；
  *   禁直调 ipc/禁 Node API
  *
  * ── 生命周期层 ──
@@ -77,25 +80,9 @@ import { useState } from 'react'
 import { useLineageStore } from './lineage.store'
 import { importLineageDraft } from './lineage-import'
 import { LineageCanvas } from './LineageCanvas'
-import { LineageNodeMenu } from './LineageNodeMenu'
-import { LineageAddNodeDialog } from './LineageAddNodeDialog'
-import { LineageEditIdeaDialog } from './LineageEditIdeaDialog'
-import { LineageTagDialog } from './LineageTagDialog'
-import { LineageManualDialogs } from './LineageManualDialogs'
 import { LineageToolbar } from './LineageToolbar'
-import type { LineageNode } from '@shared/models/lineage'
-
-/** 目标选取模式（源节点菜单发起：「连线到…」/「改父…」/「添加参考连接」R2-LG12） */
-interface PendingLink {
-  source: string
-  mode: 'link' | 'reparent' | 'ref'
-}
-
-const MODE_HINT: Record<PendingLink['mode'], string> = {
-  link: '连线模式：点击目标节点（源 → 目标，目标成为子节点）',
-  reparent: '改父模式：点击新父节点',
-  ref: '参考连接模式：点击目标文献（综述 → 目标，淡灰虚线）'
-}
+import { LineageBoardMenu, type MenuTarget, type PendingLink } from './LineageBoardMenu'
+import { LineageBoardDialogs } from './LineageBoardDialogs'
 
 export function LineageBoard(props: {
   onSelectNode(id: string | null): void
@@ -108,7 +95,7 @@ export function LineageBoard(props: {
   const lastWriteError = useLineageStore((s) => s.lastWriteError)
   const store = useLineageStore.getState
 
-  const [menu, setMenu] = useState<{ node: LineageNode; anchor: { x: number; y: number } } | null>(null)
+  const [menu, setMenu] = useState<MenuTarget | null>(null)
   const [pendingLink, setPendingLink] = useState<PendingLink | null>(null)
   const [addOpen, setAddOpen] = useState(false)
   const [ideaNodeId, setIdeaNodeId] = useState<string | null>(null)
@@ -117,17 +104,6 @@ export function LineageBoard(props: {
   const [manualParentId, setManualParentId] = useState<string | null>(null)
   const [manualManageId, setManualManageId] = useState<string | null>(null)
 
-  // tree 父边（kind=tree——manual 入边不算 tree 父，F-LG15：菜单「删除父连线」
-  // 仅针对 tree 边，manual 边删除走管理对话框）
-  const menuParentEdge =
-    menu === null
-      ? null
-      : edges.find((e) => e.toNode === menu.node.id && e.kind === 'tree') ?? null
-  const menuManualEdges =
-    menu === null ? [] : edges.filter((e) => e.toNode === menu.node.id && e.kind === 'manual')
-  const ideaNode = ideaNodeId === null ? null : nodes.find((n) => n.id === ideaNodeId) ?? null
-  const tagNode = tagNodeId === null ? null : nodes.find((n) => n.id === tagNodeId) ?? null
-
   const handleNodeClick = (nodeId: string): void => {
     if (pendingLink !== null) {
       if (pendingLink.mode === 'link') store().linkNodes(pendingLink.source, nodeId)
@@ -150,21 +126,6 @@ export function LineageBoard(props: {
         onRetrySave={() => store().retrySave()}
       />
 
-      {/* 目标选取模式提示条（连线到…/改父…激活期——R2-LG11 浅色板态：
-          白底 accent 描边，行为零变） */}
-      {pendingLink !== null && (
-        <div
-          className="absolute left-1/2 top-2 z-(--z-float) flex -translate-x-1/2 items-center gap-2 rounded border px-3 py-1 text-xs"
-          style={{ borderColor: 'var(--accent)', background: 'var(--panel)', color: 'var(--accent)' }}
-          data-testid="lineage-pending-link"
-        >
-          <span>{MODE_HINT[pendingLink.mode]}</span>
-          <button type="button" className="underline" onClick={() => setPendingLink(null)}>
-            取消
-          </button>
-        </div>
-      )}
-
       <LineageCanvas
         nodes={nodes}
         edges={edges}
@@ -178,72 +139,17 @@ export function LineageBoard(props: {
         }}
       />
 
-      {menu !== null && (
-        <LineageNodeMenu
-          node={menu.node}
-          parentEdge={menuParentEdge}
-          manualParentEdges={menuManualEdges}
-          anchor={menu.anchor}
-          onClose={() => setMenu(null)}
-          onLinkTo={(id) => { setPendingLink({ source: id, mode: 'link' }); setMenu(null) }}
-          onReparent={(id) => { setPendingLink({ source: id, mode: 'reparent' }); setMenu(null) }}
-          onAddRefLink={(id) => { setPendingLink({ source: id, mode: 'ref' }); setMenu(null) }}
-          onLinkManualParent={(id) => { setManualParentId(id); setMenu(null) }}
-          onManageManualParents={(id) => { setManualManageId(id); setMenu(null) }}
-          onEditIdea={(id) => { setIdeaNodeId(id); setMenu(null) }}
-          onAddTag={(id) => { setTagNodeId(id); setMenu(null) }}
-          onRemoveParentEdge={(edgeId) => { store().removeEdge(edgeId); setMenu(null) }}
-          onRemoveNode={(id) => { store().removeNode(id); setMenu(null) }}
-        />
-      )}
+      {/* 节点菜单+目标选取提示条（[F-SPLIT-01] 拆件——menu/pendingLink 与各
+          对话框开关 state 归本件，经 set 函数回写；DOM 序=canvas 后（提示条
+          absolute top-2 z-float、菜单 fixed 锚点——视觉位不受兄弟序影响） */}
+      <LineageBoardMenu menu={menu} pendingLink={pendingLink} setMenu={setMenu} setPendingLink={setPendingLink}
+        setManualParentId={setManualParentId} setManualManageId={setManualManageId} setIdeaNodeId={setIdeaNodeId} setTagNodeId={setTagNodeId} />
 
-      <LineageAddNodeDialog
-        open={addOpen}
-        existingPaperIds={nodes.map((n) => n.paperId).filter((p): p is string => p !== null)}
-        onClose={() => setAddOpen(false)}
-        onAddPaper={(p) => store().addPaperNode(p)}
-        onAddTheme={(t) => store().addThemeNode(t)}
-      />
-
-      {ideaNode !== null && (
-        <LineageEditIdeaDialog
-          key={ideaNode.id}
-          open
-          node={ideaNode}
-          onClose={() => setIdeaNodeId(null)}
-          onSave={(id, idea) => store().editCoreIdea(id, idea)}
-        />
-      )}
-
-      {/* F-LG14 添加标签对话框（key 重挂载重置输入——EditIdeaDialog 同型）；
-          保存=既有 tags 合并新标签整组写（去重双保险：面板侧 includes 短路+
-          main repo 写边界单源） */}
-      {tagNode !== null && (
-        <LineageTagDialog
-          key={tagNode.id}
-          open
-          node={tagNode}
-          onClose={() => setTagNodeId(null)}
-          onSave={(id, tag) => {
-            const current = tagNode.tags ?? []
-            if (!current.includes(tag)) store().setNodeTags(id, [...current, tag])
-          }}
-        />
-      )}
-      {/* F-LG15 人工父双对话框宿主（连接目标选择/管理 label+删除——拆件
-          LineageManualDialogs；写路径收口 store.linkManualParent·
-          editManualEdgeLabel·removeEdge） */}
-      <LineageManualDialogs
-        nodes={nodes}
-        edges={edges}
-        manualParentId={manualParentId}
-        manualManageId={manualManageId}
-        onCloseParent={() => setManualParentId(null)}
-        onCloseManage={() => setManualManageId(null)}
-        onLinkManualParent={(childId, parentId, label) => store().linkManualParent(childId, parentId, label)}
-        onEditEdgeLabel={(edgeId, label) => store().editManualEdgeLabel(edgeId, label)}
-        onRemoveEdge={(edgeId) => store().removeEdge(edgeId)}
-      />
+      {/* 节点编辑对话框组（[F-SPLIT-01] 拆件——加节点两型/core_idea/标签/
+          人工父四对话框装配） */}
+      <LineageBoardDialogs nodes={nodes} addOpen={addOpen} setAddOpen={setAddOpen}
+        ideaNodeId={ideaNodeId} setIdeaNodeId={setIdeaNodeId} tagNodeId={tagNodeId} setTagNodeId={setTagNodeId}
+        manualParentId={manualParentId} setManualParentId={setManualParentId} manualManageId={manualManageId} setManualManageId={setManualManageId} />
     </div>
   )
 }
diff --git a/src/renderer/features/lineage/LineageBoardDialogs.tsx b/src/renderer/features/lineage/LineageBoardDialogs.tsx
new file mode 100644
index 0000000000..2151a0cf54
--- /dev/null
+++ b/src/renderer/features/lineage/LineageBoardDialogs.tsx
@@ -0,0 +1,103 @@
+// b3: P7-H
+/**
+ * [F-SPLIT-01] LineageBoardDialogs —— 节点编辑对话框组装配（自 LineageBoard
+ * 拆出 2026-09-05；迁移添加节点/改 core_idea/标签/人工父对话框装配职责段，
+ * JSX 语句零改纯搬运——对话框本体 LineageAddNodeDialog/LineageEditIdeaDialog/
+ * LineageTagDialog/LineageManualDialogs 均为既有拆件）。
+ *
+ * ── 行为层（原 LineageBoard 对话框面）──
+ * - **加节点**两型（从文献库添加=搜索选取 paper 建节点（paperId 绑定+title/
+ *   year 取元数据默认可改）/添加主题节点=纯手工 title——「阶段分组」语义）
+ * - core_idea 编辑=textarea（负面清单红线——md 只展示不渲染同族）；
+ *   ideaNode/tagNode 派生随迁本件（nodes 由宿主传入）
+ * - F-LG14 添加标签对话框（key 重挂载重置输入——EditIdeaDialog 同型）；
+ *   保存=既有 tags 合并新标签整组写（去重双保险：面板侧 includes 短路+
+ *   main repo 写边界单源）
+ * - F-LG15 人工父双对话框宿主（连接目标选择/管理 label+删除——写路径收口
+ *   store.linkManualParent·editManualEdgeLabel·removeEdge）
+ * - 状态归属不变：各对话框开关 id 由宿主 LineageBoard 持有，本件经 props
+ *   收值+set 函数回写；store 写路径仍经 getState 单口
+ *
+ * ── 接口层 ──
+ * - export function LineageBoardDialogs(props: { nodes; addOpen; setAddOpen;
+ *   ideaNodeId; setIdeaNodeId; tagNodeId; setTagNodeId; manualParentId;
+ *   setManualParentId; manualManageId; setManualManageId }): JSX.Element
+ */
+import { useLineageStore } from './lineage.store'
+import { LineageAddNodeDialog } from './LineageAddNodeDialog'
+import { LineageEditIdeaDialog } from './LineageEditIdeaDialog'
+import { LineageTagDialog } from './LineageTagDialog'
+import { LineageManualDialogs } from './LineageManualDialogs'
+import type { LineageNode } from '@shared/models/lineage'
+
+export function LineageBoardDialogs(props: {
+  nodes: LineageNode[]
+  addOpen: boolean
+  setAddOpen: (v: boolean) => void
+  ideaNodeId: string | null
+  setIdeaNodeId: (v: string | null) => void
+  tagNodeId: string | null
+  setTagNodeId: (v: string | null) => void
+  manualParentId: string | null
+  setManualParentId: (v: string | null) => void
+  manualManageId: string | null
+  setManualManageId: (v: string | null) => void
+}): JSX.Element {
+  const { nodes, addOpen, setAddOpen, ideaNodeId, setIdeaNodeId, tagNodeId, setTagNodeId, manualParentId, setManualParentId, manualManageId, setManualManageId } = props
+  const edges = useLineageStore((s) => s.edges)
+  const store = useLineageStore.getState
+  const ideaNode = ideaNodeId === null ? null : nodes.find((n) => n.id === ideaNodeId) ?? null
+  const tagNode = tagNodeId === null ? null : nodes.find((n) => n.id === tagNodeId) ?? null
+
+  return (
+    <>
+      <LineageAddNodeDialog
+        open={addOpen}
+        existingPaperIds={nodes.map((n) => n.paperId).filter((p): p is string => p !== null)}
+        onClose={() => setAddOpen(false)}
+        onAddPaper={(p) => store().addPaperNode(p)}
+        onAddTheme={(t) => store().addThemeNode(t)}
+      />
+
+      {ideaNode !== null && (
+        <LineageEditIdeaDialog
+          key={ideaNode.id}
+          open
+          node={ideaNode}
+          onClose={() => setIdeaNodeId(null)}
+          onSave={(id, idea) => store().editCoreIdea(id, idea)}
+        />
+      )}
+
+      {/* F-LG14 添加标签对话框（key 重挂载重置输入——EditIdeaDialog 同型）；
+          保存=既有 tags 合并新标签整组写（去重双保险：面板侧 includes 短路+
+          main repo 写边界单源） */}
+      {tagNode !== null && (
+        <LineageTagDialog
+          key={tagNode.id}
+          open
+          node={tagNode}
+          onClose={() => setTagNodeId(null)}
+          onSave={(id, tag) => {
+            const current = tagNode.tags ?? []
+            if (!current.includes(tag)) store().setNodeTags(id, [...current, tag])
+          }}
+        />
+      )}
+      {/* F-LG15 人工父双对话框宿主（连接目标选择/管理 label+删除——拆件
+          LineageManualDialogs；写路径收口 store.linkManualParent·
+          editManualEdgeLabel·removeEdge） */}
+      <LineageManualDialogs
+        nodes={nodes}
+        edges={edges}
+        manualParentId={manualParentId}
+        manualManageId={manualManageId}
+        onCloseParent={() => setManualParentId(null)}
+        onCloseManage={() => setManualManageId(null)}
+        onLinkManualParent={(childId, parentId, label) => store().linkManualParent(childId, parentId, label)}
+        onEditEdgeLabel={(edgeId, label) => store().editManualEdgeLabel(edgeId, label)}
+        onRemoveEdge={(edgeId) => store().removeEdge(edgeId)}
+      />
+    </>
+  )
+}
diff --git a/src/renderer/features/lineage/LineageBoardMenu.tsx b/src/renderer/features/lineage/LineageBoardMenu.tsx
new file mode 100644
index 0000000000..d20052f30d
--- /dev/null
+++ b/src/renderer/features/lineage/LineageBoardMenu.tsx
@@ -0,0 +1,106 @@
+// b3: P7-H
+/**
+ * [F-SPLIT-01] LineageBoardMenu —— 节点菜单+连线目标选取提示条（自
+ * LineageBoard 拆出 2026-09-05；迁移 LineageBoard 头注节点菜单/加边/改父/
+ * 目标选取职责段，JSX 语句零改纯搬运）。
+ *
+ * ── 行为层（原 LineageBoard 菜单+选取流程面）──
+ * - **加边**=源节点菜单「连线到…」目标选取；**改父**=既有子边删除+新边添加
+ *   两动作组合（UI 呈现单操作，service 两调用——树约束下改父=换父）；
+ *   **删边/删节点**=节点菜单
+ * - **树约束 UI 守卫**（INV-27 消费面）：加边 to 已有父/成环/自环三拒绝路径=
+ *   动作型 toast 中文 reason（**树守卫宿主=LG-01 service upsertEdge 运行时
+ *   守卫**——本件零守卫代码只接 toast 呈现=双保险同 08 按钮禁用语义）
+ * - 目标选取模式（源节点菜单发起：「连线到…」/「改父…」/「添加参考连接」
+ *   R2-LG12）提示条（激活期——R2-LG11 浅色板态：白底 accent 描边，行为零变）
+ * - tree 父边（kind=tree——manual 入边不算 tree 父，F-LG15：菜单「删除父连线」
+ *   仅针对 tree 边，manual 边删除走管理对话框）——menuParentEdge/
+ *   menuManualEdges 派生随迁本件（edges 经 store 自订阅）
+ * - 状态归属不变：menu/pendingLink 与各对话框开关由宿主 LineageBoard 持有，
+ *   本件经 props 收值+set 函数回写；store 写路径仍经 getState 单口
+ *
+ * ── 接口层 ──
+ * - export interface PendingLink / export function LineageBoardMenu(props:
+ *   { menu; pendingLink; setMenu; setPendingLink; setManualParentId;
+ *   setManualManageId; setIdeaNodeId; setTagNodeId }): JSX.Element
+ */
+import { useLineageStore } from './lineage.store'
+import { LineageNodeMenu } from './LineageNodeMenu'
+import type { LineageNode } from '@shared/models/lineage'
+
+/** 目标选取模式（源节点菜单发起：「连线到…」/「改父…」/「添加参考连接」R2-LG12） */
+export interface PendingLink {
+  source: string
+  mode: 'link' | 'reparent' | 'ref'
+}
+
+const MODE_HINT: Record<PendingLink['mode'], string> = {
+  link: '连线模式：点击目标节点（源 → 目标，目标成为子节点）',
+  reparent: '改父模式：点击新父节点',
+  ref: '参考连接模式：点击目标文献（综述 → 目标，淡灰虚线）'
+}
+
+/** 节点菜单锚（node+右键锚点——宿主 menu state 形状） */
+export type MenuTarget = { node: LineageNode; anchor: { x: number; y: number } }
+
+export function LineageBoardMenu(props: {
+  menu: MenuTarget | null
+  pendingLink: PendingLink | null
+  setMenu: (v: MenuTarget | null) => void
+  setPendingLink: (v: PendingLink | null) => void
+  setManualParentId: (v: string | null) => void
+  setManualManageId: (v: string | null) => void
+  setIdeaNodeId: (v: string | null) => void
+  setTagNodeId: (v: string | null) => void
+}): JSX.Element {
+  const { menu, pendingLink, setMenu, setPendingLink, setManualParentId, setManualManageId, setIdeaNodeId, setTagNodeId } = props
+  const edges = useLineageStore((s) => s.edges)
+  const store = useLineageStore.getState
+
+  // tree 父边（kind=tree——manual 入边不算 tree 父，F-LG15：菜单「删除父连线」
+  // 仅针对 tree 边，manual 边删除走管理对话框）
+  const menuParentEdge =
+    menu === null
+      ? null
+      : edges.find((e) => e.toNode === menu.node.id && e.kind === 'tree') ?? null
+  const menuManualEdges =
+    menu === null ? [] : edges.filter((e) => e.toNode === menu.node.id && e.kind === 'manual')
+
+  return (
+    <>
+      {/* 目标选取模式提示条（连线到…/改父…激活期——R2-LG11 浅色板态：
+          白底 accent 描边，行为零变） */}
+      {pendingLink !== null && (
+        <div
+          className="absolute left-1/2 top-2 z-(--z-float) flex -translate-x-1/2 items-center gap-2 rounded border px-3 py-1 text-xs"
+          style={{ borderColor: 'var(--accent)', background: 'var(--panel)', color: 'var(--accent)' }}
+          data-testid="lineage-pending-link"
+        >
+          <span>{MODE_HINT[pendingLink.mode]}</span>
+          <button type="button" className="underline" onClick={() => setPendingLink(null)}>
+            取消
+          </button>
+        </div>
+      )}
+
+      {menu !== null && (
+        <LineageNodeMenu
+          node={menu.node}
+          parentEdge={menuParentEdge}
+          manualParentEdges={menuManualEdges}
+          anchor={menu.anchor}
+          onClose={() => setMenu(null)}
+          onLinkTo={(id) => { setPendingLink({ source: id, mode: 'link' }); setMenu(null) }}
+          onReparent={(id) => { setPendingLink({ source: id, mode: 'reparent' }); setMenu(null) }}
+          onAddRefLink={(id) => { setPendingLink({ source: id, mode: 'ref' }); setMenu(null) }}
+          onLinkManualParent={(id) => { setManualParentId(id); setMenu(null) }}
+          onManageManualParents={(id) => { setManualManageId(id); setMenu(null) }}
+          onEditIdea={(id) => { setIdeaNodeId(id); setMenu(null) }}
+          onAddTag={(id) => { setTagNodeId(id); setMenu(null) }}
+          onRemoveParentEdge={(edgeId) => { store().removeEdge(edgeId); setMenu(null) }}
+          onRemoveNode={(id) => { store().removeNode(id); setMenu(null) }}
+        />
+      )}
+    </>
+  )
+}
diff --git a/src/renderer/features/reader/AiNotesSection.tsx b/src/renderer/features/reader/AiNotesSection.tsx
index dc6cffa4fa..4edb315451 100644
--- a/src/renderer/features/reader/AiNotesSection.tsx
+++ b/src/renderer/features/reader/AiNotesSection.tsx
@@ -10,43 +10,21 @@
  *   组——呈现轴转置 2026-08-28 缺陷 F，AiNoteGroupList+ai-note-style 单源）
  *   ×组内条目按 role 分段标注（一审/二审/裁决）；条目=锚定段引用块+content_md
  *   纯文本（textarea 级呈现，md 不渲染——负面清单红线）；**只读**零写路径（INV-19）
- * - 「AI 正在读」状态行+「AI 读文献」按钮（用户点击=手动激活——D2b）：
- *   按钮经 ai-sensor/request-read 写 job（AI-06 通道）；状态行按需轮询
- *   **ai-sensor/observe**（主控裁决方向 B，2026-08-27：status+per-paper
- *   hasPendingJob/productExists/archivedExists 四事实单次聚合——六态判定
- *   事实单源；STATUS_POLL_MS=5s 仅组件挂载期间=笔记面板打开，ADR §1 门控；
- *   卸载清 interval，INV-14 成对同族）
- * - **状态行状态机**（宪法状态机前置；观测=observe 四事实 per 当前篇 P；
- *   「AI 读文献」按钮行常驻本节头部（首次使用入口不悬空）；imported 非稳态
- *   移出（瞬时事件：导入完成→toast+list 刷新→稳态回 idle）：
- *
- *   | 态 | 触发事实（observe 输出） | 呈现 |
- *   | --- | --- | --- |
- *   | hidden | 无 job(P)+无未导入产物+无 DB 数据 | 仅按钮行（无状态行无分节） |
- *   | idle | 同 hidden 触发面但有 DB 数据（含已导入稳态） | 按钮行+分节（无状态行） |
- *   | pending | hasPendingJob(P) 且心跳不新鲜 | 「已请求 AI 阅读，等待 zcode 拾取…（上次状态：<state 自述>，可缺省）」 |
- *   | queued | hasPendingJob(P) 且心跳新鲜且 currentPaper≠P 或 =null | 「AI 正在处理队列（当前：他篇）…」；currentPaper=null 时无他篇名 |
- *   | reading | 心跳新鲜且 currentPaper=P | 「AI 正在读本文（state 自述文本）」 |
- *   | done-unimported | productExists(P) 且 !archivedExists(P) 且 job(P) 无 | 「AI 已读完，待导入」+「导入 AI 笔记」按钮 |
- *
- *   按钮禁用枚举：disabled=pending/queued/reading 三态（06 服务幂等为兜底，
- *   UI 禁用防误解双保险）；enabled=hidden/idle/done-unimported。
- *   跨格序列①~⑤见头注工单面（单测①③⑤已用例化；queued 经①的他篇路径）。
- * - 「导入 AI 笔记」按钮（done-unimported 态）：调 ai-notes/import（07 目录
- *   级全量——幂等使无害）→三桶 toast（imported/skipped 计数+errors 篇名）
- *   →list/observe 刷新（E1 手动激活形态——D2b 手动语义保持）
+ * - 状态行+「AI 读文献」按钮块职责归 AiNotesStatus.tsx（STATUS_POLL_MS=5s
+ *   挂载期门控轮询+observe 四事实六态判定呈现+「导入 AI 笔记」按钮三桶
+ *   toast；derivePhase 纯函数+六态表单源驻 ai-notes-phase.ts——本件分节
+ *   可见性条件 phase!=='hidden' 经 import 消费；[F-SPLIT-01] 自本件拆出
+ *   2026-09-05，语句零改：六态表/按钮禁用枚举/跨格序列①~⑤详述归该件头注）
  * - 条目单击→locateAnchor（INV-20 单入口消费方）。**exact 层接缝声明
  *   （门一 W08-3 处置——AI-09 已兑现）**：本节随锚传 aiNoteId→exact 层滚动
  *   闪烁 [data-ai-note-id] 渲染节点（AiAnnotationLayer 交付）——anchor-locate
  *   延展仅扩 exact 层目标识别面，三防线结构不动
- * - 轮询常量 STATUS_POLL_MS=5s 为本组件域私有（Rule of Three 第 2 次保持
- *   重复；第 3 处出现时抽 shared）
  *
  * ── 接口层 ──
  * - export function AiNotesSection(props: { highlightAiNoteId?: string | null }): JSX.Element
  * - 交付面：ai-note-style.ts+ai-notes.store.ts（AI 笔记数据+观测事实单源，
  *   **writeStatusProtocol 失败面幂等自愈声明见该 store 头注**）+本组件
- *   +AiNoteGroupList+ReaderNotesPanel 挂载一行
+ *   +AiNoteGroupList+AiNotesStatus+ReaderNotesPanel 挂载一行
  * - 数据单源接缝声明：ai-notes/list 取数+导入后刷新=store 单点；AI-09 渲染
  *   层经宿主订阅同 store 消费——禁 09 双取（双向锚定：store 头注+本行）
  *
@@ -62,40 +40,23 @@
  *
  * ── 文化层 ──
  * - 错误：observe 轮询失败=静默重试下一周期（列表型瞬态——不 toast 轰炸；
- *   连续失败 3 次显示离线提示行；status.json 损坏上抛=同计数路径——损坏≠
- *   missing 三态分离在 06 服务）；按钮动作型失败 toast（INV-02 两型分清）
+ *   连续失败 3 次显示离线提示行——随 AiNotesStatus；status.json 损坏上抛=
+ *   同计数路径——损坏≠missing 三态分离在 06 服务）；按钮动作型失败 toast
+ *   （INV-02 两型分清）
  * - 测试：tests/unit/renderer/ai-notes-section.test.tsx + ai-note-style.test.ts
  *   +e2e ai-notes-section.spec.ts（均受锁，always-active）
  */
-import { useEffect, useRef, useState } from 'react'
-import { ApiClientError } from '../../api/client'
-import { showToast } from '../../shared/ui/Toast'
+import { useEffect } from 'react'
 import { locateAnchor } from './anchor-locate'
 import { AiNoteGroupList } from './AiNoteGroupList'
+import { AiNotesStatus } from './AiNotesStatus'
+import { derivePhase } from './ai-notes-phase'
 import { useAiNotesStore } from './ai-notes.store'
 import { useActiveTab } from './useActiveTab'
-import type { ObserveRes } from '@shared/ipc/schemas'
 import type { AiNote } from '@shared/models/ai-note'
 
-/** 轮询周期（组件域私有——头注行为层声明） */
-const STATUS_POLL_MS = 5000
-/** 连续轮询失败阈值（≥ 此值显示离线提示行） */
-const POLL_FAIL_THRESHOLD = 3
-/** 意外异常（非 ApiClientError）时的兜底中文消息 */
-const ACTION_FAILED = '操作失败'
-
-type Phase = 'hidden' | 'idle' | 'pending' | 'queued' | 'reading' | 'done-unimported'
 /** 空数组稳定引用（selector 快照引用稳定——防 useSyncExternalStore 无限重渲染） */
 const EMPTY_NOTES: AiNote[] = []
-/** 六态推导（判定事实=observe 四事实单源；跨格序列①~⑤由轮询/动作驱动态迁移） */
-function derivePhase(facts: ObserveRes | null | undefined, hasNotes: boolean, paperId: string): Phase {
-  if (facts === null || facts === undefined) return hasNotes ? 'idle' : 'hidden'
-  const st = facts.status
-  if (st !== null && st.running && st.currentPaper === paperId) return 'reading'
-  if (facts.hasPendingJob) return st !== null && st.running ? 'queued' : 'pending'
-  if (facts.productExists && !facts.archivedExists) return 'done-unimported'
-  return hasNotes ? 'idle' : 'hidden'
-}
 
 export function AiNotesSection(props: { highlightAiNoteId?: string | null }): JSX.Element {
   const { highlightAiNoteId = null } = props
@@ -105,40 +66,6 @@ export function AiNotesSection(props: { highlightAiNoteId?: string | null }): JS
   const notes = useAiNotesStore((s) => (paperId === null ? EMPTY_NOTES : s.notesByPaper[paperId] ?? EMPTY_NOTES))
   const facts = useAiNotesStore((s) => (paperId === null ? undefined : s.observeByPaper[paperId]))
   const loadNotes = useAiNotesStore((s) => s.loadNotes)
-  const loadObserve = useAiNotesStore((s) => s.loadObserve)
-  const requestRead = useAiNotesStore((s) => s.requestRead)
-  const importAll = useAiNotesStore((s) => s.importAll)
-
-  /** 连续轮询失败计数（ref——不触发重渲染；阈值达标记离线行） */
-  const failCount = useRef(0)
-  const [offline, setOffline] = useState(false)
-
-  // 门控轮询：挂载/paperId 变化即拉一次+5s interval；卸载/换篇清（INV-14 成对）
-  useEffect(() => {
-    if (paperId === null) return
-    let cancelled = false
-    failCount.current = 0
-    setOffline(false)
-    const run = (): void => {
-      loadObserve(paperId)
-        .then(() => {
-          if (cancelled) return
-          failCount.current = 0
-          setOffline(false)
-        })
-        .catch(() => {
-          if (cancelled) return
-          failCount.current += 1
-          if (failCount.current >= POLL_FAIL_THRESHOLD) setOffline(true)
-        })
-    }
-    run()
-    const timer = setInterval(run, STATUS_POLL_MS)
-    return () => {
-      cancelled = true
-      clearInterval(timer)
-    }
-  }, [paperId, loadObserve])
 
   // 分节数据（列表型失败静默——离线行不覆盖 DB 取数面）
   useEffect(() => {
@@ -147,46 +74,8 @@ export function AiNotesSection(props: { highlightAiNoteId?: string | null }): JS
 
   if (paperId === null) return <></>
 
+  // 分节可见性口径（六态单源在 AiNotesStatus.derivePhase——hasNotes 事实同帧）
   const phase = derivePhase(facts, notes.length > 0, paperId)
-  const busy = phase === 'pending' || phase === 'queued' || phase === 'reading'
-  const st = facts?.status ?? null
-
-  let statusText: string | null = null
-  if (phase === 'pending') {
-    statusText = `已请求 AI 阅读，等待 zcode 拾取…${st !== null ? `（上次状态：${st.state}）` : ''}`
-  } else if (phase === 'queued') {
-    statusText = st?.currentPaper != null ? 'AI 正在处理队列（当前：他篇）…' : 'AI 正在处理队列…'
-  } else if (phase === 'reading') {
-    statusText = `AI 正在读本文（${st?.state ?? ''}）`
-  } else if (phase === 'done-unimported') {
-    statusText = 'AI 已读完，待导入'
-  }
-
-  /** 写 job（动作型失败 toast；失败无本地残留态——幂等自愈声明见 store 头注） */
-  const onRead = (): void => {
-    requestRead(paperId)
-      .then(() => loadObserve(paperId).catch(() => undefined))
-      .catch((e: unknown) => {
-        showToast(e instanceof ApiClientError ? e.message : ACTION_FAILED, 'error')
-      })
-  }
-
-  /** 导入（07 目录级全量幂等）→三桶 toast+刷新（imported 瞬时事件→稳态回 idle） */
-  const onImport = (): void => {
-    importAll()
-      .then((res) => {
-        const parts = [`导入 ${res.imported.length} 篇`, `跳过 ${res.skipped.length} 篇`]
-        if (res.errors.length > 0) {
-          parts.push(`失败 ${res.errors.length} 篇（${res.errors.map((e) => e.paperId).join('、')}）`)
-        }
-        showToast(`AI 笔记导入完成：${parts.join('，')}`, res.errors.length > 0 ? 'error' : 'success')
-        void loadNotes(paperId).catch(() => undefined)
-        void loadObserve(paperId).catch(() => undefined)
-      })
-      .catch((e: unknown) => {
-        showToast(e instanceof ApiClientError ? e.message : ACTION_FAILED, 'error')
-      })
-  }
 
   /** 条目单击→locateAnchor（INV-20 单入口；anchorPage 1 基→0 基页；
    *  aiNoteId=exact 层滚动锚（AI-09 交付 data-ai-note-id 渲染节点+延展兑现） */
@@ -209,38 +98,7 @@ export function AiNotesSection(props: { highlightAiNoteId?: string | null }): JS
       className="mt-1 flex flex-col gap-1 border-t pt-1"
       style={{ borderColor: 'var(--border)' }}
     >
-      <div className="flex items-center gap-2">
-        <button
-          type="button"
-          disabled={busy}
-          className="shrink-0 rounded border px-2 py-0.5 text-xs"
-          style={{ borderColor: 'var(--border)', color: busy ? 'var(--text-dim)' : 'var(--accent)' }}
-          onClick={onRead}
-        >
-          AI 读文献
-        </button>
-        {offline && (
-          <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
-            AI 状态暂不可用，将继续重试
-          </span>
-        )}
-      </div>
-      {statusText !== null && (
-        <p className="m-0 text-xs" data-testid="ai-status-line" role="status" style={{ color: 'var(--text-dim)' }}>
-          {statusText}
-        </p>
-      )}
-      {phase === 'done-unimported' && (
-        <button
-          type="button"
-          data-action="import"
-          className="self-start rounded border px-2 py-0.5 text-xs"
-          style={{ borderColor: 'var(--ok)', color: 'var(--ok)' }}
-          onClick={onImport}
-        >
-          导入 AI 笔记
-        </button>
-      )}
+      <AiNotesStatus paperId={paperId} hasNotes={notes.length > 0} />
       {notes.length > 0 && phase !== 'hidden' && (
         <AiNoteGroupList notes={notes} onLocate={onLocateNote} highlightAiNoteId={highlightAiNoteId} />
       )}
diff --git a/src/renderer/features/reader/AiNotesStatus.tsx b/src/renderer/features/reader/AiNotesStatus.tsx
new file mode 100644
index 0000000000..8cdb50e01a
--- /dev/null
+++ b/src/renderer/features/reader/AiNotesStatus.tsx
@@ -0,0 +1,158 @@
+// b3: P7-G
+/**
+ * [F-SPLIT-01] AiNotesStatus —— AI 状态行+动作按钮件（自 AiNotesSection 拆出
+ * 2026-09-05；迁移 AiNotesSection 头注状态行/按钮职责段，语句零改纯搬运——
+ * 六态表/derivePhase 单源驻 ai-notes-phase.ts，分节列表呈现与 locateAnchor
+ * 留宿主）。
+ *
+ * ── 行为层（原 AiNotesSection 状态面）──
+ * - 「AI 正在读」状态行+「AI 读文献」按钮（用户点击=手动激活——D2b）：
+ *   按钮经 ai-sensor/request-read 写 job（AI-06 通道）；状态行按需轮询
+ *   **ai-sensor/observe**（主控裁决方向 B，2026-08-27：status+per-paper
+ *   hasPendingJob/productExists/archivedExists 四事实单次聚合——六态判定
+ *   事实单源；STATUS_POLL_MS=5s 仅组件挂载期间=笔记面板打开，ADR §1 门控；
+ *   卸载清 interval，INV-14 成对同族；轮询常量仍为本域私有——Rule of Three
+ *   第 2 次保持重复，第 3 处出现时抽 shared）
+ * - 「导入 AI 笔记」按钮（done-unimported 态——六态表见 ai-notes-phase.ts）：
+ *   调 ai-notes/import（07 目录级全量——幂等使无害）→三桶 toast（imported/
+ *   skipped 计数+errors 篇名）→list/observe 刷新（E1 手动激活形态——D2b
+ *   手动语义保持）
+ * ── 接口层 ──
+ * - export function AiNotesStatus(props: { paperId: string; hasNotes: boolean
+ *   }): JSX.Element——observe 事实/动作函数经 ai-notes.store 自订阅（F-A3
+ *   per-tab 订阅先例同源；宿主已守 paperId 非 null）
+ * ── 文化层 ──
+ * - 错误：observe 轮询失败=静默重试下一周期（列表型瞬态——不 toast 轰炸；
+ *   连续失败 3 次显示离线提示行；status.json 损坏上抛=同计数路径——损坏≠
+ *   missing 三态分离在 06 服务）；按钮动作型失败 toast（INV-02 两型分清）
+ */
+import { useEffect, useRef, useState } from 'react'
+import { ApiClientError } from '../../api/client'
+import { showToast } from '../../shared/ui/Toast'
+import { useAiNotesStore } from './ai-notes.store'
+import { derivePhase } from './ai-notes-phase'
+
+/** 轮询周期（组件域私有——头注行为层声明） */
+const STATUS_POLL_MS = 5000
+/** 连续轮询失败阈值（≥ 此值显示离线提示行） */
+const POLL_FAIL_THRESHOLD = 3
+/** 意外异常（非 ApiClientError）时的兜底中文消息 */
+const ACTION_FAILED = '操作失败'
+
+export function AiNotesStatus(props: { paperId: string; hasNotes: boolean }): JSX.Element {
+  const { paperId, hasNotes } = props
+  const facts = useAiNotesStore((s) => s.observeByPaper[paperId])
+  const loadObserve = useAiNotesStore((s) => s.loadObserve)
+  const requestRead = useAiNotesStore((s) => s.requestRead)
+  const importAll = useAiNotesStore((s) => s.importAll)
+  const loadNotes = useAiNotesStore((s) => s.loadNotes)
+
+  /** 连续轮询失败计数（ref——不触发重渲染；阈值达标记离线行） */
+  const failCount = useRef(0)
+  const [offline, setOffline] = useState(false)
+
+  // 门控轮询：挂载/paperId 变化即拉一次+5s interval；卸载/换篇清（INV-14 成对；
+  // 原件 paperId null 守卫随 props 契约消解——宿主渲染本件前已守非空，零差）
+  useEffect(() => {
+    let cancelled = false
+    failCount.current = 0
+    setOffline(false)
+    const run = (): void => {
+      loadObserve(paperId)
+        .then(() => {
+          if (cancelled) return
+          failCount.current = 0
+          setOffline(false)
+        })
+        .catch(() => {
+          if (cancelled) return
+          failCount.current += 1
+          if (failCount.current >= POLL_FAIL_THRESHOLD) setOffline(true)
+        })
+    }
+    run()
+    const timer = setInterval(run, STATUS_POLL_MS)
+    return () => {
+      cancelled = true
+      clearInterval(timer)
+    }
+  }, [paperId, loadObserve])
+
+  const phase = derivePhase(facts, hasNotes, paperId)
+  const busy = phase === 'pending' || phase === 'queued' || phase === 'reading'
+  const st = facts?.status ?? null
+
+  let statusText: string | null = null
+  if (phase === 'pending') {
+    statusText = `已请求 AI 阅读，等待 zcode 拾取…${st !== null ? `（上次状态：${st.state}）` : ''}`
+  } else if (phase === 'queued') {
+    statusText = st?.currentPaper != null ? 'AI 正在处理队列（当前：他篇）…' : 'AI 正在处理队列…'
+  } else if (phase === 'reading') {
+    statusText = `AI 正在读本文（${st?.state ?? ''}）`
+  } else if (phase === 'done-unimported') {
+    statusText = 'AI 已读完，待导入'
+  }
+
+  /** 写 job（动作型失败 toast；失败无本地残留态——幂等自愈声明见 store 头注） */
+  const onRead = (): void => {
+    requestRead(paperId)
+      .then(() => loadObserve(paperId).catch(() => undefined))
+      .catch((e: unknown) => {
+        showToast(e instanceof ApiClientError ? e.message : ACTION_FAILED, 'error')
+      })
+  }
+
+  /** 导入（07 目录级全量幂等）→三桶 toast+刷新（imported 瞬时事件→稳态回 idle） */
+  const onImport = (): void => {
+    importAll()
+      .then((res) => {
+        const parts = [`导入 ${res.imported.length} 篇`, `跳过 ${res.skipped.length} 篇`]
+        if (res.errors.length > 0) {
+          parts.push(`失败 ${res.errors.length} 篇（${res.errors.map((e) => e.paperId).join('、')}）`)
+        }
+        showToast(`AI 笔记导入完成：${parts.join('，')}`, res.errors.length > 0 ? 'error' : 'success')
+        void loadNotes(paperId).catch(() => undefined)
+        void loadObserve(paperId).catch(() => undefined)
+      })
+      .catch((e: unknown) => {
+        showToast(e instanceof ApiClientError ? e.message : ACTION_FAILED, 'error')
+      })
+  }
+
+  return (
+    <>
+      <div className="flex items-center gap-2">
+        <button
+          type="button"
+          disabled={busy}
+          className="shrink-0 rounded border px-2 py-0.5 text-xs"
+          style={{ borderColor: 'var(--border)', color: busy ? 'var(--text-dim)' : 'var(--accent)' }}
+          onClick={onRead}
+        >
+          AI 读文献
+        </button>
+        {offline && (
+          <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
+            AI 状态暂不可用，将继续重试
+          </span>
+        )}
+      </div>
+      {statusText !== null && (
+        <p className="m-0 text-xs" data-testid="ai-status-line" role="status" style={{ color: 'var(--text-dim)' }}>
+          {statusText}
+        </p>
+      )}
+      {phase === 'done-unimported' && (
+        <button
+          type="button"
+          data-action="import"
+          className="self-start rounded border px-2 py-0.5 text-xs"
+          style={{ borderColor: 'var(--ok)', color: 'var(--ok)' }}
+          onClick={onImport}
+        >
+          导入 AI 笔记
+        </button>
+      )}
+    </>
+  )
+}
diff --git a/src/renderer/features/reader/AnnotationLayer.tsx b/src/renderer/features/reader/AnnotationLayer.tsx
index 8b83dcba3e..6709f6975f 100644
--- a/src/renderer/features/reader/AnnotationLayer.tsx
+++ b/src/renderer/features/reader/AnnotationLayer.tsx
@@ -13,11 +13,12 @@
  *   存量渐净；resolved 产物已过挂 A，幂等无害）
  * - 打开文档/翻页时三层编排重锚（[F-A8 门2] 项几何主链→DOM 回退→存量兜底
  *   ——annotation-resolve-layered 域；仅显示不回写库；MutationObserver+rAF 合并）
- * - 点击标注：弹四选项菜单（AnnotationMenu：复制引文→剪贴板+失败 toast；删除→
- *   confirm→api.reader.deleteAnnotation；添加笔记→开批注编辑 AnnotationEditor
- *   （comment textarea，保存 api.reader.updateAnnotation）；取消收起）——点击他条
- *   标注=切目标，不残留双弹层；成功后经 reader.store.updateAnnotation/
- *   removeAnnotation 同步本地数组并回调 onChanged
+ * - 弹层块职责归 AnnotationPopups.tsx（四选项菜单+AnnotationEditor 编辑 JSX
+ *   与 saveComment/copyQuote/deleteAnnotation 动作函数；menu/editing/busy
+ *   状态归属本层不变——经 props 收值+set 函数回写；[F-SPLIT-01] 自本件拆出
+ *   2026-09-05）：复制引文→剪贴板+失败 toast；删除→confirm→api；添加笔记→
+ *   批注编辑（保存 api.reader.updateAnnotation）；点击他条标注=切目标不残留
+ *   双弹层；成功后经 reader.store 同步本地数组并回调 onChanged
  * - sortKey 由仓储层生成（"页码:页内序号"），渲染按 props 顺序即可
  *
  * ── 接口层 ──
@@ -26,7 +27,8 @@
  *
  * ── 架构层 ──
  * - 重锚根是页根内 .textLayer 容器（与 SelectionLayer 同口径）；annotation-anchor
- *   是唯一 DOM 遍历点；api 调用 + store 三方法同步在本层，AnnotationEditor 纯展示
+ *   是唯一 DOM 遍历点；api 调用+store 三方法同步随弹层动作归 AnnotationPopups
+ *   （[F-SPLIT-01] 随迁），AnnotationEditor 纯展示
  * - 色块层 pointer-events:none 仅矩形可命中——点击标注即开菜单；矩形上方能否
  *   发起文本重选由选择模式条件化（F-A3/INV-42，F-A2 根治）：常规=v1 约束
  *   保持（从矩形外起选）；选择模式=rect 穿透（拖选可在标注块上发起；rectStyle
@@ -36,37 +38,19 @@
  * - e2e：tests/e2e/reader-text.spec.ts 后半（选中→高亮→重开仍在原位）
  */
 import { useEffect, useLayoutEffect, useState } from 'react'
-import type { Annotation, AnnotationRect } from '@shared/models/annotation'
-import { api, unwrap, ApiClientError } from '../../api/client'
-import { showToast } from '../../shared/ui/Toast'
+import type { Annotation } from '@shared/models/annotation'
 import { normalizedLineHeight, matchBand, bandsNearRects, type ResolvedAnnotation, type RowBand } from './annotation-resolve'
 import { resolveAnnotationRectsLayered } from './annotation-resolve-layered'
 import { usePageItemsStore } from './page-items.store'
 import { mergeRects } from './annotation-merge'
-import { pushUndo } from './annotation-undo'
-import { AnnotationEditor } from './AnnotationEditor'
-import { AnnotationMenu } from './AnnotationMenu'
 import { rectStyle } from './annotation-style'
 import { PAGE_LAYER_Z } from './page-layer-z'
 import { useReaderStore } from './reader.store'
-
-/** 意外异常（非 ApiClientError）时的兜底中文消息 */
-const UPDATE_FAILED = '标注保存失败'
-const DELETE_FAILED = '标注删除失败'
-const DELETE_CONFIRM = '删除这条标注？'
+import { AnnotationPopups, type PopupTarget } from './AnnotationPopups'
 
 /** 重锚后的显示矩形（id → { rects, bands }；缺项回退存量 rects） */
 type ResolvedRects = Record<string, ResolvedAnnotation>
 
-/** 弹层目标（连同命中矩形供定位）——菜单与编辑器互斥使用同形 */
-interface PopupTarget {
-  annotation: Annotation
-  rect: AnnotationRect
-}
-
-/** 复制失败的动作型提示（双路径共用；菜单已乐观收起，重试=重新点击标注） */
-const COPY_FAILED = '复制到剪贴板失败，可点击标注重试'
-
 export function AnnotationLayer(props: {
   annotations: Annotation[]
   page: number
@@ -126,64 +110,6 @@ export function AnnotationLayer(props: {
     return () => observer.disconnect()
   }, [annotations, page, pageRoot, pageEntry])
 
-  /** 批注保存：api 成功 → store 同步 → 收起弹层 → onChanged 通知 */
-  async function saveComment(a: Annotation, comment: string): Promise<void> {
-    if (busy) {
-      return
-    }
-    setBusy(true)
-    try {
-      const next: Annotation = { ...a, comment, updatedAt: new Date().toISOString() }
-      const saved = await unwrap(api.reader.updateAnnotation({ annotation: next }))
-      useReaderStore.getState().updateAnnotation(saved)
-      pushUndo(a.paperId, { kind: 'comment-edit', before: a })
-      useReaderStore.getState().clearTabDirty(a.paperId)
-      setEditing(null)
-      onChanged()
-    } catch (e) {
-      // 保存失败：tab 灰点置位（TABS-03 两写面之一）
-      useReaderStore.getState().markTabDirty(a.paperId)
-      showToast(e instanceof ApiClientError ? e.message : UPDATE_FAILED, 'error')
-    } finally {
-      setBusy(false)
-    }
-  }
-
-  /** 复制引文：双路径失败 toast（同步异常/写入拒绝，INV-02 动作型）→ 收起菜单 */
-  function copyQuote(a: Annotation): void {
-    setMenu(null)
-    try {
-      void navigator.clipboard.writeText(a.quoteText).catch(() => {
-        showToast(COPY_FAILED, 'error')
-      })
-    } catch {
-      showToast(COPY_FAILED, 'error')
-    }
-  }
-
-  /** 删除：confirm 确认 → api → store 同步 → 收起（菜单/编辑器一并）→ onChanged 通知 */
-  async function deleteAnnotation(a: Annotation): Promise<void> {
-    if (busy || !window.confirm(DELETE_CONFIRM)) {
-      return
-    }
-    setBusy(true)
-    try {
-      await unwrap(api.reader.deleteAnnotation({ annotationId: a.id }))
-      useReaderStore.getState().removeAnnotation(a.id)
-      pushUndo(a.paperId, { kind: 'delete', annotation: a })
-      useReaderStore.getState().clearTabDirty(a.paperId)
-      setEditing(null)
-      setMenu(null)
-      onChanged()
-    } catch (e) {
-      // 删除失败：tab 灰点置位（TABS-03 两写面之一）
-      useReaderStore.getState().markTabDirty(a.paperId)
-      showToast(e instanceof ApiClientError ? e.message : DELETE_FAILED, 'error')
-    } finally {
-      setBusy(false)
-    }
-  }
-
   return (
     <>
       <div
@@ -219,31 +145,7 @@ export function AnnotationLayer(props: {
           ))
         )}
       </div>
-      {menu !== null && (
-        <AnnotationMenu
-          annotation={menu.annotation}
-          rect={menu.rect}
-          busy={busy}
-          onCopy={() => copyQuote(menu.annotation)}
-          onDelete={() => void deleteAnnotation(menu.annotation)}
-          onAddNote={() => {
-            setEditing(menu)
-            setMenu(null)
-          }}
-          onCancel={() => setMenu(null)}
-        />
-      )}
-      {editing !== null && (
-        <AnnotationEditor
-          key={editing.annotation.id}
-          annotation={editing.annotation}
-          rect={editing.rect}
-          busy={busy}
-          onCancel={() => setEditing(null)}
-          onSave={(comment) => void saveComment(editing.annotation, comment)}
-          onDelete={() => void deleteAnnotation(editing.annotation)}
-        />
-      )}
+      <AnnotationPopups menu={menu} editing={editing} busy={busy} setMenu={setMenu} setEditing={setEditing} setBusy={setBusy} onChanged={onChanged} />
     </>
   )
 }
diff --git a/src/renderer/features/reader/AnnotationPopups.tsx b/src/renderer/features/reader/AnnotationPopups.tsx
new file mode 100644
index 0000000000..e30f14bcf4
--- /dev/null
+++ b/src/renderer/features/reader/AnnotationPopups.tsx
@@ -0,0 +1,147 @@
+/**
+ * [F-SPLIT-01] AnnotationPopups —— 标注弹层动作件（自 AnnotationLayer 拆出
+ * 2026-09-05；迁移 AnnotationLayer 头注弹层职责段——四选项菜单+批注编辑器
+ * JSX 与动作函数，语句零改纯搬运）。
+ *
+ * ── 行为层（原 AnnotationLayer 弹层块）──
+ * - 点击标注：弹四选项菜单（AnnotationMenu：复制引文→剪贴板+失败 toast；删除→
+ *   confirm→api.reader.deleteAnnotation；添加笔记→开批注编辑 AnnotationEditor
+ *   （comment textarea，保存 api.reader.updateAnnotation）；取消收起）——点击他条
+ *   标注=切目标，不残留双弹层；成功后经 reader.store.updateAnnotation/
+ *   removeAnnotation 同步本地数组并回调 onChanged
+ * - 弹层可无本地状态（拆件裁量：禁改状态归属）——menu/editing/busy 由宿主
+ *   AnnotationLayer 持有，本件经 props 收值+set 函数回写；saveComment/
+ *   copyQuote/deleteAnnotation 动作函数随弹层 JSX 迁入，busy 守卫/失败 toast
+ *   （含 tab 灰点两写面 markTabDirty/clearTabDirty）/pushUndo 语句零改。
+ *
+ * ── 接口层 ──
+ * - export function AnnotationPopups(props: { menu: PopupTarget | null;
+ *   editing: PopupTarget | null; busy: boolean; setMenu; setEditing; setBusy;
+ *   onChanged }): JSX.Element（PopupTarget 接口随迁本件——宿主 state 类型
+ *   消费经 import 单源）
+ *
+ * ── 架构层 ──
+ * - api 调用+store 三方法同步随弹层动作归本件（原 AnnotationLayer 头注「在
+ *   本层」随迁——色块命中上抛与重锚编排留宿主）；AnnotationEditor 纯展示不变。
+ */
+import { api, unwrap, ApiClientError } from '../../api/client'
+import { showToast } from '../../shared/ui/Toast'
+import { pushUndo } from './annotation-undo'
+import { AnnotationEditor } from './AnnotationEditor'
+import { AnnotationMenu } from './AnnotationMenu'
+import { useReaderStore } from './reader.store'
+import type { Annotation, AnnotationRect } from '@shared/models/annotation'
+
+/** 意外异常（非 ApiClientError）时的兜底中文消息 */
+const UPDATE_FAILED = '标注保存失败'
+const DELETE_FAILED = '标注删除失败'
+const DELETE_CONFIRM = '删除这条标注？'
+
+/** 弹层目标（连同命中矩形供定位）——菜单与编辑器互斥使用同形 */
+export interface PopupTarget {
+  annotation: Annotation
+  rect: AnnotationRect
+}
+
+/** 复制失败的动作型提示（双路径共用；菜单已乐观收起，重试=重新点击标注） */
+const COPY_FAILED = '复制到剪贴板失败，可点击标注重试'
+
+export function AnnotationPopups(props: {
+  menu: PopupTarget | null
+  editing: PopupTarget | null
+  busy: boolean
+  setMenu: (v: PopupTarget | null) => void
+  setEditing: (v: PopupTarget | null) => void
+  setBusy: (v: boolean) => void
+  onChanged: () => void
+}): JSX.Element {
+  const { menu, editing, busy, setMenu, setEditing, setBusy, onChanged } = props
+
+  /** 批注保存：api 成功 → store 同步 → 收起弹层 → onChanged 通知 */
+  async function saveComment(a: Annotation, comment: string): Promise<void> {
+    if (busy) {
+      return
+    }
+    setBusy(true)
+    try {
+      const next: Annotation = { ...a, comment, updatedAt: new Date().toISOString() }
+      const saved = await unwrap(api.reader.updateAnnotation({ annotation: next }))
+      useReaderStore.getState().updateAnnotation(saved)
+      pushUndo(a.paperId, { kind: 'comment-edit', before: a })
+      useReaderStore.getState().clearTabDirty(a.paperId)
+      setEditing(null)
+      onChanged()
+    } catch (e) {
+      // 保存失败：tab 灰点置位（TABS-03 两写面之一）
+      useReaderStore.getState().markTabDirty(a.paperId)
+      showToast(e instanceof ApiClientError ? e.message : UPDATE_FAILED, 'error')
+    } finally {
+      setBusy(false)
+    }
+  }
+
+  /** 复制引文：双路径失败 toast（同步异常/写入拒绝，INV-02 动作型）→ 收起菜单 */
+  function copyQuote(a: Annotation): void {
+    setMenu(null)
+    try {
+      void navigator.clipboard.writeText(a.quoteText).catch(() => {
+        showToast(COPY_FAILED, 'error')
+      })
+    } catch {
+      showToast(COPY_FAILED, 'error')
+    }
+  }
+
+  /** 删除：confirm 确认 → api → store 同步 → 收起（菜单/编辑器一并）→ onChanged 通知 */
+  async function deleteAnnotation(a: Annotation): Promise<void> {
+    if (busy || !window.confirm(DELETE_CONFIRM)) {
+      return
+    }
+    setBusy(true)
+    try {
+      await unwrap(api.reader.deleteAnnotation({ annotationId: a.id }))
+      useReaderStore.getState().removeAnnotation(a.id)
+      pushUndo(a.paperId, { kind: 'delete', annotation: a })
+      useReaderStore.getState().clearTabDirty(a.paperId)
+      setEditing(null)
+      setMenu(null)
+      onChanged()
+    } catch (e) {
+      // 删除失败：tab 灰点置位（TABS-03 两写面之一）
+      useReaderStore.getState().markTabDirty(a.paperId)
+      showToast(e instanceof ApiClientError ? e.message : DELETE_FAILED, 'error')
+    } finally {
+      setBusy(false)
+    }
+  }
+
+  return (
+    <>
+      {menu !== null && (
+        <AnnotationMenu
+          annotation={menu.annotation}
+          rect={menu.rect}
+          busy={busy}
+          onCopy={() => copyQuote(menu.annotation)}
+          onDelete={() => void deleteAnnotation(menu.annotation)}
+          onAddNote={() => {
+            setEditing(menu)
+            setMenu(null)
+          }}
+          onCancel={() => setMenu(null)}
+        />
+      )}
+      {editing !== null && (
+        <AnnotationEditor
+          key={editing.annotation.id}
+          annotation={editing.annotation}
+          rect={editing.rect}
+          busy={busy}
+          onCancel={() => setEditing(null)}
+          onSave={(comment) => void saveComment(editing.annotation, comment)}
+          onDelete={() => void deleteAnnotation(editing.annotation)}
+        />
+      )}
+    </>
+  )
+}
diff --git a/src/renderer/features/reader/PageColumn.tsx b/src/renderer/features/reader/PageColumn.tsx
index 016bb6e435..c255941ffe 100644
--- a/src/renderer/features/reader/PageColumn.tsx
+++ b/src/renderer/features/reader/PageColumn.tsx
@@ -12,11 +12,12 @@
  * getPage）；IO deps 增 layout（列↔行 DOM 重排后重挂）；段⑥锚总高按
  * 布局口径；懒渲染回收/scroll-progress 回写/程序滚动按页号消费零改。── 行为层：
  * - 段①页列就绪管线：doc 就绪→逐页 getPage→尺寸数组（缓存单源）→占位盒全列（总高确定）→onReady(列宽基准)→F-03 恢复 scrollTo；越界夹取锚本段（scrollToPage 前 clamp——openPaper 时 totalPages≡0 不可行）。[F-A7 增补 2026-09-04] 尺寸口径=viewport 旋转口径（rotate 归一化后 %180===90 交换宽高，/Rotate 元数据适配）。
- * - 段②占位盒布局：高=pageSizes[no]×zoom；宽=列宽（最宽页×zoom 居中；双页=各自页宽，行内左顶对齐）；未渲染盒空白。
- * - 段③懒渲染窗口：视口±1 页真渲染（canvas+覆盖层经 renderPage）；离屏>2 页销毁；IntersectionObserver 占位盒驱动（INV-30：canvas 生命周期=渲染窗口绑定）。
+ * - 段②占位盒布局+ready JSX 职责归 PageColumnView.tsx（容器+行/列页盒装配，[F-SPLIT-01] 自本件拆出 2026-09-05）。
+ * - 段③懒渲染窗口职责归 usePageLazyWindow.ts（visible/rendered 状态对+IO 占位盒驱动+回收调度——视口±1 页真渲染、离屏>2 页销毁、INV-30 canvas 生命周期=渲染窗口绑定，[F-SPLIT-01] 自本件拆出 2026-09-05）。
+ * - 段⑤程序滚动+段⑥滚动位置镜像职责归 usePageColumnScroll.ts（PageScrollRequest 接口随迁、本件再导出；[F-SPLIT-01] 自本件拆出 2026-09-05）。
  * - 段④层实例化分工：覆盖层（TextLayer/AnnotationLayer/AiAnnotationLayer）经 renderPage(no) 每渲染页一套（props 不变父层循环）；SelectionLayer 单实例挂锚定页盒（锚定根动态归 F-02；挂载位=可见首报告）。
  * - 段⑤双源机制：scrollRequest（reader.store setPage 默认 'to' 时 bump）变化→scrollToPage(no)（盒顶）；'none'（滚动回写）不 bump 不滚（INV-29）。
- * - 段⑥缩放中心锚（F-04）：zoom prop 变化（就绪后）→盒高按缓存×新 zoom 重算→布局效应程序修正滚动容器 scrollTop（anchoredScrollTop 纯函数）；滚动位置镜像=容器 scroll 事件被动监听（程序/用户滚动皆覆盖）；修正属程序性 scrollTop 赋值，不经 wheel/keydown/pointerdown 接管链（INV-32 语义不受扰）。
+ * - 段⑥缩放中心锚（F-04）：zoom prop 变化（就绪后）→盒高按缓存×新 zoom 重算→布局效应程序修正滚动容器 scrollTop（anchoredScrollTop 纯函数）；滚动位置镜像=容器 scroll 事件被动监听（程序/用户滚动皆覆盖——镜像效应归 usePageColumnScroll.ts）；修正属程序性 scrollTop 赋值，不经 wheel/keydown/pointerdown 接管链（INV-32 语义不受扰）。
  * - 布局态状态机：loading（尺寸未齐）→ready；每页 empty→rendering→rendered→recycling→empty；跨格：快速滚动（rendering 中滚出窗口→cancel→recycling）；zoom 变化（缓存×新 zoom 重算→窗口重评估，就绪后无 loading）；F-R1 布局切换（就绪后重派生行+重报 basis，无 loading；切布局位置保持走 onReady 恢复链非 zoom 锚）。
  * - 内存断言：canvas 实例数≤渲染窗口+缓冲常量；快速滚动零泄漏。
  * ── 接口层 ──
@@ -28,31 +29,23 @@ import { useEffect, useLayoutEffect, useRef, useState } from 'react'
 import type { RefObject } from 'react'
 import type { PDFDocumentProxy } from './PdfDocProvider'
 import type { PdfPageGeometry, PdfTextContent } from './PdfPageCanvas'
-import { PageBox } from './PageBox'
+import { PageColumnView } from './PageColumnView'
 import {
   anchoredScrollTop,
-  clampPageToColumn,
   columnTotalHeightFor,
   columnWidthFor,
-  layoutRows,
-  pageBoxWidth,
-  recycledPages,
-  windowPages,
   type PageBoxSize,
   type PageLayout
 } from './page-column-geometry'
-import { scrollIntoNearestScroller } from './scroll-converge'
+import { usePageLazyWindow } from './usePageLazyWindow'
+import { usePageScrollRequest, useScrollTopMirror, type PageScrollRequest } from './usePageColumnScroll'
 
 // nearestPage 再导出维持 scroll-progress 既有 import 路径（单实现双出口）
 export { nearestPage } from './page-column-geometry'
 export type { PageBoxSize } from './page-column-geometry'
-
-/** 程序滚动请求（reader.store scrollRequest 的形状——INV-29 单口消费面） */
-export interface PageScrollRequest {
-  paperId: string
-  page: number
-  seq: number
-}
+// PageScrollRequest 再导出维持 PagesOverlay/ReaderPage 既有 import 路径（单实现
+// 双出口——接口本体随段⑤程序滚动驻 usePageColumnScroll）
+export type { PageScrollRequest } from './usePageColumnScroll'
 
 export function PageColumn(props: {
   doc: PDFDocumentProxy | null
@@ -81,17 +74,13 @@ export function PageColumn(props: {
   const rootRef = useRef<HTMLDivElement | null>(null)
   // 回调 latest-ref：父层内联函数不触发管线重跑
   const onReadyRef = useRef(props.onReady)
-  const onVisibleRef = useRef(props.onVisibleChange)
   const onErrorRef = useRef(props.onError)
   onReadyRef.current = props.onReady
-  onVisibleRef.current = props.onVisibleChange
   onErrorRef.current = props.onError
   // F-R1 latest-ref：就绪管线 deps [doc,totalPages] 零变，完成时报当前布局口径
   const layoutRef = useRef(layout)
   layoutRef.current = layout
   const [pageSizes, setPageSizes] = useState<PageBoxSize[] | null>(null)
-  const [visible, setVisible] = useState<Set<number>>(() => new Set())
-  const [rendered, setRendered] = useState<Set<number>>(() => new Set())
   // 段①error 终态（W2 门一回炉）：管线失败→onError 上抛（INV-02）+不再 loading
   const [sizesError, setSizesError] = useState(false)
   // 段⑥缩放中心锚：滚动位置镜像（容器 scroll 事件被动监听——程序/用户滚动皆覆盖）
@@ -100,6 +89,12 @@ export function PageColumn(props: {
   // F-R1 布局切换重报的对照位（轻 effect 判「layout 确已变化」）
   const prevLayout = useRef(layout)
 
+  // 段③懒渲染窗口（visible/rendered 状态对+IO 占位盒驱动+回收调度——usePageLazyWindow）
+  const { rendered } = usePageLazyWindow(rootRef, pageSizes, layout, totalPages, renderWindow, recycleWindow, props.onVisibleChange)
+  // 段⑤程序滚动（INV-29 单口）+段⑥滚动位置镜像——usePageColumnScroll
+  usePageScrollRequest(props.scrollRequest, pageSizes, totalPages, rootRef)
+  useScrollTopMirror(props.scrollContainerRef, liveScrollTop)
+
   // 段①就绪管线：doc/totalPages 变化→逐页 getPage→view 尺寸数组（缓存单源）→占位
   // 全列→onReady(列宽基准——当前布局口径)；zoom/layout 不入依赖（缓存乘法非重取）
   useEffect(() => {
@@ -138,63 +133,6 @@ export function PageColumn(props: {
     onReadyRef.current?.(columnWidthFor(pageSizes, 1, layout))
   }, [layout, pageSizes])
 
-  // 段③IO：占位盒驱动可见集（就绪后挂载；F-R1 deps 增 layout——列↔行 DOM 重排后重挂）
-  useEffect(() => {
-    if (pageSizes === null) return
-    const io = new IntersectionObserver((entries) => {
-      setVisible((prev) => {
-        const next = new Set(prev)
-        for (const e of entries) {
-          const no = Number((e.target as HTMLElement).dataset.pageBox)
-          if (Number.isNaN(no)) continue
-          if (e.isIntersecting) next.add(no)
-          else next.delete(no)
-        }
-        const same = next.size === prev.size && [...next].every((n) => prev.has(n))
-        return same ? prev : next
-      })
-    })
-    for (const el of rootRef.current?.querySelectorAll<HTMLElement>('[data-page-box]') ?? []) {
-      io.observe(el)
-    }
-    return () => io.disconnect()
-  }, [pageSizes, layout])
-
-  // 可见集上抛（升序；SelectionLayer 锚定页挂载位等消费）
-  useEffect(() => {
-    onVisibleRef.current?.([...visible].sort((a, b) => a - b))
-  }, [visible])
-
-  // 段③调度：渲染窗口并入+离屏回收（空可见=顶部引导窗口，不跑回收）
-  useEffect(() => {
-    setRendered((prev) => {
-      const want = windowPages(visible, totalPages, renderWindow)
-      if (visible.size === 0) return new Set(want)
-      return recycledPages(new Set([...prev, ...want]), visible, recycleWindow)
-    })
-  }, [visible, totalPages, renderWindow, recycleWindow])
-
-  // 段⑤程序滚动（INV-29 单口）：夹取→页盒顶对齐视口顶（F-05 单容器收敛 INV-34）；
-  // 未就绪挂起、就绪补滚（双页左右页盒顶同行——滚行顶零特判）
-  useEffect(() => {
-    if (pageSizes === null || props.scrollRequest === null || props.scrollRequest === undefined) return
-    const no = clampPageToColumn(props.scrollRequest.page + 1, totalPages)
-    const box = rootRef.current?.querySelector<HTMLElement>(`[data-page-box="${no}"]`) ?? null
-    if (box !== null) scrollIntoNearestScroller(box, 'start')
-  }, [props.scrollRequest, pageSizes, totalPages])
-
-  // 段⑥滚动位置镜像：容器 scroll 事件被动监听（挂载即读初值——恢复链程序滚动亦派发事件）
-  useEffect(() => {
-    const el = props.scrollContainerRef?.current ?? null
-    if (el === null) return
-    const mirror = (): void => {
-      liveScrollTop.current = el.scrollTop
-    }
-    mirror()
-    el.addEventListener('scroll', mirror, { passive: true })
-    return () => el.removeEventListener('scroll', mirror)
-  }, [props.scrollContainerRef])
-
   // 段⑥缩放中心锚（INV-33）：总高按布局口径 columnTotalHeightFor（双页=行
   // 高和）；layout 不入 deps——切布局位置保持走 onReady 恢复链（非 zoom 锚）
   useLayoutEffect(() => {
@@ -220,30 +158,7 @@ export function PageColumn(props: {
   }
   const width = columnWidthFor(pageSizes, zoom, layout)
   return (
-    <div
-      ref={rootRef}
-      data-page-column="ready"
-      className="mx-auto flex flex-col items-center gap-3"
-      style={{ width }}
-    >
-      {layout === 'double'
-        ? layoutRows(pageSizes).map((row) => (
-          // F-R1 双页行：两页盒并排 flex 左顶对齐；行内 gap-3 与 PAGE_GAP_PX 同源
-          // （rowWidth 口径）；末行单页右缺席不渲染空盒——列宽已排除孤页行，
-          // 行宽恒=左盒宽无跳变（S3 自裁，视觉验收归真机探针场景 E）
-          <div key={row.leftNo} data-page-row={row.leftNo} className="flex shrink-0 items-start gap-3">
-            <PageBox no={row.leftNo} size={row.left} zoom={zoom} boxWidth={pageBoxWidth(row.left, zoom)} rendered={rendered.has(row.leftNo)}
-              doc={doc} renderPage={props.renderPage} onPageRender={props.onPageRender} onError={props.onError} />
-            {row.right !== undefined && row.rightNo !== undefined ? (
-              <PageBox no={row.rightNo} size={row.right} zoom={zoom} boxWidth={pageBoxWidth(row.right, zoom)} rendered={rendered.has(row.rightNo)}
-                doc={doc} renderPage={props.renderPage} onPageRender={props.onPageRender} onError={props.onError} />
-            ) : null}
-          </div>
-        ))
-        : pageSizes.map((size, i) => (
-          <PageBox key={i + 1} no={i + 1} size={size} zoom={zoom} boxWidth={width} rendered={rendered.has(i + 1)}
-            doc={doc} renderPage={props.renderPage} onPageRender={props.onPageRender} onError={props.onError} />
-        ))}
-    </div>
+    <PageColumnView rootRef={rootRef} pageSizes={pageSizes} zoom={zoom} layout={layout} width={width} rendered={rendered}
+      doc={doc} renderPage={props.renderPage} onPageRender={props.onPageRender} onError={props.onError} />
   )
 }
diff --git a/src/renderer/features/reader/PageColumnView.tsx b/src/renderer/features/reader/PageColumnView.tsx
new file mode 100644
index 0000000000..0f1a7f6403
--- /dev/null
+++ b/src/renderer/features/reader/PageColumnView.tsx
@@ -0,0 +1,71 @@
+/**
+ * [F-SPLIT-01] PageColumnView —— 页列 ready 态渲染件（自 PageColumn 拆出
+ * 2026-09-05；迁移 PageColumn 头注段②占位盒布局+F-R1 行渲染分支职责段，
+ * JSX 零改纯搬运）。
+ *
+ * ── 行为层（原 PageColumn 段②+ready JSX）──
+ * - 段②占位盒布局：高=pageSizes[no]×zoom；宽=列宽（最宽页×zoom 居中；双页=
+ *   各自页宽，行内左顶对齐）；未渲染盒空白。容器 data-page-column="ready"
+ *   （rootRef/width 由宿主传入——段③IO 与段⑤程序滚动按 [data-page-box]
+ *   页号消费，data-page-row 行盒口径不变）。
+ * - F-R1 双页行：两页盒并排 flex 左顶对齐；行内 gap-3 与 PAGE_GAP_PX 同源
+ *   （rowWidth 口径）；末行单页右缺席不渲染空盒——列宽已排除孤页行，
+ *   行宽恒=左盒宽无跳变（S3 自裁，视觉验收归真机探针场景 E）。
+ * - 页盒 JSX=PageBox（单双页共用，F-R1 拆件——函数形态原样，不加
+ *   useCallback/useMemo）。
+ *
+ * ── 接口层 ──
+ * - export function PageColumnView(props: { rootRef; pageSizes; zoom; layout;
+ *   width; rendered; doc; renderPage(no); onPageRender(no, payload, geometry);
+ *   onError(msg) }): JSX.Element（width=宿主 columnWidthFor 单源计算传入）
+ */
+import type { MutableRefObject } from 'react'
+import type { PDFDocumentProxy } from './PdfDocProvider'
+import type { PdfPageGeometry, PdfTextContent } from './PdfPageCanvas'
+import { PageBox } from './PageBox'
+import { layoutRows, pageBoxWidth, type PageBoxSize, type PageLayout } from './page-column-geometry'
+
+export function PageColumnView(props: {
+  /** 宿主列根 ref（IO/段⑤程序滚动的 [data-page-box] 查询根——useRef 实返型） */
+  rootRef: MutableRefObject<HTMLDivElement | null>
+  pageSizes: PageBoxSize[]
+  zoom: number
+  layout: PageLayout
+  /** 列宽（宿主 columnWidthFor 计算单源——容器 style 与页盒共用） */
+  width: number
+  /** 渲染窗口成员集（宿主 usePageLazyWindow rendered） */
+  rendered: Set<number>
+  doc: PDFDocumentProxy | null
+  renderPage(no: number): JSX.Element
+  onPageRender(no: number, payload: PdfTextContent, geometry: PdfPageGeometry): void
+  onError(msg: string): void
+}): JSX.Element {
+  const { pageSizes, zoom, layout, width, rendered, doc } = props
+  return (
+    <div
+      ref={props.rootRef}
+      data-page-column="ready"
+      className="mx-auto flex flex-col items-center gap-3"
+      style={{ width }}
+    >
+      {layout === 'double'
+        ? layoutRows(pageSizes).map((row) => (
+          // F-R1 双页行：两页盒并排 flex 左顶对齐；行内 gap-3 与 PAGE_GAP_PX 同源
+          // （rowWidth 口径）；末行单页右缺席不渲染空盒——列宽已排除孤页行，
+          // 行宽恒=左盒宽无跳变（S3 自裁，视觉验收归真机探针场景 E）
+          <div key={row.leftNo} data-page-row={row.leftNo} className="flex shrink-0 items-start gap-3">
+            <PageBox no={row.leftNo} size={row.left} zoom={zoom} boxWidth={pageBoxWidth(row.left, zoom)} rendered={rendered.has(row.leftNo)}
+              doc={doc} renderPage={props.renderPage} onPageRender={props.onPageRender} onError={props.onError} />
+            {row.right !== undefined && row.rightNo !== undefined ? (
+              <PageBox no={row.rightNo} size={row.right} zoom={zoom} boxWidth={pageBoxWidth(row.right, zoom)} rendered={rendered.has(row.rightNo)}
+                doc={doc} renderPage={props.renderPage} onPageRender={props.onPageRender} onError={props.onError} />
+            ) : null}
+          </div>
+        ))
+        : pageSizes.map((size, i) => (
+          <PageBox key={i + 1} no={i + 1} size={size} zoom={zoom} boxWidth={width} rendered={rendered.has(i + 1)}
+            doc={doc} renderPage={props.renderPage} onPageRender={props.onPageRender} onError={props.onError} />
+        ))}
+    </div>
+  )
+}
diff --git a/src/renderer/features/reader/ReaderPage.tsx b/src/renderer/features/reader/ReaderPage.tsx
index fa0537eaf0..fb8414553e 100644
--- a/src/renderer/features/reader/ReaderPage.tsx
+++ b/src/renderer/features/reader/ReaderPage.tsx
@@ -3,7 +3,10 @@
  *
  * ── 行为层 ──
  * - 无打开文档：空态引导；打开：openPaper→PdfDocProvider+PageColumn 页列+
- *   SelectionLayer+ReaderToolbar+OutlinePanel 布局（侧栏可折叠）
+ *   SelectionLayer+ReaderToolbar+OutlinePanel 布局（侧栏可折叠）——装配 JSX
+ *   分组（空态引导/主区滚动容器/工具栏+目录布局）职责归 ReaderPageView.tsx
+ *   （[F-SPLIT-01] 自本件拆出 2026-09-05，语句零改；F-03 三口接线
+ *   onScroll/wheel/pointerdown 随 JSX 原样迁，keydown 见快捷键件）
  * - 接收 library 侧"打开文献"事件（挂载闩锁补读+实时监听；定路由归 openFromBus）
  * - [sr2-lg-08] 时序竞态修复：挂载效应内监听器注册必须先于闩锁消费——消费链 openFromBus→locateAnchor→waitOpen（tab 缺席）会同步重发 OPEN_PAPER_EVENT（事件②），旧序自丢失→waitOpen 8s 超时停旧 tab=「脉络双击笔记总跳最后打开的文章」根因；先注册则事件②被自身 handler 接住→无锚分支 store.openPaper 正常打开（链声明独立于 F-07；全链取证见 scripts/audits/sr2-lg-08-brief.md）
  * - F-01 连续滚动改造：页列几何/懒渲染回收归 PageColumn；页面缓存注册表
@@ -11,8 +14,10 @@
  *   本组件只装配——声明与实现对齐）
  * - F-03 滚动进度装配：scroll-progress 状态机接线（onScroll/wheel/pointerdown
  *   三口+keydown；页列就绪→恢复链滚回记忆页盒顶）；快捷键=容器滚动步（四键
- *   一屏−一行重叠+空格满屏，SCROLL_STEP_RATIO 单源）；SelectionLayer 挂内容级
- *   稳定包装盒（N4：滚动中锚定页切换不重挂组件→工具条不闪收）
+ *   一屏−一行重叠+空格满屏，SCROLL_STEP_RATIO 单源——装配块归
+ *   reader-shortcut-handlers.ts，[F-SPLIT-01] 自本件拆出 2026-09-05，deps []
+ *   零变）；SelectionLayer 挂内容级稳定包装盒（N4：滚动中锚定页切换不重挂
+ *   组件→工具条不闪收）
  * - F-04 缩放收官：fit-width 分母=列宽基准（onReady 上报）；缩放锚经 scrollContainerRef 交段⑥
  * - F-05（缺陷 A）根两分支 overflow-hidden 防外层滚动泄漏（INV-34）
  * - F-A3 选择模式装配：selectionMode 取 active tab（?? false）；toggle 语义在
@@ -42,21 +47,15 @@
 import { useEffect, useMemo, useRef, useState } from 'react'
 import { OPEN_PAPER_EVENT, takePendingOpenPaper, type OpenPaperRequest } from '../../shared/open-paper-bus'
 import { openFromBus } from './open-paper-anchor'
-import { OutlineAside } from './OutlineAside'
-import { SplitPane } from '../../shared/ui/SplitPane'
-import { TabBar } from './TabBar'
-import { PdfDocProvider } from './PdfDocProvider'
-import { PagesOverlay } from './PagesOverlay'
 import type { PageScrollRequest } from './PageColumn'
-import { useReaderShortcuts, SCROLL_STEP_RATIO } from './ReaderShortcuts'
-import { ReaderToolbar, ZOOM_STEP, round2 } from './ReaderToolbar'
-import { SelectionLayer } from './SelectionLayer'
 import { useReaderSearch } from './useReaderSearch'
 import { useReaderStore } from './reader.store'
 import { readActiveTab, useActiveTab } from './useActiveTab'
 import { createReaderScrollProgress, useScrollProgressWiring } from './scroll-progress'
 import { useReaderReadingTime } from './reading-time-setup'
 import { useReadingTimeWiring } from './reading-time'
+import { useReaderShortcutHandlers } from './reader-shortcut-handlers'
+import { ReaderPageView } from './ReaderPageView'
 import { showToast } from '../../shared/ui/Toast'
 
 export function ReaderPage(): JSX.Element {
@@ -98,25 +97,8 @@ export function ReaderPage(): JSX.Element {
   // N4：SelectionLayer 挂载盒=内容级稳定包装盒（滚动不重挂→工具条不闪收）
   const [selectionMount, setSelectionMount] = useState<HTMLDivElement | null>(null)
 
-  // 快捷键装配（F-03 迁移：翻页键=容器滚动步；经 ref/getState 取最新——恒定身份）
-  useReaderShortcuts(
-    useMemo(() => {
-      const scrollByRatio = (ratio: number): void => {
-        const el = scrollAreaRef.current
-        if (el !== null) el.scrollBy({ top: Math.round(el.clientHeight * ratio) })
-      }
-      return {
-        prevPage: () => scrollByRatio(-SCROLL_STEP_RATIO),
-        nextPage: () => scrollByRatio(SCROLL_STEP_RATIO),
-        spaceScroll: () => scrollByRatio(1),
-        zoomStep: (dir: 1 | -1) => {
-          const t = readActiveTab()
-          if (t !== undefined) useReaderStore.getState().setZoom(round2(t.zoom + dir * ZOOM_STEP))
-        },
-        undo: () => void useReaderStore.getState().undo()
-      }
-    }, [])
-  )
+  // 快捷键装配（F-03 迁移：翻页键=容器滚动步——reader-shortcut-handlers）
+  useReaderShortcutHandlers(scrollAreaRef)
 
   // P7E-03 页内搜索装配：fileUrl 键效应清面板+ctrl+f keymap+翻页联动注入+
   // 受控面板节点（ReaderToolbar slot 消费；空态视图不渲染 toolbar=面板随
@@ -169,80 +151,13 @@ export function ReaderPage(): JSX.Element {
     setZoom((uiScale * (el.clientWidth - 24)) / columnBasis.current)
   }
 
-  if (paperId === null || fileUrl === null) {
-    // 空态三形合一（无 tab/loading/error）；TabBar 保留——error tab 必须可见可关可切
-    return (
-      <div className="flex h-full flex-col overflow-hidden">
-        <TabBar />
-        <div
-          className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-sm"
-          style={{ color: tab?.status === 'error' ? 'var(--danger)' : 'var(--text-dim)' }}
-        >
-          <p>{paperId === null ? '阅读器' : tab?.status === 'error' ? '打开文献失败' : '正在打开文献…'}</p>
-          {paperId === null && <p className="text-xs">从文献库打开一篇文献（双击文献行）</p>}
-        </div>
-      </div>
-    )
-  }
-  // 主区（开/收两分支共用）：滚动容器内 PdfDocProvider（doc 生命周期）+PagesOverlay
-  // （页面缓存注册表+覆盖层装配——F-ARCH3 拆分件）；SelectionLayer 挂稳定盒（N4）
-  const mainContent = (
-    <div
-      ref={scrollAreaRef}
-      className="min-w-0 flex-1 overflow-auto p-3"
-      onScroll={() => spProg.onScrollEvent()}
-      // 用户接管三类信号之二（keydown 见 wiring hook 的 document 监听；W-B）
-      onWheel={() => spProg.onUserTakeover()}
-      onPointerDown={() => spProg.onUserTakeover()}
-    >
-      <div ref={setSelectionMount} className="relative">
-        <PdfDocProvider fileUrl={fileUrl} onDocInfo={(info) => setTotalPages(info.numPages)} onDocReady={setPdfDoc} onError={handlePdfError}>
-          {(doc) => (
-            <PagesOverlay doc={doc} fileUrl={fileUrl} totalPages={totalPages} zoom={zoom} annotations={annotations}
-              scrollContainerRef={scrollAreaRef} scrollRequest={columnScroll} layout={pageLayout}
-              onReady={handleColumnReady} onError={handlePdfError} />
-          )}
-        </PdfDocProvider>
-        {/* page=弃用位（F-02 动态锚定）；挂载盒=稳定包装盒（N4）；F-SL：onSaved
-            闭包捕获渲染帧 paperId（与 SelectionLayer props.paperId 同源同帧），
-            store 按其寻址——保存 await 窗内切 tab 不生幽灵标注 */}
-        <SelectionLayer pageRoot={selectionMount} paperId={paperId} page={0} onSaved={(a) => addAnnotation(paperId, a)} />
-      </div>
-      <p className="sr-only">{`共 ${totalPages} 页，当前第 ${page + 1} 页，标注 ${annotations.length} 条`}</p>
-    </div>
-  )
-
+  // 装配渲染（空态引导/主区/工具栏+目录——ReaderPageView，[F-SPLIT-01] 拆件）
   return (
-    <div className="flex h-full flex-col overflow-hidden">
-      <TabBar />
-      <ReaderToolbar page={page} totalPages={totalPages} zoom={zoom} color={color}
-        onNavigate={setPage} onZoom={setZoom} onColor={setColor} onFitWidth={fitWidth}
-        selectionMode={selectionMode}
-        onToggleSelectionMode={() => {
-          useReaderStore.getState().setSelectionMode(!selectionMode)
-        }}
-        pageLayout={pageLayout}
-        pageStep={pageLayout === 'double' ? 2 : 1}
-        onTogglePageLayout={() => {
-          useReaderStore.getState().setPageLayout(pageLayout === 'double' ? 'single' : 'double')
-        }}
-        searchBox={searchBox} />
-      <div className="flex min-h-0 flex-1">
-        {outlineOpen ? (
-          // 可拖拽侧栏（SplitPane，宽度持久化）：main 槽传 null——主内容外置为稳定子节点
-          <SplitPane paneId="reader-outline" side="left" defaultWidth={224} min={160} max={480}
-            children={{
-              pane: <OutlineAside pdfDoc={pdfDoc} onCollapse={() => setOutlineOpen(false)} />,
-              main: null
-            }} />
-        ) : (
-          <button type="button" className="shrink-0 self-start border-b border-r px-1 py-2 text-xs"
-            style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }} onClick={() => setOutlineOpen(true)}>
-            目录
-          </button>
-        )}
-        {mainContent}
-      </div>
-    </div>
+    <ReaderPageView paperId={paperId} tabStatus={tab?.status} page={page} totalPages={totalPages} zoom={zoom} color={color}
+      selectionMode={selectionMode} pageLayout={pageLayout} annotations={annotations} columnScroll={columnScroll} searchBox={searchBox}
+      pdfDoc={pdfDoc} outlineOpen={outlineOpen} setOutlineOpen={setOutlineOpen} scrollAreaRef={scrollAreaRef} spProg={spProg}
+      selectionMount={selectionMount} setSelectionMount={setSelectionMount} fileUrl={fileUrl} setTotalPages={setTotalPages}
+      setPdfDoc={setPdfDoc} handleColumnReady={handleColumnReady} handlePdfError={handlePdfError} fitWidth={fitWidth}
+      setPage={setPage} setZoom={setZoom} setColor={setColor} addAnnotation={addAnnotation} />
   )
 }
diff --git a/src/renderer/features/reader/ReaderPageView.tsx b/src/renderer/features/reader/ReaderPageView.tsx
new file mode 100644
index 0000000000..1398c19b13
--- /dev/null
+++ b/src/renderer/features/reader/ReaderPageView.tsx
@@ -0,0 +1,157 @@
+/**
+ * [F-SPLIT-01] ReaderPageView —— 阅读器页面装配渲染件（自 ReaderPage 拆出
+ * 2026-09-05；迁移 ReaderPage 装配 JSX 分组——空态引导/主区滚动容器/工具栏+
+ * 目录布局，JSX 语句零改纯搬运）。
+ *
+ * ── 行为层（原 ReaderPage JSX 面）──
+ * - 无打开文档：空态引导（空态三形合一：无 tab/loading/error——TabBar 保留，
+ *   error tab 必须可见可关可切）；打开：PdfDocProvider+PagesOverlay 页列+
+ *   SelectionLayer+ReaderToolbar+OutlinePanel 布局（侧栏可折叠）
+ * - F-03 三口接线（onScroll/wheel/pointerdown——用户接管两类信号）零改：
+ *   onScroll=spProg.onScrollEvent、onWheel/onPointerDown=spProg.onUserTakeover
+ * - F-05（缺陷 A）根两分支 overflow-hidden 防外层滚动泄漏（INV-34）
+ * - N4：SelectionLayer 挂内容级稳定包装盒（滚动中锚定页切换不重挂组件→
+ *   工具条不闪收）；F-SL：onSaved 闭包捕获渲染帧 paperId（与 props.paperId
+ *   同源同帧），store 按其寻址——保存 await 窗内切 tab 不生幽灵标注
+ * - 可拖拽侧栏（SplitPane，宽度持久化）：main 槽传 null——主内容外置为
+ *   稳定子节点；收起态=目录按钮
+ * - 状态归属不变：各 state/handler 由宿主 ReaderPage 持有（sr2-lg-08 挂载
+ *   效应/F-03 滚动进度 wiring 均留宿主），本件经 props 收值+set 函数回写
+ *
+ * ── 接口层 ──
+ * - export function ReaderPageView(props: { paperId: string | null;
+ *   tabStatus: string | undefined; page; totalPages; zoom; color;
+ *   selectionMode; pageLayout; annotations; columnScroll; searchBox; pdfDoc;
+ *   outlineOpen; setOutlineOpen; scrollAreaRef; spProg; selectionMount;
+ *   setSelectionMount; fileUrl: string | null; setTotalPages; setPdfDoc;
+ *   handleColumnReady; handlePdfError; fitWidth; setPage; setZoom; setColor;
+ *   addAnnotation }): JSX.Element
+ */
+import type { MutableRefObject, ReactNode } from 'react'
+import type { Annotation } from '@shared/models/annotation'
+import type { PageScrollRequest } from './PageColumn'
+import type { PageLayout } from './page-column-geometry'
+import type { createReaderScrollProgress } from './scroll-progress'
+import { OutlineAside } from './OutlineAside'
+import { SplitPane } from '../../shared/ui/SplitPane'
+import { TabBar } from './TabBar'
+import { PdfDocProvider } from './PdfDocProvider'
+import { PagesOverlay } from './PagesOverlay'
+import { ReaderToolbar } from './ReaderToolbar'
+import { SelectionLayer } from './SelectionLayer'
+import { useReaderStore } from './reader.store'
+
+/** store 动作精确类型（setPage/setZoom/setColor/addAnnotation——单源 typeof 派生） */
+type ReaderStore = ReturnType<typeof useReaderStore.getState>
+
+export function ReaderPageView(props: {
+  paperId: string | null
+  /** active tab status 原料（tab 缺席=undefined——空态分支条件同源消费） */
+  tabStatus: string | undefined
+  page: number
+  totalPages: number
+  zoom: number
+  color: Parameters<ReaderStore['setColor']>[0]
+  selectionMode: boolean
+  pageLayout: PageLayout
+  annotations: Annotation[]
+  columnScroll: PageScrollRequest | null
+  searchBox: ReactNode
+  /** pdfjs 文档句柄（OutlinePanel 数据源） */
+  pdfDoc: unknown
+  outlineOpen: boolean
+  setOutlineOpen: (v: boolean) => void
+  scrollAreaRef: MutableRefObject<HTMLDivElement | null>
+  spProg: ReturnType<typeof createReaderScrollProgress>
+  selectionMount: HTMLDivElement | null
+  setSelectionMount: (v: HTMLDivElement | null) => void
+  fileUrl: string | null
+  setTotalPages: ReaderStore['setTotalPages']
+  setPdfDoc: (v: unknown) => void
+  handleColumnReady: (basisWidth: number) => void
+  handlePdfError: (msg: string) => void
+  fitWidth: () => void
+  setPage: ReaderStore['setPage']
+  setZoom: ReaderStore['setZoom']
+  setColor: ReaderStore['setColor']
+  addAnnotation: ReaderStore['addAnnotation']
+}): JSX.Element {
+  const { paperId, tabStatus, page, totalPages, zoom, color, selectionMode, pageLayout, annotations, columnScroll, searchBox, pdfDoc, outlineOpen, setOutlineOpen, scrollAreaRef, spProg, selectionMount, setSelectionMount, fileUrl, setTotalPages, setPdfDoc, handleColumnReady, handlePdfError, fitWidth, setPage, setZoom, setColor, addAnnotation } = props
+
+  if (paperId === null || fileUrl === null) {
+    // 空态三形合一（无 tab/loading/error）；TabBar 保留——error tab 必须可见可关可切
+    return (
+      <div className="flex h-full flex-col overflow-hidden">
+        <TabBar />
+        <div
+          className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-sm"
+          style={{ color: tabStatus === 'error' ? 'var(--danger)' : 'var(--text-dim)' }}
+        >
+          <p>{paperId === null ? '阅读器' : tabStatus === 'error' ? '打开文献失败' : '正在打开文献…'}</p>
+          {paperId === null && <p className="text-xs">从文献库打开一篇文献（双击文献行）</p>}
+        </div>
+      </div>
+    )
+  }
+  // 主区（开/收两分支共用）：滚动容器内 PdfDocProvider（doc 生命周期）+PagesOverlay
+  // （页面缓存注册表+覆盖层装配——F-ARCH3 拆分件）；SelectionLayer 挂稳定盒（N4）
+  const mainContent = (
+    <div
+      ref={scrollAreaRef}
+      className="min-w-0 flex-1 overflow-auto p-3"
+      onScroll={() => spProg.onScrollEvent()}
+      // 用户接管三类信号之二（keydown 见 wiring hook 的 document 监听；W-B）
+      onWheel={() => spProg.onUserTakeover()}
+      onPointerDown={() => spProg.onUserTakeover()}
+    >
+      <div ref={setSelectionMount} className="relative">
+        <PdfDocProvider fileUrl={fileUrl} onDocInfo={(info) => setTotalPages(info.numPages)} onDocReady={setPdfDoc} onError={handlePdfError}>
+          {(doc) => (
+            <PagesOverlay doc={doc} fileUrl={fileUrl} totalPages={totalPages} zoom={zoom} annotations={annotations}
+              scrollContainerRef={scrollAreaRef} scrollRequest={columnScroll} layout={pageLayout}
+              onReady={handleColumnReady} onError={handlePdfError} />
+          )}
+        </PdfDocProvider>
+        {/* page=弃用位（F-02 动态锚定）；挂载盒=稳定包装盒（N4）；F-SL：onSaved
+            闭包捕获渲染帧 paperId（与 SelectionLayer props.paperId 同源同帧），
+            store 按其寻址——保存 await 窗内切 tab 不生幽灵标注 */}
+        <SelectionLayer pageRoot={selectionMount} paperId={paperId} page={0} onSaved={(a) => addAnnotation(paperId, a)} />
+      </div>
+      <p className="sr-only">{`共 ${totalPages} 页，当前第 ${page + 1} 页，标注 ${annotations.length} 条`}</p>
+    </div>
+  )
+
+  return (
+    <div className="flex h-full flex-col overflow-hidden">
+      <TabBar />
+      <ReaderToolbar page={page} totalPages={totalPages} zoom={zoom} color={color}
+        onNavigate={setPage} onZoom={setZoom} onColor={setColor} onFitWidth={fitWidth}
+        selectionMode={selectionMode}
+        onToggleSelectionMode={() => {
+          useReaderStore.getState().setSelectionMode(!selectionMode)
+        }}
+        pageLayout={pageLayout}
+        pageStep={pageLayout === 'double' ? 2 : 1}
+        onTogglePageLayout={() => {
+          useReaderStore.getState().setPageLayout(pageLayout === 'double' ? 'single' : 'double')
+        }}
+        searchBox={searchBox} />
+      <div className="flex min-h-0 flex-1">
+        {outlineOpen ? (
+          // 可拖拽侧栏（SplitPane，宽度持久化）：main 槽传 null——主内容外置为稳定子节点
+          <SplitPane paneId="reader-outline" side="left" defaultWidth={224} min={160} max={480}
+            children={{
+              pane: <OutlineAside pdfDoc={pdfDoc} onCollapse={() => setOutlineOpen(false)} />,
+              main: null
+            }} />
+        ) : (
+          <button type="button" className="shrink-0 self-start border-b border-r px-1 py-2 text-xs"
+            style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }} onClick={() => setOutlineOpen(true)}>
+            目录
+          </button>
+        )}
+        {mainContent}
+      </div>
+    </div>
+  )
+}
diff --git a/src/renderer/features/reader/ai-notes-phase.ts b/src/renderer/features/reader/ai-notes-phase.ts
new file mode 100644
index 0000000000..5a5c01870b
--- /dev/null
+++ b/src/renderer/features/reader/ai-notes-phase.ts
@@ -0,0 +1,37 @@
+// b3: P7-G
+/**
+ * [F-SPLIT-01] ai-notes-phase —— AI 笔记六态判定纯函数件（自 AiNotesSection
+ * 拆出 2026-09-05，经 AiNotesStatus 中转沉淀为纯域件——derivePhase 与六态表
+ * 单源驻此，AiNotesStatus（呈现）/AiNotesSection（分节可见性）双消费）。
+ *
+ * ── 行为层（状态机表——观测=observe 四事实 per 当前篇 P；「AI 读文献」按钮行
+ *   常驻头部（首次使用入口不悬空）；imported 非稳态移出（瞬时事件：导入完成
+ *   →toast+list 刷新→稳态回 idle）──
+ *
+ *   | 态 | 触发事实（observe 输出） | 呈现 |
+ *   | --- | --- | --- |
+ *   | hidden | 无 job(P)+无未导入产物+无 DB 数据 | 仅按钮行（无状态行无分节） |
+ *   | idle | 同 hidden 触发面但有 DB 数据（含已导入稳态） | 按钮行+分节（无状态行） |
+ *   | pending | hasPendingJob(P) 且心跳不新鲜 | 「已请求 AI 阅读，等待 zcode 拾取…（上次状态：<state 自述>，可缺省）」 |
+ *   | queued | hasPendingJob(P) 且心跳新鲜且 currentPaper≠P 或 =null | 「AI 正在处理队列（当前：他篇）…」；currentPaper=null 时无他篇名 |
+ *   | reading | 心跳新鲜且 currentPaper=P | 「AI 正在读本文（state 自述文本）」 |
+ *   | done-unimported | productExists(P) 且 !archivedExists(P) 且 job(P) 无 | 「AI 已读完，待导入」+「导入 AI 笔记」按钮 |
+ *
+ *   按钮禁用枚举：disabled=pending/queued/reading 三态（06 服务幂等为兜底，
+ *   UI 禁用防误解双保险）；enabled=hidden/idle/done-unimported。
+ *   跨格序列①~⑤见头注工单面（单测①③⑤已用例化；queued 经①的他篇路径）。
+ */
+import type { ObserveRes } from '@shared/ipc/schemas'
+
+/** 六态（原 AiNotesSection Phase——判定域单源） */
+export type Phase = 'hidden' | 'idle' | 'pending' | 'queued' | 'reading' | 'done-unimported'
+
+/** 六态推导（判定事实=observe 四事实单源；跨格序列①~⑤由轮询/动作驱动态迁移） */
+export function derivePhase(facts: ObserveRes | null | undefined, hasNotes: boolean, paperId: string): Phase {
+  if (facts === null || facts === undefined) return hasNotes ? 'idle' : 'hidden'
+  const st = facts.status
+  if (st !== null && st.running && st.currentPaper === paperId) return 'reading'
+  if (facts.hasPendingJob) return st !== null && st.running ? 'queued' : 'pending'
+  if (facts.productExists && !facts.archivedExists) return 'done-unimported'
+  return hasNotes ? 'idle' : 'hidden'
+}
diff --git a/src/renderer/features/reader/reader-shortcut-handlers.ts b/src/renderer/features/reader/reader-shortcut-handlers.ts
new file mode 100644
index 0000000000..0a2e466a56
--- /dev/null
+++ b/src/renderer/features/reader/reader-shortcut-handlers.ts
@@ -0,0 +1,42 @@
+/**
+ * [F-SPLIT-01] reader-shortcut-handlers —— 阅读器快捷键装配 hook（自
+ * ReaderPage 拆出 2026-09-05；F-03 迁移块——useMemo 工厂与 useReaderShortcuts
+ * 接线语句零改纯搬运，deps [] 零变；useMemo 系原件随迁非新增——F-ARCH3
+ * 「不加 useCallback/useMemo」纪律口径一致）。
+ *
+ * ── 行为层 ──
+ * - 快捷键装配（F-03 迁移：翻页键=容器滚动步（四键一屏−一行重叠+空格满屏，
+ *   SCROLL_STEP_RATIO 单源）；zoomStep/undo 经 ref/getState 取最新——
+ *   恒定身份；keydown 接线零改）
+ *
+ * ── 接口层 ──
+ * - export function useReaderShortcutHandlers(scrollAreaRef): void
+ *   （scrollAreaRef=滚动容器 ref——宿主 spProg 同一 ref）
+ */
+import { useMemo } from 'react'
+import type { RefObject } from 'react'
+import { useReaderStore } from './reader.store'
+import { readActiveTab } from './useActiveTab'
+import { useReaderShortcuts, SCROLL_STEP_RATIO } from './ReaderShortcuts'
+import { ZOOM_STEP, round2 } from './ReaderToolbar'
+
+export function useReaderShortcutHandlers(scrollAreaRef: RefObject<HTMLDivElement | null>): void {
+  useReaderShortcuts(
+    useMemo(() => {
+      const scrollByRatio = (ratio: number): void => {
+        const el = scrollAreaRef.current
+        if (el !== null) el.scrollBy({ top: Math.round(el.clientHeight * ratio) })
+      }
+      return {
+        prevPage: () => scrollByRatio(-SCROLL_STEP_RATIO),
+        nextPage: () => scrollByRatio(SCROLL_STEP_RATIO),
+        spaceScroll: () => scrollByRatio(1),
+        zoomStep: (dir: 1 | -1) => {
+          const t = readActiveTab()
+          if (t !== undefined) useReaderStore.getState().setZoom(round2(t.zoom + dir * ZOOM_STEP))
+        },
+        undo: () => void useReaderStore.getState().undo()
+      }
+    }, [])
+  )
+}
diff --git a/src/renderer/features/reader/usePageColumnScroll.ts b/src/renderer/features/reader/usePageColumnScroll.ts
new file mode 100644
index 0000000000..5b550b19c1
--- /dev/null
+++ b/src/renderer/features/reader/usePageColumnScroll.ts
@@ -0,0 +1,65 @@
+/**
+ * [F-SPLIT-01] usePageColumnScroll —— 页列滚动接线 hook 件（自 PageColumn
+ * 拆出 2026-09-05；迁移 PageColumn 头注段⑤程序滚动+段⑥滚动镜像职责段——
+ * 段⑥缩放锚本体（anchoredScrollTop 程序修正 useLayoutEffect）禁动留守
+ * PageColumn，本件只搬其滚动位置镜像数据源与段⑤程序滚动，语句零改纯搬运）。
+ *
+ * ── 行为层 ──
+ * - 段⑤程序滚动（INV-29 单口）：夹取→页盒顶对齐视口顶（F-05 单容器收敛
+ *   INV-34）；未就绪挂起、就绪补滚（双页左右页盒顶同行——滚行顶零特判）。
+ *   deps [scrollRequest, pageSizes, totalPages] 零变。
+ * - 段⑥滚动位置镜像：容器 scroll 事件被动监听（挂载即读初值——恢复链程序
+ *   滚动亦派发事件）；镜像值写入宿主 liveScrollTop ref（缩放锚消费——语义
+ *   同拆前，程序/用户滚动皆覆盖）。deps [scrollContainerRef] 零变。
+ *
+ * ── 接口层 ──
+ * - export function usePageScrollRequest(scrollRequest, pageSizes, totalPages,
+ *   rootRef): void / useScrollTopMirror(scrollContainerRef, liveScrollTop): void
+ * - PageScrollRequest 接口（原驻 PageColumn）随段⑤迁入本件；PageColumn 再
+ *   导出维持 PagesOverlay/ReaderPage 既有 import 路径（单实现双出口——
+ *   nearestPage 再导出先例）。
+ */
+import { useEffect } from 'react'
+import type { MutableRefObject, RefObject } from 'react'
+import { clampPageToColumn, type PageBoxSize } from './page-column-geometry'
+import { scrollIntoNearestScroller } from './scroll-converge'
+
+/** 程序滚动请求（reader.store scrollRequest 的形状——INV-29 单口消费面） */
+export interface PageScrollRequest {
+  paperId: string
+  page: number
+  seq: number
+}
+
+/** 段⑤程序滚动（INV-29 单口）：夹取→页盒顶对齐视口顶；未就绪挂起、就绪补滚 */
+export function usePageScrollRequest(
+  scrollRequest: PageScrollRequest | null | undefined,
+  pageSizes: PageBoxSize[] | null,
+  totalPages: number,
+  rootRef: RefObject<HTMLDivElement | null>
+): void {
+  useEffect(() => {
+    if (pageSizes === null || scrollRequest === null || scrollRequest === undefined) return
+    const no = clampPageToColumn(scrollRequest.page + 1, totalPages)
+    const box = rootRef.current?.querySelector<HTMLElement>(`[data-page-box="${no}"]`) ?? null
+    if (box !== null) scrollIntoNearestScroller(box, 'start')
+  }, [scrollRequest, pageSizes, totalPages])
+}
+
+/** 段⑥滚动位置镜像：容器 scroll 事件被动监听（挂载即读初值——恢复链程序
+ *  滚动亦派发事件）；写入宿主 liveScrollTop ref 供缩放锚消费 */
+export function useScrollTopMirror(
+  scrollContainerRef: RefObject<HTMLDivElement | null> | undefined,
+  liveScrollTop: MutableRefObject<number>
+): void {
+  useEffect(() => {
+    const el = scrollContainerRef?.current ?? null
+    if (el === null) return
+    const mirror = (): void => {
+      liveScrollTop.current = el.scrollTop
+    }
+    mirror()
+    el.addEventListener('scroll', mirror, { passive: true })
+    return () => el.removeEventListener('scroll', mirror)
+  }, [scrollContainerRef])
+}
diff --git a/src/renderer/features/reader/usePageLazyWindow.ts b/src/renderer/features/reader/usePageLazyWindow.ts
new file mode 100644
index 0000000000..7fad2a4a0e
--- /dev/null
+++ b/src/renderer/features/reader/usePageLazyWindow.ts
@@ -0,0 +1,82 @@
+/**
+ * [F-SPLIT-01] usePageLazyWindow —— 懒渲染窗口 hook（自 PageColumn 拆出
+ * 2026-09-05；迁移 PageColumn 头注段③职责段，语句零改纯搬运）。
+ *
+ * ── 行为层（原 PageColumn 段③）──
+ * - 段③懒渲染窗口：视口±1 页真渲染（canvas+覆盖层经 renderPage）；离屏>2 页
+ *   销毁；IntersectionObserver 占位盒驱动（INV-30：canvas 生命周期=渲染窗口
+ *   绑定）。IO deps [pageSizes, layout]（F-R1 增 layout——列↔行 DOM 重排后
+ *   重挂）零变。
+ * - 可见集上抛（升序；SelectionLayer 锚定页挂载位等消费）——onVisibleChange
+ *   latest-ref（父层内联函数不触发 effect 重跑）随迁本件。
+ * - 段③调度：渲染窗口并入+离屏回收（空可见=顶部引导窗口，不跑回收）。
+ * - 布局态（原 PageColumn 状态机行的每页子机）：每页 empty→rendering→
+ *   rendered→recycling→empty；跨格：快速滚动（rendering 中滚出窗口→cancel→
+ *   recycling）；zoom 变化（缓存×新 zoom 重算→窗口重评估）。
+ * - F-ARCH3 零变纪律保持：不加 useCallback/useMemo。
+ *
+ * ── 接口层 ──
+ * - export function usePageLazyWindow(rootRef, pageSizes, layout, totalPages,
+ *   renderWindow, recycleWindow, onVisibleChange): { visible, rendered }
+ *   （rootRef=宿主列根——段⑤程序滚动同用同一 ref；宿主 JSX 行渲染消费
+ *   rendered；visible 为窗口调度内部态随值返回）
+ */
+import { useEffect, useRef, useState } from 'react'
+import type { RefObject } from 'react'
+import { recycledPages, windowPages, type PageBoxSize, type PageLayout } from './page-column-geometry'
+
+/** 段③懒渲染窗口：visible/rendered 状态对+IO 占位盒驱动+回收调度（自
+ *  PageColumn 拆出——onVisibleChange latest-ref 随迁，语句零改） */
+export function usePageLazyWindow(
+  rootRef: RefObject<HTMLDivElement | null>,
+  pageSizes: PageBoxSize[] | null,
+  layout: PageLayout,
+  totalPages: number,
+  renderWindow: number,
+  recycleWindow: number,
+  onVisibleChange: ((visiblePages: number[]) => void) | undefined
+): { visible: Set<number>; rendered: Set<number> } {
+  // 回调 latest-ref：父层内联函数不触发 effect 重跑（onVisibleChange 面）
+  const onVisibleRef = useRef(onVisibleChange)
+  onVisibleRef.current = onVisibleChange
+  const [visible, setVisible] = useState<Set<number>>(() => new Set())
+  const [rendered, setRendered] = useState<Set<number>>(() => new Set())
+
+  // 段③IO：占位盒驱动可见集（就绪后挂载；F-R1 deps 增 layout——列↔行 DOM 重排后重挂）
+  useEffect(() => {
+    if (pageSizes === null) return
+    const io = new IntersectionObserver((entries) => {
+      setVisible((prev) => {
+        const next = new Set(prev)
+        for (const e of entries) {
+          const no = Number((e.target as HTMLElement).dataset.pageBox)
+          if (Number.isNaN(no)) continue
+          if (e.isIntersecting) next.add(no)
+          else next.delete(no)
+        }
+        const same = next.size === prev.size && [...next].every((n) => prev.has(n))
+        return same ? prev : next
+      })
+    })
+    for (const el of rootRef.current?.querySelectorAll<HTMLElement>('[data-page-box]') ?? []) {
+      io.observe(el)
+    }
+    return () => io.disconnect()
+  }, [pageSizes, layout])
+
+  // 可见集上抛（升序；SelectionLayer 锚定页挂载位等消费）
+  useEffect(() => {
+    onVisibleRef.current?.([...visible].sort((a, b) => a - b))
+  }, [visible])
+
+  // 段③调度：渲染窗口并入+离屏回收（空可见=顶部引导窗口，不跑回收）
+  useEffect(() => {
+    setRendered((prev) => {
+      const want = windowPages(visible, totalPages, renderWindow)
+      if (visible.size === 0) return new Set(want)
+      return recycledPages(new Set([...prev, ...want]), visible, recycleWindow)
+    })
+  }, [visible, totalPages, renderWindow, recycleWindow])
+
+  return { visible, rendered }
+}
