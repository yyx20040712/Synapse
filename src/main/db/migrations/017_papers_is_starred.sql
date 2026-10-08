-- 017_papers_is_starred.sql（执行器 db.transaction 已包事务——本件禁自带 BEGIN/COMMIT[终裁 B4]）
-- [F-DBCAMP-01 DB-1 U2 / F-STAR-01] papers.is_starred 星标列+partial index
--   （2026-10-08 U2 简报主控裁决③——列名单源=设计书 §5.c is_starred，票面
--   「starred」为 loose 表述）。与 016 重建本质不同：ADD COLUMN 静态 DEFAULT
--   合法（001/010 先例：带 CHECK 合法）、FK 面零牵动——无 fkOff 标志。
-- (1) 加列：INTEGER NOT NULL DEFAULT 0 + CHECK 收紧值域（0/1 布尔语义——
--     DB 层存数值，toSummary 映射 0/1→false/true；静态 DEFAULT 对存量行
--     生效=零回填〔SQLite ADD COLUMN 语义：既有行取默认值〕）
ALTER TABLE papers ADD COLUMN is_starred INTEGER NOT NULL DEFAULT 0 CHECK (is_starred IN (0,1));
-- (2) partial index：is_starred 单列 WHERE is_starred=1（主控裁决③.2 已决
--     ——星标无筛选面：F-UIRES-01 批 A P-9/P-10 星标=静态占位列无筛选交互；
--     星标集小、部分索引省空面，只服务 WHERE is_starred=1 查询面；无 folder 维度）
CREATE INDEX idx_papers_starred ON papers(is_starred) WHERE is_starred = 1;
