# F-AIN-01 票面归档（F-GOV-01）

- id: F-AIN-01
- file: src/main/services/ai_sensor/ai-notes-import.service.ts
- area: service
- owner: strong
- status: done

## summary 原文

AI 笔记回灌事务包裹（2026-09-18 收口：withTransaction 单篇全有或全无+中断注入测试 a1/a2+M1 变异红证；裁决 2 两运行时风险票之二）：deleteByPaper+重插无事务→半删半插（ai-notes-import.service.ts:187-189）；修法=两步包 withTransaction 对齐 lineage 导入全有或全无标准（SR2-LG-01 先例）；验收=中断注入下库内零半删半插+幂等重灌不破；常规三屋票（小）；排期=梯队二，可同火 F-DEP-01

> 归档于 F-GOV-01（2026-09-28）；registry 主表已瘦身为结论句+本件指针
