# F-R2e 排查票门一审任务书(对抗式审查)

你是门一对抗审查员。审查对象=F-R2e 排查票的**机制定性+修票**双交付。
材料:①排查报告(下附全文)②修票 diff(93 行,下附)③原始票面要点。
你的职责:找定性证据链的漏洞、修票的正确性缺陷、被掩盖的风险。只报告有
证据支撑的问题;不确定的明确说不确定。用中文输出。输出格式:每条
[B/W/N](Blocker=必须回炉/Warning=需补证或说明/Note=备案)+理由+证据锚。

## 审查清单(逐项给结论)

1. **注入实验的推理效度**:报告 §2 用注入实验(dy=Δ 线性)推翻票面 §1 的
   「纯滚动撕裂族不成立」预裁——预裁的错误论证(平移不变性被错误推广到
   跨帧两次测量)是否成立?注入位(box2 与 page2 两次调用之间)与自然
   落帧位形的等价性论证是否充分?
2. **双态观测的解读**:报告 §3 mutLog(fallback y=182.59/h=19.96 →
   resolved y=187.03/h=14.99,窗 ~8ms,两程全同)——「8ms 窗口对测量
   可达」依赖「rAF 排队在负载态/失焦下可推迟数百 ms」的推断,该推断的
   证据(探针 rAF 记录器零执行)是否足够支撑?
3. **遗留缺口的诚实度**:报告 §4 承认历史 3.45 与当前双态差 4.44 不等、
   与程序性 scrollTop 量化步长 0.8 不符,归属未定死——「修法对三候选
   全免疫所以缺口不阻塞」的论证是否成立?
4. **修票正确性**:diff 中 stableRel(双采样稳定门 120ms×10 轮+单 evaluate
   同帧取 rect/canvas)——a) 稳定门会不会把真缺陷(应用几何持续漂移)
   洗成绿?b) 原子测量(evaluate gBCR)替换 Playwright boundingBox 的
   语义等价性(CSS zoom/DPR 下 gBCR 与 boundingBox 的坐标差)论证在哪,
   是否充分?c) 10 轮×120ms=1.2s 上限超时后 expect(prev).not.toBeNull()
   只查非空不查稳定——10 轮全不稳时返回末值参与断言,这是缺陷还是可
   接受?
5. **断言语义漂移**:原断言 rel 与 w/h 分立(boundingBox),新断言四值
   同源(m.x/y/w/h 均为 rect 相对 canvas)——「原位」语义是否被收窄或
   放宽?容差 2px 不变是否足够?
6. **探针资产位形等价性**:探针自称「原路径测量先行=与原用例 t0 位形
   等价」,但探针在样式断言链上比原用例少(toHaveCSS×3 只保留部分,
   count 保留)——位形等价声明是否过度?
7. **W-G1 合流**:报告 §3 裁决 W-G1(台账 :462 备案)与 F-R2e 同机制
   合流——W-G1 是「smoke+reader-text 连跑 2/2 红」形态,F-R2e 两现是
   「全量序列内单现+复跑绿」形态,合流的证据是否充分?
8. **应用面「无缺陷」结论**:双态跳变 8ms 用户不可感+终态无回归——
   重开瞬间用户是否可能看到色块跳变(fallback 黄块闪现)?「不可感」
   有无证据?

## 排查报告全文(scripts/audits/f-r2e-investigation.md)

# F-R2e 排查报告——e2e「划选高亮重开原位」序列敏感同值 3.45px(立案第 2 现/含 W-G1 首现)

> 排查票=scripts/audits/f-r2e-brief.md(2026-09-02 三波场执行)。
> 交付物=机制定性(双源瞬态实锤)+修法落地(受锁 spec 采样口径收敛,
> commit 同场)+W-G1 合流裁决。探针=tests/e2e/z-r2e-probe.spec.ts
> (仪表化复刻用例,双记录器留驻——复现判别的常备件)。

## 0. 结论速览

