-- 028_deletion_log_write_guard.sql（执行器 db.transaction 已包事务——本件禁自带 BEGIN/COMMIT；禁 IF NOT EXISTS）
-- [B4 L1 / 设计稿 §7.5 删事件写入点守卫——D1 用户终裁 A（2026-11-22）] 七个含
-- updated_at 表的 deletion_log 触发器重建为写点单调守卫形态：
--   deleted_at = max(now, OLD.updated_at + 1ms)
-- now 晚于被删行 updated_at 时取 now；否则写「旧行+1ms」（strftime 进位含毫秒/
-- 秒/分/时/日边界）。两分支都严格大于被删行删除前的 updated_at——与恢复点守卫、
-- 普通写点守卫（三 repo upsert + putExact 的 SQL 标量 max）合成三类写点单调
-- 不变量：同库内同 id 新删事件的 deleted_at 恒不与既有 tombstone 同值，
-- UNIQUE(entity,id,deleted_at)+INSERT OR IGNORE 不吞新删事件。
-- NULL 安全（实现期实测补充）：SQLite 多参 max() 任一参数 NULL 即返回 NULL；
-- strftime 对非 ISO 的 OLD.updated_at（库外手改/对端快照原样写入）返回 NULL——
-- 字面 max(now, NULL) 使 deleted_at 为 NULL，INSERT OR IGNORE 对 NOT NULL 违约
-- 静默跳过=tombstone 不落账。故「旧行+1ms」项包 COALESCE(…, now)：合法 ISO 值
-- 与设计稿公式逐字等价；畸形值退化为取 now（=026 原行为），不丢 tombstone。
-- 覆盖面：FK ON DELETE CASCADE 的子行删除同样触发子表 AFTER DELETE 触发器，
-- 触发器体内比较的是子行自身的 OLD.updated_at——cascade 路径与直删同等覆盖。
-- 不改面：NO_UPDATED_AT 三表（collections/tags/paper_tags）无 updated_at 可比，
-- 触发器保持 026 原形态（其删事件在快照导入段三无条件删除，无平局概念）；
-- deletion_events 两 append-only 触发器不动；表/列/索引零变更；触发器总数不变。
-- 触发器名与 WHEN 守卫（deletion_log_guard.stop）逐字沿承 026——epoch 触发器族
-- 与名称集不变（migrate.test 名称计数锚）。
DROP TRIGGER annotations_deletion_log_ad;
CREATE TRIGGER annotations_deletion_log_ad AFTER DELETE ON annotations
WHEN (SELECT COALESCE(stop, 0) FROM deletion_log_guard) = 0 BEGIN
  INSERT OR IGNORE INTO deletion_events (entity, id, deleted_at)
  VALUES ('annotations', OLD.id,
          max(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
              COALESCE(strftime('%Y-%m-%dT%H:%M:%fZ', OLD.updated_at, '+0.001 seconds'),
                       strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))));
END;

DROP TRIGGER floating_notes_deletion_log_ad;
CREATE TRIGGER floating_notes_deletion_log_ad AFTER DELETE ON floating_notes
WHEN (SELECT COALESCE(stop, 0) FROM deletion_log_guard) = 0 BEGIN
  INSERT OR IGNORE INTO deletion_events (entity, id, deleted_at)
  VALUES ('floating_notes', OLD.id,
          max(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
              COALESCE(strftime('%Y-%m-%dT%H:%M:%fZ', OLD.updated_at, '+0.001 seconds'),
                       strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))));
END;

DROP TRIGGER lineage_edges_deletion_log_ad;
CREATE TRIGGER lineage_edges_deletion_log_ad AFTER DELETE ON lineage_edges
WHEN (SELECT COALESCE(stop, 0) FROM deletion_log_guard) = 0 BEGIN
  INSERT OR IGNORE INTO deletion_events (entity, id, deleted_at)
  VALUES ('lineage_edges', OLD.id,
          max(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
              COALESCE(strftime('%Y-%m-%dT%H:%M:%fZ', OLD.updated_at, '+0.001 seconds'),
                       strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))));
END;

DROP TRIGGER lineage_graph_meta_deletion_log_ad;
CREATE TRIGGER lineage_graph_meta_deletion_log_ad AFTER DELETE ON lineage_graph_meta
WHEN (SELECT COALESCE(stop, 0) FROM deletion_log_guard) = 0 BEGIN
  INSERT OR IGNORE INTO deletion_events (entity, id, deleted_at)
  VALUES ('lineage_graph_meta', OLD.key,
          max(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
              COALESCE(strftime('%Y-%m-%dT%H:%M:%fZ', OLD.updated_at, '+0.001 seconds'),
                       strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))));
END;

DROP TRIGGER lineage_nodes_deletion_log_ad;
CREATE TRIGGER lineage_nodes_deletion_log_ad AFTER DELETE ON lineage_nodes
WHEN (SELECT COALESCE(stop, 0) FROM deletion_log_guard) = 0 BEGIN
  INSERT OR IGNORE INTO deletion_events (entity, id, deleted_at)
  VALUES ('lineage_nodes', OLD.id,
          max(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
              COALESCE(strftime('%Y-%m-%dT%H:%M:%fZ', OLD.updated_at, '+0.001 seconds'),
                       strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))));
END;

DROP TRIGGER notes_deletion_log_ad;
CREATE TRIGGER notes_deletion_log_ad AFTER DELETE ON notes
WHEN (SELECT COALESCE(stop, 0) FROM deletion_log_guard) = 0 BEGIN
  INSERT OR IGNORE INTO deletion_events (entity, id, deleted_at)
  VALUES ('notes', OLD.id,
          max(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
              COALESCE(strftime('%Y-%m-%dT%H:%M:%fZ', OLD.updated_at, '+0.001 seconds'),
                       strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))));
END;

DROP TRIGGER papers_deletion_log_ad;
CREATE TRIGGER papers_deletion_log_ad AFTER DELETE ON papers
WHEN (SELECT COALESCE(stop, 0) FROM deletion_log_guard) = 0 BEGIN
  INSERT OR IGNORE INTO deletion_events (entity, id, deleted_at)
  VALUES ('papers', OLD.id,
          max(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
              COALESCE(strftime('%Y-%m-%dT%H:%M:%fZ', OLD.updated_at, '+0.001 seconds'),
                       strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))));
END;
