# F-R3 排查票（AUDIT-C C-1）门二终审简报——deepseek 位（与门一异构+亲跑矩阵核验）

你是门二终审员（对抗式+核验式）。门一（Kimi 链）已审：「修订后采纳」（1B/4W/4N，
其处置已并入下述 v2 报告）。你的职责（两条）：
1. **终审 v2 报告**：门一修订是否到位；有无门一漏判的新问题（重点：P-worker
   归因链、按次率口径 12.5%/5.3% 的自洽性、修法两轨划分是否成立——「指纹
   定向吞并是否可接受」与「上游查证」路线的取舍）。
2. **亲跑矩阵核验**：下述四轮探针由主控真实执行（命令与 raw 全文附后）。
   核验 raw 与报告数字的一致性（S0/S1/S2/S3 逐场景计数、错误率、健康面）；
   若认为矩阵不足以支撑结论，指出**还需哪一轮什么参数的运行**（主控可补跑，
   参数=R3_N/R3_DELAY_MS/R3_ROUNDS/R3_CLOSE_MS）。

输出：B/W/N 三级+每条证据；最后总裁决「PASS/条件 PASS（列条件）/FAIL」。
用中文。不确定的明说不确定。

━━━ 探针复现命令（主控已执行的四轮）━━━
- r1: R3_N=6 R3_ROUNDS=3（S2=旧形态 ready-tab 轮换） node scripts/audits/f-r3-probe.mjs
- r2: R3_N=9 R3_ROUNDS=6（S2=ready-tab 轮换）
- r3: R3_N=9 R3_ROUNDS=6 R3_CLOSE_MS=120（S2=开→120ms→关循环）
- r4: R3_N=1 R3_ROUNDS=3 R3_CLOSE_MS=120（单开隔离）
（探针本体=scripts/audits/f-r3-probe.mjs：真实库副本+Electron launch+三路捕获）

━━━ 四轮 raw 输出全文 ━━━

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

━━━ 门一审全文（Kimi 链——已处置并入 v2）━━━
[routing]: run=20260902015908-buco source=kimi-main model=kimi-k3 switches=0 usage=in=0,out=9117 latency=1173205ms (by ds-call.mjs 链)

# 门一审简报——F-R3 排查票（AUDIT-C C-1）

审查对象：`scripts/audits/f-r3-investigation.md` 全文 + 随票证据 A~D。重点四问逐项核对如下。

---

## B（结论性错误）

**B1｜修法候选 a/b 不触及报告自定的根因，排序首推的机理不成立**

- 报告 §5.1 自证根因：「缺陷在库的 worker 泵错误终接——`ensureNotTerminated` 抛出的 Error 成为 worker 世界 unhandled rejection，**无终接 catch**」。
- 但 §5.2 首推 a（共享 workerPort）的理由是「destroy 只销毁 transport 不杀线程」——**杀不杀线程与噪声逃逸无关**。证据 C occurrence 4 显示 Terminate 处理器（`a=!0` → `i.terminate` → 泵 continuation 走 occurrence 1/2/3 的 `ensureNotTerminated` throw）挂在 WorkerMessageHandler 文档级作用域，与 `worker.terminate()` 杀线程是两个独立动作。只要 destroy 落在加载窗口内，Terminate 消息照发、`a` 照置位、泵 continuation 照抛、库内照旧无 catch——**workerPort 下 pageerror 噪声预期仍在**。
- b（destroy 序列化）同理：await 旧 destroy 并不能给库内泵链补 catch，destroy-during-load 窗口依旧存在（用户中途换文档是触发前提，序列化不改变 destroy 落在窗口内这一事实）。
- 后果：§5.3 INV 增补草案以「修复后探针断言连开+加载中关 tab **零 pageerror**」为强制方式——若二波按 a/b 落地，该断言**修不过**，锚会变成空转。真正对因的只有 d（指纹定向吞）和 e（上游修复查证+补丁）。
- 不确定声明：我对 pdfjs 4.10.38 workerPort 模式下 Terminate 消息是否照发未逐行核验（随票未附 pdf.mjs:12526-12556 destroy 全文）；但证据 C 的 worker 侧语境支持上述读法，且报告自己把根因定在「库内无终接 catch」，a/b 的排序论证必须补上「为何能消除 worker 世界 unhandled rejection」的机理链，否则首推不成立。

