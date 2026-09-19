# F-SENSOR-01 实现简报（b25 批；实现者=ops-executor 绑定 GLM5.3flash $max）

## ① 任务（单一票：ai_sensor 域整理——零行为装配重构）

拆解 `src/main/services/index.ts` 的 ai_sensor 服务装配拼盘为三键平铺，消费面与桩工厂随迁。**零行为重构**：不改任何服务件逻辑、不改 IPC 契约、不改通道名、不改文件路径。

票面原文（registry F-SENSOR-01）：「三前缀一域（ai-sensor/ai-notes/zcode-link）对齐或拆域 + spread 拼盘解体 + zcode-link 对 readStatus 闭包耦合改显式注入；契约面 [locked-change]（api-surface/schemas 若动）」。

### 主控预裁（方向已定死，按此执行）

「对齐或拆域」裁量已裁：**拆域被 ADR-0017 用户裁决排除**（2026-08-27 用户裁决新立 ai_sensor IPC 域且明文「通道名不变」——拆域/改通道名=推翻用户裁决=用户级，本票不碰）；**对齐落法=ServiceBundle 桶键与三服务件一一对齐（拆三键）**。契约面（src/shared/ipc/api-surface.ts+schemas.ts）**零触碰**——票面条件句「若动」不触发。

### 改动面清单（恰四件）

**A. `src/main/services/index.ts`**（核心）：
1. `ServiceBundle` 接口：`ai_sensor: AiSensorService & AiNotesImportService & ZcodeLinkService` 交并行 → 拆三行：
   ```ts
   /** F-SENSOR-01：ai_sensor 域三键平铺（拆交并拼盘——键名与服务件一一对齐；
    *  IPC 域归属/通道名不动=ADR-0017 裁决保持） */
   ai_sensor: AiSensorService
   ai_notes_import: AiNotesImportService
   zcode_link: ZcodeLinkService
   ```
2. `createServices` 返回体：`:117-133` 的 IIFE+三 spread 拼盘 → 三键平铺构造（与 library/reader 同型）；构造序显式：`ai_sensor` 键先构造为局部量 `const aiSensor = createAiSensorService({ rootDir: deps.aiSensorRootDir })`，`zcode_link` 键的 readStatus **方法引用直传**（无箭头闭包包装）：
   ```ts
   const aiSensor = createAiSensorService({ rootDir: deps.aiSensorRootDir })
   // …（其余键平铺）…
   zcode_link: createZcodeLinkService({
     zcodeBaseDir: deps.zcodeBaseDir,
     templateDir: deps.templateDir,
     readStatus: aiSensor.readStatus // 06 单源消费（running 不双写）——F-SENSOR-01 显式注入
   }),
   ```
   安全依据（主控已核）：`readStatus` 为对象字面量方法、函数体零 `this` 引用（仅用工厂闭包变量），方法引用直传等价；`tests/unit/services/zcode-link.service.test.ts` 桩即注入函数同型。
3. 注释归位：现 `export_: ExportService & CorpusExportService` 行上方的注释「AI-06/07：ai_sensor 域服务交并（2026-08-27 用户裁决——自 export_ 并域迁出）」系历史错位（描述的是 ai_sensor 行）——随本票删除或改写到正确位置；`export_` 交并行**保持不动**（F-EXPORT-01 票面，勿顺手拆）。

**B. `src/main/ipc/ai_sensor.ts`**（消费面随迁）：七 handler 改从三键取——`requestAiRead`/`aiStatus`/`observe` ← `deps.services.ai_sensor.*`；`importAll`/`listByPaper` ← `deps.services.ai_notes_import.*`；`zcodeDetect`/`zcodeInstall` ← `deps.services.zcode_link.*`。头注补一句拆键说明（F-SENSOR-01 三键平铺，域装配文件与 IPC 域不动）。

**C. `tests/utils/ipc-deps.ts`**（受锁面，[locked-change][test-refactor]）：`ai_sensor: null as never,` 单行 → 三行（`ai_sensor`/`ai_notes_import`/`zcode_link` 各 `null as never,`）。改前 `npm run locks:unlock`，改毕即时 `npm run locks:apply`。

**D. `tickets/registry.ts`**：**实现者禁改**（主控收口职责）——此件仅列明避免误碰。

### 明确不做

