# INV-31 原行归档（F-GOV-01）

> 迁移注记：F-GOV-01（2026-09-28）主表瘦身迁此——主表现行最小三元组见 docs/invariants.md；下为本行归档时原文整行（论证/演进史/同族变体/取证注记均在原文内）。

> | INV-31 | 滚动→页进度回写=视口中心最近页（纯函数，PageColumn.nearestPage 单源）：scroll-progress 状态机在防抖到期时按 (scrollTop+clientHeight/2) 所落页盒记账（整数页粒度，页内偏移不存）；回写经 setPage {scroll:'none'}（INV-29 'none' 支）只落账不触发程序滚动；回写竞 tab 切换时 writing 前校验 activeId——失配丢弃 setPage（防把 A 的页写进 B 的 tab），per-tab 账（saveProgress 按 paperId）照落 | scroll-progress.ts 状态机 fire()（SR2-F-03，2026-08-28 登记） | 单测跨格锚（scroll-progress.test：六态全格+五序列——失配丢弃/关 tab flush/中心页边界含中缝取前页）+e2e 批 3（滚动→关→重开=恢复页锚定） | 已锚定（单测级 2026-08-28 SR2-F-03；e2e 批 3 取证落盘，registry 翻 done 后常规跑激活） |
