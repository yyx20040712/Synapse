# z-r2e 修票门一定点复核包（v2）

## 0. 任务
你上一轮对此修票判 PWW（1W/2N，见 §1）。主控（本票=压缩票直做者）已三改：①W1 口径不对称→量测改同帧原子相对几何（rect−canvas 单 evaluate——W1/N2 连根：门锚的恰是终局断言比较的相对量）；②N1 fail loudly 消息带末次样本 JSON；③W1 无条件门理由补注释（STABLE 旗只辖滚动对照组；稳态断言语义循 stableRel 无条件先例；双态时间线 mutLog/series 仍完整记录）。定点复核：三项是否 ADDRESSED+新破坏扫描+终裁。
机器面：lint/typecheck exit=0；定向 1 passed（7.3s）；locks 重 apply 一致。

## 1. 上轮发现（原文）
```text
W1: 口径不对称——pass2 滚动门 if(STABLE) 条件 vs rectStableGate 无条件；非稳态取证模式下新门强制等待或语义掩蔽，需补论证或对齐条件。
N1: fail loudly 错误消息不含采样数据，双态瞬态 vs 持续漂移不可判别。
N2: 门只锚 annotation-rect 自身几何未锚 canvas 参照系，相对指纹理论竞速残口。
```

## 2. v2 终态 diff（tests/e2e/z-r2e-probe.spec.ts）
```diff
diff --git a/tests/e2e/z-r2e-probe.spec.ts b/tests/e2e/z-r2e-probe.spec.ts
index a9f47d4496..b2afed97fb 100644
--- a/tests/e2e/z-r2e-probe.spec.ts
+++ b/tests/e2e/z-r2e-probe.spec.ts
@@ -167,6 +167,50 @@ async function stableGate(win: Page): Promise<void> {
   }
 }
 
+
+/** [z-r2e 立案修] 几何稳定门（INV-51 双态收敛——crib reader-text.spec stableRel
+ * 已验证配方）：前置观察窗 400ms（fallback→resolved 跳变余量——双采样一致不能
+ * 区分「跳变已结束」与「未开始」）+120ms 间隔采样、连续 3 点（2 对相邻一致）
+ * 0.1px 内收敛才放行；25 轮穷尽 fail loudly（消息带末次样本——双态瞬态 vs 持续
+ * 漂移可判别；静默继续=把假红面留给双态——门二 B-1 同款）。量测口径=**同帧
+ * 原子相对几何**（rect 与 canvas 单 evaluate 内取值——参照系位移与 rect 跳变
+ * 同窗收敛，终局断言恰比较此相对量，门二 W-A 同帧纪律）。两程量测前各过门：
+ * pass1 裸 boundingBox 竞速 resolve 是 2 现立案的根因（z-r2e-flake-case.md），
+ * pass2 裸测同险（s2RelY 稳是时序巧合非保证）。**无条件执行**（不经 STABLE
+ * 条件——该旗只辖滚动稳定对照组；稳态原位断言语义循原用例 stableRel 同款
+ * 无条件，双态时间线仍由 mutLog/series 完整记录，取证语义无损）。 */
+async function rectStableGate(win: Page): Promise<void> {
+  const measure = (): Promise<{ x: number; y: number; w: number; h: number } | null> =>
+    win.evaluate(() => {
+      const r = document.querySelector('[data-testid="annotation-rect"]')?.getBoundingClientRect()
+      const c = document.querySelector('canvas[data-pdf-canvas]')?.getBoundingClientRect()
+      if (r === undefined || c === undefined || r.width <= 0 || r.height <= 0 || c.width <= 0) return null
+      return { x: r.x - c.x, y: r.y - c.y, w: r.width, h: r.height }
+    })
+  await win.waitForTimeout(400)
+  let prev = await measure()
+  let streak = 0
+  for (let i = 0; i < 25; i++) {
+    await win.waitForTimeout(120)
+    const cur = await measure()
+    if (
+      cur !== null && prev !== null &&
+      Math.abs(cur.x - prev.x) < 0.1 && Math.abs(cur.y - prev.y) < 0.1 &&
+      Math.abs(cur.w - prev.w) < 0.1 && Math.abs(cur.h - prev.h) < 0.1
+    ) {
+      streak += 1
+      if (streak >= 2) return
+    } else {
+      streak = 0
+    }
+    prev = cur
+  }
+  throw new Error(
+    `annotation-rect 相对几何 25 轮采样未收敛（双态瞬态/漂移超预算——fail loudly）；` +
+    `末次样本=${JSON.stringify(prev)}`
+  )
+}
+
 /** 滚动事件驱动记录器（落帧源定位——scroll 事件捕获阶段全容器覆盖+500ms 兜底
  * 采样；rAF 方案在 Electron 失焦/遮挡窗口下被完全暂停——实测零执行，弃用） */
 interface ScrollLogPoint { t: number; tag: string; y: number | null; ch: number | null; sh: number | null }
@@ -252,6 +296,8 @@ test('F-R2e 探针：划选高亮重开原位——仪表指纹矩阵', async ()
   await expect(rect.first()).toBeVisible()
   await expect(win.getByTestId('annotation-layer')).toHaveCSS('mix-blend-mode', 'normal')
   await expect(rect).toHaveCount(1)
+  // [z-r2e 立案修] 几何稳定门先行（pass1 裸测竞速 resolve=2 现根因）
+  await rectStableGate(win)
   const box1 = await rect.first().boundingBox()
   const page1 = await win.locator('canvas[data-pdf-canvas]').boundingBox()
   const a1 = await atomSample(win)
@@ -275,6 +321,8 @@ test('F-R2e 探针：划选高亮重开原位——仪表指纹矩阵', async ()
   await expect(rect2).toHaveCount(1)
   await expect(win2.getByTestId('annotation-layer')).toHaveCSS('mix-blend-mode', 'normal')
   if (STABLE) await stableGate(win2)
+  // [z-r2e 立案修] 几何稳定门（pass2 裸测同险——双程同口径）
+  await rectStableGate(win2)
   const box2 = await rect2.first().boundingBox()
   const box2T = Date.now()
   if (INJECT === 1) await injectScroll(win2, 3.45)
