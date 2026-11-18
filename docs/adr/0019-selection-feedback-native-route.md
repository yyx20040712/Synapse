# ADR-0019：划选反馈原生路线（自绘并集层）

日期：2026-08-29 · 状态：已裁决——R3 终态现行：自绘并集层+快慢双路径评估（INV-37/58）

## 背景

划选视觉反馈经历三轮三机制（官方 25% 半透明→不透明近似色→透明+自绘层），
第三轮复测全面失败：拖选全程无反馈（感知延迟 0.5~5s≈拖选时长）+松手后
自绘层 rgb(191,207,220) 级淡色近乎不可见。真机取证（真实库副本+像素差分）
证伪了「O(n) 遍历昂贵」假说（实测 0~0.6ms），锁定根因=**视觉通道机制选择
错误**，非性能、非几何精度——据此初裁回官方原生 ::selection 路线。

其后三轮用户复测各触发一次修订：

- **R1（2026-08-31，用户根治令）**：连续段落选中时多行灰块行交界横向深带
  （重叠部分渲染加深）——根因=官方 pdf.js 已知缺陷（同 issue #17561 族）：
  文本层逐 span 绘制，pdf.js span 行盒=CSS 回退字体度量，相邻行垂直重叠处
  0.20×2≈0.36 逐层叠深。CSS 层无解，唯一根治=自绘并集层。初裁时的两病根
  复核均解：①拖选期零反馈→selectionchange 200ms 防抖路径已在场，拖选期
  自绘层可实时跟随；②淡色不可见→观感灰 rgba(0,0,0,0.20) 在案，白纸合成
  ≈#CCCCCC 清晰可辨。
- **R2（2026-08-31，用户令）**：「涂色的渲染应该在最下方当背景板而不是
  影响文字的颜色」+复测图被高亮文字染成色系暗色（非纯黑）。根因链（真机
  实证）：AI 段层 normal alpha 0.45 罩在 canvas 墨带之上——0.45×色+
  0.55×墨把文字染成暗色；multiply 本身不染纯黑墨（存量标注块内最暗核=0
  实测），但两 multiply 层叠乘与用户「背景板」心智均要求重排。
- **R3（2026-09-03 用户实报，2026-09-04 裁决）**：某 PDF 划选灰块锯齿
  拼接+右侧溢出，拖选反馈一卡一卡；五轮方案后残留，超过「同类缺陷二次
  触发即重构」线，设计文档先行（docs/design/2026-09-03_f-a6-selection-
  root-fix.md）。根因双独立：D1=几何源头在异常 text-layer 上错（自绘层
  照渲=所见即所存的几何源头错）；D2=拖选期 200ms 节流粒度（5Hz 步进）+
  每 tick 全量评估冗余（含与视觉无关的锚定序列化与二次几何往返）。

## 裁决

### 初裁（2026-08-29）：回官方原生 ::selection 路线

初裁理由（时点记录；视觉通道其后被 R1 修订改回自绘并集层，本段按初裁时点保留）：

- 三轮用户反馈痛点（遮字/拖选无反馈/淡色不可见）全部是视觉通道机制病；官方路线唯一已知缺陷（相邻 span 叠绘不均匀）三轮零投诉——接受官方路线：效果缺陷的代价比机制缺陷小一个数量级。
- 原生渲染使划选视觉零 JS 链路，交互路径上少一个「JS 延迟预算」防守面，L7 预算只需守工具条链——复杂度净减。
- 官方半透明蓝 rgb(191,191,255)（B-R=64）在取证像素管线下显著可测，真机复评有客观判据。
- 旧方案删除面：删 SelectionRects.tsx 组件；SelectionLayer 摘除 overlay 计算/渲染与 PendingSelection.overlay（方案切换=删除旧方案）。

1. `text-layer.css` 的 `.textLayer ::selection`/`::-moz-selection` 恢复
   `rgba(0 0 255 / 0.25)`（逐字对照 `node_modules/pdfjs-dist/web/
   pdf_viewer.css:678-685`）；`br` 两规则保持 transparent（官方原样）。
   色值随后两次用户指令调整：蓝→灰 `rgba(0 0 0 / 0.30)`（白纸合成
   ≈#B3B3B3，仿 WPS「灰色选中/标注纯色」）；再因「灰选中与黄标注重叠处
   加深难看」减档 alpha 0.30→**0.20**（白底合成 #CCCCCC 仍清晰可辨，
   叠黄合成 rgb(202,179,57) 提亮一档）。机制不变，仅色值偏离官方；受锁
   reader-text.spec.ts 正则同步（四分量全锁口径）。
