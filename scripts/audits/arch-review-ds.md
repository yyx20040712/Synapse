# 架构审查报告（异基座轮）

> 诚实标注：本次拿到全文的只有 `ReaderPage.tsx` 与 `reader.store.ts`。其余文件（PageColumn / SelectionLayer / scroll-progress / annotation-undo / AnnotationLayer）的结论基于机器扫描信号 + 不变量册 + 架构文档交叉推断，关键处注明「需读全文确认」。

## 总评

治理框架异常完备（46 INV + 72 工单 + 3 道 CI + 锁），但框架正在制造一种**新型屎山**：行为登记高度依赖人写注释/不变量册，机器强制面全部集中在静态结构（分层 / 行数 / 契约），**动态时序接缝的登记滞后于代码演化**。本次审查的 3 个实锤全部落在「文档/不变量与代码行为漂移」的接缝上——INV-29 过滤面缺 tab 生命周期维度、INV-23 未登记 undo 与编辑并发序列、F-01 声称拆分但缓存编排实际仍在 ReaderPage。

---

## B1 【实锤】reader.store `closeOne` 残留 `scrollRequest` → 陈旧程序滚动信号被新 tab 生命周期消费

**位置**：`src/renderer/features/reader/reader.store.ts` `closeOne` 函数体；消费方 `ReaderPage.tsx` 的 `columnScroll` 过滤：

```ts
// ReaderPage.tsx
const columnScroll: PageScrollRequest | null =
  scrollRequest !== null && scrollRequest.paperId === paperId ? scrollRequest : null
```

**屎山形成机制**：`closeOne` 清理了 `tabLoadSeq` / `inflightOpen` / 撤销栈 / `tabs` / `order` / `activeId`，但**没有清 `scrollRequest`**。而消费方过滤条件只有 `scrollRequest.paperId === paperId`，没有 tab 生命周期维度。于是「关闭 tab → 重开同一 paperId」时，旧的 `scrollRequest`（可能指向页 3）会被新 tab 生命周期当作有效信号消费，PageColumn 执行 `scrollToPage` 把用户拉回旧页。

**为什么不烂**：造成可见错误需要 `scrollRequest.page ≠ flush 落账的 lastReadPage`，且窗口在防抖期限内。构造序列：

1. 目录跳页/翻页按钮（`setPage` 默认 `scroll:'to'`）→ `scrollRequest={page:3, seq:N}`
2. 用户立即手动滚到页 8（scroll-progress 防抖窗口未到期，只记账未 flush）
3. `closeTab` → `progressFlusher.flush(paperId)` 立即落账 `lastReadPage=8`
4. 重开同 id → 新建 tab `page=8`，但 `columnScroll` 命中旧 `scrollRequest.page=3` → 回跳页 3

四步序列 + 防抖窗口内完成，概率中等，但用户感知强烈（打开文献被拉回旧页）。

**触发条件**：程序跳页后立即滚动，随后关闭 tab 并重新打开同一篇文献。这是完全自然的用户操作。

**建议动作**：
1. `closeOne`/`closeAll` 清 `scrollRequest`/`noteHighlight`/`aiNoteHighlight`（信号随 tab 生命周期失效——补登 INV-29 或 INV-03 扩展）；
2. 更稳健：`scrollRequest` 增加 tab 版本维度，消费方要求 `seq ≥ tab 创建序号`；
3. 补单测：`closeTab → 重开同 id → 断言不触发 scrollToPage`。

---

## B2 【实锤】reader.store `undo` apply 覆盖 undo 期间的并发编辑

**位置**：`src/renderer/features/reader/reader.store.ts` `undo()` 尾部：

```ts
const next =
  act.type === 'remove'
    ? tab.annotations.filter((x) => x.id !== act.id)
    : tab.annotations.some((x) => x.id === act.annotation.id)
      ? tab.annotations.map((x) => (x.id === act.annotation.id ? act.annotation : x))
      : [...tab.annotations, act.annotation]
set({ tabs: { ...tabs, [paperId]: { ...tab, annotations: next } } })
```

