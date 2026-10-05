# F-UIRES-03 设计稿：视检反馈 R2 修正批（B 静态 UI+C 画布交互）——主控终裁修订版 v1.0

> 链路：用户视检 R2 反馈（五图 17 项）→R2 增补档 §9（docs/prompts/
> 2026-10-04_visual-feedback-r1-analysis.md §9.1-9.4——用户两轮裁决全录，
> 本稿引证不重复）→ops-drafter 拟稿→ops-auditor 对抗审核（**返工级 B1+W10
> +N10**）→主控核包外事实四项+终裁修订（本稿）。审核发现全数吸收，处置
> 留痕见各单元〔审核 Fx/Nx 对应〕。

## §0 事实核正（主控亲测，覆盖拟稿相应表述）

1. **F7 核正**：DragCandidates（drag-slot-candidates.tsx）=**源月框内月内
   调序候选槽 UI（保留面）**——头注「拖动中源月框内每插入空位一槽」实证。
   退役面=**跨月 drop 判定+onMoveNodeMonth 路径**（useCardDrag:64/:179+
   store/IPC/undo 条目），非候选槽组件。
2. **F5 核正**：default 库 lineage_edges.color 分布=#3a5bd9×1 全规范形
   （#rrggbb）零变体——迁移 WHERE 直接命中；ws-* 测试课题无 color 列
   （旧 schema 不受影响）。
3. **F6 核正**：标签色域单源=TAG_COLOR_PRESETS（shared/constants.ts:42，
   8 色+null 默认态 TAG_COLOR_NONE_DISPLAY）；default 库存量标签色
   （null/#0ea5e9/#a855f7/#eab308）全在 8 色域内。**标签色板与线型 6 色
   板是两套**——B1 行内点阵=TAG_COLOR_PRESETS+「恢复默认」（null 语义，
   承接原 TagColorPopover 行为），禁用线型色板。
4. **F11 核正**：notes.store 既有防线族在基线（防抖窗口内切走切回/补存
   失败后再 load/保存进行中再编辑等七用例——A2 批交付）；B3 状态机
   引用既有 INV-04 语义，只补 saving×输入格。

## §1 单元划分与实施序（承拟稿，迁移挂靠修正）

B1 标签下拉七条→B4 杂项静态（# 换点/年月行/侧栏）→B2 详情面板+AI 改名
→B3 阅读器保存按钮→C3 拖拽域重构→C1 线型链+换色（**迁移 015 挂本单元**）
→C2 锚点+吸附。B1-B4 与 C 线可并行（文件级划界：B4 的 #/年月改写若触
e2e 同文件与 C 冲突，以 B4 先行冻结字面量、C2 障碍几何在 B4 后校准——
审核 N5）。

## §2 各单元票面（修订面全标）

### B1 标签下拉七条
- header=[全选框+「全选」（半选态=勾选数 0<n）]……[「删除」danger 钮
  （零勾选禁用）]；列表 max-height:320px+overflow-y:auto；底部说明行删；
  「已选 N」删〔A5/A7 落地补齐——审核 N1〕。
- 行常态=左椭圆 chip（TAG_COLOR_PRESETS 色底 18% 透明+同色深阶文字，
  **色源=标签自身 color（null=TAG_COLOR_NONE_DISPLAY 默认灰）**）+右
  「编辑」文字钮；行内勾选框=chip 左前（A2 前提）。
- 行编辑态：名称 input 预填+色点阵（TAG_COLOR_PRESETS 8 圆点+「默认」
  点=null——原 TagColorPopover「恢复默认」行为承接〔F6+N10 处置〕）+
  「保存」钮（dirty 启用）+Esc 取消还原；无 autosave；重名/空名校验
  承接原 TagRenameDialog 规则（实现时从被删件抄录规则勿静默丢〔N10〕）。
- 删除链：确认窗列名→IPC 删 tags 实体（paper_tags 级联）→下拉+行内 chip
  刷新。
- 退役面：TagRowMenu/TagRenameDialog/TagColorDialog/TagColorPopover 四件
  +四件单测（豁免登记 reason=本票 rulingLink=本稿）；孤儿子核对入 DoD
  （shared 类型/preload 面/样式 barrel〔N6〕）。
