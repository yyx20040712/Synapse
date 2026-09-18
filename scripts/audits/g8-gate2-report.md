# F-GEOM-01-G8 门二实证终审报告（ops-adjudicator，deepseek-flash $max 异构裁决位）

> 主控归档注：本件为门二子代理回执逐字归档（岗无写通道）。原回执含 MODEL-SELF/LEDGER-CLAIM/agentId 尾行（账本补记依据，不入档面）。

审包=E:\class\智慧水务\Synapse_remake\scripts\audits\g8-gate2-brief.md（已通读）。以下一切数字均为本审亲读/亲 grep 复算，未采信任何转述。

## P 级分级

**P0（阻断）：无。** 工作树形态、改写面、证据链、验收链四面对账全部自洽，未发现行为漂移或证据缺环。

**P1（条件）：无。** 无收口附加条件项（见 ③ 处置终裁：七子项全部「充分」）。

**P2（注记，不阻断收口）：**
- P2-1 编码卫生：`scripts/audits/g8-impl-mutation2.log` 为 Read 工具拒读的非 UTF-8 编码（报 Unsupported or binary text encoding）；ripgrep 可正常读出全部内容（该文件 :1/:9/:44/:53/:116/:124 处退出码标记逐条可读），内容完整性不受影响，但与「中文一律 UTF-8」归档口径有磨擦——建议 G11 或随手小修时说明。
- P2-2 门一档尾栏自相矛盾：`scripts/audits/g8-gate1-report.md:31` 人读行=「PASS_WITH_WARNINGS」，:33 机读行=「FINDINGS: B=0 W=2 N=5 VERDICT=PASS」——标签不一致（实质结论 B=0/W=2/N=5 与审包 ③ 转述一致），属档面卫生。
- P2-3 diff 件覆盖面：`scripts/audits/g8-gate1-diff.patch` 仅含 28 改写行（A21+B1+C5+E1），未含 F 段 registry 6 行 hunks（gate1 报告 :9 以「附B」另证六行 registry）。本审已用 fullscan2 前态对照 + 工作树现态独立闭合该 6 行，非缺陷，但该 patch 单件不足以还原全部 34 行改写面，引用时须知。
- P2-4 开工前遗留面（实现者报告 §3.6 已申报，归主控）：`docs/handoff/relay.md:131` G8 板行仍为未勾选 `[ ]`（翻 done 归主控）；`locks/manifest.json:413/:417` 两件主控 recon 探针为开工前既有态。收口提交需与主控核对提交面切分。
- P2-5 build 恒等的证据强度边界：基线侧无字节级/哈希级记录，恒等判定由「两 run vite 显示列逐字相同 + 产物名（内容哈希）相同」承载；字节级记录仅实装侧（见 ② 复算 6）。

**N（注记外）：**
- N-1 G11 债三条照单维护：N2（行数口径）/N3（探针入锁 359）/N5（e2e 义务）——本审接受，见 ② 复算 5。
- N-2 门一 W1/W2 定性为「证据完备性/表述完备性缺口，非实现缺陷」（g8-gate1-report.md:30）——本审复核同意。
- N-3 s31 探针为点态核验器而非 linter，其面外盲区（见 ②/6）本审已用独立全库扫描补洞，无残留。

## ① 逐条裁决表

### A. 实现者申报面（原判断 → 裁决 → 依据）

