# B2 资源复用与订阅降维设计稿（F-a）

- 日期：2026-11-22。角色：B2 批单元一（设计稿+现状可红面红测试）。本稿不写
  产品实现——src 零改动；cache 模块单测文件归实现批随模块先红后绿落地。
- 红测试（已落地，现状红）：
  `tests/unit/renderer/lineage-b2-remount-refetch.test.tsx`（2 红 5 绿守卫，
  7 例——红=主图/folder 同图返回两例；守卫=切图/同值重选/needsReload/dirty/
  error 五向）、`tests/unit/renderer/library-b2-folder-catalog.test.tsx`
  （2 红 2 绿守卫）。合计 4 红 7 绿 11 例，实测红因逐条见 §14。
- 输入：规格单源 `/home/yyx/synapse-archive/scripts-audits/20261121-visual-review/
  plan-v1.md` §4.1–§4.4+§11.1/§11.2/§11.4；业务事实源 summary-draft.md §3 路径一
  （①②③④⑥+pdfjs 静态 import 条）+§4.4 末条（F-a 资源保活≠视图保活）；行数与
  锚点为 2026-11-22 读码实测（`wc -l` 数字见 §11）。
- 术语：**lease**=消费方对一份 PDF 文档句柄的引用凭证（acquire 得到、release
  归还，计数_refs）；**单飞**（single-flight）=同 key 并发请求共享同一在途任务；
  **LRU**=最近最少使用驱逐（驻留上限 2）；**目录读面**=library 域 folders.list
  的共享读取宿主（folder-catalog.store）。**写源**=会被高频 setState 的 store
  字段（nodes/edges/noteByPaper 对象本体）。

## 0. 结论与范围

按 plan §4.1 逐条执行，不扩权：资源保活不保活整棵 React 树。四个落点：

1. App 拆 ViewHost/状态条宿主；App 根不再订阅 nodes/edges 数组与 noteByPaper
   对象本体（写源变化只相应宿主重渲染）。
2. ReaderPage 作为动态边界，pdfjs 不进首屏 chunk（仅 Provider 内改动态 import
   而保留 ReaderPage 静态入口不算完成——App 静态 import 链是当前唯一漏点）。
3. PDF document/loadingTask：同 fileUrl 单飞、lease 计数、驻留 LRU 2 份；
   活动 lease 不可驱逐；失败/驱逐各销毁一次且仅一次（工作区 reload=进程级
   销毁，见 §2.4）。
4. PageColumn 尺寸缓存随文档缓存复用；LineagePage 返回同 ready 图跳过挂载
   重取；三库组件 folders.list 收为 library 域共享目录读面。

明确不做（plan §0/§4.4）：视图保活（五视图条件卸载不变）、路径一③ buildSnapshot
gBCR 重路由与⑤时间线 DOM 规模（B3/B7）、⑦ zoom 顶层订阅（B3）、新依赖、
加载动画。

## 1. 现状事实（读码实测，2026-11-22）

事实 F1–F7（文件+行号可核对）：

| # | 事实 | 出处 |
|---|---|---|
| F1 | App 根订阅 `s.nodes`/`s.edges` 数组本体（StatusBar 的节点/连线计数消费）——任何脉络写动作整 App 连坐重渲染 | App.tsx:148-149 |
| F2 | App 根经 useTabDirtySignals/useTabDirtyAggregate 订阅 `s.noteByPaper` 对象本体（无 useShallow 投影）——notes 任何字段翻转连坐 | tab-dirty.ts:79,107 |
| F3 | App.tsx:9 静态 import ReaderPage → ReaderPageView:43 → PdfDocProvider:37-38（pdfjs-dist+worker ?url 静态）；PdfPageCanvas.tsx:33/TextLayer.tsx:33 亦静态——条件渲染不改静态模块图 | 构建实测：out/renderer/assets/index-*.js=1,974,718B 单 chunk 含 GlobalWorkerOptions 符号 14 处；pdf.worker.min-*.mjs=1.38MB 独立资产 |
| F4 | PdfDocProvider fileUrl 效应：卸载/换文档即 `task.destroy()`，无跨挂载复用；同 fileUrl 多挂载各自 getDocument | PdfDocProvider.tsx:73-97 |
| F5 | PageColumn 段①尺寸管线 deps [doc,totalPages]：每次挂载（视图往返）逐页 getPage 重跑 N 次，尺寸数组无跨挂载缓存 | PageColumn.tsx:100-125 |
| F6 | LineagePage 挂载 effect 无条件 setFolder（saveStatus==='clean' 时）→load→`lineage.graph` IPC；setFolder 注释明文「不做同值守卫=切图恒重取」 | LineagePage.tsx:60-74、lineage.store.ts:346-360 |
| F7 | folders.list 三路独立取：FolderNav.tsx:55、ImportDropZone.tsx:113、PaperRowMenu.tsx:34 各自 useAsync；changed 广播后 FolderNav+ImportDropZone 各自重拉（PaperRowMenu 无 changed 订阅） | 三文件+apiEvents 消费点 |

