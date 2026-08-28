# R1-WS1 实现者报告——课题域主进程（装配容器化+workspaces IPC 域+遗留迁移）

> 票面：scripts/audits/r1-ws1-brief.md v1；裁决母本：ADR-0018。
> 三屋角色：实现者子代理（禁 git/registry，全程未触）。

## 1. 实现摘要

- **P1 装配容器化**：bootstrap 数据层段（原 :62-95）抽为 `assemble(dataDir)` 闭包外参函数
  （BrowserWindow 广播/contactEmail/zcodeBaseDir/templateDir/http/aiSensorRootDir 均闭包外参），
  经 `createDataLayerContainer` 持模块内可变 `current` + 稳定 facade；
  `registerIpc({...createIpcHandlers({ services: container.services, ... }), workspaces: svc})`
  ——**ipc/index.ts 与 ipc/register.ts 零 diff（git diff 实证）**，`deps.services` 消费形态不变；
  协议回调 `(paperId) => container.papersFileRef(paperId)`+`container.fileStore`（bootstrap 一处）。
- **P2 workspace.service**：`workspaces/<id>/`（id=`ws-`+8 hex 短随机，用户名永不入路径）；
  `<id>/meta.json`={name,createdAt}；指针 `userData/workspace.json`{currentId}（原子写 tmp+rename）；
  list/create/rename/switch/currentName；常量只住本域文件（未入 shared/constants.ts）。
- **P3 遗留迁移**：启动最早段 `ensureWorkspaceLayout`；条件=**遗留 synapse.db 在 && default 库不在**
  （较票面字面「workspaces/ 不存在」更强——支持断点续迁，防孤儿库；理由见 §4 自裁 2）；
  搬移序 files/→-wal→-shm→synapse.db（db=提交点）→meta.json→指针；幂等。
- **P4 IPC 域**：`workspaces/list|create|rename|switch` 四通道入 API_SURFACE（严格 schema，
  name 1-40=WORKSPACE_NAME_MAX 单源）；schemas.ts+api-surface.ts+contracts 测试 [locked-change] 扩容。
- **分层合规**（实现中撞 ESLint 分层线后归位）：db 直连（openDatabase/migrate）上提 main 根
  ——`src/main/workspace-layout.ts`（启动布局+initWorkspaceDb）与 `src/main/data-layer.container.ts`
  （装配面，bootstrap 同权）；services 层禁触 db/connection|migrate（eslint no-restricted-imports），
  服务空库迁移经 `initWorkspaceDb` 回调注入（依赖倒置）。

## 2. 文件清单

新增：
- `src/main/services/workspaces/workspace.fs.ts`（180 行：常量/指针/meta/目录扫描/迁移搬移，纯 fs）
- `src/main/services/workspaces/workspace.service.ts`（200 行：五方法+busy 守卫+状态机头注，零 db import）
- `src/main/workspace-layout.ts`（77 行：ensureWorkspaceLayout/initWorkspaceDb/createWorkspaceOnDisk）
- `src/main/data-layer.container.ts`（95 行：liveProxy facade+papersFileRef+assembleInto/closeCurrent）
- `tests/unit/services/workspace.test.ts`（343 行，always-active，11 用例，真临时目录+真 SQLite）

修改：
- `src/main/bootstrap.ts`（+112/-46 段重构：布局最早段→容器装配→组合 workspaces 域→shutdown 经容器）
- `src/shared/ipc/schemas.ts` [+locked-change]（workspaces 六 schema+WORKSPACE_NAME_MAX）
- `src/shared/ipc/api-surface.ts` [+locked-change]（workspaces 四通道+ComposedHandlerDomains 类型面）
- `tests/contracts/api-surface.test.ts` [+locked-change]（域枚举扩容+workspaces 域校验新 it）
- `docs/invariants.md`（INV-35 一行，不受锁）
- `locks/manifest.json`（145→146：+新测试路径；3 受锁文件 sha 刷新）

