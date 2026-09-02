# F-R3 pdfjs stream pump 竞态排查报告（AUDIT-C 票 C-1——排查不修）

> 票面=auditc-ticket-kimi.md §4 C-1+auditc-final-ruling.md §2/§3。
> 手法链=M1 静态（只读子代理）+M2 注入+M3 压力+M4 真机（并入 M2/M3 探针设计
> ——真实库副本+真实 Electron 即真机面，分段采样=四场景 S0~S3）。
> 证据双路纪律=F-L3 范式（单路证据不得宣布闭环）。
> **门一=Kimi 链（kimi-main 一次命中 in≈25k/out 9.1k）「修订后采纳」**
> （1B/4W/4N——档=f-r3-gate1-kimi.md）：B1 修法两轨重排/W1 通道口径统一/
> W2 stack 补录/W3 按次率口径/W4 计数 111→162/N1 仪表事实两排除一指向/
> N2 StrictMode 实证+条件分支/N3 未观察到措辞——**全部采纳，本版=v2 修订版**
> （〔ds 门一 N〕标记随文）。
> **门二=deepseek（in≈10k/out 29k）「条件 PASS」**（1B/4W/6N——档=
> f-r3-gate2-ds.md；raw 数字零出入）四放行条件**本票内全部销项**（r5~r7
> 探针扩展+源码核验，见 §7）：①d 落点=**三路否定实证无接收点**（renderer
> unhandledrejection=0/page console=0/主进程 error 级=0——r6/r7）+**主进程
> level1 代理流发现**（getTextContent 终止警告 11 条——r7）；②单次切换净测
> **3/3 零触发**（S1b 静置 4s，r5/r6/r7）；③S2① 形态源码核验=ready tab 激活
> 仍经 fileUrl 变化 destroy+重载（流窗口在场，0/72=相位依赖）；④共享
> workerPort **源码死刑**（Terminate 完成 `handler.destroy(); handler=null`
> +单 pdfManager 闭包槽——pdf.worker.mjs Terminate handler 实读）。
> 修法候选按此终排（§5 v3）。

## 1. 结论（三态明确）

**实锤：pdfjs loadingTask.destroy() 与在途 worker 操作竞态族——destroy 时机落在
流加载/在途请求窗口内时，取消异常逃逸为 renderer pageerror。**

- 台账原始指纹 `_reader.read of null`（2026-08-31 F-R1 时代观察）与本次复现
  指纹 `Error: Worker was terminated`（worker 侧 `ensureNotTerminated` 抛出）
  属**同族不同子路径**：前者=流泵读 null reader，后者=terminate 后在途请求
  的 AbortException 逃逸（M1 静态面确认两路径的精确关系，见 §3）。
- **定性=噪声型非破坏型**：6/6 轮错误后 S3 健康面完好（textLayer 260 span
  渲染正常、零 console error、零主世界 unhandled rejection）。
- **触发画像**（门二条件②销项后终版；动作粒度计数〔门二 N6〕——探针七轮
  总动作 4+7+9+9+1+9+9(S0/S1)+…含 S1b 3 次与 S2 循环（开+关各计一动作））：
  - 常规单开=零复现（6/6 轮 S0 全绿）；
  - **单次切换（已加载 A→开 B→静置）=3/3 零触发**（S1b 净测：开 B 后静置
    3~5s 无后续动作，r5/r6/r7——门二条件②；r4 S1 n=1 同形态旁证）；
  - 快速连开=4 错/28 开（r1~r3+r6/r7 S1 段，14.3%/次）；ready tab 间切换
    =0 错/72 开（〔门二条件③源码核验〕该形态**仍有流窗口**——激活即
    fileUrl 变化→destroy 旧+全新 getDocument，零命中=相位依赖非无窗口，
    原报告「幂等激活无流窗口」措辞作废）；开→120ms→关循环=3 错/93 循环
    （3.2%/次——r3 54 循环 2 错/r4 3 循环 1 错/r6+r7 各 18 循环 0 错）。
  - **归因注记**：S1 首错常带 open#1 标签（r3/r6/r7 三轮钉到），但标签=
    pageerror **到达时刻**而非触发时刻（事件异步派发）——单次切换 3/3 零
    触发与连开首错并存，说明首错更可能属第二轮 destroy 的到达滞后或
    S0 残留在途请求的跨动作串扰（〔门二 N2〕S0/S1 边界无隔离 sleep），
    精确归属不锁死（不影响族结论与用户路径画像）。
  - 连开 vs 开关循环的次率差在样本量下**无统计显著性**（Fisher p≈0.3
    〔门二 N1〕）——「窗口内相位是真变量」由「destroy 在窗口内仅 3~14%
    命中而非 100%」直接成立，不依赖该对比。

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

