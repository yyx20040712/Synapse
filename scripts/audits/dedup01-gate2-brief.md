# F-DEDUP-01 门二终审简报（实证二审）

## 铁律

你是门二终审岗（异构二审）：逐条裁决+独立复算+核对终态实物；禁只审不跑——
你无 shell，机器面以主控与实现者落盘的 raw 日志为实证材料，对数字做独立复算
（重算/对账/抽查源文件），不得以「报告说绿」替代「日志绿」。预设立场禁。

## 背景（一屏）

F-DEDUP-01（服务层去重微扩，[locked-change] 常规三屋票）四收敛面：DomainError
基类 15 文件单源/原子写 4 文件单源/清洗 2 处单源/app-file URL 3 处单源（含
corpus.export.service 硬编码消灭）。票面=tickets/registry.ts F-DEDUP-01 行
（file 锚=src/main/services/library.service.ts）。实现者报告（回炉 1 后）=
scripts/audits/dedup01-impl.report.md。

## 门一审结果（你要核对处置 vs 终态）

门一=ops-gate1-k1（Kimi k3 max，PASS_WITH_WARNINGS，B=0 W=3 N=8，报告=
scripts/audits/dedup01-gate1-report.md）。三 W 处置（回炉 1，仅报告+证据面）：
- W1 计数失实→numstat 逐行重算：修改面 +112/-220 净 -108/新件 +324/全票 28
  文件 +436/-220（报告 §2+§8）；
- W2 复绿无证→定向复跑 4 文件/26 用例 passed RESTORE_RERUN_EXIT=0（mutations
  raw 尾段「回炉1-W2」节）；
- W3 清单漏项→按 patch 注释 hunk 全集重列 18/20 文件（§6.3+§8）。
你须逐项核终态实物（报告/raw/patch 三方），处置不实即 P1 起。

## 四清单+一

①**处置核对**：门一 B/W/N 全 11 条 findings+主控处置 vs 终态——W1/W2/W3 见上；
N2（new.target.name 压缩敏感性）主控已实证闭环：out/main/index.js 产物
`class FileStoreError extends DomainError` 等类名逐字存活+`.name = new.target.name`
在（你可 Grep 产物复核）；N1/N3~N8 记录级（N4=票面 prose 行号漂移无害；N6=前票
NEW 案非本票产物）。
②**母本符合度**：票面四收敛面+微扩 vs 终态 diff（dedup01-gate1-diff.patch，
28 文件）；排除面恰好性（NotImplementedError/ApiClientError/manifest 内联/
ai-notes-import/safeFileName/db LIKE 零触碰）。
③**宪法红线终审**：分层单向（ipc→services/db→shared/http→services/shared/
protocol→shared 合法性；http 新边=票面预裁）；受锁面（既有 tests/src/shared
既有件零修改 hunk——你可对 git 工作区 Grep 抽查；locks 预期红恰 5 新件）；安全
禁令；≤500 行；UTF-8；TDD 证据链四档（首红全量/变异 4 条还原/复绿/verify 真退出码）。
④**机器面核对**：verify 七关 raw（dedup01-impl-verify.raw.txt/build.raw.txt）
数理一致；指纹门 183→187/1757→1790/5334→5417 纯增对账（+33=26 新用例+7 each
展开行）；e2e 默认门 43/43 EXIT=0（dedup01-e2e-appgate.raw.txt，主控跑，含
corpus-export+workspaces 双被触面）；**收口预演不红推演**：主控收口将执行
locks:generate+apply（5 新件入册 333→338）→verify 全链终跑→registry F-DEDUP-01
open→done（open 10→9）→INV-66（原子写单源）+INV-67（AI 笔记回灌事务性——batch 7
门二 P2-5 遗留窗口本票闭合）入册 docs/invariants.md [locked-change]→单提交。
你对这个推演做「翻 done 不红/锁同步/INV 登记必要性」三问复核，有异议即列条。
⑤**成本账本行**（主控汇出，你复核口径）：实现者 ops-executor（GLM5.3flash
$max）两轮=10,252,075+2,479,542 subagent tokens/131+14 工具调用/1354s+196s；
门一 ops-gate1-k1（kimi-main k3 max）=856,709 tokens/19 调用/881s；门二=你
（自报 MODEL-SELF 行）。

## 输入件（全部可 Read）

- diff 包：scripts/audits/dedup01-gate1-diff.patch（28 文件）
- 任务书/实现者报告/门一报告：dedup01-impl-brief.md / dedup01-impl.report.md /
  dedup01-gate1-report.md
- 证据：dedup01-impl-{firstraw;green;verify;build;mutations;locks}.raw.txt +
  dedup01-e2e-appgate.raw.txt
- 终态实物（可 Grep/Read 工作区）：src/main/services/shared/ 三件、
  src/shared/app-file-url.ts、四新测试、out/main/index.js、docs/invariants.md、
  tickets/registry.ts

## 输出

逐条 [P0|P1|P2]（P0=阻断/P1=须处置后放行/P2=记录级）+独立复算结果+统计+总评
（GO / GO_WITH_CONDITIONS / NO-GO）。全文落 scripts/audits/dedup01-gate2-report.md
（唯一可写件），回复精简：统计+总评+最重三条。
