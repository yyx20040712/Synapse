# F-D4 实现报告 —— import 会话身份两合一（main 侧 import gate 互斥 + ImportProgressEvent sessionId）

> 单号 F-D4（四波场首票）。票面=scripts/audits/f-d4-brief.md。病根母本=AUDIT-C
> §1.2-b+§五-2（audit-c-scan.md）。实现者子代理，2026-09-02。

## 〇、开工记录（技能清点——AGENTS 会话开工纪律）

**用**：
- test-driven-development —— 本票核心纪律（首红→实现→绿→断言级变异红证≥2），全程按此执行。
- verification-before-completion —— 收口前 `npm run verify` 真退出码亲验落盘（exit=0）。

**条件用（未触发）**：
- systematic-debugging —— 首红全为预期新用例红（无意外失败），无需调试装载。

**不用+理由**：
- code-review-excellence —— 三屋模式门一/门二独立对抗审查在位，实现者不自审替代。
- javascript-testing-patterns —— 票面已指定桩形态先例（corpus-export.test.tsx），加载无增量价值。
- frontend-ui-engineering / browser-testing / web UI 测试类 —— 无 UI 视觉面改动；组件测试走 vitest+jsdom，全程无可见浏览器（满足全局前台焦点保护纪律）。
- git 工作流类 —— 票面禁 git add/commit/push（git 仅只读自查 diff）。
- 其余工程技能（deployment/dbt/airflow/kubernetes 等）—— 与本票无关。

**配置自查**：派发指定档位=GLM5.3flash 实现位；本会话由主控派发承载（环境模型非本代理可切换项，如实申报——与派发指令「本环境派发承载如实申报」一致）。

**环境事实（会话级自裁，见 §七-7）**：本 Git Bash 会话 PATH 无 Volta shim（裸 PATH 解析 D:\nodejs=node 25.2.1，quality 守卫会红）。已用会话级 `PATH="/c/Program Files/Volta:$PATH"` 前缀注入全部 npm scripts——Volta 项目 pin 生效，node=v24.20.0。基线先验证：f-d4-quality-baseline.raw.txt exit=0。未改仓库任何配置文件。

## 一、实现摘要

**A 面（main 侧 import gate 互斥，INV-52①）**：
- `bootstrap.ts` 顶层（容器 assemble 闭包之外）创建 `importGate` 闭包计数器
  （`enter/exit` 对 `importInFlightCount` ++/--）——每层 service 重建但 gate 同一对象。
- `import.service.ts`：deps 增 `gate: { enter(): void; exit(): void }`（必选）；
  `importFiles`/`importFolder` 每次调用入口 `gate.enter()`，**finally** `gate.exit()`
  （尽力而为路径/域错误抛出路径都必经 finally）。
- `workspace.service.ts`：deps 增 `importInFlight: () => boolean`（必选）；
  create/rename/switch 三入口在 busy 检查旁检查，in-flight 时抛
  `WorkspaceDomainError('CONFLICT', '导入进行中，请稍后再试')`——**先于**
  closeCurrent/materializeLegacy（拒时零库副作用）。头注状态机表增「import in-flight」
  行+跨格序列⑥（含语义边界：main 侧计数单源、renderer busy 不参与、拒绝=稍后重试）。
- `services/index.ts`：`ServiceDeps` 增 `importGate`（必选，接线传 import.service）；
  bootstrap 两处注入（`createServices({ importGate, ... })` 与
  `createWorkspaceService({ importInFlight: () => importInFlightCount > 0, ... })`）。
- 两服务互不 import（duck typing 最小接口），gate 禁入 shared——票面 §三 零违。

**B 面（ImportProgressEvent sessionId，INV-52②）**：
- `schemas.ts`：`importProgressEventSchema` 增 `sessionId: z.string().min(1)`
  （先例=exportProgressEventSchema）。类型变更=[locked-change] 流程（已走
  unlock→改→apply）。
- `import.service.ts`：每次调用入口 `randomUUID()` 生成一次会话 id；内部 `report`
  收窄为四字段 core（`Omit<ImportProgressEvent,'sessionId'>`），组装完整事件后经
  onProgress 发出——该次调用内全部进度事件（含 scanning/done）同 id。