指纹（M3 判据底座=同值性）：七轮 8 错，消息全部恒为 `Error: Worker was
terminated`（8/8 同值）；stack 留存三轮（r4/r6/r7——探针 v2 起改 R3_TAG
并行留存，r1~r3 单文件覆盖已不可追溯〔门二 W3〕——覆盖式产物教训同 W-G2）
采样恒同值（门一 W2 补录附录）：

```
at ensureNotTerminated (file:///E:/class/%E6%99%BA%E6%85%A7%E6%B0%B4%E5%8A%A1/
Synapse_remake/out/renderer/assets/pdf.worker.min-yatZIOMy.mjs:21:1365306)
```

——worker 资产 URL 实锤（非主世界 pdf.mjs 抛出），同值指纹非环境噪声。
仪表事实（门一 N1+门二条件①终版）：**三路否定**（主世界 unhandledrejection
监听=0；page console=0；**主进程 webContents console-message error 级=0**
〔r6〕——pageerror 本体应用不可拦截）+**一路代理可见**（主进程 console-message
**level 1 warning** 收到伴随流：`Warning: getTextContent - ignoring errors
during "GetTextContent: page N" task: "Error: Worker task was terminated"` ×11
〔r7 全级采样〕——这些是被 pdfjs 捕获记警告的在途任务终止，与未捕获的
pageerror 同源同族：诊断代理计数宿主）。

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
| P1 TextLayer 泵 `#reader.read()` of null（pdf.mjs:10970×cancel :11020 置 null）——主世界唯一「接收者可空 read()」 | 机制存在；dev（React.StrictMode，main.tsx:9 grep 实证）系统性可达；prod 静态闭合（同实例 mount/cleanup 不可能同提交） | **prod 动态佐证闭合**：四轮 162 次开/关/切（口径：S0 4+S1 25+S2① 72+S2② 57+S3 4——门一 W4 修正，原「111」计数作废）零 `_reader.read` 形态命中（全为 P-worker 形态）。dev 形态备案（用户路径=打包版不可达；上游 master 同形状，升级不治）。**条件分支声明（门一 N2）**：若 2026-08-31 原始 `_reader.read of null` 观察实发于 prod，则本行「prod 静态闭合」即被证伪——原始观察无 stack 存档（M1 F-1），此分支不可判定，按同族双备案处置，二波修票前可选补一次 prod 单开 TextLayer 直测销项 |
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
2. **修法候选**（门一 B1 重排+门二条件①④销项后**终版**）：
   - **轨一：治 pageerror 噪声本体**——
     - d. ~~renderer/主进程指纹吞并~~：**死刑（门二 B1+条件①三路否定实证）**
       ——错误仅存在于 CDP 仪表通道（Runtime.exceptionThrown），renderer
       DOM 事件与主进程 console-message 均无 error 级接收点；**降格产物=
       主进程代理计数**（level1 getTextContent 终止警告流，r7 实证可收）
       ——只能计数监控不能消除。
     - e. **上游修复查证+升级**：查 pdfjs 5.x 是否给 worker 泵补终接 catch
       ——**轨一唯一消除路径**；若上游未修且噪声无用户可感面（6/6 健康完
       好），则裁决选项=「接受噪声+代理计数监控备案」（噪声只在开发工具
       可见，用户路径零影响）。
   - **轨二：治 P6+抖动（副产缺口）**——
     - a. ~~共享 workerPort~~：**死刑（门二 W4+条件④源码实锤）**——
       pdf.worker.mjs Terminate handler 完成即 `handler.destroy();
       handler=null`+pdfManager 单闭包槽：一次 destroy 后共享 worker 无
       处理方，且 A 的 Terminate 连坐同 worker 上 B 的在途加载。除非 5.x
       重设计（二波查证顺带），不可行。
     - b. destroy 序列化（await 旧 destroy 完成再新 getDocument）——不改
       噪声本体，对连开体验面或有增益，机理待二波注入实验证。
     - c. CorpusExtractor 失败路径补 destroy（保留 task 句柄）——闭 P6+
       修状态机表文档面；体量极小（门一 N4 建议评估提前）。
