-- 015_lineage_edge_blue_recolor：存量边旧蓝换深蓝（F-UIRES-03 C1，
-- docs/design/2026-10-05_f-uires03-design.md §2 C1+§3——呈裁① #1e3a8a 用户亲裁）
-- 设计口径：
-- - LINE_TYPE_COLORS[0] '#3a5bd9'→'#1e3a8a'（shared/models/lineage 单源换值
--   ——区分选中卡边框蓝）；存量边 color 旧蓝单值 UPDATE 换新
-- - WHERE LOWER(color)=LOWER('#3a5bd9')：大小写变体全命中（F5 核正：default
--   库存量全规范形直接命中；ws-* 测试课题旧 schema 无 color 列不受影响）
-- - 014 列 DEFAULT '#3a5bd9' 不动（SQLite 改默认需重建表 disproportionate；
--   repo 写面恒显式色=默认死路径——N 级备案）；新库 user_version 终值 15
UPDATE lineage_edges SET color='#1e3a8a' WHERE LOWER(color)=LOWER('#3a5bd9');