- `ImportDropZone.tsx`：订阅回调三滤（照 corpus-export.store.ts:87-94 范式）——
  ①busyRef=false 忽略（终局后迟到事件不写 state；busyRef 镜像解决订阅回调读旧
  闭包问题，state 与 ref 双写）；②sessionRef（`useRef<string|null>`）首事件锚定
  会话身份，异身份忽略；③`runImport` 入口重置 sessionRef=null。残余窗声明
  （新会话 start 后首事件前，理论窗）照 corpus 注释同口径写入头注。
- 渲染层拒绝可见面零补丁：WorkspaceSwitcher 既有 catch→toast（ApiClientError.message）
  ——CONFLICT 中文直达，票面 §〇 预判兑现。

## 二、文件清单

改（7）+新（1），全部 ≤500 行（eslint max-lines 含 skipBlankLines/skipComments）：

| 文件 | 行数 | 变更 |
| --- | --- | --- |
| src/shared/ipc/schemas.ts（受锁） | 435 | importProgressEventSchema 增 sessionId |
| src/main/services/import_/import.service.ts | 315 | gate enter/finally exit+sessionId 生成/report 收窄 core+头注 |
| src/main/services/workspaces/workspace.service.ts | 217 | deps 增 importInFlight+三入口 CONFLICT+头注（状态机行+序列⑥） |
| src/main/services/index.ts | 152 | ServiceDeps 增 importGate（必选）+接线 |
| src/main/bootstrap.ts | 261 | gate 顶层创建+两处注入 |
| src/renderer/features/library/ImportDropZone.tsx | 166 | 订阅回调三滤+busyRef/sessionRef+头注残余窗 |
| tests/unit/services/import.service.test.ts（受锁） | 264 | 6 处既有构造补 noopGate+新 describe 3 用例 |
| tests/unit/services/workspace.test.ts（受锁） | 472 | 6 处既有构造补 importInFlight+新用例 1 |
| tests/unit/renderer/import-dropzone.test.tsx（**新**，入锁） | 161 | always-active 4 用例 |

docs/invariants.md（受锁）：登记 INV-52 一行（格式照 INV-50/51）。

## 三、TDD 首红（f-d4-red.raw.txt，exit=1）

全量套 `npm run test`（vitest run 全量，node24 口径）：**5 failed | 1096 passed (1101)**，
3 个测试文件红——全部为本票新用例，按预期失败。

首红日志实为 **6 条 FAIL 条目**（回炉 W2 补报，主控亲查定性）：
[1/6]=**文件级**条目 `FAIL tests/unit/services/workspace.test.ts`（Failed Suites 1）——
afterAll 清理临时目录报 `EBUSY: resource busy or locked, unlink
...\synapse-ws-d4-JuN9BJ\workspaces\default\synapse.db-shm`，=Windows 文件锁族清理噪声
（红跑失败路径=三入口互斥未实现、create/switch 副作用全跑，db 句柄 close 后 OS 锁
延迟释放与 afterAll rm 竞态；文件级条目**不计入 Tests 计数**）；[2/6]~[6/6]=下列
5 条用例红，与申报五条精确一致。绿跑零此噪声（实现后拒在 closeCurrent 之前，无
第二句柄产生，exit=0 即证）。5 条用例红明细：

1. import.service「进度事件全程同 sessionId，两次调用不同」——旧事件无 sessionId（非空字符串断言红）
2. import.service「gate enter/exit 各恰一次，failed 折叠路径也 exit」——enter 未被调用（计数 0≠1）
3. import.service「域错误抛出路径也必经 finally」——exit 计数 0≠1
4. workspace「import in-flight 时 switch/create/rename 抛中文 CONFLICT 且零库副作用」——无 CONFLICT 抛出
5. dropzone「busy 中异 sessionId 事件→文案不变」——旧会话污染未被滤

（dropzone 其余 3 用例首跑即绿，预期内——其中用例③的锚定价值按 §七-5 回炉后口径
=锁「runImport 重置 sessionRef」面；红的要求是「新用例先红」而非逐条红，5 条核心
行为用例全数红。）

## 四、绿证+测试证据

- **f-d4-green.raw.txt exit=0**：127 文件 / 1101 用例全绿（基线 126 文件/1093 用例；
  +1 文件=import-dropzone.test.tsx，+8 用例=import.service 3+workspace 1+dropzone 4——
  脚本实测计数，非印象）。
- **f-d4-verify.raw.txt exit=0**：`npm run verify` 全链（quality「无占位标记/无乱码/
  无跨域引用」→tickets「注册表与代码一致」→locks「236 个受锁文件与 manifest 一致」
  →lint→typecheck→test 127/1101→build built）。CI 同口径。

