# F-R3 排查票（AUDIT-C C-1）门一审简报——Kimi 链必保位

你是门一对抗审查员。审查对象=F-R3 pdfjs 竞态**排查票**的排查报告（下方全文）。
排查票性质=只取证不修；验收=证据双路（M1 静态+M2/M3 动态）齐全+结论三态明确。
你的职责：找结论与证据的偏差、机制误判、修复方向错误、既有锚误伤。重点四问：
1. P-worker 归因链是否成立（worker 世界 unhandled rejection → Playwright pageerror
   仪表通道——三项仪表事实 pageerror 带 worker 栈/unhandledrejection=0/console=0
   的自洽性；有没有更优解释）？
2. P1（TextLayer `#reader.read` of null）prod 静态闭合论证是否有漏洞（React 提交
   时序论证是否完备；台账原始指纹 `_reader.read of null` 的归档处置是否妥当）？
3. 误伤核对（INV-30/INV-16/CorpusExtractor R2 裁决不动摇）是否可靠？
4. 修法候选排序（workerPort 首推）是否正确；P6（CorpusExtractor 失败路径泄漏
   worker）定级是否恰当？

输出：B（结论性错误）/W（应修订）/N（建议）+每条证据引用（报告节号或代码行）；
最后总裁决「采纳/修订后采纳/需返工」。用中文。不确定的明说不确定。

━━━ 证据 A：PdfDocProvider.tsx 全文（应用层宿主）━━━

// b3: P7-F
/**
 * PdfDocProvider —— pdf.js 文档生命周期宿主（F-01：由 PdfCanvas.tsx 拆出，
 * 旧文件已删——方案切换=删除旧方案红线）。
 *
 * ── 行为层 ──
 * - worker 本地打包（ADR-0002：禁 CDN）+ getDocument({url,isEvalSupported:false})
 *   加载 fileUrl（app-file://）；loadingTask.destroy() 对"加载中"是中止、对
 *   "已加载"是销毁（换文档/卸载即销毁，句柄生命周期归本组件）
 * - doc 就绪经 children render-prop 下发（每 tab 一份——挂 ReaderPage 主区）；
 *   未就绪渲染空占位（tab 级 loading/error 态由 ReaderPage 空态分支承载）
 *
 * ── 接口层 ──
 * - export function PdfDocProvider(props: { fileUrl: string;
 *     onDocInfo?(info: { numPages: number }): void;
 *     onDocReady?(doc: PDFDocumentProxy): void;
 *     onError(msg: string): void;
 *     children: (doc: PDFDocumentProxy) => JSX.Element }): JSX.Element
 * - pdfjs 类型再导出单点（INV-16：白名单外消费方不 import pdfjs-dist，含
 *   import type——OutlinePanel/OutlineThumb 自此取 PDFDocumentProxy/RenderTask）
 *
 * ── 架构层 ──
 * - pdfjs-dist import 白名单文件（INV-16：PdfDocProvider/PdfPageCanvas/TextLayer/
 *   CorpusExtractor——ESLint no-restricted-imports 机器锚，白名单变更=[locked-change]）
 * - worker ?url 配方（dev=dev-server 地址、构建后=产物内文件 URL，均在 CSP
 *   worker-src 'self' 内——spike 实证）；与 CorpusExtractor 的 worker 配置同值幂等
 *
 * ── 生命周期层 ── / ── 文化层 ──
 * - e2e tests/e2e/reader-text.spec.ts（渲染文本断言——阅读器渲染链）
 */
import { useEffect, useRef, useState } from 'react'
import { GlobalWorkerOptions, getDocument, type PDFDocumentProxy } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

// worker 本地打包（ADR-0002 硬约束：禁 CDN）；?url 在 dev 是 dev-server 地址、
// 构建后是产物内文件 URL，两者都在 CSP worker-src 'self' 范围内（spike 实证）
GlobalWorkerOptions.workerSrc = workerUrl

/** pdfjs 类型再导出（INV-16：白名单外文件的类型消费统一经本文件——消费方
 *  不 import pdfjs-dist，含 import type；RenderTask 供 OutlineThumb 等取消渲染） */
export type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist'

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

