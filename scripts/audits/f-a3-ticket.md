# F-A3 票面:标注「选择模式」——五层规约+前置态空间表

> 来源:AUDIT0 台账 F-A3 [需求](用户原话「建议新增一个选择模式按钮,选已经
> 好的标注,其余时候标注被选中一部分文字时走正常选中的逻辑」)+F-A2 联动
> (复测实证:mousedown 落在 pointerEvents:auto 的标注块上→浏览器不发起文本
> 选择→selLen=0→无工具条;`audit0-out/f-a2-retest.json`)。修法定向在档
> (v13 交接 §2):**选择模式=标注层 pointer-events 全关(块上发起划选的
> 阻断解除)+模式切换 UI;常规模式=现状(点击=菜单)**。
> LOOP 会话票——**不在 tickets/registry,禁触碰 registry**。中票三屋
> (ADR-0017):实现者 TDD→门一 deepseek→门二。

## 0. 前置态空间表(宪法:store+异步+用户输入——态空间+跨格序列交审计)

### 维度

- 模式态 `M ∈ {常规, 选择}`:载体=`TabState.selectionMode: boolean`
  (false=常规=默认;true=选择)。**per-tab**(zoom/color 同型)。

### 面① 标注层交互(rect 级)

| 动作/属性 | 常规(默认) | 选择 |
| --- | --- | --- |
| 用户标注 rect `pointerEvents` | `auto`(现状) | `none` |
| AI 标注 rect `pointerEvents` | `auto`(现状) | `none` |
| 点击用户标注 rect | `notifyNoteHighlight`+菜单(现状) | 穿透,零副作用 |
| 点击 AI 标注 rect | `setSelectedId`+`onJumpToNote`(现状) | 穿透,零副作用 |
| 拖选起于 rect 上 | 选区不形成(v1 约束,现状=F-A2 机制) | 选区形成→SelectionToolbar(**F-A2 根治**) |
| AnnotationMenu/AnnotationEditor | 可开(现状) | 不可开;已开者**进入选择模式即关闭** |

### 面② 工具条

| 项 | 常规 | 选择 |
| --- | --- | --- |
| ReaderToolbar 模式按钮 | `aria-pressed=false` | `aria-pressed=true`+强调边框 |
| SelectionToolbar(划选条) | 划选成功弹出(现状) | 同——**不消费模式**(正交,零改动) |
| AnnotationMenu/Editor | 见面① | 见面① |

### 面③ store(`TabState.selectionMode` 生命周期)

| 事件 | `selectionMode` 迁移 |
| --- | --- |
| `openPaper`(absent 新建) | `false`(`makeLoadingTab` 默认) |
| `openPaper`(error 重试) | 沿用 prev(`{...prev, status:'loading'}`) |
| `setSelectionMode(m)` | active tab 写入 m;`activeId=null` no-op |
| `closeOne(id)` | 随 tab 删除;重开同 id=全新 tab=`false` |
| `close()`(closeAll) | 整体复位(初始态工厂) |

### 跨格序列(锁定测试+门一审计重点)

- **S1 弹层存活×模式切换**:常规下菜单开(或编辑器开)→切选择→菜单+编辑器
  关闭(死 UI 防线;编辑器草稿丢弃=Escape 同语义);切回常规**不自动恢复**
  (用户重新点击)。
- **S2 划选中×模式切换**:SelectionToolbar 可见时任意切模式→pending 不动、
  保存路径正交(SelectionLayer 不订阅模式,零改动)。
- **S3 per-tab 记忆**:A 选择→activate B(B 各自记忆,新建=false)→回 A
  保持 `true`。
- **S4 AI 选中描边×模式切换**:常规下 `selectedId` 置位→切选择→描边清除
  (`data-highlight` 全 false)+rects 惰性化。
- **S5 busy 在途×模式切换**:保存/删除 api 在途时切模式→编辑器已关,结果
  回调里的 `setEditing(null)/setMenu(null)` 幂等无害(现语义已是收起)。
- **S6 页回收×模式**:模式态在 store;渲染窗页回收/重挂(PageFrame)后 rect
  `pointerEvents` 随当前态渲染,无残留态。

## 1. 行为层

### 1.1 reader.store.ts

- `TabState` 增 `selectionMode: boolean`;`makeLoadingTab` 新建分支默认
  `false`(error 重试分支经 `{...prev}` 自然沿用)。
- `ReaderStore` 增 `setSelectionMode(mode: boolean): void`——`updateActiveTab`
  写入(setColor 同型;`activeId=null` no-op 已由该入口兜底)。