- 测试：新增单测=编辑态 dirty 启用/Esc 还原/确认窗清单/全选半选/色点阵
  含默认点；先红后绿+always-active〔N8〕。

### B2 详情面板+AI 评估与建议
- 三节新序（全文笔记→片段笔记→AI 评估与建议）+三空态文案+加载占位；
  片段双击跳阅读器（唯一保留双击链）；阅读器左栏 AI 区整删不留占位。
- **消费面盘点入 DoD**（含 e2e「AI 笔记」字面量/aria/空态文案全 grep
  清单——审核 N3）：显示面唯一=脉络详情面板节。
- 数据零迁移（ai_notes 留库直读——INV-101 域不变）。
- 测试：三节顺序/三空态/节名「AI 评估与建议」/双击跳转 e2e 改写保留。

### B3 阅读器保存按钮（状态机补格=F1 终裁方案）
- 四态钮（dirty=主色「保存」可点/saving=禁 spinner/clean=灰暗「已保存」
  /error=红描边「重试」可点）；点击=清防抖+立即落盘。
- **状态机（F1 闭合+delta-W1/W2 补）**：clean+输入→dirty（启防抖 T）；
  dirty+T 到或点击→saving（点击先清 T）；**saving+输入→saving∧pending
  （新输入暂存编辑缓冲，不覆盖在途保存载荷）**；saving+成功→若 pending
  存在：编辑态=pending 合并态转 dirty（启新防抖 T）**且 pending 清除
  （消费时点一）**；否则 clean；saving+失败→error∧pending 保持；
  error+输入→dirty∧清 pending；error+点击→saving（**载荷=pending 合并
  态且 pending 清除——消费时点二**）。
  **卸载面机制句（delta-W2b 必闭合）**：切换文献/关闭面板/组件卸载/
  应用退出时——pending∧saving 在途→等待在途完成后以 pending 合并态
  立即落盘（复刻既有补存语义）；pending∧error→卸载前以 pending 合并态
  立即重试落盘一次；两路径均无落盘通道即实现期阻断级缺陷。**新增序列
  用例**（pending 维×切走切回/关面板/退出三族）进 B3 票面（受锁豁免
  登记——delta-W2a 构造性覆盖：既有七用例写于 pending 维之前，构造上
  不含新维序列，不得以「只跑既有例」替代）。
- StatusBar 全局「已保存」：**主控自裁保留不动**（与阅读器钮语义分层：
  全局指示 vs 主动作钮；如欲退役另立票——审核⑥）。

### B4 杂项静态
- #→·（U+00B7）：LineageSidePanel:128/PaperDetailPanel:135+全消费面
  grep 盘点（src+tests 字面量清单随票附——e2e 断言同步改写）。
- YEAR-MO（PaperDetailPanel:60-70）：有月=`YYYY-MM` 补零；month null=
  仅 `YYYY`；无脉络命中=年份单值（同现状）。测试=三分支单测〔N8〕。
- 侧栏：右缘 4px resizer（col-resize，clamp 200-480px，localStorage
  `synapse.sidebar.width`）+头部收起钮→**48px 图标窄条（主控自裁=拟稿
  候选甲）**，点窄条任意处展开；折叠态 `synapse.sidebar.collapsed`。
  e2e=clamp 两界+刷新持久恢复。

### C3 拖拽域重构（v1.3 票面修正——跨月语义考古后重写；F7+三轮澄清）
- **跨月语义史实（2026-10-05 考古定稿）**：拖拽跨月**从来不是活路径**
  ——初代 T3-P8 即「跨月拒绝落当前槽」、②U6「限本月回弹 no-op」
  （INV-98 限本月物理域）；改月一直走月标点击弹层（MonthPop→
  moveNodeMonth）。lnfix2（61a8771cf72，2026-10-03）已按用户裁决清掉
  跨月联动死码（frameAt/frameContains+framesRef 注册链，全仓 grep 零
  残留亲验）。**v1.2「跨月 drop 判定退役」系虚构票面（该路径不存在）
  ——本版作废修正**。
