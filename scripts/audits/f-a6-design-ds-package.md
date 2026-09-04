# F-A6 设计书 deepseek 对抗审核包（自包含）

## 一、任务背景
工单 F-A6（划选渲染错乱 D1+拖选卡顿 D2 根治，五轮方案后设计文档先行纪律）。审查链=GLM 同源预审（欠账）→Kimi K3 拟定裁决（有条件采纳+六处改写指令已落入）→你（deepseek 对抗审核）→GLM5.3 主控终裁→用户过目。

## 二、设计书修订稿全文（审查对象）

# F-A6 设计文档：划选渲染错乱（D1）+ 拖选卡顿（D2）根治

路径：`docs/design/2026-09-03_f-a6-selection-root-fix.md` · 日期 2026-09-03 · 状态：**Kimi K3 拟定复核毕（有条件采纳——三前置条件已全部落入：T1 降待证候选/markedContent 预判证伪待核/快路径四道守卫强制条款）——待 deepseek 对抗审+主控终裁** · **待用户过目方案（§0 拍板三点）** · 上游：tickets/registry.ts:242 · 涉修订：ADR-0019 R3、INV-37 条款、新 INV-58 · 审查链：GLM 同源预审（scripts/audits/f-a6-design-review.md——欠账轮，不作放行依据）→Kimi 拟定裁决（scripts/audits/f-a6-design-r3.raw.txt——14 ✓+6 ? 清单在档）→deepseek 对抗审（本段）

## §0 一页纸决策摘要

**病根判定（源码级核实，详 §2/§3）**

- **D1（划选灰块锯齿拼接+右侧溢出）**：几何源头=Range clientRects 在异常 text-layer 上本身错，再经 `mergeLineRects` 聚类判据放大——三个子机理全部代码级证实为高概率（高度可比带拆簇/只与末簇比较失联/pitch 估计污染），跨行误并簇的 x 并集=右溢主链；**待证候选 T1=页旋转 /Rotate≠0**：嫌疑源自 TextLayer/PdfPageCanvas 的旋转坐标系处置（证据档不在本设计包内，F-A6-a 取证票先行行级复核后入档）；其预期病象（整片错位）与用户实报（锯齿+右溢）形态不吻合，列取证矩阵平等项，不预选。markedContent/endOfContent 两候选中 endOfContent **证伪**（无文本且 user-select:none），markedContent **预判证伪待核**（getTextContent 调用面在包外——取证票 grep+运行时探针双证后定谳）。
- **D2（拖选一卡一卡）**：三候选全部或大部证实——(a) 200ms 节流窗=拖选期视觉恰 5Hz 步进（直接体感来源）；(b) 每视觉 tick 走全量 evaluate：全页 TreeWalker×2 + O(页文本) 字符串构建×3 + 几何管线整体×2（第二次产物逐位相同=纯冗余）+ 每 span 双 getComputedStyle+canvas measureText；(c) setPaint 恒新对象→portal 全子树重渲染为次因（React 有 key 复用非整拆，但无 memo）。强制 layout ≈1 次/tick（非抖动型）——**卡顿主因=粒度+CPU 冗余，非 layout 抖动**。
- **正交性声明**：D1 管线加固是三案公共面（几何源头修复，与视觉通道选择无关）；三案对比只决 D2 通道与调度。

**三案一表**

| 维度 | A 纯原生 ::selection | B 自绘层优化（拆拖选快路径） | C 混合（拖选原生+settle 自绘接管） |
|---|---|---|---|
| R1 根治保持（重叠不叠深） | **回退**（R1 修订案整体推翻） | 保持（全程自绘单层单绘） | 静态保持；**拖选期瞬时叠深 0.36 复现** |
| 所见即所存 INV-37 | 违反（视觉≠保存 rects） | 保持（快路径同一几何管线；松手瞬间快→settle 可有贴边级跳变——§6 边界①，票面锁同帧覆盖断言） | 需 R3 语义切分（拖选期豁免） |
| 拖选流畅度 | 零 JS，完美 | rAF 对齐 60Hz，快路径亚毫秒~2ms | 零 JS，完美 |
| 异常 PDF 正确性 | 视觉随 span（错也照显）；保存 rects 仍错 | 同左（D1 公共面修复后两者皆正） | 同左 |
| INV/ADR 修订面 | 最大（INV-37 重写+R3=回退令） | 小（INV-37 调度条款+INV-58 新增） | 中大（INV-37 双通道语义+通道切换态新增） |
| 受锁守卫配套 | e2e F-06 C 节+unit S 系大改写 | S1b/S1c 两 it+annotation-anchor 若干 it | A 的全部+切换时序新 it |
| 代码组织红线 | 删 selection-paint（净减） | SelectionLayer 249→~195（本就贴 250 红线，必拆） | A 面+新增切换状态机 |
| 实现风险/回滚面 | 推翻用户根治令历史 | 小（settle 路径语义零变） | **切换接缝新 bug 类**（本仓五轮事故同族） |

**推荐=B**。代价：受锁两文件改写（划选域受锁改写先例在档——F-06/F-07/F-08/F-A4 四轮，git log --grep='locked-change' -- tests/ 可查）+新模块一件。**用户需拍板的点**：① 拖选中停顿 >200ms 出工具条的既有语义是否保持（本设计默认保持零变，如需改另立票）；② 旋转页 /Rotate 修复纳入本票 D1 公共面（建议纳入，否则该类 PDF 病根仅降级不根治）；③ 若 B 落地后真机仍感知卡顿（可能性低，快路径预算亚毫秒级），C 为备案案非并行案。

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

**markedContent/endOfContent 是否进 collectSpans/Range——预判反驳（endOfContent 成立/markedContent 待核）**：① getTextContent 调用面（PdfPageCanvas.tsx，包外）是否开 includeMarkedContent 待 F-A6-a 行级复核+运行时探针（document.querySelectorAll('.textLayer .markedContent') 计数）双证；在证据入档前结论写**预判证伪**而非证伪。② endOfContent 证伪成立：无文本节点不进 collectSpans，且 user-select:none（text-layer.css:103-112）不可为选区边界。

**T1 页旋转（待证候选，证据包外）**：嫌疑链=canvas viewport=pdfPage.getViewport({scale}) 默认含 page.rotate（PdfPageCanvas.tsx，包外）vs TextLayer duckViewport rotation:0（包外）→文本层坐标系与 canvas 墨带结构性错位；span 落层盒外时（overflow:clip 只裁视觉不裁 gBCR）clamp01 钉边=整片错乱形态（比锯齿更剧烈）。**证据档不在本设计包内**——F-A6-a 取证票先行行级复核（含 page.rotate 运行时探针）后定谳；其预期病象与用户实报（锯齿+右溢）形态不吻合，**列入取证矩阵 T1 项，判别优先级由取证票按复现结果裁定**（Kimi 拟定裁决 2-§2③）。

### 2.2 取证实验矩阵（实现者自取同族 PDF 复现）

**形态分类清单**：T1 页旋转 /Rotate≠0（源码级结构性错位）；T2 行内高差 ≥2×（可比带拆簇）；T3 y 序交错（末簇比较失联）；T4 pitch 污染（centerLimit 塌缩）；T5 span 盒宽溢出（回退度量宽≠墨宽，夹取源错）；T6 零高/零宽盒残余；T7 多栏 gapThreshold=max(1.5×domH,2% 页宽)（annotation-anchor.ts:273-274,386）误断/误连。

**探针脚本 `scripts/audits/f-a6-diag.mjs`**（Electron devtools/e2e evaluate 注入，落盘 JSON）：

