# 对抗审核任务：测试面指纹门设计书（F-TESTREF-00 / P0 设计链第二跳）

你是「审核」岗（只挑错不改写）。对下面【设计书】做对抗审核。你的审核事实基础包含【主控补证与补裁草案】——其中有主控对设计书两处 ⑤i 型验收互斥的实锤与修正案，请重点攻击修正案本身是否仍开门。

## 已终裁不可更改的设计参数（第一跳输入）
- C/S 两面拆分；C 面=用例标题有序多重集+每用例 expect 断言规范化源文本多重集+guardedDescribe 工单号集+skip/only 标记；S 面完全不判
- 判定 C_after ⊇ C_before 多重集；新增放行+delta；缺失=exit 1 带 file:line
- v1 不做容差方向判定；豁免清单 {file,caseTitle,assertionText?,reason,rulingLink} 人工留痕
- it.each 展开后比对；新增 skip=红；only 恒红；基线 scripts/test-surface.baseline.json 显式再生成禁自愈；零新依赖 import ts from typescript；≤500 行；verify 链挂载+CI 同跑

## 主控补证（对设计书 §12 开放问题的实测答案——全部 git grep 实证）
- Q1: tests/utils/** 与 e2e-env.ts 内 expect 计数=0（五件全 0）→ §9-1 的 helper 归档映射不需要
- Q2: xit/xdescribe/it.only/describe.only/it.todo/it.skipIf/it.runIf/describe.each/test.extend/test.fixme/describe.configure/it.concurrent/test.only 全部 0 命中；.skip 形态 16 处=guard.ts 运行时 helper 1 处（非扫描域）+e2e 体内条件 skip 15 处（见下）
- Q3: 动态标题 it(`…${…}`) 0 命中；e2e 5 文件的 for 循环全在用例体内（seed/重试），无 top-level 动态用例生成
- Q4: theme.test.ts 三处 it.each——TOKENS(模块级 const 字面量元组数组，标题 %s %s 全消费字面量位)；DURATION_COUNTS(describe 回调内 const 字面量数组，行=['0.08s', css标识符, 1]——标题两个 %s 位置消费第 0 位(字面量)与第 1 位(css=模块级 readFileSync 结果，非静态可求值))；FS_CSS(回调内 const，行=['theme.css', css]——标题 %s 只消费第 0 位字面量)。printf %s 位置消费：vitest 逐位消费参数
- Q5: 同 key 重复用例未实测（实现期 stats 子命令补）
- Q7: locks manifest 对 scripts/ 递归子目录实证（scripts/audits 90 件在册）——拆分预案可用平铺也可子目录
- Q8: CI=.github/workflows/ci.yml 单 verify job（六道关卡）+lock-change-guard job（git log --format=%B 匹配 [locked-change]）——设计书案 B 形态与实际一致

## ⑤i 实锤两处（主控实测，设计书按原样实现会首日红）

### 实锤一：体内条件 skip 15 处
15 个 e2e spec 存在体内依赖门惯用法：const pending = DEPS.filter((d) => !isTicketDone(d)); test.skip(pending.length > 0, `延期：依赖工单未完成 [${pending.join(', ')}]`)（ai-notes-section×2/corpus-export/lineage×2/z-r2e-probe/z-wg1-probe/reader-scroll×2/zcode-link/reader-search/export-clipboard/reading-time-replay/reader-reading-time/reader-text）。设计书 §3.5 将体内 *.skip( 调用列为保守红 → 基线生成首日即 15 红。

**主控补裁草案 A（请攻击）**：体内条件 skip 不再保守红，改为 skipSite 机制——每用例体新增 skipSites: string[]（体内 test.skip/it.skip 条件形态调用的规范化源文本多重集，与 assertions 同款空白归一），入 C 面受 ⊇ 判定：新增 skipSite=放行+delta 报告（可疑但不拦——新增受 ⊇ 单调性哲学一致），删除 skipSite（如依赖门随工单全 done 清理）=红走豁免。声明形态（test.skip('t',fn)/it.skip('t',fn)）与无条件体内 test.skip() 仍按原设计 markers 处理（新增=红）。理由：体内条件 skip 的运行时跳过与否取决于 tickets/registry 状态（治理数据非测试语义），其文本稳定性才是契约。

### 实锤二：it.each 数组参数全为标识符引用非字面量
三处 it.each 第 1 参都是 const 标识符（TOKENS/DURATION_COUNTS/FS_CSS）而非 ArrayLiteral——设计书 §3.4 只接受 ArrayLiteral 直接字面量 → 三处保守红首日。

**主控补裁草案 B（请攻击）**：展开算法扩展——(1) 标识符单跳解析：用例所在文件内（模块级或 enclosing 作用域）const X = ArrayLiteralExpression 即解析（多跳/复杂表达式仍保守红）；(2) 展开键规则：模板标题逐占位符替换——占位符消费位为字面量→真实值；非静态可求值→替换稳定标记 ⟨nse:j⟩（j=参数位序）；行计数入多重集（删行=缺失红/增行=delta）。由此 DURATION_COUNTS 的 14 行展开为 3 种标题×重复计数（第二占位符非静态全取标记），TOKENS/FS_CSS 展开为真实标题。键的职责=确定性稳定锚，不复刻运行时标题。

## 审核指令
1. 逐节审设计书（§1-§11）：找绕过通道（门形同虚设的场景）、边界缺陷（误报风暴/漏报开门）、工程不可行点（Windows/性能/500 行预算）。
2. 重点攻击两补裁草案：草案 A 的「新增 skipSite 放行」是否是绕过通道（例如 AI 新增恒真条件 skip 绕过用例）？若是，堵法是放行+delta 强制人审还是直接红？草案 B 的稳定标记键在行重排/行内容换位时是否产生假绿？
3. 审 §3.3 expect 去重（区间包含判定）的边界：await 表达式内的 expect、expect 断言链跨行、同一断言在 if/else 两分支（应各计一份还是去重？）。
4. 审 §5.1-3 同 key 二分匹配的正确性与复杂度；§5.1-4 markers 逐元素相等是否过严（skip→恢复 skip 取消=红走豁免是否合理）。
5. 审 §7.3 案 B：lock-change-guard 扩展 [test-refactor] 分支的侵入面、merge commit 场景 base 取法、package.json 整体放行的风险与替代。
6. 输出格式：[B|W|N] 逐条（B=阻断必须改/W=应改/N=注记）+ 每条给设计书节号或补裁草案锚点 + 总评（可终裁/需回炉）。不确定的明确说不确定。中文输出。

---

## 【设计书】（Kimi 拟定，第一跳产出）

# 设计书：测试面指纹门 check-test-surface.mjs（F-TESTREF-00 / P0）

> 本设计书将送异构对抗审核（只挑错不改写）与主控终裁。已知风险与不确定点集中于 §12，正文中以「待主控补证」就地标注，不做隐藏。

---

## 1. 目标与非目标

**目标**
1. 将「测试不可静默削弱」从纪律升级为机检：任何既有用例（标题/断言/guardedDescribe 工单号/skip 状态）的缺失或变更 = CI 红。
2. 与文件 sha 锁正交叠加：允许改动 tests/** 文件（解锁后），但 C 面契约只增不减（`C_after ⊇ C_before`，多重集）。
3. 为大规模测试重构战役（脚手架合并/纯增覆盖）提供 `[test-refactor]` 范围闸：战役提交 diff 路径白名单机检。
4. 所有放行均留痕：新增走 delta 报告，收紧/删改走豁免清单（reason + rulingLink）。

**非目标（本门不管什么）**
- S 面重复：imports、mock 工厂、几何桩、describe 嵌套层级、注释——**完全不判**（这正是要解锁的重构空间）。
- 行数、风格、命名、覆盖率数值、e2e flake 率——不在本门域内。
- 断言**方向**判定（收紧 vs 放宽）：v1 不做语义理解，任何既有断言文本变化一律红，由豁免通道人工裁决方向。
- src/** 正确性：本门只看 tests/**。

---

## 2. C 面 / S 面文法级定义 + 语法形态清单

### 2.1 抽取域
- `tests/unit/**/*.test.ts`、`tests/contracts/**/*.test.ts`（vitest 域）
- `tests/e2e/**/*.spec.ts`（Playwright 域；`e2e-env.ts` 非 spec，不抽取）
- `tests/utils/**` 不含用例，不抽取（**待主控补证**：确认无 `it(` 出现，grep 见 §12-Q1）。

### 2.2 C 面（每文件，契约面，不可缩）
对每测试文件抽取四元组：

```
FileSurface = {
  cases:    CaseEntry[],          // 用例有序多重集
  ticketIds: string[],            // guardedDescribe 工单号集（排序去重）
  // skip/only 标记内嵌于 CaseEntry.markers
}
CaseEntry = {
  describePath: string[],         // 外层 describe 静态标题路径（guardedDescribe 用静态 title）
  title: string,                  // 用例标题（it.each 展开后）
  markers: string[],              // ⊆ {"skip","only","todo","fixme"}，可空
  assertions: string[],           // 用例体内 expect 断言规范化源文本多重集（源码顺序）
  line: number,                   // 用例标题所在行（1-based，供失败输出）
  key: string                     // describePath.join(" › ") + " › " + title
}
```

**多重集语义**：同 key 用例允许存在 N 个，各自带独立 assertions；判定按 (key, assertions多重集) 计数比对——防「两条压一条」。

### 2.3 S 面（不判）
imports / 模块级常量与工厂 / `vi.mock` / describe 嵌套结构本身（仅其标题入 C 面作路径）/ 注释 / hooks（beforeEach 等，见 §9-1 裁决）/ 断言外的全部语句。

### 2.4 语法形态覆盖清单

| 形态 | 归属 | 状态 |
|---|---|---|
| `describe(title, fn)` | C（路径） | 已证存在（185 文件常规形态） |
| `it(title, fn)` / `test(title, fn)` | C | `it(` 1463 处已证；裸 `test(` 是否用于 vitest 域**待补证** |
| `it.each(arr)(title, fn)` | C（展开） | 已证 3 处，全在 theme.test.ts，字面量数组 |
| `guardedDescribe(ticketId, title, fn)` | C（特殊） | 已证（tests/utils/guard.ts） |
| `test.describe / test() / test.skip` (PW) | C | 已证存在于 e2e 域 |
| `@probe` 标签 | C（标题文本一部分） | 已证（标题变即红） |
| `it.skip / it.only / describe.skip / xit / xdescribe / it.todo` | C（markers） | **待补证**（Q2） |
| `test.only / test.fixme / test.describe.configure` (PW) | C / configure→红 | **待补证**（Q2） |
| `it.skipIf / it.runIf / describe.each / test.extend / it.concurrent` | 见 §3.5 保守红 | **待补证**（Q2） |
| 动态标题 `it(\`case ${i}\`)`、e2e for 循环生成 test | 保守红 | **待补证**（Q3） |
| `it.each` 标题模板 `$var` / `${}` 形态 | §3.4 | **待补证**（Q4，本仓 3 处实际用哪种） |

---

## 3. 抽取算法

### 3.1 总体流程
1. 递归 walk `tests/unit`、`tests/contracts`、`tests/e2e`，过滤 `.test.ts` / `.spec.ts`（用 `node:fs` + `node:path`，相对路径统一转 POSIX 斜杠——保证 Windows/CI 输出一致）。
2. 每文件 `ts.createSourceFile(path, text, ts.ScriptTarget.Latest, /*setParentNodes*/ true, ts.ScriptKind.TS)`。
3. AST 深度优先访问，维护 describe 栈（标题字面量栈 + guardedDescribe 工单号栈）。
4. 命中用例节点（`it/test` 族 CallExpression）→ 生成 CaseEntry。
5. 输出 FileSurface（结构见 §4）。

### 3.2 节点识别规则
- **describe 族**：CallExpression，callee 为 `describe` / `describe.skip` / `describe.only` / `test.describe` / `test.describe.skip` 等成员链（文本前缀匹配白名单）。第 1 参为 StringLiteral/NoSubstitutionTemplateLiteral → 入栈标题；非字面量 → **保守红**（报 `file:line 不可静态判定的 describe 标题`）。
- **guardedDescribe**：callee 为标识符 `guardedDescribe`；第 1 参 ticketId（须 StringLiteral）、第 2 参 title（须字面量），否则保守红。入栈静态 title，ticketId 记入文件 ticketIds 集。**不用运行时展开标题**（理由：运行时标题含 `[ticketId]` 后缀，而工单号已独立入 C 面；双写会造成豁免匹配歧义）。
- **用例族**：callee 白名单 `it|test`（可选 `.skip|.only|.todo|.fixme` 后缀；PW 域 `test` 与 vitest 域 `test` 同规则）。markers 从后缀抽取；`xit`→`it`+skip，`xdescribe`→`describe`+skip。
- **it.each**：形态 `it.each(<arrayLiteral>)(<titleLit>, fn)`（CallExpression 的 callee 本身是 CallExpression）。只接受第 1 参为 ArrayLiteralExpression（元素全字面量/数组字面量）→ §3.4 展开；tagged-template 形态 `it.each\`...\`` 与其他形态 → 保守红。
- **expect 断言**：见 §3.3。

