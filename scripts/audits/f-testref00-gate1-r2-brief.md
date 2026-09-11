# 门一 R2 定点复核任务：F-TESTREF-00 回炉轮 1

你是门一（对抗式审查员，R2=回炉复核轮）。R1 报告=scripts/audits/f-testref00-gate1-r1.md（B1/W11/N10——放行附条件五项）。实现者已回炉：报告 §8 申报八项必改全 ADDRESSED+五项裁定注记+两项新自裁（namespace import 保守红/新文件 skipSites 双桶新增红）。

## R2 指令（定点，不重审全量）
1. R1 五放行条件逐条核：①基线/豁免入 protectedFiles（diff 内 check-locks.mjs+get-protected-files.ps1 双侧登记）②loadBaseline 健全性下限（B1b）③cmdBaseline 先阻断后写（W5）④范围闸 merge-safe+正则锚（W1/W3）+BASE 兜底（W4）⑤W11 裁定注记。
2. 新破坏扫描：回炉改动（双桶/别名检测/哨兵扩/NEW 行/CI 三修）是否引入新问题——重点 W8 双桶语义边界（hard 删除=ACTIVATED 绿的实现）、W6 别名检测误伤面、W7 哨兵扩误伤面、W1 diff-tree -m 的行为正确性。
3. 两项新自裁裁量：namespace import 保守红（超裁决字面）与新文件桶新增红（B1 补面）——接受/拒绝+理由。
4. 证据诚实性抽验：报告 §8.3 数字 vs 附 raw；B1b 复测行（首测 EXIT=0 申报为 tee 测量误差）是否可信。

输出：[B|W|N] 逐条+证据+总评（收口放行/再回炉）。中文。

---
## 附 1 R1 报告（对照基线）

[routing]: run=20260911164546-aysw source=deepseek model=deepseek-v4-flash role=gate1-reviewer@deb5050f cfg=add15c606e1b switches=2 usage=in=22544,out=24019 latency=114159ms (by ds-call-v2 链)

# 门一 · F-TESTREF-00 测试面指纹门 · 对抗式深审报告

审阅范围：diff 包（check-test-surface.mjs 344 行 / test-surface/extract.mjs 404 行 / ci.yml / package.json / AGENTS.md / methodology.md / exemptions.json）+ 报告 + 变异 raw + stats raw + 设计定稿。只读审计，未接触仓库、未跑命令。

---

## [B] 级

### B1　基线文件未受锁 + `loadBaseline` 接受空 `files` ⇒ C_after ⊇ ∅ 恒真，门对一切削弱全绿
- 证据（判定算法）：`check-test-surface.mjs` 中
  ```js
  if (parsed?.version !== 1 || parsed?.files === null || typeof parsed?.files !== 'object' || Array.isArray(parsed?.files))
    return { corrupt: true }
  ```
  对 `{version:1, files:{}}`：`files===null`→false、`typeof {}==='object'`→true 故 `!==object`→false、`Array.isArray({})`→false ⇒ **不判 corrupt**，返回 `{files:{}}`。
- `judge(baseFiles={}, cur)`：`Object.keys(baseFiles).length===0`，每个当前文件落入 `!b && c` 分支 → 全 `NEW_FILE`/`NEW` delta，`failures` 恒为空 → 打印「检查通过：C_after ⊇ C_before」→ **exit 0**。
- 攻击链：基线文件本身未入 locks manifest（报告自裁③承认），且 CI 白名单 `^scripts/test-surface[^/]*\.(json|mjs)$`（ci.yml）放行该 JSON 修改。故作弊者在 `[test-refactor]` 提交内把 `scripts/test-surface.baseline.json` 的 `files` 清空（保留 `version:1`）即可让门对所有用例删除/断言削弱**静默放行**，且不触发 locks 红。
- 与预裁②关系：预裁②已预裁「基线/豁免未入 locks」风险面，但仅表述为「未受锁」。本条的**新增依据**是 `loadBaseline` 对空/退化 `files` 不做下限校验（即便入锁后，仍需承认这是实现层缺陷而非纯登记问题）。建议：基线入 protectedFiles（预裁②对接）+ `loadBaseline` 增加「`files` 非空 / `stats.fileCount` 与 keys 数一致」健全性校验。

---

## [W] 级

### W1　CI 范围闸对 merge commit 失效（与设计「merge 场景无歧义」直接矛盾）
- 证据（ci.yml 新 step）：`OFF=$(git show --name-only --format= "$C" | grep -Ev "$TR_RE" || true)`。
- `git show --name-only <merge>` 默认走 combined diff，**clean merge 中来自父分支的内容不出现在输出里**，故 `OFF` 为空 → 放行。设计定稿 §7-W7 明写「逐提交判定（merge 场景无歧义）」——该缓解对本实现不成立。**不确定项**：具体行为随 git 版本/冲突状态略有差异，建议改为 `git diff-tree --no-commit-id --name-only -m -r <C>` 或对 merge 取 `--first-parent`。

### W2　范围闸 `[test-refactor]` 尾注自愿制 → 不打尾注即可完全绕过 src 保护
- 证据：`if git log -1 --format=%B "$C" | grep -q '\[test-refactor\]'; then`。改 `src/**` 的提交只要不写该尾注，循环体不进入 → 不被检查。设计 W7 如此规定（尾注=信誉声明），故为**设计意图**，但作为「门自身绕过通道」需显式记录：范围闸对 src 的守护强度=提交者自愿打标，无强制闭合。

### W3　范围闸正则 `^scripts/check-test-surface` 无结尾锚
- 证据：`TR_RE` 首段 `^scripts/check-test-surface`（对比设计 §7 白名单原文 `scripts/check-test-surface*`——设计即带通配）。前缀匹配放行 `scripts/check-test-surface-anything.mjs`（任意新文件/目录）而不触发 OFF。属设计宽面正则化，但可被用作白名单逃逸（如 `scripts/check-test-surface-evil/...`）。

### W4　force-push 场景范围闸静默跳过
- 证据：ci.yml `if [ -z "$BASE" ] || ! git cat-file -e "$BASE^{commit}" ...; then echo "::notice::...跳过范围闸"; exit 0; fi`。注释自认「强推重写跳过」。任何导致 `$BASE` 不可达的 force-push 即 `exit 0` 静默放行整段范围闸。设计未覆盖此面。

### W5　`cmdBaseline` 先落盘后 `die(1)` ⇒ 抽取有 UNRESOLVABLE 时写脏基线
- 证据（check-test-surface.mjs cmdBaseline）：
  ```js
  writeFileSync(join(root, BASELINE_PATH), serializeBaseline(surfaces, stats), 'utf8')
  console.log(...)
  if (unresolvable.length > 0) die(1, ...)
  ```
  `writeFileSync` 在 UNRESOLVABLE 阻断**之前**执行。存在不可静态判定用例时，`surfaces` 缺该用例却仍写出基线文件，随后 exit 1。若调用方忽略退出码（或后续 check 复用残留基线），形成静默脏基线。设计 §3-6/§4 语义要求保守红阻止基线生成，实现顺序与之相悖。

### W6　抽取器别名 import 盲区（用例静默漏抽）
- 证据（extract.mjs）：`calleeText` 仅按标识符/属性访问取文本，白名单判定用字面文本 `CASE_PLAIN={it,test}` / `DESCRIBE_PLAIN={describe,...}`。`import { it as myIt } from 'vitest'` 后 `myIt('t', fn)` → callee=`myIt` 不识别，既不入 `cases`、也不触发任何 red（非 `CONSERVATIVE_REDS`），**门对该用例不可见**。若整文件用别名，门判定该文件「无用例」→ 绿。同族：`(0, it)('t', fn)`（逗号运算符）、`(it)('t', fn)`（括号包裹）→ `calleeText` 返回 null，同样漏抽。审项 C 明列的语法盲区，实现未做防护。

### W7　漏扫哨兵对后缀调用形态不命中（`.spec.tsx` 等非白名单文件的漏扫）
- 证据（extract.mjs sentinelCheck）：仅 `ts.isIdentifier(node.expression) && ['it','test','describe'].includes(...)`。故非白名单文件中 `it.only(...)` / `test.skip(...)` / `describe.skip(...)`（callee=PropertyAccessExpression）**不命中哨兵**。又：白名单 `WHITELIST_RE=/\.(test\.ts|test\.tsx|spec\.ts)$/` **不含 `.spec.tsx`**（设计 W6 亦未含），故若存在 `foo.spec.tsx` 且其用例用带后缀形态，则「不被抽取 + 不被哨兵捕获」双重漏扫。建议：哨兵改为匹配「callee 文本含 it/test/describe 前缀」而非纯标识符。

### W8　删除无条件 `test.skip()`（0 参）报 `SKIPSITE_REMOVED` 红，与 B1 语义不符
- 证据（extract.mjs 条件 skip 分支）：
  ```js
  if (node.arguments.length === 0 || node.arguments[0] === undefined) {
    surface.skipSites.push(normalizeWs(node.getText(sf)))   // 0 参无条件 skip → skipSite 桶
  }
  ```
  设计 §3-3 规定 0 参 `test.skip()` / 字面量真值条件是「按新增 skip 红处理（等价声明）」。归入 skipSites 桶后即成**双向红**：删除该无条件 skip（本应=激活绿+delta，参照 W5 激活语义）会触发 `SKIPSITE_REMOVED` 红。自裁⑥仅申报「归并桶」，未指出删除方向的语义反转。本仓存量 0 处，属完备性缺陷。

### W9　豁免通道低摩擦 + 未受锁
- 证据（loadExemptions）：校验仅要求 `file` 非空 + 匹配键≥1 + `reason`/`rulingLink` 为非空字符串——**无格式/来源核验**。配合 exemptions.json 未入 locks（自裁③），作弊者可在 `[test-refactor]` 提交内「删用例 + 加 `{file, caseTitle, reason:"x", rulingLink:"y"}`」而绕过 `MISSING_CASE`，全链无红。设计 §6/N2 从宽接受为已知限制，仅作风险面记录。

### W10　断言收集域「模块级 helper 不计」→ 断言面可被整体旁路
- 证据（extract.mjs 头注 + `collectCaseBody`）：断言只在用例回调子树内收集，模块级 helper 内 `expect` 不计。若测试自始即把断言收敛进 `function assertX(){ expect(...) }`（用例内仅 `assertX()`），基线与当前 `assertions` 均为空，之后任意改 helper 内断言均不红。设计 W2 未就模块级 helper 表述，此为实现的覆盖面收窄，属断言面的静默失效通道。

