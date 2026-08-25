# AI 模块业务功能重述核实与方案调研（2026-08-25，待用户裁决）

> 背景：用户重新描述 AI 模块业务功能（四条），要求逐条核实与既有裁决的一致性，
> 冲突点搜集解决方案后汇报供决策。本文=核实矩阵 + 问题清单（P1~P6）+ 方案选项
> + 调研成果 + 决策点（E1~E7）。**全部待裁决，未改动任何已冻结契约**；裁决后
> 再动 ADR/ROADMAP/工单。对照系：蓝图 B0 §4.1（D1-D6）/ADR-0011 v1.1/
> ai-module-plan v1.1/ai-plan-review（R1~R14）。

## 1. 结论摘要

四条描述与既有体系的真实关系：

1. **第 1 条（链条+三读+梳理）**：与蓝图基本一致；唯一冲突=「绘制发展脉络**拓扑图**」
   ——D5 当时裁决为 md 线性时间线，图形态被明确推迟到 P8+ 独立决策项。本次重述
   实质是把该决策项**提前并选定为图形态**（合法的 B3 增量裁决，需正式落档）。
2. **第 2 条（应用内 AI 按钮/进度/笔记显示）**：与 D2b 架构铁律**正面冲突**（三面：
   触发面/出网面/回灌面）。这是四条中唯一的架构级冲突，有四个候选方案（§3 P1）。
   「导出含 AI 输出」一面**已兼容**（ADR-0011 v1.1 的 [ai:*] 段装配）。
3. **第 3 条（时间序树状图）**：无冲突（新需求），算法与先例调研见 §4，零新依赖
   可行。
4. **第 4 条（图交互+跳转+手工编辑保存）**：无架构冲突，但有两个硬依赖
   （P7-C 片段笔记锚定、ai_notes 回灌）与一个接缝（退出拦截聚合面）。

## 2. 逐条核实矩阵

| 用户描述 | 既有裁决/文档 | 结论 | 证据指针 |
| --- | --- | --- | --- |
| zcode-插件工具-软件内接口-文献 | 蓝图 §2：zcode→梳理子智能体→三孙智能体→语料池；tools/ai-sensor=zcode 技能 | ✅ 一致 | blueprint §1①/§2 |
| 孙智能体三审读文献抓重点 | D1 全量三读；ai_notes.role 三值（first-read/second-read/adjudicate）；七问 Q1=核心 idea 必答+锚定 | ✅ 一致 | blueprint §4.1 D1、§4.2 |
| 子智能体读取核心笔记（AI+人工都读） | D3 分层消费（二阶=corpus 标记+笔记语料）+D2 用户笔记计入高质量语料 | ✅ 一致 | blueprint §4.1 D2/D3 |
| 并**绘制发展脉络拓扑图** | D5=md 线性时间线多路推进；「拖拽标记引入轻量脉络编辑面——记 **P8+ 独立决策项**（v1 md 兜底）」 | ⚠️ 形态冲突：需 D5 修订+负面清单边界重裁（E3/E5） | blueprint §4.1 D5、ROADMAP P8+ |
| zcode 会话读报告+自调工具看各层级语料+对接用户 | 蓝图 §1①（zcode 任务本体阅读脉络/派发/对接）；五件套+INTERFACE.md 即工具说明书 | ✅ 一致 | blueprint §1、ADR-0011 |
| 笔记 tab 增「AI 读文献」按钮，点击显示进行中直到写完 | D2b：**应用侧零 AI 配置 UI+零 LLM 出网**；「激活=zcode 工具检测语料目录就绪，应用不自动触发」；ai-plan §2.1「写入只经应用 IPC（**未来 AI-6 若需回灌再立项**，v1 工具侧语料落 corpus-ai/，应用导入器不做）」 | ❌ 三面冲突（触发/出网/回灌）→ P1/P2 | blueprint §4.1 D2b、ai-module-plan §2.1 |
| AI 写的笔记在笔记 tab 显示 | ai_notes 有表无读面无写面（v1 无生产者声明）；笔记面=P7-C 三栏之「笔记」面板 | ❌ 需 AI-6 提前+读通道+UI（P2/P3） | ADR-0011 v1.1 修订 1 |
| 导出笔记时 AI 输出也导出 | ADR-0011 v1.1：corpus md 装配 [ai:*] 段（三读分节） | ✅ 已兼容；若指读书报告（export/report）则为其装配扩展读 ai_notes（小条款） | ADR-0011 正文结构③+v1.1 |
| 脉络图上下=时间序、树状、抓核心 idea | 新需求；D5 的「多路推进」=时间树的自然表达 | ✅ 无冲突，见 §4 调研 | —— |
| 节点显示简要信息+核心 idea；点击看笔记（AI+人工） | 数据可得（papers 元信息+ai_notes Q1+notes）；需图→笔记侧板 UI（P4） | ✅ 可行 | —— |
| 双击笔记文段块跳阅读器定位段落 | ai_notes 自持 quote/prefix/suffix+anchor_page（DDL 已设计）→verifyQuote 重锚既有路径；**人工片段笔记锚定依赖 P7-C**；论文级总评无锚（降级=仅开篇不定位）；跨视图打开=open-paper-bus 既有闩锁 | ✅ 可行，两个前置（P6） | ai-module-plan §2.1、open-paper-bus.ts、annotation-anchor.ts:130 |
| 图可手工调位置与逻辑线，保存逻辑同标注/笔记 | autosave-first 语义（INV-04 同型）+脏态投影；**接缝**：退出拦截（TABS-04 useTabDirtyAggregate）聚合面需扩图视图 | ✅ 可行，一个接缝（P5） | invariants INV-04、tab-dirty.ts |

