# F-UIRES-01 库页资源管理器化 mockup 设计文档（2026-10-02 呈裁 · v2.1）

> **状态：已定案（2026-10-02 用户裁决 P-1..P-11 全按拟推成立——P-1/P-6/
> P-8/P-11 四问亲裁+其余七项默认成立口径）。本档即 F-UIRES-01 实施蓝图
> 真相源；实施批次=§8（批 A 纯 UI/批 B delete 通道/DB 窗口批后置）。**
> 呈裁面=§5 呈裁点 P-1..P-11。样本=docs/design/
> mockups/2026-10-02_f-uires01-library.html（+同名 png，七幕）。视觉审
> 三轮 B=0（§6）。单源指针：F-TAGS-02 域化数据模型/迁移=DB 窗口域（本稿
> 只定 UI 形态节）；F-STAR-01 starred 列=DB 窗口域（本稿只定形态位）。
> **文案单源声明**：样本 HTML+本稿为实施文案逐字源（e2e 断言锚以本稿 §3.9
> 清单为准）。

## §0 呈裁说明

方向级已裁（用户第 1 条：资源管理器形式——v90 §2-1 原文），本稿=落地形态
与交互细节呈裁。烤验链=d1 对抗审（§7）+视觉审三轮（§6）+用户终裁（§5）。

## §1 用户反馈逐句转译表（⑤c——原文→设计动作）

| # | 用户原文/既定裁决 | 出处 | 设计动作 | 幕 |
|---|---|---|---|---|
| 1 | 文件夹改资源管理器形式=左侧导航列表为主体+右侧文献列表随选随切 | 用户第 1 条（v90） | 左栏 FolderNav 224px+列表随 folderScope 随选随切 | S1 |
| 2 | 扁平单层无嵌套 | 2026-09-30 补充 | 单层列表零缩进 | S1 |
| 3 | 标签筛选移至最右侧 | 用户第 6 条 | FilterBar 行尾标签下拉钮 | S3 |
| 4 | 标签过多溢出策略（候选=折叠/+N/滚动/管理面板） | **票面③原文** | 面板内部滚动+域内 20 上限兜底（P-5） | S3 |
| 5 | 「仅入文献库」退役 | 二批反馈 1 | 导入条恒显目标=当前文件夹（未选/未归档=主图）；ImportTargetSelect 退役 | S4/S6 |
| 6 | 拖文献进文件夹走 moveFolder | v90 §2-4（用户赞同） | 行拖拽→左栏 drop+右键菜单双通道（P-7）；含移出（未归档目标） | S4/S5a |
| 7 | 删单文献静默判据：无节点 ∨ 节点无边 | F-DELCONF（C5 承接） | 删除两分支（§2.4 统一级联契约） | S5a/b |
| 8 | 文献库列表行显示星标 | 2026-10-01 定案（F-STAR-01） | 行首星标列；DB 窗口前=静态禁用占位（P-9/P-10+退出条件） | S1 |
| 9 | 标签下拉一行一个/逐个点选/右键修改 | F-TAGS-02 ④⑤⑦ | 一行一勾选+**即时生效**（toggle 即查询——现行语义零变）+右键修改入口（=改名+颜色双入口，P-11 呈裁） | S3 |

## §2 状态机前置（宪法强制）

### 2.1 导航/筛选态（folderScope × tagIds × search）

| folderScope | 列表语义 | 导入目标显示 | 脉络缺省图（F-LGRAPH-01 已裁重述） |
|---|---|---|---|
| undefined（全部文献） | 全库 | 主图 | 主图 |
| {kind:'unfiled'} | 未归档 | 主图 | 主图 |
| {kind:'folder',folderId} | 该文件夹 | 该文件夹 | 该文件夹图 |

- 单选互斥；点导航行=置态+列表重载（query 通道零变）。**tagIds 跨
  folderScope 保留**（过渡期全局域无失效——现行语义）；F-TAGS-02 域化后
  的域变更 tagIds 处置（清空+面板刷新）=该票窗口批承接项（登记，非本批）。
