# F-GEOM-01-G5 门二终审报告（ops-adjudicator · deepseek-flash $max）

**verdict: GO_WITH_CONDITIONS**——实现面零 P0/零 P1 缺陷（回炉=0）；两条 P1 均为收口侧放行条件，兑现后无需复审。

> 隔离声明：本裁决仅基于审包内材料 + 仓库只读核验（Read/Glob/Grep，未跑任何命令、未派子代理、未改任何文件）。工作区绝对根：`E:\class\智慧水务\Synapse_remake`（下文路径除特别注明外均相对该根；审包=scripts/audits/g5-*）。包内不可裁决处已显式标注。

---

## 一、逐条裁决表

| # | 原判断（审包主张） | 裁决 | 依据 | 证据行号 |
| --- | --- | --- | --- | --- |
| 1 | 零行为纯迁移：除路径/注释外零语义变化 | **成立** | 四件全文抽读 + diff patch 除申报 hunk 外零 hunk；100%/100% rename 件正文与迁移面零关联 | g5-gate1-diff.patch:41-83；time/ 四件全文 |
| 2 | 12 行改写恰为申报面（深度 5+消费 3+注释 1+tests 3） | **成立** | 终态工作树逐行复核：setup:13-16、reading-time:61、main:4、ReaderPage:55-56、format:4、tests×3，逐条与申报文本一致，无第 13 个行实例 | 同上 + g5-impl-report.md:36-54 |
| 3 | 门一后 N1 增量行（format:4 同行二次改写） | **成立（处置充分）** | 终态行「reader/time/reading-time 双 feature 消费；reader/time/reading-time.ts re-export」半句旧名清零，零行为；同行二次改写不新增 diff 行实例 | reading-time-format.ts:4；门一 N1=g5-gate1-report.md:38 |
| 4 | 4 件 829 行 rename（100/100/95/99） | **成立** | 829=303+139+300+87 独立复算通过（见§二-1）；相似度来自带 -M 检测的 diff patch rename hunk | g5-gate1-diff.patch:42/:46/:50/:72；附件清单 g5-impl-brief.md:23-26 |
| 5 | 受锁 tests 3 行/2 文件，断言零触 | **成立** | 两测试文件 import 面逐行核对；diff hunk 恰 3 行；用例数 170/1744 双跑恒定 | tests/unit/renderer/reading-time.test.ts:9；reading-time-outbox.test.ts:10/:15；diff.patch:113-131 |
| 6 | locks 345 恒定 + manifest 变更=generatedAt+两 tests sha | **成立（值级）** | 345 条独立数回；6 条 reading-time 相关受锁项中仅两件 unit renderer 测试 sha 更新，与 diff 一致；byte 级 sha 复算=只读工具面外（§三 P2-1 兜底） | locks/manifest.json:2/:633/:649/:713/:717/:1073/:1077；g5-impl-raw.log:87 |
| 7 | 域内同层 4 处零改写（`./` 同层保持） | **成立** | 亲读：setup 内部 3 处 + store→outbox 1 处均为 `./`，同迁后解析不变 | reading-time-setup.ts:17-30；reading-time-outbox-store.ts:9 |
| 8 | §3.1 单向：state/ 零 import reading-time；time→state 唯一边=setup:15/:16 | **成立** | 独立复跑 grep：state/ 域 reading-time/ReadingTime 命中 **0**；time/ 域 `state/` 引用恰 :15/:16 两行；零新增域边 | 我的独立 grep（本审）；reading-time-setup.ts:15-16 |
| 9 | 旧径残留 src+tests 命中 0；e2e 两 spec 零触碰 | **成立** | 独立 grep `features/reader/reading-time`：src=0、tests=0；旧径四文件 Glob 不存在；e2e 命中仅注释/字符串 | 我的独立 grep；src/renderer/features/reader/reading-time*（无此文件） |
| 10 | 基线数字 206 票/open 16/locks 345/170 文件 1744 用例/指纹 187/1789/5411 | **成立** | raw.log 逐项在档；open 16 与 registry 计数一致 | g5-impl-raw.log:27/:67-68/:77/:87/:3918-3919 |
| 11 | 迁移后七关卡独立取证全绿（tickets=设计内红） | **成立（链证）** | verify.log：quality✓+指纹门✓ 后止于 tickets 两行旧径（即收口面）；partial.log：lint/typecheck/test/build 串跑 EXIT=0；全链终证=收口条件 P1-1 | g5-impl-verify.log:18/:27/:67-68/:74-80；g5-impl-partial.log:4-18/:3830-3831/:3838-3869 |
| 12 | 构建哈希三方恒等（跨 G4 master→本批基线→迁移后） | **成立** | 三 log 同名同尺寸：index-D3egZtl2.js 1,392.72 kB + index-BfpEygSE.css 52.49 kB；基线 build 确在迁移前（整份 raw 为单次基线 verify run，tickets:78 pass） | g4-verify-master.log:3875-3876；g5-impl-raw.log:3954-3957；g5-impl-partial.log:3864-3867 |
| 13 | 变异红证 M1/M2 闭环（红 EXIT→还原 identical→复绿） | **成立** | M1：TS2307 EXIT=2→diff empty=0→typecheck EXIT=0；M2：Failed to load url EXIT=1→diff identical=0→17/17 EXIT=0；四标记物理在档 | g5-impl-mutation1.log:7-10；g5-impl-mutation1-restore.log:4-7；g5-impl-mutation2.log:10-11/:21-23；g5-impl-mutation2-restore.log:6-9；g5-impl-raw.log:3962-3965 |
| 14 | 自裁① open 17→16 | **准** | 基线 raw 实测 16；registry `status: 'open'` 独立计数=16 | g5-impl-raw.log:77；我的独立计数 |
| 15 | 自裁② verify.log 伪 EXIT=0 | **准** | 伪值行+ASCII 勘误注在档（追加式不改历史行）；真码 1 在 raw；基线同法疑虑被 && 链结构消解 | g5-impl-verify.log:81-83；g5-impl-raw.log:3960；结构论证见 N1 |
| 16 | 自裁③ M2 额外 unlock→apply 轮 | **准（附边证）** | 受锁件写权限必需（G4 同型）；manifest generatedAt=14:20:07Z 落于 M2 还原窗口之后，与「还原后复锁」自洽；独立 raw 缺（P2-1） | locks/manifest.json:2；g5-impl-mutation2-restore.log:10 时间戳 |
| 17 | 自裁④ M1 复绿=typecheck 单关 | **准** | 还原 identity+单关复绿足够；门一 N4 已降级口径入档；全链兜底=收口终跑 | g5-impl-mutation1.log:9-10；g5-gate1-report.md:41 |
| 18 | 门一 W1/W2/W3 收口条件充分性 | **充分（须补强两点）** | W1（终跑真 EXIT=0 变量法）=必要充分；W2 白名单须显式纳入 N1 终态行+12 件证据；W3 由 W1 覆盖，基线结构已自证 | g5-gate1-report.md:32-36；补强见§三 P1-1/P1-2 |
| 19 | 收口清单（registry 2 行+终跑+单提交+health-scan+账本+板 20→21） | **形态正确，时序两修正** | registry 受影响行恰 2（machine+regex 双证）；板现 20/35、G5 行 `- [ ]`；提交面=审 diff+N1 终态行+registry+12 件证据+板+账本；见 P1-2 | tickets/registry.ts:247/:296；g5-impl-verify.log:79-80；docs/handoff/relay.md:20-21/:125 |
| 20 | 设计书 §3.2 time/ 行数 304/140/301/88 | **不成立（文档口径偏差，非本票缺陷）** | 独立实测 303/139/300/87（每件 +1）；本票简报/报告用实测值 829，无实质影响；G11 收官应对账 | design/2026-09-18_…….md:223-224 vs 我的独立计数 |

