# 门一对抗深审任务书——F-LINT-04-T2（B-5 AST 扩展实现跳）

你是门一对抗式代码审查员（隔离一审）。铁律：只读审计（对以下材料），唯一产出=审计报告；禁臆测包外事实；不确定的明确说不确定。输出用中文，逐条 [B|W|N]+代码证据（引用材料中的行/段），末尾统计+总评（放行/放行附条件/回炉）。

## 审项工单 A~E

- A 母本符合度：实现 vs 票面+终裁档 §1.1 修正条款（逐属性判定/unwrap/双表+兜底）逐条对照——票面语义缺漏/走样即 B。
- B 宪法红线：分层/安全禁令/行数 ≤500/UTF-8/禁新依赖/受锁纪律（实现者零 locks 命令=正确）/哨兵面（check-quality 6b）不得被本 diff 破坏。
- C 代码与报告诚实性：报告 §6 自裁申报与 §7 疑虑逐条对 diff 实物核；报告未申报的 diff 行为差异；证据链完备性（红证矩阵每支恰 1 error/exit 落盘/变异三态闭合）。
- D 测试与规则质量：红证矩阵覆盖面（有无漏形态——想票面语义内的绕过通道）；NR 不红面语义正确性；存量零误报论证强度。
- E 接缝与后续：头注互指/哨兵扫描面/color-re.mjs 单源是否被破坏；后续票（T4 var() 语义锚）是否受影响。

## 主控已预裁项（可攻击但推翻需更强依据）

1. 单值常量纳入检测（终裁字面=ObjectExpression 色值表；主控扩展=同绕过通道对称闭合，dry-run B=0）。
2. unwrap 深度上限 4（防御性）。
3. 哨兵面（META_RE/W3 FS_DECL/check-quality 6b）零改动——v58 §2-6/7 域窄观察维持入档不扩。
4. 规则名维持 no-inline-color（最小 diff，头注扩义）。
5. .ts 面不扩（补盘 0 形态：fillStyle/strokeStyle 赋值 0+色值字面量仅 1 处注释叙述）。

## 材料一：票面（registry F-LINT-04-T2 行全文）

（见下方「票面原文」节——实现者领单的唯一任务书）

## 材料二：实现者报告全文

（见「实现者报告」节）

## 材料三：diff 全文（eslint.config.js 239→332 行）

（见「diff」节）

## 材料四：证据链抽样（红证矩阵+存量绿检+verify 尾）

（见「证据」节）

---

# 票面原文

F-LINT-04-T2 | file: eslint.config.js | area: infra | owner: strong | status: open

