# Synapse 前端完善实施计划

日期：2026-11-19  
状态：**v2 已定案（2026-11-19 用户裁决），随附三项修正，见下。**  
设计输入：`/home/yyx/.zcode/v2/visualizations/4092de50854a007cbca278b8982c0e01b4d47d6c0b4271c6344a74f75a8d9a01/synapse-redesign-v2.html`  
脉络依据：`docs/design/2026-11-19_lane-grid-rerouting.md`（F-LANEGRID-01）

用户裁决（2026-11-19 定案）：

1. 设计稿 v2 的配色、整体布局与按钮细节采纳；脉络图细节（卡片大小与
   线路）不参考——与第五期排在 F-LANEGRID-01 之后的门槛一致。
2. 修正案：引用不放在阅读器右侧研究面板，改放到文献库详情面板与脉络图
   详情面板；阅读器右栏页签为 AI 与笔记两项（第三期范围相应调整）。
3. 修正案：文献库论文详情面板中图的展示调大窗口上下间距，使图片显示
   更大（并入第二期详情面板改造）。

## 1. 实施边界

本计划把设计稿变化映射到产品组件、样式和测试面，供后续会话分期实施。当前只完成设计稿与计划，没有修改产品代码。

实施时遵守以下边界：

1. 不新增依赖，不引入图标库、主题库或布局库。
2. 图标使用内联 monoline SVG，统一 `currentColor`、1.6—1.8px 描边。
3. 正常与护眼主题共用组件结构，主题差异由 `theme.css` token 承担。
4. 不增加移动端布局；桌面验收从 1280×800 开始。
5. “下载”只确定主导航入口与语义，不在前端改版中实现文献搜索或 PDF 下载引擎。
6. 设置页只归并现有功能。设计稿中出现的启动行为、阅读默认行为和标注行为示意，不自动转化为新的 `AppSettings` 字段。
7. 阅读器只持久化现有 PDF 阅读进度；右栏页签和滚动位置不跨应用启动保存。
8. 脉络前端网格化是 F-LANEGRID-01 走线重构的呈现层，不另建一套走线算法。

## 2. 已核实的现状

以下结论来自 2026-11-19 对源码的读取。

- `src/renderer/app/Rail.tsx` 已是 72px 图标轨，包含课题、下载、文献库、阅读器、脉络和设置；下载目前只显示“规划中”提示。
- `src/renderer/features/library/LibraryPage.tsx` 已把 `FolderNav` 放在文献库内部。分类区无需移入应用壳层。
- 文献详情当前始终渲染 `.lib-drawer`，没有按窄宽度默认收起的状态。
- 阅读器当前由 `ReaderPageView.tsx` 渲染左栏；`OutlineAside.tsx` 将目录、缩略图、笔记和 AI 会话放在同一左栏，没有右侧研究面板。
- `App.tsx` 按视图条件挂载页面。离开阅读器会卸载 `ReaderPage`，所以右栏状态若只存在组件 `useState` 中，跨页返回会丢失。
- `reader.store.ts` 已按文献保存会话内标签状态，适合承载右栏页签和滚动位置；这些字段不需要进入 IPC 或数据库。
- `lineage-timeline.ts` 的 `groupTimeline` 已按年、月正序分组，组内保持 `lineageOrder`。v2 的“最新在下”不需要反转现有产品排序。
- 脉络当前走线仍是 `routing/chain.ts` 的六态链，包含 direct、band 和 outer-ring 等旧形态；与 F-LANEGRID-01 的目标不同。
- 产品存在真实暗色主题，包含 schema 枚举、启动注入、CSS 覆写、PDF 反色、标注混合模式和测试，不只是设置页中的一个选项。

## 3. 设计变化到代码的映射

