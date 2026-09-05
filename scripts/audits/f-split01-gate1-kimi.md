[routing]: run=20260905000710-ycxl source=kimi-main model=kimi-k3 switches=0 usage=in=31428,out=10588 latency=260585ms (by ds-call.mjs 链)

# F-SPLIT-01 门一对抗深审报告

## 一、纯搬运逐块核对（票面附加强制审项）——先给结论

**① usePageLazyWindow**：IO effect 体逐字一致（`dataset.pageBox` 解析/NaN 跳过/same 集合短路），deps `[pageSizes, layout]` 零变；可见集上抛 deps `[visible]` 零变；段③回收调度 deps `[visible, totalPages, renderWindow, recycleWindow]` 零变；`onVisibleRef` latest-ref 模式随迁、语句序（ref 赋值→state→三 effect）与原 PageColumn 段③块一致。**PASS**。

**② usePageColumnScroll**：段⑤守卫序 `pageSizes === null || scrollRequest == null`→clamp→querySelector→scrollIntoNearestScroller 逐字一致，deps `[scrollRequest, pageSizes, totalPages]` 零变（INV-29 单口保持）；段⑥镜像 mount 即读初值+passive 监听+成对移除逐字一致，deps `[scrollContainerRef]` 零变。**PASS**。

**③ AnnotationPopups**：saveComment/copyQuote/deleteAnnotation 三函数逐字一致（busy 守卫→setBusy(true)→try/api→store 同步→pushUndo→clearTabDirty→setEditing(null)→onChanged；catch 的 markTabDirty+toast；finally setBusy(false)）；menu/editing/busy 三 state 留守 AnnotationLayer（`useState` import 保留、JSX 中 `setBusy={setBusy}` 回传可证）；AnnotationEditor `key={editing.annotation.id}` 保留。**PASS**。S0~S6/CR1 编排区（MutationObserver 效应）在 diff 中全部为上文保留行，零触。**PASS**。

**④ reader-shortcut-handlers**：useMemo 工厂逐字一致、deps `[]` 零变；调用位与原 `useReaderShortcuts(useMemo(...))` 在 ReaderPage hook 序中同位。**PASS**。

**⑤ 挂载/事件时间线**：sr2-lg-08 挂载效应留守 ReaderPage（diff 未触）；ReaderPageView 内零 hook（仅 getState 静态调用），空态早退移入子件不违反 hook 序；F-03 三口 onScroll/onWheel/onPointerDown 逐字随迁。见 N1 一项时序变化（论证无害）。

## 二、Findings

**[N1] PageColumn 效应注册序变化（拆件固有，逐帧论证无害）**
证据：新件中 `usePageLazyWindow(...)`/`usePageScrollRequest(...)`/`useScrollTopMirror(...)` 三个 hook 调用位于段①就绪管线 `useEffect(...,[doc,totalPages])` **之前**（diff PageColumn.tsx +92~+97 行区）；原序为段①→layout 重报→段③IO→上抛→调度→段⑤→段⑥镜像。推演：mount 时 pageSizes≡null，IO/段⑤均守卫早退，镜像只读 ref，无可观察差；pageSizes 翻转帧上，⑤现先于 layout 重报执行，但 onReady 引发的恢复链 scrollRequest 必经父层 setState→次帧提交才入 ⑤的 deps，两序殊途同归；卸载清理各自成对无交叉。判定：无可观察行为差，记 N 备案。

**[N2] AiNotesSection 内联注释指针不准**
证据：diff `+ // 分节可见性口径（六态单源在 AiNotesStatus.derivePhase——hasNotes 事实同帧）`——derivePhase 本体实驻 ai-notes-phase.ts（该件头注与 AiNotesSection 头注均写对），唯此行内注释把单源归于 AiNotesStatus。文档瑕疵，非行为。

**[N3] 自裁 5「27 props」与 diff 实数 28 不符**
证据：ReaderPage.tsx 末段 `<ReaderPageView paperId tabStatus page totalPages zoom color selectionMode pageLayout annotations columnScroll searchBox pdfDoc outlineOpen setOutlineOpen scrollAreaRef spProg selectionMount setSelectionMount fileUrl setTotalPages setPdfDoc handleColumnReady handlePdfError fitWidth setPage setZoom setColor addAnnotation>` 实数 28 个。报告数字小疵，不影响实质申报（全部原值/setter/handler 透传属实——逐个对得上）。

