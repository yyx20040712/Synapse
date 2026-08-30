# F-ARCH3 门一(异基座对抗深审)报告

## 0. 总览

| 级别 | 数量 | 摘要 |
|---|---|---|
| B(阻塞) | 0 | 未发现必须修复才能合入的行为偏差 |
| W(警告) | 4 | 见问题列表 |
| N(正常) | — | 七件迁入逐行等价、事件时间线等价、INV-16 合规、接缝被动 |

---

## 1. 重构等价性逐面推演

### 1.1 七件迁入是否逐行等价 —— 是

逐行比对 diff 中删除面(ReaderPage)与新增面(PagesOverlay):

| 件 | 原 ReaderPage 代码 | 新 PagesOverlay 代码 | 判定 |
|---|---|---|---|
| ① PageText | `interface PageText { page; text; box }` | 同原文 | 逐行等价 |
| ② PageFrame | `useEffect(() => () => onRecycle(no), [no, onRecycle])` | 同原文 | 逐行等价, 含依赖数组 |
| ③ 两个 useState | `useState<Record<number, PageText>>({})` / `useState<Record<number, HTMLElement>>({})` | 同原文 | 逐行等价 |
| ⑤ handlePageRender | `querySelector`→canvas→`getBoundingClientRect`→`Math.round`→写两表; `pageRoots` 短路 `prev[no]===pageRoot ? prev : ...` | 同原文 | 逐行等价 |
| ⑥ dropPageState | `useCallback([])` + 泛型 `del` + `delete next[no]` | 同原文; `useCallback` 原样保留 | 逐行等价 |
| ⑦ renderPageLayers | 挂载条件 `pt!==undefined`/`pr!==undefined`/恒挂 `pr??null`; `page=no-1`; `viewportScale=zoom` | 同原文 | 逐行等价 |

④换文献 effect 为唯一非逐行迁入项, 拆成「PagesOverlay 两表清空」+「ReaderPage setPdfDoc(null)」两个同键 effect——**等价性成立**, 理由见 1.2。

### 1.2 换文献双效应执行序(强制审项:事件时间线逐帧推演)

**旧结构**(单 effect):
```
fileUrl A→B
帧1: ReaderPage 渲染, pageTexts/pageRoots 旧值仍在, PageColumn 用旧文本
帧2: passive effect 阶段:
  - PageFrame cleanups(若有卸载页) → dropPageState 逐条删(del 幂等)
  - ReaderPage effect create: setPageTexts({}) → setPageRoots({}) → setPdfDoc(null)
帧3: 统一渲染: 两表空, pdfDoc=null
帧4: PdfDocProvider 加载 B 完成 → setPdfDoc(docB) → 渲染
```

**新结构**(双 effect):
```
帧1: 同旧(PageColumn 旧文本可见一帧——与旧等长, 非新增)
帧2: passive effect 阶段(React 18 后序遍历, 子先父后):
  - PagesOverlay(子) effect create: setPageTexts({}) → setPageRoots({})
  - ReaderPage(父) effect create: setPdfDoc(null)
帧3/4: 同旧
```

判定: `setPageTexts({})`→`setPageRoots({})`→`setPdfDoc(null)` 三个 setState 的**提交顺序**(即对下一渲染的可见性顺序)完全相同; React 18 被动效应同步执行, 中间无帧插入; setState 入队经自动批处理合并为同一提交。**等价**。ReaderPage 中新增注释「子效应先于父效应」是对 React 18 树后序排列的事实陈述, 正确。

### 1.3 fileUrl null→非 null 切换的组件树换挂(强制审项)

主控预裁 5 称「主区只在 fileUrl 非 null 时渲染」。diff 无法直接看到 ReaderPage 的 return 分支, 但:**typecheck 通过**这一事实锁死了该预裁——PagesOverlay 的 `fileUrl: string`(非 null)与 `doc: PDFDocumentProxy`(非 null)若在运行时收到 null 会同时违反类型; PdfDocProvider 的 render-prop 类型约束使 `doc` 为 null 时不传入 PagesOverlay(或空态分支不渲染 mainContent)。因此:

- null→非 null: PagesOverlay **全新挂载**, 两表初始 `{}`; 挂载后 `[fileUrl]` effect 对空对象赋 `{}`(与旧 ReaderPage 挂载时 effect 行为相同, 一次无害重渲染)。
- 非 null→null: PagesOverlay 卸载, 状态销毁; 旧结构 effect 清两表+setPdfDoc(null)——结果等价(组件树销毁与显式清空在可观察行为上无法区分, 且卸载 cleanups 仍会跑)。

**不确定项**: 无法从 diff 直接验证 ReaderPage return 分支与 PdfDocProvider 内部 null 处理, 上述结论依赖 typecheck 通过+预裁 5。若主控可查 PdfDocProvider 源码复核。

### 1.4 挂载条件与 props 传导链(zoom·annotations→覆盖层)

