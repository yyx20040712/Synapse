# F-GEOM-01-G10 实现者六段简报（M6b view 工具/搜索/标注 UI 簇 13 件目录化迁移）

> 主控=GLM5.3 max（本会话）｜实现者=ops-executor 绑定（GLM5.3flash $max）｜批=batch 22
> 派发纪律：零行为纯迁移票——TDD 面以「基线锚+双变异红证（M1/M2）+构建产物哈希恒等」
> 机制兑现（G1-G9 同票面机制）。**禁 git commit/branch/tag（主控收口职责）；
> 禁 tickets/registry.ts 触碰（主控收口职责）**。

## ① 任务与边界

- 票面（tickets/registry.ts:301 F-GEOM-01-G10）：目录化 M6b=view 工具/搜索/标注
  UI 簇迁移（设计书 §3.4 八步迁移序第 8 步=**收官步**；W1 处置拆两步之二）。
- **13 文件 git mv 迁 `src/renderer/features/reader/view/`**（域已存在，M6a 14 件
  在场）：AnnotationEditor.tsx(148)/AnnotationMenu.tsx(81)/PageColumnView.tsx(72)/
  ReaderPage.tsx(163)/ReaderSearchBox.tsx(125)/ReaderShortcuts.ts(123)/
  ReaderToolbar.tsx(232)/SearchHighlightLayer.tsx(159)/TabBar.tsx(163)/
  reader-search.store.ts(202)/reader-search.ts(162)/reader-shortcut-handlers.ts(42)/
  useReaderSearch.tsx(104)——合计 1776 行（wc 实测；设计书 §3.2 各 +1=无尾换行
  口径 Σ1789，G11 对账债同 G5-G9 惯例登记，勿自行改设计书）。
- **零行为变更**：只做 git mv+import 路径改写，禁任何逻辑/断言/用例增删改语义。
- 迁移后 reader 根=纯目录容器零文件（state/time/anchors/interact/panels/view 六子域）。
- 域序铁律（设计书 §3.1）：view→{panels,interact,time,anchors,state} 合法单向；
  **反向边（各子域→view）禁出现**；view 域内互引合法。
- **票面表述勘正**（主控预裁，门审将核）：票面「四路径分步随迁收官步」系起草
  时预期——实测 eslint.config.js 四路径已全迁完（:89/:92=M1 G4 迁、:90/:91=M6a
  G9 迁），**本票 eslint 面零动作**，仅核验四路径态（g10-recon.log [4] 段）。

## ② 改写面（侦察已全边落档 g10-recon.log——按行号落刀，勿凭印象）

**A 深度修正（13 件内部相对 import，恰 33 行）**：
- `./anchors/`→`../anchors/` 5 行：AnnotationEditor:15(annotation-style)、
  AnnotationMenu:41(annotation-style)、ReaderPage:49(open-paper-anchor)、
  ReaderToolbar:42(annotation-style)、reader-search.store:41(geometry-types)。
- `./interact/`→`../interact/` 1 行：AnnotationEditor:16(use-annotation-draft)。
- `./state/`→`../state/` 11 行：PageColumnView:24(PdfDocProvider)、ReaderPage:52/:53
  (reader.store+useActiveTab)、SearchHighlightLayer:40(page-layer-z)、TabBar:41/:42/:43
  (reader.store+tab-dirty+reader.store)、reader-shortcut-handlers:18/:19(reader.store+
  useActiveTab)、useReaderSearch:32/:33(useActiveTab+reader.store)。
- `./time/`→`../time/` 2 行：ReaderPage:55/:56(reading-time-setup+reading-time)。
- `../../shared/`→`../../../shared/` 7 行：ReaderPage:48/:59(open-paper-bus+ui/Toast)、
  ReaderShortcuts:46/:47/:48(keymap+ui/Toast+keymap)、reader-search.store:42
  (ui/toast-store)、useReaderSearch:31(keymap)。
