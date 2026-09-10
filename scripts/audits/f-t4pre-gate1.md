# F-LINT-04-T4PRE 门一审查报告（GLM 同源降级审——≤3 文件非受锁小批，methodology §4.5）

- 审查时点：2026-09-10，HEAD=485549e641（F-LINT-04-T2 收口提交），工作树=本票未提交面
- 审查方式：只读审计（diff/raw 亲 cat/探针源码通读/独立 grep 复算），未改任何文件、未跑 git 写、未跑 locks 命令
- 结论：**放行（PASS）——0 B / 0 W / 4 N**

## 审项 1：diff 范围核对 —— PASS

`git diff` 实测四文件，按性质二分：

| 文件 | 变更 | 性质判定 |
| --- | --- | --- |
| src/renderer/shared/theme.css | +3（2 行注释+1 行 `--warning: #ffa500;`） | 实现面（票内） |
| src/renderer/features/reader/TabBar.tsx | 1 行改（:139 fallback 移除） | 实现面（票内） |
| tickets/registry.ts | +1（F-LINT-04-T4PRE 立案行，status: 'open'） | 流程配套（立案义务） |
| locks/manifest.json | generatedAt 刷新+探针 f-t4pre-rdw.mjs 条目 +4 | 流程配套（宪法「自产 scripts 工具件即时 locks:generate+apply」——合规义务，非蔓延） |

- 实现面恰两文件、行级=1 值+1 改+2 注释——票面「恰两文件 3 行级零蔓延」口径成立。
- manifest 无其他条目漂移（逐行核 diff：仅 generatedAt+探针 4 行）；registry 无其他行变动。
- 未跟踪新件 4（探针 .mjs + 3 个 raw）——按留档三桶口径①证据件应随收口提交显式列入库（收口义务，本审时点不计）。

## 审项 2：票面符合度 —— PASS

- **token 落位**：theme.css :root 内 `--danger`(35)/`--ok`(36)/`--warning`(39) 相邻——「状态色族（--danger/--ok 侧）」落位成立（sed 20-60 亲验）。
- **fallback 移除**：TabBar.tsx:139 `var(--warning, orange)` → `var(--warning)`；改后全仓代码面 orange 关键字清零（grep 命中仅 theme.css:38 注释叙述文字，合法残留）。
- **注释准确**：注释叙述（悬空事实/等值依据/票号/T4 语义）与实测证据全部相符；格式与文件既有 `/* [票号] 描述 */` 风格一致。
- **行号**：改前/改后 TabBar.tsx:139 均=style 行（diff hunk 与 sed 双验）。

## 审项 3：验收证据链（三件 raw 亲 cat）—— PASS

- **f-t4pre-rdw-before.raw.txt**：`R=94 D=109 W=2`，`R−D−W=--warning ← TabBar.tsx`，尾行 `exit=1`——悬空证明成立。
- **f-t4pre-rdw-after.raw.txt**：`R=94 D=110 W=2`，`R−D−W=∅`，尾行 `exit=0`——数字自洽性亲核：D 恰 +1（=新定义）；R 前后不变（改前 `var(--warning, orange)` 与改后 `var(--warning)` 同名匹配 `--warning`）——对账闭环。
- **f-t4pre-verify.raw.txt**（4125 行）：第 5 行链头=`quality:check && tickets:check && locks:check && lint && typecheck && test && build`（verify 全链与 CI 同口径）；quality 通过（含「无同值双常量新增」——即 C-4 ② 守卫在改后状态实跑通过）；locks 319 个受锁文件一致（318+新探针，跨票自洽）；Test Files 162 / Tests 1579 全绿（与 v58 基线一致）；build 完成；尾行 `exit=0`。

## 审项 4：⑤f 豁免论证复核 —— PASS（附 N1）

- **计算值恒等成立**：CSS 规范 named color `orange` = `#ffa500` = `rgb(255,165,0)`（CSS Color Module 采纳的 X11 值，ff=255/a5=165/00=0）。改前 `--warning` 全仓零定义（before 差集即机器悬空证明）→ `var(--warning, orange)` 事实渲染色=orange；改后=`#ffa500`——计算值恒等，零视觉差成立。
- **主题分支核验**：theme.css 无 `.dark`/`[data-theme]` 覆写段，`--warning` 全仓定义恰 1 处（:root:39）——单主题无分支差，恒等论证无暗面例外。
- **引用点唯一性**：`grep -rn "var(--warning" src/` 命中 2 行——TabBar.tsx:139（代码引用，恰 1 处）+ theme.css:37（注释文字复述旧形态，非代码引用）。代码口径成立。
- **非布局值**：`style={{ color: ... }}`=前景色属性，非布局值——dirty dot 仅一个 8px 级圆点 `●` 的着色。

## 审项 5：接缝 —— PASS（附 N2）

