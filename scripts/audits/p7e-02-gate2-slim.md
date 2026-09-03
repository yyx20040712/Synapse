# P7E-02 门二终审材料包·瘦身版（聚焦：回炉落地复核+受锁测试面复核+收口就绪）

## 0. 背景

- 门一 Kimi=PASS_WITH_WARNINGS(0B/2W/2N)。处置：W1=门一材料包漏 tests/ diff（主控组装失误——本包 §1 补入契约测试全文复核）；W2=目录命名 *.pdf 击穿后缀滤→已回炉（File.type==='' 类型门+测试+M5 变异）；N1 节头/N2 计数→已回炉。

- 基线：npm test 135 文件 1160 用例全绿；e2e 35 用例 34 过+1 失败（唯一失败=z-r2e 探针环境 flake 单现复跑绿在档——读者域零交集本票）；lint/typecheck/quality/tickets 绿。


## 1. 受锁契约测试终态全文（W1 补证——tests/contracts/preload-surface.test.ts）

```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { API_SURFACE, EVENT_CHANNELS, PRELOAD_HIDDEN_METHODS } from '../../src/shared/ipc/api-surface'

/**
 * preload 暴露面对账（src/preload/index.ts 头部规约指定的契约测试）。
 * preload/index.ts 用双重类型断言把运行时对象交给 PreloadApi——类型层对不上
 * 编译器管不到，因此必须在运行时断言：window 上暴露的 api/apiEvents 与
 * API_SURFACE 接线表逐域逐方法一致（无多无少、通道名正确、请求透传）。
 * preload 属已完成基建（不在工单守卫范围），本组测试立即生效，不做延期。
 */
const exposed = vi.hoisted(() => new Map<string, unknown>())
const mocks = vi.hoisted(() => ({
  invoke: vi.fn<(channel: string, req: unknown) => Promise<unknown>>(),
  on: vi.fn<(channel: string, listener: (e: unknown, payload: unknown) => void) => void>(),
  removeListener: vi.fn<(channel: string, listener: unknown) => void>()
}))

vi.mock('electron', () => ({
  contextBridge: {
    exposeInMainWorld: (key: string, value: unknown): void => {
      exposed.set(key, value)
    }
  },
  ipcRenderer: mocks
}))

await import('../../src/preload/index')

type ApiShape = Record<string, Record<string, (req: unknown) => Promise<unknown>>>

function exposedApi(): ApiShape {
  const api = exposed.get('api')
  if (typeof api !== 'object' || api === null) throw new Error('window.api 未暴露')
  return api as ApiShape
}

describe('contracts/preload-surface —— 运行时暴露面与接线表一致', () => {
  beforeEach(() => {
    mocks.invoke.mockClear()
    mocks.on.mockClear()
    mocks.removeListener.mockClear()
  })

  it('window 只暴露 api、apiDrag 与 apiEvents 三个键（无额外泄漏面）', () => {
    expect([...exposed.keys()].sort()).toEqual(['api', 'apiDrag', 'apiEvents'])
  })

  it('api 暴露面与 API_SURFACE 减 PRELOAD_HIDDEN_METHODS 一致（隐藏通道不上桥）', () => {
    const api = exposedApi()
    const hidden = PRELOAD_HIDDEN_METHODS as Record<string, readonly string[]>
    expect(Object.keys(api).sort()).toEqual(Object.keys(API_SURFACE).sort())
    for (const [domain, methods] of Object.entries(API_SURFACE)) {
      const expected = Object.keys(methods).filter((m) => !(hidden[domain] ?? []).includes(m))
      expect(
        Object.keys(api[domain] ?? {}).sort(),
        `域 ${domain} 的方法集与接线表减隐藏面不一致`
      ).toEqual(expected.sort())
    }
  })

  it('每个方法按接线表通道转发且请求原样透传（全量对账，非抽样；隐藏面除外）', () => {
    const api = exposedApi()
    const hidden = PRELOAD_HIDDEN_METHODS as Record<string, readonly string[]>
    for (const [domain, methods] of Object.entries(API_SURFACE)) {
      for (const [method, ep] of Object.entries(methods)) {
        if ((hidden[domain] ?? []).includes(method)) continue
        const fn = api[domain]?.[method]
        if (typeof fn !== 'function') throw new Error(`api.${domain}.${method} 不是函数`)
        const probe = { __probe: `${domain}.${method}` }
        void fn(probe)
        expect(
          mocks.invoke,
          `api.${domain}.${method} 应转发到通道 ${ep.channel}`
        ).toHaveBeenLastCalledWith(ep.channel, probe)
      }
    }
  })

  it('apiDrag 形状：仅 importDropped 单方法（拖拽桥单口——File→路径解析唯一途径）', () => {
    const drag = exposed.get('apiDrag')
    if (typeof drag !== 'object' || drag === null) throw new Error('window.apiDrag 未暴露')
    expect(Object.keys(drag).sort()).toEqual(['importDropped'])
    expect(typeof (drag as { importDropped: unknown }).importDropped).toBe('function')
  })

  it('事件桥：订阅接线表事件通道并透传 payload，退订函数移除同一监听', () => {
    const events = exposed.get('apiEvents') as {
      onImportProgress(cb: (e: unknown) => void): () => void
    }
    let fire: ((payload: unknown) => void) | undefined
    mocks.on.mockImplementation((_channel, listener) => {
      fire = (payload: unknown) => listener(undefined, payload)
    })
    const received: unknown[] = []
    const off = events.onImportProgress((e) => received.push(e))

    expect(mocks.on).toHaveBeenCalledTimes(1)
    expect(mocks.on).toHaveBeenCalledWith(EVENT_CHANNELS.importProgress, expect.any(Function))
    fire?.({ phase: 'extracting', done: 1, total: 3 })
    expect(received).toEqual([{ phase: 'extracting', done: 1, total: 3 }])

    off()
    expect(mocks.removeListener).toHaveBeenCalledWith(
      EVENT_CHANNELS.importProgress,
      expect.any(Function)
    )
  })

  it('事件桥 onWindowState：订阅 windowState 通道透传 payload，退订移除同一监听（R2-SH3 增量）', () => {
    const events = exposed.get('apiEvents') as {
      onWindowState(cb: (e: unknown) => void): () => void
    }
    let fire: ((payload: unknown) => void) | undefined
    mocks.on.mockImplementation((_channel, listener) => {
      fire = (payload: unknown) => listener(undefined, payload)
    })
    const received: unknown[] = []
    const off = events.onWindowState((e) => received.push(e))

    expect(mocks.on).toHaveBeenCalledTimes(1)
    expect(mocks.on).toHaveBeenCalledWith(EVENT_CHANNELS.windowState, expect.any(Function))
    fire?.({ maximized: true })
    expect(received).toEqual([{ maximized: true }])

    off()
    expect(mocks.removeListener).toHaveBeenCalledWith(
      EVENT_CHANNELS.windowState,
      expect.any(Function)
    )
  })
})

```


