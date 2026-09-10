[routing]: run=20260910115221-2n8e source=kimi-main model=kimi-k3 switches=0 usage=in=8653,out=4669 latency=73063ms (by ds-call.mjs 链)

# 门一对抗深审报告——F-LINT-04-T2（B-5 AST 扩展实现跳）

审计范围：eslint.config.js diff（239→332）、实现者报告、票面+终裁档 §1.1/§2/§4、证据链抽样。主控预裁 5 项已复核，未发现可推翻的更强依据。

---

## B 级（阻断性偏差）

无。

逐条核票面语义（A 审项）：unwrap 三形态（TSAs/TSSatisfies→expression、Object.freeze→arguments[0]）、逐属性判定（弃全 Literal 门、key Identifier/string Literal 均入判、SpreadElement/嵌套/模板串不检）、单值 Literal 纳入（主控预裁 1）、JSX 属性名域（显式六词 ∪ `endsWith('Color')`、域外不报、value 限 string Literal）——diff 实物与票面+§1.1 修正条款逐条对得上，R5「混合对象恰 1 error」直接证明逐属性判定落地（旧门下整对象豁免形态已被闭合）。

---

## W 级（瑕疵/疑点，建议修复或核实）

**W1｜报告 §6.6 与 diff 实物不符（诚实性，C 审项）**
报告 §6.6 自述：「EXPLICIT_ATTRS 常量位置：置于 create() 内（每文件重建一次，微开销可忽略）」。diff 实物：该常量声明在 **JSXAttribute visitor 函数体内**（style 分支 `return` 之后、`if (!EXPLICIT_ATTRS.includes(attr)…` 之前），即**每个 JSXAttribute 节点访问时重建一次**，非 create() 级每文件一次。行为无错、性能影响可忽略，但自裁申报与实物描述不符——申报纪律本身是被审对象。建议：更正报告或将常量上提至 create()（与 `hitsColor`/`unwrapInit` 同级）。

**W2｜COLOR_RE 若带 /g 标志，`.test()` 存在 lastIndex 状态性串扰（不确定，需门二核 color-re.mjs）**
新增 `hitsColor = (s) => COLOR_RE.test(stripUrlFunctions(s))`，在 VariableDeclarator 逐属性 for 循环中**对同一正则对象连续 .test()**。若 COLOR_RE 带 global 标志，偶数位命中属性会被静默跳过（lastIndex 跨字符串残留）。材料未给出 color-re.mjs 内容，**此点不确定**。旁证：R1-R11 全部为单属性对象，矩阵无「单对象 ≥2 个色值属性」红支，即使存在该 bug 也不会暴露；lint-baseline 全绿亦不能证伪（存量 0 形态）。注意原 style 路径循环同构（既有遗留），非本 diff 新引入，但本 diff 新增了一处同模式调用面。处置：核实 COLOR_RE 标志；若带 /g，hitsColor 内应 `COLOR_RE.lastIndex = 0` 或改用新正则/`match`。

**W3｜unwrap 深度上限 off-by-one（票面字面偏差）**
票面：「深度上限 4 防御」。实现：`if (!node || depth > 4) return node`——depth=0..4 共 **5 层**仍会执行 unwrap，第 6 次调用才截断。即实际最大 unwrap 次数=5，与票面字面「4」差 1。防御性目的不受影响（双层嵌套如 `Object.freeze({...} as const)` 仅需 2 层），属字面偏差非语义破坏。另：深度截断分支（depth>4 原样返回）无任何红证/NR 支覆盖，纯纸面防御代码。

**W4｜证据件 dryrun-recheck 段内容疑似混杂（不确定）**
证据抽样中 `=== dryrun-recheck ===` 段在 `exit=0` 之后接续了 vite build 产物输出（pdf.worker chunk 列表、`✓ built in 3.21s`、又一个 `exit=0`）。可能是 raw 文件串接了多命令输出，也可能是抽样拼接伪影。无法从材料判定 dryrun 复跑的真实尾行归属，需门二核 scripts/audits/f-lint04-t2-dryrun-recheck.raw.txt 原件确认 dry-run「77 tsx 四面全 0+exit=0」的落盘纯净性。

