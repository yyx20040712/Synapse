# F-GEOM-01-G9 门二终审报告（实证复核——只读工具面亲验，零转述采信）

> 主控逐字归档（岗无写通道）——原文未增删。FINDINGS: P0=0 P1=1 P2=5 N=8
> VERDICT=GO_WITH_CONDITIONS。

> 门二=ops-adjudicator（deepseek-flash $max，异构裁决位）｜材料=门一隔离审包（g9-gate1-brief/diff.patch/report）+实现者全档（impl-brief/report+七关卡+M1/M2+探针源码与日志）+工作树物理态，全部亲读亲扫。
> 根=E:\class\智慧水务\Synapse_remake；证据件绝对路径=E:\class\智慧水务\Synapse_remake\scripts\audits\g9-*（本报告内路径除特别说明均相对该根）。
> 结论：零行为纯迁移声明在本包证据范围内**成立**；判 **GO_WITH_CONDITIONS**（2 条件=③-P1-1 更正落笔、③-P2-1 W1 注记落笔）。

---

## A-H 逐项结论

**A 数字独立复算——1/6 项全中，第 6 项发现报告层失实（P1-1）**
1. **14 件/2212 行/R 对=14**：Glob 亲验 view/ 恰 14 件；reader 根现存 13 件（M6b 集：ReaderPage/PageColumnView/reader-search/AnnotationEditor/AnnotationMenu/reader-search.store/ReaderToolbar/TabBar/reader-shortcut-handlers/SearchHighlightLayer/useReaderSearch/ReaderSearchBox/ReaderShortcuts），不含 14 件任意一件；g9-gitmv-status.log:1-14=14 对 R 标记（:15 GREP_EXIT=0）；g9-gate1-diff.patch `^rename from` 亲数=14。行数逐件亲数（rg）：PageColumn 164/PageBox 64/PagesOverlay 132/PdfPageCanvas 146/TextLayer 156/text-layer.css 116/page-column-geometry 174/usePageColumnScroll 66/usePageLazyWindow 83/scroll-progress 367/AnnotationLayer 151/AiAnnotationLayer 234/AnnotationPopups 202/ReaderPageView 157，逐件与 impl-brief:13-17 零差、合计 **2212**。
2. **A=44 分项**：对 view/ 14 件亲 grep `from '\.\./`，恰 44 行，逐行分类=state 18+anchors 14+panels 1+interact 1+上跨 4+根驻留 6（行号清单见②）。44 项与 one-way.log:3、impl-report:24-32 逐子类吻合。
3. **B=7/3、C=30/16（vi.mock 5）、E=2**：B 三件=reader-search.ts:32、PageColumnView.tsx:25/26/27、ReaderPage.tsx:50/54/58（亲读文件原文）；C 亲数 tests 内 `features/reader/view/` 命中 30 行/16 文件（逐件 2+1+2+1+2+2+6+1+2+2+1+1+2+2+1+2=30）；vi.mock=5（pages-overlay.test.tsx:55/80/87/94+reader-page-open-race.test.tsx:38）；E=eslint.config.js:88-93（:90/:91=view/ 路径，:89/:92 未动）。
4. **单向核验**：我重扫 state/anchors/interact/panels/time 五域对 `view/` **0 命中**（四次亲 grep 全空）；view 出边亲数=anchors 14/state 18/panels 1/interact 1/time 0/域内 26/根驻留 6/上跨 4，与 one-way.log:3 恒等；external=2 经亲读证实为 `.textLayer` querySelector 字符串（AnnotationLayer.tsx:87、AiAnnotationLayer.tsx:134），非 import。域内互引亲数=26（PageColumn 7+PageBox 3+PagesOverlay 6+ReaderPageView 4+scroll-progress 1+TextLayer 2+usePageColumnScroll 1+usePageLazyWindow 1+AnnotationLayer 1）。
5. **指纹门/测试基线**：g9-verify-baseline.log:27=files 183/187、cases 1757/1789、assertions 5334/5411、skipSites 15/15，:68「指纹门绿」；test=170 Files/1744 Tests（g9-gate-test.log:3819-3820；baseline:3919-3920 同值=零漂移）。**位置更正**：指纹数字实际在 g9-verify-baseline.log，不在简报 A5 所指 gate-test/gate-quality（两件内均无 test-surface 段）→P2-2。
6. **locks=364**：manifest.json `"path"` 亲数=**364**（含 g9 五件 manifest.json:425-441=one-way/recon/rewrite-a/b/ce）；g9-locks-final.log:7、:15、:24 三处=364；:24-25 locks:check 绿。**发现失实**：g9-impl-report.md:53「manifest 363 条一致（359 基线…）」与其引证文件自身（364）矛盾；:112「359→363」同理。真实链=baseline:87=**360**（含主控 recon.mjs）→gen1 361→gen2 362→apply-ce 363→final 364（CE unlock=362、M2 unlock=363 亦在档互洽）。→P1-1。