| 设计变化 | 产品代码落点 | 样式落点 | 主要测试面 |
| --- | --- | --- | --- |
| 正常模式采用灰绿体系 | `src/renderer/shared/theme.css` 的亮面 token；保留现有业务组件 | `theme-shell.css`、`theme-buttons.css`、`theme-reader.css`、`theme-lineage*.css`、library/workspace/tag CSS 的 token 消费 | `theme.test.ts`、`theme-trio.spec.ts`、shell/library/reader/lineage 既有视觉与文本 e2e |
| 护眼模式整体调浅 | `theme.css` 的 `:root[data-theme='sepia']` | 同上；纸面、网格和选中底色必须分别检查 | `theme.test.ts`、`theme-trio.spec.ts`、`reader-text.spec.ts` |
| 72px 图标轨与 v1 图标 | `Rail.tsx`、`shared/icons.tsx`；必要时调整 `App.tsx` 顶栏上下文 | `theme-shell.css`、相关按钮 SVG 规则 | `app-shell.test.tsx`、`app-shell-t3u1.test.tsx`、`shell-rail.spec.ts`、`ui-icons-shared.test.tsx` |
| 下载保留主导航，导入只在文献库 | `Rail.tsx` 保留下载；`LibraryPage.tsx` / `ImportDropZone.tsx` 保留导入 | `theme-shell.css`、`library.css` | `shell-rail.spec.ts`、`import-drag.spec.ts`、`import-to-folder.spec.ts` |
| 分类只在文献库 | 保持 `FolderNav` 在 `LibraryPage`，不向 `Rail` 或 `App` 增加分类 | `library.css`、`library-explorer.css` | `folder-nav.test.tsx`、`library-explorer.spec.ts`、其余视图可见性回归 |
| 文献详情工具栏收起、窄宽默认收起 | `LibraryPage.tsx` 管理 `detailOpen`；`PaperDetailPanel.tsx` 提供工具栏按钮；`use-lib-pane-widths.ts` 保持宽度逻辑 | `library.css`、`library-explorer.css` | `paper-detail-drawer.test.tsx`、`library-detail-info.spec.ts`、`library-density.spec.ts`、新增 1280 收起/展开用例 |
| 阅读器左导航、右 AI/笔记（引用移至文献库与脉络详情面板） | `ReaderPage.tsx`、`ReaderPageView.tsx`、`OutlineAside.tsx`、`ReaderToolbar.tsx`、`PaperAiPanel.tsx`、`ReaderNotesPanel.tsx`；新增右侧研究面板组件；引用组件落位文献库详情面板与脉络详情面板 | `theme-reader.css` | `outline-aside.test.tsx`、`reader-notes-panel*.test.tsx`、`reader-toolbar-icons.test.tsx`、`reader.store.test.ts`、`reader-text.spec.ts` |
| 阅读器跨页恢复右栏页签与位置 | `reader.store.ts` 按 `paperId` 保存会话字段；`ReaderPage.tsx` 在卸载和页签切换时收账，面板挂载后恢复 | 无需新增持久化样式 | 新增 store 迁移与跨页 e2e；复用 `reader-page-open-race.test.tsx` 检查迟到响应 |
| 脉络最早在上、最新在下 | 保持 `groupTimeline` 正序；不得为匹配旧 v1 改成倒序 | 年组与滚动定位样式 | `lineage-timeline.test.tsx`、`lineage.spec.ts`、导航定位测试 |
| 卡片与走线使用统一车道网格 | `capacity.ts`、`TimelineYears.tsx`、`LineageTimeline.tsx`、`EdgeOverlay.tsx`、`use-lineage-routes.ts`、`routing/*` | `theme-lineage.css`、`theme-lineage-tools.css` | `lineage-capacity.test.ts`、`lineage-routing*.test.ts`、`lineage-finalize-gate.test.ts`、`lineage-route-slots.spec.ts`、`lineage-route-stress.spec.ts` |
| 设置五类归并 | `SettingsPage.tsx` 增加分类导航与当前分类状态；现有 `UiScaleSection`、AI、网络、同步等组件作为分类内容 | 新增设置域 CSS 或既有共享样式中的设置段 | `settings-page-enter.test.tsx`、AI 管理/预算/语料/同步密钥测试、新增分类切换 e2e |
| 删除暗色主题 | 见第 6 节的完整影响面 | `theme.css` 删除 dark 覆写；清理只服务暗色的反色与说明 | 见第 6 节；最后执行完整 `npm run verify` 与两主题 e2e |

