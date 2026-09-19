-- 009_reading_time_drop：[F-TIME-02] 阅读时长列移除（用户裁决 2026-09-19
-- 第六档：查证 Zotero/Mendeley/EndNote/ReadCube 均无内置时长统计，条件成立
-- 裁决生效——docs/handoff/relay.md batch 26 增补二）。
-- 沿革：008_reading_time（P7E-05）加列→本迁移删列（已合入迁移不可修改=CI 锁
-- 硬规则，只能新增）；008 保持原样不动，新库走 008 加列→009 删列双跳。
-- SQLite DROP COLUMN 需 3.35+（better-sqlite3 v12/v13 内置版本足够）。
ALTER TABLE papers DROP COLUMN reading_seconds;
