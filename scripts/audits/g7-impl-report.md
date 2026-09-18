# F-GEOM-01-G7 实现者报告（目录化 M4=interact/ 域迁移 + selection RoT 工厂抽取）

> 票面=tickets/registry.ts F-GEOM-01-G7；简报=scripts/audits/g7-impl-brief.md；
> 类型=[locked-change][test-refactor] 零行为纯迁移+受锁测试工厂 RoT（零断言变化）。
> 状态：**七关卡全绿（2026-09-19 01:54 主控裁准 theme.test.ts:294 实勘勘正后
> 终跑 G7_IMPL_VERIFY_FINAL_EXIT=0；Test Files 170/Tests 1744 基线精确恢复）**。
> 禁 git commit 全程保持。

## ① 交付清单（按单元，数字=git diff --numstat -M / wc -l 实测）

| 单元 | 内容 | 实测 |
| --- | --- | --- |
| git mv | 7 文件 reader/ → reader/interact/（rename 全检出 R） | 1259 行（wc -l：237/77/312/143/88/210/192） |
| A 段出边深度修正 | 恰 19 行：SelectionLayer 4+Toolbar 1+evaluate 9+paint 3+affinity 2；geometry/draft 零改 | numstat 逐件 4/4,1/1,2/2,9/9,0/0,3/3,0/0=19/19 |
| B 段 src 入边 | ReaderPageView:41+AnnotationEditor:16 | 2/2 |
| C 段 1 测试路径 | **9 文件 9 行**（geometry/affinity/band-cal/evaluate/fa12/chain/paint/layer+**theme.test.ts:294 主控裁准补入**——readFileSync 字符串路径形态，实勘勘正 8→9） | 各 1 行（计入下列 RoT 件合计） |
| C 段 2 RoT 抽取 | mkItem/mkText/seedRegistry ×4 → tests/utils/factories.ts 单源（函数体逐字迁移；seedRegistry 统一参数化超集形）；4 件测试删本地定义+加 factories import（geometry 后、被测件前） | factories +25/-2；evaluate 2/17、chain 2/18、layer 2/20、paint 2/21 |
| E 段配置面 | eslint INV-16 四路径+check-quality 白名单核验：7 件零命中零改写 | 0 行 |
| F 段 registry | 8 行 file 路径随迁（107/210/224/242/257/266/293/298），status 零触碰 | 8/8 |
| G 段 e2e | reader-text.spec 4 处纯注释语义提名，路径形态零命中零改写 | 0 行 |
| §3.1 探针 | scripts/audits/g7-oneway-check.mjs（写后同批次 lint+locks:generate+apply，354→355） | 出边 19/反向 0/残留 0=PASS |
| 合计（本票独占面） | 20 文件 | +67/-112（另 relay.md 29/5=主控侦察期、manifest 26/10=双方共有，仓库总 123/128） |

## ② 验证证据（命令+EXIT+关键输出，log 物理在档）

七关卡（终态=裁准后终跑，g7-impl-verify.log 追加段）：
1. typecheck EXIT=0（M1 还原后复绿同证）；
2. lint EXIT=0；
3. unit 全量：**Test Files 170 passed (170)/Tests 1744 passed (1744)=基线精确恢复**（首跑曾 169/1564+theme.test.ts collect 红，裁准修正后消除——计数差 180=该件 it.each 参数化展开用例）；
4. build EXIT=0+**产物哈希恒等**：index-D3egZtl2.js 1,392.72kB（sha256 9c3b8b84396410230ce263286f35aaab45ebfb1f3a3026f0d9ea3aa7b4ca3f2a）+index-BfpEygSE.css 52.49kB（sha256 dcace2e7481c724b80186a4822fe252b403be154bcb06d5bbcb5f79a068a97d5）——文件名内嵌哈希同名+尺寸同+sha256 双证（g7-build-hash.log；终跑 verify build 段同名同尺寸复现 :7715-7716）；
5. 指纹门零漂移：files 187/cases 1789/assertions 5411/skipSites 15（=基线）；
6. locks:check 一致（355 条，manifest 与全部受锁改动同步——含 theme.test.ts 改后 generate+apply 即时链）；
7. verify 全链 **G7_IMPL_VERIFY_FINAL_EXIT=0**（quality「检查通过」/tickets「206 票 open 14 注册表与代码一致」/指纹门/locks/lint/typecheck/test/build 全段过；首跑 G7_IMPL_VERIFY_EXIT=1 记录在档=裁准前历史态）。