1. **环境段**：page.rotate 值、textLayer 盒、--scale-factor、每 span {text, gBCR, fontSize, fontFamily, transform}——判 T1（rotate≠0 或 span 盒大量落 textLayer 盒外）/T5（span 盒右缘超出其文本墨带的系统性偏移）。
2. **原始 clientRects 段**：复现划选，落 selection range 的 getClientRects 原始序列。
3. **中间产物段**：mergeLineRects 五步（unique→sorted→rowGroups→segments→out）逐段落盘+mergeRects 输出——判 T2/T3/T4/T7（首个偏离「每视觉行一块」的步骤即病灶步骤）。
4. **band 匹配配对段**：bandsForTextNodes 产带+每 rect 的 matchBand 绑定对+clampedHorizontal 前后值——判 b 链（错绑/并集放大）。

**判别准则**：逐段二分——原始 clientRects 已错→T1/T5（源头修）；原始对、rowGroups 错→T2/T3/T4（判据修）；像素域对、归一/绑定错→b 链（matchBand/mergeNear 修）。产出=裁决表（机理×证实/证伪）+修复集裁定，作为 F-A6-b 票面输入。

### 2.3 降级门（设计新增，S9 态）

- **G1 修复**：T1 走 rotation 通道修复（§5）；T2/T3/T4/T7 走判据修复。
- **G2 降级**：取证后确认不可修复的残余形态（如 T5 系统性盒溢出无墨带参照）——检测器（选区 clientRects 与 textLayer 盒的偏离率超阈）→抑制 paint 渲染+保存前 toast 拒绝（INV-02 禁静默；**不允许**「照渲错误 rects 入库」——所见即所存的反向利用：所见错即拒绝所存）。

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

**公共面前置声明：D1 管线加固（§2 取证+判据修复+T1 rotation 通道+G2 降级门）为三案共享正交面，不参与本节对比。**

| 判据 | A 纯原生 | B 自绘优化 | C 混合 |
|---|---|---|---|
| R1 根治保持 | 回退（重叠 span 0.36 叠深回归——F-A4 用户根治令推翻） | **保持（全程）** | 静态保持；拖选期瞬时叠深 |
| 所见即所存 INV-37 | 违反（S2 断言面失守） | **保持**（快路径同管线，§5 INV-58 锁死；松手 settle 覆盖帧可有贴边级跳变——§6 边界①，F-A6-c 票面锁「settle 产物落地同帧覆盖快路径产物」断言，等价 it 锚不住 textNodes 枚举口径差族故必须显式锚） | 需 R3 双通道语义切分 |
| 拖选流畅度 | 完美（零 JS） | rAF 60Hz+亚毫秒 tick | 完美（拖选期零 JS） |
| 异常 PDF 正确性与降级 | 视觉随 span 照错；保存 rects 仍错（D1 面照修） | 同左（D1 面照修，层正确化） | 同左 |
| INV-37/42/05 修订面 | INV-37 重写；INV-05/42 不动 | INV-37 仅调度条款；**新 INV-58**；INV-05/42 不动 | INV-37 双通道+切换语义；INV-42 接缝新增交互 |
| 受锁守卫配套最小集 | e2e F-06 C 节改写+unit S1/S2/S5/S1b/S1c 大改 | **S1b/S1c 两 it+annotation-anchor 行为面 its**；selection-layer.test 预计零改 | A 之全部+通道切换时序新 its |
| 代码组织红线 | 删 selection-paint.tsx/selection-evaluate 反向 | SelectionLayer 249→~200±5（实测测算 −47：evaluate 闭包 48 行+import 收缩 3−新接线 4；红线解除） | A 面+新增切换态模块 |
| 实现风险/回滚面 | 高（推翻两轮用户令） | **低**（settle 语义零变；快路径独立新件可整体摘除） | 高（settle 换帧原子性：native→paint 同帧切换否则闪变/双渲染；五轮事故同族接缝类） |

**A 否决理由**：直接推翻 R1 修订的用户根治令与 INV-37 已锚定面（e2e+单测+真机 12/12 在档），等于第六轮通道震荡；CSS 面穷尽性有仓库史背书（F-06 不透明遮字/F-08 半透明叠深两路已试失败，text-layer.css:12-45 头注在档；mix-blend-mode 对 ::selection 伪元素不可用——非盒元素，仅 color/background-color 可靠支持）。**C 否决理由**：通道切换接缝=新跨帧状态机（S1→S2 视觉交接、Escape/保存/页回收各多一条切换边），恰是本仓五轮事故的结构性病灶；且拖选期瞬时叠深重现 R1 诉求场景。**B 当选**：不换通道只拆路径+换调度，风险面最小且 INV-37 语义原样。

## §5 推荐案（B）落地蓝图

### 5.1 模块级改动清单

| 文件 | 职责 | 预估行数变化 |
|---|---|---|
| `scripts/audits/f-a6-diag.mjs`（新） | §2.2 取证器四段落盘 | +~150（诞生即 locks:generate+apply） |
| `src/renderer/features/reader/TextLayer.tsx` | duckViewport rotation 通道（**行号与改法以 F-A6-a 对 TextLayer/PdfPageCanvas 的行级复核为准**；若 T1 证伪则本行整行删除，F-A6-b 票面不含旋转面） | +~25（预估，待证） |
| `src/renderer/features/reader/annotation-anchor.ts` | mergeLineRects 聚类比较扩到全部簇（annotation-merge.ts:26-28 先例语义）+pitch 滤噪鲁棒化（下限改 0.5×主导高或等价） | +~20（440→~460，≤500 保持） |
| `src/renderer/features/reader/selection-evaluate.ts`（新） | evaluateVisual（快路径：raw range clientRects→同源 merge→缓存 bands）**守卫前置（强制条款——Kimi 拟定裁决 2-§5①）**：必须复用现行 evaluate 的四道收敛守卫——(i) sel null/rangeCount 0/isCollapsed→setPaint(null)；(ii) closestPageRoot(anchorNode)≠closestPageRoot(focusNode)→setPaint(null) 静默（visualOnly 不 toast，现行语义）；(iii) 页外/textLayer 缺→setPaint(null)；(iv) range.getBoundingClientRect() 零宽零高→setPaint(null)。缺一则跨页/坍缩拖选会把跨页 clientRects 归一化进单页 pixelBoxOf=textLayer 盒=新 D1 同族错乱源；归一化基准=选区所在页 textLayer 的 pixelBoxOf（与 settle 同盒）/evaluateFull（现行逻辑**迁移+删 visualOnly 死参面**——onVisual 不再调 evaluate(·,true) 后 SelectionLayer.tsx:103/113/123/129/138-139 分支全死，P10 死代码即删）+拖选会话缓存（span band/fontSize/基准盒）+S9 检测器挂点 | +~170 |
| `src/renderer/features/reader/SelectionLayer.tsx` | evaluate 迁出+双路径接线（249→~200±5，测算 −47：evaluate 闭包 48 行+import 收缩 3−新接线 4；250 红线解除） | 净 −47~−55 |
| `src/renderer/features/reader/selection-geometry.ts` | createVisualScheduler 改 rAF 对齐：leading 首事件即排 rAF（≤16ms，S1b 零反馈红线保持）、帧内合帧去重、settle 防抖 200ms **零变**、cancel 清 rAF | +~35（144→~180） |
| `src/renderer/features/reader/selection-paint.tsx` | React.memo+props 稳定化 | +~8 |
| `docs/adr/0019-…md` / `docs/invariants.md` | §6 R3 段+INV-37 调度条款+INV-58 登记 | +~60 |

**INV-58（新登记草案）**：拖选期视觉与保存 rects 同几何管线——快路径必须复用 mergeLineRects+mergeRects+pixelBoxOf 同源函数族，禁止第二几何口径；settle 全量评估为保存与最终视觉的单一权威。锚定=selection-evaluate.test 快慢路径同夹具等价 it。