export function PdfDocProvider(props: {
  fileUrl: string
  /** 文档加载完成时上报页数（totalPages 的数据生产者，先于 children 下发） */
  onDocInfo?(info: { numPages: number }): void
  /** 文档句柄上报（目录/缩略图侧栏的数据源；换文档即弃，消费方按 unknown 收窄） */
  onDocReady?(doc: PDFDocumentProxy): void
  onError(msg: string): void
  children: (doc: PDFDocumentProxy) => JSX.Element
}): JSX.Element {
  const { fileUrl } = props
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null)
  // 回调走 latest-ref：父组件传内联箭头函数不应触发文档重载
  const onDocInfoRef = useRef(props.onDocInfo)
  const onDocReadyRef = useRef(props.onDocReady)
  const onErrorRef = useRef(props.onError)
  onDocInfoRef.current = props.onDocInfo
  onDocReadyRef.current = props.onDocReady
  onErrorRef.current = props.onError

  // 文档生命周期（原 PdfCanvas 配方原样）：fileUrl 变化 → 弃旧文档（销毁连带
  // worker 侧资源）→ 异步加载新文档
  useEffect(() => {
    let cancelled = false
    setDoc(null)
    // isEvalSupported: false——CSP 禁 unsafe-eval，显式关掉 pdfjs 的 eval 快路径
    const task = getDocument({ url: fileUrl, isEvalSupported: false })
    task.promise
      .then((loaded) => {
        if (!cancelled) {
          // 页数随文档就绪上报（先于 setDoc，父组件可同步置 totalPages 供首帧渲染）
          onDocInfoRef.current?.({ numPages: loaded.numPages })
          onDocReadyRef.current?.(loaded)
          setDoc(loaded)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          onErrorRef.current(`PDF 加载失败：${errorMessage(err)}`)
        }
      })
    return () => {
      cancelled = true
      // loadingTask 拥有 document：destroy 对"加载中"是中止、对"已加载"是销毁
      void task.destroy().catch(() => undefined)
    }
  }, [fileUrl])

  if (doc === null) {
    return <div data-pdf-loading="true" />
  }
  return props.children(doc)
}

━━━ 证据 B：ReaderPage.tsx:50-70（fileUrl 装配位）━━━
import { readActiveTab, useActiveTab } from './useActiveTab'
import { createReaderScrollProgress, useScrollProgressWiring } from './scroll-progress'
import { showToast } from '../../shared/ui/Toast'

