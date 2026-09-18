# F-GEOM-01-G7 实现者六段简报（目录化 M4=interact/ 域迁移）

> 派发：主控（GLM5.3 max）→ ops-executor（GLM5.3flash $max 绑定）。
> 票面=tickets/registry.ts:298 F-GEOM-01-G7；设计书=docs/design/2026-09-18_f-geom01-unification-and-reader-subdomains.md §3.4 M4 行。
> 类型：**零行为纯迁移+受锁测试工厂 RoT 抽取（零断言变化）**，[locked-change][test-refactor]。

## ① 任务与目标

7 文件从 `src/renderer/features/reader/` 迁 `src/renderer/features/reader/interact/`（git mv 保 rename 检测）：

| 文件 | 行数（wc 实测；设计书 §3.2 值） |
| --- | --- |
| SelectionLayer.tsx | 238（238 一致） |
| SelectionToolbar.tsx | 78（78 一致） |
| selection-evaluate.ts | 313（设计书 326——G2/G3 改写所致偏差，登记 G11 对账债非本票修正义务） |
| selection-geometry.ts | 144（设计书 142，同上） |
| selection-paint.tsx | 89（设计书 85，同上） |
| release-affinity.ts | 211（211 一致） |
| use-annotation-draft.ts | 193（193 一致） |

附加义务（票面内）：**RoT 债销项**（batch 14 门一 W1 登记，承接锚=本票「selection 系测试 import 随迁」）——selection 系 4 件测试的 mkItem/mkText/seedRegistry 本地定义（各 4 份逐字同构，主控已实测唯一体数=1/1/2）下沉 `tests/utils/factories.ts` 单源。

## ② 改写面全边（主控 recon 实测，g7-recon.log/g7-recon2.log 在档）

**A 段·出边深度修正恰 19 行**（reader/ 根 → reader/interact/，深度+1；行号=迁移前）：
- SelectionLayer.tsx：:64 `../../api/client`→`../../../api/client`；:65 `../../shared/ui/Toast`→`../../../shared/ui/Toast`；:66 `./state/annotation-undo`→`../state/annotation-undo`；:72 `./state/reader.store`→`../state/reader.store`（:67-71/:75 域内互引+再导出零改）
- SelectionToolbar.tsx：:17 `./anchors/annotation-style`→`../anchors/annotation-style`
- selection-evaluate.ts：:71 Toast 同上；:72-78 七行 `./anchors/x`→`../anchors/x`（anchor-serialize/annotation-anchor/annotation-resolve/annotation-band-calibrate/pdf-item-geometry×2/page-items.store）；:79 `./state/reader.store`→`../state/reader.store`（:80 域内零改）
- selection-paint.tsx：:35/:36 `./anchors/x`→`../anchors/x`；:37 `./state/page-layer-z`→`../state/page-layer-z`
- release-affinity.ts：:80/:81 `./anchors/x`→`../anchors/x`
- selection-geometry.ts / use-annotation-draft.ts：**零相对 import，零修正**

**B 段·src 入边恰 2 处/2 文件**：
- `src/renderer/features/reader/ReaderPageView.tsx:41`：`'./SelectionLayer'`→`'./interact/SelectionLayer'`
- `src/renderer/features/reader/AnnotationEditor.tsx:16`：`'./use-annotation-draft'`→`'./interact/use-annotation-draft'`

**C 段·tests 受锁面**（8 文件，主控实测入边全表）：
1. 路径改写 8 行 8 文件（`reader/X`→`reader/interact/X`）：
   - tests/unit/renderer/selection-geometry.test.ts:17
   - tests/unit/renderer/release-affinity.test.ts:4
   - tests/unit/renderer/band-calibration.test.tsx:30
   - tests/unit/renderer/selection-evaluate.test.tsx:31
   - tests/unit/renderer/selection-layer-fa12.test.tsx:15
   - tests/unit/renderer/selection-item-chain.test.tsx:21
   - tests/unit/renderer/selection-paint.test.tsx:31
   - tests/unit/renderer/selection-layer.test.tsx:26（多行 import 尾行）
2. **RoT 抽取**（4 文件：selection-evaluate/selection-item-chain/selection-paint/selection-layer）：
   - 删本地 `mkItem`/`mkText`/`seedRegistry` 定义（mkItem+mkText 逐字同构；seedRegistry selection-evaluate 版=2 参固定、其余 3 份=参数化超集——**统一收敛到参数化版**，selection-evaluate 现有调用全 2 参形态（:169/:189/:223/:224/:245 主控实测）默认参数下行为等价）
   - `tests/utils/factories.ts` 扩三 export（逐字迁移函数体）：
     - `mkItem(str: string, x: number, y: number): PdfTextItem`
     - `mkText(items: PdfTextItem[]): PdfTextContent`
     - `seedRegistry(no: number, text: PdfTextContent, rotate = 0, view: [number, number, number, number] = [0, 0, 612, 792]): void`
   - factories.ts 头注收敛记录追加一句（mkItem/mkText/seedRegistry 各 ×4→单源；F-GEOM-01-G7 RoT 债销项=b14 门一 W1 登记）；新 import：`import { act } from 'react'`+`import { usePageItemsStore } from '../../src/renderer/features/reader/anchors/page-items.store'`+`import type { PdfTextContent, PdfTextItem } from '../../src/renderer/features/reader/anchors/geometry-types'`（真身路径，勿用 PdfPageCanvas 再导出层）
   - 4 件测试加 `import { mkItem, mkText, seedRegistry } from '../../utils/factories'`——位序放共享工具区（geometry import 之后、被测 SelectionLayer import 之前，W1A/W1B 顺序契约）
   - 删定义后：4 件各自的 `PdfTextItem/PdfTextContent` type import（from reader/PdfPageCanvas 再导出）**保留零改**（文件内别处仍消费——实现者核实若全无消费再删，lint 拦未用）；`act` import 同理核实
   - **边界：anchors 域 2 份 mkItem（anchor-item-verify.test:59/pdf-item-geometry.test:40，4 参 opts 变体）不动**——不同构（参数化变体非逐字重复）+不在本票受锁面（G6 已过审边界）+2 份未触 RoT 线；G11 收官对账清单登记残留项