### W11　红线字面：「无 TODO-FIXME 字样」被变量名触碰
- 证据（extract.mjs）：`const CASE_TODO = new Set([...])`、`const CASE_FIXME = new Set([...])` 含 `TODO`/`FIXME` 字样。自裁⑩申辩「`\bTODO\b` 词边界不匹配 `_TODO`；check-quality 扫描域=src+tests 不含 scripts」。红线字面为「无 TODO-FIXME-占位字样」。**不确定项**：`scripts/check-quality.mjs` 不在本包，无法核验其扫描域是否真排除 `scripts/`——若排除，CI 不红；若某扫描器覆盖 scripts，则违规。建议主控以扫描域实物裁定。

---

## [N] 级（记录，不阻断）

- N1　stats 字段超票面：实现输出 `ticketIdCount`（extract.mjs `statsOf`），设计 §4 stats 列表仅含 fileCount/caseCount/assertionCount/skipSiteCount/eachExpandedRows。属无害扩展，报告未在自裁段列明。
- N2　M9 报告描述不全：报告表写「ONLY_FORBIDDEN + 伴生 MISSING_CASE」，但 raw（附 3 m9）实际还输出 `NEW ... (line 285)` delta 行。功能正确（exit 1），但证据陈述与 raw 不完全一致。
- N3　报告 §3「4979-4819=160」中的 4819 无独立出处（由 4979-160 反推），不可独立核验；`ticketIdCount=57` 亦无设计基准可对拍。
- N4　`caseSignature` 仅含 `{a,m}` 不含 skipSites（extract.mjs）——自裁①（skipSites 文件级）的必然推论，预裁①已接受；与设计 §5-3 字面（签名含 skipSites 排序）并存为口径差。
- N5　预裁①残留通道（helper 语义绑 registry 态）在实现中未被任何静态机制兜底，缓解仍依赖「0 open 恒不 skip」这一运行时约定。
- N6　`CONSERVATIVE_REDS` 纳入 `it.concurrent`/`test.extend`/`describe.configure`（extract.mjs）——设计未列举，属超设计保守红扩展，报告未申报。
- N7　`serializeBaseline` 写入 `stats`，`loadBaseline` 读回却从不使用（死字段）。
- N8　`loadExemptionsCache` 为模块级可变全局，`judge` 隐式依赖其已赋值（仅 CLI 单次调用安全），非纯函数。
- N9　变异还原「sha256 一致」均为 raw 自报，只读审计无法独立验证（证据诚实性标注，非否定）。
- N10　`extract.mjs` 头注含「受锁文件」但未见 `[locked-change]` 尾注字样（主件有），受锁声明形态不一致。

---

## 审项 A~E 结论摘要

- **A 母本符合度**：§2 抽取域/哨兵、§3 三态/W1 传播/W2 断言单元/W3 each、§5 签名多重集/双向红/激活/only 恒红、§6 豁免 schema、§7 CLI/verify/CI 范围闸——主体落地，偏差集中在 B1/W5/W8/W11 与 C 面盲区。
- **B 宪法红线**：零新依赖（仅用既有 `typescript`/node 内建）✓；行数 344+404≤500✓；UTF-8/LF（`writeFileSync(...,'utf8')` + `'\n'`）✓；受锁声明主体✓（N10）；（W11）TODO/FIXME 字样触碰存疑。
- **C 门自身绕过通道（核心）**：**B1（空基线全绿）为最高危**；W1 merge、W3 正则锚、W4 force-push、W6 别名、W7 哨兵后缀、W9 豁免低摩擦、W10 helper 旁路为次级通道。
- **D 证据诚实性**：stats 179/1623/4979/15/160 与 raw 一致✓；M1-M9 raw 齐全、exit 码与预期吻合✓；但报告 §3 派生数 4819 无出处（N3）、M9 描述漏 NEW 行（N2）、sha 还原为自报（N9）。
- **E 自裁逐条**：10 项中 9 项与 diff 实物一致；自裁⑥未展开删除方向反转（W8）、自裁⑩未解决红线字面（W11）；发现超票面未申报项（N1/N6）。

---

## 统计与总评

- **B：1　W：11　N：10**
- 判定正确性主体成立（九支变异红/绿/exit 码与设计矩阵一致），实现与设计母本总体符合。
- 但门作为防作弊基础设施，存在**信任根未受锁 + 退化基线判绿**的 B 级绕过（B1），以及**范围闸 merge/force-push/尾注自愿**三重弱化（W1/W3/W4），C 面抽取盲区（W6/W7 别名与后缀形态）可静默漏抽用例。

**总评：放行附条件。** 放行条件（对应预裁②收口）须同时满足：
1. `scripts/test-surface.baseline.json` 与 `.exemptions.json` 入 protectedFiles（对接预裁②）；
2. `loadBaseline` 增加基线健全性下限校验（拒绝空/退化 `files`，B1 的实现层半）；
3. `cmdBaseline` 调整为 UNRESOLVABLE 时**先阻断后写盘**（W5）；
4. 范围闸改用 merge-safe 取 diff（`git diff-tree -m`）+ 收紧 `^scripts/check-test-surface` 锚（W1/W3）；
5. 主控裁定 W11 TODO/FIXME 字样与 `check-quality` 扫描域，及自裁⑥（W8）方向反转可否 v1 接受。

（C 面别名/哨兵后缀盲区 W6/W7 建议作为后续票「抽取器语法子集补强」登记，非本包回炉项。）
---
## 附 2 实现报告回炉段（§8）与摘要段

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

---
## 附 3 回炉后全量 diff（863+ 行——含主控面 check-locks/get-protected-files 登记件）

diff --git a/.github/workflows/ci.yml b/.github/workflows/ci.yml
index 17cfa9d899..e56ba5ceb6 100644
--- a/.github/workflows/ci.yml
+++ b/.github/workflows/ci.yml
@@ -112,3 +112,42 @@ jobs:
             fi
           fi
           echo "manifest 无变更或已带尾注"
+
+      # [F-TESTREF-00] 测试重构战役范围闸（设计定稿 §7-W7 终案：逐提交判定）。
+      # 带 [test-refactor] 尾注的提交 diff 路径必须 ⊆ 战役白名单（src/** 一律红）。
+      # 尾注自愿制=设计 W7 语义（W2 门一裁定接受）：测试面另有 locks sha 锁+
+      # [locked-change] guard 独立守护，本范围闸=战役附加层，无强制闭合非缺陷。
+      # package.json 放行论证=依赖变更已被 verify job 的 [dep-change] guard 独立
+      # 拦截，双闸正交。scripts/audits/** 为本仓证据目录实态（设计白名单
+      # docs/audits/** 之外补登——实现票自裁申报在档）。
+      # W3（门一回炉）：白名单正则带结尾锚（禁 scripts/check-test-surface-evil/
+      # 前缀逃逸）。W1（门一回炉）：git diff-tree -m -r 取 merge 双父并集（保守向）。
+      # W4（门一回炉）：BASE 不可达先 fetch origin main 兜底 merge-base，仍失败
+      # 才跳过且 notice 升 warning。
+      - name: 测试重构战役范围闸（[test-refactor]）
+        shell: bash
+        run: |
+          BASE="${{ github.event.pull_request.base.sha || github.event.before }}"
+          if [ -z "$BASE" ] || ! git cat-file -e "$BASE^{commit}" 2>/dev/null; then
+            echo "事件基线不可达，尝试 origin/main 兜底（门一 W4）"
+            git fetch origin main >/dev/null 2>&1 || true
+            BASE=$(git merge-base origin/main HEAD 2>/dev/null || true)
+          fi
+          if [ -z "$BASE" ] || ! git cat-file -e "$BASE^{commit}" 2>/dev/null; then
+            echo "::warning::基线不可用（新分支首推/强推重写且 origin/main 兜底失败），跳过范围闸（门一 W4）"
+            exit 0
+          fi
+          TR_RE='^tests/|^scripts/(check-test-surface(\.mjs)?$|test-surface(\.mjs)?$|test-surface/|test-surface\.(baseline|exemptions)\.json$)|^\.github/workflows/|^package(-lock)?\.json$|^docs/prompts/|^docs/design/|^tickets/registry\.ts$|^locks/manifest\.json$|^AGENTS\.md$|^docs/(methodology|invariants)\.md$|^docs/audits/|^scripts/audits/'
+          BAD=0
+          for C in $(git log --format=%H "$BASE..HEAD"); do
+            if git log -1 --format=%B "$C" | grep -q '\[test-refactor\]'; then
+              OFF=$(git diff-tree --no-commit-id --name-only -m -r "$C" | grep -Ev "$TR_RE" || true)
+              if [ -n "$OFF" ]; then
+                echo "::error::提交 ${C:0:8} 带 [test-refactor] 但 diff 超出战役白名单（src/** 等禁止；门一 W1/W3 修正版）："
+                echo "$OFF"
+                BAD=1
+              fi
+            fi
+          done
+          if [ "$BAD" -eq 0 ]; then echo "范围闸通过（无 [test-refactor] 提交或全部在白名单内）"; fi
+          exit $BAD
diff --git a/AGENTS.md b/AGENTS.md
index a27b257c49..08ab691289 100644
--- a/AGENTS.md
+++ b/AGENTS.md
@@ -126,6 +126,7 @@ development Model Selection+loop-engineering references/06）；**架构与
 4. `npm run verify` 绿 → 报告人类审查 `git diff` → 人类翻 registry 状态 → 提交。
 5. 卡住了就停，报告卡点；**不许删检查、不许放宽断言、不许引入新依赖**。
 6. 测试红了先怀疑自己的实现；确认是测试/契约问题 → 停下报告。
