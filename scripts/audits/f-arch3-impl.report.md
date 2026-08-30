# F-ARCH3 实现者报告——PagesOverlay 页面缓存注册表下沉（纯重构，行为零变）

> 工单来源：scripts/audits/f-arch3-ticket.md（LOOP 会话票，不在 tickets/registry）。
> 实现者子代理（ADR-0017 三屋）；本报告=⑥ 报告契约全文。

## 开工记录（技能清点——宪法会话开工纪律）

- test-driven-development：**用**——票面强制 TDD 红→绿→变异红证，本票全程照此执行。
- verification-before-completion：**用**——verify/各关口真退出码落盘（见下）。
- systematic-debugging：**备用未启用**——全程无卡点（唯一非绿项 locks:check 为票面预裁的主控收口面，非缺陷）。
- javascript-testing-patterns：**不用**——先例池 page-column.test.tsx 已给完整组件测试形态（createRoot+act+jsdom+vi.hoisted mock），直接沿用，无新形态需求。
- subagent-driven-development：**不用**——本人即实现者子代理，门一/门二归独立子代理。
- 其余前端/后端/运维/文档类技能：**不用**——纯 renderer 特性内单组件拆分，无对应工作面。

## 实现摘要

- 新建 `src/renderer/features/reader/PagesOverlay.tsx`（122 行）：七件自 ReaderPage **逐行原样迁入**
  （PageText 接口/PageFrame 卸载哨/pageTexts+pageRoots useState/换文献清缓存 effect（键
  [fileUrl]，只清两表）/handlePageRender/dropPageState（useCallback 原样保留）/
  renderPageLayers 覆盖层工厂）；组件内装 PageColumn，九 props 全透传（doc/fileUrl/
  totalPages/zoom/scrollContainerRef/onPageRender=handlePageRender/onError/renderPage=
  renderPageLayers/onReady 直传/scrollRequest）。函数形态原样（未新增 useCallback/useMemo
  ——主控预裁 4）。类型再导出纪律（INV-16）：PDFDocumentProxy 经 ./PdfDocProvider、
  PdfTextContent 经 ./PdfPageCanvas、PageScrollRequest 经 ./PageColumn、Annotation 经
  @shared/models/annotation——零直连 pdfjs-dist。
- 改 `src/renderer/features/reader/ReaderPage.tsx`（249→197 行，+15/−67）：删七件+死 import
  （TextLayer/AnnotationLayer/ReaderAiLayer/PageColumn 值导入/PdfTextContent/useCallback/
  ReactNode）；PdfDocProvider render-prop 内改挂 `<PagesOverlay …/>`（割点不变，PdfDocProvider
  留 ReaderPage——主控预裁 2）；换文献 effect 收敛为仅 `setPdfDoc(null)`（两表清空归
  PagesOverlay 同键子效应——子效应先于父效应执行，两表清空仍先于 setPdfDoc，与拆分前同序）；
  头注按五段惯例重写（F-01 段改述为「缓存注册表归 PagesOverlay，本组件只装配」，页内契约
  架构层段指向 PagesOverlay；无完整 import 语句原文——arch-scan 假边坑）。
- 新建测试 `tests/unit/renderer/pages-overlay.test.tsx`（243 行，受锁新文件，locks 登记归主控）。

## 文件清单

- 新增：`src/renderer/features/reader/PagesOverlay.tsx`（122 行，≤250 ✓）
- 新增：`tests/unit/renderer/pages-overlay.test.tsx`（243 行，≤500 ✓，always-active 不经 guardedDescribe）
- 修改：`src/renderer/features/reader/ReaderPage.tsx`（197 行，≤250 ✓；git diff --stat 仅此一追踪文件，无范围蔓延）
- 证据（新增未跟踪 .raw.txt ×8）：见下各节路径

## TDD 证据

- **首红（全量口径）**：`scripts/audits/f-arch3-impl-first-red.raw.txt`——PagesOverlay 不存在
  →import 解析失败（Failed Suites 1，exit=1）；既有 112 文件 942 用例全绿。
- **绿（全量口径）**：`scripts/audits/f-arch3-impl-green.raw.txt`——113 文件 **947** 用例
  （=942+5，锁测试计数不变）全绿，exit=0。

