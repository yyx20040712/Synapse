# INV-77 原行归档（F-GOV-01）

> 迁移注记：F-GOV-01（2026-09-28）主表瘦身迁此——主表现行最小三元组见 docs/invariants.md；下为本行归档时原文整行（论证/演进史/同族变体/取证注记均在原文内）。

> | INV-77 | lineage.json 导出确定性（T3-P5，2026-09-27；design-final §5/D-P5-5）：corpus 导出**第六件套独立文件**（与 manifest.json 平级；finalizing 阶段 manifest 终写前落盘，失败=会话 failed 无 manifest）；确定性规范=对象键序**递归 alphabetical**（唯一规则）+nodes=lineageOrder 序/edges=(created_at,id) 行序/line_types=base 枚举序（tree,inferred,ref,manual）后 subs 按 id 升序+snake_case+2 空格缩进+UTF-8 无 BOM+末尾换行+**schema_version=1 起版**；nodes 不含 x/y UI 态与 slot（slot=内部承载列）；paper_id=null 纯主题节点照实导出；paperMetrics 不入（corpus 域避双真相）；装配单源=export_/lineage.assemble.ts assembleLineageJson（禁双实现）；**序列化变更必须递增版本并更新快照测试** | src/main/services/export_/lineage.assemble.ts（装配单源）+corpus.export.io.ts（writeLineageJson 只碰盘）+corpus.export.service.ts（finalizing 编排）+migrations/010（数据源列） | 单测（lineage-assemble.test：golden 字节级+幂等两次全等+递归键序断言+catalog_no 同源+空图恒四组+finalizing 写盘无 BOM+deps.lineage 缺席不写）+M3 变异红证（键序摘除→golden 2 红） | 已锚定（单测级 T3-P5） |