+7. **[test-refactor] 测试重构战役票**：动 tests/** 须双尾注 `[locked-change][test-refactor]`——CI 范围闸机检 diff 路径白名单（src/** 红）、verify 的 `test-surface:check` 机检契约面 C_after ⊇ C_before；有意收紧/删改先取主控裁决再落 `scripts/test-surface.exemptions.json` 豁免（reason+rulingLink）；战役毕基线再生成走 `npm run test-surface:baseline`+全量 diff 审计（设计定稿=docs/design/2026-09-11_f-testref00-design-final.md）。
 
 ### 闲时连续开发（无人值守场，2026-09-03 立制）
 
diff --git a/docs/methodology.md b/docs/methodology.md
index 2175d87e0e..a247cc092a 100644
--- a/docs/methodology.md
+++ b/docs/methodology.md
@@ -153,6 +153,9 @@ commit 长 message。
 > 改空即用，模板偏差=回炉主要来源，勿即兴。
 > 通用模板版=ai-dev-org references/02 §4/07（2026-09-10 doc-align 注记）；
 > 本节为 Synapse 实例（含 ⑤a~⑤i 项目条款）。
+> [test-refactor] 测试重构战役票规约（2026-09-11 F-TESTREF-00 起）：双尾注
+> `[locked-change][test-refactor]`+CI 范围闸+指纹门（C 面 ⊇ 机检），详见
+> docs/design/2026-09-11_f-testref00-design-final.md。
 
 ### 4.1 实现者简报模板（主控→实现者子代理）
 
diff --git a/package.json b/package.json
index faec9dd2b4..ecb71004c6 100644
--- a/package.json
+++ b/package.json
@@ -20,10 +20,13 @@
     "typecheck": "tsc --noEmit -p tsconfig.node.json && tsc --noEmit -p tsconfig.web.json",
     "lint": "eslint .",
     "lint:dup-constants": "node scripts/check-dup-constants.mjs",
+    "test-surface:check": "node scripts/check-test-surface.mjs check",
+    "test-surface:baseline": "node scripts/check-test-surface.mjs baseline",
+    "test-surface:stats": "node scripts/check-test-surface.mjs stats",
     "test": "node scripts/sqlite-abi.mjs use node && vitest run",
     "test:watch": "vitest",
     "test:e2e": "npm run build && playwright test",
-    "verify": "npm run quality:check && npm run tickets:check && npm run locks:check && npm run lint && npm run typecheck && npm run test && npm run build",
+    "verify": "npm run quality:check && npm run test-surface:check && npm run tickets:check && npm run locks:check && npm run lint && npm run typecheck && npm run test && npm run build",
     "quality:check": "node scripts/check-quality.mjs",
     "tickets:check": "node scripts/check-tickets.mjs",
     "locks:generate": "powershell -NoProfile -ExecutionPolicy Bypass -File scripts/lock-protected.ps1 -GenerateOnly",
diff --git a/scripts/check-locks.mjs b/scripts/check-locks.mjs
index e29313aa82..cd0b55ce87 100644
--- a/scripts/check-locks.mjs
+++ b/scripts/check-locks.mjs
@@ -41,6 +41,10 @@ function protectedFiles() {
     // [F-LINT-02] baseline 棘轮防绕过（终裁 §3）：scripts/*.json 不在 walk 自动面，
     // 单文件显式登记——baseline 变更必经 [locked-change] 人类审查位
     join(root, 'scripts', 'dup-constants.baseline.json'),
+    // [F-TESTREF-00] 指纹门信任根入锁（门一 R1 B1）：基线/豁免被清空或篡改
+    // 若不受锁=门对削弱静默放行（sha256 对账拦截）——与 ps1 侧 Get-ProtectedFiles 对齐
+    join(root, 'scripts', 'test-surface.baseline.json'),
+    join(root, 'scripts', 'test-surface.exemptions.json'),
     ...walk(join(root, 'scripts'), (p) => p.endsWith('.mjs') || p.endsWith('.ps1'))
   ].filter((p) => existsSync(p))
   return [...new Set(files)].sort()
diff --git a/scripts/check-test-surface.mjs b/scripts/check-test-surface.mjs
index 5f61b56550..1e3f8b3aa5 100644
--- a/scripts/check-test-surface.mjs
+++ b/scripts/check-test-surface.mjs
@@ -1,14 +1,386 @@
+#!/usr/bin/env node
 /**
- * [F-TESTREF-00] 测试面指纹门——立案骨架（设计链进行中，本件为票面载体）。
+ * [F-TESTREF-00] 测试面指纹门 check-test-surface.mjs（受锁文件）。
  *
  * 职责：抽取 tests/** 契约面（C 面=用例标题多重集+expect 断言规范化文本多重集
- * +guardedDescribe 工单号集+skip/only 标记）与基线比对，C_after ⊇ C_before
- * 多重集判定——「测试不可静默削弱」从纪律升级为机检。设计定稿=
- * docs/design/（F-TESTREF-00 设计链三跳档）；裁决参数=
- * docs/design/2026-09-11_glm-ruling-arch-complexity-and-test-campaign.md §4-2。
- *
- * 本骨架在票收口前不接入 verify 链与 CI——门未上线即不执法。
- * 实现须含三支变异红证（删用例→红/改断言字面量→红/加用例→绿+delta）。
- * 受锁件（诞生即 locks:generate+apply）。[test-refactor][locked-change]
+ * +guardedDescribe 工单号集+skip/only 标记+体内条件 skip 文本多重集）与基线比对，
+ * C_after ⊇ C_before 多重集判定——「测试不可静默削弱」从纪律升级为机检。设计定稿=
+ * docs/design/2026-09-11_f-testref00-design-final.md（裁决参数：W1 传播/W2 断言
+ * 单元/W4 签名计数/B1 skipSites 双向红/B2 SKIP_ADDED/W5 ACTIVATED/W6 哨兵）；
+ * 裁决链=docs/design/2026-09-11_glm-ruling-arch-complexity-and-test-campaign.md §4-2。
+ *
+ * 抽取器 lib=scripts/test-surface/extract.mjs（两处实现自裁见该件头注：
+ * skipSites 文件级多重集、哨兵 AST 形态判定）。
+ *
+ * exit code：0=通过（delta 绿）/ 1=契约违背或 UNRESOLVABLE / 2=基线缺失或损坏
+ * （硬阻断禁自愈——显式执行 `npm run test-surface:baseline` 并全量审计 diff）/
+ * 3=豁免清单 schema 非法。baseline 子命令仅显式调用（本脚本无任何红了重写分支）。
+ *
+ * 用例闸=指纹闸蕴含（caseCount 单调不减是 ⊇ 的推论，delta 汇总行显式打印计数）。
+ * [test-refactor][locked-change]
  */
