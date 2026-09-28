# INV-17 原行归档（F-GOV-01）

> 迁移注记：F-GOV-01（2026-09-28）主表瘦身迁此——主表现行最小三元组见 docs/invariants.md；下为本行归档时原文整行（论证/演进史/同族变体/取证注记均在原文内）。

> | INV-17 | 语料导出幂等：corpus md front-matter 不含 exportedAt（时间戳只进 manifest）；contentSha/fulltextSha=文件字节 sha256；同库重导出逐字节稳定 | ADR-0011 v1.1+corpus.assemble.ts（2026-08-25 计划审查 R6 定稿——消除「sha 不含 exportedAt」与 front-matter 含时间戳的口径矛盾） | golden+结构断言（SR2-AI-03：corpus.export.test 幂等重导逐字节用例+manifest contentSha/fulltextSha=文件字节断言+corpus md golden=assembleCorpusMd 输出逐字节） | 已锚定（2026-08-27 SR2-AI-03——幂等范围=产物文件，manifest 含 exportedAt 不参与逐字节断言） |
