# F-R2e 排查票门二审任务书(独立终审)

你是门二独立终审员(与门一异构)。对象=F-R2e 排查票**回炉后终态**:机制定性+修票(含门一 B-1/W-4 回炉修复)。你的职责:终审放行判定——修复是否解除 Blocker、报告口径是否如实、有无门一未覆盖的新问题。输出:每条 [B/W/N]+结论;末行给「PASS / 条件 PASS(条件列清)/ FAIL」。

审查要点:
1. 门一 B-1(稳定门穷尽静默返回)的修复形态:25 轮 3s 预算+穷尽 expect(false) 确定红+throw unreachable——是否彻底解除?expect(false,...).toBe(true) 的红形态是否可靠(Playwright expect 语义)?
2. 门一 W-4(零盒假绿)修复:measure 内 r/c 的 w/h<=0 →null(未就绪轮询,穷尽红)——display:none 假绿面是否闭合?注意:若两程恒 display:none,穷尽时 expect(prev).not.toBeNull() 先红(prev=null)——红形态正确性?
3. 修票终版 diff(下附)的其余面:抛 new Error("unreachable") 在 TS 控制流分析的作用(return 语义);25 轮×120ms×2 程时长代价;断言语义四值同源(相对 canvas)的等价性终评。
4. 报告终版(下附)口径:门一 5W/3N 处置是否到位(§0 表/W-G1 暂裁/§3 未证假说/§5 限定/§6 语义如实认定/§9 处置表)。
5. 整体放行判定:排查票交付(定性+修票+探针资产)是否达到收口标准。

## 门一裁决(全文,处置对照基准)

[routing]: run=20260902105529-swzz source=kimi-main model=kimi-k3 switches=0 usage=in=5400,out=10679 latency=257975ms (by ds-call.mjs 链)

# 门一对抗审查结论——F-R2e 排查报告+修票 diff

逐条按审查清单给结论。总评:机制排查的实验设计与诚实度整体合格(§4 遗留缺口如实入档是优点),但修票实现存在一个**静默退化路径**,且多处结论的证据强度低于表述强度。

---

## [B-1] 稳定门穷尽后静默返回未稳定值,且恰好在目标失效条件下最易触发(清单 4c)

**证据**:
```ts
expect(prev, '标注块稳态几何不可得(10 轮采样未收敛)').not.toBeNull()
return prev!
```
该 expect 只挡「11 次测量全 null(元素不存在)」,**不挡非收敛**。10 轮全不稳时 `prev` 非空,函数返回末轮未稳定值,断言照常进行——无任何告警。

**三重缺陷**:
1. **错误信息说谎**:消息文本声称「10 轮采样未收敛」会失败,代码并不在此条件失败。后来者读日志会被误导。
2. **触发条件恰是本票假红的高危位形**:报告 §3 自己论证「rAF 排队在负载态/失焦节流下可推迟数百 ms+」,而 Electron 后台页 rAF 节流的典型行为是降到 1Hz 甚至暂停——双态 resolve 延迟可逼近或超过 1.2s 预算。即:**越是报告认定的失效环境(全量序列/失焦),稳定门越可能穷尽并走静默 fallback**。修法在目标条件下不保证生效。
3. 元素迟现场景(prev 首测 null、后续非空)同样无稳定判断直接带出末值。

**处置**:非收敛必须 fail loudly(把现有 expect 改为真实检查收敛标志位),并据此重估预算(或指数退避)。报告 §6「双源通杀」「对三候选全部免疫」的保证在该路径上不成立。

---

## [W-1] 「应用面无缺陷/8ms 用户不可感」无证据,且与报告自身论证矛盾(清单 8)

- 报告 §3 用「rAF 在负载/失焦下可推迟数百 ms+」解释**测试**为何能撞进窗口;§6 却断言同一窗口对**用户**「不可感」。两条论断共享同一变量(rAF 延迟),不能只在需要时取大值。负载态下窗口若拉长到数百 ms,用户将看到 y 跳 4.44px、**h 收 19.96→14.99(约 25%)** 的色块重锚——这是可感量级。
- 「不可感」无任何测量或录屏证据支撑,仅有「8ms 单帧」这一正常负载观测。
- 结论应降级为「正常负载下窗口 ~8ms,未见用户面回归报告;负载态下短暂重锚可见性未评估」。

