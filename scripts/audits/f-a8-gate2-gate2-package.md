# F-A8 门 2 主链切换票 ·门二终审材料包（deepseek v4flash,零仓库接触）

你是终审官。审 F-A8 门 2（标注重锚主链切换——S0~S6 状态机+DOM 链降回退+INV 四条登记）终位。已过门一 Kimi K3 PWW（5W2N）+回炉一轮闭合（W1 S6 名实补注[项盒健康代理]/W4 AI 侧 CR1 竞态用例+M1' 变异红证[双组件 M1/M1' 各红]/W5 INV-47 措辞降层[受锁⑪间接保证]/N1 warn 分案/N2 证据边界明示;W2 box 口径差=门 3 观察项/W3 证据件补 add=主控收口硬校验 git ls-files）。

## 终位三问

①回炉处置闭合度（W1/W4/W5/N1/N2 vs 终态 diff——回炉补记节在后）。
②主链切换终位正确性（三层编排/CR1 双组件竞态锁/S6 项盒代理语义已显式/INV 四条与实现咬合——材料内独立复算）。
③阶段票收口完备性（门 2 毕+F-A8 剩门 3 收口票——观察期条件[box 偏差分布真机记录/回退层去留/右溢支路]清单在档;**门 0 遗留件 anchor-item-verify.test.tsx 补 add=合并前硬前置**——主控已列收口步骤;探针复跑 maxΔ=0.0000 证据边界[S1/S6 路径单测补]已明示）。

## 机器面数字

- 基线（门 1b 终态）：155/1347/locks 281/e2e 42。
- 门 2 终态：**155 文件/1357 用例（+10:先红 8+回炉 W4×1+测试自纠 1）/locks 281/e2e 42/42**;主控亲验 exit=0（回炉前 155/1356）+回炉后实现者 exit=0（1357）;locks 281 两轮 apply。
- registry：F-A8 open 保持（门 2 阶段注记,门 3 后翻 done）。

## 回炉补记节选（§10）

## 10. 回炉一轮补记（门一 Kimi K3 PWW 5W2N——W2/W3 归主控面不动，本节=W1/W4/W5/N1/N2）

- **W1 S6 名实偏移补注**：annotation-resolve-layered.ts 头注 S6 行+INV-58
  （invariants.md）双落「S6 触发=项盒健康代理——blocks 经 clamp01×base 构造
  恒落盒内，unhealthy 实由 boxes[项几何]越界触发；项盒健康而 DOM 链独立
  病理时 S6 不拦（门 3 随回退层去留复核）」。
- **W4 AI 侧 CR1 竞态用例（补用例路线）**：ai-annotation-layer.test.tsx 新
  describe「F-A8 门2 回炉 W4」——store 空挂载→S4（dom）→注入 entry→订阅
  触发重 resolve=项几何产物（item）+S0 翻转断言（left=17.2113 手算锚）。
  绿面 12/12；**能失败一次红证=M1' 变异**（AI 组件订阅删
  `pageEntry=null`——`f-a8-gate2-rework1-mutM1ai.raw.txt` exit=1：W4 竞态
  用例+S2 用例双红，还原 diff 空+22/22 复绿）——M1 双组件证据行：
  AnnotationLayer=M1 档（§4）、AiAnnotationLayer=M1' 本档，删订阅两组件各红。
- **W5 INV-47 措辞降层**：注记中「函数体零改=受锁⑪断言数值面不变的结构
  保证」→「回退层行为面不变（resolveAnnotationRectsDom 函数体零改——
  mergeLineRects/estimateLinePitch 受锁⑪锚定件[annotation-anchor.ts]行为
  不受本改名影响的间接保证）」。
- **N1 warn 分案**：resolveAiNotesLayered 增 viewportDegraded 案由位——对账
  已通过但 viewport 退化（scale≤0）落 DOM 链的 warn 文案与「对账失败」分案
  （「第 N 页 viewport 退化（scale≤0）——S4 DOM 回退层接管（AI 段）」）；
  注释同时声明行为差（AI 无存量可回退故降 DOM 链兜底；Annotation 版同因
  落 S3b）。
- **N2 证据边界明示**：§7 探针复跑段补「7 页×5 锚全健康夹具——maxΔ=0.0000
  证健康面接线零漂移，S1 失败/S6 抑制路径零鉴别力（该面由单测 S 格补）」。
- **收口数字**：locks unlock→apply 281（`f-a8-gate2-rework1-unlock.raw.txt`）；
  `npm run verify` 全绿 **exit=0**（quality+tickets+locks+lint+typecheck+
  **test 1357**（1356+W4×1）+build——`f-a8-gate2-rework1-verify.raw.txt`）。
  §9 移交主控项不变（anchor-item-verify.test.tsx 补 add=W3 主控面）。

## 终态 diff 全文（8 文件,560+/66-）

