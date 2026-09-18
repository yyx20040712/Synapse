# F-GEOM-01-G1 实现者简报（六段）

> 批次：relay batch 13｜claim-1789705913-b13｜主控=GLM5.3 max（本会话）
> 实现者=ops-executor 绑定子代理（GLM5.3flash $max 档——绑定档案声明；
> 会话内子代理无 model 参数=环境限制，账本如实记欠账）
> 票面：tickets/registry.ts F-GEOM-01-G1（file 锚=src/renderer/features/reader/geometry-types.ts）
> 设计书：docs/design/2026-09-18_f-geom01-unification-and-reader-subdomains.md §3.3（M0）/§5.3（票切分）

## 一、任务定位

M0 类型下沉切环——**零行为变更重构票**。几何类型/常量单源下沉新件
geometry-types.ts，切断三处 type-only 环+两条 store→PdfPageCanvas type 边。
F-GEOM-01 战役 11 票之首（后继 G2~G11 目录迁移全部依赖本件就位）。

## 二、精确改动清单（主控已完成全边侦察，逐项执行；行号为侦察时点值）

### A. 改写骨架 src/renderer/features/reader/geometry-types.ts（现 20 行 export {} 骨架→真身）

头注五层规约（行为层=纯类型/常量载体零运行时逻辑零依赖；接口层=下述七组导出；
架构层=anchors 语义位/被 pig/anchor/resolve/Canvas/store 消费/自身零 import 置底
——设计书 §3.3；生命周期层=零文件移动红线（目录迁移归 G6/M3，届时随迁 anchors/）；
文化层=消费面经旧路径再导出锚定（pdf-item-geometry.test:18/band-calibration.
test:32,35/anchor-item-verify.test:30/ai-annotation-layer.test:25）。搬迁物
**逐字含原文档注释**：

1. PdfTextItem/PdfTextStyle/PdfTextContent/PdfPageGeometry——现驻
   PdfPageCanvas.tsx:34-80（四个 interface 及各自文档注释原样迁）
2. PixelBox——现驻 annotation-anchor.ts:71-77（含「像素矩形/基准盒……」注释）
3. RowBand——现驻 annotation-resolve.ts:58-68（含 F-A5/F-A9 注释）
4. COLUMN_GAP_H_FACTOR=1.5/COLUMN_GAP_PAGE_RATIO=0.02——现驻
   pdf-item-geometry.ts:312-315（含 [F-LINT-03]「reader 几何单源——annotation-anchor
   同值本地声明退役改 import；值域契约由两处测试锚定不变」注释随迁，措辞改准
   为真源自述）

### B. PdfPageCanvas.tsx

- 删 :34-80 四 interface 定义（随注释迁 A）
- 加内部 import：`import type { PdfPageGeometry, PdfTextContent, PdfTextItem } from './geometry-types'`
  （内部用量=:90 props 两类型+:152 谓词；PdfTextStyle 内部零用不 import）
- 加再导出（**受锁测试旧路径零触**）：`export type { PdfTextItem, PdfTextStyle, PdfTextContent, PdfPageGeometry } from './geometry-types'`
- 头注 :18「PdfTextItem/PdfTextStyle/PdfTextContent/PdfPageGeometry 类型单源驻
  本文件」句改准=真源 geometry-types、本件 type 再导出保受锁测试旧路径
  （ai-annotation-layer.test:25 等）

### C. annotation-anchor.ts

- 删 :71-77 PixelBox 定义（迁 A）
- 加 `import type { PixelBox } from './geometry-types'`（内部 :168/:178/:200 等多处消费）
  +再导出 `export type { PixelBox }`（受锁测试 anchor-item-verify.test:30 旧路径）
- :51 `import { COLUMN_GAP_H_FACTOR, COLUMN_GAP_PAGE_RATIO } from './pdf-item-geometry'`
  改向 `from './geometry-types'`（**值 import 改向=切 pig↔anchor 环的关键步**）
- 头注两处改准：接口层 :27「NodeSpan/DomPoint/PixelBox（几何域类型——单一
  真相源）」→PixelBox 真源=geometry-types（NodeSpan/DomPoint 仍驻本件）；
  架构层 :38-40「[F-LINT-03] 本模块另值 import pdf-item-geometry 的
  COLUMN_GAP_*（其对 PixelBox 为 type-only import 编译期擦除——运行时单向，
  零值环）」——环已切断，该段改写为「COLUMN_GAP_*/PixelBox 均自
  geometry-types 单源 import（G1 切环后本模块与 pdf-item-geometry 零边）」

### D. annotation-resolve.ts

- 删 :58-68 RowBand 定义（迁 A）
- 加 `import type { RowBand } from './geometry-types'`（内部 :74/:97 等消费）
  +再导出 `export type { RowBand }`（受锁测试 band-calibration.test:32
  `import { matchBand, type RowBand }` 旧路径）
- 头注 :29「RowBand 增 x0/x1……」历史注记保留，如断言真源则补一句真源=geometry-types

### E. pdf-item-geometry.ts

