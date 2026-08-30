# F-A3 实现报告 —— 标注「选择模式」（LOOP 三屋·实现者屋）

> 领单:LOOP F-A3（票面 `scripts/audits/f-a3-ticket.md`，五层规约+前置态空间表）。
> 实现者纪律:禁 git 提交/禁触 tickets/禁改受锁面；TDD 首红→绿→断言级变异红证
> →真机取证→verify 全链。

## 1. 实现摘要

选择模式 = per-tab 视图交互态 `TabState.selectionMode`（false=常规=默认；
true=选择）。选择模式下 AnnotationLayer 与 AiAnnotationLayer 渲染 rect
`pointer-events:none`（点击穿透零副作用+拖选可在标注块上发起——F-A2 根治）；
进入选择模式即关闭已开菜单/编辑器（S1）并清 AI 选中描边（S4）；切回常规
不自动恢复。toggle 语义在装配面 ReaderPage（工具栏纯受控，新增「选择模式」
按钮：ghost 变体、aria-pressed、选中态 `borderColor: var(--accent)`、位置=
颜色组后/搜索占位前）。SelectionLayer/SelectionToolbar 正交零改动。
store 动作 `setSelectionMode(mode)` 经 `updateActiveTab` 写 active tab
（setColor 同型；activeId=null no-op）。

## 2. 文件清单（逐文件改了什么）

| 文件 | 改动 |
| --- | --- |
| `src/renderer/features/reader/reader.store.ts`（452 行） | TabState 增 `selectionMode?: boolean`（可选=受锁夹具兼容，见自裁 1）；makeLoadingTab 新建分支显式 `selectionMode: false`（error 重试经 `{...prev}` 沿用）；`ReaderStore.setSelectionMode(mode)` 接口+实现（updateActiveTab）；头注行为层增补票面 §0 面③迁移表原文 |
| `src/renderer/features/reader/AnnotationLayer.tsx`（249 行） | store 自订阅 `selectionMode`（SelectionLayer color 选择器先例，props 接口零变）；rect style 条件覆盖 `selectionMode ? { ...rectStyle(...), pointerEvents: 'none' } : rectStyle(...)`（rectStyle 零改）；onClick 守卫（自裁 3）；进入选择模式 effect 关 menu/editing（S1/S5）；头注架构层「v1 约束」行条件化改写（F-A2 根治声明+INV-42 指针） |
| `src/renderer/features/reader/AiAnnotationLayer.tsx`（230 行） | 同型自订阅；rect 内联 `pointerEvents: selectionMode ? 'none' : 'auto'`；onClick 守卫；进入选择模式 effect `setSelectedId(null)`（S4 描边清除+rects 惰性化）；头注 F-A3 增补段（模式语义+INV-42 指针） |
| `src/renderer/features/reader/ReaderToolbar.tsx`（196 行） | props 增 `selectionMode?: boolean; onToggleSelectionMode?: () => void`（可选=受锁夹具兼容，见自裁 2）；「选择模式」按钮（颜色组后/搜索占位前；ghost btn 类；aria-pressed；选中态 borderColor var(--accent)；title 票面 1.4 单 title）；头注行为层/接口层同步 |
| `src/renderer/features/reader/ReaderPage.tsx`（205 行） | 装配：`const selectionMode = tab?.selectionMode ?? false`；ReaderToolbar 传两 prop，toggle 语义在装配面（`useReaderStore.getState().setSelectionMode(!selectionMode)`）；头注 F-A3 行 |
| `tests/unit/renderer/selection-mode.test.tsx`（新增，323 行） | 票面 5.1 用例 ①~⑦（always-active）；形态 crib annotation-layer.test.tsx+ai-annotation-layer.test.tsx；布态=setState 直植完整 TabState+activeId，afterEach 复位 `createReaderStoreInitialState()` |
| `scripts/audits/f-a3-verify.mjs`（新增） | 真机探针（crib f-a2-retest.mjs）：三场景 A/B/C+B0 分解实验+hitTest/滚动诊断；产物 `scripts/audits/f-a3-out/f-a3-verify.json` |

