# P7E-02 门一审材料包（拖拽导入——preload webUtils 桥）

## 0. 材料包构成与审查对象
- 工单=票面 §2；实现=diff（§3 已跟踪面）+新文件全文（§4）；实现者自报=§5。
- 基线：verify 132 文件 1142 用例→本单后 135 文件 1159（主控已亲复跑 1159 全绿）；locks 246；e2e 基线 34。
- 本票特殊性=**安全姿态变更面**（INV-07 修订：renderer 路径来源扩列拖拽）——请重点攻击该面。

## 1. 宪法硬规则摘要（AGENTS.md 关键条目）
- 安全禁令：禁 renderer 引入任何 Node/Electron API 或绝对文件路径（路径只能来自 main 侧系统对话框——本票修订此条见 §6 INV-07 现文）；禁字符串拼接 SQL；禁新增依赖。
- 分层单向：ipc→services→repos→db；renderer→window.api→ipc（apiDrag 为 preload 桥层同级暴露）。文件≤500 行。
- 测试是锁定合约禁改既有测试文件（本票改 tests/contracts/preload-surface.test.ts=票面声明的受锁改向最小增量，其余全新建）。

## 2. 票面（完整任务书——含 Design 裁决与态空间 D1~D8）
```markdown
# P7E-02 工单票面——拖拽导入（preload webUtils 桥，五层规约）

> registry：`P7E-02` / file `src/main/ipc/import_.ts` / area ipc / owner strong / open
> 排程真相源=v29 §2 第 1 项（=v28 §2 第 2 项顺延）。
> 开工记录：本票段技能清点延续本段开场（subagent-driven-development/TDD/
> verification-before-completion 已加载；门审外链 gate-call.py 在位）。

## ⓪ 出处（无出处默认不工单化——四链在档）

1. B1 报告 §3：`ipc/import_.ts:18 + ImportDropZone.tsx:7（拖拽导入，webUtils.getPathForFile 经 preload）`。
2. ROADMAP §P7-E 内序第 2 位：「标签生命周期 > 拖拽导入 > …」。
3. ipc/import_.ts:18 预留注记：「不做：拖拽路径（renderer 的 webUtils.getPathForFile 在 preload 暴露——v2）」。
4. ImportDropZone.tsx:7+37-38：「拖拽：v1 仅高亮提示『请使用按钮』（webUtils.getPathForFile 需 preload 暴露，v2）」。

- **价值**：导入主路径 ergonomics——文献管理日常高频操作，拖拽比对话框少 3 次点击；
  拖拽是文献管理器用户的肌肉记忆交互。
- **依赖**：Electron 42 preload webUtils.getPathForFile（Electron 29+ 在册 API）；INV-52
  import 会话身份两合一（进度事件 sessionId 三滤——F-D4 既有面直接复用）；零新依赖。
- **风险**：①**安全姿态变更面——INV-07 修订**（「文件/目录路径只能出自 main 侧系统
  对话框，renderer 永远不传路径」既有不变量扩列拖拽源，见 ③架构层 Design 裁决）；
  ②preload 暴露面契约测试锁定（window 只暴露 api/apiEvents 两键断言）——受锁改向；
  ③e2e 无法模拟真实 OS 拖拽（合成 File 经 webUtils 解析得 ''=天然拒）——正向链以
  单测+preload 桥测试锚定，真实拖拽留手动验收面申报。
- **验收**：见 ⑥。

## ① 行为层（态空间表先行——store+异步+用户输入）

### 主控 Design 裁决：通道对 renderer 隐藏（否决透明通道案）

- **采**：fromPaths 通道入 API_SURFACE（main 侧 register 全量注册），但 preload
  **不暴露**于 window.api——经 `PRELOAD_HIDDEN_METHODS` 单源（api-surface.ts 内
  const+类型双消费）跳过；另暴露 `window.apiDrag.importDropped(files)`——preload
  内部解析（webUtils.getPathForFile）→过滤→`ipcRenderer.invoke('import/from-paths')`，
  **路径字符串生命周期限 preload 堆内，renderer 永远拿不到路径串**。
- **否决**（透明通道=fromPaths 直接上 window.api+renderer 持路径串回传）：被攻陷
  renderer 可 invoke 任意路径串（renderer→main 文件读取面）；隐藏案下合成 File 解析
  得 ''（Electron 语义）——**即使 renderer 被攻陷也无法注入任意路径，唯一取路径
  途径=真实 OS 拖拽手势**。INV-07 姿态强于透明案。
- **信任模型**：fromPaths 与 fromDialog 同级——main 信任注入边界（dialogs/preload）
  产生的路径，dialog 有 *.pdf 过滤，preload 侧等价过滤（.pdf 后缀）+数量上限。

### 纯函数 planDroppedImports（新文件 src/preload/drag-import.ts，可测性拆分）

```
planDroppedImports(files: File[], pathFor: (f: File) => string):
  | { kind: 'ok'; paths: string[] }        // 1~100 条：解析成功+.pdf（大小写不敏感）滤后
  | { kind: 'none' }                       // 全滤除（非 pdf/合成 File 解析=''）
  | { kind: 'too-many' }                   // 滤后 >100
```

- 过滤序：逐个 pathFor 解析 → '' 剔除（合成/不可解析）→ 后缀 .pdf 剔除 → 计数判定。
- 目录拖入=File 项无 .pdf 后缀→自然剔除（Electron dataTransfer.files 不递归目录——
  已知边界申报：文件夹拖入得提示语，递归导入走「导入文件夹」按钮）。

### preload 桥 apiDrag（src/preload/index.ts 增 buildDrag，锁定面）

```
window.apiDrag.importDropped(files: File[]): Promise<Result<ImportResult>>
  none     → { ok:false, INVALID_REQUEST「仅支持拖入 PDF 文件」 }（零 invoke）
  too-many → { ok:false, INVALID_REQUEST「一次最多拖入 100 个文件」 }（零 invoke）
  ok       → ipcRenderer.invoke('import/from-paths', { paths })
```

### IPC/契约（受锁面）

- schemas.ts：`importPathsReqSchema = { paths: z.array(z.string().min(1)).min(1).max(100) }.strict()`
  （schema 层第二道数量门）。
- api-surface.ts：import_ 域增 `fromPaths: { channel: 'import/from-paths', Req: S.importPathsReqSchema, Res: S.importResultSchema }`
  +`PRELOAD_HIDDEN_METHODS = { import_: ['fromPaths'] } as const`（const+PreloadApi
  类型 Exclude 双消费单源）+`PreloadDrag` 类型（File 类型可用——两 tsconfig 均 DOM lib）。
- ipc/import_.ts：`fromPaths: (req) => deps.services.import_.importFiles(req.paths)`
  （一行委托；importFiles 既有逐文件 failed[] 尽力而为语义+F-D4 gate+进度事件不变）。
- renderer env.d.ts：`apiDrag: PreloadDrag` 全局声明。

### 态空间跨格序列表（D1~D8——验收=逐格测试锚）

| # | 序列 | 期望 |
|---|---|---|
| D1 | idle→dragOver→dragLeave | 高亮亮/灭（既有样式类） |
| D2 | drop 空手/全滤除（合成 File/非 pdf/目录） | toast「仅支持拖入 PDF 文件」回 idle，**零通道 invoke** |
| D3 | drop 有效 1~100 | apiDrag.importDropped→busy（按钮禁用+进度行）→进度事件（F-D4 sessionId 三滤既有链）→reportImportResult→idle |
| D4 | drop 混合（pdf+非 pdf） | 仅 pdf 导入（planDroppedImports 滤除面），结果计数只含 pdf |
| D5 | busy 期 drop | info toast「导入进行中，请稍候」零 invoke |
| D6 | drop 滤后 >100 | preload 拒 INVALID_REQUEST（零通道 invoke），busy 立即复位 |
| D7 | importDropped IPC 失败 | error toast 回 idle（finally busy 复位——runImport 既有壳复用） |
| D8 | 终局后迟到进度事件 | busyRef 门既有（F-D4）挡，不改在途相 |

### ImportDropZone 接线（renderer）

- onDrop：busy→D5 短路；否则 files=[...e.dataTransfer.files]→await
  window.apiDrag.importDropped(files)→Result 三分支（失败 toast/成功
  reportImportResult 既有函数复用）——**路径串零接触 renderer**。
- 拖拽态文案：「松开以导入 PDF 文件」（替换 DROP_HINT 提示位——同布局纯文案，
  非视觉决策）；:7 与 :37-38 v2 预留注记兑现修订；ipc/import_.ts:18 同步修订。
- busy/sessionRef/busyRef/进度订阅链全复用 F-D4 既有（apiDrag 走同一
  import/from-paths→importFiles→importProgress 事件流，sessionId 链天然一致）。

## ② 接口层

见上（一 schema+一通道+PRELOAD_HIDDEN_METHODS+PreloadDrag+apiDrag 桥；register/
services 零改——importFiles 既有签名直用）。

## ③ 架构层

- **INV-07 修订登记**（docs/invariants.md，本票收口时主控统一改）：路径合法来源
  扩列为 ①main 侧系统对话框（dialogs.ts）②拖拽 File 经 preload webUtils 解析
  （apiDrag 单口，路径串不出 preload，fromPaths 通道 renderer 不可达）——
  renderer 代码仍禁构造/硬编码路径字面量（INV-09 ESLint 面零变）。
- **INV-54 新登记**：拖拽路径单源不变量——File→path 解析唯一口=webUtils 经
  apiDrag.importDropped；fromPaths 通道隐藏单源=PRELOAD_HIDDEN_METHODS（const+
  类型双消费）；数量上限 100 双层（preload planDroppedImports+schema max）；
  合成 File 解析=''天然拒（被攻陷 renderer 无法注入任意路径）。
- 分层不变：renderer→window.apiDrag→preload→ipc→services（preload 属桥层，
  apiDrag 与 api 同级暴露——非 renderer 直连 ipc）。
- contract 测试改向（受锁 [locked-change]）：window 三键（api/apiDrag/apiEvents）；
  api 暴露面=API_SURFACE 减 PRELOAD_HIDDEN_METHODS；apiDrag 形状断言。

## ④ 生命周期层

- ImportDropZone.tsx:7+37-38 / ipc/import_.ts:18 两处 v2 预留注记兑现修订。
- 已知边界（票面外不修只记）：文件夹拖入不递归（提示语引导走按钮）；真实 OS
  拖拽正向链留**手动验收面**（e2e 不可模拟 OS 手势——合成 File 被 ''滤除是设计
  行为本身，e2e 锚定的恰是 D2 负向链）。

## ⑤ 文化层（测试规约——TDD 红→绿→变异红证）

新测试全 always-active：

| 文件 | 覆盖 |
|---|---|
| tests/unit/preload/drag-import.test.ts | planDroppedImports 六分支（ok/none/too-many/''滤/后缀大小写/混合）+apiDrag.importDropped 三分支（none/too-many 零 invoke+错误形状；ok→invoke 载荷）——electron mock 复用契约测试既有形态 |
| tests/unit/ipc/import-paths.test.ts | fromPaths 委托 importFiles（services 桩逐参）——既有 import_.test.ts 受锁不动，新文件承载 |
| tests/unit/renderer/import-drag-ui.test.tsx | D2/D3/D5/D6（drop 事件 dispatch+apiDrag 桩：零调用分支/toast 文案/busy 短路/结果汇报 onImported）——jsdom window.apiDrag 桩 |
| tests/contracts/preload-surface.test.ts（受锁改向） | 三键断言+减集断言+apiDrag 形状（**最小增量改写**：既有用例改期望集，新增 apiDrag 用例——不动既有事件桥两用例） |
| tests/e2e/import-drag.spec.ts（新 spec） | 合成 File drop→toast「仅支持拖入 PDF 文件」真实文本（D2 装配级：真实 Electron preload apiDrag 在场+合成解析=''滤除+零崩溃）；按钮回归（在库页可见） |

- **变异红证 ≥4 组**（先证命中再断红，cp 备份法还原）：
  M1=planDroppedImports 删 ''.pdf'' 过滤（非 pdf 混入→ok 载荷红）；
  M2=apiDrag 删 none 分支直接 invoke（D2 零 invoke 断言红）；
  M3=ImportDropZone drop 处理删 busy 短路（D5 红零 invoke 断言）；
  M4=preload buildApi 删 PRELOAD_HIDDEN 跳过（契约测试减集断言红——fromPaths
  泄漏上 window.api）。
- 先红纪律：每测试文件先红（缺失模块/桥天然红）落盘 scripts/audits/p7e-02-red/。
- 受锁面（主控预解锁）：schemas.ts/api-surface.ts/preload/index.ts/
  preload-surface.test.ts 四件最小增量；新测试+新源文件收口 locks:generate+apply
  （246→预期 250：drag-import.ts+3 unit+1 e2e spec；ipc/import_.ts 与
  ImportDropZone.tsx 非锁面）。

## ⑥ 验收

- `npm run verify` 全绿（基线 132 文件 1142 用例滚动，新增数实测申报）。
- e2e 全量（34+1 新 spec）全绿；真实 OS 拖拽手动验收面在交接书申报（用户在场时
  一次拖入即可闭环）。
- 门一 Kimi 外链+门二 deepseek 异构终审（材料含新文件全文——v28 §3 纪律）。
- grep 无 TODO/FIXME/placeholder；中文 UTF-8 验证。
- INV-07 修订+INV-54 登记+两处预留注记修订+registry P7E-02 翻 done。
- 提交 [locked-change] 尾注（四受锁件+新文件入锁）。

## ⑦ 派发与成本申报

- 三屋：实现者=子代理（继承主控档 GLM5.3 显式申报）；门一=Kimi K3（gate-call.py）；
  门二=deepseek（同链，材料瘦身+32k 档纪律——v29 §3 教训）。
- 实现者禁 git/registry/locks；禁新增依赖；超票面决定停下申报。
- 主控亲验 verify 真退出码+变异红证抽查+diff 范围核对。
```

