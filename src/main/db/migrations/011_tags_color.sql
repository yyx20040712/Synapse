-- 011_tags_color：tags 表加 color 列（F-TAGS-01 标签颜色可调节——zotero 式；
-- 用户诉求 2026-09-30，票=tickets/registry.ts F-TAGS-01）
-- 设计要点（主控裁决 R1/R2）：
-- - TEXT 可空无默认——NULL=存量默认（accent 主题色，三面渲染单源 INV-86），
--   不回填哨兵值：默认态是"无颜色身份"而非某具体色
-- - 契约=#rrggbb 六位小写 hex（shared tagColorSchema 单源校验+service 正规
--   化小写），DDL 不加 CHECK（校验面归 zod/service——预编译语句层无正则）
-- - 独立 011 号（F-FOLDER-01 未启动不占号——主控裁决 R1）
ALTER TABLE tags ADD COLUMN color TEXT;