- **退役**：月标点击改月整链（handleYmClick+MonthPop/useMonthPop+
  pickMonth+onMoveNodeMonth 回调+store moveNodeMonth+其 IPC 通道+undo
  栈条目+movePreview/applyMovePreview 预演+moveTargetLabel 文案）——
  裁决①「改月全域退役唯一入口=MetaEditDialog」的正身；drag-hint 首段
  删（新文案「拖动＝月内调序 · 画线＝点两卡连边」）；**限本月回弹/
  跨月拒绝判定（overSourceFrame/PULL_BAND_PX 域+INV-98）随改月退役
  评估清理**（若判定仅防拖出框，保留为纯回弹护栏不动亦可——实施时
  核消费面后定，呈报主控）；跨月/月标相关 e2e/单测族（A3 T3
  moveTargetLabel 用例等——豁免登记）。
- **保留+修复**：DragCandidates 月内候选槽+月内 slot 调序+
  reorderMonthSlots 写链+其 undo+同框下拉扩展（stretch，lnfix2 交付）。
  **图四两症=月内候选槽显示缺陷（用户三轮澄清定稿：「候选槽指示
  从头到尾都是希望一个月份框内部显示候选阵列位置，与跨月没有任何
  关系」——v1.1「随跨月消亡不修而删」判断作废）**：
  - 症一「拖动时月框内插入位候选阵列不显示」——DragCandidates 渲染
    链调查（active 门控条件/frameKey 查询命中/其余卡 rect 派生/
    insertIdx 传递），修复=拖动相位全程候选阵列可见（faded 0.35
    态——头注设计本义）；
  - 症二「只能放到已有的第一个（插入位）上」——insertIdx 更新链
    调查（pointermove 重算断链/insertIndexFromRects 几何失效致恒 0），
    修复=全部插入位可达；
  - e2e 断言=拖起后候选槽 DOM 计数与几何可见性+逐插入位 settle 落
    序断言（DoD 附测量口径）。
  - **DoD 附核对清单（delta-N1）：保留面引用 grep 被删符号全零命中**
    ——moveNodeMonth 三链路（回调/store action/IPC 通道）调用点逐一
    核对月内提交路径（reorderMonthSlots）确不经被删链；undo 栈=内存
    会话态（实现时核——若跨会话持久化另立兼容面呈报）。
- 漂移修复=**甲案（主控自裁）**：dragstart 记录「指针−卡角」偏移，
  ghost 全程画布坐标系定位（根除 fixed/zoom 换算链——INV-96 族）。
  e2e=zoom 0.8/1.0/1.5 三档 |ghost 角−（指针−偏移）|≤1px（测量口径=
  devicePixelRatio 取整后 boundingRect 差，容差依据随票注〔N7〕）。

### C1 线型交互链+色板换色（F2/F3/F4 状态机重定义+迁移挂靠）
- 每线型 kind（solid/dashed）=图标钮（描边=该 kind 当前色）+右独立
  「展开」chevron 钮（aria-expanded+aria-label「展开色板」）。
- **状态机（三维正交）**：mode∈{select,draw-solid,draw-dashed}；
  paletteFor∈{null,solid,dashed}（**kind 归属维——F2 补**）；anchor∈
  {none,picked(nodeId)}。
  迁移全表：
  - select+点 solid/dashed 图标→draw-X（**paletteFor 归 null——切模式即
    收板，delta-W5：防「虚线模式开实线色板」错位态；色板渲染归属=
    paletteFor 指向 kind 的锚槽，错位态根除**）；
  - **draw-X+点另一 kind 图标→draw-Y 且 paletteFor 归 null（delta-W5）**；
  - draw-X+再点同图标=**无操作（用户裁决「两击退出取消」——非双击
    退出，口径注明〔N9〕）**；
  - 任意 mode+点 kind K 展开钮→paletteFor=K（toggle：再点同钮→null）；
  - paletteFor=K+点色行→paletteFor=null+写 currentLineColor[K]+自动
    收起；**在途取色 latch 时点=commit 读（delta-W4 定稿）：建边公式
    color=currentLineColor[X] 以提交时当前值为准——「预置下一根边色」
    语义=在途未落连线跟随当前色，已落边（已入库）色不可变；原「不改
    在途连线」表述废止**；
  - **点外部→paletteFor=null 且该次点击不吞（事件正常路由——点卡=锚选
    /点空白=平移，关板为伴随效果；范围=色板 DOM 与展开钮外全域，
    delta-W3b）**；
  - **Esc 分层退出（delta-W3a，沿 popover＞picker 优先序先例）：
    paletteFor≠null 时 Esc 只关板（→null）；paletteFor=null 时 Esc=
    退画线（→select）**；
  - draw-X+点卡 A→anchor=picked(A)（**禁开详情——裁决 11a**）；
  - picked(A)+点卡 B≠A→建边（type=X，color=currentLineColor[X]）→
    anchor=none，**保持 draw-X 连画（主控自裁=拟稿推荐③，连续画线
    是画布工具常态）**；
  - picked(A)+点 A→anchor=none；
  - draw-X+小手钮或 Esc（paletteFor=null 时）→select（**Esc 保留=主控
    自裁，标准键位与小手钮并存——审核⑧**）。
  - 跨格序列 e2e 全断言：点展开钮→paletteFor=solid（aria）→点色行
    →paletteFor=null+图标描边新色→点图标→draw-solid→点卡1→锚高亮
    **且详情未开**→点卡2→边落新色→**再点卡3/卡4 连画第二边**→Esc→
    select→详情面板可正常打开（回 select 后点卡开详情）。
