# AUDIT0 体检 findings 台账(活文档——体检场唯一发现登记处)

> **职能注记（2026-09-19 F-PROC-01 头部声明勘正——survey ⑤）**：本册
> 「唯一登记处」声明自 2026-09-03 后失真——后续体检发现改走
> docs/audits/weak-anchor-register.md（弱锚观察）与批次日志/交接书
> （战役发现）；本册转 AUDIT0 战役（2026-08-30~09-03）历史档+该战役专用
> 登记处，新体检发现不再入册。

> 建立:2026-08-30(v10 §4.3 输出契约)。路径勘误:总报告与取证产物在
> `scripts/audits/audit0-report.md`+`audit0-out/`(scripts/ 取证惯例位),
> 本台账为发现登记与状态跟踪面。
> 条目结构:**编号 / 用户原话(如有,逐句保留=验收级)/ 我的判断(机制
> +证据)/ 定级[B|W|N] / 状态 / 处置**。状态机:已定位→已设计→修复中
> →已修待复测→闭环 / 待排查 / 备案观察。
> 纪律:体检场只登记不修(修复走票);用户反馈=最高优先级。

## 一、用户复测反馈(2026-08-30——最高优先级批)

### F-A1 [B] 标注矩形碎裂+重叠叠深 ——状态:**已闭环(2026-08-30 v11 验收场九项 A 面机器代跑全过)**

- **用户原话**:「多行划选碎裂不齐,上一行与下一行选中示意的矩形重合并
  颜色变深,以及部分字符与前后字符之间矩形重合颜色加深,以及一开始标注
  颜色正常(只给背景上颜色)但后面标注看不清(颜色覆盖在文字表面的
  感觉)」
- **我的判断**:一条跨行划选被存成 7 个互相重叠的色块(实测:2 零宽
  幽灵块 w:0/行内水平交叠 237px/同位重复块/相邻行负间隙 -1.5~-5.5)
  ——multiply 混色下**任何两块相交即叠乘变深**,多层叠至发黑=「盖在
  文字上」感。同模块同类缺陷二次触发(F-11 修对位后形态学缺陷仍在)
  ——重构红线生效。证据:audit0-p1b.json+audit0-report.md F-A1。
- **处置(2026-08-30 已落地)**:三屋票收口——归并器
  `annotation-merge.ts mergeRects` 单源双挂(挂 A=rectsBetweenPoints
  归一化后收口,保存/重锚/手工三路径;挂 B=AnnotationLayer 渲染读时
  归并,存量零迁移渐净);INV-40 登记;新测 13(单测①~⑩+组件挂 B+
  e2e 多行「块数=行数」);变异红证 M1~M5 在档;门一 0B/2W/5N PASS
  (W1 fixture 头注无据声明主控直修/W2 报告勘误)+门二 PASS;**真库
  取证 PASS**(f-a1-verify.json:高亮 7→5 块=行数/零宽 0/间隙全正
  +1.9/两两相交 0/同位重复 0;下划线 4 块同构合规);票面/三报告/
  取证器=scripts/audits/f-a1-*。**已知边界**(INV-40):mergeLineRects
  像素域在 leading≲1.07×字号极端紧行距下跨行并簇成单高块(存量缺陷,
  真实库未触发,后果非叠深)——留后续票。
- **待用户复测**:多行划选观感(行间断缝均匀/无加深条/无盖字感)。
  →**已回收(2026-08-30 验收场)**:主控代跑真鼠标用户路径,六项全过
  ——高亮 3 行恰 3 块/下划线 h=2px 底边平齐/注入旧碎裂形态(7 块)打开
  即归并 3 行+重开 kept 9/9/弹条 400ms/反向三态皆无。证据=
  v11-accept.json+九截图(v11-accept-out/)+验收报告
  docs/audits/2026-08-30_v11-acceptance-report.md。用户肉眼终裁权保留
  (可抽截图推翻)。
- **deepseek 补审追记(2026-08-30 下午,用户裁定补审)**:f-a1-gate1-ds.md
  ——B 零/W8;主控核验(一轮):当 px(实际 32px)>行盒 25.6px=正间隙,「T4 负间隙装配级锚」为虚假声明,
  行间钳制 e2e 锚缺席——开票修 fixture)→**二轮翻案(2026-08-30 T4 探针
  实测)**:头注数值口径错(Range 行盒实测 H≈34.1px 非 25.6px)→Td 24 原始
  负重叠 -2.1px=**T4 锚本成立**;deepseek 沿用错误口径得出相反结论(方法
  论教训:异基座审查的数值断言也会被在档错误数据带偏,结论须对照一手
  实测)。终局处置=fixture 头注勘误(Td 保持 24 原值;H/负重叠/并簇阈
  0.25×H≈8.5px/禁区 Td≤19.2 全实测口径)。W3 消解(消费方判空在档);
  W2 NaN/W4 混页/W5 W_MIN/W6W7 测试面=备案。

### F-A2 [B?] 划选后工具条不弹出 ——状态:**已定位(2026-08-30 复测:非回归,降级 N→联动 F-A3)**

- **用户原话**:「然后选中之后不跳出来窗口了」
- **复测结论(f-a2-retest.json,真鼠标 CDP 两场景对照)**:①干净面拖选
  (无标注覆盖起点)——**工具条正常弹出**(选区 3924 字,viewport 内
  落点,F-12 阈值/SET1 zoom 均不拦);②起点压在既有标注矩形上——
  **选区根本不形成**(selLen=0):mousedown 落在 pointerEvents:auto
  的标注块上,浏览器不发起文本选择→无选区→无工具条。
- **定性**:非回归——AnnotationLayer 头注在档 v1 约束(「矩形上方无法
  发起文本重选——从矩形外起选」)被用户重度标注的测试文档放大(文档
  标注密集,随手起选即压块)。候选根因①「重叠块吞 mouseup」证伪一半:
  归并后块仍在且命中,但吞的是**选区发起**不是 mouseup 冒泡。降级 N
  (设计约束非行为破坏),interim 口径=从矩形外起选。
- **处置**:与 F-A3 选择模式联动票——选择模式下标注层 pointer-events
  全关(选已有标注 vs 新建划选的模式二义由此解);单独微修(如块上
  拖选透传)不采——与 F-A3 语义冲突。
  →**已兑现(2026-08-30 F-A3 落地)**:真机场景 A/B 同点位对照实证——
  常规压块拖选 selLen=0(现状保持)vs 选择模式同点位 selLen=81+工具条
  弹出+保存成功(F-A2 机制面根治)。残留 interim:选择模式下标注不可
  点击(语义如此);空 span 压点需挪起点=边缘体验(见 F-A3 备案)。

### F-A3 [需求] 标注「选择模式」按钮 ——状态:**已闭环(2026-08-30 v14 场三屋+回炉 1,门二 PASS 放行)**

- **用户原话**:「建议新增一个选择模式按钮,选已经建好的标注,其余
  时候标注被选中一部分文字时走正常选中的逻辑,你懂的吧」
- **我的判断**:划选与已有标注重叠的文字时交互意图二义(选标注编辑
  vs 新建标注),显式模式切换是干净解。命中语义建立在 F-A1 归并后的
  「块=行」之上(✅已落地);F-A2 复测进一步定向修法:**选择模式下标注层
  pointer-events 全关**=块上发起划选的阻断解除(F-A2 的 selLen=0
  机制面),常规模式保持现状(点击=菜单)。
- **处置(2026-08-30 已落地)**:三屋票+回炉 1——`TabState.selectionMode`
  (per-tab,可选字段=受锁夹具兼容,消费方 `?? false` 兜底)+
  `setSelectionMode`(updateActiveTab);两层自订阅(AnnotationLayer/
  AiAnnotationLayer rect 条件 `pointerEvents:none`+onClick 守卫兜程序化
  派发+useLayoutEffect paint 前关弹层/清描边);ReaderToolbar「选择模式」
  按钮(aria-pressed+选中态 accent 边框);toggle 语义在 ReaderPage 装配面。
  票面前置态空间表(模式×层交互×工具条三面矩阵+S1~S6 跨格序列);
  新测 selection-mode.test ①~⑧(956=948+8)+变异红证 M1~M5/M2';真机
  三场景全 PASS(f-a3-out/f-a3-verify.json:A 常规压块 selLen=0 负向对照/
  B 选择模式 58 rect 全 none+同点位拖选 selLen=81+工具条+保存/C 切回
  auto+菜单弹出);门一 deepseek 两轮 B0/W1(N2/N4 回炉全 ADDRESSED);
  INV-42 登记。档案:scripts/audits/f-a3-*;待用户复测观感。
- **备案(门一 N 级,不回炉)**:N3 toggle 闭包同帧连点理论 no-op(程序化
  极速场景,真实用户不可达);N5 S5 busy 在途切模式无回归用例(幂等
  依赖既有语义);N6 真机层选择模式点击 rect 零副作用未直测(pointer-
  events+hitTest+jsdom 守卫三层推断成立);标注块中心压空 span 需挪起点
  的边缘体验(浏览器无法在无文本处锚定选区,非功能断)。

### F-L1 [B] 脉络边标签不换行 ——状态:**已闭环(2026-08-30 v11 验收场 B 面机器代跑全过)**

- **用户原话**:「脉络图说明性文字的换行美观排布」+指认位置「AI 笔记
  导入文本, 图上其他文字, 主要是阐述线条逻辑关系的文字吧」;裁决
  「+C」+两保证「**保证布局时脉络标签不重叠遮挡**以及**鼠标悬停可以
  滚动查看未完全显示的文字**」。
- **我的判断**:边 label 渲染为 SVG `<text>`(LineageEdges.tsx:61-66,
  textAnchor=middle)——**SVG text 永不自动换行**,AI 导入的关系阐述
  长文本必然一整行横贯。节点卡已有 foreignObject 换行先例(U2a)。
- **处置(2026-08-30 已落地)**:三屋票+回炉 1 收口——变体 C 换装
  (foreignObject 130×37.05+.lineage-edge-label 类:9.5px 斜体白晕/
  3 行换行)+**防重叠放置器** edge-label-layout.ts(贝塞尔锚+确定性
  偏移序±10lh×dx 五档,节点盒外扩避让,全占位回退声明)+**悬停滚动**
  (g 根原生 wheel 委托:截断标签主动 scrollTop+阻断画布 zoom,未截断
  零拦截)+槽位盒参与 auto-fit;INV-41 登记;新测 13+变异红证
  M1~M5/R1/R2;门一主审+复核双 PASS;**真机取证 PASS**(f-l1c-verify.
  json:注入碰撞源后 5 标签/4 节点两两零相交;截断标签 wheel 后
  scrollTop=16 恰为隐藏量、画布 zoom 无扰)。票面/三报告/取证=
  scripts/audits/f-l1c-*+f-l1-out/。
- **待用户复测**:脉络图长标签观感(换行/不遮节点不互叠/悬停滚动)。
  →**已回收(2026-08-30 验收场)**:主控代跑,两项用户保证全实证——
  ①注入碰撞源(正反双长边+穿越边)后标签两两相交 0/盖节点 0/适应视图
  后标签 6/6 全可见;②截断标签 hover 滚轮 scrollTop=28.8 且画布不缩放,
  短标签滚轮=画布缩放(分流正确);③foreignObject 恒 130×37.05+斜体灰
  字+长标签 3 行截断/短标签完整。证据同 F-A1(v11-accept-out/)。
- **deepseek 补审追记(2026-08-30 下午,两轮)**:f-l1c-gate1-ds.md+
  -ds-round2.md+gate1-final.diff——一轮 B1「diff 与回炉态不一致」经主控
  核验=**取证归档缺陷**(gate1.diff 为回炉前快照,代码已含回炉——HEAD
  实证 dx 五档/主动 scrollTop;归档缺陷:门一 diff 须在回炉落地后重生成
  最终版,本场已补);二轮 B1 消解。**成立备案三条**:W2(碰撞盒按估宽
  而 FO 交互盒恒 130——短标签密集处 wheel closest 可能命中错标签)、
  W4(padding 2px→内容区 33.05px<37.05,3 行实为 2.7 行,CSS 实证)、
  3.3(截断标签滚到边界后继续滚仍吞 zoom 无余量放行);弱 W 两条
  (W3 fit 盒估宽<FO 宽/W1 best-effort 回退无运行时告警);N 五条
  (1px 魔数/dx 差 2px/估宽启发式/斜体度量/test cwd 依赖)。

