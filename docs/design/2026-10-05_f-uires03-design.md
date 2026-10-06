# F-UIRES-03 设计稿：视检反馈 R2 修正批（B 静态 UI+C 画布交互）——主控终裁修订版 v1.0

> **版本演进**：v1.0→v1.3（C3 考古修正）→v1.4（T0 前置）→v1.5（§8 业界对照）→
> v1.6（2026-10-05 T0 交付回写——本版前态）：T0 落地态+图四双症机制定位+
> C3/C2 调查向更新（门二裁决条件 2 兑现）→
> **v1.7（2026-10-05 用户裁决补录）**：C3 票面并入「卡双击退役+卡面两钮」
> （R2 §1.5 项——原 F-UIRES-03 七单元规划缺口，B2 收口呈报后用户裁决
> 「并入任意一票」，主控落位 C3）→
> **v1.8（2026-10-05 B3 交付注记）**：§2 B3 卸载面机制句补退出路径
> 收窄注记（门二 C1 兑现——退出=INV-22 拦截族承载，「等待在途落盘」
> 不适用退出路径，d1-W1 裁决记录）→
> **v1.9（2026-10-06 C3 交付回写）**：§2 C3 落地态注记（改月链全退役
> INV-107 锚定+INV-98 语义收窄+症一/症二/漂移三修复+v1.7 卡钮落地+
> 主题节点「去阅读器」=零渲染定稿+drag-hint 画线段保现状文案——
> 终态「点两卡连边」随 C1 落地换）→
> **v1.10（2026-10-06 C1 交付回写）**：§2 C1 落地态注记（状态机三维
> 重定义+per-kind 四消费面+迁移 015+drag-hint 终态文案兑现+pendingLink
> 互斥增补）+localStorage 键形点形→冒号形更正（B4 仓惯例预裁——
> 裁决部条件 C2）+§4.2 INV-108 指针→
> **v1.11（2026-10-06 用户裁决第二轮六项）**：§2 C2 增补（CAD 锚点
> 拖拽语义正名+Esc 全局层序承接+点两卡径预裁保留）+§2 B5 新单元
> （两钮迁详情页/LineTypeMenu 行 B1 化/resizer 键盘——实施序扩=
> C1✅→C2→B5）+走线候选位分配另票 F-ROUTE-02（设计先行三段通道）
> +§5 第二轮裁决记录→
> **v1.12（2026-10-06 用户裁决第三轮三项）**：§2 B5 件②语义修正
> （整行点击=选择线型非选色；选色与改名同入显式编辑态——色源色点阵
> =B5 设计呈裁点）+点两卡径用户确认保留（撤可否决位）+F-ROUTE-02
> 增「起终点非用户指定的适配分析」设计要求→
> **v1.13（2026-10-06 用户裁决第四轮）**：**撤 B5 原件④**（LineTypeMenu
> 行 B1 化——第二/三轮④系误答，用户以为所问=标签页面）：选线不变=
> 维持 C1 语义；v1.12 开的色源/值域松动呈裁点随撤关闭（固定 6 色板
> 不动）；B5=两件（两钮迁详情页+resizer 键盘）。
> **v1.14（2026-10-06 C2 交付回写）**：§2 C2 落地态注记（三屋全链毕
> ——锚层/高亮/Esc 层序/文案/避让五单元+INV-109 登记）+**F8 行勘误**
> （±6 屏幕 px 系拟稿沿 R2 分析档旧值——实代码 lnfix1 已 12 内容坐标
> 且先于 R2 反馈，按「现状判定不动」意图主句维持 12；主控预裁呈报
> 可否决）+§4.3 锚定句更新（INV-109）。
> **v1.15（2026-10-06 用户裁决第五轮四项——C2 收口呈裁+B5 细化）**：
> §2 B5 增两件细化（两钮位置=头部下操作行/resizer 键盘=±16+Home/End）
> +**新增搭车件=锚点显隐收窄仅 edit 模式**（C2 呈裁③用户裁决收窄
> ——browse/focus hover 不显）；Esc 接缝两项立票 F-ESC-01（B5 后）。

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

