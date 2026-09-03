# F-A6 设计文档：划选渲染错乱（D1）+ 拖选卡顿（D2）根治

路径：`docs/design/2026-09-03_f-a6-selection-root-fix.md` · 日期 2026-09-03 · 状态：**取证毕（2026-09-04 F-A6-a）——路线裁定 R-迁移为主修（阶段化决策门：阶段1 T1/T9 duckViewport 前置修复→阶段2 复跑 A/B 对照确认 S1/S2 消除→阶段3 主链迁移）+G2 偏离率≥5%（右溢支占位）+tick 基线 5Hz 实测在档；裁决表=scripts/audits/f-a6-forensic-verdict.md（门一 Kimi PWW+门二 deepseek PWW 双档处置在 §9-7/8）；真实库 46 页 T1/T9 零触发（合成 S1/S2 量化闭合）、真实样本甲乙同净、用户实报重形态未复现（证据降级+验收条件随票流转）——下一步=F-A6-b（阶段1 起步）** · 全链审查闭合+用户四点裁决在档（2026-09-03 在场轮：旋转页纳入/INV-37 拖选期弱化允许/停顿出条+C 备案默认确认）：GLM 同源预审[欠账轮]→Kimi 一轮拟定裁决[三前置+六改写落入]→deepseek 一轮[5W4N 落入]→用户几何源迁移提案并入→Kimi 二轮增量[采纳+C1~C7 落入+T9 新立案+T1 机理证实]→deepseek 终位[3W2N 落入：C1 票面宿主/T9 修复权属/双路线贯通 settle 权威+INV-58 同族禁令]→GLM5.3 终裁 · 上游：tickets/registry.ts:242 · 涉修订：ADR-0019 R3、INV-37 条款（拖选期弱化=显式代价）、新 INV-58 · 审查档：scripts/audits/f-a6-design-review.md+f-a6-design-r3.raw.txt+f-a6-design-ds.raw.txt+f-a6-geom-kimi.raw.txt+f-a6-geom-ds.raw.txt（设计链五份）+f-a6-forensic-g1.raw.txt+f-a6-forensic-g2.raw.txt（取证门审两份）

## §0 一页纸决策摘要

**病根判定（源码级核实，详 §2/§3）**

- **D1（划选灰块锯齿拼接+右侧溢出）**：几何源头=Range clientRects 在异常 text-layer 上本身错，再经 `mergeLineRects` 聚类判据放大——三个子机理全部代码级证实为高概率（高度可比带拆簇/只与末簇比较失联/pitch 估计污染），跨行误并簇的 x 并集=右溢主链；**待证候选 T1=页旋转 /Rotate≠0**：嫌疑源自 TextLayer/PdfPageCanvas 的旋转坐标系处置（证据档不在本设计包内，F-A6-a 取证票先行行级复核后入档）；其预期病象（整片错位）与用户实报（锯齿+右溢）形态不吻合，列取证矩阵平等项，不预选。markedContent/endOfContent 两候选中 endOfContent **证伪**（无文本且 user-select:none），markedContent **预判证伪待核**（getTextContent 调用面在包外——取证票 grep+运行时探针双证后定谳）。
- **D2（拖选一卡一卡）**：三候选全部或大部证实——(a) 200ms 节流窗=拖选期视觉恰 5Hz 步进（直接体感来源）；(b) 每视觉 tick 走全量 evaluate：全页 TreeWalker×2 + O(页文本) 字符串构建×3 + 几何管线整体×2（第二次产物逐位相同=纯冗余）+ 每 span 双 getComputedStyle+canvas measureText；(c) setPaint 恒新对象→portal 全子树重渲染为次因（React 有 key 复用非整拆，但无 memo）。强制 layout ≈1 次/tick（非抖动型）——**卡顿主因=粒度+CPU 冗余，非 layout 抖动**。
- **正交性声明**：D1 管线加固是三案公共面（几何源头修复，与视觉通道选择无关）；三案对比只决 D2 通道与调度。
- **D1 修复双路线（用户提案 2026-09-03 在场轮并入）**：R-加固=修聚类判据（对 DOM 量测噪声做更稳健的解读）；R-**几何源迁移**=矩形来源从「Range.getClientRects 量测回退字体排布盒」改为「**PDF 项声明几何**」（PdfTextItem 自带 width/height/transform——PdfPageCanvas.tsx:39-41 在档，pdf.js 定位 span 用的正是这份数据；项矩形=嵌入字体度量下的真值，按构造无测量噪声）。迁移直接消灭 D1 病根族（锯齿=聚类噪声/右溢=span 盒宽≠墨宽/band 错绑=回退字体推算/旋转=项变换天然含旋转[仅矩形半边，span 定位半边仍需 T1 通道]），且缩放不变（zoom 零重算）+跨会话稳定（重锚几何不随字体环境漂移）。**取舍**：项内部分边界（选中起于项中间）需按字符比例细分（误差被真值项包络兜住=右溢结构性消灭）；偏移映射仍需 DOM 文本层（手势面不变）；按行并块逻辑保留但聚类可信输入。**路线选择由 F-A6-a 取证 A/B 对照裁定**（§2.2）：项矩形干净而 DOM 矩形锯齿→迁移为主修、聚类加固降为回退；否则维持 R-加固。

**三案一表**