零改动面（git status 佐证）：SelectionLayer/SelectionToolbar/AnnotationMenu/
AnnotationEditor/PagesOverlay/annotation-style.ts/全部受锁 tests。

## 3. 红证索引（首红+变异 M1~M5，全部 exit=1 红→还原 diff 空）

| 证据 | 文件 | 结果 |
| --- | --- | --- |
| 首红（全量 `npm run test`） | `scripts/audits/f-a3-first-red.raw.txt` | 114 文件中仅新文件 7 用例红，存量 948 全绿，exit=1 |
| M1 摘 AnnotationLayer 订阅（恒 false） | `f-a3-mutation-m1.raw.txt`（术前）+ `f-a3-mutation-m1-post.raw.txt`（行数手术后重做） | ③④⑤ 红 |
| M2 摘 AnnotationLayer 关弹层效应 | `f-a3-mutation-m2.raw.txt` + `f-a3-mutation-m2-post.raw.txt` | ④⑤ 红（票面预期 ⑤；④ 因含菜单断言更强） |
| M3 摘 AiAnnotationLayer 订阅 | `f-a3-mutation-m3.raw.txt` | ⑥ 红 |
| M4 store setSelectionMode 空体 | `f-a3-mutation-m4.raw.txt` | ①② 红（连带 ③~⑥ 切换不落地） |
| M5 摘 ReaderToolbar onToggle 接线 | `f-a3-mutation-m5.raw.txt` | ⑦ 红 |

还原纪律：全部 cp 备份→变异→定向红（`npm run test -- tests/unit/renderer/
selection-mode.test.tsx`）→cp 还原→diff 空；未用 git checkout（未提交实现保护）。
M1/M2 在 AnnotationLayer 行数手术后（实现形态变化）重做，红证等价。

## 4. 测试证据（绿后全量数字）

- 全量 `npm run test`：**114 文件 / 955 用例全绿，exit=0**（`f-a3-green.raw.txt`；
  基线 948+新 7=955，与票面 ⑤ 预估一致）。
- `npm run verify` 整链：**exit=1，唯一红点=locks:check**（新增受锁路径
  `tests/unit/renderer/selection-mode.test.tsx`+`scripts/audits/f-a3-verify.mjs`
  未登记——票面 5.4 属主控收口面 locks:generate+apply，实现者禁改 locks/；
  `f-a3-closeout-verify.raw.txt`：quality✓ tickets✓ 后停在 locks）。
- verify 剩余链分段：lint+typecheck+test（114/955）+build **全绿 exit=0**
  （`f-a3-closeout-rest.raw.txt`）。
- 存量 e2e：**29/29 全绿 exit=0**（`f-a3-e2e-final.raw.txt`）。首轮 1 失败
  （P7-A 剪贴板）详见疑虑 3。

## 5. 真机取证结果摘要（PASS）

`scripts/audits/f-a3-out/f-a3-verify.json`（raw：`f-a3-verify-probe.raw.txt`；
final-state.png 同目录）。真实库副本 freshUserData+Electron launch+真鼠标 CDP：

- **场景 A（负向对照）PASS**：常规模式，起点压在既有标注 rect 上真鼠标拖选
  →selLen=0+无工具条（现状保持，不回归）。
- **场景 B（F-A2 根治）PASS**：点「选择模式」→aria-pressed=true+58 rect 计算样式
  全 `pointer-events:none`+压点 hitTest=非空文本 SPAN（txt=90）→同点位真鼠标拖选
  →selLen=81+selection-toolbar 出现→点「高亮」→唯一 annotationId 计数 1→2。
- **场景 C（现状不破）PASS**：切回常规→aria-pressed=false+rect 全恢复 auto→
  真鼠标点击标注→annotation-menu 出现。