**屎山形成机制**：`undo()` `await runUndo(paperId)` 挂起期间，用户手动保存的新标注（SelectionLayer 已写 DB 成功 → `addAnnotation` 已更新 store）会被 `outcome.apply` **整体列表替换**覆盖——apply 基于 undo 发起时的快照，不含并发新标注。结果：store 视图丢失新标注（用户眼前消失），DB 保留（下次重开回来）。INV-23 只登记了「api 失败不弹栈可重试」「同篇 in-flight 互斥（busy）」——busy 互斥是 **undo 自己 vs undo**，**没有登记 undo vs 普通编辑并发**。

**为什么不烂**：窗口需要 undo 的 api 调用（通常 <100ms）内恰好完成「划选 → 保存 → onSaved → addAnnotation」全链，概率低。

**触发条件**：快速操作场景（撤销后立即划选保存）。窗口短但后果可感知。

**建议动作**：
1. INV-23 增补「undo vs 普通编辑并发」序列：apply 前对比 `store.annotations` 的 id 集合基线，不一致则放弃 apply + 从 `api.reader.listAnnotations` 重拉；
2. 或最小改动：apply 改 merge 语义——只增删改 `outcome.apply` 涉及的标注，其余保持 store 现态；
3. 补单测锁定该跨格序列。

---

## B3 【实锤】ReaderPage 职责膨胀：头注声称「只装配」，实际承载页面缓存编排

**位置**：`src/renderer/features/reader/ReaderPage.tsx`（45 天 20 次 churn，全项目第一）

**屎山形成机制**：F-01 改造头注声明「页列几何/懒渲染回收归 PageColumn（**本组件只装配**）」，但本组件仍持有：

- `pageTexts`/`pageRoots` 两个 useState（页面文本与几何缓存注册表）
- `handlePageRender`（PdfPageCanvas 渲染回报 → 量测 canvas CSS 盒）
- `dropPageState`（PageFrame 卸载哨 → 删缓存条目）
- `PageFrame` 组件（卸载回收哨）

这些状态之间存在**隐式同步约定**：`fileUrl` 变化 → 清空缓存；PageFrame 卸载 → 删条目；canvas 渲染 → 写条目。组件内 8 个职责叠在一处：打开路由 / per-tab 选择 / 页面缓存编排 / 滚动状态机装配（`createReaderScrollProgress`+`useScrollProgressWiring`+三口接管）/ 快捷键 / 覆盖层工厂（`renderPageLayers` 闭包 4 层）/ 布局（SplitPane/侧栏/工具栏）/ fit-width 计算。

**为什么不烂**：管线简单（单页应用+单人维护），6 个 useState/useRef 的协同还能靠头注记忆。但 20 次 churn 说明每个新阅读器行为都在这个组件上打补丁，状态同步约定（`fileUrl` 清空、`onRecycle` 删除、`selectionMount` 稳定盒）没有机器防线。**同类二次触发信号**：F-01 已声明「只装配」却仍留缓存编排——声明与实现漂移，后续改动基于「已拆分」的假设继续叠加。

**触发条件**：继续叠加阅读器行为（AI 标注层扩展、新的页内交互、手势）。

**建议动作**：拆分线 = 把「页面缓存注册表」下沉为独立 `PagesOverlay` 组件——它持有 `pageTexts`/`pageRoots`，提供 `onPageRender` 回调与 PageFrame 回收，内部装配 TextLayer/AnnotationLayer/ReaderAiLayer；`ReaderPage` 的 `renderPage` 闭包降级为 `<PagesOverlay no={no} ... />`。ReaderPage 收敛到：打开路由 / 布局 / scrollProgress 装配 / fitWidth / 快捷键。

---

## W4 `annotation-anchor.ts` 476 行逼近 500 红线，且是 INV-40 的收口宿主

**位置**：`src/renderer/features/reader/annotation-anchor.ts`（476 行，全项目 top1）

