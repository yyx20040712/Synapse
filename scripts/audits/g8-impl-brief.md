# F-GEOM-01-G8 实现者六段简报（目录化 M5=panels/ 域迁移）

> 派发：主控（GLM5.3 max）→ ops-executor（GLM5.3flash $max 绑定）。
> 票面=tickets/registry.ts:299 F-GEOM-01-G8；设计书=docs/design/2026-09-18_f-geom01-unification-and-reader-subdomains.md §3.4 M5 行（§3.2 panels 段/§3.1 域序）。
> 类型：**零行为纯迁移（零断言变化、零 src 行为变更）**，[locked-change][test-refactor]。

## ① 任务与目标

8 文件从 `src/renderer/features/reader/` 迁 `src/renderer/features/reader/panels/`（git mv 保 rename 检测；新建目录 panels/）：

| 文件 | 行数（设计书 §3.2 值；你 wc -l 实测后对照） |
| --- | --- |
| OutlineAside.tsx | 157 |
| OutlinePanel.tsx | 184 |
| OutlineThumb.tsx | 78 |
| ReaderNotesPanel.tsx | 208 |
| AiNotesSection.tsx | 108 |
| AiNoteGroupList.tsx | 198 |
| AiNotesStatus.tsx | 156 |
| FragmentNotesList.tsx | 92 |

行数偏差（若有）登记报告「G11 对账债」段非本票修正义务（G5/G6/G7 同口径：历批 G2/G3 改写所致）。

## ② 改写面全边（主控 recon 实测，g8-recon.log/g8-fullscan2.log 在档）

**A 段·出边深度修正恰 21 行**（reader/ 根 → reader/panels/，深度+1；行号=迁移前）：
- OutlineAside.tsx：:46 `./anchors/anchor-locate`→`../anchors/anchor-locate`；:49 `./state/reader.store`→`../state/reader.store`；:50 `./state/useActiveTab`→`../state/useActiveTab`（:47 `./OutlinePanel`/:48 `./ReaderNotesPanel` 域内互引零改）
- OutlinePanel.tsx：:22 `./state/PdfDocProvider`→`../state/PdfDocProvider`（:23 `./OutlineThumb` 域内零改）
- OutlineThumb.tsx：:6 `./state/PdfDocProvider`→`../state/PdfDocProvider`
- ReaderNotesPanel.tsx：:47 `../../api/client`→`../../../api/client`；:48 `../../shared/ui/Toast`→`../../../shared/ui/Toast`；:49 `../../shared/save-status`→`../../../shared/save-status`；:52 `../notes/notes.store`→`../../notes/notes.store`；:55 `./state/useActiveTab`→`../state/useActiveTab`（:53/:54 域内零改；@shared 别名两行零改）
- AiNotesSection.tsx：:50 `./anchors/anchor-locate`→`../anchors/anchor-locate`；:53 `./state/ai-notes-phase`→`../state/ai-notes-phase`；:54 `./state/ai-notes.store`→`../state/ai-notes.store`；:55 `./state/useActiveTab`→`../state/useActiveTab`（:51/:52 域内零改）
- AiNoteGroupList.tsx：:37 `./anchors/ai-note-style`→`../anchors/ai-note-style`
- AiNotesStatus.tsx：:30 `../../api/client`→`../../../api/client`；:31 `../../shared/ui/Toast`→`../../../shared/ui/Toast`；:32 `../../shared/ui-constants`→`../../../shared/ui-constants`；:33 `./state/ai-notes.store`→`../state/ai-notes.store`；:34 `./state/ai-notes-phase`→`../state/ai-notes-phase`
- FragmentNotesList.tsx：:12 `./anchors/annotation-style`→`../anchors/annotation-style`

域内互引 7 边零改写（同迁同层）：OutlinePanel→OutlineThumb、AiNotesSection→AiNoteGroupList/→AiNotesStatus、OutlineAside→OutlinePanel/→ReaderNotesPanel、ReaderNotesPanel→AiNotesSection/→FragmentNotesList。

