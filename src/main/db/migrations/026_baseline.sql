-- 026_baseline.sql（执行器 db.transaction 已包事务——本件禁自带 BEGIN/COMMIT[终裁 B4]；禁 IF NOT EXISTS）
-- [F-SNAPCLEAN-01] 迁移链基线压缩（B″ 续号方案，ADR-0030）：本件=旧 001–025 全链
--   执行完毕态的全量终态（DDL 全对象+新库生效种子 DML），新库 user_version 直达 26
--   （版本连续不重置）。旧 25 件随批删除——其升级舞步（加删列/回填/重建/存量清理）
--   唯一消费者=存量旧库，本地旧数据随批 tar 备份后删除（开发期未分发=压缩唯一
--   安全窗）。授权链=2026-10-19 用户裁决「开发阶段一切以最新版本为准，不考虑多余
--   的兼容」（账本 1488 行⑦）+票面受锁面 [tests+migrations]；回退路径与等价证明
--   协议=仓外批档 scripts-audits/20261020-snapclean01/（design-v2-final.md §7）。
-- 对象面（26 表〔含 4 FTS5 虚表——shadow 表 %_data/%_idx/%_docsize/%_config 由
--   CREATE VIRTUAL TABLE 自生不入本件〕+16 索引+59 触发器）：根对象 sql 全文取自
--   参照库 sqlite_master 原文（保真——papers/tags 两表名带引号=旧链 016/019 官方
--   序 RENAME 重建的存储态原文，执行后 sqlite_master 逐位复现）。
-- 种子面（4 组+序表复刻 1 行）：
--   lineage_graph_meta 'lineTypes'（原 010——恒四组空配置）+collections '__main__'
--   （原 012——主图文件夹锚，position=0=空表 COALESCE(MAX,-1)+1）+change_epochs
--   ×10（原 020——epoch 基建播种，恒 0）+deletion_log_guard（原 021——直执守卫
--   单行 stop=0，开库断言依赖）+sqlite_sequence(deletion_events,0)（旧链 022 语句
--   编程面副产品——对空表 DELETE 而触发器含对 AUTOINCREMENT 表的 INSERT 即落行
--   seq=0，值 0≡未分配，显式复刻保双库 sqlite_master 外的内容面逐位一致）。
--   种子置于表后触发器前=与旧链时序同构（播种落库时 epoch 触发器尚未存在——
--   恒 0 不被 bump；升级专用搬运/回填语句〔012 退让+回填/016 清理搬运/019 搬运/
--   010 slot 回填/015 存量换色/022 存量清理〕新库空表 no-op，弃）。
-- 等价证明（收口硬门）：临时目录双库——甲=旧链 25 件全跑（参照快照 ref.db）、
--   乙=仅本件；对照面=sqlite_master 全量 dump+种子表内容 dump+sqlite_sequence，
--   diff 空（批档 equivalence-*.raw.txt）。永驻防线=migrate.test.ts 新库用例
--   断言全对象集+种子行（基线漂移守卫）。

-- ── (1) 表（依赖序：内容表在前、FTS 虚表殿后） ────────────────────────────────

CREATE TABLE "papers" (
  id             TEXT PRIMARY KEY,
  file_ref       TEXT NOT NULL,
  sha256         TEXT NOT NULL UNIQUE,
  title          TEXT NOT NULL DEFAULT '',
  authors_json   TEXT NOT NULL DEFAULT '[]',
  year           INTEGER,
  venue          TEXT NOT NULL DEFAULT '',
  doi            TEXT,
  arxiv_id       TEXT,
  abstract       TEXT NOT NULL DEFAULT '',
  source         TEXT NOT NULL DEFAULT 'local'
                 CHECK (source IN ('local','crossref','openalex','arxiv','manual')),
  enrich_status  TEXT NOT NULL DEFAULT 'pending'
                 CHECK (enrich_status IN ('pending','done','failed','manual')),
  added_at       TEXT NOT NULL,
  updated_at     TEXT NOT NULL,
  last_read_page INTEGER NOT NULL DEFAULT 0,
  cited_by_count INTEGER,
  cited_by_fetched_at TEXT,
  cited_by_count_source TEXT,
  folder_id      TEXT NOT NULL DEFAULT '__main__' REFERENCES collections(id) ON DELETE SET NULL,
  impact_factor  REAL
, is_starred INTEGER NOT NULL DEFAULT 0 CHECK (is_starred IN (0,1)));

