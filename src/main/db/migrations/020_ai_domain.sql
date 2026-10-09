-- 020_ai_domain.sql（执行器 db.transaction 已包事务——本件禁自带 BEGIN/COMMIT[终裁 B4]；禁 IF NOT EXISTS）
-- [F-DBCAMP-01 DB-2 U1] AI 域数据面：epoch 基建（INV-J）+AI 域 5 新表+分类条件枚举
--   +G2 审计触发器+随锚级联触发器。新库 user_version 终值 20（纯新增无表重建，无 fkOff）。
-- 裁决链（用户 2026-10-09 晨裁定①②④⑥+三轮指令，docs/design/2026-10-09_f-dbcamp01-
--   db2-ai-domain-report.md §5-裁）：①记忆单点归属+三档完全隔离（global=助手任务域能力域
--   不载研究内容）；②三档各自分类体系（08:51 二轮终态=taxonomy-proposal-v1.md 推荐案
--   19 类 6+7+6 跨档零同名冻结）；④G2 触发器级审计（禁改禁删审计行）；⑥B 案随锚级联
--   删除+两次确认（级联面=sessions/messages/memory/tasks；audit 恒存）；三轮指令=lineage
--   注入骨架常驻+按需展开（epoch 机制为其失效信号基建）。
-- 终裁 T1-T5（简报 §3+仓外 db2-ai-final-addendum.md）：
--   T1 anchor 语义：anchor_id TEXT；global=NULL/paper→papers.id/lineage→collections.id
--     （folder↔graph 结构性投影，ADR-0025）；条件 CHECK 承载多态；无 FK（多态锚存在性=
--     服务层校验面）。
--   T2 级联×G2 相容：级联面=ai_sessions（messages 经 FK CASCADE 随灭）+ai_memory+ai_tasks；
--     ai_task_audit 恒存（append-only 取证边界；task_id=逻辑引用不设 FK，级联后审计行保留、
--     task_id 悬挂为接受面）。
--   T3 recursive_triggers 实照（实现期勘正，自裁申报在案）：连接 pragma 无 recursive_
--     triggers（探针实测=0/OFF；其语义=只禁同表自递归，跨表链式照常点火——仓外
--     probe-rt-fk 在档）；且 §3 原案级联体
--     「显式 FTS 删先行+memory 后删」在链式点火下=FTS 双删（先行 DELETE 直清索引+链式
--     ai_memory_fts_ad 再补 'delete' 指令）→ SQLITE_CORRUPT "database disk image is
--     malformed"（仓外 probe-cascade.mjs/probe-isolate.mjs 实证）。终案级联体=memory 先删
--     （链式 _ad 清 FTS）+sessions+tasks+显式 epoch bump（probe-isolate.mjs C1-C10 全景：
--     integrity-check 过/他锚零扰/audit 恒存/epoch 前进）。epoch 算术=级联体内 ai_memory
--     行灭时链式 ai_memory_epoch_ad +1 与显式 bump +1 合计 +2（锚下单行场景；0 行=+1、
--     N 行=N+1；显式 bump 保留=递进下限与触发器链语义解耦的确定性保证）。+2 算术以
--     source_task_id 同锚为前提——跨锚引用面=U2 服务层写入约束。FK 级联灭失行
--     （notes/annotations/paper_tags/tags/lineage_nodes 的 papers/collections CASCADE 面）
--     在本栈实测点火各表 epoch_ad（探针+M6 断言锁定）。二段级联链（collections→
--     lineage_nodes→lineage_edges、collections→tags→paper_tags、papers→
--     lineage_nodes→lineage_edges——edges/挂接的 CASCADE FK 面 probe-fk2 实照）
--     按同机制推定点火，断言锁=U2 注入面批补（门一 d1-N2 挂账）。
--   T4 分类冻结 19 类=6+7+6（跨档零同名，用户定稿案；审核有条件放行全处置后零改动冻结）。
--   T5 审核处置口径句（六条全录）：
--     ①term_glossary(paper)↔domain_glossary(lineage) 归属=按沉淀语境（单文献生僻术语→paper；
--       图域/领域级概念→lineage）；双存=有意（三档隔离检索）；代理同图同术语已存则更新不重复建（服务层面）。
--     ②负向评价与有效性边界优先入 critique_limit；method_note=机制流程叙述/data_evidence=
--       产出数值与图表证据。
--     ③单节点自属性→node_role、两节点间→relation_note、超单边聚合→branch_summary；结构性
--       事实（连线存在/方向/kind）恒以图表为准不入记忆类；退役触发=图模型若升一等字段则两类经迁移退役。
--     ④task_outcome 剥离的研究内容侧=丢弃不落库（会话历史承载）。
--     ⑤capability_note=能做什么/automation_recipe=怎么做（可复现步骤）/constraint_limit=
--       不能做（边界限制）。
--     ⑥excerpt_quote=逐字原文收口。
-- epoch 集合=10 物理表：papers/collections/tags/paper_tags/notes/annotations/
--   lineage_graph_meta/lineage_nodes/lineage_edges/ai_memory（§3.F 实照；ai_sessions/
--   ai_messages/ai_tasks/ai_task_audit 不入集合——消息=现算尾段、任务/审计不进 prompt、
--   会话行不进前缀）。每表 3 触发器（I/U/D，UPSERT 自愈：缺行即建、冲突 epoch+1）+
--   播种 10 行 epoch=0。
-- 触发器计数 37=30（10 表×3 epoch）+3（ai_memory FTS）+2（G2）+2（随锚级联）——
--   设计报告口径 33=30+3（裁定④⑥前），+4=裁定④⑥ 引入（G2×2+级联×2）。
-- ── (1) epoch 计数基建 ──────────────────────────────────────────────────────
CREATE TABLE change_epochs (
  table_name TEXT PRIMARY KEY,
  epoch      INTEGER NOT NULL DEFAULT 0 CHECK (epoch >= 0)
);
INSERT INTO change_epochs (table_name, epoch) VALUES
  ('papers',0),('collections',0),('tags',0),('paper_tags',0),('notes',0),
  ('annotations',0),('lineage_graph_meta',0),('lineage_nodes',0),
  ('lineage_edges',0),('ai_memory',0);
