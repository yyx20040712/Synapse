# ADR-0014：lineage 图数据模型（人工策展时间树）

日期：2026-08-25 · 状态：已裁决——时间树已落地，后续演进并入正文（现行结构锚点=基线 DDL 与 invariants.md 对应 INV 条目）

关联：ADR-0012（自动引文图数据模型，维持暂不做）；ADR-0011（语料接口——梳理代理的输入面）；ADR-0015（AI 笔记回灌文件协议）；ADR-0021（文件夹单归属×图绑定）；ADR-0022（草稿导入链退役）。

## 背景

用户需求：「发展脉络拓扑图」——上下=时间序、树状、节点含简要信息与核心 idea、单击看笔记、双击跳阅读器、手工调节位置与逻辑线且保存逻辑同标注/笔记。此前裁决为 md 线性时间线（图形态记为后续独立决策项），本次用户将图形态提前并选定。负面清单「知识图谱/不做网络图可视化」与 ADR-0012（自动引用关系）的边界需一并辨析。

## 候选

- md 线性时间线（此前裁决）：非图形态，不满足拓扑图诉求。
- 时间树（v1）：每节点至多一个父，纵向时间分层、横向整序。
- 跨支 DAG（v2 预留）：一篇文献影响多条线（多父）。
- 自动引文网络图：负面清单排除（见「边界」）。

## 裁决

### 形态

- v1=时间树：纵向=年份分层；横向=树整序（线性时间、零依赖手写——第三方图形库禁引，零新依赖红线）；SVG 渲染（pan/zoom，输入接缝成对注册=INV-14）。
- 不做 md 时间线中间形态（防两套方案并存红线）；梳理代理的产物消费走 lineage.json 导出面（确定性口径=INV-77）。
- **后续演进（现行形态）**：v1 的树单父约束与边 kind 体系（tree/ref/manual→四值 tree/inferred/ref/manual）经用户裁决整体退役——现行边=manual 单基型、入边不限条数（「manual 不限条数」用户裁决；接缝：登记册 INV-27 仍按四 kind+树单父守卫登记为「已锚定」，与本现行裁决互斥——详见「数据模型」节接缝标注，待主控按受锁流程裁决登记册）；运行时守卫保留面=自环/悬空端点/跨图/重复边/成环/via 路点/端点锚校验。布局=年份/月份分层+月内 slot 槽位网格（INV-75、INV-SLOTGRID-01）；边携带视觉字段（dashed/color——线色双值口径=INV-108）与 via 路点、端点锚。
- v2=跨支 DAG 曾为预留升版方向（层内序交叉最小化）；多父放行后该预留不再有独立意义。
- AI 草稿导入协议（lineage JSON 草稿经文件协议导入后人工修订）曾是 v1 决策的一部分，该导入链已随 ADR-0022 退役（2026-09-30）。

### 边界

- **人工策展的核心 idea 时间树合法**（AI 起草+人工修订；边=策展边）；**自动引文网络图可视化维持不做**（负面清单措辞随此修订——现行 AGENTS.md 负面清单已注明人工策展的核心 idea 时间树不在此列）。
- ADR-0012（自动引用关系数据模型「暂不做」）维持：其对象是自动引文边；lineage 边是人工策展产物——两者不复用表。

### 数据模型

v1 初版 DDL 决策快照（应用层语义演进见下；现行 DDL 单源=src/main/db/migrations/026_baseline.sql——迁移链已压缩为基线单件，ADR-0030）：

```sql
CREATE TABLE lineage_nodes (
  id         TEXT PRIMARY KEY,            -- uuid
  paper_id   TEXT REFERENCES papers(id) ON DELETE CASCADE,  -- v1 可空=纯主题节点
  title      TEXT NOT NULL,
  core_idea  TEXT NOT NULL DEFAULT '',
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
  label      TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(from_node, to_node)
);
```

位置持久化=JSON Canvas 模式（开放格式先例：节点 x/y 直存 lineage_nodes 列）：手工拖拽=写 x/y 覆盖；重置自动布局=清空 x/y（NULL=自动布局）。现役 schema 同口径注记=src/shared/models/lineage.ts 节点 x/y 字段「手工位置覆盖（JSON Canvas 模式）；null=自动布局」。

非破坏性演进清单（现行状态；`UNIQUE(from_node, to_node)` 自 v1 原样不动）：

