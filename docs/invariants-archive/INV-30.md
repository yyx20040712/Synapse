# INV-30 原行归档（F-GOV-01）

> 迁移注记：F-GOV-01（2026-09-28）主表瘦身迁此——主表现行最小三元组见 docs/invariants.md；下为本行归档时原文整行（论证/演进史/同族变体/取证注记均在原文内）。

> | INV-30 | canvas 生命周期=渲染窗口绑定：页 canvas（PdfPageCanvas）仅存在于 PageColumn 渲染窗口内（可见页±renderWindow），离屏距离>recycleWindow 必卸载（canvas 移除+pageText 条目同删——PageFrame 卸载哨）；rendering 中滚出窗口由渲染 effect 清理取消在途任务；zoom 重算走尺寸缓存乘法（就绪后无 loading 态——非重取） | PageColumn.tsx 段③（SR2-F-01，2026-08-28 登记；内存断言=canvas 实例数≤渲染窗口+缓冲常量；实现者原误编 INV-28 撞号，F-01 门一 W1 处置重编 INV-30；**F-ARCH3 2026-08-30 宿主随迁**：PageFrame 卸载哨+pageTexts/pageRoots 缓存注册表自 ReaderPage 下沉 PagesOverlay.tsx——PageColumn 段③窗口语义零变，纯重构行为零变） | 组件单测锚（page-column.test：IO 桩驱动窗口展开/快速滚动回收/渲染集上界 ≤ 可见数×(2·recycleWindow+1)+离屏距离断言）+pages-overlay.test（F-ARCH3：卸载哨两表同删③用例+M1 变异红证）+e2e 收官计数断言（F-04 reader-scroll.spec） | 已锚定（组件单测级 2026-08-28 SR2-F-01；e2e 计数断言随 F-04 收官；注册表侧随 F-ARCH3 迁锚） |
