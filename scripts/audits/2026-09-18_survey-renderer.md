> 证据档｜2026-09-17 四路只读调研之二（渲染层深潜）
> 产出：Explore 只读子代理；转录原样未改——分析责任归产出方，勘误以裁决书为准。
> 消费：docs/design/2026-09-18_complexity-governance-ruling.md §7
> 口径注：本报告 reader 计数为 ts/tsx 口径（约 61 文件/9,300 行）；裁决书沿用
> 2026-09-11 审计全文件口径（69 文件/11,791 行，含 CSS）。

# Synapse 渲染层（src/renderer + src/preload）架构深度梳理报告

总量：renderer + preload 共 **21,301 行**（ts/tsx/css），其中 reader 一个 feature 约 60 个文件、占总行数近半。测试面：`tests/` 下 162 个测试文件中 88 个是 renderer 相关。依赖极简：React 18 + zustand 5 + pdfjs-dist 4.10 + zod，无路由库、无 UI 库、无布局库。

---

## ① 组件 / 状态架构图（文字版）

```
main.tsx (27 行)
 ├─ createRoot(<App/>) + theme.css 分域 import 链（main.tsx:5-12）
 └─ void getReaderOutbox().replayOnStart()   ← 启动时重放 localStorage outbox（main.tsx:27）

App.tsx (206 行) ── 应用壳（无路由库，useState<ViewId> 四视图切换，App.tsx:102）
 ├─ ErrorBoundary（App.tsx:61-99，retry 用 key 强制重挂载）
 ├─ header: logo + WorkspaceSwitcher + TitleBarControls(frameless 三键)
 ├─ nav: 文献库/阅读器/设置/脉络（App.tsx:24-29）── 条件渲染 {view==='x' && <XPage/>}（App.tsx:194-199），切走即卸载
 ├─ dirty 聚合: useTabDirtyAggregate() ∪ useLineageDirty() → api.system.setQuitDirty（App.tsx:112-141）
 ├─ uiScale → CSS 变量 --ui-scale（App.tsx:136）
 ├─ useExportCorpusEvents()（AI 语料事件桥，App 根挂载一次）
 └─ OPEN_PAPER_EVENT 监听 → setView('reader')（App.tsx:144-148）

features/library   LibraryPage → FilterBar(+TagFilter 跨域) / ImportDropZone / PaperList/PaperRow / PaperDetailPanel(+TagEditor 跨域) / MetaEditDialog
features/reader    ReaderPage(组合根) → ReaderPageView → PdfDocProvider + PagesOverlay → PageColumn → PageColumnView → PageBox → PdfPageCanvas/TextLayer
                   覆盖层: AnnotationLayer / ReaderAiLayer(AiAnnotationLayer) / SearchHighlightLayer / SelectionLayer(单实例稳定盒) / SelectionPaint
                   侧栏: OutlineAside → OutlinePanel/OutlineThumb + ReaderNotesPanel + AiNotesSection/AiNoteGroupList/AiNotesStatus/FragmentNotesList
                   顶: ReaderToolbar(+ReaderSearchBox slot) + TabBar(多标签页)
features/lineage   LineagePage → LineageBoard(编辑层) → LineageCanvas(SVG) → LineageNodeCard/LineageEdges/LineageLegend + 菜单/对话框 6 件 + LineageSidePanel(AiNotes/ManualNote/Tags)
features/tags      TagFilter / TagEditor / TagLifecycle(+Menu) —— 无页面，寄生于 library
features/notes     无组件（纯 store，面板在 reader/ReaderNotesPanel）
features/settings  SettingsPage → UiScaleSection/ZcodeLinkSection/CorpusExportSection + WorkspaceSection(workspaces 域注入, App.tsx:197)
features/workspaces WorkspaceSwitcher / WorkspaceSection

状态层（11 个 zustand store + 2 个非 zustand）:
 useReaderStore(483 行, per-tab 多文献)   usePageItemsStore(页项注册表)   useAiNotesStore   useReaderSearchStore
 useLibraryStore   useTagsStore   useNotesStore(279 行, 防抖+字段合并)   useLineageStore(337 行, 写队列)
 useSettingsStore   useCorpusExportStore   useWorkspaceStore
 toast-store(手写观察者)   reading-time-outbox-store(localStorage 适配)
模块级闭包状态（不入 store）: notes 元数据 Map×6、annotation-undo 栈、locateSeq、outbox 单例等

跨域通道（features 互引禁止，仅 2 条合法通道）:
 shared/open-paper-bus（window CustomEvent + 闩锁，open-paper-bus.ts:36-52）
 shared/ui/toast-store（.ts 消费方专用）
 例外 7 处 feature→feature import，与 scripts/check-quality.mjs:92-99 COMPOSITION_ROOT_ALLOW 白名单逐条吻合（机器强制）
```

