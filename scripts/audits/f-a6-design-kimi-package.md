# F-A6 设计任务包（划选渲染错乱 D1+拖选卡顿 D2 根治——五轮方案后第六轮，纪律=设计文档先行）

## §A 用户实报与立案（2026-09-03，图证在档）
某 PDF 划选：选区灰块「锯齿拼接」+「右侧溢出」；拖选期选中反馈「一卡一卡」；用户明示「前后修了三四轮」。registry 立案 F-A6：五轮方案（F-06 ::selection 不透明→F-07 自绘层→F-08 回官方→F-09 灰→F-A4 自绘并集层[ADR-0019 R1]+F-A5 band 夹取[R2]）残留两病根：D1=rects evaluate 在异常 text-layer PDF 上错乱（自绘层照渲=所见即所存的几何源头错）；D2=拖选期 selectionchange 200ms 防抖全量重算+portal 重渲染卡顿。涉 ADR-0019 R3 修订。

## §B 五轮历史票行（registry 摘要链）

  { id: 'SR2-F-06', file: 'src/renderer/features/reader/PageColumn.tsx', area: 'reader', owner: 'strong', status: 'done', summary: '页间分隔与选区不透明（b3: P7-F；验收缺陷 B+C 视觉修复——B 页盒 var(--panel) 底+0 1px 4px rgba(0,0,0,.12) 阴影渲染/占位同底消色差跳动+gap 不动；C ::selection 半透明→不透明近似色（关键实证：Chromium 不解析 ::selection 的 color-mix 行 fallback 行才是生效行故两行都改 rgb(191 191 255)——门一探查快照+变异②双证据核准）+text-layer.css 头注偏离登记；e2e reader-text.spec 新 test 自守卫（B 页盒底色/阴影/与 --bg 可辨+C ::selection 无透明分量）；单测零触碰）[locked-change]——票面 scripts/audits/sr2-f-06-brief.md；依赖 F-01~05（PageColumn 排他）' },
  { id: 'SR2-F-07', file: 'src/renderer/features/reader/SelectionLayer.tsx', area: 'reader', owner: 'strong', status: 'done', summary: '划选自绘选区+AI 层去 multiply（b3: P7-F；复测缺陷 P1 修复——F-06 不透明 ::selection 遮 canvas 字形根因推翻：pdfjs 文本层 span color:transparent 字形在下层，半透明才透字，「压白底等效色」只对纯白底成立；B 案=::selection 置 transparent（两行同值死代码收敛单行）+SelectionLayer 按 anchor.rects 自绘 30% accent 半透明选区块（z:2/pointer-events:none/禁 multiply——单层单绘根除重叠 span 逐元素叠绘；247 行触 250 拆 SelectionRects/SelectionToolbar 两件 DOM 零变化）+AiAnnotationLayer 摘容器 multiply 保 opacity:0.45（与 AnnotationLayer 层间叠乘路径清零——AI-09 起既有机制）；门一 C 项层叠链源码级三判据全过+机制三断言锁回炉（e2e computed style mixBlendMode/pointerEvents/zIndex——F-06「审色值没审机制」教训同构残余堵口）；受锁 reader-text.spec F-06 小票 C 节守卫改写（transparent+自绘层+alpha∈(0,1)）+selection-layer.test 2 it）[locked-change]——票面 scripts/audits/sr2-f-07-brief.md；依赖 F-06（推翻其 C 案）+AI-09（层链既有）' },
  { id: 'SR2-F-08', file: 'src/renderer/features/reader/SelectionLayer.tsx', area: 'reader', owner: 'strong', status: 'done', summary: '划选视觉反馈回退官方原生半透明（F1 修正役 R1 路线——ADR-0019；复测站 3「全面失败+0.5~5s 延迟」根修）：①text-layer.css ::selection/::-moz-selection 回官方 rgba(0 0 255 / 0.25)（逐字对照 pdfjs-dist pdf_viewer.css:678-685；br 两规则保持 transparent）；②删 SelectionRects.tsx 整件+SelectionLayer 摘 overlay 计算/渲染（P10 方案切换=删旧）；③视觉通道=原生 ::selection（拖选第一帧即反馈，零 JS 链路——取证：自绘层 30% accent 合成 rgb(191,207,220) 近乎不可见+拖选期死寂=根因双实锤，O(n) 遍历 0~0.6ms 假说证伪）；④工具条/保存/undo/Escape 零变；AnnotationLayer 单层 multiply+AI 层去 multiply（F-07 层间修复）保留；⑤受锁两文件第三次改写：e2e F-06 小票 C 节（官方半透明精确值+selection-rects 防回归 0 计数+L7 延迟预算 toolbar≤1.5s）+unit F-07a 改防回归守卫/F-07b 删——票面 scripts/audits/sr2-f-08-brief.md；取证 scripts/audits/f1-forensics.report.md；三屋：实现 1.95M tok/858 用例绿+门一 PASS 0B/4W/7N+门二 PASS 零回炉（W3=INV-37 登记）；依赖 ADR-0019 裁决' },
  { id: 'SR2-F-09', file: 'src/renderer/features/reader/text-layer.css', area: 'reader', owner: 'strong', status: 'done', summary: '划选选中色改灰（用户令 2026-08-29：仿 WPS——灰色选中/标注纯色；v5 核查=标注纯色+重合不加重已成立零改）：text-layer.css ::selection/::-moz-selection rgba(0 0 255 / 0.25)→rgba(0 0 0 / 0.30)（≈白纸 #B3B3B3）；受锁 e2e reader-text.spec F-06 小票 C 节精确值断言+测试名同步；INV-37/ADR-0019 补记（用户指令偏离官方值的显式登记）；压缩路径票（单值变更+守卫同步，主控直做——变异红证 sr2-f-09-mutation.raw.txt：css 改回蓝→F-06 小票红点精确锁值；verify 858+locks+e2e 25 passed 全绿；v5b 真机像素证=差分区 93.3% 中性灰/均值 rgb(151,154,155)）；核查档 scripts/audits/f1-out/f1-forensics5.json+v5 截图+执行记录 sr2-f-09-record.md' },

## §C ADR-0019 全文（R1/R2 在档）

# ADR-0019 划选视觉反馈回退官方原生半透明路线（R1）

日期：2026-08-29 · 状态：已裁决（执行=SR2-F-08） · 取代：SR2-F-06/SR2-F-07 的 ::selection 处置 · 上游：`docs/prompts/2026-08-29_loop-handoff.md` §2F1 · 取证：`scripts/audits/f1-forensics.report.md`

## 背景

划选视觉反馈三轮三机制（官方 25% 半透明→F-06 不透明近似色→F-07 透明+自绘
层），复测站 3 全面失败：拖选全程无反馈（感知延迟 0.5~5s≈拖选时长）+松手后
自绘层 rgb(191,207,220) 级淡色近乎不可见。真机取证（真实库副本，三号机+
像素差分）证伪了「O(n) 遍历昂贵」假说（实测 0~0.6ms），锁定根因=**视觉通道
机制选择错误**，非性能、非几何精度。

## 决策

1. **::selection 回官方值**：`text-layer.css` 的 `.textLayer
   ::selection`/`::-moz-selection` 恢复 `rgba(0 0 255 / 0.25)`（逐字对照
   `node_modules/pdfjs-dist/web/pdf_viewer.css:678-685`）；`br` 两规则保持
   transparent（官方原样）。
   **修订（2026-08-29 SR2-F-09，用户后续指令）**：选中色蓝→灰
   `rgba(0 0 0 / 0.30)`（白纸合成≈#B3B3B3，仿 WPS「灰色选中/标注纯色」）。
   机制不变（原生直读/零 JS 链路/INV-37 全保持），仅色值偏离官方——本 ADR
   即该偏离的显式登记；e2e F-06 小票守卫同步锁新值。标注纯色面经 v5 真机
   核查（像素级行界带无叠乘）确认**已达标零改**——纯色板+容器级单次 multiply。
2. **自绘层整体删除**（P10 方案切换=删旧方案）：删 `SelectionRects.tsx`；
   `SelectionLayer` 摘 overlay 计算/渲染与 `PendingSelection.overlay`。
   划选**视觉**=原生 ::selection（浏览器内建，拖选第一帧即反馈，零 JS 链路）；
   mouseup/防抖 evaluate 链仅服务**工具条+保存**（该链取证实测 <20ms）。
3. **保留**：AnnotationLayer 单层 multiply（荧光笔语义）与 AiAnnotationLayer
   去 multiply（F-07 层间叠乘修复）——与划选视觉通道无关，不动。
4. **守卫第三次改写**（[locked-change]）：e2e F-06 小票 C 节改为「::selection
   =官方半透明值+selection-rects 不在场（防回归）+L7 延迟预算（工具条
   ≤1500ms）」；unit F-07a/b 改写/删除。

## 理由

- 三轮用户反馈痛点（遮字/拖选死寂/不可见）**全部是视觉通道机制病**；官方
  路线唯一已知缺陷（重叠 span 叠绘不均匀）三轮零投诉——效果缺陷的代价比
  机制缺陷小一个数量级。
- R1 后交互路径上不存在「JS 延迟预算」防守面（原生渲染），L7 预算只需守
  工具条链——复杂度净减。
- 半透明蓝 rgb(191,191,255)（B-R=64）在取证像素管线下显著可测，后续真机
  复评有客观判据。

## 后果

- 正面：拖选即时可见（用户判据①②③全达成路径）；删一个组件+一段几何
  换算代码；SelectionLayer 职责收窄为「选区→工具条→保存」。
- 负面/接受：重叠 span 处选色轻微不均匀（官方 pdf.js/Firefox 全球同款，
  历史零投诉）；受锁两文件第三次改写（流程成本，先例在档）。
- 不变：selectionToAnchor/锚定三元组/保存链/INV-05 两路径同口径——零触碰。
- 语义随移声明（门一 W3/门二攻击段采纳）：Escape 只清组件态（工具条），**选区
  蓝色 tint 保留至选区真正清除**（点击/保存/页卸载）——视觉-状态严格同步的原生
  语义，登记 INV-37；用户若不接受此交互=新行为变更单，非本 ADR 返工。

## 关联

- 遗留 B9（零宽 rect 入库伪影）登记于取证报告 §5，本 ADR 范围外。
- 教训 L6/L7 回流：L7（交互延迟预算入票面）由本役 e2e 守卫落地首个实例。

## 补记三则（2026-08-29 复测后继单）

- **补记·F-09（灰化）**：用户令选中色蓝→灰仿 WPS——`rgba(0 0 255 / 0.25)`
  →`rgba(0 0 0 / 0.30)`（白纸合成≈#B3B3B3）。原生路线机制不变，仅色值偏离
  官方；INV-37 语义（Escape 只清工具条、tint 留至选区真清）同步登记。
