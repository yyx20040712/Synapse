-- 024_lineage_floating_notes.sql（执行器 db.transaction 已包事务——本件禁自带 BEGIN/COMMIT[终裁 B4]；禁 IF NOT EXISTS）
-- [F-VISFB-61] 悬浮笔记数据面（视检反馈战役 B6-61；任务书 §5-B6 61 号/
--   §0-5 裁决）：floating_notes 画布笔记表。
-- 设计要点（§0-5+票面）：
--   无 paper_id——纯画布节点不关联任何文献（DDL 负锚；shared 类型
--   floatingNoteSchema 同负锚，测试断言面双锚）。
--   x/y=画布 own 域坐标（62 号消费面按 effective-scale 换算——61 只存取
--   不换算）。
--   folder_id=域资产（REFERENCES collections ON DELETE CASCADE——012/019
--   族域资产先例同款：lineage_nodes.folder_id/tags.folder_id）：删夹=该夹
--   悬浮笔记全域删（票面「域删级联入链」——DDL 承担，folders.service 零
--   侵入）；'__main__' 锚=collections 播种行（012 (1) 步）在位。
--   域删/单删的删事件落账=AFTER DELETE 触发器（021 族第十表——WHEN 守卫
--   读 deletion_log_guard.stop：导入直执窗不落账；FK 级联点火子表触发器
--   =021 头注实测超集口径，域删路径级联行事件在场）→ deletion_events 的
--   floating_notes 实体行=快照导入防复活过滤数据源（INV-132 兑现面）。
--   入快照导出面：snapshot.repo TABLE_SPECS 九键→十表（updated_at LWW
--   分支——import-snapshot.repo IMPORT_TABLE_ORDER 父先子后位=collections
--   之后；[F-VISFB-42] figure 两表不入快照口径不变）。
-- 纯新增表+索引+触发器无表重建，无 fkOff；新库 user_version 终值 24。
CREATE TABLE floating_notes (
  id         TEXT PRIMARY KEY,
  folder_id  TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  x          REAL NOT NULL,
  y          REAL NOT NULL,
  content    TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_floating_notes_folder ON floating_notes(folder_id);
-- ── 021 族第十表 AFTER DELETE 触发器（WHEN 守卫=直执落账抑制）────────────
CREATE TRIGGER floating_notes_deletion_log_ad AFTER DELETE ON floating_notes
WHEN (SELECT COALESCE(stop, 0) FROM deletion_log_guard) = 0 BEGIN
  INSERT OR IGNORE INTO deletion_events (entity, id, deleted_at)
  VALUES ('floating_notes', OLD.id, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
END;
