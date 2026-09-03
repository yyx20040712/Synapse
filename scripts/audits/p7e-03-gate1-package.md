# P7E-03 门一审材料包（页内高亮搜索）

## 0. 材料包构成与审查对象
- 工单=票面 §2；实现=diff（§3 完整 patch，含 9 新文件全文+4 修改件+registry 主控建单行）；实现者自报=§4。
- 基线：单测 136 文件/1163 用例→本单后 139 文件/1207 用例（主控已亲复跑新 3 文件 44 用例绿；全量分链自检 exit=0 在 §5）；locks 251（收口主控 generate+apply→255）；e2e 35→36（定向跑 1 passed）。
- tickets/registry.ts 的 +1 行=**主控建单动作**（P7E-03 open 行——控制面单写者纪律，非实现者改动）；docs/invariants.md 未动（INV-55 登记归主控收口）。
- 本票类型=**renderer 交互特性票**（store+异步逐页索引+DOM 量测+keymap 注册）——附加强制审项见 §6。

## 1. 宪法硬规则摘要（AGENTS.md 关键条目）
- 分层单向：renderer→window.api→ipc（本票纯 renderer 闭环零 IPC）；pdfjs-dist import 白名单（INV-16：仅 PdfDocProvider/PdfPageCanvas/TextLayer/CorpusExtractor 四文件——新文件只许 import type 自 PdfPageCanvas）。
- 状态机前置+态空间跨格序列交审（票面 S1~S12）；不变量登记制（INV-55 收口归主控）。
- 测试是锁定合约：禁改 tests/** 既有文件（本票 4 测试文件全新建，零既有测试改动——diff 可核）；每个测试必须能失败一次（先红证据 §5）；新测试 always-active 不经 guardedDescribe。
- 文件 ≤500 行（组件 ≤250）；禁新增依赖；grep 无 TODO/FIXME/placeholder；中文 UTF-8。

## 2. 票面（完整任务书——含 Design 裁决与态空间 S1~S12）
```markdown
# P7E-03 工单票面——页内高亮搜索（五层规约）

> registry：`P7E-03` / file `src/renderer/features/reader/ReaderToolbar.tsx` / area reader / owner strong / open
> 排程真相源=v31 §2 第 1 项（P7-E 余序首项：页内高亮搜索领头）。
> 开工记录：本票段技能清点延续本段开场（subagent-driven-development/TDD/
> verification-before-completion/systematic-debugging/loop-engineering 已加载；
> 门审外链 gate-call.py 在位）。

## ⓪ 出处（无出处默认不工单化——四链在档）

1. B1 报告 §3（docs/reports/2026-08-23_v2-blueprint-b1.md:47）：
   `ReaderToolbar.tsx:7,163（页内高亮搜索，占位禁用态已放）`。
2. ROADMAP §P7-E 内序第 3 位：「标签生命周期 > 拖拽导入 > 页内高亮搜索 > …」
   （docs/ROADMAP.md:384）。
3. ReaderToolbar.tsx:6-7+212-220：行为层注记「页内高亮搜索 v2——工具栏只放
   占位禁用态并 title 提示」+占位 span（title=「页内高亮搜索 v2 提供」）。
4. ReaderShortcuts.ts:38：「预留：页内高亮搜索快捷键（P7-E）」。

- **价值**：阅读中即时定位术语/公式出现位置——学术阅读高频动作；v1 全文检索
  走库侧 FTS（离当前阅读上下文远），页内搜索补齐「读中查」的最后一块。
- **依赖**：既有 TextLayer（pdfjs 4.10 每文本项恰一 span、按序——本票几何映射
  前提，pdf.mjs TextLayer#appendText 实证）；reader.store scrollRequest 程序
  滚动通道（INV-29 既有面复用）；零新依赖、零 IPC、零迁移。
- **风险**：①文本层异步入 DOM（layer.render() promise）——高亮量测须等
  span 落位（MutationObserver 先例=AnnotationLayer）；②全文档逐页
  getTextContent 是异步逐页循环——必须代际守卫（新查询顶替旧代）+searching
  态可见指示；③跨行匹配的矩形正确性（DOM Range 逐 span 取 clientRects，
  行盒≠字形带——v1 用行盒原样，band 收边不在本票面）。
- **验收**：见 ⑥。

## ① 行为层（态空间表先行——store+异步+用户输入）

### 主控 Design 裁决：索引全文档（文本域）+高亮仅渲染窗口（DOM 域）

- **采**：搜索索引=逐页 `doc.getPage(n).getTextContent()` 文本项拼接（全文档
  覆盖——未渲染页也可计数与跳转）；匹配矩形=渲染窗口内页的 **TextLayer DOM
  span** 上建 Range 取 clientRects（pdfjs 自己排版精确、零 transform 数学，
  item→span 索引 1:1 按 DOM 序）。未渲染页无高亮（匹配计数仍全局）——懒渲染
  架构的诚实投影。
- **否决**（item.transform 手算矩形）：pdf.js 文本矩阵换算易错且与官方层漂移；
  DOM Range 是标注链已验证的语言（annotation-anchor 同源先例）。
- **否决**（只搜渲染窗口页）：连续滚动懒渲染下计数随窗口变——非确定行为，
  拒。

### 纯函数（新文件 reader-search.ts，类型不 import pdfjs-dist——INV-16 白名单外）

```
buildPageText(items): { text: string; map: CharMapEntry[] }   // 拼接 items.str，
  //   hasEOL 项后插 '\n'（防跨行假匹配）；map=每字符 → {itemIndex, offsetInItem}
findInText(pageText, query): { start, end, itemRanges: {itemIndex, s0, s1}[] }[]
  //   大小写不敏感（两侧 toLowerCase）；空串/纯空白查询=空结果（调用方拒）
asSearchDoc(v: unknown): SearchDoc | null    // unknown→结构收窄（ReaderPage 持
  //   pdfDoc 为 unknown——SearchDoc={numPages, getPage(n)→{getTextContent()}}）
toPageRelative(clientRect, rootRect): {x,y,w,h}   // 视口盒→页根相对像素
spansForItems(pageRoot, itemCount): (HTMLSpanElement|null)[] | null
  //   .textLayer span 按序映射；数量不符→null（防御：该页不高亮只计数）
```

### 搜索 store（新文件 reader-search.store.ts，zustand）

```
态：'idle'（面板关）| 'open'（面板开）| 'searching'（在途）| 'done'（有结果集）
字段：query（输入框实时值）/ lastSubmitted / matches / activeIndex(0 基) /
  pageItems: Record<number, items[]>（仅含命中页——高亮映射输入）/ focusSeq
动作：open()（idle→open+focusSeq++）/ close()（任意→idle+全清）/
  submit(doc, q)（trim 空=no-op；generation++ 代际守卫；逐页 await；页失败=
  toast+回 open 保留 query）/ next()/prev()（activeIndex 回卷循环；触发
  翻页滚动——见下）/ reset()（换文档/换 tab 调用）
```

- **代际守卫**（INV-03 同族）：submit 每次自增模块级 generation；每页回传时
  代际不符→作废终止；reset/close 也使代际失效。
- **翻页联动**：next/prev 目标匹配页 ≠ 当前 tab.page 所在可见页时 →
  `reader.store.setPage(page, {scroll:'to'})`（INV-29 既有程序滚动通道——
  页盒顶入视口）；页内高亮层 effect 在 active 匹配节点挂载后
  `scrollIntoView({block:'center'})` 居中（两段式：先页顶后居中，收敛即可）。

### 高亮层（新文件 SearchHighlightLayer.tsx，PagesOverlay.renderPageLayers 内挂）

- props：`{ page: number; pageRoot: HTMLElement | null }`（0 基页——与
  AnnotationLayer 同型挂法）；内部订阅 reader-search.store。
- 渲染：state='done' 且该页有匹配 → 逐匹配逐 itemRange 建 DOM Range →
  clientRects → toPageRelative → 绝对定位 div（`data-testid="search-hl"`；
  active 匹配 `data-active="true"`+强调样式）。pointer-events:none。
- 量测时机：span 异步落位 → 对 .textLayer 容器挂 MutationObserver+
  rAF 合并重算（AnnotationLayer 先例同型）；zoom 变更（重渲链）同径重算。
- 层序：z=PAGE_LAYER_Z.colorBlocks（1——背景板语言：canvas 墨带(z2)恒在其
  上，文字纯黑不被染；DOM 序在 AnnotationLayer 后=叠于标注块之上，搜索为
  瞬态视觉合理）。色=var(--accent-soft) 底+active 用 var(--accent) 描边。

### 搜索框（新文件 ReaderSearchBox.tsx，纯受控）

- props：`{ state, query, lastSubmitted, matchCount, activeIndex, focusSeq,
  onQueryChange, onSubmit(q), onPrev, onNext, onClose }`。
- 键位：Enter → query!==lastSubmitted 或 state!=='done' ? onSubmit : onNext
  （Chrome 式：首次回车=搜索，再回车=下一处）；Shift+Enter=上一处（同规则）；
  Esc=onClose。输入框 onChange → onQueryChange。
- 展示：计数 `${activeIndex+1}/${matchCount}`（0 命中=「0/0」+「无匹配」
  提示文案）；searching 态=计数位转圈文案「搜索中…」；‹ › × 三按钮
  （aria-label 上一个/下一个/关闭搜索）。focusSeq 变化 → input.focus()+
  select()（Ctrl+F 重开聚焦）。

### 接线（ReaderPage/useReaderSearch.ts）

- 新 hook `useReaderSearch(pdfDoc: unknown, fileUrl: string): ReactNode`：
  ①fileUrl 变化 → searchStore.reset()（换文档清面板——INV-55 面）；②注册
  keymap id 'reader-search'（ctrl+f，preventDefault——经共享 keymap 注册/
  注销成对 INV-14，**不经 ReaderShortcuts**——其受锁测试面零改）→
  searchStore.open()；③订阅 store 产 `<ReaderSearchBox>` 节点返回。
- ReaderToolbar.tsx：占位 span 兑现删除 → 可选 slot prop `searchBox?:
  ReactNode`（缺席=旧占位 span 兜底——纯减集改向无，生产装配面恒传）；
  头注 :6-7 v2 注记修订。ReaderPage 渲染 toolbar 时传 slot。
- ReaderShortcuts.ts:38 预留注记兑现修订（纯注释——快捷键实际落 keymap
  'reader-search'，注记指明落点）。

### 态空间跨格序列表（S1~S12——验收=逐格测试锚）

| # | 序列 | 期望 |
|---|---|---|
| S1 | idle→Ctrl+F→open | 面板开、输入框聚焦、零匹配零高亮（未搜） |
| S2 | open→Enter（空/纯空白查询） | no-op：零搜索零代际变化（submit 早退） |
| S3 | open→submit 有效查询 | open→searching→done：计数 n/1、首匹配 active、当前页高亮块渲染 |
| S4 | done→Enter/‹›下一处 | active+1；末位→回卷 1；目标页不在视口→setPage 程序滚动+居中 |
| S5 | done→Shift+Enter/上一处 | active−1；首位→回卷末位 |
| S6 | done→Esc/× | →idle：面板关+高亮清+query 清 |
| S7 | searching→再 submit 新查询 | 代际守卫：旧代页回传作废，新代独占，计数=新查询口径 |
| S8 | searching/done→换 tab/换文档 | reset→idle（fileUrl 键效应；INV-55） |
| S9 | submit 无命中 | done(0)：计数「0/0」+「无匹配」，零高亮块 |
| S10 | 逐页提取中某页 getTextContent 失败 | error toast+回 open（query 保留），零崩溃、代际终止 |
| S11 | done→zoom 变更 | 计数不变；高亮随文本层重渲重算（MutationObserver 路径）保持可见 |
| S12 | done→Ctrl+F 再按 | 面板已开：focusSeq++→重新聚焦+全选 query，不重搜 |

## ② 接口层

新四文件+hook 的导出面见上；**零 IPC/零 schema/零 shared 改动**（纯 renderer
特性内闭环）；PdfTextItem/PdfTextContent 类型消费循「类型再导出单源」惯例
（`import type ... from './PdfPageCanvas'`——非 pdfjs-dist 直 import，INV-16）。

## ③ 架构层

- 分层不动（renderer 特性内新增）；reader-search.store 不 import reader.store
  （翻页联动经注入回调——hook 装配面接线，可测性=CorpusExtractor deps 注入同型）。
- **INV-55 新登记**（docs/invariants.md，收口时主控统一改）：页内搜索会话
  生命周期挂 reader 视图文档身份（fileUrl 变更/换 tab 即 reset 全清）；在途
  搜索代际守卫（新查询/reset 顶替旧代，迟到页回传作废）；搜索索引全文档、
  高亮视觉仅渲染窗口页（懒渲染架构的确定性投影——计数与窗口无关）。
- ReaderToolbar 可选 slot=既有可选 props 先例形态（onFitWidth 同款缺席语义）。

## ④ 生命周期层

- ReaderToolbar.tsx:6-7+212-220 与 ReaderShortcuts.ts:38 两处 v2 预留注记兑现
  修订。
- 已知边界（票面外不修只记）：①跨行匹配高亮=行盒原样（band 收边是标注链
  F-A4 面的后续同化项）；②RTL/竖排文本不支持（pdfjs dir 非 ltr 项按 ltr
  处理——学术 PDF 主流场景）；③whitespace 不归一（query 含连续空格按字面
  匹配）；④done 态下高亮层对「匹配在 span 内偏移」依赖 items 与 TextLayer
  span 严格同序同数（pdfjs 4.10 契约，防御不符=该页跳过高亮只计数）。

## ⑤ 文化层（测试规约——TDD 红→绿→变异红证）

新测试全 always-active：

| 文件 | 覆盖 |
|---|---|
| tests/unit/renderer/reader-search-text.test.ts | 纯函数面：buildPageText 拼接+hasEOL 插行+字符映射；findInText 大小写不敏感/多命中/CJK 跨 item 命中/跨 '\n' 不命中/空结果；toPageRelative 数学；spansForItems 数量符/不符两径 |
| tests/unit/renderer/reader-search.store.test.ts | S2/S3/S4/S5/S7/S8/S9/S10 全序列（doc 桩注入逐页文本+失败注入；代际守卫=旧代页回传后断言 matches 为新代口径）|
| tests/unit/renderer/reader-search-ui.test.tsx | ReaderSearchBox：键位三件（Enter 提交/再按下一处、Shift+Enter、Esc）+计数展示+searching 文案+0 命中文案+focusSeq 聚焦；SearchHighlightLayer：done 态按页过滤渲染+active 强调属性+idle/searching 零渲染+span 数不符跳过（jsdom 建 span 链——clientRects 零长面=渲染存在性断言，几何归 e2e）；ReaderToolbar slot：传/不传两态 |
| tests/e2e/reader-search.spec.ts | 装配级全链（fixture=createMultiPagePdf(3)，每页一行 `P<n> SMART WATER TEST DOC`）：打开文献→Ctrl+F→输入小写 `smart water`→Enter→页 1 高亮块可见+计数 1/3→Enter（下一处）→P2 文本入视口+计数 2/3+页 2 高亮可见→Esc→高亮清零+面板关。 crib reader-text.spec seedAndLaunch 配方 |

- **变异红证 ≥5 组**（先证命中再断红，cp 备份法还原——禁 git checkout）：
  M1=findInText 删 toLowerCase 归一（大小写用例红）；M2=store 删代际守卫
  （S7 旧代作废断言红）；M3=ReaderSearchBox Enter 分支删 lastSubmitted 比较
  （再按=下一处用例红）；M4=SearchHighlightLayer 删 active 匹配过滤（S3 active
  强调断言红）；M5=ReaderToolbar slot 删（slot 渲染断言红——占位回归）。
- 先红纪律：每测试文件先红（缺失模块天然红）落盘 scripts/audits/p7e-03-red/；
  证据日志统一 `.raw.txt` 后缀；首红须全量套跑口径或申报降档。
- **锁序纪律（v31 §3）**：新测试文件诞生即 `locks:generate`+`locks:apply`
  **先于** verify（预期 251→255：+3 unit+1 e2e spec）。
- 受锁面：仅新测试文件四件（tests/ 自动锁面）；无既有受锁文件改动。

## ⑥ 验收

- `npm run verify` 全绿（基线 135 文件 1163 用例滚动，新增数实测申报）。
- e2e 全量（35+1 新 spec）全绿。
- 门一 Kimi 外链+门二 deepseek 异构终审（材料含新文件全文+diff 包）。
- grep 无 TODO/FIXME/placeholder；中文 UTF-8 验证。
- INV-55 登记+两处预留注记修订+registry P7E-03 翻 done（收口主控单写）。
- 提交尾注：新测试入锁 [locked-change]。

## ⑦ 派发与成本申报

- 三屋：实现者=子代理（环境 Agent 工具面无 model 参数——账本记「环境限制
  统一档」欠账披露，§4.5 环境降级披露条款）；门一=Kimi K3（gate-call.py）；
  门二=deepseek（同链瘦身+32k 档纪律）。
- 实现者禁 git/registry/locks；禁新增依赖；超票面决定停下申报（BLOCKED）。
- 主控亲验 verify 真退出码+变异红证抽查+diff 范围核对。
```

## 3. 完整 diff（git diff；新文件经 add -N 全文入包）
```diff
diff --git a/src/renderer/features/reader/PagesOverlay.tsx b/src/renderer/features/reader/PagesOverlay.tsx
index 54edad163d..164abcdb18 100644
--- a/src/renderer/features/reader/PagesOverlay.tsx
+++ b/src/renderer/features/reader/PagesOverlay.tsx
@@ -44,6 +44,7 @@ import type { Annotation } from '@shared/models/annotation'
 import { AnnotationLayer } from './AnnotationLayer'
 import { ReaderAiLayer } from './AiAnnotationLayer'
 import { PageColumn, type PageScrollRequest } from './PageColumn'
+import { SearchHighlightLayer } from './SearchHighlightLayer'
 import type { PDFDocumentProxy } from './PdfDocProvider'
 import type { PdfTextContent } from './PdfPageCanvas'
 import type { PageLayout } from './page-column-geometry'
@@ -105,7 +106,9 @@ export function PagesOverlay(props: {
     setPageTexts(del); setPageRoots(del)
   }, [])
 
-  /** 段④层实例化：每渲染页一套覆盖层（props 不变；标注层自同步 store 父级无动作） */
+  /** 段④层实例化：每渲染页一套覆盖层（props 不变；标注层自同步 store 父级无动作）。
+      P7E-03：SearchHighlightLayer 挂 ReaderAiLayer 后（DOM 序在 AnnotationLayer
+      后=叠于标注块之上——搜索瞬态视觉合理；内部订阅 reader-search.store） */
   const renderPageLayers = (no: number): JSX.Element => {
     const pt = pageTexts[no]
     const pr = pageRoots[no]
@@ -114,6 +117,7 @@ export function PagesOverlay(props: {
         {pt !== undefined ? <TextLayer textContent={pt.text} viewportScale={zoom} pageWidth={pt.box.w} pageHeight={pt.box.h} /> : null}
         {pr !== undefined ? <AnnotationLayer annotations={annotations} page={no - 1} pageRoot={pr} onChanged={() => undefined} /> : null}
         <ReaderAiLayer page={no - 1} pageRoot={pr ?? null} />
+        <SearchHighlightLayer page={no - 1} pageRoot={pr ?? null} />
       </PageFrame>
     )
   }
diff --git a/src/renderer/features/reader/ReaderPage.tsx b/src/renderer/features/reader/ReaderPage.tsx
index 8a30cee6bc..22a19a03ae 100644
--- a/src/renderer/features/reader/ReaderPage.tsx
+++ b/src/renderer/features/reader/ReaderPage.tsx
@@ -24,6 +24,8 @@
  *   columnBasis 已随 onReady 布局口径重报——切布局 basis 重报时序先于用户
  *   点击）；onReady 重触发走 spProg.onColumnReady 恢复链滚回当前页（S1 声明
  *   期望：切布局不丢位置）
+ * - P7E-03 页内搜索装配：useReaderSearch（fileUrl 键效应清面板/ctrl+f/
+ *   翻页联动注入/受控面板节点）→ ReaderToolbar searchBox slot
  * ── 接口层 ──
  * - export function ReaderPage(): JSX.Element
  * ── 架构层 ──
@@ -46,6 +48,7 @@ import type { PageScrollRequest } from './PageColumn'
 import { useReaderShortcuts, SCROLL_STEP_RATIO } from './ReaderShortcuts'
 import { ReaderToolbar, ZOOM_STEP, round2 } from './ReaderToolbar'
 import { SelectionLayer } from './SelectionLayer'
+import { useReaderSearch } from './useReaderSearch'
 import { useReaderStore } from './reader.store'
 import { readActiveTab, useActiveTab } from './useActiveTab'
 import { createReaderScrollProgress, useScrollProgressWiring } from './scroll-progress'
@@ -104,6 +107,11 @@ export function ReaderPage(): JSX.Element {
     }, [])
   )
 