**B 证据件物理 EXIT 标记——21 件日志 30 处全部在档**（逐件亲读，非终端回述）：baseline:3960；lint:7；typecheck:7；test:3824；build:35；quality:11；tickets:25；locks-final:17/:25；midprobe:63；m1:8/:9/:16；m2:8/:43/:44/:53/:69；one-way:8；gitmv:15；recon:481；rewrite-a:14；rewrite-b:10；rewrite-ce:4；locks-ce:8；gen1:9/:18；gen2:17；apply-ce:17/:25。M1 链=TS2307(ReaderPage.tsx 58,32) EXIT=2→还原 diff 空 EXIT=0→复绿 EXIT=0（m1:7-16）；M2 链=模块解析红「Failed to resolve import …/reader/PageColumn」(m2:19-26) EXIT=1→还原 diff 空→复锁(364)→复绿 24 passed(m2:64-65)→EXIT=0。**变异 backup 残留=0**：src/tests 无 *.bak/*.orig；scripts/audits 仅存 g4-recon-imports.log.bak-diff（G4 期历史归档，非 G9 变异副本——简报「无 *.bak 件」表述需精确化，P2-3）。

**C 残留五通道独立闭合——亲扫全 0**
① 旧径 import（14 件名+扩展名形态、含 `features/reader/X` 与 `…/reader/X` 相对形态）：src **0**、tests（含 e2e）**0**；scripts 命中 76 件全部位于 scripts/audits（历史档=归档面零动作，逐路径核对无一例外）。② 点径旧径：reader 根文件对 14 件的 `'./X'` **0**（现存 `'./X'` 全部位于 view/ 内部=合法域内互引）；tests 内相对点径 **0**。③ 别名：全仓 tsconfig/vite/vitest/electron.vite 无 reader 相关 paths；`@|~…reader` 引用 **0**。④ 动态 import：`import('…reader/X')` 与 `import('./X')` 形态 src/tests **0**；`require(`、反引号模板形态 **0**；view/ 内无任何 `import(`/`url(`/`@import`。⑤ vi.mock：旧径 **0**（命中仅 audits 历史档与 gate1 patch 的删行证据）；新径恰 5。registry 旧径=12 处单列（收口面，与 tickets 红 12 条逐条对应）；.mimosa=会话态非仓库面（按惯例排除）。

**D 门一 W1+N1-N10 处置裁决**：W1 处置充分（条件：注记必须实际落笔→P2-1）；N1-N7/N10 经本终审逐项闭环；N8/N9 归口合理（G11/收口注记）。逐条裁决见①-表二。

**E 实现者自裁 7 条复核**：7/7 正当（第②条=W1 证据缺口，处置后过；第③⑦条经亲读/亲数独立证实；第④条亲验日志确为二进制判定但标记可 grep -a 读出）。逐条见①-表三。

**F 基线对账与 tickets 红面**：test 170/1744 两侧恒等；产物三件套同名同尺寸（baseline:3956-3958 vs gate-build:31-33）；tickets 红=**12 行 registry 旧径+4 行镜像面=16 行**（gate-tickets:9-24），与预告「registry 旧径 12 条」+自裁⑥「另 4 条镜像面」完全一致；TICKETS_EXIT=1=预期态。**收口后清红可行性亲验**：12 行 file 更新后规则 1 消；4 镜像行系 rule 2「done 票 file≠本文件」比对（check-tickets.mjs:145-156），12 行随迁后 `t.file===rel` 即消；5 张 SR2 票新目标件均含 `// b3: P7-X` 头注（PageColumn:1/scroll-progress:1/text-layer.css:2= P7-F；AiAnnotationLayer:1=P7-G；ROADMAP.md:195/226 已裁决集含 F/G）；done 件无 data-ticket/*_STUB/未实现占位（view/ 全件亲 grep 0）；guardedDescribe 与 12 票无绑定（0 命中）。预期翻 done 后 tickets:check 全绿。

**G 构建产物恒等**：out/renderer/assets/ 现存 index-D3egZtl2.js、index-BfpEygSE.css、pdf.worker.min-yatZIOMy.mjs（Glob 亲验）；基线（3956-3958）与迁移后（gate-build:31-33）=同名同尺寸（js 1,392.72kB/css 52.49kB/worker 1,375.84kB）。内容哈希名恒等=Vite 内容哈希恒等即字节恒等（读工具面无 ls/stat 通道，以此等效；见②-N 注记）。

**H 收口序预批——批准，附 4 处补强（详见③-H）**：主控序①→⑤成立；遗漏/补强=①staging 表述「全部 g9-*.log/mjs/md」**漏 g9-gate1-diff.patch 与 g9-gate2-brief/report**；②附 12 行随迁映射表防错；③尾验预期值清单（防漂移）；④注记/更正与 W1 注记同批落笔。

---

## ① 逐条裁决表

**表一·门一审包关键判断（B0 与四项官方计数）**

| # | 原判断（门一） | 裁决 | 依据（行级证据） |
|---|---|---|---|
| 1 | B=0，全部 hunk 仅路径字符串改写 | **成立**（门二扩展复验） | patch 34 条目亲数；`^[+-]` 语义行扫描仅命中 5 对 vi.mock 行（patch:454-551），逐对仅差 `reader/`→`reader/view/`；`expect(\|it(\|describe(\|function\|return` 等 0 命中；rename=14；relay/manifest/registry 路径 0 命中 |
| 2 | A=44（18/14/1/1/4/6） | **成立**（亲 grep 复算） | view/ 14 件 `from '\.\./`=44 行，分类 18/14/1/1/4/6（②-1） |
| 3 | B=7/3、C=30/16（vi.mock 5）、E=2 | **成立** | ②-2；tests 亲数 30/16；vi.mock 5（pages-overlay:55/80/87/94+open-race:38）；eslint:90/91 |
| 4 | rename 14 对 similarity 94-100% | **成立（结构核对）** | patch `^rename from`=14；gitmv-status.log:1-14；test 无断言行被触（①-1） |
| 5 | 拓扑保持/无新环 | **成立** | 出边/反向边亲扫（A4/C①②）；PageColumn→PageColumnView(根)→PageBox(view) 无回向 |
| 6 | 受锁面零用例/断言改动 | **成立** | patch 语义行扫描 0；tests 30 行仅说明符整串替换（g9-rewrite-ce.mjs:47-49 断言态） |

**表二·门一 W1+N1-N10 处置裁决**

| 项 | 门一原判断 | 门二裁决 | 依据/证据行号 |
|---|---|---|---|
| W1 | 探针 v1 输出被 v2 覆盖未留档；主控注记即可过 | **成立；处置充分——条件=注记必须实际落笔（P2-1）** | gate1-report:80；impl-report:122；v2 源码含修复机制（one-way.mjs:6 win32 归一、:13/:69-73 名称限定+view 负向前瞻）；门二五通道亲扫 0 结果同向补偿 |
| N1 | raw 不在门一包不可验 | **闭环**（门二持仓读全验） | ④下 30 处 EXIT 标记+七关卡关键输出全在档 |
| N2 | registry 12 行+尾注不在包不可验 | **闭环** | registry.ts:102/103/108/185/204/206/209/225/243/249/256/300=12 行；:300 尾注 [locked-change][test-refactor] 在档 |
| N3 | 设计书不在包；root↔view 中间态归 G10 | **处置合理**（附注：当前 root↔view 边=A 面 6 根驻留+B 面 7 消费，全为 M6a/M6b 拆分声明边，G10 收官时必须重扫） | ②-1 根驻留 6 行；B 面 3 文件 7 引用 |
| N4 | 2212/13 件−1/PdfPageCanvas 146vs188 不可验 | **闭环**：2212 逐件零差；「−1」=设计书计数与现测行数口径（gate1-brief:13 自述）；PdfPageCanvas 现=146（G1 类型下沉已削，与本票无关） | ②-1；g9-impl-brief:13-17 |
| N5 | D=0/G=0/五通道 0 不可验 | **闭环**：五通道亲扫 0（C）；D 面=src 消费 view/ 仅 3 文件 7 处（无跨特性）；G 面=字符串/路径形态对 14 件 0 命中（松散模式含扩展名/tests 全覆盖） | C 节全段；②-3 |
| N6 | 域内互引 26 patch 仅见 19 | **闭环**：逐行亲数 26（②-2） | view/ 各件行号清单 |
| N7 | 自裁⑤⑥归因不可验 | **部分闭环**：patch 零 relay/manifest 路径亲验✓；manifest 增量=锁操作链（360→364）解释✓；relay 46 行「开场遗留」历史态不可复原（残余注记，风险可忽略：patch 独立证明未触碰） | patch 34 条目；locks 链日志；impl-report:128-130 |
| N8 | PdfPageCanvas G1 注释陈旧，建议 M 系扫尾 | **成立**：view/PdfPageCanvas.tsx:36-38 仍写「受锁测试旧路径 import 本件零触」而 C 面已改新径=表述陈旧；归 G11 头注扫尾**接受**（非阻断） | PdfPageCanvas.tsx:20-21、:36-38 |
| N9 | open-race 闭合归因精度欠佳 | **成立**：M2 红证对象=page-column.test.tsx:23；open-race 实际由套件绿+路径逐字一致闭合（vi.mock 由 vitest 运行时解析，全量 170 绿即解析成立）——记录级 | m2:19-26；open-race:38=view/PageColumn |
| N10 | external=2 细节不可验 | **闭环**：`.textLayer` querySelector 亲读（AnnotationLayer.tsx:87、AiAnnotationLayer.tsx:134）；EXT_SPEC 明细 one-way.log:1-2 | 同左 |

**表三·实现者自裁 7 条复核**

| # | 自裁 | 门二裁决 | 独立证据 |
|---|---|---|---|
| ① | gitmv-status 首采补正 | **正当**（程序性，零产物面） | gitmv-status.log 输出为仓库根相对路径，14 行完整 |
| ② | one-way v1 两缺陷修正；v1 未留档 | **正当，但=W1 证据缺口**；处置=注记+后续全量留档（条件） | v2 源码含两修复机制（:6/:13/:69-73）；门二独立复扫同向（C） |
| ③ | external=2=`.textLayer` 误捕 | **正当**（亲读证实两处均为 querySelector 字符串） | AnnotationLayer.tsx:87；AiAnnotationLayer.tsx:134 |
| ④ | M2 日志 grep 需 -a | **正当**（亲验：Read 判二进制；grep 可读全部标记） | m2:8/:43/:44/:53/:69 亲读 |
| ⑤ | 开场非净态=主控遗留 | **正当（残余不可复原项注记）** | patch 零 relay/manifest；manifest 变化=锁链必然产物（②-4） |
| ⑥ | tickets 4 条镜像面红 | **正当**（机制亲验+清红路径可行） | check-tickets.mjs:145-156；gate-tickets:21-24；F 节 |
| ⑦ | A 面行号零漂移+export-from 计入 anchors | **正当**（44 行行号全对；:39 export-from 在 anchors 14 内） | ②-1/②-2；PdfPageCanvas.tsx:39 |

---

## ② 独立复算记录

**复算方法**：全部使用只读通道（Glob 列件、rg 逐件行数/逐行列出、Read 亲读源码与日志），未跑任何命令、未采信任何转述；对门一/实现者/门二三方的每个数字从原始文件重推。

1. **A 面 44 行行级清单（亲 grep 结果）**：state 18=AiAA:74/76/77、AnnoL:47/48、Popups:34/37、PageBox:25、PageColumn:30、PagesOverlay:51、PdfPageCanvas:32、ReaderPageView:38/42、scroll-progress:49/51/52、TextLayer:36、usePageColumnScroll:26；anchors 14=AiAA:70/71/72/73/75、AnnoL:42/43/44/45/46、PagesOverlay:54、PdfPageCanvas:33/34/39（含 export-from）；panels 1=ReaderPageView:35；interact 1=ReaderPageView:41；上跨 4=Popups:32/33、ReaderPageView:36、scroll-progress:50；根驻留 6=PageColumn:32、PagesOverlay:50、Popups:35/36、ReaderPageView:37/40。
2. **域内互引 26（亲数）**：PageColumn:31/39/40/41/44/45/48；PageBox:26/27/28；PagesOverlay:47/48/49/52/53/55；ReaderPageView:32/33/34/39；scroll-progress:48；TextLayer:34/35（css）；usePageColumnScroll:25；usePageLazyWindow:27；AnnotationLayer:49。
3. **D 面=0**：src 引用 `view/` 仅 3 文件 7 处（B 面）；松散模式（`reader/<名>` 任意前缀、含 .tsx/.ts/.css 扩展）在 src/tests 全 0；反引号/require 形态 0。
4. **锁链算术复推**：baseline:87=360（含主控 recon.mjs）→gen1:7=361→gen2:7=362→CE unlock(ce:7)=362→apply-ce:7=363→M2 unlock(m2:8)=363→final:7/:15/:24=364；manifest 364−g9 五件（manifest:425-441）=359 为迁移前存量。impl-report 的 359/363 两数字均无来源支撑（其引证证据自身皆反证）。
5. **midprobe 复算**：56 错全 tests 面（`:56` 计数=56；`^src/.*error TS`=0）；uniq 15 件分布 17+10+7+5+2+2+2+2+2+2+1+1+1+1+1=56 复核成立；15/16 件归因=open-race 仅 vi.mock 面（tsc 不解析 vi.mock 字符串），由全量套件绿闭合。
6. **patch 结构复算**：`^diff --git`=34（1 eslint+3 src+14 rename+16 tests）；`^rename from`=14；relay/manifest/registry 0；语义行扫描见①-表一-1。
7. **tickets 清红预演**：12 行映射（SR-RDR-02→view/PdfPageCanvas；SR-RDR-03→view/TextLayer；SR-RDR-06→view/AnnotationLayer；SR2-AI-09→view/AiAnnotationLayer；SR2-F-01/SR2-F-06/F-A7/F-SPLIT-01→view/PageColumn；SR2-F-03→view/scroll-progress；SR2-F-09→view/text-layer.css；F-A9→view/AnnotationLayer；F-GEOM-01-G9→view/PdfPageCanvas+done）；规则 1/2/6 预演通过（F 节）。
8. **产物三件套**：baseline:3956-3958 与 gate-build:31-33 同名同尺寸；Glob 现存三件；hash 文件名恒等=字节恒等（Vite 内容哈希）。
9. **无佐证/包外断言点名清单**（禁臆测，逐项标注）：(a) 探针 v1 原始输出（已灭失；仅 v2 在档+门二复扫补偿）；(b) 「开场非净态=主控遗留」历史态（patch 可证未触碰，归因不可复原）；(c) 设计书 §3.1/§3.2 原文（不在包；本票以域序实测为准）；(d) 「theme.test 双扫零命中」转述（门二以五通道亲扫覆盖，结果 0）；(e) M1/M2「还原 diff 空」仅 EXIT=0 标记（exit=0 语义等价空 diff，无 diff 输出行——可接受）；(f) 「13 件 −1 无尾换行」差异机制（现测逐件与简报零差，不影响本票）；(g) 字节级 stat/hash（只读工具面无 ls 通道；以双 log 同名同尺寸+内容哈希名为等效证据——登记）。

---

## ③ 回炉建议与优先级

**P0=0**（无致命项）。
**P1=1（收口前必须）**
- P1-1：g9-impl-report.md 两处锁数失实更正——:53「manifest 363 条一致（359 基线…）」、:112「359→363」→ 更正为「364 条一致（360 基线[含 recon]+4 探针）」。处置=在收口单注记更正或报告追加更正行（二者其一），确保归档证据自洽。**不阻断代码正确性，只阻断证据自洽**。

**P2=5（记录处置后可过）**
- P2-1：W1 处置执行确认（收口单注记：v1 未留档缺口+门二独立复扫补偿结论；后续场探针版本全量留档）。
- P2-2：取证位置更正（指纹门 187/1789/5411/skip15 在 g9-verify-baseline.log:27，非 gate-test/quality）。
- P2-3：「scripts/audits 无 *.bak/backup 件」精确化为「无 G9 变异 backup 残留」——g4-recon-imports.log.bak-diff 为 G4 期历史归档件。
- P2-4：GBK/ANSI 混排日志（g9-m2-mutation.log、g9-locks-*.log）被通用读取器判二进制；标记物理在档但仅 grep -a 可读——后续探针日志建议 UTF-8（chcp 65001/Out-File -Encoding utf8）。
- P2-5：N8 归 G11 头注扫尾登记确认；N9 记录级措辞（open-race 闭合=M2 红证对象为 page-column 导入行，open-race 由套件绿+路径一致闭合）收口单可选注记。

**N=8（注记）**：(1) 21 日志 30 处 EXIT 标记全档（清单见 B）；(2) midprobe 56/15 件算术复核；(3) 锁链 360→364 与 gen 日志互洽；(4) 产物三件套含 pdf.worker 亦恒等；(5) e2e 不属本票验收链（G10 43 用例门；零行为证据=产物恒等）；(6) 收口 staging 必须含 **g9-gate1-diff.patch**（「log/mjs/md」表述漏项）+g9-gate2-brief.md+本次门二报告；.log 需 add -f；提交后 untracked=0；(7) 门二扫描域较探针更宽（含 scripts 全集与 registry 单列），结论仍全 0/单列；(8) 只读工具面限制登记（见②-9g）。

**H 收口序预批（批准，附补强）**：①registry 12 行随迁（映射表见②-7）+G9 翻 done（file=view/PdfPageCanvas.tsx）→②locks 复核（无需再 apply：registry/relay 非受锁件；若收口期触碰 tests/eslint 则 unlock→apply 即时）→③verify 全链终跑，**预期值清单**：tickets 绿（open 11）、test-surface cur=187/1789/5411/15、test 170/1744、locks 364、build 三件套同名同尺寸；任一漂移即停→④staging 显式列件（14 rename 对+3 src+16 tests+eslint+registry+manifest+relay+全部 g9-*：含 32 件现存+gate2 brief/report+diff.patch；.log 用 add -f）→⑤[locked-change][test-refactor] 提交，提交后 git status 未跟踪=0。

---

FINDINGS: P0=0 P1=1 P2=5 N=8 VERDICT=GO_WITH_CONDITIONS
MODEL-SELF: model-field:8ad55776-2296-4f1a-bc46-05755c8f1300/deepseek-flash$max
LEDGER-CLAIM: role=ops-adjudicator executor=model-field:8ad55776-2296-4f1a-bc46-05755c8f1300/deepseek-flash$max units=1 outcome=done
