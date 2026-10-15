-- 022_lineage_ghost_edges.sql（执行器 db.transaction 已包事务——本件禁自带 BEGIN/COMMIT[终裁 B4]；禁 IF NOT EXISTS）
-- [F-DBCAMP-01 DB-4 / F1] 幽灵边存量清理（A6 用户授权存量测试数据可清理先例——
--   DB-0 设计书 §12 落定；判据=lineage_edges 双端点所在 nodes.folder_id 不等
--   〔悬挂端点不存在——004/012 FK CASCADE 保证，INNER JOIN 自然跳过〕）。
-- 文件内序=guard 先行（本批最大红线）：UPDATE stop=1 → DELETE 跨图边 → stop=0。
--   防 021 AFTER DELETE 触发器把治理清理落账成删事件——快照导出会携带假删除
--   致对端误删。迁移事务内置三步=崩溃自回滚（stop 悬挂 1 态不可能持久化）；
--   guard 三态开库断言（COUNT=1∧MAX(stop)=0）迁移后仍成立（migrate.ts 既有断言面）。
-- NULL folder_id 端点：JOIN 相等比较三值逻辑 NULL<>x 不成立=保守跳过（012 回填+repo
--   写边界兜底下不可达；保守方向=漏删非假删——[回炉 r1-R8]）。
-- 读过滤行为不变（lineage.service graph 边=双端点均入图才保留——幽灵边清理后
--   读面零变化；lineage-topic-node.spec G④ e2e 锚保持绿）。
-- 纯存量 DELETE 无 DDL 无表重建，无 fkOff；新库 user_version 终值 22。
UPDATE deletion_log_guard SET stop = 1;
DELETE FROM lineage_edges
WHERE id IN (
  SELECT e.id
  FROM lineage_edges e
  JOIN lineage_nodes a ON a.id = e.from_node
  JOIN lineage_nodes b ON b.id = e.to_node
  WHERE a.folder_id <> b.folder_id
);
UPDATE deletion_log_guard SET stop = 0;
