# INV-67 原行归档（F-GOV-01）

> 迁移注记：F-GOV-01（2026-09-28）主表瘦身迁此——主表现行最小三元组见 docs/invariants.md；下为本行归档时原文整行（论证/演进史/同族变体/取证注记均在原文内）。

> | INV-67 | AI 笔记回灌事务性：ai-notes-import 回灌=deleteByPaper+重插**同包 withTransaction** 全有或全无（首插中断零行/重灌中断旧数据完整；跨篇隔离——lineage 导入同族同标准先例对齐）。**登记性质**：行为=2026-09-18 F-AIN-01 已落地，本条系 batch 7 门二 P2-5 遗留「lineage+回灌同族事务不变量批量补册窗口」的登记债销项（非 F-DEDUP-01 行为变更）；同族窗口未纳部分（lineage 清面重灌语义细目）随 F-SENSOR-01 场评估补册，防半窗遗漏 | F-AIN-01（行为落地）+F-DEDUP-01（2026-09-18 补册销项）+src/main/services/ai_sensor/ai-notes-import.service.ts 头注事务段 | 单测锚（tests/unit ai-notes-import a1 两相+跨篇隔离；lineage 同族既有事务测试）+变异红证（F-AIN-01 M1=IIFE 直调变异双红） | 已锚定（F-AIN-01 落地链 2026-09-18；本册登记滞后一日=F-DEDUP-01 场次窗口闭合） |
