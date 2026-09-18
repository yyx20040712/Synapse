# F-GEOM-01 战役设计书（定稿）——双几何族同族化 + reader 六子域目录化

> 流程地位：**设计链三跳产物**（2026-09-18）。第一跳=Kimi 拟定（kimi-k3 max，
> 256 行草案，scripts/audits/geom01-drafter-out.md）；第二跳=deepseek 对抗审核
> （deepseek-v4-flash max，**返工 verdict B=5/W=7/N=4**，scripts/audits/
> geom01-auditor-out.md）；第三跳=GLM5.3 主控终裁定稿（本件——全部 B/W/N
> 逐条处置见 §7，涉仓库核实项由终裁位亲核）。前史链：2026-09-11 架构复杂度
> 审计 M2 多路线并存 → 2026-09-11 GLM 终裁 §3-1（设计链三跳+三要件）→
> 2026-09-18 复杂度治理裁决书 §3 梯队三（扩容=+目录化，裁决 5）。
> 本件=设计书；实现票按 §5.3 切分**另行立案**（本板 F-GEOM-01 实现行下逐票勾选）。
> 证据基线：2026-09-18，HEAD=6ec6d8bbbc（batch 10 收口后，src 零变更）；
> 计数均本批机器实测（vitest 170 文件/1745 用例、check-tickets 195 票 open 9、
> locks 338、e2e 见 §5.1；reader 69 文件/11,860 行=wc 实测）。

---

## 0. 战役目标与终裁总纲

用户裁决目标（不可改）：**A. 双几何族同族化**（pdf.js 项声明几何族收编 DOM
量测几何族——单一真相源化；重锚三档回落/band 推导三处/边界归一两机制随族
收敛）；**B. reader 子域目录化**（69 文件平铺 → anchors/view/interact/panels/
time/state 六子域+域内单向依赖图）。

**终裁总纲（一句话）**：经 F-A8 门2（2026-09-04）后，重锚主链与 selection
产链的主路**已经同族**（项几何族）——本战役的真收敛面不是再造管线，而是
**闭合最后三条接缝**：①保存链可落 DOM 族 rects 入库（§2.4 唯一行为变更）；
②band 三推导无档位绑定（§2.5 登记绑定）；③几何簇文件平铺+类型级环（§3）。
S4 回退层/S6 抑制门/三回退因结构**维持现状**（B3/B5 处置——拟稿的「族管线
包装」「S0 挂起守卫」经审核驳回，理由 §2.3）。主要收益指标=跨族交互点计数
（§2.6），净删行数为辅助记账（§3.5）。

---

## 1. 现状诊断（事实基线，机器实测）

1. **双消费链**：selection 链（快路径 evaluateVisual/全量 evaluateFull——两路
   产物已同族=项几何）与重锚链 S0~S6（S2/S3a 项族标 source:'item'；S4 DOM
   回退标 'dom'）。
2. **DOM 几何产链存活消费面=三处回退层**（grep 全仓实测）：anchor-serialize:230
   （selectionToAnchor 的 DOM 回退 rects）→selection-evaluate:311（全量显示
   回退+**经 pending.anchor.rects 可入库**=接缝①）；annotation-resolve:303
   （S4）；annotation-resolve-layered:237（AI 段 S4）。mergeLineRects/
   estimateLinePitch/rectsFromRange 运行面零外部消费（rectsFromRange 有受锁
   测试直测消费）。
3. **band 推导三处**：bandsFromItems（项族）/bandsForTextNodes（DOM 节点口径）/
   bandsNearRects（DOM 几何口径，S3b 专用）+F-A9 calibrateBands 显示层校准。
4. **边界归一两机制**：snapBlankBoundary（DOM 亲和）/releaseAffinity（手势
   几何）——不同事件相位，源码明言互不替代。
5. **类型级环三处**（type-only 反向边，运行时单向、目录依赖图须切断）：
   pdf-item-geometry↔annotation-anchor（PixelBox）/↔annotation-resolve
   （RowBand）/↔PdfPageCanvas（PdfTextItem/PdfTextStyle）；另有两条 store→
   PdfPageCanvas type-only 边（page-items.store:37、reader-search.store:41）。
