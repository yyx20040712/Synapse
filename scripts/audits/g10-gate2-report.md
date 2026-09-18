# F-GEOM-01-G10 门二实证终审报告（ops-adjudicator·异构裁决位）——主控逐字归档件

工作区根：`E:\class\智慧水务\Synapse_remake`；全部证据件物理在档于
`scripts/audits/g10-*`（含 GBK 日志逐件以 `grep -a` 亲读；仓内源码/注册表/
清单以 Read/Glob/Grep 独立复扫）。本岗只读工具面，无亲跑；一切数字为独立复算。

## 总评

**裁定：GO_WITH_CONDITIONS。** 迁移实体面零 P0：13 对纯 rename、61 行 diff
全部为路径前缀形态、哈希恒等、Test 1744/170 双恒等、44 行计数闭合、收官四件
全 0——零行为结论成立。收口序 H 预批通过，但须满足三硬条件（e2e 默认门 43 绿
+ 终跑 verify EXIT=0 + locks 一致）缺一即 NO-GO。P1×1（tickets 红行数转述
失实：物理 16 行非 8 行），随收口勘正并须以终验清零为据。

## ① 逐条裁决表

| # | 原判断（出处） | 裁决 | 依据与证据行号 |
|---|---|---|---|
| 1 | 13 件 git mv 纯 rename（R 标记 13 对；ReaderSearchBox 纯 R） | **成立** | gitmv-status.log:5-17 十三对 R；:22-23 R-pairs=13/EXIT=0；final-status.log:79-93 staged 13 files 0/0；recon.log:1-58 出边含 RSB:31 同根 `./reader-search.store`（零改写合理） |
| 2 | A 段 33 行=5+1+11+2+7+7，行号零漂移 | **成立（逐行物理复核）** | anchors5=AE:15/AM:41/RP:49/RT:42/rss:41；interact1=AE:16；state11=PCV:24/RP:52,53/SHL:40/TB:41-43/rsh:18,19/URS:32,33；time2=RP:55,56；shared7=RP:48,59/RS:46-48/rss:42/URS:31；内化7=PCV:25-27/RP:50,54,58/reader-search:32——全部与我亲读的行内容一致 |
| 3 | B 段 src 消费 1 行 App.tsx:7 | **成立** | App.tsx:7=`'../features/reader/view/ReaderPage'`（物理亲读）；:12 state/tab-dirty 属合法子域未动；midprobe 18 错全 tests 面反向佐证 src 消费面仅此 1 处 |
| 4 | C 段 6 行中间态边闭合 | **成立** | AP:35,36 / PC:32 / PO:50 / RPV:37,40 现均为 `./X`（物理亲读）；recon.log:80-89 基线 6 处 `../X` 一一对应 |
| 5 | D 段 21 行/14 件（18 import+theme 3 串） | **成立** | rewrite-d.log:17-225 十四轮四元组 exp=pre/postold=0/postnew=exp/numstat=exp+exp 全 OK，:226 D_SECTION_FAIL=0；theme.test.ts:292,293,485 现带 `view/` 前缀（亲读）；e2e 零触碰 |
| 6 | E 段 config 零动作 | **成立** | recon.log:155-159 eslint :89-92 四路径已全在子域（state/view）；electron.vite.config.ts:61 仅 @shared 别名；tsconfig.web.json:19-20 仅 @shared 映射；vitest.config.ts 仅 glob 面——均位置无关，零改正确 |
| 7 | 44=33+11 相对 import 全量闭合 | **成立** | w1w2-closure.log:2-14 逐件 2+1+4+12+1+3+1+3+3+4+1+4+5=44（我复加=44）；:17-27 第 11 行物理定位 ReaderSearchBox:31（门一 W1 盲区根因=100% rename 无 hunk）；11 行逐行对应我亲读 |
| 8 | 13 件 wc Σ1776（设计书 1789=+13 债） | **成立（本岗等价复算=1776）** | 我逐件读末行号：AE148/AM81/PCV72/RP163/RSB125/RS123/RT232/SHL159/TB163/rss202/reader-search162/rsh42/URS104，Σ=**1776** 恰合；+13 尾换行语义无 wc/尾字节面可落定，维持包内 G11 对账债 |
| 9 | 出边增量 {anchors+5,state+11,interact+1,time+2,intra+24,up+7} 对 G9 终态 | **成立（我独立重扫复算）** | G9 终态 g9-one-way.log:3={14,18,1,0,intra26,up4,readerRoot6}；我现扫 view 出边=anchors19/state29/panels1/interact2/time2/intra50(49 条 `from './'`+TextLayer:35 副作用 css)/up11——六项增量与 A/C 段逐类数学闭合 |
| 10 | 13 件 log EXIT 变量法标记真伪 | **成立（逐一亲读）** | baseline:3890=0；midprobe:25=2；impl-verify:13/63/89/98/106/114/3906/3942=（0/0/1/0/0/0/0/0）；M1:11=2+restore:1/9/11=0；M2:9/52=0/1+restore:2/11/17/19=0；build-hash:9/22/23=0；locks-oneway:10/19/27/36=0；oneway:36=1（v1 红能力）:53=0（v2）；gitmv:23=0；final:94=0 |
| 11 | 中探针 18 错=恰 D 段 18 行 import、src 面 0 错 | **成立** | midprobe.log:7-24 十八 TS2307 全在 13 件 tests（逐件 1/1/2/1/1/1/4/2/1/1/1/1/1）；:25 EXIT=2；无任何 `^src/` 错行 |
| 12 | 八关卡单跑（test 170 文件/1744 用例恒等） | **成立** | impl-verify.log:3901-3902=“170 passed/1744 passed”、baseline:3849-3850 同值；指纹门 :21=187/1789/5411/skip15 与 baseline:27 零漂移 |
| 13 | M1/M2 变异红证+cp 还原安全 | **成立** | M1→TS2307 @App.tsx(7,28)（mutation1:10-11）；还原 diff 空+复绿（restore:2/9/11）；M2→vite “Failed to resolve import …/reader/TabBar” EXIT=1（mutation2:28/52）；还原 diff 空+即时复锁+12/12 绿（restore:2/11/13/17）；备份即删；全程无 git checkout |
| 14 | 哈希恒等链（第六票） | **成立** | build-hash.log:6-8 与 :16-18 三产物同名同尺寸同 sha256（index-D3egZtl2.js 9c3b…/css dcac…/worker 1baa…）；PRE 与 baseline:3886-3888 产物名+尺寸吻合——bundle 层零行为证明成立 |
| 15 | 锁链 364→367 | **成立（终态核，步进归属须勘正→P2）** | 364=g9-locks-final.log:24；366=baseline:87/rewrite-d 全轮 366/impl-verify:97；367=locks-oneway:8/17/26-27/34-36；我亲数 locks/manifest.json=**367 条**且含 b22-claim(:49)/g10-oneway(:353)/g10-recon(:357)——净增 3 件新 .mjs 数学闭合；但增量的步进归属（见③P2-1）与物理不符 |
| 16 | 收官核验：root 0/反向边 0/`../X` 直指 0/五通道 0 | **成立（我全域独立复扫）** | root：Glob 无任何根驻留文件+oneway.log:2=0；五子域全文“view/”零命中（含注释）；view 域 `from '../` 全量 68 处仅达五子域/三级 shared/api，`../<根件>` 0；src+tests 13 名旧径全形态联合扫描 0、e2e 0、`@…reader` 别名 0；v2 输出 oneway.log:39-53 与我复扫一致 |
| 17 | 自裁①（中探针时点解读） | **成立** | 唯一自洽解释：仅 18 tests 错、0 src 错 ⇒ 当时树态=A+B+C 毕/D 未改（midprobe 全体）；简报 g10-impl-brief.md:86-87 内部自相矛盾（“B/D 未改”+“src 面 0 错”同句）属简报字面缺陷，实现处置合预期语义+G9 先例（记 N1） |
| 18 | 自裁②（“10 行”笔误勘正） | **成立** | 11 行物理枚举+计数 44 闭合（w1w2-closure.log:16-27）；G6 勘误留痕惯例正确 |
| 19 | 自裁③（探针 v1→v2 谓词收敛） | **成立** | oneway.log:8-36 v1 FAIL 留档（红能力实证）、:39-53 v2 PASS；g10-oneway.mjs:79-123 v2 谓词以 13 名旧径形态+`./view/` 嵌套为对象——我复核脚本谓词与票面定义一致，非放松（五通道独立扫描保留） |
| 20 | 自裁④（sed -E 精确名单） | **成立** | rewrite-d.log 十四轮四元组逐件对账全 OK；包内内证=reader-double-page.test.tsx:360 `reader/view/PageColumn` 未被误改 `view/view`（我复扫 view 域及 tests 无 `view/view` 形态） |
| 21 | 门一 W1（44 闭合第 11 行不可见） | **销项充分** | g10-w1w2-closure.log:2-27 逐件计数+11 行物理定位；我独立复算 44 与逐行位置全中 |
| 22 | 门一 W2(a/b/c)（e2e 零命中/探针源/1776） | **销项充分** | W2a=closure:30+我独立 e2e 全目录扫描 0；W2b=g10-oneway.mjs+log 已入包且我全链复核（含谓词盲区→P2-2）；W2c=本报告①#8 独立复算命中 |
| 23 | 门一 N1-N5 | **全部维持（无翻案）** | N1 对应自裁①（成立）；N2 并入 #18；N3 并入 #19；N4 内证并入 #20；N5 的 F 面归主控——其实体正确但计数转述失实（见 #24） |
| 24 | F 预演：registry 8 行随迁可清红 | **动作成立；“红=恰 8 行”失实（P1）** | registry.ts:106/109/140/141/147/237/258/:301 八行旧 file 亲核✓；但 impl-verify.log:73-88 物理红=**16 行**（规则 1 八行 :106-110 + 规则 2 五行 :145-156 均 keyed `t.file!==rel` + 规则 5 三行 :216-241 stem 失配）；我按 check-tickets.mjs 规则逐条推演：8 行更新后 16 行全部可清（终验 EXIT=0 为准） |
| 25 | H 收口序预批 | **附条件通过** | 见③文末硬条件与附加条件 |

