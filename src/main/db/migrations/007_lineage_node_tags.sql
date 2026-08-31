-- 007_lineage_node_tags：脉络节点标签列（F-LG14，用户图6/图7 期望卡底行标签组）
-- 设计裁决（f-lg14-ticket §1/§4）：
-- - tags=JSON 数组 TEXT（字符串数组 JSON.stringify 落库；应用面 string[]|null）
-- - 缺省 NULL=无标签（存量库零迁移兼容——NULL 不渲染标签组，无数据搬迁）
-- - 同节点同名标签去重=写边界单源 dedupeLineageTags（shared/models/lineage.ts；
--   repo upsertNode 单点收口），DDL 不承担行为约束（INV-27「树约束在 service
--   不在 DDL」同精神——纯数据面列）
-- - 主题节点（paper_id null）与文献节点同列共用（标签面不区分绑定态——票面
--   §1 主题节点底行=年份+标签，含金量段才区分）
ALTER TABLE lineage_nodes ADD COLUMN tags TEXT;
