# F-A4 门一对抗深审材料包

> 你是门一对抗审查员(异基座 deepseek)。工单=选区视觉并集自绘+标注贴行自适应+工具条定位归一(三面同链,用户 2026-08-31 复测反馈驱动)。对抗性审查:行为缺陷/测试盲区/票面-实现偏差/取证不充分。每条【B/W/N+证据引用】。

## 主控裁决记录(审你是否有异议)

- **R2-SET1 受锁断言修正(主控直改,非实现者面)**:同场需求 1 顶栏增高令(theme.css header 44→56px,主控直做)使 smoke.spec 三处「header 恒 44」断言过时——实现者隔离实验实证(还 HEAD 即绿)。主控改断言 44→56([locked-change] 随用户令)+复跑 smoke 6/6 绿。主控直做时漏查受锁断言面——教训披露:直做改动同样要 grep 受锁面。
- 实现者 7 项自裁(报告 §2):portal 进页盒(票面字面=SelectionLayer 内渲染,实装=portal 进页盒 z2——为锚定页盒坐标系)/上游 mergeLineRects 同修(票面只指 mergeRects)/band 半前导负值修正等——主控预审均合理,你复核。
- ADR-0019 R1 修订(回官方原生→自绘并集):依据=用户根治令「重叠不加深」+native ::selection 无法并集(pdf.js 官方缺陷同型)+当年删除病根(拖选零反馈/30% accent 近不可见)今均已解(selectionchange 200ms 路径在场/灰 0.20 在案)。

## 审查清单(五问)

1. 行为:a 面自绘层与 ::selection transparent 的组合——拖选期(selectionchange 200ms 节流)与松手/清除的视觉-状态同步(INV-37 Escape 语义)?portal 进页盒的生命周期(页盒卸载/换页)是否干净?b 面行高感知容差(lineH 可选参)对存量 rects 零迁移是否真成立(挂 B 读时归并路径)?c 面归一比值(守卫≤0→1)在 jsdom(clientWidth=0)与真机的分支行为?
2. 测试:新 selection-paint.test 11 用例+受锁三件改写是否锁死三面行为?先行红证据(3 断言红+1 模块红+e2e 断言红)对 HEAD 的有效性?变异 M1~M5 各锁独立面?
3. 票面-实现偏差:三面修法兑现?§0 矩阵逐格?自裁 7 项是否越票面?
4. 取证:真机 12/12(large 档真鼠标)修前/修后数值(自绘 0→4 块相交 0/并簇 1→3 块顶偏 1.48px/工具条 334.1→9.4px/zoom 漂移 0.67%)是否充分支撑三面闭环?修前基线(baseline.raw)与修后对照的实验设计是否同点位唯一变量?
5. 受锁改写:selection-layer.test(定位断言归一坐标)/annotation-merge.test(INV-40 边界)/reader-text.spec(官方半透明值→自绘断言,0 计数守卫反转为在场断言)——改向是否忠实(改断言让过 vs 语义随令)?smoke.spec 44→56 主控修正是否完备(还有无其他 44 锚)?

## 证据关键段原文

### 真机探针 results(修前/修后对照)

```json
[
 {
  "id": "a/paint-present",
  "baselineOnly": true,
  "detail": "自绘块 0 个（跨 3 行拖选；::selection=rgba(0, 0, 0, 0.2)）"
 },
 {
  "id": "a/paint-no-overlap",
  "baselineOnly": true,
  "detail": "自绘块两两相交面积 max=0.00px²（≤0.5 吞亚像素）"
 },
 {
  "id": "a/native-selection-transparent",
  "baselineOnly": true,
  "detail": "::selection computed=rgba(0, 0, 0, 0.2)（transparent——视觉单通道=自绘层）"
 },
 {
  "id": "c/toolbar-in-viewport",
  "baselineOnly": true,
  "detail": "工具条 (1255,566,333×38) 在滚动容器 (515,143,1537×965) 可视区内"
 },
 {
  "id": "c/toolbar-near-selection",
  "baselineOnly": true,
  "detail": "工具条距选区顶 334.1px（<60）"
 },
 {
  "id": "b/ann-align-text",
  "baselineOnly": true,
  "detail": "标注块边缘与行簇顶/底偏差 max=0.96px（≤2；1 块）"
 },
 {
  "id": "b/ann-no-overlap",
  "baselineOnly": true,
  "detail": "标注块两两相交面积 max=0.00px²"
 },
 {
  "id": "f/no-pageerror",
  "baselineOnly": true,
  "detail": "页面错误 0 条"
 }
]
```

## 票面全文

# F-A4 需求票:选区视觉并集自绘+标注贴行自适应+工具条定位归一(三面同链)

> 需求源:用户 2026-08-31 复测反馈(最高优先级,附两图)。基线:verify
> 117 文件 987 / locks 199 / e2e 29(ce4ccbeeb)。用户理想状态原话:
> 「连续段落选中,矩形高度与位置匹配文字;重叠部分渲染不加深;或依据
> pdf 文字大小和行间距决定矩形多宽」。

## 0. 现象×根因×修法矩阵(排场探员全链报告已实证行号;交审计)

| 面 | 现象(用户图证) | 根因(行号证据) | 修法 |
| --- | --- | --- | --- |
| a 选区重叠加深 | 图一:多行灰块行交界横向深带 | **native ::selection 逐 span 绘制**(text-layer.css:84-86,alpha 0.20),pdf.js span 行盒=CSS 回退字体度量(annotation-style.ts:28-33)相邻行垂直重叠→0.20×2≈0.36;**行间钳制(mergeLineRects/mergeRects)只挂保存/渲染链,live 选区零覆盖**(annotation-anchor.ts:191-203);官方 pdf.js 已知缺陷(同 issue #17561)——**CSS 层无解,唯一根治=自绘并集** | SelectionLayer evaluate 已产出像素域 rects——新增自绘并集层(mergeRects 产物单次绘制),::selection 背景透明化;**ADR-0019 R1 修订**(原裁决回官方原生;当年删除病根=拖选零反馈(挂 mouseup/防抖后)+30% accent 近不可见——今 selectionchange 200ms 防抖路径在场+观感灰 0.20 在案,两病根均解;修订依据=用户根治令) |
| b 标注贴行 | 图二:黄块左下偏+跨两行不分行+左溢出文字区 | ①INV-40 已知边界:紧行距跨行并簇成**单高块**(annotation-merge.ts 聚类容差 min(hNew,hRowMedian)/2);②TRIM_TOP=0.1/TRIM_BOTTOM=0.12 **定值**收边对行高不匹配(annotation-style.ts:34-35,F-11 定值修复的残余);③渲染重锚 findRangeAtOffset 同管线放大;④ui-scale≠1 量测污染加分(F-R2 同族,160-450px 在档) | ①并簇容差改行高感知(以 PDF 行高(textContent item 高度/textLayer span 行盒簇)为基准而非输入 rect 高);②TRIM 定值→**按行高自适应**(用户理想状态:矩形高度与位置匹配文字——以该行簇的 span 实测行盒为准,不再百分比定值硬切);③重锚链同源受益 |
| c 工具条偏远 | 图一:弹窗在视口底部远离选区 | **坐标系双重放大**:x/y=gBCR 视口 px 差值(已含 ui-scale ×1.25)写入 left/top 后又被 CSS zoom 再放大(SelectionLayer.tsx:148-152;挂载盒在补偿子树外);且**无视口夹取/无下翻转**(永远放选区上方 42px,y=max(...,0) 贴页顶) | ①差值÷有效 zoom 归一(crib F-L2 rootToLocalScale 思想 reader 版:clientWidth/gBCR.width 比值,零 CSS 类耦合);②视口夹取(工具条不越滚动容器可视区)+选区近顶时下翻转(放选区下方) |

跨面序列:S1 拖选中(200ms 节流)自绘块实时跟随+S2 松手保存(自绘块与保存 rects 同源——**所见即所存**)+S3 保存后标注渲染(b 面贴行,与自绘块对齐)+S4 工具条在视口内贴选区(c 面)+S5 Escape 清除(自绘块随选区清除——INV-37 视觉-状态严格同步语义保持)+S6 换档/缩放下三面几何稳定。

## 1. 行为层

- **a**:SelectionLayer 渲染自绘并集层(数据=evaluate 时 mergeLineRects+mergeRects 像素域产物;渲染 div absolute 于挂载盒,色 rgba(0,0,0,0.20) 同现观感);::selection 背景 transparent(text-layer.css 改);拖选期经 selectionchange 200ms 防抖更新(既有节流);Escape/清除同步消失(INV-37)。
- **b**:mergeRects 聚类容差行高感知化(紧行距不再跨行并簇——INV-40 边界修复,登记册同步);rectStyle TRIM 改行盒基准(该行簇 span 实测行盒,顶贴字形顶缘底贴底缘的既有 F-11 语义用自适应值实现);**存量 rects 兼容**(挂 B 读时归并不变——零迁移)。
- **c**:SelectionLayer 工具条定位差值÷有效 zoom(比值=el.clientWidth/el.gBCR.width 同型 helper,守卫≤0→1);视口夹取(滚动容器可视区 clamp)+选区顶距视口顶<工具条高+间隙时下翻转。
- 既有零变:保存链归一化坐标存储/verifyQuote 自愈/AI 层管线/跨页拒绝/F-12 拖选位移阈值/选择模式(INV-42)。

## 2. 接口层

- SelectionToolbar props(x/y)+SelectionLayer 对外行为零变;annotation-merge 导出签名如需扩(行高参数)**可选参缺省兼容**;text-layer.css ::selection 值改 transparent(组件库内部)。

## 3. 架构层

- 自绘层驻 SelectionLayer(组件内局部 state 渲染——不复活 SelectionRects.tsx 旧件名,新写并入或拆件按 ≤250 行红线自裁);行高感知数据源=textLayer span(渲染时 DOM 在场);分层不动零新依赖。
- **受锁改写面(主控已 unlock,实现者可改;禁跑 locks 命令)**:tests/unit/renderer/selection-layer.test.tsx(定位断言改归一坐标+新断言)/tests/unit/renderer/annotation-merge.test.ts(INV-40 边界新断言)/tests/e2e/reader-text.spec.ts(官方半透明精确值断言→自绘并集断言;selection-rects 0 计数守卫**反转**为自绘在场断言)——**改向先行红**,全量 verify 必跑(AGENTS 受锁 e2e 教训)。

## 4. 生命周期层

- 自绘层生命周期=选区生命周期(evaluate 置位/清除置空);换页/换文献随挂载盒卸载;不做:选区动画/跨页选区渲染(既有拒绝面)。

## 5. 文化层

- 新测试 tests/unit/renderer/selection-paint.test.tsx(always-active):a 面并集层渲染(相邻行重叠输入→单层不叠深——断言渲染 div 数=归并数+无重叠区域)+S1~S5 序列;b 面紧行距夹具不再并簇+TRIM 自适应值断言;c 面归一/夹取/翻转三态。
- 变异红证 M1~M5(cp 备份一次性目录+F-R1 事故教训:还原 diff+回绿双验)。
- 真机探针 scripts/audits/f-a4-verify.mjs(先核撞名):**用户实况 large 档**真实库——修前三现象基线取证(数值)→修后复测:①多行拖选自绘块无叠深(相邻块两两相交面积=0,crib INV-40 判据);②保存标注渲染与自绘块对齐(同文字行簇 top/height 偏差≤2px);③工具条 bounding 在滚动容器可视区内且距选区顶<60px;④S6 三档/缩放稳定;⑤pageerror 0。

## 6. 证据与报告契约(实现者)

- impl 报告 scripts/audits/f-a4-impl.report.md:三面×根因×修法对照+自裁申报+**数字全部 wc/实测后落笔**(F-R1 教训)+diff 自查+成本;受锁改写逐文件列明理由。
- 禁 git/registry/locks 命令;卡住停手;红→绿→变异红证。


## 实现报告全文

# F-A4 实现报告——选区视觉并集自绘+标注贴行自适应+工具条定位归一（三屋第一屋·实现者）

> 工单：scripts/audits/f-a4-ticket.md（无探员报告——主控预告按票面 §0 矩阵执行）。
> 实现：2026-08-31，实现者子代理（GLM 主模型；无再派发）。本文所有计数/行数
> 均为 wc/命令实测后落笔。

## 1. 三面×根因×修法对照（票面 §0 逐格交付）

| 面 | 根因（票面行号证据） | 修法（落地形态） | 修前基线（真机实测） | 修后复测（真机实测） |
| - | --- | --- | --- | --- |
| a 选区重叠加深 | native ::selection 逐 span 绘制，相邻行盒垂直重叠处 0.20×2≈0.36 叠深（text-layer.css:84-86） | SelectionLayer evaluate 渲染 SelectionPaint（selection-paint.tsx，portal 进选区所在页盒 z2）：数据=mergeLineRects+mergeRects 归并产物（与保存 rects 同源）；::selection→transparent；拖选经 selectionchange 200ms 防抖 | 自绘块 0 个；::selection=rgba(0,0,0,0.2)（叠深通道在场） | 自绘块 4 个（跨 3 行拖选）两两相交面积 0.00px²；::selection=rgba(0,0,0,0)；pageerror 0 |
| b 标注贴行 | ①紧行距跨行并簇成单高块（聚类容差以输入 rect 高为基准）②TRIM 定值收边对行高不匹配 ③重锚同管线放大 | ①mergeRects 可选 lineH 钳制容差+mergeLineRects 像素域 lineH 在场改中心距判据（lineH=选区 span 字号中位数——挂 A rectsBetweenPoints/挂 B AnnotationLayer 两路注入）②rectStyle 可选 band（annotation-resolve 自 span 实测盒+canvas 字体度量推算字形带；缺省回退 F-11 分数）③重锚链经同一 rectsBetweenPoints 同源受益 | 3 行拖选保存渲染 **1 块**（并簇）；块缘偏差（对整带）0.96px/（分行后口径）+4~+5px 下偏 | **3 块分行**；块顶 vs 行簇顶 max **1.48px**；块底落行簇底 desc 尾界 [−1,+3] 越界 0；块两两相交 0 |
| c 工具条偏远 | 视口差直写 left/top 被 CSS zoom 二次放大（ui-scale×1.25）+无视口夹取/无下翻转 | selection-geometry.ts：localScale（clientWidth/gBCR.width 比值，守卫≤0→1——rootToLocalScale 思想 reader 域新写）÷归一+toolbarViewportPos（近顶下翻转+滚动容器可视区夹取） | 工具条距选区顶 **334.1px**（large 档）/277.5px（medium） | 距选区顶 **9.4px**；bounding 在滚动容器可视区内；medium 档重开同样在界内 |

跨面序列（票面 §0）：S1 拖选防抖自绘跟随 ✓（unit S1）/S2 所见即所存 ✓（unit S2：保存 rects=自绘块同源断言）/S3 保存渲染贴行与自绘对齐 ✓（真机 b 面+unit）/S4 工具条视口内贴选区 ✓/S5 Escape 工具条收+自绘随选区真清 ✓（unit S5，INV-37）/S6 换档/缩放稳定 ✓（真机 zoom 100↔150% 归一化几何漂移 0.67%；medium 重开存量 3 块零迁移）。

## 2. 改动面（git diff --stat 实测；新件另计）

修改 9 文件（+336/−177 中含**非本票** 2 文件，见 §7）：
- src/renderer/features/reader/SelectionLayer.tsx（172 行 diff，终态 **249 行** wc 实测——组件 ≤250 红线内）
- src/renderer/features/reader/annotation-anchor.ts（+68：mergeLineRects lineH+medianFontSizeBetween+rectsBetweenPoints 接线；终态 395 行 ≤500）
- src/renderer/features/reader/annotation-merge.ts（+24：lineH 可选参；终态 140 行）
- src/renderer/features/reader/annotation-style.ts（+34：band 可选参+GlyphBand+pct；终态 91 行）
- src/renderer/features/reader/AnnotationLayer.tsx（51 行 diff：resolve 拆出+lineH+band 匹配；终态 240 行 ≤250）
- src/renderer/features/reader/text-layer.css（::selection transparent+头注 F-A4；终态 116 行）
- docs/invariants.md（INV-37 重写+INV-40 边界修订标注 F-A4）
- docs/adr/0019-selection-feedback-native-route.md（+22：R1 修订节；终态 95 行）
- 受锁三件（见 §5）

新件 4（+1 测试）：
- src/renderer/features/reader/selection-geometry.ts（**85 行**——localScale/toolbarViewportPos/closestPageRoot/pageIndexOf/常量）
- src/renderer/features/reader/selection-paint.tsx（**62 行**——SelectionPaint portal 组件）
- src/renderer/features/reader/annotation-resolve.ts（**232 行**——resolveAnnotationRects/bandFromMetrics/matchBand/normalizedLineHeight）
- tests/unit/renderer/selection-paint.test.tsx（**366 行**，always-active 11 测：a S1~S5/b band 四测/c 三态）
- scripts/audits/f-a4-verify.mjs（**385 行**真机探针）+f-a4-diag.mjs（一次性诊断，f-r1-dbg 先例留档）

## 3. TDD 凭证

- **先行红**（f-a4-first-red.raw.txt / f-a4-e2e-first-red.raw.txt，对 HEAD 实现）：
  unit 3 断言红+1 模块红——selection-layer P1（归一坐标 8/686.4 vs HEAD 10/858）+
  F-A4 反转守卫（selRects null）+annotation-merge ⑪（lineH 被忽略→1 块）+
  selection-paint（annotation-resolve 缺件）；e2e F-06 C 节断言红
  （Expected "rgba(0, 0, 0, 0)" Received "rgba(0, 0, 0, 0.2)"）。
- **绿**：定向→全量 `npm run test` **118 文件/1000 用例全绿**（基线 989+新增 11）。
- **变异红证 M1~M5**（f-a4-mutation.log+五 raw；cp 备份一次性时间戳目录
  f-a4-mutation-backup-20260831/，8 源文件全量收录）：M1 localScale 恒 1（P1+c1 红）/
  M2 坍缩漏清自绘（S5 红）/M3 lineH 忽略（⑪红）/M4 band 忽略（b1/b2/b5 红）/
  M5 下翻转移除（c1/c2 红）；逐一还原 diff 空+回绿双验；M4 于 b 面半前导修复后
  对新代码重跑红证（追加 raw）。
- **verify 各环真退出码**：quality=0 tickets=0 lint=0 typecheck=0 **test=0（1000）**
  build=0；locks:check 红=**预期**（受锁三件保持解锁态+新受锁路径待登记——票面
  明令禁跑 locks 命令，主控收口职责）。
- **e2e 全量**（受锁 spec 改动后口径）：**28 passed/1 failed**（1.4m）——
  唯一红=R2-SET1 smoke（header 56≠44），§7 归因非本票；P7-A 复制一次抖动
  （剪贴板时序）复跑通过。本票触及的 reader-text.spec 全部 9 用例含改写的
  F-06 小票与 F-A1 多行用例全绿。

## 4. 真机探针（scripts/audits/f-a4-verify.mjs；产物 f-a4-out/）

真实库副本+用户实况 large 档（uiScale 保留不删）+真鼠标跨行拖选；
baseline（修前数值，8 项）/after（修后判据，**12/12 PASS**）两相位：
f-a4-verify-baseline.json / f-a4-verify-after.json + 六截图（{phase}-select/
-saved/-z150/-medium.png）。S2 会话用「选择模式」（INV-42 rect 穿透）重选
S1 已存高亮同一行带做 zoom 100↔150% 同源对比。修后一行结论：
**F-A4 VERIFY: PASS（12/12 项断言全过）**（f-a4-after.raw.txt）。

## 5. 受锁改写逐文件理由（主控已 unlock；禁跑 locks 命令遵行）

- tests/unit/renderer/selection-layer.test.tsx（332 行）：P1 定位断言改归一坐标
  （mount clientWidth 480/gBCR 600 桩→left/top×0.8——c 面红证锚）；F-08 守卫
  **反转**为自绘在场（头注注明 ADR-0019 R1 修订依据=票面 §0a）；selRects 探针
  改 document 级（portal 渲染进页盒）。其余 12 用例零改（P2~P7/F-12a/b/c 全绿）。
- tests/unit/renderer/annotation-merge.test.ts（206 行）：新增 ⑪ INV-40 边界修复
  （lineH 传入紧行距不并簇 2 块+缺省旧行为 1 块存档）+⑫ lineH 恒等钳制/幂等；
  ①~⑩ 零改（缺省参数兼容——零迁移）。
- tests/e2e/reader-text.spec.ts（791 行）：F-06 小票 C 节——::selection 精确值
  断言 transparent+selection-rects 0 计数守卫**反转**为在场+块色
  rgba(0,0,0,0.2)（头注注明 ADR-0019 R1 修订依据=票面 §0a）；标题随改；
  其余 8 用例零改。

## 6. 自裁申报（超票面决定，交门审）

1. **自绘层经 React portal 渲染进选区所在页盒（textLayer 父盒）而非票面 §1a
   字面的「渲染 div absolute 于挂载盒」**：[data-page-column] 的反向 zoom 补偿
   （zoom: calc(1/var(--ui-scale))）在档位≠1 时创建 stacking context——挂载盒
   渲染会使自绘层浮到标注 multiply 层之上，破坏 R2-F-10「灰在黄下」观感；
   portal 进页盒与标注层同 context（z2<z5），且百分比数学与 rects 归一化基准
   （pixelBoxOf(textLayer)）严格同盒零换算。
2. **mergeLineRects（像素域）同修 lineH 感知**（票面 §0b① 只点名 mergeRects）：
   INV-40 登记的并簇发生在上游 25% 重叠率判据（数学上 mergeRects 级跨行误并
   必蕴含上游已并成单块，下游无输入可分）；可选参缺省兼容，受锁 anchor 测试
   （guardedDescribe 8 用例）零改全绿。
3. **b② band 数据源=span 实测盒+canvas measureText 字体度量**（actualBoundingBox
   +fontBoundingBox 推算字形带）：票面两候选（textContent item 高度/textLayer
   span 行盒簇）中 DOM 可达的实现；computed fontSize 不可解析回退 span 盒高。
4. **半前导负值不钳 0**：初版钳 0 致带整体下偏 +4~5px（f-a4-diag.mjs 真机
   实锤——CSS 负半前导合法，line-height:1 下回退字体内容区溢出行盒）；修复后
   块顶偏差 1.48px。
5. **探针 b 判据落点**：块顶贴行簇 span 盒顶 ≤2px+块底落 [−1,+3]px desc 尾界
   ——票面 §5②「与自绘块对齐（同文字行簇 top/height 偏差≤2px）」的实现解读：
   自绘块=行盒并集、标注块=墨带，两有意几何差 1~4px 为 b② 设计本身引入
   （信息项落 JSON）；顶缘判据两几何一致。修前（+4px 下偏/并簇 1 块）仍强判别。
6. SelectionLayer 再导出 closestPageRoot/pageIndexOf（selection-geometry 拆件后
   导出面零变——票面 §2「对外行为零变」）。
7. 判据口径说明：annotation-merge ⑪ 缺省路径断言=旧行为存档（1 块）——非放宽，
   为 lineH 缺省兼容面（旧库/不可量测环境）的行为锁定。

## 7. 接缝报告（报主控裁决——非本票缺陷）

- **theme.css+workspace.css 工作树有非本票的未提交改动**（git status 实测）：
  header 高 44→56px（注释注明「用户裁决 2026-08-31 增高」）+ws-panel
  transform-origin 改 center。**R2-SET1 受锁 smoke 断言仍锚 44 故红**。隔离
  实验实证：仅还这两文件至 HEAD 后 SET1 通过（681ms ok），恢复后仍红——
  归因该单元（其测试面未随改）。本实现者零触碰、工作树原样保留。
- npm run test 与 e2e 的 better-sqlite3 ABI 互斥（F-R1 已知）：verify 全量后跑
  e2e 前须 `node scripts/sqlite-abi.mjs use electron`（本次两次踩中，已按此序）。

## 8. git status 全贴（2026-08-31 实现者收口时点）

```
 M docs/adr/0019-selection-feedback-native-route.md
 M docs/invariants.md
 M src/renderer/features/reader/AnnotationLayer.tsx
 M src/renderer/features/reader/SelectionLayer.tsx
 M src/renderer/features/reader/annotation-anchor.ts
 M src/renderer/features/reader/annotation-merge.ts
 M src/renderer/features/reader/annotation-style.ts
 M src/renderer/features/reader/text-layer.css
 M src/renderer/features/workspaces/workspace.css   ← 非本票（§7）
 M src/renderer/shared/theme.css                    ← 非本票（§7）
 M tests/e2e/reader-text.spec.ts                    ← 受锁改写（§5）
 M tests/unit/renderer/annotation-merge.test.ts     ← 受锁改写（§5）
 M tests/unit/renderer/selection-layer.test.tsx     ← 受锁改写（§5）
?? scripts/audits/f-a4-*（本票产物：探针/诊断/红绿证/变异证/报告/out 截图 JSON/
   mutation-backup-20260831/）+ 3 新源文件 + 1 新测试（§2）
?? scripts/audits/f-l4-*.raw.txt、f1-out/*.png、f-a4-ticket.md ← 会话前已存在的
   未跟踪残留（非本实现者产物，未清理未纳入）
```

## 9. 成本

实现者单会话（GLM 5.3，无子代理派发）：机器时长约 65 分钟（含 baseline/after
两轮真机 Electron 取证各 ~90s+全量 test×4+e2e×3+变异 10 轮定向跑）；
token 估算（按工具回显体量）输入 ~0.9M/输出 ~0.13M——估算值，供成本账本。

## 10. 红线自查

禁 git commit/branch ✓（全程零提交）；禁 registry ✓；禁 locks 命令 ✓（locks:
check 红为预期主控收口面）；禁新依赖 ✓（package.json 零改）；grep 无
TODO/FIXME/placeholder（quality 关）✓；组件 ≤250（SelectionLayer 249/
AnnotationLayer 240，check-quality 口径）✓；卡住停手未触发（两处弯路——探针
拖选落点/ABI 态——均已按 f-r1 在档教训自解并记 §7）。


## diff 全文(add -N 后,含新件+受锁改写+theme.css/workspace.css 同场需求 1 面)

```diff
diff --git a/docs/adr/0019-selection-feedback-native-route.md b/docs/adr/0019-selection-feedback-native-route.md
index 1e5f77137..91d238b7c 100644
--- a/docs/adr/0019-selection-feedback-native-route.md
+++ b/docs/adr/0019-selection-feedback-native-route.md
@@ -71,3 +71,25 @@
   即时评估路径加拖选位移阈值 3px（LineageCanvas.DRAG_THRESHOLD 同型）；
   单击/双击（含选词）不出条，真拖选与程序化/键盘选区（防抖路径）不受影响。
   INV-37 不受扰动（阈值只影响工具条出现，不影响选区本身）。
+
+## R1 修订：划选视觉回自绘并集层（F-A4，2026-08-31）
+
+- **修订依据=用户根治令**（F-A4 票面 §0a，用户复测附两图）：连续段落选中时
+  多行灰块行交界横向深带（重叠部分渲染加深）——根因=官方 pdf.js 已知缺陷
+  （同 issue #17561 族）：文本层逐 span 绘制，pdf.js span 行盒=CSS 回退字体
+  度量，相邻行垂直重叠处 0.20×2≈0.36 逐层叠深。**CSS 层无解，唯一根治=
+  自绘并集层**。
+- **原裁决两病根复核（均解，故可修订）**：①拖选期零反馈（当年自绘层挂
+  mouseup/防抖后）→今 selectionchange 200ms 防抖路径在场（F-02 起），
+  拖选期自绘层实时跟随；②30% accent 合成 rgb(191,207,220) 近乎不可见
+  →今观感灰 rgba(0,0,0,0.20) 在案（R2-F-09/F-10 用户令两轮定值），白纸
+  合成≈#CCCCCC 清晰可辨。
+- **R1 落地形态**：SelectionLayer 渲染 SelectionPaint（selection-paint.tsx，
+  portal 进选区所在页盒——z2 在标注 multiply 层 z5 之下，R2-F-10 灰在黄下
+  观感保持），数据=evaluate 管线 mergeLineRects+mergeRects 归并产物（与
+  保存 rects 同源——所见即所存）；::selection 背景改 transparent
+  （text-layer.css）。INV-37 语义修订登记（Escape 只清工具条，自绘层随
+  选区真清除）；受锁两测试守卫反转（e2e 0 计数→在场；unit F-08 恒 null
+  →在场）。
+- **不随修订变化**：锚定三元组/保存链/INV-05 两路径同口径/F-12 触发阈值/
+  选择模式（INV-42）零触碰。
diff --git a/docs/invariants.md b/docs/invariants.md
index 07421d21d..1aa62c2e9 100644
--- a/docs/invariants.md
+++ b/docs/invariants.md
@@ -48,10 +48,10 @@
 | INV-34 | 程序滚动单容器收敛：程序滚动（翻页/页码跳转/恢复链与锚定闪烁链）只允许滚目标的**最近滚动祖先**（scrollIntoNearestScroller 差值法+显式夹取 [0, scrollHeight−clientHeight]；祖先判定=自 parentElement 向上首个 computed overflowY∈{auto,scroll}，hidden/visible 不入选），**禁用 Element.scrollIntoView 于滚动链**（CSSOM 语义=滚所有可滚祖先——2026-08-28 缺陷 A 实测泄漏面含 overflow:hidden 的 document viewport（scrollingElement 仍可被程序滚动）与 main，TabBar 被顶出视口无自愈）；防御纵深=ReaderPage 根两分支 overflow-hidden+ReaderToolbar 根 shrink-0（flex-wrap 折行只影响阅读器内部高度）；列表内滚动 block:'nearest'（FragmentNotesList/AiNoteGroupList/PaperList）与面板自身滚动语义不在本册约束面 | src/renderer/features/reader/scroll-converge.ts（SR2-F-05，2026-08-28 登记；消费方=PageColumn 段⑤ 'start'/anchor-locate flashElement 'center'——同一不变量同一实现，Rule of Three 从 1 收敛） | 单测锚（scroll-converge.test 六用例：最近祖先选取含嵌套取最近与 hidden 不入选/start 数学/center 数学/顶底夹取/无滚动祖先不动/aside 消费形）+受锁三文件消费形断言（page-column/anchor-locate/ai-annotation-layer 模块 mock）+e2e（reader-scroll.spec F-05：scrollingElement 与 main 双 scrollTop===0+TabBar bbox≥0+根 overflow-hidden 在位——窄视口页码跳转+PageDown 两链） | 已锚定（单测+e2e 级 2026-08-28 SR2-F-05；e2e 随守卫态 22+1 skip，registry 翻 done 后 23+0 常规跑激活） |
 | INV-35 | 课题库单活四联（ADR-0018 库级分目录）：①同一时刻至多一个课题库打开（switch=关旧→指针→装配→换引用，容器 current 单值；全新首启=legacy-fresh 态库在 userData 根，二次启动迁移入 workspaces/default——受锁 e2e 种子配方兼容的硬前提）②switch/create/rename 变更互斥单飞（busy 守卫，并发=CONFLICT 中文 DomainError）③指针 workspace.json 缺省/损坏/失指=降级「目录序第一」不崩溃；遗留迁移崩溃断点续迁（遗留 db 在且 default 库不在=条件仍真，db 文件最后移=提交点，无孤儿库）④**渲染层切换面（R1-WS2 登记）**：切换=dirty 确认→IPC switch→`location.reload()` 全新 stores（ADR-0018 裁决路径——零 stale 态类别）；reload 经 will-navigate 同 URL 唯一放行（shouldBlockNavigation 严格等值——外站/异 file/data: 变体全 deny，护栏意图不变）；弃改后悬置防抖写竞窗由 notes→papers FK+foreign_keys=ON 偶然兜底——**无 FK 新表接入课题切换面须显式防悬置写** | workspace.service.ts 头注状态机+workspace.fs.ts 搬移序（R1-WS1 登记）；渲染面=workspace.store.ts switch 流程+main-window.ts shouldBlockNavigation（R1-WS2 登记） | 单测（workspace.test.ts 14 it：迁移随迁+幂等+断点续迁+L0+指针双降级+busy CONFLICT+facade 热换+L0 双段链+失败重试）+e2e 24 迁移兼容；渲染面单测（workspace.store/workspace-switcher dirty 拦截+reload+内联错误重试/main-window-navigation 双面三 it）+e2e workspaces.spec（种子→新建 B→reload 库空+脉络空态→切回完整——加载终态锚防假绿窗） | 已锚定（单测+e2e 级 2026-08-28 R1-WS1+R1-WS2 全链） |
 | INV-36 | 脉络节点宽度单源：nodeWidth(title) 三档（≤12 字 180=NODE_W/≤28 字 220/>28 字 260）——布局占位（lineage-layout place 半宽）/卡面渲染（LineageNodeCard rect+角饰）/auto-fit 包围盒（LineageCanvas fitViewport）三消费点同一纯函数，禁任一处手写档值；**auto-fit 抢占门**：panbg pointerdown/滚轮 zoom 置 userInteracted 后 nodes 变化不重置视口，「适应视图」按钮（lineage-fit-view）=复位唯一入口；data-viewport transform 串格式 `translate(x, y) scale(k)` 为 e2e 解析契约（逐字符保持） | lineage-layout.ts nodeWidth+lineage-viewport.ts useViewportController 状态机头注（R2-LG10，2026-08-29 登记；LineageCanvas ≤250 行红线拆件——auto-fit/pan/zoom 视口域单文件） | 单测（lineage-layout.test 分档 3 it：三档边界/兄弟占位/单链对齐；lineage-canvas.test auto-fit 3 it：首载 fit 数值/不抢视口/按钮复位+分档 rect 宽 it——含 jsdom 量测桩）+e2e（lineage.spec T1/T2 scale-aware 断言） | 已锚定（单测级 R2-LG10 本单；e2e 面随本单 25 全绿） |
-| INV-37 | 划选视觉=原生 ::selection 直读（ADR-0019）：选区视觉反馈是**浏览器选区状态**的直接函数（原生半透明渲染，零 JS 链路——拖选第一帧即反馈，无防抖/evaluate/React 依赖；色值 SR2-F-09 用户令改灰=rgba(0,0,0,.30)≈白纸 #B3B3B3，仿 WPS——偏离官方蓝的显式登记）；组件态（pending/工具条）与选区视觉**允许分离**——Escape 只清 pending（工具条收），选区视觉保留至选区真正清除（点击别处坍缩/保存 removeAllRanges/承载页卸载）；`[data-testid="selection-rects"]` 恒不存在（自绘层已删，防回归守卫在受锁两测试） | text-layer.css `.textLayer ::selection`=rgba(0 0 0 / 0.30)（SR2-F-08 登记 2026-08-29；SR2-F-09 同日用户令改值）+SelectionLayer.tsx 渲染面仅 SelectionToolbar | e2e（reader-text.spec F-06 小票：::selection 精确值断言+selection-rects 0 计数+toolbar ≤1.5s 延迟预算）+unit（selection-layer.test F-08 守卫：pending 态 selRects() 恒 null——变异红证在档） | 已锚定（e2e+单测级 2026-08-29 SR2-F-08/F-09） |
+| INV-37 | 划选视觉=自绘并集层（ADR-0019 R1 修订，F-A4 2026-08-31）：选区视觉反馈是**浏览器选区状态**的直接函数（SelectionLayer evaluate 管线的 mergeLineRects+mergeRects 归并产物经 selection-paint portal 进选区所在页盒单层单绘——与保存 rects 同源，所见即所存；色 rgba(0,0,0,0.20) 同 R2-F-10 观感；拖选期经 selectionchange 200ms 防抖驱动）。::selection 背景=transparent（text-layer.css——官方 pdf.js 逐 span 绘制在重叠行盒处叠深，CSS 层无解；SR2-F-08 原生路线两病根已解：拖选零反馈→防抖路径在场，accent 近不可见→观感灰在案）。组件态（pending/工具条）与选区视觉**允许分离**——Escape 只清 pending（工具条收），自绘层保留至选区真正清除（点击坍缩/保存 removeAllRanges 同步清/承载页卸载）；`[data-testid="selection-rects"]` 在 pending 态**在场**（R1 修订反转原 0 计数守卫——受锁两测试已改向） | text-layer.css `.textLayer ::selection`=transparent（F-A4）+SelectionLayer paint 态渲染 SelectionPaint（portal 页盒 z2，标注 multiply z5 之下） | e2e（reader-text.spec F-06 小票：::selection transparent+selection-rects 在场+块色 rgba(0,0,0,0.2)+toolbar ≤1.5s）+unit（selection-layer.test F-A4 反转守卫+selection-paint.test S1~S5：并集渲染/所见即所存/Escape 语义/清除随选——M2 变异红证在档） | 已锚定（e2e+单测级 2026-08-31 F-A4；真机 f-a4-verify-after.json 12/12） |
 | INV-38 | 脉络卡高单源：nodeHeight(title)=46+18×clamp(ceil(len×12.5/(nodeWidth−24)),1,3)——1/2/3 行=64/82/100，三消费（LineageNodeCard rect 高/LineageEdges 端点 ±h/2 经 geom 预构建/lineage-viewport fitViewport 包围盒）同一纯函数，禁任一处手写档值（INV-36 宽度姊妹条；NODE_H 常量已删）；**B1 单源化补记**：BAND_LEFT(-200)/BAND_RIGHT(99999)/LAYER_LABEL_DY(32) 驻 lineage-layout.ts 导出——fitViewport 左界/Canvas 层带线 x1/x2/年份标 y 偏移消费同源禁各写；综述右列（决3）：isSurvey 节点不进树（x/y 双覆盖综述除外）、列左缘=max(非右列右缘)+SURVEY_COL_GAP(80)、同层输入序错开≥半宽和+SIBLING_GAP、y=year 层带 | lineage-layout.ts nodeHeight+常量区+综述列段（R2-LG11，2026-08-29 登记）+lineage-classify.ts isSurvey/isCore（决2 D1' 出度口径 2026-08-29 真机复评修正：研究性论文出度≥2——「被引≥2 开宗立派」=≥2 继承者；入度版在 INV-27 树单父下数学恒假） | 单测（lineage-layout.test nodeHeight 3 it+综述右列 4 it 含变异红证锚 P.x=C1.x；lineage-classify.test 8 it；lineage-canvas-visual.test 卡高 100+边三型；变异红证三处在档 scripts/audits/r2-lg11-mutation-*.log） | 已锚定（单测级 R2-LG11 本单；e2e 面随主控收口真机复评） |
 | INV-39 | 界面缩放三档只缩 HTML 文本面：uiScale（small/medium/large，数值单源 shared/ipc/schemas `UI_SCALE`=1/1.1/1.25）经 App 挂载 load（失败容忍默认档）+订阅→effect 单点写 documentElement `--ui-scale`→内容行 `.app-content-row` 整行 zoom（nav+main）；**PDF 页列恒补偿**：`[data-page-column]` `zoom: calc(1 / var(--ui-scale, 1))` 三态通配（ready/loading/error）——canvas 视觉恒基线（探针实测 canvas 跟随×1.1 即位图拉伸模糊，反向补偿精确恢复 612×792+textLayer 对位不破坏；单独 zoom:1 无效=相乘语义），reader 自有页缩放（viewport scale）与界面档正交；**header/caption 结构性豁免**：zoom 挂内容行，header 在行外恒 44px；settings set 通道 Req=完整 appSettingsSchema（register strict 校验+整体落盘）→**一切 set 调用必须组装全量**（缺省字段被 zod default 静默填默认值抹掉现值）；zoom 效果断言面必须量 getBoundingClientRect（computed fontSize 对 CSS zoom 无感——探针实测） | App.tsx（挂载 load+变量 effect+内容行类）+theme.css（.app-content-row/[data-page-column] 声明）+SettingsPage.tsx（点档全量 save）（R2-SET1，2026-08-29 登记） | 单测（app-shell 变量两面：挂载档+save 变化沿；settings.store uiScale 透传；ipc 旧文件 default 兼容+set 持久化）+CSS 文本锁（theme.test 正则锚定声明形态——防注释字样救活，变异③实证）+e2e（smoke.spec R2-SET1 用例：nav 首项 rect ×1.25±2px+header 恒 44，rect 断言非 computed） | 已锚定（单测级 R2-SET1 本单全绿+变异四方向红证在档；e2e 随主控收口统一跑） |
-| INV-40 | 标注矩形归并（F-A1，multiply 单乘语义的数学表达）：同一标注的渲染色块集合**两两不相交**（INV-A）+**每行至多一块**（INV-B，行内 x 并集）+**零宽块不入集合**（INV-C，w≤W_MIN=1/612 归一化域≈1px@612pt）+**相邻行块垂直边界钳制**（INV-D，下行顶≥上行底）；持久化兼容（INV-E）——存量 rects 渲染读时过同一归并器，库零迁移、存量渐净；单源=`mergeRects` 纯函数（确定性六步：滤零宽→(中心y,x,y) 全序→与全部既有簇比中心距聚类（容差 min(hNew,hRowMedian)/2——高瘦免疫+紧行距不误并）→行内归并（h/中心y 取下中位，单成员恒等）→行间钳制→(y,x) 稳定排序）；幂等（已归并输入值不变——单块/单成员行不经浮点往返）；**已知边界（门一预裁2 维持）**：前置 mergeLineRects 像素域在 leading≲0.75×行盒高（≈1.07×字号）的极端紧行距下跨行并簇成单高块（后果=覆盖带偏高非叠深，mergeRects 无法拆回）——存量缺陷非本票引入，真实库取证（p1b 负间隙分立）未触发，留后续票 | src/renderer/features/reader/annotation-merge.ts（mergeRects 单源+W_MIN 导出）；挂 A=annotation-anchor.rectsBetweenPoints 归一化后收口（划选保存/重开重锚/rectsFromRange 手工三路径）；挂 B=AnnotationLayer 渲染 map 读时归并（resolved 幂等无害+a.rects 存量渐净）（F-A1，2026-08-30 登记） | 单测（annotation-merge.test ①~⑩：零宽滤除/同行交叠并集/同位重复并入/负间隙钳制后两两相交面积 0/混合族 INV-A/单块恒等/幂等/高瘦+紧行距判别/排序确定性/混排字号中位——M3/M4/M5 变异红证在档）+组件（annotation-layer.test：存量缺陷态 rects 读时归并=挂 B/INV-E 锁，M1 红证）+e2e（reader-text.spec F-A1 多行用例：跨 3 行划选→库内+渲染双侧「块数=行数」断言（取证实证锚定），M2 红证） | 已锚定（单测+组件+e2e 级 2026-08-30 F-A1 三屋；真库取证 f-a1-verify.json：7 块→5 块=行数/零宽 0/间隙全正/两两相交 0） |
+| INV-40 | 标注矩形归并（F-A1，multiply 单乘语义的数学表达）：同一标注的渲染色块集合**两两不相交**（INV-A）+**每行至多一块**（INV-B，行内 x 并集）+**零宽块不入集合**（INV-C，w≤W_MIN=1/612 归一化域≈1px@612pt）+**相邻行块垂直边界钳制**（INV-D，下行顶≥上行底）；持久化兼容（INV-E）——存量 rects 渲染读时过同一归并器，库零迁移、存量渐净；单源=`mergeRects` 纯函数（确定性六步：滤零宽→(中心y,x,y) 全序→与全部既有簇比中心距聚类（容差 min(hNew,hRowMedian[,lineH])/2——高瘦免疫；**F-A4 行高感知**：可选 lineH（PDF 行高，选区 span 字号中位数/textLayer 盒高——annotation-anchor rectsBetweenPoints 挂 A+AnnotationLayer 挂 B 两路注入）钳制容差，紧行距下 CSS 回退行盒膨胀不再跨行并簇）→行内归并（h/中心y 取下中位，单成员恒等）→行间钳制→(y,x) 稳定排序）；幂等（已归并输入值不变——单块/单成员行不经浮点往返）；**[F-A4 修订 2026-08-31]** 原已知边界（leading≲0.75×行盒高跨行并簇成单高块）已修复：mergeLineRects 像素域聚行判据在 lineH 在场时改「中心距 ≤ lineH/2」（替代 y 区间重叠率 25% 判据——真行高为基准），mergeRects 容差同步 lineH 钳制；lineH 缺省=旧行为存档（受锁 ⑪ 存档断言）。真机实锤：修前 3 行拖选并簇 1 块→修后 3 块分行、块顶贴行簇顶 ≤1.5px（f-a4-verify baseline/after 对照在档）；字号量测口径=本地 CSS px（视口域阈值在 PDF zoom≠1 时等效收紧 1/zoom，方向安全——代码注释声明） | src/renderer/features/reader/annotation-merge.ts（mergeRects 单源+W_MIN 导出）；挂 A=annotation-anchor.rectsBetweenPoints 归一化后收口（划选保存/重开重锚/rectsFromRange 手工三路径）；挂 B=AnnotationLayer 渲染 map 读时归并（resolved 幂等无害+a.rects 存量渐净）（F-A1，2026-08-30 登记） | 单测（annotation-merge.test ①~⑩：零宽滤除/同行交叠并集/同位重复并入/负间隙钳制后两两相交面积 0/混合族 INV-A/单块恒等/幂等/高瘦+紧行距判别/排序确定性/混排字号中位——M3/M4/M5 变异红证在档）+组件（annotation-layer.test：存量缺陷态 rects 读时归并=挂 B/INV-E 锁，M1 红证）+e2e（reader-text.spec F-A1 多行用例：跨 3 行划选→库内+渲染双侧「块数=行数」断言（取证实证锚定），M2 红证） | 已锚定（单测+组件+e2e 级 2026-08-30 F-A1 三屋；真库取证 f-a1-verify.json：7 块→5 块=行数/零宽 0/间隙全正/两两相交 0） |
 | INV-41 | 脉络边标签三保证（F-L1-C，用户裁决变体 C+两条硬性保证 2026-08-30）：①渲染盒恒 foreignObject 130×37.05（EDGE_LABEL_MAX_W/H 单源）+`.lineage-edge-label` 类（9.5px 斜体 #6b7280 白晕 text-shadow+break-word 换行+max-height 3 行+overflow hidden——真实溢出承载滚动语义）；②**槽位恒经 placeEdgeLabels 防重叠放置**（锚=贝塞尔中点，与 LineageEdges 回退公式同式——两处头注互指；碰撞盒=estimateLabelWidth+gap4×37.05+gap4，节点盒外扩 6；偏移序 dy 0,±lh…±10lh（lh=12.35）×dx 五档（0,±(hw+16),±(hw+16)×2）——**回炉 1 实测依据**：±5lh 撑不出 100 高节点盒（分离阈精确 76.525/86.45）；全占位回 anchor=声明式 best effort（⑤环绕盒夹具锁）；贪心依赖输入序（序稳定性契约非交换性）；③**截断标签悬停滚动**：g 根原生 wheel 委托（React 合成 onWheel 时序晚于 svg 原生 zoom listener——不可达，头注在档）命中截断标签（scrollHeight>clientHeight+1）时 stopPropagation（防 zoom）+preventDefault（防默认）+主动 `scrollTop=clamp(+deltaY)`（防 Chromium foreignObject 滚轮路由不确定）；未截断零拦截；槽位盒恒参与 auto-fit 包围盒（fitViewport 第 5 参 labelBoxes，被推出的标签不消失在 fit 视野外） | src/renderer/features/lineage/edge-label-layout.ts（放置器+估宽单源）+LineageEdges.tsx（FO 换装+wheel 委托+slots 消费）+LineageCanvas.tsx（slots/labelBoxes useMemo）+lineage-viewport.ts（fitViewport labelBoxes）+theme.css（.lineage-edge-label+:hover overflow-y:auto——B1 教训交互态住类）（F-L1-C，2026-08-30 登记） | 单测（edge-label-layout.test ①~⑥+②b/③b 真库场景+⑤环绕盒回退+fit 数值锁——M4/M5/R1/R2 变异红证）+组件（lineage-canvas.test ⑦~⑩：FO 形态/slots 生效/wheel 双向锚（scrollTop 恰增 deltaY+未截断放行）/CSS 声明形态正则锁——M1/M2/M3/R2R 红证）+真机取证（f-l1-out/f-l1c-verify.json：注入碰撞源 5 标签/4 节点 labelOverlaps=0/nodeOverlaps=0+截断标签 wheel scrollTop=16 恰为隐藏量+viewport transform 不变） | 已锚定（单测+组件+真机级 2026-08-30 F-L1-C 三屋+回炉 1） |
 | INV-42 | 选择模式交互不变量（F-A3，2026-08-30）：选择模式（`TabState.selectionMode=true`，per-tab 与 zoom/color 同型）下**用户标注层与 AI 标注层一切渲染 rect `pointer-events:none`**——点击穿透零副作用（onClick 守卫兜程序化派发：jsdom 与真浏览器 `HTMLElement.click()` 均不走 hit-test，`pointerEvents:none` 拦不住）；拖选可在 rect 上发起=SelectionLayer 正常链路（**F-A2 根治**：mousedown 落 pointerEvents:auto 块上浏览器不发起文本选择的机制面解除）；常规（=false，默认）保持现状（点击标注=菜单/AI 段跳转）；**进入选择模式经 useLayoutEffect 在 paint 前关闭已开菜单/编辑器+清 AI 选中描边，切回常规不自动恢复**（S1/S4/S5——编辑器草稿丢弃=Escape 同语义；busy 在途结果回调幂等）；SelectionLayer 不消费模式（正交零改）；字段缺席（存量测试夹具直植形态）=常规态——生产单源 makeLoadingTab 显式 false，消费方一律 `?? false` 兜底 | reader.store.ts 头注（面③生命周期迁移表）+AnnotationLayer/AiAnnotationLayer 头注（F-A3 段）+ReaderPage.tsx 装配（toggle 语义在装配面，工具栏纯受控）（F-A3，2026-08-30 登记） | 单测（selection-mode.test ①~⑧ always-active：store 翻转+no-op/per-tab S3/rect pointerEvents 两态+点击零副作用/S1 菜单臂+编辑器臂双锁/S4 描边清除/工具栏 aria-pressed+回调——变异红证 M1~M5+M2'（只摘 setEditing(null)→仅⑧红））+真机取证（f-a3-out/f-a3-verify.json 三场景：A 常规压块拖选 selLen=0 负向对照/B 选择模式 58 rect 全 none+压点 hitTest 落文本 SPAN+同点位拖选 selLen=81+工具条+保存计数 1→2/C 切回 auto+点击出菜单） | 已锚定（单测+真机级 2026-08-30 F-A3 三屋+回炉 1；弱锚备案：真机层「选择模式点击 rect 零副作用」未直测，靠 pointer-events+hitTest+jsdom 守卫三层推断——门一 N6 在档） |
 
diff --git a/scripts/audits/f-a4-baseline.raw.txt b/scripts/audits/f-a4-baseline.raw.txt
new file mode 100644
index 000000000..421118a71
--- /dev/null
+++ b/scripts/audits/f-a4-baseline.raw.txt
@@ -0,0 +1,10 @@
+[f-a4/baseline 02:05:02] BASE a/paint-present — 自绘块 0 个（跨 3 行拖选；::selection=rgba(0, 0, 0, 0.2)）
+[f-a4/baseline 02:05:02] BASE a/paint-no-overlap — 自绘块两两相交面积 max=0.00px²（≤0.5 吞亚像素）
+[f-a4/baseline 02:05:02] BASE a/native-selection-transparent — ::selection computed=rgba(0, 0, 0, 0.2)（transparent——视觉单通道=自绘层）
+[f-a4/baseline 02:05:02] BASE c/toolbar-in-viewport — 工具条 (1255,566,333×38) 在滚动容器 (515,143,1537×965) 可视区内
+[f-a4/baseline 02:05:02] BASE c/toolbar-near-selection — 工具条距选区顶 334.1px（<60）
+[f-a4/baseline 02:05:02] BASE b/ann-align-text — 标注块边缘与行簇顶/底偏差 max=0.96px（≤2；1 块）
+[f-a4/baseline 02:05:02] BASE b/ann-no-overlap — 标注块两两相交面积 max=0.00px²
+[f-a4/baseline 02:05:07] zoom 滚轮后= 150%
+[f-a4/baseline 02:05:12] BASE f/no-pageerror — 页面错误 0 条
+F-A4 BASELINE: 记录 8 项数值 → f-a4-out/f-a4-verify-baseline.json
diff --git a/scripts/audits/f-a4-e2e-first-red.raw.txt b/scripts/audits/f-a4-e2e-first-red.raw.txt
new file mode 100644
index 000000000..e1f2191df
--- /dev/null
+++ b/scripts/audits/f-a4-e2e-first-red.raw.txt
@@ -0,0 +1,30 @@
+npm warn Unknown project config "better_sqlite3_binary_host_mirror". This will stop working in the next major version of npm. See `npm help npmrc` for supported config options.
+npm warn Unknown project config "electron_mirror". This will stop working in the next major version of npm. See `npm help npmrc` for supported config options.
+
+Running 1 test using 1 worker
+
+  x  1 tests\e2e\reader-text.spec.ts:620:1 › F-06 视觉小票：页盒 panel 底+阴影页缘可辨；划选视觉=自绘并集层（F-A4/ADR-0019 R1 修订） (1.6s)
+
+
+  1) tests\e2e\reader-text.spec.ts:620:1 › F-06 视觉小票：页盒 panel 底+阴影页缘可辨；划选视觉=自绘并集层（F-A4/ADR-0019 R1 修订） 
+
+    Error: C: ::selection 背景透明（视觉通道=自绘并集层）：rgba(0, 0, 0, 0.2)
+
+    expect(received).toBe(expected) // Object.is equality
+
+    Expected: "rgba(0, 0, 0, 0)"
+    Received: "rgba(0, 0, 0, 0.2)"
+
+      677 |     sel,
+      678 |     `C: ::selection 背景透明（视觉通道=自绘并集层）：${sel}`
+    > 679 |   ).toBe('rgba(0, 0, 0, 0)')
+          |     ^
+      680 |
+      681 |   // 真实选选（程序化 selectText——防抖路径同产 pending）→ 工具条 ≤1.5s 可见
+      682 |   // （L7：交互反馈预算入验收——程序化选选含 200ms 防抖+evaluate，预算 1.5s）
+        at E:\class\智慧水务\Synapse_remake\tests\e2e\reader-text.spec.ts:679:5
+
+    Error Context: test-results\reader-text-F-06-视觉小票：页盒-p-3faa3--自绘并集层（F-A4-ADR-0019-R1-修订）\error-context.md
+
+  1 failed
+    tests\e2e\reader-text.spec.ts:620:1 › F-06 视觉小票：页盒 panel 底+阴影页缘可辨；划选视觉=自绘并集层（F-A4/ADR-0019 R1 修订） 
diff --git a/scripts/audits/f-a4-first-red.raw.txt b/scripts/audits/f-a4-first-red.raw.txt
new file mode 100644
index 000000000..c5fc832ab
--- /dev/null
+++ b/scripts/audits/f-a4-first-red.raw.txt
@@ -0,0 +1,3147 @@
+npm warn Unknown project config "better_sqlite3_binary_host_mirror". This will stop working in the next major version of npm. See `npm help npmrc` for supported config options.
+npm warn Unknown project config "electron_mirror". This will stop working in the next major version of npm. See `npm help npmrc` for supported config options.
+
+> synapse@0.1.0 test
+> node scripts/sqlite-abi.mjs use node && vitest run
+
+sqlite-abi 当前绑定：node（v137）
+
+[1m[7m[36m RUN [39m[27m[22m [36mv2.1.9 [39m[90mE:/class/智慧水务/Synapse_remake[39m
+
+ [31m❯[39m tests/unit/renderer/selection-paint.test.tsx [2m([22m[2m0 test[22m[2m)[22m
+ [32m✓[39m tests/unit/renderer/lineage-store-write.test.ts [2m([22m[2m9 tests[22m[2m)[22m[90m 8[2mms[22m[39m
+ [32m✓[39m tests/unit/renderer/pages-overlay.test.tsx [2m([22m[2m6 tests[22m[2m)[22m[90m 33[2mms[22m[39m
+[90mstdout[2m | tests/unit/renderer/reader-double-page.test.tsx
+[22m[39mWarning: Please use the `legacy` build in Node.js environments.
+
+[90mstdout[2m | tests/unit/renderer/scroll-progress.test.tsx
+[22m[39mWarning: Please use the `legacy` build in Node.js environments.
+
+[90mstdout[2m | tests/unit/renderer/page-column.test.tsx
+[22m[39mWarning: Please use the `legacy` build in Node.js environments.
+
+[90mstderr[2m | tests/unit/renderer/zcode-link-section.test.tsx[2m > [22m[2mzcode-not-found：「未发现 zcode」+安装指引文案，无装技能按钮
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/zcode-link-section.test.tsx[2m > [22m[2mzcode-not-found：「未发现 zcode」+安装指引文案，无装技能按钮
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/zcode-link-section.test.tsx[2m > [22m[2mfound-skill-missing：「已发现 zcode，技能未装」+「一键装技能」按钮
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/zcode-link-section.test.tsx[2m > [22m[2mfound-skill-missing：「已发现 zcode，技能未装」+「一键装技能」按钮
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/zcode-link-section.test.tsx[2m > [22m[2minstalled-idle：「已装技能，未运行」
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/zcode-link-section.test.tsx[2m > [22m[2mrunning：「运行中」+state 自述+currentPaper
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/zcode-link-section.test.tsx[2m > [22m[2mrunning：currentPaper=null——无当前篇后缀
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/zcode-link-section.test.tsx[2m > [22m[2mrunning：currentPaper=null——无当前篇后缀
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/zcode-link-section.test.tsx[2m > [22m[2merror 态（detect Res state=error——status.json 损坏）：「状态读取失败」+reason+重试按钮
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/zcode-link-section.test.tsx[2m > [22m[2merror 态重试：点击重试→再调 detect
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/zcode-link-section.test.tsx[2m > [22m[2mdetect 通道拒绝（IPC 层失败）→error 呈现+重试（不 toast 轰炸）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/zcode-link-section.test.tsx[2m > [22m[2mdetect 通道拒绝（IPC 层失败）→error 呈现+重试（不 toast 轰炸）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/zcode-link-section.test.tsx[2m > [22m[2m确认对话框首装型：普通文案+确认后调 zcodeInstall+成功 toast+re-detect→idle
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/zcode-link-section.test.tsx[2m > [22m[2m确认对话框覆盖型（overwrite=true）：重申覆盖文案
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/zcode-link-section.test.tsx[2m > [22m[2m确认对话框覆盖型（overwrite=true）：重申覆盖文案
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/zcode-link-section.test.tsx[2m > [22m[2m确认取消：不调 install，态保持 found-skill-missing（按钮仍可用）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/zcode-link-section.test.tsx[2m > [22m[2m确认取消：不调 install，态保持 found-skill-missing（按钮仍可用）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/zcode-link-section.test.tsx[2m > [22m[2mbusy 态：install 在途→按钮禁用+无重复调用
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/zcode-link-section.test.tsx[2m > [22m[2mbusy 态：install 在途→按钮禁用+无重复调用
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/zcode-link-section.test.tsx[2m > [22m[2m装技能失败（动作型）toast error，按钮复位可重试
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/zcode-link-section.test.tsx[2m > [22m[2m装技能失败（动作型）toast error，按钮复位可重试
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/zcode-link-section.test.tsx[2m > [22m[2m跨格序列①：not-found→（用户装 zcode）→skill-missing→装→idle
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/zcode-link-section.test.tsx[2m > [22m[2m跨格序列①：not-found→（用户装 zcode）→skill-missing→装→idle
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/zcode-link-section.test.tsx[2m > [22m[2m跨格序列②：idle→running→idle（轮询驱动会话起止，无残留态）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/zcode-link-section.test.tsx[2m > [22m[2m卸载清 interval（INV-14）：unmount 后 advance 超周期不再轮询（前置=已轮询）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/zcode-link-section.test.tsx[2m > [22m[2m卸载清 interval（INV-14）：unmount 后 advance 超周期不再轮询（前置=已轮询）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+ [32m✓[39m tests/unit/renderer/zcode-link-section.test.tsx [2m([22m[2m16 tests[22m[2m)[22m[90m 77[2mms[22m[39m
+ [32m✓[39m tests/unit/renderer/page-column.test.tsx [2m([22m[2m20 tests[22m[2m)[22m[90m 98[2mms[22m[39m
+ [32m✓[39m tests/unit/renderer/scroll-progress.test.tsx [2m([22m[2m22 tests[22m[2m)[22m[90m 15[2mms[22m[39m
+ [32m✓[39m tests/unit/renderer/anchor-locate.test.ts [2m([22m[2m13 tests[22m[2m)[22m[90m 55[2mms[22m[39m
+ [31m❯[39m tests/unit/renderer/selection-layer.test.tsx [2m([22m[2m14 tests[22m[2m | [22m[31m2 failed[39m[2m)[22m[90m 110[2mms[22m[39m
+[31m   [31m×[31m SelectionLayer 动态锚定根（选区态状态机）[2m > [22mP1 挂载盒≠选区页仍正确（F-01 自裁 4 中间态解除）：防抖路径工具条出现+坐标经页盒换算并÷有效 zoom（F-A4 c 面归一）[90m 35[2mms[22m[31m[39m
+[31m     → expected 10 to be close to 8, received difference is 2, but expected 0.005[39m
+[31m   [31m×[31m SelectionLayer 动态锚定根（选区态状态机）[2m > [22mF-A4 守卫（反转）：pending 态（mouseup 后工具条在场）自绘并集层在场——ADR-0019 R1 修订[90m 6[2mms[22m[31m[39m
+[31m     → expected null not to be null[39m
+[90mstderr[2m | tests/unit/renderer/ai-notes-section.test.tsx[2m > [22m[2mhidden：无 job 无产物无 DB 数据——仅按钮行（无状态行无分节）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+ [32m✓[39m tests/unit/renderer/reader-double-page.test.tsx [2m([22m[2m16 tests[22m[2m)[22m[90m 96[2mms[22m[39m
+[90mstderr[2m | tests/unit/renderer/ai-notes-section.test.tsx[2m > [22m[2mhidden：无 job 无产物无 DB 数据——仅按钮行（无状态行无分节）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/ai-notes-section.test.tsx[2m > [22m[2midle：无 job 无未导入产物但有 DB 数据——按钮行+分节，无状态行
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/ai-notes-section.test.tsx[2m > [22m[2midle：无 job 无未导入产物但有 DB 数据——按钮行+分节，无状态行
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/ai-notes-section.test.tsx[2m > [22m[2mpending：job 在且心跳不新鲜——等待拾取文案（含 state 自述）+按钮禁用
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/ai-notes-section.test.tsx[2m > [22m[2mpending：job 在且心跳不新鲜——等待拾取文案（含 state 自述）+按钮禁用
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/ai-notes-section.test.tsx[2m > [22m[2mpending：status.json 不存在（工具从未运行）——文案无自述括号
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/ai-notes-section.test.tsx[2m > [22m[2mpending：status.json 不存在（工具从未运行）——文案无自述括号
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/ai-notes-section.test.tsx[2m > [22m[2mqueued：job 在+心跳新鲜+currentPaper=他篇——「当前：他篇」
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/ai-notes-section.test.tsx[2m > [22m[2mqueued：job 在+心跳新鲜+currentPaper=他篇——「当前：他篇」
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/ai-notes-section.test.tsx[2m > [22m[2mqueued：currentPaper=null——无他篇名
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/ai-notes-section.test.tsx[2m > [22m[2mqueued：currentPaper=null——无他篇名
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/ai-notes-section.test.tsx[2m > [22m[2mreading：心跳新鲜+currentPaper=P——「AI 正在读本文（state）」
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/ai-notes-section.test.tsx[2m > [22m[2mdone-unimported：产物在+未归档+job 无——待导入+导入按钮
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/ai-notes-section.test.tsx[2m > [22m[2mdone-unimported：产物在+未归档+job 无——待导入+导入按钮
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/ai-notes-section.test.tsx[2m > [22m[2m跨格序列①：hidden→pending→queued（他篇）→reading→done-unimported→idle（导入完成回稳态）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/ai-notes-section.test.tsx[2m > [22m[2m跨格序列①：hidden→pending→queued（他篇）→reading→done-unimported→idle（导入完成回稳态）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/ai-notes-section.test.tsx[2m > [22m[2m跨格序列①：hidden→pending→queued（他篇）→reading→done-unimported→idle（导入完成回稳态）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/ai-notes-section.test.tsx[2m > [22m[2m跨格序列①：hidden→pending→queued（他篇）→reading→done-unimported→idle（导入完成回稳态）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/ai-notes-section.test.tsx[2m > [22m[2m跨格序列①：hidden→pending→queued（他篇）→reading→done-unimported→idle（导入完成回稳态）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/ai-notes-section.test.tsx[2m > [22m[2m跨格序列①：hidden→pending→queued（他篇）→reading→done-unimported→idle（导入完成回稳态）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/ai-notes-section.test.tsx[2m > [22m[2m跨格序列③：reading→（心跳过期+job 在）→pending（工具中断统一「等待 zcode」呈现）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/ai-notes-section.test.tsx[2m > [22m[2m跨格序列③：reading→（心跳过期+job 在）→pending（工具中断统一「等待 zcode」呈现）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/ai-notes-section.test.tsx[2m > [22m[2m跨格序列⑤：换 tab（paperId 变）→全态重评估（per-tab 语义）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/ai-notes-section.test.tsx[2m > [22m[2m跨格序列⑤：换 tab（paperId 变）→全态重评估（per-tab 语义）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+    at AiNotesSection (E:\class\智慧水务\Synapse_remake\src\renderer\features\reader\AiNotesSection.tsx:30:11)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/ai-notes-section.test.tsx[2m > [22m[2m跨格序列⑤：换 tab（paperId 变）→全态重评估（per-tab 语义）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/ai-notes-section.test.tsx[2m > [22m[2m轮询失败 error 态：连续失败 3 次显示离线提示行（静默不 toast），成功即复位
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/ai-notes-section.test.tsx[2m > [22m[2m轮询失败 error 态：连续失败 3 次显示离线提示行（静默不 toast），成功即复位
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/ai-notes-section.test.tsx[2m > [22m[2m轮询失败 error 态：连续失败 3 次显示离线提示行（静默不 toast），成功即复位
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/ai-notes-section.test.tsx[2m > [22m[2m轮询失败 error 态：连续失败 3 次显示离线提示行（静默不 toast），成功即复位
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/ai-notes-section.test.tsx[2m > [22m[2mstatus.json 损坏（readStatus 上抛→observe 拒绝）计入连续失败计数（损坏≠missing 三态分离）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/ai-notes-section.test.tsx[2m > [22m[2mstatus.json 损坏（readStatus 上抛→observe 拒绝）计入连续失败计数（损坏≠missing 三态分离）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/ai-notes-section.test.tsx[2m > [22m[2m导入按钮三桶 toast：imported/skipped 计数+errors 篇名（error 级）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/ai-notes-section.test.tsx[2m > [22m[2m导入按钮三桶 toast：imported/skipped 计数+errors 篇名（error 级）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/ai-notes-section.test.tsx[2m > [22m[2m导入失败（动作型）toast error
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/ai-notes-section.test.tsx[2m > [22m[2m导入失败（动作型）toast error
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/ai-notes-section.test.tsx[2m > [22m[2m「AI 读文献」失败（动作型）toast error；无本地残留态（writeStatusProtocol 幂等自愈——重试可再点）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/ai-notes-section.test.tsx[2m > [22m[2m「AI 读文献」失败（动作型）toast error；无本地残留态（writeStatusProtocol 幂等自愈——重试可再点）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/ai-notes-section.test.tsx[2m > [22m[2m分节分组：question 组按 AI_NOTE_QUESTIONS 序呈现（组头中文标签+分色条），组内条目按 role 分段标注
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/ai-notes-section.test.tsx[2m > [22m[2m分节分组：question 组按 AI_NOTE_QUESTIONS 序呈现（组头中文标签+分色条），组内条目按 role 分段标注
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/ai-notes-section.test.tsx[2m > [22m[2m分组序单源：乱序输入仍按 AI_NOTE_QUESTIONS 序（非输入序——呈现轴=shared 单源）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/ai-notes-section.test.tsx[2m > [22m[2m分组序单源：乱序输入仍按 AI_NOTE_QUESTIONS 序（非输入序——呈现轴=shared 单源）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/ai-notes-section.test.tsx[2m > [22m[2m空组剔除：无条目的 question 不渲染组（无 Q2 条目则无「第二问」组头）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/ai-notes-section.test.tsx[2m > [22m[2m空组剔除：无条目的 question 不渲染组（无 Q2 条目则无「第二问」组头）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/ai-notes-section.test.tsx[2m > [22m[2m组内 role 标签：同 question 组内三 role 条目头呈现一审/二审/裁决（role 可辨+role 序）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/ai-notes-section.test.tsx[2m > [22m[2m组内 role 标签：同 question 组内三 role 条目头呈现一审/二审/裁决（role 可辨+role 序）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/ai-notes-section.test.tsx[2m > [22m[2mdivergence 组转置：独立「分歧报告」组头（非七问特殊组，不随裁决 role 组）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/ai-notes-section.test.tsx[2m > [22m[2mdivergence 组转置：独立「分歧报告」组头（非七问特殊组，不随裁决 role 组）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-canvas-visual.test.tsx[2m > [22m[2mR2-LG11 浅色严谨板（浅色宿主/白卡边框编码/foreignObject 换行/层带浅色/边三型/图例）[2m > [22m[2m浅色宿主：svg 被 .lineage-host 包裹；夜幕类与装饰层不存在（夜幕消费清零防回归）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-viewport-refit.test.tsx[2m > [22m[2mF-L4 视口尺寸变化 refit（ResizeObserver 方案——票面 5.1 ①~⑦）[2m > [22m[2m① 注册面：挂载非空图→桩 observe 收到 svg 元素（data-testid lineage-canvas）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+    at LineageCanvas (E:\class\智慧水务\Synapse_remake\src\renderer\features\lineage\LineageCanvas.tsx:21:11)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/ai-notes-section.test.tsx[2m > [22m[2m只读断言：分节内无任何写交互元素（无 input/textarea/select——INV-19）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-canvas-visual.test.tsx[2m > [22m[2mR2-LG11 浅色严谨板（浅色宿主/白卡边框编码/foreignObject 换行/层带浅色/边三型/图例）[2m > [22m[2m白卡边框编码四态（决1 矩阵）：核心 accent 1.5 实线/普通 branch 1 实线/主题 branch 1 虚线/综述 branch 1 虚线；选中 +0.75
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-viewport-refit.test.tsx[2m > [22m[2mF-L4 视口尺寸变化 refit（ResizeObserver 方案——票面 5.1 ①~⑦）[2m > [22m[2m② 尺寸变化 refit：挂载（W1 gBCR 回退口径）fit 后改 clientWidth=W2→派发 callback→transform=fitViewport(nodes, layout, W2, H)
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+    at LineageCanvas (E:\class\智慧水务\Synapse_remake\src\renderer\features\lineage\LineageCanvas.tsx:21:11)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+ [32m✓[39m tests/unit/renderer/selection-mode.test.tsx [2m([22m[2m8 tests[22m[2m)[22m[90m 90[2mms[22m[39m
+[90mstderr[2m | tests/unit/renderer/ai-notes-section.test.tsx[2m > [22m[2m只读断言：分节内无任何写交互元素（无 input/textarea/select——INV-19）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-canvas-visual.test.tsx[2m > [22m[2mR2-LG11 浅色严谨板（浅色宿主/白卡边框编码/foreignObject 换行/层带浅色/边三型/图例）[2m > [22m[2m夜幕残留防回归：渐变 defs/角饰/glow 滤器全不存在（0 计数）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-viewport-refit.test.tsx[2m > [22m[2mF-L4 视口尺寸变化 refit（ResizeObserver 方案——票面 5.1 ①~⑦）[2m > [22m[2m③ 门语义（userInteracted 不抢视口）：wheel 置门→派发 RO callback→视口保持 wheel 后值（数值断言）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+    at LineageCanvas (E:\class\智慧水务\Synapse_remake\src\renderer\features\lineage\LineageCanvas.tsx:21:11)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/ai-notes-section.test.tsx[2m > [22m[2m条目单击→locateAnchor（INV-20 单入口消费方；anchorPage 1 基→0 基页）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-canvas-visual.test.tsx[2m > [22m[2mR2-LG11 浅色严谨板（浅色宿主/白卡边框编码/foreignObject 换行/层带浅色/边三型/图例）[2m > [22m[2mforeignObject 换行（U2a）：长题名 HTML div 在场+line-clamp 三行样式字面+卡高自适应 100+title 全文 tooltip
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-viewport-refit.test.tsx[2m > [22m[2mF-L4 视口尺寸变化 refit（ResizeObserver 方案——票面 5.1 ①~⑦）[2m > [22m[2m④ 空图（nodes=0）：派发 callback→不 fit（量测未发生——早退在量测前，锁链序）且视口停初始
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/ai-notes-section.test.tsx[2m > [22m[2m条目单击→locateAnchor（INV-20 单入口消费方；anchorPage 1 基→0 基页）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-canvas-visual.test.tsx[2m > [22m[2mR2-LG11 浅色严谨板（浅色宿主/白卡边框编码/foreignObject 换行/层带浅色/边三型/图例）[2m > [22m[2m层带浅色：线 var(--border) 实线（dasharray null）；菱形刻度 branch；年份标 text-dim UI 字体；「YYYY 年」逐字保留
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-viewport-refit.test.tsx[2m > [22m[2mF-L4 视口尺寸变化 refit（ResizeObserver 方案——票面 5.1 ①~⑦）[2m > [22m[2m⑤ 成对清理（INV-14 同型）：unmount→桩 disconnect 被调
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+    at LineageCanvas (E:\class\智慧水务\Synapse_remake\src\renderer\features\lineage\LineageCanvas.tsx:21:11)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-canvas-visual.test.tsx[2m > [22m[2mR2-LG11 浅色严谨板（浅色宿主/白卡边框编码/foreignObject 换行/层带浅色/边三型/图例）[2m > [22m[2m边三型色（§1.1.3 矩阵）：普通 branch 1.2 实线/推断 #8a94a6 虚线 5 4/综述关联 survey-edge 1.4 虚线 2 3（优先级>推断）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-viewport-refit.test.tsx[2m > [22m[2mF-L4 视口尺寸变化 refit（ResizeObserver 方案——票面 5.1 ①~⑦）[2m > [22m[2m⑥ 量测守卫：clientWidth=0 桩面（jsdom 布局不可量测）→callback→视口不变（不产生退化 fit）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/ai-notes-section.test.tsx[2m > [22m[2m卸载清 interval（INV-14 成对同族）：unmount 后不再轮询
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-canvas-visual.test.tsx[2m > [22m[2mR2-LG11 浅色严谨板（浅色宿主/白卡边框编码/foreignObject 换行/层带浅色/边三型/图例）[2m > [22m[2mR2-LG12 参考边：kind=ref 直读——survey-edge 1.4 虚线 2 3；优先级 ref>推断（label 含「推断」仍 survey-edge 色）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-viewport-refit.test.tsx[2m > [22m[2mF-L4 视口尺寸变化 refit（ResizeObserver 方案——票面 5.1 ①~⑦）[2m > [22m[2m⑦ 无自激励（S5）：callback 内 setViewport 新值重渲染→无新 RO 注册/disconnect/重复 observe
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+    at LineageCanvas (E:\class\智慧水务\Synapse_remake\src\renderer\features\lineage\LineageCanvas.tsx:21:11)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+ [32m✓[39m tests/unit/renderer/ai-notes-section.test.tsx [2m([22m[2m24 tests[22m[2m)[22m[90m 141[2mms[22m[39m
+[90mstderr[2m | tests/unit/renderer/lineage-canvas-visual.test.tsx[2m > [22m[2mR2-LG11 浅色严谨板（浅色宿主/白卡边框编码/foreignObject 换行/层带浅色/边三型/图例）[2m > [22m[2m图例四项真实文本（浅色白卡圆角非交互——data-legend+aria-hidden）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-viewport-refit.test.tsx[2m > [22m[2mF-L4 视口尺寸变化 refit（ResizeObserver 方案——票面 5.1 ①~⑦）[2m > [22m[2m⑧ 初始回调幂等（回炉 1 W3）：挂载非空图（fit effect 已跑）→手动派发一次桩 callback（模拟 observe 后规范要求的初始通知）→transform 与挂载 fit 结果相等
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+    at LineageCanvas (E:\class\智慧水务\Synapse_remake\src\renderer\features\lineage\LineageCanvas.tsx:21:11)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+ [32m✓[39m tests/unit/renderer/lineage-canvas-visual.test.tsx [2m([22m[2m8 tests[22m[2m)[22m[90m 102[2mms[22m[39m
+ [32m✓[39m tests/unit/renderer/lineage-viewport-refit.test.tsx [2m([22m[2m8 tests[22m[2m)[22m[90m 107[2mms[22m[39m
+[90mstderr[2m | tests/unit/renderer/corpus-export.test.tsx[2m > [22m[2museExportCorpusEvents —— App 层事件桥 [SR2-AI-04][2m > [22m[2m挂载即订阅 exportCorpus 事件；卸载成对注销（INV-14 消费方级）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/corpus-export.test.tsx[2m > [22m[2museExportCorpusEvents —— App 层事件桥 [SR2-AI-04][2m > [22m[2m挂载即订阅 exportCorpus 事件；卸载成对注销（INV-14 消费方级）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/corpus-export.test.tsx[2m > [22m[2museExportCorpusEvents —— App 层事件桥 [SR2-AI-04][2m > [22m[2m生产组装：createCorpusExtractor 收 loadDocument=loadPdfDocument 单点+sendItem 接 window.api.export_.corpusItem
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/corpus-export.test.tsx[2m > [22m[2museExportCorpusEvents —— App 层事件桥 [SR2-AI-04][2m > [22m[2m事件双型分发：extract-request→提取器；progress→store 进度回写（在途）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/corpus-export.test.tsx[2m > [22m[2museExportCorpusEvents —— App 层事件桥 [SR2-AI-04][2m > [22m[2m事件双型分发：extract-request→提取器；progress→store 进度回写（在途）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/corpus-export.test.tsx[2m > [22m[2museExportCorpusEvents —— App 层事件桥 [SR2-AI-04][2m > [22m[2m终局 toast 成功面：fileCount 入文案；errorCount>0 部分=info 档，全成=success 档（INV-02）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/corpus-export.test.tsx[2m > [22m[2museExportCorpusEvents —— App 层事件桥 [SR2-AI-04][2m > [22m[2m终局 toast 成功面：fileCount 入文案；errorCount>0 部分=info 档，全成=success 档（INV-02）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/corpus-export.test.tsx[2m > [22m[2museExportCorpusEvents —— App 层事件桥 [SR2-AI-04][2m > [22m[2m终局 toast 失败面：折叠错误 message 直达 toast（EXPORT_BUSY/CANCELLED 同型，INV-02/INV-13）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/corpus-export.test.tsx[2m > [22m[2mCorpusExportSection —— 设置页 AI 语料导出节 [SR2-AI-04][2m > [22m[2m初始渲染：「导出语料」按钮可点；进度行不渲染（无会话）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/corpus-export.test.tsx[2m > [22m[2mCorpusExportSection —— 设置页 AI 语料导出节 [SR2-AI-04][2m > [22m[2m初始渲染：「导出语料」按钮可点；进度行不渲染（无会话）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/corpus-export.test.tsx[2m > [22m[2mCorpusExportSection —— 设置页 AI 语料导出节 [SR2-AI-04][2m > [22m[2m点击导出：经 store.start 真链路以 {} invoke corpusSession（全库口径——目录选择在通道内，INV-07）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/corpus-export.test.tsx[2m > [22m[2mCorpusExportSection —— 设置页 AI 语料导出节 [SR2-AI-04][2m > [22m[2m点击导出：经 store.start 真链路以 {} invoke corpusSession（全库口径——目录选择在通道内，INV-07）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/corpus-export.test.tsx[2m > [22m[2mCorpusExportSection —— 设置页 AI 语料导出节 [SR2-AI-04][2m > [22m[2m点击导出：经 store.start 真链路以 {} invoke corpusSession（全库口径——目录选择在通道内，INV-07）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/corpus-export.test.tsx[2m > [22m[2mCorpusExportSection —— 设置页 AI 语料导出节 [SR2-AI-04][2m > [22m[2mbusy 期间按钮 disabled（会话单飞的 UI 预防面）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/corpus-export.test.tsx[2m > [22m[2mCorpusExportSection —— 设置页 AI 语料导出节 [SR2-AI-04][2m > [22m[2mbusy 期间按钮 disabled（会话单飞的 UI 预防面）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/corpus-export.test.tsx[2m > [22m[2mCorpusExportSection —— 设置页 AI 语料导出节 [SR2-AI-04][2m > [22m[2mbusy 期间按钮 disabled（会话单飞的 UI 预防面）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/corpus-export.test.tsx[2m > [22m[2mCorpusExportSection —— 设置页 AI 语料导出节 [SR2-AI-04][2m > [22m[2m进度行：streaming 呈现「提取全文 done/total」；终局 done+errorCount 部分成功可见
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/corpus-export.test.tsx[2m > [22m[2mCorpusExportSection —— 设置页 AI 语料导出节 [SR2-AI-04][2m > [22m[2m进度行：streaming 呈现「提取全文 done/total」；终局 done+errorCount 部分成功可见
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/corpus-export.test.tsx[2m > [22m[2mCorpusExportSection —— 设置页 AI 语料导出节 [SR2-AI-04][2m > [22m[2mSettingsPage 挂载：设置页渲染后「导出语料」按钮可见（R14 防线）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+    at ZcodeLinkSection (E:\class\智慧水务\Synapse_remake\src\renderer\features\settings\ZcodeLinkSection.tsx:14:47)
+    at div
+    at SettingsPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\settings\SettingsPage.tsx:34:42)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+    at SettingsPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\settings\SettingsPage.tsx:34:42)
+Warning: The current testing environment is not configured to support act(...)
+    at SettingsPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\settings\SettingsPage.tsx:34:42)
+
+[90mstderr[2m | tests/unit/renderer/corpus-export.test.tsx[2m > [22m[2mCorpusExportSection —— 设置页 AI 语料导出节 [SR2-AI-04][2m > [22m[2mSettingsPage 挂载：设置页渲染后「导出语料」按钮可见（R14 防线）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+ [32m✓[39m tests/unit/renderer/corpus-export.test.tsx [2m([22m[2m17 tests[22m[2m)[22m[90m 69[2mms[22m[39m
+[90mstderr[2m | tests/unit/renderer/lineage-side-panel.test.tsx[2m > [22m[2m文献节点四区渲染：元信息/核心 idea/AI 分节分色单源/人工笔记
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-side-panel.test.tsx[2m > [22m[2m文献节点四区渲染：元信息/核心 idea/AI 分节分色单源/人工笔记
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-side-panel.test.tsx[2m > [22m[2m主题节点：仅前两区+空态文案；笔记通道零调用
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-side-panel.test.tsx[2m > [22m[2m主题节点：仅前两区+空态文案；笔记通道零调用
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-side-panel.test.tsx[2m > [22m[2mR2-LG11 侧板浅色化：白玻璃底 rgba(255,255,255,0.92)+边 #e4ded1+blur12；h4 accent 左缘条；条目卡白底淡描边（防回退）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-side-panel.test.tsx[2m > [22m[2mR2-LG11 侧板浅色化：白玻璃底 rgba(255,255,255,0.92)+边 #e4ded1+blur12；h4 accent 左缘条；条目卡白底淡描边（防回退）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-side-panel.test.tsx[2m > [22m[2mAI 条目双击→onJumpToPaper 载荷含锚三元组+aiNoteId（anchorPage 1 基→0 基）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-side-panel.test.tsx[2m > [22m[2mAI 条目双击→onJumpToPaper 载荷含锚三元组+aiNoteId（anchorPage 1 基→0 基）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-side-panel.test.tsx[2m > [22m[2m无锚条目（无引文且无页码）→anchor 缺省（篇级防线）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-side-panel.test.tsx[2m > [22m[2m无锚条目（无引文且无页码）→anchor 缺省（篇级防线）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-side-panel.test.tsx[2m > [22m[2m有页码无引文→anchor 保留页码（页级跳转不回退第 0 页）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-side-panel.test.tsx[2m > [22m[2m有页码无引文→anchor 保留页码（页级跳转不回退第 0 页）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-side-panel.test.tsx[2m > [22m[2m条目单击不触发跳转（双击显式语义——防误触）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-side-panel.test.tsx[2m > [22m[2m条目单击不触发跳转（双击显式语义——防误触）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-side-panel.test.tsx[2m > [22m[2mAI 取数失败→error+重试按钮；重试成功恢复呈现（INV-02 列表型）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-side-panel.test.tsx[2m > [22m[2mAI 取数失败→error+重试按钮；重试成功恢复呈现（INV-02 列表型）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+    at LineageSideAiNotes (E:\class\智慧水务\Synapse_remake\src\renderer\features\lineage\LineageSideAiNotes.tsx:16:11)
+    at div
+    at LineageSidePanel (E:\class\智慧水务\Synapse_remake\src\renderer\features\lineage\LineageSidePanel.tsx:23:11)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-side-panel.test.tsx[2m > [22m[2mAI 取数失败→error+重试按钮；重试成功恢复呈现（INV-02 列表型）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-side-panel.test.tsx[2m > [22m[2m人工笔记取数失败→error+重试（与 AI 面独立）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-side-panel.test.tsx[2m > [22m[2m人工笔记取数失败→error+重试（与 AI 面独立）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+    at LineageSideManualNote (E:\class\智慧水务\Synapse_remake\src\renderer\features\lineage\LineageSideManualNote.tsx:12:11)
+    at div
+    at LineageSidePanel (E:\class\智慧水务\Synapse_remake\src\renderer\features\lineage\LineageSidePanel.tsx:23:11)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-side-panel.test.tsx[2m > [22m[2m人工笔记取数失败→error+重试（与 AI 面独立）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-side-panel.test.tsx[2m > [22m[2m空数据：AI 空态+人工 null 空态（非错误）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-side-panel.test.tsx[2m > [22m[2m空数据：AI 空态+人工 null 空态（非错误）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-side-panel.test.tsx[2m > [22m[2m未选中节点→空态提示
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-side-panel.test.tsx[2m > [22m[2m未选中节点→空态提示
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-side-panel.test.tsx[2m > [22m[2m换节点 stale 守卫：晚到的旧节点响应不覆盖新节点数据
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+    at LineageSideAiNotes (E:\class\智慧水务\Synapse_remake\src\renderer\features\lineage\LineageSideAiNotes.tsx:16:11)
+    at div
+    at LineageSidePanel (E:\class\智慧水务\Synapse_remake\src\renderer\features\lineage\LineageSidePanel.tsx:23:11)
+Warning: The current testing environment is not configured to support act(...)
+    at LineageSideManualNote (E:\class\智慧水务\Synapse_remake\src\renderer\features\lineage\LineageSideManualNote.tsx:12:11)
+    at div
+    at LineageSidePanel (E:\class\智慧水务\Synapse_remake\src\renderer\features\lineage\LineageSidePanel.tsx:23:11)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-side-panel.test.tsx[2m > [22m[2m换节点 stale 守卫：晚到的旧节点响应不覆盖新节点数据
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-side-panel.test.tsx[2m > [22m[2mPage 全链：单击节点→侧板挂载呈现节点+Canvas 选中视觉态兑现
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-side-panel.test.tsx[2m > [22m[2mPage 全链：单击节点→侧板挂载呈现节点+Canvas 选中视觉态兑现
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-side-panel.test.tsx[2m > [22m[2mPage 全链：单击节点→侧板挂载呈现节点+Canvas 选中视觉态兑现
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-side-panel.test.tsx[2m > [22m[2mPage 全链：AI 条目双击→requestOpenPaperAnchored 锚载荷（0 基页）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-side-panel.test.tsx[2m > [22m[2mPage 全链：AI 条目双击→requestOpenPaperAnchored 锚载荷（0 基页）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-side-panel.test.tsx[2m > [22m[2mPage 全链：AI 条目双击→requestOpenPaperAnchored 锚载荷（0 基页）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-side-panel.test.tsx[2m > [22m[2mPage 全链：无锚条目双击→载荷 anchor 缺省（仅开篇）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-side-panel.test.tsx[2m > [22m[2mPage 全链：无锚条目双击→载荷 anchor 缺省（仅开篇）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-side-panel.test.tsx[2m > [22m[2mPage 全链：无锚条目双击→载荷 anchor 缺省（仅开篇）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+ [32m✓[39m tests/unit/renderer/lineage-side-panel.test.tsx [2m([22m[2m21 tests[22m[2m)[22m[90m 166[2mms[22m[39m
+[90mstderr[2m | tests/unit/renderer/reader-notes-panel.test.tsx[2m > [22m[2mReaderNotesPanel —— 总评层（notes.store 消费） [SR2-C-03][2m > [22m[2m载入：api.notes.get → 标题/正文回填；pending=false 显示「已保存」
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/reader-notes-panel.test.tsx[2m > [22m[2mReaderNotesPanel —— 总评层（notes.store 消费） [SR2-C-03][2m > [22m[2m载入：api.notes.get → 标题/正文回填；pending=false 显示「已保存」
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/reader-notes-panel.test.tsx[2m > [22m[2mReaderNotesPanel —— 总评层（notes.store 消费） [SR2-C-03][2m > [22m[2m载入失败：toast+禁用输入+重试按钮可见（动作型失败，INV-02）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/reader-notes-panel.test.tsx[2m > [22m[2mReaderNotesPanel —— 总评层（notes.store 消费） [SR2-C-03][2m > [22m[2m载入失败：toast+禁用输入+重试按钮可见（动作型失败，INV-02）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/reader-notes-panel.test.tsx[2m > [22m[2mReaderNotesPanel —— 总评层（notes.store 消费） [SR2-C-03][2m > [22m[2m编辑写草稿：pending 镜像置位→「未保存」；防抖保存成功→「已保存」
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/reader-notes-panel.test.tsx[2m > [22m[2mReaderNotesPanel —— 总评层（notes.store 消费） [SR2-C-03][2m > [22m[2m编辑写草稿：pending 镜像置位→「未保存」；防抖保存成功→「已保存」
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/reader-notes-panel.test.tsx[2m > [22m[2mReaderNotesPanel —— 总评层（notes.store 消费） [SR2-C-03][2m > [22m[2m编辑写草稿：pending 镜像置位→「未保存」；防抖保存成功→「已保存」
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/reader-notes-panel.test.tsx[2m > [22m[2mReaderNotesPanel —— 总评层（notes.store 消费） [SR2-C-03][2m > [22m[2m换 tab 草稿驻 store 不失忆（per-tab 语义——切回即见草稿）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/reader-notes-panel.test.tsx[2m > [22m[2mReaderNotesPanel —— 总评层（notes.store 消费） [SR2-C-03][2m > [22m[2m换 tab 草稿驻 store 不失忆（per-tab 语义——切回即见草稿）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-canvas.test.tsx[2m > [22m[2mLineageCanvas —— 只读渲染[2m > [22m[2m节点文本真实渲染（标题与年份可见——「渲染出真实文本」红线）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-canvas.test.tsx[2m > [22m[2mLineageCanvas —— 只读渲染[2m > [22m[2m主题节点样式区分：paperId null 标记 data-kind=theme，文献节点 paper
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-canvas.test.tsx[2m > [22m[2mLineageCanvas —— 只读渲染[2m > [22m[2m空图空态文案（导入/添加入口归 LG-03——本单仅文案不留死按钮）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-canvas.test.tsx[2m > [22m[2mLineageCanvas —— 只读渲染[2m > [22m[2mW2 回归：空→非空转场后 pan/zoom 可用（listener 不因空态首挂载失绑）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-canvas.test.tsx[2m > [22m[2mLineageCanvas —— 只读渲染[2m > [22m[2m覆盖节点用覆盖位置渲染（不参与自动布局）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-canvas.test.tsx[2m > [22m[2mLineageCanvas —— 只读渲染[2m > [22m[2mSR2-LG-07 边 label：沿贝塞尔中点渲染真实文本；空 label 边不渲染 text
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-canvas.test.tsx[2m > [22m[2mLineageCanvas —— pan/zoom（INV-14）[2m > [22m[2mzoom：滚轮上滚放大（scale>1）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-canvas.test.tsx[2m > [22m[2mLineageCanvas —— pan/zoom（INV-14）[2m > [22m[2mzoom 钳制：连续放大不超 4，连续缩小不低 0.25
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-canvas.test.tsx[2m > [22m[2mLineageCanvas —— pan/zoom（INV-14）[2m > [22m[2mpan：空白处拖拽平移（translate 变化）；节点上按下不平移
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-canvas.test.tsx[2m > [22m[2mLineageCanvas —— pan/zoom（INV-14）[2m > [22m[2mINV-14 成对清理：unmount 后 svg/window 上注册的 listener 同 type 同引用全移除
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-canvas.test.tsx[2m > [22m[2mR2-LG10 auto-fit 视口自适应（票面 P1）[2m > [22m[2m首载 fit：全图+层带标签入视口（transform 离开初始 {0,0,1}；k=容纳比取小）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+    at LineageCanvas (E:\class\智慧水务\Synapse_remake\src\renderer\features\lineage\LineageCanvas.tsx:21:11)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-canvas.test.tsx[2m > [22m[2mR2-LG10 auto-fit 视口自适应（票面 P1）[2m > [22m[2m不抢用户视口：pan 置 userInteracted 后 nodes 引用变化不重置视口
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+    at LineageCanvas (E:\class\智慧水务\Synapse_remake\src\renderer\features\lineage\LineageCanvas.tsx:21:11)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-canvas.test.tsx[2m > [22m[2mR2-LG10 auto-fit 视口自适应（票面 P1）[2m > [22m[2m「适应视图」按钮：pan 抢占后显式复位重触发 fit（回到 fitted 值）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+    at LineageCanvas (E:\class\智慧水务\Synapse_remake\src\renderer\features\lineage\LineageCanvas.tsx:21:11)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+    at LineageCanvas (E:\class\智慧水务\Synapse_remake\src\renderer\features\lineage\LineageCanvas.tsx:21:11)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-canvas.test.tsx[2m > [22m[2mR2-LG10 auto-fit 视口自适应（票面 P1）[2m > [22m[2mR2-LG10 题名分档宽：长题名卡 rect 宽 260/短题名 180（nodeWidth 单源消费）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-canvas.test.tsx[2m > [22m[2mF-L1-C 边标签（变体 C 换行+防重叠放置+悬停滚动）[2m > [22m[2m⑦标签渲染形态：foreignObject 内 HTML div（class lineage-edge-label）+FO 恒 130×37.05+title 全文 tooltip
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-canvas.test.tsx[2m > [22m[2mF-L1-C 边标签（变体 C 换行+防重叠放置+悬停滚动）[2m > [22m[2m⑧slots 传递：同锚两条长标签经放置器错开（两 FO 位置不等——回炉 1 R1 后首自由位=dx 第二档 166）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-canvas.test.tsx[2m > [22m[2mF-L1-C 边标签（变体 C 换行+防重叠放置+悬停滚动）[2m > [22m[2m⑨wheel 主动滚动（回炉 1 R2）：截断标签上滚轮→scrollTop 恰增 deltaY+zoom 不触发；未截断→zoom 正常
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-canvas.test.tsx[2m > [22m[2mLineagePage —— 取数三态（lineage.store 数据单源）[2m > [22m[2mloading：挂载期呈加载文案，graph 取数一次
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-canvas.test.tsx[2m > [22m[2mLineagePage —— 取数三态（lineage.store 数据单源）[2m > [22m[2mready：取数成功渲染节点真实文本（经 store 分发，画布消费）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-canvas.test.tsx[2m > [22m[2mLineagePage —— 取数三态（lineage.store 数据单源）[2m > [22m[2mready 空图：空态文案（列表型空非错误）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-canvas.test.tsx[2m > [22m[2mLineagePage —— 取数三态（lineage.store 数据单源）[2m > [22m[2mready 空图：空态文案（列表型空非错误）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+ [32m✓[39m tests/unit/renderer/library-cards.test.tsx [2m([22m[2m16 tests[22m[2m)[22m[90m 87[2mms[22m[39m
+[90mstderr[2m | tests/unit/renderer/lineage-canvas.test.tsx[2m > [22m[2mLineagePage —— 取数三态（lineage.store 数据单源）[2m > [22m[2merror：取数失败呈错误条+重试按钮；重试再取数成功恢复
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/reader-notes-panel.test.tsx[2m > [22m[2mReaderNotesPanel —— 总评层（notes.store 消费） [SR2-C-03][2m > [22m[2m换 tab 草稿驻 store 不失忆（per-tab 语义——切回即见草稿）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+    at AiNotesSection (E:\class\智慧水务\Synapse_remake\src\renderer\features\reader\AiNotesSection.tsx:30:11)
+    at div
+    at ReaderNotesPanel (E:\class\智慧水务\Synapse_remake\src\renderer\features\reader\ReaderNotesPanel.tsx:23:11)
+Warning: The current testing environment is not configured to support act(...)
+    at ReaderNotesPanel (E:\class\智慧水务\Synapse_remake\src\renderer\features\reader\ReaderNotesPanel.tsx:23:11)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/reader-notes-panel.test.tsx[2m > [22m[2mReaderNotesPanel —— 总评层（notes.store 消费） [SR2-C-03][2m > [22m[2m换 tab 草稿驻 store 不失忆（per-tab 语义——切回即见草稿）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+    at AiNotesSection (E:\class\智慧水务\Synapse_remake\src\renderer\features\reader\AiNotesSection.tsx:30:11)
+    at div
+    at ReaderNotesPanel (E:\class\智慧水务\Synapse_remake\src\renderer\features\reader\ReaderNotesPanel.tsx:23:11)
+Warning: The current testing environment is not configured to support act(...)
+    at ReaderNotesPanel (E:\class\智慧水务\Synapse_remake\src\renderer\features\reader\ReaderNotesPanel.tsx:23:11)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/reader-notes-panel.test.tsx[2m > [22m[2mReaderNotesPanel —— 总评层（notes.store 消费） [SR2-C-03][2m > [22m[2m跨 paper 周期隔离（deepseek B1）：A 保存失败落地于切到 B 之后——B 不得误显「保存失败」
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-canvas.test.tsx[2m > [22m[2mLineagePage —— 取数三态（lineage.store 数据单源）[2m > [22m[2merror：取数失败呈错误条+重试按钮；重试再取数成功恢复
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-canvas.test.tsx[2m > [22m[2mLineagePage —— 取数三态（lineage.store 数据单源）[2m > [22m[2mstore 数据缓存：Page 卸载后 nodes/edges 驻留（03/04 消费面免二次取数）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/reader-notes-panel.test.tsx[2m > [22m[2mReaderNotesPanel —— 总评层（notes.store 消费） [SR2-C-03][2m > [22m[2m跨 paper 周期隔离（deepseek B1）：A 保存失败落地于切到 B 之后——B 不得误显「保存失败」
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/reader-notes-panel.test.tsx[2m > [22m[2mReaderNotesPanel —— 总评层（notes.store 消费） [SR2-C-03][2m > [22m[2m跨 paper 周期隔离（deepseek B1）：A 保存失败落地于切到 B 之后——B 不得误显「保存失败」
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+    at AiNotesSection (E:\class\智慧水务\Synapse_remake\src\renderer\features\reader\AiNotesSection.tsx:30:11)
+    at div
+    at ReaderNotesPanel (E:\class\智慧水务\Synapse_remake\src\renderer\features\reader\ReaderNotesPanel.tsx:23:11)
+Warning: The current testing environment is not configured to support act(...)
+    at ReaderNotesPanel (E:\class\智慧水务\Synapse_remake\src\renderer\features\reader\ReaderNotesPanel.tsx:23:11)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-canvas.test.tsx[2m > [22m[2mLineagePage —— 取数三态（lineage.store 数据单源）[2m > [22m[2mstore 数据缓存：Page 卸载后 nodes/edges 驻留（03/04 消费面免二次取数）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+ [32m✓[39m tests/unit/renderer/lineage-canvas.test.tsx [2m([22m[2m23 tests[22m[2m)[22m[90m 263[2mms[22m[39m
+[90mstderr[2m | tests/unit/renderer/reader-notes-panel.test.tsx[2m > [22m[2mReaderNotesPanel —— 总评层（notes.store 消费） [SR2-C-03][2m > [22m[2m跨 paper 周期隔离（deepseek B1）：A 保存失败落地于切到 B 之后——B 不得误显「保存失败」
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+    at AiNotesSection (E:\class\智慧水务\Synapse_remake\src\renderer\features\reader\AiNotesSection.tsx:30:11)
+    at div
+    at ReaderNotesPanel (E:\class\智慧水务\Synapse_remake\src\renderer\features\reader\ReaderNotesPanel.tsx:23:11)
+Warning: The current testing environment is not configured to support act(...)
+    at ReaderNotesPanel (E:\class\智慧水务\Synapse_remake\src\renderer\features\reader\ReaderNotesPanel.tsx:23:11)
+Warning: The current testing environment is not configured to support act(...)
+    at ReaderNotesPanel (E:\class\智慧水务\Synapse_remake\src\renderer\features\reader\ReaderNotesPanel.tsx:23:11)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/reader-notes-panel.test.tsx[2m > [22m[2mFragmentNotesList —— 片段层（C-01 序消费） [SR2-C-03][2m > [22m[2m按文档序渲染（乱序入参重排）；单击条目回调 onLocate(id)
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/reader-notes-panel.test.tsx[2m > [22m[2mFragmentNotesList —— 片段层（C-01 序消费） [SR2-C-03][2m > [22m[2m空态文案与高亮滚动（highlightAnnotationId 条目 scrollIntoView）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+ [32m✓[39m tests/unit/renderer/reader-notes-panel.test.tsx [2m([22m[2m7 tests[22m[2m)[22m[90m 105[2mms[22m[39m
+[90mstdout[2m | tests/unit/renderer/lineage-board.test.tsx
+[22m[39mWarning: Please use the `legacy` build in Node.js environments.
+
+[90mstderr[2m | tests/unit/renderer/lineage-board.test.tsx[2m > [22m[2mLineageBoard —— 拖拽/选中（JSON Canvas 覆盖语义）[2m > [22m[2m拖拽落点→upsert-node x/y 载荷（原覆盖位+位移；其余字段保留）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-board.test.tsx[2m > [22m[2mLineageBoard —— 拖拽/选中（JSON Canvas 覆盖语义）[2m > [22m[2m拖拽落点→upsert-node x/y 载荷（原覆盖位+位移；其余字段保留）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-board.test.tsx[2m > [22m[2mLineageBoard —— 拖拽/选中（JSON Canvas 覆盖语义）[2m > [22m[2m单击=选中上抛（位移低于阈值不触发写）；onSelectNode 形态照票面（04 侧板消费面）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-board.test.tsx[2m > [22m[2mLineageBoard —— 拖拽/选中（JSON Canvas 覆盖语义）[2m > [22m[2m单击=选中上抛（位移低于阈值不触发写）；onSelectNode 形态照票面（04 侧板消费面）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-board.test.tsx[2m > [22m[2mLineageBoard —— 节点菜单（加边/改父/删边/删节点/core_idea）[2m > [22m[2m加边全流程：菜单「连线到…」→目标选取→upsertEdge {from: 源, to: 目标}
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+[lineage-layout] 剔除 1 条破坏树约束的边（多父/环/自环/悬空——INV-27 service 层已守，此为布局防御第二道，不丢节点）
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-board.test.tsx[2m > [22m[2mLineageBoard —— 节点菜单（加边/改父/删边/删节点/core_idea）[2m > [22m[2m加边全流程：菜单「连线到…」→目标选取→upsertEdge {from: 源, to: 目标}
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-board.test.tsx[2m > [22m[2mLineageBoard —— 节点菜单（加边/改父/删边/删节点/core_idea）[2m > [22m[2m树拒绝三路径 toast：service 中文 reason 透传（多父/成环/自环），UI 零守卫只接呈现
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-board.test.tsx[2m > [22m[2mLineageBoard —— 节点菜单（加边/改父/删边/删节点/core_idea）[2m > [22m[2m树拒绝三路径 toast：service 中文 reason 透传（多父/成环/自环），UI 零守卫只接呈现
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-board.test.tsx[2m > [22m[2mLineageBoard —— 节点菜单（加边/改父/删边/删节点/core_idea）[2m > [22m[2m树拒绝三路径 toast：service 中文 reason 透传（多父/成环/自环），UI 零守卫只接呈现
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-board.test.tsx[2m > [22m[2mLineageBoard —— 节点菜单（加边/改父/删边/删节点/core_idea）[2m > [22m[2m树拒绝三路径 toast：service 中文 reason 透传（多父/成环/自环），UI 零守卫只接呈现
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-board.test.tsx[2m > [22m[2mLineageBoard —— 节点菜单（加边/改父/删边/删节点/core_idea）[2m > [22m[2m改父=删旧边+加新边两调用（N5 语义：UI 单操作，service 两调用）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+[lineage-layout] 剔除 1 条破坏树约束的边（多父/环/自环/悬空——INV-27 service 层已守，此为布局防御第二道，不丢节点）
+
+[90mstderr[2m | tests/unit/renderer/lineage-board.test.tsx[2m > [22m[2mLineageBoard —— 节点菜单（加边/改父/删边/删节点/core_idea）[2m > [22m[2m改父=删旧边+加新边两调用（N5 语义：UI 单操作，service 两调用）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-board.test.tsx[2m > [22m[2mLineageBoard —— 节点菜单（加边/改父/删边/删节点/core_idea）[2m > [22m[2m删除父连线/删除节点：菜单动作→remove-edge/remove-node 载荷
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-board.test.tsx[2m > [22m[2mLineageBoard —— 节点菜单（加边/改父/删边/删节点/core_idea）[2m > [22m[2mcore_idea 编辑保存：textarea 改值→upsert 载荷含新想法且 x/y 保留（防清覆盖）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-board.test.tsx[2m > [22m[2mLineageBoard —— 节点菜单（加边/改父/删边/删节点/core_idea）[2m > [22m[2mcore_idea 编辑保存：textarea 改值→upsert 载荷含新想法且 x/y 保留（防清覆盖）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-board.test.tsx[2m > [22m[2mLineageBoard —— 保存态指示（autosave-first：无保存按钮）[2m > [22m[2m失败指示+重试：error 条可见，重试点击重发；成功后指示消退
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-board.test.tsx[2m > [22m[2mLineageBoard —— 保存态指示（autosave-first：无保存按钮）[2m > [22m[2m失败指示+重试：error 条可见，重试点击重发；成功后指示消退
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-board.test.tsx[2m > [22m[2mLineageBoard —— 保存态指示（autosave-first：无保存按钮）[2m > [22m[2m失败指示+重试：error 条可见，重试点击重发；成功后指示消退
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-board.test.tsx[2m > [22m[2mLineageBoard —— 添加节点对话框（两型）[2m > [22m[2m文献型：library.list 搜索选取→paperId 绑定+元数据默认
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+    at LineageAddNodeDialog (E:\class\智慧水务\Synapse_remake\src\renderer\features\lineage\LineageAddNodeDialog.tsx:10:49)
+    at div
+    at LineageBoard (E:\class\智慧水务\Synapse_remake\src\renderer\features\lineage\LineageBoard.tsx:23:39)
+Warning: The current testing environment is not configured to support act(...)
+    at LineageAddNodeDialog (E:\class\智慧水务\Synapse_remake\src\renderer\features\lineage\LineageAddNodeDialog.tsx:10:49)
+    at div
+    at LineageBoard (E:\class\智慧水务\Synapse_remake\src\renderer\features\lineage\LineageBoard.tsx:23:39)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+    at LineageAddNodeDialog (E:\class\智慧水务\Synapse_remake\src\renderer\features\lineage\LineageAddNodeDialog.tsx:10:49)
+    at div
+    at LineageBoard (E:\class\智慧水务\Synapse_remake\src\renderer\features\lineage\LineageBoard.tsx:23:39)
+Warning: The current testing environment is not configured to support act(...)
+    at LineageAddNodeDialog (E:\class\智慧水务\Synapse_remake\src\renderer\features\lineage\LineageAddNodeDialog.tsx:10:49)
+    at div
+    at LineageBoard (E:\class\智慧水务\Synapse_remake\src\renderer\features\lineage\LineageBoard.tsx:23:39)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-board.test.tsx[2m > [22m[2mLineageBoard —— 添加节点对话框（两型）[2m > [22m[2m文献型：library.list 搜索选取→paperId 绑定+元数据默认
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-board.test.tsx[2m > [22m[2mLineageBoard —— 添加节点对话框（两型）[2m > [22m[2m文献型：library.list 搜索选取→paperId 绑定+元数据默认
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-board.test.tsx[2m > [22m[2mLineageBoard —— 添加节点对话框（两型）[2m > [22m[2m主题型：title 输入→paperId null 节点
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+    at LineageAddNodeDialog (E:\class\智慧水务\Synapse_remake\src\renderer\features\lineage\LineageAddNodeDialog.tsx:10:49)
+    at div
+    at LineageBoard (E:\class\智慧水务\Synapse_remake\src\renderer\features\lineage\LineageBoard.tsx:23:39)
+Warning: The current testing environment is not configured to support act(...)
+    at LineageAddNodeDialog (E:\class\智慧水务\Synapse_remake\src\renderer\features\lineage\LineageAddNodeDialog.tsx:10:49)
+    at div
+    at LineageBoard (E:\class\智慧水务\Synapse_remake\src\renderer\features\lineage\LineageBoard.tsx:23:39)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-board.test.tsx[2m > [22m[2mLineageBoard —— 添加节点对话框（两型）[2m > [22m[2m主题型：title 输入→paperId null 节点
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-board.test.tsx[2m > [22m[2mLineageBoard —— 导入草稿入口（LG-01 覆盖式语义条款兑现，回炉 1 轮裁决①）[2m > [22m[2m确认接受→lineage/import 调用+成功计数 toast+graph 刷新（store 重取）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-board.test.tsx[2m > [22m[2mLineageBoard —— 导入草稿入口（LG-01 覆盖式语义条款兑现，回炉 1 轮裁决①）[2m > [22m[2mconfirm 取消→不调 import 通道（无操作）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-board.test.tsx[2m > [22m[2mLineageBoard —— 导入草稿入口（LG-01 覆盖式语义条款兑现，回炉 1 轮裁决①）[2m > [22m[2mconfirm 取消→不调 import 通道（无操作）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-board.test.tsx[2m > [22m[2mLineageBoard —— 导入草稿入口（LG-01 覆盖式语义条款兑现，回炉 1 轮裁决①）[2m > [22m[2m校验失败=errors 清单 toast（汇总计数+首条 path/reason 真实文本）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-board.test.tsx[2m > [22m[2mLineageBoard —— 导入草稿入口（LG-01 覆盖式语义条款兑现，回炉 1 轮裁决①）[2m > [22m[2m校验失败=errors 清单 toast（汇总计数+首条 path/reason 真实文本）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-board.test.tsx[2m > [22m[2m组合根 —— 退出拦截聚合扩面（INV-22：tab dirty ∪ lineage dirty）[2m > [22m[2mlineage 保存失败→dirty=true 沿 system/set-quit-dirty 上报（App 组合根单点）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+    at TagFilter (E:\class\智慧水务\Synapse_remake\src\renderer\features\tags\TagFilter.tsx:10:11)
+    at div
+    at FilterBar (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\FilterBar.tsx:21:11)
+    at div
+    at LibraryPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\LibraryPage.tsx:26:41)
+    at ErrorBoundary (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:101:1)
+    at main
+    at div
+    at div
+    at App (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:157:49)
+Warning: The current testing environment is not configured to support act(...)
+    at FilterBar (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\FilterBar.tsx:21:11)
+    at div
+    at LibraryPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\LibraryPage.tsx:26:41)
+    at ErrorBoundary (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:101:1)
+    at main
+    at div
+    at div
+    at App (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:157:49)
+Warning: The current testing environment is not configured to support act(...)
+    at FilterBar (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\FilterBar.tsx:21:11)
+    at div
+    at LibraryPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\LibraryPage.tsx:26:41)
+    at ErrorBoundary (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:101:1)
+    at main
+    at div
+    at div
+    at App (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:157:49)
+Warning: The current testing environment is not configured to support act(...)
+    at FilterBar (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\FilterBar.tsx:21:11)
+    at div
+    at LibraryPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\LibraryPage.tsx:26:41)
+    at ErrorBoundary (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:101:1)
+    at main
+    at div
+    at div
+    at App (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:157:49)
+Warning: The current testing environment is not configured to support act(...)
+    at FilterBar (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\FilterBar.tsx:21:11)
+    at div
+    at LibraryPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\LibraryPage.tsx:26:41)
+    at ErrorBoundary (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:101:1)
+    at main
+    at div
+    at div
+    at App (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:157:49)
+Warning: The current testing environment is not configured to support act(...)
+    at PaperDetailPanel (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\PaperDetailPanel.tsx:54:11)
+    at aside
+    at div
+    at div
+    at LibraryPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\LibraryPage.tsx:26:41)
+    at ErrorBoundary (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:101:1)
+    at main
+    at div
+    at div
+    at App (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:157:49)
+Warning: The current testing environment is not configured to support act(...)
+    at PaperDetailPanel (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\PaperDetailPanel.tsx:54:11)
+    at aside
+    at div
+    at div
+    at LibraryPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\LibraryPage.tsx:26:41)
+    at ErrorBoundary (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:101:1)
+    at main
+    at div
+    at div
+    at App (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:157:49)
+Warning: The current testing environment is not configured to support act(...)
+    at LibraryPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\LibraryPage.tsx:26:41)
+    at ErrorBoundary (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:101:1)
+    at main
+    at div
+    at div
+    at App (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:157:49)
+Warning: The current testing environment is not configured to support act(...)
+    at LibraryPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\LibraryPage.tsx:26:41)
+    at ErrorBoundary (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:101:1)
+    at main
+    at div
+    at div
+    at App (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:157:49)
+Warning: The current testing environment is not configured to support act(...)
+    at LibraryPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\LibraryPage.tsx:26:41)
+    at ErrorBoundary (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:101:1)
+    at main
+    at div
+    at div
+    at App (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:157:49)
+Warning: The current testing environment is not configured to support act(...)
+    at App (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:157:49)
+Warning: The current testing environment is not configured to support act(...)
+    at TagFilter (E:\class\智慧水务\Synapse_remake\src\renderer\features\tags\TagFilter.tsx:10:11)
+    at div
+    at FilterBar (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\FilterBar.tsx:21:11)
+    at div
+    at LibraryPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\LibraryPage.tsx:26:41)
+    at ErrorBoundary (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:101:1)
+    at main
+    at div
+    at div
+    at App (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:157:49)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+    at LineagePage (E:\class\智慧水务\Synapse_remake\src\renderer\features\lineage\LineagePage.tsx:14:40)
+    at ErrorBoundary (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:101:1)
+    at main
+    at div
+    at div
+    at App (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:157:49)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-board.test.tsx[2m > [22m[2m组合根 —— 退出拦截聚合扩面（INV-22：tab dirty ∪ lineage dirty）[2m > [22m[2mlineage 保存失败→dirty=true 沿 system/set-quit-dirty 上报（App 组合根单点）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/lineage-board.test.tsx[2m > [22m[2m组合根 —— 退出拦截聚合扩面（INV-22：tab dirty ∪ lineage dirty）[2m > [22m[2mlineage 保存失败→dirty=true 沿 system/set-quit-dirty 上报（App 组合根单点）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+ [32m✓[39m tests/unit/renderer/lineage-board.test.tsx [2m([22m[2m14 tests[22m[2m)[22m[90m 195[2mms[22m[39m
+[90mstderr[2m | tests/unit/renderer/tab-dirty.test.tsx[2m > [22m[2mtab-dirty —— 两写面灰点信号聚合 [SR2-TABS-03][2m > [22m[2museTabDirtyAggregate：任一 tab 任一写面 dirty → true；全净 → false
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/tab-dirty.test.tsx[2m > [22m[2mTabBar —— 灰点渲染与关闭脏 tab 确认（组件级） [SR2-TABS-03][2m > [22m[2m灰点渲染：annotations 面（TabState.dirty）与 notes 面（pending）任一即渲染 ●；clean 无
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/tab-dirty.test.tsx[2m > [22m[2mTabBar —— 灰点渲染与关闭脏 tab 确认（组件级） [SR2-TABS-03][2m > [22m[2m关闭确认：dirty tab 取消不放行（confirm false→不关）；确认放行
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/tab-dirty.test.tsx[2m > [22m[2mTabBar —— 灰点渲染与关闭脏 tab 确认（组件级） [SR2-TABS-03][2m > [22m[2m关闭确认：clean tab 直接关（不弹窗）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+ [32m✓[39m tests/unit/renderer/tab-dirty.test.tsx [2m([22m[2m9 tests[22m[2m)[22m[90m 35[2mms[22m[39m
+ [32m✓[39m tests/unit/renderer/annotation-anchor.test.ts [2m([22m[2m19 tests[22m[2m)[22m[90m 12[2mms[22m[39m
+[90mstderr[2m | tests/unit/renderer/tab-bar.test.tsx[2m > [22m[2mTabBar —— 多标签栏（展示面+回调接线） [SR2-TABS-02][2m > [22m[2m空态：order 为空时整栏不渲染（无 tablist 元素）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/tab-bar.test.tsx[2m > [22m[2mTabBar —— 多标签栏（展示面+回调接线） [SR2-TABS-02][2m > [22m[2m渲染序=order；标题=fileName 去扩展名
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/tab-bar.test.tsx[2m > [22m[2mTabBar —— 多标签栏（展示面+回调接线） [SR2-TABS-02][2m > [22m[2m激活语义：activeId 的 tab aria-selected=true 其余 false；容器 role=tablist
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/tab-bar.test.tsx[2m > [22m[2mTabBar —— 多标签栏（展示面+回调接线） [SR2-TABS-02][2m > [22m[2m点击 tab 体 → activateTab（activeId 切换）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/tab-bar.test.tsx[2m > [22m[2mTabBar —— 多标签栏（展示面+回调接线） [SR2-TABS-02][2m > [22m[2m点击关闭叉 → closeTab（该 tab 移除；点击 tab 体不误触关闭）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/tab-bar.test.tsx[2m > [22m[2mTabBar —— 多标签栏（展示面+回调接线） [SR2-TABS-02][2m > [22m[2mloading 态显示「加载中…」；error 态显示「打开失败」
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/tab-bar.test.tsx[2m > [22m[2mTabBar —— 多标签栏（展示面+回调接线） [SR2-TABS-02][2m > [22m[2m键盘 roving：ArrowRight/Left 在 tab 项间移动焦点
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/tab-bar.test.tsx[2m > [22m[2mTabBar —— 多标签栏（展示面+回调接线） [SR2-TABS-02][2m > [22m[2m键盘激活：焦点项按 Enter/Space 等价点击 tab 体（activateTab）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/tab-bar.test.tsx[2m > [22m[2mTabBar —— 多标签栏（展示面+回调接线） [SR2-TABS-02][2m > [22m[2m循环导航：末项 ArrowRight 回到首项（roving 循环语义）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/tab-bar.test.tsx[2m > [22m[2mTabBar —— 多标签栏（展示面+回调接线） [SR2-TABS-02][2m > [22m[2m焦点残留守卫：聚焦的 tab 被鼠标关闭后，tablist 仍恰有一项 tabIndex=0（不退出 Tab 序）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/tab-bar.test.tsx[2m > [22m[2mTabBar —— 多标签栏（展示面+回调接线） [SR2-TABS-02][2m > [22m[2mDelete 键关闭：纯键盘路径（关闭叉已退出 Tab 序的替代通道）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/tab-bar.test.tsx[2m > [22m[2m标题=title 优先（fileName 为内容寻址哈希名时显示文献名）；title 空兜底 fileName 去扩展名
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+ [32m✓[39m tests/unit/renderer/tab-bar.test.tsx [2m([22m[2m12 tests[22m[2m)[22m[90m 46[2mms[22m[39m
+[90mstderr[2m | tests/unit/renderer/split-pane.test.tsx[2m > [22m[2mSplitPane —— 可拖拽分隔条容器 [SR2-UIK-01][2m > [22m[2m渲染 pane/main 与 separator 手柄；默认宽生效
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/split-pane.test.tsx[2m > [22m[2mSplitPane —— 可拖拽分隔条容器 [SR2-UIK-01][2m > [22m[2m持久化载入：合法值生效，越界值回退默认宽
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/split-pane.test.tsx[2m > [22m[2mSplitPane —— 可拖拽分隔条容器 [SR2-UIK-01][2m > [22m[2m拖拽会话：pointerdown→move 更新宽度（左随右移变宽）→up 还原 body 副作用并持久化
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/split-pane.test.tsx[2m > [22m[2mSplitPane —— 可拖拽分隔条容器 [SR2-UIK-01][2m > [22m[2m拖拽夹取：越界移动钳制在 max
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/split-pane.test.tsx[2m > [22m[2mSplitPane —— 可拖拽分隔条容器 [SR2-UIK-01][2m > [22m[2m拖拽中途卸载：body 副作用必须还原（INV-14 同族）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/split-pane.test.tsx[2m > [22m[2mSplitPane —— 可拖拽分隔条容器 [SR2-UIK-01][2m > [22m[2m键盘调宽：左栏 ArrowRight +8 / ArrowLeft -8，越界夹取并持久化
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/split-pane.test.tsx[2m > [22m[2mSplitPane —— 可拖拽分隔条容器 [SR2-UIK-01][2m > [22m[2mcollapsible：双击手柄折叠 pane（隐藏，宽度记忆），再双击恢复
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/split-pane.test.tsx[2m > [22m[2mSplitPane —— 可拖拽分隔条容器 [SR2-UIK-01][2m > [22m[2mpointercancel 与 pointerup 同路径收尾：副作用还原+宽度持久化
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/split-pane.test.tsx[2m > [22m[2mSplitPane —— 可拖拽分隔条容器 [SR2-UIK-01][2m > [22m[2m右栏方向语义：随左移变宽（px-clientX），渲染序 main→手柄→pane
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/split-pane.test.tsx[2m > [22m[2mSplitPane —— 可拖拽分隔条容器 [SR2-UIK-01][2m > [22m[2mmain 槽可空：仅渲染 pane+手柄，无主区占位（消费方外置主内容的稳定子位模式）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/split-pane.test.tsx[2m > [22m[2mSplitPane —— 可拖拽分隔条容器 [SR2-UIK-01][2m > [22m[2mARIA 可访问性：separator 暴露宽度值域与名称；非主键不启动拖拽
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+ [32m✓[39m tests/unit/renderer/split-pane.test.tsx [2m([22m[2m11 tests[22m[2m)[22m[90m 75[2mms[22m[39m
+[90mstderr[2m | tests/unit/renderer/reader-shortcuts.test.tsx[2m > [22m[2mReaderShortcuts —— 阅读器快捷键与滚轮缩放 [SR2-KEY-02][2m > [22m[2m翻页键位映射：PageDown/ArrowRight→next，PageUp/ArrowLeft→prev，均阻断原生滚动（防双移动）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/reader-shortcuts.test.tsx[2m > [22m[2mReaderShortcuts —— 阅读器快捷键与滚轮缩放 [SR2-KEY-02][2m > [22m[2mctrl+z：撤销标注操作栈触发（UNDO-01 键位面；editable 避让由 keymap 层保障——textarea 内为原生 undo）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/reader-shortcuts.test.tsx[2m > [22m[2mReaderShortcuts —— 阅读器快捷键与滚轮缩放 [SR2-KEY-02][2m > [22m[2mctrl+c：非 editable 选区写入剪贴板
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/reader-shortcuts.test.tsx[2m > [22m[2mReaderShortcuts —— 阅读器快捷键与滚轮缩放 [SR2-KEY-02][2m > [22m[2mctrl+c：无选区不写剪贴板（preventDefault 已发但原生空复制为 no-op——等价无害）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/reader-shortcuts.test.tsx[2m > [22m[2mReaderShortcuts —— 阅读器快捷键与滚轮缩放 [SR2-KEY-02][2m > [22m[2mctrl+c：clipboard 不可用同步抛错时动作型失败 toast（INV-02）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/reader-shortcuts.test.tsx[2m > [22m[2mReaderShortcuts —— 阅读器快捷键与滚轮缩放 [SR2-KEY-02][2m > [22m[2mctrl+c：剪贴板拒绝写入时动作型失败 toast（INV-02）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/reader-shortcuts.test.tsx[2m > [22m[2mReaderShortcuts —— 阅读器快捷键与滚轮缩放 [SR2-KEY-02][2m > [22m[2mctrl+c：剪贴板拒绝写入时动作型失败 toast（INV-02）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/reader-shortcuts.test.tsx[2m > [22m[2mReaderShortcuts —— 阅读器快捷键与滚轮缩放 [SR2-KEY-02][2m > [22m[2mctrl+滚轮：上滚放大下滚缩小并 preventDefault；无 ctrl 透传
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/reader-shortcuts.test.tsx[2m > [22m[2mReaderShortcuts —— 阅读器快捷键与滚轮缩放 [SR2-KEY-02][2m > [22m[2m卸载清理（INV-14 消费方级）：unmount 后键位与滚轮均不再触发
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/reader-shortcuts.test.tsx[2m > [22m[2mReaderShortcuts —— 阅读器快捷键与滚轮缩放 [SR2-KEY-02][2m > [22m[2m滚轮监听 add/remove 同函数成对（INV-14 配对面）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/reader-shortcuts.test.tsx[2m > [22m[2mReaderShortcuts F-03 键位迁移（滚动步+空格下滚一屏）[2m > [22m[2m空格：触发下滚一屏动作+preventDefault（统一滚动步长，阻断原生空格滚动）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+ [32m✓[39m tests/unit/renderer/reader-shortcuts.test.tsx [2m([22m[2m12 tests[22m[2m)[22m[90m 87[2mms[22m[39m
+[90mstderr[2m | tests/unit/renderer/reader-shortcuts.test.tsx[2m > [22m[2mReaderShortcuts F-03 键位迁移（滚动步+空格下滚一屏）[2m > [22m[2m空格 editable 避让（既有 keymap 层保障）：textarea 内不接管，原生输入透传
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+ [32m✓[39m tests/unit/renderer/workspace.store.test.ts [2m([22m[2m8 tests[22m[2m)[22m[90m 5[2mms[22m[39m
+[90mstderr[2m | tests/unit/renderer/workspace-switcher.test.tsx[2m > [22m[2mWorkspaceSwitcher[2m > [22m[2m展示当前课题名（store currentId 推导），未展开时下拉内容不渲染
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/workspace-switcher.test.tsx[2m > [22m[2mWorkspaceSwitcher[2m > [22m[2m展开下拉：课题列表（当前项带标记）+ 新建课题… + 管理课题
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/workspace-switcher.test.tsx[2m > [22m[2mWorkspaceSwitcher[2m > [22m[2m点其他课题：switch IPC 收 {id}（dirty=false 注入——无确认直切）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstdout[2m | tests/unit/renderer/app-shell.test.tsx
+[22m[39mWarning: Please use the `legacy` build in Node.js environments.
+
+[90mstderr[2m | tests/unit/renderer/workspace-switcher.test.tsx[2m > [22m[2mWorkspaceSwitcher[2m > [22m[2mdirty=true 且用户取消确认：不调 switch IPC
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/workspace-switcher.test.tsx[2m > [22m[2mWorkspaceSwitcher[2m > [22m[2m「管理课题」点击回调 onManage（App 跳设置页接线位）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/workspace-switcher.test.tsx[2m > [22m[2mWorkspaceSwitcher[2m > [22m[2m新建链：输入名称提交 → create 收 {name} 且 switch 收新 id
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/workspace-switcher.test.tsx[2m > [22m[2mWorkspaceSwitcher[2m > [22m[2m新建链：输入名称提交 → create 收 {name} 且 switch 收新 id
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/workspace-switcher.test.tsx[2m > [22m[2mWorkspaceSwitcher[2m > [22m[2m列表失败 error 内联呈现（非 toast）+「重试」复跑 load（回炉 W1——头注内联契约兑现）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+ [32m✓[39m tests/unit/renderer/workspace-switcher.test.tsx [2m([22m[2m7 tests[22m[2m)[22m[90m 56[2mms[22m[39m
+[90mstderr[2m | tests/unit/renderer/ai-annotation-layer.test.tsx[2m > [22m[2mverifyQuote 真：rects 渲染+data-ai-note-id+七问分色（ai-note-style 单源）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+    at AiAnnotationLayer (E:\class\智慧水务\Synapse_remake\src\renderer\features\reader\AiAnnotationLayer.tsx:21:11)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/ai-annotation-layer.test.tsx[2m > [22m[2m重锚失败（verifyQuote 假）：该段零 rects 且他段不受扰
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+    at AiAnnotationLayer (E:\class\智慧水务\Synapse_remake\src\renderer\features\reader\AiAnnotationLayer.tsx:21:11)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/ai-annotation-layer.test.tsx[2m > [22m[2m篇级/无锚行（quoteText 空）不入层
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+    at AiAnnotationLayer (E:\class\智慧水务\Synapse_remake\src\renderer\features\reader\AiAnnotationLayer.tsx:21:11)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/ai-annotation-layer.test.tsx[2m > [22m[2m点击：该段全部 rects 高亮+onJumpToNote 上抛（不弹菜单）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+    at AiAnnotationLayer (E:\class\智慧水务\Synapse_remake\src\renderer\features\reader\AiAnnotationLayer.tsx:21:11)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/ai-annotation-layer.test.tsx[2m > [22m[2m重锚缓存失效：翻页后按新页重算（anchorPage 不匹配页不渲染）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+    at AiAnnotationLayer (E:\class\智慧水务\Synapse_remake\src\renderer\features\reader\AiAnnotationLayer.tsx:21:11)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+    at AiAnnotationLayer (E:\class\智慧水务\Synapse_remake\src\renderer\features\reader\AiAnnotationLayer.tsx:21:11)
+Warning: The current testing environment is not configured to support act(...)
+
+ [32m✓[39m tests/unit/renderer/ai-annotation-layer.test.tsx [2m([22m[2m7 tests[22m[2m)[22m[90m 44[2mms[22m[39m
+ [32m✓[39m tests/unit/renderer/keymap.test.ts [2m([22m[2m12 tests[22m[2m)[22m[90m 8[2mms[22m[39m
+ [32m✓[39m tests/unit/renderer/scroll-converge.test.ts [2m([22m[2m6 tests[22m[2m)[22m[90m 46[2mms[22m[39m
+[90mstderr[2m | tests/unit/renderer/useAsync.test.tsx[2m > [22m[2museAsync —— 异步 hook [SR-HK-01][2m > [22m[2m初始不跑；run 后 loading=true，resolve 后 data 且 loading=false
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/useAsync.test.tsx[2m > [22m[2museAsync —— 异步 hook [SR-HK-01][2m > [22m[2mreject 后 error 写中文消息，loading 复位
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/useAsync.test.tsx[2m > [22m[2museAsync —— 异步 hook [SR-HK-01][2m > [22m[2m卸载后 resolve 不再 setState（无告警/无崩溃）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/useAsync.test.tsx[2m > [22m[2museAsync —— 异步 hook [SR-HK-01][2m > [22m[2m请求令牌：旧 run 的迟到失败不污染新 run 的成功态
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/useAsync.test.tsx[2m > [22m[2museAsync —— 异步 hook [SR-HK-01][2m > [22m[2m请求令牌：旧 run 的迟到成功不覆盖新 run 的 data
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+ [32m✓[39m tests/unit/renderer/useAsync.test.tsx [2m([22m[2m6 tests[22m[2m)[22m[90m 150[2mms[22m[39m
+[90mstderr[2m | tests/unit/renderer/useAsync.test.tsx[2m > [22m[2museAsync —— 异步 hook [SR-HK-01][2m > [22m[2m请求令牌：新 run 在飞时旧 run 先 settle——loading 不得被旧调用误熄
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+ [32m✓[39m tests/unit/renderer/r3-rdr-set-visual.test.tsx [2m([22m[2m3 tests[22m[2m)[22m[90m 33[2mms[22m[39m
+[90mstderr[2m | tests/unit/renderer/app-shell.test.tsx[2m > [22m[2mR3-TH1 App 壳——顶栏身份区+墨青侧栏结构锁（R2-SH2 扩面）[2m > [22m[2mnav 四入口各带 aria-hidden SVG 图标，文案与 e2e 断言面一致
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+    at TagFilter (E:\class\智慧水务\Synapse_remake\src\renderer\features\tags\TagFilter.tsx:10:11)
+    at div
+    at FilterBar (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\FilterBar.tsx:21:11)
+    at div
+    at LibraryPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\LibraryPage.tsx:26:41)
+    at ErrorBoundary (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:101:1)
+    at main
+    at div
+    at div
+    at App (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:157:49)
+Warning: The current testing environment is not configured to support act(...)
+    at FilterBar (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\FilterBar.tsx:21:11)
+    at div
+    at LibraryPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\LibraryPage.tsx:26:41)
+    at ErrorBoundary (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:101:1)
+    at main
+    at div
+    at div
+    at App (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:157:49)
+Warning: The current testing environment is not configured to support act(...)
+    at FilterBar (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\FilterBar.tsx:21:11)
+    at div
+    at LibraryPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\LibraryPage.tsx:26:41)
+    at ErrorBoundary (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:101:1)
+    at main
+    at div
+    at div
+    at App (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:157:49)
+Warning: The current testing environment is not configured to support act(...)
+    at FilterBar (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\FilterBar.tsx:21:11)
+    at div
+    at LibraryPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\LibraryPage.tsx:26:41)
+    at ErrorBoundary (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:101:1)
+    at main
+    at div
+    at div
+    at App (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:157:49)
+Warning: The current testing environment is not configured to support act(...)
+    at FilterBar (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\FilterBar.tsx:21:11)
+    at div
+    at LibraryPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\LibraryPage.tsx:26:41)
+    at ErrorBoundary (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:101:1)
+    at main
+    at div
+    at div
+    at App (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:157:49)
+Warning: The current testing environment is not configured to support act(...)
+    at PaperDetailPanel (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\PaperDetailPanel.tsx:54:11)
+    at aside
+    at div
+    at div
+    at LibraryPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\LibraryPage.tsx:26:41)
+    at ErrorBoundary (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:101:1)
+    at main
+    at div
+    at div
+    at App (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:157:49)
+Warning: The current testing environment is not configured to support act(...)
+    at PaperDetailPanel (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\PaperDetailPanel.tsx:54:11)
+    at aside
+    at div
+    at div
+    at LibraryPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\LibraryPage.tsx:26:41)
+    at ErrorBoundary (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:101:1)
+    at main
+    at div
+    at div
+    at App (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:157:49)
+Warning: The current testing environment is not configured to support act(...)
+    at LibraryPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\LibraryPage.tsx:26:41)
+    at ErrorBoundary (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:101:1)
+    at main
+    at div
+    at div
+    at App (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:157:49)
+Warning: The current testing environment is not configured to support act(...)
+    at LibraryPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\LibraryPage.tsx:26:41)
+    at ErrorBoundary (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:101:1)
+    at main
+    at div
+    at div
+    at App (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:157:49)
+Warning: The current testing environment is not configured to support act(...)
+    at LibraryPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\LibraryPage.tsx:26:41)
+    at ErrorBoundary (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:101:1)
+    at main
+    at div
+    at div
+    at App (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:157:49)
+Warning: The current testing environment is not configured to support act(...)
+    at TagFilter (E:\class\智慧水务\Synapse_remake\src\renderer\features\tags\TagFilter.tsx:10:11)
+    at div
+    at FilterBar (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\FilterBar.tsx:21:11)
+    at div
+    at LibraryPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\LibraryPage.tsx:26:41)
+    at ErrorBoundary (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:101:1)
+    at main
+    at div
+    at div
+    at App (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:157:49)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/app-shell.test.tsx[2m > [22m[2mR3-TH1 App 壳——顶栏身份区+墨青侧栏结构锁（R2-SH2 扩面）[2m > [22m[2mnav 四入口各带 aria-hidden SVG 图标，文案与 e2e 断言面一致
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/app-shell.test.tsx[2m > [22m[2mR3-TH1 App 壳——顶栏身份区+墨青侧栏结构锁（R2-SH2 扩面）[2m > [22m[2m默认视图（文献库）带 active 态类，其余入口不带
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+    at TagFilter (E:\class\智慧水务\Synapse_remake\src\renderer\features\tags\TagFilter.tsx:10:11)
+    at div
+    at FilterBar (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\FilterBar.tsx:21:11)
+    at div
+    at LibraryPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\LibraryPage.tsx:26:41)
+    at ErrorBoundary (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:101:1)
+    at main
+    at div
+    at div
+    at App (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:157:49)
+Warning: The current testing environment is not configured to support act(...)
+    at FilterBar (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\FilterBar.tsx:21:11)
+    at div
+    at LibraryPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\LibraryPage.tsx:26:41)
+    at ErrorBoundary (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:101:1)
+    at main
+    at div
+    at div
+    at App (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:157:49)
+Warning: The current testing environment is not configured to support act(...)
+    at FilterBar (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\FilterBar.tsx:21:11)
+    at div
+    at LibraryPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\LibraryPage.tsx:26:41)
+    at ErrorBoundary (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:101:1)
+    at main
+    at div
+    at div
+    at App (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:157:49)
+Warning: The current testing environment is not configured to support act(...)
+    at FilterBar (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\FilterBar.tsx:21:11)
+    at div
+    at LibraryPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\LibraryPage.tsx:26:41)
+    at ErrorBoundary (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:101:1)
+    at main
+    at div
+    at div
+    at App (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:157:49)
+Warning: The current testing environment is not configured to support act(...)
+    at FilterBar (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\FilterBar.tsx:21:11)
+    at div
+    at LibraryPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\LibraryPage.tsx:26:41)
+    at ErrorBoundary (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:101:1)
+    at main
+    at div
+    at div
+    at App (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:157:49)
+Warning: The current testing environment is not configured to support act(...)
+    at PaperDetailPanel (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\PaperDetailPanel.tsx:54:11)
+    at aside
+    at div
+    at div
+    at LibraryPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\LibraryPage.tsx:26:41)
+    at ErrorBoundary (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:101:1)
+    at main
+    at div
+    at div
+    at App (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:157:49)
+Warning: The current testing environment is not configured to support act(...)
+    at PaperDetailPanel (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\PaperDetailPanel.tsx:54:11)
+    at aside
+    at div
+    at div
+    at LibraryPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\LibraryPage.tsx:26:41)
+    at ErrorBoundary (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:101:1)
+    at main
+    at div
+    at div
+    at App (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:157:49)
+Warning: The current testing environment is not configured to support act(...)
+    at LibraryPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\LibraryPage.tsx:26:41)
+    at ErrorBoundary (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:101:1)
+    at main
+    at div
+    at div
+    at App (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:157:49)
+Warning: The current testing environment is not configured to support act(...)
+    at LibraryPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\LibraryPage.tsx:26:41)
+    at ErrorBoundary (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:101:1)
+    at main
+    at div
+    at div
+    at App (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:157:49)
+Warning: The current testing environment is not configured to support act(...)
+    at LibraryPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\LibraryPage.tsx:26:41)
+    at ErrorBoundary (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:101:1)
+    at main
+    at div
+    at div
+    at App (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:157:49)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/app-shell.test.tsx[2m > [22m[2mR3-TH1 App 壳——顶栏身份区+墨青侧栏结构锁（R2-SH2 扩面）[2m > [22m[2m默认视图（文献库）带 active 态类，其余入口不带
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/app-shell.test.tsx[2m > [22m[2mR3-TH1 App 壳——顶栏身份区+墨青侧栏结构锁（R2-SH2 扩面）[2m > [22m[2m品牌名（Synapse）与版本号在顶栏 header 内，footer（本地学术文献管理）仍在侧栏
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+    at TagFilter (E:\class\智慧水务\Synapse_remake\src\renderer\features\tags\TagFilter.tsx:10:11)
+    at div
+    at FilterBar (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\FilterBar.tsx:21:11)
+    at div
+    at LibraryPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\LibraryPage.tsx:26:41)
+    at ErrorBoundary (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:101:1)
+    at main
+    at div
+    at div
+    at App (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:157:49)
+Warning: The current testing environment is not configured to support act(...)
+    at FilterBar (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\FilterBar.tsx:21:11)
+    at div
+    at LibraryPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\LibraryPage.tsx:26:41)
+    at ErrorBoundary (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:101:1)
+    at main
+    at div
+    at div
+    at App (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:157:49)
+Warning: The current testing environment is not configured to support act(...)
+    at FilterBar (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\FilterBar.tsx:21:11)
+    at div
+    at LibraryPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\LibraryPage.tsx:26:41)
+    at ErrorBoundary (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:101:1)
+    at main
+    at div
+    at div
+    at App (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:157:49)
+Warning: The current testing environment is not configured to support act(...)
+    at FilterBar (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\FilterBar.tsx:21:11)
+    at div
+    at LibraryPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\LibraryPage.tsx:26:41)
+    at ErrorBoundary (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:101:1)
+    at main
+    at div
+    at div
+    at App (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:157:49)
+Warning: The current testing environment is not configured to support act(...)
+    at FilterBar (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\FilterBar.tsx:21:11)
+    at div
+    at LibraryPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\LibraryPage.tsx:26:41)
+    at ErrorBoundary (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:101:1)
+    at main
+    at div
+    at div
+    at App (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:157:49)
+Warning: The current testing environment is not configured to support act(...)
+    at PaperDetailPanel (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\PaperDetailPanel.tsx:54:11)
+    at aside
+    at div
+    at div
+    at LibraryPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\LibraryPage.tsx:26:41)
+    at ErrorBoundary (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:101:1)
+    at main
+    at div
+    at div
+    at App (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:157:49)
+Warning: The current testing environment is not configured to support act(...)
+    at PaperDetailPanel (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\PaperDetailPanel.tsx:54:11)
+    at aside
+    at div
+    at div
+    at LibraryPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\LibraryPage.tsx:26:41)
+    at ErrorBoundary (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:101:1)
+    at main
+    at div
+    at div
+    at App (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:157:49)
+Warning: The current testing environment is not configured to support act(...)
+    at LibraryPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\LibraryPage.tsx:26:41)
+    at ErrorBoundary (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:101:1)
+    at main
+    at div
+    at div
+    at App (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:157:49)
+Warning: The current testing environment is not configured to support act(...)
+    at LibraryPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\LibraryPage.tsx:26:41)
+    at ErrorBoundary (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:101:1)
+    at main
+    at div
+    at div
+    at App (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:157:49)
+Warning: The current testing environment is not configured to support act(...)
+    at LibraryPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\LibraryPage.tsx:26:41)
+    at ErrorBoundary (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:101:1)
+    at main
+    at div
+    at div
+    at App (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:157:49)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/app-shell.test.tsx[2m > [22m[2mR3-TH1 App 壳——顶栏身份区+墨青侧栏结构锁（R2-SH2 扩面）[2m > [22m[2m品牌名（Synapse）与版本号在顶栏 header 内，footer（本地学术文献管理）仍在侧栏
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/app-shell.test.tsx[2m > [22m[2mR3-TH1 App 壳——顶栏身份区+墨青侧栏结构锁（R2-SH2 扩面）[2m > [22m[2m顶栏身份区三件：logo svg+品牌名+课题切换器在 header 内（R2-SH2 决4）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+    at TagFilter (E:\class\智慧水务\Synapse_remake\src\renderer\features\tags\TagFilter.tsx:10:11)
+    at div
+    at FilterBar (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\FilterBar.tsx:21:11)
+    at div
+    at LibraryPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\LibraryPage.tsx:26:41)
+    at ErrorBoundary (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:101:1)
+    at main
+    at div
+    at div
+    at App (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:157:49)
+Warning: The current testing environment is not configured to support act(...)
+    at FilterBar (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\FilterBar.tsx:21:11)
+    at div
+    at LibraryPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\LibraryPage.tsx:26:41)
+    at ErrorBoundary (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:101:1)
+    at main
+    at div
+    at div
+    at App (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:157:49)
+Warning: The current testing environment is not configured to support act(...)
+    at FilterBar (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\FilterBar.tsx:21:11)
+    at div
+    at LibraryPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\LibraryPage.tsx:26:41)
+    at ErrorBoundary (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:101:1)
+    at main
+    at div
+    at div
+    at App (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:157:49)
+Warning: The current testing environment is not configured to support act(...)
+    at FilterBar (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\FilterBar.tsx:21:11)
+    at div
+    at LibraryPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\LibraryPage.tsx:26:41)
+    at ErrorBoundary (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:101:1)
+    at main
+    at div
+    at div
+    at App (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:157:49)
+Warning: The current testing environment is not configured to support act(...)
+    at FilterBar (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\FilterBar.tsx:21:11)
+    at div
+    at LibraryPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\LibraryPage.tsx:26:41)
+    at ErrorBoundary (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:101:1)
+    at main
+    at div
+    at div
+    at App (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:157:49)
+Warning: The current testing environment is not configured to support act(...)
+    at PaperDetailPanel (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\PaperDetailPanel.tsx:54:11)
+    at aside
+    at div
+    at div
+    at LibraryPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\LibraryPage.tsx:26:41)
+    at ErrorBoundary (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:101:1)
+    at main
+    at div
+    at div
+    at App (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:157:49)
+Warning: The current testing environment is not configured to support act(...)
+    at PaperDetailPanel (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\PaperDetailPanel.tsx:54:11)
+    at aside
+    at div
+    at div
+    at LibraryPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\LibraryPage.tsx:26:41)
+    at ErrorBoundary (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:101:1)
+    at main
+    at div
+    at div
+    at App (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:157:49)
+Warning: The current testing environment is not configured to support act(...)
+    at LibraryPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\LibraryPage.tsx:26:41)
+    at ErrorBoundary (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:101:1)
+    at main
+    at div
+    at div
+    at App (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:157:49)
+Warning: The current testing environment is not configured to support act(...)
+    at LibraryPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\LibraryPage.tsx:26:41)
+    at ErrorBoundary (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:101:1)
+    at main
+    at div
+    at div
+    at App (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:157:49)
+Warning: The current testing environment is not configured to support act(...)
+    at LibraryPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\LibraryPage.tsx:26:41)
+    at ErrorBoundary (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:101:1)
+    at main
+    at div
+    at div
+    at App (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:157:49)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/app-shell.test.tsx[2m > [22m[2mR3-TH1 App 壳——顶栏身份区+墨青侧栏结构锁（R2-SH2 扩面）[2m > [22m[2m顶栏身份区三件：logo svg+品牌名+课题切换器在 header 内（R2-SH2 决4）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/app-shell.test.tsx[2m > [22m[2mR3-TH1 App 壳——顶栏身份区+墨青侧栏结构锁（R2-SH2 扩面）[2m > [22m[2m侧栏品牌行退役（负锚）：app-nav-brand/app-nav-name 零残留
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+    at TagFilter (E:\class\智慧水务\Synapse_remake\src\renderer\features\tags\TagFilter.tsx:10:11)
+    at div
+    at FilterBar (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\FilterBar.tsx:21:11)
+    at div
+    at LibraryPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\LibraryPage.tsx:26:41)
+    at ErrorBoundary (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:101:1)
+    at main
+    at div
+    at div
+    at App (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:157:49)
+Warning: The current testing environment is not configured to support act(...)
+    at FilterBar (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\FilterBar.tsx:21:11)
+    at div
+    at LibraryPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\LibraryPage.tsx:26:41)
+    at ErrorBoundary (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:101:1)
+    at main
+    at div
+    at div
+    at App (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:157:49)
+Warning: The current testing environment is not configured to support act(...)
+    at FilterBar (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\FilterBar.tsx:21:11)
+    at div
+    at LibraryPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\LibraryPage.tsx:26:41)
+    at ErrorBoundary (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:101:1)
+    at main
+    at div
+    at div
+    at App (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:157:49)
+Warning: The current testing environment is not configured to support act(...)
+    at FilterBar (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\FilterBar.tsx:21:11)
+    at div
+    at LibraryPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\LibraryPage.tsx:26:41)
+    at ErrorBoundary (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:101:1)
+    at main
+    at div
+    at div
+    at App (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:157:49)
+Warning: The current testing environment is not configured to support act(...)
+    at FilterBar (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\FilterBar.tsx:21:11)
+    at div
+    at LibraryPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\LibraryPage.tsx:26:41)
+    at ErrorBoundary (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:101:1)
+    at main
+    at div
+    at div
+    at App (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:157:49)
+Warning: The current testing environment is not configured to support act(...)
+    at PaperDetailPanel (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\PaperDetailPanel.tsx:54:11)
+    at aside
+    at div
+    at div
+    at LibraryPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\LibraryPage.tsx:26:41)
+    at ErrorBoundary (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:101:1)
+    at main
+    at div
+    at div
+    at App (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:157:49)
+Warning: The current testing environment is not configured to support act(...)
+    at PaperDetailPanel (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\PaperDetailPanel.tsx:54:11)
+    at aside
+    at div
+    at div
+    at LibraryPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\LibraryPage.tsx:26:41)
+    at ErrorBoundary (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:101:1)
+    at main
+    at div
+    at div
+    at App (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:157:49)
+Warning: The current testing environment is not configured to support act(...)
+    at LibraryPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\LibraryPage.tsx:26:41)
+    at ErrorBoundary (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:101:1)
+    at main
+    at div
+    at div
+    at App (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:157:49)
+Warning: The current testing environment is not configured to support act(...)
+    at LibraryPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\LibraryPage.tsx:26:41)
+    at ErrorBoundary (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:101:1)
+    at main
+    at div
+    at div
+    at App (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:157:49)
+Warning: The current testing environment is not configured to support act(...)
+    at LibraryPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\LibraryPage.tsx:26:41)
+    at ErrorBoundary (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:101:1)
+    at main
+    at div
+    at div
+    at App (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:157:49)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/app-shell.test.tsx[2m > [22m[2mR3-TH1 App 壳——顶栏身份区+墨青侧栏结构锁（R2-SH2 扩面）[2m > [22m[2m侧栏品牌行退役（负锚）：app-nav-brand/app-nav-name 零残留
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/app-shell.test.tsx[2m > [22m[2mR2-SET1 界面缩放——App 挂载 load+--ui-scale 变量（数据通道单点）[2m > [22m[2msettings.uiScale=medium：挂载后 documentElement --ui-scale=1.1
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+    at TagFilter (E:\class\智慧水务\Synapse_remake\src\renderer\features\tags\TagFilter.tsx:10:11)
+    at div
+    at FilterBar (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\FilterBar.tsx:21:11)
+    at div
+    at LibraryPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\LibraryPage.tsx:26:41)
+    at ErrorBoundary (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:101:1)
+    at main
+    at div
+    at div
+    at App (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:157:49)
+Warning: The current testing environment is not configured to support act(...)
+    at FilterBar (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\FilterBar.tsx:21:11)
+    at div
+    at LibraryPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\LibraryPage.tsx:26:41)
+    at ErrorBoundary (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:101:1)
+    at main
+    at div
+    at div
+    at App (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:157:49)
+Warning: The current testing environment is not configured to support act(...)
+    at FilterBar (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\FilterBar.tsx:21:11)
+    at div
+    at LibraryPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\LibraryPage.tsx:26:41)
+    at ErrorBoundary (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:101:1)
+    at main
+    at div
+    at div
+    at App (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:157:49)
+Warning: The current testing environment is not configured to support act(...)
+    at FilterBar (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\FilterBar.tsx:21:11)
+    at div
+    at LibraryPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\LibraryPage.tsx:26:41)
+    at ErrorBoundary (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:101:1)
+    at main
+    at div
+    at div
+    at App (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:157:49)
+Warning: The current testing environment is not configured to support act(...)
+    at FilterBar (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\FilterBar.tsx:21:11)
+    at div
+    at LibraryPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\LibraryPage.tsx:26:41)
+    at ErrorBoundary (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:101:1)
+    at main
+    at div
+    at div
+    at App (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:157:49)
+Warning: The current testing environment is not configured to support act(...)
+    at PaperDetailPanel (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\PaperDetailPanel.tsx:54:11)
+    at aside
+    at div
+    at div
+    at LibraryPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\LibraryPage.tsx:26:41)
+    at ErrorBoundary (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:101:1)
+    at main
+    at div
+    at div
+    at App (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:157:49)
+Warning: The current testing environment is not configured to support act(...)
+    at PaperDetailPanel (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\PaperDetailPanel.tsx:54:11)
+    at aside
+    at div
+    at div
+    at LibraryPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\LibraryPage.tsx:26:41)
+    at ErrorBoundary (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:101:1)
+    at main
+    at div
+    at div
+    at App (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:157:49)
+Warning: The current testing environment is not configured to support act(...)
+    at LibraryPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\LibraryPage.tsx:26:41)
+    at ErrorBoundary (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:101:1)
+    at main
+    at div
+    at div
+    at App (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:157:49)
+Warning: The current testing environment is not configured to support act(...)
+    at LibraryPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\LibraryPage.tsx:26:41)
+    at ErrorBoundary (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:101:1)
+    at main
+    at div
+    at div
+    at App (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:157:49)
+Warning: The current testing environment is not configured to support act(...)
+    at LibraryPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\LibraryPage.tsx:26:41)
+    at ErrorBoundary (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:101:1)
+    at main
+    at div
+    at div
+    at App (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:157:49)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/app-shell.test.tsx[2m > [22m[2mR2-SET1 界面缩放——App 挂载 load+--ui-scale 变量（数据通道单点）[2m > [22m[2msettings.uiScale=medium：挂载后 documentElement --ui-scale=1.1
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/app-shell.test.tsx[2m > [22m[2mR2-SET1 界面缩放——App 挂载 load+--ui-scale 变量（数据通道单点）[2m > [22m[2m默认 small=1；save({uiScale:large}) 落地后变量更新 1.25（变化沿）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+    at TagFilter (E:\class\智慧水务\Synapse_remake\src\renderer\features\tags\TagFilter.tsx:10:11)
+    at div
+    at FilterBar (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\FilterBar.tsx:21:11)
+    at div
+    at LibraryPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\LibraryPage.tsx:26:41)
+    at ErrorBoundary (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:101:1)
+    at main
+    at div
+    at div
+    at App (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:157:49)
+Warning: The current testing environment is not configured to support act(...)
+    at FilterBar (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\FilterBar.tsx:21:11)
+    at div
+    at LibraryPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\LibraryPage.tsx:26:41)
+    at ErrorBoundary (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:101:1)
+    at main
+    at div
+    at div
+    at App (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:157:49)
+Warning: The current testing environment is not configured to support act(...)
+    at FilterBar (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\FilterBar.tsx:21:11)
+    at div
+    at LibraryPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\LibraryPage.tsx:26:41)
+    at ErrorBoundary (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:101:1)
+    at main
+    at div
+    at div
+    at App (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:157:49)
+Warning: The current testing environment is not configured to support act(...)
+    at FilterBar (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\FilterBar.tsx:21:11)
+    at div
+    at LibraryPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\LibraryPage.tsx:26:41)
+    at ErrorBoundary (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:101:1)
+    at main
+    at div
+    at div
+    at App (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:157:49)
+Warning: The current testing environment is not configured to support act(...)
+    at FilterBar (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\FilterBar.tsx:21:11)
+    at div
+    at LibraryPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\LibraryPage.tsx:26:41)
+    at ErrorBoundary (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:101:1)
+    at main
+    at div
+    at div
+    at App (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:157:49)
+Warning: The current testing environment is not configured to support act(...)
+    at PaperDetailPanel (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\PaperDetailPanel.tsx:54:11)
+    at aside
+    at div
+    at div
+    at LibraryPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\LibraryPage.tsx:26:41)
+    at ErrorBoundary (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:101:1)
+    at main
+    at div
+    at div
+    at App (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:157:49)
+Warning: The current testing environment is not configured to support act(...)
+    at PaperDetailPanel (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\PaperDetailPanel.tsx:54:11)
+    at aside
+    at div
+    at div
+    at LibraryPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\LibraryPage.tsx:26:41)
+    at ErrorBoundary (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:101:1)
+    at main
+    at div
+    at div
+    at App (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:157:49)
+Warning: The current testing environment is not configured to support act(...)
+    at LibraryPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\LibraryPage.tsx:26:41)
+    at ErrorBoundary (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:101:1)
+    at main
+    at div
+    at div
+    at App (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:157:49)
+Warning: The current testing environment is not configured to support act(...)
+    at LibraryPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\LibraryPage.tsx:26:41)
+    at ErrorBoundary (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:101:1)
+    at main
+    at div
+    at div
+    at App (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:157:49)
+Warning: The current testing environment is not configured to support act(...)
+    at LibraryPage (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\LibraryPage.tsx:26:41)
+    at ErrorBoundary (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:101:1)
+    at main
+    at div
+    at div
+    at App (E:\class\智慧水务\Synapse_remake\src\renderer\app\App.tsx:157:49)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/app-shell.test.tsx[2m > [22m[2mR2-SET1 界面缩放——App 挂载 load+--ui-scale 变量（数据通道单点）[2m > [22m[2m默认 small=1；save({uiScale:large}) 落地后变量更新 1.25（变化沿）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+ [32m✓[39m tests/unit/renderer/app-shell.test.tsx [2m([22m[2m7 tests[22m[2m)[22m[90m 143[2mms[22m[39m
+[90mstderr[2m | tests/unit/renderer/outline-aside.test.tsx[2m > [22m[2mOutlineAside —— 三栏宿主 [SR2-C-04][2m > [22m[2m三项 tablist（目录/缩略图/笔记）；切换到笔记 tab 挂 ReaderNotesPanel；OutlinePanel 常驻（状态不丢）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+    at OutlinePanel (E:\class\智慧水务\Synapse_remake\src\renderer\features\reader\OutlinePanel.tsx:13:11)
+    at div
+    at div
+    at aside
+    at OutlineAside (E:\class\智慧水务\Synapse_remake\src\renderer\features\reader\OutlineAside.tsx:17:11)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/outline-aside.test.tsx[2m > [22m[2mOutlineAside —— 三栏宿主 [SR2-C-04][2m > [22m[2m目录跳页经 reader.store（props 削减后自取）：点击目录项→setPage
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+    at OutlinePanel (E:\class\智慧水务\Synapse_remake\src\renderer\features\reader\OutlinePanel.tsx:13:11)
+    at div
+    at div
+    at aside
+    at OutlineAside (E:\class\智慧水务\Synapse_remake\src\renderer\features\reader\OutlineAside.tsx:17:11)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/outline-aside.test.tsx[2m > [22m[2mOutlineAside —— 三栏宿主 [SR2-C-04][2m > [22m[2m目录跳页经 reader.store（props 削减后自取）：点击目录项→setPage
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/outline-aside.test.tsx[2m > [22m[2mOutlineAside —— 三栏宿主 [SR2-C-04][2m > [22m[2m目录跳页经 reader.store（props 削减后自取）：点击目录项→setPage
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/outline-aside.test.tsx[2m > [22m[2mOutlineAside —— 三栏宿主 [SR2-C-04][2m > [22m[2m片段单击页级定位（C-05 前接缝）：FragmentNotesList 条目点击→setPage(该标注页)
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+    at OutlinePanel (E:\class\智慧水务\Synapse_remake\src\renderer\features\reader\OutlinePanel.tsx:13:11)
+    at div
+    at div
+    at aside
+    at OutlineAside (E:\class\智慧水务\Synapse_remake\src\renderer\features\reader\OutlineAside.tsx:17:11)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/outline-aside.test.tsx[2m > [22m[2mOutlineAside —— 三栏宿主 [SR2-C-04][2m > [22m[2m空态：activeId=null 时笔记 tab 显示引导（不崩）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+ [32m✓[39m tests/unit/renderer/outline-aside.test.tsx [2m([22m[2m4 tests[22m[2m)[22m[90m 84[2mms[22m[39m
+[90mstderr[2m | tests/unit/renderer/paper-detail-export.test.tsx[2m > [22m[2mPaperDetailPanel —— BibTeX 导出入口（主链接线修复） [SR-LIB-04][2m > [22m[2m入口存在：详情加载后渲染「导出 BibTeX」按钮
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+    at PaperDetailPanel (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\PaperDetailPanel.tsx:54:11)
+Warning: The current testing environment is not configured to support act(...)
+    at PaperDetailPanel (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\PaperDetailPanel.tsx:54:11)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+    at TagEditor (E:\class\智慧水务\Synapse_remake\src\renderer\features\tags\TagEditor.tsx:13:11)
+    at div
+    at PaperDetailPanel (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\PaperDetailPanel.tsx:54:11)
+
+[90mstderr[2m | tests/unit/renderer/paper-detail-export.test.tsx[2m > [22m[2mPaperDetailPanel —— BibTeX 导出入口（主链接线修复） [SR-LIB-04][2m > [22m[2m入口存在：详情加载后渲染「导出 BibTeX」按钮
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/paper-detail-export.test.tsx[2m > [22m[2mPaperDetailPanel —— BibTeX 导出入口（主链接线修复） [SR-LIB-04][2m > [22m[2m点击导出：经 api.export_.bibtex 以当前文献 id 调用，成功 toast 含条数与路径
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+    at PaperDetailPanel (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\PaperDetailPanel.tsx:54:11)
+Warning: The current testing environment is not configured to support act(...)
+    at PaperDetailPanel (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\PaperDetailPanel.tsx:54:11)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+    at TagEditor (E:\class\智慧水务\Synapse_remake\src\renderer\features\tags\TagEditor.tsx:13:11)
+    at div
+    at PaperDetailPanel (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\PaperDetailPanel.tsx:54:11)
+
+[90mstderr[2m | tests/unit/renderer/paper-detail-export.test.tsx[2m > [22m[2mPaperDetailPanel —— BibTeX 导出入口（主链接线修复） [SR-LIB-04][2m > [22m[2m点击导出：经 api.export_.bibtex 以当前文献 id 调用，成功 toast 含条数与路径
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/paper-detail-export.test.tsx[2m > [22m[2mPaperDetailPanel —— BibTeX 导出入口（主链接线修复） [SR-LIB-04][2m > [22m[2m取消导出（CANCELLED）：动作型失败 toast 可见，不静默（INV-02）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+    at PaperDetailPanel (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\PaperDetailPanel.tsx:54:11)
+Warning: The current testing environment is not configured to support act(...)
+    at PaperDetailPanel (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\PaperDetailPanel.tsx:54:11)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+    at TagEditor (E:\class\智慧水务\Synapse_remake\src\renderer\features\tags\TagEditor.tsx:13:11)
+    at div
+    at PaperDetailPanel (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\PaperDetailPanel.tsx:54:11)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/paper-detail-export.test.tsx[2m > [22m[2mPaperDetailPanel —— BibTeX 导出入口（主链接线修复） [SR-LIB-04][2m > [22m[2m取消导出（CANCELLED）：动作型失败 toast 可见，不静默（INV-02）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+ [32m✓[39m tests/unit/renderer/paper-detail-export.test.tsx [2m([22m[2m3 tests[22m[2m)[22m[90m 63[2mms[22m[39m
+[90mstderr[2m | tests/unit/renderer/paper-detail-notes-off.test.tsx[2m > [22m[2mPaperDetailPanel —— 库侧编辑面下线 [SR2-C-06][2m > [22m[2m旧编辑面移除：无「打开笔记」按钮、无 NotesPanel 挂载面
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+    at PaperDetailPanel (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\PaperDetailPanel.tsx:54:11)
+Warning: The current testing environment is not configured to support act(...)
+    at PaperDetailPanel (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\PaperDetailPanel.tsx:54:11)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+    at TagEditor (E:\class\智慧水务\Synapse_remake\src\renderer\features\tags\TagEditor.tsx:13:11)
+    at div
+    at PaperDetailPanel (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\PaperDetailPanel.tsx:54:11)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/paper-detail-notes-off.test.tsx[2m > [22m[2mPaperDetailPanel —— 库侧编辑面下线 [SR2-C-06][2m > [22m[2m替代入口：点击「去阅读器写笔记」→ open-paper-bus 总线事件（paperId 载荷）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+    at PaperDetailPanel (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\PaperDetailPanel.tsx:54:11)
+Warning: The current testing environment is not configured to support act(...)
+    at PaperDetailPanel (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\PaperDetailPanel.tsx:54:11)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+    at TagEditor (E:\class\智慧水务\Synapse_remake\src\renderer\features\tags\TagEditor.tsx:13:11)
+    at div
+    at PaperDetailPanel (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\PaperDetailPanel.tsx:54:11)
+
+[90mstderr[2m | tests/unit/renderer/paper-detail-notes-off.test.tsx[2m > [22m[2mPaperDetailPanel —— 库侧编辑面下线 [SR2-C-06][2m > [22m[2m替代入口：点击「去阅读器写笔记」→ open-paper-bus 总线事件（paperId 载荷）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/paper-detail-notes-off.test.tsx[2m > [22m[2mPaperDetailPanel —— 库侧编辑面下线 [SR2-C-06][2m > [22m[2m导出面不受影响：三可见入口（报告/BibTeX/语料 md）+DOI 隐藏负向断言
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+    at PaperDetailPanel (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\PaperDetailPanel.tsx:54:11)
+Warning: The current testing environment is not configured to support act(...)
+    at PaperDetailPanel (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\PaperDetailPanel.tsx:54:11)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+    at TagEditor (E:\class\智慧水务\Synapse_remake\src\renderer\features\tags\TagEditor.tsx:13:11)
+    at div
+    at PaperDetailPanel (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\PaperDetailPanel.tsx:54:11)
+Warning: The current testing environment is not configured to support act(...)
+
+ [32m✓[39m tests/unit/renderer/paper-detail-notes-off.test.tsx [2m([22m[2m3 tests[22m[2m)[22m[90m 52[2mms[22m[39m
+[90mstdout[2m | tests/unit/renderer/reader-page-open-race.test.tsx
+[22m[39mWarning: Please use the `legacy` build in Node.js environments.
+
+[90mstdout[2m | tests/unit/renderer/app-quit-dirty.test.tsx
+[22m[39mWarning: Please use the `legacy` build in Node.js environments.
+
+[90mstderr[2m | tests/unit/renderer/reader-page-open-race.test.tsx[2m > [22m[2mReaderPage 挂载时序 —— 打开请求消费 vs 监听器注册（sr2-lg-08）[2m > [22m[2m竞态红证：带锚闩锁+tab 缺席 → 挂载效应内 waitOpen 重发的事件②被自身 handler 接住（openPaper 被调）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/reader-page-open-race.test.tsx[2m > [22m[2mReaderPage 挂载时序 —— 打开请求消费 vs 监听器注册（sr2-lg-08）[2m > [22m[2m竞态红证：带锚闩锁+tab 缺席 → 挂载效应内 waitOpen 重发的事件②被自身 handler 接住（openPaper 被调）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/reader-page-open-race.test.tsx[2m > [22m[2mReaderPage 挂载时序 —— 打开请求消费 vs 监听器注册（sr2-lg-08）[2m > [22m[2m无锚请求回归锁：挂载闩锁补读 → openFromBus 无锚分支直接 openPaper（不依赖监听器顺序）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/reader-page-open-race.test.tsx[2m > [22m[2mReaderPage 挂载时序 —— 打开请求消费 vs 监听器注册（sr2-lg-08）[2m > [22m[2m无锚请求回归锁：挂载闩锁补读 → openFromBus 无锚分支直接 openPaper（不依赖监听器顺序）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+ [32m✓[39m tests/unit/renderer/reader-page-open-race.test.tsx [2m([22m[2m2 tests[22m[2m)[22m[90m 24[2mms[22m[39m
+ [32m✓[39m tests/unit/renderer/lineage-layout.test.ts [2m([22m[2m30 tests[22m[2m)[22m[90m 10[2mms[22m[39m
+[90mstderr[2m | tests/unit/renderer/annotation-menu.test.tsx[2m > [22m[2mAnnotationMenu —— 标注四选项菜单 [SR2-ANNO-01][2m > [22m[2m渲染四选项与菜单锚点 testid
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/annotation-menu.test.tsx[2m > [22m[2mAnnotationMenu —— 标注四选项菜单 [SR2-ANNO-01][2m > [22m[2m四出口回调：各按钮点击各触发对应回调一次
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/annotation-menu.test.tsx[2m > [22m[2mAnnotationMenu —— 标注四选项菜单 [SR2-ANNO-01][2m > [22m[2mbusy 期间四按钮禁用且点击不触发回调
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/annotation-menu.test.tsx[2m > [22m[2mAnnotationMenu —— 标注四选项菜单 [SR2-ANNO-01][2m > [22m[2m定位：贴命中矩形左下沿，右缘越界时左沿夹取（55%），不越界时按矩形原位
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+ [32m✓[39m tests/unit/renderer/annotation-menu.test.tsx [2m([22m[2m4 tests[22m[2m)[22m[90m 39[2mms[22m[39m
+[90mstderr[2m | tests/unit/renderer/app-quit-dirty.test.tsx[2m > [22m[2mApp 组合根 —— hook 链稳定性（P7-C 崩溃回归锁）[2m > [22m[2mtab dirty false→true 翻转（notes pending 沿）无 fewer-hooks 错位且 dirty 仍上报
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+ [32m✓[39m tests/unit/renderer/app-quit-dirty.test.tsx [2m([22m[2m1 test[22m[2m)[22m[90m 56[2mms[22m[39m
+ [32m✓[39m tests/unit/services/ai-sensor.service.test.ts [2m([22m[2m12 tests[22m[2m)[22m[90m 115[2mms[22m[39m
+ [32m✓[39m tests/unit/services/corpus.assemble.test.ts [2m([22m[2m20 tests[22m[2m)[22m[90m 15[2mms[22m[39m
+ [32m✓[39m tests/unit/renderer/annotation-undo.test.ts [2m([22m[2m15 tests[22m[2m)[22m[33m 401[2mms[22m[39m
+ [32m✓[39m tests/unit/services/lineage-import.test.ts [2m([22m[2m28 tests[22m[2m)[22m[90m 143[2mms[22m[39m
+ [32m✓[39m tests/unit/db/repos/papers.repo.test.ts [2m([22m[2m23 tests[22m[2m)[22m[90m 101[2mms[22m[39m
+ [32m✓[39m tests/unit/renderer/notes.store.test.ts [2m([22m[2m14 tests[22m[2m)[22m[33m 1231[2mms[22m[39m
+   [33m[2m✓[22m[39m notes.store —— 防抖自动保存 [SR-NOTE-02][2m > [22m固定种子伪随机交错攻击：草稿正文恒等于最后一条用户输入；savedAt 单调 [33m344[2mms[22m[39m
+ [31m❯[39m tests/unit/renderer/annotation-merge.test.ts [2m([22m[2m13 tests[22m[2m | [22m[31m1 failed[39m[2m)[22m[90m 8[2mms[22m[39m
+[31m   [31m×[31m F-A1 mergeRects —— 归一化域归并器[2m > [22m⑪ INV-40 边界修复（F-A4 行高感知）：紧行距中心距 ≤ 输入块高/2（旧路径误并）但 > PDF 行高/2 → lineH 传入不并簇；缺省旧行为存档[90m 4[2mms[22m[31m[39m
+[31m     → expected 1 to be 2 // Object.is equality[39m
+ [32m✓[39m tests/unit/services/enrich.service.test.ts [2m([22m[2m8 tests[22m[2m)[22m[90m 6[2mms[22m[39m
+ [32m✓[39m tests/unit/renderer/reader.store.test.ts [2m([22m[2m26 tests[22m[2m)[22m[33m 1572[2mms[22m[39m
+   [33m[2m✓[22m[39m reader.store —— per-tab 多文献状态（tab 生命周期+竞态守卫） [SR2-TABS-01][2m > [22mopenPaper：新建 loading tab→ready，写入 fileUrl/fileName/lastReadPage 并加载标注 [33m358[2mms[22m[39m
+ [32m✓[39m tests/unit/tools/companion.test.ts [2m([22m[2m8 tests[22m[2m)[22m[33m 1025[2mms[22m[39m
+ [32m✓[39m tests/unit/renderer/theme.test.ts [2m([22m[2m47 tests[22m[2m)[22m[90m 6[2mms[22m[39m
+ [32m✓[39m tests/unit/services/corpus.export.test.ts [2m([22m[2m12 tests[22m[2m)[22m[33m 411[2mms[22m[39m
+ [32m✓[39m tests/unit/renderer/annotation-layer.test.tsx [2m([22m[2m2 tests[22m[2m)[22m[90m 26[2mms[22m[39m
+ [32m✓[39m tests/unit/services/zcode-link.service.test.ts [2m([22m[2m13 tests[22m[2m)[22m[90m 126[2mms[22m[39m
+ [32m✓[39m tests/unit/services/workspace.test.ts [2m([22m[2m14 tests[22m[2m)[22m[33m 768[2mms[22m[39m
+ [32m✓[39m tests/unit/renderer/edge-label-layout.test.ts [2m([22m[2m9 tests[22m[2m)[22m[90m 4[2mms[22m[39m
+ [32m✓[39m tests/unit/main/migrate-user-data.test.ts [2m([22m[2m5 tests[22m[2m)[22m[90m 31[2mms[22m[39m
+ [32m✓[39m tests/unit/services/import.service.test.ts [2m([22m[2m5 tests[22m[2m)[22m[90m 127[2mms[22m[39m
+ [32m✓[39m tests/unit/windows/window-control.test.ts [2m([22m[2m9 tests[22m[2m)[22m[90m 4[2mms[22m[39m
+ [32m✓[39m tests/unit/renderer/settings.store.test.ts [2m([22m[2m7 tests[22m[2m)[22m[90m 218[2mms[22m[39m
+ [32m✓[39m tests/unit/services/ai-notes-import.test.ts [2m([22m[2m10 tests[22m[2m)[22m[90m 182[2mms[22m[39m
+ [32m✓[39m tests/unit/renderer/lineage-viewport-scale.test.ts [2m([22m[2m7 tests[22m[2m)[22m[90m 6[2mms[22m[39m
+ [32m✓[39m tests/unit/db/repos/ai_notes.repo.test.ts [2m([22m[2m8 tests[22m[2m)[22m[90m 58[2mms[22m[39m
+ [32m✓[39m tests/unit/tools/queue.test.ts [2m([22m[2m6 tests[22m[2m)[22m[90m 5[2mms[22m[39m
+ [32m✓[39m tests/contracts/api-surface.test.ts [2m([22m[2m6 tests[22m[2m)[22m[90m 10[2mms[22m[39m
+ [32m✓[39m tests/unit/services/file-store.test.ts [2m([22m[2m9 tests[22m[2m)[22m[90m 51[2mms[22m[39m
+ [32m✓[39m tests/contracts/preload-surface.test.ts [2m([22m[2m5 tests[22m[2m)[22m[90m 4[2mms[22m[39m
+[90mstderr[2m | tests/unit/renderer/paper-detail-cited.test.tsx[2m > [22m[2mSR2-ENR-03 PaperDetailPanel —— 被引数透出（always-active）[2m > [22m[2m有值：citedByCount=124 → 「被引」行渲染「124」（真实文本断言）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+    at PaperDetailPanel (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\PaperDetailPanel.tsx:54:11)
+Warning: The current testing environment is not configured to support act(...)
+    at PaperDetailPanel (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\PaperDetailPanel.tsx:54:11)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+    at TagEditor (E:\class\智慧水务\Synapse_remake\src\renderer\features\tags\TagEditor.tsx:13:11)
+    at div
+    at PaperDetailPanel (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\PaperDetailPanel.tsx:54:11)
+
+[90mstderr[2m | tests/unit/renderer/paper-detail-cited.test.tsx[2m > [22m[2mSR2-ENR-03 PaperDetailPanel —— 被引数透出（always-active）[2m > [22m[2m有值：citedByCount=124 → 「被引」行渲染「124」（真实文本断言）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/paper-detail-cited.test.tsx[2m > [22m[2mSR2-ENR-03 PaperDetailPanel —— 被引数透出（always-active）[2m > [22m[2m缺省：无 citedByCount 字段 → 「被引」行渲染占位符（—）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+    at PaperDetailPanel (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\PaperDetailPanel.tsx:54:11)
+Warning: The current testing environment is not configured to support act(...)
+    at PaperDetailPanel (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\PaperDetailPanel.tsx:54:11)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+    at TagEditor (E:\class\智慧水务\Synapse_remake\src\renderer\features\tags\TagEditor.tsx:13:11)
+    at div
+    at PaperDetailPanel (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\PaperDetailPanel.tsx:54:11)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/paper-detail-cited.test.tsx[2m > [22m[2mSR2-ENR-03 PaperDetailPanel —— 被引数透出（always-active）[2m > [22m[2m零值：citedByCount=0 → 渲染「0」而非占位符（=== undefined 判空边界）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+    at PaperDetailPanel (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\PaperDetailPanel.tsx:54:11)
+Warning: The current testing environment is not configured to support act(...)
+    at PaperDetailPanel (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\PaperDetailPanel.tsx:54:11)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+    at TagEditor (E:\class\智慧水务\Synapse_remake\src\renderer\features\tags\TagEditor.tsx:13:11)
+    at div
+    at PaperDetailPanel (E:\class\智慧水务\Synapse_remake\src\renderer\features\library\PaperDetailPanel.tsx:54:11)
+Warning: The current testing environment is not configured to support act(...)
+
+ [32m✓[39m tests/unit/renderer/paper-detail-cited.test.tsx [2m([22m[2m3 tests[22m[2m)[22m[90m 51[2mms[22m[39m
+ [32m✓[39m tests/unit/renderer/lineage-classify.test.ts [2m([22m[2m8 tests[22m[2m)[22m[90m 3[2mms[22m[39m
+ [32m✓[39m tests/unit/renderer/library.store.test.ts [2m([22m[2m6 tests[22m[2m)[22m[90m 243[2mms[22m[39m
+ [32m✓[39m tests/unit/db/migrate.test.ts [2m([22m[2m7 tests[22m[2m)[22m[90m 51[2mms[22m[39m
+ [32m✓[39m tests/unit/ipc/settings.test.ts [2m([22m[2m6 tests[22m[2m)[22m[90m 39[2mms[22m[39m
+ [32m✓[39m tests/unit/windows/quit-dirty-guard.test.ts [2m([22m[2m7 tests[22m[2m)[22m[90m 4[2mms[22m[39m
+[90mstderr[2m | tests/unit/renderer/toast.test.tsx[2m > [22m[2mToast —— 去重语义（message+kind） [SR-UI-03][2m > [22m[2m同文案同 kind 窗口内去重：连弹两次只出一张卡
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+[90mstderr[2m | tests/unit/renderer/toast.test.tsx[2m > [22m[2mToast —— 去重语义（message+kind） [SR-UI-03][2m > [22m[2mA→B→A 穿插序列：第二条 A 仍被拦截（单槽记忆的漏洞）
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+ [32m✓[39m tests/unit/services/providers/crossref.test.ts [2m([22m[2m5 tests[22m[2m)[22m[90m 8[2mms[22m[39m
+[90mstderr[2m | tests/unit/renderer/toast.test.tsx[2m > [22m[2mToast —— 去重语义（message+kind） [SR-UI-03][2m > [22m[2m同文案不同 kind 不互吞：info 与 error 各自展示
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+ [32m✓[39m tests/unit/renderer/toast.test.tsx [2m([22m[2m3 tests[22m[2m)[22m[90m 107[2mms[22m[39m
+[90mstderr[2m | tests/unit/renderer/useDebounce.test.tsx[2m > [22m[2museDebounce —— 防抖值 [SR-HK-02][2m > [22m[2m延迟内多次变化只取最后值
+[22m[39mWarning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+Warning: The current testing environment is not configured to support act(...)
+
+ [32m✓[39m tests/unit/renderer/useDebounce.test.tsx [2m([22m[2m1 test[22m[2m)[22m[90m 24[2mms[22m[39m
+[90mstderr[2m | tests/unit/renderer/corpus-extractor.test.ts[2m > [22m[2mCorpusExtractor —— 全文/图提取器（四态迁移+背压+裁剪数学） [SR2-AI-02][2m > [22m[2mdestroy 失败不阻断：complete 已上报（尽力而为面）
+[22m[39mCorpusExtractor destroy 失败（已忽略） Error: destroy 失败（尽力而为面）
+    at Object.destroy [90m(E:\class\智慧水务\Synapse_remake\[39mtests\unit\renderer\corpus-extractor.test.ts:49:48[90m)[39m
+    at runExtraction [90m(E:\class\智慧水务\Synapse_remake\[39msrc\renderer\features\reader\CorpusExtractor.ts:259:21[90m)[39m
+
+ [32m✓[39m tests/unit/db/repos/annotations.repo.test.ts [2m([22m[2m7 tests[22m[2m)[22m[90m 54[2mms[22m[39m
+ [32m✓[39m tests/unit/db/repos/notes.repo.test.ts [2m([22m[2m4 tests[22m[2m)[22m[90m 50[2mms[22m[39m
+ [32m✓[39m tests/unit/services/reader.service.test.ts [2m([22m[2m4 tests[22m[2m)[22m[90m 4[2mms[22m[39m
+ [32m✓[39m tests/unit/http/http-client.test.ts [2m([22m[2m10 tests[22m[2m)[22m[33m 1025[2mms[22m[39m
+   [33m[2m✓[22m[39m http-client —— host 白名单与超时退避[2m > [22m429 先重试：第二次成功则整体成功；maxRetries=0 直接 RATE_LIMITED [33m504[2mms[22m[39m
+   [33m[2m✓[22m[39m http-client —— host 白名单与超时退避[2m > [22m网络错误（连接拒绝）重试后抛 NETWORK_ERROR [33m512[2mms[22m[39m
+ [32m✓[39m tests/unit/shared/annotation-order.test.ts [2m([22m[2m6 tests[22m[2m)[22m[90m 3[2mms[22m[39m
+[90mstderr[2m | tests/unit/renderer/corpus-extractor.test.ts[2m > [22m[2mCorpusExtractor —— 全文/图提取器（四态迁移+背压+裁剪数学） [SR2-AI-02][2m > [22m[2m在途收第二请求：忽略（防御分支——main 编排保证串行）
+[22m[39mCorpusExtractor 忽略在途期间的 extract-request s-2
+
+ [32m✓[39m tests/unit/services/cited-by.test.ts [2m([22m[2m9 tests[22m[2m)[22m[90m 3[2mms[22m[39m
+ [32m✓[39m tests/unit/ipc/export_.test.ts [2m([22m[2m4 tests[22m[2m)[22m[90m 4[2mms[22m[39m
+ [32m✓[39m tests/unit/db/repos/lineage.repo.order.test.ts [2m([22m[2m2 tests[22m[2m)[22m[90m 45[2mms[22m[39m
+ [32m✓[39m tests/unit/renderer/reader-store-undo-race.test.ts [2m([22m[2m1 test[22m[2m)[22m[90m 79[2mms[22m[39m
+ [32m✓[39m tests/unit/services/providers/openalex.test.ts [2m([22m[2m5 tests[22m[2m)[22m[90m 7[2mms[22m[39m
+ [32m✓[39m tests/unit/db/repos/ai_notes.repo.order.test.ts [2m([22m[2m2 tests[22m[2m)[22m[90m 44[2mms[22m[39m
+[90mstdout[2m | tests/unit/renderer/corpus-extractor.test.ts[2m > [22m[2mCorpusExtractor —— 全文/图提取器（四态迁移+背压+裁剪数学） [SR2-AI-02][2m > [22m[2m真 pdfjs 集成：多页工厂 PDF 的文本提取全链（getTextContent 真解析；render 面 e2e）
+[22m[39mWarning: Please use the `legacy` build in Node.js environments.
+Warning: UnknownErrorException: Ensure that the `standardFontDataUrl` API parameter is provided.
+
+ [32m✓[39m tests/unit/ipc/make-handler.test.ts [2m([22m[2m6 tests[22m[2m)[22m[90m 4[2mms[22m[39m
+ [32m✓[39m tests/unit/services/markdown.report.test.ts [2m([22m[2m3 tests[22m[2m)[22m[90m 2[2mms[22m[39m
+ [32m✓[39m tests/unit/renderer/tags.store.test.ts [2m([22m[2m4 tests[22m[2m)[22m[90m 197[2mms[22m[39m
+ [32m✓[39m tests/unit/services/library.service.test.ts [2m([22m[2m5 tests[22m[2m)[22m[90m 4[2mms[22m[39m
+ [32m✓[39m tests/security/shell-guard.test.ts [2m([22m[2m5 tests[22m[2m)[22m[90m 3[2mms[22m[39m
+ [32m✓[39m tests/unit/services/export.service.test.ts [2m([22m[2m4 tests[22m[2m)[22m[90m 19[2mms[22m[39m
+ [32m✓[39m tests/unit/renderer/corpus-extractor.test.ts [2m([22m[2m10 tests[22m[2m)[22m[33m 4112[2mms[22m[39m
+   [33m[2m✓[22m[39m CorpusExtractor —— 全文/图提取器（四态迁移+背压+裁剪数学） [SR2-AI-02][2m > [22m全链：逐页 fulltext+页图回传（页序与文本序）→complete 终局 [33m606[2mms[22m[39m
+   [33m[2m✓[22m[39m CorpusExtractor —— 全文/图提取器（四态迁移+背压+裁剪数学） [SR2-AI-02][2m > [22m背压：任一时刻在途 invoke ≤1（await ack 后才发下一项） [33m465[2mms[22m[39m
+   [33m[2m✓[22m[39m CorpusExtractor —— 全文/图提取器（四态迁移+背压+裁剪数学） [SR2-AI-02][2m > [22manno 裁剪：标注随所在页回传（存储 0 基页→提取 1 基页）+annotationId 载荷 [33m480[2mms[22m[39m
+   [33m[2m✓[22m[39m CorpusExtractor —— 全文/图提取器（四态迁移+背压+裁剪数学） [SR2-AI-02][2m > [22minvoke 折叠错误：failed 路径——error 上报+destroy 释放+后续请求可接续 [33m995[2mms[22m[39m
+   [33m[2m✓[22m[39m CorpusExtractor —— 全文/图提取器（四态迁移+背压+裁剪数学） [SR2-AI-02][2m > [22m文档加载失败：error 上报（无页数据） [33m359[2mms[22m[39m
+   [33m[2m✓[22m[39m CorpusExtractor —— 全文/图提取器（四态迁移+背压+裁剪数学） [SR2-AI-02][2m > [22mdestroy 失败不阻断：complete 已上报（尽力而为面） [33m340[2mms[22m[39m
+   [33m[2m✓[22m[39m CorpusExtractor —— 全文/图提取器（四态迁移+背压+裁剪数学） [SR2-AI-02][2m > [22m在途收第二请求：忽略（防御分支——main 编排保证串行） [33m357[2mms[22m[39m
+   [33m[2m✓[22m[39m CorpusExtractor —— 全文/图提取器（四态迁移+背压+裁剪数学） [SR2-AI-02][2m > [22m真 pdfjs 集成：多页工厂 PDF 的文本提取全链（getTextContent 真解析；render 面 e2e） [33m509[2mms[22m[39m
+ [32m✓[39m tests/unit/renderer/notes-panel-status.test.tsx [2m([22m[2m2 tests[22m[2m)[22m[90m 27[2mms[22m[39m
+ [32m✓[39m tests/contracts/app-error.test.ts [2m([22m[2m5 tests[22m[2m)[22m[90m 3[2mms[22m[39m
+[90mstderr[2m | tests/unit/services/pdf-meta.extract.test.ts[2m > [22m[2mpdf-meta.extract —— 真实 PDF 抽取 [SR-SVC-04][2m > [22m[2m坏 PDF：不抛，返回全默认值
+[22m[39m[SR-SVC-04] 未找到 %PDF- 魔数：按坏文件处理，元数据返回默认值
+
+ [32m✓[39m tests/unit/services/pdf-meta.extract.test.ts [2m([22m[2m7 tests[22m[2m)[22m[90m 4[2mms[22m[39m
+ [32m✓[39m tests/unit/services/bibtex.serializer.test.ts [2m([22m[2m4 tests[22m[2m)[22m[90m 2[2mms[22m[39m
+ [32m✓[39m tests/unit/ipc/system.test.ts [2m([22m[2m3 tests[22m[2m)[22m[90m 4[2mms[22m[39m
+ [32m✓[39m tests/unit/ipc/import_.test.ts [2m([22m[2m2 tests[22m[2m)[22m[90m 5[2mms[22m[39m
+ [32m✓[39m tests/unit/shared/venue-tier.test.ts [2m([22m[2m8 tests[22m[2m)[22m[90m 3[2mms[22m[39m
+ [32m✓[39m tests/security/web-preferences.test.ts [2m([22m[2m4 tests[22m[2m)[22m[90m 3[2mms[22m[39m
+ [32m✓[39m tests/unit/services/notes.service.test.ts [2m([22m[2m3 tests[22m[2m)[22m[90m 3[2mms[22m[39m
+ [32m✓[39m tests/unit/windows/window-state.test.ts [2m([22m[2m4 tests[22m[2m)[22m[90m 23[2mms[22m[39m
+ [32m✓[39m tests/unit/renderer/ai-note-style.test.ts [2m([22m[2m3 tests[22m[2m)[22m[90m 3[2mms[22m[39m
+ [32m✓[39m tests/unit/db/repos/tags.repo.test.ts [2m([22m[2m4 tests[22m[2m)[22m[90m 47[2mms[22m[39m
+ [32m✓[39m tests/unit/ipc/library.test.ts [2m([22m[2m2 tests[22m[2m)[22m[90m 3[2mms[22m[39m
+ [32m✓[39m tests/security/csp-meta.test.ts [2m([22m[2m2 tests[22m[2m)[22m[90m 2[2mms[22m[39m
+ [32m✓[39m tests/unit/services/providers/arxiv.test.ts [2m([22m[2m2 tests[22m[2m)[22m[90m 4[2mms[22m[39m
+ [32m✓[39m tests/unit/services/tags.service.test.ts [2m([22m[2m3 tests[22m[2m)[22m[90m 3[2mms[22m[39m
+ [32m✓[39m tests/unit/protocol/app-file.protocol.test.ts [2m([22m[2m4 tests[22m[2m)[22m[90m 3[2mms[22m[39m
+ [32m✓[39m tests/unit/windows/main-window-navigation.test.ts [2m([22m[2m3 tests[22m[2m)[22m[90m 2[2mms[22m[39m
+ [32m✓[39m tests/unit/db/fts.test.ts [2m([22m[2m6 tests[22m[2m)[22m[90m 5[2mms[22m[39m
+ [32m✓[39m tests/unit/db/connection.test.ts [2m([22m[2m5 tests[22m[2m)[22m[90m 30[2mms[22m[39m
+ [32m✓[39m tests/unit/db/repos/collections.repo.test.ts [2m([22m[2m3 tests[22m[2m)[22m[90m 30[2mms[22m[39m
+ [32m✓[39m tests/unit/ipc/reader.test.ts [2m([22m[2m1 test[22m[2m)[22m[90m 4[2mms[22m[39m
+ [32m✓[39m tests/unit/ipc/tags.test.ts [2m([22m[2m1 test[22m[2m)[22m[90m 4[2mms[22m[39m
+ [32m✓[39m tests/unit/ipc/notes.test.ts [2m([22m[2m1 test[22m[2m)[22m[90m 3[2mms[22m[39m
+ [32m✓[39m tests/unit/ipc/enrich.test.ts [2m([22m[2m1 test[22m[2m)[22m[90m 3[2mms[22m[39m
+
+[31m⎯⎯⎯⎯⎯⎯[1m[7m Failed Suites 1 [27m[22m⎯⎯⎯⎯⎯⎯⎯[39m
+
+[31m[1m[7m FAIL [27m[22m[39m tests/unit/renderer/selection-paint.test.tsx[2m [ tests/unit/renderer/selection-paint.test.tsx ][22m
+[31m[1mError[22m: Failed to resolve import "../../../src/renderer/features/reader/annotation-resolve" from "tests/unit/renderer/selection-paint.test.tsx". Does the file exist?[39m
+  Plugin: [35mvite:import-analysis[39m
+  File: [36mE:/class/智慧水务/Synapse_remake/tests/unit/renderer/selection-paint.test.tsx[39m:18:38
+[33m  16 |  const __vi_import_4__ = await import('../../../src/renderer/features/reader/AnnotationLayer')
+  17 |  const __vi_import_5__ = await import('../../../src/renderer/features/reader/annotation-style')
+  18 |  const __vi_import_6__ = await import('../../../src/renderer/features/reader/annotation-resolve')
+     |                                       ^
+  19 |  
+  20 |  [39m
+[90m [2m❯[22m TransformPluginContext._formatError ../../%E6%99%BA%E6%85%A7%E6%B0%B4%E5%8A%A1/Synapse_remake/node_modules/vite/dist/node/chunks/dep-BK3b2jBa.js:[2m49258:41[22m[39m
+[90m [2m❯[22m TransformPluginContext.error ../../%E6%99%BA%E6%85%A7%E6%B0%B4%E5%8A%A1/Synapse_remake/node_modules/vite/dist/node/chunks/dep-BK3b2jBa.js:[2m49253:16[22m[39m
+[90m [2m❯[22m normalizeUrl ../../%E6%99%BA%E6%85%A7%E6%B0%B4%E5%8A%A1/Synapse_remake/node_modules/vite/dist/node/chunks/dep-BK3b2jBa.js:[2m64307:23[22m[39m
+[90m [2m❯[22m ../../%E6%99%BA%E6%85%A7%E6%B0%B4%E5%8A%A1/Synapse_remake/node_modules/vite/dist/node/chunks/dep-BK3b2jBa.js:[2m64439:39[22m[39m
+[90m [2m❯[22m TransformPluginContext.transform ../../%E6%99%BA%E6%85%A7%E6%B0%B4%E5%8A%A1/Synapse_remake/node_modules/vite/dist/node/chunks/dep-BK3b2jBa.js:[2m64366:7[22m[39m
+[90m [2m❯[22m PluginContainer.transform ../../%E6%99%BA%E6%85%A7%E6%B0%B4%E5%8A%A1/Synapse_remake/node_modules/vite/dist/node/chunks/dep-BK3b2jBa.js:[2m49099:18[22m[39m
+[90m [2m❯[22m loadAndTransform ../../%E6%99%BA%E6%85%A7%E6%B0%B4%E5%8A%A1/Synapse_remake/node_modules/vite/dist/node/chunks/dep-BK3b2jBa.js:[2m51978:27[22m[39m
+
+[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/4]⎯[22m[39m
+
+[31m⎯⎯⎯⎯⎯⎯⎯[1m[7m Failed Tests 3 [27m[22m⎯⎯⎯⎯⎯⎯⎯[39m
+
+[31m[1m[7m FAIL [27m[22m[39m tests/unit/renderer/selection-layer.test.tsx[2m > [22mSelectionLayer 动态锚定根（选区态状态机）[2m > [22mP1 挂载盒≠选区页仍正确（F-01 自裁 4 中间态解除）：防抖路径工具条出现+坐标经页盒换算并÷有效 zoom（F-A4 c 面归一）
+[31m[1mAssertionError[22m: expected 10 to be close to 8, received difference is 2, but expected 0.005[39m
+[36m [2m❯[22m tests/unit/renderer/selection-layer.test.tsx:[2m175:41[22m[39m
+    [90m173| [39m    [90m// 落点以选区所在页盒为参照系（N-C）：视口域 x=10/y=858（900−812−4[39m…
+    [90m174| [39m    [90m// →÷zoom 归一到挂载盒本地（×0.8）——8/686.4[39m
+    [90m175| [39m    [34mexpect[39m([34mparseFloat[39m(bar[33m![39m[33m.[39mstyle[33m.[39mleft))[33m.[39m[34mtoBeCloseTo[39m([34m8[39m[33m,[39m [34m2[39m)
+    [90m   | [39m                                        [31m^[39m
+    [90m176| [39m    [34mexpect[39m([34mparseFloat[39m(bar[33m![39m[33m.[39mstyle[33m.[39mtop))[33m.[39m[34mtoBeCloseTo[39m([34m686.4[39m[33m,[39m [34m1[39m)
+    [90m177| [39m    [34mexpect[39m(toastSpy)[33m.[39mnot[33m.[39m[34mtoHaveBeenCalled[39m()
+
+[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/4]⎯[22m[39m
+
+[31m[1m[7m FAIL [27m[22m[39m tests/unit/renderer/selection-layer.test.tsx[2m > [22mSelectionLayer 动态锚定根（选区态状态机）[2m > [22mF-A4 守卫（反转）：pending 态（mouseup 后工具条在场）自绘并集层在场——ADR-0019 R1 修订
+[31m[1mAssertionError[22m: expected null not to be null[39m
+[36m [2m❯[22m tests/unit/renderer/selection-layer.test.tsx:[2m329:28[22m[39m
+    [90m327| [39m    [90m// 划选视觉=自绘并集层（F-A4/ADR-0019 R1 修订：::selection transpa[39m…
+    [90m328| [39m    [90m// 单层单绘不叠深；原 0.20 双通道叠深缺陷的根治）——层缺位即红[39m
+    [90m329| [39m    [34mexpect[39m([34mselRects[39m())[33m.[39mnot[33m.[39m[34mtoBeNull[39m()
+    [90m   | [39m                           [31m^[39m
+    [90m330| [39m    [34mexpect[39m(document[33m.[39m[34mquerySelectorAll[39m([32m'[data-testid="selection-rect"]'[39m)…
+    [90m331| [39m  })
+
+[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/4]⎯[22m[39m
+
+[31m[1m[7m FAIL [27m[22m[39m tests/unit/renderer/annotation-merge.test.ts[2m > [22mF-A1 mergeRects —— 归一化域归并器[2m > [22m⑪ INV-40 边界修复（F-A4 行高感知）：紧行距中心距 ≤ 输入块高/2（旧路径误并）但 > PDF 行高/2 → lineH 传入不并簇；缺省旧行为存档
+[31m[1mAssertionError[22m: expected 1 to be 2 // Object.is equality[39m
+
+[32m- Expected[39m
+[31m+ Received[39m
+
+[32m- 2[39m
+[31m+ 1[39m
+
+[36m [2m❯[22m tests/unit/renderer/annotation-merge.test.ts:[2m184:24[22m[39m
+    [90m182| [39m    [90m// lineH=PDF 行高 0.016（< 输入 h 0.02——回退度量膨胀差）：不并簇[39m
+    [90m183| [39m    [35mconst[39m out [33m=[39m [34mmergeRects[39m([upper[33m,[39m lower][33m,[39m [34m0.016[39m)
+    [90m184| [39m    [34mexpect[39m(out[33m.[39mlength)[33m.[39m[34mtoBe[39m([34m2[39m)
+    [90m   | [39m                       [31m^[39m
+    [90m185| [39m    [90m// INV-D 钳制仍生效：负间隙（0.229 底 > 0.209 顶）推至恰好接触[39m
+    [90m186| [39m    [34mexpect[39m(out[[34m1[39m][33m![39m[33m.[39my)[33m.[39m[34mtoBeCloseTo[39m(out[[34m0[39m][33m![39m[33m.[39my [33m+[39m out[[34m0[39m][33m![39m[33m.[39mh[33m,[39m [34m10[39m)
+
+[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[4/4]⎯[22m[39m
+
+[2m Test Files [22m [1m[31m3 failed[39m[22m[2m | [22m[1m[32m115 passed[39m[22m[90m (118)[39m
+[2m      Tests [22m [1m[31m3 failed[39m[22m[2m | [22m[1m[32m986 passed[39m[22m[90m (989)[39m
+[2m   Start at [22m 10:09:19
+[2m   Duration [22m 28.30s[2m (transform 14.72s, setup 0ms, collect 57.99s, tests 15.95s, environment 315.07s, prepare 77.39s)[22m
+
diff --git a/scripts/audits/f-a4-impl.report.md b/scripts/audits/f-a4-impl.report.md
new file mode 100644
index 000000000..b20edf191
--- /dev/null
+++ b/scripts/audits/f-a4-impl.report.md
@@ -0,0 +1,152 @@
+# F-A4 实现报告——选区视觉并集自绘+标注贴行自适应+工具条定位归一（三屋第一屋·实现者）
+
+> 工单：scripts/audits/f-a4-ticket.md（无探员报告——主控预告按票面 §0 矩阵执行）。
+> 实现：2026-08-31，实现者子代理（GLM 主模型；无再派发）。本文所有计数/行数
+> 均为 wc/命令实测后落笔。
+
+## 1. 三面×根因×修法对照（票面 §0 逐格交付）
+
+| 面 | 根因（票面行号证据） | 修法（落地形态） | 修前基线（真机实测） | 修后复测（真机实测） |
+| - | --- | --- | --- | --- |
+| a 选区重叠加深 | native ::selection 逐 span 绘制，相邻行盒垂直重叠处 0.20×2≈0.36 叠深（text-layer.css:84-86） | SelectionLayer evaluate 渲染 SelectionPaint（selection-paint.tsx，portal 进选区所在页盒 z2）：数据=mergeLineRects+mergeRects 归并产物（与保存 rects 同源）；::selection→transparent；拖选经 selectionchange 200ms 防抖 | 自绘块 0 个；::selection=rgba(0,0,0,0.2)（叠深通道在场） | 自绘块 4 个（跨 3 行拖选）两两相交面积 0.00px²；::selection=rgba(0,0,0,0)；pageerror 0 |
+| b 标注贴行 | ①紧行距跨行并簇成单高块（聚类容差以输入 rect 高为基准）②TRIM 定值收边对行高不匹配 ③重锚同管线放大 | ①mergeRects 可选 lineH 钳制容差+mergeLineRects 像素域 lineH 在场改中心距判据（lineH=选区 span 字号中位数——挂 A rectsBetweenPoints/挂 B AnnotationLayer 两路注入）②rectStyle 可选 band（annotation-resolve 自 span 实测盒+canvas 字体度量推算字形带；缺省回退 F-11 分数）③重锚链经同一 rectsBetweenPoints 同源受益 | 3 行拖选保存渲染 **1 块**（并簇）；块缘偏差（对整带）0.96px/（分行后口径）+4~+5px 下偏 | **3 块分行**；块顶 vs 行簇顶 max **1.48px**；块底落行簇底 desc 尾界 [−1,+3] 越界 0；块两两相交 0 |
+| c 工具条偏远 | 视口差直写 left/top 被 CSS zoom 二次放大（ui-scale×1.25）+无视口夹取/无下翻转 | selection-geometry.ts：localScale（clientWidth/gBCR.width 比值，守卫≤0→1——rootToLocalScale 思想 reader 域新写）÷归一+toolbarViewportPos（近顶下翻转+滚动容器可视区夹取） | 工具条距选区顶 **334.1px**（large 档）/277.5px（medium） | 距选区顶 **9.4px**；bounding 在滚动容器可视区内；medium 档重开同样在界内 |
+
+跨面序列（票面 §0）：S1 拖选防抖自绘跟随 ✓（unit S1）/S2 所见即所存 ✓（unit S2：保存 rects=自绘块同源断言）/S3 保存渲染贴行与自绘对齐 ✓（真机 b 面+unit）/S4 工具条视口内贴选区 ✓/S5 Escape 工具条收+自绘随选区真清 ✓（unit S5，INV-37）/S6 换档/缩放稳定 ✓（真机 zoom 100↔150% 归一化几何漂移 0.67%；medium 重开存量 3 块零迁移）。
+
+## 2. 改动面（git diff --stat 实测；新件另计）
+
+修改 9 文件（+336/−177 中含**非本票** 2 文件，见 §7）：
+- src/renderer/features/reader/SelectionLayer.tsx（172 行 diff，终态 **249 行** wc 实测——组件 ≤250 红线内）
+- src/renderer/features/reader/annotation-anchor.ts（+68：mergeLineRects lineH+medianFontSizeBetween+rectsBetweenPoints 接线；终态 395 行 ≤500）
+- src/renderer/features/reader/annotation-merge.ts（+24：lineH 可选参；终态 140 行）
+- src/renderer/features/reader/annotation-style.ts（+34：band 可选参+GlyphBand+pct；终态 91 行）
+- src/renderer/features/reader/AnnotationLayer.tsx（51 行 diff：resolve 拆出+lineH+band 匹配；终态 240 行 ≤250）
+- src/renderer/features/reader/text-layer.css（::selection transparent+头注 F-A4；终态 116 行）
+- docs/invariants.md（INV-37 重写+INV-40 边界修订标注 F-A4）
+- docs/adr/0019-selection-feedback-native-route.md（+22：R1 修订节；终态 95 行）
+- 受锁三件（见 §5）
+
+新件 4（+1 测试）：
+- src/renderer/features/reader/selection-geometry.ts（**85 行**——localScale/toolbarViewportPos/closestPageRoot/pageIndexOf/常量）
+- src/renderer/features/reader/selection-paint.tsx（**62 行**——SelectionPaint portal 组件）
+- src/renderer/features/reader/annotation-resolve.ts（**232 行**——resolveAnnotationRects/bandFromMetrics/matchBand/normalizedLineHeight）
+- tests/unit/renderer/selection-paint.test.tsx（**366 行**，always-active 11 测：a S1~S5/b band 四测/c 三态）
+- scripts/audits/f-a4-verify.mjs（**385 行**真机探针）+f-a4-diag.mjs（一次性诊断，f-r1-dbg 先例留档）
+
+## 3. TDD 凭证
+
+- **先行红**（f-a4-first-red.raw.txt / f-a4-e2e-first-red.raw.txt，对 HEAD 实现）：
+  unit 3 断言红+1 模块红——selection-layer P1（归一坐标 8/686.4 vs HEAD 10/858）+
+  F-A4 反转守卫（selRects null）+annotation-merge ⑪（lineH 被忽略→1 块）+
+  selection-paint（annotation-resolve 缺件）；e2e F-06 C 节断言红
+  （Expected "rgba(0, 0, 0, 0)" Received "rgba(0, 0, 0, 0.2)"）。
+- **绿**：定向→全量 `npm run test` **118 文件/1000 用例全绿**（基线 989+新增 11）。
+- **变异红证 M1~M5**（f-a4-mutation.log+五 raw；cp 备份一次性时间戳目录
+  f-a4-mutation-backup-20260831/，8 源文件全量收录）：M1 localScale 恒 1（P1+c1 红）/
+  M2 坍缩漏清自绘（S5 红）/M3 lineH 忽略（⑪红）/M4 band 忽略（b1/b2/b5 红）/
+  M5 下翻转移除（c1/c2 红）；逐一还原 diff 空+回绿双验；M4 于 b 面半前导修复后
+  对新代码重跑红证（追加 raw）。
+- **verify 各环真退出码**：quality=0 tickets=0 lint=0 typecheck=0 **test=0（1000）**
+  build=0；locks:check 红=**预期**（受锁三件保持解锁态+新受锁路径待登记——票面
+  明令禁跑 locks 命令，主控收口职责）。
+- **e2e 全量**（受锁 spec 改动后口径）：**28 passed/1 failed**（1.4m）——
+  唯一红=R2-SET1 smoke（header 56≠44），§7 归因非本票；P7-A 复制一次抖动
+  （剪贴板时序）复跑通过。本票触及的 reader-text.spec 全部 9 用例含改写的
+  F-06 小票与 F-A1 多行用例全绿。
+
+## 4. 真机探针（scripts/audits/f-a4-verify.mjs；产物 f-a4-out/）
+
+真实库副本+用户实况 large 档（uiScale 保留不删）+真鼠标跨行拖选；
+baseline（修前数值，8 项）/after（修后判据，**12/12 PASS**）两相位：
+f-a4-verify-baseline.json / f-a4-verify-after.json + 六截图（{phase}-select/
+-saved/-z150/-medium.png）。S2 会话用「选择模式」（INV-42 rect 穿透）重选
+S1 已存高亮同一行带做 zoom 100↔150% 同源对比。修后一行结论：
+**F-A4 VERIFY: PASS（12/12 项断言全过）**（f-a4-after.raw.txt）。
+
+## 5. 受锁改写逐文件理由（主控已 unlock；禁跑 locks 命令遵行）
+
+- tests/unit/renderer/selection-layer.test.tsx（332 行）：P1 定位断言改归一坐标
+  （mount clientWidth 480/gBCR 600 桩→left/top×0.8——c 面红证锚）；F-08 守卫
+  **反转**为自绘在场（头注注明 ADR-0019 R1 修订依据=票面 §0a）；selRects 探针
+  改 document 级（portal 渲染进页盒）。其余 12 用例零改（P2~P7/F-12a/b/c 全绿）。
+- tests/unit/renderer/annotation-merge.test.ts（206 行）：新增 ⑪ INV-40 边界修复
+  （lineH 传入紧行距不并簇 2 块+缺省旧行为 1 块存档）+⑫ lineH 恒等钳制/幂等；
+  ①~⑩ 零改（缺省参数兼容——零迁移）。
+- tests/e2e/reader-text.spec.ts（791 行）：F-06 小票 C 节——::selection 精确值
+  断言 transparent+selection-rects 0 计数守卫**反转**为在场+块色
+  rgba(0,0,0,0.2)（头注注明 ADR-0019 R1 修订依据=票面 §0a）；标题随改；
+  其余 8 用例零改。
+
+## 6. 自裁申报（超票面决定，交门审）
+
+1. **自绘层经 React portal 渲染进选区所在页盒（textLayer 父盒）而非票面 §1a
+   字面的「渲染 div absolute 于挂载盒」**：[data-page-column] 的反向 zoom 补偿
+   （zoom: calc(1/var(--ui-scale))）在档位≠1 时创建 stacking context——挂载盒
+   渲染会使自绘层浮到标注 multiply 层之上，破坏 R2-F-10「灰在黄下」观感；
+   portal 进页盒与标注层同 context（z2<z5），且百分比数学与 rects 归一化基准
+   （pixelBoxOf(textLayer)）严格同盒零换算。
+2. **mergeLineRects（像素域）同修 lineH 感知**（票面 §0b① 只点名 mergeRects）：
+   INV-40 登记的并簇发生在上游 25% 重叠率判据（数学上 mergeRects 级跨行误并
+   必蕴含上游已并成单块，下游无输入可分）；可选参缺省兼容，受锁 anchor 测试
+   （guardedDescribe 8 用例）零改全绿。
+3. **b② band 数据源=span 实测盒+canvas measureText 字体度量**（actualBoundingBox
+   +fontBoundingBox 推算字形带）：票面两候选（textContent item 高度/textLayer
+   span 行盒簇）中 DOM 可达的实现；computed fontSize 不可解析回退 span 盒高。
+4. **半前导负值不钳 0**：初版钳 0 致带整体下偏 +4~5px（f-a4-diag.mjs 真机
+   实锤——CSS 负半前导合法，line-height:1 下回退字体内容区溢出行盒）；修复后
+   块顶偏差 1.48px。
+5. **探针 b 判据落点**：块顶贴行簇 span 盒顶 ≤2px+块底落 [−1,+3]px desc 尾界
+   ——票面 §5②「与自绘块对齐（同文字行簇 top/height 偏差≤2px）」的实现解读：
+   自绘块=行盒并集、标注块=墨带，两有意几何差 1~4px 为 b② 设计本身引入
+   （信息项落 JSON）；顶缘判据两几何一致。修前（+4px 下偏/并簇 1 块）仍强判别。
+6. SelectionLayer 再导出 closestPageRoot/pageIndexOf（selection-geometry 拆件后
+   导出面零变——票面 §2「对外行为零变」）。
+7. 判据口径说明：annotation-merge ⑪ 缺省路径断言=旧行为存档（1 块）——非放宽，
+   为 lineH 缺省兼容面（旧库/不可量测环境）的行为锁定。
+
+## 7. 接缝报告（报主控裁决——非本票缺陷）
+
+- **theme.css+workspace.css 工作树有非本票的未提交改动**（git status 实测）：
+  header 高 44→56px（注释注明「用户裁决 2026-08-31 增高」）+ws-panel
+  transform-origin 改 center。**R2-SET1 受锁 smoke 断言仍锚 44 故红**。隔离
+  实验实证：仅还这两文件至 HEAD 后 SET1 通过（681ms ok），恢复后仍红——
+  归因该单元（其测试面未随改）。本实现者零触碰、工作树原样保留。
+- npm run test 与 e2e 的 better-sqlite3 ABI 互斥（F-R1 已知）：verify 全量后跑
+  e2e 前须 `node scripts/sqlite-abi.mjs use electron`（本次两次踩中，已按此序）。
+
+## 8. git status 全贴（2026-08-31 实现者收口时点）
+
+```
+ M docs/adr/0019-selection-feedback-native-route.md
+ M docs/invariants.md
+ M src/renderer/features/reader/AnnotationLayer.tsx
+ M src/renderer/features/reader/SelectionLayer.tsx
+ M src/renderer/features/reader/annotation-anchor.ts
+ M src/renderer/features/reader/annotation-merge.ts
+ M src/renderer/features/reader/annotation-style.ts
+ M src/renderer/features/reader/text-layer.css
+ M src/renderer/features/workspaces/workspace.css   ← 非本票（§7）
+ M src/renderer/shared/theme.css                    ← 非本票（§7）
+ M tests/e2e/reader-text.spec.ts                    ← 受锁改写（§5）
+ M tests/unit/renderer/annotation-merge.test.ts     ← 受锁改写（§5）
+ M tests/unit/renderer/selection-layer.test.tsx     ← 受锁改写（§5）
+?? scripts/audits/f-a4-*（本票产物：探针/诊断/红绿证/变异证/报告/out 截图 JSON/
+   mutation-backup-20260831/）+ 3 新源文件 + 1 新测试（§2）
+?? scripts/audits/f-l4-*.raw.txt、f1-out/*.png、f-a4-ticket.md ← 会话前已存在的
+   未跟踪残留（非本实现者产物，未清理未纳入）
+```
+
+## 9. 成本
+
+实现者单会话（GLM 5.3，无子代理派发）：机器时长约 65 分钟（含 baseline/after
+两轮真机 Electron 取证各 ~90s+全量 test×4+e2e×3+变异 10 轮定向跑）；
+token 估算（按工具回显体量）输入 ~0.9M/输出 ~0.13M——估算值，供成本账本。
+
+## 10. 红线自查
+
+禁 git commit/branch ✓（全程零提交）；禁 registry ✓；禁 locks 命令 ✓（locks:
+check 红为预期主控收口面）；禁新依赖 ✓（package.json 零改）；grep 无
+TODO/FIXME/placeholder（quality 关）✓；组件 ≤250（SelectionLayer 249/
+AnnotationLayer 240，check-quality 口径）✓；卡住停手未触发（两处弯路——探针
+拖选落点/ABI 态——均已按 f-r1 在档教训自解并记 §7）。
diff --git a/scripts/audits/f-a4-out/after-medium.png b/scripts/audits/f-a4-out/after-medium.png
new file mode 100644
index 000000000..f61748a7f
Binary files /dev/null and b/scripts/audits/f-a4-out/after-medium.png differ
diff --git a/scripts/audits/f-a4-out/after-saved.png b/scripts/audits/f-a4-out/after-saved.png
new file mode 100644
index 000000000..85a7d7b9f
Binary files /dev/null and b/scripts/audits/f-a4-out/after-saved.png differ
diff --git a/scripts/audits/f-a4-out/after-select.png b/scripts/audits/f-a4-out/after-select.png
new file mode 100644
index 000000000..c95c6f9ec
Binary files /dev/null and b/scripts/audits/f-a4-out/after-select.png differ
diff --git a/scripts/audits/f-a4-out/after-z150.png b/scripts/audits/f-a4-out/after-z150.png
new file mode 100644
index 000000000..e77f655af
Binary files /dev/null and b/scripts/audits/f-a4-out/after-z150.png differ
diff --git a/scripts/audits/f-a4-out/baseline-medium-saved.png b/scripts/audits/f-a4-out/baseline-medium-saved.png
new file mode 100644
index 000000000..97e446969
Binary files /dev/null and b/scripts/audits/f-a4-out/baseline-medium-saved.png differ
diff --git a/scripts/audits/f-a4-out/baseline-medium-select.png b/scripts/audits/f-a4-out/baseline-medium-select.png
new file mode 100644
index 000000000..436e24099
Binary files /dev/null and b/scripts/audits/f-a4-out/baseline-medium-select.png differ
diff --git a/scripts/audits/f-a4-out/baseline-medium.png b/scripts/audits/f-a4-out/baseline-medium.png
new file mode 100644
index 000000000..e6d0c81a9
Binary files /dev/null and b/scripts/audits/f-a4-out/baseline-medium.png differ
diff --git a/scripts/audits/f-a4-out/baseline-saved.png b/scripts/audits/f-a4-out/baseline-saved.png
new file mode 100644
index 000000000..00e5cb639
Binary files /dev/null and b/scripts/audits/f-a4-out/baseline-saved.png differ
diff --git a/scripts/audits/f-a4-out/baseline-select.png b/scripts/audits/f-a4-out/baseline-select.png
new file mode 100644
index 000000000..6dfe49e1c
Binary files /dev/null and b/scripts/audits/f-a4-out/baseline-select.png differ
diff --git a/scripts/audits/f-a4-out/baseline-z150-saved.png b/scripts/audits/f-a4-out/baseline-z150-saved.png
new file mode 100644
index 000000000..fb40b3445
Binary files /dev/null and b/scripts/audits/f-a4-out/baseline-z150-saved.png differ
diff --git a/scripts/audits/f-a4-out/baseline-z150-select.png b/scripts/audits/f-a4-out/baseline-z150-select.png
new file mode 100644
index 000000000..2296b584d
Binary files /dev/null and b/scripts/audits/f-a4-out/baseline-z150-select.png differ
diff --git a/scripts/audits/f-a4-out/baseline-z150.png b/scripts/audits/f-a4-out/baseline-z150.png
new file mode 100644
index 000000000..0bfd8cf66
Binary files /dev/null and b/scripts/audits/f-a4-out/baseline-z150.png differ
diff --git a/scripts/audits/f-a4-out/f-a4-verify-after.json b/scripts/audits/f-a4-out/f-a4-verify-after.json
new file mode 100644
index 000000000..24908349f
--- /dev/null
+++ b/scripts/audits/f-a4-out/f-a4-verify-after.json
@@ -0,0 +1,8665 @@
+{
+  "meta": {
+    "script": "f-a4-verify.mjs",
+    "phase": "after",
+    "date": "2026-08-31T02:34:26.112Z",
+    "uiScale": "large",
+    "note": "真实库副本（uiScale 保留用户实况 large）+真鼠标跨 3 行拖选；baseline=修前三现象数值，after=票面 §5 判据"
+  },
+  "scenes": {
+    "main": {
+      "dSel": {
+        "spans": [
+          {
+            "x": 1110.2625732421875,
+            "y": -816.6000366210938,
+            "w": 273.2835998535156,
+            "h": 15.9375
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -798.6124877929688,
+            "w": 303.83544921875,
+            "h": 15.9375
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -780.7000122070312,
+            "w": 54.757423400878906,
+            "h": 15.9375
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -740.0750122070312,
+            "w": 148.2965850830078,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -650.5,
+            "w": 6.650000095367432,
+            "h": 11.96250057220459
+          },
+          {
+            "x": 1116.2249755859375,
+            "y": -650.5,
+            "w": 2.6875,
+            "h": 11.96250057220459
+          },
+          {
+            "x": 1128.175048828125,
+            "y": -650.5,
+            "w": 65.08613586425781,
+            "h": 11.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -621,
+            "w": 331.62158203125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -609.0750122070312,
+            "w": 331.6188659667969,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -597.0875244140625,
+            "w": 331.5967712402344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -585.1625366210938,
+            "w": 331.6076354980469,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -573.1749877929688,
+            "w": 126.4576187133789,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": -561.1875,
+            "w": 319.6006774902344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -549.3375244140625,
+            "w": 331.6159362792969,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -537.3500366210938,
+            "w": 331.5957946777344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -525.3624877929688,
+            "w": 17.12275505065918,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1127.375,
+            "y": -525.3624877929688,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1135.237548828125,
+            "y": -525.3624877929688,
+            "w": 29.435352325439453,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1164.7000732421875,
+            "y": -525.3624877929688,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1172.550048828125,
+            "y": -525.3624877929688,
+            "w": 8.30136775970459,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1180.8499755859375,
+            "y": -525.3624877929688,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1188.7125244140625,
+            "y": -525.3624877929688,
+            "w": 53.38906478881836,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1242.0875244140625,
+            "y": -525.3624877929688,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1249.987548828125,
+            "y": -525.3624877929688,
+            "w": 42.20185470581055,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1292.175048828125,
+            "y": -525.3624877929688,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1300.125,
+            "y": -525.3624877929688,
+            "w": 15.03671932220459,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1315.1375732421875,
+            "y": -525.3624877929688,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1323,
+            "y": -525.3624877929688,
+            "w": 24.478124618530273,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1347.5,
+            "y": -525.3624877929688,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1355.4375,
+            "y": -525.3624877929688,
+            "w": 15.03671932220459,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1370.5,
+            "y": -525.3624877929688,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1378.362548828125,
+            "y": -525.3624877929688,
+            "w": 63.45097732543945,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -513.4375,
+            "w": 125.314453125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": -501.45001220703125,
+            "w": 319.6865234375,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -489.5249938964844,
+            "w": 331.6131896972656,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -477.5375061035156,
+            "w": 331.5796813964844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -465.5500183105469,
+            "w": 331.61474609375,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -453.70001220703125,
+            "w": 263.95849609375,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": -441.7124938964844,
+            "w": 319.6275329589844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -429.7250061035156,
+            "w": 331.5791015625,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -417.8000183105469,
+            "w": 331.6468811035156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -405.8125,
+            "w": 331.6490173339844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -393.88751220703125,
+            "w": 218.51953125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -345.20001220703125,
+            "w": 43.583984375,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1153.8125,
+            "y": -344.9375,
+            "w": 3.737499952316284,
+            "h": 7.474999904632568
+          },
+          {
+            "x": 1162.1875,
+            "y": -345.20001220703125,
+            "w": 2.862499952316284,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -335.2124938964844,
+            "w": 184.5994110107422,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -325.2875061035156,
+            "w": 86.8330078125,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -310.375,
+            "w": 34.11406326293945,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -300.38751220703125,
+            "w": 124.7904281616211,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -277.13751220703125,
+            "w": 4.237500190734863,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1116.625,
+            "y": -277.13751220703125,
+            "w": 4.237500190734863,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1119,
+            "y": -276.4750061035156,
+            "w": 175.9650421142578,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -266.5500183105469,
+            "w": 84.6504898071289,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1197.2750244140625,
+            "y": -266.5500183105469,
+            "w": 178.16299438476562,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1375.4625244140625,
+            "y": -266.5500183105469,
+            "w": 2.362499952316284,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -256.5625,
+            "w": 122.11006164550781,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1433.4500732421875,
+            "y": -276.4750061035156,
+            "w": 8.47265625,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": -138.2624969482422,
+            "w": 319.6965026855469,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -126.3499984741211,
+            "w": 331.6001892089844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -114.36250305175781,
+            "w": 331.64532470703125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -102.4375,
+            "w": 331.5599670410156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -90.51250457763672,
+            "w": 331.5853576660156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -78.5250015258789,
+            "w": 331.6105651855469,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -66.5374984741211,
+            "w": 250.0441436767578,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": -54.61249923706055,
+            "w": 319.66796875,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -42.625,
+            "w": 331.6064453125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -30.712499618530273,
+            "w": 331.60333251953125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -18.725000381469727,
+            "w": 289.087890625,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": -6.800000190734863,
+            "w": 319.669921875,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 5.125,
+            "w": 331.60968017578125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 17.11250114440918,
+            "w": 210.97842407226562,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": 29.100000381469727,
+            "w": 319.6788024902344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 41.025001525878906,
+            "w": 331.6328125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 53.01250076293945,
+            "w": 331.6776428222656,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 65,
+            "w": 331.6332092285156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 76.9124984741211,
+            "w": 331.6690368652344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 88.8375015258789,
+            "w": 275.43048095703125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 121.13750457763672,
+            "w": 6.650000095367432,
+            "h": 11.96250057220459
+          },
+          {
+            "x": 1116.2249755859375,
+            "y": 121.13750457763672,
+            "w": 2.6875,
+            "h": 11.96250057220459
+          },
+          {
+            "x": 1128.175048828125,
+            "y": 121.13750457763672,
+            "w": 234.44668579101562,
+            "h": 11.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 150.6374969482422,
+            "w": 331.646484375,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 162.5625,
+            "w": 331.58380126953125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 174.5500030517578,
+            "w": 331.6302795410156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 186.53750610351562,
+            "w": 331.56280517578125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 198.46250915527344,
+            "w": 31.970703125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": 210.3874969482422,
+            "w": 319.638671875,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 222.375,
+            "w": 331.6455993652344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 234.28750610351562,
+            "w": 331.5853576660156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 246.27500915527344,
+            "w": 331.5757751464844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": 258.20001220703125,
+            "w": 319.6112365722656,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 270.1875,
+            "w": 114.96406555175781,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 302.4250183105469,
+            "w": 14.964746475219727,
+            "h": 11.96250057220459
+          },
+          {
+            "x": 1125.1875,
+            "y": 302.4250183105469,
+            "w": 2.6875,
+            "h": 11.96250057220459
+          },
+          {
+            "x": 1137.175048828125,
+            "y": 302.4250183105469,
+            "w": 133.05166625976562,
+            "h": 11.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 331.9250183105469,
+            "w": 331.6193542480469,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 343.9125061035156,
+            "w": 162.9675750732422,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1273.2125244140625,
+            "y": 343.9125061035156,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1273.2625732421875,
+            "y": 342.1125183105469,
+            "w": 3.6875,
+            "h": 6.637500286102295
+          },
+          {
+            "x": 1276.987548828125,
+            "y": 343.9125061035156,
+            "w": 2.7750000953674316,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 379.4750061035156,
+            "w": 3.137500047683716,
+            "h": 5.637500286102295
+          },
+          {
+            "x": 1113.6375732421875,
+            "y": 380.95001220703125,
+            "w": 328.25048828125,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 390.9375,
+            "w": 331.6618347167969,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 400.9250183105469,
+            "w": 218.12315368652344,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -163.6374969482422,
+            "w": 8.47265625,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1352.362548828125,
+            "y": -163.6374969482422,
+            "w": 89.50654602050781,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": 539.7999877929688,
+            "w": 307.72589111328125,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": 549.7250366210938,
+            "w": 299.33184814453125,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": 566.5,
+            "w": 319.6673889160156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": 578.4249877929688,
+            "w": 319.6105651855469,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 590.4125366210938,
+            "w": 331.63653564453125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 602.3375244140625,
+            "w": 331.6163024902344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 614.3250122070312,
+            "w": 138.91162109375,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": 626.3125,
+            "w": 319.6372985839844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 638.1625366210938,
+            "w": 331.6232604980469,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 650.1500244140625,
+            "w": 331.5934753417969,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 662.1375122070312,
+            "w": 331.6319274902344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 674.0625,
+            "w": 331.6517639160156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 686.0499877929688,
+            "w": 331.6400451660156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 698.0375366210938,
+            "w": 100.5140609741211,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": 709.9625244140625,
+            "w": 319.6268615722656,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 721.9500122070312,
+            "w": 331.6224670410156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 733.7999877929688,
+            "w": 164.61172485351562,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": 745.7875366210938,
+            "w": 319.6280212402344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 757.7750244140625,
+            "w": 331.5990295410156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 769.7000122070312,
+            "w": 250.5603485107422,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": 781.6875,
+            "w": 319.6490173339844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 793.6749877929688,
+            "w": 29.819629669189453,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1140.0625,
+            "y": 792.9500122070312,
+            "w": 9.600000381469727,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1143.3125,
+            "y": 793.6749877929688,
+            "w": 298.5708923339844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 805.6000366210938,
+            "w": 65.89404296875,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 853.8125,
+            "w": 14.964746475219727,
+            "h": 11.96250057220459
+          },
+          {
+            "x": 1125.1875,
+            "y": 853.8125,
+            "w": 2.6875,
+            "h": 11.96250057220459
+          },
+          {
+            "x": 1137.175048828125,
+            "y": 853.8125,
+            "w": 214.45059204101562,
+            "h": 11.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 883.25,
+            "w": 331.6454162597656,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 895.2374877929688,
+            "w": 331.5938415527344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 907.2374877929688,
+            "w": 331.6183776855469,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 919.1500244140625,
+            "w": 28.73164176940918,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1139.0625,
+            "y": 918.4874877929688,
+            "w": 9.600000381469727,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1142.2625732421875,
+            "y": 919.1500244140625,
+            "w": 264.02032470703125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1406.2750244140625,
+            "y": 919.1500244140625,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1411.4124755859375,
+            "y": 919.1500244140625,
+            "w": 30.469532012939453,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 931.1375122070312,
+            "w": 38.98828125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1149.237548828125,
+            "y": 931.1375122070312,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1153.3250732421875,
+            "y": 931.1375122070312,
+            "w": 288.48565673828125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 943.0625,
+            "w": 34.10888671875,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": 955.0499877929688,
+            "w": 319.6630859375,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 966.9750366210938,
+            "w": 46.76064682006836,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1157.0125732421875,
+            "y": 966.9750366210938,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1163.5999755859375,
+            "y": 966.9750366210938,
+            "w": 8.2939453125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1171.9000244140625,
+            "y": 966.9750366210938,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1178.4375,
+            "y": 966.9750366210938,
+            "w": 25.504297256469727,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1203.9375,
+            "y": 966.9750366210938,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1210.5250244140625,
+            "y": 966.9750366210938,
+            "w": 7.789941310882568,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1218.3375244140625,
+            "y": 966.9750366210938,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1224.8875732421875,
+            "y": 966.9750366210938,
+            "w": 35.55781173706055,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1260.4375,
+            "y": 966.9750366210938,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1267.0750732421875,
+            "y": 966.9750366210938,
+            "w": 14.419336318969727,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1281.4749755859375,
+            "y": 966.9750366210938,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1288.050048828125,
+            "y": 966.9750366210938,
+            "w": 31.812305450439453,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1319.8375244140625,
+            "y": 966.9750366210938,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1326.425048828125,
+            "y": 966.9750366210938,
+            "w": 43.25771713256836,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1369.6624755859375,
+            "y": 966.9750366210938,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1376.2874755859375,
+            "y": 966.9750366210938,
+            "w": 8.30918025970459,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1384.5875244140625,
+            "y": 966.9750366210938,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1391.175048828125,
+            "y": 966.9750366210938,
+            "w": 50.6953125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 978.8875122070312,
+            "w": 331.6495056152344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 990.875,
+            "w": 331.6241149902344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1002.875,
+            "w": 331.5771484375,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1014.7875366210938,
+            "w": 331.61114501953125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1026.7750244140625,
+            "w": 122.15303039550781,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": 1038.7000732421875,
+            "w": 118.1578140258789,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1240.375,
+            "y": 1038.0374755859375,
+            "w": 9.600000381469727,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1243.5875244140625,
+            "y": 1038.7000732421875,
+            "w": 198.25137329101562,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1050.6875,
+            "w": 331.6437683105469,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 514.4874877929688,
+            "w": 258.615234375,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1368.8250732421875,
+            "y": 513.8875122070312,
+            "w": 9.71250057220459,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1378.5374755859375,
+            "y": 513.8875122070312,
+            "w": 4.237500190734863,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1433.4500732421875,
+            "y": 514.4874877929688,
+            "w": 8.47265625,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1217.737548828125,
+            "w": 331.62451171875,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1229.6500244140625,
+            "w": 100.3828125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1210.7000732421875,
+            "y": 1228.987548828125,
+            "w": 9.600000381469727,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1213.9124755859375,
+            "y": 1229.6500244140625,
+            "w": 228.01992797851562,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1241.6375732421875,
+            "w": 306.6441345214844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": 1253.5625,
+            "w": 28.73164176940918,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1151,
+            "y": 1252.8250732421875,
+            "w": 9.600000381469727,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1154.25,
+            "y": 1253.5625,
+            "w": 287.6447448730469,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1265.487548828125,
+            "w": 331.6048889160156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1277.4749755859375,
+            "w": 261.50811767578125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": 1289.4625244140625,
+            "w": 124.55908203125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1246.7874755859375,
+            "y": 1288.7249755859375,
+            "w": 9.600000381469727,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1249.987548828125,
+            "y": 1289.4625244140625,
+            "w": 191.8095703125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1301.3875732421875,
+            "w": 331.59747314453125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1313.375,
+            "w": 331.6123962402344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1325.2874755859375,
+            "w": 331.6452331542969,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1337.2750244140625,
+            "w": 331.646484375,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1349.2000732421875,
+            "w": 29.766504287719727,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": 1361.125,
+            "w": 278.74151611328125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1401.0125732421875,
+            "y": 1360.4625244140625,
+            "w": 9.600000381469727,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1404.2625732421875,
+            "y": 1361.125,
+            "w": 37.591796875,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1373.112548828125,
+            "w": 331.6317443847656,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1385.0999755859375,
+            "w": 331.5747985839844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1397.0250244140625,
+            "w": 331.6094665527344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1409.0125732421875,
+            "w": 160.404296875,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1270.7125244140625,
+            "y": 1408.2750244140625,
+            "w": 9.600000381469727,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1273.9124755859375,
+            "y": 1409.0125732421875,
+            "w": 167.98379516601562,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1421,
+            "w": 224.8186492919922,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": 1432.9124755859375,
+            "w": 319.68194580078125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1444.8375244140625,
+            "w": 122.6573257446289,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1232.9124755859375,
+            "y": 1444.0999755859375,
+            "w": 9.600000381469727,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1236.1624755859375,
+            "y": 1444.8375244140625,
+            "w": 205.72305297851562,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1456.8250732421875,
+            "w": 331.638671875,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1468.75,
+            "w": 331.5677795410156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1480.737548828125,
+            "w": 331.6141662597656,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1492.6624755859375,
+            "w": 331.61358642578125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1504.6500244140625,
+            "w": 40.748146057128906,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": 1516.6375732421875,
+            "w": 319.6568298339844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1528.550048828125,
+            "w": 331.572265625,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1540.4749755859375,
+            "w": 331.5889587402344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1552.4625244140625,
+            "w": 331.6273498535156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1564.3875732421875,
+            "w": 331.61505126953125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1576.375,
+            "w": 198.3759765625,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": 1588.300048828125,
+            "w": 319.6109313964844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1600.2874755859375,
+            "w": 331.6490173339844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1612.2750244140625,
+            "w": 331.64434814453125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1624.1875,
+            "w": 76.9122085571289,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": 1636.112548828125,
+            "w": 319.6483459472656,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1648.0999755859375,
+            "w": 54.14590072631836,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1164.3875732421875,
+            "y": 1648.0999755859375,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1171.7249755859375,
+            "y": 1648.0999755859375,
+            "w": 20.534961700439453,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1192.2625732421875,
+            "y": 1648.0999755859375,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1199.550048828125,
+            "y": 1648.0999755859375,
+            "w": 27.269433975219727,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1226.8125,
+            "y": 1648.0999755859375,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1234.0625,
+            "y": 1648.0999755859375,
+            "w": 30.674413681030273,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1264.737548828125,
+            "y": 1648.0999755859375,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1271.987548828125,
+            "y": 1648.0999755859375,
+            "w": 19.474023818969727,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1291.4749755859375,
+            "y": 1648.0999755859375,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1298.7625732421875,
+            "y": 1648.0999755859375,
+            "w": 17.216114044189453,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1315.9749755859375,
+            "y": 1648.0999755859375,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1323.2625732421875,
+            "y": 1648.0999755859375,
+            "w": 18.87744140625,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1342.1375732421875,
+            "y": 1648.0999755859375,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1349.425048828125,
+            "y": 1648.0999755859375,
+            "w": 18.8759765625,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1368.300048828125,
+            "y": 1648.0999755859375,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1375.6375732421875,
+            "y": 1648.0999755859375,
+            "w": 51.186622619628906,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1426.8250732421875,
+            "y": 1648.0999755859375,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1434.0625,
+            "y": 1648.0999755859375,
+            "w": 7.781836032867432,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1660.0250244140625,
+            "w": 331.6327209472656,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1672.0125732421875,
+            "w": 331.66015625,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1683.9375,
+            "w": 331.6083984375,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1695.925048828125,
+            "w": 331.6283264160156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1707.9124755859375,
+            "w": 331.6185607910156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1719.8250732421875,
+            "w": 331.6120300292969,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1731.75,
+            "w": 200.15518188476562,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1192.362548828125,
+            "w": 8.47265625,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1352.362548828125,
+            "y": 1192.362548828125,
+            "w": 89.50654602050781,
+            "h": 8.475000381469727
+          }
+        ],
+        "scroller": {
+          "x": 515,
+          "y": 143.40000915527344,
+          "w": 1537,
+          "h": 964.6000366210938
+        },
+        "selBg": "rgba(0, 0, 0, 0)",
+        "paintRects": [
+          {
+            "x": 1113.050048828125,
+            "y": 184.1374969482422,
+            "w": 328.7749938964844,
+            "h": 14.40000057220459,
+            "left": "12.9044%",
+            "top": "57.5582%",
+            "widthPct": "74.8918%",
+            "heightPct": "2.16216%"
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 198.53750610351562,
+            "w": 31.962499618530273,
+            "h": 9.949999809265137,
+            "left": "12.2694%",
+            "top": "59.7203%",
+            "widthPct": "7.28262%",
+            "heightPct": "1.49587%"
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": 208.5,
+            "w": 319.63751220703125,
+            "h": 14.387499809265137,
+            "left": "14.9886%",
+            "top": "61.2162%",
+            "widthPct": "72.8106%",
+            "heightPct": "2.16216%"
+          }
+        ],
+        "annRects": [],
+        "toolbar": {
+          "x": 1110.0374755859375,
+          "y": 229.72500610351562,
+          "w": 332.6499938964844,
+          "h": 38.20000076293945
+        }
+      },
+      "dSaved": {
+        "spans": [
+          {
+            "x": 1110.2625732421875,
+            "y": -816.6000366210938,
+            "w": 273.2835998535156,
+            "h": 15.9375
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -798.6124877929688,
+            "w": 303.83544921875,
+            "h": 15.9375
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -780.7000122070312,
+            "w": 54.757423400878906,
+            "h": 15.9375
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -740.0750122070312,
+            "w": 148.2965850830078,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -650.5,
+            "w": 6.650000095367432,
+            "h": 11.96250057220459
+          },
+          {
+            "x": 1116.2249755859375,
+            "y": -650.5,
+            "w": 2.6875,
+            "h": 11.96250057220459
+          },
+          {
+            "x": 1128.175048828125,
+            "y": -650.5,
+            "w": 65.08613586425781,
+            "h": 11.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -621,
+            "w": 331.62158203125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -609.0750122070312,
+            "w": 331.6188659667969,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -597.0875244140625,
+            "w": 331.5967712402344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -585.1625366210938,
+            "w": 331.6076354980469,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -573.1749877929688,
+            "w": 126.4576187133789,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": -561.1875,
+            "w": 319.6006774902344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -549.3375244140625,
+            "w": 331.6159362792969,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -537.3500366210938,
+            "w": 331.5957946777344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -525.3624877929688,
+            "w": 17.12275505065918,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1127.375,
+            "y": -525.3624877929688,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1135.237548828125,
+            "y": -525.3624877929688,
+            "w": 29.435352325439453,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1164.7000732421875,
+            "y": -525.3624877929688,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1172.550048828125,
+            "y": -525.3624877929688,
+            "w": 8.30136775970459,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1180.8499755859375,
+            "y": -525.3624877929688,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1188.7125244140625,
+            "y": -525.3624877929688,
+            "w": 53.38906478881836,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1242.0875244140625,
+            "y": -525.3624877929688,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1249.987548828125,
+            "y": -525.3624877929688,
+            "w": 42.20185470581055,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1292.175048828125,
+            "y": -525.3624877929688,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1300.125,
+            "y": -525.3624877929688,
+            "w": 15.03671932220459,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1315.1375732421875,
+            "y": -525.3624877929688,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1323,
+            "y": -525.3624877929688,
+            "w": 24.478124618530273,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1347.5,
+            "y": -525.3624877929688,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1355.4375,
+            "y": -525.3624877929688,
+            "w": 15.03671932220459,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1370.5,
+            "y": -525.3624877929688,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1378.362548828125,
+            "y": -525.3624877929688,
+            "w": 63.45097732543945,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -513.4375,
+            "w": 125.314453125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": -501.45001220703125,
+            "w": 319.6865234375,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -489.5249938964844,
+            "w": 331.6131896972656,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -477.5375061035156,
+            "w": 331.5796813964844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -465.5500183105469,
+            "w": 331.61474609375,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -453.70001220703125,
+            "w": 263.95849609375,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": -441.7124938964844,
+            "w": 319.6275329589844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -429.7250061035156,
+            "w": 331.5791015625,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -417.8000183105469,
+            "w": 331.6468811035156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -405.8125,
+            "w": 331.6490173339844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -393.88751220703125,
+            "w": 218.51953125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -345.20001220703125,
+            "w": 43.583984375,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1153.8125,
+            "y": -344.9375,
+            "w": 3.737499952316284,
+            "h": 7.474999904632568
+          },
+          {
+            "x": 1162.1875,
+            "y": -345.20001220703125,
+            "w": 2.862499952316284,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -335.2124938964844,
+            "w": 184.5994110107422,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -325.2875061035156,
+            "w": 86.8330078125,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -310.375,
+            "w": 34.11406326293945,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -300.38751220703125,
+            "w": 124.7904281616211,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -277.13751220703125,
+            "w": 4.237500190734863,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1116.625,
+            "y": -277.13751220703125,
+            "w": 4.237500190734863,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1119,
+            "y": -276.4750061035156,
+            "w": 175.9650421142578,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -266.5500183105469,
+            "w": 84.6504898071289,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1197.2750244140625,
+            "y": -266.5500183105469,
+            "w": 178.16299438476562,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1375.4625244140625,
+            "y": -266.5500183105469,
+            "w": 2.362499952316284,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -256.5625,
+            "w": 122.11006164550781,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1433.4500732421875,
+            "y": -276.4750061035156,
+            "w": 8.47265625,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": -138.2624969482422,
+            "w": 319.6965026855469,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -126.3499984741211,
+            "w": 331.6001892089844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -114.36250305175781,
+            "w": 331.64532470703125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -102.4375,
+            "w": 331.5599670410156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -90.51250457763672,
+            "w": 331.5853576660156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -78.5250015258789,
+            "w": 331.6105651855469,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -66.5374984741211,
+            "w": 250.0441436767578,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": -54.61249923706055,
+            "w": 319.66796875,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -42.625,
+            "w": 331.6064453125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -30.712499618530273,
+            "w": 331.60333251953125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -18.725000381469727,
+            "w": 289.087890625,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": -6.800000190734863,
+            "w": 319.669921875,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 5.125,
+            "w": 331.60968017578125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 17.11250114440918,
+            "w": 210.97842407226562,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": 29.100000381469727,
+            "w": 319.6788024902344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 41.025001525878906,
+            "w": 331.6328125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 53.01250076293945,
+            "w": 331.6776428222656,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 65,
+            "w": 331.6332092285156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 76.9124984741211,
+            "w": 331.6690368652344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 88.8375015258789,
+            "w": 275.43048095703125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 121.13750457763672,
+            "w": 6.650000095367432,
+            "h": 11.96250057220459
+          },
+          {
+            "x": 1116.2249755859375,
+            "y": 121.13750457763672,
+            "w": 2.6875,
+            "h": 11.96250057220459
+          },
+          {
+            "x": 1128.175048828125,
+            "y": 121.13750457763672,
+            "w": 234.44668579101562,
+            "h": 11.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 150.6374969482422,
+            "w": 331.646484375,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 162.5625,
+            "w": 331.58380126953125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 174.5500030517578,
+            "w": 331.6302795410156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 186.53750610351562,
+            "w": 331.56280517578125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 198.46250915527344,
+            "w": 31.970703125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": 210.3874969482422,
+            "w": 319.638671875,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 222.375,
+            "w": 331.6455993652344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 234.28750610351562,
+            "w": 331.5853576660156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 246.27500915527344,
+            "w": 331.5757751464844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": 258.20001220703125,
+            "w": 319.6112365722656,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 270.1875,
+            "w": 114.96406555175781,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 302.4250183105469,
+            "w": 14.964746475219727,
+            "h": 11.96250057220459
+          },
+          {
+            "x": 1125.1875,
+            "y": 302.4250183105469,
+            "w": 2.6875,
+            "h": 11.96250057220459
+          },
+          {
+            "x": 1137.175048828125,
+            "y": 302.4250183105469,
+            "w": 133.05166625976562,
+            "h": 11.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 331.9250183105469,
+            "w": 331.6193542480469,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 343.9125061035156,
+            "w": 162.9675750732422,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1273.2125244140625,
+            "y": 343.9125061035156,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1273.2625732421875,
+            "y": 342.1125183105469,
+            "w": 3.6875,
+            "h": 6.637500286102295
+          },
+          {
+            "x": 1276.987548828125,
+            "y": 343.9125061035156,
+            "w": 2.7750000953674316,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 379.4750061035156,
+            "w": 3.137500047683716,
+            "h": 5.637500286102295
+          },
+          {
+            "x": 1113.6375732421875,
+            "y": 380.95001220703125,
+            "w": 328.25048828125,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 390.9375,
+            "w": 331.6618347167969,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 400.9250183105469,
+            "w": 218.12315368652344,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -163.6374969482422,
+            "w": 8.47265625,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1352.362548828125,
+            "y": -163.6374969482422,
+            "w": 89.50654602050781,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": 539.7999877929688,
+            "w": 307.72589111328125,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": 549.7250366210938,
+            "w": 299.33184814453125,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": 566.5,
+            "w": 319.6673889160156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": 578.4249877929688,
+            "w": 319.6105651855469,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 590.4125366210938,
+            "w": 331.63653564453125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 602.3375244140625,
+            "w": 331.6163024902344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 614.3250122070312,
+            "w": 138.91162109375,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": 626.3125,
+            "w": 319.6372985839844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 638.1625366210938,
+            "w": 331.6232604980469,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 650.1500244140625,
+            "w": 331.5934753417969,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 662.1375122070312,
+            "w": 331.6319274902344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 674.0625,
+            "w": 331.6517639160156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 686.0499877929688,
+            "w": 331.6400451660156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 698.0375366210938,
+            "w": 100.5140609741211,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": 709.9625244140625,
+            "w": 319.6268615722656,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 721.9500122070312,
+            "w": 331.6224670410156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 733.7999877929688,
+            "w": 164.61172485351562,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": 745.7875366210938,
+            "w": 319.6280212402344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 757.7750244140625,
+            "w": 331.5990295410156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 769.7000122070312,
+            "w": 250.5603485107422,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": 781.6875,
+            "w": 319.6490173339844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 793.6749877929688,
+            "w": 29.819629669189453,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1140.0625,
+            "y": 792.9500122070312,
+            "w": 9.600000381469727,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1143.3125,
+            "y": 793.6749877929688,
+            "w": 298.5708923339844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 805.6000366210938,
+            "w": 65.89404296875,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 853.8125,
+            "w": 14.964746475219727,
+            "h": 11.96250057220459
+          },
+          {
+            "x": 1125.1875,
+            "y": 853.8125,
+            "w": 2.6875,
+            "h": 11.96250057220459
+          },
+          {
+            "x": 1137.175048828125,
+            "y": 853.8125,
+            "w": 214.45059204101562,
+            "h": 11.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 883.25,
+            "w": 331.6454162597656,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 895.2374877929688,
+            "w": 331.5938415527344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 907.2374877929688,
+            "w": 331.6183776855469,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 919.1500244140625,
+            "w": 28.73164176940918,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1139.0625,
+            "y": 918.4874877929688,
+            "w": 9.600000381469727,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1142.2625732421875,
+            "y": 919.1500244140625,
+            "w": 264.02032470703125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1406.2750244140625,
+            "y": 919.1500244140625,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1411.4124755859375,
+            "y": 919.1500244140625,
+            "w": 30.469532012939453,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 931.1375122070312,
+            "w": 38.98828125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1149.237548828125,
+            "y": 931.1375122070312,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1153.3250732421875,
+            "y": 931.1375122070312,
+            "w": 288.48565673828125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 943.0625,
+            "w": 34.10888671875,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": 955.0499877929688,
+            "w": 319.6630859375,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 966.9750366210938,
+            "w": 46.76064682006836,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1157.0125732421875,
+            "y": 966.9750366210938,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1163.5999755859375,
+            "y": 966.9750366210938,
+            "w": 8.2939453125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1171.9000244140625,
+            "y": 966.9750366210938,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1178.4375,
+            "y": 966.9750366210938,
+            "w": 25.504297256469727,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1203.9375,
+            "y": 966.9750366210938,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1210.5250244140625,
+            "y": 966.9750366210938,
+            "w": 7.789941310882568,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1218.3375244140625,
+            "y": 966.9750366210938,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1224.8875732421875,
+            "y": 966.9750366210938,
+            "w": 35.55781173706055,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1260.4375,
+            "y": 966.9750366210938,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1267.0750732421875,
+            "y": 966.9750366210938,
+            "w": 14.419336318969727,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1281.4749755859375,
+            "y": 966.9750366210938,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1288.050048828125,
+            "y": 966.9750366210938,
+            "w": 31.812305450439453,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1319.8375244140625,
+            "y": 966.9750366210938,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1326.425048828125,
+            "y": 966.9750366210938,
+            "w": 43.25771713256836,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1369.6624755859375,
+            "y": 966.9750366210938,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1376.2874755859375,
+            "y": 966.9750366210938,
+            "w": 8.30918025970459,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1384.5875244140625,
+            "y": 966.9750366210938,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1391.175048828125,
+            "y": 966.9750366210938,
+            "w": 50.6953125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 978.8875122070312,
+            "w": 331.6495056152344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 990.875,
+            "w": 331.6241149902344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1002.875,
+            "w": 331.5771484375,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1014.7875366210938,
+            "w": 331.61114501953125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1026.7750244140625,
+            "w": 122.15303039550781,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": 1038.7000732421875,
+            "w": 118.1578140258789,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1240.375,
+            "y": 1038.0374755859375,
+            "w": 9.600000381469727,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1243.5875244140625,
+            "y": 1038.7000732421875,
+            "w": 198.25137329101562,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1050.6875,
+            "w": 331.6437683105469,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 514.4874877929688,
+            "w": 258.615234375,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1368.8250732421875,
+            "y": 513.8875122070312,
+            "w": 9.71250057220459,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1378.5374755859375,
+            "y": 513.8875122070312,
+            "w": 4.237500190734863,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1433.4500732421875,
+            "y": 514.4874877929688,
+            "w": 8.47265625,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1217.737548828125,
+            "w": 331.62451171875,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1229.6500244140625,
+            "w": 100.3828125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1210.7000732421875,
+            "y": 1228.987548828125,
+            "w": 9.600000381469727,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1213.9124755859375,
+            "y": 1229.6500244140625,
+            "w": 228.01992797851562,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1241.6375732421875,
+            "w": 306.6441345214844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": 1253.5625,
+            "w": 28.73164176940918,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1151,
+            "y": 1252.8250732421875,
+            "w": 9.600000381469727,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1154.25,
+            "y": 1253.5625,
+            "w": 287.6447448730469,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1265.487548828125,
+            "w": 331.6048889160156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1277.4749755859375,
+            "w": 261.50811767578125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": 1289.4625244140625,
+            "w": 124.55908203125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1246.7874755859375,
+            "y": 1288.7249755859375,
+            "w": 9.600000381469727,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1249.987548828125,
+            "y": 1289.4625244140625,
+            "w": 191.8095703125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1301.3875732421875,
+            "w": 331.59747314453125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1313.375,
+            "w": 331.6123962402344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1325.2874755859375,
+            "w": 331.6452331542969,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1337.2750244140625,
+            "w": 331.646484375,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1349.2000732421875,
+            "w": 29.766504287719727,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": 1361.125,
+            "w": 278.74151611328125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1401.0125732421875,
+            "y": 1360.4625244140625,
+            "w": 9.600000381469727,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1404.2625732421875,
+            "y": 1361.125,
+            "w": 37.591796875,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1373.112548828125,
+            "w": 331.6317443847656,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1385.0999755859375,
+            "w": 331.5747985839844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1397.0250244140625,
+            "w": 331.6094665527344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1409.0125732421875,
+            "w": 160.404296875,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1270.7125244140625,
+            "y": 1408.2750244140625,
+            "w": 9.600000381469727,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1273.9124755859375,
+            "y": 1409.0125732421875,
+            "w": 167.98379516601562,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1421,
+            "w": 224.8186492919922,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": 1432.9124755859375,
+            "w": 319.68194580078125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1444.8375244140625,
+            "w": 122.6573257446289,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1232.9124755859375,
+            "y": 1444.0999755859375,
+            "w": 9.600000381469727,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1236.1624755859375,
+            "y": 1444.8375244140625,
+            "w": 205.72305297851562,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1456.8250732421875,
+            "w": 331.638671875,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1468.75,
+            "w": 331.5677795410156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1480.737548828125,
+            "w": 331.6141662597656,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1492.6624755859375,
+            "w": 331.61358642578125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1504.6500244140625,
+            "w": 40.748146057128906,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": 1516.6375732421875,
+            "w": 319.6568298339844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1528.550048828125,
+            "w": 331.572265625,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1540.4749755859375,
+            "w": 331.5889587402344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1552.4625244140625,
+            "w": 331.6273498535156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1564.3875732421875,
+            "w": 331.61505126953125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1576.375,
+            "w": 198.3759765625,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": 1588.300048828125,
+            "w": 319.6109313964844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1600.2874755859375,
+            "w": 331.6490173339844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1612.2750244140625,
+            "w": 331.64434814453125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1624.1875,
+            "w": 76.9122085571289,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": 1636.112548828125,
+            "w": 319.6483459472656,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1648.0999755859375,
+            "w": 54.14590072631836,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1164.3875732421875,
+            "y": 1648.0999755859375,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1171.7249755859375,
+            "y": 1648.0999755859375,
+            "w": 20.534961700439453,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1192.2625732421875,
+            "y": 1648.0999755859375,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1199.550048828125,
+            "y": 1648.0999755859375,
+            "w": 27.269433975219727,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1226.8125,
+            "y": 1648.0999755859375,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1234.0625,
+            "y": 1648.0999755859375,
+            "w": 30.674413681030273,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1264.737548828125,
+            "y": 1648.0999755859375,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1271.987548828125,
+            "y": 1648.0999755859375,
+            "w": 19.474023818969727,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1291.4749755859375,
+            "y": 1648.0999755859375,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1298.7625732421875,
+            "y": 1648.0999755859375,
+            "w": 17.216114044189453,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1315.9749755859375,
+            "y": 1648.0999755859375,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1323.2625732421875,
+            "y": 1648.0999755859375,
+            "w": 18.87744140625,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1342.1375732421875,
+            "y": 1648.0999755859375,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1349.425048828125,
+            "y": 1648.0999755859375,
+            "w": 18.8759765625,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1368.300048828125,
+            "y": 1648.0999755859375,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1375.6375732421875,
+            "y": 1648.0999755859375,
+            "w": 51.186622619628906,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1426.8250732421875,
+            "y": 1648.0999755859375,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1434.0625,
+            "y": 1648.0999755859375,
+            "w": 7.781836032867432,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1660.0250244140625,
+            "w": 331.6327209472656,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1672.0125732421875,
+            "w": 331.66015625,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1683.9375,
+            "w": 331.6083984375,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1695.925048828125,
+            "w": 331.6283264160156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1707.9124755859375,
+            "w": 331.6185607910156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1719.8250732421875,
+            "w": 331.6120300292969,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1731.75,
+            "w": 200.15518188476562,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1192.362548828125,
+            "w": 8.47265625,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1352.362548828125,
+            "y": 1192.362548828125,
+            "w": 89.50654602050781,
+            "h": 8.475000381469727
+          }
+        ],
+        "scroller": {
+          "x": 515,
+          "y": 143.40000915527344,
+          "w": 1537,
+          "h": 964.6000366210938
+        },
+        "selBg": "rgba(0, 0, 0, 0)",
+        "paintRects": [],
+        "annRects": [
+          {
+            "x": 1113.050048828125,
+            "y": 188.0124969482422,
+            "w": 328.7749938964844,
+            "h": 11
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 199.9375,
+            "w": 31.962499618530273,
+            "h": 9
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": 211.8625030517578,
+            "w": 319.63751220703125,
+            "h": 11
+          }
+        ],
+        "toolbar": null
+      }
+    },
+    "zoom150": {
+      "dSel": {
+        "spans": [
+          {
+            "x": 1027.1875,
+            "y": -743.7000122070312,
+            "w": 409.9191589355469,
+            "h": 23.912500381469727
+          },
+          {
+            "x": 1027.1875,
+            "y": -716.7250366210938,
+            "w": 455.7472839355469,
+            "h": 23.912500381469727
+          },
+          {
+            "x": 1027.1875,
+            "y": -689.8500366210938,
+            "w": 82.13603973388672,
+            "h": 23.912500381469727
+          },
+          {
+            "x": 1027.1875,
+            "y": -628.9125366210938,
+            "w": 222.4376983642578,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": -494.5500183105469,
+            "w": 9.96250057220459,
+            "h": 17.9375
+          },
+          {
+            "x": 1036.1500244140625,
+            "y": -494.5500183105469,
+            "w": 4.025000095367432,
+            "h": 17.9375
+          },
+          {
+            "x": 1054.0750732421875,
+            "y": -494.5500183105469,
+            "w": 97.5999984741211,
+            "h": 17.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": -450.2875061035156,
+            "w": 497.4421081542969,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": -432.4125061035156,
+            "w": 497.4258728027344,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": -414.4250183105469,
+            "w": 497.3912048339844,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": -396.5500183105469,
+            "w": 497.41094970703125,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": -378.5625,
+            "w": 189.67724609375,
+            "h": 14.9375
+          },
+          {
+            "x": 1045.112548828125,
+            "y": -360.57501220703125,
+            "w": 479.3897399902344,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": -342.8000183105469,
+            "w": 497.41748046875,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": -324.8125,
+            "w": 497.39141845703125,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": -306.8374938964844,
+            "w": 25.674901962280273,
+            "h": 14.9375
+          },
+          {
+            "x": 1052.8250732421875,
+            "y": -306.8374938964844,
+            "w": 3.3500001430511475,
+            "h": 14.9375
+          },
+          {
+            "x": 1064.6875,
+            "y": -306.8374938964844,
+            "w": 44.15410232543945,
+            "h": 14.9375
+          },
+          {
+            "x": 1108.8375244140625,
+            "y": -306.8374938964844,
+            "w": 3.3500001430511475,
+            "h": 14.9375
+          },
+          {
+            "x": 1120.6375732421875,
+            "y": -306.8374938964844,
+            "w": 12.455273628234863,
+            "h": 14.9375
+          },
+          {
+            "x": 1133.0875244140625,
+            "y": -306.8374938964844,
+            "w": 3.3500001430511475,
+            "h": 14.9375
+          },
+          {
+            "x": 1144.8875732421875,
+            "y": -306.8374938964844,
+            "w": 80.0792007446289,
+            "h": 14.9375
+          },
+          {
+            "x": 1224.9500732421875,
+            "y": -306.8374938964844,
+            "w": 3.3500001430511475,
+            "h": 14.9375
+          },
+          {
+            "x": 1236.8125,
+            "y": -306.8374938964844,
+            "w": 63.309181213378906,
+            "h": 14.9375
+          },
+          {
+            "x": 1300.0750732421875,
+            "y": -306.8374938964844,
+            "w": 3.3500001430511475,
+            "h": 14.9375
+          },
+          {
+            "x": 1311.9375,
+            "y": -306.8374938964844,
+            "w": 22.55615234375,
+            "h": 14.9375
+          },
+          {
+            "x": 1334.550048828125,
+            "y": -306.8374938964844,
+            "w": 3.3500001430511475,
+            "h": 14.9375
+          },
+          {
+            "x": 1346.3375244140625,
+            "y": -306.8374938964844,
+            "w": 36.70654296875,
+            "h": 14.9375
+          },
+          {
+            "x": 1383.050048828125,
+            "y": -306.8374938964844,
+            "w": 3.3500001430511475,
+            "h": 14.9375
+          },
+          {
+            "x": 1394.9749755859375,
+            "y": -306.8374938964844,
+            "w": 22.55615234375,
+            "h": 14.9375
+          },
+          {
+            "x": 1417.5125732421875,
+            "y": -306.8374938964844,
+            "w": 3.3500001430511475,
+            "h": 14.9375
+          },
+          {
+            "x": 1429.3125,
+            "y": -306.8374938964844,
+            "w": 95.1703109741211,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": -288.95001220703125,
+            "w": 187.9677734375,
+            "h": 14.9375
+          },
+          {
+            "x": 1045.112548828125,
+            "y": -270.9750061035156,
+            "w": 479.5146484375,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": -253.08750915527344,
+            "w": 497.42333984375,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": -235.1125030517578,
+            "w": 497.36114501953125,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": -217.125,
+            "w": 497.42578125,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": -199.33750915527344,
+            "w": 395.9331970214844,
+            "h": 14.9375
+          },
+          {
+            "x": 1045.112548828125,
+            "y": -181.3625030517578,
+            "w": 479.4377136230469,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": -163.375,
+            "w": 497.3700256347656,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": -145.5,
+            "w": 497.4761657714844,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": -127.51250457763672,
+            "w": 497.4664001464844,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": -109.63750457763672,
+            "w": 327.7735290527344,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": -36.60000228881836,
+            "w": 65.41826629638672,
+            "h": 12.699999809265137
+          },
+          {
+            "x": 1092.5,
+            "y": -36.20000076293945,
+            "w": 5.599999904632568,
+            "h": 11.199999809265137
+          },
+          {
+            "x": 1105.0750732421875,
+            "y": -36.60000228881836,
+            "w": 4.300000190734863,
+            "h": 12.699999809265137
+          },
+          {
+            "x": 1027.1875,
+            "y": -21.625,
+            "w": 277.06005859375,
+            "h": 12.699999809265137
+          },
+          {
+            "x": 1027.1875,
+            "y": -6.737500190734863,
+            "w": 130.3318328857422,
+            "h": 12.699999809265137
+          },
+          {
+            "x": 1027.1875,
+            "y": 15.637499809265137,
+            "w": 51.20624923706055,
+            "h": 12.699999809265137
+          },
+          {
+            "x": 1027.1875,
+            "y": 30.625,
+            "w": 187.28672790527344,
+            "h": 12.699999809265137
+          },
+          {
+            "x": 1027.1875,
+            "y": 65.48750305175781,
+            "w": 6.400000095367432,
+            "h": 12.699999809265137
+          },
+          {
+            "x": 1036.675048828125,
+            "y": 65.48750305175781,
+            "w": 6.400000095367432,
+            "h": 12.699999809265137
+          },
+          {
+            "x": 1040.300048828125,
+            "y": 66.48750305175781,
+            "w": 264.1122131347656,
+            "h": 12.699999809265137
+          },
+          {
+            "x": 1027.1875,
+            "y": 81.375,
+            "w": 127.0557632446289,
+            "h": 12.699999809265137
+          },
+          {
+            "x": 1154.175048828125,
+            "y": 81.375,
+            "w": 2.8500001430511475,
+            "h": 12.699999809265137
+          },
+          {
+            "x": 1157.737548828125,
+            "y": 81.375,
+            "w": 267.4037170410156,
+            "h": 12.699999809265137
+          },
+          {
+            "x": 1425.0250244140625,
+            "y": 81.375,
+            "w": 3.5375001430511475,
+            "h": 12.699999809265137
+          },
+          {
+            "x": 1027.1875,
+            "y": 96.36250305175781,
+            "w": 183.2742156982422,
+            "h": 12.699999809265137
+          },
+          {
+            "x": 1512.0125732421875,
+            "y": 66.48750305175781,
+            "w": 12.72031307220459,
+            "h": 12.699999809265137
+          },
+          {
+            "x": 1045.112548828125,
+            "y": 267.8000183105469,
+            "w": 479.5363464355469,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 285.6875,
+            "w": 497.39923095703125,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 303.6625061035156,
+            "w": 497.4671936035156,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 321.5500183105469,
+            "w": 497.3374938964844,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 339.4250183105469,
+            "w": 497.3722839355469,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 357.4125061035156,
+            "w": 497.4134826660156,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 375.3999938964844,
+            "w": 375.0632019042969,
+            "h": 14.9375
+          },
+          {
+            "x": 1045.112548828125,
+            "y": 393.2749938964844,
+            "w": 479.5015563964844,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 411.26251220703125,
+            "w": 497.4112243652344,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 429.13751220703125,
+            "w": 497.40771484375,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 447.125,
+            "w": 433.6271667480469,
+            "h": 14.9375
+          },
+          {
+            "x": 1045.112548828125,
+            "y": 465,
+            "w": 479.50665283203125,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 482.88751220703125,
+            "w": 497.41485595703125,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 500.875,
+            "w": 316.4611511230469,
+            "h": 14.9375
+          },
+          {
+            "x": 1045.112548828125,
+            "y": 518.8500366210938,
+            "w": 479.5233459472656,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 536.7374877929688,
+            "w": 497.4501953125,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 554.7125244140625,
+            "w": 497.5129089355469,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 572.7000122070312,
+            "w": 497.4375915527344,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 590.5750122070312,
+            "w": 497.4966735839844,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 608.4625244140625,
+            "w": 413.1382751464844,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 656.9125366210938,
+            "w": 9.96250057220459,
+            "h": 17.9375
+          },
+          {
+            "x": 1036.1500244140625,
+            "y": 656.9125366210938,
+            "w": 4.025000095367432,
+            "h": 17.9375
+          },
+          {
+            "x": 1054.0750732421875,
+            "y": 656.9125366210938,
+            "w": 351.5816345214844,
+            "h": 17.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 701.1625366210938,
+            "w": 497.4664001464844,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 719.0499877929688,
+            "w": 497.3761901855469,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 737.0375366210938,
+            "w": 497.4458923339844,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 755.0125122070312,
+            "w": 497.3365173339844,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 772.9000244140625,
+            "w": 47.94179916381836,
+            "h": 14.9375
+          },
+          {
+            "x": 1045.112548828125,
+            "y": 790.7750244140625,
+            "w": 479.4599609375,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 808.7625122070312,
+            "w": 497.4677734375,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 826.6375122070312,
+            "w": 497.376953125,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 844.625,
+            "w": 497.3617248535156,
+            "h": 14.9375
+          },
+          {
+            "x": 1045.112548828125,
+            "y": 862.5125122070312,
+            "w": 479.4084167480469,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 880.4874877929688,
+            "w": 172.44384765625,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 928.8375244140625,
+            "w": 22.43017578125,
+            "h": 17.9375
+          },
+          {
+            "x": 1049.5875244140625,
+            "y": 928.8375244140625,
+            "w": 4.025000095367432,
+            "h": 17.9375
+          },
+          {
+            "x": 1067.5875244140625,
+            "y": 928.8375244140625,
+            "w": 199.5322265625,
+            "h": 17.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 973.1000366210938,
+            "w": 497.43194580078125,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 991.0750122070312,
+            "w": 244.45498657226562,
+            "h": 14.9375
+          },
+          {
+            "x": 1271.612548828125,
+            "y": 991.0750122070312,
+            "w": 3.3500001430511475,
+            "h": 14.9375
+          },
+          {
+            "x": 1271.675048828125,
+            "y": 988.375,
+            "w": 5.537499904632568,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1277.2750244140625,
+            "y": 988.375,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1277.2750244140625,
+            "y": 991.0750122070312,
+            "w": 4.162499904632568,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 1044.425048828125,
+            "w": 4.700000286102295,
+            "h": 8.46250057220459
+          },
+          {
+            "x": 1032.2625732421875,
+            "y": 1046.625,
+            "w": 492.68408203125,
+            "h": 12.699999809265137
+          },
+          {
+            "x": 1027.1875,
+            "y": 1061.612548828125,
+            "w": 497.7990417480469,
+            "h": 12.699999809265137
+          },
+          {
+            "x": 1027.1875,
+            "y": 1076.5875244140625,
+            "w": 327.3902282714844,
+            "h": 12.699999809265137
+          },
+          {
+            "x": 1027.1875,
+            "y": 229.7375030517578,
+            "w": 12.72031307220459,
+            "h": 12.699999809265137
+          },
+          {
+            "x": 1039.9000244140625,
+            "y": 229.7375030517578,
+            "w": 2.8500001430511475,
+            "h": 12.699999809265137
+          },
+          {
+            "x": 1390.362548828125,
+            "y": 229.7375030517578,
+            "w": 134.34170532226562,
+            "h": 12.699999809265137
+          },
+          {
+            "x": 1045.112548828125,
+            "y": 1278.9000244140625,
+            "w": 461.8800964355469,
+            "h": 12.699999809265137
+          },
+          {
+            "x": 1045.112548828125,
+            "y": 1293.7874755859375,
+            "w": 449.2746276855469,
+            "h": 12.699999809265137
+          },
+          {
+            "x": 1045.112548828125,
+            "y": 1318.9625244140625,
+            "w": 479.5044860839844,
+            "h": 14.9375
+          },
+          {
+            "x": 1045.112548828125,
+            "y": 1336.8499755859375,
+            "w": 479.40850830078125,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 1354.8250732421875,
+            "w": 497.4435729980469,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 1372.7125244140625,
+            "w": 497.41583251953125,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 1390.6875,
+            "w": 208.36865234375,
+            "h": 14.9375
+          },
+          {
+            "x": 1045.112548828125,
+            "y": 1408.675048828125,
+            "w": 479.4468688964844,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 1426.4500732421875,
+            "w": 497.42852783203125,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 1444.4375,
+            "w": 497.3890686035156,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 1462.4124755859375,
+            "w": 497.4424743652344,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 1480.300048828125,
+            "w": 497.47784423828125,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 1498.2874755859375,
+            "w": 497.46270751953125,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 1516.2625732421875,
+            "w": 150.7673797607422,
+            "h": 14.9375
+          },
+          {
+            "x": 1045.112548828125,
+            "y": 1534.1500244140625,
+            "w": 479.43829345703125,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 1552.125,
+            "w": 497.4310607910156,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 1569.9124755859375,
+            "w": 246.91592407226562,
+            "h": 14.9375
+          },
+          {
+            "x": 1045.112548828125,
+            "y": 1587.8875732421875,
+            "w": 479.4424743652344,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 1605.875,
+            "w": 497.3946228027344,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 1623.7625732421875,
+            "w": 375.8310546875,
+            "h": 14.9375
+          },
+          {
+            "x": 1045.112548828125,
+            "y": 1641.737548828125,
+            "w": 479.4716796875,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 1659.7249755859375,
+            "w": 44.73115158081055,
+            "h": 14.9375
+          },
+          {
+            "x": 1071.9375,
+            "y": 1658.625,
+            "w": 14.9375,
+            "h": 14.9375
+          },
+          {
+            "x": 1076.75,
+            "y": 1659.7249755859375,
+            "w": 447.8556823730469,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 1677.5999755859375,
+            "w": 98.84062957763672,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 1749.925048828125,
+            "w": 22.43017578125,
+            "h": 17.9375
+          },
+          {
+            "x": 1049.5875244140625,
+            "y": 1749.925048828125,
+            "w": 4.025000095367432,
+            "h": 17.9375
+          },
+          {
+            "x": 1067.5875244140625,
+            "y": 1749.925048828125,
+            "w": 321.5978698730469,
+            "h": 17.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 1794.0875244140625,
+            "w": 497.4738464355469,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 1812.0625,
+            "w": 497.3951110839844,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 1830.050048828125,
+            "w": 497.4276428222656,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 1847.9375,
+            "w": 43.08730697631836,
+            "h": 14.9375
+          },
+          {
+            "x": 1070.3499755859375,
+            "y": 1846.9375,
+            "w": 14.9375,
+            "h": 14.9375
+          },
+          {
+            "x": 1075.2249755859375,
+            "y": 1847.9375,
+            "w": 396.0176696777344,
+            "h": 14.9375
+          },
+          {
+            "x": 1471.2249755859375,
+            "y": 1847.9375,
+            "w": 3.3500001430511475,
+            "h": 14.9375
+          },
+          {
+            "x": 1478.9375,
+            "y": 1847.9375,
+            "w": 45.7109375,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 1865.9124755859375,
+            "w": 58.48173904418945,
+            "h": 14.9375
+          },
+          {
+            "x": 1085.6375732421875,
+            "y": 1865.9124755859375,
+            "w": 3.3500001430511475,
+            "h": 14.9375
+          },
+          {
+            "x": 1091.8375244140625,
+            "y": 1865.9124755859375,
+            "w": 432.724609375,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 1883.800048828125,
+            "w": 51.16103744506836,
+            "h": 14.9375
+          },
+          {
+            "x": 1045.112548828125,
+            "y": 1901.7750244140625,
+            "w": 479.4896545410156,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 1919.6624755859375,
+            "w": 70.1385726928711,
+            "h": 14.9375
+          },
+          {
+            "x": 1097.300048828125,
+            "y": 1919.6624755859375,
+            "w": 3.3500001430511475,
+            "h": 14.9375
+          },
+          {
+            "x": 1107.1875,
+            "y": 1919.6624755859375,
+            "w": 12.43418025970459,
+            "h": 14.9375
+          },
+          {
+            "x": 1119.6500244140625,
+            "y": 1919.6624755859375,
+            "w": 3.3500001430511475,
+            "h": 14.9375
+          },
+          {
+            "x": 1129.4625244140625,
+            "y": 1919.6624755859375,
+            "w": 38.2578125,
+            "h": 14.9375
+          },
+          {
+            "x": 1167.75,
+            "y": 1919.6624755859375,
+            "w": 3.3500001430511475,
+            "h": 14.9375
+          },
+          {
+            "x": 1177.6375732421875,
+            "y": 1919.6624755859375,
+            "w": 11.677050590515137,
+            "h": 14.9375
+          },
+          {
+            "x": 1189.300048828125,
+            "y": 1919.6624755859375,
+            "w": 3.3500001430511475,
+            "h": 14.9375
+          },
+          {
+            "x": 1199.125,
+            "y": 1919.6624755859375,
+            "w": 53.340431213378906,
+            "h": 14.9375
+          },
+          {
+            "x": 1252.4375,
+            "y": 1919.6624755859375,
+            "w": 3.3500001430511475,
+            "h": 14.9375
+          },
+          {
+            "x": 1262.3875732421875,
+            "y": 1919.6624755859375,
+            "w": 21.629688262939453,
+            "h": 14.9375
+          },
+          {
+            "x": 1284,
+            "y": 1919.6624755859375,
+            "w": 3.3500001430511475,
+            "h": 14.9375
+          },
+          {
+            "x": 1293.8875732421875,
+            "y": 1919.6624755859375,
+            "w": 47.72011947631836,
+            "h": 14.9375
+          },
+          {
+            "x": 1341.5999755859375,
+            "y": 1919.6624755859375,
+            "w": 3.3500001430511475,
+            "h": 14.9375
+          },
+          {
+            "x": 1351.4124755859375,
+            "y": 1919.6624755859375,
+            "w": 64.89336395263672,
+            "h": 14.9375
+          },
+          {
+            "x": 1416.3250732421875,
+            "y": 1919.6624755859375,
+            "w": 3.3500001430511475,
+            "h": 14.9375
+          },
+          {
+            "x": 1426.2750244140625,
+            "y": 1919.6624755859375,
+            "w": 12.451367378234863,
+            "h": 14.9375
+          },
+          {
+            "x": 1438.737548828125,
+            "y": 1919.6624755859375,
+            "w": 3.3500001430511475,
+            "h": 14.9375
+          },
+          {
+            "x": 1448.550048828125,
+            "y": 1919.6624755859375,
+            "w": 76.0372085571289,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 1937.5374755859375,
+            "w": 497.46661376953125,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 1955.5250244140625,
+            "w": 497.4219665527344,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 1973.5125732421875,
+            "w": 497.369140625,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 1991.3875732421875,
+            "w": 497.41455078125,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 2009.375,
+            "w": 183.22998046875,
+            "h": 14.9375
+          },
+          {
+            "x": 1045.112548828125,
+            "y": 2027.25,
+            "w": 177.228515625,
+            "h": 14.9375
+          },
+          {
+            "x": 1222.3125,
+            "y": 2026.25,
+            "w": 14.9375,
+            "h": 14.9375
+          },
+          {
+            "x": 1227.1875,
+            "y": 2027.25,
+            "w": 297.36846923828125,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 2045.237548828125,
+            "w": 497.4616394042969,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 1240.9375,
+            "w": 388.17071533203125,
+            "h": 12.699999809265137
+          },
+          {
+            "x": 1415.0750732421875,
+            "y": 1240.0374755859375,
+            "w": 14.56699275970459,
+            "h": 12.699999809265137
+          },
+          {
+            "x": 1429.6375732421875,
+            "y": 1240.0374755859375,
+            "w": 6.400000095367432,
+            "h": 12.699999809265137
+          },
+          {
+            "x": 1512.0125732421875,
+            "y": 1240.9375,
+            "w": 12.72031307220459,
+            "h": 12.699999809265137
+          },
+          {
+            "x": 1027.1875,
+            "y": 2289.800048828125,
+            "w": 497.4406433105469,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 2307.6875,
+            "w": 150.5810546875,
+            "h": 14.9375
+          },
+          {
+            "x": 1177.9000244140625,
+            "y": 2306.6875,
+            "w": 14.9375,
+            "h": 14.9375
+          },
+          {
+            "x": 1182.6500244140625,
+            "y": 2307.6875,
+            "w": 342.0314636230469,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 2325.66259765625,
+            "w": 459.9720764160156,
+            "h": 14.9375
+          },
+          {
+            "x": 1045.112548828125,
+            "y": 2343.550048828125,
+            "w": 43.08730697631836,
+            "h": 14.9375
+          },
+          {
+            "x": 1088.3375244140625,
+            "y": 2342.449951171875,
+            "w": 14.9375,
+            "h": 14.9375
+          },
+          {
+            "x": 1093.1500244140625,
+            "y": 2343.550048828125,
+            "w": 431.4750061035156,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 2361.425048828125,
+            "w": 497.3974609375,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 2379.41259765625,
+            "w": 392.2663269042969,
+            "h": 14.9375
+          },
+          {
+            "x": 1045.112548828125,
+            "y": 2397.400146484375,
+            "w": 186.83340454101562,
+            "h": 14.9375
+          },
+          {
+            "x": 1231.9375,
+            "y": 2396.300048828125,
+            "w": 14.9375,
+            "h": 14.9375
+          },
+          {
+            "x": 1236.8125,
+            "y": 2397.400146484375,
+            "w": 287.7087097167969,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 2415.275146484375,
+            "w": 497.3932800292969,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 2433.262451171875,
+            "w": 497.4111328125,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 2451.137451171875,
+            "w": 497.46826171875,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 2469.125,
+            "w": 497.4591979980469,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 2487,
+            "w": 44.64091873168945,
+            "h": 14.9375
+          },
+          {
+            "x": 1045.112548828125,
+            "y": 2504.887451171875,
+            "w": 418.11016845703125,
+            "h": 14.9375
+          },
+          {
+            "x": 1463.375,
+            "y": 2503.887451171875,
+            "w": 14.9375,
+            "h": 14.9375
+          },
+          {
+            "x": 1468.1875,
+            "y": 2504.887451171875,
+            "w": 56.38076400756836,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 2522.875,
+            "w": 497.4552917480469,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 2540.85009765625,
+            "w": 497.3620300292969,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 2558.737548828125,
+            "w": 497.4022521972656,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 2576.712646484375,
+            "w": 240.611328125,
+            "h": 14.9375
+          },
+          {
+            "x": 1267.8499755859375,
+            "y": 2575.612548828125,
+            "w": 14.9375,
+            "h": 14.9375
+          },
+          {
+            "x": 1272.6624755859375,
+            "y": 2576.712646484375,
+            "w": 251.96728515625,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 2594.699951171875,
+            "w": 337.2294006347656,
+            "h": 14.9375
+          },
+          {
+            "x": 1045.112548828125,
+            "y": 2612.574951171875,
+            "w": 479.5093688964844,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 2630.462646484375,
+            "w": 183.9921875,
+            "h": 14.9375
+          },
+          {
+            "x": 1211.175048828125,
+            "y": 2629.362548828125,
+            "w": 14.9375,
+            "h": 14.9375
+          },
+          {
+            "x": 1216.0625,
+            "y": 2630.462646484375,
+            "w": 308.5811462402344,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 2648.4375,
+            "w": 497.4579162597656,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 2666.324951171875,
+            "w": 497.3438415527344,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 2684.3125,
+            "w": 497.4209899902344,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 2702.1875,
+            "w": 497.4151306152344,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 2720.175048828125,
+            "w": 61.11758041381836,
+            "h": 14.9375
+          },
+          {
+            "x": 1045.112548828125,
+            "y": 2738.150146484375,
+            "w": 479.4798889160156,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 2756.03759765625,
+            "w": 497.35968017578125,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 2773.91259765625,
+            "w": 497.3798828125,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 2791.900146484375,
+            "w": 497.4356384277344,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 2809.78759765625,
+            "w": 497.4131774902344,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 2827.762451171875,
+            "w": 297.5653381347656,
+            "h": 14.9375
+          },
+          {
+            "x": 1045.112548828125,
+            "y": 2845.650146484375,
+            "w": 479.41064453125,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 2863.625,
+            "w": 497.47003173828125,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 2881.612548828125,
+            "w": 497.4579162597656,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 2899.487548828125,
+            "w": 115.3597640991211,
+            "h": 14.9375
+          },
+          {
+            "x": 1045.112548828125,
+            "y": 2917.375,
+            "w": 479.47149658203125,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 2935.35009765625,
+            "w": 81.20879364013672,
+            "h": 14.9375
+          },
+          {
+            "x": 1108.375,
+            "y": 2935.35009765625,
+            "w": 3.3500001430511475,
+            "h": 14.9375
+          },
+          {
+            "x": 1119.3875732421875,
+            "y": 2935.35009765625,
+            "w": 30.799413681030273,
+            "h": 14.9375
+          },
+          {
+            "x": 1150.1624755859375,
+            "y": 2935.35009765625,
+            "w": 3.3500001430511475,
+            "h": 14.9375
+          },
+          {
+            "x": 1161.0999755859375,
+            "y": 2935.35009765625,
+            "w": 40.89297103881836,
+            "h": 14.9375
+          },
+          {
+            "x": 1202.0250244140625,
+            "y": 2935.35009765625,
+            "w": 3.3500001430511475,
+            "h": 14.9375
+          },
+          {
+            "x": 1212.8875732421875,
+            "y": 2935.35009765625,
+            "w": 46.00263595581055,
+            "h": 14.9375
+          },
+          {
+            "x": 1258.8875732421875,
+            "y": 2935.35009765625,
+            "w": 3.3500001430511475,
+            "h": 14.9375
+          },
+          {
+            "x": 1269.8250732421875,
+            "y": 2935.35009765625,
+            "w": 29.208398818969727,
+            "h": 14.9375
+          },
+          {
+            "x": 1299.0250244140625,
+            "y": 2935.35009765625,
+            "w": 3.3500001430511475,
+            "h": 14.9375
+          },
+          {
+            "x": 1309.9625244140625,
+            "y": 2935.35009765625,
+            "w": 25.82588005065918,
+            "h": 14.9375
+          },
+          {
+            "x": 1335.7249755859375,
+            "y": 2935.35009765625,
+            "w": 3.3500001430511475,
+            "h": 14.9375
+          },
+          {
+            "x": 1346.675048828125,
+            "y": 2935.35009765625,
+            "w": 28.313085556030273,
+            "h": 14.9375
+          },
+          {
+            "x": 1375.0125732421875,
+            "y": 2935.35009765625,
+            "w": 3.3500001430511475,
+            "h": 14.9375
+          },
+          {
+            "x": 1385.9500732421875,
+            "y": 2935.35009765625,
+            "w": 28.3115234375,
+            "h": 14.9375
+          },
+          {
+            "x": 1414.2874755859375,
+            "y": 2935.35009765625,
+            "w": 3.3500001430511475,
+            "h": 14.9375
+          },
+          {
+            "x": 1425.2249755859375,
+            "y": 2935.35009765625,
+            "w": 76.77949523925781,
+            "h": 14.9375
+          },
+          {
+            "x": 1502.0625,
+            "y": 2935.35009765625,
+            "w": 3.3500001430511475,
+            "h": 14.9375
+          },
+          {
+            "x": 1512.9375,
+            "y": 2935.35009765625,
+            "w": 11.680956840515137,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 2953.237548828125,
+            "w": 497.4447326660156,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 2971.22509765625,
+            "w": 497.47784423828125,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 2989.10009765625,
+            "w": 497.4093933105469,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 3007.087646484375,
+            "w": 497.43438720703125,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 3025.0625,
+            "w": 497.4136657714844,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 3042.949951171875,
+            "w": 497.40802001953125,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 3060.824951171875,
+            "w": 300.2352600097656,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 2251.737548828125,
+            "w": 12.72031307220459,
+            "h": 12.699999809265137
+          },
+          {
+            "x": 1039.9000244140625,
+            "y": 2251.737548828125,
+            "w": 2.8500001430511475,
+            "h": 12.699999809265137
+          },
+          {
+            "x": 1390.362548828125,
+            "y": 2251.737548828125,
+            "w": 134.34170532226562,
+            "h": 12.699999809265137
+          }
+        ],
+        "scroller": {
+          "x": 515,
+          "y": 143.40000915527344,
+          "w": 1537,
+          "h": 964.6000366210938
+        },
+        "selBg": "rgba(0, 0, 0, 0)",
+        "paintRects": [
+          {
+            "x": 1031.375,
+            "y": 751.0125122070312,
+            "w": 493.13751220703125,
+            "h": 21.587499618530273,
+            "left": "12.8956%",
+            "top": "57.5188%",
+            "widthPct": "74.8319%",
+            "heightPct": "2.16216%"
+          },
+          {
+            "x": 1027.175048828125,
+            "y": 772.6000366210938,
+            "w": 47.9375,
+            "h": 21.587499618530273,
+            "left": "12.2591%",
+            "top": "59.6809%",
+            "widthPct": "7.27493%",
+            "heightPct": "2.16216%"
+          },
+          {
+            "x": 1045.112548828125,
+            "y": 794.2125244140625,
+            "w": 479.45001220703125,
+            "h": 21.587499618530273,
+            "left": "14.9791%",
+            "top": "61.8431%",
+            "widthPct": "72.7557%",
+            "heightPct": "2.16216%"
+          },
+          {
+            "x": 1027.175048828125,
+            "y": 815.7999877929688,
+            "w": 490.07501220703125,
+            "h": 21.587499618530273,
+            "left": "12.2591%",
+            "top": "64.0052%",
+            "widthPct": "74.3683%",
+            "heightPct": "2.16216%"
+          }
+        ],
+        "annRects": [
+          {
+            "x": 1031.375,
+            "y": 756.9750366210938,
+            "w": 493.13751220703125,
+            "h": 15.987500190734863
+          },
+          {
+            "x": 1027.175048828125,
+            "y": 774.8624877929688,
+            "w": 47.9375,
+            "h": 12.987500190734863
+          },
+          {
+            "x": 1045.112548828125,
+            "y": 792.7374877929688,
+            "w": 479.45001220703125,
+            "h": 15.987500190734863
+          }
+        ],
+        "toolbar": {
+          "x": 1027,
+          "y": 708.0625,
+          "w": 332.6499938964844,
+          "h": 38.20000076293945
+        }
+      }
+    },
+    "medium": {
+      "existing": {
+        "spans": [
+          {
+            "x": 1079.362548828125,
+            "y": -621.4000244140625,
+            "w": 273.2835998535156,
+            "h": 15.9375
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -603.4125366210938,
+            "w": 303.83544921875,
+            "h": 15.9375
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -585.5,
+            "w": 54.757423400878906,
+            "h": 15.9375
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -544.875,
+            "w": 148.2965850830078,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -455.3000183105469,
+            "w": 6.650000095367432,
+            "h": 11.96250057220459
+          },
+          {
+            "x": 1085.3250732421875,
+            "y": -455.3000183105469,
+            "w": 2.6875,
+            "h": 11.96250057220459
+          },
+          {
+            "x": 1097.2750244140625,
+            "y": -455.3000183105469,
+            "w": 65.08613586425781,
+            "h": 11.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -425.8000183105469,
+            "w": 331.62158203125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -413.875,
+            "w": 331.6188659667969,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -401.88751220703125,
+            "w": 331.5967712402344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -389.9624938964844,
+            "w": 331.6076354980469,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -377.9750061035156,
+            "w": 126.4576187133789,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": -365.9875183105469,
+            "w": 319.6006774902344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -354.13751220703125,
+            "w": 331.6159362792969,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -342.1499938964844,
+            "w": 331.5957946777344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -330.1625061035156,
+            "w": 17.12275505065918,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1096.4749755859375,
+            "y": -330.1625061035156,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1104.3375244140625,
+            "y": -330.1625061035156,
+            "w": 29.435352325439453,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1133.800048828125,
+            "y": -330.1625061035156,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1141.6500244140625,
+            "y": -330.1625061035156,
+            "w": 8.30136775970459,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1149.9500732421875,
+            "y": -330.1625061035156,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1157.8125,
+            "y": -330.1625061035156,
+            "w": 53.38906478881836,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1211.1875,
+            "y": -330.1625061035156,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1219.0875244140625,
+            "y": -330.1625061035156,
+            "w": 42.20185470581055,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1261.2750244140625,
+            "y": -330.1625061035156,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1269.2249755859375,
+            "y": -330.1625061035156,
+            "w": 15.03671932220459,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1284.237548828125,
+            "y": -330.1625061035156,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1292.0999755859375,
+            "y": -330.1625061035156,
+            "w": 24.478124618530273,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1316.5999755859375,
+            "y": -330.1625061035156,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1324.5374755859375,
+            "y": -330.1625061035156,
+            "w": 15.03671932220459,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1339.5999755859375,
+            "y": -330.1625061035156,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1347.4625244140625,
+            "y": -330.1625061035156,
+            "w": 63.45097732543945,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -318.2375183105469,
+            "w": 125.314453125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": -306.25,
+            "w": 319.6865234375,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -294.32501220703125,
+            "w": 331.6131896972656,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -282.3374938964844,
+            "w": 331.5796813964844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -270.3500061035156,
+            "w": 331.61474609375,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -258.5,
+            "w": 263.95849609375,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": -246.5124969482422,
+            "w": 319.6275329589844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -234.52500915527344,
+            "w": 331.5791015625,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -222.60000610351562,
+            "w": 331.6468811035156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -210.6125030517578,
+            "w": 331.6490173339844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -198.6875,
+            "w": 218.51953125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -150,
+            "w": 43.583984375,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1122.9124755859375,
+            "y": -149.7375030517578,
+            "w": 3.737499952316284,
+            "h": 7.474999904632568
+          },
+          {
+            "x": 1131.2874755859375,
+            "y": -150,
+            "w": 2.862499952316284,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -140.0124969482422,
+            "w": 184.5994110107422,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -130.08750915527344,
+            "w": 86.8330078125,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -115.17500305175781,
+            "w": 34.11406326293945,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -105.1875,
+            "w": 124.7904281616211,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -81.9375,
+            "w": 4.237500190734863,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1085.7249755859375,
+            "y": -81.9375,
+            "w": 4.237500190734863,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1088.0999755859375,
+            "y": -81.2750015258789,
+            "w": 175.9650421142578,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -71.3499984741211,
+            "w": 84.6504898071289,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1166.375,
+            "y": -71.3499984741211,
+            "w": 178.16299438476562,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1344.5625,
+            "y": -71.3499984741211,
+            "w": 2.362499952316284,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -61.36249923706055,
+            "w": 122.11006164550781,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1402.550048828125,
+            "y": -81.2750015258789,
+            "w": 8.47265625,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 56.9375,
+            "w": 319.6965026855469,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 68.8499984741211,
+            "w": 331.6001892089844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 80.8375015258789,
+            "w": 331.64532470703125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 92.76250457763672,
+            "w": 331.5599670410156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 104.6875,
+            "w": 331.5853576660156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 116.67500305175781,
+            "w": 331.6105651855469,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 128.66250610351562,
+            "w": 250.0441436767578,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 140.58750915527344,
+            "w": 319.66796875,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 152.5749969482422,
+            "w": 331.6064453125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 164.4875030517578,
+            "w": 331.60333251953125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 176.47500610351562,
+            "w": 289.087890625,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 188.40000915527344,
+            "w": 319.669921875,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 200.3249969482422,
+            "w": 331.60968017578125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 212.3125,
+            "w": 210.97842407226562,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 224.3000030517578,
+            "w": 319.6788024902344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 236.22500610351562,
+            "w": 331.6328125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 248.21250915527344,
+            "w": 331.6776428222656,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 260.20001220703125,
+            "w": 331.6332092285156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 272.1125183105469,
+            "w": 331.6690368652344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 284.0375061035156,
+            "w": 275.43048095703125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 316.3374938964844,
+            "w": 6.650000095367432,
+            "h": 11.96250057220459
+          },
+          {
+            "x": 1085.3250732421875,
+            "y": 316.3374938964844,
+            "w": 2.6875,
+            "h": 11.96250057220459
+          },
+          {
+            "x": 1097.2750244140625,
+            "y": 316.3374938964844,
+            "w": 234.44668579101562,
+            "h": 11.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 345.8374938964844,
+            "w": 331.646484375,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 357.76251220703125,
+            "w": 331.58380126953125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 369.75,
+            "w": 331.6302795410156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 381.7375183105469,
+            "w": 331.56280517578125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 393.6625061035156,
+            "w": 31.970703125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 405.5874938964844,
+            "w": 319.638671875,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 417.57501220703125,
+            "w": 331.6455993652344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 429.4875183105469,
+            "w": 331.5853576660156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 441.4750061035156,
+            "w": 331.5757751464844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 453.3999938964844,
+            "w": 319.6112365722656,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 465.38751220703125,
+            "w": 114.96406555175781,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 497.625,
+            "w": 14.964746475219727,
+            "h": 11.96250057220459
+          },
+          {
+            "x": 1094.2874755859375,
+            "y": 497.625,
+            "w": 2.6875,
+            "h": 11.96250057220459
+          },
+          {
+            "x": 1106.2750244140625,
+            "y": 497.625,
+            "w": 133.05166625976562,
+            "h": 11.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 527.125,
+            "w": 331.6193542480469,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 539.1124877929688,
+            "w": 162.9675750732422,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1242.3125,
+            "y": 539.1124877929688,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1242.362548828125,
+            "y": 537.3125,
+            "w": 3.6875,
+            "h": 6.637500286102295
+          },
+          {
+            "x": 1246.0875244140625,
+            "y": 539.1124877929688,
+            "w": 2.7750000953674316,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 574.6749877929688,
+            "w": 3.137500047683716,
+            "h": 5.637500286102295
+          },
+          {
+            "x": 1082.737548828125,
+            "y": 576.1500244140625,
+            "w": 328.25048828125,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 586.1375122070312,
+            "w": 331.6618347167969,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 596.125,
+            "w": 218.12315368652344,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 31.5625,
+            "w": 8.47265625,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1321.4625244140625,
+            "y": 31.5625,
+            "w": 89.50654602050781,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 735,
+            "w": 307.72589111328125,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 744.9249877929688,
+            "w": 299.33184814453125,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 761.7000122070312,
+            "w": 319.6673889160156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 773.625,
+            "w": 319.6105651855469,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 785.6124877929688,
+            "w": 331.63653564453125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 797.5375366210938,
+            "w": 331.6163024902344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 809.5250244140625,
+            "w": 138.91162109375,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 821.5125122070312,
+            "w": 319.6372985839844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 833.3624877929688,
+            "w": 331.6232604980469,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 845.3500366210938,
+            "w": 331.5934753417969,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 857.3375244140625,
+            "w": 331.6319274902344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 869.2625122070312,
+            "w": 331.6517639160156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 881.25,
+            "w": 331.6400451660156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 893.2374877929688,
+            "w": 100.5140609741211,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 905.1625366210938,
+            "w": 319.6268615722656,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 917.1500244140625,
+            "w": 331.6224670410156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 929,
+            "w": 164.61172485351562,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 940.9874877929688,
+            "w": 319.6280212402344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 952.9750366210938,
+            "w": 331.5990295410156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 964.9000244140625,
+            "w": 250.5603485107422,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 976.8875122070312,
+            "w": 319.6490173339844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 988.875,
+            "w": 29.819629669189453,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1109.1624755859375,
+            "y": 988.1500244140625,
+            "w": 9.600000381469727,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1112.4124755859375,
+            "y": 988.875,
+            "w": 298.5708923339844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1000.7999877929688,
+            "w": 65.89404296875,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1049.0125732421875,
+            "w": 14.964746475219727,
+            "h": 11.96250057220459
+          },
+          {
+            "x": 1094.2874755859375,
+            "y": 1049.0125732421875,
+            "w": 2.6875,
+            "h": 11.96250057220459
+          },
+          {
+            "x": 1106.2750244140625,
+            "y": 1049.0125732421875,
+            "w": 214.45059204101562,
+            "h": 11.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1078.4500732421875,
+            "w": 331.6454162597656,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1090.4375,
+            "w": 331.5938415527344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1102.4375,
+            "w": 331.6183776855469,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1114.3499755859375,
+            "w": 28.73164176940918,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1108.1624755859375,
+            "y": 1113.6875,
+            "w": 9.600000381469727,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1111.362548828125,
+            "y": 1114.3499755859375,
+            "w": 264.02032470703125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1375.375,
+            "y": 1114.3499755859375,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1380.5125732421875,
+            "y": 1114.3499755859375,
+            "w": 30.469532012939453,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1126.3375244140625,
+            "w": 38.98828125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1118.3375244140625,
+            "y": 1126.3375244140625,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.425048828125,
+            "y": 1126.3375244140625,
+            "w": 288.48565673828125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1138.2625732421875,
+            "w": 34.10888671875,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 1150.25,
+            "w": 319.6630859375,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1162.175048828125,
+            "w": 46.76064682006836,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1126.112548828125,
+            "y": 1162.175048828125,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1132.7000732421875,
+            "y": 1162.175048828125,
+            "w": 8.2939453125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1141,
+            "y": 1162.175048828125,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1147.5374755859375,
+            "y": 1162.175048828125,
+            "w": 25.504297256469727,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1173.0374755859375,
+            "y": 1162.175048828125,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1179.625,
+            "y": 1162.175048828125,
+            "w": 7.789941310882568,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1187.4375,
+            "y": 1162.175048828125,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1193.987548828125,
+            "y": 1162.175048828125,
+            "w": 35.55781173706055,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1229.5374755859375,
+            "y": 1162.175048828125,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1236.175048828125,
+            "y": 1162.175048828125,
+            "w": 14.419336318969727,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1250.5750732421875,
+            "y": 1162.175048828125,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1257.1500244140625,
+            "y": 1162.175048828125,
+            "w": 31.812305450439453,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1288.9375,
+            "y": 1162.175048828125,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1295.5250244140625,
+            "y": 1162.175048828125,
+            "w": 43.25771713256836,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1338.7625732421875,
+            "y": 1162.175048828125,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1345.3875732421875,
+            "y": 1162.175048828125,
+            "w": 8.30918025970459,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1353.6875,
+            "y": 1162.175048828125,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1360.2750244140625,
+            "y": 1162.175048828125,
+            "w": 50.6953125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1174.0875244140625,
+            "w": 331.6495056152344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1186.0750732421875,
+            "w": 331.6241149902344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1198.0750732421875,
+            "w": 331.5771484375,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1209.987548828125,
+            "w": 331.61114501953125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1221.9749755859375,
+            "w": 122.15303039550781,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 1233.9000244140625,
+            "w": 118.1578140258789,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1209.4749755859375,
+            "y": 1233.237548828125,
+            "w": 9.600000381469727,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1212.6875,
+            "y": 1233.9000244140625,
+            "w": 198.25137329101562,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1245.8875732421875,
+            "w": 331.6437683105469,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 709.6875,
+            "w": 258.615234375,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1337.925048828125,
+            "y": 709.0875244140625,
+            "w": 9.71250057220459,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1347.6375732421875,
+            "y": 709.0875244140625,
+            "w": 4.237500190734863,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1402.550048828125,
+            "y": 709.6875,
+            "w": 8.47265625,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1412.9375,
+            "w": 331.62451171875,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1424.8499755859375,
+            "w": 100.3828125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1179.800048828125,
+            "y": 1424.1875,
+            "w": 9.600000381469727,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1183.0125732421875,
+            "y": 1424.8499755859375,
+            "w": 228.01992797851562,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1436.8375244140625,
+            "w": 306.6441345214844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 1448.7625732421875,
+            "w": 28.73164176940918,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1120.0999755859375,
+            "y": 1448.0250244140625,
+            "w": 9.600000381469727,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1123.3499755859375,
+            "y": 1448.7625732421875,
+            "w": 287.6447448730469,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1460.6875,
+            "w": 331.6048889160156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1472.675048828125,
+            "w": 261.50811767578125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 1484.6624755859375,
+            "w": 124.55908203125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1215.8875732421875,
+            "y": 1483.925048828125,
+            "w": 9.600000381469727,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1219.0875244140625,
+            "y": 1484.6624755859375,
+            "w": 191.8095703125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1496.5875244140625,
+            "w": 331.59747314453125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1508.5750732421875,
+            "w": 331.6123962402344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1520.487548828125,
+            "w": 331.6452331542969,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1532.4749755859375,
+            "w": 331.646484375,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1544.4000244140625,
+            "w": 29.766504287719727,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 1556.3250732421875,
+            "w": 278.74151611328125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1370.112548828125,
+            "y": 1555.6624755859375,
+            "w": 9.600000381469727,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1373.362548828125,
+            "y": 1556.3250732421875,
+            "w": 37.591796875,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1568.3125,
+            "w": 331.6317443847656,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1580.300048828125,
+            "w": 331.5747985839844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1592.2249755859375,
+            "w": 331.6094665527344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1604.2125244140625,
+            "w": 160.404296875,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1239.8125,
+            "y": 1603.4749755859375,
+            "w": 9.600000381469727,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1243.0125732421875,
+            "y": 1604.2125244140625,
+            "w": 167.98379516601562,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1616.2000732421875,
+            "w": 224.8186492919922,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 1628.112548828125,
+            "w": 319.68194580078125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1640.0374755859375,
+            "w": 122.6573257446289,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1202.0125732421875,
+            "y": 1639.300048828125,
+            "w": 9.600000381469727,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1205.2625732421875,
+            "y": 1640.0374755859375,
+            "w": 205.72305297851562,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1652.0250244140625,
+            "w": 331.638671875,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1663.9500732421875,
+            "w": 331.5677795410156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1675.9375,
+            "w": 331.6141662597656,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1687.862548828125,
+            "w": 331.61358642578125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1699.8499755859375,
+            "w": 40.748146057128906,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 1711.8375244140625,
+            "w": 319.6568298339844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1723.75,
+            "w": 331.572265625,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1735.675048828125,
+            "w": 331.5889587402344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1747.6624755859375,
+            "w": 331.6273498535156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1759.5875244140625,
+            "w": 331.61505126953125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1771.5750732421875,
+            "w": 198.3759765625,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 1783.5,
+            "w": 319.6109313964844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1795.487548828125,
+            "w": 331.6490173339844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1807.4749755859375,
+            "w": 331.64434814453125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1819.3875732421875,
+            "w": 76.9122085571289,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 1831.3125,
+            "w": 319.6483459472656,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1843.300048828125,
+            "w": 54.14590072631836,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1133.487548828125,
+            "y": 1843.300048828125,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1140.8250732421875,
+            "y": 1843.300048828125,
+            "w": 20.534961700439453,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1161.362548828125,
+            "y": 1843.300048828125,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1168.6500244140625,
+            "y": 1843.300048828125,
+            "w": 27.269433975219727,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1195.9124755859375,
+            "y": 1843.300048828125,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1203.1624755859375,
+            "y": 1843.300048828125,
+            "w": 30.674413681030273,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1233.8375244140625,
+            "y": 1843.300048828125,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1241.0875244140625,
+            "y": 1843.300048828125,
+            "w": 19.474023818969727,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1260.5750732421875,
+            "y": 1843.300048828125,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1267.862548828125,
+            "y": 1843.300048828125,
+            "w": 17.216114044189453,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1285.0750732421875,
+            "y": 1843.300048828125,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1292.362548828125,
+            "y": 1843.300048828125,
+            "w": 18.87744140625,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1311.237548828125,
+            "y": 1843.300048828125,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1318.5250244140625,
+            "y": 1843.300048828125,
+            "w": 18.8759765625,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1337.4000244140625,
+            "y": 1843.300048828125,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1344.737548828125,
+            "y": 1843.300048828125,
+            "w": 51.186622619628906,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1395.925048828125,
+            "y": 1843.300048828125,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1403.1624755859375,
+            "y": 1843.300048828125,
+            "w": 7.781836032867432,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1855.2249755859375,
+            "w": 331.6327209472656,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1867.2125244140625,
+            "w": 331.66015625,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1879.1375732421875,
+            "w": 331.6083984375,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1891.125,
+            "w": 331.6283264160156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1903.112548828125,
+            "w": 331.6185607910156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1915.0250244140625,
+            "w": 331.6120300292969,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1926.9500732421875,
+            "w": 200.15518188476562,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1387.5625,
+            "w": 8.47265625,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1321.4625244140625,
+            "y": 1387.5625,
+            "w": 89.50654602050781,
+            "h": 8.475000381469727
+          }
+        ],
+        "scroller": {
+          "x": 453.20001220703125,
+          "y": 133.1999969482422,
+          "w": 1598.800048828125,
+          "h": 974.7999877929688
+        },
+        "selBg": "rgba(0, 0, 0, 0)",
+        "paintRects": [],
+        "annRects": [
+          {
+            "x": 1082.1500244140625,
+            "y": 383.2124938964844,
+            "w": 328.7749938964844,
+            "h": 11
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 395.13751220703125,
+            "w": 31.962499618530273,
+            "h": 9
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 407.0625,
+            "w": 319.63751220703125,
+            "h": 11
+          }
+        ],
+        "toolbar": null
+      },
+      "select": {
+        "spans": [
+          {
+            "x": 1079.362548828125,
+            "y": -1595.800048828125,
+            "w": 273.2835998535156,
+            "h": 15.9375
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -1577.8125,
+            "w": 303.83544921875,
+            "h": 15.9375
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -1559.9000244140625,
+            "w": 54.757423400878906,
+            "h": 15.9375
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -1519.2750244140625,
+            "w": 148.2965850830078,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -1429.7000732421875,
+            "w": 6.650000095367432,
+            "h": 11.96250057220459
+          },
+          {
+            "x": 1085.3250732421875,
+            "y": -1429.7000732421875,
+            "w": 2.6875,
+            "h": 11.96250057220459
+          },
+          {
+            "x": 1097.2750244140625,
+            "y": -1429.7000732421875,
+            "w": 65.08613586425781,
+            "h": 11.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -1400.2000732421875,
+            "w": 331.62158203125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -1388.2750244140625,
+            "w": 331.6188659667969,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -1376.2874755859375,
+            "w": 331.5967712402344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -1364.362548828125,
+            "w": 331.6076354980469,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -1352.375,
+            "w": 126.4576187133789,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": -1340.3875732421875,
+            "w": 319.6006774902344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -1328.5374755859375,
+            "w": 331.6159362792969,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -1316.550048828125,
+            "w": 331.5957946777344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -1304.5625,
+            "w": 17.12275505065918,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1096.4749755859375,
+            "y": -1304.5625,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1104.3375244140625,
+            "y": -1304.5625,
+            "w": 29.435352325439453,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1133.800048828125,
+            "y": -1304.5625,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1141.6500244140625,
+            "y": -1304.5625,
+            "w": 8.30136775970459,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1149.9500732421875,
+            "y": -1304.5625,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1157.8125,
+            "y": -1304.5625,
+            "w": 53.38906478881836,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1211.1875,
+            "y": -1304.5625,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1219.0875244140625,
+            "y": -1304.5625,
+            "w": 42.20185470581055,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1261.2750244140625,
+            "y": -1304.5625,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1269.2249755859375,
+            "y": -1304.5625,
+            "w": 15.03671932220459,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1284.237548828125,
+            "y": -1304.5625,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1292.0999755859375,
+            "y": -1304.5625,
+            "w": 24.478124618530273,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1316.5999755859375,
+            "y": -1304.5625,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1324.5374755859375,
+            "y": -1304.5625,
+            "w": 15.03671932220459,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1339.5999755859375,
+            "y": -1304.5625,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1347.4625244140625,
+            "y": -1304.5625,
+            "w": 63.45097732543945,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -1292.6375732421875,
+            "w": 125.314453125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": -1280.6500244140625,
+            "w": 319.6865234375,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -1268.7249755859375,
+            "w": 331.6131896972656,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -1256.737548828125,
+            "w": 331.5796813964844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -1244.75,
+            "w": 331.61474609375,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -1232.9000244140625,
+            "w": 263.95849609375,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": -1220.9124755859375,
+            "w": 319.6275329589844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -1208.925048828125,
+            "w": 331.5791015625,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -1197,
+            "w": 331.6468811035156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -1185.0125732421875,
+            "w": 331.6490173339844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -1173.0875244140625,
+            "w": 218.51953125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -1124.4000244140625,
+            "w": 43.583984375,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1122.9124755859375,
+            "y": -1124.1375732421875,
+            "w": 3.737499952316284,
+            "h": 7.474999904632568
+          },
+          {
+            "x": 1131.2874755859375,
+            "y": -1124.4000244140625,
+            "w": 2.862499952316284,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -1114.4124755859375,
+            "w": 184.5994110107422,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -1104.487548828125,
+            "w": 86.8330078125,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -1089.5750732421875,
+            "w": 34.11406326293945,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -1079.5875244140625,
+            "w": 124.7904281616211,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -1056.3375244140625,
+            "w": 4.237500190734863,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1085.7249755859375,
+            "y": -1056.3375244140625,
+            "w": 4.237500190734863,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1088.0999755859375,
+            "y": -1055.675048828125,
+            "w": 175.9650421142578,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -1045.75,
+            "w": 84.6504898071289,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1166.375,
+            "y": -1045.75,
+            "w": 178.16299438476562,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1344.5625,
+            "y": -1045.75,
+            "w": 2.362499952316284,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -1035.7625732421875,
+            "w": 122.11006164550781,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1402.550048828125,
+            "y": -1055.675048828125,
+            "w": 8.47265625,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1091.300048828125,
+            "y": -917.4625244140625,
+            "w": 319.6965026855469,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -905.5499877929688,
+            "w": 331.6001892089844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -893.5625,
+            "w": 331.64532470703125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -881.6375122070312,
+            "w": 331.5599670410156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -869.7125244140625,
+            "w": 331.5853576660156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -857.7250366210938,
+            "w": 331.6105651855469,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -845.7374877929688,
+            "w": 250.0441436767578,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": -833.8125,
+            "w": 319.66796875,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -821.8250122070312,
+            "w": 331.6064453125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -809.9125366210938,
+            "w": 331.60333251953125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -797.9249877929688,
+            "w": 289.087890625,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": -786,
+            "w": 319.669921875,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -774.0750122070312,
+            "w": 331.60968017578125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -762.0875244140625,
+            "w": 210.97842407226562,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": -750.1000366210938,
+            "w": 319.6788024902344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -738.1749877929688,
+            "w": 331.6328125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -726.1875,
+            "w": 331.6776428222656,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -714.2000122070312,
+            "w": 331.6332092285156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -702.2875366210938,
+            "w": 331.6690368652344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -690.3624877929688,
+            "w": 275.43048095703125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -658.0625,
+            "w": 6.650000095367432,
+            "h": 11.96250057220459
+          },
+          {
+            "x": 1085.3250732421875,
+            "y": -658.0625,
+            "w": 2.6875,
+            "h": 11.96250057220459
+          },
+          {
+            "x": 1097.2750244140625,
+            "y": -658.0625,
+            "w": 234.44668579101562,
+            "h": 11.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -628.5625,
+            "w": 331.646484375,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -616.6375122070312,
+            "w": 331.58380126953125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -604.6500244140625,
+            "w": 331.6302795410156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -592.6625366210938,
+            "w": 331.56280517578125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -580.7374877929688,
+            "w": 31.970703125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": -568.8125,
+            "w": 319.638671875,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -556.8250122070312,
+            "w": 331.6455993652344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -544.9125366210938,
+            "w": 331.5853576660156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -532.9249877929688,
+            "w": 331.5757751464844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": -521,
+            "w": 319.6112365722656,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -509.01251220703125,
+            "w": 114.96406555175781,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -476.7749938964844,
+            "w": 14.964746475219727,
+            "h": 11.96250057220459
+          },
+          {
+            "x": 1094.2874755859375,
+            "y": -476.7749938964844,
+            "w": 2.6875,
+            "h": 11.96250057220459
+          },
+          {
+            "x": 1106.2750244140625,
+            "y": -476.7749938964844,
+            "w": 133.05166625976562,
+            "h": 11.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -447.2749938964844,
+            "w": 331.6193542480469,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -435.2875061035156,
+            "w": 162.9675750732422,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1242.3125,
+            "y": -435.2875061035156,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1242.362548828125,
+            "y": -437.0874938964844,
+            "w": 3.6875,
+            "h": 6.637500286102295
+          },
+          {
+            "x": 1246.0875244140625,
+            "y": -435.2875061035156,
+            "w": 2.7750000953674316,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -399.7250061035156,
+            "w": 3.137500047683716,
+            "h": 5.637500286102295
+          },
+          {
+            "x": 1082.737548828125,
+            "y": -398.25,
+            "w": 328.25048828125,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -388.26251220703125,
+            "w": 331.6618347167969,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -378.2749938964844,
+            "w": 218.12315368652344,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -942.8375244140625,
+            "w": 8.47265625,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1321.4625244140625,
+            "y": -942.8375244140625,
+            "w": 89.50654602050781,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1091.300048828125,
+            "y": -239.40000915527344,
+            "w": 307.72589111328125,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1091.300048828125,
+            "y": -229.47500610351562,
+            "w": 299.33184814453125,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1091.300048828125,
+            "y": -212.6999969482422,
+            "w": 319.6673889160156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": -200.77500915527344,
+            "w": 319.6105651855469,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -188.78750610351562,
+            "w": 331.63653564453125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -176.8625030517578,
+            "w": 331.6163024902344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -164.875,
+            "w": 138.91162109375,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": -152.8874969482422,
+            "w": 319.6372985839844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -141.03750610351562,
+            "w": 331.6232604980469,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -129.0500030517578,
+            "w": 331.5934753417969,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -117.0625,
+            "w": 331.6319274902344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -105.13750457763672,
+            "w": 331.6517639160156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -93.1500015258789,
+            "w": 331.6400451660156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -81.1624984741211,
+            "w": 100.5140609741211,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": -69.23750305175781,
+            "w": 319.6268615722656,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -57.25,
+            "w": 331.6224670410156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -45.400001525878906,
+            "w": 164.61172485351562,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": -33.41250228881836,
+            "w": 319.6280212402344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -21.42500114440918,
+            "w": 331.5990295410156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -9.5,
+            "w": 250.5603485107422,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 2.487499952316284,
+            "w": 319.6490173339844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 14.475000381469727,
+            "w": 29.819629669189453,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1109.1624755859375,
+            "y": 13.75,
+            "w": 9.600000381469727,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1112.4124755859375,
+            "y": 14.475000381469727,
+            "w": 298.5708923339844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 26.399999618530273,
+            "w": 65.89404296875,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 74.61250305175781,
+            "w": 14.964746475219727,
+            "h": 11.96250057220459
+          },
+          {
+            "x": 1094.2874755859375,
+            "y": 74.61250305175781,
+            "w": 2.6875,
+            "h": 11.96250057220459
+          },
+          {
+            "x": 1106.2750244140625,
+            "y": 74.61250305175781,
+            "w": 214.45059204101562,
+            "h": 11.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 104.05000305175781,
+            "w": 331.6454162597656,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 116.0374984741211,
+            "w": 331.5938415527344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 128.03750610351562,
+            "w": 331.6183776855469,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 139.9499969482422,
+            "w": 28.73164176940918,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1108.1624755859375,
+            "y": 139.28750610351562,
+            "w": 9.600000381469727,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1111.362548828125,
+            "y": 139.9499969482422,
+            "w": 264.02032470703125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1375.375,
+            "y": 139.9499969482422,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1380.5125732421875,
+            "y": 139.9499969482422,
+            "w": 30.469532012939453,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 151.9375,
+            "w": 38.98828125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1118.3375244140625,
+            "y": 151.9375,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.425048828125,
+            "y": 151.9375,
+            "w": 288.48565673828125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 163.8625030517578,
+            "w": 34.10888671875,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 175.85000610351562,
+            "w": 319.6630859375,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 187.77500915527344,
+            "w": 46.76064682006836,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1126.112548828125,
+            "y": 187.77500915527344,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1132.7000732421875,
+            "y": 187.77500915527344,
+            "w": 8.2939453125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1141,
+            "y": 187.77500915527344,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1147.5374755859375,
+            "y": 187.77500915527344,
+            "w": 25.504297256469727,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1173.0374755859375,
+            "y": 187.77500915527344,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1179.625,
+            "y": 187.77500915527344,
+            "w": 7.789941310882568,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1187.4375,
+            "y": 187.77500915527344,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1193.987548828125,
+            "y": 187.77500915527344,
+            "w": 35.55781173706055,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1229.5374755859375,
+            "y": 187.77500915527344,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1236.175048828125,
+            "y": 187.77500915527344,
+            "w": 14.419336318969727,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1250.5750732421875,
+            "y": 187.77500915527344,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1257.1500244140625,
+            "y": 187.77500915527344,
+            "w": 31.812305450439453,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1288.9375,
+            "y": 187.77500915527344,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1295.5250244140625,
+            "y": 187.77500915527344,
+            "w": 43.25771713256836,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1338.7625732421875,
+            "y": 187.77500915527344,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1345.3875732421875,
+            "y": 187.77500915527344,
+            "w": 8.30918025970459,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1353.6875,
+            "y": 187.77500915527344,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1360.2750244140625,
+            "y": 187.77500915527344,
+            "w": 50.6953125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 199.6875,
+            "w": 331.6495056152344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 211.6750030517578,
+            "w": 331.6241149902344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 223.6750030517578,
+            "w": 331.5771484375,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 235.58750915527344,
+            "w": 331.61114501953125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 247.5749969482422,
+            "w": 122.15303039550781,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 259.5,
+            "w": 118.1578140258789,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1209.4749755859375,
+            "y": 258.8374938964844,
+            "w": 9.600000381469727,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1212.6875,
+            "y": 259.5,
+            "w": 198.25137329101562,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 271.4875183105469,
+            "w": 331.6437683105469,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -264.7124938964844,
+            "w": 258.615234375,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1337.925048828125,
+            "y": -265.3125,
+            "w": 9.71250057220459,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1347.6375732421875,
+            "y": -265.3125,
+            "w": 4.237500190734863,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1402.550048828125,
+            "y": -264.7124938964844,
+            "w": 8.47265625,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 438.5375061035156,
+            "w": 331.62451171875,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 450.45001220703125,
+            "w": 100.3828125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1179.800048828125,
+            "y": 449.7875061035156,
+            "w": 9.600000381469727,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1183.0125732421875,
+            "y": 450.45001220703125,
+            "w": 228.01992797851562,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 462.4375,
+            "w": 306.6441345214844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 474.3625183105469,
+            "w": 28.73164176940918,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1120.0999755859375,
+            "y": 473.625,
+            "w": 9.600000381469727,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1123.3499755859375,
+            "y": 474.3625183105469,
+            "w": 287.6447448730469,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 486.2875061035156,
+            "w": 331.6048889160156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 498.2749938964844,
+            "w": 261.50811767578125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 510.26251220703125,
+            "w": 124.55908203125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1215.8875732421875,
+            "y": 509.5249938964844,
+            "w": 9.600000381469727,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1219.0875244140625,
+            "y": 510.26251220703125,
+            "w": 191.8095703125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 522.1875,
+            "w": 331.59747314453125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 534.1749877929688,
+            "w": 331.6123962402344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 546.0875244140625,
+            "w": 331.6452331542969,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 558.0750122070312,
+            "w": 331.646484375,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 570,
+            "w": 29.766504287719727,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 581.9249877929688,
+            "w": 278.74151611328125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1370.112548828125,
+            "y": 581.2625122070312,
+            "w": 9.600000381469727,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1373.362548828125,
+            "y": 581.9249877929688,
+            "w": 37.591796875,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 593.9125366210938,
+            "w": 331.6317443847656,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 605.9000244140625,
+            "w": 331.5747985839844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 617.8250122070312,
+            "w": 331.6094665527344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 629.8125,
+            "w": 160.404296875,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1239.8125,
+            "y": 629.0750122070312,
+            "w": 9.600000381469727,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1243.0125732421875,
+            "y": 629.8125,
+            "w": 167.98379516601562,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 641.7999877929688,
+            "w": 224.8186492919922,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 653.7125244140625,
+            "w": 319.68194580078125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 665.6375122070312,
+            "w": 122.6573257446289,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1202.0125732421875,
+            "y": 664.9000244140625,
+            "w": 9.600000381469727,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1205.2625732421875,
+            "y": 665.6375122070312,
+            "w": 205.72305297851562,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 677.625,
+            "w": 331.638671875,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 689.5499877929688,
+            "w": 331.5677795410156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 701.5375366210938,
+            "w": 331.6141662597656,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 713.4625244140625,
+            "w": 331.61358642578125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 725.4500122070312,
+            "w": 40.748146057128906,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 737.4375,
+            "w": 319.6568298339844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 749.3500366210938,
+            "w": 331.572265625,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 761.2750244140625,
+            "w": 331.5889587402344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 773.2625122070312,
+            "w": 331.6273498535156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 785.1875,
+            "w": 331.61505126953125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 797.1749877929688,
+            "w": 198.3759765625,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 809.1000366210938,
+            "w": 319.6109313964844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 821.0875244140625,
+            "w": 331.6490173339844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 833.0750122070312,
+            "w": 331.64434814453125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 844.9874877929688,
+            "w": 76.9122085571289,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 856.9125366210938,
+            "w": 319.6483459472656,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 868.9000244140625,
+            "w": 54.14590072631836,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1133.487548828125,
+            "y": 868.9000244140625,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1140.8250732421875,
+            "y": 868.9000244140625,
+            "w": 20.534961700439453,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1161.362548828125,
+            "y": 868.9000244140625,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1168.6500244140625,
+            "y": 868.9000244140625,
+            "w": 27.269433975219727,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1195.9124755859375,
+            "y": 868.9000244140625,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1203.1624755859375,
+            "y": 868.9000244140625,
+            "w": 30.674413681030273,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1233.8375244140625,
+            "y": 868.9000244140625,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1241.0875244140625,
+            "y": 868.9000244140625,
+            "w": 19.474023818969727,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1260.5750732421875,
+            "y": 868.9000244140625,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1267.862548828125,
+            "y": 868.9000244140625,
+            "w": 17.216114044189453,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1285.0750732421875,
+            "y": 868.9000244140625,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1292.362548828125,
+            "y": 868.9000244140625,
+            "w": 18.87744140625,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1311.237548828125,
+            "y": 868.9000244140625,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1318.5250244140625,
+            "y": 868.9000244140625,
+            "w": 18.8759765625,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1337.4000244140625,
+            "y": 868.9000244140625,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1344.737548828125,
+            "y": 868.9000244140625,
+            "w": 51.186622619628906,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1395.925048828125,
+            "y": 868.9000244140625,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1403.1624755859375,
+            "y": 868.9000244140625,
+            "w": 7.781836032867432,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 880.8250122070312,
+            "w": 331.6327209472656,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 892.8125,
+            "w": 331.66015625,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 904.7374877929688,
+            "w": 331.6083984375,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 916.7250366210938,
+            "w": 331.6283264160156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 928.7125244140625,
+            "w": 331.6185607910156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 940.625,
+            "w": 331.6120300292969,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 952.5499877929688,
+            "w": 200.15518188476562,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 413.1625061035156,
+            "w": 8.47265625,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1321.4625244140625,
+            "y": 413.1625061035156,
+            "w": 89.50654602050781,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1116.2625732421875,
+            "w": 14.964746475219727,
+            "h": 11.96250057220459
+          },
+          {
+            "x": 1094.2874755859375,
+            "y": 1116.2625732421875,
+            "w": 2.6875,
+            "h": 11.96250057220459
+          },
+          {
+            "x": 1106.2750244140625,
+            "y": 1116.2625732421875,
+            "w": 224.92784118652344,
+            "h": 11.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1145.7000732421875,
+            "w": 331.6131896972656,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1157.6875,
+            "w": 331.63916015625,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1169.612548828125,
+            "w": 149.34873962402344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 1181.5999755859375,
+            "w": 319.6459045410156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1193.5875244140625,
+            "w": 331.6027526855469,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1205.5125732421875,
+            "w": 331.6036071777344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1217.5,
+            "w": 331.61407470703125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1229.425048828125,
+            "w": 331.5908203125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1241.3375244140625,
+            "w": 135.38623046875,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 1253.3250732421875,
+            "w": 319.6478576660156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1265.25,
+            "w": 331.5733337402344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1277.237548828125,
+            "w": 331.6109313964844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1289.2249755859375,
+            "w": 331.62548828125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1301.1500244140625,
+            "w": 331.6300964355469,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1313.1375732421875,
+            "w": 276.2115173339844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 1325.0625,
+            "w": 319.69482421875,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1336.9749755859375,
+            "w": 112.66845703125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1354.9625244140625,
+            "w": 155.19961547851562,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1366.8875732421875,
+            "w": 116.86602020263672,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1378.875,
+            "w": 125.21758270263672,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1390.7874755859375,
+            "w": 116.3623046875,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1402.7750244140625,
+            "w": 134.1720733642578,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 1420.7000732421875,
+            "w": 319.6449279785156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1432.612548828125,
+            "w": 331.5660095214844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1444.5999755859375,
+            "w": 331.5715026855469,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1456.5875244140625,
+            "w": 331.6202087402344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1468.5125732421875,
+            "w": 331.5853576660156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1480.5,
+            "w": 331.5680847167969,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1492.425048828125,
+            "w": 112.62187957763672,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 1504.4124755859375,
+            "w": 319.6786193847656,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1516.3375244140625,
+            "w": 331.6042175292969,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1528.25,
+            "w": 331.6576232910156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1540.237548828125,
+            "w": 331.5810546875,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1552.2249755859375,
+            "w": 322.1831970214844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 1564.1500244140625,
+            "w": 165.3468780517578,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1256.675048828125,
+            "y": 1563.487548828125,
+            "w": 9.600000381469727,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1259.925048828125,
+            "y": 1564.1500244140625,
+            "w": 151.0792999267578,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1576.1375732421875,
+            "w": 331.5674743652344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1588.0625,
+            "w": 331.65625,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1600.050048828125,
+            "w": 145.24453735351562,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 1611.9749755859375,
+            "w": 319.68145751953125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1623.8875732421875,
+            "w": 331.67559814453125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1635.875,
+            "w": 331.6412048339844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1091.2874755859375,
+            "w": 258.615234375,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1337.925048828125,
+            "y": 1090.6875,
+            "w": 9.71250057220459,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1347.6375732421875,
+            "y": 1090.6875,
+            "w": 4.237500190734863,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1402.550048828125,
+            "y": 1091.2874755859375,
+            "w": 8.47265625,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1794.5374755859375,
+            "w": 107.0977554321289,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1186.5250244140625,
+            "y": 1793.800048828125,
+            "w": 9.600000381469727,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1189.7249755859375,
+            "y": 1794.5374755859375,
+            "w": 221.2277374267578,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1806.4500732421875,
+            "w": 331.6070251464844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1818.4375,
+            "w": 331.6127014160156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1830.362548828125,
+            "w": 67.92236328125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1874.125,
+            "w": 14.964746475219727,
+            "h": 11.96250057220459
+          },
+          {
+            "x": 1094.2874755859375,
+            "y": 1874.125,
+            "w": 2.6875,
+            "h": 11.96250057220459
+          },
+          {
+            "x": 1106.2750244140625,
+            "y": 1874.125,
+            "w": 181.02139282226562,
+            "h": 11.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1903.625,
+            "w": 331.6214904785156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1915.550048828125,
+            "w": 17.425098419189453,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1096.7874755859375,
+            "y": 1915.550048828125,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1102.7625732421875,
+            "y": 1915.550048828125,
+            "w": 6.11865234375,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1108.9000244140625,
+            "y": 1915.550048828125,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1114.9124755859375,
+            "y": 1915.550048828125,
+            "w": 28.83466911315918,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1143.7125244140625,
+            "y": 1915.550048828125,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1149.7750244140625,
+            "y": 1915.550048828125,
+            "w": 21.229883193969727,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1170.9749755859375,
+            "y": 1915.550048828125,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1176.987548828125,
+            "y": 1915.550048828125,
+            "w": 37.32207107543945,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1214.3125,
+            "y": 1915.550048828125,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1220.2750244140625,
+            "y": 1915.550048828125,
+            "w": 34.95547103881836,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1255.2249755859375,
+            "y": 1915.550048828125,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1261.2750244140625,
+            "y": 1915.550048828125,
+            "w": 15.571484565734863,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1276.8250732421875,
+            "y": 1915.550048828125,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1282.875,
+            "y": 1915.550048828125,
+            "w": 14.93710994720459,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1297.800048828125,
+            "y": 1915.550048828125,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1303.7750244140625,
+            "y": 1915.550048828125,
+            "w": 43.42851638793945,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1347.237548828125,
+            "y": 1915.550048828125,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1353.25,
+            "y": 1915.550048828125,
+            "w": 37.336524963378906,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1390.5625,
+            "y": 1915.550048828125,
+            "w": 2.237499952316284,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1396.5374755859375,
+            "y": 1915.550048828125,
+            "w": 14.419336318969727,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1927.5374755859375,
+            "w": 331.6244201660156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1939.4500732421875,
+            "w": 331.6213073730469,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1951.375,
+            "w": 331.6119079589844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1963.362548828125,
+            "w": 126.93623352050781,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 1975.2874755859375,
+            "w": 319.6797790527344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1987.2750244140625,
+            "w": 331.6584167480469,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1999.2625732421875,
+            "w": 197.16543579101562,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 2011.1875,
+            "w": 319.6649475097656,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 2023.175048828125,
+            "w": 331.6044921875,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 2035.1624755859375,
+            "w": 331.64044189453125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 2047.0125732421875,
+            "w": 183.9343719482422,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 2059,
+            "w": 319.66339111328125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 2070.925048828125,
+            "w": 331.6143493652344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 2082.91259765625,
+            "w": 331.61798095703125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 2094.900146484375,
+            "w": 41.37031173706055,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 2106.824951171875,
+            "w": 319.65185546875,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 2118.8125,
+            "w": 331.6083068847656,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 2130.800048828125,
+            "w": 331.59454345703125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 2142.650146484375,
+            "w": 331.63214111328125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 2154.637451171875,
+            "w": 124.2660140991211,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 2166.625,
+            "w": 319.66973876953125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 2178.550048828125,
+            "w": 331.6265563964844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 2190.53759765625,
+            "w": 143.84825134277344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 2319.337646484375,
+            "w": 20.566797256469727,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1105.875,
+            "y": 2319.337646484375,
+            "w": 103.7557601928711,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1769.1624755859375,
+            "w": 8.47265625,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1321.4625244140625,
+            "y": 1769.1624755859375,
+            "w": 89.50654602050781,
+            "h": 8.475000381469727
+          }
+        ],
+        "scroller": {
+          "x": 453.20001220703125,
+          "y": 133.1999969482422,
+          "w": 1598.800048828125,
+          "h": 974.7999877929688
+        },
+        "selBg": "rgba(0, 0, 0, 0)",
+        "paintRects": [
+          {
+            "x": 1091.300048828125,
+            "y": 173.4375,
+            "w": 319.6625061035156,
+            "h": 14.40000057220459,
+            "left": "14.9886%",
+            "top": "71.1486%",
+            "widthPct": "72.8162%",
+            "heightPct": "2.16216%"
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 187.85000610351562,
+            "w": 331.6000061035156,
+            "h": 14.40000057220459,
+            "left": "12.2694%",
+            "top": "73.3108%",
+            "widthPct": "75.5371%",
+            "heightPct": "2.16216%"
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 202.25,
+            "w": 331.63751220703125,
+            "h": 14.387499809265137,
+            "left": "12.2694%",
+            "top": "75.473%",
+            "widthPct": "75.5466%",
+            "heightPct": "2.16216%"
+          }
+        ],
+        "annRects": [
+          {
+            "x": 1082.1500244140625,
+            "y": -591.1875,
+            "w": 328.7749938964844,
+            "h": 11
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -579.2625122070312,
+            "w": 31.962499618530273,
+            "h": 9
+          },
+          {
+            "x": 1091.300048828125,
+            "y": -567.3375244140625,
+            "w": 319.63751220703125,
+            "h": 11
+          }
+        ],
+        "toolbar": {
+          "x": 1079.5125732421875,
+          "y": 220.33750915527344,
+          "w": 293.5,
+          "h": 34
+        }
+      }
+    }
+  },
+  "results": [
+    {
+      "id": "a/paint-present",
+      "pass": true,
+      "detail": "自绘块 3 个（跨 3 行拖选；::selection=rgba(0, 0, 0, 0)）"
+    },
+    {
+      "id": "a/paint-no-overlap",
+      "pass": true,
+      "detail": "自绘块两两相交面积 max=0.00px²（≤0.5 吞亚像素）"
+    },
+    {
+      "id": "a/native-selection-transparent",
+      "pass": true,
+      "detail": "::selection computed=rgba(0, 0, 0, 0)（transparent——视觉单通道=自绘层）"
+    },
+    {
+      "id": "c/toolbar-in-viewport",
+      "pass": true,
+      "detail": "工具条 (1110,230,333×38) 在滚动容器 (515,143,1537×965) 可视区内"
+    },
+    {
+      "id": "c/toolbar-near-selection",
+      "pass": true,
+      "detail": "工具条距选区顶 9.4px（<60）"
+    },
+    {
+      "id": "b/ann-align-text",
+      "pass": true,
+      "detail": "标注贴行：块顶 vs 行簇顶偏差 max=1.48px（≤2）+块底落行簇底 desc 尾界 [−1,+3]px（越界 0 块；3 块分行——修前并簇 1 块）"
+    },
+    {
+      "id": "b/ann-no-overlap",
+      "pass": true,
+      "detail": "标注块两两相交面积 max=0.00px²"
+    },
+    {
+      "id": "s6/z150-paint-present",
+      "pass": true,
+      "detail": "150% 下自绘块 4 个（选择模式重选同源行带）"
+    },
+    {
+      "id": "s6/medium-ann-present",
+      "pass": true,
+      "detail": "medium 档重开存量标注 3 块在场（存量 rects 零迁移）"
+    },
+    {
+      "id": "s6/medium-toolbar-in-viewport",
+      "pass": true,
+      "detail": "medium 档工具条 (1080,220) 在可视区内"
+    },
+    {
+      "id": "s6/zoom-stable",
+      "pass": true,
+      "detail": "zoom 100%↔150% 同源行自绘块归一化几何漂移 max=0.67%（≤2——缩放量化噪声容差）"
+    },
+    {
+      "id": "f/no-pageerror",
+      "pass": true,
+      "detail": "页面错误 0 条"
+    }
+  ]
+}
\ No newline at end of file
diff --git a/scripts/audits/f-a4-out/f-a4-verify-baseline.json b/scripts/audits/f-a4-out/f-a4-verify-baseline.json
new file mode 100644
index 000000000..5716e4d77
--- /dev/null
+++ b/scripts/audits/f-a4-out/f-a4-verify-baseline.json
@@ -0,0 +1,5345 @@
+{
+  "meta": {
+    "script": "f-a4-verify.mjs",
+    "phase": "baseline",
+    "date": "2026-08-31T02:05:12.998Z",
+    "uiScale": "large",
+    "note": "真实库副本（uiScale 保留用户实况 large）+真鼠标跨 3 行拖选；baseline=修前三现象数值，after=票面 §5 判据"
+  },
+  "scenes": {
+    "main": {
+      "dSel": {
+        "spans": [
+          {
+            "x": 1110.2625732421875,
+            "y": -816.6000366210938,
+            "w": 273.2835998535156,
+            "h": 15.9375
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -798.6124877929688,
+            "w": 303.83544921875,
+            "h": 15.9375
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -740.0750122070312,
+            "w": 148.2965850830078,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1128.175048828125,
+            "y": -650.5,
+            "w": 65.08613586425781,
+            "h": 11.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -621,
+            "w": 331.62158203125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -609.0750122070312,
+            "w": 331.6188659667969,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -597.0875244140625,
+            "w": 331.5967712402344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -585.1625366210938,
+            "w": 331.6076354980469,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -573.1749877929688,
+            "w": 126.4576187133789,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": -561.1875,
+            "w": 319.6006774902344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -549.3375244140625,
+            "w": 331.6159362792969,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -537.3500366210938,
+            "w": 331.5957946777344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1378.362548828125,
+            "y": -525.3624877929688,
+            "w": 63.45097732543945,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -513.4375,
+            "w": 125.314453125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": -501.45001220703125,
+            "w": 319.6865234375,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -489.5249938964844,
+            "w": 331.6131896972656,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -477.5375061035156,
+            "w": 331.5796813964844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -465.5500183105469,
+            "w": 331.61474609375,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -453.70001220703125,
+            "w": 263.95849609375,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": -441.7124938964844,
+            "w": 319.6275329589844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -429.7250061035156,
+            "w": 331.5791015625,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -417.8000183105469,
+            "w": 331.6468811035156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -405.8125,
+            "w": 331.6490173339844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -393.88751220703125,
+            "w": 218.51953125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -345.20001220703125,
+            "w": 43.583984375,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -335.2124938964844,
+            "w": 184.5994110107422,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -325.2875061035156,
+            "w": 86.8330078125,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -300.38751220703125,
+            "w": 124.7904281616211,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1119,
+            "y": -276.4750061035156,
+            "w": 175.9650421142578,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -266.5500183105469,
+            "w": 84.6504898071289,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1197.2750244140625,
+            "y": -266.5500183105469,
+            "w": 178.16299438476562,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -256.5625,
+            "w": 122.11006164550781,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": -138.2624969482422,
+            "w": 319.6965026855469,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -126.3499984741211,
+            "w": 331.6001892089844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -114.36250305175781,
+            "w": 331.64532470703125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -102.4375,
+            "w": 331.5599670410156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -90.51250457763672,
+            "w": 331.5853576660156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -78.5250015258789,
+            "w": 331.6105651855469,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -66.5374984741211,
+            "w": 250.0441436767578,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": -54.61249923706055,
+            "w": 319.66796875,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -42.625,
+            "w": 331.6064453125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -30.712499618530273,
+            "w": 331.60333251953125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -18.725000381469727,
+            "w": 289.087890625,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": -6.800000190734863,
+            "w": 319.669921875,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 5.125,
+            "w": 331.60968017578125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 17.11250114440918,
+            "w": 210.97842407226562,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": 29.100000381469727,
+            "w": 319.6788024902344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 41.025001525878906,
+            "w": 331.6328125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 53.01250076293945,
+            "w": 331.6776428222656,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 65,
+            "w": 331.6332092285156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 76.9124984741211,
+            "w": 331.6690368652344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 88.8375015258789,
+            "w": 275.43048095703125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1128.175048828125,
+            "y": 121.13750457763672,
+            "w": 234.44668579101562,
+            "h": 11.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 150.6374969482422,
+            "w": 331.646484375,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 162.5625,
+            "w": 331.58380126953125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 174.5500030517578,
+            "w": 331.6302795410156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 186.53750610351562,
+            "w": 331.56280517578125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": 210.3874969482422,
+            "w": 319.638671875,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 222.375,
+            "w": 331.6455993652344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 234.28750610351562,
+            "w": 331.5853576660156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 246.27500915527344,
+            "w": 331.5757751464844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": 258.20001220703125,
+            "w": 319.6112365722656,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 270.1875,
+            "w": 114.96406555175781,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1137.175048828125,
+            "y": 302.4250183105469,
+            "w": 133.05166625976562,
+            "h": 11.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 331.9250183105469,
+            "w": 331.6193542480469,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 343.9125061035156,
+            "w": 162.9675750732422,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1113.6375732421875,
+            "y": 380.95001220703125,
+            "w": 328.25048828125,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 390.9375,
+            "w": 331.6618347167969,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 400.9250183105469,
+            "w": 218.12315368652344,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1352.362548828125,
+            "y": -163.6374969482422,
+            "w": 89.50654602050781,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": 539.7999877929688,
+            "w": 307.72589111328125,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": 549.7250366210938,
+            "w": 299.33184814453125,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": 566.5,
+            "w": 319.6673889160156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": 578.4249877929688,
+            "w": 319.6105651855469,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 590.4125366210938,
+            "w": 331.63653564453125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 602.3375244140625,
+            "w": 331.6163024902344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 614.3250122070312,
+            "w": 138.91162109375,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": 626.3125,
+            "w": 319.6372985839844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 638.1625366210938,
+            "w": 331.6232604980469,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 650.1500244140625,
+            "w": 331.5934753417969,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 662.1375122070312,
+            "w": 331.6319274902344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 674.0625,
+            "w": 331.6517639160156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 686.0499877929688,
+            "w": 331.6400451660156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 698.0375366210938,
+            "w": 100.5140609741211,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": 709.9625244140625,
+            "w": 319.6268615722656,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 721.9500122070312,
+            "w": 331.6224670410156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 733.7999877929688,
+            "w": 164.61172485351562,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": 745.7875366210938,
+            "w": 319.6280212402344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 757.7750244140625,
+            "w": 331.5990295410156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 769.7000122070312,
+            "w": 250.5603485107422,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": 781.6875,
+            "w": 319.6490173339844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1143.3125,
+            "y": 793.6749877929688,
+            "w": 298.5708923339844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 805.6000366210938,
+            "w": 65.89404296875,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1137.175048828125,
+            "y": 853.8125,
+            "w": 214.45059204101562,
+            "h": 11.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 883.25,
+            "w": 331.6454162597656,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 895.2374877929688,
+            "w": 331.5938415527344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 907.2374877929688,
+            "w": 331.6183776855469,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1142.2625732421875,
+            "y": 919.1500244140625,
+            "w": 264.02032470703125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1153.3250732421875,
+            "y": 931.1375122070312,
+            "w": 288.48565673828125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": 955.0499877929688,
+            "w": 319.6630859375,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 966.9750366210938,
+            "w": 46.76064682006836,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 978.8875122070312,
+            "w": 331.6495056152344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 990.875,
+            "w": 331.6241149902344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1002.875,
+            "w": 331.5771484375,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1014.7875366210938,
+            "w": 331.61114501953125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1026.7750244140625,
+            "w": 122.15303039550781,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": 1038.7000732421875,
+            "w": 118.1578140258789,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1243.5875244140625,
+            "y": 1038.7000732421875,
+            "w": 198.25137329101562,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1050.6875,
+            "w": 331.6437683105469,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 514.4874877929688,
+            "w": 258.615234375,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1217.737548828125,
+            "w": 331.62451171875,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1229.6500244140625,
+            "w": 100.3828125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1213.9124755859375,
+            "y": 1229.6500244140625,
+            "w": 228.01992797851562,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1241.6375732421875,
+            "w": 306.6441345214844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1154.25,
+            "y": 1253.5625,
+            "w": 287.6447448730469,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1265.487548828125,
+            "w": 331.6048889160156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1277.4749755859375,
+            "w": 261.50811767578125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": 1289.4625244140625,
+            "w": 124.55908203125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1249.987548828125,
+            "y": 1289.4625244140625,
+            "w": 191.8095703125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1301.3875732421875,
+            "w": 331.59747314453125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1313.375,
+            "w": 331.6123962402344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1325.2874755859375,
+            "w": 331.6452331542969,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1337.2750244140625,
+            "w": 331.646484375,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": 1361.125,
+            "w": 278.74151611328125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1373.112548828125,
+            "w": 331.6317443847656,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1385.0999755859375,
+            "w": 331.5747985839844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1397.0250244140625,
+            "w": 331.6094665527344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1409.0125732421875,
+            "w": 160.404296875,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1273.9124755859375,
+            "y": 1409.0125732421875,
+            "w": 167.98379516601562,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1421,
+            "w": 224.8186492919922,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": 1432.9124755859375,
+            "w": 319.68194580078125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1444.8375244140625,
+            "w": 122.6573257446289,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1236.1624755859375,
+            "y": 1444.8375244140625,
+            "w": 205.72305297851562,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1456.8250732421875,
+            "w": 331.638671875,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1468.75,
+            "w": 331.5677795410156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1480.737548828125,
+            "w": 331.6141662597656,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1492.6624755859375,
+            "w": 331.61358642578125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": 1516.6375732421875,
+            "w": 319.6568298339844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1528.550048828125,
+            "w": 331.572265625,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1540.4749755859375,
+            "w": 331.5889587402344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1552.4625244140625,
+            "w": 331.6273498535156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1564.3875732421875,
+            "w": 331.61505126953125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1576.375,
+            "w": 198.3759765625,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": 1588.300048828125,
+            "w": 319.6109313964844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1600.2874755859375,
+            "w": 331.6490173339844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1612.2750244140625,
+            "w": 331.64434814453125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1624.1875,
+            "w": 76.9122085571289,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": 1636.112548828125,
+            "w": 319.6483459472656,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1648.0999755859375,
+            "w": 54.14590072631836,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1660.0250244140625,
+            "w": 331.6327209472656,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1672.0125732421875,
+            "w": 331.66015625,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1683.9375,
+            "w": 331.6083984375,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1695.925048828125,
+            "w": 331.6283264160156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1707.9124755859375,
+            "w": 331.6185607910156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1719.8250732421875,
+            "w": 331.6120300292969,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1731.75,
+            "w": 200.15518188476562,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1352.362548828125,
+            "y": 1192.362548828125,
+            "w": 89.50654602050781,
+            "h": 8.475000381469727
+          }
+        ],
+        "scroller": {
+          "x": 515,
+          "y": 143.40000915527344,
+          "w": 1537,
+          "h": 964.6000366210938
+        },
+        "selBg": "rgba(0, 0, 0, 0.2)",
+        "paintRects": [],
+        "annRects": [],
+        "toolbar": {
+          "x": 1255.3250732421875,
+          "y": 566.4625244140625,
+          "w": 332.6499938964844,
+          "h": 38.20000076293945
+        }
+      },
+      "dSaved": {
+        "spans": [
+          {
+            "x": 1110.2625732421875,
+            "y": -816.6000366210938,
+            "w": 273.2835998535156,
+            "h": 15.9375
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -798.6124877929688,
+            "w": 303.83544921875,
+            "h": 15.9375
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -740.0750122070312,
+            "w": 148.2965850830078,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1128.175048828125,
+            "y": -650.5,
+            "w": 65.08613586425781,
+            "h": 11.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -621,
+            "w": 331.62158203125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -609.0750122070312,
+            "w": 331.6188659667969,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -597.0875244140625,
+            "w": 331.5967712402344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -585.1625366210938,
+            "w": 331.6076354980469,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -573.1749877929688,
+            "w": 126.4576187133789,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": -561.1875,
+            "w": 319.6006774902344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -549.3375244140625,
+            "w": 331.6159362792969,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -537.3500366210938,
+            "w": 331.5957946777344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1378.362548828125,
+            "y": -525.3624877929688,
+            "w": 63.45097732543945,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -513.4375,
+            "w": 125.314453125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": -501.45001220703125,
+            "w": 319.6865234375,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -489.5249938964844,
+            "w": 331.6131896972656,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -477.5375061035156,
+            "w": 331.5796813964844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -465.5500183105469,
+            "w": 331.61474609375,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -453.70001220703125,
+            "w": 263.95849609375,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": -441.7124938964844,
+            "w": 319.6275329589844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -429.7250061035156,
+            "w": 331.5791015625,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -417.8000183105469,
+            "w": 331.6468811035156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -405.8125,
+            "w": 331.6490173339844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -393.88751220703125,
+            "w": 218.51953125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -345.20001220703125,
+            "w": 43.583984375,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -335.2124938964844,
+            "w": 184.5994110107422,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -325.2875061035156,
+            "w": 86.8330078125,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -300.38751220703125,
+            "w": 124.7904281616211,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1119,
+            "y": -276.4750061035156,
+            "w": 175.9650421142578,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -266.5500183105469,
+            "w": 84.6504898071289,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1197.2750244140625,
+            "y": -266.5500183105469,
+            "w": 178.16299438476562,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -256.5625,
+            "w": 122.11006164550781,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": -138.2624969482422,
+            "w": 319.6965026855469,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -126.3499984741211,
+            "w": 331.6001892089844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -114.36250305175781,
+            "w": 331.64532470703125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -102.4375,
+            "w": 331.5599670410156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -90.51250457763672,
+            "w": 331.5853576660156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -78.5250015258789,
+            "w": 331.6105651855469,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -66.5374984741211,
+            "w": 250.0441436767578,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": -54.61249923706055,
+            "w": 319.66796875,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -42.625,
+            "w": 331.6064453125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -30.712499618530273,
+            "w": 331.60333251953125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": -18.725000381469727,
+            "w": 289.087890625,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": -6.800000190734863,
+            "w": 319.669921875,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 5.125,
+            "w": 331.60968017578125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 17.11250114440918,
+            "w": 210.97842407226562,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": 29.100000381469727,
+            "w": 319.6788024902344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 41.025001525878906,
+            "w": 331.6328125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 53.01250076293945,
+            "w": 331.6776428222656,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 65,
+            "w": 331.6332092285156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 76.9124984741211,
+            "w": 331.6690368652344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 88.8375015258789,
+            "w": 275.43048095703125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1128.175048828125,
+            "y": 121.13750457763672,
+            "w": 234.44668579101562,
+            "h": 11.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 150.6374969482422,
+            "w": 331.646484375,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 162.5625,
+            "w": 331.58380126953125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 174.5500030517578,
+            "w": 331.6302795410156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 186.53750610351562,
+            "w": 331.56280517578125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": 210.3874969482422,
+            "w": 319.638671875,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 222.375,
+            "w": 331.6455993652344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 234.28750610351562,
+            "w": 331.5853576660156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 246.27500915527344,
+            "w": 331.5757751464844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": 258.20001220703125,
+            "w": 319.6112365722656,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 270.1875,
+            "w": 114.96406555175781,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1137.175048828125,
+            "y": 302.4250183105469,
+            "w": 133.05166625976562,
+            "h": 11.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 331.9250183105469,
+            "w": 331.6193542480469,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 343.9125061035156,
+            "w": 162.9675750732422,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1113.6375732421875,
+            "y": 380.95001220703125,
+            "w": 328.25048828125,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 390.9375,
+            "w": 331.6618347167969,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 400.9250183105469,
+            "w": 218.12315368652344,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1352.362548828125,
+            "y": -163.6374969482422,
+            "w": 89.50654602050781,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": 539.7999877929688,
+            "w": 307.72589111328125,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": 549.7250366210938,
+            "w": 299.33184814453125,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": 566.5,
+            "w": 319.6673889160156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": 578.4249877929688,
+            "w": 319.6105651855469,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 590.4125366210938,
+            "w": 331.63653564453125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 602.3375244140625,
+            "w": 331.6163024902344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 614.3250122070312,
+            "w": 138.91162109375,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": 626.3125,
+            "w": 319.6372985839844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 638.1625366210938,
+            "w": 331.6232604980469,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 650.1500244140625,
+            "w": 331.5934753417969,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 662.1375122070312,
+            "w": 331.6319274902344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 674.0625,
+            "w": 331.6517639160156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 686.0499877929688,
+            "w": 331.6400451660156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 698.0375366210938,
+            "w": 100.5140609741211,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": 709.9625244140625,
+            "w": 319.6268615722656,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 721.9500122070312,
+            "w": 331.6224670410156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 733.7999877929688,
+            "w": 164.61172485351562,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": 745.7875366210938,
+            "w": 319.6280212402344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 757.7750244140625,
+            "w": 331.5990295410156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 769.7000122070312,
+            "w": 250.5603485107422,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": 781.6875,
+            "w": 319.6490173339844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1143.3125,
+            "y": 793.6749877929688,
+            "w": 298.5708923339844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 805.6000366210938,
+            "w": 65.89404296875,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1137.175048828125,
+            "y": 853.8125,
+            "w": 214.45059204101562,
+            "h": 11.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 883.25,
+            "w": 331.6454162597656,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 895.2374877929688,
+            "w": 331.5938415527344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 907.2374877929688,
+            "w": 331.6183776855469,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1142.2625732421875,
+            "y": 919.1500244140625,
+            "w": 264.02032470703125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1153.3250732421875,
+            "y": 931.1375122070312,
+            "w": 288.48565673828125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": 955.0499877929688,
+            "w": 319.6630859375,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 966.9750366210938,
+            "w": 46.76064682006836,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 978.8875122070312,
+            "w": 331.6495056152344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 990.875,
+            "w": 331.6241149902344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1002.875,
+            "w": 331.5771484375,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1014.7875366210938,
+            "w": 331.61114501953125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1026.7750244140625,
+            "w": 122.15303039550781,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": 1038.7000732421875,
+            "w": 118.1578140258789,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1243.5875244140625,
+            "y": 1038.7000732421875,
+            "w": 198.25137329101562,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1050.6875,
+            "w": 331.6437683105469,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 514.4874877929688,
+            "w": 258.615234375,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1217.737548828125,
+            "w": 331.62451171875,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1229.6500244140625,
+            "w": 100.3828125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1213.9124755859375,
+            "y": 1229.6500244140625,
+            "w": 228.01992797851562,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1241.6375732421875,
+            "w": 306.6441345214844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1154.25,
+            "y": 1253.5625,
+            "w": 287.6447448730469,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1265.487548828125,
+            "w": 331.6048889160156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1277.4749755859375,
+            "w": 261.50811767578125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": 1289.4625244140625,
+            "w": 124.55908203125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1249.987548828125,
+            "y": 1289.4625244140625,
+            "w": 191.8095703125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1301.3875732421875,
+            "w": 331.59747314453125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1313.375,
+            "w": 331.6123962402344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1325.2874755859375,
+            "w": 331.6452331542969,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1337.2750244140625,
+            "w": 331.646484375,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": 1361.125,
+            "w": 278.74151611328125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1373.112548828125,
+            "w": 331.6317443847656,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1385.0999755859375,
+            "w": 331.5747985839844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1397.0250244140625,
+            "w": 331.6094665527344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1409.0125732421875,
+            "w": 160.404296875,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1273.9124755859375,
+            "y": 1409.0125732421875,
+            "w": 167.98379516601562,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1421,
+            "w": 224.8186492919922,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": 1432.9124755859375,
+            "w": 319.68194580078125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1444.8375244140625,
+            "w": 122.6573257446289,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1236.1624755859375,
+            "y": 1444.8375244140625,
+            "w": 205.72305297851562,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1456.8250732421875,
+            "w": 331.638671875,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1468.75,
+            "w": 331.5677795410156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1480.737548828125,
+            "w": 331.6141662597656,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1492.6624755859375,
+            "w": 331.61358642578125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": 1516.6375732421875,
+            "w": 319.6568298339844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1528.550048828125,
+            "w": 331.572265625,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1540.4749755859375,
+            "w": 331.5889587402344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1552.4625244140625,
+            "w": 331.6273498535156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1564.3875732421875,
+            "w": 331.61505126953125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1576.375,
+            "w": 198.3759765625,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": 1588.300048828125,
+            "w": 319.6109313964844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1600.2874755859375,
+            "w": 331.6490173339844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1612.2750244140625,
+            "w": 331.64434814453125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1624.1875,
+            "w": 76.9122085571289,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.2000732421875,
+            "y": 1636.112548828125,
+            "w": 319.6483459472656,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1648.0999755859375,
+            "w": 54.14590072631836,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1660.0250244140625,
+            "w": 331.6327209472656,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1672.0125732421875,
+            "w": 331.66015625,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1683.9375,
+            "w": 331.6083984375,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1695.925048828125,
+            "w": 331.6283264160156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1707.9124755859375,
+            "w": 331.6185607910156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1719.8250732421875,
+            "w": 331.6120300292969,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1110.2625732421875,
+            "y": 1731.75,
+            "w": 200.15518188476562,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1352.362548828125,
+            "y": 1192.362548828125,
+            "w": 89.50654602050781,
+            "h": 8.475000381469727
+          }
+        ],
+        "scroller": {
+          "x": 515,
+          "y": 143.40000915527344,
+          "w": 1537,
+          "h": 964.6000366210938
+        },
+        "selBg": "rgba(0, 0, 0, 0.2)",
+        "paintRects": [],
+        "annRects": [
+          {
+            "x": 1110.2625732421875,
+            "y": 221.41250610351562,
+            "w": 331.63751220703125,
+            "h": 11.225000381469727
+          }
+        ],
+        "toolbar": null
+      }
+    },
+    "zoom150": {
+      "dSel": {
+        "spans": [
+          {
+            "x": 1027.1875,
+            "y": -1530.9000244140625,
+            "w": 409.9191589355469,
+            "h": 23.912500381469727
+          },
+          {
+            "x": 1027.1875,
+            "y": -1503.925048828125,
+            "w": 455.7472839355469,
+            "h": 23.912500381469727
+          },
+          {
+            "x": 1027.1875,
+            "y": -1416.112548828125,
+            "w": 222.4376983642578,
+            "h": 14.9375
+          },
+          {
+            "x": 1054.0750732421875,
+            "y": -1281.75,
+            "w": 97.5999984741211,
+            "h": 17.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": -1237.487548828125,
+            "w": 497.4421081542969,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": -1219.612548828125,
+            "w": 497.4258728027344,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": -1201.625,
+            "w": 497.3912048339844,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": -1183.75,
+            "w": 497.41094970703125,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": -1165.7625732421875,
+            "w": 189.67724609375,
+            "h": 14.9375
+          },
+          {
+            "x": 1045.112548828125,
+            "y": -1147.7750244140625,
+            "w": 479.3897399902344,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": -1130,
+            "w": 497.41748046875,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": -1112.0125732421875,
+            "w": 497.39141845703125,
+            "h": 14.9375
+          },
+          {
+            "x": 1429.3125,
+            "y": -1094.0374755859375,
+            "w": 95.1703109741211,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": -1076.1500244140625,
+            "w": 187.9677734375,
+            "h": 14.9375
+          },
+          {
+            "x": 1045.112548828125,
+            "y": -1058.175048828125,
+            "w": 479.5146484375,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": -1040.2874755859375,
+            "w": 497.42333984375,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": -1022.3125,
+            "w": 497.36114501953125,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": -1004.3250122070312,
+            "w": 497.42578125,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": -986.5375366210938,
+            "w": 395.9331970214844,
+            "h": 14.9375
+          },
+          {
+            "x": 1045.112548828125,
+            "y": -968.5625,
+            "w": 479.4377136230469,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": -950.5750122070312,
+            "w": 497.3700256347656,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": -932.7000122070312,
+            "w": 497.4761657714844,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": -914.7125244140625,
+            "w": 497.4664001464844,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": -896.8375244140625,
+            "w": 327.7735290527344,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": -823.7999877929688,
+            "w": 65.41826629638672,
+            "h": 12.699999809265137
+          },
+          {
+            "x": 1027.1875,
+            "y": -808.8250122070312,
+            "w": 277.06005859375,
+            "h": 12.699999809265137
+          },
+          {
+            "x": 1027.1875,
+            "y": -793.9375,
+            "w": 130.3318328857422,
+            "h": 12.699999809265137
+          },
+          {
+            "x": 1027.1875,
+            "y": -756.5750122070312,
+            "w": 187.28672790527344,
+            "h": 12.699999809265137
+          },
+          {
+            "x": 1040.300048828125,
+            "y": -720.7125244140625,
+            "w": 264.1122131347656,
+            "h": 12.699999809265137
+          },
+          {
+            "x": 1027.1875,
+            "y": -705.8250122070312,
+            "w": 127.0557632446289,
+            "h": 12.699999809265137
+          },
+          {
+            "x": 1157.737548828125,
+            "y": -705.8250122070312,
+            "w": 267.4037170410156,
+            "h": 12.699999809265137
+          },
+          {
+            "x": 1027.1875,
+            "y": -690.8375244140625,
+            "w": 183.2742156982422,
+            "h": 12.699999809265137
+          },
+          {
+            "x": 1045.112548828125,
+            "y": -519.4000244140625,
+            "w": 479.5363464355469,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": -501.51251220703125,
+            "w": 497.39923095703125,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": -483.5375061035156,
+            "w": 497.4671936035156,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": -465.6499938964844,
+            "w": 497.3374938964844,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": -447.7749938964844,
+            "w": 497.3722839355469,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": -429.7875061035156,
+            "w": 497.4134826660156,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": -411.8000183105469,
+            "w": 375.0632019042969,
+            "h": 14.9375
+          },
+          {
+            "x": 1045.112548828125,
+            "y": -393.9250183105469,
+            "w": 479.5015563964844,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": -375.9375,
+            "w": 497.4112243652344,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": -358.0625,
+            "w": 497.40771484375,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": -340.07501220703125,
+            "w": 433.6271667480469,
+            "h": 14.9375
+          },
+          {
+            "x": 1045.112548828125,
+            "y": -322.20001220703125,
+            "w": 479.50665283203125,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": -304.3125,
+            "w": 497.41485595703125,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": -286.32501220703125,
+            "w": 316.4611511230469,
+            "h": 14.9375
+          },
+          {
+            "x": 1045.112548828125,
+            "y": -268.3500061035156,
+            "w": 479.5233459472656,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": -250.46250915527344,
+            "w": 497.4501953125,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": -232.4875030517578,
+            "w": 497.5129089355469,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": -214.5,
+            "w": 497.4375915527344,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": -196.625,
+            "w": 497.4966735839844,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": -178.7375030517578,
+            "w": 413.1382751464844,
+            "h": 14.9375
+          },
+          {
+            "x": 1054.0750732421875,
+            "y": -130.28750610351562,
+            "w": 351.5816345214844,
+            "h": 17.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": -86.0374984741211,
+            "w": 497.4664001464844,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": -68.1500015258789,
+            "w": 497.3761901855469,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": -50.16250228881836,
+            "w": 497.4458923339844,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": -32.1875,
+            "w": 497.3365173339844,
+            "h": 14.9375
+          },
+          {
+            "x": 1045.112548828125,
+            "y": 3.575000047683716,
+            "w": 479.4599609375,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 21.5625,
+            "w": 497.4677734375,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 39.4375,
+            "w": 497.376953125,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 57.42499923706055,
+            "w": 497.3617248535156,
+            "h": 14.9375
+          },
+          {
+            "x": 1045.112548828125,
+            "y": 75.3125,
+            "w": 479.4084167480469,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 93.2874984741211,
+            "w": 172.44384765625,
+            "h": 14.9375
+          },
+          {
+            "x": 1067.5875244140625,
+            "y": 141.6374969482422,
+            "w": 199.5322265625,
+            "h": 17.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 185.90000915527344,
+            "w": 497.43194580078125,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 203.875,
+            "w": 244.45498657226562,
+            "h": 14.9375
+          },
+          {
+            "x": 1032.2625732421875,
+            "y": 259.4250183105469,
+            "w": 492.68408203125,
+            "h": 12.699999809265137
+          },
+          {
+            "x": 1027.1875,
+            "y": 274.4125061035156,
+            "w": 497.7990417480469,
+            "h": 12.699999809265137
+          },
+          {
+            "x": 1027.1875,
+            "y": 289.38751220703125,
+            "w": 327.3902282714844,
+            "h": 12.699999809265137
+          },
+          {
+            "x": 1390.362548828125,
+            "y": -557.4625244140625,
+            "w": 134.34170532226562,
+            "h": 12.699999809265137
+          },
+          {
+            "x": 1045.112548828125,
+            "y": 491.70001220703125,
+            "w": 461.8800964355469,
+            "h": 12.699999809265137
+          },
+          {
+            "x": 1045.112548828125,
+            "y": 506.5874938964844,
+            "w": 449.2746276855469,
+            "h": 12.699999809265137
+          },
+          {
+            "x": 1045.112548828125,
+            "y": 531.7625122070312,
+            "w": 479.5044860839844,
+            "h": 14.9375
+          },
+          {
+            "x": 1045.112548828125,
+            "y": 549.6500244140625,
+            "w": 479.40850830078125,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 567.625,
+            "w": 497.4435729980469,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 585.5125122070312,
+            "w": 497.41583251953125,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 603.4874877929688,
+            "w": 208.36865234375,
+            "h": 14.9375
+          },
+          {
+            "x": 1045.112548828125,
+            "y": 621.4750366210938,
+            "w": 479.4468688964844,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 639.25,
+            "w": 497.42852783203125,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 657.2374877929688,
+            "w": 497.3890686035156,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 675.2125244140625,
+            "w": 497.4424743652344,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 693.1000366210938,
+            "w": 497.47784423828125,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 711.0875244140625,
+            "w": 497.46270751953125,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 729.0625,
+            "w": 150.7673797607422,
+            "h": 14.9375
+          },
+          {
+            "x": 1045.112548828125,
+            "y": 746.9500122070312,
+            "w": 479.43829345703125,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 764.9249877929688,
+            "w": 497.4310607910156,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 782.7125244140625,
+            "w": 246.91592407226562,
+            "h": 14.9375
+          },
+          {
+            "x": 1045.112548828125,
+            "y": 800.6875,
+            "w": 479.4424743652344,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 818.6749877929688,
+            "w": 497.3946228027344,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 836.5625,
+            "w": 375.8310546875,
+            "h": 14.9375
+          },
+          {
+            "x": 1045.112548828125,
+            "y": 854.5375366210938,
+            "w": 479.4716796875,
+            "h": 14.9375
+          },
+          {
+            "x": 1076.75,
+            "y": 872.5250244140625,
+            "w": 447.8556823730469,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 890.4000244140625,
+            "w": 98.84062957763672,
+            "h": 14.9375
+          },
+          {
+            "x": 1067.5875244140625,
+            "y": 962.7250366210938,
+            "w": 321.5978698730469,
+            "h": 17.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 1006.8875122070312,
+            "w": 497.4738464355469,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 1024.862548828125,
+            "w": 497.3951110839844,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 1042.8499755859375,
+            "w": 497.4276428222656,
+            "h": 14.9375
+          },
+          {
+            "x": 1075.2249755859375,
+            "y": 1060.737548828125,
+            "w": 396.0176696777344,
+            "h": 14.9375
+          },
+          {
+            "x": 1091.8375244140625,
+            "y": 1078.7125244140625,
+            "w": 432.724609375,
+            "h": 14.9375
+          },
+          {
+            "x": 1045.112548828125,
+            "y": 1114.5750732421875,
+            "w": 479.4896545410156,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 1132.4625244140625,
+            "w": 70.1385726928711,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 1150.3375244140625,
+            "w": 497.46661376953125,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 1168.3250732421875,
+            "w": 497.4219665527344,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 1186.3125,
+            "w": 497.369140625,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 1204.1875,
+            "w": 497.41455078125,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 1222.175048828125,
+            "w": 183.22998046875,
+            "h": 14.9375
+          },
+          {
+            "x": 1045.112548828125,
+            "y": 1240.050048828125,
+            "w": 177.228515625,
+            "h": 14.9375
+          },
+          {
+            "x": 1227.1875,
+            "y": 1240.050048828125,
+            "w": 297.36846923828125,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 1258.0374755859375,
+            "w": 497.4616394042969,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 453.7375183105469,
+            "w": 388.17071533203125,
+            "h": 12.699999809265137
+          },
+          {
+            "x": 1027.1875,
+            "y": 1502.5999755859375,
+            "w": 497.4406433105469,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 1520.487548828125,
+            "w": 150.5810546875,
+            "h": 14.9375
+          },
+          {
+            "x": 1182.6500244140625,
+            "y": 1520.487548828125,
+            "w": 342.0314636230469,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 1538.4625244140625,
+            "w": 459.9720764160156,
+            "h": 14.9375
+          },
+          {
+            "x": 1093.1500244140625,
+            "y": 1556.3499755859375,
+            "w": 431.4750061035156,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 1574.2249755859375,
+            "w": 497.3974609375,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 1592.2125244140625,
+            "w": 392.2663269042969,
+            "h": 14.9375
+          },
+          {
+            "x": 1045.112548828125,
+            "y": 1610.2000732421875,
+            "w": 186.83340454101562,
+            "h": 14.9375
+          },
+          {
+            "x": 1236.8125,
+            "y": 1610.2000732421875,
+            "w": 287.7087097167969,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 1628.0750732421875,
+            "w": 497.3932800292969,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 1646.0625,
+            "w": 497.4111328125,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 1663.9375,
+            "w": 497.46826171875,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 1681.925048828125,
+            "w": 497.4591979980469,
+            "h": 14.9375
+          },
+          {
+            "x": 1045.112548828125,
+            "y": 1717.6875,
+            "w": 418.11016845703125,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 1735.675048828125,
+            "w": 497.4552917480469,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 1753.6500244140625,
+            "w": 497.3620300292969,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 1771.5374755859375,
+            "w": 497.4022521972656,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 1789.5125732421875,
+            "w": 240.611328125,
+            "h": 14.9375
+          },
+          {
+            "x": 1272.6624755859375,
+            "y": 1789.5125732421875,
+            "w": 251.96728515625,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 1807.5,
+            "w": 337.2294006347656,
+            "h": 14.9375
+          },
+          {
+            "x": 1045.112548828125,
+            "y": 1825.375,
+            "w": 479.5093688964844,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 1843.2625732421875,
+            "w": 183.9921875,
+            "h": 14.9375
+          },
+          {
+            "x": 1216.0625,
+            "y": 1843.2625732421875,
+            "w": 308.5811462402344,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 1861.237548828125,
+            "w": 497.4579162597656,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 1879.125,
+            "w": 497.3438415527344,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 1897.112548828125,
+            "w": 497.4209899902344,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 1914.987548828125,
+            "w": 497.4151306152344,
+            "h": 14.9375
+          },
+          {
+            "x": 1045.112548828125,
+            "y": 1950.9500732421875,
+            "w": 479.4798889160156,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 1968.8375244140625,
+            "w": 497.35968017578125,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 1986.7125244140625,
+            "w": 497.3798828125,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 2004.7000732421875,
+            "w": 497.4356384277344,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 2022.5875244140625,
+            "w": 497.4131774902344,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 2040.5625,
+            "w": 297.5653381347656,
+            "h": 14.9375
+          },
+          {
+            "x": 1045.112548828125,
+            "y": 2058.449951171875,
+            "w": 479.41064453125,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 2076.425048828125,
+            "w": 497.47003173828125,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 2094.41259765625,
+            "w": 497.4579162597656,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 2112.28759765625,
+            "w": 115.3597640991211,
+            "h": 14.9375
+          },
+          {
+            "x": 1045.112548828125,
+            "y": 2130.175048828125,
+            "w": 479.47149658203125,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 2148.150146484375,
+            "w": 81.20879364013672,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 2166.03759765625,
+            "w": 497.4447326660156,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 2184.025146484375,
+            "w": 497.47784423828125,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 2201.900146484375,
+            "w": 497.4093933105469,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 2219.887451171875,
+            "w": 497.43438720703125,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 2237.862548828125,
+            "w": 497.4136657714844,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 2255.75,
+            "w": 497.40802001953125,
+            "h": 14.9375
+          },
+          {
+            "x": 1027.1875,
+            "y": 2273.625,
+            "w": 300.2352600097656,
+            "h": 14.9375
+          },
+          {
+            "x": 1390.362548828125,
+            "y": 1464.5374755859375,
+            "w": 134.34170532226562,
+            "h": 12.699999809265137
+          }
+        ],
+        "scroller": {
+          "x": 515,
+          "y": 143.40000915527344,
+          "w": 1537,
+          "h": 964.6000366210938
+        },
+        "selBg": "rgba(0, 0, 0, 0.2)",
+        "paintRects": [],
+        "annRects": [
+          {
+            "x": 1031.375,
+            "y": -34.03750228881836,
+            "w": 493.13751220703125,
+            "h": 16.837499618530273
+          },
+          {
+            "x": 1027.175048828125,
+            "y": -12.4375,
+            "w": 47.9375,
+            "h": 16.837499618530273
+          },
+          {
+            "x": 1045.112548828125,
+            "y": 9.162500381469727,
+            "w": 479.45001220703125,
+            "h": 16.837499618530273
+          },
+          {
+            "x": 1027.175048828125,
+            "y": 30.762500762939453,
+            "w": 497.4624938964844,
+            "h": 16.837499618530273
+          }
+        ],
+        "toolbar": null
+      }
+    },
+    "medium": {
+      "existing": {
+        "spans": [
+          {
+            "x": 1079.362548828125,
+            "y": -621.4000244140625,
+            "w": 273.2835998535156,
+            "h": 15.9375
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -603.4125366210938,
+            "w": 303.83544921875,
+            "h": 15.9375
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -544.875,
+            "w": 148.2965850830078,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1097.2750244140625,
+            "y": -455.3000183105469,
+            "w": 65.08613586425781,
+            "h": 11.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -425.8000183105469,
+            "w": 331.62158203125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -413.875,
+            "w": 331.6188659667969,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -401.88751220703125,
+            "w": 331.5967712402344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -389.9624938964844,
+            "w": 331.6076354980469,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -377.9750061035156,
+            "w": 126.4576187133789,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": -365.9875183105469,
+            "w": 319.6006774902344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -354.13751220703125,
+            "w": 331.6159362792969,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -342.1499938964844,
+            "w": 331.5957946777344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1347.4625244140625,
+            "y": -330.1625061035156,
+            "w": 63.45097732543945,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -318.2375183105469,
+            "w": 125.314453125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": -306.25,
+            "w": 319.6865234375,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -294.32501220703125,
+            "w": 331.6131896972656,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -282.3374938964844,
+            "w": 331.5796813964844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -270.3500061035156,
+            "w": 331.61474609375,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -258.5,
+            "w": 263.95849609375,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": -246.5124969482422,
+            "w": 319.6275329589844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -234.52500915527344,
+            "w": 331.5791015625,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -222.60000610351562,
+            "w": 331.6468811035156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -210.6125030517578,
+            "w": 331.6490173339844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -198.6875,
+            "w": 218.51953125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -150,
+            "w": 43.583984375,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -140.0124969482422,
+            "w": 184.5994110107422,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -130.08750915527344,
+            "w": 86.8330078125,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -105.1875,
+            "w": 124.7904281616211,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1088.0999755859375,
+            "y": -81.2750015258789,
+            "w": 175.9650421142578,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -71.3499984741211,
+            "w": 84.6504898071289,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1166.375,
+            "y": -71.3499984741211,
+            "w": 178.16299438476562,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -61.36249923706055,
+            "w": 122.11006164550781,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 56.9375,
+            "w": 319.6965026855469,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 68.8499984741211,
+            "w": 331.6001892089844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 80.8375015258789,
+            "w": 331.64532470703125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 92.76250457763672,
+            "w": 331.5599670410156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 104.6875,
+            "w": 331.5853576660156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 116.67500305175781,
+            "w": 331.6105651855469,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 128.66250610351562,
+            "w": 250.0441436767578,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 140.58750915527344,
+            "w": 319.66796875,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 152.5749969482422,
+            "w": 331.6064453125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 164.4875030517578,
+            "w": 331.60333251953125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 176.47500610351562,
+            "w": 289.087890625,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 188.40000915527344,
+            "w": 319.669921875,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 200.3249969482422,
+            "w": 331.60968017578125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 212.3125,
+            "w": 210.97842407226562,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 224.3000030517578,
+            "w": 319.6788024902344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 236.22500610351562,
+            "w": 331.6328125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 248.21250915527344,
+            "w": 331.6776428222656,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 260.20001220703125,
+            "w": 331.6332092285156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 272.1125183105469,
+            "w": 331.6690368652344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 284.0375061035156,
+            "w": 275.43048095703125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1097.2750244140625,
+            "y": 316.3374938964844,
+            "w": 234.44668579101562,
+            "h": 11.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 345.8374938964844,
+            "w": 331.646484375,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 357.76251220703125,
+            "w": 331.58380126953125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 369.75,
+            "w": 331.6302795410156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 381.7375183105469,
+            "w": 331.56280517578125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 405.5874938964844,
+            "w": 319.638671875,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 417.57501220703125,
+            "w": 331.6455993652344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 429.4875183105469,
+            "w": 331.5853576660156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 441.4750061035156,
+            "w": 331.5757751464844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 453.3999938964844,
+            "w": 319.6112365722656,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 465.38751220703125,
+            "w": 114.96406555175781,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1106.2750244140625,
+            "y": 497.625,
+            "w": 133.05166625976562,
+            "h": 11.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 527.125,
+            "w": 331.6193542480469,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 539.1124877929688,
+            "w": 162.9675750732422,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1082.737548828125,
+            "y": 576.1500244140625,
+            "w": 328.25048828125,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 586.1375122070312,
+            "w": 331.6618347167969,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 596.125,
+            "w": 218.12315368652344,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1321.4625244140625,
+            "y": 31.5625,
+            "w": 89.50654602050781,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 735,
+            "w": 307.72589111328125,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 744.9249877929688,
+            "w": 299.33184814453125,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 761.7000122070312,
+            "w": 319.6673889160156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 773.625,
+            "w": 319.6105651855469,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 785.6124877929688,
+            "w": 331.63653564453125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 797.5375366210938,
+            "w": 331.6163024902344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 809.5250244140625,
+            "w": 138.91162109375,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 821.5125122070312,
+            "w": 319.6372985839844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 833.3624877929688,
+            "w": 331.6232604980469,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 845.3500366210938,
+            "w": 331.5934753417969,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 857.3375244140625,
+            "w": 331.6319274902344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 869.2625122070312,
+            "w": 331.6517639160156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 881.25,
+            "w": 331.6400451660156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 893.2374877929688,
+            "w": 100.5140609741211,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 905.1625366210938,
+            "w": 319.6268615722656,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 917.1500244140625,
+            "w": 331.6224670410156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 929,
+            "w": 164.61172485351562,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 940.9874877929688,
+            "w": 319.6280212402344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 952.9750366210938,
+            "w": 331.5990295410156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 964.9000244140625,
+            "w": 250.5603485107422,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 976.8875122070312,
+            "w": 319.6490173339844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1112.4124755859375,
+            "y": 988.875,
+            "w": 298.5708923339844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1000.7999877929688,
+            "w": 65.89404296875,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1106.2750244140625,
+            "y": 1049.0125732421875,
+            "w": 214.45059204101562,
+            "h": 11.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1078.4500732421875,
+            "w": 331.6454162597656,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1090.4375,
+            "w": 331.5938415527344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1102.4375,
+            "w": 331.6183776855469,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1111.362548828125,
+            "y": 1114.3499755859375,
+            "w": 264.02032470703125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.425048828125,
+            "y": 1126.3375244140625,
+            "w": 288.48565673828125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 1150.25,
+            "w": 319.6630859375,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1162.175048828125,
+            "w": 46.76064682006836,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1174.0875244140625,
+            "w": 331.6495056152344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1186.0750732421875,
+            "w": 331.6241149902344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1198.0750732421875,
+            "w": 331.5771484375,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1209.987548828125,
+            "w": 331.61114501953125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1221.9749755859375,
+            "w": 122.15303039550781,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 1233.9000244140625,
+            "w": 118.1578140258789,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1212.6875,
+            "y": 1233.9000244140625,
+            "w": 198.25137329101562,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1245.8875732421875,
+            "w": 331.6437683105469,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 709.6875,
+            "w": 258.615234375,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1412.9375,
+            "w": 331.62451171875,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1424.8499755859375,
+            "w": 100.3828125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1183.0125732421875,
+            "y": 1424.8499755859375,
+            "w": 228.01992797851562,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1436.8375244140625,
+            "w": 306.6441345214844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1123.3499755859375,
+            "y": 1448.7625732421875,
+            "w": 287.6447448730469,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1460.6875,
+            "w": 331.6048889160156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1472.675048828125,
+            "w": 261.50811767578125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 1484.6624755859375,
+            "w": 124.55908203125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1219.0875244140625,
+            "y": 1484.6624755859375,
+            "w": 191.8095703125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1496.5875244140625,
+            "w": 331.59747314453125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1508.5750732421875,
+            "w": 331.6123962402344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1520.487548828125,
+            "w": 331.6452331542969,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1532.4749755859375,
+            "w": 331.646484375,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 1556.3250732421875,
+            "w": 278.74151611328125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1568.3125,
+            "w": 331.6317443847656,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1580.300048828125,
+            "w": 331.5747985839844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1592.2249755859375,
+            "w": 331.6094665527344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1604.2125244140625,
+            "w": 160.404296875,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1243.0125732421875,
+            "y": 1604.2125244140625,
+            "w": 167.98379516601562,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1616.2000732421875,
+            "w": 224.8186492919922,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 1628.112548828125,
+            "w": 319.68194580078125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1640.0374755859375,
+            "w": 122.6573257446289,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1205.2625732421875,
+            "y": 1640.0374755859375,
+            "w": 205.72305297851562,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1652.0250244140625,
+            "w": 331.638671875,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1663.9500732421875,
+            "w": 331.5677795410156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1675.9375,
+            "w": 331.6141662597656,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1687.862548828125,
+            "w": 331.61358642578125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 1711.8375244140625,
+            "w": 319.6568298339844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1723.75,
+            "w": 331.572265625,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1735.675048828125,
+            "w": 331.5889587402344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1747.6624755859375,
+            "w": 331.6273498535156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1759.5875244140625,
+            "w": 331.61505126953125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1771.5750732421875,
+            "w": 198.3759765625,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 1783.5,
+            "w": 319.6109313964844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1795.487548828125,
+            "w": 331.6490173339844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1807.4749755859375,
+            "w": 331.64434814453125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1819.3875732421875,
+            "w": 76.9122085571289,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 1831.3125,
+            "w": 319.6483459472656,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1843.300048828125,
+            "w": 54.14590072631836,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1855.2249755859375,
+            "w": 331.6327209472656,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1867.2125244140625,
+            "w": 331.66015625,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1879.1375732421875,
+            "w": 331.6083984375,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1891.125,
+            "w": 331.6283264160156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1903.112548828125,
+            "w": 331.6185607910156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1915.0250244140625,
+            "w": 331.6120300292969,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1926.9500732421875,
+            "w": 200.15518188476562,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1321.4625244140625,
+            "y": 1387.5625,
+            "w": 89.50654602050781,
+            "h": 8.475000381469727
+          }
+        ],
+        "scroller": {
+          "x": 453.20001220703125,
+          "y": 133.1999969482422,
+          "w": 1598.800048828125,
+          "h": 974.7999877929688
+        },
+        "selBg": "rgba(0, 0, 0, 0.2)",
+        "paintRects": [],
+        "annRects": [
+          {
+            "x": 1079.362548828125,
+            "y": 416.6125183105469,
+            "w": 331.63751220703125,
+            "h": 11.225000381469727
+          }
+        ],
+        "toolbar": null
+      },
+      "select": {
+        "spans": [
+          {
+            "x": 1079.362548828125,
+            "y": -1595.800048828125,
+            "w": 273.2835998535156,
+            "h": 15.9375
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -1577.8125,
+            "w": 303.83544921875,
+            "h": 15.9375
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -1519.2750244140625,
+            "w": 148.2965850830078,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1097.2750244140625,
+            "y": -1429.7000732421875,
+            "w": 65.08613586425781,
+            "h": 11.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -1400.2000732421875,
+            "w": 331.62158203125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -1388.2750244140625,
+            "w": 331.6188659667969,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -1376.2874755859375,
+            "w": 331.5967712402344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -1364.362548828125,
+            "w": 331.6076354980469,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -1352.375,
+            "w": 126.4576187133789,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": -1340.3875732421875,
+            "w": 319.6006774902344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -1328.5374755859375,
+            "w": 331.6159362792969,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -1316.550048828125,
+            "w": 331.5957946777344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1347.4625244140625,
+            "y": -1304.5625,
+            "w": 63.45097732543945,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -1292.6375732421875,
+            "w": 125.314453125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": -1280.6500244140625,
+            "w": 319.6865234375,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -1268.7249755859375,
+            "w": 331.6131896972656,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -1256.737548828125,
+            "w": 331.5796813964844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -1244.75,
+            "w": 331.61474609375,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -1232.9000244140625,
+            "w": 263.95849609375,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": -1220.9124755859375,
+            "w": 319.6275329589844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -1208.925048828125,
+            "w": 331.5791015625,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -1197,
+            "w": 331.6468811035156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -1185.0125732421875,
+            "w": 331.6490173339844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -1173.0875244140625,
+            "w": 218.51953125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -1124.4000244140625,
+            "w": 43.583984375,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -1114.4124755859375,
+            "w": 184.5994110107422,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -1104.487548828125,
+            "w": 86.8330078125,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -1079.5875244140625,
+            "w": 124.7904281616211,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1088.0999755859375,
+            "y": -1055.675048828125,
+            "w": 175.9650421142578,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -1045.75,
+            "w": 84.6504898071289,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1166.375,
+            "y": -1045.75,
+            "w": 178.16299438476562,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -1035.7625732421875,
+            "w": 122.11006164550781,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1091.300048828125,
+            "y": -917.4625244140625,
+            "w": 319.6965026855469,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -905.5499877929688,
+            "w": 331.6001892089844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -893.5625,
+            "w": 331.64532470703125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -881.6375122070312,
+            "w": 331.5599670410156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -869.7125244140625,
+            "w": 331.5853576660156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -857.7250366210938,
+            "w": 331.6105651855469,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -845.7374877929688,
+            "w": 250.0441436767578,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": -833.8125,
+            "w": 319.66796875,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -821.8250122070312,
+            "w": 331.6064453125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -809.9125366210938,
+            "w": 331.60333251953125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -797.9249877929688,
+            "w": 289.087890625,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": -786,
+            "w": 319.669921875,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -774.0750122070312,
+            "w": 331.60968017578125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -762.0875244140625,
+            "w": 210.97842407226562,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": -750.1000366210938,
+            "w": 319.6788024902344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -738.1749877929688,
+            "w": 331.6328125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -726.1875,
+            "w": 331.6776428222656,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -714.2000122070312,
+            "w": 331.6332092285156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -702.2875366210938,
+            "w": 331.6690368652344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -690.3624877929688,
+            "w": 275.43048095703125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1097.2750244140625,
+            "y": -658.0625,
+            "w": 234.44668579101562,
+            "h": 11.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -628.5625,
+            "w": 331.646484375,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -616.6375122070312,
+            "w": 331.58380126953125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -604.6500244140625,
+            "w": 331.6302795410156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -592.6625366210938,
+            "w": 331.56280517578125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": -568.8125,
+            "w": 319.638671875,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -556.8250122070312,
+            "w": 331.6455993652344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -544.9125366210938,
+            "w": 331.5853576660156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -532.9249877929688,
+            "w": 331.5757751464844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": -521,
+            "w": 319.6112365722656,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -509.01251220703125,
+            "w": 114.96406555175781,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1106.2750244140625,
+            "y": -476.7749938964844,
+            "w": 133.05166625976562,
+            "h": 11.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -447.2749938964844,
+            "w": 331.6193542480469,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -435.2875061035156,
+            "w": 162.9675750732422,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1082.737548828125,
+            "y": -398.25,
+            "w": 328.25048828125,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -388.26251220703125,
+            "w": 331.6618347167969,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -378.2749938964844,
+            "w": 218.12315368652344,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1321.4625244140625,
+            "y": -942.8375244140625,
+            "w": 89.50654602050781,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1091.300048828125,
+            "y": -239.40000915527344,
+            "w": 307.72589111328125,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1091.300048828125,
+            "y": -229.47500610351562,
+            "w": 299.33184814453125,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1091.300048828125,
+            "y": -212.6999969482422,
+            "w": 319.6673889160156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": -200.77500915527344,
+            "w": 319.6105651855469,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -188.78750610351562,
+            "w": 331.63653564453125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -176.8625030517578,
+            "w": 331.6163024902344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -164.875,
+            "w": 138.91162109375,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": -152.8874969482422,
+            "w": 319.6372985839844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -141.03750610351562,
+            "w": 331.6232604980469,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -129.0500030517578,
+            "w": 331.5934753417969,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -117.0625,
+            "w": 331.6319274902344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -105.13750457763672,
+            "w": 331.6517639160156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -93.1500015258789,
+            "w": 331.6400451660156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -81.1624984741211,
+            "w": 100.5140609741211,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": -69.23750305175781,
+            "w": 319.6268615722656,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -57.25,
+            "w": 331.6224670410156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -45.400001525878906,
+            "w": 164.61172485351562,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": -33.41250228881836,
+            "w": 319.6280212402344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -21.42500114440918,
+            "w": 331.5990295410156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -9.5,
+            "w": 250.5603485107422,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 2.487499952316284,
+            "w": 319.6490173339844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1112.4124755859375,
+            "y": 14.475000381469727,
+            "w": 298.5708923339844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 26.399999618530273,
+            "w": 65.89404296875,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1106.2750244140625,
+            "y": 74.61250305175781,
+            "w": 214.45059204101562,
+            "h": 11.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 104.05000305175781,
+            "w": 331.6454162597656,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 116.0374984741211,
+            "w": 331.5938415527344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 128.03750610351562,
+            "w": 331.6183776855469,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1111.362548828125,
+            "y": 139.9499969482422,
+            "w": 264.02032470703125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1122.425048828125,
+            "y": 151.9375,
+            "w": 288.48565673828125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 175.85000610351562,
+            "w": 319.6630859375,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 187.77500915527344,
+            "w": 46.76064682006836,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 199.6875,
+            "w": 331.6495056152344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 211.6750030517578,
+            "w": 331.6241149902344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 223.6750030517578,
+            "w": 331.5771484375,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 235.58750915527344,
+            "w": 331.61114501953125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 247.5749969482422,
+            "w": 122.15303039550781,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 259.5,
+            "w": 118.1578140258789,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1212.6875,
+            "y": 259.5,
+            "w": 198.25137329101562,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 271.4875183105469,
+            "w": 331.6437683105469,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": -264.7124938964844,
+            "w": 258.615234375,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 438.5375061035156,
+            "w": 331.62451171875,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 450.45001220703125,
+            "w": 100.3828125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1183.0125732421875,
+            "y": 450.45001220703125,
+            "w": 228.01992797851562,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 462.4375,
+            "w": 306.6441345214844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1123.3499755859375,
+            "y": 474.3625183105469,
+            "w": 287.6447448730469,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 486.2875061035156,
+            "w": 331.6048889160156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 498.2749938964844,
+            "w": 261.50811767578125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 510.26251220703125,
+            "w": 124.55908203125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1219.0875244140625,
+            "y": 510.26251220703125,
+            "w": 191.8095703125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 522.1875,
+            "w": 331.59747314453125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 534.1749877929688,
+            "w": 331.6123962402344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 546.0875244140625,
+            "w": 331.6452331542969,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 558.0750122070312,
+            "w": 331.646484375,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 581.9249877929688,
+            "w": 278.74151611328125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 593.9125366210938,
+            "w": 331.6317443847656,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 605.9000244140625,
+            "w": 331.5747985839844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 617.8250122070312,
+            "w": 331.6094665527344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 629.8125,
+            "w": 160.404296875,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1243.0125732421875,
+            "y": 629.8125,
+            "w": 167.98379516601562,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 641.7999877929688,
+            "w": 224.8186492919922,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 653.7125244140625,
+            "w": 319.68194580078125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 665.6375122070312,
+            "w": 122.6573257446289,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1205.2625732421875,
+            "y": 665.6375122070312,
+            "w": 205.72305297851562,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 677.625,
+            "w": 331.638671875,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 689.5499877929688,
+            "w": 331.5677795410156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 701.5375366210938,
+            "w": 331.6141662597656,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 713.4625244140625,
+            "w": 331.61358642578125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 737.4375,
+            "w": 319.6568298339844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 749.3500366210938,
+            "w": 331.572265625,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 761.2750244140625,
+            "w": 331.5889587402344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 773.2625122070312,
+            "w": 331.6273498535156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 785.1875,
+            "w": 331.61505126953125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 797.1749877929688,
+            "w": 198.3759765625,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 809.1000366210938,
+            "w": 319.6109313964844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 821.0875244140625,
+            "w": 331.6490173339844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 833.0750122070312,
+            "w": 331.64434814453125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 844.9874877929688,
+            "w": 76.9122085571289,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 856.9125366210938,
+            "w": 319.6483459472656,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 868.9000244140625,
+            "w": 54.14590072631836,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 880.8250122070312,
+            "w": 331.6327209472656,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 892.8125,
+            "w": 331.66015625,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 904.7374877929688,
+            "w": 331.6083984375,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 916.7250366210938,
+            "w": 331.6283264160156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 928.7125244140625,
+            "w": 331.6185607910156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 940.625,
+            "w": 331.6120300292969,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 952.5499877929688,
+            "w": 200.15518188476562,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1321.4625244140625,
+            "y": 413.1625061035156,
+            "w": 89.50654602050781,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1106.2750244140625,
+            "y": 1116.2625732421875,
+            "w": 224.92784118652344,
+            "h": 11.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1145.7000732421875,
+            "w": 331.6131896972656,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1157.6875,
+            "w": 331.63916015625,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1169.612548828125,
+            "w": 149.34873962402344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 1181.5999755859375,
+            "w": 319.6459045410156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1193.5875244140625,
+            "w": 331.6027526855469,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1205.5125732421875,
+            "w": 331.6036071777344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1217.5,
+            "w": 331.61407470703125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1229.425048828125,
+            "w": 331.5908203125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1241.3375244140625,
+            "w": 135.38623046875,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 1253.3250732421875,
+            "w": 319.6478576660156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1265.25,
+            "w": 331.5733337402344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1277.237548828125,
+            "w": 331.6109313964844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1289.2249755859375,
+            "w": 331.62548828125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1301.1500244140625,
+            "w": 331.6300964355469,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1313.1375732421875,
+            "w": 276.2115173339844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 1325.0625,
+            "w": 319.69482421875,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1336.9749755859375,
+            "w": 112.66845703125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1354.9625244140625,
+            "w": 155.19961547851562,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1366.8875732421875,
+            "w": 116.86602020263672,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1378.875,
+            "w": 125.21758270263672,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1390.7874755859375,
+            "w": 116.3623046875,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1402.7750244140625,
+            "w": 134.1720733642578,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 1420.7000732421875,
+            "w": 319.6449279785156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1432.612548828125,
+            "w": 331.5660095214844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1444.5999755859375,
+            "w": 331.5715026855469,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1456.5875244140625,
+            "w": 331.6202087402344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1468.5125732421875,
+            "w": 331.5853576660156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1480.5,
+            "w": 331.5680847167969,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1492.425048828125,
+            "w": 112.62187957763672,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 1504.4124755859375,
+            "w": 319.6786193847656,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1516.3375244140625,
+            "w": 331.6042175292969,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1528.25,
+            "w": 331.6576232910156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1540.237548828125,
+            "w": 331.5810546875,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1552.2249755859375,
+            "w": 322.1831970214844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 1564.1500244140625,
+            "w": 165.3468780517578,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1259.925048828125,
+            "y": 1564.1500244140625,
+            "w": 151.0792999267578,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1576.1375732421875,
+            "w": 331.5674743652344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1588.0625,
+            "w": 331.65625,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1600.050048828125,
+            "w": 145.24453735351562,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 1611.9749755859375,
+            "w": 319.68145751953125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1623.8875732421875,
+            "w": 331.67559814453125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1635.875,
+            "w": 331.6412048339844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1091.2874755859375,
+            "w": 258.615234375,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1794.5374755859375,
+            "w": 107.0977554321289,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1189.7249755859375,
+            "y": 1794.5374755859375,
+            "w": 221.2277374267578,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1806.4500732421875,
+            "w": 331.6070251464844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1818.4375,
+            "w": 331.6127014160156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1830.362548828125,
+            "w": 67.92236328125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1106.2750244140625,
+            "y": 1874.125,
+            "w": 181.02139282226562,
+            "h": 11.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1903.625,
+            "w": 331.6214904785156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1927.5374755859375,
+            "w": 331.6244201660156,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1939.4500732421875,
+            "w": 331.6213073730469,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1951.375,
+            "w": 331.6119079589844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1963.362548828125,
+            "w": 126.93623352050781,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 1975.2874755859375,
+            "w": 319.6797790527344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1987.2750244140625,
+            "w": 331.6584167480469,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 1999.2625732421875,
+            "w": 197.16543579101562,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 2011.1875,
+            "w": 319.6649475097656,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 2023.175048828125,
+            "w": 331.6044921875,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 2035.1624755859375,
+            "w": 331.64044189453125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 2047.0125732421875,
+            "w": 183.9343719482422,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 2059,
+            "w": 319.66339111328125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 2070.925048828125,
+            "w": 331.6143493652344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 2082.91259765625,
+            "w": 331.61798095703125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 2106.824951171875,
+            "w": 319.65185546875,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 2118.8125,
+            "w": 331.6083068847656,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 2130.800048828125,
+            "w": 331.59454345703125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 2142.650146484375,
+            "w": 331.63214111328125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 2154.637451171875,
+            "w": 124.2660140991211,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1091.300048828125,
+            "y": 2166.625,
+            "w": 319.66973876953125,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 2178.550048828125,
+            "w": 331.6265563964844,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1079.362548828125,
+            "y": 2190.53759765625,
+            "w": 143.84825134277344,
+            "h": 9.96250057220459
+          },
+          {
+            "x": 1105.875,
+            "y": 2319.337646484375,
+            "w": 103.7557601928711,
+            "h": 8.475000381469727
+          },
+          {
+            "x": 1321.4625244140625,
+            "y": 1769.1624755859375,
+            "w": 89.50654602050781,
+            "h": 8.475000381469727
+          }
+        ],
+        "scroller": {
+          "x": 453.20001220703125,
+          "y": 133.1999969482422,
+          "w": 1598.800048828125,
+          "h": 974.7999877929688
+        },
+        "selBg": "rgba(0, 0, 0, 0.2)",
+        "paintRects": [],
+        "annRects": [
+          {
+            "x": 1079.362548828125,
+            "y": -557.7875366210938,
+            "w": 331.63751220703125,
+            "h": 11.225000381469727
+          }
+        ],
+        "toolbar": {
+          "x": 1140.6500244140625,
+          "y": 378.0249938964844,
+          "w": 293.5,
+          "h": 34
+        }
+      }
+    }
+  },
+  "results": [
+    {
+      "id": "a/paint-present",
+      "baselineOnly": true,
+      "detail": "自绘块 0 个（跨 3 行拖选；::selection=rgba(0, 0, 0, 0.2)）"
+    },
+    {
+      "id": "a/paint-no-overlap",
+      "baselineOnly": true,
+      "detail": "自绘块两两相交面积 max=0.00px²（≤0.5 吞亚像素）"
+    },
+    {
+      "id": "a/native-selection-transparent",
+      "baselineOnly": true,
+      "detail": "::selection computed=rgba(0, 0, 0, 0.2)（transparent——视觉单通道=自绘层）"
+    },
+    {
+      "id": "c/toolbar-in-viewport",
+      "baselineOnly": true,
+      "detail": "工具条 (1255,566,333×38) 在滚动容器 (515,143,1537×965) 可视区内"
+    },
+    {
+      "id": "c/toolbar-near-selection",
+      "baselineOnly": true,
+      "detail": "工具条距选区顶 334.1px（<60）"
+    },
+    {
+      "id": "b/ann-align-text",
+      "baselineOnly": true,
+      "detail": "标注块边缘与行簇顶/底偏差 max=0.96px（≤2；1 块）"
+    },
+    {
+      "id": "b/ann-no-overlap",
+      "baselineOnly": true,
+      "detail": "标注块两两相交面积 max=0.00px²"
+    },
+    {
+      "id": "f/no-pageerror",
+      "baselineOnly": true,
+      "detail": "页面错误 0 条"
+    }
+  ]
+}
\ No newline at end of file
diff --git a/scripts/audits/f-a4-ticket.md b/scripts/audits/f-a4-ticket.md
new file mode 100644
index 000000000..a8d60f109
--- /dev/null
+++ b/scripts/audits/f-a4-ticket.md
@@ -0,0 +1,47 @@
+# F-A4 需求票:选区视觉并集自绘+标注贴行自适应+工具条定位归一(三面同链)
+
+> 需求源:用户 2026-08-31 复测反馈(最高优先级,附两图)。基线:verify
+> 117 文件 987 / locks 199 / e2e 29(ce4ccbeeb)。用户理想状态原话:
+> 「连续段落选中,矩形高度与位置匹配文字;重叠部分渲染不加深;或依据
+> pdf 文字大小和行间距决定矩形多宽」。
+
+## 0. 现象×根因×修法矩阵(排场探员全链报告已实证行号;交审计)
+
+| 面 | 现象(用户图证) | 根因(行号证据) | 修法 |
+| --- | --- | --- | --- |
+| a 选区重叠加深 | 图一:多行灰块行交界横向深带 | **native ::selection 逐 span 绘制**(text-layer.css:84-86,alpha 0.20),pdf.js span 行盒=CSS 回退字体度量(annotation-style.ts:28-33)相邻行垂直重叠→0.20×2≈0.36;**行间钳制(mergeLineRects/mergeRects)只挂保存/渲染链,live 选区零覆盖**(annotation-anchor.ts:191-203);官方 pdf.js 已知缺陷(同 issue #17561)——**CSS 层无解,唯一根治=自绘并集** | SelectionLayer evaluate 已产出像素域 rects——新增自绘并集层(mergeRects 产物单次绘制),::selection 背景透明化;**ADR-0019 R1 修订**(原裁决回官方原生;当年删除病根=拖选零反馈(挂 mouseup/防抖后)+30% accent 近不可见——今 selectionchange 200ms 防抖路径在场+观感灰 0.20 在案,两病根均解;修订依据=用户根治令) |
+| b 标注贴行 | 图二:黄块左下偏+跨两行不分行+左溢出文字区 | ①INV-40 已知边界:紧行距跨行并簇成**单高块**(annotation-merge.ts 聚类容差 min(hNew,hRowMedian)/2);②TRIM_TOP=0.1/TRIM_BOTTOM=0.12 **定值**收边对行高不匹配(annotation-style.ts:34-35,F-11 定值修复的残余);③渲染重锚 findRangeAtOffset 同管线放大;④ui-scale≠1 量测污染加分(F-R2 同族,160-450px 在档) | ①并簇容差改行高感知(以 PDF 行高(textContent item 高度/textLayer span 行盒簇)为基准而非输入 rect 高);②TRIM 定值→**按行高自适应**(用户理想状态:矩形高度与位置匹配文字——以该行簇的 span 实测行盒为准,不再百分比定值硬切);③重锚链同源受益 |
+| c 工具条偏远 | 图一:弹窗在视口底部远离选区 | **坐标系双重放大**:x/y=gBCR 视口 px 差值(已含 ui-scale ×1.25)写入 left/top 后又被 CSS zoom 再放大(SelectionLayer.tsx:148-152;挂载盒在补偿子树外);且**无视口夹取/无下翻转**(永远放选区上方 42px,y=max(...,0) 贴页顶) | ①差值÷有效 zoom 归一(crib F-L2 rootToLocalScale 思想 reader 版:clientWidth/gBCR.width 比值,零 CSS 类耦合);②视口夹取(工具条不越滚动容器可视区)+选区近顶时下翻转(放选区下方) |
+
+跨面序列:S1 拖选中(200ms 节流)自绘块实时跟随+S2 松手保存(自绘块与保存 rects 同源——**所见即所存**)+S3 保存后标注渲染(b 面贴行,与自绘块对齐)+S4 工具条在视口内贴选区(c 面)+S5 Escape 清除(自绘块随选区清除——INV-37 视觉-状态严格同步语义保持)+S6 换档/缩放下三面几何稳定。
+
+## 1. 行为层
+
+- **a**:SelectionLayer 渲染自绘并集层(数据=evaluate 时 mergeLineRects+mergeRects 像素域产物;渲染 div absolute 于挂载盒,色 rgba(0,0,0,0.20) 同现观感);::selection 背景 transparent(text-layer.css 改);拖选期经 selectionchange 200ms 防抖更新(既有节流);Escape/清除同步消失(INV-37)。
+- **b**:mergeRects 聚类容差行高感知化(紧行距不再跨行并簇——INV-40 边界修复,登记册同步);rectStyle TRIM 改行盒基准(该行簇 span 实测行盒,顶贴字形顶缘底贴底缘的既有 F-11 语义用自适应值实现);**存量 rects 兼容**(挂 B 读时归并不变——零迁移)。
+- **c**:SelectionLayer 工具条定位差值÷有效 zoom(比值=el.clientWidth/el.gBCR.width 同型 helper,守卫≤0→1);视口夹取(滚动容器可视区 clamp)+选区顶距视口顶<工具条高+间隙时下翻转。
+- 既有零变:保存链归一化坐标存储/verifyQuote 自愈/AI 层管线/跨页拒绝/F-12 拖选位移阈值/选择模式(INV-42)。
+
+## 2. 接口层
+
+- SelectionToolbar props(x/y)+SelectionLayer 对外行为零变;annotation-merge 导出签名如需扩(行高参数)**可选参缺省兼容**;text-layer.css ::selection 值改 transparent(组件库内部)。
+
+## 3. 架构层
+
+- 自绘层驻 SelectionLayer(组件内局部 state 渲染——不复活 SelectionRects.tsx 旧件名,新写并入或拆件按 ≤250 行红线自裁);行高感知数据源=textLayer span(渲染时 DOM 在场);分层不动零新依赖。
+- **受锁改写面(主控已 unlock,实现者可改;禁跑 locks 命令)**:tests/unit/renderer/selection-layer.test.tsx(定位断言改归一坐标+新断言)/tests/unit/renderer/annotation-merge.test.ts(INV-40 边界新断言)/tests/e2e/reader-text.spec.ts(官方半透明精确值断言→自绘并集断言;selection-rects 0 计数守卫**反转**为自绘在场断言)——**改向先行红**,全量 verify 必跑(AGENTS 受锁 e2e 教训)。
+
+## 4. 生命周期层
+
+- 自绘层生命周期=选区生命周期(evaluate 置位/清除置空);换页/换文献随挂载盒卸载;不做:选区动画/跨页选区渲染(既有拒绝面)。
+
+## 5. 文化层
+
+- 新测试 tests/unit/renderer/selection-paint.test.tsx(always-active):a 面并集层渲染(相邻行重叠输入→单层不叠深——断言渲染 div 数=归并数+无重叠区域)+S1~S5 序列;b 面紧行距夹具不再并簇+TRIM 自适应值断言;c 面归一/夹取/翻转三态。
+- 变异红证 M1~M5(cp 备份一次性目录+F-R1 事故教训:还原 diff+回绿双验)。
+- 真机探针 scripts/audits/f-a4-verify.mjs(先核撞名):**用户实况 large 档**真实库——修前三现象基线取证(数值)→修后复测:①多行拖选自绘块无叠深(相邻块两两相交面积=0,crib INV-40 判据);②保存标注渲染与自绘块对齐(同文字行簇 top/height 偏差≤2px);③工具条 bounding 在滚动容器可视区内且距选区顶<60px;④S6 三档/缩放稳定;⑤pageerror 0。
+
+## 6. 证据与报告契约(实现者)
+
+- impl 报告 scripts/audits/f-a4-impl.report.md:三面×根因×修法对照+自裁申报+**数字全部 wc/实测后落笔**(F-R1 教训)+diff 自查+成本;受锁改写逐文件列明理由。
+- 禁 git/registry/locks 命令;卡住停手;红→绿→变异红证。
diff --git a/scripts/audits/f-a4-verify.mjs b/scripts/audits/f-a4-verify.mjs
new file mode 100644
index 000000000..bef27e69e
--- /dev/null
+++ b/scripts/audits/f-a4-verify.mjs
@@ -0,0 +1,385 @@
+/**
+ * F-A4 真机取证探针——票面 §5（选区自绘并集/标注贴行/工具条定位归一三面）。
+ * crib f-r1-verify.mjs 运行模式（Electron 真机/真实库副本/JSON+截图）。
+ *
+ * 相位：--phase baseline（修前基线——三现象数值只记录不断言，票面 §5 要求
+ * 修前取证→实现→修后复测）；--phase after（修后复测——票面判据断言）。
+ *
+ * 会话编排：
+ * - S1 主会话（全判据）：100% 下真鼠标跨 3 行拖选→①自绘无叠深+③工具条
+ *   定位→保存高亮→②标注贴行对齐；
+ * - S2 缩放会话（lite）：开「选择模式」（INV-42 rect 穿透——重选 S1 已存
+ *   高亮同一行带，跨会话同源）+ctrl+滚轮 150%→S6 缩放稳定性数据（归一化
+ *   几何对比 S1）；
+ * - S3 换档会话（lite）：settings.json uiScale→medium 关态改写重开→存量
+ *   标注渲染（零迁移）+新行拖选 lite 判据。
+ *
+ * 判据（after 相位，S1 全量/S2S3 lite）：
+ * - ① [data-testid=selection-rect] 在场且两两相交面积=0（INV-40 判据 crib）
+ *   +::selection computed=transparent；
+ * - ② 标注块与同带 span 行簇顶/底偏差 ≤2px+块两两垂直不相交；
+ * - ③ 工具条 bounding 在滚动容器可视区内且距选区顶 <60px；
+ * - ④ S6：zoom 100%↔150% 同源行自绘块归一化几何漂移 ≤2%+medium 重开
+ *   存量标注在场；
+ * - ⑤ pageerror 0。
+ * 真机 Electron 短暂开窗属项目 LOOP 取证惯例（主控指令声明）。
+ * 产物：scripts/audits/f-a4-out/{phase}-*.png + f-a4-verify-{phase}.json。
+ */
+import { _electron as electron } from '@playwright/test'
+import { cp, mkdir, rm, readFile, writeFile } from 'node:fs/promises'
+import { existsSync, writeFileSync } from 'node:fs'
+import { tmpdir } from 'node:os'
+import { join } from 'node:path'
+
+const PHASE = process.argv.includes('--phase') ? (process.argv[process.argv.indexOf('--phase') + 1] ?? 'after') : 'after'
+const BASELINE = PHASE === 'baseline'
+const ROOT = process.cwd()
+const OUT = join(ROOT, 'scripts', 'audits', 'f-a4-out')
+await mkdir(OUT, { recursive: true })
+const log = (...a) => console.log(`[f-a4/${PHASE} ${new Date().toISOString().slice(11, 19)}]`, ...a)
+
+/** 真实库副本（f-r1 同法）——[F-A4 差异] uiScale 保留用户实况（large 档），
+ *  不删（票面 §5：用户实况 large 档是三面坐标放大缺陷的复现前提）。 */
+async function freshUserData() {
+  const src = join(process.env.APPDATA, 'Synapse')
+  const userData = join(tmpdir(), `synapse-f-a4-${PHASE}`)
+  await rm(userData, { recursive: true, force: true })
+  for (const p of ['workspaces', 'ai-sensor']) await cp(join(src, p), join(userData, p), { recursive: true })
+  for (const f of ['settings.json', 'workspace.json', 'window-state.json']) {
+    if (existsSync(join(src, f))) await cp(join(src, f), join(userData, f))
+  }
+  return userData
+}
+
+const results = []
+const check = (id, pass, detail) => {
+  if (BASELINE) {
+    results.push({ id, baselineOnly: true, detail })
+    log(`BASE ${id} — ${detail}`)
+  } else {
+    results.push({ id, pass, detail })
+    log(`${pass ? 'PASS' : 'FAIL'} ${id} — ${detail}`)
+  }
+}
+const pageErrors = []
+
+/** 选区/标注/工具条几何快照（视口 px）。span 按宽 >2px 收（原 ≥12 字符
+ *  过滤会把窄 span 行——脚注/上标族——整行排除，b 面贴行判据失参照） */
+const SELECT_DUMP = `(() => {
+  const spans = [...document.querySelectorAll('.textLayer span')]
+    .filter((s) => s.getBoundingClientRect().width > 2)
+    .map((s) => { const g = s.getBoundingClientRect(); return { x: g.x, y: g.y, w: g.width, h: g.height } })
+  const col = document.querySelector('[data-page-column="ready"]')
+  const scroller = col?.closest('.overflow-auto')
+  const sr = scroller?.getBoundingClientRect()
+  return {
+    spans, scroller: sr ? { x: sr.x, y: sr.y, w: sr.width, h: sr.height } : null,
+    selBg: getComputedStyle(document.querySelector('.textLayer span') ?? document.body, '::selection').backgroundColor,
+    paintRects: [...document.querySelectorAll('[data-testid="selection-rect"]')].map((el) => {
+      const g = el.getBoundingClientRect()
+      return { x: g.x, y: g.y, w: g.width, h: g.height, left: el.style.left, top: el.style.top, widthPct: el.style.width, heightPct: el.style.height }
+    }),
+    annRects: [...document.querySelectorAll('[data-testid="annotation-rect"]')].map((el) => {
+      const g = el.getBoundingClientRect()
+      return { x: g.x, y: g.y, w: g.width, h: g.height }
+    }),
+    toolbar: (() => { const t = document.querySelector('[data-testid="selection-toolbar"]'); if (!t) return null; const g = t.getBoundingClientRect(); return { x: g.x, y: g.y, w: g.width, h: g.height } })()
+  }
+})()`
+
+const overlapArea = (a, b) => {
+  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)
+  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)
+  return w > 0 && h > 0 ? w * h : 0
+}
+
+/** 可视行簇采集（f-r1 教训：渲染窗含离屏缓冲页——只取滚动容器可视区内
+ *  且 y>顶栏遮蔽区 130px 的 span；exclude=已存标注块（常规态 rect 拦截
+ *  拖选——F-A3 语义）相交行剔除） */
+function collectRows(d, exclude = []) {
+  const sc = d.scroller
+  const vis = d.spans.filter((s) => {
+    if (s.w <= 10) return false
+    if (sc !== null && (s.y <= Math.max(sc.y + 40, 130) || s.y + s.h >= sc.y + sc.h - 20)) return false
+    if (sc === null && s.y <= 130) return false
+    return !exclude.some((a) => overlapArea({ x: s.x, y: s.y, w: s.w, h: s.h + 4 }, a) > 0)
+  })
+  const rows = []
+  for (const s of vis) {
+    const r = rows.find((row) => Math.abs(row.y - s.y) < 6)
+    if (r === undefined) rows.push({ y: s.y, items: [s] })
+    else r.items.push(s)
+  }
+  return rows.sort((a, b) => a.y - b.y)
+}
+
+/** 真鼠标跨行拖选（f-r1 教训：合成事件落点必须在视口内；8 步插值） */
+async function drag(win, from, to) {
+  await win.mouse.move(from.x, from.y)
+  await win.mouse.down()
+  for (let i = 1; i <= 8; i += 1) {
+    await win.mouse.move(from.x + ((to.x - from.x) * i) / 8, from.y + ((to.y - from.y) * i) / 8)
+  }
+  await win.mouse.up()
+  await win.waitForTimeout(700) // selectionchange 200ms 防抖+渲染
+}
+
+/** 开文献到就绪（返回 app+首窗；pageerror 全局收集） */
+async function openFirstPaper(userData) {
+  const app = await electron.launch({ args: ['out/main/index.js'], env: { ...process.env, SYNAPSE_USER_DATA: userData } })
+  const win = await app.firstWindow()
+  win.on('pageerror', (e) => {
+    pageErrors.push(`${String(e)}\n[stack] ${e.stack ?? ''}`)
+  })
+  await win.getByRole('button', { name: '文献库' }).waitFor({ timeout: 20_000 })
+  await win.getByRole('button', { name: '文献库' }).click()
+  await win.waitForTimeout(800)
+  await win.locator('button.lib-card').first().dblclick()
+  await win.waitForSelector('[data-page-column="ready"]', { timeout: 20_000 })
+  await win.waitForSelector('.textLayer span', { timeout: 20_000 })
+  await win.waitForTimeout(1200)
+  return { app, win }
+}
+
+/** S1 主会话：全判据（a/c 拖选期+b 保存后） */
+async function mainSession(userData) {
+  const { app, win } = await openFirstPaper(userData)
+  let d0 = await win.evaluate(SELECT_DUMP)
+  let rows = collectRows(d0)
+  if (rows.length < 3) {
+    await win.evaluate(() => {
+      const scroller = document.querySelector('[data-page-column]')?.closest('.overflow-auto')
+      if (scroller) scroller.scrollTop += Math.round(scroller.clientHeight / 2)
+    })
+    await win.waitForTimeout(900)
+    d0 = await win.evaluate(SELECT_DUMP)
+    rows = collectRows(d0)
+  }
+  if (rows.length < 3) throw new Error(`可视行簇不足 3 行：${rows.length}`)
+  const r1 = rows[0].items[0]
+  const r3 = rows[2].items.at(-1)
+  const from = { x: r1.x + 2, y: r1.y + r1.h / 2 }
+  const to = { x: Math.min(r3.x + r3.w - 2, (d0.scroller?.x ?? 0) + (d0.scroller?.w ?? 9999) - 4), y: r3.y + r3.h / 2 }
+  await drag(win, from, to)
+  let dSel = await win.evaluate(SELECT_DUMP)
+  if (dSel.toolbar === null) {
+    log('首次拖选未出条，偏移重试一次')
+    await drag(win, { x: from.x, y: from.y + r1.h / 3 }, to)
+    dSel = await win.evaluate(SELECT_DUMP)
+  }
+  await win.screenshot({ path: join(OUT, `${PHASE}-select.png`) })
+
+  // —— ① a 面 ——
+  check('a/paint-present', dSel.paintRects.length >= 2, `自绘块 ${dSel.paintRects.length} 个（跨 3 行拖选；::selection=${dSel.selBg}）`)
+  let maxOv = 0
+  for (let i = 0; i < dSel.paintRects.length; i += 1) {
+    for (let j = i + 1; j < dSel.paintRects.length; j += 1) {
+      maxOv = Math.max(maxOv, overlapArea(dSel.paintRects[i], dSel.paintRects[j]))
+    }
+  }
+  check('a/paint-no-overlap', dSel.paintRects.length >= 2 && maxOv <= 0.5, `自绘块两两相交面积 max=${maxOv.toFixed(2)}px²（≤0.5 吞亚像素）`)
+  check('a/native-selection-transparent', dSel.selBg === 'rgba(0, 0, 0, 0)', `::selection computed=${dSel.selBg}（transparent——视觉单通道=自绘层）`)
+
+  // —— ③ c 面 ——
+  const tb = dSel.toolbar
+  const sc = dSel.scroller
+  if (tb !== null && sc !== null) {
+    const inside = tb.x >= sc.x - 1 && tb.y >= sc.y - 1 && tb.x + tb.w <= sc.x + sc.w + 1 && tb.y + tb.h <= sc.y + sc.h + 1
+    const dist = tb.y <= r1.y ? r1.y - tb.y : Math.max(0, tb.y - (r3.y + r3.h))
+    check('c/toolbar-in-viewport', inside, `工具条 (${tb.x.toFixed(0)},${tb.y.toFixed(0)},${tb.w.toFixed(0)}×${tb.h.toFixed(0)}) 在滚动容器 (${sc.x.toFixed(0)},${sc.y.toFixed(0)},${sc.w.toFixed(0)}×${sc.h.toFixed(0)}) 可视区内`)
+    check('c/toolbar-near-selection', dist < 60, `工具条距选区顶 ${dist.toFixed(1)}px（<60）`)
+  } else {
+    check('c/toolbar-present', false, `工具条=${tb === null ? 'null' : 'ok'} scroller=${sc === null ? 'null' : 'ok'}`)
+  }
+
+  // —— 保存高亮 → ② b 面 ——
+  if (dSel.toolbar !== null) {
+    await win.getByTestId('selection-toolbar').getByRole('button', { name: '高亮' }).click({ timeout: 5_000 })
+    await win.waitForSelector('[data-testid="annotation-rect"]', { timeout: 10_000 })
+    await win.waitForTimeout(400)
+  } else {
+    log('工具条未出——保存跳过（仅回采存量标注）')
+  }
+  const dSaved = await win.evaluate(SELECT_DUMP)
+  await win.screenshot({ path: join(OUT, `${PHASE}-saved.png`) })
+  // —— ② b 面（票面 §5②：保存标注渲染贴行——与同文字行簇 top/height 偏差
+  //    ≤2px。判据落点：块顶贴最近行簇 span 盒顶 ≤2px（基线实锤修前 +4px
+  //    下偏）；块底落行簇底 [−1,+3]px 内（descender 尾=墨带合法超出行盒底
+  //    ~0.25×fs——F-11「底缘悬至基线下」语义；修前单高块/分数收边均越界）。
+  //    自绘块 vs 标注块的原始盒差另落信息项（行盒并集 vs 墨带=两有意几何）——
+  const paints = dSel.paintRects
+  const spansAll = dSaved.spans
+  const spansWide = spansAll.filter((s) => s.w > 10)
+  let maxTopDev = 0
+  let botOutOfRange = 0
+  let noRef = 0
+  let maxPaintDev = 0
+  for (const b of dSaved.annRects) {
+    // 参照行簇 span：x 重叠+中心距 <30px 内取最近；优先宽 span（≥10px），
+    // 窄行（逐字窄 span——脚注/上标族）回退全量——仍无参照=跳过计数（另行 log）
+    const pickNear = (pool) => {
+      const cand = pool.filter((s) => s.x < b.x + b.w && s.x + s.w > b.x && Math.abs(s.y + s.h / 2 - (b.y + b.h / 2)) < 30)
+      let near = cand[0]
+      for (const s of cand) {
+        if (Math.abs(s.y + s.h / 2 - (b.y + b.h / 2)) < Math.abs(near.y + near.h / 2 - (b.y + b.h / 2))) near = s
+      }
+      return near
+    }
+    const near = pickNear(spansWide) ?? pickNear(spansAll)
+    if (near === undefined) {
+      noRef += 1
+      continue
+    }
+    maxTopDev = Math.max(maxTopDev, Math.abs(b.y - near.y))
+    const botDev = b.y + b.h - (near.y + near.h)
+    if (botDev < -1 || botDev > 3) botOutOfRange += 1
+    if (paints.length > 0) {
+      let np = paints[0]
+      for (const c of paints) {
+        if (Math.abs(c.y - b.y) < Math.abs(np.y - b.y)) np = c
+      }
+      maxPaintDev = Math.max(maxPaintDev, Math.abs(b.y - np.y), Math.abs(b.h - np.h))
+    }
+  }
+  if (noRef > 0) log(`b 信息项：${noRef} 块无可参照行簇（窄 span 行）——不计入贴行判据`)
+  log(`b 信息项：标注块 vs 自绘块（行盒并集 vs 墨带两有意几何）偏差 max=${maxPaintDev.toFixed(2)}px`)
+  check('b/ann-align-text', dSaved.annRects.length >= 2 && maxTopDev <= 2 && botOutOfRange === 0, `标注贴行：块顶 vs 行簇顶偏差 max=${maxTopDev.toFixed(2)}px（≤2）+块底落行簇底 desc 尾界 [−1,+3]px（越界 ${botOutOfRange} 块；${dSaved.annRects.length} 块分行——修前并簇 1 块）`)
+  let maxAnnOv = 0
+  for (let i = 0; i < dSaved.annRects.length; i += 1) {
+    for (let j = i + 1; j < dSaved.annRects.length; j += 1) {
+      maxAnnOv = Math.max(maxAnnOv, overlapArea(dSaved.annRects[i], dSaved.annRects[j]))
+    }
+  }
+  check('b/ann-no-overlap', dSaved.annRects.length < 2 || maxAnnOv <= 0.5, `标注块两两相交面积 max=${maxAnnOv.toFixed(2)}px²`)
+  await app.close()
+  return { dSel, dSaved }
+}
+
+/** S2 缩放会话（lite）：选择模式穿透重选 S1 同一行带（已存高亮）+150% */
+async function zoomSession(userData) {
+  const { app, win } = await openFirstPaper(userData)
+  await win.getByRole('button', { name: '选择模式' }).click()
+  await win.waitForTimeout(300)
+  await win.keyboard.down('Control')
+  for (let i = 0; i < 5; i += 1) await win.mouse.wheel(0, -120)
+  await win.keyboard.up('Control')
+  await win.waitForTimeout(900)
+  log('zoom 滚轮后=', await win.locator('[data-testid="zoom-label"]').textContent())
+  const d0 = await win.evaluate(SELECT_DUMP)
+  // S1 同源行带=被已存高亮覆盖的区域（选择模式下 rect 穿透可重选）；
+  // 滚动带入视口中部（zoom 锚定后高亮可能在视口上方——负视口坐标拖选
+  // 事件丢失，f-r1 教训）
+  if (d0.annRects.length === 0) throw new Error('S2 前置失败：S1 高亮不在场')
+  await win.evaluate(() => {
+    const ann = [...document.querySelectorAll('[data-testid="annotation-rect"]')].map((el) => el.getBoundingClientRect())
+    if (ann.length === 0) return
+    const top = Math.min(...ann.map((a) => a.y))
+    const bottom = Math.max(...ann.map((a) => a.y + a.height))
+    const scroller = document.querySelector('[data-page-column]')?.closest('.overflow-auto')
+    if (scroller === null) return
+    const sc = scroller.getBoundingClientRect()
+    if (top < sc.y + 80 || bottom > sc.y + sc.height - 40) {
+      scroller.scrollTop += (top + bottom) / 2 - (sc.y + sc.height / 2)
+    }
+  })
+  await win.waitForTimeout(600)
+  const dz = await win.evaluate(SELECT_DUMP)
+  const ax0 = Math.min(...dz.annRects.map((a) => a.x))
+  const ay0 = Math.min(...dz.annRects.map((a) => a.y))
+  const ax1 = Math.max(...dz.annRects.map((a) => a.x + a.w))
+  const ay1 = Math.max(...dz.annRects.map((a) => a.y + a.h))
+  await drag(win, { x: ax0 + 4, y: ay0 + 4 }, { x: ax1 - 4, y: ay1 - 4 })
+  const dSel = await win.evaluate(SELECT_DUMP)
+  await win.screenshot({ path: join(OUT, `${PHASE}-z150.png`) })
+  if (!BASELINE) {
+    check('s6/z150-paint-present', dSel.paintRects.length >= 2, `150% 下自绘块 ${dSel.paintRects.length} 个（选择模式重选同源行带）`)
+  }
+  await app.close()
+  return { dSel }
+}
+
+/** S3 换档会话（lite）：uiScale→medium 重开→存量渲染+新行拖选 */
+async function mediumSession(userData) {
+  const { app, win } = await openFirstPaper(userData)
+  const dExist = await win.evaluate(SELECT_DUMP)
+  await win.screenshot({ path: join(OUT, `${PHASE}-medium.png`) })
+  // 滚一屏选新行（避开存量高亮——collectRows exclude）
+  await win.evaluate(() => {
+    const scroller = document.querySelector('[data-page-column]')?.closest('.overflow-auto')
+    if (scroller) scroller.scrollTop += Math.round(scroller.clientHeight)
+  })
+  await win.waitForTimeout(900)
+  const d0 = await win.evaluate(SELECT_DUMP)
+  const rows = collectRows(d0, dExist.annRects)
+  if (rows.length >= 3) {
+    const r1 = rows[0].items[0]
+    const r3 = rows[2].items.at(-1)
+    const from = { x: r1.x + 2, y: r1.y + r1.h / 2 }
+    const to = { x: Math.min(r3.x + r3.w - 2, (d0.scroller?.x ?? 0) + (d0.scroller?.w ?? 9999) - 4), y: r3.y + r3.h / 2 }
+    await drag(win, from, to)
+  } else {
+    log('medium 会话可视新行不足 3——lite 判据按现状回采')
+  }
+  const dSel = await win.evaluate(SELECT_DUMP)
+  if (!BASELINE) {
+    check('s6/medium-ann-present', dExist.annRects.length >= 1, `medium 档重开存量标注 ${dExist.annRects.length} 块在场（存量 rects 零迁移）`)
+    const sc = dSel.scroller
+    const tb = dSel.toolbar
+    if (tb !== null && sc !== null) {
+      const inside = tb.x >= sc.x - 1 && tb.y >= sc.y - 1 && tb.x + tb.w <= sc.x + sc.w + 1 && tb.y + tb.h <= sc.y + sc.h + 1
+      check('s6/medium-toolbar-in-viewport', inside, `medium 档工具条 (${tb.x.toFixed(0)},${tb.y.toFixed(0)}) 在可视区内`)
+    }
+  }
+  await app.close()
+  return { dExist, dSel }
+}
+
+const userData = await freshUserData()
+const settingsPath = join(userData, 'settings.json')
+const uiScale = existsSync(settingsPath) ? (JSON.parse(await readFile(settingsPath, 'utf8')).uiScale ?? '(default)') : '(no-settings)'
+
+const s1 = await mainSession(userData)
+const s2 = await zoomSession(userData)
+
+// S3 前关态改写 uiScale→medium（换档重开）
+if (existsSync(settingsPath)) {
+  const base = JSON.parse(await readFile(settingsPath, 'utf8'))
+  base.uiScale = 'medium'
+  await writeFile(settingsPath, JSON.stringify(base), 'utf8')
+}
+const s3 = await mediumSession(userData)
+
+// —— ④ S6：zoom 100%↔150% 同源行自绘块归一化几何 ——
+if (!BASELINE && s1.dSel.paintRects.length > 0 && s2.dSel.paintRects.length > 0) {
+  const norm = (r) => ({ left: parseFloat(r.left), top: parseFloat(r.top), w: parseFloat(r.widthPct), h: parseFloat(r.heightPct) })
+  const a = s1.dSel.paintRects.slice(0, 3).map(norm)
+  const b = s2.dSel.paintRects.slice(0, 3).map(norm)
+  if (a.length === b.length) {
+    const drift = Math.max(...a.map((r, i) => Math.max(Math.abs(r.left - b[i].left), Math.abs(r.top - b[i].top), Math.abs(r.w - b[i].w), Math.abs(r.h - b[i].h))))
+    check('s6/zoom-stable', drift <= 2, `zoom 100%↔150% 同源行自绘块归一化几何漂移 max=${drift.toFixed(2)}%（≤2——缩放量化噪声容差）`)
+  } else {
+    check('s6/zoom-stable', false, `块数不一致 100%=${a.length} vs 150%=${b.length}`)
+  }
+}
+
+// —— ⑤ pageerror ——
+check('f/no-pageerror', pageErrors.length === 0, `页面错误 ${pageErrors.length} 条${pageErrors.length > 0 ? '：' + pageErrors.join('; ').slice(0, 400) : ''}`)
+
+writeFileSync(
+  join(OUT, `f-a4-verify-${PHASE}.json`),
+  JSON.stringify(
+    {
+      meta: { script: 'f-a4-verify.mjs', phase: PHASE, date: new Date().toISOString(), uiScale, note: '真实库副本（uiScale 保留用户实况 large）+真鼠标跨 3 行拖选；baseline=修前三现象数值，after=票面 §5 判据' },
+      scenes: { main: s1, zoom150: s2, medium: { existing: s3.dExist, select: s3.dSel } },
+      results
+    },
+    null,
+    2
+  )
+)
+
+const fails = results.filter((r) => r.pass === false)
+if (BASELINE) console.log(`F-A4 BASELINE: 记录 ${results.length} 项数值 → f-a4-out/f-a4-verify-baseline.json`)
+else if (fails.length === 0) console.log(`F-A4 VERIFY: PASS（${results.length}/${results.length} 项断言全过）`)
+else console.log(`F-A4 VERIFY: FAIL（${fails.length}/${results.length} 项失败——红=报主控裁决）`)
+process.exit(BASELINE || fails.length === 0 ? 0 : 1)
diff --git a/src/renderer/features/reader/AnnotationLayer.tsx b/src/renderer/features/reader/AnnotationLayer.tsx
index 8badfad9e..f6f36272d 100644
--- a/src/renderer/features/reader/AnnotationLayer.tsx
+++ b/src/renderer/features/reader/AnnotationLayer.tsx
@@ -5,11 +5,13 @@
  * - 按当前页过滤标注：rects 归一化坐标 → 绝对定位色块（颜色由 kind+color 决定；
  *   整层容器 mix-blend-mode:multiply——荧光笔语义，白纸显色、黑字透出，色块不透明；
  *   下划线为收边后底缘 2px 实条，每行一条——rectStyle 已迁 annotation-style
- *   （F-11 顶/底收边修标注下偏），rects 行级合并见
+ *   （F-11 顶/底收边修标注下偏；F-A4 b② 行盒自适应 band——重锚字形带在场
+ *   时顶贴字形顶缘底贴底缘），rects 行级合并见
  *   annotation-anchor.mergeLineRects，两路径（划选保存/重开重锚）同口径；
  *   渲染读时另过 annotation-merge.mergeRects 归并（F-A1 挂 B，INV-E——
- *   存量缺陷态 rects 库数据零迁移，读时归并存量渐净；resolved 产物已过
- *   挂 A，幂等无害）
+ *   F-A4 b① 行高感知 lineH 注入；存量缺陷态 rects 库数据零迁移，读时归并
+ *   存量渐净；resolved 产物已过挂 A，幂等无害）；重锚+字形带计算=
+ *   annotation-resolve 域（F-A4 拆件——组件 ≤250 红线）
  * - 打开文档/翻页时对每条标注 verifyQuote 重定位（排版变化自愈，仅影响显示不回写
  *   库；失败则按存量 rects 显示）。pdf.js 文本层异步入 DOM，MutationObserver +
  *   requestAnimationFrame 合并重算
@@ -39,8 +41,7 @@ import { useEffect, useLayoutEffect, useState } from 'react'
 import type { Annotation, AnnotationRect } from '@shared/models/annotation'
 import { api, unwrap, ApiClientError } from '../../api/client'
 import { showToast } from '../../shared/ui/Toast'
-import { verifyQuote } from './anchor-serialize'
-import { findRangeAtOffset } from './annotation-anchor'
+import { resolveAnnotationRects, normalizedLineHeight, matchBand, type ResolvedAnnotation } from './annotation-resolve'
 import { mergeRects } from './annotation-merge'
 import { pushUndo } from './annotation-undo'
 import { AnnotationEditor } from './AnnotationEditor'
@@ -53,8 +54,8 @@ const UPDATE_FAILED = '标注保存失败'
 const DELETE_FAILED = '标注删除失败'
 const DELETE_CONFIRM = '删除这条标注？'
 
-/** 重锚后的显示矩形（id → rects；缺项回退存量 rects） */
-type ResolvedRects = Record<string, AnnotationRect[]>
+/** 重锚后的显示矩形（id → { rects, bands }；缺项回退存量 rects） */
+type ResolvedRects = Record<string, ResolvedAnnotation>
 
 /** 弹层目标（连同命中矩形，供菜单/编辑器定位）——菜单与编辑器互斥使用同形 */
 interface PopupTarget {
@@ -73,6 +74,9 @@ export function AnnotationLayer(props: {
 }): JSX.Element | null {
   const { annotations, page, pageRoot, onChanged } = props
   const [resolved, setResolved] = useState<ResolvedRects>({})
+  // [F-A4 b①] 挂 B 行高感知 lineH（textLayer span 字号中位数/textLayer 盒高；
+  // 量测退化 undefined=旧行为——存量缺陷态 rects 读时归并同口径受益）
+  const [lineH, setLineH] = useState<number | undefined>(undefined)
   const [menu, setMenu] = useState<PopupTarget | null>(null)
   const [editing, setEditing] = useState<PopupTarget | null>(null)
   const [busy, setBusy] = useState(false)
@@ -85,7 +89,9 @@ export function AnnotationLayer(props: {
 
   const pageAnnotations = annotations.filter((a) => a.page === page)
 
-  // 文本层就绪后重锚：verifyQuote 校正偏移（自愈排版漂移）→ findRangeAtOffset 重算 rects；失败回退存量，仅显示层不回写库
+  // 文本层就绪后重锚：verifyQuote 校正偏移（自愈排版漂移）→ findRangeAtOffset 重算 rects
+  // +行盒自适应字形带（F-A4 b②——annotation-resolve 域，组件 ≤250 红线拆出）；
+  // 失败回退存量，仅显示层不回写库
   useEffect(() => {
     if (pageRoot === null) {
       return
@@ -97,25 +103,8 @@ export function AnnotationLayer(props: {
     let scheduled = false
     const resolve = (): void => {
       scheduled = false
-      const next: ResolvedRects = {}
-      for (const a of annotations) {
-        if (a.page !== page || a.quoteText.length === 0) {
-          continue
-        }
-        const at = verifyQuote(textLayer, {
-          prefix: a.prefixText,
-          quote: a.quoteText,
-          suffix: a.suffixText,
-          start: a.startOffset
-        })
-        if (at !== null) {
-          const range = findRangeAtOffset(textLayer, at, at + a.quoteText.length)
-          if (range !== null && range.rects.length > 0) {
-            next[a.id] = range.rects
-          }
-        }
-      }
-      setResolved(next)
+      setResolved(resolveAnnotationRects({ textLayer, annotations, page }))
+      setLineH(normalizedLineHeight(textLayer))
     }
     // 文本层 span 逐个入 DOM（pdf.js render() 异步）：rAF 合并成每帧一次
     const schedule = (): void => {
@@ -195,9 +184,11 @@ export function AnnotationLayer(props: {
         className="absolute inset-0"
         style={{ zIndex: 5, pointerEvents: 'none', mixBlendMode: 'multiply' }}
       >
-        {/* multiply 上容器级（stacking context 隔离，rect 级混合无效且叠乘） */}
+        {/* multiply 上容器级（stacking context 隔离，rect 级混合无效且叠乘）；
+            [F-A4 b] 行高感知归并（lineH）+rectStyle 行盒自适应 band（重锚带
+            在场时顶贴字形顶缘底贴底缘——matchBand 最近中心带匹配） */}
         {pageAnnotations.map((a) =>
-          mergeRects(resolved[a.id] ?? a.rects).map((r, i) => (
+          mergeRects(resolved[a.id]?.rects ?? a.rects, lineH).map((r, i) => (
             <div
               key={`${a.id}:${i}`}
               data-testid="annotation-rect"
@@ -206,7 +197,7 @@ export function AnnotationLayer(props: {
               aria-label={`标注：${a.quoteText}`}
               title={a.comment !== '' ? a.comment : a.quoteText}
               className="absolute"
-              style={selectionMode ? { ...rectStyle(a.kind, a.color, r), pointerEvents: 'none' } : rectStyle(a.kind, a.color, r)}
+              style={selectionMode ? { ...rectStyle(a.kind, a.color, r, matchBand(resolved[a.id]?.bands, r)), pointerEvents: 'none' } : rectStyle(a.kind, a.color, r, matchBand(resolved[a.id]?.bands, r))}
               onClick={() => {
                 // 选择模式=穿透零副作用（pointerEvents:none 达成，守卫兜程序化派发）
                 if (selectionMode) return
diff --git a/src/renderer/features/reader/SelectionLayer.tsx b/src/renderer/features/reader/SelectionLayer.tsx
index a46db2016..c4e672be9 100644
--- a/src/renderer/features/reader/SelectionLayer.tsx
+++ b/src/renderer/features/reader/SelectionLayer.tsx
@@ -2,91 +2,64 @@
 /**
  * [SR-RDR-05] SelectionLayer —— 文本选择→定位器（工单：done / weak，依赖 anchor-serialize——F-ARCH4 拆件后经其间接消费 annotation-anchor）
  *
- * **F-02 四层多页化收口（工单 open / strong；注册文件=anchor-locate.ts，本文件
- *   为主改面，短式引用口径）——动态锚定根**
+ * **F-02 四层多页化收口（动态锚定根；注册文件=anchor-locate.ts）**：锚定根=
+ * 选区 anchorNode/focusNode 向上最近页盒（纯函数页盒遍历，selection-geometry），
+ * 挂载盒≠选区所在页仍正确；选区态状态机：无选区→页内选区→工具条操作→清；
+ * 跨页/跨出页盒→不创建+toast（mouseup 时刻，INV-02 禁静默；防抖路径静默防
+ * 拖选中途刷屏）；选区所在页回收/文本层重建（zoom 同机制）→选区清→层与
+ * 工具条收（防悬空锚）；页外选区静默收起。确认后经
+ * anchor-serialize.selectionToAnchor 生成锚定三元组→落库（保存页=选区所在页
+ * 0 基动态推导）→onSaved 刷新层；保存成功 removeAllRanges+层随清。
  *
- * **F-08 划选视觉=原生 ::selection（工单 open / strong；ADR-0019——R1 路线
- *   落地，取代 SR2-F-07 自绘层）**：拖选全程由浏览器原生 ::selection 提供即时
- *   视觉反馈（text-layer.css 已回官方 rgba(0 0 255 / 0.25) 半透明——canvas
- *   字形透出可读）；mouseup/防抖 evaluate 链仅驱动工具条（≤1.5s 预算，L7）。
- *   自绘选区块（SelectionRects）整体删除——复测站 3 证伪自绘路线（30% accent
- *   合成 rgb(191,207,220) 近乎不可见+拖选期零反馈）。
- * 层叠序（同一 stacking context 内比较——挂载盒/页盒/页框均无 z-index，各
- * 绝对定位层直达公共根）：canvas 字形(非定位，最底) < .textLayer(z-index:0，
- * 自成 stacking context，span 内 z-index:1) < AnnotationLayer(z-index:5,
- * multiply——荧光笔语义) < AiAnnotationLayer(z-index:5，F-07 已去 multiply，
- * 同值 DOM 后绘在上) < 工具条(z-10)。
- *
- * ── 行为层 ──
- * - 监听 selectionchange（200ms 防抖）与 mouseup（即时）：锚定根=选区
- *   anchorNode/focusNode 向上最近页盒（纯函数页盒遍历）——挂载盒（F-01 锚定
- *   页盒落位）≠选区所在页仍正确（F-01 自裁 4 中间态解除）；选区态状态机：
- *   无选区→页内选区→工具条操作→清；跨页/跨出页盒→不创建+toast（mouseup 时刻，
- *   INV-02 禁静默；防抖路径静默防拖选中途刷屏）；选区所在页回收/文本层重建
- *   （zoom 同机制）→选区清→工具条收（防悬空锚）；滚动中选区保持=evaluate
- *   每次动态重找锚定根（跟随选区非固定页）；页外选区（侧栏等）静默收起
- * - 确认后经 anchor-serialize.selectionToAnchor 生成锚定三元组 → 落库（保存页=
- *   pending.pageNo 选区所在页 0 基动态推导，rects.page 同）→ onSaved 刷新层
+ * **F-A4 划选视觉=自绘并集层（ADR-0019 R1 修订——取代 SR2-F-08 原生路线，
+ * 修订依据=票面 §0a 用户根治令）**：SelectionPaint（selection-paint.tsx，
+ * portal 进选区所在页盒，z2 灰 0.20 在标注 multiply 层之下——R2-F-10 观感
+ * 保持）渲染 evaluate 管线归并产物（与保存 rects 同源，所见即所存）；::
+ * selection 转 transparent（text-layer.css）。当年删自绘两病根已解（拖选
+ * 零反馈→selectionchange 200ms 防抖路径在场；accent 近不可见→观感灰在案）。
+ * 层随**选区**真清除而消失（INV-37 修订：Escape 只清 pending/工具条）。
+ * 工具条定位 [c 面]：视口差值÷有效 zoom（localScale）归一到挂载盒本地+
+ * 滚动容器可视区夹取+选区近顶下翻转（selection-geometry 纯函数——修
+ * ui-scale≠1 双重放大+偏远缺陷）。层叠序完整推演见 selection-paint.tsx 头注。
  *
  * ── 接口层 ── / ── 架构层 ──
- * - props 形状不变=挂载位契约零改（page 不再作锚定/保存页——由动态锚定取代）；
- *   export closestPageRoot(node)（向上最近页盒）/pageIndexOf(root)（1 基→0 基）。
- *   锚定根=选区所在页盒内 .textLayer 动态获取；annotation-anchor 仍是唯一 DOM
- *   遍历点；工具条落点以选区所在页盒为参照系（夹取经页盒 rect——N-C 防层叠
- *   污染），再换算到挂载盒渲染（页列垂直排列页间偏移稳定）
+ * - props 形状不变=挂载位契约零改；closestPageRoot/pageIndexOf 经本文件再
+ *   导出（实现在 selection-geometry——F-A4 拆件，导出面零变）。锚定根=
+ *   选区所在页盒内 .textLayer 动态获取；annotation-anchor 仍是唯一 DOM
+ *   遍历点；工具条/自绘层落点以选区所在页盒为参照系（N-C 防层叠污染）
  *
  * ── 生命周期层 ── / ── 文化层 ──
- * - mouseup 即时、防抖兜底（程序化选选不触发 mouseup）；翻页/换文献/卸载收起
- *   退订。组件测试：tests/unit/renderer/selection-layer.test.tsx；e2e：
- *   reader-text.spec 后半（F-02 批 2 守卫）
+ * - mouseup 即时、防抖兜底（程序化选选不触发 mouseup）；翻页/换文献/卸载
+ *   收起退订。测试：selection-layer/selection-paint.test（F-A4 三面）
  */
 import { useEffect, useRef, useState } from 'react'
-import type { Annotation, AnnotationInput, AnnotationKind } from '@shared/models/annotation'
+import type { Annotation, AnnotationInput, AnnotationKind, AnnotationRect } from '@shared/models/annotation'
 import { api, unwrap, ApiClientError } from '../../api/client'
 import { showToast } from '../../shared/ui/Toast'
 import { selectionToAnchor, type SelectionAnchor } from './anchor-serialize'
 import { pushUndo } from './annotation-undo'
 import { SelectionToolbar } from './SelectionToolbar'
+import { SelectionPaint } from './selection-paint'
+import { closestPageRoot, pageIndexOf, localScale, toolbarViewportPos } from './selection-geometry'
 import { useReaderStore } from './reader.store'
 
+// 纯函数页盒遍历（F-02）在 selection-geometry.ts——F-A4 拆件，导出面经本文件再导出（票面 §2）
+export { closestPageRoot, pageIndexOf } from './selection-geometry'
+
 /** 意外异常（非 ApiClientError）时的兜底中文消息 */
 const SAVE_FAILED = '标注保存失败'
 
 /** 跨页/跨出页盒选区的拒绝提示（F-02 主控裁决：INV-02 可见，禁静默） */
 const CROSS_PAGE_HINT = '选区跨页，不支持创建标注'
 
-/** 工具条定位：估算宽度（水平夹取）与选区上方留白 */
-const TOOLBAR_WIDTH = 180
-const TOOLBAR_ABOVE = 42
-
 /** selectionchange 防抖窗口（毫秒） */
 const SELECTION_DEBOUNCE_MS = 200
 
-/** F-12 工具条误触发阈值（px）：mousedown→mouseup 位移小于此值=单击/双击
- *  （含选词）不出条（用户令「一点就出选项条」；LineageCanvas 同型）。
- *  无 mousedown 记录（程序化/键盘选区）不设限——防抖路径唯一通道保持。 */
+/** F-12 工具条误触发阈值（px）：位移小于此值=单击/双击（含选词）不出条
+ *  （用户令「一点就出选项条」；无 mousedown 记录的程序化/键盘选区不设限） */
 const DRAG_SELECT_THRESHOLD_PX = 3
 
-/** F-02：节点向上最近页盒（[data-page-root] 元素——页列渲染窗内页才有；
- *  锚定根动态遍历的纯函数，测试直测） */
-export function closestPageRoot(node: Node | null): HTMLElement | null {
-  let cur: Node | null = node
-  while (cur !== null) {
-    if (cur instanceof HTMLElement && cur.hasAttribute('data-page-root')) {
-      return cur
-    }
-    cur = cur.parentNode
-  }
-  return null
-}
-
-/** F-02：页盒页号（data-page-root 值 1 基→0 基页码；缺失/非法值 null） */
-export function pageIndexOf(root: HTMLElement): number | null {
-  const no = Number(root.getAttribute('data-page-root'))
-  return Number.isInteger(no) && no >= 1 ? no - 1 : null
-}
-
-/** 待确认的划选（锚定结果 + 选区所在页 0 基 + 工具条相对挂载盒的落点） */
+/** 待确认的划选（锚定结果+选区所在页 0 基+工具条挂载盒本地落点） */
 interface PendingSelection {
   anchor: SelectionAnchor
   pageNo: number
@@ -94,6 +67,12 @@ interface PendingSelection {
   y: number
 }
 
+/** [F-A4 a 面] 自绘并集层状态（页盒+归并 rects；清除=层卸载） */
+interface PaintSelection {
+  root: HTMLElement
+  rects: AnnotationRect[]
+}
+
 export function SelectionLayer(props: {
   pageRoot: HTMLElement | null
   paperId: string
@@ -102,8 +81,9 @@ export function SelectionLayer(props: {
 }): JSX.Element | null {
   const { pageRoot, paperId, onSaved } = props
   const [pending, setPending] = useState<PendingSelection | null>(null)
+  const [paint, setPaint] = useState<PaintSelection | null>(null)
   const [busy, setBusy] = useState(false)
-  // per-tab 选择器（TABS-01）：颜色取 active tab（无 tab 时回退默认黄）
+  // per-tab 选择器（TABS-01）：active tab 颜色（无 tab 回退默认黄）
   const color = useReaderStore((s) => s.tabs[s.activeId ?? '']?.color ?? 'yellow')
   const setColor = useReaderStore((s) => s.setColor)
   const toolbarRef = useRef<HTMLDivElement | null>(null)
@@ -112,43 +92,55 @@ export function SelectionLayer(props: {
     if (pageRoot === null) return
     let timer: number | null = null
 
-    /** 评估当前选区（F-02 动态锚定根）：选区所在页盒内锚定；跨页拒绝
-     *  （mouseup 提示）；页外/不可锚定/零宽选区静默收起 */
+    /** 评估选区（动态锚定根）：页内锚定；跨页拒绝（mouseup 提示）；页外/不可锚定/零宽静默收（层随清） */
     const evaluate = (fromMouseUp: boolean): void => {
       const sel = window.getSelection()
       if (sel === null || sel.rangeCount === 0 || sel.isCollapsed) {
         setPending(null)
+        setPaint(null)
         return
       }
       const anchorRoot = closestPageRoot(sel.anchorNode)
       const focusRoot = closestPageRoot(sel.focusNode)
       if (anchorRoot !== focusRoot) {
-        // 跨页/跨出页盒：不创建+toast（主控裁决，INV-02 禁静默——仅挂用户完成
-        // 拖选的 mouseup 时刻，防抖路径静默防拖选中途刷屏）
+        // 跨页/跨出页盒：不创建+toast（INV-02 禁静默——仅挂 mouseup 时刻，
+        // 防抖路径静默防拖选中途刷屏）
         if (fromMouseUp) showToast(CROSS_PAGE_HINT, 'info')
         setPending(null)
+        setPaint(null)
         return
       }
       // 两边界同盒（同为 null=页外选区——静默收起，与页列无关）
       const pageNo = anchorRoot === null ? null : pageIndexOf(anchorRoot)
       const textLayer = anchorRoot?.querySelector('.textLayer') as HTMLElement | null
       const anchor = pageNo === null || textLayer === null ? null : selectionToAnchor(textLayer, sel)
-      // textLayer 非空由 anchor 非空蕴含——并列检查保留防御语义（F-08 起无几何消费方）
+      // textLayer 非空由 anchor 非空蕴含——并列检查保留防御语义
       if (anchor === null || textLayer === null) {
         setPending(null)
+        setPaint(null)
         return
       }
       const box = sel.getRangeAt(0).getBoundingClientRect()
       if (box.width === 0 && box.height === 0) {
         setPending(null)
+        setPaint(null)
         return
       }
-      // 落点以选区所在页盒为参照系（N-C：夹取经页盒 rect 防层叠污染），再换算
-      // 到挂载盒（组件渲染容器——页列垂直排列页间偏移布局稳定）
-      const selBox = anchorRoot!.getBoundingClientRect()
+      // [F-A4 a 面] 自绘并集层：与保存 rects 同源（evaluate 管线归一化产物）
+      setPaint({ root: anchorRoot!, rects: anchor.rects })
+      // [F-A4 c 面] 工具条视口域定位（翻转+夹取，selection-geometry 纯函数）
+      // →÷有效 zoom 归一到挂载盒本地（挂载盒在 ui-scale 缩放子树内——直写
+      // 视口差会被 CSS zoom 二次放大）
       const mountBox = pageRoot.getBoundingClientRect()
-      const x = Math.min(Math.max(box.x - selBox.x, 0), Math.max(selBox.width - TOOLBAR_WIDTH, 0)) + (selBox.x - mountBox.x)
-      const y = Math.max(box.y - selBox.y - TOOLBAR_ABOVE, 0) + (selBox.y - mountBox.y)
+      const scale = localScale(pageRoot, mountBox)
+      const scrollerEl = pageRoot.closest('.overflow-auto')
+      const scBox = scrollerEl?.getBoundingClientRect()
+      const vp = toolbarViewportPos(
+        { x: box.x, y: box.y, width: box.width, height: box.height },
+        scBox === undefined ? null : { x: scBox.x, y: scBox.y, width: scBox.width, height: scBox.height }
+      )
+      const x = (vp.x - mountBox.x) * scale
+      const y = (vp.y - mountBox.y) * scale
       setPending({ anchor, pageNo: pageNo!, x, y })
     }
 
@@ -162,6 +154,7 @@ export function SelectionLayer(props: {
     const onMouseDown = (e: MouseEvent): void => {
       ;[downX, downY] = [e.clientX, e.clientY]
     }
+
     const onMouseUp = (e: MouseEvent): void => {
       // 工具条自身的 mouseup 不评估（按钮 mousedown 已阻止选区坍缩，交由 click 处理）
       if (e.target instanceof Node && toolbarRef.current?.contains(e.target) === true) return
@@ -169,8 +162,7 @@ export function SelectionLayer(props: {
         window.clearTimeout(timer)
         timer = null
       }
-      // F-12：有点击落点且位移过小=单击/双击误触——不出条（pending 清空与
-      // 坍缩评估同效——点击他处清选区行为不变）
+      // F-12：位移过小=单击/双击误触不出条（自绘层留待防抖路径随选区坍缩清除）
       if (Number.isFinite(downX)) {
         const moved = Math.hypot(e.clientX - downX, e.clientY - downY)
         downX = downY = Number.NaN
@@ -182,6 +174,7 @@ export function SelectionLayer(props: {
       evaluate(true)
     }
     const onKeyDown = (e: KeyboardEvent): void => {
+      // INV-37（F-A4 修订）：Escape 只清组件态；自绘层随**选区**真清除而消失
       if (e.key === 'Escape') setPending(null)
     }
 
@@ -196,13 +189,13 @@ export function SelectionLayer(props: {
       document.removeEventListener('keydown', onKeyDown)
       if (timer !== null) window.clearTimeout(timer)
       setPending(null)
+      setPaint(null)
     }
     // 依赖=挂载盒+文献（F-02：page 不再参与——锚定根动态；挂载盒引用变化
     // 已覆盖锚定页切换的重挂清理语义）
   }, [pageRoot, paperId])
 
-  /** 按当前色 + 指定 kind 落库（page=选区所在页 0 基动态推导——F-02）；
-   *  成功后清选区并经 onSaved 交由父级刷新 store */
+  /** 按当前色+kind 落库（page=选区所在页 0 基——F-02）；成功后清选区刷新 store */
   async function save(kind: AnnotationKind): Promise<void> {
     if (pending === null || busy) return
     const input: AnnotationInput = {
@@ -222,6 +215,8 @@ export function SelectionLayer(props: {
       // 保存落地即清除该面灰点（TABS-03 乐观清除语义）
       useReaderStore.getState().clearTabDirty(paperId)
       setPending(null)
+      // 自绘层随本次 removeAllRanges 同步清除（不等防抖）
+      setPaint(null)
       window.getSelection()?.removeAllRanges()
     } catch (e) {
       // 保存失败：tab 灰点置位（失败残留可见——TABS-03 两写面之一）
@@ -232,18 +227,23 @@ export function SelectionLayer(props: {
     }
   }
 
-  if (pending === null) return null
+  if (pending === null && paint === null) return null
 
   return (
-    // 划选视觉=原生 ::selection（头注 F-08/ADR-0019）——本组件只渲染工具条
-    <SelectionToolbar
-      containerRef={toolbarRef}
-      x={pending.x}
-      y={pending.y}
-      busy={busy}
-      color={color}
-      onColor={setColor}
-      onSave={(kind) => void save(kind)}
-    />
+    <>
+      {/* 划选视觉=自绘并集层（F-A4/ADR-0019 R1 修订——头注）；生命周期=选区 */}
+      {paint !== null ? <SelectionPaint root={paint.root} rects={paint.rects} /> : null}
+      {pending !== null ? (
+        <SelectionToolbar
+          containerRef={toolbarRef}
+          x={pending.x}
+          y={pending.y}
+          busy={busy}
+          color={color}
+          onColor={setColor}
+          onSave={(kind) => void save(kind)}
+        />
+      ) : null}
+    </>
   )
 }
diff --git a/src/renderer/features/reader/annotation-anchor.ts b/src/renderer/features/reader/annotation-anchor.ts
index 0021e141d..a563a49bb 100644
--- a/src/renderer/features/reader/annotation-anchor.ts
+++ b/src/renderer/features/reader/annotation-anchor.ts
@@ -185,10 +185,17 @@ export function pixelBoxOf(el: Element): PixelBox {
   return { x, y, w: Math.max(w, 1), h: Math.max(h, 1) }
 }
 
-/** 两边界点之间的客户端矩形 → 相对 base 的归一化矩形（0..1，越界截断） */
+/** 两边界点之间的客户端矩形 → 相对 base 的归一化矩形（0..1，越界截断）。
+ *  [F-A4] 行高感知接线：选区 span 的 computed font-size 中位数=PDF 行高
+ *  量测源（px，本地口径），注入 mergeLineRects（像素域判据）与 mergeRects
+ *  （归一化域容差）——紧行距不再跨行并簇（INV-40 边界修复）。
+ *  量测口径声明：fontSize 为本地 CSS px 而 base/pixels 为视口 px（含祖先
+ *  zoom 复合）——PDF zoom≠1 时阈值等效收紧 1/zoom，方向安全（跨行更不易
+ *  误并；同行片段中心距 ≲0.25×字号远低于阈值，不受影响）。 */
 export function rectsBetweenPoints(a: DomPoint, b: DomPoint, base: PixelBox): AnnotationRect[] {
+  const lineHpx = medianFontSizeBetween(a, b)
   // 行级合并先于归一化（像素域判间隙/高度可比）：划选保存与重开重锚两路径在此同口径收口
-  const pixels = mergeLineRects(clientRectsBetween(a, b), base.w)
+  const pixels = mergeLineRects(clientRectsBetween(a, b), base.w, lineHpx)
   const clamp01 = (v: number): number => Math.min(1, Math.max(0, v))
   // F-A1 挂 A：归一化后过归并器（滤零宽/聚行/并集/钳制，INV-A~D）——零宽兜底
   // 块（w:0）随之被滤：pixels 为空时返回空数组，调用方 rects.length>0 判空语义兜住
@@ -199,10 +206,49 @@ export function rectsBetweenPoints(a: DomPoint, b: DomPoint, base: PixelBox): An
       y: clamp01((r.y - base.y) / base.h),
       w: clamp01(r.w / base.w),
       h: clamp01(r.h / base.h)
-    }))
+    })),
+    lineHpx !== undefined ? lineHpx / base.h : undefined
   )
 }
 
+/** [F-A4] 两边界点间文本的 computed font-size 中位数（下中位；PDF 行高
+ *  量测源）。无相交文本/量测不可解析（jsdom 未实现/空样式）→undefined
+ *  （调用方按旧行为走）。getComputedStyle 只读非遍历；本模块仍是唯一
+ *  DOM 文本遍历点（TreeWalker 按 Range 相交过滤）。 */
+function medianFontSizeBetween(a: DomPoint, b: DomPoint): number | undefined {
+  try {
+    const range = document.createRange()
+    range.setStart(a.node, Math.min(a.offset, a.node.data.length))
+    range.setEnd(b.node, Math.min(b.offset, b.node.data.length))
+    if (typeof range.intersectsNode !== 'function') {
+      return undefined
+    }
+    const sizes: number[] = []
+    const walker = document.createTreeWalker(range.commonAncestorContainer, NodeFilter.SHOW_TEXT)
+    for (let n = walker.nextNode() as Text | null; n !== null; n = walker.nextNode() as Text | null) {
+      if (!range.intersectsNode(n)) {
+        continue
+      }
+      const el = n.parentElement
+      if (el === null) {
+        continue
+      }
+      const px = parseFloat(getComputedStyle(el).fontSize)
+      if (Number.isFinite(px) && px > 0) {
+        sizes.push(px)
+      }
+    }
+    if (sizes.length === 0) {
+      return undefined
+    }
+    sizes.sort((x, y) => x - y)
+    return sizes[Math.floor((sizes.length - 1) / 2)]
+  } catch {
+    // 节点脱离文档等异常：行高不可量测，交调用方按旧行为走
+    return undefined
+  }
+}
+
 // ── clientRects 行级合并（pdf.js 文本层逐 span 绝对定位、各字号/基线不同，同一
 //    视觉行会产多个高矮不一且竖向重叠的矩形——逐矩形透传导致高亮叠深、下划线错落）──
 
@@ -238,8 +284,14 @@ function dominantOf(group: PixelBox[]): PixelBox {
  * clientRects 行级合并（纯函数）：同形去重 → y 区间重叠且高度可比者聚行簇 →
  * 簇内 x 大间隙断段 → 段合并（x 取并集、y/h 取段内主导矩形）→ 按 (y,x) 文档序输出。
  * 每视觉行一个（或栏断后的数个）矩形：高亮不再叠深、下划线每行一条且底边平齐。
+ * [F-A4 行高感知]：可选 lineH（px——PDF 行高，调用方量测注入）在场时聚行
+ * 判据改「中心距 ≤ lineH/2」（替代 y 区间重叠率判据）：紧行距（leading ≲
+ * 0.75×行盒高——INV-40 登记边界）下 CSS 回退行盒垂直重叠率可达 25% 门槛
+ * 而跨行并簇成单高块；以真行高为基准的中心距判据在保持同行动效（上标/
+ * 基线偏移中心距 ≲0.25×字号）的同时把紧行距相邻行（中心距=leading ≥
+ * ~1.07×字号）判为不同行。缺省=旧行为（受锁单测兼容面）。
  */
-export function mergeLineRects(pixels: PixelBox[], pageWidth: number): PixelBox[] {
+export function mergeLineRects(pixels: PixelBox[], pageWidth: number, lineH?: number): PixelBox[] {
   if (pixels.length <= 1) {
     return pixels
   }
@@ -260,7 +312,9 @@ export function mergeLineRects(pixels: PixelBox[], pageWidth: number): PixelBox[
   if (unique.length <= 1) {
     return unique
   }
-  // ② y 区间重叠聚类（组内 y 区间为成员并集；排序保证同簇连续）
+  // ② y 区间重叠聚类（组内 y 区间为成员并集；排序保证同簇连续）——
+  //    [F-A4] lineH 在场改中心距判据（头注行高感知；高度可比带两种判据通用）
+  const lh = lineH !== undefined && Number.isFinite(lineH) && lineH > 0 ? lineH : null
   const sorted = [...unique].sort((a, b) => a.y - b.y || a.x - b.x)
   const rowGroups: PixelBox[][] = []
   const groupTop: number[] = []
@@ -272,8 +326,10 @@ export function mergeLineRects(pixels: PixelBox[], pageWidth: number): PixelBox[
       const overlapPx = Math.min(groupBottom[gi]!, r.y + r.h) - Math.max(groupTop[gi]!, r.y)
       const yOverlap =
         overlapPx >= Y_OVERLAP_RATIO_MIN * Math.min(r.h, dom.h)
+      const centerOk =
+        Math.abs(r.y + r.h / 2 - (dom.y + dom.h / 2)) <= (lh ?? 0) / 2
       const hComparable = r.h >= dom.h * HEIGHT_RATIO_MIN && r.h <= dom.h * HEIGHT_RATIO_MAX
-      if (yOverlap && hComparable) {
+      if ((lh !== null ? centerOk : yOverlap) && hComparable) {
         rowGroups[gi]!.push(r)
         groupTop[gi] = Math.min(groupTop[gi]!, r.y)
         groupBottom[gi] = Math.max(groupBottom[gi]!, r.y + r.h)
diff --git a/src/renderer/features/reader/annotation-merge.ts b/src/renderer/features/reader/annotation-merge.ts
index b1d3b554b..6c61cdc94 100644
--- a/src/renderer/features/reader/annotation-merge.ts
+++ b/src/renderer/features/reader/annotation-merge.ts
@@ -15,14 +15,19 @@
  *
  * 算法（确定性，六步，输入乱序不影响输出）：
  * 滤零宽 → (中心y,x,y) 全序排序 → 聚类成行（与全部既有簇比中心距，取最近
- * 且 |cNew−cRow| <= min(hNew, hRowMedian)/2 者；高瘦矩形 h 超行高 2 倍+
- * 自动免疫——容差被 min 钳在行高一半内，ADR-0002 先例语义保持；比较扩到
- * 全部簇=修 mergeLineRects「只与末簇比较」在档失联限制）→ 行内归并
- * （x 并集 / h 与中心 y 取行内下中位数 / page 取最小）→ 行间钳制 →
- * 输出按 (y,x) 稳定排序。中位数=排序后下中位（索引 floor((n-1)/2)）。
+ * 且 |cNew−cRow| <= 容差者；容差=min(hNew, hRowMedian[, lineH])/2——
+ * **F-A4 行高感知**：可选 lineH（PDF 行高归一化值）参与钳制，紧行距下
+ * 输入 rect 高被 CSS 回退度量膨胀（可达 PDF 行高 ~1.25 倍）导致中心距
+ * ≤膨胀高/2 的相邻行误并成单高块（INV-40 登记边界）；lineH 缺省=旧行为
+ * 存档兼容。高瘦矩形 h 超行高 2 倍+自动免疫——容差被 min 钳在行高一半内，
+ * ADR-0002 先例语义保持；比较扩到全部簇=修 mergeLineRects「只与末簇比较」
+ * 在档失联限制）→ 行内归并（x 并集 / h 与中心 y 取行内下中位数 / page 取
+ * 最小）→ 行间钳制 → 输出按 (y,x) 稳定排序。中位数=排序后下中位（索引
+ * floor((n-1)/2)）。
  *
  * ── 接口层 ──
- * - export function mergeRects(rects: AnnotationRect[]): AnnotationRect[]
+ * - export function mergeRects(rects: AnnotationRect[], lineH?: number): AnnotationRect[]
+ *   （lineH=归一化域 PDF 行高；可选缺省兼容——票面 §2 导出签名扩展）
  * - export const W_MIN（滤零宽阈值，归一化域近似 1px@612pt 标准页宽；
  *   页宽 595~612pt 差异 ±3% 内忽略）
  * - 纯函数：零 DOM/React 依赖；单块输入原样返回（deep equal）；已满足
@@ -67,7 +72,9 @@ function centerY(r: AnnotationRect): number {
   return r.y + r.h / 2
 }
 
-export function mergeRects(rects: AnnotationRect[]): AnnotationRect[] {
+export function mergeRects(rects: AnnotationRect[], lineH?: number): AnnotationRect[] {
+  // F-A4 行高感知容差的 lineH 钳制值（非有限正数防御→不收紧=旧行为）
+  const lh = lineH !== undefined && Number.isFinite(lineH) && lineH > 0 ? lineH : Number.POSITIVE_INFINITY
   // ① 滤零宽（INV-C）：w <= W_MIN 的块不入集合
   const kept = rects.filter((r) => r.w > W_MIN)
   if (kept.length === 0) {
@@ -78,6 +85,7 @@ export function mergeRects(rects: AnnotationRect[]): AnnotationRect[] {
     (a, b) => centerY(a) - centerY(b) || a.x - b.x || a.y - b.y
   )
   // ③ 聚类成行（INV-B 前置）：与全部既有簇比中心距，取最近且满足容差者
+  //    （容差 min(hNew, hRowMedian, lineH)/2——F-A4 行高感知钳制）
   const rows: RowCluster[] = []
   for (const r of ordered) {
     const c = centerY(r)
@@ -85,7 +93,7 @@ export function mergeRects(rects: AnnotationRect[]): AnnotationRect[] {
     let nearestDist = Number.POSITIVE_INFINITY
     for (const row of rows) {
       const dist = Math.abs(c - row.medianC)
-      if (dist <= nearestDist && dist <= Math.min(r.h, row.medianH) / 2) {
+      if (dist <= nearestDist && dist <= Math.min(r.h, row.medianH, lh) / 2) {
         nearest = row
         nearestDist = dist
       }
diff --git a/src/renderer/features/reader/annotation-resolve.ts b/src/renderer/features/reader/annotation-resolve.ts
new file mode 100644
index 000000000..31ffee479
--- /dev/null
+++ b/src/renderer/features/reader/annotation-resolve.ts
@@ -0,0 +1,232 @@
+/**
+ * [F-A4] annotation-resolve —— 标注渲染重锚与行盒自适应域（自 AnnotationLayer
+ * 拆出——组件 ≤250 行红线预裁；票面 §3 拆件结构）。
+ *
+ * ── 行为层 ──
+ * - resolveAnnotationRects：verifyQuote 校正偏移（自愈排版漂移）→
+ *   findRangeAtOffset 重算 rects——逐条等价自 AnnotationLayer 原 resolve
+ *   闭包迁出（行为零变：失败回退存量，仅显示层不回写库）；
+ * - [F-A4 b②] 行盒自适应字形带：重锚 range.textNodes 的 span 实测盒
+ *   （gBCR）+canvas 字体度量（measureText 的 actualBoundingBox Ascent/
+ *   Descent=墨带实界+fontBoundingBox=回退字体布局带）→ 推算字形带
+ *   [字形顶, 基线+descender 尾]（归一化域）——rectStyle band 消费（顶贴
+ *   字形顶缘底贴底缘）。无 canvas 2d/度量缺字段（jsdom）→ 空 bands，
+ *   渲染回退 F-11 分数路径（缺省兼容）。
+ * - normalizedLineHeight：textLayer span 的 computed font-size 中位数/
+ *   textLayer 盒高（挂 B mergeRects 行高感知 lineH——存量 rects 读时归并
+ *   同口径；量测退化→undefined 旧行为）。
+ * - matchBand：渲染块→最近中心带（|band.center−rect.center| ≤ rect.h 才
+ *   匹配——跨行带不误配）。
+ *
+ * ── 接口层 ── / ── 架构层 ── / ── 生命周期层 ──
+ * - 依赖单向：本模块→anchor-serialize/annotation-anchor（零环）；DOM 访问
+ *   只读（gBCR/getComputedStyle/canvas 量测），文本遍历仍唯经
+ *   annotation-anchor（F-ARCH4 契约保持）；纯几何 bandFromMetrics/
+ *   matchBand 单测直测。
+ * - 性能：每标注一次 canvas 量测（span 去重后），MutationObserver+rAF
+ *   合并节奏随宿主（F-A1 起不变）。
+ *
+ * ── 文化层 ──
+ * - tests/unit/renderer/selection-paint.test.tsx（bandFromMetrics 纯几何+
+ *   AnnotationLayer 挂 B 接线）。
+ */
+import type { Annotation, AnnotationRect } from '@shared/models/annotation'
+import { verifyQuote } from './anchor-serialize'
+import { findRangeAtOffset, pixelBoxOf, type PixelBox } from './annotation-anchor'
+
+/** 行簇字形带（归一化域；center=带中心——渲染块匹配键） */
+export interface RowBand {
+  top: number
+  bottom: number
+  center: number
+}
+
+/** 重锚结果（id → { rects, bands }；缺项回退存量 rects 由消费方兜底） */
+export interface ResolvedAnnotation {
+  rects: AnnotationRect[]
+  bands: RowBand[]
+}
+
+/** span 字体度量（canvas measureText 产物——墨带实界+回退字体布局带） */
+export interface SpanMetrics {
+  ascent: number
+  descent: number
+  fontAscent: number
+  fontDescent: number
+}
+
+/** 纯几何：span 盒+字号+字体度量+归一化基准 → 字形带。
+ *  基线=盒顶+半前导+回退 ascent（半前导=(行盒高 fs−布局带高)/2，**负值合法
+ *  不钳 0**——line-height:1 下回退字体内容区（asc+desc）溢出行盒，CSS 把
+ *  溢出按负前导对称分布，基线随之下沉；钳 0 会使带整体下偏 ~|半前导|px，
+ *  真机 diag-20260831 实锤 +4~5px）；字形带=[基线−墨带 ascent, 基线+墨带
+ *  descent]。带高 ≤0/非有限/base 退化 → null。 */
+export function bandFromMetrics(
+  span: PixelBox,
+  fs: number,
+  m: SpanMetrics | null,
+  base: PixelBox
+): RowBand | null {
+  if (m === null || base.w <= 0 || base.h <= 0 || !Number.isFinite(fs) || fs <= 0) {
+    return null
+  }
+  const halfLeading = (fs - m.fontAscent - m.fontDescent) / 2
+  const baseline = span.y + halfLeading + m.fontAscent
+  const top = (baseline - m.ascent - base.y) / base.h
+  const bottom = (baseline + m.descent - base.y) / base.h
+  if (!Number.isFinite(top) || !Number.isFinite(bottom) || bottom <= top) {
+    return null
+  }
+  return {
+    top: Math.min(1, Math.max(0, top)),
+    bottom: Math.min(1, Math.max(0, bottom)),
+    center: (top + bottom) / 2
+  }
+}
+
+/** 渲染块 → 最近中心带（|Δcenter| ≤ rect.h 才匹配；bands 空→undefined） */
+export function matchBand(bands: RowBand[] | undefined, r: AnnotationRect): { top: number; bottom: number } | undefined {
+  if (bands === undefined || bands.length === 0) {
+    return undefined
+  }
+  const c = r.y + r.h / 2
+  let best: RowBand | null = null
+  for (const b of bands) {
+    if (best === null || Math.abs(b.center - c) < Math.abs(best.center - c)) {
+      best = b
+    }
+  }
+  return best !== null && Math.abs(best.center - c) <= r.h
+    ? { top: best.top, bottom: best.bottom }
+    : undefined
+}
+
+/** canvas 2d 量测上下文（模块级缓存；无 canvas 环境→null） */
+let ctxCache: CanvasRenderingContext2D | null | undefined
+
+function measureContext(): CanvasRenderingContext2D | null {
+  if (ctxCache === undefined) {
+    try {
+      ctxCache = document.createElement('canvas').getContext('2d')
+    } catch {
+      ctxCache = null
+    }
+  }
+  return ctxCache
+}
+
+/** span 元素的字体度量（computed font 简写 → canvas measureText）；度量
+ *  字段缺/非有限（旧引擎/空文本退化）→ null */
+function metricsOf(ctx: CanvasRenderingContext2D, el: Element, text: string): SpanMetrics | null {
+  const cs = getComputedStyle(el)
+  try {
+    ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
+    const m = ctx.measureText(text.length > 0 ? text : ' ')
+    const out = {
+      ascent: m.actualBoundingBoxAscent,
+      descent: m.actualBoundingBoxDescent,
+      fontAscent: m.fontBoundingBoxAscent,
+      fontDescent: m.fontBoundingBoxDescent
+    }
+    for (const v of Object.values(out)) {
+      if (!Number.isFinite(v)) {
+        return null
+      }
+    }
+    return out
+  } catch {
+    return null
+  }
+}
+
+/** span 字号（computed fontSize px；不可解析→盒高代理——「以行簇 span 实测
+ *  盒为基准」的兜底口径） */
+function fontSizeOf(el: Element, box: PixelBox): number {
+  const px = parseFloat(getComputedStyle(el).fontSize)
+  return Number.isFinite(px) && px > 0 ? px : box.h
+}
+
+/** 重锚 textNodes → 行簇字形带（span 去重+同带合并；无 canvas/量测退化→[]） */
+function bandsForNodes(nodes: Text[], base: PixelBox): RowBand[] {
+  const ctx = measureContext()
+  if (ctx === null) {
+    return []
+  }
+  const bands: RowBand[] = []
+  const seen = new Set<Element>()
+  for (const n of nodes) {
+    const el = n.parentElement
+    if (el === null || seen.has(el)) {
+      continue
+    }
+    seen.add(el)
+    const box = pixelBoxOf(el)
+    if (box.h <= 1) {
+      continue // 无布局量测（jsdom 桩面 h 兜 1）——渲染回退分数路径
+    }
+    const band = bandFromMetrics(box, fontSizeOf(el, box), metricsOf(ctx, el, n.data), base)
+    if (band === null) {
+      continue
+    }
+    // 同行多 span：中心距在带高内并为一带（行簇单带）
+    const near = bands.find((b) => Math.abs(b.center - band.center) <= band.bottom - band.top)
+    if (near === undefined) {
+      bands.push(band)
+    }
+  }
+  return bands
+}
+
+/** 重锚+行盒自适应（AnnotationLayer 挂 B 宿主调用；逐条等价迁出+band 增量） */
+export function resolveAnnotationRects(args: {
+  textLayer: HTMLElement
+  annotations: Annotation[]
+  page: number
+}): Record<string, ResolvedAnnotation> {
+  const { textLayer, annotations, page } = args
+  const next: Record<string, ResolvedAnnotation> = {}
+  const base = pixelBoxOf(textLayer)
+  for (const a of annotations) {
+    if (a.page !== page || a.quoteText.length === 0) {
+      continue
+    }
+    const at = verifyQuote(textLayer, {
+      prefix: a.prefixText,
+      quote: a.quoteText,
+      suffix: a.suffixText,
+      start: a.startOffset
+    })
+    if (at === null) {
+      continue
+    }
+    const range = findRangeAtOffset(textLayer, at, at + a.quoteText.length)
+    if (range !== null && range.rects.length > 0) {
+      next[a.id] = {
+        rects: range.rects,
+        bands: bandsForNodes(range.textNodes.map((t) => t.node), base)
+      }
+    }
+  }
+  return next
+}
+
+/** textLayer 行高（归一化域——挂 B mergeRects lineH；span 字号中位数/盒高）。
+ *  量测退化（盒高兜 1 的 jsdom 桩面）→undefined 旧行为。 */
+export function normalizedLineHeight(textLayer: HTMLElement): number | undefined {
+  const base = pixelBoxOf(textLayer)
+  if (base.h <= 1) {
+    return undefined
+  }
+  const sizes: number[] = []
+  for (const span of Array.from(textLayer.querySelectorAll('span'))) {
+    const px = parseFloat(getComputedStyle(span).fontSize)
+    if (Number.isFinite(px) && px > 0) {
+      sizes.push(px)
+    }
+  }
+  if (sizes.length === 0) {
+    return undefined
+  }
+  sizes.sort((x, y) => x - y)
+  return sizes[Math.floor((sizes.length - 1) / 2)]! / base.h
+}
diff --git a/src/renderer/features/reader/annotation-style.ts b/src/renderer/features/reader/annotation-style.ts
index 4195001eb..279350cfb 100644
--- a/src/renderer/features/reader/annotation-style.ts
+++ b/src/renderer/features/reader/annotation-style.ts
@@ -30,16 +30,34 @@ export const COLOR_LABEL: Record<AnnotationColor, string> = {
  *  真机 6.38px 行）底缘悬至基线下 ~1.5px（回退 sans 的 descent 带=「标注
  *  下偏」真身）、顶缘高出字形顶 ~1.3px。顶收 10%/底收 12% 后高亮带≈
  *  [字形顶, 基线+descender 尾]；下划线底缘同口径。持久化 rects 数据零改
- *  （纯渲染侧），划选保存/重锚两路径同走本单点。 */
+ *  （纯渲染侧），划选保存/重锚两路径同走本单点。
+ *  [F-A4 b②] 定值分数=缺省兜底路径：渲染侧行盒自适应 band（该行簇 span
+ *  实测盒+canvas 字体度量推算的字形带——annotation-resolve 注入）在场时
+ *  顶贴字形顶缘底贴底缘（用户理想状态「矩形高度与位置匹配文字」）；band
+ *  缺省（存量 rects/不可量测环境/jsdom）回退本分数语义。 */
 const TRIM_TOP = 0.1
 const TRIM_BOTTOM = 0.12
 
+/** [F-A4] 行盒自适应字形带（归一化域顶/底——annotation-resolve 产出） */
+export interface GlyphBand {
+  top: number
+  bottom: number
+}
+
+/** 百分比串（4 位小数舍入——吞浮点尾差，产干净内联样式值） */
+function pct(v: number): string {
+  return `${Number((v * 100).toFixed(4))}%`
+}
+
 /** kind+color+归一化矩形 → 色块样式（自 AnnotationLayer 迁入——组件行数
- * 防线；荧光笔语义：multiply 混合下色块不透明；下划线为收边后底缘 2px 实条） */
+ *  防线；荧光笔语义：multiply 混合下色块不透明；下划线为收边后底缘 2px 实条）。
+ *  band 在场=行盒自适应（F-A4 b②：highlight 顶=band.top/高=band.bottom−
+ *  band.top；underline 实条贴 band.bottom 上方 2px）；缺省=F-11 分数路径。 */
 export function rectStyle(
   kind: AnnotationKind,
   color: AnnotationColor,
-  r: AnnotationRect
+  r: AnnotationRect,
+  band?: GlyphBand
 ): CSSProperties {
   const base: CSSProperties = {
     left: `${r.x * 100}%`,
@@ -51,11 +69,19 @@ export function rectStyle(
   if (kind === 'underline') {
     return {
       ...base,
-      top: `calc(${(r.y + r.h * (1 - TRIM_BOTTOM)) * 100}% - 2px)`,
+      top: band !== undefined ? `calc(${pct(band.bottom)} - 2px)` : `calc(${(r.y + r.h * (1 - TRIM_BOTTOM)) * 100}% - 2px)`,
       height: '2px',
       opacity: 1
     }
   }
+  if (band !== undefined) {
+    return {
+      ...base,
+      top: pct(band.top),
+      height: pct(band.bottom - band.top),
+      opacity: 1
+    }
+  }
   return {
     ...base,
     top: `${(r.y + r.h * TRIM_TOP) * 100}%`,
diff --git a/src/renderer/features/reader/selection-geometry.ts b/src/renderer/features/reader/selection-geometry.ts
new file mode 100644
index 000000000..2803d7f80
--- /dev/null
+++ b/src/renderer/features/reader/selection-geometry.ts
@@ -0,0 +1,85 @@
+/**
+ * [F-A4] selection-geometry —— 划选几何域（纯函数+常量，自 SelectionLayer 拆出
+ * ——组件 ≤250 行红线预裁；票面 §3 拆件结构）。
+ *
+ * ── 行为层 ──
+ * - closestPageRoot/pageIndexOf 自 SelectionLayer 迁入（F-02 纯函数页盒遍历，
+ *   行为零变；原导出面经 SelectionLayer 再导出保持 API 零变——票面 §2）。
+ * - localScale（c 面「坐标系双重放大」根治单源）：视口 px 差值 ÷ 有效 zoom
+ *   归一到挂载盒本地 px。比值=el.clientWidth（CSS 本地布局 px，不含祖先
+ *   zoom）/el.gBCR.width（根框视觉 px，含全部祖先 zoom 复合）——任意嵌套
+ *   zoom（.app-content-row 的 ui-scale 等）自动复合，零 CSS 类耦合（不查
+ *   挂载点类名——改挂载点/加档不破）。思想 crib lineage-viewport
+ *   rootToLocalScale（F-L2/INV-43），reader 域新写不复用跨域 import
+ *   （票面 §0c 裁决）。任一量测 ≤0（未挂载/不可量测——jsdom 桩面
+ *   clientWidth 恒 0）→1（防御：退化直通，不产生除零/NaN）。
+ * - toolbarViewportPos：工具条视口域定位（票面 §1c）——选区上方 TOOLBAR_ABOVE
+ *   常规位；选区顶距滚动容器可视区顶 <TOOLBAR_ABOVE（工具条高+间隙）时
+ *   **下翻转**（放选区下方 TOOLBAR_BELOW_GAP）；随后对滚动容器可视区做
+ *   **夹取**（工具条不越滚动容器）。scroller=null（无滚动容器上下文——
+ *   单测桩面/非阅读器挂载）不翻转不夹取，落点=选区原生位置。
+ *
+ * ── 接口层 ── / ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
+ * - 全纯函数零 React/DOM 写依赖（gBCR/clientWidth 只读）；组件测试：
+ *   tests/unit/renderer/selection-layer.test.tsx（P1 归一）+
+ *   tests/unit/renderer/selection-paint.test.tsx（c 面三态）。
+ */
+/** 工具条定位：估算宽度（水平夹取）与选区上方留白（F-07 既有值） */
+export const TOOLBAR_WIDTH = 180
+export const TOOLBAR_ABOVE = 42
+/** 工具条估算高度（垂直夹取）与下翻转间隙（F-A4 c 面新增） */
+export const TOOLBAR_HEIGHT = 32
+export const TOOLBAR_BELOW_GAP = 8
+
+/** 视口矩形（gBCR 口径——getBoundingClientRect 的结构化形状） */
+export interface ViewportBox {
+  x: number
+  y: number
+  width: number
+  height: number
+}
+
+/** F-02：节点向上最近页盒（[data-page-root] 元素——页列渲染窗内页才有；
+ *  锚定根动态遍历的纯函数，测试直测） */
+export function closestPageRoot(node: Node | null): HTMLElement | null {
+  let cur: Node | null = node
+  while (cur !== null) {
+    if (cur instanceof HTMLElement && cur.hasAttribute('data-page-root')) {
+      return cur
+    }
+    cur = cur.parentNode
+  }
+  return null
+}
+
+/** F-02：页盒页号（data-page-root 值 1 基→0 基页码；缺失/非法值 null） */
+export function pageIndexOf(root: HTMLElement): number | null {
+  const no = Number(root.getAttribute('data-page-root'))
+  return Number.isInteger(no) && no >= 1 ? no - 1 : null
+}
+
+/** 视口→挂载盒本地坐标比值（1/有效 zoom；量测退化→1 直通） */
+export function localScale(el: Element, rect?: DOMRect): number {
+  const rw = (rect ?? el.getBoundingClientRect()).width
+  const cw = el.clientWidth
+  return rw > 0 && cw > 0 ? cw / rw : 1
+}
+
+/** 工具条视口域定位：上方常规位→近顶下翻转→滚动容器可视区夹取（纯函数） */
+export function toolbarViewportPos(sel: ViewportBox, scroller: ViewportBox | null): { x: number; y: number } {
+  let y = sel.y - TOOLBAR_ABOVE
+  let x = sel.x
+  if (scroller !== null) {
+    // 下翻转：选区顶距可视区顶不足一个常规位（工具条高+间隙≈TOOLBAR_ABOVE）
+    // ——放选区下方（票面 §1c「选区近顶时下翻转」）
+    if (sel.y - scroller.y < TOOLBAR_ABOVE) {
+      y = sel.y + sel.height + TOOLBAR_BELOW_GAP
+    }
+    // 视口夹取：工具条整体落在滚动容器可视区内（票面 §1c「不越滚动容器可视区」）
+    const maxY = Math.max(scroller.y + scroller.height - TOOLBAR_HEIGHT, scroller.y)
+    y = Math.min(Math.max(y, scroller.y), maxY)
+    const maxX = Math.max(scroller.x + scroller.width - TOOLBAR_WIDTH, scroller.x)
+    x = Math.min(Math.max(x, scroller.x), maxX)
+  }
+  return { x, y }
+}
diff --git a/src/renderer/features/reader/selection-paint.tsx b/src/renderer/features/reader/selection-paint.tsx
new file mode 100644
index 000000000..dada5c525
--- /dev/null
+++ b/src/renderer/features/reader/selection-paint.tsx
@@ -0,0 +1,62 @@
+/**
+ * [F-A4] SelectionPaint —— 划选视觉并集自绘层（ADR-0019 R1 修订；票面 §1a）。
+ *
+ * - 数据=SelectionLayer evaluate 产出的锚定 rects（mergeLineRects+mergeRects
+ *   归并产物——与保存 rects 同源，「所见即所存」S2）；单层单绘：相邻行重叠
+ *   输入经归并后两两分离，重叠处不再逐 span 叠深（native ::selection 的
+ *   0.20×2≈0.36 加深缺陷根治——票面 §0a）。
+ * - 色 rgba(0,0,0,0.20)：同修前观感（R2-F-10 灰 0.20 在案；白纸合成
+ *   ≈#CCCCCC 可辨）。
+ * - 渲染=React portal 进选区所在页盒：宿主取 .textLayer 父盒（与
+ *   textLayer/AnnotationLayer 同 inset-0 同盒）——rects 归一化基准=
+ *   pixelBoxOf(textLayer)，百分比数学与其严格同盒零换算；且页列
+ *   `zoom: calc(1/var(--ui-scale))` 在档位≠1 时创建 stacking context，
+ *   层必须与标注层同 context，z2 才位于 z5 标注 multiply 层之下
+ *   （灰在黄下——R2-F-10 观感保持；渲染在挂载盒会被页列 sc 吞到标注之上）。
+ * - 生命周期=选区生命周期（evaluate 置位/清除置空——INV-37 视觉-状态严格
+ *   同步；Escape 只清工具条，层随选区真清除而消失）；pointer-events:none
+ *   防吞划选手势。
+ * - 组件测试：tests/unit/renderer/selection-paint.test.tsx（S1~S5）+
+ *   selection-layer.test.tsx（F-A4 反转守卫）。
+ */
+import { createPortal } from 'react-dom'
+import type { AnnotationRect } from '@shared/models/annotation'
+
+/** 自绘并集层灰（F-A4：观感同修前 ::selection rgba(0 0 0 / 0.20)） */
+const PAINT_BG = 'rgba(0, 0, 0, 0.20)'
+
+export function SelectionPaint(props: {
+  /** 选区所在页盒（[data-page-root]——portal 目标树的根） */
+  root: HTMLElement
+  /** 归一化并集矩形（evaluate 管线产物——与保存 rects 同源） */
+  rects: AnnotationRect[]
+}): JSX.Element {
+  const { root, rects } = props
+  // 宿主=.textLayer 父盒（结构常量：textLayer 与标注层同挂该盒的 inset-0）；
+  // 异常结构兜底=页盒自身（几何同页，不劣于缺层）
+  const textLayer = root.querySelector('.textLayer')
+  const host = textLayer?.parentElement ?? root
+  return createPortal(
+    <div
+      data-testid="selection-rects"
+      className="absolute inset-0"
+      style={{ zIndex: 2, pointerEvents: 'none' }}
+    >
+      {rects.map((r, i) => (
+        <div
+          key={i}
+          data-testid="selection-rect"
+          className="absolute"
+          style={{
+            left: `${r.x * 100}%`,
+            top: `${r.y * 100}%`,
+            width: `${r.w * 100}%`,
+            height: `${r.h * 100}%`,
+            background: PAINT_BG
+          }}
+        />
+      ))}
+    </div>,
+    host
+  )
+}
diff --git a/src/renderer/features/reader/text-layer.css b/src/renderer/features/reader/text-layer.css
index 3f8784153..c9ca7dbc9 100644
--- a/src/renderer/features/reader/text-layer.css
+++ b/src/renderer/features/reader/text-layer.css
@@ -36,6 +36,13 @@
  *   multiply 层(z:5)之下——黄×灰逐通道相乘成暗橄榄；alpha 降至 0.20 后白底
  *   合成 #CCCCCC（仍清晰可辨，F-08「选中不可见」红线不回退），叠黄合成
  *   rgb(202,179,57) 较 0.30 的 rgb(177,157,50) 提亮一档。ADR-0019 补记同步。
+ * - [F-A4] ::selection 再改 transparent（ADR-0019 R1 修订——票面 §0a 用户
+ *   根治令）：官方 pdf.js 已知缺陷（issue #17561 同族）——文本层逐 span 绘制，
+ *   pdf.js span 行盒=CSS 回退字体度量，相邻行垂直重叠处 0.20×2≈0.36 逐层
+ *   叠深；CSS 层无解，唯一根治=自绘并集层（SelectionLayer→selection-paint，
+ *   归并产物单层单绘，用色即本灰 0.20——R2-F-10 观感随迁）。SR2-F-08 当年
+ *   删自绘的两病根已解：拖选零反馈→selectionchange 200ms 防抖路径在场驱动
+ *   自绘层；30% accent 近不可见→观感灰在案。
  */
 .textLayer{
   position:absolute;
@@ -78,11 +85,11 @@
   }
 
 .textLayer ::-moz-selection{
-    background:rgba(0 0 0 / 0.20);
+  background:transparent;
 }
 
 .textLayer ::selection{
-    background:rgba(0 0 0 / 0.20);
+  background:transparent;
 }
 
 .textLayer br::-moz-selection{
diff --git a/src/renderer/features/workspaces/workspace.css b/src/renderer/features/workspaces/workspace.css
index 73d9566fa..50a5689ae 100644
--- a/src/renderer/features/workspaces/workspace.css
+++ b/src/renderer/features/workspaces/workspace.css
@@ -49,10 +49,11 @@
   font-size: 10px;
 }
 
-/* 下拉面板：亮面卡+冷蓝描边+shadow-3 浮层；入场 160ms 放大一圈渐显
+/* 下拉面板：亮面卡+冷蓝描边+shadow-3 浮层；入场 160ms 居中放大一圈渐显
    （transform 不占布局——顶栏高度链零扰动，F-05 同口径）。原上浮
    translateY(-4px) 在顶栏贴屏幕上缘时面板飘出可视区难看——改纯缩放
-   （origin=顶部中心，自按钮下方长出感），用户裁决 2026-08-31 */
+   （origin=center 居中放大，用户裁决 2026-08-31 第二轮：top center 观察
+   为向右上展开，改 center） */
 .ws-panel {
   display: flex;
   flex-direction: column;
@@ -64,7 +65,7 @@
   background: var(--panel);
   color: var(--text);
   box-shadow: var(--shadow-3);
-  transform-origin: top center;
+  transform-origin: center;
   animation: ws-pop 0.16s ease-out;
 }
 @keyframes ws-pop {
diff --git a/src/renderer/shared/theme.css b/src/renderer/shared/theme.css
index 423d62392..570fd1967 100644
--- a/src/renderer/shared/theme.css
+++ b/src/renderer/shared/theme.css
@@ -73,8 +73,10 @@ body,
 }
 
 /* ══ App 壳顶栏身份区（R2-SH2 决4——ZCode 式）：白底横条（--panel+下边 1px
-   --border+高 44px）=logo+应用名+课题切换器+版本号右区；relative+z-index 防
-   切换器展开面板被 main 区盖板（面板在组件 flex-col 流内向下溢出绘制）══ */
+   --border+高 56px）=logo+应用名+课题切换器+版本号右区；relative+z-index 防
+   切换器展开面板被 main 区盖板（面板在组件 flex-col 流内向下溢出绘制）══
+   高度 44→56px（用户裁决 2026-08-31：按钮与 Synapse 标志下移——增高级；
+   caption 三键 stretch 贯通自动随高，width:44 热区宽不动）══ */
 /* R2-SH3：整条=拖拽区（drag）——双击空白即 Windows 系统最大化/还原（drag 区
    原生行为零代码）；交互件容器单独 no-drag（见 switcher/titlebar 两处） */
 .app-header {
@@ -82,7 +84,7 @@ body,
   align-items: center;
   gap: 8px;
   flex: none;
-  height: 44px;
+  height: 56px;
   padding: 0 12px;
   position: relative;
   z-index: 10;
@@ -105,7 +107,7 @@ body,
    高度链不扰动；面板向下溢出可见）；no-drag=触发钮与展开面板（溢出 header
    盒侵入 main 区部分同为面板自身盒——不被 drag 吞点击） */
 .app-header-switcher {
-  max-height: 44px;
+  max-height: 56px;
   -webkit-app-region: no-drag;
 }
 .app-header .app-nav-ver {
@@ -115,7 +117,7 @@ body,
 /* ══ R2-SET1 界面缩放三档：--ui-scale 挂 documentElement（App effect 单点写，
    数值映射单源=shared/ipc/schemas UI_SCALE 1/1.1/1.25）。
    内容行整行缩放（nav+main 文本面）；header 在行外结构性豁免（E5 裁决——
-   caption 三键/顶栏身份区保持系统观感，实测 44px 恒定）；
+   caption 三键/顶栏身份区保持系统观感，恒定不随档位变）；
    PDF 页列反向补偿恒视觉 1.0——探针实测（r2-set1-out-probe.json）：canvas
    跟随 ×1.1 位图拉伸模糊，zoom: calc(1 / var(--ui-scale, 1)) Chromium 接受且
    canvas 精确恢复 612×792 原始视觉+背衬匹配+textLayer 对位不受破坏（对位
@@ -135,7 +137,7 @@ body,
 .titlebar-controls {
   display: flex;
   align-items: stretch;
-  /* header 的 center 对齐下容器自身贯通 44px（按钮 stretch 满高热区——
+  /* header 的 center 对齐下容器自身贯通整条高（按钮 stretch 满高热区——
      否则容器按内容(SVG 10px)收缩，真机取证 rect 实测高仅 10px 病灶） */
   align-self: stretch;
   flex: none;
diff --git a/tests/e2e/reader-text.spec.ts b/tests/e2e/reader-text.spec.ts
index 19c0b3e6f..46e46e3ec 100644
--- a/tests/e2e/reader-text.spec.ts
+++ b/tests/e2e/reader-text.spec.ts
@@ -617,7 +617,7 @@ test('P7-C 收官：侧栏笔记面——片段列表（文档序）+总评 auto
 /** F-06 视觉小票依赖：渲染链 + 页列（F-01 页盒载体）+ 本单（验收缺陷 B+C） */
 const F06_DEPS = [...COLUMN_DEPS, 'SR2-F-06'] as const
 
-test('F-06 视觉小票：页盒 panel 底+阴影页缘可辨；::selection 半透明灰（划选即时可见）', async () => {
+test('F-06 视觉小票：页盒 panel 底+阴影页缘可辨；划选视觉=自绘并集层（F-A4/ADR-0019 R1 修订）', async () => {
   skipIfPending(F06_DEPS)
   const userData = await mkdtemp(join(tmpdir(), 'synapse-f06-'))
 
@@ -665,33 +665,35 @@ test('F-06 视觉小票：页盒 panel 底+阴影页缘可辨；::selection 半
   expect(visual.bodyBg, 'B: body 背景=--bg').toBe('rgb(246, 244, 238)')
   expect(visual.pageBg, 'B: 页盒与阅读区两值可辨').not.toBe(visual.scrollBg)
 
-  // —— 缺陷 C（SR2-F-08 回退官方路线 ADR-0019 + SR2-F-09 用户令改灰仿 WPS
-  //    + R2-F-10 用户令降 alpha：灰选中与黄标注 multiply 叠处加深难看）：
-  //    ::selection 背景=rgba(0 0 0 / 0.20)（白纸合成≈#CCCCCC 仍清晰可辨，
-  //    F-08「选中不可见」红线不回退；叠黄合成提亮一档；偏离官方值
-  //    rgba(0 0 255 / 0.25) 的显式登记=ADR-0019 补记）——
-  //    划选视觉反馈由浏览器原生渲染，拖选第一帧即反馈；canvas 字形透出可读
+  // —— 缺陷 C（[F-A4] ADR-0019 R1 修订：SR2-F-08 原生路线的两病根已解——
+  //    拖选零反馈→selectionchange 200ms 防抖路径在场驱动自绘层；30% accent
+  //    近不可见→观感灰 rgba(0,0,0,0.20) 在案。::selection 背景=transparent
+  //    （视觉单通道=SelectionLayer 自绘并集层——native 逐 span 绘制在重叠
+  //    行盒处 0.20×2≈0.36 叠深，CSS 层无解；修订依据=F-A4 票面 §0a 用户
+  //    根治令）——
   const sel = visual.selectionBg
   expect(sel, 'C: ::selection 背景可查询（文本层 span 在场）').not.toBe('missing')
-  // 半透明灰精确断言（四分量全锁；正则仅容忍序列化空格差异——不放宽为
-  // 弱家族匹配，参照被删 alpha 正则先例的双形态口径）
-  const selOfficial =
-    /^rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\.2\s*\)$/.exec(sel) !== null
   expect(
-    selOfficial,
-    `C: ::selection 背景=半透明灰 rgba(0, 0, 0, 0.2)：${sel}`
-  ).toBe(true)
+    sel,
+    `C: ::selection 背景透明（视觉通道=自绘并集层）：${sel}`
+  ).toBe('rgba(0, 0, 0, 0)')
 
   // 真实选选（程序化 selectText——防抖路径同产 pending）→ 工具条 ≤1.5s 可见
   // （L7：交互反馈预算入验收——程序化选选含 200ms 防抖+evaluate，预算 1.5s）
   const known = win.getByText(`P1 ${PDF_KNOWN_TEXT}`).first()
   await known.selectText()
   await expect(win.getByTestId('selection-toolbar')).toBeVisible({ timeout: 1_500 })
-  // 自绘层不在场（ADR-0019 防回归守卫——视觉通道已回原生 ::selection）
+  // [F-A4] 守卫反转：自绘并集层在场（原 ADR-0019「selection-rects 0 计数」
+  // 防自绘回归守卫随 R1 修订反转——层经 portal 渲染进选区所在页盒，单层
+  // 单绘不叠深；块为归并产物可见实块）
   await expect(
     win.getByTestId('selection-rects'),
-    'C: 自绘选区块不在场（ADR-0019 原生路线）'
-  ).toHaveCount(0)
+    'C: 自绘选区并集层在场（ADR-0019 R1 修订/F-A4）'
+  ).toBeVisible()
+  const selBlock = win.getByTestId('selection-rect').first()
+  await expect(selBlock).toBeVisible()
+  // 自绘灰 0.20（R2-F-10 观感在案——计算样式直读，白纸合成≈#CCCCCC 由 alpha 蕴含）
+  await expect(selBlock).toHaveCSS('background-color', 'rgba(0, 0, 0, 0.2)')
   await app.close()
 })
 
diff --git a/tests/e2e/smoke.spec.ts b/tests/e2e/smoke.spec.ts
index 979dde63a..78b93bc6a 100644
--- a/tests/e2e/smoke.spec.ts
+++ b/tests/e2e/smoke.spec.ts
@@ -157,7 +157,7 @@ test('frameless 标题栏：自绘三键可见可交互 + drag/no-drag 区域正
   await app.close()
 })
 
-test('R2-SET1 界面缩放：点「大 125%」→nav 首项 rect ×1.25（±2px）+header 高恒 44（豁免锁——rect 断言非 computed）', async () => {
+test('R2-SET1 界面缩放：点「大 125%」→nav 首项 rect ×1.25（±2px）+header 高恒 56（豁免锁——rect 断言非 computed）', async () => {
   const userData = await mkdtemp(join(tmpdir(), 'synapse-smoke-set1-'))
   const app = await electron.launch({
     args: ['out/main/index.js'],
@@ -172,14 +172,14 @@ test('R2-SET1 界面缩放：点「大 125%」→nav 首项 rect ×1.25（±2px
     navH: document.querySelector('.app-nav-item')!.getBoundingClientRect().height,
     headerH: document.querySelector('header.app-header')!.getBoundingClientRect().height
   }))
-  expect(base.headerH, '基线 header 高=44（R2-SH2 锚）').toBe(44)
+  expect(base.headerH, '基线 header 高=56（R2-SH2 锚；44→56 用户裁决 2026-08-31 增高令——断言随令）').toBe(56)
 
   // 进设置→点「大 125%」→save 落地→store 替换→App 订阅→--ui-scale→内容行 zoom
   await win.getByRole('button', { name: '设置' }).click()
   await win.getByRole('button', { name: '大 125%' }).click()
   await expect(win.getByText('界面缩放已保存')).toBeVisible()
 
-  // nav 首项 ×1.25±2px（内容行缩放生效）；header 恒 44（结构性豁免）
+  // nav 首项 ×1.25±2px（内容行缩放生效）；header 恒 56（结构性豁免）
   await expect
     .poll(
       async () => {
@@ -194,7 +194,7 @@ test('R2-SET1 界面缩放：点「大 125%」→nav 首项 rect ×1.25（±2px
   const headerAfter = await win.evaluate(
     () => document.querySelector('header.app-header')!.getBoundingClientRect().height
   )
-  expect(headerAfter, 'header 在内容行外——豁免锁（E5：caption/顶栏保持系统观感）').toBe(44)
+  expect(headerAfter, 'header 在内容行外——豁免锁（E5：caption/顶栏保持系统观感）').toBe(56)
 
   await app.close()
 })
diff --git a/tests/unit/renderer/annotation-merge.test.ts b/tests/unit/renderer/annotation-merge.test.ts
index 62081820b..984ac3566 100644
--- a/tests/unit/renderer/annotation-merge.test.ts
+++ b/tests/unit/renderer/annotation-merge.test.ts
@@ -4,6 +4,9 @@
  * 覆盖票面文化层 ①~⑩：T3 零宽滤除 / T2 同行交叠 x 并集 / T5 同位重复并入 /
  * T4 负间隙钳制 / INV-A 混合族两两分离 / 单块恒等+空数组透传 / 幂等 /
  * 高瘦免疫+紧行距不误并 / 排序确定性 / 混排字号中位数。
+ * [F-A4 改向] ⑪⑫：INV-40 紧行距边界修复（聚类容差行高感知——可选 lineH
+ * 参与容差 min(hNew,hRowMedian,lineH)/2 钳制，缺省旧行为存档）+lineH
+ * 恒等/幂等（过大 lineH 不收紧）。修订依据=F-A4 票面 §0b①。
  * 夹具数值参照取证基线 scripts/audits/audit0-out/audit0-p1b.json（像素域实锤
  * 折算归一化域）。中位数=排序后下中位（索引 floor((n-1)/2)，票面主控预裁）。
  * always-active（ADR-0017 裁决 3 新测试不经 guardedDescribe）。
@@ -167,4 +170,37 @@ describe('F-A1 mergeRects —— 归一化域归并器', () => {
     // 中心 y 下中位 0.206 → y = 0.206 - 0.004
     expect(out[0]!.y).toBeCloseTo(0.202, 10)
   })
+
+  it('⑪ INV-40 边界修复（F-A4 行高感知）：紧行距中心距 ≤ 输入块高/2（旧路径误并）但 > PDF 行高/2 → lineH 传入不并簇；缺省旧行为存档', () => {
+    // 紧行距形态：输入 rect 高=CSS 回退行盒（可膨胀至 PDF 行高 ~1.25 倍），
+    // 相邻行中心距 0.009——旧行为 min(h)/2=0.01 容差下跨行并簇成单高块
+    //（INV-40 登记册边界）；行高感知容差 min(h,h,lineH)/2=0.008 < 0.009 → 分行
+    const upper = rect(0.1, 0.2, 0.4, 0.02)
+    const lower = rect(0.1, 0.209, 0.4, 0.02)
+    // 缺省（无行高数据——旧库/不可量测环境）：边界行为原样存档（1 块）
+    expect(mergeRects([upper, lower]).length).toBe(1)
+    // lineH=PDF 行高 0.016（< 输入 h 0.02——回退度量膨胀差）：不并簇
+    const out = mergeRects([upper, lower], 0.016)
+    expect(out.length).toBe(2)
+    // INV-D 钳制仍生效：负间隙（0.229 底 > 0.209 顶）推至恰好接触
+    expect(out[1]!.y).toBeCloseTo(out[0]!.y + out[0]!.h, 10)
+    expectPairwiseDisjoint(out)
+  })
+
+  it('⑫ lineH 恒等钳制（过大不收紧）+行高感知幂等：已归并输入值不变', () => {
+    const mixed = [
+      rect(0.5, 0.302, 0.2, 0.02),
+      rect(0, 0.2, 0, 0.021),
+      rect(0.35, 0.2, 0.2, 0.02),
+      rect(0.05, 0.249, 0.3, 0.02),
+      rect(0.1, 0.2, 0.3, 0.02),
+      rect(0.12, 0.2006, 0.28, 0.02)
+    ]
+    // lineH 远超块高（min 钳制恒等——不可量测环境的防御方向）
+    expect(mergeRects(mixed, 10)).toEqual(mergeRects(mixed))
+    // 行高感知幂等（F-A4：合法 lineH<h 下已归并产物再入不动）
+    const once = mergeRects(mixed, 0.016)
+    const twice = mergeRects(once, 0.016)
+    expect(twice).toEqual(once)
+  })
 })
diff --git a/tests/unit/renderer/selection-layer.test.tsx b/tests/unit/renderer/selection-layer.test.tsx
index 85dd3ecb8..f03f06869 100644
--- a/tests/unit/renderer/selection-layer.test.tsx
+++ b/tests/unit/renderer/selection-layer.test.tsx
@@ -7,10 +7,11 @@
  * 工具条落点以选区所在页盒为参照系（坐标换算经页盒 rect——N-C 防层叠污染）/
  * 保存页=选区所在页（0 基，动态推导）/Escape 清/承载选区的页 DOM 卸载
  * （页回收与 zoom 重建同机制）→选区清空防悬空锚/纯函数页盒遍历。
- * [SR2-F-08] 自绘层防回归守卫（ADR-0019 划选视觉回退原生 ::selection）：
- * pending 态（mouseup 后工具条在场）selRects() 恒 null——视觉通道=浏览器
- * 原生 ::selection，禁回归自绘路线；原 F-07b（pending null→层不渲染）测点
- * 随 SelectionRects 组件消亡删除。
+ * [F-A4 改向] P1 定位断言改归一坐标（工具条 left/top=视口差×
+ * clientWidth/gBCR.width 比值——c 面坐标系双重放大缺陷的红证锚）；
+ * F-08 守卫反转（ADR-0019 R1 修订：划选视觉=自绘并集层，::selection
+ * transparent——原「pending 态 selRects 恒 null」防自绘回归守卫反转为
+ * 自绘层在场断言；修订依据=F-A4 票面 §0a 用户根治令）。
  * always-active（ADR-0017 裁决 3 新测试不经 guardedDescribe）。
  */
 import { act } from 'react'
@@ -94,8 +95,9 @@ async function mountLayer(pageRoot: HTMLElement): Promise<void> {
 
 const toolbar = (): HTMLElement | null => host?.querySelector<HTMLElement>('[data-testid="selection-toolbar"]') ?? null
 
-/** 自绘选区覆盖层查询（F-08 起恒 null——防回归自绘路线的守卫探针） */
-const selRects = (): HTMLElement | null => host?.querySelector<HTMLElement>('[data-testid="selection-rects"]') ?? null
+/** 自绘选区并集层查询（F-A4 起 portal 渲染进选区所在页盒——document 级查询；
+ *  R1 修订后=pending 态应在场，S5 语义断言归 selection-paint.test） */
+const selRects = (): HTMLElement | null => document.querySelector<HTMLElement>('[data-testid="selection-rects"]') ?? null
 
 beforeEach(() => {
   vi.useFakeTimers()
@@ -154,8 +156,11 @@ describe('SelectionLayer 纯函数（F-02 页盒遍历）', () => {
 })
 
 describe('SelectionLayer 动态锚定根（选区态状态机）', () => {
-  it('P1 挂载盒≠选区页仍正确（F-01 自裁 4 中间态解除）：防抖路径工具条出现+坐标经页盒换算', async () => {
+  it('P1 挂载盒≠选区页仍正确（F-01 自裁 4 中间态解除）：防抖路径工具条出现+坐标经页盒换算并÷有效 zoom（F-A4 c 面归一）', async () => {
     const { page1, span2 } = mountColumnFixture()
+    // [F-A4] mount 有效 zoom 桩：clientWidth 480/gBCR 600=0.8（ui-scale/CSS
+    // zoom 子树内的挂载盒——修前 gBCR 视口差直写 left/top 被再放大 1.25 倍）
+    Object.defineProperty(page1, 'clientWidth', { value: 480, configurable: true })
     await mountLayer(page1)
     // 选区在页 2（挂载盒=页 1）——旧「固定锚定页」实现在此静默收起
     selectRange(span2.firstChild!, 0, span2.firstChild!, 4)
@@ -165,9 +170,10 @@ describe('SelectionLayer 动态锚定根（选区态状态机）', () => {
     })
     const bar = toolbar()
     expect(bar).not.toBeNull()
-    // 落点以选区所在页盒为参照系（N-C）：页内偏移 (10, 900-812-42=46)+页间偏移 812
-    expect(bar!.style.left).toBe('10px')
-    expect(bar!.style.top).toBe('858px')
+    // 落点以选区所在页盒为参照系（N-C）：视口域 x=10/y=858（900−812−42+812）
+    // →÷zoom 归一到挂载盒本地（×0.8）——8/686.4
+    expect(parseFloat(bar!.style.left)).toBeCloseTo(8, 2)
+    expect(parseFloat(bar!.style.top)).toBeCloseTo(686.4, 1)
     expect(toastSpy).not.toHaveBeenCalled()
   })
 
@@ -310,7 +316,7 @@ describe('SelectionLayer 动态锚定根（选区态状态机）', () => {
     expect(toastSpy).not.toHaveBeenCalled()
   })
 
-  it('F-08 守卫：pending 态（mouseup 后工具条在场）不渲染自绘层——selRects() 恒 null（防回归自绘路线）', async () => {
+  it('F-A4 守卫（反转）：pending 态（mouseup 后工具条在场）自绘并集层在场——ADR-0019 R1 修订', async () => {
     const { page1, span2 } = mountColumnFixture()
     await mountLayer(page1)
     selectRange(span2.firstChild!, 0, span2.firstChild!, 4)
@@ -318,7 +324,9 @@ describe('SelectionLayer 动态锚定根（选区态状态机）', () => {
       fireMouseUp()
     })
     expect(toolbar()).not.toBeNull()
-    // 划选视觉=原生 ::selection（ADR-0019）——自绘层一旦回归此守卫即红
-    expect(selRects()).toBeNull()
+    // 划选视觉=自绘并集层（F-A4/ADR-0019 R1 修订：::selection transparent，
+    // 单层单绘不叠深；原 0.20 双通道叠深缺陷的根治）——层缺位即红
+    expect(selRects()).not.toBeNull()
+    expect(document.querySelectorAll('[data-testid="selection-rect"]').length).toBeGreaterThanOrEqual(1)
   })
 })
diff --git a/tests/unit/renderer/selection-paint.test.tsx b/tests/unit/renderer/selection-paint.test.tsx
new file mode 100644
index 000000000..37796cc6e
--- /dev/null
+++ b/tests/unit/renderer/selection-paint.test.tsx
@@ -0,0 +1,366 @@
+// @vitest-environment jsdom
+/**
+ * [F-A4] selection-paint —— 选区视觉并集自绘+标注贴行自适应+工具条定位
+ * 归一（票面 §5 文化层新测试，always-active——ADR-0017 裁决 3 不经
+ * guardedDescribe）。
+ *
+ * 覆盖三面：
+ * - a 面（S1~S5）：拖选防抖路径自绘并集层渲染（相邻行重叠输入→块数=行数
+ *   +块两两垂直分离=「单层单绘不叠深」）+保存 rects 与自绘块同源（所见即
+ *   所存 S2）+Escape 工具条收而自绘留至选区真清（INV-37 修订语义 S5）；
+ * - b 面：rectStyle band 自适应（顶贴字形带顶/底贴底——F-11 分数语义的
+ *   自适应实现）+缺省 band 分数路径回归锚+bandFromMetrics 纯几何+
+ *   AnnotationLayer 挂 B 接线（resolve→band→渲染）；
+ * - c 面：定位差值÷有效 zoom（clientWidth/gBCR.width 归一）+滚动容器
+ *   可视区夹取+选区近顶下翻转。
+ * 形态 crib selection-layer.test.tsx（jsdom 指令/api mock/rects 桩表/
+ * getClientRects 桩——多行夹具经 Range.getClientRects 注入）。
+ */
+import { act } from 'react'
+import { createRoot, type Root } from 'react-dom/client'
+import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
+import { SelectionLayer } from '../../../src/renderer/features/reader/SelectionLayer'
+import { AnnotationLayer } from '../../../src/renderer/features/reader/AnnotationLayer'
+import { rectStyle } from '../../../src/renderer/features/reader/annotation-style'
+import { bandFromMetrics } from '../../../src/renderer/features/reader/annotation-resolve'
+import type { Annotation, AnnotationRect } from '@shared/models/annotation'
+
+const { toastSpy, saveMock } = vi.hoisted(() => ({ toastSpy: vi.fn(), saveMock: vi.fn() }))
+vi.mock('../../../src/renderer/shared/ui/Toast', () => ({ showToast: toastSpy }))
+vi.mock('../../../src/renderer/api/client', () => ({
+  api: { reader: { saveAnnotation: saveMock } },
+  unwrap: async (p: Promise<{ ok: boolean; data: unknown }>): Promise<unknown> => {
+    const r = await p
+    return r.data
+  },
+  ApiClientError: class extends Error {}
+}))
+
+/** jsdom 无布局：元素 rect 按预设表返回 */
+const rects = new Map<Element, { x: number; y: number; width: number; height: number }>()
+/** Range 客户端矩形桩（多行选区夹具的输入面——视口坐标） */
+let clientRects: Array<{ x: number; y: number; width: number; height: number }> = []
+/** 选区 range rect 桩（工具条定位输入——视口坐标） */
+let rangeRect = { x: 10, y: 900, width: 200, height: 20 }
+let origRangeGBCR: (() => DOMRect) | undefined
+let origRangeGCR: (() => DOMRectList) | undefined
+
+/** 单页夹具：页盒（data-page-root）+textLayer+单 span；rect 桩按参数注入 */
+function makePage(no: string, box: { x: number; y: number; width: number; height: number }, text: string): { page: HTMLElement; textLayer: HTMLElement; span: HTMLElement } {
+  const page = document.createElement('div')
+  page.setAttribute('data-page-root', no)
+  const textLayer = document.createElement('div')
+  textLayer.className = 'textLayer'
+  const span = document.createElement('span')
+  span.textContent = text
+  textLayer.appendChild(span)
+  page.appendChild(textLayer)
+  rects.set(page, box)
+  rects.set(textLayer, box)
+  return { page, textLayer, span }
+}
+
+function selectRange(startNode: Node, startOff: number, endNode: Node, endOff: number): void {
+  const sel = window.getSelection()
+  const range = document.createRange()
+  range.setStart(startNode, startOff)
+  range.setEnd(endNode, endOff)
+  sel?.removeAllRanges()
+  sel?.addRange(range)
+}
+
+const fireSelectionChange = (): void => {
+  document.dispatchEvent(new Event('selectionchange'))
+}
+const fireMouseUp = (): void => {
+  document.dispatchEvent(new MouseEvent('mouseup'))
+}
+
+let root: Root | null = null
+let host: HTMLDivElement | null = null
+let onSaved: ReturnType<typeof vi.fn>
+
+async function mountLayer(pageRoot: HTMLElement): Promise<void> {
+  host = document.createElement('div')
+  document.body.appendChild(host)
+  root = createRoot(host)
+  await act(async () => {
+    root?.render(<SelectionLayer pageRoot={pageRoot} paperId="p-1" page={0} onSaved={onSaved} />)
+  })
+}
+
+const toolbar = (): HTMLElement | null => host?.querySelector<HTMLElement>('[data-testid="selection-toolbar"]') ?? null
+/** 自绘层经 portal 渲染进选区所在页盒（宿主树外）——document 级查询 */
+const paintLayer = (): HTMLElement | null => document.querySelector<HTMLElement>('[data-testid="selection-rects"]')
+const paintBlocks = (): HTMLElement[] => Array.from(document.querySelectorAll<HTMLElement>('[data-testid="selection-rect"]'))
+
+/** 内联百分比数值（top/height/left——几何断言共用） */
+const pct = (el: HTMLElement, prop: 'top' | 'height' | 'left' | 'width'): number => parseFloat(el.style[prop])
+
+beforeEach(() => {
+  vi.useFakeTimers()
+  vi.clearAllMocks()
+  rects.clear()
+  clientRects = []
+  rangeRect = { x: 10, y: 900, width: 200, height: 20 }
+  onSaved = vi.fn()
+  ;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
+  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
+    const r = rects.get(this)
+    return { x: r?.x ?? 0, y: r?.y ?? 0, width: r?.width ?? 0, height: r?.height ?? 0 } as DOMRect
+  })
+  origRangeGBCR = Range.prototype.getBoundingClientRect as () => DOMRect
+  Range.prototype.getBoundingClientRect = () => ({ ...rangeRect }) as DOMRect
+  origRangeGCR = Range.prototype.getClientRects as () => DOMRectList
+  Range.prototype.getClientRects = (() => clientRects.map((r) => ({ ...r, toJSON: () => r }))) as unknown as () => DOMRectList
+  window.getSelection()?.removeAllRanges()
+})
+
+afterEach(() => {
+  act(() => {
+    root?.unmount()
+  })
+  root = null
+  host?.remove()
+  host = null
+  if (origRangeGBCR !== undefined) Range.prototype.getBoundingClientRect = origRangeGBCR
+  if (origRangeGCR !== undefined) Range.prototype.getClientRects = origRangeGCR
+  document.body.innerHTML = ''
+  vi.restoreAllMocks()
+  vi.useRealTimers()
+})
+
+describe('F-A4 a 面 —— 自绘并集层（单层单绘不叠深）', () => {
+  it('S1 拖选防抖路径渲染自绘层：跨 3 行重叠输入（行间 4px 垂直重叠）→块数=行数+两两垂直分离+色 rgba(0,0,0,0.2)', async () => {
+    const { page, span } = makePage('1', { x: 100, y: 200, width: 600, height: 800 }, 'alpha beta gamma delta')
+    document.body.appendChild(page)
+    await mountLayer(page)
+    // 相邻行盒 4px 垂直重叠（重叠率 0.2<0.25 行间判别带）——CSS 回退度量下
+    // native ::selection 会 0.20×2 叠深的输入形态
+    clientRects = [
+      { x: 100, y: 200, width: 300, height: 20 },
+      { x: 100, y: 216, width: 280, height: 20 },
+      { x: 100, y: 232, width: 260, height: 20 }
+    ]
+    selectRange(span.firstChild!, 0, span.firstChild!, 4)
+    fireSelectionChange()
+    await act(async () => {
+      await vi.advanceTimersByTimeAsync(200)
+    })
+    expect(paintLayer()).not.toBeNull()
+    const blocks = paintBlocks()
+    expect(blocks.length).toBe(3)
+    for (const b of blocks) {
+      expect(b.style.background).toBe('rgba(0, 0, 0, 0.2)')
+    }
+    // 归并后行间钳制：按 top 排序两两 bottom ≤ next.top+1e-9（输入重叠被
+    // 消除——「重叠部分渲染不加深」的构造性保证）
+    const byTop = [...blocks].sort((a, b) => pct(a, 'top') - pct(b, 'top'))
+    for (let i = 1; i < byTop.length; i += 1) {
+      expect(pct(byTop[i - 1]!, 'top') + pct(byTop[i - 1]!, 'height')).toBeLessThanOrEqual(pct(byTop[i]!, 'top') + 1e-9)
+    }
+  })
+
+  it('S2 所见即所存：保存 rects 与自绘块同源（块数/left/top 一致——同一 evaluate 管线产物）', async () => {
+    const { page, span } = makePage('1', { x: 100, y: 200, width: 600, height: 800 }, 'alpha beta gamma delta')
+    document.body.appendChild(page)
+    await mountLayer(page)
+    clientRects = [
+      { x: 100, y: 200, width: 300, height: 20 },
+      { x: 100, y: 216, width: 280, height: 20 },
+      { x: 100, y: 232, width: 260, height: 20 }
+    ]
+    selectRange(span.firstChild!, 0, span.firstChild!, 4)
+    act(() => {
+      fireMouseUp()
+    })
+    const blocks = paintBlocks()
+    const saved: Annotation = {
+      id: 'a-1', paperId: 'p-1', page: 0, kind: 'highlight', color: 'yellow',
+      quoteText: 'alph', prefixText: '', suffixText: '', startOffset: 0, endOffset: 4,
+      rects: [], comment: '', createdAt: '2026-08-31T00:00:00Z', updatedAt: '2026-08-31T00:00:00Z'
+    }
+    saveMock.mockResolvedValue({ ok: true, data: saved })
+    await act(async () => {
+      const highlight = Array.from(toolbar()!.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent === '高亮')!
+      highlight.click()
+      await vi.advanceTimersByTimeAsync(0)
+    })
+    const arg = saveMock.mock.calls[0]![0] as { annotation: { rects: AnnotationRect[] } }
+    expect(arg.annotation.rects.length).toBe(blocks.length)
+    for (let i = 0; i < blocks.length; i += 1) {
+      expect(pct(blocks[i]!, 'left')).toBeCloseTo(arg.annotation.rects[i]!.x * 100, 6)
+      expect(pct(blocks[i]!, 'top')).toBeCloseTo(arg.annotation.rects[i]!.y * 100, 6)
+    }
+    // 保存落地即清（选区 removeAllRanges 同步语义）
+    expect(paintLayer()).toBeNull()
+  })
+
+  it('S5 Escape：工具条收而自绘层保留；选区真清除（坍缩+selectionchange）→自绘随清（INV-37 视觉-状态严格同步）', async () => {
+    const { page, span } = makePage('1', { x: 100, y: 200, width: 600, height: 800 }, 'alpha beta gamma delta')
+    document.body.appendChild(page)
+    await mountLayer(page)
+    clientRects = [{ x: 100, y: 200, width: 300, height: 20 }]
+    selectRange(span.firstChild!, 0, span.firstChild!, 4)
+    act(() => {
+      fireMouseUp()
+    })
+    expect(toolbar()).not.toBeNull()
+    expect(paintLayer()).not.toBeNull()
+    act(() => {
+      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
+    })
+    expect(toolbar()).toBeNull()
+    expect(paintLayer()).not.toBeNull()
+    window.getSelection()?.removeAllRanges()
+    fireSelectionChange()
+    await act(async () => {
+      await vi.advanceTimersByTimeAsync(200)
+    })
+    expect(paintLayer()).toBeNull()
+  })
+})
+
+describe('F-A4 b 面 —— rectStyle 行盒自适应（band）', () => {
+  it('band 在场：highlight 顶=band.top、高=band.bottom−band.top（顶贴字形顶缘底贴底缘）', () => {
+    const r: AnnotationRect = { page: 0, x: 0.1, y: 0.2, w: 0.3, h: 0.02 }
+    const s = rectStyle('highlight', 'yellow', r, { top: 0.205, bottom: 0.238 })
+    expect(parseFloat(s.top as string)).toBeCloseTo(20.5, 6)
+    expect(parseFloat(s.height as string)).toBeCloseTo(3.3, 6)
+  })
+
+  it('band 在场：underline 实条贴 band.bottom 上方 2px（calc 形态）', () => {
+    const r: AnnotationRect = { page: 0, x: 0.1, y: 0.2, w: 0.3, h: 0.02 }
+    const s = rectStyle('underline', 'yellow', r, { top: 0.205, bottom: 0.238 })
+    expect(s.top).toBe('calc(23.8% - 2px)')
+    expect(s.height).toBe('2px')
+  })
+
+  it('band 缺省：F-11 分数路径原样（回归锚——存量 rects 无 band 时的兜底）', () => {
+    const r: AnnotationRect = { page: 0, x: 0.1, y: 0.2, w: 0.3, h: 0.02 }
+    const s = rectStyle('highlight', 'yellow', r)
+    expect(parseFloat(s.top as string)).toBeCloseTo(20.2, 6)
+    expect(parseFloat(s.height as string)).toBeCloseTo(1.56, 6)
+  })
+
+  it('bandFromMetrics 纯几何：span 盒+字体度量→归一化字形带（fs<布局带高时半前导为负——基线随 CSS 负前导下沉）', () => {
+    const band = bandFromMetrics(
+      { x: 100, y: 200, w: 300, h: 16 },
+      16,
+      { ascent: 12, descent: 4, fontAscent: 14, fontDescent: 4 },
+      { x: 100, y: 200, w: 600, h: 800 }
+    )
+    expect(band).not.toBeNull()
+    // 半前导=(16−18)/2=−1（内容区溢出行盒，负值不钳 0——钳 0 即带整体下偏
+    // 1px，真机 diag 实锤方向）；基线=200−1+14=213；带 [201,217]→[0.00125,0.02125]
+    expect(band!.top).toBeCloseTo(0.00125, 10)
+    expect(band!.bottom).toBeCloseTo(0.02125, 10)
+    expect(band!.center).toBeCloseTo(0.01125, 10)
+  })
+
+  it('AnnotationLayer 挂 B 接线：resolve→band 匹配→渲染顶/高=band 值（非 F-11 分数）', async () => {
+    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback): number => {
+      cb(0)
+      return 0
+    })
+    const { page, span } = makePage('1', { x: 0, y: 0, width: 600, height: 800 }, 'SMART WATER TEST DOC')
+    document.body.appendChild(page)
+    // span 实测盒（b② 行盒量测源——bandFromMetrics 输入；与 textLayer 盒同坐标系）
+    rects.set(span, { x: 30, y: 200, width: 300, height: 16 })
+    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
+      font: '',
+      measureText: () => ({
+        actualBoundingBoxAscent: 12,
+        actualBoundingBoxDescent: 4,
+        fontBoundingBoxAscent: 14,
+        fontBoundingBoxDescent: 4
+      })
+    } as unknown as CanvasRenderingContext2D)
+    const ann: Annotation = {
+      id: 'a-1', paperId: 'p-1', page: 0, kind: 'highlight', color: 'yellow',
+      quoteText: 'SMART WATER TEST DOC', prefixText: '', suffixText: '', startOffset: 0, endOffset: 20,
+      rects: [{ page: 0, x: 0.05, y: 0.25, w: 0.5, h: 0.02 }], comment: '',
+      createdAt: '2026-08-31T00:00:00Z', updatedAt: '2026-08-31T00:00:00Z'
+    }
+    const h2 = document.createElement('div')
+    document.body.appendChild(h2)
+    const r2 = createRoot(h2)
+    await act(async () => {
+      r2.render(<AnnotationLayer annotations={[ann]} page={0} pageRoot={page} onChanged={() => undefined} />)
+    })
+    const block = h2.querySelector<HTMLElement>('[data-testid="annotation-rect"]')
+    expect(block).not.toBeNull()
+    // span 盒 (30,200,300,16)——重锚 resolve 后 band 匹配：半前导 −1→基线 213
+    // →顶 201/800=25.125%/高 16/800=2%（F-11 分数路径=顶 25.2%/高 1.56%——可区分）
+    expect(pct(block!, 'top')).toBeCloseTo(25.125, 4)
+    expect(pct(block!, 'height')).toBeCloseTo(2, 4)
+    act(() => {
+      r2.unmount()
+    })
+    h2.remove()
+    vi.unstubAllGlobals()
+  })
+})
+
+describe('F-A4 c 面 —— 工具条定位归一（÷有效 zoom+视口夹取+近顶下翻转）', () => {
+  /** 滚动容器夹具：scroller(overflow-auto) > mount > page1（页盒）；rects 桩 */
+  function makeScrollerFixture(mountBox: { x: number; y: number; width: number; height: number }): HTMLElement {
+    const scroller = document.createElement('div')
+    scroller.className = 'overflow-auto'
+    const mount = document.createElement('div')
+    scroller.appendChild(mount)
+    document.body.appendChild(scroller)
+    rects.set(scroller, { x: 0, y: 600, width: 1200, height: 500 })
+    rects.set(mount, mountBox)
+    return mount
+  }
+
+  it('归一：mount 有效 zoom=0.8（clientWidth 480/gBCR 600）→工具条 left/top=视口差×0.8', async () => {
+    const mount = makeScrollerFixture({ x: 0, y: 600, width: 600, height: 2000 })
+    Object.defineProperty(mount, 'clientWidth', { value: 480, configurable: true })
+    const { page, span } = makePage('1', { x: 0, y: 620, width: 600, height: 800 }, 'alpha beta')
+    mount.appendChild(page)
+    await mountLayer(mount)
+    rangeRect = { x: 10, y: 630, width: 200, height: 20 }
+    selectRange(span.firstChild!, 0, span.firstChild!, 4)
+    act(() => {
+      fireMouseUp()
+    })
+    const bar = toolbar()
+    expect(bar).not.toBeNull()
+    expect(parseFloat(bar!.style.left)).toBeCloseTo(8, 2)
+    // 选区顶距 scroller 顶 30px<42 → 翻转到选区下方：y_vp=630+20+8=658→(658−600)×0.8=46.4
+    expect(parseFloat(bar!.style.top)).toBeCloseTo(46.4, 1)
+  })
+
+  it('近顶下翻转：选区顶距滚动容器顶 <42px →工具条放选区下方（top ≥ 选区底）', async () => {
+    const mount = makeScrollerFixture({ x: 0, y: 600, width: 1200, height: 2000 })
+    const { page, span } = makePage('1', { x: 0, y: 620, width: 600, height: 800 }, 'alpha beta')
+    mount.appendChild(page)
+    await mountLayer(mount)
+    rangeRect = { x: 10, y: 630, width: 200, height: 20 }
+    selectRange(span.firstChild!, 0, span.firstChild!, 4)
+    act(() => {
+      fireMouseUp()
+    })
+    const bar = toolbar()
+    expect(bar).not.toBeNull()
+    // 翻转后 y_vp=658；选区底 650——工具条顶 58（mount 本地）≥ 选区底本地 50
+    expect(parseFloat(bar!.style.top)).toBeCloseTo(58, 6)
+  })
+
+  it('视口夹取：选区右缘越滚动容器右缘 → left 夹到容器内（1200−180=1020）', async () => {
+    const mount = makeScrollerFixture({ x: 0, y: 600, width: 1200, height: 2000 })
+    const { page, span } = makePage('1', { x: 0, y: 620, width: 600, height: 800 }, 'alpha beta')
+    mount.appendChild(page)
+    await mountLayer(mount)
+    rangeRect = { x: 1150, y: 1000, width: 200, height: 20 }
+    selectRange(span.firstChild!, 0, span.firstChild!, 4)
+    act(() => {
+      fireMouseUp()
+    })
+    const bar = toolbar()
+    expect(bar).not.toBeNull()
+    expect(parseFloat(bar!.style.left)).toBeCloseTo(1020, 6)
+  })
+})

```

## 输出纪律(必读)

先统计行「B:N/W:N/N:N+总评一句」;逐条展开引证据(文件/断言 id/行);末行放行判定(放行/回炉+回炉点);200 行内;异基座读不了盘——结论只能来自本材料包;不确定写存疑。