## 变异红证（文件备份法：cp 备份→变异→测→cp 还原→diff 确认空；全程未用 git checkout）

| 变异 | 内容 | 落盘路径 | 红的用例 |
|---|---|---|---|
| M1 | dropPageState 的 del 摘 `delete next[no]`（回收不删条目） | `scripts/audits/f-arch3-impl-mutation-m1.raw.txt` | **③**（PageFrame 卸载→两表同删）1 failed |
| M2 | 换文献清缓存 effect 体摘空 | `scripts/audits/f-arch3-impl-mutation-m2.raw.txt` | **④**（fileUrl 变化→两表清空）1 failed |
| M3 | handlePageRender 摘 setPageTexts 写入 | `scripts/audits/f-arch3-impl-mutation-m3.raw.txt` | **②**（回报→条目写入）为主，连带 ③④（均依赖写入）3 failed |
| M4 | AnnotationLayer 挂载条件改无条件（pr 缺席也挂） | `scripts/audits/f-arch3-impl-mutation-m4.raw.txt` | **①**（回报前不挂层）为主，连带 ③④（缺席断言）3 failed |

- 四次变异均为全量 `npm run test` 口径（非定向子集，无降档）；每次还原后 diff 备份=空
  （终端回显 M1~M4-restore-diff-empty）；备份文件已删除。

## verify 与 e2e

- **verify**：`scripts/audits/f-arch3-impl-verify.raw.txt`——quality/tickets 过后 `locks:check`
  红：**新增受锁文件 tests/unit/renderer/pages-overlay.test.tsx 未登记 manifest**（票面预裁：
  locks:generate/apply 归主控收口，实现者禁跑 locks 命令——此红=预期主控面，非缺陷）。
  locks 之后各关口补跑同文件追加：lint-exit=0 / typecheck-exit=0 / test-exit=0 / build-exit=0。
- **e2e**：`scripts/audits/f-arch3-impl-e2e.raw.txt`——首跑 28 passed +1 failed
  （`corpus-export.spec.ts:89 AI 语料导出全链` 60s 超时——语料导出链，与本票阅读器渲染面
  零交集；reader-text 11/11、reader-scroll 2/2 全过）。按票面 flake 条款**复跑一次全量：
  29 passed (1.3m)，exit=0**。

## 自裁申报（一切偏离票面的决定）

1. **测试对 TextLayer/AnnotationLayer/ReaderAiLayer 追加 vi.mock 桩**（票面 mock 面只点名
   PageColumn）：断言点是 prop 值（viewportScale/pageWidth/Height/page/pageRoot 元素身份），
   真组件无对应 DOM 可观测面；且真挂会拖入 pdfjs-dist 渲染链+api/client 顶层 window.api
   赋值+双 store（reader-page-open-race.test.tsx 申报的 jsdom 桩面同源）。三层自身行为各有
   测试锁（page-column/ai-annotation-layer/annotation 族），本票不重复锁——与主控预裁 3 同理
   扩展，mock 面最小化申报在测试头注。
2. **用例⑤的可观测面**：「引用相等不重写」的内部短路（`prev[no]===pageRoot ? prev`）因
   setPageTexts 同批写入（React 18 自动批处理合并为单次重渲染）在外部无渲染计数差可观测；
   ⑤落为「同 DOM 元素二次回报→层收到的 pageRoot 仍是同一元素（toBe 身份断言）+换元素
   回报→引用更新（对照组，短路不吞真实变化）」。锁的是行为相关契约（身份稳定+变化传导），
   纯内部对象身份不可黑盒观测——如实申报此局限。
3. **e2e 复跑命令形态**：复跑用 `npm run build` + `npx playwright test`（=npm run test:e2e
   内部两步原样），未整串重跑 test:e2e（避免二次 build）；口径等价，已申报。
4. **ReaderPage 换文献 effect 注释**新增一句同序说明（子效应先于父效应、与拆分前同序）——
   纯注释，无行为面。
