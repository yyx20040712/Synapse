# SR2-F-08 门一对抗深审档（三屋模式第二屋）

日期：2026-08-29 · 审计人：门一子代理（只读） · 对象：`sr2-f-08-gate1.diff`（413 行）+ 工作区实物
结论先行：**PASS（0B / 4W / 7N）**——无阻塞项；4 条警告均不构成返工依据，附收口处置建议。

## 0. 开工技能清点（宪法首步备案）

- code-review-excellence：**用**（本任务=对抗性深审核心方法论）。
- verification-before-completion：不用——只读审计，铁律禁跑 test/verify/e2e，验证面=静态推演+hash 实算+log 取证。
- systematic-debugging：不用——非缺陷定位任务。test-driven-development：不用——禁改代码/测试。
- git 类 / browser 类：不用——禁 git 写操作、无浏览器取证需求。
- 配置自查：审计角色只读，无派发面；本档唯一可写=本文件。

## 1. A 工单：母本符合度（diff vs 票面 P1~P4+五层规约+ADR-0019）

**[N1] ::selection 值逐字一致 ✓，但 e2e/头注「678-685 行原值」措辞略过宽**
- 实测官方 `node_modules/pdfjs-dist/web/pdf_viewer.css:678-685`：两条规则各含两行声明——第一行 `background:rgba(0 0 255 / 0.25);`（679/684）、第二行 `background:color-mix(in srgb, AccentColor, transparent 75%);`（680/685）。
- 实现 `src/renderer/features/reader/text-layer.css:68/:72` 逐字=官方第一行（含现代空格语法 `rgba(0 0 255 / 0.25)`）；color-mix 第二行按票面「Chromium 不解析 ::selection 的 color-mix——禁用」不抄 ✓。
- 措辞项：`tests/e2e/reader-text.spec.ts:666`「逐字=…678-685 行原值」——678-685 行含未抄的 color-mix 两行，严格说抄的是其中第一行声明。票面原文即用「678-685」指代两条规则并同时声明不抄第二行，口径沿用票面，非实现者的措辞缺陷。记录不拦。
- 隐含语义差（极远期）：官方 css 若在支持 color-mix::selection 的引擎上会升级为 AccentColor 系选色，本实现永久锁蓝。Electron=Chromium-only，当下零差异。记录。

**[PASS] br 规则未动 ✓**：`text-layer.css:75-81` 两规则保持 `transparent`，与官方 688-694 行同构；diff 上下文行无改动。特异性推演：`.textLayer br::selection`（0,1,2）> `.textLayer ::selection`（0,1,1），br 上 transparent 稳定生效，与源序无关。

**[PASS] SelectionLayer 五处摘除净 ✓**：import（diff -51）、`PendingSelection.overlay` 字段（-94）、evaluate 内 tlBox+overlay 字面量（-153~165）、渲染块 SelectionRects 行+fragment（-235~236）、头注 F-07→F-08 改写——五处全在 diff，无残留半成品（当前文件全文核对，无 orphan 引用/字段）。

**[PASS] P4 四不做零触碰 ✓**：AnnotationLayer/AiAnnotationLayer/SelectionToolbar/mergeLineRects 均不在 diff（git diff --stat 实核=6 文件：manifest/SelectionLayer/SelectionRects 删/text-layer.css/两测试）；防抖值 `SELECTION_DEBOUNCE_MS = 200` 未动（SelectionLayer.tsx:63）；AnnotationLayer.tsx:198 multiply 语义原样（ADR-0019 决策 3）。

**[PASS] 五层规约/ADR-0019 逐节**：行为层（原生即时+mouseup/防抖仅驱动工具条+pending 无自绘 DOM ✓）、接口层（SelectionOverlayBox 随组件删，全仓无导出消费方 ✓）、架构层（层叠序终态头注登记 ✓、零新依赖 ✓）、生命周期层（清理语义零变 ✓）、文化层（红证/变异/落盘/报告全链在场，见 B 工单）。

## 2. B 工单：宪法红线

**[PASS] 分层/安全**：改动全部在 renderer reader 域；无 SQL/eval/出网/新依赖/CSP 触碰；renderer 无 Node API 引入。

**[PASS] 受锁流程（unlock→改→apply）hash 实算核验**：
- `tests/e2e/reader-text.spec.ts` sha256（LF）=`42f51abc…c5c5` = manifest ✓
- `tests/unit/renderer/selection-layer.test.tsx` =`2430a596…aa0e` = manifest ✓
- 4 条新增取证脚本中 3 条 hash 匹配 manifest ✓。
- 行数：SelectionLayer.tsx 实算 226 行 ≤ 组件 250 红线 ✓；UTF-8 中文全部可读 ✓。

