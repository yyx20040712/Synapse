[routing]: run=20260901232151-1njc source=kimi-main model=kimi-k3 switches=0 usage=in=30243,out=18824 latency=276314ms (by ds-call.mjs 链)

# 终审报告：R2 批次全量复审（P0+U1+U2+工作区修复）

## B 级（阻断/失真，需处置）

**[B1] INV-34 量纲附注、audit0 F-R2 处置段、f-r2-ticket ③-1 三处文档停留在已否决的比值法口径，与终形态实现直接相悖**
- `docs/invariants.md` INV-34 行（本 diff 改后态）明文："差值法视觉项必须经 effectiveZoom（**gBCR.height/clientHeight，guard 除零返 1**）折算"，并展开"gBCR.height 含 border/横滚动条而 clientHeight 不含"的量测口径前提。
- `src/renderer/features/reader/scroll-converge.ts:33-42` 头注明文："**禁用 gBCR/clientHeight 比值法**……computed zoom=CSS 声明值直读"；`effectiveZoom`（:44-51）实现为逐层 computed zoom 链乘积，代码中不存在任何"guard 除零返 1"分支。
- `docs/audits/audit0-findings.md` F-R2 段同步失真："effectiveZoom 单源（gBCR.height/clientHeight+guard 除零）"；`scripts/audits/f-r2-ticket.md` ③-1 票面公式（"z = scroller.getBoundingClientRect().height / scroller.clientHeight；guard 除零"）亦未回填修订。
- 影响：INV-34 是受锁不变量登记册、后续门审的锚点文献——按其口径审现实现，会误判"实现违反不变量"。回炉 1 定案（披露事项 5）只进了交接书与代码注释，未回填三处归档文档。

**[B2] 同一 3.45px 事件两种互斥归因并存，不能同真**
- `scroll-converge.ts` 头注（:36-39）："恢复链落点偏移顶破『重开原位 ±2px』容差（e2e **3.45px 稳定红实证**）"——归因为比值法 ε 污染、且称"稳定红"。
- `audit0-findings.md` F-R2e 备案行："全量序列第三跑 3.45px 超 2px 容差（同值复现）但**单跑绿+U1 收口全量亦绿**——序列敏感备案"。
- 矛盾点：若 ε 污染是确定性根因且足以产生 3.45px，单跑不可能绿；若确为序列敏感噪声，则代码注释的"稳定红实证"为不实陈述，且"改用 zoom 链修复了它"的因果链不成立（F-R2e 自己备案为未结案观察项即是反证）。定量上 ε≈0.0005 要凑出 3.45px 需 δv≈8300px，包内未给出该 e2e 链路的 δv 佐证数值。两种表述必有一处失真，需裁决并统一。

**[B3] ds-call.mjs RETRYABLE 分支缺末次守卫：429/5xx 耗尽后抛 `'unreachable'` 且 switch 事件漏记，审计可指认性破窗（log 实证）**
- `scripts/audits/ds-call.mjs` callSource：`if (RETRYABLE(res.status)) { …wait…; continue }`——无 `attempt === 3` 守卫（对照：非 RETRYABLE 的 `!res.ok` 分支有 `if (attempt === 3) throw new Error('HTTP …')`）。attempt=3 遇 504 时退避 40s 后 continue 出循环，落到循环外 `throw new Error('unreachable')`——此 throw 在 try/catch 之外，**不触发 switch 事件落账**，且真实 HTTP 状态被"unreachable"抹除。
- 包内实证：`model-routing-log.jsonl` 18:26:42–18:42:18 kimi-main 四条 attempt 事件后**无 switch 事件**，直接接 18:47:58 kimi-backup attempt（对照 23:20:30 两次 404 fatal 路径 switch 事件完整在账）。头注自宣称"逐事件一行 JSON……换源/欠账/用量可指认"，而本批唯一一次生产级换源恰恰漏记。
- 附带：末次 attempt 后白等 40s 退避再抛错；exhaust 事件在末源 retryable 耗尽时 error 字段同样只剩"unreachable"。

## W 级（警告/对账缺口）

**[W1] 工作区修复改动受锁文件 ds-call.mjs，locks 时序证据指向 sha 脱钩（不确定，需澄清）**
- `locks/manifest.json`：`ds-call.mjs` sha=f8a5ff98…，`generatedAt=2026-09-01T19:10:39Z`（均为 UTC）。修复复验实证=log 23:20:30Z 双 404→23:21:18Z kimi-main ok 6270ms（即披露事项 6 的"6.3s 命中"）。19:10:39Z < 23:21:18Z，即 manifest 快照早于修复落地约 4 小时。
- 本 diff 中 ds-call.mjs 已含修复（buildRequest `replace(/\/v1$/,'')` 及"2026-09-02 用户修复后适配"注释），说明包呈交的是含工作区修复的态。则工作区 ds-call.mjs 哈希 ≠ manifest 所钉 sha，除非存在包外未示的 manifest 重生成。受锁文件"改而不入锁、未提交"的断链后果未在披露事项 6 中说明。不确定点：终态 verify（exit=0）若跑在修复后，则 manifest 必已重生成——但那与 diff 中的 generatedAt/sha 又不能同真。

**[W2] p7a-ticket.md 基线数字与 manifest 终态对账错位**
- `scripts/audits/p7a-ticket.md` 末行："基线=verify 126 文件 1081 用例/**locks 228**"。manifest 本 diff 净增恰 3 条（f-r2-diag2/f-r2-probe/f-r2-probe2，全部属 U1），226+3=**229**。P7A 在 U1 后起草（1081 已含 +7），其基线应为 229。若 228 属实，则三条入锁中有一条无归属；若笔误，则票面基线失准。二选一，包内无法裁决。

