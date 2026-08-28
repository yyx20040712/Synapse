# SR2-F-01 实现者报告(页列几何与懒渲染回收)

> 实现者子代理交付报告。主控简报=scripts/audits/f01-impl-brief.md;票面=
> PageColumn.tsx 头注五层规约+scripts/audits/p7f-ticketing-draft.md SR2-F-01 节。
> 开工技能清点:TDD 用(四档全走)/verification-before-completion 用(全链真退出码
> 落盘)/systematic-debugging 用(组件测试 DOM 不收敛排查——act flush 模式)/
> 其余工程技能不加载(票面即完整任务书,先例已锚定;不派发子代理、禁 git)。
> 配置自查:全程 node24 前缀(环境铁律),模型/思考等级由主控配置。

## 一、实现摘要(五段逐段)

- **段①页列就绪管线**:PageColumn effect([doc,totalPages])→逐页 getPage→
  view 尺寸数组(state 缓存单源;zoom 不入依赖——缓存乘法非重取)→占位盒
  全列(总高确定)→onReady;越界夹取=clampPageToColumn(scrollToPage 前哨,
  1 基夹 [1,totalPages]——store 侧 0 基夹取先于此生效,双层夹取)。
- **段②占位盒布局**:盒高=pageBoxHeight(size,zoom)(floor,与 canvas CSS 尺寸
  同口径);列宽=columnWidth(sizes,zoom)(最宽页×zoom,页列 mx-auto 居中);
  未渲染盒空白(仅几何占位)。页间距 gap-3(12px)。
- **段③懒渲染窗口**:IntersectionObserver 观察占位盒(data-page-box)→可见集
  (引用稳定去抖);渲染窗口=windowPages(visible±renderWindow);回收=
  recycledPages(距任一可见页≤recycleWindow 才保留);IO 未报可见时=顶部引导
  窗口 [1..1+renderWindow](首屏+jsdom 确定性,自裁 2)。渲染页=PdfPageCanvas+
  覆盖层(renderPage(no) render-prop);离屏卸载=React 卸载(canvas 移除)+
  PageFrame 卸载哨删 pageText 条目(ReaderPage 侧)。
- **段④层实例化分工**:TextLayer/AnnotationLayer/ReaderAiLayer 经 renderPage(no)
  每渲染页一套(props 零改);SelectionLayer 单实例挂锚定页盒(锚定页=可见页
  首报告;锚定根动态归 F-02——本单布局段留挂载位)。
- **段⑤双源机制+单页假设处遇**:reader.store setPage 增第三参
  {scroll?:'to'|'none'} 默认 'to'(五消费面 ReaderShortcuts 经 ReaderPage×2/
  ReaderToolbar onNavigate/OutlineAside/anchor-locate×2 零改);'to'→bump
  scrollRequest={paperId,page,seq};PageColumn 消费信号→页盒 scrollIntoView
  (block:'start'=盒顶);'none'→不 bump 不滚(INV-27)。ReaderPage :125 越界
  自愈已删;:116 量测改每页自量(onPageRender 时按 data-page-root 查该页盒量
  canvas,DPR 校准);pageText 单份→Record<页号,PageText>。

**布局态状态机**(交审计):
- 列级:loading(尺寸未齐/doc 置空)→ready(onReady);就绪后 zoom 变化不回
  loading(缓存乘法)。
- 页级:empty→rendering(PdfPageCanvas effect 发起)→rendered(onPageRender
  回报)→recycling(滚出回收窗→卸载:effect 清理 cancel 在途任务+PageFrame
  卸载哨删条目)→empty。
- 跨格:快速滚动(rendering 中滚出→cancel→回收);zoom 变化(盒高重算+渲染
  窗口重评估+PdfPageCanvas 重渲回报新盒)。

## 二、文件清单(票面+拆分连带)

