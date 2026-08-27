# SR2-LG-04 门二终审（独立孙代理）

日期：2026-08-27 ｜ 审者：门二终审孙代理（独立于实现者与门一）｜ 铁律：只读，唯一可写=本文书
输入：票面 LineageSidePanel.tsx 头注 / ADR-0014 / 蓝图 N3（ROADMAP:343）/ lg04-diff.patch（工作树即终态，无回炉）/ lg04-impl.report.md / lg04-gate1.md / lg04-{red,green,mutation,verify}.log / locks/manifest.json / docs/invariants.md / tickets/registry.ts

## 开工技能清点（宪法会话开工纪律）

- **用**：code-review-excellence（终审=对抗式深审方法论）、verification-before-completion（每条结论回源文件/日志/机器计数复核后才定稿）。
- **不用**：systematic-debugging（无缺陷复现面）；test-driven-development（只读审 TDD 证据链，不写实现）；git-workflow/subagent-driven-development（铁律禁改动性命令、禁派发）；browser/e2e 类（审读面在源码与日志，e2e 属 LG-05）。

## ① 处置核对（门一 2W/4N vs 终态）

| 项 | 门一裁决 | 终态核对 | 判定 |
| --- | --- | --- | --- |
| W1（INV-20 台账 cell 未刷「随 SR2-LG-04」） | 建议收口同步 | **主控已修**：invariants.md:34 强制方式栏书「P7-H 脉络侧板随 SR2-LG-04」+锚定状态栏书「脉络侧板消费方级=SR2-LG-04，2026-08-27」。**docs/invariants.md 不在 locks manifest 受锁清单**（manifest 检索实证 NOT LOCKED）→ 修复不触碰 manifest；manifest 仍 130 条、check-quality sha 工作树↔manifest 双向一致（2244a00c…，sha256sum 实证）——「sha 同步 130」核对通过 | 闭合 |
| W2（bus OpenPaperAnchor 手写三元组可 Pick 收敛） | 主控裁记录不采 | 无终态动作；open-paper-anchor.ts:16 调用点结构 typecheck 兜底在位（LocateAnchor 加必填字段即编译红）。低危记录，后续清理面 | 闭合（不采） |
| N1（LineageSideAiNotes.tsx 末尾无换行） | 收口提交顺手补齐 | **终态仍未补**（od 实证文件以 `}` 结尾无 \n；wc -l 109 vs split 口径 110 同证）。属主控收口动作项，非本单阻断——**收口清单提醒：补末行换行** | 留收口 |
| N2（报告行数/行号口径微差） | 备案提醒 | 无行动；门二复核行数双口径均过（见③） | 闭合 |
| N3（页级降级用例为 mock 边界） | 防误读备案 | 真三防线由 anchor-locate.test 既有 9 用例锁定（INV-20 台账同证）；票面「mock 阅读器侧」字面吻合，非覆盖缺口 | 闭合 |
| N4（tab 未开+有页码无引文落页语义，LG-05 输入） | 观察备案 | 既有 anchor-locate 语义（仅 ready 态 setPage），非本单缺陷；LG-05 用例设计输入 | 闭合 |

## ② 母本符合度（票面五层 vs 蓝图 N3+ADR-0014）

- **四区（N3 字面「元信息+核心 idea+AI/人工笔记」）**：区1 元信息（title/year/绑定徽标 data-binding=paper\|theme，SidePanel:143-151 终态 diff 实证）／区2 core_idea 只读（whitespace-pre-wrap，空=「（未填写）」，编辑归 03）／区3 AI 分节（LineageSideAiNotes：role 三组中文标签+QUESTION_COLOR/QUESTION_LABEL 单源消费，分组本域重写守 Rule of Three）／区4 人工笔记（LineageSideManualNote：notes/get→Note\|null 总评层，contentMd 纯文本呈现——负面清单「md 不渲染」守住）。**符合**。
- **主题节点边界（ADR-0014 E3/E5：paperId null=纯主题节点阶段分组）**：仅前两区+「主题节点无笔记」+笔记通道零调用（测试两条断言实证）。**符合**。
- **双击跳转（N3：与 N1 共享 INV-20 单入口）**：AI 条目双击→handleNoteDblClick（构造单点：三元组透传+anchorPage 1 基→0 基）→LineagePage 编排 requestOpenPaperAnchored→App 切 view→ReaderPage 闩锁补读/实时监听→openFromBus 定路由→locateAnchor 单入口；无锚→openPaper 既有链路。单击条目无操作（防误触，测试断言）。**符合**。
- **INV-20 单入口纪律**：消费侧零自写降级——页级/篇级降级提示归 locateAnchor 内部，openFromBus 不重复 toast（消费方级用例「resolve page 静默零 toast」实证）。**符合**。
- **票面五层逐层**：行为层（四区/双击/单击/主题边界/W4 直连 window.api）✓；接口层（props 签名逐字吻合票面字面——node: LineageNode\|null+onJumpToPaper payload 形状+aiNoteId?；板不直发 bus，发送单点在 LineagePage）✓；架构层（lineage 域+window.api+ai-note-style 白名单+shared/open-paper-bus；无 Node API/绝对路径）✓；生命周期层（不做面全守：无侧板编辑/无自动跳转/主题节点无人工笔记面）✓；文化层（INV-02 列表型 error+重试两面独立/空态非错误/动作型 toast 文案保持/受锁测试 18 用例 always-active）✓。
- **主控预裁三项终审**：
  1. 锚递达路径 A（bus 载荷扩）——落地+自裁申报 1 完整；requestOpenPaper 委托 anchored 保持单字段签名（library/anchor-locate 既有调用方零改动，diff 实证调用面未变）；locateAnchor 内部无锚重发防事件回环。**兑现**。
  2. selectedNodeId=03 出口兑现——LineagePage nodes.find（lineage.store 既有数据消费，非双取）→Board:190 透传→Canvas 可选 prop（sel 描边 2.5+data-selected；缺省行为不变，LG-02 受锁测试零改动全绿实证）。**兑现**。
  3. check-quality 白名单登记——见③。**兑现**。

