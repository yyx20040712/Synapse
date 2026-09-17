> 证据档｜2026-09-17 四路只读调研之一（主进程深潜）
> 产出：Explore 只读子代理；转录原样未改——分析责任归产出方，勘误以裁决书为准。
> 消费：docs/design/2026-09-18_complexity-governance-ruling.md §7

# src/main 主进程架构深度梳理报告

根目录 `E:\class\智慧水务\Synapse_remake`（下文所有 file:line 均以绝对路径给出）。src/main + src/preload + src/shared 合计 9,906 行（wc -l 实测），其中 src/main 约 7,200 行。

---

## ① 分层图（文字版）

```
renderer (React)
   │  window.api / window.apiDrag / window.apiEvents        ← preload/index.ts 白名单桥（不泄漏 ipcRenderer）
   ▼
ipc 层（表驱动，无手写 ipcMain.handle）
   shared/ipc/api-surface.ts  API_SURFACE 55 通道 + 3 事件通道 = 契约单一真相源
   main/ipc/register.ts       循环注册：zod 校验(Req) → 调 handler → 异常折叠 Result   [register.ts:45-55]
   main/ipc/<域>.ts ×11       纯装配桶（9 个一行转调；import_/export_/lineage 夹对话框胶水；settings 自包含）
   ▼
services 层（工厂函数 + 依赖注入，业务唯一宿主）
   services/index.ts          ServiceBundle 装配桶（9 域；export_/ai_sensor 为多服务 spread 合体）
   workspaces 域不经此桶——bootstrap 组合注入（ComposedHandlerDomains, api-surface.ts:163）
   ▼
repos 层（db/repos/*.repo.ts，单表 CRUD + 预编译 SQL + withTransaction 原子边界）
   ▼
db 层（better-sqlite3 单连接：connection.ts 唯一建连 + migrate.ts 8 迁移 + fts.ts 转义）

旁路/装配面（main 根，允许触 db，与 bootstrap 同权）：
   bootstrap.ts（组装根）· data-layer.container.ts（课题级热换 facade，Proxy 转发）
   workspace-layout.ts · migrate-user-data.ts · import-gate.ts · dialogs.ts · windows/*
出网/协议/安全横切面：
   http/http-client.ts（唯一出网口，host 白名单）· protocol/app-file.protocol.ts（app-file://）
   security/csp.ts · security/shell-guard.ts
```

分层单向性由 ESLint 强制（services 禁 import db/connection|migrate——`src\main\workspace-layout.ts:4-6` 头注声明）。唯一的"ipc 层里写业务"例外是 settings 域（见 ④-5）。

### 启动链（装配顺序，不可调换）

入口 `src\main\index.ts`（48 行）：
1. `app.requestSingleInstanceLock()` 防双实例写同一 SQLite（index.ts:10）；
2. `registerAppFileScheme(protocol)`——scheme 注册必须在 app ready 之前（index.ts:13）；
3. `whenReady → bootstrap(app)`，失败弹 ErrorBox 后 `app.exit(1)`（index.ts:24-29）；
4. `window-all-closed` / `before-quit` → `ctx.shutdown()`（幂等关库）。

`src\main\bootstrap.ts`（258 行，组装根）顺序：
1. `SYNAPSE_USER_DATA` 覆盖（e2e）或 `migrateLegacyUserData`（改名迁移 "Synapse Remake"→"Synapse"，bootstrap.ts:77-81）；
2. `ensureWorkspaceLayout(userDataDir)`——遗留库迁入 workspaces/default + 指针解析（bootstrap.ts:85）；
3. `net.fetch` 出网实现 + `readContactEmail`（礼貌池 UA，bootstrap.ts:88-89）；
4. `createImportGate()`——**顶层一次创建、在容器 assemble 闭包之外**，workspace 切换互斥的判定源（bootstrap.ts:96）；
5. `createDataLayerContainer({assemble})`：闭包内 mkdir files/ → `openDatabase` → `migrate` → `createRepos` → `createFileStore` → `createServices`（bootstrap.ts:99-135）；`container.assembleInto(layout.dataDir)`；
6. `createWorkspaceService`（容器外——管理容器本身；bootstrap.ts:142-148）；
7. `registerAppFileProtocol`（协议回调经容器 `papersFileRef` 间接取，switch 后活指向，bootstrap.ts:151-156）；
8. `registerIpc({...createIpcHandlers(deps), workspaces: workspaceService})`（bootstrap.ts:157-178）；
9. `applyCsp(session.defaultSession)`（bootstrap.ts:179）；
10. `Menu.setApplicationMenu(null)` → `loadBounds` → `createMainWindow`（安全 flags + 三重护栏）→ close 监听（saveBounds → quit-dirty 拦截）→ `bindWindowStateEvents`（bootstrap.ts:186-233）。