- **补记·F-10（alpha 减档）**：用户令（图二）「灰选中与黄标注重叠处加深
  难看」——机制：灰选中在 textLayer(z:0)、标注 multiply 层(z:5) 在其上，
  黄×灰逐通道相乘成暗橄榄。alpha 0.30→**0.20**：白底合成 #CCCCCC 仍清晰
  可辨（F-08「选中不可见」红线不回退），叠黄合成 rgb(202,179,57) 提亮一档。
  受锁 reader-text.spec.ts 正则同步（四分量全锁口径不变）。
- **补记·F-12（触发阈值）**：用户令「一点就出选项条」=误触发——mouseup
  即时评估路径加拖选位移阈值 3px（LineageCanvas.DRAG_THRESHOLD 同型）；
  单击/双击（含选词）不出条，真拖选与程序化/键盘选区（防抖路径）不受影响。
  INV-37 不受扰动（阈值只影响工具条出现，不影响选区本身）。

## R1 修订：划选视觉回自绘并集层（F-A4，2026-08-31）

- **修订依据=用户根治令**（F-A4 票面 §0a，用户复测附两图）：连续段落选中时
  多行灰块行交界横向深带（重叠部分渲染加深）——根因=官方 pdf.js 已知缺陷
  （同 issue #17561 族）：文本层逐 span 绘制，pdf.js span 行盒=CSS 回退字体
  度量，相邻行垂直重叠处 0.20×2≈0.36 逐层叠深。**CSS 层无解，唯一根治=
  自绘并集层**。
- **原裁决两病根复核（均解，故可修订）**：①拖选期零反馈（当年自绘层挂
  mouseup/防抖后）→今 selectionchange 200ms 防抖路径在场（F-02 起），
  拖选期自绘层实时跟随；②30% accent 合成 rgb(191,207,220) 近乎不可见
  →今观感灰 rgba(0,0,0,0.20) 在案（R2-F-09/F-10 用户令两轮定值），白纸
  合成≈#CCCCCC 清晰可辨。
- **R1 落地形态**：SelectionLayer 渲染 SelectionPaint（selection-paint.tsx，
  portal 进选区所在页盒——z2 在标注 multiply 层 z5 之下，R2-F-10 灰在黄下
  观感保持），数据=evaluate 管线 mergeLineRects+mergeRects 归并产物（与
  保存 rects 同源——所见即所存）；::selection 背景改 transparent
  （text-layer.css）。INV-37 语义修订登记（Escape 只清工具条，自绘层随
  选区真清除）；受锁两测试守卫反转（e2e 0 计数→在场；unit F-08 恒 null
  →在场）。
- **不随修订变化**：锚定三元组/保存链/INV-05 两路径同口径/F-12 触发阈值/
  选择模式（INV-42）零触碰。

## R2 修订：色块垫底背景板层序+band 单源（F-A5，2026-08-31）

- **修订依据=用户令**（F-A5 票面 §0c，2026-08-31 第二轮复测附两图）：「涂色的
  渲染应该在最下方当背景板而不是影响文字的颜色」+图2 被高亮文字染成色系暗色
  （非纯黑）。修订对象=R1 遗留的「AnnotationLayer 单层 multiply（F-07 荧光笔
  语义）+AiAnnotationLayer normal 0.45（F-07 层间叠乘摘除的代价）」层序语义。
- **根因链（真机实锤，f-a5-diag/verify 在档）**：AI 段层 normal alpha 0.45
  罩在 canvas 墨带之上——0.45×色+0.55×墨 把文字染成暗色（图2 绿/橙/紫=AI
  七问色）；multiply 本身不染纯黑墨（Reynolds 存量标注块内最暗核=0 实测），
  但两 multiply 层叠乘（F-07 在档）与用户「背景板」心智均要求重排。
- **R2 落地形态（与票面字面「canvas<色块<textLayer+DOM 字为主体」的差异=
  实现者自裁，依据如下）**：
  1. **pdf.js render 以 `background:'rgba(255,255,255,0)'` 透明底渲染**（pdfjs
     缺省 `#ffffff` 填充会把垫底色块整页遮死）——墨带成为页内最高的「字」，
     色块从墨带外的透明区透出=**真·背景板**：文字像素恒 canvas 墨（纯黑，
     像素实测 0），色块对文字零混合（比票面预期「canvas 位图字被罩淡属预期」
     更强——无需 DOM 字承担视觉主体）。**DOM 字保持官方 transparent 设计
     不动**（text-layer.css 零改）：官方透明文本层的存在理由（回退字体字形
     ≠PDF 嵌入字形——F-11/F-A4 band 体系的病根本身）使「DOM 字为主体」会
     引入全文档双墨渲染（回退字形叠嵌入字形=发糊）——此为对票面 §0c 修法
     字面的显式偏离，修订依据=用户令的意图（文字颜色不受影响）+官方设计
     保留，报门审裁决。
  2. **层序常量单源 page-layer-z.ts**：textLayer（官方 css z0，TextLayer 内联
     同值显式化）<色块层（标注+AI 同 z1，multiply 摘除=normal）<canvas
     （z2，pointer-events:none 明纸穿透——标注 rect 点击/文本划选手势零回归）
     <自绘选区层（z3 最上，票面 S4「灰块视觉在色块上」——R2-F-10「灰在黄下」
     multiply 观感随之废止）。比较域=PageBox 页内容容器 isolation:isolate
     （单页封闭，跨页互扰不可能）；白纸承底层=该容器 background（暗色主题
     下页纸仍白=PDF 纸面语义）。
  3. **a/b 面 band 单源**：span→字形带核心（bandFromMetrics）单源驻
     annotation-resolve；**节点口径**（选区/AI 段/标注重锚各自的 textNodes→
     bandsForTextNodes——绑定不经几何匹配）+**几何兜底口径**（存量 rects
     重锚失败无节点可依→bandsNearRects）两入口同一数学。节点口径的必要性=
     真机实锤：小字号紧排文档（6.38px 参考区）CSS 行盒比 pdf.js span 盒整体
     偏上 ~9px，几何最近中心匹配会把带绑到上一行。自绘块水平界=行簇 span
     实际端点夹取（clampedHorizontal）；RowBand 增 x0/x1。
  4. **量测退化回退链保持**：jsdom/无 canvas→空带→行盒原样/F-11 分数（缺省
     兼容，F-A4 语义零变）。
- **修前/修后真机数字**（f-a5-diag.json vs f-a5-verify-after.json，用户库
  最小字号篇 6.38px 参考区）：自绘块高/行盒高 1.38→1.13（对墨高口径 1.57~1.83
  →~1.1）；块顶 vs 行簇 span 顶 −7.3~−8.9px（整块上错一行）→0.48px；块底
  −4.9~−6.5px（侵入下邻行）→+1.5px（desc 尾界内）；水平越界 11.5~281px→
  2.75px（亚字符级口径差）；AI/标注块顶差 0.48px（AI 修前=裸行盒=图2 下偏
  根因）；色块内文字最暗核=0（纯黑）；S4/S6/zoom150 稳定；pageerror 0。
- **不随修订变化**：锚定三元组/保存链/INV-05 两路径同口径/选择模式（INV-42）
  /F-12 触发阈值/工具条定位（F-A4 c）零触碰；e2e F-06 小票 multiply 守卫
  随令改向（normal+z=1，[locked-change]）。
- **已知边界（申报）**：OCR/扫描整页位图 PDF（不透明光栅全页覆盖）上色块
  垫底不可见——但该类文档无文本层即无锚定即无标注可渲染（用户库 9 篇中
  1 篇扫描件实证不可开卷标注），风险面=空集口径；**矢量 PDF 页面操作符自绘
  不透明背景矩形（部分导出器/排版工具习惯）同型风险——有文本层可锚定可
  标注，但 canvas 像素不透明白整页遮死下层色块（门一 W4 补声明 2026-08-31：
  真机仅验用户库无此形态，遇此类文档观感=标注不可见而非错位——申报降级
  接受+台账备案，用户如遇此类 PDF 另开票换「色块 z 于 canvas 上+normal」
  回退路径）**；AI 选中描边随层垫底（描边
  落 rect 边缘空白区可见，压墨段被墨盖——交互反馈弱化，报门审）。

## §D INV-37（现行锚定面）
51:| INV-37 | 划选视觉=自绘并集层（ADR-0019 R1 修订，F-A4 2026-08-31）：选区视觉反馈是**浏览器选区状态**的直接函数（SelectionLayer evaluate 管线的 mergeLineRects+mergeRects 归并产物经 selection-paint portal 进选区所在页盒单层单绘——与保存 rects 同源，所见即所存；色 rgba(0,0,0,0.20) 同 R2-F-10 观感；拖选期经 selectionchange 200ms 防抖驱动）。::selection 背景=transparent（text-layer.css——官方 pdf.js 逐 span 绘制在重叠行盒处叠深，CSS 层无解；SR2-F-08 原生路线两病根已解：拖选零反馈→防抖路径在场，accent 近不可见→观感灰在案）。组件态（pending/工具条）与选区视觉**允许分离**——Escape 只清 pending（工具条收），自绘层保留至选区真正清除（点击坍缩/保存 removeAllRanges 同步清/承载页卸载）；`[data-testid="selection-rects"]` 在 pending 态**在场**（R1 修订反转原 0 计数守卫——受锁两测试已改向） | text-layer.css `.textLayer ::selection`=transparent（F-A4）+SelectionLayer paint 态渲染 SelectionPaint（portal 页盒；[F-A5] 块垂直=行簇字形带节点口径（选区 textNodes→bandsForTextNodes——免疫 CSS 行盒整体偏移错绑上一行）+水平界=行簇 span 端点夹取+band 缺省行盒原样回退；z=page-layer-z.selectionPaint=3 页内最上——色块垫底 canvas 透明底墨带之下，ADR-0019 R2） | e2e（reader-text.spec F-06 小票：::selection transparent+selection-rects 在场+块色 rgba(0,0,0,0.2)+toolbar ≤1.5s）+unit（selection-layer.test F-A4 反转守卫+selection-paint.test S1~S5：并集渲染/所见即所存/Escape 语义/清除随选——M2 变异红证在档） | 已锚定（e2e+单测级 2026-08-31 F-A4；真机 f-a4-verify-after.json 12/12） |

## §E 源码（行为真相源——行号即证据基准）

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