- **theme.test.ts 防漂移锁不加的决策**：亲读 tests/unit/renderer/theme.test.ts——锁表为**采样锁方向**（表内每项断言 css 含 `token: value;`，表外 token 无断言）→ `--warning` 不入表不红（verify 1579 绿实证兼容）。**额外支持论据**（票面未列）：该锁表头注自declare值源纪律=设计定稿稿（shell-library/lineage-constellation.html）——`--warning` 的出处是「事实渲染色转正」而非设计稿，不入锁与测试自身纪律自洽，强行入锁反而破坏其值源纪律。
- **窗口风险评估（T4 未上线期间 --warning 值漂移无锁）**：评级**低**。缓解面：①单引用点+小视觉面（dirty dot 圆点前景色）+非布局值；②theme.css 定义行上方注释声明转正理由与等值依据（改值者先撞见）；③C-4 ② 同值守卫已把关同值冲突面（verify quality 段实证在跑）；④T4 为同战役紧邻票（v58 §2-2 候选）窗口短；⑤探针已具 exit 门槛断言能力（before/after 的 1/0 语义实证），T4 C-4c 迁驻 check-quality 后 R−D 锚反向护体。残余风险=纯视觉漂移且属视觉决策领域（闲时零承担原则下会挂起人工），无正确性危害。
- **C-4 ② 同值守卫面**：`grep -rni ffa500 src/ scripts/ tests/` 全域仅 theme.css:39 一处——零同值冲突，亲验成立。

## 审项 6：探针质量（f-t4pre-rdw.mjs 通读）—— PASS（附 N3）

- **注释剥离**：`/* */` 整段 + `//` 行首双剥离，覆盖 CSS/TS/TSX 三面；replace 不并线（换行保留），无漏检伪影。反证：新增注释自身含 `var(--warning,` 字样，after R=94 未被注释伪引用抬升——剥离实际生效。
- **W 集与 exit 语义**：W=2 条动态注入 token（--ui-scale/--scale-factor），头注声明 T4 落地时迁驻单源；exit=差集空 0/非空 1，可作门槛断言（raw 实证）。
- **R 集含 CSS 面消费**：walk 收 .css/.ts/.tsx——theme.css 自身 @theme 段（第 7 行起）的 var() 重绑消费入 R——符合设计书 2.4「含 theme.css 自身 @theme 重绑消费」口径。
- **D 集窄口径（仅 theme.css）对 ∅ 结论的影响**：src 下另有 7 个分域 CSS（theme-shell/buttons/reader/lineage、library、text-layer、workspace）的定义不入 D。该偏差方向=**假红不假绿**（他域定义的引用会进差集报红）；且窄 D 下 ∅ ⇒ 任何宽 D 下必 ∅（D 扩大差集只减不增）——**∅ 结论有效性成立且更强**。
- **假绿通道唯一候选=动态拼名 `var(--${x})`**：亲 grep 全仓零命中，现状空集，盲区不触发。

## 注记清单（N——均不阻断）

- **N1**：theme.css:37 注释文字含 `var(--warning,` 字样——票面验收话术「grep 恰 1 处」以**代码口径**成立（字面 grep 命中 2 行，1 行为注释复述旧形态）；R−D 探针因注释剥离不受扰。无需处置。
- **N2**：T4 上线前 `--warning` 值漂移无测试锁（票面已注记）——窗口风险低（评估见审项 5），T4 收口即闭合；若 T4 延期数周以上可考虑把探针 exit 语义临时挂入 verify 前置（主控裁量，非本票义务）。
- **N3**：探针 `VAR_DEF`（`^\s*(--[\w-]+)\s*:`）不剥注释——注释行若以 `--xxx:` 形态起头会误入 D 集（理论假绿口子）。现状 theme.css 注释无此形态（新注释续行以 `orange)` 起）；T4 迁驻 check-quality 单源时建议顺手对 D 集同样过剥离（加固建议，不阻断本票）。
- **N4**：locks/manifest.json 工作副本 CRLF（git 提示 next touch 归一 LF）——.gitattributes LF 纪律下历次 manifest 均此形态（locks:generate 产物特性），提交时自动归一，非本票引入，无处置项。

## 总评

**放行**。0 B / 0 W / 4 N。实现面恰两文件 3 行级零蔓延（registry+locks 为流程义务配套）；token 落位（状态色族侧）/fallback 移除/注释准确全符票面；验收证据链三件亲验且数字自洽（R=94 不变、D 109→110 恰 +1、exit 1→0、verify 全链 162 文件/1579 用例 exit=0）；⑤f 豁免论证成立（orange=#ffa500 规范恒等+单主题无覆写分支+代码引用恰 1 处+非布局值）；C-4 ② 同值守卫面亲 grep 零同值冲突且 verify quality 段实跑通过；探针 R/D 口径偏差方向为假红不假绿，窄 D 下 ∅ 反而强化结论，动态拼名盲区现状空集。收口义务提醒（主控）：raw 三件+探针随收口提交显式列入库、registry 翻 done、提交尾注（非受锁小批无需 [locked-change]，manifest/registry 非受锁——locks:check 319 已自证同步）。
