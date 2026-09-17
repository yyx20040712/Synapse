# 门一对抗深审报告：F-AIN-01 + F-DEP-01 组合批（备源承载 k2——主控代落盘，回复即原件）

**审包范围声明**：本次读取=简报 `scripts/audits/f-ain-dep-gate1-brief.md`、diff 包 `f-ain-dep-gate1-diff.patch`(426 行实读）、raw 证据 5 件（first-red/m1-mutation/verify/ci-dryrun/npm-ls/npm-install——最后一件简报未列名但报告指名引用）、工作区现状抽查（ai-notes-import.service.ts / services/index.ts / ai-notes-import.test.ts / lineage.service.ts / repos/index.ts / ai_notes.repo.ts / check-tickets.mjs / ci.yml / locks/manifest.json / package.json / package-lock.json）。零写操作、零命令执行。e2e 与 M1 还原两件 raw 按简报枚举不在包内，我无 Glob 不能穷举目录——是否存在异名件**不确定**，相关声明以传递证据复核（见 N4）。

## 逐条发现

### B 级（阻断）——无

### W 级

**W1 [F-AIN-01][工单 D] 实现者报告 §3 首红指纹归属失实。**
报告（diff 包 patch:124-126）称首红「a2 `expected +0 to be 1`=重灌半删清零」。但 `f-ain-01-first-red.raw.txt:14-15` 实证 a2 首红指纹为 `expected [ 'p-1' ] to deeply equal [ 'p-1', 'p-2' ]`，失败点在 rPre.imported 断言（raw:49-54，旧行号 261——即自裁 #3 承认的夹具幽灵红：beforeEach 桩不含 p-2)。`expected +0 to be 1` 实际出自 **M1 变异跑**(`f-ain-01-m1-mutation.raw.txt:15`+47-54，断言行 300 countByPaper('p-2'))。报告把 M1 的指纹记到了首红头上，违反计数/指纹落笔实测纪律。实质敏感性由 M1 双红独立证明（半插+半删两面均咬合），代码与测试本体无缺陷，故不升 B。建议主控收口时在收口单校正记述，无需回炉代码。
〔主控处置（2026-09-18）：已修正 `f-ain-01-impl.report.md` §3——勘误段入档，指纹归属校正+M1 补位说明。〕

### N 级

**N1 [F-AIN-01][C] a2 终形态「先红」缺失，由 M1 补位。** 首红跑中 a2 因夹具缺陷红在错误断言（raw:49-54)；夹具修复发生在「首绿途中」（报告 §6.3 自述），即 a2 终形态从未对未实现代码红过。红→绿时序对 a2 不严格；敏感性由 M1 变异红证（raw:15）覆盖，属时序瑕疵非覆盖缺口。

