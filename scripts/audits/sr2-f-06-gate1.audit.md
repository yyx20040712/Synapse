# SR2-F-06 门一对抗深审审计档

> 审计人：门一对抗深审子代理（2026-08-28）。输入：gate1.diff（362 行 6 文件）+
> 票面 v1 + 实现者报告 + 仓库源终态抽读。只读审计，唯一可写=本档。
> 技能清点：code-review-excellence 用（对抗深审本体）；systematic-debugging /
> verification-before-completion 不用（铁律禁 npm/test/构建，纯静态核对）。

## 结论速览

**B×0 / W×1 / N×4 —— 通过，可进门二。** W 项为 text-layer.css 官方块缩进的
未申报格式偏离（功能零影响，门二知悉即可）。无绕检查、无恒真断言、无范围蔓延、
无宪法红线触碰；报告六项自裁申报与 diff 终态逐条相符。

---

## A. 母本符合度（P1~P4 + 五层规约）—— 全符

- **P1 ✓**：页盒 panel 底+阴影落在 `data-page-box` div
  （PageColumn.tsx:233：`background: 'var(--panel)', boxShadow: '0 1px 4px
  rgba(0,0,0,.12)'`——票面示例值，自裁 1 如实申报）。背景在页盒 div 上与
  rendered 态无关→渲染/占位同底 ✓（PageColumn.tsx:228-243，占位分支 null 同盒）。
  gap-3（:222）与 geometry 零触碰 ✓（diff 无对应 hunk）。
- **P2 ✓（含本票最大自裁面，判定改法正确且完备）**：
  - 两选择器同步改：`::-moz-selection`（text-layer.css:56-59）与 `::selection`
    （:61-64）**两处四行都改** ✓。
  - fallback 行 `rgb(191 191 255)` 不透明 ✓（无 alpha 分量）；合成等效色验算
    正确：0.25×(0,0,255) over white = (191.25,191.25,255)→191,191,255。
  - color-mix 行按票面 P2 指定值 `color-mix(in srgb, AccentColor 25%, white)`
    ✓（AccentColor 系统色默认无 alpha→结果不透明，两行均满足「不透明」）。
  - 「Chromium 不解析 color-mix 行时为何还改该行」——独立裁定：①票面 P2 明文
    指定该行值；②防御完备性——**无论 Chromium 实际采用哪一行，两行都是不透明**，
    断言与修复语义在两种解析行为下均成立（报告 §8 疑虑 2 的前向兼容分析与此
    互证）。该行改动不属冗余。
  - 实证链自洽：首红探查快照 `selectionBg:"rgba(0, 0, 255, 0.25)"`（若
    color-mix 生效应得 color(srgb…) 形态）+ 变异②红消息复现同值——两条独立
    运行证据互证 fallback 行为生效行。
  - br 的 transparent 保持 ✓（text-layer.css:66-72 两块未动）。
  - 头注偏离登记：首句与票面 P2 要求逐字一致+实证补充（:11-14）✓。
- **P3 ✓**：新 test 落 reader-text.spec.ts（:613-676）；守卫
  `skipIfPending(F06_DEPS)`，F06_DEPS=[...COLUMN_DEPS,'SR2-F-06']（:612）；
  isTicketDone 对不存在 id 返回 false（registry.ts:212-214）→ skip 激活
  机制成立。**全套 e2e test 统计=24**（reader-text 10+reader-scroll 2+
  smoke 4+lineage 4+ai-notes 2+zcode-link 1+corpus-export 1）→ 守卫态
  23 passed+1 skipped 与报告 §4 吻合；翻 done 后 24+0 推演成立。
- **P4 ✓**：单测零触碰（diff 无 *.test.* 文件）；受锁面仅
  tests/e2e/reader-text.spec.ts+locks/manifest.json，恰票面申报。