| 维度 | A 纯原生 ::selection | B 自绘层优化（拆拖选快路径） | C 混合（拖选原生+settle 自绘接管） |
|---|---|---|---|
| R1 根治保持（重叠不叠深） | **回退**（R1 修订案整体推翻） | 保持（全程自绘单层单绘） | 静态保持；**拖选期瞬时叠深 0.36 复现** |
| 所见即所存 INV-37 | 违反（视觉≠保存 rects） | **拖选期弱化为「所见≈所存」**（快路径同一几何管线+四道守卫；松手/保存时刻恢复严格所见即所存——settle 全量单一权威；§6 R3⑤ 显式登记） | 需 R3 语义切分（拖选期豁免） |
| 拖选流畅度 | 零 JS，完美 | rAF 对齐 60Hz，快路径亚毫秒~2ms | 零 JS，完美 |
| 异常 PDF 正确性 | 视觉随 span（错也照显）；保存 rects 仍错 | 同左（D1 公共面修复后两者皆正） | 同左 |
| INV/ADR 修订面 | 最大（INV-37 重写+R3=回退令） | 小（INV-37 调度条款+INV-58 新增） | 中大（INV-37 双通道语义+通道切换态新增） |
| 受锁守卫配套 | e2e F-06 C 节+unit S 系大改写 | S1b/S1c 两 it+annotation-anchor 若干 it | A 的全部+切换时序新 it |
| 代码组织红线 | 删 selection-paint（净减） | SelectionLayer 249→~195（本就贴 250 红线，必拆） | A 面+新增切换状态机 |
| 实现风险/回滚面 | 推翻用户根治令历史 | 小（settle 路径语义零变） | **切换接缝新 bug 类**（本仓五轮事故同族） |

**推荐=B**。代价：受锁两文件改写（划选域受锁改写先例在档——F-06/F-07/F-08/F-A4 四轮，git log --grep='locked-change' -- tests/ 可查）+新模块一件+**INV-37 拖选期语义弱化（见 §6 R3⑤）**。**用户拍板四点（已裁决 2026-09-03 在场轮）**：①拖选中停顿 >200ms 出工具条既有语义**保持零变**；②旋转页修复**纳入本票** D1 公共面（T1 机理已源码级证实——见 §2.1，触发归属待探针；T9 同批复核）；③C 案仅备案不与 B 并生；④**允许 INV-37 拖选期由「所见即所存」弱化为「所见≈所存」**（松手/保存时刻严格恢复——B 案成立的显式代价）。

## §1 态空间表：划选视觉反馈全生命周期

现行实现单通道（::selection 恒 transparent，视觉=SelectionPaint 自绘层）；调度三路=节流视觉（leading+trailing 200ms）/防抖 settle（200ms）/mouseup 即时全量（SelectionLayer.tsx:149-175）。

| 态 | 触发 | 视觉通道表现 | 数据源 | 调度路径 |
|---|---|---|---|---|
| S0 无选区 | 初始/选区坍缩 | 无层（paint=null） | — | evaluate 收敛分支（SelectionLayer.tsx:102-105） |
| S1 拖选中·持续变更 | selectionchange 连发 | 自绘层 5Hz 步进跟随 | evaluate(visualOnly) 产 rects+bands | 节流 leading+trailing（selection-geometry.ts:114-129） |
| S1' 拖选中·停顿 >200ms | 拖选停顿（无 mouseup） | 层稳定+**工具条提前弹出**（既有语义，S1b 后半断言在档） | evaluate 全量产 pending | settle 防抖（:130-131） |
| S2 松手已定 | mouseup（位移 ≥3px） | 层+工具条 | evaluate(fromMouseUp) 全量 | mouseup 即时（:161-175） |
| S3 保存中 | 工具条点击 | 层保持+工具条 busy | pending 冻结 | save()（:199-228） |
| S4 已保存清除 | 保存成功 | 层同步清（不等防抖） | — | setPaint(null)+removeAllRanges（:217-220） |
| S5 跨页拒绝 | anchorRoot≠focusRoot | 拖选期静默收层；mouseup 时 toast | — | （:109-115） |
| S6 页外/不可锚定 | 选区在页盒外/无 textLayer/anchor null/零宽盒 | 静默收层收条 | — | （:117-131） |
| S7 Escape 后 | keydown Escape | **工具条收、层保留**（INV-37） | paint 不动 | （:176-179） |
| S8 页回收/重挂 | 页 DOM 卸载/zoom 重建/挂载盒引用变化 | 浏览器坍缩选区→selectionchange→层清 | — | effect 清理+坍缩（:185-196） |
| S9 异常 PDF 降级 | **设计新增**（现行=层照渲错误 rects，即 D1 病象） | 见 §2 降级门 G1/G2 | 检测器（取证后定） | 快路径内联检测 |

**跨格序列逐一推演**（防「单格枚举盖不住跨格序列」）：

- **Q1 拖选中→松手→保存→清除**：S1 节流层→mouseup cancel 调度器+全量 evaluate→S2→点击保存→S3→成功 S4（层与选区同一提交序清除，:217-220）→selectionchange 收敛分支确认 S0。**无中间态层悬空窗口**。
- **Q2 拖选中→Escape**：setPending(null) 空操作（本就 null），层保持最后节流帧，拖选继续则 S1 延续——Escape 不中断拖选（浏览器语义），层随后续 tick 覆盖。无悬空。
- **Q3 拖选中→翻页/页回收**：S8——若承载页被回收，浏览器坍缩选区→防抖/节流 evaluate 收敛→层清；拖选跨越回收边界的极端形态由 effect 清理兜底（:185-196）。正确。
- **Q4 松手（S2）→程序化重选**（e2e selectText / S1' 同型）：selectionchange→节流层更新（visualOnly 不动 pending）→防抖 settle 全量→pending 重算覆盖。**窗口期**：mouseup 后 200ms 内 pending 仍是旧选区——若此窗内点保存，保存的是旧锚（用户可感知窗 ≤200ms，现行在档行为，B 案保持零变）。
- **Q5 拖选中→拖出页盒（跨页）**：S1 每节流 tick 静默收层（visualOnly 分支不 toast，:109-115）→mouseup S5 toast。正确（INV-02 只挂完成时刻）。
- **Q6 S7（Escape 后）→点击坍缩**：层随 selectionchange 收敛清→S0。正确。
- **Q7 保存失败**：S3→busy 复位回 S2，层+工具条保留，toast 错误（:221-227）。正确。
- **Q8 异常 PDF 上各态**：**现行=S1/S2/S1' 层照渲错误 rects（D1 病象本体）**；S5~S8 不受影响（拒绝/回收语义与几何无关）。设计后：S9 介入 S1/S2 的 evaluate 前置检测（§2 降级门）。
- **Q9 S1'（停顿出条）→继续拖**：后续 selectionchange 走节流+防抖双路，pending 被下一次 settle 全量覆盖——工具条位置随动，无死锁。在档语义，保持。