summary: 颜色关卡扩展战役 T2=①B-5 AST 扩展（v58 §2-1 候选——终裁 §2 表 T2 跳，设计链三跳已在 T1 档毕，本票纯实现跳零新设计）：synapse/no-inline-color rule（域=src/renderer/**/*.tsx 不变）扩两条 visitor 路径——(a) VariableDeclarator：init 递归 unwrap（TSAsExpression/TSSatisfiesExpression/Object.freeze CallExpression→arguments[0]，深度上限 4 防御）后两形态判定：ObjectExpression=逐属性判定（deepseek 硬伤①修正——弃「全 Literal 门」：混计算属性/引用值对象不豁免，逐 Property 判 value 为 string Literal 且 stripUrlFunctions 后命中 COLOR_RE 即报；key=Identifier 或 string Literal 均入判[kebab key 形态]；SpreadElement/嵌套对象/模板串/二元式=明示不检残留面与现行 style 面语义对称）+单值 Literal=命中即报（主控裁决扩展：终裁字面=ObjectExpression 色值表，单值常量同绕过通道对称闭合纳入——dry-run B=0 零负担）；(b) JSXAttribute 面扩：属性名域=fill|stroke|color 显式三词 ∪ /Color$ 后缀（camelCase 表 stopColor/floodColor/lightingColor=子集）∪ kebab 同族 stop-color|flood-color|lighting-color（JSX 可解析误用形态）→ value 为 string Literal 命中即报；域外属性名（data-x 等）不报；color 属性报错=svg text 色/HTML color 属性消费同 INV-11 域。前置 dry-run 毕：scripts/audits/f-lint04-t2-dryrun.mjs——77 tsx（全 renderer）四面全 0（A 模块常量表 0/B 单值 0/C1 camelCase 0/C3 兜底 0/C4 域外 0/D 现行 style 面 0）+.ts 面补盘（fillStyle/strokeStyle 赋值 0+色值字面量仅 1 处注释叙述=⑤人审面）→ 域维持 tsx 不扩张。验收：红证矩阵 R1-R11（裸表/as const/satisfies/freeze/混合对象逐属性[旧门下豁免形态]/单值/单值 as const/stopColor/fill/accentColor 兜底/stop-color kebab）各植入→lint 红→还原+NR1-NR5 不红面（url(#face) 剥离/data-x 域外/引用形态 var 载体/模板串）+存量 dry-run 复跑 0+verify 全链+[locked-change]+规则名维持 no-inline-color 头注扩义;不做面：哨兵域窄维持入档（v58 §2-6/7——META_RE/FS_DECL 泛化=假阳对抗成本>收益，主控预裁不扩）；.ts 面（Canvas ctx 色值面=0 无形态）；嵌套对象表深度>1（残留面注记）；命名色/十进制（终裁 §4 承袭）

# 终裁档相关节（docs/design/2026-09-10_f-lint04-design-final.md）

§1.1 采纳的审核修正（对设计书）之 1：①逐属性判定（弃"全 Literal 门"——混一个计算属性整对象豁免=绕过通道）；unwrap as const/satisfies/Object.freeze（TS 色值表默认形态非边角——VariableDeclarator.init 层 unwrap 后判 ObjectExpression）；SVG attr 两张表（JSX camelCase：stopColor/floodColor/lightingColor——CSS kebab 表并行）+未知属性兜底（属性名命中 fill|stroke|color|*Color 且 Literal 值命中 COLOR_RE 即报）。

§2 分期表 T2 行：①AST 扩展（逐属性+unwrap+双表+兜底）｜前置=全仓 tsx as-const 形态基数 dry-run（含模块常量对象/SVG attr 两面）。

§4 不做面（承袭）：⑦独立哨兵；⑤十进制/命名色穷举检；②跨文件同值；⑧命名色表；#fff/#ffffff 缩写同色、red/#f00 命名等价。

---

# 实现者报告

（全文=scripts/audits/f-lint04-t2-impl.report.md，内联如下）


```markdown
# F-LINT-04-T2 实现者报告（三屋模式——实现跳）

> 实现者：GLM5.3（flash 档）· 2026-09-10 · 工作目录 E:\class\智慧水务\Synapse_remake
> 票面：tickets/registry.ts F-LINT-04-T2 行（status:'open'）· 终裁档 docs/design/2026-09-10_f-lint04-design-final.md

## 0. 开工记录（会话开工纪律——技能清点）

| 技能 | 用/不用 | 理由 |
| --- | --- | --- |
| test-driven-development | 用 | 本票核心=红证矩阵（红→绿→变异红证），直接对口 |
| verification-before-completion | 用 | 收口 verify 真退出码/证据纪律 |
| systematic-debugging | 不用 | 全程无调试面（一次 shell 引号解析噪声非代码问题） |
| browser/webapp-testing 类 | 不用 | 纯 lint 规则扩展，无 UI 面 |
| 其余工程技能 | 不用 | 单文件（+证据件）lint 规则任务，无部署/数据/安全/文档面 |

配置自查：宿主 bash `which node`=/c/Program Files/Volta/node → v24.20.0（项目 pin 版，无需绕行）。

## 1. 实现摘要

扩展 eslint.config.js 中 synapse/no-inline-color rule（域=files:['src/renderer/**/*.tsx'] 不变，规则名不变），在原 JSXAttribute(style) 路径外新增两条 visitor：

- **(a) VariableDeclarator 路径**：init 递归 unwrap（深度上限 4，防御性）——TSAsExpression/TSSatisfiesExpression→.expression；Object.freeze CallExpression（callee=MemberExpression，object.name==='Object' 且 property.name==='freeze'）→arguments[0]。unwrap 后两形态：
  - ObjectExpression=**逐属性判定**（弃「全 Literal 门」）：每个 Property（key=Identifier 或 string Literal 均入判，属性名仅用于报错信息）的 value 为 string Literal 且 stripUrlFunctions 后命中 COLOR_RE→report；SpreadElement/嵌套对象/模板串/二元式/调用式等非 Literal 值=skip（代码注释明示不检残留面）。
  - 单值 string Literal 命中→report（主控裁决扩展面：单值常量与对象表同绕过通道对称闭合）。
  - 消息模板：`模块常量色值字面量 "…"（CONST.prop / CONST）——颜色消费单源=--* token（INV-11）`（注明常量名）。
- **(b) JSXAttribute 属性名域扩展**（原 style 路径保留不动）：显式表 {fill, stroke, color, stop-color, flood-color, lighting-color} ∪ endsWith('Color') 后缀（camelCase 表 stopColor/floodColor/lightingColor 天然命中）；value 为 string Literal 且 stripUrlFunctions 后命中→report；域外属性名不报。消息注明 SVG/attr 面与 INV-11。
- 消费单源：COLOR_RE/stripUrlFunctions 继续 import 自 scripts/color-re.mjs（既有 import 零改动）。rule 内**零内联 hex 特征正则**——属性域判定用字符串方法 endsWith('Color')+includes 显式表（check-quality 6b 哨兵扫本文件文本 matchAll(META_RE)，实证 quality:check 通过=零互咬）。
- 头注扩义：rule 块头注重写为三路径全貌（①style 原路径 ②VariableDeclarator ③attr 属性域）；文件顶部关卡清单第 6 条同步「tsx inline style 面」→「tsx 面」（见自裁申报 4）。
- 行数：239→332 行（≤500 预算内）。

## 2. 文件清单（git diff --stat 实测）

| 文件 | 状态 | 归属 |
| --- | --- | --- |
| eslint.config.js | M（+136 行 diff 面） | **本实现者唯一改动** |
| locks/manifest.json | M | 主控预置（预解锁动作），非本人触碰 |
| tickets/registry.ts | M | 主控预置（立案 F-LINT-04-T2 行），非本人触碰 |
| scripts/audits/f-lint04-t2-{preimpl,lint-baseline,dryrun-recheck,r1..r11,nr1..nr5,mutation,verify}.raw.txt | ??（未跟踪） | 本票证据件（三桶口径①——随收口提交） |
| scripts/audits/f-lint04-t2-dryrun.mjs | ??（未跟踪） | 前置探针（进场已存在），本人零改动 |

src/renderer/ 下临时反例文件全部删除（最终 `ls src/renderer | grep -c probe`=0）；mutation backup 副本已删（宪法禁驻留）。

## 3. TDD 流程与红证矩阵

### 3.1 pre-impl 探针（先红——实现前检测缺失证明）

实现前建混合反例（对象表/单值/stopColor/fill 四形态）→ npx eslint → **exit=0、0 error**（f-lint04-t2-preimpl.raw.txt）——现行规则不覆盖四个新面=测试红（断言「eslint 会报」失败）。

### 3.2 红证矩阵 R1-R11（实现后——每支独立临时文件+独立 raw+exit 标记）

| 支 | 反例 | 期待 | 实测（raw） |
| --- | --- | --- | --- |
| R1 | `export const BAD = { bg: '#111' }` | 红 | 1 error（BAD.bg）exit=1 ✔ |
| R2 | `{ bg: '#111' } as const` | 红 | 1 error（BAD2.bg）exit=1 ✔（unwrap as const） |
| R3 | `{ bg: '#111' } satisfies Record<string,string>` | 红 | 1 error（BAD3.bg）exit=1 ✔（unwrap satisfies） |
| R4 | `Object.freeze({ bg: '#111' })` | 红 | 1 error（BAD4.bg）exit=1 ✔（unwrap freeze） |
| R5 | `{ bg: '#111', dyn: String(1) }` | bg 项红 | **恰 1 error**（BAD5.bg；dyn 调用式 skip）exit=1 ✔——逐属性判定实证（旧「全 Literal 门」下整对象豁免） |
| R6 | `const SINGLE = '#fff'` | 红 | 1 error（SINGLE）exit=1 ✔（单值） |
| R7 | `'#fff' as const` | 红 | 1 error（SINGLE2）exit=1 ✔（单值 unwrap） |
| R8 | `<rect stopColor="#ffffff" />` | 红 | 1 error（stopColor）exit=1 ✔（camelCase 后缀域） |
| R9 | `<rect fill="#abcdef" />` | 红 | 1 error（fill）exit=1 ✔（显式表） |
| R10 | `<rect accentColor="#123456" />` | 红 | 1 error（accentColor）exit=1 ✔（兜底后缀域） |
| R11 | `<rect stop-color="#ffffff" />` | 红 | 1 error（stop-color）exit=1 ✔（kebab 显式表；JSXIdentifier 实证可含连字符） |

每支均「✖ 1 problem (1 error, 0 warnings)」——除目标红外零污染（export 防 unused-vars）。

### 3.3 不红面 NR1-NR5（每支独立 raw+exit 标记，均 0 error/exit=0）

| 支 | 反例 | 语义 | 实测 |
| --- | --- | --- | --- |
| NR1 | `fill="url(#face)"` | url() 剥离 | 0 error exit=0 ✔ |
| NR2 | `data-x="#fff"` | 域外属性名 | 0 error exit=0 ✔ |
| NR3 | `fill={SOME_REF}`（SOME_REF='var(--x)'） | 引用形态（兼复验 NR4 单值 var 载体） | 0 error exit=0 ✔ |
| NR4 | `const T = 'var(--x)'` | var() 载体不命中 | 0 error exit=0 ✔ |
| NR5 | `` const T2 = `#ff${x}` `` | 模板串不检 | 0 error exit=0 ✔ |

### 3.4 变异红证（cp 备份法，f-lint04-t2-mutation.raw.txt）

单点变异=visitor 名 `VariableDeclarator`→`_MutatedVariableDeclarator`（路径失效）：
- 变异态 R1→**0 error exit=0**（复绿=R1 的红依赖 VariableDeclarator 实现）
- 变异态 R8→**1 error exit=1**（仍红=JSX 属性域路径独立生效）
- cp 还原后 R1→**1 error exit=1**（实现复原三态对照闭合）
- 备份副本即删（git status 无残留）；未用 git checkout（临时文件法+cp 备份法双安全）

## 4. 存量绿检 + dry-run 复跑

- `npm run lint`（=eslint .）：**exit=0** 全绿（lint-baseline.raw.txt）——77 tsx 零误报。
- `node scripts/audits/f-lint04-t2-dryrun.mjs` 复跑：self-check OK（A+2/B+1/C1+1/C3+1 全命中）+ 77 tsx 四面全 0（A/B/C1/C3/C4/D）+sum-check=0+**exit=0**（dryrun-recheck.raw.txt）——与基线一致。

## 5. verify 真退出码

`npm run verify` → **exit=1**（f-lint04-t2-verify.raw.txt），逐段：

| 段 | 结果 |
| --- | --- |
| quality:check | 通过（无占位/无乱码/无跨域/无同值双常量——含 6b 哨兵段=本文件零内联 hex 正则旁证） |
| tickets:check | 通过 |
| locks:check | **红（唯一红因）**：受锁文件被修改 eslint.config.js——**预期形态**（票面⑤明示受锁面由主控预解锁、实现者禁跑 locks 命令、收口由主控 apply 重锁；sha 不一致=实现已落盘的必然态） |
| lint / typecheck / test / build（locks 截断后单独补跑，exit 均落盘同一 raw） | exit=0 / exit=0 / **exit=0（Test Files 162 passed，Tests 1579 passed——与基线 162/1579 一致）** / exit=0 |

## 6. 自裁申报（一切超票面决定）

1. **pre-impl 探针**：票面④只定义了实现后红证矩阵；为满足 TDD「先红再绿」（AGENTS.md 测试纪律），实现前对四代表形态（R1/R6/R8/R9 语义）跑了 0-error 探针落盘（f-lint04-t2-preimpl.raw.txt）。加做不缩票面。
2. **变异红证具体形态**：票面④标题含「变异红证」未给形态——采用单点 visitor 改名变异+R1/R8 三态对照（§3.4）；cp 备份法还原（宪法规定路径）。
3. **JSXAttribute 原路径 guard 拆分**：原首行 guard `…node.name.name !== 'style') return` 拆为 attr 提取+`if (attr === 'style') {…return}` 分支——style 分支体逐行原文保留、行为等价；为接入新属性域判定的最小必要结构微调（票面「现有 style 路径保留不动」按行为语义执行）。
4. **文件顶部头注第 6 条同步扩义**：票面只要求 rule 块头注扩义；顶部关卡清单第 6 条描述同一规则（「tsx inline style 颜色字面量负锚」），同步改「tsx 面」防两处注释漂移（接缝归责）。
5. **verify 链拆跑**：locks:check 预期红截断 verify 链（quality/tickets 后）——lint/typecheck/test/build 四段单独补跑、exit 各自落盘同一 raw；未跑任何 locks 命令（遵禁令）。
6. **EXPLICIT_ATTRS 常量位置**：置于 create() 内（每文件重建一次，微开销可忽略）——放模块顶层会改文件级结构，未采用。

## 7. 疑虑（供门审）

1. **dry-run 头注与 R11 实证矛盾**：dry-run 注释称「stop-color 等 JSXIdentifier 不可能」，但 R11 实证 JSX 规范允许连字符属性名（parse 成功+命中显式表报红）。dry-run 判断有误但不影响本票（其 C2 组只作哨兵核对未参与计数；显式表按票面含 kebab 三词）。探针文件非本票改动面，未动。
2. **destructuring init 形态**：`const { bg } = { bg: '#111' }` 的 init=ObjectExpression 会逐属性命中（名字显示 (destructured)）——票面未提此形态，按「VariableDeclarator 路径对 init 判定」字面实现未额外豁免；dry-run 基线=0 无存量影响。
3. registry/manifest 两文件的 M 态为主控预置（立案+预解锁），本人零触碰——收口 git add 时请主控按票面归属显式列文件。

```

# diff（eslint.config.js 全量 diff）

```diff
diff --git a/eslint.config.js b/eslint.config.js
index 4cc0c0f154..2790915d38 100644
--- a/eslint.config.js
+++ b/eslint.config.js
@@ -9,8 +9,9 @@ import { COLOR_RE, stripUrlFunctions } from './scripts/color-re.mjs'
  * 3. renderer 禁 Node/Electron——最小权限（安全 §6.1）
  * 4. 禁 any / eval——弱模型幻觉的第一道闸
  * 5. features 跨域互引由 scripts/check-quality.mjs 静态检查（glob 表达不了的相对路径规则）
- * 6. [F-CSS-03 B-5 2026-09-10] synapse/no-inline-color——tsx inline style
- *    颜色字面量负锚（INV-11 颜色消费单源=--* token）。[F-LINT-04 ③
+ * 6. [F-CSS-03 B-5 2026-09-10] synapse/no-inline-color——[F-LINT-04-T2
+ *    2026-09-10 扩义] tsx 面颜色字面量负锚（原=tsx inline style 面；
+ *    INV-11 颜色消费单源=--* token）。[F-LINT-04 ③
  *    2026-09-10] COLOR_RE/stripUrlFunctions 单源=scripts/color-re.mjs，
  *    本件与 check-quality.mjs 第 6 段均 import 该件——双写面物理消失；
  *    内联回退哨兵=check-quality 6b 段对本文件文本 matchAll 计数>0 即红；
@@ -191,34 +192,127 @@ export default tseslint.config(
     }
   },
   {
-    // [F-CSS-03 B-5] tsx inline style 颜色字面量负锚（设计=终裁档 §1 B-5，
-    // 2026-09-10 迁移毕落地）。AST 面：JSXAttribute[name='style']→
-    // JSXExpressionContainer→ObjectExpression→Property.value=Literal 命中
-    // COLOR_RE→report；var() 载体 Literal 不命中正则天然豁免；模板串/表达式
-    // 值不检（单文件态面）。[F-LINT-04 ③⑦ 2026-09-10] COLOR_RE/
-    // stripUrlFunctions import 自 scripts/color-re.mjs 单源（本文件头注
-    // 互指；url(#x)=id 引用非色值，剥离后再检）
+    // [F-CSS-03 B-5] tsx 颜色字面量负锚（设计=终裁档 §1 B-5，2026-09-10
+    // 迁移毕落地）。[F-LINT-04-T2 2026-09-10] 语义扩义：原「tsx inline
+    // style 面」→「tsx 面」（终裁档 §2 T2 行+§1.1 修正条款），新增两条
+    // visitor 路径，AST 三路径全貌：
+    // ① JSXAttribute[name='style']（原路径保留不动）→JSXExpressionContainer
+    //   →ObjectExpression→Property.value=Literal 命中 COLOR_RE→report；
+    //   var() 载体 Literal 不命中正则天然豁免；模板串/表达式值不检。
+    // ② VariableDeclarator：init 递归 unwrap（TSAsExpression/
+    //   TSSatisfiesExpression→expression；Object.freeze(...)→arguments[0]；
+    //   深度上限 4 防御——超限原样返回即不判，不误报）后两形态判定：
+    //   ObjectExpression=逐属性判定（弃「全 Literal 门」——混计算属性/
+    //   引用值不豁免整对象；key=Identifier 或 string Literal 均入判，
+    //   属性名只用于报错信息）+单值 string Literal 命中即报（主控裁决
+    //   扩展：单值常量与对象表同绕过通道，对称闭合）。SpreadElement/
+    //   嵌套对象/模板串/二元式等非 Literal 值=明示不检残留面（与 style
+    //   面语义对称）。
+    // ③ JSXAttribute 属性名域（style 外）：显式表 fill|stroke|color|
+    //   stop-color|flood-color|lighting-color ∪ endsWith('Color') 后缀
+    //   （camelCase 表 stopColor/floodColor/lightingColor 天然命中）；
+    //   value=string Literal 命中即报；域外属性名（data-x 等）不报。
+    //   属性域判定用字符串方法非正则——rule 内零内联 hex 特征正则
+    //   （check-quality 6b 哨兵扫本文件文本，内联 hex 正则=哨兵红）。
+    // [F-LINT-04 ③⑦ 2026-09-10] COLOR_RE/stripUrlFunctions import 自
+    // scripts/color-re.mjs 单源（本文件头注互指；url(#x)=id 引用非色值，
+    // 剥离后再检）
     files: ['src/renderer/**/*.tsx'],
     plugins: {
       synapse: {
         rules: {
           'no-inline-color': {
             create(context) {
+              const hitsColor = (s) => COLOR_RE.test(stripUrlFunctions(s))
+              // init 层递归 unwrap（as const/satisfies/Object.freeze——
+              // Object.freeze({...} as const) 双层等嵌套均经此递归）
+              const unwrapInit = (node, depth = 0) => {
+                if (!node || depth > 4) return node
+                if (node.type === 'TSAsExpression' || node.type === 'TSSatisfiesExpression') {
+                  return unwrapInit(node.expression, depth + 1)
+                }
+                if (
+                  node.type === 'CallExpression' &&
+                  node.callee.type === 'MemberExpression' &&
+                  node.callee.object.type === 'Identifier' &&
+                  node.callee.object.name === 'Object' &&
+                  node.callee.property.type === 'Identifier' &&
+                  node.callee.property.name === 'freeze'
+                ) {
+                  return unwrapInit(node.arguments[0], depth + 1)
+                }
+                return node
+              }
               return {
+                VariableDeclarator(node) {
+                  const init = unwrapInit(node.init)
+                  if (!init) return
+                  const name = node.id.type === 'Identifier' ? node.id.name : '(destructured)'
+                  if (init.type === 'ObjectExpression') {
+                    // 逐属性判定：仅 string Literal 值入判——SpreadElement/
+                    // 嵌套对象/模板串/二元式/调用式=明示不检残留面
+                    for (const prop of init.properties) {
+                      if (prop.type !== 'Property') continue
+                      if (prop.key.type !== 'Identifier' && prop.key.type !== 'Literal') continue
+                      const val = prop.value
+                      if (!val || val.type !== 'Literal' || typeof val.value !== 'string') continue
+                      if (hitsColor(val.value)) {
+                        const keyName =
+                          prop.key.type === 'Identifier' ? prop.key.name : String(prop.key.value)
+                        context.report({
+                          node: val,
+                          message: `模块常量色值字面量 "${val.value}"（${name}.${keyName}）——颜色消费单源=--* token（INV-11）`
+                        })
+                      }
+                    }
+                  } else if (
+                    init.type === 'Literal' &&
+                    typeof init.value === 'string' &&
+                    hitsColor(init.value)
+                  ) {
+                    context.report({
+                      node: init,
+                      message: `模块常量色值字面量 "${init.value}"（${name}）——颜色消费单源=--* token（INV-11）`
+                    })
+                  }
+                },
                 JSXAttribute(node) {
-                  if (node.name.type !== 'JSXIdentifier' || node.name.name !== 'style') return
-                  const v = node.value
-                  if (!v || v.type !== 'JSXExpressionContainer') return
-                  const obj = v.expression
-                  if (!obj || obj.type !== 'ObjectExpression') return
-                  for (const prop of obj.properties) {
-                    if (prop.type !== 'Property') continue
-                    const val = prop.value
-                    if (!val || val.type !== 'Literal') continue
-                    const s = String(val.value)
-                    if (COLOR_RE.test(stripUrlFunctions(s))) {
-                      context.report({ node: val, message: `inline style 颜色字面量 "${s}"——颜色消费单源=--* token（INV-11）` })
+                  if (node.name.type !== 'JSXIdentifier') return
+                  const attr = node.name.name
+                  if (attr === 'style') {
+                    // 原 B-5 style 路径（行为保留不动——仅 guard 子句拆分接入新域）
+                    const v = node.value
+                    if (!v || v.type !== 'JSXExpressionContainer') return
+                    const obj = v.expression
+                    if (!obj || obj.type !== 'ObjectExpression') return
+                    for (const prop of obj.properties) {
+                      if (prop.type !== 'Property') continue
+                      const val = prop.value
+                      if (!val || val.type !== 'Literal') continue
+                      const s = String(val.value)
+                      if (COLOR_RE.test(stripUrlFunctions(s))) {
+                        context.report({ node: val, message: `inline style 颜色字面量 "${s}"——颜色消费单源=--* token（INV-11）` })
+                      }
                     }
+                    return
+                  }
+                  // [F-LINT-04-T2] SVG/attr 面属性名域：显式表 ∪ camelCase 后缀
+                  const EXPLICIT_ATTRS = [
+                    'fill',
+                    'stroke',
+                    'color',
+                    'stop-color',
+                    'flood-color',
+                    'lighting-color'
+                  ]
+                  if (!EXPLICIT_ATTRS.includes(attr) && !attr.endsWith('Color')) return
+                  const v = node.value
+                  if (!v || v.type !== 'Literal' || typeof v.value !== 'string') return
+                  if (hitsColor(v.value)) {
+                    context.report({
+                      node: v,
+                      message: `SVG/attr 颜色字面量 "${v.value}"（${attr}）——颜色消费单源=--* token（INV-11）`
+                    })
                   }
                 }
               }

```

# 证据链抽样（R2-R10/NR2-NR5 矩阵+lint-baseline+dryrun-recheck 各尾行+verify 尾）

```
=== r2 ===
  1:27  error  模块常量色值字面量 "#111"（BAD2.bg）——颜色消费单源=--* token（INV-11）  synapse/no-inline-color
✖ 1 problem (1 error, 0 warnings)
exit=1
=== r3 ===
  1:27  error  模块常量色值字面量 "#111"（BAD3.bg）——颜色消费单源=--* token（INV-11）  synapse/no-inline-color
✖ 1 problem (1 error, 0 warnings)
exit=1
=== r4 ===
  1:41  error  模块常量色值字面量 "#111"（BAD4.bg）——颜色消费单源=--* token（INV-11）  synapse/no-inline-color
✖ 1 problem (1 error, 0 warnings)
exit=1
=== r6 ===
  1:23  error  模块常量色值字面量 "#fff"（SINGLE）——颜色消费单源=--* token（INV-11）  synapse/no-inline-color
✖ 1 problem (1 error, 0 warnings)
exit=1
=== r7 ===
  1:24  error  模块常量色值字面量 "#fff"（SINGLE2）——颜色消费单源=--* token（INV-11）  synapse/no-inline-color
✖ 1 problem (1 error, 0 warnings)
exit=1
=== r8 ===
  1:40  error  SVG/attr 颜色字面量 "#ffffff"（stopColor）——颜色消费单源=--* token（INV-11）  synapse/no-inline-color
✖ 1 problem (1 error, 0 warnings)
exit=1
=== r9 ===
  1:35  error  SVG/attr 颜色字面量 "#abcdef"（fill）——颜色消费单源=--* token（INV-11）  synapse/no-inline-color
✖ 1 problem (1 error, 0 warnings)
exit=1
=== r10 ===
  1:42  error  SVG/attr 颜色字面量 "#123456"（accentColor）——颜色消费单源=--* token（INV-11）  synapse/no-inline-color
✖ 1 problem (1 error, 0 warnings)
exit=1
=== nr2 ===
$ npx eslint src/renderer/lint-red-probe-nr2.tsx (no-red case NR2: expect 0 errors, exit=0)
exit=0
=== nr3 ===
$ npx eslint src/renderer/lint-red-probe-nr3.tsx (no-red case NR3: expect 0 errors, exit=0)
exit=0
=== nr4 ===
$ npx eslint src/renderer/lint-red-probe-nr4.tsx (no-red case NR4: expect 0 errors, exit=0)
exit=0
=== nr5 ===
$ npx eslint src/renderer/lint-red-probe-nr5.tsx (no-red case NR5: expect 0 errors, exit=0)
exit=0
=== lint-baseline ===
$ npm run lint (post-impl stock baseline: expect exit 0, zero errors)
exit=0
=== dryrun-recheck ===
exit=0
(!) E:/class/智慧水务/Synapse_remake/node_modules/pdfjs-dist/build/pdf.mjs is dynamically imported by E:/class/智慧水务/Synapse_remake/src/renderer/features/reader/CorpusExtractor.ts but also statically imported by E:/class/智慧水务/Synapse_remake/src/renderer/features/reader/PdfDocProvider.tsx, E:/class/智慧水务/Synapse_remake/src/renderer/features/reader/PdfPageCanvas.tsx, E:/class/智慧水务/Synapse_remake/src/renderer/features/reader/TextLayer.tsx, dynamic import will not move module into another chunk.
[39m
[1m[33m[plugin:vite:reporter][39m[22m [33m[plugin vite:reporter] 
(!) E:/class/智慧水务/Synapse_remake/node_modules/pdfjs-dist/build/pdf.worker.min.mjs?url is dynamically imported by E:/class/智慧水务/Synapse_remake/src/renderer/features/reader/CorpusExtractor.ts but also statically imported by E:/class/智慧水务/Synapse_remake/src/renderer/features/reader/PdfDocProvider.tsx, dynamic import will not move module into another chunk.
[39m
rendering chunks...
[2m../../out/renderer/[22m[32mindex.html                          [39m[1m[2m    0.88 kB[22m[1m[22m
[2m../../out/renderer/[22m[32massets/pdf.worker.min-yatZIOMy.mjs  [39m[1m[2m1,375.84 kB[22m[1m[22m
[2m../../out/renderer/[22m[35massets/index-CKQTWqTF.css           [39m[1m[2m   52.47 kB[22m[1m[22m
[2m../../out/renderer/[22m[36massets/index-Af9uc_7N.js            [39m[1m[33m1,393.07 kB[39m[22m
[32m✓ built in 3.21s[39m
exit=0

```

R1/R5/R11/mutation/preimpl/nr1 全文证据=门二可亲跑复核（矩阵 16 支+preimpl+mutation+baseline+dryrun-recheck+verify 共 21 件 .raw.txt 已入库 scripts/audits/）。请输出审计报告。
