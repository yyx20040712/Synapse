-- 021_deletion_events.sql（执行器 db.transaction 已包事务——本件禁自带 BEGIN/COMMIT[终裁 B4]；禁 IF NOT EXISTS）
-- [F-DBCAMP-01 DB-3 U1] 删事件日志（设计 §13.1 A1 主裁形态；§13.3 021 号改派）：
--   deletion_events append-only 删事件账+deletion_log_guard 直执守卫+导出面九表
--   （§13.7）AFTER DELETE 触发器族+append-only 拒写防御。纯新增表+触发器无表
--   重建，无 fkOff；新库 user_version 终值 21。
-- 口径与依据（§13.1）：
--   deleted_at=DB 时钟 strftime('%Y-%m-%dT%H:%M:%fZ','now')（触发器内无应用层
--   时钟——r3-N3 勘误）；与应用层 ISO 域差为毫秒级混源，单调性由 seq 保、跨端
--   比较不依赖 deleted_at（申报接受，随批入档）。
--   去重面=UNIQUE(entity,id,deleted_at)+触发器 INSERT OR IGNORE（UNIQUE 冲突=
--   约束冲突→OR IGNORE 吞=去重机制；append-only 防御的 RAISE(ABORT) 非约束
--   冲突不被 OR IGNORE 吞〔019 专例〕——两语义兼容）。
--   直执抑制=触发器 WHEN 守卫读 deletion_log_guard.stop（导入事务内置 1→直执
--   →复位 0 同事务=崩溃自回滚无悬挂态；开库断言见 migrate.ts——守卫悬挂态由
--   静默失效转显性告警 r3-N7②）。COALESCE 兜守卫行 stop 取 NULL 值；守卫表
--   空行（播种恰 1 行+应用层无删行路径，被破坏即异常态）下标量子查询 NULL=
--   WHEN 不成立→静默停记（防线停摆面，非安全默认——由 migrate.ts 开库断言
--   行数≠1 捕获为显性错误）。
--   级联语义=实测超集口径：recursive_triggers=0 下 FK 级联点火子表 DELETE
--   触发器（探针 probe-cascade-deletionlog+020 头注 T3/R4-1 锁定测试一致），
--   级联行事件在场=完整落账超集（删带 N 子行的父行→N+1 事件行）。级联面全枚
--   （FK 子句实照）：papers→{paper_tags,annotations,notes}（001 paper_tags.
--   paper_id/annotations.paper_id/notes.paper_id 三 CASCADE）+papers→
--   lineage_nodes→lineage_edges 二段（004 lineage_nodes.paper_id CASCADE+
--   004:26-27 edges 两端 CASCADE）；tags→paper_tags（001 paper_tags.tag_id
--   CASCADE）；collections→{tags,lineage_nodes}→lineage_edges 二段（019:26
--   tags.folder_id+012:54 lineage_nodes.folder_id CASCADE+004:26-27）。
--   papers.folder_id→collections=SET NULL（016），但 folder_id NOT NULL
--   （016/INV-122）下删含文献的夹被 NOT NULL 违约拒=天然拒删非空夹——SET NULL
--   分支实际不可达，无事件面结论不变。服务层零侵入（repo 删除路径不改——
--   §13.1 落账节）。
--   身份矩阵（§13.1 逐表）：常规表=OLD.id；paper_tags=OLD.paper_id||'|'||OLD.
--   tag_id（两分量恒 uuid，'|' 不现于字母数字集=无碰撞无转义面）；
--   lineage_graph_meta=OLD.key（KV 表非 id 列）。
-- ── (1) 删事件账+直执守卫表 ─────────────────────────────────────────────────
CREATE TABLE deletion_events (
  seq        INTEGER PRIMARY KEY AUTOINCREMENT,
  entity     TEXT NOT NULL,
  id         TEXT NOT NULL,
  deleted_at TEXT NOT NULL,
  UNIQUE (entity, id, deleted_at)
);
CREATE TABLE deletion_log_guard (
  stop INTEGER NOT NULL DEFAULT 0 CHECK (stop IN (0, 1))
);
INSERT INTO deletion_log_guard (stop) VALUES (0);
-- ── (2) append-only 拒写防御（020 G2 体例）──────────────────────────────────
CREATE TRIGGER deletion_events_no_update BEFORE UPDATE ON deletion_events BEGIN
  SELECT RAISE(ABORT, 'deletion_events 为 append-only 删事件日志：禁止修改');