`src\main\windows\main-window.ts`（280 行）职责：窗口创建与安全 webPreferences（`WINDOW_SECURITY_FLAGS`，main-window.ts:63-73：sandbox/contextIsolation/禁 node）、导航护栏（仅同 URL reload 放行，main-window.ts:95-97）、window.open 一律 deny（:83-85）、权限最小放行（仅 clipboard-sanitized-write，:104）、退出拦截状态机（dirty 缓存 :164-178 + `handleCloseWithQuitGuard` :196-211）、frameless 四 action 窗控（:242-261）、最大化状态事件推送（:272-280）。

---

## ② 逐模块清单表（行数=wc -l 实测）

### 顶层/装配（main 根）

| 模块 | 行数 | 职责 | 依赖 |
|---|---|---|---|
| `src\main\index.ts` | 48 | 入口：单实例锁、scheme 注册、生命周期 | electron, bootstrap |
| `src\main\bootstrap.ts` | 258 | 组装根（唯一编排处） | 几乎全部模块 |
| `src\main\data-layer.container.ts` | 95 | 课题级数据层稳定 facade（liveProxy 热换） | db/repos/services 类型 |
| `src\main\workspace-layout.ts` | 77 | 启动期课题布局解析 + 空库落位 | db/connection+migrate, workspace.fs |
| `src\main\migrate-user-data.ts` | 82 | userData 改名迁移（分支矩阵） | node:fs |
| `src\main\import-gate.ts` | 33 | import in-flight 计数 gate | 无 |
| `src\main\dialogs.ts` | 67 | main 侧唯一系统对话框出口 | electron.dialog |
| `src\main\windows\main-window.ts` | 280 | 主窗口+安全护栏+退出拦截+窗控 | electron 类型 |
| `src\main\windows\window-state.ts` | 75 | 窗口 bounds 记忆 | node:fs |

### ipc 层（handler 数=各文件实现的方法数；运行时由 register.ts 对 55 通道各挂 1 个 ipcMain.handle）

| 文件 | 行数 | 职责 | handler 数 |
|---|---|---|---|
| `src\main\ipc\register.ts` | 62 | 表驱动注册：zod 校验→service→Result 折叠 | 55（循环，:51） |
| `src\main\ipc\index.ts` | 34 | 装配桶（拼 ApiHandlers） | — |
| `src\main\ipc\ipc-deps.ts` | 28 | IpcDeps 形状（消类型环） | — |
| `src\main\ipc\library.ts` | 29 | 纯委托 | 4 |
| `src\main\ipc\reader.ts` | 29 | 纯委托 | 6 |
| `src\main\ipc\notes.ts` | 29 | 纯委托 | 3 |
| `src\main\ipc\tags.ts` | 33 | 纯委托 | 7 |
| `src\main\ipc\import_.ts` | 48 | 对话框胶水+取消≠错误 | 3 |
| `src\main\ipc\enrich.ts` | 24 | 纯委托 | 1 |
| `src\main\ipc\export_.ts` | 148 | 导出流（构建→对话框→写盘；剪贴板单通道） | 8 |
| `src\main\ipc\ai_sensor.ts` | 23 | 纯委托 | 7 |
| `src\main\ipc\lineage.ts` | 69 | 草稿对话框+缺省归一 | 6 |
| `src\main\ipc\settings.ts` | 87 | **自包含域**：settings.json 读写+网络诊断 | 3 |
| `src\main\ipc\system.ts` | 58 | openExternal 守卫/setQuitDirty/windowControl | 3 |
| workspaces（无 ipc 文件，bootstrap 直注 workspaceService） | — | 4 |

