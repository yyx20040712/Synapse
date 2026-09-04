# F-A8 门 0 前置票 ·门二终审材料包（deepseek v4flash,零仓库接触）

你是终审官。审 F-A8 门 0（重锚项几何族前置票——locateQuote 核提取+verifyQuoteItem+resolveAnnotationRectsItem 纯域版,门 2 主链切换的地基票）终位。已过门一 Kimi K3 PWW（4W2N）+回炉一轮闭合。

## 1. 上游与票面（一句话）

F-A8=AnnotationLayer 重锚域同族化（设计链三跳毕——Kimi 拟定 A+C1/deepseek ENDORSE CR×4/GLM5.3 终裁,终裁版设计书在档）。门 0=纯函数域前置票：locateQuote 提取（verifyQuote 行为零变）+verifyQuoteItem（items 域对账）+resolveAnnotationRectsItem（S0~S3b 纯域版,门 2 接线）。

## 2. 门一 findings+主控处置（①处置核对清单）

- W1 打分核 tie-break 分支零用例→**回炉已补**：tie-break 正反双向（同分取近）+打分序（2 分远胜 1 分近）三用例;变异红证 tie-break 翻转→双用例红（打分序用例不红=独立锁）。
- W2 等价性人工核读→**回炉已补机械锁定**：verifyQuoteItem 偏移 vs buildItemOffsets.spans 全表对账用例（空串穿插+spans 衔接+total 锚+逐项原位命中）。
- W3 「消取整差」措辞过强→**回炉已降级**：水平轴严格约除/垂直轴 ~1px 级有界残差（门一数学对账②口径）;报告自裁⑤同步勘误。
- W4 裁决③管线替换未申报→**主控追认**（裁决③后半句「直接复用导出面,禁第二份归一化实现」的兑现形态）;报告自裁清单已补记。
- N1 fullTextOf 提前求值→**回炉已修**：verifyQuote 空 quote 前置守卫（触达面还原,行为零变;locateQuote 内同检查保留=verifyQuoteItem 路径双防线）。
- N2 rotate 归一化口径疑→**主控源码裁决排除**：viewportTransformFor:98 自行同式归一化（((r%360)+360)%360）——传原始 rotate 一致;非 90 倍数抛错由 try 兜。

## 3. 机器面数字（④核对基准——真退出码在档）

- 基线（F-A7 终态）：verify 154 文件/1329 用例/locks 277。
- 门 0 终态：**155 文件/1345 用例/locks 278**（+1 新测试件 anchor-item-verify.test.tsx;+16 用例[12 首轮+4 回炉]）;回炉后实现者 verify exit=0+主控独立亲验（f-a8-gate0-final-verify.raw.txt——数字见本包提交时在档,回炉前主控亲验 155/1341/278 exit=0 在档）。
- locks：新测试件 sha 入 manifest（277→278）;anchor-serialize/annotation-resolve 非 pre-lock 面仅 manifest 计数变。
- registry：F-A8 open 不变（阶段票——门 0 毕仅注记,阶段门 1~3 待后续票;翻 done 推演不适用本票）。

## 4. 实现者报告回炉补记全文（§11）

## 11. 回炉一轮补记（2026-09-04，门一 Kimi K3 PWW 裁决）

主控处置：回炉一轮 4 项（W1/W2/W3/N1）+W4 追认补记；N2 主控源码裁决排除
（viewportTransformFor:98 自行同式归一化——传原始 rotate 一致，零改动）。

- **W1 tie-break 用例（毕）**：oracle 补 3 用例——同分 tie-break 正反双
  向（双锚全空 score 同 3、距原偏移一近一远 → 取近者；正向近=第一处
  出现 expect 1/反向近=第二处出现 expect 5）+打分序锁定（2 分远位 dist10
  胜 1 分近位 dist0 → score 优先于距离）。新用例对现行码**直接绿**
  （tie-break 分支=locateQuote 迁移零变既有行为）——属「补防线」非「修
  缺陷」，绿为预期，如实申报；变异红证补：tie-break 翻转
  （`dist < bestDist`→`dist > bestDist`）→ W1 正反双用例红（2 failed，
  exit=1；打分序用例不红=score 分层独立锁），cp 备份法 diff 空还原
  （f-a8-gate0-rework1-mut-tiebreak.raw.txt 在档）。