### src/renderer/features/reader/anchor-serialize.ts
```
/**
 * [F-ARCH4] anchor-serialize —— 划选锚定格式与校验域（纯函数，自
 * annotation-anchor 逐行迁入——纯重构行为零变，票面=scripts/audits/f-arch4-ticket.md）
 *
 * ── 行为层（WADM textQuote 契约迁移，语义与迁入前逐条等价）──
 * - 用户划选（Selection）→ 页内锚定三元组：start/end/quote/prefix/suffix/
 *   rects；选区任一边界在 root 之外（跨页/页外）或 quote 为空（纯元素/零宽
 *   选择）返回 null；边界点→全局偏移用 probe-range 文本长度探测（文本/元素
 *   容器统一成立）；prefix/suffix 按 CONTEXT_CHARS=32 截取（WADM 惯例）
 * - verifyQuote：前缀/引文/后缀校验 start 偏移是否仍有效；失效时 textQuote
 *   自愈重定位——原位校验优先，重定位打分 score=prefix 2+suffix 1，同级取距
 *   原偏移最近者
 * - 偏移约定：verifyQuote 的 start 与返回值均指 quote 首字符的页内偏移（页内
 *   全文拼接口径在 annotation-anchor）；rects 的 page 恒为 0——实际页码由
 *   调用方在持久化时改写
 *
 * ── 接口层 ──
 * - export interface SelectionAnchor
 * - export function selectionToAnchor(root, selection): SelectionAnchor | null
 * - export function verifyQuote(root, selector): number | null
 * - matchAt/probeTextLength/CONTEXT_CHARS 保持模块私有
 * - 几何与遍历原语消费自 annotation-anchor 公共面（collectSpans/fullTextOf/
 *   offsetToPoint/rectsBetweenPoints/pixelBoxOf）——类型单一真相源，本模块
 *   零类型复写
 *
 * ── 架构层 ──
 * - 依赖单向 anchor-serialize→annotation-anchor→annotation-merge（零环）；
 *   本模块=锚定格式与校验域，未来锚定格式扩展的增长点；锚定计算域（DOM 文本
 *   遍历/偏移互转/几何管线）仍在 annotation-anchor
 * - 文本枚举唯一发生在 annotation-anchor；本模块仅借 Range 做长度探测
 *   （probeTextLength 的 Range.toString 非遍历）
 *
 * ── 生命周期层 ──
 * - 零运行时差异（纯函数跨模块移动，模块加载图多一叶）；单页千级文本节点
 *   <10ms 约束照旧
 *
 * ── 文化层 ──
 * - 测试：tests/unit/renderer/annotation-anchor.test.ts（受锁，import 已改向
 *   本模块——用例体零改）；e2e reader-text.spec.ts 划选保存链（收口裁判）
 */
import type { AnnotationRect } from '@shared/models/annotation'
import {
  collectSpans,
  fullTextOf,
  offsetToPoint,
  pixelBoxOf,
  rectsBetweenPoints
} from './annotation-anchor'

export function verifyQuote(
  root: HTMLElement,
  selector: { prefix: string; quote: string; suffix: string; start: number }
): number | null {
  const { prefix, quote, suffix, start } = selector
  if (quote.length === 0) {
    return null
  }
  const text = fullTextOf(root)
  // 原位校验：前缀/引文/后缀在 start 处全部吻合则直接返回原偏移
  if (matchAt(text, start, prefix, quote, suffix)) {
    return start
  }
  // 重定位（textQuote 自愈）：引文仍存在但原偏移已漂移（前部文本增删）。
  // prefix+suffix 双匹配优先，其次任一单匹配；同级取距原偏移最近者。
  let best: number | null = null
  let bestScore = 0
  let bestDist = Number.POSITIVE_INFINITY
  for (let i = text.indexOf(quote); i !== -1; i = text.indexOf(quote, i + 1)) {
    const prefixOk =
      prefix.length === 0 ||
      (i - prefix.length >= 0 && text.startsWith(prefix, i - prefix.length))
    const suffixOk = suffix.length === 0 || text.startsWith(suffix, i + quote.length)
    const score = (prefixOk ? 2 : 0) + (suffixOk ? 1 : 0)
    if (score === 0) {
      continue
    }
    const dist = Math.abs(i - start)
    if (score > bestScore || (score === bestScore && dist < bestDist)) {
      best = i
      bestScore = score
      bestDist = dist
    }
  }
  return best
}

/** text[i..] 起恰为 quote，且其前恰为 prefix、其后恰为 suffix */
function matchAt(text: string, i: number, prefix: string, quote: string, suffix: string): boolean {
  if (!Number.isInteger(i) || i < 0 || i + quote.length > text.length) {
    return false
  }
  if (!text.startsWith(quote, i)) {
    return false
  }
  if (prefix.length > 0 && (i - prefix.length < 0 || !text.startsWith(prefix, i - prefix.length))) {
    return false
  }
  if (suffix.length > 0 && !text.startsWith(suffix, i + quote.length)) {
    return false
  }
  return true
}

/** 划选锚定结果：saveAnnotation 输入的全部定位字段（rects.page 恒 0，调用方改写实际页码） */
export interface SelectionAnchor {
  start: number
  end: number
  quote: string
  prefix: string
  suffix: string
  rects: AnnotationRect[]
}

/** 引文前后上下文截取窗口（prefix/suffix 长度，WADM textQuote 惯例） */
const CONTEXT_CHARS = 32

/**
 * 用户划选 → 页内锚定。选区任一边界在 root 之外（跨页/页外）返回 null，
 * 由调用方提示"仅支持单页内标注"。quote 为空（纯元素/零宽选择）同样返回 null。
 */
export function selectionToAnchor(
  root: HTMLElement,
  selection: Selection
): SelectionAnchor | null {
  if (selection.rangeCount === 0 || selection.isCollapsed) {
    return null
  }
  const range = selection.getRangeAt(0)
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) {
    return null
  }
  const { spans, total } = collectSpans(root)
  if (total === 0) {
    return null
  }
  // 边界点 → 全局偏移：probe-range 的文本长度（文档序拼接口径与 collectSpans 一致）
  const leadLen = probeTextLength(root, range.startContainer, range.startOffset, 'start')
  const tailLen = probeTextLength(root, range.endContainer, range.endOffset, 'end')
  if (leadLen === null || tailLen === null) {
    return null
  }
  const start = leadLen
  const end = total - tailLen
  if (end <= start) {
    return null
  }
  const text = spans.map((s) => s.node.data).join('')
  const first = offsetToPoint(spans, start)
  const last = offsetToPoint(spans, end)
  if (first === null || last === null) {
    return null
  }
  return {
    start,
    end,
    quote: text.slice(start, end),
    prefix: text.slice(Math.max(0, start - CONTEXT_CHARS), start),
    suffix: text.slice(end, Math.min(total, end + CONTEXT_CHARS)),
    rects: rectsBetweenPoints(first, last, pixelBoxOf(root))
  }
}

/**
 * probe-range 文本长度：side='start' 探 [root 起..边界) → 长度即边界全局偏移；
 * side='end' 探 [边界..root 尾) → 长度是其后文长度（调用方用 total 相减）。
 * Range.toString 按文档序拼接相交文本节点的命中区间，元素/文本容器统一成立
 */
function probeTextLength(
  root: HTMLElement,
  container: Node,
  offset: number,
  side: 'start' | 'end'
): number | null {
  try {
    const probe = document.createRange()
    probe.selectNodeContents(root)
    if (side === 'start') {
      probe.setEnd(container, offset)
    } else {
      probe.setStart(container, offset)
    }
    return probe.toString().length
  } catch {
    // 节点脱离文档等异常：无法探测，交由调用方按 null 放弃本次划选
    return null
  }
}
```

