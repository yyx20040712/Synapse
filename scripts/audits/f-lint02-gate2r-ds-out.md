[routing]: run=20260909135439-tn7x source=deepseek model=deepseek-v4-flash switches=0 usage=in=6506,out=32767 latency=273398ms (by ds-call.mjs 链)

[仅推理无正文,finish=length]
Need produce adversarial review, Chinese. We are reviewer Gate Two? Actually F-LINT-02 door two review after reincarnation deepseek. Need check incremental issues B-1/W-4/decl count. We need inspect final diff/new file. Need find defects with code evidence. We need output [B|W|N]+ line final verdict? "输出 [B|W|N]+一行总评（可否放行）" Probably each finding prefixed B/W/N? Need produce list.

Need thoroughly analyze code for deviations, boundary defects, silent failures, test blind spots. Need evidence line numbers or excerpts. Need be careful.

Need understand context. F-LINT-02 about duplicate constants lint. Need review implementation. They mention prior findings B-1: corrupt exit=1 not realized; now corrupt flag CLI exit, mount hard. W-4 collection top-level limited SourceFile direct children; W-1 bigint; W-2 .spec exclusion; W-3 truncation. Need verify.

Let's inspect architecture.

Files:
package.json add script.
check-locks.mjs includes baseline json protected.
check-quality.mjs import scanDuplicateConstants, formatDupDetails, clipped from check-dup-constants.mjs. In check-quality, root = process.cwd; violations; after CSS checks:
```
const dupResult = scanDuplicateConstants(root)
for (const v of dupResult.newRed) violations.push(`dup-constants: ${v}`)
if (dupResult.corrupt) violations.push(...)
for (const line of clipped(formatDupDetails(dupResult))) console.log('  ' + line)
console.log(...)
```
Then if violations.length > 0 exit 1. No corruption hard? violations push "dup-constants baseline..." and code perhaps only reads baseline no fails? Actually scanDuplicateConstants if corrupt returns entries=[] and exits? Let's examine.

check-dup-constants.mjs full 243 lines. Need inspect.

Potential bug: In collectDeclarations, regex excludes any path containing .test. or .spec.:
```
const files = walk(join(root, 'src'), (p) => /\.(ts|tsx)$/.test(p) && !/(\.test\.|\.spec\.)/.test(basename(p)) && !p.endsWith('.d.ts'))
```
Wait walk from root src with predicate receives absolute file path *p*, not basename. They use basename(p) inside regex only? Actually regex `/(\.test\.|\.spec\.)/.test(basename(p))`, good. But first ` /\.(ts|tsx)$/.test(p)` on full path? Path includes e.g. `.../src/foo.ts`, fine. But if path has parent directory ending .ts? unlikely.

Top-level collection: walk all ts/tsx under src excluding test/spec/d.ts. Then create SourceFile. For statements of sf.statements:
- if !ts.isVariableStatement(stmt) or const flag absent continue
- exp = stmt.modifiers?.some(export)
- for declarations...
Potential issue: SyntaxKind.Const = NodeFlags.Const? Let's check TS API: ts.NodeFlags.Const = 16384? Actually declarationList.flags & ts.NodeFlags.Const yes. VariableStatement has declarationList with flags; const is NodeFlags.Const. For `export const foo = ...`, statement is VariableStatement, declarationList flags includes Const. Fine.
- Does SourceFile statements include `declare const`? If .d.ts excluded, no global declarations maybe `.ts` can have `declare const` in a script file? Top-level statement `declare const foo` is VariableStatement? Yes, may have declarationList? Actually a VariableStatement can have modifiers including DeclareKeyword? Need TypeScript AST for `declare const foo: number`; likely VariableStatement with declarationList flags Const? Wait `declare` statements don't have initializer, so ignored. You can't have `declare const foo = 1` except ambient error. Not relevant.
- Export declarations with modifiers: `export const` has ExportKeyword modifier as `stmt.modifiers` or in newer TS? TS AST for export const has `modifiers` property (NodeArray<ModifierLike>) since TS 4? There is ambiguity in older TS, but likely yes. For `export default const` not allowed. For `const` top-level no export. Good.

Need verify line counting etc.

Potential bugs:

1. `walk` function inside module global no `filter` maybe from source root. In collectDeclarations, `walk(join(root, 'src'), predicate)`. root passed from process.cwd in scripts. okay.

2. circular dependency? check-quality imports from check-dup-constants.mjs; check-dup-constants CLI conditional uses `process.argv[1]` and import.meta.url. Fine.

3. Problem `check-quality.mjs` root defined before import? Actually import static at top imports functions from `./check-dup-constants.mjs`; no issue.

4. Potential silent failure: `scanDuplicateConstants` reads baseline JSON from `join(root, BASELINE_PATH)`. If `scripts/dup-constants.baseline.json` does not exist, `corrupt = false`, `entries=[]`, so all red groups become newRed. Good.

5. But if baseline JSON valid syntax, but missing entries field, entries = []; newRed all red groups; no corrupt. Could silently ignore malformed baseline lacking `entries`? If `parsed?.entries` undefined, entries=[] not corrupt. Is that intentional? Baseline damage? JSON parse valid but not expected shape. Ticket B-1 says "corrupt=解析失败" maybe only parse failure. Their comment says "损坏=解析失败" in baseline. They don't validate schema. So if baseline file accidentally changed to `{"entries": null}` or `{}` (valid JSON) then baseline is effectively empty and all red groups become violations (hard intercept) not silently pass. Actually hard intercept because all preserved 8 groups become new Red. But if baseline accidentally set entries to arbitrary fingerprints? Could be tampered? lock review. If `entries` undefined treated as no baseline means newRed nonzero -> exit. Not silent. Good but maybe red diagnostics misleading. If `entries` empty array deliberately no locks. Fine.
What about valid baseline but extra/missing comma causes parse failure, corrupt true and CLI exit. Good.

6. CLI exit semantics: 
```
if (r.newRed.length > 0 || r.corrupt) { exit(1) }
console.log pass
```
If `corrupt` true and no newRed then CLI still prints "红层 0 baseline..."? It prints pass? Wait code:
- Earlier:
```
if (process.argv[1] ... ) {
 const details...
 console.log(...)
 console.error(`B-2...`)
 if (process.env.DUP_CONSTANTS_B2 ...)...
 if (r.newRed.length > 0 || r.corrupt) {
   console.error(`dup-constants 检查未通过...`)
   process.exit(1)
 }
 console.log(`dup-constants 检查通过...`)
}
```
If corrupt true, it will print pass? No, it doesn't reach final because exits after console.error. If corrupt true but entries=[] and redGroups e.g. all baseline hits were removed? Let's understand: `corrupt` triggers if parse failure. In catch, entries=[] and corrupt=true. Then scan red groups. Since newRed empty only if no red groups currently outside baseline? But with entries=[] baseline absent, all red groups that exist would be newRed. But if all red declarations removed/renamed? NewRed empty, baselineHits empty. If `corrupt` true and no red groups, exits 1 due corrupt. Good.
In check-quality if corrupt with no red groups, violations push corrupt; exit red. Good. Both paths.

But there may be no red group and baseline corrupt, check-quality? pushes corrupt line in violations. Fine.

7. In check-quality.mjs, printed details via `clipped(formatDupDetails(dupResult))`. formatDupDetails only includes baseline hits + warn groups; doesn't include newRed because newRed pushed to violations and printed later. So check-quality's `console.log` info only baseline/warn, red violations printed only on failure in error section, not initial console. Fine. If newRed, no "scan X..."? Actually always console.info "dup-constants：扫描..." etc includes newRed count. Then error list includes all violations with dup-constants. Good.

Need inspect whether import of TS module is okay in node script. `import ts from 'typescript'`. package.json? App likely has `"type"`? check-locks? using .mjs. TypeScript dependency? package may have typescript installed dev dependency. Likely yes since tsc scripts; but `npm run lint:dup-constants` direct node will need `typescript` package resolvable. scripts live root; node resolves from root node_modules. Fine.

8. Could be path normalization issue in baseline file "src/..."; collectDeclarations returns relative root with forward slashes. Good.

9. Important: top-level collection only checks `SourceFile.statements`, but for TSX, "export const Foo = <div>.." no literal; okay. But what about `export const x = (1)`? literalOf handles ParenthesizedExpression, then Numeric literal. Good.
Computed key? Not relevant.
Object constants not collected. Good.

10. Case: multiple variable declarations with same literal:
`const A = 100, A = 100` invalid duplicate? Same file? If two declarations in same statement with same name impossible at scope maybe. Red grouping: by name+kind+value; if same name value in same file multiple times (e.g. `const A = foo ? 1:...` no). Usually same name can't duplicate. For warn, same value with multiple names maybe same file; then filter cross-file and distinct names. Good.

11. `redGroups` includes declarations where same name+value appears in >=2 files. If same file contains same name/value repeated in multiple declarations? E.g. `export const X=1; export const X=1` impossible. If there are two separate files? Good. They don't count file multiplicity? `decls` each declaration. If a file contains two declarations of same name due namespace shadow? e.g. `src/a.ts`:
```
const FOO = 'x'
namespace N { export const FOO = 'x' }
```
collect top-level only first; second inside namespace not collected. Good. If two declarations same name top-level in separate modules can't happen in same file? A file can have two `const FOO` in separate `if` blocks? Not collected. Top-level cannot duplicate. So no subtle.

12. W-4 demanded "SourceFile direct children" and import. But regex and AST collects all declarations in `sf.statements` that are `VariableStatement`, but that includes statements nested in `if`? No, only top-level direct. Good.

But is `const` declaration inside `export namespace` excluded? Yes.

Need verify baseline expectation vs actual current source? Maybe compare actual files? We don't know repo content. Need infer from diff and baseline. Need see "实测 8 组（对拍修正：终裁 §4 预估 6 组漏算了 ...)" They changed baseline to 8? Actually comment says "实测 8 组" but entries list? Let's count entries: 8? ACTION_FAILED, OP_FAILED, COLUMN_GAP_H_FACTOR, COLUMN_GAP_PAGE_RATIO, btn, STATUS_POLL_MS, TAG_OP_FAILED, ITEM_STYLE = 8. But earlier final design §4 estimated 6? They now comment in baseline says "实测 8 组（对拍修正：终裁 §4 预估 6 组漏算了 '操作失败' 组内的 ACTION_FAILED×3/OP_FAILED×4 同名子对，按 §2.3 判据同名同文案跨文件入红层，以 §4『对拍通过为验收』为准）" However in original context, prior "声明 149→141——8 baseline+3 warn 组零变化，B-2 91→83" indicates 8 baseline. Wait they say "实测 8 组", baseline entries 8. Comment contradictory: "预估 6 组漏算了 ... 同名子对" If adding ACTION_FAILED group and OP_FAILED group (2) to 6 = 8. Yes.

Need check "8 baseline" in scan output may include "baselineHits.length" exactly? If actual current redGroups includes 9? There could be mismatch.

Potential issue: baseline `_comment` says "实测 8 组". Whatever.

Need compare count 141 declarations? Need no source. We can reason about B-2 91→83. In dry-run earlier count? Not enough. But abstract.

Need identify actual implementation bugs:

- Bug: In `literalOf`, for `as T` stripping, they loop while `ts.isAsExpression(n) || ts.isSatisfiesExpression(n) || ts.isParenthesizedExpression(n)`. But TS AST for `const x = -1 as const`: outer AsExpression, expression is PrefixUnaryExpression(-). They handle PrefixUnaryExpression numeric, good. For `const x = (1 as const)`: Parenthesized then As? Actually with parentheses and `as` precedence. Good.

- Bug: `normalizeNumber` returns `String(Number(text))` for all numeric literal text. This can mis-normalize very large integers, where Number exceeds safe integer, and also decimal precision? The design "15_000≡15000, 1e3≡1000". It doesn't handle hex, octal, binary numeric literal? In TS, NumericLiteral text includes e.g. `0x10`, `0b1010`, `0o17`. `Number('0x10')` -> 16, `Number('0b1010')` -> 10, etc. String output "16"/"10". That's okay though maybe not expected "hex folds" if same value spelled hex vs decimal? The header only says numerical separators/exponent. It may over-normalize hex as decimal. Is that deviation? Maybe no.

- Bug for negative numeric: `n.operator === ts.SyntaxKind.MinusToken` but there is also `PlusToken`? A `+1` constant not meaningful. Plus sign in source may be AST PrefixUnaryExpression with plus? Could ignore due trivial? If `const x = +2` then `literalOf` returns null because ignores PlusToken. Same value `2` elsewhere with same name might not be detected omitted. But +2 as unary plus rare. Not explicitly considered.
Negative numbers: They handle MinusToken for NumericLiteral. But `-0`? numeric text? `'-0'`? Number('0')? Actually normalizeNumber('-' + n.operand.text) with operand text '0' gives '-0', Number('-0') => 0, String(0) = "0". trivial? [0]. okay.

- `BigInt` double insurance: They filter NumericLiteral text ending /n$/i. However TS AST for bigint literals? According to TS, bigint literal is `BigIntLiteral` with kind `SyntaxKind.BigIntLiteral`? Let me recall. `ts.isBigIntLiteral` exists? There is `ts.SyntaxKind.BigIntLiteral`? Hmm. TypeScript AST supports bigint as NumericLiteral? Wait TS compiler: `100n` token is NumericLiteral? I think TypeScript 2? Actually TypeScript has `BigIntLiteral`? Need know. In TS AST, numeric literal node has `text` "100n"; kind `SyntaxKind.NumericLiteral`? Let's verify from memory. TS `isNumericLiteral` likely returns true for bigint? In JS grammar, BigInt literal is a separate lexical token. In TS compiler, `SyntaxKind.BigIntLiteral` may not exist? Let's recall `typescript` API: There is `ts.SyntaxKind.NumericLiteral`, `StringLiteral`, `NoSubstitutionTemplateLiteral`, `RegularExpressionLiteral`, `BigIntLiteral`? Use TS exhaustive switch maybe includes `BigIntLiteral`? Hmm. Official SyntaxKind in 4.x includes "NumericLiteral = 8" and "BigIntLiteral = 9"? Let's remember AST node kinds: Identifier=... "NumericLiteral", "BigIntLiteral", "StringLiteral", "JsxText", "JsxExpression"...? Not sure. Could be separate. `ts.isNumericLiteral` maybe not return for 100n? Let's recall using TypeScript AST: For AST, a numeric literal node kind is NumericLiteral for `123`; a bigint literal `123n` kind is BigIntLiteral? I think yes in newer TS. But they mention "TS AST 本有独立 BigIntLiteral 节点（天然不收）" and also filter. Is that true? Need verify? If TS AST has BigIntLiteral, then "天然不收"; filter perhaps harmless. But if BigIntLiteral has kind NumericLiteral? Then filter catches. Need not issue.

Potential issue with environment variable "DUP_CONSTANTS_FULL": clipped function reads process.env.DUP_CONSTANTS_FULL. But the code imported by check-quality in linter may not propagate DUP_CONSTANTS_FULL? In shell environment yes. Fine.

- Bigger issue: In check-quality.mjs, they import `scanDuplicateConstants` and call per host. But `check-quality.mjs` may be run on Windows? process.cwd; path with package imports. `basename` function, `replaceAll`, maybe Node version supports replaceAll per package. Unknown but likely modern. Not issue? Could use `/g` for compatibility. package may require Node >=? package.json not shown. `replaceAll` requires Node 15. Might be okay.