---

## 二、独立复算记录

### 2.1 关键数字复算表（全部从原始证据重推，不采信原算术）

| # | 关键数字 | 独立复算方法与结果 | 判定 |
| --- | --- | --- | --- |
| 1 | 829 = 303+139+300+87 | 对 time/ 四件逐文件计数（`^`与`$`双模式一致）：303/139/300/87，合计 829；算术 303+139+300+87=829 ✓ | 成立 |
| 2 | locks 345 | manifest `"path":` 条目数=345；基线 locks:check=345 | 成立 |
| 3 | manifest 两 sha 更新面 | reading-time 相关条目=6（2 e2e+2 db+2 unit renderer）；仅两 unit renderer sha 更新；当前 manifest 值与门一 diff 新值逐字一致 | 成立（值级） |
| 4 | tests 改动行数=3 | 两文件源码核对+diff hunk：reading-time.test:9、outbox.test:10/:15 恰 3 行 | 成立 |
| 5 | 12 行申报面 | 12 个行实例逐条落位（见§一-2），无多无少（终态 diff 仍 12；N1 为同行二次改写） | 成立 |
| 6 | 指纹门 187/1789/5411 通过态 | raw:27 数字 + raw:68「C_after ⊇ C_before（指纹门绿）」；verify:27/:68 同值（零漂移）；skipSites 15/15 | 成立 |
| 7 | tests 170 文件/1744 用例 | raw:3918-3919 与 partial:3830-3831 双跑同值；partial 内 `✓ tests/` 行数独立清点=170 | 成立 |
| 8 | 206 票/open 16 | raw:77 与 verify:77 同值；registry 条目独立计数=206、`status:'open'`=16 | 成立 |
| 9 | registry 受影响行恰 2 | regex 全枚举 `file: '*reading-time`={247,296}（无漏网）；check-tickets 红恰两行（79-80） | 成立 |
| 10 | 构建三方恒等 | 三 log 同名+同尺寸（js 1,392.72 kB/css 52.49 kB）；vite 内容哈希命名=同内容数学旁证 | 成立 |
| 11 | 变异 EXIT 链 2/0/0 与 1/0/0 | 四 log+raw 标记逐条在档；restore 跑输出物理干净（typecheck 零错误/17 17 passed） | 成立（diff 自证形态见 P2-3） |
| 12 | §3.1 单向 | state/ 域独立 grep=0 命中；time/ 内 state 引用=2 行；src/tests 旧径残留=0 | 成立 |
| 13 | 板 20/35→21 预核 | relay.md `- [x]`=20、`- [ ]`=15、头部 checked_done=20；G5 行 :125 待勾 | 成立 |
| 14 | 设计书 time 行数 | 实测 303/139/300/87 ≠ 设计书 304/140/301/88（每件 +1） | 不成立（文档偏差，见 P2-2） |