### F-ARCH1 [B] reader.store closeOne 残留 scrollRequest ——状态:**已修待复测(2026-08-30 修复批落地,门一 deepseek 0B/3W 处置毕)**

- **机制**:closeOne(195-212)清理 tabLoadSeq/inflightOpen/撤销栈/tabs/
  order/activeId,**不清 scrollRequest**(closeAll 走全量复位无此问题——
  单路径残留);消费方(ReaderPage columnScroll)过滤只有 paperId 维度。
  「程序跳页→手动滚→关 tab→重开同 id」四步自然操作→新 tab 吃陈旧信号
  回跳旧页。INV-29 缺 tab 生命周期维度。
- **处置(2026-08-30 已落地)**:closeOne 补信号清理——scrollRequest 条件清
  (paperId 归属,他 tab 在途不误伤)+noteHighlight/aiNoteHighlight 仅关激活
  tab 时清(门一 W-1:关后台 tab 不干扰激活面);新测 4 用例 always-active
  (被关 tab 清/他 tab 保/瞬态清带前置断言/关后台不清激活通知)+变异红证
  2 红;INV-29 增补 tab 生命周期维度。

### F-ARCH2 [?] undo apply 覆盖并发编辑 ——状态:**复核翻案+回归锁落地(2026-08-30)**

- **机制**:undo() 尾部(412)整体列表替换——await runUndo 窗口内用户
  新保存的标注在 store 视图消失(DB 保留,重开回来)。INV-23 busy 互斥
  只覆盖 undo vs undo,未登记 undo vs 普通编辑并发(三盲区之「时序」
  范式案例)。
- **复核翻案(主控勘误)**:undo() 在 await runUndo 后**重新 get()**(401 行),
  apply=基于最新现态的增量应用(filter/map/append 只动涉及 id),同步块内
  无插入窗口——deepseek B2「基于发起时快照」指控**不成立**(教训:核验必须
  读全文,不能只 grep 行号)。**回归锁落地**:reader-store-undo-race.test.ts
  (runUndo 挂起窗口 addAnnotation→undo 落地后保留;门一 W-2 修正 a-1 先入
  列表防恒真)+真快照变异红证 1 红(附变异打偏教训:两行锚点首撞
  markTabError,须用 undo 专属锚点)。INV-23 无需增补(语义未破)。

### F-ARCH3 [B→重构票] ReaderPage 声明漂移+职责膨胀 ——状态:**已闭环(2026-08-30 v13 场三屋+deepseek 门一)**

- **机制**:F-01 头注声称「只装配」但 pageTexts/pageRoots/
  handlePageRender/dropPageState/PageFrame 缓存编排五件套仍在(81-197);
  8 职责叠放;churn 45 天 20 次全项目第一=每个新阅读器行为都在此打补丁。
  声明与实现漂移会让后来者基于「已拆分」假设继续叠加。
- **处置(2026-08-30 已落地)**:三屋票收口——**PagesOverlay.tsx**(122 行)
  持页面缓存注册表七件(PageText/PageFrame/双 useState/换文献清缓存
  effect/handlePageRender/dropPageState/renderPageLayers)逐行原样迁入+内装
  PageColumn 九 props 透传(onPageRender 写/renderPage 读读写同源同居);
  ReaderPage 249→197 行收敛到路由/布局/scroll 装配/fitWidth/快捷键,头注
  「只装配」声明与实现对齐;INV-16 零 pdfjs-dist 直连(类型全走再导出)。
  新测 pages-overlay.test 六用例(挂载条件/量测写入/卸载哨同删 W3/换文献
  清空/身份传导/九 props 透传锚)+变异红证 M1~M4+回炉变异(摘 onReady
  透传→⑥红);门一 deepseek 0B/4W→W1(⑤对短路锁定力不足=对抗推演实证
  摘短路仍全绿→宣称如实降级)/W2(透传盲区→⑥透传锚)回炉双 ADDRESSED,
  W3(票面 reader-scroll 数字笔误 18→2 主控亲验勘误)/W4(raw 证据主控
  亲验)自处置;门二 PASS(七件逐行等价双路径证实)。INV-30 宿主随迁
  已同步(锚定面补 pages-overlay.test③)。票面/三报告/取证=
  scripts/audits/f-arch3-*。

### F-ARCH4 [W] annotation-anchor.ts 476 行逼近红线 ——状态:**已闭环(2026-08-30 v13 场三屋+deepseek 门一)**

- INV-40 归并器收口宿主+锚定三元组序列化同文件;任何锚定格式扩展即越
  红线。处置:主动拆 anchor-serialize.ts(趁早,别在红线边缘做)。
- **处置(2026-08-30 已落地)**:三屋票收口——**anchor-serialize.ts**(187 行)
  收锚定格式与校验域六件(SelectionAnchor/CONTEXT_CHARS/selectionToAnchor/
  probeTextLength/verifyQuote/matchAt)逐行原样迁入(138 行 diff 空实证);
  annotation-anchor 476→339 行回归锚定计算域(DOM 遍历/偏移互转/几何管线),
  原语导出扩面五函数+三类型(collectSpans/fullTextOf/offsetToPoint/
  rectsBetweenPoints/pixelBoxOf+NodeSpan/DomPoint/PixelBox=serialize 合法
  消费面);消费方四文件+受锁测试改向真源 import 不留转发层;INV-40 表述
  不动(挂 A 宿主 rectsBetweenPoints 留 anchor)。TDD=改向先行红(模块不
  存在,全量口径)→绿 948 保持→变异 M1'+M2 红(2/8 用例)+M3 静态咬合
  (六符号零残留+集合等价 28=22+6)。门一 deepseek 0B/1W/4N→W(M1 原案
  摘 root.contains 在 jsdom 结构性不可达——**诊断实证:Selection.addRange
  把反向 range 规范化为 collapsed,防线由 isCollapsed 先兜**)/N4 合并
  处置=存量覆盖缺口登记(见下);N1/N2/N3 三处头注回炉+主控拆述(实现者
  申报 N1/N3 张力:AnnotationLayer 双源消费——主控裁决精确拆述)。
  票面/三报告/取证=scripts/audits/f-arch4-*。
- **新登记存量缺口(F-ARCH4-M1 副产物)**:selectionToAnchor 的
  root.contains 防线(选区跨出 root 拒绝)在 jsdom 单测层不可达——受锁
  用例「选区跨出 root→null」实际由 isCollapsed 防线兜住(反向 range 被
  jsdom 规范化),真浏览器按规范 swap 双边界才可达;e2e 无反向选区用例
  ——**该防线真浏览器可达性未锚**,后续可开 e2e 反向选区覆盖票(低优先,
  迁移前即如此非本票引入)。附 N2 口径注记:serialize 的 Range.toString
  按「源码显式遍历」口径不违反 anchor 唯一遍历点纪律(长度探测非遍历)。

### F-ARCH5 [W] ipc 类型回边环 11 处 ——状态:**已闭环(2026-08-30 消环落地)**

- 各 ipc 子模块反向引用装配桶取类型=桶文件类型环(运行时无环);风险=
  视觉污染掩盖真违规+类型环→值环滑坡。**处置(2026-08-30 已落地)**:
  IpcDeps 移 src/main/ipc/ipc-deps.ts 单源,11 子模块改向,index.ts 显式
  re-export 保持引用面;arch-scan cycles 11→**0**(tsc 过)。取证坑:头注
  文档里的 import 字样会被依赖扫描当真边(假环)——文档措辞避免写完整
  import 语句。

**架构批其余备案(2026-08-30)**:W6=INV-19(AI 只读)/INV-07(路径唯一
出口)未锚定无机器防线;W7=PageColumn(INV-29/30/33 三机制宿主)/
SelectionLayer(pending/工具条/选区分离)缺组件级态空间表;N8=
SelectionLayer 跨页划选语义未登记(不确定,需核查 selectionToAnchor);
N10=INV-02 豁免清单(3 处合法 catch)无防线。deepseek 总评在档:
「不变量册描述行为契约,但契约的边界条件(何时失效/清空)往往缺失」。

### F-L2 [B] 适应视图后节点出视口 ——状态:**已闭环(2026-08-30 v14 场三屋+回炉 1,门二 PASS 放行)**

- **现象**:点击「适应视图」后 4 节点仅 3 入 SVG 视口——节点 0bd9a528
  (rect right=1894)超视口(right=1682)约 212px;标签 6/6 全可见不受
  影响。验收口径(§2 第 8 项=标签全可见)不覆盖此面,单独登记。
- **初判(已推翻)**:auto-fit 包围盒疑似未含该节点——**不成立**。
- **根因(2026-08-30 f-l2-probe.mjs 探针实证,真实库副本复刻 B8 场景
  稳定复现)**:**fitViewport 视口量测被 CSS zoom 污染**——SET1 大档
  UI 缩放(html zoom:125%,用户实况,freshUserData 带真实 settings)下
  `svg.getBoundingClientRect()` 返回 zoom 放大后的视觉像素(vw 虚大
  25%),而 SVG 用户坐标系(节点/标签几何)不随 zoom——k=(vw-2·pad)/
  盒宽 的分子虚大→k 虚大(应用 1.3873 vs 按真坐标系重算 1.22)→内容按
  虚大 k 渲染溢出视口右缘。证据:f-l2-out/probe.json——反推节点原始宽
  325/275=档值 260/220×1.25(zoom 实锤)/kMath(反推盒)≠k 应用值/
  tx 反推盒左=BAND_LEFT(-200 参与下限,真坐标 -331<-200 即内容左界,
  非漏节点)。**全部节点均在盒内,数学自洽性被 zoom 破坏**。
- **修复方向(票面素材,排查票不修)**:fitViewport 量测改不随 zoom 的
  口径——候选①svg.clientWidth/clientHeight(zoom 下行为须修票时实测
  确认)②按 getComputedStyle(document.documentElement).zoom 归一
  rect;对偶面:SET1 三档×fit 互检(100% 基准恒等+两非默认档 fit 后
  全节点入视口);involved:lineage-viewport.ts fitViewport+useViewport
  Controller 量测行。
- **处置(2026-08-30 已落地)**:三屋票+回炉 1——**前置实测三问**
  (f-l2-precheck.mjs):clientWidth=本地口径(medium 1381×1.1=gBCR
  1519.6 实证)/computed zoom 可读/事件 clientX=根框 px(CDP 实测不除
  zoom)。修法=三消费点本地口径归一:fit=clientWidth/clientHeight 直取
  (含 jsdom 桩面回退);wheel/pan=根框差×`rootToLocalScale(el,rect?)`
  (比值=clientWidth/gBCR.width,嵌套自动复合零 CSS 耦合)——**修复面
  扩至 wheel 锚点与 pan 增量**(前置实测 Q3 发现同源污染:大档锚点偏
  25%/拖拽快 25%,主控裁同票修)。新测 lineage-viewport-scale.test
  ①~⑤+变异红证 M1/M2+mutn3/mutw2;真机探针 14/14(三档×fit 全节点
  入视口:large 1532.5≤1683 修前溢出 211.75px 场景闭环;pan dtx=80.03
  ≈100×0.8 本地口径);门一 deepseek 两轮 B1/W6/N4(W-2 同帧双读+N-3
  守卫组合回炉落地;B-1 e2e 归收口主控);门二 PASS。INV-43 登记。
  档案:scripts/audits/f-l2-{ticket,impl.report,gate1-ds,gate1-r2-ds,
  gate2-report}+f-l2-fix-verify.mjs+f-l2-out/。