- **`./view/X`→`./X` 域内化 7 行**：PageColumnView:25/:26/:27(PdfPageCanvas+PageBox+
  page-column-geometry)、ReaderPage:50/:54/:58(PageColumn+scroll-progress+
  ReaderPageView)、reader-search:32(PdfPageCanvas type)。
- **域内同根零改写 10 行**（同迁后相对关系不变）：ReaderPage:51(useReaderSearch)/
  :57(reader-shortcut-handlers)、ReaderSearchBox:31(reader-search.store)、
  SearchHighlightLayer:38/:39(reader-search+reader-search.store)、reader-search.store:
  39/:40(reader-search×2)、reader-shortcut-handlers:20/:21(ReaderShortcuts+
  ReaderToolbar)、useReaderSearch:34/:35(ReaderSearchBox+reader-search.store)。

**B src 消费面（1 行）**：src/renderer/app/App.tsx:7
`'../features/reader/ReaderPage'`→`'../features/reader/view/ReaderPage'`。

**C view 域中间态边闭合（6 行，G9 声明的 6 边本批兑现——`../X`→`./X`）**：
view/PageColumn.tsx:32(PageColumnView)、view/PagesOverlay.tsx:50(SearchHighlightLayer)、
view/AnnotationPopups.tsx:35/:36(AnnotationEditor+AnnotationMenu)、
view/ReaderPageView.tsx:37/:40(TabBar+ReaderToolbar)。

**D tests 受锁面（21 行/14 物理件，纯路径改写零用例增删；vi.mock 路径形态实测
零命中——tests 唯一 vi 命中系 vi.mocked() 对象操作非路径 mock）**：
- import 18 行/13 件（`features/reader/X`→`features/reader/view/X`）：
  annotation-menu.test.tsx:7；tab-bar.test.tsx:14；tab-dirty.test.tsx:13；
  reader-search-text.test.tsx:20；annotation-editor-ux.test.tsx:21；
  r3-rdr-set-visual.test.tsx:30/:31；reader-double-page.test.tsx:27；
  reader-search-wiring.test.tsx:18/:23；reader-page-open-race.test.tsx:43；
  reader-shortcuts.test.tsx:10；reader-search.store.test.tsx:13；
  reader-search-ui.test.tsx:17/:18/:19/:23；selection-mode.test.tsx:28。
- **字符串面 3 行（板注预列验证吻合——readFileSync 形态，漏改=theme.test
  ENOENT 红）**：theme.test.ts:292(AnnotationMenu.tsx)/:293(AnnotationEditor.tsx)/
  :485(TabBar.tsx) 路径字符串 `features/reader/X`→`features/reader/view/X`。
- e2e specs 实测零命中零触碰。

**E config 面：零动作**（eslint 四路径已全迁完如①勘正；check-quality 白名单
实测无 13 件命中——recon [2]/[3] 段活脚本域零命中，scripts/audits 归档探针
13 行命中系历史证据件零动作，G7/G8 先例）。

**F registry 随迁（主控收口职责，实现者禁碰）**：7 旧票 file 行+G10 自身翻 done
共 8 行。

## ③ TDD 协议（零行为迁移票机制，G1-G9 同款）

1. **基线锚（主控已跑，g10-verify-baseline.log）**：G10_BASELINE_VERIFY_EXIT=0
   （Node 24.20.0；open 11；指纹门 files 183/1757/5334 base vs 187/1789/5411 cur
   skip15 零漂移；Test Files 170；build 绿）。实现者开工时树应与此一致
   （另有 b22-claim/g10-recon 探针已入锁 365——manifest 面主控已处理）。
2. **中探针**：A+C 段改写完、B/D 段未改时点跑 `npm run typecheck`——预期红且
   错误**全在 tests 消费面**（src 面 0 错；此时 src 已自洽）。落
   g10-midprobe.log（含 EXIT 标记）。
