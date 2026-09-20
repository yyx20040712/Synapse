# 2026-09-20 阅读器 UI 反馈批·逐项侦察与执行规划（供新会话直接复核并执行）

> 背景：Electron 44 验收场 B 段视检（2026-09-20，用户在场轮）反馈七项——用户总评
> 「总体上非常优秀」。本文档=当会话四路只读侦察（子代理 A 笔记/面板、B 顶栏/配色、
> C 工具栏/图标、D 选区链路）的根因落位+票拆分规划，**未做任何实现**。
> 复核入口：新会话逐项核对「根因复核点」后再按 §3 执行序立案施工。
> 证据基准：HEAD=50688c969ac（增补十五）；六张截图取证存档
> E:/zcode_md/synapse-archive/scripts-audits/（ele03-visual 反馈件）。

## 0. 架构约束与防连锁面（执行前置必读——「牵一发动全身」的防线）

**权威单源指针**：docs/architecture.md（分层/实体/ADR 索引）+ AGENTS.md 硬规则 +
docs/invariants.md（跨模块不变量册——改行为前查 INV）。本节只列本批直接相关的
防连锁事实，不复述全架构。

**三支柱速览**（本批每票都踩）：
1. **分层单向+token 单源**：app 壳（App.tsx+theme-shell.css）→ features
   （reader/library/…）→ shared/ui（通用件，无 feature 依赖）→ theme token
   （theme.css :root+分域 css：theme-shell/-reader/-buttons/-lineage/library.css）。
   CSS 非定义行禁颜色字面量（check-quality C-4）、var 必须有 :root 定义（C-4c）、
   tsx 禁内联色（eslint B-5）——**一切换色/新色必须走 token，禁裸值**。