## §2 D1 机理推演（划选渲染错乱）

### 2.1 候选机理逐条判定

**a) mergeLineRects 聚行判据在异常行盒上拆行/杂交——证实（高概率，三子机制）**

- a1 高度可比带 [0.5,2]（annotation-anchor.ts:266-267，判据 :370）：同视觉行内高差 >2× 的 span（大小字号混排/公式极端上下标）拆簇→同行多块且 y/h 各异=锯齿。注释自认「行内高度方差 ≥2.2× 时主导切换可拆行」(:262-265)。
- a2 **只与末簇比较**（:357-381 聚类循环，比对对象=rowGroups 末元素；:262-265 注释自认失联限制）：y 序交错时（紧行距/行盒整体偏移使相邻行盒 y 区间穿插），同行后段与真行簇「失联」另起簇=**锯齿拼接主候选**。修法方向注释在档（扩到全部簇）且 annotation-merge.ts:26-28 已按此先例实现。
- a3 pitch 估计污染（:276 INTRA_ROW_GAP_PX=2；estimateLinePitch :286-303）：行内基线差 2~6px（上下标/CJK 混排）≥2px 混入行距样本→下中位被拉低→centerLimit=min(pitch,domH,lh)/2 塌缩（:366-369）→同行碎片判异行。**2px 滤噪下限对数学/CJK 文档不足**（代码自注「同片段对中心差实测 ~0.2-2.4px」恰在门槛附近）。

**b) matchBand 错绑+mergeNear 端点并集放大——证实（高概率链，右溢主候选）**

跨行误并簇（a2/a3 的对偶面）→mergeSegment **x 取并集**（:411-418）=横向过宽矩形+y/h 取主导（错的行）→锯齿+越界同时出现。下游放大链：matchBand 最近中心带门 |Δcenter|≤r.h（annotation-resolve.ts:102-116）——r 跨两行时 r.h 大、门恒过→带错绑=垂直错位；mergeNear 中心距 ≤带高即并（:182-190）→x0/x1 取两行端点并集→clampedHorizontal（annotation-style.ts:60-73）夹取基准变宽=**右溢保持**。另一独立源：span CSS 盒宽=回退字体度量，盒宽于 PDF 墨带时夹取源本身错（取证项 T5）。

**c) 归一化基准两盒不重合——证伪（常态）**：基准=pixelBoxOf(textLayer)（SelectionLayer.tsx:137；anchor-serialize.ts:159），宿主=textLayer.parentElement（selection-paint.tsx:50-51）；textLayer=position:absolute+inset:0（text-layer.css 在档规则）→ 与定位父盒同盒由 inset:0 单独保证→ 百分比基准与渲染宿主同盒**成立**；父盒定位属性（relative）与显式尺寸声明引自包外文件（PageBox/TextLayer），取证票补核，不构成本结论的承重腿。残余：旋转页属 span 放置错非基准错（归 T1）。

**d) clientRectsBetween 回退真机可触发——证伪**：回退（annotation-anchor.ts:435-438）仅 getClientRects 缺席/空返回时触发；真机 Chromium 恒实现，空返回仅零文本区间——已被零宽盒预检拦截（SelectionLayer.tsx:127-131）。jsdom 桩面专属。

**markedContent/endOfContent 是否进 collectSpans/Range**：① markedContent **证伪 ✓（Kimi 二轮 K3 源码级闭合）**：getTextContent 无参调用（includeMarkedContent 默认关）+`items.filter('str' in item)`（PdfPageCanvas.tsx:136-137）——TextLayer 收到的 items 不含 markedContent 项，DOM 侧无生成源；运行时计数探针保留为零成本确认项不再承重。② endOfContent 证伪成立：无文本节点不进 collectSpans，且 user-select:none（text-layer.css:103-112）不可为选区边界。

**T1 页旋转（机理证实、通道缺失闭合——Kimi 二轮 K4/K5；触发归属待运行时探针）**：canvas viewport=pdfPage.getViewport({scale}) 默认含 page.rotate（PdfPageCanvas.tsx:109 在档）vs TextLayer duckViewport **硬编码 rotation:0**（TextLayer.tsx:53）且头注自认「页旋转 v1 不支持」（:46-48）→文本层坐标系与 canvas 墨带结构性错位；span 落层盒外时（overflow:clip 只裁视觉不裁 gBCR）clamp01 钉边=整片错乱形态。**T9 viewBox 原点≠0（Kimi 二轮新发现 K6，同族独立于旋转）**：duckViewport rawDims 硬编码 pageX:0/pageY:0（TextLayer.tsx:55-56）——非零 CropBox 原点页即使 rotation=0 也整体平移错位。两者触发归属由 F-A6-a 运行时探针（page.rotate/page.view）定谳，**列入取证矩阵 T1/T9 项，判别优先级由取证按复现结果裁定**。

