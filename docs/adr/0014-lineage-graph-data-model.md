# ADR-0014：发展脉络图（lineage）数据模型与图形态边界

- 日期：2026-08-25（蓝图 §4.3 第四轮裁决 E3/E4/E5）
- 状态：已裁决——v1 时间树立项（ROADMAP P7-H，工单组 SR2-LG-01~05）
- 关联：蓝图 D5（形态部分被本 ADR 修订）/ADR-0012（自动引文图数据模型，维持暂不做）/
  ADR-0011（语料五件套——梳理智能体的输入面）/ADR-0015（lineage JSON 导入走文件
  协议同精神）/ai-rescope-verification §4（算法调研）

## 背景

用户业务重述要求「发展脉络拓扑图」：上下=时间序、树状、节点含简要信息与核心
idea、单击看笔记、双击跳阅读器、手工调节位置与逻辑线且保存逻辑同标注/笔记。
原 D5 裁决为 md 线性时间线（图形态记 P8+ 独立决策项）；本次用户将该项提前并
选定图形态。负面清单「知识图谱/不做网络图可视化」与 ADR-0012（复审条件「领域
梳理落地后的真实聚类诉求」已触发）需一并辨析边界。

## 裁决

### 形态（E3）

- **v1=时间树**：每节点至多一个父（树约束=service 层不变量+单测）；纵向=年份
  分层（y 天然分层，免算法分层）；横向=Reingold-Tilford tidy tree 整序（线性
  时间，两趟扫描，零依赖手写——D3 等第三方库禁引，零新依赖红线）；SVG 渲染
  （pan/zoom 滚轮+拖拽，INV-14 成对注册）。
- **v2=跨支 DAG**（一篇文献影响多条线）：Sugiyama-lite（层内序 barycenter 交叉
  最小化）；**升版条件=真实多父编辑诉求出现**，v1 不预建。
- 不做 md 时间线中间形态（防两套方案并存红线）；梳理智能体输出改为 **lineage
  JSON 草稿**（节点：paperId/标题/年份/核心 idea；边：主要继承关系+说明），经
  文件协议导入（ADR-0015 同精神）后人工修订。

### 边界（E5）

- **人工策展的核心 idea 时间树合法**（AI 起草+人工修订；边=策展边）；**自动
  引文网络图可视化维持不做**（负面清单措辞随此修订）。
- ADR-0012（自动引用关系数据模型「暂不做」）**维持**：其对象是自动引文边；
  lineage 边是人工策展产物，数据模型另立即下——两者不复用表。

### 数据模型（迁移 004_lineage.sql）

```sql
CREATE TABLE lineage_nodes (
  id         TEXT PRIMARY KEY,            -- uuid
  paper_id   TEXT REFERENCES papers(id) ON DELETE CASCADE,  -- 可空=纯主题节点（阶段分组）
  title      TEXT NOT NULL,
  core_idea  TEXT NOT NULL DEFAULT '',    -- 核心 idea（AI 草稿可填，人工可改）
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
  label      TEXT NOT NULL DEFAULT '',    -- 逻辑线说明
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(from_node, to_node)
);
```

- 位置持久化采 JSON Canvas 模式（Obsidian 开放格式先例：节点 x/y 直存；MIT 开放
  规范，jsoncanvas.org）——手工拖拽=写 x/y 覆盖，重置自动布局=清空 x/y。
- 保存语义对齐标注/笔记：autosave-first+失败不推进 savedAt（INV-04 同型）+脏态
  投影；**接缝**：退出拦截（TABS-04 useTabDirtyAggregate）聚合面扩图视图脏态
  （图视图工单自带，不动 TABS-04 已冻结范围）。

## 后果

- ROADMAP 新增 P7-H 节；工单组 SR2-LG-01~05（模型+导入→布局+画布→交互编辑→
  侧板+跳转→e2e）。
- 前置依赖：P7-G AI-06~10（节点核心 idea 来自 AI 语料）、P7-C N1 锚点定位服务
  （双击跳转）、P7-F 几何（F-aware 接口）。
- AGENTS 负面清单「知识图谱」措辞修订（指针本 ADR）。

## 修订记录 v1.1（2026-08-31 F-LG14：draft 节点加可选 tags 字段）

> 需求源=用户反馈批图6/图7（脉络卡底行「含金量+标签组+年份」）；台账
> 2026-08-31 四项口径裁决在档。非破坏性修订——v1 加可选字段=向后兼容
> （ADR-0011「新增字段必须可选」规则同精神）。

1. **draft 协议扩展**：lineageDraftNodeSchema 节点加可选 `tags`（字符串数组，
   元素非空；缺省省略）。口径=草稿带为主（梳理智能体产物可带标签，导入即有），
   旧版本草稿（无 tags）导入零破坏。
2. **存储面**：迁移 007 lineage_nodes 加 `tags TEXT`（JSON 数组序列化；
   NULL=无标签——存量库零迁移兼容，无数据搬迁）。同节点同名标签去重=
   写边界单源（dedupeLineageTags，repo upsertNode 单点收口），DDL 不承担
   行为约束（本 ADR「树约束在 service 不在 DDL」同精神）。