通道总数实测 `grep -c "channel: '"` = **55 个 invoke 通道** + 3 个 main→renderer 事件通道（`api-surface.ts:129-134`）。

**preload API 面**（`src\preload\index.ts`，83 行）：`window.api`（55−1 隐藏=54 方法，`PRELOAD_HIDDEN_METHODS` 隐藏 `import_.fromPaths`——路径串生命周期限 preload 堆，api-surface.ts:172-174）、`window.apiDrag.importDropped`（File→webUtils 解析→过滤→from-paths，preload/index.ts:49-58 + drag-import.ts 48 行）、`window.apiEvents`（3 事件订阅，返回退订函数）。

### services 层

| 模块 | 行数 | 职责 | 依赖 repos | 跨服务耦合 | 后台任务/定时器 | 事务边界 |
|---|---|---|---|---|---|---|
| `services\index.ts` | 152 | ServiceBundle 装配 | 全部 | paperExists 闭包 ×2（:124,:135） | — | — |
| `services\library.service.ts` | 92 | 列表/详情/改元数据/集合 | papers, collections | 无 | 无 | 单语句 |
| `services\reader.service.ts` | 89 | 打开/标注 CRUD/进度+时长 | papers, annotations | 无 | 无 | updateReadPage 原子累加 |
| `services\notes.service.ts` | 60 | 每篇一笔记 | papers, notes | 无 | 无 | repo 内 upsert 事务 |
| `services\tags.service.ts` | 118 | 标签 CRUD+rename/merge/delete | tags | 无 | 无 | repo 内事务（tags.repo.ts:114-122） |
| `services\import_\import.service.ts` | 315 | 导入编排（扫描→拷贝→查重→抽取→入库→挂集合）+进度事件 | papers, collections | gate（bootstrap 注入）、onProgress 回调 | 无定时器；批内串行 await | `repos.withTransaction` 包 insert+attach（:158-161） |
| `services\import_\file-store.ts` | 157 | 内容寻址受管存储（sha 分桶、防穿越、原子写） | 无 | — | — | — |
| `services\import_\pdf-meta.extract.ts` | 414 | 纯字节 PDF 解析（Info 字典+流解压+正则） | 无 | — | — | — |
| `services\enrich\enrich.service.ts` | 158 | 三源瀑布增强+fill-empty 回写 | papers | cited-by.service（刷新决策单源） | **无自动后台**（仅手动触发，:31-32 负面清单） | applyEnrichment 单语句 |
| `services\enrich\cited-by.service.ts` | 100 | 被引缓存刷新决策纯函数 | （类型）papers.repo | 被 enrich 消费 | — | — |
| `services\enrich\providers\crossref.ts` | 139 | CrossRef REST 封装 | 无 | http-client | — | — |
| `services\enrich\providers\openalex.ts` | 110 | OpenAlex 封装 | 无 | http-client | — | — |
| `services\enrich\providers\arxiv.ts` | 89 | arXiv Atom XML 封装 | 无 | http-client(fetchText) | — | — |
| `services\export_\export.service.ts` | 233 | BibTeX/CSV/报告/单篇 corpus/全库 md 集合/落盘 | papers, annotations, notes | corpus.assemble、bibtex.serializer、markdown.report | 每 25 篇 setImmediate 让路（:167） | — |
| `services\export_\corpus.export.service.ts` | 422 | **五件套导出会话状态机**（idle→preparing→streaming→finalizing→done/failed；manifest tmp+rename；单飞 EXPORT_BUSY） | papers, annotations, notes, aiNotes | fileStore.resolveManagedPath、sendEvent→renderer 驱动 | 无定时器；**内存单例会话**（:187）+setImmediate 延后推进（:301-307） | 文件级（manifest 终局单写） |
| `services\export_\corpus.assemble.ts` | 206 | corpus md 装配**唯一纯函数源**（红线 R12） | 无 | annotation-order, venue-tier | — | — |
| `services\export_\bibtex.serializer.ts` / `markdown.report.ts` / `interface-template.ts` | 95/88/61 | 序列化纯函数/INTERFACE.md 常量 | 无 | — | — | — |
| `services\ai_sensor\ai-sensor.service.ts` | 337 | 伴随进程文件协议（pending job/status 心跳/corpus-ai/archive）+六态观测状态机 | 无（纯 fs） | 被 zcode-link 消费 readStatus | **零常驻定时器**（renderer 驱动轮询，:20-22）；心跳阈值 10min（:123） | — |
| `services\ai_sensor\ai-notes-import.service.ts` | 226 | 回灌导入器（archive sha 账本幂等） | aiNotes | paperExists 注入 | 无 | 逐篇 deleteByPaper+重插（**无事务包裹**——003 头注缺陷③自认 :20-22） |
| `services\ai_sensor\zcode-link.service.ts` | 132 | zcode 五态检测+技能模板复制（零 spawn） | 无 | 消费 aiSensor.readStatus（services/index.ts:129 闭包） | 无 | — |
| `services\lineage\lineage.service.ts` | 388 | 草稿三段校验+树守卫（INV-27 宿主）+含金量 join | lineage | paperExists、paperMetrics 注入、venue-tier | 无 | `withTransaction` 包 clearGraph+整套重灌（:241-269） |
| `services\workspaces\workspace.service.ts` | 217 | 课题域编排（busy 单飞+import 互斥+物化/切换） | 无（fs+回调） | closeCurrent/assembleInto 回调=容器、importInFlight=gate | 无 | 文件级（搬移序提交点） |
| `services\workspaces\workspace.fs.ts` | 180 | 课题目录约定纯 fs 层 | 无 | — | — | tmp+rename 原子写 |

