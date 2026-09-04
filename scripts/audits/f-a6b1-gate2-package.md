# F-A6-b1（T1/T9 前置修复+决策门）·门二终位审材料包（deepseek 链,零仓库接触）

你是门二终审官。门一（Kimi k3）已裁决 PASS_WITH_WARNINGS（附后），实现者已回炉处置五条（处置记录=材料 §4 的 §10 门一回炉处置档段）。你对修复本体+决策门记录+门一处置闭合度做终位审。

## 0. 终位审任务

1. **修复正确性终核**（材料 §1 五维中门一已放行的四维——你可维持或推翻）：duckViewport rawDims 真值化/rotatedContainerBox 官方变换等价/通道设计/测试纪律/红线。
2. **门一处置闭合度**：W1（1c2d IoU 有条件过+阈值不再事后发明）/W2（s1rot 配对行 N/A+零高块复算 blk 数字）/N1（transform-origin 断言锁——第 11 用例）/N2/N3 是否真闭合。
3. **追认请求（终位重点——门一移交的裁决权）**：1c2d IoU 0.9999→0.9982 的边际：机理=分数 view 页（[0,0,425.52,647.28]）旧实现 rawDims 用量测 CSS 盒÷scale 的 floor 逼近（425×647），新实现用精确 view→span 缩放与 canvas CSS floor 压缩同口径=更忠实墨带；佐证=整尺寸页 3882/s3base 全指标逐位不变；B2（乙轨）按未取整 viewport 域计算故 A/B2 间存 ~0.5px 右缘差。**你要裁决：追认（0.9982=改进的度量精度而非劣化,放行）或拒绝（要求重测/改 B2 口径）**。裁决依据必须引用材料内证据。
4. **决策门结论终位**：「过——阶段 3 放行」是否成立（在追认裁决之后给出整体终位）。

输出：只输出一个 JSON 对象,不要 markdown 围栏：
{"verdict":"PASS|PASS_WITH_WARNINGS|FAIL","endorsement":"1c2d IoU 追认=ENDORSE 或 REJECT(一句话理由)","findings":[{"severity":"BLOCKING|WARN|NIT","target":"...","issue":"...","evidence":"...","suggestion":"..."}],"summary":"两三句"}
无发现给空 findings+PASS。

## 1. 门一审材料包（票面+diff+测试+裁决表节选——与门一所审同源）

# F-A6-b1（T1/T9 前置修复+阶段 2 决策门）·门一审材料包（Kimi 链,零仓库接触）

你是门一对抗审查员。审一份「PDF 文本层 T1 页旋转/T9 CropBox 原点前置修复」的实现 diff+新测试+决策门复跑记录。你拿不到仓库,只审本包。

## 0. 票面摘要

上游 F-A6-a 取证票裁定（已双门终审在档）:T1=TextLayer duckViewport 硬编码 rotation:0 vs canvas getViewport 默认含 page.rotate→/Rotate≠0 页文本层错位（合成 S1 实证 outside 5/8、paint 并 1 块 vs 行真值 3）;T9=rawDims 硬编码 pageX:0/pageY:0→CropBox 原点≠0 页双向平移 x+36.01/y−37.40（合成 S2 实证）。本票=阶段 1 前置修复+阶段 2 决策门复跑（阶段 3 主链迁移放行与否）。约束:textContentSource 不得加非 TextContent 字段;geometry 必填无静默回退;真实库 46 页零触发（验收=合成证据+健康页零回归）。

## 1. 审查任务

1. **修复正确性**（重点）:duckViewport rawDims 语义（view 跨度/原点 vs 旧 CSS/scale 逼近）;rotatedContainerBox 的 90/180/270 变换公式与宽高交换——与官方 pdf_viewer.css [data-main-rotation] 规则等价性、与 PageViewport 旋转分支一致性;「span 位置恒为未旋转用户空间百分比、页旋转由容器 CSS 变换承担」这一 pdf.mjs 4.10.38 机理认定的可信度;userUnit=1 假设。
2. **通道设计**:onPageRender 第三参下钻 vs 载荷字段;PageBox/PageColumn 纯类型扩参的超票面申报是否合理（TS 参数逆变）;geometry 必填（无回退）的风险面。
3. **测试纪律**:新 text-layer.test.tsx 10 用例的断言力度（纯数学域直测+jsdom 语义级）;先红证据（12 红）;变异红证 2（rotation→0/pageX→0）;「期望值分母笔误自纠」的申报。
4. **决策门忠实度**（重点）:判据执行是否忠于裁决表 §4 执行顺序（S1/S2 消除+健康页不劣化）;s1rot 判据落在 outside/块数而 IoU/shift 判据被声明「配对器横排假定不适配竖排形态」——口径切换是否正当;s2crop outside 1/8 归因（ROW1 基线在 CropBox 顶缘 ascent 14.29px 越界=canvas 裁剪/span 盒不裁的口径差）是否成立;1c2d IoU 0.9999→0.9982 边际归因（分数 view 页 span 缩放改精确值）是否成立;「决策门过→阶段 3 放行」结论。
5. **红线**:范围蔓延（8 文件清单之外）/占位/恒真断言迹象。

## 2. 修复依据摘要（裁决表节选）

### §2 T1/T9 行
| T1 页旋转 | **机理证实+真实库零触发+合成触发证实** | a1-scan.json（0 异常页）；s1rot-cap.json A2 | outside=5/8 span 落 textLayer 盒外；甲 paint=1 块 vs 行真值 3（整片并簇错乱）；overlap 配对 0/0（旋转形态块与配对器 y 语义不符，§9） |
| T9 CropBox 原点≠0 | **机理证实+真实库零触发+合成触发证实（x/y 双向平移量化闭合）** | s2crop-fb.json mergedB2Baseline + s2crop-cap.json c1.selected/c2.blocks（门一回炉 W1 复算在档） | 甲（duck 域）span 盒顶相对乙（viewport 域）块顶偏移 **x +36.01px / y −37.40px**（双向同源）。x=duckViewport `pageX:0`（TextLayer.tsx:57）vs view[0]=36；y=duck #transform 第 6 元 `pageY+pageHeight=0+684`（CropBox CSS 高）vs viewport offsetY=view[3]=720 的差 −36，叠加 ascent 口径差 −1.40px（TextLayer 用 canvas 量测 ascent 14.33px=0.796×fontH vs 乙轨用 styles 声明 0.718×18=12.92px）。§4 表中 shift dy=7.9 **非平移量**——y 偏 37.40>行距 28 使配对器错行：paint 行 i 错配乙行 i−1（Δcy=7.93 过门 |Δcy|≤(15+18)/2+2=18.5，成功 2/3），首行 Δ35.9 被门拒——**错行配对残差=T9 垂直错绑的下游病象实证**；outside=2/8；块数口径不敏感（甲 3 块=行数但位置错） |

### §4 执行顺序段
**执行顺序（门二 W3 补——阶段化决策门，F-A6-b 票面必须承载）**：阶段 1=T1/T9 前置修复（duckViewport）→阶段 2=复跑本取证器 A/B 对照（确认 S1/S2 形态消除+健康页 IoU 不劣化）→阶段 3=在消除后基线上终裁主链迁移落地（本表「主修」为待决建议，其判别性证据链已按依据 2 依存声明降级，不因前置修复完成而自动失效重议——除非阶段 2 复跑出现新反证）。


### §5 修复集阶段列+验收条件
## 5 修复集裁定建议（F-A6-b 票面输入）

**执行阶段列（门二 W3）**：阶段 1=前置修复→阶段 2=复跑 A/B 对照（决策门）→阶段 3=主链迁移（细节见 §4 执行顺序段）。

| 项 | 阶段 | 修/不修 | 方向 |
|---|---|---|---|
| T1（rotation 通道） | **1** | **修** | TextLayer.tsx duckViewport rotation 通道（真实库零触发但合成实证+用户裁决②「旋转页修复纳入」；deepseek NIT-2 的降级条款在此不满足——触发形态已由 S1 闭合）。**修复后须复跑 A/B 对照确认 S1 形态消除（阶段 2 决策门输入）** |
| T9（rawDims 真值化） | **1** | **修** | duckViewport 改收真实 page.view/pageX/pageY（S2 实证 36px 平移；与 T1 相互独立，rotation=0 也致病——维持 WARN-2 权属）。**同上：修复后复跑对照=阶段 2 输入** |
| T2/T3（聚类判据） | 3 | **修（回退路径）** | mergeLineRects 聚类比较扩到全部簇（annotation-merge.ts:26-28 先例语义）——3882 的 80 组拆簇直接对症；迁移路线下此函数降为 DOM 量测回退路径的加固 |
| T4（pitch 滤噪） | — | 不修（本轮未触发塌缩） | 观察——若 F-A6-c 后续复现再立案 |
| T5 | 3 | 随迁移构造性消除 | 项几何 width=PDF 声明宽——**构造性消除夹取源错（未实证：无墨带参照，§2 已自承「方向正确性未证」；迁移落地时以 S3 健康样本 IoU 复测补证）** |
| T7 | — | 不修（6 处断段存疑且收口后无残留） | 观察 |
| 主链 | **3**（待阶段 2 决策门放行） | **迁移** | pdf-item-geometry.ts（项几何+grapheme 细分+**基线分组并块**+bands 同源派生 C5）+PdfPageCanvas/装配链 viewport/styles 下钻通道（C1 承重断点） |
| D2 | —（F-A6-c） | 另票 | 见 §7 基线（5Hz 步进 200ms 实测+每 tick 布局读量级） |

**验收条件（门二 W2——修复集证据等级声明，随票流转不得丢失）**：本修复集以**机理+合成证据**裁定，用户实报重形态（锯齿+右溢）未在真实抽样页复现（§3 总结论）；F-A6-b 验收须含**合成 S1/S2 复现-消除证据**（阶段 2 决策门即此口径）；真实重形态复现=新增复现证据时按 §6 WARN-5 口径启用 G2 拒绝门——不存在「修完后无任何闸门核验实报形态」的窗口。


## 3. 实现者完成报告关键声明

- 8 改+1 新:TextLayer（105→174）/PdfPageCanvas（PdfPageGeometry 类型+第三参）/PagesOverlay（注册表存 geometry）/PageBox+PageColumn（纯类型扩参——超票面申报:通道物理穿过,TS 逆变要求）/三测试件/manifest 272→273。
- 先红 12 红（3 文件）→绿 150 文件/1284 用例→verify exit 0 亲验（主控复核亦 exit 0）。
- 变异红证 2:rotation→0 恰 2 用例红;pageX→0 恰 2 用例红（文件备份法还原 diff 空）。
- 决策门:两轮对照表+归因（详 §5 材料段）。s1rot 判据=outside 0/8+块 3=行真值（配对器竖排盲区维持第一轮口径）;s2crop=平移 0.03/IoU 0.9998/3-3 配对;健康页块数逐位不变、1c2d IoU 0.9982 边际归因;tick 同量级。
- duckViewport 签名去 pageWidth/pageHeight 两参（死参去除——偏离票面拟定签名,申报）。