+  // P7E-03 页内搜索装配：fileUrl 键效应清面板+ctrl+f keymap+翻页联动注入+
+  // 受控面板节点（ReaderToolbar slot 消费；空态视图不渲染 toolbar=面板随
+  // store 态自隐，fileUrl 变化时经 reset 收口）
+  const searchBox = useReaderSearch(pdfDoc, fileUrl ?? '')
+
   // 打开请求两路（sr2-lg-08：注册必须先于闩锁消费——链见头注）：挂载时闩锁补读+实时监听；定路由/失败 toast 归 openFromBus
   useEffect(() => {
     const open = (req: OpenPaperRequest): void => openFromBus(req)
@@ -206,7 +214,8 @@ export function ReaderPage(): JSX.Element {
         pageStep={pageLayout === 'double' ? 2 : 1}
         onTogglePageLayout={() => {
           useReaderStore.getState().setPageLayout(pageLayout === 'double' ? 'single' : 'double')
-        }} />
+        }}
+        searchBox={searchBox} />
       <div className="flex min-h-0 flex-1">
         {outlineOpen ? (
           // 可拖拽侧栏（SplitPane，宽度持久化）：main 槽传 null——主内容外置为稳定子节点
diff --git a/src/renderer/features/reader/ReaderSearchBox.tsx b/src/renderer/features/reader/ReaderSearchBox.tsx
new file mode 100644
index 0000000000..e6ab2c21d7
--- /dev/null
+++ b/src/renderer/features/reader/ReaderSearchBox.tsx
@@ -0,0 +1,117 @@
+/**
+ * [P7E-03] ReaderSearchBox —— 页内搜索框（纯受控组件；props 全量注入，
+ * store 订阅在装配面 useReaderSearch）。
+ *
+ * ── 行为层 ──
+ * - 键位（票面 §①）：Enter → query!==lastSubmitted 或 state!=='done' ?
+ *   onSubmit(query) : onNext()（Chrome 式：首次回车=搜索，再回车=下一处）；
+ *   Shift+Enter=上一处（同规则）；Esc=onClose。输入框内 Ctrl+F=本地重聚焦
+ *   +全选（keymap 层 editable 避让使 document 级 Ctrl+F 不达——S12 的
+ *   「面板已开再按」在焦点已驻输入框时的等价路径，preventDefault 阻原生 find）。
+ * - 展示：计数 `${activeIndex+1}/${matchCount}`（0 命中=「0/0」+「无匹配」）；
+ *   searching 态=计数位「搜索中…」；‹ › × 三按钮（aria-label 上一个/下一个/
+ *   关闭搜索）。focusSeq 变化 → input.focus()+select()（Ctrl+F 重开聚焦全选）。
+ * - idle 态自隐（受控组件返回 null——装配面恒挂，面板开合由 state 驱动）。
+ *
+ * ── 接口层 ──
+ * - export function ReaderSearchBox(props: { state: ReaderSearchStateName;
+ *   query; lastSubmitted; matchCount; activeIndex; focusSeq;
+ *   onQueryChange(q); onSubmit(q); onPrev(); onNext(); onClose }):
+ *   JSX.Element | null
+ *
+ * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
+ * - 纯受控零 store 依赖（可测性）；tests/unit/renderer/reader-search-ui.test.tsx
+ */
+import { useEffect, useRef } from 'react'
+import type { KeyboardEvent } from 'react'
+import type { ReaderSearchStateName } from './reader-search.store'
+
+export function ReaderSearchBox(props: {
+  state: ReaderSearchStateName
+  query: string
+  lastSubmitted: string
+  matchCount: number
+  activeIndex: number
+  focusSeq: number
+  onQueryChange(q: string): void
+  onSubmit(q: string): void
+  onPrev(): void
+  onNext(): void
+  onClose(): void
+}): JSX.Element | null {
+  const { state, query, lastSubmitted, matchCount, activeIndex, focusSeq, onQueryChange, onSubmit, onPrev, onNext, onClose } = props
+  const inputRef = useRef<HTMLInputElement>(null)
+
+  // focusSeq 变化（open()/Ctrl+F 再按）→ 聚焦+全选（S1/S12）
+  useEffect(() => {
+    inputRef.current?.focus()
+    inputRef.current?.select()
+  }, [focusSeq])
+
+  if (state === 'idle') return null
+
+  const onKeydown = (e: KeyboardEvent<HTMLInputElement>): void => {
+    if (e.key === 'Escape') {
+      e.preventDefault()
+      onClose()
+      return
+    }
+    // 面板内 Ctrl+F：keymap 层 editable 避让不达——本地等价（重聚焦+全选）
+    if (e.key.toLowerCase() === 'f' && (e.ctrlKey || e.metaKey)) {
+      e.preventDefault()
+      inputRef.current?.select()
+      return
+    }
+    if (e.key === 'Enter') {
+      e.preventDefault()
+      if (query !== lastSubmitted || state !== 'done') {
+        onSubmit(query)
+        return
+      }
+      if (e.shiftKey) {
+        onPrev()
+        return
+      }
+      onNext()
+    }
+  }
+
+  const countText = state === 'searching' ? '搜索中…' : matchCount === 0 ? '0/0' : `${activeIndex + 1}/${matchCount}`
+  const btn = 'syn-btn-ghost rounded border px-1.5 py-0.5 text-xs'
+
+  return (
+    <div
+      data-testid="reader-search-box"
+      className="ml-auto flex items-center gap-1 rounded border px-2 py-0.5"
+      style={{ borderColor: 'var(--border)' }}
+    >
+      <input
+        ref={inputRef}
+        data-testid="reader-search-input"
+        className="w-32 rounded px-1 text-xs outline-none"
+        style={{ borderColor: 'var(--border)', background: 'var(--panel)', color: 'var(--text)' }}
+        aria-label="页内搜索"
+        value={query}
+        onChange={(e) => onQueryChange(e.target.value)}
+        onKeyDown={onKeydown}
+      />
+      <span data-testid="reader-search-count" className="rdr-num text-xs" style={{ color: 'var(--text-dim)' }}>
+        {countText}
+      </span>
+      {state === 'done' && matchCount === 0 ? (
+        <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
+          无匹配
+        </span>
+      ) : null}
+      <button type="button" className={btn} aria-label="上一个" onClick={onPrev}>
+        ‹
+      </button>
+      <button type="button" className={btn} aria-label="下一个" onClick={onNext}>
+        ›
+      </button>
+      <button type="button" className={btn} aria-label="关闭搜索" onClick={onClose}>
+        ×
+      </button>
+    </div>
+  )
+}
diff --git a/src/renderer/features/reader/ReaderShortcuts.ts b/src/renderer/features/reader/ReaderShortcuts.ts
index 1cf78056cb..0fb1be0863 100644
--- a/src/renderer/features/reader/ReaderShortcuts.ts
+++ b/src/renderer/features/reader/ReaderShortcuts.ts
@@ -35,7 +35,9 @@
  * - 接缝声明：ReaderPage.tsx（Phase 3 阅读器组合根）装配本 hook 属本工单改动面
  *
  * ── 生命周期层 ──
- * - 预留：页内高亮搜索快捷键（P7-E）；不做：鼠标手势
+ * - 页内高亮搜索快捷键（P7-E 预留点）已由 P7E-03 兑现：独立 keymap id
+ *   'reader-search'（ctrl+f——useReaderSearch hook 内注册，经共享 keymap
+ *   注册/注销成对；不经本绑定表，本表受锁测试面零改）；不做：鼠标手势
  *
  * ── 文化层 ──
  * - 剪贴板失败 toast 即动作型反馈；禁止静默吞错；禁止 any；文件 ≤200 行
diff --git a/src/renderer/features/reader/ReaderToolbar.tsx b/src/renderer/features/reader/ReaderToolbar.tsx
index a7ffcfeb63..fdb7b37ab0 100644
--- a/src/renderer/features/reader/ReaderToolbar.tsx
+++ b/src/renderer/features/reader/ReaderToolbar.tsx
@@ -3,8 +3,9 @@
  *
  * ── 行为层 ──
  * - 页码显示/跳转、上/下页、缩放 -/100%/+（0.5~3 步进 0.1）、适应宽度
- * - 标注颜色选择（当前色）；内文搜索框（v1：全文检索走文献库 FTS，
- *   页内高亮搜索 v2——工具栏只放占位禁用态并 title 提示）
+ * - 标注颜色选择（当前色）；页内高亮搜索面板（P7E-03 兑现：经可选 slot
+ *   prop searchBox 注入——装配面 ReaderPage 恒传 useReaderSearch 产出；
+ *   缺席=旧占位 span 兜底，仅存量受锁测试夹具路径；库侧全文检索仍走 FTS）
  * - 选择模式开关（F-A3/INV-42，颜色组之后）：aria-pressed 反映当前态+选中
  *   态边框强调（颜色点选中态同语言）；toggle 语义在装配面 ReaderPage——
  *   工具栏纯受控只上抛 onToggleSelectionMode
@@ -35,6 +36,7 @@
  *   零变（PDF 区装饰浓度最低原则）
  */
 import { useEffect, useState } from 'react'
+import type { ReactNode } from 'react'
 import type { AnnotationColor } from '@shared/models/annotation'
 import { ANNOTATION_COLORS } from '@shared/constants'
 import { COLOR_LABEL, COLOR_SWATCH } from './annotation-style'
@@ -63,6 +65,10 @@ export function ReaderToolbar(props: {
   onTogglePageLayout?: () => void
   /** F-R1 翻页步进（缺省 1=既有零变；双页装配面传 2=翻面语义） */
   pageStep?: number
+  /** P7E-03 页内搜索面板 slot（装配面 useReaderSearch 产出恒传；缺席=旧占位
+   *  span 兜底——存量受锁测试夹具直植 props 形状零破坏，onFitWidth 同款
+   *  可选先例形态） */
+  searchBox?: ReactNode
 }): JSX.Element {
   const { page, totalPages, zoom, color, onNavigate, onZoom, onColor, onFitWidth } = props
   const selectionMode = props.selectionMode ?? false
@@ -209,15 +215,18 @@ export function ReaderToolbar(props: {
         选择模式
       </button>
 
-      {/* 搜索占位（禁用态）：真实输入框的提示属性名会撞 quality 关卡的英文字面量禁令，
-          且 v1 本就不可输入——用非表单元素呈现提示文案，语义在 title */}
-      <span
-        className="ml-auto w-44 rounded border px-2 py-0.5"
-        style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}
-        title="页内高亮搜索 v2 提供；v1 全文检索走文献库 FTS（工具栏只放禁用占位）"
-      >
-        全库检索请回文献库
-      </span>
+      {/* P7E-03 页内搜索面板 slot：生产装配面（ReaderPage 经 useReaderSearch）
+          恒传；缺席=旧占位 span 兜底（真输入框在 ReaderSearchBox——此处仅
+          存量受锁测试夹具路径） */}
+      {props.searchBox ?? (
+        <span
+          className="ml-auto w-44 rounded border px-2 py-0.5"
+          style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}
+          title="页内高亮搜索面板由装配面 slot 提供（本占位仅测试夹具路径）"
+        >
+          全库检索请回文献库
+        </span>
+      )}
     </div>
   )
 }
diff --git a/src/renderer/features/reader/SearchHighlightLayer.tsx b/src/renderer/features/reader/SearchHighlightLayer.tsx
new file mode 100644
index 0000000000..d886e8ddd6
--- /dev/null
+++ b/src/renderer/features/reader/SearchHighlightLayer.tsx
@@ -0,0 +1,156 @@
+/**
+ * [P7E-03] SearchHighlightLayer —— 页内搜索高亮层（渲染窗口内页的匹配矩形）。
+ *
+ * ── 行为层 ──
+ * - props { page, pageRoot }（0 基——与 AnnotationLayer 同型挂法，PagesOverlay
+ *   renderPageLayers 内装配）；内部订阅 reader-search.store。
+ * - state='done' 且该页有匹配 → 逐匹配逐 itemRange 建 DOM Range → clientRects
+ *   → toPageRelative → 绝对定位 div（data-testid="search-hl"；active 匹配
+ *   data-active="true"+var(--accent) 描边强调）。pointer-events:none。
+ * - 量测时机：span 异步落位（pdf.js render() promise）→ 对 .textLayer 容器挂
+ *   MutationObserver+rAF 合并重算（AnnotationLayer 先例同型）；zoom 变更（文本
+ *   层重渲 replaceChildren）同径重算。坐标参考=textLayer 盒（=canvas 盒=本层
+ *   inset-0 容器盒——三盒同源，px 定位零漂移）。
+ * - 防御：spansForItems 数量不符→该页零渲染只计数；Range 偏移夹取（契约漂移
+ *   不崩）；零宽/零高 rect 跳过。
+ * - active 居中（两段式滚动第二段）：active 匹配节点挂载后 scrollIntoView
+ *   ({block:'center'})——同 matches+同 activeIndex 只滚一次（新结果集/新
+ *   activeIndex 重新具备资格；第一段=装配面 pageTurner→setPage 页盒顶入视口）。
+ *
+ * ── 接口层 ──
+ * - export function SearchHighlightLayer(props: { page: number;
+ *   pageRoot: HTMLElement | null }): JSX.Element | null
+ *
+ * ── 架构层 ──
+ * - 层序=PAGE_LAYER_Z.colorBlocks（1——背景板语言：canvas 墨带恒在其上，文字
+ *   纯黑不被染；DOM 序在 AnnotationLayer 后=叠于标注块之上，搜索为瞬态视觉
+ *   合理）；取色只走 theme.css 变量（annotation-style 纪律同源）。
+ *
+ * ── 生命周期层 ── / ── 文化层 ──
+ * - tests/unit/renderer/reader-search-ui.test.tsx（渲染存在性+px 映射）；
+ *   真几何归 e2e reader-search.spec.ts（真机 Chromium clientRects）
+ */
+import { useEffect, useRef, useState } from 'react'
+import { spansForItems, toPageRelative } from './reader-search'
+import { useReaderSearchStore } from './reader-search.store'
+import type { SearchMatch } from './reader-search.store'
+import { PAGE_LAYER_Z } from './page-layer-z'
+
+/** 高亮块（页内相对像素+active 标记） */
+interface HighlightBox {
+  x: number
+  y: number
+  w: number
+  h: number
+  active: boolean
+}
+
+export function SearchHighlightLayer(props: {
+  page: number
+  pageRoot: HTMLElement | null
+}): JSX.Element | null {
+  const { page, pageRoot } = props
+  const state = useReaderSearchStore((s) => s.state)
+  const matches = useReaderSearchStore((s) => s.matches)
+  const activeIndex = useReaderSearchStore((s) => s.activeIndex)
+  const items = useReaderSearchStore((s) => s.pageItems[page])
+  const [boxes, setBoxes] = useState<HighlightBox[]>([])
+  const containerRef = useRef<HTMLDivElement | null>(null)
+  // 居中滚动记账：同 matches+同 activeIndex 只滚一次
+  const scrolledMark = useRef<{ m: SearchMatch[]; i: number } | null>(null)
+
+  // 量测：done 态本页匹配 → span 链 DOM Range → clientRects → 页内相对 px
+  useEffect(() => {
+    const pageHasMatch = state === 'done' && matches.some((m) => m.page === page)
+    if (!pageHasMatch || pageRoot === null || items === undefined) {
+      setBoxes([])
+      return
+    }
+    const textLayer = pageRoot.querySelector('.textLayer')
+    if (textLayer === null) {
+      setBoxes([])
+      return
+    }
+    let scheduled = false
+    const measure = (): void => {
+      scheduled = false
+      const spans = spansForItems(pageRoot, items.length)
+      if (spans === null) {
+        setBoxes([])
+        return
+      }
+      const rootRect = textLayer.getBoundingClientRect()
+      const next: HighlightBox[] = []
+      for (let gi = 0; gi < matches.length; gi += 1) {
+        const match = matches[gi]
+        if (match === undefined || match.page !== page) continue
+        for (const ir of match.itemRanges) {
+          const span = spans[ir.itemIndex] ?? null
+          const node = span?.firstChild ?? null
+          if (span === null || node === null || node.nodeType !== Node.TEXT_NODE) continue
+          const textLen = node.textContent?.length ?? 0
+          const range = document.createRange()
+          range.setStart(node, Math.max(0, Math.min(ir.s0, textLen)))
+          range.setEnd(node, Math.max(0, Math.min(ir.s1, textLen)))
+          for (const rect of Array.from(range.getClientRects())) {
+            if (rect.width <= 0 || rect.height <= 0) continue
+            const rel = toPageRelative(rect, rootRect)
+            next.push({ ...rel, active: gi === activeIndex })
+          }
+        }
+      }
+      setBoxes(next)
+    }
+    const schedule = (): void => {
+      if (!scheduled) {
+        scheduled = true
+        requestAnimationFrame(measure)
+      }
+    }
+    measure()
+    const observer = new MutationObserver(schedule)
+    observer.observe(textLayer, { childList: true, subtree: true })
+    return () => observer.disconnect()
+  }, [state, matches, activeIndex, items, page, pageRoot])
+
+  // active 居中：active 匹配在本页且其 hl 块已挂载 → scrollIntoView（一次）
+  useEffect(() => {
+    if (state !== 'done') return
+    const mark = scrolledMark.current
+    if (mark !== null && mark.m === matches && mark.i === activeIndex) return
+    const active = matches[activeIndex]
+    if (active === undefined || active.page !== page) return
+    const el = containerRef.current?.querySelector('[data-active="true"]') ?? null
+    if (el === null) return
+    scrolledMark.current = { m: matches, i: activeIndex }
+    el.scrollIntoView({ block: 'center' })
+  }, [boxes, state, matches, activeIndex, page])
+
+  if (state !== 'done' || boxes.length === 0) return null
+
+  return (
+    <div
+      ref={containerRef}
+      data-testid="search-highlight-layer"
+      className="absolute inset-0"
+      style={{ zIndex: PAGE_LAYER_Z.colorBlocks, pointerEvents: 'none' }}
+    >
+      {boxes.map((b, i) => (
+        <div
+          key={i}
+          data-testid="search-hl"
+          data-active={b.active}
+          className="absolute"
+          style={{
+            left: `${b.x}px`,
+            top: `${b.y}px`,
+            width: `${b.w}px`,
+            height: `${b.h}px`,
+            backgroundColor: 'var(--accent-soft)',
+            ...(b.active ? { outline: '2px solid var(--accent)' } : {})
+          }}
+        />
+      ))}
+    </div>
+  )
+}
diff --git a/src/renderer/features/reader/reader-search.store.ts b/src/renderer/features/reader/reader-search.store.ts
new file mode 100644
index 0000000000..a9fa0473c8
--- /dev/null
+++ b/src/renderer/features/reader/reader-search.store.ts
@@ -0,0 +1,178 @@
+/**
+ * [P7E-03] reader-search.store —— 页内搜索会话 store（zustand；态空间 S1~S12
+ * 票面 §① 表）。
+ *
+ * ── 行为层 ──
+ * - 态机：'idle'（面板关）| 'open'（面板开）| 'searching'（在途）| 'done'
+ *   （有结果集）。事件×态：
+ *   | 事件 | idle | open | searching | done |
+ *   | open()（Ctrl+F） | →open+focusSeq++ | focusSeq++ | focusSeq++（态不变） | focusSeq++（态不变——S12 不重搜） |
+ *   | submit 有效 | — | →searching | →searching（新代顶替旧代） | →searching |
+ *   | submit 空/纯空白 | no-op | no-op（S2） | no-op | no-op |
+ *   | submit 页提取失败 | — | 停 open+toast（S10，query 保留） | 同左 | 同左 |
+ *   | next()/prev() | no-op | no-op（无结果集） | no-op | activeIndex 回卷循环+翻页回调 |
+ *   | close()/reset() | no-op（幂等清） | →idle 全清 | →idle 全清+代际失效 | →idle 全清+代际失效 |
+ * - 代际守卫（INV-03 同族）：闭包内 generation 每次 submit/close/reset 自增；
+ *   逐页回传时代际不符→作废终止（不写任何状态）——迟到旧代不得覆盖新代。
+ * - submit 同步置态：searching 在首个 await 前落账（零 await 前置——搜索指示
+ *   即刻可见）；索引=全文档逐页 getTextContent（未渲染页也计数——Design 裁决）。
+ * - 翻页联动经注入回调（store 间零 import——registerPageTurner 注册口，装配面
+ *   useReaderSearch 接线 reader.store.setPage(page,{scroll:'to'})，可测性=
+ *   CorpusExtractor deps 注入同型）。
+ * - pageItems 仅含命中页（高亮映射输入——span 数校验基准）。
+ *
+ * ── 接口层 ──
+ * - export const useReaderSearchStore；createReaderSearchInitialState 复位面
+ *
+ * ── 架构层 ──
+ * - 不 import reader.store（翻页联动经注册回调）；showToast 消费 toast-store
+ *   （.ts 模块面——reader.store 同款）
+ *
+ * ── 生命周期层 ──
+ * - INV-55：页内搜索会话生命周期挂 reader 视图文档身份——换文档/换 tab 由
+ *   装配面 hook 的 fileUrl 键效应调 reset()（本 store 不自知文档身份）
+ *
+ * ── 文化层 ──
+ * - tests/unit/renderer/reader-search.store.test.ts（S1~S12 store 侧锚）
+ */
+import { create } from 'zustand'
+import { asSearchDoc, buildPageText, findInText, toTextItems } from './reader-search'
+import type { SearchItemRange } from './reader-search'
+import type { PdfTextItem } from './PdfPageCanvas'
+import { showToast } from '../../shared/ui/toast-store'
+
+export type ReaderSearchStateName = 'idle' | 'open' | 'searching' | 'done'
+
+/** 单命中（页 0 基+按 item 归组区间集） */
+export interface SearchMatch {
+  page: number
+  itemRanges: SearchItemRange[]
+}
+
+/** 翻页联动回调（装配面注入：目标页≠当前可见页时 setPage 程序滚动） */
+export type PageTurner = (page: number) => void
+
+export interface ReaderSearchStore {
+  state: ReaderSearchStateName
+  query: string
+  lastSubmitted: string
+  matches: SearchMatch[]
+  activeIndex: number
+  pageItems: Record<number, PdfTextItem[]>
+  focusSeq: number
+  pageTurner: PageTurner | null
+  registerPageTurner(f: PageTurner | null): void
+  open(): void
+  close(): void
+  setQuery(q: string): void
+  submit(doc: unknown, q: string): Promise<void>
+  next(): void
+  prev(): void
+  reset(): void
+}
+
+export function createReaderSearchInitialState() {
+  return {
+    state: 'idle' as ReaderSearchStateName,
+    query: '',
+    lastSubmitted: '',
+    matches: [] as SearchMatch[],
+    activeIndex: 0,
+    pageItems: {} as Record<number, PdfTextItem[]>,
+    focusSeq: 0,
+    pageTurner: null as PageTurner | null
+  }
+}
+
+export const useReaderSearchStore = create<ReaderSearchStore>()((set, get) => {
+  // 代际计数（INV-03 同族）：submit 每次自增；close/reset 使在途代失效
+  let readerSearchGeneration = 0
+
+  /** 搜索字段全清（pageTurner 注册不随清空——装配面成对管理） */
+  const blank = (): Pick<ReaderSearchStore, 'state' | 'query' | 'lastSubmitted' | 'matches' | 'activeIndex' | 'pageItems'> => ({
+    state: 'idle',
+    query: '',
+    lastSubmitted: '',
+    matches: [],
+    activeIndex: 0,
+    pageItems: {}
+  })
+
+  const stepActive = (dir: 1 | -1): void => {
+    const { matches, activeIndex, pageTurner } = get()
+    if (matches.length === 0) return
+    const idx = (activeIndex + dir + matches.length) % matches.length
+    set({ activeIndex: idx })
+    const target = matches[idx]
+    if (target !== undefined) pageTurner?.(target.page)
+  }
+
+  return {
+    ...createReaderSearchInitialState(),
+
+    registerPageTurner(f) {
+      set({ pageTurner: f })
+    },
+
+    open() {
+      const s = get()
+      set({
+        state: s.state === 'idle' ? 'open' : s.state,
+        focusSeq: s.focusSeq + 1
+      })
+    },
+
+    close() {
+      readerSearchGeneration += 1
+      set(blank())
+    },
+
+    setQuery(q) {
+      set({ query: q })
+    },
+
+    async submit(doc, q) {
+      const trimmed = q.trim()
+      if (trimmed === '') return
+      const d = asSearchDoc(doc)
+      if (d === null) return
+      const gen = ++readerSearchGeneration
+      // 同步置态（⑤b 零 await 前置）：searching 即刻可见
+      set({ state: 'searching', lastSubmitted: trimmed, matches: [], activeIndex: 0, pageItems: {} })
+      const found: SearchMatch[] = []
+      const hitItems: Record<number, PdfTextItem[]> = {}
+      try {
+        for (let n = 1; n <= d.numPages; n += 1) {
+          const page = await d.getPage(n)
+          const tc = await page.getTextContent()
+          if (readerSearchGeneration !== gen) return
+          const items = toTextItems(tc.items)
+          const hits = findInText(buildPageText(items), trimmed)
+          if (hits.length === 0) continue
+          found.push(...hits.map((h) => ({ page: n - 1, itemRanges: h.itemRanges })))
+          hitItems[n - 1] = items
+        }
+      } catch {
+        if (readerSearchGeneration !== gen) return
+        showToast('页内搜索失败：部分页面文本无法读取', 'error')
+        set({ state: 'open', matches: [], activeIndex: 0, pageItems: {} })
+        return
+      }
+      if (readerSearchGeneration !== gen) return
+      set({ state: 'done', matches: found, activeIndex: 0, pageItems: hitItems })
+    },
+
+    next() {
+      stepActive(1)
+    },
+
+    prev() {
+      stepActive(-1)
+    },
+
+    reset() {
+      readerSearchGeneration += 1
+      set(blank())
+    }
+  }
+})
diff --git a/src/renderer/features/reader/reader-search.ts b/src/renderer/features/reader/reader-search.ts
new file mode 100644
index 0000000000..da4582dc49
--- /dev/null
+++ b/src/renderer/features/reader/reader-search.ts
@@ -0,0 +1,151 @@
+/**
+ * [P7E-03] reader-search —— 页内高亮搜索纯函数域（文本域索引+DOM 域几何映射）。
+ *
+ * ── 行为层 ──
+ * - Design 裁决（票面 §①）：搜索索引=逐页 getTextContent 文本项拼接（全文档
+ *   覆盖——未渲染页也可计数与跳转）；匹配矩形=渲染窗口内页的 TextLayer DOM
+ *   span 上建 Range 取 clientRects（pdfjs 自己排版精确，item→span 索引 1:1
+ *   按 DOM 序——pdfjs 4.10 每文本项恰一 span，TextLayer#appendText 实证）。
+ * - buildPageText：拼接 items.str；hasEOL 项后插 '\n'（防跨行假匹配——
+ *   findInText 拒含 '\n' 的段）；map=逐字符 → {itemIndex, offsetInItem}，
+ *   换行位为哨兵 {itemIndex:-1, offsetInItem:-1}（map 与 text 同长，text
+ *   下标可直接查 map；哨兵永不入 itemRanges——含 '\n' 的段已被拒）。
+ * - findInText：大小写不敏感（两侧 toLowerCase）；多命中不重叠推进（Chrome
+ *   同款）；空串/纯空白查询=空结果（调用方拒的双保险）。
+ * - asSearchDoc：unknown→结构收窄（ReaderPage 持 pdfDoc 为 unknown）。
+ * - toPageRelative：视口盒−根盒=页内相对像素（高亮块绝对定位输入）。
+ * - spansForItems：.textLayer span 按序映射；数量不符→null（防御：该页
+ *   不高亮只计数——pdfjs 4.10 契约破坏时的降级路径）。
+ *
+ * ── 接口层 ──
+ * - PdfTextItem 类型消费循「类型再导出单源」惯例（import type 自
+ *   PdfPageCanvas——INV-16 白名单外禁 pdfjs-dist 直 import）。
+ *
+ * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
+ * - 零 DOM 副作用纯函数（spansForItems 只读查询）；已知边界（票面 §④）：
+ *   跨行匹配=行盒原样、RTL/竖排按 ltr、whitespace 不归一。
+ */
+import type { PdfTextItem } from './PdfPageCanvas'
+
+/** 字符映射项：text 下标 → 所属文本项与项内偏移；-1/-1=换行哨兵 */
+export interface CharMapEntry {
+  itemIndex: number
+  offsetInItem: number
+}
+
+/** 页文本模型：拼接文本+逐字符映射（map 与 text 同长） */
+export interface PageText {
+  text: string
+  map: CharMapEntry[]
+}
+
+/** 单命中：文本域区间+按 item 归组的区间集（DOM Range 构建输入） */
+export interface SearchItemRange {
+  itemIndex: number
+  s0: number
+  s1: number
+}
+
+export interface SearchHit {
+  start: number
+  end: number
+  itemRanges: SearchItemRange[]
+}
+
+/** 结构收窄后的搜索文档（numPages 正整数+getPage 函数） */
+export interface SearchDoc {
+  numPages: number
+  getPage(n: number): Promise<{ getTextContent(): Promise<{ items: unknown }> }>
+}
+
+/** 拼接页文本：hasEOL 项后插 '\n'，map 逐字符登记（换行位哨兵 -1/-1） */
+export function buildPageText(items: readonly PdfTextItem[]): PageText {
+  let text = ''
+  const map: CharMapEntry[] = []
+  for (let itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
+    const it = items[itemIndex]
+    if (it === undefined) continue
+    const str = it.str
+    for (let k = 0; k < str.length; k += 1) {
+      map.push({ itemIndex, offsetInItem: k })
+    }
+    text += str
+    if (it.hasEOL) {
+      text += '\n'
+      map.push({ itemIndex: -1, offsetInItem: -1 })
+    }
+  }
+  return { text, map }
+}
+
+/** text 区间 [s,e) → 按 item 归组的区间集（哨兵跳过；连续同项字符合并） */
+function rangesFromMap(map: readonly CharMapEntry[], s: number, e: number): SearchItemRange[] {
+  const out: SearchItemRange[] = []
+  for (let i = s; i < e; i += 1) {
+    const entry = map[i]
+    if (entry === undefined) continue
+    const { itemIndex, offsetInItem } = entry
+    if (itemIndex < 0) continue
+    const last = out[out.length - 1]
+    if (last !== undefined && last.itemIndex === itemIndex && last.s1 === offsetInItem) {
+      last.s1 = offsetInItem + 1
+    } else {
+      out.push({ itemIndex, s0: offsetInItem, s1: offsetInItem + 1 })
+    }
+  }
+  return out
+}
+
+/** 页内查找：大小写不敏感；多命中不重叠推进；跨 '\n' 不命中；空/纯空白=空结果 */
+export function findInText(page: PageText, query: string): SearchHit[] {
+  const q = query.toLowerCase()
+  if (q.trim() === '') return []
+  const hay = page.text.toLowerCase()
+  const hits: SearchHit[] = []
+  let from = 0
+  for (;;) {
+    const idx = hay.indexOf(q, from)
+    if (idx < 0) break
+    from = idx + q.length
+    if (page.text.slice(idx, idx + q.length).includes('\n')) continue
+    hits.push({ start: idx, end: idx + q.length, itemRanges: rangesFromMap(page.map, idx, idx + q.length) })
+  }
+  return hits
+}
+
+/** unknown→SearchDoc 结构收窄（ReaderPage 持 pdfDoc 为 unknown；不符=null） */
+export function asSearchDoc(v: unknown): SearchDoc | null {
+  if (typeof v !== 'object' || v === null) return null
+  const w = v as { numPages?: unknown; getPage?: unknown }
+  if (typeof w.numPages !== 'number' || !Number.isInteger(w.numPages) || w.numPages <= 0) return null
+  if (typeof w.getPage !== 'function') return null
+  return v as SearchDoc
+}
+
+/** raw items → PdfTextItem[]：过滤无 str 的结构项（PdfPageCanvas 同款防御——
+ *  includeMarkedContent 默认关闭，此处兜底防结构项混入破坏 item→span 映射） */
+export function toTextItems(raw: unknown): PdfTextItem[] {
+  if (!Array.isArray(raw)) return []
+  return raw.filter((it): it is PdfTextItem => typeof (it as { str?: unknown })?.str === 'string')
+}
+
+/** 视口盒→根盒相对像素（高亮块绝对定位输入；w/h 原样透传） */
+export function toPageRelative(clientRect: DOMRect, rootRect: DOMRect): { x: number; y: number; w: number; h: number } {
+  return {
+    x: clientRect.x - rootRect.x,
+    y: clientRect.y - rootRect.y,
+    w: clientRect.width,
+    h: clientRect.height
+  }
+}
+
+/** .textLayer span 按序映射：数量与 itemCount 一致→span 数组；不符→null
+ *  （防御：该页不高亮只计数——items 与 TextLayer span 严格同序同数是 pdfjs
+ *  4.10 契约，破坏即降级） */
+export function spansForItems(pageRoot: HTMLElement, itemCount: number): (HTMLSpanElement | null)[] | null {
+  const textLayer = pageRoot.querySelector('.textLayer')
+  if (textLayer === null) return null
+  const spans = Array.from(textLayer.querySelectorAll('span'))
+  if (spans.length !== itemCount) return null
+  return spans as HTMLSpanElement[]
+}
diff --git a/src/renderer/features/reader/useReaderSearch.tsx b/src/renderer/features/reader/useReaderSearch.tsx
new file mode 100644
index 0000000000..6edf1f6e2b
--- /dev/null
+++ b/src/renderer/features/reader/useReaderSearch.tsx
@@ -0,0 +1,106 @@
+/**
+ * [P7E-03] useReaderSearch —— 页内搜索装配 hook（ReaderPage 组合根接线）。
+ *
+ * ── 行为层 ──
+ * - ① 换文档/换 tab 清面板（INV-55）：fileUrl 键效应——变化即 searchStore.
+ *   reset()（搜索会话生命周期挂 reader 视图文档身份；fileUrl 不变的重挂
+ *   （视图切换往返）不清——身份未变）。
+ * - ② Ctrl+F：独立 keymap id 'reader-search'（registerKeymap/unregisterKeymap
+ *   成对——INV-14；**不经 ReaderShortcuts 绑定表**，其受锁测试面零改）→
+ *   searchStore.open()。editable 避让由 keymap 层承担；焦点已驻输入框时的
+ *   Ctrl+F 由 ReaderSearchBox 本地等价路径覆盖（该文件头注）。
+ * - ③ 翻页联动接线：registerPageTurner——目标匹配页≠当前可见页（tab.page）
+ *   时 reader.store.setPage(page,{scroll:'to'})（INV-29 程序滚动通道，页盒
+ *   顶入视口；页内居中归 SearchHighlightLayer 第二段）。
+ * - ④ 订阅 store 产 <ReaderSearchBox> 受控节点返回（ReaderToolbar slot 消费）。
+ *
+ * ── 接口层 ──
+ * - export function useReaderSearch(pdfDoc: unknown, fileUrl: string): ReactNode
+ *
+ * ── 架构层 ──
+ * - reader-search.store 与 reader.store 零互相 import（联动经本装配面注入
+ *   回调——可测性=CorpusExtractor deps 注入同型）；pdfDoc 保持 unknown 传入
+ *   （结构收窄归 reader-search.asSearchDoc）
+ *
+ * ── 生命周期层 ── / ── 文化层 ──
+ * - 三个 effect 均注册/注销成对（keymap/pageTurner）；fileUrl 键效应纯重置
+ */
+import { useEffect, useRef } from 'react'
+import type { ReactNode } from 'react'
+import { registerKeymap, unregisterKeymap } from '../../shared/keymap'
+import { readActiveTab } from './useActiveTab'
+import { useReaderStore } from './reader.store'
+import { ReaderSearchBox } from './ReaderSearchBox'
+import { useReaderSearchStore } from './reader-search.store'
+
+/** 本 hook 在 keymap 的注册 id（唯一来源，卸载成对注销——INV-14） */
+const KEYMAP_ID = 'reader-search'
+
+export function useReaderSearch(pdfDoc: unknown, fileUrl: string): ReactNode {
+  // ① fileUrl 变化（换文档/换 tab）→ 搜索会话全清（INV-55）
+  const prevFileUrl = useRef<string | null>(null)
+  useEffect(() => {
+    if (prevFileUrl.current !== null && prevFileUrl.current !== fileUrl) {
+      useReaderSearchStore.getState().reset()
+    }
+    prevFileUrl.current = fileUrl
+  }, [fileUrl])
+
+  // ② Ctrl+F → open()（S1/S12：再按=focusSeq++ 重聚焦全选，不重搜）
+  useEffect(() => {
+    registerKeymap(KEYMAP_ID, [
+      {
+        key: 'f',
+        ctrl: true,
+        preventDefault: true,
+        handler: () => {
+          useReaderSearchStore.getState().open()
+        }
+      }
+    ])
+    return () => {
+      unregisterKeymap(KEYMAP_ID)
+    }
+  }, [])
+
+  // ③ 翻页联动：目标匹配页≠当前可见页 → setPage 程序滚动（INV-29）
+  useEffect(() => {
+    useReaderSearchStore.getState().registerPageTurner((page) => {
+      const t = readActiveTab()
+      if (t !== undefined && t.page !== page) {
+        useReaderStore.getState().setPage(page, { scroll: 'to' })
+      }
+    })
+    return () => {
+      useReaderSearchStore.getState().registerPageTurner(null)
+    }
+  }, [])
+
+  // ④ 受控节点（idle 态组件自隐——slot 恒收元素，缺席兜底归测试夹具路径）
+  const search = useReaderSearchStore()
+  return (
+    <ReaderSearchBox
+      state={search.state}
+      query={search.query}
+      lastSubmitted={search.lastSubmitted}
+      matchCount={search.matches.length}
+      activeIndex={search.activeIndex}
+      focusSeq={search.focusSeq}
+      onQueryChange={(q) => {
+        useReaderSearchStore.getState().setQuery(q)
+      }}
+      onSubmit={(q) => {
+        void useReaderSearchStore.getState().submit(pdfDoc, q)
+      }}
+      onPrev={() => {
+        useReaderSearchStore.getState().prev()
+      }}
+      onNext={() => {
+        useReaderSearchStore.getState().next()
+      }}
+      onClose={() => {
+        useReaderSearchStore.getState().close()
+      }}
+    />
+  )
+}
diff --git a/tests/e2e/reader-search.spec.ts b/tests/e2e/reader-search.spec.ts
new file mode 100644
index 0000000000..c577dc7d07
--- /dev/null
+++ b/tests/e2e/reader-search.spec.ts
@@ -0,0 +1,154 @@
+import { test, expect, _electron as electron, type ElectronApplication } from '@playwright/test'
+import { spawn } from 'node:child_process'
+import { copyFile, mkdtemp, readdir, readFile, writeFile } from 'node:fs/promises'
+import { createHash } from 'node:crypto'
+import { mkdirSync, writeFileSync } from 'node:fs'
+import { tmpdir } from 'node:os'
+import { dirname, join } from 'node:path'
+import { isTicketDone } from '../../tickets/registry'
+import { createMultiPagePdf, PDF_KNOWN_TEXT } from '../utils/pdf-factory'
+
+/** 拉起子进程跑 seed-paper.mjs；退出码非 0 即拒绝（错误细节走 stdio 继承） */
+function runSeedScript(env: NodeJS.ProcessEnv): Promise<void> {
+  return new Promise((resolve, reject) => {
+    const child = spawn(process.execPath, [join(process.cwd(), 'tests', 'e2e', 'seed-paper.mjs')], {
+      env,
+      stdio: 'inherit'
+    })
+    child.on('exit', (code) => {
+      if (code === 0) {
+        resolve()
+      } else {
+        reject(new Error(`seed-paper.mjs 退出码 ${code ?? 'null'}`))
+      }
+    })
+    child.on('error', reject)
+  })
+}
+
+/**
+ * [P7E-03] 页内高亮搜索 e2e：装配级全链（fixture=createMultiPagePdf(3)，每页
+ * 单行 `P<n> SMART WATER TEST DOC`——小写查询跨大小写命中每页恰 1 处）。
+ * 链：打开文献→Ctrl+F（面板开+输入框聚焦）→输入小写 `smart water`→Enter
+ * （提交搜索）→页 1 高亮块可见（计算样式+几何——jsdom 不可达面在此真机
+ * Chromium 断言）+计数 1/3→Enter（下一处）→P2 文本入视口+计数 2/3+页 2
+ * 高亮可见（两段式滚动：setPage 页盒顶→active 居中）→Esc→高亮清零+面板关。
+ * 形态 crib reader-text.spec.ts（seedAndLaunch 配方/双 ABI seed/launch 帮手）。
+ */
+const DEPS = ['SR-RDR-02', 'SR-LIB-01', 'SR-LIB-02', 'SR-RDR-04', 'SR2-F-01'] as const
+
+/** 依赖未就绪则整测延期（翻 done 即激活）；不挂本票自身号——防恒绿假阳 */
+function skipIfPending(deps: readonly string[]): void {
+  const pending = deps.filter((d) => !isTicketDone(d))
+  test.skip(pending.length > 0, `延期：依赖工单未完成 [${pending.join(', ')}]`)
+}
+
+function launch(userData: string): Promise<ElectronApplication> {
+  return electron.launch({
+    args: ['out/main/index.js'],
+    env: { ...process.env, SYNAPSE_USER_DATA: userData } as Record<string, string>
+  })
+}
+
+/**
+ * 种子落库（better-sqlite3 双 ABI 处理，reader-text.spec 同配方）：
+ * 备份 electron 绑定→换 abi-cache 里本进程 ABI 的 node 绑定→子进程落库→
+ * finally 恢复（Windows 文件锁——落库必须在子进程）。
+ */
+async function seedPaperRow(userData: string, fileRef: string, sha: string, title: string): Promise<void> {
+  const pkgDir = join(process.cwd(), 'node_modules', 'better-sqlite3')
+  const releaseBinding = join(pkgDir, 'build', 'Release', 'better_sqlite3.node')
+  const cacheDir = join(pkgDir, 'abi-cache')
+  const wanted = `node-v${process.versions.modules}`
+  const dirs = (await readdir(cacheDir)).filter((d) => d.startsWith('node-v'))
+  const pick = dirs.includes(wanted) ? wanted : (dirs.sort().at(-1) ?? '')
+  if (!pick) throw new Error('abi-cache 缺 node 绑定——先跑 npm ci（postinstall 会 setup）')
+  const electronBinding = await readFile(releaseBinding)
+  await copyFile(join(cacheDir, pick, 'better_sqlite3.node'), releaseBinding)
+  try {
+    await runSeedScript({
+      ...process.env,
+      SEED_DB: join(userData, 'synapse.db'),
+      SEED_FILE_REF: fileRef,
+      SEED_SHA: sha,
+      SEED_TITLE: title,
+      SEED_ID: 'e2e-seed-p7e03'
+    } as NodeJS.ProcessEnv)
+  } finally {
+    await writeFile(releaseBinding, electronBinding)
+  }
+}
+
+test('P7E-03 页内高亮搜索全链：Ctrl+F→小写查询→逐处跳页高亮→Esc 清零', async () => {
+  // 两跳 Electron 启动+建库迁移占大头（首跑实测 51.9s 贴 60s 默认线——机器
+  // 抖动越界实测一次）；预算提到 120s（z-wg1-probe 先例同款）
+  test.setTimeout(120_000)
+  skipIfPending(DEPS)
+  const title = '智慧水务 e2e 页内搜索文献'
+  const userData = await mkdtemp(join(tmpdir(), 'synapse-p7e03-'))
+
+  // 第一跳：让应用自己完成建库迁移（reader-text.spec 同配方）
+  const seedApp = await launch(userData)
+  await (await seedApp.firstWindow()).waitForTimeout(500)
+  await seedApp.close()
+
+  // 3 页受管文件（每页单行 P<n> KNOWN——`smart water` 每页恰 1 命中）
+  const bytes = createMultiPagePdf(3, PDF_KNOWN_TEXT)
+  const sha = createHash('sha256').update(bytes).digest('hex')
+  const fileRef = `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`
+  const abs = join(userData, 'files', ...fileRef.split('/'))
+  mkdirSync(dirname(abs), { recursive: true })
+  writeFileSync(abs, bytes)
+  await seedPaperRow(userData, fileRef, sha, title)
+
+  const app = await launch(userData)
+  const win = await app.firstWindow()
+  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
+  await win.getByText(title).first().dblclick()
+  await expect(win.getByText(`P1 ${PDF_KNOWN_TEXT}`).first()).toBeVisible({ timeout: 20_000 })
+
+  // —— S1：Ctrl+F → 面板开+输入框聚焦（keymap 'reader-search'，非 editable 目标）——
+  await win.keyboard.press('Control+f')
+  const input = win.getByTestId('reader-search-input')
+  await expect(input).toBeVisible()
+  await expect(input).toBeFocused()
+
+  // —— S3：小写查询提交 → searching→done；首匹配 active；计数 1/3 ——
+  await input.fill('smart water')
+  await win.keyboard.press('Enter')
+  await expect(win.getByTestId('reader-search-count')).toHaveText('1/3')
+
+  // 页 1 高亮块：计算样式防线（Q3b 同族——几何可见≠视觉可见）：
+  // 背景=var(--accent-soft) 解析值、层序 z=1（colorBlocks 背景板语言）、穿透
+  const hlLayer = win.locator('[data-page-box="1"] [data-testid="search-highlight-layer"]').first()
+  await expect(hlLayer).toBeVisible()
+  await expect(hlLayer).toHaveCSS('z-index', '1')
+  await expect(hlLayer).toHaveCSS('pointer-events', 'none')
+  const activeHl = win.locator('[data-page-box="1"] [data-testid="search-hl"][data-active="true"]').first()
+  await expect(activeHl).toBeVisible()
+  await expect(activeHl).toHaveCSS('background-color', 'rgb(220, 235, 245)')
+  await expect(activeHl).toHaveCSS('outline-style', 'solid')
+
+  // 几何防线：active 块与被匹配文本行盒垂直同带+水平覆盖过半（滚动平移不变量）
+  const hlBox = await activeHl.boundingBox()
+  const textBox = await win.getByText(`P1 ${PDF_KNOWN_TEXT}`).first().boundingBox()
+  expect(hlBox).not.toBeNull()
+  expect(textBox).not.toBeNull()
+  expect(Math.abs(hlBox!.y + hlBox!.height / 2 - (textBox!.y + textBox!.height / 2))).toBeLessThanOrEqual(textBox!.height)
+  expect(hlBox!.width).toBeGreaterThanOrEqual(textBox!.width * 0.4)
+
+  // —— S4：Enter（再按=下一处）→ active 2/3；两段式滚动：setPage 页 2 盒顶入
+  //    视口+active 居中——P2 文本入视口+页 2 高亮可见 ——
+  await win.keyboard.press('Enter')
+  await expect(win.getByTestId('reader-search-count')).toHaveText('2/3')
+  await expect(win.getByText(`P2 ${PDF_KNOWN_TEXT}`).first()).toBeVisible({ timeout: 10_000 })
+  const activeHl2 = win.locator('[data-page-box="2"] [data-testid="search-hl"][data-active="true"]').first()
+  await expect(activeHl2).toBeVisible({ timeout: 10_000 })
+
+  // —— S6：Esc → idle：面板关+高亮清零 ——
+  await win.keyboard.press('Escape')
+  await expect(win.getByTestId('reader-search-box')).toHaveCount(0)
+  await expect(win.getByTestId('search-hl')).toHaveCount(0)
+  await expect(win.getByText(`P2 ${PDF_KNOWN_TEXT}`).first()).toBeVisible({ timeout: 5_000 })
+  await app.close()
+})
diff --git a/tests/unit/renderer/reader-search-text.test.tsx b/tests/unit/renderer/reader-search-text.test.tsx
new file mode 100644
index 0000000000..ca80295ed6
--- /dev/null
+++ b/tests/unit/renderer/reader-search-text.test.tsx
@@ -0,0 +1,136 @@
+// @vitest-environment jsdom
+/**
+ * [P7E-03] 页内高亮搜索 —— 纯函数面（reader-search.ts；锁定合约，always-active，
+ * 不经 guardedDescribe）。
+ *
+ * 覆盖：buildPageText 拼接+hasEOL 插行+字符映射（含换行哨兵）；findInText
+ * 大小写不敏感/多命中不重叠/itemRanges 归组/CJK 跨 item 命中/跨 '\n' 不命中/
+ * 空与纯空白查询空结果；toPageRelative 视口盒→根相对数学；spansForItems
+ * 数量符/不符两径（.textLayer 缺席=null）；asSearchDoc unknown→结构收窄；
+ * toTextItems 非 str 项过滤（PdfPageCanvas 同款防御）。
+ */
+import { describe, expect, it } from 'vitest'
+import {
+  asSearchDoc,
+  buildPageText,
+  findInText,
+  spansForItems,
+  toPageRelative,
+  toTextItems
+} from '../../../src/renderer/features/reader/reader-search'
+import type { PdfTextItem } from '../../../src/renderer/features/reader/PdfPageCanvas'
+
+function item(str: string, hasEOL = false): PdfTextItem {
+  return { str, hasEOL, dir: 'ltr', width: 10, height: 10, transform: [1, 0, 0, 1, 0, 0], fontName: 'F1' }
+}
+
+/** 视口盒桩（DOMRect 结构子集——toPageRelative 只读 x/y/width/height） */
+function rect(x: number, y: number, w: number, h: number): DOMRect {
+  return { x, y, width: w, height: h, top: y, left: x, right: x + w, bottom: y + h, toJSON: () => ({}) } as DOMRect
+}
+
+describe('P7E-03 reader-search 纯函数 —— buildPageText', () => {
+  it('拼接 items.str；hasEOL 项后插换行；map 逐字符映射且换行位为哨兵（-1/-1）', () => {
+    const { text, map } = buildPageText([item('AB'), item('C', true), item('D')])
+    expect(text).toBe('ABC\nD')
+    // map 与 text 同长（换行占位=哨兵，保证 text 下标可直接查 map）
+    expect(map).toHaveLength(text.length)
+    expect(map[0]).toEqual({ itemIndex: 0, offsetInItem: 0 })
+    expect(map[1]).toEqual({ itemIndex: 0, offsetInItem: 1 })
+    expect(map[2]).toEqual({ itemIndex: 1, offsetInItem: 0 })
+    // 换行哨兵：hasEOL 项后插入的 '\n' 无 item 归属
+    expect(map[3]).toEqual({ itemIndex: -1, offsetInItem: -1 })
+    expect(map[4]).toEqual({ itemIndex: 2, offsetInItem: 0 })
+  })
+
+  it('空 items 退化：空文本空映射', () => {
+    const { text, map } = buildPageText([])
+    expect(text).toBe('')
+    expect(map).toEqual([])
+  })
+})
+
+describe('P7E-03 reader-search 纯函数 —— findInText', () => {
+  it('大小写不敏感（两侧 toLowerCase）+多命中不重叠推进', () => {
+    const page = buildPageText([item('Smart WATER smart')])
+    const hits = findInText(page, 'SMART')
+    expect(hits).toHaveLength(2)
+    expect(hits[0]).toMatchObject({ start: 0, end: 5 })
+    expect(hits[1]).toMatchObject({ start: 12, end: 17 })
+  })
+
+  it('item 内偏移命中：itemRanges 归组为单区间 {itemIndex,s0,s1}', () => {
+    const page = buildPageText([item('SMART WATER')])
+    const hits = findInText(page, 'art')
+    expect(hits).toHaveLength(1)
+    expect(hits[0]!.itemRanges).toEqual([{ itemIndex: 0, s0: 2, s1: 5 }])
+  })
+
+  it('CJK 跨 item 命中：字符映射跨多个文本项仍单命中多区间', () => {
+    const page = buildPageText([item('智'), item('慧'), item('水务管理')])
+    const hits = findInText(page, '智慧水务')
+    expect(hits).toHaveLength(1)
+    expect(hits[0]!.itemRanges).toEqual([
+      { itemIndex: 0, s0: 0, s1: 1 },
+      { itemIndex: 1, s0: 0, s1: 1 },
+      { itemIndex: 2, s0: 0, s1: 2 }
+    ])
+  })
+
+  it('跨换行不命中（hasEOL 插入的 \n 拒绝行界两侧拼接）；行内命中不受影响', () => {
+    const page = buildPageText([item('AB', true), item('CD')])
+    expect(findInText(page, 'BC')).toHaveLength(0)
+    expect(findInText(page, 'cd')).toHaveLength(1)
+  })
+
+  it('空查询与纯空白查询=空结果（调用方拒的双保险）', () => {
+    const page = buildPageText([item('SMART')])
+    expect(findInText(page, '')).toEqual([])
+    expect(findInText(page, '   ')).toEqual([])
+  })
+})
+
+describe('P7E-03 reader-search 纯函数 —— toPageRelative / spansForItems', () => {
+  it('toPageRelative：视口盒减页根盒=页根相对像素（w/h 原样透传）', () => {
+    expect(toPageRelative(rect(110, 50, 30, 10), rect(100, 20, 612, 792))).toEqual({ x: 10, y: 30, w: 30, h: 10 })
+    expect(toPageRelative(rect(5, 5, 8, 4), rect(5, 5, 612, 792))).toEqual({ x: 0, y: 0, w: 8, h: 4 })
+  })
+
+  it('spansForItems：.textLayer span 按序映射；数量不符→null（防御：该页不高亮）', () => {
+    const root = document.createElement('div')
+    const layer = document.createElement('div')
+    layer.className = 'textLayer'
+    root.appendChild(layer)
+    const spans = ['甲', '乙'].map((t) => {
+      const s = document.createElement('span')
+      s.textContent = t
+      layer.appendChild(s)
+      return s
+    })
+    expect(spansForItems(root, 2)).toEqual(spans)
+    expect(spansForItems(root, 3)).toBeNull()
+    expect(spansForItems(root, 1)).toBeNull()
+    const bare = document.createElement('div')
+    expect(spansForItems(bare, 1)).toBeNull()
+  })
+})
+
+describe('P7E-03 reader-search 纯函数 —— asSearchDoc / toTextItems', () => {
+  it('asSearchDoc：unknown→结构收窄（numPages 正整数+getPage 函数）；不符=null', () => {
+    expect(asSearchDoc(null)).toBeNull()
+    expect(asSearchDoc('doc')).toBeNull()
+    expect(asSearchDoc({ numPages: 3 })).toBeNull()
+    expect(asSearchDoc({ getPage: (): void => undefined })).toBeNull()
+    const doc = { numPages: 2, getPage: async () => ({ getTextContent: async () => ({ items: [] }) }) }
+    expect(asSearchDoc(doc)).toBe(doc)
+    expect(asSearchDoc({ numPages: 0, getPage: doc.getPage })).toBeNull()
+    expect(asSearchDoc({ numPages: 1.5, getPage: doc.getPage })).toBeNull()
+  })
+
+  it('toTextItems：过滤无 str 的结构项（marked content）；非数组=空', () => {
+    const full = item('A')
+    expect(toTextItems([full, { tag: 'MCR' }])).toEqual([full])
+    expect(toTextItems([full])).toEqual([full])
+    expect(toTextItems('not-array')).toEqual([])
+  })
+})
diff --git a/tests/unit/renderer/reader-search-ui.test.tsx b/tests/unit/renderer/reader-search-ui.test.tsx
new file mode 100644
index 0000000000..676a811de5
--- /dev/null
+++ b/tests/unit/renderer/reader-search-ui.test.tsx
@@ -0,0 +1,353 @@
+// @vitest-environment jsdom
+/**
+ * [P7E-03] 页内高亮搜索 —— UI 面（锁定合约，always-active）。
+ *
+ * 覆盖：ReaderSearchBox 键位三件（Enter 提交/再按下一处/改词重提交、Shift+Enter
+ * 上一处、Esc 关闭）+计数展示三态（searching 文案/0 命中文案/序数）+focusSeq
+ * 聚焦全选+‹›× 三按钮；SearchHighlightLayer done 态按页过滤渲染+active 强调
+ * 属性+几何样式（Range.getClientRects 桩——clientRects 零长面=渲染存在性与
+ * px 样式断言，真几何归 e2e）+idle/searching 零渲染+span 数不符跳过；
+ * ReaderToolbar slot 传/不传两态（缺席=旧占位 span 兜底）。
+ * 形态 crib selection-mode.test.tsx（store setState 直植/mount/remount）。
+ */
+import { act } from 'react'
+import { createRoot, type Root } from 'react-dom/client'
+import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
+import { ReaderSearchBox } from '../../../src/renderer/features/reader/ReaderSearchBox'
+import { SearchHighlightLayer } from '../../../src/renderer/features/reader/SearchHighlightLayer'
+import { ReaderToolbar } from '../../../src/renderer/features/reader/ReaderToolbar'
+import {
+  createReaderSearchInitialState,
+  useReaderSearchStore
+} from '../../../src/renderer/features/reader/reader-search.store'
+
+let root: Root | null = null
+let host: HTMLDivElement | null = null
+
+function mount(node: JSX.Element): void {
+  host = document.createElement('div')
+  document.body.appendChild(host)
+  root = createRoot(host)
+  act(() => {
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
+/** 视口盒桩（Range.getClientRects 返回元素——toPageRelative 只读 x/y/width/height） */
+function rect(x: number, y: number, w: number, h: number): DOMRect {
+  return { x, y, width: w, height: h, top: y, left: x, right: x + w, bottom: y + h, toJSON: () => ({}) } as DOMRect
+}
+
+/** 页根桩：.textLayer 内按序 spans（SearchHighlightLayer 量测输入） */
+function makePageRoot(spanTexts: string[]): HTMLDivElement {
+  const root = document.createElement('div')
+  const layer = document.createElement('div')
+  layer.className = 'textLayer'
+  for (const t of spanTexts) {
+    const s = document.createElement('span')
+    s.textContent = t
+    layer.appendChild(s)
+  }
+  root.appendChild(layer)
+  return root
+}
+
+function searchBoxInput(): HTMLInputElement {
+  const el = host!.querySelector<HTMLInputElement>('[data-testid="reader-search-input"]')
+  expect(el).not.toBeNull()
+  return el!
+}
+
+function pressKey(el: HTMLElement, key: string, opts?: { shift?: boolean; ctrl?: boolean }): void {
+  act(() => {
+    el.dispatchEvent(
+      new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, shiftKey: opts?.shift === true, ctrlKey: opts?.ctrl === true })
+    )
+  })
+}
+
+function boxProps(over: Partial<Parameters<typeof ReaderSearchBox>[0]>): Parameters<typeof ReaderSearchBox>[0] {
+  return {
+    state: 'open',
+    query: '',
+    lastSubmitted: '',
+    matchCount: 0,
+    activeIndex: 0,
+    focusSeq: 1,
+    onQueryChange: () => undefined,
+    onSubmit: () => undefined,
+    onPrev: () => undefined,
+    onNext: () => undefined,
+    onClose: () => undefined,
+    ...over
+  }
+}
+
+beforeEach(() => {
+  ;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
+  // rAF 同步化（jsdom 假帧——量测 effect 即时收敛）
+  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback): number => {
+    cb(0)
+    return 0
+  })
+  // Range 几何桩：jsdom 无 getClientRects 实现（定义注入）；真布局归 e2e——
+  // jsdom 只断渲染存在性与 px 样式映射
+  Object.defineProperty(Range.prototype, 'getClientRects', {
+    value: vi.fn((): DOMRectList => [rect(110, 60, 40, 12)] as unknown as DOMRectList),
+    configurable: true
+  })
+  // scrollIntoView jsdom 无实现——active 居中路径的可观测桩
+  Object.defineProperty(Element.prototype, 'scrollIntoView', { value: vi.fn(), configurable: true })
+  useReaderSearchStore.setState(createReaderSearchInitialState())
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
+  vi.restoreAllMocks()
+  useReaderSearchStore.setState(createReaderSearchInitialState())
+})
+
+describe('P7E-03 ReaderSearchBox —— 键位与展示', () => {
+  it('Enter 提交：query≠lastSubmitted（或未 done）→ onSubmit(query)，不触发 onNext', () => {
+    const onSubmit = vi.fn()
+    const onNext = vi.fn()
+    mount(<ReaderSearchBox {...boxProps({ state: 'open', query: 'smart', lastSubmitted: '', onSubmit, onNext })} />)
+    pressKey(searchBoxInput(), 'Enter')
+    expect(onSubmit).toHaveBeenCalledTimes(1)
+    expect(onSubmit).toHaveBeenCalledWith('smart')
+    expect(onNext).not.toHaveBeenCalled()
+  })
+
+  it('Enter 再按=下一处：done+query===lastSubmitted → onNext（不 onSubmit）', () => {
+    const onSubmit = vi.fn()
+    const onNext = vi.fn()
+    mount(<ReaderSearchBox {...boxProps({ state: 'done', query: 'smart', lastSubmitted: 'smart', matchCount: 3, onSubmit, onNext })} />)
+    pressKey(searchBoxInput(), 'Enter')
+    expect(onNext).toHaveBeenCalledTimes(1)
+    expect(onSubmit).not.toHaveBeenCalled()
+  })
+
+  it('Enter 改词后=重新提交新查询（done+query≠lastSubmitted → onSubmit）', () => {
+    const onSubmit = vi.fn()
+    const onNext = vi.fn()
+    mount(<ReaderSearchBox {...boxProps({ state: 'done', query: 'water', lastSubmitted: 'smart', matchCount: 3, onSubmit, onNext })} />)
+    pressKey(searchBoxInput(), 'Enter')
+    expect(onSubmit).toHaveBeenCalledTimes(1)
+    expect(onSubmit).toHaveBeenCalledWith('water')
+    expect(onNext).not.toHaveBeenCalled()
+  })
+
+  it('Shift+Enter=上一处（同规则：done+同查询 → onPrev；改词则仍提交）', () => {
+    const onSubmit = vi.fn()
+    const onPrev = vi.fn()
+    mount(<ReaderSearchBox {...boxProps({ state: 'done', query: 'smart', lastSubmitted: 'smart', matchCount: 3, onSubmit, onPrev })} />)
+    pressKey(searchBoxInput(), 'Enter', { shift: true })
+    expect(onPrev).toHaveBeenCalledTimes(1)
+    expect(onSubmit).not.toHaveBeenCalled()
+  })
+
+  it('Esc → onClose', () => {
+    const onClose = vi.fn()
+    mount(<ReaderSearchBox {...boxProps({ onClose })} />)
+    pressKey(searchBoxInput(), 'Escape')
+    expect(onClose).toHaveBeenCalledTimes(1)
+  })
+
+  it('searching 态：计数位显示「搜索中…」', () => {
+    mount(<ReaderSearchBox {...boxProps({ state: 'searching', query: 'smart' })} />)
+    expect(host!.querySelector('[data-testid="reader-search-count"]')!.textContent).toBe('搜索中…')
+  })
+
+  it('done 0 命中：计数「0/0」+「无匹配」提示', () => {
+    mount(<ReaderSearchBox {...boxProps({ state: 'done', query: 'zzz', lastSubmitted: 'zzz', matchCount: 0 })} />)
+    expect(host!.querySelector('[data-testid="reader-search-count"]')!.textContent).toBe('0/0')
+    expect(host!.textContent).toContain('无匹配')
+  })
+
+  it('done 命中集：计数 `${activeIndex+1}/${matchCount}`（activeIndex 0 基）', () => {
+    mount(<ReaderSearchBox {...boxProps({ state: 'done', query: 'smart', lastSubmitted: 'smart', matchCount: 3, activeIndex: 1 })} />)
+    expect(host!.querySelector('[data-testid="reader-search-count"]')!.textContent).toBe('2/3')
+  })
+
+  it('focusSeq 变化 → input.focus()+select()（全选 query）', () => {
+    mount(<ReaderSearchBox {...boxProps({ state: 'open', query: 'smart', focusSeq: 1 })} />)
+    const input = searchBoxInput()
+    expect(document.activeElement).toBe(input)
+    remount(<ReaderSearchBox {...boxProps({ state: 'open', query: 'smartwater', focusSeq: 2 })} />)
+    expect(document.activeElement).toBe(input)
+    expect(input.selectionStart).toBe(0)
+    expect(input.selectionEnd).toBe('smartwater'.length)
+  })
+
+  it('‹ › × 三按钮：aria-label 到位+点击分别调 onPrev/onNext/onClose', () => {
+    const onPrev = vi.fn()
+    const onNext = vi.fn()
+    const onClose = vi.fn()
+    mount(<ReaderSearchBox {...boxProps({ state: 'done', matchCount: 2, onPrev, onNext, onClose })} />)
+    const byLabel = (label: string): HTMLButtonElement => {
+      const b = host!.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)
+      expect(b).not.toBeNull()
+      return b!
+    }
+    act(() => {
+      byLabel('上一个').click()
+    })
+    expect(onPrev).toHaveBeenCalledTimes(1)
+    act(() => {
+      byLabel('下一个').click()
+    })
+    expect(onNext).toHaveBeenCalledTimes(1)
+    act(() => {
+      byLabel('关闭搜索').click()
+    })
+    expect(onClose).toHaveBeenCalledTimes(1)
+  })
+
+  it('idle → 零渲染（面板关；受控组件自隐）', () => {
+    mount(<ReaderSearchBox {...boxProps({ state: 'idle' })} />)
+    expect(host!.querySelector('[data-testid="reader-search-box"]')).toBeNull()
+  })
+})
+
+describe('P7E-03 SearchHighlightLayer —— 渲染面', () => {
+  /** 植入 done 态：两页命中（页 0/页 1 各一）+pageItems 两页 */
+  function plantDone(activeIndex: number): void {
+    useReaderSearchStore.setState({
+      state: 'done',
+      query: 'smart',
+      lastSubmitted: 'smart',
+      matches: [
+        { page: 0, itemRanges: [{ itemIndex: 0, s0: 0, s1: 5 }] },
+        { page: 1, itemRanges: [{ itemIndex: 1, s0: 2, s1: 7 }] }
+      ],
+      activeIndex,
+      pageItems: {
+        0: [
+          { str: 'SMART WATER', hasEOL: false, dir: 'ltr', width: 1, height: 1, transform: [], fontName: 'F1' },
+          { str: 'x', hasEOL: false, dir: 'ltr', width: 1, height: 1, transform: [], fontName: 'F1' }
+        ],
+        1: [
+          { str: 'a', hasEOL: false, dir: 'ltr', width: 1, height: 1, transform: [], fontName: 'F1' },
+          { str: 'b SMART c', hasEOL: false, dir: 'ltr', width: 1, height: 1, transform: [], fontName: 'F1' }
+        ]
+      },
+      focusSeq: 1
+    })
+  }
+
+  it('done 态按页过滤渲染：本页匹配产 hl 块+px 几何（toPageRelative 数学）+active 强调', () => {
+    plantDone(0)
+    const pageRoot = makePageRoot(['SMART WATER', 'x'])
+    // 页根盒偏移桩：视口盒(110,60)−根盒(100,50)=页内相对(10,10)
+    vi.spyOn(pageRoot.querySelector('.textLayer')!, 'getBoundingClientRect').mockReturnValue(rect(100, 50, 612, 792))
+    mount(<SearchHighlightLayer page={0} pageRoot={pageRoot} />)
+    const hls = host!.querySelectorAll<HTMLElement>('[data-testid="search-hl"]')
+    expect(hls).toHaveLength(1)
+    expect(hls[0]!.style.left).toBe('10px')
+    expect(hls[0]!.style.top).toBe('10px')
+    expect(hls[0]!.style.width).toBe('40px')
+    expect(hls[0]!.style.height).toBe('12px')
+    // S3：首匹配 active——data-active 强调属性+accent 描边+层序/穿透
+    expect(hls[0]!.getAttribute('data-active')).toBe('true')
+    expect(hls[0]!.style.outline).toContain('var(--accent)')
+    const layer = host!.querySelector<HTMLElement>('[data-testid="search-highlight-layer"]')!
+    expect(layer.style.zIndex).toBe('1')
+    expect(layer.style.pointerEvents).toBe('none')
+    expect(hls[0]!.style.backgroundColor).toBe('var(--accent-soft)')
+  })
+
+  it('active 匹配切换：activeIndex=1 时本页（页 0）块非 active；居中滚动只滚 active 块', () => {
+    plantDone(0)
+    const pageRoot = makePageRoot(['SMART WATER', 'x'])
+    mount(<SearchHighlightLayer page={0} pageRoot={pageRoot} />)
+    const hl = host!.querySelector<HTMLElement>('[data-testid="search-hl"]')!
+    expect(hl.getAttribute('data-active')).toBe('true')
+    const scrollIntoView = Element.prototype.scrollIntoView as ReturnType<typeof vi.fn>
+    // 切 active 到页 1：本页块转非 active（强调跟 activeIndex 走）
+    act(() => {
+      useReaderSearchStore.setState({ activeIndex: 1 })
+    })
+    const hlAfter = host!.querySelector<HTMLElement>('[data-testid="search-hl"]')!
+    expect(hlAfter.getAttribute('data-active')).toBe('false')
+    expect(hlAfter.style.outline).toBe('')
+    expect(scrollIntoView).toHaveBeenCalledTimes(1)
+  })
+
+  it('idle/searching 态零渲染', () => {
+    plantDone(0)
+    const pageRoot = makePageRoot(['SMART WATER', 'x'])
+    mount(<SearchHighlightLayer page={0} pageRoot={pageRoot} />)
+    expect(host!.querySelectorAll('[data-testid="search-hl"]').length).toBeGreaterThan(0)
+    act(() => {
+      useReaderSearchStore.setState({ state: 'searching' })
+    })
+    expect(host!.querySelectorAll('[data-testid="search-hl"]')).toHaveLength(0)
+    act(() => {
+      useReaderSearchStore.setState({ state: 'idle' })
+    })
+    expect(host!.querySelectorAll('[data-testid="search-hl"]')).toHaveLength(0)
+  })
+
+  it('span 数不符（items 3 vs spans 2）→ 该页跳过高亮（防御：只计数不渲染）', () => {
+    useReaderSearchStore.setState({
+      state: 'done',
+      query: 'smart',
+      lastSubmitted: 'smart',
+      matches: [{ page: 0, itemRanges: [{ itemIndex: 2, s0: 0, s1: 5 }] }],
+      activeIndex: 0,
+      pageItems: {
+        0: [
+          { str: 'a', hasEOL: false, dir: 'ltr', width: 1, height: 1, transform: [], fontName: 'F1' },
+          { str: 'b', hasEOL: false, dir: 'ltr', width: 1, height: 1, transform: [], fontName: 'F1' },
+          { str: 'c', hasEOL: false, dir: 'ltr', width: 1, height: 1, transform: [], fontName: 'F1' }
+        ]
+      },
+      focusSeq: 1
+    })
+    mount(<SearchHighlightLayer page={0} pageRoot={makePageRoot(['a', 'b'])} />)
+    expect(host!.querySelectorAll('[data-testid="search-hl"]')).toHaveLength(0)
+  })
+
+  it('匹配在别页：本页层零渲染（按页过滤）', () => {
+    plantDone(0)
+    mount(<SearchHighlightLayer page={2} pageRoot={makePageRoot(['别的页'])} />)
+    expect(host!.querySelectorAll('[data-testid="search-hl"]')).toHaveLength(0)
+  })
+})
+
+describe('P7E-03 ReaderToolbar —— searchBox slot', () => {
+  function toolbarProps(): Parameters<typeof ReaderToolbar>[0] {
+    return {
+      page: 0,
+      totalPages: 10,
+      zoom: 1,
+      color: 'yellow',
+      onNavigate: () => undefined,
+      onZoom: () => undefined,
+      onColor: () => undefined
+    }
+  }
+
+  it('不传 searchBox：旧占位 span 兜底（受锁测试夹具路径零破坏）', () => {
+    mount(<ReaderToolbar {...toolbarProps()} />)
+    expect(host!.textContent).toContain('全库检索请回文献库')
+  })
+
+  it('传 searchBox：渲染 slot 内容+占位缺席（生产装配面恒传）', () => {
+    mount(<ReaderToolbar {...toolbarProps()} searchBox={<b data-testid="slot-probe">搜索面板</b>} />)
+    expect(host!.querySelector('[data-testid="slot-probe"]')).not.toBeNull()
+    expect(host!.textContent).not.toContain('全库检索请回文献库')
+  })
+})
diff --git a/tests/unit/renderer/reader-search.store.test.tsx b/tests/unit/renderer/reader-search.store.test.tsx
new file mode 100644
index 0000000000..3e96bd81f8
--- /dev/null
+++ b/tests/unit/renderer/reader-search.store.test.tsx
@@ -0,0 +1,233 @@
+/**
+ * [P7E-03] 页内高亮搜索 —— 搜索 store 面（reader-search.store.ts；锁定合约，
+ * always-active）。态空间跨格序列 S1~S12 的 store 侧锚（doc 桩注入逐页文本+
+ * 失败注入+外部门闸；代际守卫=旧代页回传后断言 matches 为新代口径）。
+ * 形态 crib reader.store.test.ts / selection-mode.test.tsx（store setState
+ * 直植复位；toast 模块 mock 观测 S10）。
+ */
+import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
+import {
+  createReaderSearchInitialState,
+  useReaderSearchStore
+} from '../../../src/renderer/features/reader/reader-search.store'
+
+const { toastMock } = vi.hoisted(() => ({ toastMock: vi.fn() }))
+vi.mock('../../../src/renderer/shared/ui/toast-store', () => ({ showToast: toastMock }))
+
+/** 单页文本项数组（每段一个 item——组装夹具用） */
+function pageOf(...strs: string[]): { items: unknown[] } {
+  return {
+    items: strs.map((s) => ({ str: s, hasEOL: false, dir: 'ltr', width: 10, height: 10, transform: [], fontName: 'F1' }))
+  }
+}
+
+/** 文档桩：pages[n-1]=该页 item 串数组；gate=每页 getTextContent 前置门闸
+ *  （S7 旧代迟回注入）；failAt=该页 getTextContent 拒绝（S10 失败注入） */
+function makeDoc(
+  pages: string[][],
+  opts?: { failAt?: number; gate?: Promise<void> }
+): unknown {
+  return {
+    numPages: pages.length,
+    getPage: (n: number) =>
+      Promise.resolve({
+        getTextContent: async (): Promise<{ items: unknown[] }> => {
+          if (opts?.gate !== undefined) await opts.gate
+          if (opts?.failAt === n) throw new Error('extract-failed')
+          return pageOf(...(pages[n - 1] ?? []))
+        }
+      })
+  }
+}
+
+beforeEach(() => {
+  useReaderSearchStore.setState(createReaderSearchInitialState())
+  toastMock.mockReset()
+})
+
+afterEach(() => {
+  useReaderSearchStore.setState(createReaderSearchInitialState())
+  useReaderSearchStore.getState().registerPageTurner(null)
+})
+
+describe('P7E-03 搜索 store —— 面板生命周期', () => {
+  it('S1 open：idle→open+focusSeq++（零匹配零高亮输入）', () => {
+    useReaderSearchStore.getState().open()
+    const s = useReaderSearchStore.getState()
+    expect(s.state).toBe('open')
+    expect(s.focusSeq).toBe(1)
+    expect(s.matches).toEqual([])
+  })
+
+  it('S6 close：done→idle 全清（高亮清+query 清）且在途代际失效', async () => {
+    useReaderSearchStore.getState().open()
+    useReaderSearchStore.getState().setQuery('smart')
+    await useReaderSearchStore.getState().submit(makeDoc([['SMART']]), 'smart')
+    expect(useReaderSearchStore.getState().state).toBe('done')
+    useReaderSearchStore.getState().close()
+    const s = useReaderSearchStore.getState()
+    expect(s.state).toBe('idle')
+    expect(s.query).toBe('')
+    expect(s.lastSubmitted).toBe('')
+    expect(s.matches).toEqual([])
+    expect(s.pageItems).toEqual({})
+    expect(s.activeIndex).toBe(0)
+  })
+
+  it('S8 reset：done→idle 全清（换文档/换 tab 调用面）', async () => {
+    await useReaderSearchStore.getState().submit(makeDoc([['SMART']]), 'smart')
+    useReaderSearchStore.getState().reset()
+    const s = useReaderSearchStore.getState()
+    expect(s.state).toBe('idle')
+    expect(s.matches).toEqual([])
+  })
+
+  it('S12 done 再 open：focusSeq++，不重搜（matches 引用不变、state 保持 done）', async () => {
+    useReaderSearchStore.getState().open()
+    await useReaderSearchStore.getState().submit(makeDoc([['SMART'], ['SMART two']]), 'smart')
+    const before = useReaderSearchStore.getState()
+    const seq0 = before.focusSeq
+    const matchesRef = before.matches
+    useReaderSearchStore.getState().open()
+    const after = useReaderSearchStore.getState()
+    expect(after.state).toBe('done')
+    expect(after.focusSeq).toBe(seq0 + 1)
+    expect(after.matches).toBe(matchesRef)
+  })
+
+  it('setQuery：输入框实时值写 store', () => {
+    useReaderSearchStore.getState().setQuery('关键词')
+    expect(useReaderSearchStore.getState().query).toBe('关键词')
+  })
+})
+
+describe('P7E-03 搜索 store —— submit 序列', () => {
+  it('S2 空/纯空白提交=no-op（零搜索： getPage 不取、态停在 open、lastSubmitted 不变）', async () => {
+    const doc = makeDoc([['SMART']])
+    useReaderSearchStore.getState().open()
+    await useReaderSearchStore.getState().submit(doc, '   ')
+    const s = useReaderSearchStore.getState()
+    expect(s.state).toBe('open')
+    expect(s.lastSubmitted).toBe('')
+    expect(s.matches).toEqual([])
+  })
+
+  it('submit doc 不可收窄（null）=no-op', async () => {
+    useReaderSearchStore.getState().open()
+    await useReaderSearchStore.getState().submit(null, 'smart')
+    expect(useReaderSearchStore.getState().state).toBe('open')
+  })
+
+  it('S3 提交有效查询：同步置态 searching（零 await 前置）→done；首匹配 active；pageItems 仅命中页', async () => {
+    const doc = makeDoc([['alpha SMART'], ['beta none'], ['gamma SMART alpha']])
+    useReaderSearchStore.getState().open()
+    const p = useReaderSearchStore.getState().submit(doc, 'smart')
+    // submit 调用返回前已置 searching（⑤b 同步置态——无 await 前置）
+    expect(useReaderSearchStore.getState().state).toBe('searching')
+    await p
+    const s = useReaderSearchStore.getState()
+    expect(s.state).toBe('done')
+    expect(s.lastSubmitted).toBe('smart')
+    expect(s.matches).toHaveLength(2)
+    expect(s.matches[0]).toMatchObject({ page: 0 })
+    expect(s.matches[1]).toMatchObject({ page: 2 })
+    expect(s.activeIndex).toBe(0)
+    expect(Object.keys(s.pageItems).sort()).toEqual(['0', '2'])
+    // 命中页 items 为高亮映射输入（span 数校验基准）
+    expect(s.pageItems[0]).toHaveLength(1)
+  })
+
+  it('S9 无命中：done(0)——matches 空、pageItems 空', async () => {
+    useReaderSearchStore.getState().open()
+    await useReaderSearchStore.getState().submit(makeDoc([['SMART']]), 'zzz')
+    const s = useReaderSearchStore.getState()
+    expect(s.state).toBe('done')
+    expect(s.matches).toEqual([])
+    expect(s.pageItems).toEqual({})
+  })
+
+  it('S10 逐页提取失败：error toast+回 open（query 保留）+matches 清+零崩溃', async () => {
+    useReaderSearchStore.getState().open()
+    useReaderSearchStore.getState().setQuery('smart')
+    await useReaderSearchStore.getState().submit(makeDoc([['SMART'], ['x']], { failAt: 2 }), 'smart')
+    const s = useReaderSearchStore.getState()
+    expect(s.state).toBe('open')
+    expect(s.query).toBe('smart')
+    expect(s.matches).toEqual([])
+    expect(toastMock).toHaveBeenCalledTimes(1)
+    expect(toastMock.mock.calls[0]![1]).toBe('error')
+  })
+
+  it('S7 searching 中再提交新查询：代际守卫——旧代页回传作废，新代独占', async () => {
+    let releaseOld: (() => void) | undefined
+    const gate = new Promise<void>((resolve) => {
+      releaseOld = resolve
+    })
+    const oldDoc = makeDoc([['alpha SMART'], ['alpha SMART two']], { gate })
+    const newDoc = makeDoc([['beta SMART'], ['beta SMART x'], ['beta SMART y']])
+    useReaderSearchStore.getState().open()
+    const oldRun = useReaderSearchStore.getState().submit(oldDoc, 'alpha')
+    expect(useReaderSearchStore.getState().state).toBe('searching')
+    const newRun = useReaderSearchStore.getState().submit(newDoc, 'beta')
+    await newRun
+    expect(useReaderSearchStore.getState().matches).toHaveLength(3)
+    // 旧代页此刻回传（门闸放行）——必须作废：不写 matches/不改 lastSubmitted
+    releaseOld!()
+    await oldRun
+    const s = useReaderSearchStore.getState()
+    expect(s.state).toBe('done')
+    expect(s.lastSubmitted).toBe('beta')
+    expect(s.matches).toHaveLength(3)
+    expect(s.matches[0]).toMatchObject({ page: 0 })
+  })
+})
+
+describe('P7E-03 搜索 store —— next/prev 翻页联动', () => {
+  it('S4 next：active+1；末位回卷首位；经注入回调上抛目标页（0 基）', async () => {
+    const doc = makeDoc([['SMART one'], ['SMART two'], ['SMART three']])
+    const turn = vi.fn()
+    useReaderSearchStore.getState().registerPageTurner(turn)
+    await useReaderSearchStore.getState().submit(doc, 'smart')
+    useReaderSearchStore.getState().next()
+    expect(useReaderSearchStore.getState().activeIndex).toBe(1)
+    expect(turn).toHaveBeenLastCalledWith(1)
+    useReaderSearchStore.getState().next()
+    expect(useReaderSearchStore.getState().activeIndex).toBe(2)
+    expect(turn).toHaveBeenLastCalledWith(2)
+    // 末位回卷首位
+    useReaderSearchStore.getState().next()
+    expect(useReaderSearchStore.getState().activeIndex).toBe(0)
+    expect(turn).toHaveBeenLastCalledWith(0)
+  })
+
+  it('S5 prev：active−1；首位回卷末位', async () => {
+    const doc = makeDoc([['SMART one'], ['SMART two'], ['SMART three']])
+    const turn = vi.fn()
+    useReaderSearchStore.getState().registerPageTurner(turn)
+    await useReaderSearchStore.getState().submit(doc, 'smart')
+    useReaderSearchStore.getState().prev()
+    expect(useReaderSearchStore.getState().activeIndex).toBe(2)
+    expect(turn).toHaveBeenLastCalledWith(2)
+    useReaderSearchStore.getState().prev()
+    expect(useReaderSearchStore.getState().activeIndex).toBe(1)
+  })
+
+  it('next/prev 无结果集=no-op（零回调）', () => {
+    const turn = vi.fn()
+    useReaderSearchStore.getState().registerPageTurner(turn)
+    useReaderSearchStore.getState().next()
+    useReaderSearchStore.getState().prev()
+    expect(useReaderSearchStore.getState().activeIndex).toBe(0)
+    expect(turn).not.toHaveBeenCalled()
+  })
+
+  it('registerPageTurner(null) 注销后 next 零翻页（成对契约）', async () => {
+    const turn = vi.fn()
+    useReaderSearchStore.getState().registerPageTurner(turn)
+    await useReaderSearchStore.getState().submit(makeDoc([['SMART'], ['SMART b']]), 'smart')
+    useReaderSearchStore.getState().registerPageTurner(null)
+    useReaderSearchStore.getState().next()
+    expect(useReaderSearchStore.getState().activeIndex).toBe(1)
+    expect(turn).not.toHaveBeenCalled()
+  })
+})
diff --git a/tickets/registry.ts b/tickets/registry.ts
index 6ff6ba6550..bb08ed54ba 100644
--- a/tickets/registry.ts
+++ b/tickets/registry.ts
@@ -234,6 +234,7 @@ export const TICKETS: readonly Ticket[] = [
   { id: 'P7E-02', file: 'src/main/ipc/import_.ts', area: 'ipc', owner: 'strong', status: 'done', summary: '拖拽导入（P7-E 预留点清扫二票；b3: P7-E+B1 §3 预留 ipc/import_.ts:18+ImportDropZone.tsx:7；Design=fromPaths 通道对 renderer 隐藏（PRELOAD_HIDDEN_METHODS const+类型双消费单源）+apiDrag.importDropped 桥（webUtils 解析+planDroppedImports 三滤：合成 File 解析空串/类型门（File.type 为空剔除——目录项恒空类型）/后缀 .pdf+数量门 100 双层）——路径串不出 preload 堆；INV-07 修订（路径来源扩列）+INV-54 登记；态空间 D1~D8；门一 Kimi 0B/2W/2N（W2 目录命名 *.pdf 击穿→类型门回炉+M5 变异/N1N2 注释回炉；W1=门一包漏 tests/ diff 主控门二补包核实=纯减集改向）+门二 deepseek PASS 零发现；单测 135 文件 1160（+18）/e2e 35 用例 34+1 探针 flake 单现复跑绿未立案；票面 scripts/audits/p7e-02-brief.md+报告+双门审档在案）' },
   { id: 'B7', file: 'src/main/services/tags.service.ts', area: 'service', owner: 'strong', status: 'done', summary: 'tags upsert 纯空格名空判守卫（AUDIT-B W1 修票——B7 探针实锤 upsert 空格串入库 name 空行；修=对齐 rename 先例 trim 空 INVALID_REQUEST；主控压缩票 SR2-F-09 形态；先红 2/绿 3/变异 M1 定点撤卫 2 红还原核毕；门一 Kimi PWW（W=程序序 registry 翻态在收口——历票惯例+N1 票面同步+N2 locks 收口兑现）+门二 deepseek PASS 零发现；verify 135 文件 1163/locks 251；票面 scripts/audits/b7-brief.md+双门审档在案）' },
   { id: 'C-A3', file: 'src/renderer/features/notes/notes.store.ts', area: 'reader', owner: 'strong', status: 'done', summary: 'AUDIT-C C-3 扫描 §1.2-a 主候选修票（二波场 2026-09-02）：notes 防抖悬置写三件套=①discard API（discardPendingEdit/discardAllPendingEdits——清 timer+四元数据+条目，幂等）②in-flight 代际守卫（discardGen 派发快照+.then/.catch 回调首行全 no-op——防回调复活条目）③接线两点（tab-dirty confirmCloseDirty 守门内弃改收口=一切 tab 关闭路径必经；workspace.store switchTo 确认后 discardAll——check-quality 白名单受控例外）；main 归属校验已在职零改动（notes.service findById→NOT_FOUND——扫描报告「FK 偶然兜底」口径修正）；跨格序列①②③④逐一测试锚（含 e2e 复活面端到端「已保存」载入锚）；INV-50 登记+INV-35④ 兑现修订；门一 Kimi 0B/3W/8N 条件 PASS（W1 reject 版序列②主控压缩票补销+变异恰红/W3 App 聚合含 notes pending 代码面核验成立/W2 load×discard 裁定接受残余=重建条目为服务器基线复活不可能）+门二 deepseek 终审；实现者 GLM5.3 统一档 6.18M tok+主控压缩票 W1 补锚；票面 auditc-a3-brief.md+报告 auditc-a3-impl.report.md+两门审档在档' },
+  { id: 'P7E-03', file: 'src/renderer/features/reader/ReaderToolbar.tsx', area: 'reader', owner: 'strong', status: 'open', summary: '页内高亮搜索（P7-E 预留点清扫三票；b3: P7-E+B1 §3 预留 ReaderToolbar.tsx:7,163+ReaderShortcuts.ts:38；Design=索引全文档（逐页 getTextContent 文本域）+高亮仅渲染窗口（TextLayer DOM span Range→clientRects——pdfjs 4.10 每项恰一 span 前提）+代际守卫+searchBox slot 兑现占位；态空间 S1~S12+INV-55 登记）' },
 ] as const
 
 export const TICKET_MAP: ReadonlyMap<string, Ticket> = new Map(TICKETS.map((t) => [t.id, t]))
