# INV-28 原行归档（F-GOV-01）

> 迁移注记：F-GOV-01（2026-09-28）主表瘦身迁此——主表现行最小三元组见 docs/invariants.md；下为本行归档时原文整行（论证/演进史/同族变体/取证注记均在原文内）。

> | INV-28 | 被引缓存刷新语义（与元数据 fill-empty 刻意不同——被引数单调增长）：瀑布命中且 citedByCount 非 null（含 **0**，0 是合法缓存值）→强制刷新（新值+新时间戳+source 三列同写）；命中但 citedByCount=null→不写缓存旧值保留；未命中/异常（work=null）→旧值保留（缓存不清，enrich_status='failed' 仅元数据面）；判别必须 `=== null`（禁 ??/falsy——0 与 NULL 语义不同）；detailById 透出配对规则=count 非 null 三字段齐出、null 全省略（undefined） | cited-by.service.ts 头注状态机（刷新决策单源 citedByPatch；SR2-ENR-01，2026-08-28 门一 W2 处置登记） | 单测（cited-by.test 9 用例：六格全格+0 值边界两样本+跨格序列）+真库断言（papers.repo.test：applyEnrichment 第三参 SET 落库+再不传则保留——SQL 面唯一锚定点，enrich 集成测试全用桩） | 已锚定（单测+真库级 2026-08-28 SR2-ENR-01） |