### 3.3 expect 抽取与规范化
- 在用例回调函数体内（**含其内嵌声明的箭头/函数表达式体**，见 §9-1 裁决），收集所有 ExpressionStatement，其子树含 callee 为标识符 `expect` 的 CallExpression。
- **去重**：若 statement A 的区间严格包含 statement B（如 `await vi.waitFor(() => { expect(x).toBe(1) })` 外层含内层），仅保留内层。理由：避免同一断言双计导致多重集虚胖。
- **规范化**（候选权衡见下表；采用案 A）：
  - 案 A（采用）：`node.getText(sourceFile)` 后**仅做空白归一**——所有连续空白（含换行/缩进）折叠为单个空格、首尾 trim。字面量、引号、尾逗号、模板串 `${}` 原样保留。
  - 案 B（否决）：引号统一 + 尾逗号抹除 + 模板串占位符化。否决理由：归一规则每多一条，「等价改写被误判红」的概率降、但「真削弱被洗白」的风险升；v1 取向宁误报走豁免（§4 反模式 4/7 同向）。

| 维度 | 案 A 仅空白归一 | 案 B 深度归一 |
|---|---|---|
| 实现复杂度 | 低（~10 行） | 高（逐 token 重写） |
| 误报率 | 高（引号风格改动即红，走豁免） | 低 |
| 漏报风险 | 零（文本保留最全） | 归一规则可能洗白真变更 |
| 战役体验 | 豁免条目偏多 | 豁免少但规则难审 |

