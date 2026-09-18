# F-GEOM-01-G8 门二审包（实证终审）

> 岗位：门二 ops-adjudicator（deepseek-flash $max 绑定）。你有仓读权限（Read/Glob/Grep，无 Bash/git）——对下述证据件与工作树现状做实证核查+独立复算，逐条终裁。
> 票面：F-GEOM-01-G8 目录化 M5=panels/ 8 件零行为纯迁移 [locked-change][test-refactor]（工作树未提交态——本审即提交前门）。
> 实现者=ops-executor（GLM5.3flash $max）；门一=**deepseek 审计兜底位外发承载（PASS_WITH_WARNINGS B0/W2/N5）**——kimi 双源额度耗尽降级（k1 用户周额度封顶禁派+k2 5h 窗口 403，证据 scripts/audits/g8-gate1-quota403.log），**同源欠账已登记**（门一/门二同族 deepseek——对实现者仍异构）。

## ① 改写面申报（审计基准）

A 深修 21 行（OutlineAside 3/OutlinePanel 1/OutlineThumb 1/ReaderNotesPanel 5/AiNotesSection 4/AiNoteGroupList 1/AiNotesStatus 5/FragmentNotesList 1）+B src 入边 1（ReaderPageView:35）+C tests 5 行/4 件+D 跨特性 0+E config 1 行（check-quality.mjs:97）+F registry 6 对（status 零触碰）+G 字符串面 0 动作（readFileSync 形态全仓 0 命中）。
域内互引 7 边零改写；§3.1 域边=panels→anchors 4+panels→state 10；跨域出边 7（notes 1+api 2+shared 4——门一 W1 命名补全）。

## ② 实现者证据件清单（scripts/audits/ 下，逐一实证）

- g8-verify-baseline.log：G8_BASELINE_VERIFY_EXIT=0（206 票 open 13/locks 358/170 文件 1744 用例/指纹门 187·1789·5411·skip15）
- g8-impl-verify.log：G8_IMPL_VERIFY_EXIT=0（同值零漂移/locks 359/build 产物同名同尺寸）
- g8-impl-mutation1.log+g8-impl-mutation1-restore.log：M1 TS2307 EXIT=2→还原 EXIT=0→diff 空→复绿
- g8-impl-mutation2.log+g8-impl-mutation2-restore.log：M2 模块解析红 EXIT=1→还原→复锁→复绿 4/4→locks:check EXIT=0
- g8-build-hash.log：index-D3egZtl2.js sha256 9c3b8b84…3f2a（1,402,437B）+index-BfpEygSE.css dcace2e7…8a97d5（59,923B）与基线恒等
- g8-s31-check.mjs+g8-s31-check.log：三面核验（出边/反向/残留）S31_FINAL_PASS=true
- g8-panels-regression.log：4 文件/41 用例绿 G8_PANELS_REGRESSION_EXIT=0
- g8-impl-midprobe.log：C 面待改时点 EXIT=2 恰 5 错全 tests 面
- g8-n1-vimock.log：vi.mock 盲区销项（panels/ 形态全 tests 0 命中 EXIT=1；3 件 0 vi.mock）
- g8-recon.log+g8-fullscan2.log：主控派发前侦察（入边 13 行全表+字符串面 259 行分域）
- g8-impl-report.md：实现者报告全文（自裁 6 条）

## ③ 门一发现与主控处置（你逐条终裁处置是否充分）

- **W1**「出边表名不副实+反向域不含 notes/api/shared」：主控处置=入边全表（g8-recon.log 13 行）本就全仓覆盖，notes/api/shared 域零入边即反向边 0 的闭合证据；表述面（「全表」未限定「域边」）誊录更正入批次日志。**请独立复核 g8-recon.log 入边表并裁此处置。**
- **W2**「raw 证据未入隔离包」：转交本审实证清单（②全件）。**请实证后裁证据链是否闭合。**
- **N1** vi.mock 盲区：g8-n1-vimock.log 销项。**请复核该 log。**
- **N4** check-quality 他处旧径：g8-fullscan2.log 活脚本域仅 :97 命中。**请复核。**
- **N2** wc -l 八件各 -1（设计书无尾换行口径差）→G11 对账债；**N3** 探针入锁 358→359（G11 清理注记）；**N5** e2e 不跑（义务归 G11）。三条主控拟照单接受，你终裁。

## ④ 你的实证清单（逐项做，禁采信转述）

1. **工作树现状核查**：Glob `src/renderer/features/reader/*.tsx` ——8 迁移件必须已不在根（OutlineAside/OutlinePanel/OutlineThumb/ReaderNotesPanel/AiNotesSection/AiNoteGroupList/AiNotesStatus/FragmentNotesList）；Glob `src/renderer/features/reader/panels/*`——恰 8 件。读 panels/ReaderNotesPanel.tsx 与 panels/AiNotesStatus.tsx 的 import 区核对深修 5+5 行形态（../../../api/client 等）。
2. **A 段计数复算**：Grep 8 件 panels 文件的 `from '\.\./` 行数（应=21）+域内互引 `from '\./` 行数（应=7——OutlinePanel 1/AiNotesSection 2/OutlineAside 2/ReaderNotesPanel 2）。
3. **B/C/E/F 复算**：读 src/renderer/features/reader/ReaderPageView.tsx:35 附近、4 测试件 import 行、scripts/check-quality.mjs:94-100、tickets/registry.ts:299（status 须 'open'——翻 done 归主控）。
4. **残留/反向独立复算**：Grep 全 src+tests+scripts（除 scripts/audits）+tickets：8 名旧径形态（`reader/OutlineAside'` 等 8 名且不含 panels/）须 0；notes/api/shared 域（src/renderer/features/notes、src/renderer/api、src/renderer/shared）import panels 须 0。
5. **证据件 EXIT 标记物理在档**：②清单各 log 末尾变量法标记逐一确认（G8_IMPL_VERIFY_EXIT=0 等）。
6. **s31 探针逻辑审计**：读 g8-s31-check.mjs 源码，裁其三面覆盖是否有假阴性面（形态遗漏）。
7. **数字对账**：41 用例（panels 回归）/14 域边/7 跨域边/34 改写行——与你实测对上。

## ⑤ 输出格式

P0（阻断）/P1（条件）/P2（注记）/N（注记外）分级+逐条证据（引用文件:行号）；对 ③ 六条处置逐条终裁（充分/不足）；结尾一行 `VERDICT: GO | GO_WITH_CONDITIONS | NO-GO`（有 P1 → GO_WITH_CONDITIONS 并列收口条件）。