## 3. 已跟踪面 diff（git diff -U10）
```diff
diff --git a/src/main/ipc/import_.ts b/src/main/ipc/import_.ts
index 61a15b5b58..70676904af 100644
--- a/src/main/ipc/import_.ts
+++ b/src/main/ipc/import_.ts
@@ -1,42 +1,48 @@
 /**
  * [SR-IPC-05] ipc/import_ —— 导入域装配（工单：done / weak）
  *
  * ── 行为层 ──
  * - fromDialog：deps.dialogs.pickPdfFiles() → null（用户取消）返回空结果
  *   { imported: [], duplicates: [], failed: [] }；有路径→ deps.services.import_.importFiles(paths)
  * - fromFolder：pickFolder() 同上 → importFolder(folder)
+ * - fromPaths（P7E-02）：一行委托 importFiles(req.paths)——路径由 preload webUtils
+ *   桥（apiDrag.importDropped）解析产生，通道对 renderer 隐藏（INV-07 修订/INV-54）
  * - 进度推送已由 bootstrap 注入 services 桶（services.sendProgress → webContents.send），
  *   本层是纯薄分发，不碰 sendProgress、不重建 service 实例
  *
  * ── 接口层 ──
  * - export function createImportIpc(deps: IpcDeps): ApiHandlers['import_']
  *
  * ── 架构层 ──
  * - 对话框取消不是错误（返回空 ImportResult）；import 的失败明细在 failed 数组
  *
  * ── 生命周期层 ──
- * - 不做：拖拽路径（renderer 的 webUtils.getPathForFile 在 preload 暴露——v2）
+ * - 拖拽路径已兑现（P7E-02，原 v2 预留注记）：File 经 preload webUtils 解析 →
+ *   apiDrag 单口 → 本通道；路径串生命周期限 preload 堆内
  *
  * ── 文化层 ──
- * - 测试：tests/unit/ipc/import_.test.ts（已锁定，dialogs/services 桩）
+ * - 测试：tests/unit/ipc/import_.test.ts（已锁定，dialogs/services 桩）；
+ *   fromPaths 用例在 tests/unit/ipc/import-paths.test.ts（新文件承载）
  */
 import type { ImportResult } from '../../shared/ipc/schemas'
 import type { ApiHandlers } from '../../shared/ipc/api-surface'
 import type { IpcDeps } from './ipc-deps'
 
 /** 空结果字面量每次新建，避免跨调用共享同一可变对象 */
 const emptyImportResult = (): ImportResult => ({ imported: [], duplicates: [], failed: [] })
 
 export function createImportIpc(deps: IpcDeps): ApiHandlers['import_'] {
   return {
     // 对话框取消（null）不是错误：返回空结果，不触发导入、不上抛
     fromDialog: async () => {
       const paths = await deps.dialogs.pickPdfFiles()
       return paths === null ? emptyImportResult() : deps.services.import_.importFiles(paths)
     },
     fromFolder: async () => {
       const folder = await deps.dialogs.pickFolder()
       return folder === null ? emptyImportResult() : deps.services.import_.importFolder(folder)
-    }
+    },
+    // 拖拽路径（P7E-02）：请求已过 preload 过滤（.pdf 后缀+数量上限）与 schema 双门
+    fromPaths: (req) => deps.services.import_.importFiles(req.paths)
   }
 }
diff --git a/src/preload/index.ts b/src/preload/index.ts
index 52a22122c2..f00b4efb0a 100644
--- a/src/preload/index.ts
+++ b/src/preload/index.ts
@@ -1,33 +1,69 @@
 /**
- * Preload 桥（SR-INFRA-13，已完成）。
+ * Preload 桥（SR-INFRA-13，已完成；P7E-02 增拖拽桥）。
  *
- * 职责：按 shared/ipc/api-surface 的接线表逐通道生成白名单方法，暴露为 window.api。
+ * 职责：按 shared/ipc/api-surface 的接线表逐通道生成白名单方法，暴露为 window.api
+ * （PRELOAD_HIDDEN_METHODS 隐藏面除外）；拖拽导入经 window.apiDrag 单口
+ * （File→webUtils 解析→过滤→import/from-paths，路径串不出 preload 堆）。
  * 不泄漏 ipcRenderer；不暴露任意通道 invoke（renderer 不能自由发消息）。
- * 契约：tests/contracts/preload-surface.test.ts 断言运行时暴露面与接线表一致。
+ * 契约：tests/contracts/preload-surface.test.ts 断言运行时暴露面与接线表（减隐藏面）一致。
  */
-import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
-import { API_SURFACE, EVENT_CHANNELS, type PreloadApi, type PreloadEvents } from '../shared/ipc/api-surface'
-import type { ExportCorpusEvent, ImportProgressEvent, WindowStateEvent } from '../shared/ipc/schemas'
+import { contextBridge, ipcRenderer, webUtils, type IpcRendererEvent } from 'electron'
+import {
+  API_SURFACE,
+  EVENT_CHANNELS,
+  PRELOAD_HIDDEN_METHODS,
+  type PreloadApi,
+  type PreloadDrag,
+  type PreloadEvents
+} from '../shared/ipc/api-surface'
+import type {
+  ExportCorpusEvent,
+  ImportProgressEvent,
+  ImportResult,
+  WindowStateEvent
+} from '../shared/ipc/schemas'
+import { err, type Result } from '../shared/app-error'
+import { planDroppedImports } from './drag-import'
 
 function buildApi(): PreloadApi {
   const api: Record<string, Record<string, (req: unknown) => Promise<unknown>>> = {}
+  const hidden = PRELOAD_HIDDEN_METHODS as Record<string, readonly string[]>
   for (const [domain, methods] of Object.entries(API_SURFACE)) {
     const group: Record<string, (req: unknown) => Promise<unknown>> = {}
+    const hiddenMethods = hidden[domain] ?? []
     for (const [method, ep] of Object.entries(methods)) {
+      // P7E-02：隐藏通道不上 window.api（fromPaths 载荷只能由下方拖拽桥组装）
+      if (hiddenMethods.includes(method)) continue
       group[method] = (req: unknown) => ipcRenderer.invoke(ep.channel, req)
     }
     api[domain] = group
   }
   return api as unknown as PreloadApi
 }
 
+/**
+ * 拖拽导入桥（P7E-02，INV-54）：File → 路径解析唯一口。
+ * none/too-many 在 preload 堆内即拒（零通道 invoke）；ok 才组装
+ * import/from-paths 载荷——renderer 全程不接触路径串。
+ */
+function buildDrag(): PreloadDrag {
+  return {
+    importDropped(files: File[]): Promise<Result<ImportResult>> {
+      const plan = planDroppedImports(files, (f) => webUtils.getPathForFile(f))
+      if (plan.kind === 'none') return Promise.resolve(err('INVALID_REQUEST', '仅支持拖入 PDF 文件'))
+      if (plan.kind === 'too-many') return Promise.resolve(err('INVALID_REQUEST', '一次最多拖入 100 个文件'))
+      return ipcRenderer.invoke('import/from-paths', { paths: plan.paths })
+    }
+  }
+}
+
 /** 事件订阅（main→renderer 单向推送），返回退订函数；形状来自 PreloadEvents（单一真相源） */
 function buildEvents(): PreloadEvents {
   return {
     onImportProgress(cb: (e: ImportProgressEvent) => void): () => void {
       const listener = (_e: IpcRendererEvent, payload: ImportProgressEvent): void => cb(payload)
       ipcRenderer.on(EVENT_CHANNELS.importProgress, listener)
       return () => ipcRenderer.removeListener(EVENT_CHANNELS.importProgress, listener)
     },
     onExportCorpus(cb: (e: ExportCorpusEvent) => void): () => void {
       const listener = (_e: IpcRendererEvent, payload: ExportCorpusEvent): void => cb(payload)
@@ -36,11 +72,12 @@ function buildEvents(): PreloadEvents {
     },
     onWindowState(cb: (e: WindowStateEvent) => void): () => void {
       const listener = (_e: IpcRendererEvent, payload: WindowStateEvent): void => cb(payload)
       ipcRenderer.on(EVENT_CHANNELS.windowState, listener)
       return () => ipcRenderer.removeListener(EVENT_CHANNELS.windowState, listener)
     }
   }
 }
 
 contextBridge.exposeInMainWorld('api', buildApi())
+contextBridge.exposeInMainWorld('apiDrag', buildDrag())
 contextBridge.exposeInMainWorld('apiEvents', buildEvents())
diff --git a/src/renderer/env.d.ts b/src/renderer/env.d.ts
index 08de70233d..dcb122f5c8 100644
--- a/src/renderer/env.d.ts
+++ b/src/renderer/env.d.ts
@@ -1,10 +1,12 @@
-import type { PreloadApi, PreloadEvents } from '../shared/ipc/api-surface'
+import type { PreloadApi, PreloadDrag, PreloadEvents } from '../shared/ipc/api-surface'
 
 declare global {
   interface Window {
     api: PreloadApi
+    /** 拖拽导入桥（P7E-02）：File→路径解析唯一口，与 api 同级（INV-54） */
+    apiDrag: PreloadDrag
     apiEvents: PreloadEvents
   }
 }
 
 export {}
diff --git a/src/renderer/features/library/ImportDropZone.tsx b/src/renderer/features/library/ImportDropZone.tsx
index be6e07085d..ed8324c453 100644
--- a/src/renderer/features/library/ImportDropZone.tsx
+++ b/src/renderer/features/library/ImportDropZone.tsx
@@ -1,59 +1,69 @@
 /**
  * [SR-LIB-06] ImportDropZone —— 导入入口（工单：done / weak）
  *
  * ── 行为层 ──
  * - 两个按钮：「导入 PDF 文件」→ api.import_.fromDialog({})；
  *   「导入文件夹」→ api.import_.fromFolder({})
- * - 拖拽：v1 仅高亮提示"请使用按钮"（webUtils.getPathForFile 需 preload 暴露，v2）
+ * - 拖拽（P7E-02，原 v1 预留注记已兑现）：drop → window.apiDrag.importDropped(files)
+ *   ——File 经 preload webUtils 解析（.pdf 滤+数量上限）→ import/from-paths，
+ *   renderer 全程不接触路径串；busy 期 drop 短路提示（零 invoke）
  * - 进行中：订阅 apiEvents.onImportProgress 显示进度（文件名 current/total）
  * - 进度事件会话身份过滤（F-D4 B 面，INV-52——范式=corpus-export.store INV-18
  *   同族）：busy=false 时忽略（终局后跨通道迟到事件不写 state——渲染门之外的
  *   第二道门）；sessionRef 首事件锚定会话身份，异身份忽略（reload 后旧会话残留
  *   事件不得污染新会话进度显示）；runImport 入口重置 sessionRef=null。busy 的
  *   订阅回调读旧闭包问题用 busyRef 镜像解决（state 与 ref 双写）。
  *   残余窗（照 corpus-export.store 注释同口径）：新会话 start 后首事件前——
  *   旧事件须跨越终局+用户点击两层，理论窗
  * - 完成后 toast 汇总（成功 n/重复 m/失败 k）并经 onImported 通知父级刷新 library.store
  * - 取消（空结果）静默
  *
  * ── 接口层 ──
  * - export function ImportDropZone(props: { onImported(): void }): JSX.Element
  *
  * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
- * - 路径全部由 main 侧对话框产生，renderer 无路径（安全 §6.3）
+ * - 路径合法来源=main 侧系统对话框 + 拖拽 File 经 preload webUtils 解析
+ *   （apiDrag 单口，P7E-02/INV-07 修订）；renderer 无路径字面量（INV-09 不变）
  * - 进度订阅在卸载时退订；busy 期间按钮禁点防重复发起
  */
 import { useEffect, useRef, useState } from 'react'
 import type { DragEvent } from 'react'
 import { api, apiEvents, ApiClientError, unwrap } from '../../api/client'
+import type { Result } from '@shared/app-error'
 import type { ImportProgressEvent, ImportResult } from '@shared/ipc/schemas'
 import { Button } from '../../shared/ui/Button'
 import { showToast } from '../../shared/ui/Toast'
 import type { ToastKind } from '../../shared/ui/Toast'
 
 /** 意外异常（非 ApiClientError）时的兜底中文消息 */
 const IMPORT_FAILED = '导入失败'
 
-/** 拖拽高亮时的提示（Electron 沙箱下 renderer 拿不到真实路径，v1 不支持拖入） */
-const DROP_HINT = '暂不支持拖拽导入，请使用下方按钮选择文件或文件夹'
+/** 拖拽悬停提示（P7E-02 已接线：松手即经 preload 桥导入） */
+const DROP_HINT = '松开以导入 PDF 文件'
+
+/** busy 期再拖入的短路提示（D5——不发起第二次导入） */
+const IMPORT_BUSY_HINT = '导入进行中，请稍候'
 
 /** 进度阶段中文标签（与 ImportProgressEvent.phase 一一对应） */
 const PHASE_LABEL: Record<ImportProgressEvent['phase'], string> = {
   scanning: '扫描文件',
   copying: '复制文件',
   extracting: '提取元数据',
   done: '完成'
 }
 
 type ImportMode = 'dialog' | 'folder'
 
+/** 导入调用形态：dialog/folder/drag 三入口共用 runImport 壳（P7E-02 泛化，壳行为零变） */
+type ImportCall = () => Promise<Result<ImportResult>>
+
 /** 组装进度文案：阶段 + （current/total）+ 文件名 */
 function progressText(e: ImportProgressEvent): string {
   const pos = e.total > 0 ? `（${e.current}/${e.total}）` : ''
   return e.fileName !== '' ? `${PHASE_LABEL[e.phase]}${pos} ${e.fileName}` : `${PHASE_LABEL[e.phase]}${pos}`
 }
 
 /**
  * 结果反馈契约（ImportResult 语义）：
  * - 三项计数全为 0 → 用户取消，静默返回；
  * - 否则 toast 一条汇总（仅列非零项），失败>0 用 error（停留更久），
@@ -89,76 +99,87 @@ export function ImportDropZone(props: { onImported: () => void }): JSX.Element {
     const unsubscribe = apiEvents.onImportProgress((e) => {
       // 终局后迟到事件不改在途相（busy 门挡渲染之外，state 写也挡住）
       if (!busyRef.current) return
       if (sessionRef.current === null) sessionRef.current = e.sessionId
       else if (sessionRef.current !== e.sessionId) return
       setProgress(e)
     })
     return unsubscribe
   }, [])
 
-  async function runImport(mode: ImportMode): Promise<void> {
+  async function runImport(call: ImportCall): Promise<void> {
     if (busy) return
     sessionRef.current = null
     busyRef.current = true
     setBusy(true)
     setProgress(null)
     try {
-      const result =
-        mode === 'dialog'
-          ? await unwrap(api.import_.fromDialog({}))
-          : await unwrap(api.import_.fromFolder({}))
+      const result = await unwrap(call())
       reportImportResult(result, onImported)
     } catch (e) {
       // unwrap 已把 IPC 错误折叠为带中文 message 的 ApiClientError
+      // （拖拽面的 none/too-many 拒绝也是 Result 错误——同路折叠为中文 toast）
       showToast(e instanceof ApiClientError ? e.message : IMPORT_FAILED, 'error')
     } finally {
       busyRef.current = false
       setBusy(false)
       setProgress(null)
     }
   }
 
-  // 拖拽仅做高亮 + 提示：沙箱 renderer 拿不到绝对路径，真实导入一律走 main 侧对话框
+  function startButtonImport(mode: ImportMode): void {
+    void runImport(
+      mode === 'dialog' ? () => api.import_.fromDialog({}) : () => api.import_.fromFolder({})
+    )
+  }
+
+  // 拖拽悬停高亮（D1）；导入动作在 drop 落点（handleDrop）
   function handleDragOver(e: DragEvent<HTMLDivElement>): void {
     e.preventDefault()
     setDragging(true)
   }
 
+  // 拖拽导入（P7E-02）：busy 短路提示（D5，零 invoke）；否则 File 列表交 preload 桥
+  // ——解析/.pdf 滤/数量上限全在 preload 堆内，路径串零接触 renderer（INV-54）
   function handleDrop(e: DragEvent<HTMLDivElement>): void {
     e.preventDefault() // 同时阻止浏览器默认打开文件
     setDragging(false)
-    showToast(DROP_HINT, 'info')
+    if (busyRef.current) {
+      showToast(IMPORT_BUSY_HINT, 'info')
+      return
+    }
+    const files = [...e.dataTransfer.files]
+    void runImport(() => window.apiDrag.importDropped(files))
   }
 
   return (
     <div
       onDragOver={handleDragOver}
       onDragLeave={() => setDragging(false)}
       onDrop={handleDrop}
       className={`lib-dropzone flex flex-col items-center gap-3 p-6${dragging ? ' lib-dropzone-dragging' : ''}`}
     >
       <p className="text-sm" style={{ color: dragging ? 'var(--accent)' : 'var(--text-dim)' }}>
         {dragging ? DROP_HINT : '将 PDF 拖到此处，或使用按钮导入'}
       </p>
       <div className="flex gap-2">
         <Button
           variant="primary"
           disabled={busy}
-          onClick={() => void runImport('dialog')}
+          onClick={() => startButtonImport('dialog')}
         >
           导入 PDF 文件
         </Button>
         <Button
           variant="secondary"
           disabled={busy}
-          onClick={() => void runImport('folder')}
+          onClick={() => startButtonImport('folder')}
         >
           导入文件夹
         </Button>
       </div>
       {busy && (
         <p role="status" className="text-xs" style={{ color: 'var(--text-dim)' }}>
           {progress !== null ? progressText(progress) : '正在打开选择窗口…'}
         </p>
       )}
     </div>
diff --git a/src/shared/ipc/api-surface.ts b/src/shared/ipc/api-surface.ts
index b66352c9cb..691bd64cec 100644
--- a/src/shared/ipc/api-surface.ts
+++ b/src/shared/ipc/api-surface.ts
@@ -37,21 +37,23 @@ export const API_SURFACE = {
   reader: {
     open: { channel: 'reader/open', Req: S.paperIdReqSchema, Res: S.readerOpenResSchema },
     saveAnnotation: { channel: 'reader/save-annotation', Req: S.saveAnnotationReqSchema, Res: annotationSchema },
     updateAnnotation: { channel: 'reader/update-annotation', Req: S.updateAnnotationReqSchema, Res: annotationSchema },
     deleteAnnotation: { channel: 'reader/delete-annotation', Req: S.annotationIdReqSchema, Res: S.trueAckSchema },
     listAnnotations: { channel: 'reader/list-annotations', Req: S.paperIdReqSchema, Res: S.annotationListResSchema },
     saveProgress: { channel: 'reader/save-progress', Req: S.saveProgressReqSchema, Res: S.trueAckSchema }
   },
   import_: {
     fromDialog: { channel: 'import/from-dialog', Req: S.voidReqSchema, Res: S.importResultSchema },
-    fromFolder: { channel: 'import/from-folder', Req: S.voidReqSchema, Res: S.importResultSchema }
+    fromFolder: { channel: 'import/from-folder', Req: S.voidReqSchema, Res: S.importResultSchema },
+    // P7E-02：拖拽路径通道——main 侧全量注册，但 preload 不暴露（见 PRELOAD_HIDDEN_METHODS）
+    fromPaths: { channel: 'import/from-paths', Req: S.importPathsReqSchema, Res: S.importResultSchema }
   },
   enrich: {
     fetch: { channel: 'enrich/fetch', Req: S.enrichReqSchema, Res: paperDetailSchema }
   },
   export_: {
     bibtex: { channel: 'export/bibtex', Req: S.exportSelectionReqSchema, Res: S.exportResSchema },
     csv: { channel: 'export/csv', Req: S.exportSelectionReqSchema, Res: S.exportResSchema },
     report: { channel: 'export/report', Req: S.reportReqSchema, Res: S.exportResSchema },
     corpus: { channel: 'export/corpus', Req: S.corpusReqSchema, Res: S.exportResSchema },
     corpusSet: { channel: 'export/corpus-set', Req: S.corpusSetReqSchema, Res: S.corpusSetResSchema },
@@ -146,40 +148,73 @@ type Ep<D extends keyof Surface, M extends keyof Surface[D]> =
 
 /**
  * bootstrap 组合装配域（R1-WS1 主控裁决：ipc/index.ts+ipc/register.ts 零改动）。
  * 这些域的 handlers 不出自 createIpcHandlers，而由 bootstrap 在 registerIpc 前
  * 组合补齐（表驱动注册不变——registerIpc 仍按本表全量注册+校验）。
  * 代价申报：ApiHandlers 对该域可选=漏组合不再编译期拦截（运行时接线缺失由
  * contracts 枚举+单测/e2e 锚定补偿）；PreloadApi 不受影响（全量映射）。
  */
 type ComposedHandlerDomains = 'workspaces'
 
+/**
+ * preload 不暴露到 window.api 的方法（P7E-02 主控 Design 裁决）：
+ * fromPaths 通道 main 侧照常全量注册，但 renderer 不可达——路径串生命周期限
+ * preload 堆内（apiDrag 单口解析，INV-07 修订/INV-54）；被攻陷 renderer 即使
+ * 拿到 api 也无法 invoke 任意路径串。const+PreloadApi 的 Exclude 类型双消费
+ * 单源（先例=ComposedHandlerDomains 的消费形态）。
+ */
+export const PRELOAD_HIDDEN_METHODS = {
+  import_: ['fromPaths']
+} as const
+
 /** main 侧 service 契约：收已校验请求，返回纯数据（异常上抛由 register 统一折叠） */
 export type ApiHandlers = {
   [D in Exclude<keyof Surface, ComposedHandlerDomains>]: {
     [M in keyof Surface[D]]: (req: z.output<Ep<D, M>['Req']>) => Promise<z.output<Ep<D, M>['Res']>>
   }
 } & {
   [D in ComposedHandlerDomains]?: {
     [M in keyof Surface[D]]: (req: z.output<Ep<D, M>['Req']>) => Promise<z.output<Ep<D, M>['Res']>>
   }
 }
 
-/** renderer 可见的 API 形状：入参宽松（默认值可省），返回一律 Result */
+/** 域内隐藏方法名并集（域不在 PRELOAD_HIDDEN_METHODS → never，Exclude 恒等） */
+type HiddenOf<D extends keyof Surface> = D extends keyof typeof PRELOAD_HIDDEN_METHODS
+  ? (typeof PRELOAD_HIDDEN_METHODS)[D][number]
+  : never
+
+/** 域内 preload 可见方法键（隐藏面排除——单源消费 PRELOAD_HIDDEN_METHODS） */
+type VisibleMethodKeys<D extends keyof Surface> = Exclude<keyof Surface[D], HiddenOf<D>>
+
+/** 单通道的桥签名（Ep 推导收进别名体——mapped key 泛型调用与值位 Ep 索引访问
+ *  同现会踩 esbuild 解析缺陷，别名层规避；语义零变） */
+type MethodBridge<D extends keyof Surface, M extends keyof Surface[D]> = (
+  req: z.input<Ep<D, M>['Req']>
+) => Promise<Result<z.output<Ep<D, M>['Res']>>>
+
+/** renderer 可见的 API 形状：入参宽松（默认值可省），返回一律 Result；
+ *  隐藏通道（PRELOAD_HIDDEN_METHODS）从暴露面排除——单源消费 */
 export type PreloadApi = {
   [D in keyof Surface]: {
-    [M in keyof Surface[D]]: (
-      req: z.input<Ep<D, M>['Req']>
-    ) => Promise<Result<z.output<Ep<D, M>['Res']>>>
+    [M in VisibleMethodKeys<D>]: MethodBridge<D, M>
   }
 }
 
+/**
+ * 拖拽导入桥形状（P7E-02）：File → 路径解析唯一口（webUtils 经 preload），
+ * 与 api 同级暴露为 window.apiDrag——非 renderer 直连 ipc。File 类型可用
+ * （tsconfig.web / tsconfig.node 两套 lib 均含 DOM）。
+ */
+export type PreloadDrag = {
+  importDropped(files: File[]): Promise<Result<S.ImportResult>>
+}
+
 /** 展平的通道名列表（注册与对账用） */
 export function allChannels(): { domain: string; method: string; channel: string }[] {
   const out: { domain: string; method: string; channel: string }[] = []
   for (const [domain, methods] of Object.entries(API_SURFACE)) {
     for (const [method, ep] of Object.entries(methods)) {
       out.push({ domain, method, channel: ep.channel })
     }
   }
   return out
 }
diff --git a/src/shared/ipc/schemas.ts b/src/shared/ipc/schemas.ts
index f0608e1913..2a061ee8d6 100644
--- a/src/shared/ipc/schemas.ts
+++ b/src/shared/ipc/schemas.ts
@@ -54,20 +54,30 @@ export const annotationIdReqSchema = z
   .strict()
 
 export const annotationListResSchema = z.array(annotationSchema)
 
 export const saveProgressReqSchema = z
   .object({ paperId: z.string().min(1), page: z.number().int().min(0) })
   .strict()
 export const trueAckSchema = z.object({ ok: z.literal(true) }).strict()
 
 // ── import_（对话框在 main 侧发起，renderer 不传任何路径）─────────────
+/**
+ * 拖拽导入请求（P7E-02）：paths 由 preload webUtils 桥（apiDrag.importDropped）
+ * 解析产生——renderer 不可构造本请求（通道对 renderer 隐藏，INV-07 修订/INV-54）。
+ * min(1)/max(100) 是 schema 层第二道数量门（第一道=preload planDroppedImports）。
+ */
+export const importPathsReqSchema = z
+  .object({ paths: z.array(z.string().min(1)).min(1).max(100) })
+  .strict()
+export type ImportPathsReq = z.infer<typeof importPathsReqSchema>
+
 export const importResultSchema = z
   .object({
     imported: z.array(paperSummarySchema),
     duplicates: z.array(z.string()), // 文件名
     failed: z.array(z.object({ fileName: z.string(), reason: z.string() }).strict())
   })
   .strict()
 export type ImportResult = z.infer<typeof importResultSchema>
 
 /** 导入进度事件（main→renderer 单向推送）。sessionId=会话身份（F-D4，INV-52）：
diff --git a/tickets/registry.ts b/tickets/registry.ts
index a144b1fa9e..a636a5dca7 100644
--- a/tickets/registry.ts
+++ b/tickets/registry.ts
@@ -224,20 +224,21 @@ export const TICKETS: readonly Ticket[] = [
   { id: 'SR2-F-08', file: 'src/renderer/features/reader/SelectionLayer.tsx', area: 'reader', owner: 'strong', status: 'done', summary: '划选视觉反馈回退官方原生半透明（F1 修正役 R1 路线——ADR-0019；复测站 3「全面失败+0.5~5s 延迟」根修）：①text-layer.css ::selection/::-moz-selection 回官方 rgba(0 0 255 / 0.25)（逐字对照 pdfjs-dist pdf_viewer.css:678-685；br 两规则保持 transparent）；②删 SelectionRects.tsx 整件+SelectionLayer 摘 overlay 计算/渲染（P10 方案切换=删旧）；③视觉通道=原生 ::selection（拖选第一帧即反馈，零 JS 链路——取证：自绘层 30% accent 合成 rgb(191,207,220) 近乎不可见+拖选期死寂=根因双实锤，O(n) 遍历 0~0.6ms 假说证伪）；④工具条/保存/undo/Escape 零变；AnnotationLayer 单层 multiply+AI 层去 multiply（F-07 层间修复）保留；⑤受锁两文件第三次改写：e2e F-06 小票 C 节（官方半透明精确值+selection-rects 防回归 0 计数+L7 延迟预算 toolbar≤1.5s）+unit F-07a 改防回归守卫/F-07b 删——票面 scripts/audits/sr2-f-08-brief.md；取证 scripts/audits/f1-forensics.report.md；三屋：实现 1.95M tok/858 用例绿+门一 PASS 0B/4W/7N+门二 PASS 零回炉（W3=INV-37 登记）；依赖 ADR-0019 裁决' },
   { id: 'SR2-F-09', file: 'src/renderer/features/reader/text-layer.css', area: 'reader', owner: 'strong', status: 'done', summary: '划选选中色改灰（用户令 2026-08-29：仿 WPS——灰色选中/标注纯色；v5 核查=标注纯色+重合不加重已成立零改）：text-layer.css ::selection/::-moz-selection rgba(0 0 255 / 0.25)→rgba(0 0 0 / 0.30)（≈白纸 #B3B3B3）；受锁 e2e reader-text.spec F-06 小票 C 节精确值断言+测试名同步；INV-37/ADR-0019 补记（用户指令偏离官方值的显式登记）；压缩路径票（单值变更+守卫同步，主控直做——变异红证 sr2-f-09-mutation.raw.txt：css 改回蓝→F-06 小票红点精确锁值；verify 858+locks+e2e 25 passed 全绿；v5b 真机像素证=差分区 93.3% 中性灰/均值 rgb(151,154,155)）；核查档 scripts/audits/f1-out/f1-forensics5.json+v5 截图+执行记录 sr2-f-09-record.md' },
   { id: 'R2-LG11', file: 'src/renderer/features/lineage/LineageNodeCard.tsx', area: 'lineage', owner: 'strong', status: 'done', summary: '脉络重制浅色严谨板（U2a=U2 修正役零 schema 先行单元——用户五决 2026-08-29 落地；R2-LG9 星象板方向否决后的修正延续=R2 系）：白卡+边框编码 A 线型×色阶（核心=accent 1.5 实线/普通=node-branch 1 实线/主题+综述=虚线 6-4；选中 +0.75）+foreignObject 题名换行 ≤3 行省略+title tooltip（LineageNodeCard:78 单行 text 根修）+nodeHeight 卡高单源（INV-38 三消费 1/2/3 行=64/82/100）+isSurvey/isCore 纯函数+综述布局右缘新列+综述关联边淡灰虚线 2-3（决3）+夜幕系脉络域摘除（.lineage-host 白底+LineageNightDecor 删+图例改写 LineageLegend 四项+工具条/适应视图/侧板三件白玻璃化+脉络衬线年份摘除=决5 连带）+BAND_LEFT 单源（B1 清账）；**isCore 出度口径修正（2026-08-29 真机复评裁决）**：初版「入度≥2」在 INV-27 树单父约束下数学恒假（合法图入度≤1 恒不触发；取证器 fixture 造双入边被 service 多父守卫拒=单测全绿≠真实数据形态可达的活证据）——「被引≥2 开宗立派」=≥2 继承者=出度≥2，主控压缩票直做（classify.ts+classify.test/visual.test 夹具同步+票面/INV-38 更正+变异红证 mutation-5.log 4 it 红）；受锁改写 lineage-canvas R2-LG9 块（拆 lineage-canvas-visual.test.tsx——max-lines 500）+lineage-layout 增两 describe+lineage-side-panel :311 夜化 it+新 lineage-classify.test（locks 163+取证器 r2-lg11-forensics.mjs 入锁=164）；e2e lineage.spec 零改（预裁兑现）；三屋：实现者 15.8M tok（875 用例精确命中 858−5+7+7+8）+门一 B0/W6/N9 PASS（6W 主控处置：W1/W2 申报、W3 主控补跑 mutation-4 GAP 精确值红、W4/W5/W6 遗留池）+门二 PASS 可直接收口；真机复评四线全过（wrapInBox/borderDiscernible/noRegression/surveyRight——取证档 scripts/audits/r2-lg11-out/ json+png；ABI 换绑 Windows 文件锁竞态=取证器 hash 校验防线+缓冲，环境怪癖常量化）；票面 scripts/audits/r2-lg11-brief.md+实现/门一/门二报告三份在档；裁决母本 docs/prompts/2026-08-29_loop-handoff-v3.md §2/§3' },
   { id: 'R2-LG12', file: 'src/main/services/lineage/lineage.service.ts', area: 'lineage', owner: 'strong', status: 'done', summary: '综述多参考边数据面（U2b——用户裁决 2026-08-29「A. 完整多参考边」AskUserQuestion 在案）：lineageEdge 增 kind:tree|ref（出口必填/upsert 可选缺省 tree/service+importDraft 双写路径显式填；draft 协议零改）+迁移 006（ADD COLUMN kind TEXT NOT NULL DEFAULT tree——旧行幂等+migrate.test [1..5,6]）+service upsertEdge 受控豁免分支（ref 豁免多父且 tree 侧收窄 ref 入边不算 tree 父=对偶自洽/仍拒环=混合图 reachable/同端点对 tree+ref 互斥拒/from 双条件 paperId≠null+isSurveyTitle——判定上移 shared/models 单源+renderer re-export 消费面零改）+layout 净化段剔 ref 边（不计 dropped——有意分流）+渲染 ref=var(--survey-edge) 1.4 虚 2-3（直读 e.kind，优先级 ref>综述关联>推断>普通）+综述右键「添加参考连接」入口（pending-link mode 扩展 ref）+INV-27 修订登记（tree 单父原样/ref 受控豁免条款）；受锁面=shared models+ipc schemas+006 迁移+lineage-import/layout/visual 三测+6 测试工厂 kind 波及+e2e lineage.spec T5（综述幽灵行第四篇独立 fixture→右键→点已有 tree 父的甲=豁免面→ref path 精确断言→reload 持久+负锚非综述无菜单项）；三屋：实现者 10.0M tok（883 用例精确命中 875+service6+layout1+visual1+变异红证 4 档含 M2 混合环盲区拦截/M4 自环 reason 红点）+门一 B0/W2/N6（W1=check-tickets R2 系正则盲区建单时已知设计、W2=主控 diff 包 git add 失误门一补全）+门二 PASS 零回炉（W3 剪贴板复验落盘补跑 2.0s 过/N7 首红未落盘教训回流）；收口：verify exit=0（locks 165=164+006）+e2e 26/26 终态（T5 首跑即过+corpus 超时 2.5s 单跑复验=负载 flake+剪贴板 2.0s 复验）；票面 r2-lg12-brief.md+三报告+收口单在档' },
   { id: 'R2-SH1', file: 'src/main/bootstrap.ts', area: 'infra', owner: 'strong', status: 'done', summary: '应用重命名 Synapse Remake→Synapse+userData 数据迁移（U3a——独立成票单独审计·handoff §8；⚠landmine=userData 目录名派生自 productName=用户真实数据目录搬迁，复用 WS1 幂等模式）：package.json name/productName 同步+文本消费位（main-window 标题/App 品牌位/index.html title 超票面发现+受锁 smoke.spec/app-shell.test 断言）+grep 口径修正（消费/注释面清零；迁移模块+测试功能面字面量 6 处=契约钉死豁免——门一 W1 结构性调和裁决）；迁移=独立模块 migrate-user-data.ts（纯 node:fs 零 electron 可测性）bootstrap 最早段——分支矩阵：旧在新无→renameSync 原子迁移+显式 setPath（Electron 启动期缓存派生值=实现者超票面发现，userDataDir 取值在迁移后=时序无竞态主控独立核实+门一交叉验证）；新已存在→跳过（天然备份）；皆无→全新；rename 失败→回落旧路径运行（数据安全优先）+warn；受锁=constants 邮箱域/smoke/app-shell 三件+新测试 5 it（分支矩阵全测+setPathCalls 显式断言）+locks 166；门一 B0/W3/N10（W-G1 electron-builder.yml 钉旧名=票面「无安装器面」前提失实→主控直改 productName/artifactName；W-G2 ci 强制 [dep-change]→收口双尾注；W-G3 lockfile root name→主控直改）+门二 PASS 零回炉（grep 亲测 6 命中分类正确+sha256 独立复算逐位命中）；W4 local-state.mjs 取证器路径随收口改（新目录优先+旧名兜底）；**真机迁移验证（备份-换装舞步）**：39M 真实库 tmp 全备份→首启=窗口标题 Synapse+双课题结构完整迁入新位+旧位 rename 走→二启幂等（跳过分支+旧位零重建）；verify exit=0（888 用例=883+5 精确命中）+e2e 全量 26；提交双尾注 [locked-change]+[dep-change]——票面/三报告/收口单在档' },
   { id: 'R2-SH2', file: 'src/renderer/app/App.tsx', area: 'infra', owner: 'strong', status: 'done', summary: '顶栏身份区+字体衬线消费清零（U3b——决4/决5 纯执行）：App 壳 header 条 h-11=44px（logo+Synapse 应用名+WorkspaceSwitcher 迁位零触碰+ver 随迁）+侧栏品牌行删+B1 wrapper+max-height 防展开错位+B2 header z-index 防盖板+--font-display 消费五类+lib 三类（W2 主控压缩票补——票面清单漏 library.css，决5「lib 衬线年份」明文）清零（token 定义保留）+--gold-night 别名退役（定义删+theme.test 同步）+三负锚（theme.css/library.css/font-display+gold-night 定义）；受锁=app-shell（品牌断言侧栏→顶栏+新 it 三件）/theme（负锚+TOKENS 删行）/r3-rdr-set-visual（:151 旧衬线锁→决5 负锚改写=同向双保险非放宽——实现者自裁）；三屋：实现者 2.9M tok（890=888+3−1 精确命中+双变异）+门一 PASS 无回炉（B1/B2 防御必要性核实/switcher 零锚定复核/N1 verify 时序硬条件/W4 对比度升格）+门二 PASS 零回炉+主控 W2 压缩票（library 三处+负锚扩+mutation-3 红点+sed 行号错位结构修复实录）；真机复评（r2-sh2-out/header.png）：顶栏 44px computed 实测三件在场+侧栏品牌行 0 计数+全 DOM Georgia 消费 0+**W4 解除**（trigger 实际色深色 rgb(35,38,45) on 白底——门一米白推演错位）+F-05/INV-34=定高+flex 链推演+e2e 全量阅读器链证据组合——票面/三报告/收口单在档' },
   { id: 'F-R2', file: 'src/renderer/features/reader/scroll-converge.ts', area: 'reader', owner: 'strong', status: 'done', summary: 'ui-scale≠1 程序滚动落点漂移修复（v18 U1 闭环——H1 根因=gBCR 视觉差值 1:1 加本地 scrollTop，探针三场景三档数值闭合 160-450px；方案 B 算术折算：effectiveZoom 单源+scroll-converge start/center 折算+scroll-progress getPageBoxes 同批修；真机复验 −512.6→−0.6 基线级/next 旁支同根归位；先红 6+变异 M1~M4+verify 126 文件 1081；门一 Kimi 链首战 B:0/W:1/N:6 可收口——换源事件 kimi-main→kimi-backup 实战；INV-34 量纲附注；B-3/H3 证伪备案 v19；票面+报告+门一全套 scripts/audits/f-r2-*）' },
   { id: 'P7A', file: 'tests/e2e/reader-text.spec.ts', area: 'e2e', owner: 'strong', status: 'done', summary: 'P7-A 剪贴板竞态 flake 专项（v18 U2 闭环——六场六现+第七现实锤；修=清场标记+条件重读 5×200ms+失败可归因末次读值，断言锚不放宽；受锁先红=外部占用注入复刻（p7a-red1）；主控压缩票直做（预算降级，担责披露）；连跑 3 次 P7-A 全绿；票面 scripts/audits/p7a-ticket.md）' },
   { id: 'F-R3', file: 'src/renderer/features/reader/CorpusExtractor.ts', area: 'reader', owner: 'strong', status: 'done', summary: 'AUDIT-C C-1 修票（二波场 2026-09-02）：轨二 c=P6 泄漏闭（settleLoadTask 纯函数——加载失败 destroy 恰一次+自身拒绝吞并+await settle 后重抛原错误；loadPdfDocument 接线保 task 句柄；头注状态机表证伪格改如实双路径）；轨一 e=上游查证（f-r3-upstream-check.md：v5.5.207 已修主逃逸点 onFailure 终接守卫/6.3.289 另有 destroy() 族硬化/master pdfManagerReady 悬尾仍在）→**终裁不升级**（任一档位不承诺零同族噪声+跨 major 回归面不换 devtools-only 收益；升级再评估触发条件=上游悬尾族全消）；轨二 b=destroy 序列化不采（无消噪声收益+切换串行延迟确定代价）；INV-49 登记（worker-per-task+销毁序+接受残余+代理计数监控锚）；门一 Kimi 3B/2W/0N PASS+门二 deepseek 2B/1W/2N PASS（W1 变异红证缺口主控补销=变异 A 同引用重抛/B 恰一次/C 顺序 settle+顺序测试 1 it；W2 upstream 档补包+降噪论证补强）；实现者 GLM5.3 统一档 1.94M tok+主控压缩票三变异；票面 f-r3-fix-brief.md+报告 f-r3-fix-impl.report.md+四门审档在档' },
   { id: 'P7E-01', file: 'src/main/db/repos/tags.repo.ts', area: 'db', owner: 'strong', status: 'done', summary: '标签生命周期（改名/合并/删除——P7-E 预留点清扫首票；b3: P7-E+B1 §3 预留 tags.service.ts:16+TagEditor.tsx:92；repo 四方法含跨表事务/service 校验序（NOT_FOUND/CONFLICT/自合并 INVALID_REQUEST）/三 IPC 通道 [locked-change]/renderer store 命令型动作+TagFilter 右键管理面（TagLifecycle+TagLifecycleMenu 拆件）；态空间 S1~S10+INV-53 登记；门一 Kimi 0B/3W/3N（W3 Esc/W1 恒真口径回炉+W2 S10 豁免补记）+门二 deepseek PASS 零回炉；单测 132 文件 1142（+29）/e2e 34（+1）；票面 scripts/audits/p7e-01-brief.md+三报告档在案）' },
+  { id: 'P7E-02', file: 'src/main/ipc/import_.ts', area: 'ipc', owner: 'strong', status: 'open', summary: '拖拽导入（P7-E 预留点清扫二票；b3: P7-E+B1 §3 预留 ipc/import_.ts:18+ImportDropZone.tsx:7；Design=fromPaths 通道对 renderer 隐藏（PRELOAD_HIDDEN_METHODS 单源）+apiDrag.importDropped 桥（webUtils 解析+路径串不出 preload——INV-07 修订+INV-54 登记）；态空间 D1~D8；票面 scripts/audits/p7e-02-brief.md）' },
   { id: 'C-A3', file: 'src/renderer/features/notes/notes.store.ts', area: 'reader', owner: 'strong', status: 'done', summary: 'AUDIT-C C-3 扫描 §1.2-a 主候选修票（二波场 2026-09-02）：notes 防抖悬置写三件套=①discard API（discardPendingEdit/discardAllPendingEdits——清 timer+四元数据+条目，幂等）②in-flight 代际守卫（discardGen 派发快照+.then/.catch 回调首行全 no-op——防回调复活条目）③接线两点（tab-dirty confirmCloseDirty 守门内弃改收口=一切 tab 关闭路径必经；workspace.store switchTo 确认后 discardAll——check-quality 白名单受控例外）；main 归属校验已在职零改动（notes.service findById→NOT_FOUND——扫描报告「FK 偶然兜底」口径修正）；跨格序列①②③④逐一测试锚（含 e2e 复活面端到端「已保存」载入锚）；INV-50 登记+INV-35④ 兑现修订；门一 Kimi 0B/3W/8N 条件 PASS（W1 reject 版序列②主控压缩票补销+变异恰红/W3 App 聚合含 notes pending 代码面核验成立/W2 load×discard 裁定接受残余=重建条目为服务器基线复活不可能）+门二 deepseek 终审；实现者 GLM5.3 统一档 6.18M tok+主控压缩票 W1 补锚；票面 auditc-a3-brief.md+报告 auditc-a3-impl.report.md+两门审档在档' },
 ] as const
 
 export const TICKET_MAP: ReadonlyMap<string, Ticket> = new Map(TICKETS.map((t) => [t.id, t]))
 
 export function isTicketDone(id: string): boolean {
   return TICKET_MAP.get(id)?.status === 'done'
 }
 
 export function openTickets(): Ticket[] {
```