- 断言记录其起始行号（供失败输出 `file:line`）。

### 3.4 it.each 展开算法
- 静态求值 ArrayLiteralExpression：元素为字面量→单参行；元素为 ArrayLiteral→多参行。非字面量元素（标识符引用等）→ 保守红。
- 标题模板替换（对齐 vitest 语义，实现子集）：
  - printf 形态：`%%`→`%`；`%s`→String(arg)；`%d`/`%i`→Number；`%j`→JSON.stringify；`%#`→行下标（0-based）；`%o`/`%f`→ 保守红（**待补证**是否出现，Q4）。
  - `$` 形态：`$#`→行下标；`$name`→该行对象属性；`${path.to.prop}`→点路径取值。
  - 替换后标题 = C 面 title；展开行共享 it.each 所在行号；断言取公共回调体（每展开行各记一份同文本断言——多重集计数随之放大，与 vitest 运行时语义一致）。
- 占位参数未消费的行不裁剪（与运行时一致地保留）。

### 3.5 不可静态判定清单（一律保守红）
动态标题/动态 describe/it.each 非字面量参数/用例体内调用 `*.skip(` `*.only(` `*.fixme(`（条件跳过）/ `test.extend` 生成的自定义用例函数 / `describe.configure`。输出 `UNRESOLVABLE file:line 原因`，exit 1，引导走豁免或改写为静态形态。理由：宁误报走豁免留痕，不漏报开门（反模式 7）。

