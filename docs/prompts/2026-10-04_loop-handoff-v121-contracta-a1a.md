# 交接书 v121 —— A 批启动：数据契约三段通道+四裁决+A1a 换源读链收口（2026-10-04）

> 前承 v120（反馈 R1 分析场）。本档=同日续场：CI 首查（76 绿）→A 批
> 三段通道（拟定→对抗审→主控终裁亲核 7 项）→用户四项裁决（core_idea
> 全退役/主题节点无标签/导出 tags 删/title 残留删测试行）→A1a 换源
> 读链三屋实施收口（提交 766587d5b31 已推送）。

## §0 本场消耗与开工记录

用户指令=「继续开发完善，指引=v120/v119 交接书」。技能清点：
ai-dev-org/verification-before-completion/subagent-driven-development+
dispatching-parallel-agents/TDD（executor 承）=用；systematic-debugging=
不用（无诊断面）；frontend 族=方法论参考（A 批数据面）；dynamic-
workflows=不用。配置=主控 GLM5.3；executor/probe=随宿主（session:
host-tier 欠账行恢复口径）；k1/d1/drafter/auditor=绑定 $max。

消耗：drafter×1（24.5k）+auditor×1（71.2k）+executor×2 轮（实现+
RR1，10.4M）+门一双审（k1 21.7k+d1 39.4k）+probe×1（238k）+主控亲执
（CI 首查+数据面盘点+假设亲核 7 项〔含活库只读探针——node.tags 存量
0/notes.title 1 行/core_idea 0〕+设计稿落档+裁决 ④ 执行〔删测试笔记
行+FTS MATCH 复验空〕+收口提交+账本 598→607〔9 行〕+本档）。证据件
仓外=2026-10-04_node-tags-inventory.mjs（活库探针，scripts-audits）。

## §1 基线终态（对不上禁提交）

- **已推送=766587d5b31**（A1a+设计稿+台账 §7b，19 件 +373/−30
  [locked-change]）；工作树 clean。
- **verify 终态 EXIT=0=255 件/2613 例**（executor+probe+主控三跑
  同值；基线 2607+3=A1a 新增〔service 2+卡 1〕+RR1 +3〔repo 直测〕
  ——注意 2610 为 RR1 前中间态）；locks 355；e2e lineage 12/12。
- CI：run 37171721401（v120 docs 触发）=**76 passed 零 flake**——
  T1 沿绿（RR2 后第 3 绿）；P7-B/:266 未再现（各维持 observing 1/2）。
  **本笔 766587d5b31 触发的新 run 待出——下场首查**（首查面=T1 沿绿
  +两 flake 指纹+**A1a 改写的 T11 CI 首跑**）。

## §2 A 批三段通道+四裁决（设计稿=docs/design/2026-10-04_f-contracta01-design.md 裁决落定稿）

- **三段通道**：drafter 设计书（六决策点+零迁移 015+四单元）→
  auditor 对抗审（B1/W11/N3 有条件放行——B-1 主题节点授权缺位/
  W 群待核实）→主控终裁（7 项亲核销项：graph 读面不含文献库标签/
  notes.title DDL=NOT NULL DEFAULT ''〔NULL 分支消亡〕/活库存量
  node.tags=0+core_idea=0/lineage.json 无导入面/ai_notes 列集齐/
  宿主两件/paper_tags PK 唯一）。
- **四裁决（用户位，2026-10-04）**：①core_idea **全退役**（消费面
  汇报后确认——显示面仅详情面板、编辑/导出/占位=自身配套设施、
  AI/FTS/卡面/筛选零依赖、存量 0 行；「核心想法」由全文笔记
  notes.contentMd 承接）；②主题节点**接受无标签**（唯一标签真实源=
  文献库；文献卡右上角显示该文献的文献库标签——B 批 UI 落位）；③
  导出 tags 字段**删**+golden 重冻结；④title 残留=**直接删测试数据**
  （唯一存量行 title="123"/content="123456" 已删+FTS MATCH 复验空
  ——零迁移口径保持，无残留例外行）。
- **数据契约终态**：标签唯一源=文献库域（tags+paper_tags）；死列
  （lineage_nodes.tags/core_idea/notes.title）DDL 死置+**清列捆绑
  D 批 DB 战役**（退出条件登记 defense-lifecycle）；片段笔记=
  annotation kind='note'+comment（零 DDL）；AI 评估=ai_notes 直读；
  **全批零迁移 015**；四条 INV 登记（A4 落地，三要素齐备）。