- **备案(门一 W/N 级)**:W-1 fit 回退分支真机不可达性未证(「不劣于
  修前」接受);W-3 pan 每 move 双量测读(瞬态频率可受);W-4 档位切换
  中拖拽单帧比值错配(设置面板异视图不可达);W-5 探针 B 传递链靠纯函数
  锁(A 三档兜底);W-6 嵌套 zoom 复合无真机场景(④数学锁);N-4 挂载
  早期时序与修前等同。
- **新发现备案(修票过程)**:①**SET1 档位切换不自动 refit**(fit effect
  deps 无 uiScale——切换档位后需手动点「适应视图」;修前修后同此行为
  非本票引入;候选小票:uiScale 变化→resetFit)——**→F-L4 已闭环
  (2026-08-31,见下;主控裁决如实降级:App 页面互斥使「挂载中换档」
  用户路径不可达,F-L4 真值面=resize/侧板+未来结构保险)**;②reader 侧同型量测面
  未排查(PDF 列反向补偿在档自洽,如后续 SET1 档位下发现阅读器几何异常
  另开票);③precheck 伪复测教训:resetFit 在 userInteracted 已 false
  时 setState 同值→React bail——探针测 refit 须先 wheel 置位。

### F-L3 [?] 保存高亮链后阅读区滚动位漂移 ——状态:**排查闭环(2026-09-02 v20 场——不可复现,双重证据)**

- **现象**:F-A3 真机探针场景 B——点「高亮」保存前后滚动容器
  (阅读区 .overflow-auto)scrollTop 9971→12113,漂移 +2142px
  (f-a3-out/f-a3-verify.json B_selectionMode.scrollTop)。对断言无影响
  (探针已用滚块进视口手法兜住),但用户语义=保存标注后视口跳走两屏。
- **候选源(未定位)**:Playwright click 的 scrollIntoView(工具条按钮
  定位)或保存链内程序滚动(标注保存后 rects 重锚/页列重排触发)。
  排查时先区分:真鼠标点击无 Playwright scrollIntoView——若真机手工
  复现同样漂移则非工具面。
- **排查处置(2026-09-02)**:双路证据闭环——
  ①**静态面**(GLM5.3 只读子代理 1.46M tok 全枚举):renderer 全部
  scrollTop 写入点逐一读链,**保存链(SelectionLayer.save→store→重渲染)
  零滚动写入路径**;重渲染 DOM 变化全 absolute 无布局影响(scroll
  anchoring 无素材);Top1=Playwright actionability(工具面)+Top2=
  原探针坐标错位(cleanPts 旧视口坐标复用——prep selLen=3924 vs B0
  同坐标 599 佐证——探针缺陷非应用缺陷)联合归因;
  ②**动态面**(f-l3-probe.mjs 真实库副本,当前交互形态):双模式对照
  (Playwright click×2 轮+真鼠标直发×1 轮)分段采样 S0→S1/S2/S3
  **全零漂移**(scrollTop 5721.6 三轮同值确定性);f-a3 原脚本复跑
  已过时(F-A4 后工具条交互形态变化,场景 B 卡在弹条前——非 F-L3 证据);
  ③时间线:f-a3 取证(08-30)先于 F-A4 工具条定位改造(08-31,含
  视口夹取修复)——漂移可能为旧工具条定位缺陷或取证面缺陷,已被顺带消除。
  **风险声明**:无针对性红证(不可复现缺陷无法先红);用户真机再现
  「保存后跳两屏」→按 2 次立案线(e2e 通则)处理。产物=
  scripts/audits/{f-l3-probe.mjs,f-l3-out/f-l3-probe.json}+子代理报告
  (会话档)。AUDIT-C 首波输入更新:F-L3 转为竞态排查范式首个实战案例
  (静态全枚举+动态双模式对照方法论样例)。

### F-L4 档位切换(视口尺寸变化)不自动 refit ——状态:**已闭环(2026-08-31 三屋+回炉 1)**

- **现象**:F-L2 修票过程发现——svg 布局盒尺寸变化(uiScale 换档/
  窗口 resize)后 fit 不重触发,需手动点「适应视图」。
- **修法(主控定向,票面 §0 裁决记录)**:ResizeObserver 观察 svg
  布局盒(一阶原因,换档/resize 同源覆盖),回调与既有 fit effect 共用
  同一 doFit(早退链顺序零变);否决候选「uiScale 进 deps」三重缺陷
  (React 子先父后 effect 序量测必读旧档 CSS/resetFit 同值 bail/4 层
  props 穿透)。行为扩面如实声明:窗口 resize 在未交互态也从「不 refit」
  变「refit」(受锁面 grep 无冲突)。
- **闭环**:新测 lineage-viewport-refit.test ①~⑧(963→971=+8,含回炉
  ⑧初始回调幂等/⑦非平凡化)+变异 M1~M5(M5 曾逃逸→夹具收紧 700→500
  x 维紧→红,检出 ②⑦⑧);真机探针 13/13(A-main 换档+重挂载 transform
  逐位=fitViewport 期望(node 直载源码复算)/A-resize RO 端到端/B 门语义
  逐位相等/C 清理/diagnostic cssZoomTriggersRO=true——fallback 判据
  直证不成立,无需候选 A 回炉)。门一 deepseek 两轮(r1 B:0/W:4 放行
  →回炉 W1 useLayoutEffect 竞态消除/W2 探针精确断言/W3 ⑧/W4 ⑦→r2
  四条全 ADDRESSED 终判放行);门二四清单+一全 PASS(含 INV-44 建议,
  已采纳登记)。
- **可达性降级(主控裁决,备案源动机如实修正)**:实现者自裁①发现
  App.tsx:193-198 页面互斥使「挂载中经 settings 通道换档」用户路径
  不可达(票面场景 A 序列缺陷,票面主控担责)——备案动机场景在当前 UI
  结构下用户遇不到;F-L4 兑现面=窗口 resize/挂载中布局变化+未来结构
  变化保险,A-main 顺带锁住「换档后重挂载 mount fit」真实路径(此前无锁)。
- **备案组(后续小票候选)**:①N-r1 测试⑦二次 fireRO 断言弱于注释
  (只对比挂载初始值,受锁面改动走 [locked-change]);②探针固定
  waitForTimeout(900/1200)脆性(慢机误报风险,建议轮询);③挂载初始
  fit 的 clientWidth 直取路径仅由 RO 端断言覆盖(r1-N2)。
- 档案:scripts/audits/f-l4-{ticket,impl.report,gate1-ds,gate1-r2-ds}.
  md+f-l4-gate1{,-r2}-brief.md+f-l4-verify.mjs+raw ×13+f-l4-out/
  f-l4-verify.json。INV-44 登记 docs/invariants.md。

### F-R1 阅读器双页阅读模式(用户需求 2026-08-31)——状态:**已闭环(2026-08-31 三屋+回炉 2)**

- **需求源**:用户直接下令「阅读器增加双页阅读的选项,双页模式下适应
  页面宽度也要适配」。同场需求 1(课题下拉动画上飘改放大)=主控直做
  3 行 CSS 微改(workspace.css ws-pop:translateY(-4px)→scale(0.92)+
  origin top center;无测试面,三屋成本倒挂——主控披露)。
- **修法**:TabState.pageLayout(per-tab 可选+?? 'single',selectionMode
  同型)/geometry 四新函数(既有导出零变)/PageBox.tsx 拆件(PageColumn
  248 行逼满 250 红线)/布局切换轻 effect 重报 basis 不重跑 getPage/
  IO deps 增 layout(自裁⑧:重挂观察非改回收)/pageStep=2。fitWidth
  分母=onReady 布局口径(双页行宽)。
- **闭环**:新测 reader-double-page 16 用例(971→987)+M1~M5+W3 六变异;
  真机探针 17/17 两轮稳定(行宽公式/fitWidth 全列口径 133%/翻面+2 行顶
  Δtop=0/往返位置保持+basis 重报/末行/roots 上界)。门一 r1 B:0/W:6
  /N:3 有条件放行→回炉 1(W1 报告失实/W3 末行 DOM 锁/W4 探针全列口径/
  W5 滚动位+roots)→r2 W3/W4/W5 ADDRESSED+W1 复发+W7 证据面→回炉 2
  (报告数字 529 统一+快照重拍,零功能码)——回炉 2 次用满,证据面终态
  主控亲验。门二四清单+一全 PASS(含 ABI 环境警示:真机探针后
  better-sqlite3 停 Electron ABI 态,裸 npx vitest 假红——**验收一律
  npm run test**,勿信裸 npx)。INV-45 登记。
- **事故与教训**:实现者备份目录复用被二次运行覆盖→6 文件回退→重写
  恢复全量复验(无净损失);教训=一次性时间戳备份目录+还原 diff+回绿
  双验。报告数字两轮失实(500 内→518→529;9/19→8/20)——**行数/计数
  类自查数字必须 wc/实测后落笔**,门二订正披露。
- 档案:scripts/audits/f-r1-{ticket,impl.report,gate1-ds,gate1-r2-ds}.
  md+gate1{,-r2}-brief.md+f-r1-verify.mjs+f-r1-dbg.mjs(一次性诊断)+
  raw/red/mut ×10+f-r1-out/(json+4 png)。提交(收口时补)。

### F-R2 [已闭环] ui-scale≠1 时阅读器程序滚动落点漂移 ——状态:**已修(2026-09-02 v18 U1,verify 126 文件 1081/真机复验落点归位)**

- **现象**:F-R1 探针诊断(f-r1-dbg.mjs+dbg-geom.png)——ui-scale≠1
  (用户 large=1.25)时阅读区反向 zoom 豁免与程序滚动差值法交互致落点
  漂移 160-450px;**单页模式同样复现**(非 F-R1 引入,存量缺陷)。与
  v15 备案「reader 侧同型量测面未排查」呼应——F-L2 同型污染的 reader
  侧实证落地。
- **根因(v18 U1 排查+四探针实证)**:H1=scroll-converge.ts:48 把 gBCR
  视觉差值 1:1 加本地 scrollTop(「1 gBCR px=1 scrollTop px」仅 Z=1
  成立;P1 语义探针:scrollTop+=100→Δst=99.84/Δvis=124.8);落点过冲
  =(Z−1)×δv——fill(4) 双档数值闭合(1.1 档 −204.8 vs 预测 −204.7/
  1.25 档 −512.6 vs −512.25);H4/H5 排除(anchorNone 对照/量级不符);
  H3 证伪(zoom± 往返三 cycle 两档 Δst=0——anchoredScrollTop 分母错配
  无可感缺陷,备案)。H2 同根(scroll-progress getPageBoxes 视觉+本地
  混算——P3b 实证 1.25 档 fill(2) 真中心页=1「页码说 2 画面看页 1」)。
  排查报告=f-r2-explore-report.md;探针=f-r2-out/{f-r2-probe,f-r2-probe2}.json。
- **修复(方案 B 算术折算,否决 A 结构归一)**:effectiveZoom 单源(**回炉 1
  定案=computed zoom 链乘积——初版 gBCR.height/clientHeight 比值法因 ε≈
  0.0005 亚像素/滚动条污染被弃**,复审 B1 统一口径)+scroll-converge start/
  center elRect 侧除 z+scroll-progress getPageBoxes 同折算(height 同除保
  nearestPage 同空间);clamp 口径不动;签名零破坏。真机复验:1.25 档
  fill(4) 落点偏移 −512.6→−0.6(比值法版)→**±0.2(zoom 链终态,1 档基线
  级)**/dSt=δv/1.25 精确折算/「下一页」旁支(修前 dSt≠δv 特异形态)同根
  归位 −0.2/pageErrors 0。
  测试:先红 6(断言级 H1 数学复现)→126 文件 1081(1074+7)+变异
  M1~M4 全红证 cp 备份法还原 diff 空。门一=Kimi 链首战(kimi-main 504
  两退避→unreachable 换源 kimi-backup 接手——references/06 §5 状态机
  首实战;B:0/W:1/N:6 可收口,W1=e2e 护栏收口侧补跑销项,N3 同源
  亲核销项,INV-34 量纲附注含 N5 口径前提)。B-3 anchoredScrollTop
  备案 v19;N1 guard 分支零覆盖/N2 桩面 z=0 路径=后续单候选。
  票面/实现报告/门一审档:scripts/audits/f-r2-*.md 全套。