- **五层规约逐条 ✓**：行为层（页盒可辨+单层不透明高亮）/接口层（style 两
  属性+两选择器，props/导出/geometry 零触碰——diff 核对属实）/架构层（零新
  依赖，theme.css 只读消费 var(--panel)，theme.css:6 `--panel:#ffffff`→
  computed rgb(255,255,255) 断言链成立；body 挂 --bg，theme.css:33 佐证
  自裁 3「--bg 在 body 上」属实）/生命周期层（无方案二/gap/圆角/暗色改动）/
  文化层（TDD 四档证据链完整，见 C 节）。

## B. 宪法红线与受锁流程 —— 全绿

- 受锁静态核对：工作区
  `sha256(tests/e2e/reader-text.spec.ts)=293e308c…7888f13` 与
  locks/manifest.json:167 值**逐字节一致**；manifest 变更仅该条 sha+generatedAt
  （diff:12-18），143 条目数无漂移。unlock→改→apply 流程痕迹完整。
- 受锁文件集合恰票面：PageColumn.tsx（非受锁）+text-layer.css（非受锁）+
  spec（受锁）+manifest+audits 两档自身。无多余受锁改动。
- UTF-8 中文全可读（PageColumn.tsx/text-layer.css/spec/diff 抽读均正常）。
- TODO/FIXME/placeholder：两个改动 src 文件 grep 零命中；探查临时字面量
  'PROBE' 未残留（diff 终态全文核对）。
- 依赖零增：无 package.json/lockfile 变更。
- 行数：PageColumn.tsx 终态 **248 行**（wc -l 实测）≤ 组件 250 上限。
- [F-06] vs [SR2-F-06] 处置（自裁 5）非绕检查：check-tickets.mjs:65
  `ticketRefRe=/SR2?-[A-Z]+-\d+/g` 要求 SR-/SR2- 前缀——src 中写 `[SR2-F-06]`
  将命中「引用了不存在的工单号」红（:96-99）；`[F-06]` 不入正则面，与
  `[F-04 增补]`/`[F-05 增补]` 既有先例同形态（PageColumn.tsx:4,8）；css 不在
  walk 扫描面（:63-65 只收 src/tests 的 ts|tsx|mjs），text-layer.css 头注
  保留 [SR2-F-06] 全称合规。实现者理由经脚本逻辑独立证实为真。

## C. 代码与测试质量 —— 通过（两项说明性 N）

- **B 断言组**（spec:641-648）：pageBg 精确白+pageShadow 非 none+scrollBg
  精确透明+bodyBg 精确 rgb(247,248,250)+pageBg≠scrollBg。pageBg/bodyBg 双
  精确值断言的组合在数学上蕴含「页白 vs 阅读 #f7f8fa 可辨」（两字面量不等），
  锁定真实视觉链（页盒浮于 body --bg 上）。假阳性残余仅「阴影全透明也过
  （!=='none' 不校验 alpha）」——恰票面 P3 原文口径，非实现者偷工；最终
  可辨性归用户验收（票面设计如此）。N-1。
- **C 断言组**（spec:356-360）四道正则独立验算：官方回归
  `rgba(0, 0, 255, 0.25)`→第三道红（与变异②消息一致）；预期绿形态
  `rgb(191, 191, 255)` 两道皆 false；前向形态 `color(srgb …)` 无 alpha 绿/
  带 `/ 0.x` 红；不透明 `rgba(…, 1)` 放行。断言面覆盖真机形态家族，无双红
  （恒假）亦无漏网。修复语义闭环：不透明色二三次叠绘同色覆盖不变深（数学
  性质），「重叠 span 不加深」由「computed 无透明分量」等价锁定。
- **变异恰中性 ✓**：变异①只删页盒 background（保留 boxShadow）→恰 pageBg
  断言红，boxShadow 断言不受扰——单点变异对应单断言面。变异②两选择器改回
  官方两行→C 断言红且错误消息暴露生效值——端到端锁「最终 computed 不透明」
  即验收判据。残余：color-mix 行改动无独立变异锁定（该行当前不生效，结构性
  不可锁），但该行值恰票面 P2 明文指定、无自裁风险。N-2。
