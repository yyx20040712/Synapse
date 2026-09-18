# F-GEOM-01 设计链第一跳简报——拟定者（drafter）

> 派发档位声明：kimi-main（kimi-k3，reasoning=max 档，tier=prime）。
> 派发通道：外部派发器（你无仓库访问权，一切事实已随包）。
> 主控：GLM5.3（本简报编制+终裁位）。日期：2026-09-18。

## 0. 任务

为单人本地学术文献管理+PDF 阅读标注桌面应用（Electron + 纯 TypeScript，渲染层 React）
拟定 **F-GEOM-01 战役设计书草案**。战役双目标（用户已裁决，不可改）：

- **A. 双几何族同族化**：pdf.js 项声明几何族（pdf-item-geometry.ts，515 行）收编
  DOM 量测几何族（annotation-anchor.ts，454 行）——单一真相源化；重锚三档回落
  S0-S6/band 推导三处/边界归一两机制随族收敛。
- **B. reader 子域目录化**：69 文件平铺目录（11,860 行）重组为六子域
  **anchors/view/interact/panels/time/state**（六域名=用户裁决定死，你只做文件
  归属映射，不改名）+ 域内单向依赖图。

你产出**设计书草案**（不是实现）。GLM 主控终裁后定稿，deepseek 已在你之前/之后
对抗审核（你无需自审合规，但事实错误会被抓——所有计数与行号以本简报随包数据
为准，不得自行虚构）。

## 1. 设计书必备章节（受理门——缺任一即不受理）

1. **锚定簇态空间表**：重锚链 S0~S6 全态枚举（态×入口条件×守卫×产物域标记
   source:'item'/'dom'×缺席语义×消费方回退），加 selection 链双路径态
   （快路径 visual/全量 full/各自回退态）。
2. **跨格序列推演**：至少覆盖以下序列的现状行为与同族化后行为（逐格推演，
   禁只给单格）——①拖选中途 zoom 变更（快路径帧已落地→全量同帧覆盖）；
   ②重锚期 store 条目迟到（CR1 竞态：订阅先于 textLayer 就绪）③对账失败
   整页切 S4 后下一帧对账恢复（跳变风险）④S6 抑制后条目再渲染 ⑤保存链
   rects=项几何族而显示链=S4 DOM 族（同屏双族形状差）。
3. **回落档语义裁决**（前史明文要件）：三档（项几何主链→DOM 量测→存量 rects）
   各自的去留/收缩/语义重定义；三回退因（页项缺失/偏移对账失败/计算异常）
   的处置；S4 与 S6 的命运（既有条款「门 3 随回退层去留复核」待决）。
4. **六子域目录重组清单与迁移序**：69 文件→六子域逐文件映射表+迁移步序
   （每步可独立提交且 verify 全绿）+域内单向依赖图（现状邻接表随包，见 §5）。
5. **净删行数记账**：方法（按域 git diff --stat 实测口径）+基线数字+目标估算
   （各收敛面分别列）。
6. **前史两条款承袭**：①「测试逼生产保形状」五例解耦票池统筹（见 §7——给出
   哪些随本战役、哪些独立票、哪些维持）；②契约面生长评估（selection 通道，
   见 §8）。
7. **验收底色**：e2e 默认门 43/一键全跑 45 全绿不破+锚定回归网（见 §9）+
   净删行数记账（M2 收敛量化证据）。
8. **实施票切分建议**：设计书批准后按此切执行票（每票一个逻辑单元独立提交）。

## 2. 系统现状（证据——你设计的事实基础）

### 2.1 两条消费链（双路结构=同屏维护两套几何族）

**selection 链（拖选→保存）**：
- 快路径 evaluateVisual（rAF 帧点）：四道守卫（选区空/跨页/页外/零宽盒）→
  轻量偏移 probe（Range.toString×2）→page-items.store 直读页项→
  reconcileItemsWithDom 对账→itemSelectionGeometry（项几何族）→G2 健康门
  →setPaint（灰层）。失败→回退全量视觉评估。
