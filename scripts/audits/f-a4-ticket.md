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
- 真机探针 scripts/audits/f-a4-verify.mjs(先核撞名):**用户实况 large 档**真实库——修前三现象基线取证(数值)→修后复测:①多行拖选自绘块无叠深(相邻块两两相交面积=0,crib INV-40 判据);②[W2 修订 2026-08-31,门一回炉+主控裁决]保存标注渲染贴行**双基准**:黄块(标注)=字形墨带基准——块顶对行簇 span 盒顶 ≤2px+块底落 [−1,+3]px desc 尾界;灰块(自绘)=行盒并集基准;黄 vs 灰 top/height 差 ≤4px **上界断言**(两基准有意几何差防退化,门一实测 3.87 入界);原文「与自绘块对齐(同文字行簇 top/height 偏差≤2px)」废止——黄/灰两有意几何的直差不可用单一 2px 判;③工具条 bounding 在滚动容器可视区内且距选区顶<60px;④S6 三档/缩放稳定;⑤pageerror 0。

## 6. 证据与报告契约(实现者)

- impl 报告 scripts/audits/f-a4-impl.report.md:三面×根因×修法对照+自裁申报+**数字全部 wc/实测后落笔**(F-R1 教训)+diff 自查+成本;受锁改写逐文件列明理由。
- 禁 git/registry/locks 命令;卡住停手;红→绿→变异红证。