3. **含金量摘要非 draft 面**：citedByCount/venueTier 来自 papers 增强缓存+
   venue-tier 受锁映射（ENR-01/02 交付），graph 通道 join 透出（渲染层零
   额外取数）——不进 draft 协议（草稿只承载人工策展语义字段）。

## 修订记录 v1.2（2026-09-19 F-DOCGOV-01：DDL 交叉注记）

> 上方「数据模型」段 DDL=**v1 初版决策快照**，非现行库结构全文。现行演进：
> - `006_lineage_ref_edges.sql`：edges 加 `kind` 列（tree/ref/manual 三 kind
>   终态——ref=R2-LG12 综述边豁免单父、manual=F-LG15 人工补父不限条数）；
>   `UNIQUE(from_node, to_node)` 系 **004 既有约束原样不动**（006 未改）——
>   同端点对唯一天然限定同 from+to 仅一种 kind（DDL 天然收口）；树约束仍在
>   service 层非 DDL CHECK（本 ADR 原则维持）。
> - 行为终态与跨格序列的单一真相源=**INV-27**（含三 kind 全景表）；DDL 现文
>   =`src/main/db/migrations/004/006/007`。本文保留原始决策叙述不回改。

## 修订记录 v1.3（2026-09-27 T3-P5：脉络数据层 v2）

> **不触发 v2 DAG 升级**（本 ADR「存储=图 schema（v2 DAG 升级免迁移）」预留
> 面核对结论）：仍树+旁挂边——kind 扩四值属行为面非存储面演进。现行演进：
> - `010_lineage_v2.sql`：nodes 加 `month`（CHECK 1..12，NULL=未定月框）+
>   `slot`（月内序实现层承载——窗口函数存量回填，D-P5-10「无显式字段」=
>   无用户序号语义）两列；edges 加 `sub TEXT`（子线型样式引用——引用完整性
>   守卫在 service 非 DDL，本 ADR「树约束在 service」原则同精神）；新表
>   `lineage_graph_meta`（图级 KV——lineTypes 线型组 JSON 串）。
> - kind 四值终态=tree/**inferred**（T3-P5 新枚举——同 tree 守卫单父+拒环，
>   产生入口=P7 编辑器+后置 AI 域，枚举+守卫先行防退化）/ref/manual；draft
>   导入协议 v1.2 仅加可选 `month`（缺省=NULL 未定月——旧草稿零破坏）。
> - 行为终态与跨格序列单一真相源=**INV-27（T3-P5 四 kind 修订版）**；排序
>   契约/编号/导出确定性=**INV-75/76/77**；DDL 现文
>   =`src/main/db/migrations/004/006/007/010`。本文保留原始决策叙述不回改。

## 修订记录 v1.4（2026-09-30 F-FOLDER-01：文件夹×脉络图绑定——图维度落地）

> **图维度裁决兑现**（survey 2026-09-29 §2+design-final 2026-09-30）：本 ADR
> v1「全局单图」语义升级为「一文件夹一图」——collections 表语义由「多对多挂接」
> 改为「文献单归属文件夹」（paper_collections M2M 退役——迁移 012 DROP；
> **方案切换=删除旧方案**），脉络图=文件夹内容的投影（图名=文件夹名 1:1，
> 无独立 graph 元数据）。决策细目=ADR-0021（单归属×图绑定）；行为终态=
> **INV-88~93**；DDL 现文=`src/main/db/migrations/004/006/007/010/012`。
> 本文保留原始决策叙述不回改。

## 修订记录 v1.5（2026-10-04 F-ALIGN-01：主题节点/手动建点退役——实体面）

> **节点唯一来源收敛**（design-final 2026-10-04 呈裁链终裁 D1~D6——首轮 D1/D2+三呈裁 D3/D4/D6）：本 ADR
> v1 DDL 快照「paper_id 可空=纯主题节点（阶段分组）」语义**应用层全域退役**
> ——节点唯一来源=入库（挂接导入落夹建节点〔D3 单跳〕）/移动（moveFolder
> 自动建与随迁）两路，无手动创建路径（**INV-NEW-1**）。IPC 写通道
> `lineage/upsert-node` 拆分为 `lineage/patch-node`（纯编辑 patch——id 必填+
> 字段白名单 strict，无新建形态可表达；通道换名零增减，现数=
> api-surface-closure 通道 pin 承载）；主题节点分支/手动建点组件
> （LineageAddNodeDialog）/store 动作（addPaperNode/addThemeNode）全域删除
> （回潮防御=check-quality 第 10 段负锚词表+defense-lifecycle ㉔ 登记）。
> DDL 面：`lineage_nodes.paper_id NOT NULL` 归 D 批重建顺带（台账=
> defense-lifecycle ㉓，附退出条件+评审触发器）；窗口期防御=zod 契约机检
> （schema 类型测试）+负锚词表+INV-NEW-2 应用层闸三重。行为终态=
> **INV-NEW-1/2/3**+INV-88 改写注记（两路建节点）；DDL 现文仍=
> `src/main/db/migrations/004/006/007/010/012/013/014`（013=边 via 路点列，
> F-LINEAGE-02——v1.4 清单后新增，本修订记录补齐收录）。本文保留原始决策
> 叙述不回改。