### src/renderer/features/reader/annotation-anchor.ts
```
/**
 * [SR-RDR-01] annotation-anchor —— 锚定计算域：DOM 文本遍历/偏移互转/几何
 * 管线（工单：done / strong，Phase 3/4；F-ARCH4 拆件后回归本域）
 *
 * ── 行为层 ──
 * - 文本偏移 ↔ DOM 范围 互转（WADM textPosition 思路）：
 *   findRangeAtOffset(root: HTMLElement, start: number, end: number): DOMRange | null
 *   —— 遍历文本节点累计字符偏移，命中区间返回 { rects, textNodes }
 * - rectsFromRange(range, pageSize): AnnotationRect[]（归一化 0..1）
 * - mergeLineRects(pixels, pageWidth)（2026-08-23 Q3 修复演进）：clientRects 行级
 *   合并——同形去重/y 重叠聚行簇（高度可比带防旋转文本互并）/x 大间隙断段（防
 *   多栏桥接）/段内 x 并集+y/h 取主导矩形；rectsBetweenPoints 归一化前调用，
 *   划选保存与重开重锚两路径同口径。[F-V1] 紧凑行距（盒高>行距）稳健化：簇判据
 *   追加实测行距钳制（estimateLinePitch——y 中心差下中位），段输出高度钳到行距
 *   （防盒高溢出行距逐行重叠→下游 INV-D 级联下推行带错绑=丢行/杂交/同行双块）。
 * - 归一化后另过 mergeRects 收口（F-A1 挂 A，2026-08-30）：归一化域滤零宽/
 *   全簇比较聚类/行内 x 并集/行间钳制——mergeLineRects 漏掉的零宽幽灵、同行
 *   碎片、同位重复、行间负间隙在此终裁（INV-A~D，见 annotation-merge.ts）。
 * - 划选锚定的格式与校验域（锚定三元组生成/前缀引文后缀校验/自愈重定位）已
 *   迁 anchor-serialize.ts（F-ARCH4 纯重构，行为零变）——本文件回归锚定计算域
 * - 偏移约定：页内全文 = 按文档序拼接全部文本节点（节点间无间隙）；区间为半开
 *   [start, end)；rects 的 page 恒为 0：本模块只在单页根上工作，实际页码由调用方（持有 page
 *   属性的 SelectionLayer/AnnotationLayer）在持久化时改写。
 *
 * ── 接口层 ──
 * - export interface DOMRange { rects: AnnotationRect[]; textNodes: Array<{ node: Text; offset: number }> }
 * - export interface NodeSpan/DomPoint/PixelBox（几何域类型——单一真相源）
 * - export function findRangeAtOffset/rectsFromRange/mergeLineRects/estimateLinePitch，
 *   及几何原语公共面 collectSpans/fullTextOf/offsetToPoint/rectsBetweenPoints/pixelBoxOf
 *   （F-ARCH4 扩面——anchor-serialize 的合法消费面；全部纯/幂等，无 React 依赖）
 *
 * ── 架构层 ──
 * - 全项目唯一操作 DOM 文本遍历的地方；消费形（F-ARCH4 拆件后）：SelectionLayer
 *   只经 anchor-serialize 间接调用；AnnotationLayer/AiAnnotationLayer 直调
 *   findRangeAtOffset（几何）+经 anchor-serialize 调 verifyQuote（校验）。
 *   几何原语公共面亦在本模块（F-ARCH4 起 anchor-serialize 消费此面——依赖
 *   单向 anchor-serialize→本模块→annotation-merge，零环）
 *
 * ── 生命周期层 ──
 * - 性能约束：单页千级文本节点 <10ms；不做跨页标注（v1 负面清单）
 *
 * ── 文化层 ──
 * - 测试：tests/unit/renderer/annotation-anchor.test.ts（已锁定，jsdom 环境跑 DOM 用例：
 *   基本命中/跨节点/前后缀漂移/重定位失败 返回 null——F-ARCH4 起格式校验用例
 *   的 import 已改向 anchor-serialize，用例体零改）
 */
import type { AnnotationRect } from '@shared/models/annotation'
import { mergeRects } from './annotation-merge'

export interface DOMRange {
  rects: AnnotationRect[]
  textNodes: Array<{ node: Text; offset: number }>
}

/** 文本节点在页内全文中的跨度（半开区间，全局偏移） */
export interface NodeSpan {
  node: Text
  start: number
  end: number
}

/** DOM 边界点：某文本节点内的字符偏移 */
export interface DomPoint {
  node: Text
  offset: number
}

/** 像素矩形/基准盒（origin 为视口坐标，尺寸已做 ≥1 下限防除零） */
export interface PixelBox {
  x: number
  y: number
  w: number
  h: number
}

/** 按文档序收集文本节点并累计全局偏移；零长度节点不参与（避免空命中项） */
export function collectSpans(root: HTMLElement): { spans: NodeSpan[]; total: number } {
  const spans: NodeSpan[] = []
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let cursor = 0
  for (let n = walker.nextNode() as Text | null; n !== null; n = walker.nextNode() as Text | null) {
    if (n.data.length > 0) {
      spans.push({ node: n, start: cursor, end: cursor + n.data.length })
      cursor += n.data.length
    }
  }
  return { spans, total: cursor }
}

/** 页内全文（与 collectSpans 同一拼接口径，保证偏移语义一致） */
export function fullTextOf(root: HTMLElement): string {
  return collectSpans(root)
    .spans.map((s) => s.node.data)
    .join('')
}

export function findRangeAtOffset(
  root: HTMLElement,
  start: number,
  end: number
): DOMRange | null {
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end <= start) {
    return null
  }
  const { spans, total } = collectSpans(root)
  if (end > total) {
    return null
  }
  const textNodes: DOMRange['textNodes'] = []
  let first: NodeSpan | null = null
  let last: NodeSpan | null = null
  for (const span of spans) {
    if (span.end <= start) {
      continue
    }
    if (span.start >= end) {
      break
    }
    if (first === null) {
      first = span
    }
    last = span
    // 首节点记录区间在本节点内的起点；后续节点从 0 覆盖到区间末端
    textNodes.push({ node: span.node, offset: Math.max(0, start - span.start) })
  }
  if (first === null || last === null) {
    return null
  }
  // 精确几何：起止边界点都已知，按页根盒归一化（阅读器中页根即页面容器）
  const base = pixelBoxOf(root)
  const rects = rectsBetweenPoints(
    { node: first.node, offset: start - first.start },
    { node: last.node, offset: end - last.start },
    base
  )
  return { rects, textNodes }
}

/** 全局偏移 → DOM 边界点；end 允许等于 total（贴页尾时取末节点终点） */
export function offsetToPoint(spans: NodeSpan[], global: number): DomPoint | null {
  for (const s of spans) {
    if (global < s.end) {
      return { node: s.node, offset: global - s.start }
    }
  }
  const last = spans[spans.length - 1]
  return last === undefined ? null : { node: last.node, offset: last.end - last.start }
}

export function rectsFromRange(
  range: DOMRange,
  pageSize: { w: number; h: number }
): AnnotationRect[] {
  // findRangeAtOffset 产出的 rects 已按页根盒归一化，直接透传（真实渲染的主路径）
  if (range.rects.length > 0) {
    return range.rects
  }
  // 手工构造的 DOMRange（未经 findRangeAtOffset）：从 textNodes 重建几何，
  // 按声明的页面尺寸归一化。此路径无页根原点可扣减，仅在无布局量测的场景使用
  const first = range.textNodes[0]
  const last = range.textNodes[range.textNodes.length - 1]
  if (first === undefined || last === undefined) {
    return []
  }
  const base: PixelBox = { x: 0, y: 0, w: Math.max(pageSize.w, 1), h: Math.max(pageSize.h, 1) }
  return rectsBetweenPoints(
    { node: first.node, offset: first.offset },
    // DOMRange 不携带区间末端信息，末节点只能覆盖到其文本末尾（单节点区间精确）
    { node: last.node, offset: last.node.data.length },
    base
  )
}

/** 元素盒；无布局环境（jsdom/离屏）时各分量为 0，尺寸兜底为 1 防除零 */
export function pixelBoxOf(el: Element): PixelBox {
  let x = 0
  let y = 0
  let w = 0
  let h = 0
  if (typeof el.getBoundingClientRect === 'function') {
    const b = el.getBoundingClientRect()
    x = b.x
    y = b.y
    w = b.width
    h = b.height
  }
  return { x, y, w: Math.max(w, 1), h: Math.max(h, 1) }
}

/** 两边界点之间的客户端矩形 → 相对 base 的归一化矩形（0..1，越界截断）。
 *  [F-A4] 行高感知接线：选区 span 的 computed font-size 中位数=PDF 行高
 *  量测源（px，本地口径），注入 mergeLineRects（像素域判据）与 mergeRects
 *  （归一化域容差）——紧行距不再跨行并簇（INV-40 边界修复）。
 *  量测口径声明：fontSize 为本地 CSS px 而 base/pixels 为视口 px（含祖先
 *  zoom 复合）——PDF zoom≠1 时阈值等效收紧 1/zoom，方向安全（跨行更不易
 *  误并；同行片段中心距 ≲0.25×字号远低于阈值，不受影响）。 */
export function rectsBetweenPoints(a: DomPoint, b: DomPoint, base: PixelBox): AnnotationRect[] {
  const lineHpx = medianFontSizeBetween(a, b)
  // 行级合并先于归一化（像素域判间隙/高度可比）：划选保存与重开重锚两路径在此同口径收口
  const pixels = mergeLineRects(clientRectsBetween(a, b), base.w, lineHpx)
  const clamp01 = (v: number): number => Math.min(1, Math.max(0, v))
  // F-A1 挂 A：归一化后过归并器（滤零宽/聚行/并集/钳制，INV-A~D）——零宽兜底
  // 块（w:0）随之被滤：pixels 为空时返回空数组，调用方 rects.length>0 判空语义兜住
  return mergeRects(
    pixels.map((r) => ({
      page: 0,
      x: clamp01((r.x - base.x) / base.w),
      y: clamp01((r.y - base.y) / base.h),
      w: clamp01(r.w / base.w),
      h: clamp01(r.h / base.h)
    })),
    lineHpx !== undefined ? lineHpx / base.h : undefined
  )
}

/** [F-A4] 两边界点间文本的 computed font-size 中位数（下中位；PDF 行高
 *  量测源）。无相交文本/量测不可解析（jsdom 未实现/空样式）→undefined
 *  （调用方按旧行为走）。getComputedStyle 只读非遍历；本模块仍是唯一
 *  DOM 文本遍历点（TreeWalker 按 Range 相交过滤）。 */
function medianFontSizeBetween(a: DomPoint, b: DomPoint): number | undefined {
  try {
    const range = document.createRange()
    range.setStart(a.node, Math.min(a.offset, a.node.data.length))
    range.setEnd(b.node, Math.min(b.offset, b.node.data.length))
    if (typeof range.intersectsNode !== 'function') {
      return undefined
    }
    const sizes: number[] = []
    const walker = document.createTreeWalker(range.commonAncestorContainer, NodeFilter.SHOW_TEXT)
    for (let n = walker.nextNode() as Text | null; n !== null; n = walker.nextNode() as Text | null) {
      if (!range.intersectsNode(n)) {
        continue
      }
      const el = n.parentElement
      if (el === null) {
        continue
      }
      const px = parseFloat(getComputedStyle(el).fontSize)
      if (Number.isFinite(px) && px > 0) {
        sizes.push(px)
      }
    }
    if (sizes.length === 0) {
      return undefined
    }
    sizes.sort((x, y) => x - y)
    return sizes[Math.floor((sizes.length - 1) / 2)]
  } catch {
    // 节点脱离文档等异常：行高不可量测，交调用方按旧行为走
    return undefined
  }
}

// ── clientRects 行级合并（pdf.js 文本层逐 span 绝对定位、各字号/基线不同，同一
//    视觉行会产多个高矮不一且竖向重叠的矩形——逐矩形透传导致高亮叠深、下划线错落）──

/** 同形去重容差（px）：相邻节点重复量测的亚像素差 */
const DEDUP_EPSILON_PX = 0.5
/** 高度可比带：矩形高在簇主导矩形高的 [0.5,2] 倍内视为同行字号变体（上标/公式），
 *  超出按旋转/竖排文本独立成簇（高瘦矩形并入行簇会 corrupt y/h 与并集）。贪心
 *  比对当前主导：行内高度方差 ≥2.2× 时主导切换可拆行；且聚类只与末簇比较——
 *  高瘦矩形恰排在同一行两碎片之间（y 序插队）时，后碎片与真行簇"失联"另起簇。
 *  两场景后果同为同行拆两矩形（multiply 下无叠深、几何各自正确），属 ADR-0002
 *  复杂排版近似边界——修法应是把比较扩到全部簇，而非放宽可比带/重叠率（会引入
 *  跨行误并，损失大于所得） */
const HEIGHT_RATIO_MIN = 0.5
const HEIGHT_RATIO_MAX = 2
/** y 重叠率门槛：重叠像素须 ≥ 较小高度（新矩形高 vs 主导高取小）的 25% 才算同行
 *  ——同行片段（上标/基线偏移）重叠率近 1；紧行距（leading ≤ ~0.93em）下相邻行盒
 *  1~2px 亚像素重叠率 ~0.1，不得误并（并则合并矩形取主导行 y/h，次行不被覆盖） */
const Y_OVERLAP_RATIO_MIN = 0.25
/** 簇内 x 大间隙断段阈值：max(1.5×主导矩形高, 页宽 2%)——防多栏/大缩进桥接成一个矩形 */
const COLUMN_GAP_H_FACTOR = 1.5
const COLUMN_GAP_PAGE_RATIO = 0.02
/** [F-V1] 行距估计：同片段对/tall-short 变体的中心差（实测 ~0.2-2.4px）不参与估计 */
const INTRA_ROW_GAP_PX = 2

/** [F-V1] 行距估计（像素域纯函数）：输入矩形 y 中心分布 → 视觉行距估计。
 *  口径：中心升序 → 相邻差 → 滤 <2px 的行内噪声差 → 下中位。下中位对少数
 *  离群差天然稳健（远距行界/零宽盒实测可制造 232px 离群差——若按最大差相对
 *  下限过滤，单个离群会把下限抬到真行距之上致全部真差被滤、估计坍缩到离群
 *  值使高度钳制失效——f-v1-verify doc2 实证）。可用差不足（单行选区/全同行
 *  片段——两行以下退化）或估计值非正 → undefined（调用方走缺省判据）。
 *  紧凑行距排版（盒高>行距）下行盒高/y 重叠率均不可靠（相邻行盒 y 区间
 *  重叠可达 44%），以实测行距为行簇与段高度的基准。 */
export function estimateLinePitch(pixels: PixelBox[]): number | undefined {
  if (pixels.length < 2) {
    return undefined
  }
  const centers = pixels.map((r) => r.y + r.h / 2).sort((a, b) => a - b)
  const gaps: number[] = []
  for (let i = 1; i < centers.length; i += 1) {
    const g = centers[i]! - centers[i - 1]!
    if (g >= INTRA_ROW_GAP_PX) {
      gaps.push(g)
    }
  }
  if (gaps.length === 0) {
    return undefined
  }
  const pitch = [...gaps].sort((a, b) => a - b)[Math.floor((gaps.length - 1) / 2)]!
  return Number.isFinite(pitch) && pitch > 0 ? pitch : undefined
}

function areaOf(r: PixelBox): number {
  return r.w * r.h
}

/** 簇内主导矩形（面积最大者）——行盒 y/h 的取值基准 */
function dominantOf(group: PixelBox[]): PixelBox {
  return group.reduce((best, r) => (areaOf(r) > areaOf(best) ? r : best))
}

/**
 * clientRects 行级合并（纯函数）：同形去重 → y 区间重叠且高度可比者聚行簇 →
 * 簇内 x 大间隙断段 → 段合并（x 取并集、y/h 取段内主导矩形）→ 按 (y,x) 文档序输出。
 * 每视觉行一个（或栏断后的数个）矩形：高亮不再叠深、下划线每行一条且底边平齐。
 * [F-A4 行高感知]：可选 lineH（px——PDF 行高，调用方量测注入）在场时聚行
 * 判据改「中心距 ≤ lineH/2」（替代 y 区间重叠率判据）：紧行距（leading ≲
 * 0.75×行盒高——INV-40 登记边界）下 CSS 回退行盒垂直重叠率可达 25% 门槛
 * 而跨行并簇成单高块；以真行高为基准的中心距判据在保持同行动效（上标/
 * 基线偏移中心距 ≲0.25×字号）的同时把紧行距相邻行（中心距=leading ≥
 * ~1.07×字号）判为不同行。缺省=旧行为（受锁单测兼容面）。
 */
export function mergeLineRects(pixels: PixelBox[], pageWidth: number, lineH?: number): PixelBox[] {
  if (pixels.length <= 1) {
    return pixels
  }
  // ① 同形去重
  const unique: PixelBox[] = []
  for (const r of pixels) {
    const dup = unique.some(
      (u) =>
        Math.abs(u.x - r.x) <= DEDUP_EPSILON_PX &&
        Math.abs(u.y - r.y) <= DEDUP_EPSILON_PX &&
        Math.abs(u.w - r.w) <= DEDUP_EPSILON_PX &&
        Math.abs(u.h - r.h) <= DEDUP_EPSILON_PX
    )
    if (!dup) {
      unique.push(r)
    }
  }
  if (unique.length <= 1) {
    return unique
  }
  // ② y 区间重叠聚类（组内 y 区间为成员并集；排序保证同簇连续）——
  //    [F-A4] lineH 在场改中心距判据（头注行高感知；高度可比带两种判据通用）；
  //    [F-V1] pitch（≥2 视觉行可估）在场时中心距阈值取 min(lineH, 行距, 主导高)/2
  //    ——紧凑行距（盒高>行距）下盒高/y 重叠率/膨胀 lineH 均会把相邻视觉行聚进
  //    同簇（跨行杂交并集+丢行，真机 f-v1-diag 实证），实测行距为纲。
  const lh = lineH !== undefined && Number.isFinite(lineH) && lineH > 0 ? lineH : null
  const pitch = estimateLinePitch(unique)
  const sorted = [...unique].sort((a, b) => a.y - b.y || a.x - b.x)
  const rowGroups: PixelBox[][] = []
  const groupTop: number[] = []
  const groupBottom: number[] = []
  for (const r of sorted) {
    const gi = rowGroups.length - 1
    if (gi >= 0) {
      const dom = dominantOf(rowGroups[gi]!)
      const overlapPx = Math.min(groupBottom[gi]!, r.y + r.h) - Math.max(groupTop[gi]!, r.y)
      const yOverlap =
        overlapPx >= Y_OVERLAP_RATIO_MIN * Math.min(r.h, dom.h)
      // [F-V1] 行距自适应上限：lineH 单独在场=F-A4 原口径（lh/2）零变；
      // pitch 在场（含与 lineH 同场）= min(行距, 主导高[, lineH])/2
      const centerLimit =
        pitch !== undefined ? Math.min(pitch, dom.h, ...(lh !== null ? [lh] : [])) : lh
      const centerOk =
        Math.abs(r.y + r.h / 2 - (dom.y + dom.h / 2)) <= (centerLimit ?? 0) / 2
      const hComparable = r.h >= dom.h * HEIGHT_RATIO_MIN && r.h <= dom.h * HEIGHT_RATIO_MAX
      if ((centerLimit !== null ? centerOk : yOverlap) && hComparable) {
        rowGroups[gi]!.push(r)
        groupTop[gi] = Math.min(groupTop[gi]!, r.y)
        groupBottom[gi] = Math.max(groupBottom[gi]!, r.y + r.h)
        continue
      }
    }
    rowGroups.push([r])
    groupTop.push(r.y)
    groupBottom.push(r.y + r.h)
  }
  // ③④ 簇内 x 间隙断段与段合并
  const out: PixelBox[] = []
  for (const group of rowGroups) {
    const dom = dominantOf(group)
    const gapThreshold = Math.max(COLUMN_GAP_H_FACTOR * dom.h, COLUMN_GAP_PAGE_RATIO * pageWidth)
    const byX = [...group].sort((a, b) => a.x - b.x)
    let segment: PixelBox[] = []
    let segRight = Number.NEGATIVE_INFINITY
    for (const r of byX) {
      if (segment.length > 0 && r.x - segRight > gapThreshold) {
        out.push(mergeSegment(segment, pitch))
        segment = []
      }
      segment.push(r)
      segRight = Math.max(segRight, r.x + r.w)
    }
    if (segment.length > 0) {
      out.push(mergeSegment(segment, pitch))
    }
  }
  // ⑤ 文档序
  return out.sort((a, b) => a.y - b.y || a.x - b.x)
}

/** 段合并：x 取并集，y/h 取段内主导矩形（行盒统一基线，下划线底边随之平齐）。
 *  [F-V1] 紧凑行距高度钳制：盒高>实测行距且在高度可比带内（≤2×行距——超出为
 *  旋转/竖排/标题形态，不钳）时输出高钳到行距；y 保持主导矩形不动（受锁断言锚：
 *  y 取主导）。防 14.4px 盒在 11.9px 行距上逐行 2.4px 重叠→下游 INV-D 累积钳制
 *  级联下推 1-12px→matchBand 最近中心带错绑（丢行/杂交/同行双块）。 */
function mergeSegment(segment: PixelBox[], pitch?: number): PixelBox {
  const dom = dominantOf(segment)
  const left = Math.min(...segment.map((r) => r.x))
  const right = Math.max(...segment.map((r) => r.x + r.w))
  const h =
    pitch !== undefined && pitch < dom.h && dom.h <= HEIGHT_RATIO_MAX * pitch ? pitch : dom.h
  return { x: left, w: right - left, y: dom.y, h }
}

/** DOM Range 的客户端矩形；无布局量测（jsdom 未实现/返回空）时退化为命中节点父元素盒 */
function clientRectsBetween(a: DomPoint, b: DomPoint): PixelBox[] {
  const rects: PixelBox[] = []
  try {
    const range = document.createRange()
    range.setStart(a.node, Math.min(a.offset, a.node.data.length))
    range.setEnd(b.node, Math.min(b.offset, b.node.data.length))
    if (typeof range.getClientRects === 'function') {
      for (const r of Array.from(range.getClientRects())) {
        rects.push({ x: r.x, y: r.y, w: r.width, h: r.height })
      }
    }
  } catch {
    // 节点已脱离文档等异常：rects 留空，由 rectsBetweenPoints 兜底零矩形
  }
  if (rects.length === 0 && a.node.parentElement !== null) {
    const parentBox = pixelBoxOf(a.node.parentElement)
    rects.push(parentBox)
  }
  return rects
}
```