**机制**：INV-40 的 `mergeRects` 归并器把划选保存 / 重开重锚 / `rectsFromRange` 三条路径收口在此文件，而文件本身还承载 W3C 锚定三元组（quote/prefix/suffix + offsets + rects）的序列化与解析。体量增长未触发 500 行红线（差 24 行），但已是 top1 且是 INV-40 e2e 断言的依赖核心。

**为什么不烂**：行数红线未触发；函数内聚度高（都是锚定几何）。

**触发条件**：任何锚定格式扩展（如 AI 锚定需要新的 rect 语义）都会把它压过红线，或在红线边缘被迫塞入。

**建议动作**：主动拆出 `anchor-serialize.ts`（quote 三元组 / offset / rects 的序列化与校验），让 `annotation-anchor.ts` 回归「锚定计算」。趁早拆，别在 500 红线边缘做。

---

## W5 ipc 类型回边环：11 个二元环，消环成本极低

**位置**：`src/main/ipc/index.ts` ↔ `{library, reader, notes, tags, import_, enrich, export_, ai_sensor, lineage, settings, system}.ts`

**机制**：主控判定为 import type 回边（运行时无环）——各子模块从 index.ts 桶 import 类型，而 index.ts re-export 子模块符号。这是「桶文件 + 类型共享」的典型环。

**为什么不烂**：类型环不影响打包/运行/测试。风险是**视觉污染掩盖真实违规**——后续子模块从 index.ts import 运行时值会被「既有环」合理化。

**触发条件**：新增 ipc 子模块时复制既有 import 模式；或有人顺手从 index.ts 拿运行时值。

**建议动作**：专项 refactor 工单（约 1 人时）：子模块中对 `./index` 的类型 import 改为直接来源（`src/shared/ipc/api-surface` 或 services 定义处）；index.ts 的 re-export 改为 `export type * from` 或显式类型列表；check-quality 环检测目标 = 0。时机选功能冻结窗口，不进功能工单。

---

## W6 未锚定不变量：INV-19（AI 标注只读）与 INV-07（路径唯一出口）

**位置**：`docs/invariants.md`

- **INV-19**「AI 标注 v1 只读（无编辑/删除写路径）」——Phase 5 新功能的语义护栏，**无机器防线**。若 SR2-AI-09 已 done 而册仍标未锚定 = 登记册漂移；若未 done = 已知欠账。
- **INV-07**「路径只能出自 main 侧系统对话框」——2026-08-23 UBS 复核过 dialogs.ts 仍唯一出口，但纯人审，无自动化。

**建议动作**：① 核对 SR2-AI-09 状态，若 done 而未落地锚定测试 = 升 P0；② INV-07 补一条契约测试：renderer 请求 schema 全量断言无 `path` 字段（api-surface 契约层即可实现）。

---

## W7 PageColumn / SelectionLayer 缺组件态空间表

**位置**：`src/renderer/features/reader/PageColumn.tsx`（INV-29/30/33 宿主）、`SelectionLayer.tsx`（INV-05/37 宿主）

**机制**：机器扫描的 14 个 statefulModules 中，明确有头注状态机/迁移表的只有 `reader.store`（tab 表）、`scroll-progress`（六态）、`annotation-undo`（INV-23 语义）。PageColumn 同时承载**渲染窗口回收**（INV-30）、**程序滚动收敛**（INV-29）、**缩放中心保持**（INV-33）三个高时序复杂度机制，却没有组件级状态表；SelectionLayer 的 pending / 工具条 / 选区视觉三者分离（INV-37）没有迁移表。（需读全文确认头注是否已有表——机器信号未覆盖此维度。）

**为什么不烂**：三个机制各自有不变量登记 + 单测锚定，但都是「独立锚」，组件内它们如何协同（如缩放 scrollTop 修正与 scroll-progress 状态机、回收与 handlePageRender）没有成表。

**建议动作**：PageColumn 头注补状态表（渲染窗口展开 / 回收 / 缩放的迁移矩阵）；SelectionLayer 头注补 `pending → toolbar → clear` 迁移与 INV-37 的「双轨允许分离」矩阵。

---

## N8 SelectionLayer 跨页划选行为未登记（不确定）

