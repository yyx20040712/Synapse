# F-DOCGOV-01 门二终审报告（主控逐字归档——岗无写通道）

> 归档声明：以下为 ops-adjudicator（deepseek-flash $max）终审输出原文逐字归档
> （batch 27，2026-09-19）。主控复核注记见文末。

---

# F-DOCGOV-01 门二终审裁决（batch 27，ops-adjudicator / deepseek-flash $max）

工作区根 `E:\class\智慧水务\Synapse_remake\`（下表行号均相对该根；审包=`scripts/audits/b27-gate2-brief.md` 已通读）。独立复算全部回原始件（实码/日志/git reflog），未采信任何转述；只读操作，零文件修改。

## ① 逐条裁决表

| # | 原判断（门一"不确定"/票面主张） | 裁决 | 依据（证据行号） |
|---|---|---|---|
| 1 | INV-02 三处新行号+旧值下沉 | **成立** | `src/main/services/settings.service.ts:66/:79`（catch 实位）、`src/renderer/features/reader/state/reader.store.ts:319`、`src/main/services/import_/import.service.ts:182`（collectPdfs 尽力而为 catch）；旧值原样见 patch:939；下沉史实=`src/main/ipc/settings.ts:1-3` 头注「业务已下沉 settings.service.ts」 |
| 2 | notes.store 模块级结构=6 | **成立**（口径注记 N-1） | `notes.store.ts:79/82/85/90/94/99`=五原件+discardGen；raw `^const` 计数=8（含 `:74 SAVE_DEBOUNCE_MS`/`:76 EMPTY_DRAFT` 两常量）——"结构"计数正确，grep 方法述语不精确 |
| 3 | INV-70 单例清单（zustand 11+2 模块态） | **成立** | zustand `create<` 全域恰 11（11 文件逐点命中）；`src/renderer/shared/ui/toast-store.ts:28/29/33`；`src/renderer/features/reader/state/annotation-undo.ts:83/142`；单实例锁 `src/main/index.ts:10` |
| 4 | migrations=9 件 | **成立** | `src/main/db/migrations/` 001~009 九件实测 |
| 5 | ADR-0020 落地日 2026-08-29 | **成立** | `docs/adr/0020-...:3`；`.git/logs/HEAD:311`（5ae8620484 ts=1788004247=2026-08-29+0800，含真机迁移/二启幂等句）；`tickets/registry.ts:228` R2-SH1 done |
| 6 | batch 26 先例（feef686 提交信息内句） | **部分成立（哈希错位，P2-2）** | 该句实锚=后续提交 e93076da（`.git/logs/HEAD:574`）+`docs/handoff/relay.md:177`；feef686=立案提交（reflog:573）。实质先例成立 |
| 7 | INV-07 「2026-09-03 扩列+含 AGENTS 安全禁令」 | **成立** | `docs/invariants.md:21` 声明处列原文 |
| 8 | 强制①受锁单链 | **成立（终态面）**；过程面「包不足以裁决」 | patch 恰 3 改+1 新（:939-940/:948-949/:957-958/:963）；`b27-docgov01-verify-final.log:48` locks 379；unlock→改→apply 命令面未入包（impl-report §5 自述） |
| 9 | 强制②ROADMAP 方案 a | **成立**（引用行号 stale→P2-1） | 8 锚段 byte 级：`docs/ROADMAP.md:33/39/45/52/59/67/75/81`（patch 全上下文行）；regex 实位=`check-tickets.mjs:247`（非 233-234）；`docs/ROADMAP.md`+`check-tickets.mjs` 取数源零触碰 |
| 10 | 文档抽查 DEVELOPMENT §6 | **成立** | `docs/DEVELOPMENT.md:73-84` vs `workspace-layout.ts:59-77`、`workspace.fs.ts:142-147`（needsLegacyMigration 语义）、`settings.service.ts:50`（三字段）、`constants.ts:10/13/16` |
| 11 | 文档抽查 ADR-0008 六结构论证 | **成立** | `docs/adr/0008-...:44-56` vs 实码；「结构数≠维度数」+INV-50 代际守卫（`invariants.md:65`）对位 |
| 12 | 文档抽查 ADR-0015 七通道 | **成立** | `docs/adr/0015-...:85-94` vs `src/shared/ipc/api-surface.ts:73-80`（requestAiRead/aiStatus/observe/importAll/listByPaper/zcodeDetect/zcodeInstall 逐名核对） |
| 13 | 文档抽查 ADR-0014 v1.2 DDL 注记 | **基本成立**（措辞勘正 P2-3） | `docs/adr/0014-...:95-104`；「UNIQUE 升级为」与 `006_lineage_ref_edges.sql:9-10`「004 既有…不动」相左（004:30 实载 UNIQUE）——语义收束非 DDL 变更 |
| 14 | 文档抽查 §8.2/§8.3 | **成立** | `docs/architecture.md:281-300` vs `workspace-layout.ts:10-11`、`services/index.ts:90-92/123-130`、`src/main/ipc/ai_sensor.ts:16-23`（七 handler 3+2+2） |
| 15 | 自裁 7 条 | **全部成立** | -1 `AGENTS.md:73`；-2 `architecture.md:27/262-267`（信息零损失=AGENTS 环境事实单源）；-3 `README.md:7`；-4 同 #1；-5 ADR-0020:3+43 行（见②）；-6 `DEV-SETUP.md:16-18`；-7 `invariants.md:363`（INV-70 状态「部分」） |
| 16 | 门一 N4 追认程序完备性 | **完备**（结构性注记 N-2） | 追认落档=`b27-gate1-report.md:65-70`；执行者=主控同体致追认非独立层，补偿=k2+本岗异构门审 |
| 17 | W1 处置（计数订正复核） | **充分，数字全中** | 13 diff 头 grep=13；Read 口径核实四组：patch 981=980+1、ADR-0020 44=43+1、ROADMAP 115=114+1、architecture 301=300+1（Read 尾部空行换算）；订正值 980/43/114/300 全对 |
| 18 | W2 处置（flake-ledger 补证） | **充分** | `b27-flake-ledger-verify.log` 8 案与 `docs/audits/flake-ledger.json:4-77` 逐字段吻合（计数 7/2/2/2/1/1/1/5）；W4 八线名单源=reflog:532 |
| 19 | 收口 staging 面 | **条件成立（有漏项→P1-1）** | 13 实质=patch 13 头；`locks/manifest.json:89` 引用 b27-claim.mjs（推定 untracked，上批终态 locks=377 vs 本批基线 378 的 +1）；"新 2"口径不含它 |
| 20 | 尾注裁定 | **成立** | `manifest.json:9` invariants.md 受锁；`ci.yml:140` TR_RE 无 `src/**`，本票 diff 含 `src/...ai-notes-import.service.ts` → 挂 TR 必红；[locked-change] 单尾注正确 |
| 21 | 翻票探针口径 | **成立且必要** | `registry.ts:317` 行首 `{ id: 'F-DOCGOV-01'` 形态；`:311/:313` 他票 summary 存在文字提名噪声（b25 谓词盲区实证） |

## ② 独立复算记录

- 机器链：BASELINE_EXIT=0（指纹 183·1768·5368·skip14@baseline:27、open 4@38、locks 378@48、产物 index-DW6Z3WXp.js 1,388.14 kB@3910）→FINAL_EXIT=0（@27/38/48/3814，locks 379，同名同尺寸）——双档逐字比对零漂移。
- M1：8 违规恰 SR2-LG-01~08、EXIT=1（m1-mutation-red.log:3-10/11）→cp 还原 EXIT=0（restore:3），无 b27 backup 残留（scripts/audits 全域 glob 核）。M2：v1 非全局正则 TypeError EXIT=1（fail-safe 非假绿）→v2 实测提取无硬编码（p7-anchors.mjs:9/22），锚 8⊇src scope 7（A/B/C/E/F/G/H，我侧 grep 唯一集复核一致）。
- check-tickets 单跑档=通过态（roadmap-retired-tickets-check.log:1-2）；**无显式 EXIT 标记**（P2-4）。
- 不采信清单（回原始件重推）：旧值史实（仅 patch 文件面可证）、flake-ledger、日期、计数、通道/结构数——均如上复核。**包不足以裁决**两项：受锁单链操作序列件；b27-claim.mjs 的 tracking 态（.git/index 二进制不可读，需收口 `git status` 实测）。
- 无 P0 级失实；未见静默删面；verify 链八段（package.json:30）与 model-names 未串链（ci.yml:14 六道关卡）均如实。

## ③ 回炉建议与优先级

- **回炉=0**（交付本体与机器证据链无需返工；条件项均属收口执行面）。
- **P0=0**。
- **P1（收口硬条件）**：P1-1 staging 显式列件须含 b27-claim.mjs（locks 引用，漏=CI locks 必红）+全部 `scripts/audits/b27-*` 17 件（.log 系 add -f）；收口前 `git status` 实测。P1-2 尾注恰 `[locked-change]` 单尾注，禁 [test-refactor]/[dep-change]。P1-3 翻票锚 `{ id: 'F-DOCGOV-01'` 行首；若收口新建 flip 探针 .mjs 须即时 locks:generate+apply 并以终跑 verify 锁数对账（G4/G7 两现教训）。
- **P2（注记勘正）**：P2-1 check-tickets 引用行号 233-234→实 247（brief/gate1/probe 注释三处）；P2-2 batch 26 先例哈希 feef686→e93076da；P2-3 ADR-0014/architecture §6「UNIQUE 升级为」措辞（006 实文=004 既有不动）；P2-4 单跑档补 EXIT 标记。
- **N（登记）**：N-1 notes.store「6 结构」复算口径（raw grep=8）；N-2 主控同体追认（结构性缺位已如实申报）；N-3 Read 显示值=wc+1（尾部换行）口径已成四件实证，建议机读档统一注明；N-4 e2e 不跑裁定成立（src 恰 1 注束行+bundle 恒等双证）；N-5 dispatch-fail 时间戳脱敏留痕。
- **终判：GO_WITH_CONDITIONS**（P0=0 / P1=3 / P2=4 / N=5，回炉 0；条件全数为收口预批执行面，交付本体全过）。

MODEL-SELF: model-field:8ad55776-2296-4f1a-bc46-05755c8f1300/deepseek-flash$max
LEDGER-CLAIM: role=ops-adjudicator executor=model-field:8ad55776-2296-4f1a-bc46-05755c8f1300/deepseek-flash$max units=1 outcome=done

---

## 主控复核段（2026-09-19 收口时点）

1. P2-3 已兑现：ADR-0014 v1.2 注记+architecture §6+§8.1 三处「UNIQUE=004 既有
   （006 仅加 kind 列）」措辞订正（本归档前落刀——交付本体勘正非纯注记）。
2. P2-4 已兑现：b27-roadmap-retired-tickets-check.log 补 EXIT=0 标记（补记注明）。
3. P2-1/P2-2 落档口径：活档（impl-report §2/探针注释）随收口订正；已派发简报
   （impl-brief/gate1-brief/gate2-brief）不回改——勘正记录=批次日志 P2 段
   （feef686 错位系主控 gate2 简报侧笔误，正确锚=e93076da——门二 #6 裁定）。
4. P1-1/P1-2/P1-3 收口执行面：staging 显式列件含 b27-claim.mjs+全部 b27-* 件
   （.log add -f）+git status 实测；尾注恰 [locked-change]；翻票探针锚行首
   定义形态+即写即锁+closeout verify 锁数对账——全部按序兑现（见批次日志）。