## 2. 回炉三处终态

### drag-import.ts 全文（W2 类型门+N2 八分支口径）：

```typescript
/**
 * [P7E-02] 拖拽导入纯函数（preload 桥的可测性拆分；W2 回炉补类型门）。
 *
 * ── 行为层 ──
 * planDroppedImports(files, pathFor)：
 * - 过滤序：File.type 空剔除（目录项 type 恒 ''——目录可合法命名 xxx.pdf 击穿
 *   后缀滤，类型门先剔；.pdf 在注册类型系统下 type='application/pdf' 非空）
 *   → 逐个 pathFor 解析 → '' 剔除（合成 File/不可解析——Electron webUtils
 *   对非 OS 拖拽手势的 File 解析得 ''，天然拒）→ 后缀 .pdf（大小写不敏感）剔除
 *   → 计数判定；
 * - 滤后 1~100 → { kind: 'ok', paths }；全滤除 → { kind: 'none' }；>100 →
 *   { kind: 'too-many' }；
 * - 目录拖入 = 类型门剔除（Electron dataTransfer.files 不递归目录——已知边界：
 *   递归导入走「导入文件夹」按钮）。
 *
 * ── 架构层 ──
 * 路径串生命周期限 preload 堆内（INV-07 修订/INV-54）：本模块产物只供
 * apiDrag.importDropped 组装 import/from-paths 载荷，不得流向其他任何面。
 *
 * ── 生命周期层 ──
 * 已知残余（保守拒口径，W2）：无注册类型的真实 PDF（type=''）会被类型门保守
 * 拒——提示语引导走按钮导入（main 侧对话框路径无此限）。
 *
 * ── 文化层 ──
 * 测试：tests/unit/preload/drag-import.test.ts（八分支 always-active）。
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
    if (f.type === '') continue // 目录项（type 恒 ''）——xxx.pdf 目录名击穿后缀滤，类型门先剔（W2）
    const p = pathFor(f)
    if (p === '') continue // 合成 File（e2e/被攻陷 renderer 造的假 File）解析为空——剔除
    if (!p.toLowerCase().endsWith('.pdf')) continue // 非 PDF——剔除
    paths.push(p)
  }
  if (paths.length === 0) return { kind: 'none' }
  if (paths.length > MAX_DROP_FILES) return { kind: 'too-many' }
  return { kind: 'ok', paths }
}

```

