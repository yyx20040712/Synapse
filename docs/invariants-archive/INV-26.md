# INV-26 原行归档（F-GOV-01）

> 迁移注记：F-GOV-01（2026-09-28）主表瘦身迁此——主表现行最小三元组见 docs/invariants.md；下为本行归档时原文整行（论证/演进史/同族变体/取证注记均在原文内）。

> | INV-26 | 伴随进程文件协议三联：①**移除 pending job 以 corpus-ai/<paperId>.json 产物落盘成功为前提**（任何失败路径 job 一律保留——应用观测坍缩回 pending「等待 zcode」，失败细节经 status.state 自由文本呈现不分支；瞬态「job 已移除+产物未落+心跳新鲜」被排除）②应用判活唯一依据=status.json heartbeatAt 新鲜度（HEARTBEAT_FRESH_MS=10min；running 单源在 ai-sensor.service 输出，消费方不双写阈值；应用永不按 state 值分支——工具自述自由文本不契约化）③协议文件一律 tmp+rename 原子写、首写 mkdir recursive 幂等（应用与工具两侧各自保证） | ADR-0015 §1+ai-sensor.service+companion.mjs（SR2-AI-06，2026-08-27 登记随单锚定） | 单测（ai-sensor.service.test：幂等⑤/readStatus 三态/新鲜度边界/跨格序列①~④ fs 夹具驱动）+CLI 探针（companion.test：四步序全链+failed 三路径 job 保留断言） | 已锚定（单测+探针级 2026-08-27 SR2-AI-06；e2e 消费方面随 AI-08/10） |
