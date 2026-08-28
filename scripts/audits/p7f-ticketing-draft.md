# P7-F 连续滚动阅读战役 · 工单化票面草案 v2.1(2026-08-28 门一 r2 修票版)

> r2 修票(2026-08-28 主控,r2 复核条件两件+顺手项):
> - **W-A**:越界夹取点改锚「页列就绪时」——openPaper 落 page 时
>   totalPages≡0(makeLoadingTab :147/setTotalPages :337 后置),原
>   「恢复时一次性夹取」不可行;修=PageColumn onReady→scrollToPage
>   前夹取(页尺寸数组已知,totalPages 有效)。
> - **W-B**:restoring 态用户接管判定写死=**非 scroll 的用户输入信号**
>   (wheel/keydown/pointerdown 三类;程序 scrollToPage 自发的 scroll
>   事件不算用户信号)——恢复期任一用户输入→取消程序目标转 scrolling。
> - 顺手:F-01 行为层补实现段结构(W1 完全化)/SelectionLayer 工具条
>   落点坐标以**选区所在页盒**为参照系声明(N-C——单实例下 offset
>   parent=页列容器,坐标换算经页盒 rect)/台账编号 N-D 勘正/夹取
>   行号 :334(N-E)。

> v1 门一=3B/7W/8N FAIL(p7f-ticketing.audit.raw.txt)→本 v2 处置台账:
>
> | 发现 | 处置 |
> | --- | --- |
> | B1 store.page 双源互斥(跳页 scrollTo vs 滚动回写=回弹死循环) | **采纳·设计修正**:setPage 增可选第三参 `{scroll?:'to'|'none'}`——默认 'to'(既有五消费面零改);滚动回写走 'none'(页码本就从滚动位置算出,无需再滚)。F-01 落地机制+F-03 消费;**不变量登记**(程序跳页与滚动同步双源区分) |
> | B2 :125 回写自愈/:116 第一个 canvas 量测单页假设 | **采纳**:F-01 票面显式列两处处遇——:125 自愈删除(页列下 renderedPage 无单值,越界夹取移至恢复时一次性);:116 量测改每页自量(占位盒尺寸已知,量测仅 DPR 校准) |
> | B3 F-03 受锁漏列 reader.store.test+接口无 paperId 维度 | **采纳**:受锁面补 reader.store.test;scroll-progress 接口补 `getPaperId`,内部 Record<paperId,状态> 保持 per-tab 记账 |
> | W1 F-01 五重面过重 | **采纳·补细节**:保持一票但**实现段预拆五段**(ENR 交接书「票面重量预拆实现段」本义),每段独立可测可审 |
> | W2 中间态边角+状态机缺格+页列就绪信号 | **采纳**:补「页列就绪管线」(逐页 getPage(view) 尺寸数组→总高→恢复);F-03 状态机补 writing 中 scroll 格(回写后用户又滚=重新进 scrolling);SelectionLayer **改单实例方案**(不随页实例化,锚定根动态找选区所在页)——document 级监听天然单实例,INV-14 面消解 |
> | W4 状态机缺「页列就绪」信号 | 并入 W2(就绪管线+loading 态入 F-01 布局态状态机) |
> | W5 F-04 注册文件错位(ReaderToolbar≈零改) | **采纳**:F-04 注册文件=tests/e2e/reader-scroll.spec.ts(收官=e2e 票,LG-05 先例) |
> | W6 行数预算违宪(组件≤250 非 500)+F-03 漏装配面+无文件清单 | **采纳**:PdfCanvas 拆两文件(渲染单元+doc 管理)各≤250;F-03 补 ReaderPage 装配面;四票各附 ENR 式文件清单 |
> | W7 F-02 虚列不存在的 SelectionLayer 组件测试为受锁扩 | **采纳**:改为「新组件测试文件入锁」 |
> | D 锚点漂移两处 | 修正:zoom 夹取 [0.5,3]=reader.store.ts:334(票面 v1 误写 :163——那是 PdfCanvas scale);annotation-order 比较器=:44-50(src/shared 受锁目录) |
> | E 依赖序 | 修正:F-02/F-03 均依赖 F-01;F-02→F-03 串行理由=ReaderPage 共享装配面+受锁 e2e spec 排他(全量 verify 纪律),非文件依赖 |
> | N8 证实项 | 验收四项覆盖+冻结面零触碰维持 |

