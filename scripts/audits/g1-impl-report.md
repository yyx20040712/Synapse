# F-GEOM-01-G1 实现者报告（M0 类型下沉切环）

> 工单=tickets/registry.ts F-GEOM-01-G1｜简报=scripts/audits/g1-impl-brief.md
> 实现者=ops-executor 绑定子代理｜零行为变更重构票｜零 commit（简报红线 3
> 禁 git 写——提交归主控收口）

## 一、改动清单对照（A~G 逐项）

| 项 | 目标 | 落实情况 |
| --- | --- | --- |
| A | geometry-types.ts 骨架改真身（七搬迁物逐字含注释迁入+五层规约头注） | 完成。头注五层齐备（行为=纯类型/常量载体零运行时零依赖；接口=七组导出；架构=anchors 语义位/五消费方/自身零 import 置底；生命周期=零文件移动归 G6/M3；文化=旧路径再导出锚定四处测试）。PdfTextItem/PdfTextStyle/PdfTextContent/PdfPageGeometry 四 interface 连原文档注释逐字迁入；PixelBox（含「像素矩形/基准盒……」注释）逐字迁入；RowBand（含 F-A5/F-A9 注释）逐字迁入；COLUMN_GAP_H_FACTOR=1.5/COLUMN_GAP_PAGE_RATIO=0.02 迁入，注释按简报指示改准为真源自述（「真源驻本件——annotation-anchor/pdf-item-geometry 消费改 import；值域契约由两处测试锚定不变」）。 |
| B | PdfPageCanvas.tsx：删四 interface+import type+再导出+头注改准 | 完成。:34-80 四 interface 定义（含注释）删除；加 `import type { PdfPageGeometry, PdfTextContent, PdfTextItem } from './geometry-types'`（PdfTextStyle 内部零用未 import——简报指定）；加 `export type { PdfTextItem, PdfTextStyle, PdfTextContent, PdfPageGeometry } from './geometry-types'` 再导出；头注 :18 句改准=真源 geometry-types+本件再导出保受锁测试旧路径。 |
| C | annotation-anchor.ts：删 PixelBox+import/再导出+值 import 改向+头注两处改准 | 完成。PixelBox 定义删除；`import type { PixelBox } from './geometry-types'`+`export type { PixelBox }` 再导出加入；:51 COLUMN_GAP 值 import 改向 `from './geometry-types'`（pig↔anchor 环切断）；头注接口层句改准（NodeSpan/DomPoint 仍驻本件、PixelBox 真源=geometry-types）；架构层 [F-LINT-03] 段改写为「COLUMN_GAP_* 两常量与 PixelBox 均自 geometry-types 单源 import（G1 切环后本模块与 pdf-item-geometry 零边）」。 |
| D | annotation-resolve.ts：删 RowBand+import/再导出+头注补真源句 | 完成。RowBand 定义（含注释）删除；`import type { RowBand } from './geometry-types'`+`export type { RowBand }` 再导出加入；头注 :29「RowBand 增 x0/x1……」历史注记保留并补真源句（真源=geometry-types、再导出保 band-calibration.test:32 旧路径）。 |
| E | pdf-item-geometry.ts：三 type import 合并改向+常量删除改 import+头注改准 | 完成。三条 type import（PdfPageCanvas/annotation-anchor/annotation-resolve 向）合并为一条 `import type { PdfTextItem, PdfTextStyle, PixelBox, RowBand } from './geometry-types'`（三环切断主步）；:312-315 常量定义删除、顶部加 `import { COLUMN_GAP_H_FACTOR, COLUMN_GAP_PAGE_RATIO } from './geometry-types'`（:343 gapThreshold 消费保留）；头注「类型单一真相源」段改准=四类型+两常量均自 geometry-types（M0 切环终态）。原常量处的段落注释保留改准（指明真源与顶部 import）。 |
| F | page-items.store.ts：:37 import 改向+:29 头注改准 | 完成。两处均按简报落实（store→Canvas type 边消除 1/2）。 |
| G | reader-search.store.ts：:41 import 改向 | 完成（store→Canvas type 边消除 2/2）。 |