## W（应修订）

**W1｜§2 与 §3.2/§5.1 对到达通道的描述自相矛盾**

- §2 原文：「错误以**主世界未捕获异常形态**到达 pageerror 通道而非 promise rejection 通道」。
- §3.2 B 表与 §5.1 原文：「**worker 世界 unhandled rejection**，经 CDP worker auto-attach 汇入 pageerror」。
- 两句话不可能同真。从 §3.2 的完整论证看 §2 那句是措辞错误，但它恰好落在重点四问之 1 的归因链核心句上，必须修正为 worker 形态口径。

**W2｜「stack 首行恒为 ensureNotTerminated（pdf.worker.min…:21:1365306）」无随票证据支撑**

- 证据 D 四轮 raw 全文只有 message（`Error: Worker was terminated`），**无任何 stack 行**。
- 该 stack 是区分「worker 资产抛出」与「主世界 pdf.mjs 某守卫遗漏处同步抛出」的唯一判别证据——P-worker 实锤与 P4/P5「主世界出口全有守卫」的闭环都压在它上面。报告指向 `f-r3-probe.json` 留存，但随票材料无法复核。要求：补 probe.json 中至少一条完整 stack 摘录入报告附录，否则「指纹同值、非环境噪声」一句降级为待证。

**W3｜「加载中关 tab=最锐触发器」与自身数据不符**

- 按次错误率：S1 快速连开 = 3 错/24 开（r1 1/6 + r2 1/9 + r3 1/9）≈ **12.5%**；S2② 开关循环 = 3 错/57 循环 ≈ **5.3%**。按次率 S1 反而更锐。
- 「首循环即中」仅 r4 一轮 n=3 的样本（证据 D r4 raw：`cycles:3, pageErrors:1`）。
- §1/§2 触发画像应改为按次率口径，或显式标注 r4 样本量不足。顺带：S2② 每循环都保证 destroy 落在加载窗口内却只有 5.3% 命中，说明「destroy 在窗口内」非充分条件，窗口内相位才是变量——这点报告未讨论，建议补一句。

**W4｜「四轮 111 次开/关/切」计数与 raw 对不上**

- 按证据 D 累计：S0 4 + S1 6+9+9+1=25 + S2① 18+54=72 + S2② 54+3=57 + S3 4 = **162 次**。
- 111 的口径无从还原。该数字是 §3.2 P1 行「零 `_reader.read` 形态命中」强度的基数，基数不明则零命中的证明力不明。需说明口径或修正。

## N（建议）

**N1｜「unhandledrejection=0」的区分力被高估。** 注入监听在主世界，worker 世界 rejection 本就不会触发它；该事实只能排除「主世界 rejection 路径」，不能区分「worker rejection」与「主世界同步未捕获异常」。§3.2「三项仪表事实全对上」措辞建议改「两项排除性+一项指向性（stack 待 W2 补证）」。

**N2｜P1「dev（React.StrictMode）系统性可达」前提未证。** 随票无 StrictMode 装配证据，我不确定本应用 dev 是否启用 StrictMode；若不启用，「dev 系统性可达」降级为理论可达。另：§6 已备案 2026-08-31 原始观察「环境未定」，建议显式写出条件分支——**若该观察发生于 prod，则 P1 prod 静态闭合即被证伪**，当前的「双备案」处置隐含地回避了这一点。

**N3｜「单次切换不触发」宜改「未观察到」。** 依据仅 R4 S1 n=1 零错误（证据 D r4 raw：`n:1, pageErrors:0`），单样本不支持否定式结论。

