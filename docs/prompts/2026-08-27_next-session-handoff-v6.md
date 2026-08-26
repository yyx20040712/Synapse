# 任务：P7-G 第二批实现（SR2-AI-06~10 逐单领取）→ 批二收官

> **⚠️ 闲时连续开发线仍在**：无人值守会话按 `docs/prompts/` 编号最大的
> idle-handoff-v\*.md 开工；人工会话开工前先核对 idle 系列是否已再推进
> ——**编号更新（含实况）则以 idle 版为最新基线**，本文任务序列相应后移。
> 本文写作时 idle 线=idle-handoff-v2（批二工单化已完成——见 §1）。

> 用法：新会话粘贴一行「按 docs/prompts/2026-08-27_next-session-handoff-v6.md 开工」。
> 前任：**闲时会话首链**（idle-handoff-v1→v2，2026-08-27）——批二五票面
> 工单化完成并过双门 plan 门（工单主体提交 f7876fa；门二复核终评 PASS）；
> v5 的任务一就此完成、任务二（AI-06 实现）未开工。本文取代 v5。
> 闲时会话的完整实况/决策出处/摩擦常量十七条=idle-handoff-v2（§0/§0.5）。

## 0. 开工前置（强制，不可跳过）

1. **第一动作=核对/执行 push**：闲时会话两条件满足但代理 TLS 失败按规则
   本地停——`git log origin/main..HEAD` 现查待推提交（f7876fa 起的 docs+
   tickets 链），网络通则推，不通则记录后继续（不阻塞开工）。
2. 分级阅读：
   - 必读：`AGENTS.md` 重点节；本文件；`docs/prompts/2026-08-27_idle-handoff-v2.md`
     §0（实况+六项关键决策先例出处）+§0.5（**摩擦常量有效集十七条**——v5
     十五+⑯后台任务通知 exit 0 不可信+⑰registry 插条漏逗号 check-tickets
     不拦）；`docs/ROADMAP.md` P7-G 节（含 2026-08-27 两条注记——批一收官
     +批二工单化）；`docs/adr/0015-ai-ingest-and-sidecar-protocol.md`；
     **五票面本体**（工单文件头五层规约=完整任务书：状态机表/跨格序列/
     failed 消解不变量/archive 账本前提/硬依赖声明全在头注）。
   - 实现首站选读：`docs/invariants.md`（INV-19/20/21 待锚定条+INV-25）；
     `tools/ai-sensor/`（queue.mjs+SKILL.md——companion 的整合基座）；
     批一战报 `docs/reports/2026-08-27_ai-campaign.md`（§2 接缝+§6 教训）。
3. 技能清点+配置自查（宪法开工纪律，简报必含；双门子代理与主会话同级配置）。
4. 开工自检：`npm run verify` exit 0（**71 文件 432 用例**，双跑自愈）；
   e2e 13/13（需先 build）；`npm run locks:check` 110 绿；check-tickets
   99 工单/open 5；并发检测（无 node/electron/vitest 占用本仓库）。
5. **会话节奏（2026-08-27 用户裁决）**：「一次只完成一项任务」的上限
   **取消**——单会话可在上下文 60% 预告边界与终止条件内连续完成多个逻辑
   单元；**工单逐单提交纪律不变**（每单独立 verify+双门+人工审查+翻状态
   +commit——正常模式审查卡点照常）。

## 1. 背景与当前基线（2026-08-27 闲时链后）

- 批二工单化完成：SR2-AI-06~10 五张五层规约票面 open（strong），执行序
  **06→07→08→09→10 串行**（09 硬依赖 08 交付 ai-note-style+ai-notes.store
  ——「08∥09」经 plan 门细化为定序）；双门档=`scripts/audits/
  ai-batch2-ticketing.*`（门一 B3/W9/N6 全处置+门二返工后 PASS）。
- verify 71 文件 432 用例 exit 0；e2e 13/13；locks 110；工单 99/open 5；
  INV 25 条（19/21 未锚定随 09/10；20 消费方级随 08+exact 延展随 09）。
- 残留：dist_new/ 单 asar（重启后手删勿硬刚）；**本地待推提交链**（§0.1）。
- 留用户视检（批一三件延续+待裁决④）：导出全流程视检/五件套观感/zcode
  激活自检。

## 2. 任务序列