-process.exit(0)
+import { existsSync, readFileSync, writeFileSync } from 'node:fs'
+import { join } from 'node:path'
+import { pathToFileURL } from 'node:url'
+import { extractAll, statsOf } from './test-surface/extract.mjs'
+
+const BASELINE_PATH = 'scripts/test-surface.baseline.json'
+const EXEMPTIONS_PATH = 'scripts/test-surface.exemptions.json'
+
+function die(code, msg) {
+  console.error(msg)
+  process.exit(code)
+}
+
+function loadBaseline(root) {
+  const p = join(root, BASELINE_PATH)
+  if (!existsSync(p)) return { missing: true }
+  try {
+    const parsed = JSON.parse(readFileSync(p, 'utf8').replace(/^\uFEFF/, ''))
+    if (parsed?.version !== 1 || parsed?.files === null || typeof parsed.files !== 'object' || Array.isArray(parsed.files)) {
+      return { corrupt: true }
+    }
+    // 基线健全性下限（门一 B1b+N7）：空/退化 files 使 C_after ⊇ ∅ 恒真——按
+    // corrupt（exit 2 硬阻断）处理；stats 字段同时用活（死字段 N7 收口）。
+    const fileCount = Object.keys(parsed.files).length
+    if (fileCount < 1 || !parsed.stats || typeof parsed.stats !== 'object' || parsed.stats.fileCount !== fileCount || !(parsed.stats.caseCount >= 1)) {
+      return { corrupt: true }
+    }
+    return { files: parsed.files, stats: parsed.stats }
+  } catch {
+    return { corrupt: true }
+  }
+}
+
+/** 豁免清单加载+schema 校验（Kimi §6：reason/rulingLink 非空必填；匹配键≥1） */
+function loadExemptions(root) {
+  const p = join(root, EXEMPTIONS_PATH)
+  const empty = { entries: [] }
+  if (!existsSync(p)) return empty
+  let parsed
+  try {
+    parsed = JSON.parse(readFileSync(p, 'utf8').replace(/^\uFEFF/, ''))
+  } catch (e) {
+    die(3, `[test-surface] 豁免清单损坏：${EXEMPTIONS_PATH} JSON 解析失败（${e.message}）—— schema 非法即红`)
+  }
+  if (parsed?.version !== 1 || !Array.isArray(parsed?.entries)) {
+    die(3, `[test-surface] 豁免清单 schema 非法：须为 {version:1, entries:[...]}（exit 3）`)
+  }
+  for (const e of parsed.entries) {
+    const hasMatcher = e.caseTitle !== undefined || e.assertionText !== undefined || e.skipSiteText !== undefined
+    if (typeof e.file !== 'string' || e.file === '' || !hasMatcher || typeof e.reason !== 'string' || e.reason === '' || typeof e.rulingLink !== 'string' || e.rulingLink === '') {
+      die(3, `[test-surface] 豁免条目 schema 非法（须含 file+匹配键 caseTitle/assertionText/skipSiteText 至少其一+非空 reason+rulingLink）：${JSON.stringify(e)}`)
+    }
+  }
+  return { entries: parsed.entries }
+}
+
+function caseSignature(c) {
+  return JSON.stringify({ a: [...c.assertions].sort(), m: [...c.markers].sort() })
+}
+
+function countMultiset(items) {
+  const m = new Map()
+  for (const it of items) m.set(it, (m.get(it) ?? 0) + 1)
+  return m
+}
+
+/** 豁免匹配（N2 从宽：file 精确+匹配键精确；同 title 重复用例=已知限制，条目宜附细键） */
+function exemptionHits(exemptions, kind, file, payload) {
+  const hits = []
+  for (const e of exemptions.entries) {
+    if (e.file !== file) continue
+    if (kind === 'case' && e.caseTitle === payload.title && (e.assertionText === undefined || payload.assertions.includes(e.assertionText))) hits.push(e)
+    if (kind === 'assert' && e.assertionText === payload.assertionText && (e.caseTitle === undefined || e.caseTitle === payload.title)) hits.push(e)
+    if (kind === 'skipsite' && e.skipSiteText === payload.text) hits.push(e)
+  }
+  return hits
+}
+
+function fmtRelLine(file, line) {
+  return line === undefined ? file : `${file}:${line}`
+}
+
+/** 主判定：返回 { failures:[], deltas:[], exemptHits:Set, statsLine } */
+function judge(baseFiles, cur) {
+  const failures = []
+  const deltas = []
+  const exemptHitKeys = new Set()
+  const paths = [...new Set([...Object.keys(baseFiles), ...cur.keys()])].sort()
+  let baseCaseTotal = 0
+  let curCaseTotal = 0
+  let baseAssertTotal = 0
+  let curAssertTotal = 0
+  let baseSkipTotal = 0
+  let curSkipTotal = 0
+
+  for (const path of paths) {
+    const b = baseFiles[path]
+    const c = cur.get(path)
+    if (b && !c) {
+      failures.push({ kind: 'FILE_MISSING', path, line: undefined, text: path })
+      baseCaseTotal += b.cases.length
+      baseSkipTotal += b.conditionalSkipSites.length + b.hardSkipSites.length
+      for (const cs of b.cases) baseAssertTotal += cs.assertions.length
+      continue
+    }
+    if (!b && c) {
+      deltas.push(`NEW_FILE ${path}（${c.cases.length} 用例）`)
+      curCaseTotal += c.cases.length
+      curSkipTotal += c.conditionalSkipSites.length + c.hardSkipSites.length
+      for (const cs of c.cases) curAssertTotal += cs.assertions.length
+      // 新文件体内 skip 双桶亦=「新增」→红（B1 语义覆盖新文件场景——回炉轮
+      // 补面，保守向申报；豁免通道同款）
+      for (const text of c.conditionalSkipSites) {
+        if (exemptionHits(loadExemptionsCache, 'skipsite', path, { text }).length === 0) {
+          failures.push({ kind: 'SKIPSITE_ADDED', path, line: undefined, text })
+        }
+      }
+      for (const text of c.hardSkipSites) {
+        if (exemptionHits(loadExemptionsCache, 'skipsite', path, { text }).length === 0) {
+          failures.push({ kind: 'SKIPSITE_ADDED', path, line: undefined, text })
+        }
+      }
+      for (const cs of c.cases) {
+        if (cs.markers.includes('skip') && exemptionHits(loadExemptionsCache, 'case', path, cs).length === 0) {
+          failures.push({ kind: 'SKIP_ADDED', path, line: cs.line, text: cs.title })
+        } else {
+          deltas.push(`NEW ${path} › ${cs.title} (line ${cs.line}, ${cs.assertions.length} assertions)`)
+        }
+      }
+      continue
+    }
+    // 两态比对
+    baseCaseTotal += b.cases.length
+    curCaseTotal += c.cases.length
+    baseSkipTotal += b.conditionalSkipSites.length + b.hardSkipSites.length
+    curSkipTotal += c.conditionalSkipSites.length + c.hardSkipSites.length
+    for (const cs of b.cases) baseAssertTotal += cs.assertions.length
+    for (const cs of c.cases) curAssertTotal += cs.assertions.length
+
+    // ticketIds：基线 ⊄ 当前 → 红
+    const curTickets = new Set(c.ticketIds)
+    for (const id of b.ticketIds) {
+      if (!curTickets.has(id)) failures.push({ kind: 'TICKETS_MISSING', path, line: undefined, text: id })
+    }
+
+    // only（含 W1 传播）恒红
+    for (const cs of c.cases) {
+      if (cs.markers.includes('only')) failures.push({ kind: 'ONLY_FORBIDDEN', path, line: cs.line, text: cs.title })
+    }
+
+    // conditionalSkipSites：文件级多重集双向红（设计 B1——非字面量条件形态）
+    const bCond = countMultiset(b.conditionalSkipSites)
+    const cCond = countMultiset(c.conditionalSkipSites)
+    for (const [text, n] of bCond) {
+      const curN = cCond.get(text) ?? 0
+      for (let i = 0; i < n - curN; i++) {
+        const hit = exemptionHits(loadExemptionsCache, 'skipsite', path, { text })
+        if (hit.length > 0) exemptHitKeys.add(`skipsite:${path}:${text}`)
+        else failures.push({ kind: 'SKIPSITE_REMOVED', path, line: undefined, text })
+      }
+    }
+    for (const [text, n] of cCond) {
+      const baseN = bCond.get(text) ?? 0
+      for (let i = 0; i < n - baseN; i++) {
+        const hit = exemptionHits(loadExemptionsCache, 'skipsite', path, { text })
+        if (hit.length > 0) exemptHitKeys.add(`skipsite:${path}:${text}`)
+        else failures.push({ kind: 'SKIPSITE_ADDED', path, line: undefined, text })
+      }
+    }
+
+    // hardSkipSites（门一 W8 终案）：新增=红（等价「新增 skip」）；删除=激活
+    // 绿+delta（与 markers 激活语义一致）；文本相同两桶间不互抵（桶隔离判定）。
+    const bHard = countMultiset(b.hardSkipSites)
+    const cHard = countMultiset(c.hardSkipSites)
+    for (const [text, n] of bHard) {
+      const curN = cHard.get(text) ?? 0
+      for (let i = 0; i < n - curN; i++) {
+        const hit = exemptionHits(loadExemptionsCache, 'skipsite', path, { text })
+        if (hit.length > 0) exemptHitKeys.add(`skipsite:${path}:${text}`)
+        else deltas.push(`ACTIVATED ${path} 「${text}」（hardSkipSite 删除）`)
+      }
+    }
+    for (const [text, n] of cHard) {
+      const baseN = bHard.get(text) ?? 0
+      for (let i = 0; i < n - baseN; i++) {
+        const hit = exemptionHits(loadExemptionsCache, 'skipsite', path, { text })
+        if (hit.length > 0) exemptHitKeys.add(`skipsite:${path}:${text}`)
+        else failures.push({ kind: 'SKIPSITE_ADDED', path, line: undefined, text })
+      }
+    }
+
+    // 用例按 key 分组 → 签名多重集计数 ⊆ 判定（W4）
+    const bGroups = new Map()
+    for (const cs of b.cases) {
+      if (!bGroups.has(cs.key)) bGroups.set(cs.key, [])
+      bGroups.get(cs.key).push(cs)
+    }
+    const cGroups = new Map()
+    for (const cs of c.cases) {
+      if (!cGroups.has(cs.key)) cGroups.set(cs.key, [])
+      cGroups.get(cs.key).push(cs)
+    }
+
+    for (const [key, bCases] of bGroups) {
+      const cCases = cGroups.get(key) ?? []
+      const curSigs = countMultiset(cCases.map(caseSignature))
+      for (const bcs of bCases) {
+        const sig = caseSignature(bcs)
+        if ((curSigs.get(sig) ?? 0) > 0) {
+          curSigs.set(sig, curSigs.get(sig) - 1)
+          continue
+        }
+        // W5：skip→激活（绿+delta）
+        if (bcs.markers.includes('skip')) {
+          const activatedSig = JSON.stringify({ a: [...bcs.assertions].sort(), m: bcs.markers.filter((m) => m !== 'skip').sort() })
+          if ((curSigs.get(activatedSig) ?? 0) > 0) {
+            curSigs.set(activatedSig, curSigs.get(activatedSig) - 1)
+            deltas.push(`ACTIVATED ${path} › ${bcs.title} (line ${bcs.line})`)
+            continue
+          }
+        }
+        // 基线签名无配对 → MISSING_CASE（先试豁免，再 MISSING_ASSERT 细化）
+        const hit = exemptionHits(loadExemptionsCache, 'case', path, bcs)
+        if (hit.length > 0) {
+          exemptHitKeys.add(`case:${path}:${bcs.title}`)
+          continue
+        }
+        // MISSING_ASSERT 细化：当前同 key 存在 markers 同、断言为其子集的签名
+        const sigObj = JSON.parse(sig)
+        let detailed = false
+        for (const ccs of cCases) {
+          if (JSON.stringify([...ccs.markers].sort()) !== JSON.stringify(sigObj.m)) continue
+          const curA = countMultiset(ccs.assertions)
+          const missing = []
+          for (const a of bcs.assertions) {
+            const n = curA.get(a) ?? 0
+            if (n > 0) curA.set(a, n - 1)
+            else missing.push(a)
+          }
+          if (missing.length > 0 && missing.length < bcs.assertions.length) {
+            for (const a of missing) {
+              const ahit = exemptionHits(loadExemptionsCache, 'assert', path, { assertionText: a, title: bcs.title })
+              if (ahit.length > 0) exemptHitKeys.add(`assert:${path}:${a}`)
+              else failures.push({ kind: 'MISSING_ASSERT', path, line: bcs.line, text: a })
+            }
+            detailed = true
+            break
+          }
+        }
+        if (!detailed) failures.push({ kind: 'MISSING_CASE', path, line: bcs.line, text: bcs.title })
+      }
+    }
+
+    // 当前超出基线的签名 → NEW（带 skip → SKIP_ADDED，B2 含新用例形态）
+    for (const [key, cCases] of cGroups) {
+      void key
+      const bCases = bGroups.get(key) ?? []
+      const bNeed = countMultiset(bCases.map(caseSignature))
+      // skip 签名的激活回填位：基线 skip 版可消费当前无 skip 同断言签名（W5 已在上
+      // 半场消费并打 ACTIVATED——此处补记可激活位，防其落入 NEW/双报）
+      const activatable = new Map()
+      for (const bcs of bCases) {
+        if (!bcs.markers.includes('skip')) continue
+        const s = JSON.stringify({ a: [...bcs.assertions].sort(), m: bcs.markers.filter((m) => m !== 'skip').sort() })
+        activatable.set(s, (activatable.get(s) ?? 0) + 1)
+      }
+      for (const cs of cCases) {
+        const sig = caseSignature(cs)
+        if ((bNeed.get(sig) ?? 0) > 0) {
+          bNeed.set(sig, bNeed.get(sig) - 1)
+          continue
+        }
+        if ((activatable.get(sig) ?? 0) > 0) {
+          activatable.set(sig, activatable.get(sig) - 1)
+          continue
+        }
+        if (cs.markers.includes('skip')) {
+          const hit = exemptionHits(loadExemptionsCache, 'case', path, cs)
+          if (hit.length > 0) exemptHitKeys.add(`case:${path}:${cs.title}`)
+          else failures.push({ kind: 'SKIP_ADDED', path, line: cs.line, text: cs.title })
+          continue
+        }
+        deltas.push(`NEW ${path} › ${cs.title} (line ${cs.line}, ${cs.assertions.length} assertions)`)
+      }
+    }
+  }
+
+  const statsLine = `files: ${Object.keys(baseFiles).length} base / ${cur.size} cur | cases: ${baseCaseTotal} base / ${curCaseTotal} cur` +
+    ` | assertions: ${baseAssertTotal} base / ${curAssertTotal} cur | skipSites: ${baseSkipTotal} base / ${curSkipTotal} cur`
+  return { failures, deltas, exemptHitKeys, statsLine }
+}
+
+let loadExemptionsCache = { entries: [] }
+
+function serializeBaseline(surfaces, extraStats) {
+  const files = {}
+  for (const [p, s] of [...surfaces.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
+    files[p] = {
+      ticketIds: [...s.ticketIds].sort(),
+      conditionalSkipSites: s.conditionalSkipSites,
+      hardSkipSites: s.hardSkipSites,
+      cases: s.cases.map((c) => ({
+        key: c.key,
+        describePath: c.describePath,
+        title: c.title,
+        markers: c.markers,
+        line: c.line,
+        assertions: c.assertions
+      }))
+    }
+  }
+  return JSON.stringify({ version: 1, files, stats: extraStats }, null, 2) + '\n'
+}
+
+function cmdStats(root) {
+  const { surfaces, unresolvable } = extractAll(root)
+  const stats = statsOf(surfaces, unresolvable)
+  for (const u of unresolvable) console.error(`UNRESOLVABLE ${u.file}:${u.line} ${u.reason}`)
+  console.log(`[test-surface] stats ${JSON.stringify(stats)}`)
+  if (unresolvable.length > 0) die(1, `[test-surface] 抽取含 ${unresolvable.length} 处不可静态判定（exit 1）`)
+}
+
+function cmdBaseline(root) {
+  const { surfaces, unresolvable } = extractAll(root)
+  for (const u of unresolvable) console.error(`UNRESOLVABLE ${u.file}:${u.line} ${u.reason}`)
+  const stats = statsOf(surfaces, unresolvable)
+  // W5（门一回炉）：UNRESOLVABLE 非空先阻断后写盘——禁写脏基线（surfaces 缺
+  // 失该用例却落盘，后续 check 复用即静默脏基线）
+  if (unresolvable.length > 0) die(1, `[test-surface] 基线生成期含 ${unresolvable.length} 处不可静态判定（exit 1，基线未写入——先改写为静态形态或裁决豁免）`)
+  writeFileSync(join(root, BASELINE_PATH), serializeBaseline(surfaces, stats), 'utf8')
+  console.log(`[test-surface] baseline 已写入 ${BASELINE_PATH}`)
+  console.log(`[test-surface] stats ${JSON.stringify(stats)}`)
+}
+
+function cmdCheck(root) {
+  const bl = loadBaseline(root)
+  if (bl.missing || bl.corrupt) {
+    die(2, `[test-surface] 基线${bl.missing ? '缺失' : '损坏'}：${BASELINE_PATH}（exit 2 硬阻断禁自愈）——显式执行 \`npm run test-surface:baseline\` 再生成并对基线 diff 做全量审计`)
+  }
+  loadExemptionsCache = loadExemptions(root)
+  const { surfaces, unresolvable } = extractAll(root)
+  for (const u of unresolvable) console.error(`UNRESOLVABLE ${u.file}:${u.line} ${u.reason}`)
+  const { failures, deltas, exemptHitKeys, statsLine } = judge(bl.files, surfaces)
+  console.log(`[test-surface] ${statsLine}`)
+  for (const d of deltas) console.log(`[test-surface] ${d}`)
+  console.log(`[test-surface] exemptions entries: ${loadExemptionsCache.entries.length} hits: ${exemptHitKeys.size} stale: ${loadExemptionsCache.entries.length - exemptHitKeys.size}`)
+  if (unresolvable.length > 0) {
+    console.error(`[test-surface] FAIL 抽取含 ${unresolvable.length} 处不可静态判定`)
+    die(1, '[test-surface] 检查未通过：UNRESOLVABLE（hint: 动态形态改写为静态，或走 scripts/test-surface.exemptions.json 豁免通道）')
+  }
+  if (failures.length > 0) {
+    for (const f of failures) console.error(`[test-surface] FAIL ${f.kind} ${fmtRelLine(f.path, f.line)} 「${f.text}」`)
+    die(1, `[test-surface] 检查未通过：${failures.length} 处契约违背（hint: 若为有意收紧/删改，先取主控裁决，再落 scripts/test-surface.exemptions.json 豁免通道 reason+rulingLink）`)
+  }
+  console.log('[test-surface] 检查通过：C_after ⊇ C_before（指纹门绿）')
+}
+
+if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
+  const root = process.cwd()
+  const cmd = process.argv[2] ?? 'check'
+  if (cmd === 'stats') cmdStats(root)
+  else if (cmd === 'baseline') cmdBaseline(root)
+  else if (cmd === 'check') cmdCheck(root)
+  else die(1, `[test-surface] 未知子命令：${cmd}（可用：check（默认）/ baseline / stats）`)
+}
diff --git a/scripts/get-protected-files.ps1 b/scripts/get-protected-files.ps1
index a6d45c50ff..f6a23c43d1 100644
--- a/scripts/get-protected-files.ps1
+++ b/scripts/get-protected-files.ps1
@@ -16,7 +16,9 @@ function Get-ProtectedFiles {
   foreach ($cfg in @('docs/invariants.md', 'vitest.config.ts', 'eslint.config.js', '.github/workflows/ci.yml',
       'playwright.config.ts', 'electron.vite.config.ts',
       'tsconfig.json', 'tsconfig.node.json', 'tsconfig.web.json',
-      'scripts/dup-constants.baseline.json')) {
+      'scripts/dup-constants.baseline.json',
+      'scripts/test-surface.baseline.json',
+      'scripts/test-surface.exemptions.json')) {
     $p = Join-Path $root $cfg
     if (Test-Path $p) { $files += Get-Item $p }
   }
