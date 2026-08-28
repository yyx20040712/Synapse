# SR2-AI-11 门二终审（gate2）——AI 笔记呈现轴转置（缺陷 F）

> 审计人：门二终审孙代理（三屋模式，2026-08-28）。只读审计（唯一可写=本档），
> 未跑 npm/test/构建，未触 tickets/（仅只读 grep/wc/od/git status 读面），无 git 写。
> 输入：brief/impl.report/gate1.audit/gate1.diff 全读 + 六类仓库静态实测。

## 0. 技能清点回执（开工纪律）

code-review-excellence（用——终审缺陷分级与证据方法）/ verification-before-completion
（用——收口放行条件核对框架）/ TDD·systematic-debugging·e2e patterns（不用——
只读静态终审，禁 npm/test/构建，无实现与运行验证面）。配置自查：本代理无下游
派发，无等级配置面。

## 终审结论：**PASS**（放行收口，条件见 §6）

---

## ① 处置核对（门一 3W 主控预裁决 vs 终态实物）——零偏差

| W | 预裁决 | 终态实物核验 | 偏差 |
| --- | --- | --- | --- |
| W1 | side-panel test +2 行超最小集，有申报有理→接受落战役报告 | gate1.diff :711-712 实证两行 toContain（'一审'/'裁决'）；impl.report §2/§7.5 申报在档；不加 it 不加文件（该文件 it 数 20 不变，实测） | 无 |
| W2 | F-04 flaky 根面 reader-scroll.spec:231-232 selectText 撞 fit-width 重挂载窗口→遗留池立项 | 实读 spec :230-232 `const known3…; await known3.selectText()` 无 toPass/expect.poll 重试包裹（根面锚成立）；该 spec 不在 10 个 M 文件内（票外零改动实证） | 无 |
| W3 | 基线 115 vs 实现者报 114——时序解释待主控收口亲验→记录 | registry 静态实数 **115 条全 done、open 0**（`grep -cE "^\s*\{ id: '"`=115 / done=115 / open=0 三重计数）——基线口径得证；实现者运行时点 114 递减确非实现者触单（其禁令遵守+报告自证），归主控收口对账 | 无 |

## ② 母本符合度（票面五层+P1~P6 vs diff）——PASS

**用户口径逐字对标**「问题一+一审:xxx。二审:xxx。裁决:xxx。」：
组头=QUESTION_LABEL（「第一问…分歧报告」——AiNoteGroupList `<h4>` /
LineageSideAiNotes `<h5>`+3px borderLeft QUESTION_COLOR+pl-1）✓；组内条目头=
ROLE_LABEL·p.N（一审/二审/裁决）✓；分段形态=ROLE_ORDER 组内排序+标签（自裁③，
门一 N1 核准）✓。**口径完整实现**。

- **P1** ✓：groupNotes 转置（AiNoteGroupList.tsx:22-29 实读：AI_NOTE_QUESTIONS.map
  →filter 空组剔除→组内 ROLE_ORDER indexOf 排序）；组头色条/标签单源 ✓；五项零改
  （色点/quote/content/onLocate/data-highlight——diff 中条目体仅 QUESTION_LABEL→
  ROLE_LABEL 一行替换，其余零触碰）✓。
- **P2** ✓：ROLE_LABEL 三值（ai-note-style.ts:39-47 实读现状：一审/二审/裁决+ROLE_ORDER
  注释同步）✓；「三消费方」经全 src grep 证实**实为两处消费**（AiNoteGroupList:81+
  LineageSideAiNotes:105），AiAnnotationLayer 零 ROLE_LABEL 消费——票面取证误差，
  实现者 §9 澄清+门一 N2 核准，未动该文件正确 ✓。
- **P3** ✓：LineageSideAiNotes AI_NOTE_QUESTIONS.filter 链同步转置（:335-379 diff），
  形状与面板一致（h5 层级差保留）；双击定位/空态/重试/stale 守卫零改；不抽公共件
  （Rule of Three 第 2 次保持）✓。