### src/renderer/features/reader/annotation-resolve.ts
```
/**
 * [F-A4] annotation-resolve —— 标注渲染重锚与行盒自适应域（自 AnnotationLayer
 * 拆出——组件 ≤250 行红线预裁；票面 §3 拆件结构）。
 *
 * ── 行为层 ──
 * - resolveAnnotationRects：verifyQuote 校正偏移（自愈排版漂移）→
 *   findRangeAtOffset 重算 rects——逐条等价自 AnnotationLayer 原 resolve
 *   闭包迁出（行为零变：失败回退存量，仅显示层不回写库）；
 * - [F-A4 b②] 行盒自适应字形带：重锚 range.textNodes 的 span 实测盒
 *   （gBCR）+canvas 字体度量（measureText 的 actualBoundingBox Ascent/
 *   Descent=墨带实界+fontBoundingBox=回退字体布局带）→ 推算字形带
 *   [字形顶, 基线+descender 尾]（归一化域）——rectStyle band 消费（顶贴
 *   字形顶缘底贴底缘）。无 canvas 2d/度量缺字段（jsdom）→ 空 bands，
 *   渲染回退 F-11 分数路径（缺省兼容）。
 * - [F-A5 a/b] band 单源三消费点：①自绘选区（SelectionLayer evaluate→
 *   SelectionPaint）②标注存量回退（AnnotationLayer 重锚失败路径）③AI 段
 *   （AiAnnotationLayer）经 **bandsNearRects**（rect 集→重叠 span 行簇带）
 *   消费同一 span→带核心（bandFromMetrics+同行近并）——与重锚路径同基准
 *   （票面 §1「行簇字形带推导单源」）。其中自绘选区/AI 段走**节点口径**
 *   bandsForTextNodes（选区/引文自身的 textNodes——免疫 CSS 行盒整体偏移，
 *   真机实锤：小字号紧排文档行盒偏上 ~9px 使几何匹配错绑上一行）；存量
 *   rects 回退（重锚失败无节点可依）走几何口径 bandsNearRects 尽力而为。
 *   RowBand 增 x0/x1（行簇 span 实际端点——a 面自绘块水平界夹取源）。
 * - normalizedLineHeight：textLayer span 的 computed font-size 中位数/
 *   textLayer 盒高（挂 B mergeRects 行高感知 lineH——存量 rects 读时归并
 *   同口径；量测退化→undefined 旧行为）。
 * - matchBand：渲染块→最近中心带（|band.center−rect.center| ≤ rect.h 才
 *   匹配——跨行带不误配）。
 *
 * ── 接口层 ── / ── 架构层 ── / ── 生命周期层 ──
 * - 依赖单向：本模块→anchor-serialize/annotation-anchor（零环）；DOM 访问
 *   只读（gBCR/getComputedStyle/canvas 量测），文本遍历仍唯经
 *   annotation-anchor（F-ARCH4 契约保持）；纯几何 bandFromMetrics/
 *   matchBand 单测直测。
 * - 性能：量测只发生在与输入 rects 重叠的 span 上（gBCR 预筛——拖选节流
 *   200ms 周期内 ~页级行簇量级）；MutationObserver+rAF 合并节奏随宿主
 *   （F-A1 起不变）。
 *
 * ── 文化层 ──
 * - tests/unit/renderer/selection-paint.test.tsx（bandFromMetrics 纯几何+
 *   AnnotationLayer 挂 B 接线）+ F-A5 段（bandsNearRects 三消费点）。
 */
import type { Annotation, AnnotationRect } from '@shared/models/annotation'
import { verifyQuote } from './anchor-serialize'
import { findRangeAtOffset, pixelBoxOf, type PixelBox } from './annotation-anchor'

/** 行簇字形带（归一化域；center=带中心——渲染块匹配键；x0/x1=行簇 span
 *  实际端点——F-A5 a 面自绘块水平界夹取源，缺省=该带无端点量测） */
export interface RowBand {
  top: number
  bottom: number
  center: number
  x0?: number
  x1?: number
}

/** 重锚结果（id → { rects, bands }；缺项回退存量 rects 由消费方兜底） */
export interface ResolvedAnnotation {
  rects: AnnotationRect[]
  bands: RowBand[]
}

/** span 字体度量（canvas measureText 产物——墨带实界+回退字体布局带） */
export interface SpanMetrics {
  ascent: number
  descent: number
  fontAscent: number
  fontDescent: number
}

/** 纯几何：span 盒+字号+字体度量+归一化基准 → 字形带。
 *  基线=盒顶+半前导+回退 ascent（半前导=(行盒高 fs−布局带高)/2，**负值合法
 *  不钳 0**——line-height:1 下回退字体内容区（asc+desc）溢出行盒，CSS 把
 *  溢出按负前导对称分布，基线随之下沉；钳 0 会使带整体下偏 ~|半前导|px，
 *  真机 diag-20260831 实锤 +4~5px）；字形带=[基线−墨带 ascent, 基线+墨带
 *  descent]。带高 ≤0/非有限/base 退化 → null。 */
export function bandFromMetrics(
  span: PixelBox,
  fs: number,
  m: SpanMetrics | null,
  base: PixelBox
): RowBand | null {
  if (m === null || base.w <= 0 || base.h <= 0 || !Number.isFinite(fs) || fs <= 0) {
    return null
  }
  const halfLeading = (fs - m.fontAscent - m.fontDescent) / 2
  const baseline = span.y + halfLeading + m.fontAscent
  const top = (baseline - m.ascent - base.y) / base.h
  const bottom = (baseline + m.descent - base.y) / base.h
  if (!Number.isFinite(top) || !Number.isFinite(bottom) || bottom <= top) {
    return null
  }
  return {
    top: Math.min(1, Math.max(0, top)),
    bottom: Math.min(1, Math.max(0, bottom)),
    center: (top + bottom) / 2
  }
}

/** 渲染块 → 最近中心带（|Δcenter| ≤ rect.h 才匹配；bands 空→undefined；
 *  返回含 x0/x1（在场时）——F-A5 a 面自绘块水平界夹取源） */
export function matchBand(bands: RowBand[] | undefined, r: AnnotationRect): { top: number; bottom: number; x0?: number; x1?: number } | undefined {
  if (bands === undefined || bands.length === 0) {
    return undefined
  }
  const c = r.y + r.h / 2
  let best: RowBand | null = null
  for (const b of bands) {
    if (best === null || Math.abs(b.center - c) < Math.abs(best.center - c)) {
      best = b
    }
  }
  return best !== null && Math.abs(best.center - c) <= r.h
    ? { top: best.top, bottom: best.bottom, x0: best.x0, x1: best.x1 }
    : undefined
}

/** canvas 2d 量测上下文（模块级缓存——只缓存成功获取：jsdom 未 mock 面
 *  返回 null 不入缓存，量测环境就绪（测试 mock 挂上）后下次调用重试） */
let ctxCache: CanvasRenderingContext2D | null | undefined

function measureContext(): CanvasRenderingContext2D | null {
  if (ctxCache === undefined) {
    try {
      const c = document.createElement('canvas').getContext('2d')
      if (c !== null) {
        ctxCache = c
      }
    } catch {
      // 无 canvas 环境——不缓存失败（重试廉价：纯查询）
    }
  }
  return ctxCache ?? null
}

/** span 元素的字体度量（computed font 简写 → canvas measureText）；度量
 *  字段缺/非有限（旧引擎/空文本退化）→ null */
function metricsOf(ctx: CanvasRenderingContext2D, el: Element, text: string): SpanMetrics | null {
  const cs = getComputedStyle(el)
  try {
    ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
    const m = ctx.measureText(text.length > 0 ? text : ' ')
    const out = {
      ascent: m.actualBoundingBoxAscent,
      descent: m.actualBoundingBoxDescent,
      fontAscent: m.fontBoundingBoxAscent,
      fontDescent: m.fontBoundingBoxDescent
    }
    for (const v of Object.values(out)) {
      if (!Number.isFinite(v)) {
        return null
      }
    }
    return out
  } catch {
    return null
  }
}

/** span 字号（computed fontSize px；不可解析→盒高代理——「以行簇 span 实测
 *  盒为基准」的兜底口径） */
function fontSizeOf(el: Element, box: PixelBox): number {
  const px = parseFloat(getComputedStyle(el).fontSize)
  return Number.isFinite(px) && px > 0 ? px : box.h
}

/** span → 行簇带（F-A5 单源核心：实测盒+canvas 字体度量→字形带+span 端点；
 *  无量测（jsdom 桩面盒高兜 1）/退化 → null） */
function spanBandOf(ctx: CanvasRenderingContext2D, el: Element, text: string, base: PixelBox): RowBand | null {
  const box = pixelBoxOf(el)
  if (box.h <= 1) {
    return null // 无布局量测（jsdom 桩面 h 兜 1）——渲染回退分数路径
  }
  const band = bandFromMetrics(box, fontSizeOf(el, box), metricsOf(ctx, el, text), base)
  if (band === null) {
    return null
  }
  return { ...band, x0: (box.x - base.x) / base.w, x1: (box.x + box.w - base.x) / base.w }
}

/** 同行近并：中心距在带高内并为一带（行簇单带；x0/x1 取并集端点——F-A5） */
function mergeNear(bands: RowBand[], band: RowBand): void {
  const near = bands.find((b) => Math.abs(b.center - band.center) <= band.bottom - band.top)
  if (near === undefined) {
    bands.push(band)
  } else {
    near.x0 = Math.min(near.x0 ?? band.x0 ?? Number.POSITIVE_INFINITY, band.x0 ?? Number.POSITIVE_INFINITY)
    near.x1 = Math.max(near.x1 ?? band.x1 ?? Number.NEGATIVE_INFINITY, band.x1 ?? Number.NEGATIVE_INFINITY)
  }
}

/** [F-A5 b 定向修] textNodes → 行簇字形带（**节点口径**——带绑定不经几何
 *  匹配，免疫 CSS 行盒整体偏移：真机实锤小字号紧排文档上 Range 行盒比
 *  pdf.js span 盒整体高 ~9px，几何最近中心会把带绑到上一行=图2 下偏根因。
 *  消费方：标注重锚（resolveAnnotationRects）+自绘选区（SelectionLayer
 *  evaluate）+AI 段（AiAnnotationLayer resolve）；span 去重+同带合并；
 *  无 canvas/量测退化（jsdom）→ []） */
export function bandsForTextNodes(nodes: Text[], base: PixelBox): RowBand[] {
  const ctx = measureContext()
  if (ctx === null) {
    return []
  }
  const bands: RowBand[] = []
  const seen = new Set<Element>()
  for (const n of nodes) {
    const el = n.parentElement
    if (el === null || seen.has(el)) {
      continue
    }
    seen.add(el)
    const band = spanBandOf(ctx, el, n.data, base)
    if (band === null) {
      continue
    }
    mergeNear(bands, band)
  }
  return bands
}

/** [F-A5] rect 集 → 行簇字形带（三消费点公共面：自绘选区/标注存量回退/AI 段）。
 *  只量测与任一 rect（归一化域→px 域）双向重叠的 span（gBCR 预筛——拖选节流
 *  周期内成本=选区行簇量级）；基准=textLayer 盒（rects 归一化同源）。
 *  无 canvas/无量测 span（jsdom）→ []（消费方回退原样/F-11 分数）。 */
export function bandsNearRects(textLayer: HTMLElement, rects: AnnotationRect[]): RowBand[] {
  if (rects.length === 0) {
    return []
  }
  const ctx = measureContext()
  if (ctx === null) {
    return []
  }
  const base = pixelBoxOf(textLayer)
  if (base.h <= 1) {
    return []
  }
  const pxRects = rects.map((r) => ({
    x: r.x * base.w + base.x,
    y: r.y * base.h + base.y,
    w: r.w * base.w,
    h: r.h * base.h
  }))
  const bands: RowBand[] = []
  for (const span of Array.from(textLayer.querySelectorAll('span'))) {
    const g = span.getBoundingClientRect()
    if (g.height <= 1 || g.width <= 1) {
      continue
    }
    const overlaps = pxRects.some(
      (p) => g.y + g.height > p.y && g.y < p.y + p.h && g.x + g.width > p.x && g.x < p.x + p.w
    )
    if (!overlaps) {
      continue
    }
    const band = spanBandOf(ctx, span, span.textContent ?? '', base)
    if (band === null) {
      continue
    }
    mergeNear(bands, band)
  }
  return bands
}

/** 重锚+行盒自适应（AnnotationLayer 挂 B 宿主调用；逐条等价迁出+band 增量） */
export function resolveAnnotationRects(args: {
  textLayer: HTMLElement
  annotations: Annotation[]
  page: number
}): Record<string, ResolvedAnnotation> {
  const { textLayer, annotations, page } = args
  const next: Record<string, ResolvedAnnotation> = {}
  const base = pixelBoxOf(textLayer)
  for (const a of annotations) {
    if (a.page !== page || a.quoteText.length === 0) {
      continue
    }
    const at = verifyQuote(textLayer, {
      prefix: a.prefixText,
      quote: a.quoteText,
      suffix: a.suffixText,
      start: a.startOffset
    })
    if (at === null) {
      continue
    }
    const range = findRangeAtOffset(textLayer, at, at + a.quoteText.length)
    if (range !== null && range.rects.length > 0) {
      next[a.id] = {
        rects: range.rects,
        bands: bandsForTextNodes(range.textNodes.map((t) => t.node), base)
      }
    }
  }
  return next
}

/** textLayer 行高（归一化域——挂 B mergeRects lineH；span 字号中位数/盒高）。
 *  量测退化（盒高兜 1 的 jsdom 桩面）→undefined 旧行为。 */
export function normalizedLineHeight(textLayer: HTMLElement): number | undefined {
  const base = pixelBoxOf(textLayer)
  if (base.h <= 1) {
    return undefined
  }
  const sizes: number[] = []
  for (const span of Array.from(textLayer.querySelectorAll('span'))) {
    const px = parseFloat(getComputedStyle(span).fontSize)
    if (Number.isFinite(px) && px > 0) {
      sizes.push(px)
    }
  }
  if (sizes.length === 0) {
    return undefined
  }
  sizes.sort((x, y) => x - y)
  return sizes[Math.floor((sizes.length - 1) / 2)]! / base.h
}
```