**多标签页结论**：App 层不是多标签——四视图条件渲染、切走即卸载。多标签只存在于阅读器内部（`reader.store` 的 `tabs/order/activeId` + `TabBar.tsx`，reader.store.ts:6-23 状态机文档）。

---

## ② 逐 feature 清单表（机器实测 wc -l）

### 应用壳 / 基建

| 文件 | 行数 | 职责 |
|---|---|---|
| app/App.tsx | 206 | 视图切换、dirty 聚合、ErrorBoundary、事件接线 |
| app/TitleBarControls.tsx | 118 | frameless 窗控三键（单通道 `system/window-control`） |
| api/client.ts | 30 | `unwrap` + `ApiClientError` + `api = window.api` 门面 |
| preload/index.ts | 83 | 表驱动生成白名单桥 + drag 桥 + 事件桥 |
| preload/drag-import.ts | 48 | 拖入过滤纯函数（路径串不出的 preload 堆） |
| (shared) ipc/api-surface.ts | 227 | 全部 IPC 的单一真相源 |

### reader（61 文件，约 9,300 行）——关键件

| 文件 | 行数 | 职责（锚点系统家族） |
|---|---|---|
| pdf-item-geometry.ts | 514 | **项声明几何域**：内联 pdf.mjs viewport 数学（:96-140）、偏移表 buildItemOffsets、grapheme 细分、基线分组并块、bands 同源派生、G2 健康门、管线装配件 itemSelectionGeometry（:475） |
| reader.store.ts | 483 | per-tab 多文献状态机：open/activate/close、迟到响应三规则（:24-35）、进度 flusher 接线、scrollRequest/noteHighlight/aiNoteHighlight 三信号、undo |
| annotation-anchor.ts | 453 | **DOM 锚定计算域**：collectSpans/findRangeAtOffset/rectsBetweenPoints（DOM 量测回退链）、mergeLineRects 行级合并（:326）、estimateLinePitch 行距估计（:287） |
| annotation-resolve.ts | 415 | 重锚+行盒自适应：resolveAnnotationRectsDom（:282）/ resolveAnnotationRectsItem（:334）/ bandsForTextNodes/bandsNearRects/bandFromMetrics/matchBand/normalizedLineHeight/itemViewportOf |
| selection-evaluate.ts | 325 | 划选评估域：createEvaluate 工厂，visual 快路径（:183）+ full 全量（:256）双路 + 四守卫 + G2 门 + itemChainFor 主链（:118） |
| CorpusExtractor.ts | 311 | AI 语料提取器：自持 pdfjs 生命周期、逐页背压回传、idle/extracting/failed 状态机（:23-35） |
| reading-time.ts | 303 | 阅读时长账本（ledger + tick 15s + visibility 门）+ 复合 flusher + chunkSeconds 分片 |
| reading-time-outbox.ts | 300 | **持久 outbox**：T1-T6 态空间（:7-13）、at-least-once、指数退避、死信上限 50 |
| anchor-locate.ts | 293 | N1 锚点定位服务：exact/page/paper 三防线 + 序号守卫（INV-20 单入口） |
| anchor-blank-snap.ts | 284 | 段末空白 affinity 归一化：br 槽位/空白 span → 视觉行行尾（F-A10） |
| anchor-serialize.ts | 258 | 锚定格式与校验域：selectionToAnchor 三元组（:183）、verifyQuote/verifyQuoteItem/locateQuote 自愈（:113） |
| annotation-resolve-layered.ts | 251 | 重锚三层编排：S0-S6 状态机（项几何主链→DOM 回退→存量兜底）+ S6 病理抑制 domProductSuppressed（:88） |
| SelectionLayer.tsx | 237 | 划选宿主组件：事件调度接线、F-12 位移门、F-A12 重定向、save 落库（:187-216） |
| AiAnnotationLayer.tsx | 234 | AI 段渲染对等（重锚失败=不渲染；含 ReaderAiLayer 装配 :218） |
| ReaderToolbar.tsx | 232 | 纯受控工具栏（页码/缩放/颜色/选择模式/双页/搜索 slot） |
| release-affinity.ts | 210 | 释放点浅探手势几何裁决（F-A12，纯函数） |
| scroll-progress.ts | 367 | 滚动进度六态状态机（idle/scrolling/pending/writing/restoring/loading，:7-17）+ 装配工厂 + wiring |
| 其余 | — | AnnotationLayer 151 / PagesOverlay 132 / PageColumn 164 / PdfPageCanvas 187 / TextLayer 156 / page-items.store 68 / annotation-merge 172 / annotation-band-calibrate 119 / annotation-undo 196 / use-annotation-draft 192 / tab-dirty 117 / scroll-converge 76 / selection-geometry 141 / selection-paint 84 / page-column-geometry 174 / reader-search 162 / reader-search.store 202 / reading-time-setup 139 / reading-time-outbox-store 87 等 |

