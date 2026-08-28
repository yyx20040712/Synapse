# SR2-AI-11 AI 笔记呈现轴转置（缺陷 F：问题N 分组+一审/二审分段）——票面 v1

> 来源：2026-08-28 用户真机验收反馈缺陷 F，用户口径「问题一 + 问题内容:
> 一审:xxx。二审:xxx。裁决:xxx。」——取证定性见
> `docs/prompts/2026-08-28_loop-handoff.md` §2F。**确定级**：现渲染=role
> 优先分组（AiNoteGroupList.tsx:18-22 groupNotes 按 ROLE_ORDER 三组，组内
> 平铺 question 条目）；用户要 question 优先分组、组内按 role 分段——
> 正好转置。验收修复役 U5。
> 纪律：三屋模式；实现者禁 git/registry；取证禁触 tickets/。

## 1. 主控预裁项

- **P1 转置=groupNotes 重写**：`AiNoteGroupList.tsx` groupNotes 按
  `AI_NOTE_QUESTIONS` 序（shared/models/ai-note.ts:20 单源，Q1~Q7+divergence）
  分组：`Array<{ question: AiNoteQuestion; items: AiNote[] }>`（空组剔除）；
  组头=QUESTION_LABEL+QUESTION_COLOR 色条（两映射单源 ai-note-style.ts:16-37
  已在）；组内条目头加 ROLE_LABEL 小标签（「一审:」前缀或徽标样式——
  实现者自裁并申报，验收=role 可辨）。条目其余（色点/quote/content/定位/
  高亮）零改。
- **P2 ROLE_LABEL 改「一审/二审/裁决」**：ai-note-style.ts:40-47 单源改
  三值——三消费方（reader 面板 AiNoteGroupList+脉络侧板
  LineageSideAiNotes+标注层 tooltip AiAnnotationLayer）同步生效（单源性质，
  禁改三处）。ROLE_ORDER 注释同步（「一读→二读」→「一审→二审」）。
- **P3 LineageSideAiNotes.tsx:79-107 同步转置**：自写 role 分组（内联
  ROLE_ORDER.filter 链）改为 question 分组+组内 role 标签——**与
  AiNoteGroupList 保持视觉一致**（Rule of Three 第 2 次重复维持两处，
  第 3 次出现时再抽公共件——维持裁决，不抽组件；此票内两处分组逻辑
  形状一致即可）。双击定位/空态/重试零改。
- **P4 数据模型零改**：`src/shared/models/ai-note.ts` 锁内**不动**
  （AiNote.question 天然分组键/role 组内段键，枚举不变）；AiNoteGroupList
  导出面：groupNotes 签名变更（返回 question 分组）——消费方=组件自身+
  ai-notes-section.test（受锁同步），无其他生产消费方（grep 核对）。
- **P5 受锁三文件**（[locked-change]，unlock→改→apply）：
  - `tests/unit/renderer/ai-note-style.test.ts`（2 it——ROLE_LABEL 文案
    断言同步「一审/二审/裁决」）；
  - `tests/unit/renderer/ai-notes-section.test.tsx`（20 it——分组结构断言
    全量核对：role 组断言→question 组断言；组内 role 标签断言新增）；
  - `tests/e2e/ai-notes-section.spec.ts`（4 test——分组/文案 e2e 断言同步）。
- **P6 新增断言面**（受锁文件内加 it，不新建文件——域锚定既有三件）：
  ①question 分组序=AI_NOTE_QUESTIONS 序（非字典序非输入序）；②空组剔除
  （无 Q3 条目则无 Q3 组头）；③组内 role 标签呈现；④divergence 组同样
  转置（非七问之外的特殊组）。

## 2. 五层规约

**─ 行为层 ──**：呈现轴=question 优先（组头「第一问…第七问/分歧报告」+
分色条），组内条目按 role 分段标注（一审/二审/裁决）；无条目的问题组不
渲染。数据入参序无关（分组序=AI_NOTE_QUESTIONS 单源）。

**─ 接口层 ──**：groupNotes 返回形状变更（role 轴→question 轴）；
AiNoteGroupList/LineageSideAiNotes props 零改；ai-note-style 导出面零增删
（仅 ROLE_LABEL 三值与注释）。

**─ 架构层 ──**：零依赖；INV-11 单源模式保持（QUESTION_*/ROLE_* 唯一
出处不动）；shared 锁内零触碰。

**─ 生命周期层 ──**：不做：抽公共分组组件（第 3 次重复触发条件未到）；
md 渲染（负面清单）；AI-09 标注层 tooltip 结构改（ROLE_LABEL 值变更自动
生效即可）。

**─ 文化层 ──**：TDD——受锁断言先红（改断言到新口径→现实现红）→实现→
绿→变异红证 ≥2（①groupNotes 回退 role 轴→分组序 it 红；②ROLE_LABEL 回退
「一读」→文案 it 红；cp 备份法还原）→受锁 e2e spec 改动后全量 verify
（tsc 关卡）。报告落 `scripts/audits/sr2-ai-11-impl.report.md`，回复五行内。

## 3. 机检兼容自查

无 TODO/FIXME/placeholder；UTF-8；node24 前缀；locks unlock→三文件→apply；
基线 verify 全绿（用例增量自报）；e2e 基数随 U1/U2 激活后实况申报。