## 主控预裁项 v2(双门可攻击,推翻需更强依据;用户 plan 门可改)

1. **进度粒度 v1=整数页**:沿用 last_read_page(0 基,恢复=滚到该页页顶),
   零迁移零 schema 改动;页内偏移留实锤再议。
2. **页列结构**:占位盒(高度=page.view×zoom)+视口±1 页真渲染+离屏>2
   回收;IntersectionObserver 占位盒驱动;**页列就绪管线**=逐页
   getPage(view) 尺寸数组(缓存于 PageColumn)→总高→就绪信号→恢复 scrollTo。
3. **setPage 双源**(B1 修):`setPage(id,page,opts?:{scroll?:'to'|'none'})`,
   默认 'to';不变量「程序跳页与滚动同步双源区分」随 F-01 登记 invariants。
4. **SelectionLayer 单实例**(W2 修):不随页实例化,挂 ReaderPage 级,
   锚定根动态=选区 anchorNode 向上最近页盒;TextLayer/AnnotationLayer/
   AiAnnotationLayer 随渲染页实例化。
5. 4 票边界与依赖序(F-01→F-02→F-03→F-04 串行,理由见处置表 E)。
6. F-aware 冻结面零触碰:locateAnchor 签名(anchor-locate.ts:69-84)+
   annotation-order 比较器(:44-50,src/shared 受锁)。
7. INV-01 保持(滚动只在页列容器);**INV-16 白名单随拆分迁移**(W-F 修:
   pdfjs-dist import 白名单 PdfCanvas.tsx→PdfDocProvider.tsx+PdfPageCanvas.tsx
   ——eslint.config.js 受锁改+[locked-change]+INV-16 登记文本同步;类型
   再导出单点随之迁移,白名单仍是封闭集)。
8. e2e 迁移四批随票;每批全量 verify;新 spec=渲染真实文本断言。
9. 中间态可用性:F-01 后=可滚动阅读+单页内划选标注正确(SelectionLayer
   单实例动态锚定天然支持);跨页选区拒绝+toast(F-02 完整化)。

---

## SR2-F-01 页列几何与懒渲染回收(canvas 面+层实例化)

`// b3: P7-F`(注册文件=src/renderer/features/reader/PageColumn.tsx 新建)

**─ 行为层 ──**(实现段预拆五段,每段独立可测可审——W1)
- **段①页列就绪管线**:doc 就绪→逐页 getPage→view 尺寸数组(pageSizes
  缓存)→占位盒全列渲染(总高确定)→`onReady`→F-03 恢复 scrollTo;
  **越界夹取锚本段**(W-A:onReady→scrollToPage 前,页尺寸数组已知
  时夹取——openPaper 时 totalPages≡0 不可行);loading 态入状态机。
- **段②占位盒布局**:高=pageSizes[no]×zoom,宽=列宽(最宽页×zoom,
  居中);未渲染盒=空白。
- **段③懒渲染窗口**:视口±1 页渲染(canvas+TextLayer+AnnotationLayer+
  AiAnnotationLayer 实例);离屏>2 页销毁(canvas 移除+pageText 条目
  删除);IntersectionObserver 占位盒驱动。
- **段④层实例化分工**(W2):TextLayer/AnnotationLayer/AiAnnotationLayer
  每渲染页一套(props 不变父层循环);**SelectionLayer 单实例**挂
  ReaderPage 级,锚定根动态(选区所在页盒;**工具条落点坐标以选区
  所在页盒为参照系**——N-C:单实例 offset parent=页列容器,换算经
  页盒 rect,防层叠污染)。
- **段⑤双源机制+单页假设处遇**(B1/B2):setPage 增 `opts?:{scroll?:
  'to'|'none'}` 默认 'to';store.page 变化且 scroll:'to'→
  PageColumn.scrollToPage(no)(盒顶);scroll:'none'→不滚;五处既有
  消费面零改(默认值)。ReaderPage.tsx:125 越界自愈删除(夹取移
  段①就绪时);:116 onPageRender 量测改每页自量(DPR 校准,「第一
  个 canvas」查询删除)。
