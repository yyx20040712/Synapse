# F-R2+P7A 门二合并审材料包（deepseek 异构二审——裁决/复算面；亲跑矩阵数据内嵌）

## 背景:门一 Kimi 已审 F-R2(B:0/W:1/N:6 可收口);回炉 1 与 P7A 为门一后新增面,由你异构二审。
## 铁律:只读本包;禁跑命令;每条结论给包内证据(diff 行/数值);不确定明说。中文输出。

## A. F-R2 回炉 1(主控压缩票直做——原实现者会话终止+预算降级,担责披露)
- 事实链:e2e『划选高亮重开原位』稳定红 3.4499969482421875(两次全量跑)→诊断探针 f-r2-diag2:比值法 z=gBCR.height/clientHeight=964.6/772=1.24948 vs computed zoom 链=1.25(ε≈0.0005 亚像素+滚动条污染;uiScale=1 档 ε 同型)→修=effectiveZoom 改 zoom 链乘积(透传 mock 注入测试桩)。
- 修后证据:e2e 全量 29/29 绿;单测 126 文件 1081 绿;M5 变异(漏乘 scroller 层)5 用例红+还原 diff 空;真机探针终态 1.25 档三跳落点偏移 ±0.2px(fill4 +0.2/fill1 −0.2/next −0.2;回炉前比值法版 −0.6;原始缺陷 −512.6)。
- 遗留披露:z≠1 底夹取用例对 M5 不红(clamp 饱和区数学事实:raw 2400/1920 同夹 1600——记档非缺陷);三连跑第三跑该 e2e 条又红同值 3.45 但单跑绿=序列敏感(F-R2e 备案,非本批回归证据:收口全量绿+单跑绿)。
- scroll-converge.ts effectiveZoom 终实现(zoom 链)与两测试桩(getComputedStyle mock)见 B 包 diff 尾段。

## B. P7A 受锁 e2e 改向(主控压缩票直做)
- 先红:旧形态+外部占用注入(ctrl+c 后 writeText('external-occupier-sim'))→1 failed『Received: external-occupier-sim』(第七现机制复刻,p7a-red1.raw.txt);还原 diff 空。
- 新防线:ctrl+c 前清场标记 writeText('__p7a_cleared__')+条件重读 5×200ms(值含期望即过;标记/空串=写入未落盘续等;超时红带末次读值可归因);断言锚不放宽。
- 判据:e2e 全量连跑 3 次 P7-A 三次全绿(29/29,29/29,28/29——第三跑失败为『划选高亮』条非 P7-A)。

## 审计工单
1. F-R2 回炉修法正确性独立复算:zoom 链乘积对祖先复合 zoom 的数学完备性(漏层/重复/NaN 路径);mock 桩是否弱化测试(gBCR 视觉桩仍为被测面的确认)。
2. ε 污染→3.45px 因果链的强度评估(诊断数据是否充分支撑;有无更优替代口径)。
3. P7A 防线完备性:清场+重读对『旧值残留/写入延迟』两竞态面的覆盖;『读前外部再改写』残余窗的接受性。
4. 主控压缩票两件的流程合规面(实现与审查分离的破坏程度与补偿)。

## 输出契约:[B|W|N] 逐条+统计+总评(可收口/需回炉)。