| 项 | 结论 |
| --- | --- |
| 断言面 | 恰 y 轴红(x/w/h 断言序在 y 后,未存档部分不排除连带红) |
| 机制 | **双源瞬态空间**,两源均实锤存在、均产恰 y 轴假红(§2/§3) |
| 历史 3.45 归属 | **遗留缺口如实入档**(§4):与当前双态差 4.44 不等、与程序性 scrollTop 量化步长 0.8 不符——subpixel scroll anchoring/历史环境 DPI 均候选;判别记录器已就位(§5) |
| 应用面缺陷 | **无**(瞬态 8ms 单帧,用户不可感;终态几何无回归——F-A4 场 W-G1 备案同口径) |
| 修法 | **稳定门+原子化同帧测量**(b+a 组合,双源通杀)——已落地 reader-text.spec.ts,断言语义/容差不变 |
| W-G1 裁决 | **与 F-R2e 合流**:W-G1 备案(F-A4 场 08-31「band 双态渲染 resolve 落地竞态 3.45px 2/2 红」)即本票机制首现,mutLog 首次直接观测+量化(§3) |

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
  可推迟数百 ms+(Electron backgroundThrottling;同场实证:探针 rAF 采样
  记录器在测试窗口下**零执行**),Playwright 样式断言链(~300ms+)恰可
  插入窗内——**完美解释偶发性**(全量序列系统忙/失焦更易、单跑绿、复跑绿)
- 若 box2 撞 fallback 态而 rel1 为 resolved 态:dy=两态差(恰 y 红,
  h 亦差但断言序 y 先停)——**与历史形态全吻合**
- **W-G1 合流裁决**:W-G1 备案(F-A4 场台账 :462「band 双态渲染 resolve
  落地竞态,终态无回归」)= 本机制首现观察,当时无仪表未能观测;本场
  mutLog 完成首次直接观测+量化。W-G1 计数 1 销项并入 F-R2e 闭环。

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

- 仪表化复刻 :163 用例位形(**原路径测量先行**=与原用例 t0 位形等价,
  仪表殿后不给 resolve 留 settle 时间——位形等价性是探针有效性前提);
