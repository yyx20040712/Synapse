你是终审门二（对抗式二审+独立复算）。对象=AUDIT-C C-1 F-R3 修票（轨二 c CorpusExtractor 失败终接）+主控两项裁决（轨一不升级/轨二 b 不采）。本包自包含（门一报告+主控处置+完整 diff+上游查证档案+补证据）——你无仓库访问，独立复算以包内数字/代码为准，不确定的明确说不。

# 门一报告（Kimi k3 一次命中 65s：3B/2W/0N，总评=PASS 条件性附记）

[门一全文见下方「=== 门一报告全文 ===」段]

# 主控对门一 2W 的处置（你逐条裁决 ADDRESSED / NOT ADDRESSED）

1. **W1（C 变异红证未覆盖同引用重抛+恰一次上限；接线层无锚）**：
   - 已补两项变异红证（主控直做，**定向子集口径=降档证据申报**，文件
     f-r3-fix-mut-supp-{a,b}.raw.txt——包内尾摘）：变异 A（`throw err`→
     `new Error(String(err))` 包装）→ 2 failed（`rejects.toBe(boom)` 同引用
     断言承载）；变异 B（destroy 双调）→ 2 failed（`destroyCalls===1` 上限
     承载）。还原 diff 空亲验。
   - 接线层（getDocument→settleLoadTask）无测试锚：**登记遗留池**（W 级
     观察项，档=f-r3-fix 收口段）——动态 import 桩需 vi.doMock 双 specifier
     （pdfjs-dist+?url worker 模块）成本不成比例；P6 实际风险面=提取加载
     失败（罕见路径）经 e2e corpus 链全量在跑（成功路径）；回退到裸
     `.promise` 的风险=代码审查面可见（票面+头注双声明）。
2. **W2（轨一证据包外不可核实；「零噪不可达」对「降噪」论证不完全）**：
   - 采纳档案动作：本包**全文补入 f-r3-upstream-check.md**（见下方段）——
     版本×修复面矩阵+逐 tag 核验记录可复现（raw.githubusercontent+tag）。
   - 「降噪 vs 零噪」论证差：主控补论证——升级（4.10.38→5.7.284 或 6.3.289）
     的降噪收益=消 devtools-only 噪声（用户路径零影响 6/6 健康在档——收
     益上限=纯开发体验）；代价=跨 major API 迁移评估+[dep-change]+ADR+
     INV-30/INV-16/P1 TextLayer 形状/30 e2e 全量重验（核心阅读链回归面）。
     收益/风险比悬殊是主因，「零噪不可达」是补充非主论据。**长期再评估钩
     子采纳**：升级触发条件备案=「上游 pdfManagerReady 悬尾族全消（终接
     catch 完备）时连同 destroy() 族硬化（claim 拒绝+_setupCapability）一并
     重评」——落 INV 增补文本。
3. **门一 E3（runExtraction finally 可达性包外）**：主控亲验补证据——
   runExtraction 结构=try{加载→循环提取→complete}catch{error 上报}finally
   {doc!==null→doc.destroy（尽力而为）+extracting=false}；加载成功后一切
   中途异常（含 sendChecked throw/页循环异常）必经 finally；doc.destroy 自身
   拒绝仅 console.warn 不阻断（状态机头注跨格序列②在案）。加载失败路径 doc
   恒 null→由 settleLoadTask 终接（本单修复）。**P6 关闭完整性=全路径覆盖**。

# 审计工单（门二四清单+一）

①处置核对：门一全 findings+主控处置 vs 包内证据（补变异红证真实红？upstream
档案与门一转述一致？）。②母本符合度：diff vs 票面（票面=简报③修法段内联在
diff 包头部）。③宪法红线终审：分层/受锁（tests 追加未动既有用例——diff 可
核）/行数/UTF-8/TDD 证据链四档（首红/绿/变异/verify——尾摘可核）。④机器面
核对：数字对账（1081 基线+3=1084；A3 同场+7=1091——两单先后独立 verify 均
exit=0；locks 233 两连）。⑤成本账本行：实现者 GLM5.3 统一档 1.94M tok/38
工具/761s；门一 kimi-main in=7422/out=3386/65s switches=0；门二=你（deepseek
按量）。

输出：[B|W|N] 逐条+统计+总评（PASS/FAIL/条件 PASS——条件须票内可销项）。用中文。

=== 上游查证档案全文（门一 W2 处置补入）===
# F-R3 轨一 e 上游查证档案（pdfjs worker 泵终接 catch 现状——修票第一步）

> 查证日=2026-09-02（AUDIT-C 二波修票场，主控亲验）。方法=raw.githubusercontent
> 按 tag 拉取 src/core/worker.js 与 src/display/api.js（代理 127.0.0.1:7890），
> 与本仓 4.10.38 本地 bundle（node_modules/pdfjs-dist/build/pdf.worker.mjs）
> 逐点对照；版本清单=registry.npmjs.org（5.x 全系=5.0.375~5.7.284，另有 6.x
> 至 6.3.289）。全部锚可复现（URL=raw 文件+tag）。

## 0. 本仓 4.10.38 逃逸点精确形状（对照基线——本地 bundle 实读）

pdf.worker.mjs:56629 链尾（setupDoc 内）：

