# F-DOCGOV-01 门二审包（batch 27）

岗位：门二（实证终审，异构二审——你有仓读权限 Read/Glob/Grep，独立复算禁采信
转述）。前序档：门一=b27-gate1-report.md（PASS_WITH_WARNINGS B0/W2/N12——含
主控复核段）；实现报告=b27-docgov01-impl-report.md（§7 含 W1/W2 处置段）；
diff=b27-gate1-diff.patch（13 文件实质面）；简报=b27-docgov01-impl-brief.md
（ dispatched 原文，其「980 行 12 文件」笔误经门一 W1 勘正——以 impl-report
§7 与 gate1-report 复核段为准）。

## 票面（registry:317 F-DOCGOV-01+裁决书梯队五行）

文档补课批：体检 rubric=技能 08；范围=architecture 三结构+10 实体表+ADR 索引
+关卡清单/DEVELOPMENT §6 路径修正/README 导览/ADR-0005/0008/0014/0015 复审
追认/未定义特性 8 项/悬空承诺 3 项；**双强制条款**：①invariants.md 受锁
unlock→改→apply 单链；②ROADMAP 退役保 P7 锚段全集或改 check-tickets 取数源
**二者择一显式执行**；多窗口 INV 登记（裁决 7 附件性单例清单）；L2 锁线随票；
承接 INV-18/65 指针随迁+ai-sensor 段终态回写+「四通道委托」句。承载=主控代执
（ops-executor 两派 model-not-found——b27-executor-dispatch-fail.log；batch 26
增补三先例）。

## 审判义务（独立复算面）

1. **门一 12 项「不确定」销项**（你有仓读权）：INV-02 三处新行号
   （settings.service.ts:66/:79/reader.store.ts:319/import.service.ts:182 实码
   核对+旧值下沉史实）；notes.store 模块级结构=6（grep ^const/^let）；INV-70
   单例清单（zustand 11=create< 全域 grep+toast-store+annotation-undo 两模块
   态）；migrations=9 件；ADR-0020 落地日 git log（5ae8620484/2026-08-29）；
   batch 26 先例（feef686 提交信息内「executor flash 模型窗口不可用=回炉三分
   法主控级」句）；「INV-07 声明处已含 AGENTS 安全禁令」2026-09-03 扩列实锚
   （invariants.md INV-07 行声明处列）。
2. **双强制条款终裁**：①受锁单链合规性（invariants.md 恰三处改+INV-70 新行
   ——diff patch :931-980 核对+locks 379 终态）；②ROADMAP 方案 a——8 锚段
   byte 级保留独立核（退役页 docs/ROADMAP.md 实文 vs check-tickets.mjs:233-234
   regex）+M1/M2 证据链独立复算（b27-m1-*/b27-p7-anchors* 档）。
3. **文档事实性抽查**（文档批交付本体）：DEVELOPMENT §6 新路径 vs
   workspace-layout.ts/settings.service.ts 实码；ADR-0008 六结构+「结构数≠维度
   数」论证；ADR-0015 七通道 vs api-surface.ts 实文；ADR-0014 v1.2 注记 vs
   006 迁移实文；§8.2 legacy-fresh vs workspace-layout.ts 头注；§8.3 三键 vs
   ipc/ai_sensor.ts/services/index.ts。
4. **自裁 7 条终裁**（impl-report §3）+门一 N4「主控三分法追认」程序完备性。
5. **W1/W2 处置充分性**：订正数字复核（ADR-0020 wc/patch 头数/flake-ledger
   八线证据件 b27-flake-ledger-verify.log）。
6. **收口预批**：提交面=13 实质+manifest+relay+新 2+证据件 .log add -f；尾注
   裁定（受锁面=invariants.md+manifest+b27 探针三 .mjs → [locked-change] 单
   尾注；**[test-refactor] 禁用**——ci.yml:127-153 范围闸 TR 白名单无 src/**
   外文件、本票 diff 含 src/ai-notes-import.service.ts 注释行，挂 TR 必红，
   batch 26 P1-1 同裁先例）；翻票探针口径（锚定 `{ id: 'F-DOCGOV-01'` 行首
   定义形态——G10/b25 教训）。

## 机检基线（对账口径）

基线 verify EXIT=0（指纹门 183·1768·5368·skip14/open 4/locks 378）→终跑
verify EXIT=0（零漂移+locks 379+open 4+build 产物与基线同名同尺寸
index-DW6Z3WXp.js 1,388.14 kB）。e2e 不跑（文档批零行为——src 恰 1 注释行）。

## 产出要求

P0/P1/P2/N 分级（P0=Blocker/P1=收口硬条件/P2=注记勘正/N=登记）；回炉判定；
终判 GO / GO_WITH_CONDITIONS / NO-GO。≤150 行。禁修改任何文件。
