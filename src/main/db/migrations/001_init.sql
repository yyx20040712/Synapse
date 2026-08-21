-- 001_init.sql —— 初始 schema（已冻结：此文件受锁保护，修改即 CI 红；演进只能新增 002_*.sql）
-- 说明：
-- * 主键一律 TEXT uuid（crypto.randomUUID 生成）
-- * 时间戳一律 ISO 8601 字符串（UTC）
-- * FTS5 采用 external content + 触发器同步：仓储层无需手动维护索引（防弱模型漏同步）
-- * authors_json 存 string[]（JSON 序列化）

CREATE TABLE papers (
  id             TEXT PRIMARY KEY,
  file_ref       TEXT NOT NULL,                    -- 受管存储内相对路径（正斜杠）
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
  last_read_page INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_papers_year ON papers(year);
CREATE INDEX idx_papers_doi  ON papers(doi);

CREATE TABLE collections (
  id       TEXT PRIMARY KEY,
  name     TEXT NOT NULL UNIQUE,
  position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE paper_collections (
  paper_id      TEXT NOT NULL REFERENCES papers(id)      ON DELETE CASCADE,
  collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  PRIMARY KEY (paper_id, collection_id)
);

CREATE TABLE tags (
  id   TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE paper_tags (
  paper_id TEXT NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
  tag_id   TEXT NOT NULL REFERENCES tags(id)   ON DELETE CASCADE,
  PRIMARY KEY (paper_id, tag_id)
);
CREATE INDEX idx_paper_tags_tag ON paper_tags(tag_id);

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
CREATE INDEX idx_annotations_paper ON annotations(paper_id, page, sort_key);

CREATE TABLE notes (
  id         TEXT PRIMARY KEY,
  paper_id   TEXT NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
  title      TEXT NOT NULL DEFAULT '',
  content_md TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_notes_paper ON notes(paper_id);

-- ── FTS5（external content：源表为准，触发器自动同步）────────────────────
CREATE VIRTUAL TABLE papers_fts USING fts5(
  title, abstract, authors,
  content='papers', content_rowid='rowid',
  tokenize='trigram'
);
CREATE TRIGGER papers_fts_ai AFTER INSERT ON papers BEGIN
  INSERT INTO papers_fts(rowid, title, abstract, authors)
  VALUES (new.rowid, new.title, new.abstract, new.authors_json);
END;
CREATE TRIGGER papers_fts_ad AFTER DELETE ON papers BEGIN
  INSERT INTO papers_fts(papers_fts, rowid, title, abstract, authors)
  VALUES ('delete', old.rowid, old.title, old.abstract, old.authors_json);
END;
CREATE TRIGGER papers_fts_au AFTER UPDATE OF title, abstract, authors_json ON papers BEGIN
  INSERT INTO papers_fts(papers_fts, rowid, title, abstract, authors)
  VALUES ('delete', old.rowid, old.title, old.abstract, old.authors_json);
  INSERT INTO papers_fts(rowid, title, abstract, authors)
  VALUES (new.rowid, new.title, new.abstract, new.authors_json);
END;

CREATE VIRTUAL TABLE notes_fts USING fts5(
  title, content,
  content='notes', content_rowid='rowid',
  tokenize='trigram'
);
CREATE TRIGGER notes_fts_ai AFTER INSERT ON notes BEGIN
  INSERT INTO notes_fts(rowid, title, content) VALUES (new.rowid, new.title, new.content_md);
END;
CREATE TRIGGER notes_fts_ad AFTER DELETE ON notes BEGIN
  INSERT INTO notes_fts(notes_fts, rowid, title, content)
  VALUES ('delete', old.rowid, old.title, old.content_md);
END;
CREATE TRIGGER notes_fts_au AFTER UPDATE OF title, content_md ON notes BEGIN
  INSERT INTO notes_fts(notes_fts, rowid, title, content)
  VALUES ('delete', old.rowid, old.title, old.content_md);
  INSERT INTO notes_fts(rowid, title, content) VALUES (new.rowid, new.title, new.content_md);
END;

CREATE VIRTUAL TABLE annotations_fts USING fts5(
  quote, comment,
  content='annotations', content_rowid='rowid',
  tokenize='trigram'
);
CREATE TRIGGER annotations_fts_ai AFTER INSERT ON annotations BEGIN
  INSERT INTO annotations_fts(rowid, quote, comment)
  VALUES (new.rowid, new.quote_text, new.comment);
END;
CREATE TRIGGER annotations_fts_ad AFTER DELETE ON annotations BEGIN
  INSERT INTO annotations_fts(annotations_fts, rowid, quote, comment)
  VALUES ('delete', old.rowid, old.quote_text, old.comment);
END;
CREATE TRIGGER annotations_fts_au AFTER UPDATE OF quote_text, comment ON annotations BEGIN
  INSERT INTO annotations_fts(annotations_fts, rowid, quote, comment)
  VALUES ('delete', old.rowid, old.quote_text, old.comment);
  INSERT INTO annotations_fts(rowid, quote, comment)
  VALUES (new.rowid, new.quote_text, new.comment);
END;