### 2.2 取证实验矩阵（实现者自取同族 PDF 复现）

**形态分类清单**（**T1/T9 不因序号获得优先级——判别优先级由取证按复现结果裁定**）：T1 页旋转 /Rotate≠0（机理证实、触发待探针）；**T9 viewBox/CropBox 原点≠0（Kimi 二轮 K6 新立案——duckViewport rawDims 硬编码 pageX:0/pageY:0，探针=page.view 前两项）**；T2 行内高差 ≥2×（可比带拆簇）；T3 y 序交错（末簇比较失联）；T4 pitch 污染（centerLimit 塌缩）；T5 span 盒宽溢出（回退度量宽≠墨宽，夹取源错）；T6 零高/零宽盒残余；T7 多栏 gapThreshold=max(1.5×domH,2% 页宽)（annotation-anchor.ts:273-274,386）误断/误连；T8 getTextContent 项数据本身异常（畸形字体——迁移治不了源头，A/B 段判定）。

**探针脚本 `scripts/audits/f-a6-diag.mjs`**（Electron devtools/e2e evaluate 注入，落盘 JSON；**前置条件（deepseek WARN-4）：page.rotate 属 pdf.js page/viewport 对象不在 DOM 上——取证票首段须先定义注入面（测试构建临时 expose/e2e 内直调 pdfjs API/devtools 断点闭包三选一），不得假定注入即得**）：

1. **环境段**：page.rotate 值（经上述注入面）、textLayer 盒、--scale-factor、每 span {text, gBCR, fontSize, fontFamily, transform}——判 T1（rotate≠0 或 span 盒大量落 textLayer 盒外）/T5（span 盒右缘超出其文本墨带的系统性偏移）；**另含现行 evaluate 单 tick 时长实测（wall-clock+强制 layout 触发计数）——deepseek NIT-3：D2b「十毫秒级」由外推转前测基线，F-A6-c 以同基线做前后对比**。
2. **原始 clientRects 段**：复现划选，落 selection range 的 getClientRects 原始序列。
3. **中间产物段**：mergeLineRects 五步（unique→sorted→rowGroups→segments→out）逐段落盘+mergeRects 输出——判 T2/T3/T4/T7（首个偏离「每视觉行一块」的步骤即病灶步骤）。
4. **band 匹配配对段**：bandsForTextNodes 产带+每 rect 的 matchBand 绑定对+clampedHorizontal 前后值——判 b 链（错绑/并集放大）。
5. **R-几何源迁移 A/B 对照段（用户提案并入；Kimi 二轮 C3/C4 补强）**：同一选区双落盘——(甲) 现行 DOM 量测管线产物；(乙) **项声明几何产物**（`Util.transform(viewport.transform, item.transform)` 合成 → 位置+item.width/height×scale → **项内按 grapheme 簇比例细分（C2：UTF-16 码元计数禁用；dir=RTL 项细分方向翻转；styles.vertical 项轴互换）** → 归一化）。**量化判据（C4）**：乙净=每视觉行块数恰=行数+右溢 0px+与墨带重叠率 ≥阈；三结局分叉=①乙净甲错→**迁移为主修**、聚类加固降为回退；②乙错甲对→维持 R-加固+立案 pdf.js 文本层 scaleX 补偿面核查（不预选甲必错）；③同错→项数据异常=**T8 立案、加固降为症状缓解**（非根治措辞）。前置探针（C3）：`items.length` vs `container.querySelectorAll('span').length` 计数对齐+抽项文本比对（空串项/EOL/br 干扰面——一项一 span 前提的运行时确认）。

**判别准则**：逐段二分——原始 clientRects 已错→T1/T5（源头修）；原始对、rowGroups 错→T2/T3/T4（判据修）；像素域对、归一/绑定错→b 链（matchBand/mergeNear 修）。产出=裁决表（机理×证实/证伪）+修复集裁定，作为 F-A6-b 票面输入。

### 2.3 降级门（设计新增，S9 态）

- **G1 修复**：双路线（§0 D1 修复双路线）——R-加固：T1 走 rotation 通道修复（§5）、T2/T3/T4/T7 走判据修复；R-迁移（A/B 裁定成立时为主修）：项声明几何取代 DOM 量测主链（T1 矩形半边随迁自带、T2/T3/T5/T7 病根族随迁消灭），聚类加固降级为回退路径+S9 背书。
- **G2 降级**：取证后确认不可修复的残余形态（如 T5 系统性盒溢出无墨带参照）——检测器→抑制 paint 渲染+保存前 toast 拒绝（INV-02 禁静默；**不允许**「照渲错误 rects 入库」——所见即所存的反向利用：所见错即拒绝所存）。**检测器输入口径随路线分叉（Kimi 二轮 C6）**：R-加固路线=「选区 clientRects 与 textLayer 盒偏离率」；R-迁移路线=「项矩形与 textLayer 盒/墨带偏离率」（rect 源不再经 clientRects）。**G2 阈值与检测器验收标准=F-A6-a 取证票必需交付物（deepseek WARN-5）**：若取证未发现不可修复形态，F-A6-b 票面须声明 G2 仅在新增复现证据时启用（防「检测器先写但永远无阈值」空置）。

## §3 D2 机理推演（拖选卡顿）

### 3.1 调度粒度（D2a——证实，直接体感来源）

