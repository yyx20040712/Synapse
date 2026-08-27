# SR2-LG-04 门一对抗深审（独立子代理）

日期：2026-08-27 ｜ 审者：门一对抗深审孙代理（独立于实现者，只读）
输入：lg04-diff.patch / LineageSidePanel.tsx 票面头注 / lg04-impl.report.md / lg04-{red,green,mutation,verify}.log
审法：四件输入逐字 + 全部涉改文件源读 + 依赖方（App/anchor-locate/AiNotesSection/check-quality/invariants/registry）交叉核对 + 日志尾注取证。

## 开工技能清点

- **用**：code-review-excellence（对抗审查方法论主体）、verification-before-completion（每条 finding 定稿前回源码/日志复核）。
- **不用**：systematic-debugging（无缺陷复现面）、TDD/subagent-driven-development（禁写实现，红证只验不重做）、git-workflow（铁律禁改动性命令，仅只读 `git diff --stat`/`status` 核范围）、browser/e2e 类（审读面在源码与日志，LG-05 才有 e2e 面）。

## 主控预裁项复核（攻击→维持）

1. **锚递达路径 A（bus 载荷扩）**：攻击面=B（store 信号）是否更优。核实否决：lineage 域写 reader.store 属反向新增跨域互引（COMPOSITION_ROOT_ALLOW 白名单外红线），A 顺「跨域只允许经本模块」（open-paper-bus.ts:8-9 头注明文）架构语义；locateAnchor 已内置 waitOpen 全链（anchor-locate.ts:122-142），A 消费侧只需 30 行定路由；locateAnchor 内部 requestOpenPaper 无锚重发（anchor-locate.ts:125/221）天然防事件环——事件链推演闭合（闩锁主路径：双击→App setView→ReaderPage 挂载→takePendingOpenPaper 取锚请求→openFromBus→locateAnchor→waitOpen 无锚重发→已挂载 handler 走 openFromBus 无锚分支，无二次 locateAnchor）。**维持**。
2. **selectedNodeId 消费=store 查找**：LineagePage.tsx:39 `nodes.find` 消费 lineage.store 既有数据，无第二条取数通道；LG-03 头注预留出口（「04 侧板消费面预留」）兑现。**维持**。
3. **ai-note-style 跨域白名单**：check-quality.mjs:68 一行 map 项+注释块（键=repo 相对正斜杠路径，值=featuresRoot 相对路径，与该脚本 78-96 行解析机制精确匹配——`'../reader/ai-note-style'` 归一为 `reader/ai-note-style` 命中）；ai-note-style.ts:7-9 头注反向锚定存在；LineageSideAiNotes.tsx:8-10 正向锚定存在；映射零复写（QUESTION_COLOR/QUESTION_LABEL/ROLE_LABEL/ROLE_ORDER 四导出单源消费，ai-note-style.ts:16-47）。**维持**。

## A. 母本符合度（逐区核实）

| 票面条款 | 落点 | 判定 |
| --- | --- | --- |
| 区1 元信息（title/year/paperId 绑定徽标） | LineageSidePanel.tsx:143-151（data-binding=paper\|theme+「已绑定文献」徽标） | 符合 |
| 区2 core_idea 只读 | :152-157（whitespace-pre-wrap；空=「（未填写）」；编辑归 03 不在本板） | 符合 |
| 区3 AI 分节分色类名复用 ai-note-style | LineageSideAiNotes.tsx:18（四导出单源）+18 条 role 分组 | 符合 |
| 区4 人工笔记 notes/get | LineageSideManualNote.tsx（Note\|null 总评层，md 只展示不渲染——负面清单红线守住） | 符合 |
| 主题节点两区+「主题节点无笔记」 | SidePanel:158-159；测试断言笔记通道零调用 | 符合 |
| 双击跳转/单击无操作 | SidePanel:124-135 构造单点；测试「单击不触发跳转」 | 符合 |
| 载荷锚三元组+aiNoteId/无锚 anchor 缺省 | hasAnchor（:92-94）；测试 3 用例（0 基 3→2/缺省/页码保留） | 符合 |
| anchorPage 1 基→0 基先例一致 | AiNotesSection.tsx:193-204 `n.anchorPage - 1` 同型；LG-04 payload 面 `number\|null`→Page:52-56 归一 `null→undefined`，终态与 08 一致（08 直书 undefined） | 符合 |
| 无锚=篇级防线 | anchor undefined→openFromBus 走 openPaper 既有链路（open-paper-anchor.ts:19-24） | 符合 |
| 阅读器侧消费（ReaderPage/open-paper-anchor） | ReaderPage.tsx:97-109 两路统一 openFromBus；exact 层 data-ai-note-id=flashAiNote（anchor-locate.ts:184-193，AI-09 既有零改动兑现） | 符合 |
| locateSeq 防 stale | locateAnchor 模块级序号（anchor-locate.ts:97/209）+侧板请求序号守卫（AiNotes:34-48，N7 校准字面） | 符合 |
| INV-20 消费方级页级降级用例 | 测试 4 条（见 C 节） | 符合（边界见 N3） |
| W4 惰性直连（非 store 双取） | AiNotes:34 `api.ai_sensor.listByPaper` 直连；ai-notes.store.ts:14-18 例外声明双向锚定 | 符合 |
| 取数失败 error+重试 | 两面独立 role=alert+data-action=retry（AiNotes:56-72/ManualNote 同型）；测试 2 条 | 符合 |
| 选中态视觉（Board/Canvas 联动） | Board:189 透传→Canvas:207/230-233 accent 描边 2.5+data-selected；Page 全链测试断言 true/false | 符合 |
| 向后兼容（旧 paperId-only 消费者不破） | requestOpenPaper 委托 anchored（bus:37-39）；App.tsx:83 handler 只 setView 不读 detail；library.store/anchor-locate 零改动（grep 实证调用面未变） | 符合 |
| anchor 类型单源在哪 | 双形状：bus `OpenPaperAnchor`（renderer/shared）与 reader `LocateAnchor`（Pick\<Annotation\>+anchorPage?）——分层禁 shared→features import，双形状是分层必然；兼容性由 open-paper-anchor.ts:16 调用点结构 typecheck 强制（缺字段即编译红）。收敛余地见 W2 | 可接受 |

