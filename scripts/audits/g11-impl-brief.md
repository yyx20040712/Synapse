# F-GEOM-01-G11 实现者简报（六段——主控派发，2026-09-19 batch 23）

> 派发档位：ops-executor 绑定（GLM5.3flash $max）。票=registry :302
> F-GEOM-01-G11（战役收官票 11/11，[locked-change]）。母票 F-GEOM-01（:280）
> 随本票翻 done——**翻票动作归主控收口，你零 registry 动作**。
> 设计书=docs/design/2026-09-18_f-geom01-unification-and-reader-subdomains.md
> （§2.6 交互点表/§3.5 净删记账/§5.1 验收底色/§5.4 INV 清单）。

## ① 票面与定位

零行为收官票：头注扫尾+净删/交互点记账报告+INV 终册+指纹门基线重冻结。
唯一 src 改动=注释级（view/PdfPageCanvas.tsx:36-38）；其余=受锁文档/基线/
探针面。e2e 两门与 tickets 翻票=主控收口序（你不跑 e2e、不碰 registry、
不提交 git）。

## ② 现勘事实（主控亲测——引用前仍须自测复核）

- 工作树：HEAD=62ef3802ad（G10 收口毕）；暂存区有主控件
  scripts/audits/b22-recovery-verify.log——**勿动、勿提交、勿解锁**。
- 净删骨架数：`git diff --stat c05e2ff8dd..HEAD -- src/renderer/features/reader`
  = 71 files, +313/−309（净 +4）——按域分组复算是你的探针义务。
- 基线锚：af946a5324（设计书基线）=69 文件/11,860 行口径；c05e2ff8dd
  （G1 前夜，净删 diff 基准）=70 文件（含 geometry-types 立案骨架）；HEAD=70。
- G2 删行实测源：`git diff --stat 89b4c2251d~1..89b4c2251d -- src/renderer/features/reader`。
- INV 册（docs/invariants.md）11 处 `features/reader/<平铺>` 旧径，行号
  :34 anchor-locate/:48 scroll-converge/:54 annotation-merge/:61 page-layer-z/
  :62 annotation-anchor/:70 reader-search.store/:72 reading-time/:73
  selection-evaluate/:75 与 :76 annotation-resolve/:78 release-affinity。
  域映射：anchors/={anchor-locate,annotation-merge,annotation-anchor,
  annotation-resolve,pdf-item-geometry,annotation-resolve-layered,
  annotation-band-calibrate}；state/={scroll-converge,page-layer-z}；
  view/={reader-search.store,AnnotationLayer}；time/={reading-time}；
  interact/={selection-evaluate,release-affinity,SelectionLayer}。
- src 头注陈旧面：恰 1 处=view/PdfPageCanvas.tsx:36-38（G1 期「受锁测试
  旧路径 import 本件零触（ai-annotation-layer.test:25/pdf-item-geometry
  .test:18 等十处 tests/**/*.tsx）」——G6/G9 迁移后受锁测试 import 已全部
  改向新径或直取 geometry-types，该句已陈旧）。src 平铺旧径扫描=0；注释
  「驻留」4 命中均域内正当内容（勿动）。
- 指纹门 cur=187 文件/1789 用例/5411 断言/skip15；基线 JSON stats
  =183/1757/5334（F-TESTREF-W4 冻结值）。
- 构建产物基线（恒等链第七票义务）：index-D3egZtl2.js 1,392.72kB+
  index-BfpEygSE.css 52.49kB+pdf.worker 产物——**本票毕必须同名同尺寸**
  （esbuild minify 剥注释，注释级改动预期恒等；**不等=立即停工申报**，
  它是 e2e flake 因果排除的承重前提）。

## ③ 实现步骤（验证探针先行=本票 TDD 等价）

1. **两探针先行**（写完即时 `npm run locks:generate`+`npm run locks:apply`
   ——b22 教训①；Write 文件后 node 跑，禁 node -e 多行；输出重定向落
   scripts/audits/g11-*.log 且 EXIT 物理落 log 尾）：
   - `scripts/audits/g11-netstat.mjs`：域分组净删实测——walk
     `git diff --numstat c05e2ff8dd..HEAD -- src/renderer/features/reader`，
     按 state/time/anchors/interact/panels/view 六域+域内新件分组统计
     insertions/deletions/净额+合计；另产 wc 现值（逐文件行数求和——
     **勿用 `xargs wc -l | tail -1`**，拆批后 tail 只取末段小计=假数，
     b23 主控实测踩坑在案）与 af946a5324 基线 69 文件总行数（git show
     逐文件）对账。
   - `scripts/audits/g11-inv-anchor-check.mjs`：INV-68 全部行号锚逐个
     验证（现行文件+行号+应含符号）：anchors/pdf-item-geometry.ts:366
     含 bandsFromItems；interact/selection-evaluate.ts:130/:207 含
     itemSelectionGeometry 或 bandsFromItems 主链符号；anchors/
     annotation-resolve.ts 内 itemSelectionGeometry 附近 ：506（锚描述
     =itemSelectionGeometry:506——先 grep 定位该符号所在文件与行）； 
     anchors/annotation-resolve.ts:209 bandsForTextNodes/:237
     bandsNearRects/:277 resolveAnnotationRectsDom/:302 档2 bands 消费；
     view/AnnotationLayer.tsx:98 bandsNearRects；anchors/
     annotation-band-calibrate.ts:77 calibrateBands；interact/
     selection-evaluate.ts:43/:292 显示回退。行号漂移=输出实测新行号
     （供 INV 修正）；符号缺失=停工申报。另验证 INV-47/58/68 声明处列
     全部文件现行存在性。
