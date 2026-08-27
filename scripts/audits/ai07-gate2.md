# SR2-AI-07 门二终审（gate2）

日期：2026-08-27　审查者：门二终审子代理（独立于实现者与门一）
输入：票面头注 / ADR-0015 / ai07-diff.patch / ai07-impl.report.md / ai07-gate1.md / 四份证据日志 / locks/manifest.json / tickets/registry.ts

## 开工技能清点
用：code-review-excellence（终审审查本体）、verification-before-completion（证据链逐项对日志与实物核验）。
不用：test-driven-development（本单不写实现）、systematic-debugging（无卡点）、git-workflow 类（铁律禁改动性 git 命令，仅只读 status/grep）、e2e/browser 类（本单无 e2e 面）。

## ① 处置核对（门一 findings + 主控裁决 vs 终态实物）

- 门一结论 0B/2W：W-空数组产物无显式测试、W-rm force+rename 非原子窗口。主控裁决「不回炉、两 W 记挂账」。
  → 实物核对：`git status --short` 工作树改动面=diff.patch 的 10 改+2 新（代码面）+3 审计档+dist_new/（实现者 D8 已申报的非本单残留），**无一门一之后的新改动**——即无「为消 W 而补丁」的画蛇添足，也无「说了没改」（裁决本就不要求改）。[PASS]
- 门一 A1-A10/D1-D8 逐条抽验实物：八字段映射（service.ts:116-143）、幂等三路径（:146-201）、export_.ts 仅删两委托行（diff L81-84）、ai_sensor.ts 四通道薄分发（19 行）、ipc-deps.ts 仅 +1 桩行（diff L499）、ai_notes.repo.ts 头注声明行修订（diff L63-69）——与门一记录一致，无「没说的被改」。[PASS]

## ② 母本符合度（票面五层 vs ADR-0015 §1/§2）

- **§1 产物行八字段** [PASS]：ProductRow 八键 snake_case 文件面 → parseRows 逐一映射 camelCase zod 面 + annotationId 固定 null（service.ts:122-133），与 ADR §1 行格式逐字段一致；测试 fileRow 夹具同八键。
- **§2 幂等条款**（「已导入篇按内容 sha 去重跳过」）[PASS]：archive 账本实现——同 sha→skipped 且源归档（service.ts:162-167）；异 sha→deleteByPaper 清面整套重插（:188-189）；无 archive→首导。三路径各有独立测试且「不重复」以 countByPaper 断言。
- **§2 archive 移动** [PASS]：成功/skip 均 rename 至 archive/（:165/:192）；失败篇留 corpus-ai（可重试，自裁 3 合理且与 ADR 不悖——ADR 只规定导入后移档，失败篇未导入）。
- **§2 写入只经应用 IPC（D3）** [PASS]：service 全部 DB 写经 ai_notes.repo（insert/deleteByPaper），无 SQL、无工具写面；通道=ai-notes/import + ai-notes/list（api-surface.ts 四通道），api-surface/schemas 属受锁面且走了 unlock→generate→apply（见③）。
- 协议根=ADR §1 `userData/ai-sensor`：装配与 ai-sensor.service 共用 deps.aiSensorRootDir（services/index.ts diff L406/408）[PASS]。
- 结论：票面五层逐条落地，无母本偏离项。

## ③ 宪法红线终审

- **分层单向** [PASS]：ipc/ai_sensor.ts 薄分发→services→repos；service 零 SQL、零 renderer/preload 触碰（diff 无此三面文件）。
- **受锁流程** [PASS]：报告实录 unlock(112)→改 shared/ipc×2+contracts+ipc-deps→generate(113)→apply→二次 unlock（ipc-deps 补桩）→apply→终局 verify 内 locks:check「113 个受锁文件与 manifest 一致」。实物：manifest `"path"` 计数=113，新测试文件已纳入（manifest L333）；五处受锁文件 sha 在 diff 中成对更新（api-surface/schemas/contracts/ipc-deps/manifest）。
- **安全禁令** [PASS]：diff 无 nodeIntegration/webSecurity/eval/new Function/SQL 拼接/openExternal/新 host；fs 面仅协议根（corpus-ai 读+archive 移）。
- **行数** [PASS]：service 226 / ipc 19 / test 193，wc -l 实测，全部 ≤500。
- **UTF-8** [PASS]：service 头注/错误文案/测试用例名中文全部可读（本次读取实证）；quality:check（含乱码关卡）过。
- **TDD 四档证据链** [PASS]：
  1. 红：ai07-red.log 10 failed（构造级：工厂未导出）+ **exit=1**（日志尾行实证）。
  2. 绿：ai07-green.log **74 文件 462 用例全过 + exit=0**。
  3. 断言级变异红证：ai07-mutation.log 单 token `===`→`!==`（账本 sha 比较）→ 7 passed **3 failed** + exit=1，恰中断言级目标（同 sha 跳过/异 sha 重灌/三桶并存）——非恒真；还原用 cp 备份法（宪法变异条款合规）。
  4. 终局：ai07-verify.log quality/tickets/locks/lint/typecheck/test/build 全过，末行 **exit=0**。
  四档时序戳 09:08→09:09→09:10→09:12 自洽。

## ④ 机器面核对

- **74/462 数理一致** [PASS]：基线 73 文件 452 用例 + 新增 1 文件（ai-notes-import.test.ts，it( 计数=10）= 74/462；green.log 与 verify.log 双证同数。
- **locks 112→113** [PASS]：仅新增 tests/unit/services/ai-notes-import.test.ts 一条（manifest 计数 113 实证），sha 506be8aa… 已登记；无其他路径增减。
- **registry 翻 done 预演** [PASS]：SR2-AI-07 当前 status:'open'（registry L180，主控收口时翻）。verify 时 tickets:check 以 open 4 过——check-tickets 校验「注册表与代码一致」而非状态值本身，open→done 翻状态不引入新不一致（实现已在代码面落地），预演不红。
- **e2e 面申明** [PASS]：diff 无 tests/e2e/ 面；纯 main 侧单测+契约面，无需 e2e 跑（宪法「受锁 e2e spec 改动后必须全量 verify」条款未被触发——无 e2e spec 改动）。
- 工作树自查 [PASS]：改动面与 diff.patch 完全一致；dist_new/ 未跟踪残留为非本单（实现者 D8 申报）——提请主控收口 staging 显式列文件。

## ⑤ 成本账本行（门二自估，其余留主控）

- 门二终审子代理：约 55k token（读票面/ADR/diff/门一/四日志/manifest/registry+落档），约 25 分钟。
- 实现者/门一/主控各格留主控按交接书填。

## 总评

**PASS**。理由：①门一 0B/2W 处置与主控「不回炉记挂账」裁决和终态实物零偏差；②票面五层 vs ADR-0015 §1/§2 逐节符合（八字段/sha 幂等/archive 移动/写入只经 IPC 四主条款全过）；③宪法红线零触碰（分层/受锁 113/安全禁令/行数/UTF-8），TDD 四档证据链完整且每档含真退出码；④机器面 74/462、locks 112→113、registry 预演全部数理自洽。两 W（空数组产物无显式测试；rm+rename 非原子窗口）维持挂账移交主控记档。
