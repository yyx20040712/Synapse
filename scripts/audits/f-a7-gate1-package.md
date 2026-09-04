# F-A7 ·门一审材料包（Kimi 链,零仓库接触）

你是门一对抗审查员。审 F-A7：PageColumn 页尺寸缓存旋转口径（/Rotate≠0 占位盒宽高交换缺失——F-A6-d 票外发现立案,门二 W2 立案回执）。你拿不到仓库,只审本包材料。

## 0. 上游（已门审在档,不重审）

F-A6 战役五票（a 取证/b1 T1T9 前置/b2 主链迁移/c 调度快路径/d 收口）全链双门审毕——d 票门一审发现「/Rotate≠0 页 [data-page-box] 占位盒未随旋转交换宽高（PageColumn page.view 未旋转口径 vs canvas getViewport 旋转口径）,selection 链不受影响,真实库全档 rotate=0 未显现」→ 主控立案 F-A7=本票。b1 已立 PdfPageGeometry 通道（rotate=page.rotate/view=page.view 直取,canvas 渲染 getViewport 默认吃 rotate）——本票修法与其同源。

## 1. 审查任务（工单 A~E）

- **A 母本符合度**：diff 是否逐条兑现票面五层规约+主控裁决①~⑥（下附简报全文）；范围=修改文件清单 4 文件+manifest。
- **B 宪法红线**：分层单向/禁新依赖/受锁文件 locks 流程（unlock→改→apply）/测试不放宽断言/e2e 断言可失败性（修前形态必红声明是否成立）/≤行数。
- **C 代码与测试质量**：交换数学正确性（归一化公式/运算优先级/?? 0 防御/mock 兼容）/单测断言真值性（style 断言 792px 与 onReady(792)）/e2e 断言力度（±2px 容差是否吞掉错配形态——修前差 >300px 声明）/变异红证有效性（删交换 3 红/翻条件 8 红含既有 rotate=0 面被保护）。
- **D 报告诚实性**：自裁申报完整性——最大自裁=组件 250 行上限压线（PageColumn 原已 249 行,quality 关卡拦过首版→循环段紧凑成 3 行,push 行 ~280 字符超长+头注增补内嵌段①行尾）——该紧凑化是否引入风险/可读性债务是否可接受/「后续任何行增即破线」疑虑的处置建议。
- **E 接缝与后续单**：pageSizes 语义变化（未旋转→viewport 口径）对消费面（columnWidthFor basisWidth/锚定总高/scroll-progress/SelectionLayer 挂载位/双页 layoutRows）的透明性声明是否成立;头注「不做：旋转页」→「手动旋转阅读」措辞澄清是否正当;e2e :925 参考系注释更新与 F-A6-d 既有断言的关系。

## 2. 实现者声明摘要（f-a7-impl.report.md 节选）

- verify 154 文件/1329 用例 exit=0;全量 e2e 42/42 零 skip（41 基线+1 新小票）;locks 277 两轮 unlock/apply 合规。
- 首红：3 failed（rotate=90/270/-90,expected '792px' received '612px'）|1326 passed——180 用例修前绿=数学必然（180 不交换=旧行为）,鉴别力由变异 B 补证。
- 变异红证×2（最终形态,备份还原 diff 空）：A 删交换分支=3 failed;B 交换条件翻转（===90→===0）=8 failed（4 新+4 既有 rotate=0 用例——缺省 0 值守卫面被保护）。
- 自裁申报：①组件 250 行上限压线→循环段紧凑 3 行（push 行 ~280 字符）+头注增补内嵌行尾;②180 修前绿的定性（非缺陷,数学必然）;③manifest 预期产物。

## 3. 主控已预裁项（可攻击,推翻需更强依据）

- 修法=rotate+view 直取+内联交换（禁 getViewport——mock 面扩大+先例一致性）;归一化 ((rotate%360)+360)%360;%180===90 交换。
- pageSizes 语义变化对纯函数消费面透明（columnWidthFor 等只吃数值）——fit-width 分母/锚定总高自动受益=修法意图。
- e2e 禁绝对像素值（fit-width ~1.63× 漂移）,用尺寸一致 ±2px+方向断言。
- 「不做：旋转页」=手动旋转阅读特性（P7+ 功能面）,F-A7 属 /Rotate 元数据适配（渲染正确性）——头注措辞澄清正当。

## 4. 票面简报全文（含五层规约与主控裁决①~⑥）

