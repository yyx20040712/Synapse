# 门二实证终审简报：F-ALIGN-01 组织定版对齐（制度+配置复合批）

你是门二裁决部岗（实证终审）。门一（外部派发器 Kimi 链）三轮已毕：
首轮 FAIL B3W2N3→二轮 FAIL B1W3N4→三审 PASS_WITH_WARNINGS B0W2N4（W1/W2
已处置入报告终稿）。你的任务：独立复算关键数字+终裁放行判定（P0/P1/P2
分级）。你有仓库读权限——**亲读亲验，勿转述门一结论**。

## 审计对象（本批全部产出）

1. `AGENTS.md` 工作区改动（vs HEAD=2f104fafc4）：词汇映射表 6→12 数据行/
   三屋段门一通道句/ORG-SEG v1→v2——diff=`scripts/audits/align01-agents-diff.patch`（68 行，注意该 patch 生成于报告补句之前，报告文件不在 diff 内）；
2. `docs/reports/2026-09-18_align01-org-audit.md`（核查报告+切换呈批材料，新件）；
3. 门一审档：`scripts/audits/align01-gate1-{brief,report,brief2,report2,brief3,report3}.md`。

## 复算要求（关键数字逐项）

1. R 矩阵：`scripts/audits/align01-regression-{zero,r1,r4-recheck,r4-final}.log`
   四件亲读——R2a/R2b/R5/R7/R8/R9/R10 七 PASS+R4 首跑 FAIL（两子域）+R1
   PASS 3/3+R4 终态 PASS（cfg 545b6843a147 双侧一致+账本尾 26 行 ok:1）；
   「R1~R10 终态全绿」结论是否与四件证据吻合；
2. R3/R6 去向：报告 §2 查证链（R3 并入 R1'3/R6=门禁两翼）逻辑是否成立；
3. 账本断流：`.zcode/org-ledger.jsonl` 亲数（26 行态；synapse 末笔时间；
   新 ok 行 schema 字段齐全性）；
4. 预算机检：亲跑 `node "C:\Users\Administrator\.zcode\skills\ai-dev-org\scripts\check-constitution-budget.mjs" AGENTS.md`（工作区，Node 24）验证 599/600；
5. locks 面：`locks/manifest.json` 是否含 AGENTS.md（申报：不含=无锁义务）；
6. 宪法三屋段+ORG-SEG 与《裁决书》裁决 12/13 原文（docs/design/
   2026-09-18_complexity-governance-ruling.md §1 行 48/49）对照——条文四要素
   （绑定子代理主通道/$max 显式档位/健康探针+后备/runbook 择路权保留）
   双落点是否齐且不走样；
7. 成本账：流水 usage 数字（R1 in=3065/out=4415；门一三轮 routing 头）
   与报告 §8 是否一致。

## 终裁要点

1. 门一三轮攻击是否被处置真实闭环（含 W1/W2 终稿澄清句）；
2. 「v2 切换呈批材料」是否达到呈裁质量（前提= R1~R10 全绿证据链+实弹
   验证+追认项呈裁——报告 §7）；
3. 本批不实际切换（产出即勾项）与 relay.md 执行路由「已规划呈裁节点」
   的一致性；
4. 任何 P0/P1（放行条件）/P2（建议）。

输出格式：逐项复算结果+P0/P1/P2 清单+终裁（GO / GO_WITH_CONDITIONS /
NO-GO）。末行机读尾栏：`FINDINGS: P0=<数> P1=<数> P2=<数> VERDICT=…`。
