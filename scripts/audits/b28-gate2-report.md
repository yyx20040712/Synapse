# F-PROC-01 门二终审报告（b28 制度批——ops-adjudicator 实证终审）

> 落档说明（主控代笔）：ops-adjudicator 物理工具面=Read/Glob/Grep 无写通道，
> 报告全文随派发回执内联返回，主控逐字落档本件——零改写（含 MODEL-SELF 尾栏）。

## 0. 边界声明与输入

- 工具面=Read/Glob/Grep（只读）；未跑任何命令/测试/npm——不亲跑系岗位不对称分工，非证据缺口；结论全部来自包内实物，包外事实零引用。
- 主要输入（绝对路径，根=E:\class\智慧水务\Synapse_remake）：`scripts\audits\b28-gate2-brief.md`、`b28-gate2-diff.patch`、`b28-gate1-brief.md`、`b28-gate1-diff.patch`、`b28-gate1-report.md`、`b28-proc01-impl-brief.md`、`b28-proc01-impl-report.md`、`b28-proc01-verify-final.log`、`b28-proc01-verify-postfix.log`、`b28-claim.mjs`/`b28-claim.log`、`tickets\registry.ts`、`locks\manifest.json`、`docs\methodology.md`、`AGENTS.md`、`docs\adr\0013`/`0015`、`docs\audits\audit0-findings.md`、`docs\audits\weak-anchor-register.md`、`docs\invariants.md`、`docs\architecture.md`、`docs\design\2026-09-18_complexity-governance-ruling.md`、`docs\reports\2026-09-18_align01-org-audit.md`、`docs\handoff\relay.md`、`docs\prompts\2026-09-18_loop-handoff-v62-relay-channel.md`、`scripts\check-tickets.mjs`、`scripts\check-locks.mjs`、`scripts\check-quality.mjs`、`eslint.config.js`、`scripts\audits\2026-09-18_survey-doc-drift.md`。
- 包不足以裁决项 3 处、读证据级（不可亲跑）项 1 处，均点名于 §2.6。

## 1. 逐条裁决表

### 1.1 处置核对（门一 B0/W5/N5 + 主控三分法处置 ↔ 终态实物）

| # | 原判断 | 裁决 | 依据（证据行号） |
| --- | --- | --- | --- |
| B0 | 门一无 B 级 | 成立 | b28-gate1-report.md:59「B=0/W=5/N=5」 |
| W1 | 裁决 9 日期标 09-19 失准且同批口径不一（门一）→ 主控已修 | **成立（已修，终态符）** | 终态 AGENTS.md:91「……无触及如实申报——2026-09-17 裁决 9」；终态 docs/methodology.md:169-170「2026-09-17 复杂度治理裁决 9 扩三，F-PROC-01 2026-09-19 落档」；裁决依据=ruling:36 C 组头注「2026-09-17 裁」+:40 第 9 行；对位=旧态 b28-gate1-diff.patch:9（09-19）/ :101-102（09-19），修缮态 b28-gate2-diff.patch:9/:102-104 |
| W2 | 事故档回流行落点「§4」与 P9「§5」冲突（门一）→ 去硬编码 | **成立（已修，终态符）** | 终态 docs/methodology.md:182-184「每份交接书教训行段（交接书/接力板批次日志两形态通用——载体节号随模板版本，勿硬编码）……」；P9 原文未动=:101-102「教训 §5 → 下任交接书 §5」；对位=b28-gate2-diff.patch:114-118 |
| W3 | 汇出主体「门二」与 §4.3⑤「主控」互斥（门一）→ 改主控 | **成立（已修，终态符）** | 终态 docs/methodology.md:358「成本账本行……主控从派发回执汇出」与 :292-293 §4.3⑤「主控从派发回执汇出」单源；对位=b28-gate2-diff.patch:144-145（旧行「门二」在 patch:144 删除行） |
| W4 | align01 引用无目录前缀且存在性不可证（门一）→ 补全 docs/reports/ 前缀 | **成立（已修，终态符）** | 终态 docs/methodology.md:362「……docs/reports/2026-09-18_align01-org-audit.md」；文件实测存在（Glob 命中）；内容互证=该报告 :78「断流 9 天」+:84「写入器（safeAppend ledgerPath）只挂在 ds-call 派发器链上」；对位=b28-gate2-diff.patch:149 |
| W5 | 冻结规矩与 P11 双源风险（门一）→ P11 句内嵌用户级+单源指针 | **成立（已修，终态符）** | 终态 docs/methodology.md:121-122 P11「增删白名单=[locked-change]+用户级裁决（COMPOSITION_ROOT_ALLOW 冻结规矩，§4 治理指标段单源）+注释写明裁决依据」；冻结规矩本体 :179-180；对位=b28-gate2-diff.patch:85-87 |
| N1 | AGENTS 指针「§6 实体表+ADR 索引」节号半偏（门一）→ 改「§5 ADR 索引+§6 实体表」 | **成立（已修，终态符）** | AGENTS.md:91；实证 docs/architecture.md:66「## 5. 关键设计决策（ADR 索引……」、:93「## 6. 数据模型」 |
| N2 | 回流句载体仅「交接书」未覆盖接力板形态（门一）→ 两形态通用句 | **成立（已修，终态符）** | docs/methodology.md:183「交接书/接力板批次日志两形态通用」；实际载体形态旁证=relay.md:192「## 批次日志（追加，勿改写）」+ v62 交接书「## 5. 环境事实滚动」 |
| N3 | 收口日志三数（37.2%/7/13）系前向承诺（门一） | **接受（待收口兑现）** | relay.md 批次日志最末=batch 27（:194 起），batch 28 段不存在；兑现条件入 §4 C4 |
| N4 | .log 命名 vs methodology:199-202「.raw.txt 统一」纪律（门一）→ 主控裁沿 b24~b27 惯例 .log+add -f | **接受但记 P2-1**（本批可行，须留痕；长期二择一） | 纪律句 docs/methodology.md:199-202；惯例先例=relay.md:199（b27 证据件 .log 入库）、本批 b28-claim.log 在档、两 verify log 尾 exit 行在档（final:3822/postfix:3848）；处置记录义务入 §4 C3/C6 |
| N5 | #2a 括号形→破折号形（门一，提示级）→ 不动 | **接受（主控裁量，措辞级）** | b28-gate2-diff.patch:102-103「……裁决 9 扩三，F-PROC-01 2026-09-19 落档）」；无制度效力差异 |

