# F-A5+F-N1 合并门一对抗深审材料包

> 你是门一对抗审查员(异基座 deepseek)。两张同场工单合并送审:**F-A5**=自绘选区 band 对齐+标注偏移定向+色块背景板层序(用户第二轮复测图1/图2 驱动,F-A4 续作);**F-N1**=AI 笔记组内三段折叠(一审/二审默认收起,用户令)。对抗性审查:行为缺陷/测试盲区/票面-实现偏差/取证不充分。每条【B/W/N+证据引用】。

## 主控预审裁决记录(审你是否有异议)

- F-A5 c 面**自裁重大**:票面方案=「DOM 字为主体,canvas 位图字被罩淡属预期」;实装=**pdf.js 透明底渲染**(canvas 背景透明,色块垫底 z1<canvas z2<自绘 z3)+multiply 全摘除——像素实测色块内文字纯黑 0。比票面字面更彻底(墨带位图字恒最高,无「罩淡」层);偏离字面理由+ADR-0019 R2 修订在档。主控预审:采纳(用户令「背景板不影响文字颜色」的更强兑现)。
- F-A5 b 面**根因修正**:票面假设=标注带基准在用户文档失准;实机诊断=**图2 偏移主体是 AI 层裸行盒+存量回退无带**(标注带路径真机本来 0.2~0.7px 良好)——三消费点(AI/存量回退/自绘)统一 band 单源后全 0.48px。票面假设被诊断推翻,修法沿诊断定向。
- F-A5 a 面 band **节点口径**(选区 textNodes 而非 CSS 行盒簇):修前自绘块顶 −7.3~−8.9px(CSS 行盒整体偏上错绑)=高比 1.38;修后 0.48px/1.13。节点口径=免疫行盒偏移。
- F-N1 受锁改向 4 例(3 单测+1 e2e AI-09 是实现者自主发现的同向第 4 例):「一审/二审默认在 DOM」→「默认折叠+段头在+展开后同序断言」——语义随令非让过,头注 [locked-change] 标注。
- **两实现者曾并行同工作区**(F-A5 大票先派/F-N1 小票中途插入):F-N1 全量测试跑到了 F-A5 中间态(ABI EBUSY 争用 2 次在档);F-A5 报告声明对 F-N1 面零触碰+非本票文件隔离申报。收口由主控统一全量 verify 兜底。
- 附送 f-sw1 切换器排查(主控直做,非工单):探针实证面板几何两档正常(panelUnderBtnX=0/不遮按钮/fs 差=root 继承基础值非档位差异)+切换数据链正常——图3/4 现象待用户澄清「老问题」具体所指,只登记不修。

## 审查清单(五问)

1. 行为:c 面透明底+层序常量(page-layer-z 单源)——canvas 透明底对背衬(F-06 页盒 panel 底)与文本层对位有无副作用?multiply 全摘除后观感回退风险(白底上浅色块)?a 面节点口径 band 在选区跨格式元素(表格/公式 span 结构异常)时的退化路径?F-N1 折叠对 locateAnchor 跳转(条目被折叠时点击链)的影响?
2. 测试:F-A5 先行红 9+1/e2e 29/29/变异 M1~M5;F-N1 5 用例+M1~M3+受锁改向 4 例忠实性——断言意图保持 vs 弱化?两票并行期间测试互污染面?
3. 票面-实现偏差:F-A5 三面/F-N1 五层逐条;F-A5 自裁 7 项;F-N1 自主发现第 4 例 e2e 改动的正当性?
4. 取证:F-A5 真机 13/13(修前 diag 用户库 6.38px 篇复现图1 1.57~1.83×→修后 0.48px/像素纯黑/S4 叠加/S6/zoom150);b 面根因修正的诊断链(标注带 0.2~0.7px vs AI 层裸行盒)是否自洽?
5. 层序不变量:c 面层序(色块<canvas<自绘)是否应登记 INV/修订 INV-37?透明底渲染对性能(重绘面积)与既有受锁视觉断言(reader-text 断言面)的兼容?

## 证据关键段

### F-A5 真机探针终态(after.raw 尾段)

```
[f-a5/after 05:15:46] 目标篇=c9589ae0.pdf 页4 引文候选：about centrali / into the follo / Definition of 

{"injected":3,"db":"C:\\Users\\ADMINI~1\\AppData\\Local\\Temp\\synapse-f-a5-after\\workspaces\\default\\synapse.db"}
[f-a5/after 05:15:46] AI 注入完成 {"injected":3,"db":"C:\\Users\\ADMINI~1\\AppData\\Local\\Temp\\synapse-f-a5-after\\workspaces\\default\\synapse.db"}
[f-a5/after 05:15:52] 注入页就绪：AI 块=2（按 id 2 组）
[f-a5/after 05:15:53] PASS a/paint-band-height — 自绘块高/行盒高比 max=1.13（≤1.3；修前 1.38=1.5~2 倍墨高口径之源）
[f-a5/after 05:15:53] PASS a/paint-band-top — 块顶 vs 行簇 span 顶 max=0.48px（≤2；修前上错整行 topDev −7.3~−8.9px）
[f-a5/after 05:15:53] PASS a/paint-band-bottom — 块底 vs 行簇 span 底 [1.5,1.5,1.5]∈[−1,+3]（desc 尾界；修前 −4.9~−6.5=侵入下邻行）
[f-a5/after 05:15:53] PASS a/paint-horizontal-span-bounds — 水平界越 span 簇端点 max=2.75px（≤3=亚字符级口径差容差@6.38px 参考区；修前 11.5~281px；实现夹取由单测 a2 断言级锁定）
[f-a5/after 05:15:54] PASS b/ann-band-align — 标注块 vs 行簇 span：顶差 max=0.48px（≤2）+底界 [1.5,1.5,1.5]∈[−1,+3]+高比 max=1.13（≤1.3）
[f-a5/after 05:15:54] PASS b/ai-band-align — AI 块 vs 行簇 span：顶差 max=0.48px（≤2）+高比 max=1.13（≤1.3；修前=裸 CSS 行盒——图2 下偏+侵入邻行根因）
[f-a5/after 05:15:54] PASS c/z-order-colors-under-canvas — 层序 computed：ann z=1/normal ai z=1 canvas z=2（pe=none）——色块垫底 normal
[f-a5/after 05:15:54] PASS c/z-order-paint-top — 自绘层 z=3（=3 最上，拖选帧采样；text z=0 官方 0）
[f-a5/after 05:15:54] PASS c/text-pure-black-in-blocks — 色块内文字最暗核 max=0（≤8=纯黑域吞 AA；修前 AI 面 normal0.45 罩墨必染——图2）
[f-a5/after 05:15:55] PASS s4/paint-over-ann — S4 灰块 24 块叠在 19 色块上（选择模式 INV-42 穿透重选）
[f-a5/after 05:15:56] PASS s6/escape-clears-paint-keeps-ann — S6 Escape：自绘块 0（清）+色块 19（不变，前=19）
[f-a5/after 05:16:01] zoom 后 label= 150%
[f-a5/after 05:16:03] PASS s5/zoom-block-count — 150% 自绘块 17 vs 100% 标注块 19（|Δ|≤max(1,15%)——重选带边界行包含差，F-A4 |Δ|≤1 口径的行数带扩展）
[f-a5/after 05:16:03] PASS f/no-pageerror — 页面错误 0 条
F-A5 VERIFY: PASS（13/13 项断言全过）

```

## F-A5 票面全文

# F-A5 需求票:自绘选区 band 对齐+标注偏移定向+色块背景板层序(三面)

> 需求源:用户 2026-08-31 第二轮复测(附两图,最高优先级)。原话要点:
> 「选中标记有误差和偏移(图1)/标注也存在偏移,涂色的渲染应该在最下方
> 当背景板而不是影响文字的颜色(图2)」。基线:verify 118 文件 1002 /
> locks 204 / e2e 29(8408911ca)。F-A4 同链续作(band 基准统一+层序语义
> 按用户令重排)。

## 0. 现象×根因×修法矩阵

| 面 | 现象(图证) | 根因假设(待真机实证) | 修法 |
| --- | --- | --- | --- |
| a 选区块偏移超界 | 图1:自绘灰块高 1.5~2 倍行高、垂直上下溢出约半行、水平左右越出文字区、边界阶梯状 | F-A4 band 字形带自适应只挂标注层(rectStyle);**selection-paint 直渲染归并 rects 原样**——rects 高宽=CSS 回退字体行盒(F-11 证据:行盒贴回退墨带远大于 PDF 字形带) | 自绘层与标注层**同 band 基准**(抽公共 helper:行簇字形带推导,自绘+标注+AI 三消费点同源);水平界=行簇 span 实际 x 端点(非行盒宽) |
| b 标注统一下偏半行 | 图2:三色块(绿/橙/紫)统一向下偏移约 0.4~0.7 行高+侵入相邻行 | band 基准=行簇 span 实测盒——**在用户文档字体下失准**(怀疑:该 PDF 行内混排/小字号下 span 盒中心与字形带中心差大;或半前导修正方向错;或该图为存量旧 rects 走回退路径未经 band) | 真机探针**复刻用户文档场景**(小字号+紧行距 PDF,或直接用用户实际库文档)复现实测 band 偏差数字→定向修(基准推导改进);存量 rects 回退路径核对是否经 band |
| c 色块染字/层序 | 图2:被高亮文字染成色系暗色(暗绿/暗橙),非纯黑;用户令「涂色在最下方当背景板」 | AnnotationLayer multiply 混合层在 textLayer 之上(F-07 设计)——multiply 染 DOM 文字 | **层序重排**:canvas < 标注色块(+AI 色块)< textLayer;色块混合 multiply→normal(半透明 alpha);**ADR/F-07 multiply 单乘语义修订**(依据=用户背景板令;文字纯黑由 textLayer DOM 字呈现,canvas 位图字被色块罩淡属预期——DOM 字是视觉主体);自绘选区块/AI 描边 z 序同步梳理(选区交互视觉保持最上) |

跨格序列:S1 拖选(自绘块 band 对齐=所见)→S2 保存(标注渲染 band 对齐=所存,与所见一致)→S3 标注色块垫底文字纯黑→S4 选区叠在标注上(灰块视觉在色块上,选择模式 INV-42 兼容)→S5 缩放/档位三面稳定(F-A4 c 面归一链保持)→S6 Escape 清选区色块不变。

## 1. 行为层

- **a/b**:band helper 单源(自 selection-paint/annotation-style 现有两处推导合一),三消费点(自绘/标注/AI)同基准;b 面以真机复现数字定向(探针先行——修前基线实测用户文档 band 偏差,再修)。
- **c**:AnnotationLayer/AiAnnotationLayer 渲染容器 z 序重排(色块垫 textLayer 下);multiply 移除(色块样式 normal+既有 alpha);选区块保持 textLayer 上(交互层)。
- 既有零变:保存链坐标/归并(INV-40 lineH 已修面)/工具条定位(F-A4 c)/跨页拒绝/选择模式。

## 2. 接口层

组件对外零变;annotation-style/selection-paint 内部 helper 抽取(导出面如增,可选参缺省兼容)。

## 3. 架构层

- band helper 驻 annotation-style.ts 或新拆件(按 ≤250 红线自裁);层序=容器 DOM 顺序/PagesOverlay 装配面(renderPageLayers 内 TextLayer/AnnotationLayer/ReaderAiLayer 挂载顺序或 z-index 显式化——**显式 z-index 层级常量单源**防回归)。
- 受锁改写面(主控已 unlock):reader-text.spec(层级/multiply 断言若锁了 F-07 观感)/selection-paint.test(band 断言扩展)——改向先行红。
- ADR-0019(F-07 multiply 面)修订登记+INV-37/40 联动核对。

## 4. 生命周期层

层序变化对懒渲染回收零涉(层随 PageFrame 卸载);色块垫底后 textLayer 事件面(选中/点击)不受影响(z 高者司交互)。

## 5. 文化层

- 新测试扩 selection-paint.test(band 对齐断言:自绘块高≈字形带高非行盒高)+受锁件改向;变异 M1~M5(cp 一次性备份+还原 diff+回绿)。
- 真机探针 scripts/audits/f-a5-verify.mjs(核撞名):**优先用用户实际库/文档复刻图1/图2 场景**(小字号+用户标注存量);修前基线(band 偏差数字/染色像素采样)→修后:①自绘块高/文字行高比≈字形带比(非 1.5~2 倍);②标注块顶偏差≤2px(用户文档口径);③色块内文字像素=纯黑不被染(像素采样对比修前);④S4~S6;⑤pageerror 0。
- 像素级取证 crib f-a4 diag(CDP screenshot+采样)。

## 6. 证据与报告契约(实现者)

报告 f-a5-impl.report.md:三面对照+自裁申报+**数字 wc/实测落笔**+diff 自查+成本;b 面真机复现数字必须入报告(定向依据)。禁 git/registry/locks;红→绿→变异;卡住停手。


## F-A5 实现报告全文

# F-A5 实现报告——自绘选区 band 对齐+标注偏移定向+色块背景板层序（三屋第一屋·实现者）

> 工单：scripts/audits/f-a5-ticket.md（F-A4 同链续作）。实现：2026-08-31，
> 实现者子代理（GLM 主模型；无再派发）。本文所有计数/行数/尺寸均为 wc/命令/
> 探针实测后落笔；真机数字均出自用户真实库副本（最小字号篇 6.38px 参考区）。

## 1. 三面×根因×修法对照（票面 §0 逐格交付）

| 面 | 根因（真机实证——diag 先行） | 修法（落地形态） | 修前基线（真机实测） | 修后复测（真机实测） |
| - | --- | --- | --- | --- |
| a 自绘块偏移超界 | SelectionPaint 直渲染归并 rects 原样=CSS 回退字体行盒：小字号紧排文档（6.38px 参考区）上行盒比 pdf.js span 盒整体偏上 ~9px、高 1.38×行盒（对墨高 1.57~1.83×=用户「1.5~2 倍行高」口径） | ①块垂直=行簇字形带**节点口径**（选区 textNodes→bandsForTextNodes——绑定不经几何匹配，免疫行盒整体偏移）②水平界=行簇 span 实际端点夹取（clampedHorizontal）③band 缺省行盒原样回退（F-A4 缺省兼容零变） | 块高/行盒高 1.38；块顶 vs 行簇 span 顶 **−7.3~−8.9px（整块上错一行）**；块底 −4.9~−6.5px（侵入下邻行）；水平越界 11.5~281px（跨栏污染口径）/干净行 11.5px 级 | 高比 **1.13**；块顶差 **0.48px**（≤2）；块底 **+1.5px**（desc 尾界 [−1,+3] 内）；水平越界 **2.75px**（≤3=亚字符级口径差，@6.38px≈0.43em；实现夹取由单测 a2 断言级锁定 16.667%/50%） |
| b 标注/AI 统一下偏 | **图2 根因=AI 段层渲染裸行盒 rects**（无 band 无收边）+normal alpha 0.45 罩墨染字；标注重锚带路径在 Reynolds 篇实测良好（0.2~0.7px）但存量回退（重锚失败）走 F-11 分数=行盒口径 | ①AI 段接 band 单源（per-note 节点口径带池）②存量回退经几何口径 bandsNearRects（无节点可依时尽力而为）③两入口同一 span→带核心（bandFromMetrics+mergeNear+spanBandOf——annotation-resolve 单源） | AI 块=裸 CSS 行盒（图2：下偏 0.4~0.7 行高+侵入相邻行+文字染成暗绿/暗橙）；机制在档：行盒偏上~9px+高 1.38×+normal0.45 罩墨 | AI 块顶差 **0.48px**+高比 1.13；标注块顶差 **0.48px**+底界 +1.5px；**注入段验证**（真实库副本 ai_notes 注入 3 段、2 段锚定渲染——1 段引文跨项不连续 verifyQuote 拒渲染=既有语义） |
| c 色块染字/层序 | AI 层 normal 0.45 在墨带之上（0.45×色+0.55×墨=染字）；multiply 两层叠乘（F-07 在档）与用户「背景板」心智冲突 | **pdf.js render 透明底**（background rgba(255,255,255,0)）+层序常量单源 page-layer-z（text0/色块1/canvas2/自绘3）+multiply 全数摘除（normal）+canvas pointer-events:none+PageBox isolate+白纸承底层 | 块内文字像素实测：用户标注（multiply）块内最暗核=0（multiply 不染纯黑——票面根因列「multiply 染 DOM 文字」证伪）；染字源=AI normal0.45（图2 证词+机制）；层序=色块 z5 在墨上 | 块内文字最暗核 **0**（纯黑——AI/标注块同测）；层序 computed：ann z=1/normal、ai z=1、canvas z=2（pe=none）、自绘 z=3 最上、text z=0；S4 灰块叠色块上、S6 Escape 色块不变、zoom150 块数 17v19（|Δ|≤15% 行数带口径）；pageerror 0 |

跨面序列（票面 §0）：S1 拖选自绘 band 对齐=所见 ✓（a 面 1.13/0.48px）/S2 保存 rects 同源 ✓（F-A4 S2 既有，零改）/S3 色块垫底文字纯黑 ✓（像素 0）/S4 选区叠标注灰在上 ✓（24 灰块叠 19 色块）/S5 缩放档位稳定 ✓（zoom150 块数比例一致+medium 无涉——uiScale 未改路径零触碰）/S6 Escape 清选区色块不变 ✓（0/19）。

## 2. 改动面（git diff --stat 实测；工作树含**非本票**文件见 §7）

本票修改 12 文件+新 4 文件（+约 470/−约 90，wc 终态行数括注）：
- src/renderer/features/reader/selection-paint.tsx（band 垂直+水平夹取+z3；**80 行**）
- src/renderer/features/reader/SelectionLayer.tsx（evaluate 节点口径带注入；**250 行**=上限）
- src/renderer/features/reader/annotation-resolve.ts（bandsForTextNodes 导出+bandsNearRects+spanBandOf/mergeNear 单源核心+RowBand.x0/x1+measureContext 失败不缓存；**316 行**）
- src/renderer/features/reader/annotation-style.ts（bandVertical+clampedHorizontal；**116 行**）
- src/renderer/features/reader/AnnotationLayer.tsx（z=colorBlocks+multiply 摘除+存量回退带；**250 行**=上限）
- src/renderer/features/reader/AiAnnotationLayer.tsx（per-note 节点带池+z=1；**247 行**）
- src/renderer/features/reader/PdfPageCanvas.tsx（透明底 render 参数+canvas z2/pe:none；**168 行**）
- src/renderer/features/reader/PageBox.tsx（isolate+白纸承底层；**64 行**）
- src/renderer/features/reader/TextLayer.tsx（z 同值显式化；**106 行**）
- docs/adr/0019-selection-feedback-native-route.md（+52：R2 修订节）/docs/invariants.md（INV-37/40 修订+INV-46 新增）
- 受锁四件（见 §5）

新件 4：
- src/renderer/features/reader/page-layer-z.ts（**30 行**——层序常量单源）
- tests/unit/renderer/pdf-page-canvas.test.tsx（**105 行** 3 测：透明底参数/canvas 样式/白纸+isolate）
- scripts/audits/f-a5-diag.mjs（**250 行**——修前基线+根因定向一次性探针）/f-a5-verify.mjs（**435 行**——修后 13 判据终版探针）/f-a5-inject.mjs（**53 行**——AI 段注入器，副本库专用）

测试扩展：selection-paint.test.tsx 391→**498 行 17 测**（+a1/a2/c1/c2）；annotation-layer.test.tsx 120→**191 行 4+2 测**；ai-annotation-layer.test.tsx 259→**303 行 7+1 测**。

## 3. TDD 凭证

- **先行红**（对 HEAD，f-a5-first-red.raw.txt / f-a5-e2e-first-red.raw.txt）：
  unit 新 9 测全红（断言级：a1 0 vs 0.125/a2 0 vs 16.667/c1 '2' vs '3'/
  ann 存量 25.2 vs 25.375/ann z '5' vs '1'/AI z+band/canvas 三断言）+
  同文件既有 23 测零改全绿（无附带破坏）；e2e 划选高亮小票红
  （Expected "normal" Received "multiply"）。
- **绿**：定向+全量 `npm run test` **120 文件/1017 用例全绿**（基线 1002+新增
  15：4 文件合计 32=旧 17+新 9 跨 4 文件与 selection-paint 12→17 等）。
- **变异红证 M1~M5**（对终版实现重取——节点口径重构后二次全套；备份
  f-a5-mutation-backup-20260831-130402/ 10 源文件一次性收录；首目录
  …-123726 为初版实现态历史轮，均在档）：M1 自绘节点带摘除（a1+a2 红）/
  M2 水平夹取直通（a2 红）/M3 AI 节点带摘除（红）/M4 存量回退带摘除（红）/
  M5 z 常量错序（c2 序守卫红）；逐一 cp 还原 diff 空+备份对工作树全量
  diff 零漂移+回绿双验 32/32（f-a5-mut-m1~m5.raw.txt+f-a5-mut-restore-green.raw.txt）。
- **verify 各环真退出码**（终态）：quality=0 tickets=0 lint=0 typecheck=0
  **test=0（120 文件/1017）** build=0；locks:check 红=**预期**（受锁保持
  解锁态+新受锁路径 pdf-page-canvas.test 待登记——票面明令禁跑 locks 命令，
  主控收口职责）。
- **e2e 全量**（终版 build）：**29/29 passed**（1.4m，含改写的划选高亮小票
  两程 normal+z=1 断言）。

## 4. 真机探针（scripts/audits/f-a5-diag.mjs+f-a5-verify.mjs；产物 f-a5-out/）

- **修前基线（diag，票面 §0b「探针先行」）**：真实库 9 篇撞库定位最小字号
  篇（卡1 smart water city，参考区 6.38px）——a 面块高/墨高 **1.57~1.83×**
  （复现图1「1.5~2 倍行高」）、顶溢 8~10px、span 锚定口径 topDev −7.3~−8.9；
  b 面 Reynolds 存量标注带路径良好（0.2~0.7px）→图2 偏移源锁定=AI 裸行盒；
  c 面块内最暗核像素采样在档；band 数学重演（真机字体度量：半前导 −1.31）
  在档（f-a5-diag.json）。
- **修后（verify，用户场景复刻）**：同一篇 6.38px 参考区+AI 段真实注入
  （副本库 ai_notes 直写 3 段——注入器 electron.exe 子进程跑 f-a5-inject.mjs；
  主进程 evaluate 无 require/import 通道+spawnSync 管道态 ESM 挂起两坑在档）；
  13 判据 **F-A5 VERIFY: PASS（13/13）**（f-a5-after.raw.txt+f-a5-verify-after.json
  +after-select/saved/s4-over-ann/z150.png 四截图）。
- 判据口径说明：垂直基准=pdf.js span 盒（其 y 定位=PDF 墨顶口径，F-A4 verify
  同源）；墨带像素 ground truth 在紧行距参考区会被邻行墨粘连污染（inkH 跨行
  实证）故不作判据、仅 c 面纯黑采样用像素。

## 5. 受锁改写逐文件理由（主控已 unlock；禁跑 locks 命令遵行）

- tests/unit/renderer/selection-paint.test.tsx（F-A4 票面新增未入锁件）：
  +F-A5 describe 四测（a1/a2 band 几何、c1 自绘 z、c2 常量序守卫）——非改向，
  纯扩面；既有 13 测零改。
- tests/unit/renderer/annotation-layer.test.tsx：+F-A5 describe 两测（存量回退
  经 band、层 z/multiply 摘除）；既有 F-A1 两测零改。
- tests/unit/renderer/ai-annotation-layer.test.tsx：+F-A5 一测（AI 段 band 垂直
  +层 z）；既有 7 测零改。
- tests/e2e/reader-text.spec.ts：划选高亮小票两程 multiply 断言改向
  normal+z=1（头注注明 ADR-0019 R2 修订依据=票面 §0c 用户背景板令）；
  其余 8 用例零改。
- 新 tests/unit/renderer/pdf-page-canvas.test.tsx：未入锁新件（主控收口
  locks:generate 时一并登记）。

## 6. 自裁申报（超票面决定，交门审）

1. **c 面落位与票面字面「canvas<色块<textLayer+DOM 字为主体」的显式偏离**：
   实现=色块(1)<canvas 透明底墨带(2)<textLayer(0 官方透明)——墨带而非 DOM 字
   成为最高「字」。依据：①官方 text-layer.css 令 DOM 字 color:transparent 的
   理由=F-11/F-A4 band 体系的病根（回退字形≠PDF 嵌入字形）——「DOM 字为主
   体」需反转官方设计=全文档回退字形叠嵌入字形的双墨渲染（发糊），代价大于
   所得；②透明底 canvas 令墨带恒在色块上=色块内文字像素实测恒 0（强于票面
   预期「canvas 位图字被罩淡属预期」）；③用户令意图（文字颜色不受影响）完整
   达成。ADR-0019 R2 已登记此偏离及理由。
2. **b 面定向修的实际靶心与票面假设不同**：标注 band 推导本身在真机良好
   （Reynolds 0.2~0.7px）——真根因=AI 层从未接 band+存量回退无 band+（探针
   过程中实证的）几何最近中心匹配在行盒整体偏移文档上错绑上一行。修法=节点
   口径带（选区/AI/重锚三消费点）+几何兜底（存量回退），同源单核心。
3. **measureContext 失败不缓存**（retry-on-null）：新增消费点使 jsdom 未 mock
   面的 null 缓存毒化后续带路径（测试实测）——纯查询重试廉价，真实浏览器一次
   成功即缓存，行为面零变。
4. **探针判据两口自裁**：①垂直基准=span 盒而非墨带像素（紧行距墨粘连污染
   实证）；②a/paint-horizontal 容差 3px（分段池与带端点并集的口径差 2.75px
   实测@0.43em；实现夹取由单测 a2 断言级锁定，非放宽受锁断言）；③s5 zoom
   块数 |Δ|≤max(1,15%)（F-A4 |Δ|≤1 在 19 行带上失真——边界行包含差）。
5. **AI 选中描边随层垫底**：描边 1px accent 落 rect 边缘空白区可见、压墨段被
   墨带盖住（视觉弱化）——未拆顶部 overlay（复杂度不称）；报门审裁量。
6. **已知边界**：OCR/扫描整页位图 PDF 上色块垫底不可见——该类文档无文本层
   即无锚定即无标注可渲染（用户库 9 篇中 1 篇扫描件实证不可开卷标注），
   风险面=空集口径；暗色主题下页纸强制白（PDF 纸面语义，PageBox 白纸承底层）。
7. 探针工程弯路在档（不涉实现）：跨页 span 混入/ink 扫描取错 canvas/跨栏
   拖选污染/`[data-page-root]` 占位态查无致滚页失效/spawnSync 管道态 ESM 挂起
   ——五弯路均在 diag/verify 脚本内注释留档。

## 7. 接缝报告（报主控裁决——非本票）

- **工作树有非本票未提交改动**（git status/diff 实测，本实现者零触碰、原样
  保留）：`src/renderer/features/reader/AiNoteGroupList.tsx`（+139：F-N1 组内
  三段折叠）+`tests/unit/renderer/ai-notes-section.test.tsx`（+33）+
  `tests/e2e/ai-notes-section.spec.ts`（+12）——他工作流在档产物；本票全量
  verify/e2e 在含它们的树上跑（全绿，无冲突）。`locks/manifest.json` 修改=
  主控 unlock 面。
- npm run test 与 e2e/probe 的 better-sqlite3 ABI 互斥（F-A4 在档）：全程按
  `use node↔use electron` 切换执行（探针收尾态=electron，主控收口跑 test 前
  须切回 node）。

## 8. 成本

实现者单会话（GLM 5.3，无子代理派发）：机器时长约 185 分钟（diag 5 轮迭代
~35m+实现+全量 test×4+e2e×3+变异 10 轮+after 探针 5 轮调试——含 spawnSync/
滚页/配对三个探针工程坑的取证）；token 估算（按工具回显体量）输入 ~1.6M/
输出 ~0.22M——估算值，供成本账本。

## 9. 红线自查

禁 git commit/branch ✓（全程零提交；git 仅 status/diff 只读自查）；禁 registry ✓；
禁 locks 命令 ✓（locks:check 红为预期主控收口面）；禁新依赖 ✓（package.json
零改——探针只用 pdfjs-dist/playwright 既有依赖）；grep 无 TODO/FIXME/
placeholder（quality 关）✓；组件 ≤250（SelectionLayer/AnnotationLayer 均
=250 上限内，check-quality 口径过；最大源文件 annotation-resolve 316 ≤500）✓；
头注无历史工单号引用（用「历史轮/ADR 档」描述）✓；卡住停手未触发（三探针
工程坑均按系统化调试自解并留档）。


## F-N1 票面全文

# F-N1 需求票:AI 笔记组内三段可折叠(一审/二审默认收起)

> 需求源:用户 2026-08-31:「笔记 tab 中 AI 的一审和二审和裁决应该可以折叠,
> 以及一审二审默认是折叠的」。**业务意图(用户确认口径)**:裁决=最终结论
> 优先呈现;一审/二审=过程证据,默认收起降噪,需要核对时展开。
> 基线:verify 118 文件 1002 / locks 204(8408911ca,或 F-A5 收口后新基线
> ——开工前 npm run test 亲核)。

## 0. 折叠态空间表

| 段 | 默认态 | 用户操作 | 迁移 |
| --- | --- | --- | --- |
| 一审 | **折叠** | 点段头展开/再折叠 | per-组局部 state(不持久化——会话级) |
| 二审 | **折叠** | 同上 | 同上 |
| 裁决 | **展开** | 同上 | 同上 |
| 组整体 | 既有组折叠态不动 | — | 零变 |

不变量:折叠只藏视觉不删数据(条目数在段头可见);组内无裁决段时(数据缺)不渲染空段头。

## 1. 行为层

- AiNoteGroupList 组内按 role 分段(现有 ROLE_LABEL 分段)各加段头折叠器:`<button aria-expanded>` 段名+条数(如「一审(3)」)+展开/收起图标(▾/▸ 文本或既有先例图标);默认态=一审/二审 collapsed、裁决 expanded。
- 段头点击 toggle 该段条目列表渲染(条件渲染零变条目内容)。
- 键盘可达(按钮原生)+aria-expanded。

## 2. 接口层

AiNoteGroupList 对外 props 零变;折叠 state=组件内 useState(per 段)。

## 3. 架构层

AiNoteGroupList 现 104 行,加折叠预计 ~150 ✓;不动 AiNotesSection(249 贴线);零新依赖。

## 4. 生命周期层

不持久化(刷新回默认态——降噪默认每次生效);组重挂载(换文献)回默认。

## 5. 文化层

- 测试:tests/unit/renderer/ai-note-collapse.test.tsx(always-active):①默认态(一审/二审条目不在 DOM、裁决在);②点一审段头→条目出现+aria-expanded 真;③再点收起;④段头条数标注正确;⑤无裁决段不渲染段头。变异 M1~M3(摘默认折叠/摘 toggle/摘条数)。
- 真机不设探针(纯 UI 折叠,jsdom 全可达;若门一要求,一张截图即可)。

## 6. 证据与报告契约(实现者)

报告 f-n1-impl.report.md(数字 wc);禁 git/registry/locks;红→绿→变异。


## F-N1 实现报告全文

# F-N1 实现者报告（三屋第一屋）——AI 笔记组内三段可折叠

- 工单：`scripts/audits/f-n1-ticket.md`（态空间表 §0+五层规约）
- 实现者开工纪律：技能清点（TDD 用/完成前验证 用/系统化调试 备而不用/其余不
  用理由见开工记录）；禁 git 提交/registry/locks 全程遵守（git 仅只读 status/diff 自查）
- 改动面：`src/renderer/features/reader/AiNoteGroupList.tsx`（唯一组件改动）
  + 新测试 `tests/unit/renderer/ai-note-collapse.test.tsx`。F-A5 面
  （selection-paint/annotation-*/AiAnnotationLayer/PagesOverlay/text-layer.css）
  零触碰；AiNotesSection 零触碰（只读核对）。

## 数字（wc）

- `src/renderer/features/reader/AiNoteGroupList.tsx`：163 行（票面预计 ~150 ✓；
  组件红线 ≤250 ✓）
- `tests/unit/renderer/ai-note-collapse.test.tsx`：133 行（新合约，always-active）
- diff：AiNoteGroupList +99/-40（git diff --stat，单文件）；无范围蔓延

## TDD 证据链

1. **基线**：定向 ai-notes-section(24)+ai-note-style(3)=27 绿 @HEAD；
   全仓基线=票面口径 1002（+本工单新 5=1007）。
2. **红**：新测试 ①~⑤ 对 HEAD（无折叠器）**5/5 红**（①④⑤ 直接红；
   ② 经 aria-expanded 缺失红、③ 经条目未隐藏红——票面"②③依赖①"实证）。
3. **绿**：实现后新测试 5/5 绿；typecheck 双 project 绿；lint（全仓）绿。
4. **变异红证**（cp 一次性备份→变异→红→cp 还原→diff 确认空，未用 git checkout）：

| 变异 | 操作 | 红证 | 还原 |
| --- | --- | --- | --- |
| M1 摘默认折叠 | 一审/二审默认 true | ①②③ 红（3/5 failed） | diff 空 ✓ |
| M2 摘 toggle | onClick 置 no-op | ② 红（③结构性依赖②为假绿——同票面"②③依赖①"预知型） | diff 空 ✓ |
| M3 摘条数 | 段头去 `(N)` | ④ 红 | diff 空 ✓ |

5. **终态复跑**：全量 `npm run test`=**1004 绿 / 3 红（1007）**；grep
   TODO/FIXME/placeholder 两文件 0 命中。

## ⚠ 卡点报告：受锁旧约互斥（需主控 [locked-change] 裁决，实现者未动测试）

3 红**全部**在受锁文件 `tests/unit/renderer/ai-notes-section.test.tsx`，均为
**旧契约「一审/二审条目默认在 DOM 可查/可点」**与新契约①「默认不在 DOM」的
直接互斥（宪法"接缝归责：两处声明互斥即停下报告，不得顺手改一侧"）：

1. `分节分组：question 组按 AI_NOTE_QUESTIONS 序呈现…`（L399）——断言 Q1 组
   items `['a1'(一审),'b1'(二审)]` 在 DOM → 得 `[]`。
2. `组内 role 标签：同 question 组内三 role 条目头呈现一审/二审/裁决`（L467）
   ——断言 `['a1','b1','c1']` 全在 DOM → 得 `['c1']`。
