# SR2-F-06 门二终审审计档

> 审计人：门二终审孙代理（2026-08-28）。输入：票面 v1+实现者报告+门一审计档
> +gate1.diff（主控处置后重生成版，7 文件 509 行）+仓库源终态实读。只读审计，
> 唯一可写=本档。禁 npm/test/构建/git 写/触 tickets。
> 技能清点：code-review-excellence 用（终审本体）；verification-before-completion
> 用（逐项实证后落结论）；TDD/systematic-debugging/git 类不用（不写码不调试
> 禁 git 写）；其余技能与本任务无面。

## 终审结论

**PASS——准予收口放行。** 门一 W1 处置双查通过（说了且改了、改后未破坏）；
母本 P1~P4+五层规约全符；宪法红线全绿；机器面四项独立验算全吻合；
无新破坏。收口放行条件五项见文末。

---

## ① 处置核对（W1 缩进还原 + N1~N4）——通过

### W1「说了没改」与「改后未破坏」双查

- **说了且改了（真还原）**：工作区终态 `text-layer.css:59` 与 `:64` 两个
  selection 块闭合括号均为 `  }` 两格缩进（实读逐字核对）；diff 重生成版
  text-layer.css hunk（:419-436）中两闭合括号为**上下文行**（空格前缀，无
  -/+ 变更行）——旧版 diff 的 `+}` 缩进偏离变更行已消失，hunk 由含缩进变更
  的 17 行缩为 `@@ -50,13 +54,13 @@` 13 行，与「还原后无差异」自洽。
- **改后未破坏（改动面保持）**：两行 background 修复完整在场
  （:57-58/:62-63 `rgb(191 191 255)` + `color-mix(in srgb, AccentColor
  25%, white)`，:: -moz-selection 与 ::selection 两选择器四行全改）；
  头注 [SR2-F-06] 偏离登记 4 行保持（:11-14）；br 两块 transparent+两格
  缩进未动（:66-72）；diff + 侧与工作区终态逐字一致；PageColumn.tsx/
  spec 的 hunk 与门一审读版一致（处置仅触 text-layer.css 格式面）。
- **CSS 解析等价性确认（断言面不受影响）**：闭合括号缩进属 CSS 词法阶段
  被跳过的空白符，不影响花括号配对、CSSOM 与声明解析——computed
  backgroundColor / ::selection 计算值与缩进无关；变异②红证所锁断言面
  （「computed 无透明分量」）不依赖缩进。缩进还原后 e2e 断言面语义不变。
- **未触受锁面**：主控处置未改 spec——`sha256(tests/e2e/reader-text.spec.ts)
  =293e308c…7888f13`（本人实算）与门一记录值相同、与 manifest:167 逐字节
  一致 → 处置不需重走 locks 流程，主锁面完整。

### N1~N4 无行动面核对

门一处置建议均为「无需处置」——复核成立：N-1 boxShadow 断言口径系票面 P3
原文；N-2 color-mix 行当前不生效结构性不可锁且值恰票面明文；N-3 scroller
类型断言无假阳性路径；N-4 同 N-1。均无行动面，与「无行动」处置一致。

## ② 母本符合度（票面 P1~P4+五层规约 vs diff 逐条）——全符

- **P1 ✓（B 页盒）**：页盒 div style 增补 `background:'var(--panel)'` +
  `boxShadow:'0 1px 4px rgba(0,0,0,.12)'`（票面示例值，自裁 1 申报）；
  背景在 `data-page-box` 盒上与渲染态无关→渲染/占位同底；gap-3 与
  PAGE_GAP_PX 零触碰（diff 无对应 hunk，INV-33 分母不动）。
- **P2 ✓（C 方案一）**：两选择器 background 两处四行改不透明——fallback
  行 `rgb(191 191 255)`（超票面字面的必要自裁：真机实证 Chromium 对
  ::selection 不解析 color-mix 行，只改该行修复无效；且防御完备——无论
  级联取哪行均不透明）+ color-mix 行按票面指定值 `AccentColor 25%, white`；
  br 的 transparent 保持；头注偏离登记含票面明文 [SR2-F-06] 字样。方案二
  未做（票面预裁）。W1 缩进还原后「逐字保留官方（除登记偏离）」纪律字面
  违反已消除。