2. **测试=锁定合约**：tests/** sha256 锁（locks/manifest 244 条）——任何断言改动
   走 unlock→改→apply [locked-change] 单链；test-surface 指纹门基线
   183·1768·5368·skip14，收紧/新增须豁免登记或基线重冻结。
3. **z 序封闭**：阅读器页盒四层 z 封闭（page-layer-z.ts:20-29）+ 全局面板 z 表
   （--z-anchor-pop 20/Dialog 50 等）——新增浮层控件先对表。

**每票爆炸半径表**：

| 票 | 触碰面 | 禁触面（红线） | 连锁敏感点 |
| --- | --- | --- | --- |
| F-UI-01 | theme.css(+1 token)/theme-shell.css(2 选择器+bg)/library.css 或 LibraryPage.tsx | **--panel/--bg 值禁改**（全域消费：卡片/弹层/页盒+e2e reader-text:641/:646 值锁+全域视觉漂移）；header 高度 56 禁动（smoke.spec:155）；theme-shell.css 的 -webkit-app-region 字样计数锁（window-control.test:185-193） | 新 token 须 theme.test TOKENS 正锚同笔；.lib-detail-aside/.lib-card 渐变与新底的视觉平衡（决策 D2） |
| F-UI-03 | App.tsx/SplitPane.tsx/theme-shell.css（nav 窄态类） | SplitPane 既有 reader-outline 消费契约（11 用例锁）——**扩展必须向后兼容**（新 prop 缺省=旧行为零漂移）；app-shell.test 品牌行负锚（:157-161） | split-pane.test 新形态用例 TDD 先行；持久化键 paneId=app-nav 勿与 reader-outline 冲突；深色底上手柄可见性 |
| F-UI-02 | ReaderToolbar.tsx/OutlineAside.tsx/theme-reader.css | 既有 aria-pressed+borderColor 断言**不得删**（叠加式强化，double-page:426-437/selection-mode:306-323）；颜色点组不动 | sr-only 手法保 textContent 断言（App.tsx:33 先例）；图标=内联 SVG 常量禁新依赖；--accent 族复用勿造新色 |
| F-RDR-02 | AnnotationEditor.tsx（isComposing 守卫） | 值栈状态机 use-annotation-draft 16 用例锁面不动 | 守卫须过既有 IME 用例（annotation-editor-ux:115-378）；再聚焦策略涉交互语义（决策 D6） |
| F-RDR-01 | selection 家族 5-6 文件 | **text-layer.css 禁改**（官方 pdf_viewer.css 逐字提取面，头注 :2-10）；**C3 200ms 值禁轻动**（受锁逐字 199/200ms，改动=行为语义变化须显式裁决）；::selection transparent 勿动（F-A4 自绘层根基） | 快慢等价断言（selection-evaluate:152）+marker 边界新夹具=指纹门收紧面（豁免/基线纪律）；设计先行走三段通道（拟定→审核→终裁） |

**跨票连锁敏感清单**：--accent #2c5f8a 族消费点散布（focus/active 态语言多文件——
新图标 active 态复用 token）；`reader-aside` testid 消费方跨 3 个 e2e spec
（reader-text/ai-notes-section/lineage）；localStorage 键前缀 `synapse:splitpane:*`；
R2-SH2/R3-TH1 的顶栏与墨青侧栏为既定设计案（本批在其上修补，不推翻）。

## 1. 问题总表

| # | 现象（用户口径） | 根因落位 | 类型 | 建议票 | 优先级 |
| --- | --- | --- | --- | --- | --- |
| P1 | 笔记编辑器曾「无法输入笔记内容」（**复测已好，疑似偶发**） | 三候选路径排序见 §2.1 | 疑似缺陷 | F-RDR-02 | 中（先复现审计） |
| P2 | **最左侧应用导航栏（墨青蓝侧栏）**边界可拖宽+增加收起图标（用户更正 2026-09-20：既有可拖宽的阅读器笔记栏不在此列） | `.app-nav` 宽度固定 184px 无调节机制；「蓝」=墨青渐变侧栏本体 | 增强 | F-UI-03 | 高 |
| P3 | 上边栏文字下移一段居中 | 无 line-height→继承 preflight 1.5，墨迹重心偏上 | 缺陷（视觉） | F-UI-01 | 高（一行级修法） |
| P4 | 上边栏背景白+文献栏背景白→改图四冷雾灰（≈#F0F2F5） | 现值 --panel #ffffff/--bg #f6f4ee；**无既有近似 token，需新增** | 增强 | F-UI-01 | 高 |
| P5 | 工具栏文字→简笔画图标+悬停汉语；选择模式常亮；单页双页图标变化反馈 | 9 文字控件；active 态已有但弱（aria-pressed+边框） | 增强 | F-UI-02 | 高 |
| P6 | 侧栏标签页文字→图标 | TAB_LABELS 三文字 tab | 增强 | F-UI-02 | 高 |
| P7 | 空白区/行末下拖选区「先选下→约半秒回正」一跳一跳 | **双路几何分叉**（快路径豁免归一化 vs settle 200ms 归一化覆盖）+mouseup 写回双跳 | 缺陷（交互） | F-RDR-01 | 中高（设计先行） |

## 2. 逐项详情（根因/方案/涉及面/验证）

### 2.1 P1 笔记编辑器偶发无法输入（F-RDR-02）

**链路**：AnnotationEditor.tsx（弹窗，撤销:95/重做:98/保存:118/删除:127/取消:136）+
use-annotation-draft.ts（值栈状态机）+AnnotationPopups.tsx（busy 接线）。

**已排除路径**（侦察实证）：busy 不锁 textarea（仅三按钮 disabled）；无受控回写竞态
（draft 本地 state，父级不回写）；无遮挡层（z 封闭核对）；侧栏笔记 tab 路径无此面。

**候选根因（按可能性排序）**：
1. **焦点丢失→全局快捷键吞键**：焦点一旦离开 textarea，方向键/空格被
   ReaderShortcuts.ts:97-104 preventDefault 消费成滚动、ctrl+z 触发全局撤销——
   表象=「打字没反应」。autofocus 仅挂载时一次（AnnotationEditor.tsx:33-35），
   无再聚焦机制。**〔2026-09-20 用户症状更正：「连输入光标都点不上」——与
   本假设不吻合（若焦点被抢，点击输入框即可恢复光标）；更指向点击被拦截层
   接走/弹层定位或挂载态异常。复现审计票升级：事件层取证（点击时
   event.target 实际落点）入复现场景清单。〕**
2. **IME 键穿越**：onKeyDown（:63-83）未查 `e.nativeEvent.isComposing`——组词期
   Escape/ctrl+z 类按键会关弹层/打断组词（偶发性质吻合）。
3. **弹层定位溢出**：left 上限 55%+top calc（:43-44）——标注靠页底时弹层可能在
   视口内不可见处（体感「无法输入」实为看不见）。
4. **（新增候选，随症状更正）点击拦截**：某透明层瞬时接走了 textarea 上的
   pointer 事件（侦察静态排除常驻遮挡，但瞬时态——如选择模式切换瞬间的
   useLayoutEffect 竞态/Toast 重排——需运行时取证）。

**方案**：①确定性小修=onKeyDown 补 `isComposing` 守卫（几行，随 F-UI 批顺带或
独立微票）；②复现审计=新会话按三候选场景各复现（点页面后打字/中文输入法组词期
按 Esc/页底标注开编辑器），复现命中才立项深修；③再聚焦策略（失焦后点击弹窗区
重新 focus）=视觉/交互决策点，**归用户裁**。

**涉及面**：AnnotationEditor.tsx（+受锁测试 annotation-editor-ux.test 16 用例、
annotation-popups-autosave 4、e2e reader-text.spec:176-216 真机打字面）。

### 2.2 P2 最左侧应用导航栏边界可调+收起图标（F-UI-03）【2026-09-20 用户更正确正对象】

**对象更正**：用户澄清「已有的侧栏拓宽是笔记栏（阅读器内 OutlineAside，SplitPane
已支持），我说的是**最左侧蓝色侧栏**」——即应用级左侧导航栏。侦察初版误判为
OutlineAside/focus 圈，作废；下为更正后落位。

**现状**：`App.tsx:177` `<nav className="app-nav">`（nav 项=图标+文案的视图切换
文献库/阅读器/脉络/设置 + 尾行「本地学术文献管理」）；`theme-shell.css:131-139`
**`width: 184px` 固定**、flex:none、无任何调节/收起机制；「蓝色」真相=**墨青渐变
侧栏本体**（`background: linear-gradient(180deg, var(--ink), var(--ink-deep))`，
R3-TH1 墨青侧栏——App.tsx:175 注释在档），边界即其右缘与浅色内容区的接缝。

**方案（复用+扩展 shared/ui/SplitPane）**：
1. App.tsx 将 `<nav className="app-nav">` 包入
   `<SplitPane paneId="app-nav" side="left" defaultWidth={184} min={?} max={?}>`
   ——拖拽/键盘/持久化三件免费获得（SplitPane.tsx:100-153，通用件无 feature 依赖）；
2. **SplitPane 扩展（本票主要工作量）**：现 collapsible 折叠语义不适配导航场景
   ——需增加「窄条折叠」形态（如 `collapsedWidth` prop：折叠到仅图标宽度而非 0）；
   窄态下 nav 项文案与尾行 `app-nav-txt` 的显隐（CSS 类切换）；
3. **收起图标**：nav 头部/手柄上的折叠-展开切换按钮（双向）；
4. 手柄视觉在深色墨青底上的适配（现有金渐隐线应可直用，focus 样式 token 化）。

**决策点（呈用户）**：①折叠形态=图标窄条（推荐——导航常驻可达）vs 完全隐藏+
边缘浮出把手；②min/max 宽度档位（建议 min=折叠宽 ~64/max=280）；③窄态下尾行
文案处置（隐藏 vs 悬停展开）。

**涉及面**：App.tsx/SplitPane.tsx/theme-shell.css（nav 窄态类）；受锁：
split-pane.test（11 用例+新形态用例）、app-shell.test（:126-128 按可访问名查询
navButton+active 类——包层不破；:157-161 品牌行负锚不动）、theme.test（CSS 材质
包含式断言——追加规则安全）；e2e 侧 nav 入口若按结构选择器需复核（smoke.spec
:108 Synapse 可见等按名断言为主）。
（旁注：阅读器笔记栏 OutlineAside 的既有拖宽+持久化维持现状，不属本票。）

### 2.3 P3 顶栏文字垂直居中（F-UI-01）

**根因**：`.app-header-name`（theme-shell.css:33-38）与 `.app-nav-ver`（:216-223）
均无 line-height → 继承 Tailwind preflight `line-height:1.5`；flex align-items:center
只居中行盒，行盒内基线按 ascent>descent 放置且「Synapse/v0.1」无降部字形→墨迹
重心高于几何中心。**史实**：上轮「下移」诉求是用增高 44→56px 应付的
（theme-shell.css:11-12 注释），对齐本身从未修正。

**方案**：两选择器补 `line-height:1`（必要时 1px 级 translateY 微调，视觉验收定）。
**红线**：header 高度 56px 勿动（e2e smoke.spec:155 高度锁）；纯 CSS 改动零受锁红。

### 2.4 P4 顶栏+文献栏背景改冷雾灰（F-UI-01，与 P3 同票）

**现状**：顶栏 bg=`var(--panel)`=#ffffff（theme-shell.css:24）；文献主区无自有背景、
透传 body `--bg`=#f6f4ee（暖纸白，theme.css:22,173）。目标灰（图四视觉取样）
≈**#F0F2F5 冷雾灰**——全仓无既有近似 token（最近 --accent-soft #dcebf5 偏蓝过饱和）
→**新增 token**（建议名 `--surface-cool: #f0f2f5`）。

**方案（走新 token，禁改既有值）**：
1. theme.css :root 新增 token + theme.test.ts TOKENS 补正锚（受锁件单链）；
2. theme-shell.css `.app-header` background 改 `var(--surface-cool)`——**勿增删
   `-webkit-app-region` 字样**（window-control.test:185-193 纯文本计数锁）；
3. 文献主区挂法=**决策点**：(a) LibraryPage.tsx:69 根容器加背景（局部，阅读器外围
   不变——推荐）；(b) App.tsx:192 main 挂（连带阅读器外围变灰——视觉决策归用户）。

**红旗（误走即红）**：改 --panel 值→theme.test:55+reader-text.spec:641+全域漂移；
改 --bg 值→theme.test:54+reader-text.spec:646；CSS 裸 hex（非定义行）→check-quality
C-4；var 未定义→C-4c；tsx 内联色→eslint B-5。

**决策点**：右侧详情栏 .lib-detail-aside（现纯白）与 .lib-card 渐变是否随新底调整
——视觉决策，呈用户。

### 2.5 P5+P6 工具栏与标签页图标化+反馈强化（F-UI-02）

**现状**：ReaderToolbar.tsx 9 个文字控件（上一页:105/下一页:127/− :139/＋ :149/
100% :156/适应宽度:163/双页:175/颜色点组:187/选择模式:207）；OutlineAside
TAB_LABELS 目录/缩略图/笔记（:54）。选择模式与双页**已有** aria-pressed+accent
边框（:210-212/:178-180）——用户要的「常亮/图标变化」=在其上**叠加**更强反馈。

**图标实现路径（零新增依赖 ✓ 无 icon 库）**：
- 仿 `App.tsx:35-59 NAV_ICONS`——viewBox 24×24 内联 SVG 常量表（既有先例，头注
  明示 aria-hidden 不污染可访问名断言）；
- 双页/单页图标切换仿 `TitleBarControls.tsx:39-59,106`（`{isMax ? A : B}` 三元+
  aria-label 随态换名）；
- tooltip=原生 `title`（仓库既有惯例：ReaderToolbar:167,179,211、TabBar:135）；
- CSS 单源仿 `.titlebar-btn svg`（theme-shell.css:101-108：stroke currentColor/
  fill none/统一线宽）新建工具栏 svg 类入 theme-reader.css。

**测试兼容关键手法（零受锁改造路径）**：按钮内保留 **sr-only 视觉隐藏文本**——
reader-double-page.test:412-416（textContent 精确匹配 findBtn）、selection-mode.test
:302-304、outline-aside.test:95-96（标签数组断言）与 e2e getByRole name 双兼容
（App.tsx:33 手法先例）。
**保活红线**：双页/选择模式既有 aria-pressed+borderColor 断言（double-page:426-437/
selection-mode:306-323）**不得删**——图标+填充态叠加其上。
**反馈强化**：选择模式激活=bg `--accent-soft` 填充常亮（叠边框）；双页=图标随
pageLayout 三元切换。颜色点组不动（已是图形）。

**涉及面**：ReaderToolbar.tsx/OutlineAside.tsx/theme-reader.css（+可能 ReaderPageView
传 collapsible 时并 F-UI-03）；受锁改造仅当放弃 sr-only 手法时（3 单测文件 ~10
断言块 unlock→改→apply）。

### 2.6 P7 选区空白区下拖「先选下→半秒回正」（F-RDR-01，设计先行）

**根因（侦察结论，按证据强度）**：
- **H1 双路几何分叉**：拖选期视觉走 rAF 快路径，用**原始原生选区边界**直取项几何
  （selection-evaluate.ts:195-196），**设计上豁免**空白归一化（anchor-blank-snap.ts
  :42-44 明文「快路径不经本模块…mouseup/settle 全量同帧覆盖吸收」）；空白区起笔的
  边界被 Chromium 解析进 pdf.js 文本层空白标记槽位（纯空白 span 真实字形盒+EOL
  br 槽位，DOM 序≠视觉序——F-A10 真机实证在档）→拖选全程自绘层画「下面的内容」；
  停顿 200ms（settle 防抖，SELECTION_DEBOUNCE_MS，受锁 C3 逐字锁 199ms/200ms）或
  mouseup 时 selectionToAnchor→snapBlankBoundary（anchor-serialize.ts:201-202）归一化
  →覆盖回正确。
- **H2 mouseup 双跳**：下拖释放点常在末行下方→focus-affinity `setBaseAndExtent` 写回
  （SelectionLayer.tsx:156）→异步 selectionchange 再进快路径以**原始边界**弹错→
  排队 settle 到期归一化回正。时间线=松手→弹错→200ms+rAF+感知≈「半秒」回正。
- H3（部分形态）anchor 侧进真实文本 span 时 snap/affinity 均不修（接口只管 focus 侧）
  ——错态 quote 落库风险子集。
- 已排除：原生 ::selection 并存（transparent，F-A4）；G2 降级门（形态不符+用户未报
  toast）；page-items 缺失回退（方向相反）。

**修复方向（新会话设计决策，二选一或组合）**：
- **方案 A**：快路径 visual 增加轻量 marker 探测（复用 markerAt/isBlankMarker，
  anchor-blank-snap.ts:83-122）——起/终点落空白标记槽位时即时归一化（不等 settle），
  消除两态分叉；注意快路径性能预算（rAF 帧内）与「快慢等价」受锁断言
  （selection-evaluate.test:152 只测非标记夹具——marker 夹具新增预期红=合理收紧，
  走 test-surface 豁免/基线纪律）。
- **方案 B**：mouseup affinity 写回后**短路下一轮 visual**（写回即置「归一化边界
  缓存」，selectionchange 到来时直取 full 产物）——消 H2 双跳；不动快路径。
- 参考件：官方 viewer 的 endOfContent 机制（text-layer.css:103-116 现为死代码未接线）
  ——「拖出文本区底部」的官方补救思路可借鉴。

**双路缘起注（2026-09-20 用户问「为什么会出现两条渲染路线」——汇报落档）**：
selectionchange 在拖选中是高频事件（每帧级），若每次都跑全量语义管线（DOM 槽位
探测归一化+锚定序列化+跨页 items 对账+G2 健康门），拖选会掉帧不跟手——故设计上
把「视觉反馈」与「语义定稿」拆为两路：**快路径**（rAF ≤16ms，原始边界直取高亮
几何，只求跟手）与**慢路径**（settle 200ms 防抖/mouseup 同步，跑完整管线产出
保存用锚定与工具条）。快慢分工是乐观渲染+权威收敛的常见形态，且有受锁「快慢
等价」断言（selection-evaluate.test:152）保证两路同产出。**缺陷正在等价性断言的
夹具盲区**：空白标记槽位（DOM 序≠视觉序）恰好是两路设计上不同步的输入——快路径
明确豁免归一化（anchor-blank-snap.ts:42-44 头注明文），设计假设「瞬态错一下没关系，
松手/停顿后全量吸收」；成本考量是归一化需 DOM 查询不宜入帧。用户实测证明该边缘
case（INV-58 在档「已知边界」）感知代价高，故立票。

**涉及面（重受锁）**：SelectionLayer.tsx/selection-geometry.ts/selection-evaluate.ts/
anchor-serialize.ts/anchor-blank-snap.ts/release-affinity.ts + selection-* 家族受锁测试
（selection-geometry 4/selection-layer 12/fa12 3/release-affinity 14/anchor-blank-snap
16/selection-evaluate 4/selection-item-chain 6/selection-paint ~17 + e2e reader-text 2）
——预计需要新夹具与断言更新，[locked-change] 单链+指纹门基线管理。
**红线**：C3 的 200ms 值改动=行为语义变化须显式裁决；text-layer.css 为官方
pdf_viewer.css 逐字提取面（头注 :2-10）——**禁改**，补救走自绘层/JS 层。

## 3. 票拆分与执行序（建议）

| 序 | 票 | 面 | 量级 | 前置 |
| --- | --- | --- | --- | --- |
| 1 | F-UI-01 顶栏居中+背景灰（P3+P4） | 纯 CSS+1 新 token+2 处消费 | 小 | 决策点 2（文献栏挂法/详情栏连带）呈用户 |
| 2 | F-UI-03 应用导航栏可调宽+窄条折叠+收起图标（P2，**对象经用户更正=.app-nav**） | 3 文件+SplitPane 扩展 | 中 | 决策点 3（折叠形态/宽度档/尾行处置）呈用户 |
| 3 | F-UI-02 工具栏+标签页图标化+反馈强化（P5+P6） | 2-3 文件 | 中 | sr-only 手法（零测试改造路径） |
| 4 | F-RDR-02 笔记输入三场景复现审计+isComposing 确定性小修（P1） | 1 文件+审计 | 小 | 复现结论决定深修立项否 |
| 5 | F-RDR-01 选区闪烁修复（P7） | 5-6 文件+重受锁测试面 | 中大 | 设计决策（方案 A/B/组合）先行，建议 Kimi 拟定→deepseek 审核→主控终裁路线 |

执行纪律照宪：三屋（实现者→门一 k2→门二）、受锁单链 [locked-change]、每票
verify EXIT=0 基线（167/1724/locks 244/指纹门 183·1768·5368·skip14/open 1）、
视觉决策（灰值/图标风格/详情栏连带）零承担归用户在场轮。

## 4. 复核清单（新会话首动作）

1. 本文档根因逐项抽核（每项「文件:行」至少验一处）——侦察为只读子代理产物，
   承诺态非落地态；
2. P2 对象已更正为应用级 `.app-nav`（墨青侧栏本体=蓝；184px 固定无机制）——复核
   落位：App.tsx:177/theme-shell.css:131-139，并核 SplitPane 折叠语义扩展设计稿
   （窄条形态为新增能力，split-pane.test 新用例先行）；
3. P1 四场景复现（焦点丢失打字/IME 组词期 Esc/页底标注弹层可见性/**点击不上
   光标时的事件层取证——console 记录 event.target 实际落点**）；
4. P7 现象复现录证（空白区下拖时序，验 H1/H2 时间线）；
5. 六图截图与本文档现象描述一致性核对（图档仓外 ele03-visual*）；
6. §5 决策记录八项视为已裁——直接执行，不再重启决策（除实施默认值 D4 验收微调）。

## 5. 决策记录（2026-09-20 用户在场轮八项已裁——执行会话零决策负债）

| # | 决策点 | 用户裁决 | 执行要点 |
| --- | --- | --- | --- |
| D1 | 文献栏冷雾灰挂法 | **全局挂 main**（App.tsx:192） | 所有视图外围（含阅读器画布外围）统一冷雾灰；--bg token 值不动（body 值锁 e2e:646 保绿），灰走新 token 挂 main 层 |
| D2 | 右侧详情栏连带 | **保持纯白**（--panel 不动） | 与新灰底形成层次对比 |
| D3 | 导航栏收起形态 | **图标窄条**（collapsedWidth ≈64px） | SplitPane 扩展窄条折叠模式，收起后图标常驻可切视图 |
| D4 | 宽度档位 | （随 D3 隐含）折叠宽 ≈64 / 拖拽 max 280 | 实施默认值，验收轮可微调 |
| D5 | 窄条态尾行文案 | **隐藏** | 「本地学术文献管理」窄态不显示 |
| D6 | 笔记弹窗失焦恢复 | 症状更正后**仍按推荐**（点击弹层任意处重聚焦） | 「连光标都点不上」≠焦点被抢（更正记录见 §2.1）；重聚焦为无害缓解，复现审计票升级+事件层取证入场景 |
| D7 | 图标风格 | **沿用既有**（24×24 单色描边简笔画） | NAV_ICONS/TitleBarControls 同源，stroke=currentColor |
| D8 | 选区修复路线 | **三段设计链**（Kimi 拟定→deepseek 审核→主控终裁→三屋实施） | 双路成因汇报已落 §2.6 缘起注 |
