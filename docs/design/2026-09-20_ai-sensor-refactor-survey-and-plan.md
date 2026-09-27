# ai-sensor 域改造调研与规划——直连 LLM API + 业务收缩为「评估笔记/分析脉络」

> 2026-09-20 立档。用户指令两条：①取消共享 zcode，调研本地 API 调用（重点：
> 缓存命中、记忆系统等性能优化）；②AI 读文献业务收缩，转为评估用户对每篇文章
> 所做笔记 + 分析人工绘制的发展脉络，分析建议呈对话框，**不随便改笔记**。
> 本档性质=调研与规划（实现后置）；按宪法属架构与技术路线层，实施前需走设计链
> （Kimi 拟定→deepseek 审核→主控终裁）。承接同日会话结论：AI 定位=对抗性评估者
> （接地、分级、无写入权），非内容作者。

## 0. 目标形态（业务收缩后的新职责）

| 维度 | 现状（B' 伴随进程+文件协议） | 目标（直连 API+评估者） |
| --- | --- | --- |
| LLM 触达方式 | zcode CLI 技能侧消费语料文件，应用零出网 | 应用主进程直连 LLM API（用户自配 key） |
| AI 产出内容 | 七问读文献笔记（首读/二审/裁决三段） | 评估用户笔记 + 分析人工脉络图 |
| AI 写入权 | corpus-ai 产物经用户点导入回灌 ai_notes 表 | **零写入**：结果只进对话框与自有评估存储 |
| 触发 | 用户在 zcode 侧手动跑 companion | 应用内按钮手动触发（宪法：增强只手动触发） |
| 性能关心点 | 不适用（离线文件） | 缓存命中（prompt caching）+ 记忆系统 |

## 1. 现状盘点（改造对象全景，2026-09-20 实测）

### 1.1 主进程与契约面

- IPC（api-surface.ts:72-81，ai_sensor 域 7 通道）：`ai-sensor/request-read`、
  `ai-sensor/status`、`ai-sensor/observe`、`ai-notes/import`、`ai-notes/list`、
  `zcode-link/detect`、`zcode-link/install`；handler 映射在 ipc/ai_sensor.ts:16-23（薄分发）。
- services/ai_sensor/ 三件：ai-sensor.service（文件协议四成员：pending/<jobId>.json
  应用写工具读后删 / status.json 工具写心跳·判活=heartbeatAt 10min 新鲜度 /
  corpus-ai/<paperId>.json 工具写产物 / archive 账本 sha 幂等；全部 tmp+rename）；
  ai-notes-import.service（回灌：清面+重插单篇事务=INV-67）；zcode-link.service
  （五态纯 fs 检测+技能模板复制到 ~/.zcode/skills/ai-sensor/，零 spawn）。
- tools/ai-sensor/：companion.mjs（四步序会话壳）+queue.mjs（纯函数队列）+SKILL.md
  （zcode 技能声明=与 zcode CLI 的唯一耦合点）。
- 出网白名单（constants.ts:19-23）：仅 crossref/openalex/arxiv 三 host；超时 15s、
  重试 2（仅 429/5xx）。
- **http-client 能力缺口（本改造最大基础设施面）**：现仅 GET（fetchJson/
  fetchText/pingHost），**无 POST body、无 Authorization 头、无 SSE 流式消费**、
  超时 15s 不够 LLM 长响应、响应上限 20MB（对 LLM 够用）。直连 LLM 需扩四项：
  POST JSON、密钥头、超时档位可调（建议 60-120s）、（v2 可选）SSE。
- ai_notes 表（migration 003）：id/paper_id/annotation_id 可空/role('first-read'|
  'second-read'|'adjudicate')/question(Q1..Q7|divergence)/model/quote+prefix+suffix/
  anchor_page/content_md/created_at/updated_at。
