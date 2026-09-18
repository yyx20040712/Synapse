# F-GEOM-01-G1 门二终审简报

> 审对象：M0 类型下沉切环（零行为变更重构票，F-GEOM-01 战役 1/11）
> 门二位=ops-adjudicator 绑定（deepseek-flash $max）——独立复算+终裁，异构于
> 实现者（GLM5.3flash）与门一（Kimi k3）。
> 材料清单（全 Read）：g1-impl-brief.md／g1-impl-report.md（含 W1 勘误后终态）／
> g1-gate1-diff.patch（全量 diff）／g1-gate1-report.md（门一审档）／
> g1-mutation-reexport.log／g1-mutation-pixelbox.log／g1-typecheck.log／g1-lint.log／
> 票面（tickets/registry.ts id='F-GEOM-01-G1'）／设计书 §3.3（docs/design/
> 2026-09-18_f-geom01-unification-and-reader-subdomains.md）／终态源文件按需
> （src/renderer/features/reader/ 七件）。

## 终裁面

1. **独立复算关键数字**（不采信任何报告转述，逐项亲算）：
   - 7 文件 ±行数合计（git 视角以 diff patch hunk 复算：+140/-110）
   - 变异错误行数：主证 log 错误行 grep 计数（宣称 32=TS2305×5+TS2459×27）；
     副证（宣称 3=TS2724×3）；与 log 自印 count 行对账
   - unit 基线：170 文件/1745 用例（g1-unit.log 尾部；与设计书头部基线一致）
   - 受锁测试旧路径消费面计数（主证 log 枚举：src 6 件+tests 10 件）
2. **门一 W1 处置核验**：g1-impl-report.md 勘误后计数与 raw 一致？勘误注记形态
   （保留原文+勘误段）是否可接受？
3. **设计书 §3.3 对账**：搬迁物清单（4 类型+PixelBox+RowBand+2 常量）与
   切断面（三环+两 store 边+anchor 的 COLUMN_GAP 改向）逐项对票面/设计书
   条款——有无遗漏或超范围（票面红线=零文件移动/tests 零触）。
4. **收口预呈**（主控将执行，请预审合规性）：
   a. verify 全链主控亲跑（真退出码落 raw）
   b. 锁面：本批触及路径=src/renderer/features/reader/**（7 文件）+scripts/audits/**
   （证据件）+tickets/registry.ts（翻 done）——均非受锁集合（locks manifest 338 项
   不含），零 [locked-change] 义务零 locks 操作（batch 12 同口径）
   c. 证据件入库：g1-*.log 五件被 .gitignore *.log 拦→git add -f 显式列入
   （batch 8 教训③先例）；brief/report/gate1 报告/patch 常规列入
   d. registry 翻 done+relay 板勾选 G1 子项+批次日志
   e. e2e 不跑（零行为变更——M0 纯类型搬迁+import 改向，运行时语义零变；
   unit 170/1745 全绿+typecheck+lint+build（verify 内含）为验收面，batch 12
   立案批同口径）
5. **风险拷问**：主控简报未列 TextLayer:34 消费面（变异 log 实际枚举到）——
   简报枚举缺漏但执行未受影响（不改面清单语义覆盖），定性？
   geometry-types.ts 头注文化层锚定与实际消费面有无出入？

## 产出要求

报告：①独立复算结果表（逐数字对账）②门一 W1/N1~N3 复核意见 ③收口预呈
各面裁决 ④分级发现（P0 阻断/P1 条件/P2 建议/N 注记）⑤终判 GO／
GO_WITH_CONDITIONS／NO-GO。尾栏 `FINDINGS: B=<n>/W=<n>/N=<n>/VERDICT=<...>`
（口径对齐 P0/P1/P2 计数）。
