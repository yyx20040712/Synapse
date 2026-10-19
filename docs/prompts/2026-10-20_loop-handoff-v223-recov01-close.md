# 交接书 v223 —— F-RECOV-01 闭批+CI 红修批+晨间复核呈用户节

> 取代 v222（2026-10-20 夜间收口笔）。本场=夜间定时任务场（automation-0f25d575，
> 2026-10-20 02:30 触发，kickoff v2 工序）：场A 未跑（无排程证据）→本场按不跳票
> 原则承场A 之票 F-RECOV-01 完整三屋闭批；另首动作核验发现 v222 后 F-DOCS-01
> 立票笔 CI 确定红→CI 红修批先行闭账（run 39304107430 success）。**用户晨间
> 复核节=§1-A（含两处披露式例外与五项呈报）——下场会话首动作呈达用户。**

## §0 本场总账（runId=20261020-nightb）

- **CI 红修批（e6115dfd）**：F-DOCS-01 立票笔 98165694 写入 area:'docs' 越出
  TicketArea 联合类型→run 39292735773 typecheck TS2322 确定红；根因=立票笔仅跑
  tickets:check（无类型面）即推送。修复=联合类型补 'docs' 一行（纯类型面；
  TicketArea 零外部消费方/工具无 area 校验/registry 不在 manifest——grep 实测）；
  k1 定点单审 B0W2N4 PWC；verify EXIT=0（405 文件/4201 用例）；CI 39304107430
  **success 亲验**。治理建议（k1-N1）=立票/翻状态流程最小防线纳入 typecheck
  单关卡——是否立项=用户裁决位。
- **F-RECOV-01 闭批（三屋全链+设计链三段）**：设计链=drafter v1/v2 两轮
  （31k+47k tokens）+auditor r1 B4W12N7/r2 B1W8N9 两返工+**主控终裁 v3 亲笔**
  （设计回炉 ≤2 上限后披露式例外——r2 全发现为可精确裁决簿记缺口；批档
  recoV01/design-final-r3.md）。交付=双阈值看门狗（T_slow 10s/T_stuck 60s 绝对
  deadline 逻辑弃置+ghost 迟到对账）+token 双账本+gen++ 同步弃置+bounded drain
  +main 链深界 D_max=8（queue-overflow 新 status——shared schemas 受锁扩联合）
  +探针保活（probePending 独立 flag/每代探针 ghost ≤1/到点核查未安息计失败
  观测不实发）+三档 chip（slow/stuck-pending/unavailable+重启缀）+拆件三新件
  （recoveryWatchdog/recoveryBackoff/recoveryEntry——scheduler 643 raw/492 eff）。
  对抗链=executor 三轮（TDD 先红 18+变异 13 针）+门一 k1/d1 双审**五回合**
  （两度同根收敛：gen++×在途接缝〔d1-B1/k1-W1〕+探针 ghost 界×W8 终态断链
  〔d1-B1/k1-W1'〕——R1-R9/F1-F8/C1-C5 全处置）+门二 probe 矩阵 8 单元全绿
  （407 文件/4252 用例+三针独立红证 cp 还原净）+adjudicator GO_WITH_CONDITIONS
  （C-a..C-g 全清偿：INV-171..174 登记+INV-166/167 扩展注+ADR-0029+registry
  翻面+manifest 550+verify 亲验+本档+批档补齐）。收口笔=本档（CI 回执见 §5）。
- 成本：drafter 78k/auditor 164k/executor 48.3M platform tokens（E3 欠账行在账
  ——意图档位 GLM5.3flash×环境随宿主）/k1 1.55M/d1 2.36M/probe 1.24M/
  adjudicator 1.17M subagent tokens——全量见 .zcode/org-ledger.jsonl runId 行。

## §1 下场序

1. **首动作=核本场收口笔 CI 回执**（gh api/run view conclusion；非 success 按
   同指纹立案线处置）。
2. **呈达用户=§1-A 晨间复核节**（用户 2026-10-19 §1-B 排程指定「明早检查」——
   两场交接增量+终笔 CI 回执）。
3. 取上位票：**F-RECOV-02（原场B 票——本场余量已尽未承）**按三屋模式完链
   （设计链走组织流程 Kimi→deepseek→GLM 终裁；回炉 ≤2）；其后按 §2 序推进。
4. F-DOCS-01 立票流程防线（§0 治理建议）待用户裁决。

### §1-A 晨间复核呈用户节（本场承载——逐项待裁决/知悉）

1. **披露式例外两处**（不构成自动先例）：①设计链终裁 v3=主控亲笔集成（回炉
   ≤2 上限后，r2 发现全为簿记缺口——批档 design-final-r3.md 头注申报）；②收口
   五处 N 级注释修=主控亲笔（免审口径——k1 微差确认后，probe 矩阵在修正后状态
   全绿兜底；清单=watchdog 头注序补全+「禁假告禁」笔误+hasProbeGhost 测试专用注
   +测试件两处时序注释更正〔弃置于 enter 内完成非 125000〕）。
