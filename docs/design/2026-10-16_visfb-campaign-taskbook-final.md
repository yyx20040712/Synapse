# 视检反馈战役任务书（最终版）

> 生成：2026-10-16 视检反馈规划场（链路=主控预挖→5×k1 调研→d1 烤验 GO_WITH_CONDITIONS
> →07 施工方案 v1→用户五项裁决→k1 全局细化 v2→d1 终审 GO_WITH_CONDITIONS(B4/W6/N3)
> →主控终裁归并=本档）。批档=仓外 scripts-audits/20261016-visfb-plan/00-10 号件。
> 本档=开工单源：每批立票以本档票面为底，正式立案=开工时主控动作。

## §0 裁决基线（全部锁定，禁重新发明）

1. 切 tab/关 tab 未保存内容=**立即保存**（翻 registry C-A3 旧裁「tab 关闭路径弃改收口」）；
   退出应用=握手保存（含超时/重入/降级三件套）。workspace switchTo 弃改路径**维持现状并
   申报**（不扩大翻案面——d1 W4 建议采纳）。
2. 保存指示图标：dirty=彩色可点（点击即存）/saved=灰色 disabled/saving=spinner 禁用/
   failed=红+短文本可点重试（禁仅颜色区分）；aria/title 保留。
3. 自动保存节拍=**600s** 共享常量（落 `src/shared/constants.ts` 单源，受锁 [locked-change]
    ——d1 终审证伪基线联动担忧，dup-constants.baseline entries 空，新命中即红=单源成立）。
4. 选区语义=鼠标位置+栏布局判定；跨双栏需指针明确入栏授权。
5. 悬浮笔记=纯画布节点**不关联任何文献**（无 paper_id）。
6. 标签按钮=**维持既定设计**（checkbox 勾选筛+文件夹隔离）——「失能」销项（veil 覆盖等
   次要点一并挂产品销项登记，d1 N1）。
7. 图表提取=**只做真图表（嵌入图像 XObject）**，页快照路线否决（矢量图漏检=接受边界）；
   renderer 提取+IPC 回存路径；PaperImageExtractor 旧方案随批原子退役。
8. 翻译=尾批（用户指示非翻译优先）；谷歌免费端点**本环境实证不可用**（直连超时+代理
   sorry 页 4 变体全灭，批档 10 号）——通道重开，候选=官方付费 API/本地 Argos/复用已配
   LLM 供应商（末者隐私口径需用户重裁，d1 N2）。
9. 并行统筹=四泳道方案（§3），**多 worktree 并行授权=待用户裁**；未授权回退「批次串行、
   批内多票单 executor 连做」，不做单树伪并行。

## §1 反馈项→票映射表（17 项实测对账——d1 W1）

原图一 3 项+图二 2 项+图三 3 项+图四 6 项+补充 3 项=**17 项**（v204 时代 15 项计数系
补充未入的旧口径，勘正）。

| 反馈 | 票 |
| --- | --- |
| A1 已保存→图标 | 13 |
| A2 自动保存节拍 | 11/14 |
| A3 跨栏恶性选择+闪烁 | 51/52/53 |
| A4 删「已保存」字样 | 13 |
| A5 按钮重排（保存/删除右上/取消上移） | 13 |
| B1 文献库侧栏拖动 | 41 |
| B2 图表预提取挂载 | 00B/42/43 |
| B3 标签按钮失能 | 销项（§0-6） |
| C1 缩放乱图 | 00A/31 |
| C2 画线不退出 | 21 |
| C3 悬浮笔记 | 61/62 |
| C4 聚焦邻接不暗化 | 21 |
| C5 候选槽不显示 | 22 |
| C6 框底跟随一小段 | 22 |
| N1 图例删除 | 21 |
| N2 hover 线名 | 23 |
| N3 翻译 | 尾批 T01-T06 |

## §2 四泳道冲突矩阵

