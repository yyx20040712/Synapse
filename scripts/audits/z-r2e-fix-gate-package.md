# z-r2e 探针 flake 修票门审包（受锁小票——主控压缩票形态）

## 0. 背景与任务
z-r2e-probe.spec.ts（取证探针，tests/ 受锁面）flake 两现同族触发立案线（AGENTS e2e 非确定失败立案通则）：v30 P7E-02 收口 1 现+P7E-03 收口 1 现（dy=4.4375/dh=−4.975，复跑皆绿）。立案档 z-r2e-flake-case.md 根因归因=**探针两程 box 均裸 boundingBox**，pass1 竞速 AnnotationLayer 双态（INV-51 在档：fallback→resolved y 跳 4.44px）；产品面 reader-text.spec stableRel 稳态口径长期绿=非产品回归。修=两程量测前各过**rectStableGate**（几何双采样稳定门——crib 受锁 reader-text.spec stableRel 已验证配方）。
本包受锁面必保（§4.5）：定点审——①修法与根因的因果闭合性（几何门是否真正封死双态竞速窗）；②新破坏扫描（探针取证语义是否被破坏——mutLog/series/INJECT 注入档时序、fail loudly 误伤面）；③配方保真度（与 stableRel 的差异是否有害）。
机器面：lint/typecheck exit=0；定向探针 ×2 绿（7.3s/7.2s——含 400ms 前置窗+采样）；**全量 e2e 36/36 exit=0**（修复后基线）；locks 已 apply（256 一致）。红证形态=两现失败 payload 在档（时序竞速不可确定性复刻——P7A 注入先例不适用于纯时序竞速，如实申报）。

## 1. diff（tests/e2e/z-r2e-probe.spec.ts +46 行）
```diff
diff --git a/tests/e2e/z-r2e-probe.spec.ts b/tests/e2e/z-r2e-probe.spec.ts
index a9f47d4496..964482460e 100644
--- a/tests/e2e/z-r2e-probe.spec.ts
+++ b/tests/e2e/z-r2e-probe.spec.ts
@@ -167,6 +167,42 @@ async function stableGate(win: Page): Promise<void> {
   }
 }
 
+
+/** [z-r2e 立案修] 几何稳定门（INV-51 双态收敛——crib reader-text.spec stableRel
+ * 已验证配方）：前置观察窗 400ms（fallback→resolved 跳变余量——双采样一致不能
+ * 区分「跳变已结束」与「未开始」）+120ms 间隔采样、连续 3 点（2 对相邻一致）
+ * 0.1px 内收敛才放行；25 轮穷尽 fail loudly（静默继续=把假红面留给双态——
+ * 门二 B-1 同款）。两程量测前各过门：pass1 裸 boundingBox 竞速 resolve 是
+ * 2 现立案的根因（z-r2e-flake-case.md），pass2 裸测同险（s2RelY 稳是时序
+ * 巧合非保证）。 */
+async function rectStableGate(win: Page): Promise<void> {
+  const measure = (): Promise<{ x: number; y: number; w: number; h: number } | null> =>
+    win.evaluate(() => {
+      const r = document.querySelector('[data-testid="annotation-rect"]')?.getBoundingClientRect()
+      if (r === undefined || r.width <= 0 || r.height <= 0) return null
+      return { x: r.x, y: r.y, w: r.width, h: r.height }
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
+  throw new Error('annotation-rect 几何 25 轮采样未收敛（双态瞬态/漂移超预算——fail loudly）')
+}
+
 /** 滚动事件驱动记录器（落帧源定位——scroll 事件捕获阶段全容器覆盖+500ms 兜底
  * 采样；rAF 方案在 Electron 失焦/遮挡窗口下被完全暂停——实测零执行，弃用） */
 interface ScrollLogPoint { t: number; tag: string; y: number | null; ch: number | null; sh: number | null }
@@ -252,6 +288,8 @@ test('F-R2e 探针：划选高亮重开原位——仪表指纹矩阵', async ()
   await expect(rect.first()).toBeVisible()
   await expect(win.getByTestId('annotation-layer')).toHaveCSS('mix-blend-mode', 'normal')
   await expect(rect).toHaveCount(1)
+  // [z-r2e 立案修] 几何稳定门先行（pass1 裸测竞速 resolve=2 现根因）
+  await rectStableGate(win)
   const box1 = await rect.first().boundingBox()
   const page1 = await win.locator('canvas[data-pdf-canvas]').boundingBox()
   const a1 = await atomSample(win)
@@ -275,6 +313,8 @@ test('F-R2e 探针：划选高亮重开原位——仪表指纹矩阵', async ()
   await expect(rect2).toHaveCount(1)
   await expect(win2.getByTestId('annotation-layer')).toHaveCSS('mix-blend-mode', 'normal')
   if (STABLE) await stableGate(win2)
+  // [z-r2e 立案修] 几何稳定门（pass2 裸测同险——双程同口径）
+  await rectStableGate(win2)
   const box2 = await rect2.first().boundingBox()
   const box2T = Date.now()
   if (INJECT === 1) await injectScroll(win2, 3.45)
```