**[N2] f1-forensics2.mjs hash 时差实锤（预裁项确认，收口硬前置）**：实算 `3152ac55…881` ≠ manifest `361d7ff3…c0c`——主控修 lint（删 unused rm）在 apply 之后所致，与预裁声明完全吻合。推论：**当前工作区 `locks:check` 必红**，主控收口「重 apply 同步 hash」不是可选步而是 CI 绿的前置条件。预裁成立不推翻。

**[W1] 变异红证形态：F-08 守卫红在 :282（toolbar 消失连带）而非 :284（selRects 断言）——断言级红证由首红日志补位**
- `sr2-f-08-mutation.log`：变异=渲染块**提前 return** selection-rects div（顶掉 toolbar）→6 failed 中 5 个（P1/P3/P4/P5/P6）红因=toolbar 被顶掉；F-08 守卫本身红于 `selection-layer.test.tsx:282`（`expect(toolbar()).not.toBeNull()`），**:284 的 `expect(selRects()).toBeNull()` 未被执行到**（断言短路）。
- 严格「断言级」口径下此变异未直接触发新断言；若变异形态为「**追加** div 保留 toolbar」，可得 1 failed 的精准红。
- 补位证据：`sr2-f-08-red.log` 首红时旧实现 toolbar+rects **同时在场**，:282 过、**:284 红**（红因精确=selection-rects DOM 在场）——新断言非恒真且能捕获「toolbar 在场+自绘层回归」的精确回归形态。守卫有效性结论成立，票面字面要求（「恢复一个 selection-rects div→unit 守卫红」）满足。不拦，记警告供后续单变异设计参照。

**[W2] 变异还原「diff 确认空」的原始输出未落盘**：报告 §4 称输出 `DIFF-EMPTY restore ok`，但 `sr2-f-08-mutation.log` 以 `exit=1` 结尾、无还原段；三份证据档均无该输出。**实物自证成立**：当前 SelectionLayer.tsx 全文核对无变异残留（无 selection-rects div/提前 return），还原事实无疑；缺的是过程输出的落盘凭证。宪法变异还原纪律要求「cp 备份→变异→测→cp 还原→diff 确认空」——操作链报告完整、复核档缺末环。轻警告，建议后续单把还原确认 echo 进同一 log。

**[PASS] verify 真退出码+诚实勘误**：`sr2-f-08-verify.log` 尾段各环真退出码齐全；首跑 `lint-exit=0` 管道假码已在档内显式勘误为 1（红源=主控未跟踪 f1-forensics2.mjs，非本单四文件——本单四文件 lint/typecheck 0 的声明与 log 自洽）。

**[N3] tickets:check 结构性红=预裁成立**：verify.log:26 实证红在规则 4（「SR2-F-08（open UI 工单）缺少 data-ticket 占位」）；registry.ts:224 实核 `status: 'open'`+SelectionLayer.tsx 全文无 data-ticket 占位。主控翻 done 后规则 4 不再查（open 才查）+规则 4b（done 残留占位）也过（占位已删）——时序红按预裁解除，K3 设计内。

## 3. C 工单：代码与测试质量

**[PASS] 删净度（全仓 grep 推演）**：`SelectionRects|selection-rects|SelectionOverlayBox|selection-rect` 终态分布——
- src/ 三处全为历史/决策记载：SelectionLayer.tsx:12 头注、text-layer.css:25 头注、LineageNodeCard.tsx:4「拆件先例」（票面 P1.2 明示不动）✓；
- tests/ 两处=防回归守卫（unit:92 探针、e2e:687 toHaveCount(0)）——语义正确：探针查 DOM 不在场，自绘层回归即红 ✓；
- scripts/audits/f1-forensics{,2,3,3b}.mjs=取证历史产物（见 N4）。
- 无活代码残留、无孤儿导出 ✓。

**[N4] 锁内取证脚本不可直接重跑复评**：f1-forensics3.mjs:43/3b.mjs:47 等 `waitForSelector('[data-testid="selection-rect"]', {timeout: 8_000})`——自绘层删除后重跑必 8s 超时红。与取证报告 §5 口径一致（保留=证据防篡改；复评配方=v4 新脚本，归主控）——非缺陷，提醒收口勿误用旧脚本当复评器。