selection 回归定向：9 文件/82 用例全绿，G7_SELECTION_REGRESSION_EXIT=0（g7-selection-regression.log）。
§3.1 单向核验：interact→域外出边 19（与 A 段修正行一一对应）/state|anchors|time|panels→interact 反向边 0/全仓 7 名旧径解析残留 0=G7_ONEWAY_CHECK=PASS（g7-oneway-check.log）。

变异红证（cp 备份法，备份即删，禁 git checkout 全程遵守）：
- M1（src 面）：ReaderPageView:41 回退旧径 → typecheck TS2307(:41,32) EXIT=2（g7-impl-mutation1.log）→ cp 还原 M1_RESTORE_EXIT=0+diff 空 M1_DIFF_EXIT=0+复绿 M1_REGREEN_EXIT=0（g7-impl-mutation1-restore.log）。
- M2（tests 面）：selection-layer.test:27 回退旧径 → vitest「Failed to resolve import」EXIT=1（g7-impl-mutation2.log）→ 还原链三 EXIT=0+复锁 M2_RELOCK_EXIT=0+locks:check 355 一致（g7-impl-mutation2-restore.log；**首试还原因 locks 只读拒 cp 失败 RESTORE_EXIT=1 如实在档**——解锁+逆向 sed 恢复（单行路径段逆操作，恢复后定向 14/14 绿证）后解锁态完整重走规范周期，追加式日志保留失败首试+成功重走双记录）。

## ③ 自裁申报（超票面/近票面决定逐条）

1. **【已裁准+处置毕】theme.test.ts:294 漏边**：该件「弹层九 tsx 形态锁」经 readFileSync 字符串路径读 `reader/SelectionToolbar.tsx` 源文——**非 import 形态，主控 recon 入边全表未覆盖（G6 N3-N4 侦察正则盲区同族第三现，教训归主控侦察面）**。停工申报后主控于 **2026-09-19 01:54 裁「准」**（主控级自裁=票面 C 段实勘勘正，G4「受锁面实勘勘正」先例同类）：单行改 `reader/interact/SelectionToolbar.tsx` 落地（unlock→改→generate+apply 即时复锁 355 一致）+归档件 3 处不动裁正确认；终跑 verify EXIT=0、Test Files 170/Tests 1744 基线恢复。C 段受锁面清单随之 8→9 文件。
2. 4 件 RoT 测试的 `PdfTextItem/PdfTextContent` type import 删除：简报预设「保留零改、核实若全无消费再删」——实测四件中两标识符仅出现在 import 行+3 个本地签名，删定义后零消费，按授权删 4 行（lint 拦未用反向验证）；`act` import 四件均有大量别处消费，保留。
3. factories.ts 头注边界句随扩面同步：「（useLineageStore）」→「（useLineageStore/usePageItemsStore+act）」——超出「追加一句收敛记录」字面指令的真值维护改写（新增两值依赖不注即头注失真）。
4. 行数口径差登记：简报 wc 值每件恰 +1（238/78/313/144/89/211/193 vs 实测 237/77/312/143/88/210/192）——尾行无换行符计数口径差，**import 行号 19 行逐一吻合证内容零漂移**，非实勘不符。
5. M2 还原首试失败处置（见 ②）+g7-oneway-check.mjs 探针首版 e2e/ 根路径笔误即改（tests/e2e 为真身）——过程性自裁，终态证据均完整。
6. 证据件 .log 受 .gitignore `*.log` 拦（:13）——收口入库需 `git add -f`（F-AUDIT-01 三桶口径+G6 前例 14 .log add -f），主控收口时留意；探针 .mjs 已即时入锁。

## 附：与基线对账

g7-verify-baseline3.log（G7_VERIFY_BASELINE3_EXIT=0；206 票 open 14/locks 354/test-surface 187/1789/5411/skip15/Tests 170 文件 1744 用例）vs 本批终态：open 14 恒定（G7 未翻 done=主控职责）/locks 354→355（+oneway 探针自产件）/指纹门四值零漂移/build 产物哈希恒等/Test Files 170+Tests 1744 基线精确一致。