**N2 [F-AIN-01][C] a1 阶段二断言块（tests/unit/services/ai-notes-import.test.ts:244-250）从未被观测红。** 首红与 M1 两跑 a1 均先断在阶段一 :225(raw 两件同址），阶段二「重灌中断旧数据完整」的区分度是构造推断非实证；半删面由 a2(:300）实证兜底。测试级「能失败一次」纪律在 a1 整体层面满足，不断言级缺口。

**N3 [F-AIN-01][D] 报告数字两处口径偏差（终值均正确）。** ①报告 §4「指纹门 1762→1764/5350→5372」是同火归属框定——门实际输出（f-ain-01-verify.raw.txt:27）为 `1757 base / 1764 cur | 5334 base / 5372 cur`，差值含同火 F-SESS-01 的 +5 用例/+16 断言（raw:28,31-34 NEW 行）；本票净增 +2/+22(=13+9,raw:29-30）算术自洽，但箭头底数与门输出不符。②§2 行数表「227→236/+16/-6」与 diff 实测不符：三区段 hunk 净 +10(+13/-3)，按终态 236 反推改前=226；测试文件「194→303/+114」实测 193→303/+110。终值 236/303 与我直读一致。

**N4 [F-AIN-01][D] e2e 43/43 与 M1 还原复绿两声明无独立 raw 落盘。** 传递证明在位：M1 还原性=当前源码 ai-notes-import.service.ts:196-199 withTransaction 包裹在原样+verify 跑（06:59:54，晚于 M1 06:56:10）该文件 12/12 绿（verify raw:96)——变异若残留此跑必红；e2e 43=默认门 42+F-SESS-01 新增 1 e2e（指纹门 NEW 行 raw:28）数目自洽。e2e 非票面验收项（自裁 #6 主动补跑），主控收口亲验兜底。
〔主控核对（2026-09-18）：f-ain-01-e2e-app.raw.txt 在盘——e2e 面有 raw；RESTORE 标记确无 raw 载体（同 F-SESS-01 W2 族），连续两票同款→批次日志教训升级条。〕

**N5 [F-AIN-01][E] ai_notes.repo.ts:20-21 头注「导入器同步循环逐条写入（无事务包裹）」时态陈旧。** 该括注是 2026-08-27 缺陷③的历史叙述，本票后写入已包事务；但 rowid 决胜结论在事务包裹下依然成立（insert 仍逐行 `new Date()`，ai_notes.repo.ts:128 同毫秒平局来源未消），两句声明非互斥。下次合法触碰该件时可顺手校时态。

**N6 [F-DEP-01][收口提醒] [dep-change] 尾注=CI 硬闸。** ci.yml:36-49:package.json/lock 变更而提交范围无 `[dep-change]` 尾注即红；本票 diff 必触。另测试件+manifest 面需 `[locked-change]`。两尾注均为主控收口职责，diff 包内无提交体可核。

**N7 [范围外观察] tickets/registry.ts:285 F-SESS-01 已翻 done 但 summary 零收口注记**（邻票惯例均有收口段），且本批 verify 指纹门底数包含其 +5/+16。同火姊妹票，提请主控知悉，不计本批裁决。
〔主控处置（2026-09-18）：已补——summary 增「2026-09-18 收口：abortActiveSession+advance 终局守卫+bootstrap webContents 双事件接线+INV-65 入册」注记，check-tickets 复绿。〕

**N8 [F-AIN-01][裁量] 「回灌写入全有或全无」未登记 invariants.md。** 该不变量跨 repo/service，但已由受锁测试 a1/a2+指纹门双重机器锚定，lineage 同型先例亦未登记——不登记可接受，留主控裁量。
〔主控裁量（2026-09-18）：不登记——票内语义（头注行为层行+受锁测试双锚）足够，与 lineage 先例同口径；不为小票扩册。〕

## 工单 A~E 核对（要点）

**F-AIN-01**:
- A 母本：修法四点全落——deps 注入（service:90-92,**必选**与 lineage.service.ts:77 同型）/事务包裹（:196-199)/装配注入（services/index.ts:125，与 lineage 行 :137 同式）/头注行为层行（:14-17)；验收两锚 a1(:211-251)+a2(:253-303)+幂等三路径存量绿（verify raw:96)。
- B 红线：受锁链实录完整，manifest.json:1157-1158 sha 与 diff 一致，locks:check 334/334 绿（raw:55);236/303/153 行全 ≤500;tickets:check 绿（raw:46）实证自裁 #4——rule 2 扫描面只捕 SR 系（check-tickets.mjs:125)，现行「（F-AIN-01）」引用未来翻 done 不触闸。
- C 质量：事务边界=单篇且 fn 全同步无 await 跨事务（fs 面 :161/:164-168/:200-202 全在外）;parseRows(:193）先于事务——校验失败不清旧面；注入异常经 withTransaction 回滚→importOne catch(:205-209）落「导入失败」→失败篇留 corpus-ai 语义保持（:226/:250/:302 三处断言锁定）。
- D 诚实性：见 W1/N3/N4；其余数字全部核实命中（vitest 166/1719 raw:3994-3995;VERIFY_EXIT=0 raw:4035；首红存量 10 绿 raw:60)。
- E 接缝：ai_notes.repo:24-27 生产者声明一致；lineage 两侧头注同型非互斥；F-SENSOR-01(registry:291）承袭面=spread 多一行，无冲突。

**F-DEP-01**:
- A/B:package.json:62 字母序（jsdom→postcss→tailwindcss）+lockfile 根条目（package-lock.json:33)+既有传递条目在位（:8286-8290,version 8.5.26+integrity)；「显式化非新增」证据链闭合——npm install「up to date…648 packages」零下载（npm-install raw:4)+lockfile 净 +1 行；运行时依赖 6 个不变。
- C:ci --dry-run EXIT=0(raw:13)+npm ls 直挂 `├── postcss@8.5.26`、vite 链 deduped(raw:4-6)+verify 全链 EXIT=0;check-quality.mjs:15 import 面照常绿。
- D：数字全对；存量告警如实申报（raw:9,21 项与本次无关）。

## 预裁⑤项攻击结论

①单篇边界——代码实证成立（importOne 内包裹，a2 跨篇隔离实证）;②fs 面留事务外——成立，rename 失败后幂等自愈路径推演闭合（deleteByPaper 先行故无重插）;③真 db.transaction+failingInsertRepo 探针——成立（探针包裹真 repo 逐行落库，非 mock 事务层）;④干净环境 npm ci 不真跑——呈报口径如实（报告 §3 末段明示）,ci.yml:33-34 背书在位；⑤postcss 显式化非新增——零下载+单行 diff 为证，成立。**五项预裁无一被推翻。**

## 统计与总评

B=0 / W=1 / N=8。总评 **PASS_WITH_WARNINGS**：两票实现与票面全对齐，机检证据链（首红/变异/verify/locks/dry-run/ls）真退出码齐备；唯一 W 为报告首红指纹归属失实，不影响代码与测试本体，建议主控收口单校正记述后放行（已兑现）；N6 两尾注（[dep-change]+[locked-change]）为收口硬闸必列项。

MODEL-SELF: model-field:5e1abd9d-1f4f-41fb-afa1-ecb5ce76e256/k3$max
FINDINGS: B=0 W=1 N=8 VERDICT=PASS_WITH_WARNINGS
