# F-GEOM-01-G4 门二终审报告（归档件——岗无写通道，主控逐字归档）

> 承载：ops-adjudicator（deepseek-flash $max 绑定）——异构终审
> 原文逐字归档，零改写（本行以下至文件尾=岗回执原文）

---

# F-GEOM-01-G4 门二终审报告（ops-adjudicator，deepseek-flash $max，异构终审）

总裁决：**GO_WITH_CONDITIONS**（P0=0 / P1=1 / P2=3 / N=6）

审态声明：全程只读（Read/Glob/Grep），未跑任何写命令；复算基于三源交叉——diff 主件 patch、工作树实测、四类日志 raw；不引用门一结论作为任何数字的佐证，门一意见仅作对照。

## ① 逐条裁决表

| # | 原判断（来源） | 裁决 | 依据与证据行号（本审独立复算） |
| --- | --- | --- | --- |
| 1 | 变更面 +112/−112=rename 深度 8+src 50+tests 41+配置 4+registry 9 | **成立** | patch 亲数：`^\+[^+]`=112、`^-[^-]`=112、rename from/to 各 10（g4-gate1-diff.patch 全文）；五分量逐组复算见 §②-1，8+50+41+4+9=112 闭合 |
| 2 | rename 内内容变更恰 8 行且全=import 深度；5×R100 | **成立** | patch 相似度清单 :447/467/471/475/491/507/511/531/535/551=98/100/100/98/99/100/99/100/99/100；state/ 内 `from '../'` 恰 8 命中（ai-notes.store:26、annotation-undo:61、CorpusExtractor:74-76、reader.store:84/:87、tab-dirty:45）；g4-fix-deep.log:1-8+:9 |
| 3 | src 消费面 50 行/31 文件（域内 29 件 48 行+跨域 2） | **成立** | 工作树 grep `state/<十模块>`=50 行/31 文件；域内 29 件求和=48（4×3+11×2+14×1）；g4-fix-src.log:1-51；跨域 App.tsx:12/useExportCorpusEvents.ts:32 |
| 4 | tests 30 文件/41 行，构成 3×2+2×7+1×21，零用例结构变化 | **成立** | 工作树 grep `features/reader/state/`=41 行/30 文件；逐文件分布复算：3 行=ai-annotation-layer/tab-dirty，2 行恰 7 件（tab-bar/pdf-page-canvas/reader-store-undo-race/reader-page-open-race/ai-notes-section/anchor-locate/annotation-popups-autosave），1 行×21；g4-fix-tests.log:42、g4-recon-tests.log:74 |
| 5 | 配置 4 行方向（:96 键/:98 值） | **成立** | patch :9-14+:26-30；工作树 eslint.config.js:89/:92 已 state/、:90/:91 M6a 原样；check-quality.mjs:96 键=state/tab-dirty.ts、:98 值=reader/state/CorpusExtractor，方向无颠倒 |
| 6 | registry 九行仅 file 字段漂移（含三条巨行 word 级） | **成立** | 九行 id+state 路径 grep 命中恰 9（:111/:146/:148/:150/:170/:208/:230/:232/:295）；SR2-F-05(:208)/F-R2(:230)/F-R3(:232)/G4(:295) 四条巨行全文两侧比对，仅路径段差，id/status/summary/尾注零漂移；G4 保持 open；registry 旧径模式零命中 |
| 7 | 旧径零残留（src/tests/eslint/check-quality） | **成立** | 双模式 grep（`features/reader/<十模块>` 与 `reader/<十模块>`）五面全零；state/ 恰 10 文件；reader/ 顶层十旧件全消；state/ 内同目录相对 import 仅 4 行（reader.store.ts:86、tab-dirty.ts:44、useActiveTab.ts:16/:17）=正当 |
| 8 | locks 345（341→344→345）；四工具件入锁 | **成立** | manifest `"path":`=345 条；g4 件 7 个在册（:341/:345/:349/:353/:357/:361/:365）；345−7=338=G3 收口数；344 两处（baseline :87、mutation2 :118）+345 一处（master :87） |
| 9 | 指纹门 cur=187/1789/5411 零漂移、C_after⊇C_before 绿 | **成立** | master :27/:67/:68；NEW 枚举 :28-66；case 级闭账 +32=34 NEW−2 条存量豁免删改（test-surface.exemptions.json 恰 2 条=G2 设计链）；G3 在册记录与 relay :198/:266 同为 187/1789/5411⇒G4 零漂移 |
| 10 | 变异红证两 log 三段齐备 | **成立** | mutation1 :9(TS2307)→:16 RED EXIT=2→:17 diff 空→:26 GREEN EXIT=0；mutation2 :8-65(模块解析红)→:106 RED EXIT=1→:107 diff 空→:110-114 GREEN EXIT=0→:116-118 复锁 344 |
| 11 | 实现报告「tickets 红=5 行违规（4 唯一+1 重复）」 | **不成立（报告层，主数字性质不破）** | g4-verify-final.log:78-96 实际 **18 行**（:79-87 九行不存在+:88-91 四行占位+:92-96 五 guardedDescribe 含 1 重复）；「5（4+1）」恰只=第三类。红全由 registry 旧径致、master 收口后 :78 绿，故记为 **P2-1** |
| 12 | 门一 W1 处置（报告 :39 内嵌【勘误】+批次留痕） | **处置充分** | 勘误内容经我方复算逐字准确（30/41 三面机器互证=我复算；3×2+2×7+1×21 全对；原「1 行件 24」致字面 38≠41 成立）；原文失实细节由门一报告 g4-gate1-report.md:58 转述保留；返工重写反毁 as-delivered 档 |
| 13 | 自裁申报 10 项 | **全部成立** | ①30 件实勘（recon/fix/工作树三面 41/30）②mv 通道（patch 10 rename 正常识别）③探针 A 链（bak-diff grand 127→刷新版 129，+2 自扫命中属声明族）④50/31 vs 简报 49/32（impl-brief:40-46 原文即模块对计数，口径差如实）⑤generate 三次（链 338→341→345 闭合）⑥微窗（还原后 344 绿、终态 345 只读）⑦变异先行（不依赖 tickets 关卡）⑧GBK 归一（mutation2:120 尾注明示，读取无乱码）⑨partial 补链（:3744-3745 170/1744、:3783 EXIT=0）⑩工具件入锁（实测 7 件在册） |
| 14 | e2e 不跑、父级义务归 G11 | **成立** | 零行为票；G1/G3 同口径；tsconfig.web 覆盖 tests/** 兜底；N6 同裁 |

## ② 独立复算记录

**1) 变更面五分量（工作树/ patch 亲数）**
- rename 深度 8：state/ 内 8 行逐行对上（见下）+ fix-deep.log 8/8；相似度集 {98,100,98,99,99}×非 R100 件恰各承 3/2/1/1/1 行；
- src 50/31：grep 实测 50 行 31 文件（域内 48 行 29 件逐件求和复对）；
- tests 41/30：3×2+2×7+1×21=6+14+21=41 逐文件复对（修正后枚举与工作树严丝合缝）；
- 配置 4：2（eslint）+2（check-quality）；
- registry 9：6 hunk=1+3+1+1+2+1。
- **1445 行旁证复算**：state/ 十文件逐文件行数=37/72/196/311/29/98/483/76/117/26，和=1445，与 impl 报告 numstat 映射逐件全对（含 CorpusExtractor 311/PdfDocProvider 98/reader.store 483）。

**2) registry 九巨行**：见 ①#6；四条超长行全文两侧读入比对，非 diff 工具但两侧全文均在上下文内逐字核。

**3) locks manifest**：345 条计数独立复算；7 个 g4 .mjs 在册；被改面抽查在册（scripts/check-quality.mjs:429、tests/unit/renderer/reader.store.test.ts:1033、tests/utils/factories.ts:1345）；sha 形态 64-hex；master :87 与 baseline :87（344）双绿为机器重算旁证。**复算边界**：HEAD=341 无法直核（无 git），但 338(G3)→+3(recon, impl-brief:74-75 预登明示)→341→+3(fix)+1(encoding)→345 结构闭环。

**4) 旧径零残留**：五面双模式零命中（见 ①#7）；惰性历史档（coverage/.mimosa/audit json/自身侦察 log）按门一 N5 维持不处置=取证纪律（此类含旧径属留档事实，不属活跃门面）。

**5) 指纹门口径**：口径=「对 G3 收口态 187/1789/5411 零漂移」（impl-brief:77-78 明示），非对 JSON base。实测 master 与 G3 恒同；相对 base（=183/1757/5334，relay:266 登记的设计书 §5.1 时点数已在 G2 期勘误）增量 = +4 文件（全 NEW_FILE）+32 用例（34 NEW 条目−2 条存量豁免删改）+77 断言；豁免 2 hits/0 stale。**断言层未逐条闭账**（NEW 侧可加和 88，−11 属豁免删改侧无打印面）→ 记 N6 边界项；门绿+C_after⊇C_before 为机器判据，成立。

**6) 变异三段**：见 ①#10。m2 红形态=整文件加载失败 28/28（恰证 test import 路径为载荷）；m1 红=TS2307+级联 TS7006（恰证 src import 路径为载荷）；两 log 均含 backup→red→restore diff empty→green 物理段，且 m2 内嵌复锁与编码归一尾注。

**7) W1 处置复核（裁词）**：**充分，维持**。理由：勘误文字我逐字复算为真；主数字 30/41 有 fix-tests/recon/工作树三面机器互证；内嵌勘误保留了「原文失实」的可追溯声明（门一报告 :58 存原文转述）；返工重写会销毁 as-delivered 档并引入新漂移风险。附条件（并入 P2-1）：同报告 §② 的 tickets 红行数同属「计数落笔前实测」类失实，收口注记应一并如实记。

**8) 复算边界（包不足以裁决项，点名）**：①locks sha256 值级对账（无哈希工具，locks:check 绿为旁证）；②HEAD 341 与「预登拆分」（无 git 直核，结构闭合）；③提交时 rename 在真实提交中的落成（收口后主控以 `git diff --cached --stat` 复核）；④指纹断言级 −11 差（无可打印面）。以上均不影响本票结论面。

## ③ 回炉建议与优先级

**P0=0**（证据链完整·数字全过·零行为断言零破口）。
**P1=1**：P1-1 收口 staging 名册须按实测校准——g4 证据族实测 **26 件**（7 .mjs+5 .md+1 .patch+12 `*.log`+1 `*.log.bak-diff`），简报「8 .log」少计 4、门一「8 .mjs」多计 1；`*.log` 12 件走 `git add -f`（.gitignore:13），`.log.bak-diff` 不匹配 `*.log`（正常 add）；staged 后以 `git status --porcelain` 复核未跟踪面=0。**收口前补，不需返工。**
**P2=3**：P2-1 tickets 红行数勘正（报告 5 行 vs log 18 行=9+4+5 三类；收口注记如实记，报告不返工）；P2-2 open 口径=**17→16**（门一建议「18→17」系 G3 迁移，勿沿用；依据 master :77 open 17+registry 实测 17 含 G4）；P2-3 「提交后翻 G4」建议改为**翻在提交前**（宪法收口序=亲验 verify→翻 registry→提交；若坚持后翻，须第二 [locked-change] 提交且至少复跑 tickets:check 留 raw，避免「已验证态≠提交态」缝隙）。
**N=6**：N1 指纹 case 级闭账 34−2=32、G3↔G4 恒同零漂移；N2 名册计数（8 .mjs→7）随 P1-1 核正；N3 构建恒等三方亲核（baseline/partial/master 同名同尺寸：index-D3egZtl2.js 1,392.72 kB、index-BfpEygSE.css 52.49 kB、main 181.62、preload 137.96，文件名内嵌内容哈希=字节级旁证）——支持门一 N3 升格 G5+ 标配；N4 变异形态/复锁/归一尾注在档；N5 惰性残留维持不处置；N6 复算边界四项点名（§②-8）。

**§4 五动作预批裁词**
1. staging 单提交双尾注：**GO_WITH_CONDITIONS**（条件=P1-1 名册实测校准+staged 范围自查 10R+31+30+2+registry+manifest+relay+证据族≈27 件）。
2. 翻 done+summary 收口注记（30 件口径+W1 勘误留痕）：**GO_WITH_CONDITIONS**（条件=P2-2 写 17→16；建议 summary 追加一句 tickets 红 18 行三类如实记，详目留批次日志）。
3. e2e 不跑：**GO**（G1/G3 同口径，父级归 G11）。
4. 账本三行+health-scan RED=0 门：**GO**（ledger 实测 45 行→预期 48；k1→k2 换源一笔依据 g4-gate1-report.md:3-5+relay:156-162）。
5. 构建恒等旁证入批次日志：**GO**（附三点核证；建议升格后续迁移票标配）。

**收口执行序意见（推荐）**
① 先翻 G4 status=done+summary 注记（对齐全票终态=已验证语义），建议随即复跑 `tickets:check`（+quality）留 raw（低成本，封「已验证态≠提交态」缝隙）；② 按实测名册全量 staging（`*.log -f`）→ `git status` 未跟踪清零 → `git diff --cached --stat` 范围自查；③ 单提交双尾注 `[locked-change][test-refactor]`（含 manifest 同步）；④ 账本补记 3 行→health-scan RED=0 复跑；⑤ 滚动 relay batch 16 收口段（open 17→16、locks 345、test 170/1744、指纹 187/1789/5411、e2e 不跑、W1+P2-1/P2-2 留痕、build 恒等三 log 指针、账本 45→48）。

（本审证据根：E:\class\智慧水务\Synapse_remake\scripts\audits\g4-gate1-diff.patch、g4-verify-master.log、g4-mutation1.log、g4-mutation2.log、g4-baseline-verify.log、g4-verify-partial.log、g4-verify-final.log、g4-fix-deep.log、g4-fix-src.log、g4-fix-tests.log、g4-recon-tests.log、g4-recon-imports.log(.bak-diff)、g4-impl-report.md、g4-gate1-report.md、g4-impl-brief.md；工作树 tickets/registry.ts、locks/manifest.json、eslint.config.js、scripts/check-quality.mjs、scripts/check-test-surface.mjs、scripts/test-surface.exemptions.json、src/renderer/features/reader/state/、docs/handoff/relay.md、.zcode/org-ledger.jsonl）

MODEL-SELF: model-field:8ad55776-2296-4f1a-bc46-05755c8f1300/deepseek-flash$max
LEDGER-CLAIM: role=ops-adjudicator executor=model-field:8ad55776-2296-4f1a-bc46-05755c8f1300/deepseek-flash$max units=1 outcome=done