export function ReaderPage(): JSX.Element {
  // per-tab 选择器（TABS-01）：取 active tab 对象（引用稳定——无关 tab 更新不重渲染）
  const tab = useActiveTab()
  const paperId = tab?.paperId ?? null
  const fileUrl = tab !== null && tab.status === 'ready' && tab.fileUrl !== '' ? tab.fileUrl : null
  const page = tab?.page ?? 0
  const totalPages = tab?.totalPages ?? 0
  const zoom = tab?.zoom ?? 1
  const color = tab?.color ?? 'yellow'
  const selectionMode = tab?.selectionMode ?? false
  const pageLayout = tab?.pageLayout ?? 'single'
  const annotations = tab?.annotations ?? []
  const setPage = useReaderStore((s) => s.setPage)
  const setZoom = useReaderStore((s) => s.setZoom)
  const setColor = useReaderStore((s) => s.setColor)
  const setTotalPages = useReaderStore((s) => s.setTotalPages)
  const addAnnotation = useReaderStore((s) => s.addAnnotation)

━━━ 证据 C：pdf.worker.min.mjs 中全部 ensureNotTerminated/Worker was terminated 语境（主控复核提取）━━━
--- occurrence 1 ---
"ototype` contains unexpected enumerable properties: \"+C.join(\", \")+\"; thus breaking e.g. `for...in` iteration of `Array`s.\");const h=g+\"_worker\";let l=new MessageHandler(h,g,t);function ensureNotTerminated(){if(a)throw new Error(\"Worker was terminated\")}function startWorkerTask(e){r.add(e)}function finishWorkerTask(e){e.finish();r.delete(e)}async function loadDocument(e){await "
--- occurrence 2 ---
"push(e);Q.read().then(readChunk,t)}catch(e){t(e)}};Q.read().then(readChunk,t)})).catch((function(e){E.reject(e);s=null}));s=e=>{h.cancelAllRequests(e)};return E.promise})(e).then((function(e){if(a){e.terminate(new AbortException(\"Worker was terminated.\"));throw new Error(\"Worker was terminated\")}i=e;i.requestLoadedStream(!0).then((e=>{l.send(\"DataLoaded\",{length:e.bytes.byteLen"
--- occurrence 3 ---
"{t(e)}};Q.read().then(readChunk,t)})).catch((function(e){E.reject(e);s=null}));s=e=>{h.cancelAllRequests(e)};return E.promise})(e).then((function(e){if(a){e.terminate(new AbortException(\"Worker was terminated.\"));throw new Error(\"Worker was terminated\")}i=e;i.requestLoadedStream(!0).then((e=>{l.send(\"DataLoaded\",{length:e.bytes.byteLength})}))})).then(pdfManagerReady,onFailure)"
--- occurrence 4 ---
"re(e,\"getStructTree\")}))}));l.on(\"FontFallback\",(function(e){return i.fontFallback(e.id,l)}));l.on(\"Cleanup\",(function(e){return i.cleanup(!0)}));l.on(\"Terminate\",(function(e){a=!0;const t=[];if(i){i.terminate(new AbortException(\"Worker was terminated.\"));const e=i.cleanup();t.push(e);i=null}else clearGlobalCaches();s?.(new AbortException(\"Worker was terminated.\"));for(const e "
--- occurrence 5 ---
"nction(e){return i.cleanup(!0)}));l.on(\"Terminate\",(function(e){a=!0;const t=[];if(i){i.terminate(new AbortException(\"Worker was terminated.\"));const e=i.cleanup();t.push(e);i=null}else clearGlobalCaches();s?.(new AbortException(\"Worker was terminated.\"));for(const e of r){t.push(e.finished);e.terminate()}return Promise.all(t).then((function(){l.destroy();l=null}))}));l.on(\"Rea"
--- ensureNotTerminated 定义 ---
"esolve()}terminate(){this.terminated=!0}ensureNotTerminated(){if(this.terminated)throw new Error(\"Worker task was terminated\")}}class WorkerMessageHandler{stati"

━━━ 证据 D：四轮探针 raw 输出（动态证据原始面）━━━
--- scripts/audits/f-r3-probe-r1.raw.txt ---
[f-r3 01:33:32] 文献库卡片数 9
[f-r3 01:33:33] S0 单开基线 {"rendered":true,"pageErrors":0,"consoleErrors":0}
[f-r3 01:33:34] pageerror@S1-rapid-open: Error: Worker was terminated
[f-r3 01:33:34] S1 快速连开 {"n":6,"elapsedMs":844,"pageErrors":1,"consoleErrors":0,"msgSamples":["Error: Worker was terminated"]}
[f-r3 01:33:37] S2 压力序列 {"rounds":3,"opens":18,"elapsedMs":2663,"pageErrors":0,"consoleErrors":0}
[f-r3 01:33:37] S3 健康面 {"rendered":true,"spanCount":260,"pageErrors":0}
F-R3 PROBE: S0=0 err | S1=1 err(6 开/844ms) | S2=0 err(18 开) | S3 health=OK | 总 pageerror=1 / unhandled=0
--- scripts/audits/f-r3-probe-r2.raw.txt ---
[f-r3 01:35:36] 文献库卡片数 9
[f-r3 01:35:37] S0 单开基线 {"rendered":true,"pageErrors":0,"consoleErrors":0}
[f-r3 01:35:37] pageerror@S1-rapid-open: Error: Worker was terminated
[f-r3 01:35:38] S1 快速连开 {"n":9,"elapsedMs":1285,"pageErrors":1,"consoleErrors":0,"msgSamples":["Error: Worker was terminated"]}
[f-r3 01:35:46] S2 压力序列 {"rounds":6,"opens":54,"elapsedMs":7833,"pageErrors":0,"consoleErrors":0}
[f-r3 01:35:47] S3 健康面 {"rendered":true,"spanCount":260,"pageErrors":0}
F-R3 PROBE: S0=0 err | S1=1 err(9 开/1285ms) | S2=0 err(54 开) | S3 health=OK | 总 pageerror=1 / unhandled=0
--- scripts/audits/f-r3-probe-r3.raw.txt ---
[f-r3 01:38:08] 文献库卡片数 9
[f-r3 01:38:09] S0 单开基线 {"rendered":true,"pageErrors":0,"consoleErrors":0}
[f-r3 01:38:10] pageerror@S1-rapid-open#open1: Error: Worker was terminated
[f-r3 01:38:11] S1 快速连开 {"n":9,"elapsedMs":1285,"pageErrors":1,"consoleErrors":0,"msgSamples":["Error: Worker was terminated"]}
[f-r3 01:38:14] pageerror@S2-open-close#open25: Error: Worker was terminated
[f-r3 01:38:17] pageerror@S2-open-close#open35: Error: Worker was terminated
[f-r3 01:38:23] S2 开关循环 {"mode":"open→120ms→closeTab","rounds":6,"cycles":54,"closeFail":0,"elapsedMs":12124,"pageErrors":2,"consoleErrors":0}
[f-r3 01:38:23] S3 健康面 {"rendered":true,"spanCount":260,"pageErrors":0}
F-R3 PROBE: S0=0 err | S1=1 err(9 开/1285ms) | S2=2 err(54 开关循环/closeFail=0) | S3 health=OK | 总 pageerror=3 / unhandled=0
--- scripts/audits/f-r3-probe-r4-n1.raw.txt ---
[f-r3 01:45:23] 文献库卡片数 9
[f-r3 01:45:24] S0 单开基线 {"rendered":true,"pageErrors":0,"consoleErrors":0}
[f-r3 01:45:24] S1 快速连开 {"n":1,"elapsedMs":156,"pageErrors":0,"consoleErrors":0,"msgSamples":[]}
[f-r3 01:45:24] pageerror@S2-open-close#open1: Error: Worker was terminated
[f-r3 01:45:25] S2 开关循环 {"mode":"open→120ms→closeTab","rounds":3,"cycles":3,"closeFail":0,"elapsedMs":629,"pageErrors":1,"consoleErrors":0}
[f-r3 01:45:25] S3 健康面 {"rendered":true,"spanCount":260,"pageErrors":0}
F-R3 PROBE: S0=0 err | S1=0 err(1 开/156ms) | S2=1 err(3 开关循环/closeFail=0) | S3 health=OK | 总 pageerror=1 / unhandled=0

━━━ 被审报告全文（scripts/audits/f-r3-investigation.md）━━━
# F-R3 pdfjs stream pump 竞态排查报告（AUDIT-C 票 C-1——排查不修）

> 票面=auditc-ticket-kimi.md §4 C-1+auditc-final-ruling.md §2/§3。
> 手法链=M1 静态（只读子代理）+M2 注入+M3 压力+M4 真机（并入 M2/M3 探针设计
> ——真实库副本+真实 Electron 即真机面，分段采样=四场景 S0~S3）。
> 证据双路纪律=F-L3 范式（单路证据不得宣布闭环）。

## 1. 结论（三态明确）

**实锤：pdfjs loadingTask.destroy() 与在途 worker 操作竞态族——destroy 时机落在
流加载/在途请求窗口内时，取消异常逃逸为 renderer pageerror。**

- 台账原始指纹 `_reader.read of null`（2026-08-31 F-R1 时代观察）与本次复现
  指纹 `Error: Worker was terminated`（worker 侧 `ensureNotTerminated` 抛出）
  属**同族不同子路径**：前者=流泵读 null reader，后者=terminate 后在途请求
  的 AbortException 逃逸（M1 静态面确认两路径的精确关系，见 §3）。
- **定性=噪声型非破坏型**：4/4 轮错误后 S3 健康面完好（textLayer 260 span
  渲染正常、零 console error、零主世界 unhandled rejection）。
- **触发画像**（用户路径评估）：常规单开=零复现（4/4 轮 S0 全绿）；快速连开
  =每轮 1 条；**加载中关 tab=最锐触发器**（首循环即中）；单次切换（已加载
  文档→另一篇）不触发（R4 S1 隔离实验 0 错误）。

## 2. 动态证据（M2 注入+M3 压力+M4 真机——探针 scripts/audits/f-r3-probe.mjs）

探针形态=crib f-a3-verify.mjs（真实库副本 freshUserData+Electron launch+真
实 UI 路径：文献库↔卡片双击/关闭叉）；三路捕获（pageerror+console error+
注入 unhandledrejection 监听）；四场景分段：

| 场景 | 形态 | 结果 |
| --- | --- | --- |
| S0 基线 | 单开一篇等加载完 | 4/4 轮零错误（「单开零复现」口径复验成立） |
| S1 注入 | 快速连开 N 篇（每篇不等加载完） | r1: 1 错/6 开；r2: 1 错/9 开；r3: 1 错/9 开（open#1 时窗）；**r4 N=1 隔离=0 错**（单次切换不触发） |
| S2 压力 | ①同卡片重复开（tab 已 ready=幂等激活）②开→120ms→关 tab 循环 | ①0 错/72 开（r1+r2——ready tab 间切换=destroy 已加载文档，无流窗口）；②3 错/57 循环（r3: open25/open35；r4: 首循环即中）——**加载中关 tab=最锐触发** |
| S3 健康 | 错误后再单开完整渲染 | 4/4 轮 rendered=true（spanCount=260）+0 错误 |

指纹（M3 判据底座=同值性）：全部错误恒为 `Error: Worker was terminated`，
stack 首行恒 `at ensureNotTerminated (…pdf.worker.min-yatZIOMy.mjs:21:1365306)`
——同值指纹，非环境噪声。console error=0、注入 unhandledrejection 监听=0
（错误以主世界未捕获异常形态到达 pageerror 通道而非 promise rejection 通道
——M1 §3 对应该 plumbing 有定位）。

机制链（UI 路径侧，源码实读）：`ReaderPage.tsx:58` fileUrl 仅 active tab
`ready` 时非空——每次 openPaper 新 tab=loading → fileUrl=null →
PdfDocProvider 卸载/换 fileUrl（:180）→ effect 清理
`void task.destroy().catch(() => undefined)`（PdfDocProvider.tsx:90）落在
前一篇**流加载窗口内**=竞态窗口。加载中关 tab 同理（unmount→destroy）。

原始数据：scripts/audits/f-r3-out/f-r3-probe.json+四轮 raw
（f-r3-probe-r1~r4*.raw.txt）。

## 3. 静态证据（M1 只读子代理全枚举——GLM5.3 统一档 4.11M tok/79 工具/1565s）

版本基线=pdfjs-dist **4.10.38**（pdf.mjs 内部戳 build f9bea397f）。

### 3.1 调用链全集（A 表）

- **应用层**：loadingTask 唯一创建点=PdfDocProvider.tsx:72（effect deps=[fileUrl]）；destroy 唯一触发点=PdfDocProvider.tsx:87-91（卸载/fileUrl 变更两形态共用）；CorpusExtractor.ts:189 第二创建点（**task 句柄被丢弃**，仅透传 promise）+finally 仅成功路径 destroy（:256-264）；PdfPageCanvas.tsx:93/120-127/142-151（render cancel 三位一体=INV-30 机制面）；TextLayer.tsx:88/91（render/cancel）；OutlineThumb.tsx:41-58（cancel+catch 全吞）；OutlinePanel.tsx:75-93（cancelled 门）。grep 全集复核：无第五处 pdfjs-dist import，RenderTask/loadingTask 相关命中仅上述（INV-16 合规）。
- **pdfjs 内部关键位**（pdf.mjs=主包/pdf.worker.mjs=worker 包）：
  - 每个未传 worker 的 loadingTask **自带专属 PDFWorker**（pdf.mjs:11409-11416）——每开一篇=新 worker 线程；destroy 链=transport.destroy（:12526-12556）→ `_worker.destroy()` → **worker.terminate() 杀线程**（:12390-12399）。
  - 网络层选择：`isValidFetchUrl` 只认 http/https（:1088-1093）→ **`app-file://` 恒走 PDFNetworkStream（XHR）**，PDFFetchStream（pdf.mjs:10115-10251 的 `_reader` 泵）在本应用=**死代码**（构建产物复核证实）。
  - worker 侧加载泵（pdf.worker.mjs:56505-56575）：`readChunk` 链内 `ensureNotTerminated`（Terminate 置位后 throw）。

### 3.2 pageerror 来源排序（B 表——主控按动态证据复裁）

| 候选 | M1 三态 | 主控动态复裁 |
| --- | --- | --- |
| **P-worker 加载泵 unhandled rejection**（pdf.worker.mjs:56447/56562-56585——Terminate 置位后泵 continuation 抛 `Error("Worker was terminated")`） | 存在（worker 世界 unhandled rejection）；M1 推断「真 worker 下不达 renderer pageerror，仅 worker console」 | **实锤=本路径**。实测消息与 minified worker 包 WorkerMessageHandler 级 `function ensureNotTerminated(){if(a)throw new Error("Worker was terminated")}` 逐字一致（与 WorkerTask 级 "Worker task was terminated" 是两处不同 throw）。M1「不达 pageerror」**推错在仪表层**：Playwright 经 CDP worker auto-attach 把 worker 未捕获异常汇入 pageerror 事件（worker 栈帧直达）——主世界 unhandledrejection=0/console error=0/pageerror 带 worker 栈三项仪表事实全对上 |
| P1 TextLayer 泵 `#reader.read()` of null（pdf.mjs:10970×cancel :11020 置 null）——主世界唯一「接收者可空 read()」 | 机制存在；dev（React.StrictMode）系统性可达；prod 静态闭合（同实例 mount/cleanup 不可能同提交） | **prod 动态佐证闭合**：四轮 111 次开/关/切零 `_reader.read` 形态命中（全为 P-worker 形态）。dev 形态备案（用户路径=打包版不可达；上游 master 同形状，升级不治） |
| P2 worker 侧 PDFWorkerStreamReader._reader.read（:56322） | 不存在（真 worker 下 `_reader` 构造器赋值后从不置 null）；fake-worker 回退前提下不确定 | 维持（spike 真 worker 实证；无主世界形态错误佐证无回退） |
| P3 PDFFetchStream `_reader.read`（pdf.mjs:10178/10234） | 不存在（本应用死代码） | 维持 |
| P4/P5 destroy-during-load 各主世界 rejection 出口（task.promise/sink.onCancel/headersCapability/XHR 晚到/`_pumpOperatorList` 裸 throw 等） | 不存在（逐条守卫核验——cancelled 门/destroyed 同步置位门/`_transport.destroyed` 早退/`.catch(()=>{})` 等） | 维持——**正因主世界出口全有守卫，逃逸才落在 worker 世界**（与三项仪表事实自洽） |
| **P6 CorpusExtractor 加载失败缺 destroy** | **存在（真实缺口）**：loadPdfDocument 丢弃 task 句柄（:189），加载失败→finally `doc===null`→不 destroy（:257）→**每次提取加载失败泄漏一个专属 worker 线程**；与状态机表「失败也释放」（CorpusExtractor.ts:31 头注）**文档与实现不符** | 二波修票素材（§5） |

### 3.3 连开事件序（C 表推演，源码实读）

ReaderPage.tsx:58 fileUrl 仅 active tab ready 非空；:153 非 ready 退空态→**PdfDocProvider 整体卸载**。连开 A→B：B 进 loading→fileUrl=null→卸载→cleanup `task.destroy()`（transport.destroyed 同步置位→worker 收 Terminate：`terminated=true`+`cancelXHRs(AbortException)`→主世界 sink.onCancel 被 destroyed 门吞→**worker 加载泵 continuation 抛 Worker was terminated→worker 世界 unhandled rejection**→T3 worker.terminate() 杀线程）；B ready→重新挂载→全新 worker。**tabLoadSeq/inflightOpen 只守 IPC 数据面，不触及 pdfjs 加载流——竞态在 pdfjs 内部与 PdfDocProvider 清理序之间，store 守卫无介入点**。加载中关 tab=同一卸载形态（更锐=destroy 必落在加载窗口内）。

## 4. 误伤核对（随 M1）

- **INV-30（canvas 生命周期/取消在途任务）：不动摇**——PdfPageCanvas cancel 对+RenderingCancelledException 双门+PageColumn 窗口语义原样；修法落点（workerPort/destroy 序列化）不触碰窗口/回收语义。
- **INV-16（import 白名单+worker 单份）：不动摇**——白名单四文件+类型再导出链核对无第五处；「每 task 一个 worker 线程」是 pdfjs 运行时行为非资产复制；workerPort 候选仍消费同一 ?url 资产，语义保持。
- **CorpusExtractor R2 裁决（自持生命周期）：不动摇**；但其头注状态机表「文档加载失败→destroy（失败也释放）」一格**被 P6 证伪**——随修票改为「加载失败=task 句柄不可达（泄漏面），成功/提取异常=doc.destroy 释放」（文档面修正归二波修票，本票只登记）。

## 5. 修票素材三件（二波输入——本票不修）

1. **根因**（M1 合流后终版）：pdfjs 4.10.38 worker 侧加载泵在 Terminate 置位
   后的 continuation 链**无终接 catch**——`ensureNotTerminated` 抛出的
   `Error("Worker was terminated")` 成为 **worker 世界 unhandled rejection**
   （经 CDP worker 汇入 pageerror 仪表通道；真实用户侧=devtools 噪声，
   无 UI 影响）。应用层 `task.destroy()` 调用本身在 pdfjs API 契约内
   （destroy-during-load=文档明示的中止语义），主世界各 rejection 出口
   pdfjs 已自守——**缺陷在库的 worker 泵错误终接，非应用调用不当**。
2. **修法候选**（M1 E 表+动态复裁，按优先序——终裁在二波修票）：
   - a. **共享 workerPort**（装配层一次性 `GlobalWorkerOptions.workerPort =
     new Worker(workerUrl,{type:'module'})`）——消灭每篇 spawn/terminate
     抖动；worker 复用时 destroy 只销毁 transport 不杀线程，**同时治 P6
     泄漏面**；INV-16 兼容（资产仍单份）。首推。
   - b. **destroy 序列化**（换文档先 `await 旧 task.destroy()` 再新
     getDocument——PdfDocProvider 内保存 in-flight destroy promise）。
   - c. **CorpusExtractor 失败路径补 destroy**（loadPdfDocument 返回
     {doc,task} 或 catch 内对保留句柄 destroy）——闭 P6+修状态机表文档面。
   - d. 窄化全局兜底：按指纹（消息+stack 源=pdf.worker 资产）定向吞并
     计数上报——有掩盖风险，须窄到加密级匹配并留档（保底项）。
   - e. 升级 pdfjs-dist：对 P1（TextLayer dev 形态）无效（上游 master 同
     形状）；对 P-worker 形态未查证上游修复——二波修票前查（dep-change
     需 ADR）。
3. **INV 增补草案**：候选宿主=新 INV「pdfjs 文档生命周期销毁序」（或
   INV-30 增补）：声明处=PdfDocProvider 卸载序+destroy 竞态窗口（含
   worker-per-task 事实与 P6 泄漏面）；强制方式=修复后 e2e/探针断言连开+
   加载中关 tab 零 pageerror；锚定状态随修复票落定。二波终裁定宿主。

## 6. 不确定面（M1 合流后收敛）

- ~~S1 open#1 时窗错误与 S2 close 循环错误是否同一子路径~~——已归并：均为
  P-worker 形态（destroy 落在流加载/在途窗口，子路径差异=已加载文档在途
  请求 vs 加载流在途，逃逸机制同一 worker 泵链）。
- ~~`_reader.read of null` 原始指纹~~——M1 判定：PDFFetchStream 路径在本
  应用为死代码；候选=P1 TextLayer 泵（prod 静态闭合+动态零命中；dev 面
  备案）。原始观察（2026-08-31）未存 stack，环境未定——按同族「pdfjs
  取消泵竞态」归类，P1 dev 形态与 P-worker 形态双备案。
- M1 声明的残留不确定（未再运行时验证）：P1 prod 非常规提交交错未穷尽
  （静态推断）；fake-worker 回退是否曾发生（spike 实证真 worker）；运行时
  载荷是否全为 app-file://（静态全枚举无反例）；P6 worker 线程泄漏速率
  未实测（依赖浏览器 GC 策略）。