---

## N 级（注记/残留面，不阻断）

**N1｜红证矩阵覆盖盲区（D 审项）**：票面语义内仍有未覆盖形态——①单对象多色值属性（逐属性循环的全量命中，兼 W2 的试金石）；②双层嵌套 unwrap（头注自述 `Object.freeze({...} as const)` 等嵌套均经此递归，但矩阵无双层支）；③深度上限截断后的不判形态。R1-R11 均单形态单属性，矩阵「每支恰 1 error」验证充分但广度留缝。

**N2｜JSX 属性值限 string Literal**：`fill={'#fff'}`（JSXExpressionContainer 包 Literal）不报——符合票面字面（「value 为 string Literal 命中即报」），但与 style 面「container→ObjectExpression」的解析深度不对称，构成票面语义内的合法绕过通道。建议入残留面档。

**N3｜`Object['freeze']`（computed MemberExpression）不 unwrap**：`node.callee.property.type === 'Identifier'` 硬条件使字符串计算属性形态绕过 unwrap。边角形态，dry-run 基线 0，注记即可。

**N4｜destructuring init**（`const { bg } = { bg:'#111' }`）会逐属性命中且名字显示 `(destructured)`——报告 §7.2 已自申报，按票面对 init 判定的字面执行，可接受；报错文案「模块常量色值」对函数体内局部 const 亦触发，措辞略宽但不误报。

**N5｜主控预裁 5 项复核**：①单值纳入有 R6/R7 红证支撑；②深度上限见 W3；③哨兵面零改动——diff 实物确未触 META_RE/W3 FS_DECL/check-quality 6b，且新代码用 `endsWith('Color')`+显式表字符串方法、rule 内零内联 hex 正则，6b 互咬面无新增风险，quality:check 通过佐证；④规则名维持+头注扩义已落（两处头注同步，防漂移处理合理）；⑤.ts 面不扩有 dry-run 补盘 0 形态支撑。5 项维持。

**N6｜宪法红线（B 审项）**：分层/安全禁令无涉；332 行 ≤500 ✓；diff 无乱码迹象（中文注释完整）；零新依赖（仅既有 import 复用）✓；实现者零 locks 命令、verify 唯一红因=locks:check sha 不一致=票面⑤预期形态 ✓。

**N7｜接缝（E 审项）**：头注互指保留并扩写三路径全貌；color-re.mjs 单源未被破坏（import 行零改动）；T4（var() 语义锚）前置面——NR3/NR4 实证 var() 载体在单值与引用两形态均不红，T4 落地基线干净。

---

## 统计

| 级 | 数 | 条目 |
| --- | --- | --- |
| B | 0 | — |
| W | 4 | W1 报告 §6.6 失实 / W2 COLOR_RE 标志状态性（不确定）/ W3 深度上限 off-by-one / W4 dryrun raw 混杂（不确定） |
| N | 7 | N1-N7 |

## 总评：**放行附条件**

票面语义实现完整、红证矩阵 16 支+preimpl+变异三态+存量绿检证据链结构闭合，无 B 级阻断。放行条件（按优先级）：
1. **W2**：门二核实 scripts/color-re.mjs 的 COLOR_RE 标志位；若带 /g，hitsColor 须消状态性并补「单对象双色值属性」红支（顺带闭合 N1①）。
2. **W1**：更正报告 §6.6 或将 EXPLICIT_ATTRS 上提至 create()，使申报与实物一致。
3. **W4**：核 dryrun-recheck.raw.txt 原件纯净性。
4. W3 字面偏差可随条件 1 同批微调（`depth >= 4`）或入档注明「实际上限 5」，二选一。