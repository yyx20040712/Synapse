# 门二裁决报告：F-GEOM-01 实施票立案批（G1~G11）——relay batch 12

> 归档说明：ops-adjudicator（deepseek-flash max 档）产出，主控逐字归档
> （岗无写通道）。裁决=GO_WITH_CONDITIONS（P1-1 落板保真/P1-2 单提交
> 范围与序/P1-3 M1 受锁白名单条目归属缺口登记）。

复核手段与边界：仅 Read/Glob/Grep 只读面（无可执行面、无 git 面——亲跑验证归实证部，hash/树绑定类断言标注为结构性盲区，见 A2-10）。审计对象=终态树（处置后 registry+skeleton+板+两份 raw）。

---

## A 复核与复算

### A.1 门一五项处置对终态逐条裁决

| 项 | 原判断（门一） | 裁决 | 终态核验依据 |
|---|---|---|---|
| **W1** | 迁移票缺「既有票 file 全域随迁」义务，40+ 票次波及 | **成立；处置闭合** | 块注释终态含「**全域随迁义务（门一 W1 处置）**…（含 done 票与 G 票自身，波及 40+ 票次）一并随迁改写——check-tickets 规则 1 全票存在性硬红兜底，属票面声明的批量改写面非票面外静默批改」（tickets/registry.ts:286-289；patch:16-19 与终态逐字对齐）。规则 1 对全票无差别存在性检查亲核成立（scripts/check-tickets.mjs:105-110）。独立实测波及面：registry 中 file 指向 reader/ 路径的条目=55 条（含母票+G1/G2/G4~G10 共 10 条本批条目，外部 45 条），「40+」声明成立且保守 |
| **W2** | 「锚定回归网 17 件」计数口径含糊（×2 语义未实核） | **成立；处置闭合** | 终态 G6 票面=「18 物理件（§5.1 名单 17 项中 selection-layer×2=selection-layer.test+selection-layer-fa12.test 双文件——tests/unit/renderer ls 实测=18）」（registry.ts:297）。独立复算：设计书 §5.1 名单逐名计数=17 项（design:330-335）；×2 展开两物理文件均在位（Glob 实测：selection-layer.test.tsx / selection-layer-fa12.test.tsx）；名单全 18 物理件逐一在位（A2-4） |
| **N1** | relay.md 落板时态张力（未来时 vs 完成时） | **方案成立；终态未兑现（按设计属收口步，见 P1-1）** | 板现态：`checked_total: 24`、`no_progress_count: 0`、`checked_done: 16`（docs/handoff/relay.md:17-19）；F-GEOM-01 实现行为待追加子项的父行（relay.md:101-102）；最新批次日志=batch 11（relay.md:126），11 子项与 batch 12 日志均未落。追加格式（顶层 `- [ ]`）与板内既有形态及 `grep -c '^- \[ \]'` 门兼容（relay.md:33 协议、:106-118 先例）。子项 id 一一对应无任何机检面=如实声明成立，须人工核对留痕 |
| **N2** | G1 红证有效性依赖 tsc 覆盖 tests 域未明示 | **成立；处置闭合+前提亲核成立** | tsconfig.web.json:23-28 include 含 `"tests/**/*.tsx"`（:27）；全仓自旧路径 `import type { … } from '…/PdfPageCanvas'` 的测试共 11 件且在位，**全部为 .tsx**（ai-annotation-layer:25、anchor-item-verify:33、annotation-layer:21、band-calibration:35、pages-overlay:30、pdf-item-geometry:18、reader-search-text:21、selection-evaluate:34、selection-item-chain:24、text-layer:41，另 pdf-page-canvas:23 为值导入）→ tsc 关卡覆盖红证通道成立；G1 票面已含前提句（registry.ts:292） |
| **N3** | 设计书表层瑕疵两则 | **成立（非本批对象）；记录不改动一致** | 终态复核两瑕疵实存：design:273 M6b 行受锁面细胞括号未闭合、design:158 §2.4 末「新 INV」措辞张力。registry 切分按 §5.3 正确（G2=INV-58 修订、G3=INV-68 新增，registry.ts:293-294） |

### A.2 独立复算记录（不采信原判断算术，逐项重推）

