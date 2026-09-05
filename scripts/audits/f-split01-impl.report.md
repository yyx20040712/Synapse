# F-SPLIT-01 实现报告——五件贴线组件纯结构拆件（实现者子代理 → 主控）

> 档位：GLM5.3flash/体验套餐优先/思考等级中（派发指令同口径执行）。
> 日期：2026-09-05。基线：HEAD=b1b28e4d0e / verify 156 文件 1422 用例 / locks 286。

## 0. 开工技能清点（宪法会话开工纪律）

- **用**：verification-before-completion——每件拆毕 `npm run test`、五件毕
  `npm run verify` 真退出码落盘（简报④强制，均已执行且绿）。
- **不用 + 理由**：test-driven-development——票面 TDD 面豁免（简报③.5：纯结构
  搬运零行为差，豁免依票面成立非自裁）；systematic-debugging——全程零红（唯一
  非绿=首轮 verify 的 tsc 类型注解缺陷，探针法定位后即修复，未构成疑难回环，
  未升级到系统化调试件）；frontend-ui-engineering——无新 UI 设计面（纯搬运）；
  code-review-excellence——门审属独立子代理位。配置自查：Node 24.20.0 经
  Volta 绝对路径 shim 亲验（check-quality 版本守卫口径）。

## 1. 实现摘要（每件拆出什么 / 新文件名+行数）

拆后行数全部经 `wc -l` 实测；.tsx 件（含原文件与全部新拆 .tsx）≤169 达标，
新拆 .ts 件受 300/500 口径。

### ① PageColumn.tsx 249 → 164（-85）
- **usePageLazyWindow.ts**（82，.ts）：段③懒渲染窗口——visible/rendered 状态对
  +onVisibleRef latest-ref+IO 占位盒效应+可见集上抛效应+回收调度效应，语句零改
  迁入；IO deps [pageSizes, layout] 零变。
- **usePageColumnScroll.ts**（65，.ts）：段⑤程序滚动（INV-29 单口，deps
  [scrollRequest, pageSizes, totalPages] 零变）+段⑥滚动位置镜像（deps
  [scrollContainerRef] 零变，镜像值写宿主 liveScrollTop ref）；**段⑥缩放锚本体
  （anchoredScrollTop useLayoutEffect）禁动留守原文件**。PageScrollRequest 接口
  随段⑤迁入，PageColumn 再导出维持 PagesOverlay/ReaderPage 既有 import 路径
  （nearestPage 再导出先例）。
- **PageColumnView.tsx**（71）：段②ready 态 JSX（容器+双页行/单页列装配）零改
  迁入；width 仍宿主 columnWidthFor 单源计算传入。

### ② AnnotationLayer.tsx 249 → 151（-98）
- **AnnotationPopups.tsx**（147）：弹层块——AnnotationMenu/AnnotationEditor
  JSX+saveComment/copyQuote/deleteAnnotation 动作函数+四常量（UPDATE_FAILED
  等）+PopupTarget 接口迁入，语句零改；**menu/editing/busy 状态归属
  AnnotationLayer 不变**（经 props 收值+set 函数回写）。F-A8 门 2 编排面
  （resolved/fallbackBands/lineH/三层编排/MutationObserver+rAF/CR1 订阅域）
  全部原样留守未触。

### ③ AiNotesSection.tsx 249 → 107（-142）
- **AiNotesStatus.tsx**（158）：状态行+「AI 读文献」按钮块——STATUS_POLL_MS=5s
  门控轮询+offline 计数+六态 statusText/busy+onRead/onImport+按钮 JSX 迁入，
  语句零改；observe 事实/动作函数经 ai-notes.store 自订阅（F-A3 per-tab 订阅
  先例同源）。
- **ai-notes-phase.ts**（37，.ts）：Phase 类型+derivePhase 纯函数+六态表/按钮
  禁用枚举/跨格序列①~⑤头注段单源（AiNotesStatus 呈现面与 AiNotesSection
  分节可见性条件 phase!=='hidden' 双消费经 import）。

### ④ LineageBoard.tsx 249 → 155（-94）
- **LineageBoardMenu.tsx**（106）：节点菜单+pendingLink 目标选取提示条——
  PendingLink 接口+MODE_HINT+menuParentEdge/menuManualEdges 派生+两块 JSX 迁入，
  语句零改（写路径仍经 store getState 单口）。
- **LineageBoardDialogs.tsx**（103）：加节点/改 core_idea/标签/人工父四对话框
  装配 JSX+ideaNode/tagNode 派生迁入，语句零改。**INV-27 树守卫呈现（toast
  消费面）零改**（toast 在 store flush，本票未触任何 toast 语句）。

