# SR2-AI-11 实现报告 —— AI 笔记呈现轴转置（缺陷 F：问题N 分组+一审/二审分段）

> 实现者子代理报告（三屋模式，2026-08-28）。票面：`sr2-ai-11-brief.md`。
> 状态：**完成**——verify EXIT=0 / e2e 24 passed+0 skip EXIT=0 / locks 144 一致 / 变异红证 ×2。

## 1. 实现摘要

呈现轴从 role 优先转置为 question 优先（用户口径「问题一 + 一审:xxx 二审:xxx 裁决:xxx」）：

- **groupNotes 转置**（AiNoteGroupList.tsx:22-29）：按 `AI_NOTE_QUESTIONS` 单源序
  （Q1~Q7+divergence）分组，返回 `Array<{ question: AiNoteQuestion; items: AiNote[] }>`；
  空组剔除；组内条目按 `ROLE_ORDER` 排序（一审→二审→裁决）。
- **组头形态**：`<h4>`/`<h5>` 文本=QUESTION_LABEL + 左缘 3px 竖色条
  （`borderLeft: 3px solid QUESTION_COLOR[q]`，pl-1）——色条复用 QUESTION_COLOR 单源。
- **组内条目头**：原「色点+QUESTION_LABEL·p.N」改为「色点+ROLE_LABEL·p.N」——
  role 标签顶替原 question 标签位置（组头已单示 question，条目内保留会同组重复；
  票面「条目其余（色点/quote/content/定位/高亮）零改」五项枚举不含 QUESTION_LABEL，
  顶替属自裁面，见 §7）。条目其余结构零改。
- **ROLE_LABEL 三值**（ai-note-style.ts:39-47）：一读→一审 / 二读→二审 / 裁决不变；
  ROLE_ORDER 注释同步「一审→二审→裁决」。
- **LineageSideAiNotes 同步转置**（自写分组 `AI_NOTE_QUESTIONS.filter` 链，与
  AiNoteGroupList 形状一致，不抽公共件——Rule of Three 第 2 次保持裁决）；
  双击定位/空态/重试/ stale 守卫零改。
- **头注接缝同步**：AiNotesSection 分节描述+divergence 预留行（转置后独立组已兑现）；
  AiNoteGroupList/LineageSideAiNotes 头注转置描述。
- shared 零触碰（AI_NOTE_QUESTIONS/AI_NOTE_ROLES 只读消费）。

## 2. 文件清单（10 文件，git diff --stat 无范围蔓延）

生产（4）：
- `src/renderer/features/reader/ai-note-style.ts` —— ROLE_LABEL 三值+注释
- `src/renderer/features/reader/AiNoteGroupList.tsx` —— groupNotes 转置+渲染+头注（100 行）
- `src/renderer/features/lineage/LineageSideAiNotes.tsx` —— 同步转置+头注（121 行）
- `src/renderer/features/reader/AiNotesSection.tsx` —— 头注接缝同步（250 行，未超限）

受锁（5，unlock→改→apply）：
- `tests/unit/renderer/ai-note-style.test.ts` —— 文案 it 断言「一审/二审/裁决」
- `tests/unit/renderer/ai-notes-section.test.tsx` —— 分组 it 改写 question 轴 + P6 新增 4 it（20→24）
- `tests/unit/renderer/lineage-side-panel.test.tsx` —— 区3 断言 data-question+组头文案+role 标签
- `tests/e2e/ai-notes-section.spec.ts` —— heading 第一问/分歧报告 + 条目 toContainText 一审/裁决
- `tests/e2e/lineage.spec.ts` —— T4 侧板 heading/`div[data-question]` 定位/注释

其他（1）：
- `locks/manifest.json` —— locks:apply 重生成（5 测试文件 hash 同步，流程必然）

## 3. 首红证据（TDD 档①）

断言改写后、实现前，跑 3 受影响单测文件：

```
Test Files  3 failed (3)
     Tests  7 failed | 39 passed (46)
```

7 failed = ai-note-style 文案 it ×1 + ai-notes-section 分组 it ×5（含新增 4）+
lineage-side-panel 区3 it ×1——全部为新口径断言 vs 现 role 轴实现的预期红。

## 4. 变异红证（TDD 档④，cp 备份法，禁 git checkout）

**变异①（groupNotes 回退 role 轴）**：cp 备份→函数体换回
`ROLE_ORDER.map(...n.role===role...)`（esbuild 不查类型可跑）→
`npx vitest run ...ai-notes-section.test.tsx -t "分组序单源"`：
```
× 分组序单源：乱序输入仍按 AI_NOTE_QUESTIONS 序（非输入序——呈现轴=shared 单源）
Tests  1 failed | 23 skipped (24)    MUT1_EXIT=1
```
→ cp 还原 → `diff` 空（RESTORE1_OK）。

**变异②（ROLE_LABEL 回退「一读」）**：cp 备份→`'first-read': '一读'`→
`npx vitest run ...ai-note-style.test.ts`：
```
× role 三组中文标签+呈现序（一审/二审/裁决——SR2-AI-11 转置口径）
Expected: "一审"   Received: "一读"
Tests  1 failed | 1 passed (2)       MUT2_EXIT=1
```
→ cp 还原 → `diff` 空（RESTORE2_OK）。还原后 3 文件 46 用例复绿（EXIT=0）。

## 5. verify / e2e 真退出码

