# F-ARCH3 票面:ReaderPage 职责膨胀拆分——PagesOverlay 页面缓存注册表下沉(纯重构)——五层规约

> 来源:AUDIT0 台账 F-ARCH3 [B→重构票](deepseek 架构审 B3 实锤,报告=
> scripts/audits/arch-review-ds.md;总报告=docs/audits/
> 2026-08-30_ds-supplement-arch-review.md)。F-01 头注声称「本组件只装配」
> 但页面缓存编排五件套(pageTexts/pageRoots/handlePageRender/dropPageState/
> PageFrame)仍在 ReaderPage——**声明与实现漂移**,churn 45 天 20 次全项目
> 第一=每个新阅读器行为都在此打补丁。本票=纯重构,**行为零变**。
> 中票三屋(ADR-0017)。LOOP 会话票——**不在 tickets/registry,禁触碰
> registry**。

## 行为层

### 拆分线(七件下沉,ReaderPage 收敛)

新组件 `PagesOverlay.tsx` 持「页面缓存注册表+覆盖层装配」,以下七件从
ReaderPage **原样迁入**(代码逐行保持,只换宿主):

1. `PageText` interface(页号+文本载荷+canvas CSS 盒,成对更新契约);
2. `PageFrame` 组件(渲染窗口内页的卸载哨,onRecycle 回收);
3. `pageTexts`/`pageRoots` 两个 useState(缓存注册表);
4. 换文献清缓存 effect(键 `fileUrl`,**只清 pageTexts/pageRoots**——
   `setPdfDoc(null)` 留 ReaderPage,pdfDoc 是 OutlinePanel 数据源=布局职责);
5. `handlePageRender`(PdfPageCanvas 渲染回报→querySelector
   `[data-page-root="${no}"]`→canvas[data-pdf-canvas]→getBoundingClientRect
   →Math.round 写 pageTexts 条目;pageRoots 引用相等不重写);
6. `dropPageState`(W3:两表同删);
7. `renderPageLayers` 覆盖层工厂(TextLayer 挂载条件 pt!==undefined/
   AnnotationLayer 挂载条件 pr!==undefined/ReaderAiLayer 恒挂
   pageRoot=pr??null;page 传 no−1;viewportScale=zoom;pageWidth/Height=
   pt.box)。

**PagesOverlay 内装 PageColumn**:渲染 `<PageColumn doc totalPages zoom
scrollContainerRef onPageRender={handlePageRender} onError renderPage=
{renderPageLayers} onReady scrollRequest />`(九 props 全透传)。读写同源
(onPageRender 写注册表/renderPage 读注册表)必须在同一组件内——这是
PagesOverlay 包 PageColumn 而非只提供工厂的原因。

**ReaderPage 收敛后保留**:打开路由(OPEN_PAPER_EVENT 两路)/空态分支/
TabBar/ReaderToolbar/SplitPane+OutlineAside 布局/SelectionLayer 挂载
(N4 稳定盒)/scroll-progress 装配(createReaderScrollProgress+
useScrollProgressWiring+三口接管)/快捷键/fitWidth(columnBasis 分母
+handleColumnReady)/handlePdfError/换文献 setPdfDoc(null)/sr-only 页态
播报/信号过滤 columnScroll(scrollRequest.paperId===paperId)。

### 行为等价面(禁破——每条都有既有测试或 e2e 锚)

- 换文献(fileUrl 变化)→pageTexts/pageRoots 清空(效应宿主迁移,键不变
  ——现 ReaderPage effect 与新 PagesOverlay effect 同键同序);
- PageFrame 卸载→两表条目同删(W3/INV-30);
- `fileUrl` 为 null 的空态期组件树不挂 PagesOverlay(null→非 null 切换=
  全新挂载,状态天然空——与现状「effect 清空」等价);
- zoom/annotations 变化→覆盖层重渲染链经 props 传导(现 ReaderPage 闭包
  直读→新 PagesOverlay props 传导,PageColumn 接到的 renderPage/onPageRender
  函数身份仍每渲染新建——**不新加 useCallback/useMemo**,保持函数形态
  原样,防行为漂移);
- e2e reader-text 11 用例+reader-scroll 2 用例全绿(最终裁判;全套 29 含
  其他 spec——门一 W3 勘误:票面原笔误「18」,主控 2026-08-30 亲验修正);
- 既有单测全绿:page-column/reader-page-open-race/scroll-converge/
  anchor-locate/selection-layer/annotation-layer/reader.store 族。

## 接口层

- 新文件 `src/renderer/features/reader/PagesOverlay.tsx`:
  `export function PagesOverlay(props: { doc: PDFDocumentProxy;
  fileUrl: string; totalPages: number; zoom: number;
  annotations: Annotation[]; scrollContainerRef: RefObject<HTMLDivElement |
  null>; scrollRequest: PageScrollRequest | null;
  onReady(basisWidth: number): void; onError(msg: string): void }):
  JSX.Element`
- **类型来源纪律(INV-16——ESLint 机器锚会拦,违者红)**:
  `PDFDocumentProxy` 经 `./PdfDocProvider` 再导出;`PdfTextContent` 经
  `./PdfPageCanvas`;`PageScrollRequest` 经 `./PageColumn`;
  `Annotation` 经 `@shared/models/annotation`(对齐 AnnotationLayer 现行
  import 形态)。**禁直连 pdfjs-dist(含 import type)**——白名单四文件
  不扩。
