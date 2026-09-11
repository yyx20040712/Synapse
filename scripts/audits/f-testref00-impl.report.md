# F-TESTREF-00 实现报告（三屋模式第一屋——实现者子代理）

> 工单：F-TESTREF-00 测试面指纹门（tickets/registry.ts open，主控收口翻状态）。
> 设计母本=docs/design/2026-09-11_f-testref00-design-final.md（终裁）；细节规格
> 主体=scripts/audits/f-testref00-design-kimi.md（被终裁修正处以终裁为准）。
> 实现日期 2026-09-11；node v24.20.0（PATH 实测，未用 Volta 绕行路径）。

## 0. 开工技能清点（会话开工纪律）

- test-driven-development：**用**——门自身行为以 M1-M9 九支变异红证验证（先红后还原；基线生成后 check 复跑绿）。
- verification-before-completion：**用**——verify 全链真退出码落盘（f-testref00-verify-raw.txt，VERIFY-EXIT=0）；locks 三步（generate/apply/check）实录。
- javascript-testing-patterns：**用**——vitest/Playwright 的 it.each/guardedDescribe/test.skip 条件形态语义建模依据。
- systematic-debugging：**用**——callee→expression 字段名错、each 分支静默漏过两处缺陷按「探针定位根因→修→复测」处置（TEMP 探针件，不入仓库）。
- typescript-advanced-types / subagent-driven-development / 前端与 CI 模板类技能：**不用**——纯 scripts 工具件+配置面，无类型设计面；本岗为被派发实现者非派发岗。

## 1. 实现摘要