6. **受锁面**：51 测试文件相对路径 import reader；eslint.config.js:89-92 四
   路径（INV-16 override）；check-quality.mjs:96-97 两路径；pdf-factory.ts
   import CorpusExtractor；ai-annotation-layer.test:25 import PdfTextItem
   type 自 PdfPageCanvas 路径。

---

## 2. 同族化设计（受理门 1/2/3）

### 2.1 锚定簇态空间表（终版=现状定界+保存门一处变更）

重锚链 S0~S6（每页一次编排，annotation-resolve-layered；**终态全部=现状**，
无新态无删态）：

| 态 | 入口条件 | 守卫/判定 | 产物 source | 缺席语义 | 消费方回退 |
| --- | --- | --- | --- | --- | --- |
| S0 | 翻页/缩放/条目到达触发编排 | 页码键=当前 page prop（CR3）；订阅兜底 CR1（条目到达自动重编排） | — | entry undefined=页未渲染（走 S4 首渲染定位） | — |
| S1 | entry 在场 | reconcileItemsWithDom(items, fullTextOf) | — | textLayer 未就绪=编排前提不进入 | 失败→warn 单源+S4 |
| S2/S3a | 对账通过 | verifyQuoteItem 逐条校偏；F-A9 calibrateBands 叠加 | 'item' | 条目缺席（校偏失败/他页/空引文）→S3b | S3b |
| S3b | 主链条目缺席 | 存量 rects 存在性（消费方接线层推导式，语义=显式档 3） | 'item'（存量族产物历史落库） | 无存量→该条不渲染（AI 段原语义） | 显示链末端 |
| S4 | entry undefined ∨ S1 失败 | resolveAnnotationRectsDom **函数体零改**（INV-47 受锁锚）；bands=bandsForTextNodes 节点口径（同源，C5 合规——**B2 处置：驳回拟稿 bands 优先 bandsFromItems**） | 'dom'（INV-60 不入库） | 仅显示不回写 | S6 判定 |
| S6 | S4 产物就绪 | selectionHealth（项盒健康代理口径，现状）unhealthy→剔除+warn 单源 | — | 抑制=该条缺席/不渲染，非持久态 | 已知边界登记（§2.3） |

selection 链双路径（**一处变更=保存门**，加粗）：

| 态 | 入口 | 守卫 | 产物 | 回退 |
| --- | --- | --- | --- | --- |
| 快路径 evaluateVisual | rAF 帧点 | 四道守卫（选区空/跨页/页外/零宽盒）+轻量 probe+对账+G2 | 'item'（paint） | 失败→全量视觉评估 |
| 全量 evaluateFull | mouseup/settle | selectionToAnchor 三元组→itemChainFor 主链 | item 成功：paint+pending.anchor.rects 均 'item' | 三因失败→**§2.4 保存门** |
| 全量 DOM 回退（显示） | 主链三因失败 | findRangeAtOffset→rectsBetweenPoints→**paint 照渲（视觉连续）；pending=null（不挂工具条=无保存入口）+warn 单源** | 'dom'（仅 transient 显示） | 无（末端） |
| 保存态 | save(kind) | pending 非空才可达 | **落库 rects=纯项族形状** | — |

### 2.2 跨格序列推演（五序列，逐格）

**序列① 拖选中途 zoom 变更**（现状维持）：格1 快路径以旧 viewport 产项族灰层
落地→格2 zoom 变更、textLayer 重排在途（灰层短暂残留=INV-37 已登记拖选期
「所见≈所存」弱化语义）→格3 下一帧 store 直读新 zoom 现构 viewport 重评→
格4 mouseup/settle 全量同帧覆盖（终态=全量产物，selection-evaluate.test
同帧覆盖 it 锚定）→格5 保存=项族 rects。**终裁：viewportVersion 帧守卫驳回**
（W3 处置）——16ms 级已登记窗口，为它造新机制=M5 自反性违背（治理层自反）。

**序列② CR1 store 条目迟到**（现状维持）：格1 textLayer 挂载触发编排→
格2 订阅值 entry undefined→S4 DOM 回退**首渲染有定位**→格3 条目到达（订阅
触发重编排）→S4→S3a 项族产物覆盖=**单次重排，方向恒为 DOM（粗）→项（精）
=视觉收敛型**。**终裁：S0 挂起守卫驳回**（B5 处置）——①page-items.store 无
就绪信号（pages:{} 初值+三写口，增设=新状态面）；②挂起=首渲染空白闪现，
劣于单次收敛型重排；③e2e 45 例含翻页/缩放 spec 零跳变投诉观测。无病不施药。