不改面核查：PagesOverlay/PageBox/PageColumn/PageColumnView/reader-search.ts/annotation-resolve:51/
annotation-band-calibrate/selection-evaluate/selection-paint/AnnotationLayer/AiAnnotationLayer/
anchor-blank-snap.ts 均零触（git status 实测改动面=恰 7 文件，见 §四）；tests/** 零触；
零文件移动；零新依赖；零 locks/git 写。

## 二、自裁项申报

1. **vitest 首跑红（环境前置，非改动面缺陷）**：简报 DoD 2 命令 `npx vitest run` 直跑时
   better-sqlite3 ABI 缓存处于 electron 146 而 node 24 需 137，22 文件/184 用例红（全部
   db/services 面，与本票 renderer 面无关）。按 package.json `test` script 的既有口径补
   前置 `node scripts/sqlite-abi.mjs use node` 后复跑全绿。首跑红档被复跑覆盖（g1-unit.log
   现为绿档）——首跑失败指纹在此如实留档。
2. **变异红证错误码与票面预期码的家族差异**：主证删 PdfPageCanvas 再导出后的编译红=
   TS2305×5 + TS2459×27（合计 32 处错误行，tests 面与 src 面对「成员缺失」给出两种码形）；
   副证删 PixelBox 再导出后=TS2724×3。简报预期「TS2305 no exported member」——三者
   同族同语义（具名成员缺失编译红），受锁锚（ai-annotation-layer.test:25 族/anchor-item-
   verify.test:30）如期红，红证有效性不受码形差异影响。未放宽任何断言。
   （勘误 2026-09-18 门一 W1 处置：原文「TS2305×6+TS2459×27 合计 33」「TS2724×4」系
   grep 误计 raw 内探针节头/计数标记行；实测口径=错误行 grep -c 'error TS'——主证 32
   （×5+×27）、副证 3（×3），与 error TS 行枚举一致；主证 log 裸 6 行为旧口径残留
   不采信。门二 N1 补正。）
3. **过程性注释缺陷一次（已自愈，最终态零残留）**：annotation-anchor.ts 架构层头注初稿
   写作「COLUMN_GAP_*/PixelBox」，`*/` 序列提前终止块注释致首轮 typecheck 红
   （TS1109/TS1161）；当场改写为「COLUMN_GAP_* 两常量与 PixelBox」后复绿。
4. **证据 raw 扩展名与 .gitignore 冲突（留主控裁量）**：五件证据按简报指定名
   g1-*.log 落盘（物理在档、内容完整、EXIT 标记在尾），但 .gitignore:13 `*.log`
   规则将其拦在版本库外（git check-ignore 实测五件全中）。简报指定文件名不改、
   .gitignore 属受锁面不碰——入库方式（git add -f 或改名附档）归主控收口裁量。

无其他偏离。

## 三、证据索引

| raw | 结论 |
| --- | --- |
| scripts/audits/g1-typecheck.log | `npm run typecheck` EXIT=0（尾行 TYPECHECK_EXIT=0） |
| scripts/audits/g1-unit.log | `node scripts/sqlite-abi.mjs use node && npx vitest run` EXIT=0；170 文件/1745 用例全绿=基线零漂移（尾行 UNIT_EXIT=0） |
| scripts/audits/g1-lint.log | `npm run lint` EXIT=0（尾行 LINT_EXIT=0） |
| scripts/audits/g1-mutation-reexport.log | 主证：cp 备份→删再导出行→typecheck EXIT=2（TS2305×5+TS2459×27=32 错误行）→cp 还原 diff 空（RESTORE_DIFF_EMPTY）→复跑 EXIT=0→备份删除（BACKUP_REMOVED） |
| scripts/audits/g1-mutation-pixelbox.log | 副证：cp 备份→删 `export type { PixelBox }`→typecheck EXIT=2（TS2724×3，含受锁锚 anchor-item-verify.test:30）→还原 diff 空→复跑 EXIT=0→备份删除 |

## 四、计数实测（git diff --stat / grep 机读，非估数）

- 改动文件数=7（git status 实测，全在 src/renderer/features/reader/）：
  PdfPageCanvas.tsx/annotation-anchor.ts/annotation-resolve.ts/geometry-types.ts/
  page-items.store.ts/pdf-item-geometry.ts/reader-search.store.ts
- 7 文件 diff 合计=+140/-110（git diff --numstat 实测合计）
- unit 基线核对：Test Files 170 passed (170)｜Tests 1745 passed (1745)（grep 实测）
- 变异错误计数：主证 TS2305=5/TS2459=27；副证 TS2724=3（勘误口径见 §二2——错误行 grep -c 'error TS' 实测，门一 W1 处置后）
- 工作树另有主控进场前已存在的 docs/handoff/relay.md 变更与未跟踪 g1-impl-brief.md——
  非本实现者产物，零触碰
- 变异备份件（g1-mutbak-*）已删净（git status 未跟踪面零残留）

## 五、结论

DoD 全项达成：typecheck 绿/unit 全绿零漂移/lint 绿/两条变异红证闭环（红→还原 diff 空→
复绿）/五件证据 raw 落档且 EXIT 标记物理在档。零测试触、零文件移动、零 git 写、零新
依赖、零行为变更（纯类型与常量搬迁+import 改向+再导出）。

FINDINGS: B=0/W=2/N=2/VERDICT=DONE