### 5.2 调度器新形态

- 视觉路：selectionchange→若本帧未排程则 requestAnimationFrame(evaluateVisual)——60Hz 上限、帧内天然合帧；可选 P2 自适应（自测时长 >8ms 隔帧降 30Hz）。
- settle 路：防抖 200ms 与 mouseup 即时全量**逐字保持**（工具条弹出语义/S1b 后半/selection-layer.test 全量不红）；**mouseup 的 cancel-before-evaluate 顺序保持**（现行 :161-175——防 settle 防抖在 mouseup 全量后补枪覆盖）。
- 清理：mouseup/卸载清 rAF 句柄（INV-14 同型）。
- **rAF×React 并发面申报**：rAF 回调内同步 setPaint 在非 act 环境/并发渲染下的交错由测试桩方案覆盖（vi.stubGlobal rAF 先例=selection-paint.test.tsx:324-327；vitest fake timers 默认 fake rAF，advanceTimersByTimeAsync(≥16) 触发）；rAF 后台/遮挡暂停影响面=隐藏态程序化选区视觉陈旧（cosmetic——Electron 单窗口+拖选需前台输入，真拖选不可触发）。

### 5.3 受锁测试配套清单（[locked-change] 预估）

- `tests/unit/renderer/selection-paint.test.tsx`（17 it）：S1b/S1c 两 it 改写为 rAF 语义（vi.stubGlobal rAF 先例在本件 b 面 :324-327）；S1/S2/S5 走 mouseup/防抖预计零改。
- `tests/unit/renderer/selection-layer.test.tsx`（14 it）：**预计零改**（设计断言面——若红即实现偏离）。
- `tests/unit/renderer/annotation-anchor.test.ts`：mergeLineRects 行为面 its 改写+交错夹具（T3）/pitch 污染夹具（T4）新 its——具体数以取证裁决后票面先红清单为准。
- `tests/e2e/reader-text.spec.ts` F-06 小票（:683-761）：预计零改（settle 态断言不受快路径影响）；可选新增拖选随动预算断言（程序化连发 selectionchange→2 帧内 paint 几何变更）。
- 新测试 always-active：`tests/unit/renderer/selection-evaluate.test.tsx`（快慢等价/缓存摊销/异常夹具/S9 降级门四组）。
- **调度器测试锚显式声明**：createVisualScheduler 现行**无直测**（grep tests/ 对 selection-geometry 直接 import 零命中——行为锚=selection-paint.test S1b/S1c 组件级，grep 实测）；rAF 改形后新单元「帧内合帧去重」（同帧多次 selectionchange 恰一次 evaluateVisual）至少锚一个 it——这是改形中唯一无现行对应物的新逻辑单元。

### 5.4 工单切分（三屋，串行）

1. **F-A6-a 取证票**：diag 脚本+用户同族 PDF 复现+裁决表（定 D1 修复集与 G2 阈值）。产出=修复集裁定，无实现面。
2. **F-A6-b D1 管线加固票**（依赖 a）：annotation-anchor 判据修+TextLayer rotation+G2 门+受锁改写。TDD：先红（交错/pitch 夹具）→绿→变异红证。
3. **F-A6-c D2 调度与快路径票**（依赖 a，与 b 串行防 SelectionLayer 冲突）：selection-evaluate 拆件+rAF 调度+S1b/S1c 改写；票面必须含「settle 产物落地**同帧覆盖**快路径产物」断言（松手瞬间快→settle 几何跳变面：元素容器边界差额+textNodes 两套枚举口径可差一 span 的 band 差——INV-58 等价 it 用文本边界夹具锚不住此族，须显式锚）。
4. **F-A6-d 收口票**：e2e 补断言+INV-37/58+ADR R3+locks 收账+verify 全绿。

## §6 ADR-0019 R3 修订草案段

**R3 修订：拖选视觉调度 rAF 对齐+评估双路径+几何管线加固（F-A6，2026-09-03）**

- **修订依据**：用户实报 2026-09-03（图证定性）——某 PDF 划选灰块锯齿拼接+右侧溢出，拖选反馈一卡一卡；五轮方案（F-06/07/08/09/A4+A5）后残留，远超「同类缺陷二次触发即重构」线，registry F-A6 立案纪律=设计文档先行。根因双独立：D1=几何源头在异常 text-layer 上错（自绘层照渲=所见即所存的几何源头错）；D2=拖选期 200ms 节流粒度（5Hz 步进）+每 tick 全量评估冗余（含与视觉无关的锚定序列化与二次几何往返）。
- **落地形态**：①视觉通道**不变**（::selection 保持 transparent、自绘并集层保持——本修订区别于 R1/R2 的通道级修订，是通道内调度与管线修订）；②拖选期=快路径（raw selection range clientRects→同一 mergeLineRects+mergeRects→缓存 bands，rAF 对齐 60Hz），settle（mouseup/防抖）=全量评估零变（锚定三元组/保存链权威单点）；③D1 公共面=mergeLineRects 全簇比较+pitch 鲁棒化+TextLayer rotation 通道（T1 待证——证伪则该项删除）+S9 降级门（检测偏离→抑制渲染+保存拒绝 toast，INV-02）；④INV-37 调度条款同步（200ms 防抖驱动→rAF 对齐双路），新 INV-58 锁「快路径同管线」；⑤**INV-37 语义弱化显式登记（Kimi 拟定裁决 2-§6——B 案成立的前置条件）**：拖选期视觉=**所见≈所存**（快路径几何为 settle 权威的瞬态近似，边界贴齐/band 口径差额由 settle 同帧终裁覆盖）；**松手及保存时刻所见即所存严格保持**（settle 全量为单一权威）。此弱化为本次修订的显式代价，登记而非隐含。
- **不随修订变化**：锚定三元组/保存链/INV-05 两路径同口径/F-12 触发阈值/选择模式（INV-42）/工具条定位与弹出语义（含拖选中停顿 >200ms 出条）/Escape 语义（INV-37 主体）。
- **已知边界申报**：①快路径用原始选区 range，选区边界落在元素容器（非文本节点）时与 settle 重构 range 有边界贴齐差额——settle 终裁覆盖，拖选期瞬时不计入所存（零宽差额 rect 被 mergeRects W_MIN 滤除，跳变面窄于直觉；但 textNodes 两套枚举口径差一 span 的 band 差由 F-A6-c 票面同帧覆盖断言显式锚）；②拖选会话缓存在 mid-drag zoom 时一帧陈旧（settle 纠正）；③旋转页修复后仍存的畸形文本层走 G2 降级门（拒绝优于错存）；④快路径与全量在 bands 上取同一 spanBandOf 数学但缓存键含基准盒——极端同帧缩放+拖选并发的带值以全量复核为准；缓存键浮点等值点：同布局批次内 gBCR 重复读逐位相同命中成立，ui-scale 补偿浮点残差（1/1.1×1.1≠1 精确）可致跨批次 miss+WeakMap 值内微膨胀（有界于 span 生命周期）；⑤若真机复评 B 案仍有可感卡顿，C 案（拖选原生+settle 接管）为备案单案，禁止与 B 并存（P10 方案切换=删旧）。

## 三、Kimi 拟定裁决全文（上游——核验其三前置条件是否真落入修订稿）

# F-A6 候选设计书拟定裁决

## 1. 总裁决

**可但有条件**——候选稿可作为设计基线，三条件如下：