3. **全绿面**：改写毕 `npm run verify` 全链绿（tickets 段红=registry 随迁系
   主控收口职责、预期内，其余七关卡须绿）。落 g10-impl-verify.log。
4. **变异红证 M1**（src 面回退）：App.tsx:7 回退旧径 `'../features/reader/
   ReaderPage'`→typecheck **TS2307 红 EXIT=2**→cp 备份法还原（禁 git checkout
   ——工作树有未提交实现）→diff 确认空→typecheck 复绿。落
   g10-mutation1.log+g10-mutation1-restore.log（restore log 尾物理落
   `M1_RESTORE_EXIT=0` 变量法标记，G5 P2-3 教训）。
5. **变异红证 M2**（tests 面回退）：tab-bar.test.tsx:14 回退旧径→单测**模块解析
   红 EXIT=1**→还原→复锁（该文件受锁，改后即时 locks:apply）→复绿。落
   g10-mutation2.log+g10-mutation2-restore.log（尾落 M2_RESTORE_EXIT=0）。
6. **构建产物哈希恒等**（G5 起迁移票标配）：迁移前后 dist/index-*.js+index-*.css
   **同名同尺寸**（基线=index-D3egZtl2.js 1,392.72kB+index-BfpEygSE.css 52.49kB
   ——G5-G9 恒等链，本票续第六票）。落 g10-build-hash.log（迁移前后双点+pdf.worker
   同名）。
7. **§3.1 单向核验探针（自产 g10-oneway.mjs）**：view→{anchors,state,panels,
   interact,time} 出边计数+**反向边（五子域→view）必须 0**+reader 根驻留文件
   **必须 0**（收官核验：根=纯目录）+view 域内 `../X` 直指根件形态**必须 0**
   （中间态边清零核验，门一 N3 收官重扫义务）+旧径残留五通道（旧径 import/
   点径/别名/动态 import/vi.mock）全 0。落 g10-oneway.log。

## ④ 受锁面操作纪律（宪法+惯例）

- tests 21 行改写前 `npm run locks:unlock`，改完**即时** `npm run locks:apply`
  （每文件改毕即时重锁，勿批量延迟）；restore 变异后同样即时复锁。
- 自产探针（g10-oneway.mjs 等）写完即时 `locks:generate`+`apply`（G4 教训①：
  探针落盘与锁登记同一动作批次）；探针单文件单目的+写前自查未用变量（G7 教训①）。
- Node 一律用 Volta 项目锁 24：`"/c/Program Files/Volta/npm.exe" run …`；
  探针跑 `"/c/Program Files/Volta/node.exe"`（宿主 PATH node=25 会 jsdom 假红）。
- 探针输出一律重定向落文件（管道吞退出码——G8 教训③）；计数落笔前 wc/grep 实测。

## ⑤ 边界与禁令

- 禁改 13 件本体任何非 import 行；禁改 M6a 14 件（仅 C 段 6 行路径改写例外）；
  禁动 reader.store 等子域件；禁动 registry/relay.md/设计书。
- 禁 vi.mock 增删（实测零命中面，保持零）；禁用例增删改语义；禁豁免清单触碰。
- 超票面决定（含任何行号实测偏差——侦察基于当前 HEAD，若有漂移以实测为准并
  申报）→ 停工申报主控裁准，勿自裁落刀。
- 中途任何红先自证是否在预期面（中探针/tickets 段），非预期红勿硬闯——停工申报。

## ⑥ 交付要求

- 实现报告 scripts/audits/g10-impl-report.md：A-F 段逐项完成态+行号对账+自裁项
  申报（含与简报行号偏差勘误段——G6 N2 惯例：勘误留痕不回改简报）；
- 证据件全落 scripts/audits/g10-*.log（EXIT 标记物理在档，变量法）；
- 终态自查：`git status` 改动面=13 rename 对+App.tsx+view 域 4 件（C 段）+
  tests 14 件+dist 产物（不入库）；`git diff --stat` 呈报主控。