**N4｜P6 定级二波基本恰当**（仅失败路径触发、泄漏速率未实测已备案 §6），但修法 c（保留 task 句柄+失败路径 destroy）体量极小且与 a 联动，建议修票时评估是否提波；头注状态机表证伪格「登记归二波、本票只注册」的处置妥当。

## 四问总答

1. **P-worker 归因链**：机制读法（worker 世界 unhandled rejection → CDP auto-attach → pageerror）与证据 C 的 minified 语境自洽，无更优解释浮出水面；但**内部表述矛盾（W1）+ 关键 stack 证据缺随票留存（W2）**，链的最后一环待补。
2. **P1 prod 闭合**：React 提交时序论证 + 四轮零命中方向可信，但命中基数（W4）与 StrictMode 前提（N2）有缺口；原始指纹「同族归档+双备案」处置可接受，条件是补 N2 的条件分支声明。
3. **误伤核对**：可靠。INV-30 三点位、INV-16 白名单四文件与证据 A 实读一致；CorpusExtractor R2 裁决不动摇与头注证伪格的分离处置干净。无异议。
4. **修法排序**：**不正确**（B1）——a/b 与报告自证根因脱节，首推论证缺机理链；P6 定级恰当（N4）。

## 总裁决

**修订后采纳**。

排查本体（P-worker 实锤、P1~P5 三态、P6 登记）结论方向成立、双路证据架构符合 F-L3 范式，不返工。但放行前必须完成：W1 矛盾句修正、W2 stack 证据补录（或降级声明）、W3/W4 数据口径修正、B1 修法候选重排或补机理论证（此项直接关系二波修票不走空）。B1 若二波开工前未修订，workerPort 落地后「零 pageerror」INV 断言会原地爆炸——这是本简报最重的一条。
━━━ 被审 v2 报告全文（scripts/audits/f-r3-investigation.md）━━━
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

## 1. 结论（三态明确）

**实锤：pdfjs loadingTask.destroy() 与在途 worker 操作竞态族——destroy 时机落在
流加载/在途请求窗口内时，取消异常逃逸为 renderer pageerror。**

- 台账原始指纹 `_reader.read of null`（2026-08-31 F-R1 时代观察）与本次复现
  指纹 `Error: Worker was terminated`（worker 侧 `ensureNotTerminated` 抛出）
  属**同族不同子路径**：前者=流泵读 null reader，后者=terminate 后在途请求
  的 AbortException 逃逸（M1 静态面确认两路径的精确关系，见 §3）。
- **定性=噪声型非破坏型**：4/4 轮错误后 S3 健康面完好（textLayer 260 span
  渲染正常、零 console error、零主世界 unhandled rejection）。
- **触发画像**（〔ds 门一 W3/N3 修订：按次率口径〕用户路径评估）：常规单开=
  零复现（4/4 轮 S0 全绿）；快速连开=3 错/24 开（**12.5%**/次，r1~r3）；
  ready tab 间切换=0 错/72 开（destroy 已加载文档无流窗口）；开→120ms→关
  循环=3 错/57 循环（**5.3%**/次，r3: 54 循环 2 错/r4: 3 循环 1 错——「首
  循环即中」仅 r4 单轮小样本，不外推）；**单次切换（已加载→另一篇）未观察
  到触发**（r4 S1 n=1 隔离实验——单样本，弱证据）。按次率连开>开关循环
  说明「destroy 落在窗口内」非充分条件，**窗口内相位**（流阶段/在途请求
  组合）是真变量——二波修票注入实验的采样点。

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
stack 首行恒为（f-r3-probe.json 留存，**门一 W2 补录附录**）：

```
at ensureNotTerminated (file:///E:/class/%E6%99%BA%E6%85%A7%E6%B0%B4%E5%8A%A1/
Synapse_remake/out/renderer/assets/pdf.worker.min-yatZIOMy.mjs:21:1365306)
```