---

## 4. 基线文件格式

路径：`scripts/test-surface.baseline.json`（诞生即走 locks:generate+apply 入锁，先例 dup-constants.baseline.json）。

```json
{
  "version": 1,
  "files": {
    "tests/unit/renderer/theme.test.ts": {
      "ticketIds": ["T-0123"],
      "cases": [
        {
          "key": "Theme › 亮色 › 应用令牌",
          "describePath": ["Theme", "亮色"],
          "title": "应用令牌",
          "markers": [],
          "line": 42,
          "assertions": ["expect(tokens.bg).toBe('#fff')"]
        }
      ]
    }
  },
  "stats": { "fileCount": 0, "caseCount": 0, "assertionCount": 0, "eachExpanded": 0 }
}
```

**排序稳定性**（同输入必同输出）：`files` 键按 POSIX 相对路径字典序；`ticketIds` 字典序去重；`cases` 保源码顺序（顺序本身是确定性的）；`assertions` 保源码顺序。**不含时间戳/git hash 等易变字段**（理由：避免基线再生成产生无意义 diff，保证「全量 diff 审计」可读）。序列化 `JSON.stringify(obj, null, 2)` + 尾部单个 `\n`，UTF-8 无 BOM，LF 行尾（写文件时显式 `'\n'`，不依赖 `os.EOL`——Windows 纪律）。