- per-kind 色：currentLineColor 单值→`{solid:string,dashed:string}`
  四消费面（lineage-view.store/useDrawLine/LineageToolbar/
  LineageTimeline）同步改，类型 shared 单源〔N2〕。持久化=**localStorage
  双键（主控自裁=甲案）**，键 `synapse.linetype.color.solid/.dashed`。
- 换色：#3a5bd9→深蓝（**呈裁①**候选 #1e3a8a 推荐/#27408b/#0b2a6f）；
  **迁移 015 挂本单元**（migrations 受锁 [locked-change]）：`UPDATE
  lineage_edges SET color='<新蓝>' WHERE LOWER(color)=LOWER('#3a5bd9')`
  （F5 核正：存量全规范形直接命中；迁移前备库拷贝随 DoD）。
- 退役面：A12 原「点图标=armed+列表展开」「armed 再点=取消」两子句+
  单值 currentLineColor；e2e 线型序列用例重写（豁免登记）。
- 测试：单测=per-kind 独立（设 solid 不动 dashed）+状态机迁移矩阵逐格
  〔N8〕；e2e=跨格全序列+新蓝值断言。

### C2 连线锚点+吸附（F8 单位域定稿）
- 锚点形态=**四边中点静态锚（主控自裁=甲案——几何可机检）**：armed 或
  hover 卡时四边中点渲染圆点（直径 **8 画布 px**，fill #fff，stroke 1.5
  画布 px 主色——**画布坐标系随 zoom 缩放**）。
- **单位域定稿（F8+delta-N3 三数值一行列全）**：±6 **屏幕 px**=吸附
  判定域（现状判定不动）；锚点 8 **画布 px** 渲染（随 zoom 缩放）；高亮
  放大至 12 **屏幕 px**+高亮环；预览线端点=锚心（画布坐标）。zoom 换算
  单点=吸附判定处（屏幕域 anchor 位置=画布锚心×zoom+pan）。e2e 测量
  断言原文（DoD 直引，防非确定失败立案线消耗）：`Math.abs(rect.left +
  rect.width / 2 - expectAnchorCenterX) <= 1`（rect=page.evaluate 取
  getBoundingClientRect 后按 devicePixelRatio 取整）。
- e2e 三档 zoom（0.8/1.0/1.5）：①|渲染锚心−几何中点|≤1px；②**高亮
  出现↔落点吸附一致**（高亮态下落边，端点坐标=锚心±0.5px——封「看
  到高亮点不中」复归）；③入域/出域类名切换。
- 穿年份头避让搭车（裁决 13）：障碍集=卡∪月标注∪.tl-year-head，PAD
  同源；**B4 字面量冻结后校准障碍几何**（N5）。

## §3 数据面（承 §0 核正）
- 迁移 015（C1 挂靠）：单值 UPDATE+备库；执行者 DoD=迁移前后 count 对账
  （探针脚本随票）。