### 2.2 无独立佐证/不可复算清单（点名）

- (a)「迁移后 locks:check EXIT=0」独立跑：报告表有申报，**审包无该次物理 log**（基线 locks 在 raw:87，非迁移后）——由收口终跑 verify 的 locks 段兜底（P2-1）。
- (b)「unlock→generate+apply 输出（已解锁/已锁定 345）」：仅报告转述，无 raw 档；形态与 manifest 终态自洽。
- (c) manifest 两 sha 的 byte 级一致：无 shell 不可复算，仅能核值级；最终由收口 locks:check 机检。
- (d)「终态 345 件全只读」权限态：只读工具面不可验。
- (e) 报告「旧路径残留 grep」行括注表述含混（「命中 0（命中项均系……）」）——本审独立复跑得 0 命中，结论不受影响（N4 类）。
- (f) 门一 W3 对基线 log 取证法的怀疑：raw 为完整链日志（quality→…→build 全部执行、tickets:78 pass、build 段 3928-3958 在档），在 `&&` 链语义下抵达 build 即证前序全 0——**结构自证，不依赖末行 echo**；终跑变量法仍为放行条件（P1-1）。

---

## 三、回炉建议与优先级

**回炉=0**（无 P0、无实现面 P1；实现面已达「零行为纯迁移」终裁标准）。以下为放行条件与建议：

- **P1-1（放行硬条件，最高优先）**：收口终跑 `npm run verify` 全链真 EXIT=0，以 `$ec=$?` 变量法物理落档（含 locks:check 段）。预期口径：206 票/open 15（G5 翻 done）、locks 345、test 170/1744、指纹门 cur 187/1789/5411、build 绿。非零即不得提交。
- **P1-2（提交面白名单与冻结序，高优先）**：建议序=**全量写入（registry 2 行+P7X-02/G5 file→time/ 前缀+G5 翻 done；板写回 checked_done 20→21+batch 17 日志+心跳；账本补记；health-scan RED=0）→ 终跑 verify → 单提交**，封「已验证态≠提交态」缝。白名单=审 diff（4 rename+5 src 行面+2 tests）+N1 终态行+registry 2 行+locks/manifest 3 行+12 件 g5 证据（7 .log 须 `add -f`，5 件 md/.patch 常规）+板+账本；账本在 `.gitignore:19` 的 `.zcode/` 覆盖区——若未跟踪须 `-f`，收口自查 `git status --porcelain` 零残留。若沿用「先提交后补记」旧序，则收口单须明示板/账本外置并修正 W2 口径（二者只能取一）。
- **P2-1（取证补强，低）**：迁移后 locks:check 无独立 raw——无需补跑，收口单点名引用终跑 verify 的 locks 段行号即可（如实标注原申报无物理档）。
- **P2-2（文档对账，低）**：设计书 §3.2 time/ 行数每件 +1（304/140/301/88 vs 实测 303/139/300/87）——G11 收官对账时勘误或注明 wc 口径；G6+ 各步计数一律实测，勿引设计书该列。
- **P2-3（后续票取证形态，低）**：变异还原的「diff identical」目前为 echo 自证（无 diff 命令回显），restore log 亦无自带 EXIT 行——建议后续迁移票在 restore log 尾物理落变量法 EXIT+原命令回显，减少复审争议。
- **N 注记（无行动项）**：N1 基线 EXIT 疑虑已结构消解（§二-2f）；N2 N1 注释增量文本核验充分、零行为；N3 构建三方恒等与基线时点复核属实；N4 指纹门/tests 计数零漂移双跑一致；N5 M2 复锁时间线旁证（manifest generatedAt 对窗）；N6 registry 全域随迁义务本步恰 2 行（无漏改，后续步 G6+ 另行枚举）。

FINDINGS: P0=0 P1=2 P2=3 N=6 VERDICT=GO_WITH_CONDITIONS
