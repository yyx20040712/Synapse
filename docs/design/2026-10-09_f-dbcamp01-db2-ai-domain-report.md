# F-DBCAMP-01 DB-2 起序·AI 域技术细节专项汇报（呈裁件）

> 义务承载：v166 §3-2 定义「AI 域技术细节专项汇报待用户（DB-2 开工时呈）」；v169 §1.1
> 定为本批单件。本档=设计链（拟定者→对抗审核者→主控终裁，两轮）+DB-2 首动作实测的
> 合成呈裁稿。呈裁项见 §5（7 项）；全链证据与设计稿全文指针见 §7。
> 立档：2026-10-09 凌晨（夜间自治场）；裁定后 020 实施单元按本档 §6 开工。

## §1 范围与读法

五项细裁（v169 §1.1）=会话 50 条上限 / 记忆知识库化分类 schema / 按需分级检索组装+
初始预算下调实测校准 / 软件层代理化 / trigram 门+LIKE 回退。本文每项给出：用户裁决
原文要义 → 终案要点（含关键 DDL/机制）→ 预裁点清单（主控已定、可否决）。需要用户
拍板的 7 项集中在 §5，每项均给推荐+备选。

## §2 DB-2 首动作实测：trigram 门（已完成，事实在案）

**方法**：内存库（better-sqlite3 13.0.3/SQLite 3.53.4）建 FTS5 trigram 表，固定语料
fixture 32 行（锚词唯一），查询类集 5 类×≥3 例，FTS5 MATCH 与应用层 LIKE 两路对照，
以精确子串扫描为真值；另测 <3 字符边界 7 例、大小写 6 例、LIKE 性能（10,000 行中文、
3 轮取中位）。共 35 项实测（构成=20 矩阵类例+7 短查询+6 大小写+2 性能计时，各 3
轮取中位），一轮终局。

**结果矩阵**：

| 查询类 | FTS5 MATCH | LIKE '%…%' | 结论 |
| --- | --- | --- | --- |
| 单字中文（3 例） | 0 命中（静默，无报错） | 全部=真值 | MATCH 不可用→回退 |
| 二字中文（4 例） | 0 命中（静默） | 全部=真值 | MATCH 不可用→回退 |
| ≥3 字中文（5 例） | =真值 | =真值 | 两路可用 |
| 英文子串（4 例） | 3 例=真值+1 例大小写折叠 | 同左（两路行为一致） | 两路可用 |
| 混排子串（4 例） | =真值 | =真值 | 两路可用 |

**边界事实**：<3 字符查询 MATCH **静默零命中且不抛错**（7/7——回退实现用「长度前置
判断」即可，不需要 try/catch）；ASCII 大小写 MATCH/LIKE 两路同折叠（大小写敏感的
精确检索两路均不提供——记为已知偏差，已拟 invariants 落档句）；LIKE 10k 行内存中位
**0.48 ms**（单人规模完全可承受）。

**门判定**：单字/二字中文类不过→该两类启用 LIKE 回退；≥3 字中文/英文/混排类通过。
终稿规格（§3.E）：有效长度（码点计）=0→直接空召回标注；1-2→LIKE 路（转义 `\ % _`
三字符+ESCAPE 子句）；≥3→MATCH 路（沿用 001 的 escapeFtsQuery 双引号短语包裹）；
两路排序同口径 (updated_at DESC, id DESC)、topK=8、两路互斥前置路由。

## §3 五项细裁终案

### 3.A 会话 50 条软上限（执行语义）

裁决要义：「软上限 200→50 条（再多就面临严重的上下文污染）；置顶永不淘汰/管理面板/
全置顶拒写沿承。」

终案要点：
- **计数单位=消息行**（user/assistant 各 1 条；任务结果摘要以 assistant 行计入；
  system 提示不入表）。
- **写时同步淘汰**（单事务）：`excess = COUNT(*)+1-50`；excess≤0 直插；否则汰最旧
  非置顶 excess 行；**可汰行不足即拒写**（typed error `SESSION_CAP_ALL_PINNED` 带
  pinnedCount，UI 引导去管理面板取消置顶），事务回滚零副作用。