### lineage

| 文件 | 行数 | 职责 |
|---|---|---|
| lineage-layout.ts | 387 | 手写 Reingold-Tilford tidy tree（D3 禁引）+ 年份分层 + 手工 x/y 覆盖 + 综述右列 + BAND 常量单源 |
| lineage.store.ts | 337 | 读面 stale-guard + 写面队列（最后写胜出合并 :101-110、CONFLICT 丢弃 :187-192、按身份出队 :185） |
| lineage-viewport.ts | 280 | auto-fit 状态机 + pan/zoom + rootToLocalScale（INV-43 双坐标系）+ ResizeObserver |
| LineageCanvas.tsx | 238 | SVG 画布：layout useMemo → geom/surveyIds/slots/labelBoxes/coreIds 五个 useMemo 预计算 → 层带+Edges+NodeCard |
| 其余 21 件 | — | Board 155 / SidePanel 196 / 各对话框菜单 46-162 |

### library / tags / notes / settings / workspaces / shared

| 文件 | 行数 | 说明 |
|---|---|---|
| notes.store.ts | 279 | 防抖 1.5s 自动保存 + 字段级合并 + 弃改代际守卫（模块级 Map×6，:79-99） |
| PaperDetailPanel.tsx | 229 | library 最大组件 |
| library.css / workspace.css / text-layer.css | 228/137/116 | feature 级样式 |
| shared/theme*.css ×5 | 755 | token 分域：shell 236 / buttons 113 / reader 60 / lineage 140 / theme 203 |
| shared 其余 | — | keymap 95 / open-paper-bus 52 / save-status 37 / ui-constants 26 / reading-time-format 13 / hooks useAsync 71 + useDebounce 25 / ui Toast 75 + toast-store 84 + Dialog 94 + SplitPane 210 + Button 56 + DiamondRule 23 |

---

## ③ API 桥形态与方法数

**方法数（实测清点 `src/shared/ipc/api-surface.ts:30-126`）**：
- 12 个域、**55 个通道**：library 4、reader 6、import_ 3、enrich 1、export_ 8、ai_sensor 7、lineage 6、tags 7、notes 3、settings 3、system 3、workspaces 4。
- `window.api` 上可见 **54 个**（`PRELOAD_HIDDEN_METHODS` 隐藏 `import_/fromPaths`，api-surface.ts:172-174——路径串只允许经 `apiDrag` 桥组装，preload/index.ts:49-58）。
- 另有 `apiDrag.importDropped`（1 个）+ `apiEvents` 3 个订阅（onImportProgress/onExportCorpus/onWindowState，preload/index.ts:61-79）。**桥函数合计 58 个**。

**renderer 如何拿到类型**：`env.d.ts:1-10` 全局声明 `Window.api: PreloadApi`；`PreloadApi` 从 `API_SURFACE` 经 mapped type + `Ep` infer 推导（api-surface.ts:146-207），Req 入参宽松/Res 收紧，零手写重复。契约由 `tests/contracts/preload-surface.test.ts` 断言运行时暴露面与接线表一致（preload/index.ts:8）。

