# F-LINT-04 关卡扩展战役——设计书拟定委托（Kimi 架构位第一跳）

你是架构/技术路线设计岗（外部 API，零仓库接触）。以下素材自包含。输出设计书，中文 ≤4K 字。

## 背景与既有关卡格局

Synapse（Electron+TS 学术文献管理）已完成颜色 token 化（F-CSS-03：50 值→48 新 token+2 既有，全部驻 theme.css :root+@theme；消费面 8 CSS+12 tsx 全 var() 载体）。现行三关卡：
- **C-4**（scripts/check-quality.mjs 文本面）：walk src/**/*.css 逐行，行首 `--name:` 声明行豁免（token 定义行），COLOR_RE=`/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/i` 命中=红。
- **B-5**（eslint.config.js 内联 rule，AST 面，files=src/renderer/**/*.tsx）：JSXAttribute[name='style']→JSXExpressionContainer→ObjectExpression→Property.value=Literal 命中 COLOR_RE=红。var() 载体 Literal 不命中天然豁免。
- **W3 哨兵**（check-quality 内）：theme.test.ts 文本 matchAll(/FS_DECL = \//g) 计数>1 红（正则单源防漂移——只哨工具失能态原则：哨兵不哨业务态，哨「提取源被改致工具失能」）。
- COLOR_RE 双写面（check-quality.mjs:202+eslint.config.js B-5 内）逐字一致+头注互指——**一致性纯靠纪律**。

## 七子项素材（门审备案+补审新增——待设计）

①**B-5 扩展面**：模块级常量对象（`const THEME = { bg: '#111' }` 类——ObjectExpression 在非 JSXAttribute 上下文，现行规则不检）+SVG presentation attr（`<rect fill="#fff">`——JSXAttribute name≠'style'）。存量 dry-run：**双双 0 命中**。
②**C-4 token 值重复定义守卫**：theme.css 内两个 token 同值（如 --a:#fff;--b:#fff——F-CSS-03 裁决「同值合并共享」，新增同值=第二源违例）。存量：**0**（82 声明行无同值对）。
③**COLOR_RE 双写机器哨兵**：双写一致性由机器锚定（候选：check-quality 读 eslint.config.js 提取 COLOR_RE 比对；或第三源单源化+生成）。W3 matchAll 先例=哨工具失能态。
④**消费点语义锚**：var(--x) 引用不存在的 token 三层不红（CSS var() 无静态校验）。存量 dry-run：**var() 唯一引用名 91 vs theme.css 定义名 109**；差集分析=活悬空 1 处（`var(--warning, orange)` 带 fallback——TabBar.tsx:139，--warning 无静态定义）+动态注入 2（--ui-scale=document setProperty；--scale-factor=TextLayer 组件内联 style 注入）+注释叙述 1（--gold-night 退役史非活引用）+@theme 重绑消费若干（--text-xs:var(--fs-body) 类）。
⑤**注释历史色值十进规避规范**：注释写 `rgb(255,0,0)` 文字会被 C-4 命中（红），改写十进制 `255,0,0` 即绕过——注释色值面本身 C-4 是误报还是该检？存量：**注释色值 0**（F-CSS-03 清理过 6 行）。
⑥**C-4 行级豁免单行多声明绕过**：`color: red; /* 不可能——但 minified 形态 --name: x; color: red 同行`——行首 `--name:` 豁免放行整行，行内后续声明逃检。存量：**0**（82 豁免行无多声明形态）。
⑦**url(#face) 误报面**：COLOR_RE 的 hex 分支命中 `url(#face)`（SVG filter/gradient id 引用，face=合法 hex 字符）。存量：**0**（无 url(#hexid 引用）。

## 硬约束

- eslint 单文件 lint 隔离模型（无跨文件聚合——那是 B-1 独立 pass 的 check-dup-constants 域）。
- 哨兵只哨工具失能态原则（哨兵哨「规则本体被删改致检测面消失」，不哨业务存量——存量态假设必须设计期 dry-run 实证附在设计书内）。
- 受锁面：check-quality.mjs/eslint.config.js/theme.test.ts=[locked-change]+locks 流程。
- 禁新依赖。verify 全链绿+存量零误报是上线门槛。
- 方案哲学：机器锚定优先、正则单源（W3 模式）、白名单显式登记制（动态注入 token 白名单驻代码+注释互指）。

## 设计书要求（输出结构）

1. **九宫格可检性矩阵**：每子项×（检测面：AST/文本/跨文件聚合；载体：eslint rule/check-quality 段/独立脚本/测试正锚；豁免机制）。
2. **逐子项方案**：选型+理由+先例锚（W3/C-4/B-5 既有形态）+红证设计（每规则先红证一支：植入反例→红→还原）+存量 dry-run 结论引用。含：④的白名单三形态处置（fallback 悬空=红还是放行——给裁决建议；动态注入白名单驻哪）+③的三源单源化 vs 提取比对选型+⑤的注释面裁（C-4 排除注释行 vs 注释色值也禁）。
3. **分期**：一批可落（存量零负担项）vs 需前置清理项（④的 --warning fallback 先 token 化或显式豁免）。
4. **不做面**：成本>收益项明示（如 ⑦ 存量零+低概率——哨兵化是否过度工程）。
5. **验收条款**：每子项的 verify 关卡+先红证+存量零误报声明（附 dry-run 数字）。