1. **T1（页旋转）由「强嫌疑」降级为「待证候选」**：其全部证据（TextLayer.tsx:46-61 duckViewport rotation:0、PdfPageCanvas.tsx:111 viewport 含 rotate）**不在本包内**，我无从行级复核；且候选稿自证其病象（「整片错乱……比锯齿更剧烈」）与用户实报（锯齿拼接+右侧溢出）形态不吻合。设计书不得预选其为「取证第一判别项」，只能列为取证矩阵平等一项。
2. **markedContent 证伪结论降级为待核**：依赖 PdfPageCanvas.tsx:136-137（不在包内）。包内 text-layer.css 确实存在 .markedContent 规则（官方提取件），但「本应用 DOM 不产生 markedContent span」需取证票内 grep+运行时探针双证后方可写「证伪」。
3. **快路径必须显式保留现行四道收敛守卫**（见 §5 处置），候选稿 §5.1 对 evaluateVisual 的职责描述遗漏此面，属实质设计缺口——不补则跨页拖选会把跨页 clientRects 归一化进单页盒，制造新 D1 同族错乱源。

D1/D2 的机理推演主体、三案对比结论、工单切分（a 取证→b 管线→c 调度→d 收口）经我独立复核成立，采纳为基线。

## 2. 分节处置表

| 节 | 处置 |
|---|---|
| §0 一页纸决策摘要 | **改写**：T1 表述降级（见 2-§0） |
| §1 态空间表 | **采纳**（S0~S8 与 Q1~Q9 逐格复核 SelectionLayer/scheduler 现行行为一致；S9 为设计新增，标注正确） |
| §2 D1 机理推演 | **改写**：a/b/d 采纳；c 改换证据锚；markedContent/T1 降级（见 2-§2） |
| §3 D2 机理推演 | **采纳**（3.1/3.2/3.3/3.4 全部经包内源码复核成立，见清单） |
| §4 三案对比 | **采纳**（我独立同意 B，见 §4 表态） |
| §5 推荐案落地蓝图 | **改写**：补快路径守卫条款+TextLayer 行数标注待证（见 2-§5） |
| §6 ADR-0019 R3 草案段 | **改写**：INV-37 语义弱化须显式登记（见 2-§6） |

### 2-§0 改写指令

位置：§0「病根判定」D1 段。
原文摘录：「**新增强嫌疑 T1=页旋转 /Rotate≠0（TextLayer duckViewport rotation:0 与 canvas viewport 含 page.rotate 结构性错位，组件自认限制在档）**」
新文：「**待证候选 T1=页旋转 /Rotate≠0**：嫌疑源自 TextLayer/PdfPageCanvas 的旋转坐标系处置（证据档不在本设计包内，F-A6-a 取证票先行行级复核后入档）；其预期病象（整片错位）与用户实报（锯齿+右溢）形态不吻合，列取证矩阵平等项，不预选。」

### 2-§2 改写指令（三处）

① 位置：2.1 c 段。原文摘录：「textLayer=inset:0+显式 width/height=canvas CSS 尺寸（TextLayer.tsx:97-104；text-layer.css:47-61），父盒=div.relative.h-fit（PageBox.tsx:55）——**同盒严格成立**」
新文：「textLayer=position:absolute+inset:0（text-layer.css 在档规则）→ 与定位父盒同盒由 inset:0 单独保证；host=textLayer.parentElement（selection-paint.tsx 在档）→ 百分比基准与渲染宿主同盒**成立**；父盒定位属性（relative）与显式尺寸声明引自包外文件，取证票补核，不构成本结论的承重腿。」

② 位置：2.1「markedContent/endOfContent 是否进 collectSpans/Range」段。原文摘录：「① getTextContent 未开 includeMarkedContent 且 items 过滤掉无 str 结构项（PdfPageCanvas.tsx:136-137）→**DOM 无 markedContent span**」
新文：「① getTextContent 调用面（PdfPageCanvas.tsx，包外）是否开 includeMarkedContent 待 F-A6-a 行级复核+运行时探针（document.querySelectorAll('.textLayer .markedContent') 计数）双证；在证据入档前结论写**预判证伪**而非证伪。② endOfContent 证伪成立：无文本节点不进 collectSpans 且 user-select:none（text-layer.css 在档规则），维持。」

③ 位置：2.1 T1 段首。原文摘录：「**T1 页旋转（新增强嫌疑）**」
新文：「**T1 页旋转（待证候选，证据包外）**」。段尾「列为取证第一判别项」改为「列入取证矩阵 T1 项，判别优先级由取证票按复现结果裁定」。

### 2-§5 改写指令（两处）

① 位置：5.1 表格 selection-evaluate.ts 行，「evaluateVisual（快路径：raw range clientRects→同源 merge→缓存 bands）」后追加：
新文：「**守卫前置（强制条款）**：evaluateVisual 必须复用现行 evaluate 的四道收敛守卫——(i) sel null/rangeCount 0/isCollapsed→setPaint(null)；(ii) closestPageRoot(anchorNode)≠closestPageRoot(focusNode)→setPaint(null) 静默（visualOnly 不 toast，现行语义）；(iii) 页外/textLayer 缺→setPaint(null)；(iv) range.getBoundingClientRect() 零宽零高→setPaint(null)。缺一则跨页/坍缩拖选会把跨页 clientRects 归一化进单页 pixelBoxOf=textLayer 盒=新 D1 同族错乱源。归一化基准=选区所在页 textLayer 的 pixelBoxOf（与 settle 同盒）。」

② 位置：5.1 表格 TextLayer.tsx 行。原文摘录：「duckViewport 增 rotation 通道（pdfPage.rotate 经 onPageRender 载荷上抛，PdfPageCanvas.tsx:135-140 载荷面加字段；rawDims 改未旋转尺寸）+~25」
新文：「duckViewport rotation 通道（**行号与改法以 F-A6-a 对 TextLayer/PdfPageCanvas 的行级复核为准**；若 T1 证伪则本行整行删除，F-A6-b 票面不含旋转面）+~25（预估，待证）」

### 2-§6 改写指令

位置：§6 R3 段「落地形态」②后追加一条（并同步 INV-37 修订条款）：
新文：「⑤INV-37 语义弱化显式登记：拖选期视觉=**所见≈所存**（快路径几何为 settle 权威的瞬态近似，边界贴齐/band 口径差额由 settle 同帧终裁覆盖）；**松手及保存时刻所见即所存严格保持**（settle 全量为单一权威）。此弱化为本次修订的显式代价，登记而非隐含。」
另：§6 已知边界①②④保留（候选稿申报充分）。

## 3. 承重断言复核清单

