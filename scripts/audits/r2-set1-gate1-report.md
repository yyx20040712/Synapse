# R2-SET1 门一对抗深审报告（2026-08-29）

审计人：门一子代理（对抗深审，三屋 ADR-0017）。只读审计，唯一产物=本档。
配置：GLM-5.3；禁 npm/test/构建/git/tickets——全部门一结论基于静态推演+证据档比对+探针/取证实测转述核对。

## 0. 开工技能清点（宪法会话开工纪律）

| 技能 | 用/不用 | 理由 |
| --- | --- | --- |
| code-review-excellence | **用** | 本职=对抗深审 |
| verification-before-completion | **用** | 收口前核本档完整性/逐条 file:line |
| test-driven-development | 不用 | 不写测试只审测试（红绿/变异证据比对代替） |
| systematic-debugging | 不用 | 无待定位缺陷；时间线/层叠用静态逐帧推演覆盖 |
| e2e-testing-patterns | 局部参考 | e2e 断言面形态推演（禁跑，只推演） |
| git/computer-use/browser 类 | 不用 | 禁令（只读+前台保护） |

## 1. 输入实读清单（全部实读，无凭转述）

diff 包 13 文件、票面五层、实现报告、8 份 raw 证据+forensics.json+probe.json、
开工实证 r2-set1-open.md、以及核验所需源码：settings.ts(ipc)/settings.store.ts/
SettingsPage.tsx/App.tsx/schemas.ts/api-surface.ts/register.ts/constants.ts/
PageColumn.tsx/theme.test.ts/theme.css/invariants.md/lock-protected.ps1/smoke.spec.ts。

## 2. 逐条裁决

### A. 母本符合度（diff vs 票面五层四表 + 预裁/自裁逐核）

- **[N] 三档状态机符合**：`uiScaleSchema=z.enum(['small','medium','large'])` +
  `UI_SCALE={1,1.1,1.25}` + `.default('small')` 单源驻 schemas.ts
  （src/shared/ipc/schemas.ts:368-374，diff @@ -365,10 +365,16）。迁移链与票面
  逐句一致（旧文件 zod default→App 挂载 load→--ui-scale→CSS 即时生效）。
- **[N] pickScale 全量组装链正确（A 项专项推演）**：
  - `DEFAULT_CONTACT_EMAIL='synapse-user@example.com'`（src/shared/constants.ts:26）
    为合法 email 格式。
  - pickScale 路径（SettingsPage.tsx:93-102）：`settings` 恒来自 ipc.get 结果——
    文件值必须过 `z.string().email()` 才被接受（settings.ts readSettings），否则
    整体走 DEFAULTS（contactEmail=合法默认 email）。故
    `save({contactEmail: settings.contactEmail, ...})` 组装的 email **恒过** register
    层 strict 校验——未填邮箱用户切档不会被拒，结论成立。
  - runSave 路径（SettingsPage.tsx:75-90）：表单空邮箱被
    `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` 正则拦截（:79）toast 返回，不落盘——空表单
    无写坏面。
  - 守卫完备：`saving || settings===null || settings.uiScale===next` 三重
    （:94）+按钮 `disabled={saving || settings===null}`（:177）双防线。
- **[N] 自裁②机制实锤**：api-surface.ts:96 `set Req=S.appSettingsSchema`（完整
  schema）；register.ts:22-27 safeParse 失败→INVALID_REQUEST、handler 收
  **parsed.data**（default 已填）。推演：单字段 patch 缺 contactEmail（必填）→拒；
  两字段 patch 缺 theme→zod default 'system' 静默填入落盘→抹掉现值。「漏带被
  default 抹值」与「UI 组装全量是正解」推理链完整成立（SettingsPage.tsx:83-97
  两处注释如实记载）。
