[routing]: run=20260910011537-isol source=deepseek model=deepseek-v4-flash switches=0 usage=in=1150,out=8815 latency=44018ms (by ds-call.mjs 链)

# F-LINT-04 对抗审核（门一）

**前提声明**：我收到的只有攻击面清单的转述，**未见设计书原文**。凡标"是否声明"处=我无法确认原文是否已写，按"未覆盖"攻击；若原文已声明请自行忽略。

## 1. ③ 可行性：jiti × ESM × RegExp 共享（不成立→需冒烟证伪）
- ESLint 9 flat config 对 `.js/.mjs` 走**原生 `import()`**；jiti 主要服务 `.ts` config。若本项目确实经 jiti 转译到 CJS，则 `import './scripts/color-re.mjs'`→`require('.mjs')`→`ERR_REQUIRE_ESM`（Node<22.12）或 jiti 内部拦截。**不确定**，1 分钟可验：`node -e "import('./eslint.config.js').then(()=>console.log('ok'))"` + `npx eslint --print-config src/App.tsx >/dev/null`。
- **硬约束**：config 内**禁止** try/catch 回退内联正则——那等于 ③ 静默失效。import 失败必须抛出（fail-closed）。
- **新增洞（RegExp 共享状态）**：COLOR_RE 若带 `g`/`y`，被 rule 多处共享同一实例，`lastIndex` 跨文件污染→**随机漏报**。上轮只修了 `i`，未提 `g`→需确认；建议禁用 g，或使用处 `new RegExp(COLOR_RE.source, COLOR_RE.flags)`。

## 2. ③ 哨兵自咬 / 第三副本（成立）
- 哨兵要"识别内联 hex 正则"，它自己也得有一份 hex 特征模式→**第三个副本**，③ 的单源没覆盖哨兵自身。修正：该 meta 模式也放 color-re.mjs 导出，或哨兵改用结构性判据。
- 扫描面必须**显式枚举并排除自身**：扫 `check-quality.mjs` → 自咬必红；扫 `color-re.mjs`（合法宿主）→ 误咬。设计书未定死扫描文件清单=漏洞。
- W3 扫 theme.test.ts 的 `FS_DECL`（字号正则）与 ③（hex 正则）**特征不重叠**，暂无双报。

## 3. ① AST："全 Literal 门"= 绕过通道（成立，硬伤）
- `{ bg:'#111', hi:get() }`：只要混一个计算属性/`...spread`/`[k]:v` 就**整对象豁免**。低成本绕过。→ 删除"全 Literal"准入门槛，改**逐属性**：`Property[value.type='Literal']` 命中色值即报。
- `VariableDeclarator > ObjectExpression` 漏 `as const` / `satisfies` / `Object.freeze({...})` / 括号。`as const` 在 TS 色值表里是**默认形态**，不是边角。需 unwrap TSAsExpression/TSSatisfiesExpression 或在 `VariableDeclarator` 上判 init。
- **JSX 大小写洞（新增）**：JSX 里 SVG 属性是 camelCase（`stopColor`/`floodColor`/`lightingColor`），白名单若写 kebab（`stop-color`）→ 全漏。清单必须分 CSS-kebab / JSX-camel 两张表，并给出未知属性兜底（`fill|stroke|color|*Color` 名命中色值即报，宁误报）。

## 4. ② 同值守卫
- `#ffffff` vs `#fff`、`red` vs `#f00` 不检——可作**明示不做面**，但必须写进文档，否则算静默盲区。
- **var() 假阳性**：`--text-xs: var(--fs-body)` 与 `--text-sm: var(--fs-body)` 并存→按值归一秒红，而这是 tailwind v4 合法重绑形态。设计书"82 行 0 同值对"若口径仅扫 `:root` 字面 hex，**不能为 `@theme` var() 背书**。→ 需补"@theme 块 + var() 值"的 dry-run，并公开口径（哪些块/含不含 var()/键控维度）。
- 键控维度必须定死：全局按 value 归一 → `color:#fff; background:#fff` 全红，误报爆炸。建议键=(property, normalized value) 或限定 token 声明块。

## 5. ⑥ `;` 切段（成立）
`content:"a;b"`、`url(data:image/svg+xml;base64,...)` 均含 `;`。存量 0 ≠ 规则安全，一旦出现即产生假声明碎片（假阳/假阴）。**建议直接换 postcss**（tailwind v4 已在树内）：`root.walkDecls` 拿 `prop/value`，一举解决 ⑥ + ⑦ + ② 归一化；手写引号/括号深度感知成本更高。

## 6. ⑦ url 剥离（选定，但正则需换）
选**剥离 `url(...)`**是对的：`url(#abc123)` 的 6 位 id 恰全为 hex 字符，会被 hex 正则命中（真假阳）；剥离后语义正确（`fill="url(#x)"` 是 gradient 引用）。但 `url\([^)]*\)` 非贪心会在引号内 `)` 处截断——用 postcss value 解析而非手写正则。

## 7. ④ R−D−W
- tsx 动态拼名会绕开静态 R 集。排查指令：
 - `grep -rn 'var(--\${' src/`
 - `grep -rnE "['\"]var\(--['\"] *\+" src/`
 - `grep -rn 'var(--' src/ | grep -vE 'var\(--[a-z0-9-]+[,)]'`
 命中则 R 集**不可静态闭合**，"未使用 token"必假阳，须声明为已知盲区。
- 白名单双向互指（rule↔doc）手维护→必然漂移，④ 成本被低估。建议 doc 由 rule 导出的数组**生成**（单源）。

## 8. 分期与验收
- ① 是新规则，**全仓 tsx 违规基数未 dry-run**（现有 dry-run 只到 theme.css 82 行）→ 可能一次爆数十条。建议拆：T1=③单源化+哨兵+color-re.mjs（低风险先行）；T2=①AST（先出全仓基数与 baseline）；T3=②⑥⑦（引 postcss）；T4=④文档生成。
- 验收 3「W3 与③并存不互扰」应落为**注入式测试**：注入一条内联 hex 正则→断言**恰好一条** ③ violation；注入 FS_DECL 副本→恰好一条 W3。无此测试该条不可验收。

## 9. 我自己找的第八面
- **命名色逃逸（现存即洞）**：`TabBar.tsx:139 var(--warning, orange)` 证明仓库有命名色。① 若只查 hex → `orange` 逃逸。要么纳入命名色表（大维护面，需明示），要么文档写"命名色不检"。
- **fail-open 风险**：eslint rule / check-quality 哨兵 / postcss 解析三处任一 try/catch 吞错=静默放过。统一：错误→push violation+非零退出。
- **职责重叠**：quality:check 在 lint 前。同一"正则副本"若既被哨兵又被 rule 报→双报/口径不一。需定界：哨兵管"源被复制"，rule 管"色值字面量"。

## 总评：**ENDORSE_WITH_CHANGES**
方向成立（单源化+双哨兵+AST 化），但三处硬伤必须改：① **全 Literal 门+`as const` 漏检**（真绕过+真漏）、② **`@theme var()` 假阳性口径未验证**、③ **哨兵自身第三副本未闭合**。⑥⑦ 建议直接换 postcss（一举三得）。③ 的 jiti 可行性我**不确定**，但一条命令即可证伪，不应拖到实现期。若 ① 的全仓违规基数未先出，该批落地方案应 **REJECT**。