## 4. diff 全文（488 行）

```diff
diff --git a/src/renderer/features/reader/PageBox.tsx b/src/renderer/features/reader/PageBox.tsx
index f82a362cec..0ad3471301 100644
--- a/src/renderer/features/reader/PageBox.tsx
+++ b/src/renderer/features/reader/PageBox.tsx
@@ -14,8 +14,9 @@
  *
  * ── 接口层 ──
  * - export function PageBox(props: { no; size; zoom; boxWidth; rendered;
- *     doc: PDFDocumentProxy | null; renderPage(no); onPageRender(no, payload);
- *     onError(msg) }): JSX.Element
+ *     doc: PDFDocumentProxy | null; renderPage(no); onPageRender(no, payload,
+ *     geometry: PdfPageGeometry); onError(msg) }): JSX.Element
+ *   （geometry 第三参=F-A6-b1 T1/T9 页几何通道透传——类型与 PdfPageCanvas 同源）
  *
  * ── 架构层 ── / ── 生命周期层 ──
  * - F-ARCH3 拆件纪律：函数形态原样迁（不加 useCallback/useMemo）；渲染窗口
@@ -23,7 +24,7 @@
  */
 import type { PDFDocumentProxy } from './PdfDocProvider'
 import { PdfPageCanvas } from './PdfPageCanvas'
-import type { PdfTextContent } from './PdfPageCanvas'
+import type { PdfPageGeometry, PdfTextContent } from './PdfPageCanvas'
 import { pageBoxHeight, type PageBoxSize } from './page-column-geometry'
 
 export function PageBox(props: {
@@ -36,7 +37,7 @@ export function PageBox(props: {
   rendered: boolean
   doc: PDFDocumentProxy | null
   renderPage(no: number): JSX.Element
-  onPageRender(no: number, payload: PdfTextContent): void
+  onPageRender(no: number, payload: PdfTextContent, geometry: PdfPageGeometry): void
   onError(msg: string): void
 }): JSX.Element {
   const { no, size, zoom, boxWidth, rendered, doc } = props
diff --git a/src/renderer/features/reader/PageColumn.tsx b/src/renderer/features/reader/PageColumn.tsx
index 3cc456e49f..301ef0d23e 100644
--- a/src/renderer/features/reader/PageColumn.tsx
+++ b/src/renderer/features/reader/PageColumn.tsx
@@ -27,7 +27,7 @@
 import { useEffect, useLayoutEffect, useRef, useState } from 'react'
 import type { RefObject } from 'react'
 import type { PDFDocumentProxy } from './PdfDocProvider'
-import type { PdfTextContent } from './PdfPageCanvas'
+import type { PdfPageGeometry, PdfTextContent } from './PdfPageCanvas'
 import { PageBox } from './PageBox'
 import {
   anchoredScrollTop,
@@ -66,7 +66,7 @@ export function PageColumn(props: {
   scrollContainerRef?: RefObject<HTMLDivElement | null>
   /** 段④：渲染窗口内每页的覆盖层装配（TextLayer/标注层/AI 层+SelectionLayer 挂载位） */
   renderPage(no: number): JSX.Element
-  onPageRender(no: number, payload: PdfTextContent): void
+  onPageRender(no: number, payload: PdfTextContent, geometry: PdfPageGeometry): void
   onError(msg: string): void
   /** 段①：页列就绪（载荷=列宽基准：布局口径最宽页/最宽完整行原始宽，fit-width 分母单源）；
    *  可见页上抛（SelectionLayer 锚定页挂载位消费——升序） */
diff --git a/src/renderer/features/reader/PagesOverlay.tsx b/src/renderer/features/reader/PagesOverlay.tsx
index 164abcdb18..6094477f60 100644
--- a/src/renderer/features/reader/PagesOverlay.tsx
+++ b/src/renderer/features/reader/PagesOverlay.tsx
@@ -10,11 +10,12 @@
  *   ④ 换文献清缓存 effect（键 fileUrl，只清两表——setPdfDoc(null) 留 ReaderPage，
  *     pdfDoc 是 OutlinePanel 数据源=布局职责）；
  *   ⑤ handlePageRender（PdfPageCanvas 渲染回报→页根域内量测 canvas CSS 盒→
- *     Math.round 写 pageTexts；pageRoots 引用相等不重写）；
+ *     Math.round 写 pageTexts；pageRoots 引用相等不重写；回报第三参页几何
+ *     rotate/view 随条目存储——F-A6-b1 T1/T9 通道）；
  *   ⑥ dropPageState（W3：两表同删）；
  *   ⑦ renderPageLayers 覆盖层工厂（TextLayer 挂载条件 pt!==undefined /
  *     AnnotationLayer 挂载条件 pr!==undefined / ReaderAiLayer 恒挂
- *     pageRoot=pr??null；page 传 no−1；viewportScale=zoom）。
+ *     pageRoot=pr??null；page 传 no−1；viewportScale=zoom；geometry 下钻透传）。
  * - 内装 PageColumn（十 props 全透传——F-R1 增 layout）：onPageRender（写
  *   注册表）与 renderPage（读注册表）读写同源必须同居一组件——这是本组件
  *   包 PageColumn 而非只提供工厂的原因（F-ARCH3 票面行为层）。
@@ -46,14 +47,16 @@ import { ReaderAiLayer } from './AiAnnotationLayer'
 import { PageColumn, type PageScrollRequest } from './PageColumn'
 import { SearchHighlightLayer } from './SearchHighlightLayer'
 import type { PDFDocumentProxy } from './PdfDocProvider'
-import type { PdfTextContent } from './PdfPageCanvas'
+import type { PdfPageGeometry, PdfTextContent } from './PdfPageCanvas'
 import type { PageLayout } from './page-column-geometry'
 import { TextLayer } from './TextLayer'
 
-/** 当前页文本与几何（成对更新：页号 + 文本载荷 + 该页 canvas CSS 盒） */
+/** 当前页文本与几何（成对更新：页号 + 文本载荷 + 页几何 + 该页 canvas CSS 盒） */
 interface PageText {
   page: number
   text: PdfTextContent
+  /** F-A6-b1 T1/T9 通道：渲染回报的页几何（rotate/view），透传 TextLayer */
+  geometry: PdfPageGeometry
   box: { w: number; h: number }
 }
 
@@ -87,13 +90,15 @@ export function PagesOverlay(props: {
     setPageRoots({})
   }, [fileUrl])
 
-  /** PdfPageCanvas 渲染完成回报：每页自量（按页号查该页盒内 canvas CSS 盒） */
-  const handlePageRender = (no: number, text: PdfTextContent): void => {
+  /** PdfPageCanvas 渲染完成回报：每页自量（按页号查该页盒内 canvas CSS 盒）。
+      第三参 geometry=F-A6-b1 T1/T9 页几何通道（rotate/view 原值入注册表，
+      透传 TextLayer——duckViewport rotation/rawDims 真值化） */
+  const handlePageRender = (no: number, text: PdfTextContent, geometry: PdfPageGeometry): void => {
     const pageRoot = document.querySelector<HTMLElement>(`[data-page-root="${no}"]`)
     const canvas = pageRoot?.querySelector('canvas[data-pdf-canvas]') ?? null
     if (canvas === null) return
     const rect = canvas.getBoundingClientRect()
-    setPageTexts((prev) => ({ ...prev, [no]: { page: no, text, box: { w: Math.round(rect.width), h: Math.round(rect.height) } } }))
+    setPageTexts((prev) => ({ ...prev, [no]: { page: no, text, geometry, box: { w: Math.round(rect.width), h: Math.round(rect.height) } } }))
     if (pageRoot !== null) setPageRoots((prev) => (prev[no] === pageRoot ? prev : { ...prev, [no]: pageRoot }))
   }
 
@@ -114,7 +119,7 @@ export function PagesOverlay(props: {
     const pr = pageRoots[no]
     return (
       <PageFrame no={no} onRecycle={dropPageState}>
-        {pt !== undefined ? <TextLayer textContent={pt.text} viewportScale={zoom} pageWidth={pt.box.w} pageHeight={pt.box.h} /> : null}
+        {pt !== undefined ? <TextLayer textContent={pt.text} viewportScale={zoom} pageWidth={pt.box.w} pageHeight={pt.box.h} geometry={pt.geometry} /> : null}
         {pr !== undefined ? <AnnotationLayer annotations={annotations} page={no - 1} pageRoot={pr} onChanged={() => undefined} /> : null}
         <ReaderAiLayer page={no - 1} pageRoot={pr ?? null} />
         <SearchHighlightLayer page={no - 1} pageRoot={pr ?? null} />
diff --git a/src/renderer/features/reader/PdfPageCanvas.tsx b/src/renderer/features/reader/PdfPageCanvas.tsx
index 71aeb59d79..2aa537326c 100644
--- a/src/renderer/features/reader/PdfPageCanvas.tsx
+++ b/src/renderer/features/reader/PdfPageCanvas.tsx
@@ -12,11 +12,12 @@
  *
  * ── 接口层 ──
  * - export function PdfPageCanvas(props: { doc: PDFDocumentProxy; pageNo: number;
- *     zoom: number; onPageRender(page: number, textContent: PdfTextContent): void;
- *     onError(msg: string): void }): JSX.Element
- * - pageNo 固定（页列模型：页码由 PageColumn 分配，不再跳变）
- * - PdfTextItem/PdfTextStyle/PdfTextContent 类型单源驻本文件（pdfjs TextItem
- *  /TextStyle 的结构子集——消费方 TextLayer/ReaderPage 不 import pdfjs-dist）
+ *     zoom: number; onPageRender(page, textContent: PdfTextContent,
+ *     geometry: PdfPageGeometry): void; onError(msg: string): void }): JSX.Element
+ * - pageNo 固定（页码 1 基；页列模型：页码由 PageColumn 分配，不再跳变）
+ * - PdfTextItem/PdfTextStyle/PdfTextContent/PdfPageGeometry 类型单源驻本文件
+ *   （pdfjs TextItem/TextStyle 的结构子集+页几何通道——消费方 TextLayer/
+ *   PagesOverlay 不 import pdfjs-dist）
  *
  * ── 架构层 ──
  * - pdfjs-dist import 白名单文件（INV-16：PdfDocProvider/PdfPageCanvas/TextLayer/
@@ -64,6 +65,19 @@ export interface PdfTextContent {
   lang: string | null
 }
 
+/**
+ * 页几何通道（F-A6-b1 T1/T9 前置修复）：rotate=pdf.js page.rotate（/Rotate 值）；
+ * view=pdf.js page.view（CropBox∩MediaBox，[x0,y0,x1,y1] PDF 用户空间）——
+ * TextLayer duckViewport 的 rotation/rawDims 真值来源（与 canvas 渲染的
+ * getViewport 同源，二者不再各执一词）。userUnit≠1 的页 view 未乘 userUnit
+ * （官方 PageViewport.rawDims getter 会乘）——已知边界：真实库全档 userUnit=1
+ * （f-a6-forensic-verdict §1），触发后另行扩展
+ */
+export interface PdfPageGeometry {
+  rotate: number
+  view: [number, number, number, number]
+}
+
 function errorMessage(err: unknown): string {
   return err instanceof Error ? err.message : String(err)
 }
@@ -72,7 +86,7 @@ export function PdfPageCanvas(props: {
   doc: PDFDocumentProxy
   pageNo: number
   zoom: number
-  onPageRender(page: number, textContent: PdfTextContent): void
+  onPageRender(page: number, textContent: PdfTextContent, geometry: PdfPageGeometry): void
   onError(msg: string): void
 }): JSX.Element {
   const { doc, pageNo, zoom } = props
@@ -137,6 +151,11 @@ export function PdfPageCanvas(props: {
         items: textContent.items.filter((item): item is PdfTextItem => 'str' in item),
         styles: textContent.styles,
         lang: textContent.lang
+      }, {
+        // F-A6-b1 T1/T9 通道：与 viewport 同源的页几何（rotate/view）下钻——
+        // TextLayer duckViewport 的真值输入（view 数组断言四元组由结构保证）
+        rotate: pdfPage.rotate,
+        view: pdfPage.view as [number, number, number, number]
       })
     }
     render().catch((err: unknown) => {
diff --git a/src/renderer/features/reader/TextLayer.tsx b/src/renderer/features/reader/TextLayer.tsx
index 3f64b4cfce..58d7373b45 100644
--- a/src/renderer/features/reader/TextLayer.tsx
+++ b/src/renderer/features/reader/TextLayer.tsx
@@ -12,10 +12,13 @@
  *
  * ── 接口层 ──
  * - export interface TextLayerProps { textContent: PdfTextContent; viewportScale: number;
- *     pageWidth: number; pageHeight: number }
+ *     pageWidth: number; pageHeight: number; geometry: PdfPageGeometry }
  * - export function TextLayer(props: TextLayerProps): JSX.Element
+ * - export function duckViewport(scale, rotate, view): PageViewport（纯函数导出供直测）
+ * - export function rotatedContainerBox(rotate, pageWidth, pageHeight): ContainerBox（同上）
  * - textContent 为 PdfCanvas 回调的完整载荷（items + styles + lang）：TextLayer 按
  *   fontName 查 styles 无回退，styles 必须真实传自 getTextContent（集成期实证）
+ * - geometry 必填（F-A6-b1：缺省即 bug 面——rotation/rawDims 无回退默认值）
  *
  * ── 架构层 ──
  * - pdfjs-dist import 白名单三文件之一（INV-16：PdfCanvas/TextLayer/CorpusExtractor）
@@ -28,7 +31,7 @@
 import { useEffect, useRef } from 'react'
 import type { CSSProperties } from 'react'
 import { TextLayer as PdfJsTextLayer, type PageViewport } from 'pdfjs-dist'
-import type { PdfTextContent } from './PdfPageCanvas'
+import type { PdfPageGeometry, PdfTextContent } from './PdfPageCanvas'
 import './text-layer.css'
 import { PAGE_LAYER_Z } from './page-layer-z'
 
@@ -37,31 +40,73 @@ export interface TextLayerProps {
   viewportScale: number
   pageWidth: number
   pageHeight: number
+  /** F-A6-b1 T1/T9：页几何（rotate/view）——duckViewport rotation/rawDims 真值源 */
+  geometry: PdfPageGeometry
 }
 
 /**
  * v4 的 TextLayer 类要求 PageViewport 实例，但 PageViewport 类不从主入口导出
  * （运行时实测 undefined；d.ts 仅导出类型）。类内部只读取 scale / rotation /
- * rawDims 三个成员（4.10.38 源码核对），props 已含等价信息，按 PDF 用户空间
- * 尺寸重建：pageWidth/pageHeight 是缩放后的 CSS 尺寸，除以 scale 还原原始页尺寸。
- * 局限：页旋转（/Rotate 90/180/270）v1 不支持——props 契约无 rotation 通道
- * （canvas 渲染不受影响，仅文本层对齐失效）；需要时扩展点在此函数的 rotation 字段。
+ * rawDims 三个成员（4.10.38 源码核对，F-A6-b1 复核仍成立：构造器 #scale=scale×
+ * devicePixelRatio、#rotation=rotation（update 重排+setLayerDimensions 写容器
+ * data-main-rotation）、rawDims→#transform=[1,0,0,-1,-pageX,pageY+pageHeight]+
+ * span 位置百分比分母；PageViewport.rawDims getter 语义=view 跨度×userUnit——
+ * 本仓 userUnit=1 全档成立，见 PdfPageGeometry 已知边界注）。
+ *
+ * F-A6-b1（T1/T9 前置修复，依据 f-a6-forensic-verdict §2/§5 阶段 1）：
+ * - rotation=geometry.rotate 真值（原硬编码 0——/Rotate≠0 页文本层与 canvas 墨带
+ *   错位，合成 S1 实证 outside 5/8 span 落盒外）；
+ * - rawDims=geometry.view 真值（原硬编码 pageX:0/pageY:0——CropBox 原点≠0 页整体
+ *   平移 x+36.01/y−37.40px，合成 S2 实证）。原「页旋转 v1 不支持」局限解除。
+ * 纯函数（数学域）导出供单测直测（tests/unit/renderer/text-layer.test.tsx）。
  */
-function duckViewport(scale: number, pageWidth: number, pageHeight: number): PageViewport {
+export function duckViewport(scale: number, rotate: number, view: [number, number, number, number]): PageViewport {
   return {
     scale,
-    rotation: 0,
+    rotation: rotate,
     rawDims: {
-      pageWidth: pageWidth / scale,
-      pageHeight: pageHeight / scale,
-      pageX: 0,
-      pageY: 0
+      pageWidth: view[2] - view[0],
+      pageHeight: view[3] - view[1],
+      pageX: view[0],
+      pageY: view[1]
     }
   } as unknown as PageViewport
 }
 
+/** rotatedContainerBox 产物：容器 CSS 盒（90/270 带变换） */
+export interface ContainerBox {
+  width: number
+  height: number
+  transform?: string
+}
+
+/**
+ * 旋转页容器盒（F-A6-b1 T1）：pdf.js TextLayer 的 span 位置恒为【未旋转用户空间】
+ * 百分比（#appendText 数学不含页旋转），页旋转由容器 CSS 变换承担——官方
+ * pdf_viewer.css:3104-3112 通用规则 [data-main-rotation="90"]{transform:
+ * rotate(90deg) translateY(-100%)} 等（setLayerDimensions 已把 data-main-rotation
+ * 写上容器，但 repo 的 text-layer.css 只提取了 .textLayer 系规则、该通用属性
+ * 选择器规则无消费者——故在此内联等价变换，不动受锁 CSS 提取面）。
+ * pageWidth/pageHeight=旋转后 canvas CSS 盒（挂载方量测）：90/270 交换还原未旋转
+ * 盒（旋转后恰覆盖 canvas 盒——与 PageViewport 构造器旋转分支的宽高互换一致）；
+ * 0 零行为变（46 页真实库形态）。纯函数导出供单测直测。
+ */
+export function rotatedContainerBox(rotate: number, pageWidth: number, pageHeight: number): ContainerBox {
+  const rot = ((rotate % 360) + 360) % 360
+  if (rot === 90) {
+    return { width: pageHeight, height: pageWidth, transform: 'rotate(90deg) translateY(-100%)' }
+  }
+  if (rot === 180) {
+    return { width: pageWidth, height: pageHeight, transform: 'rotate(180deg) translate(-100%, -100%)' }
+  }
+  if (rot === 270) {
+    return { width: pageHeight, height: pageWidth, transform: 'rotate(270deg) translateX(-100%)' }
+  }
+  return { width: pageWidth, height: pageHeight }
+}
+
 export function TextLayer(props: TextLayerProps): JSX.Element {
-  const { textContent, viewportScale, pageWidth, pageHeight } = props
+  const { textContent, viewportScale, pageWidth, pageHeight, geometry } = props
   const containerRef = useRef<HTMLDivElement | null>(null)
 
   useEffect(() => {
@@ -77,10 +122,11 @@ export function TextLayer(props: TextLayerProps): JSX.Element {
     }
     const layer = new PdfJsTextLayer({
       // 完整载荷直传（items+styles+lang）：按 fontName 查 styles 无回退，
-      // 自造空 styles 会让首个文本项崩——集成期实证
+      // 自造空 styles 会让首个文本项崩——集成期实证（载荷不含 geometry——
+      // textContentSource 不得加非 TextContent 字段，防 pdf.js 兼容面）
       textContentSource: textContent,
       container,
-      viewport: duckViewport(viewportScale, pageWidth, pageHeight)
+      viewport: duckViewport(viewportScale, geometry.rotate, geometry.view)
     })
     // props 变化/卸载 → cancel() 令 render() 拒绝属正常控制流；其余失败仅损失
     // 文本选择能力（canvas 阅读不受影响），本组件 props 契约无错误通道——
@@ -89,16 +135,20 @@ export function TextLayer(props: TextLayerProps): JSX.Element {
       console.error('[TextLayer] 渲染失败：', err)
     })
     return () => layer.cancel()
-  }, [textContent, viewportScale, pageWidth, pageHeight])
+  }, [textContent, viewportScale, pageWidth, pageHeight, geometry])
 
-  // --scale-factor 供官方 CSS 的 span 字号 calc 使用；宽高与 PdfCanvas 的 canvas
-  // CSS 尺寸一致（inset:0 之上再显式给定，确保与页面盒对齐）
+  // --scale-factor 供官方 CSS 的 span 字号 calc 使用；宽高=canvas CSS 盒同源量测
+  // （inset:0 之上再显式给定，确保与页面盒对齐）；旋转页（90/270）由
+  // rotatedContainerBox 交换为未旋转盒并施加官方等价变换（T1——span 百分比
+  // 数学在未旋转空间，容器变换负责与旋转后 canvas 对齐）
   // zIndex=层序常量单源显式化（与官方 css z0 同值——序防漂移，F-A5 c）
+  const box = rotatedContainerBox(geometry.rotate, pageWidth, pageHeight)
   const style = {
-    width: `${pageWidth}px`,
-    height: `${pageHeight}px`,
+    width: `${box.width}px`,
+    height: `${box.height}px`,
     zIndex: PAGE_LAYER_Z.text,
-    '--scale-factor': String(viewportScale)
+    '--scale-factor': String(viewportScale),
+    ...(box.transform !== undefined ? { transform: box.transform } : {})
   } as CSSProperties
 
   return <div ref={containerRef} className="textLayer" style={style} />
diff --git a/tests/unit/renderer/pages-overlay.test.tsx b/tests/unit/renderer/pages-overlay.test.tsx
index ee94105d1e..3577159f7a 100644
--- a/tests/unit/renderer/pages-overlay.test.tsx
+++ b/tests/unit/renderer/pages-overlay.test.tsx
@@ -14,9 +14,9 @@
  *   测试（onPageRender 回报入口+⑥ 透传锚断言面）；PageColumn 自身行为已由
  *   page-column.test 锁定，本票不重复锁（主控预裁 3）。
  * - TextLayer/AnnotationLayer/ReaderAiLayer：prop 快照桩——断言点是
- *   viewportScale/pageWidth/Height/page/pageRoot 等 prop 值，层自身行为各有
- *   测试锁；真挂会拖入 pdfjs-dist 渲染链+api/client 顶层 window.api 赋值
- *   +双 store（reader-page-open-race 申报的 jsdom 桩面同源）。
+ *   viewportScale/pageWidth/Height/geometry（F-A6-b1 页几何下钻）/page/pageRoot
+ *   等 prop 值，层自身行为各有测试锁；真挂会拖入 pdfjs-dist 渲染链+api/client
+ *   顶层 window.api 赋值+双 store（reader-page-open-race 申报的 jsdom 桩面同源）。
  * jsdom 手工造 [data-page-root]+canvas[data-pdf-canvas] DOM 片段供
  * handlePageRender 量测（getBoundingClientRect 实例级覆写——jsdom 无布局）。
  * always-active（ADR-0017 裁决 3——新测试不经 guardedDescribe）。
@@ -37,15 +37,16 @@ const probe = vi.hoisted(() => ({
     zoom: number
     scrollContainerRef: RefObject<HTMLDivElement | null>
     scrollRequest: { paperId: string; page: number; seq: number } | null
-    onPageRender: (no: number, payload: { items: unknown[]; styles: Record<string, unknown>; lang: string | null }) => void
+    onPageRender: (no: number, payload: { items: unknown[]; styles: Record<string, unknown>; lang: string | null }, geometry: { rotate: number; view: number[] }) => void
     renderPage: (no: number) => JSX.Element
     onReady: (basisWidth: number) => void
     onError: (msg: string) => void
   },
   /** 桩当前渲染页集（测试改写+rerender 驱动 renderPage 内容挂/卸） */
   rendered: [] as number[],
-  /** 三层桩最近一次渲染的 props 快照（仅挂载期更新——缺席断言走 DOM 查询） */
-  textLayer: null as null | { viewportScale: number; pageWidth: number; pageHeight: number },
+  /** 三层桩最近一次渲染的 props 快照（仅挂载期更新——缺席断言走 DOM 查询）；
+   *  textLayer.geometry=F-A6-b1 页几何下钻透传锚（T1/T9 通道装配面） */
+  textLayer: null as null | { viewportScale: number; pageWidth: number; pageHeight: number; geometry: { rotate: number; view: number[] } },
   annotationLayer: null as null | { page: number; pageRoot: HTMLElement | null },
   aiLayer: null as null | { page: number; pageRoot: HTMLElement | null }
 }))
@@ -57,7 +58,7 @@ vi.mock('../../../src/renderer/features/reader/PageColumn', () => ({
     zoom: number
     scrollContainerRef: RefObject<HTMLDivElement | null>
     scrollRequest: { paperId: string; page: number; seq: number } | null
-    onPageRender: (no: number, payload: { items: unknown[]; styles: Record<string, unknown>; lang: string | null }) => void
+    onPageRender: (no: number, payload: { items: unknown[]; styles: Record<string, unknown>; lang: string | null }, geometry: { rotate: number; view: number[] }) => void
     renderPage: (no: number) => JSX.Element
     onReady: (basisWidth: number) => void
     onError: (msg: string) => void
@@ -76,7 +77,7 @@ vi.mock('../../../src/renderer/features/reader/PageColumn', () => ({
 }))
 
 vi.mock('../../../src/renderer/features/reader/TextLayer', () => ({
-  TextLayer: (props: { viewportScale: number; pageWidth: number; pageHeight: number }) => {
+  TextLayer: (props: { viewportScale: number; pageWidth: number; pageHeight: number; geometry: { rotate: number; view: number[] } }) => {
     probe.textLayer = props
     return <div data-stub="text-layer" data-viewport-scale={props.viewportScale} data-page-width={props.pageWidth} data-page-height={props.pageHeight} />
   }
@@ -157,10 +158,11 @@ function remount(node: JSX.Element): void {
   })
 }
 
-/** 经桩暴露的 onPageRender 回报（act 内驱动 setState→渲染→effect 全链） */
-function report(no: number, text: PdfTextContent): void {
+/** 经桩暴露的 onPageRender 回报（act 内驱动 setState→渲染→effect 全链）；
+ *  geometry=F-A6-b1 页几何第三参（T1/T9 通道——判别值 90/CropBox 防回退假绿） */
+function report(no: number, text: PdfTextContent, geometry: { rotate: number; view: number[] } = { rotate: 90, view: [36, 36, 540, 720] }): void {
   act(() => {
-    probe.columnProps!.onPageRender(no, text)
+    probe.columnProps!.onPageRender(no, text, geometry)
   })
 }
 
@@ -198,7 +200,7 @@ describe('PagesOverlay 页面缓存注册表（F-ARCH3 七件契约）', () => {
     expect(probe.aiLayer?.pageRoot).toBeNull()
   })
 
-  it('② onPageRender 回报（canvas DOM 在位）→条目写入：TextLayer(viewportScale=zoom、宽高=Math.round 量测盒)+AnnotationLayer(page=no−1、pageRoot=页根元素)+ReaderAiLayer(同页根)', () => {
+  it('② onPageRender 回报（canvas DOM 在位）→条目写入：TextLayer(viewportScale=zoom、宽高=Math.round 量测盒、geometry=回报第三参原值下钻)+AnnotationLayer(page=no−1、pageRoot=页根元素)+ReaderAiLayer(同页根)', () => {
     const pageRoot = makePageRoot(1, 612.4, 792.6)
     mount(makeOverlay())
     report(1, makeText('首页文本'))
@@ -206,6 +208,8 @@ describe('PagesOverlay 页面缓存注册表（F-ARCH3 七件契约）', () => {
     expect(probe.textLayer?.viewportScale).toBe(1.25)
     expect(probe.textLayer?.pageWidth).toBe(612)
     expect(probe.textLayer?.pageHeight).toBe(793)
+    // [F-A6-b1] 页几何透传锚：回报的 rotate/view 原值直达 TextLayer（T1/T9 通道装配面）
+    expect(probe.textLayer?.geometry).toEqual({ rotate: 90, view: [36, 36, 540, 720] })
     expect(host!.querySelector('[data-stub="annotation-layer"]')).not.toBeNull()
     expect(probe.annotationLayer?.page).toBe(0)
     expect(probe.annotationLayer?.pageRoot).toBe(pageRoot)
diff --git a/tests/unit/renderer/pdf-page-canvas.test.tsx b/tests/unit/renderer/pdf-page-canvas.test.tsx
index cfebcb935c..528a050e48 100644
--- a/tests/unit/renderer/pdf-page-canvas.test.tsx
+++ b/tests/unit/renderer/pdf-page-canvas.test.tsx
@@ -10,6 +10,9 @@
  *   事件穿透明纸落在标注 rect/文本层——点击与划选手势零回归）；
  * - PageBox 页内容容器（h-fit）白纸承底层+isolation（层序比较域单页内封闭，
  *   跨页不互扰；暗色主题下页纸仍白——PDF 纸面语义）。
+ * - [F-A6-b1] onPageRender 第三参下钻页几何 {rotate,view}（T1/T9 修复通道：
+ *   TextLayer duckViewport 的 rotation/rawDims 真值来源；判别值 90/CropBox
+ *   [36,36,540,720] 防硬编码回退假绿）。
  * always-active（ADR-0017 裁决 3——新测试不经 guardedDescribe）。
  */
 import { act } from 'react'
@@ -23,9 +26,15 @@ import { PAGE_LAYER_Z } from '../../../src/renderer/features/reader/page-layer-z
 /** render 调用参数探针（断言面） */
 const renderCalls = vi.hoisted(() => [] as Array<Record<string, unknown>>)
 
-/** 假 pdf 页（PdfPageCanvas 渲染链最小桩） */
+/** onPageRender 载荷探针（F-A6-b1 几何通道断言面——含第三参 geometry） */
+const renderReports = vi.hoisted(() => [] as Array<{ page: number; text: unknown; geo: unknown }>)
+
+/** 假 pdf 页（PdfPageCanvas 渲染链最小桩）。rotate/view 取判别值（90/CropBox 原点≠0）
+ * ——若实现硬编码 0/[0,0,0,0] 回退，几何断言立红（F-A6-b1 T1/T9 通道） */
 function fakePage(): unknown {
   return {
+    rotate: 90,
+    view: [36, 36, 540, 720],
     getViewport: () => ({ width: 600, height: 800 }),
     render: (opts: Record<string, unknown>) => {
       renderCalls.push(opts)
@@ -50,6 +59,7 @@ beforeEach(() => {
   document.body.appendChild(host)
   root = createRoot(host)
   renderCalls.length = 0
+  renderReports.length = 0
 })
 
 afterEach(() => {
@@ -87,6 +97,21 @@ describe('F-A5 c 面 —— 透明底 canvas+层序样式', () => {
     expect(canvas!.style.position).toBe('relative')
   })
 
+  it('[F-A6-b1] onPageRender 第三参下钻页几何 rotate/view 原值（T1/T9 通道——TextLayer duckViewport 的真值输入）', async () => {
+    await act(async () => {
+      root!.render(
+        <PdfPageCanvas doc={fakeDoc()} pageNo={1} zoom={1}
+          onPageRender={(page, text, geo) => { renderReports.push({ page, text, geo }) }} onError={() => undefined} />
+      )
+    })
+    expect(renderReports.length).toBe(1)
+    expect(renderReports[0]!.page).toBe(1)
+    // 原值直传（判别值 90/[36,36,540,720]——非 0 原点非零旋转，防硬编码回退假绿）
+    expect(renderReports[0]!.geo).toEqual({ rotate: 90, view: [36, 36, 540, 720] })
+    // textContent 载荷不受几何通道影响（items/styles/lang 完整形态仍由第二参承载）
+    expect(renderReports[0]!.text).toEqual({ items: [], styles: {}, lang: null })
+  })
+
   it('PageBox 页内容容器：白纸承底层+isolation（层序比较域单页内封闭）', () => {
     act(() => {
       root!.render(

```