## 4. 分期建议

每期独立提交，先补会失败的测试，再实现。修改既有断言、共享 schema、测试与文档时，在提交说明中申报原因。不得通过删除失败断言制造通过。

### 第一期：配色 token 与图标体系

**范围**

1. 在 `theme.css` 替换正常与护眼 token；护眼值以 v2 报告表格为准。
2. 统一 `Rail.tsx`、`shared/icons.tsx`、`reader/view/toolbar-icons.tsx` 的 monoline 图形，保持既有 accessible name。
3. 仅改视觉，不改面板结构、路由算法和数据契约。
4. 清理被新图标替代的旧 SVG，不保留两套图标方案。

**验收**

- `theme.test.ts` 对两主题终值逐项有硬编码断言，新增测试先红后绿。
- `ui-icons-shared.test.tsx`、`reader-toolbar-icons.test.tsx` 验证 SVG 无内联颜色、使用当前色并保留按钮名称。
- 无头截图检查正常/护眼下的文献库、阅读器、脉络、设置；必须实际查看图像。
- 运行相关 renderer 单测和 `shell-rail.spec.ts`、`reader-text.spec.ts`；每期最终运行 `npm run verify`。

**回退**

只回退本期 token 与图标提交。若个别组件存在硬编码旧色，修消费点到 token，不为该组件新增主题分支。

### 第二期：应用壳层与文献库布局

**范围**

1. 保持 72px 图标轨；在轨顶加入 v1 logo，主导航顺序为课题、下载、文献库、阅读器、脉络，设置贴底。
2. 下载入口文案统一为“下载文献 PDF 到相应文件夹”。功能未完成时仍须如实显示规划中，不假装已下载。
3. `FolderNav` 留在文献库，阅读器、脉络和设置不得出现课题资料与常用标签。
4. 文献库采用分类、列表、详情三列；详情收起按钮位于详情工具栏。
5. 视口宽度不超过 1320px 时，文献库首次进入默认收起详情；更宽视口默认展开。用户手动操作后的会话选择优先，窗口每次微小 resize 不得反复覆盖用户选择。
6. 不为响应式默认值新增 `AppSettings` 字段。
7. （2026-11-19 用户交办）论文详情面板中图的展示调大窗口上下间距，使图片显示更大。

**建议的状态规则**

| 事件 | 宽屏 | 窄屏 |
| --- | --- | --- |
| 本次会话首次进入文献库 | 展开详情 | 收起详情 |
| 点击详情开关 | 切换并记录会话选择 | 切换并记录会话选择 |
| 已作出会话选择后 resize | 保持选择 | 保持选择 |
| 切换分类或文献 | 不重置宽度 | 不重置宽度 |

**验收**

- 1280×800 初始详情收起，列表真实题名完整可见；1440×900 初始详情展开。
- 详情面板图区上下间距放大后图片显著变大（无头截图核验两档视口）。
- 工具栏收起与主工具区展开形成同一状态，不残留 1px 以上的可见空抽屉。
- 分类、标签筛选、拖拽导入、文件夹移动和删除流不因布局变化失效。
- 运行 `app-shell*.test.tsx`、`folder-nav*.test.tsx`、`paper-detail-*.test.tsx`、`library-explorer.spec.ts`、`library-density.spec.ts`、`library-detail-info.spec.ts` 和导入 e2e。

**回退**

保留现有 `FolderNav`、列表和详情数据组件，只回退布局与 `detailOpen` 状态提交。若窄屏回归阻塞，可先恢复始终展开，但不得删除新增窄屏测试来放行。

### 第三期：阅读器双侧栏与右栏会话记忆

**范围**

