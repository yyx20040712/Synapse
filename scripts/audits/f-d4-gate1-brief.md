# F-D4 门一对抗深审材料包（Kimi 链）

> 你是门一对抗审查员（Kimi）。工单=F-D4 import 会话身份两合一：main 侧 import gate 互斥（in-flight import × workspace create/rename/switch）+ ImportProgressEvent sessionId（renderer 跨会话迟到过滤）。病根母本=AUDIT-C C-3 扫描报告 §1.2-b+§五-2/5。对抗审查四件：票面母本符合度/宪法红线/代码与测试质量/报告诚实性（自裁逐条对 diff）。只报告有证据支撑的问题，每条【B/W/N+file:line 或 diff 摘录】。用中文。

## 主控预裁项（可攻击，推翻需更强依据）

1. create/rename 与 switch 一并拦：materializeLegacy 同样 closeCurrent（同机制竞窗，L0 理论面）——一行成本统一拦，非范围蔓延。
2. gate 两最小接口 duck-typing（import.service 收 {enter,exit}；workspace.service 收 () => boolean），共享实现只在 bootstrap 顶层——禁入 shared（main 装配细节非跨进程契约），两服务互不 import。
3. importInFlight 必选注入（不留隐式默认 undefined=恒 false）：既有 workspace.test 六处构造加 () => false 桩（实现者自裁申报：票面误写「三处」，实测六处）。
4. ImportDropZone 三滤在组件级（busyRef 镜像+sessionRef 锚定+runImport 重置），不 store 化——单挂载点，corpus-export 范式的组件级变体。
5. e2e 零改：无 import e2e 面；workspaces.spec 无 import 并发面（gate 单测已锚）。

## 审查清单（六问）

1. 母本符合度：票面 §一 时序表六格逐格对照实现；schemas sessionId 形态对齐 exportProgressEventSchema 先例（z.string().min(1)）？
2. gate 语义：enter/exit 配对在**全部**路径成立吗（importFiles/importFolder 的域错误上抛路径——ImportDomainError 来自 scanFolder，在 try 内吗）？并发两次 importFiles 计数 2→exit 后 1→仍 in-flight，语义对吗？拒时零库副作用（CONFLICT 抛在 closeCurrent/materializeLegacy 之前）实证？
3. renderer 三滤：订阅回调闭包态（busyRef/sessionRef）在组件重渲/卸载时正确吗？unmount 后事件到达（已退订？）？runImport 重置时序（先重置后 await）？残余窗声明与 corpus 先例同口径？
4. 测试盲区：新用例是否真能失败（对照红证据）？变异 M1（gate.exit 挪出 finally）/M2（异身份过滤删）各锁独立面？workspace 既有六处构造加桩是否改变既有用例语义？import.service 既有断言（progress.at(-1)?.phase===done 等）在 sessionId 加入后仍有效？
5. 宪法红线：受锁流程（schemas/tests 改动 [locked-change]+locks:unlock/apply/generate 纪律）？分层单向？行数≤500？中文注释 UTF-8？禁新依赖？
6. 接缝：ImportProgressEvent 新字段对既有消费方的全量影响（preload/api-surface/ImportDropZone 之外还有谁）？ipcMain handler 注册面对 sessionId 零感知声明成立？INV-52 登记格式与 INV-50/51 一致？

## 证据关键段（全文在库，此为摘录）

### f-d4-verify.raw.txt 尾部（verify 真退出码）

```
(!) E:/class/智慧水务/Synapse_remake/node_modules/pdfjs-dist/build/pdf.mjs is dynamically imported by E:/class/智慧水务/Synapse_remake/src/renderer/features/reader/CorpusExtractor.ts but also statically imported by E:/class/智慧水务/Synapse_remake/src/renderer/features/reader/PdfDocProvider.tsx, E:/class/智慧水务/Synapse_remake/src/renderer/features/reader/PdfPageCanvas.tsx, E:/class/智慧水务/Synapse_remake/src/renderer/features/reader/TextLayer.tsx, dynamic import will not move module into another chunk.
[39m
[1m[33m[plugin:vite:reporter][39m[22m [33m[plugin vite:reporter] 
(!) E:/class/智慧水务/Synapse_remake/node_modules/pdfjs-dist/build/pdf.worker.min.mjs?url is dynamically imported by E:/class/智慧水务/Synapse_remake/src/renderer/features/reader/CorpusExtractor.ts but also statically imported by E:/class/智慧水务/Synapse_remake/src/renderer/features/reader/PdfDocProvider.tsx, dynamic import will not move module into another chunk.
[39m
rendering chunks...
[2m../../out/renderer/[22m[32mindex.html                          [39m[1m[2m    0.88 kB[22m[1m[22m
[2m../../out/renderer/[22m[32massets/pdf.worker.min-yatZIOMy.mjs  [39m[1m[2m1,375.84 kB[22m[1m[22m
[2m../../out/renderer/[22m[35massets/index-BnbUs7aC.css           [39m[1m[2m   44.34 kB[22m[1m[22m
[2m../../out/renderer/[22m[36massets/index-kZARU-cy.js            [39m[1m[33m1,308.26 kB[39m[22m
[32m✓ built in 1.56s[39m
exit=0
```

### f-d4-red.raw.txt 尾部（首红，全量套跑口径）

```

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[5/6]⎯[22m[39m

[31m[1m[7m FAIL [27m[22m[39m tests/unit/renderer/import-dropzone.test.tsx[2m > [22mF-D4 ImportDropZone —— 进度事件会话身份过滤[2m > [22mbusy 中异 sessionId 事件→文案不变（旧会话污染被滤）
[31m[1mAssertionError[22m: expected '提取元数据（3/3） 旧会话.pdf' to be '复制文件（1/3） 本会话.pdf' // Object.is equality[39m

Expected: [32m"[7m复制文件（1[27m/3） [7m本[27m会话.pdf"[39m
Received: [31m"[7m提取元数据（3[27m/3） [7m旧[27m会话.pdf"[39m

[36m [2m❯[22m tests/unit/renderer/import-dropzone.test.tsx:[2m147:26[22m[39m
    [90m145| [39m    [34mexpect[39m([34mstatusText[39m())[33m.[39m[34mtoBe[39m([32m'复制文件（1/3） 本会话.pdf'[39m)
    [90m146| [39m    [35mawait[39m [34memit[39m([34mev[39m([32m'stale'[39m[33m,[39m { phase[33m:[39m [32m'extracting'[39m[33m,[39m current[33m:[39m [34m3[39m[33m,[39m total[33m:[39m [34m3[39m…
    [90m147| [39m    [34mexpect[39m([34mstatusText[39m())[33m.[39m[34mtoBe[39m([32m'复制文件（1/3） 本会话.pdf'[39m)
    [90m   | [39m                         [31m^[39m
    [90m148| [39m  })
    [90m149| [39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[6/6]⎯[22m[39m

[2m Test Files [22m [1m[31m3 failed[39m[22m[2m | [22m[1m[32m124 passed[39m[22m[90m (127)[39m
[2m      Tests [22m [1m[31m5 failed[39m[22m[2m | [22m[1m[32m1096 passed[39m[22m[90m (1101)[39m
[2m   Start at [22m 20:23:29
[2m   Duration [22m 27.08s[2m (transform 11.96s, setup 0ms, collect 50.83s, tests 13.58s, environment 286.76s, prepare 71.16s)[22m

exit=1
```

### f-d4-mutation-m1.raw.txt / m2 尾部（变异红证）

```
    [90m260| [39m    })
    [90m261| [39m    [34mexpect[39m(enters)[33m.[39m[34mtoBe[39m([34m1[39m)
    [90m262| [39m    [34mexpect[39m(exits)[33m.[39m[34mtoBe[39m([34m1[39m)
    [90m   | [39m                  [31m^[39m
    [90m263| [39m  })
    [90m264| [39m})

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯[22m[39m

[2m Test Files [22m [1m[31m1 failed[39m[22m[2m | [22m[1m[32m126 passed[39m[22m[90m (127)[39m
[2m      Tests [22m [1m[31m1 failed[39m[22m[2m | [22m[1m[32m1100 passed[39m[22m[90m (1101)[39m
[2m   Start at [22m 20:26:43
[2m   Duration [22m 27.29s[2m (transform 12.42s, setup 0ms, collect 47.93s, tests 13.52s, environment 292.13s, prepare 71.11s)[22m

exit=1
```

```
    [90m145| [39m    [34mexpect[39m([34mstatusText[39m())[33m.[39m[34mtoBe[39m([32m'复制文件（1/3） 本会话.pdf'[39m)
    [90m146| [39m    [35mawait[39m [34memit[39m([34mev[39m([32m'stale'[39m[33m,[39m { phase[33m:[39m [32m'extracting'[39m[33m,[39m current[33m:[39m [34m3[39m[33m,[39m total[33m:[39m [34m3[39m…
    [90m147| [39m    [34mexpect[39m([34mstatusText[39m())[33m.[39m[34mtoBe[39m([32m'复制文件（1/3） 本会话.pdf'[39m)
    [90m   | [39m                         [31m^[39m
    [90m148| [39m  })
    [90m149| [39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯[22m[39m

[2m Test Files [22m [1m[31m1 failed[39m[22m[2m | [22m[1m[32m126 passed[39m[22m[90m (127)[39m
[2m      Tests [22m [1m[31m1 failed[39m[22m[2m | [22m[1m[32m1100 passed[39m[22m[90m (1101)[39m
[2m   Start at [22m 20:27:29
[2m   Duration [22m 27.40s[2m (transform 12.09s, setup 0ms, collect 47.81s, tests 13.66s, environment 291.77s, prepare 72.44s)[22m

exit=1
```