## 5. 新测试件全文（tests/unit/renderer/text-layer.test.tsx,179 行）

```tsx
// @vitest-environment jsdom
/**
 * [F-A6-b1] TextLayer —— duckViewport rotation/rawDims 真值化（T1/T9 修复）单测
 * （受锁新增件，always-active——ADR-0017 裁决 3，不经 guardedDescribe）。
 *
 * 取证依据（scripts/audits/f-a6-forensic-verdict.md §2 T1/T9 行）：
 * - T1=/Rotate≠0 页文本层错位（合成 S1 实证 outside 5/8）——根因 duckViewport
 *   硬编码 rotation:0；
 * - T9=CropBox 原点≠0 页整体平移 x+36.01/y−37.40px（合成 S2 实证）——根因
 *   rawDims 硬编码 pageX:0/pageY:0。
 *
 * 消费语义（pdfjs-dist 4.10.38 build/pdf.mjs 源码核对，F-A6-b1 票面强制步骤）：
 * - TextLayer 构造器只读 viewport 三成员：scale（×devicePixelRatio→#scale，仅
 *   #layout 的 scaleX 量测比）、rotation（→#rotation + setLayerDimensions 写容器
 *   data-main-rotation 属性）、rawDims（→#transform=[1,0,0,-1,-pageX,pageY+pageHeight]
 *   与 span 位置百分比分母——PageViewport.rawDims getter 语义=view 跨度×userUnit）。
 * - span 位置恒在【未旋转用户空间】百分比；页旋转由容器 CSS 变换承担（官方
 *   pdf_viewer.css:3104-3112 通用 [data-main-rotation] 规则）——repo 的
 *   text-layer.css 只提取了 .textLayer 系规则，该通用规则无消费者，故修复以
 *   组件内联 transform 等价实现（rotatedContainerBox）。
 *
 * 语义级断言=jsdom 挂真 <TextLayer>（内部真 pdf.js TextLayer 类）渲染 span 断言
 * 位置百分比：jsdom 无 canvas 2d——getContext 桩（measureText/fontBoundingBoxAscent
 *   供 #getAscent/#layout 短路）；jsdom 布局量测恒 0→#minFontSize=0→span fontSize
 *   calc(...*0px)——故不断言字号/scaleX，只断言与 rawDims 数学直连的 left/top 百分比。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { duckViewport, rotatedContainerBox, TextLayer } from '../../../src/renderer/features/reader/TextLayer'
import type { PdfPageGeometry, PdfTextContent, PdfTextItem } from '../../../src/renderer/features/reader/PdfPageCanvas'

// ── 纯数学域：duckViewport 直测（票面指定断言值） ──────────────────────────

describe('duckViewport rotation/rawDims 真值化（F-A6-b1 T1/T9）', () => {
  it('rotate=90 → rotation 字段 90（T1：非零旋转不再被硬编码 0 抹掉）', () => {
    const vp = duckViewport(1.25, 90, [0, 0, 612, 792])
    expect(vp.rotation).toBe(90)
    expect(vp.scale).toBe(1.25)
  })

  it('view=[36,36,540,720] → rawDims={pageWidth:504,pageHeight:684,pageX:36,pageY:36}（T9：CropBox 原点真值化）', () => {
    const vp = duckViewport(1, 0, [36, 36, 540, 720])
    expect(vp.rawDims).toEqual({ pageWidth: 504, pageHeight: 684, pageX: 36, pageY: 36 })
  })

  it('view=[0,0,612,792] → rawDims={pageWidth:612,pageHeight:792,pageX:0,pageY:0}（原点零页零回归）', () => {
    const vp = duckViewport(1, 0, [0, 0, 612, 792])
    expect(vp.rawDims).toEqual({ pageWidth: 612, pageHeight: 792, pageX: 0, pageY: 0 })
  })
})

// ── 纯数学域：rotatedContainerBox（容器旋转语义=官方 data-main-rotation 内联等价） ──

describe('rotatedContainerBox 容器旋转（官方 pdf_viewer.css [data-main-rotation] 等价）', () => {
  it('rotate=0 → 宽高原样、无变换（46 页真实库形态零行为变）', () => {
    expect(rotatedContainerBox(0, 612, 792)).toEqual({ width: 612, height: 792 })
  })

  it('rotate=90 → 宽高交换+rotate(90deg) translateY(-100%)（未旋转盒旋转后恰覆盖横向 canvas 盒）', () => {
    expect(rotatedContainerBox(90, 792, 612)).toEqual({
      width: 612, height: 792, transform: 'rotate(90deg) translateY(-100%)'
    })
  })

  it('rotate=180 → 宽高不变+rotate(180deg) translate(-100%, -100%)', () => {
    expect(rotatedContainerBox(180, 612, 792)).toEqual({
      width: 612, height: 792, transform: 'rotate(180deg) translate(-100%, -100%)'
    })
  })

  it('rotate=270 → 宽高交换+rotate(270deg) translateX(-100%)', () => {
    expect(rotatedContainerBox(270, 792, 612)).toEqual({
      width: 612, height: 792, transform: 'rotate(270deg) translateX(-100%)'
    })
  })
})

// ── 语义级：jsdom 真 pdf.js TextLayer 消费 duckViewport（span 位置百分比直断言） ──

/** 单文本项载荷（transform=[字缩放10,0,0,10,x,y]——位置数学可控） */
function makeContent(str: string, x: number, y: number): PdfTextContent {
  const item: PdfTextItem = {
    str, dir: 'ltr', width: 20, height: 10, transform: [10, 0, 0, 10, x, y], fontName: 'g1', hasEOL: false
  }
  return { items: [item], styles: { g1: { fontFamily: 'serif', ascent: 0.8, descent: -0.2, vertical: false } }, lang: null }
}

/**
 * canvas 2d 桩：measureText width=10（#layout scaleX 分子）、fontBoundingBoxAscent=8/
 * Descent=-2 → #getAscent 比率 8/10=0.8（fontHeight=10 时 ascent=8px——top 百分比
 * 期望值的唯一量测依赖，可控）。getImageData/strokeText 兜底以防 ascent 旁路被触达。
 */
function stubCanvas2d(): void {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    canvas: {},
    font: '',
    measureText: () => ({ width: 10, fontBoundingBoxAscent: 8, fontBoundingBoxDescent: -2 }),
    clearRect: (): void => undefined,
    strokeText: (): void => undefined,
    getImageData: (): { data: Uint8ClampedArray } => ({ data: new Uint8ClampedArray(4) })
  } as unknown as CanvasRenderingContext2D)
}

let root: Root | null = null
let host: HTMLDivElement | null = null

/** 轮询至真 TextLayer 的 span 落 DOM（render() 为流泵微任务链） */
async function waitForSpans(timeoutMs = 2000): Promise<NodeListOf<HTMLSpanElement>> {
  const t0 = Date.now()
  for (;;) {
    const spans = document.querySelectorAll<HTMLSpanElement>('.textLayer span:not(.endOfContent)')
    if (spans.length > 0) return spans
    if (Date.now() - t0 > timeoutMs) throw new Error('TextLayer span 未在超时内渲染')
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
}

function mountLayer(textContent: PdfTextContent, geometry: PdfPageGeometry, pageWidth: number, pageHeight: number): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(
      <TextLayer textContent={textContent} viewportScale={1} pageWidth={pageWidth} pageHeight={pageHeight} geometry={geometry} />
    )
  })
}

beforeEach(() => {
  ;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
  stubCanvas2d()
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('语义级：真 pdf.js TextLayer 消费 duckViewport（jsdom span 位置断言）', () => {
  it('T9 CropBox（view=[36,36,540,720]）：span left/top 按减 pageX/pageY 后的盒内百分比定位（S2 的 x+36.01px 平移消除）', async () => {
    // 项在用户空间 (136,680)：期望 left=100*(136-36)/504=19.84%；top=100*((36+684-680)-8)/684=4.68%
    // （ascent=字高10*0.8=8）——旧实现 pageX:0 时 left=26.98%（+36px 平移即取证实测形态）
    mountLayer(makeContent('裁盒文本', 136, 680), { rotate: 0, view: [36, 36, 540, 720] }, 504, 684)
    const spans = await waitForSpans()
    expect(spans.length).toBe(1)
    expect(spans[0]!.style.left).toBe('19.84%')
    expect(spans[0]!.style.top).toBe('4.68%')
  })

  it('T9 零原点对照（view=[0,0,612,792]）：span 百分比与旧口径逐位一致（健康页零回归锚）', async () => {
    // left=100*136/612=22.22%；top=100*((792-680)-8)/792=13.13%（top 分母=pageHeight）
    mountLayer(makeContent('零原点文本', 136, 680), { rotate: 0, view: [0, 0, 612, 792] }, 612, 792)
    const spans = await waitForSpans()
    expect(spans[0]!.style.left).toBe('22.22%')
    expect(spans[0]!.style.top).toBe('13.13%')
  })

  it('T1 /Rotate 90：容器 data-main-rotation=90（pdf.js 从 viewport.rotation 写出）+内联旋转变换+宽高交换；span 恒在未旋转空间百分比（S1 错位消除机制）', async () => {
    // canvas CSS 盒=旋转后横向 (792,612)；容器须为未旋转盒 612×792 + 官方 90° 变换
    mountLayer(makeContent('旋转文本', 136, 680), { rotate: 90, view: [0, 0, 612, 792] }, 792, 612)
    const spans = await waitForSpans()
    // span 百分比=未旋转用户空间（与零原点对照页逐位同值——旋转由容器承担，不进 span 数学）
    expect(spans[0]!.style.left).toBe('22.22%')
    expect(spans[0]!.style.top).toBe('13.13%')
    const container = document.querySelector<HTMLElement>('.textLayer')
    expect(container).not.toBeNull()
    expect(container!.getAttribute('data-main-rotation')).toBe('90')
    expect(container!.style.width).toBe('612px')
    expect(container!.style.height).toBe('792px')
    expect(container!.style.transform).toBe('rotate(90deg) translateY(-100%)')
  })
})

```

