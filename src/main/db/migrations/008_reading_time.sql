-- 008_reading_time：P7E-05 阅读时长列（reader.service.ts 生命周期层预留兑现）
-- 设计裁决（p7e-05-brief §1 主控 Design）：
-- - reading_seconds=累计阅读秒数；唯一写点=papers.repo updateReadPage 第三参
--   （原子累加 reading_seconds=reading_seconds+?，禁 read-modify-write 两步）
-- - INTEGER NOT NULL DEFAULT 0（001:25 last_read_page 同型；存量行自动补 0=
--   升级路径天然幂等——R9）
-- - 预留注记勘误：reader.service.ts 原写「002 迁移加列」时 002 已被 indexes
--   占用，实际落位=008（已合入迁移不可修改=CI 锁硬规则，只能新增）
ALTER TABLE papers ADD COLUMN reading_seconds INTEGER NOT NULL DEFAULT 0;
