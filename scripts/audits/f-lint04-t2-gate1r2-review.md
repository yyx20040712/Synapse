[routing]: run=20260910120036-wf6j source=kimi-main model=kimi-k3 switches=0 usage=in=3995,out=3805 latency=92943ms (by ds-call.mjs 链)

# 门一定点复核报告（R2 轮）——F-LINT-04-T2 回炉轮 1

## 一、5 项指令逐条复核

### 指令 1（W1：EXPLICIT_ATTRS 上提 create 级）——**ADDRESSED**

代码证据：

```js
create(context) {
  const hitsColor = (s) => COLOR_RE.test(stripUrlFunctions(s))
  // [W1 回炉 2026-09-10] EXPLICIT_ATTRS 上提 create 级（与 hitsColor/unwrapInit 同级……）
  const EXPLICIT_ATTRS = [ 'fill', 'stroke', 'color', 'stop-color', 'flood-color', 'lighting-color' ]
  const unwrapInit = (node, depth = 0) => { … }
  return { VariableDeclarator(node) {…}, JSXAttribute(node) {…} }
}
```

作用域正确性核验：两个 visitor 均为 `create()` 返回对象的方法，通过闭包引用 `EXPLICIT_ATTRS`/`hitsColor`/`unwrapInit`，词法作用域合法。`JSXAttribute` 内 `if (!EXPLICIT_ATTRS.includes(attr) && !attr.endsWith('Color')) return` 引用处与定义处同闭包，无提升前引用、无遮蔽。每文件 create 一次重建数组，代价可忽略。**作用域变更未引入破坏。**

### 指令 2（W3：depth > 4 → depth >= 4）——**ADDRESSED**

代码证据：`if (!node || depth >= 4) return node`，注释锚 `[W3 回炉 2026-09-10]` 在。

嵌套账目核验（重点：depth>=4 后 R14 是否仍可解）——追踪 `Object.freeze({...} as const)`：

- depth=0：CallExpression(freeze) → 0>=4 否 → 递归 arguments[0]，depth=1
- depth=1：TSAsExpression → 1>=4 否 → 递归 expression，depth=2
- depth=2：ObjectExpression → 非 unwrap 形态 → 原样返回

R14 需解 2 层，上限 4 层（depth 0/1/2/3 可递归，depth=4 截断），裕量充足。R14 证据 `1:41 error …（NEST.bg）` 实证可解。语义对齐票面字面「深度上限 4」=最多解 4 层包裹；第 5 层起返回非 Object/Literal 节点落入静默不判（注释已明示「不误报」）。**账目闭合，无回归。**

### 指令 3（N2：container 包裹同检，style 分支不动）——**ADDRESSED**

代码证据：

```js
if (attr === 'style') { …原路径… return }   // style 分支提前 return，与新增域物理隔离
…
const v = node.value
if (!v) return
const lit = v.type === 'JSXExpressionContainer' ? v.expression : v
if (!lit || lit.type !== 'Literal' || typeof lit.value !== 'string') return
```

重点核验 `fill={{对象}}` 误报面：container 形态下 `lit = v.expression` = ObjectExpression，`lit.type !== 'Literal'` → return skip。**不误报，满足「lit.type 必须非 ObjectExpression 才 skip」的反向要求（实为：非 Literal 一律 skip，ObjectExpression 含在内）。** `fill={'#fff'}` → lit=Literal string → 入判，R13 证据 `1:36 error …（fill）` 实证。style 分支逻辑逐行比对首轮版本无变化（仅 guard 子句由 `!== 'style' return` 重构为 `if(attr==='style'){…return}`，行为等价）。**头注③已补 N2 注记。**

### 指令 4（红证补强三支+r13-preimpl）——**ADDRESSED（附一条证据瑕疵提示）**

- R12：`✖ 2 problems (2 errors, 0 warnings)` exit=1 ✓ 恰 2
- R13：`✖ 1 problem (1 error)` exit=1 ✓ 恰 1
- R14：`✖ 1 problem (1 error)` exit=1 ✓ 恰 1
- r13-preimpl：exit=0 ✓ TDD 红（改前 0 error 证检测缺失，改后 1 error，因果链完整）

**证据瑕疵（非阻断）**：R12 抽样仅展示 `#222222（DUAL.b）` 一行 error，另一行（应为 DUAL.a）未展示，仅凭计数行 `2 errors` 支撑「恰 2」结论。计数行与逐属性单报逻辑（每 prop 至多 report 一次）一致，采信；但建议留档完整输出。

### 指令 5（报告 §8/§6.6/§6.7/§3 更新+行数 345）——**无法核验（NOT VERIFIABLE）**

复核材料仅含 eslint.config.js diff 与四段红证抽样，**报告本体不在本轮材料内**。§8 回炉节、§6.6 更正、§6.7 N2 申报、§3 矩阵三行、行数 345 实测均无从对勘。diff 头部 `239→345` 与回执一致，但「实测 345 行」未提供 `wc -l` 证据。**此项只能记「不确定」，需主控以报告实物销项。**

## 二、回炉增量新破坏扫描

逐项排查，**未发现新缺陷**：

1. **EXPLICIT_ATTRS 作用域**：见指令 1，闭包正确。
2. **depth>=4 账目**：见指令 2，R14（2 层）可解，4 层边界语义与票面字面一致。
3. **N2 container 分支误报面**：`fill={{…}}`/`fill={expr}`/模板串/空 container（JSXEmptyExpression）均被 `lit.type !== 'Literal'` 拦截 skip；`fill`（无值）被 `if (!v) return` 拦截。
4. **VariableDeclarator 空 init**：`let x;` → `unwrapInit(null)` → `!node` 返回 null → `if (!init) return` 拦截 ✓。
5. **解构声明**：`node.id` 非 Identifier 时 name=`'(destructured)'`，不抛异常 ✓。
6. **非 string Literal 值**（数值/布尔）：两处均有 `typeof … !== 'string'` 门 ✓。
7. **计算键/SpreadElement**：`prop.type !== 'Property'` 与 key 类型白名单拦截，与头注「明示不检残留面」申报一致 ✓。
8. **style 分支行为**：逐行等价，仍用内联 `COLOR_RE.test(stripUrlFunctions(s))` 而非 `hitsColor`——两者语义相同，属不一致而非缺陷（提示：后续可统一，非本轮范围）。
9. **哨兵面**：新增代码零内联 hex 正则（属性域用 `includes`/`endsWith` 字符串方法），6b 哨兵不触红 ✓。
10. **COLOR_RE 状态性**：沿用主控已证结论（i 标志无 g，.test 零 lastIndex），增量未改调用方式 ✓。

## 三、总评

**指令 1/2/3/4：ADDRESSED；指令 5：材料外无法核验。回炉增量零新破坏。**

裁定：**收口放行**，附两项非阻断条件——
1. 指令 5（报告 §8/§6.6/§6.7/§3 及 345 行实测）由主控以报告实物对勘销项，门一本轮材料不含报告本体；
2. R12 红证建议补全双 error 行完整输出留档（当前仅凭计数行支撑「恰 2」）。

W2/W4 已由主控首轮亲证销项，本轮复核未发现与之矛盾的增量证据。