```js
getPdfManager(data).then(function (newPdfManager) { ... }).then(pdfManagerReady, onFailure);
// 4.10.38 onFailure 首语句（:56585）：
function onFailure(ex) {
  ensureNotTerminated();   // Terminate 置位后必抛 Error("Worker was terminated")
  ...
}
```

机制链（实测 8/8 指纹的唯一汇聚点）：流加载窗内 destroy→Terminate 置位
→泵 readChunk 的 ensureNotTerminated 抛/AbortException→`pdfManagerCapability
.reject`→链上 onRejected=onFailure→**onFailure 自己首语句再抛**→
`.then(pdfManagerReady, onFailure)` 产生的链尾 promise 无人终接→worker 世界
unhandled rejection（经 CDP 汇入 pageerror 仪表通道）。

## 1. 版本×修复面矩阵（逐 tag 实读核验）

| 修复面 | 4.10.38（本仓） | 5.4.624 | 5.5.207 | 5.7.284（5.x 末） | 6.3.289（npm latest） | master |
| --- | --- | --- | --- | --- | --- | --- |
| onFailure 终接守卫（`if (terminated) return;` 替换首语句 `ensureNotTerminated()`） | ✗ | ✗ | **✓** | ✓ | ✓ | ✓ |
| destroy() 主动 claim `_capability.promise.catch(()=>{})`（"Loading aborted" 不外逸 unhandled） | ✗ | ✗ | ✗ | ✗ | **✓** | ✓ |
| destroy() `_setupCapability`（destroy 等设置链 settle——Terminate 保证经 WorkerTransport.destroy 下发） | ✗ | ✗ | ✗ | ✗ | **✓** | ✓ |
| requestLoadedStream 两处补 onRejected（DataLoaded 求流+recovery 求流） | ✗ | ✗ | ✗ | ✗ | **✓** | ✓ |
| pdfManagerReady 内 `loadDocument(false).then(onSuccess, 匿名 handler)` 悬尾（handler 首语句仍 ensureNotTerminated——Terminate 落初解析窗=同族 unhandled） | ✗ | ✗ | ✗ | ✗ | ✗ | **✗（未修——master 实读仍在）** |

关键 diff 证据（v5.4.624→v5.5.207 区间 worker.js **单处改动**即该修复）：

```diff
       function onFailure(ex) {
-        ensureNotTerminated();
+        if (terminated) {
+          return;
+        }
```

## 2. 结论（三态明确）

1. **上游已修本仓实测的逃逸主窗口**：落点=**v5.5.207**（区间 v5.4.624→
   v5.5.207，worker.js 单处 diff）——本仓 8/8 实测指纹（`Error: Worker was
   terminated`，全部产生于流加载窗内 destroy）的汇聚点 onFailure 被守卫。
2. **但未修全**：同族残余窗口（pdfManagerReady 悬尾——Terminate 落「初解析
   窗」或「manager-ready→pdfManagerReady 调用间隙」仍产生同消息 unhandled）
   在 **6.3.289 与 master 均未终接**（悬尾 promise 无 catch，master 实读）。
3. **destroy() 族硬化分散在 6.x**：claim 拒绝+`_setupCapability` 同步（含
   issue 16777 workerPort 关联注释）仅 6.3.289 起——5.x 全系（含 5.7.284）
   无。

## 3. 官方契约锚（门二 N3 遗留补齐——master src/display/api.js destroy() 文档注释原文）

> "Abort all network requests and destroy the worker."

master destroy() 并主动 claim 加载期拒绝（注释原文）："The setup chain
rejects `_capability` with 'Loading aborted' once the load-time chain unwinds
(see `getDocument`). Claim that rejection here so it isn't reported as
unhandled during the awaits below; callers awaiting `task.promise` still see
it."——上游官方立场：**destroy 对加载中=中止语义，且官方自认该链拒绝需
显式 claim 才不外逸 unhandled**（本仓 4.10.38 无此 claim，与本仓实锤同族）。

## 4. 裁决输入（主控终裁=见 f-r3-fix 票面+门审链）

- 升级至 5.7.284=消实测主窗口（devtools-only 噪声）；至 6.3.289=另获 destroy
  族硬化。但任一档位**均不能承诺「零同族噪声」**（§1 末行悬尾在 master 未修）
  ——票面「消除」目标在现有全部上游版本不可达，只可「主窗口消除」。
- 升级成本面=[dep-change]+ADR+跨 major API 迁移评估+INV-30/INV-16/P1
  TextLayer 形状/30 e2e 用例全量重验（宪法依赖纪律）。
- 不升级成本面=devtools 噪声维持（用户路径零影响，6/6 健康在档）+主进程
  level1 代理计数监控备案（r7 实证可收）。

=== 门一报告全文 ===
[routing]: run=20260902042905-iy8b source=kimi-main model=kimi-k3 switches=0 usage=in=7422,out=3386 latency=65031ms (by ds-call.mjs 链)

# 门一审计报告——AUDIT-C C-1 F-R3 修票 + 主控两项裁决

---

## A. 母本符合度 —— [B]

- **settleLoadTask 契约三径逐字落地**（CorpusExtractor.ts:191-197）：
  ```ts
  try { return await task.promise }
  catch (err) { await task.destroy().catch(() => undefined); throw err }
  ```
  成功透传不调 destroy ✓；失败 destroy 恰一次 ✓；destroy 拒绝吞并（`.catch(()=>undefined)`）后 `throw err` 原引用重抛 ✓。