- 头注行为层增补:状态形状+面③迁移表(票面 §0 面③原文入头注)。

### 1.2 AnnotationLayer.tsx

- 自订阅模式:`useReaderStore((s) => s.tabs[s.activeId ?? '']?.selectionMode ?? false)`
  (SelectionLayer color 选择器先例;**props 接口零变**——PagesOverlay 不透传,
  该组件零改动)。
- rect 样式:选择模式下覆盖 `rectStyle` 产物
  `style={selectionMode ? { ...rs, pointerEvents: 'none' } : rs}`
  (`annotation-style.ts` 的 `rectStyle` **零改**——覆盖在消费方,单消费点
  不抽参)。
- 进入选择模式效应:`useEffect(() => { if (selectionMode) { setMenu(null);
  setEditing(null) } }, [selectionMode])`(S1/S5)。
- 头注更新:架构层「v1 约束:矩形上方无法发起文本重选」行改写为条件化
  (常规保持;选择模式解除——F-A2 根治声明+INV-42 指针)。

### 1.3 AiAnnotationLayer.tsx

- 同型自订阅;rect 内联 `pointerEvents: selectionMode ? 'none' : 'auto'`。
- 进入选择模式效应:`if (selectionMode) setSelectedId(null)`(S4)。
- 头注增补一行(模式语义+INV-42 指针)。

### 1.4 ReaderToolbar.tsx

- props 增 `selectionMode: boolean; onToggleSelectionMode(): void`。
- 按钮:位置=标注颜色组之后、搜索占位之前;文案「选择模式」;
  `aria-pressed={selectionMode}`;选中态视觉=边框强调
  (`borderColor: 'var(--accent)'`,颜色点选中态同语言);ghost 变体(btn 类)。
- `title`:常规态「开启后可在标注块上直接划选文字,标注暂不可点击」;选择态
  可同文(单 title)。

### 1.5 ReaderPage.tsx

- 装配:`const selectionMode = tab?.selectionMode ?? false`;ReaderToolbar 传
  `selectionMode`+`onToggleSelectionMode={() => useReaderStore.getState()
  .setSelectionMode(!selectionMode)}`(toggle 语义在装配面;工具栏纯受控)。

### 1.6 明确不做(防顺手实现)

- Escape 退出选择模式/模式快捷键(未请求;SelectionLayer 的 Escape 语义
  不动=只清 pending)。
- 模式持久化到 DB/设置(会话内存态,per-tab)。
- AI 层显隐开关(头注在档预留位,另行)。
- e2e 新用例(机制面由真机探针覆盖,§5;存量 e2e 29 全跑收口)。
- SelectionLayer/SelectionToolbar/AnnotationMenu/AnnotationEditor/
  PagesOverlay/annotation-style.ts **零改动**。

## 2. 接口层

- `TabState.selectionMode: boolean`(新字段);`ReaderStore.setSelectionMode
  (mode: boolean): void`(新动作)。
- `ReaderToolbar` props: `selectionMode: boolean; onToggleSelectionMode(): void`
  (接口层头注同步)。
- 其余组件 props 接口零变(AnnotationLayer/AiAnnotationLayer 经 store 自订阅)。

## 3. 架构层

- 分层不变(renderer 特性内);零新依赖。
- 自订阅 vs props 透传裁决:模式是跨页跨层的视图交互态,层组件自订阅
  (SelectionLayer color 先例)避免 PagesOverlay 九 props 面扩为十 props
  (F-ARCH3 刚收敛的透传面不再扩张)。
- `rectStyle` 零改理由:单消费点的条件覆盖不构成第二职责;抽参=为不存在的
  第二消费方预设接口。
- 行数预算:reader.store.ts 428→约 440;AnnotationLayer 239→约 250;其余
  微增;全部 <500 红线。

## 4. 生命周期层

- 弹层关闭时序:S1/S5 效应在模式翻转的同一提交内收起(React 状态批处理,
  无中间帧可点击已死弹层)。
- S6:层重挂后模式随 store 当前态重渲染,无本地残留。
- INV-42 登记(收口时主控写入 `docs/invariants.md`,受锁流程):
  「选择模式交互不变量:选择模式(TabState.selectionMode=true)下用户标注
  层与 AI 标注层一切渲染 rect `pointer-events:none`(点击穿透零副作用,
  拖选可在 rect 上发起=SelectionLayer 正常链路);常规=false 保持现状
  (点击=菜单/AI 跳转);进入选择模式关闭已开弹层;模式 per-tab,SelectionLayer
  不消费模式」——声明处=reader.store 头注+两 层头注;锚定=selection-mode.test
  +真机探针 f-a3-verify.json。

