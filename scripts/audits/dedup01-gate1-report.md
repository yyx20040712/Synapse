# F-DEDUP-01 门一对抗审计报告（ops-gate1-k1，隔离一审）

> 归档注（主控）：岗会话工具面=仅 Read 无写通道，报告由岗全文内联交付，
> 主控逐字归档落盘（batch 9 前例同型）。统计 B=0 W=3 N=8，
> 总评 PASS_WITH_WARNINGS。派发档位=kimi-main k3 max（绑定子代理通道）。

视野声明：全部结论仅引包内材料（dedup01-gate1-diff.patch / 任务书 / 实现者报告 / 六件 raw）。未跑任何命令、未读包外文件。不可裁决处显式标「不确定」。

## A 母本符合度（15/4/2/3 + 排除面恰好性）——闭合

- DomainError 15 文件：`extends DomainError` 恰 14（http-client patch:43；ipc/export_ :91、ipc/lineage :120、ipc/system :214；enrich :328；corpus.export SessionError :365；export.service :426；file-store FileStoreError :470；import.service :529；lineage.service :616；notes :655；reader :690；tags :828；workspace.service :920）+ library.service 删本地定义改 re-export（patch:562-571）= 15，与票面/任务书枚举（services 11+ipc 3+http 1）逐一吻合。
- 原子写 4 助手 6 调用点：file-store {uniqueTmp,cleanOnFail}（patch:491）、ai-sensor {ensureDir:true}（:291-296）、workspace.fs 裸调 ×2（:880/:889）、ipc/settings 裸调 ×2（:176/:185）。
- 清洗 2 处：export.service safeId（:439）、corpus.export safeName（:390），正则逐字符同旧（`/[^a-zA-Z0-9_-]/g`，旧行 :386/:436 vs 新件 :791）。
- app-file URL 3 处：papers.repo（:19）、protocol prefix（:235）、corpus.export 硬编码消灭（:374）。
- 排除面恰好：NotImplementedError/ApiClientError 零 hunk（diff 无 src/shared 既有件、无 renderer 件）；corpus.export manifest 内联未动（:338 保留 `rename, rm, writeFile` import 佐证）；ai-notes-import/safeFileName/db LIKE 零触碰。排除面=预裁面，多删少删均无。

## B 宪法红线——无破

