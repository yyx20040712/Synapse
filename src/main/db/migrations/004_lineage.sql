-- 004_lineage：发展脉络图两表（LG-01，P7-H/ADR-0014 §数据模型 DDL 字面）
-- 设计裁决（ADR-0014）：
-- - 存储=图 schema（v2 DAG 升级免迁移）；v1 行为=树（单父+无环）——
--   树约束是 service 层不变量非 DDL 约束（INV-27：守卫宿主=service 写面）
-- - lineage_nodes.paper_id 可空=纯主题节点（阶段分组）；v1 draft 协议仅文献节点
--   （纯主题节点=应用内手工创建，LG-03）
-- - x/y 手工位置覆盖（JSON Canvas 模式，obsidian 先例）；NULL=自动布局（LG-02）
-- - 级联：paper 删→节点 CASCADE→边随节点级联（DDL 链承担）；节点删→边 CASCADE
-- - UNIQUE(from_node,to_node)：重复边 DDL 收口（应用层前置守卫中文 reason）
-- - v1 生产者=草稿导入器（service importDraft 替换式重灌）；消费者=listGraph
--   （LG-02 布局+LG-03 编辑）
CREATE TABLE lineage_nodes (
  id         TEXT PRIMARY KEY,            -- uuid
  paper_id   TEXT REFERENCES papers(id) ON DELETE CASCADE,  -- 可空=纯主题节点（阶段分组）
  title      TEXT NOT NULL,
  core_idea  TEXT NOT NULL DEFAULT '',    -- 核心 idea（AI 草稿可填，人工可改）
  year       INTEGER,
  x          REAL,                        -- 手工位置覆盖；NULL=自动布局
  y          REAL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE lineage_edges (
  id         TEXT PRIMARY KEY,
  from_node  TEXT NOT NULL REFERENCES lineage_nodes(id) ON DELETE CASCADE,
  to_node    TEXT NOT NULL REFERENCES lineage_nodes(id) ON DELETE CASCADE,
  label      TEXT NOT NULL DEFAULT '',    -- 逻辑线说明
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(from_node, to_node)
);
