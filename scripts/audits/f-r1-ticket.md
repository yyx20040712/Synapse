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
