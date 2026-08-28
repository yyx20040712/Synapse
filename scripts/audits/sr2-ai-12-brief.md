# SR2-AI-12 组头补原始命题（缺陷 P2：「第一问」组头对不上号）——票面 v1

> 来源：2026-08-28 复测三问题 P2（测试 3：AI 笔记组头只有「第一问」短标签，
> 读者对不上号）。取证定性见 `docs/prompts/2026-08-28_retest3-handoff.md` §2B。
> **根因**：组头仅渲染 QUESTION_LABEL 短标签（`ai-note-style.ts:28-37`）；
> 七问原始命题完整文本仓内零存在——唯一完整源=
> `docs/reports/2026-08-25_ai-sensor-blueprint.md:143-156` 七问 schema 表。
> 纪律：三屋模式；实现者禁 git/registry；取证禁触 tickets/。

## 1. 主控预裁项

- **P1 修法=ai-note-style 单源新增映射+两消费位拼接**：
  - `src/renderer/features/reader/ai-note-style.ts` 新增
    `export const QUESTION_TEXT: Record<AiNoteQuestion, string>`——文本
    **逐字誊自**蓝图表 Q1~Q7（保持原文完整句；divergence 分歧报告不入
    本映射——它非 AiNoteQuestion 枚举值）。LABEL 旧值不改。
  - 两消费位组头拼 `${QUESTION_LABEL[q]}：${QUESTION_TEXT[q]}`：
    ①reader 面板 `AiNoteGroupList`（AI-11 转置后组头位）；
    ②`LineageSideAiNotes.tsx:89` h5（同型）。
  - 纯 renderer 呈现面：零 IPC、零 shared 触碰；ai-note-style=跨域呈现
    单源（头注 :6-10 既有声明），新映射自动同源到达脉络侧板，合 INV-11。
- **P2 受锁面（必然红 5 处——AI-11「受锁必然红扩容」口径援引，逐文件
  申报+门一逐条核准）**：
  - `tests/unit/renderer/ai-notes-section.test.tsx:413/:457/:480` 组头精确
    断言（旧值「第N问」→新值「第N问：原始命题」）；
  - `tests/unit/renderer/lineage-side-panel.test.tsx:291` h5 同型；
  - `tests/e2e/ai-notes-section.spec.ts:131`；
  - `tests/e2e/lineage.spec.ts:486`（heading name='第一问' 全字匹配）。
  - 新增：`tests/unit/renderer/ai-note-style.test.ts` TEXT 映射七问全键
    非空断言（受锁文件加 it）。unlock→改→apply 同批。
- **P3 誊录纪律**：蓝图表原文先 Read 核对再誊——**禁止凭记忆复写**
  （誊录后 diff 蓝图原文逐字比对，入 impl.report 证据）；中文标点保持原样。
- **P4 不做**：组头折叠/tooltip 呈现形态；QUESTION_LABEL 改值；
  LineageSideManualNote 面（无组头概念）。

## 2. 五层规约

**─ 行为层 ──**：AI 笔记面板与脉络侧板组头均为「第N问：原始命题」形态
（如「第一问：核心 idea 是什么」——以蓝图原文为准）。

**─ 接口层 ──**：ai-note-style.ts +1 导出映射；两消费位组头文案行；
其余零触碰（AiNoteQuestion 类型/枚举序不动）。

**─ 架构层 ──**：跨域呈现单源机制沿用（LineageSideAiNotes 白名单受控
例外既有——本单不新增跨域引用面）。

**─ 生命周期层 ──**：不做：命题文案的设置面可配置化；两呈现位差异化
（面板全量/侧板截断——同文案同源）。

**─ 文化层 ──**：TDD——受锁 5 处必然红先行（实现前跑一次截图留证）→
实现→绿→变异红证 ×2（删拼接→面板 it 红；删映射键→TEXT 非空 it 红；
cp 备份法还原 diff 空）→受锁文件改动后全量 verify。报告落
`scripts/audits/sr2-ai-12-impl.report.md`，回复五行内。

## 3. 机检兼容自查

无 TODO/FIXME/placeholder；UTF-8；node24 前缀；locks unlock→改→apply
（受锁文件批次清单自报）；verify 真退出码落盘；基线=95 文件 741 用例
（本单 it 增量自报）。
