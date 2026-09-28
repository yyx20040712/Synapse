# INV-63 原行归档（F-GOV-01）

> 迁移注记：F-GOV-01（2026-09-28）主表瘦身迁此——主表现行最小三元组见 docs/invariants.md；下为本行归档时原文整行（论证/演进史/同族变体/取证注记均在原文内）。

> | INV-63 | 测试面单调性：tests/** 契约面（用例标题多重集+expect 断言规范化文本多重集+skip 标记）只增不减——[test-refactor] 类重构/迁移在任何名义下不得静默削弱回归网；有意收紧/删改必须先取主控裁决再落豁免清单（reason+rulingLink 非空），禁直接改基线 | F-TESTREF-00 指纹门设计（docs/design/2026-09-11_f-testref00-design-final.md W1~W6 参数族）+AGENTS「工单工作流 [test-refactor] 段」（F-TESTREF-W4，2026-09-18 入册——战役收官把已落地机制升格登记；战役毕基线重冻结=test-surface:baseline 显式执行+全量 diff 审计） | 机检：`npm run test-surface:check`（C_after ⊇ C_before 多重集判定+UNRESOLVABLE 硬阻断；verify 链第 2 步+CI 同口径；基线重生成仅显式 `test-surface:baseline`——脚本无红了自愈分支） | 已锚定（机制=F-TESTREF-00 2026-09-11 落地链，W1A~W3 五批实战验证——迁移类票 C 面零变化三重实证惯例成于其上） |
