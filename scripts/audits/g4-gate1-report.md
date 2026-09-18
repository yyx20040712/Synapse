# F-GEOM-01-G4 门一对抗审查报告（归档件——岗无写通道，主控逐字归档）

> 承载：ops-gate1-k2（zipoo 备源 kimi k3 $max）——主源 k1 连续两次 Provider
> authentication failed，按换源状态机切备源（batch 7/12 先例，batch 16=第三现）
> 原文逐字归档，零改写（本行以下至文件尾=岗回执原文）

---

审包全部核毕。以下为门一裁决报告全文。

---

# F-GEOM-01-G4 门一对抗审查报告（ops-gate1-k2，kimi k3 $max 备源承载）

**总裁决：PASS_WITH_WARNINGS**（B=0 / W=1 / N=6）

合规声明：本审全程仅用 Read，所读文件全部在审包索引内（g4-gate1-brief.md / g4-gate1-diff.patch 全 1104 行 / g4-impl-report.md / g4-impl-brief.md / recon 三 log+bak-diff / fix 三 log / mutation 两 log / verify 四 log），未触碰包外任何文件，零写操作。

## 一、零行为变更断言——逐 hunk 核（简报 §2）

**结论：成立。112 行内容变更逐行经我全数目检，无一例外=路径段变更。**

1. **rename 对恰 10 个**（patch :446-553）：CorpusExtractor(98%)/PdfDocProvider(100%)/ai-notes-phase(100%)/ai-notes.store(98%)/annotation-undo(99%)/page-layer-z(100%)/reader.store(99%)/scroll-converge(100%)/tab-dirty(99%)/useActiveTab(100%)。5 个 R100 与申报一致，均无内容 hunk。
2. **rename 内深度修正恰 8 行**且全部=import 深度：CorpusExtractor 3 行（patch :460-462，`../../../shared/`→`../../../../shared/`）+reader.store 2 行（:521/:525，api/client+toast-store）+ai-notes.store 1 行（:486）+annotation-undo 1 行（:502）+tab-dirty 1 行（:546，`../notes/`→`../../notes/`）。与 g4-fix-deep.log 行号账（:84/:87/:61/:26/:74-76/:45）逐条互洽。域内共迁边 `./annotation-undo`、`./reader.store`（×2）按简报②口径原样保留（patch :524/:544）——正确。
3. **src 消费面 50 行/31 文件**（域内 29 件 48 行+跨域 App.tsx:12/useExportCorpusEvents.ts:32）：我逐 hunk 数算=恰 50，与 g4-fix-src.log 50 条行级账逐一对应（含 TabBar:41/:43、scroll-progress:51/:52、reading-time-setup:15/:16 三处同模块双行形态）。所有改动行均为 import 语句，hunk 上下文行（注释/空行/语句）零变动。
4. **tests 41 行/30 文件**：我逐 hunk 数算=恰 41/30（3 行×2 件：tab-dirty、ai-annotation-layer；2 行×7 件：tab-bar、pdf-page-canvas、reader-store-undo-race、reader-page-open-race、ai-notes-section、anchor-locate、annotation-popups-autosave；1 行×21 件），与 g4-recon-tests.log 预登记账、g4-fix-tests.log 行级账三面吻合。抽查 vi.mock 三件（ai-annotation-layer:29、corpus-export:32、reader-page-open-race:34）：mock 工厂体在 context 中原样，仅路径串插 `state/` 段；describe/it/expect 零触。指纹门 187/1789/5411 零漂移+豁免 2 条零新增（verify-final :27/:67-68）机器旁证。
5. **配置 4 行+registry 9 行**：8+50+41+4+9=**恰 112**，与 +112/−112 申报相符。
6. **字节级独立旁证**（本审自获）：baseline/partial/master 三次构建产物哈希恒等——renderer `index-D3egZtl2.js` 1,392.72 kB、`index-BfpEygSE.css` 52.49 kB、main 181.62 kB、preload 137.96 kB 同名同尺寸（baseline :3871-3876 vs master :3875-3876 vs partial :3780-3781）。纯迁移票的产出物零差异，零行为断言最强旁证。

## 二、边界纪律核验点（简报 §3）

1. **M6a 禁动面：成立。** eslint.config.js hunk（patch :8-15）中 `PdfPageCanvas.tsx`/`TextLayer.tsx` 两行以 context 原样出现，零触。
2. **check-quality 键/值方向：成立。** patch :26-30——:96 是**键**（`state/tab-dirty.ts`，自身已迁故键随迁）、:98 是**值**（`reader/state/CorpusExtractor`，useExportCorpusEvents 键未迁、消费目标已迁故值随迁）。方向无颠倒；master quality 绿旁证。
3. **registry 9 行：成立。** 9 行（SR-RDR-09/SR2-TABS-01/SR2-TABS-03/SR2-UNDO-01/SR2-AI-02/SR2-F-05/F-R2/F-R3/G4 自身）逐行比对：仅 file 字段插 `state/` 段，id/status/summary/尾注零漂移；G4 自身 status=`open` 两侧保持（patch :1099-1100）。且 9 行与 verify-final :79-87 的 9 条「指向的文件不存在」违规清单一一对应——不多不少，机械必要性闭环。
4. **受锁链账面：自洽。** 341（主控预登，含 recon 三探针——impl-brief :75 明示）→344（+fix 三探针+recon 探针 sha 重同步，mutation2.log :116/:118 复锁绿）→345（+encoding 归一探针，master.log :87 locks:check 绿）。M2 涉锁微窗还原后 manifest 零漂移在档；cp 备份法（非 git checkout）合宪法变异还原纪律。

## 三、实现者自裁 10 项裁词（简报 §4）

