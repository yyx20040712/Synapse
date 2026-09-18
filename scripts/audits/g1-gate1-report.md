# F-GEOM-01-G1 门一审查报告（岗无写通道——主控逐字归档）

> 归档说明：门一=ops-gate1-k1 绑定子代理（kimi k3 $max），报告原文逐字如下，
> 无删改。审档时间=2026-09-18 batch 13。

---

# F-GEOM-01-G1 门一审查报告（隔离一审·对抗式）

审位=门一（与实现者 GLM5.3flash 异构）；审包=简报四件+diff 全量+raw 五件+7 终态源文件亲读。所有「声称」均以 diff/源文件/raw 独立复核，未采用实现者报告转述作为依据。

## 一、靶面逐项裁决（A~G）

### A. 搬迁保真——通过

逐字比对 diff 删除侧与 geometry-types.ts 终态（103 行全文亲读）：

- PdfTextItem/PdfTextStyle/PdfTextContent/PdfPageGeometry 四 interface 及各自文档注释逐字迁入（g1-gate1-diff.patch:25-71 删除侧 vs geometry-types.ts:29-75 终态，逐句一致）；字段全集、类型、可选性零变。
- PixelBox（patch:125-131 vs geometry-types.ts:77-83）：注释「像素矩形/基准盒（origin 为视口坐标，尺寸已做 ≥1 下限防除零）」逐字+字段 x/y/w/h 全等。
- RowBand（patch:158-170 vs geometry-types.ts:85-97）：F-A5/F-A9 注释逐字，字段 top/bottom/center+x0?/x1?/calTop?/calBottom? 可选标记零变。
- 常量值 1.5/0.02 逐字（geometry-types.ts:102-103）；注释按简报明示授权改准为真源自述（简报 §二-A4「措辞改准为真源自述」），非夹带。
- 未发现字段增删/可选性变化/注释篡改。geometry-types.ts:1-103 全文零 import 语句，置底声明属实。

### B. 环切断真实性——通过（全文扫描级核验）

- pdf-item-geometry.ts 全文 509 行三段亲读（1-120/120-289/290-509）：import 仅存 :68-71 四行（@shared、annotation-merge、geometry-types×2），对 annotation-anchor/annotation-resolve/PdfPageCanvas 三向零边（含 type）确认。
- annotation-anchor.ts:51-54：import=@shared+annotation-merge+geometry-types×2，对 pig 零边确认；COLUMN_GAP 值边已改向（:53）。
- annotation-resolve.ts:51-56：对 pig 的 :54（itemSelectionGeometry 值+ItemViewport type）为既有合法单向边（非票面环面），RowBand 改自 geometry-types（:55）。resolve:53 仍经 annotation-anchor 再导出消费 PixelBox——属简报「不改面」清单明示项，合法。
- PdfPageCanvas.tsx:30-39：clampScale 值边保留（:33，简报声称为合法单向），四类型内部 import 仅三（PdfTextStyle 内部零用不 import，与简报 §二-B 一致）+再导出一行。
- 两 store 改向确认：page-items.store.ts:38、reader-search.store.ts:41 均 `from './geometry-types'`，对 PdfPageCanvas 零边。

### C. 再导出充分性——通过（负空间实证）

主证变异 log（g1-mutation-reexport.log:12-43）在删除再导出后精确枚举出全部旧路径消费面：src 6 件（PageBox:27/PageColumn:31/PageColumnView:25/PagesOverlay:52/reader-search.ts:32/TextLayer:34）+tests 10 件（ai-annotation-layer:25/anchor-item-verify:33/annotation-layer:21/band-calibration:35/pages-overlay:30/pdf-item-geometry:18/reader-search-text:21/selection-evaluate:34/selection-item-chain:24/text-layer:41）——Canvas:38 注释「十处 tests/**/*.tsx」计数亲核属实。副证 log（g1-mutation-pixelbox.log:12-14）枚举 PixelBox 旧路径消费 3 处（annotation-band-calibrate:43/annotation-resolve:53/anchor-item-verify.test:30——受锁锚在列）。终态 typecheck EXIT=0（g1-typecheck.log:7）证明全部测试 import 可解析，src 消费面零改仍编译。

### D. 头注随迁——通过

pig:40-42/anchor:27-29+39-41/Canvas:18-21/page-items:29-31/resolve:29-31 五处 stale 句全数改准（终态亲读）；geometry-types 新头注五层齐备，文化层四处测试锚（pdf-item-geometry.test:18/band-calibration.test:32,35/anchor-item-verify.test:30/ai-annotation-layer.test:25）与变异 log 实测路径逐一吻合。未发现新注释谎言。

