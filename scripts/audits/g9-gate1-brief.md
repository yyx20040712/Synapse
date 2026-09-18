# F-GEOM-01-G9 门一隔离审包（对抗式代码审查——M6a view 渲染簇迁移）

> 审查对象=零行为纯迁移声明。你的职责=对抗式证伪：逐 hunk 断言「无行为变更」，
> 独立复算一切计数，拷问一切假设。**只依据本包两件材料**（本简报+
> g9-gate1-diff.patch，同目录），不得采信简报转述而未经你对 patch 亲验的结论。

## ① 工单口径

F-GEOM-01-G9（tickets/registry.ts:300）：目录化 M6a——14 文件 git mv 迁
`src/renderer/features/reader/view/`：PageColumn/PageBox/PagesOverlay/PdfPageCanvas/
TextLayer/text-layer.css/page-column-geometry/usePageColumnScroll/usePageLazyWindow/
scroll-progress/AnnotationLayer/AiAnnotationLayer/AnnotationPopups/ReaderPageView
（2212 行 wc 实测；13 件对设计书 §3.2 各 −1=无尾换行口径；PdfPageCanvas 146 vs
188 系 G1 类型下沉已削，与本票无关）。设计书 §3.1 域序：view→{panels,interact,
time,anchors,state} 单向合法；反向边禁。票尾注=[locked-change][test-refactor]。

## ② 改写面申报（主控侦察定刀+实现者执行，行号已双侧核对）

- **A 深度修正 44 行**（14 件内部相对 import 改写）：`./state/`→`../state/` 18 行+
  `./anchors/`→`../anchors/` 14 行+`./panels/`→1+`./interact/`→1（ReaderPageView）+
  `../../api|shared`→`../../../` 4 行（scroll-progress×1+AnnotationPopups×2+
  ReaderPageView×1）+**reader 根驻留 M6b 件 `./X`→`../X` 6 行**
  （PageColumn→PageColumnView；PagesOverlay→SearchHighlightLayer；AnnotationPopups→
  AnnotationEditor+AnnotationMenu；ReaderPageView→TabBar+ReaderToolbar）。
- **B src 消费 7 行/3 件**（`./X`→`./view/X`）：reader-search.ts:32；
  PageColumnView.tsx:25/26/27；ReaderPage.tsx:50/54/58。
- **C tests 受锁面 30 行/16 物理件**（纯路径改写零用例增删；vi.mock 5 行）。
- **E config 2 行**：eslint.config.js:90/91 两路径随迁（INV-16 四路径分步第 3/4 步；
  :89/:92 已迁态未动）。
- **D 跨特性=0；G 字符串面=0**（theme.test 对 G9 零命中——迁移前后双扫在档）。
- **F registry 随迁 12 行+翻 done=主控收口面，不在本包**（tickets:check 红=该面
  预期态，见 ③）。
- 域内互引（14 件之间）零改写；page-column-geometry.ts/text-layer.css 零 import。

## ③ 验证证据链（全部真退出码物理落档 scripts/audits/g9-*.log——本包不含 raw，
主控已抽查 EXIT 标记如下；门二将持仓读权限独立复核 raw）

- 基线锚：G9_VERIFY_BASELINE_EXIT=0（指纹门 187/1789/5411/skip15 零漂移+206 票
  open 12+Test 170/1744+产物 index-D3egZtl2.js 1,392.72kB/index-BfpEygSE.css 52.49kB）。
- 迁移后七关卡：LINT/TYPECHECK/TEST(170/1744 恒等)/BUILD/QUALITY/LOCKS(364 一致)
  全 EXIT=0；**TICKETS_EXIT=1=预期红**（registry 旧径 12 条+4 条镜像面——主控
  收口职责，见 ②F）。
- 中探针：C 面未改时点 typecheck EXIT=2 恰 56 错全 tests 面（src 面 0 错）；
  15/16 件分布——reader-page-open-race 仅 vi.mock 面=tsc 盲区（由 M2 运行时红证闭合）。
- **变异红证 M1**：ReaderPage.tsx:58 回退旧径→TS2307 EXIT=2→cp 备份还原 diff 空
  →复绿 TYPECHECK EXIT=0。
- **变异红证 M2**：page-column.test.tsx:23 回退旧径→vite import-analysis 模块解析
  红 EXIT=1→还原 diff 空→复锁→复绿 24 passed（M2_RESTORE_TEST_EXIT=0）。
- **构建产物哈希恒等**：同名同尺寸（G5-G9 恒等链第五票）。
- **单向核验探针**（g9-one-way.mjs/log）：view→{anchors 14,state 18,panels 1,
  interact 1,time 0}+域内互引 26+reader 根驻留 6+上跨 api/shared 4=70 相对出边
  全对账；**反向边 0**；旧径残留五通道（旧径 import/点径/别名/动态 import/
  vi.mock）全 0。

## ④ 实现者自裁申报 7 条（原文照录，逐条拷问其正当性）

①gitmv-status 首采因 cwd 相对路径失效从仓库根补正；②单向探针 v1 两缺陷（win32
反斜杠 startsWith 假 0+动态 import 未限定件名误捕 state 域 4 条合法引用）当场修正
为 v2 PASS，v1 输出被覆盖未单独留档（探针缺陷非实现缺陷）；③external=2=
`.textLayer` className 正则误捕，补明细定位后 70 出边全对账；④M2 日志 grep 需
-a（ANSI 色码二进制误判）；⑤开场非净态=主控遗留（relay/manifest/brief/recon），
relay 零触碰；⑥tickets:check 另有 4 条镜像面红（简报仅预告旧径红），同归主控；
⑦A 面行号零漂移（recon 与迁移后实测一致，PdfPageCanvas:39 export-from 属简报
anchors 14 行面内）。

## ⑤ 审查指令（对抗式——按此逐项出结论）

1. **零行为断言**：对 patch 全部 hunk 逐个判读——除路径字符串外是否有任何语义
   变化（类型/逻辑/断言/CSS 规则）？rename 相似度 94-100% 的差集是否恰为申报的
   A 面 44 行改写？
2. **计数独立复算**：A=44（state 18+anchors 14+panels 1+interact 1+上跨 4+根驻留
   6）、B=7/3、C=30/16（vi.mock 5）、E=2——用 patch 亲数对账。
3. **域序核验**：patch 中 view 件出边是否全部指向合法域（../state|../anchors|
   ../panels|../interact|../../../api|../../../shared|../M6b 驻留件）？有无任何
   反向边或未申报出边？
4. **受锁面合法性**：C 面 30 行是否纯路径改写（零用例/断言/标题改动）？vi.mock
   5 行的模块路径改写是否保工厂函数零触碰？
5. **残留拷问**：你从 patch 能否推出任何「旧路径仍被引用」的线索？（主控双向
   扫描+门二将独立五通道复核——你只裁 patch 内证据。）
6. **自裁 7 条**：逐条裁「正当/需处置」。
7. **假设拷问**：本简报一切「预期/已在档」表述中，哪些你无法从本包两件材料独立
   验证？列为 N 项（note）。

## ⑥ 产物要求

输出报告（纯文本，主控将逐字归档）：**FINDINGS: B=<阻断数> W=<警告数> N=<注记数>
VERDICT=<PASS|PASS_WITH_WARNINGS|FAIL>** 尾栏+逐条发现（B/W/N 编号+patch 行级证据
+处置建议）。B=必须回炉的缺陷；W=报告层失实/证据缺口（主控处置后可过）；N=记录级。
