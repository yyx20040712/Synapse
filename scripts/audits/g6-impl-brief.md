# F-GEOM-01-G6 实现简报（六段）——M3 目录化 anchors/ 迁移

## ① 任务与边界

零行为纯迁移（设计书 §3.4 M3 行）：`src/renderer/features/reader/` 根下 14 件迁
`src/renderer/features/reader/anchors/`（新建目录）。尾注
[locked-change][test-refactor]（受锁面=17 测试物理件+check-quality.mjs+1 e2e spec）。

**硬边界**：零行为变更；零用例增删（tests 仅纯路径改写）；禁 git 操作（含
stage/commit——主控收口职责）；禁改断言语义；域内同层互引 **25 处零改写**
（迁移后同目录 `./` 语义不变，须逐处核验而非顺手改）；registry 只改 file
字段的路径段（禁动 status——翻 done 归主控）。

## ② 精确改写清单（主控派发前全边侦察实测，g6-recon.log/g6-recon2.log 在档）

**A. 移动 14 件**（git 能识别 rename 的高相似度由纯移动+最小改写保证；用
`git mv` 不可用——你无 git 权，直接文件系统 mv 即可，主控提交时 rename 识别）：
pdf-item-geometry.ts(509)/annotation-anchor.ts(427)/annotation-merge.ts(172)/
annotation-resolve.ts(413)/annotation-resolve-layered.ts(251)/
annotation-band-calibrate.ts(119)/anchor-serialize.ts(259)/
anchor-blank-snap.ts(284)/anchor-locate.ts(293)/page-items.store.ts(69)/
open-paper-anchor.ts(43)/annotation-style.ts(119)/ai-note-style.ts(60)/
geometry-types.ts(103)——共 3121 行。

**B. 被迁件入边深度修正恰 7 行**：
- anchor-locate.ts:88 `'./state/reader.store'`→`'../state/reader.store'`
- anchor-locate.ts:89 `'./state/scroll-converge'`→`'../state/scroll-converge'`
- anchor-locate.ts:90 `'../../shared/open-paper-bus'`→`'../../../shared/open-paper-bus'`
- anchor-locate.ts:91 `'../../shared/ui/toast-store'`→`'../../../shared/ui/toast-store'`
- open-paper-anchor.ts:26 `'./state/reader.store'`→`'../state/reader.store'`
- open-paper-anchor.ts:27 `'../../shared/ui/toast-store'`→`'../../../shared/ui/toast-store'`
- open-paper-anchor.ts:28 `'../../shared/open-paper-bus'`→`'../../../shared/open-paper-bus'`

**C. reader 根未迁文件消费面恰 35 处/17 文件**（`'./x'`→`'./anchors/x'`，
目标件名按行核对）：
FragmentNotesList.tsx:12(annotation-style)；AiNoteGroupList.tsx:37(ai-note-style)；
PagesOverlay.tsx:54(page-items.store)；AiAnnotationLayer.tsx:70/71/72/73/75
(annotation-resolve/-layered/page-items.store/annotation-style/ai-note-style)；
SelectionToolbar.tsx:17(annotation-style)；AnnotationLayer.tsx:42/43/44/45/46
(annotation-resolve/-layered/page-items.store/annotation-merge/annotation-style)；
AiNotesSection.tsx:50(anchor-locate)；ReaderToolbar.tsx:42(annotation-style)；
AnnotationEditor.tsx:15(annotation-style)；AnnotationMenu.tsx:41(annotation-style)；
release-affinity.ts:80/81(annotation-anchor/anchor-blank-snap)；
OutlineAside.tsx:46(anchor-locate)；PdfPageCanvas.tsx:33(pdf-item-geometry)/
34(geometry-types)/39(geometry-types 再导出——**保留再导出机制**，仅路径段改)；
reader-search.store.ts:41(geometry-types)；selection-evaluate.ts:72/73/74/75/76/
77/78(anchor-serialize/annotation-anchor/annotation-resolve/annotation-band-
calibrate/pdf-item-geometry×2/page-items.store)；selection-paint.tsx:35/36
(annotation-resolve/annotation-style)；ReaderPage.tsx:49(open-paper-anchor)。

**D. 跨特性 src 消费恰 1 处**：lineage/LineageSideAiNotes.tsx:22
`'../reader/ai-note-style'`→`'../reader/anchors/ai-note-style'`。

**E. tests 受锁面恰 34 行/17 物理件**（纯路径改写，`reader/x`→`reader/anchors/x`；
**含 2 处 vi.mock 调用行**勿漏）：
ai-note-style.test.ts:14；annotation-merge.test.ts:15；anchor-item-verify.test.tsx:
28/29/30/31/32；pdf-item-geometry.test.tsx:30；anchor-blank-snap.test.ts:4/5；
release-affinity.test.ts:5/6；ai-notes-section.test.tsx:21/42(vi.mock)/51；
anchor-locate.test.ts:15；band-calibration.test.tsx:31/32/33；
lineage-side-panel.test.tsx:47(vi.mock)/61/63；selection-evaluate.test.tsx:32；
annotation-layer.test.tsx:20；ai-annotation-layer.test.tsx:20/22/24；
selection-item-chain.test.tsx:22；annotation-anchor.test.ts:7/11；
selection-paint.test.tsx:33/34/36；selection-layer.test.tsx:27。

**F. 配置面恰 1 行**：scripts/check-quality.mjs:99 白名单值
`'reader/ai-note-style'`→`'reader/anchors/ai-note-style'`（:87 注释行无路径
零改写；eslint/vitest/playwright/tsconfig/package.json 侦察零命中零涉及）。