- ReaderPage 修改:删七件+相关 import(TextLayer/AnnotationLayer/
  ReaderAiLayer/PageColumn/PdfTextContent/PageFrame);PdfDocProvider
  render-prop 内改挂 `<PagesOverlay …/>`(割点不变——PdfDocProvider 留
  ReaderPage,onDocReady 喂 OutlinePanel 的布局链不动);
- 头注纪律:两文件头注按项目五段惯例重写(ReaderPage 头注删「F-01 页列
  几何/懒渲染回收归 PageColumn(本组件只装配)」段的缓存编排描述,改述
  为装配 PagesOverlay;PagesOverlay 头注写明本票编号+INV-30/W3 锚+七件
  契约)。**头注禁写完整 import 语句原文**(arch-scan 假边坑在档)。
- 零新依赖;零 shared/ipc 触碰;零 CSS 触碰;零 store 触碰。

## 架构层

- 分层单向不动(纯 renderer 特性内重组);
- 行数:ReaderPage 249→约 170/PagesOverlay 约 130(实现后自查,双远离
  500/250 红线);
- INV-16 白名单不扩(PagesOverlay 走再导出);
- 死代码即删:ReaderPage 迁走后不再被引用的 import/interface 全清
  (提交前 grep 核对)。

## 生命周期层

- 渲染链多一层组件(zoom/annotations 变化时 PagesOverlay 重渲染)——
  每 tab 渲染窗口内页数个位数,React reconcile 代价无感;无新 effect 语义
  (迁移的两个 effect 键与体不变);
- INV-30 头注表述的「PageFrame 卸载哨」宿主随迁——invariants.md 的
  INV-30 实现位置字段由**主控收口时**同步(实现者不碰 invariants.md,
  报告「疑虑」段确认即可)。

## 文化层(测试=TDD 红→绿→变异红证;新测试 always-active 不经 guardedDescribe)

- 新 `tests/unit/renderer/pages-overlay.test.tsx`(受锁文件,新文件可直接
  写;locks:generate+apply 归主控收口):**mock PageColumn**(vi.mock——
  桩组件渲染 props.renderPage(no) 并把 props.onPageRender 暴露给测试;PageColumn
  自身行为已由 page-column.test 锁定,本票不重复锁)。jsdom 手工造
  `[data-page-root]`+`canvas[data-pdf-canvas]` DOM 片段供 handlePageRender
  量测。用例:
  ①回报前 renderPage(no) 返回无 TextLayer/AnnotationLayer(pageTexts 空,
    挂载条件锁);
  ②onPageRender(no, text) 回报后(canvas DOM 在位)→条目写→
    renderPage(no) 挂 TextLayer(page 传 no、viewportScale=zoom、
    pageWidth/Height=box)+AnnotationLayer(page=no−1、pageRoot=
    data-page-root 元素)+ReaderAiLayer(page=no−1);
  ③PageFrame 卸载(把 renderPage 返回元素卸载)→两表条目同删
    (再 renderPage(no) 层消失);
  ④fileUrl 变化(rerender 新 fileUrl)→两表清空(换文献);
  ⑤pageRoots 引用相等不重写(同 DOM 二次回报不换引用——防无谓重渲染)。
- **e2e 全量**(收口裁判,须先 build):`npm run test:e2e` 29 用例全绿,
  落盘 .raw.txt;
- 全量 vitest 绿(禁裸 npx vitest,用 npm run test);
- 变异红证(各落盘 .raw.txt,文件备份法 cp 还原,禁 git checkout;锚点
  须带足够上下文——「注释行+代码」组合锚,防首撞别处):
  M1 摘 dropPageState 回收(del 不再删条目)→③红;
  M2 摘换文献清缓存 effect 体→④红;
  M3 handlePageRender 摘 setPageTexts 写入→②红;
  M4 AnnotationLayer 挂载条件改无条件(pr 缺席也挂)→①红。
- 受锁面:仅新增测试文件(收口 locks 归主控);**实现者禁跑 locks 命令**。

## 基线数字(自检参照)

verify=112 文件 942 用例全绿 / locks 186 / e2e 29。**本机 node 默认 v25
必红(webstorage 污染在档)——一切 node/npm 命令前缀
`export PATH="/d/nodejs24:$PATH"`**。

## 主控已预裁项(门一可攻击,推翻需更强依据)

1. **PagesOverlay 包 PageColumn**(render-prop 割点在 PdfDocProvider 内侧
   不变):onPageRender(写)与 renderPage(读)读写同源必须同居一组件——
   deepseek B3 建议形态的落地方式;只提供「工厂 hook」不成立(状态仍悬于
   ReaderPage=没拆);
2. PdfDocProvider 留 ReaderPage:pdfDoc 句柄消费方=OutlineAside(布局槽),
   拆进 PagesOverlay 反而要 onDocReady 穿两层回调;
3. mock PageColumn 测缓存注册表:PageColumn 行为已锁(page-column.test
   15+ 用例),组件测试重复真挂 PageColumn=重复锁+jsdom IO 桩成本,无增益;
4. 函数形态原样迁(不新加 useCallback/useMemo):纯重构零行为变纪律,
   重渲染开销由生命周期层论证无感;
5. 换文献清缓存 effect 在 PagesOverlay 挂 [fileUrl](组件实例随主区常驻,
   fileUrl 不会在组件挂载期间变 null——主区只在 fileUrl 非 null 时渲染)。