### db 层

| 模块 | 行数 | 说明 |
|---|---|---|
| `db\connection.ts` | 35 | 唯一建连；WAL/foreign_keys/busy_timeout=5000 等 pragma |
| `db\migrate.ts` | 74 | PRAGMA user_version 驱动，8 迁移逐个事务（migrate.ts:60-64），`?raw` 内联 |
| `db\fts.ts` | 22 | FTS5 短语转义（防语法注入） |
| `db\repos\index.ts` | 41 | 7 repo 装配 + `withTransaction`（:37） |
| `db\repos\papers.repo.ts` | 272 | 12 方法（含 FTS 联查、cited_by 独立 SET、reading_seconds 原子累加） |
| `db\repos\papers.queries.ts` | 117 | LIST/DETAIL SQL 常量+过滤组装+行映射 |
| `db\repos\annotations.repo.ts` | 259 | 6 方法；FTS+LIKE 兜底搜索 |
| `db\repos\notes.repo.ts` | 139 | 5 方法；事务内先查后插 upsert |
| `db\repos\ai_notes.repo.ts` | 171 | 6 方法 |
| `db\repos\lineage.repo.ts` | 253 | 6 方法（upsert ON CONFLICT、clearGraph） |
| `db\repos\tags.repo.ts` | 174 | 10 方法（merge/delete 走 db.transaction） |
| `db\repos\collections.repo.ts` | 94 | 4 方法 |