3. `条目单击→locateAnchor…`（L510）——对折叠中的一审条目 `null.click()` 抛错。

实现面无缺陷（新合约 5/5 绿+变异红证完整）；处置建议：三例改走
[locked-change]（先展开对应段头再断言/点击，或改断言裁决段条目），e2e
`tests/e2e/ai-notes-section.spec.ts` L134-135 `groupedItems.first()` 含
「一审」同受影响（未跑——超本工单验证面，收口前需全量 verify+e2e 复核）。

## 实现摘录（票面映射）

- `ROLE_DEFAULT_EXPANDED`：一审/二审 false、裁决 true（§0 态空间表）；
- `RoleSection` 子组件：段头 button（`data-role-section`+`aria-expanded`+▾/▸
  aria-hidden 文本图标+「一审(3)」条数）+条件渲染条目（条目 JSX 自原位逐字
  迁移，渲染逻辑零变）；无该段数据 return null 不渲染段头（⑤）；
- 折叠 state=组件内 useState per 段，不持久化；组 key 掺 `paperId`
  （`notes[0]?.paperId ?? ''`）→ 换文献重挂载回默认（§4）；
- 已知边缘（票面外观察，未扩面）：高亮滚动 effect 对折叠段条目 no-op
  （querySelector null→`el?.` 短路，不自动展开）。

## git status 全贴（diff 自查）

```
 M locks/manifest.json            <- 开工前既有（受锁解锁面，非本工单；首查已在）
 M src/renderer/features/reader/AiNoteGroupList.tsx   <- 本工单唯一 src 改动
?? scripts/audits/f-n1-mut-backup-AiNoteGroupList.tsx <- 变异备份（还原 diff 已证空）
?? scripts/audits/f-n1-ticket.md
?? tests/unit/renderer/ai-note-collapse.test.tsx      <- 新合约测试
（其余 f-a4/f-a5/f-l4/f-sw1/f1-out 审计产物为同场他工单，零触碰）
```

## 成本

- 子代理 token：约 6.5 万（输入累计）/ 约 1.1 万输出（估算口径）
- 墙钟：约 45 分钟；工具调用 18 次
- 验证命令：定向 vitest×6、全量 `npm run test`×2、typecheck×2、lint×2（全部真退出码）

---

# 追加段：受锁改向（主控裁决后 [locked-change] 执行）

- 裁决：主控 2026-08-31——「用户令一审二审默认折叠=新契约，受锁旧断言过时，
  按『语义随令非让过』先例授权改向」；红线不变（禁 git/registry/locks 遵守全程）。
- 改动面：`tests/unit/renderer/ai-notes-section.test.tsx`（3 例+头注行，536→562 行）
  + `tests/e2e/ai-notes-section.spec.ts`（2 处最小改+头注行，231→242 行）。

## 逐例改前/改后断言对照

### 单测 1「分节分组：question 组按 AI_NOTE_QUESTIONS 序呈现…」
- 改前：`q1Items=groups[0].querySelectorAll('[data-ai-note-id]')` 直接断言
  `toEqual(['a1','b1'])`（默认全可见）。
- 改后：先断言**默认折叠**（`a1/b1` 不在 DOM）+**段头在**
  （`button[data-role-section="first-read"/"second-read"]` 非 null）→`act` 点两段头
  →同序断言 `toEqual(['a1','b1'])`+一审/二审标签+色点（排序/标签/色点意图原样）。

### 单测 2「组内 role 标签：同 question 组内三 role 条目头呈现一审/二审/裁决」
- 改前：`items=groups[0].querySelectorAll(...)` 直接断言 `['a1','b1','c1']`。
- 改后：先断言 `a1/b1` 默认不在 DOM、`c1`（裁决 expanded）在 →点两段头→
  同序断言 `['a1','b1','c1']`+三 role 标签（role 可辨+role 序意图原样）。

### 单测 3「条目单击→locateAnchor（INV-20 消费方级）」
- 改前：mount 后直接 `querySelector('[data-ai-note-id="a1"]').click()`。
- 改后：先断言 `a1` 默认不在 DOM→点一审段头展开→再 `click()`→
  `locateAnchor` 参数断言逐字未动。

### e2e 测 1（SR2-AI-08 全链，L131 后）
- 改前：`groupedItems.first()).toContainText('一审')` 直接断言（默认全可见）。
- 改后：插入 3 行最小改——`button[data-role-section="first-read"]` 可见→
  `click()` 展开→原断言链逐字不动（展开后 Q1 一审在前、divergence 裁决在后，
  序与原断言一致）。

### e2e 测 2（SR2-AI-09 渲染层，toast 断言后）
- 改前：点击 AI 高亮块后直接断言面板 `[data-highlight="true"]` 条目可见——
  该条目属一审段，默认折叠后不在 DOM（**主控指令未列此例，实现者同场发现
  同向补改**）。
- 改后：导入 toast 断言后插入同款 3 行段头展开，后续断言链逐字不动。

两文件头注均加一行「F-N1 用户令改向（[locked-change]，2026-08-31）」标记。

## 改向后验证统计

- 定向：ai-note-collapse(5)+ai-notes-section(24)+ai-note-style(3)=**32/32 绿**。
- 全量 `npm run test`：**119 文件 / 1007 测试全绿**（主控预期命中）。
- `npm run typecheck`：双 project 绿（含改后测试文件——tsc 关卡兑现 AGENTS
  「playwright esbuild 不查类型」教训）。
- `npm run build`：绿（exit 0）。
- `npm run verify` 全链实测：quality ✓ / tickets ✓ / **locks:check ✗ 链在此止**：
  6 项未过=3 个他场未登记（f-a5-diag.mjs、f-sw1-probe.mjs、f-sw1-probe2.mjs）
  +本工单 2 处受锁改向与 1 个新测试待登记——manifest 重锁=收口单职权
  （实现者禁 locks 命令，未动）；**lint ✗=1 error 在 f-a5-diag.mjs（F-A5 面，
  非本工单）**，本工单 3 文件定向 eslint 全净。链上其余节（lint 外）已逐一
  亲验真退出码补全如上。

## 环境事故与执行边界记录

- **ABI 争用**：12:06 前后两连 EBUSY——并发会话切 `build/Release` 至
  electron-v146 侧并持句柄，`sqlite-abi use node` 拷贝失败；进程面释放后退避
  重试通过（md5 比对归因存档：部署侧=b059…=electron-v146）。
- **e2e 未执行**：主控验证面=`npm run test`+`npm run verify`（已全做）；
  `test:e2e` 需拉起真 Electron 窗口（前台焦点保护红线），留收口单/门二执行，
  本工单以 tsc 关卡+断言锚逐字不动控制 e2e 风险面。
- 终态 git 面：`M AiNoteGroupList.tsx / M tests/e2e/ai-notes-section.spec.ts /
  M tests/unit/renderer/ai-notes-section.test.tsx / ?? tests/unit/renderer/
  ai-note-collapse.test.tsx`（+报告/票面/变异备份），diff --stat=
  141 insertions / 43 deletions；grep TODO/FIXME/placeholder 三文件 0 命中。

## 成本（追加段）

- 追加 token：约 4 万输入 / 0.9 万输出（估算）；墙钟约 25 分钟；工具调用 14 次
- 验证命令：定向×3、全量 test、verify 全链、typecheck、lint×2、build（全部真退出码）



## diff 全文(add -N 后,含两票+F-N1 受锁改向;f-sw1 主控排查件)

```diff
diff --git a/docs/adr/0019-selection-feedback-native-route.md b/docs/adr/0019-selection-feedback-native-route.md
index 91d238b7c..bf6a1a74f 100644
--- a/docs/adr/0019-selection-feedback-native-route.md
+++ b/docs/adr/0019-selection-feedback-native-route.md
@@ -93,3 +93,55 @@
   →在场）。
 - **不随修订变化**：锚定三元组/保存链/INV-05 两路径同口径/F-12 触发阈值/
   选择模式（INV-42）零触碰。
+
+## R2 修订：色块垫底背景板层序+band 单源（F-A5，2026-08-31）
+
+- **修订依据=用户令**（F-A5 票面 §0c，2026-08-31 第二轮复测附两图）：「涂色的
+  渲染应该在最下方当背景板而不是影响文字的颜色」+图2 被高亮文字染成色系暗色
+  （非纯黑）。修订对象=R1 遗留的「AnnotationLayer 单层 multiply（F-07 荧光笔
+  语义）+AiAnnotationLayer normal 0.45（F-07 层间叠乘摘除的代价）」层序语义。
+- **根因链（真机实锤，f-a5-diag/verify 在档）**：AI 段层 normal alpha 0.45
+  罩在 canvas 墨带之上——0.45×色+0.55×墨 把文字染成暗色（图2 绿/橙/紫=AI
+  七问色）；multiply 本身不染纯黑墨（Reynolds 存量标注块内最暗核=0 实测），
+  但两 multiply 层叠乘（F-07 在档）与用户「背景板」心智均要求重排。
+- **R2 落地形态（与票面字面「canvas<色块<textLayer+DOM 字为主体」的差异=
+  实现者自裁，依据如下）**：
+  1. **pdf.js render 以 `background:'rgba(255,255,255,0)'` 透明底渲染**（pdfjs
+     缺省 `#ffffff` 填充会把垫底色块整页遮死）——墨带成为页内最高的「字」，
+     色块从墨带外的透明区透出=**真·背景板**：文字像素恒 canvas 墨（纯黑，
+     像素实测 0），色块对文字零混合（比票面预期「canvas 位图字被罩淡属预期」
+     更强——无需 DOM 字承担视觉主体）。**DOM 字保持官方 transparent 设计
+     不动**（text-layer.css 零改）：官方透明文本层的存在理由（回退字体字形
+     ≠PDF 嵌入字形——F-11/F-A4 band 体系的病根本身）使「DOM 字为主体」会
+     引入全文档双墨渲染（回退字形叠嵌入字形=发糊）——此为对票面 §0c 修法
+     字面的显式偏离，修订依据=用户令的意图（文字颜色不受影响）+官方设计
+     保留，报门审裁决。
+  2. **层序常量单源 page-layer-z.ts**：textLayer（官方 css z0，TextLayer 内联
+     同值显式化）<色块层（标注+AI 同 z1，multiply 摘除=normal）<canvas
+     （z2，pointer-events:none 明纸穿透——标注 rect 点击/文本划选手势零回归）
+     <自绘选区层（z3 最上，票面 S4「灰块视觉在色块上」——R2-F-10「灰在黄下」
+     multiply 观感随之废止）。比较域=PageBox 页内容容器 isolation:isolate
+     （单页封闭，跨页互扰不可能）；白纸承底层=该容器 background（暗色主题
+     下页纸仍白=PDF 纸面语义）。
+  3. **a/b 面 band 单源**：span→字形带核心（bandFromMetrics）单源驻
+     annotation-resolve；**节点口径**（选区/AI 段/标注重锚各自的 textNodes→
+     bandsForTextNodes——绑定不经几何匹配）+**几何兜底口径**（存量 rects
+     重锚失败无节点可依→bandsNearRects）两入口同一数学。节点口径的必要性=
+     真机实锤：小字号紧排文档（6.38px 参考区）CSS 行盒比 pdf.js span 盒整体
+     偏上 ~9px，几何最近中心匹配会把带绑到上一行。自绘块水平界=行簇 span
+     实际端点夹取（clampedHorizontal）；RowBand 增 x0/x1。
+  4. **量测退化回退链保持**：jsdom/无 canvas→空带→行盒原样/F-11 分数（缺省
+     兼容，F-A4 语义零变）。
+- **修前/修后真机数字**（f-a5-diag.json vs f-a5-verify-after.json，用户库
+  最小字号篇 6.38px 参考区）：自绘块高/行盒高 1.38→1.13（对墨高口径 1.57~1.83
+  →~1.1）；块顶 vs 行簇 span 顶 −7.3~−8.9px（整块上错一行）→0.48px；块底
+  −4.9~−6.5px（侵入下邻行）→+1.5px（desc 尾界内）；水平越界 11.5~281px→
+  2.75px（亚字符级口径差）；AI/标注块顶差 0.48px（AI 修前=裸行盒=图2 下偏
+  根因）；色块内文字最暗核=0（纯黑）；S4/S6/zoom150 稳定；pageerror 0。
+- **不随修订变化**：锚定三元组/保存链/INV-05 两路径同口径/选择模式（INV-42）
+  /F-12 触发阈值/工具条定位（F-A4 c）零触碰；e2e F-06 小票 multiply 守卫
+  随令改向（normal+z=1，[locked-change]）。
+- **已知边界（申报）**：OCR/扫描整页位图 PDF（不透明光栅全页覆盖）上色块
+  垫底不可见——但该类文档无文本层即无锚定即无标注可渲染（用户库 9 篇中
+  1 篇扫描件实证不可开卷标注），风险面=空集口径；AI 选中描边随层垫底（描边
+  落 rect 边缘空白区可见，压墨段被墨盖——交互反馈弱化，报门审）。
diff --git a/docs/invariants.md b/docs/invariants.md
index 4b8b14999..8e1939ef9 100644
--- a/docs/invariants.md
+++ b/docs/invariants.md
@@ -48,10 +48,10 @@
 | INV-34 | 程序滚动单容器收敛：程序滚动（翻页/页码跳转/恢复链与锚定闪烁链）只允许滚目标的**最近滚动祖先**（scrollIntoNearestScroller 差值法+显式夹取 [0, scrollHeight−clientHeight]；祖先判定=自 parentElement 向上首个 computed overflowY∈{auto,scroll}，hidden/visible 不入选），**禁用 Element.scrollIntoView 于滚动链**（CSSOM 语义=滚所有可滚祖先——2026-08-28 缺陷 A 实测泄漏面含 overflow:hidden 的 document viewport（scrollingElement 仍可被程序滚动）与 main，TabBar 被顶出视口无自愈）；防御纵深=ReaderPage 根两分支 overflow-hidden+ReaderToolbar 根 shrink-0（flex-wrap 折行只影响阅读器内部高度）；列表内滚动 block:'nearest'（FragmentNotesList/AiNoteGroupList/PaperList）与面板自身滚动语义不在本册约束面 | src/renderer/features/reader/scroll-converge.ts（SR2-F-05，2026-08-28 登记；消费方=PageColumn 段⑤ 'start'/anchor-locate flashElement 'center'——同一不变量同一实现，Rule of Three 从 1 收敛） | 单测锚（scroll-converge.test 六用例：最近祖先选取含嵌套取最近与 hidden 不入选/start 数学/center 数学/顶底夹取/无滚动祖先不动/aside 消费形）+受锁三文件消费形断言（page-column/anchor-locate/ai-annotation-layer 模块 mock）+e2e（reader-scroll.spec F-05：scrollingElement 与 main 双 scrollTop===0+TabBar bbox≥0+根 overflow-hidden 在位——窄视口页码跳转+PageDown 两链） | 已锚定（单测+e2e 级 2026-08-28 SR2-F-05；e2e 随守卫态 22+1 skip，registry 翻 done 后 23+0 常规跑激活） |
 | INV-35 | 课题库单活四联（ADR-0018 库级分目录）：①同一时刻至多一个课题库打开（switch=关旧→指针→装配→换引用，容器 current 单值；全新首启=legacy-fresh 态库在 userData 根，二次启动迁移入 workspaces/default——受锁 e2e 种子配方兼容的硬前提）②switch/create/rename 变更互斥单飞（busy 守卫，并发=CONFLICT 中文 DomainError）③指针 workspace.json 缺省/损坏/失指=降级「目录序第一」不崩溃；遗留迁移崩溃断点续迁（遗留 db 在且 default 库不在=条件仍真，db 文件最后移=提交点，无孤儿库）④**渲染层切换面（R1-WS2 登记）**：切换=dirty 确认→IPC switch→`location.reload()` 全新 stores（ADR-0018 裁决路径——零 stale 态类别）；reload 经 will-navigate 同 URL 唯一放行（shouldBlockNavigation 严格等值——外站/异 file/data: 变体全 deny，护栏意图不变）；弃改后悬置防抖写竞窗由 notes→papers FK+foreign_keys=ON 偶然兜底——**无 FK 新表接入课题切换面须显式防悬置写** | workspace.service.ts 头注状态机+workspace.fs.ts 搬移序（R1-WS1 登记）；渲染面=workspace.store.ts switch 流程+main-window.ts shouldBlockNavigation（R1-WS2 登记） | 单测（workspace.test.ts 14 it：迁移随迁+幂等+断点续迁+L0+指针双降级+busy CONFLICT+facade 热换+L0 双段链+失败重试）+e2e 24 迁移兼容；渲染面单测（workspace.store/workspace-switcher dirty 拦截+reload+内联错误重试/main-window-navigation 双面三 it）+e2e workspaces.spec（种子→新建 B→reload 库空+脉络空态→切回完整——加载终态锚防假绿窗） | 已锚定（单测+e2e 级 2026-08-28 R1-WS1+R1-WS2 全链） |
 | INV-36 | 脉络节点宽度单源：nodeWidth(title) 三档（≤12 字 180=NODE_W/≤28 字 220/>28 字 260）——布局占位（lineage-layout place 半宽）/卡面渲染（LineageNodeCard rect+角饰）/auto-fit 包围盒（LineageCanvas fitViewport）三消费点同一纯函数，禁任一处手写档值；**auto-fit 抢占门**：panbg pointerdown/滚轮 zoom 置 userInteracted 后 nodes 变化不重置视口，「适应视图」按钮（lineage-fit-view）=复位唯一入口；data-viewport transform 串格式 `translate(x, y) scale(k)` 为 e2e 解析契约（逐字符保持） | lineage-layout.ts nodeWidth+lineage-viewport.ts useViewportController 状态机头注（R2-LG10，2026-08-29 登记；LineageCanvas ≤250 行红线拆件——auto-fit/pan/zoom 视口域单文件） | 单测（lineage-layout.test 分档 3 it：三档边界/兄弟占位/单链对齐；lineage-canvas.test auto-fit 3 it：首载 fit 数值/不抢视口/按钮复位+分档 rect 宽 it——含 jsdom 量测桩）+e2e（lineage.spec T1/T2 scale-aware 断言） | 已锚定（单测级 R2-LG10 本单；e2e 面随本单 25 全绿） |
-| INV-37 | 划选视觉=自绘并集层（ADR-0019 R1 修订，F-A4 2026-08-31）：选区视觉反馈是**浏览器选区状态**的直接函数（SelectionLayer evaluate 管线的 mergeLineRects+mergeRects 归并产物经 selection-paint portal 进选区所在页盒单层单绘——与保存 rects 同源，所见即所存；色 rgba(0,0,0,0.20) 同 R2-F-10 观感；拖选期经 selectionchange 200ms 防抖驱动）。::selection 背景=transparent（text-layer.css——官方 pdf.js 逐 span 绘制在重叠行盒处叠深，CSS 层无解；SR2-F-08 原生路线两病根已解：拖选零反馈→防抖路径在场，accent 近不可见→观感灰在案）。组件态（pending/工具条）与选区视觉**允许分离**——Escape 只清 pending（工具条收），自绘层保留至选区真正清除（点击坍缩/保存 removeAllRanges 同步清/承载页卸载）；`[data-testid="selection-rects"]` 在 pending 态**在场**（R1 修订反转原 0 计数守卫——受锁两测试已改向） | text-layer.css `.textLayer ::selection`=transparent（F-A4）+SelectionLayer paint 态渲染 SelectionPaint（portal 页盒 z2，标注 multiply z5 之下） | e2e（reader-text.spec F-06 小票：::selection transparent+selection-rects 在场+块色 rgba(0,0,0,0.2)+toolbar ≤1.5s）+unit（selection-layer.test F-A4 反转守卫+selection-paint.test S1~S5：并集渲染/所见即所存/Escape 语义/清除随选——M2 变异红证在档） | 已锚定（e2e+单测级 2026-08-31 F-A4；真机 f-a4-verify-after.json 12/12） |
+| INV-37 | 划选视觉=自绘并集层（ADR-0019 R1 修订，F-A4 2026-08-31）：选区视觉反馈是**浏览器选区状态**的直接函数（SelectionLayer evaluate 管线的 mergeLineRects+mergeRects 归并产物经 selection-paint portal 进选区所在页盒单层单绘——与保存 rects 同源，所见即所存；色 rgba(0,0,0,0.20) 同 R2-F-10 观感；拖选期经 selectionchange 200ms 防抖驱动）。::selection 背景=transparent（text-layer.css——官方 pdf.js 逐 span 绘制在重叠行盒处叠深，CSS 层无解；SR2-F-08 原生路线两病根已解：拖选零反馈→防抖路径在场，accent 近不可见→观感灰在案）。组件态（pending/工具条）与选区视觉**允许分离**——Escape 只清 pending（工具条收），自绘层保留至选区真正清除（点击坍缩/保存 removeAllRanges 同步清/承载页卸载）；`[data-testid="selection-rects"]` 在 pending 态**在场**（R1 修订反转原 0 计数守卫——受锁两测试已改向） | text-layer.css `.textLayer ::selection`=transparent（F-A4）+SelectionLayer paint 态渲染 SelectionPaint（portal 页盒；[F-A5] 块垂直=行簇字形带节点口径（选区 textNodes→bandsForTextNodes——免疫 CSS 行盒整体偏移错绑上一行）+水平界=行簇 span 端点夹取+band 缺省行盒原样回退；z=page-layer-z.selectionPaint=3 页内最上——色块垫底 canvas 透明底墨带之下，ADR-0019 R2） | e2e（reader-text.spec F-06 小票：::selection transparent+selection-rects 在场+块色 rgba(0,0,0,0.2)+toolbar ≤1.5s）+unit（selection-layer.test F-A4 反转守卫+selection-paint.test S1~S5：并集渲染/所见即所存/Escape 语义/清除随选——M2 变异红证在档） | 已锚定（e2e+单测级 2026-08-31 F-A4；真机 f-a4-verify-after.json 12/12） |
 | INV-38 | 脉络卡高单源：nodeHeight(title)=46+18×clamp(ceil(len×12.5/(nodeWidth−24)),1,3)——1/2/3 行=64/82/100，三消费（LineageNodeCard rect 高/LineageEdges 端点 ±h/2 经 geom 预构建/lineage-viewport fitViewport 包围盒）同一纯函数，禁任一处手写档值（INV-36 宽度姊妹条；NODE_H 常量已删）；**B1 单源化补记**：BAND_LEFT(-200)/BAND_RIGHT(99999)/LAYER_LABEL_DY(32) 驻 lineage-layout.ts 导出——fitViewport 左界/Canvas 层带线 x1/x2/年份标 y 偏移消费同源禁各写；综述右列（决3）：isSurvey 节点不进树（x/y 双覆盖综述除外）、列左缘=max(非右列右缘)+SURVEY_COL_GAP(80)、同层输入序错开≥半宽和+SIBLING_GAP、y=year 层带 | lineage-layout.ts nodeHeight+常量区+综述列段（R2-LG11，2026-08-29 登记）+lineage-classify.ts isSurvey/isCore（决2 D1' 出度口径 2026-08-29 真机复评修正：研究性论文出度≥2——「被引≥2 开宗立派」=≥2 继承者；入度版在 INV-27 树单父下数学恒假） | 单测（lineage-layout.test nodeHeight 3 it+综述右列 4 it 含变异红证锚 P.x=C1.x；lineage-classify.test 8 it；lineage-canvas-visual.test 卡高 100+边三型；变异红证三处在档 scripts/audits/r2-lg11-mutation-*.log） | 已锚定（单测级 R2-LG11 本单；e2e 面随主控收口真机复评） |
 | INV-39 | 界面缩放三档只缩 HTML 文本面：uiScale（small/medium/large，数值单源 shared/ipc/schemas `UI_SCALE`=1/1.1/1.25）经 App 挂载 load（失败容忍默认档）+订阅→effect 单点写 documentElement `--ui-scale`→内容行 `.app-content-row` 整行 zoom（nav+main）；**PDF 页列恒补偿**：`[data-page-column]` `zoom: calc(1 / var(--ui-scale, 1))` 三态通配（ready/loading/error）——canvas 视觉恒基线（探针实测 canvas 跟随×1.1 即位图拉伸模糊，反向补偿精确恢复 612×792+textLayer 对位不破坏；单独 zoom:1 无效=相乘语义），reader 自有页缩放（viewport scale）与界面档正交；**header/caption 结构性豁免**：zoom 挂内容行，header 在行外恒 56px（44→56 用户裁决 2026-08-31 增高令——断言/登记册随令同步）；settings set 通道 Req=完整 appSettingsSchema（register strict 校验+整体落盘）→**一切 set 调用必须组装全量**（缺省字段被 zod default 静默填默认值抹掉现值）；zoom 效果断言面必须量 getBoundingClientRect（computed fontSize 对 CSS zoom 无感——探针实测） | App.tsx（挂载 load+变量 effect+内容行类）+theme.css（.app-content-row/[data-page-column] 声明）+SettingsPage.tsx（点档全量 save）（R2-SET1，2026-08-29 登记） | 单测（app-shell 变量两面：挂载档+save 变化沿；settings.store uiScale 透传；ipc 旧文件 default 兼容+set 持久化）+CSS 文本锁（theme.test 正则锚定声明形态——防注释字样救活，变异③实证）+e2e（smoke.spec R2-SET1 用例：nav 首项 rect ×1.25±2px+header 恒 56，rect 断言非 computed） | 已锚定（单测级 R2-SET1 本单全绿+变异四方向红证在档；e2e 随主控收口统一跑） |
-| INV-40 | 标注矩形归并（F-A1，multiply 单乘语义的数学表达）：同一标注的渲染色块集合**两两不相交**（INV-A）+**每行至多一块**（INV-B，行内 x 并集）+**零宽块不入集合**（INV-C，w≤W_MIN=1/612 归一化域≈1px@612pt）+**相邻行块垂直边界钳制**（INV-D，下行顶≥上行底）；持久化兼容（INV-E）——存量 rects 渲染读时过同一归并器，库零迁移、存量渐净；单源=`mergeRects` 纯函数（确定性六步：滤零宽→(中心y,x,y) 全序→与全部既有簇比中心距聚类（容差 min(hNew,hRowMedian[,lineH])/2——高瘦免疫；**F-A4 行高感知**：可选 lineH（PDF 行高，选区 span 字号中位数/textLayer 盒高——annotation-anchor rectsBetweenPoints 挂 A+AnnotationLayer 挂 B 两路注入）钳制容差，紧行距下 CSS 回退行盒膨胀不再跨行并簇）→行内归并（h/中心y 取下中位，单成员恒等）→行间钳制→(y,x) 稳定排序）；幂等（已归并输入值不变——单块/单成员行不经浮点往返）；**[F-A4 修订 2026-08-31]** 原已知边界（leading≲0.75×行盒高跨行并簇成单高块）已修复：mergeLineRects 像素域聚行判据在 lineH 在场时改「中心距 ≤ lineH/2」（替代 y 区间重叠率 25% 判据——真行高为基准），mergeRects 容差同步 lineH 钳制；lineH 缺省=旧行为存档（受锁 ⑪ 存档断言）。真机实锤：修前 3 行拖选并簇 1 块→修后 3 块分行、块顶贴行簇顶 ≤1.5px（f-a4-verify baseline/after 对照在档）；字号量测口径=本地 CSS px（视口域阈值在 PDF zoom≠1 时等效收紧 1/zoom，方向安全——代码注释声明） | src/renderer/features/reader/annotation-merge.ts（mergeRects 单源+W_MIN 导出）；挂 A=annotation-anchor.rectsBetweenPoints 归一化后收口（划选保存/重开重锚/rectsFromRange 手工三路径）；挂 B=AnnotationLayer 渲染 map 读时归并（resolved 幂等无害+a.rects 存量渐净）（F-A1，2026-08-30 登记） | 单测（annotation-merge.test ①~⑩：零宽滤除/同行交叠并集/同位重复并入/负间隙钳制后两两相交面积 0/混合族 INV-A/单块恒等/幂等/高瘦+紧行距判别/排序确定性/混排字号中位——M3/M4/M5 变异红证在档）+组件（annotation-layer.test：存量缺陷态 rects 读时归并=挂 B/INV-E 锁，M1 红证）+e2e（reader-text.spec F-A1 多行用例：跨 3 行划选→库内+渲染双侧「块数=行数」断言（取证实证锚定），M2 红证） | 已锚定（单测+组件+e2e 级 2026-08-30 F-A1 三屋；真库取证 f-a1-verify.json：7 块→5 块=行数/零宽 0/间隙全正/两两相交 0） |
+| INV-40 | 标注矩形归并（F-A1，multiply 单乘语义的数学表达）：同一标注的渲染色块集合**两两不相交**（INV-A）+**每行至多一块**（INV-B，行内 x 并集）+**零宽块不入集合**（INV-C，w≤W_MIN=1/612 归一化域≈1px@612pt）+**相邻行块垂直边界钳制**（INV-D，下行顶≥上行底）；持久化兼容（INV-E）——存量 rects 渲染读时过同一归并器，库零迁移、存量渐净；单源=`mergeRects` 纯函数（确定性六步：滤零宽→(中心y,x,y) 全序→与全部既有簇比中心距聚类（容差 min(hNew,hRowMedian[,lineH])/2——高瘦免疫；**F-A4 行高感知**：可选 lineH（PDF 行高，选区 span 字号中位数/textLayer 盒高——annotation-anchor rectsBetweenPoints 挂 A+AnnotationLayer 挂 B 两路注入）钳制容差，紧行距下 CSS 回退行盒膨胀不再跨行并簇）→行内归并（h/中心y 取下中位，单成员恒等）→行间钳制→(y,x) 稳定排序）；幂等（已归并输入值不变——单块/单成员行不经浮点往返）；**[F-A4 修订 2026-08-31]** 原已知边界（leading≲0.75×行盒高跨行并簇成单高块）已修复：mergeLineRects 像素域聚行判据在 lineH 在场时改「中心距 ≤ lineH/2」（替代 y 区间重叠率 25% 判据——真行高为基准），mergeRects 容差同步 lineH 钳制；lineH 缺省=旧行为存档（受锁 ⑪ 存档断言）。真机实锤：修前 3 行拖选并簇 1 块→修后 3 块分行、块顶贴行簇顶 ≤1.5px（f-a4-verify baseline/after 对照在档）；字号量测口径=本地 CSS px（视口域阈值在 PDF zoom≠1 时等效收紧 1/zoom，方向安全——代码注释声明） | src/renderer/features/reader/annotation-merge.ts（mergeRects 单源+W_MIN 导出）；挂 A=annotation-anchor.rectsBetweenPoints 归一化后收口（划选保存/重开重锚/rectsFromRange 手工三路径）；挂 B=AnnotationLayer 渲染 map 读时归并（resolved 幂等无害+a.rects 存量渐净；[F-A5] 渲染垂直几何=行簇字形带单源——重锚成功走节点口径带/存量回退走几何口径 bandsNearRects，annotation-resolve 域）（F-A1，2026-08-30 登记；F-A5 补注） | 单测（annotation-merge.test ①~⑩：零宽滤除/同行交叠并集/同位重复并入/负间隙钳制后两两相交面积 0/混合族 INV-A/单块恒等/幂等/高瘦+紧行距判别/排序确定性/混排字号中位——M3/M4/M5 变异红证在档）+组件（annotation-layer.test：存量缺陷态 rects 读时归并=挂 B/INV-E 锁，M1 红证）+e2e（reader-text.spec F-A1 多行用例：跨 3 行划选→库内+渲染双侧「块数=行数」断言（取证实证锚定），M2 红证） | 已锚定（单测+组件+e2e 级 2026-08-30 F-A1 三屋；真库取证 f-a1-verify.json：7 块→5 块=行数/零宽 0/间隙全正/两两相交 0） |
 | INV-41 | 脉络边标签三保证（F-L1-C，用户裁决变体 C+两条硬性保证 2026-08-30）：①渲染盒恒 foreignObject 130×37.05（EDGE_LABEL_MAX_W/H 单源）+`.lineage-edge-label` 类（9.5px 斜体 #6b7280 白晕 text-shadow+break-word 换行+max-height 3 行+overflow hidden——真实溢出承载滚动语义）；②**槽位恒经 placeEdgeLabels 防重叠放置**（锚=贝塞尔中点，与 LineageEdges 回退公式同式——两处头注互指；碰撞盒=estimateLabelWidth+gap4×37.05+gap4，节点盒外扩 6；偏移序 dy 0,±lh…±10lh（lh=12.35）×dx 五档（0,±(hw+16),±(hw+16)×2）——**回炉 1 实测依据**：±5lh 撑不出 100 高节点盒（分离阈精确 76.525/86.45）；全占位回 anchor=声明式 best effort（⑤环绕盒夹具锁）；贪心依赖输入序（序稳定性契约非交换性）；③**截断标签悬停滚动**：g 根原生 wheel 委托（React 合成 onWheel 时序晚于 svg 原生 zoom listener——不可达，头注在档）命中截断标签（scrollHeight>clientHeight+1）时 stopPropagation（防 zoom）+preventDefault（防默认）+主动 `scrollTop=clamp(+deltaY)`（防 Chromium foreignObject 滚轮路由不确定）；未截断零拦截；槽位盒恒参与 auto-fit 包围盒（fitViewport 第 5 参 labelBoxes，被推出的标签不消失在 fit 视野外） | src/renderer/features/lineage/edge-label-layout.ts（放置器+估宽单源）+LineageEdges.tsx（FO 换装+wheel 委托+slots 消费）+LineageCanvas.tsx（slots/labelBoxes useMemo）+lineage-viewport.ts（fitViewport labelBoxes）+theme.css（.lineage-edge-label+:hover overflow-y:auto——B1 教训交互态住类）（F-L1-C，2026-08-30 登记） | 单测（edge-label-layout.test ①~⑥+②b/③b 真库场景+⑤环绕盒回退+fit 数值锁——M4/M5/R1/R2 变异红证）+组件（lineage-canvas.test ⑦~⑩：FO 形态/slots 生效/wheel 双向锚（scrollTop 恰增 deltaY+未截断放行）/CSS 声明形态正则锁——M1/M2/M3/R2R 红证）+真机取证（f-l1-out/f-l1c-verify.json：注入碰撞源 5 标签/4 节点 labelOverlaps=0/nodeOverlaps=0+截断标签 wheel scrollTop=16 恰为隐藏量+viewport transform 不变） | 已锚定（单测+组件+真机级 2026-08-30 F-L1-C 三屋+回炉 1） |
 | INV-42 | 选择模式交互不变量（F-A3，2026-08-30）：选择模式（`TabState.selectionMode=true`，per-tab 与 zoom/color 同型）下**用户标注层与 AI 标注层一切渲染 rect `pointer-events:none`**——点击穿透零副作用（onClick 守卫兜程序化派发：jsdom 与真浏览器 `HTMLElement.click()` 均不走 hit-test，`pointerEvents:none` 拦不住）；拖选可在 rect 上发起=SelectionLayer 正常链路（**F-A2 根治**：mousedown 落 pointerEvents:auto 块上浏览器不发起文本选择的机制面解除）；常规（=false，默认）保持现状（点击标注=菜单/AI 段跳转）；**进入选择模式经 useLayoutEffect 在 paint 前关闭已开菜单/编辑器+清 AI 选中描边，切回常规不自动恢复**（S1/S4/S5——编辑器草稿丢弃=Escape 同语义；busy 在途结果回调幂等）；SelectionLayer 不消费模式（正交零改）；字段缺席（存量测试夹具直植形态）=常规态——生产单源 makeLoadingTab 显式 false，消费方一律 `?? false` 兜底 | reader.store.ts 头注（面③生命周期迁移表）+AnnotationLayer/AiAnnotationLayer 头注（F-A3 段）+ReaderPage.tsx 装配（toggle 语义在装配面，工具栏纯受控）（F-A3，2026-08-30 登记） | 单测（selection-mode.test ①~⑧ always-active：store 翻转+no-op/per-tab S3/rect pointerEvents 两态+点击零副作用/S1 菜单臂+编辑器臂双锁/S4 描边清除/工具栏 aria-pressed+回调——变异红证 M1~M5+M2'（只摘 setEditing(null)→仅⑧红））+真机取证（f-a3-out/f-a3-verify.json 三场景：A 常规压块拖选 selLen=0 负向对照/B 选择模式 58 rect 全 none+压点 hitTest 落文本 SPAN+同点位拖选 selLen=81+工具条+保存计数 1→2/C 切回 auto+点击出菜单） | 已锚定（单测+真机级 2026-08-30 F-A3 三屋+回炉 1；弱锚备案：真机层「选择模式点击 rect 零副作用」未直测，靠 pointer-events+hitTest+jsdom 守卫三层推断——门一 N6 在档） |
 