✓ **scheduler 连续事件下视觉 5Hz 步进**——selection-geometry.ts createVisualScheduler：leading 门 `now-last≥ops.windowMs`、trailing `setTimeout(windowMs-(now-last))`，连续触发下更新间隔恒 ≈200ms。
✓ **evaluate 双遍冗余（第二遍 rects 逐位相同）**——SelectionLayer.evaluate 先调 selectionToAnchor(textLayer, sel)（anchor-serialize.ts：collectSpans+offsetToPoint+rectsBetweenPoints(first,last,pixelBoxOf(root))），再调 findRangeAtOffset(textLayer, anchor.start, anchor.end)（annotation-anchor.ts：collectSpans 第二遍+rectsBetweenPoints 同 first/last 同 base）。同 root 同偏移→产物相同，唯一增量=textNodes。候选稿此判定精确。
✓ **quote/prefix/suffix 视觉路径零消费**——anchor 三字段仅流入 pending（SelectionLayer save() 消费），visualOnly 分支在 setPending 前 return，但 anchor 已构建。浪费属实。
✓ **bands 每 span 双 getComputedStyle+measureText**——annotation-resolve.ts spanBandOf→fontSizeOf（parseFloat(getComputedStyle)）+metricsOf（getComputedStyle+ctx.font+measureText）。
✓ **mergeLineRects 只与末簇比较**——annotation-anchor.ts 聚类循环：`const gi = rowGroups.length - 1`，比对对象恒为末簇；注释自认「失联另起簇」限制在档。
✓ **mergeSegment x 并集+y/h 主导**——annotation-anchor.ts mergeSegment：`left=Math.min…right=Math.max…y: dom.y`。
✓ **matchBand 门 |Δcenter|≤r.h**——annotation-resolve.ts matchBand 返回条件在档；r 跨行时门恒过的推导成立。
✓ **mergeNear x0/x1 端点并集**——annotation-resolve.ts mergeNear：`near.x0=Math.min…near.x1=Math.max…`；clampedHorizontal 以此夹取（annotation-style.ts 在档）→跨行误并带使夹取基准变宽=右溢保持链成立。
✓ **归一化基准与渲染宿主同盒**——setPaint 用 pixelBoxOf(textLayer)（SelectionLayer.evaluate）；host=textLayer.parentElement（selection-paint.tsx）；.textLayer{position:absolute;inset:0}（text-layer.css）。同盒成立（证据锚已按 2-§2① 调整）。
✓ **::selection 现行 transparent**——text-layer.css `.textLayer ::selection{background:transparent}`（F-A4 状态）在档。
✓ **setPaint 恒新对象+key={i} 复用**——SelectionLayer evaluate setPaint 字面量新对象；selection-paint.tsx `key={i}`。D2c「复用非整拆、无 memo」判定成立。
✓ **mouseup cancel-before-evaluate**——SelectionLayer.onMouseUp 先 `scheduler.cancel()` 后 `evaluate(true,false)`，在档。
✓ **S1' 停顿 >200ms 出条为现行语义**——debounce 每事件重置，停顿超时触发 onSettled→evaluate(false,false)→setPending，无需 mouseup。在档。
✓ **clientRectsBetween 回退真机不触发**——回退仅在 getClientRects 缺席/空返回（annotation-anchor.ts），且 evaluate 零宽盒预检先行拦截零文本区间。判定成立。
✓ **快路径可砍冗余清单第 1/2/3 项**——与上述双遍冗余/零消费判定互为表里，成立。
? **T1 旋转结构性错位**——证据文件 TextLayer.tsx/PdfPageCanvas.tsx 不在包内；需行级复核+page.rotate 探针。缺：两文件源码。
? **markedContent 不产生**——依赖 PdfPageCanvas.tsx 的 getTextContent 调用面（包外）。缺：该文件源码+运行时探针计数。
? **annotation-merge.ts 全簇比较先例+W_MIN 滤零宽**——文件不在包内；annotation-anchor.ts 头注提及「归一化域滤零宽」可旁证 W_MIN 类语义存在，但 26-28 行先例与 §6 边界①的精确引用待核。
? **受锁测试面引用**（selection-paint.test 17 it/S1b/S1c/`:324-327` stubGlobal 先例、selection-layer.test 14 it、reader-text.spec:683-761）——全部在包外。候选稿自称「grep 实测」，F-A6-c 票面须以实际 grep 输出为准重列。
? **SelectionLayer 249 行→~200 测算**——包内体量与「贴 250 红线」叙述一致（头注+组件≈此量级），但精确行数与 −47 测算无从复核，按预估处理。
? **真机「单 tick CPU 十毫秒级」**——包内无性能实测档，属合理外推（数千 span×双 getComputedStyle+measureText 量级），F-A6-a diag 应顺带落 tick 时长实测把「?」转「✓」。

## 4. 三案对比表态

**我独立同意推荐案 B**，论证不引候选稿原文，自行重建：

1. **A（回原生）不可行是结构性结论，非口味**：R1 修订的触发是用户根治令（多行重叠叠深 0.20×2≈0.36），且 CSS 面两路已在档试败——F-06 不透明遮字、F-08 半透明叠深（text-layer.css 头注三轮登记在档）。选 A=第六轮通道震荡+推翻已锚定面（INV-37 e2e+单测+真机 12/12），收益只是拖选期流畅度——而 B 用调度修订即可拿到同等流畅度，无需付这个价。
2. **C（混合通道）的接缝即病灶**：native→paint 的 settle 换帧若不同帧则闪变/双渲染，须新跨帧状态机；本仓五轮事故（F-06/07/08/A4/A5）均为通道/层序接缝类。在 B 的快路径预算（亚毫秒~2ms/tick）可信的前提下，C 的唯一优势（拖选期零 JS）不抵其接缝风险。候选稿「C 为备案单案、禁与 B 并存（P10）」的处置正确，保持。
3. **B 的成立性有两条独立支柱**：(i) D2a（5Hz 粒度）与 D2b（双遍冗余）均经包内源码逐行证实（见清单），rAF 对齐+快路径砍冗余直接作用于两个已证实的病因，不是猜测性优化；(ii) settle 全量权威零变=保存链/工具条语义/受锁测试主体不受扰，快路径为可整体摘除的新件，回滚面最小。
4. **附带保留**：B 的代价是 INV-37 在拖选期由「所见即所存」弱化为「所见≈所存」（快路径 raw range 与 settle 重构 range 的边界贴齐/band 口径差额）。此弱化真实存在，候选稿以「settle 同帧终裁覆盖」兜底的方向正确，但必须按 2-§6 改写显式登记，不得隐含——这是我对 B 同意的前置条件。

**最终处置**：候选稿按 §2 六处改写指令修订后，即为本工单一的设计基线；三条件（T1 降级、markedContent 待核、快路径守卫条款）任一不落入终稿则退回。
## 四、核心源码摘录（证据基准——SelectionLayer/selection-geometry/selection-paint）