## 五、断言级变异红证（≥2，文件备份法——cp 备份→变异→测→cp 还原→diff 确认空）

- **M1（f-d4-mutation-m1.raw.txt exit=1）**：import.service.ts 把 `gate.exit()` 挪出
  finally（只在成功 return 路径调用，throw 路径跳过）→ 1 failed=「域错误抛出路径也必经
  finally」（exits +0≠1）红证成立。还原 diff 空（M1-restore-diff-empty）。
- **M2（f-d4-mutation-m2.raw.txt exit=1）**：ImportDropZone.tsx 删异身份过滤
  （busy 门后无条件 setProgress）→ 1 failed=「busy 中异 sessionId 事件→文案不变」
  （旧会话文案污染断言红）红证成立。还原 diff 空（M2-restore-diff-empty）。
- 变异备份已清理（scripts/audits/f-d4-mut-backup-* 已删）。

## 六、locks 实录

1. `npm run locks:unlock`：解锁 235 个（=基线 locks 235）。
2. 改动受锁面：schemas.ts / 两个测试文件 / invariants.md（verify 运行期间零受锁面改动——
   全部改动先完成再锁）。
3. `npm run locks:generate`（新路径 tests/unit/renderer/import-dropzone.test.tsx 入
   manifest）→ `npm run locks:apply`：**已锁定 236 个文件（只读），manifest 236 条**
   （f-d4-locks-generate.raw.txt / f-d4-locks-apply.raw.txt 均 exit=0；manifest 含新
   测试文件已脚本核验 true）。
4. verify 内 locks:check 通过（236 一致）。提交时需 [locked-change] 尾注（主控收口单职责）。

## 七、自裁申报（超票面决定+删减面 diff 自查）

1. **workspace.test.ts 构造点计数**：票面 §四.2 说「既有三处 createWorkspaceService
   构造加 importInFlight」——实测文件内 **6 处**构造点（l0Session helper+5 处直构：
   指针缺省/L0 会话/rename/switch/busy 用例）。importInFlight 为必选 deps（票面 §二），
   typecheck 关卡要求全部补齐；l0Session 扩为可选参数 `opts?.importInFlight ?? (() => false)`
   （新用例经 opts 注入 true）。票面计数与实际不符，按必选 deps 语义全数补齐。
2. **import.service.test.ts 既有构造补 gate**：票面 §四.1 只列新用例，但 gate 为必选
   deps（§二），既有 6 处 createImportService 构造全部补 `gate: noopGate` 桩（模块级
   共享常量，Rule of Three——9 处使用）。
