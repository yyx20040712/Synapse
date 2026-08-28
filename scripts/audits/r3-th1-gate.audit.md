# R3-TH1 门一联审档（对抗深审）——token v2 + App 壳 + 共享四件

> 审计人：门一独立子代理（GLM-5.3，三屋模式 R3-TH1）。日期 2026-08-28。
> 铁律遵守：全程只读仓库（唯一可写=本档）；未跑 npm/测试；未做任何 git 写。
>
> **开工技能清点**（宪法会话开工纪律）：`code-review-excellence` **用**（本任务=
> 对抗性审查核心）/ `verification-before-completion` **用**（结论出门前逐证据亲验：
> verify.log 尾部 823 passed+EXIT=0、e2e.log 25 passed+EXIT=0 均亲读非转述）/
> `e2e-testing-patterns` **用（轻）**（D 项 flaky 边缘扫描采其断言面知识）/
> `test-driven-development` **不用（仅采证据标准）**——禁跑测试，只评估 TDD 四档
> 证据形态，无需加载流程技能 / `systematic-debugging` 及其余运维·文档·网格类
> **不用**（纯只读审查，无调试面、无实现面、无部署面）。
>
> 输入件全读：gate1.diff（707 行）、brief v1、visual-system 定稿、两 mockup
> :root、impl.report、verify.log（尾部）、e2e.log（全）、终态源码 7 文件、
> smoke/lineage/app-quit-dirty 锚点段、locks/manifest、package.json、git status。

## 统计行

**B=1 / W=1 / N=6 —— 裁决：FAIL（B1 回炉一轮后可收口）**

## A. token 对照终验（最高优先）

### A1. 报告对照表 vs 两 mockup :root 逐键手 diff——零偏差

亮面（shell-library.html :root 24 键含 annotation 不在此列 vs theme.css）：
`--bg #f6f4ee / --panel #ffffff / --panel-glass rgba(255,255,255,.72) / --border
#e4ded1 / --border-gold #c9a86a / --text #23262d / --text-dim #6f7482 / --accent
#2c5f8a / --accent-soft #dcebf5 / --gold #b8935a / --danger #b3403a / --ok #3d7a50 /
--shadow-1/2/3 / --radius-s|m|l 8|12|16px / --font-display（四族衬线栈逐字一致）/
--ink #1b2333 / --ink-hi #232d44` 全部逐值一致。

三处偏离 mockup 字面均有更高裁决授权，且对照表如实誊注了 mockup 原值（誊录
纪律诚实，非隐瞒）：
- `--gold-soft`：shell 稿 rgba(201,168,106,.14) → 取 lineage 稿 rgba(207,174,114,.16)
  ——票面 P1 明文裁决值，一致。
- `--gold-bright #e3c98f`、`--gold-line rgba(207,174,114,.1)`：shell :root 无此二键，
  取自 lineage :root——票面 P1「mockup :root 逐值誊入」覆盖两稿，一致。
- 空格规范化（rgba(35, 38, 45, 0.06) 等）与尾零（0.10→0.1）：CSS 值语义等价，
  theme.test 断言串同形，一致。

夜面（lineage-constellation.html :root 14 键 vs theme.css）：`--night-bg #171e33 /
--night-bg2 #111728 / --node-face #222c4d / --node-face-hi #2b3760 / --gold(→别名
--gold-night) #cfae72 / --gold-bright / --gold-soft / --gold-line / --band-line /
--star / --text-on-night #e9e6db / --text-mid #c6cbdd / --text-dim-on-night #97a0bb /
--edge-glow` **14/14 全一致**。新增键计数核实：亮 15+夜 12=27，与预裁口径吻合。

壳散值（mockup nav 段类内值 vs .app-nav 系）：渐变底/右缘金线 rgba(201,168,106,.5)/
文字色六枚 #cfd5e4 #aeb6ca #efe9da #f3eddd #e6eaf4 #8d95ad #6d7590/hover rgba
(255,255,255,.06)/active inset .28/左缘条 3px 渐变/footer 分隔 .07——逐值一致。
**唯一自加值：`.app-nav` 的 `gap:2px`（mockup nav 无 gap，item 垂直间距由 margin
4px 变 6px）→ 见 W1。** nav 渐变终点 #171e2f≠--night-bg2，照誊不混用，正确。