- 全量 evaluateFull（mouseup/settle）：selectionToAnchor 三元组
  （anchor-serialize：snapBlankBoundary×2→probeTextLength×2→quote/prefix/
  suffix±32 字符+**DOM 回退 rects**=rectsBetweenPoints）→itemChainFor 项几何
  主链（失败三因回退 DOM 量测链）→pending.anchor.rects=项几何产物（保存链
  与视觉同一来源）。
- 保存：save(kind)→api.reader.saveAnnotation（quote/prefix/suffix/startOffset/
  endOffset/rects 全量落库）。

**重锚链（翻页/缩放后标注重定位）**：S0~S6 状态机（annotation-resolve-layered，
每页一次编排）：
- S0：entry=usePageItemsStore 页项条目（react 订阅传入，CR1 store 晚于
  textLayer 就绪竞态由订阅兜底；CR3 取数以当前 page prop 为键）；
- S1：reconcileItemsWithDom(items, fullTextOf(textLayer)) 对账；失败→warn+S4；
- S2/S3a：对账通过→resolveAnnotationRectsItem（verifyQuoteItem 逐条校偏→
  itemSelectionGeometry）产物标 source:'item'；F-A9 calibrateBands 校准叠加；
- S3b：主链条目缺席（verifyQuoteItem 失败/他页/空引文）→消费方回退存量
  rects+bandsNearRects（语义=接线层现状推导式）；
- S4：页级回退=resolveAnnotationRectsDom（verifyQuote→findRangeAtOffset→
  rectsBetweenPoints[mLR 链]+bandsForTextNodes）产物标 source:'dom'
  （仅显示不回写）；**函数体零改=INV-47 数值面锚定（受锁断言）**；
- S6：S4 产物经 selectionHealth 判定（healthDom 口径）unhealthy→抑制 DOM
  产物显示+warn 单源。已知边界：右溢支路≈恒 0（DOM 产物经 clamp01 反推后
  不可观测）；S6 触发=项盒健康代理，项盒健康而 DOM 链独立病理时不拦。
- AI 段版 resolveAiNotesLayered 共形（S3b=该段不渲染——AI 无存量可回退；
  S4 产物被 S6 抑制=不渲染）。

### 2.2 双几何族对照（收编对象）

| 维度 | 项声明几何族（主链） | DOM 量测几何族（回退） |
| --- | --- | --- |
| 宿主 | pdf-item-geometry.ts（515 行纯函数） | annotation-anchor.ts（454 行）+annotation-resolve.ts（416 行）量测部分 |
| 几何来源 | PdfTextItem 自带 width/height/transform（pdf.js 定位 span 用的同一数据，按构造无测量噪声） | Range.getClientRects/gBCR/getComputedStyle/canvas measureText |
| 偏移映射 | buildItemOffsets（剔空串项逐项累计）+reconcileItemsWithDom 对账 | collectSpans（TreeWalker 文本节点累计） |
| 行级并块 | baselineGroupBlocks（基线 v 轴投影聚类+组内 x 大间隙断段 COLUMN_GAP_*） | mergeLineRects（y 重叠/中心距聚行簇+断段，同 COLUMN_GAP_* 单源 import） |
| 行距 | baselineTolPx（0.5×主导行字高下中位，max(2,·)） | estimateLinePitch（y 中心差滤 <2px 下中位）+annotation-merge estimateNormPitch（第二份） |
| 归一化 | 端点式 clamp01（两轴左右/顶底端点独立夹取后求差） | clamp01 各分量独立（rectsBetweenPoints） |
| 终裁归并 | mergeRects（annotation-merge，INV-A~D）近水平门内应用 | 归一化前 mergeLineRects+归一化后 mergeRects 双层 |
| bands | bandsFromItems（项盒+styles 派生，C5 禁混用） | bandsForTextNodes（节点口径）/bandsNearRects（几何口径）+bandFromMetrics（canvas 字体度量） |
| 健康门 | selectionHealth（G2：偏离率 ≥5%/右溢 >2px） | 无独立门（S6 借项几何盒判定） |
| 量测噪声 | 无（声明几何） | 有（锯齿/右溢病根族——历史修 4 轮） |
| viewport 数学 | viewportTransformFor（pdf.mjs PageViewport 构造器内联，userUnit=1 边界）+matMul（Util.transform 内联） | 无（直接用渲染产物） |

