-- 014_lineage_edge_visual：脉络边视觉线型内联列（F-LGRAPH-01②U8，
-- docs/design/2026-10-01_f-lgraph01-editor-design-final.md §1+A3 仲裁）
-- 设计口径：
-- - kind 四值体系退役→manual 单基型+边内联视觉字段（dashed: bool+color: hex）
-- - dashed=INTEGER（0/1）NOT NULL DEFAULT 0；color=TEXT NOT NULL DEFAULT 色板
--   首色蓝（LINE_TYPE_COLORS[0]='#3a5bd9'——shared/models/lineage 单源值）
-- - 存量行零迁移归一（用户授权测试数据可清——免数据搬迁：旧行读面=
--   实线+蓝，旧 kind 值/ref 边语义随体系退役由读面丢弃不映射）
-- - DB kind 列保留恒 'manual'（A3 DDL 最小化——应用层收敛，不动旧列）；
--   sub 列死置（读面不映射、写面不写）
-- - 色行名配置=图级 KV 新键 'lineTypeNames'（恰 6 行——与旧 'lineTypes'
--   四组键分离，旧键残留=死数据不读）
ALTER TABLE lineage_edges ADD COLUMN dashed INTEGER NOT NULL DEFAULT 0;
ALTER TABLE lineage_edges ADD COLUMN color TEXT NOT NULL DEFAULT '#3a5bd9';
