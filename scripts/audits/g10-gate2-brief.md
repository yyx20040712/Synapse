# F-GEOM-01-G10 门二终审简报（实证终审——M6b view 工具簇迁移·view 域收官步）

> 门二岗=ops-adjudicator（deepseek-flash $max 绑定）。你有仓读权限（Read/Glob/
> Grep）——**独立复算一切关键数字，禁采信任何转述**；证据件在 scripts/audits/
> g10-*（物理在档，EXIT 标记逐一亲读）。产出 GO/GO_WITH_CONDITIONS/NO-GO+
> P0/P1/P2/N 分级，中文全文直接输出（主控逐字归档）。

## ① 审查对象与口径

- 票=F-GEOM-01-G10（tickets/registry.ts:301）：M6b 13 件 git mv 迁
  `src/renderer/features/reader/view/`（1776 行 wc；Σ设计书 1789=+13 无尾换行
  口径，G11 对账债）。**view 域收官步：迁毕 reader 根=纯目录零文件**。
  [locked-change][test-refactor]。
- 声明态：零行为纯迁移——A 深度修正 33 行+B src 消费 1 行（App.tsx:7）+
  C view 域中间态边闭合 6 行+D tests 受锁面 21 行/14 件（18 import+theme.test
  字符串 3 行）+E config 零动作（eslint 四路径已全迁完——票面表述勘正在档）+
  F registry 8 行归主控收口（未做，预演面）。
- 门一（ops-gate1-k2）PASS_WITH_WARNINGS B0/W2/N5——报告=
  scripts/audits/g10-gate1-report.md（含主控 W1/W2 处置段）。
- 基线锚=g10-verify-baseline.log（G10_BASELINE_VERIFY_EXIT=0；open 11；指纹门
  187/1789/5411/skip15；Test Files 170；build 绿）。

## ② 待你独立复算/亲验的面（A-H 表）

A. **计数数学**：A33（5+1+11+2+7+7）/B1/C6/D21（18+3）/=61 行；44=33+11
  相对 import 全量；13 件 wc Σ1776；D 段 14 物理件清单；出边增量
  {anchors+5,state+11,interact+1,time+2,intra+24,up+7} 与 A/C 段数学闭合
  （g10-oneway.log vs G9 终态：anchors 14→19/state 18→29/interact 1→2/
  time 0→2/intra 26→50/up 4→11）。
B. **EXIT 物理标记亲读**：g10-{verify-baseline,midprobe,impl-verify,mutation1,
  mutation1-restore,mutation2,mutation2-restore,build-hash,locks-oneway,oneway,
  gitmv-status,rewrite-d,final-status}.log——逐一核变量法标记行真伪
  （mutation2 系 log 含 GBK 字节需 grep -a——实现者已注记）。
C. **收官核验亲扫**（本票特有，门一 N3/W2b 补偿面）：reader 根 ts/tsx/css
  文件数=0；view 域 `from '../` 直指根件形态（非 ../state//../anchors/ 等
  合法子域上溯）=0；五子域→view 反向边=0；旧径残留五通道（src+tests 全文：
  `features/reader/(13 名)` 旧根径 import/点径/别名/动态 import/vi.mock）=0。
D. **锁链复推**：manifest 364→365（b22-claim+g10-recon）→366（g10-oneway.mjs
  实现者首版）→367（v2 修正后重 generate？——以 g10-locks-oneway.log 与
  locks/manifest.json 现值亲核）；D 段 14 件逐件 unlock→改→apply 即时重锁
  声明（g10-rewrite-d.log 四元组对账行）。
E. **门一 W1/W2 处置核验**：g10-w1w2-closure.log（44 闭合逐件计数+第 11 行
  物理定位 ReaderSearchBox:31+e2e 旧径零命中）是否销项充分。
F. **tickets 清红预演**：实现面 tickets:check 红=恰 8 行（7 旧票 file+
  G10 自身）——registry.ts:301 G10 行+7 旧票行（:106/:109/:140/:141/:147/
  :237/:258）逐行核 file 字段旧路径；预演翻 done+7 行 file 随迁 view/ 后
  清红（规则 1/2/6 口径——G6/G9 先例）。
G. **哈希恒等链**：g10-build-hash.log 三产物 PRE=POST 同名同尺寸同 sha256
  （index-D3egZtl2.js/index-BfpEygSE.css/pdf.worker——G5-G10 第六票）；
  与 g10-verify-baseline.log build 段产物名交叉。
H. **收口序预批**（主控拟执行，请裁决序与硬条件）：①registry 翻 done+7 旧票
  file 随迁（8 行）→②root↔view 中间态边收官重扫复核（C 段面）→③e2e 默认门
  43（设计书 M6b verify 面义务——G1-G9 零行为免跑口径在本票不适用，票面
  明载）→④收口终跑 verify 全链（含翻 done 后 open 11→10 预期）→⑤staging
  显式列文件单提交（.log add -f）→⑥账本 4 行+health-scan（账本终态后跑
  ——G9 教训②）→⑦relay.md 板回写 READY+批次日志。

## ③ 证据件索引（scripts/audits/）

主控：g10-recon.{mjs,log}/g10-impl-brief.md/g10-verify-baseline.log/
g10-gate1-brief.md/g10-gate1-diff.patch/g10-gate1-report.md/
g10-w1w2-closure.log/b22-claim.mjs。
实现者：g10-impl-report.md/g10-gitmv-status.log/g10-midprobe.log/
g10-rewrite-d.log/g10-impl-verify.log/g10-mutation{1,2}.log/
g10-mutation{1,2}-restore.log/g10-build-hash.log/g10-locks-oneway.log/
g10-oneway.mjs/g10-oneway.log/g10-final-status.log。

## ④ 裁决要求

- 关键假设拷问：本批一切「零行为」结论的支点=哈希恒等+61 对 hunk 亲验+
  Test 1744 恒等——你认为还有未覆盖面即标 P。
- 实现者自裁 4 项+门一 N1-N5 处置充分性逐条裁。
- 收口序 H 预批：硬条件（e2e 43 绿+终跑 EXIT=0+locks 一致）缺一即 NO-GO。
