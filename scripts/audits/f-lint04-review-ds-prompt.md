# F-LINT-04 设计书对抗审核（deepseek 第二跳——END 掉它或找出它的洞）

你是技术路线对抗审核岗。以下设计书全文+背景约束自包含。你的职责=攻击：找技术不可行/方案矛盾/绕过通道/成本误判。不确定的明说。中文输出 ≤3K 字。

## 背景补充（审核所需事实）

- eslint.config.js=ESM（`export default tseslint.config(...)`，eslint 9 flat config，jiti 加载）。
- check-quality.mjs=Node ESM 脚本（verify 链首环节，node 直跑）。
- W3 哨兵现行形态：`const declCount = [...themeTestText.matchAll(/FS_DECL = \//g)].length; if (declCount > 1) violations.push(...)`——哨「theme.test.ts 内 FS_DECL 正则定义被复制」。
- B-1 先例=scripts/check-dup-constants.mjs（独立聚合 pass，verify 链内 npm run lint:dup-constants）。
- verify 链=quality:check && tickets:check && locks:check && lint && typecheck && test && build。
- theme.css 结构：:root token 块+@theme 块（tailwind v4 重绑 `--text-xs: var(--fs-body)` 类）+组件样式段。
- TabBar.tsx:139 `style={{ color: 'var(--warning, orange)' }}`。
- 上轮补审已修 COLOR_RE 的 i 标志（大小写绕过洞）——设计书③是在此基础上的单源化。

## 攻击面清单（不限于）

1. **③技术可行性**：eslint.config.js（jiti 加载环境）import './scripts/color-re.mjs' 是否真可行？（jiti 对相对 .mjs import 的解析/转译行为——若 jiti 把 config 当 CJS 转译或拦截 import，方案即塌）哨兵「matchAll 内联 hex 正则特征计数>0 红」的自咬/误咬分析（哨兵正则自身字符串、color-re.mjs 自身内容、W3 FS_DECL 行、本审计档……全在 check-quality 扫描面吗？哨兵扫哪两个文件？）。
2. **①AST 面**：`VariableDeclarator > ObjectExpression` 全 Literal 条件——`const C = { bg: '#111', hi: get() }` 混合对象豁免是否=绕过通道（把色值对象混一个计算属性即逃检）？SVG presentation 清单驻 rule 头注=白名单维护面，漏 stroke-dasharray 类新 attr 的兜底？
3. **②同值守卫**：value 归一化去空白小写——`#FFF` vs `#fff` 同值检测对；但 `#ffffff` vs `#fff`（缩写同色）不检测——是否声明为不做面？@theme 重绑行 `--text-xs: var(--fs-body)` 的 value=var() 引用，两个 --xxx: var(--same) 同值会红吗（@theme 重绑本身合法形态——如 --text-xs/--text-sm 都指 var(--fs-body) 是否现存？——设计书 dry-run 说 82 行 0 同值对但那数字只覆盖什么归一化口径）？
4. **⑥声明粒度**：按 `;` 切段——CSS 内 `content: "a;b"` 字符串含分号会切碎；data URL/base64 含 `;`？存量 0 但规则的鲁棒性。
5. **⑦url 剥离**：剥离 `url(...)` 与 hex 负边界两案设计书没定死——哪个对？`background: url(#x)` vs `fill: url(#x)` 都该豁免吗（url 引用 gradient id 合法但 url 内若真是色值形态呢）。
6. **④R−D−W**：R 集含 theme.css 自身消费+tsx inline style 字符串+CSS 文件——tsx 里模板串 `var(--${x})` 动态拼名（存在吗？给排查指令）；白名单双向互指的维护成本。
7. **分期与验收**：一批六项同票落还是拆票（受锁面集中在两文件+新件——单票 diff 规模）；验收条款 3「W3 与③哨兵并存不互扰」的验证形态。
8. 设计书未覆盖的第八面：你自己找。

## 输出

逐攻击点结论（成立/不成立/需设计书修正+修正建议）+总评（ENDORSE / ENDORSE_WITH_CHANGES / REJECT+理由）。