| 文件 | 动作 | 说明 |
| --- | --- | --- |
| src/renderer/features/reader/PageColumn.tsx | 重写(注册) | 真身 248 行≤250;头注五层保留(压缩,自裁 12);data-ticket 保留(自裁 6) |
| src/renderer/features/reader/PdfDocProvider.tsx | 新建 | doc 生命周期上提+worker 配方+类型再导出单点(PDFDocumentProxy/RenderTask);98 行 |
| src/renderer/features/reader/PdfPageCanvas.tsx | 新建 | 每页渲染单元(effect/取消/DPR 原样,pageNo 固定)+PdfTextContent 族类型单源;153 行 |
| src/renderer/features/reader/PdfCanvas.tsx | **删除** | 方案切换红线(主控裁决 4) |
| src/renderer/features/reader/ReaderPage.tsx | 重构 | 页列装配/pageText Record/每页自量/SelectionLayer 挂载位/onReady 恢复;247 行≤250 |
| src/renderer/features/reader/reader.store.ts | 改 | setPage 第三参+scrollRequest 字段+头注 INV-27 签注 |
| src/renderer/features/reader/TextLayer.tsx | 改(连带) | import type 改自 PdfPageCanvas(1 行) |
| src/renderer/features/reader/OutlineThumb.tsx | 改(连带) | import type 改自 PdfDocProvider(1 行) |
| src/renderer/features/reader/OutlinePanel.tsx | 改(连带) | import type 改自 PdfDocProvider(1 行) |
| eslint.config.js | 改(受锁) | INV-16 白名单迁移 PdfCanvas→PdfDocProvider+PdfPageCanvas;message 同步 |
| docs/invariants.md | 改(非锁) | INV-16 文本同步(四文件);INV-27/INV-28 新登记 |
| tests/unit/renderer/page-column.test.tsx | 新建(入锁) | 14 用例(纯函数 5+组件 9),裸 describe always-active |
| tests/unit/renderer/reader.store.test.ts | 改(受锁扩) | 原块内+2 用例(第三参双源/夹取正交/seq 续增) |
| tests/e2e/reader-text.spec.ts | 改(受锁批 1) | :93-138 迁移多页(3 页 createMultiPagePdf+逐页滚动可见+INV-01 保持);DEPS 增 SR2-F-01 |
| locks/manifest.json | 更新 | 139→140(page-column.test.tsx 入锁) |

## 三、TDD 红证(首红输出留存)

- **轮 1 store**:tests/unit/renderer/reader.store.test.ts 扩 2 用例→首红
  `2 failed | 19 passed`(scrollRequest undefined)→实现→绿 21→**变异红证**:
  `opts?.scroll !== 'none'` 反转为 `===`(单 token)→恰中 2 新用例红/19 旧绿→
  cp 备份法还原→diff 空。日志:f01-red-store.log / f01-mutation-store.log。
- **轮 2 PageColumn**:page-column.test.tsx 首写→首红 `14 failed`(占位骨架无
  纯函数导出)→实现→14 绿(调试:jsdom 下就绪管线需 `await act(async render)`
  flush,vi.waitFor 不收敛——systematic-debugging 定位)→**变异红证**:
  引导窗口 `renderWindow + 1`→`renderWindow`(单 token)→恰中 2 用例(纯函数
  引导+组件初始渲染)红→还原 diff 空→回归 14 绿。日志:f01-red-column.log /
  f01-mutation-column.log。
- **轮 3 e2e 批 1**:新用例无守卫正向实跑(备份法:临时 skipIfPending([])→
  `1 passed (1.6s)`→还原 diff 空)→**断言变异红证**:断言串 `P2`→`P2X-不存在
  的文本`→`1 failed`→还原 diff 空。日志:f01-e2e-newcase.log /
  f01-mutation-e2e.log。全部还原均 cp 备份法(禁 git checkout,未提交实现
  防抹)。

## 四、测试证据(真退出码)

| 关卡 | 结果 | 证据 |
| --- | --- | --- |
| quality:check | exit 0(无占位/无乱码/无跨域/行数合规) | f01-impl-verify.log |
| tickets:check | **exit 1——唯 SR-RDR-02 file 悬空(见疑虑 1,主控域)** | f01-impl-verify.log |
| locks:check | exit 0(140 同步) | f01-impl-verify.log |
| lint | exit 0 | f01-impl-verify.log |
| typecheck | exit 0 | f01-impl-verify.log |
| test | exit 0:**91 文件 677 用例**(基线 90/661+新增 1 文件/16 用例) | f01-impl-verify.log |
| build | exit 0 | f01-impl-verify.log |
| e2e 全量(test:e2e) | **exit 0:19 passed+2 skipped(1.0m)** | f01-impl-e2e.log |

- `npm run verify` 整链 exit=1,**唯一红=tickets:check**(SR-RDR-02 指向已删
  PdfCanvas.tsx);链断后的 locks/lint/typecheck/test/build 已逐项单独取证全绿
  (等价覆盖 verify 全链)。
- e2e 2 skipped=reader-scroll.spec(F-04 骨架守卫)+批 1 新用例(依赖
  SR2-F-01 翻 done,守卫语义正确);批 1 新用例的无守卫正向实跑已单独取证
  (f01-e2e-newcase.log 1 passed)。
- **中间态可用性(验收线)**:既有标注链 e2e 三用例(划选高亮重开原位/下划线
  2px 实条/备注色块)+P7-B/P7-A/P7-C 全绿=可滚动阅读+单页内划选标注正确的
  装配级证明;新用例=多页逐屏滚动可见+INV-01 保持。