---

## [W-2] rAF 推迟推断的证据自相矛盾(清单 2)

- 证据=「探针 rAF 采样记录器在测试窗口下零执行」(§3/§5)。但同一报告 mutLog 显示 resolve 链(textLayer MutationObserver→**rAF 合并**→resolve,AnnotationLayer.tsx:99-128)在 rect-added 后 ~8ms 内完成——**即 rAF 实际被执行了**。
- 若 rAF 真的零执行,resolved 态根本不会出现,mutLog 双态无从谈起。两个观测不能同真,除非记录器与 resolve 链处于不同焦点/生命周期阶段——报告未做此区分说明。
- 「可推迟数百 ms+」本身无任何直接测量(没有一次跑档捕获到 >8ms 的拉伸窗口),是从一个自相矛盾的证据外推的。该推断目前支撑不了「完美解释偶发性」的强度。

---

## [W-3] W-G1 合流裁决证据不足,销项过早(清单 7)

- 形态不符:W-G1(台账 :462)是「smoke+reader-text 连跑 2/2 红」的**可复现**形态;F-R2e 两现是「全量序列内单现+复跑绿」的**偶发**形态。同机制产生两种可复现性剖面需要解释,报告未给。
- 报告 §4(a) 自己承认:跨版本同值 3.45 与「双态差随版本变(F-A4 收边口径不同,当前 4.44)」**矛盾**——即同值 3.45 反而削弱「W-G1=双态机制首现」。§0 表却仍裁决「W-G1 备案即本票机制首现」并销项,与 §4 的诚实表述不一致。
- 合流的全部证据=同测试+同数值+「当时无仪表未能观测」。在归属未定死(§4 自认)的情况下关闭 W-G1 计数,属于用未决归因做销项。建议 W-G1 保留或标注「合流为暂裁」。

---

## [W-4] 断言语义实际收窄+放宽,与 diff 注释「断言语义不变」不符(清单 5)

1. **丢失可见性守卫(放宽)**:原 `boundingBox()` 对不可见元素返回 null 触发红;新 `getBoundingClientRect()` 对 `display:none` 元素返回全零矩形——若 rect 回归为不渲染,两程均测得 {0,0,0,0},稳定门收敛、四值断言全过,**假绿**。diff measure() 无零盒/可见性检查:
   ```ts
   if (r === undefined || c === undefined) return null
   return { x: r.x - c.x, ... }  // display:none → 全零,稳定且两程同值
   ```
2. **初渲染位不再受检(收窄)**:原测量在 t0 即刻取值,fallback 态摆位错误会被两程比较捕获;新稳定门只断言**收敛后**几何。「原位」语义从「挂载即正确」收窄为「最终正确」——报告 §6 称「『原位』本就指稳态几何」是对语义的重新解释而非「不变」。
3. 容差 2px 不变本身可接受,但建立在语义已变的前提下,注释「断言语义/容差不变」过claim。

---

## [W-5] 探针「t0 位形等价」声明过度(清单 6)

- 报告 §3 解释偶发性的关键链条是「Playwright 样式断言链(~300ms+)恰可插入(被拉长的)窗口」;探针却把 toHaveCSS×3 砍掉只留部分(审查清单⑥,报告 §5 未披露删减细节)——**删掉的正是报告自己认定的窗口暴露条件**。等价性至多在「测量先行之前的 t0」成立,在失效相关窗口上不成立。
- 更根本的:15 份跑档全绿(§1.1),探针**从未复现过一次红**。它目前的实证价值仅是记录器(在自然跑中观测到双态),「仪表化复刻用例/复现判别的常备件」的定位缺乏复现实绩支撑。

---

## [N-1] 注入实验推翻票面预裁:推理成立,但仅证「存在性」不证「归因」(清单 1)