- `npm run verify` → **VERIFY_EXIT=0**（quality 无占位/乱码/跨域 + tickets 114 open 0 +
  locks 144 一致 + lint + typecheck + test 95 文件 **741** 用例 + build）。
  日志：/tmp/sr2-ai-11-verify.log（两轮：首首轮 quality 拦「xxx」占位与 252 行超限、
  次轮 tickets 拦 SR2-AI-11 工单号引用，均已修正后全绿——过程见 §7/§8）。
- `npm run test:e2e` → 首轮 23 passed+1 failed：新加 `getByText('一审',{exact:true})`
  失败（条目头 span 文本=「一审 · p.1」，exact 整节点匹配不中）→ 改
  `locator+toContainText`（受锁再 unlock→改→apply + 全量 verify 复绿 EXIT=0）。
  次轮 23 passed+1 failed：**reader-scroll F-04 收官链 flaky**（selectText
  "Element is not attached to the DOM"——该 spec 自身测离屏回收，文本层重挂载竞态，
  与本票改动面零交集）→ 单独重跑 2 passed EXIT=0 → 末轮全量
  **24 passed + 0 skip，E2E_FINAL_EXIT=0**。日志：/tmp/sr2-ai-11-e2e-final.log。

## 6. locks 实录

unlock（144 解锁）→ 改 5 受锁测试 → 首次 apply（144 重锁）→ e2e spec 修复二次
unlock→改→apply（144 重锁）→ verify 内 locks:check「144 个受锁文件与 manifest 一致」。
manifest 变更随受锁文件 hash 同步重生成（locks/manifest.json，git 提示 CRLF→LF
转换警告为 locks 工具链既有行为）。

## 7. 自裁申报

1. **组头样式**：h4（reader 面板）/h5（脉络侧板，保持既有层级差）+ 左缘 3px
   QUESTION_COLOR 竖色条 + pl-1——色条即「分色组头」，复用既有分色单源不引新色。
2. **role 标签形态**：纯文本前缀「一审/二审/裁决」占原 QUESTION_LABEL 位置
   （同 span 内拼「 · p.N」页码），非徽标——与用户口径「一审:xxx」最贴形，
   且不新增 DOM 层级。
3. **组内条目序**：按 ROLE_ORDER 排序（一审→二审→裁决）——「组内按 role 分段」
   的实现形态=排序+标签（非嵌套小节），贴用户口径且结构最简。
4. **条目头 QUESTION_LABEL 顶替删除**：票面「条目其余零改」五项枚举（色点/
   quote/content/定位/高亮）不含它；组头已单示 question，保留会同组重复。**此为
   超字面自裁，请门一裁**。
5. **受锁第五文件（票面清单外必然同步）**：P3 改 LineageSideAiNotes 渲染结构 →
   `lineage-side-panel.test.tsx` 区3 断言（data-role/「一读」组头）与
   `lineage.spec.ts` T4 断言（heading 一读/data-role 定位）必然红——接缝归责
   同步改写，两文件 test 数不变。
6. **e2e spec「4 test」实况**：ai-notes-section.spec.ts 实际 **2 test**（票面写 4，
   数字与文件不符）；分组/文案 e2e 断言另涉 lineage.spec.ts T4 1 test。按文件
   实况改写，test 数均不变；skip 守卫（DEPS=isTicketDone）按既有形态保留未动。

## 8. 过程卡点与处置（均已自行消化，非 BLOCKED）

1. quality 拦「xxx」：头注引用户口径含「一审:xxx」→ 改「一审/二审/裁决分段」描述。
2. AiNotesSection 251/252 行超 250 限：头注扩行 → 压缩回 250 行内。
3. tickets:check 拦「SR2-AI-11 引用不存在的工单号」×5：registry 未建本票单
   （票面明示不建）→ src 五处工单号字样改描述性「呈现轴转置 2026-08-28 缺陷 F」
   （tests 不在扫描面，测试内 SR2-AI-11 注记保留）。
4. e2e getByText exact 不中同 span 拼接文本 → locator+toContainText。

## 9. 疑虑

- **P2「三消费方」与 grep 事实不符**：AiAnnotationLayer 只消费 QUESTION_COLOR
  （tooltip=title contentMd），**不消费 ROLE_LABEL**——ROLE_LABEL 生产消费方实为
  两处（AiNoteGroupList+LineageSideAiNotes），单源改值后两处自动生效已验；
  AiAnnotationLayer 无「自动生效面」（票面预裁事实澄清，非冲突，未动该文件）。
- main 侧 `export/corpus.assemble.ts:84` 有同名 ROLE_ORDER（排序权重 Record，
  语义无关）——未动，特此锚定防误伤。
- 基线「工单 115 open 0」vs verify 实测「共 114 open 0」——registry 近期或有
  收口变动，未触 tickets/（禁令），请主控核对基线数字口径。
- reader-scroll F-04 e2e 存在既有 flaky（离屏回收文本层竞态，单测重跑即绿）——
  本票面外，建议另立观察项。

## 10. 基线对账

| 项 | 基线 | 完成后 |
| --- | --- | --- |
| 单测 | 95 文件 737 用例 | 95 文件 **741**（+4 新增 it：分组序单源/空组剔除/组内 role 标签/divergence 转置） |
| e2e | 24 passed+0 skip | 24 passed+0 skip（spec 数不变） |
| locks | 144 | 144（manifest hash 同步） |
| 工单 | 115 open 0 | 实测 114 open 0（见 §9 疑虑） |