## B. 宪法红线

- **组件 ≤250**：SidePanel 168 / AiNotes 109 / ManualNote 75 / Page 96 / Board 232 / Canvas 248 / ReaderPage 249 / open-paper-anchor 29（wc -l 口径；check-quality `split('\n')` 口径各 +1，报告数字即该口径——非虚报）。全过，ReaderPage=250/Canvas=249 贴上限（实现者已备案）。
- **白名单登记正确性**：见预裁 3；改动最小面（1 map 行+注释段），[locked-change] 尾注义务在收口提交。
- **受锁 130 一致**：manifest.json 实数 130（node 计数）+verify 日志「locks 检查通过：130 个受锁文件与 manifest 一致」+EXIT:0。
- **UTF-8**：涉改文件中文全部目检可读，quality 乱码关通过（verify:11）。
- **分层**：renderer 取数只经 window.api（api/client）；板不直发 bus（Page 编排，票面接口层字面）；lineage→reader 仅白名单一项；无 Node API/绝对路径/新出网 host。
- **无 TODO/FIXME/placeholder**：涉改+新增文件 grep NONE（verify quality 关同证）。
- **git diff --stat**：10 文件 214+/54-，与报告自裁 9 逐字一致；未跟踪新增 4 路径全在票面交付面；dist_new/ 历史残留未触碰。无范围蔓延。

## C. 代码与测试质量

**四档红证**（日志尾注取证）：
1. 红：EXIT:1（1 failed 文件级 import 解析失败/84 文件 596 基线零回归）——文件级红遮用例级，与 lg03 同型已报备，由 M1-M4 断言级变异补足。合法。
2. 绿：85 文件 614 用例 EXIT:0（596+18 精确对账）。
3. 变异：M1 删 0 基转换→3 failed；M2 hasAnchor 恒真→2 failed；M3 定路由恒假→1 failed；M4 stale 守卫删除→1 failed；四轮全 EXIT:1+还原 diff 空（cp 备份法，命令痕迹在 log:7-10）。
4. verify：quality+tickets+locks(130)+lint+typecheck+test 85/614+build 全绿 EXIT:0（分段标记 log:9-37/1956-1957/1996）。

**断言真实性抽检**（非恒真判据）：
- `dot.style.background === QUESTION_COLOR.Q1`（test:980-981）——分色单源行为断言，映射复写即红（M 系未覆盖此条但结构上由 import 单源保证）。
- anchorPage `3→2`（test:1004）0 基转换；`data-selected` true/false 对偶（test:1135-1136）；stale 晚到旧响应 `a-old` 不现（test:1110）——均为行为断言，M1/M4 分别证伪。
- 页级降级静默用例：mock locateAnchor resolve 'page' 断言 showToast 零调用——**消费方级边界**（openFromBus 不重复 toast），符合票面「mock 阅读器侧」字面；真三防线由 anchor-locate.test 既有 9 用例锁定。无缺陷（见 N3）。

**票面测试清单逐项**：四区渲染✓/主题空态✓/双击载荷含锚+aiNoteId✓/无锚缺省✓/单击不跳✓/取数失败重试✓/INV-20 消费方级页级降级✓；另超额交付：stale 守卫/双空数据/未选中空态/Page 编排全链 3 条/人工面独立重试。18 用例 always-active（无 guardedDescribe），grep 计数 18 对报告。

## D. 报告诚实性