**关键假设拷问（未覆盖面点名）**：零行为三支点（哈希恒等+61 hunk+1744 恒等）
之外，剩余未覆盖面=(a) 运行期行为——由收口 e2e 43 兜底（本票票面义务，G1-G9
免跑口径不适用）；(b) 旧径探针谓词盲区——探针 oldPathHit 仅锚
`src/renderer/features/reader/` 字面，无 `src/` 前缀的相对旧径形态不被其捕获；
已由本岗全形态联合扫描（0）+ typecheck/build 双闸补偿（P2-2）；(c) 行数/尾换行
语义——G11 债（P2-3）。

## ② 独立复算记录（本岗亲验数字与工具面）

- **行数**：逐件 Read 末行号求和 148+81+72+163+125+123+232+159+163+202+162+42+104
  =**1776**（与“wc 1776”数值一致；本岗无 wc 执行面，属逻辑行等价复算）。
- **33+11=44**：33 行改写行号逐一物理命中（见①#2）；44 行逐件计数复加=44；
  `@shared` 别名 4 行（AE:14/AM:40/RT:40,41）位置无关零改正确。
- **出边**：我现扫 view 出边分类计数与探针五项全等（19/29/1/2/2），intra 50=49
  `from './`+1 `import './text-layer.css'`（TextLayer:35），up 11；对 G9 档六项
  增量数学闭合。
