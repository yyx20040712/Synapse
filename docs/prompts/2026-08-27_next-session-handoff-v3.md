# 任务：SR2-AI-03 实现 → AI-04/05（预算内）→ 站间停点

> 用法：新会话粘贴一行「按 docs/prompts/2026-08-27_next-session-handoff-v3.md 开工」。
> 前任会话（2026-08-27，两段）：**P7-G 应用面开工至第二单收官**——用户授权
> push（积压 40 提交清空）+工单化批次（1516a97）+SR2-AI-01（222962c，INV-25）+
> SR2-AI-02（102df65，INV-16 锚定）；「继续」后续作第二单，2 实现单+工单化
> 达「2~3 单即停」边界。本文取代 v2（其任务一 AI-02 已完成）。

## 0. 开工前置（强制，不可跳过）

1. **分级阅读，只读清单内文件/节**：
   - 必读：`AGENTS.md`（重点节同前）；本文件全文；`docs/ROADMAP.md` P7-G 节
     （含 08-27 执行实况注记——**通道名冲突预警在注记里**）；`docs/invariants.md`
     （25 条——16/25 本日新锚定）。
   - 任务首站选读：**AI-03 票面**=`src/main/services/export_/corpus.export.service.ts`
     头注（态空间+十行迁移表+七行跨格+通道判定+目录隔离守卫+幂等范围——
     工单化批次已完整规约）；`src/main/services/export_/corpus.assemble.ts` 头注
     （R12 装配单源延展点+C-02 既有 buildCorpus/buildCorpusSet 形态）；
     `src/main/services/export_/export.service.ts`（corpusSet 通道现状=目录隔离
     守卫接线点）；`src/shared/ipc/api-surface.ts`（**export/corpus 已被 C-02
     占用——AI-03 五件套通道必须更名**）。
2. 技能清点+配置自查（宪法开工纪律；简报必含此节）。
3. 全程纪律同前（受锁 unlock→**全部改完再统一 apply**+[locked-change]；先红
   后绿；双门齐备才提交；verify **重定向取真退出码**）。
