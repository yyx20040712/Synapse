# INV-25 原行归档（F-GOV-01）

> 迁移注记：F-GOV-01（2026-09-28）主表瘦身迁此——主表现行最小三元组见 docs/invariants.md；下为本行归档时原文整行（论证/演进史/同族变体/取证注记均在原文内）。

> | INV-25 | ai_notes 级联语义：paper 删除→ai_notes 级联清空（CASCADE，语料随篇亡）；annotation 删除→该行 annotation_id 置 NULL 条目保留（SET NULL，锚定段降级篇级——数据不丢）；级联生效依赖连接级 PRAGMA foreign_keys=ON（connection.ts DB_PRAGMAS 常开） | 迁移 003 DDL 外键子句+src/main/db/repos/ai_notes.repo.ts（SR2-AI-01，2026-08-27 deepseek W1 采纳登记） | repo 单测（ai_notes.repo.test 级联两路径用例：CASCADE 清空/SET NULL 降级篇级——foreign_keys=ON 下真实外键行为） | 已锚定（单测级，2026-08-27） |
