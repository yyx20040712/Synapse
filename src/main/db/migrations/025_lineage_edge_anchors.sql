-- 025_lineage_edge_anchors：脉络边端点钉定锚列（F-VISFB-66 画线交互重构，
-- 设计书 v1.2 §D.3——裁定 ① 锚点钉定）
-- 设计口径：
-- - from_anchor/to_anchor=AnchorRef {side,slot} JSON TEXT（与 013 via JSON
--   先例同构；运行时锚 id 命名解耦——anchorIdOf/parseAnchorId 映射）
-- - NULL=未钉定=路由派生（66 前行为沿承——E2 运行时回落，无 UPDATE 回填：
--   selectAnchor 自动分支 slot 逻辑未载明，固化可派生值=反规范化+存量边
--   行为改变，回填错=永久错数据）；非 NULL=用户钉定=AnchorUse 禁动端
-- - 翻案注记：013 头注「锚点=运行时 12 锚派生」句自本迁移起作废——锚位
--   成为端点身份一等成分（持久化钉定；换端清 via 重算时随载荷重钉）
ALTER TABLE lineage_edges ADD COLUMN from_anchor TEXT;
ALTER TABLE lineage_edges ADD COLUMN to_anchor TEXT;