### F-R3 [已闭环-排查] pdfjs stream pump 竞态 pageerror ——状态:**排查闭环(2026-09-02 AUDIT-C C-1——实锤+定性噪声型,修复转二波)**

- **现象**:扫描式连开文献(快速连续 openPaper)触发 pdfjs
  `_reader.read` of null pageerror——PdfDocProvider 既有面(流取消
  竞态);常规单开零复现。
- **排查闭环(2026-09-02 C-1 三屋:主控探针 r1~r7+只读子代理 M1 4.11M tok
  +Kimi 门一「修订后采纳」1B/4W/4N+deepseek 门二「条件 PASS」1B/4W/6N
  四放行条件票内全销)**:报告=scripts/audits/f-r3-investigation.md
  (v3);探针=f-r3-probe.mjs(七轮 raw+json 落盘)。
  **实锤**=pdfjs 4.10.38 worker 侧加载泵在 Terminate 置位后的 continuation
  链无终接 catch——destroy 落在流加载/在途请求窗口时,`Error("Worker was
  terminated")`(WorkerMessageHandler 级 ensureNotTerminated 抛)成 worker
  世界 unhandled rejection,仅 CDP 仪表通道可见(renderer/主进程均无接收点
  ——三路否定实证 r6/r7);**定性=噪声型非破坏型**(6/6 轮健康面完好,用户
  路径零 UI 影响;单开 6/6+单次切换净测 3/3 零触发,连开 14%/次+开关循环
  3%/次=相位依赖)。原始 `_reader.read of null` 指纹=同族 P1 TextLayer 泵
  候选(prod 静态闭合+动态零命中;dev StrictMode 面备案)。
  **副产实锤 P6**=CorpusExtractor 加载失败路径丢弃 task 句柄→不 destroy
  →每次失败泄漏一个 worker 线程(头注状态机表「失败也释放」被证伪——文档
  面修正随二波修票)。
  **修法终排**:轨一(治噪声)=e 上游查证/升级唯一消除路径(d 指纹吞并死刑
  ——无接收点;降格产物=主进程 level1 getTextContent 终止警告代理计数
  r7 实证可收);轨二=b destroy 序列化+c CorpusExtractor 失败补 destroy
  (a 共享 workerPort 死刑——4.10.38 Terminate 后 handler 销毁+单
  pdfManager 槽源码实锤)。INV 增补草案随二波修票落定(候选宿主=新 INV
  「pdfjs 文档生命周期销毁序」或 INV-30 增补)。INV-30/INV-16/CorpusExtractor
  R2 裁决均不动摇。
- **处置**:二波修票启动条件已满足(C-1 实锤);修票素材三件(根因/修法/
  INV 草案)见报告 §5,可移交二波执行。

### F-A4 选区视觉并集自绘+标注贴行+工具条定位(用户需求 2026-08-31)——状态:**已闭环(2026-08-31 三屋+回炉 2)**

