# AI 传感器链条模块：技术路线与工单化计划（2026-08-25）

> 定位：蓝图 B0（docs/reports/2026-08-25_ai-sensor-blueprint.md）与 ADR-0011
> 契约的**工程化落地路线**。用户已裁决 D1-D6+七问 v1——本文是工单化前置的
> 技术架构定案与施工序列，B3 增量裁决随本文落 ROADMAP（### P7-G 节）。
>
> **v1.1 修订（2026-08-25 同日，计划审查定稿**——审查报告=docs/reports/
> 2026-08-25_ai-plan-review.md，R1~R14 裁决实录）：①pdfjs「单点」表述改
> **白名单三文件**+ESLint 机器锚（R1）；②Extractor 自持文档生命周期，废
> 「复用已打开句柄」「pdfjs 内部缓存」两错误假设（R2）；③事件桥单向化，
> 回传走常规 invoke 端点，废「双向协作面」（R3）；④manifest 终局单写+原子
> 替换+errors 字段+会话开始清空重建（R5/R8）；⑤front-matter 去 exportedAt
> 保幂等 sha 口径（R6）；⑥figures 定全页快照（R7）；⑦ai_notes v1 无生产者
> 显式声明+[ai:*] 装配入 v1（R4，ADR-0011 v1.1 同步）；⑧骨架增补四件+工具面
> 测试定 vitest（R11/R14）。§2.2/§2.3/§2.6/§4 已按定稿改写。

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

铁律（v1.1）：pdfjs-dist 运行时 import **白名单三文件**={PdfCanvas.tsx, TextLayer.tsx,
CorpusExtractor.ts}，ESLint no-restricted-imports 强制（机器锚，随 SR2-AI-02 落地）；
PdfCanvas.tsx:27「唯一允许」与 TextLayer.tsx:21「唯一…文本层 API」两处头注措辞同步
修正为白名单表述（接缝归责）。CorpusExtractor 的 pdfjs 类型消费循既有模式（从
PdfCanvas 取再导出类型）。

**CorpusExtractor 自持文档生命周期**（v1.1 裁决）：不复用 ReaderPage 句柄（句柄在
ReaderPage.tsx:91 组件 state，模块外不可达；pdfjs getDocument 亦无跨调用缓存——
原「复用已打开句柄/内部缓存」假设作废），load→逐页提取→destroy 全程自管；监听挂
App 层（useExportCorpusEvents），与 Settings/Reader 挂载态零耦合。

```
导出编排（main 发起，会话单飞——状态机表见审查报告 §6）：
1. main: dialog 选目录（INV-07）→ 删旧 manifest+清空重建 corpus/fulltext/figures
   → repo 取库（papers+annotations+notes+ai_notes）→ corpus.assemble 写 corpus/*.md
2. main → renderer: exportCorpus 事件（单向）{type:'extract-request', sessionId,
   paperId, url}——url=app-file:// 由 main 下发（INV-07 先例=reader/open）；
   progress 载荷同通道判别联合
3. renderer: CorpusExtractor（App 层监听）
   - fulltext: 全页 getTextContent → items 拼接，页界 \f
   - figures:  page-N.png（离屏 canvas 全页渲染——v1.1 定全页快照）+
               anno-<id>.png（WADM 归一化 rects 从页图裁）
   - 逐页一个 invoke 回传（文本/单图 base64），await ack 后发下一页=天然背压；
     篇毕回传 {kind:'complete'|'error'}
4. main: 流式落盘 fulltext/figures → 全部终局后 manifest 终局单写
   （temp+rename 原子替换，含 contentSha/fulltextSha/errors）
```

取消/失败语义（v1.1）：无取消 UI（v1 极简）；会话态单飞（进行中拒第二会话
EXPORT_BUSY）；篇级失败进 manifest.errors[] 会话继续；中断=无 manifest（工具侧
不可激活）+重跑即修复（清空重建幂等）；contentSha/fulltextSha=文件字节 sha
（front-matter 不含 exportedAt，同库重导逐字节稳定——ADR-0011 v1.1）。

### 2.3 IPC 契约扩展（api-surface/schemas/app-error 受锁，[locked-change]）

- `export/corpus` `{ paperIds?: string[] } → { dir, fileCount, errorCount }`（全库默认；
  目录经 main 侧系统对话框选择——INV-07；会话终局 resolve）
- `export/corpus-item`（**常规 invoke 端点**，renderer→main 逐页回传：`{ sessionId,
  paperId, kind: 'fulltext'|'figure'|'complete'|'error', page, payload }`）——走
  register.ts 既有 zod 校验+Result 折叠，无需新机制（v1.1：原「反向事件桥」设计
  废除——对话方向反转≠传输方向反转）