**G. registry.ts 全域随迁恰 10 行**（file 字段路径段加 `anchors/`）：
:101(SR-RDR-01)/:160(SR2-C-05)/:205(SR2-F-02)/:212(SR2-LG-06)/:223(SR2-AI-12)/
:244(F-A8)/:265(F-SNAP-01)/:280(F-GEOM-01 母票)/:292(F-GEOM-01-G1)/
:297(F-GEOM-01-G6 自身)。

**H. e2e 注释勘正恰 1 处**：tests/e2e/z-wg1-probe.spec.ts:7 注释提名
`annotation-resolve.ts:224`→`anchors/annotation-resolve.ts:224`（行号不变——
纯移动；该件受锁，随 E 面同链 unlock/apply）。

**票面口径勘正三项（如实申报，勿按票面字面执行）**：
1. 票面「lineage×2」实勘=src import 1 处（LineageSideAiNotes:22）+check-quality
   白名单 1 行（:99，正是该 lineage 文件）——2 处成立但形态与票面暗示不同；
2. 票面「open-paper-bus」=**shared 域**文件（src/renderer/shared/open-paper-bus.ts）
   而非 lineage 域——落在 B 段深度修正 4 行内；
3. 票面「pdf-factory（CorpusExtractor import）」=**零命中**（G4 实勘已证注释
   提名零 import，设计书 M3 行沿用起草口径——本票零 pdf-factory 面）。

## ③ TDD 证据义务（零行为迁移票机制=基线锚+变异红证）

1. **基线锚**：主控已跑 `npm run verify` 全绿（g6-verify-baseline2.log——
   open 15/locks **348**（含主控本批三探针预登记 b18-claim/g6-recon/
   g6-recon2）/test 1744 用例/指纹门绿 C_after ⊇ C_before，Node 24.20.0；
   首跑 baseline.log EXIT=1=探针未登记红，G4 教训①姊妹面，generate+apply 后
   复绿——你交付后 locks 应仍为 348+新 sha 若你产探针则 348+N）。
   你迁移后七关卡**独立取证**（每关 EXIT 物理落 raw log）：quality/指纹门
   （test-surface:check 零漂移）/locks/lint/typecheck/test/build。
2. **变异红证 M1**（src 面）：任选一处 C 段消费行回退旧径（如
   AnnotationLayer.tsx:42 回 `'./annotation-resolve'`）→typecheck 红（TS2307）
   →**cp 备份法**还原（禁 git checkout）→`diff` 确认空→typecheck 复绿。还原
   证据尾物理落 `echo "M1_RESTORE_EXIT=$?" >> <log>`（G5 教训③：restore log
   变量法 EXIT，echo 落终端不算数）。
3. **变异红证 M2**（tests 面）：任选一处 E 段（如 anchor-locate.test.ts:15）
   回退旧径→vitest 定向跑模块解析红 EXIT=1→cp 还原→diff 空→复绿+复锁。
4. **构建产物哈希恒等**（门一 N3 标配）：迁移前后 `npm run build` 产物
   dist/assets/index-*.js 与 index-*.css **同名同尺寸**（G5 在档基线：
   index-D3egZtl2.js 1,392.72kB / index-BfpEygSE.css 52.49kB——零行为迁移
   应与 G5 收口哈希完全一致），build 输出 ls -l 或 raw log 在档。
5. **锚定回归网专项跑**：18 物理件名单（票面）定向 vitest run 全绿——文件
   名先 `ls tests/unit/renderer` 对账（.test.ts/.test.tsx 后缀自勘）：
   selection-evaluate/selection-layer/selection-layer-fa12/selection-item-chain/
   selection-geometry/selection-paint/selection-mode/annotation-anchor/
   annotation-layer/ai-annotation-layer/annotation-merge/anchor-blank-snap/
   anchor-item-verify/anchor-locate/band-calibration/pdf-item-geometry/
   pages-overlay/pdf-page-canvas。其中 5 件零改写（selection-geometry/
   selection-mode/pages-overlay/pdf-page-canvas/selection-layer-fa12——经
   PdfPageCanvas 再导出或无依赖面）仍须跑绿。
6. **§3.1 单向核验**：迁移后 grep 核 `state→anchors 反向边零存在`（state/
   目录内文件禁 import anchors 件）+`anchors→state 边恰 3`（B 段 :88/:89/:26）
   +`time↔anchors 互边零存在`。

## ④ 申报义务（超票面自裁逐条）

一切超出本简报清单的改动面（含发现的清单偏差）在实现报告中逐条申报。
已知预留位：若迁移中发现侦察遗漏的 import 形态（如动态 import/字符串路径），
停下报告勿自行扩面。**输出预算：实现报告 ≤4KB 文字**（ORG-12——raw log
外置 scripts/audits/ 不占简报体积，报告只引用文件名+行号+EXIT）。

## ⑤ 机检面

- `npm run verify` 全绿（Node 24——经 `/c/Program Files/Volta/npm.exe` 跑，
  宿主 node=25 会假红）；
- verify 内 tickets 关卡：registry G 段随迁改写后应绿（旧径=file 不存在会红——
  B~H 全落盘后再跑）；
- locks 链：unlock→改（E/F/H 面+其他受锁面）→**全部迁移面完成后一次** apply
  （G4 教训：锁操作集中一次走；apply 后 manifest 345 项含新 sha）；
- e2e 不跑（零行为口径，义务归 G11 收官——G1/G4/G5 同裁）。

## ⑥ 纪律

探针/批量改写脚本一律 Write 文件后 node 跑（shell 隔层四坑）；计数落笔前
脚本实测（清单数字=主控侦察实测，你的交付面若偏差须实测申报）；中文内容
归档一律 Write 工具禁 heredoc（G5 教训①）；所有 raw log 落
scripts/audits/g6-*.log 命名；报告写 scripts/audits/g6-impl-report.md。