- **P4** ✓：shared 零触碰（diff 无 src/shared 文件；AI_NOTE_QUESTIONS/AiNoteQuestion
  只读 import）；groupNotes 生产消费闭合（全 src/tests grep：定义+组件自身 :37 唯一
  消费，tests 经 mount 间接）✓。
- **P5** ✓：受锁 5 文件（票面 3+接缝扩容 2，门一 N3 核准必然红）unlock→改→apply；
  manifest diff 恰 5 hash 同步+generatedAt 更新，无第 6 文件 hash 漂移 ✓。
- **P6** ✓：4 新增 it 完整落位（①分组序单源 :628-644 乱序夹具+期望现算锁单源；
  ②空组剔除 :646-656；③组内 role 标签+role 序 :658-676；④divergence 独立组转置
  :678-690）；①「非字典序」维度在现枚举命名下字典序≡单源序系逻辑空洞（门一 N4，
  非夹具缺陷）。
- **三项超票面自裁**（条目头顶替/受锁第五文件/e2e「4 test」实况 2）均有申报
  （impl.report §7.4/§7.5/§7.6）且门一核准（N1/N3/N7）——终审无异议。

## ③ 宪法红线终审——PASS

- **受锁流程痕迹**：manifest 变更面=5 测试文件 hash+generatedAt，与申报完全一致；
  manifest 条目数实测 **144** ✓。「即时 apply」由收口提交环节保证（放行条件 §6-4）。
- **行数实算**（wc）：AiNoteGroupList **100** / LineageSideAiNotes **121** /
  AiNotesSection **249**（报告称 250，±1 微瑕=门一 N6 已记）/ ai-note-style **47**
  ——组件 ≤250 全合规，与门一数字逐项一致 ✓。
- **UTF-8**：全部抽读文件中文可读 ✓。
- **TODO/FIXME/placeholder**：10 个改动文件 grep 零命中（exit=1）✓。
- **新测试 always-active**：ai-notes-section.test.tsx 全文件无 guardedDescribe
  （grep 仅另两文件头注「不经 guardedDescribe」声明字样）；新增 4 it 为顶层裸 it ✓。
- **TDD 四档**：①首红 7 failed 复算自洽（1+5+1=7；3 文件 46 用例=24+2+20 与实测
  it 数吻合）②绿=verify 741（静态全量精确闭环，见 ④）③变异×2 恰中（各杀 1 it、
  真退出码申报；/tmp 日志静态不可核——门一已注明，沿用其背书）④cp 还原 diff 空
  自述+46 复绿（同 ③ 静态不可核项，主控亲验兜底）。静态可核面全自洽 ✓。

## ④ 机器面核对——PASS（含一项静态精确闭环）

- **95 文件 741 用例**：静态全量复算 **精确命中**——tests/unit 89 文件 716 it +
  tests/security 3 文件 11 it（csp-meta 2/shell-guard 5/web-preferences 4）+
  tests/contracts 3 文件 14 it（preload-surface 4/app-error 5/api-surface 5）=
  **95 文件 741 用例**；737+4=741 算术自洽，增量恰=本票新增 4 it
  （ai-notes-section.test.tsx 20→24 实测，其余 8 改动文件 it/test 数不变）✓✓
- **manifest 144** ✓（实测 grep 计数）。
- **e2e 24+0**：七 spec 静态计数=**24**（ai-notes-section 2+corpus-export 1+lineage 4+
  zcode-link 1+reader-text 10+reader-scroll 2+smoke 4）；spec 文件数不变 ✓。
  **改写后仍过静态推演**（fixture 实读双验）：ai-notes-section.spec fixture
  first-read/Q1+adjudicate/divergence → 新断言 heading「第一问」「分歧报告」+分组序
  （Q1 组在前）使 first()=Q1 条目含'一审'、nth(1)=divergence 条目含'裁决'——成立；
  lineage.spec T4 fixture 同构 → `div[data-question="Q1"]` 色锚 --annotation-yellow/
  `div[data-question="divergence"]` --danger 与 QUESTION_COLOR 单源吻合——成立；
  skip 守卫（DEPS）保留未动，U1/U2 已激活故 0 skip ✓。
