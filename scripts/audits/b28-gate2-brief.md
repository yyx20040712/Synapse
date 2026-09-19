# F-PROC-01 门二终审简报（b28 制度批——主控→门二 ops-adjudicator）

你是门二终审岗（实证）。工具面=Read/Glob/Grep（只读）——机器面核对以读
log/registry/manifest 实物为准，禁臆测。输出报告全文落
`scripts/audits/b28-gate2-report.md`（若写通道不可用则全文随回复内联，主控代落档）。
裁决形态：GO / GO_WITH_CONDITIONS（P0/P1/P2/N 分级）/ NO-GO。

## 1. 处置核对（门一 B0/W5/N5 + 主控三分法处置——逐条 vs 终态实物）

- W1（裁决 9 日期 09-19→应裁出日）：**已修**——AGENTS.md:91 尾注改
  「2026-09-17 裁决 9」；methodology.md 治理八指标段改「2026-09-17 复杂度
  治理裁决 9 扩三，F-PROC-01 2026-09-19 落档」。裁决书 C 组头注 2026-09-17
  裁=依据（b28-gate2-diff.patch 可核两处 + 文）。
- W2（§4 节号与 P9 §5 冲突）：**已修**——回流句去节号硬编码，改「教训行段
  （交接书/接力板批次日志两形态通用——载体节号随模板版本，勿硬编码）」；
  P9 原文未动（历史叙述红线——门一亦未要求改 P9）。
- W3（汇出主体门二 vs 主控互斥）：**已修**——§4.5 末行「门二从派发回执汇出」
  →「主控从派发回执汇出」（§4.3⑤ 模板权威口径对齐）。
- W4（align01 引用无前缀）：**已修**——补全 docs/reports/2026-09-18_align01-
  org-audit.md（主控实测该路径存在——门一四处候选恰好未含此前缀；你复核）。
- W5（P11 与冻结规矩双源）：**已修**——P11 句内嵌「用户级裁决（COMPOSITION_
  ROOT_ALLOW 冻结规矩，§4 治理指标段单源）」，单源指向 §4 新句。
- N1（ADR 索引节号半偏）：**已修**——AGENTS.md:91「§5 ADR 索引+§6 实体表」。
- N2（回流句载体单形态）：**已修**——随 W2 合并（两形态通用句）。
- N3（收口日志三数前向承诺）：**待收口兑现**——本批批次日志将记 37.2%/7/13
  三数（relay.md 收口段，收口时落）。
- N4（.log vs .raw.txt 纪律）：**主控裁沿 b24~b27 惯例**——git add -f 入库
  （methodology:199-200 系 R2 四单时点纪律句=历史叙述段，后续批次惯例已
  演化为 .log+add -f，b27 收口 12 .log 先例；纪律句不回改）。你可攻击此裁量。
- N5（括号形→破折号形）：**不动**——提示级措辞微调。

## 2. 母本符合度（票面六子任务+移交三项 ↔ 终态）

票面（registry:318）六子任务映射：①=AGENTS DoD 新行；②=methodology 回流
句；③=八指标段；④=冻结规矩+P10 M2 句；⑤=§4.5 补记规则；⑥=§4.4 裁决 14
句。移交三项：INV-27 形态规约（§2 新条，不回拆）/audit0 头部注记/W-11+
ADR-0013/0015 复审状态。落点表=scripts/audits/b28-proc01-impl-brief.md ③
（11 行/6 文件；简报总则「9 文件」笔误以表体为准——门一 D 项已核）。

## 3. 机器面核对（读实物）

- **验证链**：scripts/audits/b28-proc01-verify-final.log（实现者首轮，:3822
  exit=0）+ scripts/audits/b28-proc01-verify-postfix.log（主控修缮后复跑，
  尾部 exit=0——顺序铁律兑现）——核对两 log 关键行：指纹门 183·1768·5368·
  skip14 零漂移/open 3/locks 382/Test Files 167/Tests 1724/产物 index-
  DW6Z3WXp.js 1,388.14 kB 同名同尺寸（零 src 直证）。
- **锁链对账**：381（b27 终态）→382（b28-claim.mjs 入锁，locks/manifest.json
  generatedAt 2026-09-19T09:00:51Z 实物）——本批新增受锁件恰 1（claim 脚本，
  写毕即时 generate+apply 纪律兑现）；门一/门二简报报告件是否应入锁？
  （先例：scripts/audits/*.md 不在 walk 面——walk 只覆盖 .mjs/.ps1——你核
  check-locks.mjs walk 逻辑佐证）。
- **翻 done 推演**：registry:318 F-PROC-01 summary 含「invariants.md」？
  ——summary 文字有「file=docs/methodology.md（主制度锚）」无机制名词面量
  风险点；file 锚=docs/methodology.md——check-tickets 规则 3 机制名词扫描
  对该文件内容（methodology 新句含「check-quality 白名单」等词——是否触
  规则 3 词表？**收口翻票前须预检**：b27 教训③（done 票 file 锚含机制名
  =翻票后才显形）。你推演 check-tickets.mjs 规则 3 词表与方法论新句的碰撞
  面，给出翻票是否红的预判）。
- **受锁面**：check-quality.mjs/tests/shared 零触碰（diff 6 文件全在锁外——
  门一 B 项已核 manifest 序；你复核 diff 文件清单）。

## 4. 宪法红线终审

分层/受锁尾注（收口提交将带 [locked-change]——manifest 变更+claim 脚本入
锁面；非测试面票无 [test-refactor] 义务）/UTF-8/行数（methodology 现 ~375
行 <500）/纯文档批 e2e 不跑（b27 门二 N-4 同口径+产物同名直证）。

## 5. 收口序预批（主控计划——你审后批）

1. 账本补记三岗行（executor/gate1 k2/adjudicator——findings 对象形）；
2. health-scan（账本终态后跑，RED=0 门槛）；
3. 翻票探针（b28-tickets-flip.mjs——锚 `{ id: 'F-PROC-01'` 行首定义形态，
   写毕 dry 跑再入锁——b27 教训②）+registry 翻 done；
4. 终跑 verify（翻票后——b27 教训③时序：规则 3 碰撞在翻票后才显形）；
5. relay.md 批次日志追加（含三数兑现 N3）+板面 READY 置位；
6. staging 显式列件提交（[locked-change] 单尾注）。