- **P3 ✓（e2e 新 test 自守卫）**：新 test 落 reader-text.spec.ts:614-676；
  `F06_DEPS=[...COLUMN_DEPS,'SR2-F-06']` + `skipIfPending(F06_DEPS)` 逐测
  声明（:615-618），机制经 isTicketDone（registry.ts:212-214 对不存在 id
  返回 false）核实成立。
- **P4 ✓（单测零触碰）**：diff 无 *.test.* 文件（除 e2e spec）；单测用例
  729 零增（见④）；受锁面恰 tests/e2e/reader-text.spec.ts+locks/
  manifest.json。
- **五层规约逐条 ✓**：行为层（页缘可辨+单层不透明高亮）/接口层（style 两
  属性+两选择器，props/导出/geometry 零触碰）/架构层（零依赖零分层，
  theme.css 只读消费）/生命周期层（无方案二/gap/圆角/暗色）/文化层（TDD
  四档证据链，见③）。

## ③ 宪法红线终审——全绿

- **受锁流程**：spec sha256 实算=manifest:167 逐字节一致；manifest 计数
  **143 条**（grep 实数）；diff 中 manifest 变更仅 generatedAt+spec 一条
  sha，无条目漂移；unlock→改→apply 痕迹完整。
- **UTF-8**：四个改动文件中文全可读（本档实读）。
- **无 TODO|FIXME|placeholder**：PageColumn.tsx/text-layer.css/spec 三面
  grep 零命中（EXIT=1）；探查字面量 'PROBE' 未残留（spec 终态全文核对）。
- **PageColumn.tsx = 248 行**（wc -l 实算）≤ 组件 250 上限。
- **依赖零增**：runtime deps=6（≤15 预算，budget 余量足），diff 无
  package.json/lockfile hunk。
- **TDD 证据链四档**：①首红含真机形态探查（B 断言红 + 同帧快照
  `selectionBg:"rgba(0,0,255,0.25)"` 定案 ::selection 解析形态——为 fallback
  行双改提供运行证据）；②绿 `1 passed`；③变异×2 恰中性——变异①只删页盒
  background 恰 B 断言红（boxShadow 面不受扰）；变异②改回官方两行恰 C
  断言红——本人独立验算 C 四道正则：对官方回归值 `rgba(0, 0, 255, 0.25)`
  第三道恰红（与红消息吻合）、对 `rgb(191, 191, 255)` 两道皆 false 恰绿、
  `rgba(…, 1)` 放行、`color(srgb … / 0.x)` 第四道红、无 alpha 形态绿——
  断言族无双红（恒假）无漏网；④cp 备份还原 diff 空 ×2（禁 git checkout
  纪律遵守）。链自洽可信。

## ④ 机器面核对（独立验算）——全吻合

