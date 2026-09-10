# F-LINT-04-T2 实现者报告（三屋模式——实现跳）

> 实现者：GLM5.3（flash 档）· 2026-09-10 · 工作目录 E:\class\智慧水务\Synapse_remake
> 票面：tickets/registry.ts F-LINT-04-T2 行（status:'open'）· 终裁档 docs/design/2026-09-10_f-lint04-design-final.md
> **回炉轮次 1**（门一 Kimi 审 B0/W4/N7 放行附条件——主控裁决清单 5 项已全部执行，见 §8）

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
- **(b) JSXAttribute 属性名域扩展**（原 style 路径保留不动）：显式表 {fill, stroke, color, stop-color, flood-color, lighting-color} ∪ endsWith('Color') 后缀（camelCase 表 stopColor/floodColor/lightingColor 天然命中）；value 为 string Literal 且 stripUrlFunctions 后命中→report；域外属性名不报。消息注明 SVG/attr 面与 INV-11。**[N2 回炉=主控裁决加码]** value 增判 JSXExpressionContainer 包裹形态——container 且 expression 为 string Literal 时同检（`fill={'#fff'}` 与 `fill="#fff"` 同罪）；style 分支不动（其本就走 container 判 ObjectExpression）。
- 消费单源：COLOR_RE/stripUrlFunctions 继续 import 自 scripts/color-re.mjs（既有 import 零改动）。rule 内**零内联 hex 特征正则**——属性域判定用字符串方法 endsWith('Color')+includes 显式表（check-quality 6b 哨兵扫本文件文本 matchAll(META_RE)，实证 quality:check 通过=零互咬）。
- 头注扩义：rule 块头注重写为三路径全貌（①style 原路径 ②VariableDeclarator ③attr 属性域[含 N2 container 形态注记]）；文件顶部关卡清单第 6 条同步「tsx inline style 面」→「tsx 面」（见自裁申报 4）。
- 回炉三项（§8）：W1=EXPLICIT_ATTRS 上提 create() 级（与 hitsColor/unwrapInit 同级）；W3=unwrapInit 阈值 `depth > 4`→`depth >= 4`（对齐票面字面「深度上限 4」——最多解 4 层包裹，原实现实际 5 层）；N2=container 包裹同检（上文 (b)）。
- 行数：239→345 行（wc -l 实测；≤500 预算内）。

## 2. 文件清单（git diff --stat 实测）

| 文件 | 状态 | 归属 |
| --- | --- | --- |
| eslint.config.js | M（+136 行 diff 面） | **本实现者唯一改动** |
| locks/manifest.json | M | 主控预置（预解锁动作），非本人触碰 |
| tickets/registry.ts | M | 主控预置（立案 F-LINT-04-T2 行），非本人触碰 |
| scripts/audits/f-lint04-t2-{preimpl,lint-baseline,dryrun-recheck,r1..r11,nr1..nr5,mutation,verify}.raw.txt | ??（未跟踪） | 首轮证据件（三桶口径①——随收口提交） |
| scripts/audits/f-lint04-t2-{r13-preimpl,r12,r13,r14,rework-lint,rework-dryrun,rework-verify}.raw.txt | ??（未跟踪） | 回炉轮证据件（§8） |
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
| R12 | `export const DUAL = { a: '#111111', b: '#222222' }` | 恰 2 error | **2 problems**（DUAL.a+DUAL.b 各报）exit=1 ✔——逐属性全量命中证明（回炉补强） |
| R13 | `<rect fill={'#abcdef'} />`（container 包裹） | 恰 1 error | 1 error（fill）exit=1 ✔——N2 新面（回炉补强；改前探针 0 error 见 §8） |
| R14 | `export const NEST = Object.freeze({ bg: '#333333' } as const)` | 恰 1 error | 1 error（NEST.bg）exit=1 ✔——双层嵌套 unwrap（回炉补强） |

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

回炉轮同构复验（f-lint04-t2-rework-verify.raw.txt）：quality/tickets 通过+locks:check 预期红（exit=1 唯一红因，同上）+ lint/typecheck/test（162 文件/1579 用例）/build 四段补跑全 exit=0。

## 6. 自裁申报（一切超票面决定）

