-- 016_papers_folder_not_null.sql（执行器 db.transaction 已包事务——本件禁自带 BEGIN/COMMIT[终裁 B4]）
-- [F-DBCAMP-01 DB-1 U1] papers.folder_id NOT NULL 收紧（v122 裁决②「未归档域取消
--   ——所有文献必须在文件夹里」的 DDL 终态；2026-10-08 用户裁决 A6：存量均测试
--   数据可清理——NULL 行 DELETE 内置=防断电保险丝，修复 CLI 取消；实测存量 0 行）。
-- 机制=真 CREATE TABLE 级重建（官方 12 步规程变体）。探针结论（仓外
--   20261008-dbcamp-db1/u1-probe-*.raw.txt）：
--   ① 候选 A（legacy_alter_table 换名舞步）不可行——SQLite 3.53.4 子表 FK 子句
--      改写 ⟺ FK ON 或 legacy OFF（2×2 真值表在档），旧表 RENAME 恒踩改写→
--      本件走官方序：旧表只 DROP 不 RENAME；FK OFF 由执行器 FK-OFF 迁移模式
--      （Migration.fkOff——事务外围 foreign_keys=OFF+事务内 foreign_key_check
--      断言+finally 复位，见 migrate.ts）承担，因事务内该 pragma 无操作
--      （012 头注 F1 在档）。
--   ② FTS rebuild 命令结构性不可用（content 表列名直映射：FTS 列 authors≠
--      papers.authors_json）→ external-content 双扫（delete 旧条目+insert 新
--      条目）等价全量重映射（rowid 键随新表重排）。
-- (1) NULL 清理（A6 零行保险丝；FK OFF 下 DDL 级联失效=手工级联覆盖全部指向
--     被删行的 FK——实测 11 对清单中涉 papers 删除链的 7 处：papers 直系 5 张
--     （annotations/notes/paper_tags/ai_notes/lineage_nodes 全 CASCADE）+
--     二级 2 处（lineage_edges→lineage_nodes 双端 CASCADE：孤儿文献节点的
--     连线随灭；ai_notes.annotation_id→annotations SET NULL：幸存语料挂被删
--     标注的降级=手工置 NULL 复刻 DDL 动作）；papers_fts 随行删除由触发器
--     自动维持一致性（触发器活性与 FK 无关））
UPDATE ai_notes SET annotation_id=NULL
 WHERE annotation_id IN (SELECT id FROM annotations WHERE paper_id IN (SELECT id FROM papers WHERE folder_id IS NULL));
DELETE FROM lineage_edges
 WHERE from_node IN (SELECT id FROM lineage_nodes WHERE paper_id IN (SELECT id FROM papers WHERE folder_id IS NULL))
    OR to_node IN (SELECT id FROM lineage_nodes WHERE paper_id IN (SELECT id FROM papers WHERE folder_id IS NULL));
DELETE FROM annotations WHERE paper_id IN (SELECT id FROM papers WHERE folder_id IS NULL);
DELETE FROM notes WHERE paper_id IN (SELECT id FROM papers WHERE folder_id IS NULL);
DELETE FROM paper_tags WHERE paper_id IN (SELECT id FROM papers WHERE folder_id IS NULL);
DELETE FROM ai_notes WHERE paper_id IN (SELECT id FROM papers WHERE folder_id IS NULL);
DELETE FROM lineage_nodes WHERE paper_id IN (SELECT id FROM papers WHERE folder_id IS NULL);
DELETE FROM papers WHERE folder_id IS NULL;
-- (2) folder↔graph 投影再对齐保险丝（2026-10-08 裁决①一一对应——图≡
--     lineage_nodes.folder_id 投影；置于 NULL 清理后=子查询恒非 NULL；条件含
--     IS NULL OR 分支=主控预裁 SQL 的 NULL 逃逸洞修补[自裁申报]；主题节点
--     paper_id NULL 不在投影域不碰）
UPDATE lineage_nodes SET folder_id=(SELECT folder_id FROM papers WHERE papers.id=lineage_nodes.paper_id)
 WHERE paper_id IS NOT NULL
   AND (folder_id IS NULL OR folder_id<>(SELECT folder_id FROM papers WHERE papers.id=lineage_nodes.paper_id));
-- (3) FTS 全量清旧（external-content delete 扫——旧表在场以旧行自证内容；
--     rowid 键=旧表 rowid）
INSERT INTO papers_fts(papers_fts, rowid, title, abstract, authors)
  SELECT 'delete', rowid, title, abstract, authors_json FROM papers;
-- (4) 三 FTS 触发器先行拆除（官方 12 步序的显式拆装步：触发器属表、随表
--     灭——DROP TABLE 本会连带删之；显式先行=重建意图明确、FTS 维护语义
--     不跨重建混用。勘正注：DROP TABLE 不触发表上 DML 触发器、FK OFF 下
--     亦无隐式 DELETE 强制——「防隐式 DELETE 灌 FTS」非本步动机
--     〔k1-N1 回炉轮1；d1-新N3 不可达分句删除〕）
DROP TRIGGER papers_fts_ai;
DROP TRIGGER papers_fts_ad;
DROP TRIGGER papers_fts_au;
-- (5) 重建（完整新 DDL 显式全列 20 列=N1 防列漂移：001 十五列+005 三列+012
--     两列，列序沿链尾现状；folder_id NOT NULL DEFAULT '__main__'——缺列插入
--     归主图=应用写路（repo.insert 列单不含 folder_id，import 落夹随后覆写）
--     与既有夹具兼容面〔自裁申报已追认：门一双席复算认可+主控终裁
--     2026-10-08〕；ON DELETE SET NULL 维持 012
--     原句零语义变——非空化后删除非空夹时 SET NULL 撞 NOT NULL=迁移后天然
--     fail-closed，folder 删除路径的 DDL 定夺归 DB-4（N8：app 级拒删非空+FK
--     动作清单实测后定 DDL））
CREATE TABLE papers_new (
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
);
INSERT INTO papers_new (id, file_ref, sha256, title, authors_json, year, venue, doi, arxiv_id,
                        abstract, source, enrich_status, added_at, updated_at, last_read_page,
                        cited_by_count, cited_by_fetched_at, cited_by_count_source, folder_id, impact_factor)
  SELECT id, file_ref, sha256, title, authors_json, year, venue, doi, arxiv_id,
         abstract, source, enrich_status, added_at, updated_at, last_read_page,
         cited_by_count, cited_by_fetched_at, cited_by_count_source, folder_id, impact_factor
    FROM papers;
-- (6) 官方序换表：旧表只 DROP（FK OFF=零级联+子表 FK 子句零改写）；新表
--     RENAME 到位（无子表引用 papers_new=零改写；children 全程文本不动=
--     REFERENCES papers(id) 原句指向新表）
DROP TABLE papers;
ALTER TABLE papers_new RENAME TO papers;
-- (7) 三索引+三 FTS 触发器重建（001 原文逐字）
CREATE INDEX idx_papers_year ON papers(year);
CREATE INDEX idx_papers_doi  ON papers(doi);
CREATE INDEX idx_papers_added_at ON papers(added_at);
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
-- (8) FTS 全量灌新（新表 rowid 重映射——rebuild 命令的 authors_json 映射版）
INSERT INTO papers_fts(rowid, title, abstract, authors)
  SELECT rowid, title, abstract, authors_json FROM papers;
