# F-DEDUP-01 门二终审报告（ops-adjudicator 异构裁决位，实证终审）

> 归档注（主控）：岗工具面=仅 Read/Glob/Grep 零 shell，报告由岗全文内联交付，
> 主控逐字归档落盘（F-AIN 组合批先例同型）。统计 P0=0 P1=1 P2=5，
> 总评 GO_WITH_CONDITIONS（唯一放行条件=P1-1 收口执行序）。派发档位=
> deepseek-flash max（绑定子代理通道）。

> 承载注：本岗工具面=仅 Read/Glob/Grep、零 shell；全部结论仅引包内材料（简报/任务书/实现者报告/门一报告/diff patch/七件 raw/工作区终态实物），包外事实零断言，不可裁决处显式标注。

## 精简版（统计/总评/最重三条）

- P0=0；P1=1；P2=5。门一 11 条（B=0/W=3/N=8）逐条复核 **11/11 成立**（W1/W2/W3 处置合格、N1-N8 维持）；四收敛面+微扩全落、排除面恰好、宪法红线零破、TDD 四档证据链闭合、机检七关真退出码齐备。
- 总评：**GO_WITH_CONDITIONS** —— 代码零回炉；唯一放行条件=P1-1 收口执行序；P2 五条随收口对账/归档更正。
- 最重三条：①**P1-1 收口序**：简报④箭头序（先 locks:apply 后 INV 入册）会在提交树留下 docs/invariants.md 滞后 manifest（locks:check 必红）；正确序=编辑前置→apply→verify 终跑→单提交。②**P2-1 指纹门 +33 归因更正**：+33=26（本票四新件，含 sanitize each 展开 7 行）+7（batch 7 前票未基线化 NEW）；impl §4「26+7 each」双计且漏前票 7 条。③**P2-2 成本账本**：token/时长=平台回执面不可复算；两轮=2 units（impl 尾栏自报 units=1 须对账）；org-ledger 尚无 F-DEDUP 行。

## ① 逐条裁决表（原判断/裁决/依据/证据行号）

### A. 门一 11 条 findings 处置核对 vs 终态

| # | 原判断（来源） | 本岗裁决 | 依据（证据行号） |
| --- | --- | --- | --- |
| W1 | 报告 §2 diff 总账自相矛盾、与 patch 实物不符（gate1:38；首版 +124/-232 见 impl:95 勘误） | **成立，处置合格** | impl:60-84 表逐行；本岗表加总=+112/-220；patch 全行计数 `^+`=405+裸`+`=31=436、`^-`=204+裸`-`=16=220（与简报权威值一致）；抽验 4 文件 hunk 逐行吻合（papers.repo patch:5/14=+2/-2；http-client :27/35=+5/-5；file-store :447/477=+11/-18；corpus.export :336/355/369/378=+10/-13）；新件 324（15+52+14+14+61+108+33+27）；impl:93-96 勘误句在位 |
| W2 | 「6 文件/40 用例复绿」无 raw、口径不符（gate1:39） | **成立，处置合格** | mutations.raw:38-59「回炉1-W2」节实测追加：4 文件/26 用例 passed、RESTORE_RERUN_EXIT=0（2026-09-18T02:03:37Z）；口径与四新件逐件吻合（verify.raw:26/35/42/53=8+6+9+3）；impl:119-122 已改口径并注明首版缘由 |
| W3 | 注释改写「完整清单」漏 ≥6 文件（gate1:40） | **成立，处置合格** | impl:168-214 逐文件重列；本岗按 patch 逐 hunk 复核=20 修改文件中 18 含注释行改动、papers.repo/app-file.protocol 零注释改动（与报告机检口径一致）；漏列 6 文件均已补（report:172-214） |
| N1 | M1/M2 退出码捕获瑕疵、红证据成立（gate1:41） | 成立（记录级维持） | mutations.raw:8-23（vitest 摘要 3 failed/6、7 failed/8 在档，M1_EXIT=0/M2_VITEST_EXIT=0 如实呈报）；impl:164-167 自裁申报。非法码回落用例对 code 删除无侦测力由其余 3 例覆盖——维持记录级 |
| N2 | new.target.name 压缩敏感性、包内不确定（gate1:42） | **成立且闭环**（本岗产物复核） | out/main/index.js:1195-1202（`class DomainError extends Error`、`this.name = new.target.name;`）、:1203 `class FileStoreError extends DomainError`、:1296/:2511/:3196 类名逐字存活；消费面 toAppError 按 code 不按 name（domain-error.test:40-59）。残余=name 保真依赖构建不改类名（无机器锚，见 P2-5 提示） |
| N3 | 「atomicWriteFile 调用点恰 4」措辞不准（gate1:43） | **成立（残留）** | 工作区实测=4 文件 6 调用点（settings.ts:60/69、ai-sensor.service.ts:275、file-store.ts:143、workspace.fs.ts:97/133）；impl:87-88 对账行未改→P2-3 |
| N4 | registry :239 行号漂移无害（gate1:44） | 成立（记录级） | registry.ts:279 写 :239；旧 :250→新 :247（patch:369-377 vs 工作区 corpus.export.service.ts:247 实读） |
| N5 | 首红精确/七关真退出码全 0（gate1:45） | 成立 | firstraw:3989-4020（4 套件 load 失败、166 passed/1719、FIRSTRED_EXIT=1）；verify.raw:11/59/68/75/82/4092/4127 七 EXIT=0；green.raw:4005-4010（170/1745/GREEN_EXIT=0）；build.raw:35 |
| N6 | 指纹门 7 条 F-SESS/F-AIN NEW 系前票未基线化面（gate1:46） | 成立；+33 归因**更正**（P2-1） | verify.raw:19-25 七条 NEW（38 断言）；复算式见②-2：+33=26+7、+83=45+38 |
| N7 | quality 两组 warn 为既有面（gate1:47） | 成立 | verify.raw:7-9（warn 2 组、新增 0 组） |
| N8 | 并发双写 allSettled 自裁合理（gate1:48） | 成立 | atomic-write.test.ts:72-91（allSettled+至少一成+终名完整一方+tmp 零残留）；生产 6 调用点均顺序写（grep 复核无并发形态） |

