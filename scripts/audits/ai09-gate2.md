# SR2-AI-09 门二终审报告

日期：2026-08-27 ｜ 审查者：门二终审孙代理（独立于实现者与门一，只读；唯一可写=本文件）
输入：票面头注（AiAnnotationLayer.tsx）+ ADR-0015 §3 + ai09-diff.patch（950 行）+
ai09-impl.report.md + ai09-gate1.md + 五日志（red/green/mutation/verify/e2e）+ locks/manifest.json + registry.ts + git status。

技能清点：verification-before-completion / code-review-excellence——用（终审=完成前
验证+对抗审查）；TDD / systematic-debugging / subagent-driven-development——不用
（只读终审无实现/调试/派发面）。配置自查：本代理只读铁律，无 npm/test/git 改动性命令。

## ① 处置核对（门一 findings vs 终态）

- 门一 PASS（0B/1W/3N）复核属实：
  - [W-C1] 变异 M1 退出码口径——mutation.log 实证 M1 行 exit=0（grep 管道码）但
    同套 `1 failed | 490 passed` + FAIL 行俱在；M2/M3 `npm exit=1`。红证实质成立，
    按门一裁不阻断。下批模板项，非本单回炉事由。
  - [N-A1] anchorPage=null 缺省不过滤——头注第 15-16 行「缺省不过滤，verifyQuote
    兜底」已声明，已声明非未定义行为。属实不阻断。
  - [N-A2] selectedId 只增不清——diff 第 167 行 state 无清除路径；纯视觉态、票面
    未要求。属实不阻断。
  - [N-D1] 报告计数口误（11→实为 12 文件）——git status 复核：8 实现 M+3 测试
    （2 M+1 新增）+manifest=12，与 diff.patch 文件清单一致，无蔓延无遗漏。属实，
    知悉即可。
- 主控追认项落地核实：受锁 08 单测断言更新（ai-notes-section.test.tsx 第 433-688
  行——`toHaveBeenCalledWith` 期望对象加 `aiNoteId: 'a1'`+注释）为**断言变严**
  （精确匹配新增字段传递链，非放宽）；diff 内受锁测试改动仅此一处+spec 扩用例+
  新增测试文件三处，与 manifest 117→118 三条目（1 新增+2 更新 sha）精确对应。
  追认有效落地。
- data-ticket 待收口移除——实现版容器保留 `data-ticket="SR2-AI-09"`（含删除注释），
  符合 check-tickets 规约 4 open 期要求（verify log 19 行「tickets 检查通过」亲证）。

## ② 母本符合度（票面五层 vs ADR-0015 §3 N2 渲染面）

- **重锚同管线（§3「verifyQuote 重锚取得 rects 同一几何管线」）**：effect 内
  verifyQuote→findRangeAtOffset，annotation-anchor 唯一 DOM 遍历点，无另写几何；
  容器 zIndex:5/pointerEvents:none/mixBlendMode:multiply 与 AnnotationLayer 同值。
  §3 字面「入 AnnotationLayer」被票面细化为并置同形层（头注声明+ReaderPage 458
  行同宿主并置），几何对等实质满足。**符合**。
- **存储独立**：§3「数据永不写 annotations 表」——层纯 props 消费，零 DB/零 IPC；
  diff 文件清单不含任何 annotations 写路径（AnnotationLayer/annotation-undo/
  reader.service/annotations.repo/ipc/services/repos/migrations 均未动）。INV-19
  零触碰实证。**符合**。
- **v1 只读**：§3「无编辑/删除写路径；点击=高亮+跳笔记面板对应条目」——点击=
  该段全部 rects data-highlight+onJumpToNote 上抛；单测断言无菜单/textarea/input。
  **符合**。
- **七问分色单源**：§3「annotation-style 同族新模块（INV-11）」=ai-note-style，
  仅 import QUESTION_COLOR 无硬编码色；M3 变异红证。**符合**。
- **INV-20 三防线**：跳转降级单入口 locateAnchor 未复制（anchor-locate 仅扩
  exact 层目标识别面，`else if` 与 annotationId 互斥，三防线结构不动；S6 关 tab
  早返回在扩展开支之前保持）。**符合**。
- 页过滤（anchorPage 1 基→0 基匹配）+ 篇级/无锚行不入层 + 缓存 paperId:page 键
  失效——票面行为层逐条兑现，均有专测。

## ③ 宪法红线终审