- pageText 单份(ReaderPage.tsx:89)→Record<pageNo,PageText>(仅渲染
  窗口内,回收同删)。
- 内存断言:canvas 实例数 ≤ 渲染窗口+缓冲常量;快速滚动零泄漏。

**─ 接口层 ──**
- PageColumn.tsx(新,注册文件):props={doc,totalPages,zoom,renderWindow=1,
  recycleWindow=2,renderPage(no),onPageRender(no,payload),onReady};
  页盒布局+IntersectionObserver+回收调度+scrollToPage(no)+页尺寸缓存单源。
- PdfCanvas.tsx 拆两文件(W6 修):PdfDocProvider.tsx(doc 生命周期 :126-150
  上提,每 tab 一份)+PdfPageCanvas.tsx(每页渲染单元:渲染 effect/取消/
  DPR :154-215 原样,props 增 pageNo 固定);两文件各 ≤250。
- ReaderPage.tsx:布局段 :154-196 重构(页列+单实例 SelectionLayer);
  行数重排后 ≤250。
- **布局态状态机**(交审计):loading(尺寸未齐)→ready(就绪)→
  …;每页:placeholder→rendering→rendered→recycling→placeholder;
  跨格:快速滚动(rendering 中滚出窗口→cancel 渲染任务→recycling);
  zoom 变化(尺寸数组×新 zoom 重算→窗口重评估;就绪后无 loading 态
  ——尺寸缓存乘法非重取)。

**─ 架构层 ──**
- 分层不动;零新依赖;INV-01 零触碰;**INV-16 白名单迁移**(W-F:
  eslint.config.js 受锁改——no-restricted-imports 白名单 PdfCanvas.tsx
  →PdfDocProvider.tsx+PdfPageCanvas.tsx 两新文件+docs/invariants.md
  INV-16 登记文本同步;[locked-change] 随单;白名单仍封闭集)。
- **不变量预登记**(F-01 收口):①程序跳页与滚动同步双源区分
  (scroll:'none' 不触发程序滚动——防回弹;声明处=setPage 签注+
  PageColumn.scrollToPage 单口;锚定=单测跨格);②canvas 生命周期=
  渲染窗口绑定(离屏必回收;锚定=组件单测)。

**─ 生命周期层 ──**
- 不做:页内偏移/虚拟滚动(全长真实占位)/旋转页/跨页选区。

**─ 文化层 ──**
- 测试(裸 describe):PageColumn 布局纯函数(盒高/列宽/窗口/最近页);
  渲染回收调度(桩 IntersectionObserver);双源机制(scroll:'none'
  不触发 scrollToPage——B1 回归锚);e2e 批 1:reader-text.spec
  :93-138(多页可见断言)+INV-01 三层保持。
- **文件清单**:PageColumn.tsx(新)/PdfDocProvider.tsx+PdfPageCanvas.tsx
  (新,由 PdfCanvas.tsx 拆——旧文件删除,方案切换=删除旧方案红线)/
  ReaderPage.tsx(改)/reader.store.ts(改·setPage 第三参)/
  **eslint.config.js(受锁改·INV-16 白名单迁移——W-F)/
  docs/invariants.md(改·INV-16 登记文本同步,非锁)**/
  tests/unit/renderer/page-column.test.tsx(新入锁)/
  tests/e2e/reader-text.spec.ts(受锁扩批 1)/tests/unit/renderer/
  reader.store.test(受锁扩——setPage 第三参用例)。
- 验收:44 页 Reynolds 流畅;canvas 计数常量;e2e 全绿。

---

## SR2-F-02 四层多页化完整收口与跳页兼容

`// b3: P7-F`(注册文件=src/renderer/features/reader/SelectionLayer.tsx 改造)

**─ 行为层 ──**
- SelectionLayer 动态锚定根(W2 方案):锚定根=selection.anchorNode
  向上最近页盒(纯函数页盒遍历);selectionchange 防抖(:50/:106-111)
  与工具条落点(:95-103)语义保持;**跨页选区拒绝**——anchorNode 页盒
  ≠ focusNode 页盒→不创建+toast(半页锚定防护)。
- verifyWhenReady 页限定:anchor-locate.ts:153 querySelector 全局第一
  →目标页(anchorPage 页盒)内查询;头注 :52-54 F-aware 接缝口径
  同步为滚动步;**签名零触碰**。