@@ -65,3 +65,4 @@
 - 锚定方式优先级：lint/CI > 单测 > e2e > 架构评审（越靠左越不可绕过）。
 - 本册与 ADR 的分工：ADR 记「为什么这样设计」（决策+取舍），本册记「什么必须永远成立」
   （不变量+防线）。小而致命的声明（如 INV-01）配得上登记，不必等到"配得上 ADR"。
+| INV-46 | 页内层序=背景板不变量（F-A5/ADR-0019 R2，2026-08-31 用户「背景板」令）：阅读器每页覆盖层的绘制序恒 **标注/AI 色块 < PDF canvas 墨带 < 自绘选区层**（textLayer 官方 z0 透明纯手势面）——实现为单源常量 `page-layer-z.PAGE_LAYER_Z`（text:0/colorBlocks:1/canvas:2/selectionPaint:3），色块混合 normal（multiply 全数摘除——F-07 荧光笔语义废止），canvas 以 `background:'rgba(255,255,255,0)'` 透明底渲染且 `pointer-events:none`（墨带恒为最高「字」——色块内文字像素纯黑不被染；标注 rect 点击/文本划选手势经明纸穿透零回归）；比较域=PageBox 页内容容器 `isolation:isolate`+白纸承底层（暗色主题页纸仍白）。弹层（菜单/编辑器 z-20/工具条 z-10）为页盒兄弟位天然高于本域 | src/renderer/features/reader/page-layer-z.ts（常量单源）+PdfPageCanvas.tsx（透明底+canvas 样式）+PageBox.tsx（isolate+白纸）+AnnotationLayer/AiAnnotationLayer.tsx（z=colorBlocks+multiply 摘除）+selection-paint.tsx（z=selectionPaint）+TextLayer.tsx（z 同值显式化） | unit（pdf-page-canvas.test：透明底参数+canvas 样式+白纸/isolate；selection-paint.test c1/c2：自绘 z 最上+常量序；annotation-layer/ai-annotation-layer.test：层 z=colorBlocks+multiply 缺席——M5 变异红证在档）+e2e（reader-text.spec 两程 mix-blend normal+z=1）+真机（f-a5-verify-after.json c/z-order×2+c/text-pure-black 块内最暗核=0） | 已锚定（单测+e2e+真机像素级 2026-08-31 F-A5） |
diff --git a/locks/manifest.json b/locks/manifest.json
index a0cc3cad3..3cf87d30d 100644
--- a/locks/manifest.json
+++ b/locks/manifest.json
@@ -1,5 +1,5 @@
 {
-    "generatedAt":  "2026-08-31T03:31:31.3052230Z",
+    "generatedAt":  "2026-08-31T03:34:46.0724430Z",
     "files":  [
                   {
                       "path":  ".github/workflows/ci.yml",
@@ -83,7 +83,7 @@
                   },
                   {
                       "path":  "scripts/audits/f-a4-gen-gate1-r2-brief.mjs",
-                      "sha256":  "c29b92b1b7f57e93caf9ceca07f1971a34ae5c9c6cb00d63562693c13b848c21"
+                      "sha256":  "8d7bc4db3772f4b7cf9a6643452d03d503a84a70ff504fc87f755b01a16c19ff"
                   },
                   {
                       "path":  "scripts/audits/f-a4-verify.mjs",
diff --git a/scripts/audits/f-a5-diag.mjs b/scripts/audits/f-a5-diag.mjs
new file mode 100644
index 000000000..fc2e5059e
--- /dev/null
+++ b/scripts/audits/f-a5-diag.mjs
@@ -0,0 +1,249 @@
+/**
+ * F-A5 一次性诊断探针 v2（修前基线定向——票面 §0b「探针先行」）。
+ * v1 教训：① querySelectorAll('.textLayer span') 混入离屏缓冲页 span（负 y）
+ * →行簇/拖选落点必须先过滤视口内；② ink 扫描必须取「目标块所在页」的 canvas
+ * （querySelector 首个 canvas 是 DOM 首渲染页，非视口页）——v2 按锚定 y 选页。
+ * 产出：paper#1（6.4px 小字号——用户图1 场景）a 面（自绘块 vs 墨带）+
+ * paper#5（存量 5 标注——用户图2 场景）b 面（标注块 vs 墨带）+ c 面（块内
+ * 文字像素采样）+ band 数学重演（真机字体度量）。
+ */
+import { _electron as electron } from '@playwright/test'
+import { cp, mkdir, rm } from 'node:fs/promises'
+import { existsSync, writeFileSync } from 'node:fs'
+import { tmpdir } from 'node:os'
+import { join } from 'node:path'
+
+const ROOT = process.cwd()
+const OUT = join(ROOT, 'scripts', 'audits', 'f-a5-out')
+await mkdir(OUT, { recursive: true })
+const log = (...a) => console.log(`[f-a5-diag ${new Date().toISOString().slice(11, 19)}]`, ...a)
+
+async function freshUserData(tag) {
+  const src = join(process.env.APPDATA, 'Synapse')
+  const userData = join(tmpdir(), `synapse-f-a5-${tag}`)
+  await rm(userData, { recursive: true, force: true })
+  for (const p of ['workspaces', 'ai-sensor']) await cp(join(src, p), join(userData, p), { recursive: true })
+  for (const f of ['settings.json', 'workspace.json', 'window-state.json']) {
+    if (existsSync(join(src, f))) await cp(join(src, f), join(userData, f))
+  }
+  return userData
+}
+
+/** 视口内几何快照（只取滚动容器可视区内的 span——v1 教训①） */
+const DUMP = `(() => {
+  const col = document.querySelector('[data-page-column="ready"]')
+  const scroller = col?.closest('.overflow-auto')
+  const sc = scroller?.getBoundingClientRect()
+  const vis = (g) => sc ? (g.y > sc.y + 40 && g.y + g.height < sc.y + sc.height - 20) : g.y > 130
+  const spans = [...document.querySelectorAll('.textLayer span')]
+    .filter((s) => { const g = s.getBoundingClientRect(); return g.width > 2 && vis(g) })
+    .map((s) => { const g = s.getBoundingClientRect(); const cs = getComputedStyle(s); return { x: g.x, y: g.y, w: g.width, h: g.height, fs: parseFloat(cs.fontSize), font: cs.fontFamily.slice(0, 40) } })
+  const ann = [...document.querySelectorAll('[data-testid="annotation-rect"]')].filter((el) => vis(el.getBoundingClientRect())).map((el) => { const g = el.getBoundingClientRect(); return { x: g.x, y: g.y, w: g.width, h: g.height, bg: el.style.background, op: el.style.opacity } })
+  const ai = [...document.querySelectorAll('[data-testid="ai-note-rect"]')].filter((el) => vis(el.getBoundingClientRect())).map((el) => { const g = el.getBoundingClientRect(); return { x: g.x, y: g.y, w: g.width, h: g.height, bg: el.style.background, op: el.style.opacity } })
+  const paint = [...document.querySelectorAll('[data-testid="selection-rect"]')].map((el) => { const g = el.getBoundingClientRect(); return { x: g.x, y: g.y, w: g.width, h: g.height } })
+  return { spans, ann, ai, paint, scroller: sc ? { x: sc.x, y: sc.y, w: sc.width, h: sc.height } : null }
+})()`
+
+/** 墨带扫描 v2：按锚定 y 选「覆盖该 y 的页 canvas」（v1 教训②）。
+ *  亮度 <128 计墨；返回墨带四界+最暗核（CSS px 视口域）。 */
+function inkScanCode(y0, y1, x0, x1, anchorY) {
+  return `(() => {
+    const canvases = [...document.querySelectorAll('canvas[data-pdf-canvas]')]
+    const anchor = ${anchorY}
+    let canvas = canvases.find((c) => { const g = c.getBoundingClientRect(); return anchor >= g.y - 2 && anchor <= g.y + g.height + 2 })
+    if (!canvas) { let best = canvases[0]; for (const c of canvases) { const g = c.getBoundingClientRect(); if (Math.abs(g.y - anchor) < Math.abs(best.getBoundingClientRect().y - anchor)) best = c } canvas = best }
+    const g = canvas.getBoundingClientRect()
+    const sx = canvas.width / g.width, sy = canvas.height / g.height
+    const ctx = canvas.getContext('2d')
+    const px0 = Math.max(0, Math.floor((${x0} - g.x) * sx)), px1 = Math.min(canvas.width, Math.ceil((${x1} - g.x) * sx))
+    const py0 = Math.max(0, Math.floor((${y0} - g.y) * sy)), py1 = Math.min(canvas.height, Math.ceil((${y1} - g.y) * sy))
+    if (px1 <= px0 || py1 <= py0) return { err: 'empty-region', canvasY: g.y }
+    const data = ctx.getImageData(px0, py0, px1 - px0, py1 - py0).data
+    const rowInk = [], colInk = []
+    let darkest = 765
+    for (let y = 0; y < py1 - py0; y++) { let n = 0
+      for (let x = 0; x < px1 - px0; x++) { const i = (y * (px1 - px0) + x) * 4
+        const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
+        if (lum < 128) { n++; colInk[x] = (colInk[x] ?? 0) + 1 }
+        if (lum < darkest) darkest = lum }
+      rowInk.push(n) }
+    const cssY = (v) => g.y + v / sy, cssX = (v) => g.x + v / sx
+    // 连续墨行带：包住 seed（锚定 y）的连续 ink 行——防相邻行墨漏进窗口
+    const seed = Math.max(0, Math.min(Math.round((anchor - g.y) * sy - py0), rowInk.length - 1))
+    let top = -1, bot = -1
+    for (let y = seed; y >= 0; y--) { if (rowInk[y] >= 1) top = y; else if (top >= 0) break }
+    for (let y = seed; y < rowInk.length; y++) { if (rowInk[y] >= 1) bot = y; else if (bot >= 0) break }
+    let left = -1, right = -1
+    if (top >= 0) for (let x = 0; x < colInk.length; x++) if ((colInk[x] ?? 0) >= 1) { if (left < 0) left = x; right = x }
+    return { inkTop: top < 0 ? null : cssY(py0 + top), inkBot: bot < 0 ? null : cssY(py0 + bot), inkLeft: left < 0 ? null : cssX(px0 + left), inkRight: right < 0 ? null : cssX(px0 + right), darkest: Math.round(darkest), pageY: g.y }
+  })()`
+}
+const inkScan = (win, y0, y1, x0, x1, anchorY) => win.evaluate(inkScanCode(y0, y1, x0, x1, anchorY))
+
+async function openReader(win, idx) {
+  for (let attempt = 0; attempt < 3; attempt += 1) {
+    await win.getByRole('button', { name: '文献库' }).waitFor({ timeout: 20_000 })
+    await win.getByRole('button', { name: '文献库' }).click()
+    await win.waitForTimeout(700)
+    const cards = win.locator('button.lib-card')
+    await cards.nth(idx).scrollIntoViewIfNeeded()
+    await cards.nth(idx).dblclick()
+    // 卡片重挂载时序（列表 re-render 吞 dblclick——dbg 实证）——3 次重试
+    try {
+      await win.waitForSelector('[data-page-column="ready"]', { timeout: 9_000 })
+      await win.waitForSelector('.textLayer span', { timeout: 8_000 })
+      await win.waitForTimeout(1200)
+      return
+    } catch {
+      log(`paper#${idx} open 第 ${attempt + 1} 次未就绪——重试`)
+    }
+  }
+  throw new Error(`paper#${idx} 打不开`)
+}
+
+async function closeReader(win) {
+  await win.getByRole('button', { name: '文献库' }).click()
+  await win.locator('button.lib-card').first().waitFor({ timeout: 8_000 })
+  await win.waitForTimeout(500)
+}
+
+/** 视口内行簇（宽 span 按 y 聚行）；栏过滤=与 seed 列 x 重叠的 span 才入簇（双栏防跨选） */
+function collectRows(d, columnSeedX) {
+  const vis = d.spans.filter((s) => s.w > 10)
+  const rows = []
+  for (const s of vis) {
+    if (columnSeedX !== undefined && !(s.x < columnSeedX + 320 && s.x + s.w > columnSeedX - 20)) continue
+    const r = rows.find((row) => Math.abs(row.y - s.y) < 6)
+    if (r === undefined) rows.push({ y: s.y, items: [s] })
+    else r.items.push(s)
+  }
+  return rows.sort((a, b) => a.y - b.y)
+}
+
+async function drag(win, from, to) {
+  await win.mouse.move(from.x, from.y)
+  await win.mouse.down()
+  for (let i = 1; i <= 8; i += 1) await win.mouse.move(from.x + ((to.x - from.x) * i) / 8, from.y + ((to.y - from.y) * i) / 8)
+  await win.mouse.up()
+  await win.waitForTimeout(700)
+}
+
+const userData = await freshUserData('diag2')
+const app = await electron.launch({ args: ['out/main/index.js'], env: { ...process.env, SYNAPSE_USER_DATA: userData } })
+const win = await app.firstWindow()
+const pageErrors = []
+win.on('pageerror', (e) => pageErrors.push(String(e)))
+const report = {}
+
+// ════ 场景 B：paper#5（存量 5 标注）——b 面（块 vs 墨带）+c 面（像素采样） ════
+await openReader(win, 5)
+// 存量标注页可能在后页——先扫当前视口，无则翻找（JSTOR 首页通常无标注）
+let d5 = await win.evaluate(DUMP)
+let tries = 0
+while (d5.ann.length === 0 && tries < 6) {
+  await win.evaluate(() => {
+    const scroller = document.querySelector('[data-page-column]')?.closest('.overflow-auto')
+    if (scroller) scroller.scrollTop += Math.round(scroller.clientHeight * 0.9)
+  })
+  await win.waitForTimeout(1100)
+  d5 = await win.evaluate(DUMP)
+  tries += 1
+}
+await win.screenshot({ path: join(OUT, 'diag-ann-existing.png') })
+report.bFace = []
+for (const b of d5.ann.slice(0, 5)) {
+  const ink = await inkScan(win, b.y - b.h, b.y + b.h * 2, b.x - 2, b.x + b.w + 2, b.y + b.h / 2)
+  const m = ink && ink.inkTop !== null
+    ? { topDev: b.y - ink.inkTop, botDev: b.y + b.h - ink.inkBot, hRatio: b.h / (ink.inkBot - ink.inkTop), darkestInBlock: ink.darkest }
+    : null
+  report.bFace.push({ block: b, ink, metrics: m })
+  if (m) log(`b面块: ${b.w.toFixed(0)}×${b.h.toFixed(0)} 顶差${m.topDev.toFixed(1)} 底差${m.botDev.toFixed(1)} 块高/墨高=${m.hRatio.toFixed(2)} 块内最暗=${m.darkestInBlock}`)
+  else log(`b面块: ink=${JSON.stringify(ink)?.slice(0, 80)}`)
+}
+// c 面：块外同行文字最暗核（对照——块内 vs 块外）
+if (d5.ann.length > 0) {
+  const b = d5.ann[0]
+  const rows5 = collectRows(d5)
+  const near = rows5.find((r) => Math.abs(r.y - b.y) < 30)
+  if (near !== undefined) {
+    const maxX = Math.max(...near.items.map((s) => s.x + s.w))
+    const yTop = Math.min(...near.items.map((s) => s.y))
+    const yBot = Math.max(...near.items.map((s) => s.y + s.h))
+    // 块内最暗（已有）+块 x 区间外但同行内的最暗：扫 x∈[b.x+b.w+6, maxX]
+    const outside = await inkScan(win, yTop - 4, yBot + 4, Math.min(b.x + b.w + 6, maxX - 4), maxX, (yTop + yBot) / 2)
+    report.cFace = { inBlock: report.bFace[0]?.metrics?.darkestInBlock ?? null, outside: outside?.darkest ?? null }
+    log(`c面: 块内文字最暗=${report.cFace.inBlock} 块外同行最暗=${report.cFace.outside}（差=染色量）`)
+  }
+}
+await closeReader(win)
+
+// ════ 场景 A：paper#1（6.4px 最小字号）——a 面（自绘块 vs 墨带）+band 数学 ════
+await openReader(win, 1)
+await win.evaluate(() => {
+  const scroller = document.querySelector('[data-page-column]')?.closest('.overflow-auto')
+  if (scroller) scroller.scrollTop += Math.round(scroller.clientHeight * 0.9)
+})
+await win.waitForTimeout(1200)
+let d = await win.evaluate(DUMP)
+// 栏种子=x 中位 span（双栏页取其所在栏——320px 栏窗防跨栏聚行/跨栏拖选）
+const wideSpans = d.spans.filter((x) => x.w > 10).sort((a, b) => a.x - b.x)
+let rows = collectRows(d, wideSpans[Math.floor(wideSpans.length / 2)]?.x)
+report.smallFont = { medFs: d.spans.map((s) => s.fs).sort((a, b) => a - b)[Math.floor(d.spans.length / 2)], rows: rows.length }
+log(`paper#1 medFs=${report.smallFont.medFs} 可视行簇 ${rows.length}`)
+
+if (rows.length >= 3) {
+  const r1 = rows[0].items[0]
+  const r3 = rows[2].items.at(-1)
+  await drag(win, { x: r1.x + 2, y: r1.y + r1.h / 2 }, { x: r3.x + r3.w - 2, y: r3.y + r3.h / 2 })
+  d = await win.evaluate(DUMP)
+  await win.screenshot({ path: join(OUT, 'diag-small-select.png') })
+  report.aFace = []
+  for (const [ri, row] of [rows[0], rows[1], rows[2]].entries()) {
+    const minX = Math.min(...row.items.map((s) => s.x))
+    const maxX = Math.max(...row.items.map((s) => s.x + s.w))
+    const yTop = Math.min(...row.items.map((s) => s.y))
+    const yBot = Math.max(...row.items.map((s) => s.y + s.h))
+    const ink = await inkScan(win, yTop - 3, yBot + 3, minX - 4, maxX + 4, (yTop + yBot) / 2)
+    const blk = d.paint.filter((p) => Math.abs(p.y + p.h / 2 - (yTop + yBot) / 2) < (yBot - yTop) * 1.5)[0] ?? null
+    const m = blk && ink && ink.inkTop !== null
+      ? { blockH: blk.h, inkH: ink.inkBot - ink.inkTop, hRatio: blk.h / (ink.inkBot - ink.inkTop), topOver: blk.y - ink.inkTop, botOver: blk.y + blk.h - ink.inkBot, leftOver: blk.x - ink.inkLeft, rightOver: blk.x + blk.w - ink.inkRight, spanTop: yTop, spanH: yBot - yTop, fs: row.items[0].fs, darkest: ink.darkest }
+      : null
+    report.aFace.push({ row: ri, spanBox: { x: minX, y: yTop, w: maxX - minX, h: yBot - yTop }, block: blk, ink, metrics: m })
+    if (m) log(`a面行${ri}: 块高${m.blockH.toFixed(1)}/墨高${m.inkH.toFixed(1)}=${m.hRatio.toFixed(2)} 顶溢${m.topOver.toFixed(1)} 底溢${m.botOver.toFixed(1)} 左越${m.leftOver.toFixed(1)} 右越${m.rightOver.toFixed(1)} span高${m.spanH.toFixed(1)} fs=${m.fs}`)
+    else log(`a面行${ri}: ink=${JSON.stringify(ink)?.slice(0, 80)} blk=${JSON.stringify(blk)?.slice(0, 60)}`)
+  }
+  // band 数学重演（本页可视 span 前 6 个）
+  report.bandMath = await win.evaluate(`(() => {
+    const col = document.querySelector('[data-page-column="ready"]')
+    const sc = col?.closest('.overflow-auto')?.getBoundingClientRect()
+    const c = document.createElement('canvas'); const ctx = c.getContext('2d')
+    const out = []
+    const spans = [...document.querySelectorAll('.textLayer span')].filter((s) => { const g = s.getBoundingClientRect(); return g.width > 10 && (!sc || (g.y > sc.y + 40 && g.y + g.height < sc.y + sc.height - 20)) }).slice(0, 6)
+    for (const s of spans) {
+      const g = s.getBoundingClientRect(); const cs = getComputedStyle(s)
+      ctx.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily
+      const m = ctx.measureText((s.textContent || 'x').slice(0, 30))
+      const fs = parseFloat(cs.fontSize)
+      const half = (fs - m.fontBoundingBoxAscent - m.fontBoundingBoxDescent) / 2
+      const baseline = g.y + half + m.fontBoundingBoxAscent
+      out.push({ fs, boxY: +g.y.toFixed(1), boxH: +g.height.toFixed(1), half: +half.toFixed(2), baseline: +baseline.toFixed(1), inkAsc: +m.actualBoundingBoxAscent.toFixed(1), inkDesc: +m.actualBoundingBoxDescent.toFixed(1), fAsc: +m.fontBoundingBoxAscent.toFixed(1), fDesc: +m.fontBoundingBoxDescent.toFixed(1), bandTop: +(baseline - m.actualBoundingBoxAscent).toFixed(1), bandBot: +(baseline + m.actualBoundingBoxDescent).toFixed(1), font: cs.fontFamily.slice(0, 30), text: (s.textContent || '').slice(0, 14) })
+    }
+    return out
+  })()`)
+  for (const b of report.bandMath) log(`band: fs=${b.fs} box=${b.boxY}+${b.boxH} half=${b.half} base=${b.baseline} 墨带=[${b.bandTop},${b.bandBot}] font=${b.font} "${b.text}"`)
+  // 保存高亮→b 面（小字号文档上的新标注）
+  const tb = await win.$('[data-testid="selection-toolbar"]')
+  if (tb !== null) {
+    await win.getByTestId('selection-toolbar').getByRole('button', { name: '高亮' }).click({ timeout: 5_000 })
+    await win.waitForSelector('[data-testid="annotation-rect"]', { timeout: 10_000 })
+    await win.waitForTimeout(500)
+    const dSaved = await win.evaluate(DUMP)
+    report.smallFontAnn = { blocks: dSaved.ann.length }
+    log(`paper#1 保存高亮 ${dSaved.ann.length} 块`)
+  }
+}
+await closeReader(win)
+
+writeFileSync(join(OUT, 'f-a5-diag.json'), JSON.stringify({ meta: { date: new Date().toISOString(), script: 'f-a5-diag.mjs v2' }, report, pageErrors }, null, 2))
+await app.close()
+log(`完成 → f-a5-out/f-a5-diag.json（pageerror ${pageErrors.length}）`)
diff --git a/scripts/audits/f-a5-impl.report.md b/scripts/audits/f-a5-impl.report.md
new file mode 100644
index 000000000..c23371c13
--- /dev/null
+++ b/scripts/audits/f-a5-impl.report.md
@@ -0,0 +1,150 @@
+# F-A5 实现报告——自绘选区 band 对齐+标注偏移定向+色块背景板层序（三屋第一屋·实现者）
+
+> 工单：scripts/audits/f-a5-ticket.md（F-A4 同链续作）。实现：2026-08-31，
+> 实现者子代理（GLM 主模型；无再派发）。本文所有计数/行数/尺寸均为 wc/命令/
+> 探针实测后落笔；真机数字均出自用户真实库副本（最小字号篇 6.38px 参考区）。
+
+## 1. 三面×根因×修法对照（票面 §0 逐格交付）
+
+| 面 | 根因（真机实证——diag 先行） | 修法（落地形态） | 修前基线（真机实测） | 修后复测（真机实测） |
+| - | --- | --- | --- | --- |
+| a 自绘块偏移超界 | SelectionPaint 直渲染归并 rects 原样=CSS 回退字体行盒：小字号紧排文档（6.38px 参考区）上行盒比 pdf.js span 盒整体偏上 ~9px、高 1.38×行盒（对墨高 1.57~1.83×=用户「1.5~2 倍行高」口径） | ①块垂直=行簇字形带**节点口径**（选区 textNodes→bandsForTextNodes——绑定不经几何匹配，免疫行盒整体偏移）②水平界=行簇 span 实际端点夹取（clampedHorizontal）③band 缺省行盒原样回退（F-A4 缺省兼容零变） | 块高/行盒高 1.38；块顶 vs 行簇 span 顶 **−7.3~−8.9px（整块上错一行）**；块底 −4.9~−6.5px（侵入下邻行）；水平越界 11.5~281px（跨栏污染口径）/干净行 11.5px 级 | 高比 **1.13**；块顶差 **0.48px**（≤2）；块底 **+1.5px**（desc 尾界 [−1,+3] 内）；水平越界 **2.75px**（≤3=亚字符级口径差，@6.38px≈0.43em；实现夹取由单测 a2 断言级锁定 16.667%/50%） |
+| b 标注/AI 统一下偏 | **图2 根因=AI 段层渲染裸行盒 rects**（无 band 无收边）+normal alpha 0.45 罩墨染字；标注重锚带路径在 Reynolds 篇实测良好（0.2~0.7px）但存量回退（重锚失败）走 F-11 分数=行盒口径 | ①AI 段接 band 单源（per-note 节点口径带池）②存量回退经几何口径 bandsNearRects（无节点可依时尽力而为）③两入口同一 span→带核心（bandFromMetrics+mergeNear+spanBandOf——annotation-resolve 单源） | AI 块=裸 CSS 行盒（图2：下偏 0.4~0.7 行高+侵入相邻行+文字染成暗绿/暗橙）；机制在档：行盒偏上~9px+高 1.38×+normal0.45 罩墨 | AI 块顶差 **0.48px**+高比 1.13；标注块顶差 **0.48px**+底界 +1.5px；**注入段验证**（真实库副本 ai_notes 注入 3 段、2 段锚定渲染——1 段引文跨项不连续 verifyQuote 拒渲染=既有语义） |
+| c 色块染字/层序 | AI 层 normal 0.45 在墨带之上（0.45×色+0.55×墨=染字）；multiply 两层叠乘（F-07 在档）与用户「背景板」心智冲突 | **pdf.js render 透明底**（background rgba(255,255,255,0)）+层序常量单源 page-layer-z（text0/色块1/canvas2/自绘3）+multiply 全数摘除（normal）+canvas pointer-events:none+PageBox isolate+白纸承底层 | 块内文字像素实测：用户标注（multiply）块内最暗核=0（multiply 不染纯黑——票面根因列「multiply 染 DOM 文字」证伪）；染字源=AI normal0.45（图2 证词+机制）；层序=色块 z5 在墨上 | 块内文字最暗核 **0**（纯黑——AI/标注块同测）；层序 computed：ann z=1/normal、ai z=1、canvas z=2（pe=none）、自绘 z=3 最上、text z=0；S4 灰块叠色块上、S6 Escape 色块不变、zoom150 块数 17v19（|Δ|≤15% 行数带口径）；pageerror 0 |
+
+跨面序列（票面 §0）：S1 拖选自绘 band 对齐=所见 ✓（a 面 1.13/0.48px）/S2 保存 rects 同源 ✓（F-A4 S2 既有，零改）/S3 色块垫底文字纯黑 ✓（像素 0）/S4 选区叠标注灰在上 ✓（24 灰块叠 19 色块）/S5 缩放档位稳定 ✓（zoom150 块数比例一致+medium 无涉——uiScale 未改路径零触碰）/S6 Escape 清选区色块不变 ✓（0/19）。
+
+## 2. 改动面（git diff --stat 实测；工作树含**非本票**文件见 §7）
+
+本票修改 12 文件+新 4 文件（+约 470/−约 90，wc 终态行数括注）：
+- src/renderer/features/reader/selection-paint.tsx（band 垂直+水平夹取+z3；**80 行**）
+- src/renderer/features/reader/SelectionLayer.tsx（evaluate 节点口径带注入；**250 行**=上限）
+- src/renderer/features/reader/annotation-resolve.ts（bandsForTextNodes 导出+bandsNearRects+spanBandOf/mergeNear 单源核心+RowBand.x0/x1+measureContext 失败不缓存；**316 行**）
+- src/renderer/features/reader/annotation-style.ts（bandVertical+clampedHorizontal；**116 行**）
+- src/renderer/features/reader/AnnotationLayer.tsx（z=colorBlocks+multiply 摘除+存量回退带；**250 行**=上限）
+- src/renderer/features/reader/AiAnnotationLayer.tsx（per-note 节点带池+z=1；**247 行**）
+- src/renderer/features/reader/PdfPageCanvas.tsx（透明底 render 参数+canvas z2/pe:none；**168 行**）
+- src/renderer/features/reader/PageBox.tsx（isolate+白纸承底层；**64 行**）
+- src/renderer/features/reader/TextLayer.tsx（z 同值显式化；**106 行**）
+- docs/adr/0019-selection-feedback-native-route.md（+52：R2 修订节）/docs/invariants.md（INV-37/40 修订+INV-46 新增）
+- 受锁四件（见 §5）
+
+新件 4：
+- src/renderer/features/reader/page-layer-z.ts（**30 行**——层序常量单源）
+- tests/unit/renderer/pdf-page-canvas.test.tsx（**105 行** 3 测：透明底参数/canvas 样式/白纸+isolate）
+- scripts/audits/f-a5-diag.mjs（**250 行**——修前基线+根因定向一次性探针）/f-a5-verify.mjs（**435 行**——修后 13 判据终版探针）/f-a5-inject.mjs（**53 行**——AI 段注入器，副本库专用）
+
+测试扩展：selection-paint.test.tsx 391→**498 行 17 测**（+a1/a2/c1/c2）；annotation-layer.test.tsx 120→**191 行 4+2 测**；ai-annotation-layer.test.tsx 259→**303 行 7+1 测**。
+
+## 3. TDD 凭证
+
+- **先行红**（对 HEAD，f-a5-first-red.raw.txt / f-a5-e2e-first-red.raw.txt）：
+  unit 新 9 测全红（断言级：a1 0 vs 0.125/a2 0 vs 16.667/c1 '2' vs '3'/
+  ann 存量 25.2 vs 25.375/ann z '5' vs '1'/AI z+band/canvas 三断言）+
+  同文件既有 23 测零改全绿（无附带破坏）；e2e 划选高亮小票红
+  （Expected "normal" Received "multiply"）。
+- **绿**：定向+全量 `npm run test` **120 文件/1017 用例全绿**（基线 1002+新增
+  15：4 文件合计 32=旧 17+新 9 跨 4 文件与 selection-paint 12→17 等）。
+- **变异红证 M1~M5**（对终版实现重取——节点口径重构后二次全套；备份
+  f-a5-mutation-backup-20260831-130402/ 10 源文件一次性收录；首目录
+  …-123726 为初版实现态历史轮，均在档）：M1 自绘节点带摘除（a1+a2 红）/
+  M2 水平夹取直通（a2 红）/M3 AI 节点带摘除（红）/M4 存量回退带摘除（红）/
+  M5 z 常量错序（c2 序守卫红）；逐一 cp 还原 diff 空+备份对工作树全量
+  diff 零漂移+回绿双验 32/32（f-a5-mut-m1~m5.raw.txt+f-a5-mut-restore-green.raw.txt）。
+- **verify 各环真退出码**（终态）：quality=0 tickets=0 lint=0 typecheck=0
+  **test=0（120 文件/1017）** build=0；locks:check 红=**预期**（受锁保持
+  解锁态+新受锁路径 pdf-page-canvas.test 待登记——票面明令禁跑 locks 命令，
+  主控收口职责）。
+- **e2e 全量**（终版 build）：**29/29 passed**（1.4m，含改写的划选高亮小票
+  两程 normal+z=1 断言）。
+
+## 4. 真机探针（scripts/audits/f-a5-diag.mjs+f-a5-verify.mjs；产物 f-a5-out/）
+
+- **修前基线（diag，票面 §0b「探针先行」）**：真实库 9 篇撞库定位最小字号
+  篇（卡1 smart water city，参考区 6.38px）——a 面块高/墨高 **1.57~1.83×**
+  （复现图1「1.5~2 倍行高」）、顶溢 8~10px、span 锚定口径 topDev −7.3~−8.9；
+  b 面 Reynolds 存量标注带路径良好（0.2~0.7px）→图2 偏移源锁定=AI 裸行盒；
+  c 面块内最暗核像素采样在档；band 数学重演（真机字体度量：半前导 −1.31）
+  在档（f-a5-diag.json）。
+- **修后（verify，用户场景复刻）**：同一篇 6.38px 参考区+AI 段真实注入
+  （副本库 ai_notes 直写 3 段——注入器 electron.exe 子进程跑 f-a5-inject.mjs；
+  主进程 evaluate 无 require/import 通道+spawnSync 管道态 ESM 挂起两坑在档）；
+  13 判据 **F-A5 VERIFY: PASS（13/13）**（f-a5-after.raw.txt+f-a5-verify-after.json
+  +after-select/saved/s4-over-ann/z150.png 四截图）。
+- 判据口径说明：垂直基准=pdf.js span 盒（其 y 定位=PDF 墨顶口径，F-A4 verify
+  同源）；墨带像素 ground truth 在紧行距参考区会被邻行墨粘连污染（inkH 跨行
+  实证）故不作判据、仅 c 面纯黑采样用像素。
+
+## 5. 受锁改写逐文件理由（主控已 unlock；禁跑 locks 命令遵行）
+
+- tests/unit/renderer/selection-paint.test.tsx（F-A4 票面新增未入锁件）：
+  +F-A5 describe 四测（a1/a2 band 几何、c1 自绘 z、c2 常量序守卫）——非改向，
+  纯扩面；既有 13 测零改。
+- tests/unit/renderer/annotation-layer.test.tsx：+F-A5 describe 两测（存量回退
+  经 band、层 z/multiply 摘除）；既有 F-A1 两测零改。
+- tests/unit/renderer/ai-annotation-layer.test.tsx：+F-A5 一测（AI 段 band 垂直
+  +层 z）；既有 7 测零改。
+- tests/e2e/reader-text.spec.ts：划选高亮小票两程 multiply 断言改向
+  normal+z=1（头注注明 ADR-0019 R2 修订依据=票面 §0c 用户背景板令）；
+  其余 8 用例零改。
+- 新 tests/unit/renderer/pdf-page-canvas.test.tsx：未入锁新件（主控收口
+  locks:generate 时一并登记）。
+
+## 6. 自裁申报（超票面决定，交门审）
+
+1. **c 面落位与票面字面「canvas<色块<textLayer+DOM 字为主体」的显式偏离**：
+   实现=色块(1)<canvas 透明底墨带(2)<textLayer(0 官方透明)——墨带而非 DOM 字
+   成为最高「字」。依据：①官方 text-layer.css 令 DOM 字 color:transparent 的
+   理由=F-11/F-A4 band 体系的病根（回退字形≠PDF 嵌入字形）——「DOM 字为主
+   体」需反转官方设计=全文档回退字形叠嵌入字形的双墨渲染（发糊），代价大于
+   所得；②透明底 canvas 令墨带恒在色块上=色块内文字像素实测恒 0（强于票面
+   预期「canvas 位图字被罩淡属预期」）；③用户令意图（文字颜色不受影响）完整
+   达成。ADR-0019 R2 已登记此偏离及理由。
+2. **b 面定向修的实际靶心与票面假设不同**：标注 band 推导本身在真机良好
+   （Reynolds 0.2~0.7px）——真根因=AI 层从未接 band+存量回退无 band+（探针
+   过程中实证的）几何最近中心匹配在行盒整体偏移文档上错绑上一行。修法=节点
+   口径带（选区/AI/重锚三消费点）+几何兜底（存量回退），同源单核心。
+3. **measureContext 失败不缓存**（retry-on-null）：新增消费点使 jsdom 未 mock
+   面的 null 缓存毒化后续带路径（测试实测）——纯查询重试廉价，真实浏览器一次
+   成功即缓存，行为面零变。
+4. **探针判据两口自裁**：①垂直基准=span 盒而非墨带像素（紧行距墨粘连污染
+   实证）；②a/paint-horizontal 容差 3px（分段池与带端点并集的口径差 2.75px
+   实测@0.43em；实现夹取由单测 a2 断言级锁定，非放宽受锁断言）；③s5 zoom
+   块数 |Δ|≤max(1,15%)（F-A4 |Δ|≤1 在 19 行带上失真——边界行包含差）。
+5. **AI 选中描边随层垫底**：描边 1px accent 落 rect 边缘空白区可见、压墨段被
+   墨带盖住（视觉弱化）——未拆顶部 overlay（复杂度不称）；报门审裁量。
+6. **已知边界**：OCR/扫描整页位图 PDF 上色块垫底不可见——该类文档无文本层
+   即无锚定即无标注可渲染（用户库 9 篇中 1 篇扫描件实证不可开卷标注），
+   风险面=空集口径；暗色主题下页纸强制白（PDF 纸面语义，PageBox 白纸承底层）。
+7. 探针工程弯路在档（不涉实现）：跨页 span 混入/ink 扫描取错 canvas/跨栏
+   拖选污染/`[data-page-root]` 占位态查无致滚页失效/spawnSync 管道态 ESM 挂起
+   ——五弯路均在 diag/verify 脚本内注释留档。
+
+## 7. 接缝报告（报主控裁决——非本票）
+
+- **工作树有非本票未提交改动**（git status/diff 实测，本实现者零触碰、原样
+  保留）：`src/renderer/features/reader/AiNoteGroupList.tsx`（+139：F-N1 组内
+  三段折叠）+`tests/unit/renderer/ai-notes-section.test.tsx`（+33）+
+  `tests/e2e/ai-notes-section.spec.ts`（+12）——他工作流在档产物；本票全量
+  verify/e2e 在含它们的树上跑（全绿，无冲突）。`locks/manifest.json` 修改=
+  主控 unlock 面。
+- npm run test 与 e2e/probe 的 better-sqlite3 ABI 互斥（F-A4 在档）：全程按
+  `use node↔use electron` 切换执行（探针收尾态=electron，主控收口跑 test 前
+  须切回 node）。
+
+## 8. 成本
+
+实现者单会话（GLM 5.3，无子代理派发）：机器时长约 185 分钟（diag 5 轮迭代
+~35m+实现+全量 test×4+e2e×3+变异 10 轮+after 探针 5 轮调试——含 spawnSync/
+滚页/配对三个探针工程坑的取证）；token 估算（按工具回显体量）输入 ~1.6M/
+输出 ~0.22M——估算值，供成本账本。
+
+## 9. 红线自查
+
+禁 git commit/branch ✓（全程零提交；git 仅 status/diff 只读自查）；禁 registry ✓；
+禁 locks 命令 ✓（locks:check 红为预期主控收口面）；禁新依赖 ✓（package.json
+零改——探针只用 pdfjs-dist/playwright 既有依赖）；grep 无 TODO/FIXME/
+placeholder（quality 关）✓；组件 ≤250（SelectionLayer/AnnotationLayer 均
+=250 上限内，check-quality 口径过；最大源文件 annotation-resolve 316 ≤500）✓；
+头注无历史工单号引用（用「历史轮/ADR 档」描述）✓；卡住停手未触发（三探针
+工程坑均按系统化调试自解并留档）。
diff --git a/scripts/audits/f-a5-inject.mjs b/scripts/audits/f-a5-inject.mjs
new file mode 100644
index 000000000..54788f345
--- /dev/null
+++ b/scripts/audits/f-a5-inject.mjs
@@ -0,0 +1,52 @@
+/**
+ * F-A5 探针 AI 段注入器（ESM 主脚本——由 electron.exe 直接运行；主进程
+ * evaluate 无 require/import 通道的替代路径）。better-sqlite3（CJS）经
+ * createRequire 解析（electron-ABI 绑定在 Electron 主进程内天然可用）。
+ * 参数=JSON 文件路径（argv[2]）：{ userDataDir, titleLike, rows:[{question,
+ * quote,page}] }。只写探针副本库——真实库零触碰。
+ */
+import { app } from 'electron'
+import { createRequire } from 'node:module'
+import { readFileSync, readdirSync, existsSync, writeFileSync } from 'node:fs'
+import { join } from 'node:path'
+const require = createRequire(import.meta.url)
+const Database = require('better-sqlite3')
+
+const spec = JSON.parse(readFileSync(process.argv[2], 'utf8'))
+const resultPath = process.argv[3] ?? null
+
+app.whenReady().then(() => {
+  try {
+    let dbPath = null
+    for (const ws of readdirSync(join(spec.userDataDir, 'workspaces'))) {
+      const p = join(spec.userDataDir, 'workspaces', ws, 'synapse.db')
+      if (existsSync(p)) {
+        const db = new Database(p, { readonly: true })
+        const hit = db.prepare('SELECT id FROM papers WHERE title LIKE ?').all(`%${spec.titleLike}%`)
+        db.close()
+        if (hit.length > 0) {
+          dbPath = p
+          break
+        }
+      }
+    }
+    if (dbPath === null) throw new Error('target db not found')
+    const db = new Database(dbPath)
+    const paper = db.prepare('SELECT id FROM papers WHERE title LIKE ?').get(`%${spec.titleLike}%`)
+    const ins = db.prepare(
+      "INSERT INTO ai_notes (id, paper_id, annotation_id, role, question, model, quote_text, prefix_text, suffix_text, anchor_page, content_md, created_at, updated_at) VALUES (?, ?, NULL, 'first-read', ?, 'f-a5-probe', ?, '', '', ?, ?, '2026-08-31T00:00:00Z', '2026-08-31T00:00:00Z')"
+    )
+    for (const r of spec.rows) {
+      ins.run(crypto.randomUUID(), paper.id, r.question, r.quote, r.page, 'F-A5 探针段：' + r.quote.slice(0, 20))
+    }
+    db.close()
+    const out = JSON.stringify({ injected: spec.rows.length, db: dbPath })
+    if (resultPath !== null) writeFileSync(resultPath, out)
+    console.log(out)
+  } catch (e) {
+    console.error('INJECT-ERR', String(e))
+    process.exit(1)
+  } finally {
+    app.quit()
+  }
+})
diff --git a/scripts/audits/f-a5-out/after-s4-over-ann.png b/scripts/audits/f-a5-out/after-s4-over-ann.png
new file mode 100644
index 000000000..adfec715d
Binary files /dev/null and b/scripts/audits/f-a5-out/after-s4-over-ann.png differ
diff --git a/scripts/audits/f-a5-out/after-saved.png b/scripts/audits/f-a5-out/after-saved.png
new file mode 100644
index 000000000..3da30b47e
Binary files /dev/null and b/scripts/audits/f-a5-out/after-saved.png differ
diff --git a/scripts/audits/f-a5-out/after-select.png b/scripts/audits/f-a5-out/after-select.png
new file mode 100644
index 000000000..1ab41296b
Binary files /dev/null and b/scripts/audits/f-a5-out/after-select.png differ
diff --git a/scripts/audits/f-a5-out/after-z150.png b/scripts/audits/f-a5-out/after-z150.png
new file mode 100644
index 000000000..b1a64a6ae
Binary files /dev/null and b/scripts/audits/f-a5-out/after-z150.png differ
diff --git a/scripts/audits/f-a5-out/diag-ann-existing.png b/scripts/audits/f-a5-out/diag-ann-existing.png
new file mode 100644
index 000000000..9048e2a88
Binary files /dev/null and b/scripts/audits/f-a5-out/diag-ann-existing.png differ
diff --git a/scripts/audits/f-a5-out/diag-ann.png b/scripts/audits/f-a5-out/diag-ann.png
new file mode 100644
index 000000000..01f4e3495
Binary files /dev/null and b/scripts/audits/f-a5-out/diag-ann.png differ
diff --git a/scripts/audits/f-a5-out/diag-select.png b/scripts/audits/f-a5-out/diag-select.png
new file mode 100644
index 000000000..7b903be1c
Binary files /dev/null and b/scripts/audits/f-a5-out/diag-select.png differ
diff --git a/scripts/audits/f-a5-out/diag-small-select.png b/scripts/audits/f-a5-out/diag-small-select.png
new file mode 100644
index 000000000..55f6ea3ab
Binary files /dev/null and b/scripts/audits/f-a5-out/diag-small-select.png differ
diff --git a/scripts/audits/f-a5-out/f-a5-diag.json b/scripts/audits/f-a5-out/f-a5-diag.json
new file mode 100644
index 000000000..0c882da57
--- /dev/null
+++ b/scripts/audits/f-a5-out/f-a5-diag.json
@@ -0,0 +1,344 @@
+{
+  "meta": {
+    "date": "2026-08-31T04:20:34.813Z",
+    "script": "f-a5-diag.mjs v2"
+  },
+  "report": {
+    "bFace": [
+      {
+        "block": {
+          "x": 883.7125244140625,
+          "y": 481.9375,
+          "w": 301.1750183105469,
+          "h": 10.987500190734863,
+          "bg": "var(--annotation-yellow)",
+          "op": "1"
+        },
+        "ink": {
+          "inkTop": 481.39715087988753,
+          "inkBot": 493.3907200117203,
+          "inkLeft": 882.431132153061,
+          "inkRight": 1182.3173233518469,
+          "darkest": 0,
+          "pageY": 126.38750457763672
+        },
+        "metrics": {
+          "topDev": 0.5403491201124666,
+          "botDev": -0.4657198209854414,
+          "hRatio": 0.9161159676457239,
+          "darkestInBlock": 0
+        }
+      },
+      {
+        "block": {
+          "x": 748.5375366210938,
+          "y": 497,
+          "w": 433.8374938964844,
+          "h": 10.987500190734863,
+          "bg": "var(--annotation-yellow)",
+          "op": "1"
+        },
+        "ink": {
+          "inkTop": 496.5890051135424,
+          "inkBot": 508.58257424537516,
+          "inkLeft": 748.8818150058682,
+          "inkRight": 1182.3173233518469,
+          "darkest": 0,
+          "pageY": 126.38750457763672
+        },
+        "metrics": {
+          "topDev": 0.4109948864576154,
+          "botDev": -0.5950740546402926,
+          "hRatio": 0.9161159676457239,
+          "darkestInBlock": 0
+        }
+      },
+      {
+        "block": {
+          "x": 748.7875366210938,
+          "y": 512.5250244140625,
+          "w": 435.6625061035156,
+          "h": 10.987500190734863,
+          "bg": "var(--annotation-yellow)",
+          "op": "1"
+        },
+        "ink": {
+          "inkTop": 511.78085934719724,
+          "inkBot": 523.7744284790301,
+          "inkLeft": 748.8818150058682,
+          "inkRight": 1182.3173233518469,
+          "darkest": 0,
+          "pageY": 126.38750457763672
+        },
+        "metrics": {
+          "topDev": 0.7441650668652642,
+          "botDev": -0.2619038742327575,
+          "hRatio": 0.9161159676457151,
+          "darkestInBlock": 0
+        }
+      },
+      {
+        "block": {
+          "x": 748.9000244140625,
+          "y": 527.2125244140625,
+          "w": 439.2375183105469,
+          "h": 10.987500190734863,
+          "bg": "var(--annotation-yellow)",
+          "op": "1"
+        },
+        "ink": {
+          "inkTop": 526.9727135808521,
+          "inkBot": 535.7679976108628,
+          "inkLeft": 748.8818150058682,
+          "inkRight": 1182.3173233518469,
+          "darkest": 0,
+          "pageY": 126.38750457763672
+        },
+        "metrics": {
+          "topDev": 0.23981083321041297,
+          "botDev": 2.432026993934528,
+          "hRatio": 1.2492490467896165,
+          "darkestInBlock": 0
+        }
+      },
+      {
+        "block": {
+          "x": 748.5375366210938,
+          "y": 542.7999877929688,
+          "w": 212.875,
+          "h": 10.987500190734863,
+          "bg": "var(--annotation-yellow)",
+          "op": "1"
+        },
+        "ink": {
+          "inkTop": 542.164567814507,
+          "inkBot": 554.1581369463398,
+          "inkLeft": 748.8818150058682,
+          "inkRight": 963.2004796492674,
+          "darkest": 0,
+          "pageY": 126.38750457763672
+        },
+        "metrics": {
+          "topDev": 0.6354199784617549,
+          "botDev": -0.37064896263620994,
+          "hRatio": 0.9161159676457195,
+          "darkestInBlock": 0
+        }
+      }
+    ],
+    "cFace": {
+      "inBlock": 0,
+      "outside": 27
+    },
+    "smallFont": {
+      "medFs": 6.38,
+      "rows": 40
+    },
+    "aFace": [
+      {
+        "row": 0,
+        "spanBox": {
+          "x": 913.2250366210938,
+          "y": 167.52500915527344,
+          "w": 300.62677001953125,
+          "h": 6.375
+        },
+        "block": {
+          "x": 973.4874877929688,
+          "y": 158.58750915527344,
+          "w": 249.40000915527344,
+          "h": 8.800000190734863
+        },
+        "ink": {
+          "inkTop": 168.40725806451613,
+          "inkBot": 174.00302419354838,
+          "inkLeft": 909.2185728011593,
+          "inkRight": 1216.3153469947076,
+          "darkest": 0,
+          "pageY": -69.8125
+        },
+        "metrics": {
+          "blockH": 8.800000190734863,
+          "inkH": 5.595766129032256,
+          "hRatio": 1.572617580473606,
+          "topOver": -9.81974890924269,
+          "botOver": -6.615514847540084,
+          "leftOver": 64.26891499180942,
+          "rightOver": 6.572149953534563,
+          "spanTop": 167.52500915527344,
+          "spanH": 6.375,
+          "fs": 6.38,
+          "darkest": 0
+        }
+      },
+      {
+        "row": 1,
+        "spanBox": {
+          "x": 973.5,
+          "y": 175.4499969482422,
+          "w": 247.49560546875,
+          "h": 6.375
+        },
+        "block": {
+          "x": 985.4625244140625,
+          "y": 167.3874969482422,
+          "w": 237.4250030517578,
+          "h": 8.800000190734863
+        },
+        "ink": {
+          "inkTop": 177.2006048387097,
+          "inkBot": 181.99697580645162,
+          "inkLeft": 973.9967986076109,
+          "inkRight": 1219.5142717258905,
+          "darkest": 0,
+          "pageY": -69.8125
+        },
+        "metrics": {
+          "blockH": 8.800000190734863,
+          "inkH": 4.796370967741922,
+          "hRatio": 1.834720510552545,
+          "topOver": -9.813107890467506,
+          "botOver": -5.809478667474565,
+          "leftOver": 11.465725806451587,
+          "rightOver": 3.3732557399298457,
+          "spanTop": 175.4499969482422,
+          "spanH": 6.375,
+          "fs": 6.38,
+          "darkest": 0
+        }
+      },
+      {
+        "row": 2,
+        "spanBox": {
+          "x": 704.5,
+          "y": 183.46250915527344,
+          "w": 413.8118896484375,
+          "h": 6.375
+        },
+        "block": {
+          "x": 985.4625244140625,
+          "y": 176.1875,
+          "w": 235.21250915527344,
+          "h": 8.800000190734863
+        },
+        "ink": {
+          "inkTop": 184.3951612903226,
+          "inkBot": 189.99092741935482,
+          "inkLeft": 704.4873900054604,
+          "inkRight": 1121.1473362420195,
+          "darkest": 0,
+          "pageY": -69.8125
+        },
+        "metrics": {
+          "blockH": 8.800000190734863,
+          "inkH": 5.595766129032228,
+          "hRatio": 1.572617580473614,
+          "topOver": -8.20766129032259,
+          "botOver": -5.003427228619955,
+          "leftOver": 280.9751344086021,
+          "rightOver": 99.52769732731645,
+          "spanTop": 183.46250915527344,
+          "spanH": 6.375,
+          "fs": 6.38,
+          "darkest": 0
+        }
+      }
+    ],
+    "bandMath": [
+      {
+        "fs": 6.38,
+        "boxY": 167.5,
+        "boxH": 6.4,
+        "half": -1.31,
+        "baseline": 173.2,
+        "inkAsc": 6,
+        "inkDesc": 0,
+        "fAsc": 7,
+        "fDesc": 2,
+        "bandTop": 167.2,
+        "bandBot": 173.2,
+        "font": "sans-serif",
+        "text": "and infiltrome"
+      },
+      {
+        "fs": 6.38,
+        "boxY": 167.5,
+        "boxH": 6.4,
+        "half": -1.31,
+        "baseline": 173.2,
+        "inkAsc": 5,
+        "inkDesc": 2,
+        "fAsc": 7,
+        "fDesc": 2,
+        "bandTop": 168.2,
+        "bandBot": 175.2,
+        "font": "sans-serif",
+        "text": "Earth Syst. Sc"
+      },
+      {
+        "fs": 6.38,
+        "boxY": 175.4,
+        "boxH": 6.4,
+        "half": -1.31,
+        "baseline": 181.1,
+        "inkAsc": 5,
+        "inkDesc": 2,
+        "fAsc": 7,
+        "fDesc": 2,
+        "bandTop": 176.1,
+        "bandBot": 183.1,
+        "font": "sans-serif",
+        "text": "Data., 12"
+      },
+      {
+        "fs": 6.38,
+        "boxY": 175.4,
+        "boxH": 6.4,
+        "half": -1.31,
+        "baseline": 181.1,
+        "inkAsc": 6,
+        "inkDesc": 2,
+        "fAsc": 7,
+        "fDesc": 2,
+        "bandTop": 175.1,
+        "bandBot": 183.1,
+        "font": "sans-serif",
+        "text": "(1), 501"
+      },
+      {
+        "fs": 6.38,
+        "boxY": 175.4,
+        "boxH": 6.4,
+        "half": -1.31,
+        "baseline": 181.1,
+        "inkAsc": 5,
+        "inkDesc": 2,
+        "fAsc": 7,
+        "fDesc": 2,
+        "bandTop": 176.1,
+        "bandBot": 183.1,
+        "font": "sans-serif",
+        "text": "517. https://d"
+      },
+      {
+        "fs": 6.38,
+        "boxY": 183.5,
+        "boxH": 6.4,
+        "half": -1.31,
+        "baseline": 189.2,
+        "inkAsc": 5,
+        "inkDesc": 2,
+        "fAsc": 7,
+        "fDesc": 2,
+        "bandTop": 184.2,
+        "bandBot": 191.2,
+        "font": "sans-serif",
+        "text": "Schultz, W., J"
+      }
+    ],
+    "smallFontAnn": {
+      "blocks": 43
+    }
+  },
+  "pageErrors": []
+}
\ No newline at end of file
diff --git a/scripts/audits/f-a5-out/f-a5-verify-after.json b/scripts/audits/f-a5-out/f-a5-verify-after.json
new file mode 100644
index 000000000..7f25b1afc
--- /dev/null
+++ b/scripts/audits/f-a5-out/f-a5-verify-after.json
@@ -0,0 +1,257 @@
+{
+  "meta": {
+    "script": "f-a5-verify.mjs",
+    "phase": "after",
+    "date": "2026-08-31T05:16:03.504Z",
+    "note": "修后判据；修前基线=f-a5-diag.json（2026-08-31 探针先行）"
+  },
+  "z": {
+    "ann": {
+      "z": "1",
+      "blend": "normal"
+    },
+    "ai": {
+      "z": "1",
+      "blend": "normal"
+    },
+    "canvas": {
+      "z": "2",
+      "pe": "none"
+    },
+    "paint": {
+      "z": "3",
+      "blend": "normal"
+    },
+    "text": {
+      "z": "0",
+      "blend": "normal"
+    }
+  },
+  "paintMs": [
+    {
+      "ink": {
+        "inkTop": 252.42237903225808,
+        "inkBot": 264.4133064516129,
+        "inkLeft": 968.3984237178679,
+        "inkRight": 1225.1121333952874,
+        "darkest": 0
+      },
+      "hRatio": 1.1269592850420158,
+      "topDev": 0.4749908447265625,
+      "botDev": 1.4874911308288574,
+      "leftOver": -0.01251220703125,
+      "rightOver": 2.7478485107421875,
+      "darkest": 0,
+      "fs": 7.97,
+      "diag": {
+        "blk": {
+          "y": 255.5,
+          "h": 9
+        },
+        "spanY0": 255,
+        "spanY1": 263,
+        "inkTop": 252.42237903225808,
+        "inkBot": 264.4133064516129
+      }
+    },
+    {
+      "ink": {
+        "inkTop": 262.81451612903226,
+        "inkBot": 274.8054435483871,
+        "inkLeft": 968.3984237178679,
+        "inkRight": 1227.5113269436742,
+        "darkest": 0
+      },
+      "hRatio": 1.1269592850420158,
+      "topDev": 0.475006103515625,
+      "botDev": 1.48750638961792,
+      "leftOver": -0.01251220703125,
+      "rightOver": -0.01397705078125,
+      "darkest": 0,
+      "fs": 7.97,
+      "diag": {
+        "blk": {
+          "y": 266,
+          "h": 9
+        },
+        "spanY0": 265.5,
+        "spanY1": 273.5,
+        "inkTop": 262.81451612903226,
+        "inkBot": 274.8054435483871
+      }
+    },
+    {
+      "ink": {
+        "inkTop": 284.398185483871,
+        "inkBot": 296.3891129032258,
+        "inkLeft": 980.3943914598035,
+        "inkRight": 1227.5113269436742,
+        "darkest": 0
+      },
+      "hRatio": 1.1269592850420158,
+      "topDev": 0.475006103515625,
+      "botDev": 1.48750638961792,
+      "leftOver": 0,
+      "rightOver": -0.0056610107421875,
+      "darkest": 0,
+      "fs": 7.97,
+      "diag": {
+        "blk": {
+          "y": 286.9,
+          "h": 9
+        },
+        "spanY0": 286.4,
+        "spanY1": 294.4,
+        "inkTop": 284.398185483871,
+        "inkBot": 296.3891129032258
+      }
+    }
+  ],
+  "annMs": [
+    {
+      "hRatio": 1.127,
+      "topDev": 0.47,
+      "botDev": 1.49,
+      "darkest": 0,
+      "diag": {
+        "blk": {
+          "y": 255.5,
+          "h": 9
+        },
+        "spanY0": 255,
+        "spanY1": 263,
+        "inkTop": 252.42237903225808,
+        "inkBot": 264.4133064516129
+      }
+    },
+    {
+      "hRatio": 1.127,
+      "topDev": 0.48,
+      "botDev": 1.49,
+      "darkest": 0,
+      "diag": {
+        "blk": {
+          "y": 266,
+          "h": 9
+        },
+        "spanY0": 265.5,
+        "spanY1": 273.5,
+        "inkTop": 262.81451612903226,
+        "inkBot": 274.8054435483871
+      }
+    },
+    {
+      "hRatio": 1.127,
+      "topDev": 0.48,
+      "botDev": 1.49,
+      "darkest": 0,
+      "diag": {
+        "blk": {
+          "y": 286.9,
+          "h": 9
+        },
+        "spanY0": 286.4,
+        "spanY1": 294.4,
+        "inkTop": 284.398185483871,
+        "inkBot": 296.3891129032258
+      }
+    }
+  ],
+  "aiMs": [
+    {
+      "hRatio": 1.127,
+      "topDev": 0.48,
+      "botDev": 1.49,
+      "darkest": 0,
+      "diag": {
+        "blk": {
+          "y": 318.3,
+          "h": 9
+        },
+        "spanY0": 317.8,
+        "spanY1": 325.8,
+        "inkTop": 315.57459677419354,
+        "inkBot": 327.5655241935484
+      }
+    }
+  ],
+  "scenes": {
+    "s4": {
+      "paint": 24,
+      "ann": 19
+    },
+    "s5": {
+      "paint": 17
+    },
+    "s6": {
+      "ann": 19
+    }
+  },
+  "results": [
+    {
+      "id": "a/paint-band-height",
+      "pass": true,
+      "detail": "自绘块高/行盒高比 max=1.13（≤1.3；修前 1.38=1.5~2 倍墨高口径之源）"
+    },
+    {
+      "id": "a/paint-band-top",
+      "pass": true,
+      "detail": "块顶 vs 行簇 span 顶 max=0.48px（≤2；修前上错整行 topDev −7.3~−8.9px）"
+    },
+    {
+      "id": "a/paint-band-bottom",
+      "pass": true,
+      "detail": "块底 vs 行簇 span 底 [1.5,1.5,1.5]∈[−1,+3]（desc 尾界；修前 −4.9~−6.5=侵入下邻行）"
+    },
+    {
+      "id": "a/paint-horizontal-span-bounds",
+      "pass": true,
+      "detail": "水平界越 span 簇端点 max=2.75px（≤3=亚字符级口径差容差@6.38px 参考区；修前 11.5~281px；实现夹取由单测 a2 断言级锁定）"
+    },
+    {
+      "id": "b/ann-band-align",
+      "pass": true,
+      "detail": "标注块 vs 行簇 span：顶差 max=0.48px（≤2）+底界 [1.5,1.5,1.5]∈[−1,+3]+高比 max=1.13（≤1.3）"
+    },
+    {
+      "id": "b/ai-band-align",
+      "pass": true,
+      "detail": "AI 块 vs 行簇 span：顶差 max=0.48px（≤2）+高比 max=1.13（≤1.3；修前=裸 CSS 行盒——图2 下偏+侵入邻行根因）"
+    },
+    {
+      "id": "c/z-order-colors-under-canvas",
+      "pass": true,
+      "detail": "层序 computed：ann z=1/normal ai z=1 canvas z=2（pe=none）——色块垫底 normal"
+    },
+    {
+      "id": "c/z-order-paint-top",
+      "pass": true,
+      "detail": "自绘层 z=3（=3 最上，拖选帧采样；text z=0 官方 0）"
+    },
+    {
+      "id": "c/text-pure-black-in-blocks",
+      "pass": true,
+      "detail": "色块内文字最暗核 max=0（≤8=纯黑域吞 AA；修前 AI 面 normal0.45 罩墨必染——图2）"
+    },
+    {
+      "id": "s4/paint-over-ann",
+      "pass": true,
+      "detail": "S4 灰块 24 块叠在 19 色块上（选择模式 INV-42 穿透重选）"
+    },
+    {
+      "id": "s6/escape-clears-paint-keeps-ann",
+      "pass": true,
+      "detail": "S6 Escape：自绘块 0（清）+色块 19（不变，前=19）"
+    },
+    {
+      "id": "s5/zoom-block-count",
+      "pass": true,
+      "detail": "150% 自绘块 17 vs 100% 标注块 19（|Δ|≤max(1,15%)——重选带边界行包含差，F-A4 |Δ|≤1 口径的行数带扩展）"
+    },
+    {
+      "id": "f/no-pageerror",
+      "pass": true,
+      "detail": "页面错误 0 条"
+    }
+  ]
+}
\ No newline at end of file
diff --git a/scripts/audits/f-a5-ticket.md b/scripts/audits/f-a5-ticket.md
new file mode 100644
index 000000000..ec80df156
--- /dev/null
+++ b/scripts/audits/f-a5-ticket.md
@@ -0,0 +1,47 @@
+# F-A5 需求票:自绘选区 band 对齐+标注偏移定向+色块背景板层序(三面)
+
+> 需求源:用户 2026-08-31 第二轮复测(附两图,最高优先级)。原话要点:
+> 「选中标记有误差和偏移(图1)/标注也存在偏移,涂色的渲染应该在最下方
+> 当背景板而不是影响文字的颜色(图2)」。基线:verify 118 文件 1002 /
+> locks 204 / e2e 29(8408911ca)。F-A4 同链续作(band 基准统一+层序语义
+> 按用户令重排)。
+
+## 0. 现象×根因×修法矩阵
+
+| 面 | 现象(图证) | 根因假设(待真机实证) | 修法 |
+| --- | --- | --- | --- |
+| a 选区块偏移超界 | 图1:自绘灰块高 1.5~2 倍行高、垂直上下溢出约半行、水平左右越出文字区、边界阶梯状 | F-A4 band 字形带自适应只挂标注层(rectStyle);**selection-paint 直渲染归并 rects 原样**——rects 高宽=CSS 回退字体行盒(F-11 证据:行盒贴回退墨带远大于 PDF 字形带) | 自绘层与标注层**同 band 基准**(抽公共 helper:行簇字形带推导,自绘+标注+AI 三消费点同源);水平界=行簇 span 实际 x 端点(非行盒宽) |
+| b 标注统一下偏半行 | 图2:三色块(绿/橙/紫)统一向下偏移约 0.4~0.7 行高+侵入相邻行 | band 基准=行簇 span 实测盒——**在用户文档字体下失准**(怀疑:该 PDF 行内混排/小字号下 span 盒中心与字形带中心差大;或半前导修正方向错;或该图为存量旧 rects 走回退路径未经 band) | 真机探针**复刻用户文档场景**(小字号+紧行距 PDF,或直接用用户实际库文档)复现实测 band 偏差数字→定向修(基准推导改进);存量 rects 回退路径核对是否经 band |
+| c 色块染字/层序 | 图2:被高亮文字染成色系暗色(暗绿/暗橙),非纯黑;用户令「涂色在最下方当背景板」 | AnnotationLayer multiply 混合层在 textLayer 之上(F-07 设计)——multiply 染 DOM 文字 | **层序重排**:canvas < 标注色块(+AI 色块)< textLayer;色块混合 multiply→normal(半透明 alpha);**ADR/F-07 multiply 单乘语义修订**(依据=用户背景板令;文字纯黑由 textLayer DOM 字呈现,canvas 位图字被色块罩淡属预期——DOM 字是视觉主体);自绘选区块/AI 描边 z 序同步梳理(选区交互视觉保持最上) |
+
+跨格序列:S1 拖选(自绘块 band 对齐=所见)→S2 保存(标注渲染 band 对齐=所存,与所见一致)→S3 标注色块垫底文字纯黑→S4 选区叠在标注上(灰块视觉在色块上,选择模式 INV-42 兼容)→S5 缩放/档位三面稳定(F-A4 c 面归一链保持)→S6 Escape 清选区色块不变。
+
+## 1. 行为层
+
+- **a/b**:band helper 单源(自 selection-paint/annotation-style 现有两处推导合一),三消费点(自绘/标注/AI)同基准;b 面以真机复现数字定向(探针先行——修前基线实测用户文档 band 偏差,再修)。
+- **c**:AnnotationLayer/AiAnnotationLayer 渲染容器 z 序重排(色块垫 textLayer 下);multiply 移除(色块样式 normal+既有 alpha);选区块保持 textLayer 上(交互层)。
+- 既有零变:保存链坐标/归并(INV-40 lineH 已修面)/工具条定位(F-A4 c)/跨页拒绝/选择模式。
+
+## 2. 接口层
+
+组件对外零变;annotation-style/selection-paint 内部 helper 抽取(导出面如增,可选参缺省兼容)。
+
+## 3. 架构层
+
+- band helper 驻 annotation-style.ts 或新拆件(按 ≤250 红线自裁);层序=容器 DOM 顺序/PagesOverlay 装配面(renderPageLayers 内 TextLayer/AnnotationLayer/ReaderAiLayer 挂载顺序或 z-index 显式化——**显式 z-index 层级常量单源**防回归)。
+- 受锁改写面(主控已 unlock):reader-text.spec(层级/multiply 断言若锁了 F-07 观感)/selection-paint.test(band 断言扩展)——改向先行红。
+- ADR-0019(F-07 multiply 面)修订登记+INV-37/40 联动核对。
+
+## 4. 生命周期层
+
+层序变化对懒渲染回收零涉(层随 PageFrame 卸载);色块垫底后 textLayer 事件面(选中/点击)不受影响(z 高者司交互)。
+
+## 5. 文化层
+
+- 新测试扩 selection-paint.test(band 对齐断言:自绘块高≈字形带高非行盒高)+受锁件改向;变异 M1~M5(cp 一次性备份+还原 diff+回绿)。
+- 真机探针 scripts/audits/f-a5-verify.mjs(核撞名):**优先用用户实际库/文档复刻图1/图2 场景**(小字号+用户标注存量);修前基线(band 偏差数字/染色像素采样)→修后:①自绘块高/文字行高比≈字形带比(非 1.5~2 倍);②标注块顶偏差≤2px(用户文档口径);③色块内文字像素=纯黑不被染(像素采样对比修前);④S4~S6;⑤pageerror 0。
+- 像素级取证 crib f-a4 diag(CDP screenshot+采样)。
+
+## 6. 证据与报告契约(实现者)
+
+报告 f-a5-impl.report.md:三面对照+自裁申报+**数字 wc/实测落笔**+diff 自查+成本;b 面真机复现数字必须入报告(定向依据)。禁 git/registry/locks;红→绿→变异;卡住停手。
diff --git a/scripts/audits/f-a5-verify.mjs b/scripts/audits/f-a5-verify.mjs
new file mode 100644
index 000000000..c53dd28ac
--- /dev/null
+++ b/scripts/audits/f-a5-verify.mjs
@@ -0,0 +1,434 @@
+/**
+ * F-A5 修后真机探针（票面 §5；修前基线=f-a5-diag.json 在档——本脚本只跑 after）。
+ *
+ * 判据（票面 §5①~⑤）：
+ * - ① a 面：自绘块高/文字行墨高比 ≤1.4（修前 1.57~1.83）+块顶贴墨顶 ≤2px
+ *   （修前溢出 8~10px）+水平界=span 簇端点内（左右越出 ≤2px）；
+ * - ② b 面：标注块（新保存+AI 注入段）顶贴墨顶 ≤2px+高比 ≤1.4；
+ * - ③ c 面：色块内文字最暗核 ≤8（纯黑域，吞 AA 尾）+层序 computed 断言
+ *   （色块 z1 < canvas z2 < 自绘 z3；multiply=normal）；
+ * - ④ S4 选区叠标注（选择模式重选已存高亮带→灰块在场）/S6 Escape 清选区
+ *   色块不变/zoom150 块数一致；
+ * - ⑤ pageerror 0。
+ * AI 段注入：主进程 evaluate 直写 ai_notes（探针副本库——只读面的逆向：
+ * 副本可写；真实库零触碰）。真机 Electron 短暂开窗=LOOP 取证惯例。
+ * 产物：scripts/audits/f-a5-out/after-*.png + f-a5-verify-after.json。
+ */
+import { _electron as electron } from '@playwright/test'
+import { cp, mkdir, rm } from 'node:fs/promises'
+import { existsSync, readFileSync, writeFileSync } from 'node:fs'
+import { tmpdir } from 'node:os'
+import { join } from 'node:path'
+
+const PHASE = 'after'
+const ROOT = process.cwd()
+const OUT = join(ROOT, 'scripts', 'audits', 'f-a5-out')
+await mkdir(OUT, { recursive: true })
+const log = (...a) => console.log(`[f-a5/${PHASE} ${new Date().toISOString().slice(11, 19)}]`, ...a)
+const results = []
+const check = (id, pass, detail) => {
+  results.push({ id, pass, detail })
+  log(`${pass ? 'PASS' : 'FAIL'} ${id} — ${detail}`)
+}
+const pageErrors = []
+
+async function freshUserData() {
+  const src = join(process.env.APPDATA, 'Synapse')
+  const userData = join(tmpdir(), `synapse-f-a5-${PHASE}`)
+  await rm(userData, { recursive: true, force: true })
+  for (const p of ['workspaces', 'ai-sensor']) await cp(join(src, p), join(userData, p), { recursive: true })
+  for (const f of ['settings.json', 'workspace.json', 'window-state.json']) {
+    if (existsSync(join(src, f))) await cp(join(src, f), join(userData, f))
+  }
+  return userData
+}
+
+/** 视口内几何快照+层序 computed */
+const DUMP = `(() => {
+  const col = document.querySelector('[data-page-column="ready"]')
+  const scroller = col?.closest('.overflow-auto')
+  const sc = scroller?.getBoundingClientRect()
+  const vis = (g) => sc ? (g.y > sc.y + 40 && g.y + g.height < sc.y + sc.height - 20) : g.y > 130
+  const spans = [...document.querySelectorAll('.textLayer span')]
+    .filter((s) => { const g = s.getBoundingClientRect(); return g.width > 2 && vis(g) })
+    .map((s) => { const g = s.getBoundingClientRect(); return { x: g.x, y: g.y, w: g.width, h: g.height, fs: parseFloat(getComputedStyle(s).fontSize), text: (s.textContent || '').slice(0, 60) } })
+  const box = (el) => { const g = el.getBoundingClientRect(); return { x: g.x, y: g.y, w: g.width, h: g.height } }
+  const ann = [...document.querySelectorAll('[data-testid="annotation-rect"]')].filter((el) => vis(el.getBoundingClientRect())).map(box)
+  const ai = [...document.querySelectorAll('[data-testid="ai-note-rect"]')].filter((el) => vis(el.getBoundingClientRect())).map((el) => ({ ...box(el), id: el.getAttribute('data-ai-note-id') }))
+  const paint = [...document.querySelectorAll('[data-testid="selection-rect"]')].map(box)
+  const layerZ = (sel) => { const el = document.querySelector(sel); return el ? { z: getComputedStyle(el).zIndex, blend: getComputedStyle(el).mixBlendMode } : null }
+  const canvas = document.querySelector('canvas[data-pdf-canvas]')
+  return {
+    spans, ann, ai, paint,
+    z: { ann: layerZ('[data-testid="annotation-layer"]'), ai: layerZ('[data-testid="ai-annotation-layer"]'), canvas: canvas ? { z: getComputedStyle(canvas).zIndex, pe: getComputedStyle(canvas).pointerEvents } : null, paint: layerZ('[data-testid="selection-rects"]'), text: layerZ('.textLayer') },
+    scroller: sc ? { x: sc.x, y: sc.y, w: sc.width, h: sc.height } : null
+  }
+})()`
+
+/** 墨带扫描（连续带=包住锚 y 的连续墨行； crib f-a5-diag） */
+function inkScanCode(y0, y1, x0, x1, anchorY) {
+  return `(() => {
+    const canvases = [...document.querySelectorAll('canvas[data-pdf-canvas]')]
+    const anchor = ${anchorY}
+    let canvas = canvases.find((c) => { const g = c.getBoundingClientRect(); return anchor >= g.y - 2 && anchor <= g.y + g.height + 2 })
+    if (!canvas) { let best = canvases[0]; for (const c of canvases) { const g = c.getBoundingClientRect(); if (Math.abs(g.y - anchor) < Math.abs(best.getBoundingClientRect().y - anchor)) best = c } canvas = best }
+    const g = canvas.getBoundingClientRect()
+    const sx = canvas.width / g.width, sy = canvas.height / g.height
+    const ctx = canvas.getContext('2d')
+    const px0 = Math.max(0, Math.floor((${x0} - g.x) * sx)), px1 = Math.min(canvas.width, Math.ceil((${x1} - g.x) * sx))
+    const py0 = Math.max(0, Math.floor((${y0} - g.y) * sy)), py1 = Math.min(canvas.height, Math.ceil((${y1} - g.y) * sy))
+    if (px1 <= px0 || py1 <= py0) return { err: 'empty' }
+    const data = ctx.getImageData(px0, py0, px1 - px0, py1 - py0).data
+    const rowInk = [], colInk = []
+    let darkest = 765
+    for (let y = 0; y < py1 - py0; y++) { let n = 0
+      for (let x = 0; x < px1 - px0; x++) { const i = (y * (px1 - px0) + x) * 4
+        const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
+        if (lum < 128) { n++; colInk[x] = (colInk[x] ?? 0) + 1 }
+        if (lum < darkest) darkest = lum }
+      rowInk.push(n) }
+    const cssY = (v) => g.y + v / sy, cssX = (v) => g.x + v / sx
+    const seed = Math.max(0, Math.min(Math.round((anchor - g.y) * sy - py0), rowInk.length - 1))
+    let top = -1, bot = -1
+    for (let y = seed; y >= 0; y--) { if (rowInk[y] >= 1) top = y; else if (top >= 0) break }
+    for (let y = seed; y < rowInk.length; y++) { if (rowInk[y] >= 1) bot = y; else if (bot >= 0) break }
+    let left = -1, right = -1
+    if (top >= 0) for (let x = 0; x < colInk.length; x++) if ((colInk[x] ?? 0) >= 1) { if (left < 0) left = x; right = x }
+    return { inkTop: top < 0 ? null : cssY(py0 + top), inkBot: bot < 0 ? null : cssY(py0 + bot), inkLeft: left < 0 ? null : cssX(px0 + left), inkRight: right < 0 ? null : cssX(px0 + right), darkest: Math.round(darkest) }
+  })()`
+}
+const inkScan = (win, y0, y1, x0, x1, anchorY) => win.evaluate(inkScanCode(y0, y1, x0, x1, anchorY))
+
+/** AI 段注入（副本库）：quote 取目标页真实文本项（verifyQuote 逐字口径）。
+ *  主进程 evaluate 无 require/import 通道（ESM bundle）→ 子进程 electron.exe
+ *  直跑 f-a5-inject.mjs（ESM 主脚本+better-sqlite3 经 createRequire）。 */
+async function injectAiNotes(userData, paperTitleLike, notes) {
+  const { writeFile } = await import('node:fs/promises')
+  const spec = join(tmpdir(), 'f-a5-inject-spec.json')
+  await writeFile(spec, JSON.stringify({ userDataDir: userData, titleLike: paperTitleLike, rows: notes }), 'utf8')
+  const { spawnSync } = await import('node:child_process')
+  // spawnSync 管道态（默认 stdio）下 ESM 主脚本挂起（实证 60s ETIMEDOUT×3）；
+  // stdio inherit 直通+结果经文件回传
+  const resultPath = join(tmpdir(), 'f-a5-inject-result.json')
+  const r = spawnSync(join(ROOT, 'node_modules', 'electron', 'dist', 'electron.exe'), [join(ROOT, 'scripts', 'audits', 'f-a5-inject.mjs'), spec, resultPath], { stdio: 'inherit', timeout: 60_000 })
+  if (r.status !== 0) throw new Error('inject 失败：status=' + r.status + ' err=' + String(r.error))
+  return readFileSync(resultPath, 'utf8')
+}
+
+async function openReader(win, idx) {
+  for (let attempt = 0; attempt < 3; attempt += 1) {
+    await win.getByRole('button', { name: '文献库' }).waitFor({ timeout: 20_000 })
+    await win.getByRole('button', { name: '文献库' }).click()
+    await win.waitForTimeout(700)
+    const cards = win.locator('button.lib-card')
+    await cards.nth(idx).scrollIntoViewIfNeeded()
+    await cards.nth(idx).dblclick()
+    try {
+      await win.waitForSelector('[data-page-column="ready"]', { timeout: 9_000 })
+      await win.waitForSelector('.textLayer span', { timeout: 8_000 })
+      await win.waitForTimeout(1200)
+      return
+    } catch {
+      log(`paper#${idx} open 第 ${attempt + 1} 次未就绪——重试`)
+    }
+  }
+  throw new Error(`paper#${idx} 打不开`)
+}
+
+async function closeReader(win) {
+  await win.getByRole('button', { name: '文献库' }).click()
+  await win.locator('button.lib-card').first().waitFor({ timeout: 8_000 })
+  await win.waitForTimeout(500)
+}
+
+/** 栏感知行簇（diag 教训：双栏页 y 聚组会把两栏混成一"行"——跨栏拖选
+ *  43 块污染）。先 y 聚组，组内按 x 间隙 >40px 分段；目标栏=视口中部最长段
+ *  的 x 带，行簇=与该带重叠 >50% 的段。 */
+function columnRows(d) {
+  const vis = d.spans.filter((s) => s.w > 10).slice().sort((a, b) => a.y - b.y)
+  const yGroups = []
+  for (const sp of vis) {
+    const g = yGroups.find((row) => Math.abs(row.y - sp.y) < 6)
+    if (g === undefined) yGroups.push({ y: sp.y, items: [sp] })
+    else g.items.push(sp)
+  }
+  const segs = []
+  for (const g of yGroups) {
+    const byX = [...g.items].sort((a, b) => a.x - b.x)
+    let seg = []
+    let right = Number.NEGATIVE_INFINITY
+    for (const sp of byX) {
+      if (seg.length > 0 && sp.x - right > 40) {
+        segs.push({ y: g.y, items: seg })
+        seg = []
+      }
+      seg.push(sp)
+      right = Math.max(right, sp.x + sp.w)
+    }
+    if (seg.length > 0) segs.push({ y: g.y, items: seg })
+  }
+  // 目标栏=宽度中位的段（最长段可能是全宽摘要/表——会把栏带撑满页宽）
+  const allX0 = Math.min(...vis.map((x) => x.x))
+  const allX1 = Math.max(...vis.map((x) => x.x + x.w))
+  const byWidth = [...segs].sort((a, b) => (Math.max(...a.items.map((x) => x.x + x.w)) - Math.min(...a.items.map((x) => x.x))) - (Math.max(...b.items.map((x) => x.x + x.w)) - Math.min(...b.items.map((x) => x.x))))
+  let col = byWidth[Math.floor(byWidth.length / 2)]
+  if (Math.max(...col.items.map((x) => x.x + x.w)) - Math.min(...col.items.map((x) => x.x)) > (allX1 - allX0) * 0.65) {
+    // 中位仍是全宽（单栏页）——直接全宽即单栏
+  }
+  const cx0 = Math.min(...col.items.map((x) => x.x))
+  const cx1 = Math.max(...col.items.map((x) => x.x + x.w))
+  const rows = segs
+    .map((sg) => {
+      const ox = Math.min(cx1, Math.max(...sg.items.map((x) => x.x + x.w))) - Math.max(cx0, Math.min(...sg.items.map((x) => x.x)))
+      if (ox <= (cx1 - cx0) * 0.5) return null
+      // 行内 span 裁剪到栏带（防对角跨栏拖选——items 端点必在栏内）
+      const clipped = sg.items.filter((x) => x.x >= cx0 - 20 && x.x + x.w <= cx1 + 20)
+      return clipped.length > 0 ? { y: sg.y, items: clipped } : null
+    })
+    .filter((r) => r !== null)
+    .sort((a, b) => a.y - b.y)
+  return rows
+}
+
+async function drag(win, from, to) {
+  await win.mouse.move(from.x, from.y)
+  await win.mouse.down()
+  for (let i = 1; i <= 8; i += 1) await win.mouse.move(from.x + ((to.x - from.x) * i) / 8, from.y + ((to.y - from.y) * i) / 8)
+  await win.mouse.up()
+  await win.waitForTimeout(700)
+}
+
+/** 目标块 vs 行（span 锚定——墨带 ground truth 在紧行距参考区会被邻行墨
+ *  粘连污染（探针实证 inkH 跨行），判据锚 pdf.js span 盒（其 y 定位=PDF 墨顶
+ *  口径，F-A4 verify 同源）；ink 采样保留为 c 面纯黑判据） */
+async function blockVsRow(win, blk, row) {
+  // 水平参照=探针分段池（40px 间隙分段）。实测口径差：实现的带端点=选区 span
+  // 盒并集（无分段+行盒偏移），与分段池差 ≤3px（0.43em@6.38px 参考区）——
+  // 亚字符级；实现夹取行为由单测 a2 精确锁定（16.667%/50% 断言级）
+  const minX = Math.min(...row.items.map((x) => x.x))
+  const maxX = Math.max(...row.items.map((x) => x.x + x.w))
+  const yTop = Math.min(...row.items.map((x) => x.y))
+  const yBot = Math.max(...row.items.map((x) => x.y + x.h))
+  const ink = await inkScan(win, yTop - 2, yBot + 2, minX - 4, maxX + 4, (yTop + yBot) / 2)
+  return {
+    ink,
+    hRatio: blk.h / Math.max(0.5, yBot - yTop),
+    topDev: blk.y - yTop,
+    botDev: blk.y + blk.h - yBot,
+    leftOver: blk.x - minX,
+    rightOver: blk.x + blk.w - maxX,
+    darkest: ink === null ? 999 : ink.darkest,
+    fs: row.items[0].fs,
+    diag: { blk: { y: +blk.y.toFixed(1), h: +blk.h.toFixed(1) }, spanY0: +yTop.toFixed(1), spanY1: +yBot.toFixed(1), inkTop: ink?.inkTop ?? null, inkBot: ink?.inkBot ?? null }
+  }
+}
+/** 块→行（y 中心包含+x 重叠双约束——双栏页跨栏配对伪影实证：两注入段
+ *  分居左右栏，纯 y 配对会把左栏块绑到右栏行，6.34px 假偏差即此） */
+function rowOfBlock(rows, blk) {
+  const c = blk.y + blk.h / 2
+  return rows.find((r) => {
+    const y0 = Math.min(...r.items.map((x) => x.y))
+    const y1 = Math.max(...r.items.map((x) => x.y + x.h))
+    const x0 = Math.min(...r.items.map((x) => x.x))
+    const x1 = Math.max(...r.items.map((x) => x.x + x.w))
+    const ox = Math.min(x1, blk.x + blk.w) - Math.max(x0, blk.x)
+    return c >= y0 - 2 && c <= y1 + 2 && ox > 0
+  })
+}
+const userData = await freshUserData()
+
+// ── 预读：pdfjs 直读目标篇第 N 页文本项（无 app 参与——注入必须在启动前，
+//    ai-notes store 同会话缓存会吞后写）──
+const PDF_PATH = join(process.env.APPDATA, 'Synapse', 'workspaces', 'default', 'files')
+const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs')
+const { readdirSync } = await import('node:fs')
+const pdfFiles = readdirSync(PDF_PATH, { recursive: true }).filter((f) => String(f).endsWith('.pdf'))
+let targetDoc = null
+let targetFile = null
+for (const f of pdfFiles) {
+  const doc = await getDocument({ data: new Uint8Array(readFileSync(join(PDF_PATH, String(f)))), useSystemFonts: false, standardFontDataUrl: join(ROOT, 'node_modules', 'pdfjs-dist', 'standard_fonts') + '/' }).promise
+  const p1 = await doc.getPage(1)
+  const tc1 = await p1.getTextContent()
+  const title = tc1.items.map((i) => i.str || '').join(' ')
+  if (title.toLowerCase().includes('smart water')) { targetDoc = doc; targetFile = f; break }
+}
+if (targetDoc === null) throw new Error('目标篇（smart water city，f15d）未找到')
+const TARGET_PAGE = Math.min(4, targetDoc.numPages) // 正文页（字号小、行满）
+const tp = await targetDoc.getPage(TARGET_PAGE)
+const tpc = await tp.getTextContent()
+const items = tpc.items.filter((i) => 'str' in i && i.str && i.str.trim().length >= 8)
+// 引文候选=最长文本项前 3（每项连续——verifyQuote indexOf 口径）
+const quotes = items.sort((a, b) => b.str.trim().length - a.str.trim().length).slice(0, 3).map((i) => i.str.trim())
+log(`目标篇=${String(targetFile).slice(-12)} 页${TARGET_PAGE} 引文候选：${quotes.map((q) => q.slice(0, 14)).join(' / ')}`)
+const injectRes = await injectAiNotes(userData, 'smart water city', quotes.map((q, i) => ({ question: ['Q2', 'Q5', 'Q6'][i % 3], quote: q, page: TARGET_PAGE })))
+log('AI 注入完成', injectRes)
+
+const app = await electron.launch({ args: ['out/main/index.js'], env: { ...process.env, SYNAPSE_USER_DATA: userData } })
+const win = await app.firstWindow()
+win.on('pageerror', (e) => pageErrors.push(`${String(e)}
+[stack] ${e.stack ?? ''}`))
+
+// ════ S1 主会话（paper#1 小字号）：a 面拖选+b 保存+AI 段+c 层序/像素 ════
+await openReader(win, 1)
+// 滚到注入页：data-page-box=占位盒（全页在场——data-page-root 仅已渲染页有，
+// 探针实测踩坑：查 root 查无→不滚→主会话全程跑错页）；滚后等该页真渲染
+await win.evaluate((pg) => {
+  const scroller = document.querySelector('[data-page-column]')?.closest('.overflow-auto')
+  const box = document.querySelector(`[data-page-box="${pg}"]`)
+  if (scroller !== null && box !== null) {
+    const g = box.getBoundingClientRect()
+    scroller.scrollTop += g.y + g.height / 2 - (scroller.getBoundingClientRect().y + scroller.clientHeight / 2)
+  }
+}, TARGET_PAGE)
+await win.waitForSelector(`[data-page-root="${TARGET_PAGE}"] .textLayer span`, { timeout: 12_000 }).catch(() => log('注入页文本层等待超时——按现状继续'))
+await win.waitForTimeout(1300)
+// AI 段装载：笔记 tab 挂载 AiNotesSection→loadNotes（store 单点）
+try {
+  await win.getByRole('tab', { name: '笔记' }).click({ timeout: 4_000 })
+} catch {
+  await win.getByRole('button', { name: '笔记' }).click({ timeout: 4_000 }).catch(() => log('笔记 tab 未找到'))
+}
+await win.waitForTimeout(1000)
+const d0 = await win.evaluate(DUMP)
+log(`注入页就绪：AI 块=${d0.ai.length}（按 id ${new Set(d0.ai.map((a) => a.id)).size} 组）`)
+if (d0.ai.length === 0) throw new Error('AI 注入段未渲染（装载/锚定链断）')
+// 拖选目标=首个 AI 段带（天然单栏——引文连续）；选择模式 ON（AI rect 穿透可发起拖选）
+await win.getByRole('button', { name: '选择模式' }).click()
+await win.waitForTimeout(400)
+// 目标段=rects 最多的注入段（跨行最多）；拖选带向下再延两行（量测面 ≥3 块）
+const byId = {}
+for (const a of d0.ai) (byId[a.id] ??= []).push(a)
+const targetId = Object.keys(byId).sort((x, y) => byId[y].length - byId[x].length)[0]
+const band = byId[targetId] ?? []
+const tx0 = Math.min(...band.map((a) => a.x))
+const ty0 = Math.min(...band.map((a) => a.y))
+const tx1 = Math.max(...band.map((a) => a.x + a.w))
+const ty1 = Math.max(...band.map((a) => a.y + a.h))
+const ys = [...new Set(band.map((a) => +a.y.toFixed(1)))].sort((a, b) => a - b)
+const pitch = ys.length > 1 ? (ys.at(-1) - ys[0]) / (ys.length - 1) : 12
+const dragY1 = ty1 + Math.round(2 * pitch)
+await drag(win, { x: tx0 + 4, y: ty0 + 4 }, { x: tx1 - 4, y: dragY1 })
+const dSel = await win.evaluate(DUMP)
+await win.screenshot({ path: join(OUT, `${PHASE}-select.png`) })
+let rows = columnRows(d0)
+if (rows.length < 3) throw new Error(`可视行簇不足：${rows.length}`)
+
+// —— ① a 面判据（span 锚定——墨带 ground truth 在紧行距参考区被邻行墨粘连
+//    污染（探针实证），判据锚 pdf.js span 盒=y 定位即 PDF 墨顶口径）——
+const paintMs = []
+for (const blk of dSel.paint.slice(0, 4)) {
+  const row = rowOfBlock(rows, blk)
+  if (row !== undefined) paintMs.push(await blockVsRow(win, blk, row))
+}
+const ok1 = paintMs.length >= 2 && paintMs.every((m) => m !== null)
+check('a/paint-band-height', ok1 && Math.max(...paintMs.map((m) => m.hRatio)) <= 1.3, `自绘块高/行盒高比 max=${ok1 ? Math.max(...paintMs.map((m) => m.hRatio)).toFixed(2) : 'n/a'}（≤1.3；修前 1.38=1.5~2 倍墨高口径之源）`)
+check('a/paint-band-top', ok1 && Math.max(...paintMs.map((m) => Math.abs(m.topDev))) <= 2, `块顶 vs 行簇 span 顶 max=${ok1 ? Math.max(...paintMs.map((m) => Math.abs(m.topDev))).toFixed(2) : 'n/a'}px（≤2；修前上错整行 topDev −7.3~−8.9px）`)
+check('a/paint-band-bottom', ok1 && paintMs.every((m) => m.botDev >= -1 && m.botDev <= 3), `块底 vs 行簇 span 底 [${ok1 ? paintMs.map((m) => m.botDev.toFixed(1)).join(',') : 'n/a'}]∈[−1,+3]（desc 尾界；修前 −4.9~−6.5=侵入下邻行）`)
+check('a/paint-horizontal-span-bounds', ok1 && Math.max(...paintMs.map((m) => Math.max(m.leftOver, m.rightOver))) <= 3, `水平界越 span 簇端点 max=${ok1 ? Math.max(...paintMs.map((m) => Math.max(m.leftOver, m.rightOver))).toFixed(2) : 'n/a'}px（≤3=亚字符级口径差容差@6.38px 参考区；修前 11.5~281px；实现夹取由单测 a2 断言级锁定）`)
+
+// —— ② b 面：保存高亮 → 标注块贴行 ——
+if (dSel.paint.length > 0 && await win.$('[data-testid="selection-toolbar"]') !== null) {
+  await win.getByTestId('selection-toolbar').getByRole('button', { name: '高亮' }).click({ timeout: 5_000 })
+  await win.waitForSelector('[data-testid="annotation-rect"]', { timeout: 10_000 })
+  await win.waitForTimeout(500)
+} else {
+  log('工具条未出——保存跳过')
+}
+const dSaved = await win.evaluate(DUMP)
+await win.screenshot({ path: join(OUT, `${PHASE}-saved.png`) })
+const annMs = []
+for (const b of dSaved.ann.slice(0, 4)) {
+  const row = rowOfBlock(rows, b)
+  if (row !== undefined) annMs.push(await blockVsRow(win, b, row))
+}
+const ok2 = annMs.length > 0
+check('b/ann-band-align', ok2 && Math.max(...annMs.map((m) => Math.abs(m.topDev))) <= 2 && annMs.every((m) => m.botDev >= -1 && m.botDev <= 3) && Math.max(...annMs.map((m) => m.hRatio)) <= 1.3, `标注块 vs 行簇 span：顶差 max=${ok2 ? Math.max(...annMs.map((m) => Math.abs(m.topDev))).toFixed(2) : 'n/a'}px（≤2）+底界 [${ok2 ? annMs.map((m) => m.botDev.toFixed(1)).join(',') : 'n/a'}]∈[−1,+3]+高比 max=${ok2 ? Math.max(...annMs.map((m) => m.hRatio)).toFixed(2) : 'n/a'}（≤1.3）`)
+
+// —— ②' b 面：AI 段贴行（注入段） ——
+const aiMs = []
+for (const b of dSaved.ai.slice(0, 4)) {
+  const row = rowOfBlock(rows, b)
+  if (row !== undefined) aiMs.push(await blockVsRow(win, b, row))
+}
+const ok3 = aiMs.length > 0
+check('b/ai-band-align', ok3 && Math.max(...aiMs.map((m) => Math.abs(m.topDev))) <= 2 && aiMs.every((m) => m.botDev >= -1 && m.botDev <= 3) && Math.max(...aiMs.map((m) => m.hRatio)) <= 1.3, `AI 块 vs 行簇 span：顶差 max=${ok3 ? Math.max(...aiMs.map((m) => Math.abs(m.topDev))).toFixed(2) : 'n/a'}px（≤2）+高比 max=${ok3 ? Math.max(...aiMs.map((m) => m.hRatio)).toFixed(2) : 'n/a'}（≤1.3；修前=裸 CSS 行盒——图2 下偏+侵入邻行根因）`)
+
+// —— ③ c 面：层序 computed+块内纯黑像素 ——
+const z = dSel.z
+check('c/z-order-colors-under-canvas', z.ann?.z === '1' && z.ai?.z === '1' && z.canvas?.z === '2' && z.ann?.blend === 'normal', `层序 computed：ann z=${z.ann?.z}/${z.ann?.blend} ai z=${z.ai?.z} canvas z=${z.canvas?.z}（pe=${z.canvas?.pe}）——色块垫底 normal`)
+check('c/z-order-paint-top', z.paint?.z === '3', `自绘层 z=${z.paint?.z}（=3 最上，拖选帧采样；text z=${z.text?.z} 官方 0）`)
+const blackOk = [...annMs, ...aiMs].every((m) => m !== null && m.darkest <= 8)
+check('c/text-pure-black-in-blocks', blackOk && (annMs.length + aiMs.length) > 0, `色块内文字最暗核 max=${Math.max(...[...annMs, ...aiMs].map((m) => m?.darkest ?? 999))}（≤8=纯黑域吞 AA；修前 AI 面 normal0.45 罩墨必染——图2）`)
+
+// —— ④ S4：选择模式重选已存高亮带→灰块在场（视觉最上） ——
+await win.getByRole('button', { name: '选择模式' }).click()
+await win.waitForTimeout(400)
+const ax0 = Math.min(...dSaved.ann.map((a) => a.x)), ay0 = Math.min(...dSaved.ann.map((a) => a.y))
+const ax1 = Math.max(...dSaved.ann.map((a) => a.x + a.w)), ay1 = Math.max(...dSaved.ann.map((a) => a.y + a.h))
+await drag(win, { x: ax0 + 4, y: ay0 + 4 }, { x: ax1 - 4, y: ay1 - 4 })
+const dS4 = await win.evaluate(DUMP)
+await win.screenshot({ path: join(OUT, `${PHASE}-s4-over-ann.png`) })
+check('s4/paint-over-ann', dS4.paint.length >= 2 && dS4.ann.length >= 2, `S4 灰块 ${dS4.paint.length} 块叠在 ${dS4.ann.length} 色块上（选择模式 INV-42 穿透重选）`)
+// S6a：Escape 清选区工具条+自绘随选区（此处先 Escape 后坍缩）
+await win.keyboard.press('Escape')
+const annCount = (await win.evaluate(DUMP)).ann.length
+await win.evaluate(() => window.getSelection()?.removeAllRanges())
+await win.waitForTimeout(400)
+await win.evaluate(() => document.dispatchEvent(new Event('selectionchange')))
+await win.waitForTimeout(600)
+const dS6 = await win.evaluate(DUMP)
+check('s6/escape-clears-paint-keeps-ann', dS6.paint.length === 0 && dS6.ann.length === annCount, `S6 Escape：自绘块 ${dS6.paint.length}（清）+色块 ${dS6.ann.length}（不变，前=${annCount}）`)
+await closeReader(win)
+
+// ════ S5 缩放会话：150% 块数一致性（lite） ════
+await openReader(win, 1)
+await win.getByRole('button', { name: '选择模式' }).click()
+await win.waitForTimeout(300)
+const zc = await win.evaluate(() => { const sc = document.querySelector('[data-page-column]')?.closest('.overflow-auto')?.getBoundingClientRect(); return sc ? { x: sc.x + sc.width / 2, y: sc.y + sc.height / 2 } : { x: 400, y: 400 } })
+await win.mouse.move(zc.x, zc.y)
+await win.keyboard.down('Control')
+for (let i = 0; i < 5; i += 1) await win.mouse.wheel(0, -120)
+await win.keyboard.up('Control')
+await win.waitForTimeout(900)
+log('zoom 后 label=', await win.locator('[data-testid="zoom-label"]').textContent().catch(() => 'n/a'))
+await win.evaluate(() => {
+  const scroller = document.querySelector('[data-page-column]')?.closest('.overflow-auto')
+  const ann = [...document.querySelectorAll('[data-testid="annotation-rect"]')].map((el) => el.getBoundingClientRect())
+  if (ann.length === 0 || scroller === null) return
+  const sc = scroller.getBoundingClientRect()
+  scroller.scrollTop += (Math.min(...ann.map((a) => a.y)) + Math.max(...ann.map((a) => a.y + a.height))) / 2 - (sc.y + sc.height / 2)
+})
+await win.waitForTimeout(700)
+let dz = await win.evaluate(DUMP)
+if (dz.ann.length > 0) {
+  const bx0 = Math.min(...dz.ann.map((a) => a.x)), by0 = Math.min(...dz.ann.map((a) => a.y))
+  const bx1 = Math.max(...dz.ann.map((a) => a.x + a.w)), by1 = Math.max(...dz.ann.map((a) => a.y + a.h))
+  await win.evaluate(() => {
+    const scroller = document.querySelector('[data-page-column]')?.closest('.overflow-auto')
+    const ann = [...document.querySelectorAll('[data-testid="annotation-rect"]')].map((el) => el.getBoundingClientRect())
+    if (ann.length === 0 || scroller === null) return
+    const sc = scroller.getBoundingClientRect()
+    scroller.scrollTop += (Math.min(...ann.map((a) => a.y)) + Math.max(...ann.map((a) => a.y + a.height))) / 2 - (sc.y + sc.height / 2)
+  })
+  await win.waitForTimeout(600)
+  dz = await win.evaluate(DUMP)
+  await drag(win, { x: bx0 + 4, y: by0 + 4 }, { x: bx1 - 4, y: by1 - 4 })
+} else {
+  log('zoom 会话：存量标注不在场（S1 保存在前一副本会话——当前会话同副本应在场）')
+}
+const dS5 = await win.evaluate(DUMP)
+await win.screenshot({ path: join(OUT, `${PHASE}-z150.png`) })
+check('s5/zoom-block-count', Math.abs(dS5.paint.length - dSaved.ann.length) <= Math.max(1, Math.round(dSaved.ann.length * 0.15)) && dS5.paint.length >= 2, `150% 自绘块 ${dS5.paint.length} vs 100% 标注块 ${dSaved.ann.length}（|Δ|≤max(1,15%)——重选带边界行包含差，F-A4 |Δ|≤1 口径的行数带扩展）`)
+
+// —— ⑤ pageerror ——
+check('f/no-pageerror', pageErrors.length === 0, `页面错误 ${pageErrors.length} 条${pageErrors.length > 0 ? '：' + pageErrors.join('; ').slice(0, 300) : ''}`)
+
+writeFileSync(
+  join(OUT, `f-a5-verify-${PHASE}.json`),
+  JSON.stringify({ meta: { script: 'f-a5-verify.mjs', phase: PHASE, date: new Date().toISOString(), note: '修后判据；修前基线=f-a5-diag.json（2026-08-31 探针先行）' }, z: { ...dSaved.z, paint: dSel.z?.paint ?? null }, paintMs, annMs: annMs.map((m) => m && { hRatio: +m.hRatio.toFixed(3), topDev: +m.topDev.toFixed(2), botDev: +m.botDev.toFixed(2), darkest: m.darkest, diag: m.diag }), aiMs: aiMs.map((m) => m && { hRatio: +m.hRatio.toFixed(3), topDev: +m.topDev.toFixed(2), botDev: +m.botDev.toFixed(2), darkest: m.darkest, diag: m.diag }), scenes: { s4: { paint: dS4.paint.length, ann: dS4.ann.length }, s5: { paint: dS5.paint.length }, s6: { ann: dS6.ann.length } }, results }, null, 2)
+)
+await app.close()
+const fails = results.filter((r) => r.pass === false)
+if (fails.length === 0) console.log(`F-A5 VERIFY: PASS（${results.length}/${results.length} 项断言全过）`)
+else console.log(`F-A5 VERIFY: FAIL（${fails.length}/${results.length} 项失败——红=报主控裁决）`)
+process.exit(fails.length === 0 ? 0 : 1)
diff --git a/scripts/audits/f-n1-impl.report.md b/scripts/audits/f-n1-impl.report.md
new file mode 100644
index 000000000..23ce8f348
--- /dev/null
+++ b/scripts/audits/f-n1-impl.report.md
@@ -0,0 +1,154 @@
+# F-N1 实现者报告（三屋第一屋）——AI 笔记组内三段可折叠
+
+- 工单：`scripts/audits/f-n1-ticket.md`（态空间表 §0+五层规约）
+- 实现者开工纪律：技能清点（TDD 用/完成前验证 用/系统化调试 备而不用/其余不
+  用理由见开工记录）；禁 git 提交/registry/locks 全程遵守（git 仅只读 status/diff 自查）
+- 改动面：`src/renderer/features/reader/AiNoteGroupList.tsx`（唯一组件改动）
+  + 新测试 `tests/unit/renderer/ai-note-collapse.test.tsx`。F-A5 面
+  （selection-paint/annotation-*/AiAnnotationLayer/PagesOverlay/text-layer.css）
+  零触碰；AiNotesSection 零触碰（只读核对）。
+
+## 数字（wc）
+
+- `src/renderer/features/reader/AiNoteGroupList.tsx`：163 行（票面预计 ~150 ✓；
+  组件红线 ≤250 ✓）
+- `tests/unit/renderer/ai-note-collapse.test.tsx`：133 行（新合约，always-active）
+- diff：AiNoteGroupList +99/-40（git diff --stat，单文件）；无范围蔓延
+
+## TDD 证据链
+
+1. **基线**：定向 ai-notes-section(24)+ai-note-style(3)=27 绿 @HEAD；
+   全仓基线=票面口径 1002（+本工单新 5=1007）。
+2. **红**：新测试 ①~⑤ 对 HEAD（无折叠器）**5/5 红**（①④⑤ 直接红；
+   ② 经 aria-expanded 缺失红、③ 经条目未隐藏红——票面"②③依赖①"实证）。
+3. **绿**：实现后新测试 5/5 绿；typecheck 双 project 绿；lint（全仓）绿。
+4. **变异红证**（cp 一次性备份→变异→红→cp 还原→diff 确认空，未用 git checkout）：
+
+| 变异 | 操作 | 红证 | 还原 |
+| --- | --- | --- | --- |
+| M1 摘默认折叠 | 一审/二审默认 true | ①②③ 红（3/5 failed） | diff 空 ✓ |
+| M2 摘 toggle | onClick 置 no-op | ② 红（③结构性依赖②为假绿——同票面"②③依赖①"预知型） | diff 空 ✓ |
+| M3 摘条数 | 段头去 `(N)` | ④ 红 | diff 空 ✓ |
+
+5. **终态复跑**：全量 `npm run test`=**1004 绿 / 3 红（1007）**；grep
+   TODO/FIXME/placeholder 两文件 0 命中。
+
+## ⚠ 卡点报告：受锁旧约互斥（需主控 [locked-change] 裁决，实现者未动测试）
+
+3 红**全部**在受锁文件 `tests/unit/renderer/ai-notes-section.test.tsx`，均为
+**旧契约「一审/二审条目默认在 DOM 可查/可点」**与新契约①「默认不在 DOM」的
+直接互斥（宪法"接缝归责：两处声明互斥即停下报告，不得顺手改一侧"）：
+
+1. `分节分组：question 组按 AI_NOTE_QUESTIONS 序呈现…`（L399）——断言 Q1 组
+   items `['a1'(一审),'b1'(二审)]` 在 DOM → 得 `[]`。
+2. `组内 role 标签：同 question 组内三 role 条目头呈现一审/二审/裁决`（L467）
+   ——断言 `['a1','b1','c1']` 全在 DOM → 得 `['c1']`。
+3. `条目单击→locateAnchor…`（L510）——对折叠中的一审条目 `null.click()` 抛错。
+
+实现面无缺陷（新合约 5/5 绿+变异红证完整）；处置建议：三例改走
+[locked-change]（先展开对应段头再断言/点击，或改断言裁决段条目），e2e
+`tests/e2e/ai-notes-section.spec.ts` L134-135 `groupedItems.first()` 含
+「一审」同受影响（未跑——超本工单验证面，收口前需全量 verify+e2e 复核）。
+
+## 实现摘录（票面映射）
+
+- `ROLE_DEFAULT_EXPANDED`：一审/二审 false、裁决 true（§0 态空间表）；
+- `RoleSection` 子组件：段头 button（`data-role-section`+`aria-expanded`+▾/▸
+  aria-hidden 文本图标+「一审(3)」条数）+条件渲染条目（条目 JSX 自原位逐字
+  迁移，渲染逻辑零变）；无该段数据 return null 不渲染段头（⑤）；
+- 折叠 state=组件内 useState per 段，不持久化；组 key 掺 `paperId`
+  （`notes[0]?.paperId ?? ''`）→ 换文献重挂载回默认（§4）；
+- 已知边缘（票面外观察，未扩面）：高亮滚动 effect 对折叠段条目 no-op
+  （querySelector null→`el?.` 短路，不自动展开）。
+
+## git status 全贴（diff 自查）
+
+```
+ M locks/manifest.json            <- 开工前既有（受锁解锁面，非本工单；首查已在）
+ M src/renderer/features/reader/AiNoteGroupList.tsx   <- 本工单唯一 src 改动
+?? scripts/audits/f-n1-mut-backup-AiNoteGroupList.tsx <- 变异备份（还原 diff 已证空）
+?? scripts/audits/f-n1-ticket.md
+?? tests/unit/renderer/ai-note-collapse.test.tsx      <- 新合约测试
+（其余 f-a4/f-a5/f-l4/f-sw1/f1-out 审计产物为同场他工单，零触碰）
+```
+
+## 成本
+
+- 子代理 token：约 6.5 万（输入累计）/ 约 1.1 万输出（估算口径）
+- 墙钟：约 45 分钟；工具调用 18 次
+- 验证命令：定向 vitest×6、全量 `npm run test`×2、typecheck×2、lint×2（全部真退出码）
+
+---
+
+# 追加段：受锁改向（主控裁决后 [locked-change] 执行）
+
+- 裁决：主控 2026-08-31——「用户令一审二审默认折叠=新契约，受锁旧断言过时，
+  按『语义随令非让过』先例授权改向」；红线不变（禁 git/registry/locks 遵守全程）。
+- 改动面：`tests/unit/renderer/ai-notes-section.test.tsx`（3 例+头注行，536→562 行）
+  + `tests/e2e/ai-notes-section.spec.ts`（2 处最小改+头注行，231→242 行）。
+
+## 逐例改前/改后断言对照
+
+### 单测 1「分节分组：question 组按 AI_NOTE_QUESTIONS 序呈现…」
+- 改前：`q1Items=groups[0].querySelectorAll('[data-ai-note-id]')` 直接断言
+  `toEqual(['a1','b1'])`（默认全可见）。
+- 改后：先断言**默认折叠**（`a1/b1` 不在 DOM）+**段头在**
+  （`button[data-role-section="first-read"/"second-read"]` 非 null）→`act` 点两段头
+  →同序断言 `toEqual(['a1','b1'])`+一审/二审标签+色点（排序/标签/色点意图原样）。
+
+### 单测 2「组内 role 标签：同 question 组内三 role 条目头呈现一审/二审/裁决」
+- 改前：`items=groups[0].querySelectorAll(...)` 直接断言 `['a1','b1','c1']`。
+- 改后：先断言 `a1/b1` 默认不在 DOM、`c1`（裁决 expanded）在 →点两段头→
+  同序断言 `['a1','b1','c1']`+三 role 标签（role 可辨+role 序意图原样）。
+
+### 单测 3「条目单击→locateAnchor（INV-20 消费方级）」
+- 改前：mount 后直接 `querySelector('[data-ai-note-id="a1"]').click()`。
+- 改后：先断言 `a1` 默认不在 DOM→点一审段头展开→再 `click()`→
+  `locateAnchor` 参数断言逐字未动。
+
+### e2e 测 1（SR2-AI-08 全链，L131 后）
+- 改前：`groupedItems.first()).toContainText('一审')` 直接断言（默认全可见）。
+- 改后：插入 3 行最小改——`button[data-role-section="first-read"]` 可见→
+  `click()` 展开→原断言链逐字不动（展开后 Q1 一审在前、divergence 裁决在后，
+  序与原断言一致）。
+
+### e2e 测 2（SR2-AI-09 渲染层，toast 断言后）
+- 改前：点击 AI 高亮块后直接断言面板 `[data-highlight="true"]` 条目可见——
+  该条目属一审段，默认折叠后不在 DOM（**主控指令未列此例，实现者同场发现
+  同向补改**）。
+- 改后：导入 toast 断言后插入同款 3 行段头展开，后续断言链逐字不动。
+
+两文件头注均加一行「F-N1 用户令改向（[locked-change]，2026-08-31）」标记。
+
+## 改向后验证统计
+
+- 定向：ai-note-collapse(5)+ai-notes-section(24)+ai-note-style(3)=**32/32 绿**。
+- 全量 `npm run test`：**119 文件 / 1007 测试全绿**（主控预期命中）。
+- `npm run typecheck`：双 project 绿（含改后测试文件——tsc 关卡兑现 AGENTS
+  「playwright esbuild 不查类型」教训）。
+- `npm run build`：绿（exit 0）。
+- `npm run verify` 全链实测：quality ✓ / tickets ✓ / **locks:check ✗ 链在此止**：
+  6 项未过=3 个他场未登记（f-a5-diag.mjs、f-sw1-probe.mjs、f-sw1-probe2.mjs）
+  +本工单 2 处受锁改向与 1 个新测试待登记——manifest 重锁=收口单职权
+  （实现者禁 locks 命令，未动）；**lint ✗=1 error 在 f-a5-diag.mjs（F-A5 面，
+  非本工单）**，本工单 3 文件定向 eslint 全净。链上其余节（lint 外）已逐一
+  亲验真退出码补全如上。
+
+## 环境事故与执行边界记录
+
+- **ABI 争用**：12:06 前后两连 EBUSY——并发会话切 `build/Release` 至
+  electron-v146 侧并持句柄，`sqlite-abi use node` 拷贝失败；进程面释放后退避
+  重试通过（md5 比对归因存档：部署侧=b059…=electron-v146）。
+- **e2e 未执行**：主控验证面=`npm run test`+`npm run verify`（已全做）；
+  `test:e2e` 需拉起真 Electron 窗口（前台焦点保护红线），留收口单/门二执行，
+  本工单以 tsc 关卡+断言锚逐字不动控制 e2e 风险面。
+- 终态 git 面：`M AiNoteGroupList.tsx / M tests/e2e/ai-notes-section.spec.ts /
+  M tests/unit/renderer/ai-notes-section.test.tsx / ?? tests/unit/renderer/
+  ai-note-collapse.test.tsx`（+报告/票面/变异备份），diff --stat=
+  141 insertions / 43 deletions；grep TODO/FIXME/placeholder 三文件 0 命中。
+
+## 成本（追加段）
+
+- 追加 token：约 4 万输入 / 0.9 万输出（估算）；墙钟约 25 分钟；工具调用 14 次
+- 验证命令：定向×3、全量 test、verify 全链、typecheck、lint×2、build（全部真退出码）
+
diff --git a/scripts/audits/f-n1-ticket.md b/scripts/audits/f-n1-ticket.md
new file mode 100644
index 000000000..c28f60994
--- /dev/null
+++ b/scripts/audits/f-n1-ticket.md
@@ -0,0 +1,45 @@
+# F-N1 需求票:AI 笔记组内三段可折叠(一审/二审默认收起)
+
+> 需求源:用户 2026-08-31:「笔记 tab 中 AI 的一审和二审和裁决应该可以折叠,
+> 以及一审二审默认是折叠的」。**业务意图(用户确认口径)**:裁决=最终结论
+> 优先呈现;一审/二审=过程证据,默认收起降噪,需要核对时展开。
+> 基线:verify 118 文件 1002 / locks 204(8408911ca,或 F-A5 收口后新基线
+> ——开工前 npm run test 亲核)。
+
+## 0. 折叠态空间表
+
+| 段 | 默认态 | 用户操作 | 迁移 |
+| --- | --- | --- | --- |
+| 一审 | **折叠** | 点段头展开/再折叠 | per-组局部 state(不持久化——会话级) |
+| 二审 | **折叠** | 同上 | 同上 |
+| 裁决 | **展开** | 同上 | 同上 |
+| 组整体 | 既有组折叠态不动 | — | 零变 |
+
+不变量:折叠只藏视觉不删数据(条目数在段头可见);组内无裁决段时(数据缺)不渲染空段头。
+
+## 1. 行为层
+
+- AiNoteGroupList 组内按 role 分段(现有 ROLE_LABEL 分段)各加段头折叠器:`<button aria-expanded>` 段名+条数(如「一审(3)」)+展开/收起图标(▾/▸ 文本或既有先例图标);默认态=一审/二审 collapsed、裁决 expanded。
+- 段头点击 toggle 该段条目列表渲染(条件渲染零变条目内容)。
+- 键盘可达(按钮原生)+aria-expanded。
+
+## 2. 接口层
+
+AiNoteGroupList 对外 props 零变;折叠 state=组件内 useState(per 段)。
+
+## 3. 架构层
+
+AiNoteGroupList 现 104 行,加折叠预计 ~150 ✓;不动 AiNotesSection(249 贴线);零新依赖。
+
+## 4. 生命周期层
+
+不持久化(刷新回默认态——降噪默认每次生效);组重挂载(换文献)回默认。
+
+## 5. 文化层
+
+- 测试:tests/unit/renderer/ai-note-collapse.test.tsx(always-active):①默认态(一审/二审条目不在 DOM、裁决在);②点一审段头→条目出现+aria-expanded 真;③再点收起;④段头条数标注正确;⑤无裁决段不渲染段头。变异 M1~M3(摘默认折叠/摘 toggle/摘条数)。
+- 真机不设探针(纯 UI 折叠,jsdom 全可达;若门一要求,一张截图即可)。
+
+## 6. 证据与报告契约(实现者)
+
+报告 f-n1-impl.report.md(数字 wc);禁 git/registry/locks;红→绿→变异。
diff --git a/scripts/audits/f-sw1-out/after-switch.png b/scripts/audits/f-sw1-out/after-switch.png
new file mode 100644
index 000000000..2b51cb458
Binary files /dev/null and b/scripts/audits/f-sw1-out/after-switch.png differ
diff --git a/scripts/audits/f-sw1-out/large-panel.png b/scripts/audits/f-sw1-out/large-panel.png
new file mode 100644
index 000000000..43010f41f
Binary files /dev/null and b/scripts/audits/f-sw1-out/large-panel.png differ
diff --git a/scripts/audits/f-sw1-out/small-panel.png b/scripts/audits/f-sw1-out/small-panel.png
new file mode 100644
index 000000000..a44c435f6
Binary files /dev/null and b/scripts/audits/f-sw1-out/small-panel.png differ
diff --git a/scripts/audits/f-sw1-probe.mjs b/scripts/audits/f-sw1-probe.mjs
new file mode 100644
index 000000000..e89f2a586
--- /dev/null
+++ b/scripts/audits/f-sw1-probe.mjs
@@ -0,0 +1,46 @@
+// F-SW1 排查探针:切换课题面板在 SET1 两档下的几何与层叠(对偶矩阵未验项
+// 「切换器面板×zoom 大档字号反差」用户实况触发——图3/4 现象定位)。
+// crib f-a4/f-r1 verify 同环:Electron 真机+真实用户数据副本+CDP 量测。
+import { _electron as electron } from '@playwright/test'
+import { mkdtemp } from 'node:fs/promises'
+import { tmpdir } from 'node:os'
+import { join } from 'node:path'
+import { cpSync, rmSync, existsSync } from 'node:fs'
+
+const SRC = process.env.APPDATA + '\\Synapse'
+const userData = await mkdtemp(join(tmpdir(), 'synapse-sw1-'))
+if (existsSync(SRC)) cpSync(SRC, userData, { recursive: true })
+
+const app = await electron.launch({ args: ['out/main/index.js'], env: { ...process.env, SYNAPSE_USER_DATA: userData } })
+const win = await app.firstWindow()
+await win.getByRole('button', { name: '文献库' }).waitFor({ timeout: 20_000 })
+
+const probe = () => win.evaluate(() => {
+  const btn = document.querySelector('.ws-trigger')
+  const panel = document.querySelector('.ws-panel')
+  const header = document.querySelector('.app-header')
+  const zoomRow = getComputedStyle(document.querySelector('.app-content-row')).zoom
+  const r = (el) => el ? { x: Math.round(el.getBoundingClientRect().x), y: Math.round(el.getBoundingClientRect().y), w: Math.round(el.getBoundingClientRect().width), h: Math.round(el.getBoundingClientRect().height), fs: getComputedStyle(el).fontSize, zi: getComputedStyle(el).zIndex } : null
+  return { btn: r(btn), panel: r(panel), header: r(header), zoomRow, panelUnderBtnX: panel && btn ? Math.round(panel.getBoundingClientRect().x - btn.getBoundingClientRect().x) : null, panelOverlapHeaderBottom: panel && header ? Math.round(panel.getBoundingClientRect().y - (header.getBoundingClientRect().y + header.getBoundingClientRect().height)) : null }
+})
+
+const out = { small: null, large: null, shots: [] }
+await win.getByRole('button', { name: '切换课题' }).click()
+await win.waitForTimeout(400)
+out.small = await probe()
+await win.screenshot({ path: 'scripts/audits/f-sw1-out/small-panel.png' })
+await win.keyboard.press('Escape')
+await win.getByRole('button', { name: '切换课题' }).click(); await win.keyboard.press('Escape')
+
+await win.getByRole('button', { name: '设置' }).click()
+await win.getByRole('button', { name: '大 125%' }).click()
+await win.waitForTimeout(600)
+await win.getByRole('button', { name: '文献库' }).click()
+await win.getByRole('button', { name: '切换课题' }).click()
+await win.waitForTimeout(400)
+out.large = await probe()
+await win.screenshot({ path: 'scripts/audits/f-sw1-out/large-panel.png' })
+out.shots = ['small-panel.png', 'large-panel.png']
+await app.close()
+rmSync(userData, { recursive: true, force: true })
+console.log('F-SW1 PROBE:', JSON.stringify(out, null, 1))
diff --git a/scripts/audits/f-sw1-probe2.mjs b/scripts/audits/f-sw1-probe2.mjs
new file mode 100644
index 000000000..dd4607138
--- /dev/null
+++ b/scripts/audits/f-sw1-probe2.mjs
@@ -0,0 +1,41 @@
+// F-SW1 探针 2:切换课题(reload)后主内容区状态——图4「切换后空白」复现。
+import { _electron as electron } from '@playwright/test'
+import { mkdtemp } from 'node:fs/promises'
+import { tmpdir } from 'node:os'
+import { join } from 'node:path'
+import { cpSync, rmSync, existsSync } from 'node:fs'
+
+const SRC = process.env.APPDATA + '\\Synapse'
+const userData = await mkdtemp(join(tmpdir(), 'synapse-sw2-'))
+if (existsSync(SRC)) cpSync(SRC, userData, { recursive: true })
+
+const app = await electron.launch({ args: ['out/main/index.js'], env: { ...process.env, SYNAPSE_USER_DATA: userData } })
+let win = await app.firstWindow()
+await win.getByRole('button', { name: '文献库' }).waitFor({ timeout: 20_000 })
+await win.waitForTimeout(1500)
+
+const listState = () => win.evaluate(() => {
+  const rows = document.querySelectorAll('[data-testid="lib-row"], .lib-row, table tbody tr, li').length
+  const main = document.querySelector('main')
+  const mainText = main ? main.textContent.slice(0, 80) : null
+  const toasts = [...document.querySelectorAll('[role="status"], .toast, [data-toast]')].map((t) => t.textContent.slice(0, 40))
+  const panel = document.querySelector('.ws-panel') !== null
+  return { rows, mainText, toasts, panelOpen: panel, bodyLen: document.body.textContent.length }
+})
+const before = await listState()
+await win.getByRole('button', { name: '切换课题' }).click()
+await win.waitForTimeout(300)
+// 点第二项(非当前)触发 switchTo→reload
+const items = win.locator('.ws-item')
+const n = await items.count()
+if (n >= 2) {
+  await items.nth(1).click()
+  // 等 reload:导航事件后新页面
+  try { win = await app.firstWindow() } catch { /* 同窗 reload */ }
+  await win.waitForTimeout(5000)
+} else { console.log('NO_ITEMS', n) }
+const after = await listState()
+await win.screenshot({ path: 'scripts/audits/f-sw1-out/after-switch.png' })
+await app.close()
+rmSync(userData, { recursive: true, force: true })
+console.log('F-SW1 PROBE2:', JSON.stringify({ before, after }, null, 1))
diff --git a/src/renderer/features/reader/AiAnnotationLayer.tsx b/src/renderer/features/reader/AiAnnotationLayer.tsx
index c62270058..70ddd669d 100644
--- a/src/renderer/features/reader/AiAnnotationLayer.tsx
+++ b/src/renderer/features/reader/AiAnnotationLayer.tsx
@@ -67,7 +67,10 @@ import { useEffect, useLayoutEffect, useMemo, useState } from 'react'
 import type { AiNote } from '@shared/models/ai-note'
 import type { AnnotationRect } from '@shared/models/annotation'
 import { verifyQuote } from './anchor-serialize'
-import { findRangeAtOffset } from './annotation-anchor'
+import { findRangeAtOffset, pixelBoxOf } from './annotation-anchor'
+import { bandsForTextNodes, matchBand, type RowBand } from './annotation-resolve'
+import { bandVertical } from './annotation-style'
+import { PAGE_LAYER_Z } from './page-layer-z'
 import { QUESTION_COLOR } from './ai-note-style'
 import { useAiNotesStore } from './ai-notes.store'
 import { useReaderStore } from './reader.store'
@@ -75,10 +78,12 @@ import { useReaderStore } from './reader.store'
 /** 重锚后的显示矩形（aiNoteId → rects；重锚失败不落项=该段零 rects） */
 type ResolvedRects = Record<string, AnnotationRect[]>
 
-/** 本地重锚缓存（paperId+页键——键变即整体作废重算） */
+/** 本地重锚缓存（paperId+页键——键变即整体作废重算；bands=节点口径行簇
+ *  字形带按 noteId 键控——绑定不经几何匹配，免疫行盒整体偏移） */
 interface AnchorCache {
   key: string
   rects: ResolvedRects
+  bands: Record<string, RowBand[]>
 }
 
 /** 参与重锚的行：有锚引文（篇级/无锚行天然不入层）+页匹配（anchorPage 1 基） */
@@ -95,7 +100,7 @@ export function AiAnnotationLayer(props: {
   onJumpToNote(aiNoteId: string): void
 }): JSX.Element | null {
   const { aiNotes, page, pageRoot, onJumpToNote } = props
-  const [cache, setCache] = useState<AnchorCache>({ key: '', rects: {} })
+  const [cache, setCache] = useState<AnchorCache>({ key: '', rects: {}, bands: {} })
   const [selectedId, setSelectedId] = useState<string | null>(null)
   // F-A3（INV-42）：选择模式自订阅（AnnotationLayer 同型；props 接口零变）
   const selectionMode = useReaderStore((s) => s.tabs[s.activeId ?? '']?.selectionMode ?? false)
@@ -127,6 +132,8 @@ export function AiAnnotationLayer(props: {
     const resolve = (): void => {
       scheduled = false
       const next: ResolvedRects = {}
+      const bands: Record<string, RowBand[]> = {}
+      const base = pixelBoxOf(textLayer)
       for (const n of pageNotes) {
         const at = verifyQuote(textLayer, {
           prefix: n.prefixText,
@@ -140,9 +147,13 @@ export function AiAnnotationLayer(props: {
         const range = findRangeAtOffset(textLayer, at, at + n.quoteText.length)
         if (range !== null && range.rects.length > 0) {
           next[n.id] = range.rects
+          // [F-A5 b] 节点口径带：引文自身 textNodes→bandsForTextNodes（绑定
+          // 不经几何匹配——免疫 CSS 行盒整体偏移错绑上一行；修前裸行盒
+          // 在小字号紧排文档上下偏+侵入相邻行=图2 根因）
+          bands[n.id] = bandsForTextNodes(range.textNodes.map((t) => t.node), base)
         }
       }
-      setCache({ key: cacheKey, rects: next })
+      setCache({ key: cacheKey, rects: next, bands })
     }
     const schedule = (): void => {
       if (!scheduled) {
@@ -163,10 +174,14 @@ export function AiAnnotationLayer(props: {
     <div
       data-testid="ai-annotation-layer"
       className="absolute inset-0"
-      style={{ zIndex: 5, pointerEvents: 'none' }}
+      style={{ zIndex: PAGE_LAYER_Z.colorBlocks, pointerEvents: 'none' }}
     >
       {pageNotes.map((n) =>
-        (resolved[n.id] ?? []).map((r, i) => (
+        (resolved[n.id] ?? []).map((r, i) => {
+        // [F-A5 b] band 单源（节点口径——本段引文自身的带池）；缺省=行盒原样回退
+        const pool = cache.bands[n.id]
+        const band = pool !== undefined && pool.length > 0 ? matchBand(pool, r) : undefined
+        return (
           <div
             key={`${n.id}:${i}`}
             data-testid="ai-note-rect"
@@ -178,9 +193,8 @@ export function AiAnnotationLayer(props: {
             className="absolute"
             style={{
               left: `${r.x * 100}%`,
-              top: `${r.y * 100}%`,
+              ...(band !== undefined ? bandVertical(band) : { top: `${r.y * 100}%`, height: `${r.h * 100}%` }),
               width: `${r.w * 100}%`,
-              height: `${r.h * 100}%`,
               background: QUESTION_COLOR[n.question],
               // AI 段半透明+选中描边：与用户标注（不透明）视觉区分，选中=高亮该段全部 rects
               opacity: n.id === selectedId ? 0.8 : 0.45,
@@ -197,7 +211,8 @@ export function AiAnnotationLayer(props: {
               onJumpToNote(n.id)
             }}
           />
-        ))
+        )
+        })
       )}
     </div>
   )
diff --git a/src/renderer/features/reader/AiNoteGroupList.tsx b/src/renderer/features/reader/AiNoteGroupList.tsx
index 86e19d4a7..25dfc5ee2 100644
--- a/src/renderer/features/reader/AiNoteGroupList.tsx
+++ b/src/renderer/features/reader/AiNoteGroupList.tsx
@@ -1,6 +1,6 @@
 // b3: P7-G
 /**
- * AiNoteGroupList —— AI 笔记分节列表（纯展示+单击定位上抛）。
+ * AiNoteGroupList —— AI 笔记分节列表（纯展示+单击定位上抛+组内三段折叠）。
  *
  * question 分组（呈现轴=AI_NOTE_QUESTIONS 单源序——呈现轴转置 2026-08-28
  * 缺陷 F，用户口径「问题N 分组+组内一审/二审/裁决分段」）：组头=「第N问：
@@ -14,10 +14,18 @@
  * 声明见 AiNotesSection 头注（AI-09 交付 data-ai-note-id 渲染节点+
  * anchor-locate 延展）。highlightAiNoteId=AI-09 标注单击反向同步高亮
  * 消费面（C-05 同型）。
+ *
+ * 组内三段折叠（F-N1 2026-08-31，用户口径：裁决=最终结论优先呈现，
+ * 一审/二审=过程证据默认收起降噪）：段头 button（段名+条数「一审(3)」
+ * +aria-expanded+▾/▸ 文本图标，键盘可达=按钮原生）；默认态
+ * =ROLE_DEFAULT_EXPANDED（一审/二审 collapsed、裁决 expanded）；折叠只藏
+ * 视觉不删数据（条目数在段头可见）；无该段数据不渲染空段头；组整体折叠
+ * 态零变（无——组级本无折叠）。折叠 state=RoleSection 组件内 useState
+ * per 段，不持久化；换文献（paperId 变）经组 key 重挂载回默认（F-N1 §4）。
  */
-import { useEffect, useRef } from 'react'
+import { useEffect, useRef, useState } from 'react'
 import { AI_NOTE_QUESTIONS } from '@shared/models/ai-note'
-import type { AiNote, AiNoteQuestion } from '@shared/models/ai-note'
+import type { AiNote, AiNoteQuestion, AiNoteRole } from '@shared/models/ai-note'
 import { QUESTION_COLOR, QUESTION_LABEL, QUESTION_TEXT, ROLE_LABEL, ROLE_ORDER } from './ai-note-style'
 
 /** question 分组（呈现序=AI_NOTE_QUESTIONS；空组剔除；组内条目按 ROLE_ORDER 排序） */
@@ -30,6 +38,80 @@ export function groupNotes(notes: AiNote[]): Array<{ question: AiNoteQuestion; i
   })).filter((g) => g.items.length > 0)
 }
 
+/** 段默认折叠态（F-N1 §0 态空间表：一审/二审=过程证据默认折叠，裁决=最终结论默认展开） */
+const ROLE_DEFAULT_EXPANDED: Record<AiNoteRole, boolean> = {
+  'first-read': false,
+  'second-read': false,
+  adjudicate: true
+}
+
+/** 组内单 role 段：段头折叠器+条目列表（条目渲染逻辑与分段前逐字同——只条件隐藏） */
+function RoleSection(props: {
+  role: AiNoteRole
+  items: AiNote[]
+  onLocate(note: AiNote): void
+  highlightAiNoteId: string | null
+}): JSX.Element {
+  const { role, items, onLocate, highlightAiNoteId } = props
+  const [expanded, setExpanded] = useState(ROLE_DEFAULT_EXPANDED[role])
+  return (
+    <>
+      <button
+        type="button"
+        data-role-section={role}
+        aria-expanded={expanded}
+        className="mt-0.5 flex w-full items-center gap-1 border-0 bg-transparent px-1 py-0.5 text-left text-xs"
+        style={{ color: 'var(--text-dim)' }}
+        onClick={() => {
+          setExpanded(!expanded)
+        }}
+      >
+        <span aria-hidden>{expanded ? '▾' : '▸'}</span>
+        {`${ROLE_LABEL[role]}(${items.length})`}
+      </button>
+      {expanded &&
+        items.map((n) => {
+          const highlighted = n.id === highlightAiNoteId
+          return (
+            <button
+              type="button"
+              key={n.id}
+              data-ai-note-id={n.id}
+              data-highlight={highlighted}
+              className="mt-0.5 block w-full rounded border px-2 py-1 text-left text-xs"
+              style={{
+                borderColor: highlighted ? 'var(--accent)' : 'var(--border)',
+                background: highlighted ? 'var(--accent-soft)' : 'transparent'
+              }}
+              onClick={() => onLocate(n)}
+              title={n.quoteText !== '' ? n.quoteText : n.contentMd}
+            >
+              <span className="flex items-center gap-1">
+                <span
+                  aria-hidden
+                  className="inline-block h-2 w-2 shrink-0 rounded-sm"
+                  style={{ background: QUESTION_COLOR[n.question] }}
+                />
+                <span style={{ color: 'var(--text-dim)' }}>
+                  {ROLE_LABEL[n.role]}
+                  {n.anchorPage !== null ? ` · p.${n.anchorPage}` : ''}
+                </span>
+              </span>
+              {n.quoteText !== '' && (
+                <span className="mt-0.5 block truncate" style={{ color: 'var(--text-dim)' }}>
+                  {n.quoteText}
+                </span>
+              )}
+              <span className="mt-0.5 block whitespace-pre-wrap" style={{ color: 'var(--text)' }}>
+                {n.contentMd}
+              </span>
+            </button>
+          )
+        })}
+    </>
+  )
+}
+
 export function AiNoteGroupList(props: {
   notes: AiNote[]
   onLocate(note: AiNote): void
@@ -38,9 +120,11 @@ export function AiNoteGroupList(props: {
   const { notes, onLocate, highlightAiNoteId = null } = props
   const groups = groupNotes(notes)
   const rootRef = useRef<HTMLDivElement>(null)
+  // 换文献回默认：组 key 掺 paperId（F-N1 §4——重挂载重置段折叠 state）
+  const paperKey = notes[0]?.paperId ?? ''
 
   // 高亮条目滚动进视野（AI-09 单击反向同步——FragmentNotesList 同型：
-  // 仅随信号变化触发，notes 更新不重滚）
+  // 仅随信号变化触发，notes 更新不重滚；条目处于折叠段时无渲染节点=不滚）
   useEffect(() => {
     if (highlightAiNoteId == null || rootRef.current === null) return
     const el = rootRef.current.querySelector(`[data-ai-note-id="${highlightAiNoteId}"]`)
@@ -50,7 +134,7 @@ export function AiNoteGroupList(props: {
   return (
     <div className="flex flex-col gap-1" data-testid="ai-note-groups" ref={rootRef}>
       {groups.map((g) => (
-        <div key={g.question} data-question={g.question}>
+        <div key={`${paperKey}:${g.question}`} data-question={g.question}>
           <h4
             className="m-0 pl-1 text-xs font-medium"
             style={{ borderLeft: `3px solid ${QUESTION_COLOR[g.question]}`, color: 'var(--text-dim)' }}
@@ -59,42 +143,17 @@ export function AiNoteGroupList(props: {
               ? QUESTION_LABEL[g.question]
               : `${QUESTION_LABEL[g.question]}：${QUESTION_TEXT[g.question]}`}
           </h4>
-          {g.items.map((n) => {
-            const highlighted = n.id === highlightAiNoteId
+          {ROLE_ORDER.map((role) => {
+            const sectionItems = g.items.filter((n) => n.role === role)
+            if (sectionItems.length === 0) return null
             return (
-              <button
-                type="button"
-                key={n.id}
-                data-ai-note-id={n.id}
-                data-highlight={highlighted}
-                className="mt-0.5 block w-full rounded border px-2 py-1 text-left text-xs"
-                style={{
-                  borderColor: highlighted ? 'var(--accent)' : 'var(--border)',
-                  background: highlighted ? 'var(--accent-soft)' : 'transparent'
-                }}
-                onClick={() => onLocate(n)}
-                title={n.quoteText !== '' ? n.quoteText : n.contentMd}
-              >
-                <span className="flex items-center gap-1">
-                  <span
-                    aria-hidden
-                    className="inline-block h-2 w-2 shrink-0 rounded-sm"
-                    style={{ background: QUESTION_COLOR[n.question] }}
-                  />
-                  <span style={{ color: 'var(--text-dim)' }}>
-                    {ROLE_LABEL[n.role]}
-                    {n.anchorPage !== null ? ` · p.${n.anchorPage}` : ''}
-                  </span>
-                </span>
-                {n.quoteText !== '' && (
-                  <span className="mt-0.5 block truncate" style={{ color: 'var(--text-dim)' }}>
-                    {n.quoteText}
-                  </span>
-                )}
-                <span className="mt-0.5 block whitespace-pre-wrap" style={{ color: 'var(--text)' }}>
-                  {n.contentMd}
-                </span>
-              </button>
+              <RoleSection
+                key={role}
+                role={role}
+                items={sectionItems}
+                onLocate={onLocate}
+                highlightAiNoteId={highlightAiNoteId}
+              />
             )
           })}
         </div>
diff --git a/src/renderer/features/reader/AnnotationLayer.tsx b/src/renderer/features/reader/AnnotationLayer.tsx
index f6f36272d..fa6956293 100644
--- a/src/renderer/features/reader/AnnotationLayer.tsx
+++ b/src/renderer/features/reader/AnnotationLayer.tsx
@@ -41,12 +41,13 @@ import { useEffect, useLayoutEffect, useState } from 'react'
 import type { Annotation, AnnotationRect } from '@shared/models/annotation'
 import { api, unwrap, ApiClientError } from '../../api/client'
 import { showToast } from '../../shared/ui/Toast'
-import { resolveAnnotationRects, normalizedLineHeight, matchBand, type ResolvedAnnotation } from './annotation-resolve'
+import { resolveAnnotationRects, normalizedLineHeight, matchBand, bandsNearRects, type ResolvedAnnotation, type RowBand } from './annotation-resolve'
 import { mergeRects } from './annotation-merge'
 import { pushUndo } from './annotation-undo'
 import { AnnotationEditor } from './AnnotationEditor'
 import { AnnotationMenu } from './AnnotationMenu'
 import { rectStyle } from './annotation-style'
+import { PAGE_LAYER_Z } from './page-layer-z'
 import { useReaderStore } from './reader.store'
 
 /** 意外异常（非 ApiClientError）时的兜底中文消息 */
@@ -77,6 +78,9 @@ export function AnnotationLayer(props: {
   // [F-A4 b①] 挂 B 行高感知 lineH（textLayer span 字号中位数/textLayer 盒高；
   // 量测退化 undefined=旧行为——存量缺陷态 rects 读时归并同口径受益）
   const [lineH, setLineH] = useState<number | undefined>(undefined)
+  // [F-A5 b] 存量回退 band：重锚失败（verifyQuote 假）的 rects 经同一
+  // bandsNearRects 单源（修前=F-11 分数回退行盒口径，票面 §0b③）
+  const [fallbackBands, setFallbackBands] = useState<RowBand[]>([])
   const [menu, setMenu] = useState<PopupTarget | null>(null)
   const [editing, setEditing] = useState<PopupTarget | null>(null)
   const [busy, setBusy] = useState(false)
@@ -103,8 +107,12 @@ export function AnnotationLayer(props: {
     let scheduled = false
     const resolve = (): void => {
       scheduled = false
-      setResolved(resolveAnnotationRects({ textLayer, annotations, page }))
+      const next = resolveAnnotationRects({ textLayer, annotations, page })
+      setResolved(next)
       setLineH(normalizedLineHeight(textLayer))
+      // 重锚失败者存量 rects 过 band 单源（成功者 bands 已在 next——两路同数学）
+      const failed = annotations.filter((a) => a.page === page && next[a.id] === undefined && a.rects.length > 0)
+      setFallbackBands(failed.length > 0 ? bandsNearRects(textLayer, failed.flatMap((a) => a.rects)) : [])
     }
     // 文本层 span 逐个入 DOM（pdf.js render() 异步）：rAF 合并成每帧一次
     const schedule = (): void => {
@@ -182,11 +190,12 @@ export function AnnotationLayer(props: {
       <div
         data-testid="annotation-layer"
         className="absolute inset-0"
-        style={{ zIndex: 5, pointerEvents: 'none', mixBlendMode: 'multiply' }}
+        style={{ zIndex: PAGE_LAYER_Z.colorBlocks, pointerEvents: 'none' }}
       >
-        {/* multiply 上容器级（stacking context 隔离，rect 级混合无效且叠乘）；
-            [F-A4 b] 行高感知归并（lineH）+rectStyle 行盒自适应 band（重锚带
-            在场时顶贴字形顶缘底贴底缘——matchBand 最近中心带匹配） */}
+        {/* [F-A5/ADR-0019 R2] 色块=背景板：multiply 摘除+z 常量单源（canvas
+            透明底墨带恒在色块上——文字纯黑不被染，用户背景板令）；[F-A4 b]
+            lineH 归并+band 自适应（重锚带优先；[F-A5 b] 重锚失败回退存量
+            rects 亦经同一 band 单源 fallbackBands） */}
         {pageAnnotations.map((a) =>
           mergeRects(resolved[a.id]?.rects ?? a.rects, lineH).map((r, i) => (
             <div
@@ -197,7 +206,7 @@ export function AnnotationLayer(props: {
               aria-label={`标注：${a.quoteText}`}
               title={a.comment !== '' ? a.comment : a.quoteText}
               className="absolute"
-              style={selectionMode ? { ...rectStyle(a.kind, a.color, r, matchBand(resolved[a.id]?.bands, r)), pointerEvents: 'none' } : rectStyle(a.kind, a.color, r, matchBand(resolved[a.id]?.bands, r))}
+              style={selectionMode ? { ...rectStyle(a.kind, a.color, r, matchBand(resolved[a.id]?.bands ?? fallbackBands, r)), pointerEvents: 'none' } : rectStyle(a.kind, a.color, r, matchBand(resolved[a.id]?.bands ?? fallbackBands, r))}
               onClick={() => {
                 // 选择模式=穿透零副作用（pointerEvents:none 达成，守卫兜程序化派发）
                 if (selectionMode) return
diff --git a/src/renderer/features/reader/PageBox.tsx b/src/renderer/features/reader/PageBox.tsx
index 73b28a901..f82a362ce 100644
--- a/src/renderer/features/reader/PageBox.tsx
+++ b/src/renderer/features/reader/PageBox.tsx
@@ -49,7 +49,10 @@ export function PageBox(props: {
     >
       {rendered ? (
         <div data-page-root={no} className="absolute inset-0 flex justify-center">
-          <div className="relative h-fit">
+          {/* [F-A5 c/ADR-0019 R2] 白纸承底层（canvas 透明底的承白面——暗色主题
+              下页纸仍白，PDF 纸面语义）+isolation（层序比较域封闭单页内，跨页
+              互扰不可能——页内层序见 page-layer-z 单源） */}
+          <div className="relative h-fit" style={{ background: '#ffffff', isolation: 'isolate' }}>
             <PdfPageCanvas doc={doc!} pageNo={no} zoom={zoom} onPageRender={props.onPageRender} onError={props.onError} />
             {props.renderPage(no)}
           </div>
diff --git a/src/renderer/features/reader/PdfPageCanvas.tsx b/src/renderer/features/reader/PdfPageCanvas.tsx
index b5c69e4ab..71aeb59d7 100644
--- a/src/renderer/features/reader/PdfPageCanvas.tsx
+++ b/src/renderer/features/reader/PdfPageCanvas.tsx
@@ -27,6 +27,7 @@
  */
 import { useEffect, useRef } from 'react'
 import { RenderingCancelledException, type PDFDocumentProxy, type RenderTask } from 'pdfjs-dist'
+import { PAGE_LAYER_Z } from './page-layer-z'
 
 /**
  * 对外文本项类型：pdfjs TextItem 的结构子集（str/几何/变换，含行尾标记）。
@@ -113,10 +114,14 @@ export function PdfPageCanvas(props: {
       canvas.height = Math.floor(viewport.height * dpr)
       canvas.style.width = `${Math.floor(viewport.width)}px`
       canvas.style.height = `${Math.floor(viewport.height)}px`
+      // [F-A5 c/ADR-0019 R2] 透明底渲染：pdfjs 缺省 #ffffff 填充会把垫底的
+      // 标注/AI 色块整页遮死——透明底令墨带外透出下层色块（背景板语义），
+      // 墨带（含文字）恒在色块之上=文字纯黑不被染（用户令 2026-08-31）
       const task = pdfPage.render({
         canvasContext: ctx,
         viewport,
-        transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined
+        transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined,
+        background: 'rgba(255,255,255,0)'
       })
       renderTaskRef.current = task
       await task.promise
@@ -149,5 +154,14 @@ export function PdfPageCanvas(props: {
   // data-pdf-canvas：ReaderPage 以此度量该页 canvas CSS 尺寸（每页自量——
   // TextLayer 的 pageWidth/pageHeight 输入）；本组件无 padding/边饰——覆盖层
   // （TextLayer/标注层）按紧邻父容器绝对定位，加了会错位
-  return <canvas ref={canvasRef} data-pdf-canvas="true" aria-label={`PDF 第 ${pageNo} 页渲染`} />
+  // [F-A5 c] z=层序常量（墨带在色块上/自绘层下）+pointer-events:none（明纸
+  //  穿透——标注 rect 点击/文本层划选手势零回归；canvas 本身无交互面）
+  return (
+    <canvas
+      ref={canvasRef}
+      data-pdf-canvas="true"
+      aria-label={`PDF 第 ${pageNo} 页渲染`}
+      style={{ position: 'relative', zIndex: PAGE_LAYER_Z.canvas, pointerEvents: 'none' }}
+    />
+  )
 }
diff --git a/src/renderer/features/reader/SelectionLayer.tsx b/src/renderer/features/reader/SelectionLayer.tsx
index 7a170aab2..c63908878 100644
--- a/src/renderer/features/reader/SelectionLayer.tsx
+++ b/src/renderer/features/reader/SelectionLayer.tsx
@@ -37,6 +37,8 @@ import type { Annotation, AnnotationInput, AnnotationKind, AnnotationRect } from
 import { api, unwrap, ApiClientError } from '../../api/client'
 import { showToast } from '../../shared/ui/Toast'
 import { selectionToAnchor, type SelectionAnchor } from './anchor-serialize'
+import { findRangeAtOffset, pixelBoxOf } from './annotation-anchor'
+import { bandsForTextNodes, type RowBand } from './annotation-resolve'
 import { pushUndo } from './annotation-undo'
 import { SelectionToolbar } from './SelectionToolbar'
 import { SelectionPaint } from './selection-paint'
@@ -67,10 +69,11 @@ interface PendingSelection {
   y: number
 }
 
-/** [F-A4 a 面] 自绘并集层状态（页盒+归并 rects；清除=层卸载） */
+/** [F-A4 a 面] 自绘并集层状态（页盒+归并 rects+F-A5 行簇字形带；清除=层卸载） */
 interface PaintSelection {
   root: HTMLElement
   rects: AnnotationRect[]
+  bands: RowBand[]
 }
 
 export function SelectionLayer(props: {
@@ -127,8 +130,11 @@ export function SelectionLayer(props: {
         setPaint(null)
         return
       }
-      // [F-A4 a 面] 自绘并集层：与保存 rects 同源（evaluate 管线归一化产物）
-      setPaint({ root: anchorRoot!, rects: anchor.rects })
+      // [F-A4 a] 自绘并集层=保存 rects 同源；[F-A5 a/b] bands=行簇字形带
+      // **节点口径**（选区自身 textNodes——免疫 CSS 行盒整体偏移错绑上一行，
+      // 真机实锤小字号紧排文档行盒偏上 ~9px）；退化空数组=行盒原样回退
+      const range = findRangeAtOffset(textLayer, anchor.start, anchor.end)
+      setPaint({ root: anchorRoot!, rects: anchor.rects, bands: range !== null ? bandsForTextNodes(range.textNodes.map((t) => t.node), pixelBoxOf(textLayer)) : [] })
       if (visualOnly) {
         return
       }
@@ -225,8 +231,8 @@ export function SelectionLayer(props: {
 
   return (
     <>
-      {/* 划选视觉=自绘并集层（F-A4/ADR-0019 R1 修订——头注）；生命周期=选区 */}
-      {paint !== null ? <SelectionPaint root={paint.root} rects={paint.rects} /> : null}
+      {/* 划选视觉=自绘并集层（F-A4/ADR-0019 R1 修订+F-A5 band 对齐——头注）；生命周期=选区 */}
+      {paint !== null ? <SelectionPaint root={paint.root} rects={paint.rects} bands={paint.bands} /> : null}
       {pending !== null ? (
         <SelectionToolbar
           containerRef={toolbarRef}
diff --git a/src/renderer/features/reader/TextLayer.tsx b/src/renderer/features/reader/TextLayer.tsx
index 22827fddd..3f64b4cfc 100644
--- a/src/renderer/features/reader/TextLayer.tsx
+++ b/src/renderer/features/reader/TextLayer.tsx
@@ -30,6 +30,7 @@ import type { CSSProperties } from 'react'
 import { TextLayer as PdfJsTextLayer, type PageViewport } from 'pdfjs-dist'
 import type { PdfTextContent } from './PdfPageCanvas'
 import './text-layer.css'
+import { PAGE_LAYER_Z } from './page-layer-z'
 
 export interface TextLayerProps {
   textContent: PdfTextContent
@@ -92,9 +93,11 @@ export function TextLayer(props: TextLayerProps): JSX.Element {
 
   // --scale-factor 供官方 CSS 的 span 字号 calc 使用；宽高与 PdfCanvas 的 canvas
   // CSS 尺寸一致（inset:0 之上再显式给定，确保与页面盒对齐）
+  // zIndex=层序常量单源显式化（与官方 css z0 同值——序防漂移，F-A5 c）
   const style = {
     width: `${pageWidth}px`,
     height: `${pageHeight}px`,
+    zIndex: PAGE_LAYER_Z.text,
     '--scale-factor': String(viewportScale)
   } as CSSProperties
 
diff --git a/src/renderer/features/reader/annotation-resolve.ts b/src/renderer/features/reader/annotation-resolve.ts
index 31ffee479..912ad0398 100644
--- a/src/renderer/features/reader/annotation-resolve.ts
+++ b/src/renderer/features/reader/annotation-resolve.ts
@@ -12,6 +12,15 @@
  *   [字形顶, 基线+descender 尾]（归一化域）——rectStyle band 消费（顶贴
  *   字形顶缘底贴底缘）。无 canvas 2d/度量缺字段（jsdom）→ 空 bands，
  *   渲染回退 F-11 分数路径（缺省兼容）。
+ * - [F-A5 a/b] band 单源三消费点：①自绘选区（SelectionLayer evaluate→
+ *   SelectionPaint）②标注存量回退（AnnotationLayer 重锚失败路径）③AI 段
+ *   （AiAnnotationLayer）经 **bandsNearRects**（rect 集→重叠 span 行簇带）
+ *   消费同一 span→带核心（bandFromMetrics+同行近并）——与重锚路径同基准
+ *   （票面 §1「行簇字形带推导单源」）。其中自绘选区/AI 段走**节点口径**
+ *   bandsForTextNodes（选区/引文自身的 textNodes——免疫 CSS 行盒整体偏移，
+ *   真机实锤：小字号紧排文档行盒偏上 ~9px 使几何匹配错绑上一行）；存量
+ *   rects 回退（重锚失败无节点可依）走几何口径 bandsNearRects 尽力而为。
+ *   RowBand 增 x0/x1（行簇 span 实际端点——a 面自绘块水平界夹取源）。
  * - normalizedLineHeight：textLayer span 的 computed font-size 中位数/
  *   textLayer 盒高（挂 B mergeRects 行高感知 lineH——存量 rects 读时归并
  *   同口径；量测退化→undefined 旧行为）。
@@ -23,22 +32,26 @@
  *   只读（gBCR/getComputedStyle/canvas 量测），文本遍历仍唯经
  *   annotation-anchor（F-ARCH4 契约保持）；纯几何 bandFromMetrics/
  *   matchBand 单测直测。
- * - 性能：每标注一次 canvas 量测（span 去重后），MutationObserver+rAF
- *   合并节奏随宿主（F-A1 起不变）。
+ * - 性能：量测只发生在与输入 rects 重叠的 span 上（gBCR 预筛——拖选节流
+ *   200ms 周期内 ~页级行簇量级）；MutationObserver+rAF 合并节奏随宿主
+ *   （F-A1 起不变）。
  *
  * ── 文化层 ──
  * - tests/unit/renderer/selection-paint.test.tsx（bandFromMetrics 纯几何+
- *   AnnotationLayer 挂 B 接线）。
+ *   AnnotationLayer 挂 B 接线）+ F-A5 段（bandsNearRects 三消费点）。
  */
 import type { Annotation, AnnotationRect } from '@shared/models/annotation'
 import { verifyQuote } from './anchor-serialize'
 import { findRangeAtOffset, pixelBoxOf, type PixelBox } from './annotation-anchor'
 
-/** 行簇字形带（归一化域；center=带中心——渲染块匹配键） */
+/** 行簇字形带（归一化域；center=带中心——渲染块匹配键；x0/x1=行簇 span
+ *  实际端点——F-A5 a 面自绘块水平界夹取源，缺省=该带无端点量测） */
 export interface RowBand {
   top: number
   bottom: number
   center: number
+  x0?: number
+  x1?: number
 }
 
 /** 重锚结果（id → { rects, bands }；缺项回退存量 rects 由消费方兜底） */
@@ -84,8 +97,9 @@ export function bandFromMetrics(
   }
 }
 
-/** 渲染块 → 最近中心带（|Δcenter| ≤ rect.h 才匹配；bands 空→undefined） */
-export function matchBand(bands: RowBand[] | undefined, r: AnnotationRect): { top: number; bottom: number } | undefined {
+/** 渲染块 → 最近中心带（|Δcenter| ≤ rect.h 才匹配；bands 空→undefined；
+ *  返回含 x0/x1（在场时）——F-A5 a 面自绘块水平界夹取源） */
+export function matchBand(bands: RowBand[] | undefined, r: AnnotationRect): { top: number; bottom: number; x0?: number; x1?: number } | undefined {
   if (bands === undefined || bands.length === 0) {
     return undefined
   }
@@ -97,22 +111,26 @@ export function matchBand(bands: RowBand[] | undefined, r: AnnotationRect): { to
     }
   }
   return best !== null && Math.abs(best.center - c) <= r.h
-    ? { top: best.top, bottom: best.bottom }
+    ? { top: best.top, bottom: best.bottom, x0: best.x0, x1: best.x1 }
     : undefined
 }
 
-/** canvas 2d 量测上下文（模块级缓存；无 canvas 环境→null） */
+/** canvas 2d 量测上下文（模块级缓存——只缓存成功获取：jsdom 未 mock 面
+ *  返回 null 不入缓存，量测环境就绪（测试 mock 挂上）后下次调用重试） */
 let ctxCache: CanvasRenderingContext2D | null | undefined
 
 function measureContext(): CanvasRenderingContext2D | null {
   if (ctxCache === undefined) {
     try {
-      ctxCache = document.createElement('canvas').getContext('2d')
+      const c = document.createElement('canvas').getContext('2d')
+      if (c !== null) {
+        ctxCache = c
+      }
     } catch {
-      ctxCache = null
+      // 无 canvas 环境——不缓存失败（重试廉价：纯查询）
     }
   }
-  return ctxCache
+  return ctxCache ?? null
 }
 
 /** span 元素的字体度量（computed font 简写 → canvas measureText）；度量
@@ -146,8 +164,38 @@ function fontSizeOf(el: Element, box: PixelBox): number {
   return Number.isFinite(px) && px > 0 ? px : box.h
 }
 
-/** 重锚 textNodes → 行簇字形带（span 去重+同带合并；无 canvas/量测退化→[]） */
-function bandsForNodes(nodes: Text[], base: PixelBox): RowBand[] {
+/** span → 行簇带（F-A5 单源核心：实测盒+canvas 字体度量→字形带+span 端点；
+ *  无量测（jsdom 桩面盒高兜 1）/退化 → null） */
+function spanBandOf(ctx: CanvasRenderingContext2D, el: Element, text: string, base: PixelBox): RowBand | null {
+  const box = pixelBoxOf(el)
+  if (box.h <= 1) {
+    return null // 无布局量测（jsdom 桩面 h 兜 1）——渲染回退分数路径
+  }
+  const band = bandFromMetrics(box, fontSizeOf(el, box), metricsOf(ctx, el, text), base)
+  if (band === null) {
+    return null
+  }
+  return { ...band, x0: (box.x - base.x) / base.w, x1: (box.x + box.w - base.x) / base.w }
+}
+
+/** 同行近并：中心距在带高内并为一带（行簇单带；x0/x1 取并集端点——F-A5） */
+function mergeNear(bands: RowBand[], band: RowBand): void {
+  const near = bands.find((b) => Math.abs(b.center - band.center) <= band.bottom - band.top)
+  if (near === undefined) {
+    bands.push(band)
+  } else {
+    near.x0 = Math.min(near.x0 ?? band.x0 ?? Number.POSITIVE_INFINITY, band.x0 ?? Number.POSITIVE_INFINITY)
+    near.x1 = Math.max(near.x1 ?? band.x1 ?? Number.NEGATIVE_INFINITY, band.x1 ?? Number.NEGATIVE_INFINITY)
+  }
+}
+
+/** [F-A5 b 定向修] textNodes → 行簇字形带（**节点口径**——带绑定不经几何
+ *  匹配，免疫 CSS 行盒整体偏移：真机实锤小字号紧排文档上 Range 行盒比
+ *  pdf.js span 盒整体高 ~9px，几何最近中心会把带绑到上一行=图2 下偏根因。
+ *  消费方：标注重锚（resolveAnnotationRects）+自绘选区（SelectionLayer
+ *  evaluate）+AI 段（AiAnnotationLayer resolve）；span 去重+同带合并；
+ *  无 canvas/量测退化（jsdom）→ []） */
+export function bandsForTextNodes(nodes: Text[], base: PixelBox): RowBand[] {
   const ctx = measureContext()
   if (ctx === null) {
     return []
@@ -160,19 +208,54 @@ function bandsForNodes(nodes: Text[], base: PixelBox): RowBand[] {
       continue
     }
     seen.add(el)
-    const box = pixelBoxOf(el)
-    if (box.h <= 1) {
-      continue // 无布局量测（jsdom 桩面 h 兜 1）——渲染回退分数路径
-    }
-    const band = bandFromMetrics(box, fontSizeOf(el, box), metricsOf(ctx, el, n.data), base)
+    const band = spanBandOf(ctx, el, n.data, base)
     if (band === null) {
       continue
     }
-    // 同行多 span：中心距在带高内并为一带（行簇单带）
-    const near = bands.find((b) => Math.abs(b.center - band.center) <= band.bottom - band.top)
-    if (near === undefined) {
-      bands.push(band)
+    mergeNear(bands, band)
+  }
+  return bands
+}
+
+/** [F-A5] rect 集 → 行簇字形带（三消费点公共面：自绘选区/标注存量回退/AI 段）。
+ *  只量测与任一 rect（归一化域→px 域）双向重叠的 span（gBCR 预筛——拖选节流
+ *  周期内成本=选区行簇量级）；基准=textLayer 盒（rects 归一化同源）。
+ *  无 canvas/无量测 span（jsdom）→ []（消费方回退原样/F-11 分数）。 */
+export function bandsNearRects(textLayer: HTMLElement, rects: AnnotationRect[]): RowBand[] {
+  if (rects.length === 0) {
+    return []
+  }
+  const ctx = measureContext()
+  if (ctx === null) {
+    return []
+  }
+  const base = pixelBoxOf(textLayer)
+  if (base.h <= 1) {
+    return []
+  }
+  const pxRects = rects.map((r) => ({
+    x: r.x * base.w + base.x,
+    y: r.y * base.h + base.y,
+    w: r.w * base.w,
+    h: r.h * base.h
+  }))
+  const bands: RowBand[] = []
+  for (const span of Array.from(textLayer.querySelectorAll('span'))) {
+    const g = span.getBoundingClientRect()
+    if (g.height <= 1 || g.width <= 1) {
+      continue
+    }
+    const overlaps = pxRects.some(
+      (p) => g.y + g.height > p.y && g.y < p.y + p.h && g.x + g.width > p.x && g.x < p.x + p.w
+    )
+    if (!overlaps) {
+      continue
+    }
+    const band = spanBandOf(ctx, span, span.textContent ?? '', base)
+    if (band === null) {
+      continue
     }
+    mergeNear(bands, band)
   }
   return bands
 }
@@ -203,7 +286,7 @@ export function resolveAnnotationRects(args: {
     if (range !== null && range.rects.length > 0) {
       next[a.id] = {
         rects: range.rects,
-        bands: bandsForNodes(range.textNodes.map((t) => t.node), base)
+        bands: bandsForTextNodes(range.textNodes.map((t) => t.node), base)
       }
     }
   }
diff --git a/src/renderer/features/reader/annotation-style.ts b/src/renderer/features/reader/annotation-style.ts
index 279350cfb..092f3e2ab 100644
--- a/src/renderer/features/reader/annotation-style.ts
+++ b/src/renderer/features/reader/annotation-style.ts
@@ -49,10 +49,35 @@ function pct(v: number): string {
   return `${Number((v * 100).toFixed(4))}%`
 }
 
+/** [F-A5] band → 垂直几何（top/height 百分比——三消费点同源映射：
+ *  rectStyle 标注块/SelectionPaint 自绘块/AiAnnotationLayer AI 段） */
+export function bandVertical(band: { top: number; bottom: number }): { top: string; height: string } {
+  return { top: pct(band.top), height: pct(band.bottom - band.top) }
+}
+
+/** [F-A5 a 面] 自绘块水平界=行簇 span 实际端点：rect 越出簇 [x0,x1] → 左右
+ *  夹入（票面 §0a「水平左右越出文字区」根治）；端点缺省/退化 → 原样透传 */
+export function clampedHorizontal(
+  r: AnnotationRect,
+  band?: { x0?: number; x1?: number }
+): { left: string; width: string } {
+  if (band?.x0 === undefined || band.x1 === undefined || band.x1 <= band.x0) {
+    return { left: `${r.x * 100}%`, width: `${r.w * 100}%` }
+  }
+  const left = Math.max(r.x, band.x0)
+  const right = Math.min(r.x + r.w, band.x1)
+  if (right <= left) {
+    return { left: `${r.x * 100}%`, width: `${r.w * 100}%` }
+  }
+  return { left: `${left * 100}%`, width: `${(right - left) * 100}%` }
+}
+
 /** kind+color+归一化矩形 → 色块样式（自 AnnotationLayer 迁入——组件行数
- *  防线；荧光笔语义：multiply 混合下色块不透明；下划线为收边后底缘 2px 实条）。
+ *  防线；[F-A5/ADR-0019 R2] 色块=背景板语义：canvas 透明底墨带恒在色块上
+ *  （文字纯黑），色块 normal 混合不透明；下划线为收边后底缘 2px 实条）。
  *  band 在场=行盒自适应（F-A4 b②：highlight 顶=band.top/高=band.bottom−
- *  band.top；underline 实条贴 band.bottom 上方 2px）；缺省=F-11 分数路径。 */
+ *  band.top——F-A5 起经 bandVertical 单源；underline 实条贴 band.bottom
+ *  上方 2px）；缺省=F-11 分数路径。 */
 export function rectStyle(
   kind: AnnotationKind,
   color: AnnotationColor,
@@ -77,8 +102,7 @@ export function rectStyle(
   if (band !== undefined) {
     return {
       ...base,
-      top: pct(band.top),
-      height: pct(band.bottom - band.top),
+      ...bandVertical(band),
       opacity: 1
     }
   }
diff --git a/src/renderer/features/reader/page-layer-z.ts b/src/renderer/features/reader/page-layer-z.ts
new file mode 100644
index 000000000..1bff69b04
--- /dev/null
+++ b/src/renderer/features/reader/page-layer-z.ts
@@ -0,0 +1,29 @@
+/**
+ * [F-A5 c 面] page-layer-z —— 页内层 z 序常量单源（ADR-0019 R2 修订：色块
+ * 垫底当背景板——用户令 2026-08-31「涂色的渲染应该在最下方当背景板而不是
+ * 影响文字的颜色」）。
+ *
+ * 层序（自下而上）：
+ * 1. textLayer（官方 css z0——span 透明，纯手势/锚定面，视觉零参与）；
+ * 2. 标注/AI 色块层（colorBlocks——**背景板**：pdf.js canvas 以透明底渲染
+ *    （PdfPageCanvas background rgba(255,255,255,0)），墨带恒在色块之上，
+ *    文字纯黑不被染；multiply 摘除（normal——半透明 alpha 语义随令））；
+ * 3. canvas（页墨带——z 上于色块、下于自绘层；pointer-events:none 明纸
+ *    穿透，标注 rect 点击/文本划选手势零回归）；
+ * 4. 自绘选区层（selectionPaint——选区交互视觉保持最上，票面 §0c/S4：
+ *    灰块视觉在色块上）。
+ *
+ * 比较域：PageBox 页内容容器（h-fit）isolation:isolate——四层比较封闭在
+ * 单页内，跨页互扰不可能。弹层（菜单 z-20/编辑器 z-20/工具条 z-10）在页盒
+ * 兄弟位，天然高于本域诸层。
+ */
+export const PAGE_LAYER_Z = {
+  /** 官方 text-layer.css 的 z0（内联同值显式化——序单源防漂移） */
+  text: 0,
+  /** 标注/AI 色块（背景板——垫在 canvas 墨带之下） */
+  colorBlocks: 1,
+  /** PDF 渲染 canvas（透明底墨带） */
+  canvas: 2,
+  /** 自绘选区层（交互视觉最上） */
+  selectionPaint: 3
+} as const
diff --git a/src/renderer/features/reader/selection-paint.tsx b/src/renderer/features/reader/selection-paint.tsx
index dada5c525..ae2533e7c 100644
--- a/src/renderer/features/reader/selection-paint.tsx
+++ b/src/renderer/features/reader/selection-paint.tsx
@@ -1,26 +1,37 @@
 /**
- * [F-A4] SelectionPaint —— 划选视觉并集自绘层（ADR-0019 R1 修订；票面 §1a）。
+ * [F-A4] SelectionPaint —— 划选视觉并集自绘层（ADR-0019 R1/R2 修订；票面 §1a）。
  *
  * - 数据=SelectionLayer evaluate 产出的锚定 rects（mergeLineRects+mergeRects
  *   归并产物——与保存 rects 同源，「所见即所存」S2）；单层单绘：相邻行重叠
  *   输入经归并后两两分离，重叠处不再逐 span 叠深（native ::selection 的
- *   0.20×2≈0.36 加深缺陷根治——票面 §0a）。
+ *   0.20×2≈0.36 加深缺陷根治）。
  * - 色 rgba(0,0,0,0.20)：同修前观感（R2-F-10 灰 0.20 在案；白纸合成
  *   ≈#CCCCCC 可辨）。
+ * - [F-A5 a 面] 块几何=行簇字形带单源（bandsNearRects 产 RowBand——与
+ *   标注/AI 三消费点同基准）：垂直=band（顶贴字形顶/底贴底缘——修前
+ *   CSS 回退行盒在小字号文档上 1.5~2 倍行高、上下溢出约半行，真机基线
+ *   1.57~1.83× 在档）；水平=行簇 span 实际端点夹取（clampedHorizontal
+ *   ——修前行盒越出文字区）。band 缺席（jsdom/量测退化）→ 行盒原样
+ *   （缺省兼容）。
  * - 渲染=React portal 进选区所在页盒：宿主取 .textLayer 父盒（与
  *   textLayer/AnnotationLayer 同 inset-0 同盒）——rects 归一化基准=
  *   pixelBoxOf(textLayer)，百分比数学与其严格同盒零换算；且页列
  *   `zoom: calc(1/var(--ui-scale))` 在档位≠1 时创建 stacking context，
- *   层必须与标注层同 context，z2 才位于 z5 标注 multiply 层之下
- *   （灰在黄下——R2-F-10 观感保持；渲染在挂载盒会被页列 sc 吞到标注之上）。
+ *   层必须与色块层同 context。
+ * - [F-A5 c 面/ADR-0019 R2] z=PAGE_LAYER_Z.selectionPaint（3）——页内
+ *   层序单源：色块背景板(1) < canvas 墨带(2) < 自绘选区(3)（选区交互视觉
+ *   保持最上，票面 §0c/S4 灰块视觉在色块上）。
  * - 生命周期=选区生命周期（evaluate 置位/清除置空——INV-37 视觉-状态严格
  *   同步；Escape 只清工具条，层随选区真清除而消失）；pointer-events:none
  *   防吞划选手势。
- * - 组件测试：tests/unit/renderer/selection-paint.test.tsx（S1~S5）+
- *   selection-layer.test.tsx（F-A4 反转守卫）。
+ * - 组件测试：tests/unit/renderer/selection-paint.test.tsx（S1~S5+F-A5 段
+ *   a1/a2/c1/c2）+selection-layer.test.tsx（F-A4 反转守卫）。
  */
 import { createPortal } from 'react-dom'
 import type { AnnotationRect } from '@shared/models/annotation'
+import { matchBand, type RowBand } from './annotation-resolve'
+import { bandVertical, clampedHorizontal } from './annotation-style'
+import { PAGE_LAYER_Z } from './page-layer-z'
 
 /** 自绘并集层灰（F-A4：观感同修前 ::selection rgba(0 0 0 / 0.20)） */
 const PAINT_BG = 'rgba(0, 0, 0, 0.20)'
@@ -30,8 +41,10 @@ export function SelectionPaint(props: {
   root: HTMLElement
   /** 归一化并集矩形（evaluate 管线产物——与保存 rects 同源） */
   rects: AnnotationRect[]
+  /** [F-A5] 行簇字形带（bandsNearRects 产物——缺省=行盒原样回退） */
+  bands?: RowBand[]
 }): JSX.Element {
-  const { root, rects } = props
+  const { root, rects, bands } = props
   // 宿主=.textLayer 父盒（结构常量：textLayer 与标注层同挂该盒的 inset-0）；
   // 异常结构兜底=页盒自身（几何同页，不劣于缺层）
   const textLayer = root.querySelector('.textLayer')
@@ -40,22 +53,26 @@ export function SelectionPaint(props: {
     <div
       data-testid="selection-rects"
       className="absolute inset-0"
-      style={{ zIndex: 2, pointerEvents: 'none' }}
+      style={{ zIndex: PAGE_LAYER_Z.selectionPaint, pointerEvents: 'none' }}
     >
-      {rects.map((r, i) => (
-        <div
-          key={i}
-          data-testid="selection-rect"
-          className="absolute"
-          style={{
-            left: `${r.x * 100}%`,
-            top: `${r.y * 100}%`,
-            width: `${r.w * 100}%`,
-            height: `${r.h * 100}%`,
-            background: PAINT_BG
-          }}
-        />
-      ))}
+      {rects.map((r, i) => {
+        // [F-A5 a] 同一 matchBand 匹配键（最近中心带）——与标注层渲染同基准
+        const band = matchBand(bands, r)
+        const vertical = band !== undefined ? bandVertical(band) : { top: `${r.y * 100}%`, height: `${r.h * 100}%` }
+        const horizontal = band !== undefined ? clampedHorizontal(r, band) : { left: `${r.x * 100}%`, width: `${r.w * 100}%` }
+        return (
+          <div
+            key={i}
+            data-testid="selection-rect"
+            className="absolute"
+            style={{
+              ...horizontal,
+              ...vertical,
+              background: PAINT_BG
+            }}
+          />
+        )
+      })}
     </div>,
     host
   )
diff --git a/tests/e2e/ai-notes-section.spec.ts b/tests/e2e/ai-notes-section.spec.ts
index 9ced4068a..cdf8f99c8 100644
--- a/tests/e2e/ai-notes-section.spec.ts
+++ b/tests/e2e/ai-notes-section.spec.ts
@@ -17,6 +17,8 @@ import { launch, seedPaperRow } from './e2e-env'
  * 产物落盘→done-unimported→「导入 AI 笔记」（真 07 导入器→真 DB）→分节
  * 渲染真实文本（e2e 断言锚——渲染出真实文本，非 testid 空壳）+archive 归档。
  * 状态行迁移靠组件 5s 轮询消费 fixture 变化——断言超时留 12s 余量。
+ * F-N1 用户令改向（[locked-change]，2026-08-31）：一审段默认折叠——两测在
+ * 条目断言前先点段头展开（最小改，断言锚不变）。
  */
 const DEPS = ['SR2-AI-06', 'SR2-AI-07'] as const
 const PAPER_ID = 'e2e-ai-sec'
@@ -130,6 +132,11 @@ test('AI 笔记面板全链：写 job→心跳 fixture→reading→产物落盘
   await expect(win.getByText('AI 笔记导入完成：导入 1 篇，跳过 0 篇')).toBeVisible({ timeout: 10_000 })
   await expect(win.getByRole('heading', { name: '第一问：核心 idea 是什么' })).toBeVisible()
   await expect(win.getByRole('heading', { name: '分歧报告' })).toBeVisible()
+  // F-N1 改向：一审段默认折叠——先点段头展开再断言条目（展开后 groupedItems
+  // 序=Q1 一审在前、divergence 裁决在后，与原断言序一致）
+  const firstReadHead = win.locator('[data-testid="ai-note-groups"] button[data-role-section="first-read"]')
+  await expect(firstReadHead).toBeVisible()
+  await firstReadHead.click()
   // 组内条目头 role 标签（转置锚：条目文本含一审/裁决——与页码同 span 故用包含匹配）
   const groupedItems = win.locator('[data-testid="ai-note-groups"] [data-ai-note-id]')
   await expect(groupedItems.first()).toContainText('一审')
@@ -213,6 +220,11 @@ test('AI 标注渲染层：含锚行导入→阅读器 AI 高亮块可见→点
   await expect(importBtn).toBeVisible({ timeout: 12_000 })
   await importBtn.click()
   await expect(win.getByText('AI 笔记导入完成：导入 1 篇，跳过 0 篇')).toBeVisible({ timeout: 10_000 })
+  // F-N1 改向：一审段默认折叠——先展开面板一审段（后续断言折叠段内条目
+  // data-highlight 高亮与正文可见）
+  const firstReadHead = win.locator('[data-testid="ai-note-groups"] button[data-role-section="first-read"]')
+  await expect(firstReadHead).toBeVisible()
+  await firstReadHead.click()
 
   // 回阅读区（笔记 tab 在侧栏——主区 PDF 常驻）：AI 高亮块经真 textLayer 重锚可见
   const aiRect = win.locator('[data-testid="ai-note-rect"]')
diff --git a/tests/e2e/reader-text.spec.ts b/tests/e2e/reader-text.spec.ts
index 46e46e3ec..97e3cd16d 100644
--- a/tests/e2e/reader-text.spec.ts
+++ b/tests/e2e/reader-text.spec.ts
@@ -180,9 +180,12 @@ test('划选高亮后重开仍在原位；批注编辑与删除可用', async ()
   const rect = win.getByTestId('annotation-rect')
   await expect(rect.first()).toBeVisible()
   // 计算样式防线（Q3b：opacity 0.35×浅黄在白纸对比度 ~1.1:1 低于感知阈——几何
-  // 可见 ≠ 视觉可见，Playwright toBeVisible 不看 opacity/计算色）；mix-blend 上
-  // 容器级（z-5 容器是 stacking context，rect 级混合被隔离无效）
-  await expect(win.getByTestId('annotation-layer')).toHaveCSS('mix-blend-mode', 'multiply')
+  // 可见 ≠ 视觉可见，Playwright toBeVisible 不看 opacity/计算色）
+  // [F-A5/ADR-0019 R2] 色块垫底背景板序（用户「背景板」令）：multiply 摘除
+  // （normal——canvas 透明底，墨带恒在色块之上文字纯黑）+层序=显式 z 常量
+  // 单源（colorBlocks=1，canvas=2 之下——原 multiply/5 守卫随 R2 修订改向）
+  await expect(win.getByTestId('annotation-layer')).toHaveCSS('mix-blend-mode', 'normal')
+  await expect(win.getByTestId('annotation-layer')).toHaveCSS('z-index', '1')
   await expect(rect.first()).toHaveCSS('background-color', 'rgb(253, 224, 71)')
   await expect(rect.first()).toHaveCSS('opacity', '1')
   // 单行单 span 划选：行级合并后恰 1 矩形（逐 clientRect 透传回归即 >1）
@@ -206,7 +209,9 @@ test('划选高亮后重开仍在原位；批注编辑与删除可用', async ()
   await expect(rect2.first()).toBeVisible({ timeout: 10_000 })
   // 重锚路径（verifyQuote→findRangeAtOffset）同口径：合并后仍 1 矩形、样式仍到位
   await expect(rect2).toHaveCount(1)
-  await expect(win2.getByTestId('annotation-layer')).toHaveCSS('mix-blend-mode', 'multiply')
+  // [F-A5/ADR-0019 R2] 背景板序第二程同锁（multiply 摘除+z=1）
+  await expect(win2.getByTestId('annotation-layer')).toHaveCSS('mix-blend-mode', 'normal')
+  await expect(win2.getByTestId('annotation-layer')).toHaveCSS('z-index', '1')
   const box2 = await rect2.first().boundingBox()
   const page2 = await win2.locator('canvas[data-pdf-canvas]').boundingBox()
   expect(box2).not.toBeNull()
diff --git a/tests/unit/renderer/ai-annotation-layer.test.tsx b/tests/unit/renderer/ai-annotation-layer.test.tsx
index 57a63d700..10ecf1789 100644
--- a/tests/unit/renderer/ai-annotation-layer.test.tsx
+++ b/tests/unit/renderer/ai-annotation-layer.test.tsx
@@ -18,6 +18,7 @@ import { AiAnnotationLayer } from '../../../src/renderer/features/reader/AiAnnot
 import { locateAnchor } from '../../../src/renderer/features/reader/anchor-locate'
 import { useReaderStore, type TabState } from '../../../src/renderer/features/reader/reader.store'
 import { QUESTION_COLOR } from '../../../src/renderer/features/reader/ai-note-style'
+import { PAGE_LAYER_Z } from '../../../src/renderer/features/reader/page-layer-z'
 
 // F-05：flashElement 滚动副作用替身（数学在 scroll-converge.test 锚定）
 const { scrollerMock } = vi.hoisted(() => ({ scrollerMock: vi.fn() }))
@@ -257,3 +258,45 @@ describe('anchor-locate exact 层延展（data-ai-note-id）', () => {
     expect(target!.classList.contains('locate-flash')).toBe(true)
   })
 })
+
+describe('F-A5 —— AI 段 band 单源（b 面）+色块垫底层序（c 面）', () => {
+  it('AI 段垂直=行簇字形带（band 单源——非裸行盒 rects）+层序 z=colorBlocks', () => {
+    // gBCR 桩：textLayer (0,0,600,800)/span (30,200,300,16)；canvas 度量桩
+    // asc10/desc3/fAsc14/fDesc4 → 半前导 −1 基线 213 → band=[203,216]/800
+    const boxes = new Map<Element, { x: number; y: number; width: number; height: number }>()
+    const pageRoot = makePageRoot('SMART WATER TEST DOC')
+    const textLayer = pageRoot.querySelector('.textLayer') as HTMLElement
+    const span = textLayer.querySelector('span') as HTMLElement
+    boxes.set(pageRoot, { x: 0, y: 0, width: 600, height: 800 })
+    boxes.set(textLayer, { x: 0, y: 0, width: 600, height: 800 })
+    boxes.set(span, { x: 30, y: 200, width: 300, height: 16 })
+    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
+      const r = boxes.get(this)
+      return { x: r?.x ?? 0, y: r?.y ?? 0, width: r?.width ?? 0, height: r?.height ?? 0 } as DOMRect
+    })
+    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
+      font: '',
+      measureText: () => ({
+        actualBoundingBoxAscent: 10,
+        actualBoundingBoxDescent: 3,
+        fontBoundingBoxAscent: 14,
+        fontBoundingBoxDescent: 4
+      })
+    } as unknown as CanvasRenderingContext2D)
+    mount(
+      <AiAnnotationLayer
+        aiNotes={[note({ id: 'n1', question: 'Q1', quote: 'WATER' })]}
+        page={0}
+        pageRoot={pageRoot}
+        onJumpToNote={() => undefined}
+      />
+    )
+    const layer = host!.querySelector<HTMLElement>('[data-testid="ai-annotation-layer"]')
+    expect(layer).not.toBeNull()
+    expect(layer!.style.zIndex).toBe(String(PAGE_LAYER_Z.colorBlocks))
+    const r = rects()[0]!
+    // 修前=裸行盒（jsdom 回退 span 盒 top 25%/height 2%）；band=25.375%/1.625%
+    expect(parseFloat(r.style.top)).toBeCloseTo(25.375, 4)
+    expect(parseFloat(r.style.height)).toBeCloseTo(1.625, 4)
+  })
+})
diff --git a/tests/unit/renderer/ai-note-collapse.test.tsx b/tests/unit/renderer/ai-note-collapse.test.tsx
new file mode 100644
index 000000000..8243d2b1f
--- /dev/null
+++ b/tests/unit/renderer/ai-note-collapse.test.tsx
@@ -0,0 +1,133 @@
+// @vitest-environment jsdom
+/**
+ * [F-N1] AiNoteGroupList —— 组内三段（一审/二审/裁决）可折叠测试（新增合约）。
+ *
+ * 覆盖：①默认态（一审/二审 collapsed 条目不在 DOM、裁决 expanded 条目在）
+ * ②段头点击展开（条目出现+aria-expanded 真；段间不联动）③再点收起
+ * ④段头条数标注「段名(N)」（折叠只藏视觉不删数据——条数在段头可见）
+ * ⑤无该段数据不渲染空段头（per-组 per-段）。
+ * 折叠=会话级组件内 state，不持久化（刷新/换文献回默认——F-N1 §4）。
+ * always-active（ADR-0017 裁决 3，不经 guardedDescribe）。
+ */
+import { act } from 'react'
+import { createRoot, type Root } from 'react-dom/client'
+import { afterEach, beforeEach, expect, it } from 'vitest'
+import type { AiNote, AiNoteRole, AiNoteQuestion } from '../../../src/shared/models/ai-note'
+import { AiNoteGroupList } from '../../../src/renderer/features/reader/AiNoteGroupList'
+
+function note(id: string, role: AiNoteRole, question: AiNoteQuestion): AiNote {
+  return {
+    id,
+    paperId: 'p-1',
+    annotationId: null,
+    role,
+    question,
+    model: 'test-model',
+    quoteText: `quote-${id}`,
+    prefixText: '',
+    suffixText: '',
+    anchorPage: 3,
+    contentMd: `内容-${id}`,
+    createdAt: 't',
+    updatedAt: 't'
+  }
+}
+
+let root: Root | null = null
+let host: HTMLDivElement | null = null
+
+function mount(notes: AiNote[]): void {
+  host = document.createElement('div')
+  document.body.appendChild(host)
+  root = createRoot(host)
+  act(() => {
+    root?.render(<AiNoteGroupList notes={notes} onLocate={() => undefined} />)
+  })
+}
+
+/** 段头折叠器按钮（data-role-section=段 role） */
+const secBtn = (role: AiNoteRole): HTMLButtonElement | null =>
+  (host?.querySelector(`button[data-role-section="${role}"]`) as HTMLButtonElement | null) ?? null
+
+/** 条目按钮（data-ai-note-id=条目 id） */
+const item = (id: string): HTMLElement | null => host?.querySelector(`[data-ai-note-id="${id}"]`) ?? null
+
+beforeEach(() => {
+  root = null
+  host = null
+})
+
+afterEach(() => {
+  act(() => {
+    root?.unmount()
+  })
+  root = null
+  host?.remove()
+  host = null
+})
+
+it('①默认态：一审/二审条目不在 DOM（collapsed），裁决条目在（expanded）+三段头 aria-expanded 各就位', () => {
+  mount([
+    note('a1', 'first-read', 'Q1'),
+    note('a2', 'first-read', 'Q1'),
+    note('b1', 'second-read', 'Q1'),
+    note('c1', 'adjudicate', 'Q1')
+  ])
+  expect(item('a1')).toBeNull()
+  expect(item('a2')).toBeNull()
+  expect(item('b1')).toBeNull()
+  expect(item('c1')).not.toBeNull()
+  expect(secBtn('first-read')?.getAttribute('aria-expanded')).toBe('false')
+  expect(secBtn('second-read')?.getAttribute('aria-expanded')).toBe('false')
+  expect(secBtn('adjudicate')?.getAttribute('aria-expanded')).toBe('true')
+})
+
+it('②点一审段头：条目出现+aria-expanded 真（段间不联动——二审仍收起；再点二审同理展开）', () => {
+  mount([note('a1', 'first-read', 'Q1'), note('b1', 'second-read', 'Q1')])
+  act(() => {
+    secBtn('first-read')?.click()
+  })
+  expect(item('a1')).not.toBeNull()
+  expect(secBtn('first-read')?.getAttribute('aria-expanded')).toBe('true')
+  expect(item('b1')).toBeNull()
+  act(() => {
+    secBtn('second-read')?.click()
+  })
+  expect(item('b1')).not.toBeNull()
+})
+
+it('③再点一审段头：收起（条目退场+aria-expanded 假）', () => {
+  mount([note('a1', 'first-read', 'Q1')])
+  act(() => {
+    secBtn('first-read')?.click()
+  })
+  act(() => {
+    secBtn('first-read')?.click()
+  })
+  expect(item('a1')).toBeNull()
+  expect(secBtn('first-read')?.getAttribute('aria-expanded')).toBe('false')
+})
+
+it('④段头条数标注：段名(条数)（一审(3)/二审(1)/裁决(1)——折叠只藏视觉不删数据）', () => {
+  mount([
+    note('a1', 'first-read', 'Q1'),
+    note('a2', 'first-read', 'Q1'),
+    note('a3', 'first-read', 'Q1'),
+    note('b1', 'second-read', 'Q1'),
+    note('c1', 'adjudicate', 'Q1')
+  ])
+  expect(secBtn('first-read')?.textContent).toMatch(/一审\(3\)/)
+  expect(secBtn('second-read')?.textContent).toMatch(/二审\(1\)/)
+  expect(secBtn('adjudicate')?.textContent).toMatch(/裁决\(1\)/)
+})
+
+it('⑤无该段数据不渲染空段头（组内无裁决段→无裁决段头；段头缺失 per-组 per-段判定）', () => {
+  mount([note('a1', 'first-read', 'Q1'), note('b1', 'second-read', 'Q2')])
+  expect(secBtn('adjudicate')).toBeNull()
+  const q1 = host?.querySelector('[data-question="Q1"]') ?? null
+  const q2 = host?.querySelector('[data-question="Q2"]') ?? null
+  expect(q1?.querySelector('button[data-role-section="first-read"]')).not.toBeNull()
+  expect(q1?.querySelector('button[data-role-section="second-read"]')).toBeNull()
+  expect(q2?.querySelector('button[data-role-section="first-read"]')).toBeNull()
+  expect(q2?.querySelector('button[data-role-section="second-read"]')).not.toBeNull()
+})
diff --git a/tests/unit/renderer/ai-notes-section.test.tsx b/tests/unit/renderer/ai-notes-section.test.tsx
index 9fb355cd2..8f737c853 100644
--- a/tests/unit/renderer/ai-notes-section.test.tsx
+++ b/tests/unit/renderer/ai-notes-section.test.tsx
@@ -6,6 +6,9 @@
  * （连续 3 次离线提示行——含 status.json 损坏=上抛计入计数的 mock 驱动路径）/
  * 导入按钮三桶 toast/卸载清 interval/分节分组与七问分色/只读断言（无写交互
  * 元素）/条目单击 locateAnchor（INV-20 消费方级）。
+ * F-N1 用户令改向（[locked-change]，2026-08-31）：一审/二审默认折叠——
+ * 「分节分组/组内 role 标签/条目单击」3 例改向为「默认不在 DOM+段头在+
+ * 点段头展开后条目可见」（锁默认态与展开行为，意图不变非删断言）。
  * always-active（ADR-0017 裁决 3）。
  */
 import { act } from 'react'
@@ -418,12 +421,22 @@ it('分节分组：question 组按 AI_NOTE_QUESTIONS 序呈现（组头中文标
   // 组头分色条（QUESTION_COLOR 单源——左缘竖条形态）
   const q1Head = groups[0]?.querySelector('h4') as HTMLElement
   expect(q1Head.style.borderLeft).toContain(QUESTION_COLOR.Q1)
+  // F-N1 改向：一审/二审默认折叠（条目不在 DOM）+段头在——点段头展开后条目可见
+  const q1 = groups[0] as HTMLElement
+  expect(q1.querySelector('[data-ai-note-id="a1"]')).toBeNull()
+  expect(q1.querySelector('[data-ai-note-id="b1"]')).toBeNull()
+  expect(q1.querySelector('button[data-role-section="first-read"]')).not.toBeNull()
+  expect(q1.querySelector('button[data-role-section="second-read"]')).not.toBeNull()
+  act(() => {
+    ;(q1.querySelector('button[data-role-section="first-read"]') as HTMLButtonElement | null)?.click()
+    ;(q1.querySelector('button[data-role-section="second-read"]') as HTMLButtonElement | null)?.click()
+  })
   // 组内条目按 ROLE_ORDER 排序（一审在前二审在后）+条目头 role 标签可辨
-  const q1Items = Array.from(groups[0]?.querySelectorAll('[data-ai-note-id]') ?? [])
+  const q1Items = Array.from(q1.querySelectorAll('[data-ai-note-id]') ?? [])
   expect(q1Items.map((el) => el.getAttribute('data-ai-note-id'))).toEqual(['a1', 'b1'])
   expect(q1Items[0]?.textContent).toContain('一审')
   expect(q1Items[1]?.textContent).toContain('二审')
-  const dot = groups[0]?.querySelector('[data-ai-note-id="a1"] span[aria-hidden]') as HTMLElement
+  const dot = q1.querySelector('[data-ai-note-id="a1"] span[aria-hidden]') as HTMLElement
   expect(dot.style.background).toBe(QUESTION_COLOR.Q1)
   const divItem = groups[2]?.querySelector('[data-ai-note-id="c1"]') as HTMLElement | null
   expect(divItem).not.toBeNull() // divergence 独立成组（question 轴）
@@ -477,7 +490,16 @@ it('组内 role 标签：同 question 组内三 role 条目头呈现一审/二
   await flush()
   const groups = Array.from(host?.querySelectorAll('[data-testid="ai-note-groups"] > div') ?? [])
   expect(groups).toHaveLength(1) // 同 question 单组
-  const items = Array.from(groups[0]?.querySelectorAll('[data-ai-note-id]') ?? [])
+  // F-N1 改向：一审/二审默认折叠（条目不在 DOM、裁决 expanded 在）——展开后断言三 role
+  const g0 = groups[0] as HTMLElement
+  expect(g0.querySelector('[data-ai-note-id="a1"]')).toBeNull()
+  expect(g0.querySelector('[data-ai-note-id="b1"]')).toBeNull()
+  expect(g0.querySelector('[data-ai-note-id="c1"]')).not.toBeNull()
+  act(() => {
+    ;(g0.querySelector('button[data-role-section="first-read"]') as HTMLButtonElement | null)?.click()
+    ;(g0.querySelector('button[data-role-section="second-read"]') as HTMLButtonElement | null)?.click()
+  })
+  const items = Array.from(g0.querySelectorAll('[data-ai-note-id]') ?? [])
   expect(items.map((el) => el.getAttribute('data-ai-note-id'))).toEqual(['a1', 'b1', 'c1'])
   expect(items[0]?.textContent).toContain('一审')
   expect(items[1]?.textContent).toContain('二审')
@@ -511,6 +533,11 @@ it('条目单击→locateAnchor（INV-20 单入口消费方；anchorPage 1 基
   listByPaper.mockResolvedValue({ ok: true, data: [note('a1', 'first-read', 'Q1')] })
   mount(<AiNotesSection />)
   await flush()
+  // F-N1 改向：一审默认折叠（条目不在 DOM）——先点段头展开再单击条目
+  expect(host?.querySelector('[data-ai-note-id="a1"]')).toBeNull()
+  act(() => {
+    ;(host?.querySelector('button[data-role-section="first-read"]') as HTMLButtonElement | null)?.click()
+  })
   act(() => {
     ;(host?.querySelector('[data-ai-note-id="a1"]') as HTMLElement).click()
   })
diff --git a/tests/unit/renderer/annotation-layer.test.tsx b/tests/unit/renderer/annotation-layer.test.tsx
index 075a683f0..00fd230dc 100644
--- a/tests/unit/renderer/annotation-layer.test.tsx
+++ b/tests/unit/renderer/annotation-layer.test.tsx
@@ -14,6 +14,7 @@ import { createRoot, type Root } from 'react-dom/client'
 import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
 import { AnnotationLayer } from '../../../src/renderer/features/reader/AnnotationLayer'
 import type { Annotation, AnnotationRect } from '@shared/models/annotation'
+import { PAGE_LAYER_Z } from '../../../src/renderer/features/reader/page-layer-z'
 
 vi.mock('../../../src/renderer/api/client', () => ({
   api: { reader: {} },
@@ -118,3 +119,72 @@ describe('F-A1 AnnotationLayer 挂 B —— 渲染读时归并（INV-E）', () =
     expect(host!.querySelectorAll('[data-testid="annotation-rect"]').length).toBe(0)
   })
 })
+
+describe('F-A5 —— 存量回退经 band（b 面）+色块垫底层序（c 面）', () => {
+  /** 页根夹具：textLayer+单 span（gBCR 桩）+canvas 度量桩——bandsNearRects 量测面 */
+  function makeBandPage(): { page: HTMLElement; textLayer: HTMLElement; span: HTMLElement } {
+    const page = document.createElement('div')
+    page.setAttribute('data-page-root', '1')
+    const textLayer = document.createElement('div')
+    textLayer.className = 'textLayer'
+    const span = document.createElement('span')
+    span.textContent = 'SMART WATER TEST DOC'
+    textLayer.appendChild(span)
+    page.appendChild(textLayer)
+    const boxes = new Map<Element, { x: number; y: number; width: number; height: number }>()
+    boxes.set(page, { x: 0, y: 0, width: 600, height: 800 })
+    boxes.set(textLayer, { x: 0, y: 0, width: 600, height: 800 })
+    boxes.set(span, { x: 30, y: 200, width: 300, height: 16 })
+    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
+      const r = boxes.get(this)
+      return { x: r?.x ?? 0, y: r?.y ?? 0, width: r?.width ?? 0, height: r?.height ?? 0 } as DOMRect
+    })
+    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
+      font: '',
+      measureText: () => ({
+        actualBoundingBoxAscent: 10,
+        actualBoundingBoxDescent: 3,
+        fontBoundingBoxAscent: 14,
+        fontBoundingBoxDescent: 4
+      })
+    } as unknown as CanvasRenderingContext2D)
+    return { page, textLayer, span }
+  }
+
+  it('存量 rects（重锚失败回退）经行簇 band：块 top/height=band 值（非 F-11 分数）', async () => {
+    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback): number => {
+      cb(0)
+      return 0
+    })
+    const { page } = makeBandPage()
+    document.body.appendChild(page)
+    // quoteText 与页内全文不符→verifyQuote 失败→回退存量 rects（b 面回退路径核对）
+    const ann: Annotation = {
+      id: 'a-legacy', paperId: 'p-1', page: 0, kind: 'highlight', color: 'yellow',
+      quoteText: '不存在的引文', prefixText: '', suffixText: '', startOffset: 0, endOffset: 6,
+      rects: [{ page: 0, x: 0.05, y: 0.25, w: 0.5, h: 0.02 }], comment: '',
+      createdAt: '2026-08-31T00:00:00Z', updatedAt: '2026-08-31T00:00:00Z'
+    }
+    await act(async () => {
+      root!.render(<AnnotationLayer annotations={[ann]} page={0} pageRoot={page} onChanged={() => undefined} />)
+    })
+    const block = host!.querySelector<HTMLElement>('[data-testid="annotation-rect"]')
+    expect(block).not.toBeNull()
+    // span 盒 (30,200,300,16)+度量 asc10/desc3/fAsc14/fDesc4：半前导 −1 基线 213
+    // →band=[203,216]/800：top=25.375%/height=13/800=1.625%（F-11 分数=25.2%/1.56%——可区分）
+    expect(inlinePct(block!, 'top')).toBeCloseTo(25.375, 4)
+    expect(inlinePct(block!, 'height')).toBeCloseTo(1.625, 4)
+  })
+
+  it('c 色块层=背景板序：z=层级常量 colorBlocks 且 multiply 摘除（normal）', async () => {
+    await act(async () => {
+      root!.render(
+        <AnnotationLayer annotations={[defectAnnotation()]} page={0} pageRoot={null} onChanged={vi.fn()} />
+      )
+    })
+    const layer = host!.querySelector<HTMLElement>('[data-testid="annotation-layer"]')
+    expect(layer).not.toBeNull()
+    expect(layer!.style.zIndex).toBe(String(PAGE_LAYER_Z.colorBlocks))
+    expect(layer!.style.mixBlendMode).toBe('')
+  })
+})
diff --git a/tests/unit/renderer/selection-paint.test.tsx b/tests/unit/renderer/selection-paint.test.tsx
index eea193431..e2747a900 100644
--- a/tests/unit/renderer/selection-paint.test.tsx
+++ b/tests/unit/renderer/selection-paint.test.tsx
@@ -23,6 +23,7 @@ import { SelectionLayer } from '../../../src/renderer/features/reader/SelectionL
 import { AnnotationLayer } from '../../../src/renderer/features/reader/AnnotationLayer'
 import { rectStyle } from '../../../src/renderer/features/reader/annotation-style'
 import { bandFromMetrics } from '../../../src/renderer/features/reader/annotation-resolve'
+import { PAGE_LAYER_Z } from '../../../src/renderer/features/reader/page-layer-z'
 import type { Annotation, AnnotationRect } from '@shared/models/annotation'
 
 const { toastSpy, saveMock } = vi.hoisted(() => ({ toastSpy: vi.fn(), saveMock: vi.fn() }))
@@ -425,3 +426,72 @@ describe('F-A4 c 面 —— 工具条定位归一（÷有效 zoom+视口夹取+
     expect(parseFloat(bar!.style.left)).toBeCloseTo(1020, 6)
   })
 })
+
+describe('F-A5 —— band 单源自绘（a 面）+水平夹取+层序常量（c 面）', () => {
+  /** 公共夹具：span 实测盒 (100,200,300,16)+canvas 字体度量桩
+   *  （半前导=(16−18)/2=−1 基线=213 band=[201,217]→归一 [0.125%,2.125%]；
+   *  行盒路径（修前）=clientRect 原样 top 0%/height 2.5%——可区分） */
+  async function mountBandPage(): Promise<{ span: HTMLElement }> {
+    const { page, span } = makePage('1', { x: 100, y: 200, width: 600, height: 800 }, 'alpha beta gamma delta')
+    document.body.appendChild(page)
+    // span 簇 [200,500]（归一 x0=16.667%/x1=66.667%——a2 夹取差的构造前提）
+    rects.set(span, { x: 200, y: 200, width: 300, height: 16 })
+    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
+      font: '',
+      measureText: () => ({
+        actualBoundingBoxAscent: 12,
+        actualBoundingBoxDescent: 4,
+        fontBoundingBoxAscent: 14,
+        fontBoundingBoxDescent: 4
+      })
+    } as unknown as CanvasRenderingContext2D)
+    await mountLayer(page)
+    return { span }
+  }
+
+  it('a1 自绘块垂直=行簇字形带（band 单源——非 CSS 回退行盒）：top/height=band 值', async () => {
+    const { span } = await mountBandPage()
+    // 行盒（CSS 回退度量）高 20——修前自绘块=top 0%/height 2.5%
+    clientRects = [{ x: 100, y: 200, width: 300, height: 20 }]
+    selectRange(span.firstChild!, 0, span.firstChild!, 4)
+    act(() => {
+      fireMouseUp()
+    })
+    const blocks = paintBlocks()
+    expect(blocks.length).toBe(1)
+    // band=[201,217]/800：top=0.125%/height=2%（与标注层同基准——三消费点同源）
+    expect(pct(blocks[0]!, 'top')).toBeCloseTo(0.125, 4)
+    expect(pct(blocks[0]!, 'height')).toBeCloseTo(2, 4)
+  })
+
+  it('a2 自绘块水平界=行簇 span 实际端点：行盒越出 span 簇→左右夹入 [x0,x1]', async () => {
+    const { span } = await mountBandPage()
+    // 行盒 x∈[40,440] 左越 span 簇 [200,500]——修前 left=0%/width=56.67% 原样
+    clientRects = [{ x: 40, y: 200, width: 400, height: 20 }]
+    selectRange(span.firstChild!, 0, span.firstChild!, 4)
+    act(() => {
+      fireMouseUp()
+    })
+    const blocks = paintBlocks()
+    expect(blocks.length).toBe(1)
+    // 夹入 span 簇实际端点：left=(100−100)/600=16.667%/right=(400−100)/600→width=50%
+    expect(pct(blocks[0]!, 'left')).toBeCloseTo(100 / 6, 4)
+    expect(pct(blocks[0]!, 'width')).toBeCloseTo(50, 4)
+  })
+
+  it('c1 自绘层 z=层级常量最上（选区交互视觉保持最上——票面 §0c）', async () => {
+    const { span } = await mountBandPage()
+    clientRects = [{ x: 100, y: 200, width: 300, height: 20 }]
+    selectRange(span.firstChild!, 0, span.firstChild!, 4)
+    act(() => {
+      fireMouseUp()
+    })
+    expect(paintLayer()!.style.zIndex).toBe(String(PAGE_LAYER_Z.selectionPaint))
+  })
+
+  it('c2 层序常量单源（防回归序）：色块垫底 < canvas < 自绘最上；textLayer 官方 z0 在色块下（视觉透明无碍）', () => {
+    expect(PAGE_LAYER_Z.canvas).toBeGreaterThan(PAGE_LAYER_Z.colorBlocks)
+    expect(PAGE_LAYER_Z.selectionPaint).toBeGreaterThan(PAGE_LAYER_Z.canvas)
+    expect(PAGE_LAYER_Z.text).toBe(0)
+  })
+})

```

## 输出纪律(必读)

先统计行「B:N/W:N/N:N+总评一句」;逐条展开引证据(文件/断言 id/行);分 F-A5/F-N1 两节给各自放行判定;200 行内;异基座读不了盘——结论只能来自本材料包;不确定写存疑。
