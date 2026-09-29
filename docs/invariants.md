# 外壳级不变量登记册（跨模块行为的单一真相源）

> **为什么存在**：骨架/工单治理的是静态结构（代码住哪、谁依赖谁），而 2026-08-23 缺陷战役
> 证明三类欠账全部长在骨架管不到的地方——时间维度（状态/竞态）、接缝（模块之间无人
> 负责的行为）、未声明的不变量（默认假设从未写下来）。本册登记这些**没有天然归属文件的
> 行为不变量**，每条注明强制方式与锚定状态。
>
> **规则**（对应 AGENTS.md「状态与不变量纪律」）：
> 1. 新增/修改跨模块行为时必须同步本册——未登记 = 未定义行为。
> 2. 每条不变量必须给出强制方式（单测 / lint / e2e / CI / 架构评审）。
> 3. 「未锚定」= 欠账：只靠人审或纯声明，无机器防线。接手任务优先补锚。

| 编号 | 不变量 | 声明处 | 强制方式 | 状态 |
| --- | --- | --- | --- | --- |
| INV-01 | 文档永不滚：所有滚动只发生在应用内 overflow 容器（main/阅读器滚动区） | src/renderer/shared/theme.css | e2e reader-text.spec（三层 overflow 计算样式断言） | 已锚定（2026-08-23 UBS） |
| INV-02 | 用户触发的动作失败必须可见（toast/内联红条），禁止静默吞错 | AGENTS.md, scripts/new-ticket.ps1 | 人审+工单模板条款（lint 化不可行有实证——blanket 空 catch 禁令误伤合法尽力而为） | **部分**（U1/U6 两修复模式；规约化已落模板文化层） |
| INV-03 | 一切含异步 load 的 store 必须有请求序号 stale-guard（旧响应/旧失败不得覆盖新状态；含 per-tab 变体/写方向身份寻址/同通道写全序三同族变体） | library/notes/tags/reader/settings 五 store, useAsync.ts | 五 store 单测+useAsync.test 三面（reader per-tab 18 用例；写方向与全序用例 always-active） | 已锚定 |
| INV-04 | 保存失败不推进 savedAt（失败=未保存态延续，下次编辑自然重试） | src/renderer/features/notes/notes.store.ts | notes.store.test 锁定 | 已锚定 |
| INV-05 | 标注矩形两路径同口径：划选保存与重开重锚走同一 mergeLineRects 几何 | src/renderer/features/reader/anchors/annotation-anchor.ts | 单测+e2e 计数断言 | 已锚定 |
| INV-06 | e2e「看见」类断言必须含计算样式（颜色/opacity/blend）——几何可见≠视觉可见 | tests/e2e/reader-text.spec.ts | e2e（highlight/underline/note 三链） | 已锚定（2026-08-23 UBS 补三 kind 全覆盖） |
| INV-07 | 文件/目录路径只能出自受信边界（main 系统对话框+拖拽 File 经 preload webUtils 解析）；renderer 禁构造/硬编码路径字面量 | AGENTS.md, docs/security.md, src/preload/index.ts, src/main/protocol/app-file.protocol.ts | 契约测试 preload-surface+单测 drag-import/app-file.protocol.test | 部分锚定（P7E-02+SR-SEC-01；真实 OS 拖拽正向链=手动验收面） |
| INV-08 | 出网仅白名单 host 且仅手动触发，无后台网络任务 | src/shared/constants.ts, src/main/http/http-client.ts | 常量+单测+e2e CSP 断言 | 已锚定 |
| INV-09 | 渲染层禁止 Node/Electron API 与绝对文件路径 | AGENTS.md | ESLint 强制 | 已锚定 |
| INV-10 | 标注层容器是 stacking context：混合模式必须上容器级（rect 级混合被隔离无效） | src/renderer/features/reader/view/AnnotationLayer.tsx | e2e mix-blend 断言 | 已锚定 |
| INV-11 | 类型/颜色/文案/数值单一真相源（禁止两份等价声明靠注释对齐） | AGENTS.md | 机器锚定（字号+颜色面：quality CSS 负锚+eslint B-5）+人审（数值面）；lineage 恒四组拒绝文案=常量单源已锚（F-CONSOL-02） | 颜色+字号面已锚（F-CSS-03/F-LINT-01）；数值面人审 |
| INV-12 | 受锁文件变更即时 locks:apply（manifest 与提交同步，禁跨提交延迟） | AGENTS.md | CI locks:check | 已锚定 |
| INV-13 | IPC Result 折叠约定：service 把业务失败折叠为正常返回时，消费方必须分支处理、不得无条件按成功提示 | src/main/services/enrich/enrich.service.ts, src/main/services/reader.service.ts | 人审+折叠面清点存档（UBS 清点 8 点全分支） | **部分**（新增折叠点须随消费方分支一并过审） |
| INV-14 | 输入接缝注册/注销成对：快捷键/滚轮/指针监听/拖拽期 body 样式副作用/事件订阅与挂载源同源清理 | src/renderer/shared/keymap.ts, useExportCorpusEvents（App 事件桥） | 单测 keymap.test 12+reader-shortcuts.test 8+split-pane.test 11+corpus-export.test | 已锚定（SR2-KEY-01/02、SR2-UIK-01、SR2-AI-04 四面全锚） |
| INV-15 | 阅读器空态（无 tab/loading/error）下 TabBar 保持渲染——error tab 可见/可关/可切，否则打开失败即 UI 死锁 | src/renderer/features/reader/view/ReaderPage.tsx 空态分支（SR2-TABS-02） | 组件 tab-bar.test+e2e 三序列（换/关/退含 error 场景） | 已锚定（SR2-TABS-02；markTabError 失败类补全） |
| INV-16 | pdfjs-dist 运行时 import 白名单单源：仅许 PdfDocProvider/PdfPageCanvas/TextLayer/CorpusExtractor 四文件 | 本册+eslint.config.js no-restricted-imports | ESLint 强制（SR2-AI-02 实证拦截；worker 资产单份） | 已锚定（SR2-AI-02/SR2-F-01；动态 import 边界由架构评审覆盖） |
| INV-17 | 语料导出幂等：corpus md front-matter 不含 exportedAt；contentSha/fulltextSha=文件字节 sha256；同库重导出逐字节稳定 | ADR-0011, src/main/services/export_/corpus.assemble.ts | golden+结构断言（corpus.export.test 幂等重导逐字节用例） | 已锚定（SR2-AI-03） |
| INV-18 | 导出会话协议：manifest 终局单写（tmp+rename 原子替换）；会话开始清空重建；单会话单飞 EXPORT_BUSY；中断=无 manifest，重跑即修复 | ADR-0011, src/main/services/export_/export-session-state.ts | 单测 corpus.export.test 十用例+e2e 消费方级（含串行不死锁时序） | 已锚定（SR2-AI-03/AI-04） |
| INV-19 | AI 锚定段渲染对等、存储独立：AI 笔记经 verifyQuote 重锚入同一几何管线渲染；数据永不写 annotations 表；v1 只读 | ADR-0015, src/renderer/features/reader/view/AnnotationLayer.tsx | 单测+组件测试 ai-annotation-layer.test | 已锚定（SR2-AI-09） |
| INV-20 | 锚点定位三层防线单入口：quote 重锚→anchor_page 页级降级→无锚/篇级开篇；一切跳转消费方共用同一锚点定位服务，禁各写降级 | ADR-0015, src/renderer/features/reader/anchors/anchor-locate.ts | 单测 anchor-locate.test 9 用例+消费方用例（N1/脉络/AI 面） | 已锚定（SR2-C-05；消费方级随 SR2-AI-08/09、SR2-LG-04） |
| INV-21 | 伴随进程边界：应用零 LLM 出网维持；应用永不 spawn zcode/会话；AI 工作只由用户在 zcode 侧启动 | ADR-0015 | e2e 不代启断言+架构评审 | 已锚定（SR2-AI-10） |
| INV-22 | 退出拦截 dirty 链路：renderer 聚合信号（tab dirty ∪ lineage dirty）沿变化沿 push 上报 | src/main/windows/main-window.ts, src/renderer/features/reader/state/tab-dirty.ts, App.tsx | 单测 quit-dirty-guard.test 七用例+e2e 退序列+组合根组件用例 | 已锚定（SR2-TABS-04；∪lineage 扩面=SR2-LG-03） |
| INV-23 | 撤销栈语义：栈 per-tab 模块级自持（随 closeTab 清理）；LIFO+深度 50 截断；api 失败不弹栈；同篇 in-flight 互斥；delete 逆重建 id 后全栈 remap | src/renderer/features/reader/state/annotation-undo.ts | 单测 annotation-undo.test 15 用例 | 已锚定（SR2-UNDO-01） |
| INV-24 | 片段序单源：一切片段序消费面按同一比较器排序（页码→页内偏移→创建序→id 兜底）；排序禁字符串字典序比较 | 本册+src/shared/annotation-order.ts | 单测 annotation-order.test 6 用例+两消费方用例（组件序消费+corpus golden） | 已锚定（SR2-C-01..C-03/C-05） |
| INV-25 | ai_notes 级联语义：paper 删除→级联清空（CASCADE）；annotation 删除→annotation_id 置 NULL 条目保留；级联依赖 foreign_keys=ON 常开 | 迁移 003 DDL, src/main/db/repos/ai_notes.repo.ts, src/main/db/connection.ts | repo 单测（级联两路径用例——真实外键行为） | 已锚定（SR2-AI-01） |
| INV-26 | 伴随进程文件协议三联：pending job 移除以 corpus-ai 产物落盘成功为前提（失败路径 job 保留）；判活唯一依据=status.json 心跳新鲜度；协议幂等 | ADR-0015, src/main/services/ai_sensor/ai-sensor.service.ts, tools/ai-sensor/companion.mjs | 单测 ai-sensor.service.test（幂等/三态/跨格序列）+CLI 探针 companion.test | 已锚定（SR2-AI-06） |
| INV-27 | lineage 树单父不变量（四 kind 全景）：tree 边=每节点至多一条 tree 入边（无多父/无环/无自环）；inferred 同树守卫；ref/manual 入边不算 tree 父 | ADR-0014, src/main/services/lineage/lineage.service.ts 两守卫口 | 单测三拒绝路径双覆盖（lineage-import.test）+ref 六用例+manual 十用例 | 已锚定（SR2-LG-01；R2-LG12/F-LG15/T3-P5 扩面） |
| INV-28 | 被引缓存刷新语义（与 fill-empty 刻意不同——被引数单调增长）：命中且非 null（含 0）→强制刷新三列同写；null/未命中→旧值保留 | src/main/services/enrich/cited-by.service.ts | 单测 cited-by.test 9 用例+真库断言 papers.repo.test | 已锚定（SR2-ENR-01） |
| INV-29 | 程序跳页与滚动同步双源区分：setPage 第三参 scroll to/none 两态——to=程序跳页 bump scrollRequest 信号；none=只落账不触发程序滚动 | src/renderer/features/reader/state/reader.store.ts, view/PageColumn.tsx | 单测跨格锚 reader.store.test+page-column.test | 已锚定（SR2-F-01；F-03 回写消费） |
| INV-30 | canvas 生命周期=渲染窗口绑定：页 canvas 仅存在于渲染窗口内，离屏超限必卸载（canvas+pageText 条目同删） | src/renderer/features/reader/view/PageColumn.tsx 段③（宿主随 F-ARCH3 迁） | 组件单测 page-column.test+pages-overlay.test+e2e 计数断言 | 已锚定（SR2-F-01；e2e 随 F-04 收官） |
| INV-31 | 滚动→页进度回写=视口中心最近页（nearestPage 纯函数单源）；整数页粒度；回写经 setPage scroll none 只落账 | src/renderer/features/reader/view/scroll-progress.ts | 单测 scroll-progress.test（六态全格+五序列）+e2e 恢复锚 | 已锚定（SR2-F-03） |
| INV-32 | 程序滚动用户接管：程序滚动进行中，wheel/keydown/pointerdown 三类非 scroll 输入即取消程序目标转 scrolling | src/renderer/features/reader/view/scroll-progress.ts, ReaderPage.tsx 装配三口 | 单测 scroll-progress.test（接管格+程序自发 scroll 不记账格） | 已锚定（SR2-F-03） |
| INV-33 | 缩放中心保持：zoom 变化后视口中心内容不动——anchoredScrollTop 纯函数比值保持（顶/底夹取） | src/renderer/features/reader/view/page-column-geometry.ts, PageColumn.tsx, ReaderPage fitWidth | 单测 page-column.test+e2e reader-scroll.spec 收官链 | 已锚定（SR2-F-04） |
| INV-34 | 程序滚动单容器收敛：程序滚动只允许滚目标的最近滚动祖先（scrollIntoNearestScroller 差值法+显式夹取），禁原生 scrollIntoView 全页传播 | src/renderer/features/reader/state/scroll-converge.ts | 单测 scroll-converge.test 六用例+三文件消费形断言 | 已锚定（SR2-F-05） |
| INV-35 | 课题库单活四联（ADR-0018 库级分目录）：同一时刻至多一个课题库打开；switch/create/rename 互斥单飞（并发=CONFLICT）；首启 legacy 库迁移入 workspaces/default | src/main/services/workspaces/workspace.service.ts, workspace.fs.ts, workspace.store.ts, main-window.ts | 单测 workspace.test 14 it+e2e 迁移兼容+渲染面单测 | 已锚定（R1-WS1/R1-WS2） |
| INV-37 | 划选视觉=自绘并集层：选区视觉反馈是浏览器选区状态的直接函数（portal 单层单绘与保存 rects 同源；R3 调度双路=拖选快路径+全量收口） | src/renderer/features/reader/view/text-layer.css, interact/SelectionLayer.tsx | e2e reader-text.spec（::selection transparent+块色+时窗）+F-A6-d 两小票 | 已锚定（F-A4/F-A6） |
| INV-39 | 界面缩放三档只缩 HTML 文本面：uiScale 经 --ui-scale 单点写→内容行 .app-content-row 整行 zoom（topbar/状态条行外） | src/renderer/app/App.tsx, src/renderer/shared/theme.css, SettingsPage.tsx | 单测（app-shell 变量两面+settings 透传）+CSS 文本锁 theme.test+e2e | 已锚定（R2-SET1） |
| INV-40 | 标注矩形归并：渲染色块两两不相交+每行至多一块+零宽块不入集合+相邻行垂直边界钳制；存量 rects 读时过同一归并器 | src/renderer/features/reader/anchors/annotation-merge.ts | 单测 annotation-merge.test ①~⑩（变异红证在档） | 已锚定（F-A1） |
| INV-42 | 选择模式交互两层防线：标注/AI 渲染 rect pointer-events none（点击穿透）+选择模式点击零副作用（菜单臂/编辑器臂双锁） | src/renderer/features/reader/state/reader.store.ts, view/AnnotationLayer.tsx, AiAnnotationLayer.tsx, ReaderPage.tsx | 单测 selection-mode.test ①~⑧ always-active | 已锚定（F-A3；2026-09-02 真机直测补锚） |
| INV-45 | 阅读器双页几何：列宽=最宽完整行（末行孤页不计列宽）；行高=max(左右页高)；切布局不重跑 getDocument 管道 | src/renderer/features/reader/view/page-column-geometry.ts, PageColumn.tsx | 单测 reader-double-page.test 16 用例 | 已锚定（F-R1） |
| INV-46 | 页内层序=背景板不变量：标注/AI 色块 < PDF canvas 墨带 < 自绘选区层（page-layer-z 单源常量） | src/renderer/features/reader/state/page-layer-z.ts, view/PdfPageCanvas.tsx, PageBox.tsx | unit（pdf-page-canvas/selection-paint/annotation-layer 测试） | 已锚定（F-A5/ADR-0019 R2） |
| INV-47 | rect 归并紧凑行距双门：簇判据=pitch 在场时中心距≤min(pitch,主导高)；防量测膨胀杂交（适用面收缩=F-A8 门2 回退层） | src/renderer/features/reader/anchors/annotation-anchor.ts, annotation-merge.ts | 单测 annotation-anchor.test F-V1 五用例（变异红证在档） | 已锚定（F-V1） |
| INV-48 | 脉络节点标签与含金量展示：lineage_nodes.tags JSON 数组 TEXT（NULL=无标签）；同节点同名标签去重恒成立（dedupeLineageTags 写边界单源） | src/shared/models/lineage.ts, src/main/db/repos/lineage.repo.ts | 单测 lineage-tags.test+lineage-node-meta.test | 已锚定（F-LG14） |
| INV-49 | pdfjs 文档生命周期销毁序：worker-per-task——每个未传 worker 的 loadingTask 自带专属 PDFWorker，destroy=唯一终止口；两创建点句柄在册 | src/renderer/features/reader/state/PdfDocProvider.tsx, CorpusExtractor.ts | 单测 corpus-extractor.test settleLoadTask 四径（变异红证在档） | 部分（泄漏面已锚；噪声面=显式接受残余+监控备案） |
| INV-50 | 弃改=完整弃改：用户显式弃改确认后 notes 悬置面全闭（discard API+in-flight 代际守卫+一切 tab 关闭路径接线） | src/renderer/features/notes/notes.store.ts, reader/state/tab-dirty.ts, workspaces/workspace.store.ts | 单测 discard 族七用例+e2e 复活面端到端 | 已锚定（A3） |
| INV-51 | e2e 几何断言的稳态采样口径：跨程几何一致断言的输入必须为稳态几何（stableRel 共享助手） | tests/e2e/stable-rel.ts | e2e「重开仍在原位」四断言（注入实验红绿双向实证在档） | 已锚定（F-R2e/F-TESTREF-W4） |
| INV-52 | import 会话身份两合一：互斥 gate（enter/finally exit 两路径必经）+会话 sessionId 贯穿（同会话同 id，两次调用不同） | src/main/services/import_/import.service.ts, workspaces/workspace.service.ts, bootstrap.ts, ImportDropZone.tsx | 单测 import.service.test 三用例（变异红证在档）+workspace 互斥用例 | 已锚定（F-D4） |
| INV-53 | 标签 id 消失即引用清空：标签 id 因删除/合并消失后，一切 renderer 持有的该 id 引用必须当场清空（先清引用后广播；多选形态死 id 剔除非全清） | src/renderer/features/tags/TagFilter.tsx, library/FilterBar.tsx | 单测 tag-lifecycle-ui.test（顺序契约锚）+e2e tag-lifecycle.spec | 已锚定（P7E-01；P7E-06 多选适配） |
| INV-54 | 拖拽路径单源：File→path 解析唯一口=preload webUtils 经 window.apiDrag.importDropped；fromPaths 通道对 renderer 隐藏 | src/preload/drag-import.ts, src/preload/index.ts, src/shared/ipc/api-surface.ts | 单测 drag-import.test 八分支+契约测试 preload-surface+e2e import-drag.spec | 已锚定（P7E-02；真实 OS 拖拽正向链=手动验收面） |
| INV-55 | 页内搜索会话挂文档身份+代际守卫：sessionFileUrl 变化即代际失效+全清；不变=no-op | src/renderer/features/reader/view/reader-search.store.ts, useReaderSearch.tsx | 单测 reader-search.store.test+wiring.test+e2e | 已锚定（P7E-03） |
| INV-56 | 导出内容构建器单源+剪贴板写单口：文件路径与剪贴板路径共用 buildBibtex/buildCsv；剪贴板写=clipboard 注入单口（先构建后写） | src/main/ipc/export_.ts, ipc-deps.ts, bootstrap.ts | 单测 export-clipboard.test（变异红证在档）+renderer 用例+e2e | 已锚定（P7E-04） |
| INV-58 | 拖选期视觉与保存 rects 同几何管线：快路径（evaluateVisual）与全量（evaluateFull/settle）必须属同一几何族（项声明几何族单源） | src/renderer/features/reader/interact/selection-evaluate.ts, anchors/pdf-item-geometry.ts | 单测 selection-evaluate.test（快慢等价+同帧覆盖） | 已锚定（F-A6；F-A8 门2 扩域） |
| INV-59 | 重锚同族配对令：resolved.rects 与 resolved.bands 必须同几何族（项几何主链与 S4 DOM 回退层各自同源成对） | src/renderer/features/reader/anchors/annotation-resolve.ts | 单测 annotation-layer.test F-A8 门2 describe+anchor-item-verify.test | 已锚定（F-A8 门2） |
| INV-60 | 重锚显示覆盖登记：重锚成功产物覆盖库值 rects 仅显示层、永不回写（annotation.rects 库数据零触碰；source 域标记随 resolved 走） | src/renderer/features/reader/anchors/annotation-resolve.ts, view/AnnotationLayer.tsx, AiAnnotationLayer.tsx | 单测域标记断言（变异红证在档） | 已锚定（F-A8 门2） |
| INV-61 | 字号档位语义刻度单源：font-size 消费面禁字面量（CSS 声明/inline/arbitrary），tailwind text 系经 v4 @theme 重绑到 --fs-* token | src/renderer/shared/theme.css :root --fs-* 族, docs/design/2026-09-08_p7d01-b2-fontscale-ruling.md | theme.test.ts（TOKENS 正锚+FS 正则全域负锚五通道） | 已锚定（P7D-01 批二 2026-09-08） |
| INV-62 | 划选终点事件层可重定向：mouseup 真划选且释放点浅探无文本时，selection focus 可被改写为上一行行尾（release-affinity 纯函数判别） | src/renderer/features/reader/interact/release-affinity.ts, SelectionLayer.tsx | release-affinity.test 17 用例 | 已锚定（F-A12；栏间隙保守零变等边界备案） |
| INV-63 | 测试面单调性：tests 契约面（用例+断言+skip 标记）只增不减；有意收紧/删改必须先取主控裁决再落豁免清单（reason+rulingLink），禁直接改基线 | docs/design/2026-09-11_f-testref00-design-final.md, AGENTS.md [test-refactor] 段 | 机检 npm run test-surface:check（C_after ⊇ C_before 多重集判定） | 已锚定（F-TESTREF-00） |
| INV-64 | e2e 内禁截图比对：tests/e2e 禁 toHaveScreenshot 断言；「看见」类断言=计算样式+真实文本（INV-06 口径） | scripts/check-quality.mjs 第 9 段负锚 | 机检 check-quality（出现 toHaveScreenshot 即红） | 已锚定（F-TESTREF-W4） |
| INV-65 | 导出会话中止单源：renderer 重载/崩溃（main 存活）→bootstrap webContents 双事件→abortActiveSession→failSession 同型处置（清 tmp+同步释放单飞锁） | src/main/services/export_/export-session-state.ts, src/main/bootstrap.ts | 单测四用例+e2e renderer 重载格 | 已锚定（F-SESS-01） |
| INV-66 | 受管内容写盘原子性单源：一切同路径内容落盘走 atomicWriteFile（tmp+rename 同卷原子）；仅内容写盘——不覆盖协议流 | src/main/services/shared/atomic-write.ts | 单测 atomic-write.test 8 用例 | 已锚定（F-DEDUP-01） |
| INV-67 | AI 笔记回灌事务性：deleteByPaper+重插同包 withTransaction 全有或全无（跨篇隔离） | src/main/services/ai_sensor/ai-notes-import.service.ts | 单测 a1 两相+跨篇隔离；变异红证在档 | 已锚定（F-AIN-01） |
| INV-68 | 几何产链 band 档位绑定：band 三推导各绑一档，禁跨档消费+禁新增第四推导 | src/renderer/features/reader/anchors/pdf-item-geometry.ts, annotation-resolve.ts | 既有测试网（登记性质=事实升格，无独立红证面） | 未锚定（防线=review 拦截位，非 CI 负锚） |
| INV-69 | 阅读进度页码 outbox 通道：页码唯一落库通道（唯一入队口+重启重放恢复；时长功能移除后载荷收缩为页码单载荷） | src/renderer/features/reader/time/reading-time-setup.ts, reading-time-outbox.ts, src/main/services/reader.service.ts | e2e reading-time-replay.spec（重启重放 DB 直断言）+unit outbox.test | 已锚定（F-TIME-02 补登；锚=既有测试面） |
| INV-70 | 单窗口单例是架构前提：OS 级多窗口=永久负面清单；渲染层模块级单例因此合法（附件性单例清单随票补登） | 用户裁决 2026-08-23+2026-09-19 裁决 7, 本册 | main 单实例锁代码锚（requestSingleInstanceLock）+架构评审 | 部分（单实例锁=代码级防线；附件清单=声明性快照） |
| INV-71 | 主题 token 三族单源机制：token 终值单一来源=三 mockup 稿；旧词表桥接段同元素级联随族覆写；schema 枚举 [light,dark,sepia] 默认 light；[T3-U1] 启动注入=首帧兜底（main 同步读 settings 附 theme query→theme-boot.js 首帧写 dataset.theme），App effect=运行时单点真源——两者值一致（载入在途窗不回退） | src/renderer/shared/theme.css, src/renderer/app/App.tsx, src/renderer/public/theme-boot.js, src/main/services/settings.service.ts, src/main/windows/main-window.ts, src/shared/ipc/schemas.ts | theme.test.ts（TOKENS 正锚+三族块内断言）+App 接线锚+负锚+[T3-U1] theme-boot.test（三值/非法/缺参零写+经典脚本负锚+**index.html 引用面静态锁[head 段内]与 bootstrap 传参链静态锚——回炉 R1，删标签/断链即红**）+app-shell-t3u1.test FOUC 在途窗不回退格+main-window-theme/settings-theme-boot 附参与同步读锁 | 已锚定（T3-P1——unit+e2e 双层；T3-U1 启动注入扩注） |
| INV-72 | 课题弹层切换联动：rail 课题项→WsRailPopover 点选→switchTo(id,{dirty})——dirty>0 必经现有 confirm 流；成功即 location.reload | src/renderer/app/Rail.tsx, WsRailPopover.tsx, features/workspaces/workspace.store.ts | app-shell.test 弹层 describe+e2e shell-rail.spec | 已锚定（T3-P2+回炉 1 补锚） |
| INV-73 | 文献库列表结构：密度列表六列列序/列宽语义单源（编号 46px/题名·期刊 flex1/年月 74px/引用 52px/档次 42px/标签 180px） | src/renderer/features/library/PaperList.tsx, PaperRow.tsx, library.css | 单测 library-cards.test（六列+CSS 逐值锁）+e2e library-density.spec | 已锚定（T3-P3） |
| INV-74 | 阅读器纸面三态+夜间反色单源：页纸底=--paper 单源 token（PageBox 双位消费）；夜间反色=--canvas-filter 挂 canvas 层单点（缩略图同步） | src/renderer/features/reader/view/PageBox.tsx, panels/OutlineThumb.tsx, src/renderer/shared/theme.css | 单测 r3p4-reader-skin.test+theme.test canvas-filter 锚+e2e theme-trio.spec | 已锚定（T3-P4——unit+e2e 双层） |
| INV-75 | 脉络月内序=slot 序：slot 为月内序实现层承载（月内重排=slot 值重排，跨月移动=month+slot 同写）；graph.nodes 返回序=lineageOrder 全序，消费方不得重排。[T3-P8 消费面扩]：store 写回填后 nodes 数组=lineageOrder 全序（第四消费点——渲染序单源兑现，重排/改月写落定即随新全序；纯函数单源不变，禁双实现条款不动） | src/shared/models/lineage.ts, src/main/services/lineage/lineage.write-guards.ts, lineage.service.ts, lineage.store.ts（[T3-P8] 消费面） | 单测 lineage-v2-model.test+lineage-v2-service.test+lineage-store-reorder.test | 已锚定（T3-P5；T3-P8 扩消费面） |
| INV-76 | catalog_no 呈现时确定性编号：按 lineageOrder 全序确定性计算 1..N，不落库不作业务主键；编号随全序漂移=特性非缺陷 | src/shared/models/lineage.ts, src/main/services/library.service.ts | 单测 library-lineage-c5/display.test+lineage-assemble.test | 已锚定（T3-P5） |
| INV-77 | lineage.json 导出确定性：corpus 第六件套独立文件；对象键序递归 alphabetical+nodes=lineageOrder 序（golden 字节级） | src/main/services/export_/lineage.assemble.ts, corpus.export.io.ts, corpus.export.service.ts | 单测 lineage-assemble.test（golden+幂等+键序）+M3 变异红证 | 已锚定（T3-P5） |
| INV-78 | 脉络时间线容器结构：渲染宿主=滚动容器（pan/zoom 退役→滚动定位语义）；年月分组键序单源=groupTimeline 纯函数（null 组末；砖砌 rowshift） | src/renderer/features/lineage/lineage-timeline.ts, LineageTimeline.tsx | 单测 lineage-timeline.test 27 用例（变异红证在档） | 已锚定（T3-P6） |
| INV-79 | 脉络连线避让不变量：连线永不穿过文献卡与月份标注（svg z 低于卡+避让四检降级链；障碍集=全卡∪月标注不含源/目标） | src/renderer/features/lineage/lineage-routing.ts, EdgeOverlay.tsx | 单测 lineage-routing.test 15 it | 已锚定（T3-P7A） |
| INV-80 | 脉络连线编辑交互不变量：mode 态单源驻 LineageTimeline；退出编辑强制归位；popover 开必 picker=idle；sub 与 kind 成对置 | src/renderer/features/lineage/useEdgeComposer.ts, EdgeTypePopover.tsx, lineage.store.ts | 单测 lineage-edge-composer.test 16 it+edge-popover.test 16 it+e2e 三锚 | 已锚定（T3-P7B） |
| INV-81 | better-sqlite3 安装零编译依赖：原生绑定由包内 prebuilds 直供（N-API 跨 ABI）；allowScripts 置 better-sqlite3 为 false | package.json（allowScripts 单源）, 本册 | vitest db 层（require 失败=响亮红）+CI 实跑 | 已锚定（F-CI-01；CI run 36372251379 首绿） |
| INV-82 | IPC 校验方向单向不变量：zod=入侧单向+事件面 preload 侧兜底（invoke 面 register.ts strict 单点；事件面 safeParse 丢帧+订阅存活） | src/preload/index.ts, src/shared/ipc/events.schemas.ts, src/main/bootstrap.ts | 单测 preload-events-guard.test 10 例+events-schemas.test 14 例+type-test | 已锚定（SR-IPC-10） |
| INV-83 | [T3-P8] 脉络槽位拖拽交互不变量：拖拽 view/edit 双态无 mode 门槛；阈值（5px）未过=单击选中既有链；拾取（picker≠idle）/弹层（popover·monthPop 开）禁拖；拖拽无 Esc 取消（松手恒落当前候选槽）；跨月拒绝=落当前槽+提示改月路径；settle 飞行期（transitionend 清场前）再 pointerdown=忽略；月内序=slot 序（INV-75 承载）；写路径无乐观写（settle 落定后排队，失败=error 态+toast+重试，UI 位置不回滚）。写窗融合已知边界（门二 C4 终裁=后到 override 整替胜出可接受——改月写窗内同节点 reorder 融合=月迁移丢弃，窗口毫秒级非正常路径，fuseLazy 注释锚定）。**已知限制（按 mockup 原样，预裁 D-12/W8）**：飞行中连线不帧随动——拖起连线层 dimmed（opacity .18）+settle transitionend 单次 routeEpoch 重算掩盖脱节；rAF 帧随动=S 级候选不强制 | src/renderer/features/lineage/useCardDrag.ts, TimelineYears.tsx, LineageTimelineCard.tsx, lineage.store.ts | 单测 lineage-card-drag.test 22 it+lineage-month-pop.test 7 it+lineage-store-reorder.test 10 it+变异红证 13 支（首轮 9 支：阈值/拾取互斥/跨月拒绝/slot 全序/月标 on 态/双文案/shift 过渡+测量冻结/settle 清场；回炉 4 支：R1 清 inline/R2 dragging 跳过/R3 lazy 回退/R4 兜底摘除——probe 复现 R1/R3 两支在档）+e2e T9/T10 | 已锚定（T3-P8） |
| INV-84 | 脉络写队列 saved 语义（P2-1 用户裁决 2026-09-29 选 a）：saveStatus='saved'=**本地与服务器数据一致**，非「全部编辑意图已落盘」——CONFLICT 拒绝型动作为丢弃（重试永不成功）+toast reason 提示后队列继续，排空回 saved 属正确行为（数据面零丢失：本地值只经服务器成功回显更新，写路径无乐观写=INV-83）。排空≠意图保全：被拒意图不在任何一侧存在。对 100~300 篇文献网络该反馈面属自然，无需额外说明面（裁决否定面——否决 b 拒绝型独立档）。dirty 投影（≠saved 即脏，INV-22）与本语义自洽：排空回 saved=退出放行 | src/renderer/features/lineage/lineage.store.ts（flush 状态机注释锚定） | 单测 lineage-store-write.test（CONFLICT 单条目丢弃+回落 saved 断言面；多条目续跑专测） | 已锚定（F-CONSOL-10；F-CONSOL-05 铺面） |