- 边界态机 5 态全枚举（含 200 时代存量 >50 的收敛路径：下次写入多汰至 ≤50，读路径
  零副作用）；置顶操作本身不设上限（单一规则，pin 满自然落入拒写态）。
- 与摘录函数交互：**装配尾段=最近消息按新到旧装入至消息窗分配上限（500 tok，
  尾段总预算 1000 的分配见 §3.C）**；「50」=存储/淘汰上限，非装配全量；字节相等
  契约限前缀（淘汰不触发前缀缓存失效）。
- DDL：`ai_sessions`（scope+anchor 多态 CHECK）/`ai_messages`（role/user/assistant、
  pinned、CASCADE）；执行语义全在服务层（repos 原语 `insertWithEviction`）——政策
  不进触发器（保持单一真相源+typed error 面）。

预裁点：计数单位=消息行；pin 无上限；时间戳列型跟 001 实照。

### 3.B 记忆知识库化（ai_memory 分类 schema）

裁决要义：「记忆=分门别类知识库路线（分类组织，非平面堆叠）。」

终案要点：
- **双层分类法**：`category` 固定枚举（**裁定②：三档各自分类体系**——清单以市面
  skills 调研〔读文献类+产品辅助类〕为输入另行拟定呈裁=**020 开工前置门**；本节
  原单一 8 类案作废留档）+`label` 单值用户标签
  （不进骨架不进缓存键，仅展示过滤与检索命中）；骨架只看 category=确定性保留。
- **归属=单点归属+三档完全隔离**（裁定①：采 A 但撤销并集案）：每行属唯一
  (scope,anchor)；可见性=**仅本档本锚行**，global 行不对文献/脉络档注入。
  **global 档重定位（裁定①）**=助手任务域能力域——「帮用户干活安排任务用，不管
  具体研究内容」（软件功能介绍/本地接口调用/自动化任务安排），不承载研究内容。
- DDL：category CHECK / label / title（1-120 字）/ content / scope+anchor CHECK /
  pinned / origin(manual|agent) / source_task_id（SET NULL）/(created_at,updated_at)；
  索引 (scope,anchor,category,pinned,updated_at,id)。
- **FTS=external content+三触发器**（沿 001 先例）+tokenizer=trigram；文献域 unicode61
  不动（两域分治，防顺手统一）。
- 淘汰沿承（置顶豁免；victim (pinned,updated_at,id) ASC），本档仅保列/索引支撑。

预裁点：双层分类法结构；label 单值化（多值按 Rule of Three 延后）；origin 列；
external content 选型。

### 3.C 按需分级检索组装+预算下调

裁决要义：「知识库式：初始注入小预算骨架，对话中按需逐级检索展开；初始 token 预算
下调（原 6k/8k/4k 为上限保留，具体数值 DB-2 实测校准）。」

终案要点——**三级结构**：
- **L1 骨架**（常驻，体积有界）：锚摘要+记忆标题索引（**本档分类**×[计数+置顶标题
  top-3+最近 3 标题]——分类集待②定稿；**裁定①后各档仅索引本档记忆**；置顶超出按
  (updated_at,id) 取前 3，全置顶场景骨架仍有界）+能力清单（仅
  global 档，含任务派发说明）。
- **L2 结构摘录**（限额片断）：**片=单行摘录**（行内容经估计器截断至 120 tok=片 cap；
  片为原子单位，预算溢出整片舍弃+meta 标注，不截半片）；每源=锚过滤后按排序键取
  top-K，配额=上限非填充义务（实际片数=min(配额,锚过滤行数)）。排序键三型：有
  updated_at 表=(updated_at,id)；tags/collections/paper_tags=(id)；lineage_graph_meta
  =(updated_at,key)。锚过滤：paper 档=本锚行/本锚笔记/本锚标注/联到本锚的标签/
  **文件夹=经 papers.folder_id 一跳解析的 collections 行（folder_id 为 NULL→空片，
  配额=上限语义自然吸收）**；lineage 档=锚图节点/两端属锚图的边/节点集论文去重/
  节点集论文笔记/锚文件夹（恒 1 行）。
  （lineage 档注入「节点文献笔记」——notes 表两档共用、按锚过滤，跨档内容可见性如
  是。）
