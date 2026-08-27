# SR2-AI-09 门一对抗深审报告

日期：2026-08-27 ｜ 审查者：门一子代理（独立于实现者，只读）｜ 输入：ai09-diff.patch（950 行）+ 票面头注 + ai09-impl.report.md + red/green/mutation/verify/e2e 五日志

技能清点：code-review-excellence / receiving-code-review——用（对抗审查方法核心）；systematic-debugging / TDD / subagent-driven-development——不用（只读审查角色，无调试与实现面，方法论由主控注入）。配置自查：本代理为审查专用、只读铁律优先，无派发面。

## Findings

### A. 母本符合度

- **A1 通过**：重锚同管线——`AiAnnotationLayer.tsx` effect 内 `verifyQuote(textLayer,{prefix,quote,suffix,start:0})` → `findRangeAtOffset(textLayer, at, at+quote.length)`，与 `AnnotationLayer.tsx:107-114` 逐调用同构（唯一 DOM 遍历点 annotation-anchor.ts 复用，未另写几何；容器 style zIndex:5 / pointerEvents:none / mixBlendMode:multiply 与 AnnotationLayer:198 同值）。
- **A2 通过**：重锚失败段 `continue` 不落 `next`，零 rects；单测「重锚失败→该段零 rects 且他段不受扰」断言 `ids===['hit']`。篇级/无锚行（quoteText 空）被 `anchorableNotes` 过滤不入层，有专测。
- **A3 通过**：分色单源——仅 `import { QUESTION_COLOR } from './ai-note-style'`，无硬编码色值；双向锚定声明在 `ai-note-style.ts:5-8`（"消费方=…AI-09 AI 标注渲染层（同源消费，禁 09 另建映射）"）与 AiAnnotationLayer 头注两侧俱在。变异 M3（改硬编码色）红证分色用例真咬合。
- **A4 通过**：点击=该段全部 rects `data-highlight`+`onJumpToNote` 上抛（M1 变异红证）；无菜单/编辑元素只读断言在测（`[data-testid="annotation-menu"], textarea, input` 零命中）；INV-19 写面零触碰 diff 级核实：diff 文件清单不含 AnnotationLayer/annotation-undo/reader.service/annotations.repo 及任何 ipc/services/repos/migrations 路径，层内 grep 无 api 调用。
- **A5 通过**：渲染节点带 `data-ai-note-id`；anchor-locate 延展仅扩 exact 层（`else if (target.aiNoteId !== undefined) flashAiNote(...)`——annotationId 优先互斥，既有 `data-annotation-id` 行为有专测不回归；三防线/paper/page 结构未动）。AiNotesSection 条目单击传 `aiNoteId: n.id`，受锁 08 断言新增字段与传递链一致（主控追认项 1 核实：diff 内受锁测试改动仅此一处，e2e spec 扩用例+新增测试文件均走 unlock→generate→apply，manifest 117→118 与三文件 sha 对账一致）。
- **A6 通过**：重锚缓存 paperId+页键失效——`cacheKey = paperId:page`，`resolved = cache.key===cacheKey ? cache.rects : {}` 键变即弃旧（下轮收敛前不渲染错页 rects）；翻页用例（anchorPage=2 在 page=0 不渲染、page=1 渲染）覆盖。
- **A7 通过**：数据经 props——`AiAnnotationLayer` 纯 props 消费零 store 直取；store 订阅集中在宿主 `ReaderAiLayer`（同文件导出、头注声明），与 AnnotationLayer 宿主并置（ReaderPage:458-459）。
- **[N-A1]** anchorPage=null 且 quoteText 非空的行会参与每一页重锚（头注已声明"缺省不过滤，verifyQuote 兜底"——跨页同文可能多页渲染）。已声明非未定义行为，记录备查，不阻断。
- **[N-A2]** `selectedId` 只增不清（点击新段会替换，但无取消路径）。纯视觉态、票面未要求清除，不阻断。

### B. 宪法红线