- **registry 建单衔接（b3 头指针行核）**：AiNoteGroupList.tsx 第 1 行 od 字节级验证
  =`// b3: P7-G\n`（**无 BOM、LF、格式匹配 check-tickets.mjs:182 正则**
  `^\s*//\s*b3:\s*(P7-[A-Z])\s*$`）；P7-G 属 ROADMAP 已裁决集（venue-tier/
  ai_notes.repo 等多张现存 SR2 单同指针 verify 全绿旁证）——**指针已就位，无
  LG-06 式补针硬前置**，建单即衔接。（核验备注：行首锚 grep 一次零输出系 shell
  工具假象，以 od 字节证据+无锚 grep 双证据定谳。）
- **工单数对账**：registry 实数 **115 done / 0 open**——基线 115 口径成立；114 时序
  差归主控收口亲验（W3 处置不变）。

## ⑤ 成本账本行（主控汇出，档内复核引用）

- 实现者子代理：**4,404,866 tok / 87 工具调用 / 17.6 min**（impl.report 自述+主控
  汇出口径引用；档内无独立计时面，按账本惯例入账）。
- 门一对抗深审：**479,360 tok / 15 工具调用 / 5.5 min**（gate1.audit 无自报段，
  依主控汇出引用入账）。
- 门二终审（本档）：只读静态 12 轮工具（4 读输入+8 静态核验+1 写档）。

## 新破坏扫描（门一时点→终审时点）

`git status` 改动面=10 M（4 生产+5 受锁+manifest）+4 ??（brief/report/gate1.audit/
gate1.diff）——与 diff 包 12 文件+门一两产物**完全一致**，无门一后第三方触碰；
`git stash` 空；4 生产文件现状抽核（ai-note-style 三值/LineageSideAiNotes
data-question=1/AiNoteGroupList groupNotes :22-29）与 diff 逐处吻合。**零新破坏。**

## §6 收口放行条件清单（主控执行）

1. **亲验 verify 真退出码 0**：`npm run verify` 全绿（quality+tickets+locks 144+
   lint+typecheck+test 95 文件 741+build）+ `npm run test:e2e` 24 passed 0 skip——
   并同步闭环 W3 工单数对账（亲跑 tickets 计数 vs 115 基线）。
2. **建单**：registry 新增 SR2-AI-11 条目，file=`src/renderer/features/reader/
   AiNoteGroupList.tsx`——**b3 头指针已就位（:1 `// b3: P7-G`），无需补针**；
   建单后重跑 tickets:check（或全量 verify）确认引用通过、工单数 115→116。
3. **W1 落战役报告；W2 遗留池立项**（reader-scroll.spec:230-232 selectText 加
   toPass 重试包裹或前置 DOM 稳定断言——票外）。
4. **提交纪律**：显式列名 staging（12 文件+registry+三 audits 产物）；受锁文件
   （5 测试+locks/manifest.json）提交尾注 **[locked-change]**；manifest 已与工作区
   同步（实现者即时 apply），随本次提交一并落库，勿再单独重生成。
5. （可选，不强制）建单后头注描述性字样「呈现轴转置 2026-08-28 缺陷 F」可回填
   工单号 SR2-AI-11——现字样已机检合规，回填属美化非义务。

## 总评

**PASS。** 四清单+成本账本全过：处置 3W 零偏差；母本 P1~P6+用户口径+三项自裁全
落地；宪法红线（受锁痕迹/行数/UTF-8/TODO/always-active/TDD 四档）静态面全合规；
机器面实现**静态精确闭环**（95/741 逐文件复算命中、e2e 24 双 spec 推演成立、
b3 指针字节级就位）；门一后零新破坏。唯一不可静态核证面（/tmp 变异日志真伪、
verify 运行真退出码）由 §6-1 主控亲验兜底。无 A/B/W 级新增项，放行收口。
