# 门二终审报告——F-LINT-04-T2（B-5 AST 扩展实现跳）

> 门二=实证二审（四清单+一）· 2026-09-10 · 工作目录 E:\class\智慧水务\Synapse_remake
> 审计对象：eslint.config.js 终态（345 行，亲 wc -l）+ 实现者报告（含 §8 回炉节）+ 门一 R1/R2 + 全部 raw 证据件
> 受锁态：unlock 态下 locks:check 红=预期（票面⑤）；本审只读，零改文件/零 git 写/零 locks 命令

## 开工记录（技能清点）

| 技能 | 用/不用 | 理由 |
| --- | --- | --- |
| verification-before-completion | 用 | 门二本职=独立复算实证（真退出码/原件抽验） |
| code-review-excellence | 用 | 对抗审查方法论 |
| systematic-debugging | 不用 | 全程零调试面 |
| TDD/subagent-development 等 | 不用 | 非实现岗；本审消费 TDD 证据链而非产出自证 |

配置自查：只读命令均在工作目录原位执行；node 探针仅纯 ASCII 单行（宪法 shell 四坑纪律）。

---

## ① 处置核对（门一全 findings + 主控裁决 vs 终态实物）

| 项 | 核验方法 | 结果 |
| --- | --- | --- |
| R1 W1（EXPLICIT_ATTRS 位置） | 亲读 eslint.config.js L230-238 | **ADDRESSED**——上提 create() 级，与 hitsColor/unwrapInit 同级，闭包词法合法 |
| R1 W3（depth） | 亲读 L244 | **ADDRESSED**——`if (!node \|\| depth >= 4) return node`，账目亲算：depth 0/1/2/3 可递归=最多解 4 层包裹，第 5 层起原样返回不判；R14 双层（freeze→as const）裕量充足 |
| R1 N2（container 包裹） | 亲读 L320-323 | **ADDRESSED**——`const lit = v.type === 'JSXExpressionContainer' ? v.expression : v` 统一提取；`fill={'#fff'}` R13 红、`fill={{对象}}` 被 `lit.type !== 'Literal'` 拦截 skip（L323）；style 分支物理隔离（L296-311 提前 return，行为逐行等价） |
| R1 N3（Object['freeze'] 绕过） | 亲读 L253（property.type==='Identifier' 硬条件） | **未恶化**——注记级维持，无代码变更 |
| R1 N4（destructuring） | 亲读 L264 | **未恶化**——name='(destructured)' 占位，报告 §7.2 申报在档 |
| N2 残留（fill={{对象}} skip） | 亲读 L323 | **未恶化**——头注③明示注记，语义=票面「明示不检残留面」 |
| W2（COLOR_RE 标志） | 亲读 scripts/color-re.mjs L31 | **独立复证销项**——`/#[0-9a-fA-F]{3,8}\b\|rgba?\(\|hsla?\(/i` 仅 i 标志无 g/y，`.test()` 零 lastIndex 状态性 |
| W4（dryrun-recheck 纯净性） | 亲读原件全文 | **销项复证**——原件仅一段 dry-run 输出+self-check OK+四面全 0+exit=0，无 build 输出混杂（门一所见=抽样拼接伪影，与主控销项结论一致） |
| 门一 R2 条件 1（报告实物） | 亲读报告全文 | §6.6 删除线更正（~~置于 create() 内~~→实物误落→已上提）+§6.7 N2 超票面申报+§8 回炉五项+行数 345——**全在档** |
| 门一 R2 条件 2（R12 双行） | 亲读 r12.raw.txt 原件 | **双 error 行完整**：L7 DUAL.a "#111111" + L8 DUAL.b "#222222" 各一行+`2 problems` 计数行——抽样截断伪影确认 |

## ② 母本符合度（票面核心五点 vs 实现 diff）