**[PASS] e2e 新断言健全性**：
- 正则 `/^rgba\(\s*0\s*,\s*0\s*,\s*255\s*,\s*0\.25\s*\)$/`：四分量全锁+仅容忍空格——不过松（0/0/255/0.25 任何漂移即红，含 F-06/F-07 两种旧值）；不过严（Chromium 对 rgba 声明的 computed 序列化稳定为逗号形态，与 F-06 时代实测『transparent/rgba(0,0,0,0) 家族』同源序列化器）。实测首跑归主控收口（流程内，见 N6）。
- `toHaveCount(0)` 无 flake 面：绿路径（rects 永不出现）立即过；红路径（回归时 rects 与 toolbar 同 commit 挂载，toolbar 可见断言先行）重试 5s 后定红。
- timeout 1_500 的 L7 语义=真预算 ✓：取证实测防抖路径中位 203~218ms（f1-forensics.report §2.1），1.5s≈7 倍余量，覆盖 playwright 轮询+慢机渲染；窗口此时已热（20s 可见断言已过）。收紧自 5_000=票面明令，L7 首实例落地。

**[PASS] unit 守卫无恒真风险**：F-08 守卫（:275-285）双断言结构——:282 锁「toolbar 在场」（组件整体坏掉先红于此，守卫不空转）、:284 锁「rects 不在场」；首红日志证明 :284 可红（B/W1）。always-active（不经 guardedDescribe）✓ K3 面在场。

**[PASS] 头注三处声明一致**：SelectionLayer.tsx:8-13 ↔ text-layer.css:20-25 ↔ ADR-0019 决策 1/2——「视觉=原生 ::selection、官方值、自绘层删、ADR 指针」三面同口径；unit 头注:10-13 与 e2e 注释:665-668 亦同口径。

## 4. D 工单：报告诚实性

**[PASS] §2 文件清单 vs diff 实物**：清单 6 项=diff 6 文件，一一对应，无漏报/多报；`git diff HEAD --stat` 实核 78 insertions/174 deletions=报告数字（含 registry.ts M——报告已注明为主控建单产物，非己改动，无冒领）。
**[PASS] 行数声明**：SelectionLayer 249→226 实算吻合（hunk 增减累计 -23）。
**[PASS] §7 自裁 a~h 逐条攻击结论**：
- a 渲染块单子元素直接返回：React fragment 不产生 DOM 节点，与「fragment 包单子」DOM 等价，挂载/卸载/diff 行为不变——自裁成立；
- b 注释微调（:131「并列检查保留防御语义」）：消费方已删原注释失真，接缝纪律的正向修正，行为零变——成立；
- c 四分量正则：实现报告自称「双形态的并集」**措辞不确**——票面双形态=「精确值 OR 等价 alpha 解析」，正则实为单一精确形态+空格容忍（比票面主选更严），非并集。实质无风险（更严不更松），纯措辞美化，记 N7；
- d/e 注释同步/措辞自拟：属实；f 规则 4 非 4b：verify.log 实证；g 假码勘误：档内实证；h manifest 4 条：实锤。
- 全部自裁站得住，无一虚报。

**[N7] 报告 §7-c「双形态的并集」措辞与实物不符**（实质=更严的单一精确形态），无风险，纯诚实性微瑕记录。

## 5. E 工单：接缝与后续单

**[PASS] 既有消费面完好**：全 spec grep——reader-text.spec.ts 消费 selection-toolbar 共 7 处（:177/:277/:411/:466-467/:498-499/:582）+reader-scroll.spec.ts:233，**均不消费 selection-rects**（全 tests/ 该 testid 仅 e2e:687 新守卫一处）——SelectionToolbar 零改动+其他用例从不依赖自绘层，删除不破坏任何既有断言。:684 收紧的 1_500 只影响本测试，其余用例默认 5s 不变。
**[PASS] B9 零宽 rect 确属范围外**：取证报告 §5 归属 annotation-anchor 域（入库脏数据，渲染无害）；票面 P4 明示不做；diff 未触 mergeLineRects/clientRectsBetween——三方一致，无越界也无漏做。

## 6. 附加强制审项 1：事件时间线逐帧推演（渲染块结构变化+SelectionRects 删除后）

