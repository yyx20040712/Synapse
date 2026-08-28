# SR2-F-01 门二终审档（页列几何与懒渲染回收——终态，含回炉 1 轮）

> 审计人：门二终审子代理（ADR-0017 三屋模式，独立于实现者与门一）。
> 基线=终态 diff `scripts/audits/f01-gate2.diff`（1946 行，回炉后重新生成，含 W1-W4）。
> 审计方式：只读（唯一可写=本档）；禁 npm/test（主控已亲验 verify exit 0 全链+e2e
> exit 0；回炉后 679 用例）。
>
> 开工记录（会话开工纪律）：技能清点——`code-review-excellence`（用：本任务即终审
> 对抗审查）/`verification-before-completion`（用：逐项证据核对后才作声明，验证手段=
> 只读 grep/wc/ls/log，非 npm）/`systematic-debugging`（不用：无调试面）/`test-driven-
> development`（不用：只审 TDD 证据链不自写）/`e2e-testing-patterns`（不用：禁跑测试，
> e2e 行为仅推演）。配置自查：终审角色，模型/思考等级由主控配置。

## ⓪ 回炉定点复核（先做）

| 项 | 判定 | 证据 |
| --- | --- | --- |
| W1 INV 编号重编 29/30 | **ADDRESSED** | docs/invariants.md:43/44=INV-29（双源）/INV-30（canvas 窗口绑定），含撞号史注记（"原误编 INV-27/28，门一 W1 处置重编"）；:41/:42 lineage/ENR **原主条目内容未动**（LG-01/ENR-01 在册原样）。代码侧引用同步：全仓 grep INV-27/INV-28——reader 域（src/renderer/features/reader + tests/unit/renderer 的 F-01 面）**零残留**，全部命中为 lineage 域（LG-01 原主 20 处）+ENR 域（corpus.export.service 1 处，合法原主）。INV-29/30 引用计数：reader.store.ts 3 处（:42/:97/:330）/PageColumn.tsx 6 处/page-column.test.tsx 3 处（:8/:156/:240）/reader.store.test.ts 1 处（:354）——与实现者报告 §八 W1 声称（3/6/3/1）逐一吻合。门一处置建议中提到的 PdfDocProvider/PdfPageCanvas 注释 INV-28 字样已同步（两新文件注释现引 INV-16，无 INV-27/28） |
| W2 load catch→onError+error 终态 | **ADDRESSED** | 终态代码：PageColumn.tsx:127/:130 onErrorRef latest-ref、:135 `sizesError` state、:157-160 `load().catch`→`setSizesError(true)+onErrorRef（页列尺寸获取失败：…）`、:209-211 error 终态分支（`data-page-column="error"`，不再 loading）、:140 doc/totalPages 变化重置 `setSizesError(false)`。测试用例在：page-column.test.tsx「W2 门一回炉」用例（onError×1+`stringContaining('页列尺寸')`+onReady 未调+error 终态 boxCount=0）。红证链：f01-red-r1-w2w3.log=**1 failed\|15 passed**（首红）+f01-mutation-r1-w2.log=**1 failed\|15 passed**（错误消息 token 变异恰中 1 用例）——数字与报告 §八 W2 一致 |
| W3 dropPageState 同删 pageRoots+Probe 机制 | **ADDRESSED** | ReaderPage.tsx:144-151 `dropPageState`（泛型 `del` 共用，pageTexts 与 pageRoots **同删**；无条目返回原引用防无谓重渲）+:57 PageFrame 卸载哨+:194 装配（`onRecycle={dropPageState}`）。测试用例在：page-column.test.tsx「W3 门一回炉」Probe 机制锚（与 PageFrame 同型的 useEffect cleanup 探针：滚出回收窗→`[1,2,3,4]` 全收+新窗口 `[7,8,9]` 在位）。变异红证：f01-mutation-r1-w3.log=**6 failed\|10 passed**（`rendered.has(no)→true` 恒渲染变异恰中 6 回收族用例）。W3 无独立首红——报告如实申报「即绿用例以变异红证其能失败」（TDD「每个测试必须能失败一次」经变异红证满足，合规且诚实） |
| W4 报告 §六.13 补录 | **ADDRESSED** | 实现者报告 §六.13 已补录 jump(d) 等价重构（prevPage/nextPage 闭包→±1 参数化共用辅助，行为等价 `setPage(t.page∓1)` 逐位对齐）；终态 diff :1041-1058 与申报形态一致，zoomStep/undo 未动 |