- **L3 消息相关检索**（现算，不入前缀不入缓存键）：①系统自动尾段=当前消息经 §2 路由
  召回 topK=8（**裁定①后：检索域=当前档隔离可见集；global 档=助手域记忆**）；②代理按需检索=经任务系统提交只读动作（目标规则见 §3.D），结果以
  assistant 行落库（计入 50 上限）。**尾段 1000 tok 内分配=消息窗保底 500+召回上限
  300+代理结果上限 200**（装入序=消息窗→召回→代理结果——保底保证对话连续性、召回
  上限保证「消息相关尾段」恒有出现机会；皆初值随校准调）。
- L1+L2=前缀（可缓存，同键字节相等）；缓存键=(scope,anchor_id,ctx_ver)。

**预算表（初值，校准后调）**：

| 档 | 上限 | L1 估算/cap | L2 片数×120 | L2 估算/cap | 尾段/轮 cap | 常驻估算 |
| --- | --- | --- | --- | --- | --- | --- |
| paper | 8k | ≈620/800 | 15 片（笔记5/标注4/标签3/元数据2/文件夹名1） | 1800/2200 | 1000 | ≈2420 |
| lineage | 6k | ≈1500/2400（含**全图序列化**——用户新指令，见下） | 13 片（节点4/边3/图元2/文献2/笔记1/文件夹名1——优先补序列化截断的溢出） | 1560/1600 | 1000 | ≈3060 |
| global | 4k | ≈520/600 | 8 片（记忆 8 类×top-1） | 960/1200 | 1000 | ≈1480 |

常驻起步=上限的 30-51%（paper/global 30-37%、**lineage 51%——全图序列化所致**
〔用户指令〕）；**预算经设置页可调（裁定③）**——三档上限与
各级分配为设置项默认值（新增设置面）；代理检索拉取单发≤800、轮合计≤2000（独立子
预算，超出截断+meta 标注）。**校准协议**：估计器 estimateTokens=cjk×a+other×b（初值
a=1.0/b=0.25），代表性语料（中英混排笔记/标注/记忆各≥20 样本）对照目标分词器，偏差
>20% 调系数；校准输出项含**片 cap/配额余量复核**（lineage 估算 1560/cap 1600 偏满，
  校准后按实测均值调片 cap 或配额）；校准脚本入 scripts/（受锁面），结果落 docs。空
召回/截断处附 meta 块。

**lineage 档 L1 特化——脉络整体序列化（用户指令 2026-10-09 晨二轮）**：锚摘要升级为
**全图紧凑序列化**：全节点（title+core idea+is_starred 星标）+全边（from→to+label
连线名称+kind）+图元 meta，文本序列化入 L1（可缓存——仅依赖 epoch 集合表）。大图
护栏：节点>60 时截断（星标与高连接度优先）+meta 标注（阈值=预裁初值）。预算重分配
=档内（L1 cap 800→2400；档上限 6k 不变——裁定③映射不动）。

**脉络更新与记忆跟进口径（用户问，2026-10-09）**：①**AI 所见脉络恒新**——节点/边/
图元/星标任何变更经 epoch 触发器→ctx_ver 前进→前缀缓存自动失效→下次对话注入新版
全图（星标翻转、连线改名即时生效——papers/lineage_edges 均在 epoch 集合，§3.F）；
②**记忆内容陈旧不自动删改**——图=事实源（注入在前）、记忆=观点层（在后），AI 以图
为准；对话中发现记忆与图矛盾时代理可提议 memory.update/memory.delete（白名单内）
处置；③**branch_summary 滚动综述**=v1 轻量刷新纪律（不建 per-memory epoch 列，靠
对话内提醒；若需硬提示〔如图变更徽标〕另呈裁）。

预裁点：三级结构；片配额算术；系数 a/b 初值；topK=8；L1 每类 3 标题。

### 3.D 软件层代理化（ai_tasks 任务模型/权限围栏/审计）

裁决要义：「第三档=代理层可发任务，权限仅限管理 paper/lineage 两档 AI 资源，无文献
域写权限之外的能力；global 档能力清单→能力+任务派发。」

终案要点：
- **唯一执行信道**：代理一切动作经 ai_tasks 静态 dispatch 表执行（无「模型直调
  handler」第二信道）；global 档全库记忆检索=系统自动尾段路径（非代理动作）。
