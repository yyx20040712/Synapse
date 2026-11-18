# ADR-0011：md 语料接口契约（幂等 sha 口径）

日期：2026-08-25 · 状态：已裁决——v1 契约冻结，后续修订已并入正文

关联：INV-07（路径受信边界）、INV-17（幂等 sha 口径）；AI 链条设计单源=仓外档案区 /home/yyx/synapse-archive/docs-2026-10-28/reports/2026-08-25_ai-sensor-blueprint.md。

## 背景

md 语料导出被定位为「AI 传感器的接口载荷」：应用只负责把数据说明白，AI 消费侧读文件系统即可理解接口，无需训练适配。若导出格式不经审视直接随实现落地，会把偶然格式固化为事实接口契约——本 ADR 先冻结 v1 契约，实现按此验收，AI 链条按此消费。

## 裁决

### 存储与投影分层

SQLite 是唯一真相源（事务性/FTS/单写者）；md 文件是投影——任何时候可由 DB 全量重导出，md 本身不回写 DB。丢 md 不丢数据；md 的消费者只读。

### 导出物形态（一个目录六件套——v1 五件套+lineage.json）

```
<用户经系统对话框选择的目录>/     ← INV-07：路径只出自 main 侧对话框
├── INTERFACE.md                  ← 工具说明书（AI 消费者入口，静态生成）
├── manifest.json                 ← 导出索引（机器可读）
├── corpus/<paperId>.md           ← 每篇文献一份语料（标注+笔记+引文块）
├── fulltext/<paperId>.txt        ← 全文本层（pdf.js textContent 按页拼接，
│                                    页界以 \f 分隔）
└── figures/<paperId>/            ← 多模态消费面
    ├── page-<N>.png              ← 页级快照（pdf.js canvas 渲染导出）
    └── anno-<annotationId>.png   ← 标注区域裁剪（归一化 rects 从页图裁出）
```

- **INTERFACE.md**：面向 AI 消费者的说明书——目录结构、front-matter 字段表、引文块语法、排序规则、版本承诺、fulltext/figures 的消费说明（页界符/页码基准/裁剪图与标注的对应关系）。静态单源生成（interface-template.ts）。
- **manifest.json**：`{ schemaVersion, exportedAt, papers: [{ paperId, file, title, contentSha, fulltextSha, figures: [...], exportedAt }] }`，另含可选 `errors: [{paperId, reason}]`（提取失败篇——文件缺失/损坏；papers[] 只列成功篇）。可选指标字段 `citedByCount`/`citedByFetchedAt` 成对出现、成对省略。contentSha/fulltextSha 供增量导出对比（v1 全量导出，增量为预留字段不实现）；进度可见性由 AI 侧工具基于 manifest 维护，应用只保证导出幂等（同库重导出内容确定）。
- **分层消费**：直接阅读原文的代理（一阶）=fulltext+figures+corpus；领域梳理代理（二阶）=corpus（标记+笔记语料）。同一目录不同子集。
- **图提取边界**：页级快照+标注区域裁剪两级；对象级图像 XObject 提取不做（成本高/收益边际）。PNG 导出走 pdf.js 既有渲染管线（无新依赖）。figures 范围=全页快照（每篇每页），体积/时长预期由 INTERFACE.md 声明；未来收窄（如仅标注页）属版本化修订（INTERFACE 版本号联动）。

### front-matter schema（版本化）

```yaml
schemaVersion: 1
paperId / title / authors / year / venue / doi / source / citationKey
annotationCount / noteCount
```

- per-paper corpus md 的 front-matter **不含 exportedAt**（时间戳只进 manifest per-paper 条目）——保证 contentSha=文件字节 sha256 的幂等口径（同库重导逐字节稳定）。
- 含金量指标元信息（可选字段）：`citedByCount`（OpenAlex/CrossRef 缓存值，enrich 域既有数据装配，零新增出网）与 `venueTier`（学科映射表的人工先验）。消费侧用于领域基线归一，不做跨领域原始值比较（偏倚处理归 AI 侧工具，指标口径在 INTERFACE.md 声明）。venueTier v1 实现档=常量修订制：`VENUE_TIER_MAP` 种子表驻 src/shared/venue-tier.ts，内容增量=改表+提交说明申报；「允许用户改」的 UI 面留后续立项。
- 演进规则：**新增字段必须可选；删除或改名=破坏性变更（禁止），只能升 schemaVersion 并保留旧字段**。消费者按 schemaVersion 兼容读取。

### 正文结构

1. 总评层（论文级 notes）一节；
2. 片段层按 sortKey（页码:序号）排序，每条：`> 引文原文`（p.N 页码标注）+ 缩进批注行；
3. 语料来源标记：批注行以 `[user]` 前缀标识人工来源；`[ai:<来源>]` 段由 ai_notes 表装配（消费者按前缀区分来源，新增前缀不破坏解析；写入面=ADR-0015 回灌协议）。

### 写入与并发协议

- manifest 终局单写+原子替换（临时文件+rename）；导出会话开始即删旧 manifest 并清空重建 corpus/fulltext/figures 三子目录。「manifest 存在=导出完整就绪」是工具侧唯一激活判据；中断=无 manifest=不可消费，重跑即修复；进度不走 manifest（走应用 UI 事件）。
- 导出会话单飞：进行中拒绝第二会话（错误码 EXPORT_BUSY）。

### 验收标准

- golden 测试：固定 DB 夹具 → 导出 → 与 golden md/manifest 逐字节比对（tests/unit/services/corpus.export.test.ts）；
- 结构断言：front-matter 可 YAML 解析且字段齐；引文块数量与 DB 标注数一致；排序与 sortKey 序一致；manifest 的 contentSha 与文件内容匹配。

## 后果

- 现行通道：五件套会话=`export/corpus-session`（设置页「AI 语料导出」入口）；另有 corpus 单篇 md 快速导出轻量通道，两通道共用同一装配纯函数（单一真相源，禁双实现）。
- AI 链条消费侧只依赖本契约+INTERFACE.md，不依赖 DB 内部结构——接口稳定面收窄到目录件套。
- lineage.json 已作为导出第六件落地（确定性口径=INV-77——生产装配恒注入；INTERFACE.md 目录清单同载）。
- 增量导出、AI 语料写入面扩展：v2 契约范围，届时升 schemaVersion。
