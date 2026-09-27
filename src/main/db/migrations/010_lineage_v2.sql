-- 010_lineage_v2：脉络数据层 v2（T3-P5，design-final §2——月份框/月内序/子线型）
-- 设计裁决（docs/design/2026-09-27_t3p5-lineage-data-layer-design-final.md）：
-- - month INTEGER NULL+inline CHECK（1..12；null=未定月框）——ADD COLUMN 带
--   CHECK 合法且对全部后续写生效（含存量行 UPDATE 越界拒——探针双证档=仓外
--   p5-design/sqlite-probe.mjs），仅迁移时点不回溯校验（存量 NULL 本合法）
-- - slot INTEGER NULL=月内序承载（D-P5-10：实现层列无用户序号语义；存量行
--   窗口函数回填 ROW_NUMBER PARTITION BY year,month ORDER BY created_at,id
--   ——SQLite 3.53 实测支持；NULL/空组=v1 语义不回填任何默认月值）
-- - lineage_edges.sub TEXT NULL=子线型 id（样式层；引用完整性守卫=service
--   写面 upsertEdge/upsertLineTypes，DDL 不承担）
-- - lineage_graph_meta KV 表（图级配置——lineTypes 线型组 JSON 串承载；
--   updated_at=应用层写 ISO 值，datetime('now')=UTC 实测故弃 DDL DEFAULT）
-- - seed 'lineTypes'='[]'=恒四组空配置（读面按 base 枚举序补齐空组）
ALTER TABLE lineage_nodes ADD COLUMN month INTEGER NULL CHECK (month IS NULL OR month BETWEEN 1 AND 12);
ALTER TABLE lineage_nodes ADD COLUMN slot INTEGER NULL;
ALTER TABLE lineage_edges ADD COLUMN sub TEXT NULL;
CREATE TABLE IF NOT EXISTS lineage_graph_meta (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL            -- 应用层写 ISO 值（弃 DDL DEFAULT——UTC 实测）
);
-- seed 'lineTypes'='[]'（恒四组空配置）。偏离 design §2 字面申报：原稿 INSERT
-- 仅列 (key,value)——updated_at NOT NULL 无默认 ⇒ OR IGNORE 静默吞 NOT NULL
-- 违例=seed 永不落库；补 epoch 哨兵值使 seed 事实上在场（首次 setLineTypes
-- 随写刷新为真实 ISO；弃 DDL DEFAULT 口径不变）
INSERT OR IGNORE INTO lineage_graph_meta (key, value, updated_at) VALUES ('lineTypes', '[]', '1970-01-01T00:00:00.000Z');
-- 存量行回填 slot（窗口函数：同 (year,month) 组内 created_at,id 序 1..k）
UPDATE lineage_nodes SET slot = (
  SELECT rn FROM (SELECT id, ROW_NUMBER() OVER (
    PARTITION BY year, month ORDER BY created_at, id) AS rn FROM lineage_nodes) r
  WHERE r.id = lineage_nodes.id);
