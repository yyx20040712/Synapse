# F-GEOM-01-G4 门二终审简报（实证终审）

> 审岗=ops-adjudicator（deepseek-flash $max 绑定，异构于实现者/门一）
> 工作区根=E:\class\智慧水务\Synapse_remake。你有 Read/Glob/Grep——可独立重跑
> 只读探针复算；禁写操作。报告全文以最终回执返回（主控逐字归档）。

## 0. 被审对象与前置事实

工单 F-GEOM-01-G4（目录化 M1：state/ 10 文件迁移，零行为变更纯迁移票，
[locked-change][test-refactor]）。三屋链现态：实现者交付（ops-executor，
GLM5.3flash $max）→门一 **PASS_WITH_WARNINGS B0/W1/N6**（ops-gate1-k2 备源承载
——k1 连续两次 auth 失败换源，batch 7/12 先例第三现；报告=scripts/audits/
g4-gate1-report.md）→ 本审=终审。

主控已落收口前置面：registry 九行 file 字段随迁（G4 保持 open 待你终审后翻）
+全量 verify EXIT=0（scripts/audits/g4-verify-master.log 末行标记）。

## 1. 必读件（按序）

1. scripts/audits/g4-gate1-brief.md——审包口径（变更面预期数字全在）
2. scripts/audits/g4-gate1-diff.patch——diff 主件（1103 行）
3. scripts/audits/g4-impl-report.md——实现者报告（自裁 10 项+勘误行）
4. scripts/audits/g4-gate1-report.md——门一裁决全文

## 2. 独立复算面（门二天职——数字逐组复算，禁引门一结论为证）

1. **变更面总数**：+112/−112 分解=rename 深度 8+src 50+tests 41+配置 4+registry 9；
   以你自己的 Grep/Read 对 patch 或工作树复算至少三组（如 tests 41 行构成
   3×2+2×7+1×21=41；src 50=域内 48+跨域 2；十 rename 对相似度与 5 个 R100）。
2. **registry 九巨行 word 级复验**（门一建议面：SR2-F-05/F-R2/F-R3 行超 600 字符）
   ——用 Grep 比对工作树 tickets/registry.ts 九行（:111/:146/:148/:150/:170/:208/
   :230/:232/:295 附近）与 diff - 行：仅 file 字段路径段差异，id/status/summary/
   尾注零漂移。
3. **locks manifest diff 本体**（门一包外件）：locks/manifest.json 当前 345 条 vs
   HEAD 341 条——`git show` 你无 Bash 不可用，替代法：Grep manifest 数 "path"
   键计数+抽 5 项 g4 新件在册+抽 3 项被改文件（tests 任一/eslint.config.js/
   check-quality.mjs）sha 形态在册；verify-master.log :87 locks:check 345 绿为旁证。
4. **旧路径零残留**：Grep 工作树 `features/reader/`+十模块名于 src/tests/
   eslint.config.js/scripts/check-quality.mjs——除 M6a 两行（PdfPageCanvas/
   TextLayer 的 eslint :90/:91）外零命中。
5. **指纹门数字**：verify-master.log 内 test-surface 段 cur=187/1789/5411 与
   base 183/1757/5334 的关系口径（纯增滞后态=batch 7 前票未基线化 7+本域 187
   形态——G2 门二已核口径，verify 是否绿为判据）。
6. **变异红证三段**：g4-mutation1.log/g4-mutation2.log 各含 红 EXIT→还原 diff 空
   →复绿 EXIT 物理三段。

## 3. 门一 W1 处置复核

W1=实现报告 tests 括注枚举失实（主数字正确）→主控处置=报告 :39 勘误行内嵌
（【勘误（门一 W1）】标记）+批次日志留痕。裁：处置是否充分（vs 返工重写报告）。

## 4. 收口清单预批（你对下列动作裁 GO/NO-GO 或 GO_WITH_CONDITIONS）

1. staging 显式列全量（10 rename+31 src+30 tests+eslint+check-quality+registry+
   manifest+relay.md+g4 证据族含 8 .log 经 add -f）单提交双尾注
   [locked-change][test-refactor]；
2. 提交后翻 G4 status=done+summary 补收口注记（含受锁面勘正 30 件口径+W1 勘误
   留痕）；
3. e2e 不跑（零行为票，G1/G3 同口径；父级 e2e 义务归 G11；门一 N6 同裁）；
4. 账本补记三行（executor units=10/k1 换源 k2 承载一笔/adjudicator 本审）+
   health-scan RED=0 门；
5. 构建哈希恒等旁证（门一 N3）记入批次日志供 G5+ 沿用。

## 5. 产出格式（最终回执全文返回）

- 总裁决：GO / GO_WITH_CONDITIONS / NO-GO（P0/P1/P2/N 计数）
- P0=证据链断裂/数字复算不过/零行为断言破口
- P1=收口前置义务缺口（须收口前补）
- P2=留痕级（批次日志/报告措辞）
- 逐项：§2 六组复算结果+§3 裁词+§4 五动作预批+你认为的收口执行序修正。