diff --git a/scripts/test-surface.exemptions.json b/scripts/test-surface.exemptions.json
new file mode 100644
index 0000000000..7f19696e7b
--- /dev/null
+++ b/scripts/test-surface.exemptions.json
@@ -0,0 +1,4 @@
+{
+  "version": 1,
+  "entries": []
+}
diff --git a/scripts/test-surface/extract.mjs b/scripts/test-surface/extract.mjs
new file mode 100644
index 0000000000..f6eeb12dad
--- /dev/null
+++ b/scripts/test-surface/extract.mjs
@@ -0,0 +1,477 @@
+#!/usr/bin/env node
+/**
+ * scripts/test-surface/extract.mjs —— [F-TESTREF-00] 测试面抽取器 lib（受锁文件；
+ * [locked-change] 声明面随主件——门一 N10 补齐，受锁变更尾注与主件同携带）。
+ *
+ * 职责：解析 tests/** 白名单用例文件（*.test.ts / *.test.tsx / *.spec.ts /
+ * *.spec.tsx——门一 W7 扩）的契约面（C 面）：用例（describe 路径+标题+markers+
+ * expect 断言规范化文本多重集）+ guardedDescribe 工单号集 + 体内条件 skip 规范化
+ * 文本多重集。设计母本=docs/design/2026-09-11_f-testref00-design-final.md
+ * （W6/W1/W2/W3/B1 裁决参数）。与设计字面的实现自裁（均有 DoD 硬项支撑，
+ * 详见主件头注与实现报告自裁申报段）：
+ *  ① skipSites 挂 FileSurface（文件级多重集）而非 CaseEntry——存量 15 处
+ *    依赖门惯用法中 14 处物理位于模块级 helper（skipIfPending）体内、1 处在
+ *    describe 体顶层，用例级归因需调用内联且会按调用点数放大（17≠15）；
+ *    文件级计数在「新增依赖门调用/删调用」场景与用例级等价（计数增减双向红），
+ *    删整个用例由 MISSING_CASE 兜底，无漏报。
+ *  ② 漏扫哨兵用 AST 用例形态判定而非纯文本正则——guard.ts 的
+ *    describe(label, fn)（双标识符参=转发调用）按设计正则会误伤，与 DoD
+ *    「stats 全量 UNRESOLVABLE=0」冲突；AST 判定（callee 纯标识符
+ *    it/test/describe 或带后缀属性访问形态，且首参字符串字面量或任一参为
+ *    函数字面量——门一 W7 扩）防漏性等价（真用例文件必含函数字面量参数），
+ *    误报面更小（转发调用不命中）。
+ * skip 双桶（门一 W8 终案）：conditionalSkipSites（非字面量条件形态，双向红）
+ * 与 hardSkipSites（0 参/字面量真值形态——新增红、删除=激活绿 delta）。
+ * import 别名检测（门一 W6）：vitest/@playwright/test 的 it/test/describe 说明符
+ * 别名或伪装本地名、namespace import → UNRESOLVABLE（用例 API 不可静态判定）。
+ * it.each（W3 终案）：const 单跳解析（全文件唯一 const+ArrayLiteral 声明，
+ * 标识符存在赋值/更新/多处声明即保守红）；字面量消费位=真实值，非静态位=
+ * ⟨nse:源文本空白归一⟩（css→wsCss=源文本变=键变=红）；行计数入多重集。
+ * expect 断言（W2 终案）：单元=最外层 expect 调用链 getText+空白归一，
+ * 全记不去重（同链去重除外——链内嵌 expect 爬到同一链顶自然合并）；
+ * 收集域=用例回调体子树（含体内嵌套声明函数——模块级 helper 不计）。
+ */
+import { readFileSync, readdirSync, statSync } from 'node:fs'
+import { join } from 'node:path'
+import ts from 'typescript'
+
+const WHITELIST_RE = /\.(test\.ts|test\.tsx|spec\.ts|spec\.tsx)$/
+const TS_LIKE_RE = /\.(ts|tsx)$/
+const TEST_API_SOURCE_RE = /^['"](vitest|@playwright\/test)['"]$/
+const THREE_API = new Set(['it', 'test', 'describe'])
+const DESCRIBE_PLAIN = new Set(['describe', 'test.describe'])
+const DESCRIBE_SKIP = new Set(['describe.skip', 'test.describe.skip', 'xdescribe'])
+const DESCRIBE_ONLY = new Set(['describe.only', 'test.describe.only'])
+const CASE_PLAIN = new Set(['it', 'test'])
+const CASE_SKIP = new Set(['it.skip', 'test.skip', 'xit', 'xtest'])
+const CASE_ONLY = new Set(['it.only', 'test.only'])
+// CASE_TODO/CASE_FIXME 为 vitest API（it.todo/it.fixme）建模命名，非占位标记
+// （门一 W11 主控裁定接受——check-quality 扫描域=src+tests 不含 scripts，verify 绿实证）
+const CASE_TODO = new Set(['it.todo', 'test.todo'])
+const CASE_FIXME = new Set(['it.fixme', 'test.fixme'])
+const CONSERVATIVE_REDS = new Set([
+  'it.skipIf', 'it.runIf', 'test.skipIf', 'test.runIf',
+  'it.concurrent', 'test.concurrent', 'test.extend',
+  'describe.configure', 'test.describe.configure'
+])
+
+export function walkFiles(dir, filter, acc = []) {
+  for (const name of readdirSync(dir)) {
+    const p = join(dir, name)
+    const st = statSync(p)
+    if (st.isDirectory()) walkFiles(p, filter, acc)
+    else if (filter(p)) acc.push(p)
+  }
+  return acc
+}
+
+function calleeText(node) {
+  if (ts.isIdentifier(node)) return node.text
+  if (ts.isPropertyAccessExpression(node)) {
+    const base = calleeText(node.expression)
+    return base === null ? null : `${base}.${node.name.text}`
+  }
+  return null
+}
+
+function staticTitleOf(expr) {
+  if (ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr)) return expr.text
+  return null
+}
+
+function isFunctionExpr(e) {
+  return ts.isArrowFunction(e) || ts.isFunctionExpression(e)
+}
+
+/** 字面量静态值（number 保留源文本形态——printf %s 需原样字符串） */
+function literalValueOf(e) {
+  let n = e
+  while (ts.isParenthesizedExpression(n)) n = n.expression
+  if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) return { v: n.text, num: false }
+  if (ts.isNumericLiteral(n) && !/n$/i.test(n.text)) return { v: n.text, num: true }
+  if (n.kind === ts.SyntaxKind.TrueKeyword) return { v: true, num: false }
+  if (n.kind === ts.SyntaxKind.FalseKeyword) return { v: false, num: false }
+  if (n.kind === ts.SyntaxKind.NullKeyword) return { v: null, num: false }
+  return null
+}
+
+/** 字面量真值判定（B1 三态：字面量 truthy=等价声明 skip） */
+function isStaticTruthy(expr) {
+  const lit = literalValueOf(expr)
+  if (!lit) return null
+  if (lit.num) return Number(lit.v) !== 0
+  if (typeof lit.v === 'string') return lit.v !== ''
+  return Boolean(lit.v)
+}
+
+export function normalizeWs(text) {
+  return text.replace(/\s+/g, ' ').trim()
+}
+
+/** expect 链顶：沿 PropertyAccess/Call 链上爬（链内嵌 expect 合并到同一链顶） */
+function chainTop(node) {
+  let n = node
+  while (n.parent && (ts.isPropertyAccessExpression(n.parent) || ts.isCallExpression(n.parent))) n = n.parent
+  return n
+}
+
+function lineOf(node, sf) {
+  return sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1
+}
+
+function mergeMarkers(stackFrames, own) {
+  const all = new Set(own)
+  for (const f of stackFrames) for (const m of f.markers) all.add(m)
+  return [...all].sort()
+}
+
+/** printf 标题展开（Kimi §3.4 子集：%%/%s/%d/%i/%j/%#；$#；子集外保守红） */
+function printfExpand(template, cells, index) {
+  let out = ''
+  let ai = 0
+  const next = () => {
+    if (ai >= cells.length) return { over: true }
+    return { cell: cells[ai++] }
+  }
+  const fmt = (t, cell) => (cell.nse !== undefined ? `⟨nse:${cell.nse}⟩` : t === 'j' ? JSON.stringify(cell.lit.v) : String(cell.lit.v))
+  for (let i = 0; i < template.length; i++) {
+    const c = template[i]
+    if (c === '$') {
+      const d = template[i + 1]
+      if (d === '#') { out += String(index); i++; continue }
+      if (d !== undefined && /[A-Za-z_{]/.test(d)) return { bad: `$${d} 形态不在 v1 子集` }
+      out += c
+      continue
+    }
+    if (c !== '%') { out += c; continue }
+    const t = template[++i]
+    if (t === undefined) { out += '%'; continue }
+    if (t === '%') { out += '%'; continue }
+    if (t === '#') { out += String(index); continue }
+    if (t === 's' || t === 'd' || t === 'i' || t === 'j') {
+      const got = next()
+      if (got.over) return { bad: '消费位超出展开行元素数' }
+      out += fmt(t, got.cell)
+      continue
+    }
+    return { bad: `%${t} 不在 v1 printf 子集` }
+  }
+  return { title: out }
+}
+
+/**
+ * import 别名检测（门一 W6）：vitest/@playwright/test 源的 it/test/describe
+ * 说明符被别名（imported≠local）或伪装本地名（local∈三词但 imported∉）→
+ * UNRESOLVABLE；namespace import（v.it() 形态 calleeText 不匹配白名单）同红
+ * （超裁决保守向，回炉申报）。存量全部直名 import（预检 grep 实证）。
+ */
+function importAliasCheck(sf, relPath, unresolvable) {
+  for (const stmt of sf.statements) {
+    if (!ts.isImportDeclaration(stmt) || !ts.isStringLiteral(stmt.moduleSpecifier)) continue
+    if (!TEST_API_SOURCE_RE.test(stmt.moduleSpecifier.getText(sf))) continue
+    const clause = stmt.importClause
+    if (!clause) continue
+    const line = lineOf(stmt, sf)
+    if (clause.name) {
+      // default import：imported='default'——local∈三词即伪装形态
+      if (THREE_API.has(clause.name.text)) {
+        unresolvable.push({ file: relPath, line, reason: `用例 API 别名 import 不可静态判定（default import as ${clause.name.text}）` })
+      }
+    }
+    const bindings = clause.namedBindings
+    if (!bindings) continue
+    if (ts.isNamespaceImport(bindings)) {
+      unresolvable.push({ file: relPath, line, reason: `用例 API 别名 import 不可静态判定（namespace import * as ${bindings.name.text}——${bindings.name.text}.it() 形态白名单外）` })
+      continue
+    }
+    if (ts.isNamedImports(bindings)) {
+      for (const spec of bindings.elements) {
+        if (!ts.isIdentifier(spec.name)) continue
+        const imported = spec.propertyName && ts.isIdentifier(spec.propertyName) ? spec.propertyName.text : spec.name.text
+        const local = spec.name.text
+        if (THREE_API.has(imported) && local !== imported) {
+          unresolvable.push({ file: relPath, line, reason: `用例 API 别名 import 不可静态判定（${imported} as ${local}）` })
+        } else if (THREE_API.has(local) && !THREE_API.has(imported)) {
+          unresolvable.push({ file: relPath, line, reason: `用例 API 别名 import 不可静态判定（${imported} as ${local}——伪装本地名）` })
+        }
+      }
+    }
+  }
+}
+
+/**
+ * 单文件抽取（白名单域）。unresolvable 收集 {file,line,reason}（不中断——
+ * 全量明细一次输出）。
+ */
+function extractFile(absPath, relPath, unresolvable) {
+  const text = readFileSync(absPath, 'utf8')
+  const kind = relPath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
+  const sf = ts.createSourceFile(absPath, text, ts.ScriptTarget.Latest, true, kind)
+  const red = (node, reason) => unresolvable.push({ file: relPath, line: lineOf(node, sf), reason })
+  importAliasCheck(sf, relPath, unresolvable)
+
+  // 预扫描：const X = ArrayLiteral 声明表 + 标识符赋值/更新表（单跳解析防护）
+  const constArrays = new Map()
+  const mutatedIds = new Set()
+  function preScan(node) {
+    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer && ts.isArrayLiteralExpression(node.initializer)) {
+      const list = node.parent
+      if ((list.flags & ts.NodeFlags.Const) !== 0) {
+        if (!constArrays.has(node.name.text)) constArrays.set(node.name.text, [])
+        constArrays.get(node.name.text).push(node.initializer)
+      }
+    }
+    if (ts.isBinaryExpression(node) && ts.isIdentifier(node.left) && (node.operatorToken.kind === ts.SyntaxKind.EqualsToken || node.operatorToken.kind >= ts.SyntaxKind.FirstCompoundAssignment)) {
+      mutatedIds.add(node.left.text)
+    }
+    if ((ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) && (node.operator === ts.SyntaxKind.PlusPlusToken || node.operator === ts.SyntaxKind.MinusMinusToken) && ts.isIdentifier(node.operand)) mutatedIds.add(node.operand.text)
+    ts.forEachChild(node, preScan)
+  }
+  preScan(sf)
+
+  const surface = { ticketIds: new Set(), conditionalSkipSites: [], hardSkipSites: [], cases: [] }
+  const stack = [{ title: null, markers: [] }]
+  let currentCase = null
+
+  function resolveEachRows(srcNode) {
+    if (ts.isArrayLiteralExpression(srcNode)) return { rows: srcNode.elements.map(resolveElement) }
+    if (ts.isIdentifier(srcNode)) {
+      const name = srcNode.text
+      if (mutatedIds.has(name)) return { bad: `each 数组标识符 ${name} 存在赋值/更新` }
+      const decls = constArrays.get(name)
+      if (!decls || decls.length !== 1) return { bad: `each 数组标识符 ${name} 无唯一 const+ArrayLiteral 声明` }
+      return { rows: decls[0].elements.map(resolveElement) }
+    }
+    return { bad: 'each 第 1 参非 ArrayLiteral 或可解析 const 标识符' }
+  }
+  function resolveElement(e) {
+    const lit = literalValueOf(e)
+    if (lit) return { lit }
+    if (ts.isArrayLiteralExpression(e)) {
+      return { tuple: e.elements.map((el) => {
+        const inner = literalValueOf(el)
+        return inner ? { lit: inner } : { nse: normalizeWs(el.getText(sf)) }
+      }) }
+    }
+    return null
+  }
+  function cellsOf(row) {
+    if (row.tuple !== undefined) return row.tuple
+    return [row]
+  }
+
+  function collectCaseBody(entry, callback) {
+    const prev = currentCase
+    currentCase = entry
+    entry._chainSet = new Set()
+    ts.forEachChild(callback, visit)
+    entry.assertions = [...entry._chainSet].map((n) => normalizeWs(n.getText(sf)))
+    delete entry._chainSet
+    currentCase = prev
+  }
+
+  function visit(node) {
+    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'expect' && currentCase !== null) {
+      currentCase._chainSet.add(chainTop(node))
+    }
+    if (ts.isCallExpression(node)) {
+      const ct = calleeText(node.expression)
+      if (ct === 'guardedDescribe') {
+        const idArg = node.arguments[0]
+        const titleArg = node.arguments[1]
+        const ticketId = idArg && ts.isStringLiteral(idArg) ? idArg.text : null
+        const title = titleArg ? staticTitleOf(titleArg) : null
+        if (ticketId === null || title === null) {
+          red(node, 'guardedDescribe 工单号/标题非字符串字面量')
+        } else {
+          surface.ticketIds.add(ticketId)
+          stack.push({ title, markers: stack[stack.length - 1].markers })
+          ts.forEachChild(node, visit)
+          stack.pop()
+          return
+        }
+      } else if (DESCRIBE_PLAIN.has(ct) || DESCRIBE_SKIP.has(ct) || DESCRIBE_ONLY.has(ct)) {
+        const own = DESCRIBE_SKIP.has(ct) ? ['skip'] : DESCRIBE_ONLY.has(ct) ? ['only'] : []
+        const titleArg = node.arguments[0]
+        const title = titleArg ? staticTitleOf(titleArg) : null
+        if (title === null) {
+          red(node, 'describe 标题非字符串字面量（动态标题不可静态判定）')
+        } else {
+          const parentMarkers = stack[stack.length - 1].markers
+          stack.push({ title, markers: [...new Set([...parentMarkers, ...own])] })
+          ts.forEachChild(node, visit)
+          stack.pop()
+          return
+        }
+      } else if (ts.isCallExpression(node.expression) && ct === null) {
+        // 潜在 each 形态：外层被调者本身是调用（it.each(ARR)(title, fn)）——
+        // calleeText 对 CallExpression 返回 null，须取内层调用的被调者文本
+        const inner = calleeText(node.expression.expression)
+        if (inner !== null && (inner.startsWith('it.each') || inner.startsWith('test.each') || inner.startsWith('describe.each'))) {
+          if (inner !== 'it.each' && inner !== 'test.each') {
+            red(node, `${inner} 形态不在 v1 支持子集（describe.each/带后缀 each）`)
+          } else {
+            const srcNode = node.expression.arguments[0]
+          const titleArg = node.arguments[0]
+          const callback = node.arguments.find((a) => isFunctionExpr(a)) ?? null
+          const resolved = srcNode ? resolveEachRows(srcNode) : { bad: 'each 缺少数组参数' }
+          const tpl = titleArg && (ts.isStringLiteral(titleArg) || ts.isNoSubstitutionTemplateLiteral(titleArg)) ? titleArg.text : null
+          if (resolved.bad) red(node, `it.each 解析失败：${resolved.bad}`)
+          else if (tpl === null) red(node, 'it.each 标题模板非静态字符串（插值模板不可静态判定）')
+          else {
+            const holder = { assertions: [] }
+            if (callback) collectCaseBody(holder, callback)
+            resolved.rows.forEach((row, idx) => {
+              if (row === null) return
+              const got = printfExpand(tpl, cellsOf(row), idx)
+              if (got.bad !== undefined) {
+                red(node, `it.each 标题展开失败（行 ${idx}）：${got.bad}`)
+                return
+              }
+              const describePath = stack.slice(1).map((f) => f.title)
+              surface.cases.push({
+                key: JSON.stringify([...describePath, got.title]),
+                describePath,
+                title: got.title,
+                markers: mergeMarkers(stack, []),
+                line: lineOf(titleArg, sf),
+                assertions: [...holder.assertions],
+                _eachRow: true
+              })
+            })
+            if (resolved.rows.some((r) => r === null)) red(node, 'it.each 数组含不可解析元素（顶层仅接受字面量/字面量元组）')
+            return
+          }
+          }
+        }
+      } else if (CASE_PLAIN.has(ct) || CASE_SKIP.has(ct) || CASE_ONLY.has(ct) || CASE_TODO.has(ct) || CASE_FIXME.has(ct)) {
+        const titleArg = node.arguments[0]
+        const hasFn = node.arguments.some((a) => isFunctionExpr(a))
+        const own = CASE_SKIP.has(ct) ? ['skip'] : CASE_ONLY.has(ct) ? ['only'] : CASE_TODO.has(ct) ? ['todo'] : CASE_FIXME.has(ct) ? ['fixme'] : []
+        const isDeclaration = titleArg !== undefined && staticTitleOf(titleArg) !== null && hasFn
+        if (!isDeclaration && (CASE_SKIP.has(ct) || CASE_FIXME.has(ct))) {
+          // W8 双桶三态（文件级建模，自裁①）：非声明形态=体内 skip。
+          // conditional 桶（非字面量条件）双向红；hard 桶（0 参/字面量真值）
+          // 新增红、删除=激活绿 delta（与 markers 激活语义一致）。
+          if (node.arguments.length === 0 || node.arguments[0] === undefined) {
+            surface.hardSkipSites.push(normalizeWs(node.getText(sf))) // test.skip() 0 参=恒 skip
+          } else {
+            const truthy = isStaticTruthy(node.arguments[0])
+            if (truthy === null) surface.conditionalSkipSites.push(normalizeWs(node.getText(sf)))
+            else if (truthy) surface.hardSkipSites.push(normalizeWs(node.getText(sf)))
+            // 字面量假值条件（false/0）=永不触发，不建模
+          }
+          ts.forEachChild(node, visit)
+          return
+        }
+        const title = titleArg !== undefined ? staticTitleOf(titleArg) : null
+        if (title === null) {
+          red(node, `用例标题非字符串字面量（${ct} 动态标题不可静态判定）`)
+        } else {
+          const describePath = stack.slice(1).map((f) => f.title)
+          const entry = {
+            key: JSON.stringify([...describePath, title]),
+            describePath,
+            title,
+            markers: mergeMarkers(stack, own),
+            line: lineOf(titleArg, sf),
+            assertions: []
+          }
+          surface.cases.push(entry)
+          const callback = node.arguments.find((a) => isFunctionExpr(a))
+          if (callback) collectCaseBody(entry, callback)
+          return
+        }
+      } else if (CONSERVATIVE_REDS.has(ct)) {
+        red(node, `${ct} 形态不在 v1 支持子集（保守红，走豁免或改写为静态形态）`)
+      }
+    }
+    ts.forEachChild(node, visit)
+  }
+  visit(sf)
+  surface.cases.forEach((c) => { c.markers = [...new Set(c.markers)].sort() })
+  return {
+    ticketIds: [...surface.ticketIds].sort(),
+    conditionalSkipSites: surface.conditionalSkipSites,
+    hardSkipSites: surface.hardSkipSites,
+    cases: surface.cases
+  }
+}
+
+/** 漏扫哨兵（设计 W6+自裁②+门一 W7 扩）：非白名单 .ts/.tsx 含用例调用形态 →
+ *  保守红。callee 识别面=纯标识符三词 或 带后缀属性访问（calleeText 匹配
+ *  /^(it|test|describe)\./）；命中后仍按参数形态判定（首参字符串字面量或
+ *  任一参函数字面量）——guard.ts 的 describe(label, fn)/describe.skip(label, fn)
+ *  转发调用（双标识符参）不误伤，真用例（带回调）不漏。 */
+function sentinelCheck(absPath, relPath, unresolvable) {
+  const text = readFileSync(absPath, 'utf8')
+  const kind = relPath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
+  const sf = ts.createSourceFile(absPath, text, ts.ScriptTarget.Latest, true, kind)
+  importAliasCheck(sf, relPath, unresolvable)
+  function visit(node) {
+    if (ts.isCallExpression(node)) {
+      const ct = calleeText(node.expression)
+      const isBareThree = ts.isIdentifier(node.expression) && THREE_API.has(node.expression.text)
+      const isDottedThree = ct !== null && /^(it|test|describe)\./.test(ct)
+      if (isBareThree || isDottedThree) {
+        const looksCase =
+          (node.arguments[0] !== undefined && (ts.isStringLiteral(node.arguments[0]) || ts.isNoSubstitutionTemplateLiteral(node.arguments[0]))) ||
+          node.arguments.some((a) => isFunctionExpr(a))
+        if (looksCase) {
+          unresolvable.push({ file: relPath, line: lineOf(node, sf), reason: `漏扫哨兵：非白名单文件含用例调用形态（${isDottedThree ? ct : 'it/test/describe'}——门一 W7 扩）` })
+          return
+        }
+      }
+    }
+    ts.forEachChild(node, visit)
+  }
+  visit(sf)
+}
+
+/** 全量抽取：tests/** → {surfaces: Map<posixRel, FileSurface>, unresolvable: []} */
+export function extractAll(root) {
+  const all = walkFiles(join(root, 'tests'), (p) => TS_LIKE_RE.test(p))
+  const surfaces = new Map()
+  const unresolvable = []
+  for (const abs of all) {
+    const rel = abs.replaceAll('\\', '/').slice(root.replaceAll('\\', '/').length + 1)
+    if (WHITELIST_RE.test(rel)) {
+      surfaces.set(rel, extractFile(abs, rel, unresolvable))
+    } else {
+      sentinelCheck(abs, rel, unresolvable)
+    }
+  }
+  return { surfaces, unresolvable }
+}
+
+/** stats 汇总（DoD 数字全部机器实测于此；门一 W8——skipSiteCount=双桶和，
+ *  向后兼容口径；conditionalSkipSiteCount/hardSkipSiteCount 新字段） */
+export function statsOf(surfaces, unresolvable) {
+  let caseCount = 0
+  let assertionCount = 0
+  let conditionalSkipSiteCount = 0
+  let hardSkipSiteCount = 0
+  let ticketIdCount = 0
+  let eachExpandedRows = 0
+  for (const s of surfaces.values()) {
+    caseCount += s.cases.length
+    conditionalSkipSiteCount += s.conditionalSkipSites.length
+    hardSkipSiteCount += s.hardSkipSites.length
+    ticketIdCount += s.ticketIds.length
+    for (const c of s.cases) {
+      assertionCount += c.assertions.length
+      if (c._eachRow) eachExpandedRows++
+    }
+  }
+  return {
+    fileCount: surfaces.size,
+    caseCount,
+    assertionCount,
+    skipSiteCount: conditionalSkipSiteCount + hardSkipSiteCount,
+    conditionalSkipSiteCount,
+    hardSkipSiteCount,
+    ticketIdCount,
+    eachExpandedRows,
+    unresolvableCount: unresolvable.length
+  }
+}