零改动实证：`src/main/ipc/index.ts`、`src/main/ipc/register.ts`（git diff 空）；
`src/preload/index.ts`、`src/renderer/api/client.ts`、`src/renderer/env.d.ts`、tests/e2e/**（表驱动自动扩容/无需改）。

## 3. 状态机表（宪法前置；全文见 workspace.service.ts 头注）

| 态 | fs 事实 | 事件→迁移 |
| --- | --- | --- |
| L0 legacy-fresh | workspaces/ 无（本会话库=userData 根） | list=零副作用合成 default；create/rename/switch→物化（close→M→重建 default）→W |
| M 迁移进行 | mkdir default→files→wal→shm→db→meta+指针 | 完成→W-pvalid；半程崩溃→重启条件仍真→续迁（无孤儿库） |
| W-pvalid | workspaces/ 在+指针 id∈目录集 | switch(X)：busy→关旧→指针 X→装配 X→W-pvalid(X) |
| W-pbad | 指针缺省/损坏/失指 | 降级「目录序第一」不崩（INV-35）；下次写指针自愈 |
| W-empty | workspaces/ 在+零有效目录 | ensure 建 default 空课题→W-pvalid |
| busy | 变更互斥单飞标志 | 并发 create/rename/switch→CONFLICT 中文；finally 释放 |

跨格序列 ①~⑤（含 e2e 种子配方兼容链、L0 内 create、switch 竞窗声明）见头注原文。

## 4. 首红/变异红证+还原证据

- **首红**：测试初建即跑=`Error: Failed to load url .../workspace.fs ... Does the file exist?`
  （96 文件 746 用例基线不动，exit 1）→ `scripts/audits/r1-ws1-first-red.log`。
- **变异 A**（删 switch busy 守卫）：busy it 红（1 failed/10 passed，exit 1）→ cp 还原 diff 空。
- **变异 B**（删 needsLegacyMigration 迁移分支）：迁移 it+断点续迁 it 红（3 failed/8 passed，exit 1）
  → cp 还原 diff 空 → 复跑 11 passed。
- A/B 均在 lint 重构后的**现态代码**上复证（首轮变异在重构前，重跑以铁证）；
  全程 cp 备份法（未用 git checkout），证据段= `scripts/audits/r1-ws1-verify.log` 尾部。

## 5. facade 形态自裁申报

**选 Proxy（liveProxy 通用 get 陷阱）**：ServiceBundle 10 域×N 方法，显式委托对象需逐方法重声明、
新增服务双处维护（违 INV-11 单源精神）；Proxy 动态转发与 app-error.unimplementedObject 先例同型。
函数值绑回真实 owner 防 this 丢失；域对象经 facade 返回后方法调用落在真实对象上（this 语义保持）；
装配前访问=显式中文错误（INV-02 族，不静默 undefined）。

## 6. 自裁申报（超票面/与票面字面偏离项）

1. **L0 legacy-fresh 首启态（关键偏离，e2e 兼容的硬前提）**：票面 P3 字面条件
   「workspaces/ 不存在才迁」+P2「无目录=建 default」会在受锁 e2e 种子配方下崩溃——
   8 个 spec 共 24 测的通用配方=首跳 launch 建库于 `userData/synapse.db`（schema 在）→close→
   种子 INSERT 直写该路径+PDF 写 `userData/files/`→二跳读种子。若首跳即建 workspaces/default，
   种子 INSERT 落在无表空库上必崩（seed-paper.mjs 无建表）。故全新首启保持库在 userData 根、
   不建 workspaces/（L0 态），**物化延迟到二次启动迁移或会话内首个变更操作**；
   迁移条件随之强化为「遗留 db 在 && default 库不在」（断点续迁，见 §1）。
2. **ApiHandlers 的 workspaces 域可选（ComposedHandlerDomains）**：ipc/index.ts 零改动的
   类型代价——createIpcHandlers 返回面不含该域仍编译自洽，registerIpc 前由 bootstrap 组合补齐
   （表驱动注册/校验不变）。代价=漏组合不再编译期拦，补偿=contracts 枚举含 workspaces+
   域校验 it+单测/e2e；已在 api-surface.ts 注释申报。供门一复核。
3. **busy 守卫覆盖 create/rename/switch 三变更**（票面字面只 switch）：L0 物化路径会关当前库，
   三者共用单飞标志防交叉；并发 switch 仍返回中文 CONFLICT DomainError（票面主面不变）。
4. **db 直连上提 main 根**：票面 P1 未预见 ESLint 分层线（services 禁 db/connection|migrate）；
   workspace-layout.ts+data-layer.container.ts 落 main 根（bootstrap 同权装配面），
   服务层经 initWorkspaceDb 注入。
5. **「五方法」对账**：P4「renderer api/client.ts workspaces 五方法」按机制=零改动
   （client=window.api 的 PreloadApi 派生，四通道自动暴露）；「五」应为 P2 服务方法数
   （含 currentName——无 IPC 通道，WS2 备用，测试消费防死代码）。
6. rename 的 Res=trueAckSchema {ok:true}（「→void」按 deleteAnnotation 先例收口为真 ack）。

## 7. locks 实录

- 受锁面核查：schemas.ts/api-surface.ts/contracts 三件在 manifest（unlock→改→generate→apply）；
  preload/index.ts 与 docs/invariants.md **不在锁内**（核对 manifest 146 条，直改）。
- 新测试路径 tests/unit/services/workspace.test.ts：locks:generate→apply 入册；
  lint 重构后二次 unlock→改→generate→apply（sha 刷新）；locks:check 通过（146 一致）。
- manifest 提交须带 [locked-change] 尾注（收口单职责）。

## 8. verify + e2e 真退出码

- `npm run verify`：**VERIFY_EXIT=0**（quality+tickets+locks 146+lint+typecheck+test+build）；
  单测 **97 文件 758 用例全绿**（基线 96/746，+1 文件 +12 用例=本单 11+contracts 1，与票面
  「基线+增量自报」口径一致；票面 §3 的 95/741 为陈数，以首红实测 96/746 为基）。
  日志：`scripts/audits/r1-ws1-verify.log`。
- `npm run test:e2e`：**24 passed（0 skip），E2E_EXIT=0**（1.2m）——迁移兼容=核心验收达成。
  日志：`scripts/audits/r1-ws1-e2e.log`。
- 无 TODO/FIXME/placeholder（grep 净）；新文件中文 UTF-8 可读；全部 ≤500 行（max 343）。

## 9. 疑虑（供门一/门二）

- ApiHandlers.workspaces 可选的类型级弱化是否可接受（§6-2，已有测试补偿）。
- switch 装配失败竞窗：旧库已关+新库未装配间，其他通道调用将见库错误（busy 已释、错误经
  register 折叠为 Result）——头注声明归 R1-WS2 确认 dirty+reload 流程收口，本单未补。
- L0 会话的 list() 合成 default（createdAt=库文件 mtime）——WS2 消费面注意与物化后
  meta.createdAt（迁移时库 mtime）一致连续。
- 乱码防线注记：locks:check 控制台输出偶见编码噪声（PowerShell 管道），文件内容无乱码
  （quality:check mojibake 关卡绿）。

## 10. 回炉节（门一裁决 0B/3W/4N——W1+W2 归本单补齐，W3 归 WS2；2026-08-28）

- **范围**：仅加测试，零实现变更（实测零变更——3 it 一次绿，与门一预期一致）。
- **W1-a**（switch「materialized && id===DEFAULT 提前返回」分支）：L0 夹具（l0Session：真库在
  userData 根含行 p0+close 计数/装配序列/失败注入记录器）→ list 只见 default →
  switch('default')=物化+提前返回：close×1/装配恰 [default]（无二段重建）、根库清空、
  default 行不丢、指针=default、会话句柄=物化重建产物活。
- **W1-b**（L0 切非 default=物化+切换二合一分支）：create(B)（不切指针）→ switch(B)：
  close×2、装配序列恰 [default(物化), B(切换)]、default 旧句柄失效、B 库句柄活、
  default 行完整、根库不存在、指针=B。
- **W2**（装配失败重试幂等）：failNextAssemble 注入 → 首次 switch 上抛中文
  /装配失败/ → 重试不被 CONFLICT 拒（busy 已释锚定）→ 成功后指针终态=B、
  失败前旧句柄已关、装配恢复句柄可用。
- **用例数**：workspace.test.ts 11→14（343→448 行，≤500）；全量单测 758→761；
  verify VERIFY_EXIT=0（97 文件）；locks unlock→改→generate→apply（146 一致）；
  e2e 面未动（24 passed 基线不变）。证据：r1-ws1-verify.log「== 回炉」节。

## 11. 回炉2节（门二终审 PASS 附微补丁：W4+N5；2026-08-28）

- **W4 死断言复活**：workspace.test.ts 原 :439 「旧库已关」与「marker===dirB」两断言在
  首轮容器测试编辑时换行丢失被 // 注释吞并一行（第二断言永不执行）。拆两行复活 →
  **一次绿**（非真缺陷——热换后 services facade 活指向新课题成立，同族
  fileStore resolveManagedPath/papersFileRef 活断言原已绿）。
- **N5 空态中文断言**：closeCurrent 后经 services facade 访问 =
  `toThrow(/课题数据层未装配/)`（容器显式中文错误防线直接锚定，INV-02 族）。
- **流程**：unlock→两处改→14/14 绿→generate→apply（146 一致）→全量 verify
  VERIFY_EXIT=0（97 文件 761 用例——用例数不变：断言复活非新增 it）。
  证据：r1-ws1-verify.log「== 回炉2」节。