- 三服务件（ai-sensor.service.ts / ai-notes-import.service.ts / zcode-link.service.ts）**逻辑与路径零改动**——可改的仅限头注中描述装配形态的陈旧句（若发现，逐句摘录进报告自裁段，非必要不动）。
- IPC 契约（api-surface.ts/schemas.ts）、preload、renderer client 零触碰（通道名/域结构不变=动态机制零改动的 ADR-0017 基础保持）。
- `export_` 交并拼盘不动（F-EXPORT-01 承接）。
- 协议版本字段（备选池候选）**不顺带**——主控裁：行为变更与零行为重构不同性质，归后续独立票（裁决书 §5 备选池明文「或其后批次」给了退路）。

## ② 上下文（现状事实，主控已亲验）

- 装配现状：services/index.ts:84-86（类型）+:117-133（IIFE 拼盘+readStatus 箭头闭包）。
- 消费面唯一：ipc/ai_sensor.ts 七 handler 全走 `deps.services.ai_sensor.*`（全仓 grep 亲验，无其他消费者）。
- 桩工厂：tests/utils/ipc-deps.ts:29 `ai_sensor: null as never,`（services 字面量，行序=library/reader/tags/notes/import_/enrich/export_/ai_sensor/lineage）。
- 受锁判定（locks/manifest.json 亲验）：src/main/**（含四件中 A/B）全 free；C 件 LOCKED；sensor 族 7 件测试 LOCKED 但**零触碰**（单测三件直测工厂函数与桶形状解耦；e2e 两件走通道与装配形状解耦）。
- ServiceDeps 三注入（aiSensorRootDir/zcodeBaseDir/templateDir）与 bootstrap 装配（bootstrap.ts:124-127）**零改动**。

## ③ 边界与纪律

- 禁 git 提交/禁改 registry/禁碰契约面；自产探针 .mjs 写前 lint 自查+写毕即时 locks:generate+apply（宪法义务）；探针一律 Write 直写文件后 node 跑（shell 隔层四坑）。
- 一切超票面/超简报决定 → 停工申报（报告「自裁申报」段），不得自行扩面。
- 行数口径：计数落笔前 wc/grep 实测。

## ④ 验证（TDD 等价=基线锚+变异红证；零行为重构无新用例）

1. **基线锚**：动手前 `npm run verify` 全绿落档 `scripts/audits/b25-verify-baseline.log`（含尾行 `BASELINE_EXIT=$?` 变量法；Node 24 环境跑）。
2. **改毕七关卡**：lint/typecheck/test/quality/tickets/locks/build 逐项落档 `b25-gate-*.log`（tickets 应绿——本票无 registry/文件路径变化；locks 变化=你的探针件入锁+manifest 行，预期内）。
3. **变异红证两枚**（文件备份法：cp 备份→变异→测→cp 还原→diff 确认空；**禁 git checkout**）：
   - M1 消费面回退：ipc/ai_sensor.ts 的 `importAll` handler 改回 `deps.services.ai_sensor.importAll()` → `npx tsc --noEmit -p tsconfig.node.json`（或项目 typecheck 关）EXIT≠0 且含 TS2339 → 还原 → 复绿落档。
   - M2 装配面缺注入：services/index.ts 的 zcode_link 构造删 `readStatus` 行 → typecheck EXIT≠0 且含 TS2741（缺属性）→ 还原 → 复绿落档。
   - 两枚还原 log 尾行均物理落 `RESTORE_EXIT=` 变量法。
4. **定向回归**：tests/unit/services/{ai-sensor.service,zcode-link.service,ai-notes-import}.test.ts 三件定向跑绿落档。
5. **收口终跑**：`npm run verify` 全绿落档 `b25-verify-final.log`（尾行 `FINAL_EXIT=$?`）。
6. e2e 不在你的义务面（收口默认门 43 归主控跑）。

## ⑤ 证据件（scripts/audits/，b25- 前缀）

impl-brief（本件）/impl-report.md（交付报告：改写面逐行清单+计数实测+自裁申报段+七关卡/变异/回归 EXIT 汇总）/b25-verify-baseline.log/b25-gate-{lint,typecheck,test,quality,tickets,locks,build}.log/b25-m1-{mutation,restore}.log/b25-m2-{mutation,restore}.log/b25-regression.log/b25-verify-final.log+你的探针 .mjs/.log。报告头行注明档位：绑定 ops-executor（GLM5.3flash $max）。

## ⑥ 完成定义

七关卡全绿+两枚变异红证物理在档+定向回归绿+终跑 verify EXIT=0+报告交付。回炉 ≤2；卡住停工申报。