-- ── (2) AI 域 5 新表+显式索引 ───────────────────────────────────────────────
CREATE TABLE ai_sessions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  scope      TEXT NOT NULL CHECK (scope IN ('paper','lineage','global')),
  anchor_id  TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK ((scope='global' AND anchor_id IS NULL)
      OR (scope IN ('paper','lineage') AND anchor_id IS NOT NULL))
);
CREATE INDEX idx_ai_sessions_scope_anchor ON ai_sessions (scope, anchor_id);
CREATE TABLE ai_messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL REFERENCES ai_sessions(id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content    TEXT NOT NULL,
  pinned     INTEGER NOT NULL DEFAULT 0 CHECK (pinned IN (0,1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_ai_messages_session_pin ON ai_messages (session_id, pinned, id);
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
CREATE INDEX idx_ai_tasks_target ON ai_tasks (scope, anchor_id, status);
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
CREATE INDEX idx_ai_memory_scope_anchor ON ai_memory
  (scope, anchor_id, category, pinned, updated_at, id);
CREATE TABLE ai_task_audit (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id    INTEGER NOT NULL,
  seq        INTEGER NOT NULL,
  kind       TEXT NOT NULL,
  detail     TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (task_id, seq)
);
CREATE INDEX idx_ai_task_audit_task ON ai_task_audit (task_id, seq);
-- ── (3) ai_memory FTS（external content+trigram——001 papers_fts 同款）─────────
--   ai_memory 行 id=INTEGER PK AUTOINCREMENT=rowid 别名，FTS rowid 直用 id
CREATE VIRTUAL TABLE ai_memory_fts USING fts5(
  title, content, label,
  content='ai_memory', content_rowid='rowid',
  tokenize='trigram'
);
CREATE TRIGGER ai_memory_fts_ai AFTER INSERT ON ai_memory BEGIN
  INSERT INTO ai_memory_fts(rowid,title,content,label)
  VALUES(new.id,new.title,new.content,new.label);
END;
CREATE TRIGGER ai_memory_fts_ad AFTER DELETE ON ai_memory BEGIN
  INSERT INTO ai_memory_fts(ai_memory_fts,rowid,title,content,label)
  VALUES('delete',old.id,old.title,old.content,old.label);
END;
CREATE TRIGGER ai_memory_fts_au AFTER UPDATE OF title, content, label ON ai_memory BEGIN
  INSERT INTO ai_memory_fts(ai_memory_fts,rowid,title,content,label)
  VALUES('delete',old.id,old.title,old.content,old.label);
  INSERT INTO ai_memory_fts(rowid,title,content,label)
  VALUES(new.id,new.title,new.content,new.label);
END;
-- ── (4) G2 审计 append-only 触发器（裁定④）─────────────────────────────────
CREATE TRIGGER ai_task_audit_g2_no_update BEFORE UPDATE ON ai_task_audit BEGIN
  SELECT RAISE(ABORT, 'ai_task_audit 为 G2 append-only 审计面：禁止修改');
END;
CREATE TRIGGER ai_task_audit_g2_no_delete BEFORE DELETE ON ai_task_audit BEGIN
  SELECT RAISE(ABORT, 'ai_task_audit 为 G2 append-only 审计面：禁止删除');
END;
-- ── (5) 随锚级联触发器（裁定⑥ B 案；T3 实照修正体=T3 注记）──────────────────
--   级联面：FTS（经链式 _ad）→memory→sessions（messages 经 FK CASCADE 随灭）→tasks
--   →ai_memory epoch 显式 bump；audit 恒存（T2）
CREATE TRIGGER papers_ai_anchor_cascade AFTER DELETE ON papers BEGIN
  DELETE FROM ai_memory WHERE scope='paper' AND anchor_id=OLD.id;
  DELETE FROM ai_sessions WHERE scope='paper' AND anchor_id=OLD.id;
  DELETE FROM ai_tasks WHERE scope='paper' AND anchor_id=OLD.id;
  INSERT INTO change_epochs (table_name, epoch) VALUES ('ai_memory', 1)
    ON CONFLICT(table_name) DO UPDATE SET epoch = epoch + 1;
END;
CREATE TRIGGER collections_ai_anchor_cascade AFTER DELETE ON collections BEGIN
  DELETE FROM ai_memory WHERE scope='lineage' AND anchor_id=OLD.id;
  DELETE FROM ai_sessions WHERE scope='lineage' AND anchor_id=OLD.id;
  DELETE FROM ai_tasks WHERE scope='lineage' AND anchor_id=OLD.id;
  INSERT INTO change_epochs (table_name, epoch) VALUES ('ai_memory', 1)
    ON CONFLICT(table_name) DO UPDATE SET epoch = epoch + 1;
END;
-- ── (6) epoch 触发器 ×30（10 表各 3；_au 无 OF=任意列更新皆 bump，保守过失效）──
CREATE TRIGGER papers_epoch_ai AFTER INSERT ON papers BEGIN
  INSERT INTO change_epochs (table_name, epoch) VALUES ('papers', 1)
  ON CONFLICT(table_name) DO UPDATE SET epoch = epoch + 1;
END;
CREATE TRIGGER papers_epoch_au AFTER UPDATE ON papers BEGIN
  INSERT INTO change_epochs (table_name, epoch) VALUES ('papers', 1)
  ON CONFLICT(table_name) DO UPDATE SET epoch = epoch + 1;
END;
CREATE TRIGGER papers_epoch_ad AFTER DELETE ON papers BEGIN
  INSERT INTO change_epochs (table_name, epoch) VALUES ('papers', 1)
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
CREATE TRIGGER collections_epoch_ad AFTER DELETE ON collections BEGIN
  INSERT INTO change_epochs (table_name, epoch) VALUES ('collections', 1)
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
CREATE TRIGGER tags_epoch_ad AFTER DELETE ON tags BEGIN
  INSERT INTO change_epochs (table_name, epoch) VALUES ('tags', 1)
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
CREATE TRIGGER paper_tags_epoch_ad AFTER DELETE ON paper_tags BEGIN
  INSERT INTO change_epochs (table_name, epoch) VALUES ('paper_tags', 1)
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
CREATE TRIGGER notes_epoch_ad AFTER DELETE ON notes BEGIN
  INSERT INTO change_epochs (table_name, epoch) VALUES ('notes', 1)
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
CREATE TRIGGER annotations_epoch_ad AFTER DELETE ON annotations BEGIN
  INSERT INTO change_epochs (table_name, epoch) VALUES ('annotations', 1)
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
CREATE TRIGGER lineage_graph_meta_epoch_ad AFTER DELETE ON lineage_graph_meta BEGIN
  INSERT INTO change_epochs (table_name, epoch) VALUES ('lineage_graph_meta', 1)
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
CREATE TRIGGER lineage_nodes_epoch_ad AFTER DELETE ON lineage_nodes BEGIN
  INSERT INTO change_epochs (table_name, epoch) VALUES ('lineage_nodes', 1)
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
CREATE TRIGGER lineage_edges_epoch_ad AFTER DELETE ON lineage_edges BEGIN
  INSERT INTO change_epochs (table_name, epoch) VALUES ('lineage_edges', 1)
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
CREATE TRIGGER ai_memory_epoch_ad AFTER DELETE ON ai_memory BEGIN
  INSERT INTO change_epochs (table_name, epoch) VALUES ('ai_memory', 1)
  ON CONFLICT(table_name) DO UPDATE SET epoch = epoch + 1;
END;