| 共享面 | 共改票 | 处置 |
| --- | --- | --- |
| registry.ts、docs/invariants.md、locks manifest、test-surface baseline/exemptions | 全部 | 主控单写、逐票串行；不计入并行授权 |
| App.tsx、api-surface.ts、schemas.ts、events.schemas.ts、preload、bootstrap | 14、42、43、61、尾批 | 组合根/IPC 合同锁：43→14→61→尾批，禁同窗合入 |
| lineage.store.ts、lineage-write-queue.ts | 14、61；62 消费 | 14 先改 `save(): Promise<void>`，61 后做 |
| TimelineYears/LineageTimeline/useDrawLine/EdgeOverlay/card-drag-session/theme-lineage* | 21、22、23、31、62 | 脉络泳道内串行 |
| SelectionLayer/selection-evaluate/release-affinity/selection-paint | 51、52、53 | 选区泳道内串行 |
| snapshot.repo.ts + export/import-snapshot 服务件 | 61（42 经终裁后零改快照面） | 61 单触，无并行冲突（d1 B2 归并后） |
| theme-shell.css | 计划零改 | uiScale 只读合同，C1 不换 zoom 载体 |

四泳道=保存/脉络/库图表/选区；同泳道串行，同波次跨泳道票文件集两两不相交。

## §3 多执行者并行统筹协议（d1 B4 修正后终裁版）

**前提：多 worktree 并行=用户授权位（§0-9）。**授权后按本节执行；未授权回退串行。

1. 主控预建隔离 worktree（每 lane 一树，独立 node_modules/dist/userData/证据目录）；
   executor 仍禁 git/registry/派发子代理。
2. **隔离树内禁跑 locks:check/test-surface:check/全量 verify**（受锁面一改必红——主控
   单写原则）；树内门=lint/typecheck/定向测试+全量首红→绿→变异红证（变异只文件备份法）。
3. **每票集成后主控把 main 同步回各 lane worktree 才允许下一票开工**；冲突裁决权=主控
   （基线漂移机械收敛点）。
4. **e2e 全局单令牌串行**（VMware 环境级 flake 族在案）；门一可并行审自包含 diff 包；
   门二实证与主控集成 verify 串行。
5. 主控逐票显式路径 staging（新文件仅 diff 包生成时 `git add -N`，禁 `git add -A`）。
6. **首波只起 2 条泳道**（建议保存+脉络）实测磁盘/npm ci/集成成本后再扩 4 道。
7. 收益预期（d1 量化）：上限≈33%（收敛步重时降至≈17%）——并行=可选优化非必需，
   资源紧张时随时降级串行（主控可裁）。

## §4 控制注记（随首笔实现提交落 registry）

- **C-A3 翻案**：撤销「关闭 tab 确认后默认弃改」→「先 flush 最新值，成功才关闭；discard
  仅供用户显式放弃」。INV-50/106 同步修订；历史归档（tickets/archive/C-A3.md）追加
  superseded 指针；QUIT_CONFIRM_MESSAGE（main-window.ts:206-208）文案同族改值；关 tab
  异步化后的重入锁（连点关闭叉=双 flush 防护）入 14 票面。
- **标签销项**：维持 checkbox 勾选+文件夹隔离；「按钮失能」按既定交互销项（挂产品销项
  登记，含 veil 覆盖次要点）。
- **翻译探针销项**：谷歌免费端点实证已完成（批档 10 号），不重复立探针票。

## §5 票面全集

所有票 `owner: strong`，area 取 registry.ts TicketArea 枚举；新测试 always-active 先红
后绿+断言级变异红证；受锁面 [locked-change]。

### 批 B0：探针与前置（全主控/探针件，驻仓外）

- **00A｜lineage｜C1 zoom 探针**（80-120 行，只读）——三档 uiScale×代表画布 z 实测
  gBCR/offsetWidth/computed width/pointer 往返；产出**唯一 effective-scale 公式**经「主控
  接手单」写入 31 票面引用段；假设被推翻即触发重开票门（d1 W2）。
- **00B｜reader｜XObject-only spike**（120-200 行，只读+仓外探针）——验证 image XObject
  枚举/解码/CTM bbox/去重/IPC 字节载荷；**禁 page.render**；确定嵌套 Form/SMask/inline
  image 排除边界+资产上限+过滤阈值（同走主控接手单入 42）。
- **0C｜主控｜双栏 PDF fixture**（d1 W3）——含左右栏哨兵文本的测试资产落位 tests 资产面
  +可加载验收；52 探针/53 e2e 的 gating 前置。

### 批 B1：保存族（保存泳道）