- **94 文件 729 用例零增口径**：文件数实算 **94**（.test.ts 70 + .test.tsx
  24）；静态声明 it(/test( 行 .ts 513 + .tsx 239 = 752（含 wait(/emit(
  类子串误匹配约 23 行；`.each(` 使用 **0** 无展开差异）——与运行时 729 同
  量级自洽；**diff 零触碰单测文件 → 用例数相对基线零增结构性成立**；运行值
  729 由实现者 verify EXIT=0 落盘、门一无争议，采信。
- **e2e 守卫态 23+1 skip 与翻 done 后 24+0 推演（独立验算）**：全套 test
  静态计数 **24**（reader-text 10[含新 1]+lineage 4+smoke 4+reader-scroll
  2+ai-notes 2+zcode-link 1+corpus-export 1；lineage/reader-scroll 为
  describe 内缩进声明已单独计入）；F06_DEPS 展开 = DEPS 四号（SR-RDR-02/
  SR-LIB-01/SR-LIB-02/SR-RDR-04）+ SR2-F-01 + SR2-F-06——registry 实查前
  五者**全 done**、SR2-F-06 不存在 → pending 恰 [SR2-F-06] → **23 passed +
  1 skipped** 成立；建单翻 done 后 test.skip(false) → **24+0** 成立。
- **registry 现状**：done **111**/open 0/无 SR2-F-06 条目（实查）——与
  「111 done + F-06 未建单」口径一致。
- **check-tickets 建单前后均绿推演（脚本逻辑实读验证）**：建单前——tests/
  面（check-tickets.mjs:77-91）只查占位桩调用（placeholderCallRe），spec 内
  'SR2-F-06' 字符串引用不触发「不存在」红；src 面 PageColumn `[F-06]` 不匹
  配 ticketRefRe（:72）；text-layer.css 不在 walk 扫描面（:68-71 只收
  ts|tsx|mjs）→ 绿（与实现者 verify EXIT=0 实证互证）。建单翻 done后——
  规则 6 要求 SR2-* 工单 file 指向文件头有 `// b3: P7-X` 且 P7-X 在已裁决
  集：**PageColumn.tsx:1 已有 `// b3: P7-F`**（F-05 先例 scroll-converge.ts:1
  同形态），P7-F ∈ ROADMAP 已裁决集（:195 `### P7-F：`）→ 绿；无
  data-ticket/工单号 STUB 残留（规则 4b）→ 绿。**前后均绿推演闭环。**
- **工作区状态**：git status 改动恰 4 文件（manifest/PageColumn/text-layer/
  spec）与 diff 代码面吻合；audits 未跟踪面含他役 brief（sr2-ai-11/enr-03/
  lg-06/lg-07）非本单范围——主控 staging 须显式列文件（宪法纪律）。

## ⑤ 成本账本行（主控汇出，档内引用）

| 单元 | token | 工具调用 | 时长 |
|---|---|---|---|
| 实现者 | 2,847,902 | 57 | 12.0 min |
| 门一深审 | 362,825 | 14 | 7.1 min |

## 新破坏扫描

主控处置（W1 缩进还原）仅触 text-layer.css 格式面：spec sha 不变（受锁面
未触）、其余 hunk 与门一审读版一致、工作区无额外改动、CSS 解析等价（见①）
——**无新破坏**。门一 W/N 四项处置后状态：W-1 已闭环，N-1~N-4 维持无行动。

## 收口放行条件清单（主控执行）

1. **建 SR2-F-06 单并翻 done**：file 指向 `src/renderer/features/reader/
   PageColumn.tsx`（其 :1 已有 `// b3: P7-F`，规则 6 即绿）——建单即翻
   done，勿留 open（open 且 .tsx 会触发规则 4 data-ticket 要求）。
2. **提交带 [locked-change] 尾注**（受锁文件 tests/e2e/reader-text.spec.ts
   + locks/manifest.json 在变更集内）；locks manifest 已与工作区同步态，
   提交即时同步纪律维持。
3. **staging 显式列文件**：本单恰 8 文件（4 改动 + 4 audits：brief/impl.
   report/gate1.audit/gate1.diff+本档）——scripts/audits 下他役未跟踪
   brief 勿扫入。
4. **翻 done 后如跑 test:e2e，核对 24 passed + 0 skip**（独立验算口径）。
5. **排程提示（非阻塞）**：PageColumn.tsx 248 行距组件 250 上限仅 2 行
   余量——后续同域增注须先拆文件。

## 统计与总评

四清单+一全 PASS：处置核对（W1 双查+等价性确认）/母本符合度（P1~P4+五层
逐条）/宪法红线（六项全绿）/机器面（四项独立验算吻合）/成本行入账。实现
质量与诚实度经门一深审+门二终审双独立核验一致认可：本票最大自裁面（fallback
行双改）有真机实证+变异②互证且防御完备；报告六自裁+三红回炉+三疑虑全数
如实。**准予收口。**