### ⑤ ReaderPage.tsx 248 → 163（-85）
- **ReaderPageView.tsx**（157）：全部装配 JSX——空态引导分支+主区滚动容器
  （F-03 三口接线 onScroll/wheel/pointerdown 原样随 JSX 迁）+工具栏+目录布局
  迁入，JSX 零改。**sr2-lg-08 挂载效应（监听器注册先于闩锁消费的语句顺序）
  留守原文件原位未触**。
- **reader-shortcut-handlers.ts**（42，.ts）：快捷键装配——useReaderShortcuts
  (useMemo 工厂) 整体随迁，工厂语句与 deps [] 零变（useMemo 系原件随迁非新增，
  F-ARCH3「不加 useMemo」口径一致）。

## 2. 文件清单

- **新建（10）**：src/renderer/features/reader/{PageColumnView.tsx, usePageLazyWindow.ts,
  usePageColumnScroll.ts, AnnotationPopups.tsx, AiNotesStatus.tsx, ai-notes-phase.ts,
  reader-shortcut-handlers.ts, ReaderPageView.tsx}、src/renderer/features/lineage/
  {LineageBoardMenu.tsx, LineageBoardDialogs.tsx}
- **修改（5）**：五件标的本体（git diff --stat：5 files changed, 86 insertions(+),
  590 deletions(-)——无范围蔓延；tests/src/shared/p7d01-out/tickets 零触碰）
- **证据**：scripts/audits/f-split01-verify.raw.txt（verify 全链输出+`echo exit=$?`
  追加真退出码）

## 3. verify 退出码+用例数（机器实测落档）

- `npm run verify` 真退出码 **exit=0**（日志尾行机器追加）。
- 关卡明细（日志 grep 实测）：quality「无占位标记/无乱码/无跨域引用」✓、
  tickets ✓、**locks 286**（与基线一致）✓、lint ✓、typecheck（node+web 双
  tsconfig）✓、test **156 文件/1422 用例全绿**（与基线一致）✓、build ✓。
- 每件拆毕 `npm run test` 中检：五轮均 156/1422 全绿 exit=0。

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

1. **LineageBoard 提示条 DOM 兄弟序**（见自裁 4）——探针 COMPARE 为终裁，
   若 PNG 逐字节有差（理论上不应有：absolute+z 显式），回滚面=提示条块
   还原原位（局部，15 行）。
2. **AnnotationPopups 承接 api/store 写路径**后，「架构层 api 调用在本层」的
   原头注声明已在两件同步改写——若门一认为 api 面跨件迁移超出「纯搬运」边界，
   处置=动作函数回迁 AnnotationLayer+子件经 props 收 handler（状态归属与
   行为零差，仅胶水方向反转，约 ±20 行，PageColumn/ReaderPage 行数不受牵连）。
3. ReaderPageView props 面 27 个——机械透传无逻辑，但审查可读性观感一般；
   若门二要求收敛（如 tab 派生值组对象化），属纯签名重构可零行为差执行。
4. 本票探针 after+COMPARE 归主控位执行（简报③.4），本报告所有「零视觉差」
   表述均为结构论证，未经 PNG 实证——以主控 COMPARE 结果为准。

## 6. 回炉一轮（门一 Kimi PWW B=0/W=1/N=6 处置——纯注释面，零行为差）

- **W1 批次标记补齐（3 件）**：PageColumnView.tsx / usePageLazyWindow.ts /
  usePageColumnScroll.ts 首行补 `// b3: P7-F`（跟随宿主 PageColumn.tsx 标；
  按门一指令未动 AnnotationPopups/reader-shortcut-handlers/ReaderPageView
  ——其宿主 AnnotationLayer/ReaderPage 本身无标，不带=与宿主一致）。
- **N2 注释指针修正（1 处）**：AiNotesSection.tsx 分节可见性行内注释
  「六态单源在 AiNotesStatus.derivePhase」→「六态单源在
  ai-notes-phase.ts（derivePhase）」——derivePhase 本体驻 ai-notes-phase.ts。
- **行数终态复核（wc -l 实测）**：PageColumnView 72 / usePageLazyWindow 83 /
  usePageColumnScroll 66（三件各 +1 标记行，仍全 ≤169）；AiNotesSection 107
  不变（等长注释改写）。
- **verify 全链重跑**：exit=0（真退出码经 `echo exit=$? >>` 追加在
  f-split01-verify.raw.txt 末尾；本轮段内 locks 286 / 156 文件 1422 用例
  与基线一致）。改动面=4 文件纯注释行，git 零新文件、零 registry 触碰。