## 4. 新文件全文（未跟踪——diff 不含，逐文件全文）

### 新文件：src/preload/drag-import.ts（41 行）
```typescript
/**
 * [P7E-02] 拖拽导入纯函数（preload 桥的可测性拆分）。
 *
 * ── 行为层 ──
 * planDroppedImports(files, pathFor)：
 * - 过滤序：逐个 pathFor 解析 → '' 剔除（合成 File/不可解析——Electron webUtils
 *   对非 OS 拖拽手势的 File 解析得 ''，天然拒）→ 后缀 .pdf（大小写不敏感）剔除
 *   → 计数判定；
 * - 滤后 1~100 → { kind: 'ok', paths }；全滤除 → { kind: 'none' }；>100 →
 *   { kind: 'too-many' }；
 * - 目录拖入 = File 项无 .pdf 后缀自然剔除（Electron dataTransfer.files 不递归
 *   目录——已知边界：递归导入走「导入文件夹」按钮）。
 *
 * ── 架构层 ──
 * 路径串生命周期限 preload 堆内（INV-07 修订/INV-54）：本模块产物只供
 * apiDrag.importDropped 组装 import/from-paths 载荷，不得流向其他任何面。
 *
 * ── 文化层 ──
 * 测试：tests/unit/preload/drag-import.test.ts（六分支 always-active）。
 */

/** 单次拖入数量上限（与 importPathsReqSchema 的 max 同值——preload 过滤与 schema 校验双层门） */
export const MAX_DROP_FILES = 100

export type DropPlan =
  | { kind: 'ok'; paths: string[] }
  | { kind: 'none' }
  | { kind: 'too-many' }

export function planDroppedImports(files: File[], pathFor: (f: File) => string): DropPlan {
  const paths: string[] = []
  for (const f of files) {
    const p = pathFor(f)
    if (p === '') continue // 合成 File（e2e/被攻陷 renderer 造的假 File）解析为空——剔除
    if (!p.toLowerCase().endsWith('.pdf')) continue // 非 PDF（含目录项）——剔除
    paths.push(p)
  }
  if (paths.length === 0) return { kind: 'none' }
  if (paths.length > MAX_DROP_FILES) return { kind: 'too-many' }
  return { kind: 'ok', paths }
}
```

