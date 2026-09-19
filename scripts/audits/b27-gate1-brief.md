# F-DOCGOV-01 门一审包（batch 27）

岗位：门一 gate1-reviewer（对抗式隔离一审，ops-gate1-k2/kimi k3 $max——用户
指令 k1 封顶 k2 承载）。diff 全文=scripts/audits/b27-gate1-diff.patch（980
行 12 文件 +290/−478 口径的实质面；manifest 12 行机械 hash 更新与 relay.md
心跳面不在 patch——前者摘要在本包 §6）。实现者报告=b27-docgov01-impl-report.md
（含 §3 自裁 7 条）。基线/终跑=b27-docgov01-verify-{baseline,final}.log。

## 0. 承载申报（对抗重点①）

ops-executor（GLM5.3flash 绑定）两派均败 model-not-found
[account:bigmodel-individual-coding-plan/GLM-5.3]（档= b27-executor-dispatch-
fail.log）——**主控（GLM5.3 max 会话）代执全部改写面**，batch 26 增补三同款
先例（该批门一 W4 裁=回炉三分法主控级）。审点=代执是否弱化了实现面纪律
（侦察前置/计数实测/自裁申报/受锁单链是否有主控自查盲区）。

## 1. 票面（registry F-DOCGOV-01+裁决书梯队五行）

文档补课批：体检 rubric=技能 08 文档群治理（事实分层/指针化/单源纪律）。
范围=architecture 补 lineage/workspaces/ai-sensor 三结构+数据模型 10 实体表
+ADR 索引到 0019+关卡清单；DEVELOPMENT §6 路径修正（误导备份硬伤）；README
导览补 tools/与 workspaces；ADR-0005/0008/0014/0015 复审追认；未定义特性 8
项补档；悬空承诺清账（ADR-0010 空号/weak-anchor-register 销项段/flake-ledger
历史收录归 W4）；**双强制条款**：①invariants.md 受锁 unlock→改→apply 单链
[locked-change]；②ROADMAP 退役一页纸必须保留 P7 锚段全集或 [locked-change]
改 check-tickets 规则 6 取数源**二者择一显式执行**（裁决 8）；多窗口 INV 登记
（裁决 7 附件性单例清单）；L2 锁线（api-surface 路由映射论证）随票。承接项：
INV-18/65 声明处指针随迁 export-session-state.ts（batch 26 门二 N-1）+ai-sensor
段随 F-SENSOR-01 终态回写+ai-notes-import「四通道委托」句（batch 25 N-3）。

## 2. 改动面（12 改+2 新，纯文档+恰 1 处 src 注释）

- **architecture.md**（244→恰 300 行）：§1+workspace 装配两行/§3+L2 路由映射
  论证/§4 关卡清单重写（verify 八段+quality 多段+规则 6+model-names 如实标注
  未串链）/§5 ADR 索引表 0001~0020+0010 空号注记行/§6 十表+演进列/§7.1
  features 七域+zcode 伴随进程节点/§7.2 WIN+window-state/§7.8 指针化 AGENTS/
  §8 新增三域速览（8.2 含 legacy-fresh 双态补档；8.3 三键终态+observe 注记）。
  压缩手段=§2 改指针（§7.3 重复）+§7.8 图改散文指针。
- **ROADMAP.md**（455→114 行）：退役一页纸（裁决 8 方案 a）——退役声明+Phase
  0~6 一行化+P7 八锚段**标题行 byte 级逐字保留**（正文压缩为 ✅+报告指针）
  +B3 裁决段保留（tab-dirty.ts:36 等注释提名依赖）+执行纪律指针化 AGENTS。