- :69-72 三行 type import 合并改向：`import type { PdfTextItem, PdfTextStyle } from './PdfPageCanvas'`
  /`import type { PixelBox } from './annotation-anchor'`/`import type { RowBand } from './annotation-resolve'`
  → 全部 `from './geometry-types'`（**三环切断主步**）
- :312-315 常量定义删除 → 顶部加 `import { COLUMN_GAP_H_FACTOR, COLUMN_GAP_PAGE_RATIO } from './geometry-types'`
  （内部 :348 gapThreshold 消费保留）
- 头注 :40-41「类型单一真相源：PdfTextItem/PdfTextStyle 消费自 PdfPageCanvas、
  PixelBox 自 annotation-anchor、RowBand 自 annotation-resolve（跨模块 import 类型
  ……）」改准=四类型+两常量均自 geometry-types（M0 切环终态）

### F. page-items.store.ts

- :37 `import type { PdfPageGeometry, PdfTextContent } from './PdfPageCanvas'`
  → `from './geometry-types'`（**store→Canvas type 边消除 1/2**）
- :29 头注「只 import 类型（PdfPageCanvas——INV-16 白名单不扩）」改准=
  geometry-types（纯类型件，无 Canvas 组件边）

### G. reader-search.store.ts

- :41 `import type { PdfTextItem } from './PdfPageCanvas'` → `from './geometry-types'`
  （**store→Canvas type 边消除 2/2**）

### 不改面（经再导出继续工作，禁顺手改向——最小 diff 红线）

PagesOverlay:52/PageBox:26-27/PageColumn:31/PageColumnView:25/reader-search.ts:32
（PdfPageCanvas 再导出承接）；annotation-resolve:51+annotation-band-calibrate:43
（annotation-anchor 再导出承接 PixelBox）；selection-evaluate:74/selection-paint:33/
AnnotationLayer:42/AiAnnotationLayer:70/annotation-band-calibrate:44（annotation-resolve
再导出承接 RowBand）；anchor-blank-snap.ts（零值 import，:76 仅注释提及
COLUMN_GAP_H_FACTOR——注释不改，历史语义仍真）。目录迁移步（G4~G10）届时统一改向。

## 三、红线（违反即返工）

1. **零测试触**：tests/** 一行不改（M0 无受锁面——受锁测试经三处再导出旧路径零触）
2. **零文件移动**：不建目录不挪文件（目录化归 G4~G10）；改动面=上列 7 文件
3. **禁 git 写**：不 commit/add/stash/checkout（diff 自查用只读 git diff）；禁碰
   tickets/registry.ts；禁跑任何 locks 命令（本批零受锁面）
4. **零新依赖/零行为变更**：纯类型与常量搬迁，运行时语义零变
5. **头注随迁义务**：被搬定义的注释随迁；所引文件头注 stale 句随改准（清单已列）
6. **shell 纪律**：探针一律 Write 文件后 node 跑（禁 node -e 多行/heredoc 写
   JSON）；一切要引用的退出码 `echo "X_EXIT=$?" >> <raw>` 物理追加落档
   （禁信终端回显）；计数落笔前 wc/grep 实测

## 四、验收 DoD（票面）

1. `npm run typecheck` EXIT=0
2. unit 全量绿：`npx vitest run` EXIT=0（基线 170 文件/1745 用例——M0 零行为
   变更故数字应零漂移）
3. `npm run lint` EXIT=0（触改 7 文件面）
4. **变异红证**（票面指定机制，cp 备份法——禁 git checkout）：
   a. 主证：cp PdfPageCanvas.tsx 备份 → 删再导出行 → typecheck 红
      （预期 TS2305 no exported member，宿主含 ai-annotation-layer.test:25 等
      tests/**/*.tsx——tsconfig.web.json include 已含）→ cp 还原 → `git diff`
      确认零残留 → 复跑 typecheck 绿。raw=scripts/audits/g1-mutation-reexport.log
   b. 副证：cp annotation-anchor.ts 备份 → 删 `export type { PixelBox }` 再导出
      → typecheck 红（anchor-item-verify.test:30）→ 还原 → 复绿。
      raw=scripts/audits/g1-mutation-pixelbox.log
5. 证据 raw 三件+（typecheck/unit/lint 常规跑）落 scripts/audits/g1-*，每件尾行
   EXIT 标记物理在档

## 五、产出

报告=scripts/audits/g1-impl-report.md，结构：①改动清单对照（逐项 A~G 落实
情况）②自裁项申报（一切偏离本简报的决定）③证据索引（raw 文件名→结论）④
计数实测（改动文件数/±行数——git diff --stat 实测）⑤FINDINGS 尾栏：
`FINDINGS: B=<数>/W=<数>/N=<数>/VERDICT=<DONE|BLOCKED>`。

## 六、档位与通道

实现者=ops-executor 绑定（GLM5.3flash $max）；本简报即任务书全量；卡点即停
报告（BLOCKED），禁删检查禁放宽断言。Node 通道：本会话 node=v24.20.0 直达
（如遇 25 守卫红，用 `PATH="/c/Program Files/Volta:$PATH"` 前缀重试）。