**DOM 几何产链的存活消费面（实测 grep，全仓仅三处，全部是回退层）**：
1. anchor-serialize.ts:230 selectionToAnchor 产 DOM 回退 rects（rectsBetweenPoints）；
2. annotation-resolve.ts:303 resolveAnnotationRectsDom（S4）；
3. annotation-resolve-layered.ts:237 AI 段 S4 + selection-evaluate.ts:311 全量
   DOM 回退（findRangeAtOffset）。
**mergeLineRects/estimateLinePitch/rectsFromRange 在 src 运行面零外部消费**
（仅 annotation-anchor 内部 rectsBetweenPoints 调用+受锁测试直测）。
**注意**：annotation-anchor 的文本遍历面（collectSpans/fullTextOf/offsetToPoint/
pixelBoxOf）不是几何族——它们是偏移系统基础设施，被 anchor-serialize/
anchor-blank-snap/release-affinity/layered S1 对账广泛消费，**不属于收编对象**。

### 2.3 band 推导三处+F-A9 校准叠加

1. bandsFromItems（项几何族，pdf-item-geometry）：每基线行一带，top/bottom=行内
   项盒纵向并集，x0/x1=水平端点，center 用未 clamp 原始值；
2. bandsForTextNodes（DOM 节点口径，annotation-resolve）：引文自身 textNodes→
   span 实测盒+canvas 字体度量→字形带（免疫 CSS 行盒整体偏移错绑上一行——
   真机实锤 ~9px 偏移在案）；matchBand 最近中心带匹配（|Δcenter|≤rect.h）；
3. bandsNearRects（DOM 几何口径，annotation-resolve）：rect 集→gBCR 预筛重叠
   span→行簇带（存量 rects 回退路径专用——重锚失败无节点可依）；
4. F-A9 calibrateBands（annotation-band-calibrate，120 行）：渲染时刻 DOM span
   盒实测校准 calTop/calBottom（项盒=styles 声明 ascent vs pdf.js span=量测
   ascent，小字号差 2.5~3px）；窗=span 中心∈band 垂直域+水平重叠>0；
   matchBand 匹配键仍派生 center（校准不参与行归属）。
RowBand 类型（top/bottom/center/x0?/x1?/calTop?/calBottom?）单源 annotation-resolve。

### 2.4 边界归一两机制（源码明言「互不替代」）

1. snapBlankBoundary（anchor-blank-snap.ts，285 行）：段末空白 affinity 归一
   （br 槽位/空白 span→视觉行行尾，nearestRow/columnGroups/rowEndOf）——
   DOM 亲和口径；
2. releaseAffinity（release-affinity.ts，211 行）：释放点浅探手势几何裁决
   （F-A12 下探下一段）——手势几何口径。
两者作用于不同事件相位（锚定三元组生成前 vs mouseup 释放时），设计需明确
「随族收敛」对这两者的含义（预期：维持两机制但声明其为非几何族域——待你裁决
并给理由）。

### 2.5 已知风险点（前史调研排序，设计应逐一处置）

1. **坐标域混用三处**：selection-geometry.ts:62 localScale / lineage-viewport.ts:80
   rootToLocalScale / annotation-resolve itemViewportOf（:385）——盒本地帧 vs
   视口域 vs svg 本地；历史取证实证减原点域差会令 G2 全抑制。