- **收官四件**：root 驻留 0（Glob+探针双证）、反向边 0（五子域全文零“view/”）、
  `../根件` 0（68 处 `from '../` 全类别枚举）、旧径五通道 0（13 名跨 src+tests+e2e
  全形态联合正则，含动态 import/vi.mock/别名/字符串/无前缀相对形态）。
- **tickets**：物理红 16 行；规则级推演（check-tickets.mjs:106-110/145-156/
  216-241）证明 8 行 registry 更新即全清（终验为准）。
- **e2e 43**：tests/e2e 十七 spec `^\s*test\(` 计 45，减 z-\*-probe 2 件
  （playwright.config.ts:28 app project testIgnore）＝**43**，与票面/设计书
  义务一致。
- **锁链**：manifest 现值 367 条（我亲数）+locks:check 绿（locks-oneway:26-27）；
  364→366→367 各检查点物理在档（步进归属勘正见③）。
- **哈希**：三产物 PRE/POST sha256 逐字相等（build-hash:6-8 vs :16-18）；与
  baseline build 段产物名/尺寸交叉吻合。
- **不可复算项（显式）**：scan_files=422（探针内部计数，未独立重算，非承重）；
  设计书 1789 的 +13 差额（无尾换行语义，G11 债）。

## ③ 回炉建议与优先级

- **P0（阻断）**：无。
- **P1-1 计数失实勘正（tickets 红行）**：impl 报告 F 段（g10-impl-report.md:67-68）
  与门二简报②F 的“tickets:check 红=恰 8 行”表述被物理日志推翻
  （impl-verify.log:73-88=16 行：8 文件不存在+5 占位引用+3 guardedDescribe
  失配，均为同一 8 行 registry 陈旧路径的级联）。**动作**：收口记录以 16 行
  为准勘正；终跑 verify 后对“16 行全清+open 11→10”显式落档。8 行更新动作
  本身正确，不构成回炉。
- **P2-1 锁链步进归属勘正**：简报②D 与 impl-brief:85（“已入锁 365”）的步进
  归属与物理不符——正确链=364→365（b22-claim.mjs）→366（g10-recon.mjs；
  基线/D/impl 三处 366）→367（g10-oneway.mjs 首版即 367，v2 重 apply 无增量）。
  **动作**：收口说明勘正；终态 367 一致性不受影响。
- **P2-2 探针谓词盲区注记**：g10-oneway.mjs:86-95 的 oldPathHit 锚定
  `src/renderer/features/reader/` 字面，漏检无 `src/` 前缀相对旧径；本次由
  本岗全形态复扫+typecheck/build 双闸补偿。**动作**：建议在探针头注补一句
  限制说明（可选，G11 顺手）。