- **[N] 自裁①成立**：票面「ipc/settings.ts 零改」字面不可达——z.infer 对 default
  字段输出必填，DEFAULTS 缺 uiScale 即 tsc 红。一行适配
  （src/main/ipc/settings.ts:32）行为零变（DEFAULTS 仅 get 兜底/比较用，
  写回语义不变；grep 核实无其他消费点变化）。
- **[N] 自裁③成立且有档案实证**：first-red raw 中 theme.test:139-141 为 toContain
  首版形态——演化史如实；m3 红块上下文可见注释同串仍在而测试红
  （r2-set1-mutation3-calc-removed.raw.txt）=正则锚定未被注释救活的直接实证。
- **[N] 自裁④成立**：ipc settings.test 2 处 set 调用/toEqual、store.test 6 处
  SettingsOk 实参加 uiScale——均为 schema 扩字段后形状同步，断言语义不变
  （stale-guard 三用例的版本序语义零触碰，diff @@ 段核对）。
- **[N] 预裁①~⑧逐条核**：①enum+default+单源 ✓；②挂载=.app-content-row
  （App.tsx:173）+header 行外（App.tsx:153）✓；③calc 补偿
  （theme.css diff @@ -112,6 +112,22）+探针 Q2/Q4 背书 ✓；④rect 断言
  （smoke.spec 新用例全 rect，probe.json navFont 13.5px 不变实证 computed 无感）
  ✓；⑤App 挂载 load 失败容忍（App.tsx:127-131 catch 兜底）✓；⑥e2e 锁 UI 链
  ✓；⑦UI_SCALE/UiScale 住 schemas 导出 ✓；⑧store 零改（settings.store.ts
  不在 diff）✓。
- **[W] 表单草稿抹除窗（票面外交互接缝，未声明假设）**：
  SettingsPage.tsx:68-73「载入后同步进表单」effect 依赖 `[settings]`——
  pickScale 落地→store.settings 整体替换（新对象引用，settings.store.ts:72
  `set({ settings: saved })`）→该 effect 重跑→`setEmail(settings.contactEmail)`
  刷回**持久真值**。推演具体序列：用户改邮箱表单（未点保存）→点缩放档→
  pickScale 以 store 真值（旧邮箱）组装全量→落地→表单草稿静默丢失（theme
  下拉草稿同轨）。行为可辩护为「点档=以持久真值+新档全量保存」，但该交互
  未在票面/INV-39 声明——按宪法「未声明假设」纪律应报告。**非阻断**：草稿
  本就未保存，效果等同重新进入设置页；建议主控收口单记一行（或后续单处置，
  如 effect 仅在首次载入同步）。

### B. 宪法红线

- **[N] 安全禁令零触碰**：无 nodeIntegration/webSecurity/eval/新出网 host/
  SQL 面；schemas 改动纯 zod 声明。
- **[N] 行数实测**（wc）：SettingsPage.tsx **239**≤250 ✓；App.tsx 205≤250 ✓；
  schemas.ts 410≤500 ✓。
- **[N] theme.css 591 行（存量 575+本单 16）超 500 字面**——ESLint max-lines
  不辖 CSS，存量超限非本单引入，注记不阻断。
- **[N] 分层**：App.tsx:15 import settings.store=组合根既有先例
  （:14 useExportCorpusEvents 同 feature 先例；workspace/lineage store 同型）；
  `UI_SCALE` 值 import from '@shared/ipc/schemas' 有先例
  （SettingsPage.tsx:21 ALLOWED_REMOTE_HOSTS 值 import）。零跨层新面。