createVisualScheduler（selection-geometry.ts:105-144）：leading（now−last≥200 即触发）+trailing（窗内排队补一）；连续 selectionchange 下视觉更新时刻=t0, t0+200, t0+400…**恰 5Hz 步进**。逐帧鼠标位移被量化为 200ms 阶梯=「一卡一卡」，与单次管线快慢无关。

### 3.2 每 tick 全量成本（D2b——证实，调用图实测）

evaluate(false,true)（SelectionLayer.tsx:100-144）每视觉 tick 执行：

| 步骤 | 实现 | 成本级 |
|---|---|---|
| collectSpans 全页 TreeWalker | anchor-serialize.ts:132 + annotation-anchor.ts:105 | **×2 遍**（selectionToAnchor 与 findRangeAtOffset 各一） |
| probeTextLength×2+join | anchor-serialize.ts:137-138,147 | O(页文本) 字符串构建 **×3**（probe start+probe end+全文 join） |
| quote/prefix/suffix 切片 | :156-158 | quote O(选区长)+prefix/suffix O(32)——**视觉路径零消费** |
| rectsBetweenPoints ×2 | anchor-serialize.ts:159 + annotation-anchor.ts:131-135 | 第二次与第一次 **first/last/base 逐位相同→产物纯冗余**（唯一增量=textNodes） |
| medianFontSizeBetween ×2 | annotation-anchor.ts:220-252 | Range 子树 TreeWalker+逐节点 getComputedStyle+parseFloat |
| range.getClientRects ×2 | annotation-anchor.ts:427 | 布局读×2 |
| mergeLineRects+mergeRects ×2 | :325-404 / annotation-merge.ts:102-172 | CPU（聚类）×2 |
| pixelBoxOf gBCR ×3 | SelectionLayer.tsx:137 等 | 布局读×3 |
| bandsForTextNodes | annotation-resolve.ts:198-218 | 每 span：gBCR+**getComputedStyle×2**（fontSizeOf:162-165+metricsOf:138-158）+ctx.font 赋值+measureText |

强制 layout 量级：tick 内 evaluate 无 DOM 写（纯读批）→上 tick portal commit 致脏后本 tick 首读强制 layout **≈1 次**+style recalc 若干——**非 read-write 抖动型**。密集页（数千 span/数万字符）单 tick CPU 可达十毫秒级，远超帧预算。

### 3.3 portal 重渲染（D2c——部分证实）

setPaint 恒新对象（SelectionLayer.tsx:137）→SelectionPaint 每 tick 全子树重渲染：React 按 key=i 复用 DOM 非「整建」，但 N 块全量重算 matchBand+style 写+新 bands 数组引用全子树失效；无 memo。为次因（与 3.2 合计放大 tick 长度）。

### 3.4 可砍冗余清单（快路径设计输入）

1. 第二遍 collectSpans+rectsBetweenPoints+medianFontSize+merge 全链（100% 冗余，textNodes 改由 Range 子树父元素枚举替代）；
2. quote/prefix/suffix 构建（settle 专用）；
3. findRangeAtOffset 偏移往返（视觉直接用 sel.getRangeAt(0).getClientRects；边界贴文本节点差额由 settle 终裁）；
4. bands 量测（measureText/getComputedStyle）→**拖选会话缓存**（WeakMap 键=span 元素+基准盒尺寸，zoom 变更换键自然失效；mid-drag zoom 一帧陈旧由 settle 纠正——已知边界申报）；
5. pixelBoxOf(textLayer) 每 tick 重读→会话缓存（同键）。

**快路径每 tick 预算**：1× getClientRects+1× gBCR+merge（CPU）+缓存命中≈亚毫秒~2ms（选区矩形数级，非页级）。

## §4 三案对比

**公共面前置声明：D1 管线加固（§2 取证+双路线[聚类加固/几何源迁移]+T1 rotation 通道+G2 降级门）为三案共享正交面，不参与本节对比——几何源迁移只换矩形来源不换视觉通道，与 A/B/C 正交。**

| 判据 | A 纯原生 | B 自绘优化 | C 混合 |
|---|---|---|---|
| R1 根治保持 | 回退（重叠 span 0.36 叠深回归——F-A4 用户根治令推翻） | **保持（全程）** | 静态保持；拖选期瞬时叠深 |
| 所见即所存 INV-37 | 违反（S2 断言面失守） | **拖选期弱化为≈**（快路径同管线+四道守卫+增量 textNodes 枚举，§5 INV-58 锁死；松手 settle 覆盖帧可有贴边级跳变——§6 边界①+F-A6-c 票面锁「settle 产物落地同帧覆盖快路径产物」断言；松手/保存时刻严格恢复=settle 全量单一权威） | 需 R3 双通道语义切分 |
| 拖选流畅度 | 完美（零 JS） | rAF 60Hz+亚毫秒 tick | 完美（拖选期零 JS） |
| 异常 PDF 正确性与降级 | 视觉随 span 照错；保存 rects 仍错（D1 面照修） | 同左（D1 面照修，层正确化） | 同左 |
| INV-37/42/05 修订面 | INV-37 重写；INV-05/42 不动 | INV-37 仅调度条款；**新 INV-58**；INV-05/42 不动 | INV-37 双通道+切换语义；INV-42 接缝新增交互 |
| 受锁守卫配套最小集 | e2e F-06 C 节改写+unit S1/S2/S5/S1b/S1c 大改 | **S1b/S1c 两 it+annotation-anchor 行为面 its**；selection-layer.test 预计零改 | A 之全部+通道切换时序新 its |
| 代码组织红线 | 删 selection-paint.tsx/selection-evaluate 反向 | SelectionLayer 249→≤220（红线解除——目标值，实施以实际 diff 为准） | A 面+新增切换态模块 |
| 实现风险/回滚面 | 高（推翻两轮用户令） | **低**（settle 语义零变；快路径独立新件可整体摘除） | 高（settle 换帧原子性：native→paint 同帧切换否则闪变/双渲染；五轮事故同族接缝类） |