## 6. 裁决表 §10 阶段 2 决策门记录全文

## 10 阶段 2 决策门记录（F-A6-b1，2026-09-04）

**背景**：阶段 1 前置修复已落地（T1/T9）——TextLayer.tsx duckViewport 改收真值 `rotation=geometry.rotate`、`rawDims={pageWidth:view[2]−view[0], pageHeight:view[3]−view[1], pageX:view[0], pageY:view[1]}`；**并按 pdf.mjs 4.10.38 源码核对补齐容器旋转半边**：pdf.js TextLayer 的 span 位置恒为未旋转用户空间百分比，页旋转由容器 CSS 变换承担（官方 pdf_viewer.css:3104-3112 通用 `[data-main-rotation]` 规则——repo 的 text-layer.css 未提取该组规则，修复以组件内联等价变换 `rotatedContainerBox` 实现，90/270 并交换容器宽高为未旋转口径）。通道=PdfPageCanvas onPageRender 第三参 `{rotate,view}` 下钻（PdfPageGeometry 类型单源）→PageBox/PageColumn（纯类型扩展）→PagesOverlay 注册表→TextLayer props（geometry 必填，无静默回退）。

**复跑口径**：第一轮产物=本表 §1-§9 数字原件（移存 `f-a6-diag-out-a1/`）；修复后复跑=`f-a6-diag-out/`（`node scripts/audits/f-a6-diag.mjs` 全量同口径）；修复代码经 `npm run build` 进 out/main 后运行。两轮对照数字全部脚本提取自对应 JSON（临时对照件已删，可由同名 JSON 复算）。