- **11｜reader｜笔记核心**（120-180 行）——`shared/constants.ts`+`notes.store.ts`：
  `AUTOSAVE_DEBOUNCE_MS=600_000`；flush/flushAll/saveNow 可等待；保留 loadedOnce 首载
  合并门控。验收：599999ms 不写/600000ms 恰写一次/在途新输入后再写最新值。INV-141。
- **12｜reader｜批注核心**（180-280 行，←11）——`use-annotation-draft.ts`+
  `AnnotationPopups.tsx`+草稿/flush 注册表：卸载后可重试的最新草稿；取消/Escape/切目标
  先 flush；删除跳过 flush 且防迟到写复活。验收：失败草稿可重挂载重试。
- **13｜ui-kit｜四态图标与布局**（150-220 行，←11/12）——共享保存钮+`save-status.ts`+
  `AnnotationEditor.tsx`+`ReaderNotesPanel.tsx`：四态图标（§0-2）+保存/删除右上+取消上移
  （A4/A5 同票）；title/aria-label/aria-live 保留；键盘与 disabled 验收。
- **14｜infra｜tab 收口、全局状态与退出握手**（300-450 行，←13/43）——`StatusBar/App/
  TabBar/tab-dirty`+main-window+system IPC+共享 IPC/preload/bootstrap+`lineage.store.
  save(): Promise<void>`：切/关 tab flush-first（C-A3 翻案落法）；退出握手**三件套=有限
  超时+超时回现状 confirm/destroy+flushing 重入锁**+完成后最新 dirty 判定；不旁路 lineage
  队列。d1 W4 四点全入票面（switchTo 申报保留/关 tab 异步重入锁/失败分支交互文案/
  QUIT_CONFIRM_MESSAGE 改值）。INV-141；修订 INV-22/50/106。

### 批 B2-B3：脉络行为与 C1（脉络泳道）

- **21｜lineage｜C2+C4+N1**（120-200 行）——`useDrawLine/LineageTimeline/TimelineYears/
  EdgeOverlay`+focus-dim 纯函数+删图例死样式：两种画线手势成功后工具保持（**登记设计
  §2.4 偏差**——useDrawLine.ts:321-322 现引「建边后回 select」，d1 W5）；`bright=focus∪
  双向一度邻接`。INV-145。
- **22｜lineage｜C5+C6**（120-200 行，←21）——先真实浏览器候选槽可见性探针；C6 未拉伸
  底缘连续 `pullDistance` 去 +82 上限（保留触发带语义）；**INV-140 定性=回归保护**（非
  修订）；点名 INV-100 的 94=12+82 CSS 值耦合（theme-lineage.css:158）随 pullDistance
  改写；INV-98/100 回归面。验收：超 +82 再拖两段 extend 保持且框底单调。
- **23｜lineage｜N2 浏览态线名**（80-150 行，←22）——`EdgeHitLayer/EdgeOverlay`+tooltip：
  browse 启用边扫描 rAF 节流；**INV-97 复核申报**（命中层不截获指针义务，d1 W5）。
  验收：hover 显示真实 label、移出消失。
- **31｜lineage｜C1 effective viewport scale**（250-400 行，←00A/21-23）——capacity/
  timeline-zoom/edge-overlay-geom/画线调线拖拽坐标消费+脉络皮肤：uiScale 入量测/路由
  重算键；不全局改义 `contentScale()`；00A 公式入票面。验收：三档 uiScale 卡矩形两两
  零交+文本不越卡+坐标往返≤1px；DRAGREMOUNT/锚点/落点回归不红。INV-144；修订
  INV-39/96/SLOTGRID-01。

### 批 B4：文献库与图表（库/图表泳道）

- **41｜library-ui｜双侧栏拖宽**（150-220 行）——`LibraryPage/library.css/
  library-explorer.css`+宽度 hook：separator/pointer capture/方向键/双击复位/校验持久化；
  delta 按实测 gBCR/offsetWidth 折算 uiScale。验收：三档缩放下中列不塌+刷新保持。
  INV-147；修订 INV-73 的 1134 前提（W6 塌列面）。