1. 左栏只保留目录与缩略图；`OutlinePanel` 继续负责 PDF 目录和页面导航。
2. 新建右侧研究面板宿主，把 `PaperAiPanel` 与 `ReaderNotesPanel` 从 `OutlineAside` 迁到右侧；删除旧的左栏 AI/笔记页签，不保留双入口。
3. 左、右面板开关都放在 `ReaderToolbar` 的左右两端。`OutlineAside` 内旧收起钮随结构迁移删除。
4. （2026-11-19 修正案）阅读器右栏不做引用页签；引用落位文献库详情面板与脉络图详情面板。先复用当前文献详情与导出能力：BibTeX 走现有 `export_.clipboard`；GB/T 7714 和 APA 需要独立的纯序列化实现与 golden 测试，不在 renderer 拼接第二套元数据规则，不新增格式化依赖。脉络详情面板的引用落位与在途 lineage 改动冲突时延后并申报。
5. 左右侧栏可继续使用 `SplitPane`，右栏使用独立 `paneId`；既有宽度 localStorage 行为不属于本次“右栏页签与位置不跨启动”的删除范围。

**右栏状态与迁移**

建议把字段加入 `TabState`，类型为会话内可选字段，以兼容既有测试夹具：

- `researchTab: 'ai' | 'notes'`，新文献默认 `ai`；
- `researchScroll`，分别记录三个页签的 `scrollTop`；
- `researchOpen` 可作为阅读器会话级开关，不要求按文献持久化。

| 事件 | 页签 | 滚动位置 | 生命周期 |
| --- | --- | --- | --- |
| 打开新文献 | AI 对话 | 各页签为 0 | 写入当前 tab 会话态 |
| 点击右栏页签 | 切到目标页签 | 先保存旧页签，再恢复目标页签 | 不写数据库 |
| 切到其他文献标签 | 恢复目标文献页签 | 恢复目标文献、目标页签位置 | 各 tab 隔离 |
| 切到文献库/脉络/设置 | 不变 | 卸载前保存 | ReaderPage 卸载不清 store |
| 返回阅读器 | 恢复当前文献页签 | DOM 就绪后恢复 | 不触发 PDF 页码变化 |
| 关闭文献标签 | 随 tab 删除 | 随 tab 删除 | 重开为默认状态 |
| 关闭并重开应用 | AI 对话 | 0 | 不写 settings、localStorage 或 DB |

滚动收账不得在每个 scroll 事件触发 IPC。可在切换页签、切换文献和组件卸载时同步记录内存值；恢复时应避免与 AI 新消息自动滚动争用，用户已上滚阅读旧消息时不得被强制拉到底部。

**验收**

- 单测覆盖上表，包含切文献、关标签、离开阅读器和重开应用语义。
- e2e 依次执行“笔记页签滚动→去文献库→回阅读器”，断言真实笔记文本与滚动位置恢复。
- 分别验证 AI、笔记两个页签；AI 会话请求、笔记编辑草稿和标注定位不因迁移丢失。引用面在文献库详情面板验收（格式切换与复制）。
- 两个收起按钮在 1280 宽度仍可点击，PDF 正文真实文本可见，控制台无错误。
- 运行 `outline-aside*.test.tsx`、`reader-notes-panel*.test.tsx`、`reader.store.test.ts`、`reader-page-open-race.test.tsx`、`reader-text.spec.ts`、`reader-scroll.spec.ts`、`reader-search.spec.ts`。

**回退**

回退整个阅读器结构提交，恢复到单侧栏，不同时保留左右两套 AI/笔记入口。若引用新格式阻塞，不让它阻塞双侧栏主体；先交付 BibTeX 并明确其他格式尚未接线，再另开纯序列化小批次。

### 第四期：设置五类归并与暗色主题删除

**范围**

1. `SettingsPage` 改为左侧五类导航、右侧当前分类内容；分类状态只需会话内记忆。
2. 通用：联系邮箱。
3. 外观：正常/护眼主题、界面缩放。
4. 阅读与标注：只展示已有阅读偏好；现状没有对应独立设置字段时，不为填充分类新增持久化选项。
5. AI 助手：`AiAssistantSection`、AI 管理、AI 预算、语料导出、联动配置。
6. 数据与网络：网络诊断、白名单说明、同步密钥及现有数据功能。
7. 保存仍走 `settings.store.save`，保留全量字段、写序列与草稿水合规则。
8. 按第 6 节删除暗色主题，并处理存量设置。