### src/renderer/features/reader/SelectionLayer.tsx
```
// b3: P7-F
/**
 * [SR-RDR-05] SelectionLayer —— 文本选择→定位器（工单：done / weak，依赖 anchor-serialize——F-ARCH4 拆件后经其间接消费 annotation-anchor）
 *
 * **F-02 四层多页化收口（动态锚定根；注册文件=anchor-locate.ts）**：锚定根=
 * 选区 anchorNode/focusNode 向上最近页盒（纯函数页盒遍历，selection-geometry），
 * 挂载盒≠选区所在页仍正确；选区态状态机：无选区→页内选区→工具条操作→清；
 * 跨页/跨出页盒→不创建+toast（mouseup 时刻，INV-02 禁静默；防抖路径静默防
 * 拖选中途刷屏）；选区所在页回收/文本层重建（zoom 同机制）→选区清→层与
 * 工具条收（防悬空锚）；页外选区静默收起。确认后经
 * anchor-serialize.selectionToAnchor 生成锚定三元组→落库（保存页=选区所在页
 * 0 基动态推导）→onSaved 刷新层；保存成功 removeAllRanges+层随清。
 *
 * **F-A4 划选视觉=自绘并集层（ADR-0019 R1 修订——取代历史原生路线，
 * 修订依据=票面 §0a 用户根治令）**：SelectionPaint（selection-paint.tsx，
 * portal 进选区所在页盒，z2 灰 0.20 在标注 multiply 层之下——R2-F-10 观感
 * 保持）渲染 evaluate 管线归并产物（与保存 rects 同源，所见即所存）；::
 * selection 转 transparent（text-layer.css）。当年删自绘两病根已解（拖选
 * 零反馈→selectionchange 200ms 防抖路径在场；accent 近不可见→观感灰在案）。
 * 层随**选区**真清除而消失（INV-37 修订：Escape 只清 pending/工具条）。
 * 工具条定位 [c 面]：视口差值÷有效 zoom（localScale）归一到挂载盒本地+
 * 滚动容器可视区夹取+选区近顶下翻转（selection-geometry 纯函数——修
 * ui-scale≠1 双重放大+偏远缺陷）。层叠序完整推演见 selection-paint.tsx 头注。
 *
 * ── 接口层 ── / ── 架构层 ──
 * - props 形状不变=挂载位契约零改；closestPageRoot/pageIndexOf 经本文件再
 *   导出（实现在 selection-geometry——F-A4 拆件，导出面零变）。锚定根=
 *   选区所在页盒内 .textLayer 动态获取；annotation-anchor 仍是唯一 DOM
 *   遍历点；工具条/自绘层落点以选区所在页盒为参照系（N-C 防层叠污染）
 *
 * ── 生命周期层 ── / ── 文化层 ──
 * - mouseup 即时、防抖兜底（程序化选选不触发 mouseup）；翻页/换文献/卸载
 *   收起退订。测试：selection-layer/selection-paint.test（F-A4 三面）
 */
import { useEffect, useRef, useState } from 'react'
import type { Annotation, AnnotationInput, AnnotationKind, AnnotationRect } from '@shared/models/annotation'
import { api, unwrap, ApiClientError } from '../../api/client'
import { showToast } from '../../shared/ui/Toast'
import { selectionToAnchor, type SelectionAnchor } from './anchor-serialize'
import { findRangeAtOffset, pixelBoxOf } from './annotation-anchor'
import { bandsForTextNodes, type RowBand } from './annotation-resolve'
import { pushUndo } from './annotation-undo'
import { SelectionToolbar } from './SelectionToolbar'
import { SelectionPaint } from './selection-paint'
import { closestPageRoot, pageIndexOf, toolbarMountPos, createVisualScheduler } from './selection-geometry'
import { useReaderStore } from './reader.store'

// 纯函数页盒遍历（F-02）在 selection-geometry.ts——F-A4 拆件，导出面经本文件再导出（票面 §2）
export { closestPageRoot, pageIndexOf } from './selection-geometry'

/** 意外异常（非 ApiClientError）时的兜底中文消息 */
const SAVE_FAILED = '标注保存失败'

/** 跨页/跨出页盒选区的拒绝提示（F-02 主控裁决：INV-02 可见，禁静默） */
const CROSS_PAGE_HINT = '选区跨页，不支持创建标注'

/** selectionchange 窗口（毫秒）：自绘层节流与工具条防抖同值两路（B1） */
const SELECTION_DEBOUNCE_MS = 200

/** F-12 工具条误触发阈值（px）：位移小于此值=单击/双击（含选词）不出条
 *  （用户令「一点就出选项条」；无 mousedown 记录的程序化/键盘选区不设限） */
const DRAG_SELECT_THRESHOLD_PX = 3

/** 待确认的划选（锚定结果+选区所在页 0 基+工具条挂载盒本地落点） */
interface PendingSelection {
  anchor: SelectionAnchor
  pageNo: number
  x: number
  y: number
}

/** [F-A4 a 面] 自绘并集层状态（页盒+归并 rects+F-A5 行簇字形带；清除=层卸载） */
interface PaintSelection {
  root: HTMLElement
  rects: AnnotationRect[]
  bands: RowBand[]
}

export function SelectionLayer(props: {
  pageRoot: HTMLElement | null
  paperId: string
  page: number
  onSaved: (a: Annotation) => void
}): JSX.Element | null {
  const { pageRoot, paperId, onSaved } = props
  const [pending, setPending] = useState<PendingSelection | null>(null)
  const [paint, setPaint] = useState<PaintSelection | null>(null)
  const [busy, setBusy] = useState(false)
  // per-tab 选择器（TABS-01）：active tab 颜色（无 tab 回退默认黄）
  const color = useReaderStore((s) => s.tabs[s.activeId ?? '']?.color ?? 'yellow')
  const setColor = useReaderStore((s) => s.setColor)
  const toolbarRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (pageRoot === null) return

    /** 评估选区（动态锚定根）：页内锚定；跨页拒绝（mouseup 提示）；页外/不可锚定/零宽静默收（层随清）。
     *  visualOnly=[B1 回炉] 拖选期节流路径——只更新自绘层（视觉反馈），不动
     *  pending（工具条弹出语义独属防抖/mouseup 全量评估，零变） */
    const evaluate = (fromMouseUp: boolean, visualOnly: boolean): void => {
      const sel = window.getSelection()
      if (sel === null || sel.rangeCount === 0 || sel.isCollapsed) {
        if (!visualOnly) setPending(null)
        setPaint(null)
        return
      }
      const anchorRoot = closestPageRoot(sel.anchorNode)
      const focusRoot = closestPageRoot(sel.focusNode)
      if (anchorRoot !== focusRoot) {
        // 跨页/跨出页盒：不创建+toast（INV-02 禁静默——仅挂 mouseup 时刻，
        // 防抖路径静默防拖选中途刷屏）
        if (fromMouseUp) showToast(CROSS_PAGE_HINT, 'info')
        if (!visualOnly) setPending(null)
        setPaint(null)
        return
      }
      // 两边界同盒（同为 null=页外选区——静默收起，与页列无关）
      const pageNo = anchorRoot === null ? null : pageIndexOf(anchorRoot)
      const textLayer = anchorRoot?.querySelector('.textLayer') as HTMLElement | null
      const anchor = pageNo === null || textLayer === null ? null : selectionToAnchor(textLayer, sel)
      // textLayer 非空由 anchor 非空蕴含——并列检查保留防御语义
      if (anchor === null || textLayer === null) {
        if (!visualOnly) setPending(null)
        setPaint(null)
        return
      }
      const box = sel.getRangeAt(0).getBoundingClientRect()
      if (box.width === 0 && box.height === 0) {
        if (!visualOnly) setPending(null)
        setPaint(null)
        return
      }
      // [F-A4 a] 自绘并集层=保存 rects 同源；[F-A5 a/b] bands=行簇字形带
      // **节点口径**（选区自身 textNodes——免疫 CSS 行盒整体偏移错绑上一行，
      // 真机实锤小字号紧排文档行盒偏上 ~9px）；退化空数组=行盒原样回退
      const range = findRangeAtOffset(textLayer, anchor.start, anchor.end)
      setPaint({ root: anchorRoot!, rects: anchor.rects, bands: range !== null ? bandsForTextNodes(range.textNodes.map((t) => t.node), pixelBoxOf(textLayer)) : [] })
      if (visualOnly) {
        return
      }
      // [F-A4 c 面] 工具条挂载盒本地落点（翻转+夹取+÷有效 zoom——geometry 域）
      const { x, y } = toolbarMountPos(pageRoot, { x: box.x, y: box.y, width: box.width, height: box.height })
      setPending({ anchor, pageNo: pageNo!, x, y })
    }

    // [B1 回炉] selectionchange 双路调度（selection-geometry 域工厂）：自绘层
    // =leading+trailing 节流（拖选期持续触发下纯防抖永不落地=历史删自绘轮
    // 的零反馈病根复活，ADR-0019 R1 修订档）；工具条评估=防抖（弹出语义零变）
    const scheduler = createVisualScheduler({
      onVisual: () => evaluate(false, true),
      onSettled: () => evaluate(false, false),
      windowMs: SELECTION_DEBOUNCE_MS
    })
    // F-12：记录最近一次 mousedown 落点（NaN=无记录——程序化事件/未捕获）
    let downX = Number.NaN
    let downY = Number.NaN
    const onMouseDown = (e: MouseEvent): void => {
      ;[downX, downY] = [e.clientX, e.clientY]
    }

    const onMouseUp = (e: MouseEvent): void => {
      // 工具条自身的 mouseup 不评估（按钮 mousedown 已阻止选区坍缩，交由 click 处理）
      if (e.target instanceof Node && toolbarRef.current?.contains(e.target) === true) return
      scheduler.cancel()
      // F-12：位移过小=单击/双击误触不出条（自绘层留待防抖路径随选区坍缩清除）
      if (Number.isFinite(downX)) {
        const moved = Math.hypot(e.clientX - downX, e.clientY - downY)
        downX = downY = Number.NaN
        if (moved < DRAG_SELECT_THRESHOLD_PX) {
          setPending(null)
          return
        }
      }
      evaluate(true, false)
    }
    const onKeyDown = (e: KeyboardEvent): void => {
      // INV-37（F-A4 修订）：Escape 只清组件态；自绘层随**选区**真清除而消失
      if (e.key === 'Escape') setPending(null)
    }

    document.addEventListener('selectionchange', scheduler.handler)
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('mouseup', onMouseUp)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('selectionchange', scheduler.handler)
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('mouseup', onMouseUp)
      document.removeEventListener('keydown', onKeyDown)
      scheduler.cancel()
      setPending(null)
      setPaint(null)
    }
    // 依赖=挂载盒+文献（F-02：page 不再参与——锚定根动态；挂载盒引用变化
    // 已覆盖锚定页切换的重挂清理语义）
  }, [pageRoot, paperId])

  /** 按当前色+kind 落库（page=选区所在页 0 基——F-02）；成功后清选区刷新 store */
  async function save(kind: AnnotationKind): Promise<void> {
    if (pending === null || busy) return
    const input: AnnotationInput = {
      page: pending.pageNo, kind, color,
      quoteText: pending.anchor.quote, prefixText: pending.anchor.prefix,
      suffixText: pending.anchor.suffix, startOffset: pending.anchor.start,
      endOffset: pending.anchor.end,
      rects: pending.anchor.rects.map((r) => ({ ...r, page: pending.pageNo })),
      comment: ''
    }
    setBusy(true)
    try {
      const saved = await unwrap(api.reader.saveAnnotation({ paperId, annotation: input }))
      onSaved(saved)
      // 撤销栈：create 逆=delete（UNDO-01 成功路径入栈）
      pushUndo(paperId, { kind: 'create', annotation: saved })
      // 保存落地即清除该面灰点（TABS-03 乐观清除语义）
      useReaderStore.getState().clearTabDirty(paperId)
      setPending(null)
      // 自绘层随本次 removeAllRanges 同步清除（不等防抖）
      setPaint(null)
      window.getSelection()?.removeAllRanges()
    } catch (e) {
      // 保存失败：tab 灰点置位（失败残留可见——TABS-03 两写面之一）
      useReaderStore.getState().markTabDirty(paperId)
      showToast(e instanceof ApiClientError ? e.message : SAVE_FAILED, 'error')
    } finally {
      setBusy(false)
    }
  }

  if (pending === null && paint === null) return null

  return (
    <>
      {/* 划选视觉=自绘并集层（F-A4/ADR-0019 R1 修订+F-A5 band 对齐——头注）；生命周期=选区 */}
      {paint !== null ? <SelectionPaint root={paint.root} rects={paint.rects} bands={paint.bands} /> : null}
      {pending !== null ? (
        <SelectionToolbar
          containerRef={toolbarRef}
          x={pending.x}
          y={pending.y}
          busy={busy}
          color={color}
          onColor={setColor}
          onSave={(kind) => void save(kind)}
        />
      ) : null}
    </>
  )
}
```