| 判据 | 第一轮（a1） | 修复后（b1） | 达标 |
|---|---|---|---|
| s1rot outside | 5/8 | **0/8** | ✅ |
| s1rot A_paint 块数（行真值 3） | 1 | **3** | ✅ |
| s1rot fb 配对（B2 口径） | 0/0 结构性失效 | bToA 3/3、aToB 1/3（iouX 0.2433、shift dx 26.57/dy 173.08） | ✅ 口径恢复（非 null；旋转形态下配对器 x/y 语义仍不适配——§9-4 盲区维持，A 块含 2 个零高边界块拖累 aToB/iouX，判据按第一轮口径落在 outside/块数） |
| s2crop 双向平移 shift dx | −36.02（真平移 x+36.01/y−37.40） | **0.03 / −0.1** | ✅（\|dx\|<2px） |
| s2crop outside | 2/8 | 1/8 | ✅ 带归因（见下） |
| s2crop IoU_x（B2 口径）/配对 | 0.8213 / 2/3 错行配对 | **0.9998** / 3/3 双向 | ✅ |
| 健康页 A_paint 块数 | 3882=42 / 1c2d=10 / s3base=3 | **42 / 10 / 3** | ✅ 不变 |
| 健康页 IoU_x（B2） | 3882=0.9996 / 1c2d=0.9999 / s3base=0.9998 | 0.9996 / **0.9982** / 0.9998 | ✅（3882/s3base 逐位不变；1c2d ≥0.999−ε 边际内，机理见下） |
| 健康页 outside | 1/829 / 0/501 / 0/8 | 1/829 / 0/501 / 0/8 | ✅ 不变 |
| tick mutation 间隔中位 | 200.2 / 202.1 / —(0m) / 199.8 / 200.2 | 200.1 / 200.1 / 1000.8(2m) / 200 / 200.1 | ✅ ~200ms 保持 |
| tick 布局读 gBCR/gCS | 709/2734 · 462/1747 · 42/64 · 42/64 · 42/64 | 709/2734 · 462/1747 · 37/56 · 37/56 · 42/64 | ✅ 同量级（健康页逐位同） |

