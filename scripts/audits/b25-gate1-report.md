[routing]: run=20260918235238-203yc8g4 source=deepseek model=deepseek-v4-flash role=gate1-reviewer@fb86152e cfg=1a93765499cd switches=0 usage=in=3334,out=21978 latency=101216ms (by ds-call-v2 链)

# F-SENSOR-01 门一审查报告

**verdict：PASS_WITH_WARNINGS**（B=0 / W=4 / N=4；本报告仅凭本包材料裁决）

## 一、逐 hunk 零行为断言

三 hunk 中 hunk「ipc/ai_sensor.ts @@ -2,6 +2,8 @@」纯注释；「@@ -14,10 +16,10 @@」四处路由键重定向，受全仓 typecheck 编译期约束（`deps.services` 类型=ServiceBundle）；index.ts 接口/装配两 hunk 与 ipc-deps.ts 一 hunk 见下。零行为主张在「键存在性」面成立，在**同名遮蔽语义**与**this 绑定**两面未闭环（W1/W2）。

## 二、分级发现

**W1｜spread 撞名遮蔽=潜在语义变更，类型系统不设防（不确定）**
证据：`src/main/services/index.ts`（hunk `@@ -114,23 +118,18 @@`）删除段三 spread（`...aiSensor,` / `...createAiNotesImportService({…}),` / `...createZcodeLinkService({…})`）→ 新三独立键。旧语义=同名成员后 spread 胜出，`services.ai_sensor.X` 可能解析到后位服务；新语义=解析到键对应服务。若三件存在同名导出（如 zcodeLink 若亦导出 `readStatus`），旧 handler 走 zcode 版、新 handler 走 aiSensor 版=行为变更，且「同名同型」时 typecheck 无感（M1 只证明*缺失名*会红）。包内无三服务件导出名清单 ⇒ 无法裁决。旁证：handler 消费 7 名与三前缀 3+2+2 一一对应（`requestAiRead/aiStatus/observe`｜`importAll/listByPaper`｜`zcodeDetect/zcodeInstall`），遮蔽概率低。需证：三件导出成员名两两无交集。

**W2｜readStatus 方法引用直传改变 this 绑定；类型系统与单测均不设防**
证据：`readStatus: () => aiSensor.readStatus()` → `readStatus: aiSensor.readStatus`。旧：调用点 this=aiSensor；新：由 zcode_link 侧以 `deps.readStatus()` 调用，this=zcode_link 的 deps 对象。TS 对「方法提取丢 this」在无显式 this 参数时不报错，故 M2 的 TS2345 只证明*必填依赖存在*，不证明绑定等价；且 zcode-link 单测注入普通桩函数、不经真实 `aiSensor.readStatus`，37 定向用例不覆盖该绑定。§1.4「函数体零 this」为包内文字断言 ⇒ 标 W（不确定）。需证：ai-sensor.service.ts 中 readStatus 体零 this（grep 实证），或 e2e 门 43 绿。

**W3｜aiSensor 构造序前移**
证据：`+  const aiSensor = createAiSensorService({ rootDir: deps.aiSensorRootDir })` 置于 `createServices` 首句；旧码该调用在对象字面量第 6 位（export_ 之后、IIFE 内）。aiSensor 现先于 library/notes/import_/enrich/export_ 构造。零行为仅在「各工厂无构造期副作用、无相互顺序依赖」时成立，包内无此证据（1744 用例绿是间接弱证据）。正向核对：aiSensor 仍只构造一次，`ai_sensor` 键与 readStatus 注入共用同一实例，无重复构造（此点无误）。

**W4｜受锁面/锁清单无法独立裁决（不确定）**
证据：包内仅文字声明 manifest 三项变化（时间戳+b25-claim.mjs 入锁+ipc-deps sha 更新），无 `locks/manifest.json` diff。其中「探针入锁」=锁清单新增条目，并非「unlock→改→apply」式机械 sha 更新；亦无法核验其余被锁条目哈希未被改写、services/index.ts 与 ipc/ai_sensor.ts 是否在锁内。补 manifest diff 方可终裁。