```

## 4. 实现者报告（全文自报）
```markdown
# P7E-03 实现报告（页内高亮搜索——三屋第一屋·实现者子代理）

日期：2026-09-03 ｜ 实现者环境：GLM 统一档（Agent 工具面无 model 参数——环境限制欠账披露）｜ Node 24.20.0（开工 `node -v` 亲验）

## 0 技能清点（开工纪律——先于任何动手）

| 技能 | 用/不用 | 理由 |
|---|---|---|
| test-driven-development | 用 | 票面 ④ TDD 红→绿→变异红证 |
| javascript-testing-patterns | 用 | jsdom 组件测试形态参考（mock/act/rAF 桩） |
| e2e-testing-patterns | 用 | 新 e2e spec crib seedAndLaunch 配方 |
| verification-before-completion | 用 | 收口前分链真退出码自检 |
| systematic-debugging | 用（实战） | e2e 假红两轮差分排查（见 §7 环境事件） |
| frontend-ui-engineering | 不用 | 视觉细节已由票面定案（色变量/层序/百分比语言），无自由设计面 |
| subagent-driven-development | 不用 | 本会话即实现者屋本体，非派发面 |
| loop-defenses / loop-engineering | 不用 | 单票实现任务，无循环派发面 |
| 其余（git 工作流/部署/数据库等） | 不用 | 禁 git；纯 renderer 特性票 |

