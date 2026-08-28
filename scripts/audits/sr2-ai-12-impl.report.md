# SR2-AI-12 实现报告（组头补原始命题——缺陷 P2）

> 工单：scripts/audits/sr2-ai-12-brief.md v1（三屋模式实现者子代理产物）。
> 纪律执行：受锁必然红先行→实现→绿→变异红证×2（cp 备份法还原 diff 空）→全量 verify 真退出码落盘。

## 0. 开工技能清点（宪法会话开工纪律）

- test-driven-development：**用**（票面文化层硬要求，全程红→绿→变异红证）。
- verification-before-completion：**用**（verify 真退出码 0 落盘 §1；范围自查 git status/diff --stat）。
- systematic-debugging：**备用于卡点**（实际触发一次：tickets:check 拦截 src 注释工单号，见 §8-c，按先例口径修复非放宽检查）。
- subagent-driven-development：**不用**（本会话即实现者子代理，无再派发面）。
- git 工作流类：**不用**（实现者禁 git add/commit/push；取证仅 status/diff 只读）。
- 浏览器类/e2e 技能：**不用**（e2e 走既有 `npm run test:e2e` 管线，无手控浏览器面）。

## 1. 实现摘要

七问原始命题仓内此前零存在——本单在 `ai-note-style.ts`（跨域呈现单源，
INV-11）新增 `QUESTION_TEXT` 映射，七值**逐字誊自**蓝图 §4.2 七问 schema 表
「问题」列（`docs/reports/2026-08-25_ai-sensor-blueprint.md:147-153`，机器
抽取 diff 证据见 §5）。两消费位组头拼接
`${QUESTION_LABEL[q]}：${QUESTION_TEXT[q]}`（中文全角冒号）：

- reader 面板 `AiNoteGroupList.tsx` h4（AI-11 转置后组头位）；
- 脉络侧板 `LineageSideAiNotes.tsx:89` 一带 h5（同型）。

divergence 无蓝图表原文，类型级不入映射，两消费位编译器强制分支——组头
保持短标签「分歧报告」（AI-11 既有口径不回退）。LABEL 旧值零改；零 IPC、
零 shared 触碰。

## 2. 文件清单（恰 8 文件=票面范围 + 2 证据产物）

实现面（3，均 ≤500 行）：
- `src/renderer/features/reader/ai-note-style.ts`——新增 `QUESTION_TEXT`
  导出（+15 行净）+ 头注「原始命题单源」补名；
- `src/renderer/features/reader/AiNoteGroupList.tsx`——h4 拼接（divergence
  三元分支）+ import + 头注；
- `src/renderer/features/lineage/LineageSideAiNotes.tsx`——h5 同型拼接 +
  import + 头注。

受锁测试面（5，unlock→改→apply 同批，[locked-change] 由主控收口）：
- `tests/unit/renderer/ai-note-style.test.ts`——+1 it（TEXT 恰七键全非空
  + divergence 不入键集断言）+ import；
- `tests/unit/renderer/ai-notes-section.test.tsx`——3 it 断言新口径
  （原 :413/:457/:480 一带）；
- `tests/unit/renderer/lineage-side-panel.test.tsx`——:291 h5 新口径；
- `tests/e2e/ai-notes-section.spec.ts:131`——heading name 全形态；
- `tests/e2e/lineage.spec.ts:486`——heading name 全形态。

证据产物（不入库/由主控处置）：`scripts/audits/sr2-ai-12-verify.log`
（verify 全文+真退出码+还原证据；被 .gitignore 忽略）、本报告。

## 3. 首红证据（五处受锁必然红——实现前：新断言 vs 现实现）

命令：`npm run test -- tests/unit/renderer/ai-notes-section.test.tsx
tests/unit/renderer/lineage-side-panel.test.tsx tests/unit/renderer/ai-note-style.test.ts`
→ **EXIT=1，「5 failed | 42 passed (47)」**：

1. ai-note-style.test.ts ×1——「七问原始命题：TEXT 恰七键（Q1~Q7）全非空…」
   红（QUESTION_TEXT 尚不存在）；
