# 任务：未定义行为系统性清点与重构（Undefined-Behavior Sweep · UBS）

> 用法：本文件是新会话的完整任务书。直接粘贴全文即可开工。前置基础设施与教训见 §5。

## 0. 开工前置（强制，不可跳过）
1. 读 `AGENTS.md`（重点新增节：「会话开工纪律（技能清点）」「状态与不变量纪律」）、
   `docs/DEVELOPMENT.md`（§3 惯用法 + §8 工程惯例）、`docs/invariants.md`（本任务的
   起点清单与维护规则）、`docs/reports/2026-08-23_defect-campaign.md`（上游战役结论）。
2. 按宪法执行技能清点（枚举+用/不用+理由，写入开工记录）。
3. 配置自查：确认自身与一切子代理处于正确模型/思考等级（历史事故：GLM 思考等级配错，
  其签发的全部裁决作废重审）。
4. 全程纪律：受锁文件 locks:unlock→改→locks:apply + [locked-change]；tests/shared 变更
  同理；禁新增依赖（fast-check 例外：仅允许作为 ADR 立项产物，走 [dep-change]）；一逻辑
  单元一 commit；先红后绿；卡住停下报告；不放宽任何检查。

## 1. 背景与目标
2026-08-23 缺陷战役复盘结论：骨架/工单治理静态结构，而缺陷集中在三类骨架盲区——
**时间维度**（状态/竞态）、**接缝**（模块间无主行为）、**未声明的不变量**（默认假设）。
本任务把全仓库这三类欠账**清点成册 → 分优先级 → 逐项锚定或重构**，目标是此后"未定义
特性"在新代码里出现时即被宪法条款或机器防线拦住，而不是等用户运行时实锤。

## 2. 清点维度与已知靶点（file:line 级，逐项核实后按 §3 分批执行）

### A. 状态维度（store 状态机审计）
- A1 `src/renderer/features/settings/settings.store.ts`：唯一未见 stale-guard 模式的
  store（INV-03 缺口）。核实其 load/save/diagnose 并发面；若可达则按 DEVELOPMENT §8
  形状补 guard + 锁定用例（先红后绿）。
- A2 `src/renderer/features/reader/reader.store.ts`：头注释声明有 stale-guard（:10），
  但锁定力未核——补"迟到旧响应丢弃"用例或确认已有，结论记入 invariants.md。
- A3 `src/renderer/shared/hooks/useAsync.ts`：无请求令牌（战役存档观察）——切换 paperId
  时旧响应晚到会覆盖新状态（U1 修了触发面，未修 hook 本体）。评估加请求令牌的影响面
  （PaperDetailPanel 之外的全部消费方），产出裁决：修（+锁定测试）或存档不修（附依据）。
- A4 `src/renderer/features/notes/NotesPanel.tsx:67-81` 保存状态指示：合并落地与 in-flight
  保存失败交叠时可能误显"已保存"（战役报告 §5 观察项）。核实可达性，可达则修。