抽取器（scripts/test-surface/extract.mjs）解析 tests/** 白名单文件 AST，产出
FileSurface（ticketIds+skipSites 文件级多重集+cases[key/describePath/title/
markers/line/assertions]）；it.each 三处经 const 单跳解析静态展开（字面量位=
真实值、非静态位=⟨nse:源文本⟩）；expect 断言=最外层链 getText 空白归一全记。
主件（scripts/check-test-surface.mjs）三子命令 check（默认）/baseline/stats；
判定=同 key 签名多重集计数 ⊆ + skipSites 双向计数 + only 恒红 + ticketIds ⊄ 红；
豁免通道 reason+rulingLink 强制。挂载：package.json 三 scripts+verify 链
（quality:check 之后）；ci.yml lock-change-guard 追加 [test-refactor] 逐提交
范围闸；AGENTS.md 工单工作流段末第 7 条+methodology.md §4 引言注记各一句。

## 2. 交付件清单（逐件行数机器实测 wc -l）

| 文件 | 行数 | 说明 |
| --- | --- | --- |
| scripts/check-test-surface.mjs | 344 | 主件：判定+豁免+CLI（≤500 ✓；骨架头注保留并扩展） |
| scripts/test-surface/extract.mjs | 404 | 抽取器 lib（≤500 ✓；W8 拆分预案落地） |
| scripts/test-surface.baseline.json | 23729 | 首版基线（无 BOM/LF/确定性再生成 diff 空已证） |
| scripts/test-surface.exemptions.json | 4 | 空豁免骨架 {version:1, entries:[]} |
| package.json | — | +test-surface:check/:baseline/:stats；verify 插入 quality:check 后 |
| .github/workflows/ci.yml | — | lock-change-guard 追加范围闸 step（仅该 job） |
| AGENTS.md | — | 弱模型领单第 7 条（工单工作流段末） |
| docs/methodology.md | — | §4 引言块注记一句（指向设计定稿） |
| scripts/audits/f-testref00-stats-raw.txt | 3 | stats+baseline 首版输出 |
| scripts/audits/f-testref00-mutation-raw.txt | 78 | M1-M9 九支矩阵 raw |
| scripts/audits/f-testref00-verify-raw.txt | 4066 | verify 全链输出+真退出码 |
| scripts/audits/f-testref00-baseline-audit-probe.txt | — | 基线抽样核对探针输出（展开标题/断言/skipSites 样例） |

## 3. stats 数字（机器实测，f-testref00-stats-raw.txt）

`{"fileCount":179,"caseCount":1623,"assertionCount":4979,"skipSiteCount":15,
"ticketIdCount":57,"eachExpandedRows":160,"unresolvableCount":0}`

- **UNRESOLVABLE=0** ✓（15 处依赖门 skipSite+3 处 it.each 全部成功建模——DoD 硬项）。
- eachExpandedRows=160 = TOKENS 104 + DURATION_COUNTS 49（7 duration×7 文件）+ FS_CSS 7；
  展开行断言复制数吻合（4979-4819=160，普通面先行统计对照）。
- DURATION_COUNTS 第 2 消费位建模样例：`（出现 ⟨nse:css⟩ 次）`/`⟨nse:wsCss⟩`
  ——W3 语义（源文本变=键变=红）落地。
- skipSites=15：14 处模块级 helper skipIfPending 体内 + 1 处 describe 体顶层
  （reader-scroll.spec.ts:283），文件级多重集全收。
- **数字口径差异申报**：简报/设计写「185 文件」，机器实测白名单=179
  （find tests -name '*.test.ts(x)/.spec.ts' | wc -l）；tests/ 全量 .ts/.tsx=187
  （含 tests/utils 6 件+e2e-env.ts 非白名单）+seed-paper.mjs。185 为设计时点
  快照或含非白名单口径，以实测 179 为准。
- check 基线复跑：exit 0（files/cases/assertions/skipSites 四计数 179/1623/4979/15 双侧一致）。

## 4. 九支变异矩阵（raw=f-testref00-mutation-raw.txt，逐支实测）

| # | 变异（目标文件） | 实测输出 | exit | 还原 |
| --- | --- | --- | --- | --- |
| M1 | 删用例「body 视觉底换新 --bg…」（theme.test.ts:175） | MISSING_CASE file:line | 1 | sha256 一致 |
| M2 | 改 expect 字面量 overflow: hidden→hidden2 | MISSING_ASSERT（断言文本精确） | 1 | sha256 一致 |
| M3 | 新增用例 | 绿+NEW delta 行 | 0 | sha256 一致 |
| M4 | 加 it.only | ONLY_FORBIDDEN | 1 | sha256 一致 |
| M5 | 删基线文件 | exit 2 硬阻断（提示显式 baseline 命令） | 2 | sha256 一致 |
| M6 | 新用例带 it.skip | SKIP_ADDED（非 NEW delta——B2 生效） | 1 | sha256 一致 |
| M7 | 既有用例体内加 test.skip(expr,msg) | SKIPSITE_ADDED（文本多重集计数+1） | 1 | sha256 一致 |
| M8 | 删一处既有 skipSite（reader-scroll:283） | SKIPSITE_REMOVED | 1 | sha256 一致 |
| M9 | describe.only 包既有用例 | ONLY_FORBIDDEN（W1 传播）+伴生 MISSING_CASE | 1 | sha256 一致 |

九支还原一律 cp 文件备份法（cp→变异→测→mv→sha256 前后比对），未用任何
git checkout/restore；还原后总绿 exit 0（raw 末段）。M9 的 MISSING_CASE 为
伴生输出（签名含传播 only 必失配），预期验证点 ONLY_FORBIDDEN 满足。

## 5. verify 与 locks 实录

- `npm run verify` 真退出码 **VERIFY-EXIT=0**（f-testref00-verify-raw.txt 尾行；
  链=quality:check → **test-surface:check**（第 24-28 行在档）→ tickets:check
  → locks:check → lint → typecheck → test → build）。
- locks：generate（manifest 323 条）→ apply（323 文件设只读）→ check 通过。
  322→323 = +scripts/test-surface/extract.mjs（walk scripts 递归 .mjs 自动收）；
  check-test-surface.mjs 骨架原已在册（本次 sha 更新）。
- 工作树终态：修改 6 件（ci.yml/AGENTS.md/methodology.md/manifest/package.json/
  check-test-surface.mjs）+新增（baseline/exemptions/test-surface/ 目录+本报告等
  证据件）；tests/** 与 src/** 零改动（git status+变异 sha256 双证）；无
  .mutbak/探针残留。

## 6. 自裁申报（一切超票面/超设计字面决定）

1. **skipSites 文件级建模**（设计定稿 §2「CaseEntry 增 skipSites」→实现为
   FileSurface 级多重集）。依据：存量 15 处中 14 处物理位于模块级 helper
   （skipIfPending）体内、1 处在 describe 体顶层——用例级归因需调用内联且按
   调用点数放大（reader-text 单文件 17 个调用点≠1 处源码），DoD 硬项
   「skipSites=15」无法达成。防削弱语义等价论证：新增依赖门调用=计数+1→
   SKIPSITE_ADDED 红；删调用=REMOVED 红；删整个用例由 MISSING_CASE 兜底。
   豁免条目相应扩展 skipSiteText 匹配键（M7/M8 红证验证）。
2. **漏扫哨兵 AST 形态判定**（设计 W6 正则 → AST）。依据：纯正则实测唯一命中
   tests/utils/guard.ts 的 `describe(label, fn)` 转发调用（双标识符参），与 DoD
   「UNRESOLVABLE=0」冲突。AST 判定=callee 纯标识符 it/test/describe 且（首参
   字符串字面量或任一参函数字面量）——真用例文件必含函数字面量参数（防漏
   等价），转发调用不命中（防误伤）。
3. **baseline/exemptions 两 JSON 未入 locks manifest**。依据：受锁集合硬编码于
   check-locks.mjs/get-protected-files.ps1（修改超本票允许写面；先例
   dup-constants.baseline.json 是显式硬编码登记的）。残留风险：篡改两 JSON 不触
   发 locks 红（但会触发指纹门 diff 可见性/门二机器面核对）。建议主控收口裁量
   是否扩 protectedFiles 登记（走 [locked-change]）。
4. **CI 白名单补 scripts/audits/**`（设计 §7 白名单只列 docs/audits/**——
   ai-dev-org 惯例路径）。本仓证据目录实态=scripts/audits/**，战役票证据件入库
   需放行；宽松向微调、非代码面，ci.yml 注释在档。
5. **each 元组内非字面量位=⟨nse⟩ 占位不红**。设计 §3-4 括号「元素为字面量/
   字面量元组」严格读会把 DURATION_COUNTS/FS_CSS（元组第 2 位 css 等标识符）
   判保守红，与简报「css/wsCss 为非静态位——标记替换后行计数仍入多重集」及
   DoD「3 处 it.each 全部成功建模」冲突——按简报+W3 终案口径实现；数组**顶层**
   非字面量元素仍保守红。
6. **体内字面量真值 skip 归并 skipSites 桶**（0 参 test.skip()/静态 truthy 条件）
   ——设计「按新增 skip 红处理（等价声明）」在文件级建模下的等价实现（新增即
   SKIPSITE_ADDED 红）；本仓存量 0 处，纯语义完备性处理。
7. **stats 子命令对 UNRESOLVABLE exit 1**（Kimi §7.1「不判定」指不做基线比对
   ——抽取面错误仍红，DoD 机检需要）。
8. **豁免 schema 匹配键三选一**（caseTitle/assertionText/skipSiteText 任一，
   file 恒必填）——Kimi §6 的 caseTitle 必填在 skipSite 豁免场景无语义；校验
   仍强制 reason+rulingLink（exit 3 面保留）。
9. **数字口径**：简报 185 文件 vs 实测 179（见 §3 差异申报）。
10. **CASE_TODO/CASE_FIXME 变量名**：vitest API（it.todo/it.fixme）建模命名，
    非占位标记（\bTODO\b 词边界不匹配 _TODO；check-quality 扫描域=src+tests
    不含 scripts；verify 全链绿实证）。

## 7. 疑虑（供门一/门二/主控裁量）

- 基线 23729 行较大——cases 按 key 含 describePath 冗余（设计字段如此，未裁）；
  若门二认为体积需优化，可在后续票把 describePath 从每 case 提到文件级前缀树（S 面重构，非本票面）。
- 同 key 重复用例（Q5）本仓存量未单独统计——算法按多重集计数处理（W4），无配对歧义；
  若后续出现同 key 用例，豁免宜附 assertionText 消歧（N2 已知限制头注在档）。
- `$name`/`${path}` 占位形态（Kimi §3.4 $ 子集）实现为保守红（本仓 0 处；v1
  宁红走豁免）；printf %o/%f 同保守红。
- verify 含 vitest 全量+build，本机全链 ~5 分钟；指纹门自身抽取 179 文件 <2s
  （秒级，无性能面担忧）。

## 8. 回炉轮 1（门一 R1 放行附条件——B1b/W5/W6/W7/W8/W10/W1+W3+W4/N10+N6）

门一报告=scripts/audits/f-testref00-gate1-r1.md（B1/W11/W1-W10/N1-N10）。逐项落实态：

### 8.1 必改项（全部 ADDRESSED）

| 门一条目 | 落实 | 证据 |
| --- | --- | --- |
| B1b+N7 基线健全性 | loadBaseline 增三重下限：files 非空+stats.fileCount===keys 数+stats.caseCount>=1，违者 corrupt（exit 2）；stats 字段用活（N7 死字段收口） | raw「[R1] b1b-empty-baseline」段：空基线→「基线损坏…exit 2」真退出码 2（首测 EXIT=0 系 tee 管道测量的失误，复测行更正在档） |
| W5 先阻断后写盘 | cmdBaseline 改序：UNRESOLVABLE 非空 die(1) 在 writeFileSync 之前（禁写脏基线） | 主件 cmdBaseline 顺序；本轮基线再生成走该路径（UNRESOLVABLE=0 写盘） |
| W8 双桶 | conditionalSkipSites（非字面量条件，双向红）+hardSkipSites（0 参/字面量真值：新增=SKIPSITE_ADDED 红、删除=ACTIVATED 绿 delta）；stats 新增 conditionalSkipSiteCount/hardSkipSiteCount，skipSiteCount=两者和（向后兼容）；基线结构随之再生成 | raw「[R1] m10-theme」（hard 新增→SKIPSITE_ADDED exit 1）+「[R1] m10-removed-half」（基线含 hard=1→还原文件→ACTIVATED delta 行+exit 0，双 sha 还原一致） |
| W6 import 别名 | importAliasCheck：vitest/@playwright/test 源的 it/test/describe 说明符真别名（imported∈三词且 local≠imported）或伪装本地名（local∈三词但 imported∉）→UNRESOLVABLE；**超裁决保守向**：namespace import 同红（v.it() 形态 calleeText 白名单外，堵漏抽通道；存量 0 处——grep 预检实证 tests 下 namespace import 仅 1 处且源为 src/shared 不触发）；default import 本地名∈三词同红。白名单+非白名单域均查 | stats 复跑 UNRESOLVABLE=0（存量零命中）；`_electron as electron` 别名（imported∉三词）不误伤 |
| W7 哨兵扩 | callee 识别面扩：纯标识符三词 或 PropertyAccess 形态（calleeText 匹配 /^(it|test|describe)\./）；命中后仍按参数形态判定（首参字符串字面量/任一参函数字面量）——guard.ts 的 describe(label,fn) 与 describe.skip(label,fn) 转发（双标识符参）不误伤、带回调真用例不漏；WHITELIST_RE 加 spec\.tsx（存量 0 个） | stats UNRESOLVABLE=0（guard.ts 不红实证） |
| W10 NEW 可见性 | NEW delta 行附断言计数：「NEW … (line N, M assertions)」（M=0 零断言新用例一眼可辨）；NEW_FILE 分支逐用例 NEW 行同款 | 主件 deltas.push 两处 |
| W1 merge-safe | `git show --name-only --format=` → `git diff-tree --no-commit-id --name-only -m -r`（merge 对双父并集=保守向），注释引门一 W1 | ci.yml 范围闸 step |
| W3 正则收紧 | scripts/ 段白名单合并为带结尾锚复合式（禁 check-test-surface-evil/ 前缀逃逸与 .mjs.bak 残留形态），本地验证：src/**+evil 前缀+.bak 三类应红路径实测红、合法路径全过 | 本地 echo|grep -Ev 实测（会话执行在档）；ci.yml 注释引 W3 |
| W4 BASE 兜底 | BASE 不可达→`git fetch origin main`+`git merge-base origin/main HEAD` 兜底；仍失败才跳过且 ::notice 升 ::warning | ci.yml 范围闸 step，注释引 W4 |
| N10 受锁声明 | extract.mjs 头注补「[locked-change] 声明面随主件——门一 N10 补齐」 | extract.mjs 头注 |

### 8.2 主控裁定接受项（注记落位）

- W2（尾注自愿制）：ci.yml 注释补论证一句（locks sha+[locked-change] guard 独立守护，范围闸=战役附加层）——已落。
- W9（豁免低摩擦）：豁免件入锁已由主控面完成（protectedFiles 登记，manifest 325 条含两 JSON）+门二人审通道——本票不改逻辑。
- W11（CASE_TODO 命名）：extract.mjs 定义行加注「vitest API 建模命名非占位标记（W11 裁定）」——已落。
- N4（签名不含 skipSites）：文件级建模必然推论，接受。
- N6（CONSERVATIVE_REDS 扩展）：**此处补申报**——it.concurrent/test.extend/describe.configure/test.describe.configure/it.skipIf/it.runIf/test.skipIf/test.runIf 超设计 §3.5 清单纳入保守红（v1 宁红走豁免向，存量 0 处）。

### 8.3 回炉轮新数字（机器实测）

- stats：`{"fileCount":179,"caseCount":1623,"assertionCount":4979,"skipSiteCount":15,
  "conditionalSkipSiteCount":15,"hardSkipSiteCount":0,"ticketIdCount":57,
  "eachExpandedRows":160,"unresolvableCount":0}`——UNRESOLVABLE=0 维持（W6/W7 扩面零误伤实证）。
- 基线再生成（双桶结构+stats 新字段）：23910 行；check 复跑 exit 0；确定性维持。
- 行数：主件 386 / extract.mjs 477（均 ≤500）。
- 变异复证：M6（SKIP_ADDED）/M7（conditional 增→SKIPSITE_ADDED）/M8（conditional 删→SKIPSITE_REMOVED）各 exit 1+sha 还原一致；M10 新增半（hard 增→SKIPSITE_ADDED exit 1）；M10 删除半（基线 hard=1→还原→ACTIVATED delta+exit 0）；B1b（空基线→exit 2）；还原后总绿 exit 0。
- verify 回炉轮全链真退出码 **VERIFY-EXIT=0**（verify-raw 追加段；test-surface:check 链中在档）。
- locks：generate 后 manifest 325 条（322 原面+extract.mjs+baseline.json+exemptions.json——后两者系主控面已扩 protectedFiles 登记后的自动收锁）；locks:check 过（325 一致）。未 apply（主控收口统一）。

### 8.4 回炉轮自裁申报（新增）

1. **namespace import 保守红**（超主控裁决字面）：vitest/@playwright/test 的 `import * as X` → UNRESOLVABLE（X.it() 形态 calleeText 不匹配白名单=漏抽通道）。存量 0 处（tests 下 namespace import 仅 src/shared 源 1 处不触发），零摩擦。
2. **新文件 skipSites 双桶新增红**（超裁决补面）：NEW_FILE 分支补 conditional/hard 双桶新增→SKIPSITE_ADDED（B1「新增=红」语义本应覆盖新文件场景；v1 首版此面漏判，门一未点名，本轮顺手闭合）。
3. **B1b 首测 EXIT=0 测量误差**：raw 中 b1b 段首测 EXIT=0 系 bash 管道 `$?` 取了 tee 退出码；复测行（「[R1 复测] …真退出码 EXIT=2」）已更正在档——证据诚实性主动申报。
