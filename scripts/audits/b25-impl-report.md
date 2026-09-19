# F-SENSOR-01 实现报告（b25 批）

档位声明：绑定 ops-executor（GLM5.3flash $max）——与派发指令一致，无静默继承。

## 0. 开工技能清点（宪法义务）

- test-driven-development —— 用（等价形态）：简报④裁定零行为重构无新用例，TDD 等价=基线锚（b25-verify-baseline.log）+两枚变异红证（M1/M2），先红后绿义务由变异对承担。
- verification-before-completion —— 用：七关卡+定向回归+终跑 verify 全部亲跑、尾行变量法 EXIT 物理在档。
- systematic-debugging —— 不用（未触发）：七关卡/回归一次全绿，无排障面。
- 其余工程技能（e2e/CI/部署/设计面）—— 不用：票面为 main 侧装配面纯重构，e2e 归主控收口门（简报④.6）。
- 探针纪律执行情况：本票零新增自产 .mjs 工具件（七关卡/变异/回归全用现有 npm 脚本+npx tsc+diff），locks:generate 义务未触发；shell 内零多行 node -e（仅一条纯 ASCII 单行读 package.json scripts）。

## 1. 交付清单（改写面逐行）

恰三件（简报 A/B/C；D 件 registry 零触碰）。git diff --stat 实测：3 files changed, 26 insertions(+), 23 deletions(-)。

### A. src/main/services/index.ts（153→152 行；+18/−19）

1. ServiceBundle 接口 :84 错位注释「AI-06/07：ai_sensor 域服务交并（2026-08-27 用户裁决——自 export_ 并域迁出）」——**删除**（简报 A.3 授权「删除或改写」两落法取删除：新三键注释块已在新位置承接 ADR-0017 指针，原句保留会二次错位）。export_ 交并行保持不动（F-EXPORT-01 承接面）。
2. :86 交并行 `ai_sensor: AiSensorService & AiNotesImportService & ZcodeLinkService` → 三行平铺（`ai_sensor`/`ai_notes_import`/`zcode_link` 各对齐一服务件类型）+简报 A.1 原文两行注释（F-SENSOR-01 拆交并+ADR-0017 保持句）。
3. createServices 函数体首行新增局部量 `const aiSensor = createAiSensorService({ rootDir: deps.aiSensorRootDir })`（简报 A.2 构造序显式化）。
4. :117-133 IIFE+三 spread 拼盘 → 三键平铺构造（与 library/reader 同型）：`ai_sensor: aiSensor`；`ai_notes_import: createAiNotesImportService({...})` 五注入行原样平铺（F-AIN-01 事务注释随行）；`zcode_link: createZcodeLinkService({...})` 三注入行——`readStatus: aiSensor.readStatus` **方法引用直传**（箭头闭包 `() => aiSensor.readStatus()` 消解；简报原文注释「06 单源消费（running 不双写）——F-SENSOR-01 显式注入」随行）。

### B. src/main/ipc/ai_sensor.ts（23→25 行；+6/−4，净+2=头注两行）

1. 头注第一段补两句：「F-SENSOR-01 三键平铺：服务桶按 ai_sensor/ai_notes_import/zcode_link 三键取用（键名与服务件一一对齐；域装配文件与 IPC 域不动）」（简报 B 授权的一句说明，两物理行）。
2. `importAll` handler → `deps.services.ai_notes_import.importAll()`；`listByPaper` handler → `deps.services.ai_notes_import.listByPaper(req.paperId)`。
3. `zcodeDetect`/`zcodeInstall` handler → `deps.services.zcode_link.*`（AI-10 注释行原位保持）。
4. `requestAiRead`/`aiStatus`/`observe` 三 handler 保持 `deps.services.ai_sensor.*` 键（零改）——七 handler 全数对号。

### C. tests/utils/ipc-deps.ts（49→51 行；+2）[locked-change][test-refactor]

1. :29 `ai_sensor: null as never,` 单行 → 三行（`ai_sensor`/`ai_notes_import`/`zcode_link` 各 `null as never,`）。
2. 锁操作序（简报 C 强制）：`npm run locks:unlock`（375 件解锁，UNLOCK_EXIT=0）→ Edit → **即时** `npm run locks:apply`（375 件重锁+manifest 375 条，APPLY_EXIT=0）。
3. manifest diff 实测恰三项：generatedAt 时间戳刷新＋`scripts/audits/b25-claim.mjs` 登记（主控认领探针，非本岗产物）＋ipc-deps.ts sha256 更新——全在简报④.2 预期内。

## 2. 计数实测（全部 wc/grep/g物理输出，禁印象）