```diff
diff --git a/docs/invariants.md b/docs/invariants.md
index e5b8cdd934..470af35c40 100644
--- a/docs/invariants.md
+++ b/docs/invariants.md
@@ -59,7 +59,7 @@
 | INV-44 | lineage 视口尺寸变化自适应（F-L4，2026-08-31）：fit 触发源扩面「svg 布局盒尺寸变化」（uiScale 换档/窗口 resize 均其二阶来源）——ResizeObserver 观察 svg，回调与既有 fit effect **共用同一 doFit**（早退链顺序零变：userInteracted 不抢/nodes=0 不 fit/量测 0 跳过）。**门语义不变量**：userInteracted=true 时任何触发源（nodes 变化/尺寸变化）不抢视口。**S5 无自激励**：setViewport 只改 `<g data-viewport>` transform，svg 布局盒由父布局决定→不再触发 RO。**doFitRef 经 useLayoutEffect 提交后同步更新**（先于浏览器渲染步骤的 RO 回调帧——消「渲染提交→赋值前」陈旧闭包窗口，门一 W1 回炉）。**动机场景可达性（主控裁决如实降级）**：换档在当前 App 页面互斥（App.tsx:193-198 settings 与 lineage 条件渲染互斥）下用户路径=重挂载 mount fit（本就正确，探针 A-main 锁）；RO 兑现面=窗口 resize/挂载中布局变化+未来结构变化保险 | lineage-viewport.ts 头注 [F-L4] 段（F-L4，2026-08-31 登记） | 单测（lineage-viewport-refit.test ①~⑧ always-active：observe 注册面/尺寸变化 refit 数值断言/门语义不抢/空图/成对清理/量测守卫/无自激励非平凡（699/698 真新值重渲染锚）/初始回调幂等——M1~M5 变异红证，M5 检出 ②⑦⑧）+真机取证（f-l4-out/f-l4-verify.json 13/13：A-main 换档+重挂载 transform 逐位=fitViewport 期望（node 直载源码复算）/A-resize RO 端到端/B 门语义逐位相等/C 清理零泄漏/diagnostic cssZoomTriggersRO=true——fallback 判据直证不成立） | 已锚定（单测+真机级 2026-08-31 F-L4 三屋+回炉 1；弱锚备案：⑦二次 fireRO 断言弱于注释（N-r1）/~~探针固定 waitForTimeout 脆性（CI 慢机误报风险）~~**已销项（2026-09-02 AUDIT-C C-2③）**——f-l4-verify.mjs 固定等待 15 处全部轮询化（grep=0 实测），重跑 13/13 全过；实现顺带实证「条件成立≠状态稳定」（首版 lineageReady 只判 transform 非值遭 identity 初值中间帧竞态两红，补连续两次采样同值判据后稳定——固定等待侥幸绿的反向实证在档 scripts/audits/c2-impl.report.md）/挂载初始 fit 的 clientWidth 直取路径仅由 RO 端覆盖（r1-N2）） |
 | INV-45 | 阅读器双页几何不变量（F-R1，2026-08-31）：pageLayout（per-tab 可选字段+?? 'single' 兜底）下——**列宽=最宽完整行**（双页行宽=左+右+PAGE_GAP_PX，行内 gap 不随 zoom——与 INV-33 盒间距常量同源；**末行孤页不计列宽**，故末行右盒缺席渲染行宽恒=左盒宽无跳变）；**行高=max(左右页高)**；**切布局不重跑 getPage 管线**（尺寸缓存单源复用，仅重派生行+重报 onReady 新口径 basisWidth）且**不丢位置**（onReady 链经 spProg.onColumnReady 恢复链滚回当前页）；**fitWidth 分母=onReady 上报的布局口径 basisWidth**（双页=行宽 scale=1）；双页翻页步进=2（pageStep 缺省 1=单页零变）；scroll-progress 回写/懒渲染回收/INV-29/30/33 语义全保持（nearestPage 行内两盒同 top 零特判） | page-column-geometry.ts（layoutRows/rowWidth/columnWidthFor/columnTotalHeightFor 单源）+PageColumn.tsx 头注 [F-R1] 段（F-R1，2026-08-31 登记） | 单测（reader-double-page.test ①~⑦ always-active 16 用例：store 生命周期/几何纯函数/行 DOM+末行单盒专项/管道不重跑（getPage 计数）/工具栏 pageStep/fitWidth 分母/锚总高口径——M1~M5+W3 六变异红证）+真机取证（f-r1-out/f-r1-verify.json 17/17：行宽公式 595+595+12/fitWidth 全列口径 133%≈(1625−24)/1202/翻面 +2 行盒顶 Δtop=0/往返位置保持同源锚 |Δ|=0+basis 269%→133%/roots 上界 10） | 已锚定（单测+真机级 2026-08-31 F-R1 三屋+回炉 2；弱锚备案：真库无奇数页文献——末行单盒真机面由单测③ DOM 断言代锁（E 走双盒分支）/e2e 双页覆盖未入票（备案后续）/布局切换 IO 重挂窗口期瞬时渲染膨胀（roots 上界锁，无跳顶实证） |
 | INV-46 | 页内层序=背景板不变量（F-A5/ADR-0019 R2，2026-08-31 用户「背景板」令）：阅读器每页覆盖层的绘制序恒 **标注/AI 色块 < PDF canvas 墨带 < 自绘选区层**（textLayer 官方 z0 透明纯手势面）——实现为单源常量 `page-layer-z.PAGE_LAYER_Z`（text:0/colorBlocks:1/canvas:2/selectionPaint:3），色块混合 normal（multiply 全数摘除——F-07 荧光笔语义废止），canvas 以 `background:'rgba(255,255,255,0)'` 透明底渲染且 `pointer-events:none`（墨带恒为最高「字」——色块内文字像素纯黑不被染；标注 rect 点击/文本划选手势经明纸穿透零回归）；比较域=PageBox 页内容容器 `isolation:isolate`+白纸承底层（暗色主题页纸仍白）。弹层（菜单/编辑器 z-20/工具条 z-10）为页盒兄弟位天然高于本域 | src/renderer/features/reader/page-layer-z.ts（常量单源）+PdfPageCanvas.tsx（透明底+canvas 样式）+PageBox.tsx（isolate+白纸）+AnnotationLayer/AiAnnotationLayer.tsx（z=colorBlocks+multiply 摘除）+selection-paint.tsx（z=selectionPaint）+TextLayer.tsx（z 同值显式化） | unit（pdf-page-canvas.test：透明底参数+canvas 样式+白纸/isolate；selection-paint.test c1/c2：自绘 z 最上+常量序；annotation-layer/ai-annotation-layer.test：层 z=colorBlocks+multiply 缺席——M5 变异红证在档）+e2e（reader-text.spec 两程 mix-blend normal+z=1）+真机（f-a5-verify-after.json c/z-order×2+c/text-pure-black 块内最暗核=0） | 已锚定（单测+e2e+真机像素级 2026-08-31 F-A5） |
-| INV-47 | rect 归并紧凑行距双门（F-V1，2026-08-31 用户图1/图2「整段拖选断位漂移」）：紧凑排版（textLayer span 盒高>行距，相邻行 y 区间重叠——修前 y 重叠判据跨行并簇产杂交矩形/丢行/同行双块，探针 f-v1-diag.json 实证）下两道门：①`mergeLineRects` 簇判据=pitch 在场时中心距 ≤ min(pitch, 主导高[, lineH])/2——`estimateLinePitch`=y 中心差滤 <2px 行内噪声后**下中位**（纯下中位对离群免疫——「30%×最大差」相对下限被 232px 远距零宽盒毒化实证修前事故在档）；段输出高度在可比带 pitch<主导高≤2×pitch 钳到行距（y 恒取主导不动；可比带外不钳=标题/旋转负向保护）；②`mergeRects` 终裁 lineH 在场时聚类容差追加归一化域 pitch 估计；**lineH/pitch 缺省=F-A4 原口径逐位不动**（受锁⑪存档断言锁）；修复在 rectsBetweenPoints 公共管线=选区/标注/AI 三消费点同源。**已知边界备案**（门一 W1/W3）：同行片段中心差 ∈[2px, h/2) 时 pitch 可被行内噪声劫持致像素域同行拆块——依赖 mergeRects 终裁（容差 h/2 量级）并回，观察项无实害病例；verify 探针行表 ±4px 聚行不分栏，双栏 y 对齐行合并为全宽端点——跨栏杂交块残余理论盲区（源头已被簇修复+x 断段阈值覆盖） | src/renderer/features/reader/annotation-anchor.ts（estimateLinePitch 导出+mergeLineRects 双门）+annotation-merge.ts（pitchN 终裁） | 单测（annotation-anchor.test F-V1 a~e 五用例：缺省链并丢行/INV-D 级联下推/量测膨胀杂交/估计器数值+单行 undefined/常规域零变——M2/M3 变异红证收口补档在案；annotation-merge.test f/g 两用例含 M4b 缺省存档红证）+真机（f-v1-out/f-v1-verify.json 五判据：紧凑文档蓝链 7 行 7 块 x 全在行端点±2px+黄链同+第二篇双栏文献回归 7 行 7 块+pageerror 0） | 已锚定（单测+真机级 2026-08-31 F-V1 三屋+门一对抗深审） |
+| INV-47 | rect 归并紧凑行距双门（F-V1，2026-08-31 用户图1/图2「整段拖选断位漂移」）：紧凑排版（textLayer span 盒高>行距，相邻行 y 区间重叠——修前 y 重叠判据跨行并簇产杂交矩形/丢行/同行双块，探针 f-v1-diag.json 实证）下两道门：①`mergeLineRects` 簇判据=pitch 在场时中心距 ≤ min(pitch, 主导高[, lineH])/2——`estimateLinePitch`=y 中心差滤 <2px 行内噪声后**下中位**（纯下中位对离群免疫——「30%×最大差」相对下限被 232px 远距零宽盒毒化实证修前事故在档）；段输出高度在可比带 pitch<主导高≤2×pitch 钳到行距（y 恒取主导不动；可比带外不钳=标题/旋转负向保护）；②`mergeRects` 终裁 lineH 在场时聚类容差追加归一化域 pitch 估计；**lineH/pitch 缺省=F-A4 原口径逐位不动**（受锁⑪存档断言锁）；修复在 rectsBetweenPoints 公共管线=选区/标注/AI 三消费点同源。**已知边界备案**（门一 W1/W3）：同行片段中心差 ∈[2px, h/2) 时 pitch 可被行内噪声劫持致像素域同行拆块——依赖 mergeRects 终裁（容差 h/2 量级）并回，观察项无实害病例；verify 探针行表 ±4px 聚行不分栏，双栏 y 对齐行合并为全宽端点——跨栏杂交块残余理论盲区（源头已被簇修复+x 断段阈值覆盖）。**适用面收缩注记（F-A8 门2，2026-09-04）**：mergeLineRects 退出重锚主链（重锚主链自门 2 起项几何族 baselineGroupBlocks——INV-58 扩域）——适用面收缩为「S4 DOM 回退层（回退层行为面不变——resolveAnnotationRectsDom 函数体零改，mergeLineRects/estimateLinePitch 受锁⑪锚定件[annotation-anchor.ts]行为不受本改名影响的间接保证）+存量读时归并（渲染面 mergeRects 挂 lineH）」 | src/renderer/features/reader/annotation-anchor.ts（estimateLinePitch 导出+mergeLineRects 双门）+annotation-merge.ts（pitchN 终裁）+annotation-resolve-layered.ts（F-A8 门2：回退层唯一编排入口） | 单测（annotation-anchor.test F-V1 a~e 五用例：缺省链并丢行/INV-D 级联下推/量测膨胀杂交/估计器数值+单行 undefined/常规域零变——M2/M3 变异红证收口补档在案；annotation-merge.test f/g 两用例含 M4b 缺省存档红证）+真机（f-v1-out/f-v1-verify.json 五判据：紧凑文档蓝链 7 行 7 块 x 全在行端点±2px+黄链同+第二篇双栏文献回归 7 行 7 块+pageerror 0） | 已锚定（单测+真机级 2026-08-31 F-V1 三屋+门一对抗深审；适用面收缩=F-A8 门2，回退层函数体零改在案） |
 | INV-48 | 脉络节点标签与含金量展示不变量（F-LG14，2026-08-31 用户图6/图7）：①**tags 存储契约**=lineage_nodes.tags JSON 数组 TEXT（迁移 007），NULL=无标签（存量库零迁移兼容），**同节点同名标签去重恒成立**——写边界单源 dedupeLineageTags（shared/models/lineage.ts）经 repo.upsertNode 单点收口（service upsert/导入/应用内增删全经此口，DB 恒无重复标签；面板/对话框面 includes 短路=第一道 UX 防）；draft 节点 tags 可选（缺省省略=旧版草稿零破坏——ADR-0014 修订 v1.1）；②**含金量口径字面**=「引 {citedByCount} · {venueTier}档」并列原始值不合成单一分数（用户裁决在档）；citedByCount null/undefined=「引 —」；venueTier 未映射=「未定」；0=值非缺（判别 === null——ENR-01「从未抓到」与「已抓到且为 0」分立口径透传到卡面）；③**join 单源**=graph 通道 paperMetrics 批量 in-query 单语句（禁 N+1 逐节点通道调用——主控裁决），venueTier 映射单源 venueToTier（受锁常量零改），渲染层零额外取数（store 单读随行）；④主题节点（paperId null）底行=仅年份+标签（无含金量段——绑定态语义分界）；⑤标签增删=整组写经既有 upsert-node 通道（autosave-first 语义不变，payload tags 条件展开保既有调用点形状） | src/shared/models/lineage.ts（dedupeLineageTags 单源+draft tags schema）+src/main/db/repos/lineage.repo.ts（写边界收口）+src/main/services/lineage/lineage.service.ts（graph join+importDraft tags）+renderer LineageNodeMeta.tsx（口径字面 formatMetricsText 单源）（F-LG14，2026-08-31 登记） | 单测（lineage-tags.test：迁移 007/tags 列可空/draft 校验四态/导入落库去重/graph join 三元组+批量单语句 spy 计数锚；lineage-node-meta.test：含金量五口径字面锚+主题节点无含金量段+标签容器有无+24px 锚；lineage-tag-edit.test：Board 全链 payload/对话框取消零写/空标签短路/侧板增删上抛/store setNodeTags 载荷回填） | 已锚定（单测级 F-LG14 本单；真机 f-lg14-verify.mjs 面随收口） |
 | INV-49 | pdfjs 文档生命周期销毁序（F-R3，2026-09-02 AUDIT-C C-1 修票）：①**worker-per-task 事实**——每个未传 worker 的 loadingTask 自带专属 PDFWorker，destroy=唯一终止口；应用面两个创建点句柄必须在册：PdfDocProvider（task 常量+cleanup destroy——既有）与 CorpusExtractor loadPdfDocument（**失败也释放**——settleLoadTask：失败路径 destroy 恰一次且自身拒绝吞并、**await settle 后**重抛原错误；成功路径零 destroy，doc.destroy 归 runExtraction finally——P6 泄漏面已闭）；②**destroy 竞态窗=接受残余**——destroy 落流加载窗内时 pdfjs 4.10.38 worker 泵产生 worker 世界 unhandled rejection（`Error: Worker was terminated`，经 CDP 汇入 pageerror 仪表通道），定性=devtools-only 噪声非破坏型（用户路径零影响，6/6 健康在档）；**不升级裁决**：v5.5.207 已修主逃逸点（onFailure 终接守卫）但同族悬尾（pdfManagerReady 链）master 仍在+destroy() 族硬化（claim 拒绝+_setupCapability）仅 6.3.289 起——任一档位不承诺零同族噪声，跨 major 回归面（INV-30/INV-16/P1 形状/e2e 全量重验）不换 devtools-only 收益（档案=scripts/audits/f-r3-upstream-check.md，逐 tag 可复现）；**升级再评估触发条件**=上游悬尾族全消时连同 destroy() 族硬化一并重评；③监控锚=主进程 console-message level1「getTextContent - ignoring errors…Worker task was terminated」代理计数（F-R3 探针 r7 实证可收）——仅监控不设阈 | PdfDocProvider.tsx 文档生命周期 effect+CorpusExtractor.ts settleLoadTask 与头注状态机表+scripts/audits/f-r3-investigation.md（排查闭环）+f-r3-upstream-check.md（上游查证档案）（F-R3，2026-09-02 登记） | 单测（corpus-extractor.test settleLoadTask 四径：成功不调 destroy/失败 destroy 恰一次/destroy 自身拒绝吞并不覆盖原错误/重抛在 destroy settle 之后——主控补变异 A/B/C 红证在档）——噪声本体无应用面机器断言（库内缺陷接受残余，监控=主进程代理计数备案） | 部分（泄漏面已锚单测级；噪声面=显式接受残余+监控备案） |
 | INV-50 | 弃改=完整弃改（A3，2026-09-02 AUDIT-C C-3 扫描 §1.2-a 修票）：用户显式弃改确认后 notes 悬置面全闭三件套——①**discard API**（notes.store discardPendingEdit/discardAllPendingEdits：清防抖 timer+pendingEdit/touchedFields/lastEditedAt/editSeq 四元数据+条目删除，全幂等）；②**in-flight 代际守卫**（saveSoon 派发快照 discardGen，.then/.catch 回调首行代际已变=全 no-op——防回调经 draftOf 重建已删条目/复活 pending 镜像）；③**接线两点**（tab-dirty confirmCloseDirty 守门内=弃改收口点，**一切 tab 关闭路径必经本守门**——TabBar 双点两位在案；workspace.store switchTo 确认后/await invoke 前=切课题收口，跨域受控例外=check-quality COMPOSITION_ROOT_ALLOW 白名单机器锚）。语义边界：closeAll（App 切视图）非弃改不触发（autosave-first 草稿存活+timer 继续跑）；App dirty 聚合含 notes pending（useTabDirtyAggregate 扫开 tab 键集——clean 直达=no-op 成立）；已接受残余=in-flight save 已派发毫秒窗（DB 落地不可回收；跨课题面由 main 归属校验兜——notes.service papers.findById→NOT_FOUND 显式先行，FK 为第二层）+load 回调 discard 后到达重建条目=服务器基线非弃改内容（复活不可能：pendingEdit 已清必走整版落地） | notes.store.ts discard 族（头注四跨格序列）+tab-dirty.ts confirmCloseDirty（弃改收口点头注）+workspace.store.ts switchTo（A3，2026-09-02 登记） | 单测（notes.store.test discard 族七用例+reject 版序列②——变异 M1~M4+「仅摘 .catch 守卫」变异红证在档）+e2e（reader-text.spec「A3 复活面端到端」：防抖窗内关脏 tab 确认弃改→重开=基线，「已保存」载入锚防假绿）+tab-dirty/workspace.store 接线用例 | 已锚定（单测+e2e 级 A3 本单） |
@@ -70,7 +70,10 @@
 | INV-55 | 页内搜索会话挂文档身份+代际守卫（P7E-03，2026-09-03 页内高亮搜索票）：①**会话生命周期挂 reader 视图文档身份**——reader-search.store 持 sessionFileUrl，装配面 useReaderSearch fileUrl 键效应调 bindDoc(fileUrl)：**变化即代际失效+全清**（换文档/换内容寻址身份），不变=no-op（同文档视图往返/重挂不清——会话保留为正确语义；门一 W1 回炉：实例级 ref 在重挂首跑 null 跳过=旧文档会话复活漏洞，记账入 store 根治）；②**在途搜索代际守卫**（INV-03 同族）——submit 每次自增 generation，逐页回传代际不符→作废终止；close/reset 同使代际失效；③**索引全文档/高亮仅渲染窗口**——搜索计数与窗口无关（确定性投影），高亮矩形=TextLayer DOM span 建 Range 取 clientRects（pdfjs 4.10 每文本项恰一 span 契约，数量不符→该页零高亮只计数=降级不崩）；④**active 居中记账单源**=store.lastCentered（matches 数组身份+activeIndex 比对）——跨层实例/跨懒渲染重挂生效，防实例重建隐式重获居中资格劫持用户滚动（门一 W2 回炉） | src/renderer/features/reader/reader-search.store.ts（bindDoc/sessionFileUrl/lastCentered/generation 头注）/useReaderSearch.tsx（fileUrl 键效应→bindDoc+keymap 'reader-search' 成对）/SearchHighlightLayer.tsx（居中记账读写 store+span 契约降级）/reader-search.ts（纯函数域头注）（P7E-03，2026-09-03 登记） | 单测（reader-search.store.test：bindDoc 变化/同值+代际守卫 S7+reset 序列；reader-search-wiring.test：fileUrl 变化/重挂不重置+keymap 注册注销成对 INV-14+pageTurner 条件；reader-search-ui.test：S11 MO 重算锚+层重挂不二次居中——M6 变异「摘 observer.observe」红证在档）+e2e（reader-search.spec 装配级全链：Ctrl+F→小写跨大小写命中→逐处跳页高亮→Esc 清零） | 已锚定（单测+wiring+e2e 级 P7E-03 本单） |
 | INV-56 | 导出内容构建器单源+剪贴板写单口（P7E-04，2026-09-03 导出剪贴板票）：①**文件路径与剪贴板路径共用同一构建器**——export/clipboard 通道经 buildBibtex/buildCsv 直用（ipc 层 format 枚举分发），禁复制第二份序列化（题录格式漂移不可能——文件导出与剪贴板导出同源）；②**剪贴板写唯一口**=IpcDeps.clipboard 注入面（ipc 层经 deps 消费，bootstrap 装配 electron.clipboard——DB 派生内容全程 main 侧，renderer 只发 ids+format）；③**先构建后写**（构建失败零剪贴板副作用）；④无对话框→无 CANCELLED 分支（与文件导出 exportTo 的语义差异——失败面只有构建/写入两种）；已知还原项=clipboard 现为可选注入（受锁 makeIpcDeps 桩工厂禁改下的处置+handler 响亮守卫），下次合法触碰 tests/utils/ipc-deps.ts 的场次补必填+桩工厂同步 | src/main/ipc/export_.ts（exportClipboard+头注）/src/main/ipc/ipc-deps.ts（clipboard 注入面）/src/main/bootstrap.ts（electron.clipboard 装配）/src/shared/ipc/schemas.ts+api-surface.ts（clipboardReqSchema+通道）（P7E-04，2026-09-03 登记） | 单测（export-clipboard.test：bibtex/csv 委托逐参+count 回传+先构建后写「service 抛错→clipboard 零调用」+装配缺失响亮——M1/M2 变异红证在档）+renderer（paper-detail-clip.test：E1/E2/E4 busy 短路+toast 逐字——M3/M4 红证在档）+e2e（export-clipboard.spec：主进程 clipboard.readText 含 @+title——P7-A 读回先例+清场竞态防线） | 已锚定（单测+renderer+e2e 级 P7E-04 本单） |
 | INV-57 | 阅读时长单口累加+分片上界（P7E-05，2026-09-03 阅读时长统计票）：①**reading_seconds 唯一写点**=papers.repo updateReadPage 第三参（原子 SQL 累加 reading_seconds=reading_seconds+?，禁 read-modify-write 两步）；②**时长账本唯一宿主**=reading-time.ts 模块 ledger（关 tab/closeAll/卸载三收尾口经复合 flusher 与进度账同批落库——漏一即丢账的结构性防线）；③**计时门=ready×visible 双条件**（输入级 idle 不做=v1 申报边界）；settle 吸收仅 visible（防 hidden 段虚计——R1 回炉）/结转不依赖可见性（可见零头实转不丢——门二 R3 裁决解耦）；④**单次 invoke 时长上界=3600×chunkSeconds 分片单源**（三消费点：invokeOne（R5/R6）+dispose 逐笔分片（R7）+setup onFlush 防御深度——>1h 回吐分片落账禁单笔超界，门一 R2+门二 R3 两轮收口）。注记面（不修已申报）：R7 卸载双 invoke（时长 onFlush+进度 sp.dispose 各自落库，各原子非单事务面+页码两来源理论回退窗）；分片级失败=部分静默丢失（尽力而为吞错=scroll-progress 同规约，重试/outbox=v2 候选——门二 WARN）；ledger 无 24h 钳制（「24 片/24h」=物理估算口径非逻辑封顶）；sec<0 入 chunkSeconds=不可达前置（settle Math.max(0) 保证） | src/main/db/repos/papers.repo.ts（updateReadPage 第三参）/src/renderer/features/reader/reading-time.ts（ledger/settle 吸收结转解耦/chunkSeconds 分片单源+PROGRESS_SECONDS_CHUNK=3600 与 schemas 同值对齐）/reading-time-setup.ts（复合 flusher 装配+onFlush 分片消费）/src/shared/ipc/schemas.ts（secondsDelta int 0..3600 optional）/src/main/db/migrations/008_reading_time.sql（P7E-05，2026-09-03 登记） | 单测（reading-time.test：R1~R7+R10 态空间+R3×R6 跨格（hidden 收尾零虚计）+R2 分片 4000→3600+400+R3 dispose 分片双 invoke+可见零头 hidden 结转——M5（settle 吸收门）/M6（invokeOne 分片）/M7（dispose 分片）变异红证在档，M2 载体失效转移 M5 实录；papers-reading-time.test：累加原子 30+45=75+R8 缺省 0+回读；migrate-reading-time.test：R9 新库/存量升级 user_version=8；reader-time.test：service 透传）+e2e（reader-reading-time.spec：存量库升级链+「阅读 0 分钟」显示面） | 已锚定（单测+e2e 级 P7E-05 本单） |
-| INV-58 | 拖选期视觉与保存 rects 同几何管线（F-A6，2026-09-04 随 c 票落地登记）：快路径（evaluateVisual）与全量（evaluateFull/settle）必须属**同一几何族**（pdf-item-geometry 项声明几何族：rectsForOffsetRange+基线分组 baselineGroupBlocks+bandsFromItems——b2 主链迁移/c 快路径接线），禁止第二几何口径（防松手同帧把旧错几何带回——deepseek 终位 WARN-3）；rect 与 bands 同由项几何+styles 派生（C5，禁项源 rect×DOM 量测 band 混用——matchBand 两口径混用=b 链错绑同构风险）；**适用域=selection 产链（evaluate→paint→pending.anchor.rects→save）**；AnnotationLayer 存量重锚域=票外（门二 seam_ruling——仍走 DOM 量测几何，同族化独立票排期）；回退层允许（DOM 量测=快→全量→DOM 三层回退的末端，warn 不静默——三回退因：页项缺失/偏移对账失败/计算异常） | src/renderer/features/reader/selection-evaluate.ts（双路径单文件：快=evaluateVisual 项几何直取/全量=evaluateFull 保存链权威）+pdf-item-geometry.ts（项几何族单源：viewportTransformFor/rectsForOffsetRange/baselineGroupBlocks/bandsFromItems+G2 检测器阈值常量）+SelectionLayer.tsx 接线（evaluate 域拆出+paint 态承载）+page-items.store（zustand 单源注册表——页项/几何下钻通道） | 单测（selection-evaluate.test：快慢等价 it——同夹具 rAF 帧快路径产物与 settle 全量产物逐位一致（块数+四向几何）+同帧覆盖 it——快路径帧落地后全量覆盖（mid-drag zoom 差分形态，终态=全量产物）+快路径跨页守卫 it+W1 mouseup 顺序锚；MUT3 快路径守卫(ii) 删除红证在档）+四轮取证 A/B 对照（scripts/audits/f-a6-forensic-verdict.md §11/§12——甲乙同链 shift ≤0.01px 按构造+D1 面逐位零回归） | 已锚定（2026-09-04） |
+| INV-58 | 拖选期视觉与保存 rects 同几何管线（F-A6，2026-09-04 随 c 票落地登记；**F-A8 门2 扩域**同日）：快路径（evaluateVisual）与全量（evaluateFull/settle）必须属**同一几何族**（pdf-item-geometry 项声明几何族：rectsForOffsetRange+基线分组 baselineGroupBlocks+bandsFromItems——b2 主链迁移/c 快路径接线），禁止第二几何口径（防松手同帧把旧错几何带回——deepseek 终位 WARN-3）；rect 与 bands 同由项几何+styles 派生（C5，禁项源 rect×DOM 量测 band 混用——matchBand 两口径混用=b 链错绑同构风险）；**适用域=selection 产链（evaluate→paint→pending.anchor.rects→save）+Annotation/AiAnnotation 重锚链（F-A8 门2 起项几何族=重锚主链）**；DOM 量测仅允许存在于显式回退层（resolveAnnotationRectsDom=S4 页级回退，**函数体零改**=INV-47 数值面锚）且产物必须标域（source:'dom'——INV-60）；**S6 名实（门一 W1 补注）：S6 触发=项盒健康代理——blocks 经 clamp01×base 构造恒落盒内，unhealthy 实由 boxes[项几何]越界触发，项盒健康而 DOM 链独立病理时 S6 不拦（门 3 随回退层去留复核）**；回退层允许（DOM 量测=快→全量→DOM 三层回退的末端，warn 不静默——三回退因：页项缺失/偏移对账失败/计算异常） | src/renderer/features/reader/selection-evaluate.ts（双路径单文件：快=evaluateVisual 项几何直取/全量=evaluateFull 保存链权威）+pdf-item-geometry.ts（项几何族单源：viewportTransformFor/rectsForOffsetRange/baselineGroupBlocks/bandsFromItems+G2 检测器阈值常量）+SelectionLayer.tsx 接线（evaluate 域拆出+paint 态承载）+page-items.store（zustand 单源注册表——页项/几何下钻通道）+**annotation-resolve-layered.ts（F-A8 门2：重锚三层编排器 S0~S6——AnnotationLayer/AiAnnotationLayer 共形消费）** | 单测（selection-evaluate.test：快慢等价 it——同夹具 rAF 帧快路径产物与 settle 全量产物逐位一致（块数+四向几何）+同帧覆盖 it——快路径帧落地后全量覆盖（mid-drag zoom 差分形态，终态=全量产物）+快路径跨页守卫 it+W1 mouseup 顺序锚；MUT3 快路径守卫(ii) 删除红证在档）+四轮取证 A/B 对照（scripts/audits/f-a6-forensic-verdict.md §11/§12——甲乙同链 shift ≤0.01px 按构造+D1 面逐位零回归）+**annotation-layer.test/ai-annotation-layer.test F-A8 门2 describe（S0 缺席/S1 对账失败回退/S2 项几何产物/S3b 条目回退/S6 病理抑制/CR1 竞态 fixture/域标记——M1 删订阅/M2 删 S6/M3 主链换 DOM 变异红证在档）** | 已锚定（2026-09-04 F-A6；F-A8 门2 扩域同日） |
+
+| INV-59 | 重锚同族配对令（F-A8 门2，2026-09-04 随主链切换落地登记）：标注/AI 段重锚产物 resolved.rects 与 resolved.bands 必须**同几何族**（项几何主链=rectsForOffsetRange 项盒+bandsFromItems 同源派生；S4 DOM 回退层=findRangeAtOffset 行盒+bandsForTextNodes 节点口径同源）——主链禁跨族配对（消 R1：正确 rects×失真 bands 互漂错绑）；跨族配对仅允许显式回退格且属登记边界：**S3b 条目回退**（存量 rects[库]×bandsNearRects[DOM 量测]——现状语义逐位保持）与 **S5/S6 页级回退**（DOM 产物或其抑制后的存量直显）；matchBand 阈值（\|Δcenter\|≤rect.h）仍在为跨格边界兜底 | src/renderer/features/reader/annotation-resolve.ts（ResolvedAnnotation 域内 rects/bands 成对产出+resolveAnnotationRectsItem 同族管线）+annotation-resolve-layered.ts（三层编排=同族配对的编排保证——主链产物 rect/band 同域，跨族仅在登记回退格） | 单测（annotation-layer.test F-A8 门2 describe：S2 项几何产物 rect/band 同族数值断言（块几何=band 几何同基线）+S3b/S6 回退格跨族配对=登记边界渲染断言；anchor-item-verify.test：resolveAnnotationRectsItem 产物与 itemSelectionGeometry 同参直调逐位一致（rects+bands 双断言）） | 已锚定（单测级 F-A8 门2 本单） |
+| INV-60 | 重锚显示覆盖登记（F-A8 门2，2026-09-04 随主链切换落地登记）：重锚成功产物（项几何主链/S4 DOM 回退层）覆盖库值 rects **仅显示层、永不回写**（annotation.rects 库数据零迁移零触碰——重锚是渲染态推导非数据变更；INV-37 只覆盖拖选期不扩其文，本条另立）；产物域标记 source:'item'\|'dom' 随 resolved 运行时走（调试面=渲染块 data-source 属性+单测断言面；**不入库**=Annotation 模型锁面零触碰），渲染行为零差（色块样式不区分源） | src/renderer/features/reader/annotation-resolve.ts（ResolvedAnnotation.source 可选域）+AnnotationLayer.tsx/AiAnnotationLayer.tsx（data-source 调试属性）+annotation-resolve-layered.ts（markSource 唯一标域点） | 单测（annotation-layer.test/ai-annotation-layer.test F-A8 门2 describe：域标记断言（S0/S4='dom'/S2='item'/S3b·S6 抑制=无标记）+M3 主链换 DOM 变异→域标记断言红证在档；e2e reader-text「划选高亮后重开仍在原位」INV-51 稳态口径回归=显示覆盖不回写的端到端面） | 已锚定（单测级 F-A8 门2 本单；e2e 面随全量 reader-text 回归） |
 
 ## 维护规则
 
diff --git a/locks/manifest.json b/locks/manifest.json
index f60fc603e2..d35fd904ba 100644
--- a/locks/manifest.json
+++ b/locks/manifest.json
@@ -1,5 +1,5 @@
 {
-    "generatedAt":  "2026-09-04T03:24:29.1124381Z",
+    "generatedAt":  "2026-09-04T05:04:25.2454133Z",
     "files":  [
                   {
                       "path":  ".github/workflows/ci.yml",
@@ -7,7 +7,7 @@
                   },
                   {
                       "path":  "docs/invariants.md",
-                      "sha256":  "94d88004782148a373daaa7d1e1d7b15d848b5304c6365ff551cb1c6d8219165"
+                      "sha256":  "8d6867b1d1978b5ea9e186fb76a57a0a6a15b4d5f2ec7507d61819562f55de8a"
                   },
                   {
                       "path":  "electron.vite.config.ts",
@@ -631,7 +631,7 @@
                   },
                   {
                       "path":  "tests/unit/renderer/ai-annotation-layer.test.tsx",
-                      "sha256":  "9ca3ad512628cf3c394dfff99ded57ca9e8fbd5460a1431ca493db35215915d9"
+                      "sha256":  "be33a952104ede4ce12deaee6c840fe442c97b79a4a146360a6972487f50b6fd"
                   },
                   {
                       "path":  "tests/unit/renderer/ai-note-collapse.test.tsx",
@@ -659,7 +659,7 @@
                   },
                   {
                       "path":  "tests/unit/renderer/annotation-layer.test.tsx",
-                      "sha256":  "a0694c04bc225108200954de2d87134fc513f04b647f3d1094fa3b0679fb3c04"
+                      "sha256":  "ad023cc651cfe0c788030ee690e33720af51189d61d4231e42d6de1ad6a37292"
                   },
                   {
                       "path":  "tests/unit/renderer/annotation-menu.test.tsx",
diff --git a/src/renderer/features/reader/AiAnnotationLayer.tsx b/src/renderer/features/reader/AiAnnotationLayer.tsx
index a89ec74e5c..5eaa3a01f7 100644
--- a/src/renderer/features/reader/AiAnnotationLayer.tsx
+++ b/src/renderer/features/reader/AiAnnotationLayer.tsx
@@ -67,9 +67,9 @@
 import { useEffect, useLayoutEffect, useMemo, useState } from 'react'
 import type { AiNote } from '@shared/models/ai-note'
 import type { AnnotationRect } from '@shared/models/annotation'
-import { verifyQuote } from './anchor-serialize'
-import { findRangeAtOffset, pixelBoxOf } from './annotation-anchor'
-import { bandsForTextNodes, matchBand, type RowBand } from './annotation-resolve'
+import { matchBand, type RowBand } from './annotation-resolve'
+import { resolveAiNotesLayered } from './annotation-resolve-layered'
+import { usePageItemsStore } from './page-items.store'
 import { bandVertical } from './annotation-style'
 import { PAGE_LAYER_Z } from './page-layer-z'
 import { QUESTION_COLOR } from './ai-note-style'
@@ -80,11 +80,13 @@ import { useReaderStore } from './reader.store'
 type ResolvedRects = Record<string, AnnotationRect[]>
 
 /** 本地重锚缓存（paperId+页键——键变即整体作废重算；bands=节点口径行簇
- *  字形带按 noteId 键控——绑定不经几何匹配，免疫行盒整体偏移） */
+ *  字形带按 noteId 键控——绑定不经几何匹配，免疫行盒整体偏移；source=
+ *  [F-A8 门2] 产物域标记 'item'|'dom'——INV-60 运行时不入库） */
 interface AnchorCache {
   key: string
   rects: ResolvedRects
   bands: Record<string, RowBand[]>
+  source: Record<string, 'item' | 'dom'>
 }
 
 /** 参与重锚的行：有锚引文（篇级/无锚行天然不入层）+页匹配（anchorPage 1 基） */
@@ -101,10 +103,14 @@ export function AiAnnotationLayer(props: {
   onJumpToNote(aiNoteId: string): void
 }): JSX.Element | null {
   const { aiNotes, page, pageRoot, onJumpToNote } = props
-  const [cache, setCache] = useState<AnchorCache>({ key: '', rects: {}, bands: {} })
+  const [cache, setCache] = useState<AnchorCache>({ key: '', rects: {}, bands: {}, source: {} })
   const [selectedId, setSelectedId] = useState<string | null>(null)
   // F-A3（INV-42）：选择模式自订阅（AnnotationLayer 同型；props 接口零变）
   const selectionMode = useReaderStore((s) => s.tabs[s.activeId ?? '']?.selectionMode ?? false)
+  // [F-A8 门2 CR1] 页项 store 订阅（与 AnnotationLayer 同构——store 晚于
+  // textLayer 就绪竞态由订阅兜底；CR3 键=当前渲染页，文档切换=clear 重填；
+  // 缺席归一 null——编排器 S0 判定口径）
+  const pageEntry = usePageItemsStore((s) => s.pages[page + 1]) ?? null
 
   // 进入选择模式：清选中描边（S4——rects 惰性化，data-highlight 全 false）；
   // 切回常规恢复 auto 不自动重选（用户重新点击）。useLayoutEffect=paint 前
@@ -118,9 +124,9 @@ export function AiAnnotationLayer(props: {
   // 缓存键：paperId（行内同篇——取首行）+页；换篇/翻页即失效
   const cacheKey = `${pageNotes[0]?.paperId ?? aiNotes[0]?.paperId ?? ''}:${page}`
 
-  // 文本层就绪后重锚：verifyQuote → findRangeAtOffset（与 AnnotationLayer 同
-  // 管线同节奏——MutationObserver+rAF 合并重算；AI 行无存量 rects 可回退，
-  // 重锚失败=不渲染该段）
+  // 文本层就绪后重锚 [F-A8 门2]：三层编排（项几何主链→DOM 回退——与
+  // AnnotationLayer 共形，annotation-resolve-layered 域；MutationObserver+rAF
+  // 合并节奏不变；AI 行无存量 rects 可回退，重锚失败/抑制=不渲染该段）
   useEffect(() => {
     if (pageRoot === null) {
       return
@@ -132,29 +138,8 @@ export function AiAnnotationLayer(props: {
     let scheduled = false
     const resolve = (): void => {
       scheduled = false
-      const next: ResolvedRects = {}
-      const bands: Record<string, RowBand[]> = {}
-      const base = pixelBoxOf(textLayer)
-      for (const n of pageNotes) {
-        const at = verifyQuote(textLayer, {
-          prefix: n.prefixText,
-          quote: n.quoteText,
-          suffix: n.suffixText,
-          start: 0
-        })
-        if (at === null) {
-          continue
-        }
-        const range = findRangeAtOffset(textLayer, at, at + n.quoteText.length)
-        if (range !== null && range.rects.length > 0) {
-          next[n.id] = range.rects
-          // [F-A5 b] 节点口径带：引文自身 textNodes→bandsForTextNodes（绑定
-          // 不经几何匹配——免疫 CSS 行盒整体偏移错绑上一行；修前裸行盒
-          // 在小字号紧排文档上下偏+侵入相邻行=图2 根因）
-          bands[n.id] = bandsForTextNodes(range.textNodes.map((t) => t.node), base)
-        }
-      }
-      setCache({ key: cacheKey, rects: next, bands })
+      const next = resolveAiNotesLayered({ textLayer, notes: pageNotes, page, entry: pageEntry })
+      setCache({ key: cacheKey, rects: next.rects, bands: next.bands, source: next.source })
     }
     const schedule = (): void => {
       if (!scheduled) {
@@ -166,10 +151,11 @@ export function AiAnnotationLayer(props: {
     const observer = new MutationObserver(schedule)
     observer.observe(textLayer, { childList: true, subtree: true })
     return () => observer.disconnect()
-  }, [pageNotes, pageRoot, cacheKey])
+  }, [pageNotes, pageRoot, cacheKey, pageEntry])
 
   // 键变（翻页/换篇）即弃旧缓存（下轮重锚收敛前不渲染错页 rects）
   const resolved = cache.key === cacheKey ? cache.rects : {}
+  const resolvedSource = cache.key === cacheKey ? cache.source : {}
 
   return (
     <div
@@ -187,6 +173,7 @@ export function AiAnnotationLayer(props: {
             key={`${n.id}:${i}`}
             data-testid="ai-note-rect"
             data-ai-note-id={n.id}
+            data-source={resolvedSource[n.id]}
             data-highlight={n.id === selectedId}
             role="button"
             aria-label={`AI 笔记：${n.quoteText}`}
diff --git a/src/renderer/features/reader/AnnotationLayer.tsx b/src/renderer/features/reader/AnnotationLayer.tsx
index 60224c13cf..8b83dcba3e 100644
--- a/src/renderer/features/reader/AnnotationLayer.tsx
+++ b/src/renderer/features/reader/AnnotationLayer.tsx
@@ -6,15 +6,13 @@
  *   整层容器 mix-blend-mode:multiply——荧光笔语义，白纸显色、黑字透出，色块不透明；
  *   下划线为收边后底缘 2px 实条，每行一条——rectStyle 已迁 annotation-style
  *   （F-11 顶/底收边修标注下偏；F-A4 b② 行盒自适应 band——重锚字形带在场
- *   时顶贴字形顶缘底贴底缘），rects 行级合并见
- *   annotation-anchor.mergeLineRects，两路径（划选保存/重开重锚）同口径；
+ *   时顶贴字形顶缘底贴底缘）；DOM 回退层行级合并=annotation-anchor.mergeLineRects
+ *   （[F-A8 门2] 适用面收缩 INV-47）；
  *   渲染读时另过 annotation-merge.mergeRects 归并（F-A1 挂 B，INV-E——
  *   F-A4 b① 行高感知 lineH 注入；存量缺陷态 rects 库数据零迁移，读时归并
- *   存量渐净；resolved 产物已过挂 A，幂等无害）；重锚+字形带计算=
- *   annotation-resolve 域（F-A4 拆件——组件 ≤250 红线）
- * - 打开文档/翻页时对每条标注 verifyQuote 重定位（排版变化自愈，仅影响显示不回写
- *   库；失败则按存量 rects 显示）。pdf.js 文本层异步入 DOM，MutationObserver +
- *   requestAnimationFrame 合并重算
+ *   存量渐净；resolved 产物已过挂 A，幂等无害）
+ * - 打开文档/翻页时三层编排重锚（[F-A8 门2] 项几何主链→DOM 回退→存量兜底
+ *   ——annotation-resolve-layered 域；仅显示不回写库；MutationObserver+rAF 合并）
  * - 点击标注：弹四选项菜单（AnnotationMenu：复制引文→剪贴板+失败 toast；删除→
  *   confirm→api.reader.deleteAnnotation；添加笔记→开批注编辑 AnnotationEditor
  *   （comment textarea，保存 api.reader.updateAnnotation）；取消收起）——点击他条
@@ -41,7 +39,9 @@ import { useEffect, useLayoutEffect, useState } from 'react'
 import type { Annotation, AnnotationRect } from '@shared/models/annotation'
 import { api, unwrap, ApiClientError } from '../../api/client'
 import { showToast } from '../../shared/ui/Toast'
-import { resolveAnnotationRects, normalizedLineHeight, matchBand, bandsNearRects, type ResolvedAnnotation, type RowBand } from './annotation-resolve'
+import { normalizedLineHeight, matchBand, bandsNearRects, type ResolvedAnnotation, type RowBand } from './annotation-resolve'
+import { resolveAnnotationRectsLayered } from './annotation-resolve-layered'
+import { usePageItemsStore } from './page-items.store'
 import { mergeRects } from './annotation-merge'
 import { pushUndo } from './annotation-undo'
 import { AnnotationEditor } from './AnnotationEditor'
@@ -58,7 +58,7 @@ const DELETE_CONFIRM = '删除这条标注？'
 /** 重锚后的显示矩形（id → { rects, bands }；缺项回退存量 rects） */
 type ResolvedRects = Record<string, ResolvedAnnotation>
 
-/** 弹层目标（连同命中矩形，供菜单/编辑器定位）——菜单与编辑器互斥使用同形 */
+/** 弹层目标（连同命中矩形供定位）——菜单与编辑器互斥使用同形 */
 interface PopupTarget {
   annotation: Annotation
   rect: AnnotationRect
@@ -75,27 +75,27 @@ export function AnnotationLayer(props: {
 }): JSX.Element | null {
   const { annotations, page, pageRoot, onChanged } = props
   const [resolved, setResolved] = useState<ResolvedRects>({})
-  // [F-A4 b①] 挂 B 行高感知 lineH（textLayer span 字号中位数/textLayer 盒高；
-  // 量测退化 undefined=旧行为——存量缺陷态 rects 读时归并同口径受益）
+  // [F-A4 b①] 挂 B 行高感知 lineH（textLayer span 字号中位数/textLayer 盒高；量测退化 undefined=旧行为）
   const [lineH, setLineH] = useState<number | undefined>(undefined)
-  // [F-A5 b] 存量回退 band：重锚失败（verifyQuote 假）的 rects 经同一
-  // bandsNearRects 单源（修前=F-11 分数回退行盒口径，票面 §0b③）
+  // [F-A5 b] 存量回退 band：重锚失败条目（S3b/S6）的 rects 经 bandsNearRects 单源
   const [fallbackBands, setFallbackBands] = useState<RowBand[]>([])
   const [menu, setMenu] = useState<PopupTarget | null>(null)
   const [editing, setEditing] = useState<PopupTarget | null>(null)
   const [busy, setBusy] = useState(false)
   // F-A3（INV-42）：选择模式自订阅（per-tab，SelectionLayer color 先例；props 零变）
   const selectionMode = useReaderStore((s) => s.tabs[s.activeId ?? '']?.selectionMode ?? false)
-  // 进入选择模式：关已开菜单/编辑器（S1/S5；草稿丢弃=Escape 同语义；切回不自动恢复）；useLayoutEffect=paint 前收起，无中间帧可点击已死弹层（票面 §4）
+  // [F-A8 门2 CR1] 页项 store 订阅（pages[page+1] 条目变化→resolve 重调度——
+  // store 晚于 textLayer 就绪竞态由订阅兜底；CR3 键=当前渲染页，文档切换=clear
+  // 重填；缺席归一 null——编排器 S0 判定口径）
+  const pageEntry = usePageItemsStore((s) => s.pages[page + 1]) ?? null
+  // 进入选择模式：关已开菜单/编辑器（S1/S5；useLayoutEffect=paint 前收起，票面 §4）
   useLayoutEffect(() => {
     if (selectionMode) { setMenu(null); setEditing(null) }
   }, [selectionMode])
 
   const pageAnnotations = annotations.filter((a) => a.page === page)
 
-  // 文本层就绪后重锚：verifyQuote 校正偏移（自愈排版漂移）→ findRangeAtOffset 重算 rects
-  // +行盒自适应字形带（F-A4 b②——annotation-resolve 域，组件 ≤250 红线拆出）；
-  // 失败回退存量，仅显示层不回写库
+  // 文本层就绪后重锚 [F-A8 门2]：三层编排（项几何→DOM→存量——layered 域；仅显示不回写）
   useEffect(() => {
     if (pageRoot === null) {
       return
@@ -107,10 +107,9 @@ export function AnnotationLayer(props: {
     let scheduled = false
     const resolve = (): void => {
       scheduled = false
-      const next = resolveAnnotationRects({ textLayer, annotations, page })
+      const next = resolveAnnotationRectsLayered({ textLayer, annotations, page, entry: pageEntry })
       setResolved(next)
       setLineH(normalizedLineHeight(textLayer))
-      // 重锚失败者存量 rects 过 band 单源（成功者 bands 已在 next——两路同数学）
       const failed = annotations.filter((a) => a.page === page && next[a.id] === undefined && a.rects.length > 0)
       setFallbackBands(failed.length > 0 ? bandsNearRects(textLayer, failed.flatMap((a) => a.rects)) : [])
     }
@@ -125,7 +124,7 @@ export function AnnotationLayer(props: {
     const observer = new MutationObserver(schedule)
     observer.observe(textLayer, { childList: true, subtree: true })
     return () => observer.disconnect()
-  }, [annotations, page, pageRoot])
+  }, [annotations, page, pageRoot, pageEntry])
 
   /** 批注保存：api 成功 → store 同步 → 收起弹层 → onChanged 通知 */
   async function saveComment(a: Annotation, comment: string): Promise<void> {
@@ -202,6 +201,7 @@ export function AnnotationLayer(props: {
               key={`${a.id}:${i}`}
               data-testid="annotation-rect"
               data-annotation-id={a.id}
+              data-source={resolved[a.id]?.source}
               role="button"
               aria-label={`标注：${a.quoteText}`}
               title={a.comment !== '' ? a.comment : a.quoteText}
diff --git a/src/renderer/features/reader/annotation-resolve-layered.ts b/src/renderer/features/reader/annotation-resolve-layered.ts
new file mode 100644
index 0000000000..d7826145e5
--- /dev/null
+++ b/src/renderer/features/reader/annotation-resolve-layered.ts
@@ -0,0 +1,239 @@
+/**
+ * [F-A8 门2] annotation-resolve-layered —— 标注重锚三层编排域（Annotation/
+ * AiAnnotationLayer 共形消费；设计书 docs/design/2026-09-04_f-seam-reanchor-design.md
+ * §1.1 态空间+主控终裁 CR1/CR3+增补节门 2 放行基准）。
+ *
+ * ── 行为层（S0~S6 状态机，每页一次编排）──
+ * - S0：entry=usePageItemsStore 页项条目（消费方 react 订阅传入——CR1 store
+ *   晚于 textLayer 就绪竞态由订阅兜底；CR3 resolve 取数以当前 page prop 为键
+ *   pages[page+1]，文档切换=store clear 重填，无旧文档命中）；
+ * - S1：reconcileItemsWithDom(items, fullTextOf(textLayer))——textLayer 已在场
+ *   时对账；失败 → warn 不静默+S4；
+ * - S2/S3a：对账通过 → resolveAnnotationRectsItem（门 0 纯域版）产物标
+ *   source='item'（项几何族主链——消 R1 跨族配对）；
+ * - S3b：主链条目缺席（verifyQuoteItem 失败/他页/空引文）→ 接线层回退存量
+ *   rects+bandsNearRects（消费方现状推导式，语义逐位保持）；
+ * - S4：页级回退=resolveAnnotationRectsDom（改名件函数体零改——INV-47 数值
+ *   面不动）产物标 source='dom'（仅显示不回写=INV-60）；
+ * - S6：S4 产物经 selectionHealth 判定（healthDom 口径——门 1 取证三形态，
+ *   scripts/audits/f-a8-gate1-diag.mjs :339）unhealthy → 抑制 DOM 产物显示
+ *   （Annotation=缺席回退存量；AI=该段不渲染）+warn 单源（本模块 warn 一处）。
+ *   名实声明（门一 W1）：S6 触发=项盒健康代理——blocks 经 clamp01×base 反推
+ *   构造恒落盒内，unhealthy 实由 boxes[项几何]越界触发；项盒健康而 DOM 链
+ *   独立病理时 S6 不拦（门 3 随回退层去留复核）。
+ *
+ * ── 接口层 ── / ── 架构层 ── / ── 生命周期层 ──
+ * - export function resolveAnnotationRectsLayered（Annotation 版——
+ *   AnnotationLayer 消费）/ resolveAiNotesLayered（AI 段版——AiAnnotationLayer
+ *   消费，S3b=不渲染语义）/ domProductSuppressed（S6 判定共享单源）；
+ * - 依赖单向：本模块→annotation-resolve/anchor-serialize/annotation-anchor/
+ *   pdf-item-geometry/page-items.store（零环）；DOM 只读（fullTextOf 文本遍历
+ *   仍唯经 annotation-anchor 契约）；
+ * - resolve 每次现读现算不缓存（MutationObserver+rAF 合并节奏随宿主——
+ *   F-A1 起不变；项几何缩放不变=zoom 随 store 条目 box 反推）。
+ *
+ * ── 文化层 ──
+ * - tests/unit/renderer/annotation-layer.test.tsx F-A8 门2 describe（挂载级
+ *   S0/S1/S2/S3b/S6/CR1 竞态 fixture+域标记断言）+ ai-annotation-layer.test.tsx
+ *   同构 describe；门 1 取证 G2 分离度=弱式可复现在案（健康 0/20 误伤+病理
+ *   2/15 触发——S6 保留+盲区登记，f-a8-gate1-impl.report.md §c）。
+ */
+import type { AiNote } from '@shared/models/ai-note'
+import type { Annotation, AnnotationRect } from '@shared/models/annotation'
+import { verifyQuote, verifyQuoteItem } from './anchor-serialize'
+import { findRangeAtOffset, fullTextOf, pixelBoxOf } from './annotation-anchor'
+import {
+  resolveAnnotationRectsDom,
+  resolveAnnotationRectsItem,
+  itemViewportOf,
+  bandsForTextNodes,
+  type ResolvedAnnotation,
+  type RowBand
+} from './annotation-resolve'
+import {
+  itemSelectionGeometry,
+  reconcileItemsWithDom,
+  rectsForOffsetRange,
+  selectionHealth
+} from './pdf-item-geometry'
+import type { PageItemEntry } from './page-items.store'
+
+/** warn 单源（S1 对账失败/S6 病理抑制两格——不静默先例，前缀统一可检索） */
+function warn(message: string): void {
+  console.warn(`[F-A8] ${message}`)
+}
+
+/** ResolvedAnnotation 产物统一标域（新对象不改下层函数返回——两下层零改） */
+function markSource(
+  next: Record<string, ResolvedAnnotation>,
+  source: 'item' | 'dom'
+): Record<string, ResolvedAnnotation> {
+  const out: Record<string, ResolvedAnnotation> = {}
+  for (const [id, v] of Object.entries(next)) {
+    out[id] = { ...v, source }
+  }
+  return out
+}
+
+/** S6 病理抑制判定（Annotation/AI 两消费方共享单源）：S4 DOM 回退产物经
+ *  selectionHealth 检验（healthDom 口径——boxes=项几何 rectsForOffsetRange 该
+ *  引文区间项盒，blocks=DOM 产物转 px（归一化域×entry.box 宽高）；base=entry
+ *  盒——盒本地帧，只消费宽高）。unhealthy → true+warn（抑制 DOM 产物显示）；
+ *  无判定材料（verifyQuoteItem null/项盒空/viewport 退化）→ false（保 S5——
+ *  S0 缺席路径本函数不被调）。
+ *  已知边界：DOM 产物经 clamp01 归一化（越界截断），反推 px 后右溢支路
+ *  ≈恒 0——rightOverflowPx 判定弱化为不可观测（s1rot 右溢 3.2px 形态不拦，
+ *  门 1 档在案）；outsideRatio 支路完整有效（s2crop 50~100% 盒外形态拦截）。 */
+export function domProductSuppressed(
+  entry: PageItemEntry,
+  sel: { prefix: string; quote: string; suffix: string; start: number },
+  domRects: AnnotationRect[]
+): boolean {
+  const viewport = itemViewportOf(entry)
+  if (!Number.isFinite(viewport.scale) || viewport.scale <= 0) {
+    return false
+  }
+  const at = verifyQuoteItem(entry.text.items, sel)
+  if (at === null) {
+    return false
+  }
+  const { boxes } = rectsForOffsetRange(entry.text.items, entry.text.styles, viewport, at, at + sel.quote.length)
+  if (boxes.length === 0) {
+    return false
+  }
+  const base = { x: 0, y: 0, w: entry.box.w, h: entry.box.h }
+  const blocks = domRects.map((r) => ({ x: r.x * base.w, y: r.y * base.h, w: r.w * base.w, h: r.h * base.h }))
+  const health = selectionHealth(boxes, blocks, base)
+  if (!health.unhealthy) {
+    return false
+  }
+  warn(
+    `S6 病理抑制：DOM 回退产物 selectionHealth unhealthy（outsideRatio=${health.outsideRatio.toFixed(3)}, rightOverflowPx=${health.rightOverflowPx.toFixed(1)}）——抑制显示`
+  )
+  return true
+}
+
+/** 三层编排（Annotation 版——AnnotationLayer resolve 闭包消费）：
+ *  产物 Record<id, ResolvedAnnotation>（source 域标记随行）；缺席条目由消费方
+ *  回退存量 rects+bandsNearRects（S3b/S6 同路径，现状推导式零改）。 */
+export function resolveAnnotationRectsLayered(args: {
+  textLayer: HTMLElement
+  annotations: Annotation[]
+  page: number
+  entry: PageItemEntry | null
+}): Record<string, ResolvedAnnotation> {
+  const { textLayer, annotations, page, entry } = args
+  if (entry !== null && reconcileItemsWithDom(entry.text.items, fullTextOf(textLayer))) {
+    return markSource(resolveAnnotationRectsItem(entry, annotations, page), 'item')
+  }
+  if (entry !== null) {
+    warn(`第 ${page + 1} 页 items/DOM 文本对账失败——S4 DOM 回退层接管`)
+  }
+  const domNext = resolveAnnotationRectsDom({ textLayer, annotations, page })
+  if (entry === null) {
+    return markSource(domNext, 'dom')
+  }
+  for (const a of annotations) {
+    const dom = domNext[a.id]
+    if (dom === undefined) {
+      continue
+    }
+    if (
+      domProductSuppressed(entry, { prefix: a.prefixText, quote: a.quoteText, suffix: a.suffixText, start: a.startOffset }, dom.rects)
+    ) {
+      delete domNext[a.id]
+    }
+  }
+  return markSource(domNext, 'dom')
+}
+
+/** AI 段编排产物（rects/bands 按原消费方缓存形分键+source 域标记随行） */
+export interface LayeredAiResolve {
+  rects: Record<string, AnnotationRect[]>
+  bands: Record<string, RowBand[]>
+  source: Record<string, 'item' | 'dom'>
+}
+
+/** 三层编排（AI 段版——AiAnnotationLayer resolve 闭包消费；与 Annotation 版
+ *  共形）：S1 通过 → 项几何主链（verifyQuoteItem start:0 漂移重定位——AI 行
+ *  无 startOffset；S3b=该段不渲染，AI 无存量可回退）；S1 失败/entry 缺席 →
+ *  S4 DOM 链（verifyQuote→findRangeAtOffset+bandsForTextNodes——原组件循环
+ *  迁入零改）+S6 抑制（同判定单源，抑制=不渲染）。 */
+export function resolveAiNotesLayered(args: {
+  textLayer: HTMLElement
+  notes: AiNote[]
+  page: number
+  entry: PageItemEntry | null
+}): LayeredAiResolve {
+  const { textLayer, notes, page, entry } = args
+  const out: LayeredAiResolve = { rects: {}, bands: {}, source: {} }
+  // viewport 退化案由与对账失败分案（门一 N1：对账已通过但 scale≤0 落 DOM 链
+  // ≠对账失败——AI 无存量可回退故降 DOM 链兜底；Annotation 版同因落 S3b）
+  let viewportDegraded = false
+  if (entry !== null && reconcileItemsWithDom(entry.text.items, fullTextOf(textLayer))) {
+    const viewport = itemViewportOf(entry)
+    if (Number.isFinite(viewport.scale) && viewport.scale > 0) {
+      const base = { x: 0, y: 0, w: entry.box.w, h: entry.box.h }
+      for (const n of notes) {
+        if (n.quoteText.length === 0) {
+          continue
+        }
+        const at = verifyQuoteItem(entry.text.items, {
+          prefix: n.prefixText,
+          quote: n.quoteText,
+          suffix: n.suffixText,
+          start: 0
+        })
+        if (at === null) {
+          continue
+        }
+        try {
+          const geo = itemSelectionGeometry({
+            items: entry.text.items,
+            styles: entry.text.styles,
+            viewport,
+            start: at,
+            end: at + n.quoteText.length,
+            base
+          })
+          if (geo !== null) {
+            out.rects[n.id] = geo.rects
+            out.bands[n.id] = geo.bands
+            out.source[n.id] = 'item'
+          }
+        } catch {
+          // 畸形 rotate 等计算异常——该段缺席（selection 快路径 itemChainFor 同款 try 先例）
+        }
+      }
+      return out
+    }
+    viewportDegraded = true
+  }
+  if (entry !== null) {
+    warn(
+      viewportDegraded
+        ? `第 ${page + 1} 页 viewport 退化（scale≤0）——S4 DOM 回退层接管（AI 段）`
+        : `第 ${page + 1} 页 items/DOM 文本对账失败——S4 DOM 回退层接管（AI 段）`
+    )
+  }
+  const base = pixelBoxOf(textLayer)
+  for (const n of notes) {
+    const at = verifyQuote(textLayer, { prefix: n.prefixText, quote: n.quoteText, suffix: n.suffixText, start: 0 })
+    if (at === null) {
+      continue
+    }
+    const range = findRangeAtOffset(textLayer, at, at + n.quoteText.length)
+    if (range === null || range.rects.length === 0) {
+      continue
+    }
+    if (entry !== null && domProductSuppressed(entry, { prefix: n.prefixText, quote: n.quoteText, suffix: n.suffixText, start: 0 }, range.rects)) {
+      continue
+    }
+    // [F-A5 b] 节点口径带：引文自身 textNodes→bandsForTextNodes（绑定不经几何
+    // 匹配——免疫 CSS 行盒整体偏移错绑上一行）
+    out.rects[n.id] = range.rects
+    out.bands[n.id] = bandsForTextNodes(range.textNodes.map((t) => t.node), base)
+    out.source[n.id] = 'dom'
+  }
+  return out
+}
diff --git a/src/renderer/features/reader/annotation-resolve.ts b/src/renderer/features/reader/annotation-resolve.ts
index c82ab4d865..d56fbe9d92 100644
--- a/src/renderer/features/reader/annotation-resolve.ts
+++ b/src/renderer/features/reader/annotation-resolve.ts
@@ -3,9 +3,10 @@
  * 拆出——组件 ≤250 行红线预裁；票面 §3 拆件结构）。
  *
  * ── 行为层 ──
- * - resolveAnnotationRects：verifyQuote 校正偏移（自愈排版漂移）→
- *   findRangeAtOffset 重算 rects——逐条等价自 AnnotationLayer 原 resolve
- *   闭包迁出（行为零变：失败回退存量，仅显示层不回写库）；
+ * - resolveAnnotationRectsDom [F-A8 门2 改名]：verifyQuote 校正偏移（自愈排版
+ *   漂移）→ findRangeAtOffset 重算 rects——原 resolveAnnotationRects 整体改名
+ *   降为 S4 页级回退层（**函数体零改**=INV-47 数值面不动，受锁断言锚）；
+ *   三层编排（项几何主链→本 DOM 回退→存量兜底）见 annotation-resolve-layered；
  * - resolveAnnotationRectsItem [F-A8 门0]：重锚纯域版（项几何族）——
  *   entry（page-items.store 页项）+annotations → verifyQuoteItem 逐条对账
  *   校偏 → itemSelectionGeometry 产 {rects,bands}；entry null→{}、失败条目
@@ -61,10 +62,13 @@ export interface RowBand {
   x1?: number
 }
 
-/** 重锚结果（id → { rects, bands }；缺项回退存量 rects 由消费方兜底） */
+/** 重锚结果（id → { rects, bands, source }；缺项回退存量 rects 由消费方兜底）。
+ *  source [F-A8 门2]=产物域标记（'item'=项几何主链 / 'dom'=S4 DOM 回退层）——
+ *  INV-60 显示覆盖语义锚：运行时调试面+单测断言面，不入库（渲染样式零差）。 */
 export interface ResolvedAnnotation {
   rects: AnnotationRect[]
   bands: RowBand[]
+  source?: 'item' | 'dom'
 }
 
 /** span 字体度量（canvas measureText 产物——墨带实界+回退字体布局带） */
@@ -267,8 +271,8 @@ export function bandsNearRects(textLayer: HTMLElement, rects: AnnotationRect[]):
   return bands
 }
 
-/** 重锚+行盒自适应（AnnotationLayer 挂 B 宿主调用；逐条等价迁出+band 增量） */
-export function resolveAnnotationRects(args: {
+/** 重锚+行盒自适应（S4 DOM 回退层——F-A8 门2 前为重锚主链；函数体零改） */
+export function resolveAnnotationRectsDom(args: {
   textLayer: HTMLElement
   annotations: Annotation[]
   page: number
@@ -369,8 +373,9 @@ export function resolveAnnotationRectsItem(
 /** 页项条目 → viewport（rotate=90/270 时 canvas 宽对应 view 高——宽高互换；
  *  box 反推 scale=Math.round 后 CSS 盒/跨度，与 clampScale(zoom) 真值差 <1px
  *  取整粒度——水平轴（宽）scale/base 严格约除消取整差；垂直轴依赖 box 宽高
- *  比≈view 跨度比，有界 ~1px 级相对残差=同族精度带内[门一 W3 口径]） */
-function itemViewportOf(entry: PageItemEntry): ItemViewport {
+ *  比≈view 跨度比，有界 ~1px 级相对残差=同族精度带内[门一 W3 口径]）。
+ *  [F-A8 门2] 导出：AI 段编排（annotation-resolve-layered）同源消费 */
+export function itemViewportOf(entry: PageItemEntry): ItemViewport {
   const [x0, y0, x1, y1] = entry.geometry.view
   const rot = ((entry.geometry.rotate % 360) + 360) % 360
   const domWidth = rot === 90 || rot === 270 ? y1 - y0 : x1 - x0
diff --git a/tests/unit/renderer/ai-annotation-layer.test.tsx b/tests/unit/renderer/ai-annotation-layer.test.tsx
index 10ecf17896..acf0a4dd90 100644
--- a/tests/unit/renderer/ai-annotation-layer.test.tsx
+++ b/tests/unit/renderer/ai-annotation-layer.test.tsx
@@ -19,6 +19,8 @@ import { locateAnchor } from '../../../src/renderer/features/reader/anchor-locat
 import { useReaderStore, type TabState } from '../../../src/renderer/features/reader/reader.store'
 import { QUESTION_COLOR } from '../../../src/renderer/features/reader/ai-note-style'
 import { PAGE_LAYER_Z } from '../../../src/renderer/features/reader/page-layer-z'
+import { usePageItemsStore, type PageItemEntry } from '../../../src/renderer/features/reader/page-items.store'
+import type { PdfTextItem, PdfTextStyle } from '../../../src/renderer/features/reader/PdfPageCanvas'
 
 // F-05：flashElement 滚动副作用替身（数学在 scroll-converge.test 锚定）
 const { scrollerMock } = vi.hoisted(() => ({ scrollerMock: vi.fn() }))
@@ -300,3 +302,113 @@ describe('F-A5 —— AI 段 band 单源（b 面）+色块垫底层序（c 面
     expect(parseFloat(r.style.height)).toBeCloseTo(1.625, 4)
   })
 })
+
+// ══ F-A8 门2：AI 段三层编排接线（项几何主链+S4 DOM 回退+域标记）══
+// 与 AnnotationLayer 共形（设计书 §1.1 态空间+终裁 CR1/CR3）；数值期望手算
+// （viewport [0,0,612,792]/scale=1/字号 10/ascent 0.8；quote='正文'@7..9 落
+// item['中段正文内容'] span[5,11) f0=2/6 f1=4/6→rect={105.3333,112,33.3333,10}
+// →left=17.2113%/top=14.1414%；jsdom DOM 链兜底=0/0/100% 形态可区分）。
+/** 门2 样式（门 0 anchor-item-verify.test 同款） */
+const FA8_STYLE: PdfTextStyle = { fontFamily: 'serif', ascent: 0.8, descent: -0.2, vertical: false }
+
+function fa8Item(str: string, y: number): PdfTextItem {
+  return { str, dir: 'ltr', width: 100, height: 10, transform: [10, 0, 0, 10, 72, y], fontName: 'g1', hasEOL: false }
+}
+
+function fa8Entry(items: PdfTextItem[]): PageItemEntry {
+  return {
+    page: 1,
+    text: { items, styles: { g1: FA8_STYLE }, lang: null },
+    geometry: { rotate: 0, view: [0, 0, 612, 792] },
+    box: { w: 612, h: 792 }
+  }
+}
+
+describe('F-A8 门2 —— AI 段三层编排接线（项几何主链+域标记）', () => {
+  beforeEach(() => {
+    usePageItemsStore.getState().clear()
+  })
+
+  /** DOM=单 span 三段拼接（与 items 拼接同串——S1 对账通过）；AI note 带
+   *  prefix/suffix 双锚（start=0 漂移重定位语义——AI 行无 startOffset） */
+  function anchorNote(): AiNote {
+    return {
+      ...note({ id: 'n-item', question: 'Q1', quote: '正文' }),
+      prefixText: '中段',
+      suffixText: '内容'
+    }
+  }
+
+  it('store 空（S0 缺席）→现状 DOM 链（S4）+域标记 dom', () => {
+    const pageRoot = makePageRoot('前文第一段中段正文内容后文第三段')
+    mount(
+      <AiAnnotationLayer aiNotes={[anchorNote()]} page={0} pageRoot={pageRoot} onJumpToNote={() => undefined} />
+    )
+    const r = rects()[0]!
+    expect(r).not.toBeUndefined()
+    expect(r.getAttribute('data-source')).toBe('dom')
+    expect(parseFloat(r.style.left)).toBeCloseTo(0, 3)
+    expect(parseFloat(r.style.width)).toBeCloseTo(100, 3)
+  })
+
+  it('store 注入 entry（S1 通过）→项几何主链（S2）+域标记 item+项几何手算数值', () => {
+    const pageRoot = makePageRoot('前文第一段中段正文内容后文第三段')
+    usePageItemsStore.getState().setEntry(
+      fa8Entry(['前文第一段', '中段正文内容', '后文第三段'].map((str, i) => fa8Item(str, 700 - i * 28)))
+    )
+    mount(
+      <AiAnnotationLayer aiNotes={[anchorNote()]} page={0} pageRoot={pageRoot} onJumpToNote={() => undefined} />
+    )
+    const r = rects()[0]!
+    expect(r).not.toBeUndefined()
+    expect(r.getAttribute('data-source')).toBe('item')
+    expect(parseFloat(r.style.left)).toBeCloseTo(17.2113, 3)
+    expect(parseFloat(r.style.top)).toBeCloseTo(14.1414, 3)
+  })
+
+  it('S3b：S1 通过但引文不存在于 items 域→该段零 rects（AI 无存量可回退）', () => {
+    const pageRoot = makePageRoot('前文第一段中段正文内容后文第三段')
+    usePageItemsStore.getState().setEntry(
+      fa8Entry(['前文第一段', '中段正文内容', '后文第三段'].map((str, i) => fa8Item(str, 700 - i * 28)))
+    )
+    mount(
+      <AiAnnotationLayer
+        aiNotes={[note({ id: 'miss', question: 'Q2', quote: '不存在的引文' })]}
+        page={0}
+        pageRoot={pageRoot}
+        onJumpToNote={() => undefined}
+      />
+    )
+    expect(rects().length).toBe(0)
+  })
+})
+
+// [F-A8 门2 回炉 W4] AI 侧 CR1 竞态 fixture（AnnotationLayer 同型——store 空挂载
+// →S4 dom；注入 entry→订阅触发重 resolve=项几何产物 item；S0 翻转断言）
+describe('F-A8 门2 回炉 W4 —— AI 侧 CR1 store 订阅竞态', () => {
+  beforeEach(() => {
+    usePageItemsStore.getState().clear()
+  })
+
+  it('store 空挂载→S4（dom）；注入 entry→订阅触发重 resolve=项几何产物（item）', () => {
+    const pageRoot = makePageRoot('前文第一段中段正文内容后文第三段')
+    const n = {
+      ...note({ id: 'n-race', question: 'Q1', quote: '正文' }),
+      prefixText: '中段',
+      suffixText: '内容'
+    }
+    mount(<AiAnnotationLayer aiNotes={[n]} page={0} pageRoot={pageRoot} onJumpToNote={() => undefined} />)
+    const before = rects()[0]!
+    expect(before).not.toBeUndefined()
+    expect(before.getAttribute('data-source')).toBe('dom')
+    act(() => {
+      usePageItemsStore.getState().setEntry(
+        fa8Entry(['前文第一段', '中段正文内容', '后文第三段'].map((str, i) => fa8Item(str, 700 - i * 28)))
+      )
+    })
+    const after = rects()[0]!
+    expect(after).not.toBeUndefined()
+    expect(after.getAttribute('data-source')).toBe('item')
+    expect(parseFloat(after.style.left)).toBeCloseTo(17.2113, 3)
+  })
+})
diff --git a/tests/unit/renderer/annotation-layer.test.tsx b/tests/unit/renderer/annotation-layer.test.tsx
index 00fd230dca..1d97b1267a 100644
--- a/tests/unit/renderer/annotation-layer.test.tsx
+++ b/tests/unit/renderer/annotation-layer.test.tsx
@@ -15,6 +15,8 @@ import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
 import { AnnotationLayer } from '../../../src/renderer/features/reader/AnnotationLayer'
 import type { Annotation, AnnotationRect } from '@shared/models/annotation'
 import { PAGE_LAYER_Z } from '../../../src/renderer/features/reader/page-layer-z'
+import { usePageItemsStore, type PageItemEntry } from '../../../src/renderer/features/reader/page-items.store'
+import type { PdfTextItem, PdfTextStyle } from '../../../src/renderer/features/reader/PdfPageCanvas'
 
 vi.mock('../../../src/renderer/api/client', () => ({
   api: { reader: {} },
@@ -188,3 +190,171 @@ describe('F-A5 —— 存量回退经 band（b 面）+色块垫底层序（c 面
     expect(layer!.style.mixBlendMode).toBe('')
   })
 })
+
+// ══ F-A8 门2：三层编排（S0~S6 状态机）+CR1 store 订阅竞态+域标记（挂载级）══
+// 设计书 docs/design/2026-09-04_f-seam-reanchor-design.md §1.1 态空间+终裁 CR1/CR3。
+// 数值期望全部手算（viewport [0,0,612,792]/scale=1/字号 10/ascent 0.8——
+// 项几何块=基线 css y=792−user y，盒=基线−ascent×fontH 高 fontH）。
+// 期望值清单（quote='正文'@7..9 落 item1['中段正文内容'] span[5,11) f0=2/6 f1=4/6）：
+// - S2 项几何：rect={105.3333,112,33.3333,10}/base{612,792}→left=17.2113%/
+//   top=14.1414%/width=5.4468%/height=1.2626%（band 同盒→bandVertical 同值）；
+// - 存量回退（S3b/S6）：rects=(0.05,0.25,0.5,0.02) F-11 分数→top=25.2%/height=1.56%；
+// - S0/S4 jsdom DOM 链兜底（clientRects 空退父元素盒 1×1）→left=0/width=100。
+
+/** 门2 样式（门 0 anchor-item-verify.test 同款：ascent 0.8/descent −0.2） */
+const FA8_STYLE: PdfTextStyle = { fontFamily: 'serif', ascent: 0.8, descent: -0.2, vertical: false }
+
+/** 三段文本 fixture（items 与 DOM <p> 同文本同序——S1 对账通过的基准形态） */
+const FA8_PARAS = ['前文第一段', '中段正文内容', '后文第三段']
+
+function fa8Item(str: string, y: number): PdfTextItem {
+  return { str, dir: 'ltr', width: 100, height: 10, transform: [10, 0, 0, 10, 72, y], fontName: 'g1', hasEOL: false }
+}
+
+/** 段落 → 页项（基线 y 逐段递减 28——盒内形态） */
+function fa8Items(paras: string[] = FA8_PARAS, y0 = 700): PdfTextItem[] {
+  return paras.map((str, i) => fa8Item(str, y0 - i * 28))
+}
+
+/** 页项条目（612×792/scale=1——store 写者契约同式，键 1 基） */
+function fa8Entry(items: PdfTextItem[]): PageItemEntry {
+  return {
+    page: 1,
+    text: { items, styles: { g1: FA8_STYLE }, lang: null },
+    geometry: { rotate: 0, view: [0, 0, 612, 792] },
+    box: { w: 612, h: 792 }
+  }
+}
+
+/** 页根：textLayer 内逐段 <p>（fullTextOf=段落拼接） */
+function fa8PageRoot(paras: string[] = FA8_PARAS): HTMLElement {
+  const page = document.createElement('div')
+  const textLayer = document.createElement('div')
+  textLayer.className = 'textLayer'
+  for (const p of paras) {
+    const el = document.createElement('p')
+    el.textContent = p
+    textLayer.appendChild(el)
+  }
+  page.appendChild(textLayer)
+  return page
+}
+
+/** 门2 标注：quote='正文'（DOM/items 均在偏移 7），存量 rects=S3b/S6 回退渲染面 */
+function fa8Annotation(over: Partial<Annotation> = {}): Annotation {
+  return {
+    id: 'a-fa8',
+    paperId: 'p-1',
+    page: 0,
+    kind: 'highlight',
+    color: 'yellow',
+    quoteText: '正文',
+    prefixText: '中段',
+    suffixText: '内容',
+    startOffset: 7,
+    endOffset: 9,
+    rects: [{ page: 0, x: 0.05, y: 0.25, w: 0.5, h: 0.02 }],
+    comment: '',
+    createdAt: '2026-09-04T00:00:00Z',
+    updatedAt: '2026-09-04T00:00:00Z',
+    ...over
+  }
+}
+
+describe('F-A8 门2 —— 三层编排（S0~S6）+CR1 store 订阅竞态+域标记', () => {
+  beforeEach(() => {
+    usePageItemsStore.getState().clear()
+  })
+
+  function mountFa8(ann: Annotation, pageRoot: HTMLElement): void {
+    act(() => {
+      root!.render(
+        <AnnotationLayer annotations={[ann]} page={0} pageRoot={pageRoot} onChanged={() => undefined} />
+      )
+    })
+  }
+
+  it('S0 页项缺席（store 空）→S4 DOM 链产物+域标记 dom', () => {
+    const pageRoot = fa8PageRoot()
+    document.body.appendChild(pageRoot)
+    mountFa8(fa8Annotation(), pageRoot)
+    const block = host!.querySelector<HTMLElement>('[data-testid="annotation-rect"]')
+    expect(block).not.toBeNull()
+    expect(block!.getAttribute('data-source')).toBe('dom')
+    expect(inlinePct(block!, 'left')).toBeCloseTo(0, 3)
+    expect(inlinePct(block!, 'width')).toBeCloseTo(100, 3)
+  })
+
+  it('S1 对账失败（items≠DOM 文本，几何盒内）→S4 DOM 产物保留+对账失败 warn 不静默', () => {
+    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
+    const pageRoot = fa8PageRoot()
+    document.body.appendChild(pageRoot)
+    usePageItemsStore.getState().setEntry(fa8Entry([fa8Item('额外前缀', 700), ...fa8Items()]))
+    mountFa8(fa8Annotation(), pageRoot)
+    const block = host!.querySelector<HTMLElement>('[data-testid="annotation-rect"]')
+    expect(block).not.toBeNull()
+    expect(block!.getAttribute('data-source')).toBe('dom')
+    expect(warnSpy.mock.calls.some((c) => String(c[0]).includes('对账失败'))).toBe(true)
+    warnSpy.mockRestore()
+  })
+
+  it('S1 通过→S2 项几何主链产物：域标记 item+项几何手算数值', () => {
+    const pageRoot = fa8PageRoot()
+    document.body.appendChild(pageRoot)
+    usePageItemsStore.getState().setEntry(fa8Entry(fa8Items()))
+    mountFa8(fa8Annotation(), pageRoot)
+    const block = host!.querySelector<HTMLElement>('[data-testid="annotation-rect"]')
+    expect(block).not.toBeNull()
+    expect(block!.getAttribute('data-source')).toBe('item')
+    expect(inlinePct(block!, 'left')).toBeCloseTo(17.2113, 3)
+    expect(inlinePct(block!, 'top')).toBeCloseTo(14.1414, 3)
+    expect(inlinePct(block!, 'width')).toBeCloseTo(5.4468, 3)
+    expect(inlinePct(block!, 'height')).toBeCloseTo(1.2626, 3)
+  })
+
+  it('S3b 条目回退：S1 通过但引文不存在于 items 域→存量 rects 渲染（F-11 分数）+无域标记', () => {
+    const pageRoot = fa8PageRoot()
+    document.body.appendChild(pageRoot)
+    usePageItemsStore.getState().setEntry(fa8Entry(fa8Items()))
+    mountFa8(fa8Annotation({ quoteText: '不存在的引文' }), pageRoot)
+    const block = host!.querySelector<HTMLElement>('[data-testid="annotation-rect"]')
+    expect(block).not.toBeNull()
+    expect(block!.getAttribute('data-source')).toBeNull()
+    expect(inlinePct(block!, 'top')).toBeCloseTo(25.2, 3)
+    expect(inlinePct(block!, 'height')).toBeCloseTo(1.56, 3)
+  })
+
+  it('S6 病理抑制：对账失败+区间项盒全盒外→DOM 产物抑制（直显存量 rects）+warn 单源', () => {
+    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
+    const pageRoot = fa8PageRoot()
+    document.body.appendChild(pageRoot)
+    // items 拼接≠DOM（S1 失败）+quote 命中项基线 y=-128（css y=920 全盒外→outsideRatio=1）
+    usePageItemsStore.getState().setEntry(
+      fa8Entry([fa8Item('额外前缀', 700), fa8Item('前文第一段', 700), fa8Item('中段正文内容', -128), fa8Item('后文第三段', 700)])
+    )
+    mountFa8(fa8Annotation(), pageRoot)
+    const block = host!.querySelector<HTMLElement>('[data-testid="annotation-rect"]')
+    expect(block).not.toBeNull()
+    expect(block!.getAttribute('data-source')).toBeNull()
+    expect(inlinePct(block!, 'top')).toBeCloseTo(25.2, 3)
+    expect(inlinePct(block!, 'height')).toBeCloseTo(1.56, 3)
+    expect(warnSpy.mock.calls.some((c) => String(c[0]).includes('病理抑制'))).toBe(true)
+    warnSpy.mockRestore()
+  })
+
+  it('CR1 竞态：store 空挂载→S4（dom）；注入 entry→订阅触发重 resolve=项几何产物（item）', () => {
+    const pageRoot = fa8PageRoot()
+    document.body.appendChild(pageRoot)
+    mountFa8(fa8Annotation(), pageRoot)
+    const before = host!.querySelector<HTMLElement>('[data-testid="annotation-rect"]')
+    expect(before).not.toBeNull()
+    expect(before!.getAttribute('data-source')).toBe('dom')
+    act(() => {
+      usePageItemsStore.getState().setEntry(fa8Entry(fa8Items()))
+    })
+    const after = host!.querySelector<HTMLElement>('[data-testid="annotation-rect"]')
+    expect(after).not.toBeNull()
+    expect(after!.getAttribute('data-source')).toBe('item')
+    expect(inlinePct(after!, 'left')).toBeCloseTo(17.2113, 3)
+  })
+})

```