### src/renderer/features/reader/annotation-style.ts
```
/**
 * 标注呈现公共样式 —— 色板变量与中文标签的单一出处。
 *
 * 消费方：ReaderToolbar 色点 / SelectionLayer 工具条 / AnnotationLayer 色块
 * （第 3 处需求触发抽取，Rule of Three）。取色只允许走 theme.css 的
 * --annotation-* 变量（与 shared/constants 的 ANNOTATION_COLORS 一一对应），
 * 禁止散落硬编码色值。
 */
import type { AnnotationColor, AnnotationKind, AnnotationRect } from '@shared/models/annotation'
import type { CSSProperties } from 'react'

export const COLOR_SWATCH: Record<AnnotationColor, string> = {
  yellow: 'var(--annotation-yellow)',
  green: 'var(--annotation-green)',
  blue: 'var(--annotation-blue)',
  red: 'var(--annotation-red)',
  purple: 'var(--annotation-purple)'
}

export const COLOR_LABEL: Record<AnnotationColor, string> = {
  yellow: '黄',
  green: '绿',
  blue: '蓝',
  red: '红',
  purple: '紫'
}

/** F-11 下偏修正：顶/底收边比例（占矩形高）——clientRects 行盒贴的是 CSS
 *  回退字体墨带而非 PDF 真实字形带：量测实锤（scripts/audits/r2-f11-out，
 *  真机 6.38px 行）底缘悬至基线下 ~1.5px（回退 sans 的 descent 带=「标注
 *  下偏」真身）、顶缘高出字形顶 ~1.3px。顶收 10%/底收 12% 后高亮带≈
 *  [字形顶, 基线+descender 尾]；下划线底缘同口径。持久化 rects 数据零改
 *  （纯渲染侧），划选保存/重锚两路径同走本单点。
 *  [F-A4 b②] 定值分数=缺省兜底路径：渲染侧行盒自适应 band（该行簇 span
 *  实测盒+canvas 字体度量推算的字形带——annotation-resolve 注入）在场时
 *  顶贴字形顶缘底贴底缘（用户理想状态「矩形高度与位置匹配文字」）；band
 *  缺省（存量 rects/不可量测环境/jsdom）回退本分数语义。 */
const TRIM_TOP = 0.1
const TRIM_BOTTOM = 0.12

/** [F-A4] 行盒自适应字形带（归一化域顶/底——annotation-resolve 产出） */
export interface GlyphBand {
  top: number
  bottom: number
}

/** 百分比串（4 位小数舍入——吞浮点尾差，产干净内联样式值） */
function pct(v: number): string {
  return `${Number((v * 100).toFixed(4))}%`
}

/** [F-A5] band → 垂直几何（top/height 百分比——三消费点同源映射：
 *  rectStyle 标注块/SelectionPaint 自绘块/AiAnnotationLayer AI 段） */
export function bandVertical(band: { top: number; bottom: number }): { top: string; height: string } {
  return { top: pct(band.top), height: pct(band.bottom - band.top) }
}

/** [F-A5 a 面] 自绘块水平界=行簇 span 实际端点：rect 越出簇 [x0,x1] → 左右
 *  夹入（票面 §0a「水平左右越出文字区」根治）；端点缺省/退化 → 原样透传 */
export function clampedHorizontal(
  r: AnnotationRect,
  band?: { x0?: number; x1?: number }
): { left: string; width: string } {
  if (band?.x0 === undefined || band.x1 === undefined || band.x1 <= band.x0) {
    return { left: `${r.x * 100}%`, width: `${r.w * 100}%` }
  }
  const left = Math.max(r.x, band.x0)
  const right = Math.min(r.x + r.w, band.x1)
  if (right <= left) {
    return { left: `${r.x * 100}%`, width: `${r.w * 100}%` }
  }
  return { left: `${left * 100}%`, width: `${(right - left) * 100}%` }
}

/** kind+color+归一化矩形 → 色块样式（自 AnnotationLayer 迁入——组件行数
 *  防线；[F-A5/ADR-0019 R2] 色块=背景板语义：canvas 透明底墨带恒在色块上
 *  （文字纯黑），色块 normal 混合不透明；下划线为收边后底缘 2px 实条）。
 *  band 在场=行盒自适应（F-A4 b②：highlight 顶=band.top/高=band.bottom−
 *  band.top——F-A5 起经 bandVertical 单源；underline 实条贴 band.bottom
 *  上方 2px）；缺省=F-11 分数路径。 */
export function rectStyle(
  kind: AnnotationKind,
  color: AnnotationColor,
  r: AnnotationRect,
  band?: GlyphBand
): CSSProperties {
  const base: CSSProperties = {
    left: `${r.x * 100}%`,
    width: `${r.w * 100}%`,
    background: COLOR_SWATCH[color],
    pointerEvents: 'auto',
    cursor: 'pointer'
  }
  if (kind === 'underline') {
    return {
      ...base,
      top: band !== undefined ? `calc(${pct(band.bottom)} - 2px)` : `calc(${(r.y + r.h * (1 - TRIM_BOTTOM)) * 100}% - 2px)`,
      height: '2px',
      opacity: 1
    }
  }
  if (band !== undefined) {
    return {
      ...base,
      ...bandVertical(band),
      opacity: 1
    }
  }
  return {
    ...base,
    top: `${(r.y + r.h * TRIM_TOP) * 100}%`,
    height: `${r.h * (1 - TRIM_TOP - TRIM_BOTTOM) * 100}%`,
    opacity: 1
  }
}
```