**序列③ 对账失败整页切 S4 后恢复**：格1 S1 reconcile 失败→warn+整页 S4→
格2 S4 产物（mLR 像素域聚类+分量 clamp01+mergeRects 终裁——DOM 链自身已
完整归并，**B3 处置：拟稿「族管线包装」驳回，对已归一化产物再包装=空增量**；
真实差源=聚类算法/行高来源/夹取形态三处上游，属测量噪声族残差，不可包装
消除）→格3 条目更新对账恢复→S3a 覆盖。**残余形状差=接受**（发生面=对账
失败窄窗+首渲染窗；方向收敛型；无过渡动画——单窗口翻页帧预算，动画=新时序债）。

**序列④ S6 抑制后条目再渲染**（现状维持）：格1 S4 产物经 selectionHealth
（项盒代理）unhealthy→格2 剔除该条+warn（Annotation=缺席回退存量；AI=该段
不渲染）→格3 再渲染=重新评估（抑制非持久态，无残留）→格4 恢复即显示。
已知边界登记：右溢支路≈恒 0（DOM 产物 clamp01 反推后不可观测）+项盒健康而
DOM 链独立病理时不拦（INV-58 既有备案）。**不修**（无实害病例；取证在档：
健康 0/20 误伤+病理 2/15 触发）。

**序列⑤ 同屏双族+保存混源**（**本战役唯一闭合点**）：现状：格1 页 A 对账
失败→S4 DOM 显示、页 B 健康→S3a 项族显示=同屏双族（INV-58 允许+域标记在）；
格2 用户在项链失败页划选→全量 itemChainFor=null→paint+pending.anchor.rects
均 DOM 形状；格3 **保存→DOM 族 rects 入库**（INV-58 接缝真身——落库形状
非单一真相源）；格4 翻页返回→S3b 消费存量 DOM 形状+bandsNearRects。
终态：格2' paint 照渲（视觉连续）+pending=null（无保存入口）+warn 单源；
格3' 无库污染；格4' 存量库=纯项族形状（挂 B 读时归并渐净面不变）。

### 2.3 回落档语义裁决（前史明文要件）

| 档 | 终裁 | 语义 |
| --- | --- | --- |
| 档1 项几何主链 | **唯一几何真相源** | 保存链+主显示链唯一产物源；INV-58 落款修订（§5.4） |
| 档2 DOM 量测 | **显式回退层，维持现状** | 仅存活于 S4（entry 缺席/对账失败）+selection 全量**显示**回退（transient，保存门后不入库）；三处之外禁新消费；rects 与 bands 同源（DOM 产物配 bandsForTextNodes——C5 精神）；INV-47 函数体零改锚不动 |
| 档3 存量 rects | **显式档** | S3b 专用（bandsNearRects 专绑）；现状推导式语义升登记 |

- **S4 命运=保留原样**（拟稿「触发面收缩」经核=伪变更：现触发面已是
  entry 缺席∨对账失败两因，计算异常走 S2/S3a 逐条 try 缺席不进 S4——拟稿
  对现状误读，终裁更正）。「门 3 随回退层去留复核」条款结案=**保留**。
- **S6 命运=保留+边界登记**（§2.2 序列④）。
- **三回退因处置=全部现状定界**：页项缺失→S4 首渲染定位（订阅自愈）；
  对账失败→S4+warn（条目更新自愈）；计算异常→S3b 逐条缺席（try 先例）。
- **边界归一两机制=维持+头注声明非几何族域**（snapBlankBoundary=偏移系统
  DOM 亲和；releaseAffinity=手势几何裁决；不同相位、互不替代——收编=为
  统一而统一的新债）。
- **坐标域三处换算=登记不物理收敛**（拟稿 T3 收缩）：selection-geometry
  localScale=UI 布局换算非 PDF 几何；lineage-viewport rootToLocalScale=
  lineage 域件（跨域出战役范围）；itemViewportOf=entry 反推已锚门一 W3
  精度带。处置=三处头注域声明+INV-58 边界注（防 r3a 型域差事故重演）。