- 分层：papers.repo(db)→shared/app-file-url、protocol→shared、ipc×3→services/shared 均合法。唯一新边 http→services/shared/domain-error 为票面预裁「被依赖下游位」；domain-error.ts 仅 type-import shared/app-error（patch:758），无回边不成环；LINT_EXIT=0（verify.raw:75）实证仓库 ESLint 未拦截。
- 受锁面：diff 28 文件中 tests/** 4 件与 src/shared/app-file-url.ts 全部 `new file mode`，零既有测试/shared 修改 hunk。locks 违规恰 5 条全新件未登记（locks.raw:8-12，LOCKS_EXIT=1 预期形态）。
- 安全禁令零触碰；新件 15~108 行 ≤500；patch 内中文显示正常；被删本地 helper 无残留引用（import 收缩与 lint/typecheck 双绿互证，verify.raw:75/82）。

## C 代码与测试质量——成立

- new.target.name 两形态正确：直构 name='DomainError'、子类=子类名（测试锁死 patch:1082-1094）；HttpFetchError 三参+status 保真（:47-53）；FileStoreError instanceof 链不受 extends 中间层影响；toAppError 按 code 折叠不受类名影响。受锁测试 170 文件/1745 用例全绿（green.raw:4005-4010）。
- atomic-write 三开关正交、四处迁移点逐一行为等价（含 file-store 错误包装留调用侧 patch:488-496、ai-sensor ensureDir=旧 mkdir 幂等）。
- 四新测试均可失败，与变异红证对账：M1「3 failed」恰为 code 三断言（mutations.raw:2-16）；M2「7 failed | 1 passed」:20-22；M3/M4 真退出码=1 且 2 failed（:26-35）。M1/M2 退出码捕获瑕疵（:17/:23 捕获的是 grep 码）不动摇红证据——vitest 摘要行直接成立。预裁 6 攻击不成立。
- 指纹门 183→187/1757→1790/5334→5417/skipSites 15/exemptions 0（verify.raw:18/57-59），纯增 C_after⊇C_before。

## D 报告诚实性——三处失实（见 W1-W3）

## E 接缝——包内无冲突证据

F-LAYER-01/F-SENSOR-01/F-EXPORT-01 票面不在包内，不确定；现有共享件与 ipc/settings 现状兼容。patch 内旧惯例句零残留（reader 「旧惯例废止」patch:672），patch 外不可 grep，声明视野限制。

## 逐条发现

- [W1] 报告 §2 diff 总账自相矛盾且与 patch 实物不符：§2 末行声称「+124/-232 净删 108」（report:92），其自身表格 20 行加总=**+108/-224**（report:64-83，净 -116）。抽查 patch hunk 头实证两文件表值错误：notes.service.ts patch 实际 +5/-12（@@ -11,8 +11,9 +3/-2；@@ -20,20 +21,12 +2/-10，净 -7）vs 表「+6/-11」（report:64）；http-client.ts 实际 +5/-5（+1/-0 与 +4/-5，净 0）vs 表「+6/-4」（report:81）。简报口径 +436/-220 扣除新件 324 增行得修改面 +112/-220——三方互不吻合。违 DoD 计数实测纪律。
- [W2] 报告 §3「还原后四新测试定向复跑 6 文件/40 用例全绿」（report:115）在六件 raw 中无对应日志——mutations.raw 止于 M4_RESTORE_DIFF_EMPTY（:36）无复跑段；且口径不符：四新件=4 文件/26 用例（6+8+9+3，verify.raw:26-56 指纹门明细互证），「6 文件/40 用例」无从对账。缓解：若时序=变异→还原→verify（09:39 TEST_EXIT=0 全量绿，verify.raw:4092），则 verify 本身即复绿实证，但报告未述时序，该具体数字属无证申报。
- [W3] 报告 §6.3 自称注释改写「完整清单」（report:161-175）漏列 ≥6 文件的注释改动：http-client.ts（patch:41-42 新增类文档注）、corpus.export.service.ts（:363-364、:383-384）、export.service.ts（:424-426、:437-438）、import.service.ts（:518）、ipc/system.ts（:213）、workspace.service.ts（:919）；§2 表相应行亦未提注释面。零行为变更，但「完整清单」不成立，违自裁申报「一切票面外决定」口径。
- [N1] M1/M2 退出码捕获形式瑕疵如实呈报且红证据成立（mutations.raw:8-16/20-22）；M1 下「非法码回落 INTERNAL」用例恒绿（code 缺失亦回落），对 code 删除无侦测力——由其余 3 例覆盖，非恒真断言缺陷。
- [N2] new.target.name 引入压缩敏感性：旧码硬编码 name 免疫构建压缩，新码依赖运行时类名；electron-vite main 包 minify/keepNames 配置不在包内，**不确定**。包内消费面（toAppError）按 code 不按 name，无包内证据显示生产漂移后果。建议主控收口时一句话确认主进程构建不改类名。
- [N3] 报告 §2「atomicWriteFile 调用点恰 4」（report:87）措辞不准：实为 4 文件 6 调用点（settings/workspace.fs 各 2）。
- [N4] registry 票面写「corpus.export.service.ts:239 硬编码」，实际迁移点=旧 :250（任务书:41 与 patch:369-377 一致）——票面 prose 行号漂移，无害。
- [N5] 首红证据精确：恰 4 新件 load 失败、166/1719 基线零偏差（firstraw:3989-4020，FIRSTRED_EXIT=1）；verify 七关真退出码全 0（verify.raw:11/59/68/75/82/4092/4127）；build 绿（build.raw:35）。
- [N6] 指纹门 log 含 7 条 F-SESS-01/F-AIN-01 NEW 案（verify.raw:19-25）系前票未基线化面（断言/行数漂移形态），与本票 +33 对账不冲突；豁免零条目。
- [N7] quality 两组 warn（verify.raw:7-8）为既有面，「新增 0 组」（:9）非本票产物。
- [N8] 并发双写 allSettled 自裁合理：uniqueTmp 保证 tmp 独立，rename 同目标 last-wins，测试锁「至少一成+终名完整一方+tmp 零残留」（patch:1021-1040），未发明生产没有的契约；Windows EPERM 竞态规避成立。

## 统计与总评

B=0，W=3，N=8。实现本体四收敛面+微扩全部闭合、排除面恰好、分层/受锁/安全红线零破、红证链（首红+变异 4 条+还原标记+全量绿+verify 真退出码）成立；三处 W 全在报告层（计数失实、无证申报、申报清单漏项），不动代码。总评：**PASS_WITH_WARNINGS**——放行收口，但要求主控责令实现者更正 §2 计数表/总账、补述复绿时序或撤回 6/40 数字、补全注释改写清单后再归档。

最重三条：W1（diff 统计三方矛盾、两文件实证不符，DoD 计数纪律违）；W2（「6 文件/40 用例复绿」无 raw 佐证且口径不符）；W3（注释改写「完整清单」漏 6 文件）。

MODEL-SELF: model-field:b2466f8b-9d89-4428-a38e-c2aca1c41d0e/k3$max
FINDINGS: B=0 W=3 N=8 VERDICT=PASS_WITH_WARNINGS
