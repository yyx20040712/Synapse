# F-LINT-01 实现者简报——INV-11 lint 机器化 MVP（终裁版落地）

> 档位：GLM5.3flash（实现者位；环境限制统一档如实记）。主控=GLM5.3。
> 真相源：docs/design/2026-09-09_f-lint01-design-final.md（设计链三跳终裁
> 版——本简报=其 MVP 面的执行展开；冲突以终裁档为准）。

## ① 任务一句话

终裁版 MVP 三项落地：C-8 全量 CSS 字号负锚+C-4 CSS 颜色消费负锚
（check-quality.mjs）+B-5 tsx inline 颜色 rule（eslint.config.js 内联）；
INV-11 升格注记（invariants.md :25 状态列+强制方式列）。

## ② 必读序（文件清单化）

1. `docs/design/2026-09-09_f-lint01-design-final.md`——终裁档全文（§0
   裁决记录+§1 MVP 三项细节+§4 INV-11 措辞）。
2. `scripts/check-quality.mjs`——现结构（walk 先例 :30/:41/violations
   收集+报告出口形态）。
3. `eslint.config.js`——flat config 现结构（files 白名单/no-restricted-
   imports 先例）。
4. `tests/unit/renderer/theme.test.ts` :425——FS_DECL 常量行（C-8 提取
   目标）。
5. `docs/invariants.md` :25——INV-11 行（升格目标）。

## ③ 主控预裁（逐条——实现者不再自裁）

1. **C-8**（check-quality.mjs 新关卡段）：
   - 提取：`readFileSync('tests/unit/renderer/theme.test.ts','utf8')`
     →`.match(/FS_DECL = \/(.+)\/gi/)`——**读失败/捕获 null=violations
     push 硬红**（消息含「哨兵」字样与原因）；
   - `new RegExp(m[1],'gi')` 对 walk(`src`,`.css`) 每文件 match 计数>0
     →红（文件名+样例 ≤3）；
   - **walk 零 CSS 文件=硬红**（失能哨兵，同段消息）。
2. **C-4**（同一 walk 循环第二关卡）：
   - 行级：豁免 `/^\s*--[\w-]+\s*:/`（定义行）；命中
     `/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/` 行=红（文件:行号+行文本
     截断）。
   - 两关卡合一段（§4b 先例：CSS 行数关卡注释风格同型）。
3. **B-5**（eslint.config.js 内联）：
   - `plugins: { synapse: { rules: { 'no-inline-color': { create(ctx)
     {…} } } } }`；files 面=src/renderer/**/*.tsx 的既有段挂
     `'synapse/no-inline-color': 'error'`；
   - AST 路径：JSXAttribute(name=style)→JSXExpressionContainer→
     ObjectExpression→Property.value 为 Literal 且 String(value) 命中
     C-4 颜色正则→context.report({node,message 含值}）。数字 Literal
     （CSS 数字色值不存在）忽略；模板串/表达式不检。
   - rule 内正则与 C-4 消费正则**文本一致**（两关卡文件不同无法单源
     ——头注互指注释注明对位关系,改值须双写——已知边界自裁申报面）。
4. **INV-11 升格**（invariants.md :25）：强制方式列+状态列按终裁档 §4
   措辞替换（「审查（lint 无对口规则）」→机器锚定描述；「部分…」→
   「已锚定（机器面 2026-09-09 F-LINT-01——lint 段 inline 颜色 rule+
   quality 段全量 CSS 字号/颜色负锚含新文件自动入锚+提取/零文件哨兵；
   人审残留面在册=结构等价类型/文案双源/泛化魔法值/CSS-in-JS[本仓无
   形态]）」）。
5. **受锁流程**：主控已预 unlock；实现者不碰 locks；verify 拆跑=
   `npm run quality:check && npm run lint && npm run typecheck && npm run test`
   （locks:check 预期红=工作流预期）。
6. **扩展面不实现**（终裁档 §2——B-1/B-2/B-6/C-3 均注记备案不落码）。

## ④ 纪律

- **先红证四支**（终裁档 §1 验收①）各落 .raw.txt（cp 备份法植入→红→
  还原 diff 空；哨兵支=临时重命名 theme.test.ts FS_DECL 常量→C-8 红→
  还原——注意哨兵支植入时 npm run test 会连带红属预期,只跑 quality:check
  段取证即可）。
- 存量零误报=quality:check+lint 全绿。
- 多断言禁与行尾注释同置；UTF-8；check-quality.mjs ≤500 行+
  eslint.config.js ≤500 行；卡点=BLOCKED。
- 证据后缀 .raw.txt；npm run test 禁裸 npx vitest。

## ⑤ 验收判据

1. 四支先红证在档（各自原始输出+exit 码）。
2. quality:check 存量绿（零误报）+lint 绿+typecheck 绿+test 1466 绿。
3. B-5 rule 真红过（③支）+真绿过（还原后 lint 全绿）。
4. INV-11 升格措辞=终裁档 §4 逐字。
5. diff 范围=恰三文件（check-quality.mjs/eslint.config.js/invariants.md）
   +植入还原零残留。

## ⑥ 报告契约

全文落 `scripts/audits/f-lint01-impl.report.md`：实现摘要/哨兵设计说明
（提取失败/零文件双哨兵的落点行号）/四支红证清单/存量零误报证据/
自裁申报（含 B-5 正则双写面声明）。回复五行内。