## ③ 宪法红线终审

- **组件 ≤250**（wc 口径/split 口径双验）：SidePanel 168/169、AiNotes 109/110、ManualNote 75/76、Page 96/97、Board 232/233、Canvas 248/249、ReaderPage 249/250、open-paper-anchor 29/30、open-paper-bus 52/53。**全过**；ReaderPage 恰压 250、Canvas 249——实现者已备案贴线疑虑，后续扩展先拆（无阻断）。
- **跨域白名单正确性**：check-quality.mjs 改动面=COMPOSITION_ROOT_ALLOW +1 map 行（`['src/renderer/features/lineage/LineageSideAiNotes.tsx', ['reader/ai-note-style']]`）+注释块（SR2-LG-04 例外理由：INV-11 跨域复用与域内复写二害取轻+W4 数据面直连）——键=repo 相对正斜杠、值=featuresRoot 相对路径，与脚本 78-96 行解析机制精确匹配（门一预裁 3 复核采信+diff 终态目检）。**双向锚定声明落齐四方**：ai-note-style.ts 头注（+LG-04 LineageSideAiNotes 跨域只读消费受控例外）↔LineageSideAiNotes.tsx 头注（单源消费禁复写+指回 ai-note-style）↔ai-notes.store.ts 头注（W4 例外：不经本 store+单约范围限 reader 域）↔check-quality 注释块。映射零复写（四导出 import 单源，测试断言 dot.style.background===QUESTION_COLOR.Q1）。
- **受锁 130**：manifest 实数 130（node 计数）+verify log:26「locks 检查通过：130 个受锁文件与 manifest 一致」+check-quality sha 工作树↔manifest 双向一致（sha256sum 实证 2244a00c…）。unlock→批内改→generate→apply 全程留痕（报告 locks 实录+manifest diff generatedAt 更新）。[locked-change] 尾注义务随收口提交（报告已声明）。
- **UTF-8**：涉改+新增文件中文全部目检可读；verify quality 关「无占位标记/无乱码/无跨域引用」通过（log:11）。
- **分层/安全禁令**：renderer 取数仅经 api/client；板不直发 bus（Page 编排）；lineage→reader 仅白名单一项；无 Node API/绝对路径/eval/新出网 host/SQL 面。diff 全文目检零触碰。
- **TDD 四档**：
  1. 红：EXIT:1 落尾（文件级构造红——open-paper-anchor 模块不存在 import 解析失败；基线 84 文件 596 用例零回归，red.log「1 failed \| 84 passed (85)/596 passed (596)」实证）。文件级红遮用例级由 M1~M4 断言级变异补足（lg03 同型报备）——合法。
  2. 绿：85 文件 614 用例 EXIT:0（green.log 尾+Test Files/Tests 行）。
  3. 变异四轮：M1 删 0 基转换→3 failed/611；M2 hasAnchor 恒真→2 failed/612；M3 定路由恒假→1 failed/613；M4 stale 守卫删除→1 failed/613——四轮全 EXIT:1 且**数学自洽**（614−失败数=passed 数逐轮吻合）；四轮还原 diff 全空（M1~M4-RESTORE-DIFF-EMPTY 标记）；cp 备份法命令痕迹在案（mutation.log:7-10）——**宪法「变异红证禁 git checkout、用文件备份法」条款守住**。
  4. verify：quality+tickets+locks(130)+lint+typecheck+test(85/614)+build 七段全绿 EXIT:0 落尾。
