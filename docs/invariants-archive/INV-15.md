# INV-15 原行归档（F-GOV-01）

> 迁移注记：F-GOV-01（2026-09-28）主表瘦身迁此——主表现行最小三元组见 docs/invariants.md；下为本行归档时原文整行（论证/演进史/同族变体/取证注记均在原文内）。

> | INV-15 | 阅读器空态（无 tab/loading/error）下 TabBar 保持渲染——error tab 必须可见、可关（叉/Delete）、可切（多 tab 失败场景可切回其他 tab），否则打开失败即 UI 死锁 | SR2-TABS-02（ReaderPage 空态分支含 TabBar 结构 + deepseek r1 BLOCKING 修复先例，2026-08-24） | 组件级：tab-bar.test（渲染序/激活/关闭三路径）；装配级：P7-B 收官 e2e 三序列（换/关/退）含 error 场景 | 已锚定（2026-08-25 收官 e2e 收口；**失败类补全**：pdf 加载失败原仅 toast——markTabError 落 TabState.error，缺失文件场景实测锚定） |