B=0：门一无阻断项，无核对对象。

### B. 票面符合度与排除面（四收敛面+微扩）

- **DomainError 15 文件**：工作区 `extends DomainError` 恰 14 + library.service.ts:44 `export { DomainError }` =15，与票面枚举逐一吻合；`extends Error` 残留恰 3=基类本体（domain-error.ts:7）+NotImplementedError（shared/app-error.ts:101）+ApiClientError（renderer/client.ts:10）——排除面恰好。
- **原子写单源**：atomic-write.ts:34-52 四开关语义；调用点 4 文件 6 处（见 N3）；file-store FileStoreError 包装+basename 文案留调用侧（file-store.ts:143-149）；ai-sensor ensureDir（:275-279）；workspace.fs/settings 裸调。
- **清洗单源**：sanitize.ts:12-14 正则原样；调用点恰 2（export.service.ts:204、corpus.export.service.ts:411）；工作区该正则唯一实例=sanitize.ts:13。
- **app-file URL 单源（微扩）**：app-file-url.ts:10-14；3 消费点（papers.repo.ts:251、app-file.protocol.ts:22、corpus.export.service.ts:247，硬编码字面量消灭）；全 src `app-file://` 字面量均为注释/文档（reader.service.ts:5 属自裁申报文档位），无第二代码源。
- **排除面恰好**：manifest 内联（corpus.export.service.ts:188/229 固定名 MANIFEST_TMP+rename）零触碰；ai-notes-import rm+rename（ai-notes-import.service.ts:201-202）零触碰；safeFileName（ipc/export_.ts:43）零触碰；db LIKE 转义 ×3（annotations.repo:80/notes.repo:62/papers.queries:69）零触碰。
- **diff 构成**：28 文件=20 修改 src+4 新 src+4 新 tests（patch `^diff --git` 计 28）。

### C. 宪法红线