## §1 单元划分与实施序（v1.4——用户指令「先完善测试层再开工修复」：**T0 前置**）

**T0 测试层基建批（先行——用户 2026-10-05 指令）**：§8.1 helper 族
落地（expectRectNear/expectRectStable **双模式=冻结优先+采样仅连续性**
/zoomProbe/frameProbe+随动模型单测 helper 推广）+存量弱断言全量改写
（:1266 等）+**中间态样板用例三件**（拖拽候选槽计数几何/拖影偏移恒定/
画线锚点几何——**预期当场红**：现存缺陷实锤=先红证，C3/C2 修复后
转绿——TDD 闭环）。T0 毕=测试自查基建就位，B/C 各单元按 §8 标准实施。

**〔T0 落地态·2026-10-05 v1.6——三屋全链毕（executor 基批+RR1→门一
双审双 PWC→双席复核双 PASS→probe 八项矩阵→裁决部 GO_WITH_CONDITIONS
条件全兑现）〕**交付=tests/e2e/geo-probes.ts（五件 helper，测量口径
单源=gBCR 同源 CSS px——「DPR 取整」表述经实测勘误）+tests/utils/
live-frame.ts（随动模型 helper 化）+lineage.spec.ts 三样板（test-surface
例签名防线使 :1266 弱断言原文驻留 T13，强断言升级面由样板①独立承载）。
**预期红承载形态备案**：playwright test.fixme/skip 字面量被 quality 占位
词表+test-surface skipSites 双机检结构性拦死（仓内防线使然）——预期红
用例一律以「预期失败包装」承载（内层强断言必抛→捕获绿；修复后外层
自动转红提醒去包装翻转直陈）——后续单元沿用本形态。**两红实锤**
（probe 两向变异+裁决部独立复算闭环）：①样板①=候选槽陈旧几何
（DOM 在场计数 2/宽高>0/落框内全绿，槽位命中红——候选位距最近插入位
64.4px，两次独立运行同值）；②样板②=激活期包含块错位（跟随采样三档
绿=跟随不变性真；绝对锚三档红）。样板③=绿卫士（hint 锚几何三档精确
——DrawPreview 端点为 C2 调查域）。

后续序：B1 标签下拉七条→B4 杂项静态（# 换点/年月行/侧栏）→B2 详情
面板+AI 改名→B3 阅读器保存按钮→C3 拖拽域重构→C1 线型链+换色（**迁移
015 挂本单元**）→C2 锚点+吸附。B1-B4 与 C 线可并行（文件级划界：B4
的 #/年月改写若触 e2e 同文件与 C 冲突，以 B4 先行冻结字面量、C2 障碍
几何在 B4 后校准——审核 N5）。

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
  立即重试落盘一次；两路径均无落盘通道即实现期阻断级缺陷。〔B3 交付
  注记·2026-10-05 门二 C1：退出路径收窄——destroy 绕过 renderer 卸载
  事件，「等待在途完成后落盘」不适用于应用退出；退出通道=INV-22 拦截族
  承载（tabDirty 恒拦+确认框=用户知情放弃未落库增量〔TABS-04 既有语义，
  main-window.ts 生命周期层〕+拦截窗内模块级 timer/在途照常落盘）——
  d1-W1 裁决记录在案〕**新增序列
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

### B5 UI 归位两件+搭车（v1.11 用户裁决第二轮①⑤+v1.15 第五轮①搭车——C2 后实施）

> 〔v1.11 2026-10-06 用户裁决〕①卡面两钮归详情页；⑤resizer 键盘可达。
> **〔v1.13 第四轮〕原件④（LineTypeMenu 行 B1 化）撤**——用户澄清
> 第二/三轮④系误答（以为所问=标签页面；B1 标签编辑为先例原所指）：
> **选线不变=维持 C1 语义**（整行点击=选该色为该 kind 当前色；名称
> 点击=行内改名系 U2 原设计「点击重命名」——颜色×线型排列组合展开
> 的行集不动）。色行热区维持 N 级挂账 by-design（选线=色样侧整行
> 可达）；v1.12 开的色源/值域松动呈裁点随撤关闭（固定 6 色板不动）。