## 1 实现摘要

按票面五层规约落地页内高亮搜索，Design 裁决（主控定案）严格执行：

- **索引全文档（文本域）**：`reader-search.store.submit` 逐页 `getTextContent` 拼接索引（未渲染页也计数）；代际守卫=闭包 `readerSearchGeneration`（submit 自增/页回传核验/close+reset 失效）——INV-03 同族；searching 同步置态（首个 await 前落账，S3/⑤b）。
- **高亮仅渲染窗口（DOM 域）**：`SearchHighlightLayer`（PagesOverlay.renderPageLayers 内挂，DOM 序在 AnnotationLayer 后）对 `.textLayer` span 建 DOM Range 取 clientRects→`toPageRelative`→px 绝对定位；MutationObserver+rAF 合并重算（AnnotationLayer 先例同型，zoom 重渲链同径）；坐标参考=textLayer 盒（=canvas 盒=本层 inset-0 容器盒，三盒同源零漂移）。
- **纯函数域** `reader-search.ts`：buildPageText（hasEOL 插 '\n'+字符映射，换行哨兵 -1/-1）/findInText（toLowerCase 两侧+不重叠推进+跨 '\n' 拒）/asSearchDoc（unknown→结构收窄）/toTextItems（'str' 过滤，PdfPageCanvas 同款防御）/toPageRelative/spansForItems（数量不符→null 降级）。类型消费循 INV-16：`import type { PdfTextItem } from './PdfPageCanvas'`。
- **态空间 S1~S12**：store 事件×态表实现于 reader-search.store.ts 头注+代码；逐格锚见测试（S1/S2/S3/S4/S5/S6/S7/S8/S9/S10/S12 store 面+UI 面+e2e 链）。
- **装配**：`useReaderSearch(pdfDoc, fileUrl)`（.tsx）——①fileUrl 键效应 reset（INV-55，变化才清；身份不变不搅）；②keymap id `'reader-search'`（ctrl+f preventDefault，注册/注销成对 INV-14，**不改 ReaderShortcuts 绑定表**）；③翻页联动经 registerPageTurner 注入（store 间零 import；目标页≠tab.page→setPage(page,{scroll:'to'}) INV-29）；④订阅 store 产 `<ReaderSearchBox>` 受控节点。
- **ReaderToolbar**：可选 slot prop `searchBox?: ReactNode`（缺席=旧占位 span 兜底——onFitWidth 同款可选先例；受锁夹具直植 props 零破坏）；头注 v2 注记修订。**ReaderShortcuts.ts:38** 预留注记兑现修订（纯注释）。**ReaderPage**：hook 调用+toolbar 传 slot+头注一行。
- **两段式滚动**：第一段 pageTurner→setPage 页盒顶入视口；第二段高亮层 active 块 `scrollIntoView({block:'center'})`（scrolledMark 记账：同 matches+同 activeIndex 只滚一次，新结果集/新 activeIndex 重获资格）。