- **9 动作白名单**：memory.create/update/delete/pin/unpin/search/list +
  message.pin/unpin。三闸提交校验：DDL CHECK 枚举+json_valid+payload 字段白名单
  schema（每动作一份，与 handler 相邻定义）；服务层白名单常量=DDL 枚举=dispatch
  键集三方对齐断言（防漂移）。
- **目标围栏（读写分句）**：写目标=任务行目标（围栏校验+审计）——task.scope/anchor
  默认继承 dispatching session 的 (scope,anchor)，**global 档会话必须显式声明目标**
  （此即裁决④「global 档能力+任务派发」的实现路径；目标校验=anchor 存在性，映射见
  §3.F）；跨锚任务合法（围栏=档级非锚
  级），逐条审计（target_resolved 含目标描述符）；global 资源为目标=拒（用户专属）。
  读可见集=D1 并集谓词（本锚∪global 行；**「本锚」一律指任务目标锚**——
  memory.search/list 的检索可见集断言口径）——两规则并存，实现与测试分别断言。
  message.* 仅可操作本任务会话消息。
  拒绝面（结构性不存在代码路径）：文献域一切写、文件系统、网络、白名单外 host、
  任务自改、审计删改。
- **状态机**（6 态）：queued→running→{succeeded|failed|timeout}；queued→cancelled；
  running 不可取消（v1）。迁移守卫更新（影响行数=0 即拒）。**超时原子性**：mutation
  段 SAVEPOINT 包裹，超时=全部回滚+独立小事务写 timeout 终态——**timeout 零副作用
  承诺**。**崩溃恢复**：启动扫描 running→failed(interrupted)（同步事务崩溃即未提交
  =天然零副作用）；结果回写与终态迁移同事务（无中间窗口）；**成功路径拒写分支**：
  结果回写遇 SESSION_CAP_ALL_PINNED→结果转审计 detail+任务仍迁移 succeeded（不
  abort 事务）。幂等键 UNIQUE+冲突返回既有行。
- **审计**（append-only）：每迁移一行+权限决策行+mutated 行（before/after 摘要截断
  200 字符）；(task_id,seq) 严格递增。**裁定④=G2 触发器级**（库级禁改禁删审计行；
  触发器对⑥级联路径的放行面随 020 设计定）。
- **删除政策（裁定⑥=B 案）**：**随锚级联删除+两次确认**——删论文/脉络图经两次确认
  后级联删除该锚全部 AI 资源（sessions/messages/memory）；消息随会话 CASCADE；
  记忆的来源任务引用 SET NULL。**待解点（020 设计）**：级联删除与 G2 审计
  append-only 的相容性（候选：审计行随锚级联一并删〔G2 触发器为级联路径放行〕或
  任务行保留 tombstone——随批设计定）。
- UI 最小面：会话内任务卡（状态/结果/错误）+审计抽屉+queued 取消+管理面板任务 Tab；
  renderer 经 window.api 三入口。

预裁点：通用任务表；9 动作；6 态机；running 不可取消；摘要粒度；UI 最小面。

### 3.E trigram 门+LIKE 回退终稿

见 §2。补充规格：LIKE 路转义 `\ % _`+ESCAPE '\'；MATCH 路沿用 escapeFtsQuery；
检索 SQL 一律叠加可见性谓词（**裁定①后=三档隔离**：本档本锚；global 档=global 行
全集）；大小写偏差句拟入
docs/invariants.md；性能口径=informational（超 50ms 日志告警，不设硬断言防 CI 抖动）。预裁点：路由实现/
escapeLike 助手/external content 选型/排序同口径/topK=8/性能口径。

### 3.F epoch 机制（020 基建，物理实照修正后）

INV-J（注入面⊆epoch 集合）落地：**集合=10 张物理表**——papers/collections/tags/
paper_tags/notes/annotations/lineage_graph_meta/lineage_nodes/lineage_edges/ai_memory
（新）。每表 3 触发器（I/U/D，UPSERT 自愈：缺行即建、冲突 epoch+1）+播种 10 行
epoch=0；新增触发器合计 33（9 既有表×3+ai_memory epoch 3+ai_memory FTS 3）。「集合
表↔触发器↔计数行」三一致元测试+逐表 I/U/D 递增断言；与既有 FTS 触发器/domain_guard
同表并存（无顺序假设）。ai_sessions/ai_messages/ai_tasks/ai_task_audit 不入集合（消
息=现算尾段；任务/审计不进 prompt；会话行不进前缀）。

