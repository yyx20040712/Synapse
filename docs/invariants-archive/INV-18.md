# INV-18 原行归档（F-GOV-01）

> 迁移注记：F-GOV-01（2026-09-28）主表瘦身迁此——主表现行最小三元组见 docs/invariants.md；下为本行归档时原文整行（论证/演进史/同族变体/取证注记均在原文内）。

> | INV-18 | 导出会话协议：manifest 终局单写（临时文件+rename 原子替换）；会话开始删旧 manifest+清空重建 corpus/fulltext/figures；单会话单飞（EXPORT_BUSY）；中断=无 manifest=工具侧不可激活，重跑即修复；**串行不死锁时序（2026-08-27 e2e 实证补条）：篇终局推进必须延后至 complete/error 的 invoke 回复之后（deferOutcome）——事件先于回复到达 renderer 时提取器防御分支丢请求，串行链挂死** | ADR-0011 v1.1+export-session-state.ts（F-EXPORT-01 拆件现行宿主——态空间迁移表+跨格序列随件；拆分前宿主=corpus.export.service 2026-08-25 计划审查 R5/R8/R9 定稿，初版状态机表=ai-plan-review §6——2026-09-19 F-DOCGOV-01 指针随迁） | 单测+e2e（SR2-AI-03 单测级：终局单写 tmp+rename/清空重建含 tmp 残留/EXPORT_BUSY 单飞拒绝/落盘失败=会话 failed 无 manifest+重跑修复——corpus.export.test 十用例；e2e 消费方级=SR2-AI-04 corpus-export.spec：全链多篇+残留清空重建+目录根用户文件不动） | 已锚定（单测级 2026-08-27 SR2-AI-03；e2e 面 2026-08-27 SR2-AI-04——时序补条即 e2e 多篇序列首跑红实证） |