### src/renderer/features/reader/selection-geometry.ts
```
/**
 * [F-A4] selection-geometry —— 划选几何域（纯函数+常量，自 SelectionLayer 拆出
 * ——组件 ≤250 行红线预裁；票面 §3 拆件结构）。
 *
 * ── 行为层 ──
 * - closestPageRoot/pageIndexOf 自 SelectionLayer 迁入（F-02 纯函数页盒遍历，
 *   行为零变；原导出面经 SelectionLayer 再导出保持 API 零变——票面 §2）。
 * - localScale（c 面「坐标系双重放大」根治单源）：视口 px 差值 ÷ 有效 zoom
 *   归一到挂载盒本地 px。比值=el.clientWidth（CSS 本地布局 px，不含祖先
 *   zoom）/el.gBCR.width（根框视觉 px，含全部祖先 zoom 复合）——任意嵌套
 *   zoom（.app-content-row 的 ui-scale 等）自动复合，零 CSS 类耦合（不查
 *   挂载点类名——改挂载点/加档不破）。思想 crib lineage-viewport
 *   rootToLocalScale（F-L2/INV-43），reader 域新写不复用跨域 import
 *   （票面 §0c 裁决）。任一量测 ≤0（未挂载/不可量测——jsdom 桩面
 *   clientWidth 恒 0）→1（防御：退化直通，不产生除零/NaN）。
 * - toolbarViewportPos：工具条视口域定位（票面 §1c）——选区上方 TOOLBAR_ABOVE
 *   常规位；选区顶距滚动容器可视区顶 <TOOLBAR_ABOVE（工具条高+间隙）时
 *   **下翻转**（放选区下方 TOOLBAR_BELOW_GAP）；随后对滚动容器可视区做
 *   **夹取**（工具条不越滚动容器）。scroller=null（无滚动容器上下文——
 *   单测桩面/非阅读器挂载）不翻转不夹取，落点=选区原生位置。
 *
 * ── 接口层 ── / ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - 全纯函数零 React/DOM 写依赖（gBCR/clientWidth 只读）；组件测试：
 *   tests/unit/renderer/selection-layer.test.tsx（P1 归一）+
 *   tests/unit/renderer/selection-paint.test.tsx（c 面三态）。
 */
/** 工具条定位：估算宽度（水平夹取）与选区上方留白（F-07 既有值） */
export const TOOLBAR_WIDTH = 180
export const TOOLBAR_ABOVE = 42
/** 工具条估算高度（垂直夹取）与下翻转间隙（F-A4 c 面新增） */
export const TOOLBAR_HEIGHT = 32
export const TOOLBAR_BELOW_GAP = 8

/** 视口矩形（gBCR 口径——getBoundingClientRect 的结构化形状） */
export interface ViewportBox {
  x: number
  y: number
  width: number
  height: number
}

/** F-02：节点向上最近页盒（[data-page-root] 元素——页列渲染窗内页才有；
 *  锚定根动态遍历的纯函数，测试直测） */
export function closestPageRoot(node: Node | null): HTMLElement | null {
  let cur: Node | null = node
  while (cur !== null) {
    if (cur instanceof HTMLElement && cur.hasAttribute('data-page-root')) {
      return cur
    }
    cur = cur.parentNode
  }
  return null
}

/** F-02：页盒页号（data-page-root 值 1 基→0 基页码；缺失/非法值 null） */
export function pageIndexOf(root: HTMLElement): number | null {
  const no = Number(root.getAttribute('data-page-root'))
  return Number.isInteger(no) && no >= 1 ? no - 1 : null
}

/** 视口→挂载盒本地坐标比值（1/有效 zoom；量测退化→1 直通） */
export function localScale(el: Element, rect?: DOMRect): number {
  const rw = (rect ?? el.getBoundingClientRect()).width
  const cw = el.clientWidth
  return rw > 0 && cw > 0 ? cw / rw : 1
}

/** 工具条视口域定位：上方常规位→近顶下翻转→滚动容器可视区夹取（纯函数） */
export function toolbarViewportPos(sel: ViewportBox, scroller: ViewportBox | null): { x: number; y: number } {
  let y = sel.y - TOOLBAR_ABOVE
  let x = sel.x
  if (scroller !== null) {
    // 下翻转：选区顶距可视区顶不足一个常规位（工具条高+间隙≈TOOLBAR_ABOVE）
    // ——放选区下方（票面 §1c「选区近顶时下翻转」）
    if (sel.y - scroller.y < TOOLBAR_ABOVE) {
      y = sel.y + sel.height + TOOLBAR_BELOW_GAP
    }
    // 视口夹取：工具条整体落在滚动容器可视区内（票面 §1c「不越滚动容器可视区」）
    const maxY = Math.max(scroller.y + scroller.height - TOOLBAR_HEIGHT, scroller.y)
    y = Math.min(Math.max(y, scroller.y), maxY)
    const maxX = Math.max(scroller.x + scroller.width - TOOLBAR_WIDTH, scroller.x)
    x = Math.min(Math.max(x, scroller.x), maxX)
  }
  return { x, y }
}

/** [F-A4 c 面] 工具条挂载盒本地落点装配：视口域定位（翻转+夹取）→÷有效 zoom
 *  归一（挂载盒在 ui-scale 缩放子树内——直写视口差会被 CSS zoom 二次放大） */
export function toolbarMountPos(pageRoot: HTMLElement, sel: ViewportBox): { x: number; y: number } {
  const mountBox = pageRoot.getBoundingClientRect()
  const scale = localScale(pageRoot, mountBox)
  const scBox = pageRoot.closest('.overflow-auto')?.getBoundingClientRect()
  const vp = toolbarViewportPos(
    sel,
    scBox === undefined ? null : { x: scBox.x, y: scBox.y, width: scBox.width, height: scBox.height }
  )
  return { x: (vp.x - mountBox.x) * scale, y: (vp.y - mountBox.y) * scale }
}

/** [B1 回炉] selectionchange 双路调度器：自绘层视觉=leading+trailing 节流
 *  （拖选全程持续触发时纯防抖的 timer 永远重置——::selection 已 transparent
 *  则拖选期零视觉反馈=历史删自绘轮的同型病根复活，ADR-0019 R1 修订档）；
 *  工具条评估=防抖（既有弹出语义零变）。工厂返回 handler（addEventListener
 *  直用）+cancel（mouseup/卸载成对清理——INV-14 同型）。 */
export function createVisualScheduler(ops: {
  onVisual(): void
  onSettled(): void
  windowMs: number
}): { handler(): void; cancel(): void } {
  let debounce: number | null = null
  let trailing: number | null = null
  let last = 0
  return {
    handler: () => {
      const now = Date.now()
      if (now - last >= ops.windowMs) {
        last = now
        if (trailing !== null) {
          window.clearTimeout(trailing)
          trailing = null
        }
        ops.onVisual()
      } else if (trailing === null) {
        trailing = window.setTimeout(() => {
          trailing = null
          last = Date.now()
          ops.onVisual()
        }, ops.windowMs - (now - last))
      }
      if (debounce !== null) window.clearTimeout(debounce)
      debounce = window.setTimeout(() => ops.onSettled(), ops.windowMs)
    },
    cancel: () => {
      if (debounce !== null) {
        window.clearTimeout(debounce)
        debounce = null
      }
      if (trailing !== null) {
        window.clearTimeout(trailing)
        trailing = null
      }
    }
  }
}
```