**[W3] P7A 验收口径位移未申报：票面"3 次全量绿"→ 交付"P7A 用例 3 绿"**
- `p7a-ticket.md` ④："e2e 全量跑（29 条）+**连跑 3 次首跑即绿**（……3 次全量）"。实际证据（包披露+registry P7A 行）：29/29、29/29、**28/29**，第三跑全量红（划选高亮条，即 F-R2e）。registry 摘要改写为"连跑 3 次 **P7-A** 全绿"——判据从"3 次全量"收窄为"3 次该用例"，属票面验收口径位移，未见申报记录（F-R2e 单独立案不能回溯性豁免 U2 的验收判据）。

**[W4] P7A 门审链单门：仅 deepseek 一门在案，门一缺位欠账未明示**
- 包首："门一已审 F-R2 **首版** B:0/W:1/N:6；deepseek 已审回炉+P7A B:0/W:2/N:2"。U1 回炉与 U2 两件压缩票直做的独立门审均只有 deepseek 一源（回炉尚有二审性质可辩，P7A 是全新实现只有单门）。披露事项 1 担责了"压缩票直做"，但门审链单门欠账未在备案清单中出现。本次双源复审属事后补偿，不能替代票级门一。

## N 级（提示）

**[N1]** ds-call.mjs：`chain = sources.filter(s => s.ok)`——主源配置缺失时被静默跳过且无任何事件落账，与头注"主源不得主动跳过"的可追溯要求有缺口（list-sources 可查但链式运行无痕迹）。

**[N2]** ds-call.mjs：`--source` 指定不可用源时 `sources.filter(s => s.alias === onlyAlias)` 不查 `s.ok`，chain 含无 baseURL 的源 → `buildRequest` 内 `undefined.replace` TypeError 崩溃，"未知或不可用源"的友好报错只在 chain 为空时可达。

**[N3]** `[locked-change]` 头注口径不一：两单测文件（scroll-converge.test 头部"[F-R2] 双空间折算用例（受锁改写，[locked-change] 授权面）"、scroll-progress.test 同型）在文件头注；reader-text.spec 的"[P7A/locked-change]"在被改 test 前的内联注释块（:562 起），票面要求"头注一行"。先例（F-A4/F-N1）口径包内不可核，不确定是否偏离。

**[N4]** 交接叙事"kimi-main 504 两退避"与 log 不符：18:26–18:42 共 4 次 attempt=3 次退避。叙事缩水无碍事实链，但属对账毛刺。

**[N5]** audit0 F-R2 段变异清单停留"变异 M1~M4 全红证"，回炉后 M5（漏乘 scroller 层→5 用例红+还原 diff 空）未回填台账，M 清单与回炉证据摘要断档。

**[N6]** effectiveZoom 残留面与注释微瑕：①祖先 `transform: scale()` 不在 zoom 链覆盖内（gBCR 受其影响而 clientHeight 不受），包内无该形态存在的证据，属未排查面未备案，提示性登记候选；②注释"'normal'/空/undefined→NaN→1"与实现有微差——空串经 `Number('')=0` 走 `||1` 而非 NaN 路径，行为等价、表述不准。

## 复核中验证无误的关键点（免立条目）

- F-R2 数学闭合复算：−(Z−1)δv 预测 −512.25/−204.72 vs 实测 −512.6/−204.8 ✓；center 新公式 z=1 时与旧式代数恒等 ✓；三新用例期望值 430/800/1600 复算命中 ✓；measurePageBoxes 折算（112.5/1.25+110=200）✓；"先红 6"与新增 7 用例自洽（z=1 恒等护栏在旧实现下本即绿）✓。
- 1081=1074+7、229=226+3、e2e 波动（28/29 第三跑）如实披露并入 F-R2e 备案 ✓。
- P7A 断言锚未放宽（终态仍 `toContain(PDF_KNOWN_TEXT)`），失败信息带末次读值可归因 ✓；清场标记在 ctrl+c 前、selectText 后，时序正确 ✓。

## 统计

**B:3 / W:4 / N:6**

## 总评

**本批复审：需处置。** 三单元核心实现（zoom 链折算数学、P7A 防线、派发器双形态主体）未发现阻断性缺陷，先红/变异/真机数值链自洽；但三条 B 均落在治理面——受锁不变量文档（INV-34）与实现公式相悖（B1）、3.45px 证据双归因矛盾（B2）、派发器 retryable 耗尽路径漏记 switch 事件且有生产 log 实证（B3）。处置清单（优先级序）：①B1 文档回填（INV-34 附注/audit0 F-R2 段/f-r2-ticket ③-1 三处改钉 zoom 链终形态，连带 N5 M5 回填）——这是后续一切门审的锚点文献，最高优先；②B2 归因裁决（调取 f-r2-diag2/probe 原始档核算该 e2e 链路 δv，裁定"ε 实证"与"序列敏感"孰真，修订代码注释或 F-R2e 备案其一）；③B3+W1 合并处置：工作区修复提交入锁+RETRYABLE 末次守卫+switch 落账修复（小票先行）；④W2/W3/W4 对账与欠账登记入 v19 台账。

## D 下场建议

U3 顺延位执行序建议：先进一条"治理清账小票"（B1 文档回填+B2 归因裁决+B3/W1 派发器修复与入锁，合计票面量级远小于 U3，且 B1 不清则 U3 门审锚点文献失真）再启 U3 正票；新备案项优先级：F-R2e（序列敏感，≥2 次复现即立案，建议下批首轮全量跑顺带观测）> B-3/H3 anchoredScrollTop 分母错配代码债（证伪后纯债，v19 常态位）> N6 transform:scale 残留面登记（提示性）> P7A 单门欠账（下批门一补审或本次双源复审视同销项，需主控明裁其一）。