```diff
diff --git a/tests/e2e/reader-text.spec.ts b/tests/e2e/reader-text.spec.ts
index 97e3cd16d..0428b7462 100644
--- a/tests/e2e/reader-text.spec.ts
+++ b/tests/e2e/reader-text.spec.ts
@@ -559,10 +559,22 @@ test('P7-A 复制：ctrl+c 将文本层选区写入系统剪贴板（ReaderShort
 
   // 程序化选区 + ctrl+c → 主进程 clipboard 模块读回断言（渲染进程 readText 无权限
   // ——NotAllowedError 实证；主进程读取即真实系统剪贴板，集成语义不打折）
+  // [P7A/locked-change] 剪贴板竞态防线（六场六现+2026-09-02 第七现实锤——系统
+  // 剪贴板被外部内容占用时读到外部文本假红，实测值=用户复制的文件名；先红
+  // 实证=p7a-red1.raw.txt 注入复刻）：①ctrl+c 前清场标记覆盖外部旧值；
+  // ②条件重读 5×200ms——值含期望文本即过；标记值/空串=写入未落盘继续轮询；
+  // 超时红且失败信息带末次读值（标记→写入链断；其他→外部再改写，可归因）。
+  // 断言锚不放宽（仍必须 toContain 期望文本）。
   await known.selectText()
+  await app.evaluate(({ clipboard }) => clipboard.writeText('__p7a_cleared__'))
   await win.keyboard.press('Control+c')
-  const clipped = await app.evaluate(({ clipboard }) => clipboard.readText())
-  expect(clipped).toContain(PDF_KNOWN_TEXT)
+  let clipped = ''
+  for (let i = 0; i < 5; i++) {
+    clipped = await app.evaluate(({ clipboard }) => clipboard.readText())
+    if (clipped.includes(PDF_KNOWN_TEXT)) break
+    await win.waitForTimeout(200)
+  }
+  expect(clipped, `剪贴板末次读值（标记=写入未落盘；其他=外部再改写）：${JSON.stringify(clipped)}`).toContain(PDF_KNOWN_TEXT)
   await app.close()
 })
 
diff --git a/src/renderer/features/reader/scroll-converge.ts b/src/renderer/features/reader/scroll-converge.ts
index 6a0084a4a..fc4b940ae 100644
--- a/src/renderer/features/reader/scroll-converge.ts
+++ b/src/renderer/features/reader/scroll-converge.ts
@@ -30,12 +30,33 @@ export function nearestScrollAncestor(el: HTMLElement): HTMLElement | null {
   return null
 }
 
+/** 折算因子单源（F-R2）：自 scroller 至 documentElement 逐层 computed zoom
+ *  链乘积（「1 gBCR px=1 scrollTop px」仅 z=1 成立——探针 P1 实证）。
+ *  量测口径（回炉 1 定案）：**禁用 gBCR/clientHeight 比值法**——gBCR 含横滚
+ *  动条+亚像素小数，真机实测 1.25 档即偏 ε≈0.0005（964.6/772=1.24948），
+ *  uiScale=1 档 ε 同型——恢复链落点偏移顶破「重开原位 ±2px」容差（e2e
+ *  3.45px 稳定红实证）；computed zoom=CSS 声明值直读，零几何污染。
+ *  'normal'/空/undefined（jsdom 不识别 zoom）→NaN→1 跳过；z=1 恒等=
+ *  零行为变。消费方：本件 scrollIntoNearestScroller + scroll-progress
+ *  measurePageBoxes（禁两处各写推导）。 */
+export function effectiveZoom(scroller: HTMLElement): number {
+  let z = 1
+  let el: HTMLElement | null = scroller
+  while (el !== null) {
+    z *= Number(getComputedStyle(el).zoom) || 1
+    el = el.parentElement
+  }
+  return z
+}
+
 /**
  * 程序滚动收敛：只滚 el 的最近滚动祖先（更外层零位移）。
- * - 'start'：scrollTop += elRect.top − scrollerRect.top（盒顶对齐视口顶）
- * - 'center'：scrollTop += (elRect.top+h/2) − (scrollerRect.top+clientH/2)
- * 显式夹取 [0, scrollHeight−clientHeight]（浏览器对赋值自动夹取；jsdom 不
- * 模拟——显式=单测可锚，浏览器内幂等）。无滚动祖先→不滚（原 scrollIntoView
+ * - 'start'：scrollTop += (elRect.top − scrollerRect.top) / z（盒顶对齐视口顶）
+ * - 'center'：scrollTop += (elRect.top+h/2 − scrollerRect.top) / z − clientH/2
+ * elRect 侧=gBCR 视觉空间，除 z 折算回本地；clientHeight/scrollTop/clamp
+ * 均=本地空间不动（F-R2 量纲修正，INV-34 语义原样）。显式夹取
+ * [0, scrollHeight−clientHeight]（浏览器对赋值自动夹取；jsdom 不模拟——
+ * 显式=单测可锚，浏览器内幂等）。无滚动祖先→不滚（原 scrollIntoView
  * 对无滚动容器元素同为无操作）。
  */
 export function scrollIntoNearestScroller(el: HTMLElement, align: ScrollAlign): void {
@@ -43,9 +64,10 @@ export function scrollIntoNearestScroller(el: HTMLElement, align: ScrollAlign):
   if (scroller === null) return
   const elRect = el.getBoundingClientRect()
   const scRect = scroller.getBoundingClientRect()
+  const z = effectiveZoom(scroller)
   const raw =
     align === 'start'
-      ? scroller.scrollTop + (elRect.top - scRect.top)
-      : scroller.scrollTop + (elRect.top + elRect.height / 2) - (scRect.top + scroller.clientHeight / 2)
+      ? scroller.scrollTop + (elRect.top - scRect.top) / z
+      : scroller.scrollTop + (elRect.top + elRect.height / 2 - scRect.top) / z - scroller.clientHeight / 2
   scroller.scrollTop = Math.min(Math.max(raw, 0), Math.max(0, scroller.scrollHeight - scroller.clientHeight))
 }
diff --git a/tests/unit/renderer/scroll-converge.test.ts b/tests/unit/renderer/scroll-converge.test.ts
index c86671e65..2d2b9f27f 100644
--- a/tests/unit/renderer/scroll-converge.test.ts
+++ b/tests/unit/renderer/scroll-converge.test.ts
@@ -4,11 +4,13 @@
  * ADR-0017 裁决 3——不经 guardedDescribe）。
  *
  * 覆盖：最近滚动祖先选取（含嵌套两滚动容器取最近）/start 数学（盒顶对齐）/
- * center 数学（居中对齐）/顶底夹取/无滚动祖先不动（INV-34 单测锚）。
+ * center 数学（居中对齐）/顶底夹取/无滚动祖先不动（INV-34 单测锚）/
+ * 视觉-本地双空间折算（F-R2：gBCR 视觉差值除 z 后进本地 scrollTop）。
  * jsdom 无布局：getBoundingClientRect/scrollHeight/clientHeight 全部桩值；
  * scrollTop 赋值 jsdom 不做浏览器级夹取——故实现显式夹取（本文件断言锚）。
  * 数学正确性在此锚定；消费方（PageColumn 段⑤/anchor-locate flashElement）
  * 只断言 (元素, 对齐) 调用形（受锁三文件，P6 口径）；行为终审=e2e。
+ * [F-R2] 双空间折算用例（受锁改写，[locked-change] 授权面）。
  */
 import { afterEach, describe, expect, it, vi } from 'vitest'
 import {
@@ -16,7 +18,8 @@ import {
   scrollIntoNearestScroller
 } from '../../../src/renderer/features/reader/scroll-converge'
 
-/** 桩盒几何：el 的 getBoundingClientRect 固定返回给定矩形 */
+/** 桩盒几何：el 的 getBoundingClientRect 固定返回给定矩形（F-R2 回炉 1 起
+ *  z 来自 computed zoom 桩（stubZoom），height 不再承担量纲角色）。 */
 function stubRect(el: HTMLElement, top: number, height = 10): void {
   vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
     top, right: top + 10, bottom: top + height, left: 0, width: 10, height, x: 0, y: top,
@@ -24,6 +27,17 @@ function stubRect(el: HTMLElement, top: number, height = 10): void {
   } as DOMRect)
 }
 
+/** 桩 CSS zoom（F-R2 回炉 1：effectiveZoom=computed zoom 链直读——jsdom 不
+ *  识别 zoom 属性，经 getComputedStyle mock 注入；其余属性/元素透传真实值
+ *  （overflowY 祖先判定不受扰）。 */
+function stubZoom(el: HTMLElement, zoom: number): void {
+  const real = window.getComputedStyle
+  vi.spyOn(window, 'getComputedStyle').mockImplementation((target, pseudo) => {
+    const cs = real.call(window, target as Element, pseudo)
+    return target === el ? Object.assign(cs, { zoom: String(zoom) }) : cs
+  })
+}
+
 /** 桩滚动容器的量纲（scrollHeight/clientHeight jsdom 恒 0——显式覆盖） */
 function stubScrollDims(el: HTMLElement, scrollHeight: number, clientHeight: number): void {
   Object.defineProperty(el, 'scrollHeight', { value: scrollHeight, configurable: true })
@@ -81,7 +95,7 @@ describe('scroll-converge —— 程序滚动单容器收敛（INV-34）', () =>
 
   it('start 数学：scrollTop += elRect.top − scrollerRect.top（盒顶对齐视口顶）；嵌套取最近——outer 零位移', () => {
     const { outer, inner, target } = buildNested()
-    stubRect(inner, 100)
+    stubRect(inner, 100, 400)
     stubRect(target, 550)
     stubScrollDims(inner, 2000, 400)
     stubScrollDims(outer, 3000, 600)
@@ -95,7 +109,7 @@ describe('scroll-converge —— 程序滚动单容器收敛（INV-34）', () =>
 
   it('center 数学：scrollTop += (elRect.top + h/2) − (scrollerRect.top + clientH/2)（居中）', () => {
     const { inner, target } = buildNested()
-    stubRect(inner, 100)
+    stubRect(inner, 100, 400)
     stubRect(target, 900, 80)
     stubScrollDims(inner, 2000, 400)
     inner.scrollTop = 0
@@ -106,7 +120,7 @@ describe('scroll-converge —— 程序滚动单容器收敛（INV-34）', () =>
 
   it('顶底夹取：目标在上方越界→夹 0；在下方越界→夹 scrollHeight−clientHeight（显式夹取，jsdom 无浏览器夹取）', () => {
     const f = buildNested()
-    stubRect(f.inner, 100)
+    stubRect(f.inner, 100, 400)
     stubScrollDims(f.inner, 2000, 400)
     f.inner.scrollTop = 50
     // 目标盒顶 60 < 容器顶 100 → raw 50+(60−100)=10？构造真越界：目标 30
@@ -127,7 +141,7 @@ describe('scroll-converge —— 程序滚动单容器收敛（INV-34）', () =>
     const item = document.createElement('div')
     aside.appendChild(item)
     document.body.appendChild(aside)
-    stubRect(aside, 40)
+    stubRect(aside, 40, 300)
     stubRect(item, 500, 20)
     stubScrollDims(aside, 900, 300)
     scrollIntoNearestScroller(item, 'center')
@@ -135,4 +149,40 @@ describe('scroll-converge —— 程序滚动单容器收敛（INV-34）', () =>
     expect(aside.scrollTop).toBe(320)
     expect(document.documentElement.scrollTop).toBe(0)
   })
+
+  it('start 双空间折算（z=1.25）：gBCR 视觉差值除 z 后加进本地 scrollTop（dSt=δv/z）', () => {
+    const { inner, target } = buildNested()
+    stubZoom(inner, 1.25)
+    stubRect(inner, 100, 500)
+    stubRect(target, 600, 250)
+    stubScrollDims(inner, 2000, 400)
+    inner.scrollTop = 30
+    scrollIntoNearestScroller(target, 'start')
+    // z=1.25；本地修正=(600−100)/1.25=400 → 30+400=430
+    expect(inner.scrollTop).toBe(430)
+  })
+
+  it('center 双空间折算（z=1.5）：elRect 侧除 z，clientHeight 项保持本地空间', () => {
+    const { inner, target } = buildNested()
+    stubZoom(inner, 1.5)
+    stubRect(inner, 110, 600)
+    stubRect(target, 1460, 300)
+    stubScrollDims(inner, 2000, 400)
+    inner.scrollTop = 0
+    scrollIntoNearestScroller(target, 'center')
+    // z=1.5；(1460+150−110)/1.5 − 400/2 = 1000−200 = 800
+    expect(inner.scrollTop).toBe(800)
+  })
+
+  it('z≠1 底夹取：clamp 上限保持本地口径 scrollHeight−clientHeight（不随 z 缩放）', () => {
+    const { inner, target } = buildNested()
+    stubZoom(inner, 1.25)
+    stubRect(inner, 100, 500)
+    stubRect(target, 2500, 250)
+    stubScrollDims(inner, 2000, 400)
+    inner.scrollTop = 0
+    scrollIntoNearestScroller(target, 'start')
+    // z=1.25；raw=(2500−100)/1.25=1920 > 上限 2000−400=1600 → 夹 1600
+    expect(inner.scrollTop).toBe(1600)
+  })
 })
diff --git a/tests/unit/renderer/scroll-progress.test.tsx b/tests/unit/renderer/scroll-progress.test.tsx
```
