你是 F-CSS-01 工单的门一对抗深审员。只读审计——只看本审计包,禁接触仓库/禁跑命令/禁臆测包外事实。不确定的明确说不确定。铁律：只读+每条 finding 给 [B|W|N]+file:line 或 diff 摘录。中文输出。

工单：A 母本符合度（票面条款 vs diff——token 留守/皮肤段拆出/import 序=层叠语义/纯迁移值零改/theme.test.ts 扩展先例符合度）;B 宪法红线（受锁 6 件改动是否全部在票面+主控追认范围内/新文件被引用/UTF-8/CSS 关卡口径）;C 代码与测试质量（**CSS 皮肤类附加强制审项=层叠源顺序显式推演**——重点:①守卫迁移的层叠论证是否严密[同特异性源顺序决胜+@media 不增特异性——审守卫选择器与 shell 件内全部 animation 声明的竞争关系,以及 buttons/reader/lineage 件是否真零 animation 面]②main.tsx import 序保持原相对序 ③close 红/标题栏按钮类同特异性源顺序依赖是否随迁保序 ④负锚 28 三元组的期望值 0 论证[:root 外零 duration 字面量]⑤CSS 关卡 450 线口径）;D 报告诚实性（自裁 3.1/3.2/3.3/3.4+续命轮 §7.6 三项逐条 vs diff——含「在线授权」表述与主控追认的关系/Toast.tsx:20 不改论证/ReaderToolbar 留主控[已由主控处置,diff 在包内]）;E 接缝与后续单（4 再锚测试的消费面完整性——tests/ 下还有无漏网 theme.css 锚[包内 grep 不可行,依实现者预核验声明+你从 diff 前后文推断]/五文件接缝注释更新准确性/P7D-01 批二字号轴的 token 面影响）。

输出：[B|W|N] 逐条+证据+统计+总评（PASS/PASS_WITH_WARNINGS/BLOCKED）。

=== 审计包正文 ===
# F-CSS-01 门一审计包（主控预生成 2026-09-05）

## 票面（registry F-CSS-01）
theme.css 分域拆件：token 块（:root 全量+@import tailwindcss+reduced-motion 守卫归置）留守 theme.css（theme.test.ts 路径锚最小扰动）;皮肤段按现有分节注释拆出（app-shell 导航/标题栏/syn-btn 按钮族/reader 周边/lineage 域）;main.tsx:5 单 import 点扩展多行 import;零视觉差验收=p7d01-visual-probe baseline 重采+COMPARE PASS（纯迁移值零改）;theme.test.ts 受锁扩展（libCss 先例多文件面）;同票裁量项=CSS 行数关卡登记。

## 主控裁决与追认（简报要点）
- 守卫迁移追认：reduced-motion 守卫驻 theme-shell.css 末（原文件 :640 守卫本就在 :235/:289 常驻声明后——源顺序层叠保持;其余三件+留守件零 animation 声明,shell 末位=全局末位等效;主控亲验 git show HEAD 行序在档）;keyframes 留守全局注册。
- 扩权追认：4 测试文件再锚（window-control/library-cards/lineage-canvas/r3-rdr-set-visual——readFileSync 锚 theme.css 标的段已迁,机械改指拆出件,断言本体零改;主控逐件亲核 diff 追认——不依赖实现者所述在线授权）。
- 受锁 6 件+CSS 关卡 450 线登记（check-quality.mjs 4b 段独立收集面）。

## 验证摘要（主控亲验）
- verify exit=0：156 文件/1450 用例（1422+28 新负锚三元组精确吻合）/locks 286 重锁后绿/lint/typecheck/build 全绿。
- 探针 COMPARE PASS（baseline 双跑 DETERMINISM+after——八态 PNG 逐字节+sweeps 逐键）;守卫位置正确性=源码行序亲验（探针对 reduced-motion 不敏感=已申报盲区,门二加实证项）。
- 守恒对账（实现者）：五件非空行与 git show HEAD 版多重集逐行全等 631=631 零外来零丢。
- 行数：theme 116/shell 236/buttons 113/reader 60/lineage 140（全≪450）;theme.test.ts 379/check-quality 172。

## 实现者报告（BLOCKED+续命轮全文——含 §3 自裁四项/§7 续命轮+自裁三项）
# F-CSS-01 实现者报告——theme.css 分域拆件

> 档位：GLM5.3flash/体验套餐优先/思考等级中（平台以实际执行模型为准）。
> **状态：续命轮完成（2026-09-05）**——首轮 BLOCKED（受锁件 R 属性）经主控
> locks:unlock 解锁+四项终裁后续作毕：受锁扩展+先红证+CSS 关卡+接缝注释更新
> +verify 全链落盘。唯一遗留红=locks:check 步 6 件已编受锁件待主控收口位
> locks:apply 重锁（票面既定流程,非缺陷）。拆件本体见 §1。

## 0. 开工技能清点

| 技能 | 用/不用 | 理由 |
|---|---|---|
| test-driven-development | 用 | 票面含受锁测试扩展+先红证要求 |
| verification-before-completion | 用 | 守恒对账/中态红集均已机检落档 |
| systematic-debugging | 用 | 边界行号漂移按内容锚系统排查（§3.3） |
| frontend-design / frontend-ui-engineering | 不用 | 纯文件拆分,无视觉/交互设计决策面 |
| webapp-testing / browser-testing | 不用 | 票面无 UI 验证面,探针验收=主控位 |

## 1. 完成面（已落盘,未提交）

### 1.1 拆件本体（守恒对账 PASS）

边界=══ 分节注释**内容锚**（主控简报行号与磁盘有 1 行漂移,见 §3.3）：

| 文件 | 拆出段（原行区间） | 行数 |
|---|---|---|
| theme.css（留守） | :1-89 基座（@import tailwindcss+文件头注+:root 全量+html/body/#root）+:616-636 共享动画 keyframes+新增拆件注 4 行 | 116 |
| theme-shell.css（新） | :91-310 App 壳（R2-SH2 顶栏身份区+切换器+R2-SET1 缩放+R2-SH3 caption 三键+侧栏 nav）+:638-645 reduced-motion 守卫（自裁迁移,§3.1） | 236 |
| theme-buttons.css（新） | :312-420 syn-btn 族（R3-TH1）+R3 菱形分隔线 | 113 |
| theme-reader.css（新） | :422-477 R3-U3 阅读器周边+active tab+等宽数字+侧板节标+R3-U4 设置分节卡+表单 focus | 60 |
| theme-lineage.css（新） | :479-614 脉络·浅色严谨板全段（图例/工具条/适应钮/边标签 C/悬停滚动） | 140 |

**守恒证据**（对照 `git show HEAD:src/renderer/shared/theme.css`）：五件全部非空行
与原版非空行**多重集逐行全等**——631=631，零外来行（unaccounted=0）、零丢行；
空行 15→15（段内空行随段搬运,5 分隔空行→装配分隔）。搬运行逐字节未动,唯一
新增=各件 `[F-CSS-01]` 头注+theme.css 拆件注。LF/UTF-8 无 BOM（源件同口径）。

### 1.2 main.tsx（:5 单 import → 五行）

theme.css 先+四皮肤件按原相对序（shell→buttons→reader→lineage）,含序注——
源顺序=层叠语义,token 留守件先于一切消费方。git diff +7 行。

### 1.3 中态红集实证（拆件生效+旧锚活性）

`npx vitest run tests/unit/renderer/theme.test.ts`：**5 failed / 83 passed (88)**。
5 红恰=内容已迁走的正锚（B1 syn-btn 三锚→buttonsCss 面、SET1 两锚→shellCss 面）；
TOKENS 47 正锚/body 锁/决5/P7D 负锚（duration 计数/ms/z-index）对新布局全绿
——皮肤段 token 消费全 var() 形态,字面量计数面零扰动（grep 实测 :root 外零
duration 字面量）。

## 2. 阻塞面（BLOCKED 根因）

- `tests\unit\renderer\theme.test.ts` 与 `scripts\check-quality.mjs` 均带
  **R 只读属性**（locks:apply 遗留——`attrib` 实测 `A  R`;bash append 实测
  Permission denied;Edit 工具实测 Permission denied）。
- brief ① 明示「编辑前无需解锁即可写」——该前提在本机不成立（locks:apply 的
  只读强制在位）。按同条预判条款「若文件系统只读拦你,报告 BLOCKED 停手」执行,
  **未自裁绕行**（attrib -r 属超票面手段,既往 audits 无先例）。
- **未做**（均依赖两受锁件写入）：①theme.test.ts 七处扩展（四读取面+正锚改指
  buttonsCss/shellCss+决5/负锚扩四件+21 三元组扩 28+ms/z-index 扩面）；
  ②check-quality.mjs CSS 行数关卡登记；③新负锚先红变异证；④终态 verify
  （f-css01-verify.raw.txt 无从产出）。

### 复启指令（主控二选一）

1. 主控侧 `attrib -r` 两件（或 `npm run locks:unlock`）后重派我续作 §2 未做四项
  （编辑方案已在案,§4）;
2. 或主控收口位自行落两件受锁编辑（§4 方案可直接采信）。
   注：locks:check 在两件内容变更后必红（sha256 对账）——本票既定收口动作
   （locks:apply+[locked-change]）不受我方 BLOCKED 影响。

## 3. 自裁申报（超票面决定全量）

### 3.1 reduced-motion 守卫迁 theme-shell.css 末（**偏离主控裁决 ③.1,请复核**）

裁决 ③.1 定守卫留守 theme.css。**留守会使守卫失效**：守卫
`.app-nav::after,.app-nav-item-active::before{animation:none}` 与 shell 域常驻
规则同选择器同特异性 (0,1,1),层叠由**源顺序**决胜——theme.css 是首 import 件,
后载的 theme-shell.css 常驻 animation 规则恒压守卫（prefers-reduced-motion 下
动画照跑=无障碍回归,且探针 baseline 不测 reduced-motion,COMPARE PASS 拦不住）。
按 ③.3 自己声明的「源顺序=层叠语义」原则+══ 语境（守卫目标全在 shell 域）裁定
随域驻 shell 件末（原文件内守卫本就在 .app-nav 规则之后）。keyframes 仍留守
（全局按名注册,定义位置无层叠面——③.1 该半条照办）。**若主控否决此裁定**：
守卫须回 theme.css 且 theme.css 须改为末位 import——与 ③.3「theme.css 在最前」
互斥,只能二择一,请终裁。

### 3.2 html/body/#root 块（:75-89）留守 theme.css

裁决 ③.1 留守清单未明列此段。裁定留守：①theme.test.ts body 锁（overflow
hidden/bg/丝纹三锚）锚 css 变量——「路径锚零扰动」推论;②全局基座语义（非皮肤域）。

### 3.3 行号漂移修正（主控分界 :422-478 → 实测 :422-477）

主控简报 reader 段引 :422-478;磁盘 ══ 锚实测 reader 注释起于 **422**（非 423）,
段尾 477（非 478）——buttons 段内有 1 行显示漂移。已全部改内容锚定位
（shell=91/buttons=312/reader=422/lineage=479/keyframes=616/guard=638）,
grep -n "══" 可复核。

### 3.4 临时工具件驻 OS 临时目录