2. **F-RECOV-01 遗留呈报**：①D 面裁出（startupScan hang 不治理=应用启动治理域
   另立票——是否另立=裁决位）；②三档文案族定稿（slow「恢复副本写入缓慢，正在
   等待磁盘」/stuck-pending「恢复副本写入状态未确认，正在重试确认」/unavailable
   现文案+probeFailStreak≥3 加缀「重启应用可恢复」）；③参数初值（T_slow 10s/
   T_stuck 60s/D_max 8/PROBE 5-15-30-60s——非安全攸关，对账兜底，可调）；④
   pendingChip×degraded 单 chip 位=pending 优先+与 unavailable 并列（双并列需
   裁决）；⑤snapshot 语义分叉理论抑制环=d1-N4 登记观察（包外不确定，未处置）。
3. **本场排程事实**：两个夜间定时任务实际只派了 02:30 一场（场B 时点）——
   场A 票由本场承（不跳票）；F-RECOV-02 未承留下场序 3。
4. **计数更正两句**（裁决部复算发现）：①impl-report 回炉轮2 叙事「watchdog
   新 API 用例两则」与实测 +1 差 1（终态正确，叙事口径疵）；②probe 报告时间
   戳组（04:5x）与实现批时间线（06:3x-08:5x）冲突——内容指纹（S16c/S17/F8
   同代锚+4252 全量）证明实测对象=终态，时钟偏移/笔误待定因，数字结论不受影响。
5. **行数差 1 核销**：impl-report 自报 scheduler 644raw/493eff vs probe 643/492
   ——末行换行口径差（批档在案）；双测点均 ≤500 合规。

## §2 测试版本路线（更新：序 1 前半 done）

| 序 | 票 | 内容 | 状态 |
|---|---|---|---|
| 1 | F-RECOV-01/**F-RECOV-02** | 数据安全双票 | 01 **done（本场）**/02=open 下场首取 |
| 2 | F-LINEUI-01 | 横向 autoscroll+sticky | done（v222） |
| 3 | F-DOCS-01 | 文档群可读性治理 | 已立票（夜队后首位） |
| 4 | F-SNAPCLEAN-01 | 旧九表兼容清除 | 已裁清 |
| 5 | F-TESTLOCK-01 | 测试锁分级+成本阀成文 | 已批 |
| 6 | F-EVCTX-01/F-DETOURW-01 | e2e 取证保号/走线 1.2px | 工程债 |
| 7 | F-VISFB-53CI-02 | 选区快慢双几何+鼠标投影语义 | 设计就绪 |
| 8 | **dist 测试版** | npm run dist 打包+版本号；用户首用轮 | 终点 |
- 压着不阻塞：F-WINGUARD-01、F-E2EFLK-01（observing）、F-REQFP-01、
  F-SNAPHINT-01（首用轮）。
- 新增观察：snapshot 语义分叉（d1-N4）挂 F-RECOV-01 批档 observing。

## §3 治理注记（本场增量）

1. 门一双审五回合两度同根收敛（gen++×在途接缝/探针界×终态）=双源对抗有效再证；
   k1 席 MODEL-SELF=new-provider/k3$max（kimi-third 座以 k3 承载——宪法明许，
   裁决部登记知悉）。
2. 立票笔类型面缺口（CI 红修根因）——防线建议=立票/翻状态最小跑 typecheck
   （k1-N1）。
3. agent output.txt 随续跑覆盖=批档原件丢失形态——续跑型岗位报告**即轮归档**
   （本场两件由主控自上下文补写——coordinator 纪律新增）。
4. probe 时间戳组异常（§1-A-4②）——VM 时钟面 observing。

## §4 沿承挂账

- v222 §4 沿承面不变（test-surface 基线再生成→F-TESTLOCK-01；L 系；53CI-02
  设计就绪；open 池 F-RECOV-02/F-DOCS-01/F-SNAPCLEAN-01/F-TESTLOCK-01/
  F-EVCTX-01/F-DETOURW-01/F-VISFB-53CI-02/F-E2EFLK-01/F-REQFP-01/
  F-SNAPHINT-01/F-WINGUARD-01 共 11 张）。
- 批档=仓外 20261020-nightb（progress 总账+hotfix-k1 报告+verify 两份）+
  recoV01/（任务书/设计 v1/v2/终裁 v3/审核 r1/r2/门一六件/diff 四版/
  impl-report/gate2-probe 十四件）。

## §5 CI 回执

- CI 红修批=run 39304107430（e6115dfd）**success 亲验（04:0x）**。
- F-RECOV-01 收口笔（本档+registry+INV+ADR+manifest+13 件实现面）→触发 run
  **=下场首动作核验对象**（实现面 CI e2e 段覆盖本批无本地 e2e 义务——裁决部
  C-f 口径）。