- 预裁错误属实:`boundingBox` 返回视口相对坐标,`box2`/`page2` 是两次独立跨进程调用,平移不变性只在单帧成立——报告 §2 的反驳逻辑正确,注入档 1/2 的 dy=Δ 线性(+3.2/+36.8)是直接证据。
- 注入位与自然落帧的等价性:**对「机制类存在」充分**(两次调用间发生滚动即撕裂,与滚动来源无关);**对历史 3.45 归因不充分**——且报告 §4(b) 自证程序性 scrollTop 只能产 0.8 倍数增量,注入路径被自己的量化论证排除为 3.45 来源。注入实验的最终贡献是证伪预裁+验证修法 a,而非锁定机制①为肇事源。§0「两源均实锤存在、均产恰 y 轴假红」中「均产」仅有注入态证据,自然态 7 全量+4 节流跑零落帧观测——机制①对真实红的解释力目前为零观测。措辞可接受但应知此边界。

## [N-2] 「修法对三候选全免疫,缺口不阻塞」:对三候选成立,对未知机制不成立(清单 3)

- 逐项核对:(a) 双态差任意量级→稳定门跨过,成立(受 B-1 预算限制);(b) subpixel anchoring→单 evaluate 同帧双 gBCR 同步执行、帧间无插入,成立;(c) 多 span 中间轮→稳定门覆盖,成立(同受预算限制)。
- 但 §4(a) 的同值矛盾意味着真凶**可能不在三候选内**。「免疫三候选⇒缺口不阻塞」是条件命题,报告表述基本守住了这个边界(§4 末句),备案即可;真正承担风险的是 B-1 的静默路径。

## [N-3] 稳定门洗绿真缺陷的风险:主通道在 B-1,其余为远程风险(清单 4a/4b 补充)

- 持续漂移型真缺陷:正常路径不会被洗绿(不收敛→末值参与断言,大概率仍红);洗绿 only 经 B-1 静默 fallback 的巧合两程同值。
- 0.1px/120ms 阈值:慢速漂移(<0.1px/120ms)会被判「稳定」,但跨程累计超 2px 才会漏,且两程需同向同速——远程。
- 4b 语义等价:gBCR 与 Playwright boundingBox 同为视口相对 CSS px(均含 transform/zoom 影响),实际大概率等价,但**报告与 diff 注释均未给此论证**——注释只论证了「同帧差值对滚动平移不变」,对坐标系等价性零论证。另:`locator.boundingBox()` 有多匹配严格模式,`querySelector` 静默取首个——多 canvas 场景下丢失严格性(单 canvas 现状下无实际差异)。
- 顺带:稳定门给两程各加 ≤~1.3s,13/13 绿已在档,可接受;但应在票中备案测试时长变化。

---

## 汇总

| 编号 | 级别 | 事项 |
|---|---|---|
| B-1 | Blocker | 稳定门穷尽静默返回未稳定值+错误信息说谎+恰在目标失效位形触发 |
| W-1 | Warning | 「用户不可感」无证据且与 rAF 推迟论证自相矛盾 |
| W-2 | Warning | rAF 零执行证据与 8ms resolve 观测不能同真,数百 ms 推断无直接测量 |
| W-3 | Warning | W-G1 合流销项过早:形态剖面不符+同值 3.45 反削弱双态归因 |
| W-4 | Warning | 语义实变(丢可见性守卫可假绿/初渲染位脱检),「不变」注释过claim |
| W-5 | Warning | 探针位形等价过度声明;15 跑零复现 |
| N-1~3 | Note | 预裁推翻成立(存在性≠归因)/三候选免疫为条件命题/4a-4b 残余风险备案 |

**回炉最小集**:B-1 一处(非收敛 fail loudly)即可解除 Blocker;W-1/W-3 需要降级表述或补证,不必改代码;W-4 建议补零盒守卫与注释更正。

## 修票终版 diff(git diff,100 行)

