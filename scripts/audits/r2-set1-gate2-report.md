# R2-SET1 门二终审报告（2026-08-29）

审计人：门二终审孙代理（三屋 ADR-0017）。只读终审，唯一产物=本档。
配置：GLM-5.3（主控派发口径，门二无法自验模型配置——待主控确认）；禁
npm/test/构建/git 写/tickets——全部结论基于终态实物 diff+证据档逐档比对+静态推演。

## 0. 开工技能清点（宪法会话开工纪律）

| 技能 | 用/不用 | 理由 |
| --- | --- | --- |
| code-review-excellence | **用** | 门二本职=终审对抗审查 |
| verification-before-completion | **用** | 本档每条结论均有 file:line/档证支撑 |
| test-driven-development | 不用 | 禁跑测试只审证据链（红/绿/变异档比对代替） |
| systematic-debugging | 不用 | 无待定位缺陷；W1 修复语义用状态时序静态推演覆盖 |
| git/computer-use/browser 类 | 不用 | 只读令（git diff/status 仅取证读取） |

## 1. 输入实读清单（全部实读，无凭转述）

票面五层、开工实证（open.md+out-probe.json）、实现报告、门一审档、终态
`git status --porcelain`+`git diff`（13 文件全量+SettingsPage/invariants 专项）、
8 份 raw 证据尾部+红行+Tests 行、forensics.json 全量、lock-protected.ps1 全量、
locks/manifest.json grep、tickets/registry.ts grep（只读）、
docs/methodology.md §4.3、e2e smoke.spec diff、app-shell/theme.test diff。

## ①处置核对（门一 0B/4W/20+N + 主控处置记录 vs 终态实物——防「说了没改」）

- **W1（表单草稿抹除窗）→已主控直修，实修验证通过**：
  - 实物：SettingsPage.tsx 终态 diff 含 `useRef` 入 import、`hydratedRef`
    声明+守卫 `if (!hydratedRef.current && settings !== null)` →置
    `hydratedRef.current = true`+回填，注释如实标「门一 W1」。
  - 语义推演（抹除窗确实关闭）：挂载首帧 settings=null→守卫假不水合；load
    应答→settings 非 null→effect（依赖 `[settings]`）首跑水合+置 ref；此后
    pickScale→save→store.settings 整体替换→effect 重跑但 ref 已真→**不回填**
    ——「改邮箱未保存→点缩放档→回填刷掉草稿」序列断路 ✓。
  - 新问题扫描（修复不引入回归）：runSave 成功后不回填——runSave 发送的
    即表单当前值（email/theme 表单+uiScale 真值），表单=已存值无感 ✓；
    pickScale 成功后不回填——表单草稿保留=W1 目标行为 ✓。表单值与已保存值
    不一致时的唯一场景就是草稿保留，无第三态。
  - load 失败：App catch 容忍+设置页自身 load 失败 toast（既有 effect 在），
    settings 恒 null→守卫假→不水合，无异常路径 ✓。
  - 残余注记（非缺陷）：水合前（load 网络往返窗内）用户输入会在首次水合时
    被覆盖——「载入后同步」模式固有形态（首帧表单本空、窗极窄），非 W1
    所指场景（W1=水合后 store 更新回填），不阻断。
  - 既有覆盖面：SettingsPage 有两个组件测试挂载（corpus-export.test.tsx:414、
    r3-rdr-set-visual.test.tsx:138），均不依赖表单水合行为（挂载渲染断言）——
    静态推演无红面；主控陈述修后全量 vitest 911/911 exit=0 覆盖之（门二禁跑，
    采信主控陈述+静态推演双背书，见④注记）。