## 3. 问题清单与方案选项

### P1 AI 调用发起点（第 2 条核心冲突——四案对比）

| 方案 | 机制 | D2b 兼容 | 安全面变化 | UX | 复杂度 |
| --- | --- | --- | --- | --- | --- |
| A 应用直连 | main/renderer 直接调 LLM API | ❌ 推翻 | **新增出网 host**（api.deepseek.com 等）入白名单=ADR+[locked-change]+INV-08 改；API key 进应用（新机密面） | 最好 | 中（编排全入应用） |
| **B' 伴随进程+文件协议（推荐）** | 应用按钮→写任务请求文件（userData/语料目录）；sidecar（zcode 技能或 `node tools/ai-sensor/` 手动拉起）轮询执行三读；产物落 corpus-ai/ + 状态文件；应用轮询状态文件驱动「正在读」显示，完成后导入 | ✅ 保持（应用零 LLM 出网；激活仍手动=按钮点击） | **零**（纯本地文件 IO；无新 host 无 localhost 口） | 好（sidecar 在跑时完整；未跑时提示「请在 zcode 启动工具」——与第 1 条 zcode 编排愿景自洽） | 低-中（复用 queue 幂等；加请求/状态两个文件协议） |
| C 纯文件握手（无按钮语义） | 同 B' 但无 sidecar 常驻，靠 zcode 会话内工具扫描 | ✅ | 零 | 一般（触发不及时） | 低 |
| D utilityProcess 自含 | Electron utilityProcess.fork 打包内置 worker，三读在子进程跑，MessagePort IPC | ❌ 字面违反（出网自应用进程族） | 同 A（host+key 面）+打包内置 worker | 最好（永远可用） | 高（worker 入打包产物+测试面翻倍；「传感器/工具双面」架构塌缩为单面） |

推荐 B'：安全面零变化、与 D2b 及第 1 条 zcode 编排愿景自洽、复用 queue.mjs 幂等机制；
D 作为 P8+ 升级项保留（若「zcode 不在跑也要能读」成为硬需求再立项）。注：Electron
官方 utilityProcess 文档确认其为 child_process.fork 的 Electron 等价物——D 技术可行，
争议只在安全面与架构边界。

### P2 AI 笔记回灌路径（AI-6 提前，四案通用前置）

推荐：**文件导入器**——工具侧产物（corpus-ai/<paperId>.json|md，含 role/model/quote
三元组/anchor_page/content_md）→ 应用导入器（新 IPC 通道 ai-notes/import）解析校验
→ 写 ai_notes（写入仍「只经应用 IPC」，D3 语义保持；工具永不碰 DB）。拒绝方案：
sidecar 直连应用 localhost 写入（应用侧起监听=新网络面）。

