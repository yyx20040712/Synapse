verdict: **GO_WITH_CONDITIONS**｜P0=0 / P1=4 / P2=4 / N=5｜回炉=0｜F-SENSOR-01（零行为装配重构：ai_sensor 桶拆三键 + readStatus 显式注入）交付面成立；四项收口条件必兑现——其中 P1-1 为简报⑦尾注勘正（照抄 [locked-change][test-refactor] = CI 范围闸必红，确定性）。

角色：ops-adjudicator（门二，绑定档位 deepseek-flash$max）。工作区根 `E:\class\智慧水务\Synapse_remake`，审包=scripts/audits/b25-gate2-brief.md；证据件均在 scripts/audits/，代码件按仓内相对路径。工具面=只读（Read/Grep/Glob），未亲跑任何命令——按实证部/裁决岗不对称分工；一切结论自原始件重推，未采信门一转述。

## 分级发现

**P0：无。**

**P1-1（尾注勘正，必改）｜简报⑦「[locked-change][test-refactor]」尾注照抄=CI 必红。**
- 机械依据：.github/workflows/ci.yml:140 范围闸白名单 TR_RE 仅含 ^tests/、^scripts/(check-test-surface|test-surface…)、^\.github/workflows/、^package(-lock)?\.json、^docs/prompts/、^docs/design/、^tickets/registry\.ts$、^locks/manifest\.json$、^AGENTS\.md$、^docs/(methodology|invariants)\.md$、^docs/audits/、^scripts/audits/——**无 ^src/**、无 ^docs/handoff/**；ci.yml:143-149 对带 [test-refactor] 的逐提交 diff-tree 取路径，OFF 非空即 exit 1（:153）。本票单笔提交必含 src/main/services/index.ts+src/main/ipc/ai_sensor.ts（以及 docs/handoff/relay.md）→ 命中 src/**「一律红」明文（ci.yml:117）。
- 制度依据：ci.yml:117-119 明文「尾注自愿制（W2 门一裁定接受）……无强制闭合非缺陷」——非 F-TESTREF 战役票不携带该尾注即为合规；tests/** 面保护由锁 sha+[locked-change] guard 独立承担（tests/utils/ipc-deps.ts 在 manifest:1485）。
- 先例：scripts/audits/b24-gate2-report.md:99 收口预批原文「提交尾注 [locked-change]（无 [test-refactor]）」，且 b24 实提交按此执行（relay.md:177 机检终态）。
- 拆两提交不可行（会留类型红中间态）：src 先改而 ipc-deps.ts 桩未随迁时 makeIpcDeps 对象缺 ai_notes_import/zcode_link 两键（IpcDeps.services: ServiceBundle，src/main/ipc/ipc-deps.ts:13）→ 中间提交 typecheck 必红，违「不留半门审提交」。
- 落法：单笔提交尾注 **仅 [locked-change]**；批次日志一句话记理由（对照 ci.yml:140/146）与依据（尾注自愿制）。

**P1-2（收口序勘正，必改）｜flip→verify 与 账本→health-scan 两处序倒置。**
- ②/③：简报 ②括注「翻 done 后」与其 ③「翻票 FLIP 探针」自相矛盾。b22/b23/b24 先例=**先 flip 后终跑 verify**（verify 需断言翻后 open 数；b24 终态 open 6=恰双票翻 done，relay.md:177）。正确序：flip 探针落盘（lint 自查+写毕即时 locks:generate+apply，G4/G7/G10 教训）→ FLIP 跑（预期 FLIP_MOVED=1 / RESIDUE=0 / open 6→5）→ 终跑 verify（变量法 EXIT）→ 账本终态。
- ④/⑤：简报把 health-scan（④）置于账本补记（⑤）之前，与其自身括注「账本终态后跑——G9 教训②序」反序（b23 门二 P1-2 同型拦下）。正确序：**账本补记（executor+gate1 外发+adjudicator，findings 对象形）→ health-scan**。
- 冻结纪律：终跑 verify 之后不得再写任何受锁件（manifest/探针；末次写入者胜）；staging 与提交自冻结树取材。

**P1-3（locks 重认证，必做）｜在档 locks 门（375）已过期于当前 manifest（376）。**
- 实测：locks/manifest.json 当前 **376** 条 path（Grep count=376）；b25-claim.mjs 在册（:65）、b25-w1-closure.mjs 在册（:69）、tests/utils/ipc-deps.ts 在册（:1485）、generatedAt=2026-09-18T23:56:11Z（:2，晚于 executor 门链 07:46 本地时点）。而 b25-gate-locks.log:7 记「375 个受锁文件」——w1-closure 入锁后**未再有 locks:check 档**（b19 教训③同型：收口链新增探针=在档 attestation 数字过期）。
- 落法：收口终跑 verify 必须重认证**终态计数**（376，若 flip 探针再入锁则 377），locks:check 红则先 locks:apply 再整体重跑；批次日志记锁链链式值（374→375→376[→377]）。sha 值与内容绑定在只读工具面不可重算（见②无佐证清单第 2 条）——此即唯一机检执行点。

**P1-4（staging 清单固化，必做）｜显式列件+未跟踪面清零+临时件仓外。**
- 必列：src/main/services/index.ts、src/main/ipc/ai_sensor.ts、tests/utils/ipc-deps.ts、locks/manifest.json、tickets/registry.ts（flip 产物；registry **不在** manifest，flip 不需要 locks:apply）、docs/handoff/relay.md（回写合并同笔，b22/b23/b24 先例）、scripts/audits/b25-claim.mjs、b25-w1-closure.mjs、b25-tickets-flip.mjs（新建）+b25-* 全部 .md/.log 证据件（含 v1 废档 b25-w123-closure.log、flip log、closeout-verify/healthscan log、e2e log）与 **b25-gate2-report.md（本报告）**；.log 走 `git add -f`（.gitignore:13 `*.log` 拦截）。
- 收口期新增一切 .mjs=写前 lint 自查+**即时** locks:generate+apply（宪法+G4/G22 教训）；账本补记临时件置仓外（.zcode/ 已 ignore）。
- 完成后 `git status` 未跟踪面应为零。

**P2 级**：
- P2-1 简报 §2 括注「恰三项+探针增量」措辞含混——物理终态=374+2 探针=**376**；批次日志以链式值记，勿复述「恰三项」。
- P2-2 e2e 记录措辞：本批=43/43 **纯绿且 flake 未触发**（b25-e2e-default.log:49 该例 3.9s 绿）——记录勿写「凭 G10 特例边界声明」（该声明仅在触发时启用）；flake-ledger 零新增=正确（docs/audits/flake-ledger.json:69-75 count 5 原样）。
- P2-3 N1 归属勘正：错误值出处=审包侧（gate1-brief:136），非实现者报告；批次日志记中性语句。
- P2-4 两枚变异 log 未回显命令面、UNLOCK_EXIT=0/APPLY_EXIT=0 无独立档（b25-impl-report.md:34 文本声明）——批次日志一句记「无独立档，以门链 log 兜底」，不复述为独立证据。

**N 级**：
- N-1 v1 探针假绿演化留档正确（b25-w123-closure.log 空集假绿 vs v2 b25-w1-closure.log 实证）——迭代证据链完整；v1 源码被覆盖（仅输出留存）属可接受。
- N-2 relay.md:17 heartbeat（23:31:31Z）非单调（早于 b24 收口心跳 23:46:00Z）——可解释为 claim 常量预写；收口板面回写请用真实时刻并记实际 claim/收口时间。
- N-3 ai-notes-import.service.ts:41 头注「四通道委托」系历史交付面句子（非装配形句子）——本票授权面外不动，归 F-DOCGOV-01 ai-sensor 段回写（registry.ts:316 已载该义务）。
- N-4 W1 探针 v2 正则方法学边界：仅识别 `export interface` 内 2 空格 `name(` 形态；对本三件完备（逐行核对零逃逸），箭头属性风格接口会漏——留作后续探针模板句。
- N-5 check-model-names 仅扫 src/**——本报告等 audits 归档件含模型串无禁区，归档无忧。

## ① 逐条裁决表（A~H；依据=独立复算，证据行号在档）

| 项 | 原判断（包内） | 裁决 | 关键依据（证据件:行号） |
| --- | --- | --- | --- |
| A 改动面恰三件+零行为 | 三件+零行为 | **成立**（附存证边界：git 级 diff 不可在只读面复算）；零行为在「键存在性/同名遮蔽/this 绑定/构造序」四面全闭合 | 工作树实读：index.ts:85-89（三键类型）、:95（aiSensor 局部量恰一构）、:121-132（三键平铺+readStatus 直传）；ipc/ai_sensor.ts:5-6、:16-23（七 handler 对号：ai_sensor×3 / ai_notes_import×2 / zcode_link×2）；ipc-deps.ts:29-31（三桩行）。消费面复扫：`services\.(ai_sensor|ai_notes_import|zcode_link)` 全仓恰 7 行（仅 ipc/ai_sensor.ts:16-23）；tests/ 零 createServices；renderer 面系 IPC 域对象非 ServiceBundle |
| B 受锁面精确性 | 恰 ipc-deps.ts 一件+manifest 机械项；契约面零触碰 | **成立**（尾注面另判：P1-1） | manifest 实读：index.ts 与 ipc/ai_sensor.ts 不在 manifest（free）；ipc-deps.ts:1485 在册；二探针 :65/:69 在册。契约面=三件零涉 api-surface/schemas（:72-78 域键不动）+契约用例含于 1744 绿。registry.ts 不在 manifest→flip 不需 locks:apply |
| C 变异红证真实性 | M1/M2 均 EXIT=2、还原 DIFF=EMPTY；M1 反证交并已拆 | **成立**（方法学附 2 条 N 级注记） | b25-m1-mutation.log:3-5（TS2339×1 at (19,52)=importAll 标识符位）；b25-m1-restore.log:3-4；b25-m2-mutation.log:3-8（TS2345×1 at (128,40)=参数位；嵌套正文点名 readStatus；TS2741_COUNT=0=未凑码）；b25-m2-restore.log:3-4。承重性：M1 红⇒交并确已拆；M2 红⇒注入缺位被编译期拦截。**防线不单一**：typecheck+W1/W2 探针+e2e 真链三层闭合 |
| D 门一 W1/W2/W3 销项充分性 | 三销项充分 | **成立**，且超探针深核 | W1：探针 b25-w1-closure.log:2-8（类型面两两∅）+运行面复算（ai-sensor:266-332 六员/ai-notes:213-235 二员/zcode:95-130 二员两两∅）。W2：readStatus 体 :283-304 逐行零 this；e2e 真链强于探针（zcode-link.spec:49「已装技能，未运行」态要求被提取的 readStatus() 走真装配返 null 不抛，b25-e2e-default.log:88 ok 43 实证）。W3：三工厂体纯闭包零 IO（ai-sensor:181-186/ai-notes:118-120/zcode:91-93），探针零命中，构造序前移无可观测效应。W4 结构面成立、sha 面见 P1-3 |
| E e2e 43/43 与 F-EXPORT-01 关系 | 43/43 绿；flake 未触发 | **满足**（且强于先例：纯绿无需特例口径） | b25-e2e-default.log:44（Running 43）、:90-91（43 passed 2.0m/E2E_EXIT=0）；flake 例 :49（:157 3.9s 绿）。台账在册 count 5/unpursued/承接=F-EXPORT-01；本票非 EXPORT 承接票；不新增 ledger=正确 |
| F 计数复核 | 152/25/51 行；3 files/26/23；N1=+6/−4 | **成立**（N1 勘正采纳，归属勘正） | 独立实测：index.ts=152、ai_sensor.ts=25、ipc-deps.ts=51；算术 +6/−4、+18/−19、+2 ⇒ 3/26/23 自洽。N1：+5/−5 错误值实际出处=**b25-gate1-brief.md:136（审包侧拷问点 5）**；实现者报告自始写 +6/−4——gate2-brief「实现者报告侧计数笔误」与实物不符→批次日志记中性句（P2-3） |
| G 承载实录 | 同族 deepseek 欠账不影响判定力 | **成立**（b24 同型，且本批有反证） | 门一=deepseek 兜底（b25-gate1-report.md:1 routing 头；run=20260918235238），门二=deepseek-flash 绑定——同族叠加仅在门一↔门二之间。本报告全部裁决自原始件重推，且自产两条与转述不符的勘正（F 归属、H 尾注）——去相关工具面有效的正面反证。门一 B=0 无阻断。kimi 恢复补跑 Ruling 新增 b25 实例=如实登记 |
| H 收口序预批 | ①~⑧ 照走 | **有条件预批** | 修正后序：①P1 条件→②flip 探针（lint+locks 即时）→③FLIP 跑（FLIP_MOVED=1/RESIDUE=0/open 6→5）→④终跑 verify（断言 open 5+终态 locks+170/1744+build 绿+tickets 零红；变量法）→⑤账本补记（76→79 预期，对象形）→⑥health-scan（账本终态后）→⑦staging 显式列件（P1-4，.log add -f）→⑧单笔提交**[locked-change] 单尾注**+relay 回写合并→板面 READY+勾选+批次日志 |

## ② 独立复算记录（均亲读/亲测，未亲跑）

1. verify 基线锚：b25-verify-baseline.log:3794-3795（170/1744）、:3835（BASELINE_EXIT=0）。
2. verify 终跑：b25-verify-final.log:3806-3807（170/1744）、:3847（FINAL_EXIT=0）——三点恒等成立。
3. 七关卡实读 EXIT：lint=0/typecheck=0/tickets=0（open 6）/locks=0（**375**——过期于当前 376）/test=0（170/1744）/quality=0/build=0。
4. 变异对：见裁决表 C；两还原 RESTORE_EXIT=0+RESTORE_DIFF=EMPTY 实读；变异备份删除（仓外 /tmp）不可核（无佐证#5）。
5. 定向回归：b25-regression.log:6-11（3 文件/37 用例）、:15（EXIT=0）。
6. e2e：43/43、EXIT=0；flake 例绿；zcode 真链 :88。
7. W1 双面复算：探针输出+三返回体成员运行面复读，两两交集∅。
8. W2 复算：readStatus 体逐行零 this；e2e 运行级实证。
9. W3 复算：三工厂纯闭包（亲读三体）；探针零命中。
10. W4 结构复算：manifest=376 条；:65/:69/:1485 在册；:2 时间戳晚于 executor 门链——sha 值不可在只读面复算（无 HEAD 对照）。
11. 计数复算：index.ts=152、ai_sensor.ts=25、ipc-deps.ts=51；diff 算术自洽 3/26/23。
12. 消费面复算：全仓恰 7 行；tests/ 零 createServices；bootstrap 零键消费。
13. 受锁面复算：src/main 两件 free；ipc-deps.ts 在册；registry.ts 不在 manifest。
14. 收口机检面复算：ci.yml:140 TR_RE 无 src/** 与 docs/handoff/**（P1-1 依据）；ci.yml:100-113 manifest 变更需 [locked-change]；check-model-names 仅扫 src/**；.gitignore:13 *.log。
15. 台账/票面复算：F-SENSOR-01 open（registry.ts:313）；open 总数 6；flip 预期 open 6→5、FLIP_MOVED=1。

**无佐证断言清单（点名，均附处置）**：
1. 「改动恰三件」——git 级 diff 只读面不可复现；兜底=staging 显式列件+verify。
2. manifest「恰三项机械变化」与 sha 值——不可重算；执行点=P1-3 终跑重认证。
3. UNLOCK/APPLY_EXIT=0——无独立 log（文本声明）；以门链 locks log 与最终 verify 兜底（P2-4）。
4. 「三服务件逻辑零触碰」——间接背书=内容实读与改动面语义一致+全套门链绿。
5. 变异备份已删（/tmp 空）——仓内无 .bak/.tmp 残留（glob 实测零命中）。
6. e2e/verify 宿主与命令面细节——接受 log 面物理值（EXIT 变量法在档）。

## P1 放行条件清单（收口前必须满足）

1. **P1-1 尾注**：单笔提交尾注=[locked-change]（禁 [test-refactor]）；验收=提交信息复核+批次日志一句记理由。
2. **P1-2 序**：flip→FLIP→终跑 verify→账本终态→health-scan→staging→提交；验收=各步 log 在档、时序自洽；终跑后受锁面冻结。
3. **P1-3 locks 重认证**：终跑 verify locks:check 报终态计数（376；flip 探针+1 则 377）一致；红则 apply 后整体重跑；验收=verify log 计数行+锁链式值（374→375→376[→377]）。
4. **P1-4 staging**：显式列件（含 b25-gate2-report.md、v1 废档 log、flip 探针 .mjs/.log、closeout-verify/healthscan log；.log add -f）；验收=git status 未跟踪清零+暂存清单与 ls 对账+无 out/.mimosa 混入+新增 .mjs 已即时入锁。

## ③ 回炉建议与优先级

- **回炉=0**：交付面无缺陷无需返工；P1 四项全部为收口操作面勘正，按条件执行即可放行。
- 优先级：P1-1（不改正=CI 红）>P1-3（数字失真）>P1-2（序倒置）>P1-4（staging 不全）；P2 四条随批次日志落笔；N 五条登记（N-3 归 F-DOCGOV-01、N-4 探针模板句、N-2 真实心跳）。
