# 架构（architecture）

> 本文 ≤300 行的活文档；模块职责的正本在**每个源文件的头部规约注释**里（工单号索引）。

## 1. 进程与分层

```
Renderer (React SPA, sandbox, 无 Node)
   │ 只经 window.api（preload contextBridge 白名单）
Main (Node)
   ipc/ 薄分发 ──→ services/ 业务用例 ──→ repos/ 数据访问 ──→ db/ (SQLite)
   file-store 受管文件   app-file:// 协议   http-client（host 白名单）
shared/ = 两进程共同 import 的唯一契约（类型 + zod 同源，冻结）
```

依赖规则（ESLint + CI 强制）：
- `renderer → shared`；`renderer ↛ main/preload/electron/node`
- `main → shared`；main 内 `ipc → services → repos → db` 禁跨层（services 禁 import connection；ipc 禁 import repos）
- renderer 内 features 域之间禁止互相 import（共享下沉 `renderer/shared`），由 `check-quality.mjs` 扫描

## 2. 数据流示例（导入一篇 PDF）

1. renderer：`window.api.import_.fromDialog({})`（无任何路径）
2. main ipc/import_：`dialog.pickPdfFiles()` → `services.import_.importFiles(paths)`
3. service：`fileStore.storePdfFromPath`（sha256 去重 + 受管目录）→ `extractPdfMeta`（标题/DOI）→ `repos.papers.insert`
4. 进度：service `onProgress` → bootstrap 注入的 `webContents.send('import/progress/event')`
5. renderer 读 PDF：`api.reader.open` 返回 `app-file://<paperId>` → 协议在 main 侧查 file_ref、前缀校验后流式返回

## 3. 契约机制（防漂移的核心）

- `src/shared/ipc/api-surface.ts` 是 IPC 的**单一接线表**：通道名 + Req/Res zod schema。
- preload 按表生成桥；`ipc/register.ts` 按表注册（zod 校验→service→Result 折叠，横切只写一次）；service 接口类型 `ApiHandlers` 由表推导——漏/多通道 = 编译错误。
- 所有响应 = `{ok:true,data} | {ok:false,error:{code,message}}`；`AppErrorCode` 封闭枚举。
- 契约文件受锁（sha256 对账），改动需 [locked-change]。

## 4. 骨架期机制（工单填充模式）

- 每个文件头部五层规约（行为/接口/架构/生命周期/文化）= 弱模型的自包含任务书。
- 未完成实现 = `unimplementedObject(ticket)`（方法调用时抛）或 UI 占位（`data-ticket` 徽标）。
- `tickets/registry.ts` 控制测试激活：`guardedDescribe(ticketId)` 在工单 open 时 skip，翻 done 即激活——main 恒绿、防"不实现就翻状态"。
- 三道 CI 关卡：quality（占位/乱码/跨域引用）、tickets（工单号一致性）、locks（sha256 对账）。

## 5. 关键设计决策

见 `docs/adr/`：AD-1 Electron 单语言；AD-2 pdf.js 库 API 路线（含 Phase 3 决策门）；AD-3 FTS5 触发器同步；AD-4 工单/锁机制；AD-5 版本钉选（弱模型训练数据友好）。

## 6. 数据模型

7 张表 + 3 个 FTS5（external content + 触发器）：papers / collections / paper_collections / tags / paper_tags / annotations / notes。标注定位器采用 W3C Web Annotation 思路（quote/prefix/suffix + startOffset/endOffset + rects + sortKey）。迁移只追加（`db/migrations/`，受锁）。