- **三次中途红处置均真修非绕**（diff 终态核对）：①行数 251→248=压缩实现者
  自写的新增注释（F-04/F-05 头注与全部行为段完整在场，F-06 两行头注信息
  完整——修法+INV 约束+props 零改，未牺牲可读性）；②见 B 节；③tsc TS2345
  `?? null`（spec:630）是真类型收敛（HTMLElement|null|undefined→|null），
  非 as-any/suppress。附带发现：同处 scroller 用 `as HTMLElement | null`
  （spec:631）对 undefined 分支是类型断言而非收敛，与 box 的 ?? null 不对称
  ——但 col 在场由前置 P1 可见断言保证，col 缺场时 evaluate 抛 TypeError
  亦为红非绿，无假阳性。N-3。

## D. 报告诚实性（自裁 6 项 vs diff 逐条）—— 全符

1. 阴影值=票面示例 ✓（diff:249）；2. fallback 行 rgb(191 191 255) ✓
（diff:277,285）且等效色验算正确；3. body 锚定 ✓（diff:337,346-348，
theme.css:33 佐证）；4. 四道断言 ✓（diff:357-360）描述与实现一致；5. [F-06]
处置 ✓（diff:238,248 vs text-layer.css:11）且理由经 check-tickets.mjs:65,96-99
独立证实；6. 'PROBE' 未残留 ✓。verify 红回炉三项如实登记（§7）；locks 实录
（§5）与 manifest 终态自洽；疑虑三条（§8）为真实残余非粉饰。

## E. 接缝与后续单 —— 无破坏

- **F-05 接缝**：PageColumn.tsx 头注 F-05 段（:8-11）与段⑤
  scrollIntoNearestScroller（:176-177）完整在场；F-06 仅头注 +2 行+页盒
  style 一行，hunk 无交叠，无相互覆盖。
- **U3~U5 后续单**：本票零行为改动（纯样式），scroll/geometry/selection
  行为面未触；e2e 新 test 依赖集不含 U 系工单，不改变任何既有 spec 的守卫态。
- 248 行为后续同域增补留 2 行余量（组件 250 上限内仅余 2——后续再增注须拆
  文件，提示主控排程留意，非本票问题）。

## W/N 判定汇总

| # | 级 | 条目 | 证据 | 处置建议 |
|---|---|---|---|---|
| 1 | W | text-layer.css 两个 selection 块闭合括号缩进由官方 `  }` 改 `}`，超出「逐字保留官方（除登记偏离）」登记面且未申报（br 块 66-72 保留原缩进，证明是实现者手改非全文件格式化） | diff:275-279,283-287 vs 终态 :59,64 vs :68,72 | 功能零影响；门二知悉，收口提交可顺手还原缩进或在头注偏离行补半句，不阻塞 |
| 2 | N | color-mix 行改动无独立测试锁定（该行当前不生效，结构不可锁）；值恰票面明文，无自裁风险 | 本档 C 节 | 无需处置 |
| 3 | N | scroller `as HTMLElement | null` 与 box `?? null` 类型收敛不对称（无假阳性路径） | spec:630-631 | 无需处置 |
| 4 | N | boxShadow 断言仅 !== 'none' 不校验视觉可见性 | spec:644 | 票面 P3 原文口径，非实现者责任 |

## 统计

- B（阻塞返工）0 条；W（知悉/微修）1 条；N（说明性）4 条。
- 复核重点六项全部闭环：::selection 双行改判（正确+防御完备）/e2e 断言自洽
  （真锁判据，残余仅票面口径内）/变异恰中性（单点对应）/受锁面恰票面
  （sha 静态一致）/三次中途红均真修/常规红线全绿。

## 总评

**通过，可进门二。** 实现质量高：本票最大自裁面（fallback 行双改）有两条
独立运行证据支撑且防御完备（两行皆不透明，对 Chromium 解析行为变化免疫）；
报告诚实度好（六自裁+三红回炉+三疑虑全数如实）；受锁流程与 manifest 静态
核对严丝合缝。唯一 W 为官方 CSS 块缩进的未申报格式偏离，属「逐字保留」纪律
字面违反但零功能影响，建议门二裁量（还原或补登记即可）。
