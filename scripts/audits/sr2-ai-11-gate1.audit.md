# SR2-AI-11 门一对抗深审（gate1）——AI 笔记呈现轴转置（缺陷 F）

> 审计人：门一对抗深审子代理（三屋模式，2026-08-28）。只读审计，未跑
> npm/test/构建，未触 tickets/（仅只读 grep），无 git 写。
> 输入：`sr2-ai-11-gate1.diff`（12 文件=实现 10+brief/report 两产物）+
> `sr2-ai-11-brief.md` + `sr2-ai-11-impl.report.md` + 六源文件/五受锁测试抽读。

## 0. 技能清点回执（开工纪律）

code-review-excellence（用——本职缺陷分级与证据方法）/ javascript+e2e
testing patterns（用轻——flaky 静态推演与断言强度复核）/ systematic-debugging
（不用——只读静态无调试面）/ TDD（不用作流程——只复核实现者红绿证迹）/
其余环境技能与 Electron+TS 单机应用审计无关联不用。

## 1. 复核重点逐条定性

### 1.1 受锁面 3→5 扩容（复核重点 1）——【正当，N】

- `tests/unit/renderer/lineage-side-panel.test.tsx` 旧区3 断言
  `querySelectorAll('[data-role]')`（旧 :287 一带）+ 组头 `['一读','裁决']`：
  转置后组件渲染 `data-question`（LineageSideAiNotes.tsx:84）、组头=
  QUESTION_LABEL（:89）→ 旧断言**必然红**（data-role 属性消失+组头换轴+
  ROLE_LABEL 改值三重必然）。
- `tests/e2e/lineage.spec.ts` T4 旧断言 heading `'一读'`/`'裁决'` +
  `div[data-role=…]` 定位（旧 :485-495 一带）：同因**必然红**（heading 已
  换 QUESTION_LABEL，data-role 属性不存在）。
- fixture 自洽核验（静态）：T4 fixture 两条=first-read/Q1+
  adjudicate/divergence（lineage.spec.ts:443-464）→ 新断言
  `div[data-question="Q1"]` 黄/`div[data-question="divergence"]` 红
  （:488-496）恰可命中；ai-notes-section.spec fixture 同构两条
  （:88-108）→ `groupedItems.first()` 含'一审'（Q1 组唯一条目）、
  `nth(1)` 含'裁决'（divergence 组条目）——**旧 role 轴实现下该断言
  必红**（旧文案'一读'不含'一审'），转置锚有效。
- 多余改动检查：lineage.spec 注释两处（:439 `两 role=两组分节`→
  `两 question`；:481 ⑤注释）属旧注释与新实现互斥的**接缝归责必然
  连带**（AGENTS 接缝纪律）；无顺手改面。
- 唯一超「必然红最小集」者：lineage-side-panel.test.tsx:292-293 新增
  两行 role 标签 expect（'一审'/'裁决'）——见 W1。

### 1.2 条目头 QUESTION_LABEL 被 ROLE_LABEL 顶替（复核重点 2）——【合理自裁，N】

- 用户口径「问题一 + 内容：一审:xxx。二审:xxx。裁决:xxx。」= 组头
  question、条目头 role——顶替后恰合口径；组内条目重复问题名确属冗余。
- 票面 P1 五项零改枚举（色点/quote/content/定位/高亮）**不含
  QUESTION_LABEL**，字面留口；实现者按纪律超字面申报请裁（impl.report
  §7.4）。
- 信息保留核验（AiNoteGroupList.tsx:58-93 / LineageSideAiNotes.tsx:94-114）：
  色点 QUESTION_COLOR ✓、`· p.N`（anchorPage null 安全）:82/:106 ✓、
  quoteText/contentMd ✓、onClick onLocate:71 / onDoubleClick:100 ✓、
  data-highlight 高亮:59-70 ✓；条目级 question 辨识由组归属+同色色点
  保留。**裁定顶替成立，无需回炉。**

### 1.3 AiAnnotationLayer 不消费 ROLE_LABEL（复核重点 3）——【票面取证误差，N】

- grep 证实：ROLE_LABEL 生产消费仅 AiNoteGroupList.tsx:81 +
  LineageSideAiNotes.tsx:105（+定义处 ai-note-style.ts:40）。
  AiAnnotationLayer.tsx:58 只 import QUESTION_COLOR（:162 消费色），
  零 ROLE_LABEL——票面 P2「三消费方」第三处不存在，属**票面取证
  误差**；实现者未动该文件正确（无自动生效面可验）。

### 1.4 基线工单 115 vs 实测 114（复核重点 4）——【口径未闭环，W3】