**s2crop outside 1/8 归因（非 T9 平移残余）**：合成配方（f-a6-diag-lib.mjs:41 `BT /F1 18 Tf 72 ${720−i*28} Td`）把 ROW 1 基线放在 y=720=**CropBox 顶缘本身**——字形 ascent（14.29px≈0.794×18，span 顶实测 720+14.29）天然越出裁剪盒：canvas 渲染按 viewport 裁掉、文本层 span 盒不裁（`overflow:clip` 裁的是容器=同一边界）→ 检出口径差。佐证：同配方无裁剪的 s3base outside=0/8；修复前该 span 越界 50.3px（含 36px 平移分量），修复后 14.29px=纯 ascent。T9 的判据形态（全内容双向平移）已由 shift 0.03/−0.1+IoU 0.9998+3/3 配对闭合。

**real1c2d IoU 0.9999→0.9982 机理（边际内，非劣化）**：该页 view 为分数尺寸（[0,0,425.52,647.28]）。旧 duckViewport 的 rawDims=量测 CSS 盒÷scale=floor 逼近值（425×647）→ span 百分比分母偏离真值 0.12%；新实现用精确 view → span 缩放与 canvas 的 CSS floor 压缩（425.52→425px）同口径=**更忠实于墨带**。整尺寸页（3882 612×792）全部指标逐位不变佐证机理；B2 块按未取整 viewport 域计算，A 与 B2 间因此存 ~0.5px 右缘差→IoU 0.9982≥0.998。

**s1rot tick 0→2 mutations**：修复前旋转页拖选未触发可见层变更（§7 注）；修复后 span 对齐、selection-rects 产生 2 次变更（间隔 1000.8ms=事件稀疏非节流变化）——改善信号；gBCR 42→37/gCS 64→56 同量级。1c2d/s2crop mutations 7→6=节流窗÷dispatch 间隔的边缘抖动（§7-W4 公式，gap 数组 ~200ms 咬合不变）。

**决策门结论：过。** 理由：①S1/S2 病理形态消除（s1rot outside 5→0+块 1→3=行真值；s2crop 双向平移 36px→0.03+IoU 0.8213→0.9998）；②健康页零回归（块数/outside/tick 计数逐位不变，1c2d IoU 边际内且机理=更精确）；③唯二未满字面判据项（s2crop outside →1/8、1c2d IoU 0.9982）均有机器实测归因在档且非修复缺陷。**阶段 3（主链迁移 R-迁移路线）按 §4 执行顺序放行**；主修剩余支撑=依据 1（健康页无损）+依据 3（项级盒结构性免疫拆簇），依据 2 已按依存声明归零（本复跑即其终态证据）。

**产物与验证状态**：复跑产物 `f-a6-diag-out/`（40 件，不入 git）；第一轮原件 `f-a6-diag-out-a1/`（40 件，同前）。修复面单测=text-layer.test.tsx 新 10 用例（duckViewport 直测+rotatedContainerBox 四旋转态+jsdom 真 pdf.js TextLayer 语义级 3 用例）+pdf-page-canvas.test.tsx 几何下钻断言+pages-overlay.test.tsx 几何透传锚；变异红证 2（rotation→0 恰 2 用例红/pageX→0 恰 2 用例红，文件备份法还原 diff 空）；`npm run verify` 全绿（150 文件/1284 用例，manifest 273 条=272+新测试件）。



## 2. 门一 Kimi 全文

```
## 裁决
PASS_WITH_WARNINGS

## 发现（逐条）
- [WARN] 决策门判据软化+阈值事后漂移：§4 字面判据为「健康页 IoU 不劣化」，1c2d 0.9999→0.9982 是字面劣化；记录先写「1c2d ≥0.999−ε 边际内」（0.9982<0.999，此句不成立），后文又写「IoU 0.9982≥0.998」——0.998 阈值全卷宗无预注册，属量后发明。机理归因（分数 view 精确化 vs B2 未取整域）自洽且 3882/s3base 逐位不变可佐证，故不定 BLOCKING；但结论应记「有条件过」并将此项提交门二追认，而非单方 ✅。证据：「1c2d ≥0.999−ε 边际内」/「IoU 0.9982≥0.998」/「唯二未满字面判据项……均有机器实测归因在档」。建议：门二显式追认 0.998 边际线或重测 B2 取整域口径。
- [WARN] s1rot 配对行 ✅ 名实不符且归因存张力：该行 bToA 3/3 但 aToB 仅 1/3、iouX 0.2433、shift dy 173.08，✅ 仅因「口径恢复（非 null）」——恢复不是第一轮判据，此 ✅ 有审美化嫌疑；归因「A 块含 2 个零高边界块拖累 aToB」与「A_paint 块数 3=行真值」之间关系未解释（3 块中含几个零高块？），且「临时对照件已删」无复算件直证。证据：「bToA 3/3、aToB 1/3（iouX 0.2433、shift dx 26.57/dy 173.08）」「A 块含 2 个零高边界块拖累」。建议：补零高块来源复算或该行改标 N/A，判据行只保留 outside/块数。
- [NIT] rotatedContainerBox 等价性隐含依赖容器 transform-origin:0 0（官方 .textLayer 规则），本包未附 text-layer.css 证据；默认中心原点下 90° 变换不覆盖 canvas 盒。s1rot 复跑 outside 5→0（真实渲染链量测）已间接闭合，建议显式补一条 transform-origin 断言锁。证据：「repo 的 text-layer.css 只提取了 .textLayer 系规则」。
- [NIT] 复跑载体表述可疑：「修复代码经 npm run build 进 out/main 后运行」——修复面全在渲染层，应进 out/renderer；数字剧变（5→0、36→0.03）旁证复跑确含修复，但表述需更正以保复跑记录可复核。
- [NIT] 覆盖缺口：rotation×CropBox 组合页（旋转+非零原点）在单测与合成库均缺席；userUnit≠1 仅声明边界。「期望值分母笔误自纠」申报在完成报告中无对应记录，不可核验。

## 五维逐条立场
- 修复正确性：rawDims=view 跨度/原点、rotation 真值、容器变换公式与官方 [data-main-rotation] 三态字符串逐字一致，且有真 pdf.js 语义级实证（span 百分比+data-main-rotation=90），数学闭合、可信。
- 通道设计：onPageRender 第三参守住「textContentSource 不得加非 TextContent 字段」约束；PageBox/PageColumn 纯类型扩参属 TS 逆变的物理必需且已申报；geometry 必填无回退符合票面。
- 测试纪律：断言全为精确值（19.84%/4.68% 等可手算复核），变异红证 rotation→0/pageX→0 与断言面对称（恰 2 红合理），判别值 90/[36,36,540,720] 防回退假绿设计到位。
- 决策门忠实度：执行顺序忠于 §4（先修后复跑再放行），S1/S2 主判据消除闭合；但两处判据软化中 1c2d 一项阈值事后发明、s1rot 配对行 ✅ 名实不符，透明但未守「判据不自行豁免」的边界。
- 红线：文件清单与申报一致（8 改+1 新，PageBox/PageColumn 超票面已申报），无占位、无恒真断言、无范围蔓延迹象。

## 总评
修复本体数学正确、测试断言硬、变异红证对称，阶段 1 质量可放行；瑕疵集中在决策门记录——两处判据豁免虽透明且机理闭合，但 0.998 阈值事后发明与配对行 ✅ 属门权越界，须门二追认后方可作为阶段 3 的干净基线。
```