**Schema 与迁移演进史**（8 个 SQL，246 行）：
- `001_init.sql`（141 行，冻结）：papers（含 enrich_status 状态机列）/collections/paper_collections/tags/paper_tags/annotations/notes + **3 张 FTS5 external content 表 + 9 个触发器**（001_init.sql:73-141：papers_fts(title,abstract,authors)、notes_fts、annotations_fts，trigram 分词，AFTER INSERT/DELETE/UPDATE 自动同步，仓储层零手动维护）。
- `002_indexes.sql`：列表/集合查询性能补索引。
- `003_ai_notes.sql`：AI 语料独立表（P7-G/ADR-0015，"一行=一锚定段×一问"，role CHECK 枚举真相在 DDL）。
- `004_lineage.sql`：脉络图 nodes+edges（存储=图、v1 行为=树——约束在 service 不在 DDL）。
- `005_cited_by.sql`：papers 加被引数缓存三列（ENR-01，NULL≠0 语义）。
- `006_lineage_ref_edges.sql`：edges.kind（tree/ref，R2-LG12）。
- `007_lineage_node_tags.sql`：nodes.tags JSON 列（F-LG14）。
- `008_reading_time.sql`：papers.reading_seconds（P7E-05）。

演进脉络清晰：**核心库 → 性能 → AI 语料 → 脉络图 → 含金量 → 脉络图边语义×2 → 阅读时长**；另有两次 SQL 之外的数据迁移：userData 改名迁移（migrate-user-data.ts）与课题化布局迁移（workspace.fs.ts:157-180，db 文件最后搬=提交点，断点续迁）。

**FTS 查询策略**：≥3 字符走 `papers_fts MATCH`（经 escapeFtsQuery 包短语），<3 字符 LIKE 兜底（`papers.queries.ts:87-99`、`annotations.repo.ts:235-252`、`notes.repo.ts:126-136` 三处同型实现）。

### http / protocol / security

- **http-client**（`src\main\http\http-client.ts`，222 行）：主进程唯一出网口。强制白名单 `ALLOWED_REMOTE_HOSTS = api.crossref.org / api.openalex.org / export.arxiv.org`（constants.ts:19-23，http-client.ts:56 强制）；仅 https；`redirect:'error'` 防开放重定向；超时 15s、2 次退避重试（429/502/503/504/网络错）；20MB 流式响应上限；zod 校验响应。使用者：enrich 三 provider（bootstrap.ts:128-131 注入 fetchJson/fetchText）+ settings 网络诊断（pingHost）。renderer 永不能直接出网（CSP connect-src 'self' app-file:）。
- **自定义协议**：`app-file://<paperId>`——renderer 取 PDF 唯一通道（protocol/app-file.protocol.ts:20-28 URL 解析白名单 → 查库 fileRefById → resolveManagedPath 前缀校验 → 读字节），renderer 全程不接触文件系统路径。
- **security**：csp.ts（CSP_POLICY 单源，构建期 meta+运行期响应头双通道，禁 unsafe-eval）；shell-guard.ts（外链仅 https、拒 localhost/内网 IP 字面量/带凭据 URL——system/openExternal 唯一守卫出口）。

---

## ③ 业务域归纳（主进程实际承载 8 个业务域）