## 2 文件清单（新增 9 / 修改 4）

新增（src 五件）：
- `src/renderer/features/reader/reader-search.ts`（151 行，纯函数域）
- `src/renderer/features/reader/reader-search.store.ts`（178 行，zustand store）
- `src/renderer/features/reader/ReaderSearchBox.tsx`（117 行，纯受控搜索框）
- `src/renderer/features/reader/SearchHighlightLayer.tsx（156 行，高亮层）`
- `src/renderer/features/reader/useReaderSearch.tsx`（106 行，装配 hook）

修改（票面声明改动面内）：
- `src/renderer/features/reader/ReaderToolbar.tsx`（+31/−14：slot prop+占位兜底+头注修订）
- `src/renderer/features/reader/PagesOverlay.tsx`（+6/−1：renderPageLayers 挂高亮层+注释）
- `src/renderer/features/reader/ReaderShortcuts.ts`（+4/−1：预留注记兑现修订，纯注释）
- `src/renderer/features/reader/ReaderPage.tsx`（+11/−1：hook 装配+slot 传参+头注一行）

新增（tests 四件）：`tests/unit/renderer/reader-search-text.test.tsx`（136 行）、`tests/unit/renderer/reader-search.store.test.tsx`（233 行）、`tests/unit/renderer/reader-search-ui.test.tsx`（353 行）、`tests/e2e/reader-search.spec.ts`（154 行）。