**A 否决理由**：直接推翻 R1 修订的用户根治令与 INV-37 已锚定面（e2e+单测+真机 12/12 在档），等于第六轮通道震荡；CSS 面穷尽性有仓库史背书（F-06 不透明遮字/F-08 半透明叠深两路已试失败，text-layer.css:12-45 头注在档；mix-blend-mode 对 ::selection 伪元素不可用——非盒元素，仅 color/background-color 可靠支持）。**C 否决理由**：通道切换接缝=新跨帧状态机（S1→S2 视觉交接、Escape/保存/页回收各多一条切换边），恰是本仓五轮事故的结构性病灶；且拖选期瞬时叠深重现 R1 诉求场景。**B 当选**：不换通道只拆路径+换调度，风险面最小且 INV-37 语义原样。

## §5 推荐案（B）落地蓝图

### 5.1 模块级改动清单

| 文件 | 职责 | 预估行数变化 |
|---|---|---|
| `scripts/audits/f-a6-diag.mjs`（新） | §2.2 取证器四段落盘 | +~150（诞生即 locks:generate+apply） |
| `src/renderer/features/reader/TextLayer.tsx` | duckViewport **rotation 通道+T9 rawDims 真值化**（**行号与改法以 F-A6-a 行级复核为准**；rotation 面：若运行时探针确认当前复现集无 /Rotate≠0 致病实例则该半边删除——机理已源码级证实，可变的只是触发归属[deepseek 终位 NIT-2]；T9 面：duckViewport 改收真实 page.view/pageX/pageY，取证确认触发后由 F-A6-b 承接[WARN-2]；**几何源迁移不替代本行**——迁移只修矩形半边，span 定位半边（划选手势映射面）仍需 rotation 通道） | +~25（预估，待证） |
| `src/renderer/features/reader/pdf-item-geometry.ts`（新，**R-迁移路线成立时**） | 项声明几何域（纯函数）：**入参=PdfTextItem[]{str,width,height,transform,dir}+styles（ascent/descent 源）+viewport 通道（Kimi 二轮 C1——签名必含）** → 归一化项矩形；偏移区间→项集+**项内 grapheme 簇比例细分（RTL 翻转/竖排轴互换）**；与 collectSpans 文档序对齐的项↔span 映射（一项一 span 前提——C3 计数探针运行时确认）；行级并块（基线分组——项变换含旋转角）；**bands 派生同源（C5：迁移路线下 bands 亦由项几何+styles 度量派生，禁 rect 项源×band DOM 量测混用——matchBand 两口径混用=b 链错绑同构风险）** | +~160 |
| `src/renderer/features/reader/PdfPageCanvas.tsx`+装配链（**R-迁移成立时**） | **viewport/styles 下钻通道（Kimi 二轮 C1 承重断点）**：onPageRender 载荷扩展（或独立通道）把 viewport 等价信息（rotate+scale+viewBox/page.view）与 styles 下钻至 ReaderPage→SelectionLayer/selection-evaluate——现状 viewport 是渲染闭包局部量、TextLayer 用重建 duckViewport，选择域无真 viewport 可用；**T9 修复同在此面**（rawDims 传真实 page.view 而非硬编码 0,0） | +~20 |
| `src/renderer/features/reader/annotation-anchor.ts` | mergeLineRects 聚类比较扩到全部簇（annotation-merge.ts:26-28 先例语义）+pitch 滤噪鲁棒化（下限改 0.5×主导高或等价） | +~20（440→~460，≤500 保持） |
| `src/renderer/features/reader/selection-evaluate.ts`（新） | evaluateVisual（快路径数据链——**双路线（deepseek 终位 WARN-3 贯通）**：R-加固=视口 clientRects→增量维护被选 textNodes/span 集合（Range 子树父元素枚举——首次全量+跨帧增长增量，缓存 keyed by span）→pixelBoxOf(textLayer) 归一化→同源 mergeLineRects+mergeRects→缓存 bands（bandsForTextNodes 消费同一 textNodes 集合）；R-迁移=**pdf-item-geometry 项几何直取**（偏移区间→项集+grapheme 细分→项矩形+项派生 bands——全部布局读出链）**）/evaluateFull（现行逻辑**迁移+删 visualOnly 死参面**——onVisual 不再调 evaluate(·,true) 后 SelectionLayer.tsx:103/113/123/129/138-139 分支全死，P10 死代码即删；**R-迁移下 evaluateFull 同步切项几何链=全量权威与快路径同族**）**守卫前置（强制条款——Kimi 拟定裁决 2-§5①）**：必须复用现行 evaluate 的四道收敛守卫——(i) sel null/rangeCount 0/isCollapsed→setPaint(null)；(ii) closestPageRoot(anchorNode)≠closestPageRoot(focusNode)→setPaint(null) 静默（visualOnly 不 toast，现行语义）；(iii) 页外/textLayer 缺→setPaint(null)；(iv) range.getBoundingClientRect() 零宽零高→setPaint(null)。缺一则跨页/坍缩拖选会把跨页 clientRects 归一化进单页 pixelBoxOf=textLayer 盒=新 D1 同族错乱源；归一化基准=选区所在页 textLayer 的 pixelBoxOf（与 settle 同盒，在转换链内非注脚）+拖选会话缓存（span band/fontSize/基准盒；R-迁移路线无此面——项几何缩放不变零重算）+S9 检测器挂点；tick 预算含增量枚举成本（首帧全量、后续增量≈选区增长量级） | +~170 |
| `src/renderer/features/reader/SelectionLayer.tsx` | evaluate 迁出+双路径接线（**红线解除目标 ≤220——实施以实际 diff 为准**，deepseek NIT-4：不给伪精确行数；方向=净减（evaluate 闭包整体迁出） | 净减（目标 ~200±20） |
| `src/renderer/features/reader/selection-geometry.ts` | createVisualScheduler 改 rAF 对齐：leading 首事件即排 rAF（≤16ms，S1b 零反馈红线保持）、帧内合帧去重、settle 防抖 200ms **零变**、cancel 清 rAF | +~35（144→~180） |
| `src/renderer/features/reader/selection-paint.tsx` | React.memo+props 稳定化 | +~8 |
| `docs/adr/0019-…md` / `docs/invariants.md` | §6 R3 段+INV-37 调度条款+INV-58 登记 | +~60 |