### 2.4 保存链单源门（唯一行为变更）

- **变更**：selection-evaluate evaluateCore——itemChainFor 返回 null 时：
  setPaint 照渲 DOM 回退形状（视觉连续，现状）；**setPending(null)（原为
  pending=DOM 形状 anchor）**+warn 单源（复用 itemChainFor 诊断单源）。
  语义=「所见≠所存时不给保存入口」。
- **生产影响≈零**：item 链失败三因在真机健康页近零发生（取证 A3：健康页
  对账 100% 通过）；该路径主要存活面=jsdom 测试环境（无页项渲染）。
- **受锁面（先行对账义务）**：tests/unit/renderer/selection-layer.test.tsx
  14 用例无 page-items 桩（grep 实测零命中）——保存流用例需补页项桩
  （tests/utils 工厂面已有 page-items.store 直改先例）+断言面按项族产物
  更新；指纹门 C 面变更走豁免清单条目（reason=本设计书 §2.4+裁决链）。
  [locked-change][test-refactor] 双尾注。
- **INV 落点**：INV-58 修订（保存链条款）+新 INV（§5.4）。

### 2.5 band 三档绑定表（登记收敛）

| band 推导 | 绑定档 | 允许消费面 | 禁止 |
| --- | --- | --- | --- |
| bandsFromItems（项族） | 档1 | selection 快/全量主链、S2/S3a | 跨档消费 |
| bandsForTextNodes（DOM 节点口径） | 档2 | S4（Annotation+AI 段）、selection 全量显示回退 | 跨档消费 |
| bandsNearRects（DOM 几何口径） | 档3 | S3b 存量回退（AnnotationLayer） | 跨档消费+新增第四推导 |

F-A9 calibrateBands=显示层统一校准器（三档之上，窗匹配+校准不参与行归属——
现状不变）。现状消费面经核**已天然档位绑定**（grep 逐一核对）——本条=把
事实升为 INV 登记（防未来漂移），非行为变更。

### 2.6 跨族交互点计数（M2 收敛量化证据——主指标）

| # | 交互点 | 现状 | 终态 |
| --- | --- | --- | --- |
| 1 | 保存链可落 DOM 形状 rects（S-i 接缝） | 在（无边界声明） | **闭合**（§2.4 保存门） |
| 2 | S6 以项盒判定 DOM 产物 | 在（已知边界备案） | 在+INV 边界注显式登记（不修） |
| 3 | S4 回退层双族同屏 | 在（INV-58 允许+域标记） | 在（显式档+同源 bands 绑定） |
| 4 | selection 显示回退 transient DOM 形状 | 在（隐式） | 在（显式声明「仅显示不入库」） |
| 5 | selection-evaluate:54 stale seam 自述（F-A8 前时态） | 在（头注谎言面） | **消除**（头注随票重写） |

现状 5 点（2 点无登记）→终态 4 点（4 点全部显式登记/INV 锚定）+1 点闭合。
净删行数（§3.5）为辅助记账——**本战役收益主证=交互面全部显式化+保存链闭合**，
不以 LOC 为唯一量化（B4 处置：拟稿 −150~−300 无逐项依据，驳回）。

---

## 3. 目录化设计（受理门 4/5）

### 3.1 域序与域间单向依赖图

```
view ──→ panels / interact / time / anchors / state（多向允许）
panels ──→ anchors / state
interact ──→ anchors / state
time ──→ state
anchors ──→ state
state ──→ ∅（置底：被 anchors/view/interact/panels/time 消费，不依赖任何域）
```

域序方向=顺从 React 装配链（父 import 子自上向下），邻接表全边核验**零例外**
（拟稿目录甲骨架采纳；唯二 store→PdfPageCanvas type-only 边经 M0 类型下沉
消除，§3.3）。

### 3.2 69 文件权威映射表（B1 处置：ls 逐项对账，幽灵行已删）

**state/（10）**——全局状态/上下文/文档域服务/共享常量：
reader.store(484)、tab-dirty(118)、useActiveTab(27)、annotation-undo(197)、
page-layer-z(30)、ai-notes.store(73)、ai-notes-phase(38)、PdfDocProvider(99)、
**CorpusExtractor(312)**（pdfjs 文档生命周期服务，消费方=settings/
useExportCorpusEvents——**拟稿漏列，终裁补**）、scroll-converge(77)（滚动
收敛原语，anchors/view 双消费→置底避免 anchors→view 反向边）。