```diff
diff --git a/tests/e2e/reader-text.spec.ts b/tests/e2e/reader-text.spec.ts
index cee18c206..1915062c4 100644
--- a/tests/e2e/reader-text.spec.ts
+++ b/tests/e2e/reader-text.spec.ts
@@ -1,4 +1,4 @@
-import { test, expect, _electron as electron, type ElectronApplication } from '@playwright/test'
+import { test, expect, _electron as electron, type ElectronApplication, type Page } from '@playwright/test'
 import { spawn } from 'node:child_process'
 import { copyFile, mkdtemp, readdir, readFile, writeFile } from 'node:fs/promises'
 import { createHash } from 'node:crypto'
@@ -51,6 +51,49 @@ function launch(userData: string): Promise<ElectronApplication> {
   })
 }
 
+/**
+ * [F-R2e 修] 稳态原子测量：标注块相对页面 canvas 的归一几何（x/y/w/h）。
+ * 两源瞬态均能造成恰 y 轴假红（排查档 scripts/audits/f-r2e-investigation.md）：
+ * ①重锚双态——AnnotationLayer 先渲染存量行盒几何（fallback），resolve 完成后
+ * 跳 band 收边几何（MutationObserver 实测 y 差 4.44px、正常负载窗 ~8ms；
+ * W-G1 备案 3.45px 同族嫌疑——归属未定死见档 §4）；②两次独立 boundingBox
+ * 调用之间的滚动落帧（注入实验 dy=Δ 线性实证）。故先双采样稳定门跨过双态
+ * 瞬态，再以单 evaluate 同帧取 rect/canvas 两盒——同帧差值对滚动平移不变。
+ * 断言语义=稳态"原位"（初渲染瞬态位不属断言面——内部时序非缺陷）；可见性
+ * 守卫保留（零盒=display:none 形态视为未就绪，穷尽即红——门一 W-4）；
+ * 穷尽未收敛=fail loudly（静默返回末值会把假红面留给瞬态——门一 B-1）。
+ * 相对 canvas 归一消窗口几何漂移（窗口状态恢复取整差——原版同理）；时长
+ * 代价两程各 ≤3s（门一 N-3 备案）。
+ */
+async function stableRel(win: Page): Promise<{ x: number; y: number; w: number; h: number }> {
+  const measure = (): Promise<{ x: number; y: number; w: number; h: number } | null> =>
+    win.evaluate(() => {
+      const r = document.querySelector('[data-testid="annotation-rect"]')?.getBoundingClientRect()
+      const c = document.querySelector('canvas[data-pdf-canvas]')?.getBoundingClientRect()
+      if (r === undefined || c === undefined) return null
+      // 可见性守卫：零盒（display:none/未渲染形态）=未就绪，不当稳定值（W-4）
+      if (r.width <= 0 || r.height <= 0 || c.width <= 0 || c.height <= 0) return null
+      return { x: r.x - c.x, y: r.y - c.y, w: r.width, h: r.height }
+    })
+  let prev = await measure()
+  for (let i = 0; i < 25; i++) {
+    await win.waitForTimeout(120)
+    const cur = await measure()
+    if (
+      cur !== null && prev !== null &&
+      Math.abs(cur.x - prev.x) < 0.1 && Math.abs(cur.y - prev.y) < 0.1 &&
+      Math.abs(cur.w - prev.w) < 0.1 && Math.abs(cur.h - prev.h) < 0.1
+    ) {
+      return cur
+    }
+    prev = cur
+  }
+  expect(prev, '标注块 3s 内未出现（元素缺失或恒不可见）').not.toBeNull()
+  // B-1：非收敛必须红——穷尽静默返回末值=断言输入不可靠且恰在负载态位形触发
+  expect(false, '标注块几何 25 轮（3s）采样未收敛——双态瞬态/漂移超预算，断言输入不可靠').toBe(true)
+  throw new Error('unreachable')
+}
+
 /**
  * 种子落库（better-sqlite3 双 ABI 处理）：
  * e2e 前构建链已把 build/Release 切到 electron ABI，而本测试进程是 Node——
@@ -190,13 +233,8 @@ test('划选高亮后重开仍在原位；批注编辑与删除可用', async ()
   await expect(rect.first()).toHaveCSS('opacity', '1')
   // 单行单 span 划选：行级合并后恰 1 矩形（逐 clientRect 透传回归即 >1）
   await expect(rect).toHaveCount(1)
-  const box1 = await rect.first().boundingBox()
-  const page1 = await win.locator('canvas[data-pdf-canvas]').boundingBox()
-  expect(box1).not.toBeNull()
-  expect(page1).not.toBeNull()
-  // 位置记取归一到页面盒：窗口绝对坐标会随窗口几何漂移（窗口状态持久化的恢复值
-  // 与默认值有取整差、滚动条出现与否影响居中），"原位"语义是相对页面而非相对窗口
-  const rel1 = { x: box1!.x - page1!.x, y: box1!.y - page1!.y }
+  // [F-R2e 修] 稳态原子测量（stableRel 头注——双态瞬态+滚动撕裂双源假红面）
+  const m1 = await stableRel(win)
   await app.close()
 
   // 第二程：重开同一文献，高亮仍渲染在原位（位置断言，不只断言存在）
@@ -212,17 +250,14 @@ test('划选高亮后重开仍在原位；批注编辑与删除可用', async ()
   // [F-A5/ADR-0019 R2] 背景板序第二程同锁（multiply 摘除+z=1）
   await expect(win2.getByTestId('annotation-layer')).toHaveCSS('mix-blend-mode', 'normal')
   await expect(win2.getByTestId('annotation-layer')).toHaveCSS('z-index', '1')
-  const box2 = await rect2.first().boundingBox()
-  const page2 = await win2.locator('canvas[data-pdf-canvas]').boundingBox()
-  expect(box2).not.toBeNull()
-  expect(page2).not.toBeNull()
-  const rel2 = { x: box2!.x - page2!.x, y: box2!.y - page2!.y }
+  // [F-R2e 修] 稳态原子测量（第二程同口径——重锚双态窗口在此程）
+  const m2 = await stableRel(win2)
   // 同一渲染管线下归一化矩形应一致（相对页面盒比较，≤2px 容差吞字度量测噪声；
   // 尺寸不经窗口几何，直接比）
-  expect(Math.abs(rel1.x - rel2.x)).toBeLessThanOrEqual(2)
-  expect(Math.abs(rel1.y - rel2.y)).toBeLessThanOrEqual(2)
-  expect(Math.abs(box1!.width - box2!.width)).toBeLessThanOrEqual(2)
-  expect(Math.abs(box1!.height - box2!.height)).toBeLessThanOrEqual(2)
+  expect(Math.abs(m1.x - m2.x)).toBeLessThanOrEqual(2)
+  expect(Math.abs(m1.y - m2.y)).toBeLessThanOrEqual(2)
+  expect(Math.abs(m1.w - m2.w)).toBeLessThanOrEqual(2)
+  expect(Math.abs(m1.h - m2.h)).toBeLessThanOrEqual(2)
 
   // 点击色块 → 四选项菜单 → 添加笔记开编辑弹层 → 删除（confirm 自动接受）→ 色块消失
   // （P7-A 菜单前置后编辑器只能经「添加笔记」到达——直开路径已收口）

```

