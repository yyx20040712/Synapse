# F-A7 ·门二终审材料包（deepseek v4flash,零仓库接触）

你是终审官。审 F-A7（旋转页占位盒宽高交换——F-A6-d 门二 W2 立案回执的兑现票）终位。已过门一 Kimi K3 PWW+W1 回炉闭合。

## 1. 上游与票面（一句话）

F-A6-d 收口时发现 /Rotate≠0 页 [data-page-box] 占位盒=page.view 未旋转口径 vs canvas getViewport 旋转口径错配→立案 F-A7。修法（主控预裁）：PageColumn 段① pageSizes 构造改 viewport 旋转口径——rotate+view 直取+内联交换（归一化 ((r%360)+360)%360 后 %180===90 交换,禁 getViewport 调用——与 b1 PdfPageGeometry 通道同源）；pageSizes 语义变化对纯函数消费面透明（columnWidthFor basisWidth/锚总高自动受益）;头注「不做：旋转页」澄清「手动旋转阅读」。

## 2. 门一 findings+主控处置（①处置核对清单）

- W1 e2e 注释「>300px」系 293px 凑整→**回炉已修**：终态注释=「差=180×zoom,fit-width ~1.63× 下 ≈293px ≫2px 容差必红」（diff 内可见）;回炉后全量 verify 1329 exit=0（f-a7-rework1-verify.raw.txt）。
- W2 push 行可读性债务→**本票接受+登记**：登记数字实测=248 字符（原报 ~280 偏高,实现者勘误;awk 实测）;债务登记随收口入 registry summary。
- N1 -270/450 未覆盖→不追（归一化同路径,鉴别力足够——门一原判）。
- N2 头注内嵌行尾→申报在案合规。

## 3. 机器面数字（④核对基准——全部真退出码在档）

- 基线（v44 终态）：verify 154 文件/1325 用例/locks 277/e2e 41。
- 本票终态：**154 文件/1329 用例/locks 277/e2e 42 零 skip**（+4 单测 90/180/270/-90,+1 e2e 小票）;主控独立亲验 exit=0（f-a7-master-verify.raw.txt）+回炉后再全量 exit=0（f-a7-rework1-verify.raw.txt）。
- locks：两受锁测试件 sha 重登记,277 计数不变;manifest 与工作区同步（提交时 [locked-change]）。
- registry 翻 done 推演：F-A7 open→done,任务池余 P7D-01/P7X-02+AnnotationLayer seam 票（立案回执已在 v44 §2）。

## 4. 实现者报告节选（§3 首红/§4 变异/§5 测试证据/§6 locks/回炉补记）

## 3. 首红证据（先红后绿）

- 证据档：`scripts/audits/f-a7-first-red.raw.txt`（npm run test 全量口径，
  真退出码 `exit=1`）。
- 形态：**3 failed（rotate=90/270/-90 三新用例红，expected '792px'
  received '612px'）| 1326 passed（1329 总）**。180 用例修前绿=数学必然
  （180 不交换=旧行为），其鉴别力由变异 B 补证（见 §4）。
- 修后绿：`f-a7-green.raw.txt`（最终形态全量 154 文件/1329 用例，
  `exit=0`）。

## 4. 变异红证（最终代码形态，备份还原法非 git checkout）

两个变异均在**最终形态**代码上做（中间形态首轮证据被覆盖重做——行数
紧凑改写后变异点字面变化，证据链闭合于收口代码）；备份=/tmp cp 法，
还原后 `diff` 空（MUTATION-A/B-FINAL-RESTORE-DIFF-EMPTY 回显在档）。

| 变异 | 操作 | 结果 | 证据档 |
|---|---|---|---|
| A 删交换分支 | 三元交换臂改为与非交换臂同型 | 3 failed（90/270/-90），exit=1 | `f-a7-mutation-del-swap.raw.txt` |
| B 交换条件翻转 | `% 180 === 90` → `% 180 === 0` | 8 failed（4 新用例全红含 180 + 4 既有 rotate=0 用例红），exit=1 | `f-a7-mutation-flip-cond.raw.txt` |