- Top-level "SourceFile 直接子级" collection may still include `.tsx` under `src/renderer`? Good.
- `.test.` `.spec.` same path exclusion: They only exclude if basename includes exact `.test.` or `.spec.`. Files like `foo.test.ts` yes. But `*.test-d.ts`? ends .d.ts excluded. `*.spec.tsx` yes. They do not exclude e2e spec files outside src? e2e maybe not scanned because under src? Actually only `src`. If e2e spec is `test/foo.spec.ts` not scanned anyway. okay.
- `.d.ts` excluded with `!p.endsWith('.d.ts')`; but `basename(p)` handles paths. Fine.

Need examine "相同 value with multiple names in warn". They compare strings length >=4. Same text same name in >=2 files red. Same text with >=2 names but only one file? Filter >=2 files and >=2 names; okay. But what if groups have same value, one name occurs in multiple files? Warn if distinct names across group? e.g. value X appears `FOO` in file A and `FOO` in file B, also `BAR` in file B (3 declarations / 2 files / 2 names). Since same value with same name `FOO` cross-file is also red group. The warn group doesn't exclude declarations from red group. It will list a warn for value X even if red group already handles same-name pairs? Let's inspect:
```
warnByKey value only; for each active string non-trivial. push all declarations. warnGroups = groups where >=2 files && >=2 names. 
```
If value X appears as `FOO` in file A and `FOO` in file B and `BAR` in file C. The group of all declarations has distinct names FOO,BAR, files A/B/C, >=2 files, >=2 names -> warnGroup. But also redGroup for FOO. format lists warnGroup "FOO / BAR" even though same name FOO red. Is that intended? Maybe warns on "异名同文案" because there's at least two names? But the presence of "BAR" indicates there are additional non-red declarations. Yet it also double counts. Not a CI failure, info only. Could be noisy but not key.

W-4 and count 141: Could find issue in source? Let's consider how many declarations extracted. In collectDeclarations, for each top-level const variable declaration with literal initializer and identifier. Does it include `const foo = <string>'x'`? literalOf uses type assertion. Good.
Does it include `export default`? no, but "export default" cannot be const? `export default const` invalid.
Does it include `export { FOO }`? no.
Does it include declarations inside `for (const...)`? not top-level.
Potential issue: `const enum`? no.
Potential issue: top-level `const x: 1 = 1`? d.name identifier, initializer numeric 1, okay.
Potential issue: `export const x = 1, y = 2;` two declarations, exp true.
Potential issue: `declare global { const x... }` inside SourceFile statement? no.
Potential issue: `// @ts-nocheck`, no.

Maybe need know from previous prompt: "SourceFile 直接子级限定（RED-6 嵌套用例 exit=0；声明 149→141——8 baseline+3 warn 组零变化，B-2 91→83）". They claim declarations 149->141 because previous top-level regex? Wait top-level regex `^const` may have matched lines starting with const but perhaps some variables in block? A regex over lines could match `const` at beginning of line inside block too. Also with indentation? Maybe dry-run used unanchored? Now AST SourceFile direct children. Need assess if `^const` anchored included lines with leading? It might miss indented const. But W-4 says "收集无顶层限定" previous collected all `const` lines maybe function/block locals. New AST SourceFile direct children. Count decreased. Need maybe issue if some "top-level" declarations in `.vue` SFC scripts? Not scanned likely because .vue not .ts. Not relevant.

Need think about actual requirement/F-LINT-02 design. It targets same-name same-value constants across files, likely in source. But the implementation's SourceFile direct children *only* sees top-level constants. However "顶层/模块级 const（与 dry-run ^const 行首锚同口径，函数/块级局部不收 [门二 W-4]）" yes.

Potential glaring issue: The baseline JSON is placed under `scripts/`. In protected function of check-locks:
```
return [...locks, ...walk(join(root, 'scripts'), (p) => p.endsWith('.mjs') || p.endsWith('.ps1'))].filter exists
```
They add join(root,'scripts/dup-constants.baseline.json') before walk, then filter exists. If file missing, not protected; but file exists in repo. On Windows join? okay.

PowerShell lock protected:
```
foreach cfg in array incl 'scripts/dup-constants.baseline.json'
```
Fine.

Potential issue in lock integrity if someone deletes directory? Not.

Need inspect baseline file's schema not validated against duplicate entries, but not critical.

Potential hard issue: In CLI, when baseline file corrupt, `scanDuplicateConstants` itself prints error using `console.error` *before* main path's final red print? In catch:
```
console.error(`dup-constants 告警：...`)
```
Then CLI after scan prints output and error. That's okay. Check-quality also prints if corrupt in violations. Good.

Potential double counting: In check-quality, violations include red new; if corrupt and entries=[] then red groups baseline group become newRed too, so violations includes both newRed and corrupt line. Good.

Potential issue: `corrupt` flag not exported? It's returned. Good.

Potential issue: If baseline JSON is valid but one entry has duplicate files? e.g. JSON `files:["a","a"]`; Set collapses, `recordedFiles.size=1`; no issue. If duplicate entries same key then recorded map last wins, but no newRed because any recordedFiles match. Not problem.
If baseline entry missing files? parse valid but entry `{"name":"foo","kind":"string","value":"x"}`; `e.files` undefined -> `new Set(undefined)`? Actually code: `new Set(e.files)` where e.files maybe undefined, then later `recordedFiles.size` would error, scan throws, and check-quality crash? Let's inspect:
```
const recorded = new Map(entries.map((e) => [`${e.name}\u0000${e.kind}\u0000${e.value}`, new Set(e.files)]))
```
If entries array contains object without files, `e.files` undefined, `new Set(undefined)` is allowed? `new Set(undefined)` returns empty Set? Wait JS Set constructor: `new Set(undefined)`? Let's verify: `new Set(undefined)` creates empty set I think. Actually Set constructor takes optional iterable; `undefined` coerced to undefined? The spec if argument is undefined, no error? Let's recall: `new Set(undefined)` works? Most built-ins with iterable optional treat omitted and undefined same: Array.from has exception? `new Set(null)` also works? Hmm, `new Set(null)` creates empty Set? Let's test mentally: `new Set([1])`; `new Set(undefined)` yes? In constructor `if (iterable is not undefined)`? I think `new Set(undefined)` returns empty set, no throw. Yes. If no files, recordedFiles empty, red group newRed with drift message. Fine.
If entry not object, e.name undefined, no issue maybe.
If baseline entries include duplicate keys but mismatched files, last wins; newRed if actual matches first not second? Could be drift. Not relevant.

Need compare baseline list "8 groups" with actual 8 groups? The comment says "B-2 副产物未 export constants ... —" Wait baseline file `_comment`: says "对拍修正：终裁 §4 预估 6 组漏算了 '操作失败' 组内的 ACTION_FAILED×3/OP_FAILED×4 同名子对，按 §2.3 判据同名同文案跨文件入红层，以 §4『对拍通过为验收』为准". Does "6 + ACTION_FAILED + OP_FAILED = 8" yes. But "group" semantics: The original "操作失败" value likely has 7 declarations with various names. Red groups ACTION_FAILED and OP_FAILED are two separate same-name groups. Good.

Potential finding: baseline comment claims "实测 8 组" but output stats `groups: redGroups.length + warnGroups.length` not include baseline? If redGroups count includes ACTION_FAILED/OP_FAILED plus others =? Let's count all same name+value entries in baseline:
1 ACTION_FAILED
2 OP_FAILED
3 COLUMN_GAP_H_FACTOR
4 COLUMN_GAP_PAGE_RATIO
5 btn
6 STATUS_POLL_MS
7 TAG_OP_FAILED
8 ITEM_STYLE. likely all red. Good.
Warn 3? maybe other same value with multiple names in files, unknown. Stats message `跨文件同值组` says groups red+warn. In CLI if newRed exist, then counts include new groups. Good.

Need inspect the phrase "门二 B-1 hard 双路径" maybe they added a second path in mount. But check-quality "挂点 violations" if dupResult.corrupt? yes. Yet in `check-quality.mjs`, after scanning, `for (v of dupResult.newRed) violations.push`, then if corrupt push. But if baseline corrupt and no red, red? corruption line only. However, check-quality may not always run `scanDuplicateConstants`? It always imported. yes.
But does check-quality return non-zero if `violations` already non-empty? Yes.

Potential issue: `DUP_CONSTANTS_FULL=1 env bypass` in CLI details. `formatDupDetails` doesn't include newRed; when newRed non-empty, if not full, output clipped to first 20 *baseline + warn details*, while red violations (newRed) are printed to console.error separately without clipping? Wait CLI:
```
const details = [...r.newRed.map(v => `[红] ${v}`), ...formatDupDetails(r)]
console.log(...)
for (const line of clipped(details)) console.log('  ' + line)
...
if red exit...
console.error("dup-constants 检查未通过...")
```
Red newRed are in `details`, and `clipped(details)` is applied to full details. It will truncate to 20 lines (red lines first) if >20 red lines, so it *does* truncate red lines in the initial console log, but this doesn't affect exit. The final console.error just aggregates counts, not lists. In "拦截语义不截断", their mount pushes newRed as violations full. In CLI, if many newRed groups, the console output is truncated by clipped? Wait in `details`, red lines are first; `clipped(details)` truncates at 20; if >20 red, prints first 20 + "输出超 20 行已截断". But semantics maybe not needed? Design says "CLI 与挂点两路径同走 clipped 20 行截断; newRed=红走 violations 全量（拦截语义不截断，与各段一致）" In CLI yes there is no separate violations full. If exit=1 due newRed but clipped prints only first 20, there is technically no final list of all reds, only count and first 20. Does "拦截语义不截断" mean only matter for check-quality violations. Need not red? Hmm their ticket says "newRed 走 violations 全量=拦截语义不截断" likely refers mount path. In previous finding W-3: "截断提示不可达" and "DUP_CONSTANTS_FULL=1 旁路+文案准确（探针 25→21/25 行亲验）；newRed 走 violations 全量=拦截语义不截断". Need review if CLI red lines also subject to clip; do they claim CLI with newRed is full? They say "newRed 走 violations 全量" in mount; maybe okay.

But perhaps there is a bug in `clipped` when details contains red lines: A user running CLI gets only 20 red lines, not full, despite DUP_CONSTANTS_FULL needed for full. Is that intended? W-3 maybe all outputs clipped. Ticket says "newRed 走 violations 全量=拦截语义不截断" maybe from final design. Let's look at prompt: "W-3 截断提示不可达 | DUP_CONSTANTS_FULL=1 env 旁路+文案准确（探针 25→21/25 行亲验）；newRed 走 violations 全量=拦截语义不截断" This says both CLI and mount? Actually "DUP_CONSTANTS_FULL=1 env 旁路 + 文案准确" and "newRed 走 violations 全量=拦截语义不截断" separate. Maybe they configured "CLI 明细截断，但红层全量输出到 stderr"? Need inspect final code: CLI array details does not separate newRed from format details; all line through clipped. Their mount pushes full red. If linter runs `check-quality.mjs`, full red in violations. But if someone runs CLI, red groups among first 20 only; if more than 20 red groups, some hidden unless env full. Is that acceptable? Design says "CLI 独立跑 exit 1=红层新增/漂移" maybe "红层新增" must list. If truncation hides groups beyond 20, user can set env. The env makes full available. Not a silent failure? If more than 20 red, they see first 20 and error count, and hint to set env. That's okay.

But is the hint "输出超 20 行已截断——设 DUP_CONSTANTS_FULL=1 看全量" printed when `r.newRed.length + baselineHits.length + warnGroups.length` details >20. Yes in CLI. Mount path also prints details to console.log and if many baseline+warn lines truncates. Good. In check-quality violations full newRed. Good.

Potential bug: In check-quality output, `formatDupDetails` lines are printed to console.log before error list, with `clipped`; if newRed groups are not printed until error. If check-quality passes (no violations), no issue. If fails due pre-existing red, error list includes red. Good.

Need look for duplicates by "same-name same-value" in files over 2; but if same-name same-value occurs at namespace? Not counted but public "value" could be used through namespace. However requirement perhaps "同上同值跨≥2文件" of constants declared at top-level? Wait prompt says "同名同值跨 ≥2 文件即红（项目约定：跨文件两处即红，非 Rule of Three）"; It doesn't state top-level. A later requirement W-4: "收集无顶层限定" probably demanded top-level? Actually W-4 "收集无顶层限定 | SourceFile 直接子级限定" They addressed. So all true.

Potential issue: collection only `const`, not `let` or variables through export? They target duplicate constants; "const". okay.

Potential issue: large file scanning all ts/tsx may include generated files or vendor from `src` not excluded? walk skips only node_modules/out/dist/.git. It includes `src/**/*.gen.ts` maybe generated constants; baseline may need lock. Not specified.

Could there be issue with `walk` collecting `.tsx` but using `ts.createSourceFile` on `.tsx` without setting script kind to TSX? Actually they parse all with ScriptTarget.Latest, but default `setParentNodes` true; no language variant. TypeScript parser cannot parse `.tsx` unless `ScriptKind.TSX` passed? This is crucial! Let's check `ts.createSourceFile(fileName, text, languageVersion, setParentNodes, scriptKind?)`. If fileName ends `.tsx`, does compiler infer script kind? I believe `createSourceFile` sets `scriptKind` based on file extension if not provided? Let's inspect TS internals. Function `createSourceFile(fileName, sourceText, languageVersion, setParentNodes, scriptKind)` with optional scriptKind. If not provided, it calls `getScriptKindFromFileName(fileName)`, so `.tsx` gets TSX. In TS compiler API, yes scriptKind inferred from extension by default. Thus okay.

But `ts.isVariableStatement` and AST for TSX works. Good.

Potential issue: TypeScript module format? The `.mjs` uses `import ts from 'typescript'`. TypeScript package is CommonJS, default export to ESM works? Node ESM can import CommonJS default; yes.

Potential issue: `ts.SyntaxKind.NullKeyword`? In SourceFile parse, null keyword kind is `NullKeyword`; okay.

Potential issue: In `literalOf`, for StringLiteral with `kind: 'string', value: n.text`, if using `String.raw`? no. Template without substitutions is NoSubstitutionTemplateLiteral, n.text content. If template uses escaped sequence, TS AST parsed. Fine. But "无插值 TemplateLiteral ≈字面量计入" they did. If string literals with different quote forms normalized because value n.text. Good.
- as const string: they peel then string.
- `const x = \`a\` as const`: Peels.
- `const x = ('a' as const)`: parenthesized loop recursively.

Could be issue: Node flags/directives with "const" declarations from `export declare`? not.

Need inspect "same value + name but different kind" separated by key kind, so `FOO = 5000` and `FOO = '5000'` not red. Good.

Potential issue with "W-1 bigint NaN 归并" They excluded bigint but also NaN? Literal `NaN` is Identifier, not literals; not caught. `Infinity`; not. "bigint NaN 归并" maybe W-1 touched normalizeNumber NaN? Wait W-1 says "bigint NaN 归并 | /n$/i 双保险排除入边界矩阵". Could be "bigint NaN" means "bigint, NaN" filters merge? Let's parse prior W-1: "bigint NaN 归并" maybe W-1 issue was BigInt with ending n and "NaN" (?) being normalized incorrectly with Number. They now filter /n$/i. But what about `Number(text.replace(/_/g,''))` with text "NaN" never NumericLiteral. Not.
But for numeric literals with separator (e.g. `1_000`), TS AST `text` is "1_000"? likely yes. For exponent, text "1e3"; normalize good. For hex `0x10`, text "0x10"; Number yields 16. For octal "0o10", 8. For binary, 2. But if another literal decimal "8", normalize returns "8": they'll merge 0o10=8. Is same semantic value. Fine.