- 静态实测：`grep -cE "^\s*\{ id: '" tickets/registry.ts` = **115**，
  `status: 'done'` 115 / open 0——主控口径得证；check-tickets.mjs:200
  输出 `共 ${tickets.length}`（registry 全量解析）。
- 实现者 verify 实测 114 → 其运行时点 registry 为 114 条；§10 基线 115
  与实测 114 的**递减**无法用「实现者触单」解释（禁令遵守，报告自证），
  只能是外部时序变动或转录误差，静态不可定谳。
- 实质面：open=0 两口径一致，不影响本票。**处置建议**：主控收口单
  亲验 verify 时对账闭环即可，无回炉面。

### 1.5 reader-scroll F-04 既有 flaky（复核重点 5）——【票外真实风险面，W2】

- 静态推演（reader-scroll.spec.ts:218-236）：四段 fit-width 点击
  （:219，**第二次 zoom 变化**）→ `expect.poll(centerPageBox)` +
  `getByText(P3…).toBeVisible(10s)` 通过后**立即** :231-232
  `const known3 = …; await known3.selectText()`。
- 竞态机制精确化：toBeVisible 通过≠文本层 DOM 稳定——zoom 变化触发
  页列重布局/文本层 React 重挂载，`selectText()` 为**一次性非
  auto-retry 动作**，元素在动作执行瞬间 detach 即抛 "Element is not
  attached to the DOM"（无 expect.poll/重试包裹——这是 flaky 根面）。
- 与本票零交集成立：该 spec 无任何 AI 笔记消费面。**处置建议**：
  遗留池立项（修复方向：selectText 包 `expect(…).toPass()` 重试或
  前置 DOM 稳定断言），不阻本票收口。

### 1.6 断言强度与消费面闭合（复核重点 6）——【闭合，N】

- groupNotes 生产消费面闭合：grep 全 src 唯一消费=组件自身
  （AiNoteGroupList.tsx:37），AiNotesSection 经组件间接；tests 零直接
  import（经 mount 整组件 DOM 断言）——签名变更面闭合 ✓。
- 分组序断言（ai-notes-section.test.tsx:628-644）：夹具乱序输入
  [divergence,Q5,Q1,Q2]→期望 [Q1,Q2,Q5,divergence]，**有效排除输入序**；
  「非字典序」维度：AI_NOTE_QUESTIONS=['Q1'..'Q7','divergence']
  （shared/models/ai-note.ts:20）在 JS 字符串序下**字典序≡单源序**
  （大写 Q<小写 d），反例数学上不可构造——系枚举命名所致的逻辑空洞，
  非夹具缺陷；且期望值由 `AI_NOTE_QUESTIONS.filter(...)` 现算（:641-643），
  天然锁单源序，未来枚举扩位（如 Q10<Q2 字典序倒挂）时自动获区分力。
- divergence 组转置断言 ✓（:678-690，独立组头'分歧报告'+组内 role 标签
  仍在）；空组剔除 ✓（:646-656）；组内 role 标签+ROLE_ORDER 序 ✓
  （:658-676，三 role 乱序入→a1,b1,c1 序出）。
- 两处视觉一致性：面板 h4 vs 侧板 h5（保持既有层级差），组头同构
  （QUESTION_LABEL+3px borderLeft QUESTION_COLOR+pl-1），条目同构
  （色点+ROLE_LABEL·p.N+quote+content），分组空组剔除两式语义等价
  （map后filter vs some先filter）——票面 P3「形状一致」满足 ✓。

### 1.7 常规项（复核重点 7）

- **TDD 四档**：①首红留存——7 failed 复算自洽（ai-note-style 文案 ×1 +
  ai-notes-section 分组 it ×5 含新增 4 + lineage-side-panel 区3 ×1 =
  7；3 文件 46 用例）✓；③变异 ×2 恰中（MUT1 杀「分组序单源」it/
  MUT2 杀文案 it，各 1 failed 粒度正确，均带真退出码）✓；④cp 还原
  diff 空自述（RESTORE1/2_OK；/tmp 日志静态不可核，已注明）✓。
  ②绿=verify 741（+4 恰=P6 四项）✓。
- **e2e 先红未实测**：受锁 e2e 断言未在旧实现下先跑红（需 build 旧
  实现，成本面）；由单测同口径断言先红+末轮全量绿+首轮 23+1（1 失败
  即新 e2e 断言 exact 写法缺陷被真执行捕获）覆盖，票面文化层「受锁
  e2e 改后全量 verify（tsc 关卡）」已满足——N，记录不扣。