**删减面 diff 自查**：`git status/diff --stat` 亲验——我的改动=上述 4 改 9 增；`tickets/registry.ts` 的脏行（git diff 单行=P7E-03 open 条目）为**主控派单时写入的既有脏态，我未触碰**（禁令遵守）；scripts/audits/ 下其余未跟踪件均为他场残留（auditc-*/f-*/night1-* 等），我仅新增 p7e-03-* 证据件。未动 tests/ 既有文件、src/shared/**、locks/、docs/invariants.md。

## 3 先红证据（TDD）

`scripts/audits/p7e-03-red/reader-search-all.raw.txt`：**全量套跑口径**（`npm run test`），3 新文件因缺失模块天然红（Failed to resolve import），既有 136 文件/1163 用例全绿，exit=1——基线锚定同时取证。

## 4 绿证据+用例数实测（脚本实测，非印象）

`scripts/audits/p7e-03-green/reader-search-all.raw.txt`：**139 文件/1207 用例全绿，exit=0**。
- 逐文件实测：reader-search-text.test.tsx=11、reader-search.store.test.tsx=15、reader-search-ui.test.tsx=18 → 新增 44。
- **基线勘误申报**：主控口径 135 文件，`find tests src -name "*.test.ts*" | grep -v e2e | wc -l` 实测既有=136（用例 1163 吻合）——136+3=139 文件、1163+44=1207 用例。
- e2e：新 spec 定向跑 `scripts/audits/p7e-03-e2e-targeted.raw.txt`（1 passed，exit=0）——全量 35+1=36 归主控 verify。

## 5 变异红证五组（cp 备份法；禁 git checkout 遵守）

| # | 变异点 | 红证（定向测 exit=1） | 证据 |
|---|---|---|---|
| M1 | findInText 删两侧 toLowerCase | 「大小写不敏感」用例红（expected [] to have length 2） | p7e-03-mut-m1.raw.txt |
| M2 | store 删代际守卫（submit 内三处检查全删） | S7 红（旧代覆盖：matches 2≠3） | p7e-03-mut-m2.raw.txt |
| M3 | ReaderSearchBox Enter 分支删 lastSubmitted 比较 | 「改词后=重新提交」红（onSubmit 0 次） | p7e-03-mut-m3.raw.txt |
| M4 | SearchHighlightLayer active 判定恒 false | 「active 强调」两用例红（data-active 'false'≠'true'） | p7e-03-mut-m4.raw.txt |
| M5 | ReaderToolbar slot 消费删（null ?? 恒渲染占位） | 「传 searchBox」红（slot 探针 null） | p7e-03-mut-m5.raw.txt |

各组均：cp 备份→变异→定向测（真退出码）→cp 还原→diff 确认空。**M5 作废重做两轮在档**（第 1 轮 `{false ?? (}` 连带杀兜底非「占位回归」语义；第 2 轮括号不平衡文件级崩；第 3 轮 `null ?? (` 结构平衡忠实——raw 内有全记载）。复原后三文件 44 用例复跑绿。

## 6 分链自检真退出码（禁 verify 全链——locks 归主控）

`scripts/audits/p7e-03-selfcheck.raw.txt`：

| 链 | exit | 备注 |
|---|---|---|
| npm run quality:check | 0 | 终态复跑（含 e2e spec 终版）；无占位/乱码/跨域 |
| npm run tickets:check | 0 | 119 票注册表一致 |
| npm run lint | 0 | 首跑红 1（e2e spec 未用 Page 导入）已修 |
| npm run typecheck | 0 | node+web 双项目 |
| npm run test（全量） | 0 | 139 文件/1207 用例 |
| npm run build | 0 | out/ 产出完整 |
| npx playwright test tests/e2e/reader-search.spec.ts | 0 | 1 passed（终版 spec） |

## 7 超票面自裁申报（逐项）

1. **测试文件扩展名 .ts→.tsx**（票面 ⑤ 表写 reader-search-text.test.ts / reader-search.store.test.ts，落盘 .tsx）：tsconfig 双项目划分所迫——`tests/**/*.ts` 归 tsconfig.node.json（无 `--jsx`），.ts 测试传递引入 PdfPageCanvas.tsx（PdfTextItem 类型单源）即 TS6142 红四发。改 .tsx 归 web 项目（jsx: react-jsx）后零错。内容零变，票面文件名后缀机械修正。
2. **ReaderSearchBox 输入框内 Ctrl+F 本地等价路径**：keymap 层 editable 避让使焦点驻输入框时 document 级 Ctrl+F 不达——S12「面板已开再按」在该焦点位由组件本地 onKeyDown（preventDefault+select）等价兑现；非输入框焦点位仍走 keymap→open()（focusSeq++ 路径，store 测试 S12 锚定）。两路合围 S12 语义。
3. **e2e `test.setTimeout(120_000)`**：两跳 Electron 启动+建库迁移实测 51.9s 贴 60s 默认线（机器抖动越界实锤一次）；z-wg1-probe.spec.ts:219 同款先例。
4. **submit 后首匹配若在本页也居中**：scrolledMark 机制对新结果集+activeIndex 变更一律给居中资格——票面 S3 未禁、§① 翻页联动「active 匹配节点挂载后居中」语义自然覆盖（Chrome find 同款）。
5. **store 增 setQuery 动作**：票面动作列表未列但 props `onQueryChange` 必需（query=输入框实时值的写入口）——字段已声明，动作为其最小闭包。
6. **换行哨兵形态自裁**：buildPageText 的 '\n' 位映射 `{itemIndex:-1, offsetInItem:-1}`（票面只定「map=每字符→{itemIndex,offsetInItem}」未定哨兵）——map 与 text 同长保下标直查，纯函数测试锁定。
7. **e2e Esc 后复验 P2 可见**：一行保序断言（清零不清视口），微小增强。
8. **背景色用 backgroundColor 长属性**（非 background 简写）：jsdom 内联样式不展开简写（断言红实证）+e2e 计算样式断言同受益。

## 8 疑虑（供主控/门审）

1. **【环境事件·已立案排查】e2e 假红两轮**：run2 60s 超时硬杀 worker 恰落在 seedPaperRow 换绑窗口（copyFile node→spawn→finally 还原），还原未执行→build/Release 残留 node-v137 绑定→此后一切 Electron 首跳即崩（`firstWindow: Target page closed`，md5 实锤=1fe2bbe…=node 绑定）。差分佐证：既有受锁 spec reader-text 同点位同指纹失败（环境面非票面）。处置=`sqlite-abi.mjs use electron` 恢复+120s 预算+终版取证绿。**遗留隐患**：seedPaperRow 换绑窗口无硬杀防护，受锁 spec 共享（修复需 [locked-change]，非本票面）——建议主控记档。
2. **build 后 e2e 首跑冷启动方差**：同机实测 51.9s～>120s（疑 Defender 扫描新产物），热身后 1.8s。主控 verify（build→e2e 全量）时既有 35 用例无预算护体，冷启动方差存在——本票 spec 已设 120s，其余属既有面。
3. **基线数字勘误**：主控口径 135 文件 vs 实测 136（§4）——交接书滚动时请以实测为准。
4. **useReaderSearch 全 store 订阅**：搜索期间 ReaderPage 随每次击键重渲染（层 props 未变不重渲 canvas，reconciliation 便宜）——票面未要求 selector 细分，未做（记优化空间）。
5. **收口归主控**：INV-55 登记（docs/invariants.md）、locks:generate+apply（预期 251→255：+3 unit+1 e2e spec）、registry P7E-03 翻 done、[locked-change] 尾注。

## 9 结论

DONE：票面五层全兑现；TDD 红→绿→五组变异红证在档；分链自检全 exit=0；超票面决定 8 项逐条申报（无删减面——4 改 9 增全在票面声明面内）；环境级假红已排查定性并留档。
```