### 新文件：tests/unit/preload/drag-import.test.ts（134 行）
```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * [P7E-02] 拖拽导入 preload 面（always-active，无工单门）：
 * - planDroppedImports 纯函数六分支（ok/ok 边界/none/too-many/'' 滤/后缀大小写/混合）；
 * - apiDrag.importDropped 三分支：none/too-many → INVALID_REQUEST 中文错误且
 *   **零通道 invoke**（合成 File/超量在 preload 堆内即拒——被攻陷 renderer 无法
 *   注入任意路径，INV-54）；ok → invoke('import/from-paths', { paths }) 载荷。
 * electron mock 形态复用契约测试（preload-surface.test.ts）：exposed 收集
 * exposeInMainWorld、ipcRenderer/webUtils 打桩。
 */
const exposed = vi.hoisted(() => new Map<string, unknown>())
const mocks = vi.hoisted(() => ({
  invoke: vi.fn<(channel: string, req: unknown) => Promise<unknown>>(),
  on: vi.fn<(channel: string, listener: (e: unknown, payload: unknown) => void) => void>(),
  removeListener: vi.fn<(channel: string, listener: unknown) => void>(),
  pathFor: vi.fn<(f: File) => string>()
}))

vi.mock('electron', () => ({
  contextBridge: {
    exposeInMainWorld: (key: string, value: unknown): void => {
      exposed.set(key, value)
    }
  },
  ipcRenderer: mocks,
  webUtils: { getPathForFile: mocks.pathFor }
}))

await import('../../../src/preload/index')
import { MAX_DROP_FILES, planDroppedImports } from '../../../src/preload/drag-import'

/** File 桩：planDroppedImports 不读 File 自身属性（路径解析权全在 pathFor 注入） */
function file(name: string): File {
  return { name } as File
}

/** 按文件名映射解析结果的 pathFor 桩（未登记名 → ''＝合成 File 语义） */
function pathByMap(map: Record<string, string>): (f: File) => string {
  return (f) => map[(f as { name: string }).name] ?? ''
}

describe('P7E-02 planDroppedImports —— 过滤与计数判定（纯函数）', () => {
  it('ok：单条 pdf 解析成功 → { kind: ok, paths }', () => {
    const plan = planDroppedImports([file('a.pdf')], pathByMap({ 'a.pdf': 'E:/论文/a.pdf' }))
    expect(plan).toEqual({ kind: 'ok', paths: ['E:/论文/a.pdf'] })
  })

  it('ok 边界：恰好 100 条（上限含端）', () => {
    const files = Array.from({ length: MAX_DROP_FILES }, (_, i) => file(`f${i}.pdf`))
    const pathFor = (f: File): string => `E:/${(f as { name: string }).name}`
    const plan = planDroppedImports(files, pathFor)
    expect(plan).toEqual({ kind: 'ok', paths: files.map((f) => `E:/${(f as { name: string }).name}`) })
  })

  it('none：空手与非 pdf 全滤除', () => {
    expect(planDroppedImports([], (f) => `E:/${(f as { name: string }).name}`)).toEqual({ kind: 'none' })
    expect(
      planDroppedImports([file('a.docx'), file('b.png')], pathByMap({ 'a.docx': 'E:/a.docx', 'b.png': 'E:/b.png' }))
    ).toEqual({ kind: 'none' })
  })

  it("'' 滤：合成 File（webUtils 解析得空串）逐条剔除，全空 → none", () => {
    const plan = planDroppedImports([file('a.pdf'), file('b.pdf')], () => '')
    expect(plan).toEqual({ kind: 'none' })
  })

  it('后缀大小写不敏感：A.PDF 保留；伪后缀（pdf.txt / pdff）剔除', () => {
    const plan = planDroppedImports(
      [file('A.PDF'), file('b.Pdf'), file('c.pdf.txt'), file('d.pdff')],
      pathByMap({ 'A.PDF': 'E:/A.PDF', 'b.Pdf': 'E:/b.Pdf', 'c.pdf.txt': 'E:/c.pdf.txt', 'd.pdff': 'E:/d.pdff' })
    )
    expect(plan).toEqual({ kind: 'ok', paths: ['E:/A.PDF', 'E:/b.Pdf'] })
  })

  it('混合批：非 pdf、空串解析、目录（无 .pdf 后缀）均被滤除，仅 pdf 进入载荷', () => {
    const plan = planDroppedImports(
      [file('好.pdf'), file('坏.docx'), file('合成.pdf'), file('资料目录')],
      pathByMap({ '好.pdf': 'E:/好.pdf', '坏.docx': 'E:/坏.docx', '资料目录': 'E:/资料目录' })
      // 「合成.pdf」未登记 → pathFor 返回 ''
    )
    expect(plan).toEqual({ kind: 'ok', paths: ['E:/好.pdf'] })
  })

  it('too-many：滤后 101 条 → { kind: too-many }', () => {
    const files = Array.from({ length: MAX_DROP_FILES + 1 }, (_, i) => file(`f${i}.pdf`))
    const pathFor = (f: File): string => `E:/${(f as { name: string }).name}`
    expect(planDroppedImports(files, pathFor)).toEqual({ kind: 'too-many' })
  })
})

describe('P7E-02 apiDrag.importDropped —— preload 桥三分支', () => {
  beforeEach(() => {
    mocks.invoke.mockReset()
    mocks.pathFor.mockReset()
  })

  function drag(): { importDropped(files: File[]): Promise<unknown> } {
    const d = exposed.get('apiDrag')
    if (typeof d !== 'object' || d === null) throw new Error('window.apiDrag 未暴露')
    return d as { importDropped(files: File[]): Promise<unknown> }
  }

  it('none 分支：全滤除 → INVALID_REQUEST 中文错误，零通道 invoke', async () => {
    mocks.pathFor.mockReturnValue('') // 合成 File：webUtils 解析得 ''
    const r = await drag().importDropped([file('a.pdf')])
    expect(r).toEqual({
      ok: false,
      error: { code: 'INVALID_REQUEST', message: '仅支持拖入 PDF 文件' }
    })
    expect(mocks.invoke).not.toHaveBeenCalled()
  })

  it('too-many 分支：滤后超 100 → INVALID_REQUEST 中文错误，零通道 invoke', async () => {
    mocks.pathFor.mockImplementation((f) => `E:/${(f as { name: string }).name}`)
    const files = Array.from({ length: MAX_DROP_FILES + 1 }, (_, i) => file(`f${i}.pdf`))
    const r = await drag().importDropped(files)
    expect(r).toEqual({
      ok: false,
      error: { code: 'INVALID_REQUEST', message: '一次最多拖入 100 个文件' }
    })
    expect(mocks.invoke).not.toHaveBeenCalled()
  })

  it('ok 分支：滤后有效 → invoke import/from-paths 且仅携 paths 载荷，响应原样透传', async () => {
    const reply = { ok: true as const, data: { imported: [], duplicates: [], failed: [] } }
    mocks.invoke.mockResolvedValue(reply)
    mocks.pathFor.mockImplementation((f) => `E:/${(f as { name: string }).name}`)
    const r = await drag().importDropped([file('一.pdf'), file('二.PDF'), file('三.docx')])
    expect(mocks.invoke).toHaveBeenCalledTimes(1)
    expect(mocks.invoke).toHaveBeenCalledWith('import/from-paths', { paths: ['E:/一.pdf', 'E:/二.PDF'] })
    expect(r).toBe(reply)
  })
})
```