# F-A7 实现者简报——旋转页占位盒宽高交换缺失（PageColumn 页尺寸缓存旋转口径）

> 主控=GLM5.3；实现者=子代理（GLM5.3flash 定档，环境无 model 参数=统一档欠账披露）。
> 票：F-A7（registry open——F-A6-d 票外发现立案，d 票门二 W2 立案回执）。

## ① 身份与禁令

你是实现者子代理，领单 F-A7。**禁 git add/commit/push；禁翻 tickets/registry.ts
状态；禁碰控制面（docs/invariants.md / ADR / 交接书）**——这些归主控。卡点=
BLOCKED 停手报告，不自裁。你只改本简报「修改文件清单」列出的文件。

## ② 必读序（文件清单化，逐文件看）

1. `AGENTS.md` —— 宪法（硬规则/测试纪律/依赖与提交）。
2. 本简报 —— 完整任务书（含五层规约 §票面）。
3. `src/renderer/features/reader/PageColumn.tsx` —— **修改目标件**：段①就绪管线
   load 循环（:108-130，pageSizes 构造=缺陷位）；头注 :25「不做：…旋转页…」
   （接缝声明——见主控裁决③）。
4. `src/renderer/features/reader/PdfPageCanvas.tsx` :60-90,150-165 —— PdfPageGeometry
   通道先例（rotate=page.rotate / view=page.view 直取；canvas 渲染用
   getViewport({scale}) 默认吃 page.rotate）。
5. `src/renderer/features/reader/page-column-geometry.ts` —— PageBoxSize 定义+纯函数
   消费面（columnWidthFor/pageBoxHeight/layoutRows 只吃 width/height 数值，口径
   变化对其透明）。
6. `src/renderer/features/reader/PageBox.tsx` —— 页盒 DOM（外层 [data-page-box]
   尺寸=size×zoom vs 内层 canvas=viewport 口径——错配机制）。
7. `tests/unit/renderer/page-column.test.tsx` —— 单测宿主（makeDoc mock 形态
   :70-73 / 断言风格）。
8. `tests/e2e/reader-text.spec.ts` :860-955 —— F-A6-d 组合页小票先例（fixture
   用法/seedAndLaunch/断言风格；:925-929 参考系申报注释=F-A7 状态变化点）。
9. `tests/utils/pdf-factory.ts` :145-158 —— createRotatedCropPdf fixture
   （MediaBox [0 0 612 792] / CropBox [36 36 540 720] / Rotate 90 →
   view 口径 504×684，viewport 口径 684×504）。

## ③ 主控裁决（票面范围内澄清，实现者不再自裁）

1. **修法=rotate+view 直取+内联交换数学**：load 循环内取 `page.rotate`（`?? 0`
   防御——既有单测 mock 无 rotate 字段），归一化 `((rotate % 360) + 360) % 360`，
   归一值 `% 180 === 90` 时交换 view 宽高。**禁用 page.getViewport() 调用**——
   会让全部既有单测 mock 面扩大（mock 只返回 {view}），且项目先例（F-A6-b1
   PdfPageGeometry 通道 / b2 pdf-item-geometry 内联数学）已确立 rotate+view 直取
   模式。userUnit≠1 边界沿用 PdfPageGeometry 注释口径（真实库全档 userUnit=1，
   触发后另行扩展）。
2. **pageSizes 语义变化**：从「page.view 未旋转口径」→「viewport 旋转口径
   （scale=1）」。消费面（columnWidthFor 的 onReady basisWidth/锚定总高/
   pageBoxHeight）自动受益（与实际渲染盒一致）——这正是修法意图，非破坏。
3. **头注接缝归责**：PageColumn.tsx:25「不做：页内偏移进度/虚拟滚动/旋转页/
   跨页选区/持续 fit/手势 pinch」中的「旋转页」指**手动旋转阅读特性**（P7+
   功能面）；F-A7 属 /Rotate 元数据适配（渲染正确性）。头注该行措辞改为
   「手动旋转阅读」并在增补记录注一行 F-A7（日期+单号+一句话）。
4. **e2e 断言用尺寸一致/比值，禁绝对像素值**：打开文档默认 fit-width 缩放
   （F-A6-d 实测 canvas 宽 1116px=684×1.63），绝对值随容器宽漂移。断言
   [data-page-box] gBCR 与 canvas gBCR 宽高各自一致（±2px 容差，与 F-A6-d
   同口径）；可加方向断言（盒宽>盒高——横纸 684>504）。