- AnnotationLayer/AiAnnotationLayer 每页实例数据面:页过滤语义不变;
  AiAnnotationLayer 缓存键(paperId+页 :91)随实例分页。
- 跳页兼容全链:五消费面(快捷键/工具栏/越界移除后四消费面+恢复)
  e2e 正确性。

**─ 接口层 ──**
- SelectionLayer.tsx:锚定根获取纯函数化;props 不变;243→≤250。
- anchor-locate.ts:仅 :153 限定+头注同步;254→≤260。

**─ 架构层 ──**
- **选区态状态机**(交审计):无选区→页内选区→工具条操作→清;
  跨格:滚动中选区保持(锚定根动态跟随)/跨页拖选→拒绝+toast/
  选区→zoom 变→选区失效清(现状核对)/选区→页回收(选区所在页
  滚出回收窗→选区清空——防悬空锚)。
- INV-14 面消解声明:SelectionLayer 单实例=document 监听单份(W2)。

**─ 生命周期层 ──**
- 不做:跨页选区创建/选区持久化。

**─ 文化层 ──**
- 测试:SelectionLayer 组件测试(**新文件** tests/unit/renderer/
  selection-layer.test.tsx 入锁——W7 修:非受锁扩)+anchor-locate.test
  (受锁扩::153 限定回归);e2e 批 2:reader-text.spec :140-216(划选→
  重开原位)/ai-notes-section.spec :212-222/lineage.spec :497-505。
- **文件清单**:SelectionLayer.tsx(改)/anchor-locate.ts(改·:153)/
  tests/unit/renderer/selection-layer.test.tsx(新入锁)/
  tests/unit/renderer/anchor-locate.test(受锁扩)/三个 e2e spec
  (受锁扩批 2)。
- 验收:标注重开原位全量兼容(±2px 归一保持);跨页选区 toast。

---

## SR2-F-03 滚动进度回写恢复与键位迁移

`// b3: P7-F`(注册文件=src/renderer/features/reader/scroll-progress.ts 新建)

**─ 行为层 ──**
- **滚动位置状态机 v2(宪法前置,补格版)**:
  | 态 | 迁移 | 断言 |
  | --- | --- | --- |
  | idle | 用户滚动→scrolling | — |
  | scrolling | 静置>2000ms(沿用)→pending | 防抖窗内不回写 |
  | pending | 定时到→writing | — |
  | writing | 回写 setPage(id,page,**{scroll:'none'}**)→idle;**writing 中用户又滚→直接回 scrolling(新格,W2)** | 回写用 'none' 不触发程序滚动(B1) |
  | restoring | 程序滚动(恢复/跳页/locate)中;**用户接管判定=非 scroll 的用户输入信号(wheel/keydown/pointerdown 三类——程序 scrollToPage 自发的 scroll 事件不算,W-B 写死)→取消程序目标转 scrolling** | 用户接管 |
  | loading | 页列未就绪(F-01 onReady 前);就绪→restoring(执行恢复) | 就绪信号驱动 |
  - 跨格序列:滚动→切 tab→回(恢复记忆页)/滚动中关 tab(flushPending
    沿用 :209-215)/pending 中关 tab(立即 flush)/程序跳页与用户滚
    动竞态(**用户接管=W-B 三类用户输入信号,非 scroll 事件**)/回写
    竞 tab 切换(writing 前校验 activeId,失配丢弃——per-tab 记账)。
- 滚动→页回写:视口中心最近页纯函数;粒度=整数页(预裁 1);
  pendingProgress Record<paperId,page> 语义保持(B3)。
- 恢复:openPaper→loading→就绪(**就绪时夹取**——W-A)→
  scrollToPage(lastReadPage)。
- 键位迁移:PAGE_KEYS(:48-53)四键=滚动一步(一屏−一行重叠常量);
  preventDefault 保留(语义=统一滚动步长);空格=下滚一屏(新增,
  editable 避让既有);ctrl+wheel(:94-102)零触碰。
- **scroll-progress.ts 新模块**:状态机+回写纯函数+防抖;接口
  `createScrollProgress(deps:{getPaperId,getViewport,getPageBoxes,
  scrollToPage,setPage,saveProgress,now,timers})`——**per-tab:
  内部 Record<paperId,State>**(B3 修);时间全注入。