4. 开工先跑 `npm run verify`（预期 exit 0，**68 文件 399 用例**）+ e2e 12/12。
5. **摩擦常量（08-27 全天实录，叠加 p7c §5 九条——开工即知）**：
   ①verify 管道 tail 吞退出码假绿（重定向取真码）②locks:apply 时机=受锁文件
   全部改完再统一 apply（否则 EPERM 二次 unlock）③跨票引用短形对**附属交付面
   文件**也生效（ai-note.ts/003.sql 实录）④deepseek_audit 偶发 JSON 落
   reasoning 字段（exit 2 伪影——裁决在 scripts/audits/*.audit.raw.txt，regex
   提取；**r2 起用净增量 diff**——全量 diff 会使 reasoning 耗尽输出预算致
   content 空，AI-02 两跑实录）⑤zod v3 discriminatedUnion 判别值不得重复
   （合并分支+外层 refine）⑥sendItem/ack 走 setTimeout=宏任务——测试 flush
   须逐宏任务轮询（微任务轮询推进不了）⑦check-tickets：done 工单文件禁
   NotImplementedError+禁全形工单号引用（占位 stub 必须挂 open 工单主文件）
   ⑧Windows 怪象：bash rm 对个别新建文件挂死（PowerShell Remove-Item -Force
   可删）——探针类临时文件清理注意。

## 1. 背景与当前基线（一段话）

2026-08-27 两段会话：push 清积压（40 提交）→工单化五张票面（plan 门 r2 PW）→
AI-01 数据基座（红证 8/8→绿；INV-25 级联登记）→AI-02 提取器（红证→10 用例
含**真 pdfjs 4.10 node 集成**；ESLint 白名单实证拦截两处 R1 漏扫；事件载荷
两处契约修正——annotations 随发+rect.page 单源）。当前：**verify 68 文件
399 用例 exit 0、e2e 12/12（AI-02 后未重跑——renderer 提取器未接线 App 层
不触 e2e 面，开工时照跑确认）、locks 106、工单 94 open 3（AI-03/04/05）、
INV 25 条（16/25 本日锚定）、领先 origin 3 提交（docs 收官后随批 push）**。

## 2. 任务序列

### 任务一：SR2-AI-03 实现——五件套导出会话（首站）
票面已完整规约，实现要点+新裁决速记：
- **通道更名（开工首决）**：母本 §2.3 的 `export/corpus` 已被 C-02 占用
  （单篇 md 导出）——五件套会话通道更名 `export/corpus-session`
  （schemas+api-surface [受锁]+票面头注同步改；偏离母本记录简报）。
- 会话编排按票面十行迁移表；manifest 终局单写（tmp+rename 原子）+清空重建
  （范围=三子目录+manifest 本体+manifest.tmp——目录根用户文件不动）。
- corpusItem 消费端：corpus.export.service.ts 的 stub（AI-02 落的
  NotImplementedError）换真实现（流式落盘 fulltext/figures+会话推进——
  fulltext 页界 \f 拼接在此）。
- **装配单源 R12**：corpus.assemble.ts 延展（[ai:*] 段=aiNotes 入参 role→
  question 分组）——禁第二套装配；interface-template.ts（INTERFACE.md 静态
  单源）；corpusSet 目录隔离守卫（export.service.ts writeCorpusSet 前置：
  目录含 manifest.json→ExportDomainError 拒绝）。
- EXPORT_BUSY [受锁 app-error]；exportCorpus 事件发送器（bootstrap 装配桶
  注入——importProgress/sendProgress 同型先例）；sha=node:crypto。
- 测试：corpus.export.test.ts（夹具库→五件套 golden 逐字节+结构断言+幂等
  重导稳定+状态机跨格（篇失败/chunk 失败/落盘失败/BUSY/中断恢复）+守卫）；
  INV-17/18 随单翻已锚定（登记册回写）。
- TDD+双门同 AI-02 流程；**diff 门用净增量**（摩擦常量④）。

### 任务二：AI-04/05（预算内顺延）
AI-04=设置页导出节+App 层订阅（useExportCorpusEvents 组装生产 deps——
loadPdfDocument/sendItem=window.api.export_.corpusItem）+e2e 全链。
AI-05=工具骨架（progress.json/queue 幂等/SKILL.md）。

### 站间停点：单边界停（AI-03 一单一会话——该单为三单最大）。

### 事件驱动（最高插队）：用户人工验收缺陷 → 双门修复单元。

## 3. 执行批次

1. §0 前置+双基线绿。
2. AI-03（TDD+双门+提交）→ AI-04/05（预算内）。
3. 收官回写 ROADMAP；push 前问询用户（除非明示）。

## 4. 终止条件（沿用战役契约）

- 回炉 ≤2 仍不收敛→升级用户；BLOCKING 携机器事实证伪重审一次；测试/契约
  问题→停下 [locked-change]；「不做」合法但须 ADR；无明示不 push/不打包。
- 上下文止损：60% 预告单边界停。

## 5. 基础设施与历史教训

- 双门审计器：scripts/deepseek_audit.py（--mode diff|plan）；**长 diff 用净
  增量**（content 空伪影根因）；exit 2=reasoning 落盘伪影（raw.txt 提取）。
- 本日双门存档：Temp audits/{ai-ticketing-plan,ai01-impl,ai02-impl}-glm.md；
  简报 briefs/ 同名系列。
- 版本口径：Electron 42.9.3+Node 24；测试一律 npm run test。

## 6. 关键指针（速查）

| 对象 | 位置 |
| --- | --- |
| AI-03 票面（首站） | src/main/services/export_/corpus.export.service.ts 头注 |
| AI-04/05 票面 | settings/CorpusExportSection.tsx+tools/ai-sensor/queue.mjs 头注 |
| 通道名冲突事实 | api-surface.ts export_ 域（corpus=C-02 单篇已占） |
| 装配单源延展点 | corpus.assemble.ts 头注 R12 条款 |
| corpusItem 事件契约（AI-02 落） | schemas.ts corpusItemReqSchema+extractRequestEventSchema |
| 提取器与生产加载器 | CorpusExtractor.ts（createCorpusExtractor+loadPdfDocument） |
| ai_notes 基座 | repos/ai_notes.repo.ts+shared/models/ai-note.ts+migrations/003 |
| INV-16/17/18/25 | docs/invariants.md（17/18 待 AI-03 锚定） |