## ① 门一 findings 处置核对（vs 终态）

- 门一总判=0B/6W+5N PASS 附回炉。回炉处置=主控裁决 W1-W4 全收（W2/W3 代码修+W1 编号重编+W4 补录申报）。
- **N 级抽查两条**：
  - N「data-ticket 保留」：终态=PageColumn.tsx:214（loading 分支）+:220（ready 主容器）——**真实现根容器上的标记**（AI-08/09/10 先例形态），非空占位组件。翻 done 必须移除（check-tickets 规则 4b），已列入收口动作（见④）。
  - N「makeDoc 恒真三元」：page-column.test.tsx:56 `792 * (no === 1 ? 1 : 1)` **仍在**——门一原判「F 批次顺手清或收口时 unlock 修正」，未处理（无害调试残留，非阻断；遗留登记给收口清单）。
- 主控处置 vs 终态：registry SR-RDR-02 file 迁移 ✓（tickets/registry.ts:101 →PdfPageCanvas.tsx+拆分史 summary）；tickets:check 由实现时点 exit 1 转 verify log 「注册表与代码一致」通过（疑虑 1 闭合）；PageColumn 头注压缩——门一时点 239 → W2 增量先超线（报告称 255）→ 压回 **247**（wc -l 实测）≤250 ✓。门一其余 W（状态机隐式已判非阻断/store 头注 TABS-01 状态行遗留=主控域）维持原判。
- reader.store.ts:3 头注状态行「[SR2-TABS-01]（工单：open / strong）」仍在（门一 E-6 遗留，非本单引入、非收口阻断）——建议主控收口顺手正（1 行，非锁）。

## ② 母本符合度（diff+实物 vs 票面五段+双源——抽六处锚）

1. 段①就绪管线：PageColumn:139-164（[doc,totalPages] effect→逐页 getPage→view 尺寸缓存→onReady:153）+clampPageToColumn:38-40（1 基夹取，scrollToPage 前哨:205）+zoom 不入依赖:164 ✓。
2. 段②占位盒：columnWidth:43-45（最宽页×zoom floor）/pageBoxHeight:48-50（floor 与 canvas CSS 同口径）/列宽 style+mx-auto:222-223/未渲染盒空白:234-241 ✓。
3. 段③懒渲染窗口：windowPages:53-65（±renderWindow+空可见顶部引导窗口）/recycledPages:69-80（≤recycleWindow 保留）/IO data-page-box 驱动:167-186（引用稳定去抖:178-179）✓。
4. 段④层分工：ReaderPage renderPageLayers 每渲染页 TextLayer/AnnotationLayer/ReaderAiLayer 一套（props 未改——三组件均不在修改面）；SelectionLayer `anchorPage===no` 条件单实例 ✓（票面「锚定根动态归 F-02、本单留挂载位」忠于票面）。
5. 段⑤双源：reader.store setPage 第三参:328-347（`opts?.scroll !== 'none'` bump `scrollRequest={paperId,page,seq}` 续增；'none' 只落账）+PageColumn:203-207 单口消费（夹取→页盒 `scrollIntoView block:'start'`；未就绪挂起就绪补滚）✓。
6. 双源测试锚：reader.store.test 三用例（'none' 引用不变 `toBe(before)` 比内容比较严/夹取先于信号/seq 跨 'none' 续增）✓。

状态机抽验：列级 loading→ready→**error**（W2 新终态，doc/totalPages 变化重置）；页级=rendered 集±IO±PageFrame 卸载哨±PdfPageCanvas effect 取消——行为面与票面状态机等价（实现形态隐式=门一 W4 已判，非阻断维持）。

## ③ 宪法红线终审

