# 任务：SR2-AI-02 实现 → AI-03（→04/05 预算内）→ 站间停点

> 用法：新会话粘贴一行「按 docs/prompts/2026-08-27_next-session-handoff-v2.md 开工」。
> 前任会话（2026-08-27）：**P7-G 应用面开工**——用户授权 push（积压 40 提交
> 已清）+AI-01~05 工单化批次（1516a97，plan 门 r2 PW+GLM 二审）+SR2-AI-01
> 实现收官（222962c，INV-25 入册）；**60% 上下文止损单边界停**（P12 守则）。
> 本文取代 2026-08-27_next-session-handoff.md（其任务〇基线核对+push 已完成，
> 任务一 AI-01 已完成）。

## 0. 开工前置（强制，不可跳过）

1. **分级阅读，只读清单内文件/节**：
   - 必读：`AGENTS.md`（重点节同前）；本文件全文；`docs/methodology.md`；
     `docs/ROADMAP.md` P7-G 节（含 2026-08-27 执行实况注记）；
     `docs/invariants.md`（**25 条**——25 为本日新登记已锚定）。
   - 任务首站选读：**AI-02 票面**=`src/renderer/features/reader/CorpusExtractor.ts`
     头注（四态迁移表+corpusItemSchema 字段清单+EXPORT_SNAPSHOT_SCALE——
     工单化批次已完整规约，实现照票面即行）；`docs/reports/
     2026-08-25_ai-module-plan.md` §2.2/§2.3；既有接缝样例：
     `src/shared/ipc/api-surface.ts`（EVENT_CHANNELS 单向声明+importProgress
     先例）、`src/renderer/features/reader/PdfCanvas.tsx`（pdfjs 类型再导出
     模式）、`tests/unit/renderer/` pdf-factory 夹具现状。
   - 禁止：全库通读；重读历史规划文档全文（票面已自包含）。
2. 技能清点+配置自查（宪法开工纪律；简报必含此节）。
3. 全程纪律同前（受锁 unlock→改→**全部改完再统一 apply**+[locked-change]；
   禁新依赖；一单元一 commit；先红后绿；双门齐备才提交；机器事实终裁）。
4. 开工先跑 `npm run verify`（预期 exit 0，**67 文件 389 用例**）+
   `npm run test:e2e`（预期 **12/12**）。若不是——停下报告。
   **verify 退出码必须重定向取真码**（`npm run verify > log 2>&1; echo $?`），
   禁管道 `| tail`（tail 的退出码=假绿，08-27 实录）。