**验收**

- 五类切换后只显示当前分类；长内容在设置内容区滚动，文档本身不滚。
- 联系邮箱 Enter 保存、组词输入、界面缩放、AI 预算和导出行为保持。
- 两主题切换即时生效，状态栏主题名正确，重新启动后仍为所存主题。
- 存量 `theme:'dark'` 与 `theme:'system'` 均迁移为 `light`，其余设置字段不变。
- 运行设置、主题、主窗口启动相关测试及完整 `npm run verify`。

**回退**

设置分类与暗色删除宜分为两个提交。分类布局可独立回退；暗色删除若需回退，必须连同 schema、启动注入、CSS 和迁移测试整体回退，不能只恢复 dark CSS 块。

### 第五期：脉络车道网格与正交走线

**排程条件**

本期排在 F-LANEGRID-01 的分配器契约落地之后，或与该工单同步实施。前端不得先按静态稿坐标另写临时走线器。若同步实施，双方共用同一网格常量、障碍快照与坐标域。

**范围**

1. 保留 `groupTimeline` 的年/月正序和 INV-75 组内顺序。
2. `capacity.ts`、`TimelineYears.tsx` 与 `theme-lineage.css` 形成统一卡片网格；卡片矩形注册为障碍，覆盖的网格段失效。
3. 在全图一张网格上分配所有边，跨月、跨年不切换坐标体系；网格随布局派生。
4. 所有自动路径只含水平与垂直骨架段；废除 direct 斜连、band 外带与 outer-ring 外圈逃逸。
5. 网格耗尽时按边序叠加，不扩大图域；同成本候选按少拐优先并保持确定性。
6. 保留 `buildRoundedPath` 的 r=6→3→0 曲化，不把圆角改成斜线。
7. 卡片增删或移动触发相关月框全部线重分配，包括手动调整线；用户只改 via 时仅改当前线，不触发全局重算。
8. `EdgeOverlay` 保留线在卡下、命中层、焦点、编辑和提示能力；观测属性按新网格语义重命名，不继续伪造旧 slot/band 含义。

**必须同步更新的契约**

- INV-79：障碍与网格耗尽后的叠加语义；旧 blocked 承诺需按裁决重写。
- INV-112、INV-115：旧槽位共线与残余分离承诺退役或并入统一网格占用。
- INV-119③：锚点与网格接驳、钉定端优先级。
- INV-SLOTGRID-02：网格电平集成为唯一走线坐标源。
- INV-169：最小布局宽、测量与 own/screen 坐标仍须与网格派生一致。
- `route-stress-assert` 的 `SHARED_LEVEL_ROUTES` 豁免只能在统一网格实现并有硬断言接替后删除。

**验收**

- 纯函数测试覆盖：全网网格生成、卡片障碍失效、边序确定性、少拐 tie-break、耗尽叠加、跨月/跨年、锚接驳、手动 via 两类更新。
- e2e 解析真实 SVG 路径，断言自动走线无斜线、无外圈路径、线段来自统一电平集，卡片不被线穿过。
- 覆盖 1280、三档 uiScale、缩放与滚动组合；滚动和缩放不得改变布局网格。
- 运行 `lineage-capacity.test.ts`、`lineage-timeline*.test.tsx`、`lineage-routing*.test.ts`、`lineage-finalize-gate.test.ts`、`lineage-edge-via-commit.test.ts`、`lineage-route-slots.spec.ts`、`lineage-route-stress.spec.ts`、`lineage-obstacle-audit.spec.ts`、`lineage-anchor-consistency.spec.ts` 与完整 `npm run verify`。

**回退**