**是否变厚**：没有。renderer 侧 `api/client.ts` 仅 30 行（unwrap + 错误包装 + 门面）；preload 83 行表驱动生成。全部"厚度"集中在 shared/api-surface（227 行）与 main 侧 register 的 zod 校验——这是刻意的三层对账设计（api-surface.ts:3-9）。组件统一 `import { api } from api/client`，全仓无第二处直碰 `window.api` 的组件面（ReaderNotesPanel 等均走 store/自身经 client）。

---

## ④ reader 锚点系统：完整调用链

### 阶段 A：拖选实时预览（快路径）
1. `SelectionLayer.tsx:169` document `selectionchange` → `scheduler.handler`
2. `selection-geometry.ts:110 createVisualScheduler`：首事件排 rAF 帧内合帧（60Hz）+ 200ms settle 防抖双路
3. rAF → `selection-evaluate.ts:183 visual()`：四道守卫（选区空/跨页/页外/零宽盒 :186-209）→ `probeOffsetLen`×2 轻量偏移探测（:214-215，Range.toString）→ `usePageItemsStore.getState().pages[pageNo+1]` 直读（:216）→ `reconcileItemsWithDom` 对账（:220）→ `itemSelectionGeometry`（pdf-item-geometry.ts:475）
4. `pdf-item-geometry.ts`：`rectsForOffsetRange`（:280）→ `itemBoxOf`（:205，`viewportTransformFor` :96 内联 pdf.mjs 数学 + `matMul` :131 合成项变换 + grapheme 比例细分 :228-239）→ `groupByBaseline` 基线聚类（:318）→ `baselineGroupBlocks` 大间隙断段（:344）→ 端点式 clamp01 归一化（:496-502）→ 角度门选 `mergeRects` 终裁或直出（:505-508）→ `bandsFromItems`（:371）→ `selectionHealth` G2 门（:426）
5. G2 unhealthy → `setPaint(null)`；健康 → F-A9 `calibrateBandsWithSpans` → `setPaint` → `selection-paint.tsx` portal 渲染灰层

### 阶段 B：mouseup（全量权威）
1. `SelectionLayer.tsx:126 onMouseUp`：工具条自身跳过（:128）→ `scheduler.cancel`（:129）→ F-12 位移门 <3px 早退（:133-139）→ **F-A12** `releaseAffinity`（release-affinity.ts:162）释放点浅探重定向 `sel.setBaseAndExtent`（SelectionLayer.tsx:156）
2. `evaluate.full(true)` → `selection-evaluate.ts:260 evaluateCore`：`selectionToAnchor`（anchor-serialize.ts:183）——先 `snapBlankBoundary`×2（anchor-blank-snap.ts:225：br/空白标记 → `nearestRow`/`columnGroups`/`rowEndOf` 视觉行行尾解析）→ `probeTextLength`×2 → quote/prefix/suffix 三元组（±32 字符，:228-229）+ DOM 回退 rects（`rectsBetweenPoints`，annotation-anchor.ts:200）
3. 主链 `itemChainFor`（selection-evaluate.ts:118）：页项缺失/对账失败/计算异常三因回退 DOM 量测链；成功则 `pending.anchor.rects = item.rects`（:321，INV-58 所见即所存）
4. `toolbarMountPos`（selection-geometry.ts:89：下翻转+滚动容器夹取+÷有效 zoom）→ `setPending` → SelectionToolbar 弹出

### 阶段 C：保存
`SelectionLayer.tsx:187 save(kind)` → `api.reader.saveAnnotation`（quote/prefix/suffix/startOffset/endOffset/rects 全量落库 :189-196）→ `onSaved` → `reader.store.addAnnotation(paperId, saved)`（reader.store.ts:397，per-paperId 寻址防幽灵标注）→ `pushUndo` → `clearTabDirty` → `removeAllRanges`