2. 划选**视觉**=原生 ::selection（浏览器内建，拖选第一帧即反馈，零 JS
   链路）；mouseup/防抖 evaluate 链仅服务**工具条+保存**——该链取证实测
   耗时 <20ms，工具条出现的验收上限=≤1500ms（L7「交互反馈预算入验收」：
   程序化划选含 200ms 防抖+evaluate 全链，受锁 e2e tests/e2e/
   reader-text.spec.ts 按 1.5s 预算断言工具条可见）。两口径分立：<20ms
   为取证实测耗时，≤1500ms 为验收上限；预算只约束工具条链，视觉通道
   （原生零 JS）不适用。
3. 保留面：AnnotationLayer 单层 multiply（荧光笔语义）与
   AiAnnotationLayer 去 multiply（层间叠乘修复）——与划选视觉通道无关。
4. 划选触发阈值：mouseup 即时评估路径加拖选位移阈值 3px——单击/双击
   （含选词）不出条，真拖选与程序化/键盘选区（防抖路径）不受影响；阈值
   只影响工具条出现，不影响选区本身。
5. Escape 语义：只清组件态（工具条），选区视觉保留至选区真正清除
   （点击/保存/页卸载）——视觉-状态严格同步语义，登记 INV-37。

### R1 修订（2026-08-31）：划选视觉回自绘并集层

- SelectionLayer 渲染 SelectionPaint（selection-paint.tsx，portal 进选区
  所在页盒——z 序在标注层之下），数据=evaluate 管线 mergeLineRects+
  mergeRects 归并产物（与保存 rects 同源——所见即所存）；::selection
  背景改 transparent（text-layer.css）。INV-37 语义随修订（自绘层随选区
  真清除）；受锁测试守卫反转（e2e 由 0 计数改在场断言）。

### R2 修订（2026-08-31）：色块垫底背景板层序+band 单源

1. **pdf.js render 以 `background:'rgba(255,255,255,0)'` 透明底渲染**
   （pdfjs 缺省 `#ffffff` 填充会把垫底色块整页遮死）——墨带成为页内最高
   的「字」，色块从墨带外的透明区透出=真·背景板：文字像素恒 canvas 墨
   （纯黑，像素实测 0），色块对文字零混合。**DOM 字保持官方 transparent
   设计不动**（text-layer.css 零改）：官方透明文本层的存在理由（回退字体
   字形≠PDF 嵌入字形——band 体系的病根本身）使「DOM 字为主体」会引入
   全文档双墨渲染（回退字形叠嵌入字形=发糊）。此为对用户指令修法字面的
   显式偏离，依据=指令意图（文字颜色不受影响）+官方设计保留。
2. **层序常量单源 page-layer-z.ts**（驻 src/renderer/features/reader/
   state/）：textLayer（官方 css z0，TextLayer 内联同值显式化）<色块层
   （标注+AI 同 z1，multiply 摘除=normal）<canvas（z2，pointer-events:
   none 明纸穿透——标注 rect 点击/文本划选手势零回归）<自绘选区层（z3
   最上——用户令「灰块视觉在色块上」，原「灰在黄下」multiply 观感随之
   废止）。比较域=PageBox 页内容容器 isolation:isolate（单页封闭，跨页
   互扰不可能）；白纸承底层=该容器 background（暗色主题下页纸仍白=PDF
   纸面语义）。（2026-09-27 语义演进：承底层/页盒底改消费 --paper 单源
   token——light=白桥接不变/dark=#242830 暗纸/sepia=#f7efdc 奶油纸；夜间
   墨带反色=canvas filter 单点 --canvas-filter〔invert(1) hue-rotate
   (180deg)〕，透明底渲染配方与层序零改——INV-74。渲染侧着色案经裁决
   弃用：无原生 API，需逐页 getImageData 像素后处理，大页性能差+破坏
   renderTask 生命周期。）