1. **首单 SR2-AI-06 实现**（票面=任务书；TDD 先红后绿——六面用例+跨格
   序列①~⑤+companion CLI 探针）。要点：IPC 两通道 ai-sensor/request-read+
   status（schemas+api-surface 受锁——unlock→全改完→apply 最短周期+
   [locked-change] 尾注）；新测试 tests/unit/services/ai-sensor.service.test.ts
   [受锁新增] 先 locks:generate 再 apply；工具面 companion.mjs+SKILL.md
   改写+queue.d.mts 延展；**companion 红线=移除 job 以产物落盘为前提**
   （failed 消解不变量）。
2. 07→08→09→10 依号序（每单同纪律：票面头注即任务书；07 触
   ai_notes.repo.ts 头注「v1 无生产者」声明行修订；10 实现注意=门二 N-复1
   ——测试段补 error 态渲染+重试用例+service 单测点名 status.json 损坏路径）。
3. 每单双门照常（门一对抗深审→处置→门二终审；存档 scripts/audits/ 已入库
   直接 commit）。
4. 收官：五单 done → ROADMAP 回写批二完成注记+批二战役报告
   （docs/reports/，2026-08-27_ai-campaign.md 同型）+交接书（视届时主线）。
5. 事件驱动：用户人工验收缺陷 → 双门修复。

### 站间停点

无固定停点（节奏上限已取消）——以上下文 60% 预告收尾+逐单提交为界；
每单完成即是一个安全恢复点（ledger=git log+registry 状态）。

## 3. 待裁决（用户在场——开工前或随单现场裁）

四条一句话是非题（全文=idle-handoff-v2 §3）：
1. 闲时预裁决表七条是否批准升格 ADR？（□是 □修订）
2. companion 双目录 CLI 发现机制是否接受？（□接受 □否——改单目录+指针文件需另裁）
3. HEARTBEAT_FRESH_MS=10min/STATUS_POLL_MS=5s 两常量值认可否？（□认可 □改值）
4. 批一视检三件完成否？（完成后批二 06 的 pending→reading 联动可一并视检）

## 4. 终止条件（沿用战役契约）

- 回炉 ≤2 升级用户；BLOCKING 携机器事实证伪重审一次；测试/契约问题→停下
  [locked-change]（正常模式可走）；60% 上下文预告即收尾（写交接书→三查→
  commit）。

## 5. 基础设施

- 双门审计器：两独立子代理实例（与主会话同级模型/思考等级）；存档
  scripts/audits/（已入库）。
- 版本口径：Electron 42.9.3+Node 24；`npm run test`（禁裸 npx vitest——
  摩擦⑭）；verify 单飞；禁 npm run dev（真实库暴露面）；e2e 走
  SYNAPSE_USER_DATA 隔离。
- Windows 摩擦：rm 挂死用 PowerShell Remove-Item 兜底；残留登记勿硬刚。

## 6. 关键指针

| 对象 | 位置 |
| --- | --- |
| 五张票面（任务书） | src/main/services/ai_sensor/ai-sensor.service.ts / ai-notes-import.service.ts；src/renderer/features/reader/AiNotesSection.tsx / AiAnnotationLayer.tsx；src/renderer/features/settings/ZcodeLinkSection.tsx |
| 批二裁决母本 | ADR-0015 + ROADMAP P7-G 增容节+两条注记 + 蓝图 §4.3（reports/2026-08-25_ai-sensor-blueprint.md） |
| 工单化双门档 | scripts/audits/ai-batch2-ticketing.audit.raw.txt / ai-batch2-ticketing-glm.md |
| 闲时线实况与摩擦 | docs/prompts/2026-08-27_idle-handoff-v2.md（§0/§0.5/§3） |
| 07 数据面 | src/main/db/repos/ai_notes.repo.ts + src/shared/models/ai-note.ts + 迁移 003 |
| 08/09 消费面 | anchor-locate.ts（C-05）+annotation-anchor.ts（verifyQuote:130）+annotation-style.ts（单源先例）+ReaderNotesPanel.tsx（C-03 预留位） |
| INV 待锚定 | 19（随 09）/21（随 10）/20 消费方级（随 08/09）——登记册状态列已定级 |
| 批一战报（同型参照） | docs/reports/2026-08-27_ai-campaign.md |
| 遗留主线位 | P7-F 连续滚动（未工单化，F-aware 接口冻结，可穿插）；P7-H 依赖批二；P7-D/P7-E 后段 |