- **W2 机械对账测试（毕）**：新 describe「verifyQuoteItem 偏移口径与
  buildItemOffsets.spans 机械对账」——items 含空串穿插（5 项 3 非空），
  断言 spans 表结构（3 条/首 start=0/相邻衔接/total=末 end）+对每非空项
  verifyQuoteItem({quote:该 str, prefix:'', suffix:'', start:spans[i].start})
  ===spans[i].start（原位命中 ⇔ 偏移表↔拼接文本全表一致——原人工核读
  机器锁定）。测试文件 .tsx import buildItemOffsets 走 web 程序先例无碍
  （主控裁定口径）。对现行码直接绿（同补防线预期）。
- **W3 措辞降级（毕）**：annotation-resolve.ts 头注+itemViewportOf 注两处
  「约除消取整差」→「水平轴（宽）scale/base 严格约除消取整差；垂直轴依赖
  box 宽高比≈view 跨度比，有界 ~1px 级相对残差=同族精度带内[门一 W3
  口径]」。**本报告 §8 自裁 5 同步勘误**：原文「归一化缩放不变且消取整差
  （比快路径离散差更小）」为过度声明——垂直轴 box 宽高比与 view 跨度比
  独立取整，y 归一化存在有界 ~1px 级相对残差（同族精度带内），水平轴
  严格约除成立。以本节口径为准。
- **N1 DOM 触达面还原（毕）**：verifyQuote 首行加
  `if (selector.quote.length === 0) return null`（提取薄壳化后 fullTextOf
  在空 quote 短路前提前求值=触达面扩张 vs 旧码；前置守卫还原旧序——空
  引文不触 DOM，行为零变；locateQuote 内同检查保留=verifyQuoteItem 路径
  防线，头注在案）。N1 无行为断言可红（还原触达面非行为修复），红证载体
  =上列 W1/W2 变异红证。
- **W4 追认补记（报告自裁清单补一行）**：§8 增补——「裁决③字面管线
  （rectsForOffsetRange+bandsFromItems 直调）替换为 itemSelectionGeometry
  整管线——主控追认（裁决③后半句『直接复用导出面,禁第二份归一化实现』
  的兑现形态）」。
- **受锁流程**：anchor-item-verify.test.tsx 改动走 unlock（exit=0）→改→
  apply（exit=0，278 一致）。
- **verify**：`npm run verify` exit=0 落盘
  f-a8-gate0-rework1-verify.raw.txt——155 文件/1345 用例（1341+4 新增）/
  locks 278。git diff 范围=2 src+manifest（+6 净行 vs 首轮，无蔓延）；
  anchor-serialize 239/annotation-resolve 403/测试 315 行（≤500/测试不限）。

证据文件（本轮）：f-a8-gate0-rework1-unlock/locksapply/run/mut-tiebreak/
verify.raw.txt（5 份）。

## 5. 终态 diff 全文（2 src+manifest,152+/8-）

