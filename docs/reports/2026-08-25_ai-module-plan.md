# AI 传感器链条模块：技术路线与工单化计划（2026-08-25）

> 定位：蓝图 B0（docs/reports/2026-08-25_ai-sensor-blueprint.md）与 ADR-0011
> 契约的**工程化落地路线**。用户已裁决 D1-D6+七问 v1——本文是工单化前置的
> 技术架构定案与施工序列，B3 增量裁决随本文落 ROADMAP（### P7-G 节）。

## 1. 总体架构：单仓库两面

```
┌─ 应用面（src/，被动传感器——数据基座+导出，零 LLM 出网）──────────┐
│ renderer: FulltextFigureExtractor（pdfjs 单点协作，打开的文档全页提取） │
│    │ IPC（结构化通道，文本流/图字节分页传）                            │
│ main: corpus.export.service（五件套装配+落盘）+ ai_notes repo（003 迁移）│
└──────────────────────────────────────────────────────────────────┘
                              ▼ 导出目录（ADR-0011 五件套）
┌─ 工具面（tools/ai-sensor/，主动消费端——zcode 技能，模型调用全在此侧）─┐
│ SKILL.md（激活/说明书） config（三模型可配） queue.mjs（断点续跑队列）  │
│ prompts/（七问 v1+分歧报告+四类枚举——实验迭代资产，不走工单冻结）      │
└──────────────────────────────────────────────────────────────────┘
```

边界铁律：应用侧不 import 任何模型客户端、不出网调 LLM（D2b）；工具侧不写
应用 DB（只读写导出目录——DB 真相源单向，md 投影只读）。

## 2. 应用侧架构细节

### 2.1 数据模型（迁移 003_ai_notes.sql，编号顺延实测）

```sql
CREATE TABLE ai_notes (
  id           TEXT PRIMARY KEY,           -- uuid
  paper_id     TEXT NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
  annotation_id TEXT REFERENCES annotations(id) ON DELETE SET NULL,
    -- 可空：篇级语料（无锚）∥ 挂用户/AI 标注的段级语料
  role         TEXT NOT NULL,              -- 'first-read' | 'second-read' | 'adjudicate'
  model        TEXT NOT NULL,              -- 实际模型标识（D2b 可配置的运行时记录）
  quote_text   TEXT NOT NULL DEFAULT '',   -- 自持锚定三元组（与 annotations 解耦——
  prefix_text  TEXT NOT NULL DEFAULT '',   --   AI 语料不污染用户标注 schema；渲染/装配
  suffix_text  TEXT NOT NULL DEFAULT '',   --   走 verifyQuote 文本重锚既有路径）
  anchor_page  INTEGER,                    -- AI 报告的页码（1 基，辅助定位）
  content_md   TEXT NOT NULL,              -- 七问分节 md（schema 见蓝图 §4.2）
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);
CREATE INDEX idx_ai_notes_paper ON ai_notes(paper_id, role, created_at);
```

设计裁决：**ai_notes 自持锚定三元组，不动 annotations 任何列**（D3 独立表的
彻底化）；AI 语料回灌路径=工具侧写 md → 应用导入？**否——单向**：ai_notes
由导出装配消费，写入只经应用 IPC（未来 AI-6 若需回灌再立项，v1 工具侧语料
落 `corpus-ai/` 目录与导出目录同级，应用导入器不做）。FTS：ai_notes 不入
FTS（v1——检索面先由 zcode 侧 grep 承担，接入应用搜索属 P7-E 候选）。

### 2.2 全文与图提取管线（跨进程数据流——本模块最难接缝）

铁律：pdfjs-dist 只许 PdfCanvas.tsx import（:44 既有单点）。全文/图提取在
**renderer** 侧复用已打开文档句柄（doc.getPage 全页 getTextContent / render
到离屏 canvas → toDataURL('image/png')），**main 侧只收字节落盘**。

```
导出编排（main 发起 export/corpus）：
1. main: repo 取库（papers+annotations+notes+ai_notes）→ 先写 corpus/*.md+manifest+INTERFACE.md
2. main → renderer: 事件请求「篇 X 的全文+图」（progress 事件同通道复用）
3. renderer: Extractor（PdfCanvas 协作——文档句柄经 ReaderPage 打开态获取；
   未打开的文献：渲染侧静默预载 getDocument（同 url=app-file://，pdfjs 内部缓存））
   - fulltext: 全页 getTextContent → items 拼接，页界 \f
   - figures:  page-N.png（页级渲染）+ anno-<id>.png（WADM 归一化 rects 从页图裁）
   - 分页回传：每页一个 IPC 载荷（文本/单图 base64），避免大 payload 整块
4. main: 流式落盘 fulltext/figures/，全部完成回填 manifest 的 fulltextSha/figures
```

取消/失败语义：导出会话态（进度可见=manifest 部分写入+终态标志），中断重跑
按篇幂等（contentSha/fulltextSha 稳定口径：**内容 sha 不含 exportedAt**，目录
时间戳字段单独存）。

### 2.3 IPC 契约扩展（api-surface 受锁，[locked-change]）

- `export/corpus` `{ paperIds?: string[] } → { dir, fileCount }`（全库默认；
  目录经 main 侧系统对话框选择——INV-07）
- `export/corpus-item`（内部流通道，renderer→main 回传：`{ sessionId, paperId,
  kind: 'fulltext'|'figure', page, payload }`）——**方向反转通道**：renderer
  invoke 不适用（main 是请求方），走 apiEvents 反向事件桥（PreloadEvents 形状
  扩展，env.d.ts 同源）。事件桥现状只有 importProgress 单向——本通道是
  PreloadEvents 首个双向协作面，契约测试随工单三面锚。