### 1.2 母本符合度（票面 registry:318 六子任务+移交三项 ↔ 终态）

| 项 | 裁决 | 依据 |
| --- | --- | --- |
| ① DoD 增 ADR/架构回写项 | 成立 | AGENTS.md:91（终态行）；patch:9 |
| ② 交接书固定事故档回流行 | 成立 | methodology.md:182-186；patch:114-118 |
| ③ 治理指标扩三（五→八） | 成立（数字口径按预裁 3，以册实测为准） | methodology.md:169-177；「基线 37.2%=……11,514/30,974 行含 CSS」:172-173、「基线 7」:173、「基线 13=zustand 11+toast-store+annotation-undo」:174；§4 见 §2.2 复算 |
| ④ 冻结规矩+M2 预防句 | 成立 | 冻结 methodology.md:179-180；M2 :111-114（引 complexity-audit §3） |
| ⑤ 直调类派发账本补记规则 | 成立 | methodology.md:359-362（findings 对象形 B/W/N+verdict+note、即时补记、断流 9 天） |
| ⑥ 裁决 14（health-scan 并行不并入） | 成立 | methodology.md:306-308；ruling:44 D 组头注「2026-09-18 裁」+:50 第 14 行 |
| 移交：INV-27 形态规约不拆 | 成立 | methodology.md:146-149（≈400 字级拆 ADR 化；存量 INV-27 ~900 字不回拆）；INV-27 未动=docs/invariants.md:41 完整在、不在 diff；~900 字互证=survey:58 |
| 移交：audit0 头部职能注记（原标题保留） | 成立 | audit0-findings.md:1 标题原文未动；:3-7 注记（survey ⑤=survey:119 在） |
| 移交：W-11+ADR-0013/0015 复审状态 | 成立 | weak-anchor-register.md:26（引 survey ③#8=survey:97）；adr/0013:50-54；adr/0015:96-98 |
| 落点表 11 行/6 文件（简报「9 文件」笔误以表体为准） | 成立 | impl-brief:23/:39 笔画；两版 diff 各恰 6 文件（diff 头计数=6）；文件清单与 manifest 锁外核（§1.3） |

### 1.3 机器面核对（读实物）