### A2. 旧 9 键换值的消费面语义完整性（40 tsx 实测）

grep 实测 40 个 tsx 消费 var(--accent|--danger|--ok|--text-dim|--accent-soft)
（票面写 42——口径差异，无实质，见 N2）。定性对比度（WCAG 相对亮度手算）：
- `--accent` #2563eb→#2c5f8a：蓝→墨青同族，「信息主色/选中态」语义全保；
  白底对比 3.6→**6.1:1**（大幅改善）。白字 on accent 5.2→**6.7:1**（Button
  primary/重试钮/创建钮均受益）。
- `--danger` #dc2626→#b3403a：暖纸白底 4.4→**5.1:1**；`--ok` #16a34a→#3d7a50：
  **3.1→4.7:1**（SettingsPage 状态列/LineageSidePanel 徽记/AiNotesSection 边框
  消费点语义保持且更可辨）。
- `--text-dim` 4.4→4.3:1：与旧值持平（微欠 AA 正文线 4.5，见 N6，非回归）。
- `--gold` #b8935a 作暖底文字仅 ~2.5:1——但消费语境为大号衬线年份/装饰徽记
  （mockup 原设计语境），本单消费仅 ghost hover（见 B1）与品牌 SVG 描边，可接受。

**结论：换值无语义劣化，交互可读性普遍改善。**

## B. 母本符合度

- **P1** ✓（token v2 全量落地；annotation 回退走预裁②授权，A1 已验依据坐实）。
- **P2** ✓：课题位按票面预案分支「R1-WS2 已收口→直接消费组件」执行；nav
  四项文案/结构不动（'文献库'等四名+button 结构实测保留）；品牌行衬线+菱形标
  ✓；footer ✓。品牌文案 'Synapse Remake' 保留——smoke.spec:22
  `getByText('Synapse Remake')` 实测在场（自裁 2 依据坐实）。
- **P3**：静态面 ✓（primary 墨青+inset .45+6px 切角=定稿注意事项①「非 8px」
  正确兑现；Dialog 头檐金线+玻璃 blur+radius-l+shadow-3；SplitPane 金化；Toast
  玻璃底）——**但 hover 两项静默失效，见 B1，票面明示行为未兑现**。
- **P4** ✓：唯一必然红（F-06 bodyBg）走申报+预裁③核准路径，AI-11 口径闭合。
- **P5** ✓：无暗色全题/动效库/新字体文件/视图级重皮肤/reader PDF 区变更。
- 定稿 §1/§2 逐节：§1 token 语义表全覆盖（纸面渐变散值 #fffdf9/#fdfaf3 系
  R3-U2 卡片语境值，非 :root token，不属本单）；§2 R3-U1 范围=本单，无越界。

**8 项自裁逐条独立裁**：
1. annotation 五色保持——**核准**（三处 rgb(253,224,71) 断言实测在场：186/474/505）。
2. 品牌文案保留——**核准**（smoke.spec:22 实测）。
3. --gold-night 别名——**核准**：两稿 --gold 冲突实测真实（#b8935a vs #cfae72），
   票面裁亮面占用；-night 后缀与 --text-on-night/--text-dim-on-night 命名族一致，
   R2 免再动 token 层。合理。
4. v0.1 徽记——**核准**（package.json version 0.1.0 实测；mockup v1.0 系占位）。
5. nav 184px——**核准**（mockup width:184px 实测；w-40=160px 被替换即报告口径）。
6. 断言串空格规范化——**核准**（对照表逐行注明原值，语义等价）。
7. Switcher danger 保持——**核准留观**（--node-face 底上实测定性 ~2.4-2.9:1
   偏低；但预裁①授权面不含 danger 亮系、改需新 token 超票面，留后续单
   --danger-on-night，与实现者疑虑 2 一致）。
8. clip-path 裁外影——**核准**（mockup .import-btn 实测同形态：切角+shadow
   并存，照誊非缺陷）。

**未申报面扫描**：git status 实测 M 面=8 源文件+manifest+reader-text.spec，
与报告 §2 清单一一对账；?? 面=audits 产物+两新测试。**零未申报改动。**

## C. 宪法红线

- **受锁**：F-06 断言值同步 1 处（预裁③核准，diff 实测恰一处且带
  [locked-change] 注释）；manifest 实测 152 条=locks:check 通过行吻合；generate
  →apply 即时重锁实录在报告 §8。✓