### 阶段 D：翻页/缩放后标注重新定位（重锚）
1. zoom 变化 → `PdfPageCanvas.tsx:105` effect 重渲 → `getTextContent` → `onPageRender`（:150-160，items+styles+rotate/view 几何下钻）
2. `PagesOverlay.tsx:92 handlePageRender` → 量测 canvas CSS 盒 → `usePageItemsStore.setEntry`（:97）
3. TextLayer 重建（span 逐个入 DOM）；`AnnotationLayer.tsx:74` 订阅 `pages[page+1]` 条目变化
4. `AnnotationLayer.tsx:83` effect → `resolve()` → **`annotation-resolve-layered.ts:120 resolveAnnotationRectsLayered`** 三层编排：
   - S1 `reconcileItemsWithDom` 对账（:127）→ S2/S3a `resolveAnnotationRectsItem`（annotation-resolve.ts:334：`verifyQuoteItem`→`locateQuote` 自愈重定位→`itemSelectionGeometry` 现构 viewport）+ F-A9 `calibrateBands` → 标 `source:'item'`
   - S1 失败 → S4 `resolveAnnotationRectsDom`（:142，verifyQuote→findRangeAtOffset→bandsForTextNodes）→ S6 `domProductSuppressed` 病理抑制逐条剔除（:146-156）→ 标 `source:'dom'`
   - 双链均缺席 → 消费方回退存量 `a.rects` + `bandsNearRects`（AnnotationLayer.tsx:97-98）
5. `MutationObserver(textLayer)+rAF` 合并重调度（AnnotationLayer.tsx:101-110）
6. 渲染：`mergeRects(resolved[a.id]?.rects ?? a.rects, lineH)`（AnnotationLayer.tsx:125，挂 B 读时归并存量渐净）→ `rectStyle` + `matchBand` 贴字形带

### 层数与历史叠加层分析

从"鼠标拖选"到"色块上屏"，主链经过 **9 层模块**（SelectionLayer → selection-evaluate → anchor-serialize → anchor-blank-snap → annotation-anchor → pdf-item-geometry → annotation-merge → annotation-band-calibrate → selection-paint），重锚链再叠 3 层（page-items.store → annotation-resolve-layered → annotation-resolve）。**双路结构**（项几何主链 + DOM 量测回退）在 selection 和重锚两条链上各存在一份，即实际同屏维护两套几何族。

从工单号和头注可明确识别的"修 bug 叠加层"（时间线清晰）：
- **2026-08-23 Q3**：`mergeLineRects`（annotation-anchor.ts:10-15，高亮叠深/下划线错落）
- **F-A1（2026-08-30）**：`annotation-merge.ts` 归并器（零宽幽灵/同行碎片，INV-A~E）
- **F-A4**：行高感知 lineH 注入 + `SelectionPaint` 自绘并集层（ADR-0019，取代原生 selection）
- **F-A5**：bands 行簇字形带族（bandFromMetrics/matchBand/bandsForTextNodes/bandsNearRects）
- **F-V1**：`estimateLinePitch` 紧凑行距钳制（annotation-anchor.ts:287）
- **F-A6-b2/c（2026-09-03 取证三轮）**：`pdf-item-geometry` 项声明几何主链 + 快/慢路径 + G2 门——整族取代 DOM 量测主链
- **F-A8（2026-09-04 设计书）**：`verifyQuoteItem`/`resolveAnnotationRectsItem`/`annotation-resolve-layered` 三层编排 + S6 抑制
- **F-A9**：`annotation-band-calibrate`（声明 ascent 与量测 ascent 差 2.5-3px 偏移）
- **F-A10（2026-09-09 真机三轮诊断）**：`anchor-blank-snap`（段末空白选区跳跃 7 行）
- **F-A12**：`release-affinity`（释放点浅探下探下一段）
- **F-05/F-ARCH1 等**：瞬时信号清理、单容器滚动收敛

即锚点系统至少经历 **10 轮 bug 驱动叠加**，每轮都留下一个独立模块 + 取证文档 + 回归测试。当前形态是"新主链（items 声明几何）+ 全部旧补丁层保留为回退/门"的并存结构，而非替换。