## 2. 立案档（根因归因+修法勘误全文）
```markdown
# z-r2e 探针 flake 立案档（2026-09-03 立案——2 现同族触发立案线）

> 规则依据：AGENTS 测试纪律「e2e 非确定失败立案线=同用例 2 次」（2026-09-02 终裁入册）。
> 立案时点：P7E-03 收口全量 e2e（35 过+1 红）——第二次出现，与 v30 首现同族。

## 一、两次出现（指纹对照）

| # | 场次 | 日期 | 失败点 | 指纹 |
|---|---|---|---|---|
| 1 | P7E-02 收口 e2e（v30 §1 在档） | 2026-09-03 早段 | z-r2e-probe.spec.ts:224 探针 | 「几何指纹矩阵首次 resolve 即红不重试族」——复跑绿（p7e-02-r2e-rerun.raw.txt），未达立案线仅记指纹 |
| 2 | P7E-03 收口全量 e2e（p7e-03-e2e-full.raw.txt） | 2026-09-03 13:42 | 同 spec 同用例 :329 `expect(abs(rel1.y-rel2.y)).toBeLessThanOrEqual(2)` 得 4.4375 | dy=+4.4375/dh=−4.975/dx≈−0.013/dw=0；verdicts={x:T,y:F,w:T,h:F}；复跑绿（p7e-03-r2e-rerun.raw.txt，1 passed 5.8s） |

两现**同族**（pass1 首测竞速 resolve、复跑皆绿）→ 立案。

## 二、根因归因（证据链）

1. **失败机理**：探针第一程 box1=**裸 boundingBox**（:259-260，原路径测量——无稳定门），
   而第二程有 `if (STABLE) await stableGate(win2)`（:291）。AnnotationLayer 双态在档
   （INV-51：挂载先渲染存量行盒 fallback 几何→resolve 完成跳 band 收边几何，
   实测 y 差 4.44px/正常负载窗 ~8ms）。本失败 dy=4.4375 与在档 4.44px **同值级**；
   dh=−4.975 与 band 收边（F-11 顶收 10%/底收 12%——大行盒 ~44px 时 ≈4.4+5.0）
   吻合；s2RelY 八采样恒稳 60.64（pass2 已稳态）；mutLog pass1=3 < pass2=5
   （pass1 测量时 resolve 变更序列未完）。结论：**pass1 捕获 resolve 前 fallback、
   pass2 捕获 resolved——探针自身测量的竞速窗口，非产品回归**。
2. **产品面零缺陷证据**：INV-51 稳态原子测量（stableRel 双采样稳定门）在
   reader-text.spec 受锁用例中长期绿——产品断言口径（双态收敛后测量）无此竞速。
   本跑 35/35 功能用例全绿（含 reader-text 标注链两程+P7E-03 新 reader-search 全链）。
3. **P7E-03 零交集证据**：搜索特性 idle 态零 DOM（SearchHighlightLayer state!=='done'
   返回 null——本场景无搜索动作）；PagesOverlay 仅增条件 null 子节点；z-r2e 用例
   全程无搜索交互。时序佐证：本跑冷启动方差（Defender 扫描新产物——P7E-03 实现
   报告 §8.2 在档）加宽竞速窗，属负载巧合非因果。

## 三、处置

- **根因归属=探针测量面**（pass1 缺稳定门——与原用例 stableRel 双程口径不对齐），
  产品行为=INV-51 已锚定双态。
- **修法勘误（2026-09-03 修票时发现）**：初拟「pass1 加 `if (STABLE) await
  stableGate(win)`」**修不到点上**——探针的 stableGate 是**滚动**稳定门（scrollTop
  收敛循环），不锚 INV-51 的几何双态（fallback→resolved 的 rect 跳变）。正确修法=
  **rectStableGate（几何双采样稳定门）**——crib 受锁 reader-text.spec stableRel
  已验证配方：前置观察窗 400ms（fallback→resolved 余量）+120ms 间隔采样、连续
  3 点（2 对相邻一致）0.1px 内收敛才放行、25 轮穷尽 fail loudly（静默继续=把
  假红面留给双态）；**两程**量测前各过门（pass2 同样裸测——s2RelY 稳只是时序
  巧合非保证）。z-r2e-probe.spec.ts 属 tests/ 受锁面——unlock→改→relock→
  [locked-change]。红证形态=本档两现 payload（时序竞速不可确定性复刻——P7A
  注入复刻先例不适用于纯时序竞速，以两次在档失败数据为红证据申报）。
- **立案时点排队**：P7E-03 提交后即修（探针 flake 污染后续每票 e2e 基线——
  每次全量跑都可能随机红一次，审查带宽消耗面）。