- **需求源**:用户复测附两图三问(灰块重叠加深是矩形重叠还是管线未适配
  /标注保存后偏移/弹窗离选区太远)+理想状态(矩形高度位置匹配文字/重叠
  不加深)+令调研 WPS/Zotero。**调研结论**:业界两路=mix-blend-mode
  multiply(pdf.js #13353/Apryse/PDF-XChange)与矩形并集(Zotero 自身
  也存在重叠加深,Zotero 论坛在档);native ::selection 无法并集
  (pdf.js #17561 官方缺陷同型)→采**自绘并集**(根治)+黄块墨带基准
  (multiply 已在标注层 INV 在档)。
- **根因三连**(Explore 全链报告):a 灰块=native ::selection 逐 span
  叠绘(行盒=CSS 回退字体度量垂直重叠;钳制只挂保存链 live 零覆盖);
  b 标注偏移=INV-40 紧行距并簇边界+TRIM 定值残余(F-11);c 工具条=
  gBCR 差值被 CSS zoom 双重放大+无视口夹取(挂载盒在补偿子树外)。
- **修法**:a 自绘并集层(selection-paint.tsx portal 进页盒,与保存
  rects 同源=所见即所存)+::selection transparent+**ADR-0019 R1 修订**
  (当年删除病根=拖选零反馈/近不可见,今回炉 1 修复 B1 双路调度:
  自绘 leading+trailing 节流/工具条防抖语义零变——S1b/S1c 双断言+
  MB/MC 变异隔离);b mergeRects/mergeLineRects lineH 行高感知(可选参
  缺省旧行为存档)+rectStyle band 字形带自适应(INV-40 修订在册);
  c 定位差值÷有效 zoom+视口夹取+近顶下翻转。
- **真机对照**(large 档真鼠标,修前/修后):自绘 0→3 块(跨 3 行)相交
  0/并簇 1→3 块分行顶偏 1.48px/工具条距选区 334.1→9.4px/zoom 稳定
  0.67%/黄灰双基准差 3.88px≤4 上界(门一 W2 双基准正式化)。探针 16/16。
- **门审**:门一 r1 B:1/W:5/N:3 回炉(B1 拖选零反馈回归=当年病根复活,
  防抖≠节流)→r2 五点 ADDRESSED+W5/W6 再回炉→回炉 2(W5 如实订正——
  「+4~5px」实为修后初版缺陷态数值且同名覆盖无溯;W6 S1c trailing
  断言,MC 变异仅 S1c 红隔离精确)。门二四清单+一全 PASS(受锁四件
  =语义随令非让过;118 文件 1002 用例+e2e 29/29 亲跑)。
- **同场 T1(需求 1,主控直做+披露)**:theme.css header 44→56px(用户
  增高令,标志/按钮下移+caption 三键 stretch 自动贯通)+ws-pop 动画
  origin top center→center(用户「向右上放大」观察→居中放大)。
  **主控直做漏查受锁断言面**(smoke.spec 三处「header 恒 44」+INV-39
  两处)——实现者隔离实验归因后主控补改 44→56([locked-change]);
  教训:**直做改动同样要 grep 受锁面(测试断言+登记册)**。
- **备案组**:W-G1 e2e 组合顺序时序脆弱性(smoke+reader-text 连跑
  「重开在原位」差 3.45px>2 容差 2/2 红,单文件/CI 全量顺序绿——band
  双态渲染 resolve 落地竞态,终态无回归,遗留池);W-G2 探针 baseline
  初版被 after 版同名覆盖无版本化;W-G3 medianFontSizeBetween 退化
  catch→undefined(方向安全);门一 N2 同。
- 档案:scripts/audits/f-a4-{ticket,impl.report,gate1-ds,gate1-r2-ds}.
  md+gate1{,-r2}-brief.md+gen 脚本×2+f-a4-verify.mjs+f-a4-diag.mjs+
  raw/mut ×14+out/(修前修后 11 png+2 json)。mutation-backup 目录
  =过程产物不提交(还原已验)。ADR-0019 修订+INV-37/40/39 同步。

### F-A5 自绘选区 band 对齐+标注偏移定向+色块背景板层序(用户第二轮复测)——状态:**已闭环(2026-08-31 三屋,门一有条件放行+主控处置)**

- **需求源**:用户第二轮复测图1(选中标记误差偏移——块高 1.5~2 行/水平
  越界)/图2(标注偏移+**涂色当背景板不影响文字颜色**令)。
- **根因修正**(真机 diag 推翻票面假设):图1=自绘层用 CSS 行盒原样
  (行盒比 pdf.js span 盒整体偏上 ~9px→整块绑错上一行);图2 偏移主体=
  **AI 层裸行盒+存量回退无带**(标注带路径真机本就 0.2~0.7px 良好)。
- **修法**:band **节点口径**单源(选区/AI/存量回退三消费点同一
  bandsForTextNodes——绑定不经几何匹配)+水平界=span 簇端点夹取;
  **c 面自裁重大(主控采纳)**:pdf.js 透明底渲染+PAGE_LAYER_Z 常量单源
  (色块 1<canvas 2<自绘 3)+multiply 全摘除——墨带位图字恒最高,像素
  实测色块内文字纯黑 0;ADR-0019 R2 修订(含 W4 补声明:矢量 PDF 自绘
  不透明背景矩形=同型风险,降级接受备案)。
- **真机**:修前 diag(用户库 6.38px 篇,图1 复现 1.57~1.83×)→修后
  13/13(块顶 −7.3~−8.9px→0.48px/高比 1.38→1.13/AI+标注顶差 0.48px/
  纯黑 0/S4/S6/zoom150)。
- **门审**:门一(与 F-N1 合并送审)有条件放行 W1~W5/N1~N2——W1 存量
  回退真机面缺失(主控裁:申报降级,单测在+重锚失败罕见)/W2 跨行多
  span AI 段=既有语义备案/W3 pdf-page-canvas.test 断言(主控亲验扎实,
  材料包曾漏 add)/W4 ADR 边界主控补/W5 S5 判据 15% 退让备案。门二
  四清单+一全 PASS(1018 全绿+受锁改向逐例复核+INV-46 登记)。
- 档案:scripts/audits/f-a5-{ticket,impl.report,gate1-ds}.
  md+gen-gate1-brief.mjs+{verify,diag,inject}.mjs+raw ×10+out/。
  INV-46 登记+INV-37/40 修订。

### F-N1 AI 笔记三段折叠(用户令)——状态:**已闭环(2026-08-31 三屋+B1 回炉)**

- **需求源**:用户「一审/二审/裁决应该可以折叠,一审二审默认折叠」——
  业务意图=裁决结论优先,过程证据(一审/二审)默认收起降噪。
- **实现**:AiNoteGroupList(197 行)段头折叠器(段名+条数+aria-expanded)
  +ROLE_DEFAULT_EXPANDED 单源(一审/二审 collapsed/裁决 expanded)+
  **B1 回炉(门一 B 级)**:点 AI 高亮块→目标条目在折叠段→自动展开该段
  再滚动定位(scrolledForRef 去重防重滚;面板未开不自动开=边界申报)。
- 受锁改向 5 例([locked-change]:ai-notes-section.test 3+e2e AI-08/
  AI-09(实现者自主发现第 4 例)——「默认在 DOM」→「默认折叠+展开后
  同序断言」,语义随令)。
- 档案:scripts/audits/f-n1-{ticket,impl.report}.md(含受锁改向对照+
  B1 段)。

### F-SW1 [?] 切换课题「老问题」(用户图3/4)——状态:**排查闭环(几何/数据链实证正常,现象待用户澄清)**

- 探针(f-sw1-probe/probe2,真实库副本):面板两档几何正常
  (panelUnderBtnX=0 左对齐/不遮按钮/fs 差=root 继承基础值非档位差异
  ——SET1 豁免实际有效);切换数据链正常(切课题后列表随课题数据正确
  变化)。对偶矩阵「切换器面板×zoom 大档字号反差」未验项实质=豁免
  正常,可翻已验。
- 图4「主区空白」最可能=reload 瞬间帧(切换走 window.location.reload
  ADR-0018)或截图时机;**待用户一句话澄清「老问题」具体所指**(空白
  持续?闪烁?其他),再开票。

## 二、复测回收状态(18 项指引,2026-08-30 发出)

| 项 | 面 | 反馈 |
| --- | --- | --- |
| 1-7 | SH3 三键(外观/最小化/最大化/双击/拖动/切换器/关闭拦截) | 未反馈 |
| 8-13 | SET1 三档(即时生效/顶栏恒定/PDF 恒定/持久化/大档溢出/草稿保护) | 未反馈 |
| 14 | F-11 标注贴合 | **反馈=F-A1(碎裂+叠深,非对位)** |
| 15 | F-12 单击不弹条 | **间接反馈=F-A2(反向:划选也不弹了)** |
| 16 | F-10 选中叠标注 | 未反馈 |
| 17-18 | UI1 切换钮/LIB1 网格 | 未反馈 |
| — | 脉络文字(指引外新增) | **反馈=F-L1** |

未反馈项不视为通过;下场复测邀请可二次回收。**F-A1 专项复测指引已发
(2026-08-30 晚,六项——docs/audits/2026-08-30_f-a1-retest-guide.md);
F-L1 用户已裁决变体 C+「防重叠遮挡+悬停滚动」两保证(F-L1-C 三屋
进行中)。**

## 三、历史遗留池并入(原出处编号→台账编号)

| 台账号 | 条目 | 级 | 状态 | 出处 |
| --- | --- | --- | --- | --- |
| F-G1 | multiply 叠色物理上限(灰选中×黄标注=橄榄;F-A1 归并不覆盖此面——那是标注×标注,此是选中×标注) | N | 备案;用户不满意则 backdrop 隔离实验(重开 ADR-0019 风险) | v7 §4 |
| F-G2 | F-11 收边定值 10%/12% 极端字体偏松/偏紧 | N | 备案;F-A1 归并后一并复评 | v7 §4 |
| F-G3 | maximized 态关窗 saveBounds 存大 bounds(恢复大窗非最大化) | **已修** | 2026-09-03 夜场闭环：window-state 增 boundsToPersist(取 getNormalBounds)——maximized 落还原态几何,常态等值零变;bootstrap close 接线+两用例锚+变异红证 | v8 E4 |
| F-G4 | invariants.md 不在受锁集 | N | 备案 | v9 W2 |
| F-G5 | 变异还原 diff 未落档(间接实证) | N | 流程项:此后变异还原也落 .raw.txt | v9 W4 |
| F-G6 | SettingsPage 表单水合前窄窗(固有) | N | 备案 | v9 门二 |
| F-G7 | SettingsPage 244 行(余量 6)——下个设置节必拆 UiScaleSection | **已拆** | 2026-09-03 夜场闭环:UiScaleSection.tsx 自持(73 行,store 直订,先例=CorpusExport 节),SettingsPage 244→209 | v9 |
| F-G8 | SH3 drag 面断言 toContain 未计数 | **已修** | 2026-09-03 夜场闭环:drag 计数锁=恰 1 处(与 no-drag 计数断言对偶;错数 2 红证) | v8 SH3 门一 C9 |
| F-G9 | fullscreen 不反映 maximize 图标 | **已修** | 2026-09-03 夜场闭环:bindWindowStateEvents 补 enter/leave-full-screen 沿(enter→true/leave→回读 isMaximized);TitleBarControls 状态机声明同步(接缝归责);三 payload 用例+变异红证;门一 N1 备案=fullscreen 中三键 toggle 错位(图标反映 Only 票面边界);存疑2 备注=leave 回读时序无真机验证(mock 锚回读语义非事件时序),真机 F11 双击验证留给在场场次 | v8 SH3 门一 C12 |
| F-G10 | P7-A 系统剪贴板竞态 flake | **已修** | v18 U2 闭环（2026-09-02）：清场标记+条件重读防线入 spec（[locked-change]），连跑 3 次 P7-A 全绿 | v8 §2→v18 U2 |
| F-G11 | P7-A 分隔条拖拽（reader-text:568 SplitPane 集成）序列态非确定红：对跑内 1 红（widthAfter−widthBefore=−64/期望 ≥70，拖拽反向/落点错位形态）+单跑×5 全绿——序列依赖签名与 F-R2e 同族；另全量 run3「1 failed」身份未捕获（矩阵循环未 tee 输出，过程失误在档）不计入 | N | 备案观察：确认计数=1，未触同用例 2 次立案线；环境注记=本机前台占用态对真鼠标拖拽面敏感；再现按立案线通则升格 | 六波场 §6 |
| F-R2e | e2e「划选高亮重开原位」序列敏感脆弱面：全量序列第三跑 3.45px 超 2px 容差（同值复现）但单跑绿+U1 收口全量亦绿——窗态持久化/顺序依赖噪声（测试注释自认已知噪声源；R3-RDRSET「间歇红环境波动」前科同族） | N | 备案 v19 观察项：再现 ≥2 次立案（容差/窗态种子隔离两案裁决）。**2026-09-02 注入证伪**：窗态差假说被实测推翻——四档注入（height 799/width 1272/1200×700×2 跑）全绿，rel 归一坐标对窗态差不敏感（归一化设计有效性反获确认，注释无需勘误）；全量 3 连跑 29/29×3 未复现；剩余嫌疑=顺序依赖/负载态（无复现不可定位）；收口后失败计数仍=1，不触发 ≥2 立案线，维持观察 | v18 U2 三连跑+2026-09-02 A-1 探针 |
| ~~F-R2e 续~~ | **2026-09-02 AUDIT-C 首波场第 2 现→立案线触发**：C-2 实现者全量 e2e 首跑，同用例（reader-text.spec :163 y 轴重锚容差）**同值指纹 3.45px>2 再现**（与本票 diff 无因果；单用例复跑绿）——**失败计数=2（同值），触 AGENTS「同用例 2 次=立案」通则，F-R2e 从观察备案升立案**。两现形态一致=全量序列内首现+复跑绿（顺序依赖/负载态嫌疑不变；窗态假说已证伪在案）。**立案处置：排查票排入二波后序列**（优先级低于 C-1 修复/A3——W-5 序插位），首步=全量序列内定位（非单跑形态——单跑绿在案两轮）+指纹矩阵（同值 3.45px 三现即高度锚定 band 双态渲染 resolve 竞态假说） | N→立案 | 2026-09-02 C-2 实现者 e2e 首跑+AGENTS 立案线通则 |
| ~~F-R2e 终~~ | **2026-09-02 六波场攻坚票收案（B 案=未遂如实入档+观察线降回）**：16 个含捕捉断言的跑档上下文（对×2+全量×6+t8 全量×2+多行探针独立×6）3.45 **零再现**，双探针指纹全零漂。机制空间收窄三硬事实：①候选 c（中间轮 resolved）**结构性证伪**——多行 fixture t1~t20 全档 3 span 恒一批入 DOM（spanCount 0→3 一步），pdf.js 文本层批量插入不拆批，零中间轮；②时代考古（39c9cbaec=首现态）bandFromMetrics/rectStyle 数学与当前逐位一致→**首现同不能用候选 a 解释**（时代双态差=4.44；y 差族 {4.44,4.62}±0.8k 组合空间不含 3.45——两历史现均排除）；③双态窗拉伸首测（未证假说→已测事实）：4-5ms(t1)→311ms(t20)，负载态碰撞窗可达数百 ms 但值签名恒差族值、无一撞窗。仅存候选=浏览器 subpixel anchoring（21 上下文 scroll 记录器零观测）+历史环境差（不可回验），应用侧不可控。**W-G1 计数 1 保留（合流暂裁维持）、F-R2e 计数 2 定格；z-r2e+z-wg1 双探针常驻=永久捕捉面，任一未来红一跑定案**。报告=w-g1-investigation.md | 立案→收案（观察线降回） | 六波场攻坚（v26 §2-1） |

## 四、功能对偶矩阵状态(v10 §3.3 续)

已闭环 5 对:SH3 caption×SET1 zoom / SET1 zoom×PDF 页缩放 / zoom×课题
切换 / SET1 大档×F-11 标注对位(2026-08-30 取证:两档数值全同,零
影响)/ **SET1 大档×F-06 划选工具条定位(2026-08-30 F-A2 复测:用户
实况大档 125% 下真鼠标拖选工具条正常弹出——对偶#2 闭环)**。未验剩
6 对:zoom×F-06 其余定位细节(仅弹出版已验,工具条夹取/溢出面未逐项)
/双击最大化×滚动记账/drag 区×键位滚动/UI1 流光×性能/切换器面板×zoom
大档字号反差/关闭拦截弹框×最小化组合/zoom×F-A1 归并后标注(归并后
PDF 页列恒补偿=理论正交,取证面可并入下场复测邀请)。

## 五、体检批次状态

AUDIT-A 静态**已收(2026-08-30 首批六项)**:①行数红线全过(TS 无 >500;
theme.css 591 在档;annotation-anchor 475 贴线——F-A1 新函数已正确放新
文件);②churn 热点=ReaderPage.tsx 19 次最高源码 churn(N 级观察——多轮
阅读器改造集中地);③eslint-disable 零命中;④skip 面积=0(911 passed
(911) 无 skip 尾数);⑤renderer 桩漂移=零活性漂移(三桩手写部分键+`as
unknown as` 断言吞类型——结构性风险在档,建议 tests/utils 按 API_SURFACE
全量生成 stubApi 工具,N 级备案);⑥CSS 断言形态=window-control.test:157
drag 面 toContain 未计数(F-G8 原样在档);theme.test SET1 后已正则/声明
形态锚定。AUDIT-C 竞态/B 对偶/D 数据/E 性能:未启动。

**2026-08-30 晚收口**:执行序三项全落地(F-A1 已修待复测/F-L1-C 已修
待复测含用户两保证/F-A2 定性闭环)。交接书=docs/prompts/
2026-08-30_loop-handoff-v11-acceptance.md(复测九项清单+执行序+
**异基座 deepseek 一审制度化**——用户令:门一默认异基座承担,执行形态
按环境降级三档,回溯面=F-A1/F-L1-C 补审待用户裁定)。

**2026-08-30 验收场收口(v11 §2 执行)**:九项复测**主控代跑全过**
(ALL-PASS)——F-A1/F-L1 翻已闭环;新发现 F-L2(适应视图节点出视口)
登记待排查;验收器 scripts/audits/v11-accept.mjs+产物 v11-accept-out/
+验收报告 docs/audits/2026-08-30_v11-acceptance-report.md。取证坑三枚
入档(注入 rects 须含 page/foreignObject 视觉坐标假象/双栏行采样)。

**2026-08-30 下午场收口(deepseek 补审+架构排查,用户令「继续+系统性
排查避免屎山+一定要调用 deepseek」)**:①F-A1/F-L1-C 补 deepseek 一审
落地(通道=zcode 自定义 provider deepseek-v4-flash 行内调用器
ds-call.mjs;两票 B 级合计零——F-A1 W1 fixture 单位错误实锤开票,
F-L1-C 一轮 B1=取证归档缺陷(diff 回炉前快照)已补最终版二轮消解,
W4 padding 三行实 2.7 行 CSS 实锤);②架构系统性排查=机器面
arch-scan.mjs(167 文件:红线全过/零孤儿/零重复/分层零违例)+异基座面
arch-review-ds.md——**三条 B 级实锤主控全部核验确认**(F-ARCH1
closeOne 残留 scrollRequest/F-ARCH2 undo 并发覆盖/F-ARCH3 ReaderPage
声明漂移)+F-ARCH4/5 预警,登记待开票;总报告=
docs/audits/2026-08-30_ds-supplement-arch-review.md。**执行序**:
F-ARCH1(一行+一测)→F-ARCH2→F-A1 fixture 票→F-ARCH5 消环(冻结窗口)
→F-ARCH3 PagesOverlay→F-ARCH4 anchor 拆件→F-A3(门一 deepseek 首发)
→AUDIT-C(ARCH1/2 已消化两项)。

**2026-08-30 修复批收口(用户令「基于这些反馈,继续解决问题」)**:四票落地——F-ARCH1 已修待复测(信号清理+4 测+双变异红证+INV-29 增补)/**F-ARCH2 复核翻案**(指控不成立,回归锁+真快照变异红证+变异打偏教训)/**F-A1-W1 二轮翻案**(T4 探针实测 H=34.1px,T4 锚本成立,fixture 头注勘误 Td 保持 24)/F-ARCH5 已闭环(cycles 11→0)。门一 deepseek 合批审 0B/3W/3N 全处置(W-1 关后台 tab 保护+边界测/W-2 a-1 先入列表防恒真/W-3 前置断言/N1N2 头注精化)=**异基座门一新规首跑成功**。剩余执行序:F-ARCH3 PagesOverlay 拆分(测试护航)/F-ARCH4 anchor 拆件/F-A3 选择模式票/F-L2 待排查。

**2026-08-31 v16 后新反馈批登记(用户 7 图,四口径已裁)**:开场=
交接书 v16 预告的截图反馈回收到账,逐图归因+AskUserQuestion 四裁决
闭环。五票登记:
- **F-V1(图1/图2,最高优先)整段多行选区/标注 band 断位与漂移**:
  analyze_image 实证=行内 x 范围算错型(某行半行缺失+某行高亮超出
  文字末端延伸到页边+各行轻微纵向漂移;断点在 "derived relation
  (1)." 后);选区蓝/标注黄两链同现→缺陷在共用 band 几何生成面非
  持久化面。与 F-A4(整体偏移/重叠)F-A5(0.48px 对齐/层序)均不同型。
  候选根因:整段拖选跨多行时中间行「行内区间终点」在跨 pdf.js
  text item 边界的换算错误(部分 item 取全宽=超界,部分漏匹配=缺失)。
  排查→修票,strong 三屋。
- **F-V2(图3)双页适应宽度两侧空白大**:代码面 fit-width 分母已按
  双页完整行宽上报(ReaderPage fitWidth+PageColumn onReady 布局口径),
  理论应撑满;候选根因①点击早于列宽基准就绪(columnBasis<=0 静默
  return,zoom 保持默认)②ui-scale large 档 clientWidth 口径二次干扰
  (F-R2 同域)。真机探针读三值定位。
- **F-LG13(图4/图5)脉络图节点统一尺寸+紧凑布局+题名滚动**:现状
  根因=分档宽 180/220/260(nodeWidth)+分档高(nodeHeight)+间隙
  SIBLING_GAP=40/TREE_GAP=80。改=全节点统一宽高(含综述/主题)+
  间隙调小+题名区滚动(超长不再 line-clamp 三行截断);滚动条与画布
  滚轮冲突票面自裁(拖滚动条归题名,滚轮归画布)。受锁面广:
  INV-36/INV-38 单源三消费+lineage-layout.test+LineageCanvas 测试
  +e2e lineage.spec 结构红线,「语义随令」改向。
- **F-LG14(图6/图7)脉络图节点元信息区**:节点内新增 题名主体+
  底行(含金量+标签组+年份)。数据面:含金量经 paperId→papers.
  citedByCount+venue-tier.ts 映射表既有链零新增出网;标签=新增存储
  (节点表标签字段)+draft 协议扩展 tags 字段+应用内增删 UI。
- **F-LG15(小需求)脉络图人工父边**:边 kind 第三值(暂名 manual,
  现有 tree/ref);树布局不消费仅渲染,环检测照做,INV-27 修订
  (树边单父保持,人工边豁免单父);样式=虚线+独立色+可写逻辑线
  说明,与自动实线区分。
- **四项用户裁决(2026-08-31 AskUserQuestion,票面依据)**:
  ①含金量口径=**并列原始值**(「引 N · 期刊档」不合成单一分数,
  延续蓝图 D4「应用只把数据说明白」立场;无数据显示占位符);
  ②标签自动机制=**梳理智能体草稿带**(draft 导入协议扩展,导入
  即有,应用内可增删);③橘黄特征标签框与红色标签=**一体容器
  关系**(只有一种「标签」,橘黄框=标签区外框);
  ④人工父边=**不限条数**(用户裁决,未采纳每篇≤1 推荐)。
执行序:F-V1→F-V2→F-LG13→F-LG14→F-LG15(前二排查先行,后三
按票走三屋;F-V1/F-V2 reader 域与 F-LG* lineage 域文件面不交叉,
可并行派发但 ABI 争用统一 verify 兜底——v16 §3 规程)。

**2026-08-31 深夜场收口(新反馈批首轮五票中三票闭环)**:执行序完成
F-V1→F-V2→F-LG13 三票全闭环——①**F-V2** 主控直做(探针单轮定位
ui-scale 复合口径,真机空白 -88%,e2e/单测/typecheck 三验,提交
58a55ca22);②**F-V1** 三屋(主控排查真机实证根因=紧凑行距行簇错联
+INV-D 级联,实现者 a+c 选型,门一对抗深审过+合并门二可收口,M2/M3
收口补档红证,真机五判据,提交 09c0218e2,INV-47 登记);③**F-LG13**
三屋(实现者并行同工作区,240×110 统一+紧凑+题名滚动,门一过+合并
门二可收口,真机 4/4,提交 c91d4a2fd,INV-36/38 修订,locks 214→217)。
收口亲验 verify exit=0(120 文件 1024)+e2e 29(P7-A flike 复跑绿
——**第五现**,专项候选升级)。环境备案:门二发现 D:\nodejs 已漂移
v25(localStorage 污染 split-pane 11 红)——本机 node 24 在
/d/nodejs24,一切命令须 PATH 前导;探针 ABI 双坑入档(node 态起
Electron 必崩→探针前 use electron;verify/test 前 use node)。
**待办**:F-LG14(元信息区,依赖 LG13 底行锚已就绪)/F-LG15(人工
父边)两票票面已写待派发(串行——两票都动 LineageNodeMenu)。

**2026-09-02 深夜体检场收口(v19 §5.0 场首动作——第四次 Ruling 设计位
三源链首场)**:Kimi K3 拟定《全仓健康体检报告》(in=60771/out=8355/
154s,kimi-main 一次命中)→deepseek 对抗审核(无 B 级,W1~W7+N1~N10,
in=69294/out=30996/211s)→GLM5.3 主控终裁(独立复算 10 项亲验)。
档案=scripts/audits/{kimi-health-brief.md 体检包 198KB,kimi-health-
report.md,ds-health-review.md,health-final-ruling.md 终裁书}四件套。
**终裁结论**:①**U3(F-L1-C 三条)不作为下场首项**——两源一致+主控
支持,改为搭车池票(lineage 域改动搭车;用户报新抱怨则提前);②下场
执行序=场首 e2e 信噪比双件(F-R2e 窗态种子隔离预防票+「2 次非确定
失败=立案」通则入 AGENTS)→**F-L3 排查票(首项主票,+2142px 台账
277-290,crib f-l2-probe 范式)**→AUDIT-C 竞态面立案(设计位链产出
票面;首波=F-R3+F-L3 结论+弱锚时序条目含 F-ARCH4-M1)→搭车池
(U3/SettingsPage 拆件/活文档防线票:INV 册入 locks+图纸 72/49/23
指针化+INV-19 升格核对+弱锚清单/node --version 断言);③**W4 双源
复审欠账核销**——复审已执行收口(提交 6625952c0+v19 §8 在档,git log
亲验;两源「未核销」误判根源=体检包快照信息缺口,责任主控);「票级
Kimi 审未过」顺带补审条款继续有效(触发=下场同批触及 F-R2/P7A 面);
④台账登记 F-R2e 立案线维持(再现≥2 立案)+预防性种子隔离提前做。
**新备案三条**:①体检包快照数字失实两条(INV 计数实为 43/3/2 误写
40/4/3;e2e 3 次连跑误写 4 个数字串)——教训「计数类快照数字落笔前
脚本实测」候选入 AGENTS 完成定义节;②ReaderPage churn 台账双口径
(AUDIT-A ②=19 次/F-ARCH3=20 次,统计时点差,引用需标注);③弱锚
清单未集中登记(INV-16/42/43/44/45+F-ARCH4-M1+SR2-AI-12 W3 文案
锁缺)——随活文档防线票落地。体检场只登记不修:INV-19 升格等修订
动作全部留票。

**2026-09-02 v20 开发场收口(A 场首双件+B F-L3 排查+C AUDIT-C 立案)**:
①**A-1 F-R2e 窗态种子隔离票=证伪处置**——受锁先红注入形态(spec cp
备份→参数化变异 R2E_W/R2E_H→四档注入 height799/width1272/1200×700
两跑**全绿**→cp 还原 diff 空):rel 归一坐标对窗态差不敏感,归一化设计
有效性反获确认(注释无需勘误);全量 3 连跑 29/29×3 不复现;**隔离防线
不上**(无的放矢),F-R2e 维持观察备案(收口后失败计数=1 不触发立案线)。
②**A-2 AGENTS 两条款入册**:e2e 非确定失败立案线=同用例 2 次(通则)+
计数类快照脚本实测(体检场两条失实教训)。③**B F-L3 排查闭环**(详
F-L3 条目——静态全枚举零滚动写入+动态双模式三轮零漂移,无应用面缺陷)。
④**C AUDIT-C 立案**:三源链第二场(Kimi 拟票面 in=70441/out=15083/
195s→deepseek 审 in=79223/out=24101/182s,1B/7W/4N「修订后采纳」→
GLM 终裁)——票面=22 条目六组清点+四手法矩阵+首波三票(C-1 F-R3 排查/
C-2 弱锚补强搭车/C-3 静态全枚举)+分波停点;终裁修订 12 条全固化于
scripts/audits/auditc-final-ruling.md(B-1 C-3 改只读子代理返回→主控
落盘/W-2 F-L3 顺延取代声明/W-3 种子隔离票状态声明/W-5 二波优先级
F-R3>A3>候选>W-G1/W-7 全图落 docs/audits 不入锁/C-2③ 轮询化范围实测
6 处非票面 2 处等)。**首波三票不在本场执行=下场主批(下场=AUDIT-C
首波执行场)**。

**2026-09-01 凌晨场收口(新反馈批五票全闭环)**:F-LG14/F-LG15 两票
续接闭环——④**F-LG14**(提交 ec1e7e959):迁移 007 tags 列+含金量
join 单源(批量 in-query 禁 N+1 spy 双维锚)+底行三段渲染(「引 N·T档」
并列口径)+标签增删 UI 全链;门一过(optional 超集深核/attrib-R 只读
位无额外污染——主控担责:派单未 unlock);W2 INV-48 位置主控修;
locks 217→227;e2e 29(P7-A flake 第六现复跑绿)。⑤**F-LG15**(提交
465c4403c):manual 边全链——三守卫零新增天然承载(结构性发现:
reachable 全边图双向拒环亲验)+repo.toEdge 往返断裂修复+渲染三边
对比表(manual 琥珀长虚线 7 5)+双对话框 UI;门一过+W1 主控直做
(manual 优先 surveyIds 启发+补用例——综述作人工父不被吞色);
LG14+LG15 合并门二两票放行(LG14 裁剪门二补验);locks 227→231;
收口 verify exit=0(126 文件 1074)。**五票终态:V1(09c0218e2)/
V2(58a55ca22)/LG13(c91d4a2fd)/LG14(ec1e7e959)/LG15(465c4403c)
+台账登记笔(3afbc3d19)=六笔**;INV-27 修订/INV-36/38 修订/
INV-47/48 新增;verify 基线 126 文件 1074/locks 231/e2e 29。
**用户复测邀请面**:图1/图2(同文献整段拖选+旧标注重开)/图3(双页
适应宽度 large 档)/图4-5(脉络图紧凑统一卡)/图6-7(节点底行含金量
+标签+人工父虚线)。**观察项**:P7-A flake 六场六现专项升级候选;
D:\nodejs 已漂移 v25(localStorage 污染+ABI 面)——本机恒用
/d/nodejs24 PATH 前导,DEV-SETUP 备案待用户裁决是否回装 24。
**遗留池新增**:LG14 门一 N1(对话框同名标签 UX 面单点缺测)/
N2(应用面 tags 元素无 min(1)——renderer 双守+preload 单客户端
风险域窄)/LG15 编辑期外部删边竞态 throw 面(概率极低票外)。

**2026-09-02 AUDIT-C 首波执行场收口(v21 交接执行序——三票全闭环,未触停点)**:
三屋执行=主控 GLM5.3(bigmodel-coding-plan)+只读子代理×2(M1 静态 4.11M tok/
79 工具;C-3 扫描 2.40M tok/52 工具——Agent 工具无 model 参数「环境限制
统一档」欠账照记)+实现者子代理×1(C-2,10.5M tok/106 工具/~70min)+外部链
×5(ds-call:kimi-main 一次命中 F-R3 门一 in≈25k/out 9.1k;C-2 门一
kimi-main→kimi-backup 双失败 switches=2 落 deepseek 兜底——**门一门二同源
异质性损失如实入账**(链状态机合法降级,F-R2 换源先例族);deepseek 单源
×3=C-3 产出审/F-R3 门二/C-2 门二)。
- **C-1 F-R3 排查闭环**(详 F-R3 条目):实锤=pdfjs 4.10.38 worker 泵无终接
  catch(destroy×在途竞窗→worker 世界 unhandled rejection,仅 CDP 仪表通道
  可见——三路否定实证);定性=噪声型非破坏型(6/6 健康完好);单开 6/6+单次
  切换 3/3 零触发/连开 14%/开关循环 3%=相位依赖。门一 1B/4W/4N 全采纳
  (B1 修法两轨重排)+门二 1B/4W/6N 条件 PASS 四放行条件**票内全销**
  (r5~r7:S1b 净测 3/3/主进程捕获实验(d 死刑+level1 代理流发现)/S2①形态
  源码核验/共享 workerPort 源码死刑)。**副产实锤 P6**=CorpusExtractor
  失败路径泄漏 worker 线程(状态机表一格证伪)。修票素材三件可移交二波
  (轨一=e 上游查证唯一消除路径;轨二=b 序列化+c 失败补 destroy)。
  档案=f-r3-investigation.md(v3)+f-r3-probe.mjs(七轮)+gate1-kimi/
  gate2-ds+brief×2。
- **C-2 弱锚补强搭车票闭环**(三子项):①N6 真机直测落地(f-a3-n6-verify.mjs
  零副作用四断言+穿透+对照+变异红证——**票面预判「菜单将出现」被证伪**:
  onClick 守卫对真鼠标同拦=INV-42 口径修正(两层防线),门一裁处置有效);
  ②F-ARCH4-M1 e2e 三向对照+变异矩阵(**root.contains=同页跨 textLayer
  决定性防线**——变异 B 摘除即工具条出现;跨页拒绝=SelectionLayer 边界
  检查独担;真浏览器不塌缩锚 E1 collapsed=false)——受锁 e2e 全量 30/30;
  ③f-l4-verify 轮询化 15 处(终裁书「6 处」计数作废——grep 实测 15,
  计数类数字脚本实测条款再验证)+grep=0+13/13 保持+「条件成立≠状态
  稳定」反向实证(identity 初值中间帧竞态首跑两红——固定等待侥幸绿
  病根在案)。门一有条件放行(0B/6W/3N,deepseek 兜底承接)+门二条件
  PASS(0B/新增 W7=实现报告 ariaPressedOk 字段摘录笔误——探针无缺陷,
  轮询成功标志 vs 目标值混淆,台账勘误不改档)。附条件全处置:INV-42
  册面修正+AnnotationLayer/AiAnnotationLayer 注释同步(主控直做披露,
  纯注释零行为变)+W1 脆弱点备案(弱锚清单)+W7 核验。弱锚清单 W-3/W-6/
  W-9 销项(首三笔入已核销段);INV-44 备案③销项。
- **C-3 时序面静态全枚举闭环**:audit-c-scan.md(9/9 store 全读+38 通道
  +3 事件桥+PageColumn/SelectionLayer 态空间表——架构批 W7 欠账清偿)。
  **结论=无 ≥B 级新增候选**(deepseek 对抗审 1B/5W/3N「需返工」→主控
  终裁 B-1 不成立:paperId=UUID 单源生成器(001_init.sql:3 政策+
  import.service.ts:124 randomUUID)跨库同 id=加密级不可能,FK 拒绝用户
  路径成立;W/N 全采纳 v2 修订)。W 级清单五条(A3 悬置写主候选/D4
  import×switch 无互斥/SelectionLayer 幽灵标注/settings.save 并发/
  ImportProgress 无会话身份并入 D4)——二波修票立项依据。INV-22 窄窗
  接受判据复核维持(窗口面无扩大)。
- **F-R2e 第 2 现立案线触发**(C-2 实现者全量 e2e 首跑同用例同值 3.45px
  指纹——AGENTS 通则 2 次=立案,详 F-R2e 条目续行)。
- **工具缺口发现并修复**:unlock-protected.ps1 漏 docs/invariants.md 条目
  (lock/check 两脚本有、unlock 没有——v21「双脚本同步扩」实漏第三脚本;
  invariants.md 锁得进解不开)。已补条目([locked-change] 范围)。
- 二波启动条件复核:C-1 实锤(✓)∨C-3 ≥1 B 级(✗)∨F3 立案(F-R2e 新入,
  但 F3≠W-G1——W-G1 计数仍 1)。二波序(终裁 W-5+F-R2e 插位):
  F-R3 修票(轨一查证先行)>A3 悬置写>F-R2e 排查票(立案新入)>C-3 候选
  (W 级五条)>W-G1 定位。

## AUDIT-C 二波修票场执行记录（2026-09-02，主控 GLM5.3）

- **F-R3 修票闭环**（轨二 c 实现+轨一查证裁决+轨二 b 终裁不采）：轨一 e 上游
  查证实锤=v5.5.207 落地 onFailure 终接守卫（`if (terminated) return;` 替换
  `ensureNotTerminated()`——本仓 8/8 实测指纹的逃逸汇聚点；区间 v5.4.624→
  v5.5.207 worker.js 单处 diff）+6.3.289 另获 destroy() 族硬化（claim
  `_capability.promise.catch(()=>{})`+`_setupCapability`）+**master pdfManagerReady
  悬尾仍未终接**——终裁=**不升级**（任一档位不承诺零同族噪声；devtools-only
  噪声不换跨 major 回归面；升级再评估触发条件=上游悬尾族全消时连同 destroy()
  族硬化一并重评；档案 f-r3-upstream-check.md 逐 tag 可复现）。轨二 c 实现=
  settleLoadTask 纯函数（失败 destroy 恰一次+自身拒绝吞并+await settle 后重抛）
  +接线+状态机表如实化——P6 泄漏面闭。门一 Kimi 3B/2W/0N PASS+门二 deepseek
  2B/1W/2N PASS：W1 变异红证缺口主控补销（变异 A 同引用重抛/B 恰一次/C 去待
  await——顺序测试新增 1 it）；W2=upstream 档补包入审。**tee 管道尾 $? 坑
  亲踩**（v22 §5 在档教训重演：supp-a/b 尾行 exit=0 失真——vitest 摘要行为
  红证本体，补正注入档）。INV-49 登记。
- **C-A3 修票闭环**（notes 防抖弃改三件套）：discard API+in-flight 代际守卫
  （.then/.catch 回调首行）+接线两点（confirmCloseDirty 守门内=一切 tab 关闭
  必经；switchTo 确认后 discardAll——白名单受控例外机器锚）。main 归属校验
  已在职（notes.service findById→NOT_FOUND 显式先行——扫描报告「FK 偶然
  兜底」口径修正入 INV-35④）。门一 Kimi 0B/3W/8N 条件 PASS+门二 deepseek
  B=0/W=2/N=4 条件 PASS，四条件收口内全销：W1=reject 版序列②主控压缩票
  补锚（变异恰红——首版锚误落 guardedDescribe 块 ReferenceError 自纠+移
  always-active 块）；W3=App.tsx:112 useTabDirtyAggregate 含 notes pending+
  :162/:196 同一 quitDirty 注入 switcher/section（N-A 同销）；W2=接受残余
  裁定+代码锚补证（notes.store.ts:161 `pendingEdit.has` 在 await 后=回调时点
  读——discard 已清则必走整版落地分支 :176-191 无 saveSoon 补存，重建条目=
  服务器基线，复活不可能；与实现者 §8「合并路径重建」不冲突=合并分支不可达
  post-discard）；W-1=收口全量 verify 补跑（见下）。N-B（dirty=false+隐藏
  pending+switch 失败三合窗）备案接受。INV-50 登记+INV-35④ 兑现修订。
- **F-R2e 排查票**：票面已备（f-r2e-brief.md——断言面=y 轴在档+头号假说=
  band 双态渲染 resolve 竞态（台账 :554 原名）+主控新增排除项「纯滚动撕裂族
  不成立（boundingBox 对滚动平移不变）」+候选修法测量原子化）——**预算停点
  触发本场未执行**，三波首项。C-3 W 级候选（D4/SelectionLayer 幽灵标注/
  settings.save/ImportProgress）与 W-G1 同移交三波。
- 门审路由流水：F-R3 门一 kimi-main in=7422/out=3386/65s 一次命中；F-R3 门二
  deepseek in=11990/out=32766/300s；A3 门一 kimi-main out=12807/563s（routing
  头 in=0=端点用量上报形态，实际输入=包体 ~36KB——成本口径注记）；A3 门二
  deepseek in=11206/out=31053/310s。全链零换源。

## 2026-09-02 三波场:F-R2e 排查闭环(+修票)

- **F-R2e 排查+修票闭环**(票面 f-r2e-brief.md——机制定性与复现是交付物):
  探针三版(z-r2e-probe.spec.ts 入锁 234)+15 跑档矩阵(基线/节流 t4t8/全量
  ×7/注入三档)——**自然复现未遂但机制空间收敛双源**:①滚动撕裂族实锤
  (注入档 1/2:两测间注入 scrollTop→dy=Δ 线性,恰 y 红 x/w/h 绿——
  **推翻票面 §1 主控排除项**,平移不变性只在单帧成立,跨帧两次测量=撕裂);
  ②band 双态跳变直接观测(MutationObserver 记录器:两程全同 fallback
  y=182.59/h=19.96→resolved y=187.03/h=14.99,差 4.44/4.97,窗 ~8ms——
  W-G1 备案「band 双态渲染 resolve 落地竞态」的机制画像首次量化)。
  **3.45 归属遗留缺口如实入档**(与双态差 4.44 不等+程序性 scrollTop 量化
  0.8 倍数不符——subpixel anchoring/历史 DPI 候选;判别记录器留驻探针)。
  **修票=稳定门+原子化**(stableRel:25 轮 3s 双采样稳定+穷尽 fail loudly+
  零盒可见性守卫+单 evaluate 同帧取两盒)——门一 Kimi 1B/5W/3N 回炉后形态
  (B-1 穷尽静默返回/W-4 零盒假绿均代码修复;W-1/2/3/5 报告口径降级——
  「用户不可感」→「可见性未评估」「rAF 推迟数百 ms」→「未证假说」
  「W-G1 合流」→「暂裁合流计数保留」)。应用面无回归报告、修测试采样口径
  而非应用(负载态短暂重锚可见性未评估——真机复现时另立票)。verify
  126 文件 1093 exit=0 亲验(node24 口径,见下环境注记)+e2e 32/32 亲验。
  排查报告=f-r2e-investigation.md(§9 门一处置表);INV-51 登记。
- **W-G1 暂裁合流(计数保留)**:台账 :462 备案(smoke+reader-text 连跑
  2/2 红 3.45px)与 F-R2e 机制空间重叠(同测试同数值)——但形态剖面不符
  (可复现 vs 偶发)+3.45 跨版本同值反削弱双态归因→不销项;F-R2e 修法
  对其形态免疫(若复现,新断言应转稳定绿=免费判别)。
- **环境事实:本机 Node 已升 25.2.1**(AGENTS 在档=24):Node25 下 vitest
  2.1.9 的 jsdom 环境装载破损——window.localStorage 变空普通对象(proto=
  Object 无 Storage 方法),split-pane.test 11 用例结构性红;node24 对照
  11/11 绿(npx -p node@24)——**环境问题非代码缺陷**。本场验证走 node24
  同口径(npx -p node@24 npm run verify)。处置待用户裁决:回 24 或立
  vitest 升级票(降级不可由代理擅自执行)。


## 2026-09-02 四波场：AUDIT-C C-3 W 级修票两票闭环（F-D4+F-SL）

- **F-D4 import 会话身份两合一**（票面 f-d4-brief.md，AUDIT-C §1.2-b+§五-2/5）：
  ①互斥 gate——import.service 每次调用 gate.enter()/finally exit（域错误上抛路径
  必经 finally），gate=bootstrap 顶层闭包计数器（容器 assemble 闭包之外——每层
  service 重建但 gate 同一对象，switch 后 in-flight 计数跨层有效）；workspace.service
  create/rename/switch 三入口在 busy 旁查 importInFlight()→CONFLICT「导入进行中，
  请稍后再试」，**先于 closeCurrent/materializeLegacy（拒时零库副作用，closeCalls/
  assembledDirs 桩零计数锚定）**；create/rename 一并拦=主控裁（materializeLegacy 同样
  closeCurrent，同机制竞窗）。②ImportProgressEvent 增 sessionId（min(1)，先例=
  exportProgressEventSchema）；每次调用 randomUUID 一次全程同 id；ImportDropZone
  订阅回调三滤（busyRef=false 忽略+sessionRef 首事件锚定+异身份忽略+runImport 入口
  重置）。INV-52 登记。测试 +8（import.service 3+workspace 1+dropzone 4 组件测试
  新文件）；变异 M1（exit 挪出 finally）/M2（删异身份滤）红证在档。
- **F-SL SelectionLayer 幽灵标注**（票面 f-sl-brief.md，AUDIT-C §1.2-c+§五-3）：
  addAnnotation 签名改 (paperId, a) 按发起身份寻址（照同文件 undo 范式 :438/:456——
  tab 缺席 no-op，DB 已落重开自 DB 读对齐）；ReaderPage 接线闭包捕获渲染帧 paperId
  （与 SelectionLayer props.paperId 同源同帧）；SelectionLayer props 契约零改。INV-03
  扩写「写方向同族」条款（双先例=undo 与 addAnnotation）。测试 +2（activeId 切走仍写
  发起 tab/tab 已关 no-op，防恒真前置断言）；变异 M1（恢复 activeId 寻址）恰 2 红证在档。
- **门双形态**：F-D4 门一 Kimi（in=22968/out=8579/257s）B:0/W:3/N:2——三条 W 全报告
  申报层（filter① 组件级不可证伪虚报/首红 [1/6] EBUSY 条目未申报/--stat 旧口径），
  轻量回炉 1（纯报告面零代码）三点全处置，处置核验归门二；F-SL 门一 Kimi（in=12770/
  out=6352/198s）B:0/W:2/N:3 **放行零回炉**——W-1 帧同步/W-2 孤儿栈由主控源码销项
  （SelectionLayer.tsx:85 props 每渲染解构+:199 save 普通闭包无 latest-ref→onSaved
  闭包=发起帧；closeOne:242 clearStack+annotation-undo.ts:31 栈随 tab 丢弃→迟到
  pushUndo 孤儿永不被 undo 消费，无害残余）。门二 deepseek 位合并终审（子代理亲跑）：
  **条件 PASS→条件销**——处置核对全落地/母本逐格/红线八项全过/改动面 15 files
  +488/-57 两票分账精确对平零蔓延；唯一条件=locks 残留（见下摩擦条）收口即销。
- **摩擦三现+根治纪律（触「二次触发即重构」条款的流程面落地）**：受锁集合经
  check-locks walk **自动覆盖 scripts 下全部 .mjs/.ps1**——主控审计场自产 gen 脚本
  一诞生即属受锁面，manifest 落后=下次 verify 必红。本场三现：F-D4 gen（20:34 晚于
  其 verify 20:30）→F-SL 实现者开工 check 红机械登记；F-SL gen（20:47 晚于其 apply
  20:43）→门二 verify 亲跑红。根治=AGENTS「依赖与提交」节新增纪律条「自产 scripts
  工具件写完即时 locks:generate+apply，禁延至收口」+本场起执行（收口登记至 238）。
- **验证口径**：verify 全链 exit=0 亲验（127 文件 **1103** 用例=基线 1093+F-D4 8+
  F-SL 2；locks **238**）+e2e 亲验（F-SL 改 ReaderPage 接线触渲染链——reader-text
  划选保存链必跑）。成本账本见交接书。


## 2026-09-02 五波场：C-3 第三票 F-SV settings.save 链式全序闭环（单票全链）

- **F-SV settings.save 并发互斥**（票面 f-sv-brief.md，AUDIT-C §1.1+§五-4）：
  病根=save 间无互斥（saving 仅驱动 UI；UI 守卫两不足=帧快照毫秒窗+runSave/
  pickScale 双入口互不感知）×ipcMain.handle async handler 不序列化×INV-39 全量
  写互相整体覆盖——save₁ 旧全量迟到落盘覆盖 save₂→档位回跳（毫秒级连点可达，W）。
  修法=store 层**链式全序**（INV-03 写方向同族第三变体「同通道写全序」）：null
  哨兵空闲直发（单 save invoke 同步即发=行为零变验收线——票面字面「初始 resolved
  链」击红锁定用例格 2，实现者自裁改哨兵，门一复核成立）/忙时排队（前一 settle
  后才发下一 invoke——落盘序=发出序，终态恒=最后一次意图）/链永不断（run.then
  双 noop 续链，错误 await run 原样上抛各自调用方——动作型契约零变）/inflight
  归零才复位 saving（排队者不闪断）。INV-03 三列同步扩写（声明/先例/锚定）。
  测试 +3（并发全序时序/链不断/saving 订阅帧连续）；变异 M1（删链直发→①②红）/
  M2（去归零门控→③红）红证在档。
- **门双**：门一 Kimi（in=13307/out=8662/268s）B:0/W:2/N:3+存疑 2 **放行零回炉**
  ——竞窗推演四边界（清链条件与排队存在性严格互斥/微任务交错窗/同步连发/flush
  充分性）无代码级缺陷；W1=RED「Errors 1 error」未申报→实现者书面定性闭环
  （RED 期用例② pSave1 未处理拒绝：断言失败早于 rejects handler 挂接；四件证据
  零 Errors 佐证）+门二五帧对账复核成立；W2=中间 verify 失败留档不一致（流程
  教训：中间失败一律留档，与 green-r1-fail 先例对齐——不补做）；N1=INV-03 先例列
  不同步→主控收口补齐；N2/N3 知晓项。门二 deepseek 位 **PASS**（verify 亲跑
  exit=0/1106+locks 239/diff 恰 4 文件/行数 119+215/TODO 零命中/变异备份字节级
  IDENTICAL；e2e 免跑论证在档=无并发连点 e2e 面，smoke:177 单 save 走直发分支
  逐 tick 等价）。
- **摩擦根治纪律首次执行生效**：本场 gen 脚本（f-sv-gen-gate1-brief.mjs）诞生即
  locks:generate+apply（238→239）——四波场 AGENTS 新纪律的第一次闭环实践，
  零摩擦零红。
- **验证口径**：verify 全链 exit=0 主控亲验（127 文件 **1106**=四波场基线 1103+3；
  locks **239**）；e2e 免跑（门二论证在档，非跳过）。C-3 三票（A3 二波/D4+SL 四波/
  SV 五波）至此**全数闭环**——AUDIT-C 修票场 W 级清单清空，余项=N 级知晓项
  （并发双 import 计数中间态/时序表第 3 格/链深≥3/用例②载荷对称性，均申报在案）。


## 2026-09-02 六波场：W-G1/3.45 攻坚票收案（B 案）——多行判别+时代考古+负载态连跑矩阵

- **攻坚票全链**（蓝本=F-R2e 排查形态，主控亲做零子代理；报告
  scripts/audits/w-g1-investigation.md）：v26 §2-1 两方向+主控自裁第三方向
  （时代考古）全执行——**B 案收案=未遂如实入档+观察线降回**。三硬事实：
  ①候选 c 结构性证伪（多行 fixture t1~t20 零中间轮——3 span 恒一批入 DOM，
  节流不拆批，z-wg1-probe 判别记录器实证）；②时代考古排除候选 a 两现归因
  （39c9cbaec band 数学与当前逐位一致→时代双态差=4.44≠3.45；y 差族
  {4.44,4.62}±0.8k 组合空间不含 3.45）；③双态窗拉伸首测 4-5ms→311ms
  （t1→t20 近似线性，F-R2e「负载拉伸未证假说」坐实为已测事实）。
  16 捕捉上下文+21 记录器上下文 3.45 零再现、subpixel 零观测。
- **资产**：z-wg1-probe.spec.ts（多行判别探针，逐 rect 记录器+撕裂面
  保留）入锁 239→**240**；e2e 面 32→**33** 用例；指纹 JSON 14+8 份在档。
- **副产物 F-G11**：P7-A 分隔条拖拽序列态非确定红（确认计数 1+1 身份
  未捕获——**过程失误：矩阵循环未 tee 输出**，教训入册=连跑循环必须
  tee 全量落 .raw.txt，本场 t8×2 已改正）。
- **预算停点触发**：N 级/遗留池集中清扫（v26 §2-2）顺延下场首项。
- **验证**：verify exit=0 亲验（127 文件 1106=基线精确一致/locks 240）；
  e2e 33 用例 8 全量上下文 7 绿 1 未捕获红（非 3.45 面，§6）。

## 2026-09-03 夜场（七波场·闲时段第一段）：N 级清扫合批五票全闭环

- **五票全落地**（主控亲做快票形态，蓝本=F-ARCH 修复批；v27 §2 第 1 项）：
  F-G3 boundsToPersist（getNormalBounds，maximized 落还原态/常态等值零变）/
  F-G7 UiScaleSection 自持拆件（SettingsPage 244→209）/F-G8 drag 计数锁（恰 1，
  与 no-drag 断言对偶）/F-G9 fullscreen 沿补反映（enter→true/leave→回读
  isMaximized+TitleBarControls 状态机接缝同步）/C-3 四知晓项转正
  （①import-gate 拆模块+2→1→0 计数锚②时序表第③格跨格序列显式化③链深≥3
  ④用例②载荷对称断言）。
- **门双**：门一 Kimi 两轮（in=8292+3490/out=6370+3624）——一轮 W1=材料缺口
  （git diff 不含未跟踪三新文件，派生 inFlight 裸引用绑定形态不可核）；二轮补充
  包终裁 W1+三存疑全 ADDRESSED，新发现 N-1/N-2/N-3 皆 N 级处置在档
  （N-1 非配对 exit 转负=接线 bug 信号，注释声明不加守卫=行为零变承诺内，改守卫
  需独立票；N-2 同源不测（测即锁定存疑行为）；N-3 INV-39 载荷组件层无单测——
  核实 smoke:160 rect×1.25 经 store→--ui-scale 链传递性锚定（漏带字段必红），
  UiScaleSection 头注引证在档）。
- **变异红证六组**（全备份法还原 diff 空）：fg3 getBounds 化/fg9 摘沿/fg8 错数/
  c3-gate >1 判定/c3-ws 摘 create 检查（2 红）/c3-sv 链删（3 红）。
- **过程失误如实申报**：①首次 ws 变异 node -e 字符串替换静默未命中（16 全绿暴露）
  →改 sed 行号+命中守卫重做——「变异必须先证命中」教训入册；②verify 首跑 typecheck
  拦两处（接口扩后 mock 缺方法/拆件后 runSave 残留局部量）——vitest 不查类型、
  tsc 才拦的已知形态再现，均在锁面外源文件即时修。
- **验证**：verify exit=0 亲验（**128 文件 1113**=基线 1106+7；locks **241**=
  240+import-gate.test.ts 即时 generate+apply）；e2e **33/33 全绿**（含本批触碰
  的 smoke:118 三键/smoke:160 缩放两面）。