### src/renderer/features/reader/selection-paint.tsx
```
/**
 * [F-A4] SelectionPaint —— 划选视觉并集自绘层（ADR-0019 R1/R2 修订；票面 §1a）。
 *
 * - 数据=SelectionLayer evaluate 产出的锚定 rects（mergeLineRects+mergeRects
 *   归并产物——与保存 rects 同源，「所见即所存」S2）；单层单绘：相邻行重叠
 *   输入经归并后两两分离，重叠处不再逐 span 叠深（native ::selection 的
 *   0.20×2≈0.36 加深缺陷根治）。
 * - 色 rgba(0,0,0,0.20)：同修前观感（R2-F-10 灰 0.20 在案；白纸合成
 *   ≈#CCCCCC 可辨）。
 * - [F-A5 a 面] 块几何=行簇字形带单源（bandsNearRects 产 RowBand——与
 *   标注/AI 三消费点同基准）：垂直=band（顶贴字形顶/底贴底缘——修前
 *   CSS 回退行盒在小字号文档上 1.5~2 倍行高、上下溢出约半行，真机基线
 *   1.57~1.83× 在档）；水平=行簇 span 实际端点夹取（clampedHorizontal
 *   ——修前行盒越出文字区）。band 缺席（jsdom/量测退化）→ 行盒原样
 *   （缺省兼容）。
 * - 渲染=React portal 进选区所在页盒：宿主取 .textLayer 父盒（与
 *   textLayer/AnnotationLayer 同 inset-0 同盒）——rects 归一化基准=
 *   pixelBoxOf(textLayer)，百分比数学与其严格同盒零换算；且页列
 *   `zoom: calc(1/var(--ui-scale))` 在档位≠1 时创建 stacking context，
 *   层必须与色块层同 context。
 * - [F-A5 c 面/ADR-0019 R2] z=PAGE_LAYER_Z.selectionPaint（3）——页内
 *   层序单源：色块背景板(1) < canvas 墨带(2) < 自绘选区(3)（选区交互视觉
 *   保持最上，票面 §0c/S4 灰块视觉在色块上）。
 * - 生命周期=选区生命周期（evaluate 置位/清除置空——INV-37 视觉-状态严格
 *   同步；Escape 只清工具条，层随选区真清除而消失）；pointer-events:none
 *   防吞划选手势。
 * - 组件测试：tests/unit/renderer/selection-paint.test.tsx（S1~S5+F-A5 段
 *   a1/a2/c1/c2）+selection-layer.test.tsx（F-A4 反转守卫）。
 */
import { createPortal } from 'react-dom'
import type { AnnotationRect } from '@shared/models/annotation'
import { matchBand, type RowBand } from './annotation-resolve'
import { bandVertical, clampedHorizontal } from './annotation-style'
import { PAGE_LAYER_Z } from './page-layer-z'

/** 自绘并集层灰（F-A4：观感同修前 ::selection rgba(0 0 0 / 0.20)） */
const PAINT_BG = 'rgba(0, 0, 0, 0.20)'

export function SelectionPaint(props: {
  /** 选区所在页盒（[data-page-root]——portal 目标树的根） */
  root: HTMLElement
  /** 归一化并集矩形（evaluate 管线产物——与保存 rects 同源） */
  rects: AnnotationRect[]
  /** [F-A5] 行簇字形带（bandsNearRects 产物——缺省=行盒原样回退） */
  bands?: RowBand[]
}): JSX.Element {
  const { root, rects, bands } = props
  // 宿主=.textLayer 父盒（结构常量：textLayer 与标注层同挂该盒的 inset-0）；
  // 异常结构兜底=页盒自身（几何同页，不劣于缺层）
  const textLayer = root.querySelector('.textLayer')
  const host = textLayer?.parentElement ?? root
  return createPortal(
    <div
      data-testid="selection-rects"
      className="absolute inset-0"
      style={{ zIndex: PAGE_LAYER_Z.selectionPaint, pointerEvents: 'none' }}
    >
      {rects.map((r, i) => {
        // [F-A5 a] 同一 matchBand 匹配键（最近中心带）——与标注层渲染同基准
        const band = matchBand(bands, r)
        const vertical = band !== undefined ? bandVertical(band) : { top: `${r.y * 100}%`, height: `${r.h * 100}%` }
        const horizontal = band !== undefined ? clampedHorizontal(r, band) : { left: `${r.x * 100}%`, width: `${r.w * 100}%` }
        return (
          <div
            key={i}
            data-testid="selection-rect"
            className="absolute"
            style={{
              ...horizontal,
              ...vertical,
              background: PAINT_BG
            }}
          />
        )
      })}
    </div>,
    host
  )
}
```