5. **e2e 既有参考系注释更新**：reader-text.spec.ts :925-929「参考系申报」段
   落陈述「两者错配=票外既有布局缺陷…已申报主控另行立案」——F-A7 落地后
   状态变化：该段注释更新为「F-A7 已修复（页盒=viewport 旋转口径），页框与
   渲染盒一致；断言仍以 canvas 盒为判据域（渲染真盒）」。断言本身不改。
6. **单测 mock 扩展零破原则**：makeDoc 加可选 rotate 参（缺省 0），既有全部
   用例零改动零迁移；新用例走新参。若发现既有用例依赖未旋转口径的尺寸断言，
   停下报告（接缝归责，不顺手改）。

## ④ 纪律

- TDD：新单测**先红**（修 PageColumn 前跑新用例必红）→ 修 → 绿 → **变异红证**
  （交换条件翻转/删交换分支 → 新用例红 → 备份还原 → diff 空）。首红与每次
  变异的原始输出各自落盘 `.raw.txt` 后缀（`scripts/audits/f-a7-*.raw.txt`）；
  首红须全量套跑口径（npm run test 真退出码，禁裸 npx vitest，echo exit=$?
  落盘）。
- **多断言禁与行尾注释同置**（一行一断言或注释独占行）。
- 受锁文件（tests/unit/renderer/page-column.test.tsx、tests/e2e/reader-text.spec.ts）
  ：先 `npm run locks:unlock` → 改 → 即时 `npm run locks:apply`。无新受锁路径
  （两文件已在锁内，locks 数预期 277 不变）。
- e2e 跑法：`npm run build` 后 `npm run test:e2e`（新小票定向跑+全量 41+1=42
  零 skip 收口；若 F-ARCH4-M1（原 :872）偶红：同用例第 1 现记录指纹继续，第 2
  现停手报告——e2e 非确定失败立案线）。
- 禁新依赖；文件 ≤500 行；中文 UTF-8（写后验证可读）。
- 自产 .mjs 工具件（若有）诞生即 locks:generate+apply——本票预期无需。

## ⑤ 基线数字（自检参照）

- verify 基线：**154 文件 / 1325 用例 / locks 277**（v44 终态亲验）。
- 本票预期：单测 +3~4 用例（1328/1329）、e2e 42、locks 277 不变。
  落笔数字一律实测（机器输出），禁凭印象。
- 收口前 `npm run verify` 全绿真退出码落盘。

## ⑥ 报告契约

