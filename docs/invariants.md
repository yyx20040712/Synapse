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
| INV-15 | 阅读器空态（无 tab/loading/error）下 TabBar 保持渲染——error tab 必须可见、可关（叉/Delete）、可切（多 tab 失败场景可切回其他 tab），否则打开失败即 UI 死锁 | SR2-TABS-02（ReaderPage 空态分支含 TabBar 结构 + deepseek r1 BLOCKING 修复先例，2026-08-24） | 组件级：tab-bar.test（渲染序/激活/关闭三路径）；装配级：P7-B 收官 e2e 三序列（换/关/退）含 error 场景 | 已锚定（2026-08-25 收官 e2e 收口；**失败类补全**：pdf 加载失败原仅 toast——markTabError 落 TabState.error，缺失文件场景实测锚定） |
| INV-16 | pdfjs-dist 运行时 import 白名单单源：仅许 PdfCanvas.tsx/TextLayer.tsx/CorpusExtractor.ts 三文件（类型消费循 PdfCanvas 再导出模式）；白名单变更=改 ESLint 规则+[locked-change]，禁第四处直连 | 本册+eslint.config.js no-restricted-imports（2026-08-25 计划审查 R1 定稿——原「PdfCanvas 单点」表述与 TextLayer.tsx:29 事实不符，白名单化收口） | ESLint 强制（no-restricted-imports——renderer 主块禁 pdfjs-dist+白名单三文件 override 块重申其余禁令；2026-08-27 随 SR2-AI-02 落地，lint 拦截 OutlinePanel/OutlineThumb 两处漏扫的类型直连实证防线生效并当场改走 PdfCanvas 再导出） | 已锚定（2026-08-27 SR2-AI-02；白名单外文件类型消费亦经 PdfCanvas 再导出单点。**已知边界**：ESLint no-restricted-imports 对 dynamic import() 的检查依版本而异——非白名单文件的动态直连可能不拦，该缺口由架构评审面覆盖，机器锚以 static import 为准。worker 资产单份：PdfCanvas 与 CorpusExtractor 消费同一 vite ?url 模块（pdfjs-dist/build/pdf.worker.min.mjs?url）——构建产物同 URL，无第二份 worker 资产；子路径+?url 变体的拦截经探针实测覆盖） |
| INV-17 | 语料导出幂等：corpus md front-matter 不含 exportedAt（时间戳只进 manifest）；contentSha/fulltextSha=文件字节 sha256；同库重导出逐字节稳定 | ADR-0011 v1.1+corpus.assemble.ts（2026-08-25 计划审查 R6 定稿——消除「sha 不含 exportedAt」与 front-matter 含时间戳的口径矛盾） | golden+结构断言（SR2-AI-03） | 未锚定（规划期预登记；锚定随 SR2-AI-03） |
| INV-18 | 导出会话协议：manifest 终局单写（临时文件+rename 原子替换）；会话开始删旧 manifest+清空重建 corpus/fulltext/figures；单会话单飞（EXPORT_BUSY）；中断=无 manifest=工具侧不可激活，重跑即修复 | ADR-0011 v1.1+corpus.export.service（2026-08-25 计划审查 R5/R8/R9 定稿；状态机表=ai-plan-review §6） | 单测+e2e（SR2-AI-03/04） | 未锚定（规划期预登记；锚定随 SR2-AI-03/04） |
| INV-19 | AI 锚定段渲染对等、存储独立：AI 笔记经 verifyQuote 重锚入标注层同一几何管线渲染（七问分色单源）；数据永不写 annotations 表；AI 标注 v1 只读（无编辑/删除写路径） | ADR-0015+AnnotationLayer 消费面（2026-08-25 N2 裁决——D3 独立表的渲染面延伸） | 单测+组件测试（SR2-AI-09） | 未锚定（规划期预登记；锚定随 SR2-AI-09） |
| INV-20 | 锚点定位三层防线单入口：①quote 三元组重锚（滚动+闪烁）②anchor_page 页级降级（跳页+提示）③无锚/篇级仅开篇——一切跳转消费方（笔记面板 N1/脉络图 N3/未来面）共用同一「锚点定位服务」，禁各写降级 | ADR-0015+src/renderer/features/reader/anchor-locate.ts（2026-08-25 N2 裁决「三层防线升格验收条款」+N1/N3 共享；2026-08-26 C-05 落地） | 单测（anchor-locate.test 9 用例：三防线 S1~S5+超时 S6+作废两形态 S7/S9+并发序号守卫 S8）+消费方用例（N1 接线随 C-04/05；P7-G AI 面板与 P7-H 脉络侧板消费方用例随后续工单） | 已锚定（服务单测级 2026-08-26；跨视图消费方级随 P7-G/P7-H 补） |
| INV-21 | 伴随进程边界：应用零 LLM 出网维持（与 INV-08 联动）；应用永不 spawn zcode/会话——设置页联动仅发现+装技能+心跳显示；AI 工作只由用户在 zcode 侧启动 | ADR-0015（2026-08-25 E1=B'/N4 裁决） | e2e（不代启断言）+架构评审 | 未锚定（规划期预登记；锚定随 SR2-AI-10） |
| INV-22 | 退出拦截 dirty 链路：renderer 聚合信号（useTabDirtyAggregate）沿变化沿 push 上报 system/set-quit-dirty（禁止 close 事件内反向拉取 renderer）；main 模块缓存值为 close 守卫唯一判定源；dirty close=preventDefault+模态二次确认（默认焦点=取消），确认=destroy（不再触发 close，无重入），对话框异常按取消处理（窗口保持可重试）。已知窄窗（deepseek r2 WARN 存档）：push 模式存在一跳上报延迟——工单头注裁决权衡过，pull 模式时序复杂度更差不采 | main-window.ts（SR2-TABS-04，2026-08-25 deepseek W1/W2 处置后定稿）+P7-B B3-问2 退出拦截裁决 | 单测（quit-dirty-guard.test 七用例）+装配级 e2e（P7-B 收官「退」序列：dirty→取消窗口保持/确认 destroy） | 已锚定（2026-08-25 收官 e2e 收口） |
| INV-23 | 撤销栈语义：栈 per-tab 模块级自持（随 closeTab 清理，不跨 tab）；LIFO+深度 50 FIFO 截断；api 失败不弹栈可重试；同篇 in-flight 互斥（busy，他篇不阻塞——Set 互斥）；delete 逆重建新 id 后全栈 remap 旧 id 引用（按对象身份跳过被撤条目）；成功后按对象身份移除（indexOf——await 期间入栈/FIFO 截断致下标漂移不误删） | annotation-undo.ts（SR2-UNDO-01，2026-08-25 deepseek r2~r6 五轮收敛定稿） | 单测（annotation-undo.test 15 用例：三逆操作/remap 三跨格序列/互斥含并发篇/身份移除含截断挤出/截断/失败重试/空栈/隔离） | 已锚定（单测级，2026-08-25） |
| INV-24 | 片段序单源：一切片段序消费面（阅读器片段列表/corpus md 装配/未来 AI 装配与回灌消费）按同一比较器排序——页码（0 基存储；显示形态 1 基，与 corpus p.N 同口径）→页内文本偏移（startOffset）→创建序（createdAt）→id 兜底全序；**排序禁止字符串字典序比较**（页码跨位数字典序失真），"页码:序号" 字符串形态仅显示用 | 本册+src/shared/annotation-order.ts（SR2-C-01，2026-08-26 P7-C 开单入册） | 单测（annotation-order.test 6 用例：跨页/同页偏移/同偏移创建序/id 兜底/入参不可变/字符串字典序反例）+两消费方用例（C-03 组件测试序消费+corpus golden 结构断言——C-02） | 已锚定（单测级 C-01+消费方级 C-02 golden 结构断言/C-03 组件序消费+C-05 定位同源，2026-08-26） |
| INV-25 | ai_notes 级联语义：paper 删除→ai_notes 级联清空（CASCADE，语料随篇亡）；annotation 删除→该行 annotation_id 置 NULL 条目保留（SET NULL，锚定段降级篇级——数据不丢）；级联生效依赖连接级 PRAGMA foreign_keys=ON（connection.ts DB_PRAGMAS 常开） | 迁移 003 DDL 外键子句+src/main/db/repos/ai_notes.repo.ts（SR2-AI-01，2026-08-27 deepseek W1 采纳登记） | repo 单测（ai_notes.repo.test 级联两路径用例：CASCADE 清空/SET NULL 降级篇级——foreign_keys=ON 下真实外键行为） | 已锚定（单测级，2026-08-27） |

## 维护规则

- 状态列三档：**已锚定**（有机器防线）/ **部分**（防线有洞）/ **未锚定**（纯声明或人审）。
- 锚定方式优先级：lint/CI > 单测 > e2e > 架构评审（越靠左越不可绕过）。
- 本册与 ADR 的分工：ADR 记「为什么这样设计」（决策+取舍），本册记「什么必须永远成立」
  （不变量+防线）。小而致命的声明（如 INV-01）配得上登记，不必等到"配得上 ADR"。