### W2 测试格（tests/unit/preload/drag-import.test.ts 关键段）：

```typescript
      [file('好.pdf'), file('坏.docx'), file('合成.pdf'), file('资料目录')],
      pathByMap({ '好.pdf': 'E:/好.pdf', '坏.docx': 'E:/坏.docx', '资料目录': 'E:/资料目录' })
      // 「合成.pdf」未登记 → pathFor 返回 ''
    )
    expect(plan).toEqual({ kind: 'ok', paths: ['E:/好.pdf'] })
  })

  it('类型门（W2 回炉）：目录项 type="" 即使路径后缀 .pdf 也剔除；注册类型 application/pdf 保留', () => {
    // 目录击穿面：Windows/macOS 目录可合法命名 xxx.pdf——File.type 恒 ''，类型门先剔；
    // .pdf 文件在注册类型系统下 type='application/pdf' 非空——保留
    const dirLike = { name: '资料.pdf', type: '' } as File
    const pdfLike = { name: '论文.pdf', type: 'application/pdf' } as File
    const plan = planDroppedImports(
      [dirLike, pdfLike],
      pathByMap({ '资料.pdf': 'E:/资料.pdf', '论文.pdf': 'E:/论文.pdf' })
    )
    expect(plan).toEqual({ kind: 'ok', paths: ['E:/论文.pdf'] })
  })

  it('too-many：滤后 101 条 → { kind: too-many }', () => {
    const files = Array.from({ length: MAX_DROP_FILES + 1 }, (_, i) => file(`f${i}.pdf`))
    const pathFor = (f: File): string => `E:/${(f as { name: string }).name}`
    expect(planDroppedImports(files, pathFor)).toEqual({ kind: 'too-many' })
  })
})

describe('P7E-02 apiDrag.importDropped —— preload 桥三分支', () => {
  beforeEach(() => {
```

### M5 变异日志（命中证明+红）：

```
=== M5 命中证明：类型门行 grep（预期 0，原 1） ===
0
=== M5 目标测试输出（drag-import.test.ts——预期目录击穿用例红） ===
[31m   [31m×[31m P7E-02 planDroppedImports —— 过滤与计数判定（纯函数）[2m > [22m类型门（W2 回炉）：目录项 type="" 即使路径后缀 .pdf 也剔除；注册类型 application/pdf 保留[90m 4[2mms[22m[31m[39m
[31m     → expected { kind: 'ok', …(1) } to deeply equal { kind: 'ok', paths: [ 'E:/论文.pdf' ] }[39m
[31m⎯⎯⎯⎯⎯⎯⎯[1m[7m Failed Tests 1 [27m[22m⎯⎯⎯⎯⎯⎯⎯[39m
[31m[1mAssertionError[22m: expected { kind: 'ok', …(1) } to deeply equal { kind: 'ok', paths: [ 'E:/论文.pdf' ] }[39m
[2m Test Files [22m [1m[31m1 failed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[31m1 failed[39m[22m[2m | [22m[1m[32m10 passed[39m[22m[90m (11)[39m
=== 还原 diff（预期空） ===
diff 空=还原成功

```