## 5. 证据日志摘要（关键尾部——全文在 scripts/audits/）
- 先红：p7e-03-red/reader-search-all.raw.txt 尾部：
[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/3]⎯[22m[39m

[2m Test Files [22m [1m[31m3 failed[39m[22m[2m | [22m[1m[32m136 passed[39m[22m[90m (139)[39m
[2m      Tests [22m [1m[32m1163 passed[39m[22m[90m (1163)[39m
[2m   Start at [22m 11:32:07
[2m   Duration [22m 84.29s[2m (transform 21.08s, setup 0ms, collect 70.92s, tests 17.97s, environment 494.91s, prepare 76.01s)[22m

exit=1
- 全量绿：p7e-03-green/reader-search-all.raw.txt 尾部：
 [32m✓[39m tests/unit/renderer/app-quit-dirty.test.tsx [2m([22m[2m1 test[22m[2m)[22m[90m 70[2mms[22m[39m

[2m Test Files [22m [1m[32m139 passed[39m[22m[90m (139)[39m
[2m      Tests [22m [1m[32m1207 passed[39m[22m[90m (1207)[39m
[2m   Start at [22m 11:54:22
[2m   Duration [22m 40.04s[2m (transform 22.20s, setup 0ms, collect 75.81s, tests 18.13s, environment 468.78s, prepare 78.10s)[22m

exit=0
- 变异红证五组（各自 raw 尾部）：
### scripts/audits/p7e-03-mut-m1.raw.txt
[31m[1mAssertionError[22m: expected [] to have a length of 1 but got +0[39m
[2m      Tests [22m [1m[31m3 failed[39m[22m[2m | [22m[1m[32m8 passed[39m[22m[90m (11)[39m
exit=0
--- 还原 ---
diff 确认空=还原完整
### scripts/audits/p7e-03-mut-m2.raw.txt
[31m[1m[7m FAIL [27m[22m[39m tests/unit/renderer/reader-search.store.test.tsx[2m > [22mP7E-03 搜索 store —— submit 序列[2m > [22mS7 searching 中再提交新查询：代际守卫——旧代页回传作废，新代独占
[31m[1mAssertionError[22m: expected [ …(2) ] to have a length of 3 but got 2[39m
[2m      Tests [22m [1m[31m1 failed[39m[22m[2m | [22m[1m[32m14 passed[39m[22m[90m (15)[39m
--- 还原 ---
diff 确认空=还原完整
### scripts/audits/p7e-03-mut-m3.raw.txt
[31m[1m[7m FAIL [27m[22m[39m tests/unit/renderer/reader-search-ui.test.tsx[2m > [22mP7E-03 ReaderSearchBox —— 键位与展示[2m > [22mEnter 改词后=重新提交新查询（done+query≠lastSubmitted → onSubmit）
[31m[1mAssertionError[22m: expected "spy" to be called 1 times, but got 0 times[39m
[2m      Tests [22m [1m[31m1 failed[39m[22m[2m | [22m[1m[32m17 passed[39m[22m[90m (18)[39m
--- 还原 ---
diff 确认空=还原完整
### scripts/audits/p7e-03-mut-m4.raw.txt
[31m[1m[7m FAIL [27m[22m[39m tests/unit/renderer/reader-search-ui.test.tsx[2m > [22mP7E-03 SearchHighlightLayer —— 渲染面[2m > [22mactive 匹配切换：activeIndex=1 时本页（页 0）块非 active；居中滚动只滚 active 块
[31m[1mAssertionError[22m: expected 'false' to be 'true' // Object.is equality[39m
[2m      Tests [22m [1m[31m2 failed[39m[22m[2m | [22m[1m[32m16 passed[39m[22m[90m (18)[39m
--- 还原 ---
diff 确认空=还原完整
### scripts/audits/p7e-03-mut-m5.raw.txt
[31m[1m[7m FAIL [27m[22m[39m tests/unit/renderer/reader-search-ui.test.tsx[2m > [22mP7E-03 ReaderToolbar —— searchBox slot[2m > [22m传 searchBox：渲染 slot 内容+占位缺席（生产装配面恒传）
[31m[1mAssertionError[22m: expected null not to be null[39m
[2m      Tests [22m [1m[31m1 failed[39m[22m[2m | [22m[1m[32m17 passed[39m[22m[90m (18)[39m
--- 还原 ---
diff 确认空=还原完整
- 分链自检：p7e-03-selfcheck.raw.txt 摘录：
$ npm run quality:check
exit=0
$ npm run tickets:check
exit=0
$ npm run lint
exit=0
$ npm run typecheck
exit=0
$ npm run lint
exit=0
$ npm run typecheck
exit=0
$ npm run test（全量）
exit=0
$ npm run build
exit=0
$ npm run quality:check
exit=0
$ npm run tickets:check
exit=0

## 6. 主控已预裁项声明（可攻击但推翻需更强依据）
1. slot 方案（ReaderToolbar 可选 searchBox prop+占位兜底）=主控定案——受锁测试夹具零破坏的必要形式。
2. ctrl+f 独立 keymap id 'reader-search' 不入 ReaderShortcuts 绑定表=主控定案（受锁测试面零改）。
3. 提交制搜索（非 live-as-you-type）=票面定案。
4. e2e setTimeout(120_000)=实现者自裁申报项（冷启动方差实证）——主控接受（z-wg1-probe 先例）。
5. .ts→.tsx 后缀=实现者自裁（tsconfig 项目划分所迫）——主控核实成立。
6. 环境事件（e2e 超时硬杀砸中 seedPaperRow 换绑窗口→绑定残留→已恢复）：主控已亲验 build/Release md5=electron-v146 在位；该隐患属既有受锁 spec 共享面（修复需 [locked-change]），记档非本票回炉项。

## 7. 审计工单（输出 [B|W|N] 逐条+file:line 证据+统计+总评）
- A 母本符合度：票面五层逐条对 diff——态空间 S1~S12 每格是否有实现+测试锚；Design 裁决（索引全文档+高亮仅渲染窗口）是否被忠实执行。
- B 宪法红线：INV-16（新文件 pdfjs-dist 直 import？import type 例外形态是否守住）；分层；行数；测试锁定（既有测试零改动？）；禁新依赖；TODO/placeholder。
- C 代码与测试质量：正确性/边界/竞态/错误处理；恒真断言；为过测试放宽断言；变异红证是否真实命中（对照 §5 摘录与 diff 推演变异点）。
- D 报告诚实性：实现者自报逐条对 diff（超票面 8 项申报是否属实、有无漏报改动）。
- E 接缝与后续单：与 reader.store（setPage/scrollRequest 通道）/PagesOverlay（层挂载）/keymap（注册注销成对）/AnnotationLayer（DOM 序+z 同层）接缝正确性。
- **附加强制审项一（挂载/事件消费类——逐帧推演）**：useReaderSearch 三 effect+SearchHighlightLayer 两 effect+ReaderSearchBox focusSeq effect+MutationObserver——对「同一效应内两语句先后」「注册/清理次序」「fileUrl 键效应与 store reset 的时序」「generation 守卫在 close/reset/再 submit 三径的失效完备性」做事件时间线逐帧推演（静态逐跳放行拦不住同效应竞态——SR2-LG-08 实录）。
- **附加强制审项二（样式面）**：高亮层 inline style 与 syn-btn-ghost 类的特异性关系；data-active 描边 outline 的层叠可见性；--accent-soft 解析值断言（rgb(220,235,245)）与 theme.css 单源的一致性风险。
- 特别攻击面（主控点名）：①SearchHighlightLayer 的 spansForItems 契约（pdfjs 4.10 每文本项恰一 span——含空 str 项；数量不符降级路径的可达性与后果）；②两段式滚动（pageTurner→setPage 页盒顶+scrollIntoView 居中）与 F-03 scroll-progress 状态机的交互（程序滚动记账/用户接管）；③zoom 变更链（文本层重渲→MutationObserver 重算）与 scrolledMark 记账的交互（zoom 后 active 是否重复滚动/漏滚）；④S8 换 tab（fileUrl 不变？——同 doc 双 tab 场景 reset 是否覆盖：per-tab 下 fileUrl 是 per-tab 的吗？ReaderPage 单例视图下 tab 切换的 fileUrl 变化路径）；⑤e2e fixture 对 CJK 逐字分项场景的代表性缺口。