- **42｜db｜派生图表资产合同**（350-550 行，←00B）——新迁移 `023_paper_figures.sql`+
  `figure_jobs` 状态表（**终裁 B3 落法：papers 零新列；两表均派生不入快照 TABLE_SPECS，
  恢复后 jobs 重置 pending 重提，failed≠empty 可区分**）+repo/figure-store+app-file 协议
  `app-file://<paperId>/figures/<figureId>` 新分支（PDF 分支逐字节兼容）+删除链清资产
  （**INV-133 扩面申报：硬删语义+deletion_events 关系**，d1 W6；[locked-change] 点名
  file-store/app-file 受锁件）。验收：资产原子写+路径越界拒绝+文献/文件夹删除清资产+
  恢复无「ready 但资产缺失」。INV-143。
- **43｜reader｜XObject 管线、消费与旧方案原子退役**（550-750 行，←42，**票内单元化+
  前置设计单**；不可拆——先例 F-LGRAPH-01「先删不加=中间态」）——新 main 任务服务+
  renderer FigureExtractor+App 提取桥+import 挂点+IPC/events+DrPaperInfo/SidePaperInfo/
  PaperInfoSection/PdfDocProvider+ESLint 白名单换名+删 PaperImageExtractor 及旧测试
  （FILE 级 test-surface 豁免）。job 携 paperId/pdfSha/workspace 代际防迟到回写。
  **INV 修订/退役节（d1 B1）**：INV-16（白名单第五件换名+eslint.config.js:71-96 双处+
  行 78 文案）、INV-135 退役承接（FigureExtractor 新锚替代句柄三则）、INV-136（信息区
  props 换源）、INV-139（双连接件互斥改写）；防线撤并走 defense-lifecycle 登记行。
  验收：导入后出真实图表 `<img>` naturalWidth>0+断网不现场渲染+raster 正例/矢量页零提取。

### 批 B5：选区（选区泳道）

- **51｜reader｜栏几何纯函数**（180-220 行）——新增 selection-column-layout+测试：左右/
  反向/中缝/全宽标题/单栏/零盒/旋转盒/DOM 视觉序交错；中缝不授权。INV-142。
- **52｜reader｜指针授权手势**（180-260 行，←51；gating=0C）——新拖选控制器+
  SelectionLayer/selection-evaluate/release-affinity：mousedown 记锚栏/mousemove 只写
  ref/visual-full-mouseup 共用 effective selection。**B4 加严**：先实证浏览器归一化；
  canonical signature+drag epoch 限写（自身写只抑制精确匹配事件）；S5 窗不吞外部选择；
  归一化振荡有界退出。
- **53｜reader｜闪烁收口**（100-180 行，←52；gating=0C）——统一快慢 effective
  boundary+同签名禁重复 paint（按 d1 改述归因：回退 DOM 家族+校准时机）；双栏哨兵验证
  quote/paint/anchor 同源；>200ms 停顿无空帧/双几何交替。

### 批 B6：悬浮笔记（保存泳道尾）

- **61｜db｜floatingNotes 数据与会话面**（350-550 行，←14/43）——迁移
  `024_lineage_floating_notes.sql`（id/folder_id/x/y/content/时间戳，**无 paper_id**）+
  shared lineage 契约+repo/service/IPC+store/write-queue/undo。**d1 B2 补全面**：
  snapshot.repo.ts（TABLE_SPECS 九键→十表+头注教义同步）+export/import-snapshot 服务件
  +受锁测试 [locked-change]；**域删级联入链**（删夹全域删）+import 防复活 entity 过滤。
  修订 INV-94/132；INV-146。
- **62｜lineage｜画布悬浮笔记 UI**（180-280 行，←31/61）——BoardMenu/Timeline+
  FloatingNote 组件+皮肤：右键空白按 effective scale 换算内容坐标创建；笔记右键删除；
  创建/编辑/删除保存后 reload 仍在+folder 隔离。**首版拖动/可用模式=用户呈裁项**
  （未裁只阻塞本票）。

### 尾批：翻译（通道裁决后启动，非翻译批次不停等）

T01 provider+zod+host ADR（候选含**复用已配 LLM 供应商**——隐私口径用户裁）→T02 限速
取消队列→T03 坐标分段器→T04 缓存表（全维失效+断点续翻）→T05 对照切换视图（←53，
不改 TextLayer）→T06 设置面+三排除面负向测试。INV-148。规模与细则=批档 08 尾批节。

## §6 波次表（B0-B6；同行可并行；控制面始终串行）

