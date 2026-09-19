# F-DOCGOV-01 实现报告（主控代执——文档补课批）

## 0. 承载申报（先于一切交付陈述）

ops-executor（GLM5.3flash 绑定）派发两次均失败：`model-not-found
[selection=account:bigmodel-individual-coding-plan/GLM-5.3]`——与 batch 26
增补三同款实证（该批 executor flash 窗口亦不可用，门一 W4 裁=回炉三分法
主控级代执）。处置=**主控（GLM5.3 max 会话）代执本票全部改写面**，门审照常
k2+adjudicator 异构承载。证据档=scripts/audits/b27-executor-dispatch-fail.log。

## 1. 逐项销账表（体检源报告=surveys/2026-09-18_survey-doc-drift.md）

### 1a. architecture.md 漂移 A1~A6

| 项 | 处置 | 落点 |
| --- | --- | --- |
| A1 七表→十表 | ✅ §6 重写（001×7+003+004×2；演进列 005~009 一行注记含 008→009 反转） | architecture §6 |
| A2 features 缺两域 | ✅ §7.1 图 UI 行 +lineage+workspaces | §7.1 |
| A3 zcode 生态未上图 | ✅ §7.1 外部子图 +ZC 节点+文件协议虚边（ADR-0015/INV-26 指针） | §7.1 |
| A4 workspace 装配层 | ✅ §1 分层图 +workspace-layout/data-layer.container 两行 | §1 |
| A5 ADR 索引过时 | ✅ §5 重写为 0001~0020 逐件索引表+0010 空号注记行 | §5 |
| A6 关卡清单过时 | ✅ §4 重写：verify 八段链/quality 多段/tickets 规则 6/locks/model-names（如实标注未串链）/CI 附加 | §4 |

新增：§3 L2 锁线论证（通道名「域/方法」→`/api/域/方法` 天然映射——Word/WPS
插件共用命名，裁决书 L2 行）；§8 域结构速览三段（8.1 lineage/8.2 workspaces
含 legacy-fresh 双态补档④#7/8.3 ai-sensor 随 F-SENSOR-01 终态回写含 observe
注记）；§7.2 WIN 节点 +window-state（④#5）。行数纪律=**恰 300 行**（§2 改
指针+§7.8 指针化 AGENTS 环境事实+逐段压缩）。

### 1b. 顶层文档

