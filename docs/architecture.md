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

依赖规则（ESLint + check-quality 双重强制）：
- `renderer → shared`；`renderer ↛ main/preload/electron/node`（glob 含裸目录形式）
- `main → shared`；main 内 `ipc → services → repos → db` 禁跨层：ipc 禁 import repos/db；
  services 禁 import connection/migrations 与 main/ipc；**db 禁反向 import services/ipc
  及一切上层**。方向性规则由 `check-quality.mjs` 按解析后绝对路径强制（ESLint glob
  分不清 `shared/ipc` 契约与 `main/ipc` 层）
- renderer 内 features 域之间禁止互相 import（共享下沉 `renderer/shared`），由 `check-quality.mjs` 扫描

## 2. 数据流示例（导入一篇 PDF）

1. renderer：`window.api.import_.fromDialog({})`（无任何路径）
2. main ipc/import_：`dialog.pickPdfFiles()` → `services.import_.importFiles(paths)`
3. service：`fileStore.storePdfFromPath`（sha256 去重 + 受管目录）→ `extractPdfMeta`（标题/DOI）→ `repos.papers.insert`
4. 进度：service `onProgress` → bootstrap 注入的 `webContents.send('import/progress/event')`
5. renderer 读 PDF：`api.reader.open` 返回 `app-file://<paperId>` → 协议在 main 侧查 file_ref、前缀校验后流式返回

## 3. 契约机制（防漂移的核心）

- `src/shared/ipc/api-surface.ts` 是 IPC 的**单一接线表**：通道名 + Req/Res zod schema。
- preload 按表生成桥（**CJS `.cjs` 输出**——沙箱渲染器不支持 ESM preload；zod 打进
  bundle）；`ipc/register.ts` 按表注册（zod 校验→service→Result 折叠，横切只写一次）；
  service 接口类型 `ApiHandlers` 由表推导——漏/多通道 = 编译错误。事件桥形状
  `PreloadEvents` 与全局声明 `env.d.ts` 同源，禁止两处手写。
- 所有响应 = `{ok:true,data} | {ok:false,error:{code,message}}`；`AppErrorCode` 封闭枚举。
- CSP 单真相源：策略只在 `src/main/security/csp.ts`，构建期 cspMetaPlugin 注入
  index.html meta（生产 file:// 下 meta 是实际防线），源码 html 禁止手写。
- 契约文件受锁（sha256 对账），改动需 [locked-change]。

## 4. 骨架期机制（工单填充模式）

- 每个文件头部五层规约（行为/接口/架构/生命周期/文化）= 弱模型的自包含任务书。
- 未完成实现 = `unimplementedObject(ticket)`（方法调用时抛）或 UI 占位（`data-ticket` 徽标）。
- `tickets/registry.ts` 控制测试激活：`guardedDescribe(ticketId)` 在工单 open 时 skip，
  翻 done 即激活——main 恒绿、防"不实现就翻状态"；**未知工单号当场抛错**（防整组
  测试静默消失），tests 内只允许引用真实存在的工单号。
- 三道 CI 关卡：quality（占位/乱码/跨域引用 + 行数分级 repo≤300/组件≤250 + 分层
  方向解析检查）、tickets（工单号一致性，**含 tests 目录扫描**）、locks（sha256 对账，
  行尾由 `.gitattributes` 强制 LF）。

## 5. 关键设计决策

见 `docs/adr/`：AD-1 Electron 单语言；AD-2 pdf.js 库 API 路线（含 Phase 3 决策门）；
AD-3 FTS5 触发器同步（trigram）；AD-4 工单/锁机制；AD-5 版本钉选（弱模型训练数据友好）；
AD-6 Electron 升级延期至打包门。阶段编排见 `docs/ROADMAP.md`。

## 6. 数据模型

7 张表 + 3 个 FTS5（external content + 触发器）：papers / collections / paper_collections / tags / paper_tags / annotations / notes。标注定位器采用 W3C Web Annotation 思路（quote/prefix/suffix + startOffset/endOffset + rects + sortKey）。迁移只追加（`db/migrations/`，受锁）。

## 7. 架构图纸（2026-08-21 修复轮起；状态标注：✅已实现 / 🚧占位待工单）

### 7.1 系统全景（三进程 + 外部边界）

