[routing]: run=20260911174241-18tq source=kimi-main model=kimi-k3 role=gate1-reviewer@deb5050f cfg=add15c606e1b switches=0 usage=in=0,out=9273 latency=862807ms (by ds-call-v2 链)

# 门一 · F-TESTREF-00 R2 定点复核报告（回炉轮 1）

只读审计，依据=回炉后全量 diff+报告 §8+变异 raw 回炉段。未接触仓库、未跑命令。

---

## 一、R1 五放行条件逐条核

### ① 基线/豁免入 protectedFiles —— **PASS**
- `check-locks.mjs`：`join(root,'scripts','test-surface.baseline.json')` 与 `...exemptions.json` 两条显式登记，注释引「门一 R1 B1」且自注「与 ps1 侧对齐」。
- `get-protected-files.ps1`：`@(...)` 清单追加同两路径。双侧登记一致 ✓。
- 不确定项：mjs 侧 `existsSync` 过滤+ps1 侧 `Test-Path` 条件化——若 baseline.json 实体不入库则锁落空；报告 §8.3 申报 manifest 325 条含两 JSON，包内无法独立核验文件实体，采信申报（locks:check 325 一致有 raw 背书）。

### ② loadBaseline 健全性下限（B1b）—— **PASS**
```js
const fileCount = Object.keys(parsed.files).length
if (fileCount < 1 || !parsed.stats || ... || parsed.stats.fileCount !== fileCount || !(parsed.stats.caseCount >= 1)) return { corrupt: true }
```
R1 攻击链（`{version:1, files:{}}` 恒绿）闭合：fileCount=0<1→corrupt→die(2)。空基线、stats 缺失、fileCount 不符、caseCount=0 四退化形态全阻 ✓。exit 2 硬阻断方向正确。

### ③ cmdBaseline 先阻断后写（W5）—— **PASS**
`if (unresolvable.length > 0) die(1, ...基线未写入...)` 位于 `writeFileSync` **之前** ✓，顺序与 R1 要求一致。

### ④ 范围闸（W1/W3/W4）—— **PASS（一处残留见 N13）**
- W1：`git diff-tree --no-commit-id --name-only -m -r "$C"`——`-m` 对 merge 按双父分别 diff 取并集，clean merge 不再失明，保守向正确；对非 merge commit 行为等价 ✓。
- W3：`^scripts/(check-test-surface(\.mjs)?$|test-surface(\.mjs)?$|test-surface/|test-surface\.(baseline|exemptions)\.json$)`——结尾锚闭合，`check-test-surface-evil/` 前缀逃逸封死 ✓；baseline/exemptions 两 JSON 精确锚 ✓；extract.mjs 由 `test-surface/` 段覆盖 ✓。
- W4：`git fetch origin main`+`merge-base` 兜底，仍失败 `::warning`+exit 0。兜底降低跳过概率，终态仍 exit 0 属 R1 已记录的设计权衡（尾注自愿制同族），可接受。

### ⑤ W11 裁定注记 —— **PASS**
extract.mjs `CASE_TODO` 定义行上方注「vitest API 建模命名非占位标记（门一 W11 主控裁定接受——check-quality 扫描域=src+tests 不含 scripts）」✓ 落位。W2/W9/N4/N6 注记亦均在档（ci.yml 注释、§8.2 补申报）。

---

## 二、新破坏扫描

### [W12 新] 漏扫哨兵对 `it.each` 双层调用形态失明（W7 修复未闭合的残余面）
- 证据（extract.mjs sentinelCheck）：
  ```js
  const isBareThree = ts.isIdentifier(node.expression) && THREE_API.has(...)
  const isDottedThree = ct !== null && /^(it|test|describe)\./.test(ct)
  ```
  非白名单文件中 `it.each([[1]])('t %i', fn)`：外层 `node.expression` 是 **CallExpression**→`isBareThree`=false、`calleeText` 返回 null→`isDottedThree`=false ⇒ **不命中哨兵**。对比 extractFile 的 each 分支专门处理了 `ts.isCallExpression(node.expression) && ct === null` 形态——哨兵侧无对称逻辑。
- 后果：非白名单 `.ts/.tsx` 文件内以 each 形态写的真用例「不被抽取+不被哨兵捕获」双重漏扫（R1 W7 的同族盲区，后缀形态已修、双层调用形态仍开）。
- 存量影响：报告申报 stats UNRESOLVABLE=0，当前无实证命中。
- 处置建议：不阻断本包——R1 已建议 W6/W7 语法子集残余面走后续票「抽取器语法子集补强」，本条作为该票追加登记项（哨兵 each 形态=取内层调用被调者文本再判）。

