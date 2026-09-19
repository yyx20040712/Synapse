# F-SENSOR-01 门一审包（b25 批；隔离一审——自包含，仅凭本包裁决）

## 0. 审查要求

- 你=门一 gate1-reviewer（对抗式代码审查；绑定档位 kimi k3 $max，zipoo 源）。产出报告：`PASS / PASS_WITH_WARNINGS / FAIL` + B（Blocker）/W（Warning）/N（Note）分级发现清单，每条含证据行号；对下述「主控预裁」与「实现者自裁」逐条裁成立/不成立。
- 审查对象：纯 diff+本包内证据。**零行为装配重构票**——你的核心任务=逐 hunk 断言「零行为」是否成立、受锁面判定是否精确、变异红证是否真实承重。

## 1. 任务上下文

票面（registry F-SENSOR-01）：「ai_sensor 域整理（裁决 6 域归位四项之二）：三前缀一域（ai-sensor/ai-notes/zcode-link）对齐或拆域+spread 拼盘解体+zcode-link 对 readStatus 闭包耦合改显式注入；契约面 [locked-change]（api-surface/schemas 若动）；中票」。

**主控预裁**（简报落死，实现者照执行）：
1. 「拆域」被排除——ADR-0017（2026-08-27 用户裁决）新立 ai_sensor IPC 域且 api-surface 明文「通道名 ai-sensor/* 不变」；拆域/改通道名=推翻用户裁决=用户级。
2. 「对齐」落法=ServiceBundle 桶键与三服务件一一对齐（拆三键）：ai_sensor/ai_notes_import/zcode_link；IPC 契约（api-surface/schemas）零触碰——票面「若动」条件句不触发。
3. spread 拼盘解体=IIFE+三 spread 消解为三键平铺（与 library/reader 同型）。
4. readStatus 显式注入=构造序显式（aiSensor 局部量先行）+方法引用直传（无箭头闭包包装）。this 安全依据：readStatus 为对象字面量方法、函数体零 this（仅用工厂闭包变量）；zcode-link.service.test 桩即注入函数同型。
5. 协议版本字段（备选池候选）不顺带（行为变更≠零行为重构，裁决书 §5 明文「或其后批次」）。

改动前现状（services/index.ts）：`ServiceBundle.ai_sensor: AiSensorService & AiNotesImportService & ZcodeLinkService` 交并+createServices 内 IIFE 三 spread 装配+`readStatus: () => aiSensor.readStatus()` 箭头闭包。消费面唯一=ipc/ai_sensor.ts 七 handler。

## 2. 实现 diff（全量，恰三件；另 locks/manifest.json 恰三项机械变化=时间戳+b25-claim.mjs 探针入锁+ipc-deps sha 更新）

```diff
diff --git a/src/main/ipc/ai_sensor.ts
@@ -2,6 +2,8 @@
  * ipc/ai_sensor —— AI 伴随进程域装配（AI-06 协议两通道自
  * export_ 域迁入 + AI-07 回灌导入器两通道；2026-08-27 用户裁决 ADR-0017
  * 新立本域，通道名不变——register/preload/renderer 经动态机制零改动）。
+ * F-SENSOR-01 三键平铺：服务桶按 ai_sensor/ai_notes_import/zcode_link
+ * 三键取用（键名与服务件一一对齐；域装配文件与 IPC 域不动）。
  *
  * 薄分发（SR-IPC-* 同型）：业务在 services/ai_sensor/*；协议/导入 IO 错误
  * 原样上抛，register 折叠为 Result。
@@ -14,10 +16,10 @@ export function createAiSensorIpc(deps: IpcDeps): ApiHandlers['ai_sensor'] {
     requestAiRead: (req) => deps.services.ai_sensor.requestRead(req.paperId),
     aiStatus: async () => deps.services.ai_sensor.readStatus(),
     observe: (req) => deps.services.ai_sensor.observe(req.paperId),
-    importAll: async () => deps.services.ai_sensor.importAll(),
-    listByPaper: (req) => deps.services.ai_sensor.listByPaper(req.paperId),
+    importAll: async () => deps.services.ai_notes_import.importAll(),
+    listByPaper: (req) => deps.services.ai_notes_import.listByPaper(req.paperId),
     // AI-10：zcode 联动两通道（检测/装技能——纯 fs，INV-21 零 spawn）
-    zcodeDetect: async () => deps.services.ai_sensor.zcodeDetect(),
-    zcodeInstall: async () => deps.services.ai_sensor.zcodeInstall()
+    zcodeDetect: async () => deps.services.zcode_link.zcodeDetect(),
+    zcodeInstall: async () => deps.services.zcode_link.zcodeInstall()
   }
 }
diff --git a/src/main/services/index.ts
@@ -81,14 +81,18 @@ export interface ServiceBundle {
   notes: ApiHandlers['notes']
   import_: ImportService
   enrich: EnrichServiceShape
-  /** AI-06/07：ai_sensor 域服务交并（2026-08-27 用户裁决——自 export_ 并域迁出） */
   export_: ExportService & CorpusExportService