| 波次 | 保存泳道 | 脉络泳道 | 库/图表泳道 | 选区泳道 |
| --- | --- | --- | --- | --- |
| B0 | — | 00A | 00B | —（0C 主控全域） |
| B1 | 11 | 21 | 41 | 51 |
| B2 | 12 | 22 | 42 | 52 |
| B3 | 13 | 23 | 43 | 53 |
| B4 | 14 | 31 | — | — |
| B5 | 61 | — | — | — |
| B6 | 62 | — | — | — |

## §7 测试防线总表

| 票/INV | 可执行断言 |
| --- | --- |
| 11-14/INV-141 | fake timers 边界；首载×编辑×在途×失败跨格；切 tab/关 tab/取消/卸载/退出均存最新值；quit 二次 close 仅一发+超时可降级；重启后 textarea 真实文本一致 |
| 21-23/INV-145 | dimSet≡all−(focus∪neighbors)；连画两条仍 armed；图例零残留；超 +82 两段 extend 单调；browse hover 真实 label |
| 31/INV-144 | 三档 uiScale 矩形相交数=0、文本盒⊂卡盒、坐标往返≤1px；DRAGREMOUNT/锚点/落点回归不红 |
| 41/INV-147 | 三档缩放拖宽/键盘/双击/刷新持久；delta 折算正确；中列与题名不塌 |
| 42-43/INV-143 | raster 正例/矢量零提取/logo 公式装饰过滤/去重/单页失败 partial；静态负锚禁 page.render/250ms 轮询/fileUrl 触发；stale job/删除/恢复/幂等；e2e naturalWidth>0 |
| 51-53/INV-142 | 未授权 quote/paint/anchor 无他栏文本，入栏出现退回消失；canonical signature 写≤1；S5 不吞外部选择；慢拖逐 rAF 无空帧 |
| 61-62/INV-146 | 无 paper_id 类型/DDL 锚；undo/redo/save 往返；folder 隔离+域删级联；快照导出导入往返+防复活；reload 后三操作正确 |
| 尾批/INV-148 | 缓存键全维失效/失败不写成功缓存/取消保序；TABLE_SPECS、corpus md/fulltext/manifest、EPOCH_TABLES、ai-tail 均不含译文 |

视觉票另做真实数据量截图/DOM 复评；删旧测试先登记 test-surface 豁免（禁借方案退役静默
缩测）；INV 号 141-148 已核对无撞号（invariants.md 尾行=INV-140），迁移 023/024 已核对
链尾=022。

## §8 风险与未决

**待用户裁**：①多 worktree 并行授权（§3）；②悬浮笔记首版拖动/可用模式；③翻译最终
通道（含 LLM 供应商隐私口径）；④本战役与 v204 下载模块 B1-B8/REQFP 实施窗的排期统筹
（建议：本战役批 B0-B2 先行——用户痛点直击；下载模块乙案序随后穿插，B4 图表管线与
下载模块同在导入链，同窗设计对齐）。

**主控前置**：0C fixture；两探针接手单；泳道资源实测（磁盘/npm ci）。

**残余风险**：600s 窗崩溃/断电/强杀/renderer 卡死丢稿（三口不覆盖）；XObject 阈值待
00B 实证；并行 e2e flake 放大（单令牌缓解）；43 单票体量（票内单元化+设计单缓解）。

## §9 治理与成本注记

- 调研派发新口径（用户裁决 2026-10-16）：不设紧约束自由读面——本战役两链验证有效
  （d1 两轮各抓出五包/全局席盲区）；代价面实测=k1 全局席 2.08M tokens（122 reads）+
  d1 两席合计 3.15M——配额排程参考。
- 本战役规划成本：k1 六席 780,432+2,076,506=2,856,938；d1 两席 1,886,002+1,261,948=
  3,147,950；**合计 6,004,888 subagent tokens**（分席明细=批档 07 §7/08/09 头注）。
- 批档件目：00-index/01-05（五调研）/06（首轮烤验）/07（v1）/08（v2 草案）/09（d1
  终审）/10（翻译探针）。本档=唯一开工单源；与批档冲突时以本档为准（含 v2 草案的
  勘正：反馈计数 17 项、波次改称 B0-B6、veil 项改挂销项）。