拆分/复核脚本写 `C:\Users\Administrator\AppData\Local\Temp\f-css01-split.cjs`/
`f-css01-verify-split.cjs`——不入 repo/scripts（scripts/*.mjs 诞生即受锁面,
本票禁跑 locks 命令,入内必致 manifest 落后红）。

## 4. 受锁两件编辑方案（已定稿待写入）

### 4.1 theme.test.ts（七处）

1. libCss 块后加 shellCss/buttonsCss/readerCss/lineageCss 四 readFileSync
  （libCss 同构,相对路径 ../../../src/renderer/shared/theme-*.css）;
2. B1 describe 三正锚 css→buttonsCss（.syn-btn-primary 静态/hairline .45/
   clip-path/hover .7/ghost 金铜）;
3. SET1 两正锚 css→shellCss（.app-content-row zoom var/[data-page-column]
   calc 补偿）;
4. 决5 衬线负锚扩四件（not.toContain('var(--font-display)')）;
5. DURATION_COUNTS 扩 28 三元组（7 字面量×4 新件,期望全 0——grep 实测 :root
   外零字面量）;
6. z-index 裸值负锚扩四件;
7. MS_DECL 负锚扩四件+注释内 theme.css:319 字样随迁改指 theme-buttons.css。
   预计测试数 88→116（+28）,全套 1422→1450。

### 4.2 check-quality.mjs（§4 行数关卡段）

walk 收集 `src/renderer` 下 *.css（就地并入 :118-127 段循环,不并 srcFiles——
避免占位/乱码扫描面意外扩到 CSS）,>450 行 violation：
`${rel}: CSS 文件 ${lines} 行超上限 450（分域拆件——token/皮肤域分离）`,
同 split('\n') 口径。现状最大件 236 行,余量充足;存量 CSS 四件（116/236/113/60/
140/228/116/137）全 <450,登记即绿。

## 5. 疑虑（接缝申报,未动）

- 多处 tsx 注释仍指「皮肤住 theme.css」（Button.tsx:20/TitleBarControls.tsx:24/
  DiamondRule.tsx:12/Toast.tsx:20/App.tsx:132,166,172,174 等）——拆件后指位陈旧
  但语义不互斥,超票面未改,请主控定夺是否随票顺手更新或另立清扫票。
- p7d01-visual-probe baseline 重采=主控位（brief ③.7）,探针对 reduced-motion
  不敏感——§3.1 裁定的实际视觉影响面在探针盲区,请门审重点关注。

## 6. 工作树状态（开场三态恢复=B 脏树）

```
 M src/renderer/main.tsx          （+7 import 扩展）
 M src/renderer/shared/theme.css  （645→116 行,留守块）
?? src/renderer/shared/theme-shell.css / theme-buttons.css / theme-reader.css / theme-lineage.css
?? scripts/audits/f-css01-baseline-run{1,2}.raw.txt / f-css01-brief.md（主控既有）
```

中态 npm run test 必红（theme.test.ts 5 锚——内容已迁、测试未扩,即 §2 阻塞项）。
拆件本体自洽（守恒 PASS+中态红集恰为预期 5 锚）,无需还原;若主控弃票还原:
四新件删除+theme.tsx/theme.css checkout 即净（theme.css 为已提交件,checkout 安全）。

—— 首轮 BLOCKED 报告完。续命轮见 §7。

## 7. 续命轮（2026-09-05——主控四项终裁后续作）

### 7.1 改动清单（本轮新增面）

| 文件 | 改动 | 依据 |
|---|---|---|
| tests/unit/renderer/theme.test.ts | §4.1 七处全落：+四读取面（shellCss/buttonsCss/readerCss/lineageCss）+B1 三正锚改指 buttonsCss+SET1 两正锚改指 shellCss+决5 衬线负锚扩四件+DURATION_COUNTS 21→49 三元组+z-index 负锚扩四件+MS_DECL 负锚扩四件（含注释 theme.css:319 字样随迁改指）| 票面+主控 §4 采信 |
| scripts/check-quality.mjs | §4b CSS 行数关卡：walk src/renderer *.css >450 行 violation（独立收集面,不并 srcFiles）;即时 quality:check 实跑绿 | 票面+主控采信 |
| tests/unit/windows/window-control.test.ts | readFileSync theme.css→theme-shell.css+1 行再锚注 | **接缝扩权**（7.3） |
| tests/unit/renderer/library-cards.test.tsx | cssTheme 读取改指 theme-buttons.css+两处注释+用例名字样随迁 | 同上 |
| tests/unit/renderer/lineage-canvas.test.tsx | 边标签锁读取改指 theme-lineage.css+标题字样+1 行注 | 同上 |
| tests/unit/renderer/r3-rdr-set-visual.test.tsx | cssTheme 读取改指 theme-reader.css+头注+两用例名字样 | 同上 |
| Button.tsx/TitleBarControls.tsx/DiamondRule.tsx/App.tsx×4 处 | 「皮肤住 theme.css」陈旧注释改指 theme-*.css 对应件（7 行） | 主控终裁 3 |

### 7.2 先红证据（负锚扩展红证）

`scripts/audits/f-css01-first-red.raw.txt`：cp 备份→变异（theme-buttons.css 一处
var(--dur-fast)→0.14s,文件内计数自校验=1）→vitest **1 failed|115 passed,exit=1**,
红点恰=`['0.14s', buttonsCss, 0]` 三元组（theme.test.ts:304 expected 0 received 1）
→cp 还原 diff 空+计数归零→复跑 **116/116 exit=0**。**首试教训入档**：行内多行
node -e 在本环境被截首行静默 no-op（exit 0 零输出）——首跑 116 绿实为「变异未发生」
非锚失活,已改 temp .cjs 变异件（自校验计数）重做;后续工单变异红证禁用行内多行 node -e。

### 7.3 接缝扩权记录（超票面——主控 AskUserQuestion 在线授权「授权再锚」）

首轮 verify 实测 **8 红/4 文件**（theme.test.ts 之外漏网——§5 清点只 grep 了 src/
未覆盖 tests/,票面与简报亦仅列 theme.test.ts,双重漏）：window-control×2（drag 计数
→shell）/library-cards×2（.lib-rule→buttons）/lineage-canvas×1（边标签→lineage）/
r3-rdr-set-visual×3（toolbar/tab/settings→reader）。四处均「readFileSync 锚
theme.css,标的段已迁」——与已采信正锚改指完全同型的机械再锚;已向主控实时请裁
获授权后落改,消费点全量预核验（cssTheme 全部断言均落对应拆出件,无跨件混锚）。
ai-note-style.test.ts/reader-text.spec.ts 锚 :root token 留守件——零扰动绿。

### 7.4 verify 终态（scripts/audits/f-css01-verify.raw.txt）

- `npm run verify` **exit=1**：quality ✅（CSS 关卡生效）→tickets ✅→locks ❌
  （恰 6 件已编受锁件:check-quality.mjs+theme.test.ts+再锚 4 测试——待主控
  locks:apply 重锁,票面既定收口流程）→&& 链中断;
- locks 后各步单独补跑：**lint-exit=0 / typecheck-exit=0 / test-exit=0（156 文件
  1450/1450 用例全绿——基线 1422+28 新三元组精确吻合）/ build-exit=0**。
- locks:apply 毕后 verify 全链绿为确定性预期（6 件外零任何红源）。

### 7.5 行数终态（wc -l 实测）

theme.css **116**（645→留守）/ theme-shell.css **236** / theme-buttons.css **113** /
theme-reader.css **60** / theme-lineage.css **140**（全部 ≪450 关卡）;theme.test.ts
316→**379**;check-quality.mjs 161→**172**。git diff --stat：12 文件 +127/-569。

### 7.6 自裁申报（本轮新增）

1. **Toast.tsx:20 未改**（主控终裁 3 清单内）——该行「theme.css 变量」指 token
   变量,:root 留守 theme.css,注释仍准确;改指 theme-*.css 反而失真。
2. **ReaderToolbar.tsx:95/101 陈旧引用未改**（「theme.css .syn-btn-ghost」/
   「theme.css 单源」——标的已迁 buttons/reader）——不在主控终裁 3 五文件清单内,
   禁扩面,留主控处置（建议随收口顺手或清扫票）。
3. 变异红证首试 no-op 已以正确流程重做（7.2）,首试 raw 已被覆盖——教训本文入档。

—— 续命轮完。实现者子代理 2026-09-05

## 完整 diff（含 add -N 四新 CSS 件）
diff --git a/locks/manifest.json b/locks/manifest.json
index a8eb9e022b..a91672c373 100644
--- a/locks/manifest.json
+++ b/locks/manifest.json
@@ -1,5 +1,5 @@
 {
-    "generatedAt":  "2026-09-04T23:28:58.3831622Z",
+    "generatedAt":  "2026-09-05T01:01:02.1980857Z",
     "files":  [
                   {
                       "path":  ".github/workflows/ci.yml",
@@ -295,7 +295,7 @@
                   },
                   {
                       "path":  "scripts/check-quality.mjs",
-                      "sha256":  "ac0847593ee0eb0b848b58ad4630b8b72de480c93260847177906f7b961f324c"
+                      "sha256":  "08543f05924da0ff5ef978d51afe0ef82577106589b1edccd6096cd644f1985c"
                   },
                   {
                       "path":  "scripts/check-tickets.mjs",
@@ -727,7 +727,7 @@
                   },
                   {
                       "path":  "tests/unit/renderer/library-cards.test.tsx",
-                      "sha256":  "124d240f0b7a78c9d0c1b766b47e0250ab9fde9128cf29d7d039ffae7cd9b540"
+                      "sha256":  "e74d54afa082dccc5314a687a26fa6dfe0b529062be0d417ca1f3826024e8ee9"
                   },
                   {
                       "path":  "tests/unit/renderer/lineage-board.test.tsx",
@@ -735,7 +735,7 @@
                   },
                   {
                       "path":  "tests/unit/renderer/lineage-canvas.test.tsx",
-                      "sha256":  "55d131e8a842801f5d0162d73337c736c55b156fdd853e025451e04f6b36884e"
+                      "sha256":  "08dce970a185bb7ebff4ef2340c2d7439e1fb8ff2463c81347c68d7caafde0e0"
                   },
                   {
                       "path":  "tests/unit/renderer/lineage-canvas-visual.test.tsx",
@@ -827,7 +827,7 @@
                   },
                   {
                       "path":  "tests/unit/renderer/r3-rdr-set-visual.test.tsx",
-                      "sha256":  "1521c2fe07159ccb58eb81038658faa19f590e057d49e51383edd2945391e411"
+                      "sha256":  "5be45f84dfd953b00082182ae62350eb0cded71d003c56744d8114a4c416c879"
                   },
                   {
                       "path":  "tests/unit/renderer/reader.store.test.ts",
@@ -947,7 +947,7 @@
                   },
                   {
                       "path":  "tests/unit/renderer/theme.test.ts",
-                      "sha256":  "12d4edac025eb788c4f4f0a30f8f35daf717b862eecf54c43d7202e1ba4ccb56"
+                      "sha256":  "9312e70b0a01d79a1ae969717d915ce663352e82faf98f0030dd606604045115"
                   },
                   {
                       "path":  "tests/unit/renderer/toast.test.tsx",
@@ -1107,7 +1107,7 @@
                   },
                   {
                       "path":  "tests/unit/windows/window-control.test.ts",
-                      "sha256":  "3ef4c28c0c08ff36bcc3955a143ba226c1dcf1e498c7cac3fa587024ea3deb10"
+                      "sha256":  "2947939a02c91af8021bdedebbf794cf22a0b6ff3f152210abd325c6e099a2a9"
                   },
                   {
                       "path":  "tests/unit/windows/window-state.test.ts",
diff --git a/scripts/check-quality.mjs b/scripts/check-quality.mjs
index 9097f735d2..27f88d81f2 100644
--- a/scripts/check-quality.mjs
+++ b/scripts/check-quality.mjs
@@ -126,6 +126,17 @@ for (const f of srcFiles) {
   }
 }
 
+// 4b) [F-CSS-01] CSS 行数关卡——token/皮肤域分离防回归（theme.css 分域拆件
+//     后登记;拆件现状最大件 ~236 行,450 上限留增长余量;同 split('\n') 口径）。
+//     独立收集面：不并入 srcFiles（ts/tsx 占位/乱码扫描面不意外扩到 CSS）。
+for (const f of walk(join(root, 'src', 'renderer'), (p) => p.endsWith('.css'))) {
+  const rel = relative(root, f).replaceAll('\\', '/')
+  const lines = readFileSync(f, 'utf-8').split('\n').length
+  if (lines > 450) {
+    violations.push(`${rel}: CSS 文件 ${lines} 行超上限 450（分域拆件——token/皮肤域分离）`)
+  }
+}
+
 // 5) 分层方向（解析后绝对路径判断——ESLint glob 分不清 shared/ipc 契约与 main/ipc 层）
 //    services 不得 import main/ipc；db 不得 import services / main/ipc
 const layerRules = [
diff --git a/src/renderer/app/App.tsx b/src/renderer/app/App.tsx
index 5308152bcd..66afab424d 100644
--- a/src/renderer/app/App.tsx
+++ b/src/renderer/app/App.tsx
@@ -129,7 +129,7 @@ export function App(): JSX.Element {
   useEffect(() => {
     settingsLoad().catch(() => undefined)
   }, [settingsLoad])
-  // 数据通道单点：档位→CSS 变量（theme.css .app-content-row/[data-page-column]
+  // 数据通道单点：档位→CSS 变量（theme-shell.css .app-content-row/[data-page-column]
   // 消费——皮肤住类 B1；变量属数据通道非内联皮肤）
   useEffect(() => {
     document.documentElement.style.setProperty('--ui-scale', String(UI_SCALE[uiScale]))
@@ -163,15 +163,15 @@ export function App(): JSX.Element {
         </div>
         <span className="app-nav-ver">v0.1</span>
         {/* R2-SH3：frameless 自绘 caption 三键（版本号 margin-left:auto 吸收
-            空隙，三键组排最右——bilibili 式；皮肤住 theme.css） */}
+            空隙，三键组排最右——bilibili 式；皮肤住 theme-shell.css） */}
         <TitleBarControls />
       </header>
       {/* min-h-0：内容行高度约束（文档永不滚不变量——滚动只发生在 main 容器）。
           R2-SET1：app-content-row=界面缩放挂载行（zoom 经 --ui-scale）——header
           在行外结构性豁免（E5：caption 三键/顶栏保持系统观感）；PDF 页列在
-          theme.css [data-page-column] 反向补偿恒视觉 1.0 */}
+          theme-shell.css [data-page-column] 反向补偿恒视觉 1.0 */}
       <div className="app-content-row flex min-h-0 flex-1">
