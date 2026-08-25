# ADR-0015：AI 笔记回灌与伴随进程协议（B'）

- 日期：2026-08-25（蓝图 §4.3 第四轮裁决 E1/E2/E7 + 新需求 N2/N4）
- 状态：已裁决——SR2-AI-06~10 工单组（ROADMAP P7-G 增容节）
- 关联：蓝图 D2b（应用零 LLM 出网——本 ADR 保持其安全面）/D3（独立表+写入只经
  应用 IPC）/ADR-0011 v1.1（[ai:*] 段装配）/ai-rescope-verification §3 P1（四方案
  对比，B' 中选）

## 背景

用户要求：笔记 tab 增「AI 读文献」按钮、点击后显示进行中直到笔记写完、AI 笔记
在笔记 tab 显示。与 D2b「应用侧零 AI 配置 UI+零 LLM 出网、激活全在 zcode 侧」
三面冲突（触发/出网/回灌）。四方案对比后裁决 **B' 伴随进程+文件协议**：安全面
零变化（应用零 LLM 出网、零新 host、零密钥），UX 在 zcode 工具运行时完整，与
「zcode 编排」愿景自洽；D utilityProcess 自含方案记 P8+ 升级候选。

## 裁决

### 1. 伴随进程文件协议（E1）

- 目录：应用 `userData/ai-sensor/`（应用管）：
  - `pending/<jobId>.json`——任务请求（`{ paperId, kind:'three-read', requestedAt }`），
    由笔记 tab「AI 读文献」按钮写入（用户点击=手动激活，非自动触发）；
  - `status.json`——会话状态+心跳（`{ state, currentPaper, role, updatedAt,
    heartbeatAt }`；工具侧周期刷新 heartbeatAt，应用按新鲜度阈值判定运行中）。
- 工具侧（tools/ai-sensor，zcode 技能或手动 `node` 拉起——**应用永不 spawn**）：
  轮询 pending→执行三读（queue 既有幂等）→产物落 `corpus-ai/<paperId>.json`→
  移除 job→刷新 status。
- 应用侧轮询：仅存在 pending job 或笔记面板打开时（fs 轮询，非网络，无常驻后台
  任务——负面清单精神）；「AI 正在读」状态行消费 status。
- 产物格式 `corpus-ai/<paperId>.json`：行式锚定段数组 `{ role, question, model,
  quote_text, prefix_text, suffix_text, anchor_page, content_md }`（与 ai_notes
  列同形——N2 粒度）。

### 2. 回灌导入器（E2）

- 新 IPC：`ai-notes/import`（目录扫描→解析校验→写 ai_notes；幂等：已导入篇按
  内容 sha 去重跳过）+ `ai-notes/list`（读通道）——api-surface/schemas 受锁
  [locked-change]。
- **写入只经应用 IPC**（D3 保持）；工具永不写 DB；导入后产物移 `archive/`。
- AI-01 头注「v1 无生产者」声明的解除时点=本导入器落地（SR2-AI-07）。

### 3. ai_notes 粒度与渲染（N2）

- **一行=一锚定段+一问**：DDL 增 `question TEXT NOT NULL CHECK(question IN
  ('Q1'..'Q7','divergence'))`（divergence=裁决者分歧报告节）；锚三元组可空=篇级
  回答（Q3/Q6/Q7 允许无锚——Q3 缺失物本无原文）；content_md=单段内容。修订并入
  SR2-AI-01（未开工）。ADR-0011 的 [ai:*] 段语法不变，装配按 role→question 分组。
- **渲染对等/存储独立**：AI 锚定段经 verifyQuote 重锚取得 rects 入 AnnotationLayer
  同一几何管线（几何对等）；七问分色单源（annotation-style 同族新模块，INV-11）；
  数据**永不写 annotations 表**；**AI 标注 v1 只读**（无编辑/删除写路径；点击=
  高亮+跳笔记面板对应条目）。
- **三层防线升格验收条款**（INV-20）：①quote 三元组 verifyQuote 重锚（滚动+闪烁）
  ②失败→anchor_page 页级降级（跳页+「锚定失效已定位到页」提示）③无锚/篇级→仅
  打开文献（上次阅读进度）。一切跳转消费方（N1 笔记面板/N3 脉络图）共用同一
  「锚点定位服务」，禁各写降级。

### 4. 设置页 zcode 联动（N4）

- 状态三档：未发现 zcode（技能目录/CLI 痕迹检测，纯 fs）→ 已装技能未运行 →
  运行中（心跳新鲜）。
- 一键装技能：fs 复制应用资源内技能模板（tools/ai-sensor 打包产物）至 zcode
  技能目录；用户点击+确认后执行。
- **不代启会话**：按钮永不 spawn 任何进程（INV-21，e2e 断言）——AI 工作只由
  用户在 zcode 侧启动（D2b 激活语义保持）。

### 5. 密钥（E7）

模型 API key 留 `tools/ai-sensor/config.json`（gitignore）；应用零密钥面、零
新增出网 host（INV-08 不动）。

## 后果

- 工单组 SR2-AI-06~10：06 伴随进程文件协议（工具侧拾取/心跳/产物+应用侧 job
  写入与状态轮询）→07 回灌导入器→08 笔记面板 AI 面（分节显示+七问分色+只读+
  「正在读」状态行+按钮）∥09 AI 标注渲染对等（同管线+三层防线验收）→10 设置页
  zcode 联动（依赖 06 心跳协议）。
- ai-module-plan §2.1 DDL 同步修订（question 列）。
- 新不变量 INV-19/20/21 预登记 docs/invariants.md（未锚定，随工单锚定）。