| 票面点 | 实现 | 判定 |
| --- | --- | --- |
| VariableDeclarator unwrap：TSAs/TSSatisfies→expression、freeze→arguments[0]、递归深度上限 4 | L243-259 unwrapInit 递归，三形态+depth>=4 | ✓（R2/R3/R4/R14 红证四形态实证） |
| 逐属性判定：弃全 Literal 门+key Identifier/string Literal 均入判+非 Literal skip | L265-281：逐 Property，key 白名单 L270，value 限 string Literal L272 | ✓（R5 混合对象恰 1 error=旧门下整对象豁免形态已闭合；R12 双属性各报） |
| 单值 Literal 命中即报 | L282-291 | ✓（R6 裸/R7 as const 红证；dry-run B=0 存量零负担） |
| JSX 属性名域：显式六词 ∪ endsWith('Color') | L231-238 六词表（fill/stroke/color/stop-color/flood-color/lighting-color）+L315 后缀判定 | ✓（票面「显式三词∪kebab 三词」=六词表齐；camelCase 子集经后缀命中——R8 stopColor/R10 accentColor 兜底/R11 stop-color kebab 三支红证） |
| 域外属性名不报 | L315 `return` | ✓（NR2 data-x="#fff" 0 error exit=0） |

附加面：url 剥离 NR1 ✓/引用载体 NR3 ✓/var 单值 NR4 ✓/模板串 NR5 ✓；头注扩义（rule 块三路径全貌 L195-221+顶部第 6 条同步）✓；规则名维持 no-inline-color ✓；域=src/renderer/**/*.tsx 不变 ✓；rule 内零内联 hex 正则（属性域用 includes/endsWith 字符串方法——6b 哨兵零互咬，quality:check 亲跑绿佐证）✓。

## ③ 宪法红线终审

- 分层单向：eslint 配置件无运行时分层面（import scripts/color-re.mjs=工具链面合法）✓
- 安全禁令：无涉（无 eval/出网/SQL/渲染层面）✓
- 行数：wc -l 亲测 **345** ≤500 ✓
- UTF-8：中文注释亲读可读（Read 全文）+quality:check 乱码关卡过 ✓
- TDD 证据链四档（**亲抽 13 件原件**+全量 exit 标记 grep）：
  - preimpl 红：preimpl.raw（四形态 0 error exit=0=检测缺失）+回炉 r13-preimpl.raw（container 形态 0 error exit=0）✓
  - 红证矩阵 R1-R14：14 支全核——每支恰目标 error 行+`✖ N problems`+exit=1（R12 恰 2）；error 语义抽核全对（BAD.bg/BAD2-4.bg 模块常量面、SINGLE/SINGLE2 单值、stopColor/fill/accentColor/stop-color attr 面、fill container 面、NEST.bg 双层）✓
  - 不红面 NR1-NR5：5 支 0 error exit=0 ✓
  - 变异红证三态：mutation.raw 三段——变异 R1 exit=0（复绿=红依赖实现）→变异 R8 exit=1（JSX 路径独立）→还原 R1 exit=1（复红）；exit 标记恰 3 个 ✓
  - exit 标记全量分布：R/NR/preimpl/baseline/recheck/rework-* 各恰 1、mutation=3（三态）、verify/rework-verify 各 5（locks 截断后分段补跑）——与申报结构逐件吻合 ✓

## ④ 机器面核对（全部亲跑）