## 票面全文

# F-D4 修票票面 —— import 会话身份两合一（main 互斥 gate + 进度事件 sessionId）

> 来源=AUDIT-C C-3 扫描报告 §1.2-b+§五-2/5（scripts/audits/audit-c-scan.md，对抗审核在档）。
> 四波场首票。三屋模式：本票面五层规约=完整任务书，实现者照此 TDD。
> 病根两处同根=「import 会话无身份」：①in-flight import × workspace 变更互斥不存在
> （import.service 无守卫 × workspace.service busy 不含 import）——后果=导入结果静默
> 丢失+旧课题库孤儿分桶文件；②ImportProgressEvent 无 sessionId（corpus-export
> sessionId 修复同族未同步）——reload 后旧会话残留事件污染新会话进度显示。

## 〇、病根证据（扫描报告摘录，行号已在门一审核对）

- workspace.service.ts:151/:165/:182——busy 互斥入口仅 create/rename/switch 三方法；
  import.service.ts 全文无 busy、无库切换感知、无取消。
- bootstrap.ts:91-125——assemble 闭包每次装配 `createServices(...)`，import.service 的
  deps.repos/fileStore 是**发起时刻那一层的闭包引用**；switch 时序（workspace.service.ts:190-193）
  =closeCurrent()（db.close()+current=null）→写指针→assembleInto 新层。in-flight 批的
  后续写打已关 handle→importOne catch 折叠 failed→回复无人消费（renderer 已 reload）。
- create/rename 的 materializeLegacy（workspace.service.ts:100-107）同样 closeCurrent
  →同机制竞窗（L0 理论面）——本票统一拦。
- preload/index.ts:27-31 / api-surface.ts:117——ImportProgressEvent 载荷
  {phase,current,total,fileName} 无会话身份；ImportDropZone.tsx:77 订阅回调无条件
  setProgress。修复先例=corpus-export.store.ts:87-94（busy=false 忽略+首个事件锚定
  sessionId+异身份忽略；残余窗声明在注释 :90-92）。
- renderer 拒绝可见面已在：WorkspaceSwitcher.tsx:56-57/:75-76 catch→toast
  （ApiClientError.message）——CONFLICT 拒绝零 renderer 补丁。

## 一、行为层（状态机前置）

### A 面：import gate 互斥（main 侧）

- **gate 实现位置=bootstrap 顶层一次创建**（容器 assemble 闭包之外——每层 service
  重建但 gate 同一对象）。形态=闭包计数器：
  - import.service 侧最小接口（duck typing，不引共享类型）：`gate: { enter(): void; exit(): void }`
  - workspace.service 侧最小接口：`importInFlight: () => boolean`
  - bootstrap 建一个对象同时满足两形态（计数>0 即 in-flight）。
- import.service.ts：`importFiles`/`importFolder` 每次调用入口 `gate.enter()`，
  **finally** `gate.exit()`（尽力而为路径/域错误抛出路径都必经 finally）。deps 增
  `gate` **必选**字段。
- workspace.service.ts：deps 增 `importInFlight` **必选**字段；create/rename/switch
  三入口在 busy 检查旁检查，in-flight 时抛
  `WorkspaceDomainError('CONFLICT', '导入进行中，请稍后再试')`——**先于** closeCurrent/
  materializeLegacy（拒时零库副作用）。
- 语义边界（如实入头注）：拒绝=用户稍后重试（低频窗=大文件夹导入分钟级）；in-flight
  判定=main 侧计数，renderer busy 不参与（两进程面各自独立，本票只闭 main 面）。

### B 面：ImportProgressEvent sessionId（shared 契约面）

- schemas.ts：`importProgressEventSchema` 增 `sessionId: z.string().min(1)`
  （先例=exportProgressEventSchema schemas.ts:163）。**类型变更=[locked-change] 流程**
  （shared 单一真相源）。
- import.service.ts：每次 `importFiles`/`importFolder` 调用入口生成一次
  `randomUUID()` 会话 id；该次调用内全部进度事件（含 scanning/done）同 id。实现
  形态建议：内部 `report` 收窄为四字段 core，组装完整事件后经 onProgress 发出。
- ImportDropZone.tsx：订阅回调过滤（照 corpus-export.store.ts:87-94 范式）：
  - busy=false 时忽略（终局后迟到事件不改在途相——组件已有渲染门 :138，本票把
    **写 state** 也挡住）；
  - sessionRef（`useRef<string|null>`）首事件锚定会话身份，异身份忽略；
  - `runImport` 入口重置 sessionRef=null。busy 的订阅回调读旧闭包问题用
    `busyRef` 镜像解决（state 与 ref 双写）。
  - 残余窗声明（照 corpus 注释 :91 同口径）：新会话 start 后首事件前（旧事件须
    跨越终局+用户点击两层，理论窗）。

### 时序表（gate × sessionId 组合）

| 序列 | gate | sessionId | 预期 |
| --- | --- | --- | --- |
| import in-flight × switch | switch 抛 CONFLICT | — | 库零副作用，用户重试 |
| import in-flight × create/rename | 同上 CONFLICT | — | 同上 |
| import 完成（exit 后）× switch | 放行 | — | 原行为零变 |
| reload 后旧事件到达（busy=false） | — | 忽略 | state 不写 |
| 新会话 busy 中旧 sessionId 事件 | — | 滤（异身份） | 进度不被污染 |
| 新会话 busy 中本会话事件 | — | 写 | 原行为 |

## 二、接口层

- `createImportService(deps)` deps 增 `gate: { enter(): void; exit(): void }`（必选）。
- `createWorkspaceService(deps)` deps 增 `importInFlight: () => boolean`（必选）。
- `ServiceDeps`（services/index.ts）增 `importGate`（必选，接线传 import.service）。
- bootstrap：顶层建 gate；`createServices({ importGate: gate, ... })` 与
  `createWorkspaceService({ importInFlight: () => 计数>0, ... })` 两处注入。
- ImportProgressEvent 新字段 sessionId（如上）。

## 三、架构层

- 分层不破：gate 是 main 根装配细节，**禁入 shared**（非跨进程契约）；两服务互不
  import（duck typing 最小接口，共享实现只在 bootstrap）。
- schemas.ts 变更=[locked-change]（locks:unlock→改→locks:apply）。
- ImportDropZone 仍只 import api/client 与 shared 类型（域内自足）。

## 四、生命周期层（测试锚——TDD 红→绿先行）

1. **import.service.test.ts（受锁，[locked-change]）**：
   - 新用例「进度事件全程同 sessionId，两次调用不同」：onProgress 桩收集全部事件，
     断言 Set(sessionId).size===1 且非空字符串；连续两次 importFiles 断言两 id 不同。
   - 新用例「gate enter/exit 各恰一次，failed 路径也 exit」：gate 桩（enter/exit
     计数），批含 bad 文件（走 failed 折叠路径）断言 enter===1/exit===1（finally）。
   - 既有用例零语义变（onProgress 桩多收 sessionId 字段不影响既有断言）。
2. **workspace.test.ts（受锁，[locked-change]）**：
   - 既有三处 `createWorkspaceService` 构造加 `importInFlight: () => false`。
   - 新用例「import in-flight 时 switch/create/rename 抛 CONFLICT 中文且零库副作用」：
     importInFlight: () => true，断言 reject message 含「导入进行中」，且
     closeCalls/assembledDirs 桩计数为零（拒在 closeCurrent 之前）。
3. **ImportDropZone 组件测试**：新建 `tests/unit/renderer/import-dropzone.test.tsx`
   （参照 corpus-export.test.tsx 的 api/apiEvents 桩形态；always-active describe）：
   - ①busy 中同 sessionId 事件→进度文案更新；
   - ②busy 中异 sessionId 事件→文案不变（旧会话污染被滤）；
   - ③busy=false 时事件→不渲染进度（含 state 不写断言）。
   新文件入锁：`npm run locks:generate` 后 apply。
4. e2e 零改（无 import e2e 面；workspaces.spec 无 import 并发面——gate 单测已锚）。

## 五、文化层

- import.service.ts / workspace.service.ts 头注行为层补 gate 互斥与 sessionId 语义；
  ImportDropZone 头注补过滤范式与残余窗声明。
- docs/invariants.md 登记 **INV-52**（import 会话身份两合一——互斥 gate+事件
  sessionId 跨会话迟到过滤；范式=corpus-export INV-18 同族）。登记格式照 INV-50/51。
- 禁新依赖；文件 ≤500 行；UTF-8；中文注释。

## 六、纪律与证据契约（三屋）

- TDD：先红（新用例）→实现→绿；**断言级变异红证**≥2（建议：①gate.exit 挪出
  finally→failed 用例红；②ImportDropZone 异身份过滤删→污染用例红）。
- `npm run test` 禁裸 npx vitest；首红全量套跑口径（vitest run 全量）。
- 证据落盘 `.raw.txt` 后缀（scripts/audits/）：f-d4-red / f-d4-green / f-d4-mutation-*；
  verify 真退出码 `echo exit=$? >>`。