**B 段·src 入边恰 1 处/1 文件**：
- `src/renderer/features/reader/ReaderPageView.tsx:35`：`'./OutlineAside'`→`'./panels/OutlineAside'`

**C 段·tests 受锁面 5 行/4 文件**（主控实测入边全表=13 行中 tests 部分；纯路径改写，零用例/断言增删）：
- tests/unit/renderer/ai-note-collapse.test.tsx:16：`reader/AiNoteGroupList`→`reader/panels/AiNoteGroupList`
- tests/unit/renderer/ai-notes-section.test.tsx:48：`reader/AiNotesSection`→`reader/panels/AiNotesSection`
- tests/unit/renderer/reader-notes-panel.test.tsx:23+24：`reader/ReaderNotesPanel`/`reader/FragmentNotesList`→`reader/panels/…`
- tests/unit/renderer/outline-aside.test.tsx:18：`reader/OutlineAside`→`reader/panels/OutlineAside`

**D 段·跨特性**：零（lineage/LineageSideAiNotes.tsx:10/:13+LineageSidePanel.tsx:73/:78 命中系注释组件名提名非 import；settings 域零命中——主控实测）。

**E 段·配置面恰 1 行**：`scripts/check-quality.mjs:97` COMPOSITION_ROOT_ALLOW 键 `'src/renderer/features/reader/ReaderNotesPanel.tsx'`→`'src/renderer/features/reader/panels/ReaderNotesPanel.tsx'`（值 `['notes/notes.store']` 不动；:96 tab-dirty/:98 CorpusExtractor/:99 ai-note-style 系 G4/G6 已迁态零触碰；:79 注释组件名提名零触碰）。票面「check-quality.mjs:96-97 两路径」实勘勘正=**单行 :97 键**（设计书 §3.4 M5 行起草时点行号口径）——报告勘误段登记。

**F 段·registry 全域随迁 6 行**（status 零触碰，仅 file 路径）：
registry.ts:110（SR-RDR-08 file=OutlinePanel）/ :158（SR2-C-03 file=ReaderNotesPanel）/ :159（SR2-C-04 file=OutlineAside）/ :184（SR2-AI-08 file=AiNotesSection）/ :222（SR2-AI-11 file=AiNoteGroupList）/ :299（F-GEOM-01-G8 自身 file=ReaderNotesPanel）——按映射改 `reader/panels/X`。OutlineThumb/AiNotesStatus/FragmentNotesList 三件无 registry file 锚（主控 grep 实测零其他行）。**G8 status 翻 done 不归你**（主控收口职责）。

**G 段·字符串面（板注预扫义务——本批已前置兑现，你只执行零动作核对）**：
- readFileSync/字符串路径形态：**全仓 0 命中**（g8-fullscan2.log 在档——theme.test 对 G8 零命实证，板注预判兑现）；
- test-surface.baseline.json 命中全为**用例标题**（非路径）→ **禁触碰**（C 面零变化）；
- e2e ai-notes-section.spec.ts:50 系注释零动作；docs 域提名=历史件零动作（G11 收官口径）；dist_new=构建产物域零动作。

## ③ TDD 红绿闭环（零行为迁移票机制）

