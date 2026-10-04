# A 批「数据契约批」设计稿（裁决落定稿，2026-10-04）

> 三段通道产物：拟定者岗设计书 → 审核者岗对抗审（B1/W11/N3）→ 主控终裁
> （含全部待核实项亲核销项）→ 用户四项裁决落定（§5）。本文=实施依据稿。
> 前承视检反馈 R1（docs/prompts/2026-10-04_visual-feedback-r1-analysis.md）。

## §0 已亲核事实底座（审核发现清偿记录）

- **node.tags 存量实测**（活库只读探针，2026-10-04）：default 工作区
  8 节点、tags 非空 **0** 行；文献库域 4 标签/7 关联——「死数据」前提
  坐实（用户标签全在文献库域）。
- **notes.title DDL**（001_init:77）：`TEXT NOT NULL DEFAULT ''`——
  写链去列后存 ''（非 NULL），FTS5 空串零 token；「NULL 分支」疑虑
  消亡。存量 title 非空=1 行。
- **core_idea 存量**：非空 **0** 行（零数据；但 ADR-0014 时间树意图面在）。
- **lineage.json 导入/恢复面**：不存在（导入链已随 ADR-0022 退役删除；
  现仅导出写链）——导出单向，无对称性风险。
- **ai_notes 列集**：model/anchorPage/锚文本字段全在（契约文件亲核）。
- **paper_tags DDL**：PRIMARY KEY (paper_id, tag_id)——唯一性在 DDL 层。
- **组件宿主**：LineageSideTags/LineageTagDialog 宿主=LineageSidePanel
  +LineageBoardDialogs（TagLifecycle 仅注释提及，连带改写）。

## §1 数据契约终态（终裁案）

1. **标签唯一源**：文献库标签域（tags+paper_tags）成为全应用唯一标签源。
   lineage_nodes.tags 列**应用面五层退役**（shared schema 字段删/repo
   写链去列/读面不映射/renderer 写链+组件删/导出字段删+golden 重冻结），
   **DB 列死置、清列捆绑 D 批 DB 战役**（退出条件与触发器登记
   docs/defense-lifecycle.md；与 kind 恒值列先例的形态差异=零消费列，
   终局归宿=删除）。
2. **卡标签行换源**（R1 痛点）：lineage graph 读面扩展**伴生 map**
   `tagNamesByPaper: Record<paperId, string[]>`（一次 IN join
   paper_tags×tags 装配；**不进 LineageNode 行 schema**——行 schema
   保持表行镜像纯净）；排序/去重口径=复用文献库 Paper 读面既有装配
   （同名同序）；主题节点（paperId=null）不在 map 中=卡上无标签行。
   LineageTimelineCard 数据源 node.tags→伴生 map 查表，呈现逻辑不动。
3. **note.title 停用**：shared noteSchema/noteInputSchema 删 title；
   notes.repo upsert 去 title（DDL DEFAULT '' 自动生效）；FTS 虚表与
   触发器不动（空串零 token）。历史残留词已清零（2026-10-04 用户裁决
   「测试数据无价值直接删除」——唯一存量行已删+FTS MATCH 复验空，
   **无残留例外**；防御性口径=新代码零消费 title）。
4. **core_idea 全退役**（用户裁决 2026-10-04：显示面仅详情面板一处+
   AI/FTS/卡面/筛选零依赖+存量零行，「核心想法」语义由全文笔记
   notes.contentMd 承接）：shared LineageNode 删 coreIdea 字段+
   LineageEditIdeaDialog 退役（含宿主挂点）+store setNodeCoreIdea/
   写队列面删+导出 core_idea 字段删（golden 重冻结）+创建占位删
   （library.service/import.service/ipc 透传）+8+ 服务测试造数大扫；
   **DB 列死置、清列捆绑 D 批**（同 §1.1 死列治理口径）。
5. **片段笔记口径确认**（零 DDL）：annotation kind='note'+comment 即
   片段笔记数据终态（锚字段齐备：page/quoteText/prefix/suffix/
   offsets/rects）；comment 无长度上限可接受（表现层如需限长归 B/C 批）。
   AI 评估笔记=ai_notes 直读成立。
6. **全批零迁移 015**。

## §2 不变量登记（随单元落地，三要素齐备）