### B. 接缝（跨模块行为归责）
- B1 IPC Result 折叠面清点（INV-13）：**逐 service 通读全部正常返回路径**，找"以状态
  字段/幂等语义表达业务失败"的折叠点。检索只作辅助：`grep -rn "failed\|幂等\|Status"
  src/main/services`——注意 `grep "ok: true"` 会漏检 enrich 原型（enrich.service 以
  enrichStatus:'failed' 折叠，文件内无 "ok: true" 字面量，机器实测 0 命中）。已知点：
  `enrich.service.ts:126`（enrichStatus:'failed'，消费方已分支）、`reader.service.ts:68-71`
  （幂等删除 ok:true，消费方语义核对）。每个折叠点核对消费方是否无条件按成功处理；
  发现 enrich 同型即修（模式：按折叠字段分支提示）。
- B2 注释互斥扫描：全部 `*.store.ts` 错误契约注释 × 其消费方组件注释逐对核对（先例：
  tags.store"归 toast 层" vs TagEditor"静默"互斥）。发现互斥即按宪法停下裁决。
- B3 标题 max(200) 常量化（INV-11 残留，U2 NIT 存档）：schemas.ts:104 与
  NotesPanel.tsx maxLength=200 靠注释对齐——提升为共享常量（落点 src/shared/，
  [locked-change]）。
- B4 工单模板状态面断链修复：宪法「状态机前置」约束存在，但工单生成模板
  （`scripts/new-ticket.ps1` 产出的五层规约骨架）无状态面提示——弱模型触点断链。
  评估在模板行为层骨架中加"涉及异步+用户输入须先给状态/迁移表"占位条款（受锁
  [locked-change]），与 C3 的错误反馈两型条款同批落。

### C. 不变量锚定（docs/invariants.md 全部"未锚定/部分"条目逐条补防线）
- C1 INV-01：e2e 增 documentElement 不溢出断言（`scrollWidth <= clientWidth` +
  `scrollHeight <= clientHeight`，smoke 或 reader spec 挂载后断言一次）。
- C2 INV-06：补 underline 创建最小 e2e 链路（划选→下划线→计算样式断言
  background-color 非 none + height 2px 形态）；note kind 至少补渲染存在性。
- C3 INV-02：评估"吞错检测"lint 化可行性（如 store 文件空 catch 告警）；不可 lint 化
  则降级为规约化——两型错误反馈模式条款落进工单生成模板 `scripts/new-ticket.ps1`
  的文化层骨架（与 B4 同批，受锁 [locked-change]）。
- C4 INV-07：架构评审条款保留人审，但登记核实（dialogs.ts 仍是唯一路径出口）。

### D. 复杂度热点（重构评估——纪律：先出态设计文档再动，结论可以是"不动"）
- D1 `notes.store.ts` 五个模块级结构（pendingEdit/editSeq/touchedFields/loadedOnce/
  lastEditedAt）坍缩为显式状态机的可行性。**权衡红线**：该模块刚过五轮 deepseek 审计 +
  10 条锁定用例；重构须证明"概念收益 > 再锁 + 再审成本"，裁决必须落 ADR 存档。
- D2 性质测试立项：fast-check ADR 草案（[dep-change]），目标域=store 竞态不变量；若
  裁决不引入，落地零依赖替代（DEVELOPMENT §8：固定种子伪随机序列锁定测试，先例可
  写进 notes 或 tags store）。

## 3. 执行批次（修复项独立 commit 走双门流水线；批一为只读分析不入库——分析产物存
   Temp，如担心易失可同步副本入 docs/reports/ 附录随批二首提交）
1. **批一（只读清点）**：A/B/C 全量核实 → 产出 `analyses/UBS-sweep.md`（Temp 工作流目录，
   每项：核实结论/优先级 P1-P3/预估动作）；本批不修任何东西。
2. **批二（锚定批，低风险先行）**：C1/C2/C3+B4 + A2 + B3——测试/lint/常量化/模板条款，
   全部先红后绿（模板类无红面，以生成器输出断言或人工核对记录替代）。
3. **批三（状态机批）**：A1/A4（若批一判可达）——每项先态空间表后实现，deepseek 审计
   按态空间+跨格序列审。
4. **批四（重构裁决批）**：A3/B1（修或存档裁决文档）/D1（ADR）/D2（ADR 或零依赖落地）。
5. **收官**：全量 verify + e2e；invariants.md 状态列全量回写；报告入 docs/reports/；
   push 问询用户。

## 4. 终止条件（预声明，沿用战役契约）
- NIT 级存档不回炉；同一单元回炉 ≤2 次仍不收敛 → 停下升级用户。
- 审计输入必须携带全部前轮裁决与修复历史（简报累积制）。
- 双门齐备才可提交（deepseek 一审 + 正确配置 GLM 二审）；机器事实（verify/e2e/独立
  tsc 等）为最终裁判；审计 BLOCKING 被机器事实证伪时，携核验事实重审一次。
- 发现测试/契约本身有问题 → 停下报告，走 [locked-change]，不得自行改测试让代码通过。
- D1/D2 类重构裁决"不动"是合法结论，但必须落 ADR/登记册并给量化依据。

## 5. 基础设施与历史教训（infra 就绪，直接复用）
- deepseek 审计调用器：**库内权威副本 `scripts/deepseek_audit.py`**（随本规划修复提交入库；
  .py 不在锁清单（scripts/ 仅收 *.mjs/*.ps1），非受锁，改动无需 [locked-change]；三种模式
  --mode diff|analysis|plan，plan 模式审规划/制度文档）。key 运行时从
  `~\.zcode\v2\config.json` 读（脚本本身无密钥）；api.deepseek.com 直连不走代理、32K
  输出预算、900s 超时；输入过重会导致推理耗尽预算/超时——大输入先在简报顶部加聚焦
  声明（战役实测教训）。
- 简报/审计产物工作目录：`%TEMP%\synapse_workflow\{briefs,diffs,audits,analyses}\`
  （仅会话缓存，易失——批一结论等长寿命产物按 §3 说明入库；战役历史审计轨迹也在该
  目录，见 docs/reports/2026-08-23_defect-campaign.md §7，如需长期存档另行立项）。
- 战役全部审计轨迹索引：`docs/reports/2026-08-23_defect-campaign.md` §7。
- 教训文档：`AI辅助开发经验教训.md`（九节）；宪法「会话开工纪律」即其制度化产物。