- **行数**：theme.css 187 / App.tsx 175 / Switcher 182 / Button 70 / Dialog 94 /
  SplitPane 210 / Toast 75——全部远低于 500 红线。（报告 §2 写 theme.css
  「204 行」与实测 187 不符→N2。）
- **UTF-8**：全部输入件中文亲读可辨，quality 关（无乱码）绿。✓
- **TDD 四档**：
  1. 首红形态：38 failed 与独立推演**精确吻合**——旧 theme.css 上 theme.test
     应红 35（34 token：40 断言中绿者仅 --panel+annotation 五色共 6；+1 body
     丝纹缺）+app-shell 3（图标/active 类/footer 文案），35+3=38。报告引用的
     FAIL 串 'Synapse Remake默认课题 ▾文献库阅读器设置脉络' 系**旧 App nav 的
     textContent**——佐证测试先于实现。可信。（报告 §4 分解文字「37+1」有误
     →N5，总数无误。）
  2. 绿：823 passed (823) / 102 files，verify.log 尾部亲读。✓
  3. 变异红证恰中性：两变异均 1 failed/822 passed 只红目标 it；算术自洽。✓
  4. cp 备份还原 diff 空：报告 §5 落盘，未用 git checkout。✓
  - 新测试恒真性排除：app-shell mock 配方与 app-quit-dirty 先例同型
    （vi.hoisted stubApi），navButton 精确文本匹配无碰撞；首红已证能失败。✓

## D. e2e 兼容性

- **25 passed (1.4m) / E2E_EXIT=0** 亲读（含 smoke 三入口+品牌、F-06 新 bodyBg
  断言、SplitPane 拖拽、workspaces 切换器——与报告 §9 一致）。✓
- **潜在视觉断言全库扫描**：tests/e2e 五 spec 中 rgb() 断言共 5 处——186/474/505
  rgb(253,224,71)（annotation-yellow 原值保持→绿）、657 rgb(255,255,255)
  （--panel 未变→绿）、662 rgb(246,244,238)（本单同步值→绿）；hex 色断言零。
  换值 8 键中仅 --bg 有断言关联且已同步。lineage.spec:491-496 变量名字符串
  断言（/--annotation-yellow/、/--danger/）实测在场，值无关。**无漏改断言、
  无 flaky 边缘残饵。** 本单改值面与断言面的交=恰 1 处（bodyBg），与预裁③
  「唯一必然红」坐实。

## E. 后续单接口面

- **夜幕 token（R2-LG9 依赖）**：lineage :root 14 键全量在场（gold 别名
  --gold-night），零缺位。mockup 星空/节点渐变第三色 #1e2745/toolbar 底等散值
  系类内值非 :root token，属 R2-U1 自取面，不构成本单缺口。
- **--font-display 键名**：与定稿 §1「Georgia,'Times New Roman','Songti SC',
  SimSun,serif」逐字一致。✓
- **R3-LIB/R3-RDR 接入点**：亮面 token 池+.app-nav 范式+.syn-btn-* 皮肤钩子
  三件齐备；Switcher 夜色适配全走变量无结构耦合；主区视图不受侧栏类名空间
  影响。接入面干净。✓

## B1（BLOCKING）——Button hover 交互态静默失效：内联 style 恒压类选择器

**证据链**：Button.tsx 终态（70 行）将静态皮肤放内联：
`style={{ ...VARIANT_STYLE[variant], ... }}`，其中 primary 含
`boxShadow:'inset ... rgba(201,168,106,.45), var(--shadow-1)'`，ghost 含
`background:'transparent', color:'var(--text)'`；theme.css:181-187 把 hover 挂类：
`.syn-btn-primary:not(:disabled):hover{box-shadow:...}` 与
`.syn-btn-ghost:not(:disabled):hover{color:var(--gold);background:var(--gold-soft)}`。

**失效机制**：CSS 级联中内联 style（style attribute）的声明优先于一切非
!important 作者规则，与选择器特异性/:hover 状态无关（tailwind v4 的 layer
机制更不可能逆转此序）。故：
1. primary hover 提亮（.45→.7+shadow-2，定稿注意事项①后段）**永不生效**——
   内联 boxShadow 恒胜；
2. ghost 金铜 hover（票面 P3 原文「ghost 变体=金铜 hover」）**永不生效**——
   内联 color/background 恒胜。

