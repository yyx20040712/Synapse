# INV-75 原行归档（F-GOV-01）

> 迁移注记：F-GOV-01（2026-09-28）主表瘦身迁此——主表现行最小三元组见 docs/invariants.md；下为本行归档时原文整行（论证/演进史/同族变体/取证注记均在原文内）。

> | INV-75 | 脉络月内序=slot 序（T3-P5，2026-09-27；design-final §4/D-P5-10）：lineage_nodes.slot 为月内序实现层承载（无用户序号语义——「月内序=数组序」由 slot 持久化承载；P8 槽位重排=slot 值重排，跨月移动=month+slot 同写落目标组末）；**graph.nodes 返回序=lineageOrder 全序**（year asc null 末→month asc null 末→slot asc null 末→created_at→id tiebreak——null 末+行序兜底为防御面，service 新写恒赋 slot+迁移 010 回填后存量行有序）由 lineage.service 读面唯一保证，**消费方不得重排**；排序契约唯一纯函数 lineageOrder 居 shared/models/lineage.ts，三消费面（graph 读面/lineage.json 导出/library C5 join）禁双实现；slot 归一三分支=显式透写（含 null 清面）/新建或跨组=目标 (year,month) 组 max+1/同组更新保留 | src/shared/models/lineage.ts（lineageOrder 唯一纯函数）+src/main/services/lineage/lineage.write-guards.ts（normalizeMonthSlot）+lineage.service graph 读面 | 单测（lineage-v2-model.test：乱序归位/null 组末三态/行序 tiebreak/catalogNos 同源；lineage-v2-service.test：slot 归一三分支+importDraft 批内 1..k+graph 读面序）+M1 变异红证（排序摘除→5 红） | 已锚定（单测级 T3-P5） |