## 维护规则

- 状态列三档：**已锚定**（有机器防线）/ **部分**（防线有洞）/ **未锚定**（纯声明或人审）。
- 锚定方式优先级：lint/CI > 单测 > e2e > 架构评审（越靠左越不可绕过）。
- 本册与 ADR 的分工：ADR 记「为什么这样设计」（决策+取舍），本册记「什么必须永远成立」
  （不变量+防线）。小而致命的声明（如 INV-01）配得上登记，不必等到"配得上 ADR"。

## 路径口径（G11 定，2026-09-19——销 b12 门二 P2-2 悬置项）

- **现行锚定列（声明处/锚定状态列）随域迁移刷新，恒指现行路径；历史叙述性引用
  （事故背景/前史/日期锚）保留原文不回改。** F-GEOM-01 六子域目录化（G4~G10）
  后本册 11 处 `features/reader/<平铺>` 旧径已随迁刷新为域前缀现行径（G11，
  2026-09-19 落款；INV-47/58/68 声明处列裸文件名同步加前缀）；此后文件再迁域，
  锚定列同步刷新，叙述性历史引用不动。
- **§5.4 相容确认三注记（F-GEOM-01 战役验收，G11 落款并入本节）**：
  - **INV-47 确认不修订**——S4 函数体零改延续（resolveAnnotationRectsDom 函数体
    F-GEOM-01 全程未触，INV-47 数值面锚不受同族化与目录化影响，锚定件现行径
    =anchors/annotation-anchor.ts）；
  - **INV-37 相容确认**——INV-68 档位绑定与 INV-37「快路径同族项几何管线的瞬态
    近似（四道收敛守卫+G2 同门；INV-58 锁同几何族）」条款无冲突（同族禁令同向、
    档位面为其子集声明，语义零交叠）；
  - **INV-60 相容确认**——INV-58 [F-GEOM-01-G3] 坐标域边界注与 INV-60「产物域
    标记 source:'item'\|'dom'」条款无冲突（域归属声明只限定换算数学的入域，
    不改变标域单点 markSource=anchors/annotation-resolve-layered.ts 唯一标域点）。