| 项 | 处置 |
| --- | --- |
| C1 AGENTS 路径句滞后 | ✅ 安全禁令行补拖拽 webUtils+INV-07 指针（自裁-1，见 §3） |
| C2 DEVELOPMENT §6 双重过时 | ✅ 重写：`%APPDATA%\Synapse\workspaces\<id>\`（改名+分目录双改）+legacy-fresh 态注记+settings 字段实测三枚（contactEmail/theme/uiScale）+备份指引同步 |
| C3 README 关卡口径 | ✅ 「CI 六道关卡」→「八段链与 CI 同口径（architecture §4 指针）」（自裁-3） |
| README 导览 | ✅ +tools/ 行（ai-sensor CLI 域）+features 七域枚举含 lineage/workspaces+ROADMAP 标注已退役 |

### 1c. ADR 五件

| 件 | 处置 |
| --- | --- |
| 0005 | 选型表 Electron 行 33.4.11→42.9.3+维护节复审追认段（防御句有效+漂移成因） |
| 0008 | 复审追认段：discardGen 触碰事实（模块级结构实测 6=原五+discardGen）+结论=维持（代际守卫≠编辑元数据维度）+触发线重述（纯守卫性结构新增不触发但须登记） |
| 0014 | 修订记录 v1.2：DDL 交叉注记（初版快照声明+006 kind/UNIQUE 演进+INV-27 真相源指针；原文不回改） |
| 0015 | 修订记录：§2 通道清单 observe 追认（7 通道全景+observe 系 SR2-AI-08 预裁新增+三键演进指针） |
| 0020 新件 | 改名迁移 ADR 化（④#1）：决策+四分支幂等矩阵（行为单源=migrate-user-data.ts 头注）+时序+真机验证记录；R2-SH1 落地日=2026-08-29（git 5ae8620484 实查） |

### 1d. 未定义特性 8 项（survey ④）

| # | 项 | 处置 |
| --- | --- | --- |
| 1 | 改名迁移 ADR 化 | ✅ ADR-0020（上表） |
| 2 | observe 通道 | ✅ ADR-0015 追认+architecture §8.3 注记 |
| 3 | check-model-names 入宪法叙述 | ✅ AGENTS DoD 增行（如实标注「本地手动关卡未串链」）+architecture §4 |
| 4 | legacy-fresh 语义 | ✅ architecture §8.2 显式段+DEVELOPMENT §6 注记 |
| 5 | outbox 语义 INV 化 | ✅ 前批已落=INV-69（2026-09-19 F-TIME-02 补登）——本票核验引用，零新改 |
| 6 | window-state | ✅ architecture §7.2 WIN 节点（SR-INFRA-10 一句） |
| 7 | .mimosa 备案 | ✅ DEV-SETUP §1 尾注（宿主钩子产物+同类本机目录列举） |
| 8 | tools/ 导览 | ✅ README 目录导览+architecture §8.3 |

### 1e. 悬空承诺 3 项（survey ③——票面范围）

| 项 | 处置 |
| --- | --- |
| ADR-0010 空号 | ✅ 不写新件（史实：预留 INV-11/07 lint 化评估后经 F-LINT-01/CSS-03/F-LINT-04 实装，编号不复用）——处置落点=architecture §5 索引表空号注记行 |
| weak-anchor-register 销项段 | ✅ W-3/W-6/W-9 三笔移入已核销段（证据文字随表行搬运+修订说明句；表内划线行保持） |
| flake-ledger 历史收录归 W4 | ✅ 核验销账（零文件改动）：现 cases=8 与 W4 票面承诺八线一一对应（P7-A/F-R2e/z-r2e/tag-lifecycle/F-ARCH4-M1/F-G11/settings.png/corpus-export）——W4 已兑现，本票记核验结论 |

### 1f. 承接项 3 件（跨批交接）

| 项 | 来源 | 处置 |
| --- | --- | --- |
| INV-18/65 声明处指针 stale | batch 26 F-EXPORT-01 门二 N-1 | ✅ invariants.md 两行声明处列随迁 export-session-state.ts（F-EXPORT-01 现行宿主；bootstrap 接线留注） |
| ai-sensor 段随 F-SENSOR-01 终态回写 | 裁决书梯队五顺序约束 | ✅ architecture §8.3（三键七 handler 终态） |
| ai-notes-import「四通道委托」历史句 | batch 25 门二 N-3 | ✅ src/main/services/ai_sensor/ai-notes-import.service.ts:41-42 注释改现行态（**本票唯一 src 改动**——纯注释 2 行替换 1 行，零行为） |

## 2. ROADMAP 退役（裁决 8 强制条款②——方案 a 显式执行）

- 455→114 行退役一页纸：退役声明（真相源=交接书链+registry）+Phase 0~6 一行化
  +Phase 7 主线段+P8+ 候选池浓缩+B3 裁决段保留（tab-dirty.ts 等注释提名依赖）
  +执行纪律段指针化 AGENTS。
- **P7 锚段全集逐字保留**：`### P7-A：`~`### P7-E：` 8 标题行 byte 级原样
  （机器输入=check-tickets.mjs:247 `^### (P7-[A-Z])：`——原简报写 233-234 系
  行号 stale，门二 P2-1 勘正）；段正文压缩为
  ✅状态+战役报告/验收要点（lineage.spec/installer-smoke 等注释提名可解析）。
- check-tickets.mjs 零触碰（方案 a，未动取数源）。

## 3. 自裁申报（超票面/裁量，全部待门审裁）

1. **自裁-1 AGENTS 安全禁令句补同步（C1）**：票面 8 项未列，但 INV-07 声明处列
   2026-09-03 扩列时已含「AGENTS 安全禁令」而正文滞后（体检 C1 实证）——定性=
   已裁决现实的补同步非新制度（P7E-02 拖拽系用户裁决面），未引入新语义。
2. **自裁-2 architecture §7.8 指针化**（图→4 行散文+AGENTS 指针）与 §2 改指针：
   行数纪律（≤300）达成手段；信息零损失（AGENTS 环境事实单源在案）。
3. **自裁-3 README「六道关卡」口径句**：survey C3（票面未列）——与 F3 导览同
   文件顺手修正，指向 architecture §4 单源。
4. **自裁-4 INV-02 行号刷新**：survey D-1（票面未列）——三处证据点随重构漂移
   （ipc/settings.ts:52→settings.service.ts:66/:79 下沉；reader.store :90→:319；
   import.service :171→:182），旧值括注保留历史。
5. **自裁-5 ADR-0020 篇幅**（43 行 wc 实测——初写「47 行」未实测系计数纪律违例，
   门一 W1 勘正后订正）与文内日期取 git 实查（2026-08-29）；四分支
   矩阵从 migrate-user-data.ts 头注迁形（行为单源指针，非复制语义）。