### P3 笔记 tab AI 面（读通道+UI）

- 新读通道 ai-notes/list（api-surface 受锁 [locked-change]）；
- 笔记面板分节显示：[user] 总评/片段 ∥ [ai:一读]/[ai:二读]/[ai:裁决]（「同一段话
  三段 AI 语料」=愿景 §1 原话的落地形态）；文段块携带锚定态标记（可跳转/仅页码/无锚）。
- 「正在读」状态行：轮询状态文件（B'）→ 篇级 pending→done 翻转。

### P4 脉络图形态（第 3/4 条）——调研结论见 §4

推荐：v1=**时间树**（y=年份分层，x=Reingold-Tilford 整序；节点单父；跨支逻辑线留
v2 的 DAG 形态）。梳理智能体输出从「md 时间线」改为**结构化 lineage JSON 草稿**
（节点=文献 id/标题/年份/核心 idea，边=主要继承关系）→ 应用导入 → 图上人工修订
（策展边，非自动引文边）。不做 md 中间形态（防两套方案并存红线）。

### P5 图数据模型与持久化（若 E3 通过）

迁移 004：lineage_nodes（id/paper_id 可空纯主题节点/title/core_idea/year/x/y 手工
位置覆盖，NULL=自动布局）+ lineage_edges（from/to/label，UNIQUE(from,to)）；树约束
（每节点≤1 父）service 层不变量+单测。保存语义对齐 INV-04（autosave+失败不推进
savedAt+脏点投影）；**接缝**：quit-dirty 聚合（TABS-04 的 useTabDirtyAggregate）需
扩图视图脏态——TABS-04 工单头注不改（其范围已冻结），图视图工单自带聚合扩展。
手工位置持久化先例=JSON Canvas（Obsidian 开放格式：节点 x/y/宽高+边引用直存 JSON，
MIT 开放规范）。

### P6 锚点跳转的两个前置

① 人工片段笔记的锚=P7-C（α 层）交付物；② ai_notes 三元组重锚=verifyQuote 既有
路径的泛化入口（pending anchor → 定位页 → 重锚 → 滚动+闪烁）；重锚失败降级=跳
anchor_page+提示。总评（论文级）双击=仅打开文献。

## 4. 调研：脉络图逻辑与算法（第 3 条「广泛搜集信息」）

**先例**（学术工具三强）：Litmaps=**时间线+跨时间引用弧**（与本需求「上下=时间序+
逻辑线」最贴近）；ResearchRabbit=网络+时间线双视图；Connected Papers=无序相似度图
（与时间序诉求不符，不采）。结论：时间轴+有向连线是学术脉络展示的主流成熟形态，
本需求=其「人工策展核心 idea」变体。

**算法**：
- 树（推荐 v1）：**Reingold-Tilford tidy tree**——1981 经典，线性时间，两趟扫描
  （后序定子树轮廓+前序分配 x），~百行可零依赖手写；SVG 渲染天然适配（D3 的 tree
  布局即此算法，但 D3 不可引入——零新依赖红线，自写）。
- DAG（v2 跨支线）：**Sugiyama 框架**四步——去环→分层（本需求 y=年份天然分层，
  免算法分层）→层内序交叉最小化（barycenter 启发式：按邻层邻居均值排序，上下扫
  3~4 趟）→坐标分配。复杂度高一个量级，且 NP-hard 部分仅近似——v1 不做。
- 手工编辑：默认布局+位置覆盖持久化（JSON Canvas 模式）；拖拽/加边/删边/改父=
  即时操作+debounce 保存（notes autosave 同型）；SVG 画布 pan/zoom（滚轮+拖拽，
  INV-14 成对注册）。

**跳转联动**：节点点击→侧板笔记（复用 notes 读+新 ai-notes/list）；文段块双击→
open-paper-bus 跨视图闩锁（既有）+pending anchor 泛化（新）。

## 5. 决策点（请逐项裁决；每项已给推荐默认）