1. edges 加 `kind` 列：tree/ref/manual 三值→tree/inferred/ref/manual 四值→**现行退役为恒 'manual'**（shared schema 无 kind 字段，repo 写边界恒写 'manual'）；`sub` 列（子线型样式引用）随体系死置。
2. edges 加 `via`（边走线路点——校验单源 validateLineageVia）、`from_anchor`/`to_anchor`（端点锚）、`dashed`/`color`（视觉字段；设计单源=docs/design/2026-10-01_f-lineage02-routing-design-final.md）。
3. nodes 加 `month`（CHECK 1..12，NULL=未定月框）+`slot`（月内序的实现层承载——INV-75；排序契约/编号/导出确定性=INV-75/76/77）。
4. nodes 加 `folder_id`：图=文件夹内容的投影（图名=文件夹名 1:1，无独立 graph 元数据）；文献单归属文件夹，多对多挂接退役（方案切换=删除旧方案；决策细目=ADR-0021，行为终态=INV-88~93；文献必在文件夹=INV-NEW-2、文件夹域容器与删夹域删=INV-NEW-3）。
5. 节点唯一来源收敛：纯主题节点/手动建点在应用层全域退役——节点唯一来源=入库（挂接导入落夹建节点）/移动（moveFolder 自动建与随迁）两路（INV-NEW-1）；IPC 写通道 `lineage/upsert-node` 拆分为 `lineage/patch-node`（纯编辑 patch：id 必填+字段白名单 strict，无新建形态可表达；`lineage/import` 草稿导入通道随 ADR-0022 退役）。
6. nodes 加 `tags`→**应用层退役**：全应用标签唯一源=文献库域（tags+paper_tags 两表），脉络卡标签=graph 读面伴生查表（INV-103）；DDL 列死置（三列退役设计单源=docs/design/2026-10-04_f-contracta01-design.md——本清单第 6/7 条与 notes.title 连带项同源）。
7. `core_idea` **应用层全退役**（用户裁决：显示面仅详情面板、AI/FTS/卡面/筛选零依赖；「核心想法」语义由全文笔记 notes.contentMd 承接——INV-101）；DDL 列死置。连带：notes.title 列死置（INV-104）。
8. 新表 `lineage_graph_meta`（图级 KV）：现行键=lineTypeNames（色行名恰 6 行、空名归一「待命名」——schema 单源=src/shared/models/lineage.ts lineTypeNamesSchema）；lineTypes 为历史配置（四组线型体系随 kind 退役，仅为历史留档）；现行线色口径=INV-108 线色双值。
9. 含金量投影（现行生效）：graph 通道逐文献节点透出 paperMetrics（citedByCount/venueTier+可选 venue/impactFactor）——数据来自 papers 既有列缓存、graph join 透出（键=paperId，主题节点不入表，渲染层零额外取数）；venueTier 映射单源=shared/venue-tier.ts venueToTier。单源=src/main/services/lineage/lineage.service.ts（LineagePaperMetrics 与 graph 读面）。

行为约束在 service 层不在 DDL CHECK（本 ADR 原则，历次演进维持——现行守卫面见「形态」节）；行为终态与跨格序列的单一真相源=invariants.md。**接缝标注（原样保留，待裁决）**：INV-27「lineage 树单父不变量（四 kind 全景）」在 docs/invariants.md:49 仍登记且状态=已锚定，与本文现行形态「manual 单基型、入边不限条数（多父放行）」互斥——登记册尚未随本裁决改写，待主控按受锁流程裁决处理；本文不自行改写 invariants.md。

保存语义对齐标注/笔记：autosave-first+失败不推进 savedAt（INV-04 同型）+脏态投影；退出拦截聚合面扩图视图脏态。

## 后果

- ROADMAP 增设「发展脉络图」节；前置依赖=标注锚点定位服务（双击跳转）、连续滚动几何接口。节点信息不依赖 AI 语料链：草稿导入链随 ADR-0022 退役，节点唯一来源=入库/移动两路（见「数据模型」演进清单第 5 条）。
- AGENTS.md 负面清单「知识图谱」措辞随边界裁决修订（指针本 ADR）。
- 人工策展时间树与自动引文图（ADR-0012）边界以本 ADR「边界」节为单源。