- zoom: `ReaderPage 从 store 读取` → props → `PagesOverlay` → 闭包捕获 → `renderPageLayers` → `TextLayer viewportScale`。与旧路径(ReaderPage 闭包直读)相比多一层, 函数身份每渲染新建, 与旧行为一致。
- annotations: 同路径, 经 props → renderPageLayers 闭包 → `AnnotationLayer annotations`。
- handlePageRender/onPageRender: PagesOverlay 内读写同源, PageColumn 收到的新函数身份每渲染新建(无 useCallback 新增)——与主控预裁 4 一致。

### 1.5 INV-16 类型再导出

PagesOverlay.tsx:10-15:
```ts
import type { Annotation } from '@shared/models/annotation'
import type { PDFDocumentProxy } from './PdfDocProvider'
import type { PdfTextContent } from './PdfPageCanvas'
import { PageColumn, type PageScrollRequest } from './PageColumn'
```
四个类型来源全部走再导出, **零直连 pdfjs-dist**(含 import type)。typecheck 全绿佐证再导出存在。✓

---

## 2. 问题列表(W 级)

### W1. 用例⑤对「pageRoots 引用相等不重写」锁定力不足(恒真/弱锁)

**证据**: tests/unit/renderer/pages-overlay.test.tsx:195-210(用例⑤)

```ts
it('⑤ pageRoots 引用相等不重写：同 DOM 元素二次回报→层收到的 pageRoot 仍是同一元素；换元素回报→引用更新', () => {
  const first = makePageRoot(1, 612, 792)
  mount(makeOverlay())
  report(1, makeText('第一次回报'))
  expect(probe.annotationLayer?.pageRoot).toBe(first)      // A
  report(1, makeText('第二次回报'))
  expect(probe.annotationLayer?.pageRoot).toBe(first)      // B
  first.remove()
  const second = makePageRoot(1, 612, 792)
  report(1, makeText('第三次回报'))
  expect(probe.annotationLayer?.pageRoot).toBe(second)     // C
})
```

**对抗推演**: 若将 PagesOverlay.tsx:48 的短路 `prev[no] === pageRoot ? prev : ...` 摘除, 改成无条件 `{ ...prev, [no]: pageRoot }`——用例⑤依然全绿(A/B/C 均不受影响, 因为 `pageRoot` 变量每次都来自同一 DOM 查询, 值恒等于 `first`, 断言 B 锁的是「值相同」而非「引用未重建」)。**该用例对目标行为不敏感**。

**佐证**: 实现者报告自裁申报 2 已承认「内部对象身份不可黑盒观测」, 但申报段落称「⑤落为 toBe 身份断言」——实际该断言在无短路实现下同样通过, 申报低估了问题的敏感性。

**影响**: 票面文化层要求⑤锁「引用相等不重写(防无谓重渲染)」, 未达成。该行为在当前代码中经 React 18 批处理(同批 setPageTexts 必然触发重渲染)本就无外部可观测差, 属测试设计局限, 不阻塞合入。**建议**: 主控可考虑补变异 M5(摘短路)并接受必然绿, 或删除该用例的⑤宣称并如实降级。

### W2. mock 桩未暴露 onReady/onError/scrollRequest 透传——透传盲区

**证据**: tests/unit/renderer/pages-overlay.test.tsx:42-49

```ts
PageColumn: (props: {
  onPageRender: ...
  renderPage: (no: number) => JSX.Element
}) => {
```

桩 props 类型仅含 `onPageRender`/`renderPage`, 九 props 中其余七个(doc/totalPages/zoom/scrollContainerRef/onError/onReady/scrollRequest)的透传**未被任何断言锚定**。若实现漏传 onReady(handleColumnReady)或 onError(handlePdfError), 本测试全绿。仅靠 e2e 兜底。

**影响**: 单测覆盖声明与票面「九 props 全透传」要求之间存在未锚定区; e2e 29/29 全绿(报告转述)证明实际透传正确, 故为 W 级。

### W3. e2e reader-scroll 用例数字矛盾(票面 18 vs 报告 2), 不确定

**证据**: 
- 票面 f-arch3-ticket.md 行为等价面:「e2e reader-text 11 用例+reader-scroll 18 用例全绿」
- 实现者报告: 「reader-text 11/11、reader-scroll 2/2 全过」

两者数字矛盾(18≠2); 且总量 29 = 11+18 时无法容纳实现者报告中的 corpus-export(首跑 28+1fail)。若实际 reader-scroll 为 2, 则票面「18」为笔误; 若实际为 18, 则实现者报告的「2/2」不完整。**raw 文件不在 diff 内, 门一无法复核**。此项不确定, 标记待主控核对 scripts/audits/f-arch3-impl-e2e.raw.txt 中 reader-scroll 实际用例数。

### W4. 变异红证/verify/e2e raw 文件均不在 diff 内, 证据依赖报告转述

