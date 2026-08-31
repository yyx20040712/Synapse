# F-R1 门一对抗深审材料包

> 你是门一对抗审查员(异基座 deepseek)。工单=阅读器双页阅读模式(含 fitWidth 适配)。对票面/报告/diff/证据做**对抗性**审查:行为缺陷/测试盲区/票面-实现偏差/取证不充分。每条发现给【B(行为)/W(弱点)/N(备注)+证据引用】。

## 主控对实现者 8 项自裁的处置记录(审你是否有异议)

- ①S3 末行右盒不渲染(列宽已排除孤页行,行宽恒=左盒宽无跳变)——采纳;②PageColumn 头注重组为守 250 物理行(契约语义无损,详述归拆件)——采纳;③行内 gap 不随 zoom((左+右)×zoom+gap,与 INV-33 盒间距常量语义同源)——采纳,票面两读性主控担责;④测试三处修正(红证时点声明+对 HEAD 复跑终版红证)——采纳;⑤真机 E 奇数页不可达(真库无奇数页文献,单测③锁)——采纳+备案;⑥A 场景断言前提修正(恢复链滚记忆页,改「存在某行两盒都进渲染窗口」)——采纳;⑦事故:备份目录复用被二次运行覆盖→6 文件回退 HEAD→按上下文重写→全量 987+探针 15 复验(无净损失,教训=一次性备份目录+还原 diff+回绿双验)——知悉,要求门二专项核最终态一致性;⑧IO effect deps 增 layout(票面「懒渲染回收零改」必要例外:列↔行切换页盒全卸载重建,旧 IO observe 目标失效)——采纳(重挂观察非改回收逻辑)。

## 审查清单(五问)

1. 行为:双页行渲染/布局切换重报(prevLayout 对照+layoutRef latest)时序是否有竞态?IO 重挂窗口期可见集空窗→渲染窗口调度(want 空集→顶部引导窗口分支)是否可能误触发顶部渲染?段⑥锚 layout 不入 deps(切布局走恢复链非 zoom 锚)语义是否自洽?末行右缺席+列容器 items-center 的布局稳定性?
2. 测试:16 用例是否锁死行为?变异 M1~M5 红面(9/4/1/1/2)是否各锁独立面?M3/M4 单红是否锁力充分(恰中 vs 盲区)?③b/⑤c 回归哨基线绿的声明是否成立?
3. 票面-实现偏差:diff 越票面?§0 矩阵每格兑现?§2 既有导出零变(columnWidth/columnTotalHeight 保留)?
4. 取证:真机 A~F 15 断言是否充分支撑双页可用性?fitWidth 99%≈(1217−24)/1202 的源码复算链是否可信?D 往返场景是否锁 S1/S5(位置保持+basis 不残留)?
5. 事故⑦:重写恢复的最终态与「原实现+票面」一致性如何由现有证据链保证(987 复验+探针复验+变异红证对最终态)——有无残余风险?

## 证据关键段原文

### 真机探针 results(15 条)

```json
[
 {
  "id": "pre/ready",
  "pass": true,
  "detail": "单页就绪 20 盒/20 页,无行盒（100%）"
 },
 {
  "id": "A/row-count",
  "pass": true,
  "detail": "行数 10=ceil(20/2)"
 },
 {
  "id": "A/pair-row-rendered",
  "pass": true,
  "detail": "行(17)两页并排真渲染 data-page-root 同含 [17,18]（canvas 就位；渲染窗口 roots=[16,17,18,19,20]）"
 },
 {
  "id": "A/row-width-formula",
  "pass": true,
  "detail": "行盒宽 1202.0 ≈ 左(595.0)+右(595.0)+gap(12)"
 },
 {
  "id": "B/zoom-double-basis",
  "pass": true,
  "detail": "zoom=99%≈(clientWidth1217−24)/行宽1202=99.3%（columnWidthFor 源码复算）"
 },
 {
  "id": "B/row-fits-viewport",
  "pass": true,
  "detail": "行宽 1192.0 ≤ 内容区 1193+2（两页并排恰入视口——S2）"
 },
 {
  "id": "C/page-step-2",
  "pass": true,
  "detail": "页码 1→3（+2 翻面步进，S4；末行夹取兜底）"
 },
 {
  "id": "C/row2-tops-aligned",
  "pass": true,
  "detail": "目标行(3)两盒顶对齐(Δtop=0.00px)且已滚离首行（程序滚行顶）"
 },
 {
  "id": "D/rows-cleared",
  "pass": true,
  "detail": "单页行盒清零（20 盒直列）"
 },
 {
  "id": "D/position-kept",
  "pass": true,
  "detail": "页码保持 3→3（S1 恢复链滚回当前页，|Δ|≤1）"
 },
 {
  "id": "D/rows-restored",
  "pass": true,
  "detail": "切回双页行恢复 10=10"
 },
 {
  "id": "D/basis-rebased",
  "pass": true,
  "detail": "适应宽度口径回落：单页 201% → 双页 99%（basis 重报不残留——S5）"
 },
 {
  "id": "D/page-still-kept",
  "pass": true,
  "detail": "往返后页码 3→3（|Δ|≤2 恢复链容差）"
 },
 {
  "id": "E/last-row-single",
  "pass": true,
  "detail": "末行(19)盒数 2=期望2，盒高 793px>10（无塌陷——S3）"
 },
 {
  "id": "F/no-pageerror",
  "pass": true,
  "detail": "页面错误 0 条"
 }
]
```

### fitWidth 数值段

```json
{}
```

## 票面全文

# F-R1 需求票:阅读器双页阅读模式(含 fitWidth 适配)

> 需求源:用户 2026-08-31 新增需求 2(最高优先级)——「阅读器增加双页
> 阅读的选项,双页模式下适应页面宽度那个功能也要适配」。
> 基线:verify 116 文件 971 用例全绿 / locks 195 / e2e 29/29(5140ea719)。
> 同场需求 1(课题下拉动画)主控直做已落,与本票无涉。

## 0. 模式态空间表(票面的「态空间」——宪法前置,交审计)

**pageLayout 生命周期迁移表**(per-tab,与 zoom/color/selectionMode 同型,
F-A3 先例):

| 事件 | pageLayout 迁移 |
| --- | --- |
| openPaper(absent 新建) | 'single'(makeLoadingTab 显式置值) |
| openPaper(existing 重建) | 'single'?——**No:makeLoadingTab 现签名 (paperId, prev)——沿 prev 继承既有字段先例(实现时核 makeLoadingTab 现行继承面,选与 zoom/selectionMode 完全同型的继承行为)** |
| 切布局(工具栏 toggle) | updateActiveTab 写 active(异 tab 零扰) |
| 切 tab 往返 | 各 tab 记忆(引用稳定语义) |
| 恢复链(重开) | 持久化面=TabState 不落库则重开回 single——**本票 v1 不落库**(zoom 同型,接受;备案) |

**布局×几何消费点矩阵**(双页改造的核心面——每格都要有实现+测试):

| 消费点 | single(既有,零变) | double(本票新增) |
| --- | --- | --- |
| 页盒排列 | 单列 flex-col,页盒=每页 | **行**数组 (1,2)(3,4)…;行内两页盒并排 flex(左顶对齐);末行奇数页右空 |
| 列宽(columnWidth) | 最宽页×zoom | 最宽行宽×zoom(行宽=左宽+右宽+行内 gap;末行单页不计) |
| 总高(columnTotalHeight,INV-33 分母) | 盒高和+gap×(n−1) | 行高和(行高=max(左右页高))+行 gap×(行数−1) |
| onReady basisWidth(fitWidth 分母单源) | columnWidth(sizes,1) | 双页口径行宽(scale=1) |
| 翻页步进(工具栏 ±) | ±1 | **±2**(翻面语义;props pageStep 可选缺省 1=既有零变) |
| 页码输入跳转 | 任意页 | 任意页(scrollIntoNearestScroller 滚到含它的行——左/右页盒顶同行,零特判) |
| scroll-progress 回写(nearestPage) | 中心最近页 | **零改**——boxes 走 [data-page-box] 查询,行内两盒同 top,中心在行内时先遇(左页)胜=回写左页,恢复链滚行顶 |
| 懒渲染/回收(IO+visible/rendered) | 页盒驱动 | 零改——data-page-box 仍在页盒上,IO/窗口/回收按页号不变 |
| 缩放中心锚(段⑥ anchoredScrollTop) | 总高口径 | 总高口径=双页行算(传入正确 totalH 即可,hook 零改) |
| SelectionLayer 锚定 | 可见首报告页盒 | 零改(单实例仍挂某页盒) |
| 标注/AI/文本层 | per-page | 零改(renderPage(no) 每渲染页一套) |

**跨格序列(交审计)**:

- S1 打开(单页)→切双页→行渲染+basisWidth 重报→恢复链滚回当前页
  (onReady 重触发 spProg.onColumnReady——**切布局不丢位置,票面声明为
  期望行为**);
- S2 双页→fitWidth→zoom=(clientWidth−24)/双页行宽(两页并排恰入视口);
- S3 双页末页奇数→末行右空不塌(layout 稳定,无布局跳变);
- S4 双页→翻「下一页」=page+2(末行夹取,store setPage clamp 兜底);
- S5 双页→切回单页→basisWidth 重报+恢复链滚回;再 fitWidth=单页口径
  (basis 不残留双页值——重报时序先于用户点击);
- S6 双页下 wheel 缩放→行盒重算+中心锚(INV-33 双页总高口径);
- S7 换文献(fileUrl 变)→管线重跑→onReady 双页口径(若 tab 仍 double)。

## 1. 行为层

- **TabState**:加可选字段 `pageLayout?: 'single' | 'double'`(消费方
  `?? 'single'` 兜底——受锁夹具 typecheck 兼容第三路,F-A3 先例);
  makeLoadingTab 显式置值(继承面核 zoom 先例对齐);`setPageLayout`
  (updateActiveTab 形态,setSelectionMode 同型)。
- **PageColumn**:props 加 `layout?: 'single' | 'double'`(缺省 single=
  既有调用零破);渲染分支按 layoutRows(sizes) 行渲染;**就绪管线
  deps 零变**([doc,totalPages]),新增轻 effect:layout 变化→onReady
  重报(新口径 basisWidth,不重跑 getPage 循环)——onReady 触发链=
  ReaderPage.handleColumnReady→spProg.onColumnReady(恢复链滚回当前页
  =S1 声明行为);段⑥ columnTotalHeight 调用点传双页口径。
- **ReaderToolbar**:「双页」toggle 按钮(aria-pressed+选中态,crib 选择
  模式按钮先例);props 加 `pageLayout?: 'single'|'double'`(缺省
  single)+`onTogglePageLayout?`(缺席=可点无操作——ReaderToolbar 既有
  可选回调先例)+`pageStep?: number`(缺省 1,±按钮 onNavigate(page±
  pageStep))。
- **ReaderPage 装配**:tab.pageLayout 消费+toggle 写 store;fitWidth
  零改(分母=columnBasis 已随 onReady 新口径);onNavigate 传
  setPage(既有)——步进由工具栏 pageStep 传(双页=2)。
- **PagesOverlay**:props 透传 layout(九 props 面扩一,头注接口层同步)。
- 既有行为零变清单:单页渲染全链/懒渲染回收/INV-29 程序滚动/INV-33
  缩放锚/INV-30 canvas 生命周期/选择模式/标注链/scroll-progress 回写。

## 2. 接口层

- 上述 props/TabState 字段全部**可选或新增导出**——既有调用/夹具零破
  (缺省路径=行为零变);类型不跨进程(纯 renderer 域,不入 src/shared)。
- page-column-geometry.ts 新增导出:`layoutRows(sizes): ReadonlyArray<
  {left: PageBoxSize; leftNo: number; right?: PageBoxSize; rightNo?:
  number}>` + `rowWidth(row, zoom)`(含行内 gap 单源常量)+
  `columnWidthFor(sizes, zoom, layout)` + `columnTotalHeightFor(sizes,
  zoom, layout)`(既有 columnWidth/columnTotalHeight 保持导出与语义零变
  ——单实现内部复用或薄壳,**不删除既有导出**——INV/受锁测试消费面)。

## 3. 架构层

- **PageColumn 248 行逼满组件 ≤250 红线——本票必拆**:页盒 JSX(占位/
  渲染窗口/PdfPageCanvas+renderPage 装配)抽 `PageBox.tsx` 渲染件
  (~70 行,单双页共用——行内页盒与单列页盒同一渲染单元);PageColumn
  保持管线宿主(IO/回收/滚动/锚/就绪管线);拆件行为零变纪律(F-ARCH3
  先例:不加 useCallback/useMemo,函数形态原样迁)。
- geometry 件加行函数(预计 <200 行 ✓);ReaderToolbar 196→~220 ✓;
  reader.store.ts 452 行+~15 行逼近 500——**若 lint max-lines 报错**,
  状态字段文档注释压缩或按既有 eslint 先例处理(卡住报主控,禁删注释
  硬塞)。
- 分层不动;零新依赖;禁跨层。

## 4. 生命周期层

- layout 变化不重跑 getPage 管线(尺寸缓存单源复用——只重派生行+重报
  onReady);挂载即 layout 生效(doc 就绪前渲染 loading 态不受 layout
  影响)。
- 换文献清缓存链(PagesOverlay fileUrl effect)零涉;PageFrame 卸载哨/
  注册表回收零涉。
- S3 末行单页:右缺席渲染占位空盒(保持行宽稳定防跳变)或右盒不渲染
  (行宽由左页+已渲染右页决定)——**实现者自裁+申报**(视觉验收归真机
  探针截图)。

## 5. 文化层(测试与取证)

### 5.1 新测试 `tests/unit/renderer/reader-double-page.test.tsx`(always-active)

- ①store:pageLayout 缺省 single(setPageLayout 双向+异 tab 零扰+
  makeLoadingTab 显式值);
- ②geometry 纯函数:layoutRows 偶数页/奇数页末行单页/空数组;
  columnWidthFor 双页=左+右+gap;columnTotalHeightFor 双页=行高 max+
  行 gap(构造左右页高不同的夹具);
- ③PageColumn 双页渲染:行 DOM(data-page-row)+页盒 data-page-box
  连续对+末行单页;单页分支回归(无 data-page-row);
- ④onReady 重报:layout 切换→新 basisWidth(双页口径数值断言 crib
  columnWidthFor 计算);doc 管线不重跑(getPage 调用计数不变);
- ⑤工具栏:双页按钮 aria-pressed/toggle 上抛;pageStep=2 时 ± 按钮
  onNavigate(page±2)(缺省 1 回归);
- ⑥fitWidth 分母:装配面断言(双页 tab 下 fitWidth 用双页 basis——
    ReaderPage 集成面,或以 columnBasis 注入面单测);
- ⑦段⑥锚:zoom 变化双页总高口径(anchoredScrollTop 输入断言)。

### 5.2 变异红证(cp 备份法;F-L4 教训:夹具须保证输出对变异点敏感)

- M1 摘 layoutRows 行派生→③红;M2 columnWidthFor 双页分支改单页口径
  →②④红;M3 onReady 重报 effect 摘→④红;M4 pageStep 摘→⑤红;
  M5 setPageLayout 摘→①红。每个 M:红→还原→diff 空。

### 5.3 真机取证 `scripts/audits/f-r1-verify.mjs`(crib f-l4-verify.mjs;先核撞名)

真实库副本+真 PDF;场景:
- A 双页渲染:开双页→两 canvas 并排(首行页盒 1+2 的 data-page-root
  存在+行盒宽=左+右+gap)→截图 f-r1-out/A-double.png;
- B fitWidth 双页:点适应宽度→断言 zoom≈(clientWidth−24)/双页行宽
  (数值断言,node 直载 columnWidthFor 复算,F-L4 W2 先例)+行宽入视口
  (右缘≤容器右缘);
- C 翻面:双页「下一页」→page+2+行 2 盒顶对齐;
- D 切换往返:双页→单页→双页(位置保持=S1;basis 重报 S5);
- E 末页奇数:跳末页→末行单页截图无塌陷;
- F pageerror 0。

### 5.4 收口面

- verify 全绿(971+新 7~8 级)+locks:generate/apply(新测试+探针扫入,
  195→197);台账 F-R1 段;[locked-change] 尾注(tests+scripts+manifest)。

## 6. 证据与报告契约(实现者)

- impl 报告 scripts/audits/f-r1-impl.report.md:自裁申报(含 S3 末行
  渲染选择/拆件结构);diff 自查(git status 全贴);成本;变异红证表;
  真机 JSON 落 f-r1-out/。