- **流程三条（三屋模式）**：实现者禁 git/registry——registry:199 SR2-LG-04 仍 open（翻状态归主控收口，正确）；每单元成本账本（实现者/门一已记，本文书⑤补门二行）；新测试 always-active 不经 guardedDescribe（grep 实证零 guardedDescribe）——K3 威胁结构性在位。

## ④ 机器面核对

- **85/614 数理**：`find tests -name "*.test.ts(x)"` 全库实数 **85** = 84 基线+1（lineage-side-panel.test.tsx）✓；614 = 596+18，新测试 `it(` 计数实数 **18** ✓；green/verify 双 log「85 passed (85)/614 passed (614)」✓。
- **locks 129→130 推演**：manifest diff 仅 +1 条目（tests/unit/renderer/lineage-side-panel.test.tsx）+check-quality.mjs sha 行变更+generatedAt——129+1=130 成立，无其他受锁面暗改。
- **registry 翻 done 预演**（check-tickets.mjs 六规则逐条推演）：
  - 规则 1/6：票面文件存在+`// b3: P7-H` 指针在头注区（LineageSidePanel.tsx:1），ROADMAP 已裁决集含 P7-H ✓。
  - 规则 2（src/tests 引用一致性）：SR2-LG-04 全号残留 grep 实证 5 处——①LineageSidePanel.tsx:3 头注（**票面文件自身豁免** t.file===rel）②③:113/:139 data-ticket（**规则 4b 将红——翻 done 前必须移除**，实现者自裁 2+门一已预告，主控收口标准动作序：删标记→翻 done→verify）④check-quality.mjs:58 注释（**scripts/ 目录不在规则 2 扫描范围**（只扫 src+tests），不触发；且属白名单登记正当引用非占位）⑤tests/e2e/lineage.spec.ts:38 DEPS 数组（**tests 分支仅限 placeholderCallRe**，数组引用合法=LG-05 激活守卫机制）。**预演结论：唯一动作=移除票面 data-ticket 后翻 done，无未知雷**。
  - 新文件头注（LineageSideAiNotes/LineageSideManualNote/open-paper-anchor.ts）：grep 实证零 SR2-LG-04 全号（一律 LG-04 短式，自裁 10 属实）——翻 done 后规则 2 无 src 面票面外残留。
  - 规则 3/5：票面文件无 NotImplemented/unimplementedObject；新测试无 guardedDescribe 误挂。
- **e2e 面申明**：e2e 用例实数 = **16**（smoke 4+reader-text 8+ai-notes-section 2+corpus-export 1+zcode-link 1）**+1**（lineage.spec.ts 占位，skip 态守卫：DEPS∪自身未 done）= 17 格。**本单 diff 零触碰 e2e**——「16+1 不变」申明成立；LG-05 落地后占位替换为真实用例组（16→17，spec 头注预告一致）。

## ⑤ 成本账本行

门二终审孙代理（本单）：输入约 6.0 万 token（四件输入+涉改九文件终态+check-tickets/check-quality 规则+manifest/registry/ROADMAP/ADR 交叉面）、输出约 0.8 万 token（含本文书）、工具调用 12 次、墙钟约 15 分钟。

## 总评：**PASS**

四清单全部闭合：①门一 2W/4N 处置核对（W1 主控已修且 invariants 非受锁、manifest 130+sha 双向一致；W2 记录不采；N1 留收口补换行；N2-N4 备案）——无失控项。②母本符合度：蓝图 N3 四区/双击跳转/INV-20 单入口/ADR-0014 主题节点边界逐项吻合，票面五层逐层兑现，主控预裁三项全落地。③宪法红线零触碰：组件行数双口径全过（ReaderPage 250 压线已备案）、白名单改动最小面+四方锚定落齐、受锁 130 一致、UTF-8、TDD 四档完整且变异数学自洽（614−failed=passed 逐轮吻合+cp 备份法合规）、三屋流程纪律守住。④机器面全数理对上（85=84+1/614=596+18/130=129+1/e2e 16+1 不变）；翻 done 预演唯一动作=移除 data-ticket（与既定收口流程一致，无未知雷）。

**主控收口清单**（门二移交）：1) LineageSidePanel.tsx 两处 data-ticket="SR2-LG-04" 移除→registry 翻 done→亲验 verify 真退出码；2) LineageSideAiNotes.tsx 末行换行补齐（N1）；3) 提交带 [locked-change] 尾注+locks manifest 随提交同步。
