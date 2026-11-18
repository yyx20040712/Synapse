# ADR-0021：文件夹单归属×脉络图绑定

日期：2026-09-30 · 状态：已裁决——已落地（papers.folder_id 单归属+脉络图投影现行，INV-88~93 登记 docs/invariants.md）

## 背景

用户反馈（2026-09-29）：zotero 式文件夹×同名脉络图绑定。当时现状=
collections M2M 挂接雏形（迁移 001）+脉络每课题全局单图（迁移 004 无图
维度）+入图全手工。同批诉求：影响因子手动字段与「编号=发表时间老→新」
派生。设计单源=docs/design/2026-09-30_ffolder01-design-final.md（基座=
2026-09-29 调研 §2 D1-D4 已批）。

## 候选

- **边冗余 folder_id 列**：否决——双写漂移面（folder 改移时边列须同步，
  漏写=图归属双真相）；派生+服务层护栏=零冗余零漂移。
- **保留 M2M+视图派生单归属**：否决——两套归属语义并存违背「方案切换=
  删除旧方案」；回填后 M2M 无增量信息。
- **NOT NULL DEFAULT '__main__' 直接 ADD COLUMN**：不可行——SQLite ADD
  COLUMN 静态禁 REFERENCES+非空 DEFAULT（探针实证：空表过/有行红；重建法
  在执行器事务内 PRAGMA foreign_keys 无操作+外键 ON 下 DROP 父表级联灭
  edges）——修订二：可空列+迁移回填+repo 读写边界兜底（design-final
  修订二）。
- **pubNo=service 内存排序**：否决——大库分页需全量取数；SQL 窗口零存储
  零重算任务（SQLite 3.25+，本仓 3.53.4）。

## 裁决

1. **一文献至多一文件夹**（单归属）：papers.folder_id 单列（迁移 012），
   paper_collections M2M 退役 DROP（回填序：有节点文献归主图→有挂接文献
   归 position 最小 collection（tie-break id ASC 启发式——无插入序可用，
   明示非业务「首个」语义）→裸文献保持 NULL=未归档）。
2. **脉络图=文件夹内容的投影**：lineage_nodes.folder_id（每节点必属一
   图；存量全归主图 '__main__'）；图名=文件夹名 1:1（改名即图改名，无
   独立 graph 元数据）；「未归档文献可无节点」与「未加入脉络」正交。
3. **边不加 folder_id（派生）**：边属图=端点所在图——服务层拒跨图边
   （ERR_CROSS_GRAPH_EDGE，INV-90 护栏）；**跨图移动=边删除代价**（移动
   事务序内清直接连线，弹窗明示）。
4. **编号 pubNo=库级全序派生不落库**（INV-92）：ROW_NUMBER 窗口
   （year/month NULLS LAST+added_at+rowid 决胜）挂进 LIST_SQL；catalogNo
   （图序编号 INV-76）退役，图内节点号与库号同源=pubNo 单一真相源。
5. **S1 队列闸**（INV-91）：renderer 脉络写队列 pending 信号经
   set-quit-dirty 载荷 push 到 main 缓存；folders 写/papers.move/
   updateMeta 入口互斥拒。
6. **影响因子=手动字段**：papers.impact_factor REAL NULL；enrich 自动
   填充链不上。

## 后果

- 跨图移动文献=直接连线同删（用户明示语义——调研矩阵「移动 F1→F2」行）；
  确认弹窗明示。
- catalogNo 全仓退役（lineageCatalogNos 单源删除；lineage.json 导出
  schema_version 2：catalog_no→pub_no）。
- slot 组域扩为（folderId,year,month）——同图内唯一、跨图独立。
- 与 ADR-0018（课题隔离）正交：文件夹全部设计在课题库内部，不跨课题。
- IPC +5 通道（folders 四+papers/move-folder；61 终态）+folders.changed/
  lineage.changed 双事件；lineage.graph 入参 +folderId（子图读）。
- 未归档/移出语义后续已收紧退役（paperMoveReq 收紧 min(1)+moveFolder
  无移出分支——现行文本见 INV-93）。
- 关联：ADR-0014（lineage 图数据模型，图维度落地修订）｜INV-88~93｜
  迁移 012｜design-final（三段通道全档）。