- **两钮迁详情页**：卡面「去文献库/去阅读器」两钮退役（C3 v1.7 交付面
  退役——hover-only 键盘不可达挂账随迁移消解；卡双击退役不变）；两钮
  迁 LineageSidePanel 详情面板（选中卡正身区——选中文献节点时呈现；
  主题节点=「去阅读器」不渲染〔沿 C3 态〕+「去文献库」在场不置选中
  〔沿 C3 态——通道 paperId=null 支持，主控补裁 k1-W3；「详情页」
  =LineageSidePanel 解读标注可否决 k1-N3——**v1.15 第五轮②用户确认**〕；
  通道全复用零改动=goto-library-plan/open-library-bus/requestOpenPaper）。
  **〔v1.15 第五轮②细化〕位置=头部下操作行**：标题/编号/徽章行下方
  加一行两钮并排（文字钮形——醒目+语义=「针对这篇文献的操作」；不随
  内容滚动消失）。e2e 卡面两钮例改写+详情面新例。
- **resizer 键盘可达**：use-sidebar-pane 手柄 role=separator 加
  tabIndex=0+ArrowLeft/ArrowRight 步进（APG separator 模式；钳制域复用
  clamp 单源——步进量 v1.15 已定 ±16）。**〔v1.15 第五轮③细化〕步进
  =左右键 ±16px+Home/End 直达边界（200/480）**；aria-valuenow 随动更新。
- **〔v1.15 第五轮①搭车件〕锚点显隐收窄仅 edit 模式**：C2 交付的
  hover 显锚支（.tl-card:hover）从全模式收窄为**仅 edit 模式**（
  browse/focus hover 卡不显——browse 无画线工具，锚点暗示不可用操作
  =视觉噪声；armed 全显与 edit hover 显两支不动）。实施=CSS 单
  选择器收窄（.editing 域作用）+e2e C2a 补 browse 负锚分支（退编辑
  模式 hover 卡→锚点隐藏）；INV-109 ①子句显隐条件同步更新为
  「armed∪**edit 态** hover 卡」。
- DoD：三件各自单测先红后绿+变异红证；e2e 两钮迁移例+C2a browse
  负锚分支；locks 流程（tests 触碰面）+豁免登记（改写例）。

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
    **〔v1.6 T0 机制定位——调查向改写〕**样板①红实锤+裁决部 src 复算：
    DragCandidates useMemo deps=[frameKey,nodeId,insertIdx,active]
    （drag-slot-candidates.tsx:64）**无布局稳定信号**——候选位捕获自
    gBCR（:40-42）落在框高 .38s 过渡中期（theme-lineage.css:57）后
    不随布局稳定重算，「不显示」正身=**显示在错位**（距最近插入位
    64.4px 确定性偏差）。修复向=重算时机（deps 增布局稳定信号/稳定
    后重捕获），渲染链本体无恙；
  - 症二「只能放到已有的第一个（插入位）上」——insertIdx 更新链
    调查（pointermove 重算断链/insertIndexFromRects 几何失效致恒 0），
    修复=全部插入位可达；**（T0 三样板未直接实锚——维持原双调查向，
    C3 实施时以样板①去包装转绿+插入位多样性断言（§8.1.1 第三强制）
    联动验证）**；
  - e2e 断言=拖起后候选槽 DOM 计数与几何可见性+逐插入位 settle 落
    序断言（DoD 附测量口径）。
  - **DoD 附核对清单（delta-N1）：保留面引用 grep 被删符号全零命中**
    ——moveNodeMonth 三链路（回调/store action/IPC 通道）调用点逐一
    核对月内提交路径（reorderMonthSlots）确不经被删链；undo 栈=内存
    会话态（实现时核——若跨会话持久化另立兼容面呈报）。