**[PASS] mouseup→evaluate(true)→setPending→commit→toolbar 链无新竞态**：
- evaluate 内删除的 `tlBox = textLayer.getBoundingClientRect()` 是纯减法——少一次布局读取（原为强制 reflow 点），语句先后顺序未重排，无新增交错窗口；
- `setPending({anchor,pageNo,x,y})` 四字段均在删除 overlay 前已计算完成，无悬空引用；
- React commit：渲染树 fragment[Rects,Toolbar]→[Toolbar] 单子——fragment 本不产 DOM，DOM 语义等价；卸载路径（Escape/unmount）return null 同构；
- SelectionToolbar props 七项逐一未动（containerRef/x/y/busy/color/onColor/onSave）。
**[PASS] 保存清选区路径闭环正确**：save() 成功分支 :201 `setPending(null)`→:202 `removeAllRanges()` 同步连续执行（React 18 批处理，中间无渲染间隙）——原生选区清→::selection 蓝 tint 消失+toolbar 卸载，视觉与状态同帧收敛。
**[PASS] 页回收/zoom 重建路径未波及**：DOM 卸载→浏览器坍缩选区→selectionchange→200ms 防抖 evaluate(false)→setPending(null)，链路零触碰。
**[W3] Escape 路径视觉语义差（未声明假设——本单最重发现）**：代码链零变（keydown→setPending(null)→toolbar 收）✓；但 F-07 时代 Escape 同时卸载自绘层=**选区视觉随之消失**，F-08 后 Escape 只收工具条，**原生 ::selection 蓝 tint 随选区保留**（浏览器 Escape 不清选区，点击别处才清）。即票面行为层「Escape 行为零变」在**功能行为**维度成立、在**视觉通道**维度不成立——视觉语义已随 ADR-0019 决策 2（视觉=原生选区）隐式移交，但 ADR-0019 后果节未登记此点（「不变：Escape 零触碰」只写了代码事实）。属「依赖未声明假设」的轻症：机制上=官方 pdf.js/浏览器标准同款、无功能损害，但主控真机复评应显式确认「Esc 后蓝 tint 残留至下次点击」可接受，并作为 ADR-0019 后果补记或 invariants 登记候选。不构成返工（改它反而需要动 Escape 链=违反 P4）。

## 7. 附加强制审项 2：CSS 皮肤类推演（::selection 改动）

**[PASS] 级联特异性无压制风险**：全仓 grep `::selection|::-moz-selection`——src/*.css 唯一来源=text-layer.css（theme.css/其余样式零 ::selection 规则）；官方 pdf_viewer.css 未被整体引入（TextLayer.tsx 唯一入口引提取件，无双份规则互叠）。`.textLayer ::selection`（0,1,1）无任何竞争者，不存在被全局/高特异性规则压掉的路径；br 规则（0,1,2）特异性分胜负，源序无关。
**[PASS] rgba(0 0 255 / 0.25) 透字正确性**：textLayer span `color:transparent`（:44）+canvas 字形在下，25% 半透明背景→黑字透出（白纸合成 rgb(191,191,255)、B-R=64，取证报告 §4 已算且在像素管线可测）——与 F-06「不透明遮字」教训对偶，半透明即官方透字机制，endOfContent（div，非 span/br）同样被 (0,1,1) 覆盖=官方同构。
**[N5] AnnotationLayer multiply 视觉互作用=既有语义回归，可接受**：z5 multiply 层在选色之上——已高亮（黄）区域再划选时 25% 蓝底×multiply 黄≈暗绿。该组合在官方默认路线时代（初代 ::selection 即 rgba(0,0,255,.25)）即在场且三轮零投诉（取证 §3 复盘表），ADR-0019 决策 3 明确保留 AnnotationLayer 不动——回退官方值=回到历史已知态，非新引入回归。记录真机复评观察点（暗绿观感）即可。

## 8. 主控预裁项复核（攻击尝试——均未推翻）

1. manifest 158 条保留：4 条取证脚本入锁=防篡改，hash 时差（N2）已实锤且预裁声明吻合——成立。
2. tickets:check 结构性红：registry:224 open+占位删实证，翻 done 即双规则皆过——成立。
3. 自裁 a~h：逐条攻击完毕（D 工单），全部站得住（c 措辞微瑕 N7）。

## 9. 统计与总评

- **0B / 4W / 7N**（W1 变异形态红因混杂靠首红补位；W2 还原确认输出未落盘但实物自证；W3 Escape 视觉残留=未声明假设/ADR 后果遗漏；W4 见下）
- **[W4/N6] e2e 全量首跑（含正则实测序列化形态）归主控收口**——票面流程内安排（报告 §8.1 如实申报），受锁 e2e 改动后全量 verify 兜底纪律未豁免；计入 W 以确保收口单不遗漏。
- N 清单：N1 措辞精度；N2 locks:check 收口硬前置（重 apply）；N3 tickets 时序红；N4 旧取证脚本不可作复评器（需 v4）；N5 multiply 互作用观察点；N6=e2e 首跑（与 W4 同事实双计口径）；N7 报告 §7-c 措辞。
- **总评：PASS**——母本符合度全项吻合、宪法红线无触碰、TDD 证据链成立（首红真实+断言级红证经首红补位）、报告诚实、接缝完好；4W 均为收口处置项/后续登记项，无一需实现回炉。