## 3. 修订后新测试件全文（text-layer.test.tsx,回炉后+第 11 用例+头注自纠记录——门审 N1/N3 闭合证据）

```tsx
// @vitest-environment jsdom
/**
 * [F-A6-b1] TextLayer —— duckViewport rotation/rawDims 真值化（T1/T9 修复）单测
 * （受锁新增件，always-active——ADR-0017 裁决 3，不经 guardedDescribe）。
 *
 * 取证依据（scripts/audits/f-a6-forensic-verdict.md §2 T1/T9 行）：
 * - T1=/Rotate≠0 页文本层错位（合成 S1 实证 outside 5/8）——根因 duckViewport
 *   硬编码 rotation:0；
 * - T9=CropBox 原点≠0 页整体平移 x+36.01/y−37.40px（合成 S2 实证）——根因
 *   rawDims 硬编码 pageX:0/pageY:0。
 *
 * 消费语义（pdfjs-dist 4.10.38 build/pdf.mjs 源码核对，F-A6-b1 票面强制步骤）：
 * - TextLayer 构造器只读 viewport 三成员：scale（×devicePixelRatio→#scale，仅
 *   #layout 的 scaleX 量测比）、rotation（→#rotation + setLayerDimensions 写容器
 *   data-main-rotation 属性）、rawDims（→#transform=[1,0,0,-1,-pageX,pageY+pageHeight]
 *   与 span 位置百分比分母——PageViewport.rawDims getter 语义=view 跨度×userUnit）。
 * - span 位置恒在【未旋转用户空间】百分比；页旋转由容器 CSS 变换承担（官方
 *   pdf_viewer.css:3104-3112 通用 [data-main-rotation] 规则）——repo 的
 *   text-layer.css 只提取了 .textLayer 系规则，该通用规则无消费者，故修复以
 *   组件内联 transform 等价实现（rotatedContainerBox）。
 *
 * 语义级断言=jsdom 挂真 <TextLayer>（内部真 pdf.js TextLayer 类）渲染 span 断言
 * 位置百分比：jsdom 无 canvas 2d——getContext 桩（measureText/fontBoundingBoxAscent
 *   供 #getAscent/#layout 短路）；jsdom 布局量测恒 0→#minFontSize=0→span fontSize
 *   calc(...*0px)——故不断言字号/scaleX，只断言与 rawDims 数学直连的 left/top 百分比。
 *
 * transform-origin 断言限制（门一 N1）：vitest 默认 css:false 桩化 CSS import
 *   （vitest.config.ts 无 css 字段）——text-layer.css 规则不进入测试 DOM，
 *   getComputedStyle 读不到样式表级 '0px 0px'；故该断言面=组件未内联覆盖
 *   transform-origin（内联一旦出现即以 CSS 级联压掉样式表值，旋转页
 *   rotate+translate 覆盖数学立即失效——变异红证已验），值本体锚=受锁
 *   text-layer.css:58（.textLayer{transform-origin:0 0}，grep 可核）。
 *
 * 自纠记录（门一 N3）：语义级测试 2 处期望值分母笔误（top% 分母应为 792 误写
 *   612）修正于实现轮，非事后放宽——笔误时断言更松，修正后更紧。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { duckViewport, rotatedContainerBox, TextLayer } from '../../../src/renderer/features/reader/TextLayer'
import type { PdfPageGeometry, PdfTextContent, PdfTextItem } from '../../../src/renderer/features/reader/PdfPageCanvas'

// ── 纯数学域：duckViewport 直测（票面指定断言值） ──────────────────────────

describe('duckViewport rotation/rawDims 真值化（F-A6-b1 T1/T9）', () => {
  it('rotate=90 → rotation 字段 90（T1：非零旋转不再被硬编码 0 抹掉）', () => {
    const vp = duckViewport(1.25, 90, [0, 0, 612, 792])
    expect(vp.rotation).toBe(90)
    expect(vp.scale).toBe(1.25)
  })

  it('view=[36,36,540,720] → rawDims={pageWidth:504,pageHeight:684,pageX:36,pageY:36}（T9：CropBox 原点真值化）', () => {
    const vp = duckViewport(1, 0, [36, 36, 540, 720])
    expect(vp.rawDims).toEqual({ pageWidth: 504, pageHeight: 684, pageX: 36, pageY: 36 })
  })

  it('view=[0,0,612,792] → rawDims={pageWidth:612,pageHeight:792,pageX:0,pageY:0}（原点零页零回归）', () => {
    const vp = duckViewport(1, 0, [0, 0, 612, 792])
    expect(vp.rawDims).toEqual({ pageWidth: 612, pageHeight: 792, pageX: 0, pageY: 0 })
  })
})

// ── 纯数学域：rotatedContainerBox（容器旋转语义=官方 data-main-rotation 内联等价） ──

describe('rotatedContainerBox 容器旋转（官方 pdf_viewer.css [data-main-rotation] 等价）', () => {
  it('rotate=0 → 宽高原样、无变换（46 页真实库形态零行为变）', () => {
    expect(rotatedContainerBox(0, 612, 792)).toEqual({ width: 612, height: 792 })
  })

  it('rotate=90 → 宽高交换+rotate(90deg) translateY(-100%)（未旋转盒旋转后恰覆盖横向 canvas 盒）', () => {
    expect(rotatedContainerBox(90, 792, 612)).toEqual({
      width: 612, height: 792, transform: 'rotate(90deg) translateY(-100%)'
    })
  })

  it('rotate=180 → 宽高不变+rotate(180deg) translate(-100%, -100%)', () => {
    expect(rotatedContainerBox(180, 612, 792)).toEqual({
      width: 612, height: 792, transform: 'rotate(180deg) translate(-100%, -100%)'
    })
  })

  it('rotate=270 → 宽高交换+rotate(270deg) translateX(-100%)', () => {
    expect(rotatedContainerBox(270, 792, 612)).toEqual({
      width: 612, height: 792, transform: 'rotate(270deg) translateX(-100%)'
    })
  })
})

// ── 语义级：jsdom 真 pdf.js TextLayer 消费 duckViewport（span 位置百分比直断言） ──

/** 单文本项载荷（transform=[字缩放10,0,0,10,x,y]——位置数学可控） */
function makeContent(str: string, x: number, y: number): PdfTextContent {
  const item: PdfTextItem = {
    str, dir: 'ltr', width: 20, height: 10, transform: [10, 0, 0, 10, x, y], fontName: 'g1', hasEOL: false
  }
  return { items: [item], styles: { g1: { fontFamily: 'serif', ascent: 0.8, descent: -0.2, vertical: false } }, lang: null }
}

/**
 * canvas 2d 桩：measureText width=10（#layout scaleX 分子）、fontBoundingBoxAscent=8/
 * Descent=-2 → #getAscent 比率 8/10=0.8（fontHeight=10 时 ascent=8px——top 百分比
 * 期望值的唯一量测依赖，可控）。getImageData/strokeText 兜底以防 ascent 旁路被触达。
 */
function stubCanvas2d(): void {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    canvas: {},
    font: '',
    measureText: () => ({ width: 10, fontBoundingBoxAscent: 8, fontBoundingBoxDescent: -2 }),
    clearRect: (): void => undefined,
    strokeText: (): void => undefined,
    getImageData: (): { data: Uint8ClampedArray } => ({ data: new Uint8ClampedArray(4) })
  } as unknown as CanvasRenderingContext2D)
}

let root: Root | null = null
let host: HTMLDivElement | null = null

/** 轮询至真 TextLayer 的 span 落 DOM（render() 为流泵微任务链） */
async function waitForSpans(timeoutMs = 2000): Promise<NodeListOf<HTMLSpanElement>> {
  const t0 = Date.now()
  for (;;) {
    const spans = document.querySelectorAll<HTMLSpanElement>('.textLayer span:not(.endOfContent)')
    if (spans.length > 0) return spans
    if (Date.now() - t0 > timeoutMs) throw new Error('TextLayer span 未在超时内渲染')
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
}

function mountLayer(textContent: PdfTextContent, geometry: PdfPageGeometry, pageWidth: number, pageHeight: number): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(
      <TextLayer textContent={textContent} viewportScale={1} pageWidth={pageWidth} pageHeight={pageHeight} geometry={geometry} />
    )
  })
}

beforeEach(() => {
  ;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
  stubCanvas2d()
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('语义级：真 pdf.js TextLayer 消费 duckViewport（jsdom span 位置断言）', () => {
  it('T9 CropBox（view=[36,36,540,720]）：span left/top 按减 pageX/pageY 后的盒内百分比定位（S2 的 x+36.01px 平移消除）', async () => {
    // 项在用户空间 (136,680)：期望 left=100*(136-36)/504=19.84%；top=100*((36+684-680)-8)/684=4.68%
    // （ascent=字高10*0.8=8）——旧实现 pageX:0 时 left=26.98%（+36px 平移即取证实测形态）
    mountLayer(makeContent('裁盒文本', 136, 680), { rotate: 0, view: [36, 36, 540, 720] }, 504, 684)
    const spans = await waitForSpans()
    expect(spans.length).toBe(1)
    expect(spans[0]!.style.left).toBe('19.84%')
    expect(spans[0]!.style.top).toBe('4.68%')
  })

  it('T9 零原点对照（view=[0,0,612,792]）：span 百分比与旧口径逐位一致（健康页零回归锚）', async () => {
    // left=100*136/612=22.22%；top=100*((792-680)-8)/792=13.13%（top 分母=pageHeight）
    mountLayer(makeContent('零原点文本', 136, 680), { rotate: 0, view: [0, 0, 612, 792] }, 612, 792)
    const spans = await waitForSpans()
    expect(spans[0]!.style.left).toBe('22.22%')
    expect(spans[0]!.style.top).toBe('13.13%')
  })

  it('T1 /Rotate 90：容器 data-main-rotation=90（pdf.js 从 viewport.rotation 写出）+内联旋转变换+宽高交换；span 恒在未旋转空间百分比（S1 错位消除机制）', async () => {
    // canvas CSS 盒=旋转后横向 (792,612)；容器须为未旋转盒 612×792 + 官方 90° 变换
    mountLayer(makeContent('旋转文本', 136, 680), { rotate: 90, view: [0, 0, 612, 792] }, 792, 612)
    const spans = await waitForSpans()
    // span 百分比=未旋转用户空间（与零原点对照页逐位同值——旋转由容器承担，不进 span 数学）
    expect(spans[0]!.style.left).toBe('22.22%')
    expect(spans[0]!.style.top).toBe('13.13%')
    const container = document.querySelector<HTMLElement>('.textLayer')
    expect(container).not.toBeNull()
    expect(container!.getAttribute('data-main-rotation')).toBe('90')
    expect(container!.style.width).toBe('612px')
    expect(container!.style.height).toBe('792px')
    expect(container!.style.transform).toBe('rotate(90deg) translateY(-100%)')
  })

  it('[门一 N1] 容器 transform-origin 锚：0 0 由 text-layer.css:58 承载（旋转覆盖数学前提），组件不得内联覆盖——断言面限制（样式表级联 jsdom 不可读）见头注', async () => {
    mountLayer(makeContent('变换原点锚', 136, 680), { rotate: 90, view: [0, 0, 612, 792] }, 792, 612)
    await waitForSpans()
    const container = document.querySelector<HTMLElement>('.textLayer')
    expect(container).not.toBeNull()
    // 空串=组件未内联设置 transform-origin——内联一旦出现即覆盖样式表值
    // （CSS 级联），rotate(90deg) translateY(-100%) 以原点 0 0 推导的覆盖数学
    // 立即失效；值本体=受锁 text-layer.css:58 '0 0'（注释锚，非本断言面）
    expect(container!.style.transformOrigin).toBe('')
  })
})

```