**INV-58（新登记草案）**：拖选期视觉与保存 rects 同几何管线——快路径必须复用同源函数族（mergeLineRects+mergeRects+pixelBoxOf——R-加固路线；或 pdf-item-geometry 项几何族——R-迁移路线），禁止第二几何口径；**路线决议后全量评估（evaluateFull/settle）与快路径必须属同一几何族，禁止新旧几何族跨层并存（deepseek 终位 WARN-3——防松手同帧回带旧错几何）**；**迁移路线下 rect 与 bands 同由项几何+styles 派生（Kimi 二轮 C5），禁项源 rect×DOM 量测 band 混用**；settle 全量评估为保存与最终视觉的单一权威。锚定=selection-evaluate.test 快慢路径同夹具等价 it+（迁移路线）pdf-item-geometry.test 项↔band 同源 it。

### 5.2 调度器新形态

- 视觉路：selectionchange→若本帧未排程则 requestAnimationFrame(evaluateVisual)——60Hz 上限、帧内天然合帧；可选 P2 自适应（自测时长 >8ms 隔帧降 30Hz）。
- settle 路：防抖 200ms 与 mouseup 即时全量**逐字保持**（工具条弹出语义/S1b 后半/selection-layer.test 全量不红）；**mouseup 的 cancel-before-evaluate 顺序保持**（现行 :161-175——防 settle 防抖在 mouseup 全量后补枪覆盖）。
- 清理：mouseup/卸载清 rAF 句柄（INV-14 同型）。
- **rAF×React 并发面申报**：rAF 回调内同步 setPaint 在非 act 环境/并发渲染下的交错由测试桩方案覆盖（vi.stubGlobal rAF 先例=selection-paint.test.tsx:324-327；vitest fake timers 默认 fake rAF，advanceTimersByTimeAsync(≥16) 触发）；rAF 后台/遮挡暂停影响面=隐藏态程序化选区视觉陈旧（cosmetic——Electron 单窗口+拖选需前台输入，真拖选不可触发）。

### 5.3 受锁测试配套清单（[locked-change] 预估）

- `tests/unit/renderer/selection-paint.test.tsx`（17 it）：S1b/S1c 两 it 改写为 rAF 语义（vi.stubGlobal rAF 先例在本件 b 面 :324-327）；S1/S2/S5 走 mouseup/防抖预计零改。
- `tests/unit/renderer/selection-layer.test.tsx`（14 it）：**预计零改**（断言语义面走 settle/mouseup 路径——若红，先区分断言语义偏离（实现错）与测试时序未适配 rAF（测试面更新），deepseek NIT-2 口径）。
- `tests/unit/renderer/annotation-anchor.test.ts`：mergeLineRects 行为面 its 改写+交错夹具（T3）/pitch 污染夹具（T4）新 its——具体数以取证裁决后票面先红清单为准。
- `tests/e2e/reader-text.spec.ts` F-06 小票（:683-761）：预计零改（settle 态断言不受快路径影响）；可选新增拖选随动预算断言（程序化连发 selectionchange→2 帧内 paint 几何变更）。
- 新测试 always-active：`tests/unit/renderer/selection-evaluate.test.tsx`（快慢等价/缓存摊销/异常夹具/S9 降级门四组）。
- **调度器测试锚显式声明**：createVisualScheduler 现行**无直测**（grep tests/ 对 selection-geometry 直接 import 零命中——行为锚=selection-paint.test S1b/S1c 组件级，grep 实测）；rAF 改形后新单元「帧内合帧去重」（同帧多次 selectionchange 恰一次 evaluateVisual）至少锚一个 it——这是改形中唯一无现行对应物的新逻辑单元。

### 5.4 工单切分（三屋，串行）