**最容易再出 bug 的位置**（按风险排序）：
1. **坐标域混用**：盒本地帧 vs 视口域 vs svg 本地——注释中反复出现"第三轮取证 r3a 曾实证减原点会令全部项盒判盒外触发 G2 全抑制"（pdf-item-geometry.ts:367-374、:421-425）。三个域的换算散在 selection-geometry.ts:62 localScale、lineage-viewport.ts:80 rootToLocalScale、annotation-resolve itemViewportOf（:385）。
2. **S6 抑制的右溢支路已知失效**：annotation-resolve-layered.ts:85-87 自认"DOM 产物经 clamp01 反推后 rightOverflowPx 判定弱化为不可观测"。
3. **对账切换点**：`reconcileItemsWithDom` 失败即整页切 DOM 回退链（selection-evaluate.ts:124、annotation-resolve-layered.ts:139），两族产物 rect 形状差异会表现为"缩放/翻页瞬间标注跳变"。
4. **mergeLineRects 与 mergeRects 两套归并口径并存**，各自带一份行距估计（estimateLinePitch / estimateNormPitch，后者注释自认"Rule of Three 第 2 次保持重复"，annotation-merge.ts:81-83）。

---

## ⑤ lineage 渲染管线

1. **取数**：LineagePage 挂载 `lineage.store.load()`（读面 stale-guard + 写读互锁 lineage.store.ts:239-245）。
2. **布局**：`LineageCanvas.tsx:59` `useMemo(() => layoutLineage(nodes, edges))`——lineage-layout.ts 手写 RT 两趟扫描（后序轮廓合并 + 前序定 x），y=年份层带，x/y 非 null 手工覆盖优先，综述节点分流右列；防御性剔除多父/环（不丢节点）。
3. **预计算**：Canvas 内 5 个 useMemo——geom（中心+半高）、surveyIds、slots（边标签防重叠 placeEdgeLabels）、labelBoxes（参与 fit 包围盒）、coreIds（:64-116）。
4. **视口**：`lineage-viewport.ts:141 useViewportController`——auto-fit 状态机（idle→fitting→fitted + userInteracted 抢占门），wheel 锚点缩放/panbg 拖拽，全部经 `rootToLocalScale` 归一到 svg 本地口径（INV-43）；ResizeObserver 监视布局盒换档重 fit（:193-204）。
5. **渲染**：SVG `g[data-viewport] transform` → 层带线+年份标 → LineageEdges（贝塞尔三型色）→ LineageNodeCard（foreignObject 白卡）。
6. **写回**：拖拽/编辑 → store `enqueue(WriteAction)` → flush 串行派发、同实体最后写胜出、CONFLICT 丢弃不卡队、系统型失败保队列重试（lineage.store.ts:175-202）——dirty 投影 `saveStatus !== 'saved'` 上报 App 退出拦截。

---

## ⑥ shared 层与死代码

消费方实测（grep 计数）：Toast/toast-store **21** 个文件（最高频）、Dialog 7、Button 6、toast-store 直引 7（.ts 模块）、ui-constants 10、save-status 5、useAsync 3（全在 library）、keymap 2（均在 reader）、DiamondRule 3、reading-time-format 2、**SplitPane 1**（仅 ReaderPageView）、**useDebounce 1**（仅 FilterBar）。

结论：**无死代码**；SplitPane(210 行) 与 useDebounce 是"低使用率活代码"。CSS 组织为 token 主题 5 件分域（theme-shell/buttons/reader/lineage，main.tsx:6-12 注明 import 序=层叠语义）+ feature 级 3 件 + Tailwind 类混用，皮肤与布局分离有明确纪律（.app-content-row zoom 白名单登记于 check-quality DYNAMIC_TOKENS）。

---

## ⑦ 复杂度热点 TOP 清单（带证据）

1. **reader 锚点双几何族并存（最大热点）**：items 声明几何族（pdf-item-geometry 514 行 + verifyQuoteItem + resolveAnnotationRectsItem）与 DOM 量测族（annotation-anchor 453 行 + verifyQuote + resolveAnnotationRectsDom）平行维护，切换判据是 `reconcileItemsWithDom` 字符串全等（pdf-item-geometry.ts:184-186）——一次 pdfjs 升级或文本层差异即整页切换几何族。
2. **重复模式**：
   - stale-guard `loadSeq` 请求序号闭包至少 **7 处**（library.store.ts:59、tags.store.ts:58、workspace.store.ts:75、notes.store.ts:106、lineage.store.ts:123、ai-notes.store.ts:43-44、reader.store.ts:217-219）——注释互相引用"对齐 library.store"，是约定复制而非共享件。
   - `probeTextLength`/偏移探测 3 处复制（anchor-serialize.ts:239、selection-evaluate.ts:162、pdf-item-geometry itemsTextOf :178），代码自注"Rule of Three 第 2 次保持重复"（anchor-serialize.ts:46-48）。
   - 下中位数 `lowerMedian` 3 处（pdf-item-geometry.ts:265、annotation-merge.ts:60、annotation-anchor.ts:223-254 内联）；行距估计 2 处（annotation-anchor.ts:287 / annotation-merge.ts:84）；`rootToLocalScale`/`localScale` 双胞胎跨域各一份（lineage-viewport.ts:80 / selection-geometry.ts:62，注释声明有意不复用）。