3. **INV 增补草案**（门一 B1+门二条件①修订终版）：候选宿主=新 INV「pdfjs
   文档生命周期销毁序」（或 INV-30 增补）：声明处=PdfDocProvider 卸载序+
   destroy 竞态窗口（含 worker-per-task 事实与 P6 泄漏面）；强制方式=
   **「代理计数可见性锚」**——主进程 level1 getTextContent 终止警告流可
   收（r7 实证），修复/升级后断言「连开+加载中关 tab 场景代理计数不增+
   pageerror 零」；若终裁为「接受噪声备案」则锚改「代理计数仅监控不设阈」。
   锚定状态随修复票落定。二波终裁定宿主。
   附〔门二 N3〕：pdfjs 官方对 destroy-during-load 契约表述（「destroy 对
   加载中是中止」——PdfDocProvider.tsx:8-9 头注在档转述）二波修票时补官方
   文档原文锚。

## 6. 不确定面（门二后收敛终版）

- ~~S1 open#1 归属~~——见 §1 归因注记（到达时刻≠触发时刻；不锁死）。
- ~~`_reader.read of null` 原始指纹~~——M1 判定：PDFFetchStream 路径死代码；
  候选=P1 TextLayer 泵（prod 静态闭合+动态零命中；dev 面=main.tsx:9
  `<React.StrictMode>` 包裹实证〔门二 N5〕）。原始观察（2026-08-31）无
  stack 存档，环境未定——**条件分支（门一 N2）**：若实发于 prod 则 P1 prod
  闭合被证伪，第三子路径存在；二波修票前可选补 prod 单开 TextLayer 直测
  销项。同族「pdfjs 取消泵竞态」双备案处置维持（门二不确定项 4：归类宽泛
  口径已知，不威胁结论）。
- pdfjs 5.x worker 泵终接 catch 现状未查证（轨一 e 前置）——二波修票第一步。
- P6 worker 线程泄漏速率未实测（依赖 GC 策略）。
- 升级若发生：P1 TextLayer 形状需重验（门二 N4）。

## 7. 门二四放行条件销项记录（本票内完成——r5~r7 探针扩展+源码核验）

| 条件 | 销项方式 | 结果 |
| --- | --- | --- |
| ① d 落点重设计 | 探针挂主进程 console-message（先 level≥3 后全级），两轮触发态实测（r6/r7） | **死刑**：error 级零接收（r6）；level1 代理流发现（r7，getTextContent 终止警告×11）——d 降格为代理计数，落点=主进程 |
| ② 单次切换净测 | S1b 场景（openCard0 等渲染完→开 card1→静置 3~5s），三轮（r5/r6/r7） | **3/3 零触发**——「单次切换未观察到」升级为净测结论 |
| ③ S2① 形态核验 | reader.store 状态机+ReaderPage 装配源码实读 | 该形态仍有流窗口（激活=fileUrl 变化→destroy+全新 getDocument）；0/72=相位依赖；报告措辞已改 |
| ④ 共享 worker 作用域 | pdf.worker.mjs Terminate handler 源码实读 | **候选 a 死刑**：`handler.destroy(); handler=null`+单 pdfManager 槽——一次 Terminate 后共享 worker 不可复用 |

放行条件全销——§5 修票素材**可移交二波**（门二「条件满足前不得移交」解除）。