### src/renderer/features/reader/text-layer.css
```
/**
// b3: P7-F
 *
 * [SR-RDR-03] 文本层样式 —— 提取自 pdfjs-dist 4.10.38 官方 web/pdf_viewer.css 的
 * .textLayer 规则（逐字保留；官方 .highlight 系列、.highlighting、编辑器规则与
 * 6 个 :root 变量块未提取——后者会把全局自定义属性泄漏进应用主题 theme.css）。
 *
 * 纪律：
 * - 升级 pdfjs-dist（须 ADR + [dep-change]）时必须重新提取并核对 diff；
 * - 本文件只允许被 TextLayer.tsx 引入（官方 CSS 唯一入口，见其架构层）；
 * - --scale-factor 不在此定义：由 TextLayer 组件按当前缩放内联设置在容器上
 *   （官方 :root 默认值 1 仅是兜底，运行时真实缩放才是正确值）；
 * - [SR2-F-06] ::selection 偏离官方：半透明→不透明近似色（官方重叠 span
 *   叠绘加重缺陷，验收 §2C）。真机实证 Chromium 对 ::selection 不解析
 *   color-mix 行，computed/生效值取级联 fallback 行——故 fallback 行同步改
 *   不透明（官方 rgba(0 0 255 / 0.25) 压白底的合成等效色）。
 * - [SR2-F-07] ::selection 再改 transparent（F-06 不透明近似色只对纯白底成立，
 *   页底有黑字即遮字——文本层 span color:transparent，字形由 canvas 渲染在
 *   文本层之下，透字必须靠半透明背景；F-06 原始缺陷 C（重叠 span 逐层叠绘
 *   加重）由划选视觉反馈整体移交 SelectionLayer 自绘选区块解决——单层单绘
 *   天然不叠深，原生高亮不再承担视觉反馈故置透明）。
 * - [SR2-F-08] 反转 F-06/F-07 处置，回退官方半透明（ADR-0019 划选视觉反馈
 *   原生路线）：根因=自绘层 30% accent 合成 rgb(191,207,220) 近乎不可见+
 *   拖选期零反馈（视觉通道机制病，非性能/几何）；::selection 恢复官方
 *   rgba(0 0 255 / 0.25) 逐字值（pdfjs-dist web/pdf_viewer.css 678-685 行；
 *   Chromium 不解析 ::selection 的 color-mix——官方第二行不抄）。自绘层
 *   SelectionRects 整体删除（P10 方案切换=删旧方案）。
 * - [SR2-F-09] 选中色蓝→灰（用户令 2026-08-29：仿 WPS——灰色选中/标注纯色）：
 *   rgba(0 0 255 / 0.25)→rgba(0 0 0 / 0.30)（白纸合成≈#B3B3B3，黑字可读）。
 *   偏离官方值的显式登记=ADR-0019 补记+INV-37 同步；标注纯色面零改
 *   （AnnotationLayer 纯色板+容器级单次 multiply 已达标——v5 核查像素实证
 *   行界带无叠乘，scripts/audits f1-forensics5 在档）。原生渲染语义不变
 *   （拖选第一帧即反馈，零 JS 链路——SR2-F-08 机制保持）。
 * - [R2-F-10] 选中叠标注加深减档：alpha 0.30→0.20（用户令 2026-08-29 图二
 *   「灰选中与黄标注重叠处加深难看」）。机制=灰选中(textLayer z:0)在标注
 *   multiply 层(z:5)之下——黄×灰逐通道相乘成暗橄榄；alpha 降至 0.20 后白底
 *   合成 #CCCCCC（仍清晰可辨，F-08「选中不可见」红线不回退），叠黄合成
 *   rgb(202,179,57) 较 0.30 的 rgb(177,157,50) 提亮一档。ADR-0019 补记同步。
 * - [F-A4] ::selection 再改 transparent（ADR-0019 R1 修订——票面 §0a 用户
 *   根治令）：官方 pdf.js 已知缺陷（issue #17561 同族）——文本层逐 span 绘制，
 *   pdf.js span 行盒=CSS 回退字体度量，相邻行垂直重叠处 0.20×2≈0.36 逐层
 *   叠深；CSS 层无解，唯一根治=自绘并集层（SelectionLayer→selection-paint，
 *   归并产物单层单绘，用色即本灰 0.20——R2-F-10 观感随迁）。SR2-F-08 当年
 *   删自绘的两病根已解：拖选零反馈→selectionchange 200ms 防抖路径在场驱动
 *   自绘层；30% accent 近不可见→观感灰在案。
 */
.textLayer{
  position:absolute;
  text-align:initial;
  inset:0;
  overflow:clip;
  opacity:1;
  line-height:1;
  -webkit-text-size-adjust:none;
     -moz-text-size-adjust:none;
          text-size-adjust:none;
  forced-color-adjust:none;
  transform-origin:0 0;
  caret-color:CanvasText;
  z-index:0;
}

.textLayer :is(span,br){
    color:transparent;
    position:absolute;
    white-space:pre;
    cursor:text;
    transform-origin:0% 0%;
  }

.textLayer  > :not(.markedContent),.textLayer .markedContent span:not(.markedContent){
    z-index:1;
  }

.textLayer span.markedContent{
    top:0;
    height:0;
  }

.textLayer span[role="img"]{
    -webkit-user-select:none;
       -moz-user-select:none;
          user-select:none;
    cursor:default;
  }

.textLayer ::-moz-selection{
  background:transparent;
}

.textLayer ::selection{
  background:transparent;
}

.textLayer br::-moz-selection{
    background:transparent;
  }

.textLayer br::selection{
    background:transparent;
  }

.textLayer .endOfContent{
    display:block;
    position:absolute;
    inset:100% 0 0;
    z-index:0;
    cursor:default;
    -webkit-user-select:none;
       -moz-user-select:none;
          user-select:none;
  }

.textLayer.selecting .endOfContent{
    top:0;
  }
```