- 漂移修复=**甲案（主控自裁）**：dragstart 记录「指针−卡角」偏移，
  ghost 全程画布坐标系定位（根除 fixed/zoom 换算链——INV-96 族）。
  **〔v1.6 T0 机制定位——实施线索〕**样板②绝对锚红实锤：拖卡 inline
  left/top 内容坐标数学正确（=p−ox），但包含块=position:relative 的
  .month-frame（theme-lineage.css:55）而非 .tl-content——frame 原点
  双计，**拖起瞬间卡向右下跳 frame 原点量（≈66,72 内容 px）后跟随
  精确**（「右下漂移」正身=激活期包含块错位，非跟随期漂移）。甲案
  实施线索=containing-block 对齐。e2e=zoom 0.8/1.0/1.5 三档
  |ghost 角−（指针−偏移）|≤1px（测量口径=样板②绝对锚同式——
  dragstart 偏移=pointerdown 坐标锚、激活帧计算）。**DoD 增项
  （门二裁决）**：①样板①②去包装翻转直陈销项（两例绊线红=转绿
  提醒）；②两轴残差对账并入——dOff/frame 原点比值 X 0.956/Y 0.944
  两轴同向 ~5% 系统性短缺（候选解释=激活阈值位移 +9,+7/边框 1.6px/
  padding 基差），修复对账须两轴并含非单轴；③搭车清理=
  TimelineYears.tsx:9「fixed 离流」陈旧注释（包含块实证后其错误更
  明确）+geo-probes Ctrl 持键段 try/finally 加固。
- **〔v1.7 用户裁决并入·2026-10-05〕卡双击退役+卡面两钮**（R2 §1.5
  用户落定项——「卡上双击跳转整体退役+卡上放两个排列整齐的按钮
  『去文献库』『去阅读器』」；B2 收口呈报规划缺口后裁决并入本单元）：
  ①退役=LineagePage.handleCardDblClick+LineageTimelineCard
  onNodeDblClick 卡双击链（B2 收口确立终态：双击链全应用唯一保留=
  详情面板片段条目——本项兑现该终态）+LineageSidePanel insp-foot「双击卡片跳转阅读器」
  注记随改；②新增=卡面「去文献库」（打开文献库所在文件夹并定位该文献）
  +「去阅读器」（开篇打开——requestOpenPaper 单字段语义）两钮，排列
  整齐（卡面布局随 L1/L2/L3 排布统一定稿，编辑态收按钮区避让）；③主题
  节点无 paperId=「去阅读器」零渲染/禁用态（实现时定）、「去文献库」
  随所在文件夹语义；④测试=卡双击退役负锚+两钮单击 e2e（真实跳转断言）
  +按钮区布局回归。
- **〔v1.9 C3 落地态·2026-10-06——三屋全链毕（executor 基批+RR1→
  门一 k1 B0W2N8/d1 B0W3N9 双 PWC→RR1 四件→双席复核双 PASS→
  probe 九项矩阵全绿→裁决部 GO_WITH_CONDITIONS 三条件兑现）〕**
  改月链 9 符号族 src 全零命中（MonthPop/useMonthPop 整件删+useCardDrag
  收窄 82 行+store 动作/applyMovePreview 预演/moveTargetLabel 文案链全
  退役；写链=write-queue 'patch-node'→api.lineage.patchNode 通道保留=
  MetaEditDialog 正身）；undo=会话快照栈通用机制留驻（改月入栈路径退役）；
  INV-107 登记（改月单口）+INV-98 修订（回弹护栏≠改月判定面）。
  症一=DragCandidates stableEpoch 布局稳定信号重捕获（样板①去包装
  翻转直陈转绿）；症二=插入位全部可达（多样性新例绿——「恒 0」形态
  未复现，归因症一视觉投影未证实，用户复测再立案）；漂移=frameOrigin
  包含块补偿甲案（样板②直陈转绿+两轴残差对账 X/Y 并含）；回弹判定
  overSourceFrame/PULL_BAND_PX=保留纯回弹护栏+stretch 服务者。v1.7
  卡钮落地=hover 呈现+编辑态 display:none!important 恒隐；**主题节点
  「去阅读器」=零渲染（自裁定稿——非禁用态，无阅读器面）、「去文献库」
  =在场点击不置选中**；「去文献库」链=open-library-bus 新建（零载荷
  事件切视图）+goto-library-plan 单源编排（先置数后广播；folderId=
  '__main__' 未归夹→清夹全库视图+选中该文降级语义；MAIN_GRAPH_ID
  常量单源）。drag-hint 画线段=**保现状真文案**（终态「点两卡连边」
  随 C1 落地换——主控预裁留痕，用户可否决）。附带=timeline-pan
  PAN_EXCLUDE .c-ym 死条目清除+TimelineYears 头注改写+geo-probes
  try/finally 加固+EdgeMenu 注释清理。

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
  双键（主控自裁=甲案）**，键 `synapse:linetype:color:solid` /
  `synapse:linetype:color:dashed`〔v1.10 更正：原文本位点形键，依 B4
  「设计稿点号与仓惯例冲突以仓为准」预裁（synapse:splitpane/
  synapse:sidebar 先例）改冒号形——实装与 INV-108 同形，销票面-实装分叉〕。