- `EVENT_CHANNELS` 增 `exportCorpus`（**仍为 main→renderer 单向**，api-surface.ts:76
  声明不变）：载荷判别联合 `{type:'extract-request', sessionId, paperId, url} ｜
  {type:'progress', sessionId, done, total, phase}`；PreloadEvents 增
  `onExportCorpus(cb): () => void`（env.d.ts 同源）；main 侧发送器经 bootstrap
  装配桶注入（importProgress/sendProgress 同型先例）
- app-error 新码 `EXPORT_BUSY`（并发第二会话拒绝，INV-13 折叠消费分支=UI 提示）

### 2.4 UI 入口（最小面）

设置页新增「AI 语料导出」节：目录选择（经对话框）+「导出语料」按钮+进度行
（文件计数）——不建 AI 配置 UI（D2b：配置全在 zcode 工具侧）。

### 2.5 测试体系（应用侧四层）

| 层 | 文件 | 内容 |
| --- | --- | --- |
| repo 单测 | tests/unit/db/repos/ai_notes.repo.test.ts | CRUD/级联（paper 删→cascade，annotation 删→SET NULL）/按 role 查询 |
| 提取管线单测 | tests/unit/renderer/corpus-extractor.test.ts | pdf-factory 扩多页变体（受锁扩展）→ 断言页界 \f/文本序；图裁剪=rects 归一化数学断言（离屏 canvas mock） |
| 导出 golden | tests/unit/services/corpus.export.test.ts | 夹具库→五件套逐字节 golden+结构断言（ADR-0011 验收口径：front-matter 可解析/引文块数=DB 标注数/sortKey 序/contentSha 匹配/[ai:*] 段装配） |
| e2e | tests/e2e/ 扩展 | 导入夹具→标注→导出→磁盘五件套存在性与 manifest 一致（app.evaluate 侧通道读文件） |

### 2.6 模块骨架清单（应用侧，v1.1 定稿）

```
src/main/db/migrations/003_ai_notes.sql          [受锁]（role CHECK 约束）
src/main/db/repos/ai_notes.repo.ts               （+repos/index.ts 注册）
src/main/services/export_/corpus.export.service.ts  （会话编排+manifest 终局单写）
src/main/services/export_/corpus.assemble.ts     （md 装配纯函数——P7-C 建立排序/引文块/
                                                   [user] 前缀规约，AI-03 同文件延展，禁两套）
src/main/services/export_/interface-template.ts  （INTERFACE.md 静态文本单源）
src/renderer/features/reader/CorpusExtractor.ts  （自持 pdfjs 文档生命周期+离屏渲染+裁剪；
                                                   白名单第三成员）
src/renderer/features/settings/CorpusExportSection.tsx （设置页导出节，SettingsPage 行数防线）
src/renderer/features/settings/corpus-export.store.ts  （进度态，zustand 既有先例）
src/renderer/shared/hooks/useExportCorpusEvents.ts     （App 层订阅+toast，INV-14 成对清理）
src/shared/ipc/api-surface.ts + schemas.ts + app-error.ts  [受锁]（通道/事件/错误码）
tools/ai-sensor/SKILL.md + README.md + config.template.json + queue.mjs + prompts/*.md
tests/unit/tools/queue.test.ts                   （vitest 宿主——弃 node:test，防两套测试基建）
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

## 4. 工单序列（SR2-AI-01~05；开工前置=本计划落 ROADMAP P7-G 节；v1.1 增补列）

| # | 工单 | file | 依赖 | 验收要点（v1.1 增补并入） |
| --- | --- | --- | --- | --- |
| SR2-AI-01 | ai_notes 数据基座 | migrations/003+repo | P7-C | repo 单测全绿；annotations 零改动证明（diff 空）；DDL 含 role CHECK；头注载明「v1 无生产者（生产者=测试夹具，消费者=导出装配，写入面=未来回灌工单）」 |
| SR2-AI-02 | 全文/图提取管线 | CorpusExtractor.ts+事件桥 | 01 | 多页夹具页界断言/全页快照+裁剪数学断言/事件通道契约三面锚；**ESLint pdfjs 白名单（[locked-change]）+PdfCanvas:27/TextLayer:21 头注修正**；Extractor 自持生命周期（无 ReaderPage 耦合证明） |
| SR2-AI-03 | 语料导出五件套 | corpus.export.service+assemble | 02 | golden+结构断言（ADR-0011 **v1.1** 口径：含 [ai:*] 段装配）+幂等重导逐字节稳定；**manifest 终局单写+errors+会话清空重建**；装配单源接续 P7-C 的 corpus.assemble.ts |
| SR2-AI-04 | 导出 UI 入口 | SettingsPage 扩展 | 03 | CorpusExportSection 组件+进度+**App 层订阅（useExportCorpusEvents 成对清理）+完成/失败 toast（INV-02）**+e2e 全链（含中断重跑序列） |
| SR2-AI-05 | zcode 工具骨架 | tools/ai-sensor/ | 03（目录契约） | queue diff/幂等测试（**vitest 宿主**）+SKILL.md 自包含评审+config.json 入 .gitignore+tools/ 入 eslint 覆盖核对 |

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
