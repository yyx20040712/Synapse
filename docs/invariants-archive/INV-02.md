# INV-02 原行归档（F-GOV-01）

> 迁移注记：F-GOV-01（2026-09-28）主表瘦身迁此——主表现行最小三元组见 docs/invariants.md；下为本行归档时原文整行（论证/演进史/同族变体/取证注记均在原文内）。

> | INV-02 | 用户触发的动作失败必须可见（toast / 内联红条），禁止静默吞错 | AGENTS 文化层；U1（内联红条）/U6（store.error+watch）两个修复模式 | 人审 + 工单模板条款（规约锚定；模板=scripts/new-ticket.ps1 文化层） | **部分**（lint 化不可行有实证：blanket 空 catch 禁令误伤三处合法尽力而为——settings.service.ts:66/:79（原 ipc/settings.ts:52，随 F-LAYER-01 下沉）/reader.store.ts:319（原 :90 漂移）/import.service.ts:182（原 :171 漂移），2026-09-19 F-DOCGOV-01 行号刷新，见 b774d5c；规约化已落 new-ticket.ps1 文化层） |