- 选中文件夹消失（folders.changed 并发删除/改名不影响 id）→ 回退「全部
  文档」→「全部文献」（disappearedId 顺序契约同族）；标签下拉开态遇此
  =面板数据刷新、不强制关闭（tagIds 保留）。
- **引导态（INV-87 三条件）左栏隐藏面清单**：隐藏=未归档行/分隔线/文件夹
  列表/新建入口；仅显示「全部文献」一行。解除时点=升格三路任一成立 →
  folders.list 重拉+完整结构再现。
- busy（导入中）禁用清单=拖拽/新建/删除/重命名/**导航行切换**（锁定
  folderScope——导入目标在启动时捕获，切换致显示与落点背离）；标签下拉
  允许（纯查询面）。

### 2.2 左栏操作态（右键菜单 × 新建/重命名行内编辑）

```
idle ──右键行──▶ menuOpen{folderId}：重命名→行内编辑（F2 等价）
  /删除→静默判据预检（F-DELCONF ①组件复用）/在脉络图中打开（P-8）
menuOpen ──Esc/外点──▶ idle
新建：常驻入口 → 内联输入 typing（Enter 提交/失焦提交/Esc 取消/isComposing 守卫
  ——F-UIRES-02 范式即面即守）→ CONFLICT → toast+保留输入
重命名行内编辑：同三键范式（Enter/失焦/Esc+isComposing）
```

- **重命名单源=行内编辑**；FolderRenameDialog 随批退役（消费面=FolderFilter
  单点实证——方案切换=删旧）。
- **行内编辑×folders.changed 并发**（d1 复审 W-2）：编辑/提交在途遇外部
  刷新（他处移动/改名成功）→ **输入保留+编辑行不因重拉卸载**，终态以本行
  提交结果为权威（CONFLICT 拒 → toast+保留输入）。

### 2.3 拖拽态（文献行 → 左栏文件夹行/未归档行）

```
idle ──行 pointerdown+移动──▶ rowDragging（源行 faded 0.3+ghost「{题名截断}→目标」——单选模型，多选拖拽非本票面）
rowDragging ──dragover 合法目标行──▶ 候选高亮（合法目标=文件夹行+未归档行[移出，setFolderId null]；「全部文献」行=非目标）
           ──drag 期目标行消失（folders.changed）──▶ 高亮即清；drop 时 folderId 不在列表 → no-op+toast「目标文件夹已不存在」
           ──drop──▶ moveFolder(paperId, folderId|null)（INV-88：节点随归属+同值幂等+跨图边拒）
                      ├─ 成功 → folders.changed（左栏计数既有事件通道）+列表重载+行离开当前视图→选中清空+抽屉清空；仍在→保持
                      └─ 跨图边拒/失败 → 拒因中文 toast（非静默 no-op）
           ──释放在空白/原处──▶ 取消回 idle
```

### 2.4 删除流（文献——papers delete 新通道；统一级联契约）

**级联契约（两分支同一数据效果，差异仅弹窗与否）**：删除 papers 行 →
DB FK ON DELETE CASCADE 自动级联（migration 001/003/004 实证清单）：
annotations（001:37）/notes（001:76）/paper_tags（001:48）/ai_notes
（003:14）/**lineage_nodes（004:15）→ lineage_edges 随节点级联（004:26-27）**。
service 层 withTransaction 包裹（F-FOLDER-01 事务序先例）。

```
menuOpen ──点「删除文献」──▶ 菜单收起 + 预检（nodeCount/edgeCount——UX 分流用）
  ├─ 预检：无节点 ∨ 节点无边 ──▶ 静默直删（同事务）
  └─ 预检：有连线 ──▶ 保护弹窗（图名+连线数+连带面不可恢复）──取消──▶ 关闭
                                              └──删除──▶ 同事务删（级联见上）
**执行时点裁定=事务内重验为权威**：预检仅决定弹窗与否；事务内再取
nodeCount/edgeCount，与预检不一致时按事务内实际级联（弹窗计数=提示值）
**单图约束声明**：INV-88 文献单归属→节点恒单图（弹窗「图名」单数合法）
失败 → toast+列表保持；成功 → 列表重载+folders.changed 计数刷新；
**收尾同 §2.3**（被删行=当前选中 → 选中清空+抽屉清空；仍在 → 保持）；
删除事务在途（确认→结果窗）导航允许（短窗），**「选中夹消失→回退全部
文献」仅当当前 folderScope 仍指向消失夹时触发**（切走后抵达的 folders.
changed 不触发回退——错误回退护栏）
```

### 2.5 导入态（ImportDropZone 收敛）+ DnD 两域判别

- 沿用 dragging/busy/结果行三态；目标显示=folderScope 派生只读。
- **DnD 判别谓词**：内部行拖拽 dragstart 设置自定义 MIME（如
  application/x-synapse-paper）——左栏行仅响应该 MIME；OS 文件拖入
  （dragenter dataTransfer.types 含 Files）=导入整窗热区语义不变；文件
  悬停左栏行不响应（热区在窗体层）。busy 校验时点=dragstart 拒启+drop
  双重校验；**busy 上升沿即取消进行中拖拽**（高亮/ghost 即清——d1 复审
  N-2）；**busy 置位时点=导入 drop 接受时同步置位**（事件处理串行=窗口内
  无导航改写）；busy 期二次 OS drop=拒绝（三态沿用）。

## §3 各域规格（S 幕映射）

3.1 布局（S1/S6）：四栏=Rail 72（零变）→FolderNav 224→主区（导入条 42/
筛选行 46/列表 flex）→抽屉 316（零变）。左栏行=图标+名+mono 计数；选中
=accent-soft+左缘条 3px；结构=全部文献/未归档+分隔线+文件夹列表+底部
「+ 新建文件夹」。文献行五列零变+星标列（PaperRow 组件消费面=PaperList
单点实证——直加列零开关）。未归档空态=图标+双通道归档提示（S6）。
3.2 左栏操作（S2）：右键三件=重命名（行内）/删除（子标注「空图直删」）/
在脉络图中打开（P-8）。
3.3 标签下拉（S3）：钮=FilterBar 行尾「标签 ▾」（idle 灰→有选集 accent
「×N」）。面板 240px：头/列表（一行一勾选+色点+计数；8 行滚动+渐隐）/
脚（域计数+右键提示+清空已选）。**toggle 即时生效**（现行 P7E-06 语义
零变）；关闭触发=Esc/外点/钮二次点（Esc 层级=最上层弹层先关）。行右键
=改名+颜色（P-11；过渡期走全局 rename/set-color 通道）。过渡态：DB 窗口
前=全局标签集滚动承载；域化后上限/域集随 F-TAGS-02 生效——**面板结构
零改**（域切换 tagIds 处置=F-TAGS-02 批承接，见 §2.1）。
3.4 拖拽与导入（S4）：见 §2.3/§2.5。
3.5 文献行菜单（S5a/S5b）：菜单=在阅读器中打开/移动到文件夹 ▸（文件夹
列表+未归档）/删除文献（danger）。**批 A 版菜单=仅前两项**（删除项
批 B 点亮、星标项 DB 窗口点亮——P-10；不渲染禁用项=零死交互）。命中行
=按下即高亮。弹窗三要素=图名+连线数+连带面。
3.9 **e2e 锚清单（每幕≥2——真实文本/aria）**：S1 左栏「全部文献/未归档」
导航行文本+选中行 aria-current；S2 菜单「重命名/删除文件夹/在脉络图中
打开」三项文本+新建输入 aria-label；S3 面板「标签筛选/已选 N/清空已选」
+行勾选 role=menuitemcheckbox aria-checked；S4 drop 徽标文本「移入」+
导入条「导入到：〈名〉」；S5a「移动到文件夹/删除文献」+S5b 弹窗
「删除文献？」+「同时移除其节点与全部连线」；S6 空态句「未归档文献将出现在这里」+归档
双通道句「拖拽文献行至左侧文件夹，或右键文献行『移动到文件夹』」。

## §4 退役与承接清单

**退役**：FolderFilter.tsx（行为面七项迁移：三态置态/右键菜单/新建内联/
删除流/计数刷新/disappearedId 回退/S2 busy 禁用清单）；ImportTargetSelect；
TagFilter chip 形态；**FolderRenameDialog（重命名行内单源——消费面单点
实证）**。
**承接保留**：FolderMenu/FolderDeleteDialog/useFolderDelete；folderScope
契约+LibraryQuery；INV-87/88/53/85/86；PaperList/PaperRow/抽屉；
**TagDropdown 承接 TagFilter 全 props 签名（selectedTagIds/onFilterChange/
onMutated/onColorMapChange——注入链 FilterBar→LibraryPage 不变，徽标刷新
与色映射通道同源）**。LineageGraphSwitcher 已退役（零动作）。
**新增面**：FolderNav.tsx（≤250 拆件预案）；TagDropdown.tsx；PaperRowMenu.
tsx；papers delete 通道（repo+service+IPC+shared schema——无 DB 迁移面；
**src/shared 受锁面=[locked-change]**）；library.css 皮肤域；e2e 增幕。
**既有 e2e 影响评估**：FolderFilter/TagFilter/ImportTargetSelect 选择器
退役将击穿既有 spec 锚——批 A 简报前置「既有 e2e 依赖盘点清单」，迁移
随批 [locked-change][test-refactor]。

## §5 呈裁点（P-1..P-11——拟推默认，不回复默认成立）

| # | 呈裁点 | 拟推 | 备选 |
|---|---|---|---|
| P-1 | 左栏定位 | 库页内二级栏 | 全局栏 |
| P-2 | 左栏宽度 | 固定 224px | 可调 160-320+记忆 |
| P-3 | 文件夹行排序 | 创建序 | 名称/计数序 |
| P-4 | 标签下拉内搜索框 | 无（过渡期滚动承载） | 有 |
| P-5 | 标签溢出策略 | 面板内部滚动+20 上限兜底 | 折叠 +N/管理面板 |
| P-6 | 文献删除入口 | 仅右键菜单 | 行尾显式钮 |
| P-7 | 移动文献通道 | 拖拽+右键双通道（含未归档移出） | 仅拖拽 |
| P-8 | 「在脉络图中打开」入文件夹右键 | 加 | 不加 |
| P-9 | 星标过渡态 | 静态禁用占位列（**依据=布局锚稳定，DB 窗口点亮零重排；退出条件=F-STAR-01 点亮即激活**） | 隐藏列位 |
| P-10 | 批 A 菜单星标项 | 不渲染（**依据=无行为不入口，与 P-9 列位=布局锚分工；退出条件同 P-9**） | 禁用灰项 |
| P-11 | 标签行右键修改入口 | 改名+颜色双入口（set-color 既有通道） | 仅改名 |

## §6 视觉审记录（glm-look 三轮 B=0——glm 通道 401 降级 ds 单段申报）

R1 B0/W4/N8→4W 全修；R2 B0/W4/N5→4W 全修（S5 拆 a/b 帧）；R3 B0/W2/N5
→2W 顺手清（标签列 +N 截断=真实现同款/淡化 0.3）+遮罩全窗化。余 N 登记：
空值「—」=应用既有约定/S6 空态图标=语义即「未归档空」/菜单行间距/域字样精简。

## §7 对抗审处置表（d1 首审 B2/W7/N7——2026-10-02）

| 编号 | 判定 | 处置 |
|---|---|---|
| B-1 级联不对称 | **采纳（事实消歧）** | §2.4 统一级联契约：FK CASCADE 实证清单（001/003/004——lineage_nodes 004:15 级联+edges 随节点）+两分支同数据效果+withTransaction 同事务；孤儿节点担忧由 FK 消解但契约此前未声明=文档缺陷认领 |
| B-2 tagIds 跨域失效 | **采纳** | §2.1 补迁移条目（过渡期 tagIds 跨 scope 保留=现行语义；域化后处置=F-TAGS-02 批承接登记）；「UI 零改」改「面板结构零改」；下拉开态×folders.changed=刷新不强制关 |
| W-1 移动三缺口 | 全采纳 | §2.3 补：跨图边拒 toast/成功刷新规则（folders.changed+重载+选中抽屉两分支）/drag 期目标消失守卫/未归档=合法目标（setFolderId null 实证）+全部文献=非目标 |
| W-2 预检间隙 | 全采纳 | §2.4 补执行时点裁定（事务内重验权威）+单图约束声明（INV-88 单归属→节点恒单图，弹窗单数合法） |
| W-3 退役矛盾 | 全采纳 | 重命名=行内单源+FolderRenameDialog 随批退役（消费面单点实证）；TagDropdown 承接全 props 签名；busy 禁用清单含导航切换（§2.1） |
| W-4 输入面缺项 | 全采纳 | §2.2/§3.3 补：Enter/失焦/Esc+isComposing 全范式；下拉三关闭触发+Esc 层级 |
| W-5 DnD 判别 | 全采纳 | §2.5 判别谓词（内部 MIME vs Files）+busy 双重校验 |
| W-6 批次约束 | 全采纳 | PaperRow 单点消费实证零开关；批 A 菜单=仅两项（不渲染禁用项）；批 B src/shared=[locked-change] 口径明示 |
| W-7 测试锚 | 全采纳 | §3.9 锚清单+文案单源声明+既有 e2e 影响评估条目（批 A 前置盘点） |
| N-1 自裁未呈 | 采纳 | P-11 新呈裁（改名+颜色）；即时生效改正（去「关=生效」行为变更——现行即时语义实证） |
| N-2 引导态清单 | 采纳 | §2.1 隐藏面清单+解除时点 |
| N-3 P-9/P-10 张力 | 采纳 | §5 两点注依据+退出条件（F-STAR-01 点亮即双双激活） |
| N-4 ImportDropZone 耦合 | 采纳 | §4 批 A 前置消费者盘点条款 |
| N-5 ghost 文案 | 采纳 | 「{题名截断}→目标」+单选模型声明 |
| N-6 列序 | 采纳 | §3.1 补：搜索 290/年份/排序/弹性空档/标签行尾 |
| N-7 缺省图映射 | 采纳 | §2.1 表列补（undefined/unfiled→主图；folder→该图；回退→主图） |
| d1 不确定项#4 回复 | — | 溢出策略来源=票面③原文（候选=折叠/+N/滚动/管理面板）——在档非自裁 |

## §8 实施批次划分

- **批 A（纯 UI 形态，零 DB）**：FolderNav+FolderFilter/ImportTargetSelect/
  FolderRenameDialog 退役+FilterBar 收敛+TagDropdown（过渡全局集，全 props
  承接）+导入条+星标占位列+菜单两项版；**前置=既有 e2e 依赖盘点清单
  （FolderFilter/TagFilter/ImportTargetSelect 选择器面+ImportDropZone
  消费者清单）**。
- **批 B（papers delete 通道，无 DB 迁移）**：repo+service（withTransaction
  统一级联+事务内重验）+IPC+shared schema（**[locked-change]**）+删除流
  两分支+菜单点亮+e2e。
- **DB 窗口批（后置）**：F-TAGS-02 迁移 013+域化生效（**须回读本档 §2.1
  tagIds 过渡锚——域切换清空+面板刷新承接闭环**）+F-STAR-01 starred 列
  点亮（P-9/P-10 退出条件）。

## §7b d1 复审处置（2026-10-02 R2：B0/W3/N5 → PASS_WITH_CONDITIONS）

W-1 删除流并发收尾→§2.4 补收尾同 §2.3+回退护栏（仅当仍指向消失夹）；
W-2 行内重命名×外部刷新→§2.2 补输入保留+提交权威；W-3 S6 锚数→§3.9 补
归档双通道句；N-2 busy 上升沿取消拖拽→§2.5；N-3 busy 置位时点+二次 drop
→§2.5；N-4 过渡期锚→§8 DB 窗口批回链条款；N-1/N-5（行号复述/包内摘要
不可核）=呈裁包摘要形态所致，全文在档不缺——登记不改。