2. **S6 右溢支路失效**（clamp01 反推后 rightOverflowPx≈恒 0）。
3. **对账切换点跳变**：reconcile 失败整页切 S4，两族产物 rect 形状差=
   缩放/翻页瞬间标注跳变。
4. **双归并口径并存**：mergeLineRects（像素域）vs mergeRects（归一化域）+
   双行距估计（estimateLinePitch/estimateNormPitch，源码自认 Rule of Three
   第 2 次保持）。

### 2.6 相关不变量（既有裁决语义，设计不得违反，只可显式提案修订）

- **INV-58**：快路径与全量必须同一几何族；rect 与 bands 同由项几何+styles 派生
  （禁项源 rect×DOM 量测 band 混用）；适用域=selection 产链+Annotation/
  AiAnnotation 重锚链；**DOM 量测仅允许存在于显式回退层（S4）且产物必须标域
  （source:'dom'，INV-60 不入库）**；回退层允许=快→全量→DOM 三层回退末端，
  warn 不静默。
- **INV-47**：mergeLineRects 紧凑行距双门（pitch 钳制）——适用面已收缩为
  「S4 DOM 回退层+存量读时归并」；S4 函数体零改=受锁断言锚。
- **INV-37**：划选视觉=自绘并集层（选区状态直接函数，拖选期语义弱化显式登记
  「所见≈所存」，松手/保存时刻严格恢复）；selection-paint portal 单层单绘。
- **INV-60**：source 域标记=运行时调试面+单测断言面，不入库（渲染样式零差）。
- **INV-16**：pdfjs-dist import 白名单仅 4 文件（PdfDocProvider/PdfPageCanvas/
  TextLayer/CorpusExtractor——eslint override 块锁死）。
- **INV-20**：锚点定位单入口=anchor-locate（exact/page/paper 三防线+序号守卫）。
- 单窗口单实例=架构前提（渲染层模块级单例合法）。

### 2.7 目录化现状与爆炸半径

- reader 目录=69 文件平铺（.ts/.tsx/.css 合计 11,860 行，实测 wc）。高频耦合
  核心：reader.store.ts 484 行（per-tab 状态机，被 14 文件 import）/pdf-item-
  geometry 515/annotation-anchor 454/annotation-resolve 416/selection-evaluate
  326/anchor-serialize 259/annotation-resolve-layered 252。
- **类型级环（目录化必须切断）**：pdf-item-geometry↔annotation-anchor
  （PixelBox type-only 反向）/↔annotation-resolve（RowBand type-only 反向）/
  ↔PdfPageCanvas（PdfTextItem/PdfTextStyle type-only 反向）——运行时单向
  （type import 编译期擦除），但目录依赖图要求值依赖+类型依赖同向。
- **跨域消费面**：anchor-locate 被 lineage 域 2 文件+shared/open-paper-bus 消费
  （目录化后 import 路径同步更新）；App.tsx import ReaderPage/tab-dirty。