### 新文件：tests/unit/ipc/import-paths.test.ts（41 行）
```typescript
import { expect, it, vi } from 'vitest'
import { createImportIpc } from '../../../src/main/ipc/import_'
import { makeIpcDeps } from '../../utils/ipc-deps'

/**
 * [P7E-02] fromPaths 通道装配（always-active，无工单门）：一行委托
 * services.import_.importFiles(req.paths)——路径由 preload webUtils 桥解析注入，
 * 本通道对 renderer 隐藏（PRELOAD_HIDDEN_METHODS，INV-07 修订/INV-54）。
 * 既有 tests/unit/ipc/import_.test.ts 受锁不动，fromPaths 用例由本文件承载。
 */
it('fromPaths：请求 paths 逐参委托 importFiles，目录导入不被触碰', async () => {
  const importFiles = vi.fn(async () => ({
    imported: [{ id: 'p1' }, { id: 'p2' }],
    duplicates: ['重复.pdf'],
    failed: [{ fileName: '坏.pdf', reason: '损坏' }]
  }))
  const importFolder = vi.fn(async () => ({ imported: [], duplicates: [], failed: [] }))
  const ipc = createImportIpc(
    makeIpcDeps({ services: { import_: { importFiles, importFolder } as never } })
  )

  const r = await ipc.fromPaths({ paths: ['E:/拖拽一.pdf', 'E:/拖拽二.pdf'] })

  expect(importFiles).toHaveBeenCalledTimes(1)
  expect(importFiles).toHaveBeenCalledWith(['E:/拖拽一.pdf', 'E:/拖拽二.pdf'])
  expect(importFolder).not.toHaveBeenCalled()
  // importFiles 的三项计数语义原样透传（装配层不改写结果）
  expect(r.imported).toHaveLength(2)
  expect(r.duplicates).toEqual(['重复.pdf'])
  expect(r.failed).toEqual([{ fileName: '坏.pdf', reason: '损坏' }])
})

it('fromPaths：importFiles 抛异常时原样上抛（异常折叠归 register 统一层）', async () => {
  const boom = new Error('导入服务故障')
  const ipc = createImportIpc(
    makeIpcDeps({
      services: { import_: { importFiles: vi.fn(async () => Promise.reject(boom)), importFolder: vi.fn() } as never }
    })
  )
  await expect(ipc.fromPaths({ paths: ['E:/a.pdf'] })).rejects.toBe(boom)
})
```