**─ 接口层 ──**
- reader.store.ts:防抖链(:163-197)拆至 scroll-progress,store 接线
  (425→净减);setPage 消费 scroll opts(F-01 已落)。
- ReaderPage.tsx:滚动容器 onScroll 接线+恢复装配(W6 补);≤250 保持。
- ReaderShortcuts.ts:PAGE_KEYS 滚动步+空格;头注 :47 兑现。

**─ 架构层 ──**
- 不变量登记:进度回写=视口中心最近页(纯函数+跨格单测);程序滚动
  用户接管(RESTORING 取消);双源区分(F-01 已登)。
- IPC/repo 零改动(saveProgress 沿用,零迁移)。

**─ 生命周期层 ──**
- 不做:页内偏移/云端/历史。

**─ 文化层 ──**
- 测试:scroll-progress 状态机**全格含新 writing-scroll 格+跨格五序列**
  (时间注入禁真 timer);最近页纯函数边界;reader-shortcuts.test
  (受锁扩:滚动步常量+空格+避让);reader.store.test(受锁扩:拆链
  后 per-tab 进度回归——B3 补);e2e 批 3:reader-text.spec :221-321
  (tab 序列进度语义)。
- **文件清单**:scroll-progress.ts(新)/reader.store.ts(改)/
  ReaderPage.tsx(改·装配)/ReaderShortcuts.ts(改)/
  tests/unit/renderer/scroll-progress.test.ts(新入锁)/
  reader-shortcuts.test+reader.store.test(受锁扩)/reader-text.spec
  (受锁扩批 3)。
- 验收:e2e 滚动→关→重开=恢复页;键位滚动步锚点断言。

---

## SR2-F-04 缩放重定义与收官 e2e

`// b3: P7-F`(注册文件=**tests/e2e/reader-scroll.spec.ts 新建**——W5 修:
收官=e2e 票,LG-05 先例)

**─ 行为层 ──**
- 缩放锚点:zoom 变化保持**视口中心内容不动**(中心内容比
  (scrollTop+vh/2)/总高 纯函数保持;PageColumn 内实现)。
- fit-width:公式(:129-135)分母改列宽基准;一次性 zoom 语义保持。
- 收官 e2e 全链(新 spec,渲染真实文本断言):离屏回收(canvas 计数
  上限断言)/进度恢复/标注原位兼容抽验/键位滚动步/缩放中心锚/
  INV-01 三层/ctrl+wheel 段迁移(:399-432)。
- 战役收官报告:成本账本+四票链完整性。

**─ 接口层 ──**
- PageColumn.tsx:zoom 锚点纯函数;ReaderToolbar 零 props 改(zoom 数值
  语义不变,W5);ZOOM_STEP/round2/夹取 [0.5,3](reader.store.ts:334)沿用。

**─ 架构层 ──**
- 不变量:缩放中心保持(纯函数+单测);INV-01 终审。

**─ 生命周期层 ──**
- 不做:持续 fit/手势 pinch。

**─ 文化层 ──**
- 测试:锚点纯函数单测(PageColumn 同宿主);reader-scroll.spec.ts
  (新入锁)+reader-text.spec 批 4(ctrl+wheel 段迁移)。
- **文件清单**:PageColumn.tsx(改·锚点)/tests/e2e/reader-scroll.spec.ts
  (新入锁)/tests/e2e/reader-text.spec.ts(受锁扩批 4)/
  docs/reports/2026-08-28_p7f-campaign.md(收官报告,非锁)。
- 验收:verify 全绿+e2e 全量;**用户走查**(滚动阅读体验视检——
  战役最终验收人=用户)。

---

## 机检兼容自查 v2

- id 正则 SR2-F-01~04/b3 指针 P7-F(ROADMAP 已裁决 ✓)/area 'reader'/
  owner strong。
- 依赖序:F-01→(F-02→F-03 串行:ReaderPage 装配共享+受锁 e2e 排他)
  →F-04。
- 注册文件四票各=主改/新建文件(骨架先建 N1/N3);F-04=e2e 注册
  (LG-05 先例)。
- PdfCanvas.tsx 拆分=「方案切换=删除旧方案」红线合规(旧文件删除)。