- **单元序（全串行）**：A1a 换源读链（✅本场收口）→A1b 标签域退役
  （前置=test-surface 收紧清单冻结+豁免裁决）→A2 title 停用→A3
  core_idea 全退役→A4 声明与登记。

## §3 A1a 实施全链（提交 766587d5b31）

- **交付**：tags.repo 批量名查 tagNamesByIds（动态 IN 禁 N+1——
  占位符个数=唯一动态面，按长度缓存预编译 papers.repo 同型；ORDER
  BY paper_id,t.name ASC 名序同源）→service deps+graph 装配伴生
  map（paperMetrics/pubNos 同型；主题节点/无标签无键）→schema
  tagNames（zod strict）→store/Board/Years/Timeline 四跳透传→卡
  L1 换源（n.tags→props.tagNames[paperId]；呈现不动）。
- **门链**：executor TDD（service 2+卡 2 先红后绿+contracts 夹具
  连带+e2e T11 种子换源 libraryTags）→门一 k1 B0W2N7+d1 B0W1N8
  双 PASS（W 共识=repo 直测缺位）→RR1 回炉（repo 真库直测 3 用例
  ——**受控 id 直插强化夹具使变异杀伤率与 planner 解耦**〔首轮
  随机 UUID 变异未红=恒真风险实锤，教训在档〕+哨兵键收紧+缓存
  上界注）→k1-W2/N7 主控亲验销项（spy 单次单批断言 :161-162 在位/
  e2e 断言面零残留）→probe 实证 5/5 PASS→主控亲验 verify EXIT=0
  同值收口。
- **A1b 红线面零触碰**（LineageNode.tags/setNodeTags/SideTags/
  TagDialog/写队列——probe diff 零命中证）。

## §4 挂账与登记

- **A1b 票面要点（下场首做前置）**：①test-surface 收紧清单（文件+
  用例级）动工前冻结+主控豁免裁决（删 lineage-tag-edit/lineage-
  side-tags-keys 两件+lineage-store-reorder setNodeTags 面处置）；
  ②五层退役（schema tags 字段/repo 写链/ipc patch/store+组件三件
  套+宿主/导出 tags 字段+golden 重冻结——重冻结前人工核 diff）；
  ③seed-lineage.mjs:91 node.tags 种子兼容行一并清；④TagLifecycle
  注释连带改写。
- **A2 票面**：schema 删 title+repo upsert 去 title（DEFAULT ''
  自动生效）+ReaderNotesPanel 标题框退役（静态「全文笔记」占位）
  +红证含 update/delete 同步链两条。
- **A3 票面**：core_idea 五面退役（schema/对话框+宿主/store 写链/
  导出+golden/创建占位 library.service:219+import.service:166+ipc
  :24/8+ 服务测试造数大扫——lineage-v2-model/service/u8-linetype/
  edge-via/import/library-detail-lineage/library-lineage-c5/
  folders-move-paper 等）。
- **CI 新 run 首查**（§1）；P7-B/:266 observing 1/2 维持。
- **R2 反馈收集**：用户预告规划「主题节点与编辑模式添加节点的业务
  逻辑」调整（台账 §7b 在案——入口核实结论=对话框「添加主题节点」
  切换钮不显眼）；卡标签位置口径=右上角（B 批 L3 细化）。
- 承 v120 全项（窄窗工具条 41.5%/C2 三件套/DB 战役呈裁/压测意向）。

## §5 新会话开工序

1. **CI 首查**：766587d5b31 触发 run——T1 沿绿+P7-B/:266 指纹+
   **T11 CI 首跑**（种子换源后）。
2. **A1b 启动**：收紧清单盘点→主控豁免裁决→三屋实施（A1b 票面
   要点 §4）。
3. A2→A3→A4 按序（设计稿 §3）。
4. 视 R2 反馈到达滚动增补台账（主题节点业务逻辑规划=重点预期项）。

## §6 操作条款存续

承 v120 §6 全项+新增：**死列治理口径**（DDL 死置+清列捆绑 D 批
DB 战役+退出条件登记 defense-lifecycle——与 kind 恒值列先例的形态
差异〔零消费列〕成文）；**变异红证恒真风险口径**（SQL 序断言的
杀伤率必须与 planner 选择解耦——受控 id 直插法，随机 UUID 撞运
教训）；**graph 伴生 map 模式**（键=paperId 的 Record 随 graph 单读
流转——paperMetrics/pubNos/tagNames 三例成族，后续同型需求照此）；
**活库探针纪律**（存量论断必须实测——node.tags=0/core_idea=0/
title=1 三数字支撑 D1/D4/D3 三裁决；只读探针件驻仓外 scripts-audits）。
账本 598→607（本场 9 行）。