## 五、locks 实录

- 轮次纪律:轮 1 完成即 apply(139);轮 2-3 全程 unlock 工作态。
- 收口:`locks:generate`(140 条——新增 tests/unit/renderer/page-column.test.tsx
  入 manifest)→`locks:apply`(已锁定 140 个文件,manifest 记录 140 条)。
  日志:f01-locks-generate.log / f01-locks-apply.log;locks:check exit 0。
- 受锁变更:eslint.config.js/reader.store.test/reader-text.spec(随单
  [locked-change],主控提交时携尾注)。

## 六、自裁申报(实现者超票面/裁量决定,全部申报)

1. **props 扩展**:票面 props 清单外增 `onError`(渲染失败可见 INV-02 硬需)
   +`onVisibleChange`(票面「布局段给 SelectionLayer 留挂载位」的落地通道)。
2. **初始引导窗口**:IO 未报可见时渲染 [1..1+renderWindow](首屏不闪空+jsdom
   确定性);IO 首报后即正常窗口语义。
3. **onReady 恢复链 F-01 版**:onReady→setPage(tab.page)(同页 setPage 亦 bump
   scrollRequest)→程序滚回该页盒顶。理由:openPaper hydration 落 lastReadPage
   但无信号,不滚则重开文献回第 1 页——既有 e2e「重开仍在原位」(离页标注
   可见性)直接回归。F-03 完整化为状态机(loading→restoring)。
4. **SelectionLayer 中间态挂载位**=可见页首报告的页盒(renderPage(no) 内
   no===anchorPage 条件渲染——单实例语义=任一时刻仅一份+document 监听单份);
   锚定页内划选标注正确,其他可见页划选暂不弹工具条(动态锚定归 F-02)。
5. **PdfPageCanvas 返回结构**:单 canvas 元素(原外层 flex justify-center 包装
   div 移除——居中改由页列页根 mx-auto w-fit 承担;渲染 effect/取消/DPR 配方
   逐行原样)。覆盖层叠放链:页盒>页根(w-fit)>canvas+renderPage 覆盖层
   (absolute 相对页根,与原页根布局语义等价)。
6. **data-ticket 保留**(AI-08/09/10/LG-03 四先例):PageColumn loading/ready
   根容器持 `data-ticket="SR2-F-01"`(真实现上的标记,非空占位组件)——
   check-tickets 规则 4 的 open 期要求;**翻 done 时主控收口移除**(规则 4b)。
7. **页根 DOM 查询用 document.querySelector**(`[data-page-root="${no}"]`):
   ReaderPage 量测/页根获取通道(anchor-locate.ts :161 同款先例;单窗口单
   active tab 下全局唯一)。
8. **测试形态**:page-column.test 的 mount=`await act(async () => render)`
   (flush 就绪管线——jsdom 下 vi.waitFor 不收敛,debug 实证);jsdom 无 canvas
   →getContext stub null(渲染单元防御分支短路,e2e 锚真实渲染)。
   IS_REACT_ACT_ENVIRONMENT 显式置 true(异步 setState 断言契约)。
9. **INV-16 表述**:白名单「三文件」→「四文件」(PdfCanvas 一拆二;类型再导出
   单点:PDFDocumentProxy/RenderTask→PdfDocProvider,PdfTextContent 族→
   PdfPageCanvas);eslint message 同步。PageColumn 自身的 pdfjs 类型消费循
   PdfDocProvider 再导出(lint 实证拦截 type 直连后改道)。
10. **fitWidth 保持单页盒语义**(锚定页盒宽/zoom;24px padding 扣除沿用)——
    列宽基准重定义明归 F-04,未提前实现。
11. **头注压缩**:PageColumn 头注 63→44 行/ReaderPage 头注同步压缩(细节以
    p7f-ticketing-draft.md SR2-F-01 节为完整票面存档)——quality 机检行数
    口径=物理行含注释,组件 ≤250 硬约束下的必要压缩。
12. **删减面 diff 自查**(git status):12 改+1 删(PdfCanvas.tsx)+3 新增,全部
    在票面清单+拆分必然连带(TextLayer/OutlineThumb/OutlinePanel 各 1 行
    import;注释中的「PdfCanvas」字样=历史描述性文本,非代码引用);
    dev-launch.cmd/dist_new/ 为工作区环境残留,未触碰未纳入。
13. **【W4 门一回炉补录】快捷键装配等价重构未申报**:ReaderPage 的
    prevPage/nextPage 两个独立闭包重构为 jump(d) 共用辅助(±1 参数化,
    zoomStep/undo 不变)——行为等价(setPage(t.page∓1) 逐位对齐),当轮
    漏列自裁项,本节补录。