**D 段·跨特性**：零（B 段全表仅 reader 根 2 文件；lineage/settings 等域零命中）。

**E 段·配置面**：零改写（核实义务保留）——eslint INV-16 四路径（:89-92）无 7 件；check-quality.mjs 白名单 :93-100 键值无 7 件。

**F 段·registry 全域随迁 8 行**（status 零触碰，仅 file 路径）：
registry.ts:107（SR-RDR-05）/ :210（SR2-F-07）/ :224（SR2-F-08）/ :242（F-A6 selection-paint）/ :257（F-A10）/ :266（F-A12）/ :293（F-GEOM-01-G2 selection-evaluate）/ :298（F-GEOM-01-G7 自身 SelectionLayer）——7 件路径按映射改 `reader/interact/X`。**G7 status 翻 done 不归你**（主控收口职责）。

**G 段·e2e**：零改写（reader-text.spec 4 处纯注释语义提名无路径形态——:652/:911/:987/:995，主控实测）。

## ③ TDD 红绿闭环（零行为迁移票机制）

- 基线锚：g7-verify-baseline3.log `G7_VERIFY_BASELINE3_EXIT=0`（206 票 open 14/locks 354/test-surface 指纹门 187/1789/5411/skipSites 15）。
- 变异红证 **M1（src 面）**：cp 备份 ReaderPageView.tsx → :41 回退 `'./interact/SelectionLayer'`→`'./SelectionLayer'` → `npm run typecheck` 须 TS2307 红 EXIT=2 → cp 还原 → diff 确认空 → 复绿。**restore 步必须变量法物理落 log**：`echo "M1_RESTORE_EXIT=$?" >> g7-impl-mutation1-restore.log`。
- 变异红证 **M2（tests 面）**：cp 备份 selection-layer.test.tsx → :26 回退旧径 → 定向 `npx vitest run tests/unit/renderer/selection-layer.test.tsx` 须模块解析红 EXIT=1 → cp 还原 → diff 空 → 定向复绿 → **复锁（locks:apply）后**终态确认。
- 全程 cp 备份法，**禁 git checkout**（未提交实现会被抹掉——宪法条）。
- **构建产物哈希恒等（门一 N3 标配）**：迁移后 build 产物须与基线同名同尺寸——`index-D3egZtl2.js 1,392.72kB`+`index-BfpEygSE.css 52.49kB`（dist/ 下 `ls -l` 实测+`certutil -hashfile` 或 node crypto sha256 落档 g7-build-hash.log；RoT 抽取零 src 变更=哈希必然恒等，若变=行为变更立即停工申报）。

## ④ 禁区与红线

- 禁 git commit/push（主控收口统一提交）；禁动 registry status 字段。
- 禁改任何断言/用例结构（C 面零变化——指纹门 187/1789/5411 零漂移是硬门）；RoT 抽取=纯函数体搬家，调用点零改动。
- 禁动 anchors 域 2 份 mkItem（②C 段边界）；禁动 selection-mode.test.tsx（零命中零触碰）。
- 受锁面操作序：`npm run locks:unlock` → 改（tests/**+registry+factories+eslint 若涉及=零）→ `npm run locks:generate`+`npm run locks:apply` 即时同步（禁跨步骤延迟——宪法条）。
- 探针 .mjs 若需自产：写完**同一动作批次** lint 自查+generate+apply（b19 主控侧两跑红教训在档）。
- shell 隔层四坑：探针一律 Write 文件后 node 跑，禁 node -e 多行。
- 发现票面与实勘不符（行号漂移/边缺失）→ 停工申报，禁顺手扩面。

## ⑤ 产出与报告

- `scripts/audits/g7-impl-report.md`：交付清单+数字逐项（±行数 git diff --numstat 逐行——粗读印象数字禁入报告）+**超票面自裁申报段**（一切超出本简报的决定逐条列）。
- raw logs（`echo "X_EXIT=$?" >> log` 变量法物理落档）：g7-impl-verify.log（全量 verify）/ g7-impl-mutation1.log+restore / g7-impl-mutation2.log+restore / g7-build-hash.log / g7-selection-regression.log。
- §3.1 单向核验脚本（可并入 impl-verify）：interact→{anchors,state} 出边全表+`state|anchors|time|panels → interact` 反向边须 0+全仓旧径残留（`from './SelectionLayer'` 等 7 名）须 0——输出落 log。

## ⑥ 验证要求（七关卡全绿才算交付）

1. typecheck EXIT=0；2. lint EXIT=0；3. unit 全量（Test Files 170/Tests 1744 基线零漂移）；4. build EXIT=0+产物哈希恒等（③段）；5. 指纹门 187/1789/5411/skipSites 15 零漂移；6. locks:check 一致（manifest 与你的受锁改动同步）；7. verify 全链 EXIT=0（tickets 段 registry 旧径红=收口前预期态，如实记录不算你面红）。
+ **selection 回归定向**：9 文件（selection-geometry/release-affinity/band-calibration/selection-evaluate/selection-layer-fa12/selection-mode/selection-item-chain/selection-paint/selection-layer）全绿，用例数落 log。
+ e2e 不跑（零行为口径，义务归 G11 收官——G1-G6 同裁）。

卡住即停工申报（含根因定位）；自裁面全部进报告 ⑤ 段。完工报告即回。