### N1 schemas.ts 节头（修后）：

```
63:// ── import_（对话框/拖拽桥分别在 main/preload 侧产生路径，renderer 代码不传路径）──

```


## 3. 实现者报告自裁申报+回炉轮（§超票面自裁申报起）

```markdown
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

## §9 门一回炉（W2/N1/N2 + 变异 M5）——已完成

处置单：门一 Kimi PASS_WITH_WARNINGS（0B/2W/2N），W1 归主控门二补包不动本单。

- **W2 目录命名 *.pdf 击穿后缀滤（修）**：planDroppedImports 过滤序最前增
  类型门 `if (f.type === '') continue`（目录项 type 恒 ''——xxx.pdf 目录名不再
  进路径堆；.pdf 注册类型 type='application/pdf' 非空不受影响）。已知残余按
  口径写进模块头注生命周期层：无注册类型的真实 PDF 被保守拒（引导按钮导入，
  对话框路径无此限）。
- **N1 schemas.ts 节头（修）**：import_ 域节头改为「对话框/拖拽桥分别在
  main/preload 侧产生路径，renderer 代码不传路径」（INV-07 修订口径对齐）。
- **N2 头注计数（修）**：drag-import.ts 文化层与测试头注「六分支」→
  「八分支」（W2 修后实测 8 用例：ok/ok 边界/none/too-many/''滤/后缀大小写/
  混合/类型门）。
- **M5 变异红证（新增）**：删类型门行——命中证明 grep 1→0；目录击穿用例红
  （{ kind:'ok', …(1) } ≠ { kind:'ok', paths:['E:/论文.pdf'] }——目录项混入
  载荷被拦）；还原 diff 空。落盘 scripts/audits/p7e-02-mut-m5.raw.txt。
- TDD：新用例先红（drag-import.test.w2-red.raw.txt：1 failed | 10 passed）
  →修→绿（drag-import.test.ts.raw.txt 更新：11 passed）。

改动文件：src/preload/drag-import.ts（类型门+头注）、src/shared/ipc/schemas.ts
（节头注释）、tests/unit/preload/drag-import.test.ts（类型门用例+头注八分支）。

全量实测：npm test **135 文件 / 1160 用例全绿**（回炉 +1 用例）；lint exit 0；
typecheck exit 0。

```


## 4. 其余受锁面 diff（门一已审，一致性抽查）

```diff
diff --git a/src/preload/index.ts b/src/preload/index.ts
index 52a22122c2..f00b4efb0a 100644
--- a/src/preload/index.ts
+++ b/src/preload/index.ts
@@ -1,19 +1,39 @@
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
@@ -21,6 +41,22 @@ function buildApi(): PreloadApi {
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
@@ -43,4 +79,5 @@ function buildEvents(): PreloadEvents {
 }
 
 contextBridge.exposeInMainWorld('api', buildApi())
+contextBridge.exposeInMainWorld('apiDrag', buildDrag())
 contextBridge.exposeInMainWorld('apiEvents', buildEvents())
diff --git a/src/shared/ipc/api-surface.ts b/src/shared/ipc/api-surface.ts
index b66352c9cb..691bd64cec 100644
--- a/src/shared/ipc/api-surface.ts
+++ b/src/shared/ipc/api-surface.ts
@@ -44,7 +44,9 @@ export const API_SURFACE = {
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
@@ -153,6 +155,17 @@ type Ep<D extends keyof Surface, M extends keyof Surface[D]> =
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
@@ -164,15 +177,37 @@ export type ApiHandlers = {
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
diff --git a/src/shared/ipc/schemas.ts b/src/shared/ipc/schemas.ts
index f0608e1913..8edf8c9435 100644
--- a/src/shared/ipc/schemas.ts
+++ b/src/shared/ipc/schemas.ts
@@ -60,7 +60,17 @@ export const saveProgressReqSchema = z
   .strict()
 export const trueAckSchema = z.object({ ok: z.literal(true) }).strict()
 
-// ── import_（对话框在 main 侧发起，renderer 不传任何路径）─────────────
+// ── import_（对话框/拖拽桥分别在 main/preload 侧产生路径，renderer 代码不传路径）──
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

```