### 新文件：tests/unit/renderer/import-drag-ui.test.tsx（177 行）
```typescript
// @vitest-environment jsdom
/**
 * [P7E-02] ImportDropZone 拖拽接线（always-active，无工单门）——态空间锚 D2/D3/D5/D6：
 * - D2 drop 全滤除（none）→ toast「仅支持拖入 PDF 文件」回 idle，onImported 零调用；
 * - D3 drop 有效 → apiDrag.importDropped(files) → busy（按钮禁用）→结果汇报
 *   （toast 汇总+onImported）→idle；
 * - D5 busy 期 drop → info toast「导入进行中，请稍候」短路（apiDrag 零新增调用）；
 * - D6 drop 超量（too-many）→ toast「一次最多拖入 100 个文件」busy 立即复位。
 * D1（高亮样式）为既有行为；D7/D8 复用 F-D4 既有壳（import-dropzone.test.tsx 已锚，
 * runImport 同一 try/catch/finally + busyRef 订阅门零改）。桩形态同 import-dropzone.test.tsx。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ImportProgressEvent, ImportResult } from '../../../src/shared/ipc/schemas'
import type * as clientModule from '../../../src/renderer/api/client'
import type * as toastModule from '../../../src/renderer/shared/ui/Toast'

const { stubApi, onImportProgressSpy, offSpy, toastSpy, dragSpy, holder } = vi.hoisted(() => ({
  stubApi: {
    import_: { fromDialog: vi.fn(), fromFolder: vi.fn() }
  },
  onImportProgressSpy: vi.fn(),
  offSpy: vi.fn(),
  toastSpy: vi.fn(),
  dragSpy: vi.fn(),
  holder: { cb: null as ((e: ImportProgressEvent) => void) | null }
}))

vi.mock('../../../src/renderer/api/client', async (importOriginal) => {
  const real = await importOriginal<typeof clientModule>()
  return {
    ...real,
    api: stubApi as unknown as typeof clientModule.api,
    apiEvents: { onImportProgress: onImportProgressSpy } as unknown as typeof clientModule.apiEvents
  }
})
vi.mock('../../../src/renderer/shared/ui/Toast', async (importOriginal) => {
  const real = await importOriginal<typeof toastModule>()
  return { ...real, showToast: toastSpy }
})

import { ImportDropZone } from '../../../src/renderer/features/library/ImportDropZone'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

/** Result 夹具（preload 桥语义面：ok/INVALID_REQUEST 中文 message） */
const okResult = (data: ImportResult): { ok: true; data: ImportResult } => ({ ok: true, data })
const invalid = (message: string): { ok: false; error: { code: string; message: string } } => ({
  ok: false,
  error: { code: 'INVALID_REQUEST', message }
})

let root: Root | null = null
let host: HTMLDivElement | null = null

async function render(onImported: () => void = () => undefined): Promise<void> {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root?.render(<ImportDropZone onImported={onImported} />)
  })
}

function findImportButton(): HTMLButtonElement | undefined {
  return [...(host?.querySelectorAll('button') ?? [])].find(
    (b) => (b.textContent ?? '').replace('⟳', '') === '导入 PDF 文件'
  )
}

function busyNow(): boolean {
  return findImportButton()?.disabled ?? false
}

/** 在拖放区上派发原生 drop 事件（React 合成 onDrop 经 root 委托捕获） */
async function drop(files: { name: string }[]): Promise<void> {
  const zone = host?.querySelector('.lib-dropzone')
  expect(zone, '拖放区在场').toBeDefined()
  await act(async () => {
    const ev = new Event('drop', { bubbles: true, cancelable: true })
    Object.defineProperty(ev, 'dataTransfer', { value: { files } })
    zone!.dispatchEvent(ev)
  })
}

/** 微任务排空（pending Promise 落定后再断终态） */
async function settle(): Promise<void> {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0))
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  onImportProgressSpy.mockImplementation((cb: (e: ImportProgressEvent) => void) => {
    holder.cb = cb
    return offSpy
  })
  // jsdom 全局 window.apiDrag 桩（env.d.ts 声明的真实桥在 e2e 装配级覆盖）
  ;(window as unknown as { apiDrag: unknown }).apiDrag = { importDropped: dragSpy }
})

afterEach(async () => {
  await act(async () => {
    root?.unmount()
  })
  host?.remove()
  root = null
  host = null
  delete (window as unknown as { apiDrag?: unknown }).apiDrag
})

describe('P7E-02 ImportDropZone —— 拖拽导入接线（D2/D3/D5/D6）', () => {
  it('D2 drop 全滤除：apiDrag 返回 none → toast 中文文案，回 idle 且不触发刷新', async () => {
    dragSpy.mockResolvedValue(invalid('仅支持拖入 PDF 文件'))
    const onImported = vi.fn()
    await render(onImported)
    await drop([{ name: '合成.pdf' }])
    await settle()

    expect(dragSpy).toHaveBeenCalledTimes(1)
    expect(toastSpy).toHaveBeenCalledWith('仅支持拖入 PDF 文件', 'error')
    expect(onImported).not.toHaveBeenCalled()
    expect(busyNow()).toBe(false)
  })

  it('D3 drop 有效：busy（按钮禁用）→apiDrag 载荷=File 列表→结果汇报 toast+onImported→idle', async () => {
    let resolveDrop!: (v: { ok: true; data: ImportResult }) => void
    dragSpy.mockImplementation(
      () => new Promise<{ ok: true; data: ImportResult }>((r) => { resolveDrop = r })
    )
    const onImported = vi.fn()
    await render(onImported)
    await drop([{ name: 'a.pdf' }, { name: 'b.pdf' }])

    // busy 相：按钮禁用；apiDrag 收到的正是 dataTransfer.files 展开
    expect(busyNow()).toBe(true)
    const sent = dragSpy.mock.calls[0]?.[0] as { name: string }[]
    expect(sent.map((f) => f.name)).toEqual(['a.pdf', 'b.pdf'])

    resolveDrop(okResult({ imported: [{ id: 'p1' }] as never, duplicates: [], failed: [] }))
    await settle()
    expect(toastSpy).toHaveBeenCalledWith('导入完成：成功 1', 'success')
    expect(onImported).toHaveBeenCalledTimes(1)
    expect(busyNow()).toBe(false)
  })

  it('D5 busy 期 drop：info toast 短路，apiDrag 零新增调用', async () => {
    stubApi.import_.fromDialog.mockImplementation(
      () => new Promise<{ ok: true; data: ImportResult }>(() => undefined)
    )
    await render()
    await act(async () => {
      findImportButton()?.click()
    })
    expect(busyNow()).toBe(true)

    await drop([{ name: 'c.pdf' }])
    expect(toastSpy).toHaveBeenCalledWith('导入进行中，请稍候', 'info')
    expect(dragSpy).not.toHaveBeenCalled()
    expect(stubApi.import_.fromDialog).toHaveBeenCalledTimes(1)
  })

  it('D6 drop 超量：apiDrag 返回 too-many → toast 中文文案，busy 立即复位', async () => {
    dragSpy.mockResolvedValue(invalid('一次最多拖入 100 个文件'))
    const onImported = vi.fn()
    await render(onImported)
    await drop(Array.from({ length: 101 }, (_, i) => ({ name: `f${i}.pdf` })))
    await settle()

    expect(dragSpy).toHaveBeenCalledTimes(1)
    expect(toastSpy).toHaveBeenCalledWith('一次最多拖入 100 个文件', 'error')
    expect(onImported).not.toHaveBeenCalled()
    expect(busyNow()).toBe(false)
  })
})
```

