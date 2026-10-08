-- 018_app_meta.sql（执行器 db.transaction 已包事务——本件禁自带 BEGIN/COMMIT[终裁 B4]）
-- [F-DBCAMP-01 DB-1 U3] app_meta 键值表：owner uuid+设备 token 本地侧载体
--   （设计书 §5.c 018 行+§12 契约增量+A2 答复口径——2026-10-08 U3 简报主控裁决③）。
--   DDL 形态单源=010 lineage_graph_meta（三列 KV：key TEXT PRIMARY KEY/
--   value TEXT NOT NULL/updated_at TEXT NOT NULL——**key 补显式 NOT NULL=门一
--   k1-W1 处置 2026-10-08**：TEXT PK 在 SQLite 不隐含 NOT NULL〔NULL 键可插
--   且 UNIQUE 互不冲突=010 沿链怪癖〕，018 未发布零成本收紧，键域恒常量
--   注入仍加 DDL 兜底——相对 010 形态唯一刻意偏离，方向=收紧）。无 seed：owner_id/
--   device_token=运行期生成值非静态默认（repo ensureIdentity 缺席才生成）；
--   snapshot_seq=DB-3 envelope 面（本批只登记键名不初始化不消费）。
--   纯新增表零 FK 面——无 fkOff 标志（与 016 重建型相对）。
-- updated_at=应用层写 ISO 值（datetime('now')=UTC 实测故弃 DDL DEFAULT——010 注记）
CREATE TABLE IF NOT EXISTS app_meta (
  key        TEXT NOT NULL PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL            -- 应用层写 ISO 值（弃 DDL DEFAULT——UTC 实测，010 先例）
);
