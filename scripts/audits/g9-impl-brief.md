# F-GEOM-01-G9 实现者六段简报（M6a view 渲染簇 14 件目录化迁移）

> 主控=GLM5.3 max（本会话）｜实现者=ops-executor 绑定（GLM5.3flash $max）｜批=batch 21
> 派发纪律：零行为纯迁移票——TDD 面以「基线锚+双变异红证（M1/M2）+构建产物哈希恒等」
> 机制兑现（G1-G8 同票面机制）。**禁 git commit/branch/tag（主控收口职责）；
> 禁 tickets/registry.ts 触碰（主控收口职责）**。

## ① 任务与边界

- 票面（tickets/registry.ts:300 F-GEOM-01-G9）：目录化 M6a=view 渲染簇迁移
  （设计书 §3.4 八步迁移序第 7 步；W1 处置拆两步之一）。
- **14 文件 git mv 迁 `src/renderer/features/reader/view/`**（目录新建）：
  PageColumn.tsx(164)/PageBox.tsx(64)/PagesOverlay.tsx(132)/PdfPageCanvas.tsx(146)/
  TextLayer.tsx(156)/text-layer.css(116)/page-column-geometry.ts(174)/
  usePageColumnScroll.ts(66)/usePageLazyWindow.ts(83)/scroll-progress.ts(367)/
  AnnotationLayer.tsx(151)/AiAnnotationLayer.tsx(234)/AnnotationPopups.tsx(202)/
  ReaderPageView.tsx(157)——合计 2212 行（wc 实测）。
- **零行为变更**：只做 git mv+import 路径改写，禁任何逻辑/断言/用例增删改语义。
- 域序铁律（设计书 §3.1）：view→{panels,interact,time,anchors,state} 合法单向；
  **反向边（state/anchors/interact/panels/time→view）禁出现**。
- PageColumnView/SearchHighlightLayer/AnnotationEditor/AnnotationMenu/TabBar/
  ReaderToolbar **留在 reader 根**（M6b 域件，本批不动它们本体）。

## ② 改写面（侦察已全边落档 g9-recon.log——按行号落刀，勿凭印象）

**A 深度修正（14 件内部相对 import，44 行）**：
- `./state/`→`../state/` 18 行：PageColumn(PdfDocProvider)+PageBox(PdfDocProvider)+
  PagesOverlay(PdfDocProvider)+PdfPageCanvas(page-layer-z)+TextLayer(page-layer-z)+
  usePageColumnScroll(scroll-converge)+scroll-progress(scroll-converge+reader.store×2)+
  AnnotationLayer(page-layer-z+reader.store)+AiAnnotationLayer(page-layer-z+
  ai-notes.store+reader.store)+AnnotationPopups(annotation-undo+reader.store)+
  ReaderPageView(PdfDocProvider+reader.store)。
- `./anchors/`→`../anchors/` 14 行：PagesOverlay(page-items.store)+PdfPageCanvas
  (pdf-item-geometry+geometry-types×2)+AnnotationLayer(resolve+resolve-layered+
  page-items.store+merge+style)+AiAnnotationLayer(resolve+resolve-layered+
  page-items.store+style+ai-note-style)。
- `./panels/OutlineAside`→`../panels/OutlineAside`（ReaderPageView）1 行；
  `./interact/SelectionLayer`→`../interact/SelectionLayer`（ReaderPageView）1 行。
- `../../api/client`→`../../../api/client` 2 行（scroll-progress+AnnotationPopups）；
  `../../shared/ui/{Toast,SplitPane}`→`../../../shared/ui/…` 2 行（AnnotationPopups+
  ReaderPageView）。
- **reader 根驻留件（M6b）`./X`→`../X` 6 行**：PageColumn→PageColumnView；PagesOverlay
  →SearchHighlightLayer；AnnotationPopups→AnnotationEditor+AnnotationMenu；
  ReaderPageView→TabBar+ReaderToolbar。
- **域内互引零改写**（同迁 view/ 后相对关系不变）：PageColumn{PdfPageCanvas,
  page-column-geometry×3,usePageLazyWindow,usePageColumnScroll×2}、PageBox
  {PdfPageCanvas×2,page-column-geometry}、PagesOverlay{AnnotationLayer,
  AiAnnotationLayer,PageColumn,PdfPageCanvas,page-column-geometry,TextLayer}、
  TextLayer{PdfPageCanvas,text-layer.css}、usePageColumnScroll{page-column-geometry}、
  usePageLazyWindow{page-column-geometry}、scroll-progress{PageColumn}、
  AnnotationLayer{AnnotationPopups}、ReaderPageView{PageColumn,page-column-geometry,
  scroll-progress,PagesOverlay}；page-column-geometry.ts/text-layer.css 零 import。