| 项 | 命令 | 结果 |
| --- | --- | --- |
| dry-run 复跑 | `node scripts/audits/f-lint04-t2-dryrun.mjs` | self-check OK（A+2/B+1/C1+1/C3+1）+tsx 总数 77/renderer 77+四面 A/B/C1/C3/C4/D 全 0+sum-check=0+**EXIT=0** ✓ |
| 存量 lint | `npm run lint` | **EXIT=0** 全绿（77 tsx 零误报）✓ |
| quality:check | `node scripts/check-quality.mjs` | **EXIT=0**（warn 2 组=既有 baseline 非新增，不卡 CI）✓ |
| tickets:check | `node scripts/check-tickets.mjs` | **EXIT=0**（open 1=本票）✓ |
| typecheck | 双 project 真口径 `tsc --noEmit -p tsconfig.node.json && … tsconfig.web.json` | **EXIT=0** ✓ |
| test | `npm run test`（vitest run） | **1579 passed / EXIT=0**（Test Files 162 行=verify/rework-verify 两轮 raw 在档）✓ |
| locks 数理 | node 计 manifest.files.length | **318 条**（=v58 基线 317+1，新增 1=dryrun.mjs 归锁）✓ |
| locks:check | `node scripts/check-locks.mjs` | exit=1 预期红，**红因两条**（见发现 N-G2-1） |
| 翻 done 推演 | grep eslint.config.js | 无 `NotImplementedError(`/`unimplementedObject`/`data-ticket`/`*_STUB`——check-tickets 规则 3/4b 均不触；file 存在非目录非校验器自身；**翻 done 后 check-tickets 不红** ✓ |

build 段：采信 verify/rework-verify 两轮 raw（各含尾部 exit=0）——lint/typecheck/test/quality/tickets 五段已亲跑覆盖，build 面本票零触及（无 src/构建配置改动）。

## ⑤ 成本账本行（转录备档）

- 实现者两轮（环境统一档，Agent 无 model 参数——欠账注记）：首轮 1,764,011 tok/56 调用/660s+回炉 2,066,545 tok/27 调用/295s
- 门一 Kimi kimi-main 两轮：R1 in 8,653/out 4,669/73s+R2 in 3,995/out 3,805/93s
- 门二=本件（token 数见会话回执）

---

## 发现（本审新增）

| 级 | 条目 | 证据 |
| --- | --- | --- |
| B | 无 | — |
| W | 无 | — |
| N | **N-G2-1**：locks:check 红因含**第二条** `scripts/audits/f-lint04-t2-dryrun.mjs`（票面预期唯一红因=eslint.config.js）。manifest（generatedAt 11:32:46Z，318 条）登记 sha 与盘上文件不一致。时间线推断=主控 generate 后亲改探针头注（当前 L9-10「JSXIdentifier 实证可含连字符[T2 R11 红证]」=修正后表述，恰为实现者报告 §7.1 所述误判的更正版、§8 尾「由主控亲改」的落点；实现者申报零改动与此自洽）。不阻断：收口 locks:apply 以当前内容重锁即消解。**建议主控收口时以自身记忆销项归属**（若非主控亲改则升级为实现者诚实性问题，需追查）。 | check-locks 输出原件两行+dryrun.mjs L9-10 与报告 §7.1 原述比对 |
| N | **N-G2-2**（转录门一 R2 第 8 条，非新发现）：style 分支未复用 hitsColor（内联 `COLOR_RE.test(stripUrlFunctions(s))` 同式调用）——语义等价的一致性微瑕，后续票顺带统一即可。 | L307 vs L228 |

## 总评：**PASS 无条件**

- 四清单逐条独立复算全过：①门一 W1/W3/N2 三回炉项+两销项（W2/W4）独立复证+注记级三项确认未恶化；②票面五点逐点对 diff 吻合（含六词显式表/kebab/camelCase 子集/域外不报）；③宪法红线全绿+TDD 证据链 13 件原件抽验结构闭合；④机器面八项亲跑全绿（dry-run 四面 0/lint 0 误报/quality/tickets/typecheck 双口径/test 1579/manifest 318/翻 done 推演不红）。
- 两条 N 级注记均不构成放行条件（N-G2-1 收口 locks:apply 自然消解，唯一悬置=主控自证亲改归属）。
- 收口路径（主控）：locks:apply 重锁（eslint.config.js+dryrun.mjs 同批）→翻 registry F-LINT-04-T2=done→[locked-change] 提交→证据件 34 件按三桶口径①显式列入库。