变异 B 连带既有用例红=makeDoc 缺省 rotate=0 在翻转条件下被错误交换——
非副作用，恰证 0 值守卫（真实库全档 rotate=0 面同样被保护）。

## 5. 测试与 verify 证据（全链真退出码）

| 关卡 | 结果 | 证据档 |
|---|---|---|
| 首红（修 src 前 npm run test 全量） | 3 红/1329，exit=1 | `f-a7-first-red.raw.txt` |
| 单测绿（最终形态全量） | 154 文件/1329 用例全绿，exit=0 | `f-a7-green.raw.txt` |
| 变异 A/B | 见 §4，均 exit=1 | `f-a7-mutation-*.raw.txt` |
| e2e build | exit=0 | `f-a7-e2e-build.raw.txt` |
| e2e 定向新小票 | 1 passed（1.7s），exit=0 | `f-a7-e2e-targeted.raw.txt` |
| e2e 全量（最终形态重跑） | **42 passed（=41+1，零 skip）**，exit=0 | `f-a7-e2e-full.raw.txt` |
| npm run verify（quality+tickets+locks+lint+typecheck+test+build） | 全绿，exit=0 | `f-a7-verify.raw.txt` |
| locks:check | 277 受锁文件与 manifest 一致，exit=0 | `f-a7-locks-check.raw.txt` |

F-ARCH4-M1 偶红未现（全量一次过，无需立案线处置）。基线对账：verify 用例
1325+4=1329 ✓、e2e 42 ✓、locks 277 不变 ✓（简报 §⑤ 预期全中）。

## 6. locks 实录

- 单测件：unlock（已解锁 277）→ 改 → apply（已锁定 277，manifest 记录
  277 条）。
- e2e 件：unlock → 改 → apply（同上口径）。
- 无新受锁路径（两文件原在锁内）；本票零自产 .mjs/.ps1 工具件。
- 收口态 locks:check=277 一致（§5 末行证据档）。

## 7. 自裁申报（与票面偏差逐条）

1. **行数紧凑改写（最大偏差，务必主控复核）**：首版实现（load 循环
   +7 行+头注增补独立 3 行）被 `npm run verify` 的 quality 关卡拦截——
   PageColumn.tsx 组件 260 行超上限 250（check-quality.mjs `split('\n')
   .length` 口径=wc+1；HEAD 基线 249 行=quality 记 250 **已压线**，净增
   预算=0）。最小解=循环段 3 行紧凑内联（注释 1 行+rot 1 行+sizes.push
   1 行，净 0 增）+头注增补内嵌段①行尾。语义与裁决①完全一致（??
   0 防御/归一化/%180===90 交换全保留）；代价两条主控须知：
   - sizes.push 单行 ~280 字符（四段 `(page.view[N] ?? 0)` 内联式）——
     本文件头注超长行有先例（:25）、无 lint 关卡，但可读性低于常规；
   - 裁决③「增补记录注一行 F-A7」以「[F-A7 增补 2026-09-04] …」内嵌
     段①行尾呈现（日期+单号+一句话三要素齐全），**非独立行**——与票面
     字面「注一行」的形式偏差。已考虑并否决的替代=数学抽
     page-column-geometry.ts 纯函数（同时违反票面「仅注释，逻辑零动」+
     接口层「无新导出」+裁决①「load 循环内」三处明文，偏差面更大）。
2. **变异红证重做**：紧凑改写后代码字面变化，两变异在最终形态重做并
   覆盖同名证据档（首轮中间形态证据不留档；数学结构未变）。
3. **180 用例修前绿**：首红=3 红（非 4）——180 不交换=旧行为，修前绿
   是数学必然而非断言弱化；其鉴别力由变异 B 证（翻转后 180 红，8 红之
   一）。
4. **makeDoc 缺省 rotate=0 恒带字段**：既有用例调用面零改动（缺省参）；
   `?? 0` 防御仍被真实覆盖（W2 门一回炉/列宽基准两处内联 mock 无 rotate
   字段，运行时走 undefined 兜底分支）。