**[N4] ReaderPageView `pdfDoc: unknown` 传 OutlineAside 的类型方向疑点**
证据：ReaderPageView.tsx `pdfDoc: unknown` 且 `<OutlineAside pdfDoc={pdfDoc} .../>`。**不确定**：OutlineAside 的 pdfDoc 形参类型在包外不可见；若其非 unknown/any 则 TS2322 必红，但验证摘要 typecheck 全绿（实现者+主控双跑），两证相抵。记 N，依赖摘要为证。

**[N5] LineageBoard edges 订阅拓扑变化（已披露，无可观察差）**
证据：menuParentEdge/menuManualEdges 派生随迁 LineageBoardMenu 并改为 `useLineageStore((s) => s.edges)` 自订阅；LineageBoardDialogs 同法取 edges 喂 LineageManualDialogs。原宿主订阅（LineageCanvas 消费）保留。订阅粒度变化但值同源同帧，头注已如实披露「edges 经 store 自订阅」。

**[N6] 测试盲区提示**：usePageLazyWindow/usePageColumnScroll/reader-shortcut-handlers 三 hook 与各 View 件无新增专测，覆盖完全依赖既有 1422 用例+八态探针。纯搬运口径下可接受，但段③回收/段⑤补滚的既有用例覆盖深度包内不可证——**不确定**，记 N。

**[W1] 六件 reader 域新件缺 `// b3:` 批次首行标记，与另四件不一致**
证据：LineageBoardMenu.tsx:1 `// b3: P7-H`、LineageBoardDialogs.tsx:1 `// b3: P7-H`、AiNotesStatus.tsx:1 `// b3: P7-G`、ai-notes-phase.ts:1 `// b3: P7-G`；而 PageColumnView.tsx / ReaderPageView.tsx / AnnotationPopups.tsx / reader-shortcut-handlers.ts / usePageColumnScroll.ts / usePageLazyWindow.ts 六件首行直接为 `/**`。**不确定**：批次标记规约的强制性及 reader 域应属批次号在包外不可证；若 F-CSS-01/P7D-01 批二按 b3 标记收口扫描面，此六件（含大量 Tailwind class 串与 CSS 变量）将漏网。建议实现者补标或举证规约豁免。

## 三、票面/红线/自裁复核（无 finding 项摘要）

- **A 母本**：五件终态行数（164/151/107/155/163）均 ≤169，余量最小 81 ≥80 达标（数值引验证摘要，包内不可复算）；头注逐段核——六态表（AiNotesSection→ai-notes-phase 逐字）、段②/③/⑤/⑥（PageColumn→三新件）、弹层段（AnnotationLayer→AnnotationPopups 逐字）、加节点/加边/改父段（LineageBoard→Menu/Dialogs）、快捷键段（ReaderPage→shortcut-handlers）均有落点，指针双向（新件「自 X 拆出」↔ 宿主「职责归 Y」）成对，未见信息删减。
- **B 红线**：分层单向无越层新边（ai-notes-phase 仅引 @shared，无环）；无新依赖（diff 无 package.json）；10 新件全部被宿主 import 消费；退役 import（PageBox/layoutRows/clampPageToColumn/ApiClientError 等）清理干净，lint 绿佐证无死代码。UTF-8 包内不可验，依摘要。
- **D 自裁七项**：1（三件切分物理必然性+禁动项留守）✓；2（动作函数随迁=超「JSX-only」建议但状态归属不变，申报属实且回写链逐字）✓；3（轮询守卫移除——宿主 `if (paperId === null) return <></>` 先守，子件契约 string，原守卫在子件渲染态恒不可达，零差论证成立）✓；4（DOM 兄弟序——absolute+z 显式定位论证成立，探针 PNG 逐字节 PASS，我无更强依据推翻）✓；5（数字小疵见 N3，实质属实）✓；6（注解层适配，运行时为同一 useRef 对象）✓；7（头注口径执行与申报一致）✓。
- **E 接缝**：PageScrollRequest 单实现双出口（本体驻 usePageColumnScroll，PageColumn `export type` 再导出）维持 PagesOverlay/ReaderPage/ReaderPageView 三处既有 import 路径 ✓，与 nearestPage 先例同型。

## 四、统计与总评

- B=0 / W=1 / N=6
- **总评：PASS_WITH_WARNINGS**——纯搬运五抽块全部逐字核过、自裁七项六项完全属实一项数字小疵、编排语义与事件时间线无可观察差；唯一 W 为批次标记不一致（规约强制性不确定，建议门二前澄清或补标）。