**B src 消费面（7 行/3 文件，`./X`→`./view/X`）**：
reader-search.ts:32(PdfTextItem type)；PageColumnView.tsx:25/26/27(PdfPageCanvas/
PageBox/page-column-geometry)；ReaderPage.tsx:50/54/58(PageColumn/scroll-progress/
ReaderPageView)。

**C tests 受锁面（30 行/16 物理件，纯路径改写零用例增删；含 5 vi.mock 行）**：
reader-search-text.test.tsx:21；text-layer.test.tsx:40/41；page-column.test.tsx:23/33；
anchor-item-verify.test.tsx:33；pdf-item-geometry.test.tsx:18；pdf-page-canvas.test.tsx:
23/24；reader-double-page.test.tsx:26/36；reader-page-open-race.test.tsx:38(vi.mock
PageColumn)；annotation-popups-autosave.test.tsx:19；annotation-layer.test.tsx:17/21；
ai-annotation-layer.test.tsx:19/25；scroll-progress.test.tsx:21/22；pages-overlay.
test.tsx:30/55/80/87/94/101(:55/:80/:87/:94 vi.mock 四件)；selection-mode.test.tsx:
26/27；band-calibration.test.tsx:29/35；selection-paint.test.tsx:33。
（路径形态=`../../../src/renderer/features/reader/X`→`…/reader/view/X`。）

**D 跨特性消费：0**（侦察全仓零命中——lineage 域无 view 件引用）。

**E config 面（2 行）**：eslint.config.js:90 `src/renderer/features/reader/
PdfPageCanvas.tsx`→`…/reader/view/PdfPageCanvas.tsx`；:91 TextLayer 同型
（INV-16 块四路径分步随迁第 3/4 步；:89/:92 已迁态勿动）。

**G 字符串面：零动作**（readFileSync/字符串路径形态全仓扫描对 14 件零命中——
theme.test 对 G9 零命中实证在档 g9-recon.log；scripts/audits 历史档命中=归档面
零动作惯例；.mimosa=会话态非仓库面）。

## ③ 验证义务（七关卡+红证+哈希，全部真退出码物理落档 scripts/audits/g9-*.log）

1. **git mv 保 rename 检测**（禁 cp+rm）；迁移后 `git status` 应见 14 对 R 标记。
2. 关卡链（各单跑，EXIT 落档）：lint→typecheck→test（基线=**170 Test Files/1744
   Tests**）→build；check-quality 单跑。**tickets 段预期红**（registry 旧径=主控
   收口职责，如实记录勿修）。
3. **中探针**：C 面（tests）尚未改写时点跑 typecheck 一次——预期错误全在 tests 面
   （src 面 0 错），log 落档。
4. **变异红证 M1（src 面）**：ReaderPage.tsx:58 回退 `./view/ReaderPageView`→
   `./ReaderPageView`→typecheck TS2307 EXIT=2→cp 备份法还原（**禁 git checkout**，
   未提交实现会被抹掉）→diff 空→复绿。
5. **变异红证 M2（tests 面）**：page-column.test.tsx:23 回退 view 路径→模块解析红
   EXIT=1→还原→复锁→复绿（受锁面操作走 unlock→改→apply）。
6. **构建产物哈希恒等**（门一 N3 标配）：build 产物应与基线同名同尺寸
   （index-D3egZtl2.js 1,392.72kB+index-BfpEygSE.css 52.49kB——G5-G8 恒等链延续）。
7. **单向核验探针**（Write .mjs 落 scripts/audits/ 后立即 locks:generate+apply——
   探针与锁登记同一动作批次）：view→{anchors,state,panels,interact} 出边计数+
   反向边 0+旧径残留五通道（旧径 import/点径/别名/动态 import/vi.mock）全 0。
8. **受锁面操作纪律**：改 tests/eslint.config.js 前 `npm run locks:unlock`，改完
   即时 `npm run locks:apply`；自产探针 .mjs 写完即时 generate+apply。

## ④ 证据面（收口呈审包材料）

- 本简报+实现报告=scripts/audits/g9-impl-{brief,report}.md；
- 全部机检/红证 raw=scripts/audits/g9-*.log（`echo "X_EXIT=$?" >> log` 物理追加，
  禁引终端回显）；探针源码一并入库。

## ⑤ 简报计数（主控侧实测口径，落笔已核）

- 14 件 2212 行（wc）；A=44 行；B=7 行/3 件；C=30 行/16 件（vi.mock 5 行）；
  D=0；E=2 行；G=0；合计改写面≈83 行/36 物理件（14 迁移件+3 src 消费+16 tests+
  1 eslint+relay 板=36——board 归主控）。

## ⑥ 超票面自裁申报义务

一切超出本简报明示面的决定（含发现侦察行号漂移/额外引用面/删除面）——**停下记录
于实现报告自裁段**，勿自行扩面；行号若有 ±3 内漂移以 grep 实测为准照改并申报。