## 排查报告终版(f-r2e-investigation.md 全文)

# F-R2e 排查报告——e2e「划选高亮重开原位」序列敏感同值 3.45px(立案第 2 现/含 W-G1 首现)

> 排查票=scripts/audits/f-r2e-brief.md(2026-09-02 三波场执行)。
> 交付物=机制定性(双源瞬态实锤)+修法落地(受锁 spec 采样口径收敛,
> commit 同场)+W-G1 合流裁决。探针=tests/e2e/z-r2e-probe.spec.ts
> (仪表化复刻用例,双记录器留驻——复现判别的常备件)。

## 0. 结论速览

| 项 | 结论 |
| --- | --- |
| 断言面 | 恰 y 轴红(x/w/h 断言序在 y 后,未存档部分不排除连带红) |
| 机制 | **双源瞬态空间**:滚动撕裂=存在性实锤(注入);双态跳变=自然态直接观测(mutLog)——**「双态=历史红肇事源」为零观测推断**(自然态 11 跑零落帧零撞窗,门一 N-1 边界) |
| 历史 3.45 归属 | **遗留缺口如实入档**(§4):与当前双态差 4.44 不等、与程序性 scrollTop 量化步长 0.8 不符——subpixel scroll anchoring/历史环境 DPI 均候选;判别记录器已就位(§5) |
| 应用面缺陷 | **未见回归报告**;正常负载窗口 ~8ms,**负载态短暂重锚的用户可见性未评估**(门一 W-1 降级——不排除可感,h 收 25% 为可感量级,真机复现时可加录屏评估) |
| 修法 | **稳定门+原子化同帧测量**(b+a 组合)+穷尽 fail loudly+零盒可见性守卫(门一 B-1/W-4 回炉)——已落地 reader-text.spec.ts |
| W-G1 裁决 | **暂裁合流,计数保留不销项**(门一 W-3):机制空间与 F-R2e 重叠(同测试同数值),但形态剖面不符(W-G1=连跑 2/2 可复现 vs F-R2e=偶发单现)且 3.45 同值反削弱双态归因——归属未定死前 W-G1 维持在册,若其形态复现则新断言应转稳定绿(判别免费获得) |