- **三径被测试逐径锚定**（test:276-303）：三用例一一对应，含同引用断言（`rejects.toBe(boom)`，强于同消息）。
- **接线零行为变更**：成功路径 `return await task.promise` 透传，doc.destroy 归 runExtraction finally 语义未动（:212-213）。
- **头注状态机表如实**：:31 原证伪格拆为双路径两行（加载失败=loadingTask.destroy 加载器内终接 / invoke 折叠+提取异常=doc.destroy 归 finally），跨格序列②同步改写「两面不阻断」，与实现一致。
- 「不做」清单（runExtraction/防御分支/PdfDocProvider/序列化/e2e）diff 中零触碰 ✓。

## B. 宪法红线 —— [B]

- CorpusExtractor.ts 现 311 行 <500（报告 wc -l 实测，diff 增量 +39/-3 与规模自洽）；测试件 304 行，报告声明 tests/** max-lines 豁免——豁免条款在包外，**不确定**，但循既有惯例可信。
- 无新依赖（diff 仅两文件+manifest）；分层无污染（renderer 内纯函数）。
- 受锁面：测试件 diff 仅两块（@@ -1,11 +1,13 @@ imports / @@ -252,3 +254,51 @@ 文末追加），**既有用例零触碰**；唯一既有行改动=RenderCanvas import 行加尾逗号（import 重组副产物，非用例语义）。manifest 4 行哈希更新与 locks:apply 一致（verify locks=233 绿）。

## C. 代码与测试质量 —— [W]

1. **变异红证覆盖不全**：变异（destroy 调用→`Promise.resolve()`）仅击中两个失败路径用例的 `destroyCalls===1` 断言，证明「destroy 被调」承载真实；但 ①「重抛原错误**同引用**」断言（`rejects.toBe(boom)`）未经变异红证——若实现改为 `throw new Error(...)` 包装，无变异数据证明测试会红；②「恰一次」上限（destroy 调两次是否红）未证。断言形态本身（`toBe(1)`）具备该能力，属证据链缺口而非断言缺失。
2. **loadPdfDocument 接线无测试锚**：三用例直锚 settleLoadTask 纯函数，「getDocument→settleLoadTask」接线（:211-213）本身无用例——若接线回退为 `return getDocument(url).promise`，全部测试仍绿。getDocument 模块内消费难以结构桩注入，缺口可理解，但 P6 病灶正是接线层句柄丢弃，**建议后续单补接线形态锚**（或 e2e/集成层）。
3. 「成功路径不调 destroy」断言对生产语义覆盖充分：settleLoadTask 成功路径结构上无 destroy 调用点，断言与实现同构，无恒真风险。
4. cast 形态 `as unknown as Promise<PdfjsDocumentLike>` 循简报指定，T 由 task 推断，收窄合理。
5. 与 PdfDocProvider「句柄在册+cleanup destroy」语义一致：失败=就地终接、成功=所有权移交调用方 finally，生命周期单一持有者。
6. 次要观察（不定级）：`await task.destroy()` 若 hang，原错误将无限期不可达——票面契约即如此（"destroy 后重抛"），实现合规；pdfjs destroy 通常即决，风险低，备案。

## D. 报告诚实性 —— [B]

- 自裁 2 项（头注接口层 :42 段登记 settleLoadTask + 测试面 :71 段登记 + loadPdfDocument 注释一行 + locks:apply）vs diff：逐句可对应，**无未申报改动**。
- 数字对账自洽：红 1081+3 失败=1084、绿 1084、变异 1084（mutation 文件尾摘为还原复跑段，报告已注明「同上文件（追加段）」，非伪造）；首红 2 Unhandled Rejection 在 §3 主动披露并解释成因（实现缺失时 reject 桩无人接），绿后消失实证。
- 用例计数「基线 1081+新 3=1084」与简报预期一致，diff stat（87+/10-）与报告 §2 文件清单一致。

## E. 接缝与后续单 —— [W]

1. **轨一不升级——证据不可核实+论证目标偏移（可攻击点）**：裁决核心实锤（v5.5.207 onFailure 终接守卫=8/8 指纹逃逸汇聚点、单处 diff、残余窗口 6.3.289/master 未修）全部在**包外档案 f-r3-upstream-check.md，本包零证据**——明确说不确定，无法独立复核。论证结构上的弱点：裁决以「任一升级档位不能承诺**零**同族噪声」否定升级，但若目标是「**降**噪」而非「零噪」，消除 8/8 指纹主逃逸点本身仍有价值——残余 pdfManagerReady 悬尾与主指纹的**相对量级未量化**，「不可达零噪声」不构成「不降噪」的完整论据。不过反向面（跨 major 回归面 INV-30/INV-16/TextLayer/30 e2e 重验 vs devtools-only 噪声、用户路径零影响 6/6 在档）权重确实悬殊，**裁决结论可维持，但建议主控将 f-r3-upstream-check.md 证据补入档**，并把「降噪收益量化」留为长期再评估钩子。
2. **轨二 b 不采——[B] 内嵌**：机理准确（await 旧 destroy 不改噪声本体、引入串行切换确定代价），在轨一已接受噪声的前提下 b 无独立收益，逻辑自洽，未见漏洞。
3. **P6 泄漏面关闭完整性**：本修法关闭了「加载失败」丢弃点——worker-per-task 事实下 destroy 为唯一终止口，settleLoadTask 覆盖 getDocument 之后所有拒绝路径（Promise.all 失败时 task 未创建无泄漏；getDocument 同步抛同理）。**残余不确定**：成功路径的 doc.destroy 归 runExtraction finally——runExtraction 代码在本包外，finally 是否对所有中途异常路径可达无法核实（头注如此声称，本包无反证）。建议后续单对 runExtraction finally 可达性做一次性核对即永久关闭 P6。
4. **上游残余窗口长期风险**：4.10.38 冻结+主进程 level1 代理计数监控备案是合理缓释；风险=监控阈值失效时噪声回归无预警——属既有备案面，非本单新债。

---

## 统计

**3B / 2W / 0N**

| 项 | 级 |
|---|---|
| A 母本符合度 | B |
| B 宪法红线 | B |
| C 代码与测试质量 | W（变异红证未覆盖同引用重抛断言；接线层无测试锚） |
| D 报告诚实性 | B |
| E 接缝与裁决 | W（轨一证据包外不可核实+「零噪不可达」论证对降噪目标不完全） |

## 总评

**PASS（条件性附记）**。修票本体与票面逐字符合、测试三径锚定、报告零未申报改动，两项 W 均不阻断收口：C 项缺口（接线无锚/变异红证不全）建议登记后续单补锚；E 项轨一裁决结论维持，但主控应将 f-r3-upstream-check.md 实锤补入本档，否则「查证实锤」对后续门审不可复核。
=== diff+证据包 ===
diff --git a/src/renderer/features/reader/CorpusExtractor.ts b/src/renderer/features/reader/CorpusExtractor.ts
index b7e3a8c7a..6994f0740 100644
--- a/src/renderer/features/reader/CorpusExtractor.ts
+++ b/src/renderer/features/reader/CorpusExtractor.ts
@@ -28,19 +28,23 @@
  *   | extracting | fulltext 页数据就绪 | extracting | sendItem fulltext，await ack 后再取下页（背压） |
  *   | extracting | figure 就绪（页快照/anno 裁剪） | extracting | sendItem figure 同上背压 |
  *   | extracting | 篇毕（末页 ack 完成） | →done | sendItem complete；destroy；→idle |
- *   | extracting | 文档加载失败/invoke 折叠错误/提取异常 | →failed | sendItem error+reason；destroy（失败也释放）；→idle |
+ *   | extracting | 文档加载失败 | →failed | sendItem error+reason；loadingTask.destroy 在加载器内终接清理——worker 线程不泄漏（F-R3）；→idle |
+ *   | extracting | invoke 折叠错误/提取异常 | →failed | sendItem error+reason；doc.destroy 归 finally——失败也释放；→idle |
  *   | extracting | 第二 extract-request 到达 | extracting（忽略） | 防御分支——main 编排保证串行（上一篇 complete/error 后才发下一篇），该分支仅防事件重发；sessionId 不同=日志+忽略 |
  *   | done/failed | （瞬时态） | →idle | 上报后立即回 idle（无驻留终态——终态语义在 main 侧会话） |
  *   跨格序列（审计面）：①篇失败→error 上报→idle→main 下一篇请求正常接续
- *   ②destroy 失败不阻断（尽力而为+console 日志，无 UI 面——文档对象已 detach
- *   即可）③全链多篇=extracting↔idle 交替，无跨篇状态残留
+ *   ②destroy 两面不阻断：加载失败面=loadingTask.destroy 自身拒绝被终接吞并
+ *   （原错误优先重抛——F-R3）；提取面=doc.destroy 尽力而为+console 日志（无
+ *   UI 面——文档对象已 detach 即可）③全链多篇=extracting↔idle 交替，无跨篇状态残留
  *
  * ── 接口层 ──
  * - export function createCorpusExtractor(deps): CorpusExtractor（deps 注入
  *   loadDocument/sendItem/createCanvas——测试桩面，模块零 window/pdfjs 静态
  *   依赖；生产组装=useExportCorpusEvents（AI-04），pdfjs 经 lazy dynamic
  *   import）；export const EXPORT_SNAPSHOT_SCALE；export function
- *   cropBoxPixels(rects, width, height)（裁剪包围盒纯数学——单测锚）
+ *   cropBoxPixels(rects, width, height)（裁剪包围盒纯数学——单测锚）；
+ *   export function settleLoadTask(task)（loadingTask 失败终接纯函数——单测锚，
+ *   F-R3：加载失败即 destroy 后重抛，worker 线程不泄漏）
  * - corpusItemReq 载荷契约=schemas.ts corpusItemReqSchema（四 kind 判别联合，
  *   单源——本模块不重复声明形状）
  * - pdfjs-dist 运行时 import 白名单第三成员（INV-16——白名单=PdfCanvas/
@@ -64,7 +68,7 @@
  *   本模块无独立 UI 面
  * - 测试：tests/unit/renderer/corpus-extractor.test.ts：多页页序/背压 max
  *   in-flight/anno 分页匹配与裁剪数学/failed 跨格接续/加载失败/destroy 尽力
- *   而为/防御分支/事件契约三面
+ *   而为/防御分支/事件契约三面/settleLoadTask 失败终接三径（F-R3）
  * - 完成后：删除 STUB → npm run verify 绿 → 人工审查 git diff → 翻 registry
  */
 import type { Result } from '../../../shared/app-error'