**位置**：`SelectionLayer.tsx`（`page=0` 弃用位，`pageRoot=selectionMount` 内容级包装盒）

**机制**：跨页划选时，选区 rect 的页归属如何确定？如果 rect 跨越两个 `[data-page-root]`，是拆分为多条标注还是拒绝？INV-05 的 `mergeLineRects` 只处理同页几何，**未登记跨页语义**。

**为什么不烂**：单页文献或跨页划选低频下不触发。

**触发条件**：用户在多页文献中拖选跨页文本。

**建议动作**：核查 `selectionToAnchor` 是否按页根切分；若支持，补 INV-05 扩展（跨页拆条规则）；若不支持，补显式截断 + 用户提示。

---

## N9 `schemas.ts` 为状态模块误报，其余低风险组件无需完整状态机表

`src/shared/ipc/schemas.ts`（zod 常量被扫为 stateful——误报）。MetaEditDialog / TagEditor / LineageAddNodeDialog / WorkspaceSection / WorkspaceSwitcher 等表单类组件状态为布尔/字符串级，无跨格序列风险，不需要状态机表。无动作。

---

## N10 INV-02 豁免清单漂移

**位置**：`docs/invariants.md` INV-02 注记（3 处合法尽力而为 catch：`ipc/settings.ts:52`、`reader.store.ts:90`、`import.service.ts:171`）

**机制**：INV-02 规定「用户触发的动作失败必须可见」，但 3 处豁免是「合法尽力而为」。豁免清单无机器防线，新代码可能参照豁免模式新增静默 catch。

**建议动作**：在 check-quality.mjs 加一条「新增空 catch 必须带豁免注释」的启发式——即使不能全量禁止，也能让豁免显式化。

---

## 六个重点攻击面的收口

1. **ReaderPage 职责膨胀**：B3 实锤，拆分线 = `PagesOverlay` 下沉，先做这个（它同时缓解 W7 的 PageColumn 装配压力）。
2. **reader.store 态空间**：**不能一句话说清**——头注只有 `tab.status` 表，实际态空间含 5 维度（tabs / order / activeId / 三信号字段 / 模块级闭包 loadSeq·tabLoadSeq·inflightOpen）。undocumented 跨格序列实锤 2 个：`scrollRequest` 残留（B1）、undo 并发覆盖（B2）。
3. **14 个状态模块**：3 个有表（reader.store / scroll-progress / annotation-undo），2 个高危缺表（PageColumn / SelectionLayer），1 个误报（schemas.ts），其余低风险。
4. **invariants 漂移面**：INV-29 缺 tab 生命周期维度（B1）、INV-23 缺 undo-并发序列（B2）、INV-19/07 未锚定（W6）、INV-02 豁免清单无防线（N10）。漂移模式统一：**不变量册描述的是「行为契约」，但契约的边界条件（何时失效、何时清空）往往缺失**。
5. **ipc 消环**：成本约 1 人时，建议功能冻结窗口专项做，防「类型环 → 运行时环」滑坡。
6. **时序竞态面**：实锤 2（B1/B2）+ 不确定 2（scroll-progress 补滚路径与状态机同步协议、SelectionLayer 跨页划选）。

---

## 最先会烂的三个位置

1. **reader.store 的信号生命周期**（B1）——它是 tab 多开 + 程序滚动 + 进度的三叉汇合点，`closeOne` 的清理清单缺 `scrollRequest` 是「清理清单不完整」这一类缺陷的范式。
2. **undo 的并发覆盖**（B2）——busy 互斥给了人「并发安全」的错觉，但互斥范围只覆盖 undo 自身。
3. **ReaderPage 的声明与实现漂移**（B3）——「只装配」的声明会让后来者把新状态继续加进这个组件，直到某个状态协同 bug 爆发时无人能推导 6 个 useState/useRef 的关系。

建议修复顺序：B1（一行代码 + 一条单测，立即可做）→ B2（小改动 + 单测）→ W5（专项 refactor）→ B3（PagesOverlay 拆分，需要测试护航）→ W4（趁早拆）。