## 1. 执行摘要(票面 §2 四步骤对账)

1. **带仪表复现**:自然复现未遂——单跑基线 ×1/节流 t4 ×2/t8 ×1/全量 ×7
   (含带记录器 ×2)全部 dy=0.000;探针全跑 relY=60.638 完全同值(绿跑
   指纹矩阵=零漂移零双峰,scripts/audits/f-r2e-out/ 15 份 JSON 在档)。
2. **注入实验**(机制直接证明,不依赖复现):三档全落——**滚动撕裂族
   成立,推翻票面 §1 主控排除项**(§2)。
3. **落帧源定位**:程序性写入点全枚举(renderer 仅 3 处,§4)+**rect
   生命周期双态跳变直接观测**(§3,mutLog)——机制空间收敛为二。
4. **修法**:b+a 组合落地(§6)。

## 2. 注入实验——「纯滚动撕裂族」成立(票面排除项被推翻)

票面 §1 预裁「boundingBox 视口坐标对滚动平移不变(rect/canvas 同容器同移,
rel=差值免疫 scrollTop)——注入 scrollTop 变更类假说勿再立项」。**实测推翻**:

| 档 | 注入位 | 注入量 | 实测 scrollTop | 实测 dy | 断言面 |
| --- | --- | --- | --- | --- | --- |
| 1 | 第二程 box2 与 page2 两次调用间 | +3.45 | 12→15.2 | **+3.200** | **恰 y 红**(x/w/h 绿) |
| 2 | 同位 | +37 | 12→48.8 | **+36.800** | 恰 y 红(线性) |
| 3 | 第一程测完后(跨程) | +3.45 | 第二程恢复 12 | 0.000 | 全绿(恢复链洗掉注入) |

- 排除项论证缺陷:平移不变性只在**单帧内**成立;`box2=rect.boundingBox()`
  与 `page2=canvas.boundingBox()` 是**两次独立跨进程调用**,两测之间发生
  滚动落帧 Δ 时,box2 取滚动前视口坐标、page2 取滚动后视口坐标,rel2.y
  恰偏 Δ——「两次测量跨滚动帧=撕裂」被排除项错误推广到「滚动不影响 rel」。
- 档 1 注入 3.45 实落 3.2:scrollTop 物理像素量化(15.2-12=3.2=4×0.8,
  DPR=1.25 环境)——**程序性 scrollTop 写入只能产生 0.8 倍数增量**,
  3.45 非 0.8 倍数(3.45/0.8=4.3125)——历史 3.45 若来自本机制,写入源
  须为 subpixel(见 §4 遗留缺口)。
- **原子对照在注入后仍稳定 60.64**(同帧单 evaluate 的 relY)——同帧测量
  免疫滚动撕裂=修法 a 有效性的直接实证。

## 3. rect 生命周期双态跳变——W-G1 假说的首次直接观测

MutationObserver 记录器(观察 annotation-rect 的 style 变化与插入,每次
变化记 gBCR 几何;探针 mutLog)在**每程**都观测到同一形态:

```
pass1: t=756 rect-added y=182.59 h=19.96 → t=761 rect-style y=187.03 h=14.99
pass2: t=402 rect-added y=182.59 h=19.96 → t=410 rect-style y=187.03 h=14.99
(两程完全一致;自然跑多轮全同)
```

- **fallback 态**(AnnotationLayer 挂载首渲染):rects=存量 a.rects(DB
  划选行盒几何)+fallbackBands=[]→y=182.59/h=19.96(行盒高)
- **resolved 态**(resolve 完成重渲染):重锚 rects+band 收边→
  y=187.03/h=14.99(字形带高)
- **两态 y 差=4.44px、h 差=4.97px,窗口 ~8ms**(正常负载)
- 代码锚:AnnotationLayer.tsx:209 `resolved[a.id]?.bands ?? fallbackBands`
  双态表达式;resolve 链=AnnotationLayer.tsx:99-128(textLayer
  MutationObserver→**rAF 合并**→resolveAnnotationRects)