- per-kind 色=localStorage 双键；ai_notes 零迁移；标签色域零变更
  （TAG_COLOR_PRESETS 不动）。

## §4 不变量候选（F9 三要素成文——实施单元随批登记 invariants.md）
1. **改月单口**：改月唯一入口=MetaEditDialog 月份字段；画布零写月路径。
   强制方式=C3 退役后 src grep 守卫（moveNodeMonth 零命中）+MetaEdit
   通道单测。锚定=C3 落地。
2. **线色双值**：currentLineColor per-kind 独立互不影响。强制=C1 单测
   （设 solid 断言 dashed 不变）。锚定=C1 落地。
3. **锚几何一致**：连线锚=卡四边中点（画布坐标）；高亮出现⇔落点吸附。
   强制=C2 e2e 三档 zoom+一致性断言。锚定=C2 落地。
4. **保存按钮协议**：四态+pending 缓冲（saving 中输入不丢）；点击立即
   落盘清防抖。强制=B3 状态机单测全格。锚定=B3 落地。
5. **AI 显示单面**：AI 笔记显示面唯一=脉络详情「AI 评估与建议」节。
   强制=B2 后 src grep「AI 笔记」字面量零命中（节名与 testid 断言）。
   锚定=B2 落地。

## §5 呈裁点收敛（审核后：8→2 项用户呈裁+8 项主控自裁留痕——**2026-10-05 三轮全销项**）
- 呈用户裁（**已裁决落定**）：①深蓝值=**#1e3a8a（用户按推荐亲裁）**
  ——迁移 015 值定稿；②建边后=**保持 armed 连画（用户按推荐亲裁）**。
- 主控自裁留痕（低风险形态项，**共 8 条**——delta-N2 计数口径统一；
  均带「用户可否决」注记，否决即回呈重裁）：①per-kind 色持久化=
  localStorage 双键；②色点阵=TAG_COLOR_PRESETS 8 色+默认点；③侧栏
  收起=48px 图标窄条；④StatusBar 全局已保存保留；⑤锚形态=四边中点
  静态（可见交互模型——用户否决可回呈动态方向锚）；⑥Esc 退出保留+
  色板关闭三径 toggle+Esc 分层退出；⑦漂移修复=甲案（偏移全程画布
  坐标系）；⑧draw-X 点另一 kind 图标=切换 draw-Y 且收板。
- **三轮裁决增补（2026-10-05）**：候选槽语义澄清（=月框内部插入位
  阵列，与跨月无关；跨月业务语义用户早已裁决删除——代码残留 C3 清）
  +图四两症改判=月内候选槽显示缺陷（保留面 bug 须修，C3 票面已改）。
  **本会话只规划不开工（用户指令）——实施=下场七单元专场。**

## §6 纪律流程（F10 展开——各单元 DoD 固定项）
- 受锁面（tests/shared/migrations）变更：locks:unlock→改→locks:apply
  即时同步；[locked-change] 尾注必带；test-refactor 尾注评估按单元申报
  （动 tests 用例者带，纯 src 不带——CI 范围闸白名单对齐）。
- 豁免登记：每单元测试删除/改题逐条登 test-surface 豁免（reason+
  rulingLink=本稿）；台账现为空（2026-10-05 基线再生成后清空）——本批
  为新基线后首批豁免。
- 单测先红后绿+always-active（不经 guardedDescribe）；e2e 改写实跑
  （playwright esbuild 不查类型——verify 的 tsc 关卡+定向 e2e 双 DoD）。
- 计数类数字脚本实测；ADR 触及申报（本批无 ADR 面——纯 UI+小迁移，
  ADR-0014 线型色值不属其修订记录范围）。

## §8 编辑行为测试自查升级（用户 2026-10-05 诉求「脉络图编辑行为测试自查更有效」——B/C 批 DoD 统一标准）

### 8.0 现状盘点（2026-10-05 主控亲查实录）

- **历史同型事故两次**：T3-P8 门一 B1=「T9 全绿与飞行偏 62px 缺陷并存
  ——断言全终态不捕动画路径」（终裁原话）；本场图四/图五=e2e 75 绿
  与拖影漂移/候选槽不显示/锚点偏离/连线不可用并存——**同一逃逸模式
  再现**，测试自查有效性不足是结构性根因。
