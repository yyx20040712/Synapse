-- 019_tags_folder_domain.sql（执行器 db.transaction 已包事务——本件禁自带 BEGIN/COMMIT[终裁 B4]）
-- [F-DBCAMP-01 DB-1 U4 / F-TAGS-02] tags 多域化：folder_id 域列+UNIQUE(folder_id,name)
--   +存量归主图+挂接域一致性触发器（2026-10-08 晨用户裁决「完全隔离终确认」+
--   票面 [甲][乙][丙] 三裁决——[甲] 存量归主图/非主图挂接摘除各夹白手起家；
--   [乙] 表级挂接域一致 ∀行 tags.folder_id=papers.folder_id；[丙] 筛选上限
--   本批不动）。papers.folder_id 016 起列级 NOT NULL（INV-122）——d1-W4 三连
--   逃逸面（迁移清理 NULL 漏删/触发器 NULL 比较逃逸/renderer null 域）结构性闭合。
--   fkOff=true（同 016）：tags 是父表（paper_tags.tag_id 外键指它），
--   FK ON 下 DROP tags 隐式级联灭挂接——FK OFF 由执行器模式承担关断，事务内
--   foreign_key_check 断言兜底（migrate.ts INV-123 机制）。
--   重建序独立于 016：无 FTS 面（tags 不在 FTS）/表上无既有触发器/唯一子表=
--   paper_tags（REFERENCES tags 原句文本不动=指向重建后的新表——012 族官方序）。
-- (1) 存量挂接域清理（[甲]：非主图文献挂接摘除——置于重建前，旧表形态下执行；
--     FK OFF 下无级联顾虑，纯 DELETE；主图挂接全保留）
DELETE FROM paper_tags WHERE paper_id IN (SELECT id FROM papers WHERE folder_id <> '__main__');
-- (2) 重建（官方序：旧表只 DROP 不 RENAME，新表 RENAME 到位——016 同款；显式全列
--     4 列=001 两列+011 color+本件 folder_id；folder_id NOT NULL DEFAULT '__main__'
--     REFERENCES collections(id) ON DELETE CASCADE——CASCADE=012 族域资产先例
--     （lineage_nodes.folder_id 同款）：夹删则域资产随灭；非 papers 的 SET NULL
--     （papers 是被组织对象，tags/nodes 是域资产——语义不同列）；存量行全落
--     '__main__'（[甲] 归主图；全局 UNIQUE(name) 保证存量名互异=同域零撞名））
CREATE TABLE tags_new (
  id        TEXT PRIMARY KEY,
  name      TEXT NOT NULL,
  color     TEXT,
  folder_id TEXT NOT NULL DEFAULT '__main__' REFERENCES collections(id) ON DELETE CASCADE,
  UNIQUE (folder_id, name)
);
INSERT INTO tags_new (id, name, color, folder_id) SELECT id, name, color, '__main__' FROM tags;
DROP TABLE tags;
ALTER TABLE tags_new RENAME TO tags;
-- (3) 挂接域一致性触发器（INV-126 机制面①：INSERT 面守卫——双方在场而域不一致
--     即 ABORT；缺席父行由 FK 自然抛（NULL<>x 三值逻辑不触发 RAISE——FK 兜底），
--     域不一致 FK 管不到故触发器补位；UPDATE 面不存在（paper_tags 无 UPDATE 写路
--     ——复合主键两列，本仓只 INSERT/DELETE）；papers.folder_id 变更面由 moveFolder
--     摘挂接步守卫〔library.service INV-126 机制面②〕。autoindex 两枚（id PK+
--     UNIQUE 二列）重建前后同名同数=sqlite_master 净零，对象多重集增量=恰本触发器）
CREATE TRIGGER paper_tags_domain_guard BEFORE INSERT ON paper_tags
BEGIN
  SELECT RAISE(ABORT, 'paper_tags 挂接域违约：paper 与 tag 的 folder 不一致')
  WHERE (SELECT folder_id FROM papers WHERE id = NEW.paper_id)
     <> (SELECT folder_id FROM tags WHERE id = NEW.tag_id);
END;