- **B1 通过**：组件行数——AiAnnotationLayer 207 / ReaderPage 247 / AiNotesSection 249 / OutlineAside 154 均 ≤250；anchor-locate.ts 254 / reader.store.ts 418 为模块非组件，≤500 红线内。
- **B2 通过**：分层——renderer→store→组件内单向，无跨层/API 直调；无新增依赖；无 TODO/FIXME/placeholder（quality 关卡 log 确认"无占位标记/无乱码/无跨域引用"）。
- **B3 通过**：受锁流程——verify log 亲证 locks:check"118 个受锁文件与 manifest 一致"；manifest diff 仅 3 处（新增 1+更新 2）与实际测试面精确对应。data-ticket 占位保留系 check-tickets 规约 4 的 open 期要求（tickets:check 过），收口单须随 registry 翻 done 删除（**转主控收口清单**）。

### C. 代码与测试质量

- **C1 通过**：四档红证齐——red（新增套件 1 failed，exit=1）/ green（77 文件 491 用例，exit=0）/ mutation 三条均含"还原 diff 空"入日志、verify（exit=0）。上批 N-C1 改进项（还原 diff 空入日志）已兑现。
- **[W-C1]** M1 变异行 exit=0（grep 管道退出码，红由 FAIL 行+`1 failed | 490 passed` 证明）；M2/M3 已用 npm 真退出码=1。实现者主动申报并解释（报告§红证注）。红证实质成立，记 W 供下批模板固化「一律取 npm 真退出码」。
- **C2 通过**：e2e 15/15 passed（ai09-e2e.log 实证）；新用例断言真实文本：PDF_KNOWN_TEXT 可见 + ai-note-rect 可见且 data-ai-note-id 非空 + 点击后 data-highlight 条目 + 笔记内容文本可见——满足"渲染出真实文本"纪律，且重锚走真 textLayer 非桩。

### D. 报告诚实性

- **D1 通过**：数字 77/491/118/15 全对日志；自裁申报 7 条逐条对 diff 属实（受锁断言更新/store 信号形态/ReaderAiLayer 拆分/data-ticket 保留/flash 优先级/删减面自查/INV-19 证明）。
- **[N-D1]** 自裁申报 6 称"git diff --stat 共 11 文件（8 实现+3 测试+manifest）"——实际 8+3+1=**12** 文件（patch 头部计数核实）。纯计数口误，清单本身完整无遗漏、无范围蔓延，不构成隐瞒。

### E. 接缝与后续单

- **E1 通过**：highlightAiNoteId 消费链闭合——reader.store notifyAiNoteHighlight（seq 递增，C-05 notifyNoteHighlight 同型同构）→ OutlineAside（aiNoteHighlight 订阅+切笔记 tab+分发）→ ReaderNotesPanel（透传）→ AiNotesSection → AiNoteGroupList（data-highlight 渲染+scrollIntoView 进视野，FragmentNotesList 同型）。既有 noteHighlight 行为零触碰（OutlineAside 仅新增并行信号分支，diff 最小面）。
- **E2 通过**：对 10（ZcodeLinkSection）无影响——diff 不涉及其文件与合约。
- **E3 通过**：08 禁双取接缝保持——AiNotesSection 仍经 useActiveTab 自取 paperId（ReaderNotesPanel 头注声明未动）；ReaderAiLayer 订阅 ai-notes.store 为数据单源读（非 paperId 双源）。

## 统计

findings：A 7 过 / B 3 过 / C 2 过（1W）/ D 1 过（1N）/ E 3 过。W×1（W-C1 变异 M1 退出码口径）、N×3（N-A1 anchorPage=null 多页渲染已声明、N-A2 selectedId 无清除、N-D1 报告计数口误 11→12）。B（红线）×0，回炉级 ×0。

## 总评：**PASS**

母本十项交付面全兑现且证据链（四档红证+e2e 真实文本）扎实；受锁流程 118 对账一致；INV-19 零触碰实证。三条 N 与一条 W 均不达回炉阈值。转交主控收口清单：① data-ticket 占位随 registry 翻 done 删除；② 变异红证模板下批统一 npm 真退出码；③ 报告计数口误知悉即可。