- **W2（invariants.md「受锁」表述失真）→登记不改代码，处置核实**：
  lock-protected.ps1:11-26 实读确认 Get-ProtectedFiles=tests/**、src/shared/**、
  migrations/**、全库 *.test.ts(x)、8 个 config、scripts/**(mjs/ps1)——
  **docs/ 确不在受锁集**。流程影响评估：实现者对 invariants.md 走 unlock→改→
  apply 流程，文件实未锁=unlock/apply 对其无操作、无损害；manifest 不含该
  文件→locks:check 不涉→无假红/假绿面。表述失真责任在票面标注（主控面），
  非实现者行为问题。终态处置=收口单记行澄清，正确。
- **W3（INV-39 断表）→已主控直修，实修验证通过**：invariants.md 终态
  diff（numstat 1+/1-）：INV-38 行与 INV-39 行直接相邻（原 53 行空行已删），
  主表 INV-36→39 连续、INV-39 五列结构与既有条目对齐、编号续号正确。
- **W4（RESTORED-OK 无档）→备案核实**：四份变异 raw grep 无 RESTORED-OK
  字样（本门二复核 exit=1 无匹配）——报告具体输出声称超出落盘证据属实。
  还原的间接实证成立（final-test 911/911 exit=0=任何变异残留必红+终态
  diff 与绿证态一致），实质风险低，备案+收口单改述（以 final 全绿为还原
  实证）处置正确。
- **其余 0B/20+N 无「说了没改」**：门一 N 条均为注记/预警类（theme.css 591
  存量、reload 后 small 档闪烁窗、probe Q6 单点由取证补链、probe.mjs Q3
  标号重复、239 行余量预警），均无要求实现者改动的承诺项；门一收口建议
  3 条中：建议 1（断表）=W3 已修；建议 2（记行）=归主控收口单；建议 3
  （locks generate+apply）=归主控收口（现状见④）。终态无未落实处置项。

## ②母本符合度（票面五层 vs 终态实物抽查）

- **三档链**：schemas.ts 终态=uiScaleSchema（enum 三值）+UiScale 类型+
  UI_SCALE {1,1.1,1.25}+appSettingsSchema.uiScale `.default('small')`，
  `.strict()` 保持——单源驻 schemas（预裁①⑦）✓。App.tsx=挂载
  settingsLoad().catch 容忍+选择器 `?? 'small'`+effect 单点
  setProperty('--ui-scale')+内容行类 `app-content-row`（预裁⑤）✓。
  settings.store.ts 不在 diff（预裁⑧零改）✓。ipc settings.ts 仅 DEFAULTS
  一行加 uiScale:'small'（自裁①，tsc 必需最小适配，行为零变）✓。
- **豁免面**：theme.css 终态 `.app-content-row { zoom: var(--ui-scale, 1); }`
  与 `[data-page-column] { zoom: calc(1 / var(--ui-scale, 1)); }`——与票面
  接口层声明逐字一致；注释含探针依据（canvas ×1.1 位图拉伸/calc 接受+精确
  恢复/相乘语义/三态通配）✓。header 在内容行外（App.tsx 结构）+取证
  headerH 三档恒 44 背书（E5）✓。
- **INV-39 内容与实现一致**：声明处（App.tsx+theme.css+SettingsPage）/
  强制方式（app-shell 变量两面+store 透传+ipc 兼容单测+theme.test 正则
  CSS 文本锁+e2e rect 链）/锚定（--ui-scale）三要素齐；额外登记 set 通道
  全量组装不变量（自裁②）——超出票面最低要求但与实现行为一致，合格 ✓。
- **SettingsPage 界面缩放节**：三档 segmented（UI_SCALE_LABEL 档名单源+
  百分比经 UI_SCALE 推导不手写第二份）、当前档 primary 高亮、
  `saving || settings===null` 禁点、点档即时保存+toast、说明文案（顶栏
  豁免+PDF 恒原始大小）——票面接口层逐项 ✓。pickScale/runSave 全量三字段
  组装与两处注释（自裁②机制）在场 ✓。
- **行数红线（票面 ≤250 拆件）**：W1 修复后 SettingsPage 244 行（196 基线
  +52/-4）≤250，不触发拆件 ✓。**余量 6（门一时 11）**——U2'/后续节再加
  即拆，预警更新（接缝注记）。
- **e2e 断言面**：新用例全量 getBoundingClientRect（基线 header 44 锚+nav
  poll ×1.25±2px+header 恒 44 复断）——票面「rect 断言非 computed」红线
  逐字落地 ✓；断言文案内嵌依据（探针/E5）。

## ③宪法红线终审

- **行数**：SettingsPage 244≤250 ✓；App 205≤250 ✓；schemas 410≤500 ✓；
  probe.mjs 206/forensics.mjs 210<500 ✓；theme.css 591=存量超限（ESLint
  max-lines 不辖 CSS，非本单引入，门一注记维持）。
- **UTF-8**：W1/W3 修复后的全部新增中文（hydratedRef 注释、INV-39 行、
  e2e/theme.css/App 注释）在 diff 与文件读取输出中可读无乱码 ✓。
- **分层**：renderer→window.api 零新通道（App import settings.store=组合根
  先例；UI_SCALE 值 import @shared 有 ALLOWED_REMOTE_HOSTS 先例——门一核，
  终态 diff 维持）；ipc→services→repos→db 未触 ✓。
- **安全禁令**：13 文件 diff 全量过目——无 nodeIntegration/webSecurity/
  sandbox/eval/new Function/openExternal/SQL 拼接/新出网 host ✓。
- **受锁流程**：本单**真受锁面**=schemas.ts（src/shared）+5 个测试文件
  （tests/）+forensics.mjs+probe.mjs（scripts/*.mjs）；invariants.md 实不受
  锁（W2 核实，流程无实质危害）。locks 现状=manifest 171 条与开工基线一致、
  **不含任何 r2-set1 条目**（受锁改动未 apply+两个新 mjs 未 generate）→
  locks:check 红=预期，按令主控收口统一 generate+apply，提交带
  [locked-change] 尾注 ✓（流程面，归收口清单）。
- **TDD 证据链四档**（全部实档比对）：first-red=「7 failed | 904 passed
  (911)」exit=1（红分布 ipc 3 含形状用例/app-shell 2/theme 2=与报告自裁
  ④⑤申报一致）→green=911 passed (911) exit=0→四变异各 exit=1 且红行与
  报告表格逐条吻合（m1「非 fallback 且既有字段保留」；m2「挂载后
  --ui-scale=1.1」；m3「恒补偿声明在场」——raw 上下文可见 theme.css 注释
  同串在场而断言红=正则锚定未被注释救活的直接实证；m4 变量两面用例）→
  final=911 passed (911) exit=0。链闭合 ✓。
- **探针/取证数值链**：probe.json（Q2 computed 0.909091+canvasW 612 恢复、
  Q4 数值补偿 612×792、navFont 13.5px 恒定）与开工记录 §2 逐项一致；
  forensics.json 与 run raw 逐值一致（headerHs [44,44,44]、navRatios
  1.100000037910035/1.25、canvasMaxDrift=0、spanInCanvasX 三档恒 425.54、
  fallbackSeeded=false）——实现报告转述无失实 ✓。门一 W 级注记（Q6 单点
  无基线对照）由取证三档对照补链，维持归 N。

## ④机器面核对

- **911=904+7 数理** ✓：first-red/green/final 三档 Tests 行逐字核对；7 新
  用例=ipc 2+store 1+app-shell 2+theme 2（diff 实物 it 计数一致；store 1
  即绿=自裁⑤回归锁定位申报一致）。
- **locks 现状** ✓：manifest 171 条（=开工基线 171）；grep 确认不含
  r2-set1-probe.mjs/forensics.mjs（既有 r2-* forensics 5 个在档）——
  check 红=预期（两个 mjs 未 generate+受锁改动未 apply），处置归主控收口。
- **e2e 未跑申报属实** ✓：playwright-report 不存在、test-results 空；e2e
  用例 tsc 双 project 绿为实现报告申报（门二禁跑——主控收口 verify 全链
  统一背书，含受锁 e2e 改动必须全量 verify 的教训条款）。
- **registry 无条目** ✓：tickets/registry.ts grep SET1/set1 零匹配——LOOP
  会话票无 registry 面，无「翻 done」推演面（与票面「禁触 registry」一致）。
- **主控修后全量 vitest 911/911 陈述**：门二禁跑无法亲验；静态推演（W1
  守卫不触任何既有断言、两个 SettingsPage 组件测试不依赖水合行为）与陈述
  无冲突——采信主控陈述，注记在档（收口 verify 全链为最终防线）。
- **工作区实物** ✓：probe/forensics 两 mjs 已 intent-to-add（`A` 态）与主控
  指示一致；f1-out 残留+r2-set1-out-debug/-probe-debug 未跟踪面=开工记录
  既有申报，收口清理裁决归主控。

## ⑤成本账本行

| 单元 | token | 调用 | 时长 |
| --- | --- | --- | --- |
| 实现者 | 6,865,235 | 99 | 20.8min |
| 门一（对抗深审） | 851,862 | 23 | 9.7min |
| 门二（终审，本档） | 待主控补 | 待主控补 | 待主控补 |

## 最终裁决：**放行收口**（0 拦截项、0 回炉项）

四清单全过：主控 4W 处置全部落实且实修项（W1/W3）语义验证通过；票面五层
与终态实物符合；宪法红线零违反（行数/UTF-8/分层/安全禁令/受锁流程全绿）；
机器面数理闭合、证据链四档真实、e2e 未跑与 locks 红均为按令申报的预期态。

**收口清单（主控执行，均流程面非回炉）**：
1. `npm run locks:generate`+`locks:apply`（manifest 纳入 r2-set1-probe.mjs+
   r2-set1-forensics.mjs+受锁改动同步）→提交显式列文件+[locked-change] 尾注。
2. `npm run verify` 全链亲验真退出码（含 e2e 统一跑——覆盖新 R2-SET1 用例；
   顺序铁律：locks/manifest 等主控面编辑之后必须重跑 verify 收尾）；lint
   probe.mjs:117 no-unused-vars 处置（主控自有探针面）。
3. 未跟踪面清理裁决：f1-out 残留、r2-set1-out-debug.png/-probe-debug.txt
   （开工记录申报不入库）、r2-set1-out/ 取证产物入库范围。
4. 收口单记行：①invariants.md「受锁」表述澄清（实际非受锁面）；②
   「RESTORED-OK」声称改述为以 final 911 全绿为还原实证；③SettingsPage
   244 行余量 6 预警（U2' 接缝再加节即拆 UiScaleSection）；④probe.mjs
   Q3 标号重复纯注释瑕疵。
5. 用户复测面（票面⑤f）：三档切换观感（文献卡/笔记/脉络文字）+PDF 恒不
   缩放确认。