| 项 | 裁决 | 依据（逐位） |
| --- | --- | --- |
| 两 verify log 指纹门 | 一致 | final.log:27 与 postfix.log:27 均「files 183/183｜cases 1768/1768｜assertions 5368/5368｜skipSites 14/14」 |
| open 计数 | 一致 | 两 log:38 均「open 3（weak 可领 0，strong 3）」；registry 实测 open 3=registry.ts:272/:318/:319 |
| locks 计数 | 一致 | 两 log:48 均「382 个受锁文件与 manifest 一致」；manifest.json:2 generatedAt=2026-09-19T09:00:51.8245824Z；条目计数 382（'\"path\":' 全文计数）；b28-claim.mjs 在册=manifest:105 |
| 用例数 | 一致 | final.log:3781-3782 与 postfix.log:3807-3808 均「Test Files 167 passed (167)／Tests 1724 passed (1724)」 |
| 产物名/尺寸 | 一致 | final.log:3817-3820 与 postfix.log:3843-3846：index.html 0.88 kB／pdf.worker.min-yatZIOMy.mjs 1,375.84 kB／index-BfpEygSE.css 52.49 kB／index-DW6Z3WXp.js 1,388.14 kB；与 b27 记载同名同尺寸（relay.md:199）=零 src 直证 |
| 退出码与执行序 | 成立 | final.log:3822 末行 exit=0（实现者首轮，Start 17:15:00 :3783）；postfix.log:3848 末行 exit=0（修缮后复跑，Start 17:40:04 :3809）——顺序铁律兑现 |
| 锁链 381→382 | 成立 | b27 终态 381=relay.md:199「closeout verify2……locks 381 对账」；b28 新增受锁件恰 1=b28-claim.mjs（manifest:105，实证 claim 写毕即锁：claim.log:1 心跳 09:00:31Z→manifest 09:00:51Z 差 20s）；b24~b27 各批 claim/flip 脚本均在册（manifest:41-101） |
| 受锁面零触碰（六编辑文件） | 成立 | manifest 对 AGENTS.md/methodology.md/0013/0015/audit0/weak-anchor 六路径 grep 零命中；check-locks.mjs:26-51 受锁集合定义（tests/src-shared/migrations/*.test.tsx?/invariants/配置/scripts 下 .mjs|.ps1）不含此六件 |
| 门审简报/报告件是否入锁 | 成立（不入锁=非缺陷） | check-locks.mjs:48 walk(scripts) 过滤仅 .mjs/.ps1——`.md/.log/.patch` 天然不在面 |
| 翻票锚唯一性 | 成立 | registry 行首 `{ id: 'F-PROC-01', ` 计数=1（registry.ts:318）；b27 先例锚形=scripts/audits/b27-tickets-flip.mjs:8 |
| 翻票预检（规则 3 词表碰撞推演） | **绿**（详见 §2.4） | check-tickets.mjs:166-180 规则 3 词表=`/unimplementedObject\|NotImplementedError\(/`（:177）；methodology.md 对 unimplementedObject/NotImplementedError/data-ticket/_STUB 全零命中（grep ∅）；第二证：F-DOCGOV-01（registry:262，done，同 file 锚）本已使 methodology.md 处于 done 票扫描面，两份 verify log 全绿 |

### 1.4 宪法红线终审

| 项 | 裁决 | 依据 |
| --- | --- | --- |
| 分层/安全禁令 | 成立（零触碰） | diff 6 文件全为文档；零 src/tests/shared |
| 受锁尾注 | 收口执行项（预批通过） | 提交面=manifest 变更+新探针脚本→[locked-change] 单尾注（禁 [test-refactor]：本 diff 含非 tests 路径，CI 范围闸必红——b25 先例 relay.md:248）；入 §4 C5 |
| UTF-8 | 成立 | 全部读取件零乱码（quality 关卡两 log:18 亦绿） |
| 行数 | 成立 | methodology 实测 372 行、AGENTS 272 行（'^' 全文计数），均 ≤500；简报「~375」为近似值（N-1） |
| e2e 不跑（纯文档） | 成立 | b27 同口径（relay.md:199「e2e 不跑（文档批零行为口径——门二 N-4 裁定成立）」）+产物同名同尺寸直证 |
| 历史叙述红线 | 成立 | audit0:1 标题原文保留；INV-27 未动（不在 diff，invariants.md:41 完整） |

### 1.5 收口序预批（六步）

1. 账本三岗行：**预批通过**——形态沿 ledger:80-87 先例（executor={verdict,note}；gate1={B,W,N,verdict,note}；adjudicator={P0,P1,P2,N,verdict,note}）；executor 档位如实记（impl-brief:9 申报 session:host-tier，2026-09-19 用户裁决未绑定形态——包内无该裁决原件，按简报申报口径接受，禁静默冒充已定档）。
2. health-scan（账本终态后跑，RED=0）：**预批通过**——序沿 b25 P1-2/relay:211。
3. 翻票探针+翻票：**有条件预批**（C1/C2）。
4. 终跑 verify（翻票后）：**有条件预批**（C2）。
5. relay 批次日志+板面：**有条件预批**（C4）。
6. staging+提交：**有条件预批**（C3/C5/C6）。

## 2. 独立复算记录（不采信转述）

### 2.1 终态 diff 行数复算（勘正时点差）
- 实测（grep 计数）：b28-gate2-diff.patch 总 152 行（=简报值）；`^+` 61−6 头=`+55`；`^-` 11−6 头=`−5`；文件数=6（diff 头计数）。
- 与 impl 报告 numstat `+51/−3`（impl-report 计数表）及门一复算值之差=+4/−2，逐条归因：W2 行拆分 +1；W3 行重写 +1/−1；W5 行替换 +2/−1；W1/W4 纯文本内替换 ±0。**两个数各自正确（时点差），非失实**；但收口文本引用须用终态 +55/−5（P2-2）。
- 门一 diff（前修缮态）实测 141 行（=gate1-brief:49 值），`+51/−3` 与其逐段复算吻合（gate1-report:20）。

### 2.2 基线数字复算
- 37.2%：算术 11514/30974=0.371734…→37.2% 成立（分母含 CSS 口径句在册 methodology.md:172-173）；文件数 69 **亲数吻合**（Glob 实测 reader 域 .ts 38+.tsx 30+.css 1=69）；行数本体属读证据级（§2.6）；跨档互证=ruling:31「六域合体 69 文件/11,791 行=src 38%（含 CSS 口径）」，与 F-TIME-02 净删（relay:208 净−1025）取向一致。
- 7=check-quality.mjs:94-100 Map 恰 7 条（逐条点名清点）。
- 13=invariants.md:86 INV-70 附件清单「zustand 11（六 feature 域+reader 四域+corpus-export）+toast-store+annotation-undo」实点 11+1+1=13 成立。
- 断流 9 天=align01 报告:76-78（末笔 09-09→09-18 核查日）算术自洽。

### 2.3 锁/指纹/产物逐位对照
见表 §1.3 各行（final↔postfix 双 log、manifest↔log↔relay b27 记载三点互证）。

### 2.4 规则 3 词表碰撞推演（翻 done 预检）
- 扫描面：check-tickets.mjs:166-180——仅对 done 票 `t.file` 读内容匹配 :177 正则；F-PROC-01 file=docs/methodology.md。
- 碰撞面：methodology.md 全文零命中 `unimplementedObject|NotImplementedError(`；规则 4b（:198-214）另查 `data-ticket="F-PROC-01"` 与 `_STUB` 导出正则，亦零命中（grep ∅）。「check-quality 白名单」「INV-70」等新句用词不在任何词表。
- 加强证：同 file 锚的 F-DOCGOV-01 已 done（registry:262），翻 done 后 methodology.md 早已在扫描集内且两 log 全绿——规则 3 面此前已充分行使。
- 其余规则核：id 白名单（:92，F-PROC-01 匹配）、file 存在（:107 通过）、对账哨兵计数不因 open→done 变化（:52-59）、规则 2/5/6 不涉本票。
- **预判：翻 done 后 tickets:check 绿；终跑 verify 预期红面=0；预期终态读数=open 3→2、locks=382+N（N=本收口新写 .mjs/.ps1 数，预期 1=flip 探针，若另写 relay 探针则 2）、Test Files 167、Tests 1724、指纹门与产物恒等。**

### 2.5 无佐证/受限断言点名（逐条）
1. relay.md 工作树 +61 行归属（impl-report 疑虑 2）——无 git 面可读，**包不足以裁决**；按 b27 先例+主控面申报接受，收口 `git diff --stat` 核。
2. 11,514/30,974 行数本体——只读工具面无 wc 可复跑，**读证据级**（文件数 69 已亲数吻合、算术自洽、跨档互证）；非阻断。
3. final.log 的 exit=0 取法（pipefail 自裁 1——impl-report 自裁 3）——日志可证 exit 行在档与命令语义自洽，真退出码不可复跑；postfix 复跑已由主控亲验（简报 §3 口径），接受。
4. W-11「现有守卫」形态——tests/utils/ipc-deps.ts 无 clipboard/throw 字面（可选注入态与行文自洽），守卫疑为 export-clipboard.test.ts:23-34 装配链缺失时的响亮失败；**包内未逐字判形**，观察行非阻断。
5. ledger 直调补记的先例形态＝三行/场（F-EXPORT-01 ledger:80-82）；F-DOCGOV-01 仅两行（:86-87，主控代执场）——本批三行要求按简报执行即可，形态差异有先例，非缺陷。

## 3. Findings（分级）

**P0=0。**

**P1（收口前置条件，缺一不得翻票/提交）**
- P1-1 翻票探针纪律：b28-tickets-flip.mjs 须（a）前缀锚 `  { id: 'F-PROC-01', `（行首定义形态）；（b）恰 1 置换守卫，失败**先退出后写盘**；（c）回读确认；（d）`out.join('\n')`（b27 v1 TypeError 实录 b27-tickets-flip-v1-fail.log:5-12）；（e）写毕 dry 跑过再 `locks:generate`+`apply` 即时入锁，终跑 verify 覆盖 eslint。
- P1-2 终跑 verify 读数对账：翻票后跑（顺序铁律），逐项核 open 2／locks=382+N（先定 N 再判数；预期 383）／167／1724／指纹门恒等／产物同名；任何不等即停查。
- P1-3 staging 显式列件：六编辑文件+registry+relay.md+manifest+两探针/claim 脚本+全 b28 证据件（含两份 verify .log 以 `git add -f` 入库并 `git ls-files` 回执核对，N4 纪律原文兑现）。
- P1-4 N3 兑现：batch 28 批次日志含 37.2%/7/13 三数+锁链 382→383 记+勾选 :181 项。

**P2（非阻断，记录/随访）**
- P2-1 N4 制度漂移留痕：.log+add -f 与 methodology:199-202「.raw.txt 统一」并存=双源；本批按惯例可，但批次日志须显式记录该裁量与理由，建议后续立微票二择一（改纪律句或继续惯例化）。
- P2-2 计数引用口径：收口文本引用 diff 统计须用终态 +55/−5（impl 报告的 +51/−3 为实现时点）；registry:318 立案数字 38%/约 10 与终态册 37.2%/13 并存（预裁 3 已定以册实测为准），批次日志补一句口径注记防下游误读。
- P2-3 门一 W4 候选路径四例不含 docs/reports/ 前缀（其自测漏报系候选枚举不全）——终态已修，提示未来指针核验优先按受引文件目录枚举。

**N（信息级）**
- N-1 行数快照：methodology 实测 372（简报 ~375）、AGENTS 272；≤500 合规。
- N-2 W-11 守卫形态未逐字判（见 §2.5-4），观察行性质不改。
- N-3 relay.md 现态 RUNNING/claim-1789808431856-b28（relay.md:9/:18，claim.log:1 一致）——收口须复位 READY+claim `-`。
- N-4 b28 证据件（.patch/.log/.md）天然不入锁面（check-locks.mjs:48）——确认非缺陷。
- N-5 两 log 的 npm warn/act(...) 警告为环境基线噪声，非本批引入。

**回炉建议=0**（无 P0/无制度句缺陷；N3/N4 属收口动作而非回炉项）。

## 4. 总评与收口条件清单

**总评：GO_WITH_CONDITIONS**——票面六子任务+移交三项全数落地、门一七处修缮终态实物逐条核验通过、机器面双 log 逐位一致、锁链与受锁面零漂移、翻票预检绿、宪法红线全过。批准按 §1.5 六步推进收口，**须满足以下条件**：

- C1：flip 探针按 P1-1 规格写完、dry 跑通过、即写即锁（locks:apply）。
- C2：翻票后终跑 verify 逐项对账 P1-2 读数（含 locks=382+N 重算、open 2）。
- C3：staging 显式列件（P1-3），证据件入库含 add -f+ls-files 核对；提交消息 [locked-change] 单尾注。
- C4：relay batch 28 日志+板面处理含 P1-4（三数/锁链/勾选）与 N-3（READY 复位）。
- C5：账本三行先于 health-scan（RED=0），executor 档位如实申报。
- C6：P2-1/P2-2 留痕句入批次日志。

MODEL-SELF: model-field:8ad55776-2296-4f1a-bc46-05755c8f1300/deepseek-flash$max
LEDGER-CLAIM: role=ops-adjudicator executor=model-field:8ad55776-2296-4f1a-bc46-05755c8f1300/deepseek-flash$max units=1 outcome=done