1. **206=195+11**：`^\s{2}\{ id: '` 全文计数（registry.ts）=206，与 check-tickets 解析数哨兵口径一致（其 status/id 全文计数哨兵仅当三者相等才绿，check-tickets.mjs:52-60）；终态 raw:76「工单统计：共 206 个」。基线 195=relay.md:160（batch 11 干树基线「195 票 open 9」）+design:12（「check-tickets 195 票 open 9」）；本批新增=G1~G11 共 11 条（registry.ts:292-302；patch:22-32 新增行 11）。195+11=206 ✓。
2. **open 20=9+11**：`owner: '(strong|weak)', status: 'open'` 命中 20 行（registry.ts:272、280、292-302、312-318），weak=0；raw:76「open 20（weak 可领 0，strong 20）」。基线 open 9（272+280+312-318）+11=20 ✓。
3. **G6 名单 18 物理件**：名单 17 项（含 selection-layer×2）展开后 18 个测试文件逐一 Glob 在位（tests/unit/renderer/ 下：selection-evaluate.test.tsx、selection-layer.test.tsx、selection-layer-fa12.test.tsx、selection-item-chain.test.tsx、selection-geometry.test.ts、selection-paint.test.tsx、selection-mode.test.tsx、annotation-anchor.test.ts、annotation-layer.test.tsx、ai-annotation-layer.test.tsx、annotation-merge.test.ts、anchor-blank-snap.test.ts、anchor-item-verify.test.tsx、anchor-locate.test.ts、band-calibration.test.tsx、pdf-item-geometry.test.tsx、pages-overlay.test.tsx、pdf-page-canvas.test.tsx）✓。
4. **M6b 27=14+13 对账**：§3.2 view 名单逐名计数=27（design:234-242）；G9 名单 14（registry.ts:300）与 G10 名单 13（:301）并集=27，逐名与 §3.2 完全吻合（G10 补全的 PageColumnView 在 §3.2 第 4 位且在 M6a 14 名单外，27−14=13 归位正确）。另全域复算：10+13+4+7+8+27=69=design:244 合计；src/renderer/features/reader 现 70 件（Glob 实测）=69 存量+geometry-types 新增，逐名可对，映射零缺零漏。M1 10/M2 4/M3 13+1/M4 7/M5 8 亦与 §3.2 逐名一致（registry.ts:295-299）。
5. **骨架无占位词/乱码**：`TODO|FIXME|placeholder` 在两骨架零命中（geometry-types.ts、docs/reports/2026-09-18_f-geom01-campaign-closeout.md）；Read 全文中文可读、结构完整（票号/目标/红线/裁决排程序要素齐）。终态全链 quality 关亦过（raw:18）。
6. **G2 先行对账数据**：selection-layer.test.tsx `it(` 计数=14 ✓、`page-items` 零命中 ✓（registry.ts:293 声明成立）。
7. **verify 机检数字（终跑）**：test-surface 183/1757/5334 base vs 187/1790/5417 cur、skipSites 15/15、NEW 项全属 F-SESS-01/F-AIN-01/F-DEDUP-01 系既有纯增、exemptions 0/0/0（raw:27-66）→ 本批零测试面变更；tickets 206/20 过（:76-77）；locks 338 一致（:86）；test 170 文件/1745 用例全绿（:4109-4110）；build 绿（:4119-4149）；`GEOM01_FILING_VERIFY_FINAL_EXIT=0` 在**末行**（:4150，其后无行）。首跑同口径 `GEOM01_FILING_VERIFY_EXIT=0`（first raw:4068，末行）。两轮数字相同属正常（两轮均在立案后、处置前后各一）。
8. **零锁面复核**：get-protected-files.ps1:11-25 受锁集合=tests/**、src/shared/**、src/main/db/migrations、*.test.*、docs/invariants.md 及列名配置、scripts/*.mjs|ps1——tickets/registry.ts、src/renderer/**、docs/reports/** 均不在内 ✓；locks:check 在 registry 已变更的终态下仍 338 一致（raw:86），构成「registry 未受锁」的第二重反证。
9. **板面算术**：现 24=16（checked_done）+8（未勾，relay.md:101/106-109/113-118）；追加 11 子项后 24+11=35，父行保留 ✓（与自裁②声明一致）。
10. **不可复核项（盲区）**：af946a5324（设计书定稿提交）与 patch 的 blob hash 无 git 面可复核；raw 未嵌入树 hash，无法从只读面把 raw 与终态树逐字节绑定——按包内证据链接受（见 N 记录）。

### A.3 收口序与立案面 DoD

- **处置→终树 verify→单提交**：①处置已入终态（patch 35 行=5 头+30 体；其中 +1 母票行/10 注释行/11 条目/1 空行，与 registry.ts:280、282-291、292-302 逐字对齐）；②终树 verify EXIT=0 物理在档（末行 4150）；③单提交未执行（按批次收口步，条件见 P1-1/P1-2）。板与批日志属 verify 扫描面外文件——check-quality 扫描面=src/tests+AGENTS.md/README.md（check-quality.mjs:51-71），locks 清单无 docs/handoff（get-protected-files.ps1:9-26），故落板后无须重跑全链，但须人工保真核对（P1-1）。
- **立案面 DoD**：check-tickets 单跑与全链均 EXIT=0（raw:77/4150）；零 [locked-change] 义务与零 locks 操作成立（A2-8）；e2e 未跑=自裁④，前提「零 src 行为变更」独立证实（geometry-types.ts=`export {}` 空体且在 src/tests 全仓零 import，grep 零命中），与 batch 1 立案批同口径，可接受。
- **主控自裁 5 项复核**：①锚选择成立（新骨架载体+存量代表件，G1/G2/G11 自身 file 随迁义务已被 W1 条款覆盖）；②板面形态成立（A.1-N1）；③零锁面成立（A2-8）；④e2e 未跑成立；⑤no_progress+1 按规则字面合规，但现态板面仍为 0，须在收口写入（P1-1）。

---

## B 裁决发现

### P0（阻断）
**无。** 全部机检面与终态内容复核未见阻断级问题。

### P1（必办条件——收口/次步执行）

**P1-1｜N1 落板保真（收口步兑现）**。收口须完成：11 子项以顶层 `- [ ]` 行追加于 relay.md:101 父行下（父行保留）；子项 id 与 registry G1~G11 **一一对应人工核对并留痕批日志**（无机检面）；`checked_total: 24→35`、`no_progress_count: 0→1`（按协议「勾选数未增 +1」，连续 3 才 HOLD）；批次日志追加 batch 12 段并澄清「上板=收口兑现」（N1 处置的兑现语义），含自裁⑤留痕。证据：relay.md:17-19/33/101-102/126；registry.ts:302（G11 声明母票随本票翻 done）。

**P1-2｜单提交范围与序**。提交范围=registry.ts+两骨架+本批审档（geom01-impl-gate1-brief.md/gate1-report.md/registry.patch/verify.raw/verify-final.raw/gate2-brief.md+本报告）+relay.md 板面；staging 显式列文件、未跟踪面归零（AGENTS 三桶口径：证据件入库、`*out*` 目录形态不入库、变异备份禁驻留）；不留半门审提交——门一 PW 已毕+本裁决即门二终审，条件满足。板/日志变更发生在终树 verify 之后且不在任何机检扫描面（A.3），不构成收口序违规，但范围内文件须逐一目检无乱码。

**P1-3｜M1 受锁面清单与 check-quality 白名单条目错位（本席独立命中，门一未见）**。check-quality.mjs 跨域白名单四条 reader 相关条目（:96-99）在迁移后必须随步改写，现状票面归属有缺口：
- (a) `check-quality.mjs:96` 键 `'src/renderer/features/reader/tab-dirty.ts'`——M1 迁移后键失配，其 `'../notes/notes.store'` 导入（tab-dirty.ts:45）将被跨域规则判红（判红逻辑亲核：check-quality.mjs:104-124，键缺失→allowed=[]→`!allowed.includes(rel)` 成立）；而 G8 票面把「:96-97 两路径」整体归 M5（registry.ts:299），M1（G4）票面受锁面枚举未含此行（registry.ts:295）→ **M1 首次全链 verify 即 quality 红**。
- (b) `check-quality.mjs:98` 目标串 `'reader/CorpusExtractor'`——M1 后消费者 `useExportCorpusEvents.ts:32` 导入目标变为 reader/state/CorpusExtractor，失配判红；该行**全批票面零归属**（G4 未列、G8 未含、G6 泛条款未及）。
- (c) `check-quality.mjs:99`（lineage→ai-note-style，消费者 LineageSideAiNotes.tsx:22）有 G6 泛条款「check-quality 跨域规则同步核」覆盖（registry.ts:297），可接受，建议 M3 对账时核到行号。
处置建议（最轻闭合，不要求改 registry 终态以免重跑终树 verify）：**收口批日志记一句该义务**（或改块注释则须至少重跑 tickets:check、原则上重跑同口径 verify）+G4 开工前票面补记。影响与兜底：M1 quality 硬红非静默，不阻断本立案批收口。

### P2（建议）
- **P2-1｜门一报告行号基准注记**：gate1-report 行号（registry.ts:288-298 等）为处置前态，终态漂移为 292-302；链路「原报告归档+gate2-brief §2 处置实录」可接受，建议批日志（可并入 P1-1 段）一句「门一报告行号基准=处置前 registry」。
- **P2-2｜INV 册既有 reader 路径引用随迁口径「包不足以裁决」**：invariants.md 内存在旧路径引用（例 :34 INV-20 行引 `src/renderer/features/reader/anchor-locate.ts`，另有多个 INV 行同类）；设计书/票面未明文其随迁口径（G11 §④ 只列 INV-68/INV-58/INV-47/INV-37/INV-60 核对）——是否须刷新=包内无法裁决；建议 G11 收官时明确「历史锚定保留 vs 随迁刷新」口径。

### N（记录与盲区，计数入 N）
- **N-1** af946a5324 无法以只读工具复核（无 git 面）；包内 relay.md:98、registry.ts:283、两审简报三处一致，按一致接受。
- **N-2** raw 无树 hash 绑定：终树 verify 与具体树快照的逐字节绑定为结构性盲区，按「标记物理落尾+内容自洽」接受（:4150/:4068）。
- **N-3** e2e 未跑成立（零 import 亲核，A.3），batch 1 先例同口径。
- **N-4** N3 两设计书瑕疵终态复核实存（design:273/:158），与「记录不改动」一致。
- **N-5** W2 残余语句：设计书原句「unit 17 件」未改（非本批对象），G6 票面已携带实测修正口径 18。
- **N-6** 板面现态（24/0）与目标（35/1）差异属收口步内容，不视为缺陷（P1-1 兑现）。

---

## C 结论

1. **五项处置闭合性**：W1 闭合、W2 闭合、N2 闭合（前提亲核成立）；N1 方案成立、兑现在收口步（现态未落板，属设计内时序）；N3 记录一致（非本批对象）。处置确已改变审计对象，本席全部对终态重核（A.1/A.2），未见处置引入新失实。
2. **归档链路可接受**：门一报告保留处置前时态+本简报处置实录补链，差异可追溯（P2-1 建议加一句基准注记）。
3. **独立复算全部一致**：206=195+11、open 20=9+11、G6 18 物理件、M6b 27=14+13（并入 69=10+13+4+7+8+27 全域对账）、骨架无占位无乱码、verify 全链数字与锁集合（A.2）。
4. **收口序合规（已执行段）**：处置→终树 verify 已兑现且 EXIT=0 物理在档；单提交待执行，三项 P1 为其条件；无 P0。唯一新发现=P1-3（M1 受锁白名单条目归属缺口，硬门兜底非静默，最轻一行日志可闭合）。

**裁决：GO_WITH_CONDITIONS**（条件=P1-1/P1-2/P1-3；P2 建议随收口顺手；计数口径 B=P0、W=P1、N=P2+记录项）。

FINDINGS: B=0/W=3/N=6/VERDICT=GO_WITH_CONDITIONS
MODEL-SELF: model-field:8ad55776-2296-4f1a-bc46-05755c8f1300/deepseek-flash$max
LEDGER-CLAIM: role=ops-adjudicator executor=model-field:8ad55776-2296-4f1a-bc46-05755c8f1300/deepseek-flash$max units=1 outcome=done