### W8 双桶语义边界 —— **核验通过**
- hard 桶减→`ACTIVATED ...（hardSkipSite 删除）` delta 绿、增→`SKIPSITE_ADDED` 红；cond 桶双向红；两桶分别 `countMultiset` 天然隔离不互抵 ✓。
- 跨桶迁移形态推演：`test.skip()`→`test.skip(flag)`：hard 减（ACTIVATED 绿）+cond 增（SKIPSITE_ADDED 红）=总红 ✓ 保守；反向迁移 cond 删即红 ✓；`test.skip(false)` 不建模、改为 `true` 即 SKIPSITE_ADDED 红 ✓。
- M10 双向 raw 实证（新增半 exit 1 / 删除半 ACTIVATED+exit 0+双 sha 还原）✓。

### W6 别名检测误伤面 —— 基本可控，一处 N
- 正常直名 import、`{ _electron as electron }`（imported∉三词）不误伤 ✓；真别名/伪装本地名/default 伪装三向红 ✓；源限定 `vitest|@playwright/test` 不误伤 `node:test` ✓。
- 残留通道（N11）：`const myIt = it; myIt('t', fn)` 本地变量别名仍静默漏抽——R1 W6 字面只覆盖 import 面，申报范围一致，登记后续票。

### W1 diff-tree -m 行为 —— **正确**（merge 双父并集、重复行无害、非 merge 等价）。

---

## 三、两项新自裁裁量

1. **namespace import 保守红** —— **接受**。`import * as v` 后 `v.it()` 的 calleeText=`v.it` 落在全部白名单集合之外，漏抽通道真实存在；namespace import 是 vitest 合法形态；红方向保守、存量 0 摩擦、超裁决字面但合 B 面「不可静态判定即红」的裁决精神。源正则限定两测试框架，不误伤。
2. **新文件桶双桶新增红** —— **接受**。B1「新增 skip=红」语义覆盖 NEW_FILE 场景是必然推论（否则新文件成 skip 注入免红通道）；与既有文件新增 skip 判定口径一致，公平；方向保守。R1 未点名属实，本轮闭合合规。

---

## 四、证据诚实性抽验

- §8.3 stats（179/1623/4979/15=15cond+0hard/57/160/unresolvable 0）与 R1 raw 基线数字一致、双桶和自洽；M10 临时基线 skipSiteCount=16=15+1 自洽 ✓。
- **B1b 首测 EXIT=0 的 tee 解释——存疑（N12，不阻断）**：若测量脚本统一为 `cmd | tee; EXIT=$?`（取 tee 退出码），则同 raw 中 m6/m7/m8/m10 各红段的 EXIT=1 也都应被吞成 0——但它们 EXIT=1 正确。tee 误差说成立需附加假设「b1b 段测量方式与其他段不同」，报告未就此说明。**但**：diff 代码 `die(2,...)`=`console.error`+`process.exit(2)`，无前置异步，行为确定 exit 2；复测行 EXIT=2 与代码行为一致。**功能结论采信复测**，测量误差叙述不完整属证据陈述瑕疵。
- M1-M5/M9 未以新代码复跑——W10 的 NEW 行新格式「(line N, M assertions)」无 raw 实证（旧 m3 段 NEW 行无计数），仅代码证据（两处 deltas.push 均带计数）支撑（N14）。

---

## [N] 级汇总（新增，不阻断）

- **N11**　本地变量别名（`const myIt = it`）漏抽通道仍开——登记后续票。
- **N12**　B1b tee 测量误差叙述与 raw 内部一致性不完全自洽；复测结论与代码行为一致，采信。
- **N13**　loadBaseline 下限不交叉核对 `stats.caseCount` 与 files 内实际用例数、不校验条目 schema——手工篡改维持 stats 自洽即可过下限（锁面 sha 为真实防线，本校验仅深度防御）；旧格式基线（无双桶字段）会使 judge `b.conditionalSkipSites.length` 抛 TypeError 非受控崩溃（崩溃方向=非 0 退出，非静默放行）。
- **N14**　W10 NEW 行新格式+M1-M5/M9 未复跑，raw 证据仅覆盖 M6/M7/M8/M10/B1b。
- **N15**　importAliasCheck 未排除 type-only import（`import type { it as myIt }` 误红）——红方向、存量 0、可改写，保守向。
- **N16**　哨兵 looksCase 对非白名单 `describe('x')`（单字符串参无回调）/自定义 `test.foo('str')` 命名空间误伤面——红方向、存量 0。

---

## 统计与总评

- **B：0　W：1（W12，登记后续票）　N：6（N11-N16）**
- 五放行条件**全部落实**且实现正确；两项新自裁**均接受**；双桶/别名/哨兵扩/diff-tree -m 四处回炉改动未发现静默放行方向的新破坏。
- W12（哨兵 each 盲区）与 N11（本地别名）为 R1 已建议的「抽取器语法子集补强」后续票同族残余面，非本包回炉项。
- 证据诚实性：B1b tee 解释叙述不完整，但复测结论有代码行为背书，不推翻。

**总评：收口放行。** 附登记项：①后续票追加 W12（哨兵 each 双层调用形态）+N11（本地变量别名）+N15（type-only import 排除）；②N12 测量脚本差异请实现者在档补一句说明（证据链完整性，非阻断）。