| # | 裁 | 理由 |
| --- | --- | --- |
| ① 受锁面勘正 3→30 件 | **成立** | recon-tests.log（主控预登记 30/41）+fix-tests.log+diff 三面互洽；pdf-factory 经 recon 双 log 实证零 import 命中（impl-brief :51 已立案时自裁「注释提名」）；指纹门零漂移兜底 |
| ② mv 文件系统通道 | **成立** | git 权限边界内唯一通道；diff -M rename 识别由主控收口认领，patch 中 10 对 rename 已正常识别 |
| ③ 探针修复+绊线+双版 raw | **成立** | .bak-diff（grand 127）与刷新版（grand 129）我逐节比对：差异恰=tab-dirty/CorpusExtractor 两节各 +1 行 `g4-fix-src.mjs` 自扫命中，消费方清单其余全同——+2 自计数族声明属实，裁决 A 链在档 |
| ④ src 50/31 vs 简报 49/32 | **成立** | 我独立数算 diff=50/31，与实现者机器实测一致；口径差机制（模块对 vs 物理行：reader.store 消费 17 含 2 件共迁免改写=15 对+3 双行=18 物理行）推演闭合，diff 为权威面 |
| ⑤ locks:generate 三次 | **成立** | 341→344→345 三点与两处 locks:check 输出互洽，均结构性必需（措辞歧义见 N4） |
| ⑥ M2 涉锁微窗 | **成立** | 受锁件写权限必需；还原后 locks:check 344 绿（mutation2.log :118），终态全只读 |
| ⑦ 变异先于终验 | **成立** | 终验阻塞面=主控 registry 面，变异仅依赖迁移终态；两 log 三段俱全 |
| ⑧ mutation2 GBK 归一 | **成立** | log 尾注行（:120）明示归一动作，:116「已锁定 344 个文件」原文保留，本审读取无乱码 |
| ⑨ 补链取证 partial | **成立** | partial log 头（lint→typecheck :4-11）+尾（test 170/1744→build 三段→`G4_PARTIAL_CHAIN_EXIT=0` :3783）链完整 |
| ⑩ 四工具件入锁 | **成立** | 345=341+3 fix+1 encoding 账面闭合；scripts/**/*.mjs 自动覆盖+即时登记合宪法 |

## 四、发现清单

**B（Blocker）：0。**

**W（Warning）：1。**

- **W1｜实现报告计数枚举失实**（g4-impl-report.md :39）：tests 面括注「pdf-page-canvas、reader-store-undo-race、reader-page-open-race、tab-bar 各 2 行余 1 行」——实际 2 行件为 **7 件**（漏列 ai-notes-section:49-50、anchor-locate:16/:23、annotation-popups-autosave:37/:49 三件），1 行件实为 21 件；按报告字面算 2×3+4×2+24×1=38≠41。主数字 30 文件/41 行经 fix-tests.log+diff+recon 三面机器互证**正确**，失实仅在括注枚举。违 DoD「计数类数字落笔前经实测」精神但不破口证据链，报告层瑕疵，备案不返工。

**N（Note）：6。**

- N1｜票面「corpus-extractor/corpus-export/pdf-factory 3 件」枚举失准——pdf-factory 系注释提名零 import（impl-brief :51 已立案时自裁覆盖），实际受锁面 30 件以侦察实勘为准。无破口。
- N2｜G4 registry file 字段在 open 态预改，与票面「翻 done 时随迁」字面有差——check-tickets 存在性+guardedDescribe 映射双机检强制（verify-final 18 行违规实证），主控认领执行、status 保持 open、summary 未动，程序合规且透明。
- N3｜构建产物哈希三次恒等（详见一.6）——建议主控将「构建哈希恒等对照」提为 G5/G6/G7 后续纯迁移票标配零成本旁证。
- N4｜自裁⑤「三探针首登 344」措辞歧义（实为 fix 三探针；recon 三探针已在主控 341 预登内，impl-brief :75）——账面本身自洽，仅行文建议。
- N5｜惰性/历史件旧径字符串残留（coverage/*.html、.mimosa 会话态、undo01-*.audit.json、arch-scan.json、f-sl-gen/f-a5-gate1-brief.mjs、g4 自身侦察 log）——非活跃门面、零机检覆盖风险，改写历史档反违取证纪律，不处置。
- N6｜e2e 不在本票验收面（票面=verify 全链；G1「父级 e2e 归 G11」先例同口径）；tsconfig.web 覆盖 tests/** 全绿旁证 e2e spec 无 src import 敞口，纯迁移对 e2e 零风险。

## 五、处置建议（主控）

1. **收口可执行**：staging 显式列全量——10 rename 对+eslint.config.js+check-quality.mjs+31 src+30 tests+registry.ts+locks/manifest.json（主控 61/33 同步面，须与本提交同步，宪法即时 locks:apply 条）+docs/handoff/relay.md（主控调度面）+g4-* 证据族（8 .mjs+2 .md+log 族）；双尾注 `[locked-change][test-refactor]`；提交后翻 G4=done（file 字段已就位）+滚动交接书（open 18→17）。
2. **W1 备案不返工**：收口单引本门一条目为报告括注枚举失实留痕即可。
3. **门二复核建议面**：registry 九巨行 word-diff 级复验（我已行级比对，惟 SR2-F-05/F-R2/F-R3 行超 600 字符，建议二审机器复核）；locks manifest diff 本体（不在门一包内）；rename 相似度在真实提交中的落成。
4. **主控预裁项（49/32→50/31 口径、registry 九行收口认领、裁决 A 探针链）**：本审逐项独立复核后**全部维持**，无推翻。

MODEL-SELF: model-field:5e1abd9d-1f4f-41fb-afa1-ecb5ce76e256/k3$max
FINDINGS: B=0 W=1 N=6 VERDICT=PASS_WITH_WARNINGS