- 8ms 窗口对测量可达的条件:resolve 的 rAF 排队在负载态/窗口失焦节流下
  可推迟——**注意:此为未证假说**(门一 W-2:探针 rAF 记录器零执行与
  resolve 链 8ms 完成两观测不能同真,条件差异未定位;「数百 ms+」无直接
  测量,11 跑无一次 >8ms 拉伸窗口捕获)。偶发性的窗口拉长机制未定,
  候选=resolve rAF 推迟/Playwright 轮询与渲染管线竞争/CPU 负载拉伸
  8ms 基线——修法(稳定门+穷尽 fail loudly)保证:窗口拉长位形下测试
  以**确定红**(未收敛)或**稳定绿**(瞬态已过)暴露,不再假红
- 若 box2 撞 fallback 态而 rel1 为 resolved 态:dy=两态差(恰 y 红,
  h 亦差但断言序 y 先停)——与历史形态吻合(**归因为推断,零直接观测**)
- **W-G1 暂裁合流(门一 W-3 修订)**:W-G1 备案(F-A4 场台账 :462「band
  双态渲染 resolve 落地竞态,终态无回归」)与 F-R2e 机制空间重叠(同
  测试+同数值 3.45),但形态剖面不符(连跑 2/2 可复现 vs 偶发单现)+
  3.45 跨版本同值反削弱双态归因(§4a)——**W-G1 计数保留不销项**,
  mutLog 完成的首次双态直接观测+量化为其提供机制画像,归属随 F-R2e
  遗留缺口一并待定

## 4. 落帧源定位与遗留缺口

**程序性 scrollTop 写入点全枚举**(grep renderer 全域):仅 3 处——
PageColumn.tsx:209(段⑥ zoom 锚:重开 prevZoom 初始化即当前值,不触发)、
scroll-converge.ts:75(段⑤恢复收敛:重开实测单 scroll 事件 0→12,
早于 visible 门)、LineageNodeCard/LineageEdges(血统图,无关)。
**zoom 派生链排除**:zoom=tab 档位(ReaderPage.tsx:61,非 fit-width
派生),重开恒 1,段⑥不触发。

自然跑记录(scroll 事件驱动记录器,零轮询零遗漏):恢复链恰一次滚动
(→y=12)后完全静止;7 全量+节流跑无自然落帧观测。

**遗留缺口(如实入档)**:历史 3.45px 的精确归属未定死——
(a) 双态差当前=4.44(F-A5 后口径),F-A4 时代(F-11 收边 10%/12%)不同,
    但 W-G1 首现(08-31 F-A4 场)与 F-R2e 两现(09-02 F-A5 后)同值
    3.45 跨版本——与「双态差随版本变」矛盾;
(b) 滚动撕裂经程序性 scrollTop 只能 0.8 倍数增量,3.45 不符——
    subpixel 源(Chromium scroll anchoring 的布局补偿不经物理量化)候选;
(c) 中间轮 resolved 值(textLayer 逐 span 入 DOM 的 rAF 合并重跑)在本
    fixture(单 span)不存在,多 span 场景候选。
判别条件:下次复现时探针双记录器(scroll+mut)一跑定案——本报告修法
(b+a 组合)对三候选**全部免疫**(稳态门跨双态/中间轮,同帧测量跨滚动
/anchoring),归属缺口不阻塞修法有效性。

## 5. 探针资产(tests/e2e/z-r2e-probe.spec.ts)

- 仪表化复刻 :163 用例位形(**原路径测量先行**=t0 之前位形等价;样式
  断言链有删减——失效窗口暴露条件**不与原用例等价**,门一 W-5 限定);
  15 跑档零复现——实证价值=记录器(双态自然态观测),「复现判别常备件」
  定位待实绩支撑;