1. **文献库与组织**：papers/collections/tags/notes + **多课题（workspace）库级隔离**——一课题一目录一库一文件仓，切换=关库→指针→重装配（workspace.service.ts:207-211）。
2. **阅读与标注**：reader 域（打开/标注 CRUD/阅读进度/累计阅读时长）。
3. **导入**：对话框/文件夹/拖拽三入口；sha256 内容寻址去重；一级子目录→集合；进度事件推送。
4. **元数据增强**：crossref→openalex→arxiv 三源瀑布（手动触发）、fill-empty 回写、被引数缓存。
5. **导出**：BibTeX/CSV/剪贴板/阅读报告/单篇 corpus md/全库 md 集合/**五件套 AI 语料会话**（manifest+corpus+fulltext+figures+INTERFACE.md，renderer 参与流式提取）。
6. **AI 传感器联动**：文件协议作业派发（userData/ai-sensor/pending+status 心跳）、AI 语料回灌导入（archive sha 账本幂等）、zcode 技能安装（纯 fs 零 spawn）。
7. **发展脉络图**：树/参考/人工三 kind 边 + 守卫（自环/多父/成环/重复）+ 草稿全有或全无导入 + 含金量（venueTier+citedBy）join。
8. **系统与安全**：settings.json、网络诊断、窗控、退出 dirty 拦截、CSP/shell 守卫/app-file 协议/单实例锁。

---

## ④ 复杂度热点 TOP 清单（每条带证据）

**TOP-1｜corpus.export.service.ts：最大的状态机+IO 神模块（422 行，其中头注 111 行）**
单文件承载：会话状态机全表（:6-41）、目录清空重建、逐篇装配、sha 计算、manifest 原子写、事件协议、单飞锁、setImmediate 时序补丁（:297-307 注释自述"e2e 多篇序列实证死锁"）。内存单例 `session`（:187）+ 摘牌/延后推进等防御性微操（:388-412）说明并发时序极脆弱。

**TOP-2｜"Error+code"域错误类复制 16 份（15 个文件）**
`grep -rn "readonly code: AppErrorCode" src/main | wc -l` = 16：DomainError（library.service.ts:42）、ReaderDomainError、NotesDomainError、TagsDomainError、ImportDomainError、EnrichDomainError、ExportDomainError、SessionError、LineageDomainError、WorkspaceDomainError、ExportIpcError、LineageIpcError、SystemDomainError、FileStoreError、HttpFetchError。靠 toAppError 鸭子类型约定折叠，无共享基类（reader.service.ts:29-30 明言"各自私有是既定惯例"）。

**TOP-3｜同一原语多份手写实现（原子写×4、isENOENT×2、escapeLike×3、safeId×3、sha256×3、basename×2）**
- 原子写：`ipc\settings.ts:35`、`services\workspaces\workspace.fs.ts:63`、`services\ai_sensor\ai-sensor.service.ts:188`、`services\import_\file-store.ts:140-157`（tmp+rename 四处）。
- isENOENT：ai-sensor.service.ts:174 与 ai-notes-import.service.ts:101 逐字重复。
- escapeLike：papers.queries.ts:69 / annotations.repo.ts:80 / notes.repo.ts:62。
- id 消毒：export.service.ts:210、corpus.export.service.ts:397、ai-sensor SAFE_ID(:126)。
（注意：仓库有 `scripts/check-dup-constants.mjs` 门禁只查**常量**，不覆盖函数级重复。）

**TOP-4｜bootstrap.ts 组装根过载（258 行）**
环境钩子、两种数据迁移、容器、gate、协议、IPC、CSP、窗口、对话框、三事件出口全部在此闭包耦合；`services\index.ts` 的 ServiceDeps 有 12 个字段（services/index.ts:52-71），任何横切能力（sendProgress/sendExportEvent/aiSensorRootDir/templateDir/http）都要穿 bootstrap→services/index→具体服务三层手动接线。

**TOP-5｜ipc 层两种形态 + settings 域破层**
9/11 个 ipc 文件是"每方法一行转调"的纯壳（library.ts:22-29 等），而 `ipc\settings.ts` 反向在 ipc 层直接做业务（settings.json 读写+默认值写回+网络诊断，settings.ts:41-87），违反 register.ts:6"业务永远在 services"的自述。另 workspaces 域走 ComposedHandlerDomains 旁路注入（api-surface.ts:156-163 自认代价："漏组合不再编译期拦截"）。

**TOP-6｜合体服务（spread 合并）的隐式契约**
`export_: {...createExportService, ...createCorpusExportService}`（services/index.ts:109-116）、`ai_sensor: {...aiSensor, ...aiNotesImport, ...zcodeLink}`（:117-132）——三个独立服务拼成交叉类型 `AiSensorService & AiNotesImportService & ZcodeLinkService`；方法名撞车会静默覆盖；zcode-link 经闭包消费 aiSensor.readStatus（:129），是服务间唯一"实例级"耦合。

**TOP-7｜状态机散落 7 处**
① 导出会话（corpus.export.service 头注表）；② AI 作业六态（ai-sensor.service.ts:24-50，fs 事实推导）；③ workspace 布局 L0/M/W-pvalid/W-pbad/W-empty（workspace.service.ts:5-17）；④ 被引缓存刷新（cited-by.service.ts:12-22）；⑤ enrich_status DB 枚举；⑥ quit-dirty（main-window.ts:13-24）；⑦ lineage 边 kind 守卫（lineage.service.ts:303-365，与 validateDraft :142-207 两套实现）。每个都有头注状态表+跨格序列测试，但无统一状态机抽象。

**TOP-8｜liveProxy 间接层**
data-layer.container.ts:60-71 的 Proxy "访问即取当前"：类型上仍是 ServiceBundle，运行时却可能指向已关库/未装配（:76-80 显式中文报错兜底）；switch 竞窗（装配失败=当前层已关）在 workspace.service.ts:25-27 自认为已知风险。

**TOP-9｜头注/流程文档淹没代码**
大文件头注占比：corpus.export.service 111/422、ai-sensor.service 111/337、lineage.repo 头注约 90 行、cited-by.service 实现代码仅 13 行（88-100）而头注 75 行。注释里大量工单号（INV-xx/ADR-xx/R2-LGxx）构成外部知识依赖。

**TOP-10｜app-file:// URL 字符串三处拼装**
papers.repo.ts:251（用 APP_FILE_SCHEME 常量）、corpus.export.service.ts:239（硬编码 `app-file://${paper.id}` 未用常量）、reader.service.ts:57（消费 detail.fileUrl）。

---

## ⑤ 观察到的架构风险

1. **导出会话 promise 悬挂**：`exportCorpusSession` 的 resolve 依赖 renderer 逐篇回传 corpusItem；若 renderer 在 streaming 中 reload（R1-WS2 课题切换正是 location.reload）而 main 进程不死，单飞锁 `session` 不释放，EXPORT_BUSY 永久占用直到重启（corpus.export.service.ts:310-313；头注"interrupted=main/renderer 同死"的假设被 reload 场景打破）。
2. **ai-notes 回灌导入无事务**：`deleteByPaper + 逐条 insert` 循环未包 withTransaction（ai-notes-import.service.ts:187-189；003 迁移头注缺陷③已自认"快速循环内多行可同毫秒打戳"），与 lineage 导入的事务标准（lineage.service.ts:241）不一致。
3. **契约漂移靠测试而非类型**：Res schema 只做编译期类型（register.ts 仅校验 Req，register.ts:22）；ComposedHandlerDomains 可选域漏装配是运行时错误；好在有 tests/contracts 三方对账（api-surface/preload-surface）兜底。
4. **函数级重复无门禁**：原子写/转义/ENOENT 等 10+ 处复制，现有 lint 只锁常量同名同值（check-dup-constants），函数重复只能靠人审。
5. **switch 竞窗**：`switch` 中 closeCurrent 之后 assembleInto 失败，容器指向 null，后续 IPC 调用全部报"课题数据层未装配"（workspace.service.ts:25-27 自认，留 R1-WS2 收口）。
6. **模块级可变状态**：quitDirtyCached（main-window.ts:164）、session 单例（corpus.export.service.ts:187）、busy 标志（workspace.service.ts:111）、gate 计数——均为单例语义，热重载/多窗口演进时会成为阻力。
7. **头注即文档**：关键设计裁决（状态机表、幂等语义、迁移序）全在头注，与代码同生命周期但无机器校验；注释中工单号体系（INV/ADR）在仓库 docs/ 之外不可复原，长期维护成本高。

**总体评价**：这是一个分层纪律极强、契约表驱动、安全面（出网白名单/协议/护栏/CSP/守卫）完备的主进程；复杂度主要不在于"乱"，而在于**横切装配集中（bootstrap/容器）、状态机各自为政、错误类与文件原语大量同构复制、以及头注流程文档的重量**。最大的单点脆弱面是 corpus.export 会话与 workspace 热换两处"活引用/活状态"代码。
