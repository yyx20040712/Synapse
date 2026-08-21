-- 002_indexes.sql —— 查询模式索引补齐（追加式迁移；001 已冻结）
-- * paper_collections 缺 collection_id 索引：PK 是 (paper_id, collection_id)，
--   对 collection_id 过滤无法走 PK 前缀，「按集合列文献」全表扫
-- * papers.added_at 无索引：列表默认排序（added_at DESC）每次全表倒序扫

CREATE INDEX idx_paper_collections_collection ON paper_collections(collection_id);
CREATE INDEX idx_papers_added_at ON papers(added_at);