- 换色：#3a5bd9→深蓝（**呈裁①**候选 #1e3a8a 推荐/#27408b/#0b2a6f）；
  **迁移 015 挂本单元**（migrations 受锁 [locked-change]）：`UPDATE
  lineage_edges SET color='<新蓝>' WHERE LOWER(color)=LOWER('#3a5bd9')`
  （F5 核正：存量全规范形直接命中；迁移前备库拷贝随 DoD）。
- 退役面：A12 原「点图标=armed+列表展开」「armed 再点=取消」两子句+
  单值 currentLineColor；e2e 线型序列用例重写（豁免登记）。
- 测试：单测=per-kind 独立（设 solid 不动 dashed）+状态机迁移矩阵逐格
  〔N8〕；e2e=跨格全序列+新蓝值断言。

> **〔v1.10 C1 落地态·2026-10-06——三屋全链毕（executor 基批 39,125,155
> +RR1 12,110,094 tok→门一 k1 B0W3N10/d1 B0W3N8 双 PWC→RR1 八件（syn
> -icon-btn 图标规格/pendingLink 互斥双向闸/判别力四件/注释死码三小修/
> esc+anchor 直测/报告更正）→双席复核双 PASS 升放行（k1 B0W0N2/d1
> B0W0N4）→probe 九项矩阵 8 绿 1 口径红（红='#3a5bd9' src 9 命中 vs
> 申报「值承载两处」——裁决部定性口径差非缺陷：功能字面量 3（015
> WHERE 票面必然/014 DEFAULT 历史锁定/theme.css --accent chrome 域）
> +注释 6）→裁决部 GO_WITH_CONDITIONS 三条件全兑现〕**。落地：状态机
> 11 格全格+anchor 维驻 useDrawLine（裁决 c）+LineTypeColorPair shared
> 单源+localStorage 冒号双键（读写钳制回色板域）+迁移 015 纯 UPDATE
> LOWER（014 DEFAULT 不动预裁 b）+INV-108 登记+repo 读面钳制（自裁②
> ——014 DEFAULT 死路径读面防线）+Esc 拆件 use-lineage-esc+drag-hint
> 终态「点两卡连边」兑现（C3 预裁闭）+**pendingLink⇔画线域互斥双向闸
> （主控裁并案 k1-N6/d1-W2：发起 resetTool+进 draw 清意图——票面外
> 增补，接缝归责裁定）**+ExpandButton 补 syn-icon-btn（RR1）。挂账 11
> 项入交接书 v138（Esc 全局层序→本单元 C2 承接为首选——EdgeMenu×
> palette 组合同关两层，delta-W3a 只立 palette↔draw 两层）。verify 终态
> =256 件/2610 例 EXIT=0+locks 361+豁免 138 hits stale 0+e2e 四件
> 17/6/18/2（T12c 跨格全序列新增）。

### C2 连线锚点+吸附（F8 单位域定稿）