6. **自裁-6 DEV-SETUP 备案顺带列举 local-state-backup/dist_new**（F-STOR-01
   处置面预告——一句非扩面）。
7. **INV-70 状态定档=「部分」**（诚实口径：单实例锁=index.ts:10 代码防线无专门
   测试；清单=声明性快照+随票补登义务）。

## 4. 计数实测表（落笔时点机器实测）

| 计数 | 值 | 实测方式 |
| --- | --- | --- |
| architecture.md | 恰 300 行 | wc -l |
| ROADMAP.md | 455→114 行（+78/−419 git diff） | wc/git diff --stat |
| ADR 现役 | 18 件+0010 空号+0020 新=20 号位 | ls docs/adr |
| 数据实体表 | 10（001×7+003+004×2）；migrations 9 件 | ls migrations |
| notes.store 模块级结构 | 6（原五+discardGen） | grep ^const |
| 渲染层模块级单例 | zustand 11+toast-store+annotation-undo | grep create</^const/^let |
| src b3 头指针 scope | 7（A/B/C/E/F/G/H）；ROADMAP 锚段 8 | b27-p7-anchors.mjs 实测 |
| INV 册 | INV-01~69 存量+INV-70 新登 | grep |
| 改动文件 | 13 实质改（patch 13 个 diff 头 grep 实测——初写「12/14」两处口径笔误，门一 W1 勘正）+manifest/relay 板面 2 件+新 2（ADR-0020+探针） | git status/grep |

## 5. 验证退出码汇总（全部物理落档 scripts/audits/b27-*）

| 关 | 结果 | 档 |
| --- | --- | --- |
| 基线 verify | EXIT=0（指纹门 183·1768·5368·skip14/open 4/locks 378/build 绿） | b27-docgov01-verify-baseline.log |
| 退役后 check-tickets 单跑 | EXIT=0（机器输入完好） | b27-roadmap-retired-tickets-check.log |
| M1 变异红证 | 红 EXIT=1（P7-H 标题降级→8 违规：SR2-LG 系票头指针失配）→cp 还原 diff=退役态保持→复绿 EXIT=0；备份件用毕即删 | b27-m1-mutation-red.log / b27-m1-restore-green.log |
| M2 锚段探针 | v1 缺 g flag 失败（TypeError——失败输出留档 v1-fail）→v2 EXIT=0：8 锚段⊇7 scope | b27-p7-anchors.log / -v1-fail.log / .mjs |
| invariants 受锁单链 | unlock→改→generate→apply×2（M2 探针修 bug 一轮）——locks 378→379（b27-p7-anchors.mjs 入锁）→即时 apply 每轮 | 命令面在批次日志 |
| 终跑 verify | **EXIT=0**：指纹门 183·1768·5368·skip14 零漂移+locks 379 一致+open 4+build 绿（renderer 产物与基线同名同尺寸 index-DW6Z3WXp.js 1,388.14 kB——src 注释行零 bundle 影响直证） | b27-docgov01-verify-final.log |
| e2e | 不跑（文档批零行为口径——src 恰 1 注释行 2 行替换；义务不适用） | — |

## 6. 遗留与移交

- survey ③ 其余悬空项（P7E-04 还原项/ADR-0013 条件复审快照/ADR-0015 D
  utilityProcess P8+ 候选）不在票面三件内——留 F-PROC-01/后续场次裁量。
- audit0-findings.md 头部「唯一登记处」声明失真（survey ⑤）不在票面——
  移交 F-PROC-01（制度批）裁量。
- INV-27 单条近 900 字超登记册形态（survey D-2）——不动（历史叙述红线），
  移交 F-PROC-01 评估是否拆 ADR 化。

## 7. 门一 W1/W2 处置段（勘误留痕——2026-09-19 门一审后）

- **W1（归档计数三处失准）**：门一裁成立。订正=本报告自裁-5（47→43 行 wc
  实测）+§4 表（14 改→13 实质改+板面 2+新 2，13 diff 头 grep 实测）；已派发
  简报（b27-gate1-brief.md「980 行 12 文件」）不回改——勘正记录在
  b27-gate1-report.md §主控复核段 1（patch 980 wc 行/门一 Read 981=末行换行
  口径差并存留档）。
- **W2（flake-ledger 已兑声明无证据）**：门一裁成立。补件=b27-flake-ledger-
  verify.log（node JSON 提取 cases=8 逐线输出+EXIT=0）——八线与 W4 承诺
  一一对应现可包内复核。
