[routing]: run=20260910015436-jj5i source=kimi-main model=kimi-k3 switches=0 usage=in=6091,out=6948 latency=207277ms (by ds-call.mjs 链)

# F-LINT-04（T1）门一对抗深审报告

## B 类（通过项，附核验证据）

**B-1 ③单源化物理闭合成立。** eslint.config.js:2 `import { COLOR_RE, stripUrlFunctions } from './scripts/color-re.mjs'`，check-quality.mjs:11 同 import 三具名；两文件 diff 全文中原内联字面量 `/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/i` 已删净，无双写残留。

**B-2 fail-closed 无吞错点。** 三处 import 均为顶层静态 import，diff 全文无 try/catch 包裹；唯一 catch（postcss 解析）走 `violations.push(...)` 后 `continue`——红向非吞错（注释自谓"fail-open"用词混乱，行为实为安全向红）。红证 5（改名→ERR_MODULE_NOT_FOUND）与该结构自洽。

**B-3 META_RE 不自咬论证成立。** color-re.mjs:41 字面量 `\[0-9a-fA-F]\{3,8\}`——`]` 与 `{3,8}` 间有 `\` 隔断，裸形态 `[0-9a-fA-F]{3,8}` 在源文本中不连续出现；且该件不在 SENTINEL_SCAN_FILES 枚举内，双重保险。两消费文件现行文本（diff 全文可核）亦无该裸形态。matchAll 内部克隆、META_RE 带 g 不污染 lastIndex 的论证与 spec 一致（COLOR_RE 本体无 g/y，color-re.mjs:34）。

**B-4 ⑥②豁免语义无弱化。** 旧行级豁免 `/^\s*--[\w-]+\s*:/` 对整行放行（token 单值同样不红）；新 `decl.prop.startsWith('--')` 豁免（check-quality.mjs:226）等价，且消解了旧面 minified `--a:#fff;color:#fff` 同行全免的漏检（旧面整行 return）。同值对由 ② 接管=变强，符合票面授权（§1.4"decl.prop 以 -- 开头天然豁免"）。

**B-5 ⑦剥离双验收自洽。** `fill:url(#face)`→剥后 `fill:url()` 无命中不红；`color:#face` 无 url 可剥，`\b` 后命中红。引号感知状态机（color-re.mjs:48-66）覆盖 `url("...)")` 引号内 `)` 截断坑与 `\\` 转义跳格，实现与头注申报一致。

**B-6 ④不做面零越界。** 无 ⑦独立哨兵、无命名色表、无缩写等价、无跨文件 C-4 扩张——diff 中均无对应码。

## W 类（缺陷/风险，需入档或后续票处置）

**W-1 哨兵特征面=逐字副本检测，变体回退静默绕过。** META_RE 只认裸文本 `[0-9a-fA-F]{3,8}`。回退者写 `[0-9A-Fa-f]{3,8}`（序换）、`{3,6}`、`[0-9a-f]{3,8}`+i 标志、`[\da-fA-F]{3,8}`、`new RegExp('\\p{Hex_Digit}...')` 均不命中——哨兵绿而单源已失能。红证 4 仅证"逐字回退"一条路径。哨兵语义实为"原样复制检测"而非"内联 hex 正则检测"，报文"禁内联回退"的宣称强于实测覆盖面。另 SENTINEL_SCAN_FILES 硬编码两件，未来新增第三消费文件（T2/T4 候选面）需手工扩枚举，无任何守卫提醒此义务。

**W-2 ②同值守卫对同名 token 重定义无豁免=假阳面。** check-quality.mjs:238-244 判定仅 `ds.length >= 2`，不区分 prop。存量合法模式如 `:root{--x:#fff}` + `.dark{--x:#fff}`（同值重绑覆盖）将被判红——报文亦会把同名键并列为"同值第二源"，语义错位。存量 109 token/同值 0 故未爆，属潜伏假阳，建议补 `d.prop` 去重或同名同值豁免。

**W-3 walkDecls+walkComments 未覆盖 at-rule prelude=行扫描面隐性收窄。** 旧行扫描对每行检（at-rule 行含色值即红）；新面只走 decl/comment。`@supports (background: #abc) {}`、`@import "#fff.css"` 等 prelude 色值现为盲区。实践中 prelude 色值极罕见、存量零命中，但这是未申报的口径弱化（自裁 5 项未列），应入档明示。

**W-4 postcss 为传递依赖 import，hoisting 依赖。** check-quality.mjs:10 `import postcss from 'postcss'` 未伴随 package.json 显式声明（diff 无该文件）。npm 扁平 node_modules 下今日可解析；pnpm/strict 或上游去依赖即断。断时 fail-closed 抛错红向（方向安全），主控已预裁接受——此处仅确认风险实存、申报属实，建议后续票显式化。

## N 类（观察/申报核验）

**N-1 自裁 1（walkComments）**：⑤"注释色值同禁"裁决在档可引，旧行扫描本就扫注释行，纯 walkDecls 会丢面——补齐为保等价非扩张，申报义务已履行，合理。
**N-2 自裁 2（跨文件聚合）**：与 Kimi 原文"文件内"口径相异但已申报；②票面未明示聚合域，token 散布多文件时全域判定语义更贴"第二源"本质；存量两口径皆零，无实害。合理。
**N-3 自裁 4（tsx 面同步剥离）**：⑦票面指 CSS 面，tsx inline style 字符串与 CSS value 同构，同步剥离方向一致且已申报；不剥离则 `style={{fill:'url(#g)'}}` 误红。合理。
**N-4 stripUrlFunctions 边界**：`/^url\(/i` 无前边界，`myurl(#fff)` 子串误剥；`value.slice(i)` 逐位 O(n²)；未闭合 `url(` 吞至值尾。三者分别对应非法 CSS 态/650 decl 小数据量/解析前已被 postcss 拒，可接受，不入档亦可。
**N-5 存量数字（8 CSS/650 decl/109 token/同值 0/注释 0）无法从 diff 自验**，依赖主控亲验 EXIT=0 背书——声明不确定，取信。
**N-6 locks 时序（unlock→改→generate+apply）diff 不可核**，locks:check 317 一致+verify 全链 0 由主控亲验，流程合规取信。
**N-7 接缝完备**：两消费文件头注互指已同步更新（diff 可见）；color-re.mjs 头注含 g/y 禁令、matchAll 挪用禁令、唯一合法宿主声明、扫描面枚举——四项禁令齐备，T2/T4 衔接面（新消费方需扩 SENTINEL_SCAN_FILES）已在 W-1 提示。

## 统计

B×6 / W×4 / N×7。阻断级（B 反项）0。

## 总评：**放行**（带 W 项入档）

核心票面（③单源化+fail-closed、⑥postcss 化三题消解、⑦剥离、②守卫、存量零误报）实现与终裁档逐条对拍无偏差，红证与 diff 结构自洽。W-1/W-2/W-3 均为潜伏面非现行害：W-1 哨兵语义收窄建议 T2 候选或入档明示"逐字副本检测"边界；W-2 同名重定义假阳建议 ② 判定补 prop 去重（小改，可独立顺修票）；W-3 prelude 盲区入档。W-4 主控已裁接受。无回炉必要。