```diff
diff --git a/locks/manifest.json b/locks/manifest.json
index 9e29c3ccbf..2f6dd77e5f 100644
--- a/locks/manifest.json
+++ b/locks/manifest.json
@@ -1,5 +1,5 @@
 {
-    "generatedAt":  "2026-09-04T00:52:25.1570619Z",
+    "generatedAt":  "2026-09-04T01:41:08.1179532Z",
     "files":  [
                   {
                       "path":  ".github/workflows/ci.yml",
@@ -633,6 +633,10 @@
                       "path":  "tests/unit/renderer/ai-note-style.test.ts",
                       "sha256":  "fe0f12d47c3ac80c7b082997359faa4e5ceb836aa5473fa8950f74f5afc6a88c"
                   },
+                  {
+                      "path":  "tests/unit/renderer/anchor-item-verify.test.tsx",
+                      "sha256":  "d13aa5319d4365a22dd016b21432c22f35cbd8b5c5b3e80ea6f00339e860aed3"
+                  },
                   {
                       "path":  "tests/unit/renderer/anchor-locate.test.ts",
                       "sha256":  "ca53352aae1b96d0120a20f7fea46da60225401631da8992b20770f92611efcc"
diff --git a/src/renderer/features/reader/anchor-serialize.ts b/src/renderer/features/reader/anchor-serialize.ts
index 34d3396e2b..e212371a8a 100644
--- a/src/renderer/features/reader/anchor-serialize.ts
+++ b/src/renderer/features/reader/anchor-serialize.ts
@@ -9,16 +9,25 @@
  *   容器统一成立）；prefix/suffix 按 CONTEXT_CHARS=32 截取（WADM 惯例）
  * - verifyQuote：前缀/引文/后缀校验 start 偏移是否仍有效；失效时 textQuote
  *   自愈重定位——原位校验优先，重定位打分 score=prefix 2+suffix 1，同级取距
- *   原偏移最近者
- * - 偏移约定：verifyQuote 的 start 与返回值均指 quote 首字符的页内偏移（页内
- *   全文拼接口径在 annotation-anchor）；rects 的 page 恒为 0——实际页码由
- *   调用方在持久化时改写
+ *   原偏移最近者。定位核 locateQuote=纯文本函数（DOM/items 两域共享单源，
+ *   F-A8 门0 提取——verifyQuote 行为零变）
+ * - verifyQuoteItem [F-A8 门0]：verifyQuote 的 items 域等价物——页项文本
+ *   （剔空串项逐项 str 拼接，与 buildItemOffsets 偏移表同口径——空串项零宽
+ *   不入拼接，产出逐字节相同）上同核校验/自愈；偏移口径=页内文本序（两族
+ *   共有——DOM/items 拼接系统性差由 S1 reconcile 守卫拦截，本函数不做口径
+ *   转换）
+ * - 偏移约定：verifyQuote/verifyQuoteItem 的 start 与返回值均指 quote 首字符
+ *   的页内偏移（DOM 侧页内全文拼接口径在 annotation-anchor，items 侧=剔空串
+ *   逐项拼接）；rects 的 page 恒为 0——实际页码由调用方在持久化时改写
  *
  * ── 接口层 ──
  * - export interface SelectionAnchor
  * - export function selectionToAnchor(root, selection): SelectionAnchor | null
  * - export function verifyQuote(root, selector): number | null
- * - matchAt/probeTextLength/CONTEXT_CHARS 保持模块私有
+ * - export function verifyQuoteItem(items, selector): number | null [F-A8 门0]
+ *   （items 参数=结构最小面 {str:string}——消费方传 PdfTextItem[] 结构兼容；
+ *   不 import PdfPageCanvas 类型链的缘由见架构层）
+ * - matchAt/locateQuote/probeTextLength/CONTEXT_CHARS 保持模块私有
  * - 几何与遍历原语消费自 annotation-anchor 公共面（collectSpans/fullTextOf/
  *   offsetToPoint/rectsBetweenPoints/pixelBoxOf）——类型单一真相源，本模块
  *   零类型复写
@@ -27,6 +36,12 @@
  * - 依赖单向 anchor-serialize→annotation-anchor→annotation-merge（零环）；
  *   本模块=锚定格式与校验域，未来锚定格式扩展的增长点；锚定计算域（DOM 文本
  *   遍历/偏移互转/几何管线）仍在 annotation-anchor
+ * - **不 import pdf-item-geometry/PdfPageCanvas**（含 type）：本模块经受锁
+ *   annotation-anchor.test.ts 可达 tsconfig.node 程序（tests 目录 .ts 文件
+ *   include，无 jsx 选项），任一触 PdfPageCanvas.tsx 的边都触发 TS6142；故
+ *   items 拼接就地自持（剔空串 filter+join，与 pdf-item-geometry.itemsTextOf
+ *   同式——Rule of Three 第 2 次保持重复，第 3 处出现时上抽共享件并届时
+ *   一并解 tsconfig.node jsx 缺陷）
  * - 文本枚举唯一发生在 annotation-anchor；本模块仅借 Range 做长度探测
  *   （probeTextLength 的 Range.toString 非遍历）
  *
@@ -50,12 +65,49 @@ import {
 export function verifyQuote(
   root: HTMLElement,
   selector: { prefix: string; quote: string; suffix: string; start: number }
+): number | null {
+  // 空 quote 短路在 fullTextOf 之前（提取前旧码同序——空引文不触 DOM 遍历，
+  // 触达面还原[门一 N1]；locateQuote 内同检查保留=verifyQuoteItem 路径防线）
+  if (selector.quote.length === 0) {
+    return null
+  }
+  return locateQuote(fullTextOf(root), selector)
+}
+
+/**
+ * [F-A8 门0] items 域引文对账：页项文本（剔空串项逐项 str 拼接——与
+ * buildItemOffsets 偏移表同口径，空串项零宽不入拼接产出逐字节相同；与 DOM
+ * fullTextOf 同域的页内文本序）上执行与 verifyQuote 同核的定位校验。偏移口径
+ * =页内文本序（两族共有——DOM 拼接与 items 拼接的系统性差由 S1 reconcile
+ * 守卫拦截[b2 r3a 同构防线]，本函数不负责口径转换）。items 参数=结构最小面
+ * {str:string}（PdfTextItem[] 结构兼容；不 import PdfPageCanvas 类型链的缘由
+ * 见头注架构层）
+ */
+export function verifyQuoteItem(
+  items: ReadonlyArray<{ str: string }>,
+  selector: { prefix: string; quote: string; suffix: string; start: number }
+): number | null {
+  const text = items
+    .map((it) => it.str)
+    .filter((s) => s.length > 0)
+    .join('')
+  return locateQuote(text, selector)
+}
+
+/**
+ * 引文定位核（纯文本——DOM/items 两域共享单源，F-A8 门0 自 verifyQuote 提取，
+ * 行为零变）：原位校验优先（前缀/引文/后缀在 start 处全部吻合直接返回原偏移）；
+ * 失效时 textQuote 自愈重定位——引文全出现扫描，打分 score=prefix 2+suffix 1，
+ * 同级取距原偏移最近者
+ */
+function locateQuote(
+  text: string,
+  selector: { prefix: string; quote: string; suffix: string; start: number }
 ): number | null {
   const { prefix, quote, suffix, start } = selector
   if (quote.length === 0) {
     return null
   }
-  const text = fullTextOf(root)
   // 原位校验：前缀/引文/后缀在 start 处全部吻合则直接返回原偏移
   if (matchAt(text, start, prefix, quote, suffix)) {
     return start
diff --git a/src/renderer/features/reader/annotation-resolve.ts b/src/renderer/features/reader/annotation-resolve.ts
index 912ad03989..7e849d299b 100644
--- a/src/renderer/features/reader/annotation-resolve.ts
+++ b/src/renderer/features/reader/annotation-resolve.ts
@@ -6,6 +6,11 @@
  * - resolveAnnotationRects：verifyQuote 校正偏移（自愈排版漂移）→
  *   findRangeAtOffset 重算 rects——逐条等价自 AnnotationLayer 原 resolve
  *   闭包迁出（行为零变：失败回退存量，仅显示层不回写库）；
+ * - resolveAnnotationRectsItem [F-A8 门0]：重锚纯域版（项几何族）——
+ *   entry（page-items.store 页项）+annotations → verifyQuoteItem 逐条对账
+ *   校偏 → itemSelectionGeometry 产 {rects,bands}；entry null→{}、失败条目
+ *   缺席（S3b 语义=接线层回退存量，纯函数只缺席）。门 2 接线前零消费方
+ *   （门 0=纯函数域前置票）；
  * - [F-A4 b②] 行盒自适应字形带：重锚 range.textNodes 的 span 实测盒
  *   （gBCR）+canvas 字体度量（measureText 的 actualBoundingBox Ascent/
  *   Descent=墨带实界+fontBoundingBox=回退字体布局带）→ 推算字形带
@@ -41,8 +46,10 @@
  *   AnnotationLayer 挂 B 接线）+ F-A5 段（bandsNearRects 三消费点）。
  */
 import type { Annotation, AnnotationRect } from '@shared/models/annotation'
-import { verifyQuote } from './anchor-serialize'
+import { verifyQuote, verifyQuoteItem } from './anchor-serialize'
 import { findRangeAtOffset, pixelBoxOf, type PixelBox } from './annotation-anchor'
+import { itemSelectionGeometry, type ItemViewport } from './pdf-item-geometry'
+import type { PageItemEntry } from './page-items.store'
 
 /** 行簇字形带（归一化域；center=带中心——渲染块匹配键；x0/x1=行簇 span
  *  实际端点——F-A5 a 面自绘块水平界夹取源，缺省=该带无端点量测） */
@@ -293,6 +300,87 @@ export function resolveAnnotationRects(args: {
   return next
 }
 
+/**
+ * [F-A8 门0] 重锚纯域版（项几何族——S0–S3a 状态机的纯函数核，设计书
+ * docs/design/2026-09-04_f-seam-reanchor-design.md §1.1/§3）：
+ * - S0：entry null → {}（页项缺席——接线层走 DOM 回退链，纯函数不编排回退）；
+ * - S1 DOM 对账=门 2 接线面（接线时有 textLayer DOM 可对账），本域 entry
+ *   信任=store 写者唯一性（PagesOverlay handlePageRender 回报——写者契约在
+ *   page-items.store 头注）；
+ * - S2：逐条 verifyQuoteItem 校正偏移（textQuote 自愈——与 DOM 版同核
+ *   locateQuote 单源）→ itemSelectionGeometry 产 {rects,bands}（归一化数学
+ *   直复用 selection 链管线导出面，禁第二份归一化实现）；
+ * - S3b：对账失败/空串引文/他页条目 → 该条缺席（接线层回退存量，纯函数只
+ *   缺席）；计算异常（畸形 rotate/几何非有限）逐条 try 缺席（selection 快
+ *   路径 itemChainFor 同款 try 先例）。
+ * viewport 现构=selection 快路径同款数学（rotate/view 来自 entry.geometry，
+ * 调用即构不缓存——缩放不变）；scale 自 entry.box 反推（box=PdfPageCanvas
+ * clampScale(zoom) 渲染的 canvas CSS 盒回报——PagesOverlay 写者契约，反推值
+ * =夹取后真值；水平轴 scale/base 严格约除消取整差；垂直轴依赖 box 宽高比
+ * ≈view 跨度比，有界 ~1px 级相对残差=同族精度带内[门一 W3 口径]）。base
+ * 盒本地帧（itemSelectionGeometry 头注：归一化只消费盒宽高，原点不参与）。
+ */
+export function resolveAnnotationRectsItem(
+  entry: PageItemEntry | null,
+  annotations: Annotation[],
+  page: number
+): Record<string, ResolvedAnnotation> {
+  if (entry === null) {
+    return {}
+  }
+  const viewport = itemViewportOf(entry)
+  if (!Number.isFinite(viewport.scale) || viewport.scale <= 0) {
+    return {}
+  }
+  const base: PixelBox = { x: 0, y: 0, w: entry.box.w, h: entry.box.h }
+  const next: Record<string, ResolvedAnnotation> = {}
+  for (const a of annotations) {
+    if (a.page !== page || a.quoteText.length === 0) {
+      continue
+    }
+    const at = verifyQuoteItem(entry.text.items, {
+      prefix: a.prefixText,
+      quote: a.quoteText,
+      suffix: a.suffixText,
+      start: a.startOffset
+    })
+    if (at === null) {
+      continue
+    }
+    try {
+      const geo = itemSelectionGeometry({
+        items: entry.text.items,
+        styles: entry.text.styles,
+        viewport,
+        start: at,
+        end: at + a.quoteText.length,
+        base
+      })
+      if (geo !== null) {
+        next[a.id] = { rects: geo.rects, bands: geo.bands }
+      }
+    } catch {
+      // 畸形 rotate 等计算异常——该条缺席（S3b 同判据，快路径 try 先例）
+    }
+  }
+  return next
+}
+
+/** 页项条目 → viewport（rotate=90/270 时 canvas 宽对应 view 高——宽高互换；
+ *  box 反推 scale=Math.round 后 CSS 盒/跨度，与 clampScale(zoom) 真值差 <1px
+ *  取整粒度——水平轴（宽）scale/base 严格约除消取整差；垂直轴依赖 box 宽高
+ *  比≈view 跨度比，有界 ~1px 级相对残差=同族精度带内[门一 W3 口径]） */
+function itemViewportOf(entry: PageItemEntry): ItemViewport {
+  const [x0, y0, x1, y1] = entry.geometry.view
+  const rot = ((entry.geometry.rotate % 360) + 360) % 360
+  const domWidth = rot === 90 || rot === 270 ? y1 - y0 : x1 - x0
+  return {
+    scale: domWidth > 0 ? entry.box.w / domWidth : Number.NaN,
+    rotate: entry.geometry.rotate,
+    view: entry.geometry.view
+  }
+}
+
 /** textLayer 行高（归一化域——挂 B mergeRects lineH；span 字号中位数/盒高）。
  *  量测退化（盒高兜 1 的 jsdom 桩面）→undefined 旧行为。 */
 export function normalizedLineHeight(textLayer: HTMLElement): number | undefined {

```