---
## 附 4 变异 raw（含回炉段 M6/M7/M8/M10/B1b）

F-TESTREF-00 变异矩阵 raw（时间 2026-09-12 00:38:15；node v24.20.0）
==================== m1-theme (tests/unit/renderer/theme.test.ts) ====================
[mut] m1 已施加于 tests/unit/renderer/theme.test.ts
[test-surface] files: 179 base / 179 cur | cases: 1623 base / 1622 cur | assertions: 4979 base / 4976 cur | skipSites: 15 base / 15 cur
[test-surface] exemptions entries: 0 hits: 0 stale: 0
[test-surface] FAIL MISSING_CASE tests/unit/renderer/theme.test.ts:175 「body 视觉底换新 --bg 且保留 html/body/#root overflow 锁（Q1 不变量）」
[test-surface] 检查未通过：1 处契约违背（hint: 若为有意收紧/删改，先取主控裁决，再落 scripts/test-surface.exemptions.json 豁免通道 reason+rulingLink）
EXIT=1
RESTORE-OK (sha256 一致)
==================== m2-theme (tests/unit/renderer/theme.test.ts) ====================
[mut] m2 已施加于 tests/unit/renderer/theme.test.ts
[test-surface] files: 179 base / 179 cur | cases: 1623 base / 1623 cur | assertions: 4979 base / 4979 cur | skipSites: 15 base / 15 cur
[test-surface] NEW tests/unit/renderer/theme.test.ts › body 视觉底换新 --bg 且保留 html/body/#root overflow 锁（Q1 不变量） (line 175)
[test-surface] exemptions entries: 0 hits: 0 stale: 0
[test-surface] FAIL MISSING_ASSERT tests/unit/renderer/theme.test.ts:175 「expect(css).toContain('overflow: hidden')」
[test-surface] 检查未通过：1 处契约违背（hint: 若为有意收紧/删改，先取主控裁决，再落 scripts/test-surface.exemptions.json 豁免通道 reason+rulingLink）
EXIT=1
RESTORE-OK (sha256 一致)
==================== m3-theme (tests/unit/renderer/theme.test.ts) ====================
[mut] m3 已施加于 tests/unit/renderer/theme.test.ts
[test-surface] files: 179 base / 179 cur | cases: 1623 base / 1624 cur | assertions: 4979 base / 4980 cur | skipSites: 15 base / 15 cur
[test-surface] NEW tests/unit/renderer/theme.test.ts › F-TESTREF-00 M3 新增探针用例（变异矩阵） (line 182)
[test-surface] exemptions entries: 0 hits: 0 stale: 0
[test-surface] 检查通过：C_after ⊇ C_before（指纹门绿）
EXIT=0
RESTORE-OK (sha256 一致)
==================== m4-theme (tests/unit/renderer/theme.test.ts) ====================
[mut] m4 已施加于 tests/unit/renderer/theme.test.ts
[test-surface] files: 179 base / 179 cur | cases: 1623 base / 1624 cur | assertions: 4979 base / 4980 cur | skipSites: 15 base / 15 cur
[test-surface] NEW tests/unit/renderer/theme.test.ts › F-TESTREF-00 M4 only 探针（变异矩阵） (line 182)
[test-surface] exemptions entries: 0 hits: 0 stale: 0
[test-surface] FAIL ONLY_FORBIDDEN tests/unit/renderer/theme.test.ts:182 「F-TESTREF-00 M4 only 探针（变异矩阵）」
[test-surface] 检查未通过：1 处契约违背（hint: 若为有意收紧/删改，先取主控裁决，再落 scripts/test-surface.exemptions.json 豁免通道 reason+rulingLink）
EXIT=1
RESTORE-OK (sha256 一致)
==================== m6-theme (tests/unit/renderer/theme.test.ts) ====================
[mut] m6 已施加于 tests/unit/renderer/theme.test.ts
[test-surface] files: 179 base / 179 cur | cases: 1623 base / 1624 cur | assertions: 4979 base / 4980 cur | skipSites: 15 base / 15 cur
[test-surface] exemptions entries: 0 hits: 0 stale: 0
[test-surface] FAIL SKIP_ADDED tests/unit/renderer/theme.test.ts:182 「F-TESTREF-00 M6 skip 探针（变异矩阵）」
[test-surface] 检查未通过：1 处契约违背（hint: 若为有意收紧/删改，先取主控裁决，再落 scripts/test-surface.exemptions.json 豁免通道 reason+rulingLink）
EXIT=1
RESTORE-OK (sha256 一致)
==================== m7-theme (tests/unit/renderer/theme.test.ts) ====================
[mut] m7 已施加于 tests/unit/renderer/theme.test.ts
[test-surface] files: 179 base / 179 cur | cases: 1623 base / 1623 cur | assertions: 4979 base / 4979 cur | skipSites: 15 base / 16 cur
[test-surface] exemptions entries: 0 hits: 0 stale: 0
[test-surface] FAIL SKIPSITE_ADDED tests/unit/renderer/theme.test.ts 「test.skip(probeM7.length > 0, 'F-TESTREF-00 M7 探针延期（变异矩阵）')」
[test-surface] 检查未通过：1 处契约违背（hint: 若为有意收紧/删改，先取主控裁决，再落 scripts/test-surface.exemptions.json 豁免通道 reason+rulingLink）
EXIT=1
RESTORE-OK (sha256 一致)
==================== m8-scroll (tests/e2e/reader-scroll.spec.ts) ====================
[mut] m8 已施加于 tests/e2e/reader-scroll.spec.ts
[test-surface] files: 179 base / 179 cur | cases: 1623 base / 1623 cur | assertions: 4979 base / 4979 cur | skipSites: 15 base / 14 cur
[test-surface] exemptions entries: 0 hits: 0 stale: 0
[test-surface] FAIL SKIPSITE_REMOVED tests/e2e/reader-scroll.spec.ts 「test.skip(!isTicketDone('SR2-F-05'), '延期：工单 SR2-F-05 未完成')」
[test-surface] 检查未通过：1 处契约违背（hint: 若为有意收紧/删改，先取主控裁决，再落 scripts/test-surface.exemptions.json 豁免通道 reason+rulingLink）
EXIT=1
RESTORE-OK (sha256 一致)
==================== m9-scroll (tests/e2e/reader-scroll.spec.ts) ====================
[mut] m9 已施加于 tests/e2e/reader-scroll.spec.ts
[test-surface] files: 179 base / 179 cur | cases: 1623 base / 1623 cur | assertions: 4979 base / 4979 cur | skipSites: 15 base / 15 cur
[test-surface] NEW tests/e2e/reader-scroll.spec.ts › 缺陷 A：窄视口程序滚动（页码跳转+PageDown）只滚阅读器滚动容器——TabBar 恒在视口、外层滚动面零位移 (line 285)
[test-surface] exemptions entries: 0 hits: 0 stale: 0
[test-surface] FAIL ONLY_FORBIDDEN tests/e2e/reader-scroll.spec.ts:285 「缺陷 A：窄视口程序滚动（页码跳转+PageDown）只滚阅读器滚动容器——TabBar 恒在视口、外层滚动面零位移」
[test-surface] FAIL MISSING_CASE tests/e2e/reader-scroll.spec.ts:285 「缺陷 A：窄视口程序滚动（页码跳转+PageDown）只滚阅读器滚动容器——TabBar 恒在视口、外层滚动面零位移」
[test-surface] 检查未通过：2 处契约违背（hint: 若为有意收紧/删改，先取主控裁决，再落 scripts/test-surface.exemptions.json 豁免通道 reason+rulingLink）
EXIT=1
RESTORE-OK (sha256 一致)
==================== m5-baseline ====================
[test-surface] 基线缺失：scripts/test-surface.baseline.json（exit 2 硬阻断禁自愈）——显式执行 `npm run test-surface:baseline` 再生成并对基线 diff 做全量审计
EXIT=2
RESTORE-OK (sha256 一致)
==================== 还原后总绿 ====================
[test-surface] files: 179 base / 179 cur | cases: 1623 base / 1623 cur | assertions: 4979 base / 4979 cur | skipSites: 15 base / 15 cur
[test-surface] exemptions entries: 0 hits: 0 stale: 0
[test-surface] 检查通过：C_after ⊇ C_before（指纹门绿）
EXIT=0
==================== [R1] m6-theme (tests/unit/renderer/theme.test.ts) ====================
[mut] m6 已施加于 tests/unit/renderer/theme.test.ts
[test-surface] FAIL SKIP_ADDED tests/unit/renderer/theme.test.ts:182 「F-TESTREF-00 M6 skip 探针（变异矩阵）」
[test-surface] 检查未通过：1 处契约违背（hint: 若为有意收紧/删改，先取主控裁决，再落 scripts/test-surface.exemptions.json 豁免通道 reason+rulingLink）
EXIT=1
RESTORE-OK (sha256 一致)
==================== [R1] m7-theme (tests/unit/renderer/theme.test.ts) ====================
[mut] m7 已施加于 tests/unit/renderer/theme.test.ts
[test-surface] FAIL SKIPSITE_ADDED tests/unit/renderer/theme.test.ts 「test.skip(probeM7.length > 0, 'F-TESTREF-00 M7 探针延期（变异矩阵）')」
[test-surface] 检查未通过：1 处契约违背（hint: 若为有意收紧/删改，先取主控裁决，再落 scripts/test-surface.exemptions.json 豁免通道 reason+rulingLink）
EXIT=1
RESTORE-OK (sha256 一致)
==================== [R1] m8-scroll (tests/e2e/reader-scroll.spec.ts) ====================
[mut] m8 已施加于 tests/e2e/reader-scroll.spec.ts
[test-surface] FAIL SKIPSITE_REMOVED tests/e2e/reader-scroll.spec.ts 「test.skip(!isTicketDone('SR2-F-05'), '延期：工单 SR2-F-05 未完成')」
[test-surface] 检查未通过：1 处契约违背（hint: 若为有意收紧/删改，先取主控裁决，再落 scripts/test-surface.exemptions.json 豁免通道 reason+rulingLink）
EXIT=1
RESTORE-OK (sha256 一致)
==================== [R1] m10-theme (tests/unit/renderer/theme.test.ts) ====================
[mut] m10 已施加于 tests/unit/renderer/theme.test.ts
[test-surface] FAIL SKIPSITE_ADDED tests/unit/renderer/theme.test.ts 「test.skip()」
[test-surface] 检查未通过：1 处契约违背（hint: 若为有意收紧/删改，先取主控裁决，再落 scripts/test-surface.exemptions.json 豁免通道 reason+rulingLink）
EXIT=1
RESTORE-OK (sha256 一致)
==================== [R1] b1b-empty-baseline ====================
[test-surface] 基线损坏：scripts/test-surface.baseline.json（exit 2 硬阻断禁自愈）——显式执行 `npm run test-surface:baseline` 再生成并对基线 diff 做全量审计
EXIT=0
RESTORE-CHECK-EXIT=0
==================== [R1] m10-removed-half ====================
[mut] m10 已施加于 tests/unit/renderer/theme.test.ts
[test-surface] baseline 已写入 scripts/test-surface.baseline.json
[test-surface] stats {"fileCount":179,"caseCount":1623,"assertionCount":4979,"skipSiteCount":16,"conditionalSkipSiteCount":15,"hardSkipSiteCount":1,"ticketIdCount":57,"eachExpandedRows":160,"unresolvableCount":0}
基线 hardSkipSites 计数: 1
[test-surface] ACTIVATED tests/unit/renderer/theme.test.ts 「test.skip()」（hardSkipSite 删除）
[test-surface] 检查通过：C_after ⊇ C_before（指纹门绿）
EXIT=0
RESTORE-OK (文件+基线 sha256 一致)
FINAL-GREEN-EXIT=0
[R1 复测] B1b 空基线真退出码 EXIT=2（前段 raw 中 EXIT=0 系 tee 管道测 tee 退出码的测量误差，此行更正）
[R1 复测] RESTORE-CHECK-EXIT=0
