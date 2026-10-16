-- 023_paper_figures.sql（执行器 db.transaction 已包事务——本件禁自带 BEGIN/COMMIT[终裁 B4]；禁 IF NOT EXISTS）
-- [F-VISFB-42] 派生图表资产合同（票面 42 号行；提取管线蓝本=00B 接手单
--   20261016-visfbb0/02）：figure_jobs 状态表+paper_figures 资产表。
-- 设计要点（终裁 B3 落法）：
--   papers 零新列（派生面独立承载——迁移对导出主表面零扰动）。
--   派生不入快照：两表均不进 snapshot.repo TABLE_SPECS（快照恢复后重提取
--   ——jobs 重置 pending 挂点=import-snapshot.service；恢复零资产≠jobs 空
--   〔failed≠empty：status 三态+failed_count 单图失败计数区分〕）。
--   digest 单键去重=UNIQUE(paper_id, digest)（00B 附注：本地 ref 形态不稳定
--   禁做去重键——解码位图 sha256 单键；跨篇同 digest 各自持行，资产按篇
--   分桶无共享引用计数面）。
--   excess=超上限 24/篇截断记档位（禁静默）；page 1 基。
-- 级联：paper_id 两处 FK ON DELETE CASCADE——papers.remove（单删/域删/快照
--   导入直删三路径）自动清派生行；磁盘资产清理由服务层挂点（硬删语义——
--   派生物可重建非用户原始资产，与 INV-133 受管 PDF moveToTrash 隔离语义
--   的差异=本票扩面申报行）。
-- 纯新增表无表重建无触发器（派生面不入 deletion_events 九表面——删除链
--   的资产清理走服务层，非删事件面），无 fkOff；新库 user_version 终值 23。
CREATE TABLE figure_jobs (
  paper_id     TEXT PRIMARY KEY REFERENCES papers(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ready', 'failed')),
  excess       INTEGER NOT NULL DEFAULT 0 CHECK (excess >= 0),
  failed_count INTEGER NOT NULL DEFAULT 0 CHECK (failed_count >= 0),
  updated_at   TEXT NOT NULL
);
CREATE TABLE paper_figures (
  figure_id  TEXT PRIMARY KEY,
  paper_id   TEXT NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
  digest     TEXT NOT NULL,
  file_ref   TEXT NOT NULL,
  page       INTEGER NOT NULL CHECK (page >= 1),
  width      INTEGER NOT NULL CHECK (width > 0),
  height     INTEGER NOT NULL CHECK (height > 0),
  ctm_x      REAL NOT NULL,
  ctm_y      REAL NOT NULL,
  ctm_w      REAL NOT NULL CHECK (ctm_w > 0),
  ctm_h      REAL NOT NULL CHECK (ctm_h > 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (paper_id, digest)
);
CREATE INDEX idx_paper_figures_paper ON paper_figures(paper_id);