> **〔v1.6 T0 回写〕**样板③实跑=绿卫士：hint 锚（r=3.2 画布 px 随 z
> 缩放）三档 zoom 渲染几何精确——「待连接点离卡远」真域收窄=
> **DrawPreview 端点/预览线渲染链**（本单元调查主向）；锚渲染面非缺陷。
> **随票更新条目**：本单元落地「直径 8 画布 px+stroke 1.5」形态时，
> 样板③ r=3.2 断言同步改写（T0 硬编码现实现几何——形态变即红属预期
> 提醒，防误判回归）。
- 锚点形态=**四边中点静态锚（主控自裁=甲案——几何可机检）**：armed 或
  hover 卡时四边中点渲染圆点（直径 **8 画布 px**，fill #fff，stroke 1.5
  画布 px 主色——**画布坐标系随 zoom 缩放**）。
- **单位域定稿（F8+delta-N3 三数值一行列全；〔v1.14 勘误——「±6 屏幕 px」
  系拟稿沿 R2 分析档旧值：实代码 lnfix1（2026-10-03）已放宽 DRAW_SNAP_R=12
  内容坐标且先于 R2 反馈（10-04）——按「现状判定不动」括号明文意图主句，
  **判定域维持 12 内容坐标零改**〕）**：吸附判定域=**12 内容坐标
  （DRAW_SNAP_R——现状不动）**；锚点 8 **画布 px** 渲染（随 zoom 缩放）；
  高亮放大至 12 **屏幕 px**+高亮环；预览线端点=锚心（画布坐标）。zoom 换算
  单点=吸附判定处（屏幕域 anchor 位置=画布锚心×zoom+pan）。e2e 测量
  断言原文（DoD 直引，防非确定失败立案线消耗）：`Math.abs(rect.left +
  rect.width / 2 - expectAnchorCenterX) <= 1`（rect=page.evaluate 取
  getBoundingClientRect 后按 devicePixelRatio 取整）。
- e2e 三档 zoom（0.8/1.0/1.5）：①|渲染锚心−几何中点|≤1px；②**高亮
  出现↔落点吸附一致**（高亮态下落边，端点坐标=锚心±0.5px——封「看
  到高亮点不中」复归）；③入域/出域类名切换。
- 穿年份头避让搭车（裁决 13）：障碍集=卡∪月标注∪.tl-year-head，PAD
  同源；**B4 字面量冻结后校准障碍几何**（N5）。

> **〔v1.11 用户裁决第二轮②③增补〕**：
> ①**画线业务语义正名=CAD 式锚点拖拽为正身**（从卡片边缘吸附点出发
> 拖拽至目标卡吸附点；吸附点在小范围内「抢鼠标准星」=吸附引力域，
> 同 CAD 行为——即本节 ±6 屏幕 px 判定域的交互语义正名）。点两卡径=
> **用户确认保留**（2026-10-06 第三轮②——撤可否决位；其端点=系统
> 选取锚点非用户指定，走线适配分析=F-ROUTE-02 设计要求）。drag-hint
> 文案随本单元改 CAD 语义（「画线＝从卡边锚点拖至目标卡」形——终稿
> 实现期定）。
> ②**Esc 全局层序承接**（C1 挂账①）：沿 popover＞picker 优先序定
> 全局面层序——一次 Esc 只关最上层（**边菜单〔EdgeMenu edge/vertex
> 两态——无独立 NodeMenu 件，k1-W4 正名〕**/色板/画线逐层退出），
> delta-W3a 两层定义扩为全局面层序；接线面=use-lineage
> -esc 单口扩展。
> ③走线候选位分配（间隙六分五候选位/优先空位/满员扫描左右/整排皆无
> 默认路线重叠/纵向同理）=**另票 F-ROUTE-02**（技术路线级——三段
> 通道设计先行，本单元不承载；本单元毕后其设计与 B4 障碍几何校准
> N5 同批呈）。