5. **删减面 diff 自查**：ReaderPage 删除面=七件+死 import（grep 核对：PageFrame/pageTexts/
   pageRoots/PageText/handlePageRender/dropPageState/renderPageLayers/TextLayer/
   AnnotationLayer/ReaderAiLayer/PdfTextContent/useCallback/ReactNode 代码级引用零残留，
   仅头注/效应注释保留迁移去向描述）；保留面=票面「ReaderPage 收敛后保留」清单逐项在场
   （打开路由/空态/TabBar/Toolbar/SplitPane+OutlineAside/SelectionLayer/scroll-progress 装配/
   快捷键/fitWidth+handleColumnReady/handlePdfError/setPdfDoc(null)/sr-only 播报/columnScroll
   信号过滤）。

## 疑虑

- **INV-30 表述迁移确认**（票面生命周期层要求报告确认）：INV-30「PageFrame 卸载哨」宿主已
  随七件迁至 PagesOverlay（`src/renderer/features/reader/PagesOverlay.tsx` PageFrame+
  dropPageState）；invariants.md 的 INV-30 实现位置字段由**主控收口时**同步，实现者未触碰
  invariants.md。W3（两表同删）行为由用例③+M1 红证锚定。
- locks:check 红为主控收口面（新增受锁测试文件待 locks:generate/apply 登记 manifest）——
  收口时 `npm run locks:generate && npm run locks:apply` 后 verify 应全绿。
- e2e 首跑 corpus-export 超时判定为 flake（复跑绿+与本票面零交集）；若主控复跑再现，
  建议单独排查该 spec（与本票无关）。

## 回炉 1（门一 deepseek 裁决 0B/4W，主控核验下发 W1/W2；W3/W4 主控自处置）

### W1 处置：用例⑤宣称如实降级

- **对抗推演实证（门一）**：摘除 PagesOverlay 的 `prev[no]===pageRoot ? prev : …` 短路
  改无条件写后⑤仍全绿——toBe 断言锁的是值传导，短路与否值恒同。
- 处置：用例名「⑤ pageRoots 引用相等不重写」→「⑤ pageRoot 元素身份传导」；测试头注
  「回报写入（量测 Math.round+引用不重写）」段去掉短路宣称，改述为「pageRoot 身份传导
  （回炉 1-W1：内部短路优化无黑盒可观测面，不宣称）」；用例内二次回报处加注释
  「短路优化无黑盒可观测面（React 18 批处理），本用例不宣称锁定短路——只锁身份传导
  （回炉 1-W1）」。**断言本身未改**（身份 toBe+换元素对照组仍有效）。

### W2 处置：桩 props 类型扩九件+新增用例⑥「九 props 透传锚」

- PageColumn 桩与 probe.columnProps 的 props 类型由两件（onPageRender/renderPage）扩为
  九件全形（doc/totalPages/zoom/scrollContainerRef/scrollRequest/onPageRender/renderPage/
  onReady/onError）——type-only 引用（PDFDocumentProxy/RefObject），vi.hoisted 工厂安全。
- 新增用例⑥：从 probe.columnProps 断言 doc/totalPages(9)/zoom(1.5)/scrollContainerRef/
  scrollRequest 值传递（toBe 引用/字面值）+onReady/onError **函数身份直传**（toBe 传入
  函数）。fileUrl（④效应键）与 annotations（②层消费）不在 PageColumn 透传面，不涉。
- 变异敏感验证（文件备份法：cp 备份→变异→测→cp 还原→diff 空）：变异点=PagesOverlay
  return 的 PageColumn props 摘 `onReady={onReady}` 透传（PageColumn 侧 onReady 可选，
  摘除无类型报错——恰为「漏传静默」形态）→⑥红（1 failed / 948）。
- W2 变异红证：`scripts/audits/f-arch3-rework1-mutation.raw.txt`（exit=1，红的用例=⑥；
  还原 diff 空，备份已删，还原后 `onReady={onReady}` 在位 grep 复核）。

### 回炉 1 证据

- 全量绿：`scripts/audits/f-arch3-rework1-test.raw.txt`——113 文件 **948** 用例（=947+⑥）
  全绿，exit=0。
- 变异红证：`scripts/audits/f-arch3-rework1-mutation.raw.txt`（⑥ 红）。
- 改动面：仅 `tests/unit/renderer/pages-overlay.test.tsx`（243→285 行，≤500 ✓）；
  实现零改（PagesOverlay.tsx/ReaderPage.tsx 未动）。