| 条 | 原判断 | 裁决 | 依据（路径根=仓库根） |
|---|---|---|---|
| 8 件迁移 | 根 8 件已空、panels/ 恰 8 件 | 成立 | Glob src/renderer/features/reader/*.tsx（18 件无一为迁移件）与 panels/*（恰 8 件、名字全对）|
| A=21 深修 | OutlineAside 3/OutlinePanel 1/OutlineThumb 1/ReaderNotesPanel 5/AiNotesSection 4/AiNoteGroupList 1/AiNotesStatus 5/FragmentNotesList 1 | 成立 | 亲 grep `from '../`=21：OutlineAside.tsx:46,49,50；OutlinePanel.tsx:22；OutlineThumb.tsx:6；ReaderNotesPanel.tsx:47,48,49,52,55；AiNotesSection.tsx:50,53,54,55；AiNoteGroupList.tsx:37；AiNotesStatus.tsx:30-34；FragmentNotesList.tsx:12（分布逐文件与申报全对）|
| 深修形态 | `../../../api/client` 等 | 成立 | panels/ReaderNotesPanel.tsx:47-49、AiNotesStatus.tsx:30-32 实读；`../../notes/notes.store` 于 ReaderNotesPanel.tsx:52 |
| B=1 | ReaderPageView:35 随迁 | 成立 | src/renderer/features/reader/ReaderPageView.tsx:35 `'./panels/OutlineAside'`（全 src `panels/` grep 仅此 1 命中=唯一 src 入边）|
| C=5 行/4 件 | tests 随迁 | 成立 | tests/unit/renderer/ai-note-collapse.test.tsx:16、ai-notes-section.test.tsx:48、outline-aside.test.tsx:18、reader-notes-panel.test.tsx:23,24（恰 5 行）|
| D=0 | 跨特性零触碰 | 成立 | src 全域 `panels/`=1 命中；lineage/settings 等域零 import；fullscan2 中 lineage 命中为注释提名 |
| E=1 | check-quality:97 | 成立 | scripts/check-quality.mjs:97 新径（:79 为注释提名；他处零旧径）|
| F=6 对 | registry 6 行、status 零触碰 | 成立 | tickets/registry.ts:110/158/159/184/222（原 done 保持 done）+:299（G8 保持 'open'）；:299 file 已为新径、旧径全仓 0 |
| G=0 动作 | 字符串面无追加动作 | 成立 | theme.test.ts 对 8 名零命中（亲 grep）；tests 面 readFileSync 清单 8 件均指向 css/html/SKILL/既有 tsx，无涉迁件；非 ts 扩展名（js/cjs/ps1/css/html/json）旧径 0 |
| 域内互引 7 边零改写 | OutlinePanel1/AiNotesSection2/OutlineAside2/ReaderNotesPanel2 | 成立 | `from './`=7 且逐边与申报同；patch 以 context 行零改呈现（g8-gate1-diff.patch:56/62/120/121/142/182/183）|
| §3.1 域边 14 | anchors4+state10 | 成立 | g8-s31-check.log:3-16 逐边 + :17 汇总 anchors=4/state=10；亲 grep 同分布 |
| 跨域出边 7 | notes1+api2+shared4 | 成立 | ReaderNotesPanel.tsx:47,48,49,52；AiNotesStatus.tsx:30,31,32 |
| 总计 34 改写行 | 21+1+5+0+1+6 | 成立 | patch 28 行（含 A/B/C/E）+ registry 6 行=34；与实现报告 numstat 表（g8-impl-report.md:27-43）逐行同 |

### B. 证据件面（13 件逐一在档性 + 内容）

| 证据件 | 裁决 | 依据 |
|---|---|---|
| g8-verify-baseline.log | 成立 | :77 工单 206/open 13、:87 locks 358、:3853-3854 170 文件/1744 用例、:27 指纹 187/1789/5411/skip15、:68 指纹门绿、:3894 G8_BASELINE_VERIFY_EXIT=0（末行）|
| g8-impl-verify.log | 成立 | :27 同值零漂移、:87 locks 359、:3835-3836 170/1744、:3872-3874 build 表与基线逐字同、:3876 G8_IMPL_VERIFY_EXIT=0（末行）|
| mutation1（+restore） | 成立 | :7-8 TS2307`'./OutlineAside'` EXIT=2（恰中 ReaderPageView:35）→:16 复绿 EXIT=0；restore :1-3 三退出码（还原/diff 空/备份清理）|
| mutation2（+restore） | 成立 | :19-20 旧径模块解析红、:39-44 vitest EXIT=1；:53 复锁、:109-112 复绿 4 passed、:116 EXIT=0、:124 locks:check EXIT=0；restore :1-3 齐 |
| g8-build-hash.log | 成立 | :1-5 ls+sha256（1,402,437B/9c3b8b84…3f2a；59,923B/dcace2e7…8a97d5，与审包 ② 引值逐字合）、:6-7 EXIT=0 |
| g8-s31-check.mjs+.log | 成立 | .mjs 三面逻辑亲审（见 ②/6）；.log :17/:19/:21/:22/:23（14/0/0/true/EXIT=0）|
| g8-panels-regression.log | 成立 | :491-492 4 files/41 tests 全绿、:496 G8_PANELS_REGRESSION_EXIT=0（末行）|
| g8-impl-midprobe.log | 成立 | :7-11 恰 5 错全 tests 面、:13 TS_ERRORS=5、:14 SRC_FACE_ERRORS=0、:12 EXIT=2 |
| g8-n1-vimock.log | 成立 | :1 PANELS_MOCK_EXIT=1（0 命中）、:2-4 三件各 :0 |
| g8-recon.log / g8-fullscan2.log | 成立 | recon:2-14 入边 13 行（与我全库实测逐行同）、:15 合计、:60-61 违规候选 0；fullscan2:2-21 registry 命中（前态·旧径）、:207-208 check-quality :79/:97、末行合计 259 分域 |
| g8-impl-report.md | 成立（自裁 6 条逐条可核） | §1 numstat 表、§3-3 wc 口径申报、§3-4 E 段勘误、§3-5 registry 目验、§3-6 遗留面 |

### C. 门一发现处置终裁（七子项）

1. **W1 出边表名不副实+反向域不完备 → 处置充分。** 两半都闭合：实体面「notes/api/shared 零入边」经我三域独立 grep=0（src/renderer/features/notes、src/renderer/api、src/renderer/shared）；表述面「跨域出边 7」已落字于审包 ①（g8-gate2-brief.md:10「门一 W1 命名补全」）。g8-recon.log:2-14 的 13 行表与我全库复算逐行一致，「全仓覆盖」成立。
2. **W2 raw 证据未入包 → 处置充分。** 本审包内 13 件全部物理在档（Glob 全清单），核心断言（残留 0/反向 0/出边 14）经我亲 grep/亲读复现而非采信 log；证据链闭合。
3. **N1 vi.mock 盲区 → 销项充分。** g8-n1-vimock.log 在档；我全 tests 面 `vi.mock` 复扫：0 条指向 panels/ 或迁移件于各路径（tests/unit/renderer 22 处、tests 全域含 utils 两处，路径全为未迁件/electron/api）；4 件测试中唯一 vi.mock=ai-notes-section.test.tsx:42→anchors/anchor-locate（未迁件），无静默接真盲区。
4. **N4 check-quality 他处旧径 → 复核通过。** fullscan2:207-208 佐证 + 我亲读 check-quality.mjs（仅 :79 注释提名、:97 唯一路径且已新径）；非 ts 扩展名全域复扫旧径 0，无静默失效面。
5. **N2 wc 八件各 -1 → 照单接受充分。** 我复算：rg 计数 8/8 与 wc 表逐件相同（156/183/77/207/107/197/155/91=1173）；设计书=wc+1/件统一（=split 尾空行口径）；patch/numstat 无 EOF 行差 → 纯计数口径差，零增删；G11 对账债设立合理。
6. **N3 探针入锁 358→359 → 接受充分。** 基线 log 358、实装 log 359 逐字在档；manifest 实含三探针（:413/:417/:421，含本票 s31）；+1 归因与 G11 清理注记自洽。
7. **N5 e2e 不跑 → 接受。** 零行为口径与 G1-G7 同裁一致；红证覆盖 M1/M2=2/34 行，其余由 typecheck+unit+指纹门零漂移+内容哈希同名四重兜底，风险可接受；义务归 G11 明示。

## ② 独立复算记录（从原始证据重推）

1. **迁移形态**：根列表 18 件无 8 名；panels/=恰 8。入边全库唯一 src 命中=ReaderPageView:35（`panels/` grep 全 src）。反向三域=0。
2. **改写面复原**：A=21（逐文件分布全对）+B=1+C=5+D=0+E=1+F=6=34；patch 28 行与 numstat 表相加自洽；8 rename 相似度 95-99%、hunk 仅 import 行（逐 hunk 目验 g8-gate1-diff.patch 全文 243 行）。
3. **残留五通道闭合**：①旧径 `reader/<8名>`（ts/tsx/mjs 全域）=0；②任意深度点径 `../<8名>`/`./<8名>`（ts/tsx/mjs/cjs/js 全域）=仅 7 条 panels 内合法互引；③别名 `@*/<8名>`=0；④动态 import（reader 域仅 CorpusExtractor 两处 pdfjs）=0；⑤vi.mock panels 形态=0。
4. **边表复算**：anchors 4+state 10=14 逐边可点（s31 log:3-16）；跨域 7 逐边可点；域内 7 逐边可点；合计相对出边 21=panel import 全量（28 相对 import=21 出边+7 互引）。
5. **行数口径复算**：rg `^` 逐件=wc 表 8/8（1173）；design=wc+1/件（1181）；尾字节探针：6/8 件有尾换行、2/8 无（ReaderNotesPanel/AiNotesStatus）——与「wc=split-1 恒成立」一致，且 numstat 无 EOF 行对 → 尾换行状态非本票改动，纯口径差。
6. **构建恒等复算**：两 run vite 显示列逐字相同（baseline:3891-3892 vs impl:3872-3874）；产物名含内容哈希且相同（index-D3egZtl2.js / index-BfpEygSE.css）；实装侧字节+sha256 在 g8-build-hash.log:1-5，与审包引值逐字合。口径说明：显示列 kB 两位小数与 ls 字节列不同源（1,392.72 kB 显示 vs 1,402,437 B 实测；52.49 kB vs 59,923 B）——本审不臆断换算机制，恒等结论由「同名+同显示列」承载；基线侧无字节级独立记录（证据强度边界已列 P2-5）。
7. **数字总对账**：41（回归 log:491-492）/170+1744（双 log）/187·1789·5411·skip15（双 log:27）/locks 358→359/206·open13（baseline:77）/34 改写行——全部与审包 ④.7 及 ② 引用值对上，无一漂移。
8. **s31 探针逻辑审计**：Face1 只计 `../anchors|state`（点对点核验器，非 linter）；Face2 只扫 state|anchors|time|interact；Face3 相对形态正则 `\.{1,2}`+单引号。三个面外盲区（panels→view/time/interact/reader-root、notes/api/shared 回引、双引号与任意深度形态、vi.mock 双引号）**在本工作树内全部由本审独立扫描证实为 0**，故探针无实际假阴性残留；其面覆盖用于锚定本票关键不变量是充分的。

## ③ 回炉建议与优先级

**无回炉项（P0=0、P1=0），G8 可直接收口。** 优先级排序的执行建议：

1. （收口动作，主控）按裁决权限三分法收口：verify 真退出码已物理落档（基线/实装双 EXIT=0）→ 翻 `tickets/registry.ts:299` 状态 + relay.md:131 勾选；提交面须含 8 rename+34 改写行+受锁新径（[locked-change][test-refactor]），并依 F-AUDIT-01 三桶显式列入证据件。
2. （P2-1/P2-2，低优先，可并入 G11）证据件编码与门一档尾栏标签的档案卫生小修。
3. （G11 债，照单结转）行数口径对账（设计书 vs wc）、探针锁清理决策、e2e 全量跑义务。
4. （板记）P2-4 遗留面申报（relay.md M 态 + 开工前探针锁）在收口时与主控核对切分。

VERDICT: GO