**锚语义（实照定案）**：scope='paper'→papers.id；scope='lineage'→**collections.id**
（folder↔graph 结构性投影，ADR-0025 口径——lineage_nodes.folder_id→collections.id
外键实照支撑，节点经 folder_id 归图）；L1 锚摘要（lineage 档）=文件夹名+节点数+
core idea 标题列（lineage_nodes.core_idea 列实照存在）。

## §4 实照偏差呈报（本场新发现，4 项）

设计书 §5.a 对照表按逻辑概念写就；本场对 001-019 迁移做了物理实照探针（内存库按序
应用+schema 遍历），发现：

1. **命名漂移**：「folders」物理=collections 表（papers/tags 的 folder_id 均指向
   collections.id）；「lineage_graphs」物理=lineage_graph_meta（key-value 元数据表）；
   「ref_edges」物理=lineage_edges。影响=epoch 集合/L2 片配额按物理名修正（本档 §3.F
   已按物理名落定；**lineage 档锚已定案=collections.id**——节点 folder_id 外键实照
   支撑，见 §3.F）。
2. **集合挂接缺口**：**paper_collections 无实体表**——注入面「集合名」来源无物理
   载体（集合↔文献挂接未建模）。**裁定⑧=集合无语义，删除**——注入面永久除名，
   不另立票建模（L2 片配额维持 17→15 的调整）。
3. **ai_notes 存量面**：003 迁移已有 ai_notes 表（paper/annotation 锚定的划线问答：
   role/question/model/quote 上下文/content_md）。新 sessions/messages 表族与其关系
   =§5-⑦呈裁（推荐共存，020 不迁移）。
4. **排序键适配（4 表）**：tags/collections/paper_tags 无 updated_at→按 (id) 序
   （语义损失：改名不升序，入偏差登记措辞）；lineage_graph_meta 有 updated_at 无 id
   （KV 表，主键=key）→按 (updated_at,key) 序。冻结摘录函数的「(updated_at,id) 序」
   在这 4 表按上述适配执行（避免 020 触碰存量表，保持纯新增面）。偏差拟随批记入
   docs/invariants.md 注记。

## §5 呈裁清单（7 项——请逐项拍板，标注推荐）

| # | 事项 | 推荐 | 备选 | 影响面 |
| --- | --- | --- | --- | --- |
| ① | 记忆归属语义 | 单点归属+可见性并集（「全局记忆对所有文献可见」） | 跨档共享多对多 | 管理面板文案/检索谓词/淘汰计数 |
| ② | 记忆 8 类种子清单 | preference/project_context/method_note/reading_insight/term_glossary/writing_material/fact_dossier/task_outcome | 改类名/增删类（改=迁移+锁定变更） | 用户日常存取分类（CHECK 固化） |
| ③ | 预算上限↔档映射 | 8k=paper/6k=lineage/4k=global（按来源面宽度） | 其他映射 | 三档初始注入预算 |
| ④ | 审计强度 | G1 约定级（仅 insert 入口；摘要 200 字符截断=取证边界：已删行不可全量回溯） | G2 触发器级（禁改禁删，不改变取证边界） | 审计可信级别 vs SQL 面增量 |
| ⑤ | 代理确认门 | 无门：白名单内自动执行+全程审计+可追溯 | 逐任务人工确认 | 自动化程度 vs 信任 |
| ⑥ | 锚删除政策 | RESTRICT：有 AI 资源的论文/脉络图拒删（与设计书 N8「文件夹 app 级拒删非空」推荐口径同构——该口径 DB-4 落地） | 随锚级联删除该锚会话/消息/记忆 | 数据安全 vs 清理便利 |
| ⑦ | ai_notes 归一 | 共存：ai_notes=划线问答特化面（现状不动），sessions/messages=三档通用对话新面（附：现有划线问答不进入新会话上下文，除非裁归一） | 020 一并归一迁移（迁移面+受锁测试面膨胀） | 020 规模/现有功能 |

