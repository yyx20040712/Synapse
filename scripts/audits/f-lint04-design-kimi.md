[routing]: run=20260910011313-e5bq source=kimi-main model=kimi-k3 switches=0 usage=in=1545,out=3555 latency=93291ms (by ds-call.mjs 链)

# F-LINT-04 设计书：颜色关卡扩展战役

## 0. 总则

七子项按「机器锚定优先、正则单源、白名单登记制」三原则处置。所有存量假设均已经 dry-run 实证（数字随项引用）。受锁三文件改动一律走 [locked-change]+locks 流程。

## 1. 九宫格可检性矩阵

| 子项 | 检测面 | 载体 | 豁免机制 |
|---|---|---|---|
| ①B-5 扩展（模块常量对象+SVG attr） | AST | eslint rule（B-5 同 rule 内加两条路径） | eslint-disable-next-line 显式注释 |
| ②token 同值守卫 | 文本（文件内聚合） | check-quality 新段 C-4b | 无（同值合并系 F-CSS-03 裁决，不设豁免口） |
| ③COLOR_RE 单源化 | 文本哨兵+物理单源 | 第三源模块 + W3 式 matchAll 哨兵 | 无（哨工具失能态） |
| ④var() 语义锚 | 跨文件聚合 | check-quality 新段 C-4c（B-1 独立 pass 先例） | 动态注入白名单常量+注释互指；带静态 fallback 引用（待裁决，见 §2.4） |
| ⑤注释色值 | 文本 | C-4 现行行为（保持） | 无新增 |
| ⑥行首豁免多声明 | 文本 | C-4 段内改造（行→声明粒度） | 仅 `--name:` 声明段本身 |
| ⑦url(#hexid) 误报 | 文本/AST 同源 | 随③在第三源内修 regex | 剥离 `url(...)` 后再检 |

## 2. 逐子项方案

### 2.1 ① B-5 扩展（一批落）
在 B-5 rule 内增两条 visitor 路径：(a) `VariableDeclarator > ObjectExpression`，当对象全部 `Property.value` 为 Literal 且任一命中 COLOR_RE 时报红（全 Literal 条件避免误伤混合配置对象）；(b) `JSXAttribute`，name ∈ 显式 SVG presentation 清单（fill/stroke/stop-color/flood-color/lighting-color 等，清单驻 rule 头注）且 value 为 Literal 命中 COLOR_RE。先例锚：B-5 既有 Literal 判定逻辑直接复用。红证：植入 `const T={bg:'#111'}` 与 `<rect fill="#fff">` 各一支→红→还原。存量 dry-run 双 0 命中，零负担。

### 2.2 ② C-4b token 同值守卫（一批落）
check-quality 新段：解析 theme.css `:root`+`@theme` 全部 `--name: value` 声明行，按 value 归一化（去空白、小写）后分组，同值 ≥2 键=红，报出键名对。纯文件内聚合，不触 eslint 隔离约束。红证：复制任一声明行改名植入→红→还原。存量 82 声明行 dry-run 无同值对。

### 2.3 ③ COLOR_RE 单源化（一批落，走 locks）
**选型：第三源单源化，弃提取比对。** 理由：提取比对（check-quality 读 eslint.config.js 抠正则）仍锚在「两处文本格式可被解析」这一纪律假设上，比对逻辑自身又是第三处脆弱点；单源化从物理上消除双写面，与「机器锚定优先」一致。方案：新建 `scripts/color-re.mjs` 导出 COLOR_RE 唯一字面量；check-quality.mjs 与 eslint.config.js 均 import（两文件本即 ESM，禁新依赖满足）。哨兵：check-quality 内对两文件 matchAll 内联 hex 正则特征 `/\[0-9a-fA-F\]\{3,8\}/g`，计数 >0 即红——哨「有人回退内联致单源失能」，严格对齐 W3 只哨工具失能态先例。红证：在 eslint.config.js 内联回退一支→红→还原。

### 2.4 ④ C-4c var() 语义锚（二期，需前置清理）
检测面为跨文件聚合，超 eslint 单文件隔离模型，故载体=check-quality 段（B-1 check-dup-constants 独立 pass 先例）。算法：扫 src 全域 `var\(\s*(--[\w-]+)`（含 theme.css 自身 @theme 重绑消费）取引用名集合 R；theme.css 定义名集合 D；R−D−W（白名单）非空=红。
**白名单三形态裁决：**
- **动态注入**（--ui-scale、--scale-factor）：登记制放行。白名单 `DYNAMIC_TOKENS` 常量驻 check-quality.mjs 段首，逐条注注入点文件：行；注入点代码侧注释回指白名单常量名（双向互指）。
- **fallback 悬空**（`var(--warning, orange)`，TabBar.tsx:139）：**裁决建议=红，前置清理**。理由：orange 为裸色值，fallback 在此不是容错而是 token 体系的静默绕过通道；且 --warning 无任何静态定义，属语义残缺。前置清理=补定义 --warning token（走 F-CSS token 流程）或改写引用既有 token，而非登记豁免——豁免会为此形态开永久口子。
- **注释叙述**（--gold-night 退役史）：引用提取前先剥离注释行（与 2.5 联动），不入白名单。
红证：植入 `var(--ghost-x)`→红→还原；另植入 `var(--ui-scale)` 验证白名单放行不红。

### 2.5 ⑤ 注释色值裁（一批落，零改动保持）
**裁决：注释色值也禁，保持 C-4 现行不裁剪行为。** 依据：F-CSS-03 曾实清 6 行注释色值，证明该面真实出险且规则在起作用；注释色值是文档面第二源，同样漂移。承认十进制 `255,0,0` 绕过面存在但列入不做面（§4）。存量注释色值 0，无双向负担。④的注释剥离仅作用于引用名提取，不改动 C-4 色值判定路径。

### 2.6 ⑥ C-4 声明粒度改造（一批落）
行首 `--name:` 豁免从行粒度降声明粒度：行内按 `;` 切段，仅段首匹配 `--name:` 的段豁免，其余段照常过 COLOR_RE。消除 minified 形态 `--a: x; color: red` 同行逃检。红证：构造 `--a: var(--x); color: #fff` 单行→红→还原。存量 82 豁免行 dry-run 无多声明形态，改造后行为等价零误报。

### 2.7 ⑦ url(#face)（随③顺修，不独立立项）
在第三源内修：色值检测前先剥离 `url(...)` 包裹内容（SVG filter/gradient id 引用非颜色），或 hex 分支加否定边界。因③后只改一处，边际成本≈零，顺手做；**不建专门哨兵**（存量 0、低概率，独立哨兵属过度工程）。红证：植入 `filter="url(#face)"`→不红 + `#face` 裸写→红，双向验证。

## 3. 分期

**一批（存量零负担，直接落）**：①②③⑤⑥⑦。dry-run 数字：①双 0、②82 行 0 对、⑤0、⑥82 豁免行 0 多声明、⑦0。③⑤⑥⑦同批因③单源化是⑦顺修的前提。
**二期（前置清理）**：④。前置项=TabBar.tsx:139 `--warning` token 化（或改引既有 token），清理后 dry-run 要求 R−D−W=∅ 再上线 C-4c。

## 4. 不做面

- ⑦独立哨兵/独立规则：存量 0+低概率，哨兵化过度工程，仅随③修 regex。
- ⑤十进制/函数名拆解（`255,0,0`、`red` 裸词）穷举检：文本规则无法完备覆盖自然语言色值叙述，投入产出不成比，留作人审面并在 C-4 头注明示该残留面。
- ②的跨文件同值（theme.css vs 其他 CSS 硬编码）：已由 C-4 现行覆盖，不重复建设。

## 5. 验收条款

1. 每子项规则先红证一支（植入反例→红→还原），红证记录附提交。
2. verify 全链绿；①②⑤⑥⑦上线后存量扫描零误报（复跑 dry-run 数字对齐：0/0/0/82 行等价/0）。
3. ③上线后：双写面物理消失，哨兵红证（内联回退→红）通过，W3 与③哨兵并存不互扰。
4. ④上线门槛：`--warning` 前置清理完成，R−D−W=∅；白名单 DYNAMIC_TOKENS 仅 2 条且双向注释互指在位；红证（--ghost-x 红/--ui-scale 不红）通过。
5. 受锁三文件全部改动走 [locked-change]+locks 流程，锁记录齐。