2. **头注扫尾**：view/PdfPageCanvas.tsx:36-38 重写为现行真话——保留
   「类型再导出（真源=anchors/geometry-types——G1 M0 切环）」要点；旧句
   的「十处 tests 旧路径零触」陈述以现行事实替换（先 grep 实测：受锁测试
   中还有谁从本件 import type——`grep -rn "from.*PdfPageCanvas" tests/`
   ——按实测结果写，禁凭印象）。
3. **探针头注（门二 P2-2 销项）**：scripts/audits/g10-oneway.mjs 文件头注
   补一句限制说明：oldPathHit 谓词锚定 `src/renderer/features/reader/`
   字面前缀，不覆盖无 `src/` 前缀的相对旧径形态（G10 门二 P2-2 登记，
   G11 顺手补）。
4. **INV 终册**（docs/invariants.md——`npm run locks:unlock`→改→即时
   `npm run locks:apply`）：
   a. ②所列 11 处平铺旧径刷新为带域前缀现行径；
   b. INV-47/INV-58/INV-68 声明处列裸文件名加域前缀（如
      pdf-item-geometry.ts→anchors/pdf-item-geometry.ts）；INV-68 正文
      行号锚按探针结果更正（漂移才改，未漂勿动）；
   c. 册内新增「路径口径」小节落款（G11 定，销 b12 门二 P2-2 悬置项）：
      **现行锚定列（声明处/锚定状态列）随域迁移刷新，恒指现行路径；
      历史叙述性引用（事故背景/前史/日期锚）保留原文不回改**；
   d. §5.4 相容确认三注记落款并入该小节：INV-47 确认不修订（S4 函数体
      零改延续——F-GEOM-01 全程未触）；INV-37/INV-60 相容确认（档位
      绑定与坐标域/域标记条款无冲突——各引用现行条款号即可）。
5. **记账报告真身**：docs/reports/2026-09-18_f-geom01-campaign-closeout.md
   重写（骨架保留标题与裁决指针段，正文五节全落）：
   - 净删/交互点记账：探针实测数+§3.5 逐项删行清单对账（G2 三项死面/
     复刻/分支收缩——用 ②的 G2 实测源取数）+**净 +4 vs 预测 −20~−80 的
     诚实构成分析**（G2 删行已兑现；G3 INV-68 落册段+33/-18、G2 头注重写、
     跨票域注/字符串面注记增量未入预测模型——逐项列数）+两口径并列声明
     （diff-changed-lines 净额 vs wc 总行数——§3.5 N2 双轨口径）+LOC
     辅助指标声明承袭（主证=交互点计数）；
   - 跨族交互点表（§2.6 五点→4+1 闭合）：逐点现行锚（#1 保存门=G2
     selection-item-chain.test 回退①锚；#2/#3/#4=INV-58/68 落款引用；
     #5 stale 自述消除=selection-evaluate 现行头注验证——grep 实证）；
   - 验收门记录：你填 verify/指纹门/锚定回归网（17 件定向清单=设计书
     §5.1 所列）；**e2e 两门留占位段标注「主控收口序填」**；
   - INV 终册状态（§5.4 四项+口径落款）；
   - 基线重冻结审计段（第 6 步跑完后填实测）；
   - G11 对账债清单销项段：设计书 §3.2 行数口径累计（G5 4 件各+1；G6
     11/13 件偏差=−6/−27/−1/−3/−1×7+2 件吻合；G7 零债；G8 8 件各+1；
     G9 13 件各−1；G10 13 件各+1——无尾换行口径差，逐票来源=relay.md
     batch 17~22 日志）+§5.1 计数差 1790/5417→1789/5411（G2 删例 1 用
     例）+PdfPageCanvas 146 vs 188（G1 类型下沉削 42）——全部标记
     「对账债销项：口径差确认，非实现缺陷」。
6. **基线重冻结**：`npm run test-surface:stats` 记 cur → `npm run
   test-surface:baseline`（scripts/test-surface.baseline.json 受锁——
   generate/apply 链同第 4 步纪律）→ diff 冻结前后 JSON 落
   g11-baseline-diff.log（**预期同值冻结 187/1789/5411**——G11 零测试面
   变更；stats 任何变化=停工申报）→ `npm run test-surface:check` 绿。
7. **全链验证**：`npm run verify` 全绿（EXIT 物理落 g11-impl-verify.log）；
   构建产物名比对基线（dist/index-*.js+css+pdf.worker——g11-build-hash.log，
   **不等=停工申报**）；锚定回归网 17 件 vitest 定向绿（g11-anchored-net.log）。

## ④ 受锁面与纪律

- 受锁件：docs/invariants.md、scripts/audits/g10-oneway.mjs、
  scripts/test-surface.baseline.json、新增两探针（诞生即 generate+apply）。
- 零触碰：tests/**（本票零测试面变更）、tickets/registry.ts、src 一切
  非注释行、主控暂存件 b22-recovery-verify.log。
- 探针纪律（b19/b22 教训）：Write 文件、写前自查未用变量、单文件单目的、
  node 跑+重定向落 log+EXIT 尾标记；一切计数落笔前亲测。
- 环境：node=v24.20.0（已验）；禁 npx 直跑 vitest（ABI 面用 npm run 通道）。

## ⑤ 申报义务（停工即报，勿自裁越过）

构建哈希破恒等；基线冻结 stats 变化；INV-68 行号锚符号缺失；verify 红
无法定位；任何超票面改动冲动（含想动 tests/registry/src 逻辑行）。

## ⑥ 产出

- 实现报告 scripts/audits/g11-impl-report.md：改动清单（文件±行）、
  探针结果汇总、计数实测表、自裁清单（一切超简报明示动作逐条列）。
- 证据件 scripts/audits/g11-*.log 全落档。
- 不 git commit；不翻 registry；不动 relay.md。
