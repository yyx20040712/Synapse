-- 027_lineage_meta_folder.sql（执行器 db.transaction 已包事务——本件禁自带 BEGIN/COMMIT；禁 IF NOT EXISTS）
-- [B4 L1 D2 / 设计稿 §5.4——用户终裁 A（2026-11-22）] 色行名 lineTypeNames 由全库
-- 共享键迁移为 folder 键：旧共享键 'lineTypeNames' 的值复制到每个现存 folder
-- （含主图 __main__——012 迁移字面量锚，存量单图承载）的 'lineTypeNames:<folderId>'
-- 行，再删除旧键。零新表零新列（lineage_graph_meta 为通用 key/value 表）。
-- 分支：旧键缺席（从未改名的库——新库仅种 'lineTypes'）=零复制，读面缺省
-- 6×「待命名」；目标键已在场=不覆盖（NOT EXISTS 守卫——v26 库结构性不可达，防御）。
-- 键前缀字面量 'lineTypeNames:' 与 src/main/db/repos/lineage.repo.ts
-- lineTypeNamesKey 单源同步（两处须一致）。
-- 副作用申报：旧键删除经 026 既有触发器 lineage_graph_meta_deletion_log_ad 落一枚
-- ('lineage_graph_meta','lineTypeNames') 删事件（append-only 不动；对端导入时该键
-- 已不存在=deleteDirect 零行幂等）。
INSERT INTO lineage_graph_meta (key, value, updated_at)
SELECT 'lineTypeNames:' || folder.id, shared.value, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM collections AS folder
CROSS JOIN lineage_graph_meta AS shared
WHERE shared.key = 'lineTypeNames'
  AND NOT EXISTS (
    SELECT 1 FROM lineage_graph_meta AS existing
    WHERE existing.key = 'lineTypeNames:' || folder.id
  );
DELETE FROM lineage_graph_meta WHERE key = 'lineTypeNames';