5. **本日新摩擦常量四条（08-27 实录，叠加 p7c §5 九条之上）**：
   ①verify 管道 tail 吞退出码假绿（同上）②locks:apply 时机：受锁测试尚需
   迭代时 apply 过早→EPERM 二次 unlock——**受锁文件全部改完再统一 apply**
   ③跨票引用短形规则对**附属交付面文件**同样生效（ai-note.ts 头注+003.sql
   注释里的全形工单号被 check-tickets 拦——一律短形 AI-0N）④deepseek_audit
   偶发 JSON 落 reasoning 字段（content 空→exit 2）——裁决本体在
   scripts/audits/*.audit.raw.txt，regex 提取即可，非重审理由。

## 1. 背景与当前基线（一段话）

2026-08-27 单会话：用户授权 push（2f57653..b8fa8ff，40 提交清空积压）→
AI-01~05 五张工单化（plan 门 r1 FAIL 3B【状态机缺迁移表/INV 编号矛盾】→
r2 PW 全处置→GLM 二审 PASS）→AI-01 实现（红证 8/8→绿；deepseek r1 FAIL
1B【夹具 SQL 插值】+r2 PW 4NIT 全处置；INV-25 级联语义入册已锚定）。当前：
**verify 67 文件 389 用例 exit 0、e2e 12/12、locks 105、工单 94 open 4
（AI-02~05）、INV 25 条、领先 origin 3 提交（本日 docs 收官后随批 push）**。
工作树残留两处不变（`dist_new/`、`scripts/audits/`——staging 禁扫入）。

## 2. 任务序列（顺序执行；事件驱动最高）

### 任务一：SR2-AI-02 实现——本会话首站
票面（CorpusExtractor.ts 头注）已完整规约，实现要点速记：
- 交付面：CorpusExtractor.ts 实现（四态迁移表照票面）+**ESLint pdfjs 白名单**
  （eslint.config.js [locked-change]——no-restricted-imports 机器锚，INV-16
  翻已锚定+登记册回写）+PdfCanvas/TextLayer 头注「唯一」措辞修正（符号锚）+
  **IPC 契约**（api-surface EVENT_CHANNELS 增 exportCorpus 单向+schemas 增
  corpusItemSchema+export/corpus-item 通道+preload/env.d.ts 同源
  onExportCorpus——全 [locked-change]）+register.ts 通道注册（corpus-item
  消费端 main 侧 stub 或直接落 AI-03？**判定**：AI-02 只建 renderer 侧提取器
  与契约面，main 侧 corpus-item 消费落 AI-03——register 注册的 handler 在
  AI-02 以「会话未实现」折叠错误码回应（或注册面整体归 AI-03——按票面
  「AI-02 建通道，AI-03 main 侧消费」原文，通道注册归 AI-02、handler 实现
  归 AI-03，stub 返回 EXTRACT_UNAVAILABLE 类错误即可——开工时按最小面
  自决并记简报）。
- 测试：corpus-extractor.test.ts（多页夹具页界 \f/文本序/快照裁剪数学断言
  （离屏 canvas mock）/事件契约三面/背压序/迁移表跨格）；pdf-factory 扩
  多页变体（受锁扩展）。
- TDD+双门同 AI-01 流程；翻 done 前 STUB 删除。

### 任务二：SR2-AI-03 实现（预算内）
票面=corpus.export.service.ts 头注（态空间+十行迁移表+七行跨格+通道判定
+目录隔离守卫+幂等范围）。corpus.assemble.ts 延展（R12——禁两套装配）+
interface-template.ts+EXPORT_BUSY [受锁]+golden 幂等。

### 任务三（穿插）：AI-04/05 预算内顺延；C1 防线升级评估（ADR-0016）间隙穿插。

### 站间停点：2 单一会话（08-27 实测 AI-01 单（含工单化批次）≈55% 上下文；
AI-02 受锁面更大——预算紧即单边界停出 v3 交接）。

### 事件驱动（最高插队）
用户人工验收缺陷 → 双门修复单元。

## 3. 执行批次

1. §0 前置+双基线绿。
2. AI-02 实现（TDD+双门+提交）→ AI-03（预算内）。
3. 每站收官回写 ROADMAP 执行实况；**push 前问询用户**（除非用户本轮明示）。

## 4. 终止条件（预声明，沿用战役契约）

- 同一单元 deepseek 回炉 ≤2 次仍不收敛 → 停下升级用户；BLOCKING 携机器
  事实证伪重审一次；测试/契约问题→停下走 [locked-change]。
- 「不做」是合法结论但须 ADR+量化依据；无用户明示不 push、不打安装包。
- 上下文止损：约 60% 消耗预告，单边界停（交接书取代制承接）。

## 5. 基础设施与历史教训

- 双门审计器：`%TEMP%\synapse_workflow\deepseek_audit.py` 副本或 repo 内
  `scripts/deepseek_audit.py`（--mode diff|plan）；简报 briefs/ 累积制；
  **exit 2 伪影处置见 §0.5④**。
- 08-26 九条+08-27 四条摩擦常量全数有效（§0.5）。
- 版本口径：Electron 42.9.3+Node 24；测试一律 npm run test（ABI 前置）。
- 双门存档（本日）：Temp audits/ai-ticketing-plan-glm.md+ai01-impl-glm.md；
  简报 briefs/ai-ticketing-brief{,-r2}.md+ai01-impl-brief{,-r2}.md。

## 6. 关键指针（速查）

| 对象 | 位置 |
| --- | --- |
| AI-02 票面（首站） | src/renderer/features/reader/CorpusExtractor.ts 头注 |
| AI-03 票面 | src/main/services/export_/corpus.export.service.ts 头注 |
| AI-04/05 票面 | settings/CorpusExportSection.tsx+tools/ai-sensor/queue.mjs 头注 |
| ai_notes 基座（AI-01 交付） | migrations/003+repos/ai_notes.repo.ts+shared/models/ai-note.ts |
| INV-25（新） | docs/invariants.md（级联语义已锚定） |
| corpus 装配单源（AI-03 延展点） | src/main/services/export_/corpus.assemble.ts 头注 R12 条款 |
| IPC 契约受锁三件 | src/shared/ipc/{api-surface,schemas,app-error}.ts |
| 会话状态机母本 | ai-plan-review §6（已浓缩入 AI-03 票面——以票面为准） |