---

## 5. 判定与输出

### 5.1 ⊇ 多重集算法
对每文件（仅当文件存在于基线**或**当前；见下）：
1. 当前缺失基线中整个文件 → 红（`FILE_MISSING`）。新增文件 → 绿 + delta 记录。
2. ticketIds：基线集 ⊄ 当前集 → 红（列出缺失工单号）。
3. cases：构建多重集映射 `Map<key, List<assertions多重集>>`（同 key 按出现序配对不够——同 key 用例 assertions 集合间做**二分匹配**：基线每个同 key 用例的 assertions 多重集须在当前同 key 用例池中找到一个 ⊇ 容器，用贪心+回溯（同 key 重复在本仓预计极少，**待补证** Q5；规模上界 185 文件 × 平均 8 用例，O(n²) 可承受）。任一基线用例无容器 → 红。
4. markers：配对成功的用例 markers 集合须逐元素相等（基线无 skip、当前出现 skip → 红；skip→非 skip 亦红——状态变更一律走豁免）。
5. `only` 出现（无论基线）→ 红（`ONLY_FORBIDDEN`）。

### 5.2 delta 报告（stdout，无论红绿）
```
[test-surface] files: 185 base / 185 cur | cases: 1477 base / 1480 cur (+3) | assertions: 5210 (+12)
[test-surface] NEW tests/unit/x.test.ts › 新增用例标题 (line 88)
[test-surface] exemptions active: 2  entries: 5
```
豁免计数恒显式报告（反模式 9：趋势可见）。