3. **band 单源**：span→字形带核心（bandFromMetrics）单源驻
   annotation-resolve；**节点口径**（选区/AI 段/标注重锚各自的
   textNodes→bandsForTextNodes——绑定不经几何匹配）+**几何兜底口径**
   （存量 rects 重锚失败无节点可依→bandsNearRects）两入口同一数学。节点
   口径的必要性=真机实证：小字号紧排文档（6.38px 参考区）CSS 行盒比
   pdf.js span 盒整体偏上 ~9px，几何最近中心匹配会把带绑到上一行。自绘
   块水平界=行簇 span 实际端点夹取（clampedHorizontal）；RowBand 增
   x0/x1。
4. **量测退化回退链保持**：jsdom/无 canvas→空带→行盒原样分数（缺省
   兼容）。
5. 修前/修后真机数字（用户库最小字号篇 6.38px 参考区）：自绘块高/行盒高
   1.38→1.13（对墨高口径 1.57~1.83→~1.1）；块顶 vs 行簇 span 顶
   −7.3~−8.9px（整块上错一行）→0.48px；块底 −4.9~−6.5px（侵入下邻行）→
   +1.5px（desc 尾界内）；水平越界 11.5~281px→2.75px（亚字符级口径差）；
   AI/标注块顶差 0.48px；色块内文字最暗核=0（纯黑）；zoom150 稳定；
   pageerror 0。

### R3 修订（2026-09-04）：拖选视觉调度 rAF 对齐+评估双路径+几何管线加固

设计单源=docs/design/2026-09-03_f-a6-selection-root-fix.md。

1. 视觉通道**不变**（::selection 保持 transparent、自绘并集层保持——
   区别于 R1/R2 的通道级修订，本修订是通道内调度与管线修订）。
2. 拖选期=快路径 evaluateVisual（rAF 对齐 60Hz：首事件即排 rAF leading
   ≤16ms+帧内合帧去重——取代 200ms 节流 5Hz 步进）；settle（mouseup
   即时+防抖 200ms）=全量评估零变（锚定三元组/保存链权威单点）。快路径
   数据链=**R-几何源迁移**主链（page-items.store 直读页项→
   rectsForOffsetRange+基线分组+bandsFromItems——与 settle 同族，INV-58）；
   DOM 量测降为快→全量→DOM 三层回退的末端，回退三因 warn 不静默；bands
   现算不缓存（bandsFromItems 纯函数零布局读——最重样本快路径链 CPU
   <2ms 实测）。
3. D1 公共面：TextLayer rotation 通道修复（duckViewport rotation 通道+
   rawDims 真值化——机理与合成触发均证实）+阶段化决策门复跑形态消除；
   rotation×CropBox 组合面 e2e 覆盖；G2 降级门 active（项盒偏离率 ≥5% 阈
   〔健康页 0~0.12% vs 病理页 25%+ 分界，>4 倍安全边距〕→拖选期
   setPaint(null)+mouseup toast 拒绝，INV-02；右溢 >2px 支=占位阈值，
   随真实复现证据启用——实施期事故中实证拦截过错几何）。
4. INV-37 调度条款同步（200ms 防抖驱动→rAF 对齐双路）；新 INV-58 锁
   「快路径同管线」。
5. **INV-37 语义弱化显式登记（用户裁决 2026-09-03）**：拖选期视觉=
   **所见≈所存**（快路径几何为 settle 权威的瞬态近似，边界贴齐/band 口径
   差额由 settle 同帧终裁覆盖）；**松手及保存时刻所见即所存严格保持**
   （settle 全量为单一权威）。此弱化为本修订的显式代价，登记而非隐含。
6. 落地终态数字（四轮取证对照）：D1 面——健康页块数 42/10/3 逐位不变+
   右溢 0；IoU_x 全样本提升（终轮 0.9999/1/0.9987/1/1，1c2d 分数 view 页
   0.9982→1）；甲乙同链 shift ≤0.01px（按构造）；旋转样本 3 块=行真值
   且零高伪迹块经项几何链构造性消除；CropBox 样本双向平移 x+36.01/
   y−37.40px→0.03/−0.1。D2 面——mutations 7→20（20 次 dispatch 全跟随）；
   间隔中位 200ms→59.5ms（dispatch 节奏 50ms 为界——rAF 帧栅格量化
   50/60 交替在档）；全链 delta 中位降 2.5~3×（最重样本 11.9ms，max
   ≤15.5=帧点等待上界，链本身亚毫秒）；布局读（最重样本）：gBCR 24
   绝对量（1.2/mutation）/gCS 87（−87%）；clientRects 8→1（残余=末尾
   settle 单次全量）——快路径每 tick clientRects/gCS=0。