- **分层**：唯一新边 http→services/shared/domain-error（http-client.ts:15）为票面预裁「被依赖下游位」；LINT_EXIT=0（verify.raw:75）+quality「无跨域引用」（:10）双机器背书。
- **受锁面**：既有受锁件零修改——locks.raw:7-13 恰 5 条「新增未登记」、零 hash 不一致、零删除；patch 内 tests/** 4 件全 `new file mode`、src/shared 新件唯一；工作区 tests 引用 F-DEDUP-01 的文件=恰 4 新件（grep）。
- **安全**：零新依赖、零 eval/出网/renderer 面改动；协议/白名单零触碰。
- **行数**：新件 15/52/14/14 与测试 61/108/33/27 全 ≤500；抽验 ai-sensor 334 行、corpus.export 442 行（尾行号实测）；LINT_EXIT=0（max-lines 强制）。
- **UTF-8**：quality 乱码段绿（verify.raw:10）+本岗实读中文无乱码。
- **TDD 证据链四档**：首红全量（firstraw:3989-4020，FIRSTRED_EXIT=1）；变异 4 条（M1 3/6、M2 7/8、M3 2/9 且 EXIT=1、M4 2/3 且 EXIT=1；M1/M2 退出码捕获瑕疵如实申报）；还原（M1~M4_RESTORE_DIFF_EMPTY 四标记+本岗实读四文件均终态）；复绿（定向 26/26 RESTORE_RERUN_EXIT=0；全量 1745）。残余记录：RESTORE 标记为 echo 自声明（无 diff 命令原文），与 batch 7 P2-1 同族，非新缺口。

### D. 机器面数理 + 收口预演三问

- 七关真退出码+指纹门+vitest 数理见②。
- **Q1 翻 done 不红**：成立。check-tickets 规则面：done 文件（library.service.ts）无 `NotImplementedError(`/`unimplementedObject`（:177）、无自身 data-ticket/STUB（:208-212）、file 存在（:106-110）；src 引用扫描仅 SR 系（:125）不涉 F 票；registry:279 open→done 后 open 10→9（verify.raw:66 口径）；registry 不在受锁集（manifest 无 tickets/ 路径，本岗枚举核）。建议按 F-SESS-01 先例在 summary 补收口注记句。
- **Q2 锁同步 333→338**：成立。manifest files=333（本岗 `"path":` 枚举实测）；5 新件全在受锁 walk 面（check-locks.mjs:26-51：tests/**+src/shared/**）；333+5=338；apply 须同时刷新 docs/invariants.md hash（manifest:9 在册）。执行序见 P1-1。
- **Q3 INV-66/67 登记必要性**：成立（附措辞条件）。INV-66=本票新增的跨模块单源承诺（4 内容写点数处收敛+排除面），缺它「单源」无定义位（宪法：未登记=未定义行为），锚=atomic-write.test 契约+调用方既有测试；INV-67=非本票行为，属 batch 7 门二 P2-5 登记债（relay.md:293 批量补册窗口「随 F-SENSOR-01/F-DEDUP-01 场次评估」；f-ain-dep-gate2-report.md:14/80）——「本票闭合」应表述为**登记债销项**而非行为变更，锚=ai-notes-import.test a1/a2（verify.raw:20-21 两条 NEW）+变异 M1。last 号=INV-65（invariants.md:81），66/67 号位空闲。措辞条件见 P2-5。
- 附加：relay.md:282 记「locks 334」与当前 333 不符（P2-4 对账项）。

### E. 成本账本口径

- 数字=平台回执面（包内无回执原件），**不可独立复算**（F-AIN 先例同口径，禁自估）。可复核结构：executor 两轮（10,252,075+2,479,542 toks；131+14 calls；1354s+196s）→账本应记 **units=2**（或分两行），impl:252-253 尾栏自报 units=1 系单轮面，收口按两轮入账；门一=856,709/19/881（ops-gate1-k1，k3 max）；门二=本报告尾栏。`.zcode/org-ledger.jsonl` 实读 28 行、无 F-DEDUP-01 行（尾行 2026-09-18T00:32Z gate1），收口写入并按模型×供应商×套餐分列。

## ② 独立复算记录

1. **diff 权威值**：patch `^+`=405+裸`+`=31→436；`^-`=204+裸`-`=16→220；表 20 行加总=+112/-220；新件 wc 合计=324（新件 hunk 头 52/15/14/14/108/61/33/27）；**全票 +436/-220 成立**。抽验 4 文件 hunk 逐行全吻合（见①-A W1）。
2. **指纹门（更正后）**：files +4=183→187；**cases +33=26（8+6+9+3）+7（batch 7 未基线化 NEW：corpus-export.spec 1/ai-notes-import 2/corpus.export.test 4）=1757→1790**；**assertions +83=45（14+16+10+5，本岗逐文件数 expect 自算）+38（batch 7 七条：16+22）=5334→5417**（verify.raw:19-56 明细互证）。eachExpandedRows 254=baseline stats 实测（scripts/test-surface.baseline.json:25764），261 为推算（gate 输出无此字段；+7 行=sanitize each 7 行，**已含于 26 内**）。impl §4（:136-139）「26+7 each=33」双计且漏前票 7 条——数不改、式改（P2-1）。
3. **e2e 43/43**：e2e.raw:44/90-91（43 passed、E2E_APP_EXIT=0）。被触面覆盖映射：corpus.export→corpus-export.spec:31/157；workspace.fs/service→workspaces.spec:18；file-store→import-drag.spec:14+reader 导入链；ai-sensor→ai-notes-section.spec:27/159；ipc/settings→smoke.spec:143；ipc/export_→export-clipboard.spec:24；papers.repo(fileUrl)→smoke.spec:62（app-file fetch 不被 CSP 拦）；notes/tags/reader/lineage→各自 e2e（reader-text/tag-*/lineage.spec T1-T5）。http-client 无 e2e 触面（网络不入 e2e），单测覆盖——记录备案。43=默认门基线（batch 7 口径），本票零 e2e 新增，数稳。
4. **locks**：manifest 枚举 333；违规恰 5 新件（locks.raw:8-12）；apply 后=338；registry 不在锁面、docs/invariants.md 在锁面。
5. **工作区终态抽查**：4 新模块+4 新测试实读与票面契约一致（含 always-active、it.each 裸数组、断言无行尾注释）；`extends Error` 残 3（见①-B）；正则唯一实例；app-file:// 字面量仅注释；atomicWriteFile=6 调用点；无 `app-files://` 残留（M4 还原实读）；ai-notes-import rename/LIKE/manifest 内联原样；out/main/index.js 类名+new.target 在位（N2 闭环）；invariants.md 尾号 65；registry:279 为 open。
6. **收口三问复算**=①-D；**成本**=①-E。