- **[W] 「受锁」表述失真（按主控指令核查项）**：
  lock-protected.ps1:11-26 Get-ProtectedFiles 范围=tests/**、src/shared/**、
  src/main/db/migrations/**、全库 *.test.ts(x)、8 个 config、scripts/**
  (*.mjs,*.ps1)。**docs/ 不在受锁集**——票面（接口层「docs/invariants.md
  （受锁）」）与实现报告（文件清单「（受锁）」）对 invariants.md 的受锁标注
  与机制不符。流程无害：改动已如实申报，locks:check 不涉该文件，无需
  [locked-change] 尾注的机检面也不受影响。forensics.mjs 属 scripts/*.mjs=
  真受锁面 ✓（报告已申报 manifest 未登记、主控收口 generate+apply——处置正确）。
- **[W] INV-39 登记断表（登记质量）**：docs/invariants.md:53 空行把 INV-39
  （:54）与主表（:13-52 连续无空行）断开——孤行 `| … |` 无表头/分隔行，markdown
  渲染为段落文本而非表格行。内容本身合格：五列结构与既有条目对齐、编号续号
  正确（最高 INV-38→39）、声明处/强制方式/锚定状态三要素齐。仅断表一处格式
  瑕疵（把 :53 空行删去即修复——docs 非受锁，主控收口可直接改）。
- **[N] UTF-8**：全部新增中文（diff/App/SettingsPage/forensics.mjs 注释/
  INV-39）工具验证可读；CI mojibake 关卡归主控 verify。
- **[N] TODO/FIXME/placeholder**：新增四文件+改动文件 grep 零命中。

### C. 代码与测试质量

- **[N] 事件时间线逐帧推演（无竞态）**：
  - 挂载链：首帧 settings=null→选择器 `?? 'small'`→effect（App.tsx:134-136）写
    '--ui-scale'=1；load 异步应答→store 更新→重渲 uiScale=档值→effect 重跑写
    档值。值驱动、无竞态窗口；`settingsLoad` 为 zustand create 闭包稳定引用
    （settings.store.ts:55），effect [settingsLoad] 恒单跑。
  - 双 load 并发（App 挂载+设置页挂载）：幂等读，两次 load 的 seq 同为 0、
    应用同值，无害（INV-03 版本计数只防 save 乱序，本单未新增写竞态面）。
  - save 变化沿：pickScale→save→settingsSeq+1→settings 替换→App 订阅重渲→
    变量更新（app-shell.test 第二用例锁）。
  - 课题切换 reload（INV-35 location.reload）→文档重置→变量随 documentElement
    内联 style 清空→App 重挂→load 应答恢复档——票面「天然」成立。注记：reload
    后至 load 应答存在 small 档闪烁窗（百 ms 级，FOUC 类已知代价，非缺陷，
    票面预埋「天然」即接受该形态）。
- **[N] CSS 皮肤特异性推演（无冲突面）**：zoom 属性无对应 tailwind utility
  （v3 无 zoom 类）——`.app-content-row` (0,1,0) 与 utilities 同特异性但**不同
  属性**，零声明冲突；内容行 className `flex min-h-0 flex-1` 与 zoom 正交
  （App.tsx:173）。PageColumn 三态（error/loading/ready，
  PageColumn.tsx:212/215/221）均带 data-page-column——属性选择器通配覆盖 ✓；
  ready 态内联 `style={{width}}` 与 zoom 正交（zoom 缩放视觉、width 布局值
  不变——取证 canvas 三档恒 595 背书）。
- **[N] theme.test 正则锚定评估（自裁③）**：css=readFileSync 真文本锁
  （theme.test.ts:22-24）。正则要求「选择器+{+声明」完整形态——注释 prose 不
  再救活（m3 实证）。残余脆弱面（注记非缺陷）：①若未来注释誊录**完整声明
  形态**字样仍可救活（当前注释无此形态）；②格式化重排（如
  `calc(1/var(--ui-scale,1))` 无空格变体）会误红——锁格式即文本锁本性，
  权衡合理。对 tailwind 类改动不敏感（只读 theme.css 文本）。
- **[N] 变异③「首跑被注释救活」教训复盘——断言已达杀伤面**：首版
  toContain('zoom: calc(1 / var(--ui-scale, 1))') 命中注释同串（theme.css 注释
  与探针依据 prose 均含该串）→变异③首跑存活→修正正则→复跑红（在档）。
  教训已转化为断言形态升级+first-red 原始形态留档，复盘闭环。
- **[N] 取证 JSON 数值链与转述一致**：nav 比 1.1000000379/1.25（medium 尾差
  4e-8=渲染亚像素浮点，报告「1.100000/1.25 精确」转述成立）；canvasRectW
  三档恒 595、canvasMaxDrift=0、backing 恒 595（无位图拉伸）；
  colComputedZoom 1/0.909091/0.8（补偿在效）；uiScaleVar 1/1.1/1.25（App 链）；
  spanInCanvasX 恒 425.54——全部与 forensics.json 及 run raw 逐值一致。
  注记：spanInCanvasY large 档 35.53 与前两档差 0.01（浮点），报告仅列 X 恒定
  未提 Y——0.01px 在「对位不破坏」结论容忍内，转述略选择性但无失实。
- **[N] e2e 用例形态推演（只写未跑，票面授权）**：mkdtemp 新库→无
  settings.json→默认 small 基线成立；nav 首项高由行高/padding 决定，与窗口
  宽高无关（取证 navRectH 40.25 稳定）——×1.25±2px 容差对 40.25×1.25=50.3125
  充足（取证实测精确达标）；header 44 非巧合=CSS 定值（theme.css:85
  `height: 44px`），窗口尺寸差异下恒稳；poll 5s 覆盖
  save→store→effect→zoom→rect 全链；`toBe(44)` 精确断言有 CSS 根据与
  SH3/取证双背书。类型面：报告称 tsc 双 project 绿（受锁 e2e 改动教训——
  playwright 不查类型、tsc 关卡补位——流程合规）。
- **[W] 探针 Q6 单独不足以支撑「对位不破坏」（预裁③证据链注记，不推翻预裁）**：
  probe.json Q6 仅补偿态单点测量（spanInCanvasX=262.11）**无 zoom=1 基线对照**
  ——单点无法证明「不受破坏」。幸取证脚本三档 spanInCanvasX 恒 425.54 补全了
  跨档对照，证据链整体闭合；票面「探针 Q2/Q4/Q6」背书中 Q6 一支溢出（Q2/Q4
  自身扎实）。补偿正确性的结论不受影响（取证承担了证明责任）。

### D. 报告诚实性

- **[N] 文件对账**：diff 13 文件=报告清单 12 行+probe.mjs（主控自有，预裁⑨
  声明）——对账一致。
- **[N] 行数抽查**：SettingsPage 239 ✓（报告同数）、schemas 410、theme.css
  591、App 205——与报告转述一致。
- **[N] 911=904+7 数理** ✓：7 新用例=ipc 2+store 1+app-shell 2+theme 2；
  首红 raw 尾部「7 failed | 904 passed (911) exit=1」、green/final 均
  「911 passed (911) exit=0」——与报告逐字一致。首红分布（ipc 3+app-shell 2+
  theme 2=7 红，store 1 新用例即绿=自裁⑤申报一致）。
- **[N] 证据日志存在性与一致性**：四变异 raw 全在、各 exit=1、红行与报告表格
  逐条吻合（m1 红因 `expected 'system' to be 'dark'`=「fallback 吞 theme
  断言杀」精确转述——uiScale 断言因 DEFAULTS 同值 'small' 恰不红，由 theme
  保留断言承载「非 fallback」语义，用例设计正确；m2 红挂载 1.1 用例；m3 红
  CSS 锁；m4 红变量两面）；forensics-run 5 行 exit=0 与 JSON 逐值一致。
- **[W] 「输出 RESTORED-OK」声称无档**：四份变异 raw.txt 均 grep 无
  RESTORED-OK 字样——报告「还原安全：四方向均 diff 备份=空确认（输出
  RESTORED-OK）」的**具体输出声称**超出已落盘证据。还原本身有强间接实证
  （final-test 911 全绿=任何变异残留必红），实质风险低；但转述与证据档不符，
  诚实性记 W。
- **[N] 疑虑四条全数申报**（lint 探针遗留/locks 红/e2e 未跑/兜底分支未实景
  触发）——无隐瞒面；「fallbackSeeded=false 未触发」与 forensics.json:2
  一致。

### E. 接缝与后续单

- **[N] U2'（脉络）大档 125% 换行红线核查面**：票面生命周期层已预埋「U2'
  票面引用」——预埋够用。推演补充：zoom 等比缩放不改布局值（换行点由
  nodeWidth 字数分档定，视觉等比不重排），理论无破绽；真风险面在 SVG rect
  高（nodeHeight 64/82/100 纯函数）与卡内文本视觉行高的对齐观感——属 U2'
  真机核查内容，本单不需前置。
- **[N] reader 工具条/PDF zoom 正交性**：viewport scale（夹取 [0.5,3]）与 CSS
  补偿相乘、PDF 视觉只受前者——取证 canvas 三档恒 595 背书；工具条文字随
  内容行放大=「只缩 HTML 文本面」设计内（探针 Q6+票面双声明一致）。
- **[N→预警] SettingsPage 239 行余量 11**：U2' 或后续节再加即触发拆件——
  票面已预埋拆件先例（UiScaleSection/CorpusExportSection），接缝预警在档。
- **[N] theme.test 正则敏感面**：只锁 theme.css 文本，不触组件 tailwind 类名
  ——tailwind 类改动零误伤面（工单 E 问项回答：无敏感）。
- **[N] SH3 caption 与 zoom 完全正交（E5 闭环确认）**：三键在 header（内容行
  外，App.tsx:153/167），取证 headerH 三档恒 44——E5 裁决（caption/顶栏保持
  系统观感）实测闭环 ✓。
- **[N] probe.mjs 现状注记（主控面）**：当前 206 行与 diff 包一致；117/133 两
  处「Q3」注释仍在（其一应属 z11 段标号重复，纯注释瑕疵）；lint 修复态
  （预裁⑨）禁跑无法复核——主控自担面，不阻断实现者裁决。

## 3. 统计

| 级别 | 数量 | 条目 |
| --- | --- | --- |
| B（阻断/回炉） | **0** | — |
| W（警告/需主控收口处置或登记） | **4** | A-表单草稿抹除窗；B-受锁表述失真；B-INV-39 断表；D-RESTORED-OK 无档 |
| N（注记/通过） | 20+ | 见上（含 1 项 W 级证据链注记归 N：probe Q6 单薄，因取证补链不独立成 W） |

修正：probe Q6 证据链注记按「不推翻预裁③」归 N。W 净计 4。

## 4. 总评：**可收口**（无回炉项）

- 票面五层四表逐项落地，预裁八条+自裁六条全部成立且自裁②③有源码机制与
  档案实证双背书；pickScale 全量组装链专项推演正确（未填邮箱用户切档不被
  strict 拒——DEFAULT_CONTACT_EMAIL 合法 email + store 真值恒过校验）。
- 四方向变异红证真实、首红/绿/终测数理闭合、取证数值链与转述一致。
- 宪法红线零违反；W 四条均为表述/证据档/票面外交互面瑕疵，无一触及行为
  正确性。

**收口建议清单（主控处置，均非回炉）**：
1. 顺手修复 INV-39 断表（删 docs/invariants.md:53 空行——docs 非受锁可直接改）。
2. 收口单记一行：①invariants.md「受锁」表述失真澄清（实际非 Get-ProtectedFiles
   面）；②「RESTORED-OK」声称无档（以 final 911 全绿为还原实证改述）；
   ③表单草稿抹除窗（pickScale→表单刷新）登记为已知交互，或开后续小单
   （effect 改仅首载同步）。
3. locks:generate+apply 时含 forensics.mjs（已在报告疑虑 2 申报）；probe.mjs
   入库与否与 manifest 同步（scripts/*.mjs 在受锁集）由主控收口一并处理
   （预裁⑨面）。
