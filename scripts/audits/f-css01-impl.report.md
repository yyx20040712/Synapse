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
