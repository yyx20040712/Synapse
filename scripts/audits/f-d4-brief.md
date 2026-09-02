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