- **P2-3 行数口径**：1776 已独立命中；1789 的 +13 差额维持包内 G11 对账债口径。
- **N**：impl-brief:86 自相矛盾措辞（自裁①处置正确，仅记）；门一 W1/W2 处置
  充分并获本岗独立补偿；z 探针/执行环境事务均不涉本票产物。
- **H 收口序预批（附条件）**：①registry 翻 done+7 行 file 随迁（8 行）→②中间态
  边重扫（我已完成同面复扫，收口可复核确认）→③e2e 默认门 43（对迁移后
  build：out/ 已由 build-hash.log 绑定；若届时任何 src 变更须先重建）→④终跑
  verify 全链 EXIT=0（含 tickets 全绿+open 11→10）→⑤staging 显式列文件单提交
  （13 R+5 src+14 tests+registry+relay+manifest+证据件，`.log` 按 .gitignore:13
  `add -f`；3 件新探针脚本+门审档显式入列；收口毕未跟踪面为零；尾注
  [locked-change][test-refactor]）→⑥账本 4 行+health-scan（终态后跑）→⑦relay
  回写 READY。**硬条件：e2e 43 绿+终跑 EXIT=0+locks 一致（367+manifest）缺一
  即 NO-GO；本报告 P1/P2 勘正项随收口履行。**

（主控处置段——门二后追加：P1-1 采纳=收口记录以物理 16 行为准（8 行 registry
更新级联清红），终跑后落档「16 行全清+open 11→10」；P2-1 采纳=锁链步进勘正
364→365（b22-claim）→366（g10-recon）→367（g10-oneway）；P2-2 采纳=探针头注
限制说明随 G11 顺手补（收官票头注扫尾义务合并）；P2-3 维持 G11 对账债。）

## 补充裁决（2026-09-19 收口序③后——e2e 硬条件新事实复核，主控逐字归档）

**裁决：认可——原 GO_WITH_CONDITIONS 维持（附新条件）；「e2e 43 绿」按
「42/43 绿+1 例在册 flake（F-EXPORT-01 承接）」口径视为满足，NO-GO 不成立。**

理由①因果排除（亲核）：`g2-e2e-appgate.log:40-42` 与 `g10-e2e-build.log:31-33`
三产物同名同尺寸（D3egZtl2/BfpEygSE/yatZIOMy），`g10-build-hash.log:6-8/:16-18`
sha256 PRE=POST，且 G2 同 bundle 曾 43 passed E2E_EXIT=0（`g2-e2e-appgate.log:91-92`）
——失败不可能源于本票零行为迁移。
理由②在册前置：`docs/audits/flake-ledger.json:69-75` corpus-export 线 count=4
（首现 2026-08-27）+resolution=「立案排查归后续批（与 F-EXPORT-01 同场）」；设计书
§5.1:326-329 同款——「43 绿」义务须连同该顺延注记读，批设计自身已把此例切给下波。
理由③指纹合规：`g10-e2e-appgate.log:49/:97-100`（42+1，E2E_APP_EXIT=1）；
rerun1/2 同值满 60s 红（:12/:19）；rerun3 快样本绿；rerun4 红——2 次立案线远越
且即刻归档，符合「禁拖到多场多现」。

**新条件**：①「放宽 --timeout=180000 后绿」禁写作因果——该次 :157 实耗仅
4.1s、未触任何预算，且 spec:204 poll 为内部 60s 写死不受 CLI 影响（亲读
:150-221），只可记「快样本证功能无硬断」；②收口文档禁写「43 绿」，须记
42/43+1 在册 flake+四 rerun log 归档+F-EXPORT-01 立案携本批指纹（同值=满 60s、
序列位=全套 #4/定向 #2、4 红 1 绿、复跑绿不销项）；③「零进程残留」在五件
log 面无在档输出，本岗不可核——若作论据须补档，否则以 bundle 恒等+spec 面无关
为承重（已够）。
**维持**：终跑 verify EXIT=0+locks 367 一致硬条件不变（verify 链不含 e2e）；
先例边界声明凭——本条=「在册 flake+bundle 恒等排除+承接票在排程」三条件同满足
之特例，非「gate 红可放行」通例。

（主控处置段二：三新条件全采纳——①快样本表述已在 flake-ledger 与本报告按
「功能无硬断，禁记因果」措辞落档；②flake-ledger.json corpus-export 线 count
4→5+本批指纹+「F-EXPORT-01 开工须携本批指纹首查」已更新（docs/audits 不受锁
面）；③「零进程残留」降为非论据，收口记录以 bundle 恒等+spec 面无关承重。）