> **〔v1.14 C2 交付回写·2026-10-06——三屋全链毕（runId=20261006-f-uires03-c2）〕**
> 五单元落地：①**P1 锚点静态层**=CardAnchorDots 新件（四边中点 div 圆点
> DOM 常驻+显隐 CSS 单源 .drawing∪:hover；fill 经 --accent-ink token；
> inset:-1px 卡 border 补偿）②**P2 吸附高亮演化**=DrawAnchorHint 改造
> （dot 直径 12 屏幕 px=r=6/z 补偿+环 r=9/z+.snapped 类；idle=hint 通道/
> dragging=snap 维经 DrawLayers 拆件分派——DrawPreview 吸附圆点 r3.2 收敛
> 删除）③**P5 Esc 全局面层序**=anchor 维迁 view.store（C1「驻 hook」设计
> 修订——escapeStep 单口触达必要通道，呈报可否决）+escapeStep 三层+
> 菜单层让路探测 [role=menu]+LineageNodeMenu 自治 Esc 补齐（EdgeMenu
> 同型）④**P6 drag-hint CAD 文案**=「画线＝从卡边锚点拖至目标卡」+两
> icon title 同改⑤**P7 穿年份头避让**=buildSnapshot yearHeads+allObstacles
> 三源并集单源（PAD 同源）+manual-override 负锚沿承。门链=executor
> 基批+RR1 四件→门一 k1 B0W3N7 PWC+d1 B1W4N4 FAIL（B1=toggle-off 清锚
> 缺口——**主控证伪撤回**：toggleLineTool 同 kind=C1 N9 无操作早退，
> off 支不存在；小手钮/切图/pendingLink 闸/建边收尾四路全走 resetTool
> 清锚+armed() 双层门控——d1 复核确认）→双席复核双 PASS（B0W0N3×2）
> →probe 九项矩阵全绿（verify 258/2636 EXIT=0+e2e 七例+变异 A/B 独立
> 复现+test-surface 142/142 stale 0+locks 363）→裁决部 GO_WITH_CONDITIONS
> 七条件（C1-C7 收口全兑现）。**INV-109 已登记**（锚几何一致+吸附⇔判定
> +Esc 层序+退出清锚守卫句）。挂账八项见交接书 v142（Dialog×Esc 交界面/
> pendingLink Esc 立票建议/browse+focus hover 显锚呈裁/真实避让 e2e 缺位
> 挂 F-ROUTE-02/dot 视觉规格+ring strokeWidth 未锁/4px 环带边缘效应/
> drawline-rr1 夹具未同型补维/豁免双登冗余）。

## §3 数据面（承 §0 核正）
- 迁移 015（C1 挂靠）：单值 UPDATE+备库；执行者 DoD=迁移前后 count 对账
  （探针脚本随票）。
- per-kind 色=localStorage 双键；ai_notes 零迁移；标签色域零变更
  （TAG_COLOR_PRESETS 不动）。

## §4 不变量候选（F9 三要素成文——实施单元随批登记 invariants.md）
1. **改月单口**：改月唯一入口=MetaEditDialog 月份字段；画布零写月路径。
   强制方式=C3 退役后 src grep 守卫（moveNodeMonth 零命中）+MetaEdit
   通道单测。锚定=C3 落地。**〔v1.9 已登记=INV-107（2026-10-06）——
   守卫形态=单测 fs 扫描（src/renderer .ts/.tsx 面；CSS 注释 token 由
   dod-grep 终态清单 4 条登记承载）〕**
2. **线色双值**：currentLineColor per-kind 独立互不影响。强制=C1 单测
   （设 solid 断言 dashed 不变）。锚定=C1 落地。**〔v1.10 已登记=INV-108
   （2026-10-06）——强制面=C1 单测两例+repo 读面钳制（域外色归一首色，
   自裁②）；变异②串格红证在档〕**
