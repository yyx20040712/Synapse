# ADR-0011：md 语料接口契约 v1（DB 真相源 + 版本化投影 + 工具说明书入口）

- 日期：2026-08-25
- 状态：已裁决——v1 契约冻结，P7-C 工单化按此验收；AI 链条扩展位预留
- 关联：B3 裁决问3（DB 唯一真相源+md 投影）；ROADMAP P7-C/P8+ 愿景范畴；
  AI 蓝图 docs/reports/2026-08-25_ai-sensor-blueprint.md

## 背景

P7-C 的 md 语料导出被 B3 定位为「AI 传感器的接口载荷」；用户 2026-08-25
确认下一方向为 AI 传感器链条。若导出格式不经审视直接随 P7-C 落地，将把
偶然格式固化为事实接口契约——本 ADR 先冻结 v1 契约，P7-C 按此实现，
AI 链条（后续工单）按此消费。

## 裁决：v1 契约

### 存储与投影分层（重申 B3-问3）

SQLite 是唯一真相源（事务性/FTS/单写者）；md 文件是**投影**——任何时候可由
DB 全量重导出，md 本身不回写 DB。丢 md 不丢数据；md 的消费者只读。

### 导出物形态（一个目录三件套）

```
<用户经系统对话框选择的目录>/     ← INV-07：路径只出自 main 侧对话框
├── INTERFACE.md                  ← 工具说明书（AI 消费者入口，静态生成）
├── manifest.json                 ← 导出索引（机器可读）
└── corpus/<paperId>.md           ← 每篇文献一份语料
```

- **INTERFACE.md**：面向 AI 消费者的说明书——目录结构、front-matter 字段表、
  引文块语法、排序规则、版本承诺。zcode 类代理读文件系统即可理解接口，
  无需训练适配（「传感器」定位：应用只负责把数据说明白）。
- **manifest.json**：`{ schemaVersion, exportedAt, papers: [{ paperId, file,
  title, contentSha, exportedAt }] }`。contentSha 供增量导出对比（v1 全量导出，
  增量为预留字段不实现）。

### front-matter schema（版本化）

```yaml
schemaVersion: 1
paperId / title / authors / year / venue / doi / source / citationKey
annotationCount / noteCount / exportedAt
```

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