全文落 `scripts/audits/f-a7-impl.report.md`：实现摘要/文件清单/首红证据/
变异红证/测试证据（verify+e2e 退出码）/locks 实录/**自裁申报**（含删减面 diff
自查——与票面偏差逐条）/疑虑。**回复五行内**（摘要+证据档路径+BLOCKED 与否）。

---

## 票面五层规约（行为层规约含态空间）

**行为层**：
- 缺陷：/Rotate≠0 页 [data-page-box] 占位盒未随旋转交换宽高——PageColumn 段①
  pageSizes 用 page.view 未旋转口径（504×684），canvas 用 getViewport 旋转口径
  （684×504）→ 页框与渲染盒错配（canvas 横向溢出页盒/纵向底部空条）。
- 修复：pageSizes 构造按 viewport 旋转口径（rotate 归一化后 %180===90 交换宽高）。
- **态空间（不变——本票零状态机变更）**：PageColumn 布局态 loading→ready /
  error 终态不变；每页 empty→rendering→rendered→recycling→empty 不变；
  pageSizes 仅语义变化（width/height 数值口径），状态迁移表零变。
- 跨格序列零变：zoom 乘法缓存（getPage 不重取）/ 布局切换重报 onReady /
  IO 可见集 / 懒渲染窗口 / 缩放锚 totalHeight 全部照旧（消费 width/height 数值
  透明）。
- selection 几何链零涉及（F-A6-d 已证不受影响——块与 span 墨带贴合坐标证据在档）。

**接口层**：PageColumn props 零变；PageBoxSize 形状零变（width/height——
page-column-geometry.ts 接口注释补一行口径声明「viewport 旋转口径（F-A7）」）；
无新导出、无新文件。

**架构层**：分层不动；零新依赖；与 PdfPageGeometry 通道同源（rotate+view 直取
+内联数学——主控裁决①）。

**生命周期层**：/Rotate 元数据适配（渲染正确性），非手动旋转阅读特性（头注
澄清——主控裁决③）；真实库全档 rotate=0 未显现（低优先兑现，e2e 合成页守护）。

**文化层**：测试先红后绿+变异红证；e2e 断言渲染真值（gBCR 实测）非恒真；
计数数字实测落笔。

## 修改文件清单（超出即 BLOCKED 申报）

1. `src/renderer/features/reader/PageColumn.tsx` —— 核心修复（load 循环+头注两处）。
2. `src/renderer/features/reader/page-column-geometry.ts` —— PageBoxSize 注释
   口径声明（仅注释，逻辑零动）。
3. `tests/unit/renderer/page-column.test.tsx`（受锁）—— makeDoc 可选 rotate 参
   + 新 3~4 it（90 交换/180 不交换/270 交换/-90 归一化交换）。
4. `tests/e2e/reader-text.spec.ts`（受锁）—— F-A7 新小票（页盒与 canvas 盒
   宽高一致 ±2px+方向断言）+ :925-929 参考系注释更新（主控裁决⑤）。


## 5. diff 全文（git diff——4 文件+manifest,103+/16-）

```diff
diff --git a/locks/manifest.json b/locks/manifest.json
index db66b5b3ff..d80bd14942 100644
--- a/locks/manifest.json
+++ b/locks/manifest.json
@@ -1,5 +1,5 @@
 {
-    "generatedAt":  "2026-09-04T00:05:20.5947969Z",
+    "generatedAt":  "2026-09-04T00:32:55.1328375Z",
     "files":  [
                   {
                       "path":  ".github/workflows/ci.yml",
@@ -439,7 +439,7 @@
                   },
                   {
                       "path":  "tests/e2e/reader-text.spec.ts",
-                      "sha256":  "884e64bcbc1adbefbdd40ddac4fe247407d87287f56d6d7558f5ac659990c372"
+                      "sha256":  "521f2708f966eee53a5dcd6ff02b8732caf305d35dc24991d73bfbefa78f5d34"
                   },
                   {
                       "path":  "tests/e2e/seed-paper.mjs",
@@ -763,7 +763,7 @@
                   },
                   {
                       "path":  "tests/unit/renderer/page-column.test.tsx",
-                      "sha256":  "f3775f6ec2ee7ceb60c1a101c33b9d76061533e27ccd2b9746fdb006ec0d1fa7"
+                      "sha256":  "2ce2d41056601c520f59a8eb95a67df28766585fe242e4a92c14b5420c663a3f"
                   },
                   {
                       "path":  "tests/unit/renderer/pages-overlay.test.tsx",
diff --git a/src/renderer/features/reader/PageColumn.tsx b/src/renderer/features/reader/PageColumn.tsx
index 301ef0d23e..016bb6e435 100644
--- a/src/renderer/features/reader/PageColumn.tsx
+++ b/src/renderer/features/reader/PageColumn.tsx
@@ -11,7 +11,7 @@
  * 布局口径 basisWidth）；布局切换走轻 effect 重报 onReady（不重跑
  * getPage）；IO deps 增 layout（列↔行 DOM 重排后重挂）；段⑥锚总高按
  * 布局口径；懒渲染回收/scroll-progress 回写/程序滚动按页号消费零改。── 行为层：
- * - 段①页列就绪管线：doc 就绪→逐页 getPage→view 尺寸数组（缓存单源）→占位盒全列（总高确定）→onReady(列宽基准)→F-03 恢复 scrollTo；越界夹取锚本段（scrollToPage 前 clamp——openPaper 时 totalPages≡0 不可行）。
+ * - 段①页列就绪管线：doc 就绪→逐页 getPage→尺寸数组（缓存单源）→占位盒全列（总高确定）→onReady(列宽基准)→F-03 恢复 scrollTo；越界夹取锚本段（scrollToPage 前 clamp——openPaper 时 totalPages≡0 不可行）。[F-A7 增补 2026-09-04] 尺寸口径=viewport 旋转口径（rotate 归一化后 %180===90 交换宽高，/Rotate 元数据适配）。
  * - 段②占位盒布局：高=pageSizes[no]×zoom；宽=列宽（最宽页×zoom 居中；双页=各自页宽，行内左顶对齐）；未渲染盒空白。
  * - 段③懒渲染窗口：视口±1 页真渲染（canvas+覆盖层经 renderPage）；离屏>2 页销毁；IntersectionObserver 占位盒驱动（INV-30：canvas 生命周期=渲染窗口绑定）。
  * - 段④层实例化分工：覆盖层（TextLayer/AnnotationLayer/AiAnnotationLayer）经 renderPage(no) 每渲染页一套（props 不变父层循环）；SelectionLayer 单实例挂锚定页盒（锚定根动态归 F-02；挂载位=可见首报告）。
@@ -22,7 +22,7 @@
  * ── 接口层 ──
  * - props={doc,totalPages,zoom,layout?,renderWindow=1,recycleWindow=2,scrollContainerRef?,renderPage(no),onPageRender,onError,onReady(列宽基准),scrollRequest,onVisibleChange}；页盒布局+IO+回收调度+scrollToPage+缩放锚+页尺寸缓存单源。
  * ── 架构层 ── 分层不动；零新依赖；INV-01/29/30/33 语义全保持。
- * ── 生命周期层/文化层 ── 不做：页内偏移进度/虚拟滚动/旋转页/跨页选区/持续 fit/手势 pinch。测试=page-column+reader-double-page；e2e=reader-text/reader-scroll；真机=f-r1-verify.mjs。
+ * ── 生命周期层/文化层 ── 不做：页内偏移进度/虚拟滚动/手动旋转阅读/跨页选区/持续 fit/手势 pinch。测试=page-column+reader-double-page；e2e=reader-text/reader-scroll；真机=f-r1-verify.mjs。
  */
 import { useEffect, useLayoutEffect, useRef, useState } from 'react'
 import type { RefObject } from 'react'