Potential issue: For negative hex `-0x10`, `n.text` operand "0x10", normalizeNumber('-'+"0x10") = Number("-0x10") -> -16. okay.

Potential issue with numeric separator plus sign? no.

Potential issue: `literalOf` fails on `const x = +100` but 100 trivial? if +100 then not collected. Could be relevant if constant name same "MAX_X=+100" duplicated. Unary plus constants are rare. Does design require? Probably not.

Potential issue: "trivial set {0,1,-1,true,false,'',null}" but numbers normalized with Number may collapse -0 to "0"; okay.
What about `1_0` text with underscore? normalizeNumber -> "10"; trivial? `1_0` semantically 10; not [0,1,-1], so not trivial. But `1_0` not 1. Fine.
What about `1e0` => 1, trivial? if actual value 1 but text `1e0`, Number(text.replace) =1, isTrivial true. That's semantically a trivial number 1; rule says literal 1, should it be trivial by semantic value? likely yes. But if `1e0` is weird. Not issue.

Potential issue: baseline path via `join(root, BASELINE_PATH)` but baseline file may have trailing newline/BOM; handled. good.

Potential issue: cross-file file set uses actual file list; if duplicate name/value appears in file A and file B, but one of declarations unused? no.

Potential issue: In check-quality, root = process.cwd assumed project root. Existing checks likely same. But if invoked from subdirectory, wrong. Existing.

Need maybe use code line numbers? We don't have line numbers except diff line numbers? Need provide code excerpt enough. Prompt says file:line no. We can cite approximate. But need only code evidence; maybe full file no line numbers. Could use line from snippets. Need maybe line number count in file? check-dup-constants 243 lines, but in final answer can cite line range based on header? Hard to know exact line numbers. But can cite function excerpts without line numbers? They ask "每条给出文件:行号或代码摘录". Code excerpt enough? Need perhaps count approximate lines as copied? Could use "check-dup-constants.mjs collectDeclarations: ..." to be enough? We should aim with line numbers. Can estimate from pasted file? We can count? Let's count? Since final response can include file and functions; not essential line number if code excerpt. But requirement says file:行号 or 代码摘录. Maybe include code excerpt.

Need produce likely final verdict. Need decide if any Blocker/Weakness/Noissue.

Let's deeply inspect code and semantics for holes. Important to catch actual bug.

Let's map all possible execution paths to spec "final design §2 six criteria":

1. "红层=同名同值跨 ≥2 文件"; no rule of three. Code does exactly for all active collected. But "同名同值跨 ≥2 文件" perhaps means same constant identifier in at least two files. It doesn't require all occurrences be same value? yes.
2. trivial exempt. Code: number value '0','1','-1'; boolean, null, empty string. But doesn't exempt string `'0'/'1'/'-1'/'true'/'false'/''? Wait trivial set from prompt "{0,1,-1,true,false,'',null}" only includes empty string, not string "true"/"false"/"0". The prompt perhaps "trivial {0,1,-1,true,false,'',null}" in code comments. Why no string "0"? Not required? If same string "true" duplicated cross-file, e.g. `const TRUE = "true"`, would be red. Is that "trivial"? The rule says exactly. Fine.
3. "文案不豁免: 同名同文案入红; 异名同文案 warn". Code defines same name+kind+value. For string values length >=4, same value with different names warns. But if names include same name among group and different name? Explanation. Maybe per criterion "异名同文案 warn" means group by exact common text grouping; if a text appears with names `A` in two files and `B` in one file, then there are same-name duplicate (red A) and same text also has at least two different names? The text group has total 3 declarations and 2 names across 3 files. Warn likely should be generated because "B" duplicate with "A"? It is indeed heterogeneous. Perhaps should exclude files/decls that are already red? If red group `A` across file1/file2, those two are same name. But if another file has `B`, there is one B; if a warn is generated because names differ by group count >=2, text appears in three files where two files have A and one has B. Are A and B "异名同文案跨 ≥2 文件"? Yes, same string appears under different names in at least two files? Need group-level names set has A and B. It does not matter if A also same across files. The count of decls across names means cross-naming exists. But if same value appears under FOO in files A,B only and under BAR in file A only, positions? Let's construct:
- FOO in file1
- FOO in file2
- BAR in file1
warnGroup (value X) has 3 decls, files=2, names=2 (FOO/BAR), so it warns. Are there "异名同文案" across *two files*? BAR exists only in file1, FOO exists file1/file2. Between same-value declarations, there are different names across files: `FOO` and `BAR` both in file1, which is same file; but `FOO` in file2 no BAR. Is a cross-file "异名" contrast only if names differ across files? Let's decide group redundancy: The warn criterion 文案不豁免: "异名同文案（字符串值长度≥4）warn 不卡 CI" Could mean if same *string literal value* appears under different identifiers and different files, but because same name may already red. In our case text appears under FOO and BAR in same file1, and FOO in file2. There is not a pair of same-value constants with different names in different files? BAR's value doesn't duplicate a different-named constant in a different file? It duplicates FOO in the same file; but same-file is exempt from red and warn? Wait "异名同文案" should probably be cross-file too. Because "跨 ≥2 文件" for same value. Does code's warn filter `>=2 files` for group; if FOO in file1,file2, BAR file1, group's files includes file1 and file2; thus passes. But if requirement demands there exist at least one value pair across different file where names differ, maybe not all group. Need algorithm could inadvertently warn for text that only has same-name duplicates across files plus an extra same-file different name. But same-name duplicate already red, so warn adds no new info.

More importantly, if same-named red group FOO across file1/file2 and same-named red group? Actually if all cross-file duplicates are same-name red, and no cross-file different-name duplicates, warn should arguably not fire. But code may fire if extra same-file different-name declaration exists. Is that a defect? It only warns not fails; design perhaps info "异名同文案". But if "异名同文案" same value text with different names in same file maybe local; the design "异名同文案 ... 跨 ≥2 文件" perhaps group-level. Need understand W or B? Might be minor. Could mention as W? Need not if not asked? We need only report supported issues. Since output expected maybe not too many speculative.

Let's find more serious.

Baseline locking:
- If baseline JSON parse has trailing comma, corrupt.
- If baseline JSON parse okay but `entries` not array, they set `entries=[]`, not `corrupt=true`. Is baseline with `entries: "foo"` corrupt? It is valid JSON but wrong shape. B-1 fix called for "corrupt=解析失败" and "损坏（解析失败，已按空处理+硬拦截）". They only catch JSON parse failure. If file is valid JSON but semantically invalid/missing entries, maybe not considered corruption. Let's inspect:
```
try {
 const parsed = JSON.parse(...)
 entries = Array.isArray(parsed?.entries) ? parsed.entries : []
} catch ...
```
If `entries` absent or `entries: {}` then baseline empty, causing all current 8 red groups to appear newRed. That is hard red but message says "baseline 外新增——收敛到..." not "baseline 内容结构错误", misleading. If `entries: []`, no red? The file is a valid baseline with no entries. But if current reds exist, all newRed -> hard. So no silent pass. But if entry shape missing e.g. entries contains `{"name":"ACTION_FAILED","kind":"string","value":"操作失败","files":["src/a.."]}` okay. If `files` missing, red group may be newRed because recordedFiles empty? Actually if baseline entry is recognized but files absent, `recordedFiles` empty, so any red group matching key gets newRed with drift note. Hard. No silent pass. If baseline entry with extra file in list not currently actual -> redgroups? If actual file set subset -> newRed because recorded size mismatch, hard. Thus no soft pass except adding extra entries? Wait adding extra arbitrary entries to baseline could make a current red group considered baseline only if entries files exactly match. A malicious human adding extra baseline entry with current red fingerprints and file set would allow new duplicate to pass by pre-recording it, but that's via locked-change/human review. Not automated bypass.

Could be issue if baseline JSON has duplicate keys: parsing last? no.

Need check "corrupt independent of newRed" If baseline parse fails and entries empty, but *there is a redGroup* then newRed nonempty and also corrupt. If no redGroup, newRed empty, corrupt red. Both exit. So independent? It is combined with "if newRed.length >0 || corrupt"; yes corrupt independent. If there are red groups that match a baseline that has *also* malformed entries? No; if parse fails, no red baseline, all red groups become newRed. But if no red groups currently, exit due corrupt. Good.

Potential issue: If baseline file is corrupt and user sets DUP_CONSTANTS_B2 etc, no matter.

Potential issue in script comments "corrupt 标志→CLI exit=newRed>0||corrupt+挂点 violations 硬拦截——红证两路径（f-lint02-red-corrupt-{cli,mount}.raw.txt）；" They claim red evidence generated two paths. Need not verify current.

Let's inspect check-quality.mjs diff: It leaves previous final log message:
```
-console.log('quality 检查通过：无占位标记 / 无乱码 / 无跨域引用')
+console.log('quality 检查通过：无占位标记 / 无乱码 / 无跨域引用 / 无同值双常量新增')
```
But if violations.length >0 due earlier checks, function exits before duplicate check? Wait duplicate check is located before final if. If earlier violations existed, duplicate scan still executed and prints quality check not passed? Actually code has:
```
const dupResult = ...
...
if (violations.length > 0) {
 console.error('quality 检查未通过：')
 ...
 process.exit(1)
}
console.log('quality 检查通过：...')
```
Duplicate scan happens after CSS checks; if earlier violation from placeholders, then scan plus logs before exit. good.

Potential issue: `formatDupDetails(dupResult)` in check-quality outputs `[baseline 待收敛]` lines before quality error. If many baseline, clipped. Fine.

Potential issue in stats in check-quality: ``红层 ${dupResult.baselineHits.length} 组 baseline 待收敛（F-LINT-03 候选）、新增 ${dupResult.newRed.length} 组、warn ...`` But if baseline corrupt with no newRed, baselineHits=0, newRed=0 but violations due corrupt; log says `红层 0 组 baseline ... 新增 0 组`, doesn't mention corrupt? It did include line by violations. Not fatal.

Need review line count declaration "声明数变化 149→141" maybe implementation's `decls` count includes only declarations with literal initializer. Previous regex could have counted `const` declarations that were names without literal? They mention "B-2 91→83" maybe after top-level limited, number of unexported literals decreased. Need self-consistency with baseline and warn zero changes. Could inspect code for potential "decls.length" includes "export" and "non-export" but no need.
But consider `collectDeclarations` only collects declarations with literal *initializer* from `d.initializer`. Previous regex `^const` may count declarations not literal or unusable e.g. `const obj = {}`; now excludes. So declarations 149? Prior 149 maybe top-level regex `^const` across all files had 149 literal candidates? Hmm.

Let's focus on a likely bug: In collectDeclarations, `line` uses `d.name.getStart(sf)` which may return -1? no.
Potential issue with `getStart` inside string literal? no.

Potential issue: `const enum`? no.

Potential issue: exclude `*.d.ts` but source files may have `.d.mts`? not.

Potential issue: walk only `src`, but baseline includes files under `src/renderer/...`, okay.