- 受锁面动前 `npm run locks:unlock`，改完即时 `npm run locks:apply`；新增受锁路径
  （import-dropzone.test.tsx）先 `npm run locks:generate`。
- 基线：verify 126 文件 1093 用例（volta 锁 node24，直接 npm run verify）；locks 235。
  本票新增后用例数/locks 数如实报（禁凭印象）。
- 禁 git add/commit/push；禁翻 tickets/registry；卡点=BLOCKED 停手。
- 报告全文落 scripts/audits/f-d4-impl.report.md（实现摘要/文件清单/红证/测试证据/
  locks 实录/自裁申报含删减面 diff 自查/疑虑）；回复五行内。
- 必读序：AGENTS.md→本票面→audit-c-scan.md §1.2-b（病根母本）→corpus-export.store.ts:87-94
  （过滤范式先例）→workspace.service.ts（busy 形态）→import.service.ts（report 形态）→
  ImportDropZone.tsx→tests/unit/renderer/corpus-export.test.tsx（组件测试桩形态）。


## 实现报告全文（含自裁申报 7 项）

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
3 个测试文件红——全部为本票新用例，按预期失败：

1. import.service「进度事件全程同 sessionId，两次调用不同」——旧事件无 sessionId（非空字符串断言红）
2. import.service「gate enter/exit 各恰一次，failed 折叠路径也 exit」——enter 未被调用（计数 0≠1）
3. import.service「域错误抛出路径也必经 finally」——exit 计数 0≠1
4. workspace「import in-flight 时 switch/create/rename 抛中文 CONFLICT 且零库副作用」——无 CONFLICT 抛出
5. dropzone「busy 中异 sessionId 事件→文案不变」——旧会话污染未被滤

（dropzone 其余 3 用例首跑即绿=既有行为锚定用例，预期内；红的要求是「新用例先红」
而非逐条红，5 条核心行为用例全数红。）

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
5. **dropzone 用例③深断言形态**：「state 不写」无法直接观测（渲染已被 busy 门挡），
   采用可观测代理=idle 事件不得锚定 sessionRef（若锚定，后续本会话首事件会被异身份
   过滤误吞——断言其照常更新）。方法论自裁申报。
6. **删减面 diff 自查**：`git diff` 删行清单全量核对——受锁测试文件删行仅 2 处
   （vitest import 行扩容加 describe；l0Session 签名行扩参），**零断言/检查/守卫删减**；
   src 侧删行=import.service.ts 旧 report/importFiles/importFolder 体（重构为带
   sessionId/gate 形态，语义超集）与 ImportDropZone 旧订阅回调（重构为三滤版）。
   `git diff --stat`：9 文件 +243/-37，无范围蔓延（untracked 面为本会话证据文件与
   既往会话残留，未触碰）。
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


## diff 全文（add -N 后，11 文件：10 跟踪修改+1 新测试）

### --stat

```
 docs/invariants.md                                |   1 +
 locks/manifest.json                               |  14 +-
 src/main/bootstrap.ts                             |  20 ++-
 src/main/services/import_/import.service.ts       |  89 ++++++++----
 src/main/services/index.ts                        |   5 +
 src/main/services/workspaces/workspace.service.ts |  17 +++
 src/renderer/features/library/ImportDropZone.tsx  |  27 +++-
 src/shared/ipc/schemas.ts                         |   7 +-
 tests/unit/renderer/import-dropzone.test.tsx      | 161 ++++++++++++++++++++++
 tests/unit/services/import.service.test.ts        |  93 ++++++++++++-
 tests/unit/services/workspace.test.ts             |  21 ++-
 11 files changed, 413 insertions(+), 42 deletions(-)

```