END;
CREATE TRIGGER deletion_events_no_delete BEFORE DELETE ON deletion_events BEGIN
  SELECT RAISE(ABORT, 'deletion_events 为 append-only 删事件日志：禁止删除');
END;
-- ── (3) 九表 AFTER DELETE 触发器族（WHEN 守卫=直执落账抑制）─────────────────
CREATE TRIGGER papers_deletion_log_ad AFTER DELETE ON papers
WHEN (SELECT COALESCE(stop, 0) FROM deletion_log_guard) = 0 BEGIN
  INSERT OR IGNORE INTO deletion_events (entity, id, deleted_at)
  VALUES ('papers', OLD.id, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
END;
CREATE TRIGGER collections_deletion_log_ad AFTER DELETE ON collections
WHEN (SELECT COALESCE(stop, 0) FROM deletion_log_guard) = 0 BEGIN
  INSERT OR IGNORE INTO deletion_events (entity, id, deleted_at)
  VALUES ('collections', OLD.id, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
END;
CREATE TRIGGER tags_deletion_log_ad AFTER DELETE ON tags
WHEN (SELECT COALESCE(stop, 0) FROM deletion_log_guard) = 0 BEGIN
  INSERT OR IGNORE INTO deletion_events (entity, id, deleted_at)
  VALUES ('tags', OLD.id, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
END;
CREATE TRIGGER paper_tags_deletion_log_ad AFTER DELETE ON paper_tags
WHEN (SELECT COALESCE(stop, 0) FROM deletion_log_guard) = 0 BEGIN
  INSERT OR IGNORE INTO deletion_events (entity, id, deleted_at)
  VALUES ('paper_tags', OLD.paper_id || '|' || OLD.tag_id, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
END;
CREATE TRIGGER notes_deletion_log_ad AFTER DELETE ON notes
WHEN (SELECT COALESCE(stop, 0) FROM deletion_log_guard) = 0 BEGIN
  INSERT OR IGNORE INTO deletion_events (entity, id, deleted_at)
  VALUES ('notes', OLD.id, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
END;
CREATE TRIGGER annotations_deletion_log_ad AFTER DELETE ON annotations
WHEN (SELECT COALESCE(stop, 0) FROM deletion_log_guard) = 0 BEGIN
  INSERT OR IGNORE INTO deletion_events (entity, id, deleted_at)
  VALUES ('annotations', OLD.id, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
END;
CREATE TRIGGER lineage_graph_meta_deletion_log_ad AFTER DELETE ON lineage_graph_meta
WHEN (SELECT COALESCE(stop, 0) FROM deletion_log_guard) = 0 BEGIN
  INSERT OR IGNORE INTO deletion_events (entity, id, deleted_at)
  VALUES ('lineage_graph_meta', OLD.key, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
END;
CREATE TRIGGER lineage_nodes_deletion_log_ad AFTER DELETE ON lineage_nodes
WHEN (SELECT COALESCE(stop, 0) FROM deletion_log_guard) = 0 BEGIN
  INSERT OR IGNORE INTO deletion_events (entity, id, deleted_at)
  VALUES ('lineage_nodes', OLD.id, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
END;
CREATE TRIGGER lineage_edges_deletion_log_ad AFTER DELETE ON lineage_edges
WHEN (SELECT COALESCE(stop, 0) FROM deletion_log_guard) = 0 BEGIN
  INSERT OR IGNORE INTO deletion_events (entity, id, deleted_at)
  VALUES ('lineage_edges', OLD.id, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
END;
