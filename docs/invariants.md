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
| INV-01 | 文档永不滚：所有滚动只发生在应用内 overflow 容器（main / 阅读器滚动区） | theme.css html/body/#root overflow:hidden | e2e 计算样式断言（reader-text.spec 三层 overflow 必须全 hidden） | 已锚定（2026-08-23 UBS；取证注记：内容度量可合法超出被裁剪，几何断言形状不可用——锁的是声明形状，见 95c3f3f） |
| INV-02 | 用户触发的动作失败必须可见（toast / 内联红条），禁止静默吞错 | AGENTS 文化层；U1（内联红条）/U6（store.error+watch）两个修复模式 | 人审 + 工单模板条款（规约锚定；模板=scripts/new-ticket.ps1 文化层） | **部分**（lint 化不可行有实证：blanket 空 catch 禁令误伤三处合法尽力而为——ipc/settings.ts:52/reader.store.ts:90/import.service.ts:171，见 b774d5c；规约化已落 new-ticket.ps1 文化层） |
| INV-03 | 一切含异步 load 的 store 必须有请求序号 stale-guard（旧响应/旧失败不得覆盖新状态；跨通道乱序面见 settings 版本计数变体；异步 hook 同族见 useAsync 请求令牌——被取代调用的迟到 settle 一律丢弃，loading 只由最新请求熄灭；**per-tab 变体（2026-08-24 SR2-TABS-01）：多 tab 并发加载下守卫粒度=tab 级——迟到响应三规则：①tab 已关→丢弃 ②tab 被新一轮加载顶替→丢弃 ③tab 存在且最新→写入该 tab 自身（不得覆盖展示中的其他 tab），换 tab 不失忆**） | library/notes/tags/reader 四 store 先例（闭包 loadSeq）+ settings 版本计数（仅成功落地抬升）+ useAsync runSeq + reader.store per-tab（loadSeq 总序+tabLoadSeq 字典） | 五 store 单测锁定（notes/tags/library 既有 + reader/settings 2026-08-23 UBS 补；reader 2026-08-24 SR2-TABS-01 重锚为 per-tab 18 用例）+ useAsync.test 三面锁定（迟到旧失败/迟到旧成功/loading 误熄） | 已锚定 |
| INV-04 | 保存失败不推进 savedAt（失败 = 未保存态延续，下次编辑自然重试） | notes.store 错误契约 | notes.store.test 锁定 | 已锚定 |
| INV-05 | 标注矩形两路径同口径：划选保存与重开重锚走同一 mergeLineRects 几何 | annotation-anchor.ts rectsBetweenPoints 单点收口 | 单测 + e2e 计数断言 | 已锚定 |
| INV-06 | e2e「看见」类断言必须含计算样式（颜色/opacity/blend）——几何可见 ≠ 视觉可见（教训 D1/L7 两度兑现） | reader-text.spec 先例（highlight/underline/note 三链） | e2e | 已锚定（2026-08-23 UBS 补 underline 2px 实条+底边贴合+宽度、note ≥8px 色块两链，三 kind 全覆盖） |
| INV-07 | 文件/目录路径只能出自 main 侧系统对话框（dialogs.ts），renderer 永远不传路径 | AGENTS 安全禁令 + docs/security.md:23 | 架构评审 | 未锚定（2026-08-23 UBS 复核：dialogs.ts 仍唯一路径出口，index.ts showErrorBox 为错误框非路径源；import_/export_ ipc 均经注入消费；renderer 请求 schema 无路径字段） |
| INV-08 | 出网仅白名单 host 且仅手动触发，无后台网络任务 | src/shared/constants.ts + http-client 内强制 | 常量 + 单测 + e2e CSP 断言 | 已锚定 |
| INV-09 | 渲染层禁止 Node/Electron API 与绝对文件路径 | AGENTS 安全禁令 | ESLint 强制 | 已锚定 |
| INV-10 | 标注层容器是 stacking context：混合模式必须上容器级（rect 级混合被隔离无效且矩形互相叠乘） | AnnotationLayer.tsx 注释 + 战役报告 | e2e mix-blend 断言 | 已锚定 |
| INV-11 | 类型/颜色/文案/数值单一真相源（禁止两份等价声明靠注释对齐） | AGENTS 代码组织 | 审查（lint 无对口规则） | **部分**（2026-08-23 UBS：标题 max(200) 收归 NOTE_TITLE_MAX 单源消费——已知双源残留清零；防线仍是人审，机器锚定待 lint 规则设计立项） |
| INV-12 | 受锁文件变更即时 locks:apply（manifest 与提交同步，禁跨提交延迟） | AGENTS 依赖与提交 | CI locks:check | 已锚定 |
| INV-13 | IPC Result 折叠约定：service 把业务失败折叠为正常返回时（如 enrichStatus:'failed'、幂等删除 ok:true），消费方必须分支处理、不得无条件按成功提示 | enrich 先例（U1 修复）；reader.service 删除幂等语义 | 人审 + 折叠面清点存档 | **部分**（2026-08-23 UBS 折叠面全量清点：7 service+settings ipc+register 共 8 点，全部消费方已分支或幂等语义正当，无 enrich 同型；清点表=docs/reports/2026-08-23_ubs-sweep.md §B1；新增折叠点须随消费方分支一并过审） |
| INV-14 | 输入接缝注册/注销成对：快捷键（keymap）、滚轮/指针监听、拖拽期 body 样式副作用必须与挂载源同源清理——消费方清理函数与注册同函数对，卸载/重挂不得残留监听或全局样式 | SR2-KEY-01/02、SR2-UIK-01 规约（2026-08-23 P7-A 开单引入，B4 防线后首批 SR2 工单） | 单测（keymap.test 12 用例：模块级成对/配对面；reader-shortcuts.test 8 用例：快捷键/滚轮消费方级；split-pane.test 11 用例：指针监听+拖拽期 body 样式副作用的会话清理与中途卸载还原（含 pointercancel 同路径））+ 人审（消费方清理同源） | 已锚定（三面全锚：模块级+快捷键/滚轮消费方级+指针/body 样式面=SR2-KEY-01/02/UIK-01，2026-08-24 P7-A 收口） |
| INV-15 | 阅读器空态（无 tab/loading/error）下 TabBar 保持渲染——error tab 必须可见、可关（叉/Delete）、可切（多 tab 失败场景可切回其他 tab），否则打开失败即 UI 死锁 | SR2-TABS-02（ReaderPage 空态分支含 TabBar 结构 + deepseek r1 BLOCKING 修复先例，2026-08-24） | 组件级：tab-bar.test（渲染序/激活/关闭三路径）；装配级：P7-B 收官 e2e 三序列（换/关/退）含 error 场景即升已锚定；在此之前人审 | 部分（TabBar 自身行为组件级已锚；ReaderPage 装配级防线待 P7-B 收官 e2e 收口） |
| INV-16 | pdfjs-dist 运行时 import 白名单单源：仅许 PdfCanvas.tsx/TextLayer.tsx/CorpusExtractor.ts 三文件（类型消费循 PdfCanvas 再导出模式）；白名单变更=改 ESLint 规则+[locked-change]，禁第四处直连 | 本册+eslint.config.js no-restricted-imports（2026-08-25 计划审查 R1 定稿——原「PdfCanvas 单点」表述与 TextLayer.tsx:29 事实不符，白名单化收口） | ESLint 强制 | 未锚定（2026-08-25 规划期预登记；锚定随 SR2-AI-02 落地） |
| INV-17 | 语料导出幂等：corpus md front-matter 不含 exportedAt（时间戳只进 manifest）；contentSha/fulltextSha=文件字节 sha256；同库重导出逐字节稳定 | ADR-0011 v1.1+corpus.assemble.ts（2026-08-25 计划审查 R6 定稿——消除「sha 不含 exportedAt」与 front-matter 含时间戳的口径矛盾） | golden+结构断言（SR2-AI-03） | 未锚定（规划期预登记；锚定随 SR2-AI-03） |
| INV-18 | 导出会话协议：manifest 终局单写（临时文件+rename 原子替换）；会话开始删旧 manifest+清空重建 corpus/fulltext/figures；单会话单飞（EXPORT_BUSY）；中断=无 manifest=工具侧不可激活，重跑即修复 | ADR-0011 v1.1+corpus.export.service（2026-08-25 计划审查 R5/R8/R9 定稿；状态机表=ai-plan-review §6） | 单测+e2e（SR2-AI-03/04） | 未锚定（规划期预登记；锚定随 SR2-AI-03/04） |

## 维护规则

- 状态列三档：**已锚定**（有机器防线）/ **部分**（防线有洞）/ **未锚定**（纯声明或人审）。
- 锚定方式优先级：lint/CI > 单测 > e2e > 架构评审（越靠左越不可绕过）。
- 本册与 ADR 的分工：ADR 记「为什么这样设计」（决策+取舍），本册记「什么必须永远成立」
  （不变量+防线）。小而致命的声明（如 INV-01）配得上登记，不必等到"配得上 ADR"。