### 5.3 失败输出（stderr + exit 1）
```
[test-surface] FAIL MISSING_CASE tests/unit/renderer/theme.test.ts:42 「Theme › 亮色 › 应用令牌」
[test-surface] FAIL MISSING_ASSERT tests/unit/x.test.ts:120 「expect(a).toBe(1)」
[test-surface] FAIL SKIP_ADDED tests/e2e/y.spec.ts:17 「@probe 启动冒烟」
[test-surface] hint: 若为有意收紧/删改，请走 scripts/test-surface.exemptions.json 豁免通道
```
### 5.4 exit code
0=通过；1=契约违背/不可静态判定/only；2=基线文件缺失或 JSON 损坏（**硬阻断，禁止自愈**，输出须含「显式执行 `npm run test-surface:baseline` 并全量审计 diff」）；3=豁免清单 schema 非法。

---

## 6. 豁免清单机制

路径：`scripts/test-surface.exemptions.json`（受锁）。

```json
{ "version": 1, "entries": [
  { "file": "tests/unit/renderer/theme.test.ts",
    "caseTitle": "应用令牌",
    "assertionText": "expect(tokens.bg).toBe('#fff')",
    "reason": "断言随令牌重命名收紧，裁决见主控纪事 2025-xx-xx",
    "rulingLink": "docs/rulings/R-0042.md" } ] }
```

- `assertionText` 可选：给出则仅豁免该断言；省略则豁免整个用例（caseTitle 必填且须精确等于 C 面 title）。
- **匹配语义**：判定时，对每条「缺失」先查豁免——file 精确相等 + caseTitle 精确相等 + （若给出）assertionText 与规范化后文本精确相等。命中 → 该缺失降级为豁免计数，不红。未命中任何缺失的豁免条目 = 陈旧条目，输出警告（不红，防误伤在途提交）。
- schema 校验：reason/rulingLink 非空字符串，缺即 exit 3（反模式 9：无理由豁免不成立）。
- 输出：每次 check 报告豁免条目总数与本次命中数。

---

## 7. CLI 与挂载

### 7.1 子命令
```
node scripts/check-test-surface.mjs check      # 默认：抽取+判定+输出（§5）
node scripts/check-test-surface.mjs baseline   # 显式再生成基线（stdout 打印 stats，写文件）
node scripts/check-test-surface.mjs stats      # 只抽取打印统计，不判定（调试/补证用）
```
npm scripts 命名（遵先例）：`test-surface:check` / `test-surface:baseline` / `test-surface:stats`。

### 7.2 verify 链插入点
`quality:check → **test-surface:check** → tickets:check → locks:check → lint → typecheck → test → build`。理由：紧随 quality 之后，失败即短路，先于较重的 lint/typecheck。CI 单 verify job 跑同一 verify 脚本 → 本地/CI 自动同跑。

### 7.3 CI yml 修改方案（范围闸挂载点两案对比）

| 维度 | 案 A：verify job 新增 step | 案 B：扩展 lock-change-guard job（采用） |
|---|---|---|
| 实现形态 | verify 内嵌 git diff 逻辑，与六道关卡串行语义混杂 | 与既有 `[locked-change]` 尾注匹配同形态（`git log --format=%B` + 路径检查），同 job 内新增 [test-refactor] 分支 |
| 复杂度 | verify job 变重，失败定位需分辨 step | guard job 职责单一=「提交尾注↔diff 一致性」，语义内聚 |
| 风险 | verify 失败与范围闸失败混淆 | 需改 guard job 名/注释（可保留 job 名仅加逻辑） |
| 迁移成本 | 改 1 处 yml | 改 1 处 yml + 1 段脚本逻辑 |