- 行数：index.ts=152 / ipc/ai_sensor.ts=25 / ipc-deps.ts=51（wc -l）。
- 消费面复核（主控断言独立复算）：`services.ai_sensor|services.ai_notes_import|services.zcode_link` 全仓 grep 恰 7 行=ipc/ai_sensor.ts:14-21 七 handler，无其他消费者；tests/ 零 `ai_sensor:` 桶键覆盖（唯一命中=ipc-deps.ts:29 桩行）；tests/contracts/api-surface.test.ts:47 的 `ai_sensor:` 系 IPC 域层 ApiHandlers（域键不动）非 ServiceBundle——零影响。
- 测试指纹：基线=改毕七关卡=终跑 **170 文件/1744 用例** 三点恒等（零行为重构预期态）。
- 定向回归：3 文件/37 用例全绿。
- 头注陈旧句扫描（简报①「若发现，逐句摘录」义务）：三服务件头注逐行读毕——**零陈旧装配句**（zcode-link.service.ts「readStatus 经依赖注入消费」系现势准确句；ai-sensor/ai-notes-import 头注均为行为/协议描述）→ 头注零改动。

## 3. 验证证据汇总（EXIT 全部物理在档）

| 项 | 证据件 | 尾行/EXIT |
| --- | --- | --- |
| 基线锚 verify | b25-verify-baseline.log | BASELINE_EXIT=0（170/1744） |
| 关卡 lint | b25-gate-lint.log | GATE_LINT_EXIT=0 |
| 关卡 typecheck | b25-gate-typecheck.log | GATE_TYPECHECK_EXIT=0 |
| 关卡 test | b25-gate-test.log | GATE_TEST_EXIT=0（170/1744） |
| 关卡 quality | b25-gate-quality.log | GATE_QUALITY_EXIT=0 |
| 关卡 tickets | b25-gate-tickets.log | GATE_TICKETS_EXIT=0 |
| 关卡 locks | b25-gate-locks.log | GATE_LOCKS_EXIT=0 |
| 关卡 build | b25-gate-build.log | GATE_BUILD_EXIT=0 |
| 变异 M1 红 | b25-m1-mutation.log | M1_MUTATION_EXIT=2 + TS2339_COUNT=1（`Property 'importAll' does not exist on type 'AiSensorService'`，:19 对位） |
| 变异 M1 复绿 | b25-m1-restore.log | RESTORE_EXIT=0 + RESTORE_DIFF=EMPTY |
| 变异 M2 红 | b25-m2-mutation.log | M2_MUTATION_EXIT=2 + TS2345_COUNT=1 + MISSING_READSTATUS_MSG=1（见自裁申报 1） |
| 变异 M2 复绿 | b25-m2-restore.log | RESTORE_EXIT=0 + RESTORE_DIFF=EMPTY |
| 定向回归 | b25-regression.log | REGRESSION_EXIT=0（3/37） |
| 终跑 verify | b25-verify-final.log | FINAL_EXIT=0（170/1744） |

变异法合规：两枚均 cp 备份（仓外 /tmp/b25-mut/）→变异→测→cp 还原→diff 确认空→**备份即删**（零 git checkout、零驻留副本；还原毕 ls 确认 /tmp/b25-mut 空）。终跑前 git status 复查：工作树恰三件本岗改动+主控侧 relay.md/manifest.json，零变异残留。

## 4. 自裁申报

1. **M2 错误码预测勘正（事实差异申报，非决定扩面）**：简报④.3 预测缺 readStatus 触发 TS2741；实测首码=**TS2345**（`Argument of type '{ zcodeBaseDir…}' is not assignable to parameter of type 'ZcodeLinkDeps'`）——根因：zcode_link 构造物在**函数调用参数位**（createZcodeLinkService({...})），TS 报参数不可赋值码 TS2345 并嵌套 TS2741 语义正文（`Property 'readStatus' is missing in type … but required in type 'ZcodeLinkDeps'`，log 物理在档 MISSING_READSTATUS_MSG=1）。红证实质（EXIT≠0+缺注入被 typecheck 精确拦截+错误正文点名 readStatus）全兑现，未做任何使码号凑对的改写。
2. A 件错位注释落法取「删除」而非「改写到正确位置」（简报明文二选一，删除后新三键注释块已在新位置承接同等信息，避免旧句残留二次错位）——落法选择申报备案。
3. 其余零超简报决定：registry/契约面（api-surface/schemas）/preload/renderer/export_ 交并/bootstrap（:124-127）/三服务件逻辑与路径全部零触碰；工作树内主控侧 relay.md 与 manifest 前置改动未碰。