2. ai-notes-section.test.tsx「分节分组…」红——AssertionError:
   `expected [ '第一问', '第二问', '分歧报告' ] to deeply equal
   [ '第一问：核心 idea 是什么', …(2) ]`；
3. 同文件「空组剔除…」红——`expected [ '第一问', '第三问' ] to deeply equal
   [ '第一问：核心 idea 是什么', …(1) ]`；
4. 同文件「divergence 组转置…」红——`expected '第一问' to be
   '第一问：核心 idea 是什么'`（:497 一带，新增 Q1 全形态断言）；
5. lineage-side-panel.test.tsx「文献节点四区渲染…」红——h5 期望
   `['第一问：核心 idea 是什么', '分歧报告']`。

e2e 红（实现前 build 现实现后跑）：
`npm run test:e2e -- -g "AI 笔记面板全链|T4 AI 笔记导入"` → **EXIT=1，2 failed**：
- ai-notes-section.spec.ts:131——Locator
  `getByRole('heading', { name: '第一问：核心 idea 是什么' })` →
  element(s) not found；
- lineage.spec.ts:486——同型（lineage-side-ai-notes 作用域内）not found。

## 4. 测试证据（绿证+变异红证+还原）

绿证：
- 三单测文件：**EXIT=0，47 passed（3 files）**（基线 46+1 新 it）；
- typecheck：EXIT=0（tsc node+web 双 project）；
- e2e 两用例：**EXIT=0，2 passed（21.3s）**；注释修正+最终 build 后复跑
  **EXIT=0，2 passed（20.5s）**；
- 全量 `npm run verify`：**EXIT=0，95 文件 744 用例全绿**（详见 §7）。

变异红证（cp 备份法：cp 备份→变异→测红→cp 还原→diff 空；全程未用
git checkout）：

- **变异一（删拼接）**：AiNoteGroupList h4 回退
  `{QUESTION_LABEL[g.question]}` → 面板测试 **EXIT=1，3 failed | 21 passed
  (24)**（分节分组/空组剔除/divergence 组转置三 it 全红，AssertionError
  `'第一问' vs '第一问：核心 idea 是什么'`）。还原：
  `cp /tmp/mut1-AiNoteGroupList.tsx.bak → 源文件`，`diff 备份 vs 还原后`
  **输出空，DIFF_EXIT=0**；还原时 `git diff --stat` 该文件=7 insertions/
  3 deletions（恰未提交实现面，无变异残留）。
- **变异二（删映射键 Q3）**：QUESTION_TEXT 删 Q3 行 → TEXT it
  **EXIT=1，1 failed | 2 passed (3)**（AssertionError:
  `expected [ 'Q1','Q2','Q4','Q5','Q6','Q7' ] to deeply equal 七键`——
  键集断言拦截）。还原：cp 同法，diff **空，DIFF_EXIT=0**；还原时全仓
  `git diff --stat` 恰 8 文件=票面范围。
- 还原后复绿：三单测文件 **EXIT=0，47 passed**。
- 还原证据已落盘 `scripts/audits/sr2-ai-12-verify.log` §2（含时间序声明：
  src 注释工单号修正发生在两变异还原**之后**，故 /tmp 备份与最终文件差异
  仅为该注释修正，非变异残留）。

## 5. 誊录逐字 diff 证据（P3——机器抽取，零手工复写）

方法：从蓝图 md :147-153 机器抽取「问题」列（awk -F'|' 去首尾空白），
从 ai-note-style.ts 的 QUESTION_TEXT 块机器抽取七值（sed 范围+正则），
两文件 diff：

```
蓝图原文列（机器抽取）          实现映射值（机器抽取）
Q1  核心 idea 是什么            Q1  核心 idea 是什么
Q2  对同行的价值（改变了认知方式？开创范式大幅加快计算？解决工程问题？）
Q3  工程债务：失败数据未记录处、潜在试错点（ARA 叙事税的逆向重建）
Q4  学术谱系：为什么是这个单位、这个学生/作者？师承何方、祖传资源积累
Q5  全文哪个片段最符合自然科学品味（深刻≠复杂：可迁移/结构普遍/可交叉印证）
Q6  未声明的局限与适用边界
Q7  验证强度
```