3. **新增第 3 个 import.service 用例（域错误路径 finally）**：票面 §四.1 列 2 用例，
   但 §一A 行为层明文「尽力而为路径/**域错误抛出路径**都必经 finally」——无此用例则
   M1 变异（exit 挪出 finally 后成功路径仍 exit）在 failed 折叠用例上不红、finally
   契约不可证伪。属票面行为层要求的锚定，非新增行为。
4. **dropzone 测试含第 4 用例（订阅/退订成对，INV-14 消费方级）**：票面 §四.3 列 3
   用例；本票恰好改动了订阅回调本体，加锚防重构丢退订。超票面增量申报。
5. **dropzone 用例③锚定面如实改报（回炉 W1，门一 Kimi 裁决路线 a/主控采纳）**：
   filter①（busy=false 时 state 不写）在组件级**不可证伪**——runImport 入口无条件
   重置 sessionRef，变异「删 busy 门但保留锚定」下用例③恒绿。filter① 的实际性质=
   渲染门之外的**内部质量门，无机器锚**（INV-49「部分锚定」口径同族——实现行为
   在场、组件级断言锁不住）。用例③深断言（idle 事件后本会话 live2 首事件照常
   更新）真实锁定的是「**runImport 重置 sessionRef**」面——变异「删重置」时 idle
   锚定污染后续会话→live2 被异身份滤→红（红证机制为门一裁决定性推演，本单未另跑
   该变异；禁为锚而锚再动受锁面，故未补跑）。
6. **删减面 diff 自查（回炉 W3 重报——最终态口径）**：自裁时申报的「9 文件
   +243/-37」是早于 locks/manifest 落定与新测试文件入 diff 的旧口径。**主控 add -N
   后最终态亲查=F-D4 面 11 files changed, +413/-42**；本回复实测 numstat 精确对账
   吻合：invariants +1/0＋manifest +9/-5＋bootstrap +19/-1＋import.service +60/-29＋
   services.index +5/0＋workspace.service +17/0＋ImportDropZone +24/-3＋schemas
   +5/-2＋import.service.test +92/-1＋workspace.test +20/-1＋新测试文件 +161/0
   =11 文件 +413/-42。最终态删减面复核：我名下文件删行全量核对=import.service.ts
   旧 report/importOne/runBatch/两入口体（重构为含 sessionId/gate 形态，语义超集）、
   ImportDropZone 旧订阅回调（重构为三滤版）、schemas.ts 旧注释行+`fileName` 字段行
   （同块被含 sessionId 版替换）、受锁测试文件仅 2 行（vitest import 扩容+l0Session
   签名扩参）——**「删减面零断言/检查/守卫删减」结论在最终态下复核仍成立**；新测试
   文件纯新增（+161/-0）；manifest 为锁工具机械再生非人工编辑。范围划界注：本回炉
   落笔时工作树另含 4 个**并行工单**文件（ReaderPage.tsx +4/-2、reader.store.ts
   +19/-6、reader.store.test.ts +43/-2、reader-store-undo-race.test.ts +2/-2，合计
   +68/-12——reader 域非 F-D4 面），不在本单 diff 自查范围，其删行不得计入本票。
7. **会话环境自裁**：派发说「volta 已锁 node24 直接 npm run verify」，但本 Git Bash
   PATH 无 Volta shim（node 25 会触发 quality 版本守卫红）——会话级 PATH 前缀注入
   `C:\Program Files\Volta`（node 24.20.0）跑全部命令。未改仓库配置。

## 八、疑虑（移交门一/门二）

1. ImportProgressEvent 增字段对 preload 契约测试零影响（preload-surface.test 载荷
   透传不校验 schema，已核）；仓库内 sessionId 消费面全量清点=api-surface 类型/
   services.index 类型/import.service 产出/ImportDropZone 消费/测试桩——无第五处。
   e2e 零改（票面 §四.4）已核对：e2e 无 import 进度面。
2. 终局后 sessionRef 保留旧值至下次 runImport 重置——设计如此（busy 门已挡一切
   消费），与 corpus-export 范式同构，无行动项。
3. workspace.test.ts 472 行：eslint max-lines 对 tests/** 关闭（override 在档），
   不构成违规；若后续再加用例接近 500 物理行可考虑拆文件（非本票义务）。
4. 派发模板要求的「token/时长成本账本」按 2026-09-02 主控口径由主控侧记录（本代理
   无自计量工具面）；可核时间锚=测试日志 Start at 20:23:29（首红）/20:25:36（绿）。

## 证据文件（scripts/audits/）

f-d4-quality-baseline.raw.txt（基线 quality，exit=0）/ f-d4-red.raw.txt（首红 exit=1）/
f-d4-green.raw.txt（绿 exit=0）/ f-d4-mutation-m1.raw.txt（M1 红 exit=1）/
f-d4-mutation-m2.raw.txt（M2 红 exit=1）/ f-d4-locks-generate.raw.txt /
f-d4-locks-apply.raw.txt / f-d4-verify.raw.txt（verify exit=0）。

## 九、回炉 1 处置记录（门一 Kimi 裁决 B:0/W:3/N:2——轻量回炉，纯报告面）

- 回炉点 W1（filter① 组件级不可证伪）→ 处置：§七-5 改报——filter①=渲染门之外的
  内部质量门、无机器锚（INV-49「部分锚定」同族口径）；用例③价值重述=锁「runImport
  重置 sessionRef」面；未为锚再动受锁面 → 文件：scripts/audits/f-d4-impl.report.md（§七-5）。
- 回炉点 W2（首红 [1/6] 文件级条目漏报）→ 处置：§三 补报——EBUSY afterAll 清理噪声
  （Windows 文件锁族，红跑失败路径句柄未及释放；文件级条目不计入 Tests 计数），
  [2/6]~[6/6] 与申报五条精确一致 → 文件：同上（§三）。
- 回炉点 W3（--stat 旧口径）→ 处置：§七-6 重报——主控 add -N 亲查最终态=11 files
  +413/-42（numstat 实测对账吻合：+161 新测试/+9-5 manifest 归位）；「删减面零断言
  删减」结论最终态复核仍成立；并行工单 4 文件（+68/-12）明确划界非本票 → 文件：同上（§七-6）。

本回炉仅改本报告一文件；代码/测试/受锁面（含 invariants INV-52 行）零改动。