**anchors/（13 存量+1 新增）**——锚定真相源簇：
pdf-item-geometry(515)、annotation-anchor(454)、annotation-merge(173)、
annotation-resolve(416)、annotation-resolve-layered(252)、
annotation-band-calibrate(120)、anchor-serialize(259)、anchor-blank-snap(285)、
anchor-locate(294)、page-items.store(69)、open-paper-anchor(44)、
annotation-style(120)、ai-note-style(61)；+**geometry-types.ts（M0 新增）**。
（page-items.store 归 anchors=簇内聚优先：S0 专用数据源；anchor-locate 有
lineage 域跨特性消费面——迁移时其 import 同步改。）

**time/（4）**：reading-time(304)、reading-time-setup(140)、
reading-time-outbox(301)、reading-time-outbox-store(88)。

**interact/（7）**：SelectionLayer(238)、SelectionToolbar(78)、
selection-evaluate(326)、selection-geometry(142)、selection-paint(85)、
release-affinity(211)、use-annotation-draft(193)。

**panels/（8）**：OutlineAside(157)、OutlinePanel(184)、OutlineThumb(78)、
ReaderNotesPanel(208)、AiNotesSection(108)、AiNoteGroupList(198)、
AiNotesStatus(156)、FragmentNotesList(92)。

**view/（27）**：ReaderPage(164)、ReaderPageView(158)、PageColumn(165)、
PageColumnView(73)、PageBox(65)、PagesOverlay(133)、AnnotationLayer(152)、
AiAnnotationLayer(235)、AnnotationPopups(203)、AnnotationEditor(149)、
AnnotationMenu(82)、ReaderToolbar(233)、TabBar(164)、
reader-shortcut-handlers(43)、ReaderShortcuts(124)、PdfPageCanvas(188)、
TextLayer(157)、text-layer.css(117)、page-column-geometry(175)、
usePageColumnScroll(67)、usePageLazyWindow(84)、scroll-progress(368)、
useReaderSearch(105)、ReaderSearchBox(126)、reader-search(163)、
reader-search.store(203)、SearchHighlightLayer(160)。

合计 10+13+4+7+8+27=**69** ✓（括号=行数 wc 实测；搜索簇归 view=页内功能
非侧栏；ai-note-style 随标注族归 anchors——消费方 view/panels 向下合法）。

### 3.3 M0 类型下沉切环（新增 geometry-types.ts）

- 搬迁：PdfTextItem/PdfTextStyle/PdfTextContent/PdfPageGeometry（现驻
  PdfPageCanvas.tsx:38-77）+PixelBox（现驻 annotation-anchor）+RowBand（现驻
  annotation-resolve）+COLUMN_GAP_H_FACTOR/COLUMN_GAP_PAGE_RATIO（现驻
  pdf-item-geometry——常量与类型同居 anchors 语义位）→ anchors/
  geometry-types.ts。
- **PdfPageCanvas 保留 `export type { … } from './geometry-types'` 再导出**
  （ai-annotation-layer.test:25 等受锁测试从旧路径 import type——re-export
  保测试零触，M0 无受锁面）。
- 切断：三处 type-only 环+两条 store→PdfPageCanvas 边（page-items.store/
  reader-search.store 改 import geometry-types）。annotation-anchor→
  pdf-item-geometry 的 COLUMN_GAP 值 import 改向 geometry-types（anchors
  域内最终无环）。

### 3.4 迁移序（八步，每步独立提交+verify 全绿；W1 处置：view 拆两步）

