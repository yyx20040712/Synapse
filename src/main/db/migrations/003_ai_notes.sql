-- 003_ai_notes：AI 语料独立表（AI-01，P7-G/ADR-0015 N2 粒度——一行=一锚定段×一问）
-- 设计裁决（ai-module-plan v1.1 §2.1）：
-- - 自持锚定三元组（quote/prefix/suffix）+anchor_page，与 annotations 表零耦合
--   （D3 彻底化：AI 语料不污染用户标注 schema；渲染/装配走 verifyQuote 文本重锚）
-- - role 枚举真相=DDL CHECK（zod 镜像消费=src/shared/models/ai-note.ts，接缝
--   双向锚定）；question 取值 'Q1'..'Q7'|'divergence'（七问 v1 冻结——DDL 不加
--   CHECK：枚举扩展走 zod 层=[locked-change]，DDL 收窄需新迁移，扩展性优先）
-- - 级联：paper 删→CASCADE（语料随篇亡）；annotation 删→SET NULL（锚定段降级
--   篇级，数据不丢——可空外键）
-- - v1 无生产者（R4）：生产者=测试夹具→AI-07 导入器；消费者=导出装配
-- - FTS 不入（v1——检索面先由 zcode 侧 grep 承担，接入应用搜索属 P7-E 候选）
CREATE TABLE ai_notes (
  id            TEXT PRIMARY KEY,           -- uuid
  paper_id      TEXT NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
  annotation_id TEXT REFERENCES annotations(id) ON DELETE SET NULL,
                                              -- 可空：篇级语料（无锚）∥ 挂用户/AI 标注的段级语料
  role          TEXT NOT NULL CHECK (role IN ('first-read','second-read','adjudicate')),
  question      TEXT NOT NULL,              -- 'Q1'..'Q7' | 'divergence'（divergence=裁决者分歧报告节；Q3/Q6/Q7 允许无锚篇级回答）
  model         TEXT NOT NULL,              -- 实际模型标识（运行时记录，自由文本——D2b 可配）
  quote_text    TEXT NOT NULL DEFAULT '',
  prefix_text   TEXT NOT NULL DEFAULT '',
  suffix_text   TEXT NOT NULL DEFAULT '',
  anchor_page   INTEGER,                    -- AI 报告的页码（1 基，辅助定位；可空）
  content_md    TEXT NOT NULL,              -- 单段内容（该问在该锚定段的回答）
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);
CREATE INDEX idx_ai_notes_paper ON ai_notes(paper_id, role, created_at);