| # | 决策 | 选项（推荐加粗） | 影响 |
| --- | --- | --- | --- |
| E1 | AI 调用发起点 | **B' 伴随进程+文件协议** / A 应用直连 / D utilityProcess 自含 | 定 P1；A/D 需 ADR+白名单+密钥管理（E7） |
| E2 | 回灌路径 | **文件导入器（ai-notes/import IPC）** / 拒绝侧车直写 | AI-6 提前立项 |
| E3 | 脉络图形态 | **v1 时间树（单父）+v2 跨支 DAG** / 直上 DAG / md 过渡 | D5 修订；梳理输出改 lineage JSON |
| E4 | 图归属面 | **新顶层视图「脉络」**（App 导航第四项）/ 库侧子面板 | 跨文献全局面，顶层视图语义正 |
| E5 | 负面清单边界重裁 | **「人工策展的核心 idea 时间树（AI 起草+人工修订）合法；自动引文网络图维持不做」**；ADR-0012（自动引文图数据模型）维持暂不做，lineage 另立 **ADR-0014** | 宪法级边界修订须明文 |
| E6 | 排序 | **P7-B 收官→P7-C→AI-01~05（基座不变）→AI-6 组（回灌+笔记面+按钮）→脉络组 LG-01~05（模型/布局/交互编辑/侧板跳转/e2e）** | 脉络依赖 AI 语料与 P7-C 锚定，必须后置 |
| E7 | 密钥管理（仅 E1=A/D 时） | B' 下 **key 留 tools/ai-sensor/config.json（gitignore）零应用改动**；A/D 下 Electron safeStorage 加密落库 vs settings 明文（单人本地应用风险声明） | 安全面 |

## 6. 影响面预告（裁决通过后）

- 文档：蓝图 §4.1 增补裁决 E1~E7；D5 修订注记；ADR-0014 新建（lineage 数据模型+
  图形态边界）；ADR-0011 视 E2 增 ai-notes 导入契约小节（或独立 ADR）；ROADMAP 增
  P7-H 节（脉络图）+P7-G 增补（AI-6 组）；AGENTS 负面清单措辞随 E5 修订。
- 工单：AI-6x 组 3~4 张（导入器/读通道/笔记面板 AI 面/按钮+状态）；LG 组 5 张。
- 不变量预告（随工单登记）：lineage 树约束、图编辑自动保存语义、退出聚合扩面、
  （若 A/D）LLM host 白名单与密钥面。
- 已定稿不受影响：五件套导出、三读队列骨架、七问、ai_notes DDL（v1 无生产者
  声明将由 AI-6 解除）、CorpusExtractor、manifest 协议（INV-16~18）全部维持。

## 7. 调研来源

- Litmaps/ResearchRabbit/Connected Papers 对比：[effortlessacademic 2025 对比文](https://effortlessacademic.com/litmaps-vs-researchrabbit-vs-connected-papers-the-best-literature-review-tool-in-2025/)、[Ocean of Papers 2026 综述](https://www.oceanofpapers.com/blog/best-literature-mapping-tools)、[IntuitionLabs 指南](https://intuitionlabs.ai/articles/ai-literature-mapping-tools-guide)
- Reingold-Tilford：[D3 官方 tree 组件](https://observablehq.com/@d3/tree-component@257)、[TDS 算法走读](https://towardsdatascience.com/reingold-tilford-algorithm-explained-with-walkthrough-be5810e8ed93/)、[线性时间变体](https://www.zxch3n.com/tidy/tidy/)
- Sugiyama：[Layered graph drawing（Wikipedia）](https://en.wikipedia.org/wiki/Layered_graph_drawing)、[yWorks 分层布局](https://www.yworks.com/pages/layered-graph-layout)、[barycenter 启发式经典论文](https://jgaa.info/index.php/jgaa/article/download/paper1/2965/2771)
- 手工布局持久化：[JSON Canvas 开放规范](https://jsoncanvas.org/)、[Obsidian 官方公告](https://obsidian.md/blog/json-canvas/)
- utilityProcess（D 案技术依据）：[Electron 官方文档](https://electronjs.org/docs/latest/api/utility-process)