3. **隐式全局状态（模块级单例）**：toast 队列（toast-store.ts:28-35）、annotation-undo 栈（annotation-undo.ts 模块级 Record）、notes 编辑元数据 6 个 Map/Set（notes.store.ts:79-99）、outbox 单例 + seqNext（reading-time-setup.ts:38-41）、locateSeq（anchor-locate.ts:122）、flashStyleReady、graphemeSegmenter（pdf-item-geometry.ts:144）、ctxCache（annotation-resolve.ts:138）、workerConfigured（CorpusExtractor.ts:176）。这些均不可序列化、不可 DevTools 观察、测试需手动复位。
4. **超 250 行组件：0 个**——机器红线生效（"组件 ≤250 行红线"在 annotation-resolve.ts:3、selection-evaluate.ts:2-5、lineage-viewport.ts:4 多处提及，拆件记录为 F-SPLIT-01）。超 250 行的 16 个文件全部是纯逻辑 .ts（几何/状态机/store），最大组件 LineageCanvas 238。
5. **信号驱动 + 瞬态信号生命周期**：reader.store 内 3 个 seq 递增信号（scrollRequest/noteHighlight/aiNoteHighlight，reader.store.ts:134-142）+ 关 tab 时的选择性清理规则（:256-265）——是全仓最微妙的隐式协议之一（F-ARCH1 批次修过）。
6. **进度/时长落库链最长**：scroll-progress 六态机 → composite flusher → chunkSeconds 分片 → outbox T1-T6 → saveProgress 单通道，共 5 个文件 1,100+ 行（scroll-progress.ts:367、reading-time.ts:303、reading-time-outbox.ts:300、reading-time-setup.ts:139、reading-time-outbox-store.ts:87）——为一个非关键数据（阅读页码+秒数）付出的架构复杂度显著高于其余 feature 单个整域。

---

## ⑧ 架构风险观察（综合）

1. **注释即文档的债务**：几乎每个文件头 50-100 行是五层规约（行为/接口/架构/生命周期/文化）注释，大量引用工单号、取证文件、日期。正文档与注释的同步全靠人工（tab-dirty.ts:25-29 的 file:line 接缝声明已出现 stale 风险——其引用的行号与现文件不再对齐）。新人理解成本高，但反过来这也是全仓可审计性强的原因。
2. **reader 是"补丁地层学"**：10 轮 bug 修复叠加出的分层（见④），新旧两代主链并存、旧链作为回退永久保留。任何触碰 pdfjs 版本、zoom 语义、文本层 DOM 结构的改动都要同时验证两族；G2/S6 门又依赖两族交叉判定。这是未来 bug 的最大温床，长期看需要一次"DOM 量测族退役"的收敛票。
3. **模块级闭包状态与 zustand 并存的双轨制**：per-tab 语义一半在 store（tabs）、一半在模块 Map（undo 栈、notes 元数据、scroll 状态机 papers Map）。App 单阅读器单实例的前提（page-items.store.ts:31-32 自注）一旦被多窗口/多实例打破即全线失守。
4. **跨域治理靠脚本白名单而非类型系统**：COMPOSITION_ROOT_ALLOW 7 条例外已开始累积（workspace.store→notes、tab-dirty→notes、settings→reader.CorpusExtractor、lineage→reader.ai-note-style），白名单是单点膨胀面。
5. **工程纪律反常地强**（对风险清单的平衡项）：契约测试三方对账、组件 250 行红线机器化（check-quality）、不变量登记册（INV-XX 全文引用）、锁定测试 sha256 面、playwright e2e。这使上述复杂度处于"受控燃烧"状态——但每个修复都再加一层模块+测试，收敛压力持续上升。
