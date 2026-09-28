# INV-23 原行归档（F-GOV-01）

> 迁移注记：F-GOV-01（2026-09-28）主表瘦身迁此——主表现行最小三元组见 docs/invariants.md；下为本行归档时原文整行（论证/演进史/同族变体/取证注记均在原文内）。

> | INV-23 | 撤销栈语义：栈 per-tab 模块级自持（随 closeTab 清理，不跨 tab）；LIFO+深度 50 FIFO 截断；api 失败不弹栈可重试；同篇 in-flight 互斥（busy，他篇不阻塞——Set 互斥）；delete 逆重建新 id 后全栈 remap 旧 id 引用（按对象身份跳过被撤条目）；成功后按对象身份移除（indexOf——await 期间入栈/FIFO 截断致下标漂移不误删） | annotation-undo.ts（SR2-UNDO-01，2026-08-25 deepseek r2~r6 五轮收敛定稿） | 单测（annotation-undo.test 15 用例：三逆操作/remap 三跨格序列/互斥含并发篇/身份移除含截断挤出/截断/失败重试/空栈/隔离） | 已锚定（单测级，2026-08-25） |