- [PASS] **INV-16 白名单四文件封闭集**：eslint.config.js override 块 files 四文件（PdfDocProvider/PdfPageCanvas/TextLayer/CorpusExtractor，主块 message 同步「四文件」）；实物 `from 'pdfjs-dist'` static import 全仓恰三处（PdfDocProvider/PdfPageCanvas/TextLayer）+CorpusExtractor dynamic import（:182，INV-16 已知边界在册）——封闭集未放宽，主块禁令对其余 renderer 文件照常生效。
- [PASS] **PdfCanvas 真删**：`ls` 无此文件+git status `D` ✓（方案切换=删除旧方案红线）。
- [PASS] **行数**：PageColumn **247**/ReaderPage **247**/PdfDocProvider **98**/PdfPageCanvas **153**（wc -l 实测，全 ≤250）；测试文件 page-column.test.tsx 434 行（非组件，≤500 ESLint 线内）。
- [PASS] **受锁 manifest 140**：`grep -c '"path"'` 实测 140；verify log「locks 检查通过：140 个受锁文件与 manifest 一致」；page-column.test.tsx 入锁（manifest 新增条目，回炉 sha 已再生成——generatedAt 04:19 晚于回炉改动）。
- [PASS] **TDD 链**：首轮三轮红证（store 2\|19→变异 2\|19/column 14 failed→变异 2\|12/e2e 断言变异 1 failed）+回炉三轮（f01-red-r1-w2w3 1\|15/f01-mutation-r1-w2 1\|15/f01-mutation-r1-w3 6\|10）——六份日志全在、数字与两份报告逐一一致、变异均「恰中」目标用例族（无误伤面扩大迹象）；还原均 cp 备份法（宪法禁 git checkout 于未提交实现——报告申报与日志时间线自洽）。

## ④ 机器面核对

- [PASS] **679=661+18 数理**：基线 90 文件/661+新增 1 文件 page-column.test 16 用例（14+回炉前 2？否——14 首轮+2 store 扩=16 首轮合计）+回炉 W2/W3 两用例=18；677（回炉前 verify 实测）+2=**679**；verify log:1951 实测 `Tests 679 passed (679)`/91 文件、`VERIFY_EXIT=0` 全链（quality 无占位/无乱码+tickets 一致+locks 140+lint+typecheck+test+build）✓。
- [PASS] **locks 140**（见③）。
- [PASS] **data-ticket 形态评估**：PageColumn:214/:220 两分支根容器上的**真实现标记**（ready 分支=完整页列 DOM 的根容器）——翻 done 后该标记违反规则 4b（done 工单不得残留 open 期机检标记），**必须移除，列入收口动作**（与实现者自裁 6/门一 B-N 判断一致；移除为 2 处属性删除，不触发行为面）。
- [PASS] **src 全号引用分布**：grep `SR2-F-01` src/ =仅注册文件 PageColumn.tsx 4 处（头注 :3/:15+data-ticket :214/:220）——**注册文件外零残留** ✓。
- [PASS] **翻 done 推演**：SR2-F-01 open→done 后——规则 1 注册文件存在 ✓/规则 4b data-ticket 移除（唯一必做项）/其余规则无涉（无占位骨架、无待办）。**e2e 推演**：reader-text.spec:94 `COLUMN_DEPS=[...DEPS,'SR2-F-01']`，:97 skipIfPending——翻 done 后批 1 用例解除 skip（DEPS 其余票已 done：当前 19 passed 中同 DEPS 守卫用例在跑为证）→全量 **20 passed+1 skipped**（剩 reader-scroll.spec F-04 骨架：其 DEPS=[F-01,F-02,F-03,F-04]，F-02/03/04 未 done 仍 skip，语义正确）；批 1 用例通过依据=f01-e2e-newcase.log 无守卫正向实跑（1 passed）+主控亲验 e2e exit 0（19+2 现态）。建议收口时全量 e2e 复跑确认（实现者疑虑 4 同议）。

## ⑤ 成本账本行

| 单元 | token | 时长 |
| --- | --- | --- |
| 实现者（两轮：15.73M/65.1min + 5.54M/10.2min） | ≈21.27M | 75.4min |
| 门一（对抗深审） | ≈0.74M | 12.3min |
| 门二（本档，终审） | ≈0.9M | ≈14min |
| **合计** | **≈22.9M** | **≈101.7min** |

## 总评

**PASS——可收口。**

- 回炉 W1-W4 逐条 ADDRESSED（证据链完整：编号重编+引用面同步零残留/catch+error 终态+恰中变异/同删+Probe 机制锚+恰中 6 用例/申报补录属实）。
- 母本五段+双源忠实、宪法红线全过（白名单封闭/真删/行数 247×2+98+153/locks 140/六轮红证链真实）、机器面数理全合（679/140/引用分布/翻 done 推演）。
- **收口动作清单（主控执行）**：①翻 registry SR2-F-01 done；②同批移除 PageColumn:214/:220 data-ticket（规则 4b 必做）；③受锁提交携 [locked-change]（eslint.config.js/两测试文件/reader-text.spec/manifest——page-column.test.tsx 新入锁）；④全量 e2e 复跑确认 20 passed+1 skipped；⑤建议顺手项：PageColumn 头注状态行 open→done、reader.store:3 TABS-01 状态行遗留正、makeDoc 恒真三元清理（unlock 流程）。