7. R3 勘误（2026-09-04）：项几何链对 `styles.ascent===0` 声明字体（最重
   样本 27%+ 项）按 0 直消费——该类项盒顶=基线，ascent-0 主导行的行并集
   膨胀（实测 16px vs 真值 9.5px）。取证锚窗含 26.4% ascent-0 项而未
   检出，「健康页逐位不变」结论在混合行形态（正常项主导行盒顶）下真实，
   覆盖声明按此限定表述。修复=ascent≤0→0.8 兜底（缺省常量
   DEFAULT_FONT_ASCENT=0.8 同源——selection+annotation 双链共同缺陷
   修复）。复跑：最重样本 top/multi 多行锚 0.62~0.76→≥0.9942（bottom
   两锚 0.6820/0.6584 不动——非 ascent 根因，归判据分层异形态区），
   ascent 因果面清零。

## 后果

- 正面：拖选即时可见；删一个组件+一段几何换算代码；SelectionLayer 职责
  收窄为「选区→工具条→保存」。
- 历次修订均不变的锚定面：锚定三元组/保存链/INV-05 两路径同口径/触发
  阈值 3px/选择模式（INV-42）/工具条定位与弹出语义（含拖选中停顿
  >200ms 出条）/Escape 语义（INV-37 主体）。
- e2e 守卫（reader-text.spec）：::selection 背景=transparent+自绘块色+
  时窗（INV-37 锚）。
- 已知边界（申报接受）：
  - OCR/扫描整页位图 PDF（不透明光栅全页覆盖）上色块垫底不可见——该类
    文档无文本层即无锚定即无标注可渲染（用户库 9 篇中 1 篇扫描件实证
    不可开卷标注），风险面=空集口径。
  - 矢量 PDF 页面操作符自绘不透明背景矩形（部分导出器/排版工具习惯）
    同型风险——有文本层可锚定可标注，但 canvas 像素不透明白整页遮死
    下层色块（真机仅验用户库无此形态；遇此类文档观感=标注不可见而非
    错位——申报降级接受；回退路径=「色块 z 于 canvas 上+normal」另案）。
  - AI 选中描边随层垫底：描边落 rect 边缘空白区可见，压墨段被墨盖——
    交互反馈弱化。
  - 快路径用原始选区 range，选区边界落在元素容器（非文本节点）时与
    settle 重构 range 有边界贴齐差额——settle 终裁覆盖，拖选期瞬时不计
    入所存（零宽差额 rect 被 mergeRects W_MIN 滤除；textNodes 两套枚举
    口径差一 span 的 band 差由 selection-evaluate.test 同帧覆盖用例显式
    锚）。
  - 项内细分边界=近似值：grapheme 簇比例细分在连字/比例字体下项内选中
    起点可有抖动，项矩形包络兜底，settle 同帧终裁覆盖（RTL/竖排运行时
    触发面为零，单测夹具补验证在档）。
  - mid-drag zoom：无 bands 量测缓存（纯函数现算），缓存陈旧面不适用；
    同帧覆盖断言以 mid-drag zoom 差分形态锚「终态=全量产物」。
  - 旋转/竖排内容跳过 mergeRects 终裁（角度门 |sin(行进角)|<0.35——
    中心 y 聚类对竖排段的桥接修复在档；行间钳制不适用已申报，真实库
    rotate=0 全档零触发）。
  - live range 诱发链（mouseup 后 portal DOM 结构插入诱发原生
    selectionchange→新 rAF 重渲一次）=生产幂等无害（快/全量同族同产物，
    INV-58 等价性吸收）——组件级用例预渲染隔离在档，不锚 e2e。
  - AnnotationLayer 存量重锚域仍走 DOM 量测几何（INV-58 边界外，同族化
    另案排期）。
  - /Rotate≠0 页 [data-page-box] 占位盒未随旋转交换宽高（page.view 未
    旋转口径）与 canvas 渲染盒错配——页框阴影/布局面缺陷（selection
    几何链不受影响：paint 块落 canvas 真盒内），真实库全档 rotate=0
    未显现，另案立案。
- 备案单案：若真机复评仍有可感卡顿，C 案（拖选原生+settle 接管）为备案，
  禁止与现行并存（方案切换=删除旧方案）。