- **B0 分解实验（票面外加强）**：选择模式干净区拖选正常（selLen=599+工具条）——
  证明模式本身不破坏常规划选链路。

## 6. 自裁申报（票面外的一切决定）

1. **`TabState.selectionMode` 实现为可选字段**（票面 1.1 字面 `selectionMode:
   boolean` 必填）：8 个受锁测试文件（tab-bar/tab-dirty/reader-notes-panel/
   outline-aside/anchor-locate/ai-annotation-layer/ai-notes-section/
   r3-rdr-set-visual）以完整对象字面量构造 `TabState`，且 `tests/**` 在
   tsconfig.web/node 的 typecheck include 内——必填字段将使受锁 sha256 面
   typecheck 全红，而禁改 tests/** 是硬禁令。可选+makeLoadingTab 显式 false+
   消费方一律 `?? false` 兜底，行为语义与票面零差异（缺席即常规态）；票面
   1.2 自身的订阅选择器形态（`?? false`）与该选择无缝一致。
2. **ReaderToolbar 两个新 props 实现为可选**（票面 2 字面必填）：同因——受锁
   r3-rdr-set-visual.test.tsx 以既有 props 形状直植渲染 ReaderToolbar。生产
   装配面 ReaderPage 恒传；缺席仅存在于受锁测试路径（常规态渲染+按钮无操作）。
   两处头注接口层均如实声明可选性+理由。
3. **两层 onClick 守卫**（票面 1.2/1.3 未列）：jsdom 的 `element.click()` 不走
   hit-test，`pointerEvents:none` 在 jsdom 不阻断事件派发——票面 ④「菜单不出现
   +信号不变」与 ⑥ 零副作用断言在 jsdom 不可达。守卫兜程序化派发（浏览器层由
   pointerEvents:none 达成，双保险；真机场景 B/C 已同时验证浏览器层穿透）。
   两层头注+行内注释声明。
4. **AnnotationLayer 行数手术**：票面 3 预算「239→约 250」，实际首版 263 超
   quality 组件 250 红线。手段=压注释密度+map 回隐式返回（style 内联条件覆盖
   rectStyle，票面伪码的 rs 变量内联化，两臂各调一次，行为同）→249 行。术后
   定向 7/7 绿+M1/M2 重做红证。
5. **探针对票面 5.3 crib 的工程化调整**（逐轮 raw 在档，均为探针口径修正非
   行为面放宽）：① 拖选终点纵向≥40px（f-a2 场景 2 紧邻行终点仅 ~17px 位移不足
   不成选，首轮实证 selLen=0 后修正；A/B 同点位同距离，唯一变量=模式）；② 压点
   =标注块×非空文本 span 交叠区中心（块中心可能落在空 span——浏览器无法在无
   文本处锚定选区；hitTest txt=90 实证）；③ 标注计数按唯一 annotationId（一条
   标注跨多行渲染多 rect，首轮 58→65 的 +7 实为一条标注）；④ 场景 C 点击前
   滚块进视口（保存链滚动漂移 beforeSave=9971→afterSave=12113 在档，票面 ④
   「滚块进视口」保障手法）；⑤ 附加 B0 分解实验。
6. **e2e 首轮 P7-A 失败的三次取证**：两次失败剪贴板内容随机不同
   （md 路径→「从什么角度」）且均与测试无关、单跑第三次 PASS、全量重跑 29/29
   PASS——判定系统剪贴板并行写入噪声（用户机器并行使用场景），与本票改动面
   零交集（ReaderShortcuts 复制走 navigator.clipboard，五文件改动不触及）。
   raw：`f-a3-e2e.raw.txt`/`f-a3-e2e-p7a-retry.raw.txt`/`f-a3-e2e-final.raw.txt`。
7. **删减面 diff 自查**：`git status` 改动面=上述 5 个 M 文件+2 个新增（测试/
   探针）+证据文件（raw/report/out）。无票面外源码文件被改；票面 1.6 零改动
   清单全部未触碰。

## 7. 疑虑（交门一/门二/主控裁量）

1. **locks 红点为结构性预期**：verify 整链 exit=1 的唯一红点=新增受锁路径未
   登记（locks:check 明示「运行 npm run locks:apply 并带 [locked-change]
   提交」）——票面 5.4 将 locks:generate+apply（188→190，两新文件）划归主控
   收口单写；实现者按禁令未触碰 locks/。主控收口补登后 verify 应即全绿。
2. **可选字段的长期含义**：若主控/门一裁定必须必填，需 [locked-change] 授权
   改 8 个受锁测试夹具（超实现者权限）；当前可选形态下，手工构造 TabState 的
   新消费方缺席该字段=常规态（已 JSDoc 声明，消费方 `?? false` 强制兜底）。
3. **真机取证的两个环境性发现**（json/raw 在档，未深究，非本票行为面）：
   ① 标注块中心压点可能落在空文本 span 上（浏览器无法锚定选区——对真实用户
   的影响=从标注块上起选偶尔需要挪动起点到有文字处，属边缘体验而非功能断）；
   ② 保存高亮链后滚动位漂移 2142px（9971→12113，探针测量；源未定位，可能是
   Playwright click 的 scrollIntoView 或保存链内滚动；对断言无影响，已用滚块
   保障手法兜住）。供主控裁量是否另开票。

## 8. 回炉 1（门一 deepseek 裁决 B0/W1/N6 之 W1+N2+N4 处置）

- **W1 编辑器关闭路径补锁**：selection-mode.test.tsx 新增用例 ⑧（常规点击
  rect→菜单→点「添加笔记」→annotation-editor 出现+菜单互斥收起→
  setSelectionMode(true)→editor 消失→切回 false 不自动恢复——S1 编辑器臂，
  票面 5.1 可加不可减）。⑧ 属补锁（行为在首版已实现，直接绿）。
- **M2' 变异红证**：cp 备份→AnnotationLayer 关弹层效应只摘 `setEditing(null)`
  （保留 `setMenu(null)`）→定向跑→**仅 ⑧ 红**（其余 7 绿——精确锁定编辑器臂，
  证明菜单臂未被误伤）→cp 还原 diff 空。证据 `f-a3-mutation-m2p.raw.txt`。
  注：M2' 按主控指令时序在 N2 改造前的 useEffect 版本上执行；变异点（摘
  setEditing 行）与 effect 类型正交，红证等价。
- **N2 效应改 useLayoutEffect**：AnnotationLayer 与 AiAnnotationLayer 的
  「进入选择模式」效应 useEffect→useLayoutEffect（paint 前收起——票面 §4
  「无中间帧」字面成立）；import 行、两层头注（「paint 前收起」措辞）与行内
  注释同步。行为等价（时序提前），8 用例定向绿。
- **N4 用例 ③ 强化**：annRects() 全部 rect 逐一断言 pointerEvents（常规全
  auto/选择全 none），不再只断首个。
- **证据索引（r2）**：定向 8/8 绿；全量 `npm run test`=**114 文件/956 用例
  （955+⑧）全绿 exit=0**（`f-a3-green-r2.raw.txt`）；verify r2 exit=1 唯一
  红点仍=locks 新增路径未登记（主控收口面，勿触 locks——`f-a3-closeout-
  verify-r2.raw.txt`）；剩余链 lint+typecheck+build 全绿 exit=0
  （`f-a3-closeout-rest-r2.raw.txt`）。行数复核：AnnotationLayer 249/
  AiAnnotationLayer 231（250 红线内，注释压缩回 249）。
- **自裁申报（回炉新增）**：无新自裁——三项均在主控指令字面内；N2 行数
  压缩（头注/行内注释措辞压行）为首版同型手段（自裁 4 延续）。