F-LANEGRID-01 必须作为独立逻辑单元回退。若新分配器未通过压力与障碍断言，不发布只有外观变化的半成品网格；保留旧产品实现直到新链路完整可用，再按方案切换删除旧 routing 文件。

## 5. 每期共同验收门槛

1. 新测试先证明会失败，再实现至通过；记录实际执行数量，避免路径过滤拼错造成零执行。
2. 核心渲染层改动前后各跑相关测试；e2e 必须断言真实文本，不只看几何。
3. 检查 1280×800 与 1440×900 两档视口；需要视觉确认时使用无头截图并实际查看。
4. 运行 `npm run verify`，以退出码判定结果；范围涉及 e2e 时另跑 `npm run test:e2e`。
5. 检查无 `TODO`、失效旧方案、无引用新文件和范围蔓延。
6. 行为或约束变化时同步更新 `docs/architecture.md`、`docs/invariants.md` 和相关 ADR；无影响时如实说明。

## 6. 暗色主题删除影响面

### 6.1 源码与设置

| 文件 | 已核实的暗色职责 | 删除时的处理建议 |
| --- | --- | --- |
| `src/shared/ipc/schemas.ts` | `appSettingsSchema.theme` 为 `light/dark/sepia` | 枚举收窄为 `light/sepia`。这是共享契约变更，须申报。 |
| `src/main/services/settings.service.ts` | 读取并校验 settings；目前只把 system 迁为 light | 在校验前把 dark 与 system 都迁为 light，保留 contactEmail、uiScale、aiBudgets；同步读与异步读共用一个迁移函数。无需 SQL migration。 |
| `src/renderer/public/theme-boot.js` | 首帧接受 dark query | 只接受 light/sepia；其他值不写 dataset，由 light 兜底。 |
| `src/renderer/app/App.tsx` | `normalizeTheme` 接受 dark；运行时写 data-theme；状态条取主题名 | 删除 dark 分支并更新注释；保留启动值与 settings 值一致机制。 |
| `src/renderer/shared/ui-constants.ts` | `THEME_LABEL` 含夜间文案 | 删除 dark 键，label 改为正常/护眼的 v2 名称。 |
| `src/renderer/features/settings/SettingsPage.tsx` | 主题下拉由 THEME_LABEL 生成三项 | 自动变为两项；头注与说明同步改为两主题。 |
| `src/renderer/shared/theme.css` | 完整 dark token 覆写、PDF 反色、screen 混合与深色标注色板 | 删除 dark 块；正常/护眼值按 v2 重定。保留仍被两主题共享的 token，不误删 QR 恒黑白色。 |
| `src/renderer/shared/theme-reader.css` | canvas 与缩略图消费 `--canvas-filter` | 若两主题均无反色，删除 filter 与对应 token；同步更新阅读器皮肤测试。 |
| `src/renderer/features/reader/view/PageBox.tsx` | 注释声明 dark 纸面色 | 更新注释，纸面仍消费 `--paper`。 |
| `src/renderer/features/reader/state/page-layer-z.ts` | 注释声明 dark 使用 screen | 改为两主题 multiply 的事实。 |
| `src/renderer/features/reader/anchors/annotation-style.ts`、`view/AnnotationLayer.tsx`、`view/SearchHighlightLayer.tsx`、`interact/SelectionLayer.tsx` | 标注/搜索层引用主题混合语义 | 保留 `--annotation-blend: multiply` 作为共享语义可最小化改动；删除 dark 说明，不改变现有色块层序。 |
| `src/main/windows/main-window.ts`、`src/main/bootstrap.ts` | 启动主题经类型与 query 透传 | 通常无需结构改动；随 AppSettings 类型收窄并更新测试，保留 FOUC 防护。 |

`SyncKeySection.tsx` 和 `shared/qr/qr-encode.ts` 中的 `dark` 指 QR 暗模块，不是暗色主题，不属于删除面。

### 6.2 测试面

以下文件含 dark 主题行为、断言或夹具，实施时逐项区分并处理：

