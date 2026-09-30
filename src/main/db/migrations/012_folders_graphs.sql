-- 012_folders_graphs.sql（执行器 db.transaction 已包事务——本件禁自带 BEGIN/COMMIT[终裁 B4]）
-- [F-FOLDER-01] 文件夹×脉络图绑定（design-final §1 修正稿逐字基准——
-- docs/design/2026-09-30_ffolder01-design-final.md）
-- (1) 主图文件夹：先退让同名，再插入（id 锚 '__main__'——终裁 B2）
--     [F-MIGR-01] P1-1 修复（用户 2026-09-30 裁决案 a——v87 §3，单用户未分发
--     论证下改 012 本体）：原直拼退让 `name || ' (主图)'` 在存量库同时存在
--     「主图」与「主图 (主图)」两行时产出第二个「主图 (主图)」撞
--     collections.name UNIQUE（001_init.sql）→012 事务回滚→库永远无法升级。
--     修法=冲突探测式唯一名：首选「主图 (主图)」，被占则依次「主图 (主图) 2」
--     「主图 (主图) 3」…直至不撞（递归 CTE 探测，序号上界 999 防极端构造；
--     999 全被占时 pick 空→SET NULL→NOT NULL 违例炸迁移=fail-closed 兜底）。
--     占用探测覆盖全部在场行（含 id='__main__' 异常残留行）；name UNIQUE 保证
--     被退让行至多一行（其原名'主图'不在候选域，无自占问题）。
WITH RECURSIVE
seq(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM seq WHERE n < 999),
cand(idx, label) AS (
  SELECT n, CASE WHEN n = 1 THEN '主图 (主图)' ELSE '主图 (主图) ' || n END FROM seq
),
pick(label) AS (
  SELECT label FROM cand
  WHERE NOT EXISTS (SELECT 1 FROM collections c WHERE c.name = cand.label)
  ORDER BY idx LIMIT 1
)
UPDATE collections SET name = (SELECT label FROM pick)
WHERE name = '主图' AND id <> '__main__';
INSERT INTO collections(id, name, position)
  SELECT '__main__', '主图', COALESCE(MAX(position), -1) + 1 FROM collections WHERE true
  ON CONFLICT(id) DO NOTHING;
  -- ↑ WHERE true=SQLite 文档级消歧要件（INSERT..SELECT..ON CONFLICT 解析歧义——
  -- 探针 probe-upsert-where.cjs 实证；design-final §1 原稿无此子句会 near "DO"
  -- 语法红，语义零变=空表谓词）
-- (2) papers 双列：folder 归属（单归属）+D1 impact_factor
ALTER TABLE papers ADD COLUMN folder_id TEXT REFERENCES collections(id) ON DELETE SET NULL;
ALTER TABLE papers ADD COLUMN impact_factor REAL;
-- (3a) [回炉 R1·d1-W5/k1-W8] 存量同 paper_id 重复节点去重（坑 a 存量形态——
--      012 前 paper_id 无唯一约束）：保最新一行（rowid 最大=插入序最新），余删；
--      部分唯一索引创建的前置条件（不去重则存量脏数据炸迁移）。
--      [R2 注·d1'-W3/k1'-N4] 被删旧行挂有的边随 FK CASCADE 同删（旧节点独有
--      连线不迁移至保留行——去重固有权衡，迁移用例「重复节点挂边」锚定）
DELETE FROM lineage_nodes WHERE paper_id IS NOT NULL AND rowid NOT IN (
  SELECT MAX(rowid) FROM lineage_nodes WHERE paper_id IS NOT NULL GROUP BY paper_id
);
-- (3) 坑 a 根治：部分唯一索引（NULL 主题节点不占唯一域——SQLite 3.8+，本仓 3.53.4）
CREATE UNIQUE INDEX idx_lineage_paper ON lineage_nodes(paper_id) WHERE paper_id IS NOT NULL;
-- (4) 节点图归属（B1/Q2 终裁语义=存量行全部归主图 '__main__'）。
--     [R1 偏离申报]design-final §1 原稿「NOT NULL DEFAULT '__main__' REFERENCES …」
--     在 SQLite 有行表上不可执行（ADD COLUMN 静态限制：REFERENCES 列禁非空
--     DEFAULT——探针 probe-addcol-fk-default.cjs：空表过/有行必红，与参照行
--     在场无关）；重建法（12 步）在执行器逐迁移事务内不可行（事务内
--     PRAGMA foreign_keys 无操作+FK ON 下 DROP 父表级联灭 edges——探针
--     probe-rebuild-facts.cjs F1/F3）。主控申报在档，处置=可空列+显式回填，
--     FK CASCADE（DOMAIN_PINS「folder 删除=节点 CASCADE DDL 保证」）保留；
--     NOT NULL DEFAULT 安全网移 repo 写边界（folderId ?? '__main__'）。
ALTER TABLE lineage_nodes ADD COLUMN folder_id TEXT REFERENCES collections(id) ON DELETE CASCADE;
UPDATE lineage_nodes SET folder_id='__main__';
-- (5) 文献回填（序敏感）：
--   ① 有脉络节点的文献归主图
UPDATE papers SET folder_id='__main__'
  WHERE id IN (SELECT paper_id FROM lineage_nodes WHERE paper_id IS NOT NULL);
--   ② 其余有 paper_collections 挂接的文献→position 最小（tie-break id——W1；启发式明示[Q3 终裁]）
UPDATE papers SET folder_id=(
    SELECT c.id FROM paper_collections pc JOIN collections c ON c.id=pc.collection_id
    WHERE pc.paper_id=papers.id ORDER BY c.position ASC, c.id ASC LIMIT 1)
  WHERE folder_id IS NULL
    AND EXISTS (SELECT 1 FROM paper_collections pc WHERE pc.paper_id=papers.id);
--   ③ 裸文献（无节点无挂接）保持 NULL=「未归档」（与「未加入脉络」正交）
-- (6) M2M 退役（回填后；单归属化——paper_collections 无被引用外键，视图/触发器残留实现批核[N3]）
DROP TABLE paper_collections;