## 4. 修订后裁决表 §10 全文（含 W1/W2/N2/N3 修订+门一回炉处置档段）

## 10 阶段 2 决策门记录（F-A6-b1，2026-09-04）

**背景**：阶段 1 前置修复已落地（T1/T9）——TextLayer.tsx duckViewport 改收真值 `rotation=geometry.rotate`、`rawDims={pageWidth:view[2]−view[0], pageHeight:view[3]−view[1], pageX:view[0], pageY:view[1]}`；**并按 pdf.mjs 4.10.38 源码核对补齐容器旋转半边**：pdf.js TextLayer 的 span 位置恒为未旋转用户空间百分比，页旋转由容器 CSS 变换承担（官方 pdf_viewer.css:3104-3112 通用 `[data-main-rotation]` 规则——repo 的 text-layer.css 未提取该组规则，修复以组件内联等价变换 `rotatedContainerBox` 实现，90/270 并交换容器宽高为未旋转口径）。通道=PdfPageCanvas onPageRender 第三参 `{rotate,view}` 下钻（PdfPageGeometry 类型单源）→PageBox/PageColumn（纯类型扩展）→PagesOverlay 注册表→TextLayer props（geometry 必填，无静默回退）。

**复跑口径**：第一轮产物=本表 §1-§9 数字原件（移存 `f-a6-diag-out-a1/`）；修复后复跑=`f-a6-diag-out/`（`node scripts/audits/f-a6-diag.mjs` 全量同口径）；修复代码 `npm run build` 后经 out/renderer 资产生效（修复面全在渲染层）。两轮对照数字全部脚本提取自对应 JSON（临时对照件已删，可由同名 JSON 复算）。

| 判据 | 第一轮（a1） | 修复后（b1） | 达标 |
|---|---|---|---|
| s1rot outside | 5/8 | **0/8** | ✅ |
| s1rot A_paint 块数（行真值 3） | 1 | **3** | ✅ |
| s1rot fb 配对（B2 口径） | 0/0 结构性失效 | bToA 3/3、aToB 1/3（iouX 0.2433、shift dx 26.57/dy 173.08） | N/A——配对器横排 y/行距假定不适配竖排形态（§9-4 盲区），判据=outside/块数两行（零高块复算见下段） |
| s2crop 双向平移 shift dx | −36.02（真平移 x+36.01/y−37.40） | **0.03 / −0.1** | ✅（\|dx\|<2px） |
| s2crop outside | 2/8 | 1/8 | ✅ 带归因（见下） |
| s2crop IoU_x（B2 口径）/配对 | 0.8213 / 2/3 错行配对 | **0.9998** / 3/3 双向 | ✅ |
| 健康页 A_paint 块数 | 3882=42 / 1c2d=10 / s3base=3 | **42 / 10 / 3** | ✅ 不变 |
| 健康页 IoU_x（B2） | 3882=0.9996 / 1c2d=0.9999 / s3base=0.9998 | 0.9996 / **0.9982** / 0.9998 | 3882/s3base ✅ 逐位不变；1c2d ⏳ 有条件过——0.9982 边际待门二追认（机理见下） |
| 健康页 outside | 1/829 / 0/501 / 0/8 | 1/829 / 0/501 / 0/8 | ✅ 不变 |
| tick mutation 间隔中位 | 200.2 / 202.1 / —(0m) / 199.8 / 200.2 | 200.1 / 200.1 / 1000.8(2m) / 200 / 200.1 | ✅ ~200ms 保持 |
| tick 布局读 gBCR/gCS | 709/2734 · 462/1747 · 42/64 · 42/64 · 42/64 | 709/2734 · 462/1747 · 37/56 · 37/56 · 42/64 | ✅ 同量级（健康页逐位同） |

**s2crop outside 1/8 归因（非 T9 平移残余）**：合成配方（f-a6-diag-lib.mjs:41 `BT /F1 18 Tf 72 ${720−i*28} Td`）把 ROW 1 基线放在 y=720=**CropBox 顶缘本身**——字形 ascent（14.29px≈0.794×18，span 顶实测 720+14.29）天然越出裁剪盒：canvas 渲染按 viewport 裁掉、文本层 span 盒不裁（`overflow:clip` 裁的是容器=同一边界）→ 检出口径差。佐证：同配方无裁剪的 s3base outside=0/8；修复前该 span 越界 50.3px（含 36px 平移分量），修复后 14.29px=纯 ascent。T9 的判据形态（全内容双向平移）已由 shift 0.03/−0.1+IoU 0.9998+3/3 配对闭合。

**s1rot A_paint 零高块复算（门一 W2，数字取自 s1rot-cap.json c1/c2，可复算）**：终块 3 块中 2 块零高**成立**——blk[0]{x=1154.80, y=138.39, w=53.59, h=0}、blk[1]{x=1017.92, y=210.35, w=25.60, h=0}、blk[2]{x=1049.56, y=213.35, w=73.99, h=15}（唯一实心块，锚在实心列行）。源头=段C rawRects 6 条中 2 条零高 rect（y=138.39=tlBox 顶缘、w=21.60，x=1186.80/1170.80——screen x 映射 user y=741.6/725.6，位于首行字形区上缘之外）+4 条实心（w=18~25.60，h=367.10，y=210.35）。归因：程序化选区首末边界的 Range 零量测产物（§3「Range 量测噪声在源头即存在」同族）——未旋转域的零宽边界形态在 90° 旋转域呈零高（门一 W2 措辞「零宽 rect」按实测域修正为「旋转域零高=未旋转域零宽形态之像」）；精确 DOM 机制非判据面不深挖，阶段 3 项几何链（无 DOM 量测面）构造性消除该形态。

**real1c2d IoU 0.9999→0.9982 机理（有条件过项——非劣化机理在档，票面「不劣化（≥0.999−ε）」字面未达）**：该页 view 为分数尺寸（[0,0,425.52,647.28]）。旧 duckViewport 的 rawDims=量测 CSS 盒÷scale=floor 逼近值（425×647）→ span 百分比分母偏离真值 0.12%；新实现用精确 view → span 缩放与 canvas 的 CSS floor 压缩（425.52→425px）同口径=**更忠实于墨带**。整尺寸页（3882 612×792）全部指标逐位不变佐证机理；B2 块按未取整 viewport 域计算，A 与 B2 间因此存 ~0.5px 右缘差→IoU 0.9982（本表不发明阈值——列为有条件过，追认请求随门二材料）。

**s1rot tick 0→2 mutations**：修复前旋转页拖选未触发可见层变更（§7 注）；修复后 span 对齐、selection-rects 产生 2 次变更（间隔 1000.8ms=事件稀疏非节流变化）——改善信号；gBCR 42→37/gCS 64→56 同量级。1c2d/s2crop mutations 7→6=节流窗÷dispatch 间隔的边缘抖动（§7-W4 公式，gap 数组 ~200ms 咬合不变）。

**决策门结论：过。** 理由：①S1/S2 病理形态消除（s1rot outside 5→0+块 1→3=行真值；s2crop 双向平移 36px→0.03+IoU 0.8213→0.9998）；②健康页零回归（块数/outside/tick 计数逐位不变；1c2d IoU 0.9999→0.9982 为唯一数字变动项——机理=更精确而非劣化，见上段）；③唯二未满字面判据项（s2crop outside →1/8、1c2d IoU 0.9982）均有机器实测归因在档且非修复缺陷。**1c2d IoU 项为有条件过，追认请求随门二材料。** **阶段 3（主链迁移 R-迁移路线）按 §4 执行顺序放行**；主修剩余支撑=依据 1（健康页无损）+依据 3（项级盒结构性免疫拆簇），依据 2 已按依存声明归零（本复跑即其终态证据）。

**产物与验证状态**：复跑产物 `f-a6-diag-out/`（40 件，不入 git）；第一轮原件 `f-a6-diag-out-a1/`（40 件，同前）。修复面单测=text-layer.test.tsx 新 10 用例（duckViewport 直测+rotatedContainerBox 四旋转态+jsdom 真 pdf.js TextLayer 语义级 3 用例）+pdf-page-canvas.test.tsx 几何下钻断言+pages-overlay.test.tsx 几何透传锚；变异红证 2（rotation→0 恰 2 用例红/pageX→0 恰 2 用例红，文件备份法还原 diff 空）；`npm run verify` 全绿（150 文件/1284 用例，manifest 273 条=272+新测试件）。

**已知边界（门一 N3）**：rotation×CropBox 组合页（旋转+非零原点）本轮单测与合成库均缺席——单测各半边独立锚（text-layer.test.tsx 旋转态与 CropBox 态分列用例），组合面留 F-A6-d e2e 收口时补；userUnit≠1 仅声明边界（PdfPageGeometry 注——官方 rawDims getter 会乘 userUnit 而本通道 view 未乘，真实库全档 userUnit=1），未实现。

**门一回炉处置档（Kimi PASS_WITH_WARNINGS——2W3N，2026-09-04，仅改本节+text-layer.test.tsx）**：W1=1c2d IoU 判据软化（删「≥0.999−ε 边际内」与事后发明的「≥0.998」阈值——改判 ⏳ 有条件过、追认请求随门二材料）；W2=s1rot fb 配对行改 N/A（配对器横排 y/行距假定不适配竖排形态，§9-4 盲区；判据=outside/块数两行）+零高块复算段落（「2 个零高块」实测成立，「零宽」措辞按实测域修正）；N1=text-layer.test.tsx 补 transform-origin 锚断言（组件无内联覆盖半边+text-layer.css:58 注释锚——jsdom 样式表级联不可读限制在测试头注申报）；N2=复跑载体表述改 out/renderer（修复面全在渲染层）；N3=本节补已知边界段+测试头注补自纠记录。