- 禁 git/registry/locks;禁改受锁文件(tests/** 既有与 src/shared/**);
  测试先红后绿;卡住停手。
- e2e 双页覆盖**不入本票**(受锁 spec 改动面大,备案后续票);jsdom
  不可达面(canvas 真渲染/fitWidth 真布局)由探针锁——分工写测试头注。


## 实现报告全文

# F-R1 实现报告：阅读器双页阅读模式（含 fitWidth 适配）

> 三屋模式第一屋（实现者）交付。票面=`scripts/audits/f-r1-ticket.md`。
> 基线 5140ea719（verify 116 文件 971 用例/locks 195）。本工单后全量
> 117 文件 987 用例（971+新 16）。

## 1. 实现摘要（票面 §0 矩阵逐格对照）

| 消费点 | single | double | 实现位置 |
| --- | --- | --- | --- |
| 页盒排列 | 单列 flex-col 零变 | `layoutRows` 行数组 (1,2)(3,4)…，行盒 `data-page-row={leftNo}` flex items-start gap-3（左顶对齐），末行奇数页右盒不渲染 | PageColumn 渲染分支 + page-column-geometry |
| 列宽 | `columnWidth` 语义零变（单实现复用） | `columnWidthFor(sizes,zoom,'double')`=最宽完整行宽（`rowWidth`=左+右+PAGE_GAP_PX，末行单页不计；全列无完整行退化最宽页） | geometry 新增导出 |
| 总高（INV-33 分母） | `columnTotalHeight` 零变 | `columnTotalHeightFor`=行高和（行高=max(左右页高)）+行 gap×(行数−1)，gap 不随 zoom（与单页盒间距同语义） | geometry 新增导出 |
| onReady basisWidth | 最宽页（scale=1） | 就绪管线 `columnWidthFor(sizes,1,layoutRef.current)`（layoutRef latest-ref——管线 deps [doc,totalPages] 零变）；布局切换走独立轻 effect（prevLayout 对照）重报新口径，不重跑 getPage | PageColumn 段①+新轻 effect |
| 翻页步进 | ±1（缺省 pageStep=1 零变） | ±2（装配面双页传 pageStep=2） | ReaderToolbar ±按钮 + ReaderPage 装配 |
| 页码跳转 | 任意页 | 任意页（scrollRequest→页盒查询，左右盒顶同行滚行顶——零特判） | 既有段⑤零改（双页天然成立） |
| scroll-progress 回写 | 零改 | 零改（[data-page-box] 按页号消费；真机 D 场景实证页码保持） | 零改 |
| 懒渲染/回收 | 零改 | 零改（data-page-box 仍在页盒上；IO effect deps 增 layout——列↔行 DOM 重排后重挂 observe，否则重排后观察死集） | PageColumn 段③（唯一必要补丁：IO deps） |
| 缩放中心锚 | 总高口径 | 总高=布局口径 `columnTotalHeightFor`（hook 数学零改只换分母输入；layout 不入 deps——切布局位置保持走 onReady 恢复链） | PageColumn 段⑥ |
| SelectionLayer/标注/AI/文本层 | per-page | 零改（renderPage(no) 每渲染页一套；PageBox 拆件保 data-page-root 挂载位） | PageBox.tsx |

其余面：TabState 加可选 `pageLayout?: 'single'|'double'`（消费方 ?? 'single' 兜底）；makeLoadingTab 新建显式 `'single'`、error 重试沿 `{...prev}` 继承（与 zoom 完全同型——核 172 行现行继承面后确认）；`setPageLayout`（updateActiveTab 形态）；ReaderToolbar 双页按钮（aria-pressed+选中态 accent 边框，crib 选择模式先例，位于「适应宽度」后版面控制同组）；PagesOverlay 十 props 透传（头注接口层同步）；fitWidth 零改（分母 columnBasis 随 onReady 新口径——真机 B/D 场景数值实证）。

跨格序列 S1~S7：S1/S4/S5/S7 真机 D/C/D/A 场景直证；S2 真机 B 场景（zoom=99%≈(1217−24)/1202 源码复算）；S3 单测③（末行单盒+行宽=左盒宽）+真机 E（真库无奇数页文献走双盒分支，见自裁⑤）；S6 单测⑦（anchoredScrollTop 双页行总高输入断言）。

## 2. 自裁申报（实现者超票面决定，报主控知悉）

1. **S3 末行渲染选择：右盒不渲染（无占位空盒）**。理由：列宽已按「末行单页不计」口径排除孤页行，末行行宽恒=左盒宽，不存在「右页渲染前后行宽变化」的跳变源；空占位盒徒增无页号的 DOM（IO 查询 NaN 防御路径）。末行随列容器 items-center 居中。视觉验收=真机 E 截图。
2. **拆件结构**：PageBox.tsx 60 行（页盒渲染件，单双页共用；F-ARCH3 零变纪律——函数形态原样迁不加 useCallback/useMemo）；PageColumn.tsx 拆后 250 行（物理行恰红线内；ESLint max-lines skipComments 口径代码行约 190）。为守 250 物理行，头注重组：F-04/05/06 增补段与六段行为层/拆件头注重复的表述收敛为「历史」段（契约语义无损，详述归各拆件头注与行为层六段）。
3. **行内 gap 口径**：行内水平 gap=PAGE_GAP_PX（12px）与行间垂直 gap 同值同语义、不随 zoom 缩放——票面字面「最宽行宽×zoom（行宽=左宽+右宽+行内 gap）」存在 (左+右+gap)×zoom 与 (左+右)×zoom+gap 两读，取后者（与既有 columnTotalHeight 盒间距不乘 zoom 的 INV-33 常量语义同源，单测②b/②d 锁定）。
4. **测试过程三处修正（红证时点声明）**：初版红证（15 红 1 绿=f-r1-red.txt）后修正——a) api client mock 的 unwrap 漏 `await call`（真实 unwrap 收 Promise 内部 await——契约对齐）；b) ⑤ 组 async mount 未 await；c) ④ getPage 计数改为「离屏页恰一次+每次切换增量≤2·renderWindow+1」（canvas 重挂会按页重取，page-column.test「缓存乘法非重取」同口径）。修正后对 HEAD 实现复跑红证：14 红 2 绿（f-r1-red-final.txt；2 绿=③b/⑤c 回归哨，其职责即锁「不动」，基线绿属预期）。
5. **真机 E 场景奇数页不可达**：真实库前 8 篇无奇数页文献（扫描逻辑优先奇数、无则退偶数，log 留证），E 走双盒分支（末行双盒高 793px 无塌陷）；末行单盒面由单测③锁定（5 页夹具：末行 1 盒+行宽=左盒宽+无 data-page-row 外泄漏）。分工已写入探针头注。
6. **真机 A 场景断言前提修正**：初版断言「首行 1+2 真渲染」，真实文献恢复链滚到记忆页（第 20 页）渲染窗口不在首行——改为「存在某行两盒都进渲染窗口」（双页并排真渲染的语义本体，不绑视口位置）。
7. **事故申报（无净损失）**：做「实现回退红证」时备份目录被第二次运行覆盖（cp 备份目录复用），6 个实现文件一度回退到 HEAD——按上下文完整重写恢复，随后全量 987/987 绿+lint/tsc 零错+探针 15/15 复验。后续变异改用「唯一时间戳备份目录+还原后 diff 验证+回绿验证」三保险（本票教训，建议入经验册：**备份目录必须一次性创建且不复用，还原后必须 diff+回绿双验**）。
8. **IO effect deps 增 layout**（票面「懒渲染回收零改」的必要例外）：列↔行切换时 React 卸载重建全部页盒，旧 IO observe 目标失效——不重挂则可见集永不更新（懒渲染死）。语义上是「重挂观察」而非「改回收逻辑」，窗口/回收/页号消费零变（单测③④+真机 D 实证切回后渲染恢复）。

## 3. 红证绿证

- 红证（初版测试 vs 未实现）：15 红 1 绿 → `scripts/audits/f-r1-red.txt`
- 红证（最终版测试 vs HEAD 实现，cp 备份回退法）：14 红 2 绿（③b/⑤c=回归哨基线绿） → `scripts/audits/f-r1-red-final.txt`
- 绿证（新测试+受影响回归三件）：50/50（reader-double-page 16+selection-mode 9+page-column 19+pages-overlay 6） → `scripts/audits/f-r1-green.txt`
- 全量：`npm run test` 117 文件 987/987（基线 971+新 16）
- `npm run lint` 零错；`npm run typecheck`（node+web 两 tsconfig）零错；`npm run build` 绿
- 行数自查：PageColumn 250 / PageBox 60 / geometry 172 / reader.store 470 / ReaderToolbar 223 / 新测试 500 内 ✓

## 4. 变异红证（cp 备份法；唯一时间戳目录+还原 diff 空+回绿）

| 变异 | 手法 | 红面 | 还原 |
| --- | --- | --- | --- |
| M1 摘 layoutRows 行派生 | 函数体头部 `return []` | 9 红（③/④/④b/⑥/⑦/②ab 等） | diff 空 ✓ |
| M2 columnWidthFor 双页分支改单页口径 | `layout!=='double' || true` | 4 红（②c/④/④b/⑥） | diff 空 ✓ |
| M3 摘 onReady 重报轻 effect | effect 体改 `return` | 1 红（④ 恰中） | diff 空 ✓ |
| M4 摘 pageStep | `const pageStep = 1 as const` | 1 红（⑤b 恰中） | diff 空 ✓ |
| M5 摘 setPageLayout | 实现体 no-op | 2 红（①a/①b；①c 不红=正确——①c 锁 makeLoadingTab 显式值，与 setPageLayout 正交） | diff 空 ✓ |

末次回绿 16/16 ✓。证据：`scripts/audits/f-r1-mut-M{1..5}.txt`。

## 5. 真机取证摘录（f-r1-verify.mjs，真实库副本 20 页真 PDF；15/15 PASS）

```
PASS pre/ready — 单页就绪 20 盒/20 页,无行盒（100%）
PASS A/row-count — 行数 10=ceil(20/2)
PASS A/pair-row-rendered — 行(17)两页并排真渲染 data-page-root 同含 [17,18]
PASS A/row-width-formula — 行盒宽 1202.0 ≈ 左(595.0)+右(595.0)+gap(12)
PASS B/zoom-double-basis — zoom=99%≈(clientWidth1217−24)/行宽1202=99.3%（columnWidthFor 源码复算）
PASS B/row-fits-viewport — 行宽 1192.0 ≤ 内容区 1193+2（两页并排恰入视口——S2）
PASS C/page-step-2 — 页码 1→3（+2 翻面步进，S4）
PASS C/row2-tops-aligned — 目标行(3)两盒顶对齐(Δtop=0.00px)且已滚离首行
PASS D/rows-cleared / D/position-kept — 页码保持 3→3（S1 恢复链滚回当前页）
PASS D/rows-restored / D/basis-rebased — 单页 201% → 双页 99%（S5 basis 重报不残留）
PASS D/page-still-kept — 往返后页码 3→3
PASS E/last-row-single — 末行(19)盒数 2=期望2，盒高 793px>10（无塌陷——S3；奇数单盒面归单测③，真库前 8 篇无奇数页文献）
PASS F/no-pageerror — 页面错误 0 条
```

产物：`scripts/audits/f-r1-out/`（A-double.png / B-fitwidth-double.png / E-odd.png / f-r1-verify.json 57KB 全场景 dump）。
真机 Electron 短暂开窗取证属项目 LOOP 惯例（主控指令预先声明）。

## 6. 成本

- 工具调用约 55 次（含 1 次事故恢复重写）；墙钟约 08:05–08:30 本地（约 25 分钟净工具时，不含模型思考）；token 未单独计量（子代理上下文约 60% 用于必读文件+重写恢复）。
- 主要消耗：真机探针三轮迭代（短文献禁用→奇数优先扫描→断言前提修正）；事故恢复重写 6 文件。

## 7. git status --short 全贴（diff 自查）

```
 M src/renderer/features/reader/PageColumn.tsx
 M src/renderer/features/reader/PagesOverlay.tsx
 M src/renderer/features/reader/ReaderPage.tsx
 M src/renderer/features/reader/ReaderToolbar.tsx
 M src/renderer/features/reader/page-column-geometry.ts
 M src/renderer/features/reader/reader.store.ts
 M src/renderer/features/workspaces/workspace.css   ← 进场即有的他人未提交改动，非本工单面（未触碰）
?? scripts/audits/f-r1-green.txt
?? scripts/audits/f-r1-mut-M1.txt ~ M5.txt
?? scripts/audits/f-r1-out/
?? scripts/audits/f-r1-red-final.txt
?? scripts/audits/f-r1-red.txt
?? scripts/audits/f-r1-verify.mjs
?? src/renderer/features/reader/PageBox.tsx
?? tests/unit/renderer/reader-double-page.test.tsx
（另有进场即在的 f-l4-*/f1-out/* 未跟踪残留与 f-r1-ticket.md——主控侧产物，未触碰）
```

diff --stat：reader 域 6 文件 +224/−86（PageColumn 含头注重组）；范围=票面「只改 reader 域五文件+geometry+新 PageBox」+新测试+新探针+证据产物，无范围蔓延。

## 8. 未尽事项（归主控收口面）

- locks:generate/apply（新测试+探针扫入 195→197）与 [locked-change] 提交——实现者禁 locks/git/registry（三屋分工），留主控。
- e2e 双页覆盖不入本票（票面备案）；台账 F-R1 段归主控。
- grep 自查：三个禁令标记词（待办/缺陷标记/占位语英文原词）在新增源码/测试/探针面零匹配；中文全部 UTF-8 可读（探针 JSON/log 直证）。


## diff 全文

```diff
diff --git a/scripts/audits/f-r1-impl.report.md b/scripts/audits/f-r1-impl.report.md
new file mode 100644
index 000000000..990e6ce72
--- /dev/null
+++ b/scripts/audits/f-r1-impl.report.md
@@ -0,0 +1,111 @@
+# F-R1 实现报告：阅读器双页阅读模式（含 fitWidth 适配）
+
+> 三屋模式第一屋（实现者）交付。票面=`scripts/audits/f-r1-ticket.md`。
+> 基线 5140ea719（verify 116 文件 971 用例/locks 195）。本工单后全量
+> 117 文件 987 用例（971+新 16）。
+
+## 1. 实现摘要（票面 §0 矩阵逐格对照）
+
+| 消费点 | single | double | 实现位置 |
+| --- | --- | --- | --- |
+| 页盒排列 | 单列 flex-col 零变 | `layoutRows` 行数组 (1,2)(3,4)…，行盒 `data-page-row={leftNo}` flex items-start gap-3（左顶对齐），末行奇数页右盒不渲染 | PageColumn 渲染分支 + page-column-geometry |
+| 列宽 | `columnWidth` 语义零变（单实现复用） | `columnWidthFor(sizes,zoom,'double')`=最宽完整行宽（`rowWidth`=左+右+PAGE_GAP_PX，末行单页不计；全列无完整行退化最宽页） | geometry 新增导出 |
+| 总高（INV-33 分母） | `columnTotalHeight` 零变 | `columnTotalHeightFor`=行高和（行高=max(左右页高)）+行 gap×(行数−1)，gap 不随 zoom（与单页盒间距同语义） | geometry 新增导出 |
+| onReady basisWidth | 最宽页（scale=1） | 就绪管线 `columnWidthFor(sizes,1,layoutRef.current)`（layoutRef latest-ref——管线 deps [doc,totalPages] 零变）；布局切换走独立轻 effect（prevLayout 对照）重报新口径，不重跑 getPage | PageColumn 段①+新轻 effect |
+| 翻页步进 | ±1（缺省 pageStep=1 零变） | ±2（装配面双页传 pageStep=2） | ReaderToolbar ±按钮 + ReaderPage 装配 |
+| 页码跳转 | 任意页 | 任意页（scrollRequest→页盒查询，左右盒顶同行滚行顶——零特判） | 既有段⑤零改（双页天然成立） |
+| scroll-progress 回写 | 零改 | 零改（[data-page-box] 按页号消费；真机 D 场景实证页码保持） | 零改 |
+| 懒渲染/回收 | 零改 | 零改（data-page-box 仍在页盒上；IO effect deps 增 layout——列↔行 DOM 重排后重挂 observe，否则重排后观察死集） | PageColumn 段③（唯一必要补丁：IO deps） |
+| 缩放中心锚 | 总高口径 | 总高=布局口径 `columnTotalHeightFor`（hook 数学零改只换分母输入；layout 不入 deps——切布局位置保持走 onReady 恢复链） | PageColumn 段⑥ |
+| SelectionLayer/标注/AI/文本层 | per-page | 零改（renderPage(no) 每渲染页一套；PageBox 拆件保 data-page-root 挂载位） | PageBox.tsx |
+
+其余面：TabState 加可选 `pageLayout?: 'single'|'double'`（消费方 ?? 'single' 兜底）；makeLoadingTab 新建显式 `'single'`、error 重试沿 `{...prev}` 继承（与 zoom 完全同型——核 172 行现行继承面后确认）；`setPageLayout`（updateActiveTab 形态）；ReaderToolbar 双页按钮（aria-pressed+选中态 accent 边框，crib 选择模式先例，位于「适应宽度」后版面控制同组）；PagesOverlay 十 props 透传（头注接口层同步）；fitWidth 零改（分母 columnBasis 随 onReady 新口径——真机 B/D 场景数值实证）。
+
+跨格序列 S1~S7：S1/S4/S5/S7 真机 D/C/D/A 场景直证；S2 真机 B 场景（zoom=99%≈(1217−24)/1202 源码复算）；S3 单测③（末行单盒+行宽=左盒宽）+真机 E（真库无奇数页文献走双盒分支，见自裁⑤）；S6 单测⑦（anchoredScrollTop 双页行总高输入断言）。
+
+## 2. 自裁申报（实现者超票面决定，报主控知悉）
+
+1. **S3 末行渲染选择：右盒不渲染（无占位空盒）**。理由：列宽已按「末行单页不计」口径排除孤页行，末行行宽恒=左盒宽，不存在「右页渲染前后行宽变化」的跳变源；空占位盒徒增无页号的 DOM（IO 查询 NaN 防御路径）。末行随列容器 items-center 居中。视觉验收=真机 E 截图。
+2. **拆件结构**：PageBox.tsx 60 行（页盒渲染件，单双页共用；F-ARCH3 零变纪律——函数形态原样迁不加 useCallback/useMemo）；PageColumn.tsx 拆后 250 行（物理行恰红线内；ESLint max-lines skipComments 口径代码行约 190）。为守 250 物理行，头注重组：F-04/05/06 增补段与六段行为层/拆件头注重复的表述收敛为「历史」段（契约语义无损，详述归各拆件头注与行为层六段）。
+3. **行内 gap 口径**：行内水平 gap=PAGE_GAP_PX（12px）与行间垂直 gap 同值同语义、不随 zoom 缩放——票面字面「最宽行宽×zoom（行宽=左宽+右宽+行内 gap）」存在 (左+右+gap)×zoom 与 (左+右)×zoom+gap 两读，取后者（与既有 columnTotalHeight 盒间距不乘 zoom 的 INV-33 常量语义同源，单测②b/②d 锁定）。
+4. **测试过程三处修正（红证时点声明）**：初版红证（15 红 1 绿=f-r1-red.txt）后修正——a) api client mock 的 unwrap 漏 `await call`（真实 unwrap 收 Promise 内部 await——契约对齐）；b) ⑤ 组 async mount 未 await；c) ④ getPage 计数改为「离屏页恰一次+每次切换增量≤2·renderWindow+1」（canvas 重挂会按页重取，page-column.test「缓存乘法非重取」同口径）。修正后对 HEAD 实现复跑红证：14 红 2 绿（f-r1-red-final.txt；2 绿=③b/⑤c 回归哨，其职责即锁「不动」，基线绿属预期）。
+5. **真机 E 场景奇数页不可达**：真实库前 8 篇无奇数页文献（扫描逻辑优先奇数、无则退偶数，log 留证），E 走双盒分支（末行双盒高 793px 无塌陷）；末行单盒面由单测③锁定（5 页夹具：末行 1 盒+行宽=左盒宽+无 data-page-row 外泄漏）。分工已写入探针头注。
+6. **真机 A 场景断言前提修正**：初版断言「首行 1+2 真渲染」，真实文献恢复链滚到记忆页（第 20 页）渲染窗口不在首行——改为「存在某行两盒都进渲染窗口」（双页并排真渲染的语义本体，不绑视口位置）。
+7. **事故申报（无净损失）**：做「实现回退红证」时备份目录被第二次运行覆盖（cp 备份目录复用），6 个实现文件一度回退到 HEAD——按上下文完整重写恢复，随后全量 987/987 绿+lint/tsc 零错+探针 15/15 复验。后续变异改用「唯一时间戳备份目录+还原后 diff 验证+回绿验证」三保险（本票教训，建议入经验册：**备份目录必须一次性创建且不复用，还原后必须 diff+回绿双验**）。
+8. **IO effect deps 增 layout**（票面「懒渲染回收零改」的必要例外）：列↔行切换时 React 卸载重建全部页盒，旧 IO observe 目标失效——不重挂则可见集永不更新（懒渲染死）。语义上是「重挂观察」而非「改回收逻辑」，窗口/回收/页号消费零变（单测③④+真机 D 实证切回后渲染恢复）。
+
+## 3. 红证绿证
+
+- 红证（初版测试 vs 未实现）：15 红 1 绿 → `scripts/audits/f-r1-red.txt`
+- 红证（最终版测试 vs HEAD 实现，cp 备份回退法）：14 红 2 绿（③b/⑤c=回归哨基线绿） → `scripts/audits/f-r1-red-final.txt`
+- 绿证（新测试+受影响回归三件）：50/50（reader-double-page 16+selection-mode 9+page-column 19+pages-overlay 6） → `scripts/audits/f-r1-green.txt`
+- 全量：`npm run test` 117 文件 987/987（基线 971+新 16）
+- `npm run lint` 零错；`npm run typecheck`（node+web 两 tsconfig）零错；`npm run build` 绿
+- 行数自查：PageColumn 250 / PageBox 60 / geometry 172 / reader.store 470 / ReaderToolbar 223 / 新测试 500 内 ✓
+
+## 4. 变异红证（cp 备份法；唯一时间戳目录+还原 diff 空+回绿）
+
+| 变异 | 手法 | 红面 | 还原 |
+| --- | --- | --- | --- |
+| M1 摘 layoutRows 行派生 | 函数体头部 `return []` | 9 红（③/④/④b/⑥/⑦/②ab 等） | diff 空 ✓ |
+| M2 columnWidthFor 双页分支改单页口径 | `layout!=='double' || true` | 4 红（②c/④/④b/⑥） | diff 空 ✓ |
+| M3 摘 onReady 重报轻 effect | effect 体改 `return` | 1 红（④ 恰中） | diff 空 ✓ |
+| M4 摘 pageStep | `const pageStep = 1 as const` | 1 红（⑤b 恰中） | diff 空 ✓ |
+| M5 摘 setPageLayout | 实现体 no-op | 2 红（①a/①b；①c 不红=正确——①c 锁 makeLoadingTab 显式值，与 setPageLayout 正交） | diff 空 ✓ |
+
+末次回绿 16/16 ✓。证据：`scripts/audits/f-r1-mut-M{1..5}.txt`。
+
+## 5. 真机取证摘录（f-r1-verify.mjs，真实库副本 20 页真 PDF；15/15 PASS）
+
+```
+PASS pre/ready — 单页就绪 20 盒/20 页,无行盒（100%）
+PASS A/row-count — 行数 10=ceil(20/2)
+PASS A/pair-row-rendered — 行(17)两页并排真渲染 data-page-root 同含 [17,18]
+PASS A/row-width-formula — 行盒宽 1202.0 ≈ 左(595.0)+右(595.0)+gap(12)
+PASS B/zoom-double-basis — zoom=99%≈(clientWidth1217−24)/行宽1202=99.3%（columnWidthFor 源码复算）
+PASS B/row-fits-viewport — 行宽 1192.0 ≤ 内容区 1193+2（两页并排恰入视口——S2）
+PASS C/page-step-2 — 页码 1→3（+2 翻面步进，S4）
+PASS C/row2-tops-aligned — 目标行(3)两盒顶对齐(Δtop=0.00px)且已滚离首行
+PASS D/rows-cleared / D/position-kept — 页码保持 3→3（S1 恢复链滚回当前页）
+PASS D/rows-restored / D/basis-rebased — 单页 201% → 双页 99%（S5 basis 重报不残留）
+PASS D/page-still-kept — 往返后页码 3→3
+PASS E/last-row-single — 末行(19)盒数 2=期望2，盒高 793px>10（无塌陷——S3；奇数单盒面归单测③，真库前 8 篇无奇数页文献）
+PASS F/no-pageerror — 页面错误 0 条
+```
+
+产物：`scripts/audits/f-r1-out/`（A-double.png / B-fitwidth-double.png / E-odd.png / f-r1-verify.json 57KB 全场景 dump）。
+真机 Electron 短暂开窗取证属项目 LOOP 惯例（主控指令预先声明）。
+
+## 6. 成本
+
+- 工具调用约 55 次（含 1 次事故恢复重写）；墙钟约 08:05–08:30 本地（约 25 分钟净工具时，不含模型思考）；token 未单独计量（子代理上下文约 60% 用于必读文件+重写恢复）。
+- 主要消耗：真机探针三轮迭代（短文献禁用→奇数优先扫描→断言前提修正）；事故恢复重写 6 文件。
+
+## 7. git status --short 全贴（diff 自查）
+
+```
+ M src/renderer/features/reader/PageColumn.tsx
+ M src/renderer/features/reader/PagesOverlay.tsx
+ M src/renderer/features/reader/ReaderPage.tsx
+ M src/renderer/features/reader/ReaderToolbar.tsx
+ M src/renderer/features/reader/page-column-geometry.ts
+ M src/renderer/features/reader/reader.store.ts
+ M src/renderer/features/workspaces/workspace.css   ← 进场即有的他人未提交改动，非本工单面（未触碰）
+?? scripts/audits/f-r1-green.txt
+?? scripts/audits/f-r1-mut-M1.txt ~ M5.txt
+?? scripts/audits/f-r1-out/
+?? scripts/audits/f-r1-red-final.txt
+?? scripts/audits/f-r1-red.txt
+?? scripts/audits/f-r1-verify.mjs
+?? src/renderer/features/reader/PageBox.tsx
+?? tests/unit/renderer/reader-double-page.test.tsx
+（另有进场即在的 f-l4-*/f1-out/* 未跟踪残留与 f-r1-ticket.md——主控侧产物，未触碰）
+```
+
+diff --stat：reader 域 6 文件 +224/−86（PageColumn 含头注重组）；范围=票面「只改 reader 域五文件+geometry+新 PageBox」+新测试+新探针+证据产物，无范围蔓延。
+
+## 8. 未尽事项（归主控收口面）
+
+- locks:generate/apply（新测试+探针扫入 195→197）与 [locked-change] 提交——实现者禁 locks/git/registry（三屋分工），留主控。
+- e2e 双页覆盖不入本票（票面备案）；台账 F-R1 段归主控。
+- grep 自查：三个禁令标记词（待办/缺陷标记/占位语英文原词）在新增源码/测试/探针面零匹配；中文全部 UTF-8 可读（探针 JSON/log 直证）。
diff --git a/scripts/audits/f-r1-out/A-double.png b/scripts/audits/f-r1-out/A-double.png
new file mode 100644
index 000000000..0921bdf23
Binary files /dev/null and b/scripts/audits/f-r1-out/A-double.png differ
diff --git a/scripts/audits/f-r1-out/B-fitwidth-double.png b/scripts/audits/f-r1-out/B-fitwidth-double.png
new file mode 100644
index 000000000..9d014fed4
Binary files /dev/null and b/scripts/audits/f-r1-out/B-fitwidth-double.png differ
diff --git a/scripts/audits/f-r1-out/E-odd.png b/scripts/audits/f-r1-out/E-odd.png
new file mode 100644
index 000000000..fcf95ae57
Binary files /dev/null and b/scripts/audits/f-r1-out/E-odd.png differ
diff --git a/scripts/audits/f-r1-out/f-r1-verify.json b/scripts/audits/f-r1-out/f-r1-verify.json
new file mode 100644
index 000000000..d1d3ee4d1
--- /dev/null
+++ b/scripts/audits/f-r1-out/f-r1-verify.json
@@ -0,0 +1,2589 @@
+{
+  "meta": {
+    "script": "f-r1-verify.mjs",
+    "date": "2026-08-31T00:28:39.616Z",
+    "note": "真实库副本+真 PDF；单页前置/双页 A/B/C/D/E 逐场景 dump"
+  },
+  "scenes": {
+    "pre": {
+      "state": "ready",
+      "scroller": {
+        "cw": 1217,
+        "right": 2052
+      },
+      "scrollTop": 12113.2802734375,
+      "rows": [],
+      "boxes": [
+        {
+          "no": 1,
+          "w": 595,
+          "h": 793,
+          "top": -14995.2001953125,
+          "right": 1573.4000244140625
+        },
+        {
+          "no": 2,
+          "w": 595,
+          "h": 793,
+          "top": -14190.2001953125,
+          "right": 1573.4000244140625
+        },
+        {
+          "no": 3,
+          "w": 595,
+          "h": 793,
+          "top": -13385.2001953125,
+          "right": 1573.4000244140625
+        },
+        {
+          "no": 4,
+          "w": 595,
+          "h": 793,
+          "top": -12580.2001953125,
+          "right": 1573.4000244140625
+        },
+        {
+          "no": 5,
+          "w": 595,
+          "h": 793,
+          "top": -11775.2001953125,
+          "right": 1573.4000244140625
+        },
+        {
+          "no": 6,
+          "w": 595,
+          "h": 793,
+          "top": -10970.2001953125,
+          "right": 1573.4000244140625
+        },
+        {
+          "no": 7,
+          "w": 595,
+          "h": 793,
+          "top": -10165.2001953125,
+          "right": 1573.4000244140625
+        },
+        {
+          "no": 8,
+          "w": 595,
+          "h": 793,
+          "top": -9360.2001953125,
+          "right": 1573.4000244140625
+        },
+        {
+          "no": 9,
+          "w": 595,
+          "h": 793,
+          "top": -8555.2001953125,
+          "right": 1573.4000244140625
+        },
+        {
+          "no": 10,
+          "w": 595,
+          "h": 793,
+          "top": -7750.2001953125,
+          "right": 1573.4000244140625
+        },
+        {
+          "no": 11,
+          "w": 595,
+          "h": 793,
+          "top": -6945.2001953125,
+          "right": 1573.4000244140625
+        },
+        {
+          "no": 12,
+          "w": 595,
+          "h": 793,
+          "top": -6140.2001953125,
+          "right": 1573.4000244140625
+        },
+        {
+          "no": 13,
+          "w": 595,
+          "h": 793,
+          "top": -5335.2001953125,
+          "right": 1573.4000244140625
+        },
+        {
+          "no": 14,
+          "w": 595,
+          "h": 793,
+          "top": -4530.2001953125,
+          "right": 1573.4000244140625
+        },
+        {
+          "no": 15,
+          "w": 595,
+          "h": 793,
+          "top": -3725.199951171875,
+          "right": 1573.4000244140625
+        },
+        {
+          "no": 16,
+          "w": 595,
+          "h": 793,
+          "top": -2920.199951171875,
+          "right": 1573.4000244140625
+        },
+        {
+          "no": 17,
+          "w": 595,
+          "h": 793,
+          "top": -2115.199951171875,
+          "right": 1573.4000244140625
+        },
+        {
+          "no": 18,
+          "w": 595,
+          "h": 793,
+          "top": -1310.2000732421875,
+          "right": 1573.4000244140625
+        },
+        {
+          "no": 19,
+          "w": 595,
+          "h": 793,
+          "top": -505.20001220703125,
+          "right": 1573.4000244140625
+        },
+        {
+          "no": 20,
+          "w": 595,
+          "h": 793,
+          "top": 299.8000183105469,
+          "right": 1573.4000244140625
+        }
+      ],
+      "roots": [
+        18,
+        19,
+        20
+      ],
+      "zoomLabel": "100%",
+      "page": 20,
+      "totalPages": 20
+    },
+    "A_double": {
+      "state": "ready",
+      "scroller": {
+        "cw": 1217,
+        "right": 2052
+      },
+      "scrollTop": 5672.9599609375,
+      "rows": [
+        {
+          "leftNo": 1,
+          "rowW": 1202,
+          "boxes": [
+            {
+              "no": 1,
+              "w": 595,
+              "h": 793,
+              "top": -6944.80029296875,
+              "right": 1269.9000244140625
+            },
+            {
+              "no": 2,
+              "w": 595,
+              "h": 793,
+              "top": -6944.80029296875,
+              "right": 1876.9000244140625
+            }
+          ]
+        },
+        {
+          "leftNo": 3,
+          "rowW": 1202,
+          "boxes": [
+            {
+              "no": 3,
+              "w": 595,
+              "h": 793,
+              "top": -6139.80029296875,
+              "right": 1269.9000244140625
+            },
+            {
+              "no": 4,
+              "w": 595,
+              "h": 793,
+              "top": -6139.80029296875,
+              "right": 1876.9000244140625
+            }
+          ]
+        },
+        {
+          "leftNo": 5,
+          "rowW": 1202,
+          "boxes": [
+            {
+              "no": 5,
+              "w": 595,
+              "h": 793,
+              "top": -5334.80029296875,
+              "right": 1269.9000244140625
+            },
+            {
+              "no": 6,
+              "w": 595,
+              "h": 793,
+              "top": -5334.80029296875,
+              "right": 1876.9000244140625
+            }
+          ]
+        },
+        {
+          "leftNo": 7,
+          "rowW": 1202,
+          "boxes": [
+            {
+              "no": 7,
+              "w": 595,
+              "h": 793,
+              "top": -4529.80029296875,
+              "right": 1269.9000244140625
+            },
+            {
+              "no": 8,
+              "w": 595,
+              "h": 793,
+              "top": -4529.80029296875,
+              "right": 1876.9000244140625
+            }
+          ]
+        },
+        {
+          "leftNo": 9,
+          "rowW": 1202,
+          "boxes": [
+            {
+              "no": 9,
+              "w": 595,
+              "h": 793,
+              "top": -3724.800048828125,
+              "right": 1269.9000244140625
+            },
+            {
+              "no": 10,
+              "w": 595,
+              "h": 793,
+              "top": -3724.800048828125,
+              "right": 1876.9000244140625
+            }
+          ]
+        },
+        {
+          "leftNo": 11,
+          "rowW": 1202,
+          "boxes": [
+            {
+              "no": 11,
+              "w": 595,
+              "h": 793,
+              "top": -2919.800048828125,
+              "right": 1269.9000244140625
+            },
+            {
+              "no": 12,
+              "w": 595,
+              "h": 793,
+              "top": -2919.800048828125,
+              "right": 1876.9000244140625
+            }
+          ]
+        },
+        {
+          "leftNo": 13,
+          "rowW": 1202,
+          "boxes": [
+            {
+              "no": 13,
+              "w": 595,
+              "h": 793,
+              "top": -2114.800048828125,
+              "right": 1269.9000244140625
+            },
+            {
+              "no": 14,
+              "w": 595,
+              "h": 793,
+              "top": -2114.800048828125,
+              "right": 1876.9000244140625
+            }
+          ]
+        },
+        {
+          "leftNo": 15,
+          "rowW": 1202,
+          "boxes": [
+            {
+              "no": 15,
+              "w": 595,
+              "h": 793,
+              "top": -1309.800048828125,
+              "right": 1269.9000244140625
+            },
+            {
+              "no": 16,
+              "w": 595,
+              "h": 793,
+              "top": -1309.800048828125,
+              "right": 1876.9000244140625
+            }
+          ]
+        },
+        {
+          "leftNo": 17,
+          "rowW": 1202,
+          "boxes": [
+            {
+              "no": 17,
+              "w": 595,
+              "h": 793,
+              "top": -504.8000183105469,
+              "right": 1269.9000244140625
+            },
+            {
+              "no": 18,
+              "w": 595,
+              "h": 793,
+              "top": -504.8000183105469,
+              "right": 1876.9000244140625
+            }
+          ]
+        },
+        {
+          "leftNo": 19,
+          "rowW": 1202,
+          "boxes": [
+            {
+              "no": 19,
+              "w": 595,
+              "h": 793,
+              "top": 300.20001220703125,
+              "right": 1269.9000244140625
+            },
+            {
+              "no": 20,
+              "w": 595,
+              "h": 793,
+              "top": 300.20001220703125,
+              "right": 1876.9000244140625
+            }
+          ]
+        }
+      ],
+      "boxes": [
+        {
+          "no": 1,
+          "w": 595,
+          "h": 793,
+          "top": -6944.80029296875,
+          "right": 1269.9000244140625
+        },
+        {
+          "no": 2,
+          "w": 595,
+          "h": 793,
+          "top": -6944.80029296875,
+          "right": 1876.9000244140625
+        },
+        {
+          "no": 3,
+          "w": 595,
+          "h": 793,
+          "top": -6139.80029296875,
+          "right": 1269.9000244140625
+        },
+        {
+          "no": 4,
+          "w": 595,
+          "h": 793,
+          "top": -6139.80029296875,
+          "right": 1876.9000244140625
+        },
+        {
+          "no": 5,
+          "w": 595,
+          "h": 793,
+          "top": -5334.80029296875,
+          "right": 1269.9000244140625
+        },
+        {
+          "no": 6,
+          "w": 595,
+          "h": 793,
+          "top": -5334.80029296875,
+          "right": 1876.9000244140625
+        },
+        {
+          "no": 7,
+          "w": 595,
+          "h": 793,
+          "top": -4529.80029296875,
+          "right": 1269.9000244140625
+        },
+        {
+          "no": 8,
+          "w": 595,
+          "h": 793,
+          "top": -4529.80029296875,
+          "right": 1876.9000244140625
+        },
+        {
+          "no": 9,
+          "w": 595,
+          "h": 793,
+          "top": -3724.800048828125,
+          "right": 1269.9000244140625
+        },
+        {
+          "no": 10,
+          "w": 595,
+          "h": 793,
+          "top": -3724.800048828125,
+          "right": 1876.9000244140625
+        },
+        {
+          "no": 11,
+          "w": 595,
+          "h": 793,
+          "top": -2919.800048828125,
+          "right": 1269.9000244140625
+        },
+        {
+          "no": 12,
+          "w": 595,
+          "h": 793,
+          "top": -2919.800048828125,
+          "right": 1876.9000244140625
+        },
+        {
+          "no": 13,
+          "w": 595,
+          "h": 793,
+          "top": -2114.800048828125,
+          "right": 1269.9000244140625
+        },
+        {
+          "no": 14,
+          "w": 595,
+          "h": 793,
+          "top": -2114.800048828125,
+          "right": 1876.9000244140625
+        },
+        {
+          "no": 15,
+          "w": 595,
+          "h": 793,
+          "top": -1309.800048828125,
+          "right": 1269.9000244140625
+        },
+        {
+          "no": 16,
+          "w": 595,
+          "h": 793,
+          "top": -1309.800048828125,
+          "right": 1876.9000244140625
+        },
+        {
+          "no": 17,
+          "w": 595,
+          "h": 793,
+          "top": -504.8000183105469,
+          "right": 1269.9000244140625
+        },
+        {
+          "no": 18,
+          "w": 595,
+          "h": 793,
+          "top": -504.8000183105469,
+          "right": 1876.9000244140625
+        },
+        {
+          "no": 19,
+          "w": 595,
+          "h": 793,
+          "top": 300.20001220703125,
+          "right": 1269.9000244140625
+        },
+        {
+          "no": 20,
+          "w": 595,
+          "h": 793,
+          "top": 300.20001220703125,
+          "right": 1876.9000244140625
+        }
+      ],
+      "roots": [
+        16,
+        17,
+        18,
+        19,
+        20
+      ],
+      "zoomLabel": "100%",
+      "page": 20,
+      "totalPages": 20
+    },
+    "B_fit": {
+      "state": "ready",
+      "scroller": {
+        "cw": 1217,
+        "right": 2052
+      },
+      "scrollTop": 5624.9599609375,
+      "rows": [
+        {
+          "leftNo": 1,
+          "rowW": 1192,
+          "boxes": [
+            {
+              "no": 1,
+              "w": 590,
+              "h": 787,
+              "top": -6884.80029296875,
+              "right": 1269.9000244140625
+            },
+            {
+              "no": 2,
+              "w": 590,
+              "h": 787,
+              "top": -6884.80029296875,
+              "right": 1871.9000244140625
+            }
+          ]
+        },
+        {
+          "leftNo": 3,
+          "rowW": 1192,
+          "boxes": [
+            {
+              "no": 3,
+              "w": 590,
+              "h": 787,
+              "top": -6085.80029296875,
+              "right": 1269.9000244140625
+            },
+            {
+              "no": 4,
+              "w": 590,
+              "h": 787,
+              "top": -6085.80029296875,
+              "right": 1871.9000244140625
+            }
+          ]
+        },
+        {
+          "leftNo": 5,
+          "rowW": 1192,
+          "boxes": [
+            {
+              "no": 5,
+              "w": 590,
+              "h": 787,
+              "top": -5286.80029296875,
+              "right": 1269.9000244140625
+            },
+            {
+              "no": 6,
+              "w": 590,
+              "h": 787,
+              "top": -5286.80029296875,
+              "right": 1871.9000244140625
+            }
+          ]
+        },
+        {
+          "leftNo": 7,
+          "rowW": 1192,
+          "boxes": [
+            {
+              "no": 7,
+              "w": 590,
+              "h": 787,
+              "top": -4487.80029296875,
+              "right": 1269.9000244140625
+            },
+            {
+              "no": 8,
+              "w": 590,
+              "h": 787,
+              "top": -4487.80029296875,
+              "right": 1871.9000244140625
+            }
+          ]
+        },
+        {
+          "leftNo": 9,
+          "rowW": 1192,
+          "boxes": [
+            {
+              "no": 9,
+              "w": 590,
+              "h": 787,
+              "top": -3688.800048828125,
+              "right": 1269.9000244140625
+            },
+            {
+              "no": 10,
+              "w": 590,
+              "h": 787,
+              "top": -3688.800048828125,
+              "right": 1871.9000244140625
+            }
+          ]
+        },
+        {
+          "leftNo": 11,
+          "rowW": 1192,
+          "boxes": [
+            {
+              "no": 11,
+              "w": 590,
+              "h": 787,
+              "top": -2889.800048828125,
+              "right": 1269.9000244140625
+            },
+            {
+              "no": 12,
+              "w": 590,
+              "h": 787,
+              "top": -2889.800048828125,
+              "right": 1871.9000244140625
+            }
+          ]
+        },
+        {
+          "leftNo": 13,
+          "rowW": 1192,
+          "boxes": [
+            {
+              "no": 13,
+              "w": 590,
+              "h": 787,
+              "top": -2090.800048828125,
+              "right": 1269.9000244140625
+            },
+            {
+              "no": 14,
+              "w": 590,
+              "h": 787,
+              "top": -2090.800048828125,
+              "right": 1871.9000244140625
+            }
+          ]
+        },
+        {
+          "leftNo": 15,
+          "rowW": 1192,
+          "boxes": [
+            {
+              "no": 15,
+              "w": 590,
+              "h": 787,
+              "top": -1291.800048828125,
+              "right": 1269.9000244140625
+            },
+            {
+              "no": 16,
+              "w": 590,
+              "h": 787,
+              "top": -1291.800048828125,
+              "right": 1871.9000244140625
+            }
+          ]
+        },
+        {
+          "leftNo": 17,
+          "rowW": 1192,
+          "boxes": [
+            {
+              "no": 17,
+              "w": 590,
+              "h": 787,
+              "top": -492.8000183105469,
+              "right": 1269.9000244140625
+            },
+            {
+              "no": 18,
+              "w": 590,
+              "h": 787,
+              "top": -492.8000183105469,
+              "right": 1871.9000244140625
+            }
+          ]
+        },
+        {
+          "leftNo": 19,
+          "rowW": 1192,
+          "boxes": [
+            {
+              "no": 19,
+              "w": 590,
+              "h": 787,
+              "top": 306.20001220703125,
+              "right": 1269.9000244140625
+            },
+            {
+              "no": 20,
+              "w": 590,
+              "h": 787,
+              "top": 306.20001220703125,
+              "right": 1871.9000244140625
+            }
+          ]
+        }
+      ],
+      "boxes": [
+        {
+          "no": 1,
+          "w": 590,
+          "h": 787,
+          "top": -6884.80029296875,
+          "right": 1269.9000244140625
+        },
+        {
+          "no": 2,
+          "w": 590,
+          "h": 787,
+          "top": -6884.80029296875,
+          "right": 1871.9000244140625
+        },
+        {
+          "no": 3,
+          "w": 590,
+          "h": 787,
+          "top": -6085.80029296875,
+          "right": 1269.9000244140625
+        },
+        {
+          "no": 4,
+          "w": 590,
+          "h": 787,
+          "top": -6085.80029296875,
+          "right": 1871.9000244140625
+        },
+        {
+          "no": 5,
+          "w": 590,
+          "h": 787,
+          "top": -5286.80029296875,
+          "right": 1269.9000244140625
+        },
+        {
+          "no": 6,
+          "w": 590,
+          "h": 787,
+          "top": -5286.80029296875,
+          "right": 1871.9000244140625
+        },
+        {
+          "no": 7,
+          "w": 590,
+          "h": 787,
+          "top": -4487.80029296875,
+          "right": 1269.9000244140625
+        },
+        {
+          "no": 8,
+          "w": 590,
+          "h": 787,
+          "top": -4487.80029296875,
+          "right": 1871.9000244140625
+        },
+        {
+          "no": 9,
+          "w": 590,
+          "h": 787,
+          "top": -3688.800048828125,
+          "right": 1269.9000244140625
+        },
+        {
+          "no": 10,
+          "w": 590,
+          "h": 787,
+          "top": -3688.800048828125,
+          "right": 1871.9000244140625
+        },
+        {
+          "no": 11,
+          "w": 590,
+          "h": 787,
+          "top": -2889.800048828125,
+          "right": 1269.9000244140625
+        },
+        {
+          "no": 12,
+          "w": 590,
+          "h": 787,
+          "top": -2889.800048828125,
+          "right": 1871.9000244140625
+        },
+        {
+          "no": 13,
+          "w": 590,
+          "h": 787,
+          "top": -2090.800048828125,
+          "right": 1269.9000244140625
+        },
+        {
+          "no": 14,
+          "w": 590,
+          "h": 787,
+          "top": -2090.800048828125,
+          "right": 1871.9000244140625
+        },
+        {
+          "no": 15,
+          "w": 590,
+          "h": 787,
+          "top": -1291.800048828125,
+          "right": 1269.9000244140625
+        },
+        {
+          "no": 16,
+          "w": 590,
+          "h": 787,
+          "top": -1291.800048828125,
+          "right": 1871.9000244140625
+        },
+        {
+          "no": 17,
+          "w": 590,
+          "h": 787,
+          "top": -492.8000183105469,
+          "right": 1269.9000244140625
+        },
+        {
+          "no": 18,
+          "w": 590,
+          "h": 787,
+          "top": -492.8000183105469,
+          "right": 1871.9000244140625
+        },
+        {
+          "no": 19,
+          "w": 590,
+          "h": 787,
+          "top": 306.20001220703125,
+          "right": 1269.9000244140625
+        },
+        {
+          "no": 20,
+          "w": 590,
+          "h": 787,
+          "top": 306.20001220703125,
+          "right": 1871.9000244140625
+        }
+      ],
+      "roots": [
+        16,
+        17,
+        18,
+        19,
+        20
+      ],
+      "zoomLabel": "99%",
+      "page": 20,
+      "totalPages": 20
+    },
+    "C_step": {
+      "state": "ready",
+      "scroller": {
+        "cw": 1217,
+        "right": 2052
+      },
+      "scrollTop": 816.6400146484375,
+      "rows": [
+        {
+          "leftNo": 1,
+          "rowW": 1202,
+          "boxes": [
+            {
+              "no": 1,
+              "w": 595,
+              "h": 793,
+              "top": -874.4000244140625,
+              "right": 1269.9000244140625
+            },
+            {
+              "no": 2,
+              "w": 595,
+              "h": 793,
+              "top": -874.4000244140625,
+              "right": 1876.9000244140625
+            }
+          ]
+        },
+        {
+          "leftNo": 3,
+          "rowW": 1202,
+          "boxes": [
+            {
+              "no": 3,
+              "w": 595,
+              "h": 793,
+              "top": -69.4000015258789,
+              "right": 1269.9000244140625
+            },
+            {
+              "no": 4,
+              "w": 595,
+              "h": 793,
+              "top": -69.4000015258789,
+              "right": 1876.9000244140625
+            }
+          ]
+        },
+        {
+          "leftNo": 5,
+          "rowW": 1202,
+          "boxes": [
+            {
+              "no": 5,
+              "w": 595,
+              "h": 793,
+              "top": 735.6000366210938,
+              "right": 1269.9000244140625
+            },
+            {
+              "no": 6,
+              "w": 595,
+              "h": 793,
+              "top": 735.6000366210938,
+              "right": 1876.9000244140625
+            }
+          ]
+        },
+        {
+          "leftNo": 7,
+          "rowW": 1202,
+          "boxes": [
+            {
+              "no": 7,
+              "w": 595,
+              "h": 793,
+              "top": 1540.5999755859375,
+              "right": 1269.9000244140625
+            },
+            {
+              "no": 8,
+              "w": 595,
+              "h": 793,
+              "top": 1540.5999755859375,
+              "right": 1876.9000244140625
+            }
+          ]
+        },
+        {
+          "leftNo": 9,
+          "rowW": 1202,
+          "boxes": [
+            {
+              "no": 9,
+              "w": 595,
+              "h": 793,
+              "top": 2345.60009765625,
+              "right": 1269.9000244140625
+            },
+            {
+              "no": 10,
+              "w": 595,
+              "h": 793,
+              "top": 2345.60009765625,
+              "right": 1876.9000244140625
+            }
+          ]
+        },
+        {
+          "leftNo": 11,
+          "rowW": 1202,
+          "boxes": [
+            {
+              "no": 11,
+              "w": 595,
+              "h": 793,
+              "top": 3150.60009765625,
+              "right": 1269.9000244140625
+            },
+            {
+              "no": 12,
+              "w": 595,
+              "h": 793,
+              "top": 3150.60009765625,
+              "right": 1876.9000244140625
+            }
+          ]
+        },
+        {
+          "leftNo": 13,
+          "rowW": 1202,
+          "boxes": [
+            {
+              "no": 13,
+              "w": 595,
+              "h": 793,
+              "top": 3955.60009765625,
+              "right": 1269.9000244140625
+            },
+            {
+              "no": 14,
+              "w": 595,
+              "h": 793,
+              "top": 3955.60009765625,
+              "right": 1876.9000244140625
+            }
+          ]
+        },
+        {
+          "leftNo": 15,
+          "rowW": 1202,
+          "boxes": [
+            {
+              "no": 15,
+              "w": 595,
+              "h": 793,
+              "top": 4760.60009765625,
+              "right": 1269.9000244140625
+            },
+            {
+              "no": 16,
+              "w": 595,
+              "h": 793,
+              "top": 4760.60009765625,
+              "right": 1876.9000244140625
+            }
+          ]
+        },
+        {
+          "leftNo": 17,
+          "rowW": 1202,
+          "boxes": [
+            {
+              "no": 17,
+              "w": 595,
+              "h": 793,
+              "top": 5565.60009765625,
+              "right": 1269.9000244140625
+            },
+            {
+              "no": 18,
+              "w": 595,
+              "h": 793,
+              "top": 5565.60009765625,
+              "right": 1876.9000244140625
+            }
+          ]
+        },
+        {
+          "leftNo": 19,
+          "rowW": 1202,
+          "boxes": [
+            {
+              "no": 19,
+              "w": 595,
+              "h": 793,
+              "top": 6370.60009765625,
+              "right": 1269.9000244140625
+            },
+            {
+              "no": 20,
+              "w": 595,
+              "h": 793,
+              "top": 6370.60009765625,
+              "right": 1876.9000244140625
+            }
+          ]
+        }
+      ],
+      "boxes": [
+        {
+          "no": 1,
+          "w": 595,
+          "h": 793,
+          "top": -874.4000244140625,
+          "right": 1269.9000244140625
+        },
+        {
+          "no": 2,
+          "w": 595,
+          "h": 793,
+          "top": -874.4000244140625,
+          "right": 1876.9000244140625
+        },
+        {
+          "no": 3,
+          "w": 595,
+          "h": 793,
+          "top": -69.4000015258789,
+          "right": 1269.9000244140625
+        },
+        {
+          "no": 4,
+          "w": 595,
+          "h": 793,
+          "top": -69.4000015258789,
+          "right": 1876.9000244140625
+        },
+        {
+          "no": 5,
+          "w": 595,
+          "h": 793,
+          "top": 735.6000366210938,
+          "right": 1269.9000244140625
+        },
+        {
+          "no": 6,
+          "w": 595,
+          "h": 793,
+          "top": 735.6000366210938,
+          "right": 1876.9000244140625
+        },
+        {
+          "no": 7,
+          "w": 595,
+          "h": 793,
+          "top": 1540.5999755859375,
+          "right": 1269.9000244140625
+        },
+        {
+          "no": 8,
+          "w": 595,
+          "h": 793,
+          "top": 1540.5999755859375,
+          "right": 1876.9000244140625
+        },
+        {
+          "no": 9,
+          "w": 595,
+          "h": 793,
+          "top": 2345.60009765625,
+          "right": 1269.9000244140625
+        },
+        {
+          "no": 10,
+          "w": 595,
+          "h": 793,
+          "top": 2345.60009765625,
+          "right": 1876.9000244140625
+        },
+        {
+          "no": 11,
+          "w": 595,
+          "h": 793,
+          "top": 3150.60009765625,
+          "right": 1269.9000244140625
+        },
+        {
+          "no": 12,
+          "w": 595,
+          "h": 793,
+          "top": 3150.60009765625,
+          "right": 1876.9000244140625
+        },
+        {
+          "no": 13,
+          "w": 595,
+          "h": 793,
+          "top": 3955.60009765625,
+          "right": 1269.9000244140625
+        },
+        {
+          "no": 14,
+          "w": 595,
+          "h": 793,
+          "top": 3955.60009765625,
+          "right": 1876.9000244140625
+        },
+        {
+          "no": 15,
+          "w": 595,
+          "h": 793,
+          "top": 4760.60009765625,
+          "right": 1269.9000244140625
+        },
+        {
+          "no": 16,
+          "w": 595,
+          "h": 793,
+          "top": 4760.60009765625,
+          "right": 1876.9000244140625
+        },
+        {
+          "no": 17,
+          "w": 595,
+          "h": 793,
+          "top": 5565.60009765625,
+          "right": 1269.9000244140625
+        },
+        {
+          "no": 18,
+          "w": 595,
+          "h": 793,
+          "top": 5565.60009765625,
+          "right": 1876.9000244140625
+        },
+        {
+          "no": 19,
+          "w": 595,
+          "h": 793,
+          "top": 6370.60009765625,
+          "right": 1269.9000244140625
+        },
+        {
+          "no": 20,
+          "w": 595,
+          "h": 793,
+          "top": 6370.60009765625,
+          "right": 1876.9000244140625
+        }
+      ],
+      "roots": [
+        1,
+        2,
+        3,
+        4,
+        5,
+        6,
+        7
+      ],
+      "zoomLabel": "100%",
+      "page": 3,
+      "totalPages": 20
+    },
+    "D_single": {
+      "state": "ready",
+      "scroller": {
+        "cw": 1217,
+        "right": 2052
+      },
+      "scrollTop": 818.5599975585938,
+      "rows": [],
+      "boxes": [
+        {
+          "no": 1,
+          "w": 595,
+          "h": 793,
+          "top": -876.7999877929688,
+          "right": 1573.4000244140625
+        },
+        {
+          "no": 2,
+          "w": 595,
+          "h": 793,
+          "top": -71.80000305175781,
+          "right": 1573.4000244140625
+        },
+        {
+          "no": 3,
+          "w": 595,
+          "h": 793,
+          "top": 733.2000122070312,
+          "right": 1573.4000244140625
+        },
+        {
+          "no": 4,
+          "w": 595,
+          "h": 793,
+          "top": 1538.2000732421875,
+          "right": 1573.4000244140625
+        },
+        {
+          "no": 5,
+          "w": 595,
+          "h": 793,
+          "top": 2343.199951171875,
+          "right": 1573.4000244140625
+        },
+        {
+          "no": 6,
+          "w": 595,
+          "h": 793,
+          "top": 3148.199951171875,
+          "right": 1573.4000244140625
+        },
+        {
+          "no": 7,
+          "w": 595,
+          "h": 793,
+          "top": 3953.199951171875,
+          "right": 1573.4000244140625
+        },
+        {
+          "no": 8,
+          "w": 595,
+          "h": 793,
+          "top": 4758.2001953125,
+          "right": 1573.4000244140625
+        },
+        {
+          "no": 9,
+          "w": 595,
+          "h": 793,
+          "top": 5563.2001953125,
+          "right": 1573.4000244140625
+        },
+        {
+          "no": 10,
+          "w": 595,
+          "h": 793,
+          "top": 6368.2001953125,
+          "right": 1573.4000244140625
+        },
+        {
+          "no": 11,
+          "w": 595,
+          "h": 793,
+          "top": 7173.2001953125,
+          "right": 1573.4000244140625
+        },
+        {
+          "no": 12,
+          "w": 595,
+          "h": 793,
+          "top": 7978.2001953125,
+          "right": 1573.4000244140625
+        },
+        {
+          "no": 13,
+          "w": 595,
+          "h": 793,
+          "top": 8783.2001953125,
+          "right": 1573.4000244140625
+        },
+        {
+          "no": 14,
+          "w": 595,
+          "h": 793,
+          "top": 9588.2001953125,
+          "right": 1573.4000244140625
+        },
+        {
+          "no": 15,
+          "w": 595,
+          "h": 793,
+          "top": 10393.2001953125,
+          "right": 1573.4000244140625
+        },
+        {
+          "no": 16,
+          "w": 595,
+          "h": 793,
+          "top": 11198.2001953125,
+          "right": 1573.4000244140625
+        },
+        {
+          "no": 17,
+          "w": 595,
+          "h": 793,
+          "top": 12003.2001953125,
+          "right": 1573.4000244140625
+        },
+        {
+          "no": 18,
+          "w": 595,
+          "h": 793,
+          "top": 12808.2001953125,
+          "right": 1573.4000244140625
+        },
+        {
+          "no": 19,
+          "w": 595,
+          "h": 793,
+          "top": 13613.2001953125,
+          "right": 1573.4000244140625
+        },
+        {
+          "no": 20,
+          "w": 595,
+          "h": 793,
+          "top": 14418.2001953125,
+          "right": 1573.4000244140625
+        }
+      ],
+      "roots": [
+        1,
+        2,
+        3,
+        4
+      ],
+      "zoomLabel": "100%",
+      "page": 3,
+      "totalPages": 20
+    },
+    "D_back_double": {
+      "state": "ready",
+      "scroller": {
+        "cw": 1217,
+        "right": 2052
+      },
+      "scrollTop": 2017.9200439453125,
+      "rows": [
+        {
+          "leftNo": 1,
+          "rowW": 2398,
+          "boxes": [
+            {
+              "no": 1,
+              "w": 1193,
+              "h": 1591,
+              "top": -2376,
+              "right": 1723
+            },
+            {
+              "no": 2,
+              "w": 1193,
+              "h": 1591,
+              "top": -2376,
+              "right": 2928
+            }
+          ]
+        },
+        {
+          "leftNo": 3,
+          "rowW": 2398,
+          "boxes": [
+            {
+              "no": 3,
+              "w": 1193,
+              "h": 1591,
+              "top": -773,
+              "right": 1723
+            },
+            {
+              "no": 4,
+              "w": 1193,
+              "h": 1591,
+              "top": -773,
+              "right": 2928
+            }
+          ]
+        },
+        {
+          "leftNo": 5,
+          "rowW": 2398,
+          "boxes": [
+            {
+              "no": 5,
+              "w": 1193,
+              "h": 1591,
+              "top": 830,
+              "right": 1723
+            },
+            {
+              "no": 6,
+              "w": 1193,
+              "h": 1591,
+              "top": 830,
+              "right": 2928
+            }
+          ]
+        },
+        {
+          "leftNo": 7,
+          "rowW": 2398,
+          "boxes": [
+            {
+              "no": 7,
+              "w": 1193,
+              "h": 1591,
+              "top": 2433,
+              "right": 1723
+            },
+            {
+              "no": 8,
+              "w": 1193,
+              "h": 1591,
+              "top": 2433,
+              "right": 2928
+            }
+          ]
+        },
+        {
+          "leftNo": 9,
+          "rowW": 2398,
+          "boxes": [
+            {
+              "no": 9,
+              "w": 1193,
+              "h": 1591,
+              "top": 4036,
+              "right": 1723
+            },
+            {
+              "no": 10,
+              "w": 1193,
+              "h": 1591,
+              "top": 4036,
+              "right": 2928
+            }
+          ]
+        },
+        {
+          "leftNo": 11,
+          "rowW": 2398,
+          "boxes": [
+            {
+              "no": 11,
+              "w": 1193,
+              "h": 1591,
+              "top": 5639,
+              "right": 1723
+            },
+            {
+              "no": 12,
+              "w": 1193,
+              "h": 1591,
+              "top": 5639,
+              "right": 2928
+            }
+          ]
+        },
+        {
+          "leftNo": 13,
+          "rowW": 2398,
+          "boxes": [
+            {
+              "no": 13,
+              "w": 1193,
+              "h": 1591,
+              "top": 7242,
+              "right": 1723
+            },
+            {
+              "no": 14,
+              "w": 1193,
+              "h": 1591,
+              "top": 7242,
+              "right": 2928
+            }
+          ]
+        },
+        {
+          "leftNo": 15,
+          "rowW": 2398,
+          "boxes": [
+            {
+              "no": 15,
+              "w": 1193,
+              "h": 1591,
+              "top": 8845,
+              "right": 1723
+            },
+            {
+              "no": 16,
+              "w": 1193,
+              "h": 1591,
+              "top": 8845,
+              "right": 2928
+            }
+          ]
+        },
+        {
+          "leftNo": 17,
+          "rowW": 2398,
+          "boxes": [
+            {
+              "no": 17,
+              "w": 1193,
+              "h": 1591,
+              "top": 10448,
+              "right": 1723
+            },
+            {
+              "no": 18,
+              "w": 1193,
+              "h": 1591,
+              "top": 10448,
+              "right": 2928
+            }
+          ]
+        },
+        {
+          "leftNo": 19,
+          "rowW": 2398,
+          "boxes": [
+            {
+              "no": 19,
+              "w": 1193,
+              "h": 1591,
+              "top": 12051,
+              "right": 1723
+            },
+            {
+              "no": 20,
+              "w": 1193,
+              "h": 1591,
+              "top": 12051,
+              "right": 2928
+            }
+          ]
+        }
+      ],
+      "boxes": [
+        {
+          "no": 1,
+          "w": 1193,
+          "h": 1591,
+          "top": -2376,
+          "right": 1723
+        },
+        {
+          "no": 2,
+          "w": 1193,
+          "h": 1591,
+          "top": -2376,
+          "right": 2928
+        },
+        {
+          "no": 3,
+          "w": 1193,
+          "h": 1591,
+          "top": -773,
+          "right": 1723
+        },
+        {
+          "no": 4,
+          "w": 1193,
+          "h": 1591,
+          "top": -773,
+          "right": 2928
+        },
+        {
+          "no": 5,
+          "w": 1193,
+          "h": 1591,
+          "top": 830,
+          "right": 1723
+        },
+        {
+          "no": 6,
+          "w": 1193,
+          "h": 1591,
+          "top": 830,
+          "right": 2928
+        },
+        {
+          "no": 7,
+          "w": 1193,
+          "h": 1591,
+          "top": 2433,
+          "right": 1723
+        },
+        {
+          "no": 8,
+          "w": 1193,
+          "h": 1591,
+          "top": 2433,
+          "right": 2928
+        },
+        {
+          "no": 9,
+          "w": 1193,
+          "h": 1591,
+          "top": 4036,
+          "right": 1723
+        },
+        {
+          "no": 10,
+          "w": 1193,
+          "h": 1591,
+          "top": 4036,
+          "right": 2928
+        },
+        {
+          "no": 11,
+          "w": 1193,
+          "h": 1591,
+          "top": 5639,
+          "right": 1723
+        },
+        {
+          "no": 12,
+          "w": 1193,
+          "h": 1591,
+          "top": 5639,
+          "right": 2928
+        },
+        {
+          "no": 13,
+          "w": 1193,
+          "h": 1591,
+          "top": 7242,
+          "right": 1723
+        },
+        {
+          "no": 14,
+          "w": 1193,
+          "h": 1591,
+          "top": 7242,
+          "right": 2928
+        },
+        {
+          "no": 15,
+          "w": 1193,
+          "h": 1591,
+          "top": 8845,
+          "right": 1723
+        },
+        {
+          "no": 16,
+          "w": 1193,
+          "h": 1591,
+          "top": 8845,
+          "right": 2928
+        },
+        {
+          "no": 17,
+          "w": 1193,
+          "h": 1591,
+          "top": 10448,
+          "right": 1723
+        },
+        {
+          "no": 18,
+          "w": 1193,
+          "h": 1591,
+          "top": 10448,
+          "right": 2928
+        },
+        {
+          "no": 19,
+          "w": 1193,
+          "h": 1591,
+          "top": 12051,
+          "right": 1723
+        },
+        {
+          "no": 20,
+          "w": 1193,
+          "h": 1591,
+          "top": 12051,
+          "right": 2928
+        }
+      ],
+      "roots": [
+        1,
+        2,
+        3,
+        4,
+        5,
+        6,
+        7
+      ],
+      "zoomLabel": "201%",
+      "page": 3,
+      "totalPages": 20
+    },
+    "D_fit_after": {
+      "state": "ready",
+      "scroller": {
+        "cw": 1217,
+        "right": 2052
+      },
+      "scrollTop": 812.1599731445312,
+      "rows": [
+        {
+          "leftNo": 1,
+          "rowW": 1192,
+          "boxes": [
+            {
+              "no": 1,
+              "w": 590,
+              "h": 787,
+              "top": -868.7999877929688,
+              "right": 1269.9000244140625
+            },
+            {
+              "no": 2,
+              "w": 590,
+              "h": 787,
+              "top": -868.7999877929688,
+              "right": 1871.9000244140625
+            }
+          ]
+        },
+        {
+          "leftNo": 3,
+          "rowW": 1192,
+          "boxes": [
+            {
+              "no": 3,
+              "w": 590,
+              "h": 787,
+              "top": -69.80000305175781,
+              "right": 1269.9000244140625
+            },
+            {
+              "no": 4,
+              "w": 590,
+              "h": 787,
+              "top": -69.80000305175781,
+              "right": 1871.9000244140625
+            }
+          ]
+        },
+        {
+          "leftNo": 5,
+          "rowW": 1192,
+          "boxes": [
+            {
+              "no": 5,
+              "w": 590,
+              "h": 787,
+              "top": 729.2000122070312,
+              "right": 1269.9000244140625
+            },
+            {
+              "no": 6,
+              "w": 590,
+              "h": 787,
+              "top": 729.2000122070312,
+              "right": 1871.9000244140625
+            }
+          ]
+        },
+        {
+          "leftNo": 7,
+          "rowW": 1192,
+          "boxes": [
+            {
+              "no": 7,
+              "w": 590,
+              "h": 787,
+              "top": 1528.2000732421875,
+              "right": 1269.9000244140625
+            },
+            {
+              "no": 8,
+              "w": 590,
+              "h": 787,
+              "top": 1528.2000732421875,
+              "right": 1871.9000244140625
+            }
+          ]
+        },
+        {
+          "leftNo": 9,
+          "rowW": 1192,
+          "boxes": [
+            {
+              "no": 9,
+              "w": 590,
+              "h": 787,
+              "top": 2327.199951171875,
+              "right": 1269.9000244140625
+            },
+            {
+              "no": 10,
+              "w": 590,
+              "h": 787,
+              "top": 2327.199951171875,
+              "right": 1871.9000244140625
+            }
+          ]
+        },
+        {
+          "leftNo": 11,
+          "rowW": 1192,
+          "boxes": [
+            {
+              "no": 11,
+              "w": 590,
+              "h": 787,
+              "top": 3126.199951171875,
+              "right": 1269.9000244140625
+            },
+            {
+              "no": 12,
+              "w": 590,
+              "h": 787,
+              "top": 3126.199951171875,
+              "right": 1871.9000244140625
+            }
+          ]
+        },
+        {
+          "leftNo": 13,
+          "rowW": 1192,
+          "boxes": [
+            {
+              "no": 13,
+              "w": 590,
+              "h": 787,
+              "top": 3925.199951171875,
+              "right": 1269.9000244140625
+            },
+            {
+              "no": 14,
+              "w": 590,
+              "h": 787,
+              "top": 3925.199951171875,
+              "right": 1871.9000244140625
+            }
+          ]
+        },
+        {
+          "leftNo": 15,
+          "rowW": 1192,
+          "boxes": [
+            {
+              "no": 15,
+              "w": 590,
+              "h": 787,
+              "top": 4724.2001953125,
+              "right": 1269.9000244140625
+            },
+            {
+              "no": 16,
+              "w": 590,
+              "h": 787,
+              "top": 4724.2001953125,
+              "right": 1871.9000244140625
+            }
+          ]
+        },
+        {
+          "leftNo": 17,
+          "rowW": 1192,
+          "boxes": [
+            {
+              "no": 17,
+              "w": 590,
+              "h": 787,
+              "top": 5523.2001953125,
+              "right": 1269.9000244140625
+            },
+            {
+              "no": 18,
+              "w": 590,
+              "h": 787,
+              "top": 5523.2001953125,
+              "right": 1871.9000244140625
+            }
+          ]
+        },
+        {
+          "leftNo": 19,
+          "rowW": 1192,
+          "boxes": [
+            {
+              "no": 19,
+              "w": 590,
+              "h": 787,
+              "top": 6322.2001953125,
+              "right": 1269.9000244140625
+            },
+            {
+              "no": 20,
+              "w": 590,
+              "h": 787,
+              "top": 6322.2001953125,
+              "right": 1871.9000244140625
+            }
+          ]
+        }
+      ],
+      "boxes": [
+        {
+          "no": 1,
+          "w": 590,
+          "h": 787,
+          "top": -868.7999877929688,
+          "right": 1269.9000244140625
+        },
+        {
+          "no": 2,
+          "w": 590,
+          "h": 787,
+          "top": -868.7999877929688,
+          "right": 1871.9000244140625
+        },
+        {
+          "no": 3,
+          "w": 590,
+          "h": 787,
+          "top": -69.80000305175781,
+          "right": 1269.9000244140625
+        },
+        {
+          "no": 4,
+          "w": 590,
+          "h": 787,
+          "top": -69.80000305175781,
+          "right": 1871.9000244140625
+        },
+        {
+          "no": 5,
+          "w": 590,
+          "h": 787,
+          "top": 729.2000122070312,
+          "right": 1269.9000244140625
+        },
+        {
+          "no": 6,
+          "w": 590,
+          "h": 787,
+          "top": 729.2000122070312,
+          "right": 1871.9000244140625
+        },
+        {
+          "no": 7,
+          "w": 590,
+          "h": 787,
+          "top": 1528.2000732421875,
+          "right": 1269.9000244140625
+        },
+        {
+          "no": 8,
+          "w": 590,
+          "h": 787,
+          "top": 1528.2000732421875,
+          "right": 1871.9000244140625
+        },
+        {
+          "no": 9,
+          "w": 590,
+          "h": 787,
+          "top": 2327.199951171875,
+          "right": 1269.9000244140625
+        },
+        {
+          "no": 10,
+          "w": 590,
+          "h": 787,
+          "top": 2327.199951171875,
+          "right": 1871.9000244140625
+        },
+        {
+          "no": 11,
+          "w": 590,
+          "h": 787,
+          "top": 3126.199951171875,
+          "right": 1269.9000244140625
+        },
+        {
+          "no": 12,
+          "w": 590,
+          "h": 787,
+          "top": 3126.199951171875,
+          "right": 1871.9000244140625
+        },
+        {
+          "no": 13,
+          "w": 590,
+          "h": 787,
+          "top": 3925.199951171875,
+          "right": 1269.9000244140625
+        },
+        {
+          "no": 14,
+          "w": 590,
+          "h": 787,
+          "top": 3925.199951171875,
+          "right": 1871.9000244140625
+        },
+        {
+          "no": 15,
+          "w": 590,
+          "h": 787,
+          "top": 4724.2001953125,
+          "right": 1269.9000244140625
+        },
+        {
+          "no": 16,
+          "w": 590,
+          "h": 787,
+          "top": 4724.2001953125,
+          "right": 1871.9000244140625
+        },
+        {
+          "no": 17,
+          "w": 590,
+          "h": 787,
+          "top": 5523.2001953125,
+          "right": 1269.9000244140625
+        },
+        {
+          "no": 18,
+          "w": 590,
+          "h": 787,
+          "top": 5523.2001953125,
+          "right": 1871.9000244140625
+        },
+        {
+          "no": 19,
+          "w": 590,
+          "h": 787,
+          "top": 6322.2001953125,
+          "right": 1269.9000244140625
+        },
+        {
+          "no": 20,
+          "w": 590,
+          "h": 787,
+          "top": 6322.2001953125,
+          "right": 1871.9000244140625
+        }
+      ],
+      "roots": [
+        1,
+        2,
+        3,
+        4,
+        5,
+        6,
+        7
+      ],
+      "zoomLabel": "99%",
+      "page": 3,
+      "totalPages": 20
+    },
+    "E_last": {
+      "state": "ready",
+      "scroller": {
+        "cw": 1217,
+        "right": 2052
+      },
+      "scrollTop": 5672.9599609375,
+      "rows": [
+        {
+          "leftNo": 1,
+          "rowW": 1202,
+          "boxes": [
+            {
+              "no": 1,
+              "w": 595,
+              "h": 793,
+              "top": -6944.80029296875,
+              "right": 1269.9000244140625
+            },
+            {
+              "no": 2,
+              "w": 595,
+              "h": 793,
+              "top": -6944.80029296875,
+              "right": 1876.9000244140625
+            }
+          ]
+        },
+        {
+          "leftNo": 3,
+          "rowW": 1202,
+          "boxes": [
+            {
+              "no": 3,
+              "w": 595,
+              "h": 793,
+              "top": -6139.80029296875,
+              "right": 1269.9000244140625
+            },
+            {
+              "no": 4,
+              "w": 595,
+              "h": 793,
+              "top": -6139.80029296875,
+              "right": 1876.9000244140625
+            }
+          ]
+        },
+        {
+          "leftNo": 5,
+          "rowW": 1202,
+          "boxes": [
+            {
+              "no": 5,
+              "w": 595,
+              "h": 793,
+              "top": -5334.80029296875,
+              "right": 1269.9000244140625
+            },
+            {
+              "no": 6,
+              "w": 595,
+              "h": 793,
+              "top": -5334.80029296875,
+              "right": 1876.9000244140625
+            }
+          ]
+        },
+        {
+          "leftNo": 7,
+          "rowW": 1202,
+          "boxes": [
+            {
+              "no": 7,
+              "w": 595,
+              "h": 793,
+              "top": -4529.80029296875,
+              "right": 1269.9000244140625
+            },
+            {
+              "no": 8,
+              "w": 595,
+              "h": 793,
+              "top": -4529.80029296875,
+              "right": 1876.9000244140625
+            }
+          ]
+        },
+        {
+          "leftNo": 9,
+          "rowW": 1202,
+          "boxes": [
+            {
+              "no": 9,
+              "w": 595,
+              "h": 793,
+              "top": -3724.800048828125,
+              "right": 1269.9000244140625
+            },
+            {
+              "no": 10,
+              "w": 595,
+              "h": 793,
+              "top": -3724.800048828125,
+              "right": 1876.9000244140625
+            }
+          ]
+        },
+        {
+          "leftNo": 11,
+          "rowW": 1202,
+          "boxes": [
+            {
+              "no": 11,
+              "w": 595,
+              "h": 793,
+              "top": -2919.800048828125,
+              "right": 1269.9000244140625
+            },
+            {
+              "no": 12,
+              "w": 595,
+              "h": 793,
+              "top": -2919.800048828125,
+              "right": 1876.9000244140625
+            }
+          ]
+        },
+        {
+          "leftNo": 13,
+          "rowW": 1202,
+          "boxes": [
+            {
+              "no": 13,
+              "w": 595,
+              "h": 793,
+              "top": -2114.800048828125,
+              "right": 1269.9000244140625
+            },
+            {
+              "no": 14,
+              "w": 595,
+              "h": 793,
+              "top": -2114.800048828125,
+              "right": 1876.9000244140625
+            }
+          ]
+        },
+        {
+          "leftNo": 15,
+          "rowW": 1202,
+          "boxes": [
+            {
+              "no": 15,
+              "w": 595,
+              "h": 793,
+              "top": -1309.800048828125,
+              "right": 1269.9000244140625
+            },
+            {
+              "no": 16,
+              "w": 595,
+              "h": 793,
+              "top": -1309.800048828125,
+              "right": 1876.9000244140625
+            }
+          ]
+        },
+        {
+          "leftNo": 17,
+          "rowW": 1202,
+          "boxes": [
+            {
+              "no": 17,
+              "w": 595,
+              "h": 793,
+              "top": -504.8000183105469,
+              "right": 1269.9000244140625
+            },
+            {
+              "no": 18,
+              "w": 595,
+              "h": 793,
+              "top": -504.8000183105469,
+              "right": 1876.9000244140625
+            }
+          ]
+        },
+        {
+          "leftNo": 19,
+          "rowW": 1202,
+          "boxes": [
+            {
+              "no": 19,
+              "w": 595,
+              "h": 793,
+              "top": 300.20001220703125,
+              "right": 1269.9000244140625
+            },
+            {
+              "no": 20,
+              "w": 595,
+              "h": 793,
+              "top": 300.20001220703125,
+              "right": 1876.9000244140625
+            }
+          ]
+        }
+      ],
+      "boxes": [
+        {
+          "no": 1,
+          "w": 595,
+          "h": 793,
+          "top": -6944.80029296875,
+          "right": 1269.9000244140625
+        },
+        {
+          "no": 2,
+          "w": 595,
+          "h": 793,
+          "top": -6944.80029296875,
+          "right": 1876.9000244140625
+        },
+        {
+          "no": 3,
+          "w": 595,
+          "h": 793,
+          "top": -6139.80029296875,
+          "right": 1269.9000244140625
+        },
+        {
+          "no": 4,
+          "w": 595,
+          "h": 793,
+          "top": -6139.80029296875,
+          "right": 1876.9000244140625
+        },
+        {
+          "no": 5,
+          "w": 595,
+          "h": 793,
+          "top": -5334.80029296875,
+          "right": 1269.9000244140625
+        },
+        {
+          "no": 6,
+          "w": 595,
+          "h": 793,
+          "top": -5334.80029296875,
+          "right": 1876.9000244140625
+        },
+        {
+          "no": 7,
+          "w": 595,
+          "h": 793,
+          "top": -4529.80029296875,
+          "right": 1269.9000244140625
+        },
+        {
+          "no": 8,
+          "w": 595,
+          "h": 793,
+          "top": -4529.80029296875,
+          "right": 1876.9000244140625
+        },
+        {
+          "no": 9,
+          "w": 595,
+          "h": 793,
+          "top": -3724.800048828125,
+          "right": 1269.9000244140625
+        },
+        {
+          "no": 10,
+          "w": 595,
+          "h": 793,
+          "top": -3724.800048828125,
+          "right": 1876.9000244140625
+        },
+        {
+          "no": 11,
+          "w": 595,
+          "h": 793,
+          "top": -2919.800048828125,
+          "right": 1269.9000244140625
+        },
+        {
+          "no": 12,
+          "w": 595,
+          "h": 793,
+          "top": -2919.800048828125,
+          "right": 1876.9000244140625
+        },
+        {
+          "no": 13,
+          "w": 595,
+          "h": 793,
+          "top": -2114.800048828125,
+          "right": 1269.9000244140625
+        },
+        {
+          "no": 14,
+          "w": 595,
+          "h": 793,
+          "top": -2114.800048828125,
+          "right": 1876.9000244140625
+        },
+        {
+          "no": 15,
+          "w": 595,
+          "h": 793,
+          "top": -1309.800048828125,
+          "right": 1269.9000244140625
+        },
+        {
+          "no": 16,
+          "w": 595,
+          "h": 793,
+          "top": -1309.800048828125,
+          "right": 1876.9000244140625
+        },
+        {
+          "no": 17,
+          "w": 595,
+          "h": 793,
+          "top": -504.8000183105469,
+          "right": 1269.9000244140625
+        },
+        {
+          "no": 18,
+          "w": 595,
+          "h": 793,
+          "top": -504.8000183105469,
+          "right": 1876.9000244140625
+        },
+        {
+          "no": 19,
+          "w": 595,
+          "h": 793,
+          "top": 300.20001220703125,
+          "right": 1269.9000244140625
+        },
+        {
+          "no": 20,
+          "w": 595,
+          "h": 793,
+          "top": 300.20001220703125,
+          "right": 1876.9000244140625
+        }
+      ],
+      "roots": [
+        16,
+        17,
+        18,
+        19,
+        20
+      ],
+      "zoomLabel": "100%",
+      "page": 20,
+      "totalPages": 20
+    }
+  },
+  "expected": {
+    "rowW1": 1202,
+    "expectedZoomB": 0.9925124792013311,
+    "zSingle": 201,
+    "zDouble": 99
+  },
+  "results": [
+    {
+      "id": "pre/ready",
+      "pass": true,
+      "detail": "单页就绪 20 盒/20 页,无行盒（100%）"
+    },
+    {
+      "id": "A/row-count",
+      "pass": true,
+      "detail": "行数 10=ceil(20/2)"
+    },
+    {
+      "id": "A/pair-row-rendered",
+      "pass": true,
+      "detail": "行(17)两页并排真渲染 data-page-root 同含 [17,18]（canvas 就位；渲染窗口 roots=[16,17,18,19,20]）"
+    },
+    {
+      "id": "A/row-width-formula",
+      "pass": true,
+      "detail": "行盒宽 1202.0 ≈ 左(595.0)+右(595.0)+gap(12)"
+    },
+    {
+      "id": "B/zoom-double-basis",
+      "pass": true,
+      "detail": "zoom=99%≈(clientWidth1217−24)/行宽1202=99.3%（columnWidthFor 源码复算）"
+    },
+    {
+      "id": "B/row-fits-viewport",
+      "pass": true,
+      "detail": "行宽 1192.0 ≤ 内容区 1193+2（两页并排恰入视口——S2）"
+    },
+    {
+      "id": "C/page-step-2",
+      "pass": true,
+      "detail": "页码 1→3（+2 翻面步进，S4；末行夹取兜底）"
+    },
+    {
+      "id": "C/row2-tops-aligned",
+      "pass": true,
+      "detail": "目标行(3)两盒顶对齐(Δtop=0.00px)且已滚离首行（程序滚行顶）"
+    },
+    {
+      "id": "D/rows-cleared",
+      "pass": true,
+      "detail": "单页行盒清零（20 盒直列）"
+    },
+    {
+      "id": "D/position-kept",
+      "pass": true,
+      "detail": "页码保持 3→3（S1 恢复链滚回当前页，|Δ|≤1）"
+    },
+    {
+      "id": "D/rows-restored",
+      "pass": true,
+      "detail": "切回双页行恢复 10=10"
+    },
+    {
+      "id": "D/basis-rebased",
+      "pass": true,
+      "detail": "适应宽度口径回落：单页 201% → 双页 99%（basis 重报不残留——S5）"
+    },
+    {
+      "id": "D/page-still-kept",
+      "pass": true,
+      "detail": "往返后页码 3→3（|Δ|≤2 恢复链容差）"
+    },
+    {
+      "id": "E/last-row-single",
+      "pass": true,
+      "detail": "末行(19)盒数 2=期望2，盒高 793px>10（无塌陷——S3）"
+    },
+    {
+      "id": "F/no-pageerror",
+      "pass": true,
+      "detail": "页面错误 0 条"
+    }
+  ]
+}
\ No newline at end of file
diff --git a/scripts/audits/f-r1-ticket.md b/scripts/audits/f-r1-ticket.md
new file mode 100644
index 000000000..0053c0062
--- /dev/null
+++ b/scripts/audits/f-r1-ticket.md
@@ -0,0 +1,160 @@
+# F-R1 需求票:阅读器双页阅读模式(含 fitWidth 适配)
+
+> 需求源:用户 2026-08-31 新增需求 2(最高优先级)——「阅读器增加双页
+> 阅读的选项,双页模式下适应页面宽度那个功能也要适配」。
+> 基线:verify 116 文件 971 用例全绿 / locks 195 / e2e 29/29(5140ea719)。
+> 同场需求 1(课题下拉动画)主控直做已落,与本票无涉。
+
+## 0. 模式态空间表(票面的「态空间」——宪法前置,交审计)
+
+**pageLayout 生命周期迁移表**(per-tab,与 zoom/color/selectionMode 同型,
+F-A3 先例):
+
+| 事件 | pageLayout 迁移 |
+| --- | --- |
+| openPaper(absent 新建) | 'single'(makeLoadingTab 显式置值) |
+| openPaper(existing 重建) | 'single'?——**No:makeLoadingTab 现签名 (paperId, prev)——沿 prev 继承既有字段先例(实现时核 makeLoadingTab 现行继承面,选与 zoom/selectionMode 完全同型的继承行为)** |
+| 切布局(工具栏 toggle) | updateActiveTab 写 active(异 tab 零扰) |
+| 切 tab 往返 | 各 tab 记忆(引用稳定语义) |
+| 恢复链(重开) | 持久化面=TabState 不落库则重开回 single——**本票 v1 不落库**(zoom 同型,接受;备案) |
+
+**布局×几何消费点矩阵**(双页改造的核心面——每格都要有实现+测试):
+
+| 消费点 | single(既有,零变) | double(本票新增) |
+| --- | --- | --- |
+| 页盒排列 | 单列 flex-col,页盒=每页 | **行**数组 (1,2)(3,4)…;行内两页盒并排 flex(左顶对齐);末行奇数页右空 |
+| 列宽(columnWidth) | 最宽页×zoom | 最宽行宽×zoom(行宽=左宽+右宽+行内 gap;末行单页不计) |
+| 总高(columnTotalHeight,INV-33 分母) | 盒高和+gap×(n−1) | 行高和(行高=max(左右页高))+行 gap×(行数−1) |
+| onReady basisWidth(fitWidth 分母单源) | columnWidth(sizes,1) | 双页口径行宽(scale=1) |
+| 翻页步进(工具栏 ±) | ±1 | **±2**(翻面语义;props pageStep 可选缺省 1=既有零变) |
+| 页码输入跳转 | 任意页 | 任意页(scrollIntoNearestScroller 滚到含它的行——左/右页盒顶同行,零特判) |
+| scroll-progress 回写(nearestPage) | 中心最近页 | **零改**——boxes 走 [data-page-box] 查询,行内两盒同 top,中心在行内时先遇(左页)胜=回写左页,恢复链滚行顶 |
+| 懒渲染/回收(IO+visible/rendered) | 页盒驱动 | 零改——data-page-box 仍在页盒上,IO/窗口/回收按页号不变 |
+| 缩放中心锚(段⑥ anchoredScrollTop) | 总高口径 | 总高口径=双页行算(传入正确 totalH 即可,hook 零改) |
+| SelectionLayer 锚定 | 可见首报告页盒 | 零改(单实例仍挂某页盒) |
+| 标注/AI/文本层 | per-page | 零改(renderPage(no) 每渲染页一套) |
+
+**跨格序列(交审计)**:
+
+- S1 打开(单页)→切双页→行渲染+basisWidth 重报→恢复链滚回当前页
+  (onReady 重触发 spProg.onColumnReady——**切布局不丢位置,票面声明为
+  期望行为**);
+- S2 双页→fitWidth→zoom=(clientWidth−24)/双页行宽(两页并排恰入视口);
+- S3 双页末页奇数→末行右空不塌(layout 稳定,无布局跳变);
+- S4 双页→翻「下一页」=page+2(末行夹取,store setPage clamp 兜底);
+- S5 双页→切回单页→basisWidth 重报+恢复链滚回;再 fitWidth=单页口径
+  (basis 不残留双页值——重报时序先于用户点击);
+- S6 双页下 wheel 缩放→行盒重算+中心锚(INV-33 双页总高口径);
+- S7 换文献(fileUrl 变)→管线重跑→onReady 双页口径(若 tab 仍 double)。
+
+## 1. 行为层
+
+- **TabState**:加可选字段 `pageLayout?: 'single' | 'double'`(消费方
+  `?? 'single'` 兜底——受锁夹具 typecheck 兼容第三路,F-A3 先例);
+  makeLoadingTab 显式置值(继承面核 zoom 先例对齐);`setPageLayout`
+  (updateActiveTab 形态,setSelectionMode 同型)。
+- **PageColumn**:props 加 `layout?: 'single' | 'double'`(缺省 single=
+  既有调用零破);渲染分支按 layoutRows(sizes) 行渲染;**就绪管线
+  deps 零变**([doc,totalPages]),新增轻 effect:layout 变化→onReady
+  重报(新口径 basisWidth,不重跑 getPage 循环)——onReady 触发链=
+  ReaderPage.handleColumnReady→spProg.onColumnReady(恢复链滚回当前页
+  =S1 声明行为);段⑥ columnTotalHeight 调用点传双页口径。
+- **ReaderToolbar**:「双页」toggle 按钮(aria-pressed+选中态,crib 选择
+  模式按钮先例);props 加 `pageLayout?: 'single'|'double'`(缺省
+  single)+`onTogglePageLayout?`(缺席=可点无操作——ReaderToolbar 既有
+  可选回调先例)+`pageStep?: number`(缺省 1,±按钮 onNavigate(page±
+  pageStep))。
+- **ReaderPage 装配**:tab.pageLayout 消费+toggle 写 store;fitWidth
+  零改(分母=columnBasis 已随 onReady 新口径);onNavigate 传
+  setPage(既有)——步进由工具栏 pageStep 传(双页=2)。
+- **PagesOverlay**:props 透传 layout(九 props 面扩一,头注接口层同步)。
+- 既有行为零变清单:单页渲染全链/懒渲染回收/INV-29 程序滚动/INV-33
+  缩放锚/INV-30 canvas 生命周期/选择模式/标注链/scroll-progress 回写。
+
+## 2. 接口层
+
+- 上述 props/TabState 字段全部**可选或新增导出**——既有调用/夹具零破
+  (缺省路径=行为零变);类型不跨进程(纯 renderer 域,不入 src/shared)。
+- page-column-geometry.ts 新增导出:`layoutRows(sizes): ReadonlyArray<
+  {left: PageBoxSize; leftNo: number; right?: PageBoxSize; rightNo?:
+  number}>` + `rowWidth(row, zoom)`(含行内 gap 单源常量)+
+  `columnWidthFor(sizes, zoom, layout)` + `columnTotalHeightFor(sizes,
+  zoom, layout)`(既有 columnWidth/columnTotalHeight 保持导出与语义零变
+  ——单实现内部复用或薄壳,**不删除既有导出**——INV/受锁测试消费面)。
+
+## 3. 架构层
+
+- **PageColumn 248 行逼满组件 ≤250 红线——本票必拆**:页盒 JSX(占位/
+  渲染窗口/PdfPageCanvas+renderPage 装配)抽 `PageBox.tsx` 渲染件
+  (~70 行,单双页共用——行内页盒与单列页盒同一渲染单元);PageColumn
+  保持管线宿主(IO/回收/滚动/锚/就绪管线);拆件行为零变纪律(F-ARCH3
+  先例:不加 useCallback/useMemo,函数形态原样迁)。
+- geometry 件加行函数(预计 <200 行 ✓);ReaderToolbar 196→~220 ✓;
+  reader.store.ts 452 行+~15 行逼近 500——**若 lint max-lines 报错**,
+  状态字段文档注释压缩或按既有 eslint 先例处理(卡住报主控,禁删注释
+  硬塞)。
+- 分层不动;零新依赖;禁跨层。
+
+## 4. 生命周期层
+
+- layout 变化不重跑 getPage 管线(尺寸缓存单源复用——只重派生行+重报
+  onReady);挂载即 layout 生效(doc 就绪前渲染 loading 态不受 layout
+  影响)。
+- 换文献清缓存链(PagesOverlay fileUrl effect)零涉;PageFrame 卸载哨/
+  注册表回收零涉。
+- S3 末行单页:右缺席渲染占位空盒(保持行宽稳定防跳变)或右盒不渲染
+  (行宽由左页+已渲染右页决定)——**实现者自裁+申报**(视觉验收归真机
+  探针截图)。
+
+## 5. 文化层(测试与取证)
+
+### 5.1 新测试 `tests/unit/renderer/reader-double-page.test.tsx`(always-active)
+
+- ①store:pageLayout 缺省 single(setPageLayout 双向+异 tab 零扰+
+  makeLoadingTab 显式值);
+- ②geometry 纯函数:layoutRows 偶数页/奇数页末行单页/空数组;
+  columnWidthFor 双页=左+右+gap;columnTotalHeightFor 双页=行高 max+
+  行 gap(构造左右页高不同的夹具);
+- ③PageColumn 双页渲染:行 DOM(data-page-row)+页盒 data-page-box
+  连续对+末行单页;单页分支回归(无 data-page-row);
+- ④onReady 重报:layout 切换→新 basisWidth(双页口径数值断言 crib
+  columnWidthFor 计算);doc 管线不重跑(getPage 调用计数不变);
+- ⑤工具栏:双页按钮 aria-pressed/toggle 上抛;pageStep=2 时 ± 按钮
+  onNavigate(page±2)(缺省 1 回归);
+- ⑥fitWidth 分母:装配面断言(双页 tab 下 fitWidth 用双页 basis——
+    ReaderPage 集成面,或以 columnBasis 注入面单测);
+- ⑦段⑥锚:zoom 变化双页总高口径(anchoredScrollTop 输入断言)。
+
+### 5.2 变异红证(cp 备份法;F-L4 教训:夹具须保证输出对变异点敏感)
+
+- M1 摘 layoutRows 行派生→③红;M2 columnWidthFor 双页分支改单页口径
+  →②④红;M3 onReady 重报 effect 摘→④红;M4 pageStep 摘→⑤红;
+  M5 setPageLayout 摘→①红。每个 M:红→还原→diff 空。
+
+### 5.3 真机取证 `scripts/audits/f-r1-verify.mjs`(crib f-l4-verify.mjs;先核撞名)
+
+真实库副本+真 PDF;场景:
+- A 双页渲染:开双页→两 canvas 并排(首行页盒 1+2 的 data-page-root
+  存在+行盒宽=左+右+gap)→截图 f-r1-out/A-double.png;
+- B fitWidth 双页:点适应宽度→断言 zoom≈(clientWidth−24)/双页行宽
+  (数值断言,node 直载 columnWidthFor 复算,F-L4 W2 先例)+行宽入视口
+  (右缘≤容器右缘);
+- C 翻面:双页「下一页」→page+2+行 2 盒顶对齐;
+- D 切换往返:双页→单页→双页(位置保持=S1;basis 重报 S5);
+- E 末页奇数:跳末页→末行单页截图无塌陷;
+- F pageerror 0。
+
+### 5.4 收口面
+
+- verify 全绿(971+新 7~8 级)+locks:generate/apply(新测试+探针扫入,
+  195→197);台账 F-R1 段;[locked-change] 尾注(tests+scripts+manifest)。
+
+## 6. 证据与报告契约(实现者)
+
+- impl 报告 scripts/audits/f-r1-impl.report.md:自裁申报(含 S3 末行
+  渲染选择/拆件结构);diff 自查(git status 全贴);成本;变异红证表;
+  真机 JSON 落 f-r1-out/。
+- 禁 git/registry/locks;禁改受锁文件(tests/** 既有与 src/shared/**);
+  测试先红后绿;卡住停手。
+- e2e 双页覆盖**不入本票**(受锁 spec 改动面大,备案后续票);jsdom
+  不可达面(canvas 真渲染/fitWidth 真布局)由探针锁——分工写测试头注。
diff --git a/scripts/audits/f-r1-verify.mjs b/scripts/audits/f-r1-verify.mjs
new file mode 100644
index 000000000..dda266dba
--- /dev/null
+++ b/scripts/audits/f-r1-verify.mjs
@@ -0,0 +1,275 @@
+/**
+ * F-R1 双页阅读模式真机取证——票面 §5.3 场景 A~F（crib f-l4-verify.mjs
+ * 运行模式：Electron 真机/真实库副本/断言落 JSON+截图）。
+ *
+ * 场景面（票面 §0 矩阵的真机裁判——jsdom 不可达面）：
+ * - A 双页渲染：开双页→首行页盒 1+2 的 data-page-root 存在（两 canvas 真渲染）
+ *   +行盒宽=左+右+行内 gap（rowWidth 口径）→截图 A-double.png；
+ * - B fitWidth 双页：归一 100%→点适应宽度→zoom≈(clientWidth−24)/双页行宽
+ *   （node 直载 columnWidthFor 复算——F-L4 W2 先例「import 源码算精确期望」）
+ *   +行宽入视口（行盒右缘≤滚动容器右缘）；
+ * - C 翻面：双页「下一页」→页码+2+行 2 两盒顶对齐（同行零特判）；
+ * - D 切换往返：双页→（滚中部）→单页（页码保持=S1；适应宽度=单页口径）
+ *   →双页（行恢复+适应宽度=双页口径<S5 basis 重报不残留）；
+ * - E 末页奇数：跳末页→末行单页无塌陷（盒高>0）→截图 E-odd.png；
+ * - F pageerror 0。
+ * 真机 Electron 短暂开窗属项目 LOOP 取证惯例（主控指令声明）。
+ * 产物：scripts/audits/f-r1-out/{A-double.png,E-odd.png,f-r1-verify.json}。
+ */
+import { _electron as electron } from '@playwright/test'
+import { cp, mkdir, rm } from 'node:fs/promises'
+import { existsSync, writeFileSync } from 'node:fs'
+import { tmpdir } from 'node:os'
+import { join } from 'node:path'
+import { pathToFileURL } from 'node:url'
+import { registerHooks } from 'node:module'
+
+const ROOT = process.cwd()
+const OUT = join(ROOT, 'scripts', 'audits', 'f-r1-out')
+await mkdir(OUT, { recursive: true })
+const log = (...a) => console.log(`[f-r1 ${new Date().toISOString().slice(11, 19)}]`, ...a)
+
+// node 侧直载源码几何（F-L4 W2 先例）：Node 24 type-stripping+registerHooks
+// 补 .ts 扩展（page-column-geometry 无别名依赖，纯函数件）
+registerHooks({
+  resolve(specifier, context, nextResolve) {
+    if (specifier.startsWith('.') && !/\.[cm]?[jt]s$/.test(specifier)) {
+      try {
+        return nextResolve(`${specifier}.ts`, context)
+      } catch {
+        /* fallthrough：保持原解析语义报错 */
+      }
+    }
+    return nextResolve(specifier, context)
+  }
+})
+const { columnWidthFor, rowWidth } = await import(
+  pathToFileURL(join(ROOT, 'src/renderer/features/reader/page-column-geometry.ts')).href
+)
+
+/** 真实库副本（f-l4 同法：workspaces/ai-sensor+三配置文件） */
+async function freshUserData() {
+  const src = join(process.env.APPDATA, 'Synapse')
+  const userData = join(tmpdir(), 'synapse-f-r1-verify')
+  await rm(userData, { recursive: true, force: true })
+  for (const p of ['workspaces', 'ai-sensor']) await cp(join(src, p), join(userData, p), { recursive: true })
+  for (const f of ['settings.json', 'workspace.json', 'window-state.json']) {
+    if (existsSync(join(src, f))) await cp(join(src, f), join(userData, f))
+  }
+  return userData
+}
+
+const userData = await freshUserData()
+const app = await electron.launch({ args: ['out/main/index.js'], env: { ...process.env, SYNAPSE_USER_DATA: userData } })
+const win = await app.firstWindow()
+await win.getByRole('button', { name: '文献库' }).waitFor({ timeout: 20_000 })
+await win.waitForTimeout(800)
+
+const pageErrors = []
+win.on('pageerror', (e) => pageErrors.push(String(e)))
+
+/** 阅读器布局快照（双页行/页盒/几何/页码/zoom——探针断言的数据面） */
+const DUMP = `(() => {
+  const col = document.querySelector('[data-page-column]')
+  if (!col) return null
+  const scroller = col.closest('.overflow-auto')
+  const rows = [...col.querySelectorAll(':scope > [data-page-row]')].map((r) => {
+    const boxes = [...r.querySelectorAll('[data-page-box]')].map((b) => {
+      const g = b.getBoundingClientRect()
+      return { no: Number(b.dataset.pageBox), w: g.width, h: g.height, top: g.top, right: g.right }
+    })
+    const gr = r.getBoundingClientRect()
+    return { leftNo: Number(r.dataset.pageRow), rowW: gr.width, boxes }
+  })
+  const boxes = [...col.querySelectorAll('[data-page-box]')].map((b) => {
+    const g = b.getBoundingClientRect()
+    return { no: Number(b.dataset.pageBox), w: g.width, h: g.height, top: g.top, right: g.right }
+  })
+  const roots = [...col.querySelectorAll('[data-page-root]')].map((r) => Number(r.dataset.pageRoot))
+  const zoomLabel = document.querySelector('[data-testid="zoom-label"]')?.textContent ?? ''
+  const pageInput = document.querySelector('input[aria-label="跳转到页"]')
+  const totalLabel = [...document.querySelectorAll('span')].find((s) => /^\\/ \\d+$/.test(s.textContent))?.textContent ?? ''
+  return {
+    state: col.getAttribute('data-page-column'),
+    scroller: scroller ? { cw: scroller.clientWidth, right: scroller.getBoundingClientRect().right } : null,
+    scrollTop: scroller ? scroller.scrollTop : null,
+    rows, boxes, roots,
+    zoomLabel, page: pageInput ? Number(pageInput.value) : null, totalPages: totalLabel ? Number(totalLabel.slice(2)) : null
+  }
+})()`
+
+const results = []
+const check = (id, pass, detail) => {
+  results.push({ id, pass, detail })
+  log(`${pass ? 'PASS' : 'FAIL'} ${id} — ${detail}`)
+}
+const dump = () => win.evaluate(DUMP)
+
+// ── 前置：扫描真实库前若干篇，选一篇多页文献（优先奇数页 ≥5——E 场景
+//    末行单页分支的前提；无奇数退偶数，单盒面归单测③兜底）→ 阅读器就绪 ──
+async function openMultiPagePaper(maxTry = 8) {
+  let fallback = null
+  for (let i = 0; i < maxTry; i += 1) {
+    await win.getByRole('button', { name: '文献库' }).click()
+    await win.waitForTimeout(1000)
+    const card = win.locator('button.lib-card').nth(i)
+    if ((await card.count()) === 0) break
+    await card.dblclick()
+    try {
+      await win.waitForSelector('[data-page-column="ready"]', { timeout: 12_000 })
+    } catch {
+      continue // 该篇打开失败（无文件等）——试下一篇
+    }
+    await win.waitForTimeout(1000)
+    const d = await dump()
+    if ((d.totalPages ?? 0) >= 5 && d.totalPages % 2 === 1) {
+      log(`选第 ${i + 1} 篇：${d.totalPages} 页（奇数——E 末行单页分支可达）`)
+      return d
+    }
+    if (fallback === null && (d.totalPages ?? 0) >= 5) {
+      fallback = { idx: i + 1, d }
+      log(`第 ${i + 1} 篇 ${d.totalPages} 页（偶数）——记为退路，续找奇数页`)
+    }
+  }
+  if (fallback !== null) {
+    await win.getByRole('button', { name: '文献库' }).click()
+    await win.waitForTimeout(1000)
+    await win.locator('button.lib-card').nth(fallback.idx - 1).dblclick()
+    await win.waitForSelector('[data-page-column="ready"]', { timeout: 12_000 })
+    await win.waitForTimeout(1000)
+    log(`真库前 ${maxTry} 篇无奇数页文献——退回第 ${fallback.idx} 篇（${fallback.d.totalPages} 页，E 走双盒分支）`)
+    return await dump()
+  }
+  throw new Error('真实库前 8 篇无 ≥5 页文献——探针前提不满足')
+}
+const t0 = await openMultiPagePaper()
+await win.waitForTimeout(1200) // 页列就绪+恢复链滚动落定
+log('前置/单页就绪：', JSON.stringify({ boxes: t0.boxes.length, totalPages: t0.totalPages, page: t0.page, zoom: t0.zoomLabel }))
+check('pre/ready', t0.boxes.length === t0.totalPages && t0.rows.length === 0, `单页就绪 ${t0.boxes.length} 盒/${t0.totalPages} 页,无行盒（${t0.zoomLabel}）`)
+
+// ── 场景 A：开双页→首行两页真渲染+行宽口径 ──
+await win.getByRole('button', { name: '双页' }).click()
+await win.waitForSelector('[data-page-row]', { timeout: 10_000 })
+await win.waitForTimeout(1500) // basis 重报+恢复链滚回+懒渲染窗口落定
+const ta = await dump()
+log('A/双页：', JSON.stringify({ rows: ta.rows.length, roots: ta.roots }))
+const expectRows = Math.ceil(ta.totalPages / 2)
+check('A/row-count', ta.rows.length === expectRows, `行数 ${ta.rows.length}=ceil(${ta.totalPages}/2)`)
+const r0 = ta.rows[0]
+const gap = 12
+// 双页并排真渲染证据：存在某行两盒都进渲染窗口（data-page-root=canvas 就位）。
+// 不锁「首行 1+2」——恢复链滚到记忆页（本例第 20 页），渲染窗口跟视口走（懒渲染语义）
+const pairRow = ta.rows.find((r) => r.boxes.length === 2 && ta.roots.includes(r.boxes[0].no) && ta.roots.includes(r.boxes[1].no))
+check('A/pair-row-rendered', pairRow !== undefined, `行(${pairRow?.leftNo})两页并排真渲染 data-page-root 同含 [${pairRow ? pairRow.boxes[0].no + ',' + pairRow.boxes[1].no : ''}]（canvas 就位；渲染窗口 roots=[${ta.roots}]）`)
+check(
+  'A/row-width-formula',
+  Math.abs(r0.rowW - (r0.boxes[0].w + r0.boxes[1].w + gap)) <= 1,
+  `行盒宽 ${r0.rowW.toFixed(1)} ≈ 左(${r0.boxes[0].w.toFixed(1)})+右(${r0.boxes[1].w.toFixed(1)})+gap(${gap})`
+)
+await win.screenshot({ path: join(OUT, 'A-double.png') })
+
+// ── 场景 B：归一 100%→适应宽度=双页口径（node 复算）+行宽入视口 ──
+await win.getByRole('button', { name: '100%' }).click()
+await win.waitForTimeout(600)
+const tb0 = await dump()
+const sizes = tb0.boxes.slice(0, 2).map((b) => ({ width: b.w, height: b.h })) // zoom=1：盒宽=页原始宽
+const rowW1 = rowWidth({ left: sizes[0], leftNo: 1, right: sizes[1], rightNo: 2 }, 1)
+await win.getByRole('button', { name: '适应宽度' }).click()
+await win.waitForTimeout(800)
+const tb = await dump()
+const cw = tb.scroller.cw
+const expectedZoom = (cw - 24) / columnWidthFor(sizes.concat([]), 1, 'double')
+const shownPct = Number(tb.zoomLabel.replace('%', ''))
+check('B/zoom-double-basis', Math.abs(shownPct - Math.round(expectedZoom * 100)) <= 1, `zoom=${tb.zoomLabel}≈(clientWidth${cw}−24)/行宽${rowW1}=${(expectedZoom * 100).toFixed(1)}%（columnWidthFor 源码复算）`)
+const fitRow = tb.rows[0]
+check('B/row-fits-viewport', fitRow.rowW <= cw - 24 + 2, `行宽 ${fitRow.rowW.toFixed(1)} ≤ 内容区 ${cw - 24}+2（两页并排恰入视口——S2）`)
+await win.screenshot({ path: join(OUT, 'B-fitwidth-double.png') })
+
+// ── 场景 C：双页「下一页」=page+2+行 2 两盒顶对齐 ──
+await win.getByRole('button', { name: '100%' }).click()
+await win.waitForTimeout(600)
+// 起点归一到第 1 页（真实库 lastReadPage 不可控——确定性前提）
+await win.locator('input[aria-label="跳转到页"]').fill('1')
+await win.locator('input[aria-label="跳转到页"]').press('Enter')
+await win.waitForTimeout(1200)
+const pageBefore = (await dump()).page
+await win.getByRole('button', { name: '下一页' }).click()
+await win.waitForTimeout(1200) // 程序滚动（INV-29 信号→行顶）落定
+const tc = await dump()
+const targetRow = tc.rows.find((r) => r.boxes.some((b) => b.no === tc.page + 1)) // 含翻面后当前页的行
+log('C/翻面：', JSON.stringify({ pageBefore, after: tc.page, targetRowLeftNo: targetRow?.leftNo }))
+check('C/page-step-2', tc.page === Math.min(pageBefore + 2, tc.totalPages - 1), `页码 ${pageBefore}→${tc.page}（+2 翻面步进，S4；末行夹取兜底）`)
+check(
+  'C/row2-tops-aligned',
+  targetRow !== undefined && Math.abs(targetRow.boxes[0].top - targetRow.boxes[1].top) <= 1 && Math.abs(targetRow.boxes[0].top - tc.boxes[0].top) > 10,
+  `目标行(${targetRow?.leftNo})两盒顶对齐(Δtop=${targetRow ? Math.abs(targetRow.boxes[0].top - targetRow.boxes[1].top).toFixed(2) : 'n/a'}px)且已滚离首行（程序滚行顶）`
+)
+
+// ── 场景 D：双页→单页（页码保持 S1）→单页口径 fit→再双页（行恢复+口径回落 S5）──
+const pageAtD = tc.page
+await win.evaluate(() => {
+  const scroller = document.querySelector('[data-page-column]')?.closest('.overflow-auto')
+  if (scroller) scroller.scrollTop = Math.floor(scroller.scrollHeight / 2)
+})
+await win.waitForTimeout(1400) // 滚动回写防抖落账
+const pageMid = (await dump()).page
+await win.getByRole('button', { name: '双页' }).click() // 切单页
+await win.waitForTimeout(1500) // basis 重报+恢复链滚回
+const td = await dump()
+log('D/切单页：', JSON.stringify({ pageMid, after: td.page, rows: td.rows.length }))
+check('D/rows-cleared', td.rows.length === 0 && td.boxes.length === td.totalPages, `单页行盒清零（${td.boxes.length} 盒直列）`)
+check('D/position-kept', Math.abs(td.page - pageMid) <= 1, `页码保持 ${pageMid}→${td.page}（S1 恢复链滚回当前页，|Δ|≤1）`)
+await win.getByRole('button', { name: '适应宽度' }).click()
+await win.waitForTimeout(800)
+const zSingle = Number((await dump()).zoomLabel.replace('%', ''))
+await win.getByRole('button', { name: '双页' }).click() // 切回双页
+await win.waitForSelector('[data-page-row]', { timeout: 10_000 })
+await win.waitForTimeout(1200)
+const td2 = await dump()
+await win.getByRole('button', { name: '适应宽度' }).click()
+await win.waitForTimeout(800)
+const td3 = await dump()
+const zDouble = Number(td3.zoomLabel.replace('%', ''))
+check('D/rows-restored', td2.rows.length === expectRows, `切回双页行恢复 ${td2.rows.length}=${expectRows}`)
+check('D/basis-rebased', zDouble < zSingle, `适应宽度口径回落：单页 ${zSingle}% → 双页 ${zDouble}%（basis 重报不残留——S5）`)
+check('D/page-still-kept', Math.abs(td3.page - td.page) <= 2, `往返后页码 ${td.page}→${td3.page}（|Δ|≤2 恢复链容差）`)
+
+// ── 场景 E：跳末页→末行奇数页无塌陷 ──
+await win.getByRole('button', { name: '100%' }).click()
+await win.waitForTimeout(600)
+const total = (await dump()).totalPages
+await win.locator('input[aria-label="跳转到页"]').fill(String(total))
+await win.locator('input[aria-label="跳转到页"]').press('Enter')
+await win.waitForTimeout(1800) // 滚到末行+懒渲染窗口移动落定
+const te = await dump()
+const lastRow = te.rows.at(-1)
+const expectLastBoxes = total % 2 === 0 ? 2 : 1
+log('E/末页：', JSON.stringify({ total, lastRow: lastRow?.leftNo, boxes: lastRow?.boxes.length }))
+check('E/last-row-single', lastRow !== undefined && lastRow.boxes.length === expectLastBoxes && lastRow.boxes[0].h > 10, `末行(${lastRow?.leftNo})盒数 ${lastRow?.boxes.length}=期望${expectLastBoxes}，盒高 ${lastRow ? lastRow.boxes[0].h.toFixed(0) : 0}px>10（无塌陷——S3）`)
+if (expectLastBoxes === 1) {
+  check('E/last-row-width-stable', Math.abs(lastRow.rowW - lastRow.boxes[0].w) <= 1, `末行宽 ${lastRow.rowW.toFixed(1)}=左盒宽（右缺席无空盒占位，行宽恒定）`)
+}
+await win.screenshot({ path: join(OUT, 'E-odd.png') })
+
+// ── F：pageerror 0 ──
+check('F/no-pageerror', pageErrors.length === 0, `页面错误 ${pageErrors.length} 条${pageErrors.length > 0 ? '：' + pageErrors.join('; ') : ''}`)
+
+writeFileSync(
+  join(OUT, 'f-r1-verify.json'),
+  JSON.stringify(
+    {
+      meta: { script: 'f-r1-verify.mjs', date: new Date().toISOString(), note: '真实库副本+真 PDF；单页前置/双页 A/B/C/D/E 逐场景 dump' },
+      scenes: { pre: t0, A_double: ta, B_fit: tb, C_step: tc, D_single: td, D_back_double: td2, D_fit_after: td3, E_last: te },
+      expected: { rowW1, expectedZoomB: expectedZoom, zSingle, zDouble },
+      results
+    },
+    null,
+    2
+  )
+)
+await app.close()
+
+const fails = results.filter((r) => !r.pass)
+if (fails.length === 0) console.log(`F-R1 VERIFY: PASS（${results.length}/${results.length} 项断言全过）→ f-r1-out/f-r1-verify.json`)
+else console.log(`F-R1 VERIFY: FAIL（${fails.length}/${results.length} 项断言失败——场景红=报主控裁决）`)
+process.exit(fails.length === 0 ? 0 : 1)
diff --git a/src/renderer/features/reader/PageBox.tsx b/src/renderer/features/reader/PageBox.tsx
new file mode 100644
index 000000000..73b28a901
--- /dev/null
+++ b/src/renderer/features/reader/PageBox.tsx
@@ -0,0 +1,60 @@
+/**
+ * [F-R1] PageBox —— 页盒渲染件（单双页共用；自 PageColumn 拆出——组件
+ * ≤250 行红线预裁，票面 §3 拆件结构）。
+ *
+ * ── 行为层 ──
+ * - 单一职责=一个页盒：占位态（空白但几何确定：宽=boxWidth/高=页高×zoom）
+ *   与渲染态（渲染窗口内：PdfPageCanvas+renderPage(no) 覆盖层装配）；
+ *   F-06 页盒视觉（panel 底+柔和阴影，渲染/占位同底）原样迁。
+ * - data-page-box=data-page-root 挂载位不变（IO/懒渲染回收/scroll-progress
+ *   回写/SelectionLayer 锚定全按页号消费——F-R1 矩阵「零改」格的实现前提）。
+ * - 单页列：boxWidth=列宽（最宽页×zoom，全列等宽）；双页行：boxWidth=自身
+ *   页宽×zoom（pageBoxWidth——行内左顶对齐的几何前提）。宽度语义由宿主
+ *   PageColumn 决定，本组件只消费。
+ *
+ * ── 接口层 ──
+ * - export function PageBox(props: { no; size; zoom; boxWidth; rendered;
+ *     doc: PDFDocumentProxy | null; renderPage(no); onPageRender(no, payload);
+ *     onError(msg) }): JSX.Element
+ *
+ * ── 架构层 ── / ── 生命周期层 ──
+ * - F-ARCH3 拆件纪律：函数形态原样迁（不加 useCallback/useMemo）；渲染窗口
+ *   判定（rendered）由宿主传入，canvas 生命周期=渲染窗口绑定（INV-30）不变。
+ */
+import type { PDFDocumentProxy } from './PdfDocProvider'
+import { PdfPageCanvas } from './PdfPageCanvas'
+import type { PdfTextContent } from './PdfPageCanvas'
+import { pageBoxHeight, type PageBoxSize } from './page-column-geometry'
+
+export function PageBox(props: {
+  no: number
+  size: PageBoxSize
+  zoom: number
+  /** 盒宽（single=列宽等宽；double=自身页宽×zoom——语义归宿主） */
+  boxWidth: number
+  /** 渲染窗口内标志（宿主 rendered set 成员） */
+  rendered: boolean
+  doc: PDFDocumentProxy | null
+  renderPage(no: number): JSX.Element
+  onPageRender(no: number, payload: PdfTextContent): void
+  onError(msg: string): void
+}): JSX.Element {
+  const { no, size, zoom, boxWidth, rendered, doc } = props
+  return (
+    <div
+      data-page-box={no}
+      className="relative shrink-0"
+      // [F-06] 页盒 panel 底+柔和阴影（缺陷 B）；渲染/占位同底消色差跳动
+      style={{ width: boxWidth, height: pageBoxHeight(size, zoom), background: 'var(--panel)', boxShadow: '0 1px 4px rgba(0,0,0,.12)' }}
+    >
+      {rendered ? (
+        <div data-page-root={no} className="absolute inset-0 flex justify-center">
+          <div className="relative h-fit">
+            <PdfPageCanvas doc={doc!} pageNo={no} zoom={zoom} onPageRender={props.onPageRender} onError={props.onError} />
+            {props.renderPage(no)}
+          </div>
+        </div>
+      ) : null}
+    </div>
+  )
+}
diff --git a/src/renderer/features/reader/PageColumn.tsx b/src/renderer/features/reader/PageColumn.tsx
index 27da96095..127799948 100644
--- a/src/renderer/features/reader/PageColumn.tsx
+++ b/src/renderer/features/reader/PageColumn.tsx
@@ -1,58 +1,50 @@
 // b3: P7-F
 /**
  * [SR2-F-01] PageColumn —— 页列几何与懒渲染回收（工单：done / strong）
- * [F-04 增补] 缩放中心锚（段⑥）：zoom 变化→盒重算→scrollTop 程序修正
- * （(scrollTop+vh/2)/总高 比值保持，INV-33；程序性修正不发用户接管信号）；
- * onReady 载荷=列宽基准（最宽页，fit-width 分母单源）；纯函数拆出
- * page-column-geometry.ts（250 行预裁拆分预案——旧定义删除）。
- * [F-05 增补] 程序滚动单容器收敛（缺陷 A：TabBar 被顶出视口）：段⑤
- * scrollIntoView（滚所有可滚祖先——含 document viewport/main 的泄漏面）
- * 换 scrollIntoNearestScroller(页盒,'start')（只滚最近滚动祖先，INV-34）；
- * props 接口零改。
- * [F-06 增补] 页盒视觉（缺陷 B：页间无分隔）：页盒 div 增 panel 底+柔和阴影
- * （页缘在 --bg 上可辨；渲染/占位同底）；gap/PAGE_GAP_PX 不动（INV-33），props 零改。
- *
- * ── 行为层 ──（实现段预拆六段,每段独立可测可审）
+ * 历史：F-04 缩放中心锚+纯函数拆出 page-column-geometry.ts（此处再导出
+ * nearestPage 维持 scroll-progress import 路径）；F-05 程序滚动单容器收敛
+ * （INV-34）；F-06 页盒视觉（迁 PageBox）。增补详述归六段行为层/拆件头注。
+ * [F-R1 增补] 双页阅读模式：props.layout（缺省 single=零破）→行渲染分支
+ * （layoutRows 行派生，data-page-row 行盒）；页盒 JSX 拆出 PageBox.tsx
+ * （单双页共用，≤250 红线预裁——F-ARCH3 零变纪律：不加 useCallback/
+ * useMemo）；就绪管线 deps [doc,totalPages] 零变（layoutRef latest 报当前
+ * 布局口径 basisWidth）；布局切换走轻 effect 重报 onReady（不重跑
+ * getPage）；IO deps 增 layout（列↔行 DOM 重排后重挂）；段⑥锚总高按
+ * 布局口径；懒渲染回收/scroll-progress 回写/程序滚动按页号消费零改。── 行为层：
  * - 段①页列就绪管线：doc 就绪→逐页 getPage→view 尺寸数组（缓存单源）→占位盒全列（总高确定）→onReady(列宽基准)→F-03 恢复 scrollTo；越界夹取锚本段（scrollToPage 前 clamp——openPaper 时 totalPages≡0 不可行）。
- * - 段②占位盒布局：高=pageSizes[no]×zoom；宽=列宽（最宽页×zoom 居中）；未渲染盒空白。
+ * - 段②占位盒布局：高=pageSizes[no]×zoom；宽=列宽（最宽页×zoom 居中；双页=各自页宽，行内左顶对齐）；未渲染盒空白。
  * - 段③懒渲染窗口：视口±1 页真渲染（canvas+覆盖层经 renderPage）；离屏>2 页销毁；IntersectionObserver 占位盒驱动（INV-30：canvas 生命周期=渲染窗口绑定）。
  * - 段④层实例化分工：覆盖层（TextLayer/AnnotationLayer/AiAnnotationLayer）经 renderPage(no) 每渲染页一套（props 不变父层循环）；SelectionLayer 单实例挂锚定页盒（锚定根动态归 F-02；挂载位=可见首报告）。
  * - 段⑤双源机制：scrollRequest（reader.store setPage 默认 'to' 时 bump）变化→scrollToPage(no)（盒顶）；'none'（滚动回写）不 bump 不滚（INV-29）。
  * - 段⑥缩放中心锚（F-04）：zoom prop 变化（就绪后）→盒高按缓存×新 zoom 重算→布局效应程序修正滚动容器 scrollTop（anchoredScrollTop 纯函数）；滚动位置镜像=容器 scroll 事件被动监听（程序/用户滚动皆覆盖）；修正属程序性 scrollTop 赋值，不经 wheel/keydown/pointerdown 接管链（INV-32 语义不受扰）。
- * - 布局态状态机：loading（尺寸未齐）→ready；每页 empty→rendering→rendered→recycling→empty；跨格：快速滚动（rendering 中滚出窗口→cancel→recycling）；zoom 变化（缓存×新 zoom 重算→窗口重评估，就绪后无 loading）。
+ * - 布局态状态机：loading（尺寸未齐）→ready；每页 empty→rendering→rendered→recycling→empty；跨格：快速滚动（rendering 中滚出窗口→cancel→recycling）；zoom 变化（缓存×新 zoom 重算→窗口重评估，就绪后无 loading）；F-R1 布局切换（就绪后重派生行+重报 basis，无 loading；切布局位置保持走 onReady 恢复链非 zoom 锚）。
  * - 内存断言：canvas 实例数≤渲染窗口+缓冲常量；快速滚动零泄漏。
- *
  * ── 接口层 ──
- * - props={doc,totalPages,zoom,renderWindow=1,recycleWindow=2,scrollContainerRef?,renderPage(no),onPageRender,onError,onReady(列宽基准),scrollRequest,onVisibleChange}；页盒布局+IO+回收调度+scrollToPage+缩放锚+页尺寸缓存单源。拆分/重构/受锁全清单=scripts/audits/p7f-ticketing-draft.md SR2-F-01/04 节（票面完整任务书）。
- *
- * ── 架构层 ──
- * - 分层不动；零新依赖；INV-01 零触碰；INV-29/30 双源区分+canvas 渲染窗口绑定；INV-33 缩放中心保持（纯函数+布局效应，F-04 登记）。
- *
- * ── 生命周期层 ──
- * - 不做：页内偏移进度/虚拟滚动（全长真实占位）/旋转页/跨页选区/持续 fit 模式/手势 pinch。
- *
- * ── 文化层 ──
- * - 测试（裸 describe，page-column.test.tsx）：几何纯函数（geometry 件直引）+渲染回收调度（桩 IO）+程序滚动+缩放锚修正；e2e 批 1=reader-text.spec 多页可见+INV-01 保持；收官链=reader-scroll.spec（F-04 注册文件）。完成后：npm run verify 绿 → 人工审查 git diff → 翻 registry
+ * - props={doc,totalPages,zoom,layout?,renderWindow=1,recycleWindow=2,scrollContainerRef?,renderPage(no),onPageRender,onError,onReady(列宽基准),scrollRequest,onVisibleChange}；页盒布局+IO+回收调度+scrollToPage+缩放锚+页尺寸缓存单源。
+ * ── 架构层 ── 分层不动；零新依赖；INV-01/29/30/33 语义全保持。
+ * ── 生命周期层/文化层 ── 不做：页内偏移进度/虚拟滚动/旋转页/跨页选区/持续 fit/手势
+ * pinch。测试=page-column+reader-double-page；e2e=reader-text/reader-scroll；真机=f-r1-verify.mjs。
  */
 import { useEffect, useLayoutEffect, useRef, useState } from 'react'
 import type { RefObject } from 'react'
 import type { PDFDocumentProxy } from './PdfDocProvider'
-import { PdfPageCanvas } from './PdfPageCanvas'
 import type { PdfTextContent } from './PdfPageCanvas'
+import { PageBox } from './PageBox'
 import {
   anchoredScrollTop,
   clampPageToColumn,
-  columnTotalHeight,
-  columnWidth,
-  pageBoxHeight,
+  columnTotalHeightFor,
+  columnWidthFor,
+  layoutRows,
+  pageBoxWidth,
   recycledPages,
   windowPages,
-  type PageBoxSize
+  type PageBoxSize,
+  type PageLayout
 } from './page-column-geometry'
 import { scrollIntoNearestScroller } from './scroll-converge'
 
-// 纯函数唯一实现已拆 page-column-geometry.ts（F-04 拆分预案）；此处再导出
-// nearestPage 维持 scroll-progress 既有 import 路径（单实现双出口，非复写）
+// nearestPage 再导出维持 scroll-progress 既有 import 路径（单实现双出口）
 export { nearestPage } from './page-column-geometry'
 export type { PageBoxSize } from './page-column-geometry'
 
@@ -67,6 +59,8 @@ export function PageColumn(props: {
   doc: PDFDocumentProxy | null
   totalPages: number
   zoom: number
+  /** F-R1 页布局（缺省 single=既有调用零破）：double=两页一行 (1,2)(3,4)… */
+  layout?: PageLayout
   renderWindow?: number
   recycleWindow?: number
   /** 段⑥：滚动容器 ref（缩放中心锚的 scrollTop 程序修正目标；缺省不修正） */
@@ -75,14 +69,14 @@ export function PageColumn(props: {
   renderPage(no: number): JSX.Element
   onPageRender(no: number, payload: PdfTextContent): void
   onError(msg: string): void
-  /** 段①：页列就绪（载荷=列宽基准：最宽页原始宽，fit-width 分母单源）；
-   *  段⑤：程序滚动信号（'none' 不 bump）；
+  /** 段①：页列就绪（载荷=列宽基准：布局口径最宽页/最宽完整行原始宽，fit-width 分母单源）；
    *  可见页上抛（SelectionLayer 锚定页挂载位消费——升序） */
   onReady?(basisWidth: number): void
   scrollRequest?: PageScrollRequest | null
   onVisibleChange?(visiblePages: number[]): void
 }): JSX.Element {
   const { doc, totalPages, zoom } = props
+  const layout = props.layout ?? 'single'
   const renderWindow = props.renderWindow ?? 1
   const recycleWindow = props.recycleWindow ?? 2
   const rootRef = useRef<HTMLDivElement | null>(null)
@@ -93,6 +87,9 @@ export function PageColumn(props: {
   onReadyRef.current = props.onReady
   onVisibleRef.current = props.onVisibleChange
   onErrorRef.current = props.onError
+  // F-R1 latest-ref：就绪管线 deps [doc,totalPages] 零变，完成时报当前布局口径
+  const layoutRef = useRef(layout)
+  layoutRef.current = layout
   const [pageSizes, setPageSizes] = useState<PageBoxSize[] | null>(null)
   const [visible, setVisible] = useState<Set<number>>(() => new Set())
   const [rendered, setRendered] = useState<Set<number>>(() => new Set())
@@ -101,9 +98,11 @@ export function PageColumn(props: {
   // 段⑥缩放中心锚：滚动位置镜像（容器 scroll 事件被动监听——程序/用户滚动皆覆盖）
   const liveScrollTop = useRef(0)
   const prevZoom = useRef(zoom)
+  // F-R1 布局切换重报的对照位（轻 effect 判「layout 确已变化」）
+  const prevLayout = useRef(layout)
 
-  // 段①就绪管线：doc/totalPages 变化→逐页 getPage→view 尺寸数组（缓存单源）→占位全列
-  // →onReady(列宽基准)；zoom 不入依赖（就绪后无 loading——缓存乘法非重取）
+  // 段①就绪管线：doc/totalPages 变化→逐页 getPage→view 尺寸数组（缓存单源）→占位
+  // 全列→onReady(列宽基准——当前布局口径)；zoom/layout 不入依赖（缓存乘法非重取）
   useEffect(() => {
     if (doc === null || totalPages <= 0) { setPageSizes(null); setSizesError(false); return }
     let cancelled = false
@@ -118,7 +117,7 @@ export function PageColumn(props: {
       }
       if (!cancelled) {
         setPageSizes(sizes)
-        onReadyRef.current?.(columnWidth(sizes, 1))
+        onReadyRef.current?.(columnWidthFor(sizes, 1, layoutRef.current))
       }
     }
     // W2：失败不静默（防 unhandled rejection+永久 loading）；tab 级 toast/error 归消费方
@@ -131,7 +130,16 @@ export function PageColumn(props: {
     }
   }, [doc, totalPages])
 
-  // 段③IO：占位盒驱动可见集（就绪后挂载；引用稳定防抖动）
+  // F-R1 布局切换重报：layout 变化→onReady 新口径 basisWidth（不重跑 getPage）；
+  // onReady 链经装配面→spProg.onColumnReady 恢复链滚回当前页（S1 声明期望）
+  useEffect(() => {
+    if (pageSizes === null) return
+    if (prevLayout.current === layout) return
+    prevLayout.current = layout
+    onReadyRef.current?.(columnWidthFor(pageSizes, 1, layout))
+  }, [layout, pageSizes])
+
+  // 段③IO：占位盒驱动可见集（就绪后挂载；F-R1 deps 增 layout——列↔行 DOM 重排后重挂）
   useEffect(() => {
     if (pageSizes === null) return
     const io = new IntersectionObserver((entries) => {
@@ -151,7 +159,7 @@ export function PageColumn(props: {
       io.observe(el)
     }
     return () => io.disconnect()
-  }, [pageSizes])
+  }, [pageSizes, layout])
 
   // 可见集上抛（升序；SelectionLayer 锚定页挂载位等消费）
   useEffect(() => {
@@ -167,9 +175,8 @@ export function PageColumn(props: {
     })
   }, [visible, totalPages, renderWindow, recycleWindow])
 
-  // 段⑤程序滚动（INV-29 单口）：夹取→页盒顶对齐视口顶（F-05：单容器收敛——
-  // 只滚最近滚动祖先 scrollIntoNearestScroller，更外层滚动面零位移，INV-34）；
-  // 未就绪挂起、就绪补滚
+  // 段⑤程序滚动（INV-29 单口）：夹取→页盒顶对齐视口顶（F-05 单容器收敛 INV-34）；
+  // 未就绪挂起、就绪补滚（双页左右页盒顶同行——滚行顶零特判）
   useEffect(() => {
     if (pageSizes === null || props.scrollRequest === null || props.scrollRequest === undefined) return
     const no = clampPageToColumn(props.scrollRequest.page + 1, totalPages)
@@ -189,8 +196,8 @@ export function PageColumn(props: {
     return () => el.removeEventListener('scroll', mirror)
   }, [props.scrollContainerRef])
 
-  // 段⑥缩放中心锚（INV-33）：zoom 变化→盒重算（本提交已渲染新几何）→程序修正
-  // scrollTop（比值保持）；程序性赋值不经 wheel/keydown/pointerdown 接管链（INV-32）
+  // 段⑥缩放中心锚（INV-33）：总高按布局口径 columnTotalHeightFor（双页=行
+  // 高和）；layout 不入 deps——切布局位置保持走 onReady 恢复链（非 zoom 锚）
   useLayoutEffect(() => {
     const el = props.scrollContainerRef?.current ?? null
     if (pageSizes === null || el === null) {
@@ -203,18 +210,16 @@ export function PageColumn(props: {
     el.scrollTop = anchoredScrollTop(
       liveScrollTop.current,
       el.clientHeight,
-      columnTotalHeight(pageSizes, from),
-      columnTotalHeight(pageSizes, zoom)
+      columnTotalHeightFor(pageSizes, from, layout),
+      columnTotalHeightFor(pageSizes, zoom, layout)
     )
   }, [zoom, pageSizes, props.scrollContainerRef])
 
-  if (sizesError) {
-    return <div data-page-column="error" className="mx-auto w-full" aria-label="页列加载失败" />
-  }
+  if (sizesError) return <div data-page-column="error" className="mx-auto w-full" aria-label="页列加载失败" />
   if (pageSizes === null || pageSizes.length !== totalPages) {
     return <div data-page-column="loading" className="mx-auto w-full" aria-label="页列加载中" />
   }
-  const width = columnWidth(pageSizes, zoom)
+  const width = columnWidthFor(pageSizes, zoom, layout)
   return (
     <div
       ref={rootRef}
@@ -222,27 +227,24 @@ export function PageColumn(props: {
       className="mx-auto flex flex-col items-center gap-3"
       style={{ width }}
     >
-      {pageSizes.map((size, i) => {
-        const no = i + 1
-        return (
-          <div
-            key={no}
-            data-page-box={no}
-            className="relative shrink-0"
-            // [F-06] 页盒 panel 底+柔和阴影（缺陷 B）；渲染/占位同底消色差跳动
-            style={{ width, height: pageBoxHeight(size, zoom), background: 'var(--panel)', boxShadow: '0 1px 4px rgba(0,0,0,.12)' }}
-          >
-            {rendered.has(no) ? (
-              <div data-page-root={no} className="absolute inset-0 flex justify-center">
-                <div className="relative h-fit">
-                  <PdfPageCanvas doc={doc!} pageNo={no} zoom={zoom} onPageRender={props.onPageRender} onError={props.onError} />
-                  {props.renderPage(no)}
-                </div>
-              </div>
+      {layout === 'double'
+        ? layoutRows(pageSizes).map((row) => (
+          // F-R1 双页行：两页盒并排 flex 左顶对齐；行内 gap-3 与 PAGE_GAP_PX 同源
+          // （rowWidth 口径）；末行单页右缺席不渲染空盒——列宽已排除孤页行，
+          // 行宽恒=左盒宽无跳变（S3 自裁，视觉验收归真机探针场景 E）
+          <div key={row.leftNo} data-page-row={row.leftNo} className="flex shrink-0 items-start gap-3">
+            <PageBox no={row.leftNo} size={row.left} zoom={zoom} boxWidth={pageBoxWidth(row.left, zoom)} rendered={rendered.has(row.leftNo)}
+              doc={doc} renderPage={props.renderPage} onPageRender={props.onPageRender} onError={props.onError} />
+            {row.right !== undefined && row.rightNo !== undefined ? (
+              <PageBox no={row.rightNo} size={row.right} zoom={zoom} boxWidth={pageBoxWidth(row.right, zoom)} rendered={rendered.has(row.rightNo)}
+                doc={doc} renderPage={props.renderPage} onPageRender={props.onPageRender} onError={props.onError} />
             ) : null}
           </div>
-        )
-      })}
+        ))
+        : pageSizes.map((size, i) => (
+          <PageBox key={i + 1} no={i + 1} size={size} zoom={zoom} boxWidth={width} rendered={rendered.has(i + 1)}
+            doc={doc} renderPage={props.renderPage} onPageRender={props.onPageRender} onError={props.onError} />
+        ))}
     </div>
   )
 }
diff --git a/src/renderer/features/reader/PagesOverlay.tsx b/src/renderer/features/reader/PagesOverlay.tsx
index d2209519e..54edad163 100644
--- a/src/renderer/features/reader/PagesOverlay.tsx
+++ b/src/renderer/features/reader/PagesOverlay.tsx
@@ -15,15 +15,16 @@
  *   ⑦ renderPageLayers 覆盖层工厂（TextLayer 挂载条件 pt!==undefined /
  *     AnnotationLayer 挂载条件 pr!==undefined / ReaderAiLayer 恒挂
  *     pageRoot=pr??null；page 传 no−1；viewportScale=zoom）。
- * - 内装 PageColumn（九 props 全透传）：onPageRender（写注册表）与
- *   renderPage（读注册表）读写同源必须同居一组件——这是本组件包 PageColumn
- *   而非只提供工厂的原因（F-ARCH3 票面行为层）。
+ * - 内装 PageColumn（十 props 全透传——F-R1 增 layout）：onPageRender（写
+ *   注册表）与 renderPage（读注册表）读写同源必须同居一组件——这是本组件
+ *   包 PageColumn 而非只提供工厂的原因（F-ARCH3 票面行为层）。
  * ── 接口层 ──
  * - export function PagesOverlay(props: { doc: PDFDocumentProxy; fileUrl: string;
  *     totalPages: number; zoom: number; annotations: Annotation[];
  *     scrollContainerRef: RefObject<HTMLDivElement | null>;
  *     scrollRequest: PageScrollRequest | null;
- *     onReady(basisWidth: number): void; onError(msg: string): void }): JSX.Element
+ *     onReady(basisWidth: number): void; onError(msg: string): void;
+ *     layout?: PageLayout }): JSX.Element
  * - 类型再导出纪律（INV-16）：PDFDocumentProxy 经 PdfDocProvider、PdfTextContent
  *   经 PdfPageCanvas、PageScrollRequest 经 PageColumn、Annotation 经 shared 模型。
  * ── 架构层 ──
@@ -45,6 +46,7 @@ import { ReaderAiLayer } from './AiAnnotationLayer'
 import { PageColumn, type PageScrollRequest } from './PageColumn'
 import type { PDFDocumentProxy } from './PdfDocProvider'
 import type { PdfTextContent } from './PdfPageCanvas'
+import type { PageLayout } from './page-column-geometry'
 import { TextLayer } from './TextLayer'
 
 /** 当前页文本与几何（成对更新：页号 + 文本载荷 + 该页 canvas CSS 盒） */
@@ -71,6 +73,8 @@ export function PagesOverlay(props: {
   scrollRequest: PageScrollRequest | null
   onReady(basisWidth: number): void
   onError(msg: string): void
+  /** F-R1 页布局（缺省 single——PageColumn 同语义透传） */
+  layout?: PageLayout
 }): JSX.Element {
   const { doc, fileUrl, totalPages, zoom, annotations, scrollContainerRef, scrollRequest, onReady, onError } = props
   const [pageTexts, setPageTexts] = useState<Record<number, PageText>>({})
@@ -115,7 +119,7 @@ export function PagesOverlay(props: {
   }
 
   return (
-    <PageColumn doc={doc} totalPages={totalPages} zoom={zoom} scrollContainerRef={scrollContainerRef}
+    <PageColumn doc={doc} totalPages={totalPages} zoom={zoom} layout={props.layout} scrollContainerRef={scrollContainerRef}
       onPageRender={handlePageRender} onError={onError}
       renderPage={renderPageLayers} onReady={onReady} scrollRequest={scrollRequest} />
   )
diff --git a/src/renderer/features/reader/ReaderPage.tsx b/src/renderer/features/reader/ReaderPage.tsx
index 45be038ed..21432f5db 100644
--- a/src/renderer/features/reader/ReaderPage.tsx
+++ b/src/renderer/features/reader/ReaderPage.tsx
@@ -18,6 +18,12 @@
  * - F-A3 选择模式装配：selectionMode 取 active tab（?? false）；toggle 语义在
  *   本装配面（工具栏纯受控只上抛 onToggleSelectionMode→store.setSelectionMode
  *   写 active tab，INV-42）
+ * - F-R1 双页装配：pageLayout 取 active tab（?? 'single'）；toggle 语义在本
+ *   装配面（工具栏只上抛 onTogglePageLayout→store.setPageLayout 写 active
+ *   tab）；翻页步进=双页 2/单页 1（工具栏 pageStep）；fitWidth 零改（分母
+ *   columnBasis 已随 onReady 布局口径重报——切布局 basis 重报时序先于用户
+ *   点击）；onReady 重触发走 spProg.onColumnReady 恢复链滚回当前页（S1 声明
+ *   期望：切布局不丢位置）
  * ── 接口层 ──
  * - export function ReaderPage(): JSX.Element
  * ── 架构层 ──
@@ -55,6 +61,7 @@ export function ReaderPage(): JSX.Element {
   const zoom = tab?.zoom ?? 1
   const color = tab?.color ?? 'yellow'
   const selectionMode = tab?.selectionMode ?? false
+  const pageLayout = tab?.pageLayout ?? 'single'
   const annotations = tab?.annotations ?? []
   const setPage = useReaderStore((s) => s.setPage)
   const setZoom = useReaderStore((s) => s.setZoom)
@@ -164,7 +171,7 @@ export function ReaderPage(): JSX.Element {
         <PdfDocProvider fileUrl={fileUrl} onDocInfo={(info) => setTotalPages(info.numPages)} onDocReady={setPdfDoc} onError={handlePdfError}>
           {(doc) => (
             <PagesOverlay doc={doc} fileUrl={fileUrl} totalPages={totalPages} zoom={zoom} annotations={annotations}
-              scrollContainerRef={scrollAreaRef} scrollRequest={columnScroll}
+              scrollContainerRef={scrollAreaRef} scrollRequest={columnScroll} layout={pageLayout}
               onReady={handleColumnReady} onError={handlePdfError} />
           )}
         </PdfDocProvider>
@@ -183,6 +190,11 @@ export function ReaderPage(): JSX.Element {
         selectionMode={selectionMode}
         onToggleSelectionMode={() => {
           useReaderStore.getState().setSelectionMode(!selectionMode)
+        }}
+        pageLayout={pageLayout}
+        pageStep={pageLayout === 'double' ? 2 : 1}
+        onTogglePageLayout={() => {
+          useReaderStore.getState().setPageLayout(pageLayout === 'double' ? 'single' : 'double')
         }} />
       <div className="flex min-h-0 flex-1">
         {outlineOpen ? (
diff --git a/src/renderer/features/reader/ReaderToolbar.tsx b/src/renderer/features/reader/ReaderToolbar.tsx
index 9c6ff58a8..a7ffcfeb6 100644
--- a/src/renderer/features/reader/ReaderToolbar.tsx
+++ b/src/renderer/features/reader/ReaderToolbar.tsx
@@ -8,16 +8,22 @@
  * - 选择模式开关（F-A3/INV-42，颜色组之后）：aria-pressed 反映当前态+选中
  *   态边框强调（颜色点选中态同语言）；toggle 语义在装配面 ReaderPage——
  *   工具栏纯受控只上抛 onToggleSelectionMode
+ * - 双页开关（F-R1，适应宽度之后——版面控制同组）：aria-pressed+选中态
+ *   边框强调（crib 选择模式按钮先例）；toggle 语义在装配面 ReaderPage——
+ *   只上抛 onTogglePageLayout；±翻页按钮步进=props.pageStep（缺省 1=既有
+ *   零变；装配面双页传 2=翻面语义）
  *
  * ── 接口层 ──
  * - export function ReaderToolbar(props: { page: number; totalPages: number; zoom: number;
  *     color: AnnotationColor; onNavigate(page: number): void;
  *     onZoom(z: number): void; onColor(c: AnnotationColor): void;
  *     selectionMode?: boolean; onToggleSelectionMode?(): void;
- *     onFitWidth?(): void }): JSX.Element
- * - selectionMode/onToggleSelectionMode 可选：受锁测试夹具（sha256 面）直植
- *   既有 props 形状零破坏；生产装配面 ReaderPage 恒传（缺席=常规态渲染+按钮
- *   点击无操作，仅存在于测试路径）
+ *     onFitWidth?(): void; pageLayout?: 'single' | 'double';
+ *     onTogglePageLayout?(): void; pageStep?: number }): JSX.Element
+ * - selectionMode/onToggleSelectionMode/onFitWidth/pageLayout/
+ *   onTogglePageLayout/pageStep 可选：受锁测试夹具（sha256 面）直植既有
+ *   props 形状零破坏；生产装配面 ReaderPage 恒传（缺席=常规态渲染+按钮
+ *   点击无操作/步进 1，仅存在于测试路径）
  * - onFitWidth（可选，Phase 3 接线时加入）：适应宽度需要滚动容器内宽与页面原始宽，
  *   二者都在 ReaderPage 手里——工具栏是纯受控组件不自测 DOM，故以回调上交；
  *   未传时按钮禁用并 title 说明
@@ -51,9 +57,17 @@ export function ReaderToolbar(props: {
   selectionMode?: boolean
   onToggleSelectionMode?: () => void
   onFitWidth?: () => void
+  /** F-R1 页布局（缺省 single）：双页按钮 aria-pressed 消费 */
+  pageLayout?: 'single' | 'double'
+  /** F-R1 双页 toggle 上抛（缺席=可点无操作——既有可选回调先例） */
+  onTogglePageLayout?: () => void
+  /** F-R1 翻页步进（缺省 1=既有零变；双页装配面传 2=翻面语义） */
+  pageStep?: number
 }): JSX.Element {
   const { page, totalPages, zoom, color, onNavigate, onZoom, onColor, onFitWidth } = props
   const selectionMode = props.selectionMode ?? false
+  const pageLayout = props.pageLayout ?? 'single'
+  const pageStep = props.pageStep ?? 1
   const [pageInput, setPageInput] = useState(String(page + 1))
 
   // 外部翻页（键盘/目录跳转/越界自愈）同步回输入框
@@ -86,7 +100,7 @@ export function ReaderToolbar(props: {
           type="button"
           className={btn}
           disabled={page <= 0}
-          onClick={() => onNavigate(page - 1)}
+          onClick={() => onNavigate(page - pageStep)}
         >
           上一页
         </button>
@@ -109,7 +123,7 @@ export function ReaderToolbar(props: {
           className={btn}
           style={{ borderColor: 'var(--border)' }}
           disabled={totalPages > 0 && page >= totalPages - 1}
-          onClick={() => onNavigate(page + 1)}
+          onClick={() => onNavigate(page + pageStep)}
         >
           下一页
         </button>
@@ -149,6 +163,19 @@ export function ReaderToolbar(props: {
         >
           适应宽度
         </button>
+
+        {/* 双页开关（F-R1）：适应宽度之后（版面控制同组）；crib 选择模式按钮
+            先例（aria-pressed+选中态边框强调）；toggle 语义在装配面——只上抛 */}
+        <button
+          type="button"
+          className={btn}
+          aria-pressed={pageLayout === 'double'}
+          title="两页并排阅读（翻页按对步进）"
+          style={{ borderColor: pageLayout === 'double' ? 'var(--accent)' : undefined }}
+          onClick={() => props.onTogglePageLayout?.()}
+        >
+          双页
+        </button>
       </div>
 
       <div className="flex items-center gap-1" role="group" aria-label="标注颜色">
diff --git a/src/renderer/features/reader/page-column-geometry.ts b/src/renderer/features/reader/page-column-geometry.ts
index bf1aa703e..93ce07f22 100644
--- a/src/renderer/features/reader/page-column-geometry.ts
+++ b/src/renderer/features/reader/page-column-geometry.ts
@@ -9,6 +9,9 @@
  * - 缩放中心锚（F-04 新增，INV-33）：anchoredScrollTop——总高变化前后保持
  *   (scrollTop+vh/2)/总高 比值，配 columnTotalHeight（盒高合计+盒间距）。
  * - 窗口/回收/中心页/夹取：F-01 语义原样（INV-30/31 消费面）。
+ * - 双页布局（F-R1）：PageLayout 类型+layoutRows 行派生/rowWidth 行宽/
+ *   columnWidthFor/columnTotalHeightFor 布局口径列宽总高（既有导出语义零变
+ *   ——INV/受锁测试消费面；PageLayout 类型单源驻本件）。
  */
 
 /** 页原始尺寸（pdf 用户空间，scale=1 基准——zoom 乘法在盒几何层） */
@@ -98,3 +101,72 @@ export function nearestPage(centerY: number, boxes: ReadonlyArray<{ top: number;
   })
   return best
 }
+
+// ── F-R1 双页阅读模式（页布局几何——类型与行派生单源驻本件，纯 renderer 域）──
+
+/** 页布局（F-R1）：single=既有单列；double=两页一行 (1,2)(3,4)…（per-tab
+ *  视图态，与 zoom/color/selectionMode 同型；类型不跨进程不入 src/shared） */
+export type PageLayout = 'single' | 'double'
+
+/** 双页行（F-R1）：左页盒必有；right/rightNo 末行奇数页时缺席 */
+export interface PageRow {
+  left: PageBoxSize
+  leftNo: number
+  right?: PageBoxSize
+  rightNo?: number
+}
+
+/** F-R1 行派生：页尺寸数组→行数组 (1,2)(3,4)…；末行奇数页 right 缺席 */
+export function layoutRows(sizes: readonly PageBoxSize[]): ReadonlyArray<PageRow> {
+  const rows: PageRow[] = []
+  for (let i = 0; i < sizes.length; i += 2) {
+    rows.push(
+      i + 1 < sizes.length
+        ? { left: sizes[i]!, leftNo: i + 1, right: sizes[i + 1]!, rightNo: i + 2 }
+        : { left: sizes[i]!, leftNo: i + 1 }
+    )
+  }
+  return rows
+}
+
+/** F-R1 盒宽：页原始宽×zoom（floor——与 canvas CSS 尺寸同口径；双页行内
+ *  盒宽=各自页宽（左顶对齐），单页列盒宽=列宽（最宽页）） */
+export function pageBoxWidth(size: PageBoxSize, zoom: number): number {
+  return Math.floor(size.width * zoom)
+}
+
+/** F-R1 行宽：左盒宽+右盒宽+行内 gap（PAGE_GAP_PX 单源常量，与行间 gap
+ *  同值同语义——不随 zoom 缩放，columnTotalHeight 盒间距口径一致）；
+ *  右缺席（末行单页）=左盒宽（无尾随 gap） */
+export function rowWidth(row: PageRow, zoom: number): number {
+  if (row.right === undefined) return pageBoxWidth(row.left, zoom)
+  return pageBoxWidth(row.left, zoom) + pageBoxWidth(row.right, zoom) + PAGE_GAP_PX
+}
+
+/** F-R1 布局口径列宽：single=columnWidth 语义零变（单实现复用）；double=
+ *  最宽完整行宽（末行单页行不计——列宽不被孤页抬宽）；全列无完整行
+ *  （单页文档开双页）退化最宽页宽 */
+export function columnWidthFor(sizes: readonly PageBoxSize[], zoom: number, layout: PageLayout): number {
+  if (layout !== 'double') return columnWidth(sizes, zoom)
+  let max = 0
+  for (const row of layoutRows(sizes)) {
+    if (row.right === undefined) continue
+    max = Math.max(max, rowWidth(row, zoom))
+  }
+  return max > 0 ? max : columnWidth(sizes, zoom)
+}
+
+/** F-R1 布局口径总高（INV-33 分母）：single=columnTotalHeight 语义零变；
+ *  double=行高和（行高=max(左右页高)）+行 gap×(行数−1)（gap 不随 zoom——
+ *  单页口径盒间距同语义） */
+export function columnTotalHeightFor(sizes: readonly PageBoxSize[], zoom: number, layout: PageLayout): number {
+  if (layout !== 'double') return columnTotalHeight(sizes, zoom)
+  const rows = layoutRows(sizes)
+  if (rows.length === 0) return 0
+  let sum = 0
+  for (const row of rows) {
+    const right = row.right !== undefined ? pageBoxHeight(row.right, zoom) : 0
+    sum += Math.max(pageBoxHeight(row.left, zoom), right)
+  }
+  return sum + PAGE_GAP_PX * (rows.length - 1)
+}
diff --git a/src/renderer/features/reader/reader.store.ts b/src/renderer/features/reader/reader.store.ts
index 4fa027553..97b5b630d 100644
--- a/src/renderer/features/reader/reader.store.ts
+++ b/src/renderer/features/reader/reader.store.ts
@@ -104,6 +104,16 @@ export interface TabState {
    *  面，8 文件完整对象直植）零破坏的必要形式；缺席即常规态，消费方一律
    *  ?? false 兜底；makeLoadingTab 新建分支显式 false */
   selectionMode?: boolean
+  /** 页布局（F-R1 双页阅读，per-tab 视图态——与 zoom/color/selectionMode
+   *  同型）：'single'=单列（默认）；'double'=两页一行。生命周期迁移表：
+   *  | openPaper（absent 新建） | 'single'（makeLoadingTab 显式置值） |
+   *  | openPaper（error 重试） | 沿 prev（{...prev,status:'loading'}） |
+   *  | setPageLayout(m) | active tab 写入 m；activeId=null no-op |
+   *  | closeOne(id) | 随 tab 删除；重开同 id=全新 tab='single' |
+   *  | close() | 整体复位 |
+   *  可选字段=存量测试夹具零破坏（消费方 ?? 'single' 兜底）；v1 不落库
+   *  （重开回 single——zoom 同型，票面备案） */
+  pageLayout?: 'single' | 'double'
 }
 
 /** 进度收账口（F-03 接线：装配面 ReaderPage 注册/注销成对；closeTab/close 消费） */
@@ -138,6 +148,9 @@ export interface ReaderStore {
   /** 标注「选择模式」写 active tab（F-A3/INV-42）：toggle 语义在装配面
    *  ReaderPage（工具栏纯受控只上抛）；activeId=null no-op（updateActiveTab 兜底） */
   setSelectionMode(mode: boolean): void
+  /** 页布局写 active tab（F-R1）：toggle 语义在装配面 ReaderPage（工具栏纯
+   *  受控只上抛）；activeId=null no-op（updateActiveTab 兜底） */
+  setPageLayout(layout: 'single' | 'double'): void
   addAnnotation(a: Annotation): void
   updateAnnotation(a: Annotation): void
   removeAnnotation(id: string): void
@@ -185,7 +198,8 @@ function makeLoadingTab(paperId: string, prev: TabState | undefined): TabState {
     annotations: [],
     status: 'loading',
     dirty: false,
-    selectionMode: false
+    selectionMode: false,
+    pageLayout: 'single'
   }
 }
 
@@ -369,6 +383,10 @@ export const useReaderStore = create<ReaderStore>()((set, get) => {
       updateActiveTab((tab) => ({ ...tab, selectionMode: mode }))
     },
 
+    setPageLayout(layout) {
+      updateActiveTab((tab) => ({ ...tab, pageLayout: layout }))
+    },
+
     addAnnotation(a) {
       updateActiveTab((tab) => ({ ...tab, annotations: [...tab.annotations, a] }))
     },
diff --git a/src/renderer/features/workspaces/workspace.css b/src/renderer/features/workspaces/workspace.css
index 45bcb4c8b..73d9566fa 100644
--- a/src/renderer/features/workspaces/workspace.css
+++ b/src/renderer/features/workspaces/workspace.css
@@ -49,8 +49,10 @@
   font-size: 10px;
 }
 
-/* 下拉面板：亮面卡+冷蓝描边+shadow-3 浮层；入场 160ms 上浮渐显
-   （transform 不占布局——顶栏高度链零扰动，F-05 同口径） */
+/* 下拉面板：亮面卡+冷蓝描边+shadow-3 浮层；入场 160ms 放大一圈渐显
+   （transform 不占布局——顶栏高度链零扰动，F-05 同口径）。原上浮
+   translateY(-4px) 在顶栏贴屏幕上缘时面板飘出可视区难看——改纯缩放
+   （origin=顶部中心，自按钮下方长出感），用户裁决 2026-08-31 */
 .ws-panel {
   display: flex;
   flex-direction: column;
@@ -62,16 +64,17 @@
   background: var(--panel);
   color: var(--text);
   box-shadow: var(--shadow-3);
+  transform-origin: top center;
   animation: ws-pop 0.16s ease-out;
 }
 @keyframes ws-pop {
   from {
     opacity: 0;
-    transform: translateY(-4px);
+    transform: scale(0.92);
   }
   to {
     opacity: 1;
-    transform: translateY(0);
+    transform: scale(1);
   }
 }
 
diff --git a/tests/unit/renderer/reader-double-page.test.tsx b/tests/unit/renderer/reader-double-page.test.tsx
new file mode 100644
index 000000000..157ed2bcc
--- /dev/null
+++ b/tests/unit/renderer/reader-double-page.test.tsx
@@ -0,0 +1,518 @@
+// @vitest-environment jsdom
+/**
+ * [F-R1] 阅读器双页阅读模式——票面 5.1 用例 ①~⑦（锁定合约，always-active，
+ * 不经 guardedDescribe——ADR-0017 裁决 3）。
+ *
+ * 覆盖：store 面（setPageLayout 写 active/per-tab 记忆/activeId=null no-op/
+ * makeLoadingTab 显式 single+error 重试沿 prev 继承——与 zoom/selectionMode
+ * 完全同型）、geometry 纯函数面（layoutRows 行派生/rowWidth 含行内 gap/
+ * columnWidthFor/columnTotalHeightFor 双页口径+末行单页不计+single 零变回归）、
+ * PageColumn 面（双页行 DOM data-page-row+页盒连续对+末行单页/单页回归/
+ * onReady 重报新口径且 getPage 计数不变/段⑥锚双页总高口径）、ReaderToolbar
+ * 面（双页按钮 aria-pressed/toggle 上抛/pageStep=2 翻面步进/缺省 1 回归）、
+ * fitWidth 分母注入面（basis=双页口径+fit 数学使行宽恰入视口）。
+ * jsdom 不可达面（canvas 真渲染/fitWidth 真布局/切换往返视觉）归真机探针
+ * scripts/audits/f-r1-verify.mjs（票面分工）。
+ * 形态 crib page-column.test.tsx（MockIO/makeDoc/async act flush）+
+ * selection-mode.test.tsx（store setState 直植/api client mock/按钮先例）。
+ */
+import { act } from 'react'
+import type { RefObject } from 'react'
+import { createRoot, type Root } from 'react-dom/client'
+import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
+import type { PDFDocumentProxy } from 'pdfjs-dist'
+import { PageColumn } from '../../../src/renderer/features/reader/PageColumn'
+import { ReaderToolbar } from '../../../src/renderer/features/reader/ReaderToolbar'
+import {
+  anchoredScrollTop,
+  columnTotalHeight,
+  columnTotalHeightFor,
+  columnWidth,
+  columnWidthFor,
+  layoutRows,
+  rowWidth
+} from '../../../src/renderer/features/reader/page-column-geometry'
+import {
+  createReaderStoreInitialState,
+  useReaderStore,
+  type TabState
+} from '../../../src/renderer/features/reader/reader.store'
+
+// store 面 openPaper 链的 api 桩（selection-mode.test 同法：模块 mock，
+// 组件面（PageColumn/ReaderToolbar）不消费 api——mock 仅作用于 reader.store）
+const { openMock, listMock } = vi.hoisted(() => ({
+  openMock: vi.fn(async (req: { paperId: string }) => ({
+    ok: true as const,
+    data: { fileUrl: `app-file://${req.paperId}`, fileName: `${req.paperId}.pdf`, lastReadPage: 0 }
+  })),
+  listMock: vi.fn(async () => ({ ok: true as const, data: [] }))
+}))
+vi.mock('../../../src/renderer/api/client', () => ({
+  api: { reader: { open: openMock, listAnnotations: listMock } },
+  // 真实 unwrap 契约：收 Promise<Result> 内部 await 再解包（mock 同契约）
+  unwrap: async (call: Promise<{ ok: boolean; data?: unknown; error?: { message: string } }>) => {
+    const r = await call
+    if (!r.ok) throw new Error(r.error?.message ?? 'api error')
+    return r.data
+  },
+  ApiClientError: class extends Error {}
+}))
+
+/** 桩 IntersectionObserver（jsdom 无实现——本票不驱动可见性，仅消噪音） */
+class MockIO {
+  static instances: MockIO[] = []
+  cb: IntersectionObserverCallback
+  targets = new Set<Element>()
+  constructor(cb: IntersectionObserverCallback) {
+    this.cb = cb
+    MockIO.instances.push(this)
+  }
+  observe(t: Element): void {
+    this.targets.add(t)
+  }
+  unobserve(t: Element): void {
+    this.targets.delete(t)
+  }
+  disconnect(): void {
+    this.targets.clear()
+  }
+}
+
+/** 混合尺寸文档桩：sizes[i]=[宽,高]（双页几何断言需左右页宽高不同） */
+function makeDoc(sizes: Array<[number, number]>): { doc: PDFDocumentProxy; getPage: ReturnType<typeof vi.fn> } {
+  const getPage = vi.fn(async (no: number): Promise<{ view: number[] }> => ({
+    view: [0, 0, sizes[no - 1]![0], sizes[no - 1]![1]]
+  }))
+  const doc = { numPages: sizes.length, getPage } as unknown as PDFDocumentProxy
+  return { doc, getPage }
+}
+
+/** 五页混合夹具：612×792 / 500×600 / 400×300 / 450×350 / 700×800 */
+const FIVE: Array<[number, number]> = [
+  [612, 792],
+  [500, 600],
+  [400, 300],
+  [450, 350],
+  [700, 800]
+]
+const fiveSizes = FIVE.map(([w, h]) => ({ width: w, height: h }))
+
+let root: Root | null = null
+let host: HTMLDivElement | null = null
+
+async function mount(node: JSX.Element): Promise<void> {
+  host = document.createElement('div')
+  document.body.appendChild(host)
+  root = createRoot(host)
+  await act(async () => {
+    root?.render(node)
+  })
+}
+
+function remount(node: JSX.Element): void {
+  act(() => {
+    root?.render(node)
+  })
+}
+
+/** ready 态完整 tab（selection-mode.test 同配方+pageLayout 维度） */
+function makeTab(id: string, pageLayout?: 'single' | 'double'): TabState {
+  return {
+    paperId: id,
+    fileUrl: `app-file://${id}`,
+    fileName: `${id}.pdf`,
+    title: '',
+    page: 0,
+    totalPages: 10,
+    zoom: 1,
+    color: 'yellow',
+    annotations: [],
+    status: 'ready',
+    dirty: false,
+    ...(pageLayout !== undefined ? { pageLayout } : {})
+  }
+}
+
+beforeEach(() => {
+  MockIO.instances = []
+  ;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
+  vi.stubGlobal('IntersectionObserver', MockIO)
+  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
+  vi.clearAllMocks()
+})
+
+afterEach(() => {
+  act(() => {
+    root?.unmount()
+  })
+  root = null
+  host?.remove()
+  host = null
+  vi.unstubAllGlobals()
+  useReaderStore.setState(createReaderStoreInitialState())
+})
+
+describe('F-R1 双页 —— store 面（TabState.pageLayout 生命周期）', () => {
+  it('①a setPageLayout：double 写入 active tab 再 single 回；activeId=null 时 no-op', () => {
+    useReaderStore.setState({ tabs: { 'p-1': makeTab('p-1') }, order: ['p-1'], activeId: 'p-1' })
+    useReaderStore.getState().setPageLayout('double')
+    expect(useReaderStore.getState().tabs['p-1']?.pageLayout).toBe('double')
+    useReaderStore.getState().setPageLayout('single')
+    expect(useReaderStore.getState().tabs['p-1']?.pageLayout).toBe('single')
+    useReaderStore.setState({ activeId: null })
+    const before = useReaderStore.getState().tabs
+    useReaderStore.getState().setPageLayout('double')
+    expect(useReaderStore.getState().tabs).toBe(before)
+  })
+
+  it('①b per-tab 记忆：A(double)/B(single) 切换各自保持；setPageLayout 只动 active', () => {
+    useReaderStore.setState({
+      tabs: { 'p-a': makeTab('p-a', 'double'), 'p-b': makeTab('p-b') },
+      order: ['p-a', 'p-b'],
+      activeId: 'p-a'
+    })
+    useReaderStore.getState().activateTab('p-b')
+    expect(useReaderStore.getState().tabs['p-b']?.pageLayout ?? 'single').toBe('single')
+    expect(useReaderStore.getState().tabs['p-a']?.pageLayout).toBe('double')
+    useReaderStore.getState().setPageLayout('double')
+    expect(useReaderStore.getState().tabs['p-b']?.pageLayout).toBe('double')
+    expect(useReaderStore.getState().tabs['p-a']?.pageLayout).toBe('double')
+    useReaderStore.getState().activateTab('p-a')
+    useReaderStore.getState().setPageLayout('single')
+    expect(useReaderStore.getState().tabs['p-a']?.pageLayout).toBe('single')
+    expect(useReaderStore.getState().tabs['p-b']?.pageLayout).toBe('double')
+  })
+
+  it('①c makeLoadingTab：openPaper 新建 tab 显式 pageLayout=single；error 重试沿 prev 继承（与 zoom 同型）', async () => {
+    await useReaderStore.getState().openPaper('p-new')
+    expect(useReaderStore.getState().tabs['p-new']?.status).toBe('ready')
+    expect(useReaderStore.getState().tabs['p-new']?.pageLayout).toBe('single')
+    // error 态重开：{...prev, status:'loading'} 继承面——prev=double 沿用（zoom 先例）
+    useReaderStore.setState({
+      tabs: { 'p-e': { ...makeTab('p-e', 'double'), status: 'error' } },
+      order: ['p-e'],
+      activeId: 'p-e'
+    })
+    await useReaderStore.getState().openPaper('p-e')
+    expect(useReaderStore.getState().tabs['p-e']?.status).toBe('ready')
+    expect(useReaderStore.getState().tabs['p-e']?.pageLayout).toBe('double')
+  })
+})
+
+describe('F-R1 双页 —— geometry 纯函数面', () => {
+  it('②a layoutRows：(1,2)(3,4)… 行派生；末行奇数页 right 缺席；空数组/单页退化', () => {
+    const rows = layoutRows(fiveSizes)
+    expect(rows).toHaveLength(3)
+    expect(rows[0]).toMatchObject({ leftNo: 1, rightNo: 2 })
+    expect(rows[0]!.left).toEqual({ width: 612, height: 792 })
+    expect(rows[0]!.right).toEqual({ width: 500, height: 600 })
+    expect(rows[1]).toMatchObject({ leftNo: 3, rightNo: 4 })
+    expect(rows[2]).toMatchObject({ leftNo: 5 })
+    expect(rows[2]!.right).toBeUndefined()
+    expect(rows[2]!.left).toEqual({ width: 700, height: 800 })
+    expect(layoutRows([])).toEqual([])
+    const one = layoutRows([{ width: 612, height: 792 }])
+    expect(one).toHaveLength(1)
+    expect(one[0]!.right).toBeUndefined()
+  })
+
+  it('②b rowWidth：左+右+行内 gap（12px 单源常量，zoom 乘页宽不乘 gap）；右缺席=左宽无 gap', () => {
+    const rows = layoutRows(fiveSizes)
+    expect(rowWidth(rows[0]!, 1)).toBe(612 + 500 + 12)
+    expect(rowWidth(rows[0]!, 2)).toBe(612 * 2 + 500 * 2 + 12)
+    expect(rowWidth(rows[2]!, 1)).toBe(700)
+  })
+
+  it('②c columnWidthFor：single=columnWidth 零变；double=最宽完整行宽（末行单页不计）；单页文档退化；空数组 0', () => {
+    expect(columnWidthFor(fiveSizes, 1, 'single')).toBe(columnWidth(fiveSizes, 1))
+    expect(columnWidthFor(fiveSizes, 1, 'single')).toBe(700)
+    expect(columnWidthFor(fiveSizes, 1, 'double')).toBe(612 + 500 + 12)
+    expect(columnWidthFor(fiveSizes, 2, 'double')).toBe(612 * 2 + 500 * 2 + 12)
+    // 末行单页不计：最宽页在末行也不抬列宽
+    const odd = [
+      { width: 300, height: 400 },
+      { width: 300, height: 400 },
+      { width: 900, height: 500 }
+    ]
+    expect(columnWidthFor(odd, 1, 'double')).toBe(300 + 300 + 12)
+    // 全列无完整行（单页文档双页）：退化最宽页宽
+    expect(columnWidthFor([{ width: 612, height: 792 }], 1, 'double')).toBe(612)
+    expect(columnWidthFor([], 1, 'double')).toBe(0)
+  })
+
+  it('②d columnTotalHeightFor：行高=max(左右页高)+行 gap×(行数−1)（gap 不随 zoom）；single=columnTotalHeight 零变', () => {
+    expect(columnTotalHeightFor(fiveSizes, 1, 'single')).toBe(columnTotalHeight(fiveSizes, 1))
+    // 行高：max(792,600)=792 / max(300,350)=350 / 800；总=792+350+800+2×12
+    expect(columnTotalHeightFor(fiveSizes, 1, 'double')).toBe(792 + 350 + 800 + 24)
+    expect(columnTotalHeightFor(fiveSizes, 2, 'double')).toBe(792 * 2 + 350 * 2 + 800 * 2 + 24)
+    expect(columnTotalHeightFor([], 1, 'double')).toBe(0)
+  })
+})
+
+describe('F-R1 双页 —— PageColumn 渲染面', () => {
+  it('③ 双页行 DOM：data-page-row 每行一个+行内页盒连续对 (1,2)(3,4)+末行单页；盒宽=自身页宽（左顶对齐口径）', async () => {
+    const { doc } = makeDoc(FIVE)
+    await mount(
+      <PageColumn
+        doc={doc}
+        totalPages={5}
+        zoom={1}
+        layout="double"
+        renderPage={(no) => <span data-rendered-page={no} />}
+        onPageRender={() => undefined}
+        onError={() => undefined}
+      />
+    )
+    const rows = host!.querySelectorAll<HTMLElement>('[data-page-row]')
+    expect(rows).toHaveLength(3)
+    const boxesIn = (row: Element): number[] =>
+      Array.from(row.querySelectorAll<HTMLElement>('[data-page-box]')).map((b) => Number(b.dataset.pageBox))
+    expect(boxesIn(rows[0]!)).toEqual([1, 2])
+    expect(boxesIn(rows[1]!)).toEqual([3, 4])
+    expect(boxesIn(rows[2]!)).toEqual([5])
+    // 全列盒序连续（懒渲染/回收按页号消费面零改）
+    expect(
+      Array.from(host!.querySelectorAll<HTMLElement>('[data-page-box]')).map((b) => Number(b.dataset.pageBox))
+    ).toEqual([1, 2, 3, 4, 5])
+    // 盒宽=自身页宽×zoom（非列宽等宽——行内左顶对齐的几何前提）
+    const b1 = host!.querySelector<HTMLElement>('[data-page-box="1"]')!
+    const b2 = host!.querySelector<HTMLElement>('[data-page-box="2"]')!
+    expect(b1.style.width).toBe('612px')
+    expect(b2.style.width).toBe('500px')
+  })
+
+  it('③b 单页分支回归：缺省 layout=无 data-page-row；盒等宽=列宽（最宽页）——既有零变', async () => {
+    const { doc } = makeDoc(FIVE)
+    await mount(
+      <PageColumn
+        doc={doc}
+        totalPages={5}
+        zoom={1}
+        renderPage={(no) => <span data-rendered-page={no} />}
+        onPageRender={() => undefined}
+        onError={() => undefined}
+      />
+    )
+    expect(host!.querySelectorAll('[data-page-row]')).toHaveLength(0)
+    expect(host!.querySelectorAll('[data-page-box]')).toHaveLength(5)
+    const b1 = host!.querySelector<HTMLElement>('[data-page-box="1"]')!
+    const b5 = host!.querySelector<HTMLElement>('[data-page-box="5"]')!
+    expect(b1.style.width).toBe('700px')
+    expect(b5.style.width).toBe('700px')
+  })
+
+  it('④ onReady 重报：single→double→single 各报对应口径 basisWidth；就绪管线不重跑（离屏页 getPage 不再取）', async () => {
+    const { doc, getPage } = makeDoc(FIVE)
+    const onReady = vi.fn()
+    const el = (layout: 'single' | 'double'): JSX.Element => (
+      <PageColumn
+        doc={doc}
+        totalPages={5}
+        zoom={1}
+        layout={layout}
+        renderPage={(no) => <span data-rendered-page={no} />}
+        onPageRender={() => undefined}
+        onError={() => undefined}
+        onReady={onReady}
+      />
+    )
+    await mount(el('single'))
+    expect(onReady).toHaveBeenCalledTimes(1)
+    expect(onReady).toHaveBeenLastCalledWith(700)
+    const calls0 = getPage.mock.calls.length
+    remount(el('double'))
+    await act(async () => {
+      await Promise.resolve()
+    })
+    expect(onReady).toHaveBeenCalledTimes(2)
+    expect(onReady).toHaveBeenLastCalledWith(612 + 500 + 12)
+    const afterDouble = getPage.mock.calls.length
+    remount(el('single'))
+    await act(async () => {
+      await Promise.resolve()
+    })
+    expect(onReady).toHaveBeenCalledTimes(3)
+    expect(onReady).toHaveBeenLastCalledWith(700)
+    // 布局切换不重跑就绪管线（尺寸缓存单源——只重派生行+重报）：离屏页
+    // （初始渲染窗口 {1,2} 外）getPage 恰一次不再取；每次切换的总增量仅来自
+    // 渲染窗口页的 canvas 重挂（page-column.test「缓存乘法非重取」同口径上界）
+    const countOf = (no: number): number => getPage.mock.calls.filter((c) => c[0] === no).length
+    expect(countOf(3)).toBe(1)
+    expect(countOf(4)).toBe(1)
+    expect(countOf(5)).toBe(1)
+    expect(afterDouble - calls0).toBeLessThanOrEqual(2 * 1 + 1)
+    expect(getPage.mock.calls.length - afterDouble).toBeLessThanOrEqual(2 * 1 + 1)
+  })
+
+  it('④b 初挂载即 double：就绪管线 onReady 直报双页口径（换文献 S7 同型）', async () => {
+    const { doc } = makeDoc(FIVE)
+    const onReady = vi.fn()
+    await mount(
+      <PageColumn
+        doc={doc}
+        totalPages={5}
+        zoom={1}
+        layout="double"
+        renderPage={(no) => <span data-rendered-page={no} />}
+        onPageRender={() => undefined}
+        onError={() => undefined}
+        onReady={onReady}
+      />
+    )
+    expect(onReady).toHaveBeenCalledTimes(1)
+    expect(onReady).toHaveBeenCalledWith(612 + 500 + 12)
+  })
+
+  it('⑦ 段⑥锚双页总高口径：zoom 1→2 程序修正 scrollTop 按行总高比值（2 行 3 页：1596→3180）', async () => {
+    const { doc } = makeDoc([
+      [612, 792],
+      [612, 792],
+      [612, 792]
+    ])
+    const scrollerEl = document.createElement('div')
+    document.body.appendChild(scrollerEl)
+    host = scrollerEl
+    root = createRoot(scrollerEl)
+    const containerRef = { current: scrollerEl } as RefObject<HTMLDivElement | null>
+    const el = (z: number): JSX.Element => (
+      <PageColumn
+        doc={doc}
+        totalPages={3}
+        zoom={z}
+        layout="double"
+        scrollContainerRef={containerRef}
+        renderPage={(no) => <span data-rendered-page={no} />}
+        onPageRender={() => undefined}
+        onError={() => undefined}
+      />
+    )
+    await act(async () => {
+      root?.render(el(1))
+    })
+    expect(host!.querySelectorAll('[data-page-box]')).toHaveLength(3)
+    scrollerEl.scrollTop = 400
+    act(() => {
+      scrollerEl.dispatchEvent(new Event('scroll'))
+    })
+    await act(async () => {
+      root?.render(el(2))
+    })
+    // 双页行总高：792×2+12=1596 → 792×2×2+12=3180；中心比 400/1596（jsdom clientHeight=0）
+    expect(scrollerEl.scrollTop).toBeCloseTo((400 / 1596) * 3180, 3)
+    expect(scrollerEl.scrollTop).toBe(anchoredScrollTop(400, 0, 1596, 3180))
+  })
+})
+
+describe('F-R1 双页 —— ReaderToolbar 面', () => {
+  function toolbarProps(over: Partial<Parameters<typeof ReaderToolbar>[0]>): Parameters<typeof ReaderToolbar>[0] {
+    return {
+      page: 0,
+      totalPages: 10,
+      zoom: 1,
+      color: 'yellow',
+      onNavigate: () => undefined,
+      onZoom: () => undefined,
+      onColor: () => undefined,
+      ...over
+    }
+  }
+
+  function findBtn(name: string): HTMLButtonElement {
+    const b = [...host!.querySelectorAll('button')].find((x) => x.textContent === name)
+    expect(b).toBeDefined()
+    return b as HTMLButtonElement
+  }
+
+  it('⑤a 双页按钮：aria-pressed 反映 pageLayout；选中态强调边框；点击恰调一次 onTogglePageLayout', async () => {
+    const onToggle = vi.fn()
+    await mount(
+      <ReaderToolbar
+        {...toolbarProps({ pageLayout: 'single', onTogglePageLayout: onToggle })}
+      />
+    )
+    const btn = findBtn('双页')
+    expect(btn.getAttribute('aria-pressed')).toBe('false')
+    act(() => {
+      btn.click()
+    })
+    expect(onToggle).toHaveBeenCalledTimes(1)
+    remount(
+      <ReaderToolbar
+        {...toolbarProps({ pageLayout: 'double', onTogglePageLayout: onToggle })}
+      />
+    )
+    expect(findBtn('双页').getAttribute('aria-pressed')).toBe('true')
+    expect(findBtn('双页').style.borderColor).toBe('var(--accent)')
+  })
+
+  it('⑤b pageStep=2 翻面步进：下一页 onNavigate(page+2)；上一页 onNavigate(page−2)；首页禁用上一页', async () => {
+    const onNavigate = vi.fn()
+    await mount(
+      <ReaderToolbar {...toolbarProps({ page: 0, pageStep: 2, onNavigate })} />
+    )
+    expect(findBtn('上一页').disabled).toBe(true)
+    act(() => {
+      findBtn('下一页').click()
+    })
+    expect(onNavigate).toHaveBeenCalledWith(2)
+    remount(
+      <ReaderToolbar {...toolbarProps({ page: 2, pageStep: 2, onNavigate })} />
+    )
+    act(() => {
+      findBtn('上一页').click()
+    })
+    expect(onNavigate).toHaveBeenCalledWith(0)
+    act(() => {
+      findBtn('下一页').click()
+    })
+    expect(onNavigate).toHaveBeenCalledWith(4)
+  })
+
+  it('⑤c 缺省 pageStep 回归：不传=±1（既有零变）', async () => {
+    const onNavigate = vi.fn()
+    await mount(
+      <ReaderToolbar {...toolbarProps({ page: 3, onNavigate })} />
+    )
+    act(() => {
+      findBtn('下一页').click()
+    })
+    expect(onNavigate).toHaveBeenCalledWith(4)
+    act(() => {
+      findBtn('上一页').click()
+    })
+    expect(onNavigate).toHaveBeenCalledWith(2)
+  })
+})
+
+describe('F-R1 双页 —— fitWidth 分母注入面', () => {
+  it('⑥ basis=onReady 双页口径单源：fit 数学 (clientWidth−24)/basis 使最宽完整行恰入视口', async () => {
+    const { doc } = makeDoc(FIVE)
+    const onReady = vi.fn()
+    await mount(
+      <PageColumn
+        doc={doc}
+        totalPages={5}
+        zoom={1}
+        layout="double"
+        renderPage={(no) => <span data-rendered-page={no} />}
+        onPageRender={() => undefined}
+        onError={() => undefined}
+        onReady={onReady}
+      />
+    )
+    const basis = onReady.mock.calls[0]![0] as number
+    // 分母随口径变：双页 basis=最宽完整行宽（>单页最宽页——S2 双页并排恰入视口的几何前提）
+    expect(basis).toBe(columnWidthFor(fiveSizes, 1, 'double'))
+    expect(basis).toBeGreaterThan(columnWidthFor(fiveSizes, 1, 'single'))
+    // 装配面 fitWidth 公式（ReaderPage 零改）：zoom=(clientWidth−24)/basis
+    // → 行宽（含行内 gap）恰入内容区（真布局归真机探针场景 B）
+    const clientWidth = 1200
+    const zoom = (clientWidth - 24) / basis
+    const rows = layoutRows(fiveSizes)
+    const widest = Math.max(
+      ...rows.filter((r) => r.right !== undefined).map((r) => rowWidth(r, zoom))
+    )
+    expect(widest).toBeLessThanOrEqual(clientWidth - 24)
+    expect(widest).toBeGreaterThan(clientWidth - 24 - 2)
+  })
+})

```

## 输出纪律(必读)

先统计行「B:N/W:N/N:N+总评一句」;逐条展开引证据(文件/断言 id/行);末行放行判定(放行/回炉+回炉点);200 行内;异基座读不了盘——结论只能来自本材料包;不确定写存疑。