```diff
diff --git a/docs/invariants.md b/docs/invariants.md
index 507380ea8..74651e948 100644
--- a/docs/invariants.md
+++ b/docs/invariants.md
@@ -64,6 +64,7 @@
 | INV-49 | pdfjs 文档生命周期销毁序（F-R3，2026-09-02 AUDIT-C C-1 修票）：①**worker-per-task 事实**——每个未传 worker 的 loadingTask 自带专属 PDFWorker，destroy=唯一终止口；应用面两个创建点句柄必须在册：PdfDocProvider（task 常量+cleanup destroy——既有）与 CorpusExtractor loadPdfDocument（**失败也释放**——settleLoadTask：失败路径 destroy 恰一次且自身拒绝吞并、**await settle 后**重抛原错误；成功路径零 destroy，doc.destroy 归 runExtraction finally——P6 泄漏面已闭）；②**destroy 竞态窗=接受残余**——destroy 落流加载窗内时 pdfjs 4.10.38 worker 泵产生 worker 世界 unhandled rejection（`Error: Worker was terminated`，经 CDP 汇入 pageerror 仪表通道），定性=devtools-only 噪声非破坏型（用户路径零影响，6/6 健康在档）；**不升级裁决**：v5.5.207 已修主逃逸点（onFailure 终接守卫）但同族悬尾（pdfManagerReady 链）master 仍在+destroy() 族硬化（claim 拒绝+_setupCapability）仅 6.3.289 起——任一档位不承诺零同族噪声，跨 major 回归面（INV-30/INV-16/P1 形状/e2e 全量重验）不换 devtools-only 收益（档案=scripts/audits/f-r3-upstream-check.md，逐 tag 可复现）；**升级再评估触发条件**=上游悬尾族全消时连同 destroy() 族硬化一并重评；③监控锚=主进程 console-message level1「getTextContent - ignoring errors…Worker task was terminated」代理计数（F-R3 探针 r7 实证可收）——仅监控不设阈 | PdfDocProvider.tsx 文档生命周期 effect+CorpusExtractor.ts settleLoadTask 与头注状态机表+scripts/audits/f-r3-investigation.md（排查闭环）+f-r3-upstream-check.md（上游查证档案）（F-R3，2026-09-02 登记） | 单测（corpus-extractor.test settleLoadTask 四径：成功不调 destroy/失败 destroy 恰一次/destroy 自身拒绝吞并不覆盖原错误/重抛在 destroy settle 之后——主控补变异 A/B/C 红证在档）——噪声本体无应用面机器断言（库内缺陷接受残余，监控=主进程代理计数备案） | 部分（泄漏面已锚单测级；噪声面=显式接受残余+监控备案） |
 | INV-50 | 弃改=完整弃改（A3，2026-09-02 AUDIT-C C-3 扫描 §1.2-a 修票）：用户显式弃改确认后 notes 悬置面全闭三件套——①**discard API**（notes.store discardPendingEdit/discardAllPendingEdits：清防抖 timer+pendingEdit/touchedFields/lastEditedAt/editSeq 四元数据+条目删除，全幂等）；②**in-flight 代际守卫**（saveSoon 派发快照 discardGen，.then/.catch 回调首行代际已变=全 no-op——防回调经 draftOf 重建已删条目/复活 pending 镜像）；③**接线两点**（tab-dirty confirmCloseDirty 守门内=弃改收口点，**一切 tab 关闭路径必经本守门**——TabBar 双点两位在案；workspace.store switchTo 确认后/await invoke 前=切课题收口，跨域受控例外=check-quality COMPOSITION_ROOT_ALLOW 白名单机器锚）。语义边界：closeAll（App 切视图）非弃改不触发（autosave-first 草稿存活+timer 继续跑）；App dirty 聚合含 notes pending（useTabDirtyAggregate 扫开 tab 键集——clean 直达=no-op 成立）；已接受残余=in-flight save 已派发毫秒窗（DB 落地不可回收；跨课题面由 main 归属校验兜——notes.service papers.findById→NOT_FOUND 显式先行，FK 为第二层）+load 回调 discard 后到达重建条目=服务器基线非弃改内容（复活不可能：pendingEdit 已清必走整版落地） | notes.store.ts discard 族（头注四跨格序列）+tab-dirty.ts confirmCloseDirty（弃改收口点头注）+workspace.store.ts switchTo（A3，2026-09-02 登记） | 单测（notes.store.test discard 族七用例+reject 版序列②——变异 M1~M4+「仅摘 .catch 守卫」变异红证在档）+e2e（reader-text.spec「A3 复活面端到端」：防抖窗内关脏 tab 确认弃改→重开=基线，「已保存」载入锚防假绿）+tab-dirty/workspace.store 接线用例 | 已锚定（单测+e2e 级 A3 本单） |
 | INV-51 | e2e 几何断言的稳态采样口径（F-R2e，2026-09-02 三波场）：跨程几何一致断言（「重开仍在原位」类）的输入必须为**稳态几何**——①标注块几何存在双态瞬态（AnnotationLayer 挂载先渲染存量行盒 fallback→resolve 完成跳 band 收边；实测 y 差 4.44px/h 差 4.97px/正常负载窗 ~8ms——AnnotationLayer.tsx:209 双态表达式）；②两次独立测量调用（boundingBox×2）之间的滚动落帧使 rel 恰偏 Δ（注入实验 dy=Δ 线性，平移不变性只在单帧成立）。故几何断言采样=双采样稳定门（非收敛 fail loudly）+零盒可见性守卫（display:none 形态=未就绪）+单 evaluate 同帧取 rect/canvas 两盒（同帧差值对滚动平移不变）；历史 3.45px 归属未定死（排查档 §4 三候选），修法对三候选全免疫为条件命题——新几何断言一律按本口径写 | reader-text.spec.ts stableRel（头注）+scripts/audits/f-r2e-investigation.md+tests/e2e/z-r2e-probe.spec.ts 双记录器（复现判别留驻）（F-R2e，2026-09-02 登记） | e2e「划选高亮后重开仍在原位」四断言（稳态原子测量）——注入实验红绿双向实证在档（修前路径+注入=dy=3.2 红/同帧测量注入下稳定） | 已锚定（e2e 级本单） |
+| INV-52 | import 会话身份两合一（F-D4，2026-09-02 AUDIT-C D4 修票；范式=corpus-export INV-18 同族）：①**互斥 gate**——import.service importFiles/importFolder 每次调用入口 gate.enter()、finally gate.exit()（尽力而为与域错误抛出路径都必经 finally）；gate=bootstrap 顶层一次创建的闭包计数器（容器 assemble 闭包之外——每层 service 重建但 gate 同一对象，switch 后 in-flight 计数仍跨层有效）；workspace.service create/rename/switch 三入口在 busy 检查旁查 importInFlight()（计数>0）→CONFLICT「导入进行中，请稍后再试」，**先于 closeCurrent/materializeLegacy（拒时零库副作用）**；in-flight 判定=main 侧计数单源，renderer busy 不参与（两进程面各自独立）；拒绝=用户稍后重试（低频窗=大文件夹导入分钟级）②**进度事件 sessionId**——ImportProgressEvent 增 sessionId（min(1)）；每次 importFiles/importFolder 调用入口 randomUUID() 一次，该次调用内全部进度事件（含 scanning/done）同 id；ImportDropZone 订阅回调三滤：busyRef=false 忽略（终局后迟到事件不写 state）+sessionRef 首事件锚定+异身份忽略（runImport 入口重置）——残余窗=新会话 start 后首事件前（旧事件须跨越终局+用户点击两层，理论窗，照 corpus-export.store 注释同口径） | import.service.ts（gate+sessionId 头注）/workspace.service.ts（互斥三入口+跨格序列⑥头注）/bootstrap.ts（gate 顶层创建）/ImportDropZone.tsx（三滤+残余窗头注）/schemas.ts（sessionId 契约）（F-D4，2026-09-02 登记） | 单测（import.service.test F-D4 describe 三用例：全程同 id+两次调用不同/gate 计数 failed 折叠路径/域错误路径 finally exit——变异 M1「exit 挪出 finally」红证在档；workspace.test「import in-flight 时三入口 CONFLICT 中文+closeCalls/assembledDirs 零库副作用」；import-dropzone.test.tsx 四用例：订阅成对退订/本会话写/异身份滤——变异 M2「删异身份过滤」红证在档/idle 不写不锚定） | 已锚定（单测级 F-D4 本单） |
 
 ## 维护规则
 
diff --git a/locks/manifest.json b/locks/manifest.json
index f900ba3ad..4c77be5b6 100644
--- a/locks/manifest.json
+++ b/locks/manifest.json
@@ -1,5 +1,5 @@
 {
-    "generatedAt":  "2026-09-02T11:59:05.7941554Z",
+    "generatedAt":  "2026-09-02T12:29:33.6180225Z",
     "files":  [
                   {
                       "path":  ".github/workflows/ci.yml",
@@ -7,7 +7,7 @@
                   },
                   {
                       "path":  "docs/invariants.md",
-                      "sha256":  "4a82a6facdd2adea530f132b936c76a422a07358bec6f7aa1ec2165328759590"
+                      "sha256":  "37bbbe0fa1b4d07dd6e80731ade51731e91a0dc63493930c40c25b6ecbab3746"
                   },
                   {
                       "path":  "electron.vite.config.ts",
@@ -327,7 +327,7 @@
                   },
                   {
                       "path":  "src/shared/ipc/schemas.ts",
-                      "sha256":  "f6f3dec5104b685baf8f72774490991e22d4c0ef91a40bd38e03532e90d99c52"
+                      "sha256":  "76508df3d5ebe7877feb47e858f9488dbbcc907357543fac4045cf668d95dce9"
                   },
                   {
                       "path":  "src/shared/models/ai-note.ts",
@@ -585,6 +585,10 @@
                       "path":  "tests/unit/renderer/edge-label-layout.test.ts",
                       "sha256":  "95444216a7b010f5a486efa5cb4bf1d67ecca6c91c4f18d29e645a2f713b3da8"
                   },
+                  {
+                      "path":  "tests/unit/renderer/import-dropzone.test.tsx",
+                      "sha256":  "350f8b66d39f44491ad44fa48edd24b01c6b049d36e1c002afa3aa3f7749f52a"
+                  },
                   {
                       "path":  "tests/unit/renderer/keymap.test.ts",
                       "sha256":  "e9cf9ddb57956e898a3610ff8f6a36da32d32e4f0cd65856af1bc12fd0b7d307"
@@ -819,7 +823,7 @@
                   },
                   {
                       "path":  "tests/unit/services/import.service.test.ts",
-                      "sha256":  "31466828c940fe7a4e47e6ccf845905ca85c51c8f90969a8391af5865f066a22"
+                      "sha256":  "fab93765fe4232456d738e4ca5682e3b5ede6ad1e11d7c9a30f11bc2e64b47da"
                   },
                   {
                       "path":  "tests/unit/services/library.service.test.ts",
@@ -871,7 +875,7 @@
                   },
                   {
                       "path":  "tests/unit/services/workspace.test.ts",
-                      "sha256":  "51b776de47a8c2b59bb39c5a716b59a87e1089bf85668a53ac9143546b8ad274"
+                      "sha256":  "1eb186613be8d522183e3d98558b97b9a9548bd5ad5609cee3079a8f3ec16a58"
                   },
                   {
                       "path":  "tests/unit/services/zcode-link.service.test.ts",
diff --git a/src/main/bootstrap.ts b/src/main/bootstrap.ts
index ee5da6ff7..657c4f1d6 100644
--- a/src/main/bootstrap.ts
+++ b/src/main/bootstrap.ts
@@ -86,6 +86,20 @@ export async function bootstrap(app: App): Promise<BootstrapContext> {
   const fetchLike = net.fetch as unknown as typeof globalThis.fetch
   const contactEmail = await readContactEmail(userDataDir)
 
+  // ── import 会话 gate（F-D4 A 面，INV-52）：顶层一次创建——在容器 assemble 闭包
+  //    之外（每层 service 重建但 gate 同一对象）；计数>0=import in-flight，
+  //    workspace 变更三入口互斥判定源。in-flight 判定=main 侧计数单源，renderer
+  //    busy 不参与（两进程面各自独立）──
+  let importInFlightCount = 0
+  const importGate = {
+    enter: () => {
+      importInFlightCount++
+    },
+    exit: () => {
+      importInFlightCount--
+    }
+  }
+
   // ── 数据层容器（课题级可重建；与库无关项=闭包外参——票面 P1）──
   const container = createDataLayerContainer({
     assemble: async (dataDir) => {
@@ -98,6 +112,7 @@ export async function bootstrap(app: App): Promise<BootstrapContext> {
       const services = createServices({
         repos,
         fileStore,
+        importGate,
         contactEmail: () => contactEmail,
         sendProgress: (e) => {
           for (const win of BrowserWindow.getAllWindows()) {
@@ -126,9 +141,12 @@ export async function bootstrap(app: App): Promise<BootstrapContext> {
   await container.assembleInto(layout.dataDir)
 
   // 课题域服务（workspace 管理面在容器外——管理的是容器本身；空库迁移经
-  // initWorkspaceDb 注入——services 层禁直连 db，装配面在 main 根）
+  // initWorkspaceDb 注入——services 层禁直连 db，装配面在 main 根）。
+  // importInFlight=上方 gate 计数（F-D4：import in-flight 时 create/rename/
+  // switch 抛 CONFLICT 中文，拒时零库副作用）
   const workspaceService = createWorkspaceService({
     userDataDir,
+    importInFlight: () => importInFlightCount > 0,
     initWorkspaceDb,
     closeCurrent: () => container.closeCurrent(),
     assembleInto: (dataDir) => container.assembleInto(dataDir)
diff --git a/src/main/services/import_/import.service.ts b/src/main/services/import_/import.service.ts
index e0c190a96..4cf762386 100644
--- a/src/main/services/import_/import.service.ts
+++ b/src/main/services/import_/import.service.ts
@@ -7,6 +7,15 @@
  * - importFolder(folder)：递归找 *.pdf（不区分大小写）；每个一级子目录名 upsert 成
  *   collection 并挂接；根目录文件不挂集合；进度事件持续上报
  * - 单文件失败不中断整批（尽力而为），失败原因进 failed
+ * - 会话身份两合一（F-D4，INV-52）：
+ *   ①gate 互斥——importFiles/importFolder 每次调用入口 gate.enter()，**finally**
+ *     gate.exit()（尽力而为路径/域错误抛出路径都必经 finally）。gate 由 bootstrap
+ *     顶层一次创建（容器 assemble 闭包之外——每层 service 重建但 gate 同一对象），
+ *     workspace.service 的 create/rename/switch 三入口据计数>0 拒绝（CONFLICT 中文，
+ *     拒时零库副作用）。拒绝=用户稍后重试（低频窗=大文件夹导入分钟级）；in-flight
+ *     判定=main 侧计数，renderer busy 不参与（两进程面各自独立）
+ *   ②sessionId——每次调用入口 randomUUID() 生成一次会话 id，该次调用内全部进度
+ *     事件（含 scanning/done）同 id；renderer（ImportDropZone）据它做跨会话迟到过滤
  *
  * ── 接口层 ──
  * - export interface ImportService {
@@ -15,6 +24,7 @@
  *   }
  * - export function createImportService(deps: {
  *     repos: Repos; fileStore: FileStore;
+ *     gate: { enter(): void; exit(): void };
  *     onProgress?: (e: ImportProgressEvent) => void
  *   }): ImportService
  *
@@ -74,18 +84,24 @@ interface PlannedFile {
   position: number
 }
 
+/** 进度事件四字段 core（会话 id 由调用层组装——同次调用全程同 id） */
+type ProgressCore = Omit<ImportProgressEvent, 'sessionId'>
+
 export function createImportService(deps: {
   repos: Repos
   fileStore: FileStore
   /** PDF 元数据抽取（注入便于测试；生产传 extractPdfMeta） */
   extractMeta: (bytes: Uint8Array) => Promise<PdfMetaExtraction>
+  /** 导入互斥 gate（F-D4 A 面：bootstrap 顶层一次创建并注入；enter/exit 必经
+   *  finally 配对——workspace 变更三入口的互斥判定源） */
+  gate: { enter(): void; exit(): void }
   onProgress?: (e: ImportProgressEvent) => void
 }): ImportService {
-  const { repos, fileStore, extractMeta, onProgress } = deps
+  const { repos, fileStore, extractMeta, gate, onProgress } = deps
 
   /** 进度上报（onProgress 未注入时静默，便于无 UI 场景复用） */
-  const report = (e: ImportProgressEvent): void => {
-    onProgress?.(e)
+  const report = (sessionId: string, core: ProgressCore): void => {
+    onProgress?.({ ...core, sessionId })
   }
 
   /** 逐文件流水线结果三态 */
@@ -105,18 +121,19 @@ export function createImportService(deps: {
   async function importOne(
     entry: BatchEntry,
     current: number,
-    total: number
+    total: number,
+    sessionId: string
   ): Promise<OneOutcome> {
     const fileName = fileNameOf(entry.path)
     try {
-      report({ phase: 'copying', current, total, fileName })
+      report(sessionId, { phase: 'copying', current, total, fileName })
       const stored = await fileStore.storePdfFromPath(entry.path)
       // 去重语义（DUPLICATE_FILE）：同 sha 已入库（含本批次先行文件）→ 记文件名跳过，
       // 不抛错不重复入库；受管存储按内容寻址，重复拷贝只是复用既有分桶文件
       if (repos.papers.findBySha256(stored.sha256) !== null) {
         return { kind: 'duplicate', fileName }
       }
-      report({ phase: 'extracting', current, total, fileName })
+      report(sessionId, { phase: 'extracting', current, total, fileName })
       // 从受管副本读字节抽取（内容寻址后即规范副本，无需再碰源文件）
       const meta = await extractMeta(await fileStore.readFileBytes(stored.fileRef))
       const now = new Date().toISOString()
@@ -152,15 +169,15 @@ export function createImportService(deps: {
   }
 
   /** 批驱动：逐个跑流水线并汇成 ImportResult；current 从 1 计数 */
-  async function runBatch(entries: BatchEntry[]): Promise<ImportResult> {
+  async function runBatch(sessionId: string, entries: BatchEntry[]): Promise<ImportResult> {
     const result: ImportResult = { imported: [], duplicates: [], failed: [] }
     for (const [idx, entry] of entries.entries()) {
-      const outcome = await importOne(entry, idx + 1, entries.length)
+      const outcome = await importOne(entry, idx + 1, entries.length, sessionId)
       if (outcome.kind === 'imported') result.imported.push(outcome.summary)
       else if (outcome.kind === 'duplicate') result.duplicates.push(outcome.fileName)
       else result.failed.push({ fileName: outcome.fileName, reason: outcome.reason })
     }
-    report({ phase: 'done', current: entries.length, total: entries.length, fileName: '' })
+    report(sessionId, { phase: 'done', current: entries.length, total: entries.length, fileName: '' })
     return result
   }
 
@@ -218,32 +235,46 @@ export function createImportService(deps: {
   }
 
   return {
-    // 路径列表已给定，无扫描阶段；进度直接从 copying 开始
+    // 路径列表已给定，无扫描阶段；进度直接从 copying 开始。
+    // gate.enter/exit 必经 finally（F-D4 A 面——域错误上抛路径也释放互斥计数）
     async importFiles(paths: string[]): Promise<ImportResult> {
-      return runBatch(paths.map((path): BatchEntry => ({ path, collection: null })))
+      gate.enter()
+      try {
+        const sessionId = randomUUID()
+        return await runBatch(sessionId, paths.map((path): BatchEntry => ({ path, collection: null })))
+      } finally {
+        gate.exit()
+      }
     },
 
     async importFolder(folder: string): Promise<ImportResult> {
-      // 扫描阶段 total 未知（current=0 表示尚未处理任何文件）
-      report({ phase: 'scanning', current: 0, total: 0, fileName: fileNameOf(folder) })
-      const planned = await scanFolder(folder)
-      // 惰性 upsert：只给实际含 PDF 的一级子目录建集合（空目录不产生空集合），幂等可重跑
-      const collectionByName = new Map<string, Collection>()
-      for (const p of planned) {
-        if (p.collectionName !== null && !collectionByName.has(p.collectionName)) {
-          collectionByName.set(
-            p.collectionName,
-            repos.collections.upsertByName(p.collectionName, p.position)
-          )
+      gate.enter()
+      try {
+        const sessionId = randomUUID()
+        // 扫描阶段 total 未知（current=0 表示尚未处理任何文件）
+        report(sessionId, { phase: 'scanning', current: 0, total: 0, fileName: fileNameOf(folder) })
+        const planned = await scanFolder(folder)
+        // 惰性 upsert：只给实际含 PDF 的一级子目录建集合（空目录不产生空集合），幂等可重跑
+        const collectionByName = new Map<string, Collection>()
+        for (const p of planned) {
+          if (p.collectionName !== null && !collectionByName.has(p.collectionName)) {
+            collectionByName.set(
+              p.collectionName,
+              repos.collections.upsertByName(p.collectionName, p.position)
+            )
+          }
         }
+        return await runBatch(
+          sessionId,
+          planned.map((p): BatchEntry => {
+            const collection =
+              p.collectionName === null ? null : collectionByName.get(p.collectionName) ?? null
+            return { path: p.path, collection }
+          })
+        )
+      } finally {
+        gate.exit()
       }
-      return runBatch(
-        planned.map((p): BatchEntry => {
-          const collection =
-            p.collectionName === null ? null : collectionByName.get(p.collectionName) ?? null
-          return { path: p.path, collection }
-        })
-      )
     }
   }
 }
diff --git a/src/main/services/index.ts b/src/main/services/index.ts
index 3629ebe1e..eb8fe8bfa 100644
--- a/src/main/services/index.ts
+++ b/src/main/services/index.ts
@@ -54,6 +54,10 @@ export interface ServiceDeps {
   fileStore: FileStore
   contactEmail: () => string
   http: HttpFns
+  /** 导入互斥 gate（F-D4 A 面，INV-52）：bootstrap 顶层一次创建注入——容器每层
+   *  service 重建但 gate 同一对象；import.service enter/finally exit 配对，
+   *  workspace.service 三入口据计数>0 拒绝（拒时零库副作用） */
+  importGate: { enter(): void; exit(): void }
   /** 导入进度事件出口（main→renderer 推送），bootstrap 注入 */
   sendProgress?: (e: ImportProgressEvent) => void
   /** AI 语料导出会话事件出口（main→renderer 单向——extract-request/progress） */
@@ -94,6 +98,7 @@ export function createServices(deps: ServiceDeps): ServiceBundle {
       repos: deps.repos,
       fileStore: deps.fileStore,
       extractMeta: extractPdfMeta,
+      gate: deps.importGate,
       onProgress: deps.sendProgress
     }),
     enrich: createEnrichService({
diff --git a/src/main/services/workspaces/workspace.service.ts b/src/main/services/workspaces/workspace.service.ts
index c14183695..e66f32d12 100644
--- a/src/main/services/workspaces/workspace.service.ts
+++ b/src/main/services/workspaces/workspace.service.ts
@@ -14,6 +14,7 @@
  * | W-pbad | 指针缺省/损坏/失指 | ensure/list 降级「目录序第一」（不崩——INV-35）；下次写指针自愈 |
  * | W-empty | workspaces/ 在 + 零有效目录 | ensure 建 default 空课题+指针 → W-pvalid |
  * | busy（变更互斥单飞） | service 实例内标志 | 并发 create/rename/switch → CONFLICT 中文；finally 释放 |
+ * | import in-flight（F-D4 A 面） | bootstrap 顶层 gate 计数>0 | create/rename/switch → CONFLICT「导入进行中」中文；**先于** closeCurrent/materializeLegacy（拒时零库副作用） |
  *
  * 跨格序列（审计面）：
  * ① 全新安装：L0(会话1) → 退出 → M(会话2 启动) → W-pvalid(default)
@@ -25,6 +26,11 @@
  *    装配失败=当前层已关（后续库调用报错，busy 已释——switch 后 reload 前的
  *    竞窗由 R1-WS2 确认 dirty 流程收口，本单不补）
  * ⑤ M 断点：db 未移即崩 → 重启 ensure 续迁 → W（测试「崩溃断点续迁」锚定）
+ * ⑥ import in-flight × create/rename/switch（F-D4，INV-52）：三入口在 busy 检查旁
+ *    查 importInFlight() → 抛 CONFLICT（零库副作用，用户稍后重试）。语义边界：
+ *    in-flight 判定=main 侧 gate 计数单源（import.service enter/finally exit），
+ *    renderer busy 不参与（两进程面各自独立）；import 完成（exit 后）三入口放行
+ *    =原行为零变。拒绝窗=大文件夹导入分钟级（低频）
  *
  * ── 接口层 ──
  * - list/create/rename/switch/currentName——IPC 面形状由 ApiHandlers['workspaces']
@@ -70,6 +76,9 @@ export interface WorkspaceServiceDeps {
   closeCurrent: () => void
   /** 在目标目录重建数据层并换容器引用（bootstrap 注入=data-layer.container） */
   assembleInto: (dataDir: string) => Promise<void>
+  /** import in-flight 判定（F-D4 A 面：bootstrap 注入 gate 计数>0——main 侧单源，
+   *  renderer busy 不参与；true 时 create/rename/switch 拒绝，拒时零库副作用） */
+  importInFlight: () => boolean
 }
 
 class WorkspaceDomainError extends Error {
@@ -90,6 +99,11 @@ function wsBusy(): WorkspaceDomainError {
   return new WorkspaceDomainError('CONFLICT', '课题切换进行中，请稍后再试')
 }
 
+/** import in-flight 拒绝（F-D4，INV-52）——用户稍后重试（低频窗=大文件夹导入分钟级） */
+function wsImportInFlight(): WorkspaceDomainError {
+  return new WorkspaceDomainError('CONFLICT', '导入进行中，请稍后再试')
+}
+
 export function createWorkspaceService(deps: WorkspaceServiceDeps) {
   const { userDataDir } = deps
   const rootDir = workspacesRoot(userDataDir)
@@ -149,6 +163,7 @@ export function createWorkspaceService(deps: WorkspaceServiceDeps) {
 
     async create(req: { name: string }) {
       if (busy) throw wsBusy()
+      if (deps.importInFlight()) throw wsImportInFlight()
       busy = true
       try {
         await materializeLegacy()
@@ -163,6 +178,7 @@ export function createWorkspaceService(deps: WorkspaceServiceDeps) {
 
     async rename(req: { id: string; name: string }) {
       if (busy) throw wsBusy()
+      if (deps.importInFlight()) throw wsImportInFlight()
       busy = true
       try {
         await materializeLegacy()
@@ -180,6 +196,7 @@ export function createWorkspaceService(deps: WorkspaceServiceDeps) {
 
     async switch(req: { id: string }) {
       if (busy) throw wsBusy()
+      if (deps.importInFlight()) throw wsImportInFlight()
       busy = true
       try {
         const materialized = await materializeLegacy()
diff --git a/src/renderer/features/library/ImportDropZone.tsx b/src/renderer/features/library/ImportDropZone.tsx
index 741742d6d..be6e07085 100644
--- a/src/renderer/features/library/ImportDropZone.tsx
+++ b/src/renderer/features/library/ImportDropZone.tsx
@@ -6,6 +6,13 @@
  *   「导入文件夹」→ api.import_.fromFolder({})
  * - 拖拽：v1 仅高亮提示"请使用按钮"（webUtils.getPathForFile 需 preload 暴露，v2）
  * - 进行中：订阅 apiEvents.onImportProgress 显示进度（文件名 current/total）
+ * - 进度事件会话身份过滤（F-D4 B 面，INV-52——范式=corpus-export.store INV-18
+ *   同族）：busy=false 时忽略（终局后跨通道迟到事件不写 state——渲染门之外的
+ *   第二道门）；sessionRef 首事件锚定会话身份，异身份忽略（reload 后旧会话残留
+ *   事件不得污染新会话进度显示）；runImport 入口重置 sessionRef=null。busy 的
+ *   订阅回调读旧闭包问题用 busyRef 镜像解决（state 与 ref 双写）。
+ *   残余窗（照 corpus-export.store 注释同口径）：新会话 start 后首事件前——
+ *   旧事件须跨越终局+用户点击两层，理论窗
  * - 完成后 toast 汇总（成功 n/重复 m/失败 k）并经 onImported 通知父级刷新 library.store
  * - 取消（空结果）静默
  *
@@ -16,7 +23,7 @@
  * - 路径全部由 main 侧对话框产生，renderer 无路径（安全 §6.3）
  * - 进度订阅在卸载时退订；busy 期间按钮禁点防重复发起
  */
-import { useEffect, useState } from 'react'
+import { useEffect, useRef, useState } from 'react'
 import type { DragEvent } from 'react'
 import { api, apiEvents, ApiClientError, unwrap } from '../../api/client'
 import type { ImportProgressEvent, ImportResult } from '@shared/ipc/schemas'
@@ -71,15 +78,28 @@ export function ImportDropZone(props: { onImported: () => void }): JSX.Element {
   const [busy, setBusy] = useState(false)
   const [progress, setProgress] = useState<ImportProgressEvent | null>(null)
   const [dragging, setDragging] = useState(false)
+  // busy 镜像（订阅回调读旧闭包问题——state 与 ref 双写，F-D4）
+  const busyRef = useRef(false)
+  // 会话身份锚点：本会话首个进度事件建立；runImport 入口重置（F-D4）
+  const sessionRef = useRef<string | null>(null)
 
-  // 订阅 main 侧导入进度推送；卸载时退订，避免泄漏回调
+  // 订阅 main 侧导入进度推送；卸载时退订，避免泄漏回调。
+  // 三滤（F-D4 B 面，INV-52）：busy=false 忽略 + 异身份忽略 + 首事件锚定
   useEffect(() => {
-    const unsubscribe = apiEvents.onImportProgress(setProgress)
+    const unsubscribe = apiEvents.onImportProgress((e) => {
+      // 终局后迟到事件不改在途相（busy 门挡渲染之外，state 写也挡住）
+      if (!busyRef.current) return
+      if (sessionRef.current === null) sessionRef.current = e.sessionId
+      else if (sessionRef.current !== e.sessionId) return
+      setProgress(e)
+    })
     return unsubscribe
   }, [])
 
   async function runImport(mode: ImportMode): Promise<void> {
     if (busy) return
+    sessionRef.current = null
+    busyRef.current = true
     setBusy(true)
     setProgress(null)
     try {
@@ -92,6 +112,7 @@ export function ImportDropZone(props: { onImported: () => void }): JSX.Element {
       // unwrap 已把 IPC 错误折叠为带中文 message 的 ApiClientError
       showToast(e instanceof ApiClientError ? e.message : IMPORT_FAILED, 'error')
     } finally {
+      busyRef.current = false
       setBusy(false)
       setProgress(null)
     }
diff --git a/src/shared/ipc/schemas.ts b/src/shared/ipc/schemas.ts
index e75a5dd45..950de3e3e 100644
--- a/src/shared/ipc/schemas.ts
+++ b/src/shared/ipc/schemas.ts
@@ -70,13 +70,16 @@ export const importResultSchema = z
   .strict()
 export type ImportResult = z.infer<typeof importResultSchema>
 
-/** 导入进度事件（main→renderer 单向推送） */
+/** 导入进度事件（main→renderer 单向推送）。sessionId=会话身份（F-D4，INV-52）：
+ *  每次 importFiles/importFolder 调用入口生成一次，该次调用内全部事件同 id——
+ *  renderer 订阅回调跨会话迟到过滤锚点（先例=exportProgressEventSchema） */
 export const importProgressEventSchema = z
   .object({
     phase: z.enum(['scanning', 'copying', 'extracting', 'done']),
     current: z.number().int().min(0),
     total: z.number().int().min(0),
-    fileName: z.string()
+    fileName: z.string(),
+    sessionId: z.string().min(1)
   })
   .strict()
 export type ImportProgressEvent = z.infer<typeof importProgressEventSchema>
diff --git a/tests/unit/renderer/import-dropzone.test.tsx b/tests/unit/renderer/import-dropzone.test.tsx
new file mode 100644
index 000000000..d21739b0b
--- /dev/null
+++ b/tests/unit/renderer/import-dropzone.test.tsx
@@ -0,0 +1,161 @@
+// @vitest-environment jsdom
+/**
+ * [F-D4] ImportDropZone 组件合约（INV-52 B 面——always-active，三屋纪律不经
+ * guardedDescribe）：导入进度事件的会话身份过滤（范式=corpus-export.store INV-18
+ * 同族，桩形态参照 corpus-export.test.tsx）：
+ * ①busy 中本会话事件→进度文案更新（原行为零变）；
+ * ②busy 中异 sessionId 事件→文案不变（旧会话污染被滤）；
+ * ③busy=false 时事件→不渲染进度且不锚定会话身份（state 不写深断言）。
+ * 另锁订阅/退订成对（INV-14 消费方级）。
+ */
+import { act } from 'react'
+import { createRoot, type Root } from 'react-dom/client'
+import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
+import type { ImportProgressEvent } from '../../../src/shared/ipc/schemas'
+import type * as clientModule from '../../../src/renderer/api/client'
+import type * as toastModule from '../../../src/renderer/shared/ui/Toast'
+
+/** 桩装配共享位（hoisted——vi.mock 工厂与用例两侧同引用） */
+const { stubApi, onImportProgressSpy, offSpy, toastSpy, holder } = vi.hoisted(() => ({
+  stubApi: {
+    import_: { fromDialog: vi.fn(), fromFolder: vi.fn() }
+  },
+  onImportProgressSpy: vi.fn(),
+  offSpy: vi.fn(),
+  toastSpy: vi.fn(),
+  holder: { cb: null as ((e: ImportProgressEvent) => void) | null }
+}))
+
+vi.mock('../../../src/renderer/api/client', async (importOriginal) => {
+  const real = await importOriginal<typeof clientModule>()
+  return {
+    ...real,
+    api: stubApi as unknown as typeof clientModule.api,
+    apiEvents: { onImportProgress: onImportProgressSpy } as unknown as typeof clientModule.apiEvents
+  }
+})
+vi.mock('../../../src/renderer/shared/ui/Toast', async (importOriginal) => {
+  const real = await importOriginal<typeof toastModule>()
+  return { ...real, showToast: toastSpy }
+})
+
+import { ImportDropZone } from '../../../src/renderer/features/library/ImportDropZone'
+
+// act() 环境声明（library-cards 同口径——免 React 警告刷屏）
+;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
+
+/** 进度事件夹具（缺省 copying 1/2 a.pdf——sessionId 为 F-D4 新增锚点字段） */
+function ev(sessionId: string, patch: Partial<ImportProgressEvent> = {}): ImportProgressEvent {
+  return { phase: 'copying', current: 1, total: 2, fileName: 'a.pdf', sessionId, ...patch }
+}
+
+/** 空结果 resolve 形状（用户取消静默面——reportImportResult 零 toast） */
+const emptyOk = { ok: true as const, data: { imported: [], duplicates: [], failed: [] } }
+type EmptyOk = typeof emptyOk
+
+let root: Root | null = null
+let host: HTMLDivElement | null = null
+
+async function render(node: JSX.Element): Promise<void> {
+  host = document.createElement('div')
+  document.body.appendChild(host)
+  root = createRoot(host)
+  await act(async () => {
+    root?.render(node)
+  })
+}
+
+function findButton(label: string): HTMLButtonElement | undefined {
+  return [...(host?.querySelectorAll('button') ?? [])].find(
+    (b) => (b.textContent ?? '').replace('⟳', '') === label
+  )
+}
+
+async function click(label: string): Promise<void> {
+  const btn = findButton(label)
+  expect(btn, `按钮存在：${label}`).toBeDefined()
+  await act(async () => {
+    btn?.click()
+  })
+}
+
+/** 进度行文案（busy 门内 [role=status]；null=未渲染） */
+function statusText(): string | null {
+  return host?.querySelector('[role="status"]')?.textContent ?? null
+}
+
+async function emit(e: ImportProgressEvent): Promise<void> {
+  expect(holder.cb, '事件回调已注册').not.toBeNull()
+  await act(async () => {
+    holder.cb!(e)
+  })
+}
+
+beforeEach(() => {
+  vi.clearAllMocks()
+  onImportProgressSpy.mockImplementation((cb: (e: ImportProgressEvent) => void) => {
+    holder.cb = cb
+    return offSpy
+  })
+})
+
+afterEach(async () => {
+  await act(async () => {
+    root?.unmount()
+  })
+  host?.remove()
+  root = null
+  host = null
+})
+
+describe('F-D4 ImportDropZone —— 进度事件会话身份过滤', () => {
+  it('挂载即订阅 importProgress；卸载成对退订（INV-14 消费方级）', async () => {
+    await render(<ImportDropZone onImported={() => undefined} />)
+    expect(onImportProgressSpy).toHaveBeenCalledTimes(1)
+    await act(async () => {
+      root?.unmount()
+    })
+    expect(offSpy).toHaveBeenCalledTimes(1)
+  })
+
+  it('busy 中本会话事件→进度文案更新（原行为零变）', async () => {
+    let resolveInvoke!: (v: EmptyOk) => void
+    stubApi.import_.fromDialog.mockImplementation(
+      () => new Promise<EmptyOk>((r) => { resolveInvoke = r })
+    )
+    await render(<ImportDropZone onImported={() => undefined} />)
+    await click('导入 PDF 文件')
+    expect(statusText()).toBe('正在打开选择窗口…')
+    await emit(ev('s1', { phase: 'copying', current: 1, total: 2, fileName: '论文一.pdf' }))
+    expect(statusText()).toBe('复制文件（1/2） 论文一.pdf')
+    await emit(ev('s1', { phase: 'extracting', current: 2, total: 2, fileName: '论文二.pdf' }))
+    expect(statusText()).toBe('提取元数据（2/2） 论文二.pdf')
+    await act(async () => {
+      resolveInvoke(emptyOk)
+      await new Promise((r) => setTimeout(r, 0))
+    })
+    expect(statusText()).toBeNull()
+  })
+
+  it('busy 中异 sessionId 事件→文案不变（旧会话污染被滤）', async () => {
+    stubApi.import_.fromDialog.mockImplementation(() => new Promise<EmptyOk>(() => undefined))
+    await render(<ImportDropZone onImported={() => undefined} />)
+    await click('导入 PDF 文件')
+    await emit(ev('live', { phase: 'copying', current: 1, total: 3, fileName: '本会话.pdf' }))
+    expect(statusText()).toBe('复制文件（1/3） 本会话.pdf')
+    await emit(ev('stale', { phase: 'extracting', current: 3, total: 3, fileName: '旧会话.pdf' }))
+    expect(statusText()).toBe('复制文件（1/3） 本会话.pdf')
+  })
+
+  it('busy=false 时事件→不渲染进度且不锚定会话身份（state 不写）', async () => {
+    stubApi.import_.fromDialog.mockImplementation(() => new Promise<EmptyOk>(() => undefined))
+    await render(<ImportDropZone onImported={() => undefined} />)
+    await emit(ev('stale', { phase: 'done', current: 9, total: 9, fileName: '旧会话.pdf' }))
+    expect(statusText()).toBeNull()
+    // 深断言：idle 事件若写了 state 或锚定了会话身份，后续本会话首事件会被
+    // 异身份过滤误吞——此处必须照常更新
+    await click('导入 PDF 文件')
+    await emit(ev('live2', { phase: 'copying', current: 1, total: 1, fileName: '新会话.pdf' }))
+    expect(statusText()).toBe('复制文件（1/1） 新会话.pdf')
+  })
+})
diff --git a/tests/unit/services/import.service.test.ts b/tests/unit/services/import.service.test.ts
index f36211048..83f2c30d8 100644
--- a/tests/unit/services/import.service.test.ts
+++ b/tests/unit/services/import.service.test.ts
@@ -1,10 +1,11 @@
 import { mkdtemp, rm } from 'node:fs/promises'
 import { tmpdir } from 'node:os'
 import { join } from 'node:path'
-import { afterAll, expect, it } from 'vitest'
+import { afterAll, describe, expect, it } from 'vitest'
 import { createImportService } from '../../../src/main/services/import_/import.service'
 import { createFileStore } from '../../../src/main/services/import_/file-store'
 import type { Repos, PaperRow } from '../../../src/main/db/repos'
+import type { ImportProgressEvent } from '../../../src/shared/ipc/schemas'
 import { createTinyPdf, PDF_KNOWN_TEXT } from '../../utils/pdf-factory'
 import { guardedDescribe } from '../../utils/guard'
 import { createTestDb } from '../../utils/fixtures'
@@ -15,6 +16,9 @@ afterAll(async () => {
   for (const d of dirs) await rm(d, { recursive: true, force: true })
 })
 
+/** 无操作 gate 桩（互斥计数面由 F-D4 新用例单独验证——gate 为必选 deps） */
+const noopGate = { enter: () => undefined, exit: () => undefined }
+
 function makeRepos(db: ReturnType<typeof createTestDb>): Repos {
   // 用真实 repos（SR-DB-05 完成前 guarded 跳过；这是集成性质验收）
   const papers = {
@@ -52,6 +56,7 @@ guardedDescribe('SR-SVC-03', 'import.service —— 导入编排', () => {
     const svc = createImportService({
       repos: makeRepos(db),
       fileStore: createFileStore(join(storeDir, 'managed')),
+      gate: noopGate,
       extractMeta: async () => ({
         title: '',
         authors: ['张三'],
@@ -82,6 +87,7 @@ guardedDescribe('SR-SVC-03', 'import.service —— 导入编排', () => {
     const svc = createImportService({
       repos: makeRepos(db),
       fileStore: createFileStore(join(storeDir, 'managed')),
+      gate: noopGate,
       extractMeta: async () => ({ title: '', authors: [], year: null, doi: null, arxivId: null })
     })
     const first = await svc.importFiles([a])
@@ -104,6 +110,7 @@ guardedDescribe('SR-SVC-03', 'import.service —— 导入编排', () => {
     const svc = createImportService({
       repos: makeRepos(db),
       fileStore: createFileStore(join(storeDir, 'managed')),
+      gate: noopGate,
       extractMeta: async () => ({ title: '', authors: [], year: null, doi: null, arxivId: null })
     })
     const result = await svc.importFiles([bad, good])
@@ -125,6 +132,7 @@ guardedDescribe('SR-SVC-03', 'import.service —— 导入编排', () => {
     const svc = createImportService({
       repos: makeRepos(db),
       fileStore: createFileStore(join(storeDir, 'managed')),
+      gate: noopGate,
       extractMeta: async () => ({ title: '', authors: [], year: null, doi: null, arxivId: null })
     })
     const result = await svc.importFolder(storeDir)
@@ -153,6 +161,7 @@ guardedDescribe('SR-SVC-03', 'import.service —— 导入编排', () => {
     const failed = createImportService({
       repos: brokenRepos,
       fileStore: createFileStore(join(storeDir, 'managed')),
+      gate: noopGate,
       extractMeta: async () => defaults
     })
     const r1 = await failed.importFolder(storeDir)
@@ -165,9 +174,91 @@ guardedDescribe('SR-SVC-03', 'import.service —— 导入编排', () => {
     const retry = createImportService({
       repos: makeRepos(db),
       fileStore: createFileStore(join(storeDir, 'managed')),
+      gate: noopGate,
       extractMeta: async () => defaults
     })
     const r2 = await retry.importFolder(storeDir)
     expect(r2.imported).toHaveLength(1)
   })
 })
+
+/**
+ * [F-D4] import 会话身份两合一（INV-52，always-active——三屋纪律不经 guardedDescribe）：
+ * ①进度事件全程同 sessionId 且两次调用不同；②gate enter/exit 各恰一次
+ * （failed 折叠路径）；③域错误抛出路径也必经 finally exit。
+ */
+describe('F-D4 import.service —— 会话身份（gate 互斥 + sessionId）', () => {
+  it('进度事件全程同 sessionId，两次调用不同（非空字符串）', async () => {
+    const db = createTestDb()
+    const storeDir = await mkdtemp(join(tmpdir(), 'sid-'))
+    dirs.push(storeDir)
+    const { writeFile } = await import('node:fs/promises')
+    const a = join(storeDir, 'a.pdf')
+    const b = join(storeDir, 'b.pdf')
+    await writeFile(a, createTinyPdf())
+    await writeFile(b, createTinyPdf(PDF_KNOWN_TEXT + '2'))
+
+    const events: ImportProgressEvent[] = []
+    const svc = createImportService({
+      repos: makeRepos(db),
+      fileStore: createFileStore(join(storeDir, 'managed')),
+      gate: noopGate,
+      extractMeta: async () => ({ title: '', authors: [], year: null, doi: null, arxivId: null }),
+      onProgress: (e) => events.push(e)
+    })
+    await svc.importFiles([a])
+    const first = events.map((e) => e.sessionId)
+    expect(first.length).toBeGreaterThan(0)
+    expect(first.every((id) => typeof id === 'string' && id.length > 0)).toBe(true)
+    expect(new Set(first).size).toBe(1)
+
+    const beforeSecond = events.length
+    await svc.importFiles([b])
+    const second = events.slice(beforeSecond).map((e) => e.sessionId)
+    expect(new Set(second).size).toBe(1)
+    expect(second[0]).not.toBe(first[0])
+  })
+
+  it('gate enter/exit 各恰一次，failed 折叠路径也 exit（finally）', async () => {
+    const db = createTestDb()
+    const storeDir = await mkdtemp(join(tmpdir(), 'gate-'))
+    dirs.push(storeDir)
+    const { writeFile } = await import('node:fs/promises')
+    const bad = join(storeDir, 'bad.pdf')
+    const good = join(storeDir, 'good.pdf')
+    await writeFile(bad, '这不是 PDF')
+    await writeFile(good, createTinyPdf())
+
+    let enters = 0
+    let exits = 0
+    const svc = createImportService({
+      repos: makeRepos(db),
+      fileStore: createFileStore(join(storeDir, 'managed')),
+      gate: { enter: () => { enters++ }, exit: () => { exits++ } },
+      extractMeta: async () => ({ title: '', authors: [], year: null, doi: null, arxivId: null })
+    })
+    const result = await svc.importFiles([bad, good])
+    expect(result.failed).toHaveLength(1)
+    expect(enters).toBe(1)
+    expect(exits).toBe(1)
+  })
+
+  it('域错误抛出路径也必经 finally：importFolder 读不了文件夹上抛 IO_ERROR 后 exit 恰一次', async () => {
+    const db = createTestDb()
+    const storeDir = await mkdtemp(join(tmpdir(), 'gderr-'))
+    dirs.push(storeDir)
+    let enters = 0
+    let exits = 0
+    const svc = createImportService({
+      repos: makeRepos(db),
+      fileStore: createFileStore(join(storeDir, 'managed')),
+      gate: { enter: () => { enters++ }, exit: () => { exits++ } },
+      extractMeta: async () => ({ title: '', authors: [], year: null, doi: null, arxivId: null })
+    })
+    await expect(svc.importFolder(join(storeDir, '不存在'))).rejects.toMatchObject({
+      code: 'IO_ERROR'
+    })
+    expect(enters).toBe(1)
+    expect(exits).toBe(1)
+  })
+})
diff --git a/tests/unit/services/workspace.test.ts b/tests/unit/services/workspace.test.ts
index 556ec9cb5..e3a115ca2 100644
--- a/tests/unit/services/workspace.test.ts
+++ b/tests/unit/services/workspace.test.ts
@@ -83,7 +83,7 @@ function openMigrated(dbPath: string): SqliteDb {
  * L0 会话夹具（门一 W1/W2 回炉）：真库在 userData 根（含行 p0）+ service 注入
  * 记录器（close 计数/装配目录序列/下一次装配注入失败开关）。
  */
-async function l0Session(prefix: string): Promise<{
+async function l0Session(prefix: string, opts?: { importInFlight?: () => boolean }): Promise<{
   u: string
   svc: ReturnType<typeof createWorkspaceService>
   cur: { db: SqliteDb | null }
@@ -101,6 +101,7 @@ async function l0Session(prefix: string): Promise<{
   const dirs: string[] = []
   const svc = createWorkspaceService({
     userDataDir: u,
+    importInFlight: opts?.importInFlight ?? (() => false),
     initWorkspaceDb,
     closeCurrent: () => {
       ref.db?.close()
@@ -194,6 +195,7 @@ describe('ensureWorkspaceLayout —— 遗留迁移/幂等/指针降级/全新
     await ensureWorkspaceLayout(u)
     const svc = createWorkspaceService({
       userDataDir: u,
+      importInFlight: () => false,
       initWorkspaceDb,
       closeCurrent: () => undefined,
       assembleInto: async () => undefined
@@ -231,6 +233,7 @@ describe('workspace.service —— list/create/rename/switch/currentName', () =>
     let cur: SqliteDb = db
     const svc = createWorkspaceService({
       userDataDir: u,
+      importInFlight: () => false,
       initWorkspaceDb,
       closeCurrent: () => cur.close(),
       assembleInto: async (dir) => {
@@ -272,6 +275,7 @@ describe('workspace.service —— list/create/rename/switch/currentName', () =>
     await ensureWorkspaceLayout(u)
     const svc = createWorkspaceService({
       userDataDir: u,
+      importInFlight: () => false,
       initWorkspaceDb,
       closeCurrent: () => undefined,
       assembleInto: async () => undefined
@@ -295,6 +299,7 @@ describe('workspace.service —— list/create/rename/switch/currentName', () =>
     const assembled: string[] = []
     const svc = createWorkspaceService({
       userDataDir: u,
+      importInFlight: () => false,
       initWorkspaceDb,
       closeCurrent: () => cur.close(),
       assembleInto: async (dir) => {
@@ -330,6 +335,7 @@ describe('workspace.service —— list/create/rename/switch/currentName', () =>
     })
     const svc = createWorkspaceService({
       userDataDir: u,
+      importInFlight: () => false,
       initWorkspaceDb,
       closeCurrent: () => {
         cur?.close()
@@ -406,6 +412,19 @@ describe('workspace.service —— list/create/rename/switch/currentName', () =>
     expect(() => cur.db?.prepare('SELECT 1')).not.toThrow() // 容器等价句柄可用
     cur.db?.close()
   })
+
+  it('F-D4 import in-flight 时 switch/create/rename 抛中文 CONFLICT 且零库副作用（拒在 closeCurrent 之前）', async () => {
+    const { svc, closeCalls, assembledDirs, cur } = await l0Session('synapse-ws-d4-', {
+      importInFlight: () => true
+    })
+    await expect(svc.switch({ id: DEFAULT_WS_ID })).rejects.toMatchObject({ code: 'CONFLICT' })
+    await expect(svc.switch({ id: DEFAULT_WS_ID })).rejects.toThrow(/导入进行中/)
+    await expect(svc.create({ name: '课题X' })).rejects.toThrow(/导入进行中/)
+    await expect(svc.rename({ id: DEFAULT_WS_ID, name: '改名X' })).rejects.toThrow(/导入进行中/)
+    expect(closeCalls()).toBe(0)
+    expect(assembledDirs()).toEqual([])
+    cur.db?.close()
+  })
 })
 
 describe('data-layer.container —— 稳定 facade 热换（ipc/协议层零改动的机制面）', () => {

```

## 输出纪律（必读）

先统计行「B:N/W:N/N:N+总评一句」；逐条展开引证据（文件/行/摘录）；末行放行判定（放行/回炉+回炉点）；200 行内；你看不见仓库——结论只能来自本材料包；不确定写存疑。