### 2.4 UI 入口（最小面）

设置页新增「AI 语料导出」节：目录选择（经对话框）+「导出语料」按钮+进度行
（文件计数）——不建 AI 配置 UI（D2b：配置全在 zcode 工具侧）。

### 2.5 测试体系（应用侧四层）

| 层 | 文件 | 内容 |
| --- | --- | --- |
| repo 单测 | tests/unit/db/repos/ai_notes.repo.test.ts | CRUD/级联（paper 删→cascade，annotation 删→SET NULL）/按 role 查询 |
| 提取管线单测 | tests/unit/renderer/fulltext-extractor.test.ts | pdf-factory 扩多页变体（受锁扩展）→ 断言页界 \f/文本序；图裁剪=rects 归一化数学断言（离屏 canvas mock） |
| 导出 golden | tests/unit/services/corpus.export.test.ts | 夹具库→五件套逐字节 golden+结构断言（ADR-0011 验收口径：front-matter 可解析/引文块数=DB 标注数/sortKey 序/contentSha 匹配/[ai:*] 段装配） |
| e2e | tests/e2e/ 扩展 | 导入夹具→标注→导出→磁盘五件套存在性与 manifest 一致（app.evaluate 侧通道读文件） |

### 2.6 模块骨架清单（应用侧）

```
src/main/db/migrations/003_ai_notes.sql          [受锁]
src/main/db/repos/ai_notes.repo.ts
src/main/services/export_/corpus.export.service.ts
src/main/services/export_/corpus.assemble.ts     （md 装配纯函数，可测性）
src/main/services/export_/interface-template.ts  （INTERFACE.md 静态文本单源）
src/renderer/features/reader/FulltextExtractor.ts（pdfjs 协作，不 import 组件外 pdfjs）
src/renderer/features/settings/ 导出节扩展
tools/ai-sensor/SKILL.md + config.template.json + queue.mjs + prompts/*.md
```

## 3. 工具侧架构（tools/ai-sensor/，随应用仓库版本管理）

- **SKILL.md**：zcode 技能声明——激活条件（检测导出目录 manifest 就绪）、
  队列启动、配置读取；对 zcode 的操作说明书（应用侧零改动消费）。
- **config.template.json**：`{ models: { first, second, adjudicate }, rate,
  batchSize }`——D2b 可配置面；用户复制为 config.json（gitignore）。
- **queue.mjs**：manifest ↔ 库清单 diff → 未建档队列 → 按篇三读（幂等重跑：
  篇级产物落盘后才置 done）；进度写 `progress.json`（D1 三护栏的实现位）。
- **prompts/**：first-read.md（七问+锚定要求）/ second-read.md（同构盲读——
  不看一读产物，保证独立性）/ adjudicate.md（分歧报告+聚焦裁决：只读分歧点
  与锚定段）/ synthesize.md（梳理智能体：四类核心贡献枚举+时间线多路推进+
  二级回溯锚定）。**提示词=实验迭代资产**：版本管理但不走工单冻结（每次
  读感调整即改，工程化工单只冻结骨架与契约）。
- 工具侧测试：queue.mjs 的 diff/幂等/断点续跑（纯脚本单测，node:test 或
  vitest describe 平铺——落 tests/unit/tools/）。

## 4. 工单序列（SR2-AI-01~05；开工前置=本计划落 ROADMAP P7-G 节）

| # | 工单 | file | 依赖 | 验收要点 |
| --- | --- | --- | --- | --- |
| SR2-AI-01 | ai_notes 数据基座 | migrations/003+repo | P7-C | repo 单测全绿；annotations 零改动证明（diff 空） |
| SR2-AI-02 | 全文/图提取管线 | FulltextExtractor.ts+事件桥 | 01 | 多页夹具页界断言/裁剪数学断言/事件桥契约三面锚 |
| SR2-AI-03 | 语料导出五件套 | corpus.export.service+assemble | 02 | golden+结构断言（ADR-0011 口径）+幂等重导 sha 稳定 |
| SR2-AI-04 | 导出 UI 入口 | SettingsPage 扩展 | 03 | 设置页节+进度+e2e 全链 |
| SR2-AI-05 | zcode 工具骨架 | tools/ai-sensor/ | 03（目录契约） | queue diff/幂等测试+SKILL.md 自包含评审 |

三读/梳理管线本体（AI-4/AI-5 蓝图层）**不工单化**——它们是提示词工程实验
循环（prompts/ 迭代），工程化边界止于骨架与契约。

## 5. 排序提案（主线关系，请用户确认后入 ROADMAP）

P7-B 收官（TABS-04/UNDO-01/e2e 三序列）→ **P7-C**（笔记结构化=用户语料面，
AI 导出的 corpus 装配直接复用其排序/装配规约）→ **AI-01~05**；P7-F（连续
滚动）与 AI 链条零依赖，可在其间任意穿插或延后。

## 6. 文档体系状态

已有：蓝图 B0（含 §4.1 裁决/§4.2 七问）/ADR-0011（五件套契约）/0012/0013/
本文（技术路线）。待产（随工单）：INTERFACE.md 模板（AI-03 交付物单源）/
tools/ai-sensor/README（AI-05）。安全面：零新增出网 host、零 LLM 依赖、
零新 npm 依赖（PNG 编码用 canvas 原生；sha 用 node:crypto 既有先例）。
