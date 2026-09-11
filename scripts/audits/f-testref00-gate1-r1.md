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