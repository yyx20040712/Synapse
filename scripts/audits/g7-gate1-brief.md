# F-GEOM-01-G7 门一审包简报（目录化 M4=interact/ 迁移+RoT 工厂抽取）

> 审对象：工作树未提交 diff（vs HEAD=2df01ad2f7）。审包=本简报+g7-gate1-diff.patch（18 diff 头/483 行——src+tests+registry 实现面；locks/manifest.json 与 docs/handoff/relay.md 剔除：前者=受锁 sha 机械同步大件，后者=主控调度面非实现面，均可按需另行取证）。
> 票面：tickets/registry.ts F-GEOM-01-G7（目录化 M4 §3.4，7 件迁 reader/interact/；受锁面=selection 系测试 import 同链；[locked-change][test-refactor]）。
> 设计书：docs/design/2026-09-18_f-geom01-unification-and-reader-subdomains.md §3.1（interact→anchors/state 单向）/§3.4 M4 行。
> 类型：**零行为纯迁移+受锁测试工厂 RoT 抽取（零断言变化）**。

## 1. 改动清单（票面承诺 vs 实际）

| 段 | 票面/简报承诺 | 实际交付 |
| --- | --- | --- |
| 迁移本体 | 7 件 reader/→reader/interact/ | git mv，rename 检出 5 RM+2 R 纯零改（SelectionLayer 238/Toolbar 78/evaluate 312/geometry 143/paint 88/affinity 210/draft 192——wc 口径） |
| A 深度修正 | 恰 19 行 | 19 行（Layer 4+Toolbar 1+evaluate 9+paint 3+affinity 2；geometry/draft 零相对 import 零修正——numstat 逐件吻合 8/2/6/6/4/0/0=26 边行=19 修正+7 域内互引零改） |
| B src 入边 | 2 处/2 文件 | ReaderPageView:41+AnnotationEditor:16 |
| C tests 路径 | 8 文件 8 行 | 8 行（selection-geometry:17/release-affinity:4/band-calibration:30/selection-evaluate:31/fa12:15/item-chain:21/paint:31/layer:26） |
| C RoT 抽取 | 4 件删定义+factories 扩三函数 | factories.ts +25/-2（mkItem/mkText/seedRegistry export+头注两句+依赖 import 4 行）；4 件测试删本地定义改 import（+2/-17、+2/-18、+2/-20、+2/-21） |
| C 边界 | anchors 域 2 份 mkItem 不动 | 零触碰（anchor-item-verify:59/pdf-item-geometry:40） |
| D 跨特性 | 零 | 零 |
| E 配置 | 零改写 | 零（eslint INV-16 四路径无 7 件；check-quality 白名单无 7 件键值） |
| F registry | 8 行随迁 | +8/-8 恰 8 对（file 改 interact/ 路径，status 零触碰——G7 自身保持 open，翻 done=主控收口职责） |
| G e2e | 零改写 | 零（reader-text.spec 4 处纯注释语义提名） |
| **裁准追加** | **theme.test.ts:294**（实现者停工申报→主控裁准 2026-09-19 01:54） | 单行 readFileSync 字符串路径 'reader/interact/SelectionToolbar.tsx'（recon import 形态扫描盲区第三现——G6 N3-N4 同族；C 段受锁面 8→9 文件） |

## 2. 关键数字（供独立复算）

- 合计：20 文件 +67/-112（实现面独占）；仓总 +123/-128（含 relay 主控面+manifest）。
- 基线锚：g7-verify-baseline3.log `G7_VERIFY_BASELINE3_EXIT=0`（206 票 open 14/locks 354/指纹门 187/1789/5411/skip15）。
- 终态：`G7_IMPL_VERIFY_FINAL_EXIT=0`（g7-impl-verify.log:7718）——Test Files **170/170**、Tests **1744/1744**（theme.test 180 个 it.each 展开用例回流前曾 169/1564）、locks 355、指纹门 187/1789/5411 零漂移、build 产物 index-D3egZtl2.js 1,392.72kB+index-BfpEygSE.css 52.49kB **同名同尺寸恒等**（log:7715-7716）。
- selection 回归：9 文件/82 用例绿（G7_SELECTION_REGRESSION_EXIT=0）。
- §3.1 单向：interact 出边 19（与 A 段一一对应）；state/anchors/time/panels→interact 反向边 0；全仓旧径残留 0（g7-oneway-check.mjs PASS；归档件 3 处旧径命中=f-a4/f-a5-gen-gate1-brief.mjs:4+arch-out/arch-scan.json，裁不动作历史档）。
- 变异红证：M1（ReaderPageView:41 回退旧径→typecheck TS2307 EXIT=2→cp 还原 diff 空→复绿）；M2（selection-layer.test:26 回退→模块解析红 EXIT=1→还原→复绿→复锁）——restore 变量法 EXIT 物理落 log。

## 3. RoT 抽取逐字性（对抗拷问点）

- mkItem/mkText：selection 系 4 份唯一体数=1（主控 g7-recon2.mjs 实测）→ factories 版逐字同构。
- seedRegistry：4 份两变体——selection-evaluate 版 2 参固定、其余 3 份参数化超集（rotate=0/view=[0,0,612,792] 默认）→收敛参数化版；selection-evaluate 全部调用为 2 参形态（:169/:189/:223/:224/:245）默认参数下行为等价。
- 4 件测试 PdfTextItem/PdfTextContent type import（from reader/PdfPageCanvas 再导出）删除——实现者核实仅签名消费（lint 反证零用）；factories 自身 type import 用 anchors/geometry-types 真身。

## 4. 实现者自裁申报（6 条，全数入 g7-impl-report.md）

1. theme.test.ts:294 待裁→已裁准处置毕（含裁决时点）；2. 4 件 type import 删除（简报授权内核实零消费）；3. factories 头注边界句随新值依赖扩面（超「追加一句」字面的真值维护）；4. wc 口径差登记（每件 +1=尾行无换行计数差）；5. M2 首试还原失败处置+探针首版路径笔误即改（过程性）；6. .log 证据件受 gitignore 拦需收口 add -f。

## 5. 审问要点（建议）

- 19 行深度修正的完备性（漏改任一边=typecheck 红——但 readFileSync 字符串路径形态不进 import 图，theme.test 已现一例，还有没有第二处？实现者全仓完备清点=恰 1 活边）。
- RoT 收敛的行为等价性（seedRegistry 超集形；type import 删除）。
- registry 8 对恰称性（status 零触碰抽查）。
- 构建哈希恒等=零行为最强旁证（N3 标配）。

## 6. 输出要求

裁决书：A1~A6 逐 hunk 零行为断言核验+B（blocker）/W（warning）/N（note）分级+verdict（PASS/PASS_WITH_WARNINGS/FAIL）。报告勿入仓库（主控逐字归档）。