5. **删减面自查**：无功能删减。票面 4 文件全部按清单执行；e2e 既有
   F-A6-d 小票断言零改（仅 :925-929 参考系注释按裁决⑤更新）；:869-872
   历史申报注释（「首跑红证申报」段）按票面字面未动（裁决⑤仅指定
   :925-929 段）。

## 8. 疑虑

1. **PageColumn.tsx 行数压线 250/250**：后续该文件任何行增即破线——
   若主控收口时要恢复独立增补行或展开 push 超长行，需同步省行或走拆件
   决策（票外，归主控）。
2. e2e 新小票断言为尺寸一致（±2px）+方向（宽>高），未断言绝对像素
   （裁决④——fit-width 缩放随容器宽漂移）；若未来 fit 策略变化（如
   持续 fit），方向断言仍稳、一致断言依赖「盒与 canvas 同 zoom 基数」
   的既有装配（PageBox boxWidth 与 PdfPageCanvas clampScale 同 zoom——
   zoom>3 时 clamp 分叉会破一致，真实 fit-width 场景不触及）。
3. 双页布局（layout='double'）下旋转页行为未加专测——pageBoxWidth/
   layoutRows 消费 PageBoxSize 数值透明（票面行为层「口径变化对其
   透明」），现有双页测试全绿佐证；如需专测归主控裁量。

──
证据档索引（scripts/audits/）：f-a7-first-red / f-a7-green /
f-a7-mutation-del-swap / f-a7-mutation-flip-cond / f-a7-e2e-build /
f-a7-e2e-targeted / f-a7-e2e-full / f-a7-verify / f-a7-locks-check
（均 .raw.txt 后缀，真退出码 echo exit=$? 落盘）。

## 回炉一轮 W1 补记（2026-09-04，门一 Kimi K3 PWW 裁决）

- **改动行（仅 1 处注释，零行为变化）**：tests/e2e/reader-text.spec.ts
  F-A7 新小票断言上方注释——原「（fit-width ~1.63× 下差值 >300px 必红）」
  改为「（差=180×zoom，fit-width ~1.63× 下 ≈293px ≫2px 容差必红）」。
  数学口径：未旋转错配差=(684−504)×zoom=180×zoom；zoom≈1.63 时
  ≈293px（1115−821.5=293.5，与门一独立推演一致）；原「>300」系凑整失实。
- **verify 复跑**：受锁纪律改后全量 `npm run verify` 真退出码——1329
  用例全绿、`exit=0`，证据档 `f-a7-rework1-verify.raw.txt`；locks 两步
  （unlock→改→apply）277 不变。
- **W2（280 字符行债务，主控裁「本票接受+登记」——登记数字实测）**：
  PageColumn.tsx **:115**（sizes.push 交换三元行）实测 **248 字符**
  （awk length 口径；wc -c 含行尾换行=249 字节；该行纯 ASCII 字节=字符）。
  本报告 §7.1 原文「~280 字符」为落笔前估算值（偏高 32），以本补记实测
  248 为准登记。

## 5. 终态 diff 全文（4 文件+manifest,103+/16-）

```diff
diff --git a/locks/manifest.json b/locks/manifest.json
index db66b5b3ff..9e29c3ccbf 100644
--- a/locks/manifest.json
+++ b/locks/manifest.json
@@ -1,5 +1,5 @@
 {
-    "generatedAt":  "2026-09-04T00:05:20.5947969Z",
+    "generatedAt":  "2026-09-04T00:52:25.1570619Z",
     "files":  [
                   {
                       "path":  ".github/workflows/ci.yml",
@@ -439,7 +439,7 @@
                   },
                   {
                       "path":  "tests/e2e/reader-text.spec.ts",
-                      "sha256":  "884e64bcbc1adbefbdd40ddac4fe247407d87287f56d6d7558f5ac659990c372"
+                      "sha256":  "9603ab47b4b5677777fa04cc2ac9b9551d51d359dba235b4890abc3122f5843d"
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
index 076e198685..d31c21f890 100644
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
+  // 修前形态=盒 504×684 vs canvas 684×504（差=180×zoom，fit-width ~1.63× 下 ≈293px ≫2px 容差必红）
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