- corpus 五件套（export_ 域，与 ai_sensor 通道解耦）：INTERFACE.md、manifest.json、
  corpus/<paperId>.md、fulltext/<paperId>.txt、figures/*.png → 用户经系统对话框自选目录。

### 1.2 渲染层消费面

- reader 域：AiNotesSection（七问分节+锚定引用+只读，挂 ReaderNotesPanel:53/204）/
  AiNoteGroupList（question×role 折叠）/AiNotesStatus（「AI 读文献」「导入」按钮+5s
  轮询 observe 六态）/AiAnnotationLayer（AI 段高亮，挂 PagesOverlay:48）/state/
  ai-notes.store（数据单源）。信号链经 reader.store notifyAiNoteHighlight 与
  OutlineAside highlightAiNoteId。
- lineage 域：LineageSideAiNotes（直连 api.ai_sensor.listByPaper，挂 LineageSidePanel:190，
  双击跳阅读器锚）。
- settings 域：ZcodeLinkSection（五态+一键装技能，本地 useState，无 store 字段）。
- corpus 导出渲染面（保留候选，与本次改造正交）：corpus-export.store +
  CorpusExportSection + App.tsx 事件订阅 + library 单篇/全库入口。

### 1.3 测试与受锁面（改造爆炸半径的量化）

- unit（约 10 文件 122 用例）：ai-notes-section 24 / ai-annotation-layer 12 /
  ai-note-collapse 6 / ai-note-style 3 / zcode-link-section 16 / corpus-export 17 /
  corpus-extractor 14（后两组属保留候选）+ 连带 reader-notes-panel 7 /
  notes-panel-status 2 / lineage-side-panel 21（含 AI 分节用例）。
- e2e：ai-notes-section.spec 2 例（面板全链/标注层）、zcode-link.spec 1 例（装技能
  fs 落地）、corpus-export.spec 2 例（保留候选）、lineage.spec T4（AI 笔记导入→侧板→跳锚）。
- 受锁命中约 20 文件（manifest grep 口径）：改造须 [locked-change]；动 tests/** 须
  [locked-change][test-refactor] 双尾注+豁免清单裁决+战役毕基线重生成。

### 1.4 ADR/INV 依赖网（需修订清单）

- ADR-0015（B' 伴随进程+文件协议中选）→ 模式切换需修订或废止重立；ADR-0011
  （五件套）→ 保留则不动；ADR-0012/0014（人工策展）→ 不受影响、反而被本次强化。
- INV-21（应用零 LLM 出网+永不 spawn）→ 改写为「LLM 调用仅 main 侧白名单 host+
  手动触发+密钥不渡 renderer」；INV-26（文件协议三联）→ 随协议废止；INV-67（回灌
  事务性）→ 随回灌废止。新 INV：评估只读（评估服务对 notes/annotations/lineage
  repos 零写方法注入；结果仅入自有存储）。

## 2. 直连 LLM API 调研（2026-09-20 核）

### 2.1 云供应商与缓存机制（关键差异表）

| 供应商 | 缓存机制 | 命中价 | 备注 |
| --- | --- | --- | --- |
| 智谱 bigmodel（GLM） | **自动隐式**（公共前缀自动识别，零代码改动） | ≈输入价 20% | usage.prompt_tokens_details.cached_tokens 可查命中量 |
| Moonshot Kimi | 显式 Cache API+新版自动缓存；TTL 档位（5/10min 档）计费，命中刷新 TTL | K2 约 ¥1.10/M vs 未命中 ¥6.50/M | 128K 首 token 延迟降约 83%；声明省最高 90% |
| DeepSeek | **磁盘缓存默认开启**，零改动 | ≈未命中 1/10 | 社区实测 87% 命中率近乎免费跑 RAG |
| OpenAI/Anthropic | 自动（≥1024 前缀）/显式 cache_control | 50% / 读取 0.1x | 海外网络经代理，次选 |

结论：评估类调用**输入大（笔记+脉络装配）、输出小（分级意见）**，缓存命中率是
成本与延迟的主变量。三家国产均可用；DeepSeek 缓存最省、GLM 生态现成（用户现用）、
Kimi 显式缓存可控性最强。三家均为 OpenAI 兼容 chat/completions 形态——**一套
provider 抽象可通吃**，切换成本=baseURL+key+模型名。

### 2.2 本地推理路线（Ollama/vLLM/llama.cpp）

- Ollama：keep_alive 控制模型+上下文驻留（模型驻留缓存，非 token 级）；适合桌面
  单机，但**评估/攻击任务需要强模型**，本地量化模型质量上限是硬约束。
- vLLM APC（KV block 级前缀缓存）：服务器级并发场景，桌面单用户过重。
- 判断：本地推理列为 P8+ 候选不作首落——本应用的评估任务低频手动触发、要求模型
  推理质量，云 API+缓存命中的性价比优于本地推理的运维成本（模型下载/显存/版本）。
  provider 抽象预留 localhost baseURL 即可，后续无迁移成本。

### 2.3 缓存友好的调用设计纪律（写入实现票的硬要求）

1. **稳定前缀**：system prompt（评估者角色+攻击协议+输出 JSON schema）字节级
   固定，置于消息首。
2. **慢变居中**：研究画像块（课题背景/既有裁决/偏好，来自 settings+既有评估摘要）
   次之，变更频率低。
3. **易变置尾**：当篇笔记装配/当前脉络快照放最后——多轮评估间前缀最大化复用。
4. JSON 装配字段顺序恒定（序列化排序稳定，禁对象字面量无序注入）。
5. usage 透出：每次调用记录 cached_tokens/prompt_tokens，设置页显示命中率与花销
   估算（单用户成本可见性）。

### 2.4 记忆系统：结论=不需要引入外部框架

- 现有框架（mem0/Letta(MemGPT)/Zep）本质=托管记忆层或 agent 自管理分层记忆
  （core/recall/archival），引入即新增 npm 依赖（宪法禁新依赖，需 ADR+dep-change）
  且自管理路线的可靠性依赖 LLM 工具调用质量（2026 年社区已有批评）。
- 本应用的记忆需求**已结构化在 SQLite**：annotations（带锚）/notes/lineage 图/
  （增补候选）框架快照。评估调用=「无状态上下文装配」：按评估对象从 DB 查询
  组装，装配即记忆（Letta 2025「文件系统即记忆」基准路线的应用侧特例）。
- 分期：v1=纯装配（零新依赖、零新表）；v2 候选=评估历史摘要滚入画像块（压缩
  记忆）；v3 候选=FTS5 检索扩展（跨库笔记召回装配）——均复用既有设施。

## 3. 新业务设计：评估笔记 + 分析脉络

### 3.1 两个评估对象与输入装配

- **A 单篇笔记评估**（入口：阅读器笔记面板按钮）：输入=文献元数据+该篇全部
  标注（quote+批注）+笔记；评估维度=覆盖（核心主张是否被笔记覆盖）/准确（笔记
  与锚文是否相符）/缺口（重要主张·局限·方法遗漏）/一致性（笔记间互斥点）。
- **B 脉络分析**（入口：lineage 视图按钮）：输入=脉络图全量（nodes core_idea/
  edges tree-ref-manual/tags）+（候选）框架快照；五级分层=证据契合（节点主张与
  其锚定证据强度是否匹配）/方法/推理（边关系是否成立）/范围（外推边界）/
  框架（rival 结构**仅作建议提议**）。
- 接地纪律（承接会话裁决）：每条意见必须锚到语料事实（paperId+quote）或显式
  标注「[训练先验]」——不接地的通用红队意见按 schema 拒收（zod 层校验）。

### 3.2 输出形态与对话框

- 模态对话框（或侧板，决策点 D6）：意见卡片=级别（P0 立即复核/P1 建议考虑/
  P2 备注）×分层（证据/方法/推理/范围/框架）+锚定引用（点击跳阅读器定位，
  复用 locateAnchor 既有链）+接地标注。
- 只读呈现：无任何「应用此修改」按钮——采纳=用户自己去改笔记/脉络（改完可
  再评估，形成攻击-修订环）。
- 历史：评估结果入自有存储（ai_evaluations 表或文件，D6 裁），可回看历次意见。

### 3.3 只读红线的架构保证（新 INV）

- 评估 service 的依赖注入**只给读方法**（papers/annotations/notes/lineage repos
  的 query 面）；写入仅限自有评估存储。
- api-surface 新域（暂名 llm-eval）：`llm-eval/evaluate-notes`(paperId→resultId)、
  `llm-eval/evaluate-lineage`(void→resultId)、`llm-eval/list-results`、
  `llm-eval/get-result`(id)——通道面天然无任何 notes/lineage 写通道。
- 密钥不过 preload：key 配置走 settings 域通道存 main 侧，renderer 仅见掩码。

## 4. 安全与合规清单

- 新增出网 host：bigmodel/Moonshot/DeepSeek 的 API 域名入 constants.ts 白名单
  （受锁+ADR-0021+[locked-change]）；CSP 零改动（调用在 main，renderer 不出网）。
- 手动触发红线：评估仅按钮触发，无后台轮询/定时（宪法「后台自动网络任务」禁令）。
- 重试纪律：LLM 调用不自动重试非幂等生成（防重复计费），仅网络层错误重试 1 次。
- key 存储：userData 下配置文件（0600 尽力+单用户本地应用威胁模型），不入库
  不入 renderer 不入日志。

## 5. 删除面与迁移清单

| 对象 | 处置 | 依据 |
| --- | --- | --- |
| tools/ai-sensor/（companion/queue/SKILL.md） | 删除 | zcode 耦合根 |
| services/ai_sensor/ai-sensor.service + zcode-link.service | 删除 | 协议废止 |
| services/ai_sensor/ai-notes-import.service | 删除（回灌废止） | 七问业务收缩 |
| ipc 7 通道中 request-read/status/observe/import/zcode 两通道 | 删 5 留 2 | notes-list 留否随 D4 |
| 渲染层 AiNotesStatus/ZcodeLinkSection | 删除 | 触发面消失 |
| AiNotesSection/AiNoteGroupList/AiAnnotationLayer/LineageSideAiNotes | 随 D4（留=历史只读，删=migration 010） | 历史数据去留 |
| ai_notes 表 | D4（推荐保留只读，迁移零成本） | 只追加纪律 |
| corpus 五件套（export_ 域全链） | **推荐保留**（与 ai_sensor 通道解耦，独立价值） | D5 |
| ADR-0015 修订+INV-21 改写/INV-26·67 废止+新只读 INV | 本票触及即回写 | 完成定义 |
| 测试面 ~20 受锁文件改造 | [locked-change][test-refactor]+豁免+基线重生成 | §1.3 |

## 6. 票批拆分预估与排程建议

- 预估 6-8 票：①ADR-0021+白名单+http-client 扩展（POST/auth/超时档，基础设施）
  ②llm-client provider 抽象+缓存纪律+usage 记录 ③llm-eval service+通道+只读注入
  ④渲染对话框（两入口）+设置页 key 配置+命中率显示 ⑤删除面+测试改造（最大票，
  可拆两票）⑥INV/ADR 回写+交接书滚动。
- 排程：本档→用户裁决 §7→设计链三跳（Kimi 拟定→deepseek 审→主控终裁，产出
  design-final）→立票进批。夜批适配性：③④ 为标准三屋票；①② 含 ADR 与受锁
  扩展属设计链强票；⑤ 测试重构票需在场或严格交接。
- 成本画像：评估调用=大输入小输出，单次笔记评估估 10-40k input tokens（缓存
  命中后实付大幅下降）；脉络分析随图规模线性增长，建议分批（按子树）装配。

## 7. 决策点呈报（D1~D8，归用户裁决）

- **D1 供应商路线**：推荐「provider 抽象+首落智谱 bigmodel（生态现成+自动缓存），
  DeepSeek 作第二供应商（缓存最省）」；本地 Ollama 列 P8+（localhost baseURL 预留）。
- **D2 key 存放**：推荐 userData 配置文件（无新依赖）；OS keychain 需新依赖违宪。
- **D3 白名单新增集**：随 D1 定 host 清单（ADR-0021）。
- **D4 ai_notes 历史数据**：推荐表保留+渲染层保留只读（迁移零成本，历史可回看）；
  或 migration 010 删表+四组件删（爆炸半径 +4 组件 +37 用例）。
- **D5 corpus 五件套**：推荐保留（通道属 export_ 域，不受本改造牵连）。
- **D6 评估结果存储与 UI**：推荐新表 ai_evaluations+模态对话框（可回看历史）；
  或 v1 免存储一次性弹窗（更小起步）。
- **D7 流式**：推荐 v1 非流式+loading 态（SSE 列 v2，需 http-client 再扩）。
- **D8 设计链启动**：裁决后即排（首跳 Kimi 拟定）。

## 8. 资料来源（2026-09-20 检索）

- 智谱上下文缓存：docs.bigmodel.cn「上下文缓存」章节（自动隐式+cached_tokens）；
  Z.AI Context Caching Overview。
- Kimi：platform.kimi.com/docs/guide/use-context-caching-feature-of-kimi-api；
  Context Caching 公测公告与「节省 90%」案例（¥1.10/M cached vs ¥6.50/M，TTL 档位）。
- DeepSeek：api-docs.deepseek.com/guides/kv_cache（默认开启磁盘缓存）；
  news0802（命中 $0.014/M）。
- 本地推理：docs.vllm.ai Automatic Prefix Caching；Ollama keep_alive 文档；
  glukhov.org「Ollama to vLLM 迁移时机」。
- 记忆框架：Letta「Benchmarking AI Agent Memory: Is a Filesystem All You Need?」
  （2025-08）；mem0 论文与 benchmark 页；vectorize.io「Mem0 vs Letta」；
  evermind.ai 对 Letta 自编辑记忆可靠性的批评。

## 9. 与 T3-P5 脉络数据层的解耦声明（2026-09-27 立票前呈报）

> 背景：T3 三主题战役 P5「脉络数据层」（2026-09-26_theme-trio-final-design.md §6 票 5）
> 与本档（D1-D8 未裁、未立项）在 lineage 侧存在交叠。本节为立票前显式边界声明
> （交接书 v64 §2.2.b 前置件），双方互不吞并。

**归 P5（theme-trio 战役，先行实施）**：lineage v2 模型增量（Node+month /
Edge+sub / Graph+lineTypes）、迁移 010、IPC/service 扩展、corpus 导出扩展
lineage.json（AI 可读规格：确定性键序/snake_case/语义字段/schema 版本）、
catalog_no 与 month 两处文献库消费升级（C5）。P5 零触碰 ai_sensor 域
（7 通道/ai-notes-* 服务/AI 分节组件的存废不在其票面）。

**归 ai-sensor 域（本档，D1-D8 裁决后立项）**：直连 LLM API 基础设施、评估
业务（A 笔记评估+B 脉络分析）、§5 删除面与迁移清单全部内容。

**三个交叠面的归属裁定**：

1. **lineage.json 导出 ↔ B 脉络分析输入装配**：P5 定义的导出面即本档 §3.1-B
   评估的输入预置契约（AI 易读规格由此单源）；ai-sensor 实施时直接消费该面
   （文件或 repos 只读查询），不重定义装配 schema，不反向约束 P5 字段。
2. **LineageSideAiNotes 组件（§1.2，挂 LineageSidePanel）**：T3-P6+ 渲染
   重设计（时间线/检查面板）中该组件**保活迁移**，不做删除裁决——其去留
   属本档 D4（ai_notes 历史数据）处置面；T3 各票检查面板的「AI 评估笔记
   （后置章）」为占位保活，不预实现任何评估功能。
3. **month/sub/lineTypes 新字段**：归 P5 数据层；本档 B 评估的输入描述
   （nodes core_idea/edges kind/tags）在 P5 落地后自然扩展（装配基线=P5 后
   schema），本档 §3.1 文本不随 P5 改写，实施票内对齐。