@@ -171,11 +175,33 @@ function createDomCanvas(width: number, height: number): RenderCanvas {
 /** worker 只配一次（与 PdfCanvas 模块级设置同值幂等——两消费点独立初始化均安全） */
 let workerConfigured = false
 
+/** pdfjs loadingTask 形状契约（终接清理面——生产=PDFDocumentLoadingTask） */
+export interface PdfjsLoadTaskLike<T> {
+  readonly promise: Promise<T>
+  destroy(): Promise<void>
+}
+
+/**
+ * 取 settle 后文档；加载失败即销毁 loadingTask（终止其专属 worker 线程）后
+ * 原样重抛——失败路径 task 句柄不可达则 worker 泄漏（F-R3 排查 P6 实锤）。
+ * 成功路径不调 destroy（doc.destroy 归 runExtraction finally——与
+ * PdfDocProvider 句柄生命周期语义一致）；destroy 自身拒绝被吞并（原错误优先）。
+ */
+export async function settleLoadTask<T>(task: PdfjsLoadTaskLike<T>): Promise<T> {
+  try {
+    return await task.promise
+  } catch (err) {
+    await task.destroy().catch(() => undefined)
+    throw err
+  }
+}
+
 /**
  * 生产文档加载器（pdfjs lazy 动态 import——调用时才加载，测试注入桩不触发；
  * pdfjs-dist 白名单第三成员的运行时消费点 INV-16）。worker 必须先配置：
  * 未打开过 PDF 时 PdfCanvas 未加载，pdfjs 会回退默认 worker 路径（出网
  * 风险——CSP 拦截后提取失败）；worker 本地打包与 PdfCanvas 同源（ADR-0002）。
+ * 加载失败经 settleLoadTask 终接 loadingTask（F-R3——失败也终止 worker）。
  */
 export async function loadPdfDocument(url: string): Promise<PdfjsDocumentLike> {
   const [{ getDocument, GlobalWorkerOptions }, workerModule] = await Promise.all([
@@ -186,7 +212,8 @@ export async function loadPdfDocument(url: string): Promise<PdfjsDocumentLike> {
     GlobalWorkerOptions.workerSrc = (workerModule as { default: string }).default
     workerConfigured = true
   }
-  return getDocument(url).promise as unknown as PdfjsDocumentLike
+  const task = getDocument(url)
+  return settleLoadTask(task) as unknown as Promise<PdfjsDocumentLike>
 }
 
 export function createCorpusExtractor(deps: {
diff --git a/tests/unit/renderer/corpus-extractor.test.ts b/tests/unit/renderer/corpus-extractor.test.ts
index 28680b09e..239a14a00 100644
--- a/tests/unit/renderer/corpus-extractor.test.ts
+++ b/tests/unit/renderer/corpus-extractor.test.ts
@@ -1,11 +1,13 @@
-import { expect, it } from 'vitest'
+import { describe, expect, it } from 'vitest'
 import {
   createCorpusExtractor,
   cropBoxPixels,
   EXPORT_SNAPSHOT_SCALE,
   type PdfjsDocumentLike,
+  type PdfjsLoadTaskLike,
   type PdfjsPageLike,
-  type RenderCanvas
+  type RenderCanvas,
+  settleLoadTask
 } from '../../../src/renderer/features/reader/CorpusExtractor'
 import {
   extractRequestEventSchema,
@@ -252,3 +254,51 @@ guardedDescribe('SR2-AI-02', 'CorpusExtractor —— 全文/图提取器（四
     expect(ctx.sent.at(-1)?.kind).toBe('complete')
   })
 })
+
+// F-R3（AUDIT-C C-1 轨二 c）：loadingTask 失败终接纯函数三径——always-active
+// （不进 guardedDescribe——新用例恒跑；桩=接口结构桩无 mock 库，循既有件风格）
+describe('F-R3 settleLoadTask —— loadingTask 加载失败终接（worker 线程不泄漏）', () => {
+  interface TaskStub<T> extends PdfjsLoadTaskLike<T> {
+    destroyCalls: number
+  }
+
+  function taskStub<T>(
+    promise: Promise<T>,
+    destroyBehavior: () => Promise<void> = () => Promise.resolve()
+  ): TaskStub<T> {
+    const stub: TaskStub<T> = {
+      promise,
+      destroyCalls: 0,
+      destroy() {
+        stub.destroyCalls += 1
+        return destroyBehavior()
+      }
+    }
+    return stub
+  }
+
+  it('成功路径：透传 resolve 原值+destroy 未被调用', async () => {
+    const doc = { numPages: 1 }
+    const task = taskStub(Promise.resolve(doc))
+    const settled = await settleLoadTask(task)
+    expect(settled).toBe(doc)
+    expect(task.destroyCalls).toBe(0)
+  })
+
+  it('失败路径：重抛原错误（同引用）+destroy 恰一次', async () => {
+    const boom = new Error('bad url')
+    const task = taskStub(Promise.reject(boom))
+    await expect(settleLoadTask(task)).rejects.toBe(boom)
+    expect(task.destroyCalls).toBe(1)
+  })
+
+  it('失败且 destroy 自身 reject：仍重抛原错误（destroy 错误被吞并不覆盖）', async () => {
+    const boom = new Error('加载失败（原始错误）')
+    const task = taskStub(
+      Promise.reject(boom),
+      () => Promise.reject(new Error('destroy 自身失败'))
+    )
+    await expect(settleLoadTask(task)).rejects.toBe(boom)
+    expect(task.destroyCalls).toBe(1)
+  })
+})

=== locks/manifest.json diff（哈希面，仅示变更行数）===
 locks/manifest.json | 4 ++--
 1 file changed, 2 insertions(+), 2 deletions(-)

=== 实现者报告全文 ===
# F-R3 轨二 c 实现报告——CorpusExtractor 加载失败路径补 destroy（闭 P6 worker 泄漏）

> 单号=F-R3（AUDIT-C 二波修票场，票面母本=f-r3-fix-brief.md）。
> 实现者=GLM5.3flash 档子代理（环境无 model 参数=统一档欠账已知，任务书预声明）。
> 全部数字经实跑脚本输出落盘核对，无凭印象值。

## 0. 开工记录（技能清点——宪法会话开工纪律）

| 技能 | 用/不用 | 理由 |
| --- | --- | --- |
| test-driven-development | 用 | 本单核心纪律：首红→实现→绿→断言级变异红证→还原 |
| verification-before-completion | 用 | 收口 npm run verify 真退出码落盘（PIPESTATUS[0]，非管道尾） |
| systematic-debugging | 不用 | 缺陷根因已由 F-R3 排查票实锤（P6），照主控裁决实现，无调试面 |
| subagent-driven-development | 不用 | 本体即实现者子代理，无派发面 |
| javascript-testing-patterns | 不用 | 桩风格已由受锁测试件锁定（接口结构桩/无 mock 库），循既有件 |
| git 类技能 | 不用 | 禁 git add/commit/push（主控收口单写者纪律） |

配置自查：PATH 前导 node v25 漂移坑已按任务书规避（一切 node/npm 前
`export PATH=/d/nodejs24:$PATH`；实跑 sqlite-abi 绑定=v24 的 v137 ABI）。

## 1. 实现摘要

按主控裁决三件落地（契约逐字照 f-r3-fix-brief.md §③）：

1. **新导出纯函数**：`PdfjsLoadTaskLike<T>` 接口（promise+destroy 形状契约）+
   `settleLoadTask<T>(task)`——成功=透传 resolve 且不调 destroy；失败=
   `await task.destroy().catch(() => undefined)`（destroy 恰一次、其自身拒绝
   吞并）后原样重抛。放置于 loadPdfDocument 前（模块级，单测锚）。
2. **loadPdfDocument 接线**：`const task = getDocument(url)` →
   `return settleLoadTask(task) as unknown as Promise<PdfjsDocumentLike>`
   （cast 形态循简报指定；成功路径行为零变——doc.destroy 归 runExtraction
   finally 语义不变）。
3. **头注状态机表修正**：原 :31 单行「文档加载失败/invoke 折叠错误/提取异常
   →failed；destroy（失败也释放）」拆为如实双路径两行（加载失败=
   loadingTask.destroy 在加载器内终接清理——worker 线程不泄漏；invoke 折叠
   错误/提取异常=doc.destroy 归 finally——失败也释放）；跨格序列②同步改写
   为「destroy 两面不阻断」（加载失败面=loadingTask.destroy 自身拒绝被终接
   吞并、原错误优先重抛；提取面=doc.destroy 尽力而为+console 日志）。

「不做」清单（简报③条4）全部遵守：不动 runExtraction/不动事件防御分支/
不动 PdfDocProvider/不加 destroy 序列化（轨二 b 另裁）/不动 e2e。

## 2. 文件清单（diff 范围自查——git diff --stat 实测）

```
 locks/manifest.json                             |  4 +-
 src/renderer/features/reader/CorpusExtractor.ts | 39 +++++++++++++++---
 tests/unit/renderer/corpus-extractor.test.ts    | 54 ++++++++++++++++++++++++-
 3 files changed, 87 insertions(+), 10 deletions(-)
```

- `src/renderer/features/reader/CorpusExtractor.ts`（非受锁）：+settleLoadTask/
  PdfjsLoadTaskLike/接线/头注三处修正。现 311 行（wc -l 实测；<500，lint+quality
  实证过）。测试件现 304 行（wc -l 实测；tests/** max-lines 豁免面）。
- `tests/unit/renderer/corpus-extractor.test.ts`（受锁，主控已解锁）：改动
  严格限于 ①vitest import 追加 describe ②named import 追加 settleLoadTask+
  type PdfjsLoadTaskLike（RenderCanvas 行加尾逗号）③文末追加 always-active
  新 describe（**禁 guardedDescribe 遵守**，直接 describe/it）。既有用例
  零触碰（git diff 亲验：仅 @@ -1,11 +1,13 @@ 与 @@ -252,3 +254,51 @@ 两块）。
- `locks/manifest.json`：locks:apply 重生成（本单测试文件新 sha 入册）。
  无删减面（纯增量，无既有行删除——测试件 -1 行=import 行尾逗号改写，
  CorpusExtractor -3 行=状态机表 :31 单行拆双行+跨格序列②原 2 行替换）。

## 3. TDD 证据链（.raw.txt 全部入 scripts/audits/）

| 阶段 | 文件 | 实测结果 |
| --- | --- | --- |
| 首红（实现缺失红） | f-r3-fix-red.raw.txt | `3 failed \| 1081 passed (1084)`，exit=1——三用例全红（settleLoadTask 未导出，esbuild 转译运行时 undefined→TypeError）。附 2 个 Unhandled Rejection=实现缺失时 reject 桩无人接的副产物（红形态可接受，见 §7） |
| 实现→绿 | f-r3-fix-green.raw.txt | `126 passed (126)` / `1084 passed (1084)`，exit=0，零 Unhandled/零 Errors（首红副产物随实现消失实证） |
| 断言级变异红证 | f-r3-fix-mutation.raw.txt | 变异=catch 分支 `await task.destroy().catch(() => undefined)` → `await Promise.resolve()`（保 await 结构最小变异）→ `2 failed \| 1082 passed (1084)`——**精确击中两个失败路径用例**（`AssertionError: expected +0 to be 1` ×2=destroyCalls 断言），成功路径用例仍绿（非误伤） |
| 变异还原 | 同上文件（追加段） | cp 备份法（备份至 /tmp，未用 git checkout）→ `diff` 空（restore verified）→ 复跑 `1084 passed (1084)` |
| verify 收口 | f-r3-fix-verify.raw.txt | `npm run verify` **exit=0**（PIPESTATUS[0] 实测）——quality（无占位/乱码/跨域）+tickets（注册表与代码一致）+locks（**233** 个受锁文件与 manifest 一致，与简报基线一致）+lint+typecheck+test（126 文件/1084 用例）+build 全过 |

用例计数对账：基线 1081 + 新增 3 = **1084**，与简报⑤预期完全一致（实测值）。
本测试件现 13 用例（原 10+新 3）。

## 4. 新增测试三用例（契约=简报③测试节逐条）

1. **成功路径**：透传 resolve 原值（同引用 toBe）+`destroyCalls===0`。
2. **失败路径**：重抛原错误（**同引用** rejects.toBe——强于同消息）+
   `destroyCalls===1`（恰一次）。
3. **失败且 destroy 自身 reject**：仍重抛**原**错误（destroy 错误被吞并不
   覆盖）+`destroyCalls===1`。

桩=接口结构桩（TaskStub extends PdfjsLoadTaskLike+destroyCalls 计数器），
无 mock 库；三用例零 setTimeout（纯 promise 微任务）——均循简报约束。

## 5. 自裁申报（超票面微决定，均为文档同步非行为面）

1. **接口层导出面清单登记 settleLoadTask**（头注 ：42 段追加一句）+**文化层
   测试面登记「settleLoadTask 失败终接三径」**（:71 段追加）+loadPdfDocument
   头注补一行「加载失败经 settleLoadTask 终接」。理由：本票病灶即「文档与
   实现不符」（状态机表被 P6 证伪），新增导出若不登记导出面清单=制造同类新
   债；属简报③条3「注释可微调」维度的最小同步。**行为面零改。**
2. **locks:apply**：宪法「受锁文件修改后即时 apply 重锁+更新 manifest」——
   verify 的 locks:check 做磁盘 sha 对账，不 apply 则 verify 必红（check-locks.mjs
   实读确认）；主控收口核对 locks=233 与简报基线一致。
3. 其余无。无删减面；无新依赖；无 tickets/registry 触碰；无 git add/commit。

## 6. 疑虑（供门审/主控复核）

1. **无**（行为面疑虑零——契约逐字照主控裁决，cast 形态循简报指定
   `as unknown as Promise<PdfjsDocumentLike>`；vite build 两条 dynamic-import
   chunk 警告为改动前既有形态，非本单引入）。
2. 备忘：build 产物 `pdf.worker.min-yatZIOMy.mjs` 与 F-R3 排查报告 §2 引用的
   worker 资产同 hash（yatZIOMy）——资产源未随本单变化。

=== 证据文件尾摘（首红/绿/变异/verify 各最后 12 行）===
--- f-r3-fix-red.raw.txt (tail) ---
[31mThe latest test that might've caused the error is "[1mtests/unit/renderer/corpus-extractor.test.ts[22m". It might mean one of the following:
- The error was thrown, while Vitest was running this test.
- If the error occurred after the test had been completed, this was the last documented test before it was thrown.[39m
[31m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[39m

[2m Test Files [22m [1m[31m1 failed[39m[22m[2m | [22m[1m[32m125 passed[39m[22m[90m (126)[39m
[2m      Tests [22m [1m[31m3 failed[39m[22m[2m | [22m[1m[32m1081 passed[39m[22m[90m (1084)[39m
[2m     Errors [22m [1m[31m2 errors[39m[22m
[2m   Start at [22m 12:18:33
[2m   Duration [22m 36.40s[2m (transform 12.67s, setup 0ms, collect 54.11s, tests 14.38s, environment 474.89s, prepare 79.96s)[22m

exit=1
--- f-r3-fix-green.raw.txt (tail) ---
 [32m✓[39m tests/unit/db/connection.test.ts [2m([22m[2m5 tests[22m[2m)[22m[90m 24[2mms[22m[39m
 [32m✓[39m tests/unit/ipc/reader.test.ts [2m([22m[2m1 test[22m[2m)[22m[90m 4[2mms[22m[39m
 [32m✓[39m tests/unit/ipc/enrich.test.ts [2m([22m[2m1 test[22m[2m)[22m[90m 2[2mms[22m[39m
 [32m✓[39m tests/unit/ipc/tags.test.ts [2m([22m[2m1 test[22m[2m)[22m[90m 3[2mms[22m[39m
 [32m✓[39m tests/unit/ipc/notes.test.ts [2m([22m[2m1 test[22m[2m)[22m[90m 3[2mms[22m[39m

[2m Test Files [22m [1m[32m126 passed[39m[22m[90m (126)[39m
[2m      Tests [22m [1m[32m1084 passed[39m[22m[90m (1084)[39m
[2m   Start at [22m 12:20:28
[2m   Duration [22m 26.62s[2m (transform 12.18s, setup 0ms, collect 49.22s, tests 14.18s, environment 305.29s, prepare 72.36s)[22m

exit=0
--- f-r3-fix-mutation.raw.txt (tail) ---
 [32m✓[39m tests/unit/ipc/enrich.test.ts [2m([22m[2m1 test[22m[2m)[22m[90m 3[2mms[22m[39m
 [32m✓[39m tests/unit/ipc/tags.test.ts [2m([22m[2m1 test[22m[2m)[22m[90m 3[2mms[22m[39m
 [32m✓[39m tests/unit/ipc/notes.test.ts [2m([22m[2m1 test[22m[2m)[22m[90m 4[2mms[22m[39m
 [32m✓[39m tests/unit/db/repos/collections.repo.test.ts [2m([22m[2m3 tests[22m[2m)[22m[90m 20[2mms[22m[39m
 [32m✓[39m tests/unit/db/connection.test.ts [2m([22m[2m5 tests[22m[2m)[22m[90m 18[2mms[22m[39m

[2m Test Files [22m [1m[32m126 passed[39m[22m[90m (126)[39m
[2m      Tests [22m [1m[32m1084 passed[39m[22m[90m (1084)[39m
[2m   Start at [22m 12:22:41
[2m   Duration [22m 27.00s[2m (transform 11.90s, setup 0ms, collect 49.62s, tests 14.69s, environment 308.46s, prepare 73.94s)[22m

restore-exit=0
--- f-r3-fix-verify.raw.txt (tail) ---
(!) E:/class/智慧水务/Synapse_remake/node_modules/pdfjs-dist/build/pdf.mjs is dynamically imported by E:/class/智慧水务/Synapse_remake/src/renderer/features/reader/CorpusExtractor.ts but also statically imported by E:/class/智慧水务/Synapse_remake/src/renderer/features/reader/PdfDocProvider.tsx, E:/class/智慧水务/Synapse_remake/src/renderer/features/reader/PdfPageCanvas.tsx, E:/class/智慧水务/Synapse_remake/src/renderer/features/reader/TextLayer.tsx, dynamic import will not move module into another chunk.
[39m
[1m[33m[plugin:vite:reporter][39m[22m [33m[plugin vite:reporter] 
(!) E:/class/智慧水务/Synapse_remake/node_modules/pdfjs-dist/build/pdf.worker.min.mjs?url is dynamically imported by E:/class/智慧水务/Synapse_remake/src/renderer/features/reader/CorpusExtractor.ts but also statically imported by E:/class/智慧水务/Synapse_remake/src/renderer/features/reader/PdfDocProvider.tsx, dynamic import will not move module into another chunk.
[39m
rendering chunks...
[2m../../out/renderer/[22m[32mindex.html                          [39m[1m[2m    0.88 kB[22m[1m[22m
[2m../../out/renderer/[22m[32massets/pdf.worker.min-yatZIOMy.mjs  [39m[1m[2m1,375.84 kB[22m[1m[22m
[2m../../out/renderer/[22m[35massets/index-BnbUs7aC.css           [39m[1m[2m   44.34 kB[22m[1m[22m
[2m../../out/renderer/[22m[36massets/index-R79Ordj3.js            [39m[1m[33m1,306.92 kB[39m[22m
[32m✓ built in 1.70s[39m
exit=0

=== F-R3 门一 W1 补变异红证（主控直做，定向子集口径=降档证据申报）===
--- 变异A（throw err→包装重抛）: 2 failed（同引用 rejects.toBe 断言承载）---
[2m Test Files [22m [1m[31m1 failed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[31m2 failed[39m[22m[2m | [22m[1m[32m11 passed[39m[22m[90m (13)[39m
[2m   Start at [22m 12:45:54
[2m   Duration [22m 4.75s[2m (transform 78ms, setup 0ms, collect 178ms, tests 4.07s, environment 0ms, prepare 175ms)[22m

exit=0
--- 变异B（destroy 双调）: 2 failed（恰一次 toBe(1) 断言承载）---
[2m      Tests [22m [1m[31m2 failed[39m[22m[2m | [22m[1m[32m11 passed[39m[22m[90m (13)[39m
[2m   Start at [22m 12:46:09
[2m   Duration [22m 4.80s[2m (transform 82ms, setup 0ms, collect 180ms, tests 4.11s, environment 0ms, prepare 155ms)[22m

exit=0