| 步 | 动作 | 受锁面（随步同链 unlock→改→apply） | verify 面 |
| --- | --- | --- | --- |
| M0 | geometry-types 落地+环切断（§3.3，零文件移动） | 无（re-export 保零触） | unit 全绿+typecheck |
| M1 | state/ 10 文件迁移 | CorpusExtractor 相关测试 import（corpus-extractor/corpus-export/pdf-factory） | 全绿 |
| M2 | time/ 4 文件 | reading-time 系测试 import | 全绿 |
| M3 | anchors/ 13 文件 | anchor-locate 跨特性消费（lineage×2+open-paper-bus）+锚定回归网 17 件 import+pdf-factory | 全绿+锚定回归网 |
| M4 | interact/ 7 文件 | selection 系测试 import | 全绿+selection 回归 |
| M5 | panels/ 8 文件 | notes/outline 系测试 import+check-quality.mjs:96-97（ReaderNotesPanel） | 全绿 |
| M6a | view 渲染簇 14 文件（PageColumn/PageBox/PagesOverlay/PdfPageCanvas/TextLayer/text-layer.css/page-column-geometry/usePageColumnScroll/usePageLazyWindow/scroll-progress/AnnotationLayer/AiAnnotationLayer/AnnotationPopups/ReaderPageView） | 对应测试 import+eslint.config.js INV-16 块（PdfPageCanvas/TextLayer 两路径） | 全绿 |
| M6b | view 工具/搜索/标注 UI 簇 13 文件（ReaderPage/ReaderToolbar/TabBar/reader-shortcut-handlers/ReaderShortcuts/AnnotationEditor/AnnotationMenu/useReaderSearch/ReaderSearchBox/reader-search/reader-search.store/SearchHighlightLayer+**ReaderPage 等**） | App.tsx（tab-dirty 在 M1 已迁，此处 ReaderPage）+剩余测试 import+eslint 块（PdfDocProvider/CorpusExtractor 已随 M1 更新——四路径分步随迁 | 全绿+e2e 43+指纹门 |

顺序=依赖驱动拓扑序（置底域先落定；每步 import 改写量最小化；51 受锁测试
import 按步分摊非一次打包）。M6a/M6b 拆分=W1 处置（27 文件单提交超载一逻辑
单元）。e2e 一键全跑 45 于战役收口票全量跑。

### 3.5 净删行数记账（受理门 5——诚实版）

- **方法**：每票收尾 `git diff --stat <base>..HEAD -- src/renderer/features/
  reader`（含子域）按域分组实测；受锁测试改动单列不计入生产净删。
- **基线**：reader 69 文件/11,860 行；几何簇两口径并列——核心 7 文件 2,342
  行（pig/anchor/resolve/layered/serialize/band-cal/selection-evaluate）、
  全景 17 文件 4,111 行。
- **逐项删行清单（B4 处置）**：①rectsFromRange 死导出面（src 零消费+受锁
  测试 1 用例）≈25 行+测试用例（**候选项**，随 G2 双门走，删=死代码即删
  宪法条）；②probeOffsetLen 复刻收敛（selection-evaluate 复刻 anchor-
  serialize 私有 probeTextLength——经 G2 走显式导出面[受锁]+复刻删除）≈15
  行；③保存门后 evaluateCore DOM 回退分支简化（pending 构造分支收窄）≈10~20
  行。合计净删目标 **−50~−60 行**（几何簇域实测对账）；头注重写 ±50（改到
  哪写到哪）；geometry-types 净增 +40~60（类型搬迁源文件等量减少）。全域
  净额预期 **−20~−80**。**明确声明：本战役不以 LOC 为主要收益指标**（§2.6
  交互点计数为主证——S4 函数体零改锚定决定了 DOM 几何产链物理不可删）。

---

## 4. 前史承袭（受理门 6）

### 4.1 「测试逼生产保形状」五例解耦票池统筹（09-11 §4-5 承袭）

| 例 | 与本战役交集 | 终裁 |
| --- | --- | --- |
| annotation-layer.test.tsx:33-327 存量 rects 回退渲染路径 | S4/S3b 终态=现状零改→该测试面不变 | **维持现状**（拟稿「随战役」系基于被驳回的 S4 包装方案） |
| lineage-tags:66,87 / reader-time:56 / reader-search-ui:440 / migrate-reading-time:27 | 零交集（路径迁移的 import 改写=[test-refactor] 机械面非解耦） | **维持现状** |

五例**零解耦票随战役**；解耦票池整体维持现状+原触发线（未来若立 S4 退役
票，annotation-layer 例随之联动）。

### 4.2 契约面生长评估（09-11 §3-3 观察项承袭）