```mermaid
flowchart TB
  subgraph R["Renderer 进程（沙箱 · 无 Node · CSP 封边）"]
    direction TB
    UI["React SPA ✅壳+文献库闭环 · 🚧阅读器/其余<br/>features: library ✅ · reader · notes · tags · settings 🚧"]
    WA["window.api / apiEvents ✅<br/>（contextBridge 白名单桥，逐通道生成）"]
    UI --> WA
  end

  subgraph M["Main 进程（Node 20 · 单实例锁）"]
    direction TB
    REG["ipc/register.ts ✅<br/>zod strict 校验 → Result 信封"]
    SVC["services/ ✅SVC-01/03/04 · 🚧其余 7<br/>业务用例 · 事务编排"]
    REPO["repos/ ✅ SR-DB-01~05<br/>db.prepare 参数绑定"]
    DB[("SQLite ✅ connection/migrate/fts<br/>WAL + FK + FTS5 触发器同步")]
    PROTO["app-file:// 协议 ✅<br/>paperId → file_ref → 前缀校验"]
    FSTORE["file-store ✅<br/>sha256 去重 · 受管目录"]
    HTTP["http-client ✅<br/>白名单 · redirect:error · 20MB 上限"]
  end

  subgraph E["外部（全部仅手动触发）"]
    CR["CrossRef"]:::ext
    OA["OpenAlex"]:::ext
    AX["arXiv"]:::ext
    DLG["系统对话框（选 PDF / 保存）"]
    BRW["系统浏览器（openExternalGuarded）"]
  end

  WA == "invoke(channel, req)" ==> REG
  REG --> SVC --> REPO --> DB
  SVC --> FSTORE
  SVC --> HTTP -.-> CR & OA & AX
  SVC == "webContents.send(import/progress)" ==> WA
  UI -- "app-file://paperId（无路径）" --> PROTO --> FSTORE
  M -.-> DLG & BRW
  classDef ext fill:#eee,stroke:#999,stroke-dasharray: 5 5
```

### 7.2 主进程分层与依赖方向（违者 CI 红）

```mermaid
flowchart LR
  subgraph SHARED["src/shared（受锁 · 契约冻结）"]
    SURF["api-surface.ts 接线表<br/>通道 + Req/Res zod"]
    MODELS["models/* + schemas.ts"]
    ERR["app-error.ts Result/错误码"]
  end
  IPC["ipc/* 薄分发 🚧<br/>禁 import repos/db"] --> SVC2["services/* 🚧<br/>禁 import connection/migrations"]
  SVC2 --> REPO2["repos/* 🚧<br/>禁 import 上层"]
  REPO2 --> CONN["db/connection.ts ✅<br/>WAL·FK·busy_timeout"]
  MIG["db/migrations/*.sql（受锁）✅"] --> CONN
  FTS["db/fts.ts escapeFtsQuery ✅"] --> REPO2
  SEC["security/ csp + shell-guard ✅"] --> BOOT["bootstrap.ts 装配根 ✅"]
  WIN["windows/ main-window ✅<br/>sandbox·contextIsolation·禁导航"] --> BOOT
  BOOT --> IPC
  IPC -.->|类型| SURF
  SVC2 -.->|类型 ApiHandlers| SURF
  SURF --- MODELS & ERR
```

### 7.3 数据流 A：导入一篇 PDF（Phase 2 目标链路）

```mermaid
sequenceDiagram
  autonumber
  participant UI as renderer<br/>ImportDropZone 🚧SR-LIB-06
  participant P as preload ✅
  participant I as ipc/import_ 🚧SR-IPC-05
  participant S as import.service 🚧SR-SVC-03
  participant F as file-store ✅
  participant R as papers.repo 🚧SR-DB-01
  participant D as SQLite ✅

  UI->>P: api.import_.fromDialog({})
  P->>I: invoke("import/from-dialog")
  I->>I: Req zod strict 校验
  I->>S: importFiles(dialog.pickPdfFiles())
  Note over I,S: 路径只存在于 main 侧
  S->>F: storePdfFromPath(path)
  F-->>S: {paperId, sha256} / DUPLICATE_FILE
  S->>S: extractPdfMeta（标题/DOI）
  S->>R: insert(paper)（跨表事务）
  R->>D: db.prepare 参数绑定
  S-->>P: 进度 onProgress → send("import/progress")
  S-->>UI: ImportResult {added, duplicates, failed}
```

### 7.4 数据流 B：阅读与标注锚定（Phase 3/4 目标链路）

```mermaid
flowchart TB
  A["双击文献<br/>library.openPaper 🚧"] --> B["api.reader.open(paperId)"]
  B --> C["reader.service 🚧SR-SVC-02<br/>file_ref 查询 + lastReadPage"]
  C --> D["fileUrl = app-file://paperId<br/>（renderer 全程无路径）"]
  D --> E["PdfCanvas 🚧SR-RDR-02<br/>唯一 import pdfjs-dist；worker ?url"]
  E --> F["TextLayer 🚧SR-RDR-03<br/>--scale-factor 必设（旧项目教训）"]
  F --> G["SelectionLayer 🚧SR-RDR-05<br/>划选 → 定位器三元组"]
  G --> H["annotation-anchor 🚧SR-RDR-01（strong）<br/>quote+prefix+suffix / start-end / rects 三重定位"]
  H --> I["AnnotationLayer 🚧SR-RDR-06<br/>重开时 verifyQuote 重锚，失败回退 rects"]
  H --> J["持久化：annotations.repo 🚧SR-DB-03"]
  subgraph NOTE["窗口尺寸变化 = 纯函数重算，不依赖像素坐标"]
    I
  end
```