3. **锚几何一致**：连线锚=卡四边中点（画布坐标）；高亮出现⇔落点吸附。
   强制=C2 e2e 三档 zoom+一致性断言。锚定=C2 落地。**〔v1.14 已登记=
   INV-109（2026-10-06）——锚几何一致+吸附指示⇔判定一致+Esc 全局面层序
   +退出画线域清锚守卫句；强制面=e2e 三档（样板③/C2a/C2b）+单测全格
   （c2-anchors/c2-esc）+变异 A/B 双向红证（probe 独立复现）〕**
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
- **〔2026-10-06 第二轮六项全裁决〕**：①两钮归详情页（B5）②Esc 层序
  按建议=C2 承接③画线语义=CAD 式锚点拖拽正名+走线候选位=F-ROUTE-02
  新要求④LineTypeMenu 行=B1 同型（主控转译可否决）⑤resizer 键盘=
  按建议（B5）⑥AI 入口=DB 大票统一规划（后置——在册不动）。
- **〔2026-10-06 第三轮三项〕**：①B5 件②语义修正（整行点击=选择
  线型非选色；选色与改名同入显式编辑态——色源呈裁点开面）②点两卡
  径确认保留（撤可否决位）+F-ROUTE-02 增起终点非用户指定适配分析
  ③网络恢复推送（环境项非裁决——操作完成）。
- **〔2026-10-06 第四轮〕**：①撤——用户澄清第三轮①系误答（以为
  所问=标签页面，「之前批的标签编辑」=B1 标签系统原所指）：**选线
  不变=维持 C1 语义**（颜色×线型排列组合行集+整行点击选色+名称点击
  行内改名均不动）；B5 缩两件；v1.12 色源/值域松动呈裁点随撤关闭。

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

## §7 风险与回滚（承拟稿+补）
- 迁移单向性：正向 UPDATE 后新选新蓝边与被迁移边不可区分——**呈裁①
  先于迁移执行**；备库+count 对账；单用户可接受。
- C3 删留同文件（useCardDrag）：先删跨月测试与逻辑→月内调序回归绿
  →再动漂移修复（两步分提交或同笔两段自验）。
- per-kind 四消费面：shared 类型先行+tsc 全绿为准。
- 七单元独立提交独立 revert；跨月 e2e 族删除量最大（豁免条数预估
  30+——按单元分批登）。
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
- **业界对照（2026-10-05 用户问询后校准）**：通用 web 应用主流=禁/快进
  动画测终态（Playwright `animations:"disabled"` 官方口径——装饰动画
  终态断言+截图 diff 即全部）；**画布类应用（Figma/Excalidraw 同类）
  =几何断言重**——位置即产品正确性，真实拖拽+坐标断言是常规形态。
  本项目属后者，问题非「没学大厂禁动画」而是把交互语义动画当装饰
  动画测了。逐帧视觉 diff 明确**排除**：CI=GitHub runner 跨机渲染
  差异必 flaky+单人项目无多端一致性诉求。

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
3. **几何断言 helper 单源·双模式**（业界 seek 优先于裸采样）：
   `expectRectNear(el, {x,y}, tol)`+`expectRectStable(fn, n)`——T-P1b/
   T6 先例模式化，容差与测量口径（DPR 取整后 boundingRect 差）随
   helper 注释单源（防各用例私设口径）。**冻结模式优先**：静态
   中间态断言（锚点几何/ghost 位置）先冻结动画再断言（Playwright
   `animations:"disabled"` 快进终态不可用于中间态时=WAAPI seek 到
   指定进度/项目内 transition 暂停类）——确定性高于采样；**采样
   模式仅用于连续性缺陷**（瞬跳/回弹时序）。
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
- **〔T0 落地态·2026-10-05〕**helper 族已落地（geo-probes.ts 五件+
  live-frame.ts 随动模型两件——B/C 单元直接消费；expectRectStable/
  frameProbe/assertNoJump 三件判别力经变异红证在档、消费面=B/C 批）；
  :1266 弱断言处置实态=test-surface 例签名防线使原文驻留 T13（历史
  子集），强断言升级面由样板①独立承载；zoom 域矩阵已随样板②③三档
  {0.8,1.0,1.5} 首获 e2e 面（INV-96 族）；预期红承载形态=预期失败
  包装（见 §1 落地态备案）。verify 终态=251 件/2581 例+e2e 定向 15
  passed+test-surface cases 2659/assertions 8453/豁免 0+locks 353。