## ③ 回炉建议与优先级

- **P0：无。**
- **P1-1【收口序·主控】** 按简报④字面箭头序（apply→verify→翻 done→INV 入册→单提交）执行，将留下 docs/invariants.md 与 manifest 不同步的提交树（locks:check 必红；且 verify 覆盖的不是冻结终态）。正确序：①unlock（锁流程）②registry 翻 done+summary 补收口注记+INV-66/67 入册（措辞按 P2-5）③locks:generate+apply（5 新件 333→338+invariants hash 刷新）④verify 全链终跑（真退出码落盘）⑤显式列文件单提交（证据件/门审档按三桶①随收口入列）。**放行条件=按此行序执行**。
- **P2-1【指纹门归因更正】** impl:136-139 与简报④「+7=sanitize each 展开行」不成立（each 7 行已含 26 内）；归档前建议补一行更正（总数不改），防复现 W1 类计数失实。
- **P2-2【成本账本】** 两轮=units 2（或两行）+rows 写入 org-ledger；token/时长平台回执面，呈报禁写「已实测」。
- **P2-3【N3 残留】** impl:87-88 改为「4 文件 6 调用点」（明细见①-B）。
- **P2-4【锁数对账】** relay.md:282「locks 334」vs 当前 333——收口按 apply 后实测（预期 338）入档并注明该旧值。
- **P2-5【INV 措辞/锚点】** INV-66 限定「内容写盘（非协议/非 manifest）」并列排除面，防「一切写盘」与现物矛盾；INV-67 表述为 batch 7 P2-5 登记债批量补册（非本票行为变更）；relay.md:293 同族窗口含 lineage 清面重灌——本场不全纳须注明「随 F-SENSOR-01 场评估」防半窗遗漏。

## 统计与总评

- 门一片 11/11 成立（W1-W3 处置合格、N1-N8 维持）；本岗 P0=0、P1=1、P2=5。
- 四收敛面+微扩全落、排除面恰好、分层/受锁/安全/行数/UTF-8 零破、TDD 四档闭合、七关真退出码+指纹门纯增+43/43 e2e 完整、产物类名存活。
- 总评：**GO_WITH_CONDITIONS** —— 唯一放行条件=P1-1 收口执行序；P2 各条随收口对账/归档更正，无代码回炉。

MODEL-SELF: model-field:8ad55776-2296-4f1a-bc46-05755c8f1300/deepseek-flash$max
LEDGER-CLAIM: role=ops-adjudicator executor=model-field:8ad55776-2296-4f1a-bc46-05755c8f1300/deepseek-flash$max units=1 outcome=done