**测试盲区而非测试通过**：jsdom 不模拟 :hover 态且两新测试均不断言样式值；
e2e 无 hover 视觉断言——38 首红/823 绿/25 e2e 全绿与该缺陷正交。实现报告 §1
声称「hover 提亮(.7)与 ghost 金铜 hover 由 .syn-btn-* 附加类挂载」——陈述与
级联机制不符（「内联 style 做不了 :hover」的分工设计恰恰注定 hover 永远赢不了
内联）。

**票面依据**：P3 明示两项 hover 行为=本单核心交付（共享四件皮肤）的一部分，
「声称兑现但机制上未兑现」属门一必拦类。

**修复建议（回炉一轮，面极小）**：将 VARIANT_STYLE 的 color/background/
boxShadow 静态值一并迁入 .syn-btn-primary/.syn-btn-ghost 类（theme.css），内联
仅保留（或全空）；类内静态+:hover 自然同优先级按源序生效。修复后建议补一条
最小锁（如 theme.test 断言 .syn-btn-primary 静态规则在场）或门二人工目验 build
产物。**不动断言面/不动 props 契约，e2e 25 应保持。**

## W/N 清单

- **W1** `.app-nav{gap:2px}` 为 mockup nav 段没有的自加值（item 间距 4→6px），
  未申报。:root token 对照零偏差故不入 B；散值誊录纪律下应补报或移除，随
  B1 回炉一并处理。
- **N1** WorkspaceSwitcher.tsx:133 `<input` 缩进 +2 与属性行不齐（未申报机械
  改动，无语义）。
- **N2** 报告数字失准两处：theme.css「204 行」实为 187；「42 tsx」实测 40
  文件。不影响裁决链，收口单建议勘误。
- **N3** Switcher danger 夜面对比度 ~2.4-2.9:1 偏低——已自报（§7-7/疑虑 2），
  预裁①授权面外，留后续单 --danger-on-night。
- **N4** SplitPane 手柄端点 .15（mockup 为全透明端点）——代码注释已申报可
  发现性理由，成立，照准。
- **N5** 报告 §4 首红分解文字「theme 37+shell 1」有误（正确 35+3），总数 38
  与独立推演吻合，首红可信度不受影响。
- **N6** --text-dim 4.3:1 微欠 AA 正文线（旧值 4.4 同档，非回归）；footer
  9.5px #6d7590 on 墨青 ~3.4:1 系 mockup 原样装饰微字。均记录不拦。

## 主控预裁复核（三项全部维持）

- 预裁①（Switcher 最小夜色适配）：实测 diff=3 style 常量+注释更新，testid/
  aria/文案/交互零改——**维持**。
- 预裁②（annotation 五色保持原值）：三处 rgb(253,224,71) 断言实测在场——
  **维持**（依据坐实）。
- 预裁③（F-06 bodyBg=唯一必然红）：全库 rgb 断言扫描交面恰 1 处且已同步——
  **维持**（依据坐实）。

## 门二四清单（转交终审）

1. B1 修复后回归：Button hover 面需有红证或人工目验（现测试面对 hover 全盲）；
   确认修复未动 props/testid/断言面，e2e 25 保持。
2. W1（gap:2px）随回炉补报或移除；N1 缩进顺手正。
3. 受锁纪律：回炉若再触 tests/**（如补 hover 锁），须 locks:generate→apply
   即时同步 manifest，收口提交带 [locked-change] 尾注。
4. 收口单勘误 N2/N5（行数 187、文件数 40、首红分解 35+3）；成本账本行誊入。

## 放行裁决

**FAIL**——B1（Button hover 静默失效）阻断放行提交。其余全部门项（token 对照
零偏差/TDD 四档/受锁流程/e2e 兼容/未申报面扫描/预裁三项）合格且回炉面极小
（Button.tsx+theme.css 局部+可选一条最小锁），建议主控按三分法派一轮回炉，
修复+门二终审后可收口。

## 成本账本行

- 实现者子代理：≈4.10M tok / 15.3min（主控口径转誊）。
- 门一联审（本档）：≈0.4M tok / ≈30min（自报估——读入 diff 707+brief+定稿+
  两 mockup+报告+verify/e2e 日志+7 终态源文件+锚点抽验，全程只读）。