## 七、疑虑

1. **tickets:check 结构红(主控域,需收口动作)**:SR-RDR-02(done)注册文件
   指向已删的 src/renderer/features/reader/PdfCanvas.tsx——「删除旧文件」
   (主控裁决 4/方案切换红线)与「工单文件必须存在」(check-tickets 规则 1)
   的时序冲突,实现侧无解(registry 主控单写,禁读改)。**建议主控收口动作**
   :翻 SR2-F-01 done 时同批将 SR-RDR-02 条目 file 更新为
   src/renderer/features/reader/PdfPageCanvas.tsx(渲染单元直系继承者,summary
   「pdf.js canvas 渲染封装(v4 API)」仍准确)或按册移除;更新后 verify 整链
   绿(其余关卡已逐项取证)。ENR-01 先例支持此类结构性冲突停手申报——本单
   因实现完备且证据齐全而未停手,选择交付+申报,请门审/主控裁决。
2. **PageColumn.jsx 行数 248 贴线**:F-02/F-03/F-04 还有装配扩展面(锚点/
   回写/缩放锚),后续若再增建议主控预裁拆分(如几何纯函数独立文件——本单
   因票面文件清单封闭未拆)。
3. **reader.store.ts 头注状态行**仍标 [SR2-TABS-01] open/strong 文案(既有
   状态行未动——其状态归属与头注更新是主控/后续工单事务)。
4. **e2e 批 1 用例在翻 done 前 skip**(守卫语义),正向证据=备份法无守卫实跑
   (f01-e2e-newcase.log);主控翻 done 后 e2e 全量将含此用例,建议收口时
   重跑确认。

---

## 八、门一回炉 1 轮处置记录(2026-08-28,0B/4W+N PASS 附回炉)

| 项 | 处置 | 证据 |
| --- | --- | --- |
| W1 编号撞号 | invariants.md 已由主控重编 INV-29(双源区分)/INV-30(canvas 渲染窗口绑定);实现侧同步:reader.store.ts 3 处、PageColumn.tsx 6 处、page-column.test.tsx 3 处、reader.store.test.ts 1 处(受锁走 unlock 流程);grep 核对 reader 域 INV-27/28 零残留(lineage/ENR 域 INV-27/28 为 LG-01/ENR-01 原主合法引用,未触碰) | grep 零残留输出(本节上下文) |
| W2 就绪管线无 catch | PageColumn load() 补 .catch→onErrorRef 上抛(`页列尺寸获取失败:…`,INV-02)+sizesError 终态(error 占位,不再 loading;doc/totalPages 变化重置);TDD 四档:新用例首红(1 failed\|15 passed)→实现→绿 16→变异红证(错误消息 token `页列尺寸获取失败`→`页列获取失败`,恰中 1 用例红)→还原 diff 空 | f01-red-r1-w2w3.log / f01-mutation-r1-w2.log |
| W3 卸载哨不删 pageRoots | ReaderPage dropPageText→dropPageState(pageTexts 与 pageRoots 同删,泛型 del 共用;PageFrame 头注同步);page-column.test 补机制锚用例(Probe 卸载哨:滚出回收窗→renderPage 内容卸载通知触发,[1,2,3,4] 全收)——即绿用例以变异红证其能失败(rendered.has(no)→true 恒渲染,恰中 6 回收族用例红)→还原 diff 空 | f01-mutation-r1-w3.log |
| W4 申报补录 | 自裁节第 13 项补录 jump(d) 等价重构(见上) | 本报告 §六.13 |

**回炉后证据(覆盖原日志)**:
- `npm run verify` **exit 0 全链绿**(quality/tickets/locks/lint/typecheck/test/build)——
  原「疑虑 1」(SR-RDR-02 file 悬空致 tickets 红)已由主控门后同批处置闭合,
  tickets:check 通过(注册表与代码一致)。f01-impl-verify.log(覆盖)。
- 单测 91 文件 **679 用例**(回炉前 677+W2/W3 两用例)。
- `npm run test:e2e` **exit 0:19 passed+2 skipped(1.0m)**(F-04 骨架与批 1
  新用例守卫 skip 语义不变)。f01-impl-e2e.log(覆盖)。
- locks:generate+apply 140(受锁变更:page-column.test.tsx/reader.store.test.ts
  回炉改动重入 manifest;[locked-change] 随单)。
- 行数复核:PageColumn 247/ReaderPage 247(≤250 物理行,quality 机检过)。
- 原疑虑 2(PageColumn 248 贴线)在 W2 改动后先超(255/253)再压回 247——
  F-02~04 装配扩展前拆分建议维持。