### 新文件：tests/e2e/import-drag.spec.ts（37 行）
```typescript
import { test, expect } from '@playwright/test'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { launch } from './e2e-env'

/**
 * [P7E-02] 拖拽导入 e2e（always-active，无工单门）——D2 装配级：
 * 真实 Electron preload 的 apiDrag 在场，合成 File（非 OS 拖拽手势）经
 * webUtils.getPathForFile 解析得 ''——被 preload 天然拒（设计行为本身，
 * INV-54），断言 toast 真实文本。真实 OS 拖拽正向链 e2e 无法模拟（合成
 * File 恰被 '' 滤除），留手动验收面在交接书申报。另锚按钮回归。
 */
test('拖拽导入：合成 File 被 preload 天然拒（toast 真实文本）+导入按钮回归', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-p7e2-'))
  const app = await launch(userData)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })

  // 按钮回归：两个既有导入入口在场（拖拽为增量，不取代按钮路径）
  await expect(win.getByRole('button', { name: '导入 PDF 文件', exact: true })).toBeVisible()
  await expect(win.getByRole('button', { name: '导入文件夹' })).toBeVisible()

  // D2 装配级：drop 合成 File → preload 解析 '' → none → toast 中文文案（零崩溃）
  const zone = win.locator('.lib-dropzone')
  await expect(zone).toBeVisible()
  await zone.evaluate((el) => {
    const ev = new Event('drop', { bubbles: true, cancelable: true })
    Object.defineProperty(ev, 'dataTransfer', {
      value: { files: [new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], 'synthetic.pdf')] }
    })
    el.dispatchEvent(ev)
  })
  await expect(win.getByText('仅支持拖入 PDF 文件')).toBeVisible({ timeout: 10_000 })

  await app.close()
})
```

## 5. 实现者报告（全文——含 4 项自裁申报）
```markdown
# P7E-02 实现者报告——拖拽导入（preload webUtils 桥）

状态：**DONE**（全量自检绿；超票面自裁申报 4 项见下，均非阻塞）

技能清点（开工）：test-driven-development 用（红→绿→变异红证全走）；
verification-before-completion 用（全量命令真退出码）；其余不用（纯实现票，
票面已供全部形态先例）。配置：实现者=GLM5.3（主控派发档，显式申报）。

## 改动文件清单

| 文件 | 改动 |
|---|---|
| `src/preload/drag-import.ts` | 新建——planDroppedImports 纯函数（''滤/.pdf 大小写滤/数量门 100）+MAX_DROP_FILES |
| `src/shared/ipc/schemas.ts` | +importPathsReqSchema（paths min(1).max(100) strict，schema 层第二道门） |
| `src/shared/ipc/api-surface.ts` | import_ 域 +fromPaths 通道；+PRELOAD_HIDDEN_METHODS（const 单源）；PreloadApi 经 HiddenOf/VisibleMethodKeys Exclude 消费（隐藏面从类型暴露面排除）；+PreloadDrag 类型 |
| `src/preload/index.ts` | buildApi 跳过隐藏面；+buildDrag（webUtils 解析→planDroppedImports→none/too-many 零 invoke 中文拒 / ok→invoke('import/from-paths',{paths})）；expose apiDrag |
| `src/main/ipc/import_.ts` | +fromPaths 一行委托 importFiles(req.paths)；:18 v2 预留注记兑现修订 |
| `src/renderer/features/library/ImportDropZone.tsx` | drop 接线（busyRef 短路 D5→apiDrag.importDropped）；runImport 泛化为 ImportCall（壳行为零变）；DROP_HINT→「松开以导入 PDF 文件」；+IMPORT_BUSY_HINT「导入进行中，请稍候」；:7/:37-38/架构层注记修订 |
| `src/renderer/env.d.ts` | +apiDrag: PreloadDrag 全局声明 |
| `tests/contracts/preload-surface.test.ts` | 受锁改向：三键断言；暴露面=减集断言；转发用例隐藏面跳过；+apiDrag 形状用例（事件桥两用例零触碰） |
| `tests/unit/preload/drag-import.test.ts` | 新建——planDroppedImports 7 用例+apiDrag 三分支 3 用例（electron mock 复用契约测试形态+webUtils 桩） |
| `tests/unit/ipc/import-paths.test.ts` | 新建——fromPaths 委托 2 用例（逐参/异常上抛） |
| `tests/unit/renderer/import-drag-ui.test.tsx` | 新建——D2/D3/D5/D6 四用例（jsdom window.apiDrag 桩+原生 drop 派发） |
| `tests/e2e/import-drag.spec.ts` | 新建——D2 装配级（真实 Electron preload+合成 File 解析 ''→toast 真实文本）+按钮回归 |

文案逐字对照票面：「仅支持拖入 PDF 文件」「一次最多拖入 100 个文件」
「导入进行中，请稍候」「松开以导入 PDF 文件」——全部原样落码。

## 先红证据（scripts/audits/p7e-02-red/）

- drag-import.test.ts.raw.txt——模块缺失解析失败（no tests；语法修正后以移走
  drag-import.ts 重采，保证红语义=实现缺失）
- import-paths.test.ts.raw.txt——2 failed（fromPaths 不存在）
- import-drag-ui.test.tsx.raw.txt——4 failed（旧文案行为/零调用）
- preload-surface.test.ts.raw.txt——4 failed | 2 passed（事件桥两用例绿）
- import-drag.spec.ts.raw.txt——旧 build 跑：toast 文本缺失超时红

## 绿证据（scripts/audits/p7e-02-green/）+用例数实测

- drag-import.test.ts：10 passed；import-paths.test.ts：2 passed；
  import-drag-ui.test.tsx：4 passed；preload-surface.test.ts：6 passed
  （合计 22，vitest 实测输出在档）
- import-drag.spec.ts.raw.txt——1 passed（483ms，真实 Electron）

## 变异红证（scripts/audits/p7e-02-mut-m{1..4}.raw.txt，cp 备份法+diff 还原空）

- M1 删 .pdf 过滤：REMOVED_LINES=1/grep 1→0；drag-import.test.ts 4 failed
  （none 滤除/大小写/混合/ok 载荷混入非 pdf——票面预期「非 pdf 混入→ok 载荷红」）
- M2 删 none 分支：grep 1→0；「none 分支零通道 invoke」用例红
- M3 busy 短路失效（if (busyRef.current)→if (false)，行 146）：D5 用例红
  （「导入进行中，请稍候」未 toast）
- M4 删 PRELOAD_HIDDEN 跳过：grep 1→0；减集断言红
  （['fromDialog','fromFolder',…(1)] ≠ ['fromDialog','fromFolder']——fromPaths 泄漏被拦）
- 四组还原 diff 全空（各自 raw 尾部「diff 空=还原成功」）

## 超票面自裁申报

1. **preload-surface.test.ts 改动=4 处而非字面 3 处**：既有「全量对账转发」
   用例必须同步跳过隐藏面（遍历全表会调 undefined 的 api.import_.fromPaths），
   属「api 暴露面=接线表」减集改向的必要连带，非扩面；事件桥两用例零触碰。
2. **api-surface.ts 加 HiddenOf/VisibleMethodKeys/MethodBridge 三内部别名**：
   mapped key 泛型别名调用+值位 Ep<D,M>['Req'] 索引访问的组合踩 esbuild 解析
   缺陷（最小复现在档：t1~t5 二分，t2 FAIL/t4 OK 定位组合触发），别名层规避、
   语义零变（仍是 PRELOAD_HIDDEN_METHODS 单源 Exclude 消费）。
3. **drag-import.test.ts 测试名裸 '' 引号语法修正**（esbuild 语法红≠断言红，
   TDD 纪律要求修到正确失败）；红证据以移走实现重采。
4. **契约测试 electron mock 未补 webUtils 键**：实测 vitest 对 mock 缺失 named
   export 宽容（undefined，不调用不炸），契约测试零补丁通过；若门审认为需补，
   是一行增量（未擅自加）。

另注（非超票面）：runImport 由 mode 参数泛化为 ImportCall 函数参数——票面
「runImport 壳全复用」的字面实现路径（busy 门/sessionRef/busyRef/
try-catch-finally 全保留原行为）。

## 全量数字（实测，非凭印象）

- npm test：**135 文件 / 1159 用例全绿**（基线 132/1142；新增 3 文件 +17 用例
  =10+2+4+1，与逐文件绿证据吻合）
- npm run typecheck：exit 0；npm run lint：exit 0；npm run build：exit 0
- npm run quality:check：exit 0（无占位标记/无乱码/无跨域引用）
- npm run tickets:check：exit 0
- e2e 新 spec 单跑：1 passed（npm run build 后 playwright，证据在档）
- 改动面 git status：7 M + 5 新文件（tests/unit/preload/ 新目录整体 untracked）；
  tickets/registry.ts 的 M 系主控预置状态（非本单改动，未触碰）
- 乱码面：quality:check 中文关卡通过；本报告与全部落盘 UTF-8

docs/invariants.md 未动（INV-07 修订+INV-54 登记归主控收口）；locks 未动
（新文件入锁归主控收口：预期 246→250）。
```

## 6. 关键接缝参考（既有代码节选——判接缝用）
### INV-07 现文（docs/invariants.md:21——本票修订对象）
```
| INV-07 | 文件/目录路径只能出自 main 侧系统对话框（dialogs.ts），renderer 永远不传路径 | AGENTS 安全禁令 + docs/security.md:23 | 架构评审 | 未锚定（2026-08-23 UBS 复核：dialogs.ts 仍唯一路径出口，index.ts showErrorBox 为错误框非路径源；import_/export_ ipc 均经注入消费；renderer 请求 schema 无路径字段） |
```
| INV-52 | import 会话身份两合一（F-D4，2026-09-02 AUDIT-C D4 修票；范式=corpus-export INV-18 同族）：①**互斥 gate**——import.service importFiles/importFolder 每次调用入口 gate.enter()、finally gate.exit()（尽力而为与域错误抛出路径都必经 finally）；gate=bootstrap 顶层一次创建的闭包计数器（容器 assemble 闭包之外——每层 service 重建但 gate 同一对象，switch 后 in-flight 计数仍跨层有效……（截断）
67:| INV-52 | import 会话身份两合一（F-D4，2026-09-02 AUDIT-C D4 修票；范式=corpus-export INV-18 同族）：①**互斥 gate**——import.service importFiles/importFolder 每次调用�

### preload/index.ts 终态全文（桥层全貌）
```typescript
/**
 * Preload 桥（SR-INFRA-13，已完成；P7E-02 增拖拽桥）。
 *
 * 职责：按 shared/ipc/api-surface 的接线表逐通道生成白名单方法，暴露为 window.api
 * （PRELOAD_HIDDEN_METHODS 隐藏面除外）；拖拽导入经 window.apiDrag 单口
 * （File→webUtils 解析→过滤→import/from-paths，路径串不出 preload 堆）。
 * 不泄漏 ipcRenderer；不暴露任意通道 invoke（renderer 不能自由发消息）。
 * 契约：tests/contracts/preload-surface.test.ts 断言运行时暴露面与接线表（减隐藏面）一致。
 */
import { contextBridge, ipcRenderer, webUtils, type IpcRendererEvent } from 'electron'
import {
  API_SURFACE,
  EVENT_CHANNELS,
  PRELOAD_HIDDEN_METHODS,
  type PreloadApi,
  type PreloadDrag,
  type PreloadEvents
} from '../shared/ipc/api-surface'
import type {
  ExportCorpusEvent,
  ImportProgressEvent,
  ImportResult,
  WindowStateEvent
} from '../shared/ipc/schemas'
import { err, type Result } from '../shared/app-error'
import { planDroppedImports } from './drag-import'

function buildApi(): PreloadApi {
  const api: Record<string, Record<string, (req: unknown) => Promise<unknown>>> = {}
  const hidden = PRELOAD_HIDDEN_METHODS as Record<string, readonly string[]>
  for (const [domain, methods] of Object.entries(API_SURFACE)) {
    const group: Record<string, (req: unknown) => Promise<unknown>> = {}
    const hiddenMethods = hidden[domain] ?? []
    for (const [method, ep] of Object.entries(methods)) {
      // P7E-02：隐藏通道不上 window.api（fromPaths 载荷只能由下方拖拽桥组装）
      if (hiddenMethods.includes(method)) continue
      group[method] = (req: unknown) => ipcRenderer.invoke(ep.channel, req)
    }
    api[domain] = group
  }
  return api as unknown as PreloadApi
}

/**
 * 拖拽导入桥（P7E-02，INV-54）：File → 路径解析唯一口。
 * none/too-many 在 preload 堆内即拒（零通道 invoke）；ok 才组装
 * import/from-paths 载荷——renderer 全程不接触路径串。
 */
function buildDrag(): PreloadDrag {
  return {
    importDropped(files: File[]): Promise<Result<ImportResult>> {
      const plan = planDroppedImports(files, (f) => webUtils.getPathForFile(f))
      if (plan.kind === 'none') return Promise.resolve(err('INVALID_REQUEST', '仅支持拖入 PDF 文件'))
      if (plan.kind === 'too-many') return Promise.resolve(err('INVALID_REQUEST', '一次最多拖入 100 个文件'))
      return ipcRenderer.invoke('import/from-paths', { paths: plan.paths })
    }
  }
}

/** 事件订阅（main→renderer 单向推送），返回退订函数；形状来自 PreloadEvents（单一真相源） */
function buildEvents(): PreloadEvents {
  return {
    onImportProgress(cb: (e: ImportProgressEvent) => void): () => void {
      const listener = (_e: IpcRendererEvent, payload: ImportProgressEvent): void => cb(payload)
      ipcRenderer.on(EVENT_CHANNELS.importProgress, listener)
      return () => ipcRenderer.removeListener(EVENT_CHANNELS.importProgress, listener)
    },
    onExportCorpus(cb: (e: ExportCorpusEvent) => void): () => void {
      const listener = (_e: IpcRendererEvent, payload: ExportCorpusEvent): void => cb(payload)
      ipcRenderer.on(EVENT_CHANNELS.exportCorpus, listener)
      return () => ipcRenderer.removeListener(EVENT_CHANNELS.exportCorpus, listener)
    },
    onWindowState(cb: (e: WindowStateEvent) => void): () => void {
      const listener = (_e: IpcRendererEvent, payload: WindowStateEvent): void => cb(payload)
      ipcRenderer.on(EVENT_CHANNELS.windowState, listener)
      return () => ipcRenderer.removeListener(EVENT_CHANNELS.windowState, listener)
    }
  }
}

contextBridge.exposeInMainWorld('api', buildApi())
contextBridge.exposeInMainWorld('apiDrag', buildDrag())
contextBridge.exposeInMainWorld('apiEvents', buildEvents())
```

### ImportDropZone.tsx 终态全文（drop 接线全貌）
```typescript
/**
 * [SR-LIB-06] ImportDropZone —— 导入入口（工单：done / weak）
 *
 * ── 行为层 ──
 * - 两个按钮：「导入 PDF 文件」→ api.import_.fromDialog({})；
 *   「导入文件夹」→ api.import_.fromFolder({})
 * - 拖拽（P7E-02，原 v1 预留注记已兑现）：drop → window.apiDrag.importDropped(files)
 *   ——File 经 preload webUtils 解析（.pdf 滤+数量上限）→ import/from-paths，
 *   renderer 全程不接触路径串；busy 期 drop 短路提示（零 invoke）
 * - 进行中：订阅 apiEvents.onImportProgress 显示进度（文件名 current/total）
 * - 进度事件会话身份过滤（F-D4 B 面，INV-52——范式=corpus-export.store INV-18
 *   同族）：busy=false 时忽略（终局后跨通道迟到事件不写 state——渲染门之外的
 *   第二道门）；sessionRef 首事件锚定会话身份，异身份忽略（reload 后旧会话残留
 *   事件不得污染新会话进度显示）；runImport 入口重置 sessionRef=null。busy 的
 *   订阅回调读旧闭包问题用 busyRef 镜像解决（state 与 ref 双写）。
 *   残余窗（照 corpus-export.store 注释同口径）：新会话 start 后首事件前——
 *   旧事件须跨越终局+用户点击两层，理论窗
 * - 完成后 toast 汇总（成功 n/重复 m/失败 k）并经 onImported 通知父级刷新 library.store
 * - 取消（空结果）静默
 *
 * ── 接口层 ──
 * - export function ImportDropZone(props: { onImported(): void }): JSX.Element
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - 路径合法来源=main 侧系统对话框 + 拖拽 File 经 preload webUtils 解析
 *   （apiDrag 单口，P7E-02/INV-07 修订）；renderer 无路径字面量（INV-09 不变）
 * - 进度订阅在卸载时退订；busy 期间按钮禁点防重复发起
 */
import { useEffect, useRef, useState } from 'react'
import type { DragEvent } from 'react'
import { api, apiEvents, ApiClientError, unwrap } from '../../api/client'
import type { Result } from '@shared/app-error'
import type { ImportProgressEvent, ImportResult } from '@shared/ipc/schemas'
import { Button } from '../../shared/ui/Button'
import { showToast } from '../../shared/ui/Toast'
import type { ToastKind } from '../../shared/ui/Toast'

/** 意外异常（非 ApiClientError）时的兜底中文消息 */
const IMPORT_FAILED = '导入失败'

/** 拖拽悬停提示（P7E-02 已接线：松手即经 preload 桥导入） */
const DROP_HINT = '松开以导入 PDF 文件'

/** busy 期再拖入的短路提示（D5——不发起第二次导入） */
const IMPORT_BUSY_HINT = '导入进行中，请稍候'

/** 进度阶段中文标签（与 ImportProgressEvent.phase 一一对应） */
const PHASE_LABEL: Record<ImportProgressEvent['phase'], string> = {
  scanning: '扫描文件',
  copying: '复制文件',
  extracting: '提取元数据',
  done: '完成'
}

type ImportMode = 'dialog' | 'folder'

/** 导入调用形态：dialog/folder/drag 三入口共用 runImport 壳（P7E-02 泛化，壳行为零变） */
type ImportCall = () => Promise<Result<ImportResult>>

/** 组装进度文案：阶段 + （current/total）+ 文件名 */
function progressText(e: ImportProgressEvent): string {
  const pos = e.total > 0 ? `（${e.current}/${e.total}）` : ''
  return e.fileName !== '' ? `${PHASE_LABEL[e.phase]}${pos} ${e.fileName}` : `${PHASE_LABEL[e.phase]}${pos}`
}

/**
 * 结果反馈契约（ImportResult 语义）：
 * - 三项计数全为 0 → 用户取消，静默返回；
 * - 否则 toast 一条汇总（仅列非零项），失败>0 用 error（停留更久），
 *   纯新增用 success，仅重复用 info；
 * - 有新增时回调 onImported 让父级刷新 library.store。
 */
function reportImportResult(result: ImportResult, onImported: () => void): void {
  const parts: string[] = []
  if (result.imported.length > 0) parts.push(`成功 ${result.imported.length}`)
  if (result.duplicates.length > 0) parts.push(`重复 ${result.duplicates.length}`)
  if (result.failed.length > 0) parts.push(`失败 ${result.failed.length}`)
  if (parts.length === 0) return

  const kind: ToastKind =
    result.failed.length > 0 ? 'error' : result.imported.length > 0 ? 'success' : 'info'
  showToast(`导入完成：${parts.join('，')}`, kind)
  if (result.imported.length > 0) onImported()
}

export function ImportDropZone(props: { onImported: () => void }): JSX.Element {
  const { onImported } = props
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<ImportProgressEvent | null>(null)
  const [dragging, setDragging] = useState(false)
  // busy 镜像（订阅回调读旧闭包问题——state 与 ref 双写，F-D4）
  const busyRef = useRef(false)
  // 会话身份锚点：本会话首个进度事件建立；runImport 入口重置（F-D4）
  const sessionRef = useRef<string | null>(null)

  // 订阅 main 侧导入进度推送；卸载时退订，避免泄漏回调。
  // 三滤（F-D4 B 面，INV-52）：busy=false 忽略 + 异身份忽略 + 首事件锚定
  useEffect(() => {
    const unsubscribe = apiEvents.onImportProgress((e) => {
      // 终局后迟到事件不改在途相（busy 门挡渲染之外，state 写也挡住）
      if (!busyRef.current) return
      if (sessionRef.current === null) sessionRef.current = e.sessionId
      else if (sessionRef.current !== e.sessionId) return
      setProgress(e)
    })
    return unsubscribe
  }, [])

  async function runImport(call: ImportCall): Promise<void> {
    if (busy) return
    sessionRef.current = null
    busyRef.current = true
    setBusy(true)
    setProgress(null)
    try {
      const result = await unwrap(call())
      reportImportResult(result, onImported)
    } catch (e) {
      // unwrap 已把 IPC 错误折叠为带中文 message 的 ApiClientError
      // （拖拽面的 none/too-many 拒绝也是 Result 错误——同路折叠为中文 toast）
      showToast(e instanceof ApiClientError ? e.message : IMPORT_FAILED, 'error')
    } finally {
      busyRef.current = false
      setBusy(false)
      setProgress(null)
    }
  }

  function startButtonImport(mode: ImportMode): void {
    void runImport(
      mode === 'dialog' ? () => api.import_.fromDialog({}) : () => api.import_.fromFolder({})
    )
  }

  // 拖拽悬停高亮（D1）；导入动作在 drop 落点（handleDrop）
  function handleDragOver(e: DragEvent<HTMLDivElement>): void {
    e.preventDefault()
    setDragging(true)
  }

  // 拖拽导入（P7E-02）：busy 短路提示（D5，零 invoke）；否则 File 列表交 preload 桥
  // ——解析/.pdf 滤/数量上限全在 preload 堆内，路径串零接触 renderer（INV-54）
  function handleDrop(e: DragEvent<HTMLDivElement>): void {
    e.preventDefault() // 同时阻止浏览器默认打开文件
    setDragging(false)
    if (busyRef.current) {
      showToast(IMPORT_BUSY_HINT, 'info')
      return
    }
    const files = [...e.dataTransfer.files]
    void runImport(() => window.apiDrag.importDropped(files))
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`lib-dropzone flex flex-col items-center gap-3 p-6${dragging ? ' lib-dropzone-dragging' : ''}`}
    >
      <p className="text-sm" style={{ color: dragging ? 'var(--accent)' : 'var(--text-dim)' }}>
        {dragging ? DROP_HINT : '将 PDF 拖到此处，或使用按钮导入'}
      </p>
      <div className="flex gap-2">
        <Button
          variant="primary"
          disabled={busy}
          onClick={() => startButtonImport('dialog')}
        >
          导入 PDF 文件
        </Button>
        <Button
          variant="secondary"
          disabled={busy}
          onClick={() => startButtonImport('folder')}
        >
          导入文件夹
        </Button>
      </div>
      {busy && (
        <p role="status" className="text-xs" style={{ color: 'var(--text-dim)' }}>
          {progress !== null ? progressText(progress) : '正在打开选择窗口…'}
        </p>
      )}
    </div>
  )
}
```
