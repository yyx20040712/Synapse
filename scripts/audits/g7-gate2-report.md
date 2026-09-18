# 门二裁决书 F-GEOM-01-G7（ops-adjudicator 承载 deepseek-flash $max；逐字归档自岗回执）

**verdict: GO_WITH_CONDITIONS**（实现面零行为断言独立成立，无 P0；3 项 P1 收口前置条件 + 3 项 P2 记录/板面条件）

**隔离与取证面声明**：只读工具面（Read/Glob/Grep，本岗无 Bash）——未做任何写操作、未亲跑 verify/typecheck（实证跑动归实证部；此处只做读证据+独立复算+只读 grep 复核）。引用面=任务授权 6 项+以下抽核面：`E:\class\智慧水务\Synapse_remake\scripts\audits\g7-recon.log`、`g7-recon2.log`、`g7-oneway-check.log`/`.mjs`、`g7-selection-regression.log`、`g7-build-hash.log`、`g7-verify-baseline3.log`、`g7-impl-mutation{1,2}*.log`、`g7-fullscan2.mjs`、`E:\class\智慧水务\Synapse_remake\src\renderer\features\reader\interact\`（7 件在位）、`E:\class\智慧水务\Synapse_remake\tests\unit\renderer\theme.test.ts`、`E:\class\智慧水务\Synapse_remake\tests\utils\factories.ts`、`E:\class\智慧水务\Synapse_remake\locks\manifest.json`、`E:\class\智慧水务\Synapse_remake\scripts\check-locks.mjs`、`check-tickets.mjs`、`E:\class\智慧水务\Synapse_remake\docs\handoff\relay.md`、`E:\class\智慧水务\Synapse_remake\.gitignore`、`eslint.config.js`、`check-quality.mjs`。

---

### P0 / P1 / P2 / N 分级清单

**P0：无。** 零行为纯迁移在全部可机验面成立：A 段 19 行逐 hunk 复算精确、域内单向出边 19 与修正行一一对应、旧径物理死亡（旧 7 路径 Glob 零文件+全仓旧径形态 0 命中）、构建产物内容哈希名恒等。

**P1-1｜locks 计数已越过在档 attestation（355→356），务必"翻 done 后终跑"重认证**
- 证据：`g7-impl-verify.log:3939`=「locks 检查通过：355」（终跑在档）；我独立实测当前 `locks/manifest.json` 条目=356（"path" 与 "sha256" 各 356 行），:396-398 为 W1 处置新增受锁件 `scripts/audits/g7-fullscan2.mjs` 条目（sha `bcdb69dc…`）。即：355 的落档已被 W1 探针入锁超越，现存 attestation 与工作树不同版本。
- 处置条件：翻 done 后终跑 verify 必须以变量法落档 **locks=356**（若 ≠356 立即停报）；终跑之后禁止再触碰任何受锁面（新/改 `scripts/**/*.mjs|*.ps1`、`tests/**`、`docs/invariants.md`、manifest），否则再次作废。

**P1-2｜探针与证据件入库义务（缺项=CI 必红）**
- 证据：`check-locks.mjs:79-83`——manifest 有登记而文件缺失即红；实测 manifest 已引用 4 个 G7 探针：`g7-recon.mjs`(:405)、`g7-recon2.mjs`(:409)、`g7-oneway-check.mjs`(:401)、`g7-fullscan2.mjs`(:397)——这 4 件必须与 manifest 同提交（否则 CI checkout 后报"manifest 中的文件已删除"）。`.gitignore:13` `*.log` → 全部 .log 需 `git add -f`（与实现者自裁 #6、门一自裁 6 裁决一致）。
- 处置条件：staging 白名单见文末收口清单；收口毕 `git status` 未跟踪面=0（G7 无 `*out*` 目录，三桶口径①）。

**P1-3｜W1-a 证据链中"归档面 0 hits"是伪零，收口说明禁沿用**
- 证据：`g7-fullscan2.mjs:25` 归档域命令为 `bash -c 'git grep … -- scripts/audits | wc -l'`，而 `:12` 行过滤器要求行内含旧径形态——`wc -l` 只输出一个数字，永远不可能匹配 → 结构上恒报 0（`g7-fullscan2.log:224`「归档面…: 0 hits」）；同日志 `:8` 的 docs 段已列来自 `scripts/audits/*.md` 的命中，自相矛盾。我的独立复算：归档 `.md` 面 210 行、全扩展 965 处/103 文件（均在 `scripts/audits/`，历史档零动作预期）。次口：docs 申报 214 与我实测 216 差 +2，系 `git grep` 不含未跟踪文件（G7 证据件未入库时不可见）→ 214 为下界。再次口：`g7-fullscan2.mjs:22` 活脚本面 pathspec `"scripts/*.mjs"` 不含子目录，未覆盖 `scripts/test-surface/extract.mjs`——我已独立复核该件旧径 0 命中（缺口内容为空）。
- 处置条件：收口说明改记「归档面=历史提名（不动作），口径归 G11」；docs 计数注明 TRACKED 下界；活脚本面写明面域定义。

**P2-1｜G10 预列实为恰 3 行（W1-b 预批，见下）**
- 证据：我全仓实测 tests 面带扩展名字符串面（readFileSync/readSrc 形态）仅 3 行：`theme.test.ts:292` AnnotationMenu.tsx、`:293` AnnotationEditor.tsx、`:485` TabBar.tsx——三者全在 G10 迁移清单内（`registry.ts:301`）；`theme.test.ts` 对 G8（panels 8 件）/G9（view 渲染簇 14 件）**零命中**。
- 处置条件：G10 票面受锁面清单写入这 3 行行号；（G8/G9 改为"迁移目标字符串面预扫"方法条款，且 G9 配置面 eslint:90-91、G8 配置面 check-quality:97 均已在各票面）。

**P2-2｜仓总分桶差 1/1 维持"包不足"，收口须一行定位**
- 证据：本岗工具面无 Bash（任务允许 Bash 亲算，但实际工具面仅 Read/Glob/Grep）→ `git diff --numstat` 全域亲算不可执行；我给出可确定边界：manifest 侧 +26/-10 可由「4 新受锁件 × 4 行插入 + 10 处 sha 行替换（9 测试+factories）」精确解释（356=354 基线+oneway+fullscan2；新件 4=recon/recon2/oneway/fullscan2），故 1/1 差额只可能落 `docs/handoff/relay.md`（29/5→30/6 型）或第五类未列件。
- 处置条件：收口时用单条 `git diff --numstat` 全域输出定位并写入收口报告；**禁沿用 123/128**（W1 探针已使该数过期）。

**P2-3｜N1/N2/N3 誊录件以机器实测值更正**
- 同下述 W/N 裁决（recon 全表为准，简报序列作废）。

**N（记录级，无动作要求）**
- N-1：门一 A5「patch 6 hunk」笔误——registry 段实为 **7 hunk**（`g7-gate1-diff.patch:415/424/433/442/451/460/469`），8 对分布 1,1,1,1,1,1,2；数字结论不受影响。
- N-2：`scripts/audits/f-a3-out/f-a3-verify-orig-20260830.json.bak` 历史残留——位于 gitignore 的 `*out*` 目录（`.gitignore:35`）不会入库，非 G7 动作。
- N-3：e2e 默认门 43 非本票义务（票面验收=verify 全链+selection 回归；G4/G5/G6 先例同口径，全跑归 G11 `registry.ts:302`）——如收口顺手跑通收益为正但不作条件。

---

### 数字独立复算表

| 项 | 原申报 | 我的独立复算（方法与结果） | 裁决 |
| --- | --- | --- | --- |
| diff 头 | 18 | patch 逐 `diff --git` 计数=18（src 7+tests 9+factories 1+registry 1；行 1/14/27/51/64/79/108/125/138/151/190/203/243/256/301/347/360/411） | ✓ |
| 文件数 | 20 | 7 迁移（5 RM+2 纯 R）+2 src 消费+9 测试+factories+registry=20；旧 7 路径 Glob 零文件、`interact/` 7 件在位 | ✓ |
| 实现面 ± | +67/-112 | 逐 hunk 加总：src 21/21（B 2+A 19）+tests 13/81（1+1+2+1+2+1+2+2+1 / 1+1+17+1+18+1+20+21+1）+factories 25/2+registry 8/8=**67/112** | ✓ 精确 |
| A 段 19 行 | 19（4/1/9/3/2） | 逐 hunk：Layer 4（:33-47）、Toolbar 1（:55-60）、affinity 2（:68-75）、evaluate 9（:83-104）、paint 3（:112-121）=19 | ✓ |
| 域内零改 | 7 | recon §C 互证：Layer 5 域内+re-export 1+evaluate 1（`g7-recon.log:27-33,37-46`），patch 无对应改动行 | ✓ |
| 出边 | 19 | `g7-oneway-check.log:2-21` 全表逐行=19（4+1+9+3+2），与 A 段一一对应；反向边 0（:22-23）、残留 0（:24-25） | ✓ |
| B 段 | 2 处 | `g7-gate1-diff.patch:9-10`（AnnotationEditor:16）+`:22-23`（ReaderPageView:41） | ✓ |
| C 段路径 | 9 行（8+theme） | 我全仓 grep `reader/interact/` in tests=9 文件×1 行（含 theme:294） | ✓ |
| RoT 4 件 | +2/-17、-18、-20、-21 | hunk 头净差验算：evaluate 21→6、chain 22→6、layer 24→6、paint 25→6，加行=2/件 | ✓ 精确 |
| factories | +25/-2 | hunk1 9/2+hunk2 +16/0（:364-410）；现文件 :127-141 三 export 在位 | ✓ |
| **seedRegistry 等价** | 2 参固定版等价（门一仅证 evaluate） | 我实测 **24 个调用点全为 2 参形态**（evaluate :154/174/208/209/230；chain :121/139/167/206/221；layer :164/209/231/243/254/283/298/331；paint :174/233/269/391/409/426）→ 四件等价均成立，论证比门一更强 | ✓ 加强 |
| registry 8 对 | 8（-/+ 逐字） | patch 7 hunk 内恰 8 对，status 全保留（done×7+open×1）；`tickets/registry.ts:298` G7=open、file 已随迁 | ✓（hunk 计数更正=N-1） |
| 仓总 vs 分桶 | 123/128 vs 122/127 | 包不足定位（无 Bash）；manifest 侧 +26/-10 可完全解释；差额只可落 relay 或第五类件 | 维持 N4 不确定+收口定位令（P2-2） |
| locks | 354→355 | baseline3:87=354 ✓；终跑 :3939=355 ✓；**当前 manifest=356 条目**（W1 探针入锁） | ⚠️ P1-1 重认证 |
| 指纹门 | 187/1789/5411 | baseline3:27 与两跑（:27/:3879）逐值同：`183 base/187 cur｜1757/1789｜5334/5411｜skip 15/15` | ✓ 零漂移 |
| 测试 | 170/1744 | 终跑 :7677-7678=170/1744；run1 :3846-3847=169/1564（差 180=theme it.each 展开，自洽） | ✓ |
| build 恒等 | 同名同尺寸 | **包内双点实证**：baseline3:3883-3884 与终跑 :7715-7716 同为 `index-BfpEygSE.css 52.49kB`+`index-D3egZtl2.js 1,392.72kB`（Vite 内容哈希入名→逐字节同） | ✓（强于原申报） |
| selection 回归 | 9 文件/82 | `g7-selection-regression.log:140-141`=9/82，逐件 4+14+3+4+6+14+12+8+17=82（:6-138） | ✓ |
| 变异红证 | M1/M2 各红→还原空 | M1 :7 TS2307→:9 EXIT=2；restore :7-9/:16 三 EXIT=0。M2 :11 Failed to resolve→:35 EXIT=1；restore 首试 :1-2/:37 如实红（RESTORE=1/DIFF=1/REGREEN=1），重走 :38-40/:53-54 全 0 | ✓ |
| patch 行数 | 483 | 全文实读 484 行（尾行无换行 wc 口径差） | ✓ 可解释 |

---

### 门一 W1/N 条处置裁决（逐条）

| 条目 | 原判断 | 裁决 | 依据/证据行号 |
| --- | --- | --- | --- |
| **W1-a** 全扩展名补扫落档 | 收口前补一条全仓 grep 销项 | **实质闭合（附记录更正 P1-3）**：活代码/活脚本/tickets 三域 0 命中成立——我不依赖全扫还做了独立复核：旧径 7 名形态在 `src` 0、`tests` 0、`tickets` 0、`scripts`（非 audits）0（103 个命中文件全在 `scripts/audits`）。且我的检索含未跟踪文件，覆盖了 `git grep`（tracked 面）盲区；子目录缺口（`scripts/test-surface/extract.mjs`）已复核 0 命中 | `g7-fullscan2.log:2/4/6`；`g7-fullscan2.mjs:21-25`（git grep 口径+wc 管道伪零）；`.gitignore:13` |
| **W1-b** G8/G9/G10 票面预列 theme.test 字符串面 | 预批其形态（G10 至少 2 行） | **准，并强化**：G10 实为**恰 3 行**（:292 AnnotationMenu、:293 AnnotationEditor、:485 TabBar——门一漏了第三处）；G8/G9 theme.test **零命中**（义务改为方法条款）；config 面 G9=eslint:90-91、G8=check-quality:97 均已在票面；形式=「收口前对迁移目标作字符串面预扫+命中行号写入票面受锁面清单」 | `theme.test.ts:292/293/485`；`registry.ts:300/301/302`；`eslint.config.js:90-91`；`check-quality.mjs:97` |
| **N1** 简报 numstat 序列失真 | 成立（主数字不受影响） | **成立（记录级）**：可复现序列=4/4,1/1,2/2,9/9,0/0,3/3,0/0；简报"8/2/6/6/4/0/0"不可复现；收口说明以 recon/impl 全表为准 | `g7-recon.log:23-55`；`g7-impl-report.md:14` |
| **N2** wc 口径混排 | 成立 | **成立（记录级）**：recon §A 列 238/78/313/144/89/211/193 vs 实测 237/77/312/143/88/210/192 每件差 1（尾行无换行），import 行号逐一吻合证内容零漂 | `g7-recon.log:2-8`；`g7-impl-report.md:47` |
| **N3** M2 行号 26 vs 27 | 誊录级 | **成立（誊录级）**：改前 `} from …SelectionLayer` 在 :26、改后新增 factories 行使同块落 :27（hunk 头 `@@ -19,13 +19,13 @@`）——两号各自成立，口径未标 | `g7-gate1-diff.patch:260-269`；`g7-impl-mutation2-restore.log:15` |
| **N4** 仓总差 1 | 不确定 | **维持不能定位（包不足）**+收口一行定位令；补结构性解释（见 P2-2 与数字表） | `g7-impl-report.md:22`；`locks/manifest.json`（实测 356） |
| **N5** patch 呈现归一化 | 内容核验不受影响 | **成立（呈现级）**：5 件 RM 双侧均新径+index blob 哈希在（`:27-30` `954bbdcae0..3ea4369aa2`）；2 纯 R 件不在包内，其迁移由残留 0+typecheck 绿+M1/M2 旧径死亡交叉证明 | `g7-gate1-diff.patch:27-30` |
| **N6** 设计书 3 件 DEV | 既有漂移非 G7 | **成立（既有）**：evaluate 326/313、geometry 142/144、paint 85/89=G2/G3 中间票已记账 | `g7-recon.log:4-6` |
| **N7** M2 还原流程 | 流程注记 | **成立（流程级）**：首试红（RESTORE=1/DIFF=1）如实落档→解锁+逆向 sed 重走→RESTORE/DIFF/REGREEN/RELOCK 全 0，双记录保留合规；"受锁件变异先 unlock 再 cp"教训可入板面注记 | `g7-impl-mutation2-restore.log:1-2,37-40,46-54` |
| 自裁 6 条 | 门一全"准" | **同意**（6 条均准）；其中 #4（.log add -f）与 #1（theme 裁准）已并入 P1-2/P2-1 | `g7-gate1-report.md:45-52` |
| 门一 A1~A6 总评 | 零行为成立 | **同意（独立复算后）**：A2 完备性由 typecheck 背书+M1 红证咬合；A3 RoT 等价我实测更强（24 调用点全 2 参）；A5 数字对（hunk 计数更正）；A6 数字全对且 build 双点可包内自证 | 见数字表 |

**异构意见声明（与门一不相左处不改判，相左处已列）**：我未发现门一漏判的实现缺陷；唯一门一未识别而影响收口的实质项=**locks 356 已在档超越**（P1-1）与**归档面伪零**（P1-3）——两者均为证据/在档版本面，非实现面。

---

### 收口预批清单（可执行序）

1. **前置固化**：确认无未锁探针/未改受锁面（此后到终跑前不得新建或修改任何 `scripts/**/*.mjs|*.ps1`、`tests/**`、`docs/invariants.md`、manifest）。
2. **翻 done（registry）**：`tickets/registry.ts:298` G7 → `status: 'done'` + summary 追加 done 注（house style 日期+batch+关键数字）；file 保持 `…reader/interact/SelectionLayer.tsx`。已核翻 done 不红：F 系不入 ref-scan（`check-tickets.mjs:125` 仅 SR 系）、rule 3（interact/SelectionLayer.tsx 无 NotImplementedError）、rule 4b（无 data-ticket/STUB 残留）——均我实测通过。
3. **终跑 verify（翻 done 后，变量法 EXIT 物理在档——门二先例硬条件）**：落档 `g7-closeout-verify.log`，逐项断言：**locks=356**（≠356 立即停报）／tickets **open 13 / 共 206**／test-surface **187/1789/5411/skip15** ／**Test Files 170 / Tests 1744**／build **`index-D3egZtl2.js` 1,392.72kB+`index-BfpEygSE.css` 52.49kB 同名**／`EXIT=0` 行在档。
4. **staging 白名单（显式列文件，禁 `git add -A <目录>`；先 `git status` 核未跟踪面）**：
   - a. 实现面 20 件=迁移 7（旧径删除显式 add / `git add -u`+新径 `src/renderer/features/reader/interact/` 7 路径）+消费 2（`AnnotationEditor.tsx`、`ReaderPageView.tsx`）+测试 9（band-calibration/release-affinity/selection-evaluate/selection-geometry/selection-item-chain/selection-layer-fa12/selection-layer/selection-paint/theme.test.ts）+`tests/utils/factories.ts`+`tickets/registry.ts`（注：20 件已含 registry）
   - b. `locks/manifest.json`（与提交同版本，禁跨提交延迟重生成）
   - c. `docs/handoff/relay.md`（主控面：G7 勾选+本批记录+下波指针 G8；现 :129-130 仍 `[ ]`）
   - d. **探针 4 件必入**（manifest 引用，缺则 CI 红）：`scripts/audits/g7-recon.mjs`、`g7-recon2.mjs`、`g7-oneway-check.mjs`、`g7-fullscan2.mjs`
   - e. 证据件：`g7-gate1-brief.md`、`g7-gate1-report.md`、`g7-gate1-diff.patch`、`g7-impl-brief.md`、`g7-impl-report.md`、`g7-recon.log`、`g7-recon2.log`、`g7-fullscan.log`、`g7-fullscan2.log`、`g7-verify-baseline.log/.2/.3`、`g7-impl-verify.log`、`g7-build-hash.log`、`g7-oneway-check.log`、`g7-selection-regression.log`、`g7-impl-mutation{1,2}-{restore}.log`、本收口 verify log——**全部 .log 用 `git add -f`**（`.gitignore:13`）
   - f. 收口后 `git status` 未跟踪面=0（`*out*` 目录除外；G7 无 out 目录；无 G7 变异备份残留）
5. **单提交**：message 尾注 **`[locked-change][test-refactor]` 双尾注**（受锁面=tests/**+manifest+探针；测试面=C 段 9 行路径+factories RoT 单源）；**无 `[dep-change]`**（package.json/lockfile 零改）。
6. **提交后自检**：locks:apply 已与提交同步；`git diff --stat` 范围与白名单一致（含第 4 步 a~e）。

**可在收口说明直接采用的更正语句（P1-3/P2 用）**：「活代码/活脚本/tickets 三域旧径残留 0（独立复核含未跟踪面亦 0）；docs 面命中为历史提名（tracked 下界 214／全量 216；其中 `docs/invariants.md:73,78` 两处活登记册旧径已由 relay:138-139 预列，G11 出"保留 vs 随迁刷新"口径裁决）；归档面命中为历史档（.md 210 行／全扩展 965 处），按口径零动作——原 fullscan2 归档域计数行系 `wc -l` 管道结构缺陷，不作零命中证据。」

MODEL-SELF: model-field:8ad55776-2296-4f1a-bc46-05755c8f1300/deepseek-flash$max
LEDGER-CLAIM: role=ops-adjudicator executor=model-field:8ad55776-2296-4f1a-bc46-05755c8f1300/deepseek-flash$max units=1 outcome=done