**N1｜diffstat 申报不符**：hunk 头 `@@ -2,6 +2,8 @@` 证明头注净 +2，四处路由替换为 ±4，故 ipc/ai_sensor.ts 实为 **+6/−4（净 +2）**，与 §4.5「+5/−5（净 0）」矛盾。services/index.ts +18/−19（hunk 14→18、23→18，净 −1 ✔）与 ipc-deps.ts +2（6→8 ✔）申报成立。

**N2｜注释沿革部分丢失**：删除 `/** AI-06/07：ai_sensor 域服务交并（2026-08-27 用户裁决——自 export_ 并域迁出） */`，新注释仅保留 ADR-0017，丢日期与迁出沿革；但 ipc/ai_sensor.ts 头注仍存「2026-08-27 用户裁决 ADR-0017」⇒ 信息未灭失，可接受。

**N3｜变异覆盖**：M1 精确且承重——TS2339=1，且若接口仍为交并则 M1 不会红 ⇒ 反向证明交并已拆；M2 精确（TS2345+嵌套 MISSING_READSTATUS_MSG=1）。但 listByPaper/zcodeDetect/zcodeInstall 三处改道与 this 绑定无红证：前三处由「全仓 typecheck 绿 ⇒ 残留旧键必红」兜住，this 绑定无兜（见 W2）。自裁 1（不凑码号）成立。

**N4｜两项收口**：e2e 门 43 结果未出（主控收口义务），门一不作终裁；「三前缀一域」表述中桶键↔件名两面成立、**通道前缀面不成立**（importAll/listByPaper 仍走 ai-sensor/* 域），与 ADR-0017 一致，但若表述为「三面映射全部成立」则不精确。

## 三、预裁/自裁逐条裁决

1. 拆域排除——**成立**：diff 未改 `ApiHandlers['ai_sensor']` 返回面/通道名/通道集，四条改道仅换服务桶键。
2. 对齐=拆三键、契约零触碰——**成立**：三键齐备，diff 三件无 api-surface/schemas，票面「若动」条件句不触发。
3. spread→三键平铺——**成立**：IIFE 消失，形制与 `library: createLibraryService({ repos: deps.repos })`（同 hunk 上下文）同型；reader 同型无法在包内核验（不确定）。
4. readStatus 显式注入——**落法成立、论证不完备**：箭头闭包消失、方法引用直传、构造序上提，但 this 安全仅凭文字断言（W2）。
5. 协议版本字段不顺带——**成立**：diff 无字段/签名新增。
- 自裁 1（M2 首码 TS2345 而简报预测 TS2741）——**成立**：对象字面量参数缺属性即 TS2345，嵌套消息对位，未凑码。
- 自裁 2（错位注释取「删除」）——**成立**（二选一授权内），副作用=N2。

## 四、拷问点结论

1. **键序/spread 语义**：新码无「合并」故无键序覆盖问题；但等价性依赖三件无同名成员（W1，不确定）。
2. **this 论证不完备**（W2）：类型系统与 zcode-link 桩均不覆盖，需函数体实证或 e2e。
3. **受锁面**：恰 ipc-deps.ts 一件属预裁，但 manifest 无 diff 可验（W4）。
4. **防线单一性**：类型系统对「键存在性」完备（M1 反证交并已拆），对「同名遮蔽」「this 绑定」零防线；本票运行时风险恰在这两处非空 ⇒ 仅凭 typecheck 不足以宣称零行为。
5. **计数**：index.ts 与 ipc-deps.ts 复核通过；ipc/ai_sensor.ts 申报有误（N1）。
6. **「对齐」兑现度**：桶键↔件名成立（ai_sensor/ai_notes_import/zcode_link ↔ 三件名），通道前缀面未映射（N4），符合裁决。

## 五、统计与总评

B=0：无阻断性偏差，contract 面、通道面、三服务件面均零触碰，改动面与票面/预裁一致，未发现静默失败路径。W=4 集中于两处**不可在包内证伪的等价性依赖**（遮蔽语义、this 绑定）与两处**证据缺口**（构造序、锁清单）。建议：补三服务件导出名清单、readStatus 体零 this 的 grep 实证、manifest diff 与 e2e 门 43 绿，即可升 PASS。

FINDINGS: B=0 W=4 N=4 VERDICT=PASS_WITH_WARNINGS