⑤射程说明：确认门若选「逐任务确认」，仅涉任务类写动作；系统自动检索（L3①）不在门内。

### §5-裁 裁定落档（2026-10-09 08:21 晨，逐字原文=账本 ruling 行）

| # | 裁定 | 落档动作/设计增量 |
| --- | --- | --- |
| ① | A（单点归属），但**三档完全独立**——全局记忆不对所有文献可见；global 档=助手任务域能力域（软件功能/本地接口/自动化安排），不载研究内容 | 撤销可见性并集：检索谓词/L1 索引/可见性测试全改隔离口径（§3.B/§3.C/§3.E 已随裁修订） |
| ② | **三档各自分类体系**；清单以市面 skills 调研（读文献类+产品辅助类）为输入另行拟定呈裁 | 原 8 类案作废留档；**分类定稿=020 开工前置门**（§6） |
| ③ | 采推荐映射（8k/6k/4k）+**设置页可调** | 新增预算设置面（020/后续承载） |
| ④ | **G2 触发器级审计** | 禁改禁删审计行；对⑥级联路径的放行面=020 设计点 |
| ⑤ | **A 无门自动执行** | 白名单 9 动作全保留（含 memory.delete——未采移除变体） |
| ⑥ | **B 随锚级联删除+两次确认** | RESTRICT 起草作废；级联与 G2 审计 append-only 相容性=020 设计待解点（§3.D） |
| ⑦ | 共存+定位：划线问答=**AI 评估与建议的笔记本体，数据类型属笔记域**，与消息/记忆独立 | ai_notes 不并三新表；与 notes 注入面的关系=020 设计细节 |
| ⑧ | backlog 三裁：**集合无语义删除**；**DRAGREMOUNT=数据面完成后**；**指纹门立票** | 集合除名（§4.2）；排期入 v170；F-REQFP-01 已立（registry） |
| ②终态（08:51 二轮） | **三档全采推荐**（paper 6 类/lineage 7 类/global 6 类）+task_outcome 仅 global+抽象化改写纪律 | 清单=仓外 taxonomy-proposal-v1.md 推荐案；020 设计轮经审核+终裁后随 DDL 冻结 |
| 新指令（08:51 二轮） | **lineage 注入=脉络整体**（含连线名称+星标）+记忆跟进问 | L1 全图序列化+档内预算重分配+大图护栏+跟进口径三款（§3.C 特化段） |

## §6 下一批预告（020 实施单元——本档裁定后开工）

范围：020 迁移（change_epochs+10 表 epoch 触发器+播种+5 张 AI 新表+ai_memory FTS）+
epoch 三一致/递增测试族+会话上限/检索路由/任务状态机/围栏/审计服务层+受锁测试面
succession+locks 流程。**开工前置门（裁定②）**：三档分类清单经 skills 调研定稿并
呈裁落定后方可冻结 ai_memory DDL。实施前置核对项：001 时间戳列型实照、change_epochs 列名、
graph_meta KV 键约定（键与锚的关联格式=运行期数据实照——若无锚约定可过滤则图元片
源退化空片+空召回 meta，不阻断装配）、迁移框架口径（up-only/user_version/单事务）。
锚语义已定案（§3.F：lineage 锚=collections.id）。

## §7 流程与证据

- 设计链：拟定者两轮（v1/v2）→对抗审核者两轮（r1 返工 B2/W9/N14→处置下达→v2；
  r2 返工 B1/W3/N7→主控终裁承接〔拟定者回炉 2/2 用尽，循设计书先例〕=终裁补遗
  12 条定案）→复核轮 r3→**用户裁定轮（2026-10-09 晨 8 点逐字入账本）——落档见
  §5-裁，正文矛盾点已随裁修订**。
- 实测：trigram 门探针 35 项（§2）；schema 实照探针（§4）。
- 证据档（仓外 scripts-audits/20261009-0100-db2open/）：设计稿 v1/v2、审核报告
  r1/r2/r3、主控修正层、**主控终裁补遗（12 条定案——020 实行包必随附本报告+补遗
  两件，防误读 v2 稿旧数）**、探针脚本与输出、账本行 JSON。
- 成本账本：.zcode/org-ledger.jsonl（本批行随收口补齐）。
