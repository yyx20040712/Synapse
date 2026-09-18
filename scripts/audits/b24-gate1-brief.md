# b24 门一审包（F-LAYER-01 实现批对抗审+F-TIME-01 文档批轻量审）

> 岗位=门一（ops-gate1-k2，kimi k3 $max，zipoo——用户指令 k1 封顶本批
> 起 k2 承载）。你只许 Read 以下三件（隔离审，禁翻仓库其他文件）：
> ①本简报；②E:\class\智慧水务\Synapse_remake\scripts\audits\b24-gate1-diff.patch
> （F-LAYER-01 全部代码 diff，237 行）；③E:\class\智慧水务\Synapse_remake\
> docs\reports\2026-09-18_time-chain-prestudy.md（F-TIME-01 评估报告全文）。
> 产出=对抗式审查报告（写到本简报同目录 b24-gate1-report.md 的指令由
> 派发方转达——你没有写通道，终报文本交回派发方归档）。

## Part A：F-LAYER-01（实现批——对抗审六查）

票面=src/main/services/settings.service.ts 骨架头注（diff 内含改写后头注）：
零行为下沉+ipc 薄化+L1 锁线（eslint services 块 group 补 'electron'）。

1. **零行为断言逐 hunk**：diff 三个文件逐 hunk 核对——service 真身对
   ipc 旧文是否逐行同构（readSettings/zod safeParse/损坏回退/get 尽力
   写回/set 原子写/diagNetwork 并发 map 逐项形态）；ipc 薄层是否纯委托
   零逻辑残留。任何语义漂移（默认值/错误路径/JSON 序列化参数/UTF-8）
   =B 级起报。
2. **L1 锁线语义**：eslint group 补 'electron' 是否达成「三域闭合」
   （shared :136/db :154 既有——简报实勘声明，你可对照 diff 内注释句）；
   message 追加是否与既有 message 语义共存无损。
3. **方案 B 边界**：services/index.ts（ServiceBundle）零触碰、tests/**
   零触碰、bootstrap 零触碰——diff 文件清单即证（若 diff 出现清单外
   src/tests 文件=范围蔓延 B 级）。
4. **受锁面**：受锁=eslint.config.js 单件（票面预列恰合——报告须引
   实勘勘正：票面原文「三处新红线」中 shared/db 两处系既有态，本票只
   补 services 一处；该勘正是否成立由你独立判）。
5. **变异红证核验（纸面）**：M1=service 加 electron import→lint EXIT=1
   （消息含 L1 句）→还原复绿；M2=DEFAULTS theme 'dark'→定向 2 failed
   →还原 6/6。核逻辑链是否闭合（M2 的 2/6 失败分布是否与 theme 断言
   点吻合——settings.test 6 用例中 theme 相关=用例 1/2/4 三处，2 failed
   是否合理由你推演）。
6. **实现者自裁三条**（两行语境注释/旧注释路径笔误顺改/heartbeat 探针
   锁链观察）：逐条裁「准/不准+理由」。

## Part B：F-TIME-01（文档批——轻量审四查）

评估报告=③号文件（零代码变更，产出呈裁不实施）：

1. **计数实测核对**：报告 §1 两表行数（829/13/367/1202 等）内部加法
   是否自洽；呈裁口径与票面骨架「约 1,100 行」的差异是否已作口径澄清
   （报告 §1.1 小计+scroll-progress 关联面的关系）。
2. **技术断言抽查**：§2「通道性质错配」（saveProgress=本地 IPC+同步
   SQLite）与 §4 选项 2「页码链牵连」（三收尾口回改直发）是否与报告
   自身 §1.4/引用的 setup 结构描述一致；有无过度断言（如「损失面更小」
   的比较基准是否写明）。
3. **呈裁完整性**：§5 两裁项（档位+排期）选项是否互斥完备、推荐是否
   有依据链、实施票的尾注预告（[locked-change]/双尾注）是否与选项
   面正确对应。
4. **诚实申报面**：无生产数据量化损失面（遥测不做）是否显式申报；
   选项 3 的实现复杂点是否如实（非纯删票）。

## 产出格式

- 判定=PASS / PASS_WITH_WARNINGS / FAIL（B=Blocking/W=Warning/N=Note
  分级；Part A 与 Part B 分别给）。
- 每条发现：证据=hunk/行号/原句引用，禁无证据断言。
- 主控关键假设拷问（烤验义务）：「零行为=受锁测试 6 用例穿透薄层锁住
  service 业务」「L1 三域闭合成立」「评估报告推荐选项 2 无需 mini 设计
  链」——三条假设未被你拷问=烤验未过。
