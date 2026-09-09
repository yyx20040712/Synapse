[routing]: run=20260909140520-h6yo source=deepseek model=deepseek-v4-flash switches=0 usage=in=6506,out=15451 latency=132059ms (by ds-call.mjs 链)

复核完毕。以下按工单三项给出结论，附 N 级注记。

## 1. B-1 硬拦截双路径——✔ 成立

**CLI 路径**（`scripts/check-dup-constants.mjs` 尾部）：
```js
if (r.newRed.length > 0 || r.corrupt) {
  ...
  process.exit(1)
}
```
`corrupt` 与 `newRed` 是独立 OR 条件。净存量场（无新增红组但 baseline 损坏）时：`corrupt=true`，即使 `newRed=0` 也 `exit(1)`——不依赖存量红组兜底，工单承诺兑现。

**挂载路径**（`scripts/check-quality.mjs`）：
```js
for (const v of dupResult.newRed) violations.push(...)
if (dupResult.corrupt) { violations.push('dup-constants: baseline 损坏……') }
```
`corrupt` 单独成一条 violation，不挂在 `newRed` 上。且 corrupt 时按空 baseline 处理会把全部实测红组推入 `newRed`，两条路径都有冗余双保险；净空场损坏（红组数为 0、仅 corrupt）也会被 violations 拦截 → `process.exit(1)`。双路径语义一致。

另核：空文件、结构不合法（`entries` 非数组）、文件被删等场景——空/结构错走 corrupt 或 `entries=[]` 导致红组全部 newRed；文件被删走 `existsSync=false` 同样令红组全部 newRed。无静默放行缺口。

## 2. W-4 顶层限定 AST 边界——✔ 覆盖

```js
for (const stmt of sf.statements) {
  if (!ts.isVariableStatement(stmt) || (stmt.declarationList.flags & ts.NodeFlags.Const) === 0) continue
  const exp = stmt.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false
```

`sf.statements` 即 SourceFile 直接子级。函数/块级/namespace/IIFE 内的 VariableStatement 均不在 `sf.statements` 中，天然排除。`export const` 与顶层裸 `const` 都走同一分支；`export` 判断不影响收集，只影响 B-2 标记。`declare const` 无 initializer，被 `!d.initializer` 排除，不会误入。`.d.ts` / `.test.` / `.spec.` 排除与声明口径一致。

嵌套用例（RED-6）exit=0 的语义从代码路径可复现：函数内局部重复不跨文件，redGroups 不含之。

## 3. 声明数 149→141——无法静态复验，但逻辑无矛盾

当前 diff 中不含上一轮 collect 实现，无法还原 149 的口径差。差值 8 与 baseline 条目数 8 数值相同，但两者不应混淆——baseline 8 组均为顶层 const，在新旧口径下都应保留，差值不是由 baseline 条目删除造成。合理解释是上轮多收的 8 条为局部/嵌套 const，方向与 B-2 91→83 一致；但精确构成无法仅凭本轮 diff 验证，此项结论置信度有限。

---

## N 级注记（不阻塞放行）

1. **自述文档不一致**：`check-dup-constants.mjs` 头注写“baseline 棘轮（§3）：scripts/dup-constants.baseline.json 存存量 **6 组**真命中”，而 baseline 文件 `_comment` 自述“实测 **8 组**（对拍修正……）”。逻辑以文件实际 entries=8 为准，头注是过时描述，建议门三顺手改正。

2. **未覆盖形态（规约外，明确不阻塞）**：`literalOf` 只剥 `-` 负号，`+1`/`+5` 一元正号不进；`<T>expr` 老式类型断言亦不进。均不在六判据列举范围内，属既定盲区而非偏离。

---

[N] 无 B/W 级返工项；B-1 双路径、W-4 边界均代码实证闭环，声明数差量无法静态复验但无矛盾——**放行**。