# INV-32 原行归档（F-GOV-01）

> 迁移注记：F-GOV-01（2026-09-28）主表瘦身迁此——主表现行最小三元组见 docs/invariants.md；下为本行归档时原文整行（论证/演进史/同族变体/取证注记均在原文内）。

> | INV-32 | 程序滚动用户接管（RESTORING 取消）：程序滚动（恢复/跳页/locate，均经 INV-29 scrollRequest 单口）进行中，用户以 wheel/keydown/pointerdown 三类**非 scroll** 输入信号介入即取消程序目标转 scrolling（程序 scrollToPage 自发的 scroll 事件不算用户滚动）；后续 scroll 事件恢复记账 | scroll-progress.ts onUserTakeover/装配面三口（ReaderPage onWheel/onPointerDown+wiring hook keydown；SR2-F-03，2026-08-28 登记） | 单测锚（scroll-progress.test：restoring→scrolling 接管格+程序自发 scroll 不记账格）+S4 竞态序列 | 已锚定（单测级 2026-08-28 SR2-F-03） |