1. **F-A6-a 取证票（✅ 2026-09-04 完成）**：diag 脚本+用户同族 PDF 复现+裁决表（定 D1 修复集与 G2 阈值）+**A/B 对照（DOM 量测 rects vs 项声明 rects——双路线裁定+T1 行级复核[TextLayer/PdfPageCanvas 源码入包]+tick 时长前测基线**）。产出=修复集裁定+路线裁定（**R-迁移为主修，阶段化决策门**——裁决表 §4/§5：阶段1 T1/T9 前置→阶段2 复跑对照→阶段3 主链迁移），无实现面。产物=scripts/audits/f-a6-diag{,-lib,-page}.mjs+ f-a6-diag-out/ 44 件+裁决表 f-a6-forensic-verdict.md。
2. **F-A6-b D1 管线加固票**（依赖 a）：**按 a 的路线裁定分叉**——R-加固：annotation-anchor 判据修+TextLayer rotation+G2 门；R-迁移：pdf-item-geometry 拆件为主链+**PdfPageCanvas/装配链 viewport 等价信息（rotate+scale+viewBox/page.view）与 styles 下钻通道（C1 承重断点——本票宿主，deepseek 终位 WARN-1）**+TextLayer rotation+DOM 量测降级为回退路径+G2 门。**路线无关项（deepseek 终位 WARN-2）：T9 修复=TextLayer duckViewport 改收真实 page.view/pageX/pageY（与 T1 相互独立，rotation=0 也致病）——取证确认 T9 触发后由本票承接**。TDD：先红（交错/pitch/项几何夹具）→绿→变异红证。
3. **F-A6-c D2 调度与快路径票**（依赖 a+b——**R-迁移路线下必须待 b 交付 pdf-item-geometry+下钻通道后再实施**，deepseek 终位 WARN-1）：selection-evaluate 拆件+rAF 调度+S1b/S1c 改写；票面必须含「settle 产物落地**同帧覆盖**快路径产物」断言（松手瞬间快→settle 几何跳变面：元素容器边界差额+textNodes 两套枚举口径可差一 span 的 band 差——INV-58 等价 it 用文本边界夹具锚不住此族，须显式锚）。**路线分叉贯通全量权威（deepseek 终位 WARN-3）：R-加固=evaluateVisual 快路径与 evaluateFull/settle 均走 clientRects 链；R-迁移=两者均走 pdf-item-geometry 项几何链（快路径全部布局读出链=getClientRects/gBCR 均消——D2 收益结构性加固）——禁止快路径走新几何族而 settle 留在旧几何族（松手同帧会把 D1 错几何带回来）**。
4. **F-A6-d 收口票**：e2e 补断言+INV-37/58+ADR R3+locks 收账+verify 全绿。

## §6 ADR-0019 R3 修订草案段

**R3 修订：拖选视觉调度 rAF 对齐+评估双路径+几何管线加固（F-A6，2026-09-03）**

- **修订依据**：用户实报 2026-09-03（图证定性）——某 PDF 划选灰块锯齿拼接+右侧溢出，拖选反馈一卡一卡；五轮方案（F-06/07/08/09/A4+A5）后残留，远超「同类缺陷二次触发即重构」线，registry F-A6 立案纪律=设计文档先行。根因双独立：D1=几何源头在异常 text-layer 上错（自绘层照渲=所见即所存的几何源头错）；D2=拖选期 200ms 节流粒度（5Hz 步进）+每 tick 全量评估冗余（含与视觉无关的锚定序列化与二次几何往返）。
- **落地形态**：①视觉通道**不变**（::selection 保持 transparent、自绘并集层保持——本修订区别于 R1/R2 的通道级修订，是通道内调度与管线修订）；②拖选期=快路径（raw selection range clientRects→同一 mergeLineRects+mergeRects→缓存 bands，rAF 对齐 60Hz），settle（mouseup/防抖）=全量评估零变（锚定三元组/保存链权威单点）；③D1 公共面=**双路线（R-加固/R-几何源迁移——用户提案 2026-09-03，F-A6-a A/B 裁定）**+TextLayer rotation 通道（T1 待证——证伪则该项删除）+S9 降级门（检测偏离→抑制渲染+保存拒绝 toast，INV-02）；④INV-37 调度条款同步（200ms 防抖驱动→rAF 对齐双路），新 INV-58 锁「快路径同管线」；⑤**INV-37 语义弱化显式登记（Kimi 拟定裁决 2-§6——B 案成立的前置条件）**：拖选期视觉=**所见≈所存**（快路径几何为 settle 权威的瞬态近似，边界贴齐/band 口径差额由 settle 同帧终裁覆盖）；**松手及保存时刻所见即所存严格保持**（settle 全量为单一权威）。此弱化为本次修订的显式代价，登记而非隐含。
- **不随修订变化**：锚定三元组/保存链/INV-05 两路径同口径/F-12 触发阈值/选择模式（INV-42）/工具条定位与弹出语义（含拖选中停顿 >200ms 出条）/Escape 语义（INV-37 主体）。
- **已知边界申报**：①快路径用原始选区 range，选区边界落在元素容器（非文本节点）时与 settle 重构 range 有边界贴齐差额——settle 终裁覆盖，拖选期瞬时不计入所存（零宽差额 rect 被 mergeRects W_MIN 滤除，跳变面窄于直觉；但 textNodes 两套枚举口径差一 span 的 band 差由 F-A6-c 票面同帧覆盖断言显式锚）；**①' 项内细分边界=近似值（R-迁移路线——Kimi 二轮 C2）**：grapheme 簇比例细分在连字/比例字体下项内选中起点可有抖动，包络兜底（右溢结构性消灭），settle 同帧终裁覆盖——与①同族并入同断言锚；②拖选会话缓存在 mid-drag zoom 时一帧陈旧（settle 纠正；R-迁移路线无此面——项几何缩放不变零重算）；③旋转页修复后仍存的畸形文本层走 G2 降级门（拒绝优于错存）；④快路径与全量在 bands 上取同一数学但缓存键含基准盒——极端同帧缩放+拖选并发的带值以全量复核为准；缓存键浮点等值点：同布局批次内 gBCR 重复读逐位相同命中成立，ui-scale 补偿浮点残差（1/1.1×1.1≠1 精确）可致跨批次 miss+WeakMap 值内微膨胀（有界于 span 生命周期）；⑤若真机复评 B 案仍有可感卡顿，C 案（拖选原生+settle 接管）为备案单案，禁止与 B 并存（P10 方案切换=删旧）。
