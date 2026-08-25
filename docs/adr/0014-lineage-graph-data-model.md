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