- 自裁 1-10 逐条对 diff 属实：路径 A 理由（B=反向跨域违例）经源证成立；data-ticket 保留与 check-tickets 规则一致（verify tickets:check 过=实证 open 期唯一绿形态）；Canvas 行数手术语义零变化（ZOOM 数值同型/LG-02 测试零改动绿）；锚语义链单点转换核实；ReaderPage effect deps [] 无 props 耦合（openFromBus 模块级+getState）成立。
- 数字 85/614/130 对日志全中。
- 微差（不构成诚实性问题）：报告行数为 check-quality split 口径（wc 差 1）；「AiNotesSection:200」实际在 193-204 区段（行号近似）。

## E. 接缝与后续单

- **LG-05 e2e 出口可断言性**：App.tsx:101-106 条件挂载保证跳转后 LineagePage 卸载——侧板 `data-ai-note-id` 条目随之离 DOM，不污染 flashAiNote 的「reader-aside 外优先」候选选择（anchor-locate.ts:187-190）；e2e 可断言面=切 view+PDF 真实文本+`.locate-flash` 类瞬时驻留（FLASH_MS=1200，断言需及时）+降级 toast 文案。
- **LG-05 用例设计注意（N4）**：quote<2 且 anchorPage 非 null 且 tab 未开时，locateAnchor paper 层只 requestOpenPaper 落保存进度页、不跳 anchorPage（anchor-locate.ts:214-224 仅 ready 态 setPage(anchorPage)）——既有语义非本单缺陷，e2e 选 ready 态用例或接受该行为。
- **openFromBus 无 catch 疑虑**：locateAnchor 全路径源读——verifyQuote 有 try/catch（:156-165）、waitOpen/verifyWhenReady 纯返回值、store 调用同步、无 throw 路径；返回值 LocateResult 由内部 toast 消费，openFromBus void 丢弃语义正确。实现者审读结论成立；残余=未来 locateAnchor 加 throw 需补 catch（已备案疑虑段，成立）。
- **W4/白名单/registry**：ai-notes.store 头注例外限定「单约范围限 reader 域消费方」防扩散；registry SR2-LG-04 仍 open（门一审阶段正确，翻状态归主控收口）。

## Findings

- **[W1] docs/invariants.md:34**：INV-20 行锚定方式栏仍书「P7-H 脉络侧板随后续工单」——LG-04 即该工单且消费方级用例已交付，台账 cell 未刷新。非票面义务（票面只要求测试与头注锚定，均已落），建议收口单同步该行（或在 LG-05 一并），防「已交付但台账显示待补」的接缝盲区。低危。
- **[W2] src/renderer/shared/open-paper-bus.ts:20-25**：OpenPaperAnchor 手写 quote 三元组，而 LocateAnchor（anchor-locate.ts:69-73）用 `Pick<Annotation,...>` 收敛——bus 侧可同样 `Pick` 自 `@shared/models/annotation`（shared 可引 shared/models，分层允许），使三元组字段随 Annotation 单源漂移。现状由 open-paper-anchor.ts:16 调用点结构 typecheck 兜底（LocateAnchor 加必填字段即编译红），风险低。低危，可入后续清理。
- **[N1] src/renderer/features/lineage/LineageSideAiNotes.tsx:109**：文件末尾无换行符（diff 带「No newline at end of file」标记）——lint/quality 未拦，收口提交时顺手补齐。
- **[N2] 报告口径**：行数/行号微差（split 口径 vs wc、AiNotesSection:200≈193-204）——口径差非虚报，无需回炉，备案提醒后续报告注明口径。
- **[N3] tests/unit/renderer/lineage-side-panel.test.tsx:941-946**：页级降级用例为 mock 边界（符合票面字面），真降级链已由 anchor-locate.test 锁定——无行动项，防门二误读为覆盖缺口。
- **[N4] 接缝观察（LG-05 输入）**：见 E 节 tab 未开+无引文有页码的落页语义与 flashAiNote 候选选择前提（LineagePage 卸载）。

## 统计

- 阻断（B）：0 ｜ 警告（W）：2（均低危、均非票面义务）｜ 观察（N）：4
- 预裁项推翻：0/3（攻击后全部维持）
- 票面条款覆盖：A 节 17/17 符合；测试清单 7/7 项落 + 超额 5 面
- 日志对账：红 EXIT:1 / 绿 85·614 EXIT:0 / 变异 4 轮全红还原净 / verify 全段 EXIT:0 / locks 130 / diff 10 文件 214+54-

## 总评：**PASS**

母本逐区符合、路径 A 落地质量经对抗推演闭合（向后兼容+防回环+单点转换）、宪法红线零触碰、四档红证+18 用例断言真实、报告自裁与数字逐条对得上。两 W 均低危且非票面义务（台账刷新/类型微收敛），随收口或后续单处置即可，不构成回炉依据。