**结论：零通道变更、零 src/shared 变更。** 论证：改动面 100% 位于
src/renderer/features/reader 内部+App.tsx/lineage 域 import 路径；saveAnnotation
落库载荷字段与 rects 归一化语义不变（保存门只改变「失败链不可保存」，不改
成功链载荷）；warn 单源=console.warn renderer 本地（grep 实证零 IPC 触点）；
renderer 统一 api/client 门面无触点。55 通道/12 域计数不变。

---

## 5. 验收与实施票切分（受理门 7/8）

### 5.1 验收底色

- **e2e 一键全跑 test:e2e:all 45 例全绿不破**+默认门 test:e2e 43 例（W2
  拆分后口径；基线=batch10 收口实测 E2E_APP_EXIT=0 43/43，其后 src 零变更。
  **本批定稿日新观测**：默认门全套跑 corpus-export 1 例 60s 超时红（42 绿，
  套跑总时长 3.0m 慢于常态 ~2m）→定向复跑 2/2 绿 6.4s（geom01-e2e-corpus-
  rerun.raw.txt）——负载敏感型非确定红，flake 台账 corpus-export 线 count
  3→4 已记，立案排查归后续批（与 F-EXPORT-01 拆件票天然同场）；
- **锚定回归网全绿**：unit 17 件（selection-evaluate/selection-layer×2/
  selection-item-chain/selection-geometry/selection-paint/selection-mode/
  annotation-anchor/annotation-layer/ai-annotation-layer/annotation-merge/
  anchor-blank-snap/anchor-item-verify/anchor-locate/band-calibration/
  pdf-item-geometry/pages-overlay/pdf-page-canvas）+e2e reader-text/
  reader-search/ai-notes-section；
- **指纹门 C_after ⊇ C_before**（基线 187 文件/1790 用例/5417 断言；G2 的
  断言面变更全走豁免清单条目+战役毕基线重冻结——F-TESTREF 战役收官义务同款）；
- 净删/交互点记账报告（§3.5/§2.6 口径）随收口票提交；
- 每票 DoD 常规项（verify 真退出码/locks 单链/头注随票重写）。

### 5.2 风险与开放问题

1. G2 保存门的 selection-layer.test 改写量（14 用例中保存流占比）——立案时
   先出断言对账表再动手（拟稿预案采纳）。
2. 豁免清单条目数=指纹门 C 面变更量——若超预期（>10 条）呈主控复裁。
3. M3 anchors 迁移的跨特性 import 面（lineage×2+open-paper-bus）——迁移
   步内一次改向，verify 的跨域规则（check-quality）同步核。
4. jsdom 环境项族几何的桩面已存在（selection-item-chain/selection-evaluate
   测试既有 page-items 桩先例）——G2 测试改写有既有工厂可复用。

### 5.3 实施票切分（设计批准后按此立案；每票独立提交+门审）

| 票 | 内容 | 尾注 |
| --- | --- | --- |
| G1 | M0 类型下沉切环（§3.3） | — |
| G2 | 保存链单源门+probeOffsetLen 收敛+rectsFromRange 死面删除+INV-58 修订 | [locked-change][test-refactor] |
| G3 | band 三档绑定+跨族交互点登记（头注+新 INV 落册，纯登记面） | —（INV 册受锁则 [locked-change]） |
| G4~G8 | 目录化 M1~M5（state/time/anchors/interact/panels） | 各 [locked-change][test-refactor] |
| G9~G10 | 目录化 M6a/M6b（view 两簇） | 同上 |
| G11 | 头注重写+净删/交互点记账报告+验收门全跑+INV 终册+基线重冻结 | [locked-change]（基线/INV 册） |

### 5.4 INV 清单（G2/G3/G11 落册 docs/invariants.md）

- **新增**（暂记 INV-68 号段，落册时接续现尾号 67）：几何产链档位绑定——
  档1 项族=保存链+主显示唯一产物源；档2 DOM 量测=显式回退层专用（rects 与
  bands 同源）且产物不入库；档3 存量=S3b 专用；band 三推导按 §2.5 表绑定，
  禁跨档消费+禁第四推导。
- **修订 INV-58**：保存链条款（item 链失败=只显示不保存）+接缝闭合记录
  （selection-evaluate:54 stale 自述随 G2 重写）+坐标域三处边界注。
- **INV-47 确认不修订**（S4 函数体零改延续）；INV-37/INV-60 相容确认。