-  ai_sensor: AiSensorService & AiNotesImportService & ZcodeLinkService
+  /** F-SENSOR-01：ai_sensor 域三键平铺（拆交并拼盘——键名与服务件一一对齐；
+   *  IPC 域归属/通道名不动=ADR-0017 裁决保持） */
+  ai_sensor: AiSensorService
+  ai_notes_import: AiNotesImportService
+  zcode_link: ZcodeLinkService
   /** LG-01 脉络图：service 四写方法全建（IPC 写通道注册归 LG-03） */
   lineage: LineageService
 }
 
 export function createServices(deps: ServiceDeps): ServiceBundle {
+  const aiSensor = createAiSensorService({ rootDir: deps.aiSensorRootDir })
   return {
     library: createLibraryService({ repos: deps.repos }),
@@ -114,23 +118,18 @@（同文件装配段）
-    ai_sensor: (() => {
-      const aiSensor = createAiSensorService({ rootDir: deps.aiSensorRootDir })
-      return {
-        ...aiSensor,
-        ...createAiNotesImportService({
-          rootDir: deps.aiSensorRootDir,
-          repo: deps.repos.aiNotes,
-          paperExists: (id) => deps.repos.papers.findById(id) !== null,
-          withTransaction: deps.repos.withTransaction // F-AIN-01 回灌事务（lineage 行同型）
-        }),
-        ...createZcodeLinkService({
-          zcodeBaseDir: deps.zcodeBaseDir,
-          templateDir: deps.templateDir,
-          readStatus: () => aiSensor.readStatus() // 06 单源消费（running 不双写）
-        })
-      }
-    })(),
+    ai_sensor: aiSensor,
+    ai_notes_import: createAiNotesImportService({
+      rootDir: deps.aiSensorRootDir,
+      repo: deps.repos.aiNotes,
+      paperExists: (id) => deps.repos.papers.findById(id) !== null,
+      withTransaction: deps.repos.withTransaction // F-AIN-01 回灌事务（lineage 行同型）
+    }),
+    zcode_link: createZcodeLinkService({
+      zcodeBaseDir: deps.zcodeBaseDir,
+      templateDir: deps.templateDir,
+      readStatus: aiSensor.readStatus // 06 单源消费（running 不双写）——F-SENSOR-01 显式注入
+    }),
diff --git a/tests/utils/ipc-deps.ts（受锁 [locked-change][test-refactor]；unlock→改→即时 apply 单链）
@@ -27,6 +27,8 @@
       enrich: null as never,
       export_: null as never,
       ai_sensor: null as never,
+      ai_notes_import: null as never,
+      zcode_link: null as never,
       lineage: null as never,
       ...over.services
     },
```

**零触碰清单（实现者申报+主控 git status 亲验）**：三服务件（ai-sensor.service.ts/ai-notes-import.service.ts/zcode-link.service.ts）逻辑与路径、src/shared/ipc/{api-surface,schemas}.ts（契约）、preload、renderer client、bootstrap.ts、ipc/ipc-deps.ts、tickets/registry.ts、e2e specs。export_ 交并拼盘保持不动（F-EXPORT-01 承接）。

## 3. 验证证据汇总（全部物理在档 scripts/audits/b25-*，尾行变量法 EXIT）

| 项 | EXIT | 备注 |
| --- | --- | --- |
| 基线锚 verify | 0 | 170 文件/1744 用例 |
| 七关卡 lint/typecheck/test/quality/tickets/locks/build | 全 0 | tickets 绿=无 registry/路径变化预期态 |
| 变异 M1 红（ipc importAll 改回旧键） | 2 | TS2339_COUNT=1，`Property 'importAll' does not exist on type 'AiSensorService'` 精确对位 |
| M1 还原 | 0 | RESTORE_DIFF=EMPTY |
| 变异 M2 红（zcode_link 构造删 readStatus 行） | 2 | **实现者自裁 1：简报预测 TS2741，实测首码 TS2345**（参数位不可赋值）+嵌套正文 `Property 'readStatus' is missing … required in type 'ZcodeLinkDeps'`（MISSING_READSTATUS_MSG=1）；未凑码号 |
| M2 还原 | 0 | RESTORE_DIFF=EMPTY |
| 定向回归（三服务单测） | 0 | 3 文件/37 用例 |
| 终跑 verify | 0 | 170/1744 恒等 |
| e2e 默认门 43 | 在跑 | 收口义务（主控），结果后补呈门二 |

变异法=cp 备份→变异→测→cp 还原→diff 确认空（零 git checkout）；实现者自裁 2=错位注释落法取「删除」（简报二选一，新注释块在新位承接信息）。

## 4. 对抗拷问点（主控预列，请独立判断并补充遗漏）

1. 逐 hunk 零行为断言：三 hunk 外是否有隐性行为差（如对象键序变化对 spread 覆盖语义的影响——旧拼盘三服务方法集是否理论可撞名？撞名时旧=后 spread 胜出新=编译期隔离，是否行为等价主张成立？）。
2. readStatus 方法引用直传的 this 论证是否完备（你无仓读权限——以本包 §1.4 论据+diff 自身判断；如认论据不足，标 W 并说明所需证据）。
3. 受锁面判定：恰 tests/utils/ipc-deps.ts 一件（[locked-change][test-refactor]）+manifest 机械变化；契约面零触碰主张是否与票面「api-surface/schemas 若动」条件句一致。
4. 变异红证充分性：M1/M2 均落 typecheck 面——防线单一性是否可接受（本票无运行时行为变化主张，类型系统=唯一防线是否成立）。
5. 计数复核：services/index.ts 净变化（+18/−19）；ipc/ai_sensor.ts（+5/−5 内含头注 +2）；ipc-deps.ts（+2）。
6. 「对齐」落法是否兑现票面「三前缀一域」语义（桶键名↔件名↔通道前缀三面映射是否成立）。

## 5. 你的输出

最终回复=完整审查报告（我逐字归档为 gate1-report.md）：verdict 行+分级发现（B/W/N 各条含 diff 行号证据）+对预裁 5 条与自裁 2 条的逐条裁决+拷问点 6 项独立结论。