- 四类仪表:路径测量(原样)/原子对照(单 evaluate 同帧)/时间序列
  (250ms×N)/**双记录器**(scroll 事件驱动+rect MutationObserver——
  rAF 方案在 Electron 失焦窗口零执行,实证弃用);
- 参数化:PROBE_THROTTLE(CPU 节流)/PROBE_STABLE(稳定门对照)/
  PROBE_INJECT(注入三档);输出=scripts/audits/f-r2e-out/*.json;
- 15 份跑档 JSON 在档(基线/节流/全量/注入全矩阵)。

## 6. 修法(已落地:reader-text.spec.ts [locked-change];门一 B-1/W-4 回炉后形态)

```ts
// [F-R2e 修] 稳态原子测量:双采样稳定门(120ms×25 轮=3s 预算,负载态
// 足量——门一 B-1 重估)+穷尽 fail loudly(非收敛=确定红,静默返回末值
// 恰在目标失效位形构成假红面——门一 B-1)+零盒可见性守卫(display:none
// 形态视为未就绪,穷尽红——恢复原 boundingBox 的可见性守卫语义,门一
// W-4)+单 evaluate 同帧取 rect/canvas 两盒(同帧差值对滚动平移不变)
async function stableRel(win) { ... }
```

- 覆盖论证:双态跳变(8ms 基线窗,mutLog)被稳定门跨过;滚动撕裂
  (注入实验 dy=Δ)被同帧测量根除(注入档原子对照 60.64 稳定在档);
  §4 三候选全免疫(**条件命题**——真凶若在三候选外则免疫性不保证,
  门一 N-2;但任何几何瞬态/滚动形态都会落入「稳定门或原子测量」的
  防线之一,fail loudly 保证异常以确定红暴露)。
- 断言语义=**稳态"原位"**(初渲染瞬态位不属断言面——内部时序非缺陷;
  原版 t0 即刻取值实际是瞬态位混入,门一 W-4 指出此为语义收窄,如实
  认定:原语义从未声明「挂载即正确」,瞬态位混入恰是本票 flaky 根源);
  2px 容差不变;时长代价两程各 ≤3s(门一 N-3 备案)。
- **修的是测试采样口径,不是应用**:应用未见用户回归报告;负载态短暂
  重锚可见性未评估(§0);若后续真机复现用户可感跳动,另立应用面修票
  (候选=AnnotationLayer 首渲染不显示 fallback 态或瞬态过渡抑制)。
- 变异红证等价物在档:修前测量路径+注入=dy=3.2 红(注入档 1);修后
  同帧测量在注入下稳定(原子对照)——红绿双向实证;B-1 修复的穷尽红
  路径=expect(false) 确定性红(代码级可验)。

## 9. 门一审(2026-09-02 三波场)与处置

门一=Kimi 外部链(f-r2e-gate1-kimi.md,in=5400/out=10679/258s):
**1B/5W/3N**。处置:

| 编号 | 裁决要点 | 处置 |
| --- | --- | --- |
| B-1 | 稳定门穷尽静默返回未稳定值+错误信息说谎+恰在目标失效位形触发 | **回炉修复**:25 轮(3s)预算+穷尽 expect 确定红(代码) |
| W-1 | 「用户不可感」无证据且与 rAF 推迟论证矛盾 | 报告 §0/§6 降级为「可见性未评估」 |
| W-2 | rAF 零执行与 8ms resolve 两观测矛盾,数百 ms 推断无直接测量 | 报告 §3 降级为「未证假说」,偶发性解释改列三候选 |
| W-3 | W-G1 合流销项过早(形态不符+同值反削弱) | 改**暂裁合流,计数保留**(报告 §0/§3) |
| W-4 | 零盒假绿面(display:none→全零稳定)+「语义不变」过claim | **代码修复**(零盒守卫)+语义如实认定(§6) |
| W-5 | 探针位形等价过度声明+零复现实绩 | 报告 §5 限定声明 |
| N-1~3 | 存在性≠归因/三候选免疫条件命题/时长备案 | 措辞边界入档(§0/§6) |

## 7. 验证与收口

- 修后 reader-text spec 13/13 绿;全量 verify/e2e 见收口单(同场)。
- 台账:F-R2e 条目闭环+W-G1 销项合流;INV 登记(见 invariants.md 同场)。

## 8. 排查成本

主控 GLM5.3×bigmodel-coding-plan 全程亲做(探针三版迭代+15 跑矩阵+
注入三档+静态枚举+修票+报告);无实现者子代理(排查票+压缩票形态,
修票无实现设计空间);门审外部链见门审档。