——worker 资产 URL 实锤（非主世界 pdf.mjs 抛出），同值指纹非环境噪声。
仪表事实三项（门一 N1 精化口径）：**两项排除性**（主世界 unhandledrejection
监听=0→排除主世界 rejection 路径；console error=0→排除 console 型）+**一项
指向性**（pageerror 栈帧=worker 资产→指向 worker 世界 unhandled rejection
经 CDP worker auto-attach 汇入——「以主世界未捕获异常形态到达」的旧措辞
作废，统一 worker 形态口径=门一 W1 修正）。

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
2. **修法候选**（门一 B1 重排：按「治什么」分两轨——原 a/b 首推被裁定与根因
   脱节：workerPort/序列化不改变「Terminate 照发→泵 continuation 照抛→库内
   无终接 catch」，噪声预期仍在；终裁在二波修票）：
   - **轨一：治 pageerror 噪声本体（F-R3 主诉求）**：
     - d. **指纹定向吞并**：renderer 侧按「消息=Worker was terminated+stack
       源=pdf.worker 资产」加密级指纹匹配，吞并+计数上报（不静默——计数入
       诊断日志）。有掩盖风险，须窄匹配+留档。**当前唯一确定对因的应用层
       手段**。
     - e. **上游修复查证+升级/补丁**：查 pdfjs 5.x 是否已给 worker 泵加终接
       catch；若已修→升级（dep-change 需 ADR）；未修→d 兜底。
   - **轨二：治 P6+worker 抖动（副产缺口，非噪声本体）**：
     - a. 共享 workerPort——消灭每篇 spawn/terminate 抖动+P6 泄漏面
       （destroy 仍发 Terminate，噪声不消失——**B1 裁定**）；INV-16 兼容。
     - b. destroy 序列化——收敛「destroy 在途×新 load 起跑」交叠（不改噪声
       本体；对连开体验面或有增益，机理待二波注入实验证）。
     - c. CorpusExtractor 失败路径补 destroy（保留 task 句柄）——闭 P6+修
       状态机表文档面；体量极小，门一 N4 建议评估提前。
3. **INV 增补草案**（门一 B1 修订：强制方式不再断言裸「零 pageerror」——
   若按轨二落地该断言修不过=空转锚）：候选宿主=新 INV「pdfjs 文档生命周期
   销毁序」（或 INV-30 增补）：声明处=PdfDocProvider 卸载序+destroy 竞态
   窗口（含 worker-per-task 事实与 P6 泄漏面）；强制方式=**「零未处置
   pageerror」**（经 d 指纹过滤后断言零残余+过滤器计数>0 时上报可见——
   治理目标=噪声被处置，非噪声不存在）；锚定状态随修复票落定。二波终裁
   定宿主。

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

━━━ 证据补遗：probe.json 栈留存+PdfDocProvider 全文 ━━━
{
 "meta": {
  "script": "f-r3-probe.mjs",
  "date": "2026-09-02T01:45:22.759Z",
  "params": {
   "n": 1,
   "delayMs": 0,
   "rounds": 3,
   "closeMs": 120
  },
  "pdfjs": "4.10.38 (package.json invariants-checked)"
 },
 "pageErrors": [
  {
   "phase": "S2-open-close",
   "openSeq": 1,
   "msg": "Error: Worker was terminated",
   "firstLine": "    at ensureNotTerminated (file:///E:/class/%E6%99%BA%E6%85%A7%E6%B0%B4%E5%8A%A1/Synapse_remake/out/renderer/assets/pdf.worker.min-yatZIOMy.mjs:21:1365306)"
  }
 ],
 "phases": {
  "S0": {
   "rendered": true,
   "pageErrors": 0,
   "consoleErrors": 0
  },
  "S1": {
   "n": 1,
   "elapsedMs": 156,
   "pageErrors": 0,
   "consoleErrors": 0,
   "msgSamples": []
  },
  "S2": {
   "mode": "open→120ms→closeTab",
   "rounds": 3,
   "cycles": 3,
   "closeFail": 0,
   "elapsedMs": 629,
   "pageErrors": 1,
   "consoleErrors": 0
  },
  "S3": {
   "rendered": true,
   "spanCount": 260,
   "pageErrors": 0
  }
 }
}
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