`diff 蓝图抽取 实现抽取` → **输出空，DIFF_EXIT=0**（七行逐字一致，含
括注与全角标点）。誊录前已按票面 P3 重 Read 蓝图 :143-156 原文核对。

## 6. locks 实录

- `npm run locks:unlock`：已解锁 144 个文件（与 dispatch 基线 locks 144 一致）；
- 同批改 5 个受锁测试文件（§2 清单）；
- `npm run locks:apply`：已锁定 144 个文件，manifest 记录 144 条——
  `git diff --stat locks/manifest.json` = 12 行（generatedAt + 5 受锁文件
  sha256 各一对，无范围蔓延）；
- verify 内含 locks:check，绿（§1）。

## 7. verify 真退出码

`npm run verify`（quality+tickets+locks+lint+typecheck+test+build 同 CI
口径）→ **VERIFY_EXIT=0**；Test Files **95 passed (95)**，Tests
**744 passed (744)**。用例对账：dispatch 基线 743+本单 1 新 it=744 吻合
（票面 §3 写 741 为旧数，以实测为准）。证据全文：
`scripts/audits/sr2-ai-12-verify.log` §1。

## 8. 自裁申报（超票面决定）

- **a. QUESTION_TEXT 类型**：票面 P1 写 `Record<AiNoteQuestion, string>`，
  但同条要求「divergence 不入本映射」——而 `AiNoteQuestion` 实含八键
  （`src/shared/models/ai-note.ts:20-21`，divergence 在枚举内；票面括注
  「它非 AiNoteQuestion 枚举值」与代码事实不符，判票面笔误）。两要求在
  `Record<AiNoteQuestion,...>` 下类型级互斥，取「divergence 不入」为准：
  类型改 `Record<Exclude<AiNoteQuestion, 'divergence'>, string>`，两消费位
  由编译器强制 divergence 分支（组头保持短标签「分歧报告」——与 AI-11
  「divergence 独立组头」既有断言兼容，五处受锁断言中 divergence 期望值
  均未改即证）。
- **b. :480 一带 it 的必然红法**：该 it 的 divergence 组头断言（'分歧报告'）
  按设计不变；为满足必然红要求，在同 it 内**新增** Q1 全形态断言
  （groups[0] h4 = '第一问：核心 idea 是什么'），实现前该 it 因新断言红。
- **c. src 注释工单号口径**：首次 verify 红于 tickets:check——src 内注释
  「SR2-AI-12」被机检为引用不存在的 registry 工单号（本单系 audits 简报
  工单；实现者禁翻 registry 故不可注册）。按先例（AI-11 的 src 注释用
  「2026-08-28 缺陷 F」日期+缺陷锚、无工单号）将三处 src 注释改
  「2026-08-28 复测三问题 P2」；tests/ 文件内 SR2-AI-12 字样保留
  （tickets:check 扫描面不含 tests，先例 SR2-AI-08/SR2-AI-11 同在其内）。
  未改任何检查脚本。
- **d. e2e heading 断言形态**：以全形态字符串替换旧短名，未加
  `exact: true`（沿用既有 getByRole 风格）。锁定有效性：查询名长于回退态
  可达名（短标签）时子串匹配不命中→回退即红；e2e 红证（§3）已实证。
- **e. 基线对账**：票面 §3 基线 741 vs dispatch 743；实测 743+1=744（95
  文件），以 dispatch/实测为准申报。

## 9. 疑虑

- locks/manifest.json 经 PowerShell 重写带 CRLF（git 提示 next touch 转
  LF）；verify 内 locks:check 已绿（对账按 LF 口径成立），主控提交时
  .gitattributes 会规范化——建议收口单留意 manifest 与提交同步（宪法
  「即时 locks:apply」条）。
- getByRole name 默认子串匹配：「分歧报告」断言（e2e :132/:487）当前
  唯一命中；若未来七问文案含「分歧报告」子串需收紧 exact——现无此面。
- 蓝图七问为 v1 冻结；若演进，QUESTION_TEXT 需同步誊录+[locked-change]
  ——TEXT 键集断言会拦漂移（变异二实证）。