- 契约与设置：`tests/contracts/schemas.test.ts`、`tests/contracts/ai-schemas.test.ts`、`tests/unit/ipc/settings.test.ts`、`tests/unit/services/settings-theme-boot.test.ts`、`tests/unit/renderer/settings.store.test.ts`、`tests/unit/renderer/budget-section.test.tsx`。其中仅作为任意合法主题夹具的 dark 可换成 light/sepia；合法枚举与迁移断言必须改为两主题的真实行为。
- 启动与应用壳：`tests/unit/renderer/theme-boot.test.ts`、`tests/unit/windows/main-window-theme.test.ts`、`tests/unit/renderer/app-shell.test.tsx`、`tests/unit/renderer/app-shell-t3u1.test.tsx`。
- token 与 PDF：`tests/unit/renderer/theme.test.ts`、`tests/unit/renderer/r3p4-reader-skin.test.tsx`、`tests/unit/renderer/pdf-page-canvas.test.tsx`。
- e2e：`tests/e2e/theme-trio.spec.ts` 当前覆盖三主题与 PDF 反色；应重写为正常/护眼两主题，保留启动、保存、状态栏和纸面检查，删除暗色场景的理由必须在提交说明中申报。
- `tests/unit/renderer/annotation-layer.test.tsx` 与 `reader-search-ui.test.tsx` 锁 `--annotation-blend` 消费。若保留 multiply token，这些测试无需因删暗色而弱化；若改机制，必须以等价的亮面/护眼合成断言替代。

`tests/unit/renderer/qr-encode.test.ts` 的 dark module 与主题无关，不修改。

### 6.3 文档与迁移风险

- `docs/invariants.md` 的 INV-46、INV-71、INV-74 含三主题、screen 混合和夜间反色承诺，须与实现同批重写。
- `docs/architecture.md` 的主题启动链说明须改成两主题，但启动 query 与 App effect 双阶段机制仍保留。
- 不能只收窄 schema。若不先迁移旧 dark，现有 `safeParse` 失败会使 `readSettings` 返回整份默认值，可能把用户邮箱、界面缩放和 AI 预算一并重置。
- dark→light 是删除暗色后的确定性迁移，不自动改成 sepia；护眼是用户显式选择。

## 7. 跨期风险与控制

| 风险 | 控制 |
| --- | --- |
| token 改名造成硬编码颜色漏网 | 先保留语义 token 名并替换值，再处理消费面；运行 quality 与主题测试，不散落新 hex。 |
| 阅读器迁移丢失草稿或 AI 状态 | AI/笔记数据仍由原 store 持有；面板迁移只改宿主。加入切页、切文献和卸载序列测试。 |
| 恢复滚动位置与 PDF 页码恢复相互触发 | 右栏 scrollTop 与 PDF scrollRequest 完全分离；右栏恢复不得调用 `setPage`。 |
| 窄屏详情状态被 resize 反复覆盖 | 首次默认与用户会话选择分开；只有未作选择的首次进入应用响应式默认。 |
| 设置分类破坏全量保存 | 复用 settings.store，不拆出多个保存通道；保留并发写序和水合测试。 |
| 暗色删除误伤 QR 或标注对比 | QR 深色模块不改；标注色块继续验证 multiply 与真实 PDF 文本。 |
| 脉络视觉先行形成第二套路由 | 脉络最后实施，或与 F-LANEGRID-01 同步；静态稿坐标不进入产品。 |
| 删除旧测试导致覆盖面下降 | 旧方案断言删除必须与新网格硬断言同批出现；统计实际用例数并审查 diff。 |

## 8. 新会话接续顺序

1. v2 已于 2026-11-19 定案（裁决记录见文首）；后续设计若有改动，先更新设计稿与本计划，再写产品代码。
2. 从第一期开始，不跨期提前实现脉络网格。
3. 每期开工前读取当期组件头注、相关测试和 `docs/invariants.md`，发现本计划与最新代码冲突时报告差异。
4. 每期结束提供实际命令、退出结果、截图查看记录与剩余风险，不把未运行的检查写成通过。