-        {/* R3-TH1 墨青侧栏（.app-nav 系=theme.css 誊录自 mockup）——R2-SH2
+        {/* R3-TH1 墨青侧栏（.app-nav 系=theme-shell.css 誊录自 mockup）——R2-SH2
             品牌行退役迁顶栏后，nav 首行直接起导航项 */}
         <nav className="app-nav">
           {NAV.map((item) => (
diff --git a/src/renderer/app/TitleBarControls.tsx b/src/renderer/app/TitleBarControls.tsx
index 59ae3d201f..4045b48431 100644
--- a/src/renderer/app/TitleBarControls.tsx
+++ b/src/renderer/app/TitleBarControls.tsx
@@ -21,7 +21,8 @@
  * ── 架构层 ──
  * - renderer → window.api.system.windowControl（既有机制零新面）；action 类型
  *   经 shared/ipc/schemas 单源复用（纯 type import，禁手写第二份）
- * - 皮肤住 theme.css 类（B1 教训：禁内联 style 承载交互态）
+ * - 皮肤住 theme-shell.css 类（B1 教训：禁内联 style 承载交互态——F-CSS-01
+ *   自 theme.css 拆出）
  *
  * ── 生命周期层 ──
  * - effect：get-state 拉初值（时序自包含，不依赖 did-finish-load 推送——
diff --git a/src/renderer/features/reader/ReaderToolbar.tsx b/src/renderer/features/reader/ReaderToolbar.tsx
index fdb7b37ab0..b1db182338 100644
--- a/src/renderer/features/reader/ReaderToolbar.tsx
+++ b/src/renderer/features/reader/ReaderToolbar.tsx
@@ -92,13 +92,13 @@ export function ReaderToolbar(props: {
     setPageInput(String(page + 1))
   }
 
-  // R3-U3 皮肤票：控件走 ghost 变体语言（theme.css .syn-btn-ghost——Button
-  // 组件同款皮肤类；不经 Button 组件因其不带 title prop，「适应宽度」禁用态
-  // title 提示属交互面零变项，保留原生 button）
+  // R3-U3 皮肤票：控件走 ghost 变体语言（theme-buttons.css .syn-btn-ghost
+  // ——Button 组件同款皮肤类；不经 Button 组件因其不带 title prop，「适应宽度」
+  // 禁用态 title 提示属交互面零变项，保留原生 button）
   const btn = 'syn-btn-ghost rounded border px-2 py-0.5 text-xs disabled:opacity-50'
 
   return (
-    // 玻璃浮层皮肤（--panel-glass+blur10+金 hairline 底缘——theme.css 单源；
+    // 玻璃浮层皮肤（--panel-glass+blur10+金 hairline 底缘——theme-reader.css 单源；
     // 文档流位置零变：纯皮肤票，F-05 滚动收敛面不扰动）
     <div className="rdr-toolbar flex shrink-0 flex-wrap items-center gap-2 px-3 py-2 text-xs">
       <div className="flex items-center gap-1">
diff --git a/src/renderer/main.tsx b/src/renderer/main.tsx
index 0283814dba..aa6d6bc20b 100644
--- a/src/renderer/main.tsx
+++ b/src/renderer/main.tsx
@@ -3,6 +3,13 @@ import { createRoot } from 'react-dom/client'
 import { App } from './app/App'
 import { getReaderOutbox } from './features/reader/reading-time-setup'
 import './shared/theme.css'
+// [F-CSS-01] theme.css 分域拆件——import 序=原相对序（源顺序=层叠语义）：
+// token 留守件先行（@import tailwindcss+:root 必先于一切消费方），四皮肤件
+// 按原 theme.css 内段序 壳→按钮→阅读器→脉络
+import './shared/theme-shell.css'
+import './shared/theme-buttons.css'
+import './shared/theme-reader.css'
+import './shared/theme-lineage.css'
 
 const rootEl = document.getElementById('root')
 if (!rootEl) throw new Error('找不到 #root 挂载点')
diff --git a/src/renderer/shared/theme-buttons.css b/src/renderer/shared/theme-buttons.css
new file mode 100644
index 0000000000..d24c548ea0
--- /dev/null
+++ b/src/renderer/shared/theme-buttons.css
@@ -0,0 +1,113 @@
+/* [F-CSS-01] 自 theme.css 拆出 2026-09-05——共享按钮域皮肤：syn-btn 变体族
+   （R3-TH1）+R3 菱形分隔线（.lib-rule*——DiamondRule 组件消费）。
+   纯迁移值零改;import 序=theme-shell.css 之后。 */
+
+/* ══ 共享 Button 变体皮肤（R3-TH1；回炉 B1：静态+hover 全迁类）══
+   B1 教训：静态皮肤住内联 style 时，内联声明层叠上恒压任何类选择器，
+   :hover 挂类=永不生效——静态与 hover 必须同层（本节均为非 @layer 规则，
+   层叠上压过 tailwind utilities 层：unlayered > layered）。
+   CTA 语法：primary=墨青+inset 金 hairline(.45 静态→hover .7 提亮，定稿
+   注意事项①)+6px 切角；ghost hover=金铜。
+   R2-UI1 增量：primary 渐变底+hover 渐变流动（background-position 平移）；
+   全族 :active=游戏钮按压反馈（色变+微缩+下沉，瞬态 80~120ms）。 */
+.syn-btn-primary {
+  background: linear-gradient(150deg, #3a76ab 0%, var(--accent) 48%, #234a6d 100%);
+  background-size: 160% 160%;
+  background-position: 0% 50%;
+  color: #ffffff;
+  border-color: #234a6d;
+  box-shadow: inset 0 0 0 1px rgba(201, 168, 106, 0.45), var(--shadow-1);
+  clip-path: polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px);
+  transition:
+    background-position var(--dur-flow) ease,
+    box-shadow var(--dur-base) ease,
+    transform var(--dur-press) ease,
+    filter var(--dur-tint) ease;
+}
+.syn-btn-primary:not(:disabled):hover {
+  box-shadow: inset 0 0 0 1px rgba(227, 201, 143, 0.7), var(--shadow-2);
+  /* 渐变流动：hover 期渐变端点平移到亮端（R2-UI1） */
+  background-position: 100% 50%;
+}
+.syn-btn-primary:not(:disabled):active {
+  background-position: 100% 50%;
+  filter: brightness(0.88);
+  transform: translateY(1px) scale(0.98);
+  box-shadow:
+    inset 0 0 0 1px rgba(227, 201, 143, 0.7),
+    inset 0 2px 6px rgba(11, 26, 40, 0.45);
+}
+.syn-btn-secondary {
+  background: var(--panel);
+  color: var(--text);
+  border-color: var(--border);
+  transition:
+    background var(--dur-fast) ease,
+    border-color var(--dur-fast) ease,
+    transform var(--dur-press) ease;
+}
+.syn-btn-secondary:not(:disabled):active {
+  background: var(--accent-soft);
+  border-color: var(--accent);
+  color: var(--accent);
+  transform: translateY(1px) scale(0.98);
+}
+.syn-btn-danger {
+  background: var(--panel);
+  color: var(--danger);
+  border-color: var(--danger);
+  transition:
+    background var(--dur-fast) ease,
+    border-color var(--dur-fast) ease,
+    transform var(--dur-press) ease;
+}
+.syn-btn-danger:not(:disabled):active {
+  background: rgba(179, 64, 58, 0.12);
+  filter: brightness(0.96);
+  transform: translateY(1px) scale(0.98);
+}
+.syn-btn-ghost {
+  background: transparent;
+  color: var(--text);
+  border: none;
+  transition:
+    background var(--dur-fast) ease,
+    color var(--dur-fast) ease,
+    transform var(--dur-press) ease;
+}
+.syn-btn-ghost:not(:disabled):hover {
+  color: var(--gold);
+  background: var(--gold-soft);
+}
+.syn-btn-ghost:not(:disabled):active {
+  color: var(--gold);
+  background: rgba(207, 174, 114, 0.3);
+  transform: scale(0.96);
+}
+
+/* ══ R3 菱形分隔线（共享语法——回炉 W3 自 library.css 迁入：R3-U2 文献库
+   筛选区|列表与详情空态、R3-U4 设置分节复用同一语法；线段 min-width 24px+
+   flex:1 窄窗防碰撞——设计定稿注意事项③）══ */
+.lib-rule {
+  display: flex;
+  align-items: center;
+  gap: 10px;
+}
+.lib-rule-line {
+  flex: 1;
+  min-width: 24px;
+  height: 1px;
+}
+.lib-rule-line-l {
+  background: linear-gradient(90deg, transparent, var(--border-gold));
+}
+.lib-rule-line-r {
+  background: linear-gradient(90deg, var(--border-gold), transparent);
+}
+.lib-rule-gem {
+  flex: none;
+  width: 6px;
+  height: 6px;
+  background: var(--gold);
+  transform: rotate(45deg);
+}
diff --git a/src/renderer/shared/theme-lineage.css b/src/renderer/shared/theme-lineage.css
new file mode 100644
index 0000000000..6e1cc016f9
--- /dev/null
+++ b/src/renderer/shared/theme-lineage.css
@@ -0,0 +1,140 @@
+/* [F-CSS-01] 自 theme.css 拆出 2026-09-05——脉络域皮肤：浅色严谨板全段
+   （R2-LG11 边型图例/工具条白玻璃/适应视图按钮/F-L1-C 边标签 C 变体/悬停滚动）。
+   纯迁移值零改;import 序=四皮肤件末位。 */
+
+/* ══ 脉络·浅色严谨板（R2-LG11——白卡+细边框编码+浅色层带/工具条/图例；
+   夜幕 token 定义保留 :root 备暗色主题，脉络域样式消费清零——决5 同
+   精神；夜幕/星空/角饰/渐变样式块随 LineageNightDecor 删除而删）══ */
+.lineage-host {
+  position: relative;
+  overflow: hidden;
+  color: var(--text);
+  background: var(--bg);
+}
+/* 边型图例（四型——静态说明非交互件；浅色白卡圆角） */
+.lineage-legend {
+  position: absolute;
+  left: 96px;
+  bottom: 16px;
+  display: flex;
+  gap: 14px;
+  font-size: 10.5px;
+  color: var(--text-dim);
+  background: rgba(255, 255, 255, 0.88);
+  border: 1px solid var(--border);
+  border-radius: var(--radius-m);
+  padding: 4px 12px;
+  backdrop-filter: blur(8px);
+  align-items: center;
+  pointer-events: none;
+}
+.lineage-legend-item {
+  display: inline-flex;
+  align-items: center;
+}
+.lineage-legend-item i {
+  display: inline-block;
+  width: 18px;
+  height: 0;
+  vertical-align: middle;
+  margin-right: 5px;
+  border-top: 1.5px solid var(--accent);
+}
+.lineage-legend-item i.lg-normal {
+  border-top: 1px solid var(--node-branch);
+}
+.lineage-legend-item i.lg-theme {
+  border-top: 1px dashed var(--node-branch);
+}
+.lineage-legend-item i.lg-survey {
+  border-top: 1.4px dashed var(--survey-edge);
+}
+/* F-LG15 人工补父边图例（琥珀长虚线——与渲染 stroke-dasharray 7 5 同型） */
+.lineage-legend-item i.lg-manual {
+  border-top: 1.4px dashed var(--manual-edge);
+}
+/* 脉络工具条白玻璃浮层（R2-LG11：blur+border+shadow-2） */
+.lineage-toolbar {
+  display: flex;
+  align-items: center;
+  gap: 6px;
+  padding: 6px 10px;
+  border-radius: 12px;
+  background: rgba(255, 255, 255, 0.88);
+  backdrop-filter: blur(10px);
+  border: 1px solid var(--border);
+  box-shadow: var(--shadow-2);
+  font-size: 13px;
+}
+.lineage-toolbar > button {
+  background: transparent;
+  border: 0;
+  color: var(--text-dim);
+  padding: 4px 10px;
+  border-radius: 8px;
+  cursor: pointer;
+  font-size: 13px;
+}
+.lineage-toolbar > button:hover {
+  color: var(--text);
+  background: var(--accent-soft);
+}
+.lineage-toolbar > span {
+  background: transparent;
+  color: var(--text-dim);
+}
+/* R2-LG11 「适应视图」按钮（画布右下浮层——白玻璃同族；
+   auto-fit 显式复位唯一入口，见 LineageCanvas 头注状态机） */
+.lineage-fit-btn {
+  position: absolute;
+  right: 12px;
+  bottom: 12px;
+  z-index: var(--z-float);
+  padding: 4px 12px;
+  border-radius: 999px;
+  background: rgba(255, 255, 255, 0.88);
+  backdrop-filter: blur(10px);
+  border: 1px solid var(--border);
+  color: var(--text-dim);
+  font-size: 12px;
+  cursor: pointer;
+}
+.lineage-fit-btn:hover {
+  color: var(--text);
+  background: var(--accent-soft);
+}
+.lineage-toolbar > button:active,
+.lineage-fit-btn:active {
+  transform: scale(0.95);
+  background: var(--accent-soft);
+  color: var(--accent);
+}
+
+/* F-L1-C 边标签（变体 C 窄幅注释——2026-08-30 用户裁决案册定稿）：
+   foreignObject 内 HTML div 自然换行；9.5px 斜体灰阶 #6b7280 弱于节点
+   文字（图注层级）+白晕 text-shadow 四向 2px 截线（线从字后穿行被白晕
+   截断）；max-height 3 行×9.5×1.3=37.05+overflow hidden（真实溢出内容
+   承载滚动语义——非 line-clamp 省略）。悬停滚动交互态驻本类（B1 教训
+   禁内联）；FO 层 pointer-events none（内联静态属性），div auto 由本类
+   承载。 */
+.lineage-edge-label {
+  box-sizing: border-box;
+  width: 100%;
+  height: 100%;
+  padding: 2px;
+  font-size: 9.5px;
+  line-height: 1.3;
+  font-style: italic;
+  color: #6b7280;
+  text-align: center;
+  overflow-wrap: break-word;
+  max-height: 37.05px;
+  overflow: hidden;
+  text-shadow: 2px 0 #ffffff, -2px 0 #ffffff, 0 2px #ffffff, 0 -2px #ffffff;
+  pointer-events: auto;
+}
+/* 悬停滚动（用户保证②）：截断文字悬停可滚（scrollHeight 全文高度——
+   LineageEdges wheel 委托同步阻断画布 zoom） */
+.lineage-edge-label:hover {
+  overflow-y: auto;
+}
diff --git a/src/renderer/shared/theme-reader.css b/src/renderer/shared/theme-reader.css
new file mode 100644
index 0000000000..87fcf217bf
--- /dev/null
+++ b/src/renderer/shared/theme-reader.css
@@ -0,0 +1,60 @@
+/* [F-CSS-01] 自 theme.css 拆出 2026-09-05——阅读器周边域皮肤：R3-U3 工具条
+   玻璃浮层/active tab/等宽数字/侧板节标+R3-U4 设置分节卡与表单 focus。
+   纯迁移值零改;import 序=theme-buttons.css 之后。 */
+
+/* ══ R3-U3 阅读器周边皮肤（装饰浓度最低——PDF 区中性不变；玻璃浮层+纸面
+   tab+侧板节标。ReaderToolbar/TabBar/ReaderNotesPanel 消费；标注/AI/选区
+   层零触碰——F-07 层叠链红线）══ */
+.rdr-toolbar {
+  background: var(--panel-glass);
+  backdrop-filter: blur(10px);
+  border-bottom: 1px solid var(--border-gold);
+  box-shadow: var(--shadow-1);
+}
+/* active tab=纸面底+inset 金 hairline 底缘（box-shadow inset 零占位——h-8
+   布局不变，F-05 滚动收敛面不扰动；旧 accent-soft 满铺退役） */
+.rdr-tab-active {
+  background: var(--panel);
+  box-shadow: inset 0 -2px 0 0 var(--border-gold);
+}
+/* 阅读器数字（页码/缩放）tabular-nums 等宽数字（R2-SH2 决5：衬线消费清零，
+   回继承 UI 字体——同规则 font-variant-numeric 不动） */
+.rdr-num {
+  font-variant-numeric: tabular-nums;
+}
+/* 阅读器侧板节标：h4 金左缘条（R2-SH2 决5：衬线消费清零；夜色只属脉络域——侧板保持亮面） */
+.rdr-aside-h4 {
+  margin: 0;
+  font-size: 11.5px;
+  font-weight: 600;
+  letter-spacing: 0.5px;
+  color: var(--text);
+  border-left: 3px solid var(--gold);
+  padding-left: 8px;
+}
+
+/* ══ R3-U4 设置分节卡（作用域皮肤：> section 直达自持节——CorpusExportSection
+   等票面外文件零触碰的同视觉收敛；节间菱形分隔经 DiamondRule 组件复用
+   .lib-rule*）══ */
+.syn-settings > section {
+  background: var(--panel);
+  border: 1px solid var(--border);
+  border-radius: var(--radius-l);
+  box-shadow: var(--shadow-1);
+  padding: 14px 16px;
+}
+.syn-settings h2 {
+  margin: 0 0 2px;
+  font-size: 13px;
+  font-weight: 600;
+  letter-spacing: 0.5px;
+  color: var(--text);
+  border-left: 3px solid var(--gold);
+  padding-left: 8px;
+}
+/* 表单控件 focus：accent 描边+gold-soft 底（票面 P2） */
+.syn-input:focus {
+  outline: none;
+  border-color: var(--accent);
+  background: var(--gold-soft);
+}
diff --git a/src/renderer/shared/theme-shell.css b/src/renderer/shared/theme-shell.css
new file mode 100644
index 0000000000..ad0b3c608a
--- /dev/null
+++ b/src/renderer/shared/theme-shell.css
@@ -0,0 +1,236 @@
+/* [F-CSS-01] 自 theme.css 拆出 2026-09-05——App 壳域皮肤：顶栏身份区（R2-SH2
+   决4）+课题切换器+界面缩放（R2-SET1）+caption 三键（R2-SH3）+侧栏 nav（R2-SH2）。
+   纯迁移值零改;import 序=theme.css 之后（壳→按钮→阅读器→脉络保原相对序）。
+   reduced-motion 无障碍守卫随域驻本件末尾（自裁申报：守卫目标
+   .app-nav::after/.app-nav-item-active::before 全在本域,同特异性下须源顺序
+   在后方能压住常驻 animation 规则——留守首件 theme.css 会被后载的本件反压失效）。 */
+
+/* ══ App 壳顶栏身份区（R2-SH2 决4——ZCode 式）：白底横条（--panel+下边 1px
+   --border+高 56px）=logo+应用名+课题切换器+版本号右区；relative+z-index 防
+   切换器展开面板被 main 区盖板（面板在组件 flex-col 流内向下溢出绘制）══
+   高度 44→56px（用户裁决 2026-08-31：按钮与 Synapse 标志下移——增高级；
+   caption 三键 stretch 贯通自动随高，width:44 热区宽不动）══ */
+/* R2-SH3：整条=拖拽区（drag）——双击空白即 Windows 系统最大化/还原（drag 区
+   原生行为零代码）；交互件容器单独 no-drag（见 switcher/titlebar 两处） */
+.app-header {
+  display: flex;
+  align-items: center;
+  gap: 8px;
+  flex: none;
+  height: 56px;
+  padding: 0 12px;
+  position: relative;
+  z-index: var(--z-float);
+  background: var(--panel);
+  border-bottom: 1px solid var(--border);
+  -webkit-app-region: drag;
+}
+.app-header svg {
+  width: 22px;
+  height: 22px;
+  flex: none;
+}
+.app-header-name {
+  font-size: 15px;
+  font-weight: 600;
+  letter-spacing: 0.5px;
+  color: var(--text);
+}
+/* 切换器容器=面板绝对定位锚：relative 面板 top:100% 悬浮于按钮正下
+   （脱离文档流——容器高度恒=按钮高，按钮在顶栏的垂直居中位恒定，
+   **展开/收起不再上移跳动**——用户实锤 2026-08-31：流内 max-height 方案
+   下面板展开把容器从按钮高撑到 56px，居中锚点随之上移，56px 顶栏时代
+   按钮跳 ~13.5px 贴无边框窗口顶；no-drag=触发钮与展开面板（溢出
+   header 盒侵入 main 区部分同为面板自身盒——不被 drag 吞点击） */
+.app-header-switcher {
+  position: relative;
+  -webkit-app-region: no-drag;
+}
+.app-header .app-nav-ver {
+  margin-left: auto;
+}
+
+/* ══ R2-SET1 界面缩放三档：--ui-scale 挂 documentElement（App effect 单点写，
+   数值映射单源=shared/ipc/schemas UI_SCALE 1/1.1/1.25）。
+   内容行整行缩放（nav+main 文本面）；header 在行外结构性豁免（E5 裁决——
+   caption 三键/顶栏身份区保持系统观感，恒定不随档位变）；
+   PDF 页列反向补偿恒视觉 1.0——探针实测（r2-set1-out-probe.json）：canvas
+   跟随 ×1.1 位图拉伸模糊，zoom: calc(1 / var(--ui-scale, 1)) Chromium 接受且
+   canvas 精确恢复 612×792 原始视觉+背衬匹配+textLayer 对位不受破坏（对位
+   安全=两容器同缩放系内锚定）；补偿必须与缩放同变——单独 zoom:1 无效（相乘
+   语义）；三态属性选择器通配（ready/loading/error）══ */
+.app-content-row {
+  zoom: var(--ui-scale, 1);
+}
+[data-page-column] {
+  zoom: calc(1 / var(--ui-scale, 1));
+}
+
+/* ══ R2-SH3 frameless caption 三键（bilibili 式）：贯通顶栏高的方形热区，
+   hover 浸染；close hover=系统红 #e81123。皮肤住类（B1 教训：禁内联 style
+   承载交互态）；.titlebar-btn svg 覆写上方 .app-header svg 的 22px 默认
+   （同特异性源顺序在后胜）══ */
+.titlebar-controls {
+  display: flex;
+  align-items: stretch;
+  /* header 的 center 对齐下容器自身贯通整条高（按钮 stretch 满高热区——
+     否则容器按内容(SVG 10px)收缩，真机取证 rect 实测高仅 10px 病灶） */
+  align-self: stretch;
+  flex: none;
+  /* -12 对冲上方 .app-header 的 padding: 0 12px（:86）——热区贴窗口右缘
+     贯通（bilibili 式）；两值数值联动，改 header padding 须同步改此值
+     （门一 C5） */
+  margin-right: -12px;
+  -webkit-app-region: no-drag;
+}
+.titlebar-btn {
+  display: inline-flex;
+  align-items: center;
+  justify-content: center;
+  width: 44px;
+  align-self: stretch;
+  border: 0;
+  background: transparent;
+  color: var(--text-dim);
+  cursor: pointer;
+  padding: 0;
+  transition:
+    background var(--dur-tint) ease,
+    color var(--dur-tint) ease;
+}
+.titlebar-btn svg {
+  width: 10px;
+  height: 10px;
+  flex: none;
+  stroke: currentColor;
+  fill: none;
+  stroke-width: 1;
+}
+.titlebar-btn:hover {
+  background: rgba(44, 95, 138, 0.1);
+  color: var(--text);
+}
+.titlebar-btn:active {
+  background: rgba(44, 95, 138, 0.2);
+  color: var(--accent);
+}
+/* close 红依赖与 .titlebar-btn:hover/:active 同特异性 (0,2,0) 下源顺序在
+   后胜——勿在本块之后追加 .titlebar-btn:hover 变体，否则压掉 close 红
+   （门一 C6） */
+.titlebar-btn-close:hover {
+  background: #e81123;
+  color: #ffffff;
+}
+.titlebar-btn-close:active {
+  background: #f1707a;
+  color: #ffffff;
+}
+
+/* ══ App 壳侧栏（墨青 + 金——shell-library.html nav 段誊录，App.tsx 消费；
+   R2-SH2 品牌行迁顶栏后 nav 首行直接起导航项，foot 留侧栏）══ */
+.app-nav {
+  width: 184px;
+  flex: none;
+  display: flex;
+  flex-direction: column;
+  padding: 14px 10px;
+  position: relative;
+  color: #cfd5e4;
+  background: linear-gradient(180deg, var(--ink), #171e2f);
+}
+/* 右缘金渐隐线（mockup nav::after 语法逐值誊录；R2-UI1 加 220% 纵向渐变
+   缓移——金线沿侧栏缘缓慢流淌，UI「活」感的常驻层（reduced-motion 关） */
+.app-nav::after {
+  content: '';
+  position: absolute;
+  top: 0;
+  right: 0;
+  bottom: 0;
+  width: 1px;
+  background: linear-gradient(180deg, transparent, rgba(201, 168, 106, 0.5), transparent);
+  background-size: 100% 220%;
+  animation: syn-pan-y 5s linear infinite;
+}
+.app-nav-item {
+  display: flex;
+  align-items: center;
+  gap: 10px;
+  padding: 10px 12px;
+  margin: 2px 4px;
+  border: 0;
+  background: transparent;
+  border-radius: var(--radius-m);
+  font-family: inherit;
+  font-size: 13.5px;
+  color: #aeb6ca;
+  text-align: left;
+  cursor: pointer;
+  position: relative;
+  transition: all var(--dur-base) ease;
+}
+.app-nav-item svg {
+  width: 17px;
+  height: 17px;
+  flex: none;
+  stroke: currentColor;
+  fill: none;
+  stroke-width: 1.6;
+}
+.app-nav-item:hover {
+  color: #e6eaf4;
+  background: rgba(255, 255, 255, 0.06);
+}
+/* 按压反馈（R2-UI1 游戏钮语义）：冷蓝闪现+微缩——瞬态色变+形变双通道 */
+.app-nav-item:active {
+  color: #eaf1fa;
+  background: rgba(44, 95, 138, 0.35);
+  transform: scale(0.97);
+}
+/* active 态：金左缘条 + ink-hi 底 + inset 金 hairline（mockup .nav-item.active） */
+.app-nav-item-active {
+  color: #f3eddd;
+  background: var(--ink-hi);
+  box-shadow: inset 0 0 0 1px rgba(201, 168, 106, 0.28);
+}
+.app-nav-item-active::before {
+  content: '';
+  position: absolute;
+  left: -10px;
+  top: 9px;
+  bottom: 9px;
+  width: 3px;
+  border-radius: 2px;
+  background: linear-gradient(180deg, var(--gold-bright), var(--gold));
+  /* R2-UI1：金条 300% 纵向缓移——选中态常驻微光（reduced-motion 关） */
+  background-size: 100% 300%;
+  animation: syn-pan-y 2.8s ease-in-out infinite;
+}
+.app-nav-foot {
+  margin-top: auto;
+  padding: 10px 8px 2px;
+  border-top: 1px solid rgba(255, 255, 255, 0.07);
+  display: flex;
+  align-items: center;
+  gap: 8px;
+}
+.app-nav-ver {
+  font-size: 9.5px;
+  letter-spacing: 1px;
+  color: #8d95ad;
+  border: 1px solid rgba(141, 149, 173, 0.4);
+  border-radius: 4px;
+  padding: 1px 6px;
+}
+.app-nav-txt {
+  font-size: 9.5px;
+  color: #6d7590;
+}
+
+/* ══ R2-UI1 无障碍守卫：系统「减少动态效果」时常驻渐变动画全关
+   （交互瞬态 transition 保留——按压反馈属操作确认非装饰动效）══ */
+@media (prefers-reduced-motion: reduce) {
+  .app-nav::after,
+  .app-nav-item-active::before {
+    animation: none;
+  }
+}
diff --git a/src/renderer/shared/theme.css b/src/renderer/shared/theme.css
index c40786e03b..4ab2da1c2c 100644
--- a/src/renderer/shared/theme.css
+++ b/src/renderer/shared/theme.css
@@ -88,530 +88,10 @@ body,
   background-image: repeating-linear-gradient(115deg, rgba(255, 255, 255, 0.35) 0 2px, transparent 2px 6px);
 }
 
-/* ══ App 壳顶栏身份区（R2-SH2 决4——ZCode 式）：白底横条（--panel+下边 1px
-   --border+高 56px）=logo+应用名+课题切换器+版本号右区；relative+z-index 防
-   切换器展开面板被 main 区盖板（面板在组件 flex-col 流内向下溢出绘制）══
-   高度 44→56px（用户裁决 2026-08-31：按钮与 Synapse 标志下移——增高级；
-   caption 三键 stretch 贯通自动随高，width:44 热区宽不动）══ */
-/* R2-SH3：整条=拖拽区（drag）——双击空白即 Windows 系统最大化/还原（drag 区
-   原生行为零代码）；交互件容器单独 no-drag（见 switcher/titlebar 两处） */
-.app-header {
-  display: flex;
-  align-items: center;
-  gap: 8px;
-  flex: none;
-  height: 56px;
-  padding: 0 12px;
-  position: relative;
-  z-index: var(--z-float);
-  background: var(--panel);
-  border-bottom: 1px solid var(--border);
-  -webkit-app-region: drag;
-}
-.app-header svg {
-  width: 22px;
-  height: 22px;
-  flex: none;
-}
-.app-header-name {
-  font-size: 15px;
-  font-weight: 600;
-  letter-spacing: 0.5px;
-  color: var(--text);
-}
-/* 切换器容器=面板绝对定位锚：relative 面板 top:100% 悬浮于按钮正下
-   （脱离文档流——容器高度恒=按钮高，按钮在顶栏的垂直居中位恒定，
-   **展开/收起不再上移跳动**——用户实锤 2026-08-31：流内 max-height 方案
-   下面板展开把容器从按钮高撑到 56px，居中锚点随之上移，56px 顶栏时代
-   按钮跳 ~13.5px 贴无边框窗口顶；no-drag=触发钮与展开面板（溢出
-   header 盒侵入 main 区部分同为面板自身盒——不被 drag 吞点击） */
-.app-header-switcher {
-  position: relative;
-  -webkit-app-region: no-drag;
-}
-.app-header .app-nav-ver {
-  margin-left: auto;
-}
-
-/* ══ R2-SET1 界面缩放三档：--ui-scale 挂 documentElement（App effect 单点写，
-   数值映射单源=shared/ipc/schemas UI_SCALE 1/1.1/1.25）。
-   内容行整行缩放（nav+main 文本面）；header 在行外结构性豁免（E5 裁决——
-   caption 三键/顶栏身份区保持系统观感，恒定不随档位变）；
-   PDF 页列反向补偿恒视觉 1.0——探针实测（r2-set1-out-probe.json）：canvas
-   跟随 ×1.1 位图拉伸模糊，zoom: calc(1 / var(--ui-scale, 1)) Chromium 接受且
-   canvas 精确恢复 612×792 原始视觉+背衬匹配+textLayer 对位不受破坏（对位
-   安全=两容器同缩放系内锚定）；补偿必须与缩放同变——单独 zoom:1 无效（相乘
-   语义）；三态属性选择器通配（ready/loading/error）══ */
-.app-content-row {
-  zoom: var(--ui-scale, 1);
-}
-[data-page-column] {
-  zoom: calc(1 / var(--ui-scale, 1));
-}
-
-/* ══ R2-SH3 frameless caption 三键（bilibili 式）：贯通顶栏高的方形热区，
-   hover 浸染；close hover=系统红 #e81123。皮肤住类（B1 教训：禁内联 style
-   承载交互态）；.titlebar-btn svg 覆写上方 .app-header svg 的 22px 默认
-   （同特异性源顺序在后胜）══ */
-.titlebar-controls {
-  display: flex;
-  align-items: stretch;
-  /* header 的 center 对齐下容器自身贯通整条高（按钮 stretch 满高热区——
-     否则容器按内容(SVG 10px)收缩，真机取证 rect 实测高仅 10px 病灶） */
-  align-self: stretch;
-  flex: none;
-  /* -12 对冲上方 .app-header 的 padding: 0 12px（:86）——热区贴窗口右缘
-     贯通（bilibili 式）；两值数值联动，改 header padding 须同步改此值
-     （门一 C5） */
-  margin-right: -12px;
-  -webkit-app-region: no-drag;
-}
-.titlebar-btn {
-  display: inline-flex;
-  align-items: center;
-  justify-content: center;
-  width: 44px;
-  align-self: stretch;
-  border: 0;
-  background: transparent;
-  color: var(--text-dim);
-  cursor: pointer;
-  padding: 0;
-  transition:
-    background var(--dur-tint) ease,
-    color var(--dur-tint) ease;
-}
-.titlebar-btn svg {
-  width: 10px;
-  height: 10px;
-  flex: none;
-  stroke: currentColor;
-  fill: none;
-  stroke-width: 1;
-}
-.titlebar-btn:hover {
-  background: rgba(44, 95, 138, 0.1);
-  color: var(--text);
-}
-.titlebar-btn:active {
-  background: rgba(44, 95, 138, 0.2);
-  color: var(--accent);
-}
-/* close 红依赖与 .titlebar-btn:hover/:active 同特异性 (0,2,0) 下源顺序在
-   后胜——勿在本块之后追加 .titlebar-btn:hover 变体，否则压掉 close 红
-   （门一 C6） */
-.titlebar-btn-close:hover {
-  background: #e81123;
-  color: #ffffff;
-}
-.titlebar-btn-close:active {
-  background: #f1707a;
-  color: #ffffff;
-}
-
-/* ══ App 壳侧栏（墨青 + 金——shell-library.html nav 段誊录，App.tsx 消费；
-   R2-SH2 品牌行迁顶栏后 nav 首行直接起导航项，foot 留侧栏）══ */
-.app-nav {
-  width: 184px;
-  flex: none;
-  display: flex;
-  flex-direction: column;
-  padding: 14px 10px;
-  position: relative;
-  color: #cfd5e4;
-  background: linear-gradient(180deg, var(--ink), #171e2f);
-}
-/* 右缘金渐隐线（mockup nav::after 语法逐值誊录；R2-UI1 加 220% 纵向渐变
-   缓移——金线沿侧栏缘缓慢流淌，UI「活」感的常驻层（reduced-motion 关） */
-.app-nav::after {
-  content: '';
-  position: absolute;
-  top: 0;
-  right: 0;
-  bottom: 0;
-  width: 1px;
-  background: linear-gradient(180deg, transparent, rgba(201, 168, 106, 0.5), transparent);
-  background-size: 100% 220%;
-  animation: syn-pan-y 5s linear infinite;
-}
-.app-nav-item {
-  display: flex;
-  align-items: center;
-  gap: 10px;
-  padding: 10px 12px;
-  margin: 2px 4px;
-  border: 0;
-  background: transparent;
-  border-radius: var(--radius-m);
-  font-family: inherit;
-  font-size: 13.5px;
-  color: #aeb6ca;
-  text-align: left;
-  cursor: pointer;
-  position: relative;
-  transition: all var(--dur-base) ease;
-}
-.app-nav-item svg {
-  width: 17px;
-  height: 17px;
-  flex: none;
-  stroke: currentColor;
-  fill: none;
-  stroke-width: 1.6;
-}
-.app-nav-item:hover {
-  color: #e6eaf4;
-  background: rgba(255, 255, 255, 0.06);
-}
-/* 按压反馈（R2-UI1 游戏钮语义）：冷蓝闪现+微缩——瞬态色变+形变双通道 */
-.app-nav-item:active {
-  color: #eaf1fa;
-  background: rgba(44, 95, 138, 0.35);
-  transform: scale(0.97);
-}
-/* active 态：金左缘条 + ink-hi 底 + inset 金 hairline（mockup .nav-item.active） */
-.app-nav-item-active {
-  color: #f3eddd;
-  background: var(--ink-hi);
-  box-shadow: inset 0 0 0 1px rgba(201, 168, 106, 0.28);
-}
-.app-nav-item-active::before {
-  content: '';
-  position: absolute;
-  left: -10px;
-  top: 9px;
-  bottom: 9px;
-  width: 3px;
-  border-radius: 2px;
-  background: linear-gradient(180deg, var(--gold-bright), var(--gold));
-  /* R2-UI1：金条 300% 纵向缓移——选中态常驻微光（reduced-motion 关） */
-  background-size: 100% 300%;
-  animation: syn-pan-y 2.8s ease-in-out infinite;
-}
-.app-nav-foot {
-  margin-top: auto;
-  padding: 10px 8px 2px;
-  border-top: 1px solid rgba(255, 255, 255, 0.07);
-  display: flex;
-  align-items: center;
-  gap: 8px;
-}
-.app-nav-ver {
-  font-size: 9.5px;
-  letter-spacing: 1px;
-  color: #8d95ad;
-  border: 1px solid rgba(141, 149, 173, 0.4);
-  border-radius: 4px;
-  padding: 1px 6px;
-}
-.app-nav-txt {
-  font-size: 9.5px;
-  color: #6d7590;
-}
-
-/* ══ 共享 Button 变体皮肤（R3-TH1；回炉 B1：静态+hover 全迁类）══
-   B1 教训：静态皮肤住内联 style 时，内联声明层叠上恒压任何类选择器，
-   :hover 挂类=永不生效——静态与 hover 必须同层（本节均为非 @layer 规则，
-   层叠上压过 tailwind utilities 层：unlayered > layered）。
-   CTA 语法：primary=墨青+inset 金 hairline(.45 静态→hover .7 提亮，定稿
-   注意事项①)+6px 切角；ghost hover=金铜。
-   R2-UI1 增量：primary 渐变底+hover 渐变流动（background-position 平移）；
-   全族 :active=游戏钮按压反馈（色变+微缩+下沉，瞬态 80~120ms）。 */
-.syn-btn-primary {
-  background: linear-gradient(150deg, #3a76ab 0%, var(--accent) 48%, #234a6d 100%);
-  background-size: 160% 160%;
-  background-position: 0% 50%;
-  color: #ffffff;
-  border-color: #234a6d;
-  box-shadow: inset 0 0 0 1px rgba(201, 168, 106, 0.45), var(--shadow-1);
-  clip-path: polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px);
-  transition:
-    background-position var(--dur-flow) ease,
-    box-shadow var(--dur-base) ease,
-    transform var(--dur-press) ease,
-    filter var(--dur-tint) ease;
-}
-.syn-btn-primary:not(:disabled):hover {
-  box-shadow: inset 0 0 0 1px rgba(227, 201, 143, 0.7), var(--shadow-2);
-  /* 渐变流动：hover 期渐变端点平移到亮端（R2-UI1） */
-  background-position: 100% 50%;
-}
-.syn-btn-primary:not(:disabled):active {
-  background-position: 100% 50%;
-  filter: brightness(0.88);
-  transform: translateY(1px) scale(0.98);
-  box-shadow:
-    inset 0 0 0 1px rgba(227, 201, 143, 0.7),
-    inset 0 2px 6px rgba(11, 26, 40, 0.45);
-}
-.syn-btn-secondary {
-  background: var(--panel);
-  color: var(--text);
-  border-color: var(--border);
-  transition:
-    background var(--dur-fast) ease,
-    border-color var(--dur-fast) ease,
-    transform var(--dur-press) ease;
-}
-.syn-btn-secondary:not(:disabled):active {
-  background: var(--accent-soft);
-  border-color: var(--accent);
-  color: var(--accent);
-  transform: translateY(1px) scale(0.98);
-}
-.syn-btn-danger {
-  background: var(--panel);
-  color: var(--danger);
-  border-color: var(--danger);
-  transition:
-    background var(--dur-fast) ease,
-    border-color var(--dur-fast) ease,
-    transform var(--dur-press) ease;
-}
-.syn-btn-danger:not(:disabled):active {
-  background: rgba(179, 64, 58, 0.12);
-  filter: brightness(0.96);
-  transform: translateY(1px) scale(0.98);
-}
-.syn-btn-ghost {
-  background: transparent;
-  color: var(--text);
-  border: none;
-  transition:
-    background var(--dur-fast) ease,
-    color var(--dur-fast) ease,
-    transform var(--dur-press) ease;
-}
-.syn-btn-ghost:not(:disabled):hover {
-  color: var(--gold);
-  background: var(--gold-soft);
-}
-.syn-btn-ghost:not(:disabled):active {
-  color: var(--gold);
-  background: rgba(207, 174, 114, 0.3);
-  transform: scale(0.96);
-}
-
-/* ══ R3 菱形分隔线（共享语法——回炉 W3 自 library.css 迁入：R3-U2 文献库
-   筛选区|列表与详情空态、R3-U4 设置分节复用同一语法；线段 min-width 24px+
-   flex:1 窄窗防碰撞——设计定稿注意事项③）══ */
-.lib-rule {
-  display: flex;
-  align-items: center;
-  gap: 10px;
-}
-.lib-rule-line {
-  flex: 1;
-  min-width: 24px;
-  height: 1px;
-}
-.lib-rule-line-l {
-  background: linear-gradient(90deg, transparent, var(--border-gold));
-}
-.lib-rule-line-r {
-  background: linear-gradient(90deg, var(--border-gold), transparent);
-}
-.lib-rule-gem {
-  flex: none;
-  width: 6px;
-  height: 6px;
-  background: var(--gold);
-  transform: rotate(45deg);
-}
-
-/* ══ R3-U3 阅读器周边皮肤（装饰浓度最低——PDF 区中性不变；玻璃浮层+纸面
-   tab+侧板节标。ReaderToolbar/TabBar/ReaderNotesPanel 消费；标注/AI/选区
-   层零触碰——F-07 层叠链红线）══ */
-.rdr-toolbar {
-  background: var(--panel-glass);
-  backdrop-filter: blur(10px);
-  border-bottom: 1px solid var(--border-gold);
-  box-shadow: var(--shadow-1);
-}
-/* active tab=纸面底+inset 金 hairline 底缘（box-shadow inset 零占位——h-8
-   布局不变，F-05 滚动收敛面不扰动；旧 accent-soft 满铺退役） */
-.rdr-tab-active {
-  background: var(--panel);
-  box-shadow: inset 0 -2px 0 0 var(--border-gold);
-}
-/* 阅读器数字（页码/缩放）tabular-nums 等宽数字（R2-SH2 决5：衬线消费清零，
-   回继承 UI 字体——同规则 font-variant-numeric 不动） */
-.rdr-num {
-  font-variant-numeric: tabular-nums;
-}
-/* 阅读器侧板节标：h4 金左缘条（R2-SH2 决5：衬线消费清零；夜色只属脉络域——侧板保持亮面） */
-.rdr-aside-h4 {
-  margin: 0;
-  font-size: 11.5px;
-  font-weight: 600;
-  letter-spacing: 0.5px;
-  color: var(--text);
-  border-left: 3px solid var(--gold);
-  padding-left: 8px;
-}
-
-/* ══ R3-U4 设置分节卡（作用域皮肤：> section 直达自持节——CorpusExportSection
-   等票面外文件零触碰的同视觉收敛；节间菱形分隔经 DiamondRule 组件复用
-   .lib-rule*）══ */
-.syn-settings > section {
-  background: var(--panel);
-  border: 1px solid var(--border);
-  border-radius: var(--radius-l);
-  box-shadow: var(--shadow-1);
-  padding: 14px 16px;
-}
-.syn-settings h2 {
-  margin: 0 0 2px;
-  font-size: 13px;
-  font-weight: 600;
-  letter-spacing: 0.5px;
-  color: var(--text);
-  border-left: 3px solid var(--gold);
-  padding-left: 8px;
-}
-/* 表单控件 focus：accent 描边+gold-soft 底（票面 P2） */
-.syn-input:focus {
-  outline: none;
-  border-color: var(--accent);
-  background: var(--gold-soft);
-}
-
-/* ══ 脉络·浅色严谨板（R2-LG11——白卡+细边框编码+浅色层带/工具条/图例；
-   夜幕 token 定义保留 :root 备暗色主题，脉络域样式消费清零——决5 同
-   精神；夜幕/星空/角饰/渐变样式块随 LineageNightDecor 删除而删）══ */
-.lineage-host {
-  position: relative;
-  overflow: hidden;
-  color: var(--text);
-  background: var(--bg);
-}
-/* 边型图例（四型——静态说明非交互件；浅色白卡圆角） */
-.lineage-legend {
-  position: absolute;
-  left: 96px;
-  bottom: 16px;
-  display: flex;
-  gap: 14px;
-  font-size: 10.5px;
-  color: var(--text-dim);
-  background: rgba(255, 255, 255, 0.88);
-  border: 1px solid var(--border);
-  border-radius: var(--radius-m);
-  padding: 4px 12px;
-  backdrop-filter: blur(8px);
-  align-items: center;
-  pointer-events: none;
-}
-.lineage-legend-item {
-  display: inline-flex;
-  align-items: center;
-}
-.lineage-legend-item i {
-  display: inline-block;
-  width: 18px;
-  height: 0;
-  vertical-align: middle;
-  margin-right: 5px;
-  border-top: 1.5px solid var(--accent);
-}
-.lineage-legend-item i.lg-normal {
-  border-top: 1px solid var(--node-branch);
-}
-.lineage-legend-item i.lg-theme {
-  border-top: 1px dashed var(--node-branch);
-}
-.lineage-legend-item i.lg-survey {
-  border-top: 1.4px dashed var(--survey-edge);
-}
-/* F-LG15 人工补父边图例（琥珀长虚线——与渲染 stroke-dasharray 7 5 同型） */
-.lineage-legend-item i.lg-manual {
-  border-top: 1.4px dashed var(--manual-edge);
-}
-/* 脉络工具条白玻璃浮层（R2-LG11：blur+border+shadow-2） */
-.lineage-toolbar {
-  display: flex;
-  align-items: center;
-  gap: 6px;
-  padding: 6px 10px;
-  border-radius: 12px;
-  background: rgba(255, 255, 255, 0.88);
-  backdrop-filter: blur(10px);
-  border: 1px solid var(--border);
-  box-shadow: var(--shadow-2);
-  font-size: 13px;
-}
-.lineage-toolbar > button {
-  background: transparent;
-  border: 0;
-  color: var(--text-dim);
-  padding: 4px 10px;
-  border-radius: 8px;
-  cursor: pointer;
-  font-size: 13px;
-}
-.lineage-toolbar > button:hover {
-  color: var(--text);
-  background: var(--accent-soft);
-}
-.lineage-toolbar > span {
-  background: transparent;
-  color: var(--text-dim);
-}
-/* R2-LG11 「适应视图」按钮（画布右下浮层——白玻璃同族；
-   auto-fit 显式复位唯一入口，见 LineageCanvas 头注状态机） */
-.lineage-fit-btn {
-  position: absolute;
-  right: 12px;
-  bottom: 12px;
-  z-index: var(--z-float);
-  padding: 4px 12px;
-  border-radius: 999px;
-  background: rgba(255, 255, 255, 0.88);
-  backdrop-filter: blur(10px);
-  border: 1px solid var(--border);
-  color: var(--text-dim);
-  font-size: 12px;
-  cursor: pointer;
-}
-.lineage-fit-btn:hover {
-  color: var(--text);
-  background: var(--accent-soft);
-}
-.lineage-toolbar > button:active,
-.lineage-fit-btn:active {
-  transform: scale(0.95);
-  background: var(--accent-soft);
-  color: var(--accent);
-}
-
-/* F-L1-C 边标签（变体 C 窄幅注释——2026-08-30 用户裁决案册定稿）：
-   foreignObject 内 HTML div 自然换行；9.5px 斜体灰阶 #6b7280 弱于节点
-   文字（图注层级）+白晕 text-shadow 四向 2px 截线（线从字后穿行被白晕
-   截断）；max-height 3 行×9.5×1.3=37.05+overflow hidden（真实溢出内容
-   承载滚动语义——非 line-clamp 省略）。悬停滚动交互态驻本类（B1 教训
-   禁内联）；FO 层 pointer-events none（内联静态属性），div auto 由本类
-   承载。 */
-.lineage-edge-label {
-  box-sizing: border-box;
-  width: 100%;
-  height: 100%;
-  padding: 2px;
-  font-size: 9.5px;
-  line-height: 1.3;
-  font-style: italic;
-  color: #6b7280;
-  text-align: center;
-  overflow-wrap: break-word;
-  max-height: 37.05px;
-  overflow: hidden;
-  text-shadow: 2px 0 #ffffff, -2px 0 #ffffff, 0 2px #ffffff, 0 -2px #ffffff;
-  pointer-events: auto;
-}
-/* 悬停滚动（用户保证②）：截断文字悬停可滚（scrollHeight 全文高度——
-   LineageEdges wheel 委托同步阻断画布 zoom） */
-.lineage-edge-label:hover {
-  overflow-y: auto;
-}
+/* [F-CSS-01] 分域拆件 2026-09-05：皮肤段按 ══ 分节拆出 theme-shell/-buttons/
+   -reader/-lineage 四件（main.tsx 按原相对顺序 import——源顺序=层叠语义）;
+   本件留守 token :root 全量+全局基座（html/body/#root）+共享动画 keyframes
+   词汇（keyframes 全局按名注册,定义位置无层叠面）——token 必先于一切消费方。 */
 
 /* ══ R2-UI1 共享动画词汇（渐变流动 keyframes——消费方见各规则行内注）══
    syn-pan-x/y：background-position 往返平移（配 background-size>100% 的
@@ -634,12 +114,3 @@ body,
     background-position: 50% 100%;
   }
 }
-
-/* ══ R2-UI1 无障碍守卫：系统「减少动态效果」时常驻渐变动画全关
-   （交互瞬态 transition 保留——按压反馈属操作确认非装饰动效）══ */
-@media (prefers-reduced-motion: reduce) {
-  .app-nav::after,
-  .app-nav-item-active::before {
-    animation: none;
-  }
-}
diff --git a/src/renderer/shared/ui/Button.tsx b/src/renderer/shared/ui/Button.tsx
index 902b666405..68d7f0190f 100644
--- a/src/renderer/shared/ui/Button.tsx
+++ b/src/renderer/shared/ui/Button.tsx
@@ -17,7 +17,7 @@ import type { ReactNode } from 'react'
 
 type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
 
-/** 变体皮肤=theme.css 的 .syn-btn-<variant> 类（回炉 B1：静态与 hover 必须
+/** 变体皮肤=theme-buttons.css 的 .syn-btn-<variant> 类（回炉 B1：静态与 hover 必须
  *  同层——内联 style 层叠上恒压类选择器，静态在内联+hover 挂类=hover 静默
  *  失效。防线=tests/unit/renderer/theme.test.ts B1 describe） */
 
diff --git a/src/renderer/shared/ui/DiamondRule.tsx b/src/renderer/shared/ui/DiamondRule.tsx
index a583103395..e62b64412a 100644
--- a/src/renderer/shared/ui/DiamondRule.tsx
+++ b/src/renderer/shared/ui/DiamondRule.tsx
@@ -9,8 +9,8 @@
  * - export function DiamondRule(): JSX.Element
  *
  * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
- * - 样式全在 theme.css .lib-rule*（token 单源）；R3-LIB（筛选区|列表）与
- *   R3-U4（设置分节）复用同一语法
+ * - 样式全在 theme-buttons.css .lib-rule*（token 单源——F-CSS-01 自 theme.css
+ *   拆出）；R3-LIB（筛选区|列表）与 R3-U4（设置分节）复用同一语法
  */
 export function DiamondRule(): JSX.Element {
   return (
diff --git a/tests/unit/renderer/library-cards.test.tsx b/tests/unit/renderer/library-cards.test.tsx
index 8cc12af953..5750c45969 100644
--- a/tests/unit/renderer/library-cards.test.tsx
+++ b/tests/unit/renderer/library-cards.test.tsx
@@ -51,9 +51,10 @@ import { DiamondRule } from '../../../src/renderer/shared/ui/DiamondRule'
 // jsdom 环境 import.meta.url 是 http: 协议——CSS 文本读取走 cwd 相对路径
 // （theme.test.ts 的 URL 法仅 node 环境可用）。lib-* 规则住 feature 本地
 // library.css（theme.css 500 行上限拆分，由 LibraryPage 挂载导入）；
-// .lib-rule* 三段住 theme.css（回炉 W3：R3-U4 复用依赖的共享语法位）
+// .lib-rule* 三段住 theme-buttons.css（回炉 W3 迁入共享语法位；F-CSS-01
+// 自 theme.css 二次拆件再锚）
 const css = readFileSync(join(process.cwd(), 'src/renderer/features/library/library.css'), 'utf8')
-const cssTheme = readFileSync(join(process.cwd(), 'src/renderer/shared/theme.css'), 'utf8')
+const cssTheme = readFileSync(join(process.cwd(), 'src/renderer/shared/theme-buttons.css'), 'utf8')
 
 /** 列表卡夹具：默认带年份/期刊/两标签（venue 空与 year 空由用例覆写） */
 function makeSummary(id: string, patch: Partial<PaperSummary> = {}): PaperSummary {
@@ -223,7 +224,8 @@ describe('R3-LIB library.css 材质文本锁（卡片/网格/分隔——mockup
   })
 
   it('菱形分隔窄窗防碰撞：line min-width 24px+flex:1；gem rotate(45deg)（注意事项③）', () => {
-    // 回炉 W3：.lib-rule* 迁 theme.css（共享语法位——R3-U4 复用依赖）
+    // 回炉 W3：.lib-rule* 迁共享语法位（R3-U4 复用依赖;F-CSS-01 起住
+    // theme-buttons.css）
     expect(cssTheme).toMatch(/\.lib-rule-line\s*\{[^}]*min-width: 24px/)
     expect(cssTheme).toMatch(/\.lib-rule-line\s*\{[^}]*flex: 1/)
     expect(cssTheme).toMatch(/\.lib-rule-gem\s*\{[^}]*rotate\(45deg\)/)
@@ -299,7 +301,7 @@ describe('R3-LIB 回炉一（门一 3B+3W）', () => {
     expect(css).toMatch(/\.lib-card-meta\s*\{[^}]*font-size: 10\.5px/)
   })
 
-  it('W3 共享位：theme.css 含 .lib-rule 三段（line-l/line-r/gem 渐隐线语法）', () => {
+  it('W3 共享位：theme-buttons.css 含 .lib-rule 三段（line-l/line-r/gem 渐隐线语法）', () => {
     expect(cssTheme).toMatch(/\.lib-rule-line-l\s*\{[^}]*linear-gradient\(90deg, transparent, var\(--border-gold\)\)/)
     expect(cssTheme).toMatch(/\.lib-rule-line-r\s*\{[^}]*linear-gradient\(90deg, var\(--border-gold\), transparent\)/)
     expect(cssTheme).toMatch(/\.lib-rule-gem\s*\{[^}]*background: var\(--gold\)/)
diff --git a/tests/unit/renderer/lineage-canvas.test.tsx b/tests/unit/renderer/lineage-canvas.test.tsx
index f44ac967d7..ea8932f599 100644
--- a/tests/unit/renderer/lineage-canvas.test.tsx
+++ b/tests/unit/renderer/lineage-canvas.test.tsx
@@ -511,8 +511,9 @@ describe('F-L1-C 边标签（变体 C 换行+防重叠放置+悬停滚动）', (
     expect(labels?.[1]?.scrollTop).toBe(0)
   })
 
-  it('⑩CSS 文本锁：theme.css 含 .lineage-edge-label 声明形态（break-word/max-height/overflow hidden）+:hover 段 overflow-y auto', () => {
-    const css = readFileSync(join(process.cwd(), 'src/renderer/shared/theme.css'), 'utf8')
+  it('⑩CSS 文本锁：theme-lineage.css 含 .lineage-edge-label 声明形态（break-word/max-height/overflow hidden）+:hover 段 overflow-y auto', () => {
+    // [F-CSS-01] 拆件再锚：边标签皮肤随脉络域迁 theme-lineage.css
+    const css = readFileSync(join(process.cwd(), 'src/renderer/shared/theme-lineage.css'), 'utf8')
     // 正则锚定声明形态（[^}]* 不跨段——防注释字样救活，SET1 变异③先例）
     expect(css).toMatch(/\.lineage-edge-label\s*\{[^}]*overflow-wrap:\s*break-word[^}]*\}/)
     expect(css).toMatch(/\.lineage-edge-label\s*\{[^}]*max-height[^}]*\}/)
diff --git a/tests/unit/renderer/r3-rdr-set-visual.test.tsx b/tests/unit/renderer/r3-rdr-set-visual.test.tsx
index 79b277884a..9215faf57d 100644
--- a/tests/unit/renderer/r3-rdr-set-visual.test.tsx
+++ b/tests/unit/renderer/r3-rdr-set-visual.test.tsx
@@ -1,6 +1,6 @@
 // @vitest-environment jsdom
 /**
- * [R3-RDR+R3-SET] 阅读器周边+设置页视觉重制 —— 渲染级断言+theme.css 材质
+ * [R3-RDR+R3-SET] 阅读器周边+设置页视觉重制 —— 渲染级断言+theme-reader.css 材质
  * 文本锁（library-cards.test 同口径：CSS 字面断言防漂移）。always-active 裸
  * describe（K3——不经 guardedDescribe 守卫）。
  *
@@ -48,7 +48,8 @@ import { useNotesStore } from '../../../src/renderer/features/notes/notes.store'
 ;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
 
 // jsdom 环境 CSS 文本读取走 cwd 相对路径（theme.test 的 URL 法仅 node 环境可用）
-const cssTheme = readFileSync(join(process.cwd(), 'src/renderer/shared/theme.css'), 'utf8')
+// [F-CSS-01] 拆件再锚：阅读器周边+设置卡皮肤段自 theme.css 迁 theme-reader.css
+const cssTheme = readFileSync(join(process.cwd(), 'src/renderer/shared/theme-reader.css'), 'utf8')
 
 let root: Root | null = null
 let host: HTMLDivElement | null = null
@@ -89,7 +90,7 @@ function makeTab(id: string): TabState {
 }
 
 describe('R3-U3 ReaderToolbar —— 玻璃浮层皮肤（装饰浓度最低：仅皮肤零布局变）', () => {
-  it('工具条根挂 rdr-toolbar 玻璃浮层类；theme.css 值面=--panel-glass+blur10+金 hairline 底缘', () => {
+  it('工具条根挂 rdr-toolbar 玻璃浮层类；theme-reader.css 值面=--panel-glass+blur10+金 hairline 底缘', () => {
     mount(
       <ReaderToolbar
         page={0}
@@ -117,7 +118,7 @@ describe('R3-U3 TabBar —— 纸面 tab+active 金 hairline 底缘', () => {
     useNotesStore.setState({ noteByPaper: {} })
   })
 
-  it('active tab 挂 rdr-tab-active 类（非 active 不挂）；theme.css 值面=纸面底+inset 金底缘', () => {
+  it('active tab 挂 rdr-tab-active 类（非 active 不挂）；theme-reader.css 值面=纸面底+inset 金底缘', () => {
     useReaderStore.setState({
       tabs: { 'p-1': makeTab('p-1'), 'p-2': makeTab('p-2') },
       order: ['p-1', 'p-2'],
diff --git a/tests/unit/renderer/theme.test.ts b/tests/unit/renderer/theme.test.ts
index 27d2e41496..616d3e9bb1 100644
--- a/tests/unit/renderer/theme.test.ts
+++ b/tests/unit/renderer/theme.test.ts
@@ -27,6 +27,26 @@ const libCss = readFileSync(
   fileURLToPath(new URL('../../../src/renderer/features/library/library.css', import.meta.url)),
   'utf8'
 )
+/** [F-CSS-01] theme.css 分域拆件（2026-09-05）——四皮肤域文件读取面（libCss
+ *  同构）：shell=App 壳（顶栏/缩放/三键/nav+reduced-motion 守卫随域驻其末）、
+ *  buttons=syn-btn 族+菱形分隔、reader=阅读器周边+设置卡、lineage=脉络
+ *  浅色严谨板。token :root/全局基座/keyframes 留守 theme.css（见上 css 面）。 */
+const shellCss = readFileSync(
+  fileURLToPath(new URL('../../../src/renderer/shared/theme-shell.css', import.meta.url)),
+  'utf8'
+)
+const buttonsCss = readFileSync(
+  fileURLToPath(new URL('../../../src/renderer/shared/theme-buttons.css', import.meta.url)),
+  'utf8'
+)
+const readerCss = readFileSync(
+  fileURLToPath(new URL('../../../src/renderer/shared/theme-reader.css', import.meta.url)),
+  'utf8'
+)
+const lineageCss = readFileSync(
+  fileURLToPath(new URL('../../../src/renderer/shared/theme-lineage.css', import.meta.url)),
+  'utf8'
+)
 
 /** [token 声明, 期望值]——css 内应含 "<token>: <value>;"（含尾分号防 --gold 匹配到 --gold-soft 系前缀） */
 const TOKENS: Array<[string, string]> = [
@@ -104,24 +124,25 @@ describe('R3-TH1 回炉 B1——Button 皮肤类防线（内联恒压类选择
   /**
    * 联审 B1：静态皮肤住内联 style 时，内联声明在层叠上恒压任何类选择器
    * （无论特异性），挂 :hover 类=永不生效（primary 提亮 .45→.7 与 ghost
-   * 金铜 hover 曾静默失效）。修复形态=静态+hover 全迁 theme.css 类。
+   * 金铜 hover 曾静默失效）。修复形态=静态+hover 全迁皮肤类文件（F-CSS-01 起
+   * syn-btn 族住 theme-buttons.css）。
    * 本组断言锁两层：皮肤类规则存在（值面）+Button.tsx 不再用内联变体
    * 皮肤（形态面——防回退到内联）。
    */
   it('primary 静态皮肤在类规则中（CTA：inset 金 hairline .45 + 6px 切角）', () => {
-    expect(css, '.syn-btn-primary 静态类应在场').toMatch(/\.syn-btn-primary\s*\{/)
-    expect(css, 'inset 金 hairline .45（mockup CTA 静态值）').toMatch(
+    expect(buttonsCss, '.syn-btn-primary 静态类应在场（theme-buttons.css）').toMatch(/\.syn-btn-primary\s*\{/)
+    expect(buttonsCss, 'inset 金 hairline .45（mockup CTA 静态值）').toMatch(
       /\.syn-btn-primary\s*\{[^}]*rgba\(201, 168, 106, 0\.45\)/
     )
-    expect(css, '6px 切角 clip-path（定稿注意事项①）').toMatch(/\.syn-btn-primary\s*\{[^}]*clip-path/)
+    expect(buttonsCss, '6px 切角 clip-path（定稿注意事项①）').toMatch(/\.syn-btn-primary\s*\{[^}]*clip-path/)
   })
 
   it('primary hover 提亮 .45→.7 在类规则中', () => {
-    expect(css).toMatch(/\.syn-btn-primary:not\(:disabled\):hover\s*\{[^}]*rgba\(227, 201, 143, 0\.7\)/)
+    expect(buttonsCss).toMatch(/\.syn-btn-primary:not\(:disabled\):hover\s*\{[^}]*rgba\(227, 201, 143, 0\.7\)/)
   })
 
   it('ghost hover 金铜在类规则中', () => {
-    expect(css).toMatch(/\.syn-btn-ghost:not\(:disabled\):hover\s*\{[^}]*var\(--gold\)/)
+    expect(buttonsCss).toMatch(/\.syn-btn-ghost:not\(:disabled\):hover\s*\{[^}]*var\(--gold\)/)
   })
 
   it('Button.tsx 不再以变体皮肤内联压类（B1 形态锁）', () => {
@@ -143,17 +164,17 @@ describe('R2-SET1 界面缩放——CSS 文本锁（内容行缩放+PDF 页列
    * 恢复 612×792+textLayer 对位不破坏；单独 zoom:1 无效——相乘语义）。
    */
   it('.app-content-row 缩放声明在场（--ui-scale 变量单源）', () => {
-    expect(css, '.app-content-row 类应在场（App 内容行）').toContain('.app-content-row')
+    expect(shellCss, '.app-content-row 类应在场（App 内容行——theme-shell.css）').toContain('.app-content-row')
     expect(
-      css,
+      shellCss,
       'zoom 值必须经 --ui-scale 变量（非内联）——正则锚定声明形态防注释字样救活'
     ).toMatch(/\.app-content-row\s*\{[^}]*zoom:\s*var\(--ui-scale,\s*1\);/)
   })
 
   it('[data-page-column] 恒补偿声明在场（PDF 页列恒视觉 1.0）', () => {
-    expect(css, '页列属性选择器三态通配应在场').toContain('[data-page-column]')
+    expect(shellCss, '页列属性选择器三态通配应在场').toContain('[data-page-column]')
     expect(
-      css,
+      shellCss,
       '补偿必须 calc(1 / var(--ui-scale, 1))——探针 Q2/Q4 实测形态，锚定声明'
     ).toMatch(/\[data-page-column\]\s*\{[^}]*zoom:\s*calc\(1 \/ var\(--ui-scale,\s*1\)\);/)
   })
@@ -179,6 +200,11 @@ describe('R2-SH2 决5——衬线消费清零+gold-night 别名退役（源码
     expect(libCss, 'library.css 衬线消费应清零（决5 lib 年份/标题明文）').not.toContain(
       'var(--font-display)'
     )
+    // F-CSS-01：拆件后衬线消费负锚扩至四皮肤域文件（消费面随皮肤段走防回填）
+    expect(shellCss, 'theme-shell.css 衬线消费应清零').not.toContain('var(--font-display)')
+    expect(buttonsCss, 'theme-buttons.css 衬线消费应清零').not.toContain('var(--font-display)')
+    expect(readerCss, 'theme-reader.css 衬线消费应清零').not.toContain('var(--font-display)')
+    expect(lineageCss, 'theme-lineage.css 衬线消费应清零').not.toContain('var(--font-display)')
   })
 })
 
@@ -226,32 +252,64 @@ describe('P7D-01 批一 token 收敛防线（三轴形态锁）', () => {
     ['0.08s', css, 1],
     ['0.08s', wsCss, 0],
     ['0.08s', libCss, 0],
+    ['0.08s', shellCss, 0],
+    ['0.08s', buttonsCss, 0],
+    ['0.08s', readerCss, 0],
+    ['0.08s', lineageCss, 0],
     ['0.12s', css, 1],
     ['0.12s', wsCss, 0],
     ['0.12s', libCss, 0],
+    ['0.12s', shellCss, 0],
+    ['0.12s', buttonsCss, 0],
+    ['0.12s', readerCss, 0],
+    ['0.12s', lineageCss, 0],
     ['0.14s', css, 1],
     ['0.14s', wsCss, 0],
     ['0.14s', libCss, 0],
+    ['0.14s', shellCss, 0],
+    ['0.14s', buttonsCss, 0],
+    ['0.14s', readerCss, 0],
+    ['0.14s', lineageCss, 0],
     ['0.18s', css, 1],
     ['0.18s', wsCss, 0],
     ['0.18s', libCss, 0],
+    ['0.18s', shellCss, 0],
+    ['0.18s', buttonsCss, 0],
+    ['0.18s', readerCss, 0],
+    ['0.18s', lineageCss, 0],
     ['0.2s', css, 1],
     ['0.2s', wsCss, 0],
     ['0.2s', libCss, 0],
+    ['0.2s', shellCss, 0],
+    ['0.2s', buttonsCss, 0],
+    ['0.2s', readerCss, 0],
+    ['0.2s', lineageCss, 0],
     ['0.22s', css, 1],
     ['0.22s', wsCss, 0],
     ['0.22s', libCss, 0],
+    ['0.22s', shellCss, 0],
+    ['0.22s', buttonsCss, 0],
+    ['0.22s', readerCss, 0],
+    ['0.22s', lineageCss, 0],
     ['0.3s', css, 1],
     ['0.3s', wsCss, 0],
-    ['0.3s', libCss, 0]
+    ['0.3s', libCss, 0],
+    ['0.3s', shellCss, 0],
+    ['0.3s', buttonsCss, 0],
+    ['0.3s', readerCss, 0],
+    ['0.3s', lineageCss, 0]
   ]
 
   it.each(DURATION_COUNTS)('duration 字面量 %s 消费后仅存 token 定义处（出现 %s 次）', (literal, text, expected) => {
     expect(countLiteral(text, literal)).toBe(expected)
   })
 
-  it('theme.css 禁 z-index 裸值四档（弹层 z 序收敛到 --z-* token）', () => {
+  it('主题 CSS 禁 z-index 裸值四档（弹层 z 序收敛到 --z-* token——F-CSS-01 扩四皮肤件）', () => {
     expect(css).not.toMatch(/z-index:\s*(10|20|40|50)\b/)
+    expect(shellCss).not.toMatch(/z-index:\s*(10|20|40|50)\b/)
+    expect(buttonsCss).not.toMatch(/z-index:\s*(10|20|40|50)\b/)
+    expect(readerCss).not.toMatch(/z-index:\s*(10|20|40|50)\b/)
+    expect(lineageCss).not.toMatch(/z-index:\s*(10|20|40|50)\b/)
   })
 
   it('弹层九 tsx 禁 z-(10|20|40|50) 裸值 class（v4 变量简写形态锁）', () => {
@@ -262,15 +320,20 @@ describe('P7D-01 批一 token 收敛防线（三轴形态锁）', () => {
     expect(POPUP_TSX).not.toMatch(/\bz-\[\d+\]/)
   })
 
-  it('三 CSS 禁 transition/animation 声明内 ms 时长（回炉 W3：ms 形态等价绕过全禁）', () => {
-    // 只锁声明面（增量面）：现状 \dms 实测仅 2 处注释字样（theme.css:319
-    // 「瞬态 80~120ms」/workspace.css:52「入场 160ms」），声明值全 s 形态——
-    // 注释行不含声明关键词不误咬；0.30s 等价变体主控裁定不锁（值等价不破坏
-    // 零视觉差，锁面过宽脆断言反噬——记档已知边界）
+  it('七 CSS 禁 transition/animation 声明内 ms 时长（回炉 W3 全禁+F-CSS-01 扩四皮肤件）', () => {
+    // 只锁声明面（增量面）：现状 \dms 实测仅 2 处注释字样（theme-buttons.css
+    // 「瞬态 80~120ms」——F-CSS-01 拆件自原 theme.css:319 随迁/workspace.css:52
+    // 「入场 160ms」），声明值全 s 形态——注释行不含声明关键词不误咬；0.30s
+    // 等价变体主控裁定不锁（值等价不破坏零视觉差，锁面过宽脆断言反噬——记档
+    // 已知边界）
     const MS_DECL = /\b(transition|animation)[^;{}]*[0-9]ms/
     expect(css).not.toMatch(MS_DECL)
     expect(wsCss).not.toMatch(MS_DECL)
     expect(libCss).not.toMatch(MS_DECL)
+    expect(shellCss).not.toMatch(MS_DECL)
+    expect(buttonsCss).not.toMatch(MS_DECL)
+    expect(readerCss).not.toMatch(MS_DECL)
+    expect(lineageCss).not.toMatch(MS_DECL)
   })
 
   it('lineage 六件禁数值间距属性（inline 间距清扫到 tailwind class）', () => {
diff --git a/tests/unit/windows/window-control.test.ts b/tests/unit/windows/window-control.test.ts
index ca43738f10..5edd61f228 100644
--- a/tests/unit/windows/window-control.test.ts
+++ b/tests/unit/windows/window-control.test.ts
@@ -176,8 +176,9 @@ describe('windows/window-control —— frameless 窗口形状', () => {
 })
 
 describe('windows/window-control —— drag/no-drag 皮肤锁（CSS 文本断言，theme.test.ts 同型）', () => {
+  // [F-CSS-01] 拆件再锚：drag/no-drag 声明随 App 壳皮肤段迁 theme-shell.css
   const css = readFileSync(
-    fileURLToPath(new URL('../../../src/renderer/shared/theme.css', import.meta.url)),
+    fileURLToPath(new URL('../../../src/renderer/shared/theme-shell.css', import.meta.url)),
     'utf8'
   )
 
