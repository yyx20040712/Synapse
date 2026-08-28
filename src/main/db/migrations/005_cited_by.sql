-- 005_cited_by:含金量抓取缓存三列(ENR-01,P7-G/ADR-0011 含金量指标元信息)
-- - 三列全可空:NULL=从未抓到被引数(与 0=已抓到且为 0 语义不同,判别 === null)
-- - cited_by_count_source=命中瀑布源('crossref'/'openalex';arxiv 响应无被引数,
--   命中也不写缓存)
-- - 写入面=applyEnrichment 独立 citedBy 参数(三列独立 SET 子句);读取面=
--   detailById 配对透出;装配消费=ENR-02(manifest/front-matter)
ALTER TABLE papers ADD COLUMN cited_by_count INTEGER;
ALTER TABLE papers ADD COLUMN cited_by_fetched_at TEXT;
ALTER TABLE papers ADD COLUMN cited_by_count_source TEXT;