- **分层**：renderer→store→组件单向；无跨层、无 API 直调、无新增依赖（diff 无
  package.json/lockfile 触碰）、无 TODO/FIXME/placeholder（quality log 11 行）。
- **受锁**：verify log 26 行亲证「locks 检查通过：118 个受锁文件与 manifest 一致」；
  manifest grep 118 条 path；三条 sha 变更与测试面一一对应；流程 unlock→改→
  generate→apply 于报告留痕。提交须带 [locked-change]（转主控）。
- **安全禁令**：无 nodeIntegration/webSecurity/eval/new Function/出网 host/
  SQL 面（纯渲染层无 DB 面）；anchor-locate 选择器值转义保持（flashAiNote 复用
  同一转则）。全绿。
- **行数**：亲测 wc -l——AiAnnotationLayer 207 / ReaderPage 247 / AiNotesSection
  249 / AiNoteGroupList 90 / OutlineAside（diff 净增 ~10 行，原 154→安全）均
  ≤250 组件线；anchor-locate 254 / reader.store 418 ≤500 模块线。合规。
- **UTF-8**：quality log「无乱码」；本审读 diff/源码中文注释全部可读。合规。
- **TDD 四档证据链**：
  1. 红：ai09-red.log 新套件 1 failed，exit=1。
  2. 绿：77 文件 491 用例全过，exit=0。
  3. 变异：M1/M2/M3 各含 FAIL 行+`1 failed | 490 passed`+「还原 diff 空」入日志
     （M2/M3 npm exit=1；M1 见①W-C1）。断言级咬合实证（点击上抛/exact 闪烁/分色）。
  4. verify 终局 exit=0 + e2e 15/15 passed（ai09-e2e.log 亲证 `15 passed (1.6m)`，
     exit=0），新用例断言真实文本（PDF_KNOWN_TEXT 可见+rect data-ai-note-id 非空
     +条目内容文本可见，真 textLayer 重锚非桩）。
  四档齐备，链完整。

## ④ 机器面核对

- **77/491 数理**：76+1 新测试文件（ai-annotation-layer.test.tsx）=77 ✓；
  484+7=491 ✓（新文件实含 **7** 用例：5 顶层+describe 内 2——实现者报告「9 用例」
  系计数口误，与 N-D1 同类，不达阻断；以日志 491-484=7 为准自洽）。
- **locks 117→118 推演**：新增 1（ai-annotation-layer.test.tsx）+更新 2（e2e
  spec sha d95ba2…、08 单测 sha 81ad71…）=manifest 三条 diff+1 净增；manifest
  实数 118 与 locks:check 一致。✓
- **registry 翻 done 预演**：registry.ts 182 行 `status: 'open'` 现值属实；收口
  自洽面=①翻 done；②删容器 `data-ticket="SR2-AI-09"`（含其上两行注释——
  「open 期占位标记…随收口删除」整块）；③头注第 4 行 `工单：open / strong` 字面
  改 done（注意：头注含工单号字面须同步翻写，勿只删 data-ticket 属性）；④三
  受锁文件变更即时随提交 locks:apply+[locked-change] 尾注。预演无矛盾。
- **e2e 面申明**：基线 14→15（新增 09 用例）；DEPS 守卫（AI-06/07 未 done 则
  skip）保持分步兑现语义；fixture quote=PDF_KNOWN_TEXT 真实渲染文本。

## ⑤ 成本账本行（门二自估）

- 门二终审子代理：约 55k input / 4k output tokens，~6 分钟（五输入通读+diff
  950 行逐段核对+manifest/registry/行数/日志五路亲测+本报告撰写）。

## 终审统计与裁决

终审 findings：红线 ×0；新增 N ×1（实现者报告「9 用例」计数口误——机器面以
7 为准自洽，不阻断）。门一 0B/1W/3N 全数复核属实且均不达回炉阈值。

## 总评：**PASS**

母本五层对 ADR-0015 §3 N2 渲染面全兑现；宪法红线（分层/受锁 118 一致/安全禁令/
行数/UTF-8/TDD 四档+e2e 15/15）终审全绿；机器面数理自洽；追认项落地。转主控
收口清单：①registry 翻 done+data-ticket+头注工单号字面同步收口；②[locked-change]
尾注+即时 locks:apply；③下批变异模板固化 npm 真退出码；④实现者两处计数口误
（11→12 文件、9→7 用例）知悉即可。
