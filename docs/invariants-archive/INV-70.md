# INV-70 原行归档（F-GOV-01）

> 迁移注记：F-GOV-01（2026-09-28）主表瘦身迁此——主表现行最小三元组见 docs/invariants.md；下为本行归档时原文整行（论证/演进史/同族变体/取证注记均在原文内）。

> | INV-70 | 单窗口单例是架构前提：OS 级多窗口=永久负面清单（2026-08-23 用户裁决 B3-问2；2026-09-19 复杂度治理裁决 7 重申——单例问题就此定性）——渲染层**模块级单例**（跨组件共享的应用态 store/ledger）因此合法，不构成需消除的全局状态债。**附件性单例清单**（2026-09-19 F-DOCGOV-01 实测快照；renderer 新增模块级单例须随票补登本条）：zustand store 11=library/notes/tags/settings/lineage/workspace（六 feature 域）+reader/ai-notes/page-items/reader-search（reader 四域）+corpus-export（settings 域）；toast-store（shared/ui 模块级 items/nextId/listeners）；annotation-undo（reader/state 模块级 stacks+undoInFlightPapers） | 用户裁决 2026-08-23+2026-09-19 裁决 7（docs/design/2026-09-18_complexity-governance-ruling.md 裁决表）+本册 | main 单实例锁代码锚（src/main/index.ts:10 requestSingleInstanceLock——未获锁即退出）+架构评审（多窗口/多例/新模块级单例提案=触发本条复审的评审位） | 部分（单实例锁=代码级防线在位，无专门锁定测试；附件清单=声明性快照，漂移由评审面核对） |