**采用案 B**：lock-change-guard job 内追加——当 HEAD 提交信息匹配 `[test-refactor]` 时，执行 `git diff --name-only <base>...HEAD`，断言路径 ⊆ `tests/** ∪ scripts/check-test-surface*.mjs ∪ scripts/test-surface.*.json ∪ .github/workflows/** ∪ package.json`（仅脚本段限制无法机检，package.json 整体放行——**已知风险**，见 §12-Q6），出现 `src/**` 或其他路径 = 红。尾注缺失时 tests/** 变更仍放行（日常小规模测试维护不需要战役闸）。

---

## 8. [test-refactor] 票类全流程

1. 战役提交尾注格式（commit message 正文，与 [locked-change] 同款 grep 模式）：`[test-refactor] F-TESTREF-xx`。
2. 双尾注：战役必触 tests/** 受锁面 → 提交同时携带 `[locked-change]`（既有 guard 强制）与 `[test-refactor]`（本闸强制范围）。两闸正交：一个管「锁有没有合法解开」，一个管「动的东西超没超白名单」。
3. 三重机检在 CI 的合成：
   - **范围闸**（§7.3 案 B）：diff 路径白名单。
   - **指纹闸**（verify job 内 `test-surface:check`）：`C_after ⊇ C_before`。
   - **用例闸**：由指纹闸蕴含——caseCount 单调不减是 ⊇ 的推论，delta 报告显式打印计数供人审。
4. 战役正常路径：解锁（locks:unlock + [locked-change]）→ 重构 tests/**（S 面随便动）→ 本地 verify 含指纹门 → 若有意的收紧/删改 → 先取得主控裁决 → 写豁免条目（reason+rulingLink）→ CI 三闸全绿 → locks:apply 重锁。
5. 战役结束后基线再生成：`npm run test-surface:baseline` + 全量 diff 审计（反模式 8：再生成永远显式）。

---

## 9. 反模式对策逐条

1. **断言搬进共享 helper**：抽取域=用例回调体内（含体内嵌套声明的函数——裁决：体内 helper 的 expect 计入，理由是其语义仍属该用例且可防止体内改名藏匿）；模块级 helper 的 expect 不计入——断言一旦移出用例体即从 C 面消失 = 红。本仓 helper 内是否已有 expect **待补证**（Q1），若有，首版基线将其体外 expect 按原属用例归档（grep 定位后人工归档，一次性）。
2. **it.each 标题漂移**：§3.4 展开后比对，展开失败 = 保守红。
3. **两条压一条**：多重集 ⊇（§5.1 计数比对 + 同 key 二分匹配）。
4. **放宽容差**：v1 无方向判定，文本变即红，收紧放宽同罪，走豁免（§6）。
5. **新增 skip/only**：markers 入 C 面，skip 状态变更即红；only 无条件红（§5.1-4/5）。
6. **改标题换皮**：title 在 C 面 key 内，变即 MISSING_CASE + NEW 同时出现，红。
7. **抽取器盲区**：§2.4 形态清单 + §3.5 保守红；清单外形态默认视为不可判定而非忽略。
8. **基线自愈**：脚本无任何「红了就重写」分支；baseline 子命令只能显式调用；基线缺失/损坏 exit 2 硬阻断（§5.4）。
9. **豁免滥用**：schema 强制 reason+rulingLink（缺=exit 3）；每次 check 输出豁免条目总数与命中数，趋势可审；陈旧条目警告提示清理。

---

## 10. 门自身证伪方案

变异矩阵（CI 不跑，开发期人工/自检脚本执行，**还原一律用文件备份法，禁 git checkout**）：

| # | 变异 | 预期 | 验证点 |
|---|---|---|---|
| M1 | 复制某 .test.ts 为 .bak → 删一个用例 → `test-surface:check` | exit 1，输出 MISSING_CASE + file:line | §5.1-3 |
| M2 | 备份 → 改一个 expect 字面量 → check | exit 1，MISSING_ASSERT | §5.1-3 |
| M3 | 备份 → 新增一个用例 → check | exit 0，delta 报告含 NEW 行、计数 +1 | §5.2 |
| M4 | 备份 → 加 `it.only` → check | exit 1，ONLY_FORBIDDEN | §5.1-5 |
| M5 | 备份基线 → 删基线文件 → check | exit 2 硬阻断 | §5.4/反模式 8 |

还原纪律：`cp file file.bak`（操作前）→ `mv file.bak file`（操作后）；基线同法。执行记录（命令+输出截图/日志）落入战役 DoD 证据。Git Bash 下上述命令均可用，无 POSIX-only API。

---

## 11. 工程约束合规表

| 约束 | 落法 |
|---|---|
| Node 24 ESM .mjs | 单主件 `scripts/check-test-surface.mjs`；`#!/usr/bin/env node` 不加（npm scripts 调用） |
| 零新依赖 | `import ts from 'typescript'`（同款 check-dup-constants.mjs 先例）+ node:fs/node:path |
| ≤500 行 | 预估主件 ~320 行（抽取 ~150 / 判定 ~90 / 输出 ~40 / CLI ~40）；超限预案：拆 `scripts/check-test-surface-lib.mjs`（纯函数：walk/extract/compare）+ 主件薄壳。**平铺不建子目录**——scripts/ 递归入锁与否待补证（Q7），平铺规避 |
| Windows/中文路径 | 全程 `path.join/relative`，结果 `sep→'/'` 转 POSIX 后入基线；禁字符串拼斜杠 |
| UTF-8/LF | 读写显式 `{ encoding: 'utf8' }`，写出行尾 `'\n'`；基线无 BOM |
| 诞生即锁 | 新脚本+基线+豁免清单首提交执行 `locks:generate` + `locks:apply`，携带 [locked-change] |
| 提交尾注兼容 | 不改动既有 guard 的 [locked-change]/[dep-change] 匹配逻辑，仅追加 [test-refactor] 分支 |

---

## 12. 开放问题清单（待主控补证/裁决）

> 以下均不阻塞设计落地（正文已给保守默认行为），但影响基线首版正确性与规则白名单裁剪。建议用 `node scripts/check-test-surface.mjs stats`（实现后）或 git grep 补证。

- **Q1** tests/utils/** 与共享 helper 内是否存在 expect（`git grep -n "expect(" tests/utils`）；若存在，需一次性归档映射表（§9-1）。
- **Q2** 以下形态实际出现情况：`xit|xdescribe|it.only|describe.only|it.todo|it.skipIf|it.runIf|describe.each|test.extend|test.fixme|test.describe.configure|describe.concurrent`（`git grep -nE "..." tests`）；出现的须列入白名单实测，未出现的默认保守红。
- **Q3** 动态标题与循环生成用例：`git grep -nE "it\(\`|test\(\`|for\s*\(" tests/e2e tests/unit`——e2e 域 for 循环生成 test 若存在，须裁决：改写为静态 or 豁免。
- **Q4** theme.test.ts 三处 it.each 的标题模板实际形态（`%s`/`%d`/`$var`/`${}` 哪种）——决定 §3.4 替换子集是否够用。
- **Q5** 同 describePath+title 完全相同的用例是否存在（影响 §5.1-3 同 key 匹配路径是否会被真实触发；即使不存在，算法保留以防未来）。
- **Q6** 范围闸对 package.json 的放行是否可接受（无法机检「仅脚本段」变更）；替代案：战役期间 package.json 变更要求双人工复核——需主控裁决。
- **Q7** locks/manifest 对 scripts/ 的入锁规则是否递归子目录（决定 §11 拆分预案是否可用子目录；当前预案平铺已规避）。
- **Q8** CI workflow 文件的确切路径与 lock-change-guard job 内部结构（设计书按任务书描述拟定，落地时以实际 yml 为准微调 step 名）。

---

**拟定者声明**：以上全部设计决定已附理由；所有未证事实均已标注待补证且集中于 §12。本设计书不含需再澄清一轮的占位章节；§12 各条均给出获取路径（grep 命令或实现后 stats 子命令）。请审核者重点对抗检查：§3.3 expect 去重规则的区间包含判定、§5.1-3 同 key 二分匹配在无重复场景的退化正确性、§7.3 案 B 对既有 guard job 的侵入面。