- **单测层**：动画机制件（card-drag-flight 等）=拆件直测状态机时序
  （rAF/transitionend/清场分支），几何全喂 spy 定值（jsdom 零布局）
  ——**几何派生正确性不在单测面**；lnfix2 首创「stubLiveFrame 随动
  模型」（静态 mock 假绿教训）但仅 stretch 一件在用。
- **e2e 层**：T9=真实鼠标事件+终态 poll（DOM 序/inline 清空）+唯一
  中间态断言（实态槽「置入」文本）；**faded 候选族全 e2e 仅 1 处
  `first().toBeVisible()`（:1266——无计数无几何）**；拖影位置/插入
  位多样性/锚点几何零断言；zoom 仅功能档位切换测试（:1254-1257），
  **坐标域矩阵（zoom≠1 下几何行为）零覆盖**——INV-96 逆变换族无
  e2e 面。
- **探针层**：逐帧探针（T3-P8/lnfix2 实证利器）=仓外一次性件，未沉淀。

### 8.1 升级标准（B/C 各单元 DoD 强制项——新测试须遵，存量随触碰改写）

1. **中间态断言三强制**（拖拽/画线 e2e）：
   - 拖中（up 前）断言：候选槽族**计数**（`.drag-slot.cand` 数=其余
     卡数）+**几何在场**（boundingRect 宽高>0 且落源框内）——封
     「first 可见」弱断言；
   - 拖影偏移恒定断言：|ghost 角−（指针−dragstart 偏移）|≤1px，
     **全程≥2 采样点**（move 中两位置）——封漂移（C3 已列，升为
     通用标准）；
   - 插入位多样性：≥2 个不同插入区各断言实态槽位置/序变化——封
     「恒首位」（症二）。
2. **zoom 域矩阵**：拖拽 ghost/锚点渲染/吸附高亮三面 ×zoom{0.8,1.0,
   1.5} 断言（C1/C2/C3 已列雏形）——统一 helper `zoomProbe(scale,
   probeFn)`，INV-96 族首获 e2e 面。
3. **几何断言 helper 单源**：`expectRectNear(el, {x,y}, tol)`+
   `expectRectStable(fn, n)`（帧采样位置恒定）——T-P1b/T6 先例模式
   化，容差与测量口径（DPR 取整后 boundingRect 差）随 helper 注释
   单源（防各用例私设口径）。
4. **帧采样探针沉淀**：`frameProbe(el, n)`（rAF 间隔采样位置序列）
   入 e2e helpers——断言序列单调/无瞬跳（T3-P8「清场瞬跳」类可机检）；
   一次性仓外探针模式退役。
5. **动画等待标准化**：终态断言前显式等清场信号（transitionend 后
   的 inline 清空/slot 卸载——T9 先例）——禁纯 sleep；新动画路径
   （候选槽/settle/飞行/预演）逐路径定义清场信号并入断言。
6. **随动模型推广（单测）**：stubLiveFrame 范式推广至 drag-session/
     insertIdx 派生/flight 单测——几何派生逻辑禁静态定值 mock（实现
     期审查域申报+夹具 helper 化）。

### 8.2 落位与规模

- 本节=B/C 各单元 DoD 的强制标准（随 F-UIRES-03 实施即时生效——
  helper（8.1.3/8.1.4）先行为单元内搭车件，不立独立战役票）。
- 存量弱断言（:1266 first 可见/零 zoom 域）随 C 单元触碰面改写；
  不触碰面挂账=下场「测试自查存量升级」评估（若 C 毕后仍有存量）。

## §7 风险与回滚（承拟稿+补）
- 迁移单向性：正向 UPDATE 后新选新蓝边与被迁移边不可区分——**呈裁①
  先于迁移执行**；备库+count 对账；单用户可接受。
- C3 删留同文件（useCardDrag）：先删跨月测试与逻辑→月内调序回归绿
  →再动漂移修复（两步分提交或同笔两段自验）。
- per-kind 四消费面：shared 类型先行+tsc 全绿为准。
- 七单元独立提交独立 revert；跨月 e2e 族删除量最大（豁免条数预估
  30+——按单元分批登）。