- **受锁面（改路径必触）**：51 个测试文件以相对路径 import features/reader/*
  （tests/** 受锁 sha256——改动=locks:unlock→改→apply 单链+[locked-change]+
  [test-refactor] 尾注）；eslint.config.js:89-92 四路径（INV-16 override 块）；
  scripts/check-quality.mjs:96-97 两路径（跨域规则表）。
- 分层单向宪法：renderer→window.api→ipc；文件 ≤500 行（repo ≤300 组件 ≤250）；
  方案切换=删除旧方案（不允许双方案并存）；死代码即删。

### 2.8 测试基线（验收底色的当前真值）

- vitest 170 文件/1745 用例；指纹门 187 文件/1790 用例/5417 断言/skipSites 15
  （C_after ⊇ C_before 机检在位）；locks manifest 338；registry 195 票 open 9。
- e2e：默认门 test:e2e=43 例（--project=app，不含探针）；一键全跑
  test:e2e:all=45 例。探针 spec（z-r2e/z-wg1）在 all 门。
- 锚定回归网（unit）：selection-evaluate/selection-layer×2/selection-item-chain/
  selection-geometry/selection-paint/selection-mode/annotation-anchor/
  annotation-layer/ai-annotation-layer/annotation-merge/anchor-blank-snap/
  anchor-item-verify/anchor-locate/band-calibration/pdf-item-geometry/
  pages-overlay/pdf-page-canvas（17 件）+e2e reader-text/reader-search/
  ai-notes-section。
- 五层规约头注惯例：GEOM 触及的锚定簇文件头注随票重写（改到哪写到哪）。

## 3. 设计裁决问题清单（草案必须逐项给出裁决+理由）

1. **「收编」的精确语义**：单一真相源的边界画在哪？候选面：①几何产链单源化
   （DOM 族 rects 产链退役/降级为 S4 专用实现细节）②band 三处→几处？
   ③归并器双口径（mergeLineRects/mergeRects）与双行距估计的收敛 ④pixelBoxOf/
   文本遍历面留在共享基础设施。每项给「退役/保留/收缩/迁移」四择一+理由。
2. **S4 去留**（回落档语义核心）：候选——a) 保留原样（INV-47 零改锚定不动）；
   b) 收缩触发面（对账失败才走，其他因走别的处置）；c) 退役（存量 rects 直接
   兜底）。注意受锁断言锚（resolveAnnotationRectsDom 函数体零改）与 INV-58
   「DOM 量测仅允许存在于显式回退层」的既有裁决张力；退役=INV 修订提案
   （需显式列出）。
3. **S6 去留**：右溢支路失效已知；若 S4 收缩/退役，S6 的意义重估。
4. **三回退因的现实处置**：页项缺失（entry undefined——渲染竞态 or 真缺席）/
   偏移对账失败（items≠DOM——pdf.js 版本演进风险）/计算异常（畸形 rotate）。
   各自的守卫/观测（warn 单源）/自愈路径设计。
5. **对账切换点跳变消减**：同族化后回退层产物与主链产物的形状一致性如何
   提升？候选：回退层产物也走项几何族包装（dom rects→同族归一化管线）？
   还是接受形状差+抑制跳变（过渡动画）？还是别的？
6. **六子域映射**：69 文件逐文件归属（anchors/view/interact/panels/time/
   state）+每域职责一句话+域内依赖方向声明+环切断方案（候选：types 下沉
   共享件/域内再分层）。**reader.store 是 state 域还是横切**（它被 14 文件
   import——横切 store 的归属是关键裁决）。
7. **迁移序**：每步一个可独立提交的原子迁移（受锁面单链），步数与顺序——
   先切环/先移低耦合域/先移高耦合 anchors 域？给出依赖驱动的拓扑序+每步
   verify 面。
8. **净删行数记账**：基线（reader 11,860/几何簇 7 文件合计 ~2,300 行）→
   各收敛面目标（同族化净删/目录化纯移动不增删/头注重写）。
9. **五例解耦票池统筹**（§7 五例）：哪些随本战役实现票、哪些独立票、哪些
   维持现状——给票池切分建议。
10. **契约面生长评估**：本战役预期零通道变更（纯 renderer 内部重构）——论证
    或证伪。
11. **实施票切分**：设计批准后的执行票清单（建议 3-6 票，每票独立提交+
    门审）。

## 4. 约束与红线（设计不得触碰）

- 禁止新增依赖；文件 ≤500 行；分层单向；测试是锁定的合约（设计若需改测试
  语义→显式列为 [locked-change][test-refactor] 面并给理由，不许默认可改）。
- 负面清单：不做跨页标注、不做多窗口、不做知识图谱自动引文网络图。
- e2e 验收底色不可降（43/45 全绿不破）；指纹门 C_after ⊇ C_before。
- 新增跨模块行为不变量须登记 docs/invariants.md（设计书列出预计新增/修订的
  INV 清单——如「几何产链单源」本身应升 INV）。
- 禁止为未来预建抽象（总原则：只还债不造新债）。

## 5. reader 域内 import 邻接表（实测，目录化设计输入）

（X -> Y 表示 X import Y；只列 reader 域内相对 import）

```
useActiveTab -> reader
FragmentNotesList -> annotation-style
OutlineThumb -> PdfDocProvider ; OutlinePanel -> OutlineThumb, PdfDocProvider
open-paper-anchor -> anchor-locate, reader
AiNoteGroupList -> ai-note-style
reader-search.store -> PdfPageCanvas, reader-search
useReaderSearch -> ReaderSearchBox, reader, reader-search, useActiveTab
SearchHighlightLayer -> page-layer-z, reader-search ; ReaderSearchBox -> reader-search
reader-search -> PdfPageCanvas
scroll-progress -> PageColumn, reader, scroll-converge
PageBox -> PdfDocProvider, PdfPageCanvas, page-column-geometry
page-items.store -> PdfPageCanvas
PagesOverlay -> AiAnnotationLayer, AnnotationLayer, PageColumn, PdfDocProvider, PdfPageCanvas, SearchHighlightLayer, TextLayer, page-column-geometry, page-items
selection-paint -> annotation-resolve, annotation-style, page-layer-z
AiAnnotationLayer -> ai-note-style, ai-notes, annotation-resolve, annotation-resolve-layered, annotation-style, page-items, page-layer-z, reader
reading-time-outbox-store -> reading-time-outbox
reading-time-setup -> reader, reading-time, reading-time-outbox, reading-time-outbox-store
AnnotationLayer -> AnnotationPopups, annotation-merge, annotation-resolve, annotation-resolve-layered, annotation-style, page-items, page-layer-z, reader
reader-shortcut-handlers -> ReaderShortcuts, ReaderToolbar, reader, useActiveTab
ReaderPage -> PageColumn, ReaderPageView, open-paper-anchor, reader, reader-shortcut-handlers, reading-time, reading-time-setup, scroll-progress, useActiveTab, useReaderSearch
PageColumn -> PageColumnView, PdfDocProvider, PdfPageCanvas, page-column-geometry, usePageColumnScroll, usePageLazyWindow
ReaderPageView -> OutlineAside, PageColumn, PagesOverlay, PdfDocProvider, ReaderToolbar, SelectionLayer, TabBar, page-column-geometry, reader, scroll-progress
PageColumnView -> PageBox, PdfDocProvider, PdfPageCanvas, page-column-geometry
usePageLazyWindow -> page-column-geometry ; usePageColumnScroll -> page-column-geometry, scroll-converge
AiNotesSection -> AiNoteGroupList, AiNotesStatus, ai-notes, ai-notes-phase, anchor-locate, useActiveTab
ReaderToolbar -> annotation-style ; AnnotationPopups -> AnnotationEditor, AnnotationMenu, annotation-undo, reader
annotation-resolve-layered -> anchor-serialize, annotation-anchor, annotation-band-calibrate, annotation-resolve, page-items, pdf-item-geometry
annotation-resolve -> anchor-serialize, annotation-anchor, page-items, pdf-item-geometry
annotation-band-calibrate -> annotation-anchor, annotation-resolve
anchor-serialize -> anchor-blank-snap, annotation-anchor
PdfPageCanvas -> page-layer-z, pdf-item-geometry
pdf-item-geometry -> PdfPageCanvas*, annotation-anchor*, annotation-merge, annotation-resolve*   (*=type-only)
annotation-anchor -> annotation-merge, pdf-item-geometry (COLUMN_GAP 值 import)
AnnotationEditor -> annotation-style, use-annotation-draft ; AnnotationMenu -> annotation-style
AiNotesStatus -> ai-notes, ai-notes-phase
anchor-blank-snap -> annotation-anchor
SelectionLayer -> SelectionToolbar, annotation-undo, reader, release-affinity, selection-evaluate, selection-geometry, selection-paint
release-affinity -> anchor-blank-snap, annotation-anchor
TabBar -> reader, tab-dirty ; tab-dirty -> reader
TextLayer -> PdfPageCanvas, page-layer-z, text-layer.css
OutlineAside -> OutlinePanel, ReaderNotesPanel, anchor-locate, reader, useActiveTab
ReaderNotesPanel -> AiNotesSection, FragmentNotesList, useActiveTab
anchor-locate -> anchor-serialize, reader, scroll-converge
reader.store -> annotation-undo
selection-evaluate -> anchor-serialize, annotation-anchor, annotation-band-calibrate, annotation-resolve, page-items, pdf-item-geometry, reader, selection-geometry
```

reader 域外消费：anchor-locate→lineage 域 2 文件+shared/open-paper-bus；
App.tsx→ReaderPage, tab-dirty。51 个测试文件 import reader 路径（受锁）。

## 6. 几何簇文件行数（净删记账基线，实测 2026-09-18）

pdf-item-geometry 515｜annotation-anchor 454｜annotation-resolve 416｜
selection-evaluate 326｜annotation-resolve-layered 252｜anchor-serialize 259｜
annotation-band-calibrate 120｜annotation-merge 173｜anchor-blank-snap 285｜
release-affinity 211｜anchor-locate 294｜page-items.store 69｜selection-geometry
142｜selection-paint 85（tsx）｜annotation-style 120｜annotation-undo 197｜
use-annotation-draft 193

## 7. 「测试逼生产保形状」五例（前史登记，解耦票池）

| 测试 | 锁住的生产形状 |
| --- | --- |
| tests/unit/services/lineage-tags.test.ts:66,87 | lineage 草稿 tags? 可选字段（旧版草稿零破坏） |
| tests/unit/services/reader-time.test.ts:56 | secondsDelta 第三参缺省=0 |
| tests/unit/renderer/annotation-layer.test.tsx:33-327 | 存量 rects 回退渲染路径 |
| tests/unit/renderer/reader-search-ui.test.tsx:440 | 某可选 prop 旧占位 span 兜底 |
| tests/unit/db/migrate-reading-time.test.ts:27 | v7→v8 迁移默认值 0 |

处置铁律（前史已裁）：解耦票须同时改 src 与对应测试走 [locked-change] 双门；
本战役设计书只做统筹（归属裁决），不放宽任何测试。

## 8. 契约面现状（生长评估对象）

IPC 12 域 55 通道（reader 域 6：saveAnnotation/saveAiNote 相关+打开/跳转族）；
renderer 统一经 api/client 门面。本战役=纯 renderer 内部重构，预期零通道变更、
零 src/shared 变更——设计书须论证此预期（或指出例外）。

## 9. 输出要求

- 中文 Markdown 设计书草案，产出预算 **≤500 行**（超出=截断风险，优先保
  态空间表/跨格序列/回落档裁决/迁移序四件的完备性）。
- 结构：§0 背景与目标→§1 现状诊断（引用本简报事实，禁重新发明）→§2 同族化
  设计（含必备章节 1/2/3）→§3 目录化设计（含必备章节 4/5）→§4 前史承袭
  （必备章节 6）→§5 验收与实施票切分（必备章节 7/8）→§6 风险与开放问题。
- 一切计数引用本简报随包数字；你的新主张如涉及未随包事实，标注
  **[假设]** 并说明需要主控核实什么。
- 对 §3 的 11 个裁决问题逐项编号回答（Q1~Q11），每项给裁决+理由+风险。
- 态空间表用 Markdown 表格；跨格序列用「序列名：格 1→格 2→…」逐格推演格式。
- 你不写实现代码；接口变更给签名级示意即可。