推断 C1–C3（事实之上的判断，与决定分离）：

- C1：F1+F2 是⑥「写动作→App 连坐」的完整订阅面（summary §3 路径一⑥）；
  其余 App 订阅（saveStatus、selectedId、wsItems、theme、uiScale、quitDirty
  聚合布尔）均为值型或低频面，不构成连坐主因。
- C2：F3 的静态链唯一入口=App.tsx:9——reader 子树外无 pdfjs 消费（全仓 grep
  实证：pdfjs 相关文件全部在 features/reader/** 与两个已动态 import 的提取器）。
  lazy(ReaderPage) 一处即断链。
- C3：F4+F5 复合出「大 PDF 切走再切回=整本重解析+全页 getPage 重跑」（summary
  ④）；tab 状态驻 store 不丢是既有正面设计，缺的只是句柄与尺寸两级缓存。

## 2. PDF 文档缓存与 lease 状态机（新件 reader/state/pdf-document-cache.ts）

### 2.1 实体与状态集

模块级缓存（reader 域内单例，非 React 状态），条目字段：
`{ fileUrl, state, task, doc, refs, pageSizes, lastUsed }`。

条目状态集（互斥单选）：`loading → ready → evicting → destroying`；终态=
条目移除（回到「无条目」）。lease 计数 refs 与状态并行（acquire +1/release −1）。

决定 D1：loading 期 refs 归零=中止销毁（沿用现状 PdfDocProvider 卸载语义，
不加预取行为——不扩需求）。loading 中 destroy 对加载中是中止（INV-49 既有
事实）；后到等待者收失败并沿 tab error 呈现（现状 cancelled 位静默丢弃的
语义被单飞传播替代——行为差异申报见 §2.5-3）。

### 2.2 迁移全表（状态×事件）

| 当前态 | 事件 | 下一态 | 动作 | 约束 |
|---|---|---|---|---|
| 无条目 | acquire(url) | loading | 建 loadingTask（getDocument {url,isEvalSupported:false}）；登记单飞 promise | 单飞键=fileUrl |
| 无条目（单飞在途） | acquire(url) 同 key | （并入在途 loading） | refs+1，等待同一 promise；零第二个 getDocument | 单飞 |
| loading | 任务 resolve | ready | 存 doc；唤醒全部等待者 | onDocInfo/onDocReady 语义不变 |
| loading | 任务 reject | destroying | destroy 恰一次→条目移除；失败传播全部等待者（tab error） | 失败不缓存失败态 |
| loading | release 至 refs=0 | destroying | destroy 恰一次（中止在途）→条目移除 | D1 |
| ready | acquire(url) | ready | refs+1；命中即复用（A→B→A 不重取）；lastUsed 刷新 | |
| ready | release 至 refs=0 | ready | 条目标记可驱逐（refs=0）；lastUsed 已在 release 刷新 | 活动 lease（refs>0）不可驱逐 |
| ready（refs=0） | acquire 第三 url 且驻留满 2 | evicting | 选 refs=0 且 lastUsed 最旧者→destroying→移除；新条目 loading | 容量语义见 §2.4 |
| ready | 工作区切换 | （进程销毁） | 无 in-page destroy 义务 | §2.4 |
| evicting/destroying | task.destroy() resolve | 条目移除 | — | destroy 恰一次 |
| 任意已移除 | 迟到 release / 重复 release | 无 | no-op（不二次 destroy、不抛） | 幂等守卫 |

非法迁移（必须由状态机结构排除，不需要运行时判）：destroying→ready（destroy
后 doc 不可复活）；ready→loading（同条目二次 getDocument 不存在——条目键即
fileUrl）；无条目→release（no-op 路径）。

### 2.3 两竞态时序表

同飞与迟到释放（T=时刻，A/B/C=消费挂载面或 lease）：

| 竞态 | 时序 | 结果 |
|---|---|---|
| 同飞 | t0 A acquire(url)→loading T1；t1 B acquire(url)→并入 T1（refs=2）；t2 T1 resolve→A/B 同 doc；t3 A release（refs=1）；t4 C acquire→命中 ready | getDocument 恰 1 次 |
| 同飞失败 | t0 A acquire→loading T1；t1 B acquire→并入；t2 T1 reject→destroy 恰一次、条目移除、A/B 均收失败；t3 C acquire→新 loadingTask | 失败不驻留 |
| 迟到释放 | t0 A ready refs=1；t1 A release（refs=0，可驱逐）；t2 C acquire→LRU 驱逐 A（destroy 恰一次，条目移除）；t3 A 的组件卸载链迟到 release | t3=no-op，零二次 destroy |
| 驱逐与活动冲突 | t0 A refs=1、B refs=1（驻留 2）；t2 C acquire | A/B 均活动不可驱逐→临时 3 份，最先 release 且 lastUsed 最旧者在下一次驱逐点出清（§2.4 容量语义） |

### 2.4 容量语义与销毁路径（决定 D2/D3）

- D2：LRU 2=**可驱逐集合（refs=0 驻留条目）上限**，不是硬内存上限。活动窗内
  可短暂 N+1 份（N=同时活动 lease 数），不可销毁活动文档（plan §4.4「旧文档
  仍有页面任务时不得提前 destroy」）；上限不扩为「所有打开文献」。
- D3：in-page 销毁路径恰两条——①加载失败；②LRU 驱逐（含 loading 中止）。重复
  destroy 防护=状态机单迁移（destroying 只可达一次）+lease.release 幂等。
  **工作区切换=window.location.reload()（ADR-0018），renderer 进程级销毁，
  无 in-page destroy 义务**——plan §4.1「工作区 reload 各销毁一次且仅一次」
  按进程级销毁解释并在此申报：不新增 reload 钩子去显式 destroy（页面销毁即
  唯一一次）。
- Worker 面：worker-per-task（INV-49 既有）不变——驻留 2 份=至多 2 个常驻
  PDFWorker+在途任务临时 worker。内存代价申报见 §12。

### 2.5 PdfDocProvider 改造（lease 消费者）

- 挂载 effect：`cache.acquire(fileUrl)` 得 lease（含 doc promise）→resolve 后
  setDoc+onDocInfo/onDocReady（回调仍走 latest-ref，回调签名零变）；卸载/
  fileUrl 变化=release 旧 lease（+acquire 新）。Provider 行数预算 ≤180。
- 行为差异申报：现状同 fileUrl 双 tab=两份独立文档；改后=单飞共享一份
  （refs=2）——这正是目标语义（plan §4.1）。现状卸载静默吞迟到响应；改后
  loading 期全部等待者共享同一失败传播（D1 申报）。
- 组件接口（props/children render-prop）零变：pages-overlay/reader-page-open-race
  等测试的 mock 面契约不动。

### 2.6 回炉实施注记（2026-11-22）

- 加载任务以 `undefined` 作为失败因时，`destroy` 也无条件调用 `entry.reject`。
  ready 条目的公开 promise 已 resolve，追加 reject 不改变其结算；loading 条目
  不再留下永久 pending 的 lease promise。
- 容量收敛点改为每次 acquire 完成条目登记之后，新 loading 与 ready 命中两路径
  一致。驻留数大于 2 时，按 lastUsed 逐出最旧的 refs=0 ready 条目；本次 acquire
  的条目豁免，全活动时仍允许外溢且零销毁。
- 新增缓存第 9/10 例分别锁定上述行为；修复前分别因 promise 仍 pending、ready
  命中后零 destroy 而失败，修复后缓存族 10/10 通过。reviewer 两探针直接导入
  仓库源码复跑，undefined 场景输出 rejected/destroy=1，外溢场景仅最旧空闲 B
  destroy=1。

## 3. App 拆件方案（宿主边界/订阅粒度/lazy 装配）

### 3.1 宿主边界（决定 D4）

| 件 | 行数预算 | 持有 | 不持有 |
|---|---|---|---|
| App.tsx | ≤180（现 241） | view 态+changeView（switchViewWithFlush 单点）、quitDirty 聚合三 hook（值型布尔——P7-C 教训：三 hook 无条件调用纪律随迁保持）、setQuitDirty 上报 effect、gsearch、theme/uiScale 数据通道 effects、wsLoad/settingsLoad、useViewBridges、RecoveryBarHost/ToastHost/ConflictDialog/Rail/header 装配 | 状态条数据、视图路由 JSX（迁 ViewHost）、nodes/edges/noteByPaper 本体订阅 |
| app/AppStatusBarHost.tsx | 新 ≤140 | footer.app-statusbar+StatusBar 全部数据订阅与 autosaveWorstOf 聚合（函数随迁）；nodes/edges 计数选择器降维（§3.2） | quitDirty 上报链（App 保留） |
| app/ViewHost.tsx | 新 ≤140 | 四视图条件挂载+lazy(ReaderPage)+Suspense fallback+ErrorBoundary；props={view, changeView, quitDirty} | 任何域 store 订阅（纯路由件） |

### 3.2 订阅粒度（写源→宿主）

- nodes/edges 本体→AppStatusBarHost 内 `useLineageStore((s) => s.nodes.length)`
  与 `(s) => s.edges.length` 两个独立计数选择器（zustand 逐订阅 Object.is——
  计数不变零重渲染；StatusBar props 载荷与真文本断言零变）。
- noteByPaper 本体→tab-dirty.ts 新增导出 `useTabAutosaveSignals()`
  （useShallow 投影：tab 键集内 pending 布尔+annoDirty 布尔——同文件
  useNotesDrafts:117-123 同型先例）。既有 useTabDirtyAggregate/
  useTabDirtySignals 导出与语义零触碰（受锁 app-quit-dirty/app-shell-t3u1
  面）；AppStatusBarHost 只消费新投影。tab-dirty.ts 为 renderer feature 内
  状态件（非 src/shared 契约），新增导出随批申报。
- App 根保留订阅：quitDirty 聚合布尔（useTabDirtyAggregate+useLineageDirty+
  useNoteDraftPending——布尔值型，聚合值不变不重渲）、selectedId（AppStatusBarHost
  侧消费，App 不再订阅）、theme/uiScale（App 数据通道）。
- 禁双层订阅：同一写源在 App 与宿主各订阅一份=退化回连坐；ViewHost 纯 props。

### 3.3 lazy 装配

- ViewHost 内 `const ReaderPage = lazy(() => import('../features/reader/view/ReaderPage'))`
  （模块顶层一次）；`<Suspense fallback={<div data-reader-lazy="true" />}>`
  ——fallback=一帧占位（无文字锚、无加载动画=规划红线）；ErrorBoundary 包裹
  位置随迁 ViewHost（reader 子树边界与现状 main 内边界等价）。
- 其余三视图仍静态 import（不含 pdfjs——C2）。
- Suspense 窗口=首次进入 reader 的一次动态 import 往返（file:// 本机毫秒级）；
  tab 打开链（open-paper-bus→ReaderPage 挂载闩锁）在 chunk resolve 后照常走，
  sr2-lg-08 时序链不受影响（闩锁消费在 ReaderPage 模块内部，lazy 不改其内部序）。

### 3.4 App 写源只宿主重渲染的断言口径（待判点 1，方案呈主控）

方案=React Profiler onRender 计数探针（先例=useAsync.test renderProbe 挂具）：
实现批新建 `tests/unit/renderer/app-b2-host-isolation.test.tsx`（先红后绿），
以 Profiler 包 App（生产装配），驱动两个变化沿——①lineage store setState
nodes/edges（计数变化）→断言 ViewHost 子树 render 计数增量=0、AppStatusBarHost
增量≥1；②notes pending 翻转→断言 ViewHost 增量=0、状态条宿主增量≥1。
既有 app-shell 断言零触碰（本探针文件独立）。风险：Profiler 计数受并发特性
影响需 StrictMode 双跑核对——实现批先跑红记录实际计数再锁断言值。

## 4. 动态边界方案（import 链改法+chunk 预期）

- 改法全量=两行级：App.tsx 删 `import { ReaderPage } from '../features/reader/view/ReaderPage'`
  静态行；ViewHost.tsx 增 lazy import。**PdfDocProvider 内部不改 import 形态**
  （plan §4.1 明文：仅 Provider 内改动态 import 而保留静态入口不算完成——
  断点必须在上游装配层）。白名单五文件物理 import 不动（INV-16 条款不变）。
- chunk 预期（事实 F3 基线上推）：index chunk 移出 pdfjs-dist/PdfPageCanvas/
  TextLayer 符号（1.97MB→预计 ≤1MB 级，实施后实测）；新增 reader 动态 chunk
  （pdfjs-dist+reader 全子树）；pdf.worker 资产独立不变；CorpusExtractor/
  FigureExtractor 动态 chunk 既有形态不变。
- 首屏 chunk 断言形态（待判点 2，方案呈主控）：
  - 方案 A（建议）：新增 `scripts/check-first-screen-chunk.mjs`——build 后扫
    `out/renderer/assets/index-*.js`：不含 `GlobalWorkerOptions`/
    `getDocument` 特征符号、存在非 index 的 reader chunk；挂 verify 的 build
    之后或 CI 独立步。属检查脚本（CI 防线）变更，须提交说明申报。
  - 方案 B：单测断言 dist 产物——vitest 先于 build 执行，时序不成立；改
    e2e 断言则覆盖窗口弱（e2e 单环境）。不推荐 B。
- 回滚：动态边界单独 commit，可独立回滚不丢数据（plan §4.4）。

## 5. 尺寸缓存复用方案

- 载体：pdf-document-cache 条目 `pageSizes: PageBoxSize[] | null`。
- 写口单点=PageColumn 段①就绪管线完成处回写（含 F-A7 旋转口径结果）；
  cache 模块不自行 getPage（避免第二取数面）。
- 读路径：PageColumn 挂载时按 fileUrl 查缓存条目——命中→直接 setPageSizes
  +onReady（跳过 getPage×N 循环）；未命中→既有管线+完成后回写。doc 与
  totalPages 仍经 props（PagesOverlay/PageColumn 接口零变）。
- 语义保持（INV-30/33/34 申报）：懒窗（usePageLazyWindow）、页码/缩放状态、
  滚动恢复（spProg.onColumnReady 链）、缩放中心锚（anchoredScrollTop）全部
  零改——缓存只改尺寸数组来源，不改布局数学与页盒 DOM。pageSizes 数组值
  与现管线产出逐位相同（同 doc 的 getPage view 恒定）。
- 失效：随条目生命周期（文档销毁=尺寸随行）；fileUrl 是唯一键。zoom/layout
  不入缓存（缓存乘法口径不变——PageColumn 现行注释）。

## 6. LineagePage 同图跳过判据（决定 D5）

- 判据（挂载编排层，LineagePage effect 内）：既有 dirty 早退分支
  （saveStatus!=='clean' return）之后，新增
  `status==='ready' && folderId===target && !needsReload` → 跳过 setFolder；
  否则照旧 setFolder(target)。
- 判定字段选择理由（待判点 4 的裁决依据）：图域单键=folderId（graph 载荷以
  folderId 为域，lineage.store load 显式 folderId）；图名=folders.list 派生
  （改名不改图数据，无失效源）；课题切换=page reload 全量重置 store（无跨
  课题 stale 窗）；needsReload 是 INV-175 和解位（恢复载入置位、load 应用
  分支清位）——未清即图态与库态偏离，必须重取。不引入图指纹/版本号（无
  该数据源，新增=扩需求）。
- 互斥清晰（红线）：跳过只驻挂载编排层；`setFolder` 保持「不做同值守卫=
  切图恒重取」（store 注释明文语义本批不改）——手工同值重选仍重取，B4/B5
  再统一。红测试 lineage-b2 第 3 用例锁此互斥（绿守卫）。
- 与 resetForMount 正交：mode/focusSet/工具态 reset 驻 view store 挂载路径，
  先于判据执行——跳过 setFolder 不损失 clearFocus/resetTool（挂载路径
  resetForMount 已覆盖；setFolder 的同名调用在同路径是冗余面）。B4 落地
  per-folder focusSet 注册表时重审本判据与 dirty 分支（衔接点登记）。

**实施注记（U3，2026-11-22，主控终裁 6）**：
- 判据落地增加第四前置 `resident = nodes/edges 非空`：纯三字段判据与既有
  用例 lineage-board.test.tsx:237（`seedLineage([])` 造 ready+同图空载、
  依赖挂载 graph 取数建立图态）冲突。主控终裁：按「测试是合约」接受
  resident 守卫——零改既有测试；真机 store 初态=loading 不落该分支（生产
  首挂零影响）；语义代价=空图文件夹返回仍重取（一次轻 IPC 返零节点）；
  B4 重审本判据（上文衔接点）时可随 per-folder 会话注册表一并翻案。
  §10 新增 INV 条目按「resident 非空」口径写。
- 其余落地偏差六条主控核可：ViewHost 第四 prop guideHidden（LibraryPage
  契约，布尔投影注入，纯 props 保持）/ViewHost memo（探针增量断言的落法）
  /App tab 脏面改消费 useTabAutosaveSignals 布尔或（等价聚合语义，三 hook
  无条件调用纪律保持）/themeLabel props 注入（避双层订阅）/wsGuide 布尔
  派生留 App（wsItems 本体归宿主）/探针 vi.mock 注入式 Profiler（App 与
  宿主间不可插 Profiler 的仪器化落法，子树见证件增量断言+StrictMode 双跑）。
- 落地实测（批②时点）：App 177/180、ViewHost 45/140（静态装配形态；批③
  lazy 翻转后 51 行）、AppStatusBarHost 74/140、LineagePage 219/230、
  tab-dirty 316/400；探针先红（拆件前两变化沿 page 增量均=1）后绿；
  lineage-b2 7/7；全量 4391/4391 绿。

## 7. library 域目录读面方案（新件 library/folder-catalog.store.ts）

- 形态：zustand 模块级 store `{ folders, loading, error, load(), }`；
  `load()` 单飞=inflight promise 复用（同 tick 多消费面挂载=一次 folders.list
  IPC）；folders.changed 订阅单点在 store 内（invalidate→load；在途窗内
  changed 合并——inflight 完成后按脏标再取一次，保证最终一致且至多两窗；
  连发同 tick 合并一次）。
- 消费改造：FolderNav/ImportDropZone/PaperRowMenu 换 `useFolderCatalog()`
  （store hook）；组件行数只减不增（plan §4.2）。FolderNav 的 changed 派生
  语义（选中夹消失回退+首拉不触发 onMutated 的 changedRef 区分+onMutated
  联动）保留在组件层，数据沿 store 订阅变化沿——组件不再自订 apiEvents
  onFoldersChanged（订阅收口 store 单点）。
- 行为增强申报：PaperRowMenu 现状无 changed 订阅（菜单挂载期一次性数据）；
  收面后其目录数据随 catalog 失效沿自动更新（重开菜单即新值）。属共享读面
  的自然结果，非独立语义改动。
- 分层墙：catalog 只在 library 域内消费；reader/lineage 零反向依赖 library
  store（plan §4.1 红线；check-quality 跨域墙不动）。
- 计数载荷单源不变（RR1-2：全部=Σ paperCount——红测试守卫锁值）。

## 8. cache 单测族契约规格（实现批落地——本批不写文件）

落位 `tests/unit/renderer/pdf-document-cache-*.test.ts`（先红后绿随模块）。
最小族（plan §4.3 全清单+尺寸复用）：

| # | 用例 | 断言核心 |
|---|---|---|
| 1 | 同 key 单飞 | 并发 acquire×N→getDocument 恰 1 次、N lease 同 doc 实例 |
| 2 | A→B→A 不重取 | getDocument 恰 2 次（A 一次），A 二次命中（refs/lastUsed 刷新） |
| 3 | 两份 LRU | 第 3 url acquire→驱逐 refs=0 且 lastUsed 最旧者；驻留≤2 |
| 4 | 活动不驱逐 | A/B 均 refs=1 时第 3 acquire→零 destroy（临时 3 份，D2） |
| 5 | 加载失败销毁 | reject→destroy 恰 1 次→条目移除→下轮 acquire 新任务 |
| 6 | 迟到释放 | 驱逐后 lease.release→no-op（零二次 destroy、零异常） |
| 7 | 重复 destroy 防护 | double release/显式 dispose→destroy 恰 1 次 |
| 8 | 尺寸缓存复用 | 命中路径 doc.getPage 调用 0 次+pageSizes 与首载逐位相同 |

夹具约定：pdfjs-dist 模块级 vi.mock（getDocument/GlobalWorkerOptions 桩——
reader-page-open-race 的隔离理由同源），doc 桩含 getPage/destroy 计数探针；
worker ?url import 一并 mock（jsdom 无资产管线）。

## 9. 受锁测试迁移清单（逐文件）

| 受锁件 | 迁移/保持策略 |
|---|---|
| reader-page-open-race.test.tsx | 保持零改。该测直接 import ReaderPage 模块（非经 App）——lazy 改 App/ViewHost 装配层，模块本体与其 vi.mock 面（PdfDocProvider/PageColumn）不动。lease 化后 Provider mock 桩继续隔离（该测不触 doc 生命周期） |
| page-column.test.tsx | 保持零改。PageColumn props 接口零变（§5 读路径内化于组件+cache 模块）；若组件新增 cache import，测试模块图连带加载纯状态件（无副作用）——不弱化任何断言。尺寸缓存命中行为的新断言归 §8-8 用例（独立文件），不在本件加 |
| pages-overlay.test.tsx | 保持零改。PagesOverlay 十 props 零变；doc 桩经 props 注入与缓存解耦 |
| app-shell.test.tsx | 真文本/结构断言全部保持（rail 七项/顶栏/状态条/gsearch/负锚/缩放/主题）。拆件后 DOM 载荷不变；新增一条「点击 rail 阅读器→flush→空态引导文本在」等待型用例**归实现批**（lazy 装配可等待——不弱化既有断言，plan §4.3 口径） |
| app-shell-t3u1.test.tsx | 保持零改。自动保存槽语义/文本经 AppStatusBarHost 迁移后 props 载荷逐字同值（deriveSaveStatusSlot 单源不动） |
| app-quit-dirty.test.tsx | 保持零改。P7-C hook 链：三 hook 无条件调用纪律在 App 根保持（§3.1）；dirty 翻转序列与 setQuitDirty 上报链不动。noteByPaper 投影新导出不改既有 useTabDirtyAggregate 语义 |
| lineage-timeline-page.test.tsx | 既有用例零改逐一核对：beforeEach 重置 status='loading'→「loading 取数一次」「R2 缺省图」「error 重试」「store 数据缓存」全部不受跳过影响（跳过前提=ready+同图+!needsReload，beforeEach 已破坏前提）。新增「返回同 ready 图零新增 graph IPC」=lineage-b2 红用例转绿后保留（不搬入本件——独立文件不触 500 行线） |
| e2e reader-text.spec.ts | 保持。切走再切回真实文本断言=lease 命中的验收面；lazy 后首开为 auto-wait 文本等待（无选择器改动） |
| e2e reader-scroll.spec.ts | 保持。canvas 数量不越窗（INV-30）与缩放中心锚（INV-33）不受缓存影响；程序滚动单容器（INV-34）不动 |

## 10. INV 修订草案（实现批随批回写 docs/invariants.md）

- **INV-16 修订**：白名单五文件与 ESLint 锚不变；增补装配层声明——「App 对
  ReaderPage 的唯一装配点=动态 import（ViewHost lazy）；静态 import ReaderPage
  即违反本条（pdfjs 回流首屏 chunk）」。验证=首屏 chunk 检查（待判点 2 定形）。
- **INV-49 修订**（现文本=三创建点销毁序）：增补「reader 主链文档句柄驻
  pdf-document-cache：驻留 LRU 2+活动外溢；in-page 销毁路径恰二（失败/驱逐），
  destroy 恰一次；lease 迟到/重复 release=no-op；工作区 reload=进程级销毁，
  无 in-page destroy 义务」。原三创建点条款保留（提取管线自建句柄同型终接）。
- **INV-30/33/34 保持申报**：懒窗绑定/缩放中心锚/程序滚动单容器零变化；
  尺寸缓存只改数组来源（§5）。实现批核对无触即零改文本。
- **新增 INV（同图不重取锚）**：「LineagePage 挂载路径在 ready∧同 folderId∧
  ¬needsReload∧clean 时零新增 lineage/graph IPC；手工 setFolder 同值恒重取
  （二域互斥）」。验证=lineage-b2 红用例转绿+lineage-timeline-page 既有族。
- **新增 INV（目录读面单点）**：「folders.list 经 library 域 folder-catalog
  单飞读取；三消费面共挂一次取数；changed 失效单飞合并」。验证=library-b2
  红用例转绿。
- **新增 INV（首屏边界）**：随待判点 2 裁决登记（若采方案 A=检查脚本机检）。

## 11. 行数预算表（plan §4.2 全量+本稿细化；实测=2026-11-22 wc -l）

| 文件 | 实测 | 预算/动作 |
|---|---:|---|
| src/renderer/app/App.tsx | 241 | ≤180；仅组合根（§3.1 持有清单） |
| 新增 app/ViewHost.tsx | 新 | ≤140；lazy reader+四视图路由 |
| 新增 app/AppStatusBarHost.tsx | 新 | ≤140；状态条订阅降维宿主 |
| reader/state/PdfDocProvider.tsx | 103 | ≤180；lease 获取/释放+动态加载消费 |
| 新增 reader/state/pdf-document-cache.ts | 新 | ≤260；单飞+LRU+销毁状态机+尺寸缓存 |
| reader/view/PageColumn.tsx | 164 | ≤220；尺寸缓存读/回写，懒窗合同不动 |
| reader/view/ReaderPage.tsx / ReaderPageView.tsx | 161 / 191 | 各≤230；文档回调与页码恢复零变 |
| lineage/LineagePage.tsx | 203 | ≤230；仅挂载路径同图跳过（D5） |
| lineage/lineage.store.ts | 607 | 零触碰（setFolder 语义不改） |
| library/FolderNav.tsx / ImportDropZone.tsx / PaperRowMenu.tsx | 202 / 227 / 141 | 收共享读面，行数只减不增 |
| 新增 library/folder-catalog.store.ts | 新 | ≤180；changed 失效+单飞，不扩其他域 |
| reader/features 内 tab-dirty.ts | 293 | 新增 useTabAutosaveSignals 导出（§3.2）；预算 ≤400 既有口径 |
| scripts/check-first-screen-chunk.mjs（若裁决方案 A） | 新 | ≤120；build 产物符号检查 |

## 12. 已知边界

1. 内存代价：LRU 驻留 2 份文档+各自 worker 常驻（worker-per-task）+活动窗外
   溢短暂 N+1——换来大 PDF 切回零重解析。上限不随打开文献数增长（D2）。
2. 首开延迟：reader 动态 chunk 首次 import 一帧 Suspense 窗口（file:// 毫秒
   级；fallback 占位无文字锚）。
3. PaperRowMenu 目录数据随 catalog 失效自动更新（增强申报，§7）。
4. 单飞失败传播：loading 期全部等待者同收失败（现状 cancelled 静默丢弃被
   替代，§2.5 申报）。
5. 同图跳过判据与 B4 focusSet/per-folder 会话衔接：B4 落地注册表时重审
   （§6 衔接点）；本批不预写 B4 分支。
6. 路径一①（五视图条件卸载重挂）、③（gBCR 全图重路由）、⑤（时间线 DOM
   规模）、⑦（zoom 顶层订阅）不属本批——本批只消 ②⑥+④的句柄/尺寸两级
   与 pdfjs 首屏面。
7. 悬置：App 根 wsItems（课题列表数组本体）订阅仍全量——状态条宿主消费
   wsName/paperCount 计数即可降维，收益小于 nodes/edges（课题列表低频），
   归入宿主迁移一并处理（不单独立判断）。

## 13. 待判点呈主控

1. **App 写源只宿主重渲染的断言口径**（§3.4）：React Profiler onRender 计数
   探针（实现批新建独立测试文件，先红后绿；既有 app-shell 断言零触碰）是否
   采纳？替代方案=ESLint/静态检查禁 App import 域 store 写源（静态但测不到
   行为）。建议：探针方案。
2. **首屏 chunk 断言形态**（§4）：方案 A=新增检查脚本挂 verify/CI（检查脚本
   变更须申报）；方案 B=单测断言 dist（时序不成立，不推荐）。建议：A。
3. **lease 状态机非法迁移集**（§2.2/§2.3）：红测试锁死=同飞共享、迟到释放
   no-op、重复 destroy 防护（§8-1/6/7）；只须设计稿论证=destroying→ready/
   ready→loading 二次 getDocument（状态机结构排除，运行时不可达）。请求
   确认该分界。
4. **同图判据字段**（§6/D5）：folderId 相等+status ready+!needsReload
   （+既有 clean 早退）——不引入图指纹。请求确认。
5. （随判 1 附带）tab-dirty.ts 新增 useTabAutosaveSignals 导出（不改既有导出）
   ——feature 内状态件扩面申报，请求确认。

## 14. 红测试记录（2026-11-22 实测）

先跑红（`npx vitest run` 两文件）：**4 红 / 7 绿守卫（11 例）**，红因实测：

| 用例 | 实测红因 |
|---|---|
| lineage-b2 主图 ready 同图返回 | `graph` spy 被调 1 次（应为 0）——再挂载 setFolder→load→`{folderId:"__main__"}` 第二次 IPC；节点文本仍渲染（store 驻留） |
| lineage-b2 folder 作用域同图返回 | `graph` 被调 1 次，载荷 `{folderId:"f-x"}`（应为 0）——判据字段=folderId 非主图特例 |
| library-b2 三消费面共挂 | folders.list delta=3（应为 1）——FolderNav/ImportDropZone/PaperRowMenu 各自挂载取数 |
| library-b2 changed 单次广播 | folders.list delta=2（应为 1）——FolderNav+ImportDropZone 各自重拉（PaperRowMenu 无 changed 订阅） |

绿守卫（全程保持绿，实现批不得削弱）：显式切图仍重取、手工同值重选仍重取、
needsReload 同图仍重取、dirty 会话挂载零取数+暂存渲染、error 态挂载仍取数、
目录读面计数域（Σ paperCount）、targetFolderId 切换零重取。

零污染验证：`npx vitest run`（全量 4389 例）=4385 通过+仅上述 4 红失败
（Test Files 2 failed | 423 passed）；定向族=app-shell/app-shell-t3u1/
app-quit-dirty/reader-page-open-race/page-column/pages-overlay（68 例）与
lineage-timeline-page/folder-nav/import-dropzone/paper-row-menu/lineage-page-goto
（52 例）全绿。lint（eslint 两文件）exit 0；typecheck exit 0。

## 15. 实施注记（落法次序——实现批）

按 plan §4.4 回滚点切三个逻辑 commit：①目录读面（catalog+三组件+library-b2
转绿）→②App 拆件+同图跳过（ViewHost/AppStatusBarHost/tab-dirty 投影导出+
LineagePage 判据+lineage-b2 转绿+待判 1 探针）→③PDF lease/尺寸缓存+动态边界
（cache 模块+§8 测试族+Provider lease 化+lazy 装配+待判 2 检查）。动态边界
commit 独立可回滚。每 commit 跑定向族；整批 `npm run verify` 全绿+e2e
reader-text/reader-scroll 定向。修核心前后各跑对应测试（AGENTS 测试纪律）。