### src/renderer/features/reader/page-layer-z.ts
```
/**
 * [F-A5 c 面] page-layer-z —— 页内层 z 序常量单源（ADR-0019 R2 修订：色块
 * 垫底当背景板——用户令 2026-08-31「涂色的渲染应该在最下方当背景板而不是
 * 影响文字的颜色」）。
 *
 * 层序（自下而上）：
 * 1. textLayer（官方 css z0——span 透明，纯手势/锚定面，视觉零参与）；
 * 2. 标注/AI 色块层（colorBlocks——**背景板**：pdf.js canvas 以透明底渲染
 *    （PdfPageCanvas background rgba(255,255,255,0)），墨带恒在色块之上，
 *    文字纯黑不被染；multiply 摘除（normal——半透明 alpha 语义随令））；
 * 3. canvas（页墨带——z 上于色块、下于自绘层；pointer-events:none 明纸
 *    穿透，标注 rect 点击/文本划选手势零回归）；
 * 4. 自绘选区层（selectionPaint——选区交互视觉保持最上，票面 §0c/S4：
 *    灰块视觉在色块上）。
 *
 * 比较域：PageBox 页内容容器（h-fit）isolation:isolate——四层比较封闭在
 * 单页内，跨页互扰不可能。弹层（菜单 z-20/编辑器 z-20/工具条 z-10）在页盒
 * 兄弟位，天然高于本域诸层。
 */
export const PAGE_LAYER_Z = {
  /** 官方 text-layer.css 的 z0（内联同值显式化——序单源防漂移） */
  text: 0,
  /** 标注/AI 色块（背景板——垫在 canvas 墨带之下） */
  colorBlocks: 1,
  /** PDF 渲染 canvas（透明底墨带） */
  canvas: 2,
  /** 自绘选区层（交互视觉最上） */
  selectionPaint: 3
} as const
```

## §F 候选稿（GLM 起草——非真相源，供复核/改写/推翻）

# F-A6 设计文档：划选渲染错乱（D1）+ 拖选卡顿（D2）根治

路径：`docs/design/2026-09-03_f-a6-selection-root-fix.md` · 日期 2026-09-03 · 状态：主控终裁毕（对抗审 PASS_WITH_WARNINGS 零 BLOCKING，五 WARN 六 NIT 已消化——审查档 scripts/audits/f-a6-design-review.md）· **待用户过目方案（§0 拍板三点）** · 上游：tickets/registry.ts:242 · 涉修订：ADR-0019 R3、INV-37 条款、新 INV-58

## §0 一页纸决策摘要

**病根判定（源码级核实，详 §2/§3）**

- **D1（划选灰块锯齿拼接+右侧溢出）**：几何源头=Range clientRects 在异常 text-layer 上本身错，再经 `mergeLineRects` 聚类判据放大——三个子机理全部代码级证实为高概率（高度可比带拆簇/只与末簇比较失联/pitch 估计污染），跨行误并簇的 x 并集=右溢主链；**新增强嫌疑 T1=页旋转 /Rotate≠0（TextLayer duckViewport rotation:0 与 canvas viewport 含 page.rotate 结构性错位，组件自认限制在档）**。markedContent/endOfContent 两个候选**证伪**（本应用 DOM 根本不产生 markedContent span；endOfContent 无文本且 user-select:none）。
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

**c) 归一化基准两盒不重合——证伪（常态）**：基准=pixelBoxOf(textLayer)（SelectionLayer.tsx:137；anchor-serialize.ts:159），宿主=textLayer.parentElement（selection-paint.tsx:50-51）；textLayer=inset:0+显式 width/height=canvas CSS 尺寸（TextLayer.tsx:97-104；text-layer.css:47-61），父盒=div.relative.h-fit（PageBox.tsx:55）——**同盒严格成立，百分比零换算**。残余：旋转页属 span 放置错非基准错（归 T1）。

**d) clientRectsBetween 回退真机可触发——证伪**：回退（annotation-anchor.ts:435-438）仅 getClientRects 缺席/空返回时触发；真机 Chromium 恒实现，空返回仅零文本区间——已被零宽盒预检拦截（SelectionLayer.tsx:127-131）。jsdom 桩面专属。

**markedContent/endOfContent 是否进 collectSpans/Range——预判反驳（两处）**：① getTextContent 未开 includeMarkedContent 且 items 过滤掉无 str 结构项（PdfPageCanvas.tsx:136-137）→**DOM 无 markedContent span**，text-layer.css:75-78 规则在本应用惰性；② endOfContent 无文本节点不进 collectSpans，且 user-select:none（text-layer.css:103-112）不可为选区边界。

**T1 页旋转（新增强嫌疑）**：canvas viewport=pdfPage.getViewport({scale}) 默认含 page.rotate（PdfPageCanvas.tsx:111）；TextLayer duckViewport **rotation:0** 且 rawDims 由旋转后 CSS 尺寸反推（TextLayer.tsx:50-61，限制自认 ：46-48）→文本层坐标系与 canvas 墨带结构性错位；span 落层盒外时（overflow:clip 只裁视觉不裁 gBCR）clamp01 钉边=**整片错乱形态**（比锯齿更剧烈）。与「某 PDF 上」单文档触发的报告特征吻合，列为取证第一判别项。

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
| `src/renderer/features/reader/TextLayer.tsx` | duckViewport 增 rotation 通道（pdfPage.rotate 经 onPageRender 载荷上抛，PdfPageCanvas.tsx:135-140 载荷面加字段；rawDims 改未旋转尺寸） | +~25 |
| `src/renderer/features/reader/annotation-anchor.ts` | mergeLineRects 聚类比较扩到全部簇（annotation-merge.ts:26-28 先例语义）+pitch 滤噪鲁棒化（下限改 0.5×主导高或等价） | +~20（440→~460，≤500 保持） |
| `src/renderer/features/reader/selection-evaluate.ts`（新） | evaluateVisual（快路径：raw range clientRects→同源 merge→缓存 bands）/evaluateFull（现行逻辑**迁移+删 visualOnly 死参面**——onVisual 不再调 evaluate(·,true) 后 SelectionLayer.tsx:103/113/123/129/138-139 分支全死，P10 死代码即删）+拖选会话缓存（span band/fontSize/基准盒）+S9 检测器挂点 | +~170 |
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
- **落地形态**：①视觉通道**不变**（::selection 保持 transparent、自绘并集层保持——本修订区别于 R1/R2 的通道级修订，是通道内调度与管线修订）；②拖选期=快路径（raw selection range clientRects→同一 mergeLineRects+mergeRects→缓存 bands，rAF 对齐 60Hz），settle（mouseup/防抖）=全量评估零变（锚定三元组/保存链权威单点）；③D1 公共面=mergeLineRects 全簇比较+pitch 鲁棒化+TextLayer rotation 通道+S9 降级门（检测偏离→抑制渲染+保存拒绝 toast，INV-02）；④INV-37 调度条款同步（200ms 防抖驱动→rAF 对齐双路），新 INV-58 锁「快路径同管线」。
- **不随修订变化**：锚定三元组/保存链/INV-05 两路径同口径/F-12 触发阈值/选择模式（INV-42）/工具条定位与弹出语义（含拖选中停顿 >200ms 出条）/Escape 语义（INV-37 主体）。
- **已知边界申报**：①快路径用原始选区 range，选区边界落在元素容器（非文本节点）时与 settle 重构 range 有边界贴齐差额——settle 终裁覆盖，拖选期瞬时不计入所存（零宽差额 rect 被 mergeRects W_MIN 滤除，跳变面窄于直觉；但 textNodes 两套枚举口径差一 span 的 band 差由 F-A6-c 票面同帧覆盖断言显式锚）；②拖选会话缓存在 mid-drag zoom 时一帧陈旧（settle 纠正）；③旋转页修复后仍存的畸形文本层走 G2 降级门（拒绝优于错存）；④快路径与全量在 bands 上取同一 spanBandOf 数学但缓存键含基准盒——极端同帧缩放+拖选并发的带值以全量复核为准；缓存键浮点等值点：同布局批次内 gBCR 重复读逐位相同命中成立，ui-scale 补偿浮点残差（1/1.1×1.1≠1 精确）可致跨批次 miss+WeakMap 值内微膨胀（有界于 span 生命周期）；⑤若真机复评 B 案仍有可感卡顿，C 案（拖选原生+settle 接管）为备案单案，禁止与 B 并存（P10 方案切换=删旧）。

## §G 你的交付物
按系统提示词要求产出设计书终稿全文（含对候选稿的处置清单：每处重大改动一行理由）。