## 5. 文化层(测试与取证)

### 5.1 新测试文件 `tests/unit/renderer/selection-mode.test.tsx`(always-active,不经 guardedDescribe)

形态 crib `tests/unit/renderer/annotation-layer.test.tsx`(`@vitest-environment
jsdom`+mock api/client+mock Toast+真 store 单例);store 布态用
`useReaderStore.setState({ tabs: {...完整 TabState 夹具}, activeId })` 直植
(免 openPaper 异步链),`afterEach` 以 `setState(createReaderStoreInitialState())`
复位(zustand 浅合并保 actions)。AI 层夹具 crib
`tests/unit/renderer/ai-annotation-layer.test.tsx`(pageRoot+.textLayer 真锚)。

用例(最低集,可加不可减):
- ① `setSelectionMode`:true 写入 active tab;再 false 回;`activeId=null`
  时 no-op(state 不变)。
- ② per-tab S3:两 tab 直植(A=true,B=false)→activate B→B 仍 false→
  activate A→A 仍 true;setSelectionMode 只动 active。
- ③ AnnotationLayer(存量 rects 夹具,pageRoot=null 走 rects 回退渲染):
  常规 rect `style.pointerEvents==='auto'`;直植 selectionMode=true→rect
  `'none'`。
- ④ 常规点击 rect→`[data-testid="annotation-menu"]` 出现+`noteHighlight`
  信号 seq 变;选择模式点击同一 rect→菜单不出现+信号 seq 不变。
- ⑤ S1:常规点击开菜单→`setSelectionMode(true)`→菜单消失;再切回 false→
  菜单不自动恢复。
- ⑥ AiAnnotationLayer(真锚夹具):选择模式 rect `pointerEvents==='none'`;
  常规点击 rect 置 selectedId(`data-highlight` 有 true)→切选择→
  `data-highlight` 全 false(S4)。
- ⑦ ReaderToolbar:渲染反映 `aria-pressed`;点击按钮→
  `onToggleSelectionMode` 恰调一次。

### 5.2 变异红证(逐个临时变异→定向跑红→还原;jsdom 可达性已核——全 DOM/store 级断言,无浏览器特异路径)

- M1 摘 AnnotationLayer 模式订阅(订阅恒 false)→③④⑤红。
- M2 摘 AnnotationLayer 进入选择关弹层效应→⑤红(④只锁点击不开,不锁已开关闭)。
- M3 摘 AiAnnotationLayer 模式订阅(恒 false)→⑥红。
- M4 摘 store `setSelectionMode`(空体)→①②红。
- M5 摘 ReaderToolbar onToggle 接线(onClick 不调回调)→⑦红。
- 还原纪律:未提交实现禁 `git checkout`——cp 备份→变异→测→cp 还原→diff 空。

### 5.3 真机取证 `scripts/audits/f-a3-verify.mjs`( crib f-a2-retest.mjs——真实库副本 freshUserData+Electron launch+真鼠标 CDP)

三场景(产物 `scripts/audits/f-a3-out/f-a3-verify.json`+raw log):
- 场景 A(负向对照):常规模式,起点压在既有标注 rect 上的真鼠标拖选→
  `selLen=0`+无工具条(现状保持,不回归)。
- 场景 B(F-A2 根治):点击「选择模式」按钮→断言 `aria-pressed=true`+全
  `[data-testid="annotation-rect"]` 计算样式 `pointer-events:none`→同点位
  真鼠标拖选→`selLen>0`+`[data-testid="selection-toolbar"]` 出现→点「高亮」
  保存→rect 计数 +1。
- 场景 C(现状不破):切回常规→`pointer-events` 恢复 auto→点击标注→
  `[data-testid="annotation-menu"]` 出现。

### 5.4 收口面

- `npm run verify` 全绿(基线 113 文件 948 用例→加 selection-mode.test 后
  114 文件);新测试文件为受锁路径新增→`npm run locks:generate`+`locks:apply`
  (188→189);e2e 29/29;INV-42+台账翻状态=主控收口单写。

## 6. 证据与报告契约(实现者)

- 首红(全量口径 `npm run test`,新文件用例红)+每变异原始输出各自落盘
  `.raw.txt`(scripts/audits/f-a3-*.raw.txt);verify 真退出码落盘。
- 实现报告全文 `scripts/audits/f-a3-impl.report.md`(摘要/文件清单/红证/
  测试证据/自裁申报含删减面 diff 自查/疑虑);回复五行内。