- 基线锚：g8-verify-baseline.log `G8_BASELINE_VERIFY_EXIT=0`（Node 24.20.0；206 票 open 13/locks 358/Test Files 170/Tests 1744/指纹门 187 files·1789 cases·5411 assertions·skipSites 15/build 产物 index-D3egZtl2.js 1,392.72kB+index-BfpEygSE.css 52.49kB）。
- 变异红证 **M1（src 面）**：cp 备份 ReaderPageView.tsx → :35 回退 `'./panels/OutlineAside'`→`'./OutlineAside'` → `npm run typecheck` 须 TS2307 红 EXIT=2 → cp 还原 → diff 确认空 → 复绿。**restore 步必须变量法物理落 log**：`echo "M1_RESTORE_EXIT=$?" >> scripts/audits/g8-impl-mutation1-restore.log`。
- 变异红证 **M2（tests 面）**：cp 备份 outline-aside.test.tsx → :18 回退旧径 → 定向 `npx vitest run tests/unit/renderer/outline-aside.test.tsx` 须模块解析红 EXIT=1 → cp 还原 → diff 空 → 定向复绿 → **复锁（locks:apply）后**终态确认（restore EXIT 同法落 g8-impl-mutation2-restore.log）。
- 全程 cp 备份法，**禁 git checkout**（未提交实现会被抹掉——宪法条）。
- **构建产物哈希恒等（门一 N3 标配）**：迁移后 build 产物须与基线同名同尺寸——`index-D3egZtl2.js 1,392.72kB`+`index-BfpEygSE.css 52.49kB`（out/renderer/assets/ 下 ls 实测+sha256 落档 scripts/audits/g8-build-hash.log；零 src 行为变更=哈希必然恒等，若变=行为变更立即停工申报）。

## ④ 禁区与红线

- 禁 git commit/push（主控收口统一提交）；禁动 registry status 字段。
- 禁改任何断言/用例结构（C 面零变化——指纹门 187/1789/5411 零漂移是硬门）。
- 禁动 test-surface.baseline.json（②G 段）；禁动 docs/e2e 注释提名；禁动 dist_new。
- 受锁面操作序：`npm run locks:unlock` → 改（tests 4 件+check-quality+registry+factories 若涉及=零）→ `npm run locks:generate`+`npm run locks:apply` 即时同步（禁跨步骤延迟——宪法条）。
- 探针 .mjs 若需自产：写完**同一动作批次** lint 自查+generate+apply（b19 教训①在档）。
- shell 隔层四坑：探针一律 Write 文件后 node 跑，禁 node -e 多行。
- 发现票面与实勘不符（行号漂移/边缺失）→ 停工申报，禁顺手扩面。

## ⑤ 产出与报告

- `scripts/audits/g8-impl-report.md`：交付清单+数字逐项（±行数 git diff --numstat 逐行——粗读印象数字禁入报告）+wc -l 八件对照表+**超票面自裁申报段**（一切超出本简报的决定逐条列）。
- raw logs（`echo "X_EXIT=$?" >> log` 变量法物理落档）：g8-impl-verify.log（全量 verify）/ g8-impl-mutation1.log+restore / g8-impl-mutation2.log+restore / g8-build-hash.log / g8-panels-regression.log。
- **§3.1 单向核验脚本**（可并入 impl-verify）：迁移后 panels→{anchors,state} 出边全表（主控预判=anchors 4 边+state 10 边共 14，逐边对上）+`state|anchors|time|interact → panels` 反向边须 0+全仓旧径残留（`from './X'`/`from '../X'`/vi.mock 等 8 名全形态）须 0——输出落 log。

## ⑥ 验证要求（七关卡全绿才算交付）

1. typecheck EXIT=0；2. lint EXIT=0；3. unit 全量（Test Files 170/Tests 1744 基线零漂移）；4. build EXIT=0+产物哈希恒等（③段）；5. 指纹门 187/1789/5411/skipSites 15 零漂移；6. locks:check 一致（manifest 与你的受锁改动同步）；7. verify 全链 EXIT=0（tickets 段 registry 旧径红=收口前预期态，如实记录不算你面红）。
+ **panels 回归定向**：4 文件（ai-note-collapse/ai-notes-section/reader-notes-panel/outline-aside）全绿，用例数落 log。
+ e2e 不跑（零行为口径，义务归 G11 收官——G1-G7 同裁）。

卡住即停工申报（含根因定位）；自裁面全部进报告 ⑤ 段。完工报告即回。