- 四类仪表:路径测量(原样)/原子对照(单 evaluate 同帧)/时间序列
  (250ms×N)/**双记录器**(scroll 事件驱动+rect MutationObserver——
  rAF 方案在 Electron 失焦窗口零执行,实证弃用);
- 参数化:PROBE_THROTTLE(CPU 节流)/PROBE_STABLE(稳定门对照)/
  PROBE_INJECT(注入三档);输出=scripts/audits/f-r2e-out/*.json;
- 15 份跑档 JSON 在档(基线/节流/全量/注入全矩阵)。

## 6. 修法(已落地:reader-text.spec.ts [locked-change])

```ts
// [F-R2e 修] 稳态原子测量:双采样稳定门(120ms×10 轮,跨双态瞬态/中间轮)
// +单 evaluate 同帧取 rect/canvas 两盒(同帧差值对滚动平移不变——撕裂根除)
async function stableRel(win) { ... } // 断言语义(稳态"原位")/2px 容差不变
```

- 覆盖论证:双态跳变(8ms 窗,mutLog)被稳定门跨过;滚动撕裂(注入实验
  dy=Δ)被同帧测量根除(注入档原子对照 60.64 稳定在档=直接实证);两源
  之任何 subpixel 变体同被覆盖(§4 三候选全免疫)。
- **修的是测试采样口径,不是应用**:应用无用户可感缺陷(8ms 单帧瞬态+
  终态无回归);「原位」断言语义本就指稳态几何。
- 变异红证等价物在档:修前测量路径+注入=dy=3.2 红(注入档 1);修后
  同帧测量在注入下稳定(原子对照)——红绿双向实证。

## 7. 验证与收口

- 修后 reader-text spec 13/13 绿;全量 verify/e2e 见收口单(同场)。
- 台账:F-R2e 条目闭环+W-G1 销项合流;INV 登记(见 invariants.md 同场)。

## 8. 排查成本

主控 GLM5.3×bigmodel-coding-plan 全程亲做(探针三版迭代+15 跑矩阵+
注入三档+静态枚举+修票+报告);无实现者子代理(排查票+压缩票形态,
修票无实现设计空间);门审外部链见门审档。


## 修票 diff(tests/e2e/reader-text.spec.ts,93 行)

```diff
@@ launch 函数后新增 @@
+/**
+ * [F-R2e 修] 稳态原子测量:标注块相对页面 canvas 的归一几何(x/y/w/h)。
+ * 两源瞬态均能造成恰 y 轴假红(排查档 scripts/audits/f-r2e-investigation.md):
+ * ①重锚双态——AnnotationLayer 先渲染存量行盒几何(fallback),resolve 完成
+ * 后跳 band 收边几何(MutationObserver 实测 y 差 4.44px、窗 ~8ms,负载态可拉长
+ * ——F-A4 场 W-G1 备案 3.45px 同族);②两次独立 boundingBox 调用之间的滚动
+ * 落帧(注入实验 dy=Δ 线性实证)。故先双采样稳定门跨过双态瞬态,再以单
+ * evaluate 同帧取 rect/canvas 两盒——同帧差值对滚动平移不变。断言语义
+ * (稳态"原位")与 2px 容差不变,仅采样口径收敛;相对 canvas 归一同时
+ * 消窗口几何漂移(窗口状态恢复取整差——原 boundingBox 版同理)。
+ */
+async function stableRel(win: Page): Promise<{ x: number; y: number; w: number; h: number }> {
+  const measure = (): Promise<{ x: number; y: number; w: number; h: number } | null> =>
+    win.evaluate(() => {
+      const r = document.querySelector('[data-testid="annotation-rect"]')?.getBoundingClientRect()
+      const c = document.querySelector('canvas[data-pdf-canvas]')?.getBoundingClientRect()
+      if (r === undefined || c === undefined) return null
+      return { x: r.x - c.x, y: r.y - c.y, w: r.width, h: r.height }
+    })
+  let prev = await measure()
+  for (let i = 0; i < 10; i++) {
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
+  expect(prev, '标注块稳态几何不可得(10 轮采样未收敛)').not.toBeNull()
+  return prev!
+}
@@ 第一程测量段 @@
-  const box1 = await rect.first().boundingBox()
-  const page1 = await win.locator('canvas[data-pdf-canvas]').boundingBox()
-  expect(box1).not.toBeNull()
-  expect(page1).not.toBeNull()
-  // 位置记取归一到页面盒:窗口绝对坐标会随窗口几何漂移(窗口状态持久化的恢复值
-  // 与默认值有取整差、滚动条出现与否影响居中),"原位"语义是相对页面而非相对窗口
-  const rel1 = { x: box1!.x - page1!.x, y: box1!.y - page1!.y }
+  // [F-R2e 修] 稳态原子测量(stableRel 头注——双态瞬态+滚动撕裂双源假红面)
+  const m1 = await stableRel(win)
@@ 第二程测量段+断言 @@
-  const box2 = await rect2.first().boundingBox()
-  const page2 = await win2.locator('canvas[data-pdf-canvas]').boundingBox()
-  expect(box2).not.toBeNull()
-  expect(page2).not.toBeNull()
-  const rel2 = { x: box2!.x - page2!.x, y: box2!.y - page2!.y }
-  expect(Math.abs(rel1.x - rel2.x)).toBeLessThanOrEqual(2)
-  expect(Math.abs(rel1.y - rel2.y)).toBeLessThanOrEqual(2)
-  expect(Math.abs(box1!.width - box2!.width)).toBeLessThanOrEqual(2)
-  expect(Math.abs(box1!.height - box2!.height)).toBeLessThanOrEqual(2)
+  // [F-R2e 修] 稳态原子测量(第二程同口径——重锚双态窗口在此程)
+  const m2 = await stableRel(win2)
+  expect(Math.abs(m1.x - m2.x)).toBeLessThanOrEqual(2)
+  expect(Math.abs(m1.y - m2.y)).toBeLessThanOrEqual(2)
+  expect(Math.abs(m1.w - m2.w)).toBeLessThanOrEqual(2)
+  expect(Math.abs(m1.h - m2.h)).toBeLessThanOrEqual(2)
```

## 验证记录

- 修后 reader-text spec 13/13;全量 verify(node24 口径)126 文件 1093 用例
  exit=0 亲验;e2e 全量 32/32 exit=0 亲验。
- 环境注记:本机 Node 已被升到 25.2.1(AGENTS 在档=24),Node25 下 vitest
  2.1.9 的 jsdom localStorage 装载破损致 split-pane 11 用例结构性红
  (node24 对照 11/11 绿)——环境问题非代码缺陷,本场验证走 node24 同口径。

## 关键原始数据(摘)

- 注入三档:{档1: +3.45→dy=3.200 恰y红 x/wh 绿, scrollTop 12→15.2},
  {档2: +37→dy=36.800 同形态}, {档3: 跨程注入→dy=0, 恢复链洗掉}
- mutLog 两程全同:rect-added y=182.59 h=19.96 → rect-style(~8ms 后)
  y=187.03 h=14.99;自然跑(基线1+节流3+全量7)dy=0.000 全绿零跳变残留
- 原子对照在注入后仍稳定 60.64(同帧免疫滚动的直接实证)