CREATE TABLE collections (
  id       TEXT PRIMARY KEY,
  name     TEXT NOT NULL UNIQUE,
  position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE "tags" (
  id        TEXT PRIMARY KEY,
  name      TEXT NOT NULL,
  color     TEXT,
  folder_id TEXT NOT NULL DEFAULT '__main__' REFERENCES collections(id) ON DELETE CASCADE,
  UNIQUE (folder_id, name)
);

CREATE TABLE paper_tags (
  paper_id TEXT NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
  tag_id   TEXT NOT NULL REFERENCES tags(id)   ON DELETE CASCADE,
  PRIMARY KEY (paper_id, tag_id)
);

CREATE TABLE annotations (
  id           TEXT PRIMARY KEY,
  paper_id     TEXT NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
  page         INTEGER NOT NULL CHECK (page >= 0),
  kind         TEXT NOT NULL CHECK (kind IN ('highlight','underline','note')),
  color        TEXT NOT NULL DEFAULT 'yellow'
               CHECK (color IN ('yellow','green','blue','red','purple')),
  quote_text   TEXT NOT NULL DEFAULT '',
  prefix_text  TEXT NOT NULL DEFAULT '',
  suffix_text  TEXT NOT NULL DEFAULT '',
  start_offset INTEGER NOT NULL DEFAULT 0 CHECK (start_offset >= 0),
  end_offset   INTEGER NOT NULL DEFAULT 0 CHECK (end_offset >= start_offset),
  rects_json   TEXT NOT NULL DEFAULT '[]',
  sort_key     TEXT NOT NULL,                       -- "页码:序号"（同页稳定排序）
  comment      TEXT NOT NULL DEFAULT '',
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);

CREATE TABLE notes (
  id         TEXT PRIMARY KEY,
  paper_id   TEXT NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
  title      TEXT NOT NULL DEFAULT '',
  content_md TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE ai_notes (
  id            TEXT PRIMARY KEY,           -- uuid
  paper_id      TEXT NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
  annotation_id TEXT REFERENCES annotations(id) ON DELETE SET NULL,
                                              -- 可空：篇级语料（无锚）∥ 挂用户/AI 标注的段级语料
  role          TEXT NOT NULL CHECK (role IN ('first-read','second-read','adjudicate')),
  question      TEXT NOT NULL,              -- 'Q1'..'Q7' | 'divergence'（divergence=裁决者分歧报告节；Q3/Q6/Q7 允许无锚篇级回答）
  model         TEXT NOT NULL,              -- 实际模型标识（运行时记录，自由文本——D2b 可配）
  quote_text    TEXT NOT NULL DEFAULT '',
  prefix_text   TEXT NOT NULL DEFAULT '',
  suffix_text   TEXT NOT NULL DEFAULT '',
  anchor_page   INTEGER,                    -- AI 报告的页码（1 基，辅助定位；可空）
  content_md    TEXT NOT NULL,              -- 单段内容（该问在该锚定段的回答）
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE TABLE lineage_nodes (
  id         TEXT PRIMARY KEY,            -- uuid
  paper_id   TEXT REFERENCES papers(id) ON DELETE CASCADE,  -- 可空=纯主题节点（阶段分组）
  title      TEXT NOT NULL,
  core_idea  TEXT NOT NULL DEFAULT '',    -- 核心 idea（AI 草稿可填，人工可改）
  year       INTEGER,
  x          REAL,                        -- 手工位置覆盖；NULL=自动布局
  y          REAL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
, tags TEXT, month INTEGER NULL CHECK (month IS NULL OR month BETWEEN 1 AND 12), slot INTEGER NULL, folder_id TEXT REFERENCES collections(id) ON DELETE CASCADE);

CREATE TABLE lineage_edges (
  id         TEXT PRIMARY KEY,
  from_node  TEXT NOT NULL REFERENCES lineage_nodes(id) ON DELETE CASCADE,
  to_node    TEXT NOT NULL REFERENCES lineage_nodes(id) ON DELETE CASCADE,
  label      TEXT NOT NULL DEFAULT '',    -- 逻辑线说明
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'tree', sub TEXT NULL, via TEXT, dashed INTEGER NOT NULL DEFAULT 0, color TEXT NOT NULL DEFAULT '#3a5bd9', from_anchor TEXT, to_anchor TEXT,
  UNIQUE(from_node, to_node)
);

CREATE TABLE lineage_graph_meta (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL            -- 应用层写 ISO 值（弃 DDL DEFAULT——UTC 实测）
);

CREATE TABLE app_meta (
  key        TEXT NOT NULL PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL            -- 应用层写 ISO 值（弃 DDL DEFAULT——UTC 实测，010 先例）
);

CREATE TABLE change_epochs (
  table_name TEXT PRIMARY KEY,
  epoch      INTEGER NOT NULL DEFAULT 0 CHECK (epoch >= 0)
);

CREATE TABLE ai_sessions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  scope      TEXT NOT NULL CHECK (scope IN ('paper','lineage','global')),
  anchor_id  TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK ((scope='global' AND anchor_id IS NULL)
      OR (scope IN ('paper','lineage') AND anchor_id IS NOT NULL))
);

CREATE TABLE ai_messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL REFERENCES ai_sessions(id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content    TEXT NOT NULL,
  pinned     INTEGER NOT NULL DEFAULT 0 CHECK (pinned IN (0,1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE ai_tasks (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  idempotency_key TEXT UNIQUE,
  scope           TEXT NOT NULL CHECK (scope IN ('paper','lineage')),
  anchor_id       TEXT NOT NULL,
  action          TEXT NOT NULL CHECK (action IN ('memory.create','memory.update',
    'memory.delete','memory.pin','memory.unpin','memory.search','memory.list',
    'message.pin','message.unpin')),
  payload         TEXT NOT NULL CHECK (json_valid(payload)),
  status          TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running',
    'succeeded','failed','timeout','cancelled')),
  result          TEXT,
  error           TEXT,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);

CREATE TABLE ai_memory (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  scope          TEXT NOT NULL CHECK (scope IN ('paper','lineage','global')),
  anchor_id      TEXT,
  category       TEXT NOT NULL,
  label          TEXT,
  title          TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 120),
  content        TEXT NOT NULL,
  pinned         INTEGER NOT NULL DEFAULT 0 CHECK (pinned IN (0,1)),
  origin         TEXT NOT NULL CHECK (origin IN ('manual','agent')),
  source_task_id INTEGER REFERENCES ai_tasks(id) ON DELETE SET NULL,
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL,
  CHECK ((scope='global' AND anchor_id IS NULL)
      OR (scope IN ('paper','lineage') AND anchor_id IS NOT NULL)),
  CHECK ((scope='paper' AND category IN ('excerpt_quote','method_note','data_evidence',
            'critique_limit','term_glossary','reading_insight'))
      OR (scope='lineage' AND category IN ('node_role','relation_note','branch_summary',
            'timeline_milestone','controversy_debate','gap_opportunity','domain_glossary'))
      OR (scope='global' AND category IN ('user_preference','ui_guidance','capability_note',
            'automation_recipe','task_outcome','constraint_limit')))
);

CREATE TABLE ai_task_audit (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id    INTEGER NOT NULL,
  seq        INTEGER NOT NULL,
  kind       TEXT NOT NULL,
  detail     TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (task_id, seq)
);

CREATE VIRTUAL TABLE papers_fts USING fts5(
  title, abstract, authors,
  content='papers', content_rowid='rowid',
  tokenize='trigram'
);

CREATE VIRTUAL TABLE notes_fts USING fts5(
  title, content,
  content='notes', content_rowid='rowid',
  tokenize='trigram'
);

CREATE VIRTUAL TABLE annotations_fts USING fts5(
  quote, comment,
  content='annotations', content_rowid='rowid',
  tokenize='trigram'
);

CREATE VIRTUAL TABLE ai_memory_fts USING fts5(
  title, content, label,
  content='ai_memory', content_rowid='rowid',
  tokenize='trigram'
);

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

CREATE TABLE figure_jobs (
  paper_id     TEXT PRIMARY KEY REFERENCES papers(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ready', 'failed')),
  excess       INTEGER NOT NULL DEFAULT 0 CHECK (excess >= 0),
  failed_count INTEGER NOT NULL DEFAULT 0 CHECK (failed_count >= 0),
  updated_at   TEXT NOT NULL
);

CREATE TABLE paper_figures (
  figure_id  TEXT PRIMARY KEY,
  paper_id   TEXT NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
  digest     TEXT NOT NULL,
  file_ref   TEXT NOT NULL,
  page       INTEGER NOT NULL CHECK (page >= 1),
  width      INTEGER NOT NULL CHECK (width > 0),
  height     INTEGER NOT NULL CHECK (height > 0),
  ctm_x      REAL NOT NULL,
  ctm_y      REAL NOT NULL,
  ctm_w      REAL NOT NULL CHECK (ctm_w > 0),
  ctm_h      REAL NOT NULL CHECK (ctm_h > 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (paper_id, digest)
);

CREATE TABLE floating_notes (
  id         TEXT PRIMARY KEY,
  folder_id  TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  x          REAL NOT NULL,
  y          REAL NOT NULL,
  content    TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- ── (2) 新库生效种子（时序=旧链同构：先播种后建 epoch 触发器，epoch 恒 0） ──────
INSERT INTO lineage_graph_meta (key, value, updated_at) VALUES ('lineTypes', '[]', '1970-01-01T00:00:00.000Z');
INSERT INTO collections (id, name, position) VALUES ('__main__', '主图', 0);
INSERT INTO change_epochs (table_name, epoch) VALUES
  ('papers',0),('collections',0),('tags',0),('paper_tags',0),('notes',0),
  ('annotations',0),('lineage_graph_meta',0),('lineage_nodes',0),
  ('lineage_edges',0),('ai_memory',0);
INSERT INTO deletion_log_guard (stop) VALUES (0);
INSERT INTO sqlite_sequence (name, seq) VALUES ('deletion_events', 0);

-- ── (3) 索引（字母序——与参照快照对账序一致） ──────────────────────────────────

CREATE INDEX idx_ai_memory_scope_anchor ON ai_memory
  (scope, anchor_id, category, pinned, updated_at, id);

CREATE INDEX idx_ai_messages_session_pin ON ai_messages (session_id, pinned, id);

CREATE INDEX idx_ai_notes_paper ON ai_notes(paper_id, role, created_at);

CREATE INDEX idx_ai_sessions_scope_anchor ON ai_sessions (scope, anchor_id);

CREATE INDEX idx_ai_task_audit_task ON ai_task_audit (task_id, seq);

CREATE INDEX idx_ai_tasks_target ON ai_tasks (scope, anchor_id, status);

CREATE INDEX idx_annotations_paper ON annotations(paper_id, page, sort_key);

CREATE INDEX idx_floating_notes_folder ON floating_notes(folder_id);

CREATE UNIQUE INDEX idx_lineage_paper ON lineage_nodes(paper_id) WHERE paper_id IS NOT NULL;

CREATE INDEX idx_notes_paper ON notes(paper_id);

CREATE INDEX idx_paper_figures_paper ON paper_figures(paper_id);

CREATE INDEX idx_paper_tags_tag ON paper_tags(tag_id);

CREATE INDEX idx_papers_added_at ON papers(added_at);

CREATE INDEX idx_papers_doi  ON papers(doi);

CREATE INDEX idx_papers_starred ON papers(is_starred) WHERE is_starred = 1;

CREATE INDEX idx_papers_year ON papers(year);

-- ── (4) 触发器（字母序——FTS 同步 9+域守卫 1+ai_memory FTS 3+G2 审计 2+随锚级联 2+epoch×30+删事件 append-only 2+十表删事件落账 10=59） ──

CREATE TRIGGER ai_memory_epoch_ad AFTER DELETE ON ai_memory BEGIN
  INSERT INTO change_epochs (table_name, epoch) VALUES ('ai_memory', 1)
  ON CONFLICT(table_name) DO UPDATE SET epoch = epoch + 1;
END;

CREATE TRIGGER ai_memory_epoch_ai AFTER INSERT ON ai_memory BEGIN
  INSERT INTO change_epochs (table_name, epoch) VALUES ('ai_memory', 1)
  ON CONFLICT(table_name) DO UPDATE SET epoch = epoch + 1;
END;

CREATE TRIGGER ai_memory_epoch_au AFTER UPDATE ON ai_memory BEGIN
  INSERT INTO change_epochs (table_name, epoch) VALUES ('ai_memory', 1)
  ON CONFLICT(table_name) DO UPDATE SET epoch = epoch + 1;
END;

CREATE TRIGGER ai_memory_fts_ad AFTER DELETE ON ai_memory BEGIN
  INSERT INTO ai_memory_fts(ai_memory_fts,rowid,title,content,label)
  VALUES('delete',old.id,old.title,old.content,old.label);
END;

CREATE TRIGGER ai_memory_fts_ai AFTER INSERT ON ai_memory BEGIN
  INSERT INTO ai_memory_fts(rowid,title,content,label)
  VALUES(new.id,new.title,new.content,new.label);
END;

CREATE TRIGGER ai_memory_fts_au AFTER UPDATE OF title, content, label ON ai_memory BEGIN
  INSERT INTO ai_memory_fts(ai_memory_fts,rowid,title,content,label)
  VALUES('delete',old.id,old.title,old.content,old.label);
  INSERT INTO ai_memory_fts(rowid,title,content,label)
  VALUES(new.id,new.title,new.content,new.label);
END;

CREATE TRIGGER ai_task_audit_g2_no_delete BEFORE DELETE ON ai_task_audit BEGIN
  SELECT RAISE(ABORT, 'ai_task_audit 为 G2 append-only 审计面：禁止删除');
END;

CREATE TRIGGER ai_task_audit_g2_no_update BEFORE UPDATE ON ai_task_audit BEGIN
  SELECT RAISE(ABORT, 'ai_task_audit 为 G2 append-only 审计面：禁止修改');
END;

CREATE TRIGGER annotations_deletion_log_ad AFTER DELETE ON annotations
WHEN (SELECT COALESCE(stop, 0) FROM deletion_log_guard) = 0 BEGIN
  INSERT OR IGNORE INTO deletion_events (entity, id, deleted_at)
  VALUES ('annotations', OLD.id, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
END;

CREATE TRIGGER annotations_epoch_ad AFTER DELETE ON annotations BEGIN
  INSERT INTO change_epochs (table_name, epoch) VALUES ('annotations', 1)
  ON CONFLICT(table_name) DO UPDATE SET epoch = epoch + 1;
END;

CREATE TRIGGER annotations_epoch_ai AFTER INSERT ON annotations BEGIN
  INSERT INTO change_epochs (table_name, epoch) VALUES ('annotations', 1)
  ON CONFLICT(table_name) DO UPDATE SET epoch = epoch + 1;
END;

CREATE TRIGGER annotations_epoch_au AFTER UPDATE ON annotations BEGIN
  INSERT INTO change_epochs (table_name, epoch) VALUES ('annotations', 1)
  ON CONFLICT(table_name) DO UPDATE SET epoch = epoch + 1;
END;

CREATE TRIGGER annotations_fts_ad AFTER DELETE ON annotations BEGIN
  INSERT INTO annotations_fts(annotations_fts, rowid, quote, comment)
  VALUES ('delete', old.rowid, old.quote_text, old.comment);
END;

CREATE TRIGGER annotations_fts_ai AFTER INSERT ON annotations BEGIN
  INSERT INTO annotations_fts(rowid, quote, comment)
  VALUES (new.rowid, new.quote_text, new.comment);
END;

CREATE TRIGGER annotations_fts_au AFTER UPDATE OF quote_text, comment ON annotations BEGIN
  INSERT INTO annotations_fts(annotations_fts, rowid, quote, comment)
  VALUES ('delete', old.rowid, old.quote_text, old.comment);
  INSERT INTO annotations_fts(rowid, quote, comment)
  VALUES (new.rowid, new.quote_text, new.comment);
END;

CREATE TRIGGER collections_ai_anchor_cascade AFTER DELETE ON collections BEGIN
  DELETE FROM ai_memory WHERE scope='lineage' AND anchor_id=OLD.id;
  DELETE FROM ai_sessions WHERE scope='lineage' AND anchor_id=OLD.id;
  DELETE FROM ai_tasks WHERE scope='lineage' AND anchor_id=OLD.id;
  INSERT INTO change_epochs (table_name, epoch) VALUES ('ai_memory', 1)
    ON CONFLICT(table_name) DO UPDATE SET epoch = epoch + 1;
END;

CREATE TRIGGER collections_deletion_log_ad AFTER DELETE ON collections
WHEN (SELECT COALESCE(stop, 0) FROM deletion_log_guard) = 0 BEGIN
  INSERT OR IGNORE INTO deletion_events (entity, id, deleted_at)
  VALUES ('collections', OLD.id, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
END;

CREATE TRIGGER collections_epoch_ad AFTER DELETE ON collections BEGIN
  INSERT INTO change_epochs (table_name, epoch) VALUES ('collections', 1)
  ON CONFLICT(table_name) DO UPDATE SET epoch = epoch + 1;
END;

CREATE TRIGGER collections_epoch_ai AFTER INSERT ON collections BEGIN
  INSERT INTO change_epochs (table_name, epoch) VALUES ('collections', 1)
  ON CONFLICT(table_name) DO UPDATE SET epoch = epoch + 1;
END;

CREATE TRIGGER collections_epoch_au AFTER UPDATE ON collections BEGIN
  INSERT INTO change_epochs (table_name, epoch) VALUES ('collections', 1)
  ON CONFLICT(table_name) DO UPDATE SET epoch = epoch + 1;
END;

CREATE TRIGGER deletion_events_no_delete BEFORE DELETE ON deletion_events BEGIN
  SELECT RAISE(ABORT, 'deletion_events 为 append-only 删事件日志：禁止删除');
END;

CREATE TRIGGER deletion_events_no_update BEFORE UPDATE ON deletion_events BEGIN
  SELECT RAISE(ABORT, 'deletion_events 为 append-only 删事件日志：禁止修改');
END;

CREATE TRIGGER floating_notes_deletion_log_ad AFTER DELETE ON floating_notes
WHEN (SELECT COALESCE(stop, 0) FROM deletion_log_guard) = 0 BEGIN
  INSERT OR IGNORE INTO deletion_events (entity, id, deleted_at)
  VALUES ('floating_notes', OLD.id, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
END;

CREATE TRIGGER lineage_edges_deletion_log_ad AFTER DELETE ON lineage_edges
WHEN (SELECT COALESCE(stop, 0) FROM deletion_log_guard) = 0 BEGIN
  INSERT OR IGNORE INTO deletion_events (entity, id, deleted_at)
  VALUES ('lineage_edges', OLD.id, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
END;

CREATE TRIGGER lineage_edges_epoch_ad AFTER DELETE ON lineage_edges BEGIN
  INSERT INTO change_epochs (table_name, epoch) VALUES ('lineage_edges', 1)
  ON CONFLICT(table_name) DO UPDATE SET epoch = epoch + 1;
END;

CREATE TRIGGER lineage_edges_epoch_ai AFTER INSERT ON lineage_edges BEGIN
  INSERT INTO change_epochs (table_name, epoch) VALUES ('lineage_edges', 1)
  ON CONFLICT(table_name) DO UPDATE SET epoch = epoch + 1;
END;

CREATE TRIGGER lineage_edges_epoch_au AFTER UPDATE ON lineage_edges BEGIN
  INSERT INTO change_epochs (table_name, epoch) VALUES ('lineage_edges', 1)
  ON CONFLICT(table_name) DO UPDATE SET epoch = epoch + 1;
END;

CREATE TRIGGER lineage_graph_meta_deletion_log_ad AFTER DELETE ON lineage_graph_meta
WHEN (SELECT COALESCE(stop, 0) FROM deletion_log_guard) = 0 BEGIN
  INSERT OR IGNORE INTO deletion_events (entity, id, deleted_at)
  VALUES ('lineage_graph_meta', OLD.key, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
END;

CREATE TRIGGER lineage_graph_meta_epoch_ad AFTER DELETE ON lineage_graph_meta BEGIN
  INSERT INTO change_epochs (table_name, epoch) VALUES ('lineage_graph_meta', 1)
  ON CONFLICT(table_name) DO UPDATE SET epoch = epoch + 1;
END;

CREATE TRIGGER lineage_graph_meta_epoch_ai AFTER INSERT ON lineage_graph_meta BEGIN
  INSERT INTO change_epochs (table_name, epoch) VALUES ('lineage_graph_meta', 1)
  ON CONFLICT(table_name) DO UPDATE SET epoch = epoch + 1;
END;

CREATE TRIGGER lineage_graph_meta_epoch_au AFTER UPDATE ON lineage_graph_meta BEGIN
  INSERT INTO change_epochs (table_name, epoch) VALUES ('lineage_graph_meta', 1)
  ON CONFLICT(table_name) DO UPDATE SET epoch = epoch + 1;
END;

CREATE TRIGGER lineage_nodes_deletion_log_ad AFTER DELETE ON lineage_nodes
WHEN (SELECT COALESCE(stop, 0) FROM deletion_log_guard) = 0 BEGIN
  INSERT OR IGNORE INTO deletion_events (entity, id, deleted_at)
  VALUES ('lineage_nodes', OLD.id, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
END;

CREATE TRIGGER lineage_nodes_epoch_ad AFTER DELETE ON lineage_nodes BEGIN
  INSERT INTO change_epochs (table_name, epoch) VALUES ('lineage_nodes', 1)
  ON CONFLICT(table_name) DO UPDATE SET epoch = epoch + 1;
END;

CREATE TRIGGER lineage_nodes_epoch_ai AFTER INSERT ON lineage_nodes BEGIN
  INSERT INTO change_epochs (table_name, epoch) VALUES ('lineage_nodes', 1)
  ON CONFLICT(table_name) DO UPDATE SET epoch = epoch + 1;
END;

CREATE TRIGGER lineage_nodes_epoch_au AFTER UPDATE ON lineage_nodes BEGIN
  INSERT INTO change_epochs (table_name, epoch) VALUES ('lineage_nodes', 1)
  ON CONFLICT(table_name) DO UPDATE SET epoch = epoch + 1;
END;

CREATE TRIGGER notes_deletion_log_ad AFTER DELETE ON notes
WHEN (SELECT COALESCE(stop, 0) FROM deletion_log_guard) = 0 BEGIN
  INSERT OR IGNORE INTO deletion_events (entity, id, deleted_at)
  VALUES ('notes', OLD.id, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
END;

CREATE TRIGGER notes_epoch_ad AFTER DELETE ON notes BEGIN
  INSERT INTO change_epochs (table_name, epoch) VALUES ('notes', 1)
  ON CONFLICT(table_name) DO UPDATE SET epoch = epoch + 1;
END;

CREATE TRIGGER notes_epoch_ai AFTER INSERT ON notes BEGIN
  INSERT INTO change_epochs (table_name, epoch) VALUES ('notes', 1)
  ON CONFLICT(table_name) DO UPDATE SET epoch = epoch + 1;
END;

CREATE TRIGGER notes_epoch_au AFTER UPDATE ON notes BEGIN
  INSERT INTO change_epochs (table_name, epoch) VALUES ('notes', 1)
  ON CONFLICT(table_name) DO UPDATE SET epoch = epoch + 1;
END;

CREATE TRIGGER notes_fts_ad AFTER DELETE ON notes BEGIN
  INSERT INTO notes_fts(notes_fts, rowid, title, content)
  VALUES ('delete', old.rowid, old.title, old.content_md);
END;

CREATE TRIGGER notes_fts_ai AFTER INSERT ON notes BEGIN
  INSERT INTO notes_fts(rowid, title, content) VALUES (new.rowid, new.title, new.content_md);
END;

CREATE TRIGGER notes_fts_au AFTER UPDATE OF title, content_md ON notes BEGIN
  INSERT INTO notes_fts(notes_fts, rowid, title, content)
  VALUES ('delete', old.rowid, old.title, old.content_md);
  INSERT INTO notes_fts(rowid, title, content) VALUES (new.rowid, new.title, new.content_md);
END;

CREATE TRIGGER paper_tags_deletion_log_ad AFTER DELETE ON paper_tags
WHEN (SELECT COALESCE(stop, 0) FROM deletion_log_guard) = 0 BEGIN
  INSERT OR IGNORE INTO deletion_events (entity, id, deleted_at)
  VALUES ('paper_tags', OLD.paper_id || '|' || OLD.tag_id, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
END;

CREATE TRIGGER paper_tags_domain_guard BEFORE INSERT ON paper_tags
BEGIN
  SELECT RAISE(ABORT, 'paper_tags 挂接域违约：paper 与 tag 的 folder 不一致')
  WHERE (SELECT folder_id FROM papers WHERE id = NEW.paper_id)
     <> (SELECT folder_id FROM tags WHERE id = NEW.tag_id);
END;

CREATE TRIGGER paper_tags_epoch_ad AFTER DELETE ON paper_tags BEGIN
  INSERT INTO change_epochs (table_name, epoch) VALUES ('paper_tags', 1)
  ON CONFLICT(table_name) DO UPDATE SET epoch = epoch + 1;
END;

CREATE TRIGGER paper_tags_epoch_ai AFTER INSERT ON paper_tags BEGIN
  INSERT INTO change_epochs (table_name, epoch) VALUES ('paper_tags', 1)
  ON CONFLICT(table_name) DO UPDATE SET epoch = epoch + 1;
END;

CREATE TRIGGER paper_tags_epoch_au AFTER UPDATE ON paper_tags BEGIN
  INSERT INTO change_epochs (table_name, epoch) VALUES ('paper_tags', 1)
  ON CONFLICT(table_name) DO UPDATE SET epoch = epoch + 1;
END;

CREATE TRIGGER papers_ai_anchor_cascade AFTER DELETE ON papers BEGIN
  DELETE FROM ai_memory WHERE scope='paper' AND anchor_id=OLD.id;
  DELETE FROM ai_sessions WHERE scope='paper' AND anchor_id=OLD.id;
  DELETE FROM ai_tasks WHERE scope='paper' AND anchor_id=OLD.id;
  INSERT INTO change_epochs (table_name, epoch) VALUES ('ai_memory', 1)
    ON CONFLICT(table_name) DO UPDATE SET epoch = epoch + 1;
END;

CREATE TRIGGER papers_deletion_log_ad AFTER DELETE ON papers
WHEN (SELECT COALESCE(stop, 0) FROM deletion_log_guard) = 0 BEGIN
  INSERT OR IGNORE INTO deletion_events (entity, id, deleted_at)
  VALUES ('papers', OLD.id, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
END;

CREATE TRIGGER papers_epoch_ad AFTER DELETE ON papers BEGIN
  INSERT INTO change_epochs (table_name, epoch) VALUES ('papers', 1)
  ON CONFLICT(table_name) DO UPDATE SET epoch = epoch + 1;
END;

CREATE TRIGGER papers_epoch_ai AFTER INSERT ON papers BEGIN
  INSERT INTO change_epochs (table_name, epoch) VALUES ('papers', 1)
  ON CONFLICT(table_name) DO UPDATE SET epoch = epoch + 1;
END;

CREATE TRIGGER papers_epoch_au AFTER UPDATE ON papers BEGIN
  INSERT INTO change_epochs (table_name, epoch) VALUES ('papers', 1)
  ON CONFLICT(table_name) DO UPDATE SET epoch = epoch + 1;
END;

CREATE TRIGGER papers_fts_ad AFTER DELETE ON papers BEGIN
  INSERT INTO papers_fts(papers_fts, rowid, title, abstract, authors)
  VALUES ('delete', old.rowid, old.title, old.abstract, old.authors_json);
END;

CREATE TRIGGER papers_fts_ai AFTER INSERT ON papers BEGIN
  INSERT INTO papers_fts(rowid, title, abstract, authors)
  VALUES (new.rowid, new.title, new.abstract, new.authors_json);
END;

CREATE TRIGGER papers_fts_au AFTER UPDATE OF title, abstract, authors_json ON papers BEGIN
  INSERT INTO papers_fts(papers_fts, rowid, title, abstract, authors)
  VALUES ('delete', old.rowid, old.title, old.abstract, old.authors_json);
  INSERT INTO papers_fts(rowid, title, abstract, authors)
  VALUES (new.rowid, new.title, new.abstract, new.authors_json);
END;

CREATE TRIGGER tags_deletion_log_ad AFTER DELETE ON tags
WHEN (SELECT COALESCE(stop, 0) FROM deletion_log_guard) = 0 BEGIN
  INSERT OR IGNORE INTO deletion_events (entity, id, deleted_at)
  VALUES ('tags', OLD.id, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
END;

CREATE TRIGGER tags_epoch_ad AFTER DELETE ON tags BEGIN
  INSERT INTO change_epochs (table_name, epoch) VALUES ('tags', 1)
  ON CONFLICT(table_name) DO UPDATE SET epoch = epoch + 1;
END;

CREATE TRIGGER tags_epoch_ai AFTER INSERT ON tags BEGIN
  INSERT INTO change_epochs (table_name, epoch) VALUES ('tags', 1)
  ON CONFLICT(table_name) DO UPDATE SET epoch = epoch + 1;
END;

CREATE TRIGGER tags_epoch_au AFTER UPDATE ON tags BEGIN
  INSERT INTO change_epochs (table_name, epoch) VALUES ('tags', 1)
  ON CONFLICT(table_name) DO UPDATE SET epoch = epoch + 1;
END;