Potential issue: lock file update registration:
- check-locks and ps1 protect baseline JSON. package script "lint:dup-constants" added but is it protected? not pertinent.
- check-locks.py? There is check-locks.mjs and lock-protected. Need lock protected maybe should include check-dup-constants.mjs itself? Since check-locks walks scripts/*.mjs and includes check-dup-constants.mjs, so changes to check-dup-constants require locked-change? check-locks's protectedFiles likely used for a lock service to detect modifications with tag. Since mjs included via walk(scripts). ps1 also includes .mjs? Wait `lock-protected.ps1`? Let's inspect diff: It adds baseline json to explicit list. But check-dup-constants.mjs itself under scripts is maybe protected? In `Get-ProtectedFiles` maybe has also `$scriptFiles = Get-ChildItem $scriptsDir -Filter *.mjs`. Need snippet not full but likely includes all .mjs? Diff only explicit list plus? It may have included already all scripts/*.mjs in an algorithm? Let's not know. check-quality imports from check-dup-constants.mjs; not an issue.

Could be big issue: Static `import ts from 'typescript'` in check-dup-constants.mjs is okay, but `typescript` dependency may not be in production dependencies? `lint:dup-constants` and `lint` run in dev. If baseline "check-quality.mjs" run in CI after `npm ci` (includes dev dependencies by default), okay.

Need think about infinite recursion:
`walk` `statSync(p)` on symlink? no.

Potential issue: "files = walk(join(root,'src'), predicate)" if `src` doesn't exist: `readdirSync` throws, causing quality check crash rather than handle empty repo. Does repo always has src. Fine.

Potential issue: Quality check previously had checks for CSS files etc; if `src` absent no? no need.

Potential issue: `basename(p)` in collectDeclarations after walk uses function declared below but function hoisted due function declaration. Fine.

Potential issue: Strictness of filter for .test/.spec:
```
!/(\.test\.|\.spec\.)/.test(basename(p)) && !p.endsWith('.d.ts')
```
Since p is absolute; basename lower? Not case-insensitive. File extensions are case-sensitive? Windows may `Foo.SPEC.ts` not excluded. Test files may rarely uppercase. Not issue.
`basename(p)` returns e.g. "foo.test.ts" and matches; "foo.bar.spec.tsx" matches. "foo.spec-d.ts" ends d.ts excluded. Good.

Potential issue: `isTrivial` for string `''`: string literals text after escapes includes e.g. `'\u0000'` text is `\0`? n.text is actual U+0000. Not empty. Not.

Potential issue: "same value bool/null/ empty string trivial" If value is boolean false, they don't consider string "false"; okay.
What about number `-0x1` -> value "-1", trivial? normalizeNumber('-'+'0x1') = String(Number("-0x1")) = "-1" => trivial. Good.

Potential issue: "宁漏报不加噪" but they add warn for text strings length >=4. The six criterion says warn not in "no-noise"? not.

Let's examine "as const / as T / satisfies / 括号包裹剥壳计入（[门一 C-2]）；负数字面量剥 - 壳计入（-1 落 trivial 豁免）；computed key / 对象常量 / 插值模板 / bigint 天然排除". Code does not strip `satisfies` if `satisfies` operator retained in expression as SatisfiesExpression. It handles.
But does it handle `const x = { foo: 1 };`? excluded because no literal. yes.
Does it exclude computed keys? no issue.
Does it exclude TemplateLiteral with expressions? `ts.isNoSubstitutionTemplateLiteral` false; `ts.isTemplateLiteral` true but not collected. good.
Does it exclude tagged templates `<string>`? no.

Potential issue on "无插值 TemplateLiteral ≈ 字面量计入": A NoSubstitutionTemplateLiteral whose text is e.g. `\n` raw? It includes actual text. Good.

Potential issue: In `fingerprintOf`, group name is `group.name` from ds[0]. Since red group grouping by `${name}\0${kind}\0${value}` all decls same name, okay.

Potential issue: "warn groups with no red conflict": Suppose two different names share same value in same file and one file only; code requires >=2 files and >=2 names. If only same file, no warn; same-file exempt. good. If there are two files file A has `X=val`, file B has `Y=val`, group files=2 names=2 -> warn. good.
If file A has X and Y, file B has X and Y (2 duplicate pairs), code produces one warn group for value val with names X,Y? If same text string; if red grouping names X and Y in each file -> red groups X,Y. Warn also list names X/Y. Duplicate diagnostics. But not harmful.

Need think of issue with "same-name same-value in ≥2 files" and export/non-export. It doesn't distinguish exported vs local. A local constant in file A and exported constant in file B with same name/value get red. Is that intended? "同名同值跨 ≥2 文件" presumably yes, regardless export. They collect both exported and non-exported; B-2 separately says unexported. Good.
But a constant named `foo` local with no export may not be visible but still duplicate; design may still flag because cross-file duplicates are layout smell. Fine.

Potential issue: Does `ts.NodeFlags.Const` include `const` declarations in `export default`? no.

Let's examine B-1 path in check-quality if baseline corrupt but newRed existing from all red groups. The violations get "dup-constants: baseline 损坏..." plus red group lines. On check-quality error, it says quality check not passed and includes baseline corruption. But if red group lines are many and baseline is corrupt, it also tells convergence newRed not baseline. It may be a bit misleading but not blocker.
CLI if baseline corrupt and red groups exist: It prints red details as `[红] NAME ...（baseline 外新增——收敛到...）` because entries empty, plus exit message says "红层新增/漂移 X 组；baseline 损坏". It doesn't mistakenly pass. Good.

Potential issue: `scanDuplicateConstants` only checks redGroups against baseline recorded entries. If baseline entries include old groups that no longer exist (declarations removed/converged), those entries are simply unused; no violation, no "drift" because only active redGroups checked. Is this intended? "baseline 棘轮=存量真命中放行待收敛" If a baseline-recorded duplicate is removed (converged), the baseline entry no longer has active red group. This is a positive change (shrink), and perhaps should be allowed but baseline should be updated to remove stale entry? They might require [locked-change] for baseline when stale? Wait if baseline entries should shrink one-to-one, you'd expect if an entry's red group disappears, no harm; baseline contains stale fingerprint but scan won't flag because only redGroups iterated. Could later re-introduce the same fingerprint without newRed? Let's analyze:
- Baseline entry E recorded for group `FOO='x'` files A,B. If actual duplicates go away, no red group for key. If later someone re-introduces the same `FOO='x'` in A,B, scan redGroup key, recordedFiles match current files, so baselineHits -> non-red ("待收敛"), despite the group was previously removed and should perhaps be a new regression. But is that a "drift"? Baseline is a list of pre-existing known duplicates; if a duplicate disappears and reappears, the baseline still describes it. Should it still be considered known? If the process goal is not zero regression but freeze existing set, then re-introducing a previously known duplicate after it was removed should be flagged as new because it wasn't continuous? Maybe not necessarily: The baseline tracks fixed known offenders; convergence tasks remove them; if reappears before baseline file updated? Suppose a developer reduces group by changing one file, baseline entry becomes stale. They did not update baseline because [locked-change] maybe only required when file changes; no file change. If later another developer reintroduces exact fingerprint, scan sees baseline and doesn't know it had disappeared. Is that a "drift"? There is no observable event between "stale baseline entry remains" and "reintroduced"; the scan always sees the group if present, so cannot detect gap. But baseline with stale entries can cause regressions to be silently classified as baseline. That may be a genuine issue: baseline stale entries are not pruned automatically; no warning about stale baseline. Wait would check-locks detect stale? It only protects file, not content. If duplicate is removed from source, baseline remains. The next scan outputs baselineHits=0 because no active group? Actually scan only pushes baselineHits for groups that exist. It doesn't report stale baseline entries. Stats "红层 0 组 baseline 待收敛"; no fidelity of unclaimed baseline entries. If later duplicate returns, because no code changed while absent, baseline still okay. CI passes. But perhaps one should require baseline entries to always correspond to exactly current redGroups? Yet baseline is allowed to be ahead? In robust "baseline 棘轮", delta tracking needs to know whether a fingerprint is newly introduced relative to previous snapshot, but source scan can only know current. Baseline serves as allowlist of known duplicates. A stale entry that's not active means its allowlist is unnecessary. If re-added, it's known to human review from initial baseline; but if it was supposed to be resolved in one branch while baseline not updated, final design might allow? Hmm.

Need see ticket: "B-1 损坏 exit=1 申报未兑现（catch 只告警+事故红兜底） | corrupt 标志→CLI exit=newRed>0||corrupt+挂点 violations 硬拦截——红证两路径...". "baseline 棘轮=存量真命中放行待收敛". "基线棘轮（baseline ratchet)" could mean baseline only allows current known groups. A stale entry is not necessarily problematic? But robust ratchet would update baseline on convergence, not require update? Typically "baseline" static lock file: If code fixes a baseline issue without updating baseline, CI remains green because violation no longer occurs. Stale baseline entries are not flagged, so no need to update. But if regression returns same violation, baseline masks it. This is classic "baseline debt" problem: baseline suppress known debt; removing debt without updating baseline will cause later debt to be suppressed even if re-introduced. Is that acceptable? Maybe yes? It only suppress duplicate known at baseline. If it was removed and reappeared, still same issue as baseline. However, if goal is to eventually eliminate baselines, stale entries should cause baseline update/change. But they're not required by spec.

Original prompt B-2 "B-2 91→83" maybe unexported constants list. no.

Need maybe derive "newRed drift detection" issue:
`if (recordedFiles && recordedFiles.size === fp.files.length && fp.files.every(f => recordedFiles.has(f))) baselineHits`
They don't require entries list exactly equals redGroups. So "新增/漂移" only active. "漂移" only file set changed if same key still active. If a duplicate group worsens (new files added), red. If group reduces, no red. But maybe "converge shrink" should be allowed? They say "收敛删减/漂移须更新 baseline + locked change" Wait baseline comment: "任何变更（收敛删减/漂移）须更新本文件并带 [locked-change] 提交尾注——棘轮位=人类审查." For convergence shrinking, if source changed to reduce a duplicate (e.g. from 3 files to 2) but baseline still says 3 files, scan key recorded? redGroup fingerprint current files size 2 vs recorded size 3 => newRed, requiring baseline update. If completely removed, no redGroup so no newRed; baseline stale. If you completely remove one of 8 baseline groups, should update baseline to 7? If not, stale entry remains and later reintroduction masked. Does lock-protected require updating baseline whenever source fixes a baseline group? The source code change is probably protected? not relevant. The baseline comment says "任何变更（收敛删减/漂移）须更新本文件" but if completely removing group means scan doesn't detect stale baseline, so no automated push. Human must remember. A convergence task likely updates baseline manually. But could be missed. This is a perhaps B or W because ratchet can be silently bypassed if baseline entry is not removed. Need decide severity. It is more subtle and maybe not intended.

Let's search in baseline code: No check for recorded entries not active. Thus stale baseline entries do not fail. Is this contrary to "棘轮" (one-way)? Let's think. "baseline 棘轮比对（§3）：指纹= name+kind+value+文件集（无行号）" A baseline entries should equal known existing groups. If an existing group is fully removed, no `newRed`; "baseline 棘轮" ratchet should allow convergence. But if convergence happens, next scan will no longer output that baseline group. The file still records it but does not count as "baselineHits". Maybe this is okay because no active violation to report; the stale baseline entry is inert until reintroduced. But if later reoccur after convergence, should it be a new violation or known? The spec's baseline definition: "存存量 6 组真命中指纹（name+kind+value+文件集，无行号）。运行时新增/漂移命中 exit 1；baseline 内打印「待收敛」放行（收敛子票 F-LINT-03 候选）" If it was already known as inventory, reoccurring after removal is still same inventory? But a "convergence" ticket would remove it from current state and maybe remove from baseline. If not, baseline should be updated in same commit. Is there process requiring locked-change if baseline file not updated? Maybe if no source duplicate remains, source diff not include baseline. No enforcement. But "收敛子票" likely will update baseline when complete. Not a bug specific to code? Maybe a Weakness: stale baseline entries are not detected/self-pruned, making ratchet an allowlist that can mask return of fully-converged baseline items. Let's consider if we should report as W/B.

Need scrutinize count completeness. How can claim "2门 W-4 SourceFile 直接子级限定" but they use `ts.createSourceFile(f, readFileSync(f,'utf-8'), ts.ScriptTarget.Latest, true)` without `ScriptKind.TSX`. I earlier assumed infer. Let's be absolutely certain TypeScript's `createSourceFile` honors extension by default when no scriptKind? Let's recall API description: `function createSourceFile(fileName: string, sourceText: string, languageVersion: ScriptTarget, setParentNodes?: boolean, scriptKind?: ScriptKind): SourceFile;` If scriptKind absent? There is overloaded `createSourceFile(fileName, sourceText, languageVersion, setParentNodes, scriptKind)`; before TS 4 maybe scriptKind not optional? If omitted, compiler parses TS? Let's verify from TypeScript source: `export function createSourceFile(fileName: string, sourceText: string, languageVersion: ScriptTarget, setParentNodes: boolean, scriptKind?: ScriptKind) { ... if (scriptKind === undefined) { scriptKind = getScriptKindFromFileName(fileName); } ... return parseSourceFile(fileName, sourceText, languageVersion, /*syntaxCursor*/ undefined, setParentNodes, scriptKind); }`. Yes I think getScriptKindFromFileName exists. So TSX parse okay.
If not, parsing `.tsx` containing `<T>foo` as .ts may fail; but imports maybe none? Many TSX files with angle bracket type assertions? TSX disallows angle bracket, uses `as`; if parsed as TS, `<T>...` could parse but not produce expected AST; could parse error but createSourceFile does not throw; statements maybe weird, but no exception. It may miss declarations in TSX if parser fails. However, likely extension inferred.
Could see TypeScript API: `ts.createSourceFile(fileName, sourceText, languageVersion, setParentNodes, scriptKind)` was originally version 5 overload? Need not.

Potential issue with isolated scanning and syntax errors: `ts.createSourceFile` can parse invalid code and produce no errors thrown; if a file under src has syntax error from refactor, it might parse scanner partially and declarations can be missed. But other linter catches syntax. Not.
If parse file with `throw` not.

Potential issue: They don't sort files in walk. Fingerprint sorted files. Declarations order not stable? `readdirSync` order platform-dependent but baseline match sorts files. Decls count etc not independent? RedGroups order from first occurrences. Not important.

Potential issue: If a file appears with Unicode escape in variable name? Identifier `\u0066oo` equality? AST identifier text? Could e.g. constant name `A\u005F`? Identifier text "A_"? I think not. Could mismatch duplicate? no.

Potential issue: If `const x = 'a' as any` with type assertion to string, they peel any. If `as unknown as string`, nested as expressions: while handles AsExpression and loops expression. Good.
If `satisfies string` under TS newer? yes.

Potential issue: "同一常量在多个文件但不同的 alias import" irrelevant.

Potential issue: Existing files with duplicate declarations in same line:
```
const A = 1, B = 1;
```
B has literal too; if A/B duplicate across files in same parent, okay. If in same file only, red group may have same name same value impossible unless duplicate via multiple declarations.

Let's consider the possible line "const A = 1, const B = 2" no.

Potential issue: `literalOf` only handles PrefixUnaryExpression MinusToken around NumericLiteral. Negative of parenthesized numeric e.g. `- (1)`? In JS, `const x = -(1)` AST is PrefixUnaryExpression expression ParenthesizedExpression? Actually with unary minus and parentheses, AST: prefix - with operand parenthesized 1. Code doesn't peel parentheses from UnaryExpression operand; it requires operand NumericLiteral. Therefore `const x = -(5)` not collected, but `const x = ( -5)` is caught (Parenthesized outer, inside prefix). `-0x10` direct caught. Is `-(1)` common? Not likely. Design "负数字面量剥 - 壳计入", maybe means direct. But for robust, should handle parenthesized after minus? Could be W. Similarly `-+1`. Not serious.
What about numeric literal with unary plus, unary plus not caught; not.
Potential issue: String literal constant with `as` is caught. Negative string? no.

Potential issue: In JS/TS, `const x = -1_000_000` AST PrefixUnaryExpression; caught. good.
Potential issue: BigInt prefix minus: `const x = -1n`: PrefixUnaryExpression operand BigIntLiteral? Node kind maybe NumericLiteral text 1n. Code condition:
```
if ts.isPrefixUnaryExpression(n) && MinusToken && ts.isNumericLiteral(n.operand)
```
But before check they have if `ts.isNumericLiteral(n) && !/n$/...`, then prefix. If bigint literal AST is BigIntLiteral, `ts.isNumericLiteral` false, so negative bigint not collected. If AST is NumericLiteral, `ts.isNumericLiteral` true but prefix branch doesn't test /n$/ on operand, so `-1n` might be normalized? It returns prefix with operand text "1n", normalizeNumber("-' + '1n') = String(Number("-1n")) -> NaN => "NaN". Then isTrivial false. This would include BIGINT NEG with kind number, value "NaN", and could group? Let's analyze carefully. If BigInt literal is represented as NumericLiteral in TS AST with text "1n", then code's direct numeric branch excludes via /n$/ because ts.isNumericLiteral before prefix. But prefix branch is checked after direct numeric; for n.operand, they don't check /n$/ because not necessary? Actually prefix branch:
```
if (
 ts.isPrefixUnaryExpression(n) &&
 n.operator === MinusToken &&
 ts.isNumericLiteral(n.operand)
) { return ... }
```
If ts.isNumericLiteral(n.operand) returns true for `1n`, then any `-1n` yields value "NaN". That would violate "bigint 天然排除". However their code comment says "TS AST 本有独立 BigIntLiteral 节点（天然不收）— /n$/i 双保险"; so they believe prefix branch not entered for bigints because BigIntLiteral not NumericLiteral. If that's true, no bug. Need verify TypeScript AST has `BigIntLiteral`. I am fairly certain TS SyntaxKind includes `BigIntLiteral` because ESTree has BigIntLiteral. Let’s quickly recall TypeScript AST node kinds:
From compiler types:
```
NumericLiteral = 8,
BigIntLiteral = 9,
StringLiteral = 10,
JsxText = 11,
...
```
Actually yes. `ts.isBigIntLiteral` exists in `typescript.ts`:
```
export function isBigIntLiteral(node: Node): node is BigIntLiteral {
 return node.kind === SyntaxKind.BigIntLiteral;
}
```
I think BigIntLiteral node has `text` "1n" and no numeric literal. So NumericLiteral text never contains n. The /n$/i is indeed double insurance unnecessary; prefix BIGINT false. So okay.

Potential issue: TS treats `1n` in older versions as `NumericLiteral` and /n$/ handles direct, prefix branch might not. But version? likely modern TS supports BigInt literal AST? Let's verify with memory from TS 5.0: SyntaxKind.BigIntLiteral = 3? In `ts.server.protocol` maybe? Let's reason from error message: TypeScript compiler >3.2 supports BigInt. The token kind for bigint literal in scanner is `SyntaxKind.BigIntLiteralToken`. Parser creates `BigIntLiteral` node? There is definitely `SyntaxKind.BigIntLiteral` in AST if there is `NumericLiteral`, `StringLiteral`, `RegularExpressionLiteral`, `NoSubstitutionTemplateLiteral`. Node interface:
- BigIntLiteral: `text: string`? yes.
Thus okay.

Potential issue: Number normalization uses `normalizeNumber('-' + n.operand.text)` but if n.operand is hex/octal, works.
Potential issue: Values `-0` after normalize String(Number('-0')) = "0"; so same as 0. trivial. okay.

Potential issue: "boolean true/false" if AST has `true || false` initializer? no.

Potential issue: `ts.SyntaxKind.NullKeyword` vs `NullLiteral`? I think NullKeyword. yes.

Potential issue: If initializer is `undefined`, identifier excluded. `NaN`, `Infinity` identifiers excluded. Design perhaps trivial {null}; not undefined. Should undefined be trivial? absent. Maybe "undefined" often trivial, but literal is identifier. Design not.

Potential issue: If duplicate string full of spaces "  " length <4 warn? Red layer same-name same-value regardless length: If `FOO='  '` in >=2 files, same name/string length 2 -> red? isTrivial only empty string, so same-name >2 red. If same-name `FOO=' '` red. expected; trivial only empty.
But for warn, `'操作失败'` length 5, okay.
`'btn'` class string length 45, red.
No issue.

Potential issue in comment "DUP_CONSTANTS_B2=1 env 旁路" they use console.error for B2 details. For B2, it is stderr-only. In check-quality, b2 is not printed at all? Wait in endpoint, check-quality imports scanDuplicateConstants, but not print B2 details except stats? Actually stats printed:
```
红层 ${baselineHits.length} ... 新增 ... warn...
```
It doesn't include B2 count. Does B-2 require check-quality print? No, B-2副产物 is in CLI. `scanDuplicateConstants` always computes b2 = unexported list, and returns. It computes for every run, including check-quality, but does not print. It does include decls statistics. The `console.log` in check-quality stats no B2. Fine.
However, in CLI, B2 count is printed before pass and includes all unexported literal const declarations. Baseline B-2 changed 91→83 because top-level limitation. Good.

Potential issue: B2 list "未 export 字面量 const 清单" uses only declarations with a literal initializer and an Identifier name and const, no trivial filter. That includes trivial values. It also includes all top-level unexported constants. Good. It excludes `export const` inside `export {}`? no.
But previous dry-run "^const" may have included *unexported* declarations not initial literal; not relevant.

Need maybe consider generated user file "src/renderer/..." all.

Potential issue: Self-consistency declaration count vs baseline zero:
Maybe code's red groups include only literal declarations with *same name+same value*, not same file. But if a name appears as both `export const COLUMN_GAP_H_FACTOR = 1.5` and `const COLUMN_GAP_H_FACTOR = 1.5` (two files), red. If one of duplicates is in a file not `.ts/.tsx`? no.
Need count baseline 8; warn groups 3. They say "baseline+3 warn 组零变化" meaning changes in collection not alter red/warn group sets. Since W-4 top-level limitation removed nested locals; if previous nested constants accidentally same names as top-level, they could have made artificial groups. Count 149→141; 8 removed? Wait if removing 8 declarations could decrease baseline? Actually if a local `FOO` in multiple files with same value was false duplicate, previous dry run regex might have created red group and thus baseline? But baseline originally 6? Need not.

Let's compute declaration reduction:
- New collectDeclarations returns all top-level const literal declarations (regardless name? only identifier literal) count.
- Previous dry-run maybe was using regex `^const` that matched any line starts with const and included local at statement nesting not indented? It had 149 declarations. New 141. Baseline and warn no changes because false positives not matching baseline names. B2 count 91→83 (8 fewer? Wait difference 149-141=8; B2 91→83=8). Actually unexported subset decreased by 8. So all removed were unexported false positives? Could be. Consistent.
- Were 3 warn groups zero changes? likely.

Need perhaps test "RED-6 嵌套用例 exit=0" not implemented test file? No red-g evidence. We can't verify.

Potential issue in final design criterion "同文件豁免" Code groups by name+value and computes number of unique *file paths*. If two different declarations of the same name/value in the same file and no other, no red because unique files=1. But JS cannot have two top-level declarations same name. Could local in if block same file? not collected. no.

Potential issue with file extension and same file path normalized: `relative(root, f)` on Windows returns backslashes? They replaceAll. `file` string stable. `fp.files` sorted. Baseline contains forward slashes. Good.
On Windows, `relative` could return with lowercase drive? root from process.cwd, files from walk root with same casing. okay.

Potential issue: `walk` skips `dist`, but source might create `dist` under src? not likely.
Potential issue: It doesn't skip `.git` under src? It skips nested .git due if name == '.git'. yes.

Potential issue: package changes no lint script in ci? check-quality already run under main? maybe.

Potential issue in check-locks protected list: Add baseline `scripts/dup-constants.baseline.json` to `protectedFiles` in check-locks.mjs after join(root...). But then `...walk(join(root,'scripts'), predicate)` excludes `.json`, then filter. Good. The baseline file wasn't in `.gitignore`. okay.
PowerShell script `lock-protected.ps1` adds .json. Need check lock-protected.ps1 perhaps uses `Get-ProtectedFiles` but doesn't include `.json` from scripts? Doesn't matter since explicit.

Potential issue: Baseline file path protected but if duplicate baseline is also generated/written under scripts in a nested directory? no.

Potential issue: The "F-LINT-03" candidate in console output: "红层 X 组 baseline 待收敛（F-LINT-03 候选）" In wrong "F-LINT-03" maybe future. okay.

Let's explore severe issue in actual code import: check-quality.mjs imports `scanDuplicateConstants, formatDupDetails, clipped` from './check-dup-constants.mjs'. The dependency file is .mjs; okay. But `check-quality.mjs` previously probably is executed with `npm run quality` from root. No issue.

But `check-dup-constants.mjs` is executable script with shebang and top-level import? yes.

Potential issue: In direct CLI, no baseline corruption "exit 1" if `r.newRed.length > 0 || r.corrupt`. But if `scanDuplicateConstants` itself throws an unexpected error (e.g. `readFileSync` permission, `JSON.parse`? JSON parse catches all; `statSync` throws for weird symlink; TS parser could throw?), no catch, exit non-zero with stack. Fine but not graceful.

Need consider syntax "module-level constants" could include `const` declared in an `export {};` with `export` keyword not modifier? Example:
```
export { foo };
const foo = 'x';
```
foo unexported. It is top-level. collect catches. Good.
What about `const foo = "x"; export default foo;` foo exported? Not under `export const`; collect says exp=false (no export modifier), but it is exported via later `export default foo` or `export { foo }`. Does this impact B-2 classification or red? B-2 defines "未 export 的字面量 const"; If const is later exported with `export { foo }`, semantically exported, but collector marks as not exported because it only checks export modifier. That's a bug for B-2 only (not CI) and perhaps duplicate red? No impact red because all decls active. But B-2 auxiliary non-blocking. Could report? Existing B-2 maybe must list unexported constant; missing export re-export maybe false positive. However original design maybe "未 export" meant no `export const`? B-2 specifically "B-2 副产物（§5）：未 export 的字面量 const 清单". A module can export via `export { foo }`, so collector cannot determine by modifier alone. This is a semantic bug. But B2 not used, no tests. Should we report? It is a weakness. Need see if code in repo often uses `export { };` none? Could be. Let's explore AST recognition: Top-level statement `export { X }` might have export declaration, but collect doesn't build name->exports. Thus any const exported through `export { X }` or `export default X` after declaration is misclassified as unexported. But because red layer includes both, not F-LINT-02 main? It impacts only B2 list "B-2 副产物" which is stderr only; not CI. The ticket says B-2 91→83 is based on counts and maybe expected behavior? Need report as Weakness maybe but low priority. The task says "只报告有代码证据支撑的问题", yes. Could mention uncertain about export semantics? Need not overdo. But maybe final review should not dig unrelated B2 if no severity.

There is also issue that red/warn active includes unexported constants too, but duplicate constant sharing doesn't require export. good.

Need issue "export const" detection:
```
const exp = stmt.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false
```
Does `ExportKeyword` appear in `modifiers` for `export const`? In TS AST, `export const foo` modifier? Let's verify. A `VariableStatement` has `modifiers`? For `export const`, yes `modifiers: [ExportKeyword]`.
But in newer TS, source with `export` may be represented as `modifiers` `[Modifier(SyntaxKind.ExportKeyword)]`, okay.
`export async` not.

Potential issue: Top-level statements include `const` with `declare`? no initializer.
Potential issue: `const` inside `namespace` not collected but exported via namespace. okay by W-4.

Need potentially find major bug involving "module vs script" and TS AST for `export const` in source file with no package type no. SourceFile statements okay.

Let's scrutinize warning algorithm in relation to red layer:
```
const redGroups = groups with >=2 files. map group by name+kind+value.
const warnByKey value for strings length >=4; warnGroups = >=2 files && >=2 names
```
Suppose same string value `foo` appears in two files both with same name `FOO` (red). It has names set size 1 => no warn. good.
Suppose string value appears in one file with same name duplicated? same-file red exempt; no warn. good.
Suppose group has two names in two files `FOO` and `BAR`. It produces warn. It does not produce redundant red? It may produce red if same name across files? In this example no.
The format's byName list:
```
const byName = [...new Set(w.decls.map(d => d.name))]
lines.push(...（w.decls.length 声明 / files count : byName.join(' / ')）
```
No typo? `new Set(w.decls...)` no semicolon; okay.

Potential issue: In `formatDupDetails`, baselineHits and warnGroups lines aren't clipped individually; clipped later. DUP_CONSTANTS_FULL bypass. Good.
Potential issue: In mount, `for (const line of clipped(formatDupDetails(dupResult))) console.log('  ' + line)`: If `DUP_CONSTANTS_FULL=1` full. If CLI, same. no.

Potential issue with "quality 检查通过" is printed after CLI? no.

Let's inspect exactly stats line:
```
console.log(
  `dup-constants：扫描 ${dupResult.stats.files} 文件 / ${dupResult.stats.decls} 声明——` +
  `红层 ${dupResult.baselineHits.length} 组 baseline 待收敛（F-LINT-03 候选）、新增 ${dupResult.newRed.length} 组、` +
  `warn ${dupResult.warnGroups.length} 组（异名同文案不卡 CI）`
)
```
At compile, includes no corruption condition. okay.
But say `bug: stats.groups` not used. no.

Potential issue: `stats.groups` counts red+warn but redGroups and warnGroups can include same declarations (as above), aggregating groups double. No one uses stats.groups except maybe direct CLI not uses; check-quality not. no.

Potential issue: `redGroups` group cases are sorted by insertion; baseline `recordedFiles` set may include file list; no.

Potential issue: duplicate `name`+`kind`+`value` across 2 files where one is `.tsx` file and one is `.ts`? yes.

Could there be issue with stale baseline due "filename relative values" and source moved: if file relocated, fingerprint's file list changes -> newRed. Good.

Potential issue: If new constant duplicate in same baseline file's name/value but only one file existing baseline files plus new file, newRed drift, correct. If baseline file entry's file set exactly current but a duplicate is deleted in one baseline file and created in another unrelated file with same name/value, fingerprint file set changes, but if order and file name perhaps accidentally same? no.

Potential issue: If a duplicate group is extended and a file from baseline is removed while a new file is added, resulting file set coincidentally equal? If resulting file set equals same length and same elements, no net change; if duplicate moved from file A to file B, no red because file set differs unless B also in recorded? Actually recorded has A,B; actual B,C -> differs -> red. Good.

Potential issue: Should added duplicate maybe only new file (on top of baseline known group) be red? Yes fingerprint changes. Good.

Potential issue: If same name/value group in two files but one file has multiple declarations e.g. through `export const FOO` and internal redeclaration in block? Not collected.
Potential issue: A file with a local `const FOO` inside a function and a top-level `const FOO` cannot have same scope but can if function? collect only top-level. W-4.

Potential issue: Need include "satisfies" expression. TS AST wrapper only if source target supports; if compiling with older TypeScript? package maybe typescript>=5. no.

Potential issue: TypeScript AST uses `ts.SyntaxKind.SatisfiesExpression` maybe not available in some TS version. If package uses TS 4.9? satisfies was in TS 4.9? Actually satisfies introduced TS 4.9, yes. If node_modules TypeScript maybe ^5? no.

Need perhaps inspect `package.json` diff shows added script but no diff to scripts/check-quality maybe okay.

Potential issue: no unit tests added for new checker. The request "F-LINT-02" maybe "red evidence files" but not tests. The ticket says only "门二复核" likely they want review not tests. Could report no tests? Need test-blind spots; no modifications? Existing package still maybe no test for corruption exit. The "red two paths" raw files exist maybe not shown. Absence of tests can be weakness. However, code is tooling; not necessarily require tests. But finding "test blind spots" ask. Need maybe mention no automated tests for corrupt baseline and CLI/mount behavior? Yet perhaps red raw evidence exists. We need report if no unit/integration tests added in diff. There is no test file diff. The raw red files maybe stored separately, not in diff? Since final diff only package/check-locks/check-quality/script/baseline. If verification evidence absent from repo, but perhaps outside. No robust regression test? Could be considered N? Need not if code evidence issues not.

Need think about process of "verify 已由主控统一跑 exit=0" means final gate to "可否放行". We should output B for any required issue. Need decide if any Blocker.

Let's try inspect red behavior with "corrupt flag hard" in check-quality imported path more closely. There is a race: In check-quality, if baseline corrupt, `scanDuplicateConstants` outputs `console.error` directly, then `dupResult.corrupt` pushes line. But if `newRed` contains 8 red lines because baseline empty, it pushes all red group lines as violations. This could cause "exit 1" due red. Good.

But if baseline file is *empty string*: JSON.parse('') throws, entries=[], corrupt true. Suppose source has all 8 baseline groups. newRed list from redGroups; violations includes 8 red + corrupt. Good. If redGroups count changes? not.

What if baseline JSON actually contains 8 entries but `files` are stored in Windows format backslashes (generated by previous run on Windows)? Baseline manually has slash. If user generated baseline from a tool? no tool writes it. If files list wrong due backslashes in a committed baseline, newRed helps.
Could scanner ever write baseline automatically? No, only manual. no.

Potential issue with check-locks protectedFiles baseline while file exists; if baseline corrupt content but lock human review sees locked-change if changed. okay.

Let's examine baseline dirty vs source current impossible without repo. We can infer no mismatch.

Maybe bug: The file `scripts/check-dup-constants.mjs` imports `ts from 'typescript'`; but because it is invoked by Node with `node scripts/check-dup-constants.mjs`, it will look for a top-level package named `typescript` in `scripts/node_modules`, then root. Works.
But .mjs treats import specifier `typescript` resolved by Node, not by ts? yes.

Potential issue: `walk` excludes "dist" directory but no "out" in scripts? It excludes both. In `collectDeclarations`, if project stores Source files under `src/out` (e.g. generated), skipped. no.

Need maybe review "DETAIL_LIMIT=20" but mount check-quality uses "for newRed, violations.push full"; if newRed list >20, printed to console.error fully; okay.
But then `for (const line of clipped(formatDupDetails(dupResult))) console.log('  ' + line)`: If there are baselineHits+warn only and no newRed, truncated at 20. hint says "设 DUP_CONSTANTS_FULL=1 看全量" exactly. Good.
But in check-quality, env DUP_CONSTANTS_FULL=1 from surrounding process would also print full. Good.

Potential issue: If DUP_CONSTANTS_FULL is set to "0", truthy; still full. env semantics maybe okay.

Potential issue: In `formatDupDetails`, line for baselineHits group "×2 文件（...）". If baseline group existed but declaration file names perhaps many. no.

Potential issue: Stats says `红层 X 组 baseline 待收敛` when newRed also has red groups; "红层" is actually red groups all? It says red layer baseline vs new; baseline known items. okay.

Potential issue: output line `quality 检查通过：... / 无同值双常量新增` fails to mention baseline corrupt? If not violations, corrupt false. okay.

Could there be issue if check-quality already has violations before duplicate scan, and duplicate scan's `scanDuplicateConstants` baseline corrupt prints console.error direct; later duplicate scan's info lines maybe look weird; not.

Potential issue: Because `scanDuplicateConstants` is called from check-quality after CSS check, if `src` has a file with BOM or invalid UTF? read as utf8; okay. JSON baseline BOM handled.

Potential issue: `SourceFile` top-level collection ignores declarations generated after `export =` etc, not.

Potential issue: "模块级 const" vs `.tsx` source maybe module? all files standalone modules.

Potential issue: "与 dry-run ^const 行首锚同口径" but regex `^const` in dry-run would have matched `const` declarations inside *braces* if the line starts with const at top-level indent? Actually if an arrow function body:
```
const f = () => {
const x = 1;
}
```
Line starts with `const` but not at column 0 if inside function because indentation likely. If code is formatted with no indentation, it could. New AST top-level solves.

Need maybe see "SourceFile 直接子级限定" but VariableStatement can be direct child *inside not block* if statement begins `if (x) const y` no; const only lexical declarations in for/block/switch. Direct child of SourceFile only module scope. Good.

Potential issue: They exclude `.d.ts` in collect, but a top-level `declare const` in .ts (ambient context) can duplicate? no initializer.

Potential issue: Duplicate constants with same value using `export const a = "x" as string;` caught. `const a = <const>"x"` in TSX; caught? Type assertion `<const>"x"` in .tsx? In TSX, `<const>` syntax invalid? Type assertions in TSX cannot use angle bracket, so uses `as const`. In .ts (not tsx), `<const>"x"` AST is AsExpression? yes, literalOf peels. Good.
Could `const a = 'x' satisfies string` be a `SatisfiesExpression`, yes.

Potential issue: `literalOf` loop only strips wrappers in order; for `(('x' as const) as string)` while first AsExpression expression ParenthesizedExpression? Actually `as` precedence may result nested as expression with expression parenthesized? Regardless loop handles two top-level parenthesized/as. Let's simulate: outer as expression? If parentheses around as expression and outer as expression, expression property is ParenthesizedExpression? The while when current AsExpression loops to n.expression. If n.expression is ParenthesizedExpression, next loops. okay.
If expression is `satisfies` then as, okay.

Potential issue: Repeated property? no.

Potential issue: Empty string "trivial" but same name "FOO=''" in same file + other? If same name same empty string across 2 files, trivial exempt. yes.
Boolean `true`/`false` always exempt; even if semantically meaningful config flag. Requirement says trivial.

Potential issue: "warn 异名同文案" set min string length >=4, but does not exclude strings containing CJK/space; yes includes all. So `'ai-sensor'` warn. Good.
Maybe it includes constant values that are long duplicate text with different names *within same file* plus cross file red, as discussed.

Potential issue: "同名同值跨文件 (≥2) is red, not non-Rule-of-Three." yes.

Potential issue: There is no check for duplicate constants where `const` is initialized with `String.raw\`...\`` no.

Let's investigate if `ts.isNoSubstitutionTemplateLiteral(n)` returns for template literal with `String.raw`? no.

Potential issue: Red grouping includes all globally top-level const declarations, but not *block-scoped top-level in `export default (() => { const ...` - not module-level. correct.

Potential issue: It ignores constants declared with `using`/`await using` (disposables)? no.

Potential issue: It doesn't catch `export const foo = 1_000` and `export const foo = 1000` in same two files? If same name same value group yes. If in files A/B, both normalized "1000". good.
Potential bug: For `numeric separator`, TS AST `NumericLiteral.text` may already strip underscores? Wait In TS source text for numeric literal with separators, node.text? Let's check. I think scanner's `text` for NumericLiteral includes raw text? `node.text` might be "1_000"; yes. If not, normalize removing underscore no harm. If TS text is "1000" parse might reject underscore? no.
`Number('1_000')` from normalize after removing = Number('1000'). Good.
If text already "1000", remove no.
If `Number` cannot parse due binary etc? parses.
Potential bug: `Number("018")` for legacy octal `018` maybe 18; with `0o` parse 8? no.

Potential issue: If numeric literal has leading +? no.

Potential issue: `walk` file filter:
```
```
Potential issue: If `basename(p)` is called in every predicate but not imported from path; function defined below. okay.

Need understand final design "六判据" perhaps red for same name and same value but "name" should be normalized from identifiers via variables? We discussed. It doesn't consider `const FOO = ...` and `export { FOO as FOO }`, okay.

Potential issue: Warn "same value with different names" group-by value only, so if value same with *same kind?* They filter `d.kind === 'string'`, so okay. For numeric duplicated with different names, not warn. Requirement only texts.
For string of length <4 same diff name no warn; exact.
For strings length >=4 and same name same value across files red. For same name and length >=4, warn (same value with names set >1 only if same name not all). no.

Need think about "clipped" line output truncated in CLI may make baseline corruption red groups impossible to inspect because if >20 newRed, but early red lines are printed first (details order newRed then format). If >20 red groups, all newRed beyond 20 hidden unless env. The final error says count; user can set env. Is this deviation from "newRed=红走 violations 全量"? The ticket specifically W-3 says "newRed 走 violations 全量=拦截语义不截断". Could require if newRed exists, error path should list all red groups separately (maybe on console.error) with no clip. But code doesn't. Let's see check-quality's mount is the actual CI path; CLI is independent. The direct CLI details:
```
const details = [...r.newRed.map(...), ...formatDupDetails(r)]
for clipped(details) console.log('  ' + line)
```
Then `if newRed || corrupt ... exit(1)` doesn't print the full `r.newRed` because details truncated already. But wait `details` lines are "  [红] ..."; in error message:
```
console.error(`dup-constants 检查未通过：红层新增/漂移 ${r.newRed.length} 组...`)
```
No print separately. So direct CLI does *not* show all red if >20. The mount path `check-quality.mjs` pushes all newRed into `violations`, then prints `console.error('  - dup-constants: ...')` for each if violations.length >0. So yes mount full, direct CLI not. If previous W-3 finding says "W-3 截断提示不可达 | DUP_CONSTANTS_FULL=1 env 旁路+文案准确（探针 25→21/25 行亲验）；newRed 走 violations 全量=拦截语义不截断". Maybe they tested check-quality path "newRed走 violations 全量" red evidence. Direct CLI maybe details could be truncated but env full. Does direct CLI "拦截语义不截断" maybe not needed because "CLI exit 1=红层新增/漂移" and "红层新增" doesn't need enumerate all to enforce? But a good CLI should enumerate the red set; however the truncation is transparent and env available. Is there any doc saying CLI red "全量"? In file header: "CLI：node scripts/check-dup-constants.mjs（exit 1=红层新增/漂移）。挂载：..." It doesn't state full red list. In code comment: "信息性明细（baseline 待收敛+warn）与 CLI 路径同走 clipped 20 行截断；newRed=红走 violations 全量（拦截语义不截断，与各段一致）" This explicitly says "信息性明细 ... 与 CLI 路径同走 clipped 20 行截断; newRed=红走 violations 全量" Ambiguous. They might mean the *mount* newRed is not clipped; but "CLI路径" in code with details including newRed is clipped. Their comment in mount says "newRed=红走 violations 全量（拦截语义不截断）" okay no contradiction: For check-quality, newRed goes to violations (full). CLI newRed part of details clipped; maybe okay.

Potential issue: If direct CLI has zero newRed but more than 20 baseline/warn details, clipped. Good.
Potential issue: If direct CLI has red groups and zero format details, and red groups 25, showing first 20 red may be okay but user may think only 20 red because `r.newRed.length` in exit says 25 and clipping hint says full. It prints "output exceeds" only if total details >20. It will because 25 lines. Good.

Potential issue: In check-quality.mjs, if DUP_CONSTANTS_FULL is not set and `formatDupDetails` has >20 lines, it prints "输出超 20 行已截断——设 DUP_CONSTANTS_FULL=1 看全量". Good.

Need decide final issue list. Let's not over-report if not true.

Let's examine "B-1 red evidence path two paths（f-lint02-red-corrupt-{cli,mount}.raw.txt）" They mention files maybe raw red capture not in diff. To verify paths need manually? Could test:
- CLI: set corrupt baseline + no current red? In CLI, scan catch? If file path exists with invalid JSON, newRed maybe redGroups plus corrupt; exit. To get "corrupt but no red" independent newRed, need remove all duplicate constant declarations? But since baseline contains existing 8 groups, if corrupt baseline all groups become newRed. So there is no scenario where `corrupt` true and `newRed` empty unless all active duplicate groups absent. We can test by temporarily commenting out all eight groups? Not feasible. But code exit is obviously OR. Red evidence for CLI can be generated with invalid baseline and current red? yes. For corrupt independent of newRed, code must separately catch. If source contains no red groups except baseline? Wait if baseline corrupt, existing groups are no longer baseline so newRed nonempty. Thus to prove independent, need deliberately have no current duplicate group and corrupt baseline; but repo's current source has 8 baseline groups. Could use temporary source filtered to a subdirectory? scan root fixed. Perhaps they made a copy repo with no duplicates. Not.
But code robust.

Potential issue: When baseline parsing fails, in catch they `entries=[]; corrupt=true; console.error(...)`. But if parse fails because JSON file contains 8 entries plus a syntax error, entries reset empty; all current 8 groups newRed and each gets "baseline外新增——收敛到共享唯一定义点". This is slightly wrong: at least these are baseline known groups, but corruption prevents baseline use. Error detail says newRed count 8; separate corruption line. Acceptable.

Potential issue: If baseline JSON contains `entries` but one entry has unrecognized schema, `new Set(undefined)` empty, later redgroup gets drift with `recordedFiles` empty? Actually if key exists but files absent, `recordedFiles &&` since empty Set is truthy, size 0, and not equal to files length => newRed "baseline 指纹漂移：登记  vs 实测..." This is clearer. If `entries` field not array, no entries map; all groups newRed but no corruption line because parse succeeded. Could be considered "损坏=not array" and should hard with corruption line. Why? A baseline file `{ "_comment": "...", "entries": {}}` may be structurally invalid; it can be generated accidentally. The scanner does not set corrupt because `Array.isArray(...) ? parsed.entries : []`, setting to empty. It doesn't hard with "corrupt" but still hard with every red group appearing as baseline external new. This is an error attributed to code. Assertion "corrupt 标志—解析失败" not "schema invalid"; but baseline schema invalid should definitely be corrupt. Could this create silent pass? If malformed `entries` absent and source currently no red groups, no failures. But if source has existing baseline groups? no silent. If source has no red groups but baseline expected entries? Baseline entries stale; no red. no.
If a future maintainer deliberately wants to weaken baseline by replacing 8 entries with `{}`, the scanner reports red groups as new if groups still present, because map empty. Thus not weakening; if groups later? yes.

But B-1 "损坏=硬拦截" — semantic corruption should be caught. Suppose baseline file is valid JSON:
```
{"entries": []}
```
This legitimately says zero baseline. If later dirty? no.
Suppose file is `{"entries": "corrupt"}`. Scanner treats as empty baseline not corrupt. It still blocks all red groups (if any) but error doesn't say "baseline 损坏（解析失败）". If there are no active red groups, it returns pass. Is that dangerous? Since no duplicates, no reason baseline needed. But if baseline is "expected 8 entries" and duplicates all removed, pass even if baseline emptied accidentally. Is that a silent weakening? If source no duplicates, losing baseline allowlist might matter if duplicates reintroduced. Without baseline entries, reintroduced duplicates will be red; that's stricter, not weakening. So only UX.

Need possibly report: B-1 corrupt detection only catches JSON.parse failure, not structural malformed baseline (`entries` not array) nor per-entry validation (missing name/kind/value/files). Valid-json malformed files silently treated as empty baseline without `corrupt`; because the "corrupt flag" is supposed to be an independent red line. If `entries` missing and no current redGroups, CLI exits 0 despite baseline file "random object". Is that a blocker? The spec says "BI损坏=解析失败（baseline 损坏（解析失败，已按空处理+硬拦截）" They explicitly define corruption as parse failure. Missing entries maybe schema invalid, not parse failure. But if malformed due entries not array, parse succeeds but baseline is broken. Should be detected? likely. Need maybe not.

Let's inspect baseline `_comment` not validated; no schema. A corrupt file could be valid JSON but e.g. `{"entries": [{"....": bad}]}`; code might mishandle weird shapes. But if valid JSON with per-entry fields missing, it hard red (except no active). If baseline has `{"entries": null}` and current no red, exit 0; pass. Does this allow bypass? Suppose duplicate set removed (clean). Then baseline irrelevant. If duplicate set reintroduced same as baseline, because entries null, newRed -> red, not pass. Thus strict.
What if attacker wants to add a new duplicate and neutralize baseline by writing a valid-parsed malformed entries object containing new red fingerprint? Hard.

So no severe.

Need perhaps inspect count declarations "149→141" with W-4 and baseline "8 baseline+3 warn groups zero changes" might be impossible because if W-4 removed wrong local declarations that included same-name groups, baseline should change? Not impossible.
Need maybe run static code to verify no false positive scan. no.

Potential issue: `collectDeclarations` doesn't sort files but uses `files = walk(...)`. If `src/renderer/...` etc. Baseline files list order okay. Print lines maybe nondeterministic; no.

Potential issue: It ignores `const` in `.mts/.cts` because regex only .ts/tsx. Source may contain `.mts` / `.cts` modules. The `src` tree may include `.mjs`? design says TypeScript? Existing checker maybe scans src/**/*.{ts,tsx}; baseline does not include .mts. If project has `.mts` constants, missed. Need see repo? Not in diff. Could be "src/**/*.ts" only by package? Maybe electron-vite uses .ts/.tsx. No evidence.

Potential issue: It doesn't scan `.js`/`.jsx` in source. But constants likely TS. Design maybe no. no.

Potential issue: It includes files under `src` that may not be compiled due tsconfig excludes? e.g. story/scripts. But no.

Potential issue: SourceFile parse of `.tsx` can parse text with `jsx` preserve, but if `.ts` contains TS-specific decorators? no.

Potential issue: It treats `const x = 'a' + 'b'` as no literal. But same string value could be defined concatenated; not caught. Maybe acceptable because only literal initializers criterion. The design "字面量初值识别". If duplicate constant value is expression `PREFIX + SUFFIX`, not "literal". okay.

Potential issue: It treats no-substitution template (backticks) as string literal, but tagged with no? no.

Potential issue: It doesn't handle `const x = \`${''}\` ` template with no substitutions? no, has empty expr? It has expression, not no substitution. excluded. Fine.

Potential issue: It doesn't recursively scan binary expressions `(1 + 0)` = 1; no.

Potential issue: It treats `const x = /** comment */ 1;` node text "1"? comments ignored. good.
It treats `const x = /*#__PURE__*/ -1` as prefix maybe. no.

Potential issue: If numeric literal includes radix "0x" with same value 16 and baseline file should store "0x10" or "16"? normalize stores "16". If raw source changes from `0x10` to `16`, not drift (same semantic), baseline remains 16. Requirement normalizing; good.

Potential issue: `normalizeNumber` produces "NaN" for malformed text but impossible. For `-` with negative empty? no.

Potential issue: For bigint with text "10n"; if `ts.isNumericLiteral` false but Text maybe direct? no.

Potential issue: Deep exports. no.

Potential issue: A `const` declaration can be exported through `export { foo as default }`; B2 exp false. Already mentioned.

Potential issue: A derived constant re-exported with alias:
```
const X = 1
export { X as Y }
```
"same exported name" different from X? But duplicate names not.

Potential issue: In duplicate red grouping, if same constant name appears as local in one file and exported via namespace in another? no.

Potential issue: There is no terminal newline? no.

Need perhaps compare final design "B-2 副产物: 未 export 的字面量 const 清单" with code: `const b2 = decls.filter((d) => !d.exported)...` but `decls` only includes top-level const with literal initializer, so okay.

Potential issue: `exported` is based on `VariableStatement` modifiers. But a top-level statement can be preceded by decorators? `export const` no. TS AST modifiers includes `ExportKeyword`, but if statement has JSDoc? no.
What about `@deprecated export const`? Decorator not valid. no.

Potential issue in quality mount: They import from a file with side effects? There are no top-level side effects, only definitions. direct CLI condition uses `process.argv[1]`. When imported by check-quality, `import.meta.url` vs process.argv[1] won't match because process.argv[1] is check-quality path. So no CLI. Good.

Potential issue: `import.meta.url` is file URL on Windows with uppercase/lowercase; pathToFileURL(process.argv[1]) maybe canonical equal. If relative? Node argv is absolute path likely. no.

Potential issue: There is no empty line before dup-constants output? not.

Potential issue: Because scanDuplicateConstants is called in check-quality before `if violations`, if scan throws, quality script crashes instead of returning errors. no.

Let's think about requirement 2 W-4 AST boundary "SourceFile 直接子级 —— export const/declare 形态是否都覆盖". Need answer specifically. Let's examine:
- `export const`: Direct stmt with ExportKeyword modifier. They detect export with modifiers.
- `declare const`: If `declare` creates no initializer, not included by `continue`. If `declare const FOO: 'x'` no initializer; should not. A declare module? no.
- `export declare const` no initializer. not.
Maybe W-4 asks "export const / declare 形态是否都覆盖" Wait ticket says `W-4 收集无顶层限定 | SourceFile 直接子级限定`. Need confirm all top-level forms. Let's look at actual AST cases:
  1. `export const FOO = "x"` yes.
  2. `export default` impossible.
  3. `const FOO = "x"` yes.
  4. `const FOO: string = "x"` yes.
  5. `const FOO = "x" as const` yes.
  6. `export { FOO }; const FOO=...` yes.
  7. `global { const FOO }` no but if in `.d.ts` excluded, not module-level? `declare global` block top-level is inside SourceFile statement? In a module with `declare global { ... }`, declarations in global scope not source top? They are in block and not "top-level const literal", not scanned. Does global duplicated? `.d.ts` excluded. If .ts declaration? no.
  8. `const FOO = (() => 'x')()` no, not literal.
  9. top-level `export const { FOO, BAR } = obj` no.
  10. top-level `export const FOO = <template>` yes.
Potential issue: If source is a `.ts` script file (not module) with `const FOO`, direct SourceFile statements. fine.
Ambient contextual declarations not.
So yes.

Potential issue: `declare` module? W-4 "export const/declare 形态是否都覆盖" maybe from test. They might have `declare const FOO: "x"` tests? But `declare const` without initializer isn't a literal. However in a `.d.ts` or ambient context, a const declaration can be `declare const FOO = 1;`? Is that legal TS? Let's check. `declare const foo = 1;` in .d.ts? Actually ambient declarations cannot have initializers except `declare const enum`? In an ambient context, const declaration "may not have initializer"? I think `declare const x: number` is valid, but `declare const x = 1` is error "Initializers are not allowed in ambient contexts". So no.
What about `declare const foo: "foo"` is a literal *type*, not initializer; duplicate values not runtime. Should not collect.

Potential issue: Top-level const in `namespace` require `export const` but W-4 excludes. good.

Potential issue: "与 dry-run ^const 行首锚同口径" but regex ^const might also include `const` declarations in `.ts` that are exported with line break:
```
export
const FOO = "x"
```
In source, `export` on separate line is valid? Yes:
```
export
const foo = 1;
```
Is `export` with line break before `const` valid? ASI? It may parse as `export;`? Actually export declarations require no NewLine? let's not. Common no.
A regex `^const` would miss if const line after export; AST catches. Another reason counts increased maybe. no.

Potential issue: In `check-quality.mjs`, they call `formatDupDetails` after `scanDuplicateConstants`; `formatDupDetails` itself maybe accesses all. no.

Potential issue: Baseline stale and exported semantics are plausible Ws, need decide final review.

Let's see references: "1. B-1 硬拦截双路径实现与红证语义（corrupt 独立于 newRed——净存量场损坏也红）？ 2. W-4 顶层限定的 AST 边界（SourceFile 直接子级——export const/declare 形态是否都覆盖）？ 3. 声明数变化（149→141）与 baseline 组零变化的自洽性？" They want answer these. Maybe final should be one line total with N/B/W etc. Should not broaden too much? The instructions "只报告有代码证据支撑的问题" It asks to audit ticket incremental only. We should answer at least these questions.

We should maybe produce "B" or "W" for issues, then final Veredict. Need maybe include "N" for no issue. But if final output is [B|W|N]+ one line total. We can provide findings with prefixes. Perhaps no blocker and final "N/W"? Need decide.

Need verify whether "B-1 corrupt 独立于 newRed——净存量场损坏也红" actually in check-quality *only if scanDuplicateConstants called*. It always calls after CSS. If an earlier check in quality dies? no.
But does `check-quality.mjs` run under `npm run lint`? Wait package scripts: `"lint": "eslint ."` no check-quality? Maybe check-quality perhaps GitHub CI separate. But "npm run lint:dup-constants" direct. Existing quality maybe `npm test`? Need not.

Potential issue: `corrupt` flag independent only if baseline has parse error but `entries=[]` generates newRed for current baseline groups. "净存量场损坏也红" means if source is exactly baseline level, corruption red. Yes because current groups newRed. What if "净存量场" = source has no red groups? Then baseline groups are not present, so no expected new? But "净存量场损坏也红" maybe means current code has only known duplicates; make baseline corrupt; CI red. Code does. Good.
Could prove no newRed because newRed returns for every red group; if known duplicates present, newRed=8. Not independent? Since no raw corrupt-only if current clean; but OR covers current clean if no duplicate groups. Code independent. yes.

Potential issue: If baseline file path is absent, corrupt false and entries empty; all current duplicates newRed. But a missing baseline file could be considered corruption, but lock-protected requires file exists. If a dev deletes baseline and doesn't change lock protected? check-locks maybe detects deletion? lock-protected.ps1 includes if exists; Get-ProtectedFiles in mjs filters exists, so missing file not protected; but in git, deletion is a protected-file change? Lock enforcement likely requires human review for protected files, but if missing maybe skip. However, check-locks function "protectedFiles" filter existsSync, so if baseline file is deleted, it won't be in protected list. Does that create lock bypass? Ah! Very important. Let's inspect:
```
function protectedFiles() {
 const files = [
   ...
   join(root, 'scripts', 'dup-constants.baseline.json'),
   ...walk(...)
 ].filter((p) => existsSync(p))
 return [...new Set(files)].sort()
}
```
If the file is deleted, `existsSync` filters it out. So check-locks won't flag deletion because the file is no longer in protectedFiles. But a deletion is a change that a human could bypass? If lock system only protects files by checking modifications to currently existing protected files, deletion might be caught by git diff separately? Need infer from check-locks. It returns protected files list, maybe a script in CI verifies git diff against protected files and requires [locked-change]. If file is deleted, protected list no longer contains it, so diff against protected files might not include deletion. Wait "protectedFiles" list used to restrict protected changes. If protected file list is computed after deletion, the deleted path vanishes. But maybe the lock check uses package.json's list as constant and then gets existing path; only existing files not exist skipped. Baseline deletion would not be considered a protected change and could bypass review. Same for any protected file that can be deleted? Unknown. But check-locks maybe from a system "lock-protected" with lock:action requiring any change to protected files; if file deleted, its absence means no comparison can find old. Usually protectedFiles should include files that exist in HEAD, not current. If filtered after deletion, not protected. This could be a hole from adding baseline: if someone deletes baseline JSON, scanner then treats baseline missing as no entries; all existing baseline duplicate groups become newRed => quality fails. Wait in W-2, if baseline file deleted, corrupt? existsSync false, entries=[], corrupt=false. Current known red groups 8 => newRed -> red. So deletion doesn't silently pass; it makes CI fail (even worse), unless source duplicates also removed same commit. But lock bypass? If deletion plus source duplicates removed? Deletion alone red. Not issue. But if someone deletes baseline and also source current red groups? no.
However, "missing baseline" means all current red groups are newRed; if a red group is *newly introduced*, it will be red with no baseline. Hard. So not security issue.
But if a new baseline should be generated, deleting lock could be accepted by lock system and fail lint until regenerate. It won't mask.

Potential issue with same for baseline moved? scanner root missing -> red. okay.

Potential issue: `existsSync` filter in protectedFiles means if a source path of baseline absent but package root? no.

Potential issue: Check-locks maybe checks an "allowed protected changes" list from git diff names; if baseline deleted, absent from new file list? Actually "protectedFiles" function likely lists files whose modification triggers locked-change; if file deleted, the diff includes status D path. Protected list doesn't include old path? Maybe the lock system reads `git diff --name-only` and intersects with protected files; deleted files in diff *not* in protected list because no exists. But check-locks should include path to protect deletion. But because baseline can be deleted from disk, if lock script runs before checkout, it knows current HEAD path? unknown. We lack details. Too speculative.

Need maybe inspect `check-locks.mjs` diff around protectedFiles:
```
function protectedFiles() {
    const files = [
    ... join(root,'scripts','dup-constants.baseline.json'),
    ...walk(...)
  ].filter((p) => existsSync(p))
  return [...new Set(files)].sort()
}
```
Actually diff didn't include this whole function except adding baseline in array. ProtectedFiles always filtered before for all lock files. Existing deletion issue likely considered in design.

Potential issue: If baseline file has BOM, JSON.parse after replace BOM. okay.

Could maybe check quality script is run with package type "module"? mjs yes.

Let's decide final output likely "N" if no severe. But need be adversarial; maybe there are true findings.

Let's inspect code more for a hidden fatal: TypeScript module default import and `ts.isBigIntLiteral`? no.

Could there be issue in `literalOf` with `ts.isNumericLiteral(n)` for all `n` including a numeric literal whose text is "Infinity" (from `1e309`)? `Number('1e309')` -> Infinity, String(Infinity) -> "Infinity". If two constants same name `FOO = 1e309` in two files, they'd both be kind number value "Infinity", duplicate red. But `1e309` is a finite numeric literal syntax (overflows to Infinity). Should Infinity treated non-trivial and normalized? `1e309` is legal? JS numeric literal with exponent; result Infinity. It's a "number" value maybe not intended. Not issue.
If `Number(text.replace(/_/g,''))` returns NaN for text "1_000" if TS text? works.

Potential issue: `.replace(/_/g, '')` on negative text? normalizeNumber only positive except prefix passes "-" + operand. no.
If numeric literal contains legacy octal `010`, Number("010") in strict? In ESM strict mode, Number("010") returns 10 (decimal), but JS source `010` is invalid in strict mode? TypeScript maybe permits? If parsing `010` in TS? maybe octal deprecated allowed? If `010` means 8? Actually in source, legacy octal literals in strict mode are syntax error. Not relevant.

Potential issue: `normalizeNumber('1_000.00')` Number -> 1000 and String -> "1000", but source parse? okay.

Potential issue: `trivial` numeric after normalization means `1e0`,`1_0`? 1e0=1, 1_0 =10. Good.
But semantically `0.5` not trivial. no.

Potential issue: SourceFile parsing of TSX with `.tsx` extension: If `ts.isVariableStatement(stmt)` true even when root stmt is `VariableStatement` with declarationList flags `Const`. yes.

Potential issue: If variable name is a keyword with escaped? no.

Potential issue: Use of `.d.ts` exclusion:
`!p.endsWith('.d.ts')` but file path e.g. `src/foo.d.ts` path ends .d.ts yes. If uppercase `.D.TS` not. no.

Potential issue: Does it exclude `.test.ts` and `.spec.ts` *from counting* but not from scanning. Yes no scan, so if duplicate exists only test/spec, not flagged. Good.
But count baseline says "walkdiff old/new same 214 zero diff" maybe.

Potential issue: In `formatDupDetails`, `displayValue('string', w.value)` prints raw string with single quotes, but values containing quotes/newlines? `value` could contain `'`; then line ambiguous but informational. no.

Potential issue: In CLI error, `[红]` lines use displayValue; same.

Potential issue: Duplicate value string with `\n` large prints on multiple lines? e.g. string value includes newline in text; display `'line1\nline2'` would include actual newline characters, causing output mess. Code not CLI essential. But could be considered boundary? Constants often in multi-line template strings `content`; if same name/value with newlines cross file red, line output could have actual newline; not critical.

Potential issue: Values with long class names already. no.
Potential issue: warn groups only strings value length >=4 but strings with newline, okay.

Potential issue: `DUP_CONSTANTS_FULL` must be set to exactly `'1'`? code checks === '1', yes comments "DUP_CONSTANTS_FULL=1". Good.
DUP_CONSTANTS_B2 also checks === '1'. Comments "DUP_CONSTANTS_B2=1". good.

Potential issue: In direct CLI, it always prints `B-2 副产物：未 export 字面量 const ${r.b2.length} 处...` to console.error even on pass. That may be confusing if running script; prior spec says B-2 is stderr-only, yes.
In check-quality path, imported module doesn't print B-2. good.

Potential issue: CLI passes "红层 X 组 baseline 待收敛 ... warn..." but with no newRed; okay.
If `r.newRed` includes only red groups that are duplicated in current but not baseline due baseline not there; no.

Potential issue: no `--quiet`, no.

Let's focus on semantics of stale baseline perhaps more impactful. Need decide if should flag as B or W.

Let's examine code comments:
```
 * baseline 棘轮（§3）：scripts/dup-constants.baseline.json 存存量 6 组真命中
 * 指纹（name+kind+value+文件集，无行号）。运行时新增/漂移命中 exit 1；
 * baseline 内打印「待收敛」放行（收敛子票 F-LINT-03 候选）。baseline 受锁
...
```
It says baseline stores "存量6组" outdated? File comment line says 6 despite baseline 8? Let's inspect header in code: "存存量 6 组真命中指纹" but baseline JSON entries 8 group. Wait? In header comment:
```
 * baseline 棘轮（§3）：scripts/dup-constants.baseline.json 存存量 6 组真命中
 * 指纹...
```
Actually in final file header line:
```
 * baseline 棘轮（§3）：scripts/dup-constants.baseline.json 存存量 6 组真命中
```
But baseline JSON `_comment` says "实测 8 组（对拍修正：终裁 §4 预估 6 组漏算了 ...)" So header comment says 6 groups stale. It is inconsistent. Does that matter? Not functionality but code evidence of sloppiness. Could be W. Also earlier prompt top says "baseline 棘轮（§3）：scripts/dup-constants.baseline.json 存存量 6 组真命中" from prior final design, now changed 8. The code comment wasn't updated because header still says 6. Wait in the full script pasted:
```
 * baseline 棘轮（§3）：scripts/dup-constants.baseline.json 存存量 6 组真命中
 * 指纹...
```
Yes, but baseline file has 8 entries and comment says 8, "对拍修正... 预估 6 组漏算了". The code header is outdated. Does that confuse maintainers? Yes. Not a functional blocker but should update. We can report W maybe.
Need verify line count: yes near top after criteria. This is direct code evidence. But is header referring to original estimate? It explicitly "存存量 6 组真命中" inaccurate. However user context top summary said "声明 149→141——8 baseline..." So known. This W likely.
But maybe "6组" in header was not updated inadvertently; baseline JSON's `_comment` says "实测 8 组" and mentions "终裁 §4 预估 6 组..." The header should say 8. This is a simple doc mismatch; check one.

Potential issue: In direct CLI pass message:
```
console.log(`dup-constants 检查通过：红层 ${r.baselineHits.length} 组 baseline 待收敛（F-LINT-03 候选）/ warn ${r.warnGroups.length} 组不卡 CI`)
```
If baseline file missing and no newRed (no red groups): pass but baseline path no entries; message red 0 baseline. okay.
No issue.

Potential issue: In check-quality mount's "quality 检查通过：无占位标记 / 无乱码 / 无跨域引用 / 无同值双常量新增": If only warn duplicates, passes but message says no same-value duplicates added; okay.

Let's revisit stale baseline and red drift with deletion/mutation under `scanDuplicateConstants` exact. Suppose a baseline group is fully removed. Baseline entries stale. Does code report stale? no. Suppose stale remains and user adds a *different* duplicate group with same key but different from baseline? If same fingerprint, baseline masks. If code added new duplicate with same name/value as a baseline group that had been fully removed, user likely didn't know. Over long time, "converged" source no red; baseline no longer needed. A human should update baseline to remove stale entries, but no enforcement. In a true baseline lint, stale baseline entries should not necessarily be allowed; usually baseline files (e.g. eslint-disable comments) are removed when issue fixed, else they retain dead suppressions. Dead suppressions may be considered warnings or errors by tools. The purpose: "baseline 棘轮" means changes to baseline require human review; if you remove duplicate, update baseline in same PR; if you don't, stale baseline remains, but source is cleaner. The next regression can be easily mistaken as "known debt." Is that a *gate* failure? It could allow the codebase to re-enter a previously converged state without human intervention. That might be intended? Let's see wording "运行时新增/漂移命中 exit 1；baseline 内打印「待收敛」放行（收敛子票 F-LINT-03 候选）。" A re-added duplicate was in baseline? If baseline still has it, technically it is "baseline 内" at scan time, so it prints 待收敛 and green. But if baseline was stale due prior convergence, a strict reviewer would say the baseline should have been empty. Hard to infer.
Could report as W-4? Maybe "棘轮不校验未命中 entries: 存量组完全收敛后 baseline 不会同步失效；同一指纹回归仍被判 baselineHits 放行" with code evidence:
```
for (const g of redGroups) ... if recordedFiles...
```
No loop over recorded entries to flag stale. Need explain. This is an actual ratchet hole with code evidence. Is it in scope? Likely yes "基线棘轮" semantics. But maybe design baseline not auto-pruned because convergence via sub-ticket updates baseline manually. If human updates baseline with convergence then no mask. Need no blocker.

Potential issue in drift detection: if baseline fingerprint has recorded files set not all currently active? If a baseline entry originally 2 files, one duplicate in file A removed and then added in new file C, but file B remains. record {A,B}, actual {B,C}: size same but files differ => drift red. good.
If actual {B} only (reduced), newRed, requiring baseline update, not stale. only full disappear stale.

Need perhaps report "no stale baseline detection" as W not B.

What about no test for full red list? no.

Let's think if there is issue with "warn 3 groups zero change" and top-level limiting: if previous scan counted nested const and with same value cross-file, it might add warn groups. But baseline no change after limiting means removed nested consts did not create same-value groups? Could be okay. no.

Could there be a logic mismatch in `collectDeclarations` "SourceFile direct children" with wrappers:
They only iterate `sf.statements`. But TS AST often wraps ES modules in a `SourceFile` with `statements` that include a top-level `VariableStatement` for `export const`. yes. No hidden `ModuleDeclaration` unless `declare module`.
`export const` inside `declare module "foo" { export const X = "x" }` is not a module-level const from source, but ambient declaration no initializer. no.
`const` inside `namespace` not module-level; correct.

Potential issue: If top-level statement is `const A = 1, B = 2;` both declarations collected. The `exported` applies to both. line uses `d.name.getStart(sf)`; If variable names separated, line okay. For a declaration with type annotation, `d.name` start. no.
`getStart(sf)` for d.name after decorator? no.

Potential issue: If a declaration name isn't an Identifier because destructuring:
```
const { A } = obj
```
not collected. B2 not includes A because no literal. no.

Potential issue: If initializer `1` but variable is identifier? no.

Potential issue: "negative number literal shell" direct `const x = -1` trivial. But `const x = -1.5` non-trivial. If same name value across files, red. good.
What about `const x = -1_0` text -10, not trivial. okay.

Potential issue: `kind` for boolean not `'boolean'`? yes.

Potential issue: `isTrivial` doesn't consider `-0` because "0"; yes.

Potential issue: no use of `normalizeString` for quotes due TS text. yes.

Could there be bug where string values from single vs double with different escape but same rune are not equal? `n.text` is cooked string content. For string `'\\n'` text is backslash+n? Wait TypeScript's StringLiteral.text returns the *unescaped* string value or raw contents? Need recall: For SourceFile node, `stringLiteral.text` gets value (cooked) of string literal; e.g. `"a\n"` text contains actual newline? I think TS uses `getLiteralText` to unescape; `StringLiteral.text` is the "decoded" text or raw text? Let's verify: AST StringLiteral has `text` property "text of literal, excluding quotes", not sure if escapes decoded. TypeScript examples: `getText()` returns raw with quotes; `stringLiteral.text` returns "hello" for `"hello"` and for `"hello\n"` text is `hello\n` actual newline? In TS compiler, `node.text` for a string literal from source maybe raw text without escapes? Let's recall from TS AST: For a literal node, `.text` is set as scanner token value after escape processing? Example in TS docs: for string literal `"world"`, node.text = "world". "String literal .text contains the literal text without quotes but with escapes unescaped?" I think yes. It matters for normalization. Probably fine.

Potential issue: Template literal using CRLF line endings value normalized? likely line endings preserved? no.

Potential issue: In top-level file path filtering, `/(\.test\.|\.spec\.)/.test(basename(p))` excludes files if basename contains `.spec.` anywhere, e.g. `.respec.tive.ts` weird. no.

Potential issue: `walk` filter receives absolute `p`, regex `\.(ts|tsx)$` on absolute path; if directory name includes `.ts`? no.

Potential issue: If there are `node_modules` under `src`? skip.

Need maybe review if check-quality import module can handle duplicate constants with path relative from `process.cwd()`. In previous check-quality modules likely used root = process.cwd, so okay.

Potential issue: "clean existing type errors"? no.

Let's inspect direct CLI "red new plus corrupt" counts if newRed maybe includes *baseline corrupt* as red lines. When parse fails, `entries=[]`, all red groups are `newRed`; if scan also no red groups, `r.newRed=0`, so pass log before? Actually script:
```
const details = [...r.newRed.map(...), ...formatDupDetails]
console.log('dup-constants：扫描 ...')
for line...
console.error('B-2...')
...
if (r.newRed.length >0 || r.corrupt) exit 1
console.log('dup-constants 检查通过...')
```
If corrupt with no reds, it prints pass line before final? Wait no, if condition runs before final pass line; because code order:
```
if (process.argv[1] ... ) {
 const details...
 console.log(`dup-constants：扫描...`)
 for ...
 console.error(`B-2 ...`)
 if (...) { console.error(...); process.exit(1) }
 console.log(`dup-constants 检查通过...`)
}
```
If corrupt no red, it exits inside. good.
If corrupt with red (normally), details list includes red details; then error. okay.
But if one tries to examine corrupt log line, code also `console.error` from catch earlier. good.

Potential issue: If baseline file is valid JSON with 8 entries but corrupt semantically `entries: "x"`; `corrupt=false`, so if red groups are all there, newRed=8 and exit; if no red groups, final pass with no baseline message. But if no reds, nothing to protect. no.

Need maybe locate "baseline stored 8 groups actual current; baseline parser no schema validation; check-quality and CLI don't log baseline corruption for malformed entries". Could be finding.

Potential issue: "not array entries" not corrupt. If baseline file accidentally sets `entries` to `{}` and current groups still exist, all redgroups—CI remains red; not silent. If maintainers see error "baseline 外新增" instead of "structure broken", they might update baseline incorrectly, but no hard gate. maybe W.
Should probably report one W rather than no issues, because final review should not be empty. But we shouldn't invent. Header count mismatch and stale baseline are real.

Need decide which categories:
- "B" likely "must fix/block"? Code has no critical blocker in main flow. Could say "B: stale baseline can mask reoccurrence of fully converged group"? Is that Blocker? Maybe B-? But desired "可否放行" likely if any B then not pass. Need choose. If not severe maybe W. The prompt says "输出 [B|W|N]+一行总评（可否放行——verify 已由主控统一跑 exit=0）." It might imply likely final can be N. If we output W no? "不可放行" if B? Need maybe.

Let's analyze potential actual B on "corrupt independent of newRed" maybe there is a hidden bug: In `check-quality.mjs`, if baseline corrupt but no `newRed`, because source no red groups, violations gets baseline corrupt. Good. But CLI catches. Yet the scan in both cases sets `entries=[]` on parse error. What if parse error occurs *after* partial JSON parse? `JSON.parse` throws, so existing baseline isn't used. That's by design. Hard red. So B-1 fixed.
Potential bug: `scanDuplicateConstants` catches *any* JSON parse error, but not `readFileSync` errors (e.g. unreadable). Could crash, not silently pass.
Potential bug: If baseline file has parse error and source contains baseline groups, `newRed` non-empty; if source later adds new duplicate not in baseline, both red categories? yes.

Potential issue: In mount path, `for (const v of dupResult.newRed) violations.push...` If no violations otherwise, then final violation list includes code strings starting `dup-constants: NAME ...`; check-quality prints "quality 检查未通过：" and duplicates. Good.
Corrupt violation line "dup-constants: baseline 损坏（解析失败，已按空处理+硬拦截）——检查 scripts/dup-constants.baseline.json" added. Good.

Potential issue: "invalid JSON parse failure but with an existing `entries` file; entries reset empty". Good.

Top-level W-4:
Potential hidden issue in implementing "SourceFile direct children" while excluding `.test` through file filter: `basename` not imported until below. no.
If code has JavaScript comments etc.

Let's consider if scan includes `.tsx` files that start with `export default function`, SourceFile direct child FunctionDeclaration but not variable. no.
If code has `const foo = <JSX/>` no literal. no.
If code has string "same" in JSX text, not constant, not scanned. no.

Potential issue: `ts.isVariableStatement(stmt)` and `stmt.modifiers?.some` possibly modifiers doesn't include ExportKeyword for `export const` in older TypeScript versions because `export` is a `Modifier` not in `.modifiers`? Let's recall TS AST for "export const x = 1":
In TypeScript, `SourceFile.statements[0].kind === SyntaxKind.VariableStatement`; it has `modifiers` property (only in some contexts). In version 4, Node has `modifiers?: NodeArray<ModifierLike>`. For `export const`, yes. In version 5, `canHaveModifiers`.
If package TypeScript is very recent. okay.

Potential issue: Typescript's `.modifiers` property may not include `ExportKeyword` because `export` is in `modifiers`? yes.

Potential issue: W-4 "declare 形态" not.

Let's estimate current source count? no.

Need maybe mention if scan of `declare const` by `VariableStatement` with const flag and no initializer ignored. If constants are declared as types:
```
declare const FOO: 1
```
Not runtime const and no initializer; should not duplicate? no.
But if "declare const LOADING: 'loading'" then not same value? It has type literal, no runtime. no.

Potential issue: Baseline "no line number" but they compute `line` only for B2; no issue.

Potential issue: In `formatDupDetails`, for `warn` lines, uses only names, not file paths. Info. no.

Potential issue: "DUP_CONSTANTS_FULL=1 env" not documented in package output? no.

Let's think if any false positive can arise from comparing constants with same name/value but located in same file path due symlinks? `file` relative paths, no canonical realpath. If same physical file symlinked under two names under src, could count as two different files? Suppose `packages` symlink? Not likely. In monorepo? no.

Potential issue: TypeScript parser errors could be due `.tsx` but script target Latest. no.

Potential issue: In `normalizeNumber`, for Number(text) with very long numeric with precision, can merge 9007199254740992 and 9007199254740993? Number both parse to same "9007199254740992"; duplicates? But original values differ beyond safe integer. Could false positive. Source constants might be unique IDs? They could be large timestamps > 2^53? But numeric duplicates equal? Let's analyze:
`normalizeNumber` semantic value for case `9007199254740993` text, Number(text) = 9007199254740992 (because precision), output same as `9007199254740992`. Two distinct constants may be reported duplicate though in JS runtime both numbers are actually the same value! In JS, numeric literal `9007199254740993` is parsed to 9007199254740992 at runtime. The mathematical values in source differ, but actual computed value same. For duplicate detection of numeric constants, equal runtime value probably correct. But if they wanted source literal equality, normalization would be by Number. no.

Potential issue: Hex case `0x10` and `16` same runtime; red yes. okay.
Potential issue: `NaN` in Number for invalid, no.

Potential issue: if literal contains separator but TS AST text already decoded? okay.

Potential issue: TypeScript scanner for `1_000` maybe `text` "1000" because it parses numeric separators and strips underscores? Let's test? Source text contains underscores; `node.text` likely "1000". Then regex no effect but okay.
If `node.text` "1000" and `normalizeNumber("1000")`. good.

Need maybe inspect no rule for `Object.freeze({})`. no.

Potential issue: `warnGroups` by value for strings but `name` set includes all names. If exactly two names across two files with same value, warn. If one declaration per file same name? names set 1, no warn. correct.
But if both group same value and names set differs, but all cross-file pairs are same-name because name distribution can be weird. Let's systematically identify false positives:
Requirements: "异名同文案（字符串值长度≥4）跨 ≥2 文件" Maybe condition should exist at least two files with different names *per declaration pair*? Let's derive from a scenario:
- file1: `A = "x"`, `B = "x"`
- file2: `A = "x"`
There are red group A cross-file. But there is no cross-file pair of declarations with different names: file1 has A and B in same file; file2 has A only. Across files, A vs A same name; B only in file1 no other file. The value "x" as a whole appears in 2 files under 2 names, so some might classify as "异名同文案" because text appears under A and B? But that would be same-file mixed name. Maybe the requirement "异名同文案" intended to catch values that appear under *at least two different names* in *at least two files*, not necessarily pair cross file. It probably checks:
```
group by value; if names >1 and files >1 -> warn
```
This is common. So not a defect.

Potential issue: If string appears only once in file1 as `A`, and once in file2 as `B`, warn. yes.

Potential issue: If string appears 10 times all in file1 with different names, and one in file2 with a name equal to one of red? Suppose file2 name A; if same as some in file1, red group A across file1/file2, warn too? no.
No.

Potential issue: same-name red group ignores file count of declarations if same file has duplicate name due logical? okay.

Let's look for possible crash due `relative` function importing from `node:path` incorrectly: `import { join, relative } from 'node:path'`; yes.
`basename` defined as function but name maybe conflicts with node path basename not imported. okay.
`replaceAll