| INV | 声明处 | 强制方式 | 锚定状态 |
|---|---|---|---|
| 笔记三域分域（全文=notes 1:1 upsert；片段=annotations kind='note'；AI 评估=ai_notes；互不迁移回填） | shared 契约文件头注 | service 层无跨域写接口（类型面） | 表结构 |
| 片段锚不可变（锚字段写后不可变，仅 comment 可编辑） | annotations repo 接口注释 | repo 更新接口只暴露 comment | 契约接口形状 |
| 标签唯一源（脉络节点不持有私有标签） | LineageNode 契约（无 tags 字段即锚） | 仓内负锚 grep（无私有标签写 API） | schema 字段缺失 |
| notes.title 列死置（新代码零消费；存量残留已清零） | docs/invariants.md 条目 | lint 负锚/审查 | DDL 列+DEFAULT '' |

## §3 单元切分与实施序（全串行——锁纪律）

| 单元 | 内容 | 前置 |
|---|---|---|
| **A1a 换源读链**（先行，解 R1 痛点） | graph 读面伴生 map 装配+LineageTimelineCard 换源接线；新增读面单测+卡换源渲染断言（先红后绿） | 本稿裁决通过 |
| **A1b 标签域退役** | 五层退役（schema/repo/ipc patch/store setNodeTags+写队列/组件三件套+宿主挂点/导出+golden 重冻结）；删两件退役域测试+store-reorder 面处置 | 呈裁点 2/3 落定+test-surface 豁免裁决+**收紧清单（文件+用例级）动工前冻结** |
| **A2 title 停用** | schema 删 title+repo upsert 去 title+ReaderNotesPanel 标题输入框退役（静态「全文笔记」占位，样式归 B）；红证=FTS 按 content 命中+title 空+update/delete 同步链两条 | A1b 收口后 |
| **A3 core_idea 全退役** | §1.4 五面退役（schema/对话框+宿主/store 写链/导出+golden 重冻结/创建占位/测试大扫）；DDL 列死置（清列捆绑 D 批） | 呈裁已落定（§5.1）+test-surface 收紧清单并入 A1b 一并冻结 |
| **A4 声明与登记** | §2 四条 INV 落 invariants.md；ADR/架构回写（§5 ADR 索引+§6 实体表+ADR-0014 修订记录〔core_idea 退役〕或新 ADR「标签唯一源」） | 前序收口 |

门链=实现批全对抗位（门一双审+门二实证终审）；每单元独立 commit+
[locked-change] 尾注+locks 即时同步；test-surface 有意收紧处先裁决
后落 exemptions.json（禁先删后补）。

## §4 风险清单（承审核稿+处置）

1. test-surface 收紧（高确定）：A1b/A2 动工前出全量收紧清单随主控
   豁免裁决一并冻结。
2. golden 重冻结误基线：重冻结前人工核对导出 diff（tags 消失=唯一
   预期差异；导入面已证不存在）。
3. N+1 回潮：伴生 map 必须单查询 IN join（门一审查点）。
4. A1a/A1b 中间态：A1a 后卡行显示文献库标签、node.tags 仍在库（读面
   已不消费）——A1b 跟进清偿，不留跨批中间态。
5. 接缝注释互斥：换源后 LineageTimelineCard 头注与 TagLifecycle 注释
   中 node.tags/LineageTagDialog 指称同步改写。

## §5 裁决记录（用户位，2026-10-04 全部落定）

1. **core_idea**：**全退役**（消费面汇报后确认——数据显示面仅详情面板
   一处、编辑/导出/占位三面均自身配套设施、AI/FTS/卡面零依赖、存量
   零行；「核心想法」由全文笔记承接）。
2. **主题节点标签终态**：**接受无标签**（唯一标签真实源=文献库；文献卡
   右上角显示该文献的文献库标签〔B 批 UI 落位〕，详情面板同理）。
   附核实反馈：主题节点创建入口在=编辑模式工具条「添加节点」（或画布
   空白菜单）→ 对话框顶部「添加主题节点」切换按钮（默认高亮=从文献库
   添加，主题型按钮不显眼）；功能链完整（对话框两型+store.addThemeNode
   +e2e 测试面）。**挂账 R2**：用户将据此规划主题节点与编辑模式添加
   节点的业务逻辑调整。
3. **导出 tags 字段**：**删除**+golden 重冻结。
4. **历史 title 残留词**：**直接删除测试数据**（唯一存量行 title="123"
   /content="123456" 已删+FTS MATCH 复验空——零迁移口径保持，无残留
   例外）。

（test-surface 豁免=主控裁决域；A1a/A1b 拆分与串行序=主控编排职权。）