### 7.5 契约机制：一张接线表长出三方（防漂移核心）

```mermaid
flowchart TB
  SRC["API_SURFACE（api-surface.ts，受锁）<br/>channel + Req + Res 一条记录一通道"]
  SRC -->|"infer 推导 z.input"| PA["PreloadApi 类型<br/>preload buildApi() ✅ 运行时生成"]
  SRC -->|"infer 推导 z.output"| AH["ApiHandlers 类型<br/>漏/多通道 = 编译错误 ✅"]
  SRC -->|"遍历注册"| RG["register.ts ✅<br/>Req safeParse → service → Result"]
  SRC --> EV["EVENT_CHANNELS<br/>importProgress 单向事件"]
  T1["tests/contracts/api-surface.test.ts ✅<br/>通道唯一/命名/strict"]
  T2["tests/contracts/preload-surface.test.ts ✅（本轮补齐）<br/>运行时暴露面逐域逐方法对账"]
  SRC -.-> T1 & T2
  PA -.-> T2
```

### 7.6 安全边界（纵深，由外向内）

```mermaid
flowchart TB
  L1["① 出网：http-client 白名单 3 host + redirect:error + 20MB 上限 ✅"]
  L2["② 外链：shell-guard 拒 localhost/私网/IP 字面量/带凭据 ✅<br/>will-navigate 全拒 · setWindowOpenHandler deny · 权限全拒 ✅"]
  L3["③ 进程：sandbox + contextIsolation 双开 · nodeIntegration 双关 ✅<br/>preload 白名单桥，零 ipcRenderer 泄漏 ✅"]
  L4["④ 内容：CSP 双通道（构建 meta + dev 头）无 unsafe-eval ✅<br/>connect-src 'self'（renderer 禁直连出网）✅"]
  L5["⑤ 数据：SQL 全参数绑定 + escapeFtsQuery ✅（repos 已实现，33 测试锁定）<br/>app-file:// paperId 白名单 → 受管根前缀校验 ✅<br/>renderer 零路径 · 写盘仅经系统对话框 ✅"]
  L1 --> L2 --> L3 --> L4 --> L5
```

### 7.7 治理体系：工单 → 实现 → 关卡 → 状态闭环

```mermaid
flowchart TB
  subgraph LOOP["单人 + AI 弱模型领单循环"]
    RG2["tickets/registry.ts ✅<br/>72 工单 = 34 done + 38 open<br/>（Phase 1/2 完成：DB 5 + 服务 3 + IPC 2 + 库 UI 5 + 基建 2）"]
    SPEC["源文件头五层规约<br/>= 自包含任务书"]
    IMPL["弱模型只改工单文件"]
    GD["guardedDescribe(ticketId)<br/>open → skip · done → 激活<br/>未知工单号当场炸"]
    RG2 --> SPEC --> IMPL --> GD
    GD -->|"人类审查 git diff 后翻状态"| RG2
  end
  subgraph GATES["关卡（verify = CI 同口径，本轮并轨）"]
    Q["quality:占位/乱码/跨域/行数/分层方向"]
    T["tickets:工单号一致性 + done 残留占位即红"]
    LK["locks:81 文件 sha256 对账<br/>（含校验器自身 · 构建与测试配置）"]
    V["lint → typecheck → test → build"]
  end
  GD --> GATES
  GATES -->|"红 = 返工，禁放宽断言"| IMPL
  LK --> MANIFEST["locks/manifest.json<br/>变更须 [locked-change] 尾注"]
```

### 7.8 构建与 ABI 双轨（Windows 环境事实）

```mermaid
flowchart LR
  subgraph NODE["vitest（Node ABI 137）"]
    UT["单测/契约/安全"]
  end
  subgraph ELEC["electron-vite（Electron ABI 130）"]
    BUILD2["main(CJS) + preload(cjs, zod 内联) + renderer(ESM+React)"]
    E2E["Playwright _electron"]
  end
  ABI["scripts/sqlite-abi.mjs ✅（本轮修数值选版）<br/>abi-cache: node-v* + electron-v* 两份预编译"]
  POST["postinstall: setup 抓双份"]
  POST --> ABI
  ABI -->|"use node（自校验 require）"| NODE
  ABI -->|"use electron"| ELEC
  NPMRC[".npmrc npmmirror 二进制镜像<br/>GitHub 优先 · 镜像兜底"] --> POST
```
