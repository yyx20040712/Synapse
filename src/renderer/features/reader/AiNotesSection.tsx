// b3: P7-G
/**
 * [SR2-AI-08] AiNotesSection —— 笔记面板 AI 面（分节+状态行+按钮，
 * 工单：open / strong）
 *
 * ── 行为层 ──
 * - 并入 ReaderNotesPanel 下部分节（C-03 头注预留位「AiNotesSection 并入
 *   本面板下部分节」；面板 props 不动——本组件经 useActiveTab 自取 paperId
 *   同 C-03 防双源）
 * - 分节显示（ADR-0015 §3 N2 渲染面）：role 分组（一读/二读/裁决三组中文
 *   标签）×组内 question 条目（Q1~Q7+divergence）；条目=锚定段引用块+
 *   content_md 纯文本（textarea 级呈现——负面清单「Markdown 富文本编辑器」
 *   红线，md 不渲染只展示）；**只读**——零写路径（INV-19 渲染面同锚，
 *   v1 无编辑/删除）
 * - 七问分色单源：ai-note-style.ts（本单交付——annotation-style 同族新模块
 *   INV-11：question→CSS 变量映射+中文标签单源；AI-09 渲染层消费同源，
 *   接缝双向锚定声明两文件头注；取色只允许 theme.css 变量，禁散落硬编码）
 * - 「AI 正在读」状态行+「AI 读文献」按钮（用户点击=手动激活——D2b）：
 *   按钮经 ai-sensor/request-read 写 job（AI-06 通道）；状态行按需轮询
 *   ai-sensor/status（STATUS_POLL_MS=5s，仅组件挂载期间=笔记面板打开——
 *   ADR §1 门控；卸载清 interval，INV-14 成对同族）
 * - **状态行状态机**（宪法状态机前置；观测=AI-06 可观测态 per 当前篇 P；
 *   门一 B08-1/W08-2/N08-4 处置后六态——**「AI 读文献」按钮行常驻本节
 *   头部**（首次使用入口不悬空）；imported 非稳态移出（瞬时事件：导入
 *   完成→toast+list 刷新→稳态回 idle））：
 *
 *   | 态 | 触发事实（06 服务输出） | 呈现 |
 *   | --- | --- | --- |
 *   | hidden | 无 job(P)+无未导入产物+无 DB 数据 | 仅按钮行（无状态行无分节） |
 *   | idle | 同 hidden 触发面但有 DB 数据（含已导入稳态） | 按钮行+分节（无状态行） |
 *   | pending | hasPendingJob(P) 且心跳不新鲜 | 「已请求 AI 阅读，等待 zcode 拾取…（上次状态：<state 自述>，可缺省）」 |
 *   | queued | hasPendingJob(P) 且心跳新鲜且 currentPaper≠P 或 =null | 「AI 正在处理队列（当前：他篇）…」；currentPaper=null 时无他篇名 |
 *   | reading | 心跳新鲜且 currentPaper=P | 「AI 正在读本文（state 自述文本）」 |
 *   | done-unimported | productExists(P) 且 !archivedExists(P) 且 job(P) 无 | 「AI 已读完，待导入」+「导入 AI 笔记」按钮 |
 *
 *   按钮禁用枚举：disabled=pending/queued/reading 三态（06 服务幂等为兜底，
 *   UI 禁用防误解双保险）；enabled=hidden/idle/done-unimported。
 *   跨格序列（审计面）：
 *   ① hidden→pending（按钮）→（queued：他篇在读）→reading→
 *      done-unimported→idle（导入完成，正常全链——queued=job(P) 在而
 *      currentPaper=他篇/null 的中途格）
 *   ② pending 持续（心跳从未起——迟拾取/工具未拉起/工具失败不移 job，
 *      三者同呈现不误报——06 failed 态消解声明）
 *   ③ reading→（心跳过期+job 在=工具中断）→pending（AI-06 序列③渲染面）
 *   ④ done-unimported→pending（重读覆盖）；idle→pending（重读请求：sha
 *      变化重灌路径，07 幂等承接）
 *   ⑤ 换 tab（paperId 变）→全态重评估（per-tab 语义——面板随 active tab，
 *      P7-B 单视图渲染模型先例）
 * - 「导入 AI 笔记」按钮（done-unimported 态）：调 ai-notes/import（07 目录
 *   级全量——幂等使无害）→三桶 toast（imported/skipped 计数+errors 篇名）
 *   →list 刷新（E1「应用轮询状态+导入」的手动激活形态——D2b 手动语义保持）
 * - 条目单击→locateAnchor（INV-20 单入口消费方——C-05 服务；篇级/无锚条目
 *   天然走 paper 层防线；本单补 INV-20 跨视图消费方级用例）。**exact 层
 *   接缝声明（门一 W08-3 处置）**：anchor-locate exact 层滚动+闪烁现绑
 *   [data-annotation-id]（AI 条目无 annotationId）——AI 条目 exact 完整
 *   化=AI-09 交付 data-ai-note-id 渲染节点+anchor-locate 延展（滚动目标
 *   选择器扩 [data-ai-note-id]，随 09）；09 落地前本单单击 exact 目标缺失
 *   →anchor-locate 既有行为页级停驻（分步兑现，不另写降级）
 * - 轮询常量 STATUS_POLL_MS=5s 为本组件域私有（10 同名常量各持——Rule of
 *   Three 第 2 次保持重复，AGENTS 原文；第 3 处出现时抽 shared）
 *
 * ── 接口层 ──
 * - export function AiNotesSection(props: { highlightAiNoteId?: string | null }):
 *   JSX.Element（data-ticket 骨架标记，翻 done 前移除；highlightAiNoteId=
 *   AI-09 标注单击反向同步滚动高亮消费面——C-05 highlightAnnotationId 同型）
 * - 交付面：ai-note-style.ts（七问分色单源）+ai-notes.store.ts（AI 笔记
 *   数据+状态行态单源——**本域新 store（新数据新域，非触 notes.store**，
 *   C-03 纪律语义=不动既有 store 字段）+ReaderNotesPanel 挂载一行+
 *   window.api 类型面（renderer 侧通道客户端）
 * - 数据单源接缝声明：ai-notes/list 取数+导入后刷新=store 内单点；
 *   AI-09 渲染层经宿主（ReaderPage 订阅同 store 分发 props）消费——
 *   **禁 09 双取**（接缝双向锚定声明两文件头注）
 *
 * ── 架构层 ──
 * - renderer/features/reader 域；依赖 window.api（ai-sensor/status+request-read
 *   +ai-notes/list+ai-notes/import）+locateAnchor（C-05）+toast 惯例
 *   （INV-02 动作型）；notes.store 零触碰（AI 数据面全归 ai-notes.store 本单
 *   新建——C-03「不新增任何 notes.store 字段」纪律保持）
 *
 * ── 生命周期层 ──
 * - 预留：分节折叠记忆（v1 不做）；divergence 独立组（v1 随裁决组呈现）
 * - 不做：AI 笔记编辑/删除（INV-19 只读）；md 渲染；自动导入（轮询检测到
 *   产物不自动写 DB——手动按钮保持 D2b 手动激活语义）
 *
 * ── 文化层 ──
 * - 错误：status 轮询失败=静默重试下一周期（列表型瞬态——不 toast 轰炸；
 *   连续失败 3 次显示离线提示行）；按钮动作型失败 toast（INV-02 两型分清）
 * - 测试：tests/unit/renderer/ai-notes-section.test.tsx [受锁新增]——状态机
 *   六态渲染+跨格序列①③⑤用例（mock 06 服务输出驱动；queued 子格经①
 *   的他篇在读路径覆盖）/分节分组与分色
 *   类名/只读断言（无任何写交互元素）/导入按钮三桶 toast/卸载清 interval；
 *   ai-note-style 单测（映射单源+标签）；e2e [受锁新增 spec]：写 job→
 *   fixture status.json 模拟心跳（SYNAPSE_USER_DATA 隔离环境 fs 直写——
 *   e2e 不拉起真工具，AI-04 app.evaluate 侧通道同型）→状态行变化→导入→
 *   分节渲染真实文本
 * - 新增受锁测试随实现 locks:generate+apply+[locked-change] 尾注
 * - 完成后：删除 data-ticket 与占位 → npm run verify 绿 → 人工审查
 *   git diff → 翻 registry
 */
export function AiNotesSection(_props: { highlightAiNoteId?: string | null }): JSX.Element {
  return <div data-ticket="SR2-AI-08" />
}