- **DEVELOPMENT.md §6**：路径双重修正（`%APPDATA%\Synapse\workspaces\<id>\`
  +legacy-fresh 注记+settings 字段实测三枚+备份指引同步）。
- **README.md**：导览+tools/ 行+features 七域+ROADMAP 退役标注；「CI 六道
  关卡」句改八段链口径。
- **AGENTS.md** 恰 2 处：安全禁令路径句补拖拽 webUtils+INV-07 指针（自裁-1）；
  DoD 增 model-names 行（票面项，如实标注本地手动关卡未串链）。
- **ADR-0005**（Electron 行 42.9.3+复审追认）/**0008**（复审追认：discardGen
  触碰+维持结论+触发线重述）/**0014**（v1.2 DDL 交叉注记，原文不回改）/
  **0015**（observe 追认）/新 **0020**（改名迁移 ADR 化 47 行——四分支矩阵
  自 migrate-user-data.ts 头注迁形，落地日 git 实查 2026-08-29）。
- **invariants.md**（受锁单链）：INV-02 行号刷新（自裁-4）/INV-18+65 声明处
  随迁 export-session-state.ts/新 INV-70（裁决 7 定性+附件性单例清单——
  zustand 11+toast-store+annotation-undo 实测枚举）。
- **weak-anchor-register.md**：W-3/W-6/W-9 移入已核销段（销项流程矛盾修复）。
- **src ai-notes-import.service.ts:41-42**：恰 1 注释行改现行态（「四通道委托」
  历史句→三键两通道委托；**唯一 src 改动，零行为**）。
- **DEV-SETUP.md**：.mimosa 备案+同类本机目录一句。

## 3. 未定义特性 8 项销账对照（survey ④）

改名迁移 ADR 化=0020｜observe=ADR-0015 追认+§8.3｜check-model-names 入宪法
=AGENTS DoD+§4｜legacy-fresh=§8.2+DEVELOPMENT｜outbox 语义 INV 化=**前批已落
INV-69（本票零新改，核验引用）**｜window-state=§7.2｜.mimosa=DEV-SETUP｜
tools/=README+§8.3。

## 4. 悬空承诺 3 项（survey ③票面范围）

ADR-0010 空号=索引表注记行处置（不写新件——史实+编号不复用）｜weak-anchor
销项段=三笔迁移落段｜flake-ledger 历史收录归 W4=**核验销账**（cases=8 与承诺
八线一一对应，零文件改动）。票面外悬空项（P7E-04 还原项/ADR-0013 复审/
audit0 头部声明）移交 §6 遗留——对抗点②：移交是否构成应做未做。

## 5. 验证证据（全退出码物理在档）

基线 verify EXIT=0（指纹门 183·1768·5368·skip14/open 4/locks 378/build 绿）
→改动→退役后 check-tickets 单跑 EXIT=0→M1 变异红证（P7-H 标题降级→EXIT=1
恰 8 违规 SR2-LG 系→cp 还原 diff=退役态保持→复绿 EXIT=0；备份用毕即删）→
M2 锚段探针（v1 缺 g flag TypeError 失败输出留档→v2 EXIT=0：8 锚段⊇src 7
scope，值全实测提取）→**终跑 verify EXIT=0**（指纹门零漂移+locks 379=b27
探针入锁+open 4+build 产物与基线同名同尺寸=src 注释零 bundle 影响直证）。
e2e 不跑（文档批零行为口径）。invariants 受锁单链 unlock→改→generate→apply
×2 轮（M2 探针修 bug 一轮——每轮即时 apply）。

## 6. manifest 与遗留

manifest +10/−2=hash 刷新+新增 b27-p7-anchors.mjs 一条（locks 378→379，
即时 apply 两轮）。遗留移交=impl-report §6（survey 票面外悬空+audit0 头部
声明+INV-27 巨条形态——归 F-PROC-01/后续裁量）。

## 7. 自裁 7 条（对抗重点③——impl-report §3 全文）

1. AGENTS 安全禁令句补同步（票面未列——定性=INV-07 已裁决现实的滞后补同步
   非新制度）；2. architecture §7.8/§2 指针化压缩（≤300 行纪律手段，信息
   零损失声明）；3. README 六道关卡口径句（票面未列同文件顺手修正）；4.
   INV-02 三处行号刷新（票面未列——旧值括注保留）；5. ADR-0020 篇幅与日期
   git 实查；6. DEV-SETUP 顺带列举 F-STOR-01 处置面目录；7. INV-70 状态定档
   「部分」（诚实口径：代码防线无专门测试）。

## 审判要求

B（Blocker：事实失实/票面要件缺失/受锁违规/机器依赖破坏）/W（应改）
/N（注记）。重点拷问：①主控代执面纪律等价性；②ROADMAP 退役方案 a 的机器
输入完整性（M1/M2 证据链是否充分）；③自裁 7 条正当性（尤其自裁-1 AGENTS
宪法面改动）；④票面「ADR 索引到 0019」与实际到 0020（新件）的口径；⑤
「outbox 语义 INV 化/flake-ledger 归 W4」两项系前批已兑还是本票漏做。