实现者列出的 8 个 .raw.txt 证据文件均为新增未跟踪文件, 本 diff 不包含其内容。门一无法独立验证:
- M1~M4 的实际失败用例(仅报告转述「1/1/3/3 failed」)
- verify 各关口 exit code
- e2e 复跑 29/29 的实际输出

单测层面通过代码推演已确认 M1~M4 真咬行为(见 §3), 但 raw 文件的可复核性缺陷如实标记。

---

## 3. 测试质量与变异红证复核

### 3.1 五用例有效性

| 用例 | 锁的行为 | 恒真? | 判定 |
|---|---|---|---|
| ① 回报前不挂层 | TextLayer/AnnotationLayer 挂载条件 | 否(若条件反掉/无条件即红) | 有效 |
| ② 回报后写入+量测 | Math.round(612.4→612, 792.6→793)+page=no−1+pageRoot 元素 | 否(摘 setPageTexts 即红, 见 M3) | 有效 |
| ③ PageFrame 卸载两表同删 | W3/INV-30 | 否(摘 delete 即红, 见 M1) | 有效 |
| ④ fileUrl 变化两表清空 | 换文献效应键 | 否(摘 effect 体即红, 见 M2) | 有效 |
| ⑤ 引用相等不重写 | 内部短路 | **是(对目标行为不敏感, 见 W1)** | 弱锁 |

### 3.2 M1~M4 真咬行为复核(代码推演)

- M1 摘 `delete next[no]` → ③断言 C/D 复挂后层不复活 ⇒ 必然红 ✓
- M2 摘 effect 体 → ④fileUrl 变化后层仍在 ⇒ 必然红 ✓
- M3 摘 `setPageTexts` 写入 → ②A 断言 text-layer 存在先失败, 连带③④ ⇒ 3 failed 合理 ✓
- M4 AnnotationLayer 改无条件 → ①B 断言 annotation-layer 为 null 失败; 连带③D 复挂后层不消失 ⇒ 3 failed 合理 ✓

四个变异均落在真实行为面, 无「变异未咬到测试」的假红。

---

## 4. 头注与声明

- **ReaderPage「只装配」声明成立**: 收敛后 ReaderPage 保留面全部为装配/协调(路由/TabBar/Toolbar/SplitPane/SelectionLayer 挂盒/scroll-progress/快捷键/fitWidth/错误处理/信号过滤), 页面缓存注册表五件套已全部迁出。声明与实现已对齐。✓
- **头注无完整 import 语句原文**: 两文件头注均只写函数签名/类型来源描述(如「PDFDocumentProxy 经 PdfDocProvider」), 无 `import ... from 'pdfjs-dist'` 形态文本, 不触发 arch-scan 假边。✓
- **隐患(极小)**: ReaderPage 头注第 9 行「页面缓存注册表(pageTexts/pageRoots+覆盖层装配)归 PagesOverlay」中出现了标识符 `pageTexts/pageRoots`, 若 arch-scan 的假边模式按「头注含变量名即 import 沾边」匹配, 可能存在误报——但按票面描述「完整 import 语句原文」为准, 不构成违规。

---

## 5. 接缝(被动性确认)

| 接缝 | 状态 | 证据 |
|---|---|---|
| SelectionLayer 挂载盒 | 未动, 仍在 PdfDocProvider 之后兄弟位 | diff 主区 `<div ref={setSelectionMount} className="relative">` 保留 |
| scroll-progress 三口装配 | 未动, createReaderScrollProgress+useScrollProgressWiring 保留 | diff 无删除行触碰 |
| PdfDocProvider render-prop 割点 | 割点位置不变(仍在 ReaderPage), 仅子组件 PageColumn→PagesOverlay | diff ReaderPage.tsx 主区 |
| PageColumn 九 props | 全部透传, 顺序/值不变 | PagesOverlay.tsx:105-108 |

---

## 6. 已查安全面(≤5 条)

1. **七件迁入逐行等价**: PageText/PageFrame/pageTexts/pageRoots/handlePageRender(含 Math.round 与 pageRoots 短路)/dropPageState(含 useCallback([]) 原样)/renderPageLayers(含三层挂载条件)逐行比对无差异。
2. **换文献 effect 分拆等价**: 子(清两表)先于父(setPdfDoc(null))执行, 与旧单 effect 三连序的提交可见性一致; PageFrame cleanups 仍先于 effect create 执行(两结构序同)。
3. **INV-16 合规**: 四个类型来源全部经再导出; 零 pdfjs-dist 直连(含 import type); typecheck 通过。
4. **主控预裁 1/2/4**: PagesOverlay 包 PageColumn 成立(读写同源同居); PdfDocProvider 留 ReaderPage 成立(割点未动); 未新增 useCallback/useMemo(函数形态原样)。
5. **测试行为锁**: 用例①②③④均非