### E. 红线——通过

diff 全量 7 文件均在 src/renderer/features/reader/ 内，tests/** 零触、零 rename 头（零文件移动）、无 package.json（零新依赖）。「不改面」清单（PagesOverlay/PageBox/PageColumn 等 13 处）均不在 diff。±行数复算：hunk 净额逐文件 −41/−1/−7/+83/+1/−5/0，合计 +30=+140−110 ✓（报告 §四计数一致）。

### F. 变异红证有效性——通过

两证均闭环且红真宿主于再导出删除：变异后 `reexport-line hits: 0`（两 log :4）→EXIT=2 红（错误集恰=消费面枚举，含受锁锚）→`RESTORE_DIFF_EMPTY`（两 log 均在档）→还原后 git diff 范围自查仅含本票改动（reexport.log:48-50/pixelbox.log:21-23）→`RESTORED_TYPECHECK_EXIT=0`→`BACKUP_REMOVED`。cp 备份法合规（未用 git checkout）。

### G. 自裁项①定性——认可

sqlite-abi 双 ABI 缓存机制为 AGENTS.md 环境事实在档件；首跑红面全在 db/services（renderer 零交集），与本票改动面无交集；按 package.json 既有口径补 `use node` 前置后 170 文件/1745 用例全绿（g1-unit.log:3912-3917 亲核，基线零漂移与设计书头部 170/1745 对账一致）。定性=环境前置非改动面缺陷，认可。自裁②码形家族差异认可（TS2459 宿主于 Canvas 仍内部 import 三类型、TS2305 恰宿主于未内部 import 的 PdfTextStyle——两码同语义「成员缺失」，分裂机理可解释）；自裁③终态 `*/` 零残留（anchor:40 亲读+typecheck/lint 双绿）；自裁④属主控收口裁量面（简报已预裁 git add -f）。

## 二、分级发现清单

**[W1] 实现者报告变异错误计数与 raw 自印数直接矛盾（两处，同一缺陷类）**
- 报告 §二2/§四称「副证 TS2724×4（grep -c 实测）」，而 g1-mutation-pixelbox.log 实际错误行恰 3 条（:12-14），且 log 自印 `TS2724 count: 3`（:18）。报告的 4=grep 把 log 自身的 "TS2724 count: 3" 标记行计入命中。
- 报告 §二2/§四称「主证 TS2305×6+TS2459×27（合计 33 处）」，而 g1-mutation-reexport.log 实际错误行 32 条：TS2305=5（:24,26,28,31,35）+TS2459=27。6=grep 把节头 `[3] typecheck expect RED (TS2305)`（:5）计入命中。
- 宪法「计数类数字落笔前经脚本实测」纪律的口径性违例（脚本跑了但把探针自身标记行计入），且报告数与 raw 自印数同档矛盾——若收口文档沿用 33/4 两数将带偏下游。不触实现正确性（红证有效性见 F 项），定 W，收口时更正报告计数即可销。

**[N1] 首跑红指纹无 raw 留档**：g1-unit.log 被复跑绿档覆盖，「22 文件/184 用例红」仅文字申报不可独立复核（R2-LG9 W1 同类教训的弱化形态——此处非断言红而属环境前置，且报告已文字如实申报，故降 N）。

**[N2] RowBand 再导出无专项变异红证**：票面 DoD 仅指定主/副两证，合规；其载荷性由终态 typecheck 绿+band-calibration.test:32 编译锚定兜底，证明强度低于另两处再导出。提示性记录，不要求补。

**[N3] 证据 .log 五件与 .gitignore:13 `*.log` 冲突**：简报已预裁收口 `git add -f`（batch 8 教训③先例），本审提醒收口时执行并核 `git status` 未跟踪面清零。

## 三、终判

**PASS_WITH_WARNINGS**。实现面 A~G 全项通过：搬迁逐字、三环+两 store 边全切断（全文扫描级核验）、再导出经负空间变异实证充分、头注随迁零谎言、红线全守、两变异红证闭环有效、自裁四项定性全部认可。唯一 W 落在实现者报告的计数失实面（与 raw 矛盾），不阻塞代码收口，收口时随报告更正销项。

MODEL-SELF: model-field:b2466f8b-9d89-4428-a38e-c2aca1c41d0e/k3$max
FINDINGS: B=0 W=1 N=3 VERDICT=PASS_WITH_WARNINGS
