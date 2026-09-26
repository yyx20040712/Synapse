# 交接书 v64 —— 三主题战役 P3/P4 批收口（2026-09-27）

> 前承 v63。排程真相源=本档 §2；战役真相源=docs/design/2026-09-26_theme-trio-final-design.md §6 八票。
> 本批=昼批在场会话（用户在场），P3→P4 串行双票全链毕。

## §0 额度与预算预警

- 本批消耗（账本 .zcode/org-ledger.jsonl :135-146）：executor 11 units（P3 5+P4 6）/k 链 6（k1×3+k2×3）/d1 链 4/probe 18/adjudicator 2/orchestrator 6——门二与 probe 消耗为主。
- **门一健康事件**：k1 主源（Kimi K3）P4 场两跳 Provider 认证失败——按换源状态机降 k2 备源承载成功；下场开工前建议先健康探针一次 k1，仍败则直接 k2 起跳（状态机先例已入账本 :144）。
- **额度窗口**：本批已消耗较大；夜批如启动按 6 票下限目标评估池面（见 §2）。

## §1 批次完成情况（段间衔接基线——对不上禁提交）

| 项 | 终值（脚本实测） |
| --- | --- |
| verify | **171 件 / 1860 用例**，EXIT=0 |
| e2e | **Running 47 tests → 47 passed**，EXIT=0 |
| locks manifest | **253** |
| 豁免台账 | **110** 条 |
| 指纹门基线 | **192 文件 / 1911 用例 / 5820 断言 / skip 15** |
| 战役进度 | P1✓ P2✓ **P3✓（39eb0417a2f）** **P4✓（34aef60aa3f）**；P5-P8 open；T3-U1 挂账（P8 后）；F-TESTREF-S1/S2 open |
| 证据仓外档 | t3p3-gate-reports/ + t3p4-gate-reports/ + t3p3/p4-final-*.log（E:/zcode_md/synapse-archive/scripts-audits/） |

本批两笔主控域事故与教训（在档，防复发）：
1. **P4 实现者违规自作 6 笔提交**——主控 reset 恢复单笔收口流。教训已落派发模板：红线措辞收敛为「git add/commit/push 全禁」+要求实现者收尾自查 `git log` 非零自报。
2. P3 立案 area 枚举笔误（typecheck 红）——立案提交前最低限度补 `npm run typecheck`。

## §2 执行序（下一批次）

1. **F-TESTREF-S2（基线再生成机检对账）——P5 前强烈建议搭车或先行小票**：P5 为受锁重票必再生成基线，S2 触发条件已两次命中未搭车（P3/P4 均人工对账代位）；再不落地同类人肉失守风险复利。
2. **P5 脉络数据层（受锁重票）——立票前置三件**：
   a. **宪法设计链**：Kimi 拟定→deepseek 审双源复核（数据模型+迁移 011+lineage.json 导出）；
   b. **ai-sensor 解耦声明**：2026-09-20_ai-sensor-refactor-survey-and-plan.md（D1-D8 未裁）与 P5 在 lineage 侧板交叠——立票前出显式解耦声明呈报（交叠面=哪些归 P5/哪些归 ai-sensor 档，互不吞并）；
   c. **T3-P3 裁决部条件 C5 兑现**：P5 票面显式携带两升级点——(a) 文献库序号列升级真 catalog_no（消费面 PaperRow 序号+抽屉短号）；(b) month 落位后年月列升级+抽屉月框联动（library.service detail lineage month 恒 null 注释处自新）。
3. P6 时间线 → P7 连线（P7 立票同样走 Kimi→deepseek 设计链）→ P8 交互收口 → **T3-U1 挂账批**（用户裁决：保存事项战役末批统一处理，P8 之后）。
4. 夜批池面评估：P5 设计链+实现+门链一票即近夜批容量；建议夜批=P5 单票或 F-TESTREF-S2+P5 前段。

## §3 悬挂事项（用户知悉/裁决口）

- **【P2 级·推送期风险（裁决部独立发现）】** ci.yml 范围闸 TR_RE 白名单无 ^src/**：带 [test-refactor] 尾注且 diff 含 src 的提交推送必红。本地 main 领先 origin/main **284 笔**（origin=12f1a6f0 八月末），T3-P1/P2/P3 收口提交均双尾注+src diff——**下次 push 前须预扫+对存量违规笔 reword 去 [test-refactor]（rebase 改史需用户知悉裁决）**；T3-P4 已按裁 #25 用单尾注。
- 收口轮视觉细调备案（用户「后面细调」在案）：暗族 accent-ink 对比度 2.6:1（mockup 既定值）/扫描页 PDF invert 纯黑/textarea 逐族值差/tab·aside 底缘内缩量/PDF 图片负片化——细项全列 t3p4-gate-reports/t3p4-batch-record.md C5 节。
- 版本号显示位=用户未裁 open（T3-U1 票面）。
- P3 档次列：VENUE_TIER_MAP 种子 5 条，真实库多数「—」——数据扩充属 D3-A 受锁常量修订制（用户拍板口径）。

## §4 开工三态指针

HEAD=34aef60aa3f（P4 收口）。A 干净树=直接接 §2 首项；B 脏树=按票面补完门审；C 非交接提交=查门审在档。技能清点先行（宪法开工纪律）。
