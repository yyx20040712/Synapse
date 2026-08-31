# AUDIT0 体检 findings 台账(活文档——体检场唯一发现登记处)

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

### F-L3 [?] 保存高亮链后阅读区滚动位漂移 ——状态:**已登记(2026-08-30 F-A3 取证副产,待排查)**

- **现象**:F-A3 真机探针场景 B——点「高亮」保存前后滚动容器
  (阅读区 .overflow-auto)scrollTop 9971→12113,漂移 +2142px
  (f-a3-out/f-a3-verify.json B_selectionMode.scrollTop)。对断言无影响
  (探针已用滚块进视口手法兜住),但用户语义=保存标注后视口跳走两屏。
- **候选源(未定位)**:Playwright click 的 scrollIntoView(工具条按钮
  定位)或保存链内程序滚动(标注保存后 rects 重锚/页列重排触发)。
  排查时先区分:真鼠标点击无 Playwright scrollIntoView——若真机手工
  复现同样漂移则非工具面。
- **处置**:排查票待开(取证范式 crib f-l2-probe.mjs:真实库副本+
  分段 scrollTop 采样定位漂移发生在保存链哪一环)。

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

### F-R2 [?] ui-scale≠1 时阅读器程序滚动落点漂移 ——状态:**新登记(2026-08-31 F-R1 回炉副产,待排查)**

- **现象**:F-R1 探针诊断(f-r1-dbg.mjs+dbg-geom.png)——ui-scale≠1
  (用户 large=1.25)时阅读区反向 zoom 豁免与程序滚动差值法交互致落点
  漂移 160-450px;**单页模式同样复现**(非 F-R1 引入,存量缺陷)。与
  v15 备案「reader 侧同型量测面未排查」呼应——F-L2 同型污染的 reader
  侧实证落地。
- **处置**:排查票候选(crib f-l2-precheck 前置实测范式:三档×程序滚动
  落点差值采样定位污染消费点);用户常用 large 档=高优先。

### F-R3 [?] pdfjs stream pump 竞态 pageerror ——状态:**新登记(2026-08-31 F-R1 回炉副产,待排查)**

- **现象**:扫描式连开文献(快速连续 openPaper)触发 pdfjs
  `_reader.read` of null pageerror——PdfDocProvider 既有面(流取消
  竞态);常规单开零复现。
- **处置**:低优先(用户路径=单开为主);排查点=PdfDocProvider loadingTask
  销毁与 stream 泵竞态。

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
| F-G3 | maximized 态关窗 saveBounds 存大 bounds(恢复大窗非最大化) | N | 备案;候选修法在档 | v8 E4 |
| F-G4 | invariants.md 不在受锁集 | N | 备案 | v9 W2 |
| F-G5 | 变异还原 diff 未落档(间接实证) | N | 流程项:此后变异还原也落 .raw.txt | v9 W4 |
| F-G6 | SettingsPage 表单水合前窄窗(固有) | N | 备案 | v9 门二 |
| F-G7 | SettingsPage 244 行(余量 6)——下个设置节必拆 UiScaleSection | N | 预警 | v9 |
| F-G8 | SH3 drag 面断言 toContain 未计数 | N | 同类风险随 F-A1 票一并扫 | v8 SH3 门一 C9 |
| F-G9 | fullscreen 不反映 maximize 图标 | N | 备案 | v8 SH3 门一 C12 |
| F-G10 | P7-A 系统剪贴板竞态 flake | N | 处置=读前重试,未到必改线 | v8 §2 |

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