@@ -110,9 +110,9 @@ export function PageColumn(props: {
       for (let no = 1; no <= totalPages; no += 1) {
         const page = await doc.getPage(no)
         if (cancelled) return
-        const view = page.view
-        // view=[x0,y0,x1,y1]（pdfjs 契约）；?? 0 兜底非法数组的防御位
-        sizes.push({ width: (view[2] ?? 0) - (view[0] ?? 0), height: (view[3] ?? 0) - (view[1] ?? 0) })
+        // [F-A7] viewport 旋转口径：view=[x0,y0,x1,y1] 契约与 ?? 0 防御位不变；rotate（?? 0 防御 mock 无 rotate 字段）归一化后 %180===90 时交换宽高（与 canvas getViewport 同源；内联数学先例 pdf-item-geometry；userUnit≠1 边界沿 PdfPageGeometry 口径）
+        const rot = ((page.rotate ?? 0) % 360 + 360) % 360
+        sizes.push(rot % 180 === 90 ? { width: (page.view[3] ?? 0) - (page.view[1] ?? 0), height: (page.view[2] ?? 0) - (page.view[0] ?? 0) } : { width: (page.view[2] ?? 0) - (page.view[0] ?? 0), height: (page.view[3] ?? 0) - (page.view[1] ?? 0) })
       }
       if (!cancelled) {
         setPageSizes(sizes)
diff --git a/src/renderer/features/reader/page-column-geometry.ts b/src/renderer/features/reader/page-column-geometry.ts
index 93ce07f220..e472772b2b 100644
--- a/src/renderer/features/reader/page-column-geometry.ts
+++ b/src/renderer/features/reader/page-column-geometry.ts
@@ -14,7 +14,9 @@
  *   ——INV/受锁测试消费面；PageLayout 类型单源驻本件）。
  */
 
-/** 页原始尺寸（pdf 用户空间，scale=1 基准——zoom 乘法在盒几何层） */
+/** 页原始尺寸（pdf 用户空间，scale=1 基准——zoom 乘法在盒几何层；F-A7 起=
+ *  viewport 旋转口径：/Rotate 归一化后 %180===90 页已交换宽高，与 canvas
+ *  渲染盒同口径——构造侧 PageColumn 段①单源归一，本件纯函数透明消费） */
 export interface PageBoxSize {
   width: number
   height: number
diff --git a/tests/e2e/reader-text.spec.ts b/tests/e2e/reader-text.spec.ts
index 076e198685..ff22312200 100644
--- a/tests/e2e/reader-text.spec.ts
+++ b/tests/e2e/reader-text.spec.ts
@@ -924,10 +924,9 @@ test('F-A6-d 组合页（/Rotate 90×/CropBox 非零原点）：文本层对齐
 
   // —— ③ 关键断言：块 gBCR 落渲染页盒（canvas 盒=textLayer 宿主纸盒——
   //    pixelBoxOf 归一化同盒，D1 右溢判据域）内（同帧取两盒——平移不变）。
-  //    参考系申报（F-A6-d 首跑红证发现）：/Rotate≠0 页上 [data-page-box] 占位
-  //    盒=page.view 未旋转口径（PageColumn 段①）而 canvas/纸盒=旋转交换口径，
-  //    两者错配=票外既有布局缺陷（真实库 46 页全 rotate=0 未显现；本票禁改
-  //    src——已申报主控另行立案，本断言以渲染页真盒为判据域）——
+  //    参考系申报（F-A7 已修复：PageColumn 段① pageSizes=viewport 旋转口径，
+  //    页框与 canvas/纸盒渲染盒一致——修前错配形态档 f-a6-forensic-verdict）；
+  //    断言仍以 canvas 盒为判据域（渲染真盒）——
   const geo = await win.evaluate(() => {
     const root = document.querySelector('[data-page-root]')
     const canvas = root?.querySelector('canvas[data-pdf-canvas]')?.getBoundingClientRect() ?? null
@@ -948,6 +947,41 @@ test('F-A6-d 组合页（/Rotate 90×/CropBox 非零原点）：文本层对齐
   await app.close()
 })
 
+/**
+ * [F-A7] 旋转页占位盒口径小票（PageColumn 段① pageSizes=viewport 旋转口径
+ * 的 e2e 收口——fixture 复用 F-A6-d 组合页）：修复前 [data-page-box] 占位盒=
+ * page.view 未旋转口径（504×684）而 canvas=getViewport 旋转口径（684×504）
+ * →canvas 横向溢出页盒+纵向底部空条（错配形态档 f-a6-forensic-verdict）；
+ * 修复后两者宽高各自一致（±2px 容差吞 floor 亚像素取整——与 F-A6-d 同口径；
+ * 绝对像素值随容器宽漂移故禁用，fit-width 默认缩放 ~1.63×）。方向断言=盒宽
+ * >盒高（viewport 口径横纸 684>504）；真实库全档 rotate=0 未显现，合成页
+ * 为唯一守护面（生命周期层——/Rotate 元数据适配非手动旋转阅读特性）。
+ */
+test('F-A7 旋转页（/Rotate 90）：占位盒与 canvas 渲染盒宽高一致（viewport 旋转口径）', async () => {
+  skipIfPending(F02_DEPS)
+  const title = '智慧水务 e2e 旋转页口径文献'
+  const { app } = await seedAndLaunch(title, createRotatedCropPdf())
+  const win = await app.firstWindow()
+  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
+  await win.getByText(title).first().dblclick()
+  await expect(win.getByText(PDF_ROTATED_CROP_TEXT).first()).toBeVisible({ timeout: 20_000 })
+
+  // 同帧取两盒（gBCR 实测——渲染真值非恒真断言）
+  const geo = await win.evaluate(() => {
+    const box = document.querySelector('[data-page-box]')?.getBoundingClientRect() ?? null
+    const canvas = document.querySelector('[data-page-root] canvas[data-pdf-canvas]')?.getBoundingClientRect() ?? null
+    if (box === null || canvas === null) return null
+    return { boxW: box.width, boxH: box.height, cvW: canvas.width, cvH: canvas.height }
+  })
+  expect(geo, '旋转页前提成立（占位盒与 canvas 均在场）').not.toBeNull()
+  // 修前形态=盒 504×684 vs canvas 684×504（fit-width ~1.63× 下差值 >300px 必红）
+  expect(Math.abs(geo!.boxW - geo!.cvW)).toBeLessThanOrEqual(2)
+  expect(Math.abs(geo!.boxH - geo!.cvH)).toBeLessThanOrEqual(2)
+  // 方向断言：viewport 口径横纸（宽>高——等比缩放不改变方向）
+  expect(geo!.boxW).toBeGreaterThan(geo!.boxH)
+  await app.close()
+})
+
 /**
  * [F-A6-d] 拖选随动小票（设计书 §5.3 可选项——票面裁量=锚；c 票门二放行条件
  * 的 e2e 面）：程序化连发 selectionchange（3 次、间隔 ~50ms、每轮选区末端 +1
diff --git a/tests/unit/renderer/page-column.test.tsx b/tests/unit/renderer/page-column.test.tsx
index 2dc01c13b4..1d92133495 100644
--- a/tests/unit/renderer/page-column.test.tsx
+++ b/tests/unit/renderer/page-column.test.tsx
@@ -12,6 +12,8 @@
  * always-active（ADR-0017 裁决 3——新测试不经 guardedDescribe）。
  * F-05 增补：段⑤程序滚动改走 scrollIntoNearestScroller(页盒,'start')（单容器
  * 收敛，INV-34——数学正确性锚在 scroll-converge.test；本文件断言调用形）。
+ * F-A7 增补：旋转页尺寸口径（makeDoc 可选 rotate 参+90/180/270/-90 四用例
+ * ——pageSizes=viewport 旋转口径，/Rotate 元数据适配非手动旋转特性）。
  */
 import { act, useEffect } from 'react'
 import type { RefObject } from 'react'
@@ -66,9 +68,9 @@ class MockIO {
   }
 }
 
-/** 六页文档桩（全部 612×792） */
-function makeDoc(pages: number): { doc: PDFDocumentProxy; getPage: ReturnType<typeof vi.fn> } {
-  const getPage = vi.fn(async (no: number): Promise<{ view: number[] }> => ({ view: [0, 0, 612, 792 * (no === 1 ? 1 : 1)] }))
+/** 六页文档桩（全部 612×792；F-A7 rotate 可选参缺省 0——既有调用面零破） */
+function makeDoc(pages: number, rotate = 0): { doc: PDFDocumentProxy; getPage: ReturnType<typeof vi.fn> } {
+  const getPage = vi.fn(async (no: number): Promise<{ view: number[]; rotate?: number }> => ({ view: [0, 0, 612, 792 * (no === 1 ? 1 : 1)], rotate }))
   const doc = { numPages: pages, getPage } as unknown as PDFDocumentProxy
   return { doc, getPage }
 }
@@ -525,3 +527,52 @@ describe('F-04 缩放中心锚与列宽基准（纯函数+组件装配）', () =
     expect(onReady).toHaveBeenCalledWith(612)
   })
 })
+
+describe('F-A7 旋转页尺寸口径（pageSizes=viewport 旋转口径——/Rotate 元数据适配）', () => {
+  /** 单页文档挂载锚：view 612×792（未旋转口径）→盒尺寸随 rotate 口径变化 */
+  async function mountRotated(rotate: number, onReady?: (basisWidth: number) => void): Promise<void> {
+    const { doc } = makeDoc(1, rotate)
+    await mount(
+      <PageColumn
+        doc={doc}
+        totalPages={1}
+        zoom={1}
+        renderPage={(no) => <span data-rendered-page={no} />}
+        onPageRender={() => undefined}
+        onError={() => undefined}
+        onReady={onReady}
+      />
+    )
+  }
+
+  it('rotate=90：占位盒宽高交换（view 612×792→盒 792×612）+onReady 基准同口径', async () => {
+    const onReady = vi.fn()
+    await mountRotated(90, onReady)
+    const box = host!.querySelector<HTMLElement>('[data-page-box="1"]')!
+    expect(box.style.width).toBe('792px')
+    expect(box.style.height).toBe('612px')
+    // fit-width 分母（onReady basisWidth）同口径受益：旋转后宽=792
+    expect(onReady).toHaveBeenCalledWith(792)
+  })
+
+  it('rotate=180：不交换（612×792 原样——180° 无横竖翻转）', async () => {
+    await mountRotated(180)
+    const box = host!.querySelector<HTMLElement>('[data-page-box="1"]')!
+    expect(box.style.width).toBe('612px')
+    expect(box.style.height).toBe('792px')
+  })
+
+  it('rotate=270：交换（792×612）', async () => {
+    await mountRotated(270)
+    const box = host!.querySelector<HTMLElement>('[data-page-box="1"]')!
+    expect(box.style.width).toBe('792px')
+    expect(box.style.height).toBe('612px')
+  })
+
+  it('rotate=-90：负值归一化（((-90%360)+360)%360=270）后交换（792×612）', async () => {
+    await mountRotated(-90)
+    const box = host!.querySelector<HTMLElement>('[data-page-box="1"]')!
+    expect(box.style.width).toBe('792px')
+    expect(box.style.height).toBe('612px')
+  })
+})

```