- **UTF-8**：全部抽读文件中文可读 ✓。**TODO/FIXME/placeholder**：九个
  改动文件 grep 零命中 ✓。
- **行数实算**：AiNoteGroupList 100 / LineageSideAiNotes 121 /
  AiNotesSection **249**（报告称 250，误差 1 行无实质）/ ai-note-style 47
  ——组件 ≤250 全合规 ✓。
- **e2e 24+0**：静态计数 tests/e2e 七 spec `^\s*test\(` 总数=**24**
  （ai-notes-section 2+corpus-export 1+lineage 4+zcode-link 1+
  reader-text 10+reader-scroll 2+smoke 4）✓；spec 数不变 ✓；
  ai-notes-section.spec「4 test」票面笔误属实（实 2，实现者 §7.6 申报）。
- **locks**：manifest 5 hash 同步+generatedAt 更新，144→144 流程自洽 ✓。
- 头注工单号规避（「SR2-AI-11」→描述性字样，tickets:check 扫描面外）
  系机检合规处置，tests 内注记保留——合规 ✓。

## 2. 工单清单（A~E 标准分级）

| # | 级 | 工单 | 证据 |
| --- | --- | --- | --- |
| W1 | W | lineage-side-panel.test 区3 同步改写中新增 2 行 role 标签 expect，超「必然红最小集」——有申报（impl.report §2/§7.5）、与 P1 验收「role 可辨」直接相关、不加 it 不加文件、增强接缝覆盖，不构成 B 级范围蔓延 | tests/unit/renderer/lineage-side-panel.test.tsx:292-293 |
| W2 | W | reader-scroll F-04 既有 flaky（票外）：selectText 一次性动作撞 fit-width 后文本层重挂载窗口，无重试包裹——建议遗留池立项 | tests/e2e/reader-scroll.spec.ts:231-232（根面 :218-236） |
| W3 | W | 工单基线 115 vs verify 实测 114 口径未闭环（当前 registry 115 全 done、open 0；递减无法归责实现者，疑外部时序/转录）——主控收口亲验对账闭环 | tickets/registry.ts（115 done）；impl.report §9/§10；scripts/check-tickets.mjs:200 |
| N1 | N | 条目头 QUESTION_LABEL 被 ROLE_LABEL 顶替=合理超字面自裁（贴用户口径；五项零改全保留；anchorPage/色点保留；已申报） | AiNoteGroupList.tsx:81；LineageSideAiNotes.tsx:105 |
| N2 | N | P2「三消费方」系票面取证误差（AiAnnotationLayer 只消费 QUESTION_COLOR）——实现者澄清属实 | AiAnnotationLayer.tsx:58,162 |
| N3 | N | 受锁 3→5 扩容正当：两文件既有断言因 data-role 消失+组头换轴+ROLE_LABEL 改值必然红，接缝归责同步成立；lineage.spec 注释两处属必然连带 | 见 §1.1 |
| N4 | N | P6 ①「非字典序」在当前枚举命名下逻辑空洞（字典序≡单源序），夹具已排输入序；期望值现算锁单源序 | shared/models/ai-note.ts:20；ai-notes-section.test.tsx:628-644 |
| N5 | N | 受锁 e2e 先红未实测（单测同口径+末轮绿+首轮 exact 失败被捕获覆盖；全量 verify tsc 关卡已跑） | impl.report §4/§5 |
| N6 | N | 微瑕记录：AiNotesSection 实算 249 行（报告称 250）；AiNoteGroupList 头注 :6-7 标识符 QUESTION_COLOR 被换行拆词（排版微瑕，无功能影响） | AiNotesSection.tsx（wc=249）；AiNoteGroupList.tsx:6-7 |
| N7 | N | e2e spec「4 test」票面笔误（实 2+lineage T4 1），实现者按文件实况改写、test 数不变 | ai-notes-section.spec.ts（test 计数 2） |

**统计**：A=0，B=0，W=3，N=7。

## 3. 总评

**通过（建议门二终审放行收口）。** 转置实现与票面 P1~P6 全对齐：分组/
排序/文案/色条单源消费闭合，两处形状一致，五项零改枚举与侧板交互面
（双击/空态/重试/stale 守卫）全保留；首红 7 failed 复算自洽、变异 ×2
恰中、verify/e2e 真退出码申报完整；受锁 3→5 扩容经静态核验为必然红
接缝同步，无顺手改面。无 A/B 级缺陷。W3 项由主控收口亲验对账闭环；
W2 建议遗留池立项（票外）；W1 记录性警告不阻收口。超票面自裁三项
（顶替/第五文件/e2e 实况）均按纪律申报且定性合理。
