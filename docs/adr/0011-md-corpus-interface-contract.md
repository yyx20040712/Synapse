# ADR-0011：md 语料接口契约 v1（DB 真相源 + 版本化投影 + 工具说明书入口）

- 日期：2026-08-25（同日修订：fulltext/figures 纳入 v1——蓝图 D6 裁决，
  为多模态模型消费面考虑；同日第三轮 v1.1：计划审查定稿六项契约收紧——
  见文末修订记录）
- 状态：已裁决——v1 契约冻结（P7-C 实现前修订，不构成破坏性变更），P7-C
  工单化按此验收；AI 链条扩展位预留
- 关联：B3 裁决问3（DB 唯一真相源+md 投影）；ROADMAP P7-C/P8+ 愿景范畴；
  AI 蓝图 docs/reports/2026-08-25_ai-sensor-blueprint.md（§4.1 裁决记录）

## 背景

P7-C 的 md 语料导出被 B3 定位为「AI 传感器的接口载荷」；用户 2026-08-25
确认下一方向为 AI 传感器链条。若导出格式不经审视直接随 P7-C 落地，将把
偶然格式固化为事实接口契约——本 ADR 先冻结 v1 契约，P7-C 按此实现，
AI 链条（后续工单）按此消费。

## 裁决：v1 契约

### 存储与投影分层（重申 B3-问3）

SQLite 是唯一真相源（事务性/FTS/单写者）；md 文件是**投影**——任何时候可由
DB 全量重导出，md 本身不回写 DB。丢 md 不丢数据；md 的消费者只读。

### 导出物形态（一个目录五件套）

```
<用户经系统对话框选择的目录>/     ← INV-07：路径只出自 main 侧对话框
├── INTERFACE.md                  ← 工具说明书（AI 消费者入口，静态生成）
├── manifest.json                 ← 导出索引（机器可读）
├── corpus/<paperId>.md           ← 每篇文献一份语料（标注+笔记+引文块）
├── fulltext/<paperId>.txt        ← 全文本层（pdf.js textContent 按页拼接，
│                                    页界以 \f 分隔——孙智能体一阶消费）
└── figures/<paperId>/            ← 多模态消费面（D6 裁决）
    ├── page-<N>.png              ← 页级快照（pdf.js canvas 渲染导出）
    └── anno-<annotationId>.png   ← 标注区域裁剪（WADM 归一化 rects 从页图裁出）
```

- **INTERFACE.md**：面向 AI 消费者的说明书——目录结构、front-matter 字段表、
  引文块语法、排序规则、版本承诺、fulltext/figures 的消费说明（页界符/页码
  基准/裁剪图与标注的对应关系）。zcode 类代理读文件系统即可理解接口，
  无需训练适配（「传感器」定位：应用只负责把数据说明白）。
- **manifest.json**：`{ schemaVersion, exportedAt, papers: [{ paperId, file,
  title, contentSha, fulltextSha, figures: [...], exportedAt }] }`。
  contentSha/fulltextSha 供增量导出对比（v1 全量导出，增量为预留字段不实现）；
  进度可见性（D1 三读队列的建档状态）由 AI 侧工具基于 manifest 维护，应用
  只保证导出幂等（同库重导出内容确定）。
- **分层消费**（蓝图 D3 裁决）：孙智能体（一阶）= fulltext+figures+corpus；
  梳理智能体（二阶）= corpus（标记+笔记语料）。同一目录不同子集。
- **图提取边界**：页级快照+标注区域裁剪两级；对象级图像 XObject 提取不做
  （成本高/收益边际）。PNG 导出走 pdf.js 既有渲染管线（无新依赖）。

### front-matter schema（版本化）

```yaml
schemaVersion: 1
paperId / title / authors / year / venue / doi / source / citationKey
annotationCount / noteCount / exportedAt
```

含金量指标元信息（蓝图 D4 裁决，enrich 域既有数据装配，零新增出网）：
`citedByCount`（OpenAlex/CrossRef 缓存值+取数时间戳）与 `venueTier`（内置
学科映射表的人工先验，允许用户改）作为**可选字段**纳入 v1——消费侧用于
领域基线归一，不做跨领域原始值比较（偏倚处理归 AI 侧工具，指标口径在
INTERFACE.md 声明）。

演进规则：**新增字段必须可选；删除或改名=破坏性变更（禁止），只能升
schemaVersion 并保留旧字段**。消费者按 schemaVersion 兼容读取。

### 正文结构（P7-C 规约的机器可读化）

1. 总评层（论文级 notes）一节；
2. 片段层按 sortKey（页码:序号）排序，每条：
   `> 引文原文`（p.N 页码标注）+ 缩进批注行；
3. 语料作者标记：批注行以 `[user]` 前缀标识人工来源。**AI 语料段
   （`[ai:deepseek]`/`[ai:glm-r2]`/`[ai:glm-adj]`）是 v2 扩展位**——数据模型
   裁决（annotations 第三写面 vs 独立表）见蓝图 D3，v1 不实现但语法先占位
   （消费者按前缀区分来源，新增前缀不破坏解析）。

### 验收口径（P7-C 工单化时落实）

- golden 测试：固定 DB 夹具 → 导出 → 与 golden md/manifest 逐字节比对；
- 结构断言：front-matter 可 YAML 解析且字段齐；引文块数量与 DB 标注数一致；
  排序与 sortKey 序一致；manifest 的 contentSha 与文件内容匹配。

## 后果

- P7-C 的「每篇 md 语料导出（front-matter+引文块+笔记，机器可读结构断言+golden）」
  验收条款以本契约为细目来源。
- AI 链条工单化时：消费侧只依赖本契约+INTERFACE.md，不依赖 DB 内部结构——
  接口稳定面收窄到目录三件套。
- 增量导出、AI 语料写入面：v2 契约范围，届时升 schemaVersion。

## 修订记录 v1.1（2026-08-25 第三轮：计划审查定稿——实现前修订，非破坏性）

> 审查与裁决实录=docs/reports/2026-08-25_ai-plan-review.md（R4~R9）；工单化母本
> =ai-module-plan v1.1。以下条款并入上方 v1 契约正文口径。

1. **[ai:*] 段装配入 v1**（D3 独立表既决）：ai_notes 表随 SR2-AI-01 落地，corpus
   md 装配 `[ai:*]` 段（语法不变——消费者按前缀忽略未知段）。**v1 无生产者**：
   生产者=测试夹具，消费者=导出装配，写入面=未来回灌工单另行立项。
2. **front-matter 去 exportedAt**：per-paper corpus md 的 front-matter **不含**
   exportedAt（时间戳只进 manifest per-paper 条目）——保证 contentSha=文件字节
   sha256 的幂等口径（同库重导逐字节稳定）。
3. **manifest 写入协议**：终局单写+原子替换（临时文件+rename）；导出会话开始即
   删旧 manifest 并清空重建 corpus/fulltext/figures 三子目录。「manifest 存在=
   导出完整就绪」是工具侧唯一激活判据；中断=无 manifest=不可消费，重跑即修复；
   进度不走 manifest（走应用 UI 事件）。
4. **manifest schema 增补**：可选 `errors: [{paperId, reason}]`（提取失败篇——
   文件缺失/损坏；papers[] 只列成功篇）。
5. **figures 范围口径**：全页快照（每篇每页 page-N.png——D1「数据基座尽可能
   不失真」同哲学）；体积/时长预期由 INTERFACE.md 声明；未来收窄（如仅标注页）
   属版本化修订（INTERFACE 版本号联动）。
6. **导出并发语义**：单会话单飞——进行中拒绝第二会话（错误码 EXPORT_BUSY）。
