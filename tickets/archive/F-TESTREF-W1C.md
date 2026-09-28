# F-TESTREF-W1C 票面归档（F-GOV-01）

- id: F-TESTREF-W1C
- file: tests/e2e/e2e-env.ts
- area: infra
- owner: strong
- status: done

## summary 原文

测试优化战役 W1c=e2e 脚手架单源（W1B 后收口 2026-09-18）：launch 5 副本（smoke 内联 6 调用+4 spec 函数副本）+seedPaperRow 4 spec 本地定义（15 引用文件）+first-window 500ms→close 配方 14 文件 20 块→e2e-env.ts 单源（71→82 行，+bootstrapMigrations helper 原三行块逐字收敛）；语义保真=reader-search SEED_ID 硬编码调用点显式补参/corpus readFile 后部 6 消费保留/reader-text app.evaluate 回调参数 electron 非 import 辨析（lint 实证清）；三重实证=指纹门 179/1623/4979/15 全同+变异红证（Synapse→MUTATED→MISSING_ASSERT×2 红→mv 通道还原复绿——已重锁态 cp 直接写被拦教训）+e2e 全量 44 passed EXIT 0（2.1m）；净删 tests 域 +72/-351（16 文件，门二双路闭合）；门一 PW（W1 记账分域修正+N1-N5 处置）+门二 GO_WITH_CONDITIONS（P1 三项全处置：默认门 42/全跑 44 双补跑+记账终态勘误+提交形态矩阵白名单亲验）；[test-refactor][locked-change]

> 归档于 F-GOV-01（2026-09-28）；registry 主表已瘦身为结论句+本件指针