1. **pre-impl 探针**：票面④只定义了实现后红证矩阵；为满足 TDD「先红再绿」（AGENTS.md 测试纪律），实现前对四代表形态（R1/R6/R8/R9 语义）跑了 0-error 探针落盘（f-lint04-t2-preimpl.raw.txt）。加做不缩票面。
2. **变异红证具体形态**：票面④标题含「变异红证」未给形态——采用单点 visitor 改名变异+R1/R8 三态对照（§3.4）；cp 备份法还原（宪法规定路径）。
3. **JSXAttribute 原路径 guard 拆分**：原首行 guard `…node.name.name !== 'style') return` 拆为 attr 提取+`if (attr === 'style') {…return}` 分支——style 分支体逐行原文保留、行为等价；为接入新属性域判定的最小必要结构微调（票面「现有 style 路径保留不动」按行为语义执行）。
4. **文件顶部头注第 6 条同步扩义**：票面只要求 rule 块头注扩义；顶部关卡清单第 6 条描述同一规则（「tsx inline style 颜色字面量负锚」），同步改「tsx 面」防两处注释漂移（接缝归责）。
5. **verify 链拆跑**：locks:check 预期红截断 verify 链（quality/tickets 后）——lint/typecheck/test/build 四段单独补跑、exit 各自落盘同一 raw；未跑任何 locks 命令（遵禁令）。
6. **EXPLICIT_ATTRS 常量位置**：~~置于 create() 内~~ **[W1 回炉更正]** 首轮申报称「置于 create() 内」但实物误落在 JSXAttribute visitor 内（每属性节点重建）——门一 W1 抓出申报与实物不一致；回炉已上提至 create() 级（每文件一次，与 hitsColor/unwrapInit 同级），以代码为准。
7. **[N2 回炉=主控裁决加码，超票面字面]** JSXAttribute 域内属性 value 增判 JSXExpressionContainer 包裹形态（`fill={'#fff'}` 与 `fill="#fff"` 同检）——门一 N2 指出该形态为票面语义内常见绕过通道；主控裁决加码扩展，非票面原文，特此申报。style 分支不动（其本就走 container 判 ObjectExpression）。

## 7. 疑虑（供门审）

1. **dry-run 头注与 R11 实证矛盾**：dry-run 注释称「stop-color 等 JSXIdentifier 不可能」，但 R11 实证 JSX 规范允许连字符属性名（parse 成功+命中显式表报红）。dry-run 判断有误但不影响本票（其 C2 组只作哨兵核对未参与计数；显式表按票面含 kebab 三词）。探针文件非本票改动面，未动。
2. **destructuring init 形态**：`const { bg } = { bg: '#111' }` 的 init=ObjectExpression 会逐属性命中（名字显示 (destructured)）——票面未提此形态，按「VariableDeclarator 路径对 init 判定」字面实现未额外豁免；dry-run 基线=0 无存量影响。
3. registry/manifest 两文件的 M 态为主控预置（立案+预解锁），本人零触碰——收口 git add 时请主控按票面归属显式列文件。

## 8. 回炉轮次 1 记录（门一 Kimi 审后主控裁决清单——5 项全执行）

门一审结论 B0/W4/N7 放行附条件；W2/W4 中 color-re.mjs 标志与 dryrun-recheck.raw.txt 纯净两项已由主控亲证销项。回炉清单执行：

1. **W1**：EXPLICIT_ATTRS 上提 create() 级——代码实物与 §6 申报一致（以代码为准，报告 §6.6 已更正注记首轮落点失误）。
2. **W3**：unwrapInit `depth > 4`→`depth >= 4`——对齐票面字面「深度上限 4」（原实现实际 5 层；现最多解 4 层包裹，第 5 层起不判不误报）。
3. **N2 主控裁决加码**：JSXAttribute 域内属性 value 增判 JSXExpressionContainer 包裹形态（§1(b)/§6.7 已申报「超票面字面」）。TDD 红→绿：改前探针 `fill={'#abcdef'}` **0 error exit=0**（f-lint04-t2-r13-preimpl.raw.txt=检测缺失红）→改后 R13 恰 1 error。
4. **红证补强三支**（每支独立临时文件+.raw.txt+exit 落盘）：R12 恰 **2** problems（DUAL.a+DUAL.b 逐属性全量）/R13 恰 1（N2 新面）/R14 恰 1（freeze+as const 双层 unwrap）——全中，临时文件已删零残留。
5. **全链复验**：npm run lint exit=0 全绿（N2 加码对存量 77 tsx 零误报）+ dry-run 复跑 self-check OK+四面全 0+exit=0（rework-lint/rework-dryrun.raw.txt）+ verify 段跑=quality/tickets 绿+locks:check 预期红（唯一红因，主控收口 apply）+lint/typecheck/test（162 文件/1579 用例=基线）/build 全 exit=0（rework-verify.raw.txt）。

§7 疑虑 1（dry-run 探针头注 kebab 误判）维持原判不改——探针为主控产物，由主控亲改。
