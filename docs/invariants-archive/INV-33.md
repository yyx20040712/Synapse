# INV-33 原行归档（F-GOV-01）

> 迁移注记：F-GOV-01（2026-09-28）主表瘦身迁此——主表现行最小三元组见 docs/invariants.md；下为本行归档时原文整行（论证/演进史/同族变体/取证注记均在原文内）。

> | INV-33 | 缩放中心保持：zoom 变化（ctrl+wheel/工具栏/适应宽度任一来源）后视口中心内容不动——(scrollTop+vh/2)/总高 比值经纯函数 anchoredScrollTop 保持（顶/底夹取；间隙不随 zoom 缩放的口径由 columnTotalHeight 承载）；实现链=PageColumn 段⑥布局效应程序修正 scrollTop（滚动位置镜像=容器 scroll 事件被动监听），程序性修正不经 wheel/keydown/pointerdown 接管链（INV-32 语义不受扰）；fit-width 分母=列宽基准（最宽页原始宽，页列就绪 onReady 载荷单源，一次性 zoom 语义保持） | page-column-geometry.ts anchoredScrollTop/columnTotalHeight+PageColumn 段⑥+ReaderPage fitWidth（SR2-F-04，2026-08-28 登记） | 单测锚（page-column.test：anchoredScrollTop 比值/顶底夹取/退化防御+columnTotalHeight 间隙口径+组件 scrollTop 修正精确断言）+e2e 收官链（reader-scroll.spec 中心最近页保持+fit 列宽贴合断言；M3 变异恰中实证） | 已锚定（单测+e2e 级 2026-08-28 SR2-F-04；e2e 随收官链取证落盘，registry 翻 done 后常规跑激活） |
