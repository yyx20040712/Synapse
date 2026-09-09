[routing]: run=20260909231753-wy6m source=kimi-main model=kimi-k3 switches=0 usage=in=4912,out=3654 latency=124207ms (by ds-call.mjs 链)

# 片一·关卡面 diff 审查结果

## B 级（必修）

**[B-1] COLOR_RE 双写面缺 `i` 标志——大写 `RGB()/HSL()` 双关卡同步失明。**
CSS 函数名大小写不敏感（`color: RGB(255,0,0)` 合法且渲染生效），tsx inline style 值透传 CSS 同样生效。变异红证 mut1/mut2 只验小写咬合，大写形态未被任何红证覆盖。
证据：`check-quality.mjs:199` 与 `eslint.config.js:204` 均为 `/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/`（hex 段有 A-F、函数段无 `i`）。修法：两正则同步加 `i` 或补 `A-Za-z`——注意 hex 段已含 i 等价，加 `i` 无副作用。

## W 级（建议/知悉）

**[W-1] 行级豁免整行放行——同行多声明可绕过 C-4。**
`--x: 0; .a { color: #fff }` 单行书写时，豁免命中即 `return`，同行后续消费面漏检。现状仓格式化 CSS 无此形态（未提供全仓材料，**不确定**），但 minified/压缩拷贝即破。
证据：`check-quality.mjs:206-207` `if (/^\s*--[\w-]+\s*:/.test(line)) return`。

**[W-2] `url(#face)` 类片段引用 C-4/B-5 误报面。**
`#` 后 3-8 个 hex 字母即命中——SVG 片段 id 如 `#face`/`#beef`/`#decade` 全中（f,a,c,e,d 皆 hex 字符）；tsx 侧 `backgroundImage: 'url(#abc)'` 同咬。现状仓未见该形态（材料外，**不确定**），属假想敌面但零成本备案。
证据：`#[0-9a-fA-F]{3,8}\b`——`\b` 在 `url(#face)` 的 `)` 前成立。

**[W-3] matchAll 计数含注释/字符串中 `FS_DECL = /` 字样——W3 哨兵偏严方向。**
theme.test.ts 注释若引用该常量赋值形态即触发多处歧义红。安全方向（宁红勿绿），知悉即可。
证据：`check-quality.mjs:188` `matchAll(/FS_DECL = \//g)` 纯文本计数不区语境。

## N 级（确认无问题/口径核验）

**[N-1] 工单③ matchAll vs .match 口径差已被分支结构吸收。**
计数模式只要求 `FS_DECL = /`，提取模式要求闭合 `/gi`——`declCount===1` 但缺 `gi` 尾标时提取 m=null 落入既有「提取失败」哨兵支，双兜底无静默失明窗口。口径差存在但无逃逸路径。
证据：`check-quality.mjs:188-196` if/else 双支。

**[N-2] 工单④ 双写面逐字一致核验通过。**
两文件 COLOR_RE 逐字比对相同；头注互指双向存在（eslint.config.js:11-14 ↔ check-quality.mjs:4-6），§8.6 纪律落面。但 B-1 证明「双写逐字一致」恰是缺陷同步复制通道——一致性纪律无法替代正确性审查。

**[N-3] 工单① 设计符合性：行级豁免/COLOR_RE/AST 面/哨兵形态四点与 §1 原文逐项吻合。**
AST 面 JSXAttribute→ExpressionContainer→ObjectExpression→Property.value=Literal 链路如实；`prop.type !== 'Property'` 跳过 SpreadElement、模板串/表达式不检与票面「单文件态面」声明一致；`if (fsDeclRe)` 替代 `break` 使 C-4 在字号哨兵红时仍全量执行——行为优于原案（原 break 会连坐跳过）。

**[N-4] 零文件哨兵/提取失败哨兵/多处歧义哨兵三形态齐全**，红证支③④+mut3 的 exit 0→1 序列证明 W3 有咬合，非空转。

## 统计

B=1（大小写失明）/ W=3 / N=4。

**总评**：关卡骨架与红证/变异证闭环完整、设计符合性高，但 COLOR_RE 缺 `i` 是双写面同步的真实绕过洞（变异证盲区恰在未测的大小写变异上）——一处正则修正即可闭合，建议收口前补 `i` 并追加一条大写反例红证。