---

## 6. 与前史裁决的对照（合规自检）

- 09-11 终裁 §3-1 三要件（态空间表/跨格序列/回落档语义裁决）：§2.1/§2.2/
  §2.3 ✓。净删行数记账（M2 量化证据）：§3.5+§2.6 ✓（主证口径变更已声明）。
- 2026-09-18 裁决书 §3 裁决 5：六子域目录化同场做完 ✓（六域名=用户定死，
  映射表 §3.2）；域内单向依赖图 §3.1 ✓。
- 前史两条款承袭：§4.1/§4.2 ✓。
- 宪法：状态机前置（本设计=状态机**定界**而非新增——两处拟新增态均驳回）；
  测试锁定合约（G2 走双门+豁免）；方案切换=删除旧方案（S4 保留系 INV-58
  显式允许的回退层非「双方案」——域标记+档位绑定为其存续依据）；禁预建。

---

## 7. 三跳记录与审档处置表（对抗审核 B5/W7/N4 逐条）

| 审核发现 | 终裁处置 |
| --- | --- |
| B1 映射表计数失实+幽灵行 page-items | **采纳**——§3.2 权威映射表重建（ls 逐项对账 69=10+13+4+7+8+27；终裁另发现拟稿漏列 CorpusExtractor 与幽灵行 reader——终裁位证据脚本正则伪影两处一并修正） |
| B2 S4 bands 优先 bandsFromItems=异源混用违 C5 | **驳回拟稿方案**——S4 产物同源原则：rects 与 bands 均 DOM 链（bandsForTextNodes），§2.1/§2.3 |
| B3 「族管线包装→噪声级」机制不成立 | **采纳**——包装方案整体驳回（对已归一化产物空增量）；残余形状差诚实声明+接受（§2.2 序列③）；收益主证改交互点计数（§2.6） |
| B4 净删 −150~−300 无依据 | **采纳**——逐项删行清单+目标改 −50~−60（§3.5），LOC 降为辅助指标 |
| B5 S0 挂起守卫前提不存在 | **采纳（驳回拟稿方案）**——不加挂起态；S0 现状定界+驳回理由（§2.2 序列②） |
| W1 M6 单步超载 | **采纳**——view 拆 M6a/M6b，八步迁移序（§3.4） |
| W2 挂起超时未定义 | 随 B5 消失（挂起方案驳回） |
| W3 viewportVersion 复杂度未评估 | **采纳（驳回拟稿方案）**——INV-37 已登记窗口+同帧覆盖锚在，造新机制=M5 违背（§2.2 序列①） |
| W4 undo 与 S3b 交互未覆盖 | **补**——annotation-undo 为 state 域纯状态面（undo 后走常规 resolve 编排，无 S3b 特殊交互）；§3.2 归属已定 |
| W5 域内边误分类+view 偏大 | **采纳**——M0 类型下沉后两 store 边消除（§3.3）；view 27 文件以簇拆步（M6a/M6b）治理 |
| W6 受锁面规模前后矛盾 | 随 B2/B3 处置消失——S4 零改后 annotation-layer.test 不触；受锁面集中于 G2 selection-layer（§2.4 先行对账义务） |
| W7 scroll-converge「首要消费方」无据 | **采纳**——三消费方实核（anchor-locate/usePageColumnScroll/scroll-progress），归位置底 state（§3.2） |
| N1 两 [假设] 已决 | **采纳**——Q2/Q5 闭合并入 §4.2/§3.3 |
| N2 净删口径双轨 | **采纳**——两口径并列声明（§3.5 基线段） |
| N3 断言覆盖不降证明 | **采纳**——G11 基线重冻结+豁免清单审计（§5.1） |
| N4 ai-note-style 跨域分散 | 维持拟稿（标注族内聚），可读性注记在案（§3.2） |

**派发回执**（账本 .zcode/org-ledger.jsonl v3 行在档）：hop1 kimi-main
kimi-k3（in=7035/out=24741/latency 554s）；hop2 deepseek deepseek-v4-flash
（in=16315/out=18244/latency 80s）。审档三件随批入库：geom01-drafter-brief.md
/geom01-drafter-out.md/geom01-auditor-brief.